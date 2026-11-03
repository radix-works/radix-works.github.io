// ゲームの基本データ（色・かたち・スキル）

// 写真の主な色。hue（色相の角度）で相性が決まる。白・黒は相性なし
export const COLORS = {
  red:    { name: '赤', color: '#ff5a4e' },
  yellow: { name: '黄', color: '#ffc928' },
  green:  { name: '緑', color: '#3fcf6b' },
  blue:   { name: '青', color: '#3d9bff' },
  purple: { name: '紫', color: '#b46cff' },
  white:  { name: '白', color: '#e9ecf5' },
  black:  { name: '黒', color: '#4a4f66' },
};

// 色相の相性：自分の色から時計回りに 90〜150度先の色に強い（1.3倍）、逆に 210〜270度先の色には弱い（0.8倍）
export function hueAdv(atkHue, defHue) {
  if (atkHue == null || defHue == null) return 0;
  const d = (((defHue - atkHue) % 360) + 360) % 360;
  if (d >= 90 && d <= 150) return 1;
  if (d >= 210 && d <= 270) return -1;
  return 0;
}
export const ADV_MULT = { 1: 1.3, 0: 1, '-1': 0.8 };

// 写真の形
export const SHAPES = {
  round:  { name: 'まる', desc: 'ガードが高め' },
  spiky:  { name: 'とがり', desc: 'パワーが高め' },
  long:   { name: 'ほそなが', desc: 'スピードが高め' },
  big:    { name: 'おおきい', desc: '体力が高め' },
  plain:  { name: 'シンプル', desc: 'バランス型' },
};

// スキル
// target: enemy(相手1体) / ally(味方1体) / self / allEnemies / allAllies
// first: true のものはターンの最初に発動する
export const SKILLS = {
  attack:   { name: 'こうげき', cost: 0, target: 'enemy', power: 1.0, desc: 'ふつうの攻撃' },
  guard:    { name: 'ガード', cost: 0, target: 'self', first: true, desc: 'このターン受けるダメージ半分・⚡+1' },
  // かたちのスキル
  cover:    { name: 'たてになる', cost: 2, target: 'ally', first: true, desc: '味方1体への攻撃を代わりに受ける（ダメージ3割減）' },
  pierce:   { name: 'つらぬく', cost: 3, target: 'enemy', power: 1.7, pierce: true, desc: '威力1.7倍・ガードとバリアを無視' },
  rush:     { name: 'れんだ', cost: 3, target: 'enemy', power: 0.6, hits: 3, desc: '威力0.6倍で3回攻撃' },
  sweep:    { name: 'なぎはらう', cost: 4, target: 'allEnemies', power: 0.75, desc: '相手全員に威力0.75倍' },
  charge:   { name: 'ためる', cost: 2, target: 'self', desc: '次の攻撃の威力が2倍' },
  // 色のスキル
  swing:    { name: 'フルスイング', cost: 3, target: 'enemy', power: 1.6, desc: '威力1.6倍' },
  flash:    { name: 'フラッシュ', cost: 4, target: 'allEnemies', dazzle: true, desc: '相手全員の次の行動を4割で失敗させる' },
  mend:     { name: 'つくろう', cost: 3, target: 'ally', heal: 0.4, desc: '味方1体の体力を4割回復' },
  chill:    { name: 'ひやす', cost: 3, target: 'enemy', power: 1.0, slow: true, desc: '攻撃＋2ターンの間スピード3割減' },
  absorb:   { name: 'すいとる', cost: 3, target: 'enemy', power: 1.1, drain: 0.5, desc: '与えたダメージの半分を回復' },
  barrier:  { name: 'バリア', cost: 4, target: 'allAllies', first: true, desc: 'このターン味方全員のダメージ4割減' },
  ambush:   { name: 'ふいうち', cost: 3, target: 'enemy', power: 1.0, ambush: true, desc: 'まだ動いていない相手には威力2倍' },
};
export const SHAPE_SKILL = { round: 'cover', spiky: 'pierce', long: 'rush', big: 'sweep', plain: 'charge' };
export const COLOR_SKILL = { red: 'swing', yellow: 'flash', green: 'mend', blue: 'chill', purple: 'absorb', white: 'barrier', black: 'ambush' };

export const STAT_LABELS = { hp: '体力', pow: 'パワー', grd: 'ガード', spd: 'スピード' };
export const RARITY = {
  N:  { stars: 1, total: 300 },
  R:  { stars: 2, total: 312 },
  SR: { stars: 3, total: 324 },
  UR: { stars: 4, total: 336 },
};
export const ENERGY = { start: 3, perTurn: 2, max: 10 };
