// 切り抜いた画像から、色・かたち・ステータス・名前を決める
import { RARITY } from './data.js';

function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

// 画像の特徴を数値化（すべて 0〜1 付近の値）
export function analyze(canvas, coverage) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const px = ctx.getImageData(0, 0, w, h).data;
  let n = 0, sumS = 0, sumV = 0, sumV2 = 0, chroma = 0, edge = 0;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  const hueHist = new Float64Array(12);
  let hash = 2166136261;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3];
    if (a < 128) { lum[i] = -1; continue; }
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    const [hh, s, v] = rgb2hsv(r, g, b);
    lum[i] = v;
    n++; sumS += s; sumV += v; sumV2 += v * v;
    if (s > 0.28 && v > 0.22) { chroma++; hueHist[Math.floor(hh / 30) % 12] += s * v; }
    const x = i % w, y = (i / w) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if ((i & 7) === 0) { hash ^= (r >> 3) * 31 + (g >> 3) * 7 + (b >> 3) + x + y * 13; hash = Math.imul(hash, 16777619) >>> 0; }
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (lum[i] < 0) continue;
      const gx = Math.abs((lum[i + 1] < 0 ? lum[i] : lum[i + 1]) - (lum[i - 1] < 0 ? lum[i] : lum[i - 1]));
      const gy = Math.abs((lum[i + w] < 0 ? lum[i] : lum[i + w]) - (lum[i - w] < 0 ? lum[i] : lum[i - w]));
      edge += gx + gy;
    }
  }
  // 輪郭のギザギザ具合（周囲長 ÷ 面積の平方根）
  let perim = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (lum[i] < 0) continue;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || lum[i - 1] < 0 || lum[i + 1] < 0 || lum[i - w] < 0 || lum[i + w] < 0) perim++;
  }
  n = Math.max(n, 1);
  const bw = Math.max(1, maxX - minX + 1), bh = Math.max(1, maxY - minY + 1);
  const meanV = sumV / n;
  let hueTotal = 0; for (const v of hueHist) hueTotal += v;
  let entropy = 0;
  if (hueTotal > 0) for (const v of hueHist) if (v > 0) { const p = v / hueTotal; entropy -= p * Math.log2(p); }
  return {
    coverage: Math.min(1, coverage ?? 0.3),
    fill: n / (bw * bh),
    aspect: bh / bw,
    edge: Math.min(1, (edge / n) * 4),
    jag: Math.min(1, Math.max(0, (perim / Math.sqrt(n) - 3.6) / 6)),
    sat: sumS / n,
    val: meanV,
    contrast: Math.sqrt(Math.max(0, sumV2 / n - meanV * meanV)) * 3,
    chromaRatio: chroma / n,
    hueHist: Array.from(hueHist),
    variety: entropy / Math.log2(12),
    hash,
  };
}

// 主な色：彩りの少ない物は白か黒、それ以外は色相（角度）を求めて5色に分ける
function pickColor(f) {
  if (f.chromaRatio < 0.22) return { color: f.val > 0.55 ? 'white' : 'black', hue: null };
  let best = 0;
  f.hueHist.forEach((v, i) => { if (v > f.hueHist[best]) best = i; });
  // 一番多いビンと両隣で、角度の重み付き平均
  let x = 0, y = 0;
  for (const k of [-1, 0, 1]) {
    const i = (best + k + 12) % 12, a = ((i * 30 + 15) * Math.PI) / 180;
    x += Math.cos(a) * f.hueHist[i]; y += Math.sin(a) * f.hueHist[i];
  }
  const hue = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
  let color;
  if (hue < 40 || hue >= 330) color = 'red';
  else if (hue < 75) color = 'yellow';
  else if (hue < 165) color = 'green';
  else if (hue < 255) color = 'blue';
  else color = 'purple';
  return { color, hue };
}

function pickShape(f) {
  if (f.aspect > 1.6 || f.aspect < 0.55) return 'long';
  if (f.jag > 0.35 || f.edge > 0.55) return 'spiky';
  if (f.fill > 0.72 && f.aspect > 0.75 && f.aspect < 1.35) return 'round';
  if (f.coverage > 0.45) return 'big';
  return 'plain';
}

function pickRarity(f) {
  // 色の豊かさ・コントラスト・形の個性 + 運
  const score = f.variety * 0.3 + Math.min(1, f.contrast) * 0.25 + f.sat * 0.2 + Math.min(1, f.jag + f.edge) * 0.1 + ((f.hash >>> 8) % 1000) / 1000 * 0.45;
  if (score > 0.78) return 'UR';
  if (score > 0.62) return 'SR';
  if (score > 0.45) return 'R';
  return 'N';
}

function pickStats(f, rarity, shape) {
  const w = {
    hp:  0.8 + f.coverage * 1.2 + f.fill * 0.6,
    pow: 0.8 + f.edge * 1.1 + f.sat * 0.8 + f.jag * 0.5,
    grd: 0.8 + f.fill * 1.0 + (1 - f.val) * 0.6,
    spd: 0.8 + (1 - f.coverage) * 0.6 + f.val * 0.5,
  };
  // かたちの得意分野
  const bias = { round: 'grd', spiky: 'pow', long: 'spd', big: 'hp' }[shape];
  if (bias) w[bias] += 0.7;
  let hs = f.hash;
  for (const k of Object.keys(w)) { hs = Math.imul(hs ^ (hs >>> 13), 0x5bd1e995) >>> 0; w[k] *= 0.88 + (hs % 1000) / 1000 * 0.24; }
  const total = RARITY[rarity].total;
  const min = 45, free = total - min * 4;
  const sum = w.hp + w.pow + w.grd + w.spd;
  const st = {};
  for (const k of Object.keys(w)) st[k] = Math.min(140, Math.round(min + (free * w[k]) / sum));
  return st;
}

// 名前：色の音 ＋ かたちの音（モノに宿った「ウツシ」らしい響き）
const NAME_HEAD = {
  red: ['アカ', 'ベニ', 'ヒイロ', 'アケ'], yellow: ['キナ', 'ヤマブ', 'コガネ', 'ヒマ'], green: ['アオバ', 'モエギ', 'ワカ', 'ミドリ'],
  blue: ['ソラ', 'アイ', 'ルリ', 'ミズ'], purple: ['フジ', 'スミレ', 'ムラ', 'キキョ'], white: ['シロ', 'ユキ', 'マシロ', 'ハク'], black: ['クロ', 'スミ', 'ヨル', 'ウルシ'],
};
const NAME_TAIL = {
  round: ['まる', 'たま', 'ころ'], spiky: ['とげ', 'きば', 'つの'], long: ['ぼう', 'すけ', 'のび'], big: ['どん', 'ぶち', 'だい'], plain: ['ぴ', 'こ', 'ぼん'],
};

export function makeCreature(canvas, coverage, imgDataUrl, opts = {}) {
  const f = analyze(canvas, coverage);
  const { color, hue } = opts.color ? { color: opts.color, hue: opts.hue ?? null } : pickColor(f);
  const shape = opts.shape || pickShape(f);
  const rarity = pickRarity(f);
  const stats = pickStats(f, rarity, shape);
  const head = NAME_HEAD[color][f.hash % NAME_HEAD[color].length];
  const tail = NAME_TAIL[shape][(f.hash >>> 4) % NAME_TAIL[shape].length];
  return {
    id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: head + tail, color, hue, shape, rarity, stats,
    img: imgDataUrl, created: Date.now(),
  };
}
