import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { authSchema,authRequest } from '../src/community/auth.js';
import { forumDb } from '../src/community/forum.js';
import { onRequestGet,onRequestPost } from '../src/community/forum-api.js';
import { database } from '../src/community/database.js';
import { hash } from '../src/community/session.js';
function storage(){const db=new DatabaseSync(':memory:');return {sql:{exec(query,...args){const p=db.prepare(query);let values;try{values=p.all(...args);}catch(e){throw e;}return {toArray:()=>values};}},transactionSync(fn){db.exec('SAVEPOINT tx');try{const r=fn();db.exec('RELEASE tx');return r;}catch(e){db.exec('ROLLBACK TO tx; RELEASE tx');throw e;}}};}
async function fixture(){const env={DB:database(storage()),OWNER_SETUP_HASH:hash('test-owner-code')};authSchema(env.DB);await forumDb(env);const cookies={};return {env,cookies,async auth(who,action,data,origin='https://dragonball.test'){const request=new Request('https://dragonball.test/api/auth/'+action,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':who,Cookie:cookies[who]||''},...(data?{body:JSON.stringify(data)}:{})});const r=await authRequest(request,env);const cookie=r.headers.get('set-cookie');if(cookie)cookies[who]=cookie.split(';')[0];return {status:r.status,data:await r.json(),cookie};},async forum(who,data,params={},origin='https://dragonball.test'){const request=new Request('https://dragonball.test/api/forum?'+new URLSearchParams(params),{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookies[who]||''},...(data?{body:JSON.stringify(data)}:{})});const r=await(data?onRequestPost:onRequestGet)({env,request});return {status:r.status,data:await r.json()};},async register(who){const r=await this.auth(who,'register',{username:who,password:'My private password 123!'});assert.equal(r.status,201,JSON.stringify(r));return r;}};}
const topic={action:'topic',categoryId:1,title:'My first Dragon Ball deck',body:'What do you think of this deck?'};
test('accounts: registration, secure cookie, login, no leaked password/recovery, logout',async()=>{
 const f=await fixture();const created=await f.register('alice');assert.match(created.data.recoveryCode,/^[a-f0-9]{64}$/);assert.match(created.cookie,/HttpOnly; SameSite=Lax/);assert.match(created.cookie,/Secure/);
 const self=await f.auth('alice','session');assert.equal(self.data.user.username,'alice');assert.equal(self.data.user.isAdmin,false);assert.ok(self.data.user.memberId);assert.doesNotMatch(JSON.stringify(self),/password|recovery_hash/);
 assert.equal((await f.auth('bob','login',{username:'alice',password:'bad'})).status,401);
 assert.equal((await f.auth('bob','register',{username:'ALICE',password:'My private password 123!'})).status,409);
 const stolen=f.cookies.alice;await f.auth('alice','logout',{});f.cookies.bob=stolen;assert.equal((await f.auth('bob','session')).data.user,null);
 assert.equal((await f.auth('alice','login',{username:'alice',password:'My private password 123!'})).status,200);
});
test('password recovery rotates code, revokes sessions, requires new password',async()=>{
 const f=await fixture(),r=await f.register('alice');const original=f.cookies.alice;
 assert.equal((await f.auth('bob','recover',{username:'alice',recoveryCode:'bad',password:'My replacement password'})).status,401);
 const recovered=await f.auth('bob','recover',{username:'alice',recoveryCode:r.data.recoveryCode,password:'My replacement password'});assert.equal(recovered.status,200);assert.notEqual(recovered.data.recoveryCode,r.data.recoveryCode);
 f.cookies.alice=original;assert.equal((await f.auth('alice','session')).data.user,null);
 assert.equal((await f.auth('carol','recover',{username:'alice',recoveryCode:r.data.recoveryCode,password:'Third private password'})).status,401);
 assert.equal((await f.auth('alice','login',{username:'alice',password:'My replacement password'})).status,200);
 const other=await f.auth('carol','login',{username:'alice',password:'My replacement password'});assert.equal(other.status,200);
 const changed=await f.auth('alice','password',{currentPassword:'My replacement password',password:'Third private password'});assert.equal(changed.status,200);assert.equal((await f.auth('carol','session')).data.user,null);assert.equal((await f.auth('alice','session')).data.user.username,'alice');
});
test('owner access is token-protected, one-time, and not assigned to first signup',async()=>{
 const f=await fixture();await f.register('alice');await f.register('bob');
 assert.equal((await f.forum('alice',null,{view:'admin'})).status,403);
 assert.equal((await f.auth('alice','claim-owner',{code:'wrong'})).status,403);
 assert.equal((await f.auth('alice','claim-owner',{code:'test-owner-code'})).status,200);
 assert.equal((await f.auth('alice','session')).data.user.isAdmin,true);
 assert.equal((await f.auth('bob','claim-owner',{code:'test-owner-code'})).status,409);
 assert.equal((await f.forum('alice',null,{view:'admin'})).status,200);
});
test('CSRF, validation, and persistent brute-force limits',async()=>{
 const f=await fixture();assert.equal((await f.auth('alice','register',{username:'alice',password:'My private password 123!'},'https://evil.test')).status,403);
 assert.equal((await f.auth('alice','register',{username:'alice',password:'short'})).status,400);
 for(let i=0;i<10;i++)assert.equal((await f.auth('attacker','login',{username:'missing',password:'wrong'})).status,401);
 assert.equal((await f.auth('attacker','login',{username:'missing',password:'wrong'})).status,429);
});
test('posting, replies, likes, follows, profile, mentions and notification ownership',async()=>{
 const f=await fixture();await f.register('alice');await f.register('bob');
 assert.equal((await f.forum(null,topic)).status,401);assert.equal((await f.forum('alice',topic,{},'https://evil.test')).status,403);
 const b=(await f.auth('bob','session')).data.user;
 const created=await f.forum('alice',{...topic,body:`Hello @[bob](member:${b.memberId})!`,author:'fake',role:'admin'});assert.equal(created.status,201,JSON.stringify(created));const id=created.data.id;
 const detail=await f.forum(null,null,{view:'topic',id});assert.equal(detail.data.topic.author,'alice');assert.doesNotMatch(JSON.stringify(detail),/password|user_id|recovery/);
 assert.equal((await f.forum('bob',{action:'reply',id,body:'Great deck!'})).status,201);
 assert.equal((await f.forum('bob',{action:'like',kind:'topic',id,liked:true})).status,200);assert.equal((await f.forum('alice',{action:'like',kind:'topic',id,liked:true})).status,403);
 await f.forum('bob',{action:'follow',id,following:true});assert.equal((await f.forum('bob',null,{view:'followed'})).data.topics.length,1);
 const notices=await f.forum('bob',null,{view:'notifications'});assert.equal(notices.data.unreadCount,1);assert.match(notices.data.notifications[0].url,/^\/forums\/#topic/);assert.equal((await f.forum('alice',null,{view:'notifications'})).data.unreadCount,0);
 await f.auth('bob','profile',{displayName:'Vegeta fan',about:'I play Saiyan decks.',avatarUrl:'https://example.com/avatar.webp'});
 const member=await f.forum(null,null,{view:'member',id:b.memberId});assert.equal(member.data.member.author,'Vegeta fan');assert.equal(member.data.member.reply_count,1);
 assert.equal((await f.auth('bob','profile',{displayName:'Bad avatar',avatarUrl:'javascript:alert(1)'})).status,400);
});
test('member ownership, 24-hour editing, admin-only delete, moderation and locked replies',async()=>{
 const f=await fixture();await f.register('alice');await f.register('bob');await f.register('owner');await f.auth('owner','claim-owner',{code:'test-owner-code'});
 assert.equal((await f.forum('alice',{...topic,categoryId:4})).status,403);
 const id=(await f.forum('alice',topic)).data.id;
 const edit={action:'topicEdit',id,title:'Updated deck title',body:'Updated explanation'};
 assert.equal((await f.forum('bob',edit)).status,403);assert.equal((await f.forum('alice',edit)).status,200);
 f.env.DB.prepare('UPDATE forum_topics SET created_at=? WHERE id=?').bind(new Date(Date.now()-90000000).toISOString(),id).run();assert.equal((await f.forum('alice',edit)).status,403);assert.equal((await f.forum('owner',edit)).status,200);
 assert.equal((await f.forum('alice',{action:'topicDelete',id})).status,403);
 const mod={action:'topicModerate',id,categoryId:1,pinned:true,locked:true,hidden:false};assert.equal((await f.forum('owner',mod)).status,200);assert.equal((await f.forum('bob',{action:'reply',id,body:'Blocked'})).status,409);
 await f.forum('owner',{...mod,hidden:true});assert.equal((await f.forum(null,null,{view:'topic',id})).status,404);
 assert.equal((await f.forum('owner',{action:'topicDelete',id})).status,200);
});
test('SQL batch rollback and 25-topic pagination',async()=>{
 const f=await fixture();await f.register('alice');const m=(await f.auth('alice','session')).data.user.memberId;
 assert.throws(()=>f.env.DB.batch([f.env.DB.prepare("INSERT INTO auth_settings(key,value) VALUES('rollback','yes')"),f.env.DB.prepare('INSERT INTO nonexistent_table VALUES(1)')]));assert.equal(f.env.DB.prepare("SELECT value FROM auth_settings WHERE key='rollback'").first(),null);
 for(let i=0;i<26;i++)f.env.DB.prepare('INSERT INTO forum_topics(member_id,category_id,title,body,created_at,updated_at) VALUES(?,1,?,?,?,?)').bind(m,'Topic '+i,'A body',new Date().toISOString(),new Date().toISOString()).run();
 assert.equal((await f.forum(null,null,{view:'list'})).data.topics.length,25);assert.equal((await f.forum(null,null,{view:'list',page:2})).data.topics.length,1);
});
