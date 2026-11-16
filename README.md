# learn.phylab.uk

All-in-one before-class / in-class / after-class learning site, with a teacher view that runs through all three.
Sister sites: phylab.uk (broshu/phylab.uk), p.phylab.uk (broshu/lab).

## How it runs

One Cloudflare Worker (`learn-phylab-uk`), deployed automatically by Workers Builds on every push to `main`.

- `public/` — the pages (plain HTML/JS, folder-style clean URLs)
- `src/worker.js` — the API under `/api/*`
- `wrangler.jsonc` — Worker settings, including the custom domain `learn.phylab.uk`

## Planned layout

| Path | Part |
|---|---|
| `/` | Home: the cycle, student entry, teacher entry |
| `/before/` | Before class |
| `/during/` | In class (draw field lines with automatic check, peer feedback, 3D match). `/in-class/` redirects here |
| `/during/vr/` | WebXR page — opens on screen or in a headset browser |
| `/after/` | After class (platypus game) |
| `/teacher/` | Teacher view (protected by Cloudflare Access) |
| `/about/` | About this demo |
| `/api/` | Data and AI endpoints |

## Storage (added when needed)

- D1 — students, classes, submissions, event logs
- R2 — drawings and uploaded files
- Durable Objects — live in-class room (real-time accuracy, pairing, group counts)
- Secrets — one DeepSeek key per feature, named after the site (e.g. `learn.phylab.uk-check`)
