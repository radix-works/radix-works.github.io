// 写真がなくても遊べる「おためしモンスター」と CPU のモンスターを絵で作る
import { makeCreature } from './creature.js';
import { canvasToDataUrl } from './cutout.js';

const HUES = { fire: [12, 0.9, 0.95], water: [208, 0.8, 0.95], leaf: [125, 0.7, 0.8], bolt: [48, 0.9, 1], light: [0, 0, 0.97], dark: [265, 0.45, 0.28] };

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hsl = (h, s, l) => `hsl(${h} ${s * 100}% ${l * 100}%)`;

export function drawMonster(el, seed) {
  const r = rng(seed);
  const c = document.createElement('canvas'); c.width = 300; c.height = 300;
  const g = c.getContext('2d');
  const [h0, s, v] = HUES[el];
  const h = (h0 + (r() - 0.5) * 16 + 360) % 360;
  const l = v * (1 - s / 2);
  const shape = Math.floor(r() * 4);
  const cx = 150, cy = 160;
  const rx = 80 + r() * 30, ry = shape === 2 ? 115 : 75 + r() * 30;
  g.beginPath();
  if (shape === 1) { // とげとげ
    const n = 9 + Math.floor(r() * 5);
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? 0.72 : 1;
      g.lineTo(cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr);
    }
  } else if (shape === 3) { // しずく
    g.moveTo(cx, cy - ry - 20);
    g.bezierCurveTo(cx + rx * 1.1, cy - 20, cx + rx, cy + ry, cx, cy + ry);
    g.bezierCurveTo(cx - rx, cy + ry, cx - rx * 1.1, cy - 20, cx, cy - ry - 20);
  } else g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.closePath();
  const grad = g.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, 10, cx, cy, Math.max(rx, ry) * 1.1);
  grad.addColorStop(0, hsl(h, s, Math.min(0.92, l + 0.25)));
  grad.addColorStop(0.6, hsl(h, s, l));
  grad.addColorStop(1, hsl((h + 15) % 360, s, l * 0.6));
  g.fillStyle = grad; g.fill();
  g.lineWidth = 6; g.strokeStyle = hsl(h, s, l * 0.45); g.stroke();
  // 模様
  for (let i = 0; i < 4 + r() * 5; i++) {
    g.beginPath();
    g.arc(cx + (r() - 0.5) * rx * 1.2, cy + (r() - 0.1) * ry * 0.8, 6 + r() * 10, 0, Math.PI * 2);
    g.fillStyle = hsl((h + 180 * r()) % 360, s * 0.6, Math.min(0.9, l + 0.2)); g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
  }
  // 目
  const ey = cy - ry * 0.15, ex = rx * 0.32, er = 16 + r() * 6;
  for (const sx of [-1, 1]) {
    g.beginPath(); g.ellipse(cx + sx * ex, ey, er * 0.8, er, 0, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#222'; g.stroke();
    g.beginPath(); g.arc(cx + sx * ex + 3, ey + 3, er * 0.45, 0, Math.PI * 2); g.fillStyle = '#1b1b25'; g.fill();
    g.beginPath(); g.arc(cx + sx * ex + 6, ey - 2, er * 0.15, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
  }
  // 口
  g.beginPath(); g.arc(cx, ey + er + 10, 12, 0.15 * Math.PI, 0.85 * Math.PI); g.lineWidth = 4; g.strokeStyle = '#222'; g.stroke();
  // 余白を詰める
  const out = document.createElement('canvas'); out.width = 240; out.height = 260;
  out.getContext('2d').drawImage(c, 30, 20, 240, 260, 0, 0, 240, 260);
  return out;
}

export function makeDrawnMonster(el, seed, name) {
  const c = drawMonster(el, seed);
  const m = makeCreature(c, 0.18 + (seed % 30) / 100, canvasToDataUrl(c), { element: el });
  if (name) m.name = name;
  m.drawn = true;
  return m;
}

export function makeStarters() {
  return [
    makeDrawnMonster('fire', 11, 'ポッカ'),
    makeDrawnMonster('water', 23, 'シズモ'),
    makeDrawnMonster('leaf', 37, 'モリィ'),
  ];
}

export function makeCpuTeam(seed) {
  const r = rng(seed);
  const els = ['fire', 'water', 'leaf', 'bolt', 'light', 'dark'];
  const team = [];
  while (team.length < 3) {
    const el = els[Math.floor(r() * els.length)];
    if (team.some((m) => m.element === el)) continue;
    team.push(makeDrawnMonster(el, Math.floor(r() * 1e9)));
  }
  return team;
}
