"""Finish Trunks P6–P10 with the shared V3 composer and isolated art repairs.

Usage: python3 tools/card-templates/v3/build_trunks_p6_p10.py --retained SOURCE
SOURCE is the extracted Trunks-Saga-Final-Editable-Sources archive.
"""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from functools import partial
import argparse, json
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, distance_transform_edt, binary_fill_holes
import build_trunks_156_200_p1_p5 as batch
import build_batch_101_150 as shared

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
OUT=P/'trunks-p6-p10'; EVID=ROOT/'tools/card-corrections/v3-trunks-p6-p10'
WORK=ROOT.parent/'trunks-p6-p10-work'
batch.OUT=shared.OUT=OUT; batch.EVID=shared.EVID=EVID; batch.WORK=WORK
retained_artwork=batch.artwork

def make_mask(n, source):
    """Select only reviewed sky and costume/sweat regions; no card UI."""
    a=np.asarray(Image.open(source).convert('RGB')).astype(float)
    if n==208:
        # Both entire outfits and the cloudy backdrop were incorrect. Use the
        # coherent generated illustration for that combined correction while
        # retaining the exact original face and hand pixels in protected cores.
        # A polygon spanning garments alone left hard aura seams and is rejected.
        keep=Image.new('L',(a.shape[1],a.shape[0]));pen=ImageDraw.Draw(keep)
        pen.ellipse((1080,558,1238,667),fill=255)
        pen.ellipse((711,328,765,388),fill=255)
        pen.ellipse((959,578,1022,643),fill=255)
        pen.polygon([(1016,594),(1016,558),(1025,542),(1036,544),(1031,584),(1027,603)],fill=255)
        protected=np.asarray(keep)>0
        alpha=1-np.minimum(distance_transform_edt(protected),4)/4
        dest=EVID/'artwork-corrections'/f'{n}-mask.png'
        Image.fromarray(np.uint8(np.round(alpha*255))).save(dest)
        return {'file':str(dest.relative_to(EVID)),'source_dimensions':[a.shape[1],a.shape[0]],'selected_pixels':int(np.count_nonzero(alpha)),'scope':'combined isolated illustration correction for both costumes and sky; retained exact face and hand cores; no card UI changes','protected_original_regions':['Goku face','Trunks sword grip','Goku raised hand and index finger']}
    r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    candidate=((b>g*1.015)&(g>r*1.28)&(b>100))|((np.minimum(np.minimum(r,g),b)>180)&(b>=g)&(g>=r))
    if n==209: candidate=(b>=g)&(g>=r)&(b>100)
    labels,count=label(candidate)
    chosen=np.unique(np.concatenate([labels[0],labels[:,0],labels[:,-1]]));chosen=chosen[chosen!=0]
    sky=np.isin(labels,chosen)
    if n==210:
        sky[:90]=True;sky[:500,0]=True;sky[:580,-1]=True
    if n==206:
        sky[:535,0]=True;sky[:587,-1]=True
    if n==209:
        sky[470:,-1]=True
    sky=binary_fill_holes(sky)
    if n==210:
        # Distant lavender terrain is foreground, even where its blue shading
        # touches the sky selection. Follow the retained horizon, columnwise.
        terrain=(r>g*.85)&(r<175)&(b-g>20)&(g>95)
        for x in range(610,1150):
            candidates=np.flatnonzero(terrain[565:650,x])
            if len(candidates): sky[565+candidates[0]:,x]=False
    # Preserve the dark outline and a soft one-pixel original antialias edge.
    alpha=np.minimum(distance_transform_edt(sky),2)/2
    shapes=Image.new('L',(a.shape[1],a.shape[0]));d=ImageDraw.Draw(shapes)
    if n==209:
        # The generated teardrop alone, with a small blending margin.
        d.ellipse((501,214,548,305),fill=255)
    local=np.asarray(shapes)>0
    alpha=np.maximum(alpha,np.minimum(distance_transform_edt(local),3)/3)
    dest=EVID/'artwork-corrections'/f'{n}-mask.png'
    Image.fromarray(np.uint8(np.round(alpha*255))).save(dest)
    return {'file':str(dest.relative_to(EVID)),'source_dimensions':[a.shape[1],a.shape[0]],'selected_pixels':int(np.count_nonzero(alpha)), 'scope':'sky only' if n in [206,210] else 'background and tiny temple sweat mark'}

def artwork(root,c,retained):
    report=retained_artwork(root,c,retained)
    n=c['number']
    if n==207:return report
    art=shared.get(root,'card-illustration');mapped=shared.get(root,'retained-source-illustration')
    mask_info=json.loads((EVID/'artwork-corrections/masks.json').read_text())[str(n)]
    w,h=mask_info['source_dimensions']
    group=shared.elem('g',mapped,id=f'correction-pixel-space-{n}',transform=f"translate({art.get('x')} {art.get('y')}) scale({float(art.get('width'))/w} {float(art.get('height'))/h})")
    mask=shared.elem('mask',root.find('{'+batch.S+'}defs'),id=f'original-fidelity-mask-{n}',maskUnits='userSpaceOnUse',x=0,y=0,width=w,height=h)
    batch.raster(mask,EVID/mask_info['file'],f'correction-mask-image-{n}',[0,0,w,h])
    overlay=shared.elem('g',group,id=f'original-fidelity-correction-{n}',mask=f'url(#original-fidelity-mask-{n})')
    batch.raster(overlay,EVID/'artwork-corrections'/f'{n}-generated.png',f'corrected-artwork-{n}',[0,0,w,h])
    report['localized_correction']={**mask_info,'generated_source':str((EVID/'artwork-corrections'/f'{n}-generated.png').relative_to(ROOT)),'native_mask':f'original-fidelity-mask-{n}','retained_source_beneath':True}
    return report

batch.artwork=artwork

def compose(c,retained):
    c=deepcopy(c);c['retained_master']=str(retained/c['retained_master'])
    return batch.compose(c,retained)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--retained',type=Path,required=True);parser.add_argument('numbers',type=int,nargs='*');args=parser.parse_args()
    cards=json.loads((EVID/'cards.json').read_text());retained=args.retained.resolve()
    masks={str(n):make_mask(n,retained/'source/artwork'/f'trunks-{n}.png') for n in [206,208,209,210]}
    (EVID/'artwork-corrections/masks.json').write_text(json.dumps(masks,indent=2)+'\n')
    OUT.mkdir(exist_ok=True)
    with ProcessPoolExecutor(max_workers=3)as pool:
        list(pool.map(partial(compose,retained=retained),[c for c in cards if not args.numbers or c['number']in args.numbers]))
    rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('*.json'))]
    (EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
