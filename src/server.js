import {checkAccess} from './auth.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createStore,defaultKnowledge} from './storage.js';
import {ResearchError,validateBrief} from './research.js';
import {manualBrief,validateEvidence} from './manual.js';
import {markdown} from './export.js';
export function createApp({store=createStore(process.env.DATABASE_PATH||'./data/vyntra.sqlite'),researcher=manualBrief,env=process.env}={}) {
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const access=checkAccess(req,env);
  res.setHeader('Cache-Control','no-store');
  if(access==='unconfigured')return json(res,503,{error:'Private app: set APP_USERNAME and APP_PASSWORD in your hosting environment to enable sign-in.'});
  if(access==='denied'){res.setHeader('WWW-Authenticate','Basic realm="Vyntra Account Desk", charset="UTF-8"');return json(res,401,{error:'Sign in to access your private account desk.'});}
  try {
   const url=new URL(req.url,'http://localhost'); const path=url.pathname;
   if(!path.startsWith('/api/')) {
    if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
    const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};if(!files[path])return json(res,404,{error:'Not found'});
    res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(await readFile(new URL(`../public/${files[path]}`,import.meta.url)));return;
   }
   res.setHeader('Cache-Control','no-store');
   if(['POST','PATCH','PUT','DELETE'].includes(req.method)&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return json(res,403,{error:'Cross-origin requests are not allowed'});
   let body={};if(['POST','PATCH','PUT'].includes(req.method)) {let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>(path==='/api/restore'?5000000:100000))return json(res,413,{error:'Request too large'});}try{body=JSON.parse(raw);}catch{return json(res,400,{error:'Invalid JSON'});}}
   if(path==='/api/status'&&req.method==='GET')return json(res,200,{mode:'manual',paidAPIsEnabled:false});
   if(path==='/api/settings'){
    if(req.method==='GET')return json(res,200,store.knowledge());
    if(req.method==='PUT'){if(Object.keys(defaultKnowledge).some(k=>typeof body[k]!=='string'||body[k].length>16000))return json(res,400,{error:'Complete each knowledge field (maximum 16,000 characters).'});const clean=Object.fromEntries(Object.keys(defaultKnowledge).map(k=>[k,body[k]]));store.setKnowledge(clean);return json(res,200,clean);}
   }
   if(path==='/api/accounts'&&req.method==='GET')return json(res,200,store.list());
   if(path==='/api/research'&&req.method==='POST'){
    for(const key of ['bank','geography','offering','persona'])if(typeof body[key]!=='string'||!body[key].trim()||body[key].length>250)return json(res,400,{error:`Enter a valid ${key}.`});
    if(!['Transaction Observability','Financial Crime','Both'].includes(body.offering))return json(res,400,{error:'Invalid offering'});
    for(const key of ['website','contact','notes'])if(body[key]!==undefined&&(typeof body[key]!=='string'||body[key].length>(key==='notes'?20000:500)))return json(res,400,{error:`Invalid ${key}`});
    if(body.website){try{const u=new URL(body.website);if(!['http:','https:'].includes(u.protocol))throw Error();}catch{return json(res,400,{error:'Website must be a full http or https URL.'});}}
    const old=body.id?store.get(body.id):null;if(body.id&&!old)return json(res,404,{error:'Saved account not found'});
    const input=Object.fromEntries(['bank','geography','offering','persona','website','contact'].map(k=>[k,(body[k]||'').trim()]));
    try{input.evidence=validateEvidence(body.evidence??old?.input.evidence);}catch(e){return json(res,400,{error:e.message});}
    const notes=body.notes??old?.notes??'';const brief=await researcher({...input,notes},store.knowledge());
    return json(res,200,store.save(old?.id||randomUUID(),input,brief,notes));
   }
   if(path==='/api/backup'&&req.method==='GET'){
    res.setHeader('Content-Disposition','attachment; filename="vyntra-backup.json"');return json(res,200,{format:'vyntra-backup-v1',exportedAt:new Date().toISOString(),accounts:store.list(),knowledge:store.knowledge()});
   }
   if(path==='/api/restore'&&req.method==='POST'){
    try{
     if(body.format!=='vyntra-backup-v1'||!Array.isArray(body.accounts)||body.accounts.length>1000||!body.knowledge||Object.keys(defaultKnowledge).some(k=>typeof body.knowledge[k]!=='string'||body.knowledge[k].length>16000))throw Error();
     const ids=new Set();
     for(const a of body.accounts){
      if(!a||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(a.id)||ids.has(a.id)||!a.input||['bank','geography','offering','persona'].some(k=>typeof a.input[k]!=='string'||a.input[k].length>250)||typeof a.notes!=='string'||a.notes.length>20000||!Number.isFinite(Date.parse(a.created))||!Number.isFinite(Date.parse(a.updated)))throw Error();
      ids.add(a.id);
      if(a.input.evidence)validateEvidence(a.input.evidence);
      const b=a.brief;if(!b||!['manual','demo','live'].includes(b.mode)||!Number.isFinite(Date.parse(b.generatedAt))||!Array.isArray(b.sources)||b.sources.length>100)throw Error();
      const sourceIds=new Set();for(const source of b.sources){if(!source||typeof source.id!=='string'||!/^s[0-9]{1,3}$/.test(source.id)||sourceIds.has(source.id)||typeof source.title!=='string'||typeof source.excerpt!=='string')throw Error();sourceIds.add(source.id);if(source.url){const u=new URL(source.url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error();}}
      validateBrief(b,b.sources);
     }
    }catch{return json(res,400,{error:'This is not a valid Vyntra backup. Nothing has been changed.'});}
    const added=store.restore(body);return json(res,200,{added,kept:body.accounts.length-added});
   }
   const match=path.match(/^\/api\/accounts\/([a-zA-Z0-9-]+)(\/export)?$/);
   if(match){const a=store.get(match[1]);if(!a)return json(res,404,{error:'Account not found'});
    if(req.method==='GET'&&match[2]){res.setHeader('Content-Type','text/markdown; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="account-brief.md"');return res.end(markdown(a));}
    if(req.method==='GET')return json(res,200,a);
    if(req.method==='PATCH'&&!match[2]){if(typeof body.notes!=='string'||body.notes.length>20000)return json(res,400,{error:'Notes must be under 20,000 characters'});return json(res,200,store.notes(a.id,body.notes));}
   }
   return json(res,404,{error:'Not found'});
  } catch(e){ if(!(e instanceof ResearchError))console.error('Request failed:',e.name);json(res,e instanceof ResearchError?502:500,{error:e instanceof ResearchError?e.message:'Something went wrong. Your saved data has been kept.'}); }
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {const app=createApp();app.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Vyntra Account Desk listening on port ${Number(process.env.PORT)||3000}`));}
