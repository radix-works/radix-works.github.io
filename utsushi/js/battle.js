// バトルの計算（画面とは切り離した純粋なロジック）
// オンライン対戦ではホスト側だけがこれを動かし、結果を相手に送る。
import { MOVES, typeMult } from './data.js';

export function rngNext(state) {
  // mulberry32（状態に種を持たせて再現できるようにする）
  let t = (state.seed = (state.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function maxHpOf(mon) {
  const base = mon.stats.hp * 2 + 60;
  return Math.round(mon.ability === 'ookii' ? base * 1.12 : base);
}

function toFighter(mon) {
  const hp = maxHpOf(mon);
  return {
    id: mon.id, name: mon.name, el: mon.element, ability: mon.ability,
    stats: { ...mon.stats }, maxHp: hp, hp,
    moves: mon.moves.map((k) => ({ key: k, pp: MOVES[k].pp })),
    status: null, boosts: { atk: 0, def: 0, spd: 0 }, fresh: true,
  };
}

export function createBattle(teamA, teamB, seed) {
  const state = {
    seed: seed >>> 0, turn: 1, phase: 'select', winner: null,
    sides: [
      { team: teamA.map(toFighter), active: 0, needReplace: false },
      { team: teamB.map(toFighter), active: 0, needReplace: false },
    ],
  };
  const events = [];
  for (let s = 0; s < 2; s++) onEnter(state, s, events);
  return { state, events };
}

const stageMult = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
export function effStat(f, stat) {
  let v = f.stats[stat] * stageMult(f.boosts[stat] || 0);
  if (stat === 'atk' && f.status === 'burn') v *= 0.75;
  if (stat === 'spd' && f.status === 'para') v *= 0.5;
  return v;
}
export const activeOf = (state, s) => state.sides[s].team[state.sides[s].active];

function onEnter(state, s, ev) {
  const f = activeOf(state, s);
  f.fresh = true;
  ev.push({ t: 'enter', side: s, idx: state.sides[s].active, name: f.name });
  if (f.ability === 'nobi') changeStage(state, s, 'spd', 1, ev, 'のっぽ');
  if (f.ability === 'kagemono') {
    const o = activeOf(state, 1 - s);
    if (o && o.hp > 0) changeStage(state, 1 - s, 'atk', -1, ev, 'いあつかん');
  }
}

function changeStage(state, s, stat, delta, ev, cause) {
  const f = activeOf(state, s);
  const before = f.boosts[stat];
  f.boosts[stat] = Math.max(-3, Math.min(3, before + delta));
  ev.push({ t: 'boost', side: s, stat, delta: f.boosts[stat] - before, cause });
}

export function legalActions(state, s) {
  const side = state.sides[s];
  const f = activeOf(state, s);
  const switches = side.team.map((m, i) => ({ type: 'switch', to: i }))
    .filter((a) => a.to !== side.active && side.team[a.to].hp > 0);
  if (state.phase === 'replace') return side.needReplace ? switches : [];
  const moves = f.moves.map((m, i) => ({ type: 'move', idx: i })).filter((a) => f.moves[a.idx].pp > 0);
  return moves.length ? [...moves, ...switches] : [{ type: 'move', idx: -1 }, ...switches];
}

export function isLegal(state, s, a) {
  return legalActions(state, s).some((x) => x.type === a.type && (x.idx === a.idx) && (x.to === a.to));
}

function damageCalc(state, atkSide, mv) {
  const a = activeOf(state, atkSide);
  const d = activeOf(state, 1 - atkSide);
  let crit = (mv.crit || 0.0625) + (a.ability === 'togatta' ? 0.12 : 0);
  const isCrit = rngNext(state) < crit;
  const atk = isCrit ? Math.max(effStat(a, 'atk'), a.stats.atk) : effStat(a, 'atk');
  const def = isCrit ? Math.min(effStat(d, 'def'), d.stats.def) : effStat(d, 'def');
  let dmg = (22 * mv.pow * (atk / def)) / 30 + 2;
  if (mv.el && mv.el === a.el) dmg *= a.ability === 'shinpuru' ? 1.6 : 1.5;
  let mult = typeMult(mv.el, d.el);
  if (mult > 1 && d.ability === 'colorful') mult = 1.5;
  dmg *= mult;
  if (isCrit) dmg *= 1.5;
  if (d.ability === 'marui') dmg *= 0.85;
  dmg *= 0.85 + rngNext(state) * 0.15;
  return { dmg: Math.max(1, Math.floor(dmg)), mult, isCrit };
}

function useMove(state, s, idx, ev) {
  const a = activeOf(state, s);
  const d = activeOf(state, 1 - s);
  let mv;
  if (idx < 0) mv = { name: 'わるあがき', el: null, kind: 'atk', pow: 40, acc: 100 };
  else { a.moves[idx].pp--; mv = MOVES[a.moves[idx].key]; }

  if (a.status === 'para' && rngNext(state) < 0.25) {
    ev.push({ t: 'skip', side: s, reason: 'しびれて動けない！' });
    return;
  }
  ev.push({ t: 'move', side: s, name: mv.name, el: mv.el, kind: mv.kind });

  if (mv.kind === 'heal') {
    const amt = Math.min(a.maxHp - a.hp, Math.round(a.maxHp * mv.ratio));
    a.hp += amt;
    ev.push({ t: 'heal', side: s, amount: amt, hp: a.hp });
    return;
  }
  if (mv.kind === 'buff') { changeStage(state, s, mv.stat, mv.stages, ev); return; }
  if (mv.kind === 'debuff') { changeStage(state, 1 - s, mv.stat, mv.stages, ev); return; }

  if (rngNext(state) * 100 >= mv.acc) { ev.push({ t: 'miss', side: s }); return; }
  const { dmg, mult, isCrit } = damageCalc(state, s, mv);
  const real = Math.min(d.hp, dmg);
  d.hp -= real;
  ev.push({ t: 'dmg', side: 1 - s, amount: real, hp: d.hp, mult, crit: isCrit });
  if (mv.drain && real > 0) {
    const amt = Math.min(a.maxHp - a.hp, Math.round(real * mv.drain));
    if (amt > 0) { a.hp += amt; ev.push({ t: 'heal', side: s, amount: amt, hp: a.hp }); }
  }
  if (d.hp <= 0) { ev.push({ t: 'faint', side: 1 - s, name: d.name }); return; }
  if (!d.status) {
    if (mv.burn && d.el !== 'fire' && rngNext(state) < mv.burn) { d.status = 'burn'; ev.push({ t: 'status', side: 1 - s, st: 'burn' }); }
    else if (mv.para && d.el !== 'bolt' && rngNext(state) < mv.para) { d.status = 'para'; ev.push({ t: 'status', side: 1 - s, st: 'para' }); }
  }
}

function doSwitch(state, s, to, ev) {
  const side = state.sides[s];
  const out = activeOf(state, s);
  out.boosts = { atk: 0, def: 0, spd: 0 };
  ev.push({ t: 'withdraw', side: s, name: out.name });
  side.active = to;
  onEnter(state, s, ev);
}

const alive = (side) => side.team.some((m) => m.hp > 0);

function checkEnd(state, ev) {
  const a0 = alive(state.sides[0]);
  const a1 = alive(state.sides[1]);
  if (a0 && a1) return false;
  state.phase = 'end';
  state.winner = a0 ? 0 : a1 ? 1 : -1;
  ev.push({ t: 'end', winner: state.winner });
  return true;
}

function priorityOf(state, s, act) {
  if (act.type === 'switch') return 10;
  if (act.idx < 0) return 0;
  return MOVES[activeOf(state, s).moves[act.idx].key].prio || 0;
}

// 選択フェーズ：両者の行動を受け取り 1 ターン進める
export function resolveTurn(state, acts) {
  const ev = [];
  if (state.phase === 'replace') return resolveReplace(state, acts, ev);
  ev.push({ t: 'turn', turn: state.turn });
  const order = [0, 1].sort((x, y) => {
    const p = priorityOf(state, y, acts[y]) - priorityOf(state, x, acts[x]);
    if (p) return p;
    const sp = effStat(activeOf(state, y), 'spd') - effStat(activeOf(state, x), 'spd');
    if (sp) return sp;
    return 0;
  });
  if (priorityOf(state, 0, acts[0]) === priorityOf(state, 1, acts[1]) &&
      effStat(activeOf(state, 0), 'spd') === effStat(activeOf(state, 1), 'spd') && rngNext(state) < 0.5) order.reverse();

  for (const s of order) {
    const f = activeOf(state, s);
    if (f.hp <= 0) continue;
    const act = acts[s];
    if (act.type === 'switch') doSwitch(state, s, act.to, ev);
    else {
      if (activeOf(state, 1 - s).hp <= 0) continue;
      useMove(state, s, act.idx, ev);
    }
    if (checkEnd(state, ev)) return { state, events: ev };
  }

  // ターン終わりの処理
  for (const s of order) {
    const f = activeOf(state, s);
    if (f.hp <= 0) continue;
    if (f.status === 'burn') {
      const amt = Math.min(f.hp, Math.max(1, Math.floor(f.maxHp / 12)));
      f.hp -= amt;
      ev.push({ t: 'dmg', side: s, amount: amt, hp: f.hp, mult: 1, burn: true });
      if (f.hp <= 0) ev.push({ t: 'faint', side: s, name: f.name });
    } else if (f.ability === 'kirakira' && f.hp < f.maxHp) {
      const amt = Math.min(f.maxHp - f.hp, Math.max(1, Math.floor(f.maxHp / 16)));
      f.hp += amt;
      ev.push({ t: 'heal', side: s, amount: amt, hp: f.hp, cause: 'キラキラ' });
    }
    f.fresh = false;
  }
  if (checkEnd(state, ev)) return { state, events: ev };
  state.turn++;
  setReplace(state);
  return { state, events: ev };
}

function setReplace(state) {
  let need = false;
  for (const side of state.sides) {
    side.needReplace = side.team[side.active].hp <= 0 && alive(side);
    need = need || side.needReplace;
  }
  state.phase = need ? 'replace' : 'select';
}

function resolveReplace(state, acts, ev) {
  for (let s = 0; s < 2; s++) {
    const side = state.sides[s];
    if (!side.needReplace) continue;
    side.active = acts[s].to;
    side.needReplace = false;
  }
  // 両方そろってから登場処理（いあつかんの順番を公平にするため速い方から）
  const order = [0, 1].filter((s) => acts[s]);
  for (const s of order) onEnter(state, s, ev);
  state.phase = 'select';
  return { state, events: ev };
}

// ===== CPU の思考 =====
export function cpuChoose(state, s) {
  const acts = legalActions(state, s);
  const me = activeOf(state, s);
  const foe = activeOf(state, 1 - s);
  if (state.phase === 'replace') {
    // 相手に有利な子を出す
    let best = acts[0]; let bestScore = -1e9;
    for (const a of acts) {
      const m = state.sides[s].team[a.to];
      const sc = matchScore(m, foe) + m.hp / m.maxHp;
      if (sc > bestScore) { bestScore = sc; best = a; }
    }
    return best;
  }
  const scored = acts.map((a) => {
    let sc;
    if (a.type === 'switch') {
      const m = state.sides[s].team[a.to];
      sc = (matchScore(m, foe) - matchScore(me, foe)) * 30 - 25 + (m.hp / m.maxHp) * 10;
    } else if (a.idx < 0) sc = 10;
    else {
      const mv = MOVES[me.moves[a.idx].key];
      if (mv.kind === 'atk') {
        const est = mv.pow * typeMult(mv.el, foe.el) * (mv.el === me.el ? 1.5 : 1) * (mv.acc / 100);
        sc = est * (effStat(me, 'atk') / Math.max(1, effStat(foe, 'def'))) / 2;
        if (est * 0.4 >= foe.hp) sc += 20;
        if (mv.prio && foe.hp < foe.maxHp * 0.25) sc += 40;
      } else if (mv.kind === 'heal') sc = me.hp < me.maxHp * 0.45 ? 60 : -10;
      else if (mv.kind === 'buff') sc = me.boosts[mv.stat] < 2 && me.hp > me.maxHp * 0.6 ? 32 : -5;
      else sc = foe.boosts[mv.stat] > -2 ? 25 : -5;
    }
    return { a, sc: sc + rngNext(state) * 14 };
  });
  scored.sort((x, y) => y.sc - x.sc);
  return scored[0].a;
}

function matchScore(m, foe) {
  return typeMult(m.el, foe.el) - typeMult(foe.el, m.el);
}
