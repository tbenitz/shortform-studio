import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEditorialDirection,matchEditorialDirection,editorialDirectionKey} from '../src/director-intent.js';
test('trolling and reviving are different editorial requests',()=>{
 const troll=parseEditorialDirection('Find funny enemy trolling in proximity chat; no boring dialogue-only clips');
 const revives=parseEditorialDirection('Only revives and rescue clutch moments, no trash talk');
 assert.ok(troll.focus.includes('trolling')&&troll.focus.includes('enemychat'));
 assert.ok(revives.focus.includes('revive')&&revives.exclude.includes('trashtalk'));
 assert.notEqual(editorialDirectionKey({directorInstructions:'Find trolling'}),editorialDirectionKey({directorInstructions:'Find revives'}));
});
test('opponent voice conversation is only possible when dialogue explicitly indicates it',()=>{
 const ask=parseEditorialDirection('only enemy proximity chat trolling');
 assert.equal(matchEditorialDirection(ask,['possible-action','trash','laugh']).eligible,false);
 assert.equal(matchEditorialDirection(ask,['enemychat','trash','laugh']).eligible,true);
});
test('explicit negatives exclude the unwanted moments',()=>{
 const ask=parseEditorialDirection('Funny trash talk, avoid downed and revive clips');
 assert.deepEqual(ask.exclude.sort(),['down','revive']);
 assert.equal(matchEditorialDirection(ask,['trash','down']).eligible,false);
 assert.equal(matchEditorialDirection(ask,['trash','laugh']).eligible,true);
});
test('never turn an unrecognized creative request into a claim of detected enemies',()=>{
 const ask=parseEditorialDirection('show random things');
 assert.equal(ask.focus.length,0);
 assert.equal(matchEditorialDirection(ask,['possible-action']).eligible,true);
});

test('enemy OR teammate trolling can match either category without fabricating enemy audio',()=>{
 const opts=parseEditorialDirection('trolling enemy proximity chat or teammate banter');
 assert.ok(opts.focus.includes('enemychat')&&opts.focus.includes('squadbanter'));
 assert.equal(matchEditorialDirection(opts,['troll','squadbanter']).eligible,true);
 assert.equal(matchEditorialDirection(opts,['troll','enemychat']).eligible,true);
});

test('taunting in an opponent voice interaction is a possible trolling candidate without requiring laughter',()=>{
 const profile=parseEditorialDirection('ONLY enemy proximity chat trolling');
 assert.equal(matchEditorialDirection(profile,['enemychat','trash']).eligible,true);
 assert.equal(matchEditorialDirection(profile,['spotted','possible-action']).eligible,false);
});
