// 写真から被写体を切り抜く
// 1) Google MediaPipe の「タップした物を切り抜く」AI（Apache-2.0）
// 2) AI が読み込めないときは、背景の色から推定する簡易版
const MP_VER = '0.10.21';
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite';

let segPromise = null;
export function loadSegmenter() {
  if (!segPromise) {
    segPromise = (async () => {
      const vision = await import(`${MP_BASE}/vision_bundle.mjs`);
      const fileset = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
      const make = (delegate) => vision.InteractiveSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        outputCategoryMask: false, outputConfidenceMasks: true,
      });
      try { return await make('GPU'); } catch { return await make('CPU'); }
    })().catch((e) => { segPromise = null; throw e; });
  }
  return segPromise;
}

export async function fileToCanvas(file, maxSide = 1024) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

async function aiMask(canvas, nx, ny) {
  const seg = await loadSegmenter();
  return await new Promise((resolve, reject) => {
    try {
      seg.segment(canvas, { keypoint: { x: nx, y: ny } }, (result) => {
        const m = result.confidenceMasks && result.confidenceMasks[0];
        if (!m) { reject(new Error('no mask')); return; }
        const f = m.getAsFloat32Array();
        const out = { w: m.width, h: m.height, data: new Float32Array(f) };
        resolve(out);
      });
    } catch (e) { reject(e); }
  });
}

// 簡易版：画像の縁の色を背景とみなし、縁から似た色を塗りつぶして背景を消す
function colorMask(canvas, nx, ny) {
  const w = canvas.width, h = canvas.height;
  const px = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const bg = new Uint8Array(w * h);
  const q = [];
  const tol = 42 * 42;
  const near = (i, j) => {
    const dr = px[i * 4] - px[j * 4], dg = px[i * 4 + 1] - px[j * 4 + 1], db = px[i * 4 + 2] - px[j * 4 + 2];
    return dr * dr + dg * dg + db * db < tol;
  };
  for (let x = 0; x < w; x++) { q.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { q.push(y * w, y * w + w - 1); }
  for (const i of q) bg[i] = 1;
  while (q.length) {
    const i = q.pop();
    const x = i % w, y = (i / w) | 0;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const j of nb) if (j >= 0 && !bg[j] && near(i, j)) { bg[j] = 1; q.push(j); }
  }
  const data = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = bg[i] ? 0 : 1;
  // タップ地点が背景扱いなら中央の楕円を使う
  const ti = Math.min(h - 1, Math.floor(ny * h)) * w + Math.min(w - 1, Math.floor(nx * w));
  if (!data[ti]) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x / w - nx) / 0.32, dy = (y / h - ny) / 0.38;
      data[y * w + x] = dx * dx + dy * dy < 1 ? 1 : 0;
    }
  }
  return { w, h, data };
}

// マスクを整える：しきい値 → タップした塊だけ残す → 穴埋め
function cleanMask(mask, nx, ny) {
  const { w, h, data } = mask;
  const bin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bin[i] = data[i] > 0.5 ? 1 : 0;
  const label = new Int32Array(w * h);
  let cur = 0, best = 0, bestSize = 0;
  const tx = Math.min(w - 1, Math.floor(nx * w)), ty = Math.min(h - 1, Math.floor(ny * h));
  let tapLabel = 0;
  const sizes = [0];
  for (let s = 0; s < w * h; s++) {
    if (!bin[s] || label[s]) continue;
    cur++; let size = 0; const st = [s]; label[s] = cur;
    while (st.length) {
      const i = st.pop(); size++;
      const x = i % w, y = (i / w) | 0;
      if (x > 0 && bin[i - 1] && !label[i - 1]) { label[i - 1] = cur; st.push(i - 1); }
      if (x < w - 1 && bin[i + 1] && !label[i + 1]) { label[i + 1] = cur; st.push(i + 1); }
      if (y > 0 && bin[i - w] && !label[i - w]) { label[i - w] = cur; st.push(i - w); }
      if (y < h - 1 && bin[i + w] && !label[i + w]) { label[i + w] = cur; st.push(i + w); }
    }
    sizes.push(size);
    if (size > bestSize) { bestSize = size; best = cur; }
  }
  tapLabel = label[ty * w + tx];
  const keep = tapLabel && sizes[tapLabel] > bestSize * 0.15 ? tapLabel : best;
  // 大きめの塊（メインの 25% 以上）は一緒に残す（例：分かれた手足）
  const keepSet = new Set([keep]);
  for (let l = 1; l <= cur; l++) if (sizes[l] > sizes[keep] * 0.25) keepSet.add(l);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = keepSet.has(label[i]) ? Math.min(1, Math.max(0, (data[i] - 0.35) / 0.3)) : 0;
  // 外から届かない穴は埋める
  const outside = new Uint8Array(w * h); const st = [];
  for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
  while (st.length) {
    const i = st.pop();
    if (outside[i] || out[i] > 0.5) continue;
    outside[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1);
    if (y > 0) st.push(i - w); if (y < h - 1) st.push(i + w);
  }
  let area = 0;
  for (let i = 0; i < w * h; i++) { if (!outside[i] && out[i] <= 0.5) out[i] = 1; if (out[i] > 0.5) area++; }
  return { w, h, data: out, area };
}

// 切り抜き結果のキャンバス（余白を詰めて最大 360px）を返す
export async function cutout(canvas, nx, ny, { forceSimple = false } = {}) {
  let raw, usedAI = false;
  if (!forceSimple) {
    try { raw = await aiMask(canvas, nx, ny); usedAI = true; } catch (e) { console.warn('AI 切り抜きに失敗、簡易版を使用', e); }
  }
  if (!raw) raw = colorMask(canvas, nx, ny);
  const m = cleanMask(raw, nx, ny);
  if (m.area < m.w * m.h * 0.004) throw new Error('うまく切り抜けませんでした。もう一度、被写体の真ん中をタップしてください。');

  // マスクを元画像サイズに合わせて適用
  const W = canvas.width, H = canvas.height;
  const mc = document.createElement('canvas'); mc.width = m.w; mc.height = m.h;
  const mctx = mc.getContext('2d'); const id = mctx.createImageData(m.w, m.h);
  for (let i = 0; i < m.w * m.h; i++) { id.data[i * 4 + 3] = Math.round(m.data[i] * 255); }
  mctx.putImageData(id, 0, 0);
  const full = document.createElement('canvas'); full.width = W; full.height = H;
  const fctx = full.getContext('2d');
  fctx.drawImage(canvas, 0, 0);
  fctx.globalCompositeOperation = 'destination-in';
  fctx.filter = 'blur(0.6px)';
  fctx.drawImage(mc, 0, 0, W, H);
  fctx.filter = 'none';
  fctx.globalCompositeOperation = 'source-over';

  // 余白を詰める
  const a = fctx.getImageData(0, 0, W, H).data;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3] > 40) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX < 0) throw new Error('うまく切り抜けませんでした。');
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const s = Math.min(1, 360 / Math.max(bw, bh));
  const pad = 6;
  const outC = document.createElement('canvas');
  outC.width = Math.round(bw * s) + pad * 2; outC.height = Math.round(bh * s) + pad * 2;
  const octx = outC.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(full, minX, minY, bw, bh, pad, pad, outC.width - pad * 2, outC.height - pad * 2);
  return { canvas: outC, coverage: m.area / (m.w * m.h), usedAI };
}

export function canvasToDataUrl(c) {
  let url = c.toDataURL('image/webp', 0.86);
  if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png');
  return url;
}

