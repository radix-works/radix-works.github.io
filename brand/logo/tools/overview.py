from PIL import Image, ImageDraw, ImageFont
O='/home/user/radix-works.github.io/brand/logo/'
f=ImageFont.truetype('/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',26)
names=[('横長 1 行','wide',(860,230)),('横長 2 行','horizontal',(860,330)),('記号の下に大きな文字','stacked',(860,400)),('縦長','vertical',(860,520)),('記号だけ','mark',(560,460))]
def sheet(out_name, pairs, bgcol, icon=None):
    W=1780; H=60+sum(ch+80 for _,_,(cw,ch) in names)+(540 if icon else 0); out=Image.new('RGB',(W,H),bgcol); d=ImageDraw.Draw(out); y=30
    for label,key,(cw,ch) in names:
        d.text((30,y),label,fill=(60,68,84),font=f); y+=48; x=30
        for i,(path,plate) in enumerate(pairs(key)):
            im=Image.open(O+path).convert('RGBA')
            if plate: base=Image.new('RGBA',im.size,plate); base.alpha_composite(im); im=base
            r=min(cw/im.width,ch/im.height); im=im.resize((int(im.width*r),int(im.height*r)),Image.LANCZOS)
            out.paste(im,(x+(cw-im.width)//2,y+(ch-im.height)//2),im); x=W-30-cw
        y+=ch+32
    if icon:
        d.text((30,y),'アイコン',fill=(60,68,84),font=f); y+=48; x=30
        for p in icon:
            im=Image.open(O+p).convert('RGBA'); im=im.resize((440,440),Image.LANCZOS); out.paste(im,(x,y),im); x+=500
    out.save(O+out_name)
sheet('overview.png', lambda k:[(f'png/radixworks-{k}.png',(251,252,253,255)),(f'png/radixworks-{k}-cream.png',(18,26,42,255))], (226,230,236), ['png/radixworks-icon.png'])
sheet('overview-bg.png', lambda k:[(f'png-bg/radixworks-{k}-on-white.png',None),(f'png-bg/radixworks-{k}-on-navy.png',None)], (200,205,214))
sheet('overview-gray.png', lambda k:[(f'png-bg/radixworks-{k}-gray-on-white.png',None),(f'png-bg/radixworks-{k}-gray-on-black.png',None)], (200,200,200), ['png/radixworks-icon-gray.png'])
print('ok')
sheet('overview-mono.png', lambda k:[(f'png-bg/radixworks-{k}-black-on-white.png',None),(f'png-bg/radixworks-{k}-white-on-black.png',None)], (200,200,200), ['png/radixworks-icon-black.png'])
