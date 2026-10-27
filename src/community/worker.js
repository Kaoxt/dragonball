import { mailSchema, mailRequest } from './mail.js';
import { uploadSchema, uploadRequest } from './uploads.js';
import { decksRequest } from './decks-api.js';
import { avatarRequest } from './avatar-upload.js';
import { DurableObject } from 'cloudflare:workers';
import { database } from './database.js';
import { authSchema, authRequest } from './auth.js';
import { forumDb } from './forum.js';
import { migrateKurtUsername, migrateKaoxtIdentity, grantKaoxtAdministrator } from './account-migrations.js';
import { onRequestGet, onRequestPost } from './forum-api.js';
import { API_SECURITY_HEADERS } from './security.js';
export class Community extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.db=database(ctx.storage);this.communityEnv={...env,DB:this.db};ctx.blockConcurrencyWhile(async()=>{authSchema(this.db);uploadSchema(this.db);await forumDb(this.communityEnv);if(migrateKurtUsername(this.db)==='conflict')console.warn('Requested account rename could not run: username already in use.');if(migrateKaoxtIdentity(this.db)==='conflict')console.warn('Requested Kaoxt identity restore could not run: username already in use.');grantKaoxtAdministrator(this.db);mailSchema(this.db);});}
 async fetch(request){
  const u=new URL(request.url);
  if(u.pathname==='/api/mail'||u.pathname.startsWith('/api/mail/')||u.pathname==='/api/admin/mailboxes')return mailRequest(request,this.communityEnv);
  if(u.pathname.startsWith('/api/admin/uploads')||u.pathname.startsWith('/api/files/'))return uploadRequest(request,this.communityEnv);
  if(u.pathname.startsWith('/api/avatars/')||['/api/auth/avatar','/api/auth/avatar-remove'].includes(u.pathname))return avatarRequest(request,this.communityEnv);
  if(u.pathname.startsWith('/api/auth/'))return authRequest(request,this.communityEnv);
  if(u.pathname==='/api/decks')return decksRequest(request,this.communityEnv);
  const context={request,env:this.communityEnv};
  if(u.pathname==='/api/forum'&&request.method==='GET')return onRequestGet(context);
  if(u.pathname==='/api/forum'&&request.method==='POST')return onRequestPost(context);
  return Response.json({error:'Not found.'},{status:404,headers:{...API_SECURITY_HEADERS,'Cache-Control':'no-store'}});
 }
}
