"""ペンギン × R × 根。輪郭はすべて半径 φⁿ の円弧"""
import math
from shapely.geometry import Polygon
from shapely.ops import unary_union
from logo2 import PHI, disc, center_through, on, arc, to_path

F = [PHI ** n for n in range(14)]
GA = 360 * (1 - 1 / PHI)

def build(p):
    circles = []
    def edge(a, b, n, hint):
        c1 = center_through(a, b, F[n], 1); c2 = center_through(a, b, F[n], -1)
        c = min((c1, c2), key=lambda c: math.dist(c, hint))
        circles.append((c, F[n], n)); return arc(c, a, b)
    def poly(*parts):
        pts = list(parts[0])
        for q in parts[1:]: pts += list(q)[1:]
        return Polygon(pts[:-1]).buffer(0)

    O = (0.0, 0.0); RO = F[p['head']]
    circles.append((O, RO, p['head']))
    eye_c = (p['ex'], p['ey'])
    ring_r = F[p['ring']]
    circles.append((eye_c, ring_r, p['ring']))
    head = disc(O, RO).difference(disc(eye_c, ring_r))
    pupil = disc((eye_c[0] + p['px'], eye_c[1] + p['py']), F[p['pupil']])
    circles.append(((eye_c[0] + p['px'], eye_c[1] + p['py']), F[p['pupil']], p['pupil']))
    base = p['base']

    # くちばし：頭の右から尖る
    B1 = on(O, RO, p['bk1']); B2 = on(O, RO, p['bk2']); BT = (RO + p['bkl'], p['bky'])
    beak = poly(edge(B1, BT, p['bkr'], (0, 40)), edge(BT, B2, p['bkr'], (0, -40)), arc(O, B2, B1))

    # 背中（R の縦の画）：頭の左上から外へふくらみ、尾の先へ
    L = on(O, RO, p['bA']); P = on(O, RO, p['bB']); TL = (p['tx'], base)
    back = poly(edge(L, TL, p['b1'], (40, 0)), edge(TL, P, p['b2'], (40, 0)), arc(O, P, L))

    # 胸からお腹と足（R の脚）：頭の右下から外へふくらんで足の先へ
    M = on(O, RO, p['lA']); Q = on(O, RO, p['lB']); TF = (p['fx'], base)
    belly = poly(edge(M, TF, p['l1'], (-40, 0)), edge(TF, Q, p['l2'], (-40, 0)), arc(O, Q, M))

    parts = [head, beak, back, belly]
    if p.get('roots'):
        # 地面：φ¹² の円（ほぼ水平）を細い帯にして、上下にすきまを空ける
        g = p['g']; R12 = F[12]
        gy = p.get('gy', base)
        gc = (p['gx'], gy + R12)
        ground = disc(gc, R12 + g / 2).difference(disc(gc, R12 - g / 2)).intersection(disc((p['gx'], gy), p['gw']))
        cut = disc(gc, R12 + g / 2 + p['gap']).difference(disc(gc, R12 - g / 2 - p['gap']))
        parts = [x.difference(disc(gc, R12 + g / 2 + p['gap'])) for x in parts] + [ground]
        if p.get('rootlen'):
            yb = gy + g / 2 + p['gap']
            def span(geom):
                from shapely.geometry import LineString
                seg = geom.intersection(LineString([(-50, gy - 0.05), (50, gy - 0.05)]))
                return seg.bounds[0], seg.bounds[2]
            rl = p['rootlen']
            def root(xa, xb, dx, dy, n1, n2, side):
                tip = ((xa + xb) / 2 + dx, yb + dy)
                a = (xa, yb - 1); b = (xb, yb - 1)
                hint = (tip[0] - side * 40, yb)
                r = Polygon(edge(a, tip, n1, hint) + edge(tip, b, n2, hint)[1:]).buffer(0)
                return r.intersection(disc(gc, R12 - g / 2 - p['gap']))
            xa, xb = span(back); xc, xd = span(belly)
            roots = [root(xa, xb, -rl * 0.62, rl, p['r1'], p['r2'], -1),
                     root(xc, xd, rl * 0.62, rl, p['r2'], p['r1'], 1)]
            if p.get('tap'):
                m = (xb + xc) / 2; w = p['tap']
                roots.append(root(m - w / 2, m + w / 2, 0.3, rl * 1.3, p['r1'] + 1, p['r1'] + 1, 1))
            parts += roots
    shape = unary_union(parts + [pupil])
    return shape, circles, dict(L=L, P=P, TL=TL, M=M, Q=Q, TF=TF, BT=BT)

P = dict(head=4, ring=2, ex=1.2, ey=-0.8, px=0.6, py=0.0, pupil=0,
         bk1=-22, bk2=8, bkl=F[3], bky=-0.4, bkr=5,
         bA=200, bB=110, tx=-F[3], b1=6, b2=6,
         lA=35, lB=80, fx=F[4] + F[1], l1=6, l2=5, base=F[6])
