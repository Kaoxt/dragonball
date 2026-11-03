// Run with Sharp available: node tools/banner-corrections/arena-art-cleanup-20261103/export.cjs
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const assets = path.join(root, 'public/assets');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

const variants = [
  {name:'desktop', stem:'trio', width:2179, height:330, sizes:[960,1276,1536,2179], protected:[930,1505], feather:20},
  {name:'mobile', stem:'duo-centered', width:1920, height:384, sizes:[480,960,1536,1920], protected:[607,1340], feather:20},
];

(async()=>{
  const audit=[];
  for(const v of variants){
    const master=path.join(__dirname,`${v.name}-clean-art.png`);
    for(const width of v.sizes){
      const beforeName=`arena-banner-flipside-refined-${v.stem}-${width}.webp`;
      const afterName=`arena-banner-art-clean-${v.stem}-${width}.webp`;
      const beforeBytes=await fs.readFile(path.join(assets,beforeName));
      const before=await sharp(beforeBytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
      const height=before.info.height;
      const cleaned=await sharp(master).resize(width,height,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer();
      const data=Buffer.alloc(cleaned.length);
      const scale=width/v.width;
      const [left,right]=v.protected.map(n=>n*scale);
      const feather=v.feather*scale;
      let changed=0, protectedChanged=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const distance=x<left?left-x:x>right?x-right:0;
        const alpha=Math.max(0,Math.min(1,distance/feather));
        let different=false;
        for(let c=0;c<3;c++){
          const i=(y*width+x)*3+c;
          data[i]=Math.round(before.data[i]*(1-alpha)+cleaned[i]*alpha);
          if(data[i]!==before.data[i])different=true;
        }
        if(different){changed++;if(x>=left&&x<=right)protectedChanged++;}
      }
      const out=await sharp(data,{raw:{width,height,channels:3}}).webp({lossless:true,effort:6}).toBuffer();
      await fs.writeFile(path.join(assets,afterName),out);
      const decoded=await sharp(out).removeAlpha().raw().toBuffer();
      if(!decoded.equals(data)||protectedChanged)throw new Error(`Pixel preservation failed: ${afterName}`);
      audit.push({before:beforeName,after:afterName,width,height,bytes:out.length,beforeSha256:sha(beforeBytes),afterSha256:sha(out),protectedColumns:[Math.ceil(left),Math.floor(right)],protectedChangedPixels:protectedChanged,changedPixels:changed,losslessRoundtrip:true});
    }
  }
  await fs.writeFile(path.join(__dirname,'pixel-audit.json'),JSON.stringify(audit,null,2)+'\n');
  console.log(JSON.stringify(audit.map(({after,width,height,bytes,protectedChangedPixels})=>({after,width,height,bytes,protectedChangedPixels})),null,2));
})();
