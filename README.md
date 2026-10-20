# LUMA — AR Menu (test build)

**Live:** https://ar-menu-dae.pages.dev · **Table card:** https://ar-menu-dae.pages.dev/qr.html

The QR code on the table does two jobs: scanning it opens the menu, and then it becomes the **AR marker**.
Point the phone back at the code and the dish materialises sitting on it, locked in place as you move
around the table (real 6-DoF tracking from the code's four corners).

- Drag on the dish to turn it · tap it (or **Layers**) to explode it ingredient-by-ingredient
- Pick dishes from the bottom strip or swipe the info card · **Add** → confetti + flies to cart
- `/?demo` — no camera: a virtual code on a virtual table · `/?debug` — perf HUD (also the ⚡ button)
- `/?lite` / `/?full` — force low-end / full mode

## How the tracking works
1. **Detect** the code's 4 corners: native `BarcodeDetector` (Android Chrome), or **jsQR in a Web Worker**
   (iOS Safari / Firefox). Frames reach the worker as GPU-resized `ImageBitmap`s (long side 640 px), capped at 15 Hz.
2. **Smooth** the corners with a one-euro filter (steady when still, responsive when moving).
3. **Solve** a homography → camera pose (rotation + translation), assuming a ~65° phone camera FOV.
4. **Render**: one CSS `matrix3d` on a single element; the dish is CSS gradient layers inside it. No WebGL.
5. Lose the code for >0.65 s → dish fades, viewfinder comes back; it snaps back instantly on re-detect.

## How it stays light

| Choice | Why |
|---|---|
| Zero frameworks, zero images, zero webfonts | Every dish is CSS gradients in 3D space — the whole app is **14 KB over the wire** (44 KB raw), 3 requests |
| CSS 3D transforms only (no WebGL / three.js) | Runs on the compositor; no 600 KB 3D engine, no shader compile on load |
| Only **one dish in the DOM** at a time (5–10 layers) | Minimal GPU texture memory |
| QR detection off the main thread, zero-copy bitmaps, 15 Hz cap | JS heap stays flat (~3 MB) instead of churning ~1 MB per frame |
| Tracker library (jsQR, 26 KB) only loads on iOS/Firefox | Android uses the built-in detector; first load stays ~16 KB |
| Camera capped at 720p / 30 fps (480p in lite) | A 4K stream would cost ~33 MB per frame buffer vs ~3.7 MB |
| Camera + loops stop when the tab is hidden | Frees the camera and its buffers instantly |
| Confetti canvas has 0×0 pixels except during a burst; DPR capped at 2 | A full-screen 3× canvas would hold ~12 MB permanently |
| Lite mode auto-enables on ≤2 GB RAM or reduced-motion | Drops blur, steam, glows, halves particles |
| Service worker, cache-first | Second scan opens with zero network |

## Measured (headless Chrome, Pixel-7 viewport @3×, 4× CPU throttle, 1.6 Mbps / 150 ms network)

| Metric | Result |
|---|---|
| Transfer size (first screen) | ~16 KB (Brotli), 3 requests |
| First paint / fully loaded | ~0.5 s / ~0.6 s |
| JS heap while tracking | 2.3–3.2 MB, flat |
| Render FPS while tracking | 52–60 fps (2× CPU slowdown) |
| QR detection (jsQR worker) | 20–50 ms per frame, 10–15 Hz |
| Estimated GPU memory | ~15–25 MB (camera frames + ≤10 composited layers at 3× DPR) |

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
Live: **https://ar-menu-dae.pages.dev** — table card with QR at https://ar-menu-dae.pages.dev/qr.html. `wrangler.toml` tells Pages to serve `public/`.
