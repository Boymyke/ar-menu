# LUMA — AR Menu (test build)

Scan the QR on the table → the phone camera opens → the table "detects" → six Nigerian dishes
materialise in 3D on your table. Swipe to spin the lazy-Susan, tap a dish for details, hit
**Explode layers** to pull it apart ingredient-by-ingredient, add to order with a confetti burst.
Move the phone and the dishes stay anchored where they are (gyro-tracked).

- `/` — the AR menu
- `/qr.html` — printable table card; the QR always encodes the domain it's served from
- `/?debug` — opens the live perf HUD (also the ⚡ button)
- `/?lite` / `/?full` — force low-end / full mode

## How it stays light

| Choice | Why |
|---|---|
| Zero frameworks, zero images, zero webfonts | Every dish is CSS gradients in 3D space — the whole app is **14 KB over the wire** (44 KB raw), 3 requests |
| CSS 3D transforms only (no WebGL / three.js) | Runs on the compositor; no 600 KB 3D engine, no shader compile on load |
| One render loop that **sleeps when nothing moves** | No battery drain while the phone is still |
| Dishes facing away are `display:none` | Roughly halves GPU texture memory (~20 live layers instead of ~40) |
| Camera capped at 720p / 30 fps (480p in lite) | A 4K stream would cost ~33 MB per frame buffer vs ~3.7 MB |
| Camera + loops stop when the tab is hidden | Frees the camera and its buffers instantly |
| Confetti canvas has 0×0 pixels except during a burst; DPR capped at 2 | A full-screen 3× canvas would hold ~12 MB permanently |
| Lite mode auto-enables on ≤2 GB RAM or reduced-motion | Drops blur, steam, glows, halves particles |
| Service worker, cache-first | Second scan opens with zero network |

## Measured (headless Chrome, Pixel-7 viewport @3×, 4× CPU throttle, 1.6 Mbps / 150 ms network)

| Metric | Result |
|---|---|
| Transfer size | 14.0 KB (Brotli) |
| First paint | ~1.3 s |
| Fully loaded | ~1.6 s |
| JS heap | 2.4 MB |
| FPS while spinning the dishes | 55 fps at 4× CPU slowdown |
| Estimated GPU memory | ~20–35 MB (camera frames + ~20 composited layers at 3× DPR) |

Real phones: open the ⚡ HUD to see live FPS, heap (Chrome/Android only — Safari doesn't expose it), load timings and camera resolution.

## Run locally
```bash
npm run dev            # http://localhost:5173 (camera works on localhost)
npm run qr -- https://your-url   # regenerate public/qr.svg + qr.png
```

## Deploy to Cloudflare
**Easiest (no tokens):** Cloudflare dashboard → Workers & Pages → Create → Pages → *Connect to Git* →
pick `Boymyke/ar-menu` → Framework: None, Build command: *(empty)*, Output directory: `public` → Deploy.

**Or via GitHub Actions:** add repo secrets `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers")
and `CLOUDFLARE_ACCOUNT_ID`; every push to `main` deploys `public/` to the `ar-menu` Pages project.

Then open `https://<your-domain>/qr.html` and print it — the QR will point at whatever domain Cloudflare gave you.
The static `public/qr.png` encodes `https://ar-menu.pages.dev`; if Cloudflare assigns a different subdomain, run `npm run qr -- <url>`.
