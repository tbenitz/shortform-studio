/** Real Chromium smoke of new roadmap wave controls, not a substitute for owner acceptance. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
const fixture='qa-wave-test.webm';
await stat(fixture);
const server=spawn('python3',['-m','http.server','8805','--directory','.'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<40;i++){
  try{await page.goto('http://127.0.0.1:8805/',{waitUntil:'domcontentloaded',timeout:3000});break}
  catch(e){if(i===39)throw e;await new Promise(r=>setTimeout(r,150))}
 }
 await page.waitForSelector('#openCommandPalette',{timeout:10000});
 await page.locator('#openCommandPalette').click();
 await page.locator('.command-palette-dialog input').fill('Production');
 await page.locator('.command-palette-dialog input').press('Enter');
 if(!(await page.locator('[data-tab="tools"]').getAttribute('class')).includes('active'))
  throw Error('Ctrl+K palette could not open Production Tools.');
 await page.locator('#fileUpload').setInputFiles(fixture);
 await page.waitForFunction(()=>document.querySelectorAll('#videoTrack [data-seg]').length>=1,null,{timeout:12000});
 await page.locator('[data-tab="tools"]').click();
 await page.locator('#sourceHealthDetails summary').click();
 const health=await page.locator('#sourceHealthDetails').innerText();
 if(!health.includes('timed words')||!health.includes('gaps'))
  throw Error('No genuine transcript coverage summary: '+health);
 const downloaded=page.waitForEvent('download',{timeout:10000});
 await page.locator('#toolsExportSourceHealth').click();
 const download=await downloaded;
 const bytes=await readFile(await download.path());
 const report=JSON.parse(bytes.toString('utf8'));
 if(report.verifiedSpeechCoverage!==false||!report.sources?.length)
  throw Error('Transcript report falsely claims verified speech or omits sources.');
 await page.locator('#toolsEvidenceSearch').fill('qa-wave-test');
 if(!(await page.locator('#toolsEvidenceResults').innerText()).includes('qa-wave-test'))
  throw Error('Evidence search did not match a real uploaded filename.');
 await page.locator('#toolsMarkTranscriptGaps').click();
 if(await page.locator('[data-marker-timeline]').count()<1)
  throw Error('No review markers created for an actual untranscribed edited source window.');
 await page.locator('#visualHealthDetails summary').click();
 await page.locator('#toolsScanVisual').click();
 await page.waitForFunction(()=>/Scan completed/.test(document.querySelector('#toolsVisualScanStatus')?.textContent||''),
  null,{timeout:110000});
 const count=await page.locator('#visualHealthDetails').innerText();
 if(!count.includes('decoded samples'))throw Error('Actual decoded source frames were not reported: '+count);
 const visualDownload=page.waitForEvent('download',{timeout:10000});
 await page.locator('#toolsExportVisual').click();
 const vfile=await visualDownload;const meta=JSON.parse((await readFile(await vfile.path())).toString('utf8'));
 const v=Object.values(meta.reports||{})[0];
 if(v?.kind!=='shortform-source-visual-samples-v1'||v?.sampleCount<5||v?.verifiedExport!==false)
  throw Error('Visual report missing real samples or implying export passed: '+JSON.stringify(meta));
 await page.keyboard.press('Control+k');
 await page.locator('.command-palette-dialog input').fill('qa-wave-test');
 await page.locator('.command-palette-dialog input').press('Enter');
 if(!(await page.locator('[data-tab="media"]').getAttribute('class')).includes('active'))
  throw Error('Command palette failed to jump to actual source.');
 if(errors.length)throw Error('Browser JS exceptions: '+errors.join(' | '));
 console.log('PASS: Original transcript gaps, bookmarks, source search, decoded-frame sampling, JSON reports and Ctrl+K browser navigation');
}finally{await browser?.close();server.kill('SIGTERM')}
