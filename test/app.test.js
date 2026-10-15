import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore,defaultKnowledge} from '../src/storage.js';
import {createApp} from '../src/server.js';
import {demoBrief} from '../src/demo.js';
import {research,ResearchError,validateBrief} from '../src/research.js';
const input={bank:'Example Bank',geography:'United Kingdom',offering:'Both',persona:'COO',notes:'Initial note'};
async function fixture(fn,researcher){const dir=mkdtempSync(join(tmpdir(),'vyntra-'));const path=join(dir,'test.sqlite');const store=createStore(path);const app=createApp({store,researcher:researcher||((i)=>research(i,defaultKnowledge,{env:{}})),env:{}});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;const req=async(p,method='GET',value)=>{const r=await fetch(base+p,{method,headers:{'Content-Type':'application/json'},body:value?JSON.stringify(value):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.text()};};try{await fn(req,store,path);}finally{await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true});}}
test('complete demo workflow, notes, knowledge, export and restart persistence',async()=>fixture(async(req,store,path)=>{
 assert.equal((await req('/api/status')).data.mode,'manual');assert.equal((await req('/api/accounts')).data.length,0);
 const r=await req('/api/research','POST',input);assert.equal(r.status,200);const a=r.data;assert.equal(a.brief.mode,'demo');assert.match(a.brief.overview.text,/fictional/);assert.equal(a.input.bank,input.bank);
 assert.equal((await req('/api/accounts')).data[0].id,a.id);
 await req(`/api/accounts/${a.id}`,'PATCH',{notes:'Updated note <script>alert(1)</script>'});
 const settings={...defaultKnowledge,products:'Approved broad product material'};assert.equal((await req('/api/settings','PUT',settings)).status,200);
 const refreshed=await req('/api/research','POST',{...input,id:a.id,notes:'Updated note'});assert.equal(refreshed.data.id,a.id);assert.equal((await req('/api/accounts')).data.length,1);
 const exported=await req(`/api/accounts/${a.id}/export`);assert.match(exported.data,/FICTIONAL DEMO/);assert.match(exported.data,/## Sources/);assert.match(exported.data,/\[s1\]/);assert.match(exported.data,/Updated note/);
 const second=createStore(path);assert.equal(second.get(a.id).notes,'Updated note');assert.equal(second.knowledge().products,settings.products);second.close();
 assert.equal((await req('/api/research','POST',{...input,website:'javascript:alert(1)'})).status,400);
 assert.equal((await req('/api/accounts/missing')).status,404);
}));
test('provider failure preserves existing brief and notes',async()=>{let fail=false;await fixture(async(req)=>{const a=(await req('/api/research','POST',input)).data;fail=true;const r=await req('/api/research','POST',{...input,id:a.id});assert.equal(r.status,502);assert.match(r.data.error,/quota/);const saved=(await req(`/api/accounts/${a.id}`)).data;assert.deepEqual(saved.brief,a.brief);assert.equal(saved.notes,input.notes);},async i=>{if(fail)throw new ResearchError('Check quota');return demoBrief(i);});});
test('live pipeline carries evidence, validates citations and keeps keys server-side',async()=>{let modelSeen=false;const fetcher=async(url,options)=>{const data=JSON.parse(options.body);if(url.includes('tavily'))return new Response(JSON.stringify({results:[{title:'Bank official report',url:'https://bank.example/report',content:'Published 2026-06-12. Payment infrastructure review.',published_date:'2026-06-12'}]}));modelSeen=true;assert.match(data.messages[0].content,/untrusted DATA/);assert.match(data.messages[1].content,/Bank official report/);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(demoBrief(input))}}]}));};const b=await research(input,defaultKnowledge,{env:{TAVILY_API_KEY:'fake-search',OPENAI_API_KEY:'fake-model'},fetcher});assert.equal(b.mode,'live');assert.equal(b.sources.length,1);assert.equal(b.sources[0].url,'https://bank.example/report');assert.ok(modelSeen);assert.ok(!JSON.stringify(b).includes('fake-search'));const bad=demoBrief(input);bad.overview.sourceIds=['invented'];assert.throws(()=>validateBrief(bad,b.sources),ResearchError);});
test('search failures, empty evidence, malformed model and invalid citations are explicit failures',async()=>{
 const env={TAVILY_API_KEY:'fake',OPENAI_API_KEY:'fake'};
 await assert.rejects(research(input,defaultKnowledge,{env,fetcher:async()=>new Response('{}',{status:429})}),/HTTP 429/);
 await assert.rejects(research(input,defaultKnowledge,{env,fetcher:async()=>{throw Error('network');}}),/timed out/);
 await assert.rejects(research(input,defaultKnowledge,{env,fetcher:async()=>new Response('{"results":[]}')}),/No usable/);
 await assert.rejects(research(input,defaultKnowledge,{env,fetcher:async url=>new Response(JSON.stringify(url.includes('tavily')?{results:[{url:'https://bank.example',content:'Evidence'}]}:{choices:[{message:{content:'broken'}}]}))}),/invalid research/);
});
