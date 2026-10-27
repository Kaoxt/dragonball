import {fixture} from './mail-fixture.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {classifyMail, previewText, MAX_PREVIEW_BYTES} from '../src/community/mail-filter.js';
import receiver from '../src/mail-receiver.js';

test('each account sees only assigned inboxes; admin cannot bypass another owner',async()=>{
  const f=fixture();
  assert.equal((await f.call('',{role:null})).status,401);
  assert.deepEqual((await(await f.call('',{role:'member'})).json()).mailboxes.map(box=>box.address),[f.member.address]);
  for(const role of ['owner','other'])for(const suffix of ['', '/messages','/sync','/blocks','/send'])assert.equal((await f.call(`/${f.member.id}${suffix}`,{role,method:['/sync','/send'].includes(suffix)?'POST':'GET',data:['/sync','/send'].includes(suffix)?{}:undefined})).status,404);
  assert.equal((await f.call('/api/admin/mailboxes',{role:'member'})).status,403);
  for(const path of [`/${f.owner.id}/sync`,`/${f.owner.id}/send`,`/${f.owner.id}/blocks`,'/api/admin/mailboxes'])assert.equal((await f.call(path,{method:'POST',data:{},origin:'https://evil.test'})).status,403);
});
test('SMTP envelope owns mail; forged To headers and missing metadata cannot cross inboxes',async()=>{
  const f=fixture();
  await f.incoming({to:f.owner.address,headerTo:f.member.address});
  await f.incoming({to:f.member.address,headerTo:'undisclosed-recipients:;'});
  await f.incoming({metadata:{recipient:''}});
  assert.equal((await f.sync()).status,200);assert.equal((await f.sync(f.member,'member')).status,200);
  assert.equal((await f.list()).length,1);assert.equal((await f.list(f.member,'member')).length,1);
  const row=(await f.list(f.member,'member'))[0];
  for(const suffix of ['', '/source','/attachment/0'])assert.equal((await f.call(`/${f.owner.id}/messages/${row.id}${suffix}`)).status,404);
  assert.equal((await f.call(`/${f.owner.id}/messages/${row.id}`,{method:'POST',data:{folder:'trash'}})).status,404);
  await f.sync();assert.equal((await f.list()).length,1);
});
test('existing raw MIME mail decodes correctly and source downloads stay private',async()=>{
  const f=fixture();
  await f.incoming({subject:'=?UTF-8?B?SGVsbG8g8J+QiQ==?=',extra:'MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="abc"\r\n',body:'--abc\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nHello=20player\r\n--abc\r\nContent-Type: text/html; name="test.html"\r\nContent-Disposition: attachment; filename="test.html"\r\nContent-Transfer-Encoding: base64\r\n\r\nPHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==\r\n--abc--'});
  await f.sync();const row=(await f.list())[0];assert.match(row.subject,/Hello/);assert.equal(row.attachmentCount,1);
  const detail=await(await f.call(`/${f.owner.id}/messages/${row.id}`)).json();assert.equal(detail.message.body,'Hello player');
  const attachment=await f.call(`/${f.owner.id}/messages/${row.id}/attachment/0`);
  assert.equal(attachment.headers.get('Content-Type'),'application/octet-stream');assert.match(attachment.headers.get('Content-Disposition'),/^attachment/);assert.match(attachment.headers.get('Content-Security-Policy'),/sandbox/);assert.match(attachment.headers.get('Cache-Control'),/no-store/);
  const source=await f.call(`/${f.owner.id}/messages/${row.id}/source`);assert.equal(source.status,200);assert.match(await source.text(),/multipart\/mixed/);
});
test('spam is quarantined, recoverable, and blocked sender lists are mailbox specific',async()=>{
  const f=fixture();
  await f.incoming({subject:'CLAIM YOUR PRIZE!!!',body:'Free money, guaranteed returns.'});
  await f.incoming({body:'Urgent help: I am the tournament winner. Is my card legal?'});
  await f.sync();assert.equal((await f.list()).length,1);const spam=(await f.list(f.owner,'owner','spam'))[0];assert.ok(spam.reasons.length);
  await f.call(`/${f.owner.id}/messages/${spam.id}`,{method:'POST',data:{folder:'inbox'}});assert.equal((await f.list()).length,2);
  await f.call(`/${f.owner.id}/blocks`,{method:'POST',data:{sender:'person@example.com',blocked:true}});
  await f.incoming();await f.incoming({to:f.member.address});await f.sync();await f.sync(f.member,'member');
  assert.equal((await f.list()).length,0);assert.equal((await f.list(f.member,'member')).length,1);
  await f.call(`/${f.owner.id}/blocks`,{method:'POST',data:{sender:'person@example.com',blocked:false}});
  await f.incoming();await f.sync();assert.equal((await f.list()).length,1);
});
test('untrusted headers do not supply authentication; dangerous attachments go to Spam',()=>{
  assert.equal(classifyMail({from:{address:'player@example.com'},subject:'Hello',headers:[{key:'x-spam-flag',value:'YES'}]},'player@example.com').spam,false);
  assert.equal(classifyMail({from:{address:'player@example.com'},attachments:[{filename:'invoice.pdf.exe'}]},'player@example.com').spam,true);
  assert.equal(classifyMail({from:{address:'support@dragonballocg.com'}},'attacker@evil.test').spam,true);
  assert.equal(previewText({html:'<script>evil()</script><p>Safe</p><img src="https://track.test/a"><p>&lt;b&gt;word&lt;/b&gt;</p>'}).includes('evil()'),false);
});
test('oversized email is retained in Spam without parsing, and stale metadata cannot leak raw bytes',async()=>{
  const f=fixture(),key=await f.incoming();f.objects.get(key).size=MAX_PREVIEW_BYTES+1;
  await f.sync();const row=(await f.list(f.owner,'owner','spam'))[0];assert.match(row.reasons.join(),/10 MB/);
  assert.equal((await f.call(`/${f.owner.id}/messages/${row.id}/source`)).status,200);
  f.objects.get(key).customMetadata.recipient=f.member.address;
  assert.equal((await f.call(`/${f.owner.id}/messages/${row.id}/source`)).status,404);
});
test('admins provision new private inboxes without granting old mail or changing ownership',async()=>{
  const f=fixture();const old=await f.incoming({to:'new@dragonballocg.com',metadata:{receivedAt:'2020-01-01T00:00:00Z'}});
  const response=await f.call('/api/admin/mailboxes',{method:'POST',data:{address:'new',username:'member'}});assert.equal(response.status,201);
  const box=(await response.json()).mailbox;assert.ok(f.objects.has('mailbox-addresses/new@dragonballocg.com.json'));
  assert.equal((await f.call('/api/admin/mailboxes',{method:'POST',data:{address:'new',username:'owner'}})).status,409);
  assert.equal((await f.call('/api/admin/mailboxes',{method:'POST',data:{address:'../bad',username:'owner'}})).status,400);
  assert.equal((await f.call('/api/admin/mailboxes',{method:'POST',data:{address:'newer',username:'missing'}})).status,400);
  await f.sync(box,'member');assert.equal((await f.list(box,'member')).length,0);assert.ok(f.objects.has(old));
  assert.equal((await f.call(`/${box.id}/messages`)).status,404);
});
test('folder changes and search stay isolated and deletion is recoverable',async()=>{
  const f=fixture();await f.incoming({subject:'Secret card notes'});await f.sync();const row=(await f.list())[0];
  await f.call(`/${f.owner.id}/messages/${row.id}`,{method:'POST',data:{read:true,folder:'trash'}});
  assert.equal((await f.list()).length,0);assert.equal((await f.list(f.owner,'owner','trash'))[0].read,true);
  await f.call(`/${f.owner.id}/messages/${row.id}`,{method:'POST',data:{folder:'inbox'}});
  const result=await(await f.call(`/${f.owner.id}/messages?q=Secret`)).json();assert.equal(result.messages.length,1);
  const other=await(await f.call(`/${f.member.id}/messages?q=Secret`,{role:'member'})).json();assert.equal(other.messages.length,0);assert.deepEqual(other.counts,[]);
});
test('sending uses the owned From address, validates headers, and does not send duplicate retries',async()=>{
  const f=fixture(),data={id:randomUUID(),to:'person@example.com',subject:'Reply',text:'Thanks for writing!',from:'evil@example.com'};
  assert.equal((await f.call(`/${f.owner.id}/send`,{method:'POST',data})).status,200);
  assert.equal((await f.call(`/${f.owner.id}/send`,{method:'POST',data})).status,200);
  assert.equal(f.sends.length,1);assert.equal(f.sends[0].from,f.owner.address);
  assert.equal((await f.call(`/${f.owner.id}/send`,{method:'POST',data:{...data,id:randomUUID(),subject:'Hello\r\nBcc: evil@example.com'}})).status,400);
  assert.equal((await f.call(`/${f.owner.id}/send`,{method:'POST',data:{...data,id:randomUUID(),to:'a@example.com,b@example.com'}})).status,400);
  f.env.MAIL_SEND_ENABLED='false';assert.equal((await f.call(`/${f.owner.id}/send`,{method:'POST',data:{...data,id:randomUUID()}})).status,503);
});
test('uncertain provider results are persisted and never automatically retried',async()=>{
  const f=fixture();let sends=0;f.env.MAIL_OUTBOUND.send=async()=>{sends++;throw Error('timeout');};
  const data={id:randomUUID(),to:'person@example.com',subject:'Help',text:'Hello'};
  assert.equal((await f.call(`/${f.owner.id}/send`,{method:'POST',data})).status,502);
  assert.equal((await f.call(`/${f.owner.id}/send`,{method:'POST',data})).status,409);assert.equal(sends,1);
  assert.equal((await f.list(f.owner,'owner','sent'))[0].sendStatus,'uncertain');
});
test('sync pagination resumes and concurrent refreshes never duplicate messages',async()=>{
  const f=fixture();for(let i=0;i<28;i++)await f.incoming();
  const responses=await Promise.all([f.sync(),f.sync()]);assert.equal((await responses[0].json()).more,true);assert.equal((await responses[1].json()).more,false);assert.equal((await f.list()).length,28);
});
test('receiver stores authenticated envelope metadata with a fixed-length body and rejects unknown addresses',async()=>{
  const f=fixture();let rejection='';
  const message=to=>({to,from:'person@example.com',raw:new Blob(['From: x@example.com\r\nTo: forged@example.com\r\n\r\nhello']).stream(),rawSize:100,setReject:value=>{rejection=value;}});
  await receiver.email(message('unknown@dragonballocg.com'),f.env);assert.equal(rejection,'Unknown recipient.');assert.equal(f.objects.size,0);
  await f.bucket.put('mailbox-addresses/member@dragonballocg.com.json','{}');
  await receiver.email(message(f.member.address),f.env);
  const saved=[...f.objects.values()].find(o=>o.key.startsWith('incoming/'));assert.equal(saved.customMetadata.recipient,f.member.address);assert.equal(saved.customMetadata.sender,'person@example.com');assert.ok(saved.bytes.length);
});
