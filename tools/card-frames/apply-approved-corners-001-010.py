"""Apply the approved lower-corner repair to immutable source images #1–10. Requires Pillow and NumPy."""
from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
import numpy as np,json,hashlib,subprocess,io
R=Path(__file__).resolve().parents[2]
SOURCE_COMMIT='f28f02145b9e1fde9fff21bdfb6a3820121948db'
manifest_path=R/'docs/saiyan-approved-frame-001-010.json'
manifest=json.loads(manifest_path.read_text());meta=manifest['updated']
catalog_path=R/'public/cards/catalog.js';catalog=catalog_path.read_text()
W,H=1060,1484;S=4
# Shared symmetric vector corner contours; one silver rail and one continuous color join.
# Leave the center footer, number, art, and text exactly as approved.
for n,c in enumerate(meta,1):
 src=Image.open(io.BytesIO(subprocess.check_output(['git','show',SOURCE_COMMIT+':'+c['path']],cwd=R))).convert('RGB')
 out=src.copy()
 for side in [0,1]:
  # Sample the neighboring unprinted panel for a clean, low-contrast background.
  work=src.copy() if not side else src.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
  a=np.array(work);patch=a.copy()
  # Clear old doubled rails and the feathered screenshot seam; retain the outer card silhouette.
  for y in range(1234,1406):
   for x in range(26,119):
    if y<1320: col=np.array([8,13,16])
    elif y<1387: col=np.array([10,16,19])
    else: col=np.array([8,13,16])
    patch[y,x]=col
  clean=Image.fromarray(patch)
  mask=Image.new('L',(W,H));d=ImageDraw.Draw(mask);d.rectangle((27,1236,116,1401),fill=255)
  mask=mask.filter(ImageFilter.GaussianBlur(3))
  work=Image.composite(clean,work,mask)
  # Rebuild tab and orange/red inner corner, plus an unbroken outer silver line.
  ov=Image.new('RGBA',(W*S,H*S));d=ImageDraw.Draw(ov)
  def poly(points,fill): d.polygon([(int(x*S),int(y*S)) for x,y in points],fill=fill)
  def line(points,fill,width): d.line([(int(x*S),int(y*S)) for x,y in points],fill=fill,width=int(width*S),joint='curve')
  color='#ff7300' if n<=5 else '#ff0010'
  # Cover the original colored join and its blurred fringe before drawing the unified shape.
  poly([(34,1187),(76,1221),(76,1293),(105,1319),(105,1327),(89,1327),(52,1295),(52,1251),(34,1234)],'#080d10')
  poly([(38,1191),(72,1225),(72,1243),(65,1250),(65,1287),(101,1321),(92,1321),(58,1290),(58,1248),(38,1229)],color)
  # Shared thin silver rail follows the exact original bottom-footer height.
  line([(42,1251),(52,1261),(52,1345),(87,1380),(119,1380)],'#05090b',12)
  line([(42,1251),(52,1261),(52,1345),(87,1380),(119,1380)],'#76838a',5.5)
  # Restore the short top rail at the color-to-silver endpoint without a gap.
  line([(100,1321),(119,1321)],'#76838a',4.5)
  ov=ov.resize((W,H),Image.Resampling.LANCZOS)
  work=Image.alpha_composite(work.convert('RGBA'),ov).convert('RGB')
  # Local edits only: mirror the exact same left-corner geometry for the right side.
  corner=work.crop((20,1186,120,1407))
  # Blend the terminal 20px into the existing rail so its shade and texture meet seamlessly.
  original=(src if not side else src.transpose(Image.Transpose.FLIP_LEFT_RIGHT)).crop((20,1186,120,1407))
  blend=Image.new('L',corner.size,255);bd=ImageDraw.Draw(blend)
  for x in range(80,100):bd.line([(x,0),(x,220)],fill=round(255*(99-x)/19))
  corner=Image.composite(corner,original,blend)
  if side:out.paste(corner.transpose(Image.Transpose.FLIP_LEFT_RIGHT),(W-120,1186))
  else:out.paste(corner,(20,1186))
 path=R/c['path'];buf=io.BytesIO();out.save(buf,'WEBP',lossless=True,method=4);path.write_bytes(buf.getvalue())
 data=path.read_bytes();sha=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
 old=c['sha'];catalog=catalog.replace('?v='+old[:10],'?v='+sha[:10]);c['sha']=sha
 # Every pixel outside the two repaired corners is unchanged.
 a=np.array(src);b=np.array(out);mask=np.ones((H,W),bool);mask[1186:1407,20:120]=False;mask[1186:1407,W-120:W-20]=False
 assert np.array_equal(a[mask],b[mask])

print('Applied approved corner cleanup to all 10; other pixels unchanged.')

manifest['corner_cleanup']='Approved single-card test: shared corner geometry, one gray rail and continuous colored join; unchanged outside both corner regions.'
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n');catalog_path.write_text(catalog)
