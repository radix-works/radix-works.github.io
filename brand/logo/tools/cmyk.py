from PIL import Image, ImageCms
srgb = ImageCms.createProfile('sRGB'); cmyk = ImageCms.getOpenProfile('FOGRA39L_coated.icc')
t = ImageCms.buildTransform(srgb, cmyk, 'RGB', 'CMYK', renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC)
cols=[('紺','#1b2436'),('金','#8f7a4c'),('クリーム','#ece5d3'),('明るい金','#c9a96a'),('夜の紺','#121a2a')]
def lum(h):
    r,g,b=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    f=lambda c: c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def to_gray_hex(h):
    Y=lum(h); g=12.92*Y if Y<=0.0031308 else 1.055*Y**(1/2.4)-0.055
    v=round(g*255); return '#%02x%02x%02x'%(v,v,v), v
for n,h in cols:
    im=Image.new('RGB',(1,1),tuple(int(h[i:i+2],16) for i in (1,3,5)))
    c=ImageCms.applyTransform(im,t).getpixel((0,0))
    gh,gv=to_gray_hex(h)
    print(n,h,'CMYK',[round(x/255*100) for x in c],'グレー',gh,'K%',round((1-gv/255)*100))
