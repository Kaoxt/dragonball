import {createDeck, snapshot} from './store.js';
import {codeCardIds} from './code-card-ids.js';
const compactIds=new Map(codeCardIds.map((id,index)=>[id,index]));

const prefix='DBO1:';
const invalid=()=>new Error('This is not a supported Dragon Ball deck code.');
async function transform(bytes, stream, limit){
 const reader=new Blob([bytes]).stream().pipeThrough(stream).getReader();
 const chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw invalid();chunks.push(value);}}finally{await reader.cancel();}
 const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
export async function encodeDeck(deck){
 const id=c=>c?(compactIds.get(c.id)??c.id):null, list=cards=>cards.map(c=>[id(c),c.qty||1]);
 const payload=[deck.name,deck.tokui,deck.personalities.map(id),id(deck.mastery),id(deck.sensei),list(deck.cards),list(deck.senseiDeck)];
 let bytes;try{bytes=await transform(new TextEncoder().encode(JSON.stringify(payload)),new CompressionStream('deflate'),1645);}catch{throw Error('This deck is too large for one image code. Reduce the number of cards and try again.');}
 const code=prefix+btoa(String.fromCharCode(...bytes));
 if(code.length>2200)throw Error('This deck is too large for one image code. Reduce the number of cards and try again.');
 return code;
}
export async function decodeDeck(code,catalog){
 if(typeof code!=='string'||!code.startsWith(prefix)||code.length>2200)throw invalid();
 let payload;
 try{const bytes=Uint8Array.from(atob(code.slice(prefix.length)),c=>c.charCodeAt(0));payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await transform(bytes,new DecompressionStream('deflate'),100000)));}catch{throw invalid();}
 if(!Array.isArray(payload)||payload.length!==7)throw invalid();
 const [name,tokui,personalities,mastery,sensei,cards,senseiDeck]=payload;
 if(typeof name!=='string'||name.length>70||typeof tokui!=='string'||!['','Black','Blue','Orange','Red','Saiyan','Namekian','Freestyle'].includes(tokui)||!Array.isArray(personalities)||personalities.length!==5)throw invalid();
 const byId=new Map(catalog.map(c=>[c.id,c]));
 const card=(id,nullable=false)=>{if(id===null&&nullable)return null;if(Number.isSafeInteger(id)&&id>=0)id=codeCardIds[id];if(typeof id!=='string'||id.length>160)throw invalid();const c=byId.get(id);if(!c)throw Error('This deck contains cards that are not in the current collection. No deck was imported.');return snapshot(c);};
 const list=entries=>{if(!Array.isArray(entries)||entries.length>200)throw invalid();const seen=new Set();return entries.map(entry=>{if(!Array.isArray(entry)||entry.length!==2||!Number.isInteger(entry[1])||entry[1]<1||entry[1]>90)throw invalid();const resolved=card(entry[0]);if(seen.has(resolved.id))throw invalid();seen.add(resolved.id);return {...resolved,qty:entry[1]};});};
 const result={...createDeck(),name:name.trim()||'Imported deck',tokui,personalities:personalities.map(id=>card(id,true)),mastery:card(mastery,true),sensei:card(sensei,true),cards:list(cards),senseiDeck:list(senseiDeck)};
 if(result.personalities.some(c=>c&&c.type!=='Main Personality')||(result.mastery&&result.mastery.type!=='Mastery')||(result.sensei&&result.sensei.type!=='Sensei'))throw invalid();
 return result;
}
