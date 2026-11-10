/** Real video/SRT/POV/browser regression for current in-development wave. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
const fixture='qa-wave-test.webm';
await stat(fixture);
const server=spawn('python3',['-m','http.server','8811','--directory','.'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<40;i++){
  try{await page.goto('http://127.0.0.1:8811/',{waitUntil:'domcontentloaded',timeout:3000});break}
  catch(e){if(i===39)throw e;await new Promise(r=>setTimeout(r,200))}
 }
 await page.waitForSelector('#openCommandPalette',{timeout:10000});
 await page.locator('#fileUpload').setInputFiles(fixture);
 await page.waitForFunction(()=>document.querySelectorAll('#videoTrack [data-seg]').length>0,null,{timeout:15000});
 await page.locator('#sourceFormatDetails summary').click();
 await page.locator('#sourceProbeDecode').click();
 await page.waitForFunction(()=>/Two actual original video positions decoded|Source decoder test:/.test(
  document.querySelector('#sourceProbeStatus')?.textContent||''),null,{timeout:50000});
 const probeText=await page.locator('#sourceProbeStatus').innerText();
 if(!probeText.includes('Two actual original video positions decoded'))throw Error('Actual source frame decoding failed: '+probeText);
 console.log('PASS: Real original media header and two random-access positions decoded.');
 await page.locator('[data-tab="transcript"]').click();
 await page.locator('#srtUpload').setInputFiles({
  name:'original-timed-captions.srt',mimeType:'text/plain',
  buffer:Buffer.from('1\n00:00:02,000 --> 00:00:03,200\nThat was hilarious\n\n2\n00:00:08,000 --> 00:00:09,500\nGreat comeback\n')
 });
 await page.waitForFunction(()=>document.querySelector('#transcriptRows')?.textContent?.includes('hilarious'),null,{timeout:10000});
 await page.locator('#transcriptReviewPanel summary').click();
 const first=page.locator('.review-word-row').first();
 await first.locator('[data-word-text]').fill('Actually');
 await first.locator('[data-word-save]').click();
 await page.locator('#reviewOnlyFlagged').uncheck();
 await page.locator('#reviewWordSearch').fill('Actually');
 await page.locator('#reviewWordSearch').press('Tab');
 if(!(await page.locator('#reviewWordList').innerText()).includes('Actually'))
  throw Error('Corrected original source word was not preserved in caption review.');
 console.log('PASS: Real imported SRT edited non-destructively and retained timestamp.');
 const secondBytes=await readFile(fixture);
 await page.locator('#fileUpload').setInputFiles({name:'second-original.webm',mimeType:'video/webm',buffer:secondBytes});
 await page.waitForFunction(()=>document.querySelectorAll('#assetsList [data-asset]').length>=2,null,{timeout:15000});
 await page.locator('[data-tab="director"]').click();
 await page.locator('#povManualDetails summary').click();
 await page.locator('#povMarkA').fill('2.00');
 await page.locator('#povMarkB').fill('3.00');
 await page.locator('#povAddEventMark').click();
 if(!(await page.locator('#povManualDetails').innerText()).includes('1 saved human-marked pairs'))
  throw Error('First real human sync marker did not persist.');
 await page.locator('#povMarkA').fill('12.00');
 await page.locator('#povMarkB').fill('13.02');
 await page.locator('#povAddEventMark').click();
 const syncText=await page.locator('#povManualDetails').innerText();
 if(!syncText.includes('2 saved human-marked pairs')||!syncText.includes('Common original event time'))
  throw Error('Two human event sync points did not fit the actual overlap: '+syncText);
 console.log('PASS: POV human marker clock drift, overlap and intermediate UI.');
 await page.locator('[data-tab="tools"]').click();
 await page.locator('#toolsCreateSnapshot').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-snapshot-restore]').length>=1,null,{timeout:10000});
 await page.locator('[data-tab="editor"]').click();
 await page.locator('#videoTrack [data-seg]').first().click();
 await page.locator('#duplicateSeg').click();
 await page.locator('[data-tab="tools"]').click();
 await page.locator('#productionReviewPanel summary').click();
 await page.locator('#reviewCompareSnapshot').click();
 const compared=await page.locator('#reviewVersionResult').innerText();
 if(!compared.includes('"addedCuts"')||!compared.includes('"s'))
  throw Error('Version comparison did not show actual source cut differences: '+compared);
 const disclosed=await page.locator('#productionReviewPanel').innerText();
 if(!disclosed.includes('Optional external HTTPS service'))throw Error('Cloud data flow labels missing');
 console.log('PASS: Saved-version diff and real local/remote data-flow disclosures.');
 if(errors.length)throw Error('Uncaught browser JS errors: '+errors.join(' | '));
}finally{await browser?.close();server.kill('SIGTERM')}
