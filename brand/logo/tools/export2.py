"""仮完成のロゴ一式を書き出す（2026-11-17：全部黄金比 A の記号＋Jost 左寄せの文字）"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from peng3 import *
from hbtext import text_hb
O = sys.argv[1] if len(sys.argv) > 1 else '/home/user/radix-works.github.io/brand/logo'
FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
J1, J2 = f'{FD}/jost600.ttf', f'{FD}/jost500.ttf'
INK, PAPER, GOLD, NAVY, CREAM, GOLDD = '#1b2436', '#fbfcfd', '#8f7a4c', '#121a2a', '#ece5d3', '#c9a96a'
PAIRS = {'RA': -0.035, 'AD': -0.02, 'DI': -0.01, 'IX': -0.02}   # 目で合わせた字の組の詰め（大文字の高さに対する割合）
T1 = 0.06            # RADIX の字の間
T2 = 1 / F[3]        # WORKS の字の間
s, body, beak, circ, pts = build(PA)
x0, y0, x1, y1 = s.bounds; MW, MH = x1 - x0, y1 - y0

SIMPLIFY = 0.0004   # 点を間引く許し幅（記号の単位。幅 4,400px に広げても 0.1px ほど）
body_s = body.simplify(SIMPLIFY, preserve_topology=True); beak_s = beak.simplify(SIMPLIFY, preserve_topology=True)
def mark(k, x, y, fg, gd):
    ox, oy = x - x0 * k, y - y0 * k
    return f'<path d="{to_path(body_s,k,ox,oy)}" fill="{fg}" fill-rule="evenodd"/><path d="{to_path(beak_s,k,ox,oy)}" fill="{gd}"/>'

def svg(w, h, inner, bg=None):
    r = ''   # ロゴのファイルには地を入れない（2026-11-17 根本さん「ロゴって背景も含むつもり？」）
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}" viewBox="0 0 {w:.2f} {h:.2f}">{r}{inner}</svg>'

def horizontal(fg, sub, gd, bg, mh=200):
    """横長：記号の右に RADIX／WORKS を左寄せ。RADIX＝記号の高さ÷φ³、WORKS＝RADIX÷φ、行間＝WORKS÷φ、
    記号との間＝RADIX÷φ、文字のかたまりの上のあき：下のあき＝1：φ"""
    k = mh / MH; c1 = mh / F[3]; c2 = c1 / F[1]; lg = c2 / F[1]; gap = c1 / F[1]
    pad = c1 * F[1]
    _, w1 = text_hb('RADIX', J1, c1, 0, 0, T1, PAIRS)
    bh = c1 + lg + c2; cy = pad + (mh - bh) / F[2] + bh / 2
    tx = pad + MW * k + gap; ty1 = cy - bh / 2 + c1; ty2 = ty1 + lg + c2
    d1, _ = text_hb('RADIX', J1, c1, tx, ty1, T1, PAIRS); d2, _ = text_hb('WORKS', J2, c2, tx, ty2, T2)
    W = tx + w1 + pad; H = mh + 2 * pad
    return svg(W, H, mark(k, pad, pad, fg, gd) + f'<path d="{d1}" fill="{fg}"/><path d="{d2}" fill="{sub}"/>', bg)

def vertical(fg, sub, gd, bg, mh=300):
    """縦長：記号の下に RADIX WORKS を 1 行。大文字の高さ＝記号の高さ÷φ⁴、記号との間＝大文字の高さ×φ、語の間＝大文字の高さ÷φ"""
    k = mh / MH; c = mh / F[4]; gap = c * F[1]; sp = c / F[1]
    _, wr = text_hb('RADIX', J1, c, 0, 0, T1 * 2, PAIRS); _, ww = text_hb('WORKS', J2, c, 0, 0, T2 / F[1])
    tw = wr + sp + ww
    pad = c * F[2]
    W = max(tw, MW * k) + 2 * pad; H = pad + mh + gap + c + pad
    mx = (W - MW * k) / 2; tx = (W - tw) / 2; base = pad + mh + gap + c
    d1, _ = text_hb('RADIX', J1, c, tx, base, T1 * 2, PAIRS); d2, _ = text_hb('WORKS', J2, c, tx + wr + sp, base, T2 / F[1])
    return svg(W, H, mark(k, mx, pad, fg, gd) + f'<path d="{d1}" fill="{fg}"/><path d="{d2}" fill="{sub}"/>', bg)

def mark_only(fg, gd, bg, mh=400):
    k = mh / MH; pad = mh / F[3]
    return svg(MW * k + 2 * pad, mh + 2 * pad, mark(k, pad, pad, fg, gd), bg)

def icon(S=1024):
    kk = S / F[1] / MH
    return svg(S, S, f'<rect width="{S}" height="{S}" rx="{S*0.22:.0f}" fill="{NAVY}"/>' + mark(kk, (S - MW * kk) / 2, (S - MH * kk) / 2, CREAM, GOLDD))

def horizontal1(fg, sub, gd, bg, mh=200, n=3, scale=1.0):
    """横長 1 行：記号の右に RADIX WORKS。大文字の高さ＝記号の高さ÷φⁿ、記号との間＝大文字の高さ÷φ、
    語の間＝大文字の高さ÷φ、文字の上のあき：下のあき＝1：φ"""
    k = mh / MH; c = mh / F[n] * scale; gap = c / F[1]; sp = c / F[1]; pad = mh / F[3]
    t2 = T2 / F[1]
    _, wr = text_hb('RADIX', J1, c, 0, 0, T1 * 2, PAIRS); _, ww = text_hb('WORKS', J2, c, 0, 0, t2)
    tx = pad + MW * k + gap
    base = pad + (mh - c) / F[2] + c
    d1, _ = text_hb('RADIX', J1, c, tx, base, T1 * 2, PAIRS); d2, _ = text_hb('WORKS', J2, c, tx + wr + sp, base, t2)
    W = tx + wr + sp + ww + pad; H = mh + 2 * pad
    return svg(W, H, mark(k, pad, pad, fg, gd) + f'<path d="{d1}" fill="{fg}"/><path d="{d2}" fill="{sub}"/>', bg)


def wide_small(fg, sub, gd, bg, c=80, ratio=1.0):
    """横長（記号を小さく）：記号の高さ＝大文字の高さ×ratio。記号の縦の真ん中＝文字の縦の真ん中。
    記号との間＝大文字の高さ÷φ、語の間＝大文字の高さ÷φ"""
    mh = c * ratio; k = mh / MH; gap = c / F[1]; sp = c / F[1]; t2 = T2 / F[1]
    pad = max(mh, c) / F[2]
    _, wr = text_hb('RADIX', J1, c, 0, 0, T1 * 2, PAIRS); _, ww = text_hb('WORKS', J2, c, 0, 0, t2)
    H = max(mh, c) + 2 * pad; cy = H / 2
    tx = pad + MW * k + gap; base = cy + c / 2
    d1, _ = text_hb('RADIX', J1, c, tx, base, T1 * 2, PAIRS); d2, _ = text_hb('WORKS', J2, c, tx + wr + sp, base, t2)
    W = tx + wr + sp + ww + pad
    return svg(W, H, mark(k, pad, cy - mh / 2, fg, gd) + f'<path d="{d1}" fill="{fg}"/><path d="{d2}" fill="{sub}"/>', bg)


if __name__ == '__main__':
    out = {
        'logo-horizontal': horizontal(INK, GOLD, GOLD, None),
        'logo-horizontal-dark': horizontal(CREAM, GOLDD, GOLDD, NAVY),
        'logo-vertical': vertical(INK, GOLD, GOLD, None),
        'logo-vertical-dark': vertical(CREAM, GOLDD, GOLDD, NAVY),
        'mark': mark_only(INK, GOLD, None),
        'mark-dark': mark_only(CREAM, GOLDD, NAVY),
        'icon': icon(),
        'logo-wide': wide_small(INK, GOLD, GOLD, None, ratio=F[1]),            # 記号の高さ＝文字の高さ×φ（2026-11-17 根本さん）
        'logo-wide-dark': wide_small(CREAM, GOLDD, GOLDD, NAVY, ratio=F[1]),
    }
    for n, t in out.items(): open(f'{O}/{n}.svg', 'w').write(t)
    print('ok', list(out))
