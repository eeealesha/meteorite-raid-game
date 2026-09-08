# AGENTS.md

## Language
Communication with the user is in Russian.

## Project
Browser port of the Pygame game in `game.py`, prepared for GitHub Pages. Requirements live in `browser/.` (planned, not yet created). Original Python version must be kept and not treated as the target.

## Sources of truth
- `запрос.rtf` — the task spec (Russian). Rules below derive from it; if it changes, AGENTS.md may be stale.
- `game.py` — the original game to port. All graphics are procedural (polygons/circles), all sound is generated at runtime; there are no asset files to copy.

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
- `browser/` does NOT exist yet — the port is planned but not started. No automation/tests exist.
- Nothing is committed or published yet. `.opencode/commands/wrap-up.md` from wrap-up.rtf is not yet created.