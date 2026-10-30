"""Inset native footer groups and match the supplied four-star rarity reference."""
from pathlib import Path
from lxml import etree as E
import argparse, subprocess, json

GAP = 96.0
FOUR_STAR_OFFSETS = [(-.40,-.22),(.20,-.22),(-.14,.22),(.46,.22)]

def bounds(path):
    out=subprocess.check_output(['inkscape',str(path),'--query-all'],text=True,stderr=subprocess.DEVNULL)
    return {a[0]:list(map(float,a[1:])) for line in out.splitlines() if len(a:=line.split(','))==5}

def shift(el,dx):
    if not dx:return
    el.set('transform',f'translate({dx} 0) '+el.get('transform',''))

def change(source,destination=None):
    source=Path(source);destination=Path(destination or source)
    tree=E.parse(str(source));root=tree.getroot();b=bounds(source)
    def get(id):return root.xpath('//*[@id=$id]',id=id)[0]
    disclaimer=b['footer-disclaimer'];logo=b['saga-emblem'];ball=b['footer-rarity']
    def snap(delta):return 0 if abs(delta)<=.55 else round(delta)
    logo_dx=snap(disclaimer[0]-GAP-logo[0]-logo[2])
    right_dx=snap(disclaimer[0]+disclaimer[2]+GAP-ball[0])
    shift(get('saga-emblem'),logo_dx)
    shift(get('footer-rarity'),right_dx)
    shift(get('card-number'),right_dx)
    rarity=get('footer-rarity')
    stars=rarity.xpath('./*[local-name()="polygon" and starts-with(@id,"rarity-star-")]')
    stars_changed=False
    if len(stars)==4 and rarity.get('data-four-star-layout')!='goku-179-reference-offset-rows':
        circle=rarity.xpath('./*[local-name()="circle"]')[0]
        cx,cy,r=map(float,[circle.get('cx'),circle.get('cy'),circle.get('r')])
        for star,(ox,oy) in zip(stars,FOUR_STAR_OFFSETS):
            points=[tuple(map(float,p.split(','))) for p in star.get('points').split()]
            oldcx=sum(x for x,y in points)/len(points);oldcy=sum(y for x,y in points)/len(points)
            dx=cx+ox*r-oldcx;dy=cy+oy*r-oldcy
            star.set('transform',f'translate({dx:.6f} {dy:.6f})')
        rarity.set('data-four-star-layout','goku-179-reference-offset-rows')
        stars_changed=True
    root.set('data-footer-inner-gap','96')
    if logo_dx or right_dx:
        # These centers describe global visible geometry, not the local star frame.
        rarity.set('data-visible-center',f'{ball[0]+ball[2]/2+right_dx:.6f} {ball[1]+ball[3]/2:.6f}')
        n=b['card-number'];get('card-number').set('data-visible-center',f'{n[0]+n[2]/2+right_dx:.6f} {n[1]+n[3]/2:.6f}')
    destination.parent.mkdir(parents=True,exist_ok=True)
    tree.write(str(destination),encoding='utf-8',xml_declaration=True)
    return {'logo_dx':logo_dx,'ball_and_number_dx':right_dx,'four_star_layout_changed':stars_changed}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('destination',nargs='?');a=p.parse_args()
    print(json.dumps(change(a.source,a.destination)))
