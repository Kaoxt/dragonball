(() => {
 'use strict';
 // All coordinates are in original-image pixels; preview and upload share one crop.
 function mount(form){
  const fileInput=form.querySelector('#avatar-file'),out=form.querySelector('.account-status');
  const submit=form.querySelector('[type=submit]'),panel=form.querySelector('.avatar-crop-editor');
  const canvas=panel.querySelector('canvas'),context=canvas.getContext('2d');
  const zoom=panel.querySelector('[data-crop-zoom]'),zoomValue=panel.querySelector('output');
  const reset=panel.querySelector('[data-crop-reset]'),cancel=panel.querySelector('[data-crop-cancel]');
  const remove=form.querySelector('#remove-avatar');
  const help=panel.querySelector('[data-crop-quality]');
  const api=window.DragonAvatar;
  let image=null,file=null,crop=null,sequence=0,drag=null,busy=false,disposed=false;
  submit.disabled=true;
  function release(){image?.close?.();image=null;file=null;crop=null;drag=null;}
  function clear(){sequence++;release();panel.hidden=true;fileInput.value='';submit.disabled=true;out.textContent='';}
  function render(){
   crop=api.constrainCrop(image.width,image.height,crop);
   const area=api.cropRect(image.width,image.height,crop);
   context.clearRect(0,0,canvas.width,canvas.height);
   context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
   context.drawImage(image,area.x,area.y,area.side,area.side,0,0,canvas.width,canvas.height);
   zoom.value=String(crop.zoom);zoomValue.value=Math.round(crop.zoom*100)+'%';
   help.textContent=area.side<512?'This crop has limited detail. Zoom out or choose a larger original for a sharper avatar.':'Only the area inside the circle will appear as your avatar.';
  }
  fileInput.onchange=async()=>{
   const selection=++sequence,candidate=fileInput.files[0];
   release();panel.hidden=true;submit.disabled=true;out.textContent='';
   if(!candidate)return;
   try{
    const type=api.validate(candidate);
    if(type==='image/gif'){
     file=candidate;submit.disabled=false;out.textContent='Ready to upload. Animated GIFs keep their animation and use a centered crop.';return;
    }
    if(!context)throw Error('This browser could not open the crop preview. Please try another browser.');
    out.textContent='Opening image…';
    const decoded=await api.decode(candidate);
    if(selection!==sequence||disposed){decoded.close?.();return;}
    image=decoded;file=candidate;crop=api.constrainCrop(image.width,image.height);
    panel.hidden=false;render();submit.disabled=false;out.textContent='';
   }catch(error){if(selection===sequence&&!disposed){out.textContent=error.message;}}
  };
  zoom.oninput=()=>{if(!image||busy)return;crop.zoom=Number(zoom.value);render();};
  reset.onclick=()=>{if(!image||busy)return;crop=api.constrainCrop(image.width,image.height);render();};
  cancel.onclick=()=>{if(busy)return;clear();fileInput.focus();};
  canvas.onpointerdown=event=>{
   if(!image||busy||(event.pointerType==='mouse'&&event.button!==0)||drag)return;
   event.preventDefault();canvas.focus({preventScroll:true});
   drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove=event=>{
   if(!drag||drag.id!==event.pointerId||!image||busy)return;
   const pixels=api.cropRect(image.width,image.height,crop).side/canvas.getBoundingClientRect().width;
   crop.x-=(event.clientX-drag.x)*pixels;crop.y-=(event.clientY-drag.y)*pixels;
   drag.x=event.clientX;drag.y=event.clientY;render();
  };
  const endDrag=event=>{if(drag?.id===event.pointerId)drag=null;};
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=endDrag;
  canvas.onkeydown=event=>{
   if(!image||busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
   event.preventDefault();const step=api.cropRect(image.width,image.height,crop).side*(event.shiftKey?.05:.01);
   if(event.key==='ArrowLeft')crop.x+=step;
   if(event.key==='ArrowRight')crop.x-=step;
   if(event.key==='ArrowUp')crop.y+=step;
   if(event.key==='ArrowDown')crop.y-=step;
   render();
  };
  return {
   get ready(){return !!file;},
   async prepare(){if(!file)throw Error('Choose an image to upload.');return api.prepare(file,crop,image);},
   setBusy(value){busy=value;drag=null;if(remove)remove.disabled=value;fileInput.disabled=value;submit.disabled=value||!file;zoom.disabled=reset.disabled=cancel.disabled=value;canvas.setAttribute('aria-disabled',String(value));},
   dispose(){disposed=true;sequence++;release();fileInput.onchange=null;}
  };
 }
 window.DragonAvatarCrop={mount};
})();
