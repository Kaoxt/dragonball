from pathlib import Path
from PIL import Image
import io, subprocess
r=Path(__file__).resolve().parent.parent
n="babidi-030-saiyan-prepared-smash"
p=r/"production/masters"/(n+".svg")
b=subprocess.run(["inkscape",str(p),"--export-type=png","--export-filename=-","--export-width=2120"],capture_output=True,check=True).stdout
im=Image.open(io.BytesIO(b)).convert("RGB")
im.save(r/"png"/(n+".png"))
im.save(r/"downloads"/(n+".webp"),"WEBP",lossless=True,method=4)
im.resize((1060,1484),Image.Resampling.LANCZOS).save(r/"display"/(n+".webp"),"WEBP",lossless=True,method=4)
