import { turnstileConfig, verifyRegistration } from './turnstile.js';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { hash, readSession, sessionToken, assertSameOrigin } from './session.js';
import { IssueError, textField } from './issues.js';
import { forumInput, ensureMember, selfMember } from './forum.js';
import { OWNER_SETUP_HASH } from './owner-key.js';
const duration=30*86400000;
const secret=()=>randomBytes(32).toString('hex');
const safeEqual=(a,b)=>timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
export function passwordHash(password,salt=randomBytes(16).toString('hex')){
 const key=scryptSync(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');return `scrypt:32768:8:3:${salt}:${key}`;
}
export function validPassword(password){if(typeof password!=='string'||password.length<12||password.length>128)throw new IssueError('Use a password with 12–128 characters.');return password;}
export function verifyPassword(password,encoded){
 if(typeof password!=='string'||password.length>128)return false;
 const parts=String(encoded).split(':');if(parts.length!==6)return false;
 return safeEqual(passwordHash(password,parts[4]),encoded);
}
const dummy=passwordHash('not-a-real-user-password','00000000000000000000000000000000');
export function authSchema(db){
 db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS auth_accounts(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE COLLATE NOCASE,password_hash TEXT NOT NULL,recovery_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'member',password_version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS auth_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES auth_accounts(id),password_version INTEGER NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL)`),
  db.prepare('CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id,created_at)'),
  db.prepare('CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at)'),
  db.prepare(`CREATE TABLE IF NOT EXISTS auth_limits(key TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL)`),
  db.prepare('CREATE INDEX IF NOT EXISTS auth_limits_age ON auth_limits(window_start)'),
  db.prepare(`CREATE TABLE IF NOT EXISTS auth_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS account_preferences(user_id TEXT PRIMARY KEY,display_name TEXT NOT NULL,updated_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS account_avatars(user_id TEXT PRIMARY KEY,id TEXT,url TEXT NOT NULL DEFAULT '',image TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL)`)
 ]);
}
function rate(db,key,max,seconds){
 const start=Math.floor(Date.now()/1000/seconds)*seconds;
 const result=db.prepare(`INSERT INTO auth_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,count=CASE WHEN auth_limits.window_start=excluded.window_start THEN auth_limits.count+1 ELSE 1 END WHERE auth_limits.window_start!=excluded.window_start OR auth_limits.count<?`).bind(key,start,max).run();
 if(!result.meta.changes)throw new IssueError('Too many attempts. Please try again later.',429);
}
function cookie(request,value,maxAge=duration/1000){return `dragon_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
function issueSession(db,request,account){
 const token=secret(),now=Date.now();
 db.batch([db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(now),db.prepare('INSERT INTO auth_sessions(token_hash,user_id,password_version,expires_at,created_at) VALUES(?,?,?,?,?)').bind(hash(token),account.id,account.password_version,now+duration,now),db.prepare('DELETE FROM auth_sessions WHERE user_id=? AND token_hash NOT IN (SELECT token_hash FROM auth_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 10)').bind(account.id,account.id)]);
 return cookie(request,token);
}
export async function authRequest(request,env){
 const db=env.DB,action=new URL(request.url).pathname.split('/').at(-1);
 const reply=(data,status=200,setCookie)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(setCookie?{'Set-Cookie':setCookie}:{})}});
 try{
  if(request.method==='GET'){
   if(action==='config'){const {required,ready,siteKey}=turnstileConfig(env);return reply({turnstile:{required,ready,siteKey:ready?siteKey:''}});}
   if(action!=='session')throw new IssueError('Not found.',404);
   const user=await readSession(request,env),member=await selfMember(db,user);
   return reply({user:user?{id:user.id,username:user.username,displayName:user.display_name||user.username,avatarUrl:user.avatar_url||'',isAdmin:user.role==='admin',memberId:member?.id||null,about:member?.about||''}:null});
  }
  if(request.method!=='POST')throw new IssueError('Method not allowed.',405);
  if(!assertSameOrigin(request))throw new IssueError('Invalid request origin.',403);
  const body=await forumInput(request),ip=hash(request.headers.get('CF-Connecting-IP')||'local');
  db.prepare('DELETE FROM auth_limits WHERE window_start<?').bind(Math.floor(Date.now()/1000)-172800).run();
  rate(db,'all:'+ip,50,60);
  if(['register','login','recover'].includes(action)){
   const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
   if(!/^[a-z0-9_]{3,24}$/.test(username))throw new IssueError('Username must be 3–24 letters, numbers, or underscores.');
   rate(db,action+':ip:'+ip,action==='register'?5:20,action==='register'?3600:600);
   if(action!=='register')rate(db,action+':user:'+username,10,600);
   if(action==='register')await verifyRegistration(request,env,body['cf-turnstile-response']);
   const existing=db.prepare('SELECT * FROM auth_accounts WHERE username=?').bind(username).first();
   if(action==='register'){
    validPassword(body.password);
    if(['admin','administrator','moderator','system','support'].includes(username))throw new IssueError('Please choose another username.');
    if(existing)throw new IssueError('That username is already in use.',409);
    const recoveryCode=secret(),now=new Date().toISOString();
    const account={id:crypto.randomUUID(),password_version:1};
    const encoded=passwordHash(body.password);
    db.transaction(()=>{
     db.prepare('INSERT INTO auth_accounts(id,username,password_hash,recovery_hash,created_at) VALUES(?,?,?,?,?)').bind(account.id,username,encoded,hash(recoveryCode),now).run();
     db.prepare('INSERT INTO account_preferences(user_id,display_name,updated_at) VALUES(?,?,?)').bind(account.id,username,now).run();
     db.prepare('INSERT INTO forum_members(id,user_id,author,avatar_color,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),account.id,username,'#842a40',now).run();
    });
    return reply({ok:true,recoveryCode},201,issueSession(db,request,account));
   }
   if(action==='login'){
    const valid=verifyPassword(body.password,existing?.password_hash||dummy);
    if(!existing||!valid)throw new IssueError('Incorrect username or password.',401);
    return reply({ok:true},200,issueSession(db,request,existing));
   }
   if(!existing||typeof body.recoveryCode!=='string'||!safeEqual(hash(body.recoveryCode.trim()),existing.recovery_hash))throw new IssueError('Incorrect username or recovery code.',401);
   validPassword(body.password);const encoded=passwordHash(body.password),recoveryCode=secret();
   db.transaction(()=>{
    db.prepare('UPDATE auth_accounts SET password_hash=?,recovery_hash=?,password_version=password_version+1 WHERE id=?').bind(encoded,hash(recoveryCode),existing.id).run();
    db.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(existing.id).run();
   });
   return reply({ok:true,recoveryCode},200,cookie(request,'',0));
  }
  const user=await readSession(request,env);
  if(action==='logout'){
   const token=sessionToken(request);if(token)db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(hash(token)).run();
   return reply({ok:true},200,cookie(request,'',0));
  }
  if(!user)throw new IssueError('Sign in to continue.',401);
  if(action==='profile'){
   const displayName=textField(body.displayName,'Display name',3,40),about=textField(body.about??'','About me',0,1000),avatar=textField(body.avatarUrl??'','Avatar URL',0,2048);
   if(avatar){let u;try{u=new URL(avatar);}catch{throw new IssueError('Enter an HTTPS image URL.');}if(u.protocol!=='https:'||u.username||u.password)throw new IssueError('Enter an HTTPS image URL.');}
   const member=await ensureMember(db,user,env);if(member.banned&&user.role!=='admin')throw new IssueError('Profile changes are disabled for this account.',403);
   const now=new Date().toISOString();
   db.batch([db.prepare('INSERT INTO account_preferences(user_id,display_name,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,updated_at=excluded.updated_at').bind(user.id,displayName,now),db.prepare("INSERT INTO account_avatars(user_id,url,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET url=excluded.url,updated_at=excluded.updated_at").bind(user.id,avatar,now),db.prepare('UPDATE forum_members SET about=?,author=? WHERE user_id=?').bind(about,displayName,user.id)]);
   return reply({ok:true});
  }
  if(action==='password'){
   rate(db,'password:'+user.id,8,600);
   const account=db.prepare('SELECT * FROM auth_accounts WHERE id=?').bind(user.id).first();
   if(!verifyPassword(body.currentPassword,account.password_hash))throw new IssueError('Current password is incorrect.',401);
   const encoded=passwordHash(validPassword(body.password)),recoveryCode=secret();
   db.transaction(()=>{db.prepare('UPDATE auth_accounts SET password_hash=?,recovery_hash=?,password_version=password_version+1 WHERE id=?').bind(encoded,hash(recoveryCode),user.id).run();db.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(user.id).run();});
   return reply({ok:true,recoveryCode},200,issueSession(db,request,{id:user.id,password_version:account.password_version+1}));
  }
  if(action==='claim-owner'){
   rate(db,'owner:'+ip,5,3600);
   const code=typeof body.code==='string'?body.code:'';
   if(!safeEqual(hash(code),env.OWNER_SETUP_HASH||OWNER_SETUP_HASH))throw new IssueError('Invalid owner setup link.',403);
   db.transaction(()=>{
    if(db.prepare("SELECT value FROM auth_settings WHERE key='owner_claimed'").first())throw new IssueError('Owner setup has already been completed.',409);
    db.prepare("INSERT INTO auth_settings(key,value) VALUES('owner_claimed',?)").bind(user.id).run();
    db.prepare("UPDATE auth_accounts SET role='admin' WHERE id=?").bind(user.id).run();
   });return reply({ok:true});
  }
  throw new IssueError('Not found.',404);
 }catch(e){if(!(e instanceof IssueError))console.error('Account request failed',e.message);return reply({error:e instanceof IssueError?e.message:'Unable to complete your request. Please try again.'},e instanceof IssueError?e.status:500);}
}
