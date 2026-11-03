/** Copy Mediabunny's published ESM bundle into our same-origin static website. */
import {mkdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const src=path.join(root,'node_modules/mediabunny/dist/bundles/mediabunny.mjs');
const dst=path.join(root,'vendor/mediabunny/mediabunny.mjs');
await mkdir(path.dirname(dst),{recursive:true});
await copyFile(src,dst);
if((await stat(dst)).size<10000)throw Error('Mediabunny ES module unexpectedly small');
console.log('Packaged pinned Mediabunny streaming media reader.');
