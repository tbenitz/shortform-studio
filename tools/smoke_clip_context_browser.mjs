/** Chromium regression: real original-footage clip expansion, Undo and simplified finder. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {stat} from 'node:fs/promises';
await stat('qa-wave-test.webm');
const server=spawn('python3',['-m','http.server','8823'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 for(let n=0;n<35;n++){try{await page.goto('http://127.0.0.1:8823/',{waitUntil:'domcontentloaded',timeout:3000});break}catch(e){if(n===34)throw e;await new Promise(r=>setTimeout(r,200))}}
 await page.locator('#fileUpload').setInputFiles('qa-wave-test.webm');
 await page.waitForFunction(()=>document.querySelectorAll('#videoTrack [data-seg]').length>=1,null,{timeout:16000});
 await page.locator('#quickOpenTranscript').click();
 await page.locator('#srtUpload').setInputFiles({name:'actual-dialogue.srt',mimeType:'text/plain',buffer:Buffer.from(
  '1\n00:00:01,000 --> 00:00:03,000\nWhat happened with the helicopter?\n\n'+
  '2\n00:00:05,000 --> 00:00:07,000\nYou crashed it into a tree!\n\n'+
  '3\n00:00:08,000 --> 00:00:10,000\nHahaha that was the funniest landing!\n'
 )});
 await page.waitForFunction(()=>document.querySelector('#transcriptRows')?.textContent?.includes('helicopter'),null,{timeout:6000});
 await page.locator('[data-tab="editor"]').click();
 await page.locator('#videoTrack [data-seg]').first().click();
 await page.locator('[data-edit="start"]').fill('4');await page.locator('[data-edit="start"]').press('Tab');
 await page.locator('[data-edit="end"]').fill('8');await page.locator('[data-edit="end"]').press('Tab');
 const initial=await page.locator('[data-edit="end"]').inputValue();
 if(Math.abs(Number(initial)-8)>.01)throw Error('Failed to edit original source in/out');
 await page.locator('#extendClipAfter5').click();
 if(Math.abs(Number(await page.locator('[data-edit="end"]').inputValue())-13)>.01)
  throw Error('Editor +5 seconds did not add original footage after the selection.');
 await page.keyboard.press('Control+z');
 if(Math.abs(Number(await page.locator('[data-edit="end"]').inputValue())-8)>.01)
  throw Error('Undo failed to restore the source clip end.');
 await page.locator('#extendClipBefore5').click();
 if(Number(await page.locator('[data-edit="start"]').inputValue())!==0)
  throw Error('Editor before-extension did not clamp at original 0s.');
 await page.locator('#completeClipExchange').click();
 if(Number(await page.locator('[data-edit="end"]').inputValue())<10)
  throw Error('Whole-conversation tool failed to retain the original SRT reaction.');
 console.log('PASS: Exact original source In/Out, +5 after, Undo, +5 before clamp, full SRT exchange.');
 await page.locator('[data-tab="media"]').click();
 await page.locator('#quickFindClips').click();
 await page.locator('#humorFindLocal').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-humor-expand]').length>=1,null,{timeout:12000});
 await page.locator('#humorFindCompilation').click();
 if(!(await page.locator('#humorFindCompilation').getAttribute('class')).includes('primary'))
  throw Error('Guided compilation selection did not activate.');
 await page.locator('#humorFindLocal').click();
 const before=await page.locator('.humor-card').first().innerText();
 await page.locator('[data-humor-expand]').first().click();
 const after=await page.locator('.humor-card').first().innerText();
 if(!/00:00/.test(before)||!/00:00/.test(after))
  throw Error('Original-source suggestion timestamps missing before or after extension.');
 await page.locator('[data-humor-toggle]').first().click();
 await page.locator('#humorBuild').click();
 await page.waitForFunction(()=>document.querySelector('[data-tab="editor"].active'),null,{timeout:10000});
 console.log('PASS: Guided clip/story/compilation modes, real original funny-context expansion and timeline build.');
 if(errors.length)throw Error('Uncaught browser errors: '+errors.join(' | '));
}finally{await browser?.close();server.kill('SIGTERM')}
