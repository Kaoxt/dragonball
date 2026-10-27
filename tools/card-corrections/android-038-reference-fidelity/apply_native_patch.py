"""Restore the reviewed Android Saga #38 illustration in an existing native SVG."""
from pathlib import Path
from lxml import etree as E
from PIL import Image
import base64, hashlib, json, sys

def apply(source, output):
 p=Path(__file__).resolve().parent
 manifest=json.loads((p/'verification.json').read_text())
 tree=E.parse(source)
 root=tree.getroot()
 nodes=root.xpath('//*[@id="card-illustration"]')
 if len(nodes)!=1: raise ValueError('Expected one retained card illustration')
 el=nodes[0]; key='{http://www.w3.org/1999/xlink}href'
 raw=base64.b64decode(el.get(key).split(',',1)[1])
 current=hashlib.sha256(raw).hexdigest()
 art=p/'corrected-artwork.png';data=art.read_bytes()
 expected=manifest['files']['artwork']['sha256']
 if hashlib.sha256(data).hexdigest()!=expected: raise ValueError('Replacement artwork hash mismatch')
 if current==expected:
  Path(output).write_bytes(Path(source).read_bytes());return
 if current!=manifest['original_artwork_sha256']: raise ValueError('Unrecognized source artwork; inspect before replacing')
 if root.get('data-card-number')!='38': raise ValueError('This correction is only for Android Saga #38')
 w,h=Image.open(art).size;x,y,ww,hh=16,145,1027,712.8378378378378
 factor=max(ww/w,hh/h)
 for k,v in {'x':x+(ww-w*factor)/2,'y':y+(hh-h*factor)/2,'width':w*factor,'height':h*factor,'data-source-width':w,'data-source-height':h}.items():el.set(k,str(v))
 el.set(key,'data:image/png;base64,'+base64.b64encode(data).decode())
 el.set('data-source','Faithful modernized artwork from the user-provided original; October 27, 2026')
 tree.write(str(output),encoding='utf-8',xml_declaration=True)

if __name__=='__main__': apply(sys.argv[1],sys.argv[2])
