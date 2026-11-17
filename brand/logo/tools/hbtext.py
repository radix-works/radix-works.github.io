import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
_cache={}
def _load(ff):
    if ff not in _cache:
        data=open(ff,'rb').read(); face=hb.Face(data); font=hb.Font(face)
        tt=TTFont(ff); _cache[ff]=(font,tt,tt.getGlyphSet(),tt['OS/2'].sCapHeight,tt.getGlyphOrder())
    return _cache[ff]
def text_hb(txt, ff, cap, x, y, track=0.0, pairs=None):
    """字の組ごとの詰め（書体の情報）を使って組む。track＝全体の字間（cap に対する割合）、pairs＝{'RA':-0.02,...}（cap に対する割合で足す）"""
    font,tt,gs,capH,order=_load(ff); s=cap/capH
    buf=hb.Buffer(); buf.add_str(txt); buf.guess_segment_properties()
    hb.shape(font,buf,{'kern':True})
    d=[]; cx=x
    for i,(inf,pos) in enumerate(zip(buf.glyph_infos,buf.glyph_positions)):
        g=order[inf.codepoint]; pen=SVGPathPen(gs)
        gs[g].draw(TransformPen(pen,(s,0,0,-s,cx+pos.x_offset*s,y-pos.y_offset*s))); d.append(pen.getCommands())
        if i<len(txt)-1:
            cx+=pos.x_advance*s+track*cap
            if pairs: cx+=pairs.get(txt[i]+txt[i+1],0)*cap
        else: cx+=pos.x_advance*s
    return ' '.join(d), cx-x
