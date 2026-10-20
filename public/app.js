/* LUMA AR menu v2 — the QR code on the table is the AR marker.
 *
 * Pipeline per camera frame:
 *   detect QR corners (native BarcodeDetector, or jsQR in a Web Worker on iOS)
 *   → one-euro filter (kills jitter, keeps fast moves responsive)
 *   → homography → camera pose (R, t)
 *   → CSS matrix3d on one element; the dish is CSS layers inside it.
 * No WebGL, no images, no frameworks. Loops stop when idle or hidden.
 */
(() => {
'use strict';

/* ---------- device tier ---------- */
const qs = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mem = navigator.deviceMemory || 8;
const LITE = !qs.has('full') && (qs.has('lite') || reduce || mem <= 2);
document.documentElement.classList.toggle('lite', LITE);

const $ = (s) => document.querySelector(s);
const el = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };
const naira = (n) => '₦' + n.toLocaleString('en-NG');
const mod = (a, n) => ((a % n) + n) % n;
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (_) {} };
const body = document.body;

/* ---------- dish art (CSS gradients) ---------- */
const spot = (pts, c) => pts.map(([x, y, r]) =>
  `radial-gradient(circle ${r}px at ${x}% ${y}%,${c[0]} 0,${c[1]} 55%,${c[2]} 90%,transparent 100%)`).join(',');
const ring = (a, b, c) => `radial-gradient(circle closest-side,transparent ${a}%,${c} ${a + 1}% ${b}%,transparent ${b + 1}%)`;
const PLATE = 'radial-gradient(circle closest-side,#fbfaf6 0 54%,#e6e1d6 56% 60%,#fdfcf9 62% 86%,#cfc8bb 89% 92%,#b9b1a3 94% 96%,transparent 97%)';
const BALL = ['#ffd88a', '#e0912f', '#9a5216'];
const GREEN = ['#8fe07a', '#3d9a3f', '#1d5a22'];
const RED = ['#ff8a6b', '#e0362a', '#8a1a14'];
const YAM = 'radial-gradient(circle at 42% 38%,#fffdf6,#f1e8d2 65%,#d8caa8)';
const around = (n, rad, r, off = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2 + off; return [50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad, r];
});

const DISHES = [
  { name: 'Smoky Party Jollof', cat: 'Mains', price: 4500, kcal: 640, prep: '12 min', heat: 2,
    desc: 'Firewood-smoked tomato rice, peppered chicken, sweet dodo.',
    sw: 'radial-gradient(circle at 40% 40%,#f0702a,#c4421b 70%)',
    layers: [
      { w: 170, z: 0, bg: PLATE },
      { w: 112, h: 104, x: -6, y: 4, z: 6, r: '47% 53% 50% 50%/52% 46% 54% 48%',
        bg: spot([[22, 40, 2], [35, 62, 2], [48, 30, 2], [60, 55, 2], [72, 38, 2], [40, 78, 2], [66, 72, 2], [28, 25, 2], [80, 58, 2], [52, 48, 2]], ['rgba(255,226,180,.9)', 'rgba(255,200,150,.5)', 'rgba(255,200,150,0)']) +
          ',radial-gradient(circle at 45% 40%,#f0702a,#d2481c 55%,#a8321a)' },
      { w: 96, x: -28, y: 26, z: 12, r: '0', bg: spot([[25, 50, 13], [55, 35, 13], [78, 62, 12]], ['#ffd56b', '#f2a93b', '#b8621c']) },
      { w: 58, h: 42, x: 26, y: -14, z: 17, r: '62% 38% 56% 44%/50% 60% 40% 50%', bg: 'radial-gradient(circle at 35% 35%,#f0b06a,#b5602a 50%,#6b3214)' },
      { w: 110, z: 22, r: '0', bg: spot([[30, 30, 3], [60, 62, 3], [40, 72, 2.5], [72, 32, 2.5], [50, 45, 2]], GREEN) },
    ] },
  { name: 'Yaji Beef Suya', cat: 'Grill', price: 3800, kcal: 520, prep: '10 min', heat: 3,
    desc: 'Charcoal-grilled skewers in house yaji, red onion, tomato.',
    sw: 'radial-gradient(circle at 40% 40%,#b4602e,#5e2410 75%)',
    layers: [
      { w: 190, h: 116, z: 0, r: '20px',
        bg: 'linear-gradient(90deg,rgba(0,0,0,.2),transparent 18%,transparent 82%,rgba(0,0,0,.2)),repeating-linear-gradient(90deg,#9a6a3c 0 10px,#8a5c33 10px 21px,#a37444 21px 26px)' },
      { w: 180, h: 6, y: -18, z: 9, r: '3px', bg: '#dcb987' },
      { w: 180, h: 6, y: 18, z: 9, r: '3px', bg: '#dcb987' },
      { w: 160, h: 80, z: 13, r: '0', bg: spot([15, 32, 49, 66, 83].flatMap((x) => [[x, 27, 12], [x, 73, 12]]), ['#b4602e', '#6e2a12', '#3e160a']) },
      { w: 160, h: 80, z: 15, r: '0', bg: spot([12, 29, 46, 63, 80].flatMap((x) => [[x + 4, 22, 2], [x + 7, 70, 2]]), ['#ffb36b', '#e2622a', '#a8401a']) },
      { w: 160, h: 112, z: 18, r: '0', bg: spot([[8, 14, 9], [92, 86, 9]], RED) },
      { w: 160, h: 112, z: 21, r: '0', bg: [[18, 86], [80, 12], [50, 92]].map(([x, y]) =>
        `radial-gradient(circle 11px at ${x}% ${y}%,transparent 0 50%,#f6e8f2 56% 72%,#b778a8 78% 92%,transparent 100%)`).join(',') },
    ] },
  { name: 'Goat Pepper Soup', cat: 'Soups', price: 5200, kcal: 410, prep: '15 min', heat: 3,
    desc: 'Slow-simmered goat in fiery calabash-nutmeg broth, scent leaf.',
    sw: 'radial-gradient(circle at 40% 40%,#f2b45a,#9a4a16 75%)',
    layers: [
      { w: 112, z: 0, bg: 'radial-gradient(circle closest-side,#2b211d,#1a1311 95%,transparent)' },
      { w: 132, z: 8, bg: ring(78, 98, '#2d221e') },
      { w: 150, z: 16, bg: ring(82, 98, '#33271f') },
      { w: 140, z: 20, bg: 'radial-gradient(circle at 40% 38%,#f2b45a,#c46b1f 55%,#8a3f12 95%,transparent 98%)' },
      { w: 164, z: 25, bg: ring(92, 98, '#5a4636') + ',' + ring(85, 98, '#3d2f26') },
      { w: 120, z: 24, r: '0', bg: spot([[30, 40, 14], [62, 30, 12], [55, 68, 15], [78, 58, 10]], ['#b9835c', '#7a4a2c', '#4a2a17']) },
      { w: 120, z: 28, r: '0', bg: spot([[40, 58, 6], [70, 42, 5], [25, 30, 5], [50, 20, 4]], GREEN) + ',' + spot([[66, 76, 4], [33, 72, 4]], RED) },
    ] },
  { name: 'Pounded Yam & Egusi', cat: 'Swallow', price: 6000, kcal: 820, prep: '18 min', heat: 1,
    desc: 'Hand-pounded yam with melon-seed soup, spinach and assorted meat.',
    sw: 'radial-gradient(circle at 60% 40%,#fffdf6 0 30%,#d9b23a 34%,#8f6a10 80%)',
    layers: [
      { w: 176, z: 0, bg: PLATE },
      { w: 94, x: -28, y: 6, z: 6, r: '50% 46% 52% 48%',
        bg: spot([[25, 35, 4], [45, 22, 3], [62, 40, 4], [38, 60, 3], [70, 66, 4], [52, 78, 3], [30, 74, 3]], GREEN) + ',radial-gradient(circle at 40% 40%,#e8c34a,#c49a1e 60%,#8f6a10)' },
      { w: 72, x: -28, y: 6, z: 11, r: '0', bg: spot([[30, 40, 10], [66, 62, 9]], ['#c8834f', '#8a4a22', '#4e2510']) },
      { w: 66, x: 36, y: -8, z: 6, bg: YAM },
      { w: 56, x: 36, y: -8, z: 15, bg: YAM },
      { w: 42, x: 36, y: -8, z: 23, bg: YAM },
      { w: 22, x: 36, y: -8, z: 28, bg: YAM },
    ] },
  { name: 'Puff-Puff Tower', cat: 'Sweets', price: 2000, kcal: 380, prep: '6 min', heat: 0,
    desc: 'Warm nutmeg dough balls, dusted in sugar. Built for sharing.',
    sw: 'radial-gradient(circle at 40% 40%,#ffd88a,#c87a26 75%)',
    layers: [
      { w: 156, z: 0, bg: PLATE },
      { w: 124, z: 10, r: '0', bg: spot(around(6, 32, 18), BALL) },
      { w: 84, z: 25, r: '0', bg: spot(around(3, 24, 17, 0.5), BALL) },
      { w: 44, z: 38, r: '0', bg: spot([[50, 50, 16]], BALL) },
      { w: 120, z: 48, r: '0', bg: spot([[30, 40, 2], [62, 34, 1.5], [44, 62, 2], [70, 60, 1.5], [52, 48, 1.5], [36, 56, 1.5]], ['#fff', '#fffaf0', 'rgba(255,255,255,.4)']) },
    ] },
  { name: 'Chapman Fizz', cat: 'Drinks', price: 2500, kcal: 190, prep: '3 min', heat: 0,
    desc: 'Lagos’ iconic mocktail: citrus, grenadine, cucumber, lots of ice.',
    sw: 'radial-gradient(circle at 40% 40%,#ff8a4a,#c42a34 75%)',
    layers: [
      { w: 112, z: 0, bg: 'radial-gradient(circle closest-side,#1b1b26 0 80%,#3a3a4a 84% 88%,transparent 90%)' },
      ...Array.from({ length: 7 }, (_, i) => ({ w: 80, z: 6 + i * 10,
        bg: `radial-gradient(circle at 40% 38%,rgba(255,${170 - i * 12},${90 - i * 6},.92),rgba(${196 + i * 7},${36 + i * 8},44,.86) 70%,rgba(255,255,255,.6) 91%,transparent 95%)` })),
      { w: 64, z: 72, r: '0', bg: spot([[34, 38, 10], [64, 58, 9]], ['rgba(255,255,255,.85)', 'rgba(200,240,255,.6)', 'rgba(160,220,255,.3)']) },
      { w: 34, x: 20, y: -10, z: 74, bg: 'radial-gradient(circle closest-side,#eefbd8 0 52%,#9bd06a 56% 74%,#2f6b2a 78% 98%,transparent)' },
      { up: true, w: 6, h: 120, x: -12, z: 100, r: '3px', rz: '10deg', bg: 'repeating-linear-gradient(180deg,#fff 0 8px,#ff4d5a 8px 16px)' },
    ] },
];
const N = DISHES.length;
const U = 52; // dish px per QR half-side → plate ≈ 1.6× the printed code

/* ---------- dish building (only ONE dish is in the DOM at a time) ---------- */
const anchor = $('#anchor'), turn = $('#turn'), dishEl = $('#dish');
let cur = 0, topZ = 0, swapT = 0;
function buildDish(i) {
  const d = DISHES[i];
  dishEl.textContent = '';
  topZ = 0;
  d.layers.forEach((L, k) => {
    const w = L.w, h = L.h || L.w, l = el('div', L.up ? 'layer up' : 'layer');
    l.style.cssText = `width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;background:${L.bg};border-radius:${L.r || '50%'};` +
      `--x:${L.x || 0};--y:${L.y || 0};--z:${L.z || 0};--i:${k};--d:${k * 70}ms;` + (L.rz ? `--rz:${L.rz};` : '');
    topZ = Math.max(topZ, (L.z || 0) + (L.up ? h / 2 : 0));
    dishEl.append(l);
  });
}
function fillInfo() {
  const d = DISHES[cur];
  $('#kicker').textContent = `${String(cur + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')} · ${d.cat}`;
  $('#dName').textContent = d.name;
  $('#dDesc').textContent = d.desc;
  $('#dKcal').textContent = d.kcal + ' kcal';
  $('#dPrep').textContent = d.prep;
  $('#dHeat').innerHTML = [0, 1, 2].map((k) => `<i class="${k < d.heat ? 'on' : ''}"></i>`).join('');
  $('#dPrice').textContent = naira(d.price);
  $('#lName').textContent = d.name; $('#lPrice').textContent = naira(d.price);
  const info = $('.info'); info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
  [...strip.children].forEach((c, k) => c.setAttribute('aria-selected', k === cur));
  strip.children[cur].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
}
function setDish(i, instant) {
  i = mod(i, N);
  if (i === cur && !instant) return;
  cur = i; fillInfo(); setExploded(false); buzz(8);
  clearTimeout(swapT);
  if (instant) { buildDish(i); return; }
  dishEl.classList.add('leaving');
  swapT = setTimeout(() => {
    dishEl.classList.remove('leaving'); buildDish(i);
    anchor.classList.remove('on'); void anchor.offsetWidth; anchor.classList.add('on');
  }, 330);
}
const strip = $('#strip');
DISHES.forEach((d, i) => {
  const b = el('button', 'chip'); b.setAttribute('role', 'tab');
  b.innerHTML = `<span class="sw" style="background:${d.sw}"></span><span>${d.name}<small>${naira(d.price)}</small></span>`;
  b.onclick = () => setDish(i);
  strip.append(b);
});

/* ---------- pose math ---------- */
function solve8(A, b) { // Gaussian elimination, 8×8
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    const v = A[c][c]; if (Math.abs(v) < 1e-12) return null;
    for (let r = c + 1; r < 8; r++) { const f = A[r][c] / v; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const x = new Array(8);
  for (let r = 7; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < 8; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
  return x;
}
const OBJ = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; // QR corners TL,TR,BR,BL in half-side units
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/* screen-space corners → {R,t} (camera frame: x right, y down, z forward) */
function poseFrom(sc, f, cx, cy) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [X, Y] = OBJ[i], x = (sc[i][0] - cx) / f, y = (sc[i][1] - cy) / f;
    A.push([X, Y, 1, 0, 0, 0, -x * X, -x * Y]); b.push(x);
    A.push([0, 0, 0, X, Y, 1, -y * X, -y * Y]); b.push(y);
  }
  const h = solve8(A, b); if (!h) return null;
  const h1 = [h[0], h[3], h[6]], h2 = [h[1], h[4], h[7]], h3 = [h[2], h[5], 1];
  let lam = 2 / (Math.hypot(...h1) + Math.hypot(...h2));
  if (h3[2] * lam < 0) lam = -lam; // keep the marker in front of the camera
  const r1 = norm(h1.map((v) => v * lam));
  let r2 = h2.map((v) => v * lam); const d = r1[0] * r2[0] + r1[1] * r2[1] + r1[2] * r2[2];
  r2 = norm([r2[0] - d * r1[0], r2[1] - d * r1[1], r2[2] - d * r1[2]]);
  const r3 = cross(r1, r2), t = h3.map((v) => v * lam);
  if (t[2] <= 0.01) return null;
  return { R: [r1, r2, r3], t }; // columns
}
/* pose → CSS matrix3d. CSS point (x,y,z) with perspective f lands at f·x/(f−z),
 * so camera point C maps to css = k·(Cx, Cy, −Cz) + (0,0,f) with k = f/tz (scale 1 at the code). */
let M = null; // last matrix as rows of A (3×3) and b, for projecting the label
function applyPose(P, f) {
  const [c1, c2, c3] = P.R, t = P.t, k = f / t[2], s = k / U;
  const A = [[c1[0] * s, c2[0] * s, c3[0] * s], [c1[1] * s, c2[1] * s, c3[1] * s], [-c1[2] * s, -c2[2] * s, -c3[2] * s]];
  const bb = [t[0] * k, t[1] * k, 0];
  M = { A, b: bb, f };
  anchor.style.transform = `matrix3d(${A[0][0]},${A[1][0]},${A[2][0]},0,${A[0][1]},${A[1][1]},${A[2][1]},0,${A[0][2]},${A[1][2]},${A[2][2]},0,${bb[0]},${bb[1]},0,1)`;
}
function project(px, py, pz) { // dish px coords (z up = negative) → screen
  const { A, b, f } = M;
  const x = A[0][0] * px + A[0][1] * py + A[0][2] * pz + b[0];
  const y = A[1][0] * px + A[1][1] * py + A[1][2] * pz + b[1];
  const z = A[2][0] * px + A[2][1] * py + A[2][2] * pz + b[2];
  const s = f / Math.max(1, f - z);
  return [innerWidth / 2 + x * s, innerHeight / 2 + y * s];
}

/* ---------- one-euro filter: smooth when still, responsive when moving ---------- */
class OneEuro {
  constructor(minCut = 1.4, beta = 0.012) { this.mc = minCut; this.b = beta; this.x = null; }
  reset() { this.x = null; }
  f(v, t) {
    if (this.x == null) { this.x = v; this.dx = 0; this.t = t; return v; }
    const dt = Math.max((t - this.t) / 1000, 1e-3); this.t = t;
    const a = (c) => 1 / (1 + 1 / (2 * Math.PI * c * dt));
    this.dx += a(1) * ((v - this.x) / dt - this.dx);
    this.x += a(this.mc + this.b * Math.abs(this.dx)) * (v - this.x);
    return this.x;
  }
}
const filt = Array.from({ length: 8 }, () => new OneEuro());
let target = null, shown = null; // filtered corners, displayed corners (screen px)

/* ---------- camera ---------- */
const video = $('#cam');
let stream = null, mode = 'idle'; // idle | cam | demo
async function startCam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera API');
  stream = await navigator.mediaDevices.getUserMedia({ audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: LITE ? 960 : 1280 }, height: { ideal: LITE ? 540 : 720 }, frameRate: { ideal: 30, max: 30 } } });
  video.srcObject = stream;
  await video.play().catch(() => {});
  if (!video.videoWidth) await new Promise((r) => video.addEventListener('loadedmetadata', r, { once: true }));
  body.classList.add('cam');
}
function stopCam() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null; video.srcObject = null; body.classList.remove('cam');
}
function viewMap() { // video px → screen px for object-fit:cover, plus focal length in screen px
  const vw = video.videoWidth, vh = video.videoHeight, W = innerWidth, H = innerHeight;
  const s = Math.max(W / vw, H / vh);
  return { s, ox: (W - vw * s) / 2, oy: (H - vh * s) / 2, f: 0.78 * Math.max(vw, vh) * s };
}

/* ---------- QR tracker ---------- */
let detector = null, worker = null, busy = false, lastSeen = 0, tracking = false, everFound = false;
const stats = { kind: '-', ms: 0, hz: 0, n: 0, t0: 0 };
let grab = null, gctx = null;
async function initTracker() {
  try {
    if ('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
      detector = new BarcodeDetector({ formats: ['qr_code'] }); stats.kind = 'native'; return;
    }
  } catch (_) {}
  worker = new Worker('/tracker-worker.js'); stats.kind = 'jsQR worker';
  worker.onmessage = (e) => {
    const m = e.data; busy = false;
    if (m.noOffscreen) { bitmapPath = false; return; } // old Safari: fall back to main-thread pixels
    stats.ms = m.ms;
    onDetect(m.found ? m.corners.map(([x, y]) => [x / grabScale, y / grabScale]) : null);
  };
  bitmapPath = 'createImageBitmap' in window && 'OffscreenCanvas' in window;
  stats.kind = 'jsQR worker' + (bitmapPath ? ' (bitmap)' : '');
}
let bitmapPath = false, lastDetect = 0;
let grabScale = 1;
async function detectOnce() {
  if (busy || mode !== 'cam' || !video.videoWidth || document.hidden) return;
  const now = performance.now();
  if (now - lastDetect < 66) return; // ≤15 Hz: plenty for tracking, saves battery
  lastDetect = now; busy = true;
  if (detector) {
    const t0 = performance.now();
    try {
      const r = await detector.detect(video);
      stats.ms = performance.now() - t0;
      const q = r.find((c) => c.cornerPoints && c.cornerPoints.length === 4);
      onDetect(q ? q.cornerPoints.map((p) => [p.x, p.y]) : null);
    } catch (_) { onDetect(null); }
    busy = false;
  } else {
    // downscale: long side 640px (480 lite) is enough to read a table code
    const vw = video.videoWidth, vh = video.videoHeight;
    grabScale = Math.min(1, (LITE ? 480 : 640) / Math.max(vw, vh));
    const w = Math.round(vw * grabScale), h = Math.round(vh * grabScale);
    if (bitmapPath) { // GPU-side resize, zero-copy transfer: no pixel garbage on the main thread
      try {
        const bmp = await createImageBitmap(video, { resizeWidth: w, resizeHeight: h, resizeQuality: 'low' });
        worker.postMessage({ bmp, width: w, height: h }, [bmp]); return;
      } catch (_) { bitmapPath = false; }
    }
    if (!grab) { grab = document.createElement('canvas'); gctx = grab.getContext('2d', { willReadFrequently: true }); }
    if (grab.width !== w) { grab.width = w; grab.height = h; }
    gctx.drawImage(video, 0, 0, w, h);
    const img = gctx.getImageData(0, 0, w, h);
    worker.postMessage({ data: img.data.buffer, width: w, height: h }, [img.data.buffer]);
  }
}
function scheduleDetect() {
  if (mode !== 'cam' || document.hidden) return;
  const next = () => { detectOnce(); scheduleDetect(); };
  if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(next); else requestAnimationFrame(next);
}
function onDetect(corners) {
  const now = performance.now();
  stats.n++; if (now - stats.t0 > 1000) { stats.hz = stats.n; stats.n = 0; stats.t0 = now; }
  if (!corners) return;
  const v = viewMap();
  const sc = corners.map(([x, y]) => [x * v.s + v.ox, y * v.s + v.oy]);
  if (!tracking && now - lastSeen > 400) { filt.forEach((f) => f.reset()); shown = null; }
  target = sc.map((p, i) => [filt[i * 2].f(p[0], now), filt[i * 2 + 1].f(p[1], now)]);
  lastSeen = now;
  if (!tracking) gained();
  kick();
}
function gained() {
  tracking = true;
  body.classList.remove('searching'); body.classList.add('tracking', 'ready3d');
  anchor.classList.remove('lost');
  anchor.classList.remove('found'); void anchor.offsetWidth; anchor.classList.add('found');
  if (!everFound) { everFound = true; anchor.classList.add('on'); buzz([15, 40, 15]); toast('Table code found — bon appétit'); }
  else buzz(10);
}
function lostIt() {
  tracking = false;
  body.classList.remove('tracking'); body.classList.add('searching');
  anchor.classList.add('lost');
  $('#guideTxt').textContent = 'Find the code on your table';
}

/* ---------- demo mode: a virtual code on a virtual table ---------- */
function demoCorners(t) {
  const W = innerWidth, H = innerHeight, f = 0.9 * Math.max(W, H);
  const th = (-56 + 6 * Math.sin(t / 3700)) * Math.PI / 180, ps = (22 * Math.sin(t / 2600)) * Math.PI / 180;
  const D = f / (0.13 * W), ty = 0.55;
  return { f, c: OBJ.map(([X, Y]) => {
    const x1 = X * Math.cos(ps) - Y * Math.sin(ps), y1 = X * Math.sin(ps) + Y * Math.cos(ps); // Rz
    const y2 = y1 * Math.cos(th), z2 = y1 * Math.sin(th) + D;                                   // Rx + depth
    return [W / 2 + f * x1 / z2, H / 2 + f * (y2 + ty) / z2];
  }) };
}

/* ---------- render loop (sleeps when nothing to draw) ---------- */
const stage = $('#stage'), label = $('#label');
let raf = 0, lastF = 0;
function kick() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
function frame(t) {
  raf = 0;
  let f, c;
  if (mode === 'demo') { const d = demoCorners(t); f = d.f; c = d.c; }
  else {
    if (tracking && t - lastSeen > 650) lostIt();
    if (!target) return;
    const v = viewMap(); f = v.f;
    if (!shown) shown = target.map((p) => p.slice());
    for (let i = 0; i < 4; i++) { shown[i][0] += (target[i][0] - shown[i][0]) * 0.6; shown[i][1] += (target[i][1] - shown[i][1]) * 0.6; }
    c = shown;
  }
  if (Math.abs(f - lastF) > 0.5) { stage.style.perspective = f + 'px'; lastF = f; }
  const P = poseFrom(c, f, innerWidth / 2, innerHeight / 2);
  if (P) {
    applyPose(P, f);
    const [lx, ly] = project(0, 0, -(topZ + 46));
    label.style.transform = `translate(${lx.toFixed(1)}px,${ly.toFixed(1)}px) translate(-50%,-50%)`;
  }
  if (mode === 'demo' || tracking) kick();
}

/* ---------- interaction: drag turns the dish, tap shows layers ---------- */
let rot = 0, dragging = false, lastX = 0, moved = 0;
stage.addEventListener('pointerdown', (e) => { dragging = true; moved = 0; lastX = e.clientX; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
  rot += dx * 0.6; turn.style.transform = `rotateZ(${rot}deg)`;
});
const up = () => { if (dragging && moved < 8) setExploded(!dishEl.classList.contains('exploded')); dragging = false; };
stage.addEventListener('pointerup', up);
stage.addEventListener('pointercancel', () => (dragging = false));
let sx = 0; // swipe on the info card = next / previous dish
$('.info').addEventListener('pointerdown', (e) => (sx = e.clientX));
$('.info').addEventListener('pointerup', (e) => { const d = e.clientX - sx; if (Math.abs(d) > 50) setDish(cur + (d < 0 ? 1 : -1)); });
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') setDish(cur + 1);
  if (e.key === 'ArrowLeft') setDish(cur - 1);
  if (e.key === 'Escape') closeCart();
});
function setExploded(on) {
  dishEl.classList.toggle('exploded', on);
  body.classList.toggle('exploded-on', on);
  $('#explode').setAttribute('aria-pressed', on);
  if (on) buzz(10);
}
$('#explode').onclick = () => setExploded(!dishEl.classList.contains('exploded'));

/* ---------- start ---------- */
async function start(useCam) {
  $('#splash').classList.add('gone');
  body.classList.add('live');
  if (useCam) {
    try {
      await startCam();
      await initTracker();
      mode = 'cam'; body.classList.add('searching');
      $('#guideTxt').textContent = 'Point at the code on your table';
      scheduleDetect(); kick();
      return;
    } catch (_) { stopCam(); toast('Camera unavailable — showing demo'); }
  }
  mode = 'demo';
  body.classList.add('demo-mode', 'ready3d', 'tracking');
  anchor.classList.add('on');
  kick();
}
$('#start').onclick = () => start(true);
$('#nocam').onclick = () => start(false);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopCam(); cancelAnimationFrame(raf); raf = 0; }
  else if (mode === 'cam') startCam().then(() => { scheduleDetect(); kick(); }).catch(() => {});
  else kick();
});

/* ---------- cart ---------- */
const cart = new Map(), cartSheet = $('#cartSheet');
function renderCart() {
  let n = 0, tot = 0;
  cart.forEach((q, i) => { n += q; tot += q * DISHES[i].price; });
  $('#cartCount').textContent = n; $('#total').textContent = naira(tot);
  $('#lines').innerHTML = cart.size ? [...cart].map(([i, q]) =>
    `<li><span class="sw" style="background:${DISHES[i].sw}"></span><div class="n">${DISHES[i].name}<small>${naira(DISHES[i].price)}</small></div>` +
    `<div class="q"><button data-d="${i}" aria-label="One less">−</button>${q}<button data-u="${i}" aria-label="One more">+</button></div></li>`).join('')
    : '<li class="empty">Nothing yet. Add a dish from the table.</li>';
  $('#send').disabled = !cart.size;
}
$('#lines').onclick = (e) => {
  const u = e.target.dataset.u, d = e.target.dataset.d;
  if (u != null) cart.set(+u, cart.get(+u) + 1);
  if (d != null) { const q = cart.get(+d) - 1; q ? cart.set(+d, q) : cart.delete(+d); }
  renderCart();
};
function closeCart() { cartSheet.classList.remove('open'); body.classList.remove('sheet-open'); }
$('#cartBtn').onclick = () => { if (cartSheet.classList.contains('open')) return closeCart(); renderCart(); cartSheet.classList.add('open'); body.classList.add('sheet-open'); };
$('#cartClose').onclick = closeCart;
$('#add').onclick = (e) => {
  cart.set(cur, (cart.get(cur) || 0) + 1);
  const r = e.currentTarget.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top, LITE ? 18 : 44);
  flyToCart(r.left + r.width / 2, r.top + r.height / 2);
  buzz([12, 40, 12]);
};
$('#send').onclick = () => { cart.clear(); renderCart(); closeCart(); burst(innerWidth / 2, innerHeight * 0.45, LITE ? 30 : 90); toast('Order sent to the kitchen (demo)'); };
function flyToCart(x, y) {
  const c = $('#cartBtn').getBoundingClientRect(), x1 = c.left + c.width / 2, y1 = c.top + c.height / 2;
  const o = el('div', 'orb'); body.append(o);
  o.animate([
    { transform: `translate(${x}px,${y}px) scale(1)` },
    { transform: `translate(${(x + x1) / 2}px,${Math.min(y, y1) - 90}px) scale(1.6)`, offset: 0.45 },
    { transform: `translate(${x1}px,${y1}px) scale(.4)`, opacity: 0.7 },
  ], { duration: 700, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => {
    o.remove(); renderCart();
    const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  };
}

/* ---------- confetti: canvas has 0×0 pixels except during a burst ---------- */
const fx = $('#fx'), ctx = fx.getContext('2d');
let parts = [], fxRaf = 0;
const COLORS = ['#f2a33a', '#e2552f', '#8ff5cf', '#f4ecdf', '#7fd06b'];
function burst(x, y, n) {
  if (reduce) return;
  const dpr = Math.min(devicePixelRatio || 1, LITE ? 1 : 2);
  if (!fx.width) { fx.width = innerWidth * dpr; fx.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 4 + Math.random() * 8;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.4,
      w: 4 + Math.random() * 5, h: 2 + Math.random() * 4, c: COLORS[i % 5], life: 1, round: Math.random() < 0.35 });
  }
  if (!fxRaf) fxRaf = requestAnimationFrame(tickFx);
}
function tickFx() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.012;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6)); ctx.fillStyle = p.c;
    if (p.round) { ctx.beginPath(); ctx.arc(p.x, p.y, p.w / 2, 0, 6.283); ctx.fill(); }
    else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
  }
  if (parts.length) fxRaf = requestAnimationFrame(tickFx); else { fxRaf = 0; fx.width = fx.height = 0; }
}

let toastT = 0;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }

/* ---------- perf HUD ---------- */
const hud = $('#hud');
let hudOn = false, frames = 0, fpsT = 0, hudRaf = 0;
function loadStats() {
  const nav = performance.getEntriesByType('navigation')[0] || {}, res = performance.getEntriesByType('resource');
  const sum = (k) => [nav, ...res].reduce((s, r) => s + (r[k] || 0), 0);
  return { ttfb: nav.responseStart | 0, dcl: nav.domContentLoadedEventEnd | 0, load: nav.loadEventEnd | 0, kb: sum('transferSize') / 1024, raw: sum('decodedBodySize') / 1024 };
}
function hudTick(t) {
  frames++;
  if (t - fpsT >= 500) {
    const fps = Math.round(frames * 1000 / (t - fpsT)); frames = 0; fpsT = t;
    const s = loadStats(), m = performance.memory;
    hud.textContent =
      `FPS        ${fps}\n` +
      `JS heap    ${m ? (m.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : 'n/a (Safari)'}\n` +
      `DOM nodes  ${document.getElementsByTagName('*').length}\n` +
      `Tracker    ${mode === 'demo' ? 'demo' : stats.kind} · ${tracking ? 'LOCKED' : 'searching'}\n` +
      `Detect     ${stats.ms.toFixed(1)} ms · ${stats.hz} Hz\n` +
      `Camera     ${video.videoWidth ? video.videoWidth + '×' + video.videoHeight : 'off'}\n` +
      `Loaded     ${s.load} ms (TTFB ${s.ttfb})\n` +
      `Transfer   ${s.kb.toFixed(1)} KB (${s.raw.toFixed(0)} KB raw)\n` +
      `Mode       ${LITE ? 'lite' : 'full'} · ${mem} GB RAM hint`;
  }
  if (hudOn) hudRaf = requestAnimationFrame(hudTick);
}
function toggleHud(on) { hudOn = on; hud.classList.toggle('on', on); if (on) { fpsT = performance.now(); frames = 0; hudRaf = requestAnimationFrame(hudTick); } else cancelAnimationFrame(hudRaf); }
$('#perfBtn').onclick = () => toggleHud(!hudOn);
if (qs.has('debug')) toggleHud(true);

/* ---------- boot ---------- */
buildDish(0); fillInfo(); renderCart();
addEventListener('resize', kick, { passive: true });
addEventListener('load', () => {
  setTimeout(() => { const s = loadStats(); $('#ready').textContent = `Ready in ${s.load || s.dcl} ms · ${s.kb.toFixed(1)} KB${LITE ? ' · lite' : ''}`; }, 0);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('/sw.js').catch(() => {});
});
if (qs.has('demo')) start(false);
})();
