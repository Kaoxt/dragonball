import { createHash } from 'node:crypto';
export const hash=value=>createHash('sha256').update(String(value)).digest('hex');
export const assertSameOrigin=request=>request.headers.get('Origin')===new URL(request.url).origin;
export const isAdminUser=session=>session?.role==='admin';
export function sessionToken(request){return /(?:^|;\s*)dragon_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.get('Cookie')||'')?.[1];}
export async function readSession(request,env){
 const raw=sessionToken(request);if(!raw)return null;
 return env.DB.prepare(`SELECT a.id,a.username,a.role,a.created_at,p.display_name,CASE WHEN v.url!='' THEN v.url WHEN v.id IS NOT NULL THEN '/api/avatars/'||v.id ELSE '' END AS avatar_url FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id LEFT JOIN account_preferences p ON p.user_id=a.id LEFT JOIN account_avatars v ON v.user_id=a.id WHERE s.token_hash=? AND s.expires_at>? AND s.password_version=a.password_version`).bind(hash(raw),Date.now()).first();
}
export async function refreshSessionIfNeeded(session){return {session,cookie:null};}
