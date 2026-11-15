from prepare import *
from render import root,el,im
cid='saiyan-085-yamcha'
for scale in [1,2]:
 original=CACHE/f'{cid}-art-{scale}x.png';r=root();d=el(r,'defs');cp=el(d,'clipPath',id='stray-fragments-only');el(cp,'rect',x=808,y=290,width=48,height=160)
 im(r,original);g=el(r,'g',clip_path='url(#stray-fragments-only)');im(g,original,transform='translate(-60 0)')
 p=CACHE/f'{cid}-cleaned-art-{scale}x.svg';E.ElementTree(r).write(str(p));render(p,CACHE/f'{cid}-cleaned-art-{scale}x.png',1060*scale)
print('Removed pre-existing fingertip fragments from otherwise empty blue background; valid hand untouched.')
