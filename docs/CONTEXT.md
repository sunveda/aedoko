# Agent context (living)

**Purpose:** Single source of truth so any agent (or human) can pick up this repo without chat history.

**Rule (SunVeda, all projects):** Update this file **at least once per active workday** while the project is the focus, and **immediately** on any major direction change (scope, stack, blockers, live URL, merge policy). Prefer a short dated entry at the top of Status over rewriting the whole file.

Do not put secrets here. Env var *names* and where they live are fine. Device location is never stored or sent by AEDoko — do not invent analytics that change that.

---

## What this product is

**AEDoko** — phone-first emergency helper: find a nearby AED and call 119 without losing time. Tokyo pilot with a committed coordinate-valid AED snapshot; MapLibre map loads on demand only.

- Canonical public URL: https://sunveda.tech/app/aedoko
- GitHub Pages: https://sunveda.github.io/aedoko/
- Source repo: https://github.com/sunveda/aedoko
- Hosted/vendored copy also under `sunveda/sunveda.tech` at `/app/aedoko/`

## Owner / bots

- Product owner: Sarveshwar Singh (SunVeda)
- No dedicated specialist bot named in-repo; coordinate via **Chief of Staff** / **Chief of Engineering** when eng reopens
- Community city-source proposals and feedback via GitHub Issue Forms (maintainer review before any live snapshot change)

## Stack (known)

- React 19 + Next 16 / vinext + Vite; Tailwind 4; TypeScript; Node ≥22.13
- MapLibre GL + OpenFreeMap tiles (lazy; not on initial emergency path)
- Static AED snapshot in `public/data/` (build/validate via Python + Node scripts)
- Deploy: GitHub Pages (`build:pages`) and vendored bundle into sunveda.tech (`build:sunveda` / `/app/aedoko/`)

## Current status (2026-09-15)

### Engineering focus

- **Paused / held for feature eng.** Active SunVeda eng focus is **jkk-watch** (+ Learn AI Now, no repo). Prefer **CONTEXT-only** updates here until the owner reopens AEDoko eng — except owner-directed emergency fixes.

### Live / data

- Tokyo pilot: **4,772** coordinate-valid AED listings; coverage gaps documented in README (not complete Tokyo-wide claim)
- 16 interface locales; human review still required before treating translations as public-final

### Open PRs

- **Draft PR #3** — https://github.com/sunveda/aedoko/pull/3 — "Fix mobile map flicker: stop rebuilding MapLibre map on re-render". **Held/draft** while eng focus is elsewhere.

### Blockers / next when reopened

1. Review/merge or supersede draft PR #3 (map flicker)
2. Translation human-review before treating all 16 locales as release-ready
3. Community source-proposal import pipeline remains maintainer-gated (never auto-publish)
4. Keep map payload strictly on-demand (architecture decision shared with sunveda.tech)

## Non-goals / constraints

- Not an emergency dispatch service; call 119 first
- Listings do not confirm AED operational status
- Location stays in browser memory; no SunVeda storage of coordinates
- Unverified community submissions must not enter the live snapshot automatically

## Related docs

- Root [README.md](../README.md) — product brief, safety, data attribution
- [community/README.md](../community/README.md) — city source + feedback review flow
- Root [AGENTS.md](../AGENTS.md) — agent operating rules
