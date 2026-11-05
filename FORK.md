# Fork notes (BlackeCHo91/openGym)

A personal fork of [openGym](https://github.com/DuarteSantos8/openGym) (AGPL-3.0-or-later), with
a Lifestyle layer on top: how a session felt and how the day feels, rated by the person, to sit
beside the hard numbers later. Everything the fork adds lives in its own files; upstream files are
touched only at the docking points below, each marked with a `fork:` comment.

## What the fork adds

| Where | What |
|---|---|
| `api/lifestyle.js` | Routes `GET /api/lifestyle`, `PUT /api/lifestyle/session`, `PUT /api/lifestyle/day`. Data in `DATA_DIR/lifestyle-<uid>.json`, never in `state-<uid>.json`. |
| `api/test/lifestyle.test.js` | Its tests. |
| `frontend/src/fork/` | `lifestyle-core.js` (pure logic + test), `lifestyle-store.js` (API + offline queue), `ScorePicker.jsx`, `SessionRatingSheet.jsx`, `DayBarometer.jsx`, `Me.jsx` (the Ich tab), `lifestyle.css`. |
| `.github/workflows/fork-checks.yml` | The fork's tests and a build, on every push. |

Session rating after every workout, 1 to 10: overall feel, motivation, strength, optional note.
Daily barometer, 1 to 5: energy, mood, stress, sleep as felt, optional note.

## Docking points in upstream files

Re-apply these after merging an upstream release. Search for `fork:`.

| File | Change |
|---|---|
| `api/server.js` | Import of `lifestyleRoutes`; one `Object.assign(routes, lifestyleRoutes(...))` after the route table. The routes are deliberately not in `openapi.yaml` (its test scans server.js only). |
| `api/Dockerfile` | `lifestyle.js` added to the `COPY` line of root modules (a test checks this). |
| `frontend/src/App.jsx` | Import of `Me`; route `/me`. |
| `frontend/src/components/TabBar.jsx` | The Exercises tab became **Ich** (`/me`, keeps `data-tour="tab-library"` for the guided tour); `library` and `muscles` light the Ich tab. |
| `frontend/src/sheets.jsx` | Import of `openSessionRating`; at the end of `doFinishWorkout`, `if (!past) openSessionRating(shown)`. |
| `.github/workflows/` | Removed mirror, CLA, pages, iOS, audit, release-check. `test.yml` runs by hand only (some upstream UI tests expect the Exercises tab). `docker-publish.yml` builds amd64 only. |

## Images

A push to `main` builds `ghcr.io/blackecho91/opengym-api:edge` and `ghcr.io/blackecho91/opengym-web:edge`.
