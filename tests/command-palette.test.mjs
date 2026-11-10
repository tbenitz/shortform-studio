import test from 'node:test';
import assert from 'node:assert/strict';
import {PALETTE_DESTINATIONS,searchPaletteItems} from '../src/command-palette.js';

const project={
 assets:[{id:'a',name:'Tournament Replay.mp4',duration:800}],
 words:[{assetId:'a',start:33,end:33.4,text:'funny'},{assetId:'a',start:33.4,end:34,text:'moment'}],
 segments:[{id:'s1',assetId:'a',start:31,end:38,speed:1,title:'Great punchline',notes:'A funny moment'}],
 markers:[{id:'m1',time:6,kind:'review',label:'Review quote'}],
 candidates:[]
};
test('has all real available editor tabs, not nonexistent settings',()=>{
 const names=PALETTE_DESTINATIONS.map(x=>x.id);
 assert.deepEqual(names,['media','transcript','director','humor','editor','export','tools','settings']);
});
test('empty search shows actions, no fabricated media results',()=>{
 const items=searchPaletteItems(project,'');
 assert.equal(items.length,PALETTE_DESTINATIONS.length);
 assert.ok(items.every(x=>x.kind==='navigate'));
});
test('search can find direct navigation and original timed evidence',()=>{
 const tools=searchPaletteItems(project,'Production');
 assert.ok(tools.some(x=>x.kind==='navigate'&&x.id==='tools'));
 const found=searchPaletteItems(project,'funny moment');
 assert.ok(found.some(x=>x.kind==='evidence'&&x.evidence.kind==='transcript'&&x.evidence.start===33));
 const source=searchPaletteItems(project,'Tournament Replay');
 assert.ok(source.some(x=>x.kind==='evidence'&&x.evidence.assetId==='a'));
});
test('no results without real source evidence and preserves bounds',()=>{
 assert.deepEqual(searchPaletteItems(project,'nonexistent phrase'),[]);
 assert.ok(searchPaletteItems(project,'video',{maxResults:2}).length<=2);
});
