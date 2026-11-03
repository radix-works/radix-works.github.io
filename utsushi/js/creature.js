// 切り抜いた画像から、属性・ステータス・わざ・とくせい・名前を決める
import { MOVE_POOL, RARITY } from './data.js';

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

function pickElement(f) {
  if (f.chromaRatio < 0.22) {
    return f.val > 0.55 ? 'light' : 'dark';
  }
  // 30度ずつの色相ビンを属性にまとめる
  const sc = { fire: 0, bolt: 0, leaf: 0, water: 0, dark: 0, light: 0 };
  f.hueHist.forEach((v, i) => {
    const deg = i * 30 + 15;
    if (deg < 40 || deg >= 340) sc.fire += v;
    else if (deg < 70) sc.bolt += v * 1.15;
    else if (deg < 165) sc.leaf += v;
    else if (deg < 255) sc.water += v;
    else if (deg < 300) sc.dark += v;
    else sc.light += v;
  });
  return Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
}

function pickAbility(f, el) {
  const c = [];
  if (f.fill > 0.72 && f.aspect > 0.75 && f.aspect < 1.35) c.push(['marui', f.fill]);
  if (f.jag > 0.35 || f.edge > 0.55) c.push(['togatta', Math.max(f.jag, f.edge)]);
  if (f.aspect > 1.6 || f.aspect < 0.55) c.push(['nobi', Math.abs(Math.log(f.aspect)) / 1.2]);
  if (f.coverage > 0.45) c.push(['ookii', f.coverage]);
  if (f.variety > 0.62) c.push(['colorful', f.variety]);
  if (f.val > 0.72) c.push(['kirakira', f.val]);
  if (f.val < 0.32 || el === 'dark') c.push(['kagemono', 1 - f.val]);
  if (!c.length) return 'shinpuru';
  c.sort((a, b) => b[1] - a[1]);
  return c[f.hash % Math.min(2, c.length)][0];
}

function pickRarity(f) {
  // 色の豊かさ・コントラスト・形の個性 + 運
  const score = f.variety * 0.3 + Math.min(1, f.contrast) * 0.25 + f.sat * 0.2 + Math.min(1, f.jag + f.edge) * 0.1 + ((f.hash >>> 8) % 1000) / 1000 * 0.45;
  if (score > 0.78) return 'UR';
  if (score > 0.62) return 'SR';
  if (score > 0.45) return 'R';
  return 'N';
}

function pickStats(f, rarity) {
  const slender = Math.min(1, Math.abs(Math.log(f.aspect)) / 1.1);
  const w = {
    hp:  0.8 + f.coverage * 1.4 + f.fill * 0.9,
    atk: 0.8 + f.edge * 1.3 + f.sat * 0.9 + f.jag * 0.6,
    def: 0.8 + f.fill * 1.2 + (1 - f.val) * 0.8,
    spd: 0.8 + slender * 1.3 + (1 - f.coverage) * 0.6 + f.val * 0.4,
  };
  // 写真ごとの個性（ゆらぎ）
  let hs = f.hash;
  for (const k of Object.keys(w)) { hs = Math.imul(hs ^ (hs >>> 13), 0x5bd1e995) >>> 0; w[k] *= 0.88 + (hs % 1000) / 1000 * 0.24; }
  const total = RARITY[rarity].total;
  const min = 45, free = total - min * 4;
  const sum = w.hp + w.atk + w.def + w.spd;
  const st = {};
  for (const k of Object.keys(w)) st[k] = Math.min(140, Math.round(min + (free * w[k]) / sum));
  return st;
}

function pickMoves(el, stats, hash) {
  const pool = MOVE_POOL[el];
  const pick = (arr, salt) => arr[(hash >>> salt) % arr.length];
  const moves = [];
  // すばやい子は先制わざ、こうげきが高い子は大技を覚えやすい
  moves.push(stats.spd >= stats.atk && pool.weak.length > 1 ? pool.weak[1] : pick(pool.weak, 3));
  moves.push(stats.atk >= 80 || (hash & 3) === 0 ? pick(pool.big, 5) : pick(pool.mid, 5));
  const neutral = ['taiatari', 'kiai', 'teppeki', 'kosoku', 'saisei', 'niramu'];
  let third;
  if ((hash >>> 9) % 3 === 0) third = pool.sup[0];
  else if (stats.def > stats.atk) third = (hash >>> 11) % 2 ? 'teppeki' : 'saisei';
  else if (stats.spd < 65) third = 'kosoku';
  else third = neutral[(hash >>> 7) % neutral.length];
  if (moves.includes(third)) third = 'taiatari';
  moves.push(third);
  // 大技を持っていない子は中技も持つ
  return moves;
}

const NAME_HEAD = {
  fire: ['ホムラ', 'ヒノ', 'カエン', 'ボル', 'アカ'],
  water: ['アクア', 'ミナ', 'シズ', 'ナミ', 'ラム'],
  leaf: ['リーフ', 'モリ', 'ハッパ', 'コケ', 'ミド'],
  bolt: ['ライ', 'ビリ', 'イナズ', 'ピカ', 'ゴロ'],
  light: ['ルミ', 'キラ', 'ヒカ', 'ステラ', 'シロ'],
  dark: ['ヤミ', 'カゲ', 'ノクス', 'クロ', 'ヨル'],
};
const NAME_TAIL = {
  marui: ['マル', 'ポン', 'コロ'], togatta: ['トゲ', 'ガル', 'ザン'], nobi: ['ノッポ', 'タワー', 'ロング'],
  ookii: ['ドン', 'ゴン', 'ギガ'], colorful: ['パレ', 'ニジ', 'ミックス'], kirakira: ['リン', 'ティア', 'スター'],
  kagemono: ['ガ', 'ジン', 'ロス'], shinpuru: ['ン', 'ル', 'ボ'],
};

export function makeCreature(canvas, coverage, imgDataUrl, opts = {}) {
  const f = analyze(canvas, coverage);
  const element = opts.element || pickElement(f);
  const ability = pickAbility(f, element);
  const rarity = pickRarity(f);
  const stats = pickStats(f, rarity);
  const moves = pickMoves(element, stats, f.hash);
  const head = NAME_HEAD[element][f.hash % NAME_HEAD[element].length];
  const tail = NAME_TAIL[ability][(f.hash >>> 4) % NAME_TAIL[ability].length];
  return {
    id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: head + tail, element, ability, rarity, stats, moves,
    img: imgDataUrl, created: Date.now(),
    features: { fill: +f.fill.toFixed(2), aspect: +f.aspect.toFixed(2), edge: +f.edge.toFixed(2), sat: +f.sat.toFixed(2), val: +f.val.toFixed(2) },
  };
}
