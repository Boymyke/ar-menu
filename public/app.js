/* LUMA AR menu — zero dependencies.
 * Rendering: CSS 3D transforms only (compositor-friendly), dishes are gradient layers, no images.
 * "AR": rear camera passthrough + device-orientation anchoring (dishes stay put as you pan the phone).
 * Budget: one rAF loop that sleeps when nothing moves; camera + loops stop when the tab is hidden.
 */
(() => {
'use strict';

/* ---------- device tier ---------- */
const qs = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mem = navigator.deviceMemory || 8;
const LITE = !qs.has('full') && (qs.has('lite') || reduce || mem <= 2);
document.documentElement.classList.toggle('lite', LITE);

/* ---------- tiny helpers ---------- */
const $ = (s) => document.querySelector(s);
const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const naira = (n) => '₦' + n.toLocaleString('en-NG');
const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} };

/* gradient builders */
const spot = (pts, c) => pts.map(([x, y, r]) =>
  `radial-gradient(circle ${r}px at ${x}% ${y}%,${c[0]} 0,${c[1]} 55%,${c[2]} 90%,transparent 100%)`).join(',');
const ring = (a, b, c) => `radial-gradient(circle closest-side,transparent ${a}%,${c} ${a + 1}% ${b}%,transparent ${b + 1}%)`;
const PLATE = 'radial-gradient(circle closest-side,#fbfaf6 0 54%,#e6e1d6 56% 60%,#fdfcf9 62% 86%,#cfc8bb 89% 92%,rgba(94,242,255,.6) 94% 96%,transparent 97%)';
const BALL = ['#ffd88a', '#e0912f', '#9a5216'];
const GREEN = ['#8fe07a', '#3d9a3f', '#1d5a22'];
const RED = ['#ff8a6b', '#e0362a', '#8a1a14'];
const around = (n, rad, r, off = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2 + off; return [50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad, r];
});

/* ---------- menu ---------- */
const DISHES = [
  { id: 'jollof', name: 'Smoky Party Jollof', price: 4500, kcal: 640, prep: '12 min', heat: 2, hot: true,
    desc: 'Firewood-smoked tomato rice, peppered chicken, sweet dodo.',
    tags: ['Bestseller', 'Smoky', 'Gluten-free'],
    layers: [
      { w: 170, z: 0, bg: PLATE, css: 'box-shadow:0 0 60px rgba(94,242,255,.18)' },
      { w: 112, h: 104, x: -6, y: 4, z: 6, r: '47% 53% 50% 50%/52% 46% 54% 48%',
        bg: '' + spot([[22,40,2],[35,62,2],[48,30,2],[60,55,2],[72,38,2],[40,78,2],[66,72,2],[28,25,2],[80,58,2],[52,48,2]], ['rgba(255,226,180,.9)','rgba(255,200,150,.5)','rgba(255,200,150,0)']) + ',radial-gradient(circle at 45% 40%,#f0702a,#d2481c 55%,#a8321a)' },
      { w: 96, x: -28, y: 26, z: 12, r: '0', bg: spot([[25, 50, 13], [55, 35, 13], [78, 62, 12]], ['#ffd56b', '#f2a93b', '#b8621c']) },
      { w: 58, h: 42, x: 26, y: -14, z: 17, r: '62% 38% 56% 44%/50% 60% 40% 50%', bg: 'radial-gradient(circle at 35% 35%,#f0b06a,#b5602a 50%,#6b3214)' },
      { w: 110, z: 22, r: '0', bg: spot([[30, 30, 3], [60, 62, 3], [40, 72, 2.5], [72, 32, 2.5], [50, 45, 2]], GREEN) },
    ] },
  { id: 'suya', name: 'Yaji Beef Suya', price: 3800, kcal: 520, prep: '10 min', heat: 3, hot: true,
    desc: 'Charcoal-grilled skewers rubbed in house yaji, onions, tomato.',
    tags: ['Spicy', 'Grill', 'High protein'],
    layers: [
      { w: 190, h: 116, z: 0, r: '20px', css: 'box-shadow:0 0 50px rgba(255,181,71,.2)',
        bg: 'linear-gradient(90deg,rgba(0,0,0,.2),transparent 18%,transparent 82%,rgba(0,0,0,.2)),repeating-linear-gradient(90deg,#9a6a3c 0 10px,#8a5c33 10px 21px,#a37444 21px 26px)' },
      { w: 180, h: 6, y: -18, z: 9, r: '3px', bg: '#dcb987' },
      { w: 180, h: 6, y: 18, z: 9, r: '3px', bg: '#dcb987' },
      { w: 160, h: 80, z: 13, r: '0', bg: spot([15, 32, 49, 66, 83].flatMap((x) => [[x, 27, 12], [x, 73, 12]]), ['#b4602e', '#6e2a12', '#3e160a']) },
      { w: 160, h: 80, z: 15, r: '0', bg: spot([12, 29, 46, 63, 80].flatMap((x) => [[x + 4, 22, 2], [x + 7, 70, 2]]), ['#ffb36b', '#e2622a', '#a8401a']) },
      { w: 160, h: 112, z: 18, r: '0', bg: spot([[8, 14, 9], [92, 86, 9]], RED) },
      { w: 160, h: 112, z: 21, r: '0', bg: [[18, 86], [80, 12], [50, 92]].map(([x, y]) =>
        `radial-gradient(circle 11px at ${x}% ${y}%,transparent 0 50%,#f6e8f2 56% 72%,#b778a8 78% 92%,transparent 100%)`).join(',') },
    ] },
  { id: 'pepper', name: 'Goat Pepper Soup', price: 5200, kcal: 410, prep: '15 min', heat: 3, hot: true,
    desc: 'Slow-simmered goat in a fiery calabash-nutmeg broth, scent leaf.',
    tags: ['Hot', 'Light', 'Chef’s pick'],
    layers: [
      { w: 112, z: 0, bg: 'radial-gradient(circle closest-side,#2b211d,#1a1311 95%,transparent)', css: 'box-shadow:0 0 50px rgba(255,90,54,.25)' },
      { w: 132, z: 8, bg: ring(78, 98, '#2d221e') },
      { w: 150, z: 16, bg: ring(82, 98, '#33271f') },
      { w: 140, z: 20, bg: 'radial-gradient(circle at 40% 38%,#f2b45a,#c46b1f 55%,#8a3f12 95%,transparent 98%)' },
      { w: 164, z: 25, bg: ring(92, 98, 'rgba(94,242,255,.7)') + ',' + ring(85, 98, '#3d2f26') },
      { w: 120, z: 24, r: '0', bg: spot([[30, 40, 14], [62, 30, 12], [55, 68, 15], [78, 58, 10]], ['#b9835c', '#7a4a2c', '#4a2a17']) },
      { w: 120, z: 28, r: '0', bg: spot([[40, 58, 6], [70, 42, 5], [25, 30, 5], [50, 20, 4]], GREEN) + ',' + spot([[66, 76, 4], [33, 72, 4]], RED) },
    ] },
  { id: 'egusi', name: 'Pounded Yam & Egusi', price: 6000, kcal: 820, prep: '18 min', heat: 1, hot: true,
    desc: 'Hand-pounded yam, melon-seed soup with spinach and assorted meat.',
    tags: ['Hearty', 'Classic'],
    layers: [
      { w: 176, z: 0, bg: PLATE, css: 'box-shadow:0 0 60px rgba(94,242,255,.16)' },
      { w: 94, x: -28, y: 6, z: 6, r: '50% 46% 52% 48%',
        bg: '' + spot([[25,35,4],[45,22,3],[62,40,4],[38,60,3],[70,66,4],[52,78,3],[30,74,3]], GREEN) + ',radial-gradient(circle at 40% 40%,#e8c34a,#c49a1e 60%,#8f6a10)' },
      { w: 72, x: -28, y: 6, z: 11, r: '0', bg: spot([[30, 40, 10], [66, 62, 9]], ['#c8834f', '#8a4a22', '#4e2510']) },
      { w: 66, x: 36, y: -8, z: 6, bg: 'radial-gradient(circle at 42% 38%,#fffdf6,#f1e8d2 65%,#d8caa8)' },
      { w: 56, x: 36, y: -8, z: 15, bg: 'radial-gradient(circle at 42% 38%,#fffdf6,#f1e8d2 65%,#d8caa8)' },
      { w: 42, x: 36, y: -8, z: 23, bg: 'radial-gradient(circle at 42% 38%,#fffdf6,#f1e8d2 65%,#d8caa8)' },
      { w: 22, x: 36, y: -8, z: 28, bg: 'radial-gradient(circle at 42% 38%,#fffdf6,#efe6cf)' },
    ] },
  { id: 'puff', name: 'Puff-Puff Tower', price: 2000, kcal: 380, prep: '6 min', heat: 0, hot: true,
    desc: 'Warm nutmeg dough balls, dusted in sugar. Built for sharing.',
    tags: ['Sweet', 'Share', 'Vegan'],
    layers: [
      { w: 156, z: 0, bg: PLATE, css: 'box-shadow:0 0 60px rgba(255,181,71,.2)' },
      { w: 124, z: 10, r: '0', bg: spot(around(6, 32, 18), BALL) },
      { w: 84, z: 25, r: '0', bg: spot(around(3, 24, 17, 0.5), BALL) },
      { w: 44, z: 38, r: '0', bg: spot([[50, 50, 16]], BALL) },
      { w: 120, z: 48, r: '0', bg: spot([[30, 40, 2], [62, 34, 1.5], [44, 62, 2], [70, 60, 1.5], [52, 48, 1.5], [36, 56, 1.5]], ['#fff', '#fffaf0', 'rgba(255,255,255,.4)']) },
    ] },
  { id: 'chapman', name: 'Chapman Fizz', price: 2500, kcal: 190, prep: '3 min', heat: 0, hot: false,
    desc: 'Lagos’ iconic mocktail: citrus, grenadine, cucumber, lots of ice.',
    tags: ['Iced', 'Mocktail', 'Zero alcohol'],
    layers: [
      { w: 112, z: 0, bg: 'radial-gradient(circle closest-side,#1b1b26 0 80%,rgba(94,242,255,.65) 84% 88%,transparent 90%)' },
      ...Array.from({ length: 7 }, (_, i) => ({ w: 80, z: 6 + i * 10,
        bg: `radial-gradient(circle at 40% 38%,rgba(255,${170 - i * 12},${90 - i * 6},.92),rgba(${196 + i * 7},${36 + i * 8},44,.86) 70%,rgba(255,255,255,.6) 91%,transparent 95%)` })),
      { w: 64, z: 72, r: '0', bg: spot([[34, 38, 10], [64, 58, 9]], ['rgba(255,255,255,.85)', 'rgba(200,240,255,.6)', 'rgba(160,220,255,.3)']) },
      { w: 34, x: 20, y: -10, z: 74, bg: 'radial-gradient(circle closest-side,#eefbd8 0 52%,#9bd06a 56% 74%,#2f6b2a 78% 98%,transparent)' },
      { up: true, w: 6, h: 120, x: -12, z: 100, r: '3px', rz: '10deg', bg: 'repeating-linear-gradient(180deg,#fff 0 8px,#ff4d5a 8px 16px)' },
    ] },
];
const N = DISHES.length;
const STEP = 360 / N;

/* ---------- build scene ---------- */
const world = $('#world');
const slots = DISHES.map((d, i) => {
  const slot = el('div', 'slot');
  slot.style.transform = `rotateY(${i * STEP}deg) translateZ(var(--R))`;
  slot.dataset.i = i;
  const reticle = el('div', 'reticle');
  const sweep = el('div', 'sweep');
  const dish = el('div', 'dish');
  dish.style.animationDelay = `${-i * 3.7}s`;
  let top = 0;
  d.layers.forEach((L, k) => {
    const w = L.w, h = L.h || L.w, l = el('div', L.up ? 'layer up' : 'layer');
    l.style.cssText = `width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;background:${L.bg};` +
      `border-radius:${L.r || '50%'};--x:${L.x || 0};--y:${L.y || 0};--z:${L.z || 0};--i:${k};--d:${k * 80}ms;` +
      (L.rz ? `--rz:${L.rz};` : '') + (LITE ? '' : (L.css || ''));
    top = Math.max(top, (L.z || 0) + (L.up ? h / 2 : 0));
    dish.append(l);
  });
  const tag = el('div', 'tagf');
  tag.style.setProperty('--th', top + 64);
  tag.innerHTML = `${d.name}<b>${naira(d.price)}</b>`;
  slot.append(reticle, sweep, dish, tag);
  if (d.hot && !LITE) {
    const s = el('div', 'steam'); s.style.transform = `translateY(${-(top + 30)}px)`;
    s.innerHTML = '<i></i><i></i><i></i>'; slot.append(s);
  }
  world.append(slot);
  return { slot, dish };
});
const dotsEl = $('#dots');
dotsEl.innerHTML = '<i></i>'.repeat(N);

/* ---------- state ---------- */
let R = 220;
let angle = 0, vel = 0, goal = null, dragging = false;
let front = -1, raf = 0, arOn = false;
const tgt = { tx: 0, ty: 0, rx: -24, lift: 0 };
const cur = { tx: 0, ty: 0, rx: -24, lift: 0 };
const vis = new Array(N).fill(true);

function layout() {
  R = clamp(Math.round(innerWidth * 0.5), 190, 300);
  world.style.setProperty('--R', R + 'px');
  kick();
}
addEventListener('resize', layout, { passive: true });
layout();

/* ---------- render loop (sleeps when idle) ---------- */
function frame() {
  raf = 0;
  let busy = dragging;
  if (!dragging) {
    if (goal !== null) {
      const d = goal - angle; angle += d * 0.16;
      if (Math.abs(d) < 0.05) { angle = goal; goal = null; } else busy = true;
    } else if (Math.abs(vel) > 0.08) {
      angle += vel; vel *= 0.93; busy = true;
    } else {
      vel = 0;
      const snap = Math.round(angle / STEP) * STEP, d = snap - angle;
      if (Math.abs(d) > 0.05) { angle += d * 0.2; busy = true; } else angle = snap;
    }
  }
  for (const k in tgt) {
    const d = tgt[k] - cur[k];
    if (Math.abs(d) > 0.02) { cur[k] += d * 0.18; busy = true; } else cur[k] = tgt[k];
  }
  world.style.transform =
    `translate3d(${cur.tx.toFixed(1)}px,${(cur.ty + cur.lift).toFixed(1)}px,${-R}px) rotateX(${cur.rx.toFixed(2)}deg) rotateY(${angle.toFixed(2)}deg)`;
  updateFront();
  if (busy) kick();
}
function kick() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }

function updateFront() {
  const f = mod(Math.round(-angle / STEP), N);
  for (let i = 0; i < N; i++) { // cull dishes facing away: halves GPU layers
    const rel = mod(i * STEP + angle + 180, 360) - 180;
    const show = Math.abs(rel) < 100;
    if (show !== vis[i]) { vis[i] = show; slots[i].slot.classList.toggle('hide', !show); }
  }
  if (f === front) return;
  if (front >= 0) slots[front].slot.classList.remove('front');
  front = f;
  slots[f].slot.classList.add('front');
  const d = DISHES[f];
  const nm = $('#capName');
  nm.textContent = d.name; nm.classList.remove('swap'); void nm.offsetWidth; nm.classList.add('swap');
  $('#capPrice').textContent = naira(d.price);
  [...dotsEl.children].forEach((x, i) => x.classList.toggle('on', i === f));
  if (arOn) buzz(6);
  if ($('#sheet').classList.contains('open')) fillSheet();
}
function goTo(i) {
  // shortest path to dish i
  const base = -i * STEP;
  goal = base + Math.round((angle - base) / 360) * 360;
  vel = 0; kick();
}

/* ---------- touch / drag ---------- */
const scene = $('#scene');
let lastX = 0, moved = 0, downT = 0;
scene.addEventListener('pointerdown', (e) => {
  dragging = true; moved = 0; lastX = e.clientX; downT = e.timeStamp; vel = 0; goal = null;
  scene.setPointerCapture(e.pointerId); kick();
});
scene.addEventListener('pointermove', (e) => {
  if (!dragging) {
    if (!gyro && e.pointerType === 'mouse') { // desktop parallax stand-in for the gyro
      tgt.tx = (e.clientX / innerWidth - 0.5) * -40;
      tgt.rx = -24 + (e.clientY / innerHeight - 0.5) * 10; kick();
    }
    return;
  }
  const dx = e.clientX - lastX; lastX = e.clientX;
  moved += Math.abs(dx);
  angle += dx * 0.3; vel = vel * 0.5 + dx * 0.15; kick();
  if (moved > 30) $('#hint').classList.add('gone');
});
const endDrag = (e) => {
  if (!dragging) return;
  dragging = false; kick();
  if (moved < 8 && e.timeStamp - downT < 500) {
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const s = hit && hit.closest('.slot');
    if (s) { const i = +s.dataset.i; i === front ? openSheet() : goTo(i); }
  }
};
scene.addEventListener('pointerup', endDrag);
scene.addEventListener('pointercancel', endDrag);
$('#prev').onclick = () => goTo(front - 1);
$('#next').onclick = () => goTo(front + 1);
$('#viewBtn').onclick = () => openSheet();
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') goTo(front - 1);
  else if (e.key === 'ArrowRight') goTo(front + 1);
  else if (e.key === 'Escape') closeSheets();
});

/* ---------- gyro anchoring: dishes stay where they are as you move the phone ---------- */
let gyro = false, base = null;
const off = $('#off');
function onOri(e) {
  if (e.alpha == null || e.beta == null) return;
  gyro = true;
  if (!base) base = { a: e.alpha, b: e.beta };
  const da = clamp(mod(e.alpha - base.a + 180, 360) - 180, -70, 70);
  const db = clamp(e.beta - base.b, -45, 45);
  const f = innerWidth * 0.82; // ≈ focal length for a ~62° phone camera FOV
  tgt.tx = Math.tan(da * Math.PI / 180) * f;
  tgt.ty = Math.tan(db * Math.PI / 180) * f * 0.9;
  tgt.rx = clamp(-24 + db * 0.35, -55, -6);
  const away = Math.abs(tgt.tx) > innerWidth * 0.62;
  off.classList.toggle('on', away && arOn);
  off.classList.toggle('left', tgt.tx < 0);
  kick();
}
async function enableGyro() {
  try {
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') { // iOS 13+
      if ((await DOE.requestPermission()) !== 'granted') return;
    }
    addEventListener('deviceorientation', onOri, { passive: true });
  } catch (_) {}
}
$('#recenter').onclick = () => { base = null; tgt.tx = tgt.ty = 0; tgt.rx = -24; goTo(front); toast('Recentered'); };

/* ---------- camera ---------- */
const video = $('#cam');
let stream = null, wantCam = false;
async function startCam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no-cam');
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: LITE ? 640 : 1280 }, height: { ideal: LITE ? 480 : 720 }, frameRate: { ideal: 30, max: 30 } },
  });
  video.srcObject = stream;
  await video.play().catch(() => {});
  document.body.classList.add('cam');
}
function stopCam() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null; video.srcObject = null;
  document.body.classList.remove('cam');
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopCam(); if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  else { if (wantCam) startCam().catch(() => {}); kick(); }
});

/* ---------- start flow ---------- */
async function start(withCam) {
  const b = document.body;
  $('#splash').classList.add('gone');
  b.classList.add('ar');
  enableGyro(); // must run inside the tap for iOS permission prompt
  wantCam = withCam;
  if (withCam) {
    try { await startCam(); } catch (_) { wantCam = false; toast('Camera unavailable — showing 3D view'); }
  }
  arOn = true;
  b.classList.add('scanning');
  const txt = $('#scanTxt');
  txt.textContent = withCam && wantCam ? 'Scanning your table…' : 'Setting the table…';
  await wait(LITE ? 700 : 1300);
  txt.textContent = 'Table found ✓'; buzz(15);
  await wait(400);
  b.classList.remove('scanning'); b.classList.add('placed');
  // materialise front dish first, then neighbours
  slots.forEach((s, i) => {
    const dist = Math.min(mod(i - front, N), mod(front - i, N));
    s.slot.style.setProperty('--dd', dist * 220 + 'ms');
  });
  world.classList.add('live');
  // after the intro, any dish that rotates into view re-materialises instantly
  setTimeout(() => slots.forEach((s) => s.slot.style.setProperty('--dd', '0ms')), 2000);
  setTimeout(() => $('#hint').classList.add('gone'), 7000);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
$('#start').onclick = () => start(true);
$('#nocam').onclick = () => start(false);

/* ---------- dish sheet ---------- */
const sheet = $('#sheet'), cartSheet = $('#cartSheet');
function fillSheet() {
  const d = DISHES[front];
  $('#sName').textContent = d.name;
  $('#sDesc').textContent = d.desc;
  $('#sKcal').textContent = d.kcal + ' kcal';
  $('#sPrep').textContent = d.prep;
  $('#sHeat').innerHTML = [0, 1, 2].map((i) => `<i class="${i < d.heat ? 'on' : ''}"></i>`).join('');
  $('#sTags').innerHTML = d.tags.map((t) => `<span>${t}</span>`).join('');
  $('#sPrice').textContent = naira(d.price);
  const ex = slots[front].dish.classList.contains('exploded');
  $('#explode').setAttribute('aria-pressed', ex);
}
function openSheet() {
  closeSheets(true);
  fillSheet();
  sheet.classList.add('open');
  document.body.classList.add('sheet-open');
  tgt.lift = -Math.round(innerHeight * 0.17); kick();
}
function closeSheets(keep) {
  [sheet, cartSheet].forEach((s) => s.classList.remove('open'));
  if (keep === true) return;
  document.body.classList.remove('sheet-open');
  slots.forEach((s) => s.dish.classList.remove('exploded'));
  tgt.lift = 0; kick();
}
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => closeSheets()));
$('#explode').onclick = () => {
  const on = slots[front].dish.classList.toggle('exploded');
  $('#explode').setAttribute('aria-pressed', on); buzz(10);
};

/* ---------- cart ---------- */
const cart = new Map();
function renderCart() {
  let count = 0, total = 0;
  cart.forEach((q, i) => { count += q; total += q * DISHES[i].price; });
  $('#cartCount').textContent = count;
  $('#total').textContent = naira(total);
  $('#lines').innerHTML = cart.size ? [...cart].map(([i, q]) =>
    `<li><div class="n">${DISHES[i].name}<small>${naira(DISHES[i].price)}</small></div>` +
    `<div class="q"><button data-d="${i}" aria-label="Remove one">−</button>${q}<button data-u="${i}" aria-label="Add one">+</button></div></li>`).join('')
    : '<li class="empty">Nothing yet — tap a dish to add it.</li>';
  $('#send').disabled = !cart.size;
}
$('#lines').onclick = (e) => {
  const u = e.target.dataset.u, d = e.target.dataset.d;
  if (u != null) cart.set(+u, cart.get(+u) + 1);
  if (d != null) { const q = cart.get(+d) - 1; q ? cart.set(+d, q) : cart.delete(+d); }
  renderCart();
};
$('#cartBtn').onclick = () => {
  const open = cartSheet.classList.contains('open');
  closeSheets(!open);
  if (!open) { renderCart(); cartSheet.classList.add('open'); document.body.classList.add('sheet-open'); }
};
$('#add').onclick = (e) => {
  cart.set(front, (cart.get(front) || 0) + 1);
  const r = e.currentTarget.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top, LITE ? 18 : 46);
  flyToCart(r.left + r.width / 2, r.top + r.height / 2);
  buzz([12, 40, 12]);
};
$('#send').onclick = () => {
  cart.clear(); renderCart(); closeSheets();
  burst(innerWidth / 2, innerHeight * 0.4, LITE ? 30 : 90);
  toast('Order sent to the kitchen 🔥 (demo)');
};
function flyToCart(x, y) {
  const c = $('#cartBtn').getBoundingClientRect();
  const x1 = c.left + c.width / 2, y1 = c.top + c.height / 2;
  const o = el('div', 'orb'); document.body.append(o);
  const a = o.animate([
    { transform: `translate(${x}px,${y}px) scale(1)` },
    { transform: `translate(${(x + x1) / 2}px,${Math.min(y, y1) - 90}px) scale(1.6)`, offset: 0.45 },
    { transform: `translate(${x1}px,${y1}px) scale(.4)`, opacity: 0.7 },
  ], { duration: 700, easing: 'cubic-bezier(.5,0,.3,1)' });
  a.onfinish = () => {
    o.remove(); renderCart();
    const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  };
}

/* ---------- particles: canvas only exists (has pixels) during a burst ---------- */
const fx = $('#fx'), ctx = fx.getContext('2d');
let parts = [], fxRaf = 0;
const COLORS = ['#ffb547', '#ff5a36', '#5ef2ff', '#fff2c2', '#7fd06b'];
function burst(x, y, n) {
  if (reduce) return;
  const dpr = Math.min(devicePixelRatio || 1, LITE ? 1 : 2); // cap: a 3x canvas costs 2.25x the memory of 2x
  if (!fx.width) { fx.width = innerWidth * dpr; fx.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 4 + Math.random() * 8;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
      w: 4 + Math.random() * 5, h: 2 + Math.random() * 4, c: COLORS[i % COLORS.length], life: 1, round: Math.random() < 0.35 });
  }
  if (!fxRaf) fxRaf = requestAnimationFrame(tickFx);
}
function tickFx() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.012;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
    ctx.fillStyle = p.c;
    if (p.round) { ctx.beginPath(); ctx.arc(p.x, p.y, p.w / 2, 0, 6.283); ctx.fill(); }
    else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
  }
  if (parts.length) fxRaf = requestAnimationFrame(tickFx);
  else { fxRaf = 0; fx.width = fx.height = 0; } // release the backing store
}

/* ---------- toast ---------- */
let toastT = 0;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- perf HUD (⚡ button or ?debug) ---------- */
const hud = $('#hud');
let hudOn = false, frames = 0, fpsT = 0, fps = 0, hudRaf = 0;
function loadStats() {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const res = performance.getEntriesByType('resource');
  const bytes = [nav, ...res].reduce((s, r) => s + (r.transferSize || 0), 0);
  const dec = [nav, ...res].reduce((s, r) => s + (r.decodedBodySize || 0), 0);
  return { ttfb: nav.responseStart | 0, dcl: nav.domContentLoadedEventEnd | 0, load: nav.loadEventEnd | 0, kb: bytes / 1024, dkb: dec / 1024 };
}
function hudTick(t) {
  frames++;
  if (t - fpsT >= 500) {
    fps = Math.round((frames * 1000) / (t - fpsT)); frames = 0; fpsT = t;
    const s = loadStats();
    const m = performance.memory;
    hud.textContent =
      `FPS        ${fps}\n` +
      `JS heap    ${m ? (m.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : 'n/a (Safari)'}\n` +
      `DOM nodes  ${document.getElementsByTagName('*').length}\n` +
      `3D layers  ${slots.reduce((n, s, i) => n + (vis[i] ? s.dish.children.length : 0), 0)} live\n` +
      `Camera     ${video.videoWidth ? video.videoWidth + '×' + video.videoHeight : 'off'}\n` +
      `TTFB       ${s.ttfb} ms\n` +
      `DOM ready  ${s.dcl} ms\n` +
      `Loaded     ${s.load} ms\n` +
      `Transfer   ${s.kb.toFixed(1)} KB (${s.dkb.toFixed(0)} KB raw)\n` +
      `Mode       ${LITE ? 'lite' : 'full'} · ${mem} GB RAM hint`;
  }
  if (hudOn) hudRaf = requestAnimationFrame(hudTick);
}
function toggleHud(on) {
  hudOn = on; hud.classList.toggle('on', on);
  if (on) { fpsT = performance.now(); frames = 0; hudRaf = requestAnimationFrame(hudTick); }
  else cancelAnimationFrame(hudRaf);
}
$('#perfBtn').onclick = () => toggleHud(!hudOn);
if (qs.has('debug')) toggleHud(true);

/* ---------- boot ---------- */
updateFront();
renderCart();
addEventListener('load', () => {
  setTimeout(() => {
    const s = loadStats();
    $('#ready').textContent = `Ready in ${s.load || s.dcl} ms · ${s.kb.toFixed(1)} KB${LITE ? ' · lite mode' : ''}`;
  }, 0);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
})();
