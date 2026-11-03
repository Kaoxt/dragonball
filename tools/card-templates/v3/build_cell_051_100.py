"""Recover Cell Saga 051–100 from retained illustrations and current V3 sources."""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from functools import partial
from lxml import etree as E
from PIL import Image, ImageChops
import argparse, base64, io, json, math, subprocess, sys
import build_batch_101_150 as shared
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text
from build_android_101_125_promos import rules, inline_external

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label
from tokui_backing import apply as tokui_backing
from align_power_icon import align_power_icon
import footer_spacing as footer
from text_layout_v3 import validate as validate_text_layout
from personality_middle_v3 import apply as personality_middle
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
import re
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'cell-051-100'; EVID=ROOT/'tools/card-corrections/v3-cell-051-100'
WORK=ROOT.parent/'cell-051-100-work'; shared.OUT=OUT; shared.EVID=EVID

def current(n): return next(P.glob(f'saiyan-*/saiyan-{n:03}-*.svg'))

def image(parent,path,ident,x,y,w,h,**attrs):
    el=elem('image',parent,id=ident,x=x,y=y,width=w,height=h,preserveAspectRatio='none',**attrs)
    el.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode())
    return el

def artwork(r,old,c):
    n=c['number']; db=c["category"]=="DRAGON BALL"
    if db:
        wrapper=get(r,'background-brightness-trial-wrapper'); wrapper.attrib.pop('filter',None)
        for e in list(wrapper):wrapper.remove(e)
        layer=elem('g',wrapper,id='retained-full-art-dragon-ball')
        layer.append(deepcopy(get(old,'dende-full-art')))
        return {'mode':'approved Dende full-art exception','approved_artwork_exception':True,
                'artwork_bytes_retained':True,'mapping_matrix':[1,0,0,1,0,0],
                'additional_zoom':False,'localized_correction':None,'background_gain':1}
    art=deepcopy(get(old,'card-illustration'))
    layer=elem('g',id='retained-illustration',clip_path='url(#new-art-window)')
    sc=1033/1027; tx=14-16*sc; ty=499-(145+712.8378378378378/2)*sc
    mapped=elem('g',layer,id='retained-source-illustration',transform=f'matrix({sc} 0 0 {sc} {tx} {ty})')
    mapped.append(art)
    shared.dependencies(r,old,art)
    patch=json.loads((EVID/'localized-patches.json').read_text()).get(str(n))
    if patch:
        aw,ah=patch['source_dimensions']; x,y,w,h=[float(art.get(k))for k in ['x','y','width','height']]
        g=elem('g',mapped,id=f'localized-art-correction-{n}',transform=f'translate({x} {y}) scale({w/aw} {h/ah})')
        defs=r.find('{'+S+'}defs'); clip=elem('clipPath',defs,id=f'localized-art-mask-{n}',clipPathUnits='userSpaceOnUse')
        if n==1:
            for cx,cy,rad in patch['dots']:elem('circle',clip,cx=cx,cy=cy,r=rad)
            image(g,EVID/patch['file'],'background-fleck-repair',0,0,aw,ah,clip_path=f'url(#localized-art-mask-{n})')
        else:
            points=patch['tail_boundary_points']; path='M'+ ' L'.join(f'{a},{b}'for a,b in points)+f' L{points[-1][0]},700 L{points[0][0]},700 Z'
            elem('path',clip,d=path)
            clipped=elem('g',g,clip_path=f'url(#localized-art-mask-{n})')
            px,py,pw,ph=patch['placement']; box=patch['generated_viewbox']
            viewport=elem('svg',clipped,x=px,y=py,width=pw,height=ph,viewBox=' '.join(map(str,box)),preserveAspectRatio='xMidYMid meet',overflow='hidden')
            image(viewport,EVID/patch['file'],'lower-fist-insert',0,0,*patch['generated_dimensions'])
    replace(r,'retained-illustration',layer)
    return {'mode':'retained illustration with bounded repair'if patch else'retained approved illustration',
            'artwork_bytes_retained':True,'mapping_matrix':[sc,0,0,sc,tx,ty],
            'additional_zoom':False,'horizontal_source_crop':0,'localized_correction':patch,
            'preserved_earlier_artwork_correction':n in [67,98]}

def orb(r,count):
    g=get(r,'dragon-ball-emblem-stars')
    for el in list(g):g.remove(el)
    offsets={3:[(0,-.36),(-.34,.25),(.34,.25)],4:[(-.40,-.22),(.20,-.22),(-.14,.22),(.46,.22)],5:[(0,-.48),(-.46,-.12),(.46,-.12),(-.28,.42),(.28,.42)]}[count]
    radius=118*(.23 if count==3 else .21)
    for i,(dx,dy)in enumerate(offsets):
        cx,cy=130+dx*118,887+dy*118; points=[]
        for k in range(10):
            a=-math.pi/2+k*math.pi/5; rr=radius if k%2==0 else radius*.42
            points.append(f'{cx+math.cos(a)*rr:.6f},{cy+math.sin(a)*rr:.6f}')
        elem('polygon',g,id=f'dragon-ball-emblem-star-{i+1}',points=' '.join(points),fill='#d93209')
    g.set('data-star-count',str(count));get(r,'dragon-ball-left-emblem').set('data-star-count',str(count))


def personality_values(r,old,c):
    for ident in ['v3-level-number','v3-level-number-soft-shadow','concept-pur-number']:
        value=c['level']if 'level'in ident else c['pur'];source=get(old,'level-value'if 'level'in ident else'circle-value');d=source.find('{'+S+'}path').get('d');target=get(r,ident);target.set('d',d)
        pen=BoundsPen(None);parse_path(d,pen);x0,y0,x1,y1=pen.bounds;h,cx,cy=(106,100,71)if 'level'in ident else(65,110,908.5);sc=h/(y1-y0);target.set('transform',f'translate({cx-(x0+x1)*sc/2} {cy-(y0+y1)*sc/2}) scale({sc})');target.set('aria-label',str(value))
    stages=get(r,'power-stages-v3');template=deepcopy(stages[0]);values=c['stages'];count=len(values);assert count in [11,13]
    for e in list(stages):stages.remove(e)
    pitch=711.5/count;vscale=(pitch-6)/58.6818181818182
    for i,val in enumerate(values):
        row=deepcopy(template);row.set('id',f'power-stage-{i}');y=148.590909090909+i*pitch;row.set('transform',f'translate(811 {y})');row.set('data-stage-value',str(val))
        for e in list(row):
            if e.tag=='{'+S+'}use':e.set('transform',f'scale(1 {vscale})')
            else:row.remove(e)
        size=49 if count==11 else 42
        g,b=text(f'{val:,}','Teko-SemiBold.ttf',size,0,0,f'power-stage-value-{i}');g,b=text(f'{val:,}','Teko-SemiBold.ttf',size,220-b[0]/2,0,f'power-stage-value-{i}')
        # Baseline derives only from digit ink; comma tails do not shift the values.
        digits,db=text(str(val),'Teko-SemiBold.ttf',size,0,0,'digits');first=digits[0];pen=BoundsPen(None);parse_path(first.get('d'),pen);ys=[]
        for path in digits:
            p=BoundsPen(None);parse_path(path.get('d'),p);ys.extend([p.bounds[1],p.bounds[3]])
        digit_center=(min(ys)+max(ys))/2*size/1000;center=27*vscale
        m=re.match(r'translate\(([^ ]+) ([^)]+)\)(.*)',g.get('transform'));g.set('transform',f'translate({m.group(1)} {center+digit_center}){m.group(3)}');g.set('data-digit-center-y',str(center));g.set('data-stage-value',str(val));row.append(g);stages.append(row)
    gaps=get(r,'power-stage-gap-overlays')
    for e in list(gaps):gaps.remove(e)
    for i in range(count-1):elem('rect',gaps,x=813.75,y=148.590909090909+(i+1)*pitch-8.25,width=233.25,height=6,fill='#112932',opacity='.4')
    for e in list(r.find('{'+S+'}defs')):
        if e.get('id')=='earlier-stage-gap-source'or e.get('id','').startswith('restored-gap-window-'):e.getparent().remove(e)

def compose(c,first,next_batch):
    (P/'references/version-3-standard.md').read_text()
    n=c['number'];db=c["category"]=="DRAGON BALL";source=(first if n<=60 else next_batch)/'masters'/(c['id']+'.svg');old=parse(source)
    mp='PERSONALITY'in c['category'];donor=(P/'cell-051-100-donors'/('Personality-Villain-Master-V3.svg'if c['category'].startswith('VILLAIN')else'Personality-Master-V3.svg'))if mp else current(15)if db else next(P.glob('trunks-*/trunks-007-*.svg'))if c['style']=='Namekian'else current({'Orange':49,'Red':6,'Blue':13,'Black':65,'Saiyan':18,'Freestyle':24}[c['style']])
    r=parse(donor);inline_external(r,donor.parent);r.set('data-template-version','3');r.set('data-card-number',str(n));r.set('data-card-family',c['category']);r.find('{'+S+'}title').text=c['name']
    for el in list(r):
        if el.get('id','').startswith('rules-line-')or el.get('id')in ['power-icon','attack-icon','power-line-block']:r.remove(el)
    # Donors can retain unused rules definitions. Remove them to prevent duplicate IDs
    # from making a newly composed rules line disappear during SVG rendering.
    for el in list(r.xpath('//*[starts-with(@id,"rules-line-")]')):el.getparent().remove(el)
    get(r,'card-title').set('aria-label',c['name']);fit=title_fit(r)if mp else title_fit(r,159.5,899.5);assert title_fit(r)==fit
    get(r,'card-category').set('aria-label',c['category']);mid=middle_label(r);assert middle_label(r)==mid
    num,b=text(str(n),'Teko-SemiBold.ttf',53,877.15,1409.5,'card-number');replace(r,'card-number',num)
    ballroot=parse(current(24));ball=deepcopy(get(ballroot,'footer-rarity'));shared.dependencies(r,ballroot,ball);replace(r,'footer-rarity',ball);shared.rarity(r,c['rarity_stars'])
    ball=get(r,'footer-rarity');ball.set('transform',f'translate({847.25-(12.2+b[0])/2-882} -6.5)')
    logo=deepcopy(get(old,'cell-set-emblem'));logo.set('id','saga-emblem');logo.set('data-set','Cell Saga');logo.set('transform','translate(68 6.925)');replace(r,'saga-emblem',logo)
    ar=artwork(r,old,c);ar['source_native_sha256']=digest(source)
    if db:orb(r,c['dragon_ball_number'])
    if mp:personality_values(r,old,c);personality_middle(r,high_tech=False)
    tok=None if db or mp else tokui_backing(r);reports,iconline=rules(r,c,False);assets=shared.assetize(r)
    measurement=deepcopy(r)
    for el in measurement.xpath('//*[local-name()="image"]'):
        key='{'+X+'}href'if el.get('{'+X+'}href')else'href';v=el.get(key)
        if not v.startswith('#'):el.set(key,str((OUT/v).resolve()))
    icons=[]
    if iconline:
        result=align_power_icon(measurement,'power-icon',f'rules-line-{iconline}');assert align_power_icon(measurement,'power-icon',f'rules-line-{iconline}')['vertical_shift']==0
        replace(r,'power-icon',deepcopy(get(measurement,'power-icon')));icons=[result]
    ids=[el.get('id')for el in r.iter()if el.get('id')];assert len(ids)==len(set(ids)),(n,'duplicate IDs');assert not r.xpath('//*[local-name()="text"]')
    OUT.mkdir(exist_ok=True);svg=OUT/(c['id']+'.svg');save(r,svg);footer.change(svg,normalize_gap=True);assert not footer.change(svg,normalize_gap=True)['changed']
    render=WORK/'renders';render.mkdir(exist_ok=True)
    result=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width=2120'],capture_output=True,check=True)
    im=Image.open(io.BytesIO(result.stdout)).convert('RGB');assert im.size==(2120,2968);save_image(im,render/(c['id']+'.png'),'PNG')
    card=next(x for x in json.loads((WORK/'catalog-before.json').read_text())if x['id']==c['id']);exports=[]
    for field,size in [('image',(1060,1484)),('downloadImage',(2120,2968))]:
        rel='public'+card[field].split('?')[0];dest=ROOT/rel;out=im.resize(size,Image.Resampling.LANCZOS)if size!=im.size else im
        dest.parent.mkdir(parents=True,exist_ok=True);save_image(out,dest,'WEBP',lossless=True,method=4);assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox()is None
        exports.append({'field':field,'path':rel,'before_url':card[field],'before_git_blob_sha':c['prior_exports'][field]['git_blob_sha'],'after_sha256':digest(dest),'size':list(size),'lossless_round_trip':True})
    measured=footer.bounds(svg);bounds={k:v for k,v in measured.items()if k in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','power-icon','dragon-ball-left-emblem']or k.startswith(('rules-line-','power-stage-value-'))or k in ['v3-level-number','concept-pur-number']}
    validate_text_layout(parse(svg),bounds)
    for ident,xy in {'card-title':(529.5,79),'card-category':(529.5,908.5),'footer-text-block':(529.5,1409.5),'saga-emblem':(211.75,1409.5)}.items():
        x,y,w,h=bounds[ident];assert abs(x+w/2-xy[0])<.02 and abs(y+h/2-xy[1])<.02,(n,ident,bounds[ident])
    ball,num=bounds['footer-rarity'],bounds['card-number'];assert abs((min(ball[0],num[0])+max(ball[0]+ball[2],num[0]+num[2]))/2-847.25)<.02;assert abs(num[0]-ball[0]-ball[2]-12.2)<.02
    row={'number':n,'id':c['id'],'name':c['name'],'family':c['category'],'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':ar,'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':icons},'exports':exports,'tokui_waza_backing':{'applies':not(db or mp),'report':tok},'current_preview_revision':{'title_fit':fit,'middle_label':mid,'footer_idempotent':True},'power_icon':c.get('power_icon'),'rarity_stars':c['rarity_stars'],'set_emblem':{'retained_raster':True,'retained_shape_and_size':True,'target_center':[211.75,1409.5]}}
    (EVID/'per-card'/f'{n:03}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n}: {c["name"]}',flush=True);return row

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--first',type=Path,required=True);a.add_argument('--next-batch',type=Path,required=True);a.add_argument('numbers',type=int,nargs='*');args=a.parse_args()
    cs=json.loads((EVID/'cards.json').read_text());selected=[c for c in cs if not args.numbers or c['number']in args.numbers]
    OUT.mkdir(exist_ok=True);(EVID/'per-card').mkdir(exist_ok=True)
    with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(partial(compose,first=args.first.resolve(),next_batch=args.next_batch.resolve()),selected))
    rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('*.json'))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
