// MyDayBot — interactions : clics, glisser-déposer, palette, clavier
/* ---------- interactions ---------- */
let toastT;
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),3200)}
document.addEventListener('click',async e=>{
 const nv=e.target.closest('#nav [data-view]');if(nv){go(nv.dataset.view);return}
 const sd=e.target.closest('[data-side]');if(sd){sideTab=sd.dataset.side;renderSide();return}
 if(e.target.id==='modal'){if(!ritual)closeModal();return}
 const b=e.target.closest('[data-act]');if(!b)return;
 const a=b.dataset.act,id=b.dataset.id;
 switch(a){
  case'toggle':await toggleDone(id);if(ritual)renderRitual();break;
  case'open':if(!e.target.closest('.chk'))openTask(id);break;
  case'play':openFocus(id);break;
  case'openfocus':openFocus(id);break;
  case'focusnext':{if(!$('#modal').classList.contains('hidden')&&!ritual)closeModal();const t=dayTasks(cur).find(t=>!t.done);t?openFocus(t.id):toast('Aucune tâche à faire ce jour-là');break}
  case'focusclose':focusOn=null;focusSub=null;renderFocus();render();break;
  case'focusdone':{await toggleDone(id);const nx=dayTasks(cur).find(t=>!t.done);focusOn=null;renderFocus();toast(nx?'Bravo ! Prochaine : '+nx.title:'Bravo ! Tout est fait.');break}
  case'timer':if(S.running&&S.running.taskId===id){stopTimer();render()}else{startTimer(id);const tt=T(id);if(tt)activate(tt)}renderFocus();break;
  case'prev':cur=addDays(cur,-1);render();break;
  case'next':cur=addDays(cur,1);render();break;
  case'prevw':cur=addDays(cur,-7);render();break;
  case'nextw':cur=addDays(cur,7);render();break;
  case'gotoday':cur=today();render();break;
  case'openday':cur=b.dataset.day;go('today');break;
  case'plan':if(!$('#modal').classList.contains('hidden')&&!ritual)closeModal();startRitual('plan',cur);break;
  case'shutdown':if(!$('#modal').classList.contains('hidden')&&!ritual)$('#modal').classList.add('hidden');startRitual('shutdown',cur);break;
  case'weekplan':startRitual('weekplan',cur);break;
  case'weekreview':startRitual('weekreview',cur);break;
  case'ritnext':ritNext();break;
  case'ritback':ritual.step--;renderRitual();break;
  case'ritauto':{const n=autoBox(ritual.day);toast(n?n+' tâche'+(n>1?'s':'')+' placée'+(n>1?'s':''):'Pas de créneau libre assez long dans tes heures de travail');renderRitual();break}
  case'ritunblock':{const t=T(id);if(t)clearBlock(t);renderRitual();break}
  case'autobox':{const n=autoBox(cur);toast(n?n+' tâche'+(n>1?'s':'')+' placée'+(n>1?'s':''):'Rien à placer, ou pas de créneau libre');break}
  case'close':closeModal();break;
  case'closeside':document.body.classList.remove('side-open');break;
  case'rollover':rolloverAll(today());toast('Tâches reportées à aujourd’hui');break;
  case'mv':moveTask(id,b.dataset.to);if(ritual)renderRitual();break;
  case'mvall':rolloverAll(b.dataset.to);renderRitual();break;
  case'mvday':dayTasks(ritual.day).filter(t=>!t.done).forEach(t=>moveTask(t.id,b.dataset.to,true));save();render();renderRitual();break;
  case'rm':deleteTask(id);render();if(ritual)renderRitual();break;
  case'dur':{const t=T(id);if(t){setEst(t,+b.dataset.v);renderRitual()}break}
  case'totoday':moveTask(id,today());toast('Ajoutée à aujourd’hui');break;
  case'del':deleteTask(id);closeModal();toast('Tâche supprimée');break;
  case'unblock':{const t=T(modalTask);if(t){clearBlock(t);openTask(t.id)}break}
  case'pushtodo':{const t=T(id);if(t)pushTodo(t);break}
  case'subt':case'subd':{const t=T(b.dataset.tid);if(!t)break;if(a==='subt'){const s=t.subtasks.find(s=>s.id===b.dataset.s);if(s)s.d=!s.d}else t.subtasks=t.subtasks.filter(s=>s.id!==b.dataset.s);save();if(focusOn)renderFocus();if(modalTask===t.id)openTask(t.id);render();break}
  case'objtoggle':{const o=S.objectives.find(o=>o.id===id);if(o){o.done=!o.done;save();render();if(ritual)renderRitual()}break}
  case'objdel':S.objectives=S.objectives.filter(o=>o.id!==id);S.tasks.forEach(t=>{if(t.objId===id)t.objId=null});save();render();if(ritual)renderRitual();break;
  case'objcarry':{const o=S.objectives.find(o=>o.id===id);if(o){S.objectives.push({id:uid(),week:monday(ritual.day),title:o.title,done:false});save();renderRitual()}break}
  case'gin':gLogin();break;
  case'gout':gLogout();break;
  case'min':msLogin();break;
  case'mout':msLogout();break;
  case'refresh':{const w=monday(cur);gEvents={};gCals=null;view==='week'?ensureRange(w,addDays(w,6),true):ensureRange(cur,cur,true);break}
  case'goset':go('settings');document.body.classList.remove('side-open');break;
  case'todoreload':todo.lists=null;todo.tasks={};renderSide();syncTodo();break;
  case'todoadd':{const l=b.dataset.l,x=(todo.tasks[l]||[]).find(x=>x.id===b.dataset.t);if(x){importTodo(l,x,b.dataset.day||cur);render();if(ritual)renderRitual();toast('Ajoutée au '+fmtDay(b.dataset.day||cur,{weekday:'long',day:'numeric'}))}break}
  case'copyuri':try{await navigator.clipboard.writeText(REDIRECT);toast('Adresse copiée')}catch(err){toast('Copie impossible : sélectionne l’adresse à la main')}break;
  case'treeask':showModal(treeMigrationHtml());break;
  case'treego':applyTree();closeModal();render();relocateBlocks();toast('Tâches rangées dans l’arbre');break;
  case'nodemenu':nodeMenu(id);break;
  case'tvsel':treeSel=treeSel===id?null:id;if(isNarrow()&&treeSel){nodeMenu(id)}else render();break;
  case'tvfocus':treeFocus=id?(treeFocus===id?null:id):null;if(id&&!treeSel)treeSel=id;render();break;
  case'tvmode':treeMode=b.dataset.m;render();break;
  case'tvaddpil':{const n={id:uid(),name:'Nouveau pilier',color:'#888780',lvl:0,parent:null,o:pillars().length};S.channels.push(n);treeColors();save();treeSel=n.id;render();break}
  case'nodedelask':closeModal();nodeDelAsk(id);break;
  case'nodedelgo':if(nodeDelGo)nodeDelGo();break;
  case'nodemove':{const n=node(id);if(!n)break;closeModal();openPicker({title:'Déplacer « '+n.name+' » vers…',levels:[n.lvl-1],current:n.parent,exclude:new Set([n.parent]),noneLabel:false,onPick:to=>{if(to){nodeMove(id,to);toast('« '+n.name+' » déplacé dans '+node(to).name)}render()}});break}
  case'pkpick':pickChoose(b.dataset.id);break;
  case'pkclose':closePicker();break;
  case'pkok':{if(pick&&pick.sel!==undefined){const f=pick.onPick,v=pick.sel;f(v)}break}
  case'pickcat':e.stopPropagation&&e.stopPropagation();pickTaskCat(id,false);break;
  case'pickcatm':pickTaskCat(id,true);break;
  case'nodeadd':{const n=nodeAdd(id);closeModal();if(n){treeSel=n.id;if(treeFocus===null&&view==='tree'&&treeMode!=='list'){}}render();if(n)setTimeout(()=>{const i=document.querySelector(`[data-nn="${n.id}"]`);if(i){i.focus();i.select()}},50);break}
  case'nodedel':closeModal();nodeDelAsk(id);break;
  case'nodeup':nodeShift(id,-1);render();break;
  case'nodedown':nodeShift(id,1);render();break;
  case'projadd':S.projects=S.projects||[];S.projects.push({id:uid(),name:'Nouveau projet',end:null,done:false});save();render();break;
  case'refine':{if(!aiOn())break;b.disabled=true;b.textContent='Claude range…';try{refineProp=await aiRefine((a,n)=>{b.textContent=`Claude range… ${a}/${n}`});if(!refineProp.length){toast('Claude n’a rien trouvé à affiner');render()}else showModal(refineHtml())}catch(err){toast('Claude : '+err.message);render()}break}
  case'refineok':{const skip=new Set([...document.querySelectorAll('[data-refine]')].filter(x=>!x.checked).map(x=>x.dataset.refine));const n=applyRefine(skip);closeModal();render();toast(n+' tâches rangées');break}
  case'chadd':S.channels.push({id:uid(),name:'Nouveau catégorie',color:'#'+Math.floor(Math.random()*0xaaaaaa+0x222222).toString(16).padStart(6,'0')});save();render();break;
  case'chdel':S.channels=S.channels.filter(c=>c.id!==id);S.tasks.forEach(t=>{if(t.channel===id)t.channel=null});save();render();break;
  case'unpin':{const t=T(modalTask);if(t){t.pinned=false;save();openTask(t.id)}break}
  case'notifon':{if(!('Notification' in window)){toast('Ce navigateur ne gère pas les notifications');break}const pm=await Notification.requestPermission();S.settings.notif=pm==='granted';save();render();toast(pm==='granted'?'Notifications activées':'Notifications refusées par le navigateur');break}
  case'notifoff':S.settings.notif=false;save();render();break;
  case'notiftest':{let n;try{n=JSON.parse(lsGet('journee.notified')||'{}')}catch(err){n={}}notify('test'+Date.now(),'MyDayBot','Les notifications fonctionnent.');break}
  case'dumptasks':dumpToTasks();break;
  case'dumpai':dumpSort();break;
  case'dictate':dictate();break;
  case'dumpaiclose':dumpAI=null;render();break;
  case'dumpapply':{if(dumpAI){applyItem(dumpAI,b.dataset.k);render()}break}
  case'dumpapplyall':{if(dumpAI){propItems(dumpAI.prop).forEach(it=>applyItem(dumpAI,it.k));S.dump='';dumpAI=null;save();render();toast('Vide-tête transformé en tâches')}break}
  case'inbox':{const t=T(id);if(t){t.inbox=false;moveTask(t.id,b.dataset.to);toast(b.dataset.to==='backlog'?'Rangée au backlog':'Planifiée')}break}
  case'keys':showKeys();break;
  case'layout':if(!$('#modal').classList.contains('hidden')&&!ritual)closeModal();toggleLayout();break;
  case'span':calSpan=+b.dataset.n;lsSet('journee.span',String(calSpan));render();break;
  case'focussub':{const t=T(b.dataset.tid);if(t){if(focusOn!==t.id)openFocus(t.id,b.dataset.s);else{focusSub=b.dataset.s;renderFocus()}}break}
  case'focussubdone':{const t=T(focusOn),x=t&&t.subtasks.find(z=>z.id===focusSub);if(x){x.d=true;chime(780);const nx=t.subtasks.find(z=>!z.d);focusSub=nx?nx.id:null;save();render();renderFocus();toast(nx?'Suivante : '+nx.t:'Toutes les sous-tâches sont faites')}break}
  case'nodue':{const t=T(modalTask);if(t){t.due=null;save();openTask(t.id)}break}
  case'tplnew':editTpl('');break;
  case'tpledit':editTpl(id);break;
  case'tplsave':{const name=($('[data-tplname]').value||'').trim()||'Modèle',items=tplFromText($('[data-tpltext]').value||'');if(!items.length){toast('Ajoute au moins une tâche');break}S.templates=S.templates||[];let tp=id&&S.templates.find(x=>x.id===id);if(tp){tp.name=name;tp.items=items}else S.templates.push({id:uid(),name,items});save();closeModal();toast('Modèle enregistré');break}
  case'tpldel':S.templates=(S.templates||[]).filter(x=>x.id!==id);save();closeModal();break;
  case'tplapply':applyTpl(id,b.dataset.day||null);break;
  case'tplfromday':{const ts=dayTasks(cur).filter(t=>!t.recurId);if(!ts.length){toast('Aucune tâche ce jour-là');break}S.templates=S.templates||[];const tp={id:uid(),name:'Journée type du '+fmtDay(cur,{day:'numeric',month:'short'}),items:ts.map(t=>({title:t.title,est:t.est,channel:t.channel,subs:t.subtasks.map(x=>x.t)}))};S.templates.push(tp);save();editTpl(tp.id);break}
  case'tplsug':{const x=tplSuggestions().find(z=>z.c===b.dataset.c);if(x){S.templates=S.templates||[];S.templates.push({id:uid(),name:'Routine '+ch(x.c).name,items:x.items});save();render();toast('Routine créée')}break}
  case'archcopy':{const a=(S.archive||[]).find(x=>x.id===id);if(a){S.tasks.push(mk({title:a.t,channel:a.c,est:a.e||Math.round((a.a||0)/60)||0,day:today(),order:nextOrder(today())}));save();closeModal();go('today');toast('Ajoutée à aujourd’hui')}break}
  case'palopen':if(!$('#modal').classList.contains('hidden')&&!ritual)closeModal();openPal();break;
  case'synchide':lsSet('journee.sync.hide',today());renderSyncBar();break;
  case'home':document.body.classList.remove('side-open');closeModal();cur=today();go('today');break;
  case'go':document.body.classList.remove('side-open');go(b.dataset.v);break;
  case'mvup':closeModal();swapTask(id,-1);break;
  case'mvdown':closeModal();swapTask(id,1);break;
  case'sheetmv':closeModal();moveTask(id,b.dataset.to);toast(b.dataset.to==='backlog'?'Renvoyée au backlog':'Reportée à demain');break;
  case'sum':uiOpen=uiOpen===b.dataset.k?'':b.dataset.k;render();break;
  case'freeze':{const d=cur;S.days[d]=Object.assign(S.days[d]||{},{frozen:!(S.days[d]||{}).frozen});save();if(!$('#modal').classList.contains('hidden'))closeModal();render();toast(S.days[d].frozen?'Journée figée : les créneaux ne bougent plus avec l’heure':'Les créneaux suivent à nouveau l’heure');break}
  case'daymenu':dayMenu();break;
  case'estmenu':{const t=T(id);if(t)estMenu(t,b);break}
  case'setest':{const t=T(id);if(t)setEst(t,+b.dataset.v);closePop();break}
  case'ritai':aiRitual();break;
  case'ritapply':{const a=ritual&&ritual.ai&&ritual.ai[ritual.step];if(a){applyItem(a,b.dataset.k);saveRit();renderRitual()}break}
  case'ritapplyall':{const a=ritual&&ritual.ai&&ritual.ai[ritual.step];if(a){propItems(a.prop).forEach(it=>applyItem(a,it.k));saveRit();renderRitual();toast('Suggestions appliquées')}break}
  case'evtoggle':{if(e.target.closest('a'))break;const k=b.dataset.k;S.evMode=S.evMode||{};const ev=Object.values(gEvents).flat().find(x=>evKey(x)===k);const cur0=ev?evFree(ev):false;S.evMode[k]=cur0?'busy':'free';save();render();toast(cur0?'Marqué occupé':'Tu peux travailler pendant ce rendez-vous');break}
  case'aisplit':{const t=T(id);if(t)aiSplit(t);break}
  case'modalapply':{if(modalAI){applyItem(modalAI,b.dataset.k);openTask(modalTask)}break}
  case'modalapplyall':{if(modalAI){propItems(modalAI.prop).forEach(it=>applyItem(modalAI,it.k));openTask(modalTask)}break}
  case'aiq':sideTab='ai';document.body.classList.add('side-open');aiAsk(b.dataset.q,true);break;
  case'aiapply':{const m=S.chat[+b.dataset.m];if(m)applyItem(m,b.dataset.k);break}
  case'aiapplyall':{const m=S.chat[+b.dataset.m];if(m)propItems(m.prop).forEach(it=>applyItem(m,it.k));toast('Propositions appliquées');break}
  case'aiok':{const t=T(id);if(t&&t.aiSug){if(t.aiSug.channel)t.channel=t.aiSug.channel;if(t.aiSug.est){setEst(t,t.aiSug.est)}t.aiSug=null;save();render()}break}
  case'aino':{const t=T(id);if(t){t.aiSug=null;save();render()}break}
  case'aiclear':S.chat=[];save();renderSide();toast('Conversation effacée');break;
  case'askclaude':sideTab='ai';closeModal();document.body.classList.add('side-open');aiAsk('Aide-moi à planifier ma journée : ordre, durées, catégories, et ce qui doit être reporté.',true);break;
  case'export':{const blob=new Blob([JSON.stringify(Object.assign({},S,{settings:Object.assign({},S.settings,{aiKey:''})}),null,1)],{type:'application/json'}),u=URL.createObjectURL(blob),l=document.createElement('a');l.href=u;l.download='journee-'+today()+'.json';document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);break}
 }
});
document.addEventListener('toggle',e=>{if(e.target.matches&&e.target.matches('[data-adv]'))advOpen=e.target.open},true);
document.addEventListener('submit',e=>{
 const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();
 const inp=f.querySelector('input,textarea'),v=inp.value.trim();if(!v)return;
 const k=f.dataset.form;
 if(k==='add'){addTask(v,f.dataset.day||null);const n=document.querySelector(`[data-keep="${inp.dataset.keep}"]`);if(n)n.value='';if(ritual)renderRitual()}
 else if(k==='obj'){S.objectives.push({id:uid(),week:monday(ritual?ritual.day:cur),title:v,done:false});save();render();if(ritual)renderRitual()}
 else if(k==='ai'){inp.value='';aiAsk(v,false);return}
 else if(k==='sub'){const t=T(f.dataset.tid);if(t){t.subtasks.push({id:uid(),t:v,d:false});save();if(focusOn)renderFocus();if(modalTask===t.id)openTask(t.id);render()}}
 const n=document.querySelector(`[data-keep="${inp.dataset.keep}"]`);if(n){n.value='';n.focus()}
});
document.addEventListener('input',e=>{
 const el=e.target;
 if(el.dataset.f&&modalTask){const t=T(modalTask);if(!t)return;
  if(el.dataset.f==='title'){t.title=el.value;if(t.recurId){const r=S.recurring.find(x=>x.id===t.recurId);if(r)r.title=t.title}save()}
  if(el.dataset.f==='notes'){t.notes=el.value;save()}}
 if(ritual&&el.hasAttribute('data-intent')){S.days[ritual.day]=Object.assign(S.days[ritual.day]||{},{intent:el.value});save()}
 if(ritual&&el.hasAttribute('data-note')){S.days[ritual.day]=Object.assign(S.days[ritual.day]||{},{note:el.value});save()}
 if(ritual&&el.hasAttribute('data-review')){const w=monday(ritual.day);S.weeks[w]=Object.assign(S.weeks[w]||{},{review:el.value});save()}
 if(el.hasAttribute('data-dump')){S.dump=el.value;save()}
 if(el.dataset.fnotes){const t=T(el.dataset.fnotes);if(t){t.notes=el.value;save()}}
});
document.addEventListener('change',async e=>{
 const el=e.target,f=el.dataset.f;
 if(f&&modalTask){const t=T(modalTask);if(!t)return;const r=t.recurId&&S.recurring.find(x=>x.id===t.recurId);
  switch(f){
   case'channel':t.channel=el.value||null;t.aiCat=false;if(r)r.channel=t.channel;if(t.block)pushBlock(t);break;
   case'proj':t.proj=el.value||null;break;
   case'est':setEst(t,+el.value);break;
   case'day':{const nd=el.value||null;if(t.block&&ymd(new Date(t.block.start))!==nd)clearBlock(t,true);t.day=nd;if(nd)t.order=nextOrder(nd);break}
   case'time':if(el.value){const[hh,mm]=el.value.split(':').map(Number),dt=parseYmd(t.day||cur);dt.setHours(hh,mm,0,0);t.pinned=true;setBlock(t,dt,true);syncOrder(t.day)}else{t.pinned=false;if(!flowOn())clearBlock(t,true)}break;
   case'obj':t.objId=el.value||null;break;
   case'due':t.due=el.value||null;break;
   case'prio':t.prio=el.value;break;
   case'recur':setRecur(t,el.value);break;
   case'actual':if(S.running&&S.running.taskId===t.id)S.running.start=Date.now();t.actual=Math.max(0,+el.value||0)*60;break;
   default:return;
  }
  save();render();if(['day','time','recur','est','due'].includes(f))openTask(t.id);return;
 }
 if(el.dataset.ritime){const t=T(el.dataset.ritime);if(t){if(el.value){const[hh,mm]=el.value.split(':').map(Number),dt=parseYmd(ritual.day);dt.setHours(hh,mm,0,0);t.pinned=true;setBlock(t,dt,true);syncOrder(ritual.day)}else clearBlock(t,true);save();render();renderRitual()}return}
 if(el.dataset.set){const k=el.dataset.set;S.settings[k]=(k==='aiAuto'||k==='liveShift')?!!el.value:el.type==='number'?+el.value:el.value.trim();if(k==='aiBudget'){const c=document.querySelector('[data-live="aicost"]');if(c)c.textContent=costTxt()}save();if(el.type==='number'||k==='aiKey')render();return}
 if(el.hasAttribute('data-tips')){lsSet('journee.tips',el.checked?'on':'off');renderTip();return}
 if(el.dataset.sheettime){const t=T(el.dataset.sheettime);if(t&&el.value){const[hh,mm]=el.value.split(':').map(Number),dt=parseYmd(t.day||cur);dt.setHours(hh,mm,0,0);t.pinned=true;setBlock(t,dt,true);syncOrder(t.day);save();closeModal();render();toast('Heure fixée à '+el.value)}return}
 if(el.dataset.cal){S.settings.cals=S.settings.cals||{};S.settings.cals[el.dataset.cal]=el.checked;save();gEvents={};render();return}
 if(el.dataset.ncal!==undefined){const n=node(el.dataset.ncal);if(n){n.cal=el.value||null;save();relocateBlocks();toast('Agenda de « '+n.name+' » enregistré')}return}
 if(el.dataset.nc){const n=node(el.dataset.nc);if(n){n.color=el.value;treeColors();save();render()}return}
 if(el.dataset.nn){const n=node(el.dataset.nn);if(n){n.name=el.value.trim()||n.name;save();if(view==='tree'&&!document.querySelector('#modal:not(.hidden)'))render()}return}
 if(el.dataset.nk!==undefined){const n=node(el.dataset.nk);if(n){n.key=norm(el.value).replace(/[^a-z0-9]/g,'');el.value=n.key;save()}return}
 if(el.dataset.nmove){nodeMove(el.dataset.nmove,el.value);closeModal();render();return}
 if(el.dataset.pn){const p=proj(el.dataset.pn);if(p){p.name=el.value.trim()||p.name;save()}return}
 if(el.dataset.pe){const p=proj(el.dataset.pe);if(p){p.end=el.value||null;save()}return}
 if(el.dataset.pd){const p=proj(el.dataset.pd);if(p){p.done=el.checked;save();render()}return}
 if(el.dataset.ctxcal!==undefined){S.settings.ctxCal=S.settings.ctxCal||{};S.settings.ctxCal[el.dataset.ctxcal]=el.value;save();relocateBlocks();toast('Agenda du contexte enregistré');return}
 if(el.dataset.chcal!==undefined){const c=ch(el.dataset.chcal);if(c){c.cal=el.value;save();relocateBlocks();toast('Agenda de « '+c.name+' » enregistré')}return}
 if(el.dataset.chc){const c=ch(el.dataset.chc);if(c){c.color=el.value;save();render()}return}
 if(el.dataset.chn){const c=ch(el.dataset.chn);if(c){c.name=el.value.trim()||c.name;save()}return}
 if(el.hasAttribute('data-todolist')){todo.listId=el.value;S.settings.todoList=el.value;save();renderSide();return}
 if(el.hasAttribute('data-sunsama')&&el.files[0]){try{const st=importSunsama(await el.files[0].text());showModal(`<div class="rit"><h2>Import Sunsama terminé</h2><div class="stat"><div><b>${st.tasks}</b><small>tâches actives ou récentes</small></div><div><b>${st.archive}</b><small>tâches dans l’historique</small></div><div><b>${st.channels}</b><small>catégories créées</small></div></div><p class="lead">${st.objectives} objectifs, ${st.recurring} récurrence(s) active(s), ${st.skipped} rituels ignorés${st.dup?', '+st.dup+' déjà importées':''}.</p><div class="mfoot"><span class="sp"></span><button class="pri" data-act="close">Voir ma journée</button></div></div>`);view='today';cur=today();render()}catch(err){toast('Import impossible : '+err.message)}return}
 if(el.hasAttribute('data-import')&&el.files[0]){try{const j=JSON.parse(await el.files[0].text());if(!Array.isArray(j.tasks))throw new Error('format inconnu');S=Object.assign(defaults(),j);S.settings=Object.assign(defaults().settings,j.settings||{});save();render();toast('Sauvegarde importée')}catch(err){toast('Import impossible : '+err.message)}}
});

/* ---------- glisser-déposer ---------- */
function calMinute(z,y){const r=z.getBoundingClientRect();let m=S.settings.dayStart*60+(y-r.top)/PX*60;m=Math.round(m/15)*15;return Math.max(S.settings.dayStart*60,Math.min(S.settings.dayEnd*60-15,m))}
document.addEventListener('dragstart',e=>{const c=e.target.closest('[data-drag]');if(!c)return;drag=c.dataset.drag;try{e.dataTransfer.setData('text/plain',drag);e.dataTransfer.effectAllowed='move'}catch(err){}c.classList.add('dragging')});
document.addEventListener('dragend',()=>{document.querySelectorAll('.dragging,.over').forEach(x=>x.classList.remove('dragging','over'));document.querySelectorAll('.ghostblk').forEach(g=>g.classList.add('hidden'));drag=null});
document.addEventListener('dragover',e=>{
 const z=e.target.closest('[data-drop]');if(!z||!drag)return;e.preventDefault();
 document.querySelectorAll('.over').forEach(x=>{if(x!==z)x.classList.remove('over')});z.classList.add('over');
 document.querySelectorAll('.ghostblk').forEach(x=>{if(!z.contains(x))x.classList.add('hidden')});const g=z.querySelector('.ghostblk');if(g){if(z.dataset.drop==='cal'){const sp=drag.split('|'),tt=sp[0]!=='todo'&&T(sp[1]),dur=(tt&&tt.est)||30,m=calMinute(z,e.clientY);g.classList.remove('hidden');g.style.top=(m-S.settings.dayStart*60)/60*PX+'px';g.style.height=Math.max(18,dur/60*PX)+'px';g.textContent=pad(Math.floor(m/60))+':'+pad(m%60)+' – '+fmtMin(dur)}else g.classList.add('hidden')}
});
document.addEventListener('drop',async e=>{
 const z=e.target.closest('[data-drop]');if(!z||!drag)return;e.preventDefault();
 const dz=z.dataset.drop,src=drag.split('|');drag=null;z.classList.remove('over');
 let t;
 if(src[0]==='todo'){const x=(todo.tasks[src[1]]||[]).find(x=>x.id===src[2]);if(!x)return;t=importTodo(src[1],x,dz==='backlog'?null:dz.startsWith('day:')?dz.slice(4):(z.dataset.day||cur))}
 else t=T(src[1]);
 if(!t)return;
 if(dz==='cal'){const dd=z.dataset.day||cur,dt=parseYmd(dd);dt.setMinutes(calMinute(z,e.clientY));t.pinned=true;if(t.day!==dd)t.order=nextOrder(dd);const p=setBlock(t,dt,true);syncOrder(dd);save();render();await p;return}
 if(dz==='backlog'){if(t.day!==null)moveTask(t.id,'backlog');else render();return}
 if(dz.startsWith('day:')){
  const day=dz.slice(4),before=e.target.closest('.card');
  if(t.day!==day)moveTask(t.id,day,true);
  if(src[0]==='blk'&&t.block){if(flowOn()){t.pinned=false;toast('Créneau libéré : la tâche suit l’ordre de la liste')}else{clearBlock(t,true);toast('Retiré de l’agenda')}}
  if(before&&before.dataset.id!==t.id){const b=T(before.dataset.id);if(b&&b.day===day){t.order=b.order-.5;renorm(day)}}
  if(!flowOn()&&reflow(day))toast('Agenda réorganisé selon le nouvel ordre');
  save();render();
 }
});

/* ---------- interactions fluides liste ↔ agenda ---------- */
const KEYS=[['⌘K','Palette : chercher, créer, aller à…'],['N','Nouvelle tâche'],['P','Planifier la journée'],['S','Clôturer la journée'],['F','Focus sur la prochaine tâche'],['C','Inverser liste et grand agenda'],['D','Vide-tête'],['T','Aujourd’hui'],['W','Semaine'],['B','Backlog'],['O','Objectifs'],['A','Arbre des catégories'],['← →','Jour ou semaine précédent / suivant'],['Échap','Fermer'],['?','Afficher tous les raccourcis']];
function showKeys(){showModal(`<div class="rit"><h2>Raccourcis clavier</h2><div class="keys" style="margin-top:12px">${KEYS.map(([k,l])=>`<kbd>${k}</kbd><span>${l}</span>`).join('')}</div><div class="mfoot"><label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-tips ${lsGet('journee.tips')==='off'?'':'checked'} style="width:auto;min-height:0">Rappels réguliers en bas de l’écran</label><span class="sp"></span><button class="pri" data-act="close">OK</button></div></div>`)}
let tipI=0;
function renderTip(){const el=$('#tip');if(!el)return;if(lsGet('journee.tips')==='off'||innerWidth<720){el.innerHTML='';return}const [k,l]=KEYS[tipI%KEYS.length];el.innerHTML=`<span>Raccourci</span><kbd>${k}</kbd><span>${l}</span>`;tipI++}
setInterval(renderTip,20000);setTimeout(renderTip,1500);
function toggleLayout(){layout=layout==='cal'?'tasks':'cal';lsSet('journee.layout',layout);scrolledBig=false;if(view!=='today'&&view!=='week')view='today';if(layout==='cal')sideTab='cal';render();toast(layout==='cal'?'Grand agenda au centre, tâches à droite':'Liste au centre, agenda à droite')}
function closePop(){const p=$('#pop');if(p)p.remove()}
function estMenu(t,el){
 closePop();const r=el.getBoundingClientRect(),p=document.createElement('div');p.id='pop';
 p.innerHTML=[10,15,20,30,45,60,75,90,120,180].map(v=>`<button class="sm${t.est===v?' pri':''}" data-act="setest" data-id="${t.id}" data-v="${v}">${fmtMin(v)}</button>`).join('');
 document.body.appendChild(p);const w=236;p.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';p.style.top=Math.min(innerHeight-p.offsetHeight-8,r.bottom+6)+'px';
}
document.addEventListener('click',e=>{if(!e.target.closest('#pop')&&!e.target.closest('[data-act="estmenu"]'))closePop()},true);
document.addEventListener('mouseover',e=>{
 const el=e.target.closest('.card[data-id],.blk[data-id]');document.querySelectorAll('.hl').forEach(x=>x.classList.remove('hl'));
 if(!el)return;const id=el.dataset.id;document.querySelectorAll(`.card[data-id="${id}"],.blk[data-id="${id}"]`).forEach(x=>{if(x!==el)x.classList.add('hl')});
});
let rz=null;
document.addEventListener('pointerdown',e=>{
 const h=e.target.closest('[data-rz]');if(!h)return;e.preventDefault();e.stopPropagation();
 const blk=h.closest('.blk'),t=T(h.dataset.rz);if(!t||!t.block)return;blk.draggable=false;
 rz={t,blk,y:e.clientY,h:blk.offsetHeight,start:new Date(t.block.start)};h.setPointerCapture&&h.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove',e=>{if(!rz)return;const nh=Math.max(PX/4,rz.h+(e.clientY-rz.y));const m=Math.max(15,Math.round(nh/PX*60/15)*15);rz.blk.style.height=(m/60*PX)+'px';rz.m=m;const sm=rz.blk.querySelector('small');if(sm){const end=new Date(rz.start.getTime()+m*60000);sm.textContent=hm(rz.start)+'–'+hm(end)+' · '+fmtMin(m)}});
document.addEventListener('pointerup',()=>{if(!rz)return;const {t,m}=rz;rz=null;if(m&&m!==t.est){setEst(t,m);toast('Durée : '+fmtMin(m))}else render()});
// rafraîchissement régulier de l'agenda Google
setInterval(()=>{if(!document.hidden&&gTok()&&$('#modal').classList.contains('hidden')){const a=document.activeElement;if(a&&a.matches('input,textarea'))return;const w=monday(cur);view==='week'?ensureRange(w,addDays(w,6),true):ensureRange(cur,cur,true)}},5*60*1000);

setInterval(liveTick,30000);setTimeout(liveTick,3000);
setInterval(gSilent,60000);setTimeout(gSilent,2000);
/* ---------- palette de commandes (Cmd+K) et recherche globale ---------- */
let pal=null;
function palItems(q){
 const out=[],ql=norm(q).trim();
 const cmds=[['Aujourd’hui','go:today'],['Semaine','go:week'],['Vide-tête','go:dump'],['Backlog et modèles','go:backlog'],['Revue : objectifs','go:objectives'],['Arbre des catégories','go:tree'],['Revue : statistiques','go:stats'],['Figer ou libérer la journée','freeze'],['Réglages','go:settings'],['Planifier ma journée','plan'],['Clôturer la journée','shutdown'],['Focus sur la prochaine tâche','focus'],['Inverser liste et grand agenda','layout'],['Planifier la semaine','weekplan'],['Revue de la semaine','weekreview'],['Nouveau modèle','tplnew'],...(S.templates||[]).map(t=>['Appliquer « '+t.name+' » aujourd’hui','tpl:'+t.id])];
 const cmdHit=ql&&cmds.some(([l])=>norm(l).startsWith(ql));
 if(cmdHit)cmds.filter(([l])=>norm(l).includes(ql)).slice(0,6).forEach(([l,k])=>out.push({k,label:l,grp:'Commandes'}));
 if(ql){
  const d=dateWord(ql.replace(/^(aller a|aller au|au|le)\s+/,''));if(d)out.unshift({k:'day:'+d,label:'Aller au '+fmtDay(d),grp:'Aller'});
  out.push({k:'new',label:'Créer la tâche « '+q.trim()+' »',grp:'Créer',hint:'Entrée'});
  out.push({k:'dump',label:'Ajouter au vide-tête',grp:'Créer'});
  if(aiOn())out.push({k:'ask',label:'Demander à Claude : « '+q.trim()+' »',grp:'Créer'});
 }
 if(!cmdHit)cmds.filter(([l])=>!ql||norm(l).includes(ql)).slice(0,ql?6:14).forEach(([l,k])=>out.push({k,label:l,grp:'Commandes'}));
 if(ql.length>=2){
  S.tasks.filter(t=>norm(t.title+' '+(t.notes||'')+' '+t.subtasks.map(x=>x.t).join(' ')).includes(ql)).sort((a,b)=>(a.done-b.done)||((b.day||'')>(a.day||'')?1:-1)).slice(0,8)
   .forEach(t=>out.push({k:'task:'+t.id,label:(t.done?'✓ ':'')+t.title,hint:t.day?fmtDay(t.day,{day:'numeric',month:'short'}):'Backlog',grp:'Tâches'}));
  const seen=new Set();(S.archive||[]).filter(a=>norm(a.t).includes(ql)).sort((a,b)=>a.d<b.d?1:-1).filter(a=>{const k=norm(a.t).trim();if(seen.has(k))return false;seen.add(k);return true}).slice(0,8)
   .forEach(a=>out.push({k:'arch:'+a.id,label:a.t,hint:fmtDay(a.d,{day:'numeric',month:'short',year:'2-digit'})+(a.a?' · '+fmtMin(a.a/60):''),grp:'Historique'}));
 }
 return out;
}
function openPal(){pal={q:'',sel:0};let el=$('#pal');if(!el){el=document.createElement('div');el.id='pal';document.body.appendChild(el)}el.innerHTML=`<div class="palbox" role="dialog" aria-label="Palette de commandes"><input id="palq" placeholder="Rechercher, créer une tâche, aller à un jour…" autocomplete="off" aria-label="Commande ou recherche"><div id="pallist"></div><div class="palfoot"><span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span><span><kbd>Entrée</kbd> valider</span><span><kbd>Échap</kbd> fermer</span></div></div>`;el.classList.remove('hidden');const i=$('#palq');i.focus();renderPal()}
function closePal(){pal=null;const el=$('#pal');if(el)el.classList.add('hidden')}
function renderPal(){if(!pal)return;const items=palItems(pal.q);pal.items=items;pal.sel=Math.min(pal.sel,Math.max(0,items.length-1));let g='';
 $('#pallist').innerHTML=items.map((it,i)=>{const h=it.grp!==g?`<div class="palgrp">${esc(it.grp)}</div>`:'';g=it.grp;return h+`<div class="palit${i===pal.sel?' on':''}" data-pal="${i}"><span>${esc(it.label)}</span>${it.hint?`<small>${esc(it.hint)}</small>`:''}</div>`}).join('')||'<div class="palgrp">Aucun résultat</div>';
 const on=$('#pallist .on');if(on)on.scrollIntoView({block:'nearest'})}
function runPal(it){
 if(!it)return;const q=pal?pal.q.trim():'';closePal();const k=it.k;
 if(k.startsWith('go:'))return go(k.slice(3));
 if(k.startsWith('day:')){cur=k.slice(4);return go('today')}
 if(k.startsWith('task:')){const t=T(k.slice(5));if(t){if(t.day){cur=t.day;if(view!=='today'&&view!=='week')view='today';render()}openTask(t.id)}return}
 if(k.startsWith('arch:')){const a=(S.archive||[]).find(x=>x.id===k.slice(5));if(a)showModal(`<div class="rit"><h2>${esc(a.t)}</h2><p class="lead">Terminée le ${fmtDay(a.d)}${a.a?' · '+fmtMin(a.a/60)+' passées':''}${a.e?' · '+fmtMin(a.e)+' estimées':''}${ch(a.c)?' · '+esc(ch(a.c).name):''}${a.o?' · objectif « '+esc(a.o)+' »':''}</p><div class="mfoot"><button class="ghost" data-act="close">Fermer</button><span class="sp"></span><button class="pri" data-act="archcopy" data-id="${esc(a.id)}">Refaire aujourd’hui</button></div></div>`);return}
 if(k.startsWith('tpl:'))return applyTpl(k.slice(4),today());
 if(k==='new'){const t=addTask(q,view==='backlog'?null:cur);if(t)toast('Tâche créée'+(t.day?' le '+fmtDay(t.day,{weekday:'long',day:'numeric'}):' au backlog'));return}
 if(k==='dump'){S.dump=(S.dump?S.dump.replace(/\s*$/,'')+'\n':'')+q;save();toast('Ajouté au vide-tête');return}
 if(k==='ask'){sideTab='ai';document.body.classList.add('side-open');return aiAsk(q,false)}
 if(k==='plan')return startRitual('plan',cur);if(k==='shutdown')return startRitual('shutdown',cur);if(k==='weekplan')return startRitual('weekplan',cur);if(k==='weekreview')return startRitual('weekreview',cur);
 if(k==='focus'){const t=dayTasks(cur).find(t=>!t.done);return t?openFocus(t.id):toast('Aucune tâche à faire')}
 if(k==='freeze'){const d=cur;S.days[d]=Object.assign(S.days[d]||{},{frozen:!(S.days[d]||{}).frozen});save();render();return toast(S.days[d].frozen?'Journée figée':'Journée libérée')}
 if(k==='layout')return toggleLayout();if(k==='tplnew')return editTpl('');
}
document.addEventListener('input',e=>{if(e.target.id==='palq'&&pal){pal.q=e.target.value;pal.sel=0;renderPal()}});
document.addEventListener('keydown',e=>{
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();pal?closePal():openPal();return}
 if(!pal)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closePal();return}
 if(e.key==='ArrowDown'){e.preventDefault();pal.sel=Math.min(pal.sel+1,(pal.items||[]).length-1);renderPal()}
 else if(e.key==='ArrowUp'){e.preventDefault();pal.sel=Math.max(0,pal.sel-1);renderPal()}
 else if(e.key==='Enter'){e.preventDefault();runPal((pal.items||[])[pal.sel])}
},true);
document.addEventListener('click',e=>{const it=e.target.closest('[data-pal]');if(it&&pal){runPal(pal.items[+it.dataset.pal]);return}if(pal&&e.target.id==='pal')closePal()});

/* ---------- clavier ---------- */
document.addEventListener('keydown',e=>{if(e.target.dataset&&e.target.dataset.keep==='ai'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.target.form.requestSubmit()}});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(!$('#modal').classList.contains('hidden'))closeModal();else if(focusOn){focusOn=null;renderFocus();render()}else document.body.classList.remove('side-open');return}
 if(e.target.matches('input,textarea,select')||e.metaKey||e.ctrlKey||e.altKey||focusOn||!$('#modal').classList.contains('hidden'))return;
 const k=e.key.toLowerCase();
 if(k==='n'){e.preventDefault();const i=document.querySelector('[data-keep^="add-"]');if(i)i.focus()}
 else if(k==='t'){cur=today();go('today')}
 else if(k==='c'){toggleLayout()}
 else if(e.key==='?'){showKeys()}
 else if(e.key==='/'){e.preventDefault();openPal()}
 else if(k==='d'){go('dump');setTimeout(()=>{const ta=document.querySelector('[data-dump]');if(ta){ta.focus();ta.selectionStart=ta.value.length}},50)}
 else if(k==='w')go('week');else if(k==='b')go('backlog');else if(k==='o')go('objectives');else if(k==='a')go('tree');else if(k==='r')go('review');
 else if(k==='p')startRitual('plan',cur);else if(k==='s')startRitual('shutdown',cur);
 else if(k==='f'){const t=dayTasks(cur).find(t=>!t.done);if(t)openFocus(t.id)}
 else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const s=e.key==='ArrowLeft'?-1:1;cur=addDays(cur,(view==='week'||view==='objectives')?7*s:s);render()}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('brand')){e.preventDefault();e.target.click()}});
