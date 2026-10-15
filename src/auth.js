import {createHash,timingSafeEqual} from 'node:crypto';
const digest=s=>createHash('sha256').update(s).digest();
export function checkAccess(req,env) {
 const configured=Boolean(env.APP_USERNAME&&env.APP_PASSWORD);
 const required=Boolean(env.RENDER)||env.NODE_ENV==='production'||Boolean(env.APP_USERNAME||env.APP_PASSWORD);
 if(!configured)return required?'unconfigured':'allowed';
 const header=req.headers.authorization||'';
 if(!header.startsWith('Basic '))return 'denied';
 const decoded=Buffer.from(header.slice(6),'base64').toString('utf8');
 const colon=decoded.indexOf(':');
 if(colon<0)return 'denied';
 const userOK=timingSafeEqual(digest(decoded.slice(0,colon)),digest(env.APP_USERNAME));
 const passOK=timingSafeEqual(digest(decoded.slice(colon+1)),digest(env.APP_PASSWORD));
 return userOK&&passOK?'allowed':'denied';
}
