"""Apply the reviewed background-only repair to its matching retained native card."""
import argparse, base64, json
from pathlib import Path
from lxml import etree as E

HERE=Path(__file__).resolve().parent
SVG='http://www.w3.org/2000/svg'
XLINK='http://www.w3.org/1999/xlink'

def apply(card_id,source,output):
    entry=next(r for r in json.loads((HERE/'manifest.json').read_text()) if r['id']==card_id)
    tree=E.parse(str(source));root=tree.getroot()
    if root.get('viewBox')!='0 0 1060 1484':raise ValueError('Wrong retained canvas')
    if root.find(f'{{{SVG}}}title').text!=entry['name']:raise ValueError('Wrong card title')
    art=root.xpath('//*[@id="full-bleed-artwork"]')
    if len(art)!=1 or art[0].getparent()!=root:raise ValueError('Expected retained top-level artwork')
    for n in root.xpath('//*[@id="hi-tech-background-portrait-removal"]'):n.getparent().remove(n)
    p=entry['native_patch']
    node=E.Element(f'{{{SVG}}}image',{'id':'hi-tech-background-portrait-removal',**{k:str(p[k]) for k in ['x','y','width','height']},'preserveAspectRatio':'none','data-purpose':'Background-only repair; foreground and native card elements retained',f'{{{XLINK}}}href':'data:image/png;base64,'+base64.b64encode((HERE/p['file']).read_bytes()).decode()})
    root.insert(root.index(art[0])+1,node)
    tree.write(str(output),encoding='utf-8',xml_declaration=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('card_id');p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args();apply(a.card_id,a.source,a.output)
