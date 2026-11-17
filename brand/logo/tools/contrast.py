def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
pairs=[('紺/白地','#1b2436','#fbfcfd'),('金(明)/白地','#8f7a4c','#fbfcfd'),('クリーム/紺地','#ece5d3','#121a2a'),('金(暗)/紺地','#c9a96a','#121a2a'),
       ('クリーム/えんじ','#ece5d3','#823b4a'),('金(暗)/えんじ','#c9a96a','#823b4a'),('紺/金地','#1b2436','#c9a96a'),('クリーム/金地','#ece5d3','#c9a96a'),('紺/クリーム','#1b2436','#ece5d3')]
for n,a,b in pairs: print(f'{n}: {cr(a,b):.2f}')
