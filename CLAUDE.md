# Notes for Claude

- Big features go on the `test` branch, which drives the test site, test backend and test database. Small tweaks may go to `main`.
- Before merging `test` → `main`, follow **RELEASING.md**:
  - merge code only, never layout saves or other data;
  - verify existing live layouts still work, and fix compatibility issues first;
  - only merge when Adam says "merge it".
- App source is in `src/` (`template.html`, `catalog.js`, `icons.js`). Run `python3 src/build.py` to regenerate `index.html`.
- Backend is in `worker/` (Cloudflare Worker + D1) and is deployed by `.github/workflows/deploy-worker.yml`.
