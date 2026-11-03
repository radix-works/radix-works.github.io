import { ELEMENTS, MOVES, ABILITIES, STAT_LABELS, RARITY, typeMult } from './data.js';
import { createBattle, resolveTurn, legalActions, isLegal, cpuChoose, activeOf } from './battle.js';
import { makeCreature } from './creature.js';
import { fileToCanvas, cutout, loadSegmenter, canvasToDataUrl } from './cutout.js';
import { makeStarters, makeCpuTeam } from './starters.js';
import { Link } from './net.js';

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ===== 保存 =====
const store = {
  get(k, d) { try { const v = localStorage.getItem('utsushi.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('utsushi.' + k, JSON.stringify(v)); return true; } catch { toast('保存できませんでした（容量がいっぱいかもしれません）'); return false; } },
};
let mons = store.get('mons', null);
if (!mons) { mons = makeStarters(); store.set('mons', mons); store.set('team', mons.map((m) => m.id)); }
let team = store.get('team', []).filter((id) => mons.some((m) => m.id === id));
const saveMons = () => store.set('mons', mons);
const saveTeam = () => store.set('team', team);
const monById = (id) => mons.find((m) => m.id === id);
const teamMons = () => team.map(monById).filter(Boolean);

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
const elStyle = (el) => `--elc:${ELEMENTS[el].color}`;
const badge = (el) => `<span class="el-badge" style="${elStyle(el)}">${ELEMENTS[el].name}</span>`;
const stars = (r) => '★'.repeat(RARITY[r].stars);
function moveDesc(mv) {
  if (mv.kind === 'atk') {
    let s = `威力${mv.pow}`;
    if (mv.acc < 100) s += `・命中${mv.acc}`;
    if (mv.prio) s += '・先制';
    if (mv.drain) s += '・HP吸収';
    if (mv.burn) s += '・やけど';
    if (mv.para) s += '・しびれ';
    if (mv.crit) s += '・急所';
    return s;
  }
  if (mv.kind === 'heal') return 'HP回復';
  if (mv.kind === 'buff') return `${STAT_LABELS[mv.stat]}↑↑`;
  return `相手の${STAT_LABELS[mv.stat]}↓↓`;
}
function cardHTML(m, { edit = false } = {}) {
  const ab = ABILITIES[m.ability];
  return `<div class="card r-${m.rarity}" style="${elStyle(m.element)}">
    <div class="card-head">${badge(m.element)}<span class="card-name">${esc(m.name)}</span><span class="rarity">${stars(m.rarity)} ${m.rarity}</span></div>
    <div class="card-art"><img class="sticker" src="${m.img}" alt=""></div>
    <div class="stats">${Object.keys(STAT_LABELS).map((k) => `<div class="stat"><span>${STAT_LABELS[k]}</span><b>${m.stats[k]}</b><div class="bar-bg"><div class="bar-fg" style="width:${Math.min(100, (m.stats[k] / 140) * 100)}%"></div></div></div>`).join('')}</div>
    <div class="ability"><b>とくせい：${ab.name}</b><br>${ab.desc}</div>
    <div class="moves">${m.moves.map((k) => { const mv = MOVES[k]; return `<div class="move-chip" style="--mc:${mv.el ? ELEMENTS[mv.el].color : '#aab'}"><span class="el-dot"></span><b>${mv.name}</b><span>${moveDesc(mv)}</span></div>`; }).join('')}</div>
    ${edit ? `<div class="name-edit"><input id="in-rename" maxlength="10" value="${esc(m.name)}" aria-label="名前"><button class="btn btn-sub" id="btn-rename" style="width:auto">名前を変える</button></div>` : ''}
  </div>`;
}
function miniHTML(m, extra = '') {
  return `<div class="mini" data-id="${m.id}" style="${elStyle(m.element)}">${badge(m.element)}<span class="rar">${m.rarity}</span><img class="sticker" src="${m.img}" alt="" loading="lazy"><span class="mn">${esc(m.name)}</span>${extra}</div>`;
}

// ===== ホーム =====
onShow.home = () => {
  $('#home-team').innerHTML = teamMons().map((m) => `<img class="sticker" src="${m.img}" alt="">`).join('');
};
$('#btn-howto').onclick = () => {
  const rows = [['火', '草', '水'], ['水', '火', '草・雷'], ['草', '水・雷', '火'], ['雷', '水', '草'], ['光', '闇', '闇'], ['闇', '光', '光']];
  modal(`<div class="sheet"><h3>あそびかた</h3>
    <ol><li>身のまわりの物を撮って、切り抜きたい物をタップ</li><li>色・形・大きさから、属性・ステータス・わざ・とくせいが自動で決まる</li><li>3体でチームを組んで、CPUや友だちとバトル！</li></ol>
    <h3>属性の相性</h3>
    <table class="chart"><tr><td></td><td><b>強い相手</b>（2倍）</td><td><b>苦手な相手</b></td></tr>${rows.map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join('')}</table>
    <p>赤・オレンジ→火 ／ 青→水 ／ 緑→草 ／ 黄色→雷 ／ 白・ピンク→光 ／ 黒・紫→闇<br>同じ属性のわざは威力1.5倍。まるい物は硬く、細長い物は速く、トゲトゲした物は急所に当てやすい…など、形も能力に影響します。</p>
    <button class="btn btn-sub" id="m-close">とじる</button></div>`);
  $('#m-close').onclick = closeModal;
};

// ===== つくる =====
let photo = null; // 元の写真キャンバス
let lastCut = null;
function aiStatus() {
  const el = $('#ai-state');
  el.textContent = 'AI準備中…';
  loadSegmenter().then(() => { el.textContent = 'AI準備OK'; }).catch(() => { el.textContent = '簡易モード'; });
}
onShow.create = () => { showStep('pick'); aiStatus(); };
function showStep(s) {
  for (const k of ['pick', 'tap', 'reveal']) $('#step-' + k).hidden = k !== s;
}
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
  stage.style.cssText = elStyle(m.element);
  stage.innerHTML = `<div class="burst"></div><div class="egg"></div>`;
  await sleep(1750);
  stage.innerHTML = `<div class="burst"></div><div class="reveal-card">${cardHTML(m, { edit: true })}</div>`;
  mons.unshift(m);
  if (!saveMons()) { mons.shift(); return; }
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
    m.name = v.slice(0, 10); saveMons();
    document.querySelectorAll('.card-name').forEach((x) => (x.textContent = m.name));
    toast('名前を変えました'); after && after();
  };
}

// ===== ずかん =====
onShow.collection = () => {
  $('#col-count').textContent = `${mons.length} 体`;
  $('#col-grid').innerHTML = mons.length ? mons.map((m) => miniHTML(m)).join('') : '<p class="empty">まだモンスターがいません</p>';
};
$('#col-grid').addEventListener('click', (e) => {
  const t = e.target.closest('.mini'); if (!t) return;
  const m = monById(t.dataset.id);
  const body = modal(`${cardHTML(m, { edit: true })}<div class="row2" style="width:100%;max-width:340px"><button class="btn btn-sub" id="m-del">逃がす</button><button class="btn btn-sub" id="m-close">とじる</button></div>`);
  bindRename(m, () => onShow.collection());
  body.querySelector('#m-close').onclick = closeModal;
  body.querySelector('#m-del').onclick = () => {
    if (!confirm(`${m.name} を逃がしますか？（元に戻せません）`)) return;
    mons = mons.filter((x) => x !== m); team = team.filter((id) => id !== m.id);
    saveMons(); saveTeam(); closeModal(); onShow.collection();
  };
});

// ===== チーム =====
onShow.team = () => {
  const tm = teamMons();
  $('#team-slots').innerHTML = [0, 1, 2].map((i) => `<div class="slot">${tm[i] ? miniHTML(tm[i], `<span class="order">${i + 1}</span>`) : `${i + 1}体目`}</div>`).join('');
  $('#team-grid').innerHTML = mons.map((m) => {
    const i = team.indexOf(m.id);
    return miniHTML(m, i >= 0 ? `<span class="order">${i + 1}</span>` : '').replace('class="mini"', `class="mini${i >= 0 ? ' sel' : ''}"`);
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
  const tm = teamMons();
  $('#lobby-team').innerHTML = tm.length === 3 ? tm.map((m) => `<img class="sticker" src="${m.img}" alt="">`).join('') : 'チームが3体そろっていません';
  resetRoom();
};
function needTeam() {
  if (teamMons().length === 3) return false;
  toast('先にチームを3体そろえてね'); go('team'); return true;
}
const packTeam = () => teamMons().map(({ id, name, element, ability, rarity, stats, moves, img }) => ({ id, name, element, ability, rarity, stats, moves, img }));
function sanitizeTeam(t) {
  // 相手から来たデータを最低限チェック
  if (!Array.isArray(t) || t.length !== 3) throw new Error('bad team');
  return t.map((m) => {
    if (!ELEMENTS[m.element] || !ABILITIES[m.ability] || !RARITY[m.rarity]) throw new Error('bad mon');
    if (!Array.isArray(m.moves) || m.moves.length !== 3 || !m.moves.every((k) => MOVES[k])) throw new Error('bad moves');
    const st = {}; let sum = 0;
    for (const k of ['hp', 'atk', 'def', 'spd']) { st[k] = Math.max(1, Math.min(140, Math.round(+m.stats[k] || 0))); sum += st[k]; }
    if (sum > RARITY.UR.total + 4) throw new Error('bad stats');
    const img = typeof m.img === 'string' && /^data:image\/(png|webp|jpeg);base64,/.test(m.img) && m.img.length < 600000 ? m.img : '';
    return { id: String(m.id).slice(0, 40), name: String(m.name).slice(0, 10), element: m.element, ability: m.ability, rarity: m.rarity, stats: st, moves: m.moves, img };
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

// オンライン：ホスト(0)が計算役、ゲスト(1)は行動を送って結果を受け取る
function setupOnline(lk, me) {
  const myTeam = packTeam();
  let foeTeam = null, foeName = '';
  lk.on('open', () => lk.send({ t: 'hello', v: 1, name: myName(), team: myTeam }));
  lk.on('close', () => {
    if (session && session.link === lk && session.state.phase !== 'end') {
      showResult(null, '相手との接続が切れました');
    } else if (current === 'lobby') { toast('接続が切れました'); resetRoom(); }
  });
  lk.on('error', (e) => { if (current === 'lobby') { toast('通信エラーが発生しました'); resetRoom(); } console.warn(e); });
  lk.on('data', (d) => {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'busy') { toast('その部屋はもう対戦中です'); resetRoom(); return; }
    if (d.t === 'hello') {
      try { foeTeam = sanitizeTeam(d.team); } catch { toast('相手のデータが正しくありません'); lk.close(); return; }
      foeName = String(d.name || '相手').slice(0, 12);
      if (me === 0) {
        const seed = (Math.random() * 2 ** 32) >>> 0;
        const teams = [myTeam, foeTeam];
        lk.send({ t: 'start', seed, teams, names: [myName(), foeName] });
        startBattle({ mode: 'online', me, teams, names: [myName(), foeName], seed, link: lk });
      }
      return;
    }
    if (d.t === 'start' && me === 1) {
      // ホストのチームは hello で検査済み。自分のチームは手元のものを使う
      const teams = [foeTeam || sanitizeTeam(d.teams[0]), myTeam];
      startBattle({ mode: 'online', me, teams, names: [String(d.names[0]).slice(0, 12), myName()], seed: d.seed >>> 0, link: lk });
      return;
    }
    session && session.link === lk && session.onData(d);
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
  const { state, events } = createBattle(teams[0], teams[1], seed);
  session = {
    mode, me, teams, names, state, link: lk || null, pending: [null, null], busy: false, closed: false,
    rematch: [false, false], timerId: 0,
    onData: (d) => onBattleData(d),
  };
  go('battle');
  $('#mon-0').className = 'mon sticker gone'; $('#mon-1').className = 'mon sticker gone';
  renderPlates(session.state, true);
  playEvents(events, session.state).then(() => askAction());
}

const foeSide = () => 1 - session.me;
// 画面上：自分は spot-0 / 相手は spot-1
const viewOf = (side) => (side === session.me ? 0 : 1);

function renderPlates(state, setImg) {
  for (const side of [0, 1]) {
    const v = viewOf(side);
    const f = activeOf(state, side);
    const sd = state.sides[side];
    renderPlate(v, f, sd);
    if (setImg) $('#mon-' + v).src = session.teams[side][sd.active].img;
  }
}
function renderPlate(v, f, sd) {
  const pct = Math.max(0, (f.hp / f.maxHp) * 100);
  const cls = pct <= 25 ? 'low' : pct <= 50 ? 'mid' : '';
  const boosts = Object.entries(f.boosts).filter(([, x]) => x).map(([k, x]) => `<span class="chip ${x > 0 ? 'up' : 'down'}">${STAT_LABELS[k]}${x > 0 ? '↑' : '↓'}${Math.abs(x)}</span>`).join('');
  const st = f.status ? `<span class="chip ${f.status}">${f.status === 'burn' ? 'やけど' : 'しびれ'}</span>` : '';
  $('#plate-' + v).innerHTML = `<div class="pn">${badge(f.el)}<span class="nm">${esc(f.name)}</span></div>
    <div class="hp"><i class="${cls}" style="width:${pct}%"></i></div>
    ${v === 0 ? `<div class="hp-txt">${f.hp} / ${f.maxHp}</div>` : ''}
    <div class="row"><span class="bench">${sd.team.map((m) => `<i class="${m.hp <= 0 ? 'dead' : ''}"></i>`).join('')}</span>${st}${boosts}</div>`;
}

function say(text) { $('#msg').innerHTML = text; }
function fxAt(v, cls, html, styles = '') {
  const spot = $('#spot-' + v), field = $('#field');
  const fr = field.getBoundingClientRect(), sr = spot.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fx ' + cls; el.innerHTML = html;
  el.style.cssText = `left:${sr.left - fr.left + sr.width / 2}px;top:${sr.top - fr.top + sr.height * 0.45}px;${styles}`;
  field.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
function anim(v, cls) {
  const m = $('#mon-' + v);
  m.classList.remove('enter', 'out', 'lunge-me', 'lunge-foe', 'hit', 'power', 'faint');
  void m.offsetWidth; m.classList.add(cls);
}
const who = (side) => (side === session.me ? '' : '相手の ');

// 計算結果（イベント）を順番に演出する。表示用の状態はイベントに合わせて少しずつ進める
async function playEvents(events, finalState) {
  session.busy = true;
  $('#cmd').innerHTML = '';
  // 表示用：最終状態のコピーに対し、HP だけイベントで追いかける
  const view = JSON.parse(JSON.stringify(finalState));
  const hpShown = {};
  for (const ev of events) {
    if (session.closed) return;
    const v = ev.side !== undefined ? viewOf(ev.side) : 0;
    const sd = ev.side !== undefined ? view.sides[ev.side] : null;
    switch (ev.t) {
      case 'turn': $('#b-turn').textContent = `ターン ${ev.turn}`; break;
      case 'enter': {
        sd.active = ev.idx;
        const f = sd.team[ev.idx];
        const shownHp = hpShown[ev.side + ':' + ev.idx];
        const tmp = { ...f, hp: shownHp ?? f.hp, boosts: { atk: 0, def: 0, spd: 0 }, status: f.status };
        $('#mon-' + v).src = session.teams[ev.side][ev.idx].img;
        anim(v, 'enter'); $('#mon-' + v).classList.remove('gone');
        renderPlate(v, tmp, sd); say(`${who(ev.side)}${esc(ev.name)} が あらわれた！`);
        await sleep(800); break;
      }
      case 'withdraw': say(`${who(ev.side)}${esc(ev.name)} は もどった`); anim(v, 'out'); await sleep(450); break;
      case 'move': {
        const mc = ev.el ? ELEMENTS[ev.el].color : '#5a6080';
        const f = sd.team[sd.active];
        say(`${who(ev.side)}${esc(f.name)} の <b>${esc(ev.name)}</b>！`);
        const bn = $('#banner'); bn.textContent = ev.name; bn.style.setProperty('--mc', mc);
        bn.classList.remove('show'); void bn.offsetWidth; bn.classList.add('show');
        anim(v, ev.kind === 'atk' ? (v === 0 ? 'lunge-me' : 'lunge-foe') : 'power');
        session.lastMc = mc;
        await sleep(650); break;
      }
      case 'skip': say(`${who(ev.side)}${esc(sd.team[sd.active].name)} は ${ev.reason}`); await sleep(900); break;
      case 'miss': say('しかし 当たらなかった！'); await sleep(800); break;
      case 'dmg': {
        const f = sd.team[sd.active];
        hpShown[ev.side + ':' + sd.active] = ev.hp;
        if (!ev.burn) fxAt(v, 'slash', '', `--mc:${session.lastMc || '#fff'}`);
        anim(v, 'hit');
        fxAt(v, 'dmg-num' + (ev.mult > 1 || ev.crit ? ' big' : ''), `-${ev.amount}`);
        renderPlate(v, { ...f, hp: ev.hp }, sd);
        const notes = [];
        if (ev.burn) notes.push(`${who(ev.side)}${esc(f.name)} は やけどのダメージ！`);
        if (ev.crit) notes.push('急所に当たった！');
        if (ev.mult > 1) notes.push('こうかは ばつぐんだ！');
        if (ev.mult < 1) notes.push('こうかは いまひとつ…');
        if (notes.length) say(notes.join(' '));
        await sleep(notes.length ? 950 : 650); break;
      }
      case 'heal': {
        const f = sd.team[sd.active];
        hpShown[ev.side + ':' + sd.active] = ev.hp;
        fxAt(v, 'dmg-num heal', `+${ev.amount}`);
        renderPlate(v, { ...f, hp: ev.hp }, sd);
        say(`${who(ev.side)}${esc(f.name)} の HP が 回復した${ev.cause ? `（${ev.cause}）` : ''}`);
        await sleep(800); break;
      }
      case 'status': {
        const f = sd.team[sd.active];
        say(`${who(ev.side)}${esc(f.name)} は ${ev.st === 'burn' ? 'やけどを負った！' : 'しびれてしまった！'}`);
        await sleep(850); break;
      }
      case 'boost': {
        const f = sd.team[sd.active];
        if (!ev.delta) { say(`${who(ev.side)}${esc(f.name)} の ${STAT_LABELS[ev.stat]} は もう変わらない`); await sleep(700); break; }
        fxAt(v, 'boost-fx', ev.delta > 0 ? '⬆️' : '⬇️');
        say(`${ev.cause ? `【${ev.cause}】 ` : ''}${who(ev.side)}${esc(f.name)} の ${STAT_LABELS[ev.stat]} が ${ev.delta > 0 ? '上がった！' : '下がった！'}`);
        await sleep(850); break;
      }
      case 'faint': anim(v, 'faint'); say(`${who(ev.side)}${esc(ev.name)} は たおれた！`); await sleep(1000); break;
      case 'end': break;
    }
  }
  renderPlates(finalState, false);
  session.busy = false;
  if (finalState.phase === 'end') showResult(finalState.winner);
}

function askAction() {
  if (!session || session.closed || session.busy) return;
  const st = session.state;
  if (st.phase === 'end') return;
  const me = session.me;
  const acts = legalActions(st, me);
  if (!acts.length) { // 自分は交代不要（相手だけ交代中）
    $('#cmd').innerHTML = '<p class="wait-msg dots">相手が交代を選んでいます</p>';
    say('相手が 次のモンスターを えらんでいます');
    submit(null); return;
  }
  if (st.phase === 'replace') { showSwitchMenu(true); return; }
  showMoveMenu();
}

function showMoveMenu() {
  const st = session.state, me = session.me;
  const f = activeOf(st, me), foe = activeOf(st, foeSide());
  say(`${esc(f.name)} は どうする？`);
  const movesHtml = f.moves.map((m, i) => {
    const mv = MOVES[m.key];
    const mult = mv.kind === 'atk' ? typeMult(mv.el, foe.el) : 1;
    const eff = mult > 1 ? '<span class="eff">ばつぐん</span>' : mult < 1 ? '<span class="eff weak">いまひとつ</span>' : '';
    return `<button class="mv-btn" data-mv="${i}" style="--mc:${mv.el ? ELEMENTS[mv.el].color : '#6d7391'}" ${m.pp <= 0 ? 'disabled' : ''}>${eff}<span class="mv-n">${mv.name}</span><span class="mv-d">${moveDesc(mv)}｜のこり${m.pp}</span></button>`;
  }).join('');
  const struggle = f.moves.every((m) => m.pp <= 0) ? '<button class="mv-btn" data-mv="-1"><span class="mv-n">わるあがき</span><span class="mv-d">わざが尽きた</span></button>' : '';
  const canSwitch = legalActions(st, me).some((a) => a.type === 'switch');
  $('#cmd').innerHTML = movesHtml + struggle + `<button class="mv-btn switch" id="b-sw" ${canSwitch ? '' : 'disabled'}><span class="mv-n">🔄 交代</span><span class="mv-d">ひかえと入れかえる</span></button>`;
  $('#cmd').querySelectorAll('[data-mv]').forEach((b) => (b.onclick = () => submit({ type: 'move', idx: +b.dataset.mv })));
  $('#b-sw').onclick = () => showSwitchMenu(false);
  startTimer();
}

function showSwitchMenu(forced) {
  const st = session.state, me = session.me;
  const sd = st.sides[me];
  if (forced) say('次に出す モンスターを えらんでね');
  $('#cmd').innerHTML = sd.team.map((m, i) => {
    const ok = i !== sd.active && m.hp > 0;
    return `<button class="mv-btn sw-btn" data-sw="${i}" style="--mc:${ELEMENTS[m.el].color}" ${ok ? '' : 'disabled'}><img class="sticker" src="${session.teams[me][i].img}" alt=""><span><span class="mv-n">${esc(m.name)}</span><span class="mv-d">HP ${m.hp}/${m.maxHp}${i === sd.active ? '・場に出ている' : ''}</span></span></button>`;
  }).join('') + (forced ? '' : '<button class="mv-btn back-btn" id="b-back"><span class="mv-n">もどる</span></button>');
  $('#cmd').querySelectorAll('[data-sw]').forEach((b) => (b.onclick = () => submit({ type: 'switch', to: +b.dataset.sw })));
  if (!forced) $('#b-back').onclick = showMoveMenu;
  startTimer();
}

function startTimer() {
  clearInterval(session.timerId);
  const el = $('#b-timer');
  if (session.mode !== 'online') { el.textContent = ''; return; }
  let left = 45;
  el.textContent = `⏱ ${left}`; el.classList.remove('hurry');
  session.timerId = setInterval(() => {
    left--; el.textContent = `⏱ ${left}`; el.classList.toggle('hurry', left <= 10);
    if (left <= 0) {
      clearInterval(session.timerId);
      const acts = legalActions(session.state, session.me);
      if (acts.length) submit(acts[0]);
    }
  }, 1000);
}

function submit(action) {
  clearInterval(session.timerId); $('#b-timer').textContent = '';
  const me = session.me, st = session.state;
  if (action) {
    $('#cmd').innerHTML = '<p class="wait-msg dots">相手を待っています</p>';
  }
  if (session.mode === 'cpu') {
    const foe = foeSide();
    session.pending[me] = action;
    session.pending[foe] = legalActions(st, foe).length ? cpuChoose(st, foe) : null;
    runTurn();
    return;
  }
  // オンライン
  if (me === 0) { session.pending[0] = action; tryResolveHost(); }
  else session.link.send({ t: 'act', turn: st.turn, phase: st.phase, a: action });
}

function needs(st, s) { return legalActions(st, s).length > 0; }
function tryResolveHost() {
  const st = session.state;
  for (const s of [0, 1]) if (needs(st, s) && !session.pending[s]) return;
  runTurn();
}
function runTurn() {
  const acts = session.pending; session.pending = [null, null];
  const { state, events } = resolveTurn(session.state, acts);
  session.state = state;
  if (session.mode === 'online') session.link.send({ t: 'res', state, events });
  playEvents(events, state).then(() => askAction());
}

function onBattleData(d) {
  const st = session.state;
  if (d.t === 'act' && session.me === 0) {
    if (d.turn !== st.turn || d.phase !== st.phase) return;
    const a = d.a;
    if (needs(st, 1)) {
      if (!a || !isLegal(st, 1, a)) return;
      session.pending[1] = { type: a.type, idx: a.idx, to: a.to };
    }
    tryResolveHost();
  } else if (d.t === 'res' && session.me === 1) {
    session.state = d.state;
    playEvents(d.events, d.state).then(() => askAction());
  } else if (d.t === 'rematch') {
    session.rematch[1 - session.me] = true; checkRematch();
  } else if (d.t === 'restart' && session.me === 1) {
    const teams = session.teams, names = session.names, lk = session.link;
    session.link = null; endBattleSession();
    link = lk;
    startBattle({ mode: 'online', me: 1, teams, names, seed: d.seed >>> 0, link: lk });
  }
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

go('home');
