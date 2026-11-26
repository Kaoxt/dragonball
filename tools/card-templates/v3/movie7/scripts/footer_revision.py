from lxml import etree as E
S='http://www.w3.org/2000/svg';X='http://www.w3.org/1999/xlink'
def change(root):
    defs=root.find('{'+S+'}defs')
    prior=root.xpath('//*[@id="shared-footer-material"]')[0]
    # Broaden the paint body 10% while retaining the original distressed tips.
    # One continuous source material is mapped through three adjacent vector
    # viewports, with no raster backdrop, rectangular fill or extra brush copy.
    footer=E.Element('{'+S+'}g',id='shared-footer-material',transform='translate(0 1353) scale(1 1.13)',attrib={'data-body-width-factor':'1.10','data-source':'shared-brushed-charcoal-panel'})
    for tag,source_x,source_w,target_x,target_w in [('left',0,180,0,145),('body',180,700,145,770),('right',880,180,915,145)]:
        clip=E.SubElement(defs,'{'+S+'}clipPath',id='footer-'+tag+'-clip',clipPathUnits='userSpaceOnUse')
        E.SubElement(clip,'{'+S+'}rect',x=str(target_x),y='0',width=str(target_w),height='100')
        part=E.SubElement(footer,'{'+S+'}g',attrib={'clip-path':'url(#footer-'+tag+'-clip)'})
        sx=target_w/source_w;tx=target_x-source_x*sx
        E.SubElement(part,'{'+S+'}use',attrib={'{'+X+'}href':'#shared-brushed-charcoal-panel','transform':f'translate({tx:.12f} 0) scale({sx:.12f} 1)'})
    root.replace(prior,footer)
    return root
