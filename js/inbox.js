// Diem — boîte de réception Claude.
// Dans n'importe quelle conversation Claude, la compétence « diem » dépose un fichier JSON dans le dossier
// « Diem · boîte de réception » de ton Google Drive (connecteur Drive). Diem lit ces fichiers à chaque synchro :
//  - kind « add »     : ce que tu as demandé toi-même, ajouté directement ;
//  - kind « suggest » : des suggestions tirées de tes conversations, présentées par le Génie (à accepter une par une).
// Diem ne fait que lire (accès drive.readonly) ; les fichiers déjà traités sont retenus par leur identifiant.
const INBOX_NAME='Diem · boîte de réception';
let inboxBusy=false,inboxState='';
function inboxWanted(){return !!lsGet('journee.g.inbox')}
function inboxOk(){return !!gTok()&&/auth\/drive(\.readonly)?(\s|$)/.test(gScope())}
function inboxAllow(){lsSet('journee.g.inbox','1');gLogin()}
function inboxStop(){lsDel('journee.g.inbox');const t=gTok();
 if(t){toast('Lien avec Claude arrêté : reconnexion à Google…');fetch('https://oauth2.googleapis.com/revoke?token='+encodeURIComponent(t),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'}}).catch(()=>{}).finally(()=>{lsDel('journee.g');setTimeout(()=>gLogin(),600)});return}
 render()}

async function inboxPoll(){
 if(!inboxOk()||inboxBusy)return;inboxBusy=true;
 try{
  let fid=S.settings.inboxFolder;
  if(!fid){const q=encodeURIComponent(`name='${INBOX_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
   const l=await (await dfetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`)).json();
   fid=l.files&&l.files[0]&&l.files[0].id;if(!fid){inboxState='Dossier pas encore créé : il le sera à ta première demande dans Claude.';return}
   S.settings.inboxFolder=fid}
  const q=encodeURIComponent(`'${fid}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`);
  const l=await (await dfetch(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime&pageSize=100&fields=files(id,name,createdTime)`)).json();
  const seen=new Set(S.settings.inboxSeen||[]);let n=0;
  for(const f of l.files||[]){if(seen.has(f.id))continue;
   let j=null;try{j=JSON.parse(await (await dfetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`)).text())}catch(e){j=null}
   if(j&&j.diem&&j.kind!=='test')n+=inboxApply(j,f.id);
   seen.add(f.id)}
  S.settings.inboxSeen=[...seen].slice(-400);
  inboxState='Vérifiée à '+hm(new Date());
  if(n){genRecurring();save();render();renderSide&&renderSide()}
  else if(seen.size!==(S.settings.inboxSeen||[]).length)save();
 }catch(e){inboxState='Erreur : '+e.message;if(/insufficient|scope|403/i.test(e.message))inboxState='Accès Drive manquant : clique « Autoriser » à nouveau.'}
 finally{inboxBusy=false;document.querySelectorAll('[data-live="inbox"]').forEach(x=>x.textContent=inboxState)}
}

/* ---------- lecture d'un fichier ---------- */
const ixDay=d=>{if(!d)return undefined;if(d==='backlog')return null;if(d==='today'||d==='aujourd’hui'||d==='aujourd\'hui')return today();if(d==='tomorrow'||d==='demain')return addDays(today(),1);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:undefined};
const ixCat=n=>{if(!n)return null;const c=(typeof findNode==='function'&&findNode(n))||chByName(n);return c?c.id:null};
const DOWS=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
function ixLabel(it){
 const ty=it.type||'task',x=it.title||it.name||it.quick||'';
 if(ty==='project')return 'Projet : '+x+(it.tasks&&it.tasks.length?' · '+it.tasks.length+' tâche'+(it.tasks.length>1?'s':''):'');
 if(ty==='routine')return 'Routine : '+x+' ('+(RULES[it.rule]||'chaque semaine').toLowerCase()+')';
 if(ty==='habit')return 'Habitude : '+x;
 return 'Tâche : '+x+(it.est?' ('+fmtMin(+it.est)+')':'');
}
// une tâche : la syntaxe rapide (« quick ») et/ou des champs explicites, qui priment
function ixTask(it,proj,uidp){
 const q=parseQuick(it.quick||it.title||'');if(!q.title)return null;
 let day=ixDay(it.day);if(day===undefined)day=q.day!==undefined?q.day:(proj?null:today());
 const id=uidp||uid();if(T(id))return null;
 const pj=proj||(it.project&&findProject(it.project))||null;
 const t=mk({id,title:it.title&&it.quick?it.title:q.title,est:+it.est||q.est||0,channel:ixCat(it.cat||it.category)||q.channel||(hasTree()?ruleFor(q.title):null),day,order:nextOrder(day),
  due:ixDay(it.due)||q.due||null,proj:pj?(pj.id||pj):q.proj||null,prio:it.prio==='high'||it.prio==='low'?it.prio:q.prio||'',where:it.where||q.where||'',notes:it.notes||'',
  subtasks:(it.subtasks||[]).filter(Boolean).map(s=>({id:uid(),t:String(s),d:false})),from:'claude'});
 S.tasks.push(t);
 const at=it.at||(q.at!=null?String(Math.floor(q.at/60)).padStart(2,'0')+':'+String(q.at%60).padStart(2,'0'):null);
 if(at&&t.day&&/^\d{1,2}:\d{2}$/.test(at)&&typeof setBlock==='function'){const[hh,mm]=at.split(':').map(Number),dt=parseYmd(t.day);dt.setHours(hh,mm,0,0);t.pinned=true;setBlock(t,dt,true)}
 return t}
function ixApplyOne(it,key){
 const ty=it.type||'task';
 if(ty==='project'){
  const name=(it.name||it.title||'').trim();if(!name)return 0;
  if((S.projects||[]).some(p=>p.id===key))return 0;
  S.projects=S.projects||[];const pj={id:key,name,end:/^\d{4}-\d{2}-\d{2}$/.test(it.end||'')?it.end:null,done:false,notes:it.notes||''};S.projects.push(pj);
  (it.tasks||[]).forEach((x,i)=>ixTask(typeof x==='string'?{quick:x}:x,pj,key+'-'+i));return 1}
 if(ty==='routine'){
  const title=(it.title||it.name||'').trim();if(!title||S.recurring.some(r=>r.id===key))return 0;
  const rule=RULES[it.rule]?it.rule:'weekly',from=ixDay(it.from)||today();
  let dow=typeof it.dow==='number'?it.dow:DOWS.indexOf(String(it.dow||'').toLowerCase());if(dow<0)dow=parseYmd(from).getDay();
  S.recurring.push({id:key,title,channel:ixCat(it.cat),est:+it.est||0,notes:it.notes||'',subs:(it.subtasks||[]).map(String),from,skip:[],rule,dow,dom:+it.dom||parseYmd(from).getDate()});return 1}
 if(ty==='habit'){
  const name=(it.name||it.title||'').trim();if(!name||(S.habits||[]).some(h=>h.id===key))return 0;
  const freq=['daily','days','week'].includes(it.freq)?it.freq:'daily';
  S.habits=S.habits||[];S.habits.push({id:key,name,kind:it.kind==='quit'?'quit':'build',freq,days:(it.days||[1,2,3,4,5]).map(d=>typeof d==='number'?d:DOWS.indexOf(String(d).toLowerCase())).filter(d=>d>=0),n:+it.n||3,
   channel:ixCat(it.cat),icon:HB_ICONS.some(x=>x[0]===it.icon)?it.icon:'spark',est:+it.est||0,toDay:!!(it.toDay&&it.kind!=='quit'),paused:false,log:{},skip:[],created:Date.now(),order:Math.max(0,...S.habits.map(x=>x.order||0))+1});return 1}
 return ixTask(it,null,key)?1:0}

function inboxApply(j,fileId){
 const items=(Array.isArray(j.items)?j.items:[]).filter(x=>x&&typeof x==='object'||typeof x==='string').map(x=>typeof x==='string'?{quick:x}:x);if(!items.length)return 0;
 const base='cx'+fileId.slice(-8);
 if(j.kind==='suggest'){
  S.chat=S.chat||[];
  S.chat.push({role:'assistant',text:'Suggestions tirées de tes conversations Claude'+(j.note?' : '+j.note:'.'),prop:{cx:items,cxBase:base},at:Date.now(),from:'claude'});
  S.chat=S.chat.slice(-30);aiUnread++;if(typeof renderBadge==='function')renderBadge();toast('Le Génie a '+items.length+' suggestion'+(items.length>1?'s':'')+' tirée'+(items.length>1?'s':'')+' de tes conversations');return 1}
 let n=0;items.forEach((it,i)=>{n+=ixApplyOne(it,base+'-'+i)});
 if(n){S.chat=S.chat||[];S.chat.push({role:'assistant',text:'Ajouté depuis Claude'+(j.note?' ('+j.note+')':'')+' :\n'+items.map(it=>'• '+ixLabel(it)).join('\n'),at:Date.now(),from:'claude'});S.chat=S.chat.slice(-30);
  toast(n+' élément'+(n>1?'s':'')+' ajouté'+(n>1?'s':'')+' depuis Claude')}
 return n}

function inboxSettingsHtml(){
 const ok=inboxOk();
 return `<section><h2>Claude : tes conversations</h2><p>Dans n’importe quelle conversation Claude, dis « ajoute ça dans Diem » ou demande un plan d’attaque : Claude dépose tes tâches, projets, routines et habitudes dans le dossier « ${INBOX_NAME} » de ton Drive, et Diem les ajoute. Les suggestions tirées de tes conversations arrivent dans l’onglet du Génie, à accepter une par une.</p>
  <div class="connrow"><b>Google Drive</b><span class="mute">Lecture seule</span><span class="sp"></span><span class="status${ok?' on':''}">${ok?'Relié':'Non relié'}</span>${ok?'<button class="sm" data-act="inboxnow">Vérifier</button><button class="sm ghost" data-act="inboxstop">Arrêter</button>':`<button class="sm" data-act="inboxallow" ${S.settings.googleClientId?'':'disabled'}>Autoriser</button>`}</div>
  ${ok?`<p class="mute" style="font-size:13px;margin:6px 0 0" data-live="inbox">${esc(inboxState||'Vérifiée à chaque synchro.')}</p>`:''}
  <p class="mute" style="font-size:13px;margin:8px 0 0">Avant d’autoriser : ajoute l’accès <code>drive.readonly</code> à Diem dans la console Google Cloud, sinon Google refusera.</p></section>`}
