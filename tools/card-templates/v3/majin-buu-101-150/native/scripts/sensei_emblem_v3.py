"""Native Sensei medallion, contour-traced from the user's Goku Sensei reference."""
from pathlib import Path
from lxml import etree as E

S = 'http://www.w3.org/2000/svg'
# Reference photo's printed-card rectangle maps directly onto the native card.
SX, SY = 1060/981, 1484/1402
TX, TY = -183*SX, -48*SY
# Visible paths preserve the source tilt, proportions and right-edge crop.
OUTER = ('M1175 841 C1107 788 1041 776 984 792 '
         'C866 814 782 911 775 1032 C767 1158 863 1264 991 1284 '
         'C1054 1295 1120 1281 1175 1254 L1175 841Z')
RIM = ('M1175 842 C1106 794 1044 783 985 800 '
       'C872 822 790 916 785 1033 C778 1153 872 1255 993 1273 '
       'C1056 1283 1119 1269 1175 1243 L1175 1214 '
       'C1118 1247 1059 1260 998 1248 C887 1230 803 1137 805 1034 '
       'C807 924 883 839 992 818 C1055 806 1119 824 1175 861Z')
PLATE = ('M1175 870 C1115 826 1055 803 997 816 '
         'C894 835 819 918 816 1024 C810 1128 895 1208 995 1226 '
         'C1055 1237 1121 1222 1175 1189Z')
HOLES = [
    'M978 822 Q1010 815 1045 821 L1041 835Z',
    'M1067 825 Q1100 832 1130 855 L1062 837Z',
    'M923 846 L945 834 L1038 851 L1033 869Z',
    'M1057 861 L1178 886 L1178 906 L1054 878Z',
    'M861 862 Q894 869 946 876 Q899 891 840 888Z',
    'M830 911 Q877 922 924 913 L914 940Z',
    'M962 901 L999 888 L1083 909 L1113 936 L1108 985 L947 951Z',
    'M1130 916 L1178 926 L1178 953Z',
    'M1144 962 L1178 982 L1178 1002 L1143 994Z',
    'M824 957 L1005 998 L997 1032 L820 991Z',
    'M1040 1007 L1178 1040 L1178 1078 L1030 1045Z',
    'M828 1045 L989 1080 L968 1168 Q901 1134 868 1077 L848 1091Z',
    'M1023 1089 L1178 1127 L1178 1154 L1151 1171 L1138 1145 '
    'Q1084 1178 1008 1178Z',
]


def elem(tag, parent=None, **attrs):
    node=E.Element('{'+S+'}'+tag)
    for key,value in attrs.items():node.set(key.replace('_','-'),str(value))
    if parent is not None:parent.append(node)
    return node


def install(root):
    for old in list(root.xpath('//*[@id]')):
        ident=old.get('id','')
        if ident=='sensei-family-emblem' or ident.startswith('sensei-emblem-'):
            if old.getparent() is not None:old.getparent().remove(old)
    defs=root.find('{'+S+'}defs')
    mask=elem('mask',defs,id='sensei-emblem-gold-mask',maskUnits='userSpaceOnUse',
              x=750,y=770,width=440,height=530,style='mask-type:luminance')
    elem('path',mask,d=RIM,fill='white');elem('path',mask,d=PLATE,fill='white')
    for d in HOLES:elem('path',mask,d=d,fill='black')
    clip=elem('clipPath',defs,id='sensei-emblem-plate-clip');elem('path',clip,d=PLATE)
    group=elem('g',id='sensei-family-emblem',
               transform=f'translate({TX:.12f} {TY:.12f}) scale({SX:.12f} {SY:.12f})',
               aria_label='Sensei family symbol',data_revision='2026-11-06-reference-gold-texture',
               data_reference='Goku-Sensei-Emblem-User-Reference.jpg',
               data_treatment='Native reference contours with actual reference photograph gold and bronze texture masked into the gold surfaces')
    elem('path',group,d=OUTER,fill='#09090a',stroke='#0a090b',stroke_width=5,transform='translate(0 6)')
    elem('path',group,d=OUTER,fill='#100c0b')
    # Retain sharp native gold contours. The source supplies its actual coloration,
    # streaks, mottling and wear without approximating them using procedural noise.
    elem('path',group,d=RIM,fill='#a67536');elem('path',group,d=PLATE,fill='#c99d3e')
    elem('image',group,x=0,y=0,width=1346,height=1536,preserveAspectRatio='none',
         mask='url(#sensei-emblem-gold-mask)',
         **{'{http://www.w3.org/1999/xlink}href':'../reference/Goku-Sensei-Emblem-User-Reference.jpg'})
    glyph=elem('g',group,clip_path='url(#sensei-emblem-plate-clip)')
    for d in HOLES:elem('path',glyph,d=d,fill='#090909')
    marker=root.xpath('//*[@id="sensei-deck-capacity"]')[0]
    root.insert(list(root).index(marker)+1,group)
    return group


if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path)
    a=p.parse_args();t=E.parse(str(a.source));install(t.getroot())
    t.write(str(a.source),encoding='utf-8',xml_declaration=True)
