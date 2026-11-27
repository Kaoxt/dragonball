from pathlib import Path
import json,re
P=Path(__file__).resolve().parent;R=P.parent
# Packaged art files are the reviewed selections. Generation history is provenance,
# not an import source: it can include superseded drafts and machine-local paths.
previous={c['number']:c for c in json.loads((R/'new-cards.json').read_text())} if (R/'new-cards.json').exists() else {}
rules={r[0]:r for path in sorted(R.glob('rules-*.json')) for r in json.loads(path.read_text())}
cards=[]
for prod in json.loads((R/'source-products.json').read_text()):
 n=prod['number']
 if n not in rules:continue
 tags=prod['tags'];name=prod['name'];category=next((x for x in ['Physical Combat','Energy Combat','Combat','Non-Combat','Drill','Personality','Location','Battleground'] if x in tags),None)
 if n in [65,86,91,96]:category='Drill'
 if n==72:category='Personality';name='Krillin, Z Warrior'
 category={'Combat':'EVENT','Non-Combat':'SETUP','Personality':'HERO'}.get(category,category.upper() if category else 'UNKNOWN')
 style=next((s for s in ['Black','Blue','Namekian','Orange','Red','Saiyan'] if s in tags),'Freestyle')
 row=rules[n];art=f'native/assets/art-{n:03d}.png';slug=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
 c=dict(number=n,name=name,id=f'majin-buu-{n:03d}-{slug}',set='Majin Buu Saga',set_id='majin-buu-saga',category=category,style=style,power_icon=row[2],icon_prefix=row[3],modern_rules=row[1],original_scan=f'originals/{n:03d}.jpg',original_ocr=f'ocr/{n:03d}.txt',source_url=prod['product_url'],source_image_url=prod['url'],rarity_stars=3,release_status='ready' if (R/art).exists() else 'artwork_pending',artwork_path=art,crd_review={'source':'Expanded-CRD.txt','result':'Original scan and general rules checked; card-specific corrections documented in QA summary.','default_energy_cost':2 if row[2]=='attack' and 'Energy attack' in row[1] else None},authoritative_effect=row[1],source_set='Buu Saga (Score, 2003)',visual_review_status='awaiting_final_visual_review',original_text_transcription=(R/f'ocr/{n:03d}.txt').read_text(),original_text_note='Machine OCR retained verbatim for provenance; original scan is authoritative when OCR is garbled.')
 if n==72:c.update(level=2,pur=3,stages=[650000,625000,600000,575000,550000,525000,500000,475000,450000,425000,0])
 if n in previous:
  for key in ['visual_review_status','visual_review_notes']:
   if key in previous[n]:c[key]=previous[n][key]
 cards.append(c)
(R/'new-cards.json').write_text(json.dumps(cards,indent=2))
print(f'Assembled {len(cards)} cards; {sum(c["release_status"]=="ready" for c in cards)} have illustrations.')
