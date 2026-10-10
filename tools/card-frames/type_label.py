"""One clean, heavy oblique face for the middle card-type strip.

The reference is the bold, condensed PHYSICAL COMBAT strip. Typesetting is
supersampled from Teko Bold with a fixed oblique angle and weight. This module
never redraws card frames, silver rails, sword icons, artwork or game text.
"""
from pathlib import Path
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont
import numpy as np

FONT = str(Path(__file__).parent / 'fonts/Teko-Bold.ttf')

@lru_cache(maxsize=32)
def lettering(text, height=44, max_width=630):
    scale=4
    font=ImageFont.truetype(FONT,74*scale)
    box=font.getbbox(text,stroke_width=4)
    layer=Image.new('RGBA',(box[2]-box[0]+80,box[3]-box[1]+40))
    ImageDraw.Draw(layer).text((40-box[0],20-box[1]),text,font=font,
                              fill='white',stroke_width=4,stroke_fill='white')
    layer=layer.crop(layer.getbbox())
    skew=.18
    layer=layer.transform((layer.width+int(layer.height*skew)+2,layer.height),
                         Image.Transform.AFFINE,(1,skew,-skew*layer.height,0,1,0),
                         Image.Resampling.BICUBIC)
    layer=layer.crop(layer.getbbox())
    width=min(max_width,round(layer.width*height/layer.height*1.12))
    return layer.resize((width,height),Image.Resampling.LANCZOS)

def apply_type_label(image, card):
    result=image.convert('RGBA'); before=np.array(result)
    w,h=result.size
    assert (w,h)==(1060,1484), (card['number'],result.size)
    mask=Image.new('L',result.size)
    if card['type']=='Main Personality':
        villain=card['name'] in {'Vegeta','Raditz','Nappa','Saibaimen'}
        text=('VILLAIN' if villain else 'HERO')+' · PERSONALITY'
        points=[(round(x*w/1070),round(y*h/1470)) for x,y in
                [(251,779),(739,779),(773,818),(300,818)]]
        ImageDraw.Draw(mask).polygon(points,fill=255)
        center=(round(518*w/1070),round(799*h/1470))
        label=lettering(text,30,452)
        fill='#090b0e'
    else:
        physical=card['type']=='Physical Combat'
        box=(205,758,774 if physical else 854,812)
        ImageDraw.Draw(mask).rectangle(box,fill=255)
        center=(492 if physical else 530,786)
        label=lettering(card['type'].upper(),44,550 if physical else 630)
        fill='#05090b'
    result.paste(fill,(0,0,w,h),mask)
    position=(round(center[0]-label.width/2),round(center[1]-label.height/2))
    ink=Image.new('RGBA',result.size);ink.alpha_composite(label,position)
    assert not np.any((np.array(ink)[:,:,3]>0)&(np.array(mask)==0)),card['number']
    result=Image.alpha_composite(result,ink)
    assert np.array_equal(np.array(result)[np.array(mask)==0],before[np.array(mask)==0]),card['number']
    return result.convert('RGB')
