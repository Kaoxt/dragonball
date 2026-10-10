"""Extend the approved 1060x1484 vector-rail frame to cards 131–155.

The approved master is immutable. Artwork is recovered from the earlier
full-resolution export, fitted once without changing its aspect ratio.
Rules use the repository's reviewed transcriptions, one 50px Nimbus Sans
Bold font and a fixed 61px line height. No generative edits are applied.
"""
from pathlib import Path
import argparse, io, json, re, subprocess, hashlib, colorsys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).parent
BASE='8e5519b3a00561f9cfebc832e3ec76e4ce0c74f0'
ART_BASE='50f5c9c3de0b41b6ada7798b2ef37f781fb017bd'
W,H=1060,1484
THEMES={'Orange':'#f0a000','Red':'#df2028','Blue':'#008fde','Saiyan':'#008960','Freestyle':'#8d959d','Black':'#626c7d'}
BODY_FONT='/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf'
TITLE_FONT=str(HERE/'fonts/Teko-Bold.ttf')
NUMBER_FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
TYPE_FONT='/usr/share/fonts/opentype/urw-base35/NimbusSans-BoldItalic.otf'

def gitbytes(path,ref=BASE):
    return subprocess.check_output(['git','show',f'{ref}:{path}'],cwd=ROOT)

def svg_layer(svg):
    node=os.environ['CODEX_PRIMARY_RUNTIME_NODE']
    sharp=str(Path(os.environ['CODEX_PRIMARY_RUNTIME_NODE_MODULES'])/'sharp')
    js="const s=require(process.argv[1]);s(Buffer.from(process.argv[2]),{density:288}).png().toBuffer().then(b=>process.stdout.write(b));"
    png=subprocess.check_output([node,'-e',js,sharp,svg])
    return Image.open(io.BytesIO(png)).convert('RGBA').resize((W,H),Image.Resampling.LANCZOS)

def lettering(text,font,size,max_width,color='white',stroke=0):
    scale=4; f=ImageFont.truetype(font,size*scale)
    b=f.getbbox(text,stroke_width=stroke*scale)
    mask=Image.new('RGBA',(b[2]-b[0]+16*scale,b[3]-b[1]+16*scale))
    ImageDraw.Draw(mask).text((8*scale-b[0],8*scale-b[1]),text,font=f,fill=color,stroke_width=stroke*scale,stroke_fill='#020507')
    mask=mask.crop(mask.getbbox())
    width=min(max_width,round(mask.width/scale));height=round(mask.height/scale)
    return mask.resize((width,height),Image.Resampling.LANCZOS)

def wrap(text,font,width=860):
    lines=[]
    for paragraph in text.split('\n'):
        line=''
        for word in paragraph.split():
            candidate=(line+' '+word).strip()
            if font.getlength(candidate)>width:
                lines.append(line);line=word
            else: line=candidate
        if line: lines.append(line)
    assert ' '.join(' '.join(lines).split())==' '.join(text.split())
    return lines

def main():
    p=argparse.ArgumentParser();p.add_argument('--start',type=int,required=True);p.add_argument('--end',type=int,required=True);args=p.parse_args()
    assert 131<=args.start<=args.end<=155
    catpath=ROOT/'public/cards/catalog.js';text=catpath.read_text()
    catalog=json.loads(re.search(r'export const catalog\s*=\s*(\[.*?\]);',text,re.S)[1])
    source_catalog=json.loads(re.search(r'export const catalog\s*=\s*(\[.*?\]);',gitbytes('public/cards/catalog.js').decode(),re.S)[1])
    lookup={int(c['number']):c for c in source_catalog if c['number'].isdigit()}
    rules=json.loads((HERE/'rules-001-020.json').read_text());rules.update(json.loads((HERE/'rules-021-070.json').read_text()));rules.update(json.loads((HERE/'rules-071-080.json').read_text()));rules.update(json.loads((HERE/'rules-081-130.json').read_text()));rules.update(json.loads((HERE/'rules-131-155.json').read_text()))
    master=Image.open(io.BytesIO(gitbytes('public/assets/cards/saiyan-005-orange-arm-bar.webp'))).convert('RGB')
    rgb=np.array(master);hsv=np.array(master.convert('HSV'))
    # Only the orange master-frame color changes; art is replaced below.
    colored=(hsv[:,:,0]<38)&(hsv[:,:,1]>100)&(rgb[:,:,0]>55)
    art_mask=Image.new('L',(W,H));d=ImageDraw.Draw(art_mask)
    d.polygon([(79,184),(982,184),(982,321),(1018,292),(1018,695),(968,741),(92,741),(40,695),(40,292),(79,321)],fill=255)
    rail_svg=(HERE/'judder-free-silver-rails.svg').read_text()
    rails=svg_layer(rail_svg)
    font=ImageFont.truetype(BODY_FONT,50)
    numberfont=ImageFont.truetype(NUMBER_FONT,40)
    entries=[]
    from render_personality_081_130 import render_personality
    for n in range(args.start,args.end+1):
        if lookup[n]['type']=='Main Personality':
            entries.append(render_personality(lookup[n],rules[str(n)],catalog))
            continue
        c=lookup[n];color='#d5b54d' if c['type']=='Dragon Ball' else THEMES[c['style']]
        target=np.array([int(color[i:i+2],16) for i in (1,3,5)])
        out=rgb.copy();shade=np.clip(rgb[:,:,0].astype(float)/255,0.22,1)
        out[colored]=(shade[:,:,None]*target)[colored].astype('uint8')
        result=Image.fromarray(out).convert('RGBA')
        path='public'+c['image'].split('?')[0]
        original=Image.open(io.BytesIO(gitbytes(path,ART_BASE))).convert('RGB')
        assert original.size==(1070,1470)
        # Exclude the old frame and fit the illustration proportionally once.
        source_art=np.array(original).copy()
        # Old side-tab pixels appear only in the small upper corner wedges.
        # Extend the immediately adjacent scene into those covered frame areas.
        source_art[166:310,22:63]=source_art[166:310,63:64]
        source_art[166:310,1007:1048]=source_art[166:310,1006:1007]
        art=ImageOps.fit(Image.fromarray(source_art).crop((22,166,1048,755)),(978,557),Image.Resampling.LANCZOS,centering=(0.5,0.5))
        artwork=Image.new('RGB',(W,H));artwork.paste(art,(40,184))
        result.paste(artwork,(0,0),art_mask)
        # Clear the title interior without touching the approved outline.
        panel=f'<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="1484"><path d="M110 77L123 87H936L949 77L979 105V132L947 164H112L81 132V105Z" fill="{color}"/></svg>'
        result=Image.alpha_composite(result,svg_layer(panel))
        ImageDraw.Draw(result).rectangle((125,87,935,91),fill=color)
        title=lettering(c['name'].upper(),TITLE_FONT,74,865,stroke=5)
        result.alpha_composite(title,(round((W-title.width)/2),round(122-title.height/2)))
        # Physical Combat uses the approved lettering and sword. Other types
        # receive their correct label centered in the same strip, without sword.
        if c['type']!='Physical Combat':
            ImageDraw.Draw(result).rectangle((205,758,854,812),fill='#05090b')
            label=lettering(c['type'].upper(),TYPE_FONT,56,610)
            result.alpha_composite(label,(round((W-label.width)/2),round(786-label.height/2)))
        # Remove the master card rules and use one shared type size for all cards.
        d=ImageDraw.Draw(result);d.rectangle((80,938,987,1285),fill='#090f12')
        body_size=50;body_font=font;lines=wrap(rules[str(n)],body_font)
        while (len(lines)-1)*round(body_size*1.22)+body_size>360:
            body_size-=1;body_font=ImageFont.truetype(BODY_FONT,body_size);lines=wrap(rules[str(n)],body_font)
        assert body_size>=40, (n,body_size)
        for j,line in enumerate(lines):d.text((102,950+j*round(body_size*1.22)),line,font=body_font,fill='#ffffff',anchor='lt')
        # Shadowless numeral, centered at the exact approved footer position.
        d.rectangle((125,1338,219,1373),fill='#080e12')
        number=lettering(str(n),NUMBER_FONT,40,84)
        result.alpha_composite(number,(round(171-number.width/2),round(1351-number.height/2)))
        # Silver rail pixels come from the exact approved vector template.
        result=Image.alpha_composite(result,rails).convert('RGB')
        check=np.array(result)
        art_check=(np.array(art_mask)>0)&(np.array(rails)[:,:,3]==0)
        assert np.array_equal(check[art_check],np.array(artwork)[art_check]), 'Art unexpectedly altered'
        for y,x0,x1 in [(63,180,880),(748,120,940),(824,200,850),(1332,350,710)]:
            assert np.all(check[y,x0:x1]==np.array([183,193,204])),f'Nonuniform silver rail {n}, y={y}'
        b=io.BytesIO();result.save(b,'WEBP',lossless=True,method=4);data=b.getvalue()
        assert Image.open(io.BytesIO(data)).convert('RGB').tobytes()==result.tobytes()
        sha=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
        (ROOT/path).write_bytes(data)
        current=next(x for x in catalog if x['number']==str(n))
        current['image']=c['image'].split('?')[0]+'?v='+sha[:10];current['width']=W;current['height']=H
        entries.append({'number':n,'name':c['name'],'type':c['type'],'style':c['style'],'path':path,'sha':sha,'width':W,'height':H,'rules':rules[str(n)],'body_font_px':body_size,'body_lines':lines,'art_source_commit':ART_BASE,'title_font':'Teko Bold 700, 74px, 5px black outline'})
    updated=re.sub(r'(export const catalog\s*=\s*)\[.*?\];',lambda m:m[1]+json.dumps(catalog,indent=2,ensure_ascii=False)+';',text,count=1,flags=re.S)
    catpath.write_text(updated)
    manifest={'design':'Approved shared frame with exact judder-free silver rails, style-specific accents, fixed body font and centered numbers','master_commit':BASE,'svg':'tools/card-frames/judder-free-silver-rails.svg','updated':entries}
    (ROOT/f'docs/saiyan-approved-vector-{args.start:03d}-{args.end:03d}.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    print(f'Rendered {len(entries)} cards; art, rail, text wrapping and lossless export checks passed.')

if __name__=='__main__':main()
