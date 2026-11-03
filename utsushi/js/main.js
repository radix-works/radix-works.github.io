import { COLORS, SHAPES, SKILLS, STAT_LABELS, RARITY, ENERGY, hueAdv } from './data.js';
import { createBattle, resolveTurn, cmdsValid, cmdsCost, cpuCommands, aliveIdx, needsTarget, skillsOf, maxHpOf, MAX_TURNS } from './battle.js';
import { makeCreature } from './creature.js';
import { fileToCanvas, cutout, loadSegmenter, canvasToDataUrl } from './cutout.js';
import { makeStarters, makeCpuTeam } from './starters.js';
import { Link } from './net.js';

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));

// ===== 保存 =====
const store = {
  get(k, d) { try { const v = localStorage.getItem('utsushi.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('utsushi.' + k, JSON.stringify(v)); return true; } catch { toast('保存できませんでした（容量がいっぱいかもしれません）'); return false; } },
};
let units = [];
let team = [];
const saveUnits = () => store.set('mons', units);
const saveTeam = () => store.set('team', team);
const unitById = (id) => units.find((m) => m.id === id);
const teamUnits = () => team.map(unitById).filter(Boolean);

// 古い版のデータ（色や形がない）は、保存してある画像から能力を決め直す
async function migrate(list) {
  const out = [];
  for (const m of list) {
    if (m.color && m.shape && m.stats && m.stats.pow) { out.push(m); continue; }
    if (m.drawn || !m.img) continue;
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = m.img; });
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      const n = makeCreature(c, 0.3, m.img);
      out.push({ ...n, id: m.id, created: m.created || Date.now() });
    } catch { /* 読めない画像は捨てる */ }
  }
  return out;
}

// ===== 画面切り替え =====
let current = 'home';
const onShow = {};
function go(name) {
  if (current === 'battle' && name !== 'battle') endBattleSession();
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 's-' + name));
  current = name;
  window.scrollTo(0, 0);
  onShow[name] && onShow[name]();
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go]');
  if (t) go(t.dataset.go);
});

function toast(text, ms = 2200) {
  const t = $('#toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function modal(html, { close = true } = {}) {
  const m = $('#modal'); $('#modal-body').innerHTML = html; m.hidden = false;
  m.onclick = (e) => { if (close && e.target === m) closeModal(); };
  return $('#modal-body');
}
function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }

// ===== カード表示 =====
const ucol = (m) => (m.hue != null ? `hsl(${m.hue} 80% 58%)` : COLORS[m.color].color);
const uStyle = (m) => `--uc:${ucol(m)}`;
const stars = (r) => '★'.repeat(RARITY[r].stars);
const colorChip = (m) => `<span class="c-chip" style="${uStyle(m)}"><i></i>${COLORS[m.color].name}</span>`;
function wheel(m, size = 54) {
  const marker = m.hue != null
    ? `<i class="w-mark" style="transform:rotate(${m.hue}deg)"></i>`
    : '';
  return `<span class="wheel ${m.hue == null ? 'mono' : ''}" style="width:${size}px;height:${size}px">${marker}<b>${m.hue == null ? '無' : ''}</b></span>`;
}
function skillRow(key) {
  const sk = SKILLS[key];
  return `<div class="skill-row"><b>${sk.name}</b><span class="cost">⚡${sk.cost}</span><small>${sk.desc}</small></div>`;
}
function cardHTML(m, { edit = false } = {}) {
  const sks = skillsOf(m);
  return `<div class="card r-${m.rarity}" style="${uStyle(m)}">
    <div class="card-head">${colorChip(m)}<span class="card-name">${esc(m.name)}</span><span class="rarity">${stars(m.rarity)} ${m.rarity}</span></div>
    <div class="card-art"><img class="sticker" src="${m.img}" alt=""></div>
    <div class="card-meta">${wheel(m)}<div><div class="meta-l">かたち：<b>${SHAPES[m.shape].name}</b>（${SHAPES[m.shape].desc}）</div><div class="meta-l">色：<b>${COLORS[m.color].name}</b>${m.hue != null ? `（色相 ${m.hue}°）` : '（相性なし）'}</div></div></div>
    <div class="stats">${Object.keys(STAT_LABELS).map((k) => `<div class="stat"><span>${STAT_LABELS[k]}</span><b>${k === 'hp' ? maxHpOf(m) : m.stats[k]}</b><div class="bar-bg"><div class="bar-fg" style="width:${Math.min(100, (m.stats[k] / 140) * 100)}%"></div></div></div>`).join('')}</div>
    <div class="skills"><div class="sk-h">スキル</div>${skillRow(sks[1])}${skillRow(sks[2])}</div>
    ${edit ? `<div class="name-edit"><input id="in-rename" maxlength="10" value="${esc(m.name)}" aria-label="名前"><button class="btn btn-sub" id="btn-rename">名前を変える</button></div>` : ''}
  </div>`;
}
function miniHTML(m, extra = '', cls = '') {
  return `<div class="mini ${cls}" data-id="${m.id}" style="${uStyle(m)}"><span class="rar">${m.rarity}</span><img class="sticker" src="${m.img}" alt="" loading="lazy"><span class="mn">${esc(m.name)}</span>${extra}</div>`;
}

// ===== ホーム =====
onShow.home = () => {
  $('#home-team').innerHTML = teamUnits().map((m) => `<img class="sticker" src="${m.img}" alt="">`).join('');
};
$('#btn-howto').onclick = () => {
  modal(`<div class="sheet"><h3>あそびかた</h3>
    <ol><li>身のまわりのモノを撮って、切り抜きたいモノをタップ</li><li>モノに「ウツシ」が宿る。色と形から、能力とスキルが自動で決まる</li><li>3体でチームを組んで、CPUや友だちとバトル！</li></ol>
    <h3>バトルのながれ</h3>
    <ol><li>3体それぞれに「こうげき・スキル・ガード」を指示</li><li>全員の指示が終わったら「ターン開始」</li><li>敵味方6体が <b>スピードの速い順</b> に行動</li></ol>
    <p>スキルは チームで共有の <b>⚡エネルギー</b> を使います。毎ターン ⚡+${ENERGY.perTurn}（最大${ENERGY.max}）。ガードすると ⚡+1。</p>
    <h3>色の相性（色相環）</h3>
    <div class="howto-wheel"><span class="wheel big"></span><div><p>写真の色の「角度」で相性が決まります。<br><b>自分の色から時計回りに 約120° 先の色に強い</b>（1.3倍）、反対に 約240° 先の色には弱い（0.8倍）。<br>例：赤 → 緑に強い／緑 → 青に強い／青 → 赤紫に強い<br>白・黒のモノは相性なし。</p></div></div>
    <button class="btn btn-sub" id="m-close">とじる</button></div>`);
  $('#m-close').onclick = closeModal;
};

// ===== つくる =====
let photo = null;
let lastCut = null;
function aiStatus() {
  const el = $('#ai-state');
  el.textContent = 'AI準備中…';
  loadSegmenter().then(() => { el.textContent = 'AI準備OK'; }).catch(() => { el.textContent = '簡易モード'; });
}
onShow.create = () => { showStep('pick'); aiStatus(); };
function showStep(s) { for (const k of ['pick', 'tap', 'reveal']) $('#step-' + k).hidden = k !== s; }
async function onFile(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try { photo = await fileToCanvas(f); } catch { toast('画像を読み込めませんでした'); return; }
  const c = $('#photo-canvas'); c.width = photo.width; c.height = photo.height;
  c.getContext('2d').drawImage(photo, 0, 0);
  $('#cut-result').hidden = true; $('#photo-stage').hidden = false; $('#tap-guide').hidden = false;
  showStep('tap');
}
$('#in-camera').onchange = onFile;
$('#in-album').onchange = onFile;
$('#btn-repick').onclick = () => showStep('pick');
$('#btn-retap').onclick = () => { $('#cut-result').hidden = true; $('#photo-stage').hidden = false; $('#tap-guide').hidden = false; };

$('#photo-canvas').addEventListener('click', async (e) => {
  if (!$('#cut-busy').hidden) return;
  const c = e.currentTarget; const r = c.getBoundingClientRect();
  const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
  const stage = $('#photo-stage');
  stage.querySelectorAll('.tap-ring').forEach((x) => x.remove());
  const ring = document.createElement('div'); ring.className = 'tap-ring';
  ring.style.left = e.clientX - stage.getBoundingClientRect().left + 'px'; ring.style.top = e.clientY - stage.getBoundingClientRect().top + 'px';
  stage.appendChild(ring);
  $('#cut-busy').hidden = false;
  try {
    const res = await cutout(photo, nx, ny);
    lastCut = res;
    $('#cut-img').src = res.canvas.toDataURL('image/png');
    $('#photo-stage').hidden = true; $('#tap-guide').hidden = true; $('#cut-result').hidden = false;
    if (!res.usedAI) toast('簡易モードで切り抜きました');
  } catch (err) {
    toast(err.message || '切り抜けませんでした');
  } finally { $('#cut-busy').hidden = true; ring.remove(); }
});

$('#btn-birth').onclick = async () => {
  if (!lastCut) return;
  const m = makeCreature(lastCut.canvas, lastCut.coverage, canvasToDataUrl(lastCut.canvas));
  showStep('reveal');
  const stage = $('#reveal-stage');
  $('#reveal-actions').hidden = true;
  stage.style.cssText = uStyle(m);
  stage.innerHTML = `<div class="burst"></div><div class="develop"><img src="${m.img}" alt=""></div>`;
  await sleep(1700);
  stage.innerHTML = `<div class="burst"></div><div class="reveal-card">${cardHTML(m, { edit: true })}</div>`;
  units.unshift(m);
  if (!saveUnits()) { units.shift(); return; }
  bindRename(m);
  $('#reveal-actions').hidden = false;
  $('#btn-toteam').onclick = () => {
    if (!team.includes(m.id)) { if (team.length >= 3) team.pop(); team.unshift(m.id); saveTeam(); }
    go('team');
  };
};
$('#btn-again').onclick = () => showStep('pick');
function bindRename(m, after) {
  const b = $('#btn-rename'); if (!b) return;
  b.onclick = () => {
    const v = $('#in-rename').value.trim();
    if (!v) return;
    m.name = v.slice(0, 10); saveUnits();
    document.querySelectorAll('.card-name').forEach((x) => (x.textContent = m.name));
    toast('名前を変えました'); after && after();
  };
}

// ===== コレクション =====
onShow.collection = () => {
  $('#col-count').textContent = `${units.length} 体`;
  $('#col-grid').innerHTML = units.length ? units.map((m) => miniHTML(m)).join('') : '<p class="empty">まだウツシがいません</p>';
};
$('#col-grid').addEventListener('click', (e) => {
  const t = e.target.closest('.mini'); if (!t) return;
  const m = unitById(t.dataset.id);
  const body = modal(`${cardHTML(m, { edit: true })}<div class="row2" style="width:100%;max-width:340px"><button class="btn btn-sub" id="m-del">手放す</button><button class="btn btn-sub" id="m-close">とじる</button></div>`);
  bindRename(m, () => onShow.collection());
  body.querySelector('#m-close').onclick = closeModal;
  body.querySelector('#m-del').onclick = () => {
    if (!confirm(`${m.name} を手放しますか？（元に戻せません）`)) return;
    units = units.filter((x) => x !== m); team = team.filter((id) => id !== m.id);
    saveUnits(); saveTeam(); closeModal(); onShow.collection();
  };
});

// ===== チーム =====
onShow.team = () => {
  const tm = teamUnits();
  $('#team-slots').innerHTML = [0, 1, 2].map((i) => `<div class="slot">${tm[i] ? miniHTML(tm[i], `<span class="order">${i + 1}</span>`) : `${i + 1}体目`}</div>`).join('');
  $('#team-grid').innerHTML = units.map((m) => {
    const i = team.indexOf(m.id);
    return miniHTML(m, i >= 0 ? `<span class="order">${i + 1}</span>` : '', i >= 0 ? 'sel' : '');
  }).join('');
};
function toggleTeam(id) {
  const i = team.indexOf(id);
  if (i >= 0) team.splice(i, 1);
  else if (team.length < 3) team.push(id);
  else { toast('3体までです。外したい子をタップしてね'); return; }
  saveTeam(); onShow.team();
}
$('#team-grid').addEventListener('click', (e) => { const t = e.target.closest('.mini'); if (t) toggleTeam(t.dataset.id); });
$('#team-slots').addEventListener('click', (e) => { const t = e.target.closest('.mini'); if (t) toggleTeam(t.dataset.id); });

// ===== ロビー =====
const nameInput = $('#in-name');
nameInput.value = store.get('name', '');
nameInput.onchange = () => store.set('name', nameInput.value.trim());
const myName = () => nameInput.value.trim() || 'プレイヤー';
onShow.lobby = () => {
  const tm = teamUnits();
  $('#lobby-team').innerHTML = tm.length === 3 ? tm.map((m) => `<img class="sticker" src="${m.img}" alt="">`).join('') : 'チームが3体そろっていません';
  resetRoom();
};
function needTeam() {
  if (teamUnits().length === 3) return false;
  toast('先にチームを3体そろえてね'); go('team'); return true;
}
const packTeam = () => teamUnits().map(({ id, name, color, hue, shape, rarity, stats, img }) => ({ id, name, color, hue, shape, rarity, stats, img }));
function sanitizeTeam(t) {
  // 相手から来たデータを最低限チェック
  if (!Array.isArray(t) || t.length !== 3) throw new Error('bad team');
  return t.map((m) => {
    if (!COLORS[m.color] || !SHAPES[m.shape] || !RARITY[m.rarity]) throw new Error('bad unit');
    const st = {}; let sum = 0;
    for (const k of ['hp', 'pow', 'grd', 'spd']) { st[k] = Math.max(1, Math.min(140, Math.round(+m.stats[k] || 0))); sum += st[k]; }
    if (sum > RARITY.UR.total + 4) throw new Error('bad stats');
    const hue = m.color === 'white' || m.color === 'black' ? null : Math.round(+m.hue) % 360;
    if (hue !== null && !(hue >= 0)) throw new Error('bad hue');
    const img = typeof m.img === 'string' && /^data:image\/(png|webp|jpeg);base64,/.test(m.img) && m.img.length < 600000 ? m.img : '';
    return { id: String(m.id).slice(0, 40), name: String(m.name).slice(0, 10), color: m.color, hue, shape: m.shape, rarity: m.rarity, stats: st, img };
  });
}

$('#btn-cpu').onclick = () => {
  if (needTeam()) return;
  const seed = (Math.random() * 2 ** 32) >>> 0;
  startBattle({ mode: 'cpu', me: 0, teams: [packTeam(), makeCpuTeam(seed)], names: [myName(), 'CPU'], seed });
};

let link = null;
function resetRoom() {
  if (link && current !== 'battle') { link.close(); link = null; }
  $('#room').hidden = true; $('#btn-host').disabled = false; $('#btn-join').disabled = false;
}
$('#btn-host').onclick = async () => {
  if (needTeam()) return;
  resetRoom();
  $('#btn-host').disabled = true; $('#btn-join').disabled = true;
  const room = $('#room'); room.hidden = false; room.innerHTML = '<p class="wait dots">部屋を準備中</p>';
  link = new Link();
  try {
    const code = await link.host();
    room.innerHTML = `<p class="wait">この番号を相手に伝えてね</p><div class="code">${code}</div><p class="wait dots">相手を待っています</p><button class="link-btn" id="btn-cancel">やめる</button>`;
    $('#btn-cancel').onclick = resetRoom;
    setupOnline(link, 0);
  } catch (e) { toast(e.message || '部屋を作れませんでした'); resetRoom(); }
};
$('#btn-join').onclick = async () => {
  if (needTeam()) return;
  const code = $('#in-code').value.replace(/\D/g, '');
  if (code.length !== 6) { toast('6けたの番号を入れてね'); return; }
  resetRoom();
  $('#btn-host').disabled = true; $('#btn-join').disabled = true;
  const room = $('#room'); room.hidden = false; room.innerHTML = '<p class="wait dots">接続中</p>';
  link = new Link();
  setupOnline(link, 1);
  try { await link.join(code); room.innerHTML = '<p class="wait dots">対戦の準備中</p>'; }
  catch (e) { toast(e.message || '接続できませんでした'); resetRoom(); }
};

// オンライン：ホスト(0)が計算役、ゲスト(1)は指示を送って結果を受け取る
function setupOnline(lk, me) {
  const myTeam = packTeam();
  let foeTeam = null;
  lk.on('open', () => lk.send({ t: 'hello', v: 2, name: myName(), team: myTeam }));
  lk.on('close', () => {
    if (session && session.link === lk && session.state.phase !== 'end') showResult(null, '相手との接続が切れました');
    else if (current === 'lobby') { toast('接続が切れました'); resetRoom(); }
  });
  lk.on('error', (e) => { if (current === 'lobby') { toast('通信エラーが発生しました'); resetRoom(); } console.warn(e); });
  lk.on('data', (d) => {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'busy') { toast('その部屋はもう対戦中です'); resetRoom(); return; }
    if (d.t === 'hello') {
      if (d.v !== 2) { toast('相手のアプリが古い版です。ページを再読み込みしてもらってね'); lk.close(); resetRoom(); return; }
      try { foeTeam = sanitizeTeam(d.team); } catch { toast('相手のデータが正しくありません'); lk.close(); return; }
      const foeName = String(d.name || '相手').slice(0, 12);
      if (me === 0) {
        const seed = (Math.random() * 2 ** 32) >>> 0;
        const teams = [myTeam, foeTeam];
        lk.send({ t: 'start', seed, names: [myName(), foeName] });
        startBattle({ mode: 'online', me, teams, names: [myName(), foeName], seed, link: lk });
      }
      return;
    }
    if (d.t === 'start' && me === 1 && foeTeam) {
      startBattle({ mode: 'online', me, teams: [foeTeam, myTeam], names: [String(d.names[0]).slice(0, 12), myName()], seed: d.seed >>> 0, link: lk });
      return;
    }
    session && session.link === lk && onBattleData(d);
  });
}

// ===== バトル =====
let session = null;
function endBattleSession() {
  if (!session) return;
  session.closed = true; clearInterval(session.timerId);
  if (session.link) { session.link.close(); if (link === session.link) link = null; }
  session = null; closeModal();
}

function startBattle({ mode, me, teams, names, seed, link: lk }) {
  closeModal();
  const state = createBattle(teams[0], teams[1], seed);
  session = {
    mode, me, teams, names, state, link: lk || null, pending: [null, null], busy: false, closed: false,
    rematch: [false, false], timerId: 0, cmds: [null, null, null], cursor: 0, picking: null, tags: null,
  };
  go('battle');
  $('#name-0').textContent = names[me]; $('#name-1').textContent = names[1 - me];
  buildRows();
  renderAll(state);
  say('バトル開始！');
  setTimeout(() => startCommand(), 500);
}

const foeSide = () => 1 - session.me;
const rowOf = (side) => (side === session.me ? 0 : 1);
const tileOf = (side, i) => $(`#row-${rowOf(side)} .unit[data-i="${i}"]`);

function buildRows() {
  for (const side of [0, 1]) {
    $('#row-' + rowOf(side)).innerHTML = session.teams[side].map((m, i) => `
      <div class="unit" data-side="${side}" data-i="${i}" style="${uStyle(m)}">
        <div class="u-adv"></div>
        <div class="u-img"><img class="sticker" src="${m.img}" alt=""></div>
        <div class="u-name">${esc(m.name)}</div>
        <div class="hp"><i></i></div>
        <div class="u-tags"></div>
        <div class="u-cmd"></div>
      </div>`).join('');
  }
}

function renderUnit(view, side, i) {
  const f = view.sides[side].team[i];
  const el = tileOf(side, i);
  const pct = Math.max(0, (f.hp / f.maxHp) * 100);
  const bar = el.querySelector('.hp i');
  bar.style.width = pct + '%';
  bar.className = pct <= 25 ? 'low' : pct <= 50 ? 'mid' : '';
  el.classList.toggle('down', f.hp <= 0);
  const tags = [];
  const tg = (session.tags && session.tags[side][i]) || {};
  if (tg.guard) tags.push('<span class="tag t-guard">ガード</span>');
  if (tg.cover) tags.push('<span class="tag t-guard">かばう</span>');
  if (tg.barrier) tags.push('<span class="tag t-barrier">バリア</span>');
  if (f.charged) tags.push('<span class="tag t-charge">ため</span>');
  if (f.slowTurns > 0) tags.push('<span class="tag t-slow">スロー</span>');
  if (f.dazzled) tags.push('<span class="tag t-dazzle">まぶしい</span>');
  el.querySelector('.u-tags').innerHTML = tags.join('');
  el.title = `${f.name} 体力 ${f.hp}/${f.maxHp}`;
}
function renderAll(view) {
  for (const side of [0, 1]) for (let i = 0; i < 3; i++) renderUnit(view, side, i);
  renderEnergy(view.sides.map((s) => s.energy));
  $('#b-turn').textContent = `ターン ${Math.min(view.turn, MAX_TURNS)} / ${MAX_TURNS}`;
}
function renderEnergy(values) {
  for (const side of [0, 1]) $('#en-' + rowOf(side)).textContent = `⚡${values[side]}`;
}
function say(text) { $('#msg').innerHTML = text; }

// ---- 指示を出す ----
function startCommand() {
  if (!session || session.closed || session.state.phase !== 'select') return;
  const st = session.state;
  session.cmds = [0, 1, 2].map(() => null);
  session.picking = null;
  session.cursor = aliveIdx(st.sides[session.me])[0];
  document.querySelectorAll('.u-cmd').forEach((x) => (x.textContent = ''));
  startTimer();
  drawPanel();
}
const myEnergyLeft = () => session.state.sides[session.me].energy - cmdsCost(session.cmds);

function drawPanel() {
  const st = session.state, me = session.me;
  const mySide = st.sides[me];
  clearTargeting();
  // 指示の表示
  for (let i = 0; i < 3; i++) {
    const t = tileOf(me, i);
    const c = session.cmds[i];
    t.querySelector('.u-cmd').textContent = c ? SKILLS[c.skill].name + (c.target != null && needsTarget(c.skill) ? ` → ${st.sides[SKILLS[c.skill].target === 'enemy' ? 1 - me : me].team[c.target].name}` : '') : '';
    t.classList.toggle('cursor', i === session.cursor && !session.done);
  }
  const panel = $('#panel');
  const left = myEnergyLeft();
  const energyBar = `<div class="en-bar"><span>⚡ エネルギー</span><div class="en-dots">${Array.from({ length: ENERGY.max }, (_, k) => `<i class="${k < left ? 'on' : k < mySide.energy ? 'used' : ''}"></i>`).join('')}</div><b>${left}</b></div>`;
  const alive = aliveIdx(mySide);
  const allSet = alive.every((i) => session.cmds[i]);
  if (session.cursor == null || allSet && session.cursor === -1) {
    say('指示がそろいました');
    panel.innerHTML = energyBar + `<p class="p-hint">変えたいウツシをタップすると、指示をやり直せます</p><button class="btn btn-hero" id="b-go">ターン開始！</button>`;
    $('#b-go').onclick = () => submit(session.cmds.slice());
    return;
  }
  const i = session.cursor;
  const f = mySide.team[i];
  say(`<b>${esc(f.name)}</b> への指示（${alive.indexOf(i) + 1} / ${alive.length}）`);
  panel.innerHTML = energyBar + `<div class="sk-grid">${f.skills.map((key) => {
    const sk = SKILLS[key];
    const ok = sk.cost <= left + (session.cmds[i] ? SKILLS[session.cmds[i].skill].cost : 0);
    return `<button class="sk-btn ${key === 'attack' ? 'main' : key === 'guard' ? 'guard' : 'skill'}" data-sk="${key}" ${ok ? '' : 'disabled'}><span class="sk-n">${sk.name}</span>${sk.cost ? `<span class="sk-c">⚡${sk.cost}</span>` : ''}<span class="sk-d">${sk.desc}</span></button>`;
  }).join('')}</div>`;
  panel.querySelectorAll('[data-sk]').forEach((b) => (b.onclick = () => chooseSkill(i, b.dataset.sk)));
}

function chooseSkill(i, key) {
  const sk = SKILLS[key];
  if (!needsTarget(key)) { setCmd(i, { skill: key, target: null }); return; }
  const st = session.state, me = session.me;
  const tSide = sk.target === 'enemy' ? 1 - me : me;
  const f = st.sides[me].team[i];
  session.picking = { i, key };
  say(sk.target === 'enemy' ? `<b>${sk.name}</b>：ねらう相手をタップ` : `<b>${sk.name}</b>：味方をタップ`);
  $('#panel').innerHTML = `<button class="btn btn-sub" id="b-cancel">もどる</button>`;
  $('#b-cancel').onclick = () => { session.picking = null; drawPanel(); };
  for (const t of aliveIdx(st.sides[tSide])) {
    if (key === 'cover' && t === i) continue;
    const el = tileOf(tSide, t);
    el.classList.add('target');
    if (sk.target === 'enemy') {
      const adv = hueAdv(f.hue, st.sides[tSide].team[t].hue);
      el.querySelector('.u-adv').innerHTML = adv > 0 ? '<span class="adv good">相性◎</span>' : adv < 0 ? '<span class="adv bad">相性△</span>' : '';
    }
  }
}
function clearTargeting() {
  document.querySelectorAll('.unit.target').forEach((x) => x.classList.remove('target'));
  document.querySelectorAll('.u-adv').forEach((x) => (x.innerHTML = ''));
}
function setCmd(i, cmd) {
  session.cmds[i] = cmd;
  session.picking = null;
  const alive = aliveIdx(session.state.sides[session.me]);
  const next = alive.find((k) => !session.cmds[k]);
  session.cursor = next == null ? -1 : next;
  drawPanel();
}
$('#table').addEventListener('click', (e) => {
  if (!session || session.busy || session.submitted) return;
  const t = e.target.closest('.unit'); if (!t) return;
  const side = +t.dataset.side, i = +t.dataset.i;
  if (session.picking) {
    if (!t.classList.contains('target')) return;
    setCmd(session.picking.i, { skill: session.picking.key, target: i });
    return;
  }
  if (side === session.me && session.state.sides[side].team[i].hp > 0) {
    session.cmds[i] = null; session.cursor = i; drawPanel();
  }
});

function startTimer() {
  clearInterval(session.timerId);
  const el = $('#b-timer');
  if (session.mode !== 'online') { el.textContent = ''; return; }
  let left = 60;
  el.textContent = `⏱ ${left}`; el.classList.remove('hurry');
  session.timerId = setInterval(() => {
    left--; el.textContent = `⏱ ${left}`; el.classList.toggle('hurry', left <= 10);
    if (left <= 0) {
      clearInterval(session.timerId);
      // 残りは「こうげき」で埋める
      const st = session.state, me = session.me;
      const foes = aliveIdx(st.sides[1 - me]);
      for (const i of aliveIdx(st.sides[me])) if (!session.cmds[i]) session.cmds[i] = { skill: 'attack', target: foes[0] };
      if (!cmdsValid(st, me, session.cmds)) session.cmds = session.cmds.map((c, i) => (st.sides[me].team[i].hp > 0 ? { skill: 'attack', target: foes[0] } : null));
      submit(session.cmds.slice());
    }
  }, 1000);
}

function submit(cmds) {
  clearInterval(session.timerId); $('#b-timer').textContent = '';
  const me = session.me, st = session.state;
  if (!cmdsValid(st, me, cmds)) { toast('指示を確認してね'); return; }
  session.submitted = true;
  document.querySelectorAll('.unit.cursor').forEach((x) => x.classList.remove('cursor'));
  $('#panel').innerHTML = '<p class="p-hint dots">相手の指示を待っています</p>';
  if (session.mode === 'cpu') {
    session.pending = [null, null];
    session.pending[me] = cmds;
    session.pending[1 - me] = cpuCommands(st, 1 - me);
    runTurn();
    return;
  }
  if (me === 0) { session.pending[0] = cmds; tryResolveHost(); }
  else session.link.send({ t: 'cmds', turn: st.turn, cmds });
}

function tryResolveHost() {
  if (session.pending[0] && session.pending[1]) runTurn();
}
function runTurn() {
  const acts = session.pending; session.pending = [null, null];
  const before = clone(session.state);
  const { state, events } = resolveTurn(session.state, acts);
  session.state = state;
  if (session.mode === 'online') session.link.send({ t: 'res', state, events });
  playEvents(before, events, state);
}

function onBattleData(d) {
  const st = session.state;
  if (d.t === 'cmds' && session.me === 0) {
    if (d.turn !== st.turn || session.pending[1]) return;
    const cmds = Array.isArray(d.cmds) ? d.cmds.map((c) => (c ? { skill: String(c.skill), target: c.target == null ? null : +c.target } : null)) : null;
    if (!cmds || !cmdsValid(st, 1, cmds)) return;
    session.pending[1] = cmds;
    tryResolveHost();
  } else if (d.t === 'res' && session.me === 1) {
    const before = clone(session.state);
    session.state = d.state;
    playEvents(before, d.events, d.state);
  } else if (d.t === 'rematch') {
    session.rematch[1 - session.me] = true; checkRematch();
  } else if (d.t === 'restart' && session.me === 1) {
    const { teams, names, link: lk } = session;
    session.link = null; endBattleSession(); link = lk;
    startBattle({ mode: 'online', me: 1, teams, names, seed: d.seed >>> 0, link: lk });
  }
}

// ---- 演出 ----
function fxOn(side, i, cls, html) {
  const el = tileOf(side, i), table = $('#table');
  const tr = table.getBoundingClientRect(), r = el.getBoundingClientRect();
  const fx = document.createElement('div');
  fx.className = 'fx ' + cls; fx.innerHTML = html;
  fx.style.left = r.left - tr.left + r.width / 2 + 'px'; fx.style.top = r.top - tr.top + r.height * 0.35 + 'px';
  table.appendChild(fx);
  setTimeout(() => fx.remove(), 1100);
}
function anim(side, i, cls) {
  const el = tileOf(side, i);
  el.classList.remove('act-me', 'act-foe', 'hit', 'pulse'); void el.offsetWidth; el.classList.add(cls);
}
const who = (side, view, i) => `${side === session.me ? '' : '相手の'}<b>${esc(view.sides[side].team[i].name)}</b>`;

async function playEvents(view, events, finalState) {
  session.busy = true; session.submitted = false;
  session.tags = [[{}, {}, {}], [{}, {}, {}]];
  document.querySelectorAll('.u-cmd').forEach((x) => (x.textContent = ''));
  $('#panel').innerHTML = '';
  for (const ev of events) {
    if (!session || session.closed) return;
    const tg = ev.side != null && ev.i != null ? session.tags[ev.side][ev.i] : null;
    switch (ev.t) {
      case 'turn': $('#b-turn').textContent = `ターン ${ev.turn} / ${MAX_TURNS}`; break;
      case 'guard': tg.guard = true; renderUnit(view, ev.side, ev.i); anim(ev.side, ev.i, 'pulse'); say(`${who(ev.side, view, ev.i)} は ガードのかまえ`); await sleep(450); break;
      case 'cover': tg.cover = true; renderUnit(view, ev.side, ev.i); anim(ev.side, ev.i, 'pulse'); say(`${who(ev.side, view, ev.i)} が ${esc(view.sides[ev.side].team[ev.ally].name)} の前に立った`); await sleep(650); break;
      case 'barrier':
        for (let k = 0; k < 3; k++) { session.tags[ev.side][k].barrier = true; renderUnit(view, ev.side, k); }
        anim(ev.side, ev.i, 'pulse'); say(`${who(ev.side, view, ev.i)} の バリア！ 味方全員を守る`); await sleep(700); break;
      case 'act': {
        const sk = SKILLS[ev.skill];
        say(`${who(ev.side, view, ev.i)} の ${sk.name}！`);
        if (ev.skill !== 'attack') {
          const bn = $('#banner'); bn.textContent = sk.name; bn.style.setProperty('--uc', ucol(session.teams[ev.side][ev.i]));
          bn.classList.remove('show'); void bn.offsetWidth; bn.classList.add('show');
        }
        anim(ev.side, ev.i, sk.power ? (rowOf(ev.side) === 0 ? 'act-me' : 'act-foe') : 'pulse');
        await sleep(sk.power ? 420 : 600); break;
      }
      case 'fail': view.sides[ev.side].team[ev.i].dazzled = false; renderUnit(view, ev.side, ev.i); say(`${who(ev.side, view, ev.i)} は まぶしくて 動けなかった`); await sleep(750); break;
      case 'hit': {
        const f = view.sides[ev.side].team[ev.i];
        f.hp = ev.hp; renderUnit(view, ev.side, ev.i);
        anim(ev.side, ev.i, 'hit');
        const note = ev.adv > 0 ? '<em class="good">相性◎</em>' : ev.adv < 0 ? '<em class="bad">相性△</em>' : '';
        fxOn(ev.side, ev.i, 'num' + (ev.crit ? ' crit' : ''), `${note}${ev.crit ? '<em>会心</em>' : ''}-${ev.amount}`);
        if (ev.cover) say(`${who(ev.side, view, ev.i)} が かわりに受けた！`);
        await sleep(430); break;
      }
      case 'heal': {
        const f = view.sides[ev.side].team[ev.i];
        f.hp = ev.hp; renderUnit(view, ev.side, ev.i);
        fxOn(ev.side, ev.i, 'num heal', `+${ev.amount}`); await sleep(500); break;
      }
      case 'status': {
        const f = view.sides[ev.side].team[ev.i];
        if (ev.st === 'slow') f.slowTurns = 2;
        if (ev.st === 'dazzle') f.dazzled = true;
        if (ev.st === 'charge') { f.charged = true; say(`${who(ev.side, view, ev.i)} は 力をためている`); }
        renderUnit(view, ev.side, ev.i); await sleep(ev.st === 'charge' ? 600 : 200); break;
      }
      case 'down': await sleep(200); view.sides[ev.side].team[ev.i].hp = 0; renderUnit(view, ev.side, ev.i); say(`${who(ev.side, view, ev.i)} は 力つきた`); await sleep(700); break;
      case 'energy': renderEnergy(ev.values); break;
      case 'end': if (ev.timeup) { say('時間切れ！ 残り体力で判定'); await sleep(900); } break;
    }
  }
  session.tags = null;
  renderAll(finalState);
  session.busy = false;
  if (finalState.phase === 'end') { await sleep(400); showResult(finalState.winner); return; }
  startCommand();
}

function checkRematch() {
  const r = session.rematch;
  const note = document.getElementById('rm-note');
  if (note) note.textContent = r[1 - session.me] ? '相手は「もう一度」を押しています' : '';
  if (r[0] && r[1] && session.me === 0) {
    const seed = (Math.random() * 2 ** 32) >>> 0;
    const s = session; const lk = s.link;
    lk.send({ t: 'restart', seed });
    s.link = null; endBattleSession(); link = lk;
    startBattle({ mode: 'online', me: 0, teams: s.teams, names: s.names, seed, link: lk });
  }
}

function showResult(winner, reason) {
  if (!session) return;
  clearInterval(session.timerId);
  const win = winner === session.me;
  const title = reason ? '対戦終了' : winner === -1 ? 'ひきわけ' : win ? 'WIN!' : 'LOSE…';
  const online = session.mode === 'online' && !reason;
  const body = modal(`<div class="sheet" style="text-align:center">
    <p class="result-title ${win ? 'win' : 'lose'}">${title}</p>
    <p>${reason ? esc(reason) : `${esc(session.names[0])} vs ${esc(session.names[1])}`}</p>
    <div style="display:flex;justify-content:center;gap:6px;margin:10px 0">${session.teams[session.me].map((m) => `<img class="sticker" src="${m.img}" style="height:70px;width:30%;object-fit:contain" alt="">`).join('')}</div>
    <p id="rm-note"></p>
    ${reason ? '' : '<button class="btn btn-hero" id="r-again">もう一度</button>'}
    <button class="btn btn-sub" id="r-home">ホームへ</button></div>`, { close: false });
  const again = body.querySelector('#r-again');
  if (again) again.onclick = () => {
    if (session.mode === 'cpu') {
      const seed = (Math.random() * 2 ** 32) >>> 0;
      const s = session; endBattleSession();
      startBattle({ mode: 'cpu', me: 0, teams: [s.teams[0], makeCpuTeam(seed)], names: s.names, seed });
      return;
    }
    if (online) {
      session.rematch[session.me] = true; session.link.send({ t: 'rematch' });
      again.disabled = true; again.textContent = '相手を待っています…'; checkRematch();
    }
  };
  if (online) checkRematch();
  body.querySelector('#r-home').onclick = () => { closeModal(); go('home'); };
}

$('#btn-quit').onclick = () => {
  if (!confirm('バトルをやめて ホームにもどりますか？')) return;
  go('home');
};

// ===== 起動 =====
(async () => {
  const saved = store.get('mons', null);
  if (saved) {
    units = await migrate(saved);
    if (units.length < 3) units = units.concat(makeStarters());
    if (JSON.stringify(units) !== JSON.stringify(saved)) saveUnits();
  } else { units = makeStarters(); saveUnits(); }
  team = store.get('team', []).filter((id) => units.some((m) => m.id === id));
  for (const m of units) if (team.length < 3 && !team.includes(m.id)) team.push(m.id);
  saveTeam();
  go('home');
})();
