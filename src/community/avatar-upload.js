import { readSession, assertSameOrigin } from './session.js';
import { IssueError } from './issues.js';
export const AVATAR_LIMIT=500*1024;
function imageType(bytes){
 const b=Buffer.from(bytes);
 if(b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 if(b.length>=10&&['GIF87a','GIF89a'].includes(b.toString('ascii',0,6)))return 'image/gif';
 if(b.length>=16&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return 'image/webp';
 throw new IssueError('Choose a PNG, JPG, WebP, or GIF image.',400);
}
export async function avatarRequest(request,env){
 const db=env.DB;
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 try{
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/avatars/')){
   if(request.method!=='GET'&&request.method!=='HEAD')throw new IssueError('Method not allowed.',405);
   const id=path.slice('/api/avatars/'.length);
   if(!/^[a-f0-9-]{36}$/.test(id))throw new IssueError('Avatar not found.',404);
   const row=db.prepare('SELECT image FROM account_avatars WHERE id=? AND image!=?').bind(id,'').first();
   if(!row)throw new IssueError('Avatar not found.',404);
   const bytes=Buffer.from(row.image,'base64');
   return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':imageType(bytes),'Content-Length':String(bytes.length),'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }
  if(request.method!=='POST')throw new IssueError('Method not allowed.',405);
  if(!assertSameOrigin(request))throw new IssueError('Invalid request origin.',403);
  const user=await readSession(request,env);
  if(!user)throw new IssueError('Sign in to continue.',401);
  const member=db.prepare('SELECT banned FROM forum_members WHERE user_id=?').bind(user.id).first();
  if(member?.banned&&user.role!=='admin')throw new IssueError('Profile changes are disabled for this account.',403);
  if(path==='/api/auth/avatar-remove'){
   db.prepare('DELETE FROM account_avatars WHERE user_id=?').bind(user.id).run();
   return reply({ok:true,avatarUrl:''});
  }
  const now=Date.now(),key='avatar:'+user.id,window=Math.floor(now/600000)*600;
  const limited=db.prepare('SELECT count,window_start FROM auth_limits WHERE key=?').bind(key).first();
  if(limited?.window_start===window&&limited.count>=10)throw new IssueError('Too many uploads. Please try again later.',429);
  db.prepare('INSERT INTO auth_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END,window_start=excluded.window_start').bind(key,window).run();
  if(Number(request.headers.get('Content-Length'))>AVATAR_LIMIT)throw new IssueError('Avatar images must be 500 KB or smaller.',413);
  const reader=request.body?.getReader();if(!reader)throw new IssueError('Choose an image to upload.',400);
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>AVATAR_LIMIT){await reader.cancel();throw new IssueError('Avatar images must be 500 KB or smaller.',413);}chunks.push(value);}
  const bytes=Buffer.concat(chunks);imageType(bytes);
  const id=crypto.randomUUID();
  db.prepare("INSERT INTO account_avatars(user_id,id,url,image,updated_at) VALUES(?,?,'',?,?) ON CONFLICT(user_id) DO UPDATE SET id=excluded.id,url='',image=excluded.image,updated_at=excluded.updated_at").bind(user.id,id,bytes.toString('base64'),new Date(now).toISOString()).run();
  return reply({ok:true,avatarUrl:'/api/avatars/'+id});
 }catch(e){if(e instanceof IssueError)return reply({error:e.message},e.status||400);console.error('Avatar request failed');return reply({error:'Unable to update avatar. Please try again.'},500);}
}
