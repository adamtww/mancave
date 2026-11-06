# The Cave

Floor and power planner for the man cave build. Live at https://adamtww.github.io/mancave/

- `index.html` is the built app (what GitHub Pages serves).
- `src/` holds the source: `template.html` (layout, styles, app logic), `catalog.js` (equipment list with sizes, clearances and power), `icons.js` (top-down drawings).
- Rebuild after editing source: `python3 src/build.py`
- `tests/` has browser checks (Playwright) used during development.
