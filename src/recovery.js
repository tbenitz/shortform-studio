import {createSnapshot} from './production-tools.js';
/** Bounded browser-only project recovery metadata, never original media bytes. */
export const RECOVERY_INTERVAL_MS=5*60*1000;
export const MAX_AUTO_RECOVERY_POINTS=8;
export function automaticRecoveryDue(rows,projectId,now=Date.now(),interval=RECOVERY_INTERVAL_MS){
 const past=(rows||[]).filter(r=>r?.automatic===true&&r.projectId===projectId&&Number.isFinite(r.createdAt));
 if(!past.length)return true;
 return now-Math.max(...past.map(r=>r.createdAt))>=interval;
}
export function buildAutomaticRecovery(project,id,now=Date.now()){
 const snapshot=createSnapshot(project,'Automatic recovery · '+new Date(now).toLocaleString(),id,now);
 return {...snapshot,automatic:true,kind:'recovery'};
}
export function staleAutomaticRecovery(rows,{limit=MAX_AUTO_RECOVERY_POINTS}={}){
 const automatic=(rows||[]).filter(x=>x?.automatic===true&&x.id).slice().sort((a,b)=>b.createdAt-a.createdAt);
 return automatic.slice(Math.max(1,limit)).map(x=>x.id);
}
