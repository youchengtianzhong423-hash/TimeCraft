/**
 * App icon for Windows desktop:
 * - 四隅は「透明」ではなく紺色で不透明塗り（白フチ防止）
 * - 中央にアイコン本体を少し小さく載せる
 *
 * Usage: node scripts/prepare-app-icon.mjs <input> <output.png>
 */
import sharp from "sharp";

const [input, outputPng] = process.argv.slice(2);
if (!input || !outputPng) {
  console.error("Usage: node prepare-app-icon.mjs <input> <output.png>");
  process.exit(1);
}

const SIZE = 512;
const CORNER_RADIUS = Math.round(SIZE * 0.185);
const CONTENT_SCALE = 0.92;
const WHITE_THRESHOLD = 235;

function insideRoundedRect(x, y, w, h, r) {
  if (x < r && y < r) {
    const dx = r - x;
    const dy = r - y;
    return dx * dx + dy * dy <= r * r;
  }
  if (x >= w - r && y < r) {
    const dx = x - (w - r - 1);
    const dy = r - y;
    return dx * dx + dy * dy <= r * r;
  }
  if (x < r && y >= h - r) {
    const dx = r - x;
    const dy = y - (h - r - 1);
    return dx * dx + dy * dy <= r * r;
  }
  if (x >= w - r && y >= h - r) {
    const dx = x - (w - r - 1);
    const dy = y - (h - r - 1);
    return dx * dx + dy * dy <= r * r;
  }
  return true;
}

function isNearWhite(r, g, b) {
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

const DEFAULT_NAVY = { r: 12, g: 28, b: 58 };

function isNavyLike(r, g, b) {
  if (isNearWhite(r, g, b)) return false;
  const lum = (r + g + b) / 3;
  return lum < 95 && b >= r && b >= g - 8;
}

/** 四隅付近の紺背景をサンプル（時計のグレー縁は除外） */
async function sampleNavyFromImage(path) {
  const { data, info } = await sharp(path)
    .resize(SIZE, SIZE, { fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rs = [];
  const gs = [];
  const bs = [];
  const { width: w, height: h } = info;
  const band = 72;
  const corners = [
    [0, 0],
    [w - band, 0],
    [0, h - band],
    [w - band, h - band],
  ];
  for (const [x0, y0] of corners) {
    for (let y = y0; y < y0 + band && y < h; y++) {
      for (let x = x0; x < x0 + band && x < w; x++) {
        const i = (y * w + x) * 3;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (!isNavyLike(r, g, b)) continue;
        rs.push(r);
        gs.push(g);
        bs.push(b);
      }
    }
  }
  const med = (arr) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const r = med(rs);
  const g = med(gs);
  const b = med(bs);
  if (r == null) return DEFAULT_NAVY;
  return { r, g, b };
}

const navy = await sampleNavyFromImage(input);
console.log("Navy background:", navy);

const innerSize = Math.round(SIZE * CONTENT_SCALE);
const innerOffset = Math.round((SIZE - innerSize) / 2);

const innerBuf = await sharp(input)
  .resize(innerSize, innerSize, { fit: "cover" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const inner = Buffer.from(innerBuf.data);
const iw = innerBuf.info.width;
const ih = innerBuf.info.height;

for (let y = 0; y < ih; y++) {
  for (let x = 0; x < iw; x++) {
    const i = (y * iw + x) * 4;
    const r = inner[i];
    const g = inner[i + 1];
    const b = inner[i + 2];
    if (isNearWhite(r, g, b)) {
      inner[i + 3] = 0;
    }
  }
}

const foreground = await sharp(inner, {
  raw: { width: iw, height: ih, channels: 4 },
})
  .png()
  .toBuffer();

const plate = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const inside = insideRoundedRect(x, y, SIZE, SIZE, CORNER_RADIUS);
    plate[i] = navy.r;
    plate[i + 1] = navy.g;
    plate[i + 2] = navy.b;
    /** Windows アイコン: 角は透明より紺の不透明の方が白線が出ない */
    plate[i + 3] = 255;
  }
}

const platePng = await sharp(plate, {
  raw: { width: SIZE, height: SIZE, channels: 4 },
})
  .png()
  .toBuffer();

await sharp(platePng)
  .composite([
    {
      input: foreground,
      left: innerOffset,
      top: innerOffset,
      blend: "over",
    },
  ])
  .png()
  .toFile(outputPng);

console.log(
  `Wrote ${outputPng} (${SIZE}x${SIZE}, opaque navy corners, scale=${CONTENT_SCALE})`,
);
