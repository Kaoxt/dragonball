"""Apply the October 31 single-left-ball layout without rebuilding shared V3 UI."""
from pathlib import Path
import base64, math
from lxml import etree as E

S='http://www.w3.org/2000/svg'
X='http://www.w3.org/1999/xlink'
ASSETS=Path(__file__).resolve().parent.parent/'assets'/'dragon-ball'
CX,CY,R=130.0,887.0,118.0
FOUR=[(-.40,-.22),(.20,-.22),(-.14,.22),(.46,.22)]
LAYOUTS={1:[(0,0)],4:FOUR}

def node(tag,**attrs):
 return E.Element('{'+S+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})

def data_uri(path):
 return 'data:image/png;base64,'+base64.b64encode(Path(path).read_bytes()).decode()

def star(cx,cy,r):
 return ' '.join(f'{cx+(r if i%2==0 else r*.42)*math.cos(-math.pi/2+i*math.pi/5):.6f},{cy+(r if i%2==0 else r*.42)*math.sin(-math.pi/2+i*math.pi/5):.6f}' for i in range(10))

def apply(root,count,art=None,orb=None,star_offsets=None):
 """Preserve brightness, bars, labels, power text, footer and artwork scale."""
 if count not in range(1,8):raise ValueError('Dragon Ball count must be 1–7')
 offsets=star_offsets if star_offsets is not None else LAYOUTS.get(count)
 if offsets is None or len(offsets)!=count:
  raise ValueError('Supply reference-verified star offsets for counts other than 1 and 4')
 art=Path(art or ASSETS/'Shenron-No-Central-Ball.png')
 orb=Path(orb or ASSETS/'Polished-Star-Free-Orb.png')
 group=root.xpath('//*[@id="retained-full-art-dragon-ball"]')[0]
 group.clear();group.set('id','retained-full-art-dragon-ball')
 im=node('image',id='retained-shenron-full-art',x=0,y=0,width=1060,height=1484,preserveAspectRatio='xMidYMid meet')
 im.set('{'+X+'}href',data_uri(art));group.append(im)
 for old in root.xpath('//*[@id="seven-dragon-ball-cluster-vector" or @id="dragon-ball-left-emblem"]'):
  old.getparent().remove(old)
 badge=node('g',id='dragon-ball-left-emblem',data_orb_count=1,data_star_count=count,data_center=f'{CX:g} {CY:g}',data_radius=f'{R:g}',data_revision='2026-10-31-single-left-orb')
 # Keep the original transparent orb asset; no color filter or black backing.
 im=node('image',id='retained-polished-star-free-orb',x=CX-R,y=CY-R,width=2*R,height=2*R,preserveAspectRatio='xMidYMid meet')
 im.set('{'+X+'}href',data_uri(orb));badge.append(im)
 stars=node('g',id='dragon-ball-emblem-stars',data_star_count=count,data_layout='offset-rows-user-reference' if count==4 else 'retained-count-layout')
 sr=R*(.32 if count==1 else .25 if count==2 else .21)
 for i,(dx,dy) in enumerate(offsets):
  stars.append(node('polygon',id=f'dragon-ball-emblem-star-{i+1}',points=star(CX+dx*R,CY+dy*R,sr),fill='#d93209'))
 badge.append(stars)
 category=root.xpath('//*[@id="card-category"]')[0]
 category.getparent().insert(category.getparent().index(category)+1,badge)
 root.set('data-dragon-ball-layout','single-left-orb-2026-10-31')
 root.set('data-artwork-framing','retained-1060x1484-no-zoom')
 root.set('data-dragon-ball-number',str(count))
 return {'count':count,'center':[CX,CY],'radius':R,'star_offsets':offsets,'star_radius':sr,'background_source':art.name,'orb_source':orb.name}
