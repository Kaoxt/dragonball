import {decksRequest} from '../src/community/decks-api.js';
import { avatarRequest, AVATAR_LIMIT } from '../src/community/avatar-upload.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { authSchema,authRequest } from '../src/community/auth.js';
import { forumDb } from '../src/community/forum.js';
import { onRequestGet,onRequestPost } from '../src/community/forum-api.js';
import { database } from '../src/community/database.js';
import { hash } from '../src/community/session.js';
import { migrateKurtUsername } from '../src/community/account-migrations.js';
import { recordTopicView } from '../src/community/topic-views.js';
function storage(){const db=new DatabaseSync(':memory:');return {sql:{exec(query,...args){const p=db.prepare(query);let values;try{values=p.all(...args);}catch(e){throw e;}return {toArray:()=>values};}},transactionSync(fn){db.exec('SAVEPOINT tx');try{const r=fn();db.exec('RELEASE tx');return r;}catch(e){db.exec('ROLLBACK TO tx; RELEASE tx');throw e;}}};}
async function fixture(){const env={DB:database(storage()),OWNER_SETUP_HASH:hash('test-owner-code')};authSchema(env.DB);await forumDb(env);const cookies={};return {env,cookies,async auth(who,action,data,origin='https://dragonball.test'){const request=new Request('https://dragonball.test/api/auth/'+action,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':who,Cookie:cookies[who]||''},...(data?{body:JSON.stringify(data)}:{})});const r=await authRequest(request,env);const cookie=r.headers.get('set-cookie');if(cookie)cookies[who]=cookie.split(';')[0];return {status:r.status,data:await r.json(),cookie};},async forum(who,data,params={},origin='https://dragonball.test'){const request=new Request('https://dragonball.test/api/forum?'+new URLSearchParams(params),{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookies[who]||''},...(data?{body:JSON.stringify(data)}:{})});const r=await(data?onRequestPost:onRequestGet)({env,request});return {status:r.status,data:await r.json()};},async register(who){const r=await this.auth(who,'register',{username:who,password:'My private password 123!'});assert.equal(r.status,201,JSON.stringify(r));return r;}};}
const topic={action:'topic',categoryId:1,title:'My first Dragon Ball deck',body:'What do you think of this deck?'};
test('topic views count visits, deduplicate refreshes, and ignore pagination and hidden topics',async()=>{
 const f=await fixture();await f.register('alice');await f.register('bob');
 const id=(await f.forum('alice',topic)).data.id;
 assert.equal((await f.forum(null,null,{view:'topic',id})).data.topic.view_count,1);
 assert.equal((await f.forum(null,null,{view:'topic',id})).data.topic.view_count,1);
 assert.equal((await f.forum('bob',null,{view:'topic',id,after:1})).data.topic.view_count,1);
 assert.equal((await f.forum('bob',null,{view:'topic',id})).data.topic.view_count,2);
 assert.equal((await f.forum(null,null,{view:'list'})).data.topics[0].view_count,2);
 const member=(await f.auth('bob','session')).data.user,request=new Request('https://dragonball.test/');
 assert.equal(recordTopicView(f.env.DB,request,member,id,Date.now()+1800001),3);
 await f.auth('alice','claim-owner',{code:'test-owner-code'});
 f.env.DB.prepare('UPDATE forum_topics SET hidden=1 WHERE id=?').bind(id).run();
 assert.equal((await f.forum(null,null,{view:'topic',id})).status,404);
 assert.equal((await f.forum('alice',null,{view:'topic',id})).data.topic.view_count,3);
});
test('topic rows use the latest visible poster and preserve the original creation date',async()=>{
 const f=await fixture();await f.register('alice');await f.register('bob');
 const id=(await f.forum('alice',topic)).data.id;
 const original=(await f.forum(null,null,{view:'list'})).data.topics[0];
 assert.equal(original.latest_author,'alice');assert.equal(original.latest_reply_id,null);
 await f.auth('bob','profile',{displayName:'Bob',avatarUrl:'https://example.com/bob.png'});
 await f.forum('bob',{action:'reply',id,body:'Latest reply.'});
 const latest=(await f.forum(null,null,{view:'list'})).data.topics[0];
 assert.equal(latest.latest_author,'Bob');assert.equal(latest.latest_avatar_url,'https://example.com/bob.png');assert.ok(latest.latest_reply_id);
 assert.equal(latest.created_at,original.created_at);assert.equal(latest.author,'alice');
 f.env.DB.prepare('UPDATE forum_replies SET hidden=1 WHERE id=?').bind(latest.latest_reply_id).run();
 const hidden=(await f.forum(null,null,{view:'list'})).data.topics[0];
 assert.equal(hidden.latest_author,'alice');assert.equal(hidden.latest_reply_id,null);
});
test('requested login rename preserves identity and credentials and runs only once',async()=>{
 const f=await fixture();await f.register('kaoxt');
 const before=(await f.auth('kaoxt','session')).data.user;
 f.env.DB.prepare('UPDATE forum_members SET id=? WHERE user_id=?').bind('7bb24f5c-1f13-4bfc-af60-c153f980e9af',before.id).run();
 const credentials=f.env.DB.prepare('SELECT * FROM auth_accounts WHERE id=?').bind(before.id).first();
 const post=(await f.forum('kaoxt',topic)).data.id;
 assert.equal(migrateKurtUsername(f.env.DB),'renamed');
 assert.deepEqual({...f.env.DB.prepare('SELECT * FROM auth_accounts WHERE id=?').bind(before.id).first()},{...credentials,username:'Kurt'});
 assert.equal((await f.auth('kaoxt','session')).data.user.id,before.id);
 assert.equal((await f.forum('kaoxt',{action:'topicEdit',id:post,title:'Still my post',body:'Same account.'})).status,200);
 assert.equal((await f.auth('new-session','login',{username:'Kurt',password:'My private password 123!'})).status,200);
 assert.equal((await f.auth('old-name','login',{username:'kaoxt',password:'My private password 123!'})).status,401);
 assert.equal(migrateKurtUsername(f.env.DB),'completed');
});
test('login rename does not affect other identities or take an occupied username',async()=>{
 const f=await fixture();await f.register('kaoxt');await f.register('kurt');
 const account=(await f.auth('kaoxt','session')).data.user;
 f.env.DB.prepare('UPDATE forum_members SET id=? WHERE user_id=?').bind('7bb24f5c-1f13-4bfc-af60-c153f980e9af',account.id).run();
 assert.equal(migrateKurtUsername(f.env.DB),'conflict');
 assert.equal((await f.auth('kaoxt','session')).data.user.username,'kaoxt');
 const other=await fixture();await other.register('kaoxt');
 assert.equal(migrateKurtUsername(other.env.DB),'not-applicable');
 assert.equal((await other.auth('kaoxt','session')).data.user.username,'kaoxt');
});
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
 const likedDetail=(await f.forum(null,null,{view:'topic',id})).data;
 assert.equal(likedDetail.topic.likes_received,1);assert.equal(likedDetail.topic.post_count,1);
 assert.equal(likedDetail.replies[0].likes_received,0);assert.equal(likedDetail.replies[0].post_count,1);
 const unliked=await f.forum('bob',{action:'like',kind:'topic',id,liked:false});
 assert.equal(unliked.data.likes_received,0);assert.equal((await f.forum(null,null,{view:'topic',id})).data.topic.likes_received,0);
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

test('Turnstile registration: config privacy, fail-closed verification, hostname/action, replay and outage',async t=>{
 const f=await fixture();
 assert.deepEqual((await f.auth('guest','config')).data.turnstile,{required:false,ready:false,siteKey:''});
 f.env.TURNSTILE_SITE_KEY='public-site-key';
 const registration={username:'protected',password:'A private registration password'};
 assert.equal((await f.auth('partial','register',registration)).status,503);
 f.env.TURNSTILE_SECRET_KEY='private-server-key';
 const config=await f.auth('guest','config');assert.deepEqual(config.data.turnstile,{required:true,ready:true,siteKey:'public-site-key'});assert.doesNotMatch(JSON.stringify(config),/private-server-key/);
 let calls=0,result={success:true,hostname:'dragonball.test',action:'register'};
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls++;assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  const data=JSON.parse(options.body);assert.equal(data.secret,'private-server-key');assert.equal(data.response,'challenge-token');assert.ok(options.signal);
  return Response.json(result);
 });
 assert.equal((await f.auth('missing','register',registration)).status,400);
 assert.equal((await f.auth('oversize','register',{...registration,'cf-turnstile-response':'a'.repeat(2049)})).status,400);assert.equal(calls,0);
 const verified={...registration,'cf-turnstile-response':'challenge-token'};
 result={success:false,'error-codes':['timeout-or-duplicate']};assert.equal((await f.auth('invalid','register',verified)).status,400);
 result={success:true,hostname:'evil.test',action:'register'};assert.equal((await f.auth('wronghost','register',verified)).status,400);
 result={success:true,hostname:'dragonball.test',action:'login'};assert.equal((await f.auth('wrongaction','register',verified)).status,400);
 assert.equal(f.env.DB.prepare('SELECT count(*) AS n FROM auth_accounts').first().n,0);
 result={success:true,hostname:'dragonball.test',action:'register'};assert.equal((await f.auth('valid','register',verified)).status,201);
 result={success:false,'error-codes':['timeout-or-duplicate']};assert.equal((await f.auth('replay','register',{...verified,username:'replayed'})).status,400);
 t.mock.method(globalThis,'fetch',async()=>{throw Error('network down');});
 assert.equal((await f.auth('outage','register',{...verified,username:'outage'})).status,503);
 assert.equal(f.env.DB.prepare('SELECT count(*) AS n FROM auth_accounts').first().n,1);
 assert.equal((await f.auth('valid','login',{username:'protected',password:registration.password})).status,200);
});

test('avatar uploads enforce size, ownership and origin and appear in profiles',async()=>{
 const f=await fixture();await f.register('alice');await f.register('bob');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=','base64');
 const upload=(who,bytes=png,origin='https://dragonball.test')=>avatarRequest(new Request('https://dragonball.test/api/auth/avatar',{method:'POST',headers:{Origin:origin,Cookie:f.cookies[who]||'','Content-Type':'image/png'},body:bytes}),f.env);
 assert.equal((await upload(null)).status,401);
 assert.equal((await upload('alice',png,'https://evil.test')).status,403);
 assert.equal((await upload('alice',Buffer.from('<svg onload="alert(1)"/>'))).status,400);
 assert.equal((await upload('alice',Buffer.alloc(AVATAR_LIMIT+1))).status,413);
 const response=await upload('alice');assert.equal(response.status,200);const {avatarUrl}=await response.json();
 const image=await avatarRequest(new Request('https://dragonball.test'+avatarUrl),f.env);
 assert.equal(image.headers.get('Content-Type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
 assert.equal((await f.auth('alice','session')).data.user.avatarUrl,avatarUrl);
 const id=(await f.forum('alice',topic)).data.id;assert.equal((await f.forum(null,null,{view:'topic',id})).data.topic.avatar_url,avatarUrl);
 await f.auth('alice','profile',{displayName:'Alice',about:'Hello',avatarUrl:''});
 assert.equal((await f.auth('alice','session')).data.user.avatarUrl,avatarUrl);
 const remove=who=>avatarRequest(new Request('https://dragonball.test/api/auth/avatar-remove',{method:'POST',headers:{Origin:'https://dragonball.test',Cookie:f.cookies[who]}}),f.env);
 await remove('bob');assert.equal((await f.auth('alice','session')).data.user.avatarUrl,avatarUrl);
 await remove('alice');assert.equal((await f.auth('alice','session')).data.user.avatarUrl,'');
 assert.equal((await avatarRequest(new Request('https://dragonball.test'+avatarUrl),f.env)).status,404);
});

test('account decks are private, persistent, origin-checked and versioned',async()=>{
 const f=await fixture();await f.register('alice');await f.register('bob');
 const call=async(who,data,origin='https://dragonball.test')=>{const r=await decksRequest(new Request('https://dragonball.test/api/decks',{method:data?'POST':'GET',headers:{Cookie:f.cookies[who]||'',Origin:origin,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})}),f.env);return {status:r.status,data:await r.json()};};
 assert.equal((await call(null)).status,401);
 const first=(await call('alice')).data;assert.equal(first.version,0);
 const deck={id:'test-deck',name:'My deck',tokui:'Black',personalities:[null,null,null,null,null],cards:[],senseiDeck:[],mastery:null,sensei:null};
 const payload={userId:first.userId,version:0,data:{decks:[deck],active:deck.id}};
 assert.equal((await call('alice',payload,'https://evil.test')).status,403);
 assert.equal((await call('bob',payload)).status,409);
 assert.equal((await call('alice',payload)).status,200);
 assert.equal((await call('alice')).data.data.decks[0].name,'My deck');
 assert.equal((await call('bob')).data.data.decks.length,0);
 assert.equal((await call('alice',payload)).status,409);
 assert.equal((await call('alice',{...payload,version:1,data:{decks:[],active:null}})).status,200);
 assert.equal((await call('alice')).data.data.decks.length,0);
});
