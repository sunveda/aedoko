# AEDoko

**Call 119. Find an AED. Move.**

Every day, around 40 people need an AED, but finding one quickly can be difficult. AEDoko is a one-click, phone-first tool that helps people locate a nearby AED and call 119 without losing precious time.

AEDoko combines **AED** with the Japanese word **どこ (doko, “where?”)**. It points toward source-listed AED coordinates, shows the three best nearby candidates, and keeps the emergency call action visible throughout the experience.

## Try it

- **Canonical public URL:** <https://sunveda.tech/app/aedoko>
- **GitHub Pages:** <https://sunveda.github.io/aedoko/>
- **Private pilot:** <https://aed-door-arrow-tokyo-pilot.sarveshwar1986.chatgpt.site/>

## What it does

- Finds nearby AED listings using browser geolocation
- Calculates distance, ranking, and direction on the device
- Shows three candidates with Japanese facility and placement details
- Offers walking directions and one-tap access to call 119
- Opens an on-demand, clustered map of all 4,772 listings without loading the map library, tiles, or AED snapshot during the initial page load
- Supports 16 interface locales, with a clear human-review requirement before public release
- Preserves source, license, snapshot date, and municipality coverage information
- Stores only the selected language; location is never stored or sent by AEDoko

The interactive map uses MapLibre with OpenFreeMap tiles. It loads only after the user opens it. The map starts with Tokyo-wide bounds and requests browser location only after the separate **Center on me** action.

## Tokyo pilot data

The committed snapshot contains **4,772 coordinate-valid AED listings**. Reviewed sources were found for **33 of Tokyo’s 62 municipalities**, and **26 municipalities** currently emit coordinate-valid records.

Coverage varies by municipality. A missing source is a data gap, not evidence that a municipality has no AEDs. AEDoko does not claim complete Tokyo-wide AED coverage and links to the nationwide AED map when the pilot cannot provide a credible nearby result.

Static data artifacts live in `public/data/` and include the normalized records, 62-municipality coverage matrix, attribution registry, and QA summary.

## Hackathon origin

AEDoko was started on **27 August 2026** at [OpenAI Codex – Fast Hacks in Tokyo](https://luma.com/tokyo-hack-night-08-27-26?tk=gJzYtH). The project began as a focused hackathon prototype for making verified AED location information faster and easier to act on during an emergency.

## Run locally

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run data:validate
npm run lint
npm run build
npm run build:pages
```

## Community contributions

- **Add a city:** contributors use a structured GitHub form to share official AED datasets, municipal maps, or individual official location links.
- **Review:** each city submission automatically creates an unverified draft source-proposal pull request assigned to `sunveda`.
- **Publish safely:** merging that proposal records the source lead only. Dataset-specific import and validation remain a separate maintainer step, so unverified coordinates never enter the live snapshot automatically.
- **Feedback:** a second structured form creates a labeled GitHub issue for data problems, bugs, accessibility concerns, translation feedback, and ideas.

See [`community/README.md`](community/README.md) for the complete review flow.

## Safety and limitations

- Call 119 first and begin CPR when appropriate.
- AEDoko is not an emergency dispatch service or a substitute for professional medical guidance.
- Listings do not confirm that an AED is operational or accessible right now.
- The arrow points to a published coordinate, not necessarily a building entrance.
- Confirm access on arrival and follow the AED device’s spoken instructions.

## Data attribution

Each normalized record retains its municipal publisher, source dataset, resource URL, license, and fetch date. See `public/data/aed-tokyo-attribution.v1.json` for the consolidated registry.
