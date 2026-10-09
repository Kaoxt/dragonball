import { IssueError } from './issues.js';

// Both values are provisioned in Cloudflare, never supplied by the browser.
export function turnstileConfig(env) {
 const siteKey=String(env.TURNSTILE_SITE_KEY||'').trim();
 const secretKey=String(env.TURNSTILE_SECRET_KEY||'').trim();
 return {required:!!(siteKey||secretKey),ready:!!(siteKey&&secretKey),siteKey};
}
export async function verifyRegistration(request,env,token) {
 const config=turnstileConfig(env);
 // Existing registration remains available until the operator provisions Turnstile.
 if(!config.required)return;
 if(!config.ready)throw new IssueError('Registration security check is temporarily unavailable. Please try again later.',503);
 if(typeof token!=='string'||!token.trim()||token.length>2048)throw new IssueError('Please complete the security check.',400);
 let result;
 try {
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
   body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:request.headers.get('CF-Connecting-IP')||undefined})
  });
  if(!response.ok)throw Error('Verification unavailable');
  result=await response.json();
 }catch{throw new IssueError('The security check could not be verified. Please try again.',503);}
 if(result.success!==true||result.action!=='register'||result.hostname!==new URL(request.url).hostname)
  throw new IssueError('Security check expired or failed. Please try again.',400);
}
