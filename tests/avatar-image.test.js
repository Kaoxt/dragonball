import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/account/avatar-image.js',import.meta.url),'utf8');
const limit=500*1024;
function fixture({sizes=[40000],decodeError=false,contextMissing=false,width=2048,height=1024}={}){
 const draws=[],encodes=[],fills=[];let closed=0,decoded=0;
 const image={width,height,close(){closed++;}};
 const canvas={getContext(){return contextMissing?null:{fillRect(...args){fills.push({color:this.fillStyle,args});},drawImage(...args){draws.push(args.slice(1));}};},toBlob(callback,type,quality){encodes.push({type,quality});callback(new Blob([new Uint8Array(sizes.shift()??40000)],{type}));}};
 const scope={window:{},document:{createElement:()=>canvas},createImageBitmap:async()=>{decoded++;if(decodeError)throw Error('bad image');return image;}};
 vm.runInNewContext(source,scope);
 return {...scope.window.DragonAvatar,draws,encodes,fills,get closed(){return closed;},get decoded(){return decoded;}};
}
const file=(size=limit+1,type='image/png',name='avatar.png')=>new File([new Uint8Array(size)],name,{type});

test('small images and animated GIFs keep their original bytes',async()=>{
 const f=fixture();
 for(const type of ['image/png','image/jpeg','image/webp','image/gif']){
  const original=file(limit,type);
  assert.equal(await f.prepare(original),original);
 }
 assert.equal(f.decoded,0);
});
test('large images are resized proportionally and encoded below the server limit',async()=>{
 const f=fixture(),result=await f.prepare(file(3*1024*1024));
 assert.equal(result.type,'image/png');assert.equal(result.size,40000);
 assert.deepEqual(f.draws,[[0,0,2048,1024,0,0,1024,512]]);
 assert.deepEqual(f.encodes,[{type:'image/png',quality:undefined}]);
 assert.equal(f.closed,1);
});
test('compression retries preserve resolution before shrinking the image',async()=>{
 const f=fixture({sizes:[limit+1,limit+1,120000]}),result=await f.prepare(file());
 assert.equal(result.size,120000);
 assert.deepEqual(f.draws,[[0,0,2048,1024,0,0,1024,512]]);
 assert.deepEqual(f.encodes.map(e=>e.quality),[undefined,.96,.92]);
 assert.equal(f.closed,1);
});
test('invalid, empty, very large and oversized animated files get clear errors',async()=>{
 const f=fixture();
 await assert.rejects(f.prepare(file(0)),/Choose an image/);
 await assert.rejects(f.prepare(file(100,'image/svg+xml')),/PNG, JPG, WebP, or GIF/);
 await assert.rejects(f.prepare(file(20*1024*1024+1)),/20 MB/);
 await assert.rejects(f.prepare(file(limit+1,'image/gif')),/Animated GIFs/);
 assert.equal(f.decoded,0);
});
test('missing mobile MIME types fall back to a supported file extension',async()=>{
 const f=fixture(),original=file(40,'','AVATAR.JPG'),result=await f.prepare(original);
 assert.equal(result.type,'image/jpeg');
 assert.deepEqual(await result.arrayBuffer(),await original.arrayBuffer());
 await assert.rejects(f.prepare(file(40,'','avatar.svg')),/PNG, JPG, WebP, or GIF/);
});
test('unreadable images and unavailable canvas report an actionable failure',async()=>{
 await assert.rejects(fixture({decodeError:true}).prepare(file()),/could not be opened/);
 const f=fixture({contextMissing:true});
 await assert.rejects(f.prepare(file()),/could not resize/);assert.equal(f.closed,1);
});
test('failed compression releases the decoded image and never returns an oversized upload',async()=>{
 const f=fixture({sizes:Array(12).fill(limit+1)});
 await assert.rejects(f.prepare(file()),/could not be made small enough/);assert.equal(f.closed,1);
});

test('crop output uses the chosen original pixels at up to 1024 square',async()=>{
 const f=fixture({width:3000,height:2000});
 await f.prepare(file(100),{x:2000,y:1000,zoom:1});
 assert.deepEqual(f.draws,[[1000,0,2000,2000,0,0,1024,1024]]);
});
test('free positioning supports padding while keeping the image reachable',()=>{
 const f=fixture();
 for(const [width,height] of [[4000,1000],[1000,4000],[1000,1000]]){
  for(const zoom of [.25,1,1.5,3])for(const x of [-100,width/2,width+100])for(const y of [-100,height/2,height+100]){
   const crop=f.constrainCrop(width,height,{x,y,zoom}),area=f.cropRect(width,height,crop);
   assert.ok(crop.x>=0&&crop.x<=width&&crop.y>=0&&crop.y<=height);
   assert.equal(area.side,Math.min(width,height)/zoom);
  }
 }
 assert.deepEqual(JSON.parse(JSON.stringify(f.cropRect(2000,1000,{x:NaN,y:Infinity,zoom:NaN}))),{x:500,y:0,side:1000});
});
test('Fit whole image places every source corner inside the circular border',()=>{
 const f=fixture();
 for(const [width,height] of [[4000,1000],[1000,4000],[1000,1000],[10000,100]]){
  const crop=f.constrainCrop(width,height,f.fitCrop(width,height)),area=f.cropRect(width,height,crop);
  assert.ok(crop.zoom<1);
  for(const x of [0,width])for(const y of [0,height])assert.ok(Math.hypot(x-crop.x,y-crop.y)<area.side/2);
 }
});
test('zoomed and small-source crops never upscale invented detail',async()=>{
 const f=fixture({width:600,height:400});
 await f.prepare(file(100),{x:300,y:200,zoom:2});
 assert.deepEqual(f.draws,[[200,100,200,200,0,0,200,200]]);
});
test('an editor-owned decoded image is reused and remains open for retry',async()=>{
 const f=fixture();let closed=0;
 await f.prepare(file(100),{x:1000,y:500,zoom:1},{width:2000,height:1000,close(){closed++;}});
 assert.equal(f.decoded,0);assert.equal(closed,0);
 assert.deepEqual(f.draws,[[500,0,1000,1000,0,0,1000,1000]]);
});
test('dimension fallback remains bounded when high-resolution encodings exceed the limit',async()=>{
 const f=fixture({sizes:[...Array(4).fill(limit+1),40000]});
 await f.prepare(file(),{zoom:1});
 assert.deepEqual(f.draws,[[512,0,1024,1024,0,0,1024,1024],[512,0,1024,1024,0,0,768,768]]);
});

const cropSource=readFileSync(new URL('../public/account/avatar-crop.js',import.meta.url),'utf8');
function editorFixture(){
 const f=fixture(),pending=[],preview=[];
 const element=()=>({disabled:false,hidden:true,value:'',textContent:'',focus(){},setAttribute(){}});
 const input={...element(),files:[]},out=element(),submit=element(),zoom=element(),output=element(),reset=element(),cancel=element(),fit=element(),help=element();
 const canvas={...element(),width:640,height:640,getContext:()=>({clearRect(){},fillRect(){},drawImage(...args){preview.push(args.slice(1));}}),getBoundingClientRect:()=>({width:320}),setPointerCapture(){}};
 const selectors={'canvas':canvas,'[data-crop-zoom]':zoom,'output':output,'[data-crop-reset]':reset,'[data-crop-fit]':fit,'[data-crop-cancel]':cancel,'[data-crop-quality]':help};
 const panel={...element(),querySelector:s=>selectors[s]};
 const form={querySelector:s=>({'#avatar-file':input,'.account-status':out,'[type=submit]':submit,'.avatar-crop-editor':panel}[s])};
 const scope={window:{DragonAvatar:{...f,decode:()=>new Promise(resolve=>pending.push(resolve))}}};
 vm.runInNewContext(cropSource,scope);
 const editor=scope.window.DragonAvatarCrop.mount(form);
 const select=()=>{input.files=[file(100)];return input.onchange();};
 return {editor,input,out,submit,zoom,reset,cancel,fit,canvas,panel,preview,pending,select,f};
}
test('editor pans and zooms the same source rectangle used by the upload',async()=>{
 const e=editorFixture(),selection=e.select();
 e.pending.shift()({width:2400,height:1600,close(){}});await selection;
 e.zoom.value='2';e.zoom.oninput();
 e.canvas.onpointerdown({pointerType:'touch',pointerId:1,clientX:100,clientY:100,preventDefault(){}});
 e.canvas.onpointermove({pointerId:1,clientX:180,clientY:100});
 await e.editor.prepare();
 assert.deepEqual(e.f.draws,[[600,400,800,800,0,0,800,800]]);
 assert.deepEqual(e.preview.at(-1),[600,400,800,800,0,0,640,640]);
 e.editor.setBusy(true);assert.equal(e.submit.disabled,true);assert.equal(e.input.disabled,true);
 e.editor.setBusy(false);assert.equal(e.submit.disabled,false);assert.equal(e.editor.ready,true);
});
test('cancel releases the original and prevents uploading an old selection',async()=>{
 const e=editorFixture(),selection=e.select();let closed=0;
 e.pending.shift()({width:1200,height:1600,close(){closed++;}});await selection;
 e.cancel.onclick();assert.equal(closed,1);assert.equal(e.panel.hidden,true);assert.equal(e.editor.ready,false);assert.equal(e.submit.disabled,true);
 await assert.rejects(e.editor.prepare(),/Choose an image/);
});
test('late decodes cannot replace a newer selection or a disposed editor',async()=>{
 const e=editorFixture(),first=e.select(),second=e.select();let closed=0;
 e.pending[1]({width:800,height:1600,close(){closed++;}});await second;
 e.pending[0]({width:2400,height:1600,close(){closed++;}});await first;
 assert.equal(closed,1);assert.deepEqual(e.preview.at(-1),[0,400,800,800,0,0,640,640]);
 const third=e.select();e.editor.dispose();e.pending[2]({width:900,height:900,close(){closed++;}});await third;
 assert.equal(closed,3);assert.equal(e.editor.ready,false);
});

test('square images move freely on both axes without zooming in',async()=>{
 const e=editorFixture(),selection=e.select();
 e.pending.shift()({width:1000,height:1000,close(){}});await selection;
 e.canvas.onpointerdown({pointerType:'touch',pointerId:1,clientX:100,clientY:100,preventDefault(){}});
 e.canvas.onpointermove({pointerId:1,clientX:140,clientY:160});
 await e.editor.prepare();
 assert.deepEqual(e.f.draws,[[0,0,875,812.5,125,187.5,875,812.5]]);
 assert.deepEqual(e.preview.at(-1),[0,0,875,812.5,80,120,560,520]);
 assert.deepEqual(e.f.fills,[{color:'#121316',args:[0,0,1000,1000]}]);
});
test('fit and center preserve zoom and save all image edges with matching padding',async()=>{
 const e=editorFixture(),selection=e.select();
 e.pending.shift()({width:1200,height:1600,close(){}});await selection;
 e.fit.onclick();const zoom=e.zoom.value;
 assert.ok(Number(zoom)<1);
 e.canvas.onkeydown({key:'ArrowRight',preventDefault(){}});
 e.reset.onclick();assert.equal(e.zoom.value,zoom);
 await e.editor.prepare();
 const draw=e.f.draws[0];
 assert.deepEqual(draw.slice(0,4),[0,0,1200,1600]);
 for(let i=4;i<8;i++)assert.ok(Math.abs(e.preview.at(-1)[i]/640-draw[i]/1024)<1e-8);
 e.editor.setBusy(true);assert.equal(e.fit.disabled,true);
});
