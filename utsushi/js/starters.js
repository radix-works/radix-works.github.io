// 写真がなくても遊べる「おためしウツシ」と CPU のウツシを、絵で作る
import { makeCreature } from './creature.js';
import { canvasToDataUrl } from './cutout.js';

const TONE = { red: [8, 0.85, 0.55], yellow: [48, 0.95, 0.55], green: [130, 0.6, 0.45], blue: [212, 0.8, 0.55], purple: [278, 0.6, 0.55], white: [220, 0.1, 0.92], black: [230, 0.15, 0.22] };
const HUE_OF = { red: 8, yellow: 48, green: 130, blue: 212, purple: 278 };

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hsl = (h, s, l) => `hsl(${h} ${s * 100}% ${l * 100}%)`;

// モノの形を描く（ボール・えんぴつ・星・箱・しずく）
export function drawObject(color, shape, seed) {
  const r = rng(seed);
  const c = document.createElement('canvas'); c.width = 300; c.height = 300;
  const g = c.getContext('2d');
  const [h, s, l] = TONE[color];
  const main = hsl(h, s, l), light = hsl(h, s, Math.min(0.95, l + 0.22)), dark = hsl(h, s, l * 0.55);
  g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = dark;
  let eyeY = 150, eyeX = 34;
  g.beginPath();
  if (shape === 'round') { // ボール
    g.arc(150, 150, 105, 0, Math.PI * 2); fillGrad(g, main, light, dark);
    g.save(); g.clip(); g.fillStyle = light; g.globalAlpha = 0.55; g.fillRect(40, 175, 220, 26); g.restore();
    g.beginPath(); g.arc(150, 150, 105, 0, Math.PI * 2); g.stroke();
  } else if (shape === 'long') { // えんぴつ
    g.moveTo(112, 20); g.lineTo(188, 20); g.lineTo(188, 220); g.lineTo(150, 285); g.lineTo(112, 220); g.closePath();
    fillGrad(g, main, light, dark); g.stroke();
    g.beginPath(); g.moveTo(112, 220); g.lineTo(188, 220); g.lineTo(150, 285); g.closePath(); g.fillStyle = '#f2d2a0'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(138, 265); g.lineTo(162, 265); g.lineTo(150, 285); g.closePath(); g.fillStyle = '#333'; g.fill();
    eyeY = 110; eyeX = 18;
  } else if (shape === 'spiky') { // 星
    const n = 5 + Math.floor(r() * 3);
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 58 : 135;
      g.lineTo(150 + Math.cos(a) * rr, 160 + Math.sin(a) * rr);
    }
    g.closePath(); fillGrad(g, main, light, dark); g.stroke(); eyeY = 160; eyeX = 24;
  } else if (shape === 'big') { // 箱
    g.roundRect(30, 60, 240, 210, 18); fillGrad(g, main, light, dark); g.stroke();
    g.beginPath(); g.moveTo(30, 110); g.lineTo(270, 110); g.stroke();
    g.fillStyle = light; g.globalAlpha = 0.6; g.fillRect(135, 60, 30, 210); g.globalAlpha = 1; eyeY = 180;
  } else { // しずく
    g.moveTo(150, 20); g.bezierCurveTo(250, 140, 260, 280, 150, 280); g.bezierCurveTo(40, 280, 50, 140, 150, 20);
    g.closePath(); fillGrad(g, main, light, dark); g.stroke(); eyeY = 190;
  }
  // 小さな目（モノに宿った気配）
  for (const sx of [-1, 1]) {
    g.beginPath(); g.ellipse(150 + sx * eyeX, eyeY, 7, 10, 0, 0, Math.PI * 2); g.fillStyle = color === 'black' ? '#fff' : '#1b1b25'; g.fill();
  }
  return c;
}
function fillGrad(g, main, light, dark) {
  const gr = g.createLinearGradient(40, 20, 260, 290);
  gr.addColorStop(0, light); gr.addColorStop(0.5, main); gr.addColorStop(1, dark);
  g.fillStyle = gr; g.fill();
}

export function makeDrawnUnit(color, shape, seed, name) {
  const c = drawObject(color, shape, seed);
  const hue = HUE_OF[color] != null ? (HUE_OF[color] + Math.round((rng(seed)() - 0.5) * 20) + 360) % 360 : null;
  const m = makeCreature(c, 0.15 + (seed % 30) / 100, canvasToDataUrl(c), { color, hue, shape });
  if (name) m.name = name;
  m.drawn = true;
  return m;
}

export function makeStarters() {
  return [
    makeDrawnUnit('red', 'round', 11, 'アカまる'),
    makeDrawnUnit('blue', 'long', 23, 'ソラぼう'),
    makeDrawnUnit('yellow', 'spiky', 37, 'コガネつの'),
  ];
}

export function makeCpuTeam(seed) {
  const r = rng(seed);
  const colors = ['red', 'yellow', 'green', 'blue', 'purple', 'white', 'black'];
  const shapes = ['round', 'spiky', 'long', 'big', 'plain'];
  const team = [];
  while (team.length < 3) {
    const color = colors[Math.floor(r() * colors.length)];
    if (team.some((m) => m.color === color)) continue;
    team.push(makeDrawnUnit(color, shapes[Math.floor(r() * shapes.length)], Math.floor(r() * 1e9)));
  }
  return team;
}
