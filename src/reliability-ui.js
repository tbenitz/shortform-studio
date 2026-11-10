import {filterLibraryProjects} from './project-library.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function reliabilityToolsHTML(project,libraryRows=[],search='',showArchived=false,sourceCheck=null){
 const visible=filterLibraryProjects(libraryRows,search,showArchived);
 const rows=visible.map(entry=>
  '<article class="library-entry">'+
  '<div class="row between wrap"><b>'+escape(entry.name)+'</b><small>'+(entry.archived?'Archived':'Saved')+' · '+new Date(entry.updatedAt||0).toLocaleString()+'</small></div>'+
  '<p class="tiny muted">'+(Number(entry.sourceCount)||0)+' sources · '+(Number(entry.cutCount)||0)+' edited cuts · Metadata only, no embedded video</p>'+
  '<div class="row wrap">'+
  '<button class="small" data-library-load="'+escape(entry.id)+'">Open</button>'+
  '<button class="small" data-library-copy="'+escape(entry.id)+'">Duplicate</button>'+
  '<button class="small" data-library-archive="'+escape(entry.id)+'">'+(entry.archived?'Unarchive':'Archive')+'</button>'+
  '<button class="small danger" data-library-delete="'+escape(entry.id)+'">Delete</button>'+
  '</div></article>').join('')||'<p class="tiny muted">No saved projects match this search. Save the current project to create your first library entry.</p>';
 const sourceRows=(sourceCheck?.sources||[]).map(x=>'<div class="production-issue tiny" data-severity="'+(x.status==='mismatch'||x.status==='missing'||x.status==='error'?'warning':'info')+'">'+
  '<b>'+escape(String(x.status).toUpperCase())+' · '+escape(x.name)+'</b>'+escape(x.reason)+'</div>').join('');
 const totals=sourceCheck?sourceCheck.matched+'/'+sourceCheck.total+' sampled fingerprints matched · '+sourceCheck.mismatched+' mismatch(es) · '+sourceCheck.missing+' missing · '+sourceCheck.unverified+' unverified':
  'No source identity scan yet. Source matching uses bounded SHA-256 samples; it is not a full-file hash or video corruption scan.';
 return '<h3>Project library</h3><p class="tiny muted">Save multiple named project versions locally, reopen any one, duplicate an editable project, or archive it. Your last-saved startup button remains separate. Shared original media are not copied; browser permission may require relinking.</p>'+
 '<button class="primary full" id="toolsSaveLibrary">Save current project to library</button>'+
 '<label class="field">Search saved projects or their source filenames<input id="toolsLibrarySearch" value="'+escape(search)+'" placeholder="Search saved projects…"></label>'+
 '<label class="checkrow"><input id="toolsLibraryArchived" type="checkbox" '+(showArchived?'checked':'')+'>Show archived projects</label>'+
 '<p class="tiny muted">'+libraryRows.length+' project record(s) stored · '+visible.length+' shown</p>'+
 '<div id="toolsLibraryList" class="production-list">'+rows+'</div><div class="separator"></div>'+
 '<h3>Original file integrity</h3><p class="tiny muted">Check connected original recordings against their saved sampled fingerprints. Uses at most 1 MiB per file, regardless of recording length. It will not silently replace changed sources. A sample match does not guarantee the complete file is uncorrupted.</p>'+
 '<button id="toolsVerifySources" class="full" '+(project?.assets?.length?'':'disabled')+'>Verify original media now</button>'+
 '<p id="toolsVerifyStatus" class="tiny muted">'+escape(totals)+'</p>'+
 '<div id="toolsVerifyResults" class="production-list">'+sourceRows+'</div><div class="separator"></div>'+
 '<h3>Verified portable backup</h3><p class="tiny muted">Downloads editable project metadata with a SHA-256 integrity check. Original media and API keys are not embedded. Restoring a corrupt backup is blocked before overwriting your project.</p>'+
 '<button id="toolsExportBackup" class="full">Download verified project backup (.json)</button>'+
 '<label class="field">Verify and restore saved backup<input id="toolsImportBackup" type="file" accept=".json,application/json"></label>'+
 '<p class="tiny muted">A backup restores editing, transcript and source references. Reconnect originals if browser permission has expired.</p><div class="separator"></div>';
}
