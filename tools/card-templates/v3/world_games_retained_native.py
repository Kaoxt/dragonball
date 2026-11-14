"""Re-export a reviewed native composition without regenerating or reframing it."""
from pathlib import Path
import hashlib, json, subprocess
from lxml import etree as E
from PIL import Image, ImageChops

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def rebuild(card, root, work):
    root, work = Path(root), Path(work)
    source = root / card['retained_native_source_path']
    evidence = root / 'tools/card-corrections/v3-world-games-151-200'
    row_path = evidence / 'per-card' / f"{card['number']:03}.json"
    row = json.loads(row_path.read_text())
    native = E.parse(str(source)).getroot()
    assert native.get('data-card-id') == card['id']
    assert not native.xpath('//*[local-name()="text"]')
    def node(ident):
        return native.xpath('//*[@id=$ident]', ident=ident)[0]
    assert node('card-title').get('aria-label') == card['name']
    assert node('card-number').get('aria-label') == str(card['number'])
    if 'level' in card:
        assert node('v3-level-number').get('aria-label') == str(card['level'])
        assert node('concept-pur-number').get('aria-label') == str(card['pur'])
        assert [node(f'power-stage-{i}').get('data-stage-value') for i in range(len(card['stages']))] == list(map(str,card['stages']))
    lines = sorted(native.xpath('//*[starts-with(@id,"rules-line-")]'), key=lambda e:int(e.get('id').split('-')[-1]))
    assert ' '.join(e.get('aria-label') for e in lines) == card['modern_rules']
    # This path reproduces a reviewed source, rather than silently approving a manual edit.
    assert sha(source) == row['native_source_sha256'], 'Native source changed; review and refresh its audit first.'
    assert sha(root / row['artwork']['source']) == row['artwork']['source_sha256']
    for asset in row['assets']:
        assert sha(root / asset['path']) == asset['sha256']
    work.mkdir(parents=True,exist_ok=True)
    png=work/(card['id']+'.png')
    subprocess.run(['inkscape',str(source),'--export-type=png','--export-filename='+str(png),'--export-width=2120'],check=True,capture_output=True)
    rendered=Image.open(png).convert('RGB')
    assert rendered.size==(2120,2968)
    for export in row['exports']:
        target=root/export['path'];target.parent.mkdir(parents=True,exist_ok=True)
        size=tuple(export['size'])
        image=rendered if size==rendered.size else rendered.resize(size,Image.Resampling.LANCZOS)
        if export.get('render_mode')=='native-size' and size!=rendered.size:
            display=work/(card['id']+'-display.png')
            subprocess.run(['inkscape',str(source),'--export-type=png','--export-filename='+str(display),'--export-width='+str(size[0])],check=True,capture_output=True)
            image=Image.open(display).convert('RGB')
        if not target.exists():
            image.save(target,'WEBP',lossless=True,method=4)
        assert ImageChops.difference(image,Image.open(target).convert('RGB')).getbbox() is None
        assert sha(target)==export['after_sha256'], 'Renderer output differs; review before changing release hashes.'
    print(f"Rebuilt retained native card {card['number']}: {card['name']}",flush=True)
    return row
