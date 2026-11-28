// Diem — rendu, modale, rituels, mode focus
/* ---------- rendu principal ---------- */
function render(){applyLook();
 const a=document.activeElement,keep=a&&a.dataset&&a.dataset.keep,val=keep?a.value:null;
 document.querySelectorAll('#nav [data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===view||(b.dataset.view==='review'&&(view==='objectives'||view==='stats'))));
 {const nb=document.querySelector('#nav [data-view="dump"]'),n=S.tasks.filter(t=>t.inbox&&!t.done).length;if(nb){const o=nb.querySelector('.badge');if(o)o.remove();if(n)nb.insertAdjacentHTML('beforeend',`<span class="badge">${n}</span>`)}}
 document.body.classList.toggle('wideview',view==='tree');document.body.classList.toggle('treemap',view==='tree'&&hasTree()&&(treeMode||'map')==='map');
 const m=$('#main'),st=m.scrollTop,bc0=document.querySelector('.bigcal'),bst=bc0?bc0.scrollTop:null;
 m.innerHTML=layout==='cal'&&(view==='today'||view==='week')?viewBigCal():view==='week'?viewWeek():view==='backlog'?viewBacklog():view==='dump'?viewDump():view==='habits'?viewHabits():view==='stats'||view==='objectives'||view==='review'?viewReview():view==='objectives'?viewObjectives():view==='projects'?viewProjects():view==='settings'?viewSettings():view==='tree'?viewTree():viewToday();
 m.scrollTop=st;
 // semaine sur téléphone : s'ouvre sur aujourd'hui
 if(view==='week'&&innerWidth<=760){const w=document.querySelector('#main .week'),c=w&&w.querySelector('.wcol.today');if(w&&c&&window.__wk!==cur){window.__wk=cur;w.scrollLeft=c.offsetLeft-w.offsetLeft}else if(w&&window.__wkL!=null)w.scrollLeft=window.__wkL;if(w)w.onscroll=()=>{window.__wkL=w.scrollLeft}}
 {const sv=m.querySelector('.tvsvg');if(sv){try{const bb=sv.getBBox(),p=14;sv.setAttribute('viewBox',`${bb.x-p} ${bb.y-p} ${bb.width+2*p} ${bb.height+2*p}`)}catch(e){}}}
 renderSide();renderRun();renderSyncBar();iconize($('#main'));if(typeof kbShow==='function'&&kbSel)kbShow();if(typeof renderMsel==='function'&&msel.size)renderMsel();if(view==='tree'&&typeof fitTree==='function')fitTree();tvPrevView=view;if(view==='backlog'&&blFilter)blApply();
 if(keep){const n=document.querySelector(`[data-keep="${keep}"]`);if(n){n.focus();if(val&&!n.value)n.value=val}}
 if(layout==='cal'&&(view==='today'||view==='week')){const bd=bigDays();ensureRange(bd[0],bd[bd.length-1])}else if(view==='week'){const w=monday(cur);ensureRange(w,addDays(w,6))}else{ensureRange(cur,addDays(cur,6))}
 {const bc=document.querySelector('.bigcal');if(bc){if(!scrolledBig||bst===null){scrolledBig=true;const n=new Date();bc.scrollTop=calFocus(bc,cur===today()||bigDays().includes(today()))}else bc.scrollTop=bst}}
}
function renderSide(){
 document.querySelectorAll('.stabs [data-side]').forEach(b=>b.classList.toggle('on',b.dataset.side===sideTab));
 const sb=$('#sidebody'),st=sb.scrollTop;
 const bigOn=layout==='cal'&&(view==='today'||view==='week');sb.innerHTML=sideTab==='todo'?viewTodo():sideTab==='ai'?viewAI():bigOn?viewSideTasks():viewCal();
 const tb=document.querySelector('.stabs [data-side="cal"]');if(tb)tb.textContent=bigOn?'Tâches':'Agenda';
 if(sideTab==='ai'){aiUnread=0;renderBadge();}
 if(sideTab==='ai'){sb.scrollTop=sb.scrollHeight}else if(sideTab==='cal'&&!bigOn&&scrolledCal!==cur){scrolledCal=cur;sb.scrollTop=calFocus(sb,cur===today())}else sb.scrollTop=st;
}
let focusMin=null;
function renderMini(){let el=$('#minifocus');if(!el){el=document.createElement('div');el.id='minifocus';document.body.appendChild(el)}
 const id=focusMin||(S.running&&!focusOn?S.running.taskId:null),t=id&&T(id);
 if(!t||t.done||focusOn){el.className='hidden';el.innerHTML='';return}
 const run=S.running&&S.running.taskId===t.id;el.className=run?'on':'';
 el.innerHTML=`<button class="chk mfchk" data-act="toggle" data-id="${t.id}" aria-label="Cocher : terminée" title="Cocher : terminée"></button><button class="mfexp" data-act="focusmax" data-id="${t.id}" title="Agrandir le focus">${ico('maximize')}<span class="mft">${esc(t.title)}</span><span class="mfc" data-live="mini">${clock(actualSec(t))}</span></button><button class="mfplay" data-act="timer" data-id="${t.id}" aria-label="${run?'Pause':'Reprendre'}" title="${run?'Pause':'Reprendre'}">${run?ico('pause'):ico('play')}</button>`}
function renderRun(){
 renderMini();
 const r=S.running,t=r&&T(r.taskId);
 $('#runchip').innerHTML=t?`<div class="runbox" data-act="openfocus" data-id="${t.id}"><button class="chk runchk" data-act="toggle" data-id="${t.id}" aria-label="Cocher : terminée" title="Cocher : terminée"></button><span>En cours</span><b>${esc(t.title)}</b><span class="t" data-live="run">${clock(actualSec(t))}</span></div>`:'';
}
function go(v){
 if(v&&v.startsWith('rit-')){const d=cur<today()?today():cur,w=new Date().getDay();if(innerWidth<=760)document.body.classList.remove('side-open');if(v==='rit-plan')startRitual('plan',d);else if(v==='rit-shutdown')startRitual('shutdown',d>today()?today():d);else startRitual(w===0||w>=5?'weekreview':'weekplan',d);return}
 if(v==='review'||v==='objectives')v='stats';
 if(v==='side'){if(innerWidth<=760&&!document.body.classList.contains('side-open')){moreMenu();return}document.body.classList.toggle('side-open');return}
 view=v;try{history.replaceState(null,'','#'+v)}catch(e){}
 $('#main').scrollTop=0;render();
}

/* ---------- modale ---------- */
function showModal(html){const was=$('#modal').classList.contains('hidden');$('#sheet').innerHTML=html;
 // toujours une façon visible de fermer (téléphone surtout)
 if(!$('#sheet').querySelector('.sheetx,[data-act="close"]'))$('#sheet').insertAdjacentHTML('afterbegin','<button class="x mclose" data-act="close" aria-label="Fermer" title="Fermer (Échap)">×</button>');
 $('#modal').classList.remove('hidden');iconize($('#sheet'));
 // le bouton « retour » du téléphone ferme la fenêtre au lieu de quitter l'appli
 if(was&&!navigator.webdriver){try{history.pushState({m:1},'')}catch(e){}}}
// le « retour » lancé par closeModal arrive après coup : il ne doit pas refermer la fenêtre ouverte entre-temps
let popSkip=false;
function closeModal(fromBack){{const ae=document.activeElement;if(ae&&ae!==document.body&&$('#modal').contains(ae))try{ae.blur()}catch(e){}}if(typeof ad!=='undefined')ad=null;if(typeof sheetTid!=='undefined')sheetTid=null;
 if(!fromBack&&history.state&&history.state.m&&!$('#modal').classList.contains('hidden')){try{popSkip=true;history.back()}catch(e){popSkip=false}}
 if(modalTask){const t=T(modalTask);if(t&&t.block&&t.block.gcalId&&t.block.title!==t.title&&gTok()){t.block.title=t.title;save();gFetch(`/calendars/${blkCal(t)}/events/${encodeURIComponent(t.block.gcalId)}`,{method:'PATCH',body:JSON.stringify({summary:(t.done?'✓ ':'')+t.title})}).catch(()=>{})}}
 $('#modal').classList.add('hidden');modalTask=null;ritual=null;render();
}
let focusEdit=null;
function subsHtml(t){return (t.subtasks||[]).map(s=>`<div class="sub${s.d?' d':''}${focusOn===t.id&&focusSub===s.id?' cur':''}" draggable="true" data-drag="sub|${t.id}|${s.id}"><span class="tgrip sgrip" data-tgrip aria-hidden="true" title="Glisse pour déplacer"><svg viewBox="0 0 12 20" width="10" height="18"><g fill="currentColor"><circle cx="3" cy="4" r="1.6"/><circle cx="9" cy="4" r="1.6"/><circle cx="3" cy="10" r="1.6"/><circle cx="9" cy="10" r="1.6"/><circle cx="3" cy="16" r="1.6"/><circle cx="9" cy="16" r="1.6"/></g></svg></span><button class="chk" data-act="subt" data-tid="${t.id}" data-s="${s.id}" aria-label="Cocher">${s.d?'✓':''}</button><span>${esc(s.t)}</span>${s.d?'':`<button class="play" data-act="focussub" data-tid="${t.id}" data-s="${s.id}" aria-label="Focus sur cette sous-tâche">▶</button>`}<button class="x" data-act="subd" data-tid="${t.id}" data-s="${s.id}" aria-label="Supprimer">×</button></div>`).join('')}
function openTask(id){
 const t=T(id);if(!t)return;if(modalAI&&modalAI.tid!==id)modalAI=null;modalTask=id;ritual=null;
 const objs=weekObjs(monday(t.day||today())),r=t.recurId&&S.recurring.find(x=>x.id===t.recurId);
 const ests=[0,...durOpts(t.est)];
 showModal(`<div class="mhead"><textarea class="mtitle" data-f="title" rows="1" aria-label="Titre">${esc(t.title)}</textarea>${genieBtn('task',t.id,'Préparer')}<button class="x" data-act="close" aria-label="Fermer">×</button></div>
 <!-- fiche compacte (v2.1, façon Sunsama) : une barre de méta-données, le reste replié -->
 <div class="mbar">
  <label class="mpill" title="Durée estimée">${ico('clock')}<select data-f="est">${ests.map(v=>`<option value="${v}" ${v===t.est?'selected':''}>${v?fmtMin(v):'—'}</option>`).join('')}</select></label>
  <label class="mpill" title="Jour">${ico('cal')}<input type="date" data-f="day" value="${t.day||''}">${t.day?`<button type="button" class="sm" data-act="tobacklog" data-id="${t.id}">Backlog</button>`:'<span class="mute" style="font-size:13px">Dans le backlog</span>'}</label>
  <label class="mpill" title="Heure dans l’agenda">${ico('calendar')}<input type="time" step="900" data-f="time" value="${t.block?hm(new Date(t.block.start)):''}">${t.block&&t.pinned?'<button class="sm ghost" data-act="unpin">Libérer l’heure</button>':''}${t.block&&!flowOn()?'<button class="sm ghost" data-act="unblock">Retirer</button>':''}</label>
  <label class="mpill" title="Échéance">${ico('bell')}<input type="date" data-f="due" value="${t.due||''}">${t.due?'<button class="sm ghost" data-act="nodue">Aucune</button>':''}</label>
  <span class="mpill" title="Priorité"><span class="prow" role="radiogroup" aria-label="Priorité">${PRIOS.map(([v,l])=>`<button type="button" class="pbtn${(t.prio||'')===v?' on':''}" role="radio" aria-checked="${(t.prio||'')===v}" data-act="setprio" data-id="${t.id}" data-p="${v}" aria-label="${l}" title="${l}">${flagSvg(v)}</button>`).join('')}</span></span>
 </div>
 <div class="mcat"><button type="button" class="catbtn" data-act="pickcatm" data-id="${t.id}" style="--c:${esc(ch(t.channel)?ch(t.channel).color:'var(--line)')}">${ch(t.channel)?`<span class="chip">${esc(nodeLabel(t.channel))}</span>`:'<span class="mute">Choisir une catégorie…</span>'}<span class="mute">Changer</span></button></div>
 <details class="mmore"${t.proj||r||t.where||actualSec(t)?' open':''}><summary>Plus : projet, répétition, lieu, temps passé</summary><div class="grid2">
 <label>Projet<select data-f="proj"><option value="">Aucun</option>${(S.projects||[]).filter(p=>!p.done||p.id===t.proj).map(p=>`<option value="${esc(p.id)}" ${p.id===t.proj?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
 <label>Répéter<select data-f="recur"><option value="">Jamais</option>${Object.entries(RULES).map(([k,v])=>`<option value="${k}" ${r&&r.rule===k?'selected':''}>${v}</option>`).join('')}</select></label>${r?`<label>Place dans la journée<select data-f="recpos">${Object.entries(RECPOS).map(([k,v])=>`<option value="${k}" ${(r.pos||'bottom')===k?'selected':''}>${v}</option>`).join('')}</select></label>`:''}
 <label>Lieu<span class="prow" role="radiogroup" aria-label="Lieu">${WHERES.map(([v,l])=>`<button type="button" class="pbtn${(t.where||'')===v?' on':''}" role="radio" aria-checked="${(t.where||'')===v}" data-act="setwhere" data-id="${t.id}" data-v="${v}" aria-label="${v?l:'Auto'}" title="${v?l:'Auto : selon la catégorie'}">${ico({'':'auto',any:'laptop',home:'home',out:'walk'}[v])}</button>`).join('')}<small class="mute wnow">${t.where?WHERES.find(x=>x[0]===t.where)[1]:'Auto · '+WHERES.find(x=>x[0]===catWhere(t.channel))[1].toLowerCase()}</small></span></label>
 <label>Temps passé (min)<input type="number" min="0" data-f="actual" value="${Math.round(actualSec(t)/60)}"></label>
 </div></details>
 <div class="subs"><h4>Sous-tâches</h4><div>${subsHtml(t)}</div><form data-form="sub" data-tid="${t.id}"><input name="t" data-keep="sub" placeholder="Ajouter une sous-tâche" autocomplete="off"></form>${aiOn()?modalAIHtml(t):''}</div>
 <label class="full">Notes<textarea data-f="notes" rows="4">${esc(t.notes)}</textarea></label>
 <div class="mfoot"><button class="danger" data-act="del" data-id="${t.id}">Supprimer</button>${t.src?'<span class="src">Liée à Microsoft To Do</span>':msOn()?`<button class="ghost sm" data-act="pushtodo" data-id="${t.id}">Créer dans To Do</button>`:''}<span class="sp"></span><button class="ghost" data-act="play" data-id="${t.id}">Focus</button><button class="pri" data-act="close">OK</button></div>`);
}

function modalAIHtml(t){
 const a=modalAI&&modalAI.tid===t.id?modalAI:null;
 if(!a)return `<div class="row" style="margin-top:8px"><button class="sm" data-act="aisplit" data-id="${t.id}">Découper</button></div>`;
 if(a.loading)return `<div class="aibox"><span class="gthink">${LAMP_SVG}Le Génie réfléchit…</span></div>`;
 if(a.error)return `<div class="aibox"><span class="mute">Génie : ${esc(a.error)}</span><button class="sm" data-act="aisplit" data-id="${t.id}">Réessayer</button></div>`;
 const items=propItems(a.prop),ap=a.applied||{};
 return `<div class="aibox">${genieTag()}${a.text?`<p>${esc(a.text)}</p>`:''}${items.map(it=>`<div class="pitem${ap[it.k]?' ok':''}"><div>${esc(it.label)}${it.reason?`<small class="mute">${esc(it.reason)}</small>`:''}</div>${ap[it.k]?'<small>Fait</small>':`<button class="sm pri" data-act="modalapply" data-k="${it.k}">Appliquer</button>`}</div>`).join('')}${items.filter(it=>!ap[it.k]).length>1?'<button class="sm" data-act="modalapplyall">Tout appliquer</button>':''}</div>`;
}
async function aiSplit(t){
 modalAI={tid:t.id,loading:true};openTask(t.id);
 try{const r=await callClaude([{role:'user',content:`<contexte>\n${aiContext()}\n</contexte>\n\nTâche [${t.id}] « ${t.title} »${t.notes?' — notes : '+t.notes.slice(0,500):''}. Découpe-la en 3 à 6 sous-tâches concrètes et actionnables (updates subtasks), propose une durée réaliste (est) et une catégorie si absent. Message très court.`}],true);
  modalAI={tid:t.id,text:r.text,prop:r.prop,applied:{}}}
 catch(e){modalAI={tid:t.id,error:e.message}}
 if(modalTask===t.id)openTask(t.id);
}
/* ---------- rituels ---------- */
const RKEY='journee.rit';
const saveRit=()=>{if(ritual)lsSet(RKEY,JSON.stringify(Object.assign({},ritual,{at:Date.now()})));else lsDel(RKEY)};
const savedRit=()=>{try{const r=JSON.parse(lsGet(RKEY)||'null');if(r&&r.ai)for(const k in r.ai)if(r.ai[k]&&(r.ai[k].error||r.ai[k].loading))delete r.ai[k];return r&&Date.now()-r.at<12*3600e3?r:null}catch(e){return null}};
const RIT_AI={
 plan1:{when:d=>dayTasks(d).some(t=>!t.done&&(t.roll||0)>=1),q:d=>`Rituel du matin, étape « hier ». Pour chaque tâche revenue des jours précédents, propose : la garder le ${d} (updates day=${d}), la renvoyer au backlog (day=backlog) (y compris si elle est obsolète : tu ne supprimes jamais rien). Justifie en quelques mots.`},
 plan2:{when:()=>true,q:d=>`Rituel du matin, étape « choisir ». Dans le backlog et les autres jours, choisis les tâches à ajouter au ${d} (pick) en tenant compte de la charge, des rendez-vous occupés, des priorités et des projets en cours. Propose au plus 2 nouvelles tâches utiles.`},
 plan4:{when:d=>dayTasks(d).some(t=>!t.done),q:d=>`Rituel du matin, étape « estimer ». Donne une durée (updates est) aux tâches du ${d} sans durée ou mal estimées d’après l’historique. Si la journée déborde, propose des reports (updates day).`},
 plan5:{when:d=>dayTasks(d).some(t=>!t.done&&!t.block),q:d=>`Rituel du matin, étape « planifier ». Propose un ordre (order) et des créneaux (blocks, HH:MM) pour les tâches non planifiées du ${d}, dans les heures de travail, sans chevaucher les rendez-vous occupés${d===today()?', à partir de maintenant':''}. Les rendez-vous « compatibles » peuvent accueillir des tâches légères.`},
 plan6:{when:()=>true,q:d=>`Rituel du matin, dernière étape. Propose une intention courte et motivante pour la journée (intent), en lien avec ce qui compte le plus.`},
 shutdown0:{when:()=>true,q:d=>`Rituel du soir. Fais un bilan bref et bienveillant de la journée du ${d} (ce qui a avancé, temps réel vs estimé) en 2-3 phrases, sans proposition.`},
 shutdown1:{when:d=>dayTasks(d).some(t=>!t.done),q:d=>`Rituel du soir. Pour chaque tâche non terminée du ${d} : demain (${addDays(d,1)}), ou backlog (jamais de suppression). Garde demain réaliste.`},
 weekreview0:{when:()=>true,q:d=>`Revue de la semaine du ${monday(d)}. Fais une synthèse courte (ce qui a marché, où est passé le temps) et un conseil concret pour la semaine suivante, sans proposition.`}
};
async function aiRitual(){
 if(!ritual||!aiOn())return;const key=ritual.type+ritual.step,R=RIT_AI[key];if(!R)return;
 const rt=ritual,step=ritual.step;rt.ai=rt.ai||{};rt.ai[step]={loading:true};renderRitual();
 try{const r=await callClaude([{role:'user',content:`<contexte>\n${aiContext()}\n</contexte>\n\n${R.q(rt.day)}`}],true);rt.ai[step]={text:r.text,prop:r.prop,applied:{}}}
 catch(e){rt.ai[step]={error:e.message}}
 if(ritual===rt){saveRit();if(rt.step===step)renderRitual()}
}
function aiBox(){
 if(!ritual||!aiOn()||!RIT_AI[ritual.type+ritual.step])return '';
 const a=ritual.ai&&ritual.ai[ritual.step];
 if(!a)return `<div class="aibox"><div class="row"><span class="mute">Le Génie peut t’aider sur cette étape.</span><span class="sp"></span><button class="sm" data-act="ritai">Demander au Génie</button></div></div>`;
 if(a.loading)return `<div class="aibox"><span class="gthink">${LAMP_SVG}Le Génie réfléchit…</span></div>`;
 if(a.error)return `<div class="aibox"><div class="row"><span class="mute">Génie : ${esc(a.error)}</span><span class="sp"></span><button class="sm" data-act="ritai">Réessayer</button></div></div>`;
 const items=propItems(a.prop),ap=a.applied||{};
 return `<div class="aibox">${genieTag()}${a.text?`<p>${esc(a.text)}</p>`:''}${items.map(it=>`<div class="pitem${ap[it.k]?' ok':''}"><div>${esc(it.label)}${it.reason?`<small class="mute">${esc(it.reason)}</small>`:''}</div>${ap[it.k]?'<small>Fait</small>':`<button class="sm pri" data-act="ritapply" data-k="${it.k}">Appliquer</button>`}</div>`).join('')}${items.filter(it=>!ap[it.k]).length>1?'<button class="sm" data-act="ritapplyall">Tout appliquer</button>':''}<div class="row"><span class="sp"></span><button class="sm ghost" data-act="ritai">Nouvelle proposition</button></div></div>`;
}
const RIT={plan:['Heures','Revenues','Choisir','Phare','Estimer','Planifier','Valider'],shutdown:['Bilan','Ce qui reste','Note','Citation'],weekplan:['Boulot','Projets','Aperçu'],weekreview:['Chiffres','Habitudes','Réflexion']};
function startRitual(type,day){modalTask=null;const sv=savedRit();ritual=sv&&sv.type===type&&sv.day===(day||cur)?Object.assign(sv,{step:0}):{type,step:0,day:day||cur,picked:{},ai:{}};if(type==='plan'&&todo.listId&&msOn())loadTodoTasks(todo.listId);renderRitual()}
function shell(body,next){const st=RIT[ritual.type],i=ritual.step;return `<div class="rit"><div class="rsteps">${st.map((s,k)=>`<button type="button" class="rtab ${k===i?'on':k<i?'past':''}" data-act="ritgo" data-i="${k}" ${k===i?'aria-current="step"':''}>${esc(s)}</button>`).join('')}<span class="sp" style="background:none"></span></div><div class="ritbody">${body}${aiBox()}</div><div class="mfoot">${i>0?'<button class="ghost" data-act="ritback">Retour</button>':''}<button class="ghost" data-act="close">Plus tard</button><span class="sp"></span><button class="pri" data-act="ritnext">${next||'Continuer'}</button></div></div>`}
const durBtns=t=>`<div class="durs">${durSelect(t)}</div>`;
// zones où glisser une tâche pour la repousser (rituel du matin)
function pushZones(d){
 const z=DAYMOVES(d).slice(1);
 return `<div class="pzones" aria-label="Glisse une tâche ici pour la repousser">${z.map(([to,l])=>`<div class="pzone" data-drop="push" data-pz="${to}"><b>${l}</b>${to!=='backlog'?`<small>${fmtDay(to,{weekday:'short',day:'numeric',month:'short'})}</small>`:'<small>sans date</small>'}</div>`).join('')}</div>`;
}
function renderRitual(){try{renderRitual0()}catch(e){console.error(e);showModal(`<div class="rit"><h2>Le rituel n’a pas pu s’afficher</h2><p class="lead">Une erreur l’a bloqué : <code>${esc(e.message||String(e))}</code></p><p class="mute">Envoie ce message à Claude pour qu’il corrige.</p><div class="row" style="justify-content:flex-end"><button data-act="close">Fermer</button></div></div>`)}}
function renderRitual0(){
 if(!ritual)return;const d=ritual.day,i=ritual.step,dl=fmtDay(d,{weekday:'long',day:'numeric',month:'long'});let h='';
 if(ritual.type==='plan'){
  const info=S.days[d]||{},H=dayHours(d),rollRow=(t,opts)=>`<div class="rrow${(t.roll||0)>=4?' hot':''}"><button class="chk" data-act="ritdone" data-id="${t.id}" aria-label="Cocher : faite" title="Faite"></button><div><b>${esc(t.title)}</b><small>${(t.roll||0)>=4?`<span class="rollm">↻ ${t.roll}</span> reportée ${t.roll} fois`:`↻ revenue${t.roll>1?' '+t.roll+' fois':''}`}${t.est?' · '+fmtMin(t.est):''}</small></div><div class="btns">${opts}</div></div>`;
  if(i===0){
   h=shell(`${quoteHtml(pickQuote('matin',d))}<div class="row" style="justify-content:space-between;align-items:center"><h2>Ta journée</h2>${aiOn()?genieBtn('day',null,'Le Génie prépare ma journée'):''}</div><p class="lead">${cap1(dl)}. Quand commences-tu et quand t’arrêtes-tu ? Ce qui ne tient pas glissera tout seul à demain.</p>
   <div class="hoursrow"><label>Début<input type="time" step="900" data-rh="s" value="${hhmm(H.s)}"></label><span>→</span><label>Fin<input type="time" step="900" data-rh="e" value="${hhmm(H.e)}"></label></div>
   <div class="rsec">Boulot aujourd’hui</div>${jobPicker(d)}
   <div class="rsec">Ton énergie</div><div class="seg energy">${[['low','Basse','Journée allégée : fin effective 1 h plus tôt'],['','Normale',''],['high','Haute','Tu peux viser un peu plus']].map(([v,l,tt])=>`<button class="sm${(info.energy||'')===v?' on':''}" data-act="energy" data-v="${v}" title="${tt}">${l}</button>`).join('')}</div>
   <p class="mute" style="font-size:13px;margin-top:6px">${info.energy==='low'?'Énergie basse : on garde une heure de marge en fin de journée.':info.energy==='high'?'Énergie haute : la journée garde ses heures.':'Choisis selon ta forme du moment.'}</p>`);
  }else if(i===1){const back=dayTasks(d).filter(t=>!t.done&&(t.roll||0)>=1).sort((a,b)=>(b.roll||0)-(a.roll||0));
   h=shell(`<h2>Ce qui revient</h2><p class="lead">${back.length?`${back.length>1?back.length+' tâches n’ont pas été faites les jours précédents et sont revenues':'1 tâche n’a pas été faite les jours précédents et est revenue'}. Garde, reporte ou laisse partir.`:'Rien ne revient d’hier. Page blanche.'}</p>
   ${back.length?`<div class="rlist">${back.map(t=>rollRow(t,`${(t.roll||0)>=4?`<button class="sm" data-act="phare" data-id="${t.id}">${(S.days[d]||{}).phare===t.id?'★ Tâche phare':'En faire la tâche phare'}</button>`:`<button class="sm" data-act="keep" data-id="${t.id}">Garder</button>`}<button class="sm ghost" data-act="mv" data-id="${t.id}" data-to="${addDays(d,1)}">Demain</button><button class="sm ghost" data-act="mv" data-id="${t.id}" data-to="backlog">Backlog</button><button class="sm ghost" data-act="rm" data-id="${t.id}">Supprimer</button>`)).join('')}</div>`:''}`);
  }else if(i===2){const ts=dayTasks(d),bl=S.tasks.filter(t=>!t.day&&!t.done).sort((a,b)=>a.order-b.order),td=msOn()&&todo.listId?(todo.tasks[todo.listId]||[]):[];
   const pc={};if(hasTree())for(const t of ts){const p=pillarOf(t.channel);if(p)pc[p.id]=(pc[p.id]||0)+1}
   const miss=hasTree()?pillars().filter(p=>!pc[p.id]):[],idea=miss.map(p=>bl.find(t=>pillarOf(t.channel)&&pillarOf(t.channel).id===p.id)).filter(Boolean)[0];
   h=shell(`<h2>Qu’est-ce qui compte ${d===today()?'aujourd’hui':'ce jour-là'} ?</h2><p class="lead">Choisis ce que tu veux vraiment faire.</p>${objChips(monday(d))}
   ${typeof cxRitualHtml==='function'?cxRitualHtml():''}
   ${hasTree()?`<div class="pilrow">${pillars().map(p=>`<span class="pilc${pc[p.id]?'':' off'}" style="--c:${esc(p.color)}">${esc(p.name)} ${pc[p.id]||0}</span>`).join('')}</div>${idea?`<p class="pilidea">${esc(pillarOf(idea.channel).name)} est absent aujourd’hui. Idée : <b>${esc(idea.title)}</b> <button class="sm" data-act="mv" data-id="${idea.id}" data-to="${d}">Ajouter</button></p>`:''}`:''}
   ${(()=>{const L=loadInfo(d);return L.over>0?`<div class="overalert" role="alert"><b>${fmtMin(L.over)} de trop</b> pour ta journée.</div>`:''})()}
   ${addForm(d,'Ajouter une tâche… (ex. « Relire le devis 20m »)','rit-add')}
   <div class="rsec">Prévu (${ts.length})</div><div class="rlist">${ts.length?ts.map(t=>`<div class="rrow sel"><div><b>${esc(t.title)}</b>${t.src?' <span class="src">To Do</span>':''}</div><div class="btns"><button class="sm ghost" data-act="mv" data-id="${t.id}" data-to="backlog">Retirer</button></div></div>`).join(''):'<p class="mute">Rien pour l’instant.</p>'}</div>
   ${bl.length?`<div class="rsec">Depuis le backlog</div><div class="rlist">${bl.slice(0,40).map(t=>`<div class="rrow"><div><b>${esc(t.title)}</b><small>${ch(t.channel)?esc(nodeLabel(t.channel)):''}${t.est?' · '+fmtMin(t.est):''}</small></div><div class="btns"><button class="sm" data-act="mv" data-id="${t.id}" data-to="${d}">Ajouter</button></div></div>`).join('')}</div>`:''}
   ${td.length?`<div class="rsec">Depuis Microsoft To Do</div><div class="rlist">${td.filter(x=>!S.tasks.some(t=>t.src&&t.src.taskId===x.id&&t.day===d)).map(x=>`<div class="rrow"><div><b>${esc(x.title)}</b></div><div class="btns"><button class="sm" data-act="todoadd" data-l="${esc(todo.listId)}" data-t="${esc(x.id)}" data-day="${d}">Ajouter</button></div></div>`).join('')}</div>`:''}`);
  }else if(i===3){const ts=dayTasks(d).filter(t=>!t.done);
   h=shell(`<h2>La tâche phare</h2><p class="lead">Une seule tâche qui, faite, réussit ta journée. Elle passe en priorité haute et en tête de liste.</p>
   <div class="rlist">${ts.map(t=>`<div class="rrow${info.phare===t.id?' sel':''}"><div><b>${esc(t.title)}</b><small>${ch(t.channel)?esc(nodeLabel(t.channel)):''}${t.est?' · '+fmtMin(t.est):''}</small></div><div class="btns"><button class="sm${info.phare===t.id?' pri':''}" data-act="phare" data-id="${t.id}">${info.phare===t.id?'★ Phare':'☆ Choisir'}</button></div></div>`).join('')||'<p class="mute">Ajoute d’abord des tâches.</p>'}</div>`);
  }else if(i===4){const ts=dayTasks(d).filter(t=>!t.done),L=loadInfo(d);
   h=shell(`<h2>Combien de temps ?</h2><p class="lead">Estime chaque tâche. ${gTok()?'Tes rendez-vous sont comptés.':'Connecte Google Agenda pour compter aussi tes rendez-vous.'}</p>${loadBar(d)}
   ${L.over>0?`<div class="overalert" role="alert"><b>${fmtMin(L.over)} de trop</b> pour ta journée (${hhmm(H.s)} → ${hhmm(H.e)}). Retire ou reporte quelque chose, ou laisse faire : au fil de la journée, les drapeaux bas puis les tâches normales glisseront à demain.</div>`:''}
   <p class="mute pzhint">Pour repousser une tâche, glisse-la sur une des zones.</p>${pushZones(d)}
   <div class="rlist">${ts.map(t=>`<div class="rrow drg" draggable="true" data-drag="task|${t.id}"><span class="grip" data-tgrip aria-hidden="true">⋮⋮</span><div style="flex:1 1 180px"><b>${esc(t.title)}</b></div>${durBtns(t)}</div>`).join('')||'<p class="mute">Aucune tâche à estimer.</p>'}</div>`);
  }else if(i===5){const ts=dayTasks(d).filter(t=>!t.done),free=ts.filter(t=>!t.block).length;
   h=shell(`<h2>Quand vas-tu le faire ?</h2><p class="lead">Les créneaux suivent l’ordre de la liste. Fixe une heure seulement si elle compte.</p>
   <button class="${free?'pri':''}" data-act="ritauto" ${free?'':'disabled'}>Placer automatiquement ${free?free+' tâche'+(free>1?'s':''):''} dans mes créneaux libres</button>
   <div class="rlist" style="margin-top:12px">${ts.map(t=>`<div class="rrow${t.block?' sel':''}"><div><b>${esc(t.title)}</b><small>${t.block?hm(new Date(t.block.start))+'–'+hm(new Date(t.block.end)):'Pas de créneau'}</small></div><div class="btns"><input type="time" step="900" data-ritime="${t.id}" value="${t.block?hm(new Date(t.block.start)):''}" style="width:auto;min-height:32px;font-size:14px;padding:3px 8px" aria-label="Heure">${t.block?`<button class="sm ghost" data-act="ritunblock" data-id="${t.id}">Retirer</button>`:''}</div></div>`).join('')}</div>`);
  }else{const ts=dayTasks(d),L=loadInfo(d),first=ts.filter(t=>t.block&&!t.done).sort((a,b)=>a.block.start<b.block.start?-1:1)[0],ph=info.phare&&T(info.phare);
   h=shell(`<h2>C’est parti</h2><p class="lead">${hhmm(H.s)} → ${hhmm(H.e)} · ${ts.length} tâche${ts.length>1?'s':''} · ${fmtMin(L.task)} de travail${L.meet?' · '+fmtMin(L.meet)+' de rendez-vous':''}${first?` · première à ${hm(new Date(first.block.start))}`:''}</p>
   ${L.over>0?`<div class="overalert" role="alert"><b>${fmtMin(L.over)} de trop</b> : ce qui ne tient pas glissera au fil de la journée.</div>`:''}
   ${ph?`<p class="phareline">★ ${esc(ph.title)}</p>`:''}
   <label>Ton intention pour la journée (facultatif)<input data-intent value="${esc(info.intent||'')}" placeholder="Ex. : finir le dossier sans me disperser"></label>`,'Commencer la journée');
  }
 }else if(ritual.type==='shutdown'){
  const ts=dayTasks(d),done=ts.filter(t=>t.done),left=ts.filter(t=>!t.done),sec=ts.reduce((a,t)=>a+actualSec(t),0);
  if(i===0){const pp={};if(hasTree())for(const t of done){const p=pillarOf(t.channel);if(p)pp[p.id]=(pp[p.id]||0)+Math.max(actualSec(t),(t.est||0)*60)}
   h=shell(`<h2>Ce que tu as accompli</h2><p class="lead">${cap1(dl)}</p>
   <div class="stat"><div><b>${done.length}</b><small>tâche${done.length>1?'s':''} terminée${done.length>1?'s':''}</small></div><div><b>${fmtMin(sec/60)}</b><small>temps suivi</small></div></div>
   ${Object.keys(pp).length?`<div class="pilrow">${pillars().filter(p=>pp[p.id]).map(p=>`<span class="pilc" style="--c:${esc(p.color)}">${esc(p.name)} ${fmtMin(pp[p.id]/60)}</span>`).join('')}</div>`:''}
   <div class="rlist">${done.map(t=>`<div class="rrow sel"><div><b>${esc(t.title)}</b><small>${fmtMin(actualSec(t)/60)} passées${t.est?' / '+fmtMin(t.est)+' prévues':''}</small></div></div>`).join('')||'<p class="mute">Aucune tâche cochée. Ça arrive. Demain est un autre jour.</p>'}</div>`);}
  else if(i===1){const srt=[...left].sort((a,b)=>(b.roll||0)-(a.roll||0)),hot=srt.filter(t=>(t.roll||0)>=4).length;
   h=shell(`<h2>Ce qui reste</h2><p class="lead">${left.length?`Par défaut, tout passe à demain. ${hot?`${hot>1?hot+' tâches reviennent souvent : décide maintenant ce qu’elles deviennent.':'1 tâche revient souvent : décide maintenant ce qu’elle devient.'}`:'Change ce que tu veux.'}`:'Tout est fait. Belle journée.'}</p>
   ${left.length?`<div class="rlist">${srt.map(t=>`<div class="rrow${(t.roll||0)>=4?' hot':''}"><button class="chk" data-act="ritdone" data-id="${t.id}" aria-label="Cocher : faite" title="Faite"></button><div><b>${esc(t.title)}</b>${(t.roll||0)>=1?`<small><span class="rollm">↻ ${t.roll}</span>${(t.roll||0)>=4?' reportée '+t.roll+' fois':''}</small>`:''}</div><div class="btns"><button class="sm" data-act="mv" data-id="${t.id}" data-to="${addDays(d,1)}">Demain</button><button class="sm ghost" data-act="mv" data-id="${t.id}" data-to="backlog">Backlog</button><button class="sm ghost" data-act="rm" data-id="${t.id}">Supprimer</button></div></div>`).join('')}</div><button class="sm" data-act="mvday" data-to="${addDays(d,1)}">Tout à demain</button>`:''}`);}
  else if(i===2)h=shell(`<h2>Quelques mots</h2><p class="lead">Ce qui s’est bien passé, ce que tu changerais. Ils nourrissent la revue de la semaine.</p>
   <textarea data-note rows="6" placeholder="Ce qui s’est bien passé…&#10;Ce que je ferais autrement…">${esc((S.days[d]||{}).note||'')}</textarea>`);
  else h=shell(`${quoteHtml(pickQuote('soir',d))}<p class="lead" style="text-align:center">La journée est close. Ce qui reste t’attend demain, rangé.</p>`,'Journée terminée');
 }else if(ritual.type==='weekplan'){
  const w=monday(d),pw=addDays(w,-7),pos=weekObjs(pw),os=weekObjs(w);
  if(i===0)h=shell(`<h2>Tes journées de boulot</h2><p class="lead">Pour chaque jour : libre, boulot sans pause ou boulot en veille. Les tâches se placent en conséquence.</p><div class="jobweek">${[...Array(7)].map((_,k)=>{const x=addDays(w,k);return `<div class="jobday"><b>${cap1(fmtDay(x,{weekday:'long',day:'numeric'}))}</b>${jobPicker(x,true)}</div>`}).join('')}</div>`);
  else if(i===1)h=shell(`<h2>Tes projets</h2><p class="lead">Ceux qui se terminent cette semaine sont mis en avant. Rattache-leur des tâches avec <code>+projet</code>.</p>${projListHtml(w)}<div class="row" style="margin-top:10px"><button class="sm" data-act="go" data-v="settings">Gérer les projets</button></div>`);
  else h=shell(`<h2>Ta semaine</h2><p class="lead">La charge prévue jour par jour. Rééquilibre depuis la vue Semaine si un jour déborde.</p>
   <div class="bars">${[...Array(7)].map((_,k)=>{const x=addDays(w,k),L=loadInfo(x);return `<div class="brow"><span>${cap1(fmtDay(x,{weekday:'short',day:'numeric'}))}</span><div class="bt" style="--c:${L.over>0?'var(--warn)':'var(--acc)'}"><i style="width:${Math.min(100,(L.task+L.meet)/L.cap*100)}%"></i></div><span>${fmtMin(L.task+L.meet)}</span></div>`}).join('')}</div>`,'Valider ma semaine');
 }else if(ritual.type==='weekreview'){
  const w=monday(d);
  if(i===0)h=shell(`<h2>Revue de la semaine</h2><p class="lead">Semaine du ${fmtDay(w,{day:'numeric',month:'long'})}</p>${statsHtml(w)}
   <div class="rsec">Projets</div>${projListHtml(w)}`);
  else if(i===1)h=shell(`<h2>Tes habitudes</h2><p class="lead">Pour chacune : la garder, l’alléger (moins souvent ou plus court) ou la mettre en pause. Rendre plus facile, ce n’est pas abandonner.</p>${typeof hbReviewHtml==='function'?hbReviewHtml(w):''}`);
  else h=shell(`<h2>Ce que tu retiens</h2><p class="lead">Ce qui a marché, ce qui a coincé, ce que tu ajustes la semaine prochaine.</p>
   <textarea data-review rows="7">${esc((S.weeks[w]||{}).review||'')}</textarea>`,'Terminer la revue');
 }
 showModal(h);saveRit();
 const R=RIT_AI[ritual.type+ritual.step];
 // plus d'appel automatique du Génie dans les rituels : un bouton ✦ au début suffit
}
// garde ce qui a été saisi sur l'étape en cours (heures, note, revue) ; false si c'est invalide
function ritKeep(){const d=ritual.day,sh=$('#sheet');
 if(ritual.type==='plan'&&ritual.step===0){const g=k=>{const x=sh.querySelector(`[data-rh="${k}"]`),[a,b]=(x&&x.value||'').split(':').map(Number);return isNaN(a)?null:a+(b||0)/60};const hs=g('s'),he=g('e');if(hs===null||he===null||he<=hs){toast('L’heure de fin doit être après le début');return false}S.days[d]=Object.assign(S.days[d]||{},{hs,he})}
 if(ritual.type==='shutdown'&&ritual.step===2){const v=sh.querySelector('[data-note]');S.days[d]=Object.assign(S.days[d]||{},{note:v?v.value.trim():''})}
 if(ritual.type==='weekreview'&&ritual.step===2){const w=monday(d),v=sh.querySelector('[data-review]');S.weeks[w]=Object.assign(S.weeks[w]||{},{review:v?v.value.trim():''})}
 return true}
// aller directement à une étape en cliquant sur son onglet
function ritGo(i){if(!ritual||i===ritual.step)return;if(!ritKeep())return;save();ritual.step=Math.max(0,Math.min(RIT[ritual.type].length-1,i));saveRit();renderRitual()}
function ritNext(){
 const n=RIT[ritual.type].length,d=ritual.day;
 const sh=$('#sheet');
 if(!ritKeep())return;
 if(ritual.type==='plan'&&ritual.step===6){const v=sh.querySelector('[data-intent]');emit('ritual:plan',{day:d});S.days[d]=Object.assign(S.days[d]||{},{planned:true,intent:v?v.value.trim():''})}
 if(ritual.type==='shutdown'&&ritual.step===3){emit('ritual:shutdown',{day:d});S.days[d]=Object.assign(S.days[d]||{},{shutdown:true});if(S.running)stopTimer()}
 if(ritual.type==='weekplan'&&ritual.step===2){const w=monday(d);S.weeks[w]=Object.assign(S.weeks[w]||{},{planned:true})}
 save();
 if(ritual.step>=n-1){const ty=ritual.type;ritual=null;lsDel(RKEY);closeModal();toast(ty==='plan'?'Journée planifiée. Bon travail !':ty==='shutdown'?'Journée clôturée. Repose-toi bien.':ty==='weekplan'?'Semaine planifiée.':'Revue enregistrée.');if(ty==='shutdown')chime(520);return}
 ritual.step++;renderRitual();
}

/* ---------- mode focus ---------- */
function openFocus(id,sub){
 const t=T(id);if(!t)return;
 if(!$('#modal').classList.contains('hidden')){$('#modal').classList.add('hidden');modalTask=null;ritual=null}
 focusOn=id;const fs=sub&&t.subtasks.find(x=>x.id===sub)||t.subtasks.find(x=>!x.d);focusSub=fs?fs.id:null;const fresh=!S.running||S.running.taskId!==id;if(fresh){startTimer(id);chime(523)}activate(t);renderFocus();if(fresh)breathe();
}
// mode focus « Lampe » : la lampe du Génie ; l'anneau doré se remplit avec le temps prévu, une volute de fumée par sous-tâche faite
const RING_C=2*Math.PI*104;
const FCHK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
// surprise (v3.0) : en cochant, le Génie sort de la lampe dans une volute d'or, puis s'envole
function genieWish(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=document.createElement('div');el.className='gwish';el.setAttribute('aria-hidden','true');
 el.innerHTML=`<svg viewBox="0 0 200 220"><path class="gwsmoke" d="M100 200c-30-20 30-40 0-70s-35-45 5-70c25-16 35-30 22-48"/><g class="gwfig"><circle cx="128" cy="20" r="14"/><circle cx="123" cy="18" r="2.2" class="gweye"/><circle cx="133" cy="18" r="2.2" class="gweye"/><path d="M122 25q6 5 12 0" class="gwmouth"/></g>${[...Array(9)].map((_,i)=>`<circle class="gwstar" style="--i:${i}" cx="${100+Math.cos(i*0.7)*70}" cy="${110+Math.sin(i*1.3)*80}" r="${2+i%3}"/>`).join('')}</svg>`;
 document.body.appendChild(el);setTimeout(()=>el.remove(),1900)}
function ringFrac(t){const a=actualSec(t);return t.est?Math.min(1,a/(t.est*60)):(a%3600)/3600}
function lampSvg(t,run){
 const f=ringFrac(t),over=!!(t.est&&actualSec(t)>=t.est*60),nd=Math.min(5,(t.subtasks||[]).filter(x=>x.d).length);
 const wisps=[...Array(nd)].map((_,i)=>`<path class="fwisp" style="--i:${i}" d="M${198+i*2} 94c-7-5 5-11-2-18s-12-2-10-9c1-6 7-8 5-15"/>`).join('');
 return `<svg class="flampsvg${run?' run':''}${over?' over':''}" viewBox="0 0 260 260" aria-hidden="true">
 <circle cx="130" cy="130" r="104" class="frtrack"/>
 <circle cx="130" cy="130" r="104" class="frbar" data-live="ring" stroke-dasharray="${(f*RING_C).toFixed(1)} ${RING_C.toFixed(1)}" transform="rotate(-90 130 130)"/>
 <g class="frdots"><circle cx="234" cy="130" r="2"/><circle cx="130" cy="234" r="2"/><circle cx="26" cy="130" r="2"/><circle cx="130" cy="26" r="2"/></g>
 <g class="fwisps">${wisps}</g>
 <g class="fsparks"><circle cx="200" cy="86" r="2.6"/><circle cx="214" cy="78" r="1.8"/><circle cx="196" cy="70" r="1.4"/></g>
 <g class="fbody"><circle cx="78" cy="138" r="13" class="fhandle"/><path d="M168 142C180 136 190 122 200 116c6-4 12 2 8 8-8 14-22 32-42 36z"/><ellipse cx="126" cy="146" rx="48" ry="30"/><path class="flid" d="M96 126a30 22 0 0 1 60 0z"/><circle class="flid" cx="126" cy="100" r="6"/><rect class="ffoot" x="106" y="172" width="40" height="8" rx="4"/>
 ${run?'<circle class="feye" cx="112" cy="150" r="3"/><circle class="feye" cx="140" cy="150" r="3"/>':'<path class="feyec" d="M108 150q4 3 8 0M136 150q4 3 8 0"/>'}<path class="fmouth" d="M119 158q7 5 14 0"/></g>
 <circle class="fflame" cx="206" cy="104" r="7"/>
 </svg>`}
function renderFocus(){
 const el=$('#focus');
 if(!focusOn){el.classList.add('hidden');return}
 const t=T(focusOn);if(!t){focusOn=null;el.classList.add('hidden');return}
 const c=ch(t.channel),run=S.running&&S.running.taskId===t.id;
 el.classList.remove('hidden');el.classList.add('lamp');
 const sb=focusSub&&t.subtasks.find(x=>x.id===focusSub),nd=(t.subtasks||[]).filter(x=>x.d).length;
 el.innerHTML=`<div class="fwrap"><div class="ftop">${c?`<span class="chip" style="--c:${esc(c.color)}">${esc(c.name)}</span>`:''}<span class="ftopacts">${genieBtn('focus',t.id,'Je bloque')}<button class="sm ghost" data-act="focusmin" title="Réduire (Échap) : le minuteur continue, une pastille permet de revenir">${ico('minimize')}Réduire</button><button class="sm ghost" data-act="focusclose" title="Quitter le focus">Quitter</button></span></div>
 <div class="fhero"><div class="flamp">${lampSvg(t,run)}</div><div class="finfo">
 ${sb?`<div class="fsub">${esc(t.title)} · sous-tâche ${t.subtasks.indexOf(sb)+1}/${t.subtasks.length}</div><h1 class="ftitle">${esc(sb.t)}</h1>`:`<h1 class="ftitle">${esc(t.title)}</h1>`}
 <div class="fclockrow">${focusEdit===t.id?`<input class="fclock fedit" data-fedit="${t.id}" value="${Math.floor(actualSec(t)/60)}" inputmode="numeric" aria-label="Temps passé en minutes (ou 1h20)" title="Minutes, ou 1h20">`:`<button class="fclock${t.est&&actualSec(t)>=t.est*60?' over':''}" data-live="focus" data-act="timeredit" data-id="${t.id}" title="Cliquer pour corriger le temps">${clock(actualSec(t))}</button>`}<div class="fadj"><button class="sm" data-act="timeradj" data-id="${t.id}" data-v="-5" aria-label="Retirer 5 minutes">−5 min</button><button class="sm" data-act="timeradj" data-id="${t.id}" data-v="5" aria-label="Ajouter 5 minutes">+5 min</button></div><button class="freset" data-act="timerreset" data-id="${t.id}" aria-label="Remettre à zéro (met en pause)" title="Remettre à zéro (met en pause)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></button></div>
 <div class="fmeta">${t.est?'sur '+fmtMin(t.est):'pas de durée prévue · un tour = 1 h'}${(t.subtasks||[]).length?` · ${nd}/${t.subtasks.length} sous-tâche${t.subtasks.length>1?'s':''}`:''}</div>
 <div class="fbtns"><button class="${run?'ghost':'pri'} big" data-act="timer" data-id="${t.id}">${run?'Pause':'Reprendre'}</button>${focusSub?`<button class="fchk" data-act="focussubdone" aria-label="Cocher la sous-tâche" title="Cocher la sous-tâche">${FCHK}</button><span class="fchkl">Sous-tâche faite</span><button class="ghost big" data-act="focusdone" data-id="${t.id}">Tout terminer</button>`:`<button class="fchk" data-act="focusdone" data-id="${t.id}" aria-label="Cocher : tâche terminée" title="Cocher : tâche terminée">${FCHK}</button><span class="fchkl">Terminée</span>`}</div>
 </div></div>
 <div class="subs"><h4>Sous-tâches</h4><div>${subsHtml(t)}</div><form data-form="sub" data-tid="${t.id}"><input name="t" data-keep="fsub" placeholder="Ajouter une sous-tâche" autocomplete="off"></form></div>
 <textarea class="fnotes" data-fnotes="${t.id}" placeholder="Notes…">${esc(t.notes)}</textarea></div>`;
}

/* ---------- boucle d'une seconde ---------- */
setInterval(()=>{
 const r=S.running,t=r&&T(r.taskId);
 if(t){const el=document.querySelector('[data-live="run"]');if(el)el.textContent=clock(actualSec(t));const mi=document.querySelector('[data-live="mini"]');if(mi)mi.textContent=clock(actualSec(t));
  const f=document.querySelector('[data-live="focus"]');if(f&&focusOn===t.id){f.textContent=clock(actualSec(t));f.classList.toggle('over',!!(t.est&&actualSec(t)>=t.est*60));const rg=document.querySelector('[data-live="ring"]');if(rg){rg.setAttribute('stroke-dasharray',(ringFrac(t)*RING_C).toFixed(1)+' '+RING_C.toFixed(1));rg.closest('svg').classList.toggle('over',!!(t.est&&actualSec(t)>=t.est*60))}}
  const c=document.querySelector(`[data-live="t-${t.id}"]`);if(c)c.textContent=fmtMin(actualSec(t)/60)+' / '+(t.est?fmtMin(t.est):'—');}
 document.querySelectorAll('[data-live="now"]').forEach(nl=>{const n=new Date();nl.style.top=((n.getHours()-calGeom().st)*60+n.getMinutes())/60*PX+'px'});
 if(today()!==lastDay){const was=lastDay;lastDay=today();if(cur===was)cur=lastDay;genRecurring();render()}
},1000);

// une respiration avant de commencer : le cercle grandit (inspire) puis se resserre (expire), puis s'efface ; ne bloque rien
function breathe(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const f=document.getElementById('focus');if(!f||f.classList.contains('hidden'))return;
 const o=document.createElement('div');o.className='breathe';o.setAttribute('aria-hidden','true');o.innerHTML='<i></i><span class="in">Inspire</span><span class="out">Expire</span>';f.appendChild(o);setTimeout(()=>o.remove(),9000)}catch(e){}}

// agenda 0 h – 24 h : s'ouvre sur le moment présent (aujourd'hui) ou sur le début de ta journée (autres jours), placé au tiers haut
function calFocus(sc,isToday){const n=new Date(),h=isToday?n.getHours()+n.getMinutes()/60:Math.max(0,(S.settings.workStart||9)-0.5);return Math.max(0,h*PX-sc.clientHeight/3)}
