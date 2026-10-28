"""Apply the approved clothing artwork to an existing Trunks Saga #195 native master."""
from pathlib import Path
from lxml import etree as ET
import argparse,base64,re
PATCH_ID='trunks-195-approved-costume-patch'
def apply(source, output):
    text=Path(source).read_text();root=ET.fromstring(text.encode())
    if root.get('viewBox')!='0 0 1060 1484' or root.get('data-card-number')!='195' or root.get('data-card-set')!='Trunks Saga':
        raise ValueError('Use only the current 1060 x 1484 Trunks Saga #195 native master.')
    text=re.sub(r'<image(?: xmlns="http://www.w3.org/2000/svg")? id="'+PATCH_ID+r'"[^>]*?/>(?:\n)?','',text)
    data=base64.b64encode(Path(__file__).with_name('costume-patch.png').read_bytes()).decode()
    element=f'<image xmlns="http://www.w3.org/2000/svg" id="{PATCH_ID}" x="253" y="463" width="464" height="383" preserveAspectRatio="none" href="data:image/png;base64,{data}"/>\n'
    closing='</'+(root.prefix+':' if root.prefix else '')+'svg>'
    head,tail=text.rsplit(closing,1)
    Path(output).write_text(head+element+closing+tail)
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source');parser.add_argument('output');args=parser.parse_args();apply(args.source,args.output)
