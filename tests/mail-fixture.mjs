import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {database} from '../src/community/database.js';
import {authSchema} from '../src/community/auth.js';
import {hash} from '../src/community/session.js';
import {mailSchema, mailRequest} from '../src/community/mail.js';

export function fixture() {
  const sql = new DatabaseSync(':memory:');
  const db = database({sql:{exec:(query,...args)=>({toArray:()=>sql.prepare(query).all(...args)})},transactionSync:fn=>{sql.exec('SAVEPOINT tx');try{const result=fn();sql.exec('RELEASE tx');return result;}catch(error){sql.exec('ROLLBACK TO tx;RELEASE tx');throw error;}}});
  authSchema(db);
  for (const name of ['owner','member','other']) {
    db.prepare('INSERT INTO auth_accounts(id,username,password_hash,recovery_hash,role,created_at) VALUES(?,?,?,?,?,?)').bind(name,name,'unused','unused',name==='owner'?'admin':'member','today').run();
    db.prepare('INSERT INTO auth_sessions(token_hash,user_id,password_version,expires_at,created_at) VALUES(?,?,1,?,?)').bind(hash(({owner:'a',member:'b',other:'c'})[name].repeat(64)),name,Date.now()+3600000,Date.now()).run();
  }
  db.prepare("INSERT INTO auth_settings(key,value) VALUES('owner_claimed','owner')").run();
  mailSchema(db);
  const owner = db.prepare("SELECT * FROM mailboxes WHERE address='support@dragonballocg.com'").first();
  const member = {id:randomUUID(),address:'member@dragonballocg.com',owner_id:'member',created_at:0};
  db.prepare('INSERT INTO mailboxes(id,address,owner_id,created_at) VALUES(?,?,?,?)').bind(member.id,member.address,member.owner_id,member.created_at).run();
  const objects=new Map();
  const bucket={
    async put(key,value,options={}){const bytes=Buffer.from(typeof value==='string'?value:new Uint8Array(value));objects.set(key,{key,size:bytes.length,bytes,uploaded:new Date(),...options});},
    async head(key){return objects.get(key)||null;},
    async get(key){const object=objects.get(key);return object?{...object,body:new Blob([object.bytes]).stream(),arrayBuffer:async()=>object.bytes.buffer.slice(object.bytes.byteOffset,object.bytes.byteOffset+object.bytes.byteLength)}:null;},
    async list({prefix,limit,cursor}){const keys=[...objects.keys()].filter(key=>key.startsWith(prefix)).sort();const start=Number(cursor||0);return {objects:keys.slice(start,start+limit).map(key=>objects.get(key)),truncated:start+limit<keys.length,cursor:String(start+limit)};},
  };
  const sends=[];
  const env={DB:db,MAIL_STORAGE:bucket,MAIL_SEND_ENABLED:'true',MAIL_OUTBOUND:{async send(message){sends.push(message);return {messageId:'<sent@example.test>'};}}};
  async function call(path='',{method='GET',data,role='owner',origin='https://dragon.test',raw}={}) {
    return mailRequest(new Request('https://dragon.test'+(path.startsWith('/api/')?path:'/api/mail'+path),{method,headers:{Origin:origin,...(role?{Cookie:`dragon_session=${({owner:'a',member:'b',other:'c'})[role].repeat(64)}`} : {}),...(data!==undefined||raw?{'Content-Type':'application/json'}:{})},...(data!==undefined?{body:JSON.stringify(data)}:raw?{body:raw}:{})}),env);
  }
  let n=0;
  async function incoming({to=owner.address,headerTo=to,sender='person@example.com',subject='Question about my deck',body='Can you help with this card?',extra='',metadata={}}={}) {
    const key=`incoming/${String(++n).padStart(4,'0')}.eml`;
    await bucket.put(key,`From: A player <${sender}>\r\nTo: ${headerTo}\r\nSubject: ${subject}\r\nMessage-ID: <message-${n}@example.com>\r\n${extra}\r\n${body}`,{customMetadata:{recipient:to,sender,receivedAt:new Date().toISOString(),...metadata}});
    return key;
  }
  const sync=(box=owner,role='owner')=>call(`/${box.id}/sync`,{method:'POST',data:{},role});
  const list=async(box=owner,role='owner',folder='inbox')=>(await(await call(`/${box.id}/messages?folder=${folder}`,{role})).json()).messages;
  return {db,env,owner,member,objects,bucket,call,incoming,sync,list,sends};
}
