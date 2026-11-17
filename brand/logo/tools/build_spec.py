import re, html
L='/home/user/radix-works.github.io/brand/logo/'
def svg(path, cls=''):
    s=open(path).read()
    w=re.search(r'width="([\d.]+)"',s).group(1); h=re.search(r'height="([\d.]+)"',s).group(1)
    s=re.sub(r'^<svg ', f'<svg class="{cls}" role="img" preserveAspectRatio="xMidYMid meet" ', s, count=1)
    s=re.sub(r' width="[\d.]+" height="[\d.]+"', '', s, count=1)
    return s
V=lambda n: svg(L+'svg/radixworks-'+n+'.svg','logo')
def variant(title, name, use, light=True):
    return f'''<figure class="variant">
  <div class="pair">
    <div class="plate light">{V(name)}</div>
    <div class="plate dark">{V(name+'-cream')}</div>
  </div>
  <figcaption><strong>{title}</strong><span>{use}</span><code>radixworks-{name}.svg ／ radixworks-{name}-cream.svg</code></figcaption>
</figure>'''
colors=[('紺','#1b2436','27, 36, 54','明るい地の記号と RADIX'),
        ('金','#8f7a4c','143, 122, 76','明るい地のくちばしと WORKS'),
        ('クリーム','#ece5d3','236, 229, 211','暗い地の記号と RADIX'),
        ('明るい金','#c9a96a','201, 169, 106','暗い地のくちばしと WORKS'),
        ('夜の紺','#121a2a','18, 26, 42','アイコンの地。クリーム色の版を置く地のおすすめ')]
sw=''.join(f'<li class="swatch"><span class="chip" style="background:{h}"></span><div><strong>{n}</strong><code>{h}</code><code>RGB {rgb}</code><span>{u}</span></div></li>' for n,h,rgb,u in colors)
page=f'''<title>Radix Works ロゴ仕様書</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@500;600&family=Noto+Sans+JP:wght@400;500;700&display=swap">
<style>
/* 仕様書：左に細い見出しの列、右に本文と見本。紙の見本帳の落ち着き */
:root {{
  --bg:#f6f7f9; --surface:#ffffff; --fg:#1b2436; --sub:#4a5468; --line:#d9dee6;
  --gold:#8f7a4c; --plate-light:#fbfcfd; --plate-dark:#121a2a;
  --display:"Jost","Noto Sans JP",system-ui,sans-serif; --body:"Noto Sans JP","Hiragino Sans","Yu Gothic UI",system-ui,sans-serif;
  --mono:ui-monospace,"SFMono-Regular",Menlo,monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#0f141f; --surface:#161d2b; --fg:#e7e3d8; --sub:#a7afbf; --line:#2a3345; --gold:#c9a96a; color-scheme:dark }} }}
:root[data-theme="dark"] {{ --bg:#0f141f; --surface:#161d2b; --fg:#e7e3d8; --sub:#a7afbf; --line:#2a3345; --gold:#c9a96a; color-scheme:dark }}
* {{ box-sizing:border-box }}
body {{ background:var(--bg); color:var(--fg); font-family:var(--body); font-size:15px; line-height:1.85; margin:0;
  padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); }}
main {{ max-width:1080px; margin:0 auto; padding-block:48px 96px }}
header.cover {{ display:grid; gap:28px; padding-block:24px 56px; border-bottom:1px solid var(--line) }}
.cover .plate {{ padding:40px 32px }}
.eyebrow {{ font-family:var(--display); letter-spacing:.22em; font-size:12px; color:var(--gold); font-weight:600; text-transform:uppercase }}
h1 {{ font-family:var(--display); font-weight:600; font-size:clamp(28px,4vw,40px); line-height:1.3; margin:0; text-wrap:balance }}
.meta {{ color:var(--sub); font-size:13px; display:flex; gap:20px; flex-wrap:wrap }}
section {{ display:grid; grid-template-columns:220px minmax(0,1fr); gap:32px; padding-block:56px; border-bottom:1px solid var(--line) }}
section > h2 {{ font-family:var(--display); font-size:20px; font-weight:600; margin:0; line-height:1.4; position:sticky; top:calc(env(safe-area-inset-top,0px) + 16px); align-self:start }}
section > h2 small {{ display:block; font-size:12px; color:var(--gold); letter-spacing:.18em; font-weight:500 }}
.body {{ min-width:0; display:grid; grid-template-columns:minmax(0,1fr); gap:20px }}
.body p {{ margin:0; max-width:66ch }}
.body ul {{ margin:0; padding-left:1.2em; max-width:66ch }}
.body ul.swatches, .body ul.dont, .body ul.files {{ padding-left:0; max-width:none }}
.plate {{ border-radius:6px; display:flex; align-items:center; justify-content:center; padding:28px 24px; min-width:0 }}
.plate.light {{ background:var(--plate-light); border:1px solid #e3e7ed }}
.plate.dark {{ background:var(--plate-dark) }}
.plate .logo {{ width:100%; height:auto; max-height:150px }}
.variant {{ margin:0; display:grid; gap:12px }}
.pair {{ display:grid; grid-template-columns:1fr 1fr; gap:12px }}
.variant figcaption {{ display:grid; gap:2px; font-size:14px }}
.variant figcaption span {{ color:var(--sub) }}
code {{ font-family:var(--mono); font-size:12.5px; color:var(--sub) }}
.small-row {{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px }}
.small-row .plate .logo {{ max-height:120px }}
.icon-plate {{ background:transparent; border:1px dashed var(--line) }}
.swatches {{ list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(min(190px,100%),1fr)); gap:14px }}
.swatch {{ display:grid; gap:10px; background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:12px }}
.swatch .chip {{ height:72px; border-radius:4px; border:1px solid rgba(127,127,127,.25) }}
.swatch div {{ display:grid; gap:0; font-size:13px }}
.swatch span {{ color:var(--sub) }}
.spec {{ display:grid; gap:10px; margin:0 }}
.spec div {{ display:grid; grid-template-columns:180px minmax(0,1fr); gap:16px; padding-block:10px; border-top:1px solid var(--line) }}
.spec dt {{ color:var(--sub); font-size:13.5px }}
.spec dd {{ margin:0 }}
.type-sample {{ font-family:"Jost",sans-serif; font-size:clamp(28px,6vw,52px); letter-spacing:.06em; line-height:1.2; background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:20px 24px; overflow-x:auto }}
.type-sample .w {{ color:var(--gold); font-weight:500 }} .type-sample .r {{ font-weight:600 }}
.diagram {{ background:var(--plate-light); border:1px solid #e3e7ed; border-radius:6px; overflow:hidden }}
.diagram.darkbg {{ background:var(--plate-dark); border:0 }}
.diagram svg {{ display:block; width:100%; height:auto }}
.two {{ display:grid; grid-template-columns:1fr 1fr; gap:14px }}
.dont {{ list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr)); gap:12px }}
.dont li {{ background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:12px 14px; font-size:14px }}
.dont li strong {{ display:block }}
.files {{ display:grid; gap:6px; margin:0; padding:0; list-style:none }}
.files li {{ display:grid; grid-template-columns:minmax(0,300px) minmax(0,1fr); gap:16px; padding-block:6px; border-top:1px solid var(--line); font-size:14px }}
.note {{ font-size:13px; color:var(--sub) }}
footer {{ padding-block:40px; color:var(--sub); font-size:13px }}
@media (max-width:760px) {{
  section {{ grid-template-columns:minmax(0,1fr); gap:16px }} section > h2 {{ position:static }}
  .pair, .two, .small-row {{ grid-template-columns:minmax(0,1fr) }} .spec div, .files li {{ grid-template-columns:1fr; gap:2px }}
}}
</style>
<main>
<header class="cover">
  <div class="eyebrow">Brand guideline · Logo</div>
  <h1>Radix Works ロゴ仕様書</h1>
  <div class="meta"><span>版：仮完成</span><span>2026年11月17日</span></div>
  <div class="plate light">{V('wide')}</div>
</header>

<section id="concept"><h2><small>CONCEPT</small>ロゴの考え方</h2><div class="body">
  <p>記号は、ペンギンと頭文字の R を 1 つの形に重ねたものです。丸い頭が R の丸、背中が R の縦の画、胸の線が R の脚にあたります。</p>
  <ul>
    <li><strong>ファーストペンギン</strong>：群れの中で最初に海へ飛び込むペンギンのように、新しいことへ先に踏み出す姿勢を表します。前のめりの立ち姿は、飛び込む直前の構えです。</li>
    <li><strong>Radix（根）</strong>：社名の Radix はラテン語で「根」。目立たない所で何かを支える根源でありたい、という意味を込めています。</li>
    <li><strong>円と黄金比</strong>：記号の輪郭は、半径を黄金比（φ＝1.618…）の段でそろえた円の一部だけで作っています。文字の大きさや間も黄金比で決めています。</li>
  </ul>
</div></section>

<section id="lockups"><h2><small>LOCKUPS</small>ロゴの種類</h2><div class="body">
  <p>形は 5 種類です。アイコン以外は、明るい地に置く版（左）と、暗い地に置くクリーム色の版（右）があります。ファイルには地の色は入っていません。見本の地は置き場所の例です。</p>
  {variant('横長 1 行','wide','ウェブサイトの見出し、名刺、横に細長い場所。いちばんよく使う形')}
  {variant('横長 2 行','horizontal','横幅が足りない所。資料の表紙、署名')}
  {variant('縦長','vertical','正方形に近い場所。ポスター、表紙の中央')}
  {variant('記号だけ','mark','社名が別に書かれている所、小さな場所、SNS のプロフィール画像')}
  <figure class="variant"><div class="small-row"><div class="plate icon-plate">{V('icon')}</div></div>
  <figcaption><strong>アイコン</strong><span>アプリやサイトのアイコン。夜の紺の角丸の地に、クリーム色の記号</span><code>radixworks-icon.svg</code></figcaption></figure>
</div></section>

<section id="color"><h2><small>COLOR</small>色</h2><div class="body">
  <ul class="swatches">{sw}</ul>
  <p class="note">明るい地の版は、白や淡い色の上に置きます。クリーム色の版は、夜の紺など暗い色の上に置きます。地の色とロゴの色の明るさに十分な差がない所には置きません。</p>
</div></section>

<section id="type"><h2><small>TYPEFACE</small>書体</h2><div class="body">
  <div class="type-sample"><span class="r">RADIX</span> <span class="w">WORKS</span></div>
  <dl class="spec">
    <div><dt>書体</dt><dd>Jost（商用利用できる無料の書体。SIL Open Font License）</dd></div>
    <div><dt>RADIX</dt><dd>Jost SemiBold。字の間は大文字の高さの 0.06 倍（横長 2 行）、0.12 倍（横長 1 行と縦長）。さらに字の組ごとに詰める（R と A：−0.035、A と D：−0.02、D と I：−0.01、I と X：−0.02。どれも大文字の高さに対する割合）</dd></div>
    <div><dt>WORKS</dt><dd>Jost Medium。横長 2 行では字の間を大文字の高さの 1/φ³、1 行の形では 1/φ⁴</dd></div>
    <div><dt>選んだ理由</dt><dd>O がほぼ真円で、円で作った記号と合う。A と W の先が尖っていて、くちばしや足の尖りとそろう</dd></div>
  </dl>
  <p class="note">ロゴのファイルでは、文字は形（アウトライン）にしてあります。書体が入っていない機械でも同じ見た目になります。ロゴの文字を、別の書体で打ち直して作らないでください。</p>
</div></section>

<section id="layout"><h2><small>PROPORTION</small>組み方の比率</h2><div class="body">
  <p>文字の大きさ・間・位置は、記号の高さを 1 として黄金比で決めています。</p>
  <div class="diagram">{svg(L+'type-ratios.svg')}</div>
  <dl class="spec">
    <div><dt>横長 2 行</dt><dd>RADIX の大文字＝記号の高さ÷φ³、WORKS＝RADIX÷φ、行の間＝WORKS÷φ、記号と文字の間＝RADIX÷φ、文字の上のあき：下のあき＝1：φ。文字は左寄せ</dd></div>
    <div><dt>横長 1 行</dt><dd>記号の高さ＝文字の大文字の高さ×φ。記号と文字の間、RADIX と WORKS の間＝文字の高さ÷φ。記号と文字の縦の真ん中をそろえる</dd></div>
    <div><dt>縦長</dt><dd>文字の大文字の高さ＝記号の高さ÷φ⁴。記号と文字の間＝文字の高さ×φ。左右の真ん中にそろえる</dd></div>
  </dl>
</div></section>

<section id="construction"><h2><small>CONSTRUCTION</small>記号の作図</h2><div class="body">
  <p>輪郭はすべて円の一部です。使った円の半径は φ⁴・φ⁵・φ⁶・φ⁹・φ¹⁰ と、目の √5（＝φ＋1/φ）です。</p>
  <div class="two"><div class="diagram darkbg">{svg(L+'construction.svg')}</div><div class="diagram">{svg(L+'ratios.svg')}</div></div>
  <dl class="spec">
    <div><dt>頭とあご</dt><dd>半径 φ⁴ の円</dd></div>
    <div><dt>くちばし</dt><dd>半径 φ⁵ の円 2 つ。長さは頭の半径÷φ</dd></div>
    <div><dt>背中</dt><dd>外側・内側とも半径 φ⁶。外側は頭の円に内側から接し、角なくつながる</dd></div>
    <div><dt>胸の線</dt><dd>外側 φ¹⁰、内側 φ⁹</dd></div>
    <div><dt>目</dt><dd>白い輪の半径 √5、黒目は √5÷φ。目は頭の横幅を φ：1、高さを 1：φ に分ける所</dd></div>
    <div><dt>全体</dt><dd>頭の直径：全体の高さ＝1：φ。円が頭と交わる角度は 360°÷φⁿ（137.5°・52.5°・32.5°・20.1°・12.4°）</dd></div>
  </dl>
</div></section>

<section id="space"><h2><small>CLEAR SPACE</small>余白と最小の大きさ</h2><div class="body">
  <dl class="spec">
    <div><dt>まわりの余白（提案）</dt><dd>ロゴのまわりには、記号の高さ÷φ³（約 0.24 倍）以上のあきを取り、ほかの文字や絵を入れない</dd></div>
    <div><dt>最小の大きさ（提案）</dt><dd>画面では記号の高さ 32px 以上。これより小さい所では、目とくちばしがつぶれる。印刷の最小の大きさは、実物を刷って確かめてから決める</dd></div>
  </dl>
  <p class="note">余白と最小の大きさは、この仕様書で決めた案です。最小の大きさは画面で見た目安で、スマホや印刷の実物ではまだ確かめていません。</p>
</div></section>

<section id="dont"><h2><small>DON'T</small>してはいけないこと</h2><div class="body">
  <ul class="dont">
    <li><strong>縦横の比を変える</strong>引き伸ばしたり、つぶしたりしない</li>
    <li><strong>色を変える</strong>決めた色以外にしない。くちばしと WORKS の金を別の色にしない</li>
    <li><strong>組み方を変える</strong>記号と文字の大きさ・間・位置を動かさない</li>
    <li><strong>文字を打ち直す</strong>別の書体や、書体を入れた文字で作り直さない</li>
    <li><strong>飾りを足す</strong>影・ふち取り・光・グラデーションを付けない</li>
    <li><strong>傾ける</strong>回したり、裏返したりしない</li>
    <li><strong>見えにくい地に置く</strong>写真や柄の上など、ロゴと地の明るさの差が小さい所に置かない</li>
  </ul>
</div></section>

<section id="files"><h2><small>FILES</small>ファイル</h2><div class="body">
  <ul class="files">
    <li><code>radixworks-wide.svg</code><span>横長 1 行（明るい地用）</span></li>
    <li><code>radixworks-wide-cream.svg</code><span>横長 1 行（暗い地用）</span></li>
    <li><code>radixworks-horizontal.svg</code><span>横長 2 行（明るい地用）</span></li>
    <li><code>radixworks-horizontal-cream.svg</code><span>横長 2 行（暗い地用）</span></li>
    <li><code>radixworks-vertical.svg</code><span>縦長（明るい地用）</span></li>
    <li><code>radixworks-vertical-cream.svg</code><span>縦長（暗い地用）</span></li>
    <li><code>radixworks-mark.svg</code><span>記号だけ（明るい地用）</span></li>
    <li><code>radixworks-mark-cream.svg</code><span>記号だけ（暗い地用）</span></li>
    <li><code>radixworks-icon.svg</code><span>アイコン（角丸の地つき）</span></li>
  </ul>
  <p class="note">保存場所：radix-works.github.io の作業用の枝の brand/logo/svg。PNG の画像も同じ名前で brand/logo にあります。</p>
</div></section>
<footer>Radix Works ロゴ仕様書　仮完成　2026年11月17日</footer>
</main>'''
open('spec/index.html','w').write(page)
import os; print(os.path.getsize('spec/index.html'))
