// Usage: npm run qr -- https://your-site.pages.dev
// Writes public/qr.svg and public/qr.png pointing at the URL.
import QRCode from 'qrcode';
import { writeFile } from 'node:fs/promises';
const url = process.argv[2];
if (!url) { console.error("Usage: npm run qr -- https://your-live-url"); process.exit(1); }
const opts = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#0c0a08', light: '#ffffff' } };
await writeFile('public/qr.svg', await QRCode.toString(url, { ...opts, type: 'svg' }));
await QRCode.toFile('public/qr.png', url, { ...opts, width: 1024 });
console.log('QR ->', url);
