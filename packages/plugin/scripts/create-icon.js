// packages/plugin/scripts/create-icon.js
// Generates a valid 128x128 PNG icon and 1920x1080 cover for Figma Community.
// Uses only Node.js built-ins: fs, zlib, path.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// PNG signature (8 bytes)
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Build a PNG chunk: length(4) + type(4) + data + CRC(4)
function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const payload = Buffer.concat([t, data]);
  let crc = 0xFFFFFFFF;
  for (const b of payload) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
    }
  }
  crc = (~crc) >>> 0;
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc);
  return Buffer.concat([len, payload, crcBuf]);
}

function makePng(W, H, paintRow) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB (no alpha)

  // Raw scanlines: 1 filter byte (0 = None) + W*3 RGB bytes per row
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter byte: None
    for (let x = 0; x < W; x++) {
      const off = y * (1 + W * 3) + 1 + x * 3;
      const [r, g, b] = paintRow(x, y, W, H);
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

// --- icon.png: 128x128 ---
// Indigo background (#4F46E5) with centered white square representing icon detail
const iconPng = makePng(128, 128, (x, y, W, H) => {
  if (x >= 40 && x < 88 && y >= 40 && y < 88) {
    return [0xFF, 0xFF, 0xFF];
  }
  return [0x4F, 0x46, 0xE5];
});
const iconPath = path.join(outDir, 'icon.png');
fs.writeFileSync(iconPath, iconPng);
console.log('icon.png created at', iconPath, '—', iconPng.length, 'bytes');

// --- cover.png: 1920x1080 ---
// Indigo background (#4F46E5) with a centered lighter panel (#6366F1) for visual interest
const coverPng = makePng(1920, 1080, (x, y, W, H) => {
  const panelX1 = Math.floor(W * 0.2);
  const panelX2 = Math.floor(W * 0.8);
  const panelY1 = Math.floor(H * 0.2);
  const panelY2 = Math.floor(H * 0.8);
  if (x >= panelX1 && x < panelX2 && y >= panelY1 && y < panelY2) {
    return [0x63, 0x66, 0xF1];
  }
  return [0x4F, 0x46, 0xE5];
});
const coverPath = path.join(outDir, 'cover.png');
fs.writeFileSync(coverPath, coverPng);
console.log('cover.png created at', coverPath, '—', coverPng.length, 'bytes');
