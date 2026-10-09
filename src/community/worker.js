import { decksRequest } from './decks-api.js';
import { avatarRequest } from './avatar-upload.js';
import { DurableObject } from 'cloudflare:workers';
import { database } from './database.js';
import { authSchema, authRequest } from './auth.js';
import { forumDb } from './forum.js';
import { migrateKurtUsername } from './account-migrations.js';
import { onRequestGet, onRequestPost } from './forum-api.js';
export class Community extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.db=database(ctx.storage);this.communityEnv={...env,DB:this.db};ctx.blockConcurrencyWhile(async()=>{authSchema(this.db);await forumDb(this.communityEnv);if(migrateKurtUsername(this.db)==='conflict')console.warn('Requested account rename could not run: username already in use.');});}
 async fetch(request){
  const u=new URL(request.url);
  if(u.pathname.startsWith('/api/avatars/')||['/api/auth/avatar','/api/auth/avatar-remove'].includes(u.pathname))return avatarRequest(request,this.communityEnv);
  if(u.pathname.startsWith('/api/auth/'))return authRequest(request,this.communityEnv);
  if(u.pathname==='/api/decks')return decksRequest(request,this.communityEnv);
  const context={request,env:this.communityEnv};
  if(u.pathname==='/api/forum'&&request.method==='GET')return onRequestGet(context);
  if(u.pathname==='/api/forum'&&request.method==='POST')return onRequestPost(context);
  return Response.json({error:'Not found.'},{status:404});
 }
}
