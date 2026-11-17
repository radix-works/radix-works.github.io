import sys; sys.path.insert(0,'.')
from peng import *
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
FD='fonts'; INK,PAPER,GOLD,NAVY,CREAM='#1b2436','#fbfcfd','#8f7a4c','#121a2a','#ece5d3'
A=dict(P); A.update(lA=25,lB=75,l1=10,l2=9,fx=12,base=F[6])
shape,_,_=build(A); x0,y0,x1,y1=shape.bounds; MW,MH=x1-x0,y1-y0
def text(txt,ff,cap,x,y,track=0.0):
    f=TTFont(ff); gs=f.getGlyphSet(); cm=f.getBestCmap(); s=cap/f['OS/2'].sCapHeight; d=[]; cx=x
    for i,ch in enumerate(txt):
        g=cm[ord(ch)]; pen=SVGPathPen(gs); gs[g].draw(TransformPen(pen,(s,0,0,-s,cx,y))); d.append(pen.getCommands())
        cx+=gs[g].width*s+(track*cap if i<len(txt)-1 else 0)
    return ' '.join(d), cx-x
def mark(k,x,y,fg): return f'<path d="{to_path(shape,k,x-x0*k,y-y0*k)}" fill="{fg}" fill-rule="evenodd"/>'
def horiz(X,Y,mh,fg,sub):
    k=mh/MH; cap1=mh/F[2]*0.62; cap2=cap1/F[1]   # RADIX の大文字＝記号の高さ÷φ² 程度
    gap=mh/F[3]
    d1,w1=text('RADIX',f'{FD}/jost600.ttf',cap1,0,0,0.14); w0=text('WORKS',f'{FD}/jost500.ttf',cap2,0,0)[1]
    tr=(w1-w0)/4/cap2; lead=cap2*0.9; bh=cap1+lead+cap2
    tx=X+MW*k+gap; ty1=Y+mh*0.5-bh/2+cap1+mh*0.06; ty2=ty1+lead+cap2
    d1,_=text('RADIX',f'{FD}/jost600.ttf',cap1,tx,ty1,0.14); d2,_=text('WORKS',f'{FD}/jost500.ttf',cap2,tx,ty2,tr)
    return mark(k,X,Y,fg)+f'<path d="{d1}" fill="{fg}"/><path d="{d2}" fill="{sub}"/>', MW*k+gap+w1
def vert(cx,Y,mh,fg,sub):
    k=mh/MH; cap=mh/F[3]*0.62
    d,w=text('RADIX WORKS',f'{FD}/jost600.ttf',cap,0,0,0.22)
    d,_=text('RADIX WORKS',f'{FD}/jost600.ttf',cap,cx-w/2,Y+mh+mh/F[3],0.22)
    return mark(k,cx-MW*k/2,Y,fg)+f'<path d="{d}" fill="{fg}"/>'
W=1600; b=''
# 1 段目：横組み（明るい地・暗い地）
b+=f'<rect x="0" y="0" width="800" height="360" fill="{PAPER}"/><rect x="800" y="0" width="800" height="360" fill="{NAVY}"/>'
h,w=horiz(0,0,190,INK,GOLD); b+=f'<g transform="translate({400-w/2:.1f},85)">{h}</g>'
h,w=horiz(0,0,190,CREAM,'#c9a96a'); b+=f'<g transform="translate({1200-w/2:.1f},85)">{h}</g>'
# 2 段目：縦組み と アイコン
b+=f'<rect x="0" y="372" width="800" height="440" fill="{PAPER}"/><rect x="800" y="372" width="800" height="440" fill="#eceff3"/>'
b+=vert(400,420,250,INK,GOLD)
for i,(sz) in enumerate([180,96,48,24]):
    x=860+sum([180,96,48,24][:i])+i*40; y=592-sz/2
    r=sz/F[4]; k=sz/F[1]/MH
    b+=f'<rect x="{x}" y="{y}" width="{sz}" height="{sz}" rx="{sz*0.22:.1f}" fill="{NAVY}"/>'+mark(k,x+(sz-MW*k)/2,y+(sz-MH*k)/2,CREAM)
    b+=f'<text x="{x+sz/2}" y="{592+110}" font-family="Jost" font-size="14" fill="#4a5468" text-anchor="middle">{sz}px</text>'
open('lock.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="812" viewBox="0 0 {W} 812">{b}</svg>')
import os
O='/home/user/radix-works.github.io/brand/logo'
def save(n,w,h,body,bg=None):
    r=f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    open(f'{O}/{n}.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}" viewBox="0 0 {w:.1f} {h:.1f}">{r}{body}</svg>')
k=40; pad=40
save('mark',MW*k+2*pad,MH*k+2*pad,mark(k,pad,pad,INK))
save('mark-dark',MW*k+2*pad,MH*k+2*pad,mark(k,pad,pad,CREAM),NAVY)
for nm,fg,sub,bg in (('logo-horizontal',INK,GOLD,None),('logo-horizontal-dark',CREAM,'#c9a96a',NAVY)):
    h,w=horiz(0,0,190,fg,sub); save(nm,w+120,310,f'<g transform="translate(60,60)">{h}</g>',bg)
h=vert(400,60,250,INK,GOLD); save('logo-vertical',800,470,h)
S=1024; kk=S/F[1]/MH
save('icon',S,S,f'<rect width="{S}" height="{S}" rx="{S*0.22:.0f}" fill="{NAVY}"/>'+mark(kk,(S-MW*kk)/2,(S-MH*kk)/2,CREAM))
