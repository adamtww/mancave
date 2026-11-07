// Man cave planner API (Cloudflare Worker + D1).
// Accounts are created by the admin; everyone signed in can view every layout,
// only the owner can change one. Saving someone else's layout makes a copy.

const PBKDF2_ITER = 20000;          // kept modest for the Workers free-plan CPU budget
const SESSION_DAYS = 90;
const MAX_LAYOUT_BYTES = 1_500_000;
const MAX_VERSIONS = 50;            // per layout; oldest are pruned
const FAIL_WINDOW_MIN = 15, FAIL_LIMIT = 8;

// Workers Free plan daily allowances (shown in the Usage panel)
const LIMITS = { storageBytes: 5e9, rowsRead: 5_000_000, rowsWritten: 100_000, requests: 100_000 };

const enc = new TextEncoder();

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    try {
      await bootstrap(env);
      return cors(await route(req, env));
    } catch (e) {
      if (e instanceof HttpError) return cors(json({ error: e.message }, e.status));
      console.error(e);
      return cors(json({ error: 'Server error' }, 500));
    }
  },
};

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (m) => { throw new HttpError(400, m); };

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}
function cors(res) {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', '*');
  h.set('access-control-allow-headers', 'authorization, content-type');
  h.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
  h.set('access-control-max-age', '86400');
  return new Response(res.body, { status: res.status, headers: h });
}

// ---------- crypto helpers ----------
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function sha256(s) { return b64u(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
async function pbkdf2(pw, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64u(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
async function hashPw(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITER}$${b64u(salt)}$${await pbkdf2(pw, salt, PBKDF2_ITER)}`;
}
async function checkPw(pw, stored) {
  const [kind, iter, salt, hash] = String(stored).split('$');
  if (kind !== 'pbkdf2') return false;
  const got = await pbkdf2(pw, unb64u(salt), +iter);
  if (got.length !== hash.length) return false;
  let d = 0; for (let i = 0; i < got.length; i++) d |= got.charCodeAt(i) ^ hash.charCodeAt(i);
  return d === 0;
}

// ---------- setup ----------
let booted = false;
async function bootstrap(env) {
  if (booted) return;
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first('n');
  if (!n) {
    const user = (env.ADMIN_USERNAME || 'admin').trim();
    if (!env.ADMIN_PASSWORD) throw new HttpError(503, 'Admin password is not configured yet');
    await env.DB.prepare('INSERT INTO users (username, pw, is_admin) VALUES (?, ?, 1)').bind(user, await hashPw(env.ADMIN_PASSWORD)).run();
  }
  booted = true;
}

async function auth(req, env) {
  const m = /^Bearer (.+)$/.exec(req.headers.get('authorization') || '');
  if (!m) throw new HttpError(401, 'Please sign in');
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.is_admin FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now')`).bind(await sha256(m[1])).first();
  if (!row) throw new HttpError(401, 'Your sign-in has expired — please sign in again');
  return { id: row.id, username: row.username, admin: !!row.is_admin, tokenHash: await sha256(m[1]) };
}
function needAdmin(u) { if (!u.admin) throw new HttpError(403, 'Admins only'); }

async function body(req) {
  const text = await req.text();
  if (text.length > MAX_LAYOUT_BYTES + 10000) throw new HttpError(413, 'That layout is too large to save');
  try { return text ? JSON.parse(text) : {}; } catch { bad('Bad request'); }
}
function cleanName(s, fallback) {
  s = String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return s || fallback;
}
function checkData(d) {
  if (!d || typeof d !== 'object' || !d.lot || !Array.isArray(d.items)) bad('Layout data is missing');
  const s = JSON.stringify(d);
  if (s.length > MAX_LAYOUT_BYTES) throw new HttpError(413, 'That layout is too large to save');
  return s;
}

// ---------- routes ----------
async function route(req, env) {
  const url = new URL(req.url), p = url.pathname.replace(/\/+$/, ''), M = req.method;
  let m;

  if (p === '' || p === '/api' || p === '/api/health') return json({ ok: true });

  if (p === '/api/login' && M === 'POST') return login(req, env);

  const me = await auth(req, env);

  if (p === '/api/me' && M === 'GET') return json({ user: pub(me) });
  if (p === '/api/logout' && M === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(me.tokenHash).run();
    return json({ ok: true });
  }
  if (p === '/api/password' && M === 'POST') {
    const b = await body(req);
    const row = await env.DB.prepare('SELECT pw FROM users WHERE id = ?').bind(me.id).first();
    if (!(await checkPw(String(b.current || ''), row.pw))) throw new HttpError(403, 'Current password is wrong');
    if (String(b.password || '').length < 6) bad('New password must be at least 6 characters');
    await env.DB.prepare('UPDATE users SET pw = ? WHERE id = ?').bind(await hashPw(String(b.password)), me.id).run();
    return json({ ok: true });
  }

  // layouts
  if (p === '/api/layouts' && M === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT l.id, l.name, l.owner_id, u.username AS owner, l.based_on, b.name AS based_on_name, bu.username AS based_on_owner,
              l.created_at, l.updated_at, length(l.data) AS bytes
         FROM layouts l JOIN users u ON u.id = l.owner_id
         LEFT JOIN layouts b ON b.id = l.based_on LEFT JOIN users bu ON bu.id = b.owner_id
        ORDER BY l.updated_at DESC`).all();
    return json({ layouts: results });
  }
  if (p === '/api/layouts' && M === 'POST') {
    const b = await body(req), data = checkData(b.data), name = cleanName(b.name, 'Untitled warehouse');
    const basedOn = Number.isInteger(b.based_on) ? b.based_on : null;
    const r = await env.DB.prepare('INSERT INTO layouts (owner_id, name, data, based_on) VALUES (?, ?, ?, ?) RETURNING id, created_at, updated_at')
      .bind(me.id, name, data, basedOn).first();
    await addVersion(env, r.id, me.id, name, data);
    return json({ layout: { id: r.id, name, owner_id: me.id, owner: me.username, based_on: basedOn, updated_at: r.updated_at } }, 201);
  }
  if ((m = /^\/api\/layouts\/(\d+)$/.exec(p))) {
    const id = +m[1];
    const row = await env.DB.prepare(
      `SELECT l.*, u.username AS owner FROM layouts l JOIN users u ON u.id = l.owner_id WHERE l.id = ?`).bind(id).first();
    if (!row) throw new HttpError(404, 'That layout no longer exists');
    if (M === 'GET') return json({ layout: { ...row, data: JSON.parse(row.data) } });
    if (row.owner_id !== me.id) throw new HttpError(403, "Only the owner can change this layout — save it as your own copy instead");
    if (M === 'PUT') {
      const b = await body(req);
      const name = cleanName(b.name, row.name);
      if (b.data === undefined) { // rename only
        await env.DB.prepare(`UPDATE layouts SET name = ?, updated_at = datetime('now') WHERE id = ?`).bind(name, id).run();
        return json({ ok: true, name });
      }
      const data = checkData(b.data);
      const r = await env.DB.prepare(`UPDATE layouts SET name = ?, data = ?, updated_at = datetime('now') WHERE id = ? RETURNING updated_at`).bind(name, data, id).first();
      await addVersion(env, id, me.id, name, data);
      return json({ ok: true, name, updated_at: r.updated_at });
    }
    if (M === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM versions WHERE layout_id = ?').bind(id),
        env.DB.prepare('DELETE FROM layouts WHERE id = ?').bind(id),
      ]);
      return json({ ok: true });
    }
  }
  if ((m = /^\/api\/layouts\/(\d+)\/versions$/.exec(p)) && M === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT v.id, v.name, v.created_at, u.username AS by, length(v.data) AS bytes
         FROM versions v LEFT JOIN users u ON u.id = v.user_id WHERE v.layout_id = ? ORDER BY v.id DESC`).bind(+m[1]).all();
    return json({ versions: results });
  }
  if ((m = /^\/api\/versions\/(\d+)$/.exec(p)) && M === 'GET') {
    const v = await env.DB.prepare('SELECT id, layout_id, name, data, created_at FROM versions WHERE id = ?').bind(+m[1]).first();
    if (!v) throw new HttpError(404, 'That version no longer exists');
    return json({ version: { ...v, data: JSON.parse(v.data) } });
  }

  // admin: users
  if (p === '/api/users' && M === 'GET') {
    needAdmin(me);
    const { results } = await env.DB.prepare(
      `SELECT u.id, u.username, u.is_admin, u.created_at, (SELECT COUNT(*) FROM layouts l WHERE l.owner_id = u.id) AS layouts
         FROM users u ORDER BY u.username`).all();
    return json({ users: results.map((u) => ({ ...u, is_admin: !!u.is_admin })) });
  }
  if (p === '/api/users' && M === 'POST') {
    needAdmin(me);
    const b = await body(req), username = String(b.username || '').trim();
    if (!/^[A-Za-z0-9_.-]{2,32}$/.test(username)) bad('Usernames are 2–32 letters, numbers, dots, dashes or underscores');
    if (String(b.password || '').length < 6) bad('Password must be at least 6 characters');
    const exists = await env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
    if (exists) bad('That username is taken');
    await env.DB.prepare('INSERT INTO users (username, pw, is_admin) VALUES (?, ?, ?)').bind(username, await hashPw(String(b.password)), b.admin ? 1 : 0).run();
    return json({ ok: true }, 201);
  }
  if ((m = /^\/api\/users\/(\d+)$/.exec(p))) {
    needAdmin(me);
    const id = +m[1];
    const u = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!u) throw new HttpError(404, 'No such user');
    if (M === 'PUT') {
      const b = await body(req);
      if (b.password !== undefined) {
        if (String(b.password).length < 6) bad('Password must be at least 6 characters');
        await env.DB.batch([
          env.DB.prepare('UPDATE users SET pw = ? WHERE id = ?').bind(await hashPw(String(b.password)), id),
          env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id), // sign them out everywhere
        ]);
      }
      return json({ ok: true });
    }
    if (M === 'DELETE') {
      if (id === me.id) bad("You can't remove your own account");
      await env.DB.batch([
        env.DB.prepare('DELETE FROM versions WHERE layout_id IN (SELECT id FROM layouts WHERE owner_id = ?)').bind(id),
        env.DB.prepare('DELETE FROM layouts WHERE owner_id = ?').bind(id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
        env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
      ]);
      return json({ ok: true });
    }
  }

  // admin: usage
  if (p === '/api/usage' && M === 'GET') { needAdmin(me); return json(await usage(env)); }

  throw new HttpError(404, 'Not found');
}

function pub(u) { return { id: u.id, username: u.username, admin: u.admin }; }

async function login(req, env) {
  const b = await body(req), username = String(b.username || '').trim(), pw = String(b.password || '');
  if (!username || !pw) bad('Enter your username and password');
  const fails = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM login_fails WHERE username = ? AND at > datetime('now', ?)`).bind(username, `-${FAIL_WINDOW_MIN} minutes`).first('n');
  if (fails >= FAIL_LIMIT) throw new HttpError(429, `Too many tries — wait ${FAIL_WINDOW_MIN} minutes and try again`);
  const u = await env.DB.prepare('SELECT id, username, pw, is_admin FROM users WHERE username = ?').bind(username).first();
  if (!u || !(await checkPw(pw, u.pw))) {
    await env.DB.prepare('INSERT INTO login_fails (username) VALUES (?)').bind(username).run();
    throw new HttpError(401, 'Wrong username or password');
  }
  const token = b64u(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', ?))`).bind(await sha256(token), u.id, `+${SESSION_DAYS} days`),
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`),
    env.DB.prepare(`DELETE FROM login_fails WHERE username = ? OR at < datetime('now', '-1 day')`).bind(username),
  ]);
  return json({ token, user: { id: u.id, username: u.username, admin: !!u.is_admin } });
}

async function addVersion(env, layoutId, userId, name, data) {
  await env.DB.batch([
    env.DB.prepare('INSERT INTO versions (layout_id, user_id, name, data) VALUES (?, ?, ?, ?)').bind(layoutId, userId, name, data),
    env.DB.prepare(`DELETE FROM versions WHERE layout_id = ? AND id NOT IN (SELECT id FROM versions WHERE layout_id = ? ORDER BY id DESC LIMIT ${MAX_VERSIONS})`).bind(layoutId, layoutId),
  ]);
}

async function usage(env) {
  const out = { limits: LIMITS, storageBytes: null, today: null, note: null, resetsAt: null };
  // database size comes back with every D1 query result
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM layouts').run();
  out.storageBytes = r.meta && (r.meta.size_after ?? r.meta.db_size ?? null);
  out.layouts = r.results?.[0]?.n ?? null;
  const now = new Date(), day = now.toISOString().slice(0, 10);
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  out.resetsAt = reset.toISOString();
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) { out.note = 'Daily usage needs the analytics token'; return out; }
  const q = `query($acc: String!, $day: Date!) { viewer { accounts(filter: { accountTag: $acc }) {
      d1AnalyticsAdaptiveGroups(limit: 1000, filter: { date: $day }) { sum { rowsRead rowsWritten readQueries writeQueries } }
      workersInvocationsAdaptive(limit: 1000, filter: { date: $day }) { sum { requests } }
    } } }`;
  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: q, variables: { acc: env.CF_ACCOUNT_ID, day } }),
    });
    const j = await res.json();
    if (j.errors?.length) { out.note = 'Cloudflare analytics: ' + j.errors[0].message; return out; }
    const acc = j.data?.viewer?.accounts?.[0] || {};
    const sum = (arr, k) => (arr || []).reduce((a, g) => a + (g.sum?.[k] || 0), 0);
    out.today = {
      rowsRead: sum(acc.d1AnalyticsAdaptiveGroups, 'rowsRead'),
      rowsWritten: sum(acc.d1AnalyticsAdaptiveGroups, 'rowsWritten'),
      requests: sum(acc.workersInvocationsAdaptive, 'requests'),
    };
  } catch (e) {
    out.note = 'Could not reach Cloudflare analytics';
  }
  return out;
}
