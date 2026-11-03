// バトルの計算（画面とは切り離した純粋なロジック）
// 3体 vs 3体。両者が3体ぶんの指示を出したらターン開始、6体がスピード順に動く。
// オンライン対戦ではホスト側だけがこれを動かし、結果を相手に送る。
import { SKILLS, SHAPE_SKILL, COLOR_SKILL, ENERGY, hueAdv, ADV_MULT } from './data.js';

export function rngNext(state) {
  let t = (state.seed = (state.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const MAX_TURNS = 30;
export const maxHpOf = (mon) => mon.stats.hp * 2 + 60;
export const skillsOf = (mon) => ['attack', SHAPE_SKILL[mon.shape], COLOR_SKILL[mon.color], 'guard'];

function toFighter(mon) {
  const hp = maxHpOf(mon);
  return {
    name: mon.name, color: mon.color, hue: mon.hue, shape: mon.shape,
    stats: { ...mon.stats }, maxHp: hp, hp, skills: skillsOf(mon),
    charged: false, slowTurns: 0, dazzled: false,
  };
}

export function createBattle(teamA, teamB, seed) {
  return {
    seed: seed >>> 0, turn: 1, phase: 'select', winner: null,
    sides: [
      { team: teamA.map(toFighter), energy: ENERGY.start },
      { team: teamB.map(toFighter), energy: ENERGY.start },
    ],
  };
}

export const aliveIdx = (side) => side.team.map((f, i) => (f.hp > 0 ? i : -1)).filter((i) => i >= 0);
export const speedOf = (f) => f.stats.spd * (f.slowTurns > 0 ? 0.7 : 1);
export const needsTarget = (key) => SKILLS[key].target === 'enemy' || SKILLS[key].target === 'ally';

// 1体ぶんの指示が正しいか
export function cmdValid(state, s, i, cmd) {
  const f = state.sides[s].team[i];
  if (f.hp <= 0) return cmd == null;
  if (!cmd || !f.skills.includes(cmd.skill)) return false;
  const sk = SKILLS[cmd.skill];
  if (sk.target === 'enemy') { const t = state.sides[1 - s].team[cmd.target]; return !!t && t.hp > 0; }
  if (sk.target === 'ally') {
    const t = state.sides[s].team[cmd.target];
    if (!t || t.hp <= 0) return false;
    return !(cmd.skill === 'cover' && cmd.target === i);
  }
  return true;
}
export const cmdsCost = (cmds) => cmds.reduce((a, c) => a + (c ? SKILLS[c.skill].cost : 0), 0);
export function cmdsValid(state, s, cmds) {
  if (!Array.isArray(cmds) || cmds.length !== 3) return false;
  for (let i = 0; i < 3; i++) if (!cmdValid(state, s, i, cmds[i])) return false;
  return cmdsCost(cmds) <= state.sides[s].energy;
}

function checkEnd(state, ev) {
  const a0 = aliveIdx(state.sides[0]).length > 0;
  const a1 = aliveIdx(state.sides[1]).length > 0;
  if (a0 && a1) return false;
  state.phase = 'end';
  state.winner = a0 ? 0 : a1 ? 1 : -1;
  ev.push({ t: 'end', winner: state.winner });
  return true;
}

function hitOnce(state, s, i, ti, sk, ev, tmp, charged) {
  const a = state.sides[s].team[i];
  const ds = 1 - s;
  let target = ti;
  let coverCut = 1;
  const cov = tmp[ds].coveredBy[ti];
  if (!sk.pierce && cov != null && cov !== ti && state.sides[ds].team[cov].hp > 0) { target = cov; coverCut = 0.7; }
  const d = state.sides[ds].team[target];
  const adv = hueAdv(a.hue, d.hue);
  let dmg = 34 * (sk.power || 1) * (a.stats.pow / d.stats.grd) * ADV_MULT[adv] * coverCut;
  if (charged) dmg *= 2;
  if (sk.ambush && !tmp[ds].acted[target]) dmg *= 2;
  if (!sk.pierce && tmp[ds].guarding[target]) dmg *= 0.5;
  if (!sk.pierce && tmp[ds].barrier) dmg *= 0.6;
  const crit = rngNext(state) < 0.08;
  if (crit) dmg *= 1.5;
  dmg *= 0.9 + rngNext(state) * 0.2;
  const real = Math.min(d.hp, Math.max(1, Math.floor(dmg)));
  d.hp -= real;
  ev.push({ t: 'hit', side: ds, i: target, amount: real, hp: d.hp, adv, crit, cover: target !== ti });
  if (d.hp <= 0) ev.push({ t: 'down', side: ds, i: target });
  return { real, target };
}

function perform(state, s, i, cmd, ev, tmp) {
  const side = state.sides[s];
  const a = side.team[i];
  const sk = SKILLS[cmd.skill];
  const foe = state.sides[1 - s];
  if (a.dazzled) {
    a.dazzled = false;
    if (rngNext(state) < 0.4) { ev.push({ t: 'fail', side: s, i }); return; }
  }
  ev.push({ t: 'act', side: s, i, skill: cmd.skill });

  if (sk.power) {
    const charged = a.charged; a.charged = false;
    let targets;
    if (sk.target === 'allEnemies') targets = aliveIdx(foe);
    else {
      let t = cmd.target;
      if (foe.team[t].hp <= 0) { const al = aliveIdx(foe); t = al[Math.floor(rngNext(state) * al.length)]; }
      targets = [t];
    }
    let dealt = 0;
    for (const t of targets) {
      for (let h = 0; h < (sk.hits || 1); h++) {
        if (foe.team[t].hp <= 0) break;
        const r = hitOnce(state, s, i, t, sk, ev, tmp, charged);
        dealt += r.real;
        if (sk.slow && foe.team[r.target].hp > 0) { foe.team[r.target].slowTurns = 2; ev.push({ t: 'status', side: 1 - s, i: r.target, st: 'slow' }); }
      }
    }
    if (sk.drain && dealt > 0 && a.hp > 0) {
      const amt = Math.min(a.maxHp - a.hp, Math.round(dealt * sk.drain));
      if (amt > 0) { a.hp += amt; ev.push({ t: 'heal', side: s, i, amount: amt, hp: a.hp }); }
    }
    return;
  }
  if (sk.heal) {
    let t = cmd.target;
    if (side.team[t].hp <= 0) t = i;
    const f = side.team[t];
    const amt = Math.min(f.maxHp - f.hp, Math.round(f.maxHp * sk.heal));
    f.hp += amt;
    ev.push({ t: 'heal', side: s, i: t, amount: amt, hp: f.hp });
    return;
  }
  if (sk.dazzle) {
    for (const t of aliveIdx(foe)) { foe.team[t].dazzled = true; ev.push({ t: 'status', side: 1 - s, i: t, st: 'dazzle' }); }
    return;
  }
  if (cmd.skill === 'charge') { a.charged = true; ev.push({ t: 'status', side: s, i, st: 'charge' }); }
}

export function resolveTurn(state, allCmds) {
  const ev = [{ t: 'turn', turn: state.turn }];
  const tmp = [0, 1].map(() => ({ guarding: [], coveredBy: [], acted: [], barrier: false }));

  // ⚡ を払う
  for (const s of [0, 1]) {
    const side = state.sides[s];
    side.energy -= cmdsCost(allCmds[s]);
    const guards = allCmds[s].filter((c) => c && c.skill === 'guard').length;
    side.energy = Math.min(ENERGY.max, side.energy + guards);
  }
  // ターン最初に発動するもの（ガード・たてになる・バリア）
  const queue = [];
  for (const s of [0, 1]) {
    allCmds[s].forEach((cmd, i) => {
      if (!cmd || state.sides[s].team[i].hp <= 0) return;
      const sk = SKILLS[cmd.skill];
      if (!sk.first) { queue.push({ s, i, cmd, r: rngNext(state) }); return; }
      tmp[s].acted[i] = true;
      if (cmd.skill === 'guard') { tmp[s].guarding[i] = true; ev.push({ t: 'guard', side: s, i }); }
      else if (cmd.skill === 'cover') { tmp[s].coveredBy[cmd.target] = i; tmp[s].guarding[i] = false; ev.push({ t: 'cover', side: s, i, ally: cmd.target }); }
      else if (cmd.skill === 'barrier') { tmp[s].barrier = true; ev.push({ t: 'barrier', side: s, i }); }
    });
  }
  // スピード順
  queue.sort((x, y) => speedOf(state.sides[y.s].team[y.i]) - speedOf(state.sides[x.s].team[x.i]) || x.r - y.r);
  for (const q of queue) {
    if (state.sides[q.s].team[q.i].hp <= 0) continue;
    perform(state, q.s, q.i, q.cmd, ev, tmp);
    tmp[q.s].acted[q.i] = true;
    if (checkEnd(state, ev)) return { state, events: ev };
  }
  // ターン終わり
  for (const side of state.sides) {
    for (const f of side.team) if (f.slowTurns > 0) f.slowTurns--;
    side.energy = Math.min(ENERGY.max, side.energy + ENERGY.perTurn);
  }
  ev.push({ t: 'energy', values: state.sides.map((x) => x.energy) });
  state.turn++;
  if (state.turn > MAX_TURNS) {
    // 時間切れ：残り体力の割合で判定
    const ratio = state.sides.map((sd) => sd.team.reduce((a, f) => a + f.hp / f.maxHp, 0));
    state.phase = 'end';
    state.winner = ratio[0] > ratio[1] ? 0 : ratio[1] > ratio[0] ? 1 : -1;
    ev.push({ t: 'end', winner: state.winner, timeup: true });
  }
  return { state, events: ev };
}

// ===== CPU の思考 =====
export function cpuCommands(state, s) {
  const side = state.sides[s], foe = state.sides[1 - s];
  let budget = side.energy;
  const foes = aliveIdx(foe);
  const cmds = [null, null, null];
  // 一番弱っている相手を狙いがち
  const weakest = foes.slice().sort((a, b) => foe.team[a].hp - foe.team[b].hp)[0];
  const order = aliveIdx(side).sort(() => rngNext(state) - 0.5);
  for (const i of order) {
    const f = side.team[i];
    const opts = [];
    for (const key of f.skills) {
      const sk = SKILLS[key];
      if (sk.cost > budget) continue;
      if (sk.target === 'enemy') {
        for (const t of foes) {
          const d = foe.team[t];
          let sc = (sk.power || 1) * (sk.hits || 1) * ADV_MULT[hueAdv(f.hue, d.hue)] * 40 * (f.stats.pow / d.stats.grd);
          if (f.charged) sc *= 2;
          if (t === weakest) sc += 12;
          if (sk.ambush) sc *= 1.4;
          sc -= sk.cost * 6;
          opts.push({ c: { skill: key, target: t }, sc, cost: sk.cost });
        }
      } else if (sk.target === 'allEnemies') {
        const sc = sk.power ? sk.power * foes.length * 36 - sk.cost * 6 : foes.length * 14 - sk.cost * 4;
        opts.push({ c: { skill: key, target: null }, sc, cost: sk.cost });
      } else if (key === 'mend') {
        for (const t of aliveIdx(side)) {
          const a = side.team[t];
          const lack = 1 - a.hp / a.maxHp;
          opts.push({ c: { skill: key, target: t }, sc: lack > 0.4 ? 60 * lack + 20 : -20, cost: sk.cost });
        }
      } else if (key === 'cover') {
        for (const t of aliveIdx(side)) if (t !== i) {
          const a = side.team[t];
          opts.push({ c: { skill: key, target: t }, sc: a.hp < a.maxHp * 0.35 && f.hp > f.maxHp * 0.5 ? 50 : -10, cost: sk.cost });
        }
      } else if (key === 'guard') opts.push({ c: { skill: key, target: null }, sc: f.hp < f.maxHp * 0.3 ? 30 : 8, cost: 0 });
      else if (key === 'charge') opts.push({ c: { skill: key, target: null }, sc: f.charged ? -50 : 30, cost: sk.cost });
      else if (key === 'barrier') opts.push({ c: { skill: key, target: null }, sc: 30, cost: sk.cost });
    }
    for (const o of opts) o.sc += rngNext(state) * 14;
    opts.sort((x, y) => y.sc - x.sc);
    const pick = opts[0];
    cmds[i] = pick.c; budget -= pick.cost;
  }
  return cmds;
}
