/* QR tracker for browsers without BarcodeDetector (iOS Safari, Firefox).
 * Preferred input: an ImageBitmap (resized on the GPU, transferred zero-copy);
 * fallback input: a raw RGBA buffer. Returns the 4 corners of the QR code. */
importScripts('/vendor/jsqr.min.js');
let oc = null, octx = null;
self.onmessage = (e) => {
  const { bmp, data, width, height } = e.data;
  let px;
  if (bmp) {
    if (!('OffscreenCanvas' in self)) { bmp.close(); self.postMessage({ noOffscreen: true }); return; }
    if (!oc || oc.width !== width || oc.height !== height) { oc = new OffscreenCanvas(width, height); octx = oc.getContext('2d', { willReadFrequently: true }); }
    octx.drawImage(bmp, 0, 0); bmp.close();
    px = octx.getImageData(0, 0, width, height).data;
  } else px = new Uint8ClampedArray(data);
  const t0 = performance.now();
  const r = self.jsQR(px, width, height, { inversionAttempts: 'dontInvert' });
  const ms = performance.now() - t0;
  if (!r) { self.postMessage({ ms, found: false }); return; }
  const L = r.location;
  self.postMessage({ ms, found: true, corners: [L.topLeftCorner, L.topRightCorner, L.bottomRightCorner, L.bottomLeftCorner].map((p) => [p.x, p.y]) });
};
