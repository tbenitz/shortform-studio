import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
const range=(start,end)=>{const a=readme.indexOf(start),b=readme.indexOf(end,a+start.length);if(a<0||b<a)throw Error('README roadmap section anchors changed');return readme.slice(a,b)};

test('one stable original PLAN checklist entry per 100 owner approval IDs',()=>{
 const ids=[...readme.matchAll(/^- \[[ x]\] \*\*PLAN-(\d{3})\*\* — \*\*Master ([A-Z]+-\d{3})\*\*/gm)];
 assert.equal(ids.length,100);
 assert.equal(new Set(ids.map(m=>m[1])).size,100);
 assert.deepEqual(ids.map(m=>Number(m[1])),Array.from({length:100},(_,i)=>i+1));
});
test('engineering progress board tracks all 100 milestones with explicit engineering status',()=>{
 const board=range('### Engineering status board — PLAN-001–PLAN-100','#### New owner acceptance checks');
 const lines=[...board.matchAll(/^\| \[[ x]\] PLAN-(\d{3}) \| ([A-Z]+-\d{3}) \| (.+?) \| (.*?) \|$/gm)];
 assert.equal(lines.length,100);
 assert.equal(new Set(lines.map(m=>m[1])).size,100);
 const statuses=['Not started','In development','Ready for owner review (partial slice)'];
 for(const row of lines){
  assert.ok(statuses.some(s=>row[3].startsWith(s)),'unexpected status '+row[3]);
  assert.ok(row[4].trim(),'missing scope for PLAN-'+row[1]);
 }
 const counts=statuses.map(status=>lines.filter(row=>row[3].startsWith(status)).length);
 assert.equal(counts.reduce((a,b)=>a+b,0),100);
});
test('100 new brainstorm proposals are individually numbered and unapproved by default',()=>{
 const idea=range('### New unstarted idea backlog — IDEA-001–IDEA-100','### Implementation batch — available');
 const hits=[...idea.matchAll(/^- \[([ x])\] \*\*IDEA-(\d{3})\*\* (.+)$/gm)];
 assert.equal(hits.length,100);
 assert.deepEqual(hits.map(x=>Number(x[2])),Array.from({length:100},(_,i)=>i+1));
 assert.ok(hits.every(x=>x[1]===' '),'new ideas must begin unchecked');
 const started=new Set(['001','002','010']);
 for(const item of hits){
  assert.ok(started.has(item[2])?/Ready for owner review \(partial slice\)/.test(item[3]):/Not started/.test(item[3]),'idea status requires real code, not just a proposal: IDEA-'+item[2]);
 }
});
test('new release acceptance checks exist but implementation cannot auto-approve them',()=>{
 const block=range('#### New owner acceptance checks R96–R101','### New unstarted idea backlog');
 for(let i=96;i<=101;i++){
  assert.match(block,new RegExp('^- \\[ \\] \\*\\*R'+i+'\\*\\*','m'));
 }
 assert.match(readme,/Only the repository owner/);
});
