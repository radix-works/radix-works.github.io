"""ペンギン × R（B を磨いた版）。輪郭はすべて円弧。円の一覧も返す"""
import math
from shapely.geometry import Polygon
from shapely.ops import unary_union
from logo2 import PHI, disc, center_through, on, arc, to_path

F = [PHI ** n for n in range(14)]
R5 = 5 ** 0.5

def build(p):
    circles = []   # (中心, 半径, 書き添え, 役目)
    def edge(a, b, r, hint, label, role):
        c1 = center_through(a, b, r, 1); c2 = center_through(a, b, r, -1)
        c = min((c1, c2), key=lambda c: math.dist(c, hint))
        circles.append((c, r, label, role)); return arc(c, a, b), c
    def poly(*parts):
        pts = list(parts[0])
        for q in parts[1:]: pts += list(q)[1:]
        return Polygon(pts).buffer(0)

    O = (0.0, 0.0); RO = F[4]; base = p.get('base', F[6])
    circles.append((O, RO, 'φ⁴', '頭'))

    # 目
    ec = (F[1], p.get('ey', -1.0)); er = R5
    circles.append((ec, er, '√5', '目の輪'))
    pr = er / F[1]; pc = (ec[0] + p['px'], ec[1])
    circles.append((pc, pr, '√5/φ', '黒目'))

    # くちばし：先は目の中心と同じ高さ、x＝φ⁵
    B1 = on(O, RO, p['bk1']); B2 = on(O, RO, p['bk2']); BT = (F[5], ec[1] + p['bky'])
    e1, _ = edge(B1, BT, F[5], (0, 40), 'φ⁵', 'くちばしの上')
    e2, _ = edge(BT, B2, F[5], (0, -40), 'φ⁵', 'くちばしの下')
    beak = poly(e1, e2, arc(O, B2, B1))

    # 背中（R の縦の画）：左の縁は頭の円に内側から接する φ⁷ の円
    L = on(O, RO, p['bA'])
    u = ((O[0] - L[0]) / RO, (O[1] - L[1]) / RO)
    Rb = F[p.get('bR', 7)]; cb = (L[0] + u[0] * Rb, L[1] + u[1] * Rb)
    circles.append((cb, Rb, {5: 'φ⁵', 6: 'φ⁶', 7: 'φ⁷'}[p.get('bR', 7)], '背中の外'))
    tx = cb[0] - math.sqrt(Rb ** 2 - (base - cb[1]) ** 2)
    TL = (tx, base)
    P = on(O, RO, p['bB'])
    e3, _ = edge(TL, P, F[6], (40, 0), 'φ⁶', '背中の内')
    back = poly(arc(cb, L, TL), e3, arc(O, P, L))

    # 脚（胸からお腹の線）：先はくちばしの先と縦一列（x＝φ⁵）
    M = on(O, RO, p['lA']); Q = on(O, RO, p['lB']); TF = (F[5], base)
    e4, _ = edge(M, TF, F[10], (-40, 0), 'φ¹⁰', '脚の外')
    e5, _ = edge(TF, Q, F[9], (-40, 0), 'φ⁹', '脚の内')
    leg = poly(e4, e5, arc(O, Q, M))

    head = disc(O, RO).difference(disc(ec, er))
    shape = unary_union([head, beak, back, leg])
    # あご：P と Q を通る φ⁴ の円で頭の中だけ白く抜く
    c1 = center_through(P, Q, F[4], 1); c2 = center_through(P, Q, F[4], -1)
    cc = max((c1, c2), key=lambda c: c[1]); circles.append((cc, F[4], 'φ⁴', 'あご'))
    shape = shape.difference(disc(cc, F[4]).intersection(disc(O, RO)))
    shape = unary_union([shape, disc(pc, pr)])
    body = shape.difference(beak.buffer(0.001))
    pts = dict(L=L, TL=TL, P=P, M=M, Q=Q, TF=TF, BT=BT, B1=B1, B2=B2)
    return shape, body, beak, circles, pts

P3 = dict(px=0.51, bk1=-22, bk2=8, bky=0.0, bA=192.6, bB=125, lA=25, lB=60)

if __name__ == '__main__':
    s, body, beak, circ, pts = build(P3)
    print({k: (round(v[0], 3), round(v[1], 3)) for k, v in pts.items()})
    print(s.bounds)

# 仮完成（2026-11-17 根本さん「黄金比aのほうを仮完成にして」）：全部黄金比 A
_A = lambda n: 360 / F[n]
PA = dict(P3, bR=6, base=F[5] + F[3], ey=-F[1], px=1 / F[2],
          bk1=-_A(6), bk2=_A(7), lA=_A(5), lB=_A(4), bB=_A(2), bA=216.95)
# 前の仮完成（ふっくら）
PLUMP = dict(P3, bR=6, bA=213.45)
