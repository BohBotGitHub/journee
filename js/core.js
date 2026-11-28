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
const defaults=()=>({habits:[],tasks:[],recurring:[],objectives:[],days:{},weeks:{},running:null,seeded:false,
 channels:[],projects:[],
 settings:{googleClientId:'',msClientId:'',calendarId:'primary',todoList:'',dayStart:7,dayEnd:21,workStart:9,workEnd:18,jobStart:9,jobEnd:18,travel:60,allDayStart:8,allDayEnd:18,aiKey:'',aiModel:'claude-haiku-5-5',aiAuto:true,aiBudget:3,notif:false},chat:[],archive:[],templates:[]});
let S;
try{S=Object.assign(defaults(),JSON.parse(lsGet(KEY)||'{}'))}catch(e){S=defaults()}
S.settings=Object.assign(defaults().settings,S.settings||{});
(S.tasks||[]).forEach(t=>{if(t.prio==='urgent')t.prio='high'});
if(!S.settings.googleClientId)S.settings.googleClientId=CONFIG.googleClientId;
if(!S.settings.msClientId)S.settings.msClientId=CONFIG.msClientId;
let pushT=null,snap=null,syncTried=false;
/* ---------- horodatage par élément (base de la synchro par fusion) ---------- */
const COLL=['tasks','objectives','templates','recurring','channels','projects','habits'],MAPS=['days','weeks'],SCAL=['dump','evMode','settings','chat','aiUsage','merged','running']; // running : le focus en cours, partagé entre appareils
function scalJson(k){return JSON.stringify(S[k]===undefined?null:S[k])}
const AUTOF=['block','order','roll','rf','rfAt','pinned','inbox'];
function stamp(){
 const now=Date.now(),prev=snap,next={};S.deleted=S.deleted||{};S.su=S.su||{};
 const mark=(k,x)=>{if(x.rfAt&&now-x.rfAt>3000&&prev&&prev[k]!==undefined){const {u:_u,rf:_a,rfAt:_b,...o}=x,{rf:_c,rfAt:_d,...p}=JSON.parse(prev[k]);if(JSON.stringify(o)!==JSON.stringify(p)){delete x.rf;delete x.rfAt}}
  const {u,uu,...r}=x,j=JSON.stringify(r);next[k]=j;
  if(prev?prev[k]!==j:!x.u){x.u=now;
   // uu = dernier changement fait par toi (pas par le placement automatique) : c'est lui qui compte face à une suppression
   let auto=false;if(prev&&prev[k]!==undefined){try{const p=JSON.parse(prev[k]),strip=o=>{const c=Object.assign({},o);for(const f of AUTOF)delete c[f];return JSON.stringify(c)};auto=strip(p)===strip(r)}catch(e){}}
   if(x.rfAt&&now-x.rfAt<3000)auto=true; // report automatique du matin
   if(!auto)x.uu=now}};
 for(const c of COLL)for(const x of S[c]||[])mark(c+':'+x.id,x);
 for(const c of MAPS)for(const [key,v] of Object.entries(S[c]||{}))if(v&&typeof v==='object')mark(c+':'+key,v);
 for(const k of SCAL){const j=scalJson(k);next['s:'+k]=j;if(prev&&prev['s:'+k]!==j)S.su[k]=now}
 // réglages horodatés un par un : un appareil qui change un réglage n'écrase plus les autres (ex. la couleur d'accent)
 for(const [k,v] of Object.entries(S.settings||{})){const j=JSON.stringify(v===undefined?null:v);next['st:'+k]=j;if(prev&&prev['st:'+k]!==j)S.su['set.'+k]=now}
 if(prev)for(const k in prev)if(!(k in next)&&COLL.some(c=>k.startsWith(c+':')))S.deleted[k]=now;
 const lim=now-60*864e5;for(const k in S.deleted)if(S.deleted[k]<lim)delete S.deleted[k];
 snap=next;
}
function mergeState(L,R){
 // fusion élément par élément : pour chaque tâche, objectif, jour… la version la plus récente gagne ; les suppressions sont respectées
 const out=Object.assign({},L),del=Object.assign({},L.deleted||{});
 for(const [k,v] of Object.entries(R.deleted||{}))del[k]=Math.max(del[k]||0,v);
 for(const c of COLL){const m=new Map();for(const x of R[c]||[])m.set(x.id,x);for(const x of L[c]||[]){const r=m.get(x.id);if(!r)m.set(x.id,x);else{const lw=(x.u||0)>=(r.u||0),stale=lw?(x.rf!==undefined&&(r.u||0)>x.rf&&!r.rf):(r.rf!==undefined&&(x.u||0)>r.rf&&!x.rf);if(lw!==stale)m.set(x.id,x)}}out[c]=[...m.values()].filter(x=>!((del[c+':'+x.id]||0)>(x.uu||x.u||0)))}
 for(const c of MAPS){out[c]=Object.assign({},R[c]||{});for(const [k,v] of Object.entries(L[c]||{})){const r=out[c][k];if(!r||((v&&v.u)||0)>=((r&&r.u)||0))out[c][k]=v}}
 const ids=new Set((L.archive||[]).map(a=>a.id));out.archive=[...(L.archive||[]),...(R.archive||[]).filter(a=>!ids.has(a.id))];
 out.su=Object.assign({},L.su||{});
 for(const k of SCAL){const lu=(L.su||{})[k]||0,ru=(R.su||{})[k]||0;if(ru>lu){out[k]=R[k];out.su[k]=ru}}
 // réglages fusionnés réglage par réglage, le plus récent gagne
 {const ls=L.settings||{},rs=R.settings||{},lsu=L.su||{},rsu=R.su||{},st={};
  for(const k of new Set([...Object.keys(ls),...Object.keys(rs)])){const lu=lsu['set.'+k]||0,ru=rsu['set.'+k]||0;
   if(!(k in ls))st[k]=rs[k];else if(!(k in rs))st[k]=ls[k];else if(ru>lu){st[k]=rs[k];out.su['set.'+k]=ru}else if(lu>ru){st[k]=ls[k];out.su['set.'+k]=lu}else st[k]=(out.settings||{})[k]!==undefined?out.settings[k]:ls[k]}
  out.settings=st}
 // la clé Claude n'est jamais effacée par un appareil qui ne l'a pas encore
 out.settings=Object.assign({},out.settings||{});if(!(out.settings.aiKey||'').trim())out.settings.aiKey=((L.settings||{}).aiKey||(R.settings||{}).aiKey||'');
 out.deleted=del;out.seeded=true;return out;
}
const dataJson=x=>{const {running,syncedAt,updatedAt,...r}=x;return JSON.stringify(r)};
const save=()=>{S.updatedAt=Date.now();stamp();lsSet(KEY,JSON.stringify(S));clearTimeout(pushT);pushT=setTimeout(()=>driveSync(),1500);if(typeof queueFlow==='function')queueFlow()};
const mk=o=>Object.assign({created:Date.now(),id:uid(),title:'',notes:'',channel:null,est:0,actual:0,day:null,done:false,doneAt:null,subtasks:[],order:0,objId:null,recurId:null,src:null,block:null,prio:'',due:null,proj:null},o);
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
const VIEWS=['today','week','dump','habits','backlog','review','objectives','stats','projects','settings','tree'];
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
 let est=0,channel=null,pj=null,prio='',where='',at=null,badCat=null;
 // « à 14h », « 9h30 » : une heure de la journée ; « 1h », « 2h30 » : une durée (au-delà de 4 h, c'est une heure)
 txt=(' '+txt+' ').replace(/\s(?:à\s)?(\d{1,2})\s?h\s?(\d{2})?(?=\s)/i,(m,h,mm)=>{h=+h;mm=+mm||0;if(/^\sà\s/i.test(m)||h>=5){if(h<24&&mm<60){at=h*60+mm;return ' '}return m}est=h*60+mm;return ' '})
  .replace(/\s~?(\d{1,3})\s?(?:m|min|mn)(?=\s)/i,(m,n)=>{est=+n;return ' '})
  .replace(/\s#(\S+)/,(m,n)=>{const c=findNode(n);if(c){channel=c.id;return ' '}badCat=n;return m})
  .replace(/\s\+(\S+)/,(m,n)=>{const p=findProject(n);if(p){pj=p.id;return ' '}return m})
  .replace(/\s!{1,3}(?=\s)/,()=>{prio='high';return ' '}).replace(/\s(?:!bas|↓)(?=\s)/i,()=>{prio='low';return ' '})
  .replace(/\s@(maison|chez-?moi|home)(?=\s)/i,()=>{where='home';return ' '}).replace(/\s@(dehors|ext|out)(?=\s)/i,()=>{where='out';return ' '}).replace(/\s@(partout|ordi|boulot|any)(?=\s)/i,()=>{where='any';return ' '});
 let day,due;const t0=today(),WD=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
 txt=txt.replace(/\s(?:avant|pour|d'ici)\s+(le\s+)?(aujourd['’]hui|demain|après-demain|apres-demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}\/\d{1,2})(?=\s)/i,(m,le,w)=>{const d=dateWord(w);if(d){due=d;return ' '}return m});
 txt=txt.replace(/\s(aujourd['’]hui|auj)(?=\s)/i,()=>{day=t0;return ' '})
  .replace(/\s(après-demain|apres-demain)(?=\s)/i,()=>{day=addDays(t0,2);return ' '})
  .replace(/\s(demain)(?=\s)/i,()=>{day=addDays(t0,1);return ' '})
  .replace(/\s(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?=\s)/i,(m,w)=>{const k=WD.indexOf(w.toLowerCase()),c=parseYmd(t0).getDay();day=addDays(t0,((k-c+7)%7)||7);return ' '})
  .replace(/\s(\d{1,2})\/(\d{1,2})(?=\s)/,(m,dd,mm)=>{const y=new Date().getFullYear();let d=ymd(new Date(y,+mm-1,+dd));if(d<t0)d=ymd(new Date(y+1,+mm-1,+dd));day=d;return ' '});
 return {title:txt.trim().replace(/\s+/g,' '),est,channel,day,due,proj:pj,prio,where,at,badCat};
}
// catégorie déjà donnée à une tâche du même nom (routines, modèles, récurrences)
function catGuess(title){const n=(title||'').trim().toLowerCase();if(!n)return null;const x=S.tasks.find(t=>t.channel&&(t.title||'').trim().toLowerCase()===n);if(x)return x.channel;const a=(S.archive||[]).find(a=>a.c&&(a.t||'').trim().toLowerCase()===n);if(a)return a.c;return typeof hasTree==='function'&&hasTree()?ruleFor(title)||null:null}
function addTask(text,day){
 const q=parseQuick(text);if(!q.title)return null;if(q.day!==undefined)day=q.day;
 if(!q.channel&&hasTree())q.channel=ruleFor(q.title);
 const le=q.est?0:learnedEst(q.title);
 const t=mk({title:q.title,est:q.est||le,channel:q.channel,day,order:nextOrder(day),due:q.due||null,proj:q.proj||null,prio:q.prio||'',where:q.where||''});if(le)t.estLearn=1;
 S.tasks.push(t);placeNew(t);
 if(q.at!=null&&t.day&&typeof setBlock==='function'){const dt=parseYmd(t.day);dt.setMinutes(q.at);t.pinned=true;setBlock(t,dt,true)}
 save();render();aiWatch(t);emit('task:add',{task:t});return t;
}
async function toggleDone(id){
 const t=T(id);if(!t)return;
 if(S.running&&S.running.taskId===id)stopTimer();
 t.done=!t.done;t.doneAt=t.done?Date.now():null;if(t.done&&!t.day)t.day=today();
 if(t.habitId&&typeof H==='function'){const h=H(t.habitId);if(h&&t.day){h.log=Object.assign({},h.log||{});if(t.done)h.log[t.day]=1;else delete h.log[t.day]}}
 // faite maintenant alors qu'elle était prévue plus tard (ou un autre jour) : on la range dans l'agenda juste avant l'heure actuelle
 if(t.done){const now=Date.now(),later=t.day!==today()||(t.block&&+new Date(t.block.start)>now);
  if(later&&typeof setRange==='function'){const mins=t.actual>=60?Math.round(t.actual/60):(t.est||15);t.pinned=true;setRange(t,new Date(now-mins*60000),new Date(now),true)}else finishBlock(t)}
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
 if(t.habitId&&typeof H==='function'){const h=H(t.habitId);if(h&&t.day){h.skip=(h.skip||[]).concat(t.day)}}
 if(t.block)clearBlock(t,true);
 S.tasks=S.tasks.filter(x=>x!==t);save();
}
function rolloverAll(to){
 for(const t of pastUndone()){if(t.recurId)deleteTask(t.id);else moveTask(t.id,to,true)}
 save();render();
}
function renorm(day){dayTasks(day).forEach((t,i)=>t.order=i+1)}
// une tâche reportée à un autre jour passe devant ce qui y était déjà prévu (l'ordre entre elles est gardé)
function putFront(ids,day){if(!day||day==='backlog')return;const set=new Set(ids),mv=ids.map(T).filter(t=>t&&t.day===day&&!t.done).sort((a,b)=>(a.order||0)-(b.order||0));if(!mv.length)return;
 const rest=dayTasks(day).filter(t=>!set.has(t.id)),lo=rest.length?Math.min(...rest.map(t=>t.order||0)):1;mv.forEach((t,i)=>t.order=lo-mv.length+i);renorm(day)}

/* ---------- récurrence ---------- */
const RULES={daily:'Tous les jours',weekdays:'Jours ouvrés (lun–ven)',weekly:'Chaque semaine',monthly:'Chaque mois'};
function matches(r,day){const d=parseYmd(day),w=d.getDay();switch(r.rule){case'daily':return true;case'weekdays':return w>0&&w<6;case'weekly':return w===r.dow;case'monthly':return d.getDate()===r.dom}return false}
// place d'une routine dans la journée : en haut, en bas, ou « Génie » (là où tu as l'habitude de la mettre)
const RECPOS={bottom:'En bas de la journée',top:'En haut de la journée',genie:'Génie : là où je la mets d’habitude'};
function recOrder(r,day){
 const ts=S.tasks.filter(t=>t.day===day&&!t.done).sort((a,b)=>a.order-b.order);
 if(r.pos==='top')return ts.length?ts[0].order-1:1;
 if(r.pos==='genie'&&typeof r.rank==='number'&&ts.length){const i=Math.round(r.rank*ts.length);
  if(i<=0)return ts[0].order-1;if(i>=ts.length)return ts[ts.length-1].order+1;return (ts[i-1].order+ts[i].order)/2}
 return nextOrder(day)}
// le Génie apprend : chaque fois que tu déplaces une tâche de routine dans sa journée, il retient sa place (0 = en haut, 1 = en bas)
function recLearn(t){const r=t&&t.recurId&&S.recurring.find(x=>x.id===t.recurId);if(!r||!t.day)return;
 const ts=S.tasks.filter(x=>x.day===t.day&&!x.done).sort((a,b)=>a.order-b.order),n=ts.length,i=ts.indexOf(t);if(i<0||n<2)return;
 const f=i/(n-1);r.rank=typeof r.rank==='number'?Math.round((r.rank*.6+f*.4)*100)/100:f}
function genRecurring(){
 const t0=today();let changed=false;
 for(let i=0;i<7;i++){const day=addDays(t0,i);
  for(const r of S.recurring){
   if(day<r.from||(r.skip||[]).includes(day)||!matches(r,day))continue;
   if(S.tasks.some(t=>t.recurId===r.id&&t.day===day))continue;
   if(!r.channel)r.channel=catGuess(r.title);
   S.tasks.push(mk({title:r.title,channel:r.channel,est:r.est,notes:r.notes||'',day,recurId:r.id,order:recOrder(r,day),subtasks:(r.subs||[]).map(x=>({id:uid(),t:x,d:false}))}));changed=true;
  }}
 if(typeof genHabitTasks==='function'&&genHabitTasks())changed=true;
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
// son « Cristal » : deux sinus clairs qui s'éteignent doucement (désactivable dans Réglages › Apparence)
function chime(f){if(S.settings&&S.settings.sounds===false)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const t=actx.currentTime,k=(f||660)/660;
 const tone=(fr,d,v,at)=>{const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.setValueAtTime(fr*k,t+at);g.gain.setValueAtTime(.0001,t+at);g.gain.exponentialRampToValueAtTime(v,t+at+.008);g.gain.exponentialRampToValueAtTime(.0001,t+at+d);o.connect(g).connect(actx.destination);o.start(t+at);o.stop(t+at+d+.05)};
 tone(1568,.9,.14,0);tone(2349,.7,.06,.06)}catch(e){}}

// Apparence : fonds neutres, mode clair/sombre, une couleur d'accent
const ACCENTS=[{k:'or',n:'Or mat',l:'#856618',d:'#D4B05A'},{k:'peche',n:'Pêche',l:'#A5532F',d:'#E8A283'},{k:'sauge',n:'Sauge',l:'#46724E',d:'#8DBA96'},{k:'lavande',n:'Lavande',l:'#625CA8',d:'#A9A3E6'},{k:'ardoise',n:'Bleu ardoise',l:'#41679E',d:'#86A8D8'},{k:'petrole',n:'Pétrole',l:'#26737A',d:'#6DC0C4'}];
function applyLook(){const s=S.settings||{},r=document.documentElement,a=ACCENTS.find(x=>x.k===s.accent)||ACCENTS[0];r.dataset.accent=a.k;if(s.mode==='light'||s.mode==='dark')r.dataset.theme=s.mode;else delete r.dataset.theme;r.style.colorScheme=s.mode==='light'||s.mode==='dark'?s.mode:'light dark';{let m=document.querySelector('meta[name=color-scheme]');if(!m){m=document.createElement('meta');m.name='color-scheme';document.head.appendChild(m)}m.content=s.mode==='light'||s.mode==='dark'?s.mode:'light dark'}if(!window.__lookMQ){window.__lookMQ=1;try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>applyLook())}catch(e){}}const dark=s.mode==='dark'||(s.mode!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);const m=document.querySelector('meta[name=theme-color]');if(m)m.content=dark?'#141415':'#f6f6f5'}

// Priorité : la tâche se place en tête (haute), après les hautes (normale) ou en fin (basse), sans bouger les autres
function placeByPrio(t){if(!t||!t.day||t.done)return;const rk=x=>x.prio==='high'?0:x.prio==='low'?2:1;
 const L=dayTasks(t.day).filter(x=>!x.done&&x!==t),r=rk(t);let i;
 if(r===2)i=L.length;else{i=0;L.forEach((x,k)=>{if(rk(x)<r)i=k+1})}
 L.splice(i,0,t);L.forEach((x,k)=>x.order=k+1);dayTasks(t.day).filter(x=>x.done).forEach((x,k)=>x.order=L.length+k+1)}

// Projets en cours : progression et échéance, pour la semaine et la revue
function projListHtml(w){const ps=activeProjects().sort((a,b)=>(a.end||'9')<(b.end||'9')?-1:1),we=w?addDays(w,6):null;
 return ps.length?`<div class="rlist">${ps.map(p=>{const g=projProgress(p.id),soon=we&&p.end&&p.end<=we;return `<div class="rrow${soon?' hot':''}"><div><b>${esc(p.name)}</b><small>${g.n?`${g.done}/${g.n} tâches faites`:'Aucune tâche liée — ajoute +'+esc(p.name.split(' ')[0].toLowerCase())+' en créant une tâche'}${p.end?' · fin '+fmtDay(p.end,{day:'numeric',month:'short'})+(soon?' (cette semaine)':''):''}</small></div></div>`}).join('')}</div>`:'<p class="mute">Aucun projet en cours. Crée-en un dans Réglages › Projets.</p>'}

const projKey=p=>norm(p.name).replace(/[^a-z0-9]+/g,'').slice(0,20)||'projet';

// ---------- moteur : journées de boulot et lieux ----------
// type de journée : '' libre (chez moi) · 'busy' boulot sans pause (aucune tâche) · 'watch' boulot en veille (seulement le faisable n'importe où)
const JOBMODES=[['','Libre','Chez toi : tout peut être placé'],['busy','Boulot sans pause','Aucune tâche pendant le boulot'],['watch','Boulot en veille','Seulement ce qui se fait n’importe où']];
function jobOf(d){const i=S.days[d]||{},s=S.settings;
 if(i.job===undefined||i.job===null){const sg=typeof jobSegs==='function'?jobSegs(d):[];if(!sg.length)return null;return{mode:sg.some(x=>x.mode==='busy')?(sg.every(x=>x.mode==='busy')?'busy':'mixed'):'watch',s:Math.min(...sg.map(x=>x.s)),e:Math.max(...sg.map(x=>x.e)),segs:sg,auto:true}}
 if(!i.job)return null;return{mode:i.job,s:typeof i.js==='number'?i.js:(s.jobStart??9),e:typeof i.je==='number'?i.je:(s.jobEnd??18)}}
const hShort=v=>Math.floor(v)+' h'+(v%1?pad(Math.round(v%1*60)):'');
const jobLabel=d=>{const j=jobOf(d);if(!j)return 'Journée libre';return (j.mode==='busy'?'Boulot sans pause':j.mode==='watch'?'Boulot en veille':'Boulot')+' · '+hShort(j.s)+'–'+hShort(j.e)+(j.auto?' · agenda':'')};
// lieu d'une tâche : 'any' n'importe où (faisable au boulot) · 'home' chez moi · 'out' dehors
const WHERES=[['','Auto'],['any','N’importe où'],['home','Chez moi'],['out','Dehors']];
const CAT_WHERE={'d-corps':'home','c-natation':'out','d-foyer':'home','c-courses':'out','c-demarches':'out','c-piano':'home','c-art':'home','c-lego':'home','c-evenements':'out'};
function catWhere(id){const p=typeof pathOf==='function'?pathOf(id):[];for(let k=p.length-1;k>=0;k--){if(p[k].where)return p[k].where;if(CAT_WHERE[p[k].id])return CAT_WHERE[p[k].id]}return 'any'}
const whereOf=t=>t.where||catWhere(t.channel);
function jobPicker(d,compact){const i=S.days[d]||{},auto=i.job===undefined||i.job===null,j=jobOf(d),m=auto?'auto':(i.job||''),h=v=>hhmm(v);
 const modes=[['auto','Selon l’agenda','Déduit de tes agendas de boulot'],...JOBMODES];
 return `<div class="jobpick"><div class="seg">${modes.map(([v,l,tt])=>`<button class="sm${m===v?' on':''}" data-act="setjob" data-d="${d}" data-v="${v}" title="${tt}">${l}</button>`).join('')}</div>${auto?(j?`<div class="jobsegs">${j.segs.map(x=>`<div class="jobseg ${x.mode}"><b>${hShort(x.s)}–${hShort(x.e)}</b><span>${esc(x.t)}</span><em>${x.mode==='busy'?'sans pause':'en veille'}</em></div>`).join('')}</div>`:`<p class="mute" style="font-size:13px;margin:6px 0 0">Rien de boulot dans tes agendas ce jour-là : journée libre.</p>`):j?`<div class="hoursrow jobh"><label>Boulot de<input type="time" step="900" data-jh="s" data-d="${d}" value="${h(j.s)}"></label><span>→</span><label>à<input type="time" step="900" data-jh="e" data-d="${d}" value="${h(j.e)}"></label></div>${compact?'':`<p class="mute" style="font-size:13px;margin:6px 0 0">${j.mode==='busy'?'Aucune tâche pendant le boulot.':'Pendant le boulot, seulement les tâches faisables n’importe où.'} Trajet de ${S.settings.travel??60} min bloqué avant et après ; ce qui se fait chez toi ou dehors est placé avant ou après.</p>`}`:''}</div>`}

// durée apprise : le temps réel habituel des tâches faites qui portent le même nom (médiane, arrondie à 5 min)
function learnedEst(title){const k=norm(title).replace(/[^a-z0-9]+/g,' ').trim();if(!k)return 0;
 const xs=[...(S.archive||[]).filter(a=>a.a>60&&norm(a.t).replace(/[^a-z0-9]+/g,' ').trim()===k).map(a=>a.a/60),...S.tasks.filter(t=>t.done&&t.actual>60&&norm(t.title).replace(/[^a-z0-9]+/g,' ').trim()===k).map(t=>t.actual/60)].filter(m=>m<=8*60).sort((a,b)=>a-b);
 if(!xs.length)return 0;const m=xs[Math.floor(xs.length/2)];return Math.max(5,Math.round(m/5)*5)}
// aperçu de ce que la saisie rapide a compris
function quickPreview(txt){const q=parseQuick(txt||'');if(!q.title)return '';const out=[];
 if(q.day)out.push(q.day===today()?'aujourd’hui':fmtDay(q.day,{weekday:'long',day:'numeric'}));if(q.at!=null)out.push('à '+hhmm(q.at/60));if(q.badCat)out.push('⚠ catégorie « '+q.badCat+' » inconnue (Arbre pour la créer)');if(q.due)out.push('échéance '+fmtDay(q.due,{day:'numeric',month:'short'}));
 const le=q.est?0:learnedEst(q.title);if(q.est)out.push(fmtMin(q.est));else if(le)out.push('≈ '+fmtMin(le)+' (d’habitude)');
 if(q.prio)out.push(q.prio==='high'?'priorité haute':'priorité basse');if(q.where)out.push({home:'chez moi',out:'dehors',any:'n’importe où'}[q.where]);
 if(q.channel)out.push(nodeLabel(q.channel));if(q.proj){const p=proj(q.proj);if(p)out.push('+'+p.name)}
 return out.length?out.map(x=>`<span>${esc(x)}</span>`).join(''):''}

// durées proposées : de 5 en 5 min jusqu'à 1 h, de 15 en 15 min jusqu'à 2 h 30, puis de 30 en 30 min jusqu'à 8 h
const DUR_OPTS=[...Array.from({length:12},(_,i)=>5*(i+1)),...Array.from({length:6},(_,i)=>75+15*i),...Array.from({length:11},(_,i)=>180+30*i)];
const durOpts=v=>{const a=DUR_OPTS.slice();if(v&&!a.includes(v)){a.push(v);a.sort((x,y)=>x-y)}return a};
const durSelect=(t,cls)=>`<select class="dursel ${cls||''}" data-durset="${t.id}" aria-label="Durée estimée"><option value="0" ${t.est?'':'selected'}>${t.est?'—':'Durée…'}</option>${durOpts(t.est).map(v=>`<option value="${v}" ${v===t.est?'selected':''}>${fmtMin(v)}</option>`).join('')}</select>`;

// où va une nouvelle tâche : en haut, en bas, ou à la place choisie par le Génie (priorité et échéance)
function placeNew(t){const pos=S.settings.addPos||'bottom';if(!t.day||pos==='bottom')return;
 if(pos==='top'){const o=dayTasks(t.day).filter(x=>x!==t&&!x.done).map(x=>x.order||0);t.order=(o.length?Math.min(...o):1)-1;renorm(t.day);return}
 // Génie : priorité haute ou échéance du jour d'abord, basse à la fin, sinon après les urgentes
 const was=t.prio;if(t.due&&t.due<=t.day&&was!=='low')t.prio='high';placeByPrio(t);t.prio=was}
const ADDPOS=[['top','Ajouter en haut','addtop'],['bottom','Ajouter en bas','addbottom'],['auto','Le Génie place la tâche','genie']];

// place libre d'un jour (minutes) : heures du jour, moins les rendez-vous occupés et le boulot, moins les tâches déjà prévues
function dayFree(d){const h=dayHours(d);let free=(h.e-h.s)*60;
 try{for(const e of (typeof timedEvents==='function'?timedEvents(d):[]))if(!(typeof evFree==='function'&&evFree(e)))free-=Math.max(0,(new Date(e.end.dateTime)-new Date(e.start.dateTime))/60000)}catch(err){}
 const j=typeof jobOf==='function'?jobOf(d):null;if(j&&j.mode!=='watch')free-=(j.e-j.s)*60;
 return free-dayTasks(d).filter(x=>!x.done).reduce((s,x)=>s+(x.est||30),0)}
// « demain » : si demain est plein, le prochain jour qui a de la place (jusqu'à 2 semaines, et jamais après l'échéance)
function nextFreeDay(t,from){let d=from||addDays(today(),1);const need=t&&t.est||30;
 for(let i=0;i<14;i++){const x=addDays(d,i);if(t&&t.due&&x>t.due)break;if(dayFree(x)>=need)return x}return d}
