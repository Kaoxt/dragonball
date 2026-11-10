"""Compose new World Games cards with current V3 components and reviewed artwork."""
from pathlib import Path
from copy import deepcopy
from functools import lru_cache
from concurrent.futures import ProcessPoolExecutor
from lxml import etree as E
from PIL import Image, ImageChops
import argparse, base64, io, json, re, subprocess, sys, math
import build_batch_101_150 as shared
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text
from build_android_101_125_promos import inline_external, rules as render_rules

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label
from tokui_backing import apply as tokui_backing
from align_power_icon import align_power_icon
import footer_spacing as footer
from text_layout_v3 import validate as validate_text_layout
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'world-games-001-050'; EVID=ROOT/'tools/card-corrections/v3-world-games-001-050'
WORK=ROOT.parent/'world-games-render-work'; shared.OUT=OUT; shared.EVID=EVID
shared.word=lru_cache(maxsize=4096)(shared.word)

def current(n): return next(P.glob(f'saiyan-*/saiyan-{n:03}-*.svg'))

def wrap_rules(c):
    """Balance native rule lines and keep damage formulas and icon/type together."""
    from functools import lru_cache
    prefix=c['icon_prefix'];body=c['modern_rules'][len(prefix):].strip()
    tokens=prefix.split()+(['@ICON@']if c['power_icon']else[])+body.split()
    iw=shared.width_at_height(c['power_icon'],34.3)if c['power_icon']else 0
    def width(a,b):
        ts=tokens[a:b]
        return sum(iw if t=='@ICON@'else shared.word(t)[2] for t in ts)+sum(12 if t=='@ICON@'or ts[i-1]=='@ICON@'else 9.8 for i,t in enumerate(ts)if i)
    total=width(0,len(tokens));target=total/max(1,math.ceil(total/850))
    @lru_cache(None)
    def solve(a,left):
        if a==len(tokens):return (0,[])
        if not left:return (float('inf'),[])
        best=(float('inf'),[])
        for b in range(a+1,len(tokens)+1):
            w=width(a,b)
            if w>890:break
            if b<len(tokens) and (tokens[b-1].lower()in ['@icon@','or','at','damage:','hit:','power:','physical','energy','focused','costing'] or tokens[b].startswith('+') or tokens[b]in ['stages.','stage.','cards.','card.','life','costing']):continue
            rest,lines=solve(b,left-1)
            cost=rest+100000+(w-target)**2+(0 if tokens[b-1].endswith('.')else 30000)
            if b==len(tokens)and w<230:cost+=100000
            if cost<best[0]:best=(cost,[' '.join(tokens[a:b])]+lines)
        return best
    cost,lines=solve(0,5);assert math.isfinite(cost),(c['number'],'rules exceed five rows')
    return lines

def emblem():
    # Preserve approved raster pixels; native clipping removes its rectangular background.
    g=elem('g',id='saga-emblem',data_set='World Games Saga',transform='translate(154.3827 1373.9) scale(.07455)')
    defs=elem('defs',g);cl=elem('clipPath',defs,id='approved-emblem-silhouette',clipPathUnits='userSpaceOnUse')
    path="M146 551 C140 478 289 438 443 436 C497 300 613 216 744 216 C864 214 962 271 1018 362 C1194 347 1364 371 1389 464 C1412 539 1267 637 1102 697 C1160 748 1225 805 1168 840 C1115 876 1013 862 945 847 C820 927 679 899 586 816 C399 827 276 807 274 759 C271 729 300 694 323 672 C208 630 147 591 146 551 Z M260 548 C261 511 341 485 427 475 C418 514 416 555 420 595 C392 610 369 625 347 642 C299 610 260 580 260 548 Z M383 658 C397 647 411 638 426 630 L435 666 C421 672 412 680 400 687 Z M328 711 C379 734 437 753 499 769 C421 781 330 768 313 747 C307 738 315 724 328 711 Z M1040 397 C1163 398 1277 428 1280 477 C1282 518 1197 575 1066 631 C1088 556 1082 476 1040 397 Z M1044 713 C1071 741 1098 773 1101 798 C1096 820 1034 821 970 812 C1003 783 1028 750 1044 713 Z M275 238 C384 217 407 159 450 59 C426 174 459 215 546 239 C448 244 410 297 373 386 C385 294 360 255 275 238 Z M238 358 C287 343 305 318 321 278 C315 329 328 347 366 359 C321 367 301 394 286 440 C291 389 279 368 238 358 Z"
    elem('path',cl,d=path,clip_rule='evenodd',fill_rule='evenodd')
    im=elem('image',g,x=0,y=0,width=1536,height=1024,clip_path='url(#approved-emblem-silhouette)',preserveAspectRatio='xMidYMid meet')
    im.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode((P/'assets/81f5e828b2cf5832ab1034204f711cd7b6de8bdfdcdbfef298f62b100876e8ac.png').read_bytes()).decode())
    return g

def compose(c):
    (P/'references/version-3-standard.md').read_text()
    n=c['number']; db=c['category']=='DRAGON BALL'; donor=current(75) if db else next(P.glob('trunks-*/trunks-007-*.svg')) if c['style']=='Namekian' else current({'Orange':49,'Red':6,'Blue':13,'Black':65,'Saiyan':18,'Freestyle':24}[c['style']])
    r=parse(donor); inline_external(r,donor.parent)
    r.set('data-template-version','3');r.set('data-card-id',c['id']);r.set('data-card-number',str(n));r.set('data-card-family',c['category']);r.find('{'+S+'}title').text=c['name']
    desc=r.find('{'+S+'}desc')
    if desc is not None:desc.text=f"World Games Saga #{n}: {c['name']}. Native V3 card with new reference-based illustration and modern rules."
    for el in list(r.xpath('//*[starts-with(@id,"rules-line-")]')):el.getparent().remove(el)
    for ident in ['power-icon','attack-icon','power-line-block']:
        for el in r.xpath('//*[@id=$i]',i=ident):el.getparent().remove(el)
    get(r,'card-title').set('aria-label',c['name'])
    if c.get('title_safe_width'):
        get(r,'card-title').set('data-brush-safe-width',str(c['title_safe_width']))
        get(r,'card-title').set('data-brush-safe-label',c['name'])
    fit=title_fit(r);assert title_fit(r)==fit
    get(r,'card-category').set('aria-label',c['category']);mid=middle_label(r);assert middle_label(r)==mid
    num,b=text(str(n),'Teko-SemiBold.ttf',53,877.15,1409.5,'card-number');replace(r,'card-number',num)
    shared.rarity(r,c['rarity_stars'])
    get(r,'footer-rarity').set('transform',f'translate({847.25-(12.2+b[0])/2-882} -6.5)')
    replace(r,'saga-emblem',emblem())
    art=donor if db else ROOT/c['artwork_asset'] if c.get('artwork_asset') else EVID/'artwork'/f'{n:03}.png'
    art_height=706
    if not db:
        aw,ah=Image.open(art).size
        assert abs(aw/ah-1033/706)<.004,(n,'artwork aspect ratio needs correction',aw,ah)
        layer=elem('g',id='retained-illustration',clip_path='url(#new-art-window)')
        art_height=1033*ah/aw
        im=elem('image',layer,id='card-illustration',x=14,y=146+(706-art_height)/2,width=1033,height=art_height,preserveAspectRatio='xMidYMid meet')
        im.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(art.read_bytes()).decode());replace(r,'retained-illustration',layer)
    tok=None if db else tokui_backing(r)
    c['rule_lines']=wrap_rules(c)
    reports,iconline=render_rules(r,c,False);assets=shared.assetize(r)
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
    from title_width_v3 import change as widen_title
    data,wide=widen_title(svg.read_bytes());svg.write_bytes(data);assert widen_title(data)[0]==data
    bb=footer.bounds(svg)['saga-emblem'];rr=parse(svg);gg=get(rr,'saga-emblem');gg.set('transform',f'translate({211.75-bb[0]-bb[2]/2} {1409.5-bb[1]-bb[3]/2}) '+gg.get('transform'));save(rr,svg)
    footer.change(svg,normalize_gap=True)
    # Cropped raster bounds can settle after the initial transform. Re-measure
    # the final visible emblem rather than relying on the donor's bounds.
    for attempt in range(4):
        bb=footer.bounds(svg)['saga-emblem'];dx=211.75-bb[0]-bb[2]/2;dy=1409.5-bb[1]-bb[3]/2
        if abs(dx)<.002 and abs(dy)<.002:break
        rr=parse(svg);gg=get(rr,'saga-emblem');gg.set('transform',f'translate({dx} {dy}) '+gg.get('transform'));save(rr,svg)
    assert not footer.change(svg,normalize_gap=True)['changed']
    result=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width=2120'],capture_output=True,check=True)
    im=Image.open(io.BytesIO(result.stdout)).convert('RGB');assert im.size==(2120,2968);save_image(im,WORK/(c['id']+'.png'),'PNG')
    exports=[]
    for field,size in [('image',(1060,1484)),('downloadImage',(2120,2968))]:
        rel='public/assets/cards/'+('downloads/' if field=='downloadImage' else '')+c['id']+'.webp';dest=ROOT/rel;out=im.resize(size,Image.Resampling.LANCZOS)if size!=im.size else im
        dest.parent.mkdir(parents=True,exist_ok=True);save_image(out,dest,'WEBP',lossless=True,method=4);assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox()is None
        exports.append({'field':field,'path':rel,'after_sha256':digest(dest),'size':list(size),'lossless_round_trip':True})
    measured=footer.bounds(svg);bounds={k:v for k,v in measured.items()if k in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','power-icon']or k.startswith('rules-line-')}
    validate_text_layout(parse(svg),bounds)
    for ident,xy in {'card-title':(529.5,79),'card-category':(529.5,908.5),'footer-text-block':(529.5,1409.5),'saga-emblem':(211.75,1409.5)}.items():
        x,y,w,h=bounds[ident];assert abs(x+w/2-xy[0])<.02 and abs(y+h/2-xy[1])<.02,(n,ident,bounds[ident])
    row={'number':n,'id':c['id'],'name':c['name'],'family':c['category'],'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':{'mode':'new modern illustration from printed reference','source':str(art.relative_to(ROOT)),'source_sha256':digest(art),'additional_zoom':False,'localized_correction':None,'native_placement':[14,146+(706-art_height)/2,1033,art_height]},'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':icons},'exports':exports,'tokui_waza_backing':tok,'current_preview_revision':{'title_fit':fit,'middle_label':mid,'footer_idempotent':True},'power_icon':c.get('power_icon'),'rarity_stars':c['rarity_stars']}
    if db:
        row['artwork']={'mode':'retained approved full-art Shenron and three-star left orb','source':str(donor.relative_to(ROOT)),'source_sha256':digest(donor),'additional_zoom':False,'approved_full_art_redesign':True}
    (EVID/'per-card'/f'{n:03}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n}: {c["name"]}',flush=True);return row

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('numbers',type=int,nargs='*');args=a.parse_args()
    for d in [OUT,WORK,EVID/'per-card']:d.mkdir(parents=True,exist_ok=True)
    cs=json.loads((EVID/'cards.json').read_text());selected=[c for c in cs if not args.numbers or c['number']in args.numbers]
    with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(compose,selected))
    rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('*.json'))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
