import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../src/storage.js';
import {createApp} from '../src/server.js';
test('hosted deployment protects HTML, settings, accounts, research and export until signed in',async()=>{
 const store=createStore(':memory:');const env={RENDER:'true'};const app=createApp({store,env});await new Promise(r=>app.listen(0,'127.0.0.1',r));const root=`http://127.0.0.1:${app.address().port}`;
 try{
  assert.equal((await fetch(root+'/')).status,503);
  env.APP_USERNAME='test-user';env.APP_PASSWORD='test-password';
  for(const path of ['/','/api/accounts','/api/settings','/api/research','/api/accounts/example/export']){const r=await fetch(root+path);assert.equal(r.status,401);assert.match(r.headers.get('www-authenticate'),/Basic/);}
  const bad={Authorization:'Basic '+Buffer.from('test-user:wrong').toString('base64')};assert.equal((await fetch(root+'/api/settings',{headers:bad})).status,401);
  const headers={Authorization:'Basic '+Buffer.from('test-user:test-password').toString('base64')};assert.equal((await fetch(root+'/',{headers})).status,200);assert.deepEqual(await fetch(root+'/api/accounts',{headers}).then(r=>r.json()),[]);
 }finally{await new Promise(r=>app.close(r));store.close();}
});
