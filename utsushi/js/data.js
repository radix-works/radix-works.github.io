// ゲームの基本データ（属性・わざ・とくせい）

export const ELEMENTS = {
  fire:  { name: '火', label: 'ほのお', color: '#ff6a3d', dark: '#b8321a' },
  water: { name: '水', label: 'みず',   color: '#3d9bff', dark: '#1a5bb8' },
  leaf:  { name: '草', label: 'くさ',   color: '#3fcf6b', dark: '#1d8a3f' },
  bolt:  { name: '雷', label: 'いかずち', color: '#ffc928', dark: '#b88a00' },
  light: { name: '光', label: 'ひかり', color: '#f3a8ff', dark: '#a352c4' },
  dark:  { name: '闇', label: 'やみ',   color: '#7b6cff', dark: '#3b2fa8' },
};
export const ELEMENT_KEYS = Object.keys(ELEMENTS);

// 相性表 [攻撃側][防御側] = 倍率（書いていない組み合わせは 1 倍）
const CHART = {
  fire:  { leaf: 2, water: 0.5, fire: 0.5 },
  water: { fire: 2, leaf: 0.5, water: 0.5 },
  leaf:  { water: 2, bolt: 2, fire: 0.5, leaf: 0.5 },
  bolt:  { water: 2, leaf: 0.5, bolt: 0.5 },
  light: { dark: 2, light: 0.5 },
  dark:  { light: 2, dark: 0.5 },
};
export function typeMult(atkEl, defEl) {
  if (!atkEl) return 1;
  return (CHART[atkEl] && CHART[atkEl][defEl]) || 1;
}

// わざ
// kind: atk(攻撃) / heal(回復) / buff(自分の能力アップ) / debuff(相手の能力ダウン)
export const MOVES = {
  // 火
  hinoko:      { name: 'ひのこ', el: 'fire', kind: 'atk', pow: 55, acc: 100, pp: 12, burn: 0.2 },
  flametackle: { name: 'フレイムタックル', el: 'fire', kind: 'atk', pow: 80, acc: 95, pp: 8 },
  bakuen:      { name: 'ばくえん', el: 'fire', kind: 'atk', pow: 115, acc: 80, pp: 4, burn: 0.3 },
  netsuryo:    { name: 'ねつりょうチャージ', el: 'fire', kind: 'buff', stat: 'atk', stages: 2, pp: 4 },
  // 水
  mizudeppo:   { name: 'みずでっぽう', el: 'water', kind: 'atk', pow: 55, acc: 100, pp: 12 },
  aquaslash:   { name: 'アクアスラッシュ', el: 'water', kind: 'atk', pow: 80, acc: 95, pp: 8, crit: 0.12 },
  daikozui:    { name: 'だいこうずい', el: 'water', kind: 'atk', pow: 115, acc: 80, pp: 4 },
  shizuku:     { name: 'いやしのしずく', el: 'water', kind: 'heal', ratio: 0.45, pp: 3 },
  // 草
  happa:       { name: 'はっぱカッター', el: 'leaf', kind: 'atk', pow: 55, acc: 100, pp: 12, crit: 0.2 },
  tsuru:       { name: 'つるのムチ', el: 'leaf', kind: 'atk', pow: 80, acc: 95, pp: 8 },
  solar:       { name: 'ソーラーブラスト', el: 'leaf', kind: 'atk', pow: 115, acc: 80, pp: 4 },
  drain:       { name: 'ドレインリーフ', el: 'leaf', kind: 'atk', pow: 65, acc: 100, pp: 6, drain: 0.5 },
  // 雷
  dengeki:     { name: 'でんげき', el: 'bolt', kind: 'atk', pow: 55, acc: 100, pp: 12, para: 0.2 },
  inazuma:     { name: 'いなずまキック', el: 'bolt', kind: 'atk', pow: 80, acc: 95, pp: 8 },
  kaminari:    { name: 'かみなりおとし', el: 'bolt', kind: 'atk', pow: 115, acc: 75, pp: 4, para: 0.3 },
  denko:       { name: 'でんこうせっか', el: 'bolt', kind: 'atk', pow: 45, acc: 100, pp: 8, prio: 1 },
  // 光
  hikari:      { name: 'ひかりのつぶ', el: 'light', kind: 'atk', pow: 55, acc: 100, pp: 12 },
  prism:       { name: 'プリズムレイ', el: 'light', kind: 'atk', pow: 80, acc: 95, pp: 8 },
  judge:       { name: 'ジャッジメント', el: 'light', kind: 'atk', pow: 115, acc: 80, pp: 4 },
  barrier:     { name: 'ひかりのバリア', el: 'light', kind: 'buff', stat: 'def', stages: 2, pp: 4 },
  // 闇
  kageuchi:    { name: 'かげうち', el: 'dark', kind: 'atk', pow: 45, acc: 100, pp: 8, prio: 1 },
  nightclaw:   { name: 'ナイトクロー', el: 'dark', kind: 'atk', pow: 80, acc: 95, pp: 8, crit: 0.15 },
  blackhole:   { name: 'ブラックホール', el: 'dark', kind: 'atk', pow: 115, acc: 80, pp: 4 },
  noroi:       { name: 'のろい', el: 'dark', kind: 'debuff', stat: 'atk', stages: -2, pp: 4 },
  // 無属性
  taiatari:    { name: 'たいあたり', el: null, kind: 'atk', pow: 65, acc: 100, pp: 15 },
  kiai:        { name: 'きあいだめ', el: null, kind: 'buff', stat: 'atk', stages: 2, pp: 4 },
  teppeki:     { name: 'てっぺき', el: null, kind: 'buff', stat: 'def', stages: 2, pp: 4 },
  kosoku:      { name: 'こうそくいどう', el: null, kind: 'buff', stat: 'spd', stages: 2, pp: 4 },
  saisei:      { name: 'じこさいせい', el: null, kind: 'heal', ratio: 0.45, pp: 3 },
  niramu:      { name: 'にらみつける', el: null, kind: 'debuff', stat: 'def', stages: -2, pp: 4 },
};

// 属性ごとのわざの候補
export const MOVE_POOL = {
  fire:  { weak: ['hinoko'], mid: ['flametackle'], big: ['bakuen'], sup: ['netsuryo'] },
  water: { weak: ['mizudeppo'], mid: ['aquaslash'], big: ['daikozui'], sup: ['shizuku'] },
  leaf:  { weak: ['happa'], mid: ['tsuru', 'drain'], big: ['solar'], sup: ['drain'] },
  bolt:  { weak: ['dengeki', 'denko'], mid: ['inazuma'], big: ['kaminari'], sup: ['denko'] },
  light: { weak: ['hikari'], mid: ['prism'], big: ['judge'], sup: ['barrier'] },
  dark:  { weak: ['kageuchi'], mid: ['nightclaw'], big: ['blackhole'], sup: ['noroi'] },
};

// とくせい（写真の形や色から決まる）
export const ABILITIES = {
  marui:    { name: 'まんまるボディ', desc: '受けるダメージが 15% へる' },
  togatta:  { name: 'とがったフォルム', desc: '急所に当たりやすい' },
  nobi:     { name: 'のっぽ', desc: 'すばやさが 1 段階上がった状態で登場する' },
  ookii:    { name: 'ビッグサイズ', desc: '最大HPが 12% 多い' },
  colorful: { name: 'カラフル', desc: '弱点を突かれても 1.5 倍で済む' },
  kirakira: { name: 'キラキラ', desc: '毎ターン HP が少し回復する' },
  kagemono: { name: 'いあつかん', desc: '登場したとき相手のこうげきを 1 段階下げる' },
  shinpuru: { name: 'シンプル', desc: '同じ属性のわざの威力が さらに 10% 上がる' },
};

export const STAT_LABELS = { hp: 'HP', atk: 'こうげき', def: 'ぼうぎょ', spd: 'すばやさ' };
export const RARITY = {
  N:  { label: 'N',  stars: 1, total: 300 },
  R:  { label: 'R',  stars: 2, total: 312 },
  SR: { label: 'SR', stars: 3, total: 324 },
  UR: { label: 'UR', stars: 4, total: 336 },
};
