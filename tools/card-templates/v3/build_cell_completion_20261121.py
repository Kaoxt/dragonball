"""Build the missing Cell/Cell Games previews and promos from reviewed inputs."""
from pathlib import Path
from copy import deepcopy
from functools import lru_cache
from concurrent.futures import ProcessPoolExecutor
from lxml import etree as E
from PIL import Image, ImageChops
import base64, io, json, math, subprocess, sys
import build_batch_101_150 as shared
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text
from build_android_101_125_promos import inline_external, rules as render_rules
from build_batch_221_250_promos import rarity as extended_rarity

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label, label as category_label
from freestyle_symbol_weight import apply as freestyle_weight
from align_power_icon import align_power_icon
from text_layout_v3 import validate as validate_layout
import footer_spacing as footer
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'cell-completion-20261121'; EVID=ROOT/'tools/card-corrections/v3-cell-completion-20261121'
shared.OUT=OUT; shared.EVID=EVID
shared.word=lru_cache(maxsize=4096)(shared.word)
DONORS={'cell':P/'cell-051-100/cell-068-heroes-discovery.svg','cell-games':P/'cell-games-001-050/cell-games-007-flashback.svg'}
LAND=P/'cell-games-101-125/cell-games-117-chazke-village.svg'

def wrap_rules(c):
    land=c['category']=='BATTLEGROUND';limit=1310 if land else 890
    prefix=c['icon_prefix'];assert c['modern_rules'].startswith(prefix)
    tokens=prefix.split()+(['@ICON@'] if c['power_icon'] else [])+c['modern_rules'][len(prefix):].strip().split()
    iw=shared.width_at_height(c['power_icon'],34.3) if c['power_icon'] else 0
    def width(a,b):
        ts=tokens[a:b]
        return sum(iw if t=='@ICON@' else shared.word(t)[2] for t in ts)+sum(12 if t=='@ICON@' or ts[i-1]=='@ICON@' else 9.8 for i,t in enumerate(ts) if i)
    target=width(0,len(tokens))/max(1,math.ceil(width(0,len(tokens))/(limit-40)))
    @lru_cache(None)
    def solve(a,left):
        if a==len(tokens):return 0,[]
        if not left:return float('inf'),[]
        best=float('inf'),[]
        for b in range(a+1,len(tokens)+1):
            w=width(a,b)
            if w>limit:break
            if b<len(tokens) and (tokens[b-1].lower() in ['@icon@','at','damage:','hit:','power:','physical','energy','focused','costing','life'] or tokens[b].startswith('+') or tokens[b] in ['stages.','stage.','cards.','card.','life','costing']):continue
            cost,lines=solve(b,left-1)
            cost+=100000+(w-target)**2+(0 if tokens[b-1].endswith('.') else 30000)
            if b==len(tokens) and w<230:cost+=100000
            if cost<best[0]:best=cost,[' '.join(tokens[a:b])]+lines
        return best
    cost,lines=solve(0,3 if land else 5)
    assert math.isfinite(cost),(c['key'],'rules exceed fixed rows')
    return lines

def compose(c):
    land=c['category']=='BATTLEGROUND';cx=741.5 if land else 529.5;fy=985.5 if land else 1409.5
    donor=LAND if land else DONORS[c['set_slug']]
    r=parse(donor);inline_external(r,donor.parent)
    r.set('data-template-version','3');r.set('data-card-id',c['id']);r.set('data-card-number',c['number']);r.set('data-card-family',c['category'])
    r.find('{'+S+'}title').text=c['name']
    for d in r.findall('{'+S+'}desc'):d.text=f"{c['set']} {c['sourceNumber']}: {c['name']}. Native V3 components; original-scan-based illustration; reviewed CRD wording."
    for el in list(r.xpath('//*[starts-with(@id,"rules-line-")]')):el.getparent().remove(el)
    for ident in ['power-icon','attack-icon','power-line-block']:
        for el in r.xpath('//*[@id=$i]',i=ident):el.getparent().remove(el)
    if land:
        g,b=text(c['name'],'Teko-SemiBold.ttf',86.0349127182045,cx,79,'card-title')
        size=86.0349127182045*min(1,1184/b[0]);g,b=text(c['name'],'Teko-SemiBold.ttf',size,cx,79,'card-title')
        g.set('data-font-size',str(size));g.set('data-title-fit','uniform-font-size');replace(r,'card-title',g)
        fit={'font_size':size,'max_width':1184,'visible_center':[cx,79]}
        g,mid=category_label(c['category']);g.set('transform','translate(212 -223.333333333333) '+g.get('transform'));replace(r,'card-category',g)
        src=parse(DONORS[c['set_slug']]);inline_external(src,DONORS[c['set_slug']].parent)
        logo=deepcopy(get(src,'saga-emblem'));shared.dependencies(r,src,logo)
        logo.set('transform','translate(84.8 -424) '+logo.get('transform',''));replace(r,'saga-emblem',logo)
    else:
        get(r,'card-title').set('aria-label',c['name']);fit=title_fit(r)
        get(r,'card-category').set('aria-label',c['category']);mid=middle_label(r);freestyle_weight(r)
    num,b=text(c['number'],'Teko-SemiBold.ttf',53,(1186.45 if land else 847.25)+29.9,fy,'card-number');replace(r,'card-number',num)
    # Normalize rarity from the reviewed current Freestyle donor at every count.
    ballsource=parse(P/'saiyan-001-050/saiyan-024-gokus-surprise-attack.svg')
    ball=deepcopy(get(ballsource,'footer-rarity'));shared.dependencies(r,ballsource,ball);replace(r,'footer-rarity',ball)
    (shared.rarity if c['rarity_stars'] in [1,3] else extended_rarity)(r,c['rarity_stars'])
    get(r,'footer-rarity').set('transform',f'translate({(1186.45 if land else 847.25)-(12.2+b[0])/2-882} {fy-1416})')
    art=EVID/'artwork'/c['artwork_file'];aw,ah=Image.open(art).size
    ax,ay,w,h=(16,145,1451,1451/3) if land else (14,146,1033,706)
    assert abs(aw/ah-w/h)<.004,(c['key'],'art ratio mismatch',(aw,ah))
    scale=w/aw;art_h=scale*ah;top=ay+(h-art_h)/2
    layer=elem('g',id='retained-illustration',clip_path='url(#artwork-window)' if land else 'url(#new-art-window)')
    im=elem('image',layer,id='card-illustration',x=ax,y=top,width=w,height=art_h,preserveAspectRatio='xMidYMid meet')
    im.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(art.read_bytes()).decode());replace(r,'retained-illustration',layer)
    c['rule_lines']=wrap_rules(c);reports,iconline=render_rules(r,c,land);assets=shared.assetize(r)
    measured=deepcopy(r)
    for el in measured.xpath('//*[local-name()="image"]'):
        k='{'+X+'}href' if el.get('{'+X+'}href') else 'href';v=el.get(k)
        if not v.startswith('#'):el.set(k,str((OUT/v).resolve()))
    icons=[]
    if iconline:
        result=align_power_icon(measured,'power-icon',f'rules-line-{iconline}')
        assert align_power_icon(measured,'power-icon',f'rules-line-{iconline}')['vertical_shift']==0
        replace(r,'power-icon',deepcopy(get(measured,'power-icon')));icons=[result]
    ids=[e.get('id') for e in r.iter() if e.get('id')];assert len(ids)==len(set(ids));assert not r.xpath('//*[local-name()="text"]')
    OUT.mkdir(exist_ok=True);svg=OUT/(c['id']+'.svg');save(r,svg)
    footer.TOLERANCE=.02 if land else .002;footer.SAGA_CENTER_X=296.55 if land else 211.75;footer.RIGHT_GROUP_CENTER_X=1186.45 if land else 847.25
    footer.change(svg,normalize_gap=True);assert not footer.change(svg,normalize_gap=True)['changed']
    raw=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width='+str(2968 if land else 2120)],capture_output=True,check=True).stdout
    image=Image.open(io.BytesIO(raw)).convert('RGB');assert image.size==((2968,2120) if land else (2120,2968))
    exports=[]
    for field,size,sub in [('image',(1484,1060) if land else (1060,1484),''),('downloadImage',image.size,'downloads')]:
        dest=ROOT/'public/assets/cards'/sub/(c['id']+'.webp');dest.parent.mkdir(parents=True,exist_ok=True)
        out=image.resize(size,Image.Resampling.LANCZOS) if image.size!=size else image
        save_image(out,dest,'WEBP',lossless=True,method=4)
        assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox() is None
        exports.append(dict(field=field,path=str(dest.relative_to(ROOT)),size=list(size),sha256=digest(dest),lossless_round_trip=True))
    bounds=footer.bounds(svg);bounds={k:v for k,v in bounds.items() if k in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','power-icon'] or k.startswith('rules-line-')}
    if not land:validate_layout(parse(svg),bounds)
    for ident,xy in {'card-title':(cx,79),'card-category':(cx,685.166666667 if land else 908.5),'footer-text-block':(cx,fy),'saga-emblem':(footer.SAGA_CENTER_X,fy)}.items():
        x,y,w,h=bounds[ident];assert abs(x+w/2-xy[0])<.03 and abs(y+h/2-xy[1])<.03,(c['key'],ident,bounds[ident])
    ball,num=bounds['footer-rarity'],bounds['card-number'];assert abs((min(ball[0],num[0])+max(ball[0]+ball[2],num[0]+num[2]))/2-footer.RIGHT_GROUP_CENTER_X)<.03
    assert abs(num[0]-ball[0]-ball[2]-12.2)<.03
    row=dict(key=c['key'],set=c['set'],number=c['number'],id=c['id'],name=c['name'],native_source_path=str(svg.relative_to(ROOT)),native_source_sha256=digest(svg),assets=assets,rules=reports,exports=exports,native_geometry={'bounds':bounds,'icons':icons,'outlined_text':True,'footer_idempotent':True},title_fit=fit,rarity_stars=c['rarity_stars'],artwork={'mode':'new original-scan-based illustration','source':str(art.relative_to(ROOT)),'source_dimensions':[aw,ah],'source_sha256':digest(art),'mapping_matrix':[scale,0,0,scale,ax,top],'additional_zoom':False})
    (EVID/'per-card').mkdir(exist_ok=True);(EVID/'per-card'/(c['key']+'.json')).write_text(json.dumps(row,indent=2)+'\n')
    print('Rendered '+c['key']+' '+c['name'],flush=True);return row

if __name__=='__main__':
    cards=json.loads((EVID/'cards.json').read_text())
    selected=[c for c in cards if (c['key'] in sys.argv[1:] if len(sys.argv)>1 else (EVID/'artwork'/c['artwork_file']).exists())]
    with ProcessPoolExecutor(max_workers=3) as pool:list(pool.map(compose,selected))
    rows=[json.loads(p.read_text()) for p in sorted((EVID/'per-card').glob('*.json'))]
    (EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
    entries=[]
    for c in cards:
        a=next((a for a in rows if a['key']==c['key']),None)
        if a is None:continue
        entry={k:c[k] for k in ['id','name','number','set','type','style','source','sourceNumber','subset']}
        land=c['category']=='BATTLEGROUND'
        entry.update(status='Ready',width=1484 if land else 1060,height=1060 if land else 1484,rarity='Promo',rules=c['modern_rules'],templateVersion=3)
        for exp in a['exports']:entry[exp['field']]=exp['path'].removeprefix('public')+'?v='+exp['sha256'][:12]
        entries.append(entry)
    (EVID/'catalog-additions.json').write_text(json.dumps(entries,indent=2)+'\n')
