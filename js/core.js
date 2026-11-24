// Diem — utilitaires, données, horodatage, tâches, récurrence, minuteur
/* ---------- configuration (identifiants par défaut, remplis à l'installation) ---------- */
const CONFIG={googleClientId:'24499808678-iini1scq6npi7bqrj4n8vnvclnljmgr9.apps.googleusercontent.com',msClientId:''};
/* ---------- utilitaires ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseYmd=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=parseYmd(s);d.setDate(d.getDate()+n);return ymd(d)};
const today=()=>ymd(new Date());
const monday=s=>{const d=parseYmd(s);d.setDate(d.getDate()-(d.getDay()+6)%7);return ymd(d)};
const fmtMin=m=>{m=Math.round(m||0);if(m<60)return m+' min';const h=Math.floor(m/60),r=m%60;return h+' h'+(r?' '+pad(r):'')};
const fmtDay=(s,o)=>parseYmd(s).toLocaleDateString('fr-FR',o||{weekday:'long',day:'numeric',month:'long'});
const hm=d=>pad(d.getHours())+':'+pad(d.getMinutes());
const cap1=s=>s.charAt(0).toUpperCase()+s.slice(1);
const clock=sec=>{sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return (h?h+':'+pad(m):m)+':'+pad(s)};
const strip=h=>{try{return new DOMParser().parseFromString(h||'','text/html').body.textContent.trim()}catch(e){return ''}};
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const lsDel=k=>{try{localStorage.removeItem(k)}catch(e){}};

/* ---------- données ---------- */
const KEY='journee.v1';
const defaults=()=>({tasks:[],recurring:[],objectives:[],days:{},weeks:{},running:null,seeded:false,
 channels:[],projects:[],
 settings:{googleClientId:'',msClientId:'',calendarId:'primary',todoList:'',dayStart:7,dayEnd:21,workStart:9,workEnd:18,aiKey:'',aiModel:'claude-haiku-5-5',aiAuto:true,aiBudget:3,notif:false},chat:[],archive:[],templates:[]});
let S;
try{S=Object.assign(defaults(),JSON.parse(lsGet(KEY)||'{}'))}catch(e){S=defaults()}
S.settings=Object.assign(defaults().settings,S.settings||{});
(S.tasks||[]).forEach(t=>{if(t.prio==='urgent')t.prio='high'});
if(!S.settings.googleClientId)S.settings.googleClientId=CONFIG.googleClientId;
if(!S.settings.msClientId)S.settings.msClientId=CONFIG.msClientId;
let pushT=null,snap=null;
/* ---------- horodatage par élément (base de la synchro par fusion) ---------- */
const COLL=['tasks','objectives','templates','recurring','channels','projects'],MAPS=['days','weeks'],SCAL=['dump','evMode','settings','chat','aiUsage'];
function scalJson(k){return JSON.stringify(S[k]===undefined?null:S[k])}
function stamp(){
 const now=Date.now(),prev=snap,next={};S.deleted=S.deleted||{};S.su=S.su||{};
 const mark=(k,x)=>{const {u,...r}=x,j=JSON.stringify(r);next[k]=j;if(prev?prev[k]!==j:!x.u)x.u=now};
 for(const c of COLL)for(const x of S[c]||[])mark(c+':'+x.id,x);
 for(const c of MAPS)for(const [key,v] of Object.entries(S[c]||{}))if(v&&typeof v==='object')mark(c+':'+key,v);
 for(const k of SCAL){const j=scalJson(k);next['s:'+k]=j;if(prev&&prev['s:'+k]!==j)S.su[k]=now}
 if(prev)for(const k in prev)if(!(k in next)&&COLL.some(c=>k.startsWith(c+':')))S.deleted[k]=now;
 const lim=now-60*864e5;for(const k in S.deleted)if(S.deleted[k]<lim)delete S.deleted[k];
 snap=next;
}
function mergeState(L,R){
 // fusion élément par élément : pour chaque tâche, objectif, jour… la version la plus récente gagne ; les suppressions sont respectées
 const out=Object.assign({},L),del=Object.assign({},L.deleted||{});
 for(const [k,v] of Object.entries(R.deleted||{}))del[k]=Math.max(del[k]||0,v);
 for(const c of COLL){const m=new Map();for(const x of R[c]||[])m.set(x.id,x);for(const x of L[c]||[]){const r=m.get(x.id);if(!r||(x.u||0)>=(r.u||0))m.set(x.id,x)}out[c]=[...m.values()].filter(x=>!((del[c+':'+x.id]||0)>(x.u||0)))}
 for(const c of MAPS){out[c]=Object.assign({},R[c]||{});for(const [k,v] of Object.entries(L[c]||{})){const r=out[c][k];if(!r||((v&&v.u)||0)>=((r&&r.u)||0))out[c][k]=v}}
 const ids=new Set((L.archive||[]).map(a=>a.id));out.archive=[...(L.archive||[]),...(R.archive||[]).filter(a=>!ids.has(a.id))];
 out.su=Object.assign({},L.su||{});
 for(const k of SCAL){const lu=(L.su||{})[k]||0,ru=(R.su||{})[k]||0;if(ru>lu){out[k]=R[k];out.su[k]=ru}}
 // la clé Claude n'est jamais effacée par un appareil qui ne l'a pas encore
 out.settings=Object.assign({},out.settings||{});if(!(out.settings.aiKey||'').trim())out.settings.aiKey=((L.settings||{}).aiKey||(R.settings||{}).aiKey||'');
 out.deleted=del;out.seeded=true;return out;
}
const dataJson=x=>{const {running,syncedAt,updatedAt,...r}=x;return JSON.stringify(r)};
const save=()=>{S.updatedAt=Date.now();stamp();lsSet(KEY,JSON.stringify(S));clearTimeout(pushT);pushT=setTimeout(()=>driveSync(),1500);if(typeof queueFlow==='function')queueFlow()};
const mk=o=>Object.assign({id:uid(),title:'',notes:'',channel:null,est:0,actual:0,day:null,done:false,doneAt:null,subtasks:[],order:0,objId:null,recurId:null,src:null,block:null,prio:'',due:null,proj:null},o);
const T=id=>S.tasks.find(t=>t.id===id);
const ch=id=>S.channels.find(c=>c.id===id);
const nextOrder=day=>Math.max(0,...S.tasks.filter(t=>t.day===day).map(t=>t.order||0))+1;
const dayTasks=d=>S.tasks.filter(t=>t.day===d).sort((a,b)=>(a.done-b.done)||(a.order-b.order));
// heures de la journée : celles choisies ce jour-là, sinon la journée type des réglages (en heures décimales)
function dayHours(d){const i=S.days[d]||{},s=S.settings;const hs=typeof i.hs==='number'?i.hs:s.workStart,he=typeof i.he==='number'?i.he:s.workEnd;const eff=i.energy==='low'?Math.max(hs+0.5,he-1):he;return{s:hs,e:Math.max(eff,hs+0.25),end:he,set:typeof i.hs==='number'}}
const hhmm=h=>pad(Math.floor(h))+':'+pad(Math.round((h%1)*60));
const pastUndone=()=>S.tasks.filter(t=>t.day&&t.day<today()&&!t.done).sort((a,b)=>a.day<b.day?-1:1);
const actualSec=t=>(t.actual||0)+(S.running&&S.running.taskId===t.id?(Date.now()-S.running.start)/1000:0);
const weekObjs=w=>[];// objectifs de la semaine retirés (v1.0.3) : les projets les remplacent ; les anciens restent stockés

stamp();
if(!S.seeded){
 S.seeded=true;const d=today();
 [['Exemple : préparer le rendez-vous de lundi',d,'c-organisation',45],['Exemple : répondre aux mails importants',d,'c-admin',30],['Exemple : courses pour le week-end',d,'c-courses',30],['Exemple : renouveler l’assurance auto',null,'c-admin',20],['Exemple : trier les photos de vacances',null,'c-deco',60]]
  .forEach(([title,day,channel,est],i)=>S.tasks.push(mk({title,day,channel,est,order:i+1})));
 save();
}

/* ---------- état d'interface ---------- */
const VIEWS=['today','week','dump','backlog','review','objectives','stats','settings','tree'];
let view='today',cur=today(),sideTab='cal',modalTask=null,ritual=null,focusOn=null,focusSub=null,drag=null,scrolledCal='',lastDay=today();
let gEvents={},gLoading={};
const todo={lists:null,listId:S.settings.todoList||null,tasks:{},loading:false,tLoading:false};

/* ---------- bus d'événements (point d'accroche des futurs modules : gamification, import…) ---------- */
const bus=new EventTarget();
const emit=(type,detail)=>{try{bus.dispatchEvent(new CustomEvent(type,{detail}))}catch(e){}};
window.journee={bus,get state(){return S},save:()=>save(),render:()=>render(),get fn(){return {dayTasks,today,addDays,loadInfo,pushBlock,monday,hasTree,nodeLabel,findNode,applyTree,pathOf,nodeCal,taskCal}}};

/* ---------- tâches ---------- */
const norm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function dateWord(w){
 const t0=today(),WD=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];w=norm(w).trim();let m;
 if(/^(aujourd'?hui|aujourd’hui|auj)$/.test(w))return t0;
 if(/^apres-?demain$/.test(w))return addDays(t0,2);
 if(w==='demain')return addDays(t0,1);
 const k=WD.indexOf(w);if(k>=0){const c=parseYmd(t0).getDay();return addDays(t0,((k-c+7)%7)||7)}
 if((m=w.match(/^(\d{1,2})\/(\d{1,2})$/))){const y=new Date().getFullYear();let d=ymd(new Date(y,+m[2]-1,+m[1]));if(d<t0)d=ymd(new Date(y+1,+m[2]-1,+m[1]));return d}
 if(/^\d{4}-\d\d-\d\d$/.test(w))return w;
 return null;
}
function parseQuick(txt){
 let est=0,channel=null,pj=null;
 txt=(' '+txt+' ').replace(/\s~?(\d{1,2})\s?h\s?(\d{1,2})?(?=\s)/i,(m,h,mm)=>{est=+h*60+(+mm||0);return ' '})
  .replace(/\s~?(\d{1,3})\s?(?:m|min|mn)(?=\s)/i,(m,n)=>{est=+n;return ' '})
  .replace(/\s#(\S+)/,(m,n)=>{const c=findNode(n);if(c){channel=c.id;return ' '}return m})
  .replace(/\s\+(\S+)/,(m,n)=>{const p=findProject(n);if(p){pj=p.id;return ' '}return m});
 let day,due;const t0=today(),WD=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
 txt=txt.replace(/\s(?:avant|pour|d'ici)\s+(le\s+)?(aujourd['’]hui|demain|après-demain|apres-demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}\/\d{1,2})(?=\s)/i,(m,le,w)=>{const d=dateWord(w);if(d){due=d;return ' '}return m});
 txt=txt.replace(/\s(aujourd['’]hui|auj)(?=\s)/i,()=>{day=t0;return ' '})
  .replace(/\s(après-demain|apres-demain)(?=\s)/i,()=>{day=addDays(t0,2);return ' '})
  .replace(/\s(demain)(?=\s)/i,()=>{day=addDays(t0,1);return ' '})
  .replace(/\s(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?=\s)/i,(m,w)=>{const k=WD.indexOf(w.toLowerCase()),c=parseYmd(t0).getDay();day=addDays(t0,((k-c+7)%7)||7);return ' '})
  .replace(/\s(\d{1,2})\/(\d{1,2})(?=\s)/,(m,dd,mm)=>{const y=new Date().getFullYear();let d=ymd(new Date(y,+mm-1,+dd));if(d<t0)d=ymd(new Date(y+1,+mm-1,+dd));day=d;return ' '});
 return {title:txt.trim().replace(/\s+/g,' '),est,channel,day,due,proj:pj};
}
function addTask(text,day){
 const q=parseQuick(text);if(!q.title)return null;if(q.day!==undefined)day=q.day;
 if(!q.channel&&hasTree())q.channel=ruleFor(q.title);
 const t=mk({title:q.title,est:q.est,channel:q.channel,day,order:nextOrder(day),due:q.due||null,proj:q.proj||null});
 S.tasks.push(t);save();render();aiWatch(t);emit('task:add',{task:t});return t;
}
async function toggleDone(id){
 const t=T(id);if(!t)return;
 if(S.running&&S.running.taskId===id)stopTimer();
 t.done=!t.done;t.doneAt=t.done?Date.now():null;if(t.done&&!t.day)t.day=today();
 if(t.done)finishBlock(t);
 save();render();if(t.done)chime(660);emit(t.done?'task:done':'task:undone',{task:t});
 if(t.block&&t.block.gcalId&&gTok())gFetch(`/calendars/${blkCal(t)}/events/${encodeURIComponent(t.block.gcalId)}`,{method:'PATCH',body:JSON.stringify({summary:(t.done?'✓ ':'')+t.title})}).catch(()=>{});
 if(t.src&&msOn()){
  try{await graph(`/me/todo/lists/${encodeURIComponent(t.src.listId)}/tasks/${encodeURIComponent(t.src.taskId)}`,{method:'PATCH',body:JSON.stringify({status:t.done?'completed':'notStarted'})});delete todo.tasks[t.src.listId];renderSide()}
  catch(e){toast('To Do : '+e.message)}
 }
}
// priorité : 'high' (drapeau plein) · '' (normale, sans drapeau) · 'low' (peut glisser)
const PRIOS=[['high','Haute'],['','Normale'],['low','Basse']];
const flagSvg=p=>`<svg class="flag ${p||'mid'}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M5 4h11l-2 4 2 4H5" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="${p==='high'?'currentColor':'none'}"${p==='low'?' stroke-dasharray="2.5 2.5"':''}/></svg>`;
// une date prévue ne peut pas dépasser l'échéance : on garde le dernier jour possible et on propose de repousser l'échéance
function allowedDay(t,day){
 if(!day||!t.due||day<=t.due)return day;
 const last=t.due<today()?today():t.due;
 toast(`Échéance le ${fmtDay(t.due,{weekday:'long',day:'numeric',month:'short'})} : la tâche reste ${last===today()?'aujourd’hui':'le '+fmtDay(last,{weekday:'long',day:'numeric'})}`,'Repousser l’échéance',()=>{t.due=day;moveTask(t.id,day)});
 return last;
}
function moveTask(id,to,noRender){
 const t=T(id);if(!t)return;
 let day=to==='backlog'?null:to;day=allowedDay(t,day);
 if(t.block&&ymd(new Date(t.block.start))!==day)clearBlock(t,true);
 t.day=day;if(day)t.inbox=false;t.order=nextOrder(day);save();if(!noRender)render();
}
function deleteTask(id){
 const t=T(id);if(!t)return;
 if(S.running&&S.running.taskId===id)S.running=null;
 if(t.recurId){const r=S.recurring.find(x=>x.id===t.recurId);if(r&&t.day){r.skip=r.skip||[];r.skip.push(t.day)}}
 if(t.block)clearBlock(t,true);
 S.tasks=S.tasks.filter(x=>x!==t);save();
}
function rolloverAll(to){
 for(const t of pastUndone()){if(t.recurId)deleteTask(t.id);else moveTask(t.id,to,true)}
 save();render();
}
function renorm(day){dayTasks(day).forEach((t,i)=>t.order=i+1)}

/* ---------- récurrence ---------- */
const RULES={daily:'Tous les jours',weekdays:'Jours ouvrés (lun–ven)',weekly:'Chaque semaine',monthly:'Chaque mois'};
function matches(r,day){const d=parseYmd(day),w=d.getDay();switch(r.rule){case'daily':return true;case'weekdays':return w>0&&w<6;case'weekly':return w===r.dow;case'monthly':return d.getDate()===r.dom}return false}
function genRecurring(){
 const t0=today();let changed=false;
 for(let i=0;i<7;i++){const day=addDays(t0,i);
  for(const r of S.recurring){
   if(day<r.from||(r.skip||[]).includes(day)||!matches(r,day))continue;
   if(S.tasks.some(t=>t.recurId===r.id&&t.day===day))continue;
   S.tasks.push(mk({title:r.title,channel:r.channel,est:r.est,notes:r.notes||'',day,recurId:r.id,order:nextOrder(day),subtasks:(r.subs||[]).map(x=>({id:uid(),t:x,d:false}))}));changed=true;
  }}
 if(changed)save();
}
function setRecur(t,rule){
 let r=t.recurId&&S.recurring.find(x=>x.id===t.recurId);
 if(!rule){
  if(r){S.recurring=S.recurring.filter(x=>x!==r);S.tasks=S.tasks.filter(x=>!(x.recurId===r.id&&x!==t&&!x.done&&x.day&&x.day>(t.day||today())))}
  t.recurId=null;return;
 }
 if(!t.day)t.day=today();
 if(!r){r={id:uid(),title:t.title,channel:t.channel,est:t.est,notes:t.notes,subs:t.subtasks.map(s=>s.t),from:t.day,skip:[]};S.recurring.push(r);t.recurId=r.id}
 const b=parseYmd(t.day);r.rule=rule;r.dow=b.getDay();r.dom=b.getDate();
 S.tasks=S.tasks.filter(x=>!(x.recurId===r.id&&x!==t&&!x.done&&x.day>t.day&&!matches(r,x.day)));
 genRecurring();
}

/* ---------- minuteur ---------- */
function startTimer(id){stopTimer();S.running={taskId:id,start:Date.now()};save();render()}
function stopTimer(){if(!S.running)return;const t=T(S.running.taskId);if(t)t.actual=Math.round((t.actual||0)+(Date.now()-S.running.start)/1000);S.running=null;save()}
let actx=null;
function chime(f){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f||880;o.type='sine';g.gain.setValueAtTime(.0001,actx.currentTime);g.gain.exponentialRampToValueAtTime(.18,actx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+.5);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+.55)}catch(e){}}

// Apparence : fonds neutres, mode clair/sombre, une couleur d'accent
const ACCENTS=[{k:'peche',n:'Pêche',l:'#C9714A',d:'#E8A283'},{k:'sauge',n:'Sauge',l:'#4F7D57',d:'#8DBA96'},{k:'lavande',n:'Lavande',l:'#625CA8',d:'#A9A3E6'},{k:'or',n:'Or mat',l:'#94731F',d:'#D4B05A'},{k:'ardoise',n:'Bleu ardoise',l:'#41679E',d:'#86A8D8'},{k:'petrole',n:'Pétrole',l:'#26737A',d:'#6DC0C4'}];
function applyLook(){const s=S.settings||{},r=document.documentElement,a=ACCENTS.find(x=>x.k===s.accent)||ACCENTS[0];r.dataset.accent=a.k;if(s.mode==='light'||s.mode==='dark')r.dataset.theme=s.mode;else delete r.dataset.theme;const dark=s.mode==='dark'||(s.mode!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);const m=document.querySelector('meta[name=theme-color]');if(m)m.content=dark?'#141415':'#f6f6f5'}

// Priorité : la tâche se place en tête (haute), après les hautes (normale) ou en fin (basse), sans bouger les autres
function placeByPrio(t){if(!t||!t.day||t.done)return;const rk=x=>x.prio==='high'?0:x.prio==='low'?2:1;
 const L=dayTasks(t.day).filter(x=>!x.done&&x!==t),r=rk(t);let i;
 if(r===2)i=L.length;else{i=0;L.forEach((x,k)=>{if(rk(x)<r)i=k+1})}
 L.splice(i,0,t);L.forEach((x,k)=>x.order=k+1);dayTasks(t.day).filter(x=>x.done).forEach((x,k)=>x.order=L.length+k+1)}

// Projets en cours : progression et échéance, pour la semaine et la revue
function projListHtml(w){const ps=activeProjects().sort((a,b)=>(a.end||'9')<(b.end||'9')?-1:1),we=w?addDays(w,6):null;
 return ps.length?`<div class="rlist">${ps.map(p=>{const g=projProgress(p.id),soon=we&&p.end&&p.end<=we;return `<div class="rrow${soon?' hot':''}"><div><b>${esc(p.name)}</b><small>${g.n?`${g.done}/${g.n} tâches faites`:'Aucune tâche liée — ajoute +'+esc(p.name.split(' ')[0].toLowerCase())+' en créant une tâche'}${p.end?' · fin '+fmtDay(p.end,{day:'numeric',month:'short'})+(soon?' (cette semaine)':''):''}</small></div></div>`}).join('')}</div>`:'<p class="mute">Aucun projet en cours. Crée-en un dans Réglages › Projets.</p>'}
