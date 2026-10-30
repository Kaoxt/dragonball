"""Clip retained brush paint to native contours; never paint a replacement backdrop."""
from pathlib import Path
from lxml import etree as E
from PIL import Image
from scipy.ndimage import gaussian_filter, label
import numpy as np, contourpy, base64, io, argparse, json

S='http://www.w3.org/2000/svg';X='http://www.w3.org/1999/xlink'

def decode(el):
    h=el.get('{'+X+'}href') or el.get('href')
    im=Image.open(io.BytesIO(base64.b64decode(h.split(',',1)[1]))).convert('RGBA');im.load()
    return np.asarray(im)

def simplify(points,tolerance):
    if len(points)<3:return points
    a,b=points[0],points[-1];v=b-a;den=float(v@v)
    if den:
        t=np.clip(((points-a)@v)/den,0,1)
        distance=np.linalg.norm(points-(a+t[:,None]*v),axis=1)
    else:distance=np.linalg.norm(points-a,axis=1)
    i=int(distance.argmax())
    if distance[i]<=tolerance:return np.array([a,b])
    return np.concatenate([simplify(points[:i+1],tolerance)[:-1],simplify(points[i:],tolerance)])

def contours(mask,minimum_area,tolerance,sigma):
    lab,n=label(mask);sizes=np.bincount(lab.ravel());keep=sizes>=minimum_area;keep[0]=False
    mask=keep[lab]
    field=gaussian_filter(np.pad(mask.astype(float),2),sigma)
    gen=contourpy.contour_generator(z=field,name='serial')
    chunks=[]
    for pts in gen.lines(.5):
        pts=pts-2+.5
        if len(pts)<4:continue
        pts=simplify(pts,tolerance)
        if len(pts)<4:continue
        chunks.append('M'+' L'.join(f'{x:.3f},{y:.3f}' for x,y in pts)+' Z')
    return ' '.join(chunks)

def change(source,destination=None):
    source=Path(source);destination=Path(destination or source)
    tree=E.parse(str(source));root=tree.getroot()
    if root.get('data-brush-edge-alpha')=='native-contours-v1':
        if destination!=source:destination.write_bytes(source.read_bytes())
        return {'changed':False}
    get=lambda id:root.xpath('//*[@id=$i]',i=id)[0]
    defs=root.find('{'+S+'}defs')
    def clip(id,d):
        cp=E.SubElement(defs,'{'+S+'}clipPath',id=id,clipPathUnits='userSpaceOnUse')
        E.SubElement(cp,'{'+S+'}path',d=d,**{'clip-rule':'evenodd','fill-rule':'evenodd'})
    paint=decode(get('shared-charcoal-paint'))
    lum=paint[:,:,:3].mean(2);alpha=paint[:,:,3].astype(float)
    h,w=alpha.shape;x=np.arange(w)
    distance=np.minimum(x,w-1-x)
    edge=np.clip((200-distance)/120,0,1)
    support=(alpha>=(1+247*edge)[None,:]) & (lum>=(32*edge)[None,:])
    # Interior is unchanged; only the two paint ends receive a tighter contour.
    support[:,200:w-200]=True
    support[:,:3]=False;support[:,-3:]=False
    d=contours(support,5,.24,.48)
    clip('clean-native-brush-paint-contour',d)
    panel=get('shared-brushed-charcoal-panel')
    panel.set('clip-path','url(#clean-native-brush-paint-contour)')
    panel.set('data-alpha-source','native-paint-contour-no-background')
    pur=root.xpath('//*[@id="pur-brushstroke-horizontal"]')
    if pur:
        raw=decode(get('grunge-counter-texture'))
        d=contours(raw[:,:,3]>=180,80,1.1,.8)
        clip('clean-native-pur-paint-contour',d)
        texture_use=pur[0].xpath('.//*[local-name()="use"]')[0]
        texture_use.set('clip-path','url(#clean-native-pur-paint-contour)')
        pur[0].set('data-alpha-source','native-paint-contour-no-background')
    root.set('data-brush-edge-alpha','native-contours-v1')
    destination.parent.mkdir(parents=True,exist_ok=True)
    tree.write(str(destination),encoding='utf-8',xml_declaration=True)
    return {'changed':True,'shared_native_contour':True,'pur_native_contour':bool(pur),'paint_pixels_modified':False,'background_modified':False}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('destination',nargs='?');a=p.parse_args()
    print(json.dumps(change(a.source,a.destination)))
