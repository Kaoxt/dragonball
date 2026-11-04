import {encodeDeck,decodeDeck} from './deck-code.js';
import {count,deckSize} from './store.js';

const $=id=>document.getElementById(id);
export async function drawDeckImage(deck){
 const [{default:qrcode},code]=await Promise.all([import('./vendor/qrcode.js'),encodeDeck(deck)]);
 const qr=qrcode(0,'M');qr.addData(code,'Byte');qr.make();
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1500;
 const ctx=canvas.getContext('2d');
 const bg=ctx.createLinearGradient(0,0,1080,1500);bg.addColorStop(0,'#431423');bg.addColorStop(.5,'#160e13');bg.addColorStop(1,'#271019');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1500);
 ctx.strokeStyle='#98354d';ctx.lineWidth=3;ctx.strokeRect(25,25,1030,1450);
 ctx.textAlign='center';ctx.fillStyle='#ed9aab';ctx.font='600 24px sans-serif';ctx.fillText('DRAGON BALL ONLINE',540,95);
 ctx.fillStyle='#fff';ctx.font='900 italic 70px sans-serif';ctx.fillText('DECK TRANSMISSION',540,183,960);
 ctx.fillStyle='#ffba55';ctx.font='600 26px sans-serif';ctx.fillText('BUILD • SHARE • BATTLE',540,237);
 ctx.fillStyle='#fff';ctx.font='bold 42px sans-serif';ctx.fillText(deck.name||'Untitled deck',540,326,930);
 ctx.fillStyle='#dbc5cd';ctx.font='25px sans-serif';ctx.fillText(`${deckSize(deck)} cards · ${count(deck.senseiDeck)} Sensei Deck · ${deck.tokui||'No Tokui-Waza'}`,540,379,930);
 // Integer modules and an untouched four-module quiet zone keep the code readable.
 const modules=qr.getModuleCount(),scale=Math.floor(940/(modules+8)),size=(modules+8)*scale,left=Math.floor((1080-size)/2),top=447;
 ctx.fillStyle='#fff';ctx.fillRect(left,top,size,size);ctx.fillStyle='#111';
 for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(qr.isDark(row,col))ctx.fillRect(left+(col+4)*scale,top+(row+4)*scale,scale,scale);
 ctx.fillStyle='#fff';ctx.font='24px sans-serif';ctx.fillText('Import deck image at dragonballocg.com/decks',540,1432);
 return canvas;
}

export function setupDeckImages({catalog,getDeck,onImport}){
 let pending=null,downloadURL=null,generation=0;
 const dialog=$('deck-image-dialog'),status=$('deck-image-status'),preview=$('deck-image-preview');
 function clear(){generation++;pending=null;if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=null;preview.replaceChildren();$('download-deck-image').hidden=true;$('confirm-image-import').hidden=true;}
 function open(title){clear();$('deck-image-title').textContent=title;status.textContent='';if(!dialog.open)dialog.showModal();return generation;}
 dialog.addEventListener('close',clear);$('close-deck-image').onclick=()=>dialog.close();
 $('export-deck-image').onclick=async()=>{
  const token=open('Export deck image');status.textContent='Creating your deck image…';
  try{const deck=structuredClone(getDeck()),canvas=await drawDeckImage(deck);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(token!==generation)return;if(!blob)throw Error('Unable to create image. Please try again.');downloadURL=URL.createObjectURL(blob);canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Import code for ${deck.name}`);preview.append(canvas);const link=$('download-deck-image');link.href=downloadURL;link.download=(deck.name.replace(/[^a-z0-9_-]+/gi,'-')||'deck')+'-dragonball.png';link.hidden=false;status.textContent='This image contains a copy of your deck. Anyone you send it to can import it. Your visibility setting stays unchanged.';}catch(e){if(token===generation)status.textContent=e.message||'Unable to create the image.';}
 };
 $('import-deck-image').onclick=()=>$('deck-image-file').click();
 $('deck-image-file').onchange=async event=>{
  const file=event.target.files[0];event.target.value='';if(!file)return;
  const token=open('Import deck image');status.textContent='Reading deck code…';let image;
  try{
   if(file.size>15*1024*1024||!file.type.startsWith('image/'))throw Error('Choose an image smaller than 15 MB.');
   const {default:jsQR}=await import('./vendor/jsQR.js');image=await createImageBitmap(file);
   if(image.width*image.height>40000000)throw Error('This image is too large. Upload the original deck export or a smaller screenshot.');
   let code;const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
   for(const max of [2000,1200,800]){const ratio=Math.min(1,max/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);code=jsQR(pixels.data,pixels.width,pixels.height);if(code)break;await new Promise(resolve=>setTimeout(resolve,0));if(token!==generation)return;}
   if(!code)throw Error('No deck code found. Upload the original exported image, with the entire code visible.');
   const imported=await decodeDeck(code.data,catalog);if(token!==generation)return;pending=imported;
   const title=document.createElement('h3');title.textContent=imported.name;const detail=document.createElement('p');detail.textContent=`${deckSize(imported)} cards · ${count(imported.senseiDeck)} Sensei Deck · ${imported.tokui||'No Tokui-Waza'}`;preview.append(title,detail);
   status.textContent='Save this as a new private deck? Your existing decks will be kept. Review deck checks after importing.';$('confirm-image-import').hidden=false;
  }catch(e){if(token===generation)status.textContent=e.message||'Unable to read this image. Try a PNG or JPEG deck export.';}finally{image?.close();}
 };
 $('confirm-image-import').onclick=()=>{if(!pending)return;try{onImport(pending);dialog.close();}catch(e){status.textContent=e.message;}};
}
