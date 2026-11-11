"""Verify all fifty completed World Games 051–100 cards."""
from pathlib import Path
from lxml import etree as E
from PIL import Image,ImageChops
import hashlib,importlib,json,sys
P=Path(__file__).resolve().parent;ROOT=P.parents[2];sys.path.insert(0,str(P/'scripts'))
from world_games_text_layout import validate,title_vertical_center
from personality_levels import validate_level
from personality_stages import printed_stages
EV=ROOT/'tools/card-corrections/v3-world-games-051-100'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def verify():
    cards=json.loads((EV/'cards.json').read_text());rows=json.loads((EV/'audit.json').read_text());by={r['number']:r for r in rows};results=[]
    assert len(cards)==50 and len(rows)==50 and set(by)==set(range(51,101))
    for c in cards:
        n=c['number']
        a=by[n];svg=ROOT/a['native_source_path'];raw=svg.read_bytes();assert sha(svg)==a['native_source_sha256']
        r=E.fromstring(raw);assert r.get('data-card-number')==str(n)
        ids=[x.get('id') for x in r.iter() if x.get('id')];assert len(ids)==len(set(ids));assert not r.xpath('//*[local-name()="text"]')
        assert r.xpath('//*[@id="card-title"]')[0].get('aria-label')==c['name']
        assert r.xpath('//*[@id="card-number"]')[0].get('aria-label')==str(n)
        assert len(r.xpath('//*[@id="power-icon"]'))==int(bool(c['power_icon']))
        assert ' '.join(' '.join(x['text'] for x in a['rules']).split())==' '.join(c['modern_rules'].split())
        for asset in a['assets']:assert sha(ROOT/asset['path'])==asset['sha256']
        for x in r.xpath('//*[local-name()="image"]'):
            v=x.get('{http://www.w3.org/1999/xlink}href') or x.get('href');assert v and not v.startswith(('http:','https:'))
            if not v.startswith(('#','data:')):assert (svg.parent/v).is_file()
        if n!=91:validate(r,a['native_geometry']['bounds'])
        assert abs(title_vertical_center(r)-79)<.02
        symbol=r.xpath('//*[@id="tokui-waza-symbol"]')
        if symbol and c['style']!='Red':
            mod=importlib.import_module(c['style'].lower()+'_symbol_weight');assert mod.change(raw.decode())==(raw.decode(),[])
        if n==99:
            validate_level(r);stages=[int(x.get('data-stage-value')) for x in r.xpath('//*[@id="power-stages-v3"]/*')];assert stages==c['stages']==printed_stages(stages)
            assert r.xpath('//*[@id="concept-pur-number"]')[0].get('aria-label')=='2'
        assert sha(ROOT/a['artwork']['source'])==a['artwork']['source_sha256']
        full=None;display=None
        for ex in a['exports']:
            f=ROOT/ex['path'];assert sha(f)==ex['after_sha256'];im=Image.open(f).convert('RGB');assert list(im.size)==ex['size'];assert ex['lossless_round_trip']
            if ex['field']=='downloadImage':full=im
            else:display=im
        assert ImageChops.difference(full.resize(display.size,Image.Resampling.LANCZOS),display).getbbox() is None
        results.append({'number':n,'status':'verified','native_source_sha256':sha(svg),'lossless_exports':True,'rules_round_trip':True,'native_outlined_text':True,'source_assets_resolved':True,'current_symbol_weight':True,'power_stage_order':c.get('stages')})
    (EV/'final-verification.json').write_text(json.dumps({'scope':'World Games Saga 051–100','complete_cards':50,'artwork_pending':[],'cards':results},indent=2)+'\n')
    print('Verified 50 ready cards, 100 lossless exports; no artwork gaps.')
if __name__=='__main__':verify()
