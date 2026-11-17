import sys, re; sys.path.insert(0,'.')
import export2 as e
from export2 import *
ACC='#e0602d'; BLUE='#2f6fb0'; GRN='#2a8a5a'; PUR='#8a5ab0'; SUB='#4a5468'
def T(t,x,y,sz=17,fill=ACC,anc='start'): return f'<text x="{x:.1f}" y="{y:.1f}" font-family="IPAGothic" font-size="{sz}" fill="{fill}" text-anchor="{anc}">{t}</text>'
def vd(x,y1,y2,col,lab,side=1):
    return (f'<g stroke="{col}" stroke-width="1.6"><line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}"/><line x1="{x-6}" y1="{y1}" x2="{x+6}" y2="{y1}"/><line x1="{x-6}" y1="{y2}" x2="{x+6}" y2="{y2}"/></g>'
            + T(lab,x+side*10,(y1+y2)/2+6,16,col,'start' if side>0 else 'end'))
def hd(y,x1,x2,col,lab,above=True):
    return (f'<g stroke="{col}" stroke-width="1.6"><line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}"/><line x1="{x1}" y1="{y-6}" x2="{x1}" y2="{y+6}"/><line x1="{x2}" y1="{y-6}" x2="{x2}" y2="{y+6}"/></g>'
            + T(lab,(x1+x2)/2,y-10 if above else y+22,16,col,'middle'))
b=''; Y0=0
# ① 横長 2 行
mh=260; X=160; Y=Y0+110
k=mh/MH; c1=mh/(2*F[1]); c2=c1/F[1]; lg=c2/F[1]; gap=c1/F[1]
_,w1=text_hb('RADIX',J1,c1,0,0,T1,PAIRS)
bh=c1+lg+c2; cy=Y+(mh-bh)/F[2]+bh/2; tx=X+MW*k+gap; ty1=cy-bh/2+c1; ty2=ty1+lg+c2
d1,_=text_hb('RADIX',J1,c1,tx,ty1,T1,PAIRS); d2,_=text_hb('WORKS',J2,c2,tx,ty2,T2)
b+=T('横長 2 行',30,Y0+40,24,SUB)
b+=mark(k,X,Y,INK,GOLD)+f'<path d="{d1}" fill="{INK}" fill-opacity=".85"/><path d="{d2}" fill="{GOLD}" fill-opacity=".85"/>'
b+=vd(X-40,Y,Y+mh,ACC,'記号の高さ 1',-1)
b+=vd(tx+w1+40,ty1-c1,ty1,BLUE,'RADIX 1/(2φ)')
b+=vd(tx+w1+40,ty2-c2,ty2,BLUE,'WORKS 1/(2φ²)')
b+=vd(tx+w1+150,ty1,ty2-c2,GRN,'行の間 1/(2φ³)')
b+=vd(tx+w1+290,ty1-c1,ty2,ACC,'文字のかたまり 1/φ')
b+=vd(tx+w1+470,Y,ty1-c1,PUR,'上のあき 1')
b+=vd(tx+w1+470,ty2,Y+mh,PUR,'下のあき φ')
b+=hd(Y+mh+40,X+MW*k,tx,ACC,'記号との間＝RADIX÷φ',False)
b+=f'<g stroke="#cfd6df" stroke-dasharray="3 4"><line x1="{X-60}" y1="{Y}" x2="{tx+w1+500}" y2="{Y}"/><line x1="{X-60}" y1="{Y+mh}" x2="{tx+w1+500}" y2="{Y+mh}"/><line x1="{X+MW*k}" y1="{Y-10}" x2="{X+MW*k}" y2="{Y+mh+50}"/><line x1="{tx}" y1="{Y-10}" x2="{tx}" y2="{Y+mh+50}"/></g>'
Y0=Y+mh+110
# ② 横長 1 行
c=80; mh=c*F[1]; k=mh/MH; X=160; Y=Y0+90; gap=c/F[1]; sp=c/F[1]; t2=T2/F[1]
cyy=Y+mh/2
_,wr=text_hb('RADIX',J1,c,0,0,T1*2,PAIRS); _,ww=text_hb('WORKS',J2,c,0,0,t2)
tx=X+MW*k+gap; base=cyy+c/2
d1,_=text_hb('RADIX',J1,c,tx,base,T1*2,PAIRS); d2,_=text_hb('WORKS',J2,c,tx+wr+sp,base,t2)
b+=T('横長 1 行',30,Y0+40,24,SUB)
b+=mark(k,X,Y,INK,GOLD)+f'<path d="{d1}" fill="{INK}" fill-opacity=".85"/><path d="{d2}" fill="{GOLD}" fill-opacity=".85"/>'
b+=vd(X-40,Y,Y+mh,ACC,'記号 φ',-1)
b+=vd(tx+wr+sp+ww+40,base-c,base,BLUE,'文字 1')
b+=hd(Y+mh+40,X+MW*k,tx,ACC,'記号との間 1/φ',False)
b+=hd(Y+mh+40,tx+wr,tx+wr+sp,GRN,'語の間 1/φ',False)
b+=f'<line x1="{X-60}" y1="{cyy}" x2="{tx+wr+sp+ww+30}" y2="{cyy}" stroke="{PUR}" stroke-dasharray="5 5"/>'+T('記号と文字の縦の真ん中をそろえる',tx+wr+sp+ww,base-c-14,15,PUR,'end')
Y0=Y+mh+120
# ③ 縦長
mh=300; k=mh/MH; c=mh/F[4]; gap=c*F[1]; sp=c/F[1]
_,wr=text_hb('RADIX',J1,c,0,0,T1*2,PAIRS); _,ww=text_hb('WORKS',J2,c,0,0,T2/F[1]); tw=wr+sp+ww
CX=560; Y=Y0+70; mx=CX-MW*k/2; tx=CX-tw/2; base=Y+mh+gap+c
d1,_=text_hb('RADIX',J1,c,tx,base,T1*2,PAIRS); d2,_=text_hb('WORKS',J2,c,tx+wr+sp,base,T2/F[1])
b+=T('縦長',30,Y0+40,24,SUB)
b+=mark(k,mx,Y,INK,GOLD)+f'<path d="{d1}" fill="{INK}" fill-opacity=".85"/><path d="{d2}" fill="{GOLD}" fill-opacity=".85"/>'
b+=vd(tx-40,Y,Y+mh,ACC,'記号の高さ 1',-1)
b+=vd(tx+tw+40,Y+mh,base-c,GRN,'記号との間＝文字×φ')
b+=vd(tx+tw+40,base-c,base,BLUE,'文字 1/φ⁴')
b+=hd(base+40,tx+wr,tx+wr+sp,GRN,'語の間＝文字÷φ',False)
H=base+130
b+=T('どの形も：RADIX と WORKS の字の間は、書体の詰め＋目で合わせた詰め。WORKS は RADIX より一段細い',30,H-20,15,SUB)
open('type_ratios.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="{H:.0f}" viewBox="0 0 1400 {H:.0f}"><rect width="100%" height="100%" fill="#fbfcfd"/>{b}</svg>')
print(H)
