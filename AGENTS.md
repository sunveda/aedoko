# AGENTS.md — aedoko

Operating notes for any coding agent working in this repository.

## Read first

1. **[docs/CONTEXT.md](docs/CONTEXT.md)** — living product status, blockers, open PRs. **Update it** on every active workday and on every major direction change (SunVeda house rule for all projects).
2. [README.md](README.md) — product behavior, safety limitations, data attribution
3. [community/README.md](community/README.md) — contribution / review flow

## Product in one line

Find nearby Tokyo AEDs and call 119 — static snapshot + on-device ranking; map loads only on demand.

## Engineering rules

- Preserve the fast initial emergency path: do not load MapLibre, tiles, or the full snapshot until the user opens the map
- Never auto-merge community coordinates into the live snapshot
- Location is memory-only; do not add persistence or SunVeda analytics for coordinates
- Prefer small PRs; keep data validate scripts green (`npm run data:validate`)
- When changing the public bundle under sunveda.tech `/app/aedoko/`, coordinate a vendored release in that repo too
- As of 2026-09-15: feature eng paused — CONTEXT/docs only unless owner reopens (draft PR #3 held)

## Context hygiene (required)

After meaningful work (feature merge, data snapshot change, deploy URL change, scope pivot):

1. Update the dated **Current status** section in `docs/CONTEXT.md`
2. Keep bullets short; link PRs by number
3. If you only ship code and skip CONTEXT, the next agent starts blind — treat that as a bug
