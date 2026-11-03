import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinishPreference} from '../public/cards/finish-preference.js';

function fixture(request, storage = new Map()) {
  let state;
  const preference = createFinishPreference({request, storage: {getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},onChange:value=>{state=value;}});
  return {preference, state:()=>state, storage};
}
test('account choice loads from the server, saves once, and does not use the guest preference', async () => {
  const calls=[], p=fixture(async (url,options)=>{
    calls.push(options);
    return Response.json(options.method?JSON.parse(options.body):{userId:'alice',finish:'regular'});
  },new Map([['dragon:card-finish:guest','foil']]));
  await p.preference.load();assert.equal(p.state().finish,'regular');
  await p.preference.choose('foil');
  assert.deepEqual(JSON.parse(calls[1].body),{userId:'alice',finish:'foil'});
  assert.equal(p.state().saving,false);assert.equal(p.state().error,'');
});
test('guest choice survives a new controller without writing to an account', async () => {
  const request=async (_,options)=>{assert.equal(options.method,undefined);return Response.json({userId:null,finish:'foil'});};
  const p=fixture(request);await p.preference.load();await p.preference.choose('regular');
  const fresh=fixture(request,p.storage);await fresh.preference.load();assert.equal(fresh.state().finish,'regular');
});
test('failed account saves restore the saved finish and report the failure', async () => {
  const p=fixture(async (_,options)=>options.method?new Response('',{status:500}):Response.json({userId:'alice',finish:'regular'}));
  await p.preference.load();await p.preference.choose('foil');
  assert.equal(p.state().finish,'regular');assert.match(p.state().error,/Unable to save/);assert.equal(p.state().saving,false);
});
test('account changes invalidate old loads and pending saves', async () => {
  let oldLoad, oldSave, reads=0;
  const p=fixture(async (_,options)=>{
    if(options.method)return new Promise(resolve=>{oldSave=resolve;});
    if(++reads===1)return new Promise(resolve=>{oldLoad=resolve;});
    return Response.json({userId:reads===2?'alice':'bob',finish:'foil'});
  });
  const loading=p.preference.load();await p.preference.resetAccount();
  oldLoad(Response.json({userId:null,finish:'regular'}));await loading;
  assert.equal(p.state().userId,'alice');
  const saving=p.preference.choose('regular');
  await p.preference.resetAccount();
  oldSave(Response.json({userId:'alice',finish:'regular'}));await saving;
  assert.equal(p.state().userId,'bob');assert.equal(p.state().finish,'foil');assert.equal(p.state().saving,false);
});
test('offline loading never writes a choice to an unknown account', async () => {
  let calls=0;const p=fixture(async()=>{calls++;throw Error('offline');});
  await p.preference.load();await p.preference.choose('regular');
  assert.equal(calls,1);assert.equal(p.state().finish,'regular');assert.match(p.state().error,/this visit/);
});
