import sys, math; sys.path.insert(0,'.')
import peng
from peng3 import *
INK,PAPER,GOLD,NAVY,CREAM,LINE,ACC='#1b2436','#fbfcfd','#8f7a4c','#121a2a','#ece5d3','#c9a96a','#ff7a45'
s,body,beak,circ,pts=build(PA)
BASE=PA['base']; EY=PA['ey']
x0,y0,x1,y1=s.bounds
# --- 1) 組み立て図 ---
S=1400; k=S/2.2/(y1-y0); OX=S*0.5-(x0+x1)/2*k; OY=S*0.44-(y0+y1)/2*k
X=lambda x:OX+x*k; Y=lambda y:OY+y*k
b=f'<rect width="{S}" height="{S}" fill="{NAVY}"/>'
b+='<g stroke="#fff" stroke-opacity=".035">'+''.join(f'<line x1="{X(i)}" y1="0" x2="{X(i)}" y2="{S}"/><line x1="0" y1="{Y(i)}" x2="{S}" y2="{Y(i)}"/>' for i in range(-40,60))+'</g>'
b+=f'<path d="{to_path(body,k,OX,OY)}" fill="{CREAM}" fill-opacity=".93" fill-rule="evenodd"/><path d="{to_path(beak,k,OX,OY)}" fill="{LINE}" fill-opacity=".93"/>'
b+=f'<g fill="none" stroke="{LINE}" stroke-width="1.3">'
for c,r,lab,role in circ:
    b+=f'<circle cx="{X(c[0]):.1f}" cy="{Y(c[1]):.1f}" r="{r*k:.1f}" opacity=".85"/>'
b+='</g>'
for c,r,lab,role in circ:
    if -2<c[0]*k+OX<S+2 and -2<c[1]*k+OY<S+2:
        b+=f'<circle cx="{X(c[0]):.1f}" cy="{Y(c[1]):.1f}" r="3.2" fill="{LINE}"/>'
# 揃えの線（くちばしの先と足の先の縦、目とくちばしの横、地面、頭の中心）
b+=f'<g stroke="{ACC}" stroke-width="1.2" stroke-dasharray="6 6" opacity=".9">'
b+=f'<line x1="{X(F[5])}" y1="{Y(y0)-30}" x2="{X(F[5])}" y2="{Y(BASE)+30}"/>'
b+=f'<line x1="{X(x0)-30}" y1="{Y(EY)}" x2="{X(F[5])+30}" y2="{Y(EY)}"/>'
b+=f'<line x1="{X(x0)-60}" y1="{Y(BASE)}" x2="{X(F[5])+60}" y2="{Y(BASE)}"/>'
b+=f'<line x1="{X(x0)-30}" y1="{Y(0)}" x2="{X(F[4])+30}" y2="{Y(0)}"/><line x1="{X(0)}" y1="{Y(-F[4])-30}" x2="{X(0)}" y2="{Y(BASE)+30}"/></g>'
for v in pts.values(): b+=f'<circle cx="{X(v[0]):.1f}" cy="{Y(v[1]):.1f}" r="4.5" fill="{ACC}"/>'
def T(t,x,y,sz=17,fill=LINE,anc='start'): return f'<text x="{x:.1f}" y="{y:.1f}" font-family="Jost" font-size="{sz}" fill="{fill}" text-anchor="{anc}">{t}</text>'
# 円の書き添え（円周の上、中心から右上 45°の所）
for c,r,lab,role in circ:
    if role in ('目の輪','黒目'): continue
    a=math.radians(-55 if r<10 else -70); tx,ty=X(c[0]+r*math.cos(a)),Y(c[1]+r*math.sin(a))
    if 20<tx<S-60 and 30<ty<S-200: b+=T(lab,tx+6,ty-6,16)
# 目の書き添えは引き出し線で外へ
ex,ey=X(F[1]),Y(EY)
b+=f'<line x1="{ex}" y1="{Y(EY-R5)}" x2="{ex-250}" y2="{Y(EY-R5)-150}" stroke="{LINE}" stroke-width="1"/>'+T("目の輪 √5　黒目 √5/φ",ex-256,Y(EY-R5)-156,15,LINE,"end")
# 高さの寸法線
hx=X(x0)-70
b+=f'<g stroke="{ACC}" stroke-width="1.2"><line x1="{hx}" y1="{Y(-F[4])}" x2="{hx}" y2="{Y(BASE)}"/><line x1="{hx-8}" y1="{Y(-F[4])}" x2="{hx+8}" y2="{Y(-F[4])}"/><line x1="{hx-8}" y1="{Y(0)}" x2="{hx+8}" y2="{Y(0)}"/><line x1="{hx-8}" y1="{Y(BASE)}" x2="{hx+8}" y2="{Y(BASE)}"/></g>'
b+=T('φ⁴',hx-12,Y(-F[4]/2)+6,17,ACC,'end')+T('φ⁵+φ³',hx-12,Y(BASE/2)+6,17,ACC,'end')
# 下の帯
by=S-170
b+=f'<rect x="0" y="{by}" width="{S}" height="{S-by}" fill="{NAVY}"/><line x1="48" y1="{by}" x2="{S-48}" y2="{by}" stroke="#fff" stroke-opacity=".12"/>'
SUP='⁰¹²³⁴⁵⁶⁷⁸⁹'
cx=48; base_=by+110; ks=1.6
for n in range(0,11):
    r=F[n]*ks
    if cx+2*r>S*0.62: break
    on_=n in (4,5,6,9)
    b+=f'<circle cx="{cx+r:.1f}" cy="{base_-r:.1f}" r="{r:.1f}" fill="none" stroke="{LINE}" stroke-opacity="{1 if on_ else .3}" stroke-width="1.1"/>'
    b+=T('φ'+SUP[n],cx+r,base_+24,14,LINE if on_ else '#5d6578','middle'); cx+=2*r+12
b+=T('φ = 1.618…',S-48,by+62,26,CREAM,'end')
b+=T('φ⁴ · φ⁵ · φ⁶ · φ⁹ · φ¹⁰ · √5',S-48,by+94,15,'#8d97aa','end')
b+=T('φ² − φ⁻² = √5',S-48,by+118,15,'#8d97aa','end')
open('construct3.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">{b}</svg>')
# --- 2) 今と磨いた形の見比べ ---
pB=dict(peng.P); pB.update(lA=25,l1=10,fx=12,base=F[6],l2=9,lB=60,bB=125,chin=4,ring_r=R5,pdiv=F[1],ex=1.618,ey=-1.0)
sB,_,_=peng.build(pB); bkB=peng.LAST_BEAK
w=640; b=''
for i,(name,sh,bk) in enumerate([('今（B）',sB,bkB),('磨いた形',s,beak)]):
    bo=sh.difference(bk.buffer(0.001)); a0,b0_,a1,b1_=sh.bounds; kk=470/(b1_-b0_); xx=i*(w+12)
    ox=xx+w/2-(a0+a1)/2*kk; oy=60-b0_*kk
    b+=f'<rect x="{xx}" y="0" width="{w}" height="600" fill="{PAPER}"/><path d="{to_path(bo,kk,ox,oy)}" fill="{INK}" fill-rule="evenodd"/><path d="{to_path(bk,kk,ox,oy)}" fill="{GOLD}"/>'
    b+=f'<text x="{xx+20}" y="36" font-family="IPAGothic" font-size="22" fill="#4a5468">{name}</text>'
open('bvs.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{2*w+12}" height="600" viewBox="0 0 {2*w+12} 600"><rect width="100%" height="100%" fill="#fff"/>{b}</svg>')
