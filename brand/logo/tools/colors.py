import sys, os, re; sys.path.insert(0,'.')
import export2 as e
from contrast import cr
NAVY='#121a2a'; INK='#1b2436'; CREAM='#ece5d3'; WINE='#823b4a'; PAPER='#fbfcfd'
# 名前, 体, 金の所（くちばし）, RADIX, WORKS, 地
V=[('01-base','基本（明るい地）',INK,'#86713f',INK,'#86713f',None),
   ('02-base-dark','基本（紺の地）',CREAM,'#c9a96a',CREAM,'#c9a96a',NAVY),
   ('03-wine','えんじの地',CREAM,'#dcc28e',CREAM,'#dcc28e',WINE),
   ('04-on-gold','金の地に紺',INK,INK,INK,INK,'#c9a96a'),
   ('05-navy','紺一色',INK,INK,INK,INK,None),
   ('06-white','白一色',PAPER,PAPER,PAPER,PAPER,'#3a4256'),
   ('07-gold','金一色（紺の地）','#c9a96a','#c9a96a','#c9a96a','#c9a96a',NAVY),
   ('08-black','黒一色','#000000','#000000','#000000','#000000',None)]
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
rows=''; y=0; W=1500
for key,name,body,beak,t1,t2,bg in V:
    files={'wide':e.wide_small(body,t2,beak,bg,ratio=e.F[1]).replace(f'fill="{body}"/><path d="','fill="'+body+'"/><path d="',1),
           'horizontal':e.horizontal(body,t2,beak,bg),'vertical':e.vertical(body,t2,beak,bg),'mark':e.mark_only(body,beak,bg)}
    for n,t in files.items(): open(f'{OUT}/{key}-{n}.svg','w').write(t)
    showbg=bg or PAPER
    c1=cr(t1,showbg); c2=cr(t2,showbg)
    rows+=f'<text x="20" y="{y+34}" font-family="IPAGothic" font-size="22" fill="#4a5468">{name}</text>'
    rows+=f'<text x="20" y="{y+62}" font-family="IPAGothic" font-size="15" fill="#8d97aa">見分けやすさ RADIX {c1:.1f} ／ WORKS {c2:.1f}</text>'
    for i,(n,xx,ww) in enumerate([('wide',300,820),('mark',1160,300)]):
        t=files[n]
        w=float(re.search(r'width="([\d.]+)"',t).group(1)); h=float(re.search(r'height="([\d.]+)"',t).group(1))
        r=min(ww/w,170/h); inner=re.sub(r'^<svg[^>]*>','',t)[:-6]
        rows+=f'<rect x="{xx}" y="{y+10}" width="{ww}" height="170" fill="{showbg}"/>'
        rows+=f'<svg x="{xx+(ww-w*r)/2}" y="{y+10+(170-h*r)/2}" width="{w*r}" height="{h*r}" viewBox="0 0 {w} {h}">{inner}</svg>'
    y+=195
open('colors.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{y}" viewBox="0 0 {W} {y}"><rect width="100%" height="100%" fill="#e2e6ec"/>{rows}</svg>')
