import sys; sys.path.insert(0,'.')
from peng3 import *
INK,PAPER,GOLD,ACC,BLUE,SUB='#1b2436','#fbfcfd','#8f7a4c','#e0602d','#2f6fb0','#4a5468'
p=PA
s,body,beak,circ,pts=build(p)
S=1400; k=34; OX=700; OY=360
X=lambda x:OX+x*k; Y=lambda y:OY+y*k
b=f'<rect width="{S}" height="{S}" fill="{PAPER}"/>'
b+=f'<path d="{to_path(body,k,OX,OY)}" fill="{INK}" fill-opacity=".16" fill-rule="evenodd"/><path d="{to_path(beak,k,OX,OY)}" fill="{GOLD}" fill-opacity=".35"/>'
b+=f'<path d="{to_path(s,k,OX,OY)}" fill="none" stroke="{INK}" stroke-width="1.6"/>'
b+=f'<circle cx="{X(0)}" cy="{Y(0)}" r="{F[4]*k}" fill="none" stroke="{SUB}" stroke-dasharray="3 5" stroke-width="1"/>'
def T(t,x,y,sz=20,fill=ACC,anc='start',w=600): return f'<text x="{x:.1f}" y="{y:.1f}" font-family="IPAGothic" font-size="{sz}" font-weight="{w}" fill="{fill}" text-anchor="{anc}">{t}</text>'
def vdim(x,y1,y2,col,lab,side=-1):
    r=f'<g stroke="{col}" stroke-width="2"><line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}"/><line x1="{x-9}" y1="{y1}" x2="{x+9}" y2="{y1}"/><line x1="{x-9}" y1="{y2}" x2="{x+9}" y2="{y2}"/></g>'
    return r+T(lab,x+side*14,(y1+y2)/2+7,20,col,'end' if side<0 else 'start')
def hdim(y,x1,x2,col,lab,above=True):
    r=f'<g stroke="{col}" stroke-width="2"><line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}"/><line x1="{x1}" y1="{y-9}" x2="{x1}" y2="{y+9}"/><line x1="{x2}" y1="{y-9}" x2="{x2}" y2="{y+9}"/></g>'
    return r+T(lab,(x1+x2)/2,y-14 if above else y+30,20,col,'middle')
# ① 頭の直径 : 全体の高さ = 1 : φ
b+=vdim(X(-9.08)-40,Y(-F[4]),Y(F[4]),ACC,'① 頭の直径 1')
b+=vdim(X(-9.08)-170,Y(-F[4]),Y(F[5]+F[3]),ACC,"全体の高さ φ")
# ② 目の横の位置（頭の直径を φ : 1 に分ける）
ey=-F[1]
b+=hdim(Y(-F[4])-40,X(-F[4]),X(F[1]),BLUE,'② φ')
b+=hdim(Y(-F[4])-40,X(F[1]),X(F[4]),BLUE,'1')
# ③ 目の縦の位置（頭の直径を 1 : φ に分ける）
b+=vdim(X(F[4])+150,Y(-F[4]),Y(ey),'#2a8a5a','③ 1',1)
b+=vdim(X(F[4])+150,Y(ey),Y(F[4]),'#2a8a5a','φ',1)
b+=f'<line x1="{X(-F[4])}" y1="{Y(ey)}" x2="{X(F[4])+150}" y2="{Y(ey)}" stroke="#2a8a5a" stroke-dasharray="4 4"/>'
b+=f'<line x1="{X(F[1])}" y1="{Y(-F[4])-40}" x2="{X(F[1])}" y2="{Y(F[4])}" stroke="{BLUE}" stroke-dasharray="4 4"/>'
# ④ くちばしの長さ : 頭の半径 = 1 : φ
b+=hdim(Y(F[4])+60,X(0),X(F[4]),'#8a5ab0','頭の半径 φ',False)
b+=hdim(Y(F[4])+60,X(F[4]),X(F[5]),'#8a5ab0','④ くちばし 1',False)
b+=f'<g stroke="#8a5ab0" stroke-dasharray="4 4"><line x1="{X(F[4])}" y1="{Y(0)}" x2="{X(F[4])}" y2="{Y(F[4])+60}"/><line x1="{X(F[5])}" y1="{Y(ey)}" x2="{X(F[5])}" y2="{Y(F[4])+60}"/><line x1="{X(0)}" y1="{Y(0)}" x2="{X(0)}" y2="{Y(F[4])+60}"/></g>'
# ⑥ 角度：頭の中心からの線
import math
ANG=[(-360/F[6],'360°÷φ⁶'),(360/F[7],'360°÷φ⁷'),(360/F[5],'360°÷φ⁵'),(360/F[4],'360°÷φ⁴'),(360/F[2],'360°÷φ²')]
for a,lab in ANG:
    r=math.radians(a); ex_,ey_=math.cos(r),math.sin(r)
    b+=f'<line x1="{X(0)}" y1="{Y(0)}" x2="{X(ex_*F[4]*1.0)}" y2="{Y(ey_*F[4]*1.0)}" stroke="#b07a2a" stroke-width="1.3" stroke-dasharray="2 4"/>'
    b+=f'<circle cx="{X(ex_*F[4])}" cy="{Y(ey_*F[4])}" r="4" fill="#b07a2a"/>'
    lx,ly=X(ex_*(F[4]+1.1)),Y(ey_*(F[4]+1.1))
    if a==360/F[7]: lx,ly=X(ex_*F[4])-14,Y(ey_*F[4])+26
    if a==360/F[5]: lx,ly=X(ex_*F[4])+30,Y(ey_*F[4])+44
    if a==360/F[4]: lx,ly=X(ex_*F[4])-14,Y(ey_*F[4])-16
    if a==360/F[2]: lx,ly=X(ex_*F[4])-30,Y(ey_*F[4])+40
    anc='end' if (ex_<0 or a in (360/F[7],360/F[4])) else 'start'
    b+=T(f'⑥ {lab}',lx,ly,16,'#b07a2a',anc,400)
# 下の説明
y0=1000
lines=[('① 頭の直径 : 全体の高さ ＝ 1 : φ',ACC),('② 目は頭の横幅を φ : 1 に分ける所',BLUE),('③ 目は頭の高さを 1 : φ に分ける所',"#2a8a5a"),('④ くちばしの長さ : 頭の半径 ＝ 1 : φ','#8a5ab0'),
       ('⑤ 輪郭の円の大きさは、すべて φ の段（φ⁴・φ⁵・φ⁶・φ⁹・φ¹⁰）。隣の段どうしは 1 : φ',INK),
       ('⑥ 円が頭と交わる角度は 360° ÷ φⁿ（137.5°・52.5°・32.5°・20.1°・12.4°）','#b07a2a'),
       ('⑦ 目の輪は √5（＝φ＋1/φ）、黒目は √5/φ、黒目のずらしは 1/φ²',SUB)]
for i,(t,c) in enumerate(lines): b+=T(t,90,y0+i*44,24,c)
b+=T('黄金比ではないそろえ：くちばしの先と足の先は縦一列、尾の先は頭の左端の真下、くちばしの先は目と同じ高さ',90,y0+7*44+16,18,SUB,'start',400)
b+=T('φ ＝ 1.618…',S-60,80,34,INK,'end')
open('gexplain.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">{b}</svg>')
