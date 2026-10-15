import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,defaultKnowledge} from '../src/storage.js';
import {createApp} from '../src/server.js';
import {manualBrief,validateEvidence} from '../src/manual.js';
import {validateBrief} from '../src/research.js';
const input={bank:'Example Bank',geography:'UK',offering:'Both',persona:'COO',contact:'Unverified Contact',notes:'My notes',evidence:[{kind:'background',title:'Annual report',url:'https://bank.example/report',date:'2025-05-01',excerpt:'A user-pasted description of the bank.'},{kind:'development',title:'User-pasted initiative',url:'https://bank.example/initiative',date:'2026-01-12',excerpt:'User-supplied evidence of an initiative.',why:'We could ask whether visibility is part of the scope.'}]};
async function fixture(fn){const store=createStore(':memory:');const app=createApp({store,env:{OPENAI_API_KEY:'unused',TAVILY_API_KEY:'unused'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));const root=`http://127.0.0.1:${app.address().port}`;const req=async(p,method='GET',body)=>{const r=await fetch(root+p,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};try{await fn(req,store);}finally{await new Promise(r=>app.close(r));store.close();}}
test('free manual templates preserve sources, never verify contacts and respect outreach length',()=>{
 const brief=manualBrief(input,defaultKnowledge);assert.equal(brief.mode,'manual');assert.equal(brief.overview.text,'[s1] A user-pasted description of the bank.');assert.equal(brief.developments[0].text,input.evidence[1].excerpt);assert.equal(brief.sources[1].url,input.evidence[1].url);assert.equal(brief.targets[0].name,null);assert.ok(!JSON.stringify(brief).includes(input.contact));assert.match(brief.limitations[0],/not been independently verified/);validateBrief(brief,brief.sources);
 for(const offering of ['Both','Transaction Observability','Financial Crime']){const b=manualBrief({...input,offering,bank:'long '.repeat(50),evidence:input.evidence.map(x=>({...x,title:'title '.repeat(40)}))},defaultKnowledge);assert.ok(b.outreach.email.split(/\s+/).length<120);assert.ok(b.outreach.linkedin.split(/\s+/).length<60);}
 const empty=manualBrief({...input,evidence:[]},defaultKnowledge);assert.equal(empty.developments.length,0);assert.equal(empty.useCases.length,0);assert.equal(empty.sources.length,0);assert.match(empty.overview.text,/No sourced/);validateBrief(empty,[]);
});
test('rejects unsafe links and invalid dates without fetching user URLs',()=>{for(const bad of [{url:'javascript:alert(1)'},{url:'file:///tmp/private'},{date:'2026-02-30'},{date:'2099-01-01'},{excerpt:''}])assert.throws(()=>validateEvidence([{...input.evidence[0],...bad}]));});
test('API defaults to manual with credentials present; backup restores notes/settings safely and preserves existing records',async()=>fixture(async(req,store)=>{
 assert.deepEqual((await req('/api/status')).data,{mode:'manual',paidAPIsEnabled:false});
 const created=await req('/api/research','POST',input);assert.equal(created.status,200);assert.equal(created.data.brief.mode,'manual');
 const id=created.data.id;await req(`/api/accounts/${id}`,'PATCH',{notes:'Important account notes'});
 const knowledge={...defaultKnowledge,qualification:'My approved criteria'};await req('/api/settings','PUT',knowledge);
 const backup=(await req('/api/backup')).data;assert.equal(backup.accounts[0].notes,'Important account notes');assert.equal(backup.knowledge.qualification,knowledge.qualification);assert.ok(!JSON.stringify(backup).includes('unused'));
 await req(`/api/accounts/${id}`,'PATCH',{notes:'Newer local notes'});assert.equal((await req('/api/restore','POST',backup)).data.kept,1);assert.equal(store.get(id).notes,'Newer local notes');
 const second={...structuredClone(backup),accounts:backup.accounts.map(a=>({...a,id:'restored-account'}))};assert.equal((await req('/api/restore','POST',second)).data.added,1);assert.equal(store.get('restored-account').notes,'Important account notes');assert.equal(store.knowledge().qualification,knowledge.qualification);
 const corrupt=structuredClone(backup);corrupt.accounts[0].brief.sources[0].url='javascript:alert(1)';assert.equal((await req('/api/restore','POST',corrupt)).status,400);assert.equal(store.list().length,2);
 assert.equal((await req('/api/research','POST',{...input,id,evidence:[{...input.evidence[0],url:'javascript:x'}]})).status,400);assert.equal(store.get(id).notes,'Newer local notes');
}));
