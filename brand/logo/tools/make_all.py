"""ロゴの全ファイルを書き出す：svg（地なし）・svg-bg（地あり）・png・png-bg・ZIP"""
import sys, os, re, subprocess, zipfile, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export2 as e
O = '/home/user/radix-works.github.io/brand/logo'
REN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sheet.mjs')
types = {'wide': lambda fg, sub, gd: e.wide_small(fg, sub, gd, None, ratio=e.F[1]),
         'horizontal': lambda fg, sub, gd: e.horizontal(fg, sub, gd, None),
         'stacked': lambda fg, sub, gd: e.stacked_wide(fg, sub, gd, None, n=2.0, pos='radix'),
         'vertical': lambda fg, sub, gd: e.vertical(fg, sub, gd, None),
         'mark': lambda fg, sub, gd: e.mark_only(fg, gd, None)}
schemes = {'': (e.INK, e.GOLD, e.GOLD, '#ffffff', 'on-white'),
           '-cream': (e.CREAM, e.GOLDD, e.GOLDD, e.NAVY, 'on-navy'),
           '-gray': (e.G_INK, e.G_GOLD, e.G_GOLD, '#ffffff', 'gray-on-white'),
           '-gray-cream': (e.G_CREAM, e.G_GOLDD, e.G_GOLDD, e.G_NAVY, 'gray-on-black'),
           # 一色：くちばしと WORKS も同じ色（はんこ・刺しゅう・切り文字・焼き印など）
           '-black': ('#000000', '#000000', '#000000', '#ffffff', 'black-on-white'),
           '-white': ('#ffffff', '#ffffff', '#ffffff', '#000000', 'white-on-black')}
for d in ['svg', 'svg-bg', 'png', 'png-bg']:
    os.makedirs(f'{O}/{d}', exist_ok=True)
    for f in glob.glob(f'{O}/{d}/*'): os.remove(f)
def with_bg(s, bg):
    head = re.match(r'(<svg[^>]*>)', s).group(1); vb = re.search(r'viewBox="([\d. ]+)"', head).group(1).split()
    return head + f'<rect x="{vb[0]}" y="{vb[1]}" width="{vb[2]}" height="{vb[3]}" fill="{bg}"/>' + s[len(head):]
jobs = []
for t, fn in types.items():
    for suf, (fg, sub, gd, bg, bgname) in schemes.items():
        s = fn(fg, sub, gd)
        p = f'{O}/svg/radixworks-{t}{suf}.svg'; open(p, 'w').write(s); jobs.append((p, f'{O}/png/radixworks-{t}{suf}.png'))
        pb = f'{O}/svg-bg/radixworks-{t}-{bgname}.svg'; open(pb, 'w').write(with_bg(s, bg)); jobs.append((pb, f'{O}/png-bg/radixworks-{t}-{bgname}.png'))
# プロフィール画像（地あり・正方形）と ファビコン（2026-11-17 根本さん：アプリではないので角丸のアイコンは外す）
os.makedirs(f'{O}/profile', exist_ok=True); os.makedirs(f'{O}/favicon', exist_ok=True)
for f in glob.glob(f'{O}/profile/*') + glob.glob(f'{O}/favicon/*'): os.remove(f)
for suf, (fg, sub, gd, bg, bgname) in schemes.items():
    p = f'{O}/profile/radixworks-profile-{bgname}.svg'; open(p, 'w').write(e.profile(fg, gd, bg)); jobs.append((p, p[:-4] + '.png'))
open(f'{O}/favicon/favicon.svg', 'w').write(e.favicon())
for src, dst in jobs:
    subprocess.run(['node', REN, src, dst, '1' if '/profile/' in src else '2'], check=True)
# ファビコンの画像：大きな絵から縮めて作る
from PIL import Image
subprocess.run(['node', REN, f'{O}/favicon/favicon.svg', f'{O}/favicon/_big.png', '8'], check=True)
big = Image.open(f'{O}/favicon/_big.png').convert('RGBA')
for n in (16, 32, 48, 180, 192, 512):
    big.resize((n, n), Image.LANCZOS).save(f'{O}/favicon/favicon-{n}.png')
big.resize((180, 180), Image.LANCZOS).save(f'{O}/favicon/apple-touch-icon.png')
big.save(f'{O}/favicon/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
os.remove(f'{O}/favicon/_big.png')
z = f'{O}/radixworks-logo-svg.zip'
if os.path.exists(z): os.remove(z)
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
    for f in sorted(glob.glob(f'{O}/svg/*.svg')): zf.write(f, 'radixworks-logo/' + os.path.basename(f))
    for f in sorted(glob.glob(f'{O}/svg-bg/*.svg')): zf.write(f, 'radixworks-logo/with-background/' + os.path.basename(f))
    for f in sorted(glob.glob(f'{O}/profile/*')): zf.write(f, 'radixworks-logo/profile/' + os.path.basename(f))
    for f in sorted(glob.glob(f'{O}/favicon/*')): zf.write(f, 'radixworks-logo/favicon/' + os.path.basename(f))
print('svg', len(glob.glob(f'{O}/svg/*.svg')), 'svg-bg', len(glob.glob(f'{O}/svg-bg/*.svg')), 'zip', os.path.getsize(z))
