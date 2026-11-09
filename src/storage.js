const DB='shortform-studio-v1',VERSION=1;let openPromise;
function openDB(){if(!('indexedDB'in window))return Promise.reject(Error('IndexedDB unavailable'));if(!openPromise)openPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{const db=req.result;for(const n of ['projects','media'])if(!db.objectStoreNames.contains(n))db.createObjectStore(n)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return openPromise}
async function trans(store,mode,cb){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode),s=tx.objectStore(store),req=cb(s);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.onerror=()=>reject(tx.error)})}
export const saveProject=p=>trans('projects','readwrite',s=>s.put(p,'current'));
export const loadProject=()=>trans('projects','readonly',s=>s.get('current'));
export const saveMedia=(id,file)=>trans('media','readwrite',s=>s.put(file,id));
export const loadMedia=id=>trans('media','readonly',s=>s.get(id));
export const deleteMedia=id=>trans('media','readwrite',s=>s.delete(id));
export async function clearMedia(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('media','readwrite');tx.objectStore('media').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
export async function quota(){if(!navigator.storage?.estimate)return null;return navigator.storage.estimate()}

/** Named project metadata snapshots; original media stays in the existing media store. */
export const saveSnapshot=snapshot=>trans('projects','readwrite',store=>store.put(snapshot,'snapshot:'+snapshot.id));
export const loadSnapshot=id=>trans('projects','readonly',store=>store.get('snapshot:'+id));
export const deleteSnapshot=id=>trans('projects','readwrite',store=>store.delete('snapshot:'+id));
export async function listSnapshots(projectId){
 const rows=await trans('projects','readonly',store=>store.getAll());
 return rows.filter(s=>s&&s.project&&s.projectId===projectId&&s.id).sort((a,b)=>b.createdAt-a.createdAt);
}
