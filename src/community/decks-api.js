import {readSession,assertSameOrigin} from './session.js';
import {IssueError} from './issues.js';
export async function decksRequest(request,env){
 const db=env.DB,reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 try{
  const user=await readSession(request,env);if(!user)throw new IssueError('Log in to sync your decks.',401);
  db.prepare("CREATE TABLE IF NOT EXISTS account_decks(user_id TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)").run();
  if(request.method==='GET'){const row=db.prepare('SELECT data,version FROM account_decks WHERE user_id=?').bind(user.id).first();return reply({userId:user.id,version:row?.version||0,data:row?JSON.parse(row.data):{decks:[],active:null}});}
  if(request.method!=='POST')throw new IssueError('Method not allowed.',405);
  if(!assertSameOrigin(request))throw new IssueError('Invalid request origin.',403);
  if(!request.headers.get('Content-Type')?.includes('application/json'))throw new IssueError('Send JSON.',415);
  const reader=request.body?.getReader();if(!reader)throw new IssueError('Missing deck data.');
  let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024*1024){await reader.cancel();throw new IssueError('Deck collection exceeds 1 MB.',413);}chunks.push(value);}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new IssueError('Invalid deck data.');}
  if(body.userId!==user.id)throw new IssueError('Your account changed. Reload before editing decks.',409);
  if(!Number.isSafeInteger(body.version)||body.version<0)throw new IssueError('Invalid deck version.');
  const data=body.data;
  if(!data||!Array.isArray(data.decks)||data.decks.length>100)throw new IssueError('Save up to 100 decks.');
  const ids=new Set();
  for(const d of data.decks){
   if(!d||typeof d.id!=='string'||d.id.length>80||ids.has(d.id)||typeof d.name!=='string'||d.name.length>70||typeof d.tokui!=='string'||d.tokui.length>30||!Array.isArray(d.personalities)||d.personalities.length!==5||!Array.isArray(d.cards)||!Array.isArray(d.senseiDeck)||d.cards.length>200||d.senseiDeck.length>200)throw new IssueError('Invalid deck.');
   ids.add(d.id);
   for(const c of [...d.cards,...d.senseiDeck,...d.personalities,d.mastery,d.sensei].filter(Boolean)){
    if(typeof c.id!=='string'||c.id.length>160||typeof c.name!=='string'||c.name.length>200||c.qty!==undefined&&(!Number.isInteger(c.qty)||c.qty<1||c.qty>90))throw new IssueError('Invalid card.');
   }
  }
  if(data.active!==null&&!ids.has(data.active))throw new IssueError('Invalid active deck.');
  const version=db.transaction(()=>{
   const row=db.prepare('SELECT version FROM account_decks WHERE user_id=?').bind(user.id).first();
   if((row?.version||0)!==body.version)throw new IssueError('Decks changed on another device. Export your changes, then reload.',409);
   const next=body.version+1;
   db.prepare('INSERT INTO account_decks(user_id,data,version,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,version=excluded.version,updated_at=excluded.updated_at').bind(user.id,JSON.stringify(data),next,new Date().toISOString()).run();
   return next;
  });
  return reply({version});
 }catch(e){return reply({error:e instanceof IssueError?e.message:'Unable to sync decks. Please try again.'},e instanceof IssueError?e.status:500);}
}
