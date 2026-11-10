import test from 'node:test';
import assert from 'node:assert/strict';
import {transcriptCoverage,searchProjectEvidence,makeTranscriptReviewMarkers,sourceHealthHTML,evidenceSearchHTML} from '../src/source-health.js';

function project(){
 return {
  assets:[{id:'a',name:'Long gameplay video.mp4',type:'video',duration:120},{id:'b',name:'Second camera.mp4',type:'video',duration:80}],
  words:[
   {assetId:'a',start:16,end:17,text:'that',speaker:'Speaker 1'},
   {assetId:'a',start:17,end:18,text:'was',speaker:'Speaker 1'},
   {assetId:'a',start:18,end:19,text:'hilarious',speaker:'Speaker 1',timing:'estimated'},
   {assetId:'a',start:61,end:62,text:'laugh',speaker:'Speaker 2'},
   {assetId:'a',start:61,end:62,text:'laugh',speaker:'Speaker 2'},
   {assetId:'a',start:-5,end:3,text:'invalid'},
   {assetId:'a',start:500,end:510,text:'outside recording'}
  ],
  transcriptProgress:{a:{status:'paused',nextAt:64,total:120}},
  segments:[{id:'cut1',assetId:'a',start:0,end:80,speed:1,title:'Intro banter',notes:'hilarious quote'}],
  markers:[{id:'mark1',kind:'review',time:4,label:'Check punchline'}],
  candidates:[{id:'draft1',title:'Funny lobby chat',segments:[{assetId:'a',start:16,end:22}]}]
 };
}
test('finds original timed word coverage without claiming actual silence',()=>{
 const report=transcriptCoverage(project());
 assert.equal(report.sourceCount,2);
 assert.equal(report.verifiedSpeechCoverage,false);
 assert.ok(report.sources[0].missingTranscriptIntervals.some(g=>g.kind==='opening'&&g.start===0&&g.end===16));
 assert.ok(report.sources[0].missingTranscriptIntervals.some(g=>g.kind==='internal'));
 assert.ok(report.sources[1].missingTranscriptIntervals.some(g=>g.kind==='entire-source'));
 assert.equal(report.sources[0].estimatedTimingWords,1);
 assert.equal(report.sources[0].invalidTimingWords,1);
 assert.equal(report.sources[0].outOfRangeWords,1);
 assert.equal(report.sources[0].savedProcessing.nextAt,64);
 assert.ok(report.sources[0].suspectedRepeatedWords.length>=1);
});
test('search matches actual source names, phrase, notes, markers and proposals',()=>{
 const p=project();
 for(const q of ['gameplay','was hilarious','Intro banter','punchline','lobby chat']){
  assert.ok(searchProjectEvidence(p,q).length>0,q);
 }
 assert.deepEqual(searchProjectEvidence(p,'unseen mystery'),[]);
 assert.ok(searchProjectEvidence(p,'was hilarious').some(x=>x.kind==='transcript'&&x.start===16));
});
test('limited review bookmarks remain attached to actual cut and are deduplicated',()=>{
 const p=project(),report=transcriptCoverage(p);
 const marks=makeTranscriptReviewMarkers(p,report,{limit:30});
 assert.ok(marks.length>0);
 assert.ok(marks.every(m=>m.kind==='review'&&m.time>=0&&m.time<80));
 assert.ok(marks.every(m=>m.label.includes('Transcript review')));
 p.markers.push(...marks);
 assert.equal(makeTranscriptReviewMarkers(p,report).length,0);
});
test('HTML escapes source filenames and untrusted transcript text',()=>{
 const p=project();p.assets[0].name='<img src=x onerror=alert(1)>';
 p.words.push({assetId:'a',start:90,end:92,text:'<script>alert(1)</script>'});
 assert.ok(sourceHealthHTML(p).includes('&lt;img'));
 assert.ok(!sourceHealthHTML(p).includes('<img src=x'));
 assert.ok(evidenceSearchHTML(p,'<script>').includes('&lt;script&gt;'));
});
test('no word timestamps does not mean proven silence, and zero-duration is not a percent',()=>{
 const report=transcriptCoverage({assets:[{id:'z',name:'audio',duration:0}],words:[]});
 assert.equal(report.sources[0].coverageRatio,null);
 assert.equal(report.sources[0].wordCount,0);
 assert.match(report.note,/not listened/i);
});
