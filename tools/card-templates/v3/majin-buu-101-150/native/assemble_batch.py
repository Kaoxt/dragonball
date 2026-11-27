from pathlib import Path
import json,re
P=Path(__file__).resolve().parent;R=P.parent
previous={c['number']:c for c in json.loads((R/'new-cards.json').read_text())} if (R/'new-cards.json').exists() else {}
rules={r[0]:r for path in sorted(R.glob('rules-*.json')) for r in json.loads(path.read_text())}
mp={
114:(4,4,[7290000,7265000,7240000,7215000,7190000,7165000,7140000,7115000,7090000,7060000,0]),
115:(1,1,[69,44,43,42,41,37,35,32,31,27,0]),
116:(4,4,[5100000,5060000,5020000,4980000,4940000,4900000,4860000,4820000,4780000,4740000,0]),
117:(4,5,[1900000,1890000,1880000,1870000,1860000,1850000,1840000,1830000,1820000,1810000,0]),
118:(4,5,[1850000,1840000,1830000,1820000,1810000,1800000,1790000,1780000,1770000,1760000,0]),
119:(4,5,[4750000,4500000,4250000,4000000,3750000,3500000,3250000,3000000,2750000,2500000,0]),
120:(4,5,[600000,590000,580000,570000,560000,550000,540000,530000,520000,510000,0]),
130:(3,4,[3400,3300,3200,3100,3000,2900,2800,2700,2600,2500,0]),
133:(3,1,[3000,2950,2900,2850,2800,2750,2700,2650,2600,2550,0]),
140:(1,1,[200,190,180,170,160,150,140,130,120,110,0])}
masters=[126,128,131,139,142,144,146]
cards=[]
for prod in json.loads((R/'source-products.json').read_text()):
 n=prod['number'];tags=prod['tags'];name=re.sub(r'\s+Lv\.?\s*\d+.*$','',prod['name']).strip()
 if n==132:name="Gotenks' Flight"
 if n==116:name='Goku, Super Saiyan Ascended'
 if n==119:name='Majin Dabura, D.O.A.'
 if n in mp:category='VILLAIN'if n in [114,119,120]else'HERO'
 elif n in masters:category='MASTERY'
 elif n==138:category='SENSEI'
 elif n in [121,122]:category='DRAGON BALL';name=f'Alt. Dende Dragon Ball {n-115}'
 elif n in [110,113]:category='LOCATION'
 elif n in [107,125]:category='DRILL'
 elif n in [103,147,149,150]:category='SETUP'
 else:category=next((x.upper() for x in ['Physical Combat','Energy Combat'] if x in tags),'EVENT')
 style=next((s for s in ['Black','Blue','Namekian','Orange','Red','Saiyan'] if name.startswith(s+' ')),'Freestyle')
 row=rules[n];art=f'native/assets/art-{n:03d}.png';slug=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
 c=dict(number=n,name=name,id=f'majin-buu-{n:03d}-{slug}',set='Majin Buu Saga',set_id='majin-buu-saga',category=category,style=style,power_icon=row[2],icon_prefix=row[3],modern_rules=row[1],original_scan=f'originals/{n:03d}.jpg',original_ocr=f'ocr/{n:03d}.txt',source_url=prod['product_url'],source_image_url=prod['url'],rarity_stars=3 if n<=114 else 6 if n==150 else 4,release_status='ready' if (R/art).exists() else 'artwork_pending',artwork_path=art,crd_review={'source':'Expanded-CRD.txt','result':'Original scan and general rules checked; card-specific corrections documented in QA summary.'},authoritative_effect=row[1],source_set='Buu Saga (Score, 2003)',visual_review_status='awaiting_final_visual_review',original_text_transcription=(R/f'ocr/{n:03d}.txt').read_text(),original_text_note='Machine OCR retained verbatim for provenance; original scan is authoritative when OCR is garbled.')
 if n in mp:c.update(level=mp[n][0],pur=mp[n][1],stages=mp[n][2])
 if n in [121,122]:c.update(dragon_ball_number=n-115,artwork_path='native/assets/Dende-Summoning-Background-Extension.png',approved_artwork_path=True,release_status='ready')
 if n==138:c.update(sensei_deck_capacity=21)
 if n in [116,117,131,146]:c.update(release_status='artwork_pending',artwork_block_reason='Image generator rejected both original attempt and retry; original scan retained as a clearly labeled review placeholder.')
 if n in previous:
  for key in ['visual_review_status','visual_review_notes']:
   if key in previous[n]:c[key]=previous[n][key]
 cards.append(c)
(R/'new-cards.json').write_text(json.dumps(cards,indent=2))
print(f'Assembled {len(cards)} cards; {sum(c["release_status"]=="ready" for c in cards)} have illustrations.')
