import sys, os; sys.path.insert(0,'.')
from peng3 import *
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
O='/home/user/radix-works.github.io/brand/logo'; FD='fonts'
INK,PAPER,GOLD,NAVY,CREAM,GOLDD='#1b2436','#fbfcfd','#8f7a4c','#121a2a','#ece5d3','#c9a96a'
FINAL=PA   # 仮完成：全部黄金比 A（2026-11-17 根本さん）
s,body,beak,circ,pts=build(FINAL)
x0,y0,x1,y1=s.bounds; MW,MH=x1-x0,y1-y0
def text(txt,ff,cap,x,y,track=0.0):
    f=TTFont(ff); gs=f.getGlyphSet(); cm=f.getBestCmap(); sc=cap/f['OS/2'].sCapHeight; d=[]; cx=x
    for i,ch in enumerate(txt):
        g=cm[ord(ch)]; pen=SVGPathPen(gs); gs[g].draw(TransformPen(pen,(sc,0,0,-sc,cx,y))); d.append(pen.getCommands())
        cx+=gs[g].width*sc+(track*cap if i<len(txt)-1 else 0)
    return ' '.join(d), cx-x
def mark(k,x,y,fg,gd):
    ox,oy=x-x0*k,y-y0*k
    return f'<path d="{to_path(body,k,ox,oy)}" fill="{fg}" fill-rule="evenodd"/><path d="{to_path(beak,k,ox,oy)}" fill="{gd}"/>'
def svg(w,h,body_,bg=None):
    r=f'<rect width="{w:.0f}" height="{h:.0f}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}" viewBox="0 0 {w:.1f} {h:.1f}">{r}{body_}</svg>'
def save(n,t): open(f'{O}/{n}.svg','w').write(t)
k=40; pad=k*F[3]
save('mark',svg(MW*k+2*pad,MH*k+2*pad,mark(k,pad,pad,INK,GOLD)))
save('mark-dark',svg(MW*k+2*pad,MH*k+2*pad,mark(k,pad,pad,CREAM,GOLDD),NAVY))
def horiz(fg,sub,gd,bg):
    mh=190; k=mh/MH; cap1=mh/F[2]*0.62; cap2=cap1/F[1]; gap=mh/F[3]
    _,w1=text('RADIX',f'{FD}/jost600.ttf',cap1,0,0,0.14); w0=text('WORKS',f'{FD}/jost500.ttf',cap2,0,0)[1]
    tr=(w1-w0)/4/cap2; lead=cap2*0.9; bh=cap1+lead+cap2
    X=60; Y=60; tx=X+MW*k+gap; ty1=Y+mh*0.5-bh/2+cap1+mh*0.06; ty2=ty1+lead+cap2
    d1,_=text('RADIX',f'{FD}/jost600.ttf',cap1,tx,ty1,0.14); d2,_=text('WORKS',f'{FD}/jost500.ttf',cap2,tx,ty2,tr)
    return svg(tx+w1+60,mh+120,mark(k,X,Y,fg,gd)+f'<path d="{d1}" fill="{fg}"/><path d="{d2}" fill="{sub}"/>',bg)
save('logo-horizontal',horiz(INK,GOLD,GOLD,None))
save('logo-horizontal-dark',horiz(CREAM,GOLDD,GOLDD,NAVY))
mh=250; k=mh/MH; cap=mh/F[3]*0.62
d,w=text('RADIX WORKS',f'{FD}/jost600.ttf',cap,0,0,0.22); W=max(w,MW*k)+120
d,_=text('RADIX WORKS',f'{FD}/jost600.ttf',cap,(W-w)/2,60+mh+mh/F[3],0.22)
save('logo-vertical',svg(W,60+mh+mh/F[3]+60,mark(k,(W-MW*k)/2,60,INK,GOLD)+f'<path d="{d}" fill="{INK}"/>'))
S=1024; kk=S/F[1]/MH
save('icon',svg(S,S,f'<rect width="{S}" height="{S}" rx="{S*0.22:.0f}" fill="{NAVY}"/>'+mark(kk,(S-MW*kk)/2,(S-MH*kk)/2,CREAM,GOLDD)))
print('ok', MW, MH)
