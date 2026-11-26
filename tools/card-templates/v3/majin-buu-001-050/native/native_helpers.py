from pathlib import Path
from copy import deepcopy
from functools import lru_cache
from lxml import etree as E
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
import sys, re, math, json, io, os, base64
from hashlib import sha256
P=Path(__file__).resolve().parent
sys.path.insert(0,str(P/'scripts'))
from text_v3 import text,elem
from power_icons import icon,width_at_height
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
FONT=TTFont(P/'fonts/BarlowCondensed-Bold.ttf');GS=FONT.getGlyphSet();CM=FONT.getBestCmap();SC=49/FONT['head'].unitsPerEm
shared=sys.modules[__name__]

def get(r,i):
 a=r.xpath('//*[@id=$i]',i=i);assert len(a)==1,(i,len(a));return a[0]

def replace(r,i,n):
 e=get(r,i);e.getparent().replace(e,n)

def parse(p):return E.parse(str(p)).getroot()

def digest(p):return sha256(Path(p).read_bytes()).hexdigest()

def atomic_bytes(p,data):
 p=Path(p);tmp=p.with_name(p.name+'.tmp')
 with tmp.open('wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
 os.replace(tmp,p)

def save(r,p):atomic_bytes(p,E.tostring(r,encoding='utf-8',xml_declaration=True))

def word(t):
 x=0;paths=[];boxes=[]
 for c in t:
  g=GS[CM[ord(c)]];pen=SVGPathPen(GS);b=BoundsPen(GS);m=(SC,0,0,-SC,x,0);g.draw(TransformPen(pen,m));g.draw(TransformPen(b,m))
  if b.bounds:paths.append(pen.getCommands());boxes.append(b.bounds)
  x+=g.width*SC
 return paths,(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)),x

def dependencies(dest,source,layer):
 known={x.get('id') for x in dest.iter()};queue=[layer]
 while queue:
  node=queue.pop()
  refs=set()
  for e in node.iter():
   for k,v in e.attrib.items():
    refs.update(re.findall(r'url\(#([^)]*)\)',v))
    if k.endswith('href') and v.startswith('#'):refs.add(v[1:])
  for ref in refs-known:
   n=deepcopy(get(source,ref));dest.find('{'+S+'}defs').append(n);known.add(ref);queue.append(n)

def rarity(r,count):
 g=get(r,'footer-rarity');orig=deepcopy(g.find('{'+S+'}polygon'))
 for x in list(g):
  if x.tag=='{'+S+'}polygon':g.remove(x)
 centers={1:[(0,0)],2:[(-6,-6),(6,6)],3:[(0,-7),(-7,6),(7,6)],4:[(-9.36,-5.148),(4.68,-5.148),(-3.276,5.148),(10.764,5.148)],5:[(-7,-8),(7,-8),(0,0),(-7,8),(7,8)],6:[(-6,-8),(6,-8),(-9,0),(0,0),(9,0),(0,10)]}[count]
 for i,(dx,dy) in enumerate(centers):
  x=deepcopy(orig);x.set('id',f'rarity-star-{i}');x.set('transform',f'translate({dx} {dy})');g.insert(1+i,x)
 g.set('data-star-count',str(count))

def rules(r,c,land):
 kind=c.get('power_icon');iw=shared.width_at_height(kind,34.3) if kind else 0
 assert ' '.join(c['rule_lines']).replace('@ICON@ ','')==c['modern_rules']
 reports=[];iconline=None;cx=741.5 if land else 529.5
 # Center the landscape block in its shorter 173 1/3-unit paper panel.
 first=828.333333333333+17.15-(len(c['rule_lines'])-1)*59/2 if land else 1049.3
 for i,line in enumerate(c['rule_lines']):
  parts=[];xx=0;tokens=line.split()
  for j,t in enumerate(tokens):
   if j:xx+=12 if t=='@ICON@' or tokens[j-1]=='@ICON@' else 9.8
   parts.append((t,xx));xx+=iw if t=='@ICON@' else shared.word(t)[2]
  assert xx <= (1310 if land else 890),(c['number'],line,xx)
  ink=[(x,x+iw) if t=='@ICON@' else (x+shared.word(t)[1][0],x+shared.word(t)[1][2]) for t,x in parts]
  dx=cx-(min(a[0]for a in ink)+max(a[1]for a in ink))/2;baseline=first+i*59
  label=' '.join(t for t in tokens if t!='@ICON@');g=elem('g',r,id=f'rules-line-{i+1}',aria_label=label,fill='#060606',transform=f'translate({dx} {baseline})',data_font_size=49,data_word_spacing='normal')
  for t,x in parts:
   if t=='@ICON@':
    ic,_=shared.icon(kind,dx+x,baseline-34.3,34.3,'power-icon');r.append(E.fromstring(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(ic)));iconline=i+1
   else:
    for d in shared.word(t)[0]:elem('path',g,d=d,transform=f'translate({x} 0)')
  reports.append({'text':label,'baseline':baseline,'width':xx,'icon_inline':'@ICON@' in tokens})
 return reports,iconline

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
        label=f'{val:,}' if isinstance(val,int) else str(val)
        g,b=text(label,'Teko-SemiBold.ttf',size,0,0,f'power-stage-value-{i}');g,b=text(label,'Teko-SemiBold.ttf',size,220-b[0]/2,0,f'power-stage-value-{i}')
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

word=lru_cache(maxsize=8192)(word)
