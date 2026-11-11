from pathlib import Path
from copy import deepcopy
from lxml import etree as E
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
import sys,re,colorsys,subprocess,math
import build_batch_101_150 as shared
from build_batch_101_150 import get,replace,parse,elem,text
from build_android_101_125_promos import inline_external
P=Path(__file__).resolve().parent
sys.path.insert(0,str(P/'scripts'))
from mastery_source_v3 import load as load_mastery_source, APPROVED_SHA256 as MASTERY_SHA256
import importlib.util
spec=importlib.util.spec_from_file_location('sensei_detail_adapter',P/'world-games-special-masters/sensei/scripts/sensei_details_v3.py');ss=importlib.util.module_from_spec(spec);spec.loader.exec_module(ss);capacity_number=ss.capacity_number
S='http://www.w3.org/2000/svg'
def current(n):return next(P.glob(f'saiyan-*/saiyan-{n:03}-*.svg'))
def mastery(c):
 r=E.fromstring(load_mastery_source())
 # The approved source includes an unused legacy pattern with a dangling reference.
 # Removing this unreferenced definition leaves all rendered geometry unchanged.
 unused=get(r,'v2-matched-exposed-frame-texture');unused.getparent().remove(unused)
 r.set('data-approved-mastery-source-sha256',MASTERY_SHA256);r.set('data-style',c['style'])
 if c['style']=='Red':return r
 donor_path=next((P/'trunks-006-055').glob('trunks-007-*.svg')) if c['style']=='Namekian' else current({'Black':65,'Orange':49,'Saiyan':18,'Blue':13,'Freestyle':24}[c['style']])
 donor=parse(donor_path);inline_external(donor,donor_path.parent);defs=r.find('{'+S+'}defs')
 # Retain the approved full-card texture; style filters come from current V3.
 for ident in ['style-outer-background-filter','background-brightness-trial','namekian-frame-hue','streaked-frame-palette']:
  nodes=donor.xpath('//*[@id=$i]',i=ident)
  if nodes:defs.append(deepcopy(nodes[0]))
 frame=deepcopy(get(donor,'background-brightness-trial-wrapper'));replace(r,'original-site-frame',frame)
 hue,saturation={'Black':(.61,.12),'Orange':(.075,.85),'Namekian':(.48,.7),'Saiyan':(.29,.72),'Blue':(.61,.73),'Freestyle':(.12,.08)}[c['style']]
 def tint(color):
  rr,gg,bb=[int(color[i:i+2],16)/255 for i in (1,3,5)];h,l,s=colorsys.rgb_to_hls(rr,gg,bb)
  return '#'+''.join(f'{round(v*255):02x}' for v in colorsys.hls_to_rgb(hue,l,min(s,saturation)))
 for e in r.iter():
  if not any('mastery' in a.get('id','') for a in [e,*e.iterancestors()]):continue
  for k,v in list(e.attrib.items()):
   if k in ['fill','stroke','stop-color'] and re.fullmatch('#[0-9a-fA-F]{6}',v):
    rr,gg,bb=[int(v[i:i+2],16) for i in (1,3,5)]
    if rr>gg*1.2 and rr>bb*1.1:e.set(k,tint(v))
 matrix=get(r,'v2-mastery-retained-shenron-red-ink').find('{'+S+'}feColorMatrix');rgb=colorsys.hls_to_rgb(hue,.53,saturation)
 matrix.set('values',f'0 0 0 0 {rgb[0]} 0 0 0 0 {rgb[1]} 0 0 0 0 {rgb[2]} 0.2126 0.7152 0.0722 0 0')
 # The rules paper remains shared; corners use the native style palette.
 replace(r,'shared-rules-component',deepcopy(get(donor,'shared-rules-component')))
 query=subprocess.run(['inkscape',str(donor_path),'--query-id=tokui-waza-symbol','--query-x','--query-y','--query-width','--query-height'],check=True,capture_output=True,text=True)
 x,y,w,h=map(float,query.stdout.split());scale=200.922/h
 symbol=deepcopy(get(donor,'tokui-waza-symbol'));symbol.set('id','mastery-native-style-symbol')
 g=elem('g',id='tokui-waza-symbol',data_style=c['style'],transform=f'translate(152.1423 839.868) scale({scale}) translate({-x-w/2} {-y-h/2})');g.append(symbol);replace(r,'red-tokui-waza-symbol',g)
 return r

def personality_values(r,old,c):
    for ident in ['v3-level-number','v3-level-number-soft-shadow','concept-pur-number']:
        value=c['level']if 'level'in ident else c['pur'];source=get(old,'level-value'if 'level'in ident else'circle-value');d=source.find('{'+S+'}path').get('d');target=get(r,ident);target.set('d',d)
        pen=BoundsPen(None);parse_path(d,pen);x0,y0,x1,y1=pen.bounds;h,cx,cy=(106,100,71)if 'level'in ident else(65,110,908.5);sc=h/(y1-y0);target.set('transform',f'translate({cx-(x0+x1)*sc/2} {cy-(y0+y1)*sc/2}) scale({sc})');target.set('aria-label',str(value))
    stages=get(r,'power-stages-v3');template=deepcopy(stages[0]);values=c['stages'];count=len(values);assert count in [11,12,13]
    for e in list(stages):stages.remove(e)
    pitch=711.5/count;vscale=(pitch-6)/58.6818181818182
    for i,val in enumerate(values):
        row=deepcopy(template);row.set('id',f'power-stage-{i}');y=148.590909090909+i*pitch;row.set('transform',f'translate(811 {y})');row.set('data-stage-value',str(val))
        for e in list(row):
            if e.tag=='{'+S+'}use':e.set('transform',f'scale(1 {vscale})')
            else:row.remove(e)
        size=49 if count==11 else 42
        g,b=text((f'{val:,}' if isinstance(val,int) else str(val)),'Teko-SemiBold.ttf',size,0,0,f'power-stage-value-{i}');g,b=text((f'{val:,}' if isinstance(val,int) else str(val)),'Teko-SemiBold.ttf',size,220-b[0]/2,0,f'power-stage-value-{i}')
        # Baseline derives only from digit ink; comma tails do not shift the values.
        digits,db=text(str(val).replace(',',''),'Teko-SemiBold.ttf',size,0,0,'digits');first=digits[0];pen=BoundsPen(None);parse_path(first.get('d'),pen);ys=[]
        for path in digits:
            p=BoundsPen(None);parse_path(path.get('d'),p);ys.extend([p.bounds[1],p.bounds[3]])
        digit_center=(min(ys)+max(ys))/2*size/1000;center=27*vscale
        m=re.match(r'translate\(([^ ]+) ([^)]+)\)(.*)',g.get('transform'));g.set('transform',f'translate({m.group(1)} {center+digit_center}){m.group(3)}');g.set('data-digit-center-y',str(center));g.set('data-stage-value',str(val));row.append(g);stages.append(row)
    gaps=get(r,'power-stage-gap-overlays')
    for e in list(gaps):gaps.remove(e)
    for i in range(count-1):elem('rect',gaps,x=813.75,y=148.590909090909+(i+1)*pitch-8.25,width=233.25,height=6,fill='#112932',opacity='.4')
    for e in list(r.find('{'+S+'}defs')):
        if e.get('id')=='earlier-stage-gap-source'or e.get('id','').startswith('restored-gap-window-'):e.getparent().remove(e)


def sensei_rules(r,c):
    from functools import lru_cache
    tokens=c['modern_rules'].split();max_width=580
    def width(ts):return sum(shared.word(t)[2] for t in ts)+9.8*(len(ts)-1)
    @lru_cache(None)
    def solve(a,left):
        if a==len(tokens):return (0,[])
        if not left:return(float('inf'),[])
        best=(float('inf'),[])
        for b in range(a+1,len(tokens)+1):
            w=width(tokens[a:b])
            if w>max_width:break
            if b<len(tokens) and tokens[b-1].lower()in ['your','the','a','of','per','level','power:']:continue
            cost,lines=solve(b,left-1);cost+=100000+(max_width-w)**2
            if cost<best[0]:best=(cost,[tokens[a:b]]+lines)
        return best
    cost,lines=solve(0,5);assert math.isfinite(cost),(c['number'],'Sensei text exceeds space')
    reports=[]
    for i,ts in enumerate(lines):
        label=' '.join(ts)
        # shared outlined word glyphs use the same established 49-unit body font.
        g=elem('g',r,id=f'rules-line-{i+1}',aria_label=label,fill='#060606',transform=f'translate(73 {1049.3+59*i})',data_font_size=49,data_layout='reference-medallion-left-wrap')
        x=0
        for t in ts:
            for d in shared.word(t)[0]:elem('path',g,d=d,transform=f'translate({x} 0)')
            x+=shared.word(t)[2]+9.8
        reports.append({'text':label,'width':width(ts),'baseline':1049.3+59*i,'icon_inline':False})
    return reports,None
