"""Render retained native V3 SVGs; requires Inkscape and Pillow.

Usage: python3 render_cards.py [card-id ...]
The PNGs are intermediate QA outputs. The release WebPs live in public/assets/cards.
"""
from pathlib import Path
from PIL import Image
import subprocess,sys,os
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
selected=set(sys.argv[1:])
for svg in sorted((HERE/'saiyan-001-050').glob('*.svg')):
 if selected and svg.stem not in selected:continue
 output=HERE/'renders';output.mkdir(exist_ok=True)
 png=output/(svg.stem+'.png');tmp=output/(svg.stem+'.partial.png')
 subprocess.run(['inkscape',str(svg),'--export-width=2120','--export-filename='+str(tmp)],check=True)
 image=Image.open(tmp).convert('RGB');assert image.size==(2120,2968)
 with tmp.open('wb') as f:image.save(f,'PNG');f.flush();os.fsync(f.fileno())
 with Image.open(tmp) as check:check.verify()
 tmp.replace(png)
 for directory,size in [('downloads',(2120,2968)),('',(1060,1484))]:
  target=ROOT/'public/assets/cards'/directory/(svg.stem+'.webp');target.parent.mkdir(parents=True,exist_ok=True)
  frame=image if size==image.size else image.resize(size,Image.Resampling.LANCZOS)
  frame.save(target,'WEBP',lossless=True,method=4)
  assert Image.open(target).convert('RGB').tobytes()==frame.tobytes()
 print(svg.stem)
