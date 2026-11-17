import math
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

PHI = (1 + 5 ** 0.5) / 2
F = [PHI ** n for n in range(9)]   # 1, φ, φ², …（半径の段）
RES = 1024

def disc(c, r):
    return Point(*c).buffer(r, resolution=RES)

def center_through(p, q, r, side):
    """2 点 p, q を通る半径 r の円の中心。side=+1/-1 でどちら側か"""
    mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
    dx, dy = q[0] - p[0], q[1] - p[1]
    d = math.hypot(dx, dy)
    h = math.sqrt(max(r * r - (d / 2) ** 2, 0))
    nx, ny = -dy / d, dx / d
    return (mx + side * h * nx, my + side * h * ny)

def on(c, r, deg):
    a = math.radians(deg)
    return (c[0] + r * math.cos(a), c[1] + r * math.sin(a))

def arc(c, a, b, n=400):
    """円 c 上を点 a から点 b へ短い向きにたどる"""
    t0 = math.atan2(a[1] - c[1], a[0] - c[0]); t1 = math.atan2(b[1] - c[1], b[0] - c[0])
    d = (t1 - t0 + math.pi) % (2 * math.pi) - math.pi
    r = math.dist(c, a)
    return [(c[0] + r * math.cos(t0 + d * i / n), c[1] + r * math.sin(t0 + d * i / n)) for i in range(n + 1)]

def build(p):
    circles = []           # (中心, 半径, 段の番号, 役目)
    def use(c, n, role):
        circles.append((c, F[n], n, role)); return disc(c, F[n])

    O = (0.0, 0.0)
    bowl = use(O, p['bowl'], '外の丸')
    ic = (p['cdx'], p['cdy'])
    counter = use(ic, p['ctr'], '内の丸')

    # 幹（根）：左の縁は外の丸に左端で接する大きな円
    A = (-F[p['bowl']] + F[p['stemL']], 0.0)
    discA = use(A, p['stemL'], '幹の左の縁')
    ty = p['base']
    tx = A[0] - math.sqrt(F[p['stemL']] ** 2 - ty ** 2)
    T = (tx, ty)
    P = (p['stemPx'], math.sqrt(F[p['bowl']] ** 2 - p['stemPx'] ** 2))  # 外の丸の下側の点
    b1 = center_through(T, P, F[p['stemR']], 1); b2 = center_through(T, P, F[p['stemR']], -1)
    B = max((b1, b2), key=lambda c: c[0])
    discB = use(B, p['stemR'], '幹の右の縁')
    L = (-F[p['bowl']], 0.0)
    stem = Polygon(arc(A, L, T) + arc(B, T, P)[1:] + arc(O, P, L)[1:-1]).buffer(0)

    # 脚（根の枝）：上の縁 E1 は外の丸の M、下の縁 E2 は外の丸の Q から出て、先 T2 で交わる
    T2 = (p['tipx'], ty)
    M = on(O, F[p['bowl']], p['legM'])
    Q = on(O, F[p['bowl']], p['legQ'])
    def ctr(a, b, n):
        c1 = center_through(a, b, F[n], 1); c2 = center_through(a, b, F[n], -1)
        return max((c1, c2), key=lambda c: c[0] - c[1])
    E1 = ctr(M, T2, p['e1']); E2 = ctr(Q, T2, p['e2'])
    d1 = use(E1, p['e1'], '脚の上の縁'); d2 = use(E2, p['e2'], '脚の下の縁')
    leg = Polygon(arc(E1, M, T2) + arc(E2, T2, Q)[1:] + arc(O, Q, M)[1:-1]).buffer(0)
    shape = unary_union([bowl.difference(counter), stem, leg])
    return shape, circles, dict(T=T, T2=T2, P=P, Q=Q, M=M)

GA = 360 * (1 - 1 / PHI)          # 黄金角 137.5°
P0 = dict(bowl=4, ctr=3, cdx=-math.cos(math.radians(60)), cdy=-math.sin(math.radians(60)),
          stemL=6, stemR=5, stemPx=-F[3], base=F[5], tipx=F[4] + F[2],
          legM=(180 - GA), legQ=2 * (180 - GA), e1=7, e2=6)

def to_path(g, k=1, ox=0, oy=0):
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    out = []
    for poly in polys:
        for ring in [poly.exterior] + list(poly.interiors):
            cs = list(ring.coords)[:-1]
            out.append('M' + ' L'.join(f'{ox + x * k:.2f} {oy + y * k:.2f}' for x, y in cs) + 'Z')
    return ' '.join(out)
