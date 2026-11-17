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
           '-gray-cream': (e.G_CREAM, e.G_GOLDD, e.G_GOLDD, e.G_NAVY, 'gray-on-black')}
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
# アイコン（地あり）
S = 1024; kk = S / e.F[1] / e.MH
for suf, (bgc, body, beak) in {'': (e.NAVY, e.CREAM, e.GOLDD), '-gray': (e.G_NAVY, e.G_CREAM, e.G_GOLDD)}.items():
    s = e.svg(S, S, f'<rect width="{S}" height="{S}" rx="{S*0.22:.0f}" fill="{bgc}"/>' + e.mark(kk, (S - e.MW * kk) / 2, (S - e.MH * kk) / 2, body, beak))
    p = f'{O}/svg/radixworks-icon{suf}.svg'; open(p, 'w').write(s); jobs.append((p, f'{O}/png/radixworks-icon{suf}.png'))
for src, dst in jobs:
    subprocess.run(['node', REN, src, dst, '2'], check=True)
z = f'{O}/radixworks-logo-svg.zip'
if os.path.exists(z): os.remove(z)
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
    for f in sorted(glob.glob(f'{O}/svg/*.svg')): zf.write(f, 'radixworks-logo/' + os.path.basename(f))
    for f in sorted(glob.glob(f'{O}/svg-bg/*.svg')): zf.write(f, 'radixworks-logo/with-background/' + os.path.basename(f))
print('svg', len(glob.glob(f'{O}/svg/*.svg')), 'svg-bg', len(glob.glob(f'{O}/svg-bg/*.svg')), 'zip', os.path.getsize(z))
