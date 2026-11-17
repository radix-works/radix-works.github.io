import sys, re; sys.path.insert(0,'.')
import export2 as e
from contrast import cr
NAVY='#121a2a'
V=[('1 今','#ece5d3','#c9a96a'),('2 白寄り＋明るい金','#f5f1e8','#d4b47a'),('3 黄みのクリーム','#efe3c8','#c9a96a'),('4 白＋今の金','#fbfcfd','#c9a96a')]
rows=''; y=0; W=1500
for name,cream,gold in V:
    files={'wide':e.wide_small(cream,gold,gold,None,ratio=e.F[1]),'mark':e.mark_only(cream,gold,None)}
    rows+=f'<text x="20" y="{y+40}" font-family="IPAGothic" font-size="22" fill="#4a5468">{name}</text>'
    rows+=f'<text x="20" y="{y+68}" font-family="IPAGothic" font-size="15" fill="#8d97aa">クリーム {cream}　金 {gold}</text>'
    rows+=f'<text x="20" y="{y+92}" font-family="IPAGothic" font-size="15" fill="#8d97aa">見分けやすさ　クリーム {cr(cream,NAVY):.1f}／金 {cr(gold,NAVY):.1f}</text>'
    for n,xx,ww in [('wide',320,800),('mark',1160,300)]:
        t=files[n]; w=float(re.search(r'width="([\d.]+)"',t).group(1)); h=float(re.search(r'height="([\d.]+)"',t).group(1))
        r=min(ww/w,180/h); inner=re.sub(r'^<svg[^>]*>','',t)[:-6]
        rows+=f'<rect x="{xx}" y="{y+10}" width="{ww}" height="180" fill="{NAVY}"/>'
        rows+=f'<svg x="{xx+(ww-w*r)/2}" y="{y+10+(180-h*r)/2}" width="{w*r}" height="{h*r}" viewBox="0 0 {w} {h}">{inner}</svg>'
    y+=205
open('cream.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{y}" viewBox="0 0 {W} {y}"><rect width="100%" height="100%" fill="#e2e6ec"/>{rows}</svg>')
