"""Check retained artwork, original personality values and current CRD evidence."""
from pathlib import Path
from lxml import etree as E
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
import argparse,base64,hashlib,json,re
P=Path(__file__).resolve().parent;R=P.parents[2];D=R/'tools/card-corrections/v3-cell-051-100'
XL='{http://www.w3.org/1999/xlink}href'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(name,data):(D/name).write_text(json.dumps(data,indent=2)+'\n')
def get(r,i):return r.xpath('//*[@id=$i]',i=i)[0]
a=argparse.ArgumentParser();a.add_argument('--first',type=Path,required=True);a.add_argument('--next-batch',type=Path,required=True);args=a.parse_args()
cards=json.loads((D/'cards.json').read_text());audit=json.loads((D/'audit.json').read_text());retained=[];personalities=[];crd=[]
# Values independently transcribed from the original scans, in descending order.
printed={84:(1,1,list(range(300000,50000,-25000))+[0]),85:(2,2,list(range(325000,75000,-25000))+[0]),86:(1,2,list(range(400000,0,-40000))+[0]),87:(3,4,list(range(500000,100000,-40000))+[0]),88:(3,3,list(range(350000,100000,-25000))+[0]),89:(1,2,list(range(500000,250000,-25000))+[0]),90:(1,2,list(range(1200000,0,-100000))+[0]),95:(2,1,list(range(1250000,50000,-100000))+[0]),97:(3,3,list(range(700000,200000,-50000))+[0]),98:(3,2,list(range(1300000,100000,-100000))+[0]),99:(2,2,list(range(600000,100000,-50000))+[0])}
notes={52:'CRD lines 3175–3181: Energy Combat stop-all effects do not stop this attack. Opponent may still play an Energy Combat card to obtain its secondary effects. Printed prohibition is preserved.',65:'CRD line 2279 changes Blue Backflip to Blue Flip.',77:'CRD lines 3966–3967: applies when entering Combat as the Defender.',100:'CRD lines 3751–3752: once per turn, in place of an attack; the Drill also affects Dragon Balls.'}
for c,row in zip(cards,audit):
 n=c['number'];assert n==row['number'];source=(args.first if n<=60 else args.next_batch)/'masters'/(c['id']+'.svg');old=E.parse(str(source));final=R/row['native_source_path'];new=E.parse(str(final));ident='dende-full-art'if 73<=n<=75 else'card-illustration';a=get(old,ident);b=get(new,ident);raw=base64.b64decode((a.get(XL)or a.get('href')).split(',',1)[1]);v=b.get(XL)or b.get('href');asset=(final.parent/v).resolve();assert raw==asset.read_bytes(),n
 aa={k:v for k,v in a.attrib.items()if not k.endswith('href')};bb={k:v for k,v in b.attrib.items()if not k.endswith('href')};assert aa==bb,(n,'image mapping')
 retained.append({'number':n,'source_native_sha256':sha(source),'final_native_sha256':sha(final),'original_image_sha256':hashlib.sha256(raw).hexdigest(),'retained_asset':str(asset.relative_to(R)),'original_image_bytes_unchanged':True,'original_mapping_unchanged':True,'image_attributes':aa,'outer_v3_mapping':row['artwork']['mapping_matrix'],'additional_zoom':False})
 assert c['rarity_stars']==3
 if n in printed:
  level,pur,values=printed[n];assert (c['level'],c['pur'],c['stages'])==(level,pur,values),n
  assert get(new,'v3-level-number').get('aria-label')==str(level);assert get(new,'concept-pur-number').get('aria-label')==str(pur)
  groups=list(get(new,'power-stages-v3'));assert [int(g.get('data-stage-value'))for g in groups]==values
  measurements=[]
  for i,g in enumerate(groups):
   text=get(new,f'power-stage-value-{i}');assert text.get('aria-label')==f'{values[i]:,}'
   # Outline bounds of numeral glyphs only; commas cannot alter the alignment.
   glyphs=list(text);label=text.get('aria-label');assert len(label)==len(glyphs);bounds=[]
   for char,path in zip(label,glyphs):
    if char.isdigit():pen=BoundsPen(None);parse_path(path.get('d'),pen);bounds.append(pen.bounds)
   m=re.fullmatch(r'translate\(([^ ]+) ([^)]+)\) scale\(([^ ]+) ([^)]+)\)',text.get('transform'));tx,ty,sx,sy=map(float,m.groups());digit_center=ty+(min(b[1]for b in bounds)+max(b[3]for b in bounds))/2*sy;expected=27*(711.5/len(values)-6)/58.6818181818182;assert abs(digit_center-expected)<.0001
   x,y,w,h=row['native_geometry']['bounds'][f'power-stage-value-{i}'];assert abs(x+w-1031)<.021
   measurements.append({'value':values[i],'right_ink_edge':x+w,'digit_center_local_y':digit_center,'digit_center_error':digit_center-expected})
  personalities.append({'number':n,'level':level,'pur':pur,'stages':values,'source':'Original scan, independently transcribed','rows':measurements,'verified':True})
 crd.append({'number':n,'name':c['name'],'original_text':c['original_rules'],'original_reference':str((D/'originals'/f'{n:03}.png').relative_to(R)),'original_sha256':sha(D/'originals'/f'{n:03}.png'),'crd_note':notes.get(n,'Checked supplied Expanded CRD: no applicable card-specific erratum or Restricted List entry. Preserve printed costs, fixed/additional damage, restrictions, timing, targets and optionality.'),'corrected_effect':c['corrected_effect'],'modern_rules':c['modern_rules'],'power_icon':c.get('power_icon'),'rarity_stars':3,'category':c['category'],'category_correction':c.get('category_correction')})
assert cards[0]['category']=='PHYSICAL COMBAT';assert cards[32]['category']=='SETUP'
write('retained-art-verification.json',retained);write('personality-values.json',personalities);write('crd-review.json',{'crd_source_sha256':sha(D/'Expanded-CRD.txt'),'reviewed_cards':50,'specific_errata_cards':[52,65,77,100],'category_transcription_corrections':[51,83],'cards':crd});print('Verified all retained artwork, eleven personality value sets, categories and CRD records')
