"""Compose new Cell Games cards with current V3 components and reviewed artwork."""
from pathlib import Path
from copy import deepcopy
from functools import lru_cache
from concurrent.futures import ProcessPoolExecutor
from lxml import etree as E
from PIL import Image, ImageChops
import argparse, base64, io, json, re, subprocess, sys, math
import build_batch_101_150 as shared
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text
from build_android_101_125_promos import inline_external, rules as render_rules, extended_rarity

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label
from tokui_backing import apply as tokui_backing
from align_power_icon import align_power_icon
import footer_spacing as footer
from personality_middle_v3 import apply as personality_middle
from build_cell_051_100 import personality_values
from world_games_text_layout import validate as validate_text_layout, title_vertical_center
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'world-games-051-100'; EVID=ROOT/'tools/card-corrections/v3-world-games-051-100'
WORK=ROOT.parent/'world-games-051-100-render-work'; shared.OUT=OUT; shared.EVID=EVID
shared.word=lru_cache(maxsize=4096)(shared.word)

def current(n): return next(P.glob(f'saiyan-*/saiyan-{n:03}-*.svg'))

def wrap_rules(c):
    """Balance native rule lines and keep damage formulas and icon/type together."""
    from functools import lru_cache
    land=c['category'] in ['LOCATION','BATTLEGROUND'];max_width=1310 if land else 890
    prefix=c['icon_prefix'];body=c['modern_rules'][len(prefix):].strip()
    tokens=prefix.split()+(['@ICON@']if c['power_icon']else[])+body.split()
    iw=shared.width_at_height(c['power_icon'],34.3)if c['power_icon']else 0
    def width(a,b):
        ts=tokens[a:b]
        return sum(iw if t=='@ICON@'else shared.word(t)[2] for t in ts)+sum(12 if t=='@ICON@'or ts[i-1]=='@ICON@'else 9.8 for i,t in enumerate(ts)if i)
    total=width(0,len(tokens));target=total/max(1,math.ceil(total/(max_width-40)))
    @lru_cache(None)
    def solve(a,left):
        if a==len(tokens):return (0,[])
        if not left:return (float('inf'),[])
        best=(float('inf'),[])
        for b in range(a+1,len(tokens)+1):
            w=width(a,b)
            if w>max_width:break
            if b<len(tokens) and (tokens[b-1].lower()in ['@icon@','at','damage:','hit:','power:','physical','energy','focused','costing','life'] or tokens[b].startswith('+') or tokens[b]in ['stages.','stage.','cards.','card.','life','costing']):continue
            rest,lines=solve(b,left-1)
            cost=rest+100000+(w-target)**2+(0 if tokens[b-1].endswith('.')else 30000)
            if b==len(tokens)and w<230:cost+=100000
            if cost<best[0]:best=(cost,[' '.join(tokens[a:b])]+lines)
        return best
    cost,lines=solve(0,3 if land else 5);assert math.isfinite(cost),(c['number'],'rules exceed five rows')
    return lines

from build_world_games_051_100 import emblem, wrap_rules

def compose(c):
    n=c['number'];land=c['category'] in ['LOCATION','BATTLEGROUND'];mp='PERSONALITY' in c['category'];cx=741.5 if land else 529.5;fy=985.5 if land else 1409.5
    donor=(P/'world-games-special-masters/landscape/masters/Battleground-Master-V3.svg') if land else (P/'world-games-special-masters/hero.svg') if mp else next(P.glob('trunks-*/trunks-007-*.svg')) if c['style']=='Namekian' else current({'Orange':49,'Red':6,'Blue':13,'Black':65,'Saiyan':18,'Freestyle':24}[c['style']])
    r=parse(donor); inline_external(r,donor.parent)
    r.set('data-template-version','3');r.set('data-card-id',c['id']);r.set('data-card-number',str(n));r.set('data-card-family',c['category']);r.find('{'+S+'}title').text=c['name']
    if land:
        get(r,'retained-city-artwork').set('id','retained-illustration')
        cl=elem('clipPath',r.find('{'+S+'}defs'),id='artwork-window',clipPathUnits='userSpaceOnUse')
        elem('rect',cl,x=16,y=145,width=1451,height=1451/3)
    desc=r.find('{'+S+'}desc')
    if desc is not None:desc.text=f"World Games Saga #{n}: {c['name']}. Native V3 card with new reference-based illustration and modern rules."
    for el in list(r.xpath('//*[starts-with(@id,"rules-line-")]')):el.getparent().remove(el)
    for ident in ['power-icon','attack-icon','power-line-block']:
        for el in r.xpath('//*[@id=$i]',i=ident):el.getparent().remove(el)
    if land:
        g,b=text(c['name'],'Teko-SemiBold.ttf',86.0349127182045,cx,79,'card-title')
        size=86.0349127182045*min(1,1184/b[0]);g,b=text(c['name'],'Teko-SemiBold.ttf',size,cx,79,'card-title')
        g.set('data-font-size',str(size));g.set('data-title-fit','uniform-font-size');replace(r,'card-title',g)
        fit={'font_size':size,'max_width':1184,'visible_center':[cx,79]};mid={'retained_fixed_landscape_component':True}
    else:
        get(r,'card-title').set('aria-label',c['name'])
        if c.get('title_safe_width'):
            get(r,'card-title').set('data-brush-safe-width',str(c['title_safe_width']))
            get(r,'card-title').set('data-brush-safe-label',c['name'])
        fit=title_fit(r);assert title_fit(r)==fit
        get(r,'card-category').set('aria-label',c['category']);mid=middle_label(r);assert middle_label(r)==mid
    num,b=text(str(n),'Teko-SemiBold.ttf',53,(1186.45 if land else 847.25)+29.9,fy,'card-number');replace(r,'card-number',num)
    source=parse(current(24));ball=deepcopy(get(source,'footer-rarity'));shared.dependencies(r,source,ball);replace(r,'footer-rarity',ball);(shared.rarity if c['rarity_stars'] in [1,3] else extended_rarity)(r,c['rarity_stars'])
    get(r,'footer-rarity').set('transform',f'translate({(1186.45 if land else 847.25)-(12.2+b[0])/2-882} {fy-1416})')
    logo=emblem()
    if land:logo.set("transform","translate(84.8 -424) "+logo.get("transform"))
    replace(r,'saga-emblem',logo)
    art=ROOT/c['artwork_asset'] if c.get('artwork_asset') else EVID/'artwork'/f'{n:03}.png';aw,ah=Image.open(art).size
    ax,ay,awidth,aheight=(16,145,1451,1451/3) if land else (14,146,1033,706)
    assert abs(aw/ah-awidth/aheight)<.004,(n,'artwork aspect ratio needs correction',aw,ah)
    layer=elem('g',id='retained-illustration',clip_path='url(#artwork-window)' if land else 'url(#new-art-window)')
    art_height=awidth*ah/aw
    im=elem('image',layer,id='card-illustration',x=ax,y=ay+(aheight-art_height)/2,width=awidth,height=art_height,preserveAspectRatio='xMidYMid meet')
    im.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(art.read_bytes()).decode());replace(r,'retained-illustration',layer)
    if mp:
        # Reuse the approved brush numeral paths; no replacement font.
        old=elem('svg')
        from personality_levels import LEVELS, apply_level
        for ident,value in [('level-value',c['level']),('circle-value',c['pur'])]:
            g=elem('g',old,id=ident);elem('path',g,d=LEVELS[str(value)]['d'])
        personality_values(r,old,c);apply_level(r,c['level']);personality_middle(r,high_tech=False)
    tok=None if land or mp else tokui_backing(r)
    c['rule_lines']=wrap_rules(c)
    reports,iconline=render_rules(r,c,land);assets=shared.assetize(r)
    measurement=deepcopy(r)
    for e in measurement.xpath('//*[local-name()="image"]'):
        key='{'+X+'}href' if e.get('{'+X+'}href') else 'href';v=e.get(key)
        if not v.startswith('#'):e.set(key,str((OUT/v).resolve()))
    icons=[]
    if iconline:
        result=align_power_icon(measurement,'power-icon',f'rules-line-{iconline}');assert align_power_icon(measurement,'power-icon',f'rules-line-{iconline}')['vertical_shift']==0
        replace(r,'power-icon',deepcopy(get(measurement,'power-icon')));icons=[result]
    ids=[e.get('id')for e in r.iter()if e.get('id')];assert len(ids)==len(set(ids));assert not r.xpath('//*[local-name()="text"]')
    svg=OUT/(c['id']+'.svg');save(r,svg)
    if not land:
        from title_width_v3 import change as widen_title
        data,wide=widen_title(svg.read_bytes());svg.write_bytes(data);assert widen_title(data)[0]==data
    footer.TOLERANCE=.02 if land else .002;footer.SAGA_CENTER_X=296.55 if land else 211.75;footer.RIGHT_GROUP_CENTER_X=1186.45 if land else 847.25
    footer.REVISION='landscape-mirrored-side-group-centers-v1' if land else 'mirrored-side-group-centers-v1'
    footer.change(svg,normalize_gap=True)
    for attempt in range(4):
        bb=footer.bounds(svg)['saga-emblem'];dx=footer.SAGA_CENTER_X-bb[0]-bb[2]/2;dy=fy-bb[1]-bb[3]/2
        if abs(dx)<.002 and abs(dy)<.002:break
        rr=parse(svg);gg=get(rr,'saga-emblem');gg.set('transform',f'translate({dx} {dy}) '+gg.get('transform'));save(rr,svg)
    assert not footer.change(svg,normalize_gap=True)['changed']
    result=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width='+str(2968 if land else 2120)],capture_output=True,check=True)
    im=Image.open(io.BytesIO(result.stdout)).convert('RGB');assert im.size==((2968,2120) if land else (2120,2968));save_image(im,WORK/(c['id']+'.png'),'PNG')
    exports=[]
    for field,size in [('image',(1484,1060) if land else (1060,1484)),('downloadImage',im.size)]:
        rel='public/assets/cards/'+('downloads/' if field=='downloadImage' else '')+c['id']+'.webp';dest=ROOT/rel;out=im.resize(size,Image.Resampling.LANCZOS)if size!=im.size else im
        dest.parent.mkdir(parents=True,exist_ok=True);save_image(out,dest,'WEBP',lossless=True,method=4);assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox()is None
        exports.append({'field':field,'path':rel,'after_sha256':digest(dest),'size':list(size),'lossless_round_trip':True})
    measured=footer.bounds(svg);bounds={k:v for k,v in measured.items()if k in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','power-icon']or k.startswith(('rules-line-','power-stage-value-')) or k in ['v3-level-number','concept-pur-number']}
    if not land:validate_text_layout(parse(svg),bounds)
    for ident,xy in {'card-title':(cx,79),'card-category':(cx,685.166666667 if land else 908.5),'footer-text-block':(cx,fy),'saga-emblem':(footer.SAGA_CENTER_X,fy)}.items():
        x,y,w,h=bounds[ident];actual_cy=title_vertical_center(parse(svg)) if ident=='card-title' else y+h/2;assert abs(x+w/2-xy[0])<.02 and abs(actual_cy-xy[1])<.02,(n,ident,bounds[ident])
    row={'number':n,'id':c['id'],'name':c['name'],'family':c['category'],'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':{'mode':'new modern illustration from printed reference','source':str(art.relative_to(ROOT)),'source_sha256':digest(art),'additional_zoom':False,'localized_correction':None,'native_placement':[ax,ay+(aheight-art_height)/2,awidth,art_height]},'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':icons},'exports':exports,'tokui_waza_backing':tok,'current_preview_revision':{'title_fit':fit,'middle_label':mid,'footer_idempotent':True},'power_icon':c.get('power_icon'),'rarity_stars':c['rarity_stars']}
    (EVID/'per-card'/f'{n:03}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n}: {c["name"]}',flush=True);return row

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('numbers',type=int,nargs='*');args=a.parse_args()
    for d in [OUT,WORK,EVID/'per-card']:d.mkdir(parents=True,exist_ok=True)
    cs=json.loads((EVID/'cards.json').read_text());selected=[c for c in cs if c['number'] in [91,99] and (not args.numbers or c['number'] in args.numbers)]
    assert all((ROOT/c['artwork_asset']).exists() for c in selected),'Selected card artwork is not ready'
    with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(compose,selected))
    rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('[0-9][0-9][0-9].json'))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
