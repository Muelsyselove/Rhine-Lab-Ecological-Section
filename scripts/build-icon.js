// 图标构建 — assets/icon.svg → assets/icon.ico（多尺寸）与 assets/icon.png
// 用法：node scripts/build-icon.js
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const svgFile = path.join(root, 'assets', 'icon.svg');
const icoFile = path.join(root, 'assets', 'icon.ico');
const pngFile = path.join(root, 'assets', 'icon.png');

// Windows 常用尺寸（256 写入 0 表示，见 ICO 规范）
const SIZES = [256, 128, 64, 48, 32, 24, 16];

/** 将一组 PNG 打包为单个 ICO（Vista+ 支持 PNG 压缩条目） */
function packIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const blobs = [];
  entries.forEach((e, i) => {
    const b = i * 16;
    const dim = e.size >= 256 ? 0 : e.size;
    dir.writeUInt8(dim, b); // width
    dir.writeUInt8(dim, b + 1); // height
    dir.writeUInt8(0, b + 2); // palette
    dir.writeUInt8(0, b + 3); // reserved
    dir.writeUInt16LE(1, b + 4); // planes
    dir.writeUInt16LE(32, b + 5); // bpp
    dir.writeUInt32LE(e.buf.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    blobs.push(e.buf);
    offset += e.buf.length;
  });
  return Buffer.concat([header, dir, ...blobs]);
}

(async () => {
  const svg = fs.readFileSync(svgFile);
  const entries = [];
  for (const size of SIZES) {
    const buf = await sharp(svg).resize(size, size).png().toBuffer();
    entries.push({ size, buf });
  }
  fs.writeFileSync(icoFile, packIco(entries));
  fs.writeFileSync(pngFile, await sharp(svg).resize(512, 512).png().toBuffer());
  console.log(`[icon] ok → ${path.relative(root, icoFile)} (${SIZES.join('/')}px), icon.png (512px)`);
})().catch((err) => {
  console.error('[icon] failed:', err);
  process.exit(1);
});
