import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/account/avatar-image.js',import.meta.url),'utf8');
const limit=500*1024;
function fixture({sizes=[40000],decodeError=false,contextMissing=false}={}){
 const draws=[],encodes=[];let closed=0,decoded=0;
 const image={width:2048,height:1024,close(){closed++;}};
 const canvas={getContext(){return contextMissing?null:{drawImage(...args){draws.push(args.slice(1));}};},toBlob(callback,type,quality){encodes.push({type,quality});callback(new Blob([new Uint8Array(sizes.shift()??40000)],{type}));}};
 const scope={window:{},document:{createElement:()=>canvas},createImageBitmap:async()=>{decoded++;if(decodeError)throw Error('bad image');return image;}};
 vm.runInNewContext(source,scope);
 return {...scope.window.DragonAvatar,draws,encodes,get closed(){return closed;},get decoded(){return decoded;}};
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
 assert.equal(result.type,'image/webp');assert.equal(result.size,40000);
 assert.deepEqual(f.draws,[[0,0,512,256]]);
 assert.deepEqual(f.encodes,[{type:'image/webp',quality:.9}]);
 assert.equal(f.closed,1);
});
test('oversized encodings retry at smaller dimensions',async()=>{
 const f=fixture({sizes:[limit+1,limit+1,120000]}),result=await f.prepare(file());
 assert.equal(result.size,120000);
 assert.deepEqual(f.draws,[[0,0,512,256],[0,0,384,192],[0,0,256,128]]);
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
 const f=fixture({sizes:[limit+1,limit+1,limit+1]});
 await assert.rejects(f.prepare(file()),/could not be made small enough/);assert.equal(f.closed,1);
});
