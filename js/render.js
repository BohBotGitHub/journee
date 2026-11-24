// MyDayBot — rendu, modale, rituels, mode focus
/* ---------- rendu principal ---------- */
function render(){
 const a=document.activeElement,keep=a&&a.dataset&&a.dataset.keep,val=keep?a.value:null;
 document.querySelectorAll('#nav [data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===view||(b.dataset.view==='review'&&(view==='objectives'||view==='stats'))));
 {const nb=document.querySelector('#nav [data-view="dump"]'),n=S.tasks.filter(t=>t.inbox&&!t.done).length;if(nb){const o=nb.querySelector('.badge');if(o)o.remove();if(n)nb.insertAdjacentHTML('beforeend',`<span class="badge">${n}</span>`)}}
 document.body.classList.toggle('wideview',view==='tree');
 const m=$('#main'),st=m.scrollTop,bc0=document.querySelector('.bigcal'),bst=bc0?bc0.scrollTop:null;
 m.innerHTML=layout==='cal'&&(view==='today'||view==='week')?viewBigCal():view==='week'?viewWeek():view==='backlog'?viewBacklog():view==='dump'?viewDump():view==='stats'||view==='objectives'||view==='review'?viewReview():view==='objectives'?viewObjectives():view==='settings'?viewSettings():view==='tree'?viewTree():viewToday();
 m.scrollTop=st;
 {const sv=m.querySelector('.tvsvg');if(sv){try{const bb=sv.getBBox(),p=14;sv.setAttribute('viewBox',`${bb.x-p} ${bb.y-p} ${bb.width+2*p} ${bb.height+2*p}`)}catch(e){}}}
 renderSide();renderRun();renderSyncBar();
 if(keep){const n=document.querySelector(`[data-keep="${keep}"]`);if(n){n.focus();if(val&&!n.value)n.value=val}}
 if(layout==='cal'&&(view==='today'||view==='week')){const bd=bigDays();ensureRange(bd[0],bd[bd.length-1])}else if(view==='week'){const w=monday(cur);ensureRange(w,addDays(w,6))}else{ensureRange(cur,addDays(cur,6))}
 {const bc=document.querySelector('.bigcal');if(bc){if(!scrolledBig||bst===null){scrolledBig=true;const n=new Date();bc.scrollTop=Math.max(0,(Math.max(S.settings.dayStart,n.getHours()-1)-S.settings.dayStart)*PX)}else bc.scrollTop=bst}}
}
function renderSide(){
 document.querySelectorAll('.stabs [data-side]').forEach(b=>b.classList.toggle('on',b.dataset.side===sideTab));
 const sb=$('#sidebody'),st=sb.scrollTop;
 const bigOn=layout==='cal'&&(view==='today'||view==='week');sb.innerHTML=sideTab==='todo'?viewTodo():sideTab==='ai'?viewAI():bigOn?viewSideTasks():viewCal();
 const tb=document.querySelector('.stabs [data-side="cal"]');if(tb)tb.textContent=bigOn?'Tâches':'Agenda';
 if(sideTab==='ai'){aiUnread=0;renderBadge();}
 if(sideTab==='ai'){sb.scrollTop=sb.scrollHeight}else if(sideTab==='cal'&&!bigOn&&scrolledCal!==cur){scrolledCal=cur;const n=new Date(),h=cur===today()?Math.max(S.settings.dayStart,n.getHours()-1):S.settings.workStart;sb.scrollTop=(h-S.settings.dayStart)*PX}else sb.scrollTop=st;
}
function renderRun(){
 const r=S.running,t=r&&T(r.taskId);
 $('#runchip').innerHTML=t?`<div class="runbox" data-act="openfocus" data-id="${t.id}"><span>En cours</span><b>${esc(t.title)}</b><span class="t" data-live="run">${clock(actualSec(t))}</span></div>`:'';
}
function go(v){
 if(v==='side'){document.body.classList.toggle('side-open');return}
 view=v;try{history.replaceState(null,'','#'+v)}catch(e){}
 $('#main').scrollTop=0;render();
}

/* ---------- modale ---------- */
function showModal(html){$('#sheet').innerHTML=html;$('#modal').classList.remove('hidden')}
function closeModal(){
 if(modalTask){const t=T(modalTask);if(t&&t.block&&t.block.gcalId&&t.block.title!==t.title&&gTok()){t.block.title=t.title;save();gFetch(`/calendars/${blkCal(t)}/events/${encodeURIComponent(t.block.gcalId)}`,{method:'PATCH',body:JSON.stringify({summary:(t.done?'✓ ':'')+t.title})}).catch(()=>{})}}
 $('#modal').classList.add('hidden');modalTask=null;ritual=null;render();
}
function subsHtml(t){return (t.subtasks||[]).map(s=>`<div class="sub${s.d?' d':''}${focusOn===t.id&&focusSub===s.id?' cur':''}"><button class="chk" data-act="subt" data-tid="${t.id}" data-s="${s.id}" aria-label="Cocher">${s.d?'✓':''}</button><span>${esc(s.t)}</span>${s.d?'':`<button class="play" data-act="focussub" data-tid="${t.id}" data-s="${s.id}" aria-label="Focus sur cette sous-tâche">▶</button>`}<button class="x" data-act="subd" data-tid="${t.id}" data-s="${s.id}" aria-label="Supprimer">×</button></div>`).join('')}
function openTask(id){
 const t=T(id);if(!t)return;if(modalAI&&modalAI.tid!==id)modalAI=null;modalTask=id;ritual=null;
 const objs=weekObjs(monday(t.day||today())),r=t.recurId&&S.recurring.find(x=>x.id===t.recurId);
 const ests=[0,10,15,20,30,45,60,75,90,120,150,180,240];if(!ests.includes(t.est))ests.push(t.est),ests.sort((a,b)=>a-b);
 showModal(`<div class="mhead"><input class="mtitle" data-f="title" value="${esc(t.title)}" aria-label="Titre"><button class="x" data-act="close" aria-label="Fermer">×</button></div>
 <div class="grid2">
 <label>Catégorie<button type="button" class="catbtn" data-act="pickcatm" data-id="${t.id}" style="--c:${esc(ch(t.channel)?ch(t.channel).color:'var(--line)')}">${ch(t.channel)?`<span class="chip">${esc(nodeLabel(t.channel))}</span>`:'<span class="mute">Choisir une catégorie…</span>'}<span class="mute">Changer</span></button></label><label>Projet<select data-f="proj"><option value="">Aucun</option>${(S.projects||[]).filter(p=>!p.done||p.id===t.proj).map(p=>`<option value="${esc(p.id)}" ${p.id===t.proj?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
 <label>Durée estimée<select data-f="est">${ests.map(v=>`<option value="${v}" ${v===t.est?'selected':''}>${v?fmtMin(v):'—'}</option>`).join('')}</select></label>
 <label>Jour (vide = backlog)<input type="date" data-f="day" value="${t.day||''}"></label>
 <label>Créneau dans l’agenda<span class="row"><input type="time" step="900" data-f="time" value="${t.block?hm(new Date(t.block.start)):''}">${t.block&&t.pinned?'<button class="sm ghost" data-act="unpin">Libérer l’heure</button>':''}${t.block&&!flowOn()?'<button class="sm ghost" data-act="unblock">Retirer</button>':''}</span></label>
 <label>Échéance<span class="row"><input type="date" data-f="due" value="${t.due||''}">${t.due?'<button class="sm ghost" data-act="nodue">Aucune</button>':''}</span></label>
 <label>Objectif de la semaine<select data-f="obj"><option value="">Aucun</option>${objs.map(o=>`<option value="${esc(o.id)}" ${o.id===t.objId?'selected':''}>${esc(o.title)}</option>`).join('')}</select></label>
 <label>Répéter<select data-f="recur"><option value="">Jamais</option>${Object.entries(RULES).map(([k,v])=>`<option value="${k}" ${r&&r.rule===k?'selected':''}>${v}</option>`).join('')}</select></label>
 <label>Priorité<select data-f="prio">${[['','Normale'],['low','Basse'],['high','Haute'],['urgent','Urgente']].map(([v,l])=>`<option value="${v}" ${(t.prio||'')===v?'selected':''}>${l}</option>`).join('')}</select></label>
 <label>Temps passé (min)<input type="number" min="0" data-f="actual" value="${Math.round(actualSec(t)/60)}"></label>
 </div>
 <div class="subs"><h4>Sous-tâches</h4><div>${subsHtml(t)}</div><form data-form="sub" data-tid="${t.id}"><input name="t" data-keep="sub" placeholder="Ajouter une sous-tâche" autocomplete="off"></form>${aiOn()?modalAIHtml(t):''}</div>
 <label class="full">Notes<textarea data-f="notes" rows="4">${esc(t.notes)}</textarea></label>
 <div class="mfoot"><button class="danger" data-act="del" data-id="${t.id}">Supprimer</button>${t.src?'<span class="src">Liée à Microsoft To Do</span>':msOn()?`<button class="ghost sm" data-act="pushtodo" data-id="${t.id}">Créer dans To Do</button>`:''}<span class="sp"></span><button class="ghost" data-act="play" data-id="${t.id}">Focus</button><button class="pri" data-act="close">OK</button></div>`);
}

function modalAIHtml(t){
 const a=modalAI&&modalAI.tid===t.id?modalAI:null;
 if(!a)return `<div class="row" style="margin-top:8px"><button class="sm" data-act="aisplit" data-id="${t.id}">Découper et estimer avec Claude</button></div>`;
 if(a.loading)return '<div class="aibox"><span class="mute">Claude réfléchit…</span></div>';
 if(a.error)return `<div class="aibox"><span class="mute">Claude : ${esc(a.error)}</span><button class="sm" data-act="aisplit" data-id="${t.id}">Réessayer</button></div>`;
 const items=propItems(a.prop),ap=a.applied||{};
 return `<div class="aibox"><b>Claude</b>${a.text?`<p>${esc(a.text)}</p>`:''}${items.map(it=>`<div class="pitem${ap[it.k]?' ok':''}"><div>${esc(it.label)}${it.reason?`<small class="mute">${esc(it.reason)}</small>`:''}</div>${ap[it.k]?'<small>Fait</small>':`<button class="sm pri" data-act="modalapply" data-k="${it.k}">Appliquer</button>`}</div>`).join('')}${items.filter(it=>!ap[it.k]).length>1?'<button class="sm" data-act="modalapplyall">Tout appliquer</button>':''}</div>`;
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
const savedRit=()=>{try{const r=JSON.parse(lsGet(RKEY)||'null');return r&&Date.now()-r.at<12*3600e3?r:null}catch(e){return null}};
const RIT_AI={
 plan0:{when:d=>pastUndone().some(t=>t.day<d),q:d=>`Rituel du matin, étape « hier ». Pour chaque tâche en retard, propose : la reprendre le ${d} (updates day=${d}), la renvoyer au backlog (day=backlog) ou l’abandonner si elle est obsolète (drop=true). Justifie en quelques mots.`},
 plan1:{when:()=>true,q:d=>`Rituel du matin, étape « choisir ». Dans le backlog et les autres jours, choisis les tâches à ajouter au ${d} (pick) en tenant compte de la charge, des réunions occupées, des priorités et des objectifs de la semaine. Propose au plus 2 nouvelles tâches utiles.`},
 plan2:{when:d=>dayTasks(d).some(t=>!t.done),q:d=>`Rituel du matin, étape « estimer ». Donne une durée (updates est) aux tâches du ${d} sans durée ou mal estimées d’après l’historique. Si la journée déborde, propose des reports (updates day).`},
 plan3:{when:d=>dayTasks(d).some(t=>!t.done&&!t.block),q:d=>`Rituel du matin, étape « planifier ». Propose un ordre (order) et des créneaux (blocks, HH:MM) pour les tâches non planifiées du ${d}, dans les heures de travail, sans chevaucher les rendez-vous occupés${d===today()?', à partir de maintenant':''}. Les rendez-vous « compatibles » peuvent accueillir des tâches légères.`},
 plan4:{when:()=>true,q:d=>`Rituel du matin, dernière étape. Propose une intention courte et motivante pour la journée (intent), en lien avec ce qui compte le plus.`},
 shutdown0:{when:()=>true,q:d=>`Rituel du soir. Fais un bilan bref et bienveillant de la journée du ${d} (ce qui a avancé, temps réel vs estimé) en 2-3 phrases, sans proposition.`},
 shutdown1:{when:d=>dayTasks(d).some(t=>!t.done),q:d=>`Rituel du soir. Pour chaque tâche non terminée du ${d} : demain (${addDays(d,1)}), backlog ou abandon (drop). Garde demain réaliste.`},
 weekplan1:{when:()=>true,q:d=>`Planification de la semaine. Propose 1 à 3 objectifs (objectives) pour la semaine du ${monday(d)}, à partir des tâches prévues, du backlog et des objectifs passés non atteints.`},
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
 if(!a)return `<div class="aibox"><div class="row"><span class="mute">Claude peut t’aider sur cette étape.</span><span class="sp"></span><button class="sm" data-act="ritai">Demander à Claude</button></div></div>`;
 if(a.loading)return `<div class="aibox"><span class="mute">Claude réfléchit…</span></div>`;
 if(a.error)return `<div class="aibox"><div class="row"><span class="mute">Claude : ${esc(a.error)}</span><span class="sp"></span><button class="sm" data-act="ritai">Réessayer</button></div></div>`;
 const items=propItems(a.prop),ap=a.applied||{};
 return `<div class="aibox"><b>Claude</b>${a.text?`<p>${esc(a.text)}</p>`:''}${items.map(it=>`<div class="pitem${ap[it.k]?' ok':''}"><div>${esc(it.label)}${it.reason?`<small class="mute">${esc(it.reason)}</small>`:''}</div>${ap[it.k]?'<small>Fait</small>':`<button class="sm pri" data-act="ritapply" data-k="${it.k}">Appliquer</button>`}</div>`).join('')}${items.filter(it=>!ap[it.k]).length>1?'<button class="sm" data-act="ritapplyall">Tout appliquer</button>':''}<div class="row"><span class="sp"></span><button class="sm ghost" data-act="ritai">Nouvelle proposition</button></div></div>`;
}
const RIT={plan:['Hier','Choisir','Estimer','Planifier','Valider'],shutdown:['Bilan','Ce qui reste','Clôture'],weekplan:['Semaine passée','Objectifs','Aperçu'],weekreview:['Chiffres','Réflexion']};
function startRitual(type,day){modalTask=null;const sv=savedRit();ritual=sv&&sv.type===type&&sv.day===(day||cur)?sv:{type,step:0,day:day||cur,picked:{},ai:{}};if(type==='plan'&&todo.listId&&msOn())loadTodoTasks(todo.listId);renderRitual()}
function shell(body,next){const st=RIT[ritual.type],i=ritual.step;return `<div class="rit"><div class="rsteps">${st.map((s,k)=>`<span class="${k===i?'on':k<i?'past':''}">${esc(s)}</span>`).join('')}<span class="sp" style="background:none"></span></div>${body}${aiBox()}<div class="mfoot">${i>0?'<button class="ghost" data-act="ritback">Retour</button>':''}<button class="ghost" data-act="close">Plus tard</button><span class="sp"></span><button class="pri" data-act="ritnext">${next||'Continuer'}</button></div></div>`}
const durBtns=t=>`<div class="durs">${[15,30,45,60,90,120].map(v=>`<button class="sm${t.est===v?' on':''}" data-act="dur" data-id="${t.id}" data-v="${v}">${fmtMin(v)}</button>`).join('')}</div>`;
function renderRitual(){
 if(!ritual)return;const d=ritual.day,i=ritual.step,dl=fmtDay(d,{weekday:'long',day:'numeric',month:'long'});let h='';
 if(ritual.type==='plan'){
  if(i===0){const p=pastUndone().filter(t=>t.day<d);
   h=shell(`<h2>On fait le point</h2><p class="lead">${p.length?`${p.length} tâche${p.length>1?'s':''} pas terminée${p.length>1?'s':''} les jours précédents. Que veux-tu en faire ?`:'Rien en retard. Tu pars d’une page blanche.'}</p>
   ${p.length?`<div class="rlist">${p.map(t=>`<div class="rrow"><div><b>${esc(t.title)}</b><small>${fmtDay(t.day,{weekday:'short',day:'numeric',month:'short'})}${t.est?' · '+fmtMin(t.est):''}</small></div><div class="btns"><button class="sm" data-act="mv" data-id="${t.id}" data-to="${d}">Ce jour</button><button class="sm ghost" data-act="mv" data-id="${t.id}" data-to="backlog">Backlog</button><button class="sm ghost" data-act="rm" data-id="${t.id}">Supprimer</button></div></div>`).join('')}</div><button class="sm" data-act="mvall" data-to="${d}">Tout reporter au ${esc(fmtDay(d,{weekday:'long'}))}</button>`:''}`);
  }else if(i===1){const ts=dayTasks(d),bl=S.tasks.filter(t=>!t.day&&!t.done).sort((a,b)=>a.order-b.order),td=msOn()&&todo.listId?(todo.tasks[todo.listId]||[]):[];
   h=shell(`<h2>Qu’est-ce qui compte ${d===today()?'aujourd’hui':'ce jour-là'} ?</h2><p class="lead">${cap1(dl)}. Choisis ce que tu veux vraiment faire.</p>${objChips(monday(d))}
   ${addForm(d,'Ajouter une tâche… (ex. « Relire le devis 20m »)','rit-add')}
   <div class="rsec">Prévu (${ts.length})</div><div class="rlist">${ts.length?ts.map(t=>`<div class="rrow sel"><div><b>${esc(t.title)}</b>${t.src?' <span class="src">To Do</span>':''}</div><div class="btns"><button class="sm ghost" data-act="mv" data-id="${t.id}" data-to="backlog">Retirer</button></div></div>`).join(''):'<p class="mute">Rien pour l’instant.</p>'}</div>
   ${bl.length?`<div class="rsec">Depuis le backlog</div><div class="rlist">${bl.map(t=>`<div class="rrow"><div><b>${esc(t.title)}</b><small>${ch(t.channel)?esc(nodeLabel(t.channel)):''}${t.est?' · '+fmtMin(t.est):''}</small></div><div class="btns"><button class="sm" data-act="mv" data-id="${t.id}" data-to="${d}">Ajouter</button></div></div>`).join('')}</div>`:''}
   ${td.length?`<div class="rsec">Depuis Microsoft To Do</div><div class="rlist">${td.filter(x=>!S.tasks.some(t=>t.src&&t.src.taskId===x.id&&t.day===d)).map(x=>`<div class="rrow"><div><b>${esc(x.title)}</b></div><div class="btns"><button class="sm" data-act="todoadd" data-l="${esc(todo.listId)}" data-t="${esc(x.id)}" data-day="${d}">Ajouter</button></div></div>`).join('')}</div>`:''}`);
  }else if(i===2){const ts=dayTasks(d).filter(t=>!t.done),L=loadInfo(d);
   h=shell(`<h2>Combien de temps ?</h2><p class="lead">Estime chaque tâche. ${gTok()?'Tes réunions sont comptées.':'Connecte Google Agenda pour compter aussi tes réunions.'}</p>${loadBar(d)}
   ${L.over>0?`<p style="color:var(--warn);font-weight:600;margin:0 0 8px">Ta journée déborde de ${fmtMin(L.over)}. Reporte ou retire quelque chose.</p>`:''}
   <div class="rlist">${ts.map(t=>`<div class="rrow"><div style="flex:1 1 180px"><b>${esc(t.title)}</b></div>${durBtns(t)}${L.over>0?`<div class="btns"><button class="sm ghost" data-act="mv" data-id="${t.id}" data-to="${addDays(d,1)}">Demain</button><button class="sm ghost" data-act="mv" data-id="${t.id}" data-to="backlog">Backlog</button></div>`:''}</div>`).join('')||'<p class="mute">Aucune tâche à estimer.</p>'}</div>`);
  }else if(i===3){const ts=dayTasks(d).filter(t=>!t.done),free=ts.filter(t=>!t.block).length;
   h=shell(`<h2>Quand vas-tu le faire ?</h2><p class="lead">Bloque du temps pour tes tâches. Tu peux aussi les glisser une à une sur l’agenda à droite.</p>
   <button class="${free?'pri':''}" data-act="ritauto" ${free?'':'disabled'}>Placer automatiquement ${free?free+' tâche'+(free>1?'s':''):''} dans mes créneaux libres</button>
   <div class="rlist" style="margin-top:12px">${ts.map(t=>`<div class="rrow${t.block?' sel':''}"><div><b>${esc(t.title)}</b><small>${t.block?hm(new Date(t.block.start))+'–'+hm(new Date(t.block.end)):'Pas de créneau'}</small></div><div class="btns"><input type="time" step="900" data-ritime="${t.id}" value="${t.block?hm(new Date(t.block.start)):''}" style="width:auto;min-height:32px;font-size:14px;padding:3px 8px" aria-label="Heure">${t.block?`<button class="sm ghost" data-act="ritunblock" data-id="${t.id}">Retirer</button>`:''}</div></div>`).join('')}</div>`);
  }else{const ts=dayTasks(d),L=loadInfo(d),first=ts.filter(t=>t.block&&!t.done).sort((a,b)=>a.block.start<b.block.start?-1:1)[0];
   h=shell(`<h2>C’est parti</h2><p class="lead">${ts.length} tâche${ts.length>1?'s':''} · ${fmtMin(L.task)} de travail${L.meet?' · '+fmtMin(L.meet)+' de réunions':''}${first?` · première à ${hm(new Date(first.block.start))}`:''}</p>
   <label>Ton intention pour la journée (facultatif)<input data-intent value="${esc((S.days[d]||{}).intent||'')}" placeholder="Ex. : finir le dossier sans me disperser"></label>`,'Commencer la journée');
  }
 }else if(ritual.type==='shutdown'){
  const ts=dayTasks(d),done=ts.filter(t=>t.done),left=ts.filter(t=>!t.done),sec=ts.reduce((a,t)=>a+actualSec(t),0);
  if(i===0)h=shell(`<h2>Ce que tu as accompli</h2><p class="lead">${cap1(dl)}</p>
   <div class="stat"><div><b>${done.length}/${ts.length}</b><small>tâches terminées</small></div><div><b>${fmtMin(sec/60)}</b><small>temps suivi</small></div><div><b>${fmtMin(meetingMin(d))}</b><small>en réunion</small></div></div>
   <div class="rlist">${done.map(t=>`<div class="rrow sel"><div><b>${esc(t.title)}</b><small>${fmtMin(actualSec(t)/60)} passées${t.est?' / '+fmtMin(t.est)+' prévues':''}</small></div></div>`).join('')||'<p class="mute">Aucune tâche cochée. Ça arrive. Demain est un autre jour.</p>'}</div>`);
  else if(i===1)h=shell(`<h2>Ce qui reste</h2><p class="lead">${left.length?'Décide où vont ces tâches pour repartir l’esprit léger.':'Tout est fait. Belle journée.'}</p>
   ${left.length?`<div class="rlist">${left.map(t=>`<div class="rrow"><div><b>${esc(t.title)}</b></div><div class="btns"><button class="sm" data-act="mv" data-id="${t.id}" data-to="${addDays(d,1)}">Demain</button><button class="sm ghost" data-act="mv" data-id="${t.id}" data-to="backlog">Backlog</button><button class="sm ghost" data-act="rm" data-id="${t.id}">Supprimer</button></div></div>`).join('')}</div><button class="sm" data-act="mvday" data-to="${addDays(d,1)}">Tout reporter à demain</button>`:''}`);
  else h=shell(`<h2>Fin de journée</h2><p class="lead">Quelques mots pour toi : ce qui s’est bien passé, ce que tu changerais.</p>
   <textarea data-note rows="6" placeholder="Ce qui s’est bien passé…&#10;Ce que je ferais autrement…">${esc((S.days[d]||{}).note||'')}</textarea>`,'Journée terminée');
 }else if(ritual.type==='weekplan'){
  const w=monday(d),pw=addDays(w,-7),pos=weekObjs(pw),os=weekObjs(w);
  if(i===0)h=shell(`<h2>La semaine passée</h2><p class="lead">Tes objectifs de la semaine du ${fmtDay(pw,{day:'numeric',month:'long'})}.</p>
   ${pos.length?`<div class="rlist">${pos.map(o=>`<div class="rrow${o.done?' sel':''}"><div><b>${esc(o.title)}</b><small>${o.done?'Atteint':'Pas atteint'}</small></div><div class="btns"><button class="sm ghost" data-act="objtoggle" data-id="${o.id}">${o.done?'Annuler':'Marquer atteint'}</button>${o.done||os.some(x=>x.title===o.title)?'':`<button class="sm" data-act="objcarry" data-id="${o.id}">Reconduire</button>`}</div></div>`).join('')}</div>`:'<p class="mute">Pas d’objectifs la semaine dernière.</p>'}`);
  else if(i===1)h=shell(`<h2>Tes objectifs de la semaine</h2><p class="lead">1 à 3 résultats qui feraient de cette semaine une réussite.</p>
   <form class="add" data-form="obj"><input name="t" data-keep="obj" placeholder="Ajouter un objectif…" autocomplete="off"></form>
   <div class="rlist">${os.map(o=>`<div class="rrow sel"><div><b>${esc(o.title)}</b></div><div class="btns"><button class="sm ghost" data-act="objdel" data-id="${o.id}">Supprimer</button></div></div>`).join('')||'<p class="mute">Aucun objectif pour l’instant.</p>'}</div>`);
  else h=shell(`<h2>Ta semaine</h2><p class="lead">La charge prévue jour par jour. Rééquilibre depuis la vue Semaine si un jour déborde.</p>
   <div class="bars">${[...Array(7)].map((_,k)=>{const x=addDays(w,k),L=loadInfo(x);return `<div class="brow"><span>${cap1(fmtDay(x,{weekday:'short',day:'numeric'}))}</span><div class="bt" style="--c:${L.over>0?'var(--warn)':'var(--acc)'}"><i style="width:${Math.min(100,(L.task+L.meet)/L.cap*100)}%"></i></div><span>${fmtMin(L.task+L.meet)}</span></div>`}).join('')}</div>`,'Valider ma semaine');
 }else if(ritual.type==='weekreview'){
  const w=monday(d);
  if(i===0)h=shell(`<h2>Revue de la semaine</h2><p class="lead">Semaine du ${fmtDay(w,{day:'numeric',month:'long'})}</p>${statsHtml(w)}
   <div class="rsec">Objectifs</div><div class="rlist">${weekObjs(w).map(o=>`<div class="rrow${o.done?' sel':''}"><div><b>${esc(o.title)}</b></div><div class="btns"><button class="sm ghost" data-act="objtoggle" data-id="${o.id}">${o.done?'Atteint ✓':'Marquer atteint'}</button></div></div>`).join('')||'<p class="mute">Pas d’objectifs cette semaine.</p>'}</div>`);
  else h=shell(`<h2>Ce que tu retiens</h2><p class="lead">Ce qui a marché, ce qui a coincé, ce que tu ajustes la semaine prochaine.</p>
   <textarea data-review rows="7">${esc((S.weeks[w]||{}).review||'')}</textarea>`,'Terminer la revue');
 }
 showModal(h);saveRit();
 const R=RIT_AI[ritual.type+ritual.step];
 if(R&&aiOn()&&S.settings.aiAuto&&!(ritual.ai&&ritual.ai[ritual.step])&&R.when(ritual.day))aiRitual();
}
function ritNext(){
 const n=RIT[ritual.type].length,d=ritual.day;
 const sh=$('#sheet');
 if(ritual.type==='plan'&&ritual.step===4){const v=sh.querySelector('[data-intent]');emit('ritual:plan',{day:d});S.days[d]=Object.assign(S.days[d]||{},{planned:true,intent:v?v.value.trim():''})}
 if(ritual.type==='shutdown'&&ritual.step===2){const v=sh.querySelector('[data-note]');emit('ritual:shutdown',{day:d});S.days[d]=Object.assign(S.days[d]||{},{shutdown:true,note:v?v.value.trim():''});if(S.running)stopTimer()}
 if(ritual.type==='weekplan'&&ritual.step===2){const w=monday(d);S.weeks[w]=Object.assign(S.weeks[w]||{},{planned:true})}
 if(ritual.type==='weekreview'&&ritual.step===1){const w=monday(d),v=sh.querySelector('[data-review]');S.weeks[w]=Object.assign(S.weeks[w]||{},{review:v?v.value.trim():''})}
 save();
 if(ritual.step>=n-1){const ty=ritual.type;ritual=null;lsDel(RKEY);closeModal();toast(ty==='plan'?'Journée planifiée. Bon travail !':ty==='shutdown'?'Journée clôturée. Repose-toi bien.':ty==='weekplan'?'Semaine planifiée.':'Revue enregistrée.');if(ty==='shutdown')chime(520);return}
 ritual.step++;renderRitual();
}

/* ---------- mode focus ---------- */
function openFocus(id,sub){
 const t=T(id);if(!t)return;
 if(!$('#modal').classList.contains('hidden')){$('#modal').classList.add('hidden');modalTask=null;ritual=null}
 focusOn=id;const fs=sub&&t.subtasks.find(x=>x.id===sub)||t.subtasks.find(x=>!x.d);focusSub=fs?fs.id:null;if(!S.running||S.running.taskId!==id)startTimer(id);activate(t);renderFocus();
}
function renderFocus(){
 const el=$('#focus');
 if(!focusOn){el.classList.add('hidden');return}
 const t=T(focusOn);if(!t){focusOn=null;el.classList.add('hidden');return}
 const c=ch(t.channel),run=S.running&&S.running.taskId===t.id;
 el.classList.remove('hidden');
 el.innerHTML=`<div class="fwrap"><div class="ftop">${c?`<span class="chip" style="--c:${esc(c.color)}">${esc(c.name)}</span>`:''}<button class="x" data-act="focusclose">Quitter le focus (Échap)</button></div>
 ${(()=>{const sb=focusSub&&t.subtasks.find(x=>x.id===focusSub);return sb?`<div class="fsub">${esc(t.title)} · sous-tâche ${t.subtasks.indexOf(sb)+1}/${t.subtasks.length}</div><h1 class="ftitle">${esc(sb.t)}</h1>`:`<h1 class="ftitle">${esc(t.title)}</h1>`})()}
 <div><div class="fclockrow"><div class="fclock" data-live="focus">${clock(actualSec(t))}</div><button class="freset" data-act="timerreset" data-id="${t.id}" aria-label="Remettre le minuteur à zéro" title="Remettre le minuteur à zéro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></button></div><div class="fsub">${t.est?'Estimé : '+fmtMin(t.est):'Pas d’estimation'}${run?'':' · en pause'}${t.block?' · créneau '+hm(new Date(t.block.start))+'–'+hm(new Date(t.block.end)):''}${(()=>{const nx=dayTasks(today()).filter(x=>!x.done&&x!==t&&x.block).sort((a,b)=>new Date(a.block.start)-new Date(b.block.start))[0];return nx?' · ensuite : '+esc(nx.title)+' à '+hm(new Date(nx.block.start)):''})()}</div></div>
 <div class="fbtns"><button class="${run?'ghost':'pri'} big" data-act="timer" data-id="${t.id}">${run?'Pause':'Reprendre'}</button>${focusSub?`<button class="ok big" data-act="focussubdone">Sous-tâche terminée</button><button class="ghost big" data-act="focusdone" data-id="${t.id}">Terminer toute la tâche</button>`:`<button class="ok big" data-act="focusdone" data-id="${t.id}">Terminer la tâche</button>`}</div>
 <div class="subs"><h4>Sous-tâches</h4><div>${subsHtml(t)}</div><form data-form="sub" data-tid="${t.id}"><input name="t" data-keep="fsub" placeholder="Ajouter une sous-tâche" autocomplete="off"></form></div>
 <textarea class="fnotes" data-fnotes="${t.id}" placeholder="Notes…">${esc(t.notes)}</textarea></div>`;
}

/* ---------- boucle d'une seconde ---------- */
setInterval(()=>{
 const r=S.running,t=r&&T(r.taskId);
 if(t){const el=document.querySelector('[data-live="run"]');if(el)el.textContent=clock(actualSec(t));
  const f=document.querySelector('[data-live="focus"]');if(f&&focusOn===t.id)f.textContent=clock(actualSec(t));
  const c=document.querySelector(`[data-live="t-${t.id}"]`);if(c)c.textContent=fmtMin(actualSec(t)/60)+' / '+(t.est?fmtMin(t.est):'—');}
 document.querySelectorAll('[data-live="now"]').forEach(nl=>{const n=new Date();nl.style.top=((n.getHours()-S.settings.dayStart)*60+n.getMinutes())/60*PX+'px'});
 if(today()!==lastDay){const was=lastDay;lastDay=today();if(cur===was)cur=lastDay;genRecurring();render()}
},1000);
