import test from 'node:test';
import assert from 'node:assert/strict';
import {projectAudit,cutSheetCSV,chaptersText,cleanMarkers,createSnapshot,sourceMatch,csvCell} from '../src/production-tools.js';
const project=()=>({
 id:'project-1',name:'Session',assets:[{id:'a',name:'=SUM(1,2).mp4',size:100,duration:90,url:'blob:test'}],
 segments:[{id:'s',assetId:'a',start:10,end:35,speed:1,notes:'Keep action',title:'Intro'}],
 audio:[],words:[{assetId:'a',start:11,end:11.3,text:'hello',speaker:'Alex'}],
 markers:[{id:'m',time:0,label:'Opening',kind:'chapter'},{id:'z',time:12,label:'Encounter',kind:'chapter'}],
 transcriptGaps:{},faceTracks:{},sceneTracks:{}
});
test('audit is metadata-based and identifies missing sources and transcript gaps',()=>{
 const p=project();p.assets[0].url=undefined;p.transcriptGaps={a:[[11,12]]};p.words[0].timing='estimated';
 const q=projectAudit(p);assert.equal(q.stats.videoClips,1);assert.equal(q.stats.unresolvedGapCount,1);
 assert(q.issues.some(i=>i.title==='Media needs relinking'));assert(q.issues.some(i=>i.title==='Approximate transcript timing'));
 assert.match(q.note,/Metadata-only/);
});
test('cut sheet includes source time and safeguards spreadsheet formulas',()=>{
 const csv=cutSheetCSV(project());
 assert.match(csv,/10.000/);assert.match(csv,/35.000/);
 assert.match(csv,/'=SUM\(1,2\)/);assert.match(csv,/Keep action/);
 assert.equal(csvCell('hello "friend"'),'"hello ""friend"""');
});
test('chapters sort and remove invalid entries',()=>{
 const p=project();p.markers.reverse();p.markers.push({id:'x',time:999,label:'Outside',kind:'chapter'});
 assert.equal(chaptersText(p),'0:00:00 Opening\n0:00:12 Encounter\n');
 assert.equal(cleanMarkers(p.markers,25).length,2);
});
test('snapshot strips runtime URLs without mutating original project',()=>{
 const p=project();const s=createSnapshot(p,'First','id-1',1000);
 assert.equal(s.name,'First');assert.equal(s.project.assets[0].url,undefined);
 assert.equal(p.assets[0].url,'blob:test');assert.equal(s.project.id,p.id);
});
test('source search filters words across sources',()=>{
 const p=project();p.words.push({assetId:'a',start:18,end:18.4,text:'World',speaker:'Alex'});
 assert.equal(sourceMatch(p,'world').length,1);
 assert.equal(sourceMatch(p,'',50).length,0);
});

test('phrase search matches consecutive words only and preserves source reference',()=>{
 const p=project();
 p.words.push({assetId:'a',start:11.4,end:11.7,text:'there!',speaker:'Alex'});
 p.words.push({assetId:'a',start:30,end:30.3,text:'there',speaker:'Alex'});
 assert.equal(sourceMatch(p,'hello there').length,1);
 assert.equal(sourceMatch(p,'HELLO there!')[0].start,11);
 assert.equal(sourceMatch(p,'hello there world').length,0);
});
test('transcript source search handles empty and punctuation-only queries',()=>{
 assert.deepEqual(sourceMatch(project(),'***'),[]);
 assert.deepEqual(sourceMatch(project(),'   '),[]);
});
