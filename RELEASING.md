# Releasing: test → live

## Where things live

| | Test | Live |
|---|---|---|
| Branch | `test` | `main` |
| Site | https://test.mancave-9a9.pages.dev | https://adamtww.github.io/mancave/ (also mancave-9a9.pages.dev) |
| Backend | `mancave-api-test` | `mancave-api` |
| Database | `mancave-db-test` | `mancave-db` |

Small tweaks may go straight to `main`. Big features are built on `test` and only reach `main` when Adam says **"merge it"**.

## Rule 1: merge functionality, never layout saves

Merging `test` into `main` moves **code only** (app, backend, schema, deploy setup).

- Layouts, versions and accounts saved on the test site stay in `mancave-db-test`. They are **never** copied, exported or imported into the live database as part of a merge.
- Nothing in the merge may write to or reset live data, apart from additive schema changes (see Rule 2).
- Test accounts (e.g. a test "dad") are not carried over; live accounts are managed separately in live **Manage users**.

## Rule 2: prove existing live saves still work before merging

Before merging, check that the change can't break layouts already saved on live. Fix any problem on `test` first; do not merge with a known issue.

### Checklist

1. **List data changes.** Write down everything the feature changes about saved data:
   - new or renamed fields on rooms or objects;
   - a field whose meaning changes;
   - new object types;
   - removed or renamed catalog refs;
   - database table or column changes.

   If nothing changes, say so explicitly.
2. **Old saves open correctly (backward compatible).** New code must load every existing live layout exactly as before. Missing new fields get sensible defaults, and nothing gets dropped, moved or resized on load.
3. **New saves don't break older copies (forward safe).** A browser still running the old live code, or a cached page, may open a layout saved by the new code. Make sure it doesn't crash or silently strip the new data when re-saved. If that can't be avoided, add a data version number plus a clear "please refresh to the latest version" message instead of saving.
4. **Test against real layouts.** Copy the current live layouts into the **test** database (one-way, live → test only). Open each one on the test site and compare with live:
   - rooms, objects, positions and sizes;
   - names and colors;
   - square footage;
   - power totals and circuits;
   - the Object Library and custom objects.

   Then save, reload and compare again.
5. **Database changes are additive only.** Allowed: `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE … ADD COLUMN`. Never drop or rename tables or columns, or rewrite existing rows, in the same release.
6. **Catalog safety.** Never remove or rename an object `r` id that saved layouts may use. Layouts also carry their own object definitions (`defs`), so keep reading those.
7. **Rollback plan.** Know how to undo:
   - `git revert` the merge, which redeploys the old code automatically;
   - every layout has version history (the latest 50 saves) to restore from.
8. **Get explicit approval.** Report the checklist results to Adam, then merge only after he says "merge it".

## Tooling still to build

- Admin-only **copy live layouts → test** (one-way) to make checklist step 4 quick.
- A `v` (data version) field on saved layouts, plus a small migration step on load.
