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
 async function prepare(file){
  const type=validate(file);
  if(file.size<=uploadLimit)return file.type?file:file.slice(0,file.size,type);
  let image;
  try{image=await createImageBitmap(file);}catch{throw Error('This image could not be opened. Try saving it as a PNG or JPG and select it again.');}
  try{
   const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
   if(!context)throw Error('This browser could not resize the image. Please choose an image under 500 KB.');
   for(const edge of [512,384,256]){
    const scale=Math.min(1,edge/Math.max(image.width,image.height));
    canvas.width=Math.max(1,Math.round(image.width*scale));
    canvas.height=Math.max(1,Math.round(image.height*scale));
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.9));
    if(blob?.size&&blob.size<=uploadLimit)return blob;
   }
   throw Error('This image could not be made small enough. Please try a smaller PNG or JPG.');
  }finally{image.close();}
 }
 window.DragonAvatar={validate,prepare};
})();
