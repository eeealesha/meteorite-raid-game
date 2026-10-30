# AGENTS.md

## Language
Communication with the user is in Russian.

## Project
Browser port of the Pygame game in `game.py`, prepared for GitHub Pages. The port lives in `browser/` (static HTML/CSS/JS, no build step). Original Python version must be kept and not treated as the target. Do not edit/modify `game.py`.

## Sources of truth
- `запрос.rtf` — the task spec (Russian). Rules below derive from it; if it changes, AGENTS.md may be stale.
- `game.py` — the original game to port. All graphics are procedural (polygons/circles), all sound is generated at runtime; there are no asset files to copy.
- `wrap-up.rtf` — spec for the `/wrap-up` command, implemented in `.opencode/commands/wrap-up.md`.

## Structure, run & verification
- `browser/index.html` — entry point; loads scripts in order: config, sound, input, touch, star, ship, laser, asteroid, particle, powerup, boss, main. All paths are relative (`./`), so the game works from a `/repository/` subfolder on GitHub Pages.
- `browser/js/config.js` — CFG (sectors, boss, timings), DEBUG check-mode (OFF by default), STORAGE_KEY `meteoriteRaidBestScore`. When `DEBUG.enabled` is true (`skipToSector 1–4`, `sectorTimeOverride`, `godMode`, `instantPowerups`, `bossHp`, `forceTouch`), `window.__gameTest` exposes the game state for tests; in normal play the hook is absent.
- Local run: `cd browser && python3 -m http.server 8000` → http://localhost:8000/ (or repo root → `/browser/`).
- Published: https://eeealesha.github.io/meteorite-raid-game/ — GitHub Pages, repo `eeealesha/meteorite-raid-game` (public). Deploy is `.github/workflows/pages.yml`: on push to `main` it uploads the `browser/` folder as the Pages artifact (no build step, no dependencies).
- Verification (no committed tests): headless smoke harnesses in `/var/folders/8x/13w0c0k17yn3sjmq4zw7bxlh0000gn/T/opencode/` (`smoke_a/b/c.js` for gameplay, `smoke_touch.js` for input/touch buttons) stub DOM/canvas/audio via `vm.runInThisContext`, correct `js/config.js` via source replacement, and assert gameplay with `window.__gameTest`; `node --check js/*.js` for syntax. Visual/sound checks require a real browser.

## Key rules / agreements (from запрос.rtf)
- Browser version goes in a dedicated `browser/` subfolder. Do not edit/modify `game.py`.
- Static HTML/CSS/JS only — no build step, no server dependency. Must work served from a `/repository/` subfolder on GitHub Pages (use relative paths).
- Preserve recognisable ship, look, effects, sounds and controls (←/→ move, Space fire) from the original.
- Full game loop: start screen → 3×30s sectors (transition banners) → boss (phase 2 at 50% HP) → result screen with best score.
- Power-ups drop from destroyed asteroids: shield (one hit, non-stacking) and double-shot (10s, refreshes). Timers run only during active play.
- Pause on `P`, plus auto-pause on focus loss; resume only by player action; all state frozen while paused.
- Best score in localStorage, with graceful fallback if storage is unavailable. Restart must fully reset state and never leak handlers or spawn parallel game loops.
- Sound starts only after a player gesture; provide a mute toggle. Game keys must not scroll the page.
- Proposed staged plan was: A) port + base loop, B) sectors/boss/power-ups/pause/results, C) verify transitions/collisions/power-ups/pause/restart/record/resource loading.
- A test/debug check-mode to skip ahead to late stages is required; it must be clearly separate from normal play and OFF by default.

## Nature of the work / reports
Work is gated on user approval of a plan and its per-stage verification criteria before files change. Reports must separate completed verifications from what the user must still verify manually. Each stage must be executed sequentially.

## Current state
- Implemented (stages A+B complete): `browser/` port — menu, 3×30s sectors with transition banners, boss with phase 2 at 50% HP, shield/double-shot power-ups, pause (P + focus-loss auto-pause), results screen, best score in localStorage, procedural Web Audio + mute, `js/config.js` DEBUG check-mode (off by default), `browser/README.md`, `/wrap-up` command in `.opencode/commands/wrap-up.md`.
- Actually verified (automated, headless in /tmp harnesses): `node --check` on all JS files (clean), HTML↔JS id cross-check (match), smoke tests A 20/20, B 49/49, C 18/18 (sectors/transitions, boss phases, power-ups, pause/resume, restart without handler/loop leaks, save/load record, resource load), plus live HTTP check: all 13 resources return 200 over `python3 -m http.server 8000` with relative paths.
- Verified manually by the user in Safari: the game starts and runs over the local server (`cd browser && python3 -m http.server 8000` → http://localhost:8000/): ship movement, asteroids, sector transitions. The earlier Safari startup report is resolved. Not yet checked by hand: sound + mute, record persisting between reloads, an honest win (DEBUG off).
- Published: https://eeealesha.github.io/meteorite-raid-game/ — GitHub Pages via `.github/workflows/pages.yml` (deploy run `41063739256` green). Verified: all 13 site resources return 200 and are byte-identical to the local `browser/` files (sha256), `DEBUG.enabled` is false on the live site.
- Mobile (stage D, implemented): `js/touch.js` — virtual `◀` `▶` `❚❚` `ОГОНЬ` buttons that call `Input.press/release` with the same key codes as the keyboard (`input.js` now exposes `press/release`, keyboard handlers use the same path). Buttons exist only on `pointer: coarse` (or `navigator.maxTouchPoints > 0`), sit in a reserved strip below the canvas (`--controls-h`) which is a normal flex item of the `100dvh` body (NOT `position: fixed`: on iOS Safari the bottom toolbar swallows taps), never use `setPointerCapture` (WebKit fires `lostpointercapture` right after `pointerdown` and the button releases instantly), and keep audio calls out of the input path: `Sound.unlock()` runs in `try/catch` after `Input.press`, so an `AudioContext` failure cannot block a button, are hidden on menu/pause/results overlays via `MutationObserver`, and release on `blur`/`visibilitychange`. HUD moved inside `#game-wrap` so it always sits on the canvas; layout uses `100dvh` and `env(safe-area-inset-*)`.
- Verified for stage D: `node --check` clean; headless harness `smoke_touch.js` 42/42 (touch buttons set/clear `ArrowLeft`/`ArrowRight`/`Space` via pointer and via `touchstart`, pause button toggles `KeyP` once, `lostpointercapture` does not release a held button, multi-touch releases by `pointerId`, an `AudioContext` exception does not swallow the press, buttons hidden on overlays, `blur` releases held buttons, keyboard path unchanged, desktop sees no buttons); live check in Chromium over `localhost:8000` — game runs, HUD inside canvas, forced touch UI shows 4 buttons, button press sets `Input.isDown`, pause button pauses/resumes without console errors. Not verified automatically: real phone rendering (`pointer: coarse` media query cannot be emulated with the available tools) — needs a manual phone check.
- Next step: manual phone check of the published site (buttons, layout in portrait/landscape, sound after first tap); no open code tasks.
- Known limits: best score is per-browser localStorage (no shared leaderboard); after a redeploy players may need a hard reload to drop cached files.