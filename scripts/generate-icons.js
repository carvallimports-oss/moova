const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createIconPNG(size) {
  // Verde musgo background: #2D4A3E = rgb(45, 74, 62)
  const BG_R = 45, BG_G = 74, BG_B = 62;
  // Cobre accent: #B87333 = rgb(184, 115, 51)
  const ACC_R = 184, ACC_G = 115, ACC_B = 51;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; ihdrData[9] = 2; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  // Build pixel data with copper vertical bar (left-aligned, like the logo)
  const barWidth = Math.round(size * 0.07);   // ~7% width
  const barHeight = Math.round(size * 0.5);    // 50% height
  const barX = Math.round(size * 0.34);        // center-left position
  const barY = Math.round((size - barHeight) / 2);

  const rowLen = size * 3 + 1;
  const rawData = Buffer.allocUnsafe(rowLen * size);

  for (let y = 0; y < size; y++) {
    rawData[y * rowLen] = 0;
    for (let x = 0; x < size; x++) {
      const off = y * rowLen + 1 + x * 3;
      const inBar = x >= barX && x < barX + barWidth && y >= barY && y < barY + barHeight;
      rawData[off]     = inBar ? ACC_R : BG_R;
      rawData[off + 1] = inBar ? ACC_G : BG_G;
      rawData[off + 2] = inBar ? ACC_B : BG_B;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 6 });

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.join(__dirname, '..', 'public');

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createIconPNG(192));
console.log('✓ icon-192.png');

fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createIconPNG(512));
console.log('✓ icon-512.png');
