// Diem — vues (Aujourd’hui, Semaine, Vide-tête, Backlog, Revue, Réglages, agendas)
/* ---------- rendu : morceaux communs ---------- */
let subOpen=new Set((()=>{try{return JSON.parse(localStorage.getItem('journee.subopen')||'[]')}catch(e){return[]}})());
function card(t){
 const c=ch(t.channel),run=S.running&&S.running.taskId===t.id;
 const so=t.subtasks&&t.subtasks.length&&subOpen.has(t.id),subs=t.subtasks&&t.subtasks.length?`<button class="subtog${so?' on':''}" data-act="subopen" data-id="${t.id}" aria-expanded="${!!so}" title="${so?'Replier':'Dérouler'} les sous-tâches"><i>▸</i>${t.subtasks.filter(s=>s.d).length}/${t.subtasks.length} sous-tâche${t.subtasks.length>1?'s':''}</button>`:'';
 const subl=so?`<div class="csubs">${t.subtasks.map(x=>`<div class="csub${x.d?' d':''}"><button class="chk" data-act="subt" data-tid="${t.id}" data-s="${x.id}" aria-label="${x.d?'Rouvrir':'Terminer'} : ${esc(x.t)}">${x.d?'✓':''}</button><span>${esc(x.t)}</span></div>`).join('')}</div>`:'';
 const act=actualSec(t);
 return `<div class="card${t.done?' done':''}${run?' running':''}" draggable="true" data-drag="task|${t.id}" data-id="${t.id}">
 <button class="chk" data-act="toggle" data-id="${t.id}" aria-label="${t.done?'Rouvrir':'Terminer'}">${t.done?'✓':''}</button>
 <div class="cbody" data-act="open" data-id="${t.id}"><div class="ctitle">${(S.days[t.day]||{}).phare===t.id&&!t.done?'<span class="phare" title="Tâche phare du jour">★</span>':''}${t.prio==='high'||t.prio==='urgent'?`<span class="pflag" title="Priorité haute">${flagSvg('high')}</span>`:t.prio==='low'?`<span class="pflag" title="Priorité basse : peut glisser">${flagSvg('low')}</span>`:''}${esc(t.title)}</div>
 <div class="cmeta">${(()=>{const w=whereOf(t);return w==="home"?`<span class="wh" title="Chez moi">${ico("home")}chez moi</span>`:w==="out"?`<span class="wh" title="Dehors">${ico("walk")}dehors</span>`:""})()}${c?`<span class="chip pc" data-act="pickcat" data-id="${t.id}" style="--c:${esc(c.color)}" title="${t.aiCat?'Devinée par Claude — clique pour changer':'Changer de catégorie'}">${esc(nodeLabel(c.id))}${t.aiCat?' ✦':''}</span>`:t.done?'':`<span class="chip pc nocat" data-act="pickcat" data-id="${t.id}">+ catégorie</span>`}${t.proj&&proj(t.proj)?`<span class="pchip">◆ ${esc(proj(t.proj).name)}</span>`:''}${t.block?`<span title="${t.pinned?'Heure fixée':'Suit l’ordre de la liste'}">${hm(new Date(t.block.start))}${t.pinned?' 📌':''}</span>`:''}${(t.roll||0)>=4&&!t.done?`<span class="rollm" data-act="rollmenu" data-id="${t.id}" title="Reportée ${t.roll} fois — que veux-tu en faire ?">↻ ${t.roll}</span>`:''}${t.src?'<span class="src">To Do</span>':''}${t.recurId?'<span title="Récurrente">↻</span>':''}${dueLabel(t)}${subs}${t.aiSug&&!t.done?`<span class="aisug">Claude : ${esc([t.aiSug.channel&&ch(t.aiSug.channel)?nodeLabel(t.aiSug.channel):'',t.aiSug.est?fmtMin(t.aiSug.est):''].filter(Boolean).join(' · '))}<button data-act="aiok" data-id="${t.id}" aria-label="Accepter la suggestion">✓</button><button data-act="aino" data-id="${t.id}" aria-label="Refuser la suggestion">✕</button></span>`:''}</div>${subl}</div>
 <div class="ctime"><span class="est" data-act="estmenu" data-id="${t.id}" data-live="t-${t.id}" title="Temps passé / estimé — clique pour changer la durée">${act>=60||run?fmtMin(act/60)+' / ':''}${t.est?fmtMin(t.est):'<span class="nodur">+ durée</span>'}</span>${t.done?'':`<button class="play" data-act="play" data-id="${t.id}" aria-label="Démarrer le focus">▶</button>`}</div></div>`;
}
function loadInfo(d){const ts=dayTasks(d);const task=ts.reduce((a,t)=>a+(t.est||0),0),meet=meetingMin(d),cap=Math.max(60,(dayHours(d).e-dayHours(d).s)*60);return{task,meet,cap,over:task+meet-cap}}
function loadBar(d){
 const L=loadInfo(d),p=v=>Math.min(100,v/L.cap*100);
 return `<div class="load${L.over>0?' over':''}"><div class="lbar"><i class="m" style="width:${p(L.meet)}%"></i><i class="t" style="width:${Math.max(0,Math.min(100-p(L.meet),p(L.task)))}%"></i></div>
 <div class="ltxt"><span>${fmtMin(L.task)} de tâches${L.meet?' · '+fmtMin(L.meet)+' de rendez-vous':''} sur ${fmtMin(L.cap)} de travail</span><span>${L.over>0?fmtMin(L.over)+' de trop':fmtMin(-L.over)+' de marge'}</span></div></div>`;
}
const addForm=(day,ph,keep)=>`<form class="add" data-form="add" data-day="${day||''}"><input name="t" data-keep="${keep||'add-'+(day||'backlog')}" placeholder="${esc(ph)}" autocomplete="off" aria-label="Nouvelle tâche" aria-describedby="addhint-${keep||day||'b'}"><small class="addhint" id="addhint-${keep||day||'b'}">Tu peux écrire <b>45m</b>, <b>demain</b>, <b>!</b> (priorité), <b>@maison</b>, <b>#natation</b>, <b>+projet</b> · Entrée pour ajouter${keep?'':' · touche N pour revenir ici'}</small></form>`;
const objChips=w=>{const os=weekObjs(w);return os.length?`<div class="objs">${os.map(o=>`<span class="obj${o.done?' done':''}">${esc(o.title)}</span>`).join('')}</div>`:''};

/* ---------- vue Aujourd'hui ---------- */
function eventsHtml(d){
 const evs=timedEvents(d);if(!evs.length)return '';
 return `<div class="evlist"><h4>Rendez-vous Google Agenda — indique si tu peux avancer sur tes tâches pendant</h4>${evs.map(e=>{const f=evFree(e);return `<div class="evrow${f?' free':''}"><span class="evt">${hm(new Date(e.start.dateTime))}–${hm(new Date(e.end.dateTime))}</span><span class="evn">${esc(e.summary||'(sans titre)')}${e.recurringEventId?' ↻':''}${e._cal&&gCals&&gCals.filter(calOn).length>1?` <small>· ${esc(e._cal)}</small>`:''}</span><button class="sm ${f?'':'ghost'}" data-act="evtoggle" data-k="${esc(evKey(e))}">${f?'Je peux travailler':'Occupé'}</button></div>`}).join('')}</div>`;
}
const isMobile=()=>innerWidth<720;
function mobileTimeline(d){
 // téléphone : une seule colonne qui mêle rendez-vous et tâches dans l'ordre de la journée
 const ts=dayTasks(d),evs=timedEvents(d).map(e=>({k:'ev',s:+new Date(e.start.dateTime),e:+new Date(e.end.dateTime),e0:e}));
 const sch=ts.filter(t=>!t.done&&t.block).map(t=>({k:'t',s:+new Date(t.block.start),e:+new Date(t.block.end),t}));
 const bd=+parseYmd(d),ads=(typeof jobSegs==='function'?jobSegs(d):[]).filter(x=>x.allday).map(x=>({k:'ad',s:bd+x.s*3600e3,e:bd+x.e*3600e3,x}));
 const items=[...ads,...evs,...sch].sort((a,b)=>a.s-b.s),now=Date.now();let nowDone=false;
 const rows=items.map(it=>{let pre='';if(!nowDone&&d===today()&&it.s>now){nowDone=true;pre='<div class="mnow"><span>'+hm(new Date())+'</span></div>'}
  if(it.k==='ad'){const x=it.x;return pre+`<div class="mrow"><div class="mtime">${hShort(x.s)}</div><div class="mev allday" style="${x.col?'--adc:'+esc(x.col):''}"><b>${esc(x.t)}</b><small>journée entière · ${hShort(x.s)}–${hShort(x.e)}</small></div></div>`}
  if(it.k==='ev'){const e=it.e0,f=evFree(e);return pre+`<div class="mrow"><div class="mtime">${hm(new Date(it.s))}</div><div class="mev${f?' free':''}${e._ua?' ua':''}" data-act="evtoggle" data-k="${esc(evKey(e))}"><b>${esc(e.summary||'(sans titre)')}</b><small>${hm(new Date(it.s))}–${hm(new Date(it.e))}${f?' · tu peux travailler':' · occupé'}</small></div></div>`}
  return pre+`<div class="mrow"><div class="mtime">${hm(new Date(it.s))}</div>${card(it.t)}</div>`}).join('');
 const rest=ts.filter(t=>!t.done&&!t.block),done=ts.filter(t=>t.done);
 return `<div class="mtl" data-drop="day:${d}">${rows||'<div class="empty">Rien de prévu. Ajoute une tâche ci-dessus.</div>'}${!nowDone&&d===today()&&items.length?'<div class="mnow"><span>'+hm(new Date())+'</span></div>':''}</div>
 ${rest.length?`<div class="rsec">Sans créneau</div><div class="list">${rest.map(card).join('')}</div>`:''}
 ${done.length?`<div class="rsec">Terminées</div><div class="list">${done.map(card).join('')}</div>`:''}
 <p class="mute" style="font-size:12.5px;margin-top:10px">Astuce : appui long sur une tâche pour la déplacer, la reporter ou fixer son heure.</p>`;
}
function taskSheet(id){
 const t=T(id);if(!t)return;const d=t.day||cur,ts=dayTasks(d).filter(x=>!x.done),i=ts.indexOf(t);
 showModal(`<div class="rit tsheet"><button class="sheetx" data-act="close" aria-label="Fermer" title="Fermer (Échap)">×</button><h2>${esc(t.title)}</h2><div class="menu">
  ${i>=0&&ts.length>1?`<div class="mvrow"><button class="mvico" data-act="mvup" data-id="${t.id}" aria-label="Monter d’un cran" title="Monter d’un cran" ${i>0?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button><button class="mvico" data-act="mvdown" data-id="${t.id}" aria-label="Descendre d’un cran" title="Descendre d’un cran" ${i<ts.length-1?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button></div>`:''}
  <div class="mvrow">${PRIOS.map(([v,l])=>`<button class="mvico pbtn${(t.prio||'')===v?' on':''}" data-act="setprio" data-id="${t.id}" data-p="${v}" aria-label="Priorité ${l.toLowerCase()}" title="Priorité ${l.toLowerCase()}">${flagSvg(v)}</button>`).join('')}</div>
  <button data-act="play" data-id="${t.id}">Focus</button>
  ${t.day!==today()?`<button data-act="sheetmv" data-id="${t.id}" data-to="${today()}">Aujourd’hui</button>`:''}
  <button data-act="sheetmv" data-id="${t.id}" data-to="${addDays(today(),1)}">Demain</button>
  <button data-act="sheetmv" data-id="${t.id}" data-to="backlog">Backlog</button>
  <label class="full">Fixer l’heure<input type="time" step="900" data-sheettime="${t.id}" value="${t.block?hm(new Date(t.block.start)):''}"></label>
  <button data-act="open" data-id="${t.id}">Détail</button>
  <button class="danger" data-act="rmsheet" data-id="${t.id}">Supprimer</button>
 </div></div>`);
}
function swapTask(id,dir){const t=T(id);if(!t)return;const d=t.day,ts=dayTasks(d).filter(x=>!x.done),i=ts.indexOf(t),j=i+dir;if(j<0||j>=ts.length)return;const o=ts[j].order;ts[j].order=t.order;t.order=o;renorm(d);if(!flowOn())reflow(d);save();render()}
let lp=null;
document.addEventListener('touchstart',e=>{const c=e.target.closest('.card[data-id]');if(!c||e.target.closest('button'))return;const x=e.touches[0];lp={id:c.dataset.id,x:x.clientX,y:x.clientY,t:setTimeout(()=>{lp=null;if(navigator.vibrate)navigator.vibrate(15);taskSheet(c.dataset.id)},480)}},{passive:true});
document.addEventListener('touchmove',e=>{if(!lp)return;const x=e.touches[0];if(Math.abs(x.clientX-lp.x)+Math.abs(x.clientY-lp.y)>10){clearTimeout(lp.t);lp=null}},{passive:true});
document.addEventListener('touchend',()=>{if(lp){clearTimeout(lp.t);lp=null}});
document.addEventListener('contextmenu',e=>{const c=e.target.closest('.card[data-id]');if(c&&isMobile()){e.preventDefault()}});
let lastW=innerWidth;addEventListener('resize',()=>{if((innerWidth<720)!==(lastW<720)){lastW=innerWidth;render()}else lastW=innerWidth});
function summaryHtml(d,isT){
 // une seule ligne de repères, chaque puce ouvre le détail
 const info=S.days[d]||{},past=isT?pastUndone():[],soon=isT?S.tasks.filter(t=>!t.done&&t.due&&t.due<=addDays(today(),2)):[],L=loadInfo(d),evs=timedEvents(d),objs=weekObjs(monday(d));
 const open=uiOpen;const chip=(k,txt,cls)=>`<button class="sumchip${cls?' '+cls:''}${open===k?' on':''}" data-act="sum" data-k="${k}">${txt}</button>`;
 const chips=[
  chip('load',`<i class="meter"><i style="width:${Math.min(100,(L.task+L.meet)/L.cap*100)}%"></i></i>${fmtMin(L.task+L.meet)} / ${fmtMin(L.cap)}`,L.over>0?'warn':''),
  chip('job',ico('case')+jobLabel(d),jobOf(d)?'':'quiet'),
  isT?(()=>{const base=+parseYmd(d),end=base+dayHours(d).e*3600e3,left=Math.max(0,Math.round((end-Date.now())/60000)),plan=dayTasks(d).filter(t=>!t.done).reduce((s,t)=>s+Math.max(0,(t.est||0)-Math.floor((t.actual||0)/60)),0);return chip('left',`${ico('clock')}${left?'<span class="lg">Il te reste </span>'+fmtMin(left):'Journée finie'}<span class="lg"> · ${fmtMin(plan)} prévues</span>`,plan>left?'warn':'')})():'',
  evs.length?chip('ev',`${evs.length} rendez-vous`):'',
  soon.length?chip('due',`⏰ ${soon.length} échéance${soon.length>1?'s':''}`,'acc'):'',
  objs.length?chip('obj',`${objs.filter(o=>o.done).length}/${objs.length} objectif${objs.length>1?'s':''}`):'',
  isT&&flowOn()?`<button class="sumchip${info.frozen?' on':''}" data-act="freeze" title="${info.frozen?'Journée figée : les créneaux ne glissent plus avec l’heure':'Les créneaux suivent l’heure ; clique pour figer'}">${info.frozen?'❄ Figée':'Figer'}</button>`:''
 ].join('');
 let det='';
 if(open==='load')det=loadBar(d);
 else if(open==='job')det=jobPicker(d);
 else if(open==='ev')det=eventsHtml(d);
 else if(open==='late'&&past.length)det=`<div class="row" style="flex-wrap:wrap"><span>${past.length} tâche${past.length>1?'s':''} non terminée${past.length>1?'s':''} des jours précédents.</span><span class="sp"></span><button class="sm pri" data-act="rollover">Tout ici</button><button class="sm" data-act="plan">Trier une à une</button></div>`;
 else if(open==='due')det=`<div class="row" style="flex-wrap:wrap">${soon.map(t=>`<button class="sm ghost" data-act="open" data-id="${t.id}">${esc(t.title)} · ${dueLabel(t).replace(/<[^>]+>/g,'').replace('⏰ ','')}</button>`).join('')}</div>`;
 else if(open==='obj')det=objChips(monday(d))||'';
 return `<div class="summary">${chips}</div>${det?`<div class="sumdet">${det}</div>`:''}`;
}
let uiOpen='',uiDoneOpen=false;
// bascule liste ⇄ grand agenda : une icône, toujours au même endroit dans l'en-tête
const layoutBtn=()=>`<button class="layoutbtn" data-act="layout" aria-label="${layout==='cal'?'Liste au centre':'Grand agenda au centre'} (touche C)" title="${layout==='cal'?'Liste au centre':'Grand agenda au centre'} (C)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${layout==='cal'?'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>':'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16M15 4v16"/>'}</svg></button>`;
function viewToday(){
 const d=cur,isT=d===today(),ts=dayTasks(d),info=S.days[d]||{};
 const title=isT?'Aujourd’hui':d===addDays(today(),1)?'Demain':d===addDays(today(),-1)?'Hier':cap1(fmtDay(d,{weekday:'long'}));
 const done=ts.filter(t=>t.done),r=savedRit();
 const planLbl=r&&r.type==='plan'&&r.day===d?'Reprendre':info.planned?'Replanifier':'Planifier ma journée';
 // une seule action mise en avant, selon le moment ; les autres sont dans •••
 const h=new Date().getHours(),past=d<today();
 const main=past?null:!isT||(!info.planned&&h<S.settings.workEnd)?['plan',planLbl,'P']:h>=S.settings.workEnd&&!info.shutdown?['shutdown','Clôturer la journée','S']:dayTasks(d).some(t=>!t.done)?['focusnext','Focus','F']:['shutdown',info.shutdown?'Revoir le bilan':'Clôturer la journée','S'];
 const pct=ts.length?Math.round(done.length/ts.length*100):0,ring=ts.length?`<span class="dayring${pct===100?' full':''}" title="${done.length}/${ts.length} tâches faites" aria-label="${done.length} sur ${ts.length} tâches faites"><svg viewBox="0 0 36 36"><circle class="rbg" cx="18" cy="18" r="15.9"/><circle class="rfg" cx="18" cy="18" r="15.9" pathLength="100" stroke-dasharray="${pct} 100"/>${pct===100?'<g class="rsun"><circle cx="18" cy="18" r="5"/><path d="M18 8.5v2.5M18 25v2.5M8.5 18h2.5M25 18h2.5M11.3 11.3l1.8 1.8M22.9 22.9l1.8 1.8M24.7 11.3l-1.8 1.8M13.1 22.9l-1.8 1.8"/></g>':`<text x="18" y="21.5">${done.length}</text>`}</svg></span>`:'';
 const hz=isT?(()=>{const h=dayHours(d),b=+parseYmd(d),p=Math.max(0,Math.min(1,(Date.now()-(b+h.s*3600e3))/((h.e-h.s)*3600e3))),hr=new Date().getHours();return `<div class="horizon" style="--p:${p.toFixed(3)}" title="Ta journée : ${Math.round(p*100)} % du temps écoulé" aria-hidden="true"><i class="hsun${hr>=20||hr<6?' moon':''}"></i></div>`})():'';
 return `${hz}<div class="head tight"><div class="htitle"><h1>${title}${ring}</h1><div class="sub kicker">${cap1(fmtDay(d,{weekday:'long',day:'numeric',month:'long'}))}${info.intent?' · <em>'+esc(info.intent)+'</em>':''}</div></div>
 <div class="acts"><div class="dnav"><button data-act="prev" aria-label="Jour précédent">‹</button>${isT?'':'<button data-act="gotoday">Aujourd’hui</button>'}<button data-act="next" aria-label="Jour suivant">›</button></div>${main?`<button class="pri" data-act="${main[0]}">${main[1]}<kbd class="k">${main[2]}</kbd></button>`:''}<button class="more" data-act="daymenu" aria-label="Autres actions de la journée">•••</button>${layoutBtn()}</div></div>
 ${summaryHtml(d,isT)}

 <button class="addopen" data-act="addopen" data-d="${d}" aria-label="Ajouter une tâche (touche N)">${ico('plus')}<span>Ajouter une tâche</span><kbd>N</kbd></button>
 ${isT?nowNext(d):''}
 ${isMobile()&&isT?mobileTimeline(d):`<div class="list" data-drop="day:${d}">${ts.length?ts.filter(t=>!t.done).map(card).join('')||'<div class="empty">Tout est fait.</div>':'<div class="empty">Rien de prévu. Ajoute une tâche, ou lance la planification.</div>'}</div>${done.length?`<details class="donegrp" data-donegrp ${uiDoneOpen?'open':''}><summary>${ico('check')}Faites (${done.length})</summary><div class="list donelist">${done.map(card).join('')}</div></details>`:''}`}
 ${(()=>{const sl=S.tasks.filter(t=>!t.done&&t.slid===d&&t.day===addDays(d,1));return sl.length?`<button class="slidnote" data-act="next">${sl.length} tâche${sl.length>1?'s':''} à demain →</button>`:''})()}
 ${ts.length?`<div class="foot">${done.length}/${ts.length} terminée${done.length>1?'s':''} · ${fmtMin(ts.reduce((a,t)=>a+actualSec(t),0)/60)} suivies</div>`:''}
 ${info.note?`<div class="note"><b>Fin de journée</b>\n${esc(info.note)}</div>`:''}`;
}
// tâche reportée souvent : quatre sorties possibles, sans jugement
function rollMenu(id){
 const t=T(id);if(!t)return;
 showModal(`<div class="rit"><h2>${esc(t.title)}</h2><p class="lead">Reportée ${t.roll} fois.</p><div class="menu">
  <button data-act="play" data-id="${t.id}">Focus</button>
  <button data-act="rolltomorrow" data-id="${t.id}">Demain</button>
  <button data-act="sheetmv" data-id="${t.id}" data-to="backlog">Backlog</button>
  <button class="danger" data-act="rolldrop" data-id="${t.id}">Supprimer</button>
 </div></div>`);
}
function dayMenu(){
 const d=cur,info=S.days[d]||{};
 showModal(`<div class="rit"><h2>${cap1(fmtDay(d,{weekday:'long',day:'numeric',month:'long'}))}</h2><div class="menu">
  <button data-act="plan">${info.planned?'Replanifier la journée':'Planifier la journée'}<kbd>P</kbd></button>
  <button data-act="focusnext">Focus<kbd>F</kbd></button>
  <button data-act="shutdown">${info.shutdown?'Revoir le bilan du jour':'Clôturer la journée'}<kbd>S</kbd></button>
  ${flowOn()&&d===today()?`<button data-act="freeze">${info.frozen?'Libérer la journée (les créneaux suivent l’heure)':'Figer la journée (les créneaux ne glissent plus)'}</button>`:''}
  ${d===today()&&flowOn()?`<button data-act="plan">Mes heures et mon plan du jour (${hhmm(dayHours(d).s)} → ${hhmm(dayHours(d).end)})</button>`:''}
  <button data-act="tplfromday">Enregistrer comme modèle</button>
  <button data-act="palopen">Rechercher ou lancer une commande<kbd>⌘K</kbd></button>
 </div></div>`);
}

/* ---------- vue Semaine ---------- */
function viewWeek(){
 const w=monday(cur),days=[...Array(7)].map((_,i)=>addDays(w,i));
 const tot=days.reduce((a,d)=>a+dayTasks(d).reduce((x,t)=>x+(t.est||0),0),0);
 return `<div class="head"><div><h1>Semaine du ${fmtDay(w,{day:'numeric',month:'long'})}</h1><div class="sub kicker">${fmtMin(tot)} de tâches prévues</div></div>
 <div class="dnav"><button data-act="prevw" aria-label="Semaine précédente">‹</button><button data-act="gotoday">Cette semaine</button><button data-act="nextw" aria-label="Semaine suivante">›</button></div>
 <div class="acts"><button data-act="weekplan">Planifier la semaine</button>${layoutBtn()}</div></div>
 ${objChips(w)}
 <div class="week">${days.map(d=>{const ts=dayTasks(d),L=loadInfo(d);return `<div class="wcol${d===today()?' today':''}">
  <h3 data-act="openday" data-day="${d}">${cap1(fmtDay(d,{weekday:'short',day:'numeric'}))}<small class="${L.over>0?'':'mute'}" style="${L.over>0?'color:var(--warn)':''}">${fmtMin(L.task)}</small></h3>
  ${addForm(d,'+ Tâche')}
  ${timedEvents(d).map(e=>`<div class="evrow mini${evFree(e)?' free':''}" title="${esc(e.summary||'')}"><span class="evt">${hm(new Date(e.start.dateTime))}</span><span class="evn">${esc(e.summary||'(sans titre)')}</span></div>`).join('')}
  <div class="list" data-drop="day:${d}">${ts.map(card).join('')}</div></div>`}).join('')}</div>`;
}

/* ---------- vide-tête (brain dump) ---------- */
let dumpAI=null,rec=null;
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function viewDump(){
 const inbox=S.tasks.filter(t=>t.inbox&&!t.done);
 return `<div class="head"><div><h1>Vide-tête</h1><div class="sub">Écris tout ce qui t’encombre l’esprit, une idée par ligne. Tu trieras après.</div></div></div>
 <textarea class="dump" data-dump rows="10" placeholder="Rappeler le garagiste&#10;Idée cadeau pour Raf&#10;Préparer le devis lundi 45m #villette&#10;Acheter des ampoules demain…">${esc(S.dump||'')}</textarea>
 <div class="row" style="flex-wrap:wrap;margin:10px 0 4px">${SR?`<button data-act="dictate">${rec?'■ Arrêter la dictée':'🎙 Dicter'}</button>`:''}<span class="sp"></span><button data-act="dumptasks">En tâches</button>${aiOn()?'<button class="pri" data-act="dumpai">Trier avec Claude</button>':''}</div>
 <p class="mute" style="font-size:13px;margin:4px 0 0">Astuce : « demain », « lundi », « 12/12 », « 30m », « 1h », « #catégorie » sont compris. Touche <kbd>D</kbd> pour revenir ici de n’importe où.</p>
 ${dumpAI?`<div class="aibox">${dumpAI.loading?'<span class="mute">Claude trie ton vide-tête…</span>':dumpAI.error?`<span class="mute">Claude : ${esc(dumpAI.error)}</span>`:`<b>Claude</b>${dumpAI.text?`<p>${esc(dumpAI.text)}</p>`:''}${propItems(dumpAI.prop).map(it=>`<div class="pitem${(dumpAI.applied||{})[it.k]?' ok':''}"><div>${esc(it.label)}${it.reason?`<small class="mute">${esc(it.reason)}</small>`:''}</div>${(dumpAI.applied||{})[it.k]?'<small>Fait</small>':`<button class="sm pri" data-act="dumpapply" data-k="${it.k}">Ajouter</button>`}</div>`).join('')}<div class="row">${propItems(dumpAI.prop).some(it=>!(dumpAI.applied||{})[it.k])?'<button class="sm pri" data-act="dumpapplyall">Tout ajouter</button>':''}<span class="sp"></span><button class="sm ghost" data-act="dumpaiclose">Fermer</button></div>`}</div>`:''}
 <h2 style="font-size:18px;margin:26px 0 8px">À trier (${inbox.length})</h2>
 <div class="list">${inbox.length?inbox.map(t=>card(t).replace('<div class="ctime">',`<div class="ctime"><button class="sm" data-act="inbox" data-id="${t.id}" data-to="${today()}">Aujourd’hui</button><button class="sm ghost" data-act="inbox" data-id="${t.id}" data-to="${addDays(today(),1)}">Demain</button><button class="sm ghost" data-act="inbox" data-id="${t.id}" data-to="backlog">Backlog</button>`)).join(''):'<div class="empty">Rien à trier. Les idées sans date atterrissent ici.</div>'}</div>`;
}
function dumpToTasks(){
 const lines=(S.dump||'').split('\n').map(l=>l.replace(/^[-*•\d.)\s]+/,'').trim()).filter(Boolean);if(!lines.length){toast('Ton vide-tête est vide');return}
 let n=0;for(const l of lines){const q=parseQuick(l);if(!q.title)continue;const day=q.day||null;S.tasks.push(mk({title:q.title,est:q.est,channel:q.channel,day,due:q.due||null,inbox:!day&&!q.due,order:nextOrder(day)}));n++}
 S.dump='';save();render();toast(n+' tâche'+(n>1?'s':'')+' créée'+(n>1?'s':''));
 S.tasks.filter(t=>t.inbox&&!t.est).slice(-n).forEach(aiWatch);
}
async function dumpSort(){
 const txt=(S.dump||'').trim();if(!txt){toast('Ton vide-tête est vide');return}
 dumpAI={loading:true};render();
 try{const r=await callClaude([{role:'user',content:`<contexte>\n${aiContext()}\n</contexte>\n\nVoici mon vide-tête (une idée par ligne, en vrac) :\n<vide_tete>\n${txt}\n</vide_tete>\nTransforme-le en tâches claires et actionnables (new_tasks) : reformule brièvement si besoin, fusionne les doublons, découpe ce qui contient plusieurs actions, attribue une catégorie existante, une durée réaliste et un jour (day = YYYY-MM-DD si c'est daté ou urgent, sinon "backlog"). Ce qui n'est pas une tâche (idée, note, souci) : mentionne-le dans le message, en une phrase. Message court.`}],true);dumpAI={text:r.text,prop:r.prop,applied:{}}}
 catch(e){dumpAI={error:e.message}}
 render();
}
function dictate(){
 if(!SR)return;if(rec){rec.stop();rec=null;render();return}
 rec=new SR();rec.lang='fr-FR';rec.continuous=true;rec.interimResults=false;
 rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal){const t=e.results[i][0].transcript.trim();S.dump=((S.dump||'').replace(/\s*$/,'')+(S.dump?'\n':'')+t.charAt(0).toUpperCase()+t.slice(1));save();const ta=document.querySelector('[data-dump]');if(ta)ta.value=S.dump}};
 rec.onend=()=>{rec=null;render()};rec.onerror=e=>{toast('Dictée : '+(e.error==='not-allowed'?'micro refusé':e.error));rec=null;render()};
 try{rec.start();toast('Parle, chaque phrase devient une ligne');render()}catch(e){rec=null}
}

/* ---------- routines et modèles ---------- */
const tplText=tp=>tp.items.map(i=>`${i.title}${i.est?' '+i.est+'m':''}${ch(i.channel)?' #'+ch(i.channel).name.replace(/\s+/g,''):''}${(i.subs||[]).map(x=>'\n- '+x).join('')}`).join('\n');
function tplFromText(txt){const items=[];for(const raw of txt.split('\n')){const l=raw.trim();if(!l)continue;if(/^[-•]\s*/.test(l)&&items.length){items[items.length-1].subs.push(l.replace(/^[-•]\s*/,''));continue}const q=parseQuick(l);if(q.title)items.push({title:q.title,est:q.est,channel:q.channel,subs:[]})}return items}
function applyTpl(id,day){const tp=(S.templates||[]).find(x=>x.id===id);if(!tp)return;for(const i of tp.items)S.tasks.push(mk({title:i.title,est:i.est,channel:i.channel,day,order:nextOrder(day),subtasks:(i.subs||[]).map(x=>({id:uid(),t:x,d:false}))}));save();render();toast(`« ${tp.name} » : ${tp.items.length} tâche${tp.items.length>1?'s':''} ajoutée${tp.items.length>1?'s':''} ${day?'au '+fmtDay(day,{weekday:'long',day:'numeric'}):'au backlog'}`);emit('template:apply',{tpl:tp,day})}
function tplSuggestions(){
 if(!(S.archive||[]).length)return [];const by={};
 for(const a of S.archive){if(!a.c)continue;const k=a.c;by[k]=by[k]||{};const t=a.t.trim();by[k][t]=by[k][t]||{n:0,s:0};by[k][t].n++;by[k][t].s+=a.a||0}
 const have=new Set((S.templates||[]).map(t=>t.name));
 return Object.entries(by).map(([c,m])=>({c,items:Object.entries(m).filter(([,v])=>v.n>=8).sort((a,b)=>b[1].n-a[1].n).slice(0,7).map(([t,v])=>({title:t,est:Math.max(5,Math.round(v.s/v.n/60/5)*5)||15,channel:c,subs:[]}))})).filter(x=>x.items.length>=3&&ch(x.c)&&!have.has('Routine '+ch(x.c).name)).slice(0,3);
}
function editTpl(id){
 const tp=id?(S.templates||[]).find(x=>x.id===id):{id:'',name:'',items:[]};if(!tp)return;modalTask=null;ritual=null;
 showModal(`<div class="mhead"><input class="mtitle" data-tplname value="${esc(tp.name)}" placeholder="Nom du modèle (ex. Routine du matin)" aria-label="Nom du modèle"><button class="x" data-act="close" aria-label="Fermer">×</button></div>
 <label class="full">Une tâche par ligne · « 15m », « #catégorie » compris · une ligne qui commence par « - » devient une sous-tâche de la précédente<textarea data-tpltext rows="10" placeholder="Vaisselle 15m #ménage&#10;Lessive 10m&#10;Préparer le sac 10m&#10;- Gourde&#10;- Affaires de sport">${esc(tplText(tp))}</textarea></label>
 <div class="mfoot">${id?`<button class="danger" data-act="tpldel" data-id="${id}">Supprimer</button>`:''}<span class="sp"></span><button class="pri" data-act="tplsave" data-id="${id}">Enregistrer</button></div>`);
}
function tplHtml(){
 const tps=S.templates||[],sug=tplSuggestions();
 return `<div class="tpls"><div class="row" style="margin-bottom:8px"><h2 style="font-size:18px">Routines et modèles</h2><span class="sp"></span><button class="sm" data-act="tplfromday">Depuis aujourd’hui</button><button class="sm pri" data-act="tplnew">+ Nouveau modèle</button></div>
 ${tps.length?`<div class="tplgrid">${tps.map(tp=>`<div class="tpl"><div class="row"><b>${esc(tp.name)}</b><span class="sp"></span><button class="sm ghost" data-act="tpledit" data-id="${tp.id}">Modifier</button></div><small class="mute">${tp.items.length} tâche${tp.items.length>1?'s':''} · ${fmtMin(tp.items.reduce((a,i)=>a+(i.est||0),0))}</small><div class="tplitems">${tp.items.slice(0,5).map(i=>esc(i.title)).join(' · ')}${tp.items.length>5?' …':''}</div><div class="row"><button class="sm pri" data-act="tplapply" data-id="${tp.id}" data-day="${today()}">Aujourd’hui</button><button class="sm" data-act="tplapply" data-id="${tp.id}" data-day="${addDays(today(),1)}">Demain</button></div></div>`).join('')}</div>`:'<p class="mute">Crée des listes réutilisables (routine du matin, ménage, préparation de voyage) et ajoute-les à un jour en un clic. Aussi depuis la palette Cmd+K.</p>'}
 ${sug.length?`<div class="tplsug"><small class="mute">Suggestions d’après ton historique :</small>${sug.map(x=>`<div class="pitem"><div><b>Routine ${esc(ch(x.c).name)}</b><small class="mute">${x.items.map(i=>esc(i.title)+' ('+fmtMin(i.est)+')').join(' · ')}</small></div><button class="sm" data-act="tplsug" data-c="${esc(x.c)}">Créer</button></div>`).join('')}</div>`:''}</div>`;
}

/* ---------- vue Backlog ---------- */
let blFilter='';
function blApply(){const q=blFilter.trim().toLowerCase();document.querySelectorAll('#main .card[data-id]').forEach(c=>{const t=T(c.dataset.id);c.style.display=!q||(t&&(t.title+' '+(t.notes||'')).toLowerCase().includes(q))?'':'none'});document.querySelectorAll('#main .group').forEach(g=>{g.style.display=[...g.querySelectorAll('.card[data-id]')].some(c=>c.style.display!=='none')?'':'none'})}
function viewBacklog(){
 const ts=S.tasks.filter(t=>!t.day&&!t.done).sort((a,b)=>a.order-b.order);
 const gkey=t=>{const p=pathOf(t.channel);return p.length?(p[1]||p[0]).id:null};const groups=hasTree()?[...S.channels.filter(c=>c.lvl===1).sort((a,b)=>(pillarOf(a.id).o-pillarOf(b.id).o)||(a.o-b.o)).map(c=>({c,items:ts.filter(t=>gkey(t)===c.id)})),...pillars().map(c=>({c,items:ts.filter(t=>gkey(t)===c.id)})),{c:null,items:ts.filter(t=>!ch(t.channel))}].filter(g=>g.items.length):[...S.channels.map(c=>({c,items:ts.filter(t=>t.channel===c.id)})),{c:null,items:ts.filter(t=>!ch(t.channel))}].filter(g=>g.items.length);
 const so=lsGet('journee.blsort')||'cat',PR={high:0,'':1,low:2},bk=t=>card(t).replace('<div class="ctime">',`<div class="ctime"><button class="sm ghost" data-act="totoday" data-id="${t.id}">Aujourd’hui</button>`);
 const SORTS=[['cat','Catégorie','tag'],['due','Échéance','clock'],['prio','Priorité','star'],['est','Durée','clock'],['new','Récentes','plus'],['old','Anciennes','left']];
 const sorted=so==='cat'?null:[...ts].sort(so==='due'?(a,b)=>(a.due||'9999')<(b.due||'9999')?-1:(a.due||'9999')>(b.due||'9999')?1:a.order-b.order:so==='prio'?(a,b)=>(PR[a.prio||'']-PR[b.prio||''])||a.order-b.order:so==='est'?(a,b)=>((a.est||999)-(b.est||999))||a.order-b.order:so==='new'?(a,b)=>(b.created||0)-(a.created||0)||b.order-a.order:(a,b)=>(a.created||0)-(b.created||0)||a.order-b.order);
 const sortbar=`<div class="blsort" role="radiogroup" aria-label="Trier le backlog"><span>Trier</span>${SORTS.map(([v,l,i])=>`<button role="radio" aria-checked="${so===v}" class="${so===v?'on':''}" data-act="blsort" data-v="${v}">${l}</button>`).join('')}</div>`;
 return `<div class="head"><div><h1>Backlog</h1><div class="sub kicker">${ts.length} tâche${ts.length>1?'s':''} en attente d’un jour</div></div></div>
 ${addForm(null,'Ajouter au backlog… (ex. « Réserver le garage 1h #admin »)')}
 ${ts.length>1?`<div class="bltools">${ts.length>6?`<label class="blfilter">${ico('search')}<input data-blf placeholder="Filtrer le backlog…" aria-label="Filtrer le backlog" value="${esc(blFilter)}"></label>`:''}${sortbar}</div>`:''}
 <div class="list" data-drop="backlog" style="gap:0">${sorted?`<div class="list" data-drop="backlog">${sorted.map(bk).join('')}</div>`:groups.length?groups.map(g=>`<div class="group"><h3>${g.c?`<span class="chip" style="--c:${esc(g.c.color)}">${esc(g.c.lvl===1?pillarOf(g.c.id).name+' › '+g.c.name:g.c.name)}</span>`:'Sans catégorie'}</h3><div class="list" data-drop="backlog">${g.items.map(t=>card(t).replace('<div class="ctime">',`<div class="ctime"><button class="sm ghost" data-act="totoday" data-id="${t.id}">Aujourd’hui</button>`)).join('')}</div></div>`).join(''):'<div class="empty">Backlog vide. Les tâches sans date atterrissent ici.</div>'}</div>`;
}

/* ---------- vue Semaine (revue) : projets et chiffres ---------- */
function weekStats(w){
 const days=[...Array(7)].map((_,i)=>addDays(w,i)),ts=S.tasks.filter(t=>t.day&&days.includes(t.day));
 const done=ts.filter(t=>t.done),sec=ts.reduce((a,t)=>a+actualSec(t),0);
 const per=groupSec(ts.map(t=>({c:t.channel,a:actualSec(t)})));
 const estDone=done.reduce((a,t)=>a+(t.est||0),0),actDone=done.reduce((a,t)=>a+actualSec(t),0)/60;
 return{ts,done,sec,per,estDone,actDone};
}
// temps par domaine (ou par ancien catégorie) : [{c:{name,color},sec}]
function groupSec(xs){
 const m={};for(const x of xs){if(!x.a)continue;const p=pathOf(x.c);const n=p.length?(hasTree()?(p[1]||p[0]):p[p.length-1]):null;const k=n?n.id:'';m[k]=m[k]||{c:n?{id:n.id,name:n.lvl===1?n.name:n.name,color:n.color}:{id:null,name:'Sans catégorie',color:'#8a8f98'},sec:0};m[k].sec+=x.a}
 return Object.values(m).sort((a,b)=>b.sec-a.sec);
}
function statsHtml(w){
 const s=weekStats(w),max=Math.max(1,...s.per.map(p=>p.sec));
 return `<div class="stat"><div><b>${s.done.length}/${s.ts.length}</b><small>tâches terminées</small></div><div><b>${fmtMin(s.sec/60)}</b><small>temps suivi</small></div><div><b>${s.estDone&&s.actDone?Math.round(s.actDone/s.estDone*100)+' %':'—'}</b><small>réel / estimé (tâches finies)</small></div></div>
 ${s.per.length?`<div class="bars">${s.per.map(p=>`<div class="brow"><span>${esc(p.c.name)}</span><div class="bt" style="--c:${esc(p.c.color)}"><i style="width:${p.sec/max*100}%"></i></div><span>${fmtMin(p.sec/60)}</span></div>`).join('')}</div>`:'<p class="mute">Lance le minuteur sur tes tâches pour voir où passe ton temps.</p>'}`;
}
function viewObjectives(){
 const w=monday(cur),os=weekObjs(w),wk=S.weeks[w]||{};
 return `<div class="head"><div><h1>Ta semaine</h1><div class="sub kicker">Semaine du ${fmtDay(w,{day:'numeric',month:'long'})}</div></div>
 <div class="dnav"><button data-act="prevw" aria-label="Semaine précédente">‹</button><button data-act="gotoday">Cette semaine</button><button data-act="nextw" aria-label="Semaine suivante">›</button></div>
 <div class="acts"><button class="${wk.planned?'':'pri'}" data-act="weekplan">Planifier la semaine</button><button data-act="weekreview">Revue de la semaine</button></div></div>
 <h2 style="font-size:18px;margin:8px 0 6px">Projets en cours</h2>${projListHtml(w)}
 <h2 style="font-size:18px;margin:28px 0 6px">Cette semaine en chiffres</h2>${statsHtml(w)}
 ${wk.review?`<div class="note"><b>Revue de la semaine</b>\n${esc(wk.review)}</div>`:''}`;
}

/* ---------- statistiques ---------- */
function allDone(){
 // tâches terminées : actives + historique, au même format {t,c,d,e(min),a(s)}
 const cap=x=>x>12*3600?0:x;
 return [...(S.archive||[]).map(a=>({t:a.t,c:a.c,d:a.d,e:a.e||0,a:cap(a.a||0)})),...S.tasks.filter(t=>t.done&&t.day).map(t=>({t:t.title,c:t.channel,d:t.day,e:t.est||0,a:cap(actualSec(t))}))];
}
function viewStats(){
 const all=allDone(),t0=today(),d30=addDays(t0,-29),last30=all.filter(x=>x.d>=d30&&x.d<=t0);
 const hrs=v=>v/3600,fh=v=>{const h=hrs(v);return h<10?h.toFixed(1).replace('.',',')+' h':Math.round(h)+' h'};
 const weeks=[...Array(12)].map((_,i)=>addDays(monday(t0),-7*(11-i)));
 const wk=weeks.map(w=>{const e=addDays(w,6),xs=all.filter(x=>x.d>=w&&x.d<=e);return{w,sec:xs.reduce((a,x)=>a+x.a,0),n:xs.length}});
 const maxW=Math.max(1,...wk.map(x=>x.sec));
 const per={};for(const x of last30){const p=pathOf(x.c),n=p.length?(hasTree()?(p[1]||p[0]):p[p.length-1]):null;const k=n?n.id:'';per[k]=per[k]||{sec:0,n:0,e:0,ea:0};per[k].sec+=x.a;per[k].n++;if(x.e&&x.a){per[k].e+=x.e*60;per[k].ea+=x.a}}
 const perL=Object.entries(per).map(([c,v])=>({c:ch(c),...v})).sort((a,b)=>b.sec-a.sec),maxC=Math.max(1,...perL.map(x=>x.sec));
 const acc=last30.filter(x=>x.e&&x.a),ratio=acc.length?acc.reduce((a,x)=>a+x.a,0)/acc.reduce((a,x)=>a+x.e*60,0):0;
 let streak=0;const doneDays=new Set(all.map(x=>x.d));for(let d=t0;doneDays.has(d)||(d===t0&&doneDays.has(addDays(d,-1))&&!doneDays.has(d));d=addDays(d,-1)){if(doneDays.has(d))streak++;else if(d!==t0)break}
 const top={};for(const x of all){const k=norm(x.t).trim();top[k]=top[k]||{t:x.t,sec:0,n:0};top[k].sec+=x.a;top[k].n++}
 const topL=Object.values(top).sort((a,b)=>b.sec-a.sec).slice(0,8);
 const first=all.reduce((m,x)=>x.d&&x.d<m?x.d:m,t0),total=all.reduce((a,x)=>a+x.a,0);
 const pct=r=>Math.round(r*100)+' %';
 return `<div class="head"><div><h1>Statistiques</h1><div class="sub">30 derniers jours · historique depuis le ${fmtDay(first,{day:'numeric',month:'long',year:'numeric'})}</div></div></div>
 <div class="kpis"><div><b>${fh(last30.reduce((a,x)=>a+x.a,0))}</b><small>temps suivi (30 j)</small></div><div><b>${last30.length}</b><small>tâches terminées (30 j)</small></div><div><b>${ratio?pct(ratio):'—'}</b><small>réel / estimé ${ratio?(ratio>1.15?'· tu sous-estimes':ratio<0.85?'· tu surestimes':'· estimations justes'):''}</small></div><div><b>${streak} j</b><small>série de jours avec au moins une tâche faite</small></div></div>
 <section class="stsec"><h2>Temps suivi par semaine</h2><div class="wkbars">${wk.map(x=>`<div class="wkb" title="${fh(x.sec)} · ${x.n} tâches"><i style="height:${Math.max(2,x.sec/maxW*100)}%"></i><small>${fmtDay(x.w,{day:'numeric',month:'short'})}</small><b>${x.sec?fh(x.sec):''}</b></div>`).join('')}</div></section>
 ${hasTree()?(()=>{const pp={};for(const x of last30){const p=pillarOf(x.c);if(p)pp[p.id]=(pp[p.id]||0)+x.a}const tot=Object.values(pp).reduce((a,v)=>a+v,0);return tot?`<section class="stsec"><h2>Par pilier (30 jours)</h2><div class="pilbar">${pillars().filter(p=>pp[p.id]).map(p=>`<i style="--c:${esc(p.color)};flex:${pp[p.id]}" title="${esc(p.name)} · ${fh(pp[p.id])}"><span>${esc(p.name)} ${Math.round(pp[p.id]/tot*100)} %</span></i>`).join('')}</div></section>`:''})():''}<section class="stsec"><h2>${hasTree()?'Par domaine':'Par catégorie'} (30 jours)</h2>${perL.length?`<div class="bars">${perL.map(x=>`<div class="brow"><span>${esc(x.c?(x.c.lvl===1?pillarOf(x.c.id).name+' › '+x.c.name:x.c.name):'Sans catégorie')}</span><div class="bt" style="--c:${esc(x.c?x.c.color:'#8a8f98')}"><i style="width:${x.sec/maxC*100}%"></i></div><span>${fh(x.sec)}${x.e?' · '+pct(x.ea/x.e):''}</span></div>`).join('')}</div><p class="mute" style="font-size:13px">Le pourcentage compare le temps réel au temps estimé.</p>`:'<p class="mute">Pas encore de temps suivi ce mois-ci.</p>'}</section>
 <section class="stsec"><h2>Là où passe ton temps (depuis le début)</h2><p class="mute" style="margin:0 0 8px">${fh(total)} suivies au total sur ${all.length} tâches (les chronos oubliés de plus de 12 h sont ignorés).</p><div class="bars">${topL.map(x=>`<div class="brow"><span title="${esc(x.t)}">${esc(x.t)}</span><div class="bt" style="--c:var(--acc)"><i style="width:${x.sec/Math.max(1,topL[0].sec)*100}%"></i></div><span>${fh(x.sec)} · ${x.n}×</span></div>`).join('')}</div></section>`;
}

function viewReview(){
 const tab=view==='stats'?'stats':'objectives';
 const tabs=`<div class="seg revtabs"><button class="sm${tab==='objectives'?' on':''}" data-act="go" data-v="objectives">Semaine et projets</button><button class="sm${tab==='stats'?' on':''}" data-act="go" data-v="stats">Statistiques</button></div>`;
 return tabs+(tab==='stats'?viewStats():viewObjectives());
}
/* ---------- vue Réglages ---------- */
let advOpen=false;
function viewSettings(){
 const s=S.settings,num=(k,l,min,max)=>`<label>${l}<input type="number" min="${min}" max="${max}" data-set="${k}" value="${esc(s[k])}"></label>`;
 return `<div class="head"><div><h1>Réglages</h1><div class="sub">L’essentiel ici ; le reste dans « Réglages avancés » en bas.</div></div></div>
 <div class="set">
 <section><h2>Apparence</h2><div class="grid2"><label>Mode<select data-set="mode"><option value="auto" ${(s.mode||'auto')==='auto'?'selected':''}>Comme l’appareil</option><option value="light" ${s.mode==='light'?'selected':''}>Clair</option><option value="dark" ${s.mode==='dark'?'selected':''}>Sombre</option></select></label></div>
  <p class="mute" style="margin:10px 0 6px">Couleur d’accent</p><div class="swatches">${ACCENTS.map(a=>`<button class="swatch${(s.accent||'peche')===a.k?' on':''}" data-act="accent" data-v="${a.k}" style="--sl:${a.l};--sd:${a.d}" aria-pressed="${(s.accent||'peche')===a.k}"><i></i>${a.n}</button>`).join('')}</div></section>
 <section><h2>Journée type</h2><div class="grid2">${num('workStart','Début du travail (h)',0,23)}${num('workEnd','Fin du travail (h)',1,24)}${num('jobStart','Boulot : début habituel (h)',0,23)}${num('jobEnd','Boulot : fin habituelle (h)',1,24)}${num('travel','Trajet boulot (min)',0,180)}${num('dayStart','Agenda : première heure',0,23)}${num('dayEnd','Agenda : dernière heure',1,24)}<label>Agenda vivant<select data-set="liveShift"><option value="1" ${s.liveShift!==false?'selected':''}>Vivant : suit la liste et l’heure</option><option value="" ${s.liveShift===false?'selected':''}>Manuel : je place mes créneaux</option></select></label></div></section>
 <section><h2>Indisponibilités récurrentes</h2><p>Des créneaux qui reviennent chaque semaine (cours, sport, enfants…) : Diem ne place rien dessus et les montre dans l’agenda, sans rien écrire dans Google.</p>
  <div class="ualist">${(S.unavail||[]).map(u=>`<div class="uarow" data-uaid="${esc(u.id)}"><input data-ua="label" value="${esc(u.label||'')}" placeholder="ex. Cours de piano" aria-label="Nom"><div class="uadays" role="group" aria-label="Jours">${UA_DAYS.map(([v,l])=>`<button class="${(u.days||[]).includes(v)?'on':''}" data-act="uaday" data-id="${esc(u.id)}" data-v="${v}" aria-pressed="${(u.days||[]).includes(v)}" title="${['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][+v]}">${l}</button>`).join('')}</div><input type="time" data-ua="s" value="${esc(u.s||'')}" aria-label="Début"><span class="mute">→</span><input type="time" data-ua="e" value="${esc(u.e||'')}" aria-label="Fin"><button class="ghost sm" data-act="uadel" data-id="${esc(u.id)}" aria-label="Supprimer ce créneau" title="Supprimer">${ico('trash')}</button></div>`).join('')||'<p class="mute" style="font-size:13px">Aucun pour l’instant.</p>'}</div>
  <button class="sm" data-act="uaadd">${ico('plus')} Ajouter un créneau</button></section>
 <section><h2>Agendas de boulot</h2><p>Diem lit ces agendas pour savoir quand tu es au boulot, et comment. Un jour réglé à la main garde ton choix.</p>
  ${gCals?`<div class="jobcals">${gCals.map(c=>{const m=jobCalMode(c.id,c.name);return `<label class="jobcal"><span>${esc(/^webcal|^https?:/i.test(c.name||'')?(c.name.match(/\/\/([^./]+)/)||[,c.name])[1]+' (importé)':c.name)}</span><select data-jobcal="${esc(c.id)}"><option value="off" ${m==='off'?'selected':''}>Pas du boulot</option><option value="phases" ${m==='phases'?'selected':''}>Prestations (Exploitation = veille)</option><option value="busy" ${m==='busy'?'selected':''}>Toujours sans pause</option></select></label>`}).join('')}</div>
  <p class="mute" style="font-size:13px">Ignorés : « Autre… », « Vacances », et tout ce qui dure plus de 20 h. Journée entière = boulot sans pause de ${S.settings.allDayStart??8} h à ${S.settings.allDayEnd??18} h.</p>`:'<p class="mute">Connecte Google pour choisir tes agendas de boulot.</p>'}
  <div class="grid2">${num('allDayStart','Journée entière : début (h)',0,23)}${num('allDayEnd','Journée entière : fin (h)',1,24)}</div></section>
 <section><h2>Arbre des catégories</h2><p>4 piliers, leurs domaines et leurs catégories. Tape <code>#raccourci</code> en créant une tâche pour la ranger (sinon Diem devine), <code>+projet</code> pour l’associer à un projet. L’agenda Google choisi pour un pilier vaut pour tout ce qu’il contient, sauf si un domaine ou une catégorie en a un autre.</p>
  ${hasTree()?`<div class="row" style="gap:8px;flex-wrap:wrap">${pillars().map(p=>`<span class="chip" style="--c:${esc(p.color)}">${esc(p.name)} · ${kids(p.id).length} domaines</span>`).join('')}<span class="sp"></span><button class="pri" data-act="go" data-v="tree">Ouvrir l’arbre</button></div>`:treeEditorHtml()}
  ${hasTree()&&refineCands().length?`<div class="row" style="margin-top:12px"><span class="mute">${refineCands().length} tâches à classer ou rangées seulement dans un domaine.</span><span class="sp"></span><button class="sm" data-act="refine" ${aiOn()?'':'disabled title="Ajoute ta clé Claude plus bas"'}>Affiner avec Claude</button></div>`:''}
  </section>
 <section><h2>Connexions</h2>
  <div class="connrow"><b>Google</b><span class="mute">Agenda et synchro téléphone ↔ Mac</span><span class="sp"></span><span class="status${gTok()?' on':''}">${gTok()?'Connecté':gWas()?'Session expirée':'Non connecté'}</span>${gTok()?'':`<button class="sm pri" data-act="gin">${gWas()?'Reconnecter':'Connecter'}</button>`}</div>
  <p class="mute" style="margin:2px 0 10px;font-size:13px" data-live="sync">${esc(syncState)}</p>
  <div class="connrow"><b>Microsoft To Do</b><span class="mute">Tâches To Do dans ta journée</span><span class="sp"></span><span class="status${msOn()?' on':''}">${msOn()?'Connecté':'Non connecté'}</span>${msOn()||!S.settings.msClientId?'':'<button class="sm" data-act="min">Connecter</button>'}</div>
 </section>
 <section><h2>Notifications</h2><p>Début de chaque créneau, rendez-vous occupé dans 5 minutes, rappel de planifier le matin et de clôturer le soir. Elles s’affichent tant que Diem est ouverte (onglet ou appli installée, même en arrière-plan sur ordinateur). Sur téléphone, le système peut mettre l’appli en pause quand elle n’est pas à l’écran.</p>
  <div class="row"><span class="status${notifOk()?' on':''}">${notifOk()?'Activées':('Notification' in window&&Notification.permission==='denied')?'Bloquées par le navigateur':'Désactivées'}</span><span class="sp"></span>${notifOk()?'<button class="ghost sm" data-act="notifoff">Désactiver</button><button class="sm" data-act="notiftest">Tester</button>':'<button class="pri" data-act="notifon">Activer</button>'}</div></section>
 <section><h2>Claude (assistant)</h2><p>Colle ici ta clé API Anthropic (console.anthropic.com → API Keys), une seule fois : elle est recopiée sur tes autres appareils par la synchro, dans le dossier caché de Diem de ton Google Drive (invisible pour les autres applis). Coût : quelques centimes par jour avec Haiku.</p>
  <label>Clé API<input type="password" data-set="aiKey" value="${esc(s.aiKey)}" placeholder="sk-ant-…" autocomplete="off"></label>
  <div class="grid2"><label>Modèle<select data-set="aiModel"><option value="claude-haiku-5-5" ${s.aiModel==='claude-haiku-5-5'?'selected':''}>Haiku — rapide et économique</option><option value="claude-sonnet-5-5" ${s.aiModel==='claude-sonnet-5-5'?'selected':''}>Sonnet — plus fin</option></select></label>
  <label>En arrière-plan<select data-set="aiAuto"><option value="1" ${s.aiAuto?'selected':''}>Suggestions automatiques</option><option value="" ${s.aiAuto?'':'selected'}>Seulement quand je demande</option></select></label></div>
  <div class="grid2"><label>Plafond mensuel ($, 0 = aucun)<input type="number" min="0" step="0.5" data-set="aiBudget" value="${esc(s.aiBudget)}"></label></div>
  <p style="margin:10px 0 0"><b data-live="aicost">${costTxt()}</b> — estimation d’après les jetons consommés ; le montant exact est sur console.anthropic.com.</p>
  <div class="row" style="margin-top:12px"><span class="status${aiOn()?' on':''}">${aiOn()?'Clé enregistrée':'Pas de clé'}</span><span class="sp"></span><button class="ghost sm" data-act="aiclear">Effacer</button></div></section>
 <details class="adv"${advOpen?' open':''} data-adv><summary>Réglages avancés</summary><div class="set">
 <section><h2>Google : identifiants et agendas affichés</h2><p>Affiche tes rendez-vous et crée un événement pour chaque tâche que tu places dans l’agenda. Voir le README pour obtenir l’identifiant.</p>
  <label>Identifiant client OAuth (…apps.googleusercontent.com)<input data-set="googleClientId" value="${esc(s.googleClientId)}" placeholder="1234-abcd.apps.googleusercontent.com" autocomplete="off"></label>
  <div class="grid2"><label>Agenda par défaut des créneaux${gCals?`<select data-set="calendarId">${gCals.filter(c=>c.write).map(c=>`<option value="${esc(c.id)}" ${(s.calendarId||'primary')===c.id||(s.calendarId==='primary'&&c.primary)?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`:`<input data-set="calendarId" value="${esc(s.calendarId)}" placeholder="primary">`}</label></div>
  ${gCals?`<p style="margin:12px 0 4px">Agendas affichés :</p>${gCals.map(c=>`<label style="flex-direction:row;align-items:center;gap:8px;color:var(--ink)"><input type="checkbox" data-cal="${esc(c.id)}" ${calOn(c)?'checked':''} style="width:auto;min-height:0"><span class="chip" style="--c:${esc(c.color||'#888')}">${esc(c.name)}</span></label>`).join('')}`:''}
  <p style="margin:10px 0 0">Quand la session expire (toutes les heures), Diem la renouvelle toute seule par un aller-retour éclair, sans clic. Google sert aussi à <b>synchroniser tes tâches entre ton téléphone et ton Mac</b> (fichier caché dans ton Drive). <span data-live="sync">${esc(syncState)}</span></p>
  <div class="row" style="margin-top:12px"><span class="status${gTok()?' on':''}">${gTok()?'Connecté':gWas()?'Session expirée':'Non connecté'}</span><span class="sp"></span>${gWas()?'<button class="ghost" data-act="gout">Déconnecter</button>':''}<button class="pri" data-act="gin">${gWas()?'Reconnecter':'Connecter Google'}</button></div></section>

 <section><h2>Microsoft To Do : identifiant</h2><p>Importe tes tâches dans ta journée ; quand tu les termines ici, elles sont cochées dans To Do (et inversement à la synchro).</p>
  <label>ID d’application (client) Azure<input data-set="msClientId" value="${esc(s.msClientId)}" placeholder="00000000-0000-0000-0000-000000000000" autocomplete="off"></label>
  <div class="row" style="margin-top:12px"><span class="status${msOn()?' on':''}">${msOn()?'Connecté':'Non connecté'}</span><span class="sp"></span>${msOn()?'<button class="ghost" data-act="mout">Déconnecter</button>':''}<button class="pri" data-act="min">${msOn()?'Reconnecter':'Connecter Microsoft'}</button></div></section>
 <section><h2>Adresse de redirection</h2><p>À coller à l’identique dans la console Google et dans Azure.</p><div class="row"><code>${esc(REDIRECT)}</code><button class="sm" data-act="copyuri">Copier</button></div></section>
 <section><h2>Importer depuis Sunsama</h2><p>Dans Sunsama : Settings → Account Management → export. Les tâches terminées de plus de 30 jours vont dans l’historique (utilisé par Claude pour estimer tes durées) ; les rituels Sunsama ne sont pas importés. Tu peux réimporter sans créer de doublons.</p><input type="file" accept=".csv,text/csv" data-sunsama aria-label="Fichier d’export Sunsama">${S.archive&&S.archive.length?`<p style="margin-top:8px">Historique : ${S.archive.length} tâches archivées.</p>`:''}</section>
 <section><h2>Sauvegarde</h2><p>Export et import au format JSON.</p><div class="row"><button data-act="export">Exporter</button><label class="sm" style="flex-direction:row"><input type="file" accept="application/json" data-import style="max-width:260px"></label></div></section>
 <section><h2>Raccourcis clavier</h2><div class="keys"><kbd>N</kbd><span>Nouvelle tâche</span><kbd>P</kbd><span>Planifier la journée</span><kbd>S</kbd><span>Clôturer la journée</span><kbd>F</kbd><span>Focus</span><kbd>T</kbd> <span>Aujourd’hui</span><kbd>C</kbd><span>Inverser liste et grand agenda</span><kbd>D</kbd><span>Vide-tête</span><kbd>W</kbd><span>Semaine</span><kbd>B</kbd><span>Backlog</span><kbd>O</kbd><span>Semaine et projets</span><kbd>Espace</kbd><span>Focus : pause / reprise</span><kbd>← →</kbd><span>Jour / semaine précédent·e, suivant·e</span><kbd>Échap</kbd><span>Fermer</span></div></section>
 </div></details>
 </div>`;
}

/* ---------- panneau latéral : agenda ---------- */
const PX=76;
function calGeom(){const st=S.settings.dayStart,en=Math.max(S.settings.dayEnd,st+1);return{st,en,H:(en-st)*PX}}
function calCol(d){
 const s=S.settings,{st,en,H}=calGeom();
 const timed=timedEvents(d),blocks=S.tasks.filter(t=>t.block&&ymd(new Date(t.block.start))===d);
 const base=+parseYmd(d),ads=(typeof jobSegs==='function'?jobSegs(d):[]).filter(x=>x.allday);
 const items=[...ads.map(x=>({k:'ad',s:new Date(base+x.s*3600e3),e:new Date(base+x.e*3600e3),x})),...timed.map(e=>({k:'ev',s:new Date(e.start.dateTime),e:new Date(e.end.dateTime),e0:e})),...blocks.map(t=>({k:'b',s:new Date(t.block.start),e:new Date(t.block.end),t}))].sort((a,b)=>a.s-b.s||b.e-a.e);
 let cl=[],cend=0;const out=[];
 const flush=()=>{const cols=[];cl.forEach(it=>{let c=cols.findIndex(e=>e<=it.s);if(c<0){c=cols.length;cols.push(0)}cols[c]=it.e;it.col=c});cl.forEach(it=>it.n=cols.length);out.push(...cl);cl=[]};
 items.forEach(it=>{if(cl.length&&it.s>=cend)flush();cl.push(it);cend=Math.max(cend,+it.e)});flush();
 const y=dt=>((dt.getHours()-st)*60+dt.getMinutes()+(ymd(dt)!==d?(dt>parseYmd(d)?1440:-1440):0))/60*PX;
 const hrs=[...Array(en-st+1)].map((_,i)=>`<div class="hr" style="top:${i*PX}px"><span>${pad(st+i)}:00</span></div>`).join('');
 const blocksHtml=out.map(it=>{
  const top=Math.max(0,y(it.s)),h=Math.max(14,Math.min(H,y(it.e))-top),w=100/it.n,l=it.col*w;
  const pos=`top:${top}px;height:${h}px;left:calc(${l}% + 2px);width:calc(${w}% - 4px)`,sh=h<40?(h<24?' short tiny':' short'):'';
  if(it.k==='ad'){const x=it.x;return `<div class="ev allday${sh}" style="${pos};${x.col?'--adc:'+esc(x.col):''}" title="Journée entière dans ton agenda : glisse le haut ou le bas pour ajuster ce jour-là (double-clic pour revenir à ${hShort(S.settings.allDayStart??8)}–${hShort(S.settings.allDayEnd??18)})" data-adday="${d}"><i class="adrz top" data-adrz="s" data-day="${d}" aria-label="Ajuster le début"></i><b>${esc(x.t)}</b><small>journée entière · ${hShort(x.s)}–${hShort(x.e)}${x.custom?' · ajusté':''}</small><i class="adrz bot" data-adrz="e" data-day="${d}" aria-label="Ajuster la fin"></i></div>`}
  if(it.k==='ev'){const e=it.e0,f=evFree(e);return `<div class="ev${sh}${f?' free':''}${e._ua?' ua':''}" style="${pos};${e._col?'border-left-color:'+esc(e._col):''}" data-act="evtoggle" data-k="${esc(evKey(e))}" title="${f?'Tu peux travailler pendant ce rendez-vous':'Occupé'} — clique pour changer">${/^https:/.test(e.htmlLink||'')?`<a href="${esc(e.htmlLink)}" target="_blank" rel="noopener" aria-label="Ouvrir dans Google Agenda">↗</a>`:''}<b>${esc(e.summary||'(sans titre)')}</b><small>${hm(it.s)}${sh?'':'–'+hm(it.e)}${f?' · dispo':''}</small></div>`}
  const t=it.t,c=ch(t.channel),act=S.running&&S.running.taskId===t.id;return `<div class="blk${t.done?' done':''}${act?' active':''}${sh}" style="${pos};--c:${esc(c?c.color:'var(--acc)')}" draggable="true" data-drag="blk|${t.id}" data-act="open" data-id="${t.id}"><button class="bchk" data-act="toggle" data-id="${t.id}" aria-label="${t.done?'Rouvrir':'Terminer'}">${t.done?'✓':''}</button><b>${t.pinned?'📌 ':''}${esc(t.title)}</b><small>${hm(it.s)}${sh?'':'–'+hm(it.e)}</small><i class="rz" data-rz="${t.id}" title="Étirer pour changer la durée"></i></div>`;
 }).join('');
 const nowTop=d===today()?y(new Date()):-1;
 return `<div class="tlin" data-drop="cal" data-day="${d}" style="height:${H}px">${hrs}
 <div class="work" style="top:${(dayHours(d).s-st)*PX}px;height:${Math.max(0,(dayHours(d).e-dayHours(d).s)*PX)}px"></div>
 ${blocksHtml}${nowTop>=0&&nowTop<=H?`<div class="now" data-live="now" style="top:${nowTop}px"></div>`:''}<div class="ghostblk hidden"></div></div>`;
}
const alldayHtml=d=>{const a=(gEvents[d]||[]).filter(e=>e.start.date);return a.length?`<div class="allday">${a.map(e=>`<a href="${/^https:/.test(e.htmlLink||'')?esc(e.htmlLink):'#'}" target="_blank" rel="noopener">${esc(e.summary||'(sans titre)')}</a>`).join('')}</div>`:''};
function gStateHtml(d){return gTok()?(gErr?`<div class="pill">${esc(gErr)} — reconnecte Google et coche toutes les cases<button class="sm pri" data-act="gin">Reconnecter</button></div>`:(gScope()&&!/calendar/.test(gScope())?`<div class="pill">Google connecté sans l’accès Agenda<button class="sm pri" data-act="gin">Reconnecter</button></div>`:'')):gWas()?`<div class="pill">Session Google expirée<button class="sm pri" data-act="gin">Reconnecter</button></div>`:`<div class="pill">Connecte Google Agenda pour voir tes rendez-vous<button class="sm" data-act="gin">Connecter</button></div>`}
function viewCal(){
 const d=cur;
 return `<div class="calhead"><span>${cap1(fmtDay(d,{weekday:'long',day:'numeric',month:'short'}))}</span><span class="sp"></span>${layoutBtn()}${gTok()?'<button class="sm ghost" data-act="refresh">Actualiser</button>':''}</div>
 ${gStateHtml(d)}${alldayHtml(d)}
 <div class="tl">${calCol(d)}</div>
 <div class="sinfo" style="padding-top:0"><span>${flowOn()?'Agenda vivant : les tâches suivent l’ordre de la liste. Glisse une tâche ici pour fixer son heure.':'Glisse une tâche sur l’agenda pour lui réserver un créneau.'}</span>${flowOn()?'':'<button class="sm" data-act="autobox">Placer les tâches</button>'}</div>`;
}
/* ---------- grand agenda (vue inversée) ---------- */
let scrolledBig=false,layout=lsGet('journee.layout')||'tasks',calSpan=+(lsGet('journee.span')||3);
const bigDays=()=>{const n=innerWidth<720?1:calSpan;const s0=n===7?monday(cur):cur;return [...Array(n)].map((_,i)=>addDays(s0,i))};
function viewBigCal(){
 const days=bigDays(),{st,en,H}=calGeom();
 const axis=[...Array(en-st+1)].map((_,i)=>`<div class="hr" style="top:${i*PX}px"><span>${pad(st+i)}:00</span></div>`).join('');
 return `<div class="head"><div><h1>${days.length===1?cap1(fmtDay(days[0],{weekday:'long',day:'numeric',month:'long'})):cap1(fmtDay(days[0],{day:'numeric',month:'short'}))+' – '+fmtDay(days[days.length-1],{day:'numeric',month:'short'})}</h1><div class="sub">Grand agenda · tes tâches sont à droite</div></div>
 <div class="dnav"><button data-act="${days.length===7?'prevw':'prev'}" aria-label="Précédent">‹</button><button data-act="gotoday">Aujourd’hui</button><button data-act="${days.length===7?'nextw':'next'}" aria-label="Suivant">›</button></div>
 <div class="acts"><div class="seg">${[1,3,7].map(n=>`<button class="sm${calSpan===n?' on':''}" data-act="span" data-n="${n}">${n===1?'Jour':n===3?'3 jours':'Semaine'}</button>`).join('')}</div>${layoutBtn()}</div></div>
 ${gStateHtml(cur)}
 <div class="bigcal" style="--n:${days.length}">
  <div class="bchead"><div></div>${days.map(d=>`<div class="bcday${d===today()?' today':''}" data-act="openday" data-day="${d}"><b>${cap1(fmtDay(d,{weekday:'short',day:'numeric'}))}</b><small>${fmtMin(loadInfo(d).task)} de tâches</small>${alldayHtml(d)}</div>`).join('')}</div>
  <div class="bcbody"><div class="axis" style="height:${H}px">${axis}</div>${days.map(d=>`<div class="bccol">${calCol(d)}</div>`).join('')}</div>
 </div>`;
}
function viewSideTasks(){
 const d=cur,ts=dayTasks(d);
 return `<div class="calhead"><span>Tâches · ${cap1(fmtDay(d,{weekday:'long',day:'numeric'}))}</span><span class="sp"></span><button class="sm ghost" data-act="plan">Planifier</button></div>
 <div style="padding:10px 12px">${loadBar(d)}${addForm(d,'Ajouter une tâche…','add-side')}
 <div class="list" data-drop="day:${d}">${ts.length?ts.map(card).join(''):'<div class="empty">Rien de prévu ce jour-là.</div>'}</div>
 <div class="rsec">Backlog</div><div class="list" data-drop="backlog">${S.tasks.filter(t=>!t.day&&!t.done).slice(0,30).map(card).join('')||'<p class="mute">Vide</p>'}</div></div>`;
}

/* ---------- panneau latéral : To Do ---------- */
function viewTodo(){
 if(!S.settings.msClientId)return `<div class="sinfo"><b>Microsoft To Do n’est pas encore configuré.</b><span>Crée une application dans Azure (5 minutes, voir le README), puis colle son identifiant dans Réglages.</span><button data-act="goset">Ouvrir les réglages</button></div>`;
 if(!msOn())return `<div class="sinfo"><b>Connecte ton compte Microsoft</b><span>Tes listes To Do apparaîtront ici. Glisse une tâche vers ta journée ou ton agenda.</span><button class="pri" data-act="min">Connecter Microsoft</button></div>`;
 if(!todo.lists){loadTodoLists();return '<div class="sinfo">Chargement des listes…</div>'}
 if(!todo.lists.length)return '<div class="sinfo">Aucune liste trouvée.<button class="sm" data-act="todoreload">Réessayer</button></div>';
 const l=todo.listId,items=todo.tasks[l];
 if(!items)loadTodoTasks(l);
 return `<div class="todo-top"><select data-todolist aria-label="Liste To Do">${todo.lists.map(x=>`<option value="${esc(x.id)}" ${x.id===l?'selected':''}>${esc(x.displayName)}</option>`).join('')}</select><button class="sm ghost" data-act="todoreload">Actualiser</button></div>
 ${!items?'<div class="sinfo">Chargement…</div>':!items.length?'<div class="sinfo">Cette liste est vide.</div>':items.map(x=>{const imp=S.tasks.find(t=>t.src&&t.src.taskId===x.id);const due=x.dueDateTime&&x.dueDateTime.dateTime?`<small>${fmtDay(x.dueDateTime.dateTime.slice(0,10),{day:'numeric',month:'short'})}</small>`:'';
  return `<div class="todo-item${imp?' imp':''}" draggable="true" data-drag="todo|${esc(l)}|${esc(x.id)}">${x.importance==='high'?'<i class="hi" title="Important">!</i>':''}<span>${esc(x.title)}</span>${due}<button class="sm${imp?' ghost':''}" data-act="todoadd" data-l="${esc(l)}" data-t="${esc(x.id)}">${imp&&imp.day?(imp.day===cur?'Prévue':esc(fmtDay(imp.day,{day:'numeric',month:'short'}))):'+ Jour'}</button></div>`}).join('')}
 <div class="sinfo"><span>Les tâches ajoutées sont cochées dans To Do quand tu les termines ici.</span></div>`;
}

/* ---------- vue Projets ---------- */
function viewProjects(){
 const ps=(S.projects||[]),act=ps.filter(p=>!p.done).sort((a,b)=>(a.end||'9')<(b.end||'9')?-1:1),fin=ps.filter(p=>p.done);
 const one=p=>{const ts=S.tasks.filter(t=>t.proj===p.id),open=ts.filter(t=>!t.done).sort((a,b)=>(a.day||'9')<(b.day||'9')?-1:1),g=projProgress(p.id),pc=g.n?Math.round(g.done/g.n*100):0,late=p.end&&!p.done&&p.end<today(),left=p.end?Math.round((new Date(p.end)-new Date(today()))/864e5):null;
  return `<section class="proj${late?' late':''}"><div class="projhead"><input class="projname" data-pn="${esc(p.id)}" value="${esc(p.name)}" aria-label="Nom du projet">
  <label class="projend">Fin<input type="date" data-pe="${esc(p.id)}" value="${esc(p.end||'')}" aria-label="Date de fin"></label>
  <label class="projdone"><input type="checkbox" data-pd="${esc(p.id)}" ${p.done?'checked':''}>Terminé</label></div>
  <div class="projbar" title="${g.done}/${g.n} tâches faites"><i style="width:${pc}%"></i></div>
  <div class="projmeta"><span>${g.n?`${g.done}/${g.n} tâches faites`:'Aucune tâche pour l’instant'}</span>${left!==null&&!p.done?`<span class="${late?'warn':left<=7?'soon':''}">${late?'en retard de '+(-left)+' j':left===0?'se termine aujourd’hui':'encore '+left+' j'}</span>`:''}<code>+${esc(projKey(p))}</code></div>
  ${p.done?'':`<form class="add" data-form="add" data-day="" data-proj="${esc(p.id)}"><input name="t" data-keep="pj-${esc(p.id)}" placeholder="Ajouter une tâche à ce projet…" autocomplete="off" aria-label="Nouvelle tâche du projet"></form>`}
  ${open.length?`<div class="list">${open.map(card).join('')}</div>`:''}</section>`};
 return `<div class="head"><div><h1>Projets & Routines</h1><div class="sub">Les projets ont une date de fin (tape <code>+nom</code> en créant une tâche pour l’y rattacher) ; les routines et modèles s’ajoutent à un jour en un clic.</div></div><div class="acts"><button class="pri" data-act="projadd">Nouveau projet</button></div></div>
 <h2 class="prsec">Projets</h2>
 ${act.length?act.map(one).join(''):'<div class="empty">Aucun projet en cours. Crée-en un : un spectacle, un déménagement, une formation…</div>'}
 ${fin.length?`<details class="projfin"><summary>Terminés (${fin.length})</summary>${fin.map(one).join('')}</details>`:''}
 <div style="margin-top:26px">${tplHtml()}</div>`;
}

/* ---------- Maintenant / Ensuite ---------- */
function nowNext(d){
 const ts=dayTasks(d).filter(t=>!t.done);if(!ts.length)return '';const now=Date.now(),r=runningTask();
 const inWin=t=>t.block&&+new Date(t.block.start)<=now&&+new Date(t.block.end)>now;
 const cur=r&&r.day===d?r:ts.find(inWin)||ts[0],nx=ts.filter(t=>t!==cur).sort((a,b)=>(a.block?+new Date(a.block.start):9e15)-(b.block?+new Date(b.block.start):9e15))[0];
 const run=r===cur,end=cur.block?hm(new Date(cur.block.end)):null;
 return `<div class="nownext"><div class="nowc${run?' run':''}"><small>${run?'En cours':'Maintenant'}</small><button class="nowt" data-act="open" data-id="${cur.id}">${esc(cur.title)}</button><span class="mute">${end?'jusqu’à '+end:cur.est?fmtMin(cur.est):''}</span><button class="nowplay" data-act="${run?'timer':'play'}" data-id="${cur.id}" aria-label="${run?'Pause':'Lancer le focus'}" title="${run?'Pause':'Lancer le focus'}">${ico(run?'pause':'play')}</button></div>${nx?`<div class="nextc"><small>Ensuite</small><button class="nowt" data-act="open" data-id="${nx.id}">${esc(nx.title)}</button><span class="mute">${nx.block?'à '+hm(new Date(nx.block.start)):''}</span></div>`:''}</div>`}

/* ---------- fenêtre d'ajout d'une tâche ---------- */
let ad=null;
function openAdd(day){ad={day:day===undefined?cur:day,est:0,channel:null,prio:'',where:'',title:''};renderAdd(true)}
function addSheetHtml(){
 const pos=S.settings.addPos||'bottom',P=ADDPOS.find(x=>x[0]===pos),q=parseQuick(ad.title||''),dd=q.day!==undefined?q.day:ad.day;
 const days=[[today(),'Aujourd’hui'],[addDays(today(),1),'Demain'],...[2,3,4,5,6].map(k=>[addDays(today(),k),cap1(fmtDay(addDays(today(),k),{weekday:'long',day:'numeric'}))]),['','Backlog']];
 if(dd&&!days.some(x=>x[0]===dd))days.splice(2,0,[dd,cap1(fmtDay(dd,{weekday:'long',day:'numeric',month:'short'}))]);
 const est=ad.est||q.est||0,cat=ad.channel||q.channel;
 return `<div class="rit addsheet"><h2>Nouvelle tâche</h2>
 <input class="adt" data-adtitle value="${esc(ad.title)}" placeholder="Titre de la tâche" autocomplete="off" aria-label="Titre de la tâche">
 <div class="qprev">${quickPreview(ad.title)}</div>
 <div class="adrow">
  <button class="adbtn" data-act="addposcycle" title="Où placer la tâche : clique pour changer">${ico(P[2])}<span>${({top:'En haut',bottom:'En bas',auto:'Génie'})[pos]}</span></button>
  <label class="adbtn">${ico('clock')}<select data-adest aria-label="Durée"><option value="0">Durée</option>${durOpts(est).map(m=>`<option value="${m}" ${m===est?'selected':''}>${fmtMin(m)}</option>`).join('')}</select></label>
  <button class="adbtn" data-act="adcat" title="Catégorie">${ico('tag')}<span>${cat&&node(cat)?esc(nodeLabel(cat)):'Catégorie'}</span></button>
  <label class="adbtn">${ico('cal')}<select data-adday aria-label="Jour">${days.map(([v,l])=>`<option value="${v}" ${(v||null)===(dd||null)?'selected':''}>${l}</option>`).join('')}</select></label>
 </div>
 <div class="adrow">
  <span class="prow" role="radiogroup" aria-label="Priorité">${[['high','Haute'],['','Normale'],['low','Basse']].map(([v,l])=>`<button type="button" class="pbtn${(ad.prio||q.prio||'')===v?' on':''}" data-act="adprio" data-v="${v}" aria-label="Priorité ${l.toLowerCase()}" title="Priorité ${l.toLowerCase()}">${flagSvg(v)}</button>`).join('')}</span>
  <span class="prow" role="radiogroup" aria-label="Lieu">${WHERES.map(([v,l])=>`<button type="button" class="pbtn${(ad.where||q.where||'')===v?' on':''}" data-act="adwhere" data-v="${v}" aria-label="${v?l:'Auto'}" title="${v?l:'Lieu : selon la catégorie'}">${ico({'':'auto',any:'laptop',home:'home',out:'walk'}[v])}</button>`).join('')}</span>
 </div>
 <div class="mfoot"><small class="mute">Entrée pour ajouter et enchaîner · Échap pour fermer</small><span class="sp"></span><button class="ghost" data-act="close">Fermer</button><button class="pri" data-act="adok">Ajouter</button></div></div>`}
function renderAdd(first){if(!ad)return;const i=document.querySelector('[data-adtitle]'),pos=i?i.selectionStart:null;showModal(addSheetHtml());const n=document.querySelector('[data-adtitle]');if(n){n.focus();if(pos!==null&&!first)n.setSelectionRange(pos,pos)}}
function addSubmit(){if(!ad)return;const t0=(document.querySelector('[data-adtitle]')||{}).value||'';if(!t0.trim()){toast('Écris d’abord un titre');return}
 const t=addTask(t0,ad.day);if(!t)return;
 if(ad.est)setEst(t,ad.est);if(ad.channel)t.channel=ad.channel;if(ad.prio!=='')t.prio=ad.prio;if(ad.where)t.where=ad.where;
 if(ad.prio||ad.where||ad.channel)placeNew(t);save();render();toast('Ajoutée : '+t.title);
 ad=Object.assign(ad,{title:'',est:0,channel:null,prio:'',where:''});renderAdd(true)}
