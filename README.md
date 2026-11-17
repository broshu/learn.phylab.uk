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
| `/` | Opens straight on Before class, step 1 (the check-in), with a two-second opening animation of the whole path; the Worker serves `/before/` here |
| `/before/` | Before class |
| `/during/` | In class (draw field lines with automatic check, peer feedback, 3D match). The 3D step opens in the browser; Browser / AR / VR tabs switch to WebXR on devices that support it (three.js in `public/vendor/three/`, loaded only for that step). `/in-class/` redirects here |
| `/after/` | After class (platypus game) |
| `/teacher/` | Full teacher view: every teacher panel of the lesson, one tab per part (`#before`, `#during`, `#after`). Later protected by Cloudflare Access |
| `/api/` | Data and AI endpoints |

## Storage (added when needed)

- D1 — students, classes, submissions, event logs
- R2 — drawings and uploaded files
- Durable Objects — live in-class room (real-time accuracy, pairing, group counts)
- Secrets — one DeepSeek key per feature, named after the site (e.g. `learn.phylab.uk-check`)
