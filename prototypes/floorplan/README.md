# Floor plan builder prototype

Source for the floor plan builder that is being developed as Claude artifacts
before it is merged into the app. Nothing here is served by the app or deployed.

| Path | What it is |
|---|---|
| `fork/editor.html` | The floor plan editor (outer walls, interior walls, doors, unusable space, zones). Source of the "Floor Plan + Rooms" artifact. |
| `fork/extra.html` | Extra panel pieces for the editor (outer walls lock / reset). |
| `flow/app/flow.html` | The "+ New" flow overlay: chooser, upload dialog, loading screen and the panel layout. |
| `shape-proto/index.html` | The older editor used by "The Cave — new Floor Plan flow" artifact. |
| `wording.py` | Text replacements applied at build time (Layout → Floor Plan, Blackout → Unusable Space). |
| `inside_patch.py` | One-off patch that added the "interior walls stay inside the building" rule. |
| `replay.py`, `dbgreplay.py` | Replay recorded plan-reader replies without calling the model. |
| `tests/` | Playwright checks used while building (walls, snapping, rooms, fill, panning…). |

## Building

The scripts were written for a working folder at `/home/claude/build` with this
same layout. Copy this folder there (or change the paths), then:

```
cd fork && python3 build.py          # → fork/index.html (Floor Plan + Rooms)
cd flow/app && python3 build.py      # → flow/app/index.html (older flow)
```

Tests expect the built page served on port 8766 from `flow/app/`
(`python3 -m http.server 8766`, with `fork/index.html` copied to `flow/app/fork.html`).
The sample floor plan images the tests upload are not included in the repo.
