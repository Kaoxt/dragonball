(() => {
 'use strict';
 const uploadLimit=500*1024,sourceLimit=20*1024*1024;
 const types=new Set(['image/png','image/jpeg','image/webp','image/gif']);
 const extensions={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
 function validate(file){
  if(!file?.size)throw Error('Choose an image to upload.');
  const type=file.type||extensions[file.name?.split('.').pop()?.toLowerCase()];
  if(!types.has(type))throw Error('Choose a PNG, JPG, WebP, or GIF image.');
  if(file.size>sourceLimit)throw Error('Choose an image smaller than 20 MB.');
  if(type==='image/gif'&&file.size>uploadLimit)throw Error('Animated GIFs must be 500 KB or smaller. Use a PNG, JPG, or WebP for automatic resizing.');
  return type;
 }
 async function decode(file){
  try{
   if(typeof createImageBitmap==='function')return await createImageBitmap(file);
   const url=URL.createObjectURL(file),image=new Image();
   try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});}
   catch(error){URL.revokeObjectURL(url);throw error;}
   image.close=()=>URL.revokeObjectURL(url);
   return image;
  }catch{throw Error('This image could not be opened. Try saving it as a PNG or JPG and select it again.');}
 }
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 function minimumZoom(width,height){return Math.min(.25,Math.min(width,height)/Math.hypot(width,height)*.8);}
 function fitCrop(width,height){
  // The rectangle's diagonal fits inside the circular avatar, with a little margin.
  return {x:width/2,y:height/2,zoom:Math.min(width,height)/Math.hypot(width,height)*.94};
 }
 function constrainCrop(width,height,crop={}){
  const zoom=clamp(Number.isFinite(crop.zoom)?crop.zoom:1,minimumZoom(width,height),3);
  // Allow padding on every edge so square and portrait images can move at 100% too.
  return {x:clamp(Number.isFinite(crop.x)?crop.x:width/2,0,width),y:clamp(Number.isFinite(crop.y)?crop.y:height/2,0,height),zoom};
 }
 function cropRect(width,height,crop){
  const position=constrainCrop(width,height,crop),side=Math.min(width,height)/position.zoom;
  return {x:position.x-side/2,y:position.y-side/2,side};
 }
 function drawCrop(context,image,crop,width,height){
  const area=cropRect(image.width,image.height,crop);
  const x=Math.max(0,area.x),y=Math.max(0,area.y);
  const sourceWidth=Math.max(0,Math.min(image.width,area.x+area.side)-x);
  const sourceHeight=Math.max(0,Math.min(image.height,area.y+area.side)-y);
  context.fillStyle='#121316';context.fillRect(0,0,width,height);
  if(sourceWidth&&sourceHeight)context.drawImage(image,x,y,sourceWidth,sourceHeight,(x-area.x)*width/area.side,(y-area.y)*height/area.side,sourceWidth*width/area.side,sourceHeight*height/area.side);
 }
 async function prepare(file,crop=null,decodedImage=null){
  const type=validate(file);
  // Keep animated GIFs intact. Static uploads use the editor's square crop.
  if(type==='image/gif'||(!crop&&file.size<=uploadLimit))return file.type?file:file.slice(0,file.size,type);
  const image=decodedImage||await decode(file);
  try{
   const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
   if(!context)throw Error('This browser could not resize the image. Please try another browser.');
   const region=crop?cropRect(image.width,image.height,crop):{x:0,y:0,width:image.width,height:image.height};
   const width=region.side??region.width,height=region.side??region.height;
   let previousWidth=0;
   for(const edge of [1024,768,512]){
    const scale=Math.min(1,edge/Math.max(width,height));
    const outputWidth=Math.max(1,Math.floor(width*scale));
    if(outputWidth===previousWidth)continue;
    previousWidth=outputWidth;canvas.width=outputWidth;canvas.height=Math.max(1,Math.floor(height*scale));
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    if(crop)drawCrop(context,image,crop,canvas.width,canvas.height);
    else context.drawImage(image,region.x,region.y,width,height,0,0,canvas.width,canvas.height);
    // Prefer lossless line art, then reduce compression quality before resolution.
    for(const [format,quality] of [['image/png',undefined],['image/webp',.96],['image/webp',.92],['image/webp',.86]]){
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,format,quality));
     if(blob?.size&&blob.size<=uploadLimit)return blob;
    }
   }
   throw Error('This image could not be made small enough. Please try a smaller PNG or JPG.');
  }finally{if(!decodedImage)image.close?.();}
 }
 window.DragonAvatar={validate,decode,minimumZoom,fitCrop,constrainCrop,cropRect,drawCrop,prepare};
})();
