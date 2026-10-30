"""Render a native V3 SVG without changing its layout; verify PNG/WebP equality."""
from pathlib import Path
import argparse,os,subprocess,tempfile,json
from PIL import Image,ImageChops

def render(source,destination):
    source=Path(source).resolve();destination=Path(destination).resolve();destination.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as temp:
        temp=Path(temp);png=temp/'render.png'
        subprocess.run(['inkscape',str(source),'--export-filename='+str(png),'--export-width=2120','--export-height=2968','--export-overwrite'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        im=Image.open(png).convert('RGB');im.load()
        staged=destination.with_suffix('.ready');im.save(staged,format='PNG')
        check=Image.open(staged);check.load();assert check.size==(2120,2968)
        os.replace(staged,destination)
        webp=destination.with_suffix('.webp');im.save(webp,format='WEBP',lossless=True,method=6)
        decoded=Image.open(webp).convert('RGB');decoded.load();assert ImageChops.difference(im,decoded).getbbox() is None
        im.save(destination.with_suffix('.tif'))
    return {'png':str(destination),'webp':str(webp),'size':[2120,2968],'decoded_pixels_identical':True}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('destination');a=p.parse_args();print(json.dumps(render(a.source,a.destination),indent=2))
