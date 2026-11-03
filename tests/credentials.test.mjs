import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDirectorKey,saveDirectorKey,clearDirectorKey,directorKeyRemembered} from '../src/credentials.js';
function mock(){const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}}
test('API key remains on same browser after reload when opted in',()=>{
 const s=mock();assert.equal(loadDirectorKey(s),'');assert.equal(saveDirectorKey('  abc-123 ',{store:s,remember:true}),true);
 assert.equal(loadDirectorKey(s),'abc-123');assert.equal(directorKeyRemembered(s),true);
});
test('unchecking remember removes stored key and honors preference',()=>{
 const s=mock();saveDirectorKey('abc',{store:s});saveDirectorKey('secret',{store:s,remember:false});assert.equal(loadDirectorKey(s),'');assert.equal(directorKeyRemembered(s),false);
});
test('forget button clears stored key',()=>{const s=mock();saveDirectorKey('hello',{store:s});assert.equal(clearDirectorKey(s),true);assert.equal(loadDirectorKey(s),'')});
test('storage unavailable safely falls back to session-only key',()=>{
 const s={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
 assert.equal(loadDirectorKey(s),'');assert.equal(saveDirectorKey('no',{store:s}),false);assert.equal(clearDirectorKey(s),false);
});
