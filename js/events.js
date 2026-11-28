// Diem — interactions : clics, glisser-déposer, palette, clavier
/* ---------- interactions ---------- */
let toastT;
let toastFn=null;
function toast(msg,act,fn){if(!act&&typeof msg==='string'&&/⌘\/Ctrl Z pour annuler/.test(msg)){msg=msg.replace(/\s*·?\s*⌘\/Ctrl Z pour annuler/,'');act='Annuler';fn=()=>undoPop()}const el=$('#toast');el.textContent=msg;toastFn=act&&fn?fn:null;if(toastFn){const b=document.createElement('button');b.className='tact';b.dataset.act='toastact';b.textContent=act;el.appendChild(b)}el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>{el.classList.remove('show');toastFn=null},toastFn?7000:3200)}
document.addEventListener('click',async e=>{
 const nv=e.target.closest('#nav [data-view]');if(nv){if(nv.dataset.view==='add'){if(!$('#modal').classList.contains('hidden'))closeModal();openAdd(cur);return}if(nv.dataset.view==='today')cur=today();go(nv.dataset.view);return}
 const sd=e.target.closest('[data-side]');if(sd){sideTab=sd.dataset.side;renderSide();return}
 if(e.target.id==='modal'){if(!ritual&&downOnBackdrop)closeModal();return}
 // multi-sélection : ⌘/Ctrl-clic ajoute ou retire une tâche, Maj-clic prend toute la plage
 if(lpFired){lpFired=false;e.preventDefault();e.stopPropagation();return}
 {const tc=msel.size&&lpMode&&e.target.closest('#main .card[data-id]');if(tc&&!e.target.closest('.chk,input,textarea,select')){e.preventDefault();mselClick(tc.dataset.id,false);if(!msel.size)lpMode=false;return}}
 {const mc=(e.metaKey||e.ctrlKey||e.shiftKey)&&e.target.closest('#main .card[data-id]');if(mc&&!e.target.closest('input,textarea,select')){e.preventDefault();mselClick(mc.dataset.id,e.shiftKey);return}}
 const b=e.target.closest('[data-act]');if(!b)return;
 const a=b.dataset.act,id=b.dataset.id;
 const pre=UNDO_ACTS.has(a)?undoSnap():null;
 switch(a){
  case'toggle':{const rr=b.getBoundingClientRect(),keep=keepUnder(b);await toggleDone(id);keep();if(ritual)renderRitual();const tt=T(id);if(tt&&tt.done){rippleAt(rr);celebrate(id)}break}
  case'open':if(!e.target.closest('.chk'))openTask(id);break;
  case'play':openFocus(id);break;
  case'openfocus':openFocus(id);break;
  case'focusnext':{if(!$('#modal').classList.contains('hidden')&&!ritual)closeModal();const t=dayTasks(cur).find(t=>!t.done);t?openFocus(t.id):toast('Aucune tâche à faire ce jour-là');break}
  case'focusclose':focusOn=null;focusSub=null;focusMin=null;renderFocus();render();break;
  case'focusmin':{focusMin=focusOn;focusOn=null;renderFocus();render();break}
  case'focusmax':{const fid=id||focusMin;focusMin=null;if(fid)openFocus(fid);break}
  case'focusdone':{await toggleDone(id);const nx=dayTasks(cur).find(t=>!t.done);focusOn=null;renderFocus();toast(nx?'Bravo ! Prochaine : '+nx.title:'Bravo ! Tout est fait.');break}
  case'timer':if(S.running&&S.running.taskId===id){stopTimer();render()}else{startTimer(id);const tt=T(id);if(tt)activate(tt)}renderFocus();break;
  case'prev':cur=addDays(cur,-1);render();daySlide(-1);break;
  case'next':cur=addDays(cur,1);render();daySlide(1);break;
  case'prevw':cur=addDays(cur,-7);render();break;
  case'nextw':cur=addDays(cur,7);render();break;
  case'gotoday':{const s=cur>today()?-1:1;cur=today();render();daySlide(s);break}
  case'openday':cur=b.dataset.day;go('today');break;
  case'plan':if(!$('#modal').classList.contains('hidden')&&!ritual)closeModal();startRitual('plan',cur);break;
  case'shutdown':if(!$('#modal').classList.contains('hidden')&&!ritual)$('#modal').classList.add('hidden');startRitual('shutdown',cur>today()?today():cur);break;
  case'weekplan':startRitual('weekplan',cur);break;
  case'weekreview':startRitual('weekreview',cur);break;
  case'ritnext':ritNext();break;
  case'ritgo':ritGo(+b.dataset.i);break;
  case'ritback':ritual.step--;renderRitual();break;
  case'ritauto':{const n=autoBox(ritual.day);toast(n?n+' tâche'+(n>1?'s':'')+' placée'+(n>1?'s':''):'Pas de créneau libre assez long dans tes heures de travail');renderRitual();break}
  case'ritunblock':{const t=T(id);if(t)clearBlock(t);renderRitual();break}
  case'autobox':{const n=autoBox(cur);toast(n?n+' tâche'+(n>1?'s':'')+' placée'+(n>1?'s':''):'Rien à placer, ou pas de créneau libre');break}
  case'close':closeModal();break;
  case'adfree':{const dd=b.dataset.day,pre=undoSnap();S.days[dd]=S.days[dd]||{};S.days[dd].adFree=!S.days[dd].adFree;if(!S.days[dd].adFree)delete S.days[dd].adFree;undoCommit(pre,'adfree');save();render();queueFlow();toast(S.days[dd]&&S.days[dd].adFree?'Disponible : les tâches du jour viennent s’y placer':'Journée entière repassée en occupé');break}
  case'hbnew':hbEdit(null);break;
  case'hbedit':hbEdit(b.dataset.h);break;
  case'hbtog':hbToggle(b.dataset.h,b.dataset.day);if(ritual)renderRitual();break;
  case'hbset':if(hbDraft){const k=b.dataset.k;hbDraft[k]=b.dataset.v;if(k==='freq'&&hbDraft.freq==='week')hbDraft.toDay=false;hbEditRender()}break;
  case'hbday':if(hbDraft){const x=+b.dataset.v,ds=new Set(hbDraft.days||[]);ds.has(x)?ds.delete(x):ds.add(x);hbDraft.days=[...ds];hbEditRender()}break;
  case'hbcat':if(hbDraft){const dr=hbDraft;openPicker({title:'Catégorie de « '+(dr.name||'l’habitude')+' »',current:dr.channel,suggest:[ruleFor(dr.name||'')].filter(Boolean),noneLabel:'Sans catégorie',onPick:to=>{dr.channel=to;hbDraft=dr;hbEditRender()}})}break;
  case'hbsave':hbSave();break;
  case'hbdel':hbDelete();break;
  case'hbpause':if(hbDraft){hbDraft.paused=!hbDraft.paused;hbSave()}break;
  case'hbkeep':toast('On garde « '+((H(b.dataset.h)||{}).name||'')+' » telle quelle');b.closest('.hbrrow')&&b.closest('.hbrrow').classList.add('kept');break;
  case'hblight':hbLighten(b.dataset.h);break;
  case'hbpz':{const h=H(b.dataset.h);if(h){h.paused=!h.paused;genHabitTasks();save();if(ritual)renderRitual();else render();toast(h.paused?'« '+h.name+' » en pause (son historique est gardé)':'« '+h.name+' » reprend')}break}
  case'moreside':closeModal();document.body.classList.add('side-open');break;
  case'morego':closeModal();go(b.dataset.v);break;
  case'closeside':document.body.classList.remove('side-open');break;
  case'rollover':rolloverAll(today());toast('Tâches reportées à aujourd’hui');break;
  case'mv':moveTask(id,b.dataset.to,true);if(b.dataset.to>today())putFront([id],T(id)&&T(id).day);save();render();if(ritual)renderRitual();break;
  case'mvall':rolloverAll(b.dataset.to);renderRitual();break;
  case'mvday':{const to0=b.dataset.to;{const mvd=dayTasks(ritual.day).filter(t=>!t.done);mvd.forEach(t=>moveTask(t.id,to0===addDays(today(),1)?nextFreeDay(t):to0,true));if(to0!=='backlog'){const by={};mvd.forEach(t=>{if(t.day)(by[t.day]=by[t.day]||[]).push(t.id)});Object.entries(by).forEach(([dd,ids])=>putFront(ids,dd))}}save();render();renderRitual();break}
  case'rmsheet':{const tt=T(id);closeModal();deleteTask(id);render();toast('Supprimée : '+(tt?tt.title:''),'Annuler',()=>undoPop());break}
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
  case'tvfocus':tvZ={k:1,cx:null,cy:null};treeFocus=id?(treeFocus===id?null:id):null;if(id&&!treeSel)treeSel=id;render();break;
  case'tvmode':treeMode=b.dataset.m;render();break;
  case'tvaddpil':{const n={id:uid(),name:'Nouveau pilier',color:'#888780',lvl:0,parent:null,o:pillars().length};S.channels.push(n);treeColors();save();treeSel=n.id;render();break}
  case'nodedelask':closeModal();nodeDelAsk(id);break;
  case'mailsort':mailSort();break;
  case'mailallow':mailAllow(b.dataset.k);break;
  case'mailstop':mailStop(b.dataset.k);break;
  case'inboxallow':inboxAllow();break;
  case'inboxstop':inboxStop();break;
  case'inboxnow':inboxPoll();break;
  case'cxapply':{const m=S.chat[+b.dataset.m];if(m){applyItem(m,b.dataset.k);toast('Ajouté')}if(ritual)renderRitual();break}
  case'cxdismiss':{const m=S.chat[+b.dataset.m];if(m){m.cxDismiss=true;save()}if(ritual)renderRitual();break}
  case'dupgo':dupDecide(id,b.dataset.k);break;
  case'nodedelgo':if(nodeDelGo)nodeDelGo();break;
  case'nodemove':{const n=node(id);if(!n)break;closeModal();openPicker({title:'Déplacer « '+n.name+' » vers…',levels:[n.lvl-1],current:n.parent,exclude:new Set([n.parent]),noneLabel:false,onPick:to=>{if(to){nodeMove(id,to);toast('« '+n.name+' » déplacé dans '+node(to).name)}render()}});break}
  case'pkpick':pickChoose(b.dataset.id);break;
  case'pkclose':closePicker();break;
  case'pkgo':{if(pick){pick.path=pathOf(b.dataset.id).map(n=>n.id);renderPicker()}break}
  case'pkup':{if(pick){pick.path=(pick.path||[]).slice(0,+b.dataset.i);renderPicker()}break}
  case'pkok':{if(pick&&pick.sel!==undefined){const f=pick.onPick,v=pick.sel;f(v)}break}
  case'pickcat':e.stopPropagation&&e.stopPropagation();pickTaskCat(id,false);break;
  case'pickcatm':pickTaskCat(id,true);break;
  case'nodeadd':{const n=nodeAdd(id);closeModal();if(n){treeSel=n.id;if(treeFocus===null&&view==='tree'&&treeMode!=='list'){}}render();if(n)setTimeout(()=>{const i=document.querySelector(`[data-nn="${n.id}"]`);if(i){i.focus();i.select()}},50);break}
  case'nodedel':closeModal();nodeDelAsk(id);break;
  case'nodeup':nodeShift(id,-1);render();break;
  case'nodedown':nodeShift(id,1);render();break;
  case'projadd':{S.projects=S.projects||[];const np={id:uid(),name:'Nouveau projet',end:null,done:false};S.projects.push(np);if(view!=='projects')go('projects');else render();setTimeout(()=>{const i=document.querySelector(`[data-pn="${np.id}"]`);if(i){i.focus();i.select()}},50);break}
  case'refine':{if(!aiOn())break;b.disabled=true;b.textContent='Le Génie range…';try{refineProp=await aiRefine((a,n)=>{b.textContent=`Le Génie range… ${a}/${n}`});if(!refineProp.length&&!refineLeft.length){toast('Plus rien à ranger');render()}else showModal(refineHtml())}catch(err){toast('Génie : '+err.message);render()}break}
  case'refineok':{const skip=new Set([...document.querySelectorAll('[data-refine]')].filter(x=>!x.checked).map(x=>x.dataset.refine));const n=applyRefine(skip);closeModal();render();toast(n+' tâches rangées');break}
  case'chadd':S.channels.push({id:uid(),name:'Nouveau catégorie',color:'#'+Math.floor(Math.random()*0xaaaaaa+0x222222).toString(16).padStart(6,'0')});save();render();break;
  case'chdel':S.channels=S.channels.filter(c=>c.id!==id);S.tasks.forEach(t=>{if(t.channel===id)t.channel=null});save();render();break;
  case'unpin':{const t=T(modalTask);if(t){t.pinned=false;save();openTask(t.id)}break}
  case'notifon':{if(!('Notification' in window)){toast('Ce navigateur ne gère pas les notifications');break}const pm=await Notification.requestPermission();S.settings.notif=pm==='granted';save();render();toast(pm==='granted'?'Notifications activées':'Notifications refusées par le navigateur');break}
  case'notifoff':S.settings.notif=false;save();render();break;
  case'notiftest':{let n;try{n=JSON.parse(lsGet('journee.notified')||'{}')}catch(err){n={}}notify('test'+Date.now(),'Diem','Les notifications fonctionnent.');break}
  case'dumptasks':dumpToTasks();break;
  case'dumpai':dumpSort();break;
  case'dictate':dictate();break;
  case'dumpaiclose':dumpAI=null;render();break;
  case'dumpapply':{if(dumpAI){applyItem(dumpAI,b.dataset.k);render()}break}
  case'dumpapplyall':{if(dumpAI){propItems(dumpAI.prop).forEach(it=>applyItem(dumpAI,it.k));S.dump='';dumpAI=null;save();render();toast('Braindump transformé en tâches')}break}
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
  case'palopen':if(!$('#modal').classList.contains('hidden')&&!ritual)closeModal();openAdd(cur);break;
  case'genie':{const w=b.dataset.w,id=b.dataset.id;if(w==='focus'&&focusOn){focusMin=focusOn;focusOn=null;renderFocus();render()}else if(w==='task'||ritual){closeModal()}genieAsk(w,'',id);break}
  case'dumptotasks':{const ls=(S.dump||'').split('\n').map(x=>x.trim()).filter(Boolean);let n=0;ls.forEach(l=>{if(addTask(l.replace(/^[-•*]\s*/,''),null))n++});S.dump='';save();render();toast(n+' tâches créées dans Plus tard · ⌘/Ctrl Z pour annuler');break}
  case'adgo':closeModal();if(b.dataset.v==='today')cur=today();go(b.dataset.v);break;
  case'adgenie':{adKeep();const tx=(ad&&ad.title||'').trim();if(!tx){toast('Écris d’abord ce que tu veux (ex. « plan pour préparer le salon »)');break}closeModal();genieAsk('add',tx);break}
  case'addictate':adDictate();break;
  case'synchide':lsSet('journee.sync.hide',today());renderSyncBar();break;
  case'timerreset':{const t=T(id);if(!t)break;const run=!!(S.running&&S.running.taskId===id);if(run)stopTimer();const prev={a:t.actual||0,run};t.actual=0;save();renderFocus();render();timerUndo={id,...prev,at:Date.now()};toast('Minuteur remis à zéro et en pause',run||prev.a?'Annuler':null,()=>undoTimer());break}
  case'timeradj':{const t=T(id);if(!t)break;const nv=Math.max(0,Math.round(actualSec(t)+(+b.dataset.v)*60));if(S.running&&S.running.taskId===id)S.running.start=Date.now();t.actual=nv;save();renderFocus();break}
  case'timeredit':{focusEdit=focusEdit===id?null:id;renderFocus();const i=document.querySelector('[data-fedit]');if(i){i.focus();i.select()}break}
  case'toastact':{const f=toastFn;toastFn=null;$('#toast').classList.remove('show');if(f){f();save();render();if(modalTask)openTask(modalTask)}break}
  case'setprio':{const t=T(id);if(t){const was=t.prio||'';t.prio=b.dataset.p;if(was!==(t.prio||''))placeByPrio(t);save();render();if(modalTask===id)openTask(id);else if(!$('#modal').classList.contains('hidden'))taskSheet(id)}break}
  case'hardrefresh':{b.classList.add('spin');try{save();await Promise.race([driveSync(),new Promise(r=>setTimeout(r,4000))])}catch(err){}
   try{const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(reg){await reg.update().catch(()=>{});if(reg.waiting)reg.waiting.postMessage('skip')}}catch(err){}
   try{if(window.caches){for(const k of await caches.keys())await caches.delete(k)}}catch(err){}
   location.reload();break}
  case'hoursreset':{const i=S.days[today()];if(i){delete i.hs;delete i.he}save();closeModal();render();break}
  case'rollmenu':rollMenu(id);break;
  case'rolltomorrow':{const t=T(id);if(!t)break;t.roll=0;closeModal();const to=nextFreeDay(t);moveTask(id,to,true);putFront([id],T(id).day);save();render();toast(to===addDays(today(),1)?'Reportée à demain':'Demain est plein : reportée au '+fmtDay(to,{weekday:'long',day:'numeric'}));break}
  case'rolldrop':deleteTask(id);closeModal();render();toast('Tâche supprimée');break;
  case'energy':{const dd=ritual?ritual.day:cur;S.days[dd]=Object.assign(S.days[dd]||{},{energy:b.dataset.v||''});save();if(ritual)renderRitual();break}
  case'setjob':{const dd=b.dataset.d;S.days[dd]=S.days[dd]||{};if(b.dataset.v==='auto'){delete S.days[dd].job;delete S.days[dd].js;delete S.days[dd].je}else{const j0=jobOf(dd);S.days[dd].job=b.dataset.v||'';if(b.dataset.v&&j0&&j0.auto){S.days[dd].js=j0.s;S.days[dd].je=j0.e}}save();render();queueFlow();if(ritual)renderRitual();break}
  case'setwhere':{const t=T(id);if(t){t.where=b.dataset.v||'';save();render();openTask(id)}break}
  case'addposcycle':{const o=['bottom','top','auto'],k=o[(o.indexOf(S.settings.addPos||'bottom')+1)%3];S.settings.addPos=k;save();if(ad){adKeep();renderAdd()}else dayMenu();break}
  case'navtog':paneTog('nav');break;
  case'sidetog':paneTog('side');break;
  case'tvz':{const v=b.dataset.v;if(v==='fit'){tvZ={k:1,cx:null,cy:null};tvApply()}else tvZoomBy(v==='in'?1.3:1/1.3);break}
  case'uaadd':{const pre=undoSnap();S.unavail=S.unavail||[];S.unavail.push({id:uid(),label:'',days:['1','2','3','4','5'],s:'12:00',e:'13:00'});undoCommit(pre,'ua');save();render();setTimeout(()=>{const i=[...document.querySelectorAll('.uarow [data-ua="label"]')].pop();if(i)i.focus()},50);break}
  case'uaday':{const u=(S.unavail||[]).find(x=>x.id===id);if(u){const v=b.dataset.v;u.days=u.days.includes(v)?u.days.filter(x=>x!==v):[...u.days,v];save();render()}break}
  case'uadel':{const pre=undoSnap();S.unavail=(S.unavail||[]).filter(x=>x.id!==id);undoCommit(pre,'ua');save();render();toast('Créneau supprimé · ⌘/Ctrl Z pour annuler');break}
  case'subopen':{if(subOpen.has(id))subOpen.delete(id);else subOpen.add(id);lsSet('journee.subopen',JSON.stringify([...subOpen].filter(x=>T(x))));render();break}
  case'tvclose':treeSel=null;render();break;
  case'blsort':lsSet('journee.blsort',b.dataset.v);render();break;
  case'mselact':mselAct(b.dataset.v);break;
  case'addopen':openAdd(b.dataset.d||cur);break;
  case'adok':adKeep();addSubmit();break;
  case'adprio':adKeep();ad.prio=b.dataset.v;renderAdd();break;
  case'adwhere':adKeep();ad.where=b.dataset.v;renderAdd();break;
  case'adcat':{adKeep();openPicker({title:'Catégorie de la nouvelle tâche',current:ad.channel,noneLabel:'Sans catégorie',onPick:to=>{ad.channel=to;renderAdd()}});break}
  case'accent':{S.settings.accent=b.dataset.v;save();render();break}
  case'ritdone':{await toggleDone(id);if(ritual)renderRitual();const tt=T(id);if(tt&&tt.done)celebrate(id);break}
  case'keep':{const t=T(id);if(t){t.roll=0;save()}if(ritual)renderRitual();break}
  case'phare':{const dd=ritual?ritual.day:cur,info=S.days[dd]=S.days[dd]||{},t=T(id);if(!t)break;if(info.phare===id){info.phare=null}else{info.phare=id;t.prio='high';t.order=0;renorm(dd)}save();render();if(ritual)renderRitual();break}
  case'home':document.body.classList.remove('side-open');closeModal();cur=today();go('today');break;
  case'go':document.body.classList.remove('side-open');go(b.dataset.v);break;
  case'mvup':closeModal();swapTask(id,-1);break;
  case'mvdown':closeModal();swapTask(id,1);break;
  case'tobacklog':{const t=T(id);if(t&&t.day){moveTask(id,'backlog');toast('Renvoyée au backlog');if(modalTask===id)openTask(id)}break}
  case'sheetmv':{closeModal();const t=T(id);if(t&&b.dataset.to==='backlog')t.roll=0;let to=b.dataset.to;if(t&&to===addDays(today(),1))to=nextFreeDay(t);moveTask(id,to,true);if(to!=='backlog'&&to>today())putFront([id],T(id).day);save();render();toast(to==='backlog'?'Renvoyée au backlog':to===today()?'Pour aujourd’hui':to===addDays(today(),1)?'Reportée à demain':'Demain est plein : reportée au '+fmtDay(to,{weekday:'long',day:'numeric'}));break}
  case'sum':if(b.closest('#modal'))closeModal();uiOpen=uiOpen===b.dataset.k?'':b.dataset.k;render();break;
  case'freeze':{const d=cur;S.days[d]=Object.assign(S.days[d]||{},{frozen:!(S.days[d]||{}).frozen});save();if(!$('#modal').classList.contains('hidden'))closeModal();render();toast(S.days[d].frozen?'Journée figée : les créneaux ne bougent plus avec l’heure':'Les créneaux suivent à nouveau l’heure');break}
  case'daymenu':dayMenu();break;
  case'estmenu':{const t=T(id);if(t)estMenu(t,b);break}
  case'setest':{const t=T(id);if(t)setEst(t,+b.dataset.v);closePop();break}
  case'ritai':aiRitual();break;
  case'ritapply':{const a=ritual&&ritual.ai&&ritual.ai[ritual.step];if(a){applyItem(a,b.dataset.k);saveRit();renderRitual()}break}
  case'ritapplyall':{const a=ritual&&ritual.ai&&ritual.ai[ritual.step];if(a){propItems(a.prop).forEach(it=>applyItem(a,it.k));saveRit();renderRitual();toast('Suggestions appliquées')}break}
  case'ev2task':{const pre=undoSnap(),t=evToTask(b.dataset.eid);if(t){undoCommit(pre,'ev2task');toast('« '+t.title+' » ajouté comme tâche, à son heure · ⌘/Ctrl Z pour annuler')}else toast('Rendez-vous introuvable : actualise l’agenda');break}
  case'evtoggle':{if(e.target.closest('a'))break;const k=b.dataset.k;S.evMode=S.evMode||{};const ev=Object.values(gEvents).flat().find(x=>evKey(x)===k);const cur0=ev?evFree(ev):false;S.evMode[k]=cur0?'busy':'free';save();render();queueFlow();toast(cur0?'Marqué occupé':'Disponible : les tâches du jour viennent s’y placer');break}
  case'aisplit':{const t=T(id);if(t)aiSplit(t);break}
  case'modalapply':{if(modalAI){applyItem(modalAI,b.dataset.k);openTask(modalTask)}break}
  case'modalapplyall':{if(modalAI){propItems(modalAI.prop).forEach(it=>applyItem(modalAI,it.k));openTask(modalTask)}break}
  case'aiq':sideTab='ai';document.body.classList.add('side-open');aiAsk(b.dataset.q,true);break;
  case'aiapply':{const m=S.chat[+b.dataset.m];if(m)applyItem(m,b.dataset.k);break}
  case'aiapplyall':{const m=S.chat[+b.dataset.m];if(m)propItems(m.prop).forEach(it=>applyItem(m,it.k));toast('Propositions appliquées');break}
  case'aiok':{const t=T(id);if(t&&t.aiSug){if(t.aiSug.channel)t.channel=t.aiSug.channel;if(t.aiSug.est){setEst(t,t.aiSug.est)}t.aiSug=null;save();render()}break}
  case'aino':{const t=T(id);if(t){t.aiSug=null;save();render()}break}
  case'aikey':aiKeyOpen=true;render();setTimeout(()=>{const i=document.querySelector('[data-set="aiKey"]');if(i)i.focus()},30);break;
  case'aiclear':S.chat=[];save();renderSide();toast('Conversation effacée');break;
  case'askclaude':sideTab='ai';closeModal();document.body.classList.add('side-open');aiAsk('Aide-moi à planifier ma journée : ordre, durées, catégories, et ce qui doit être reporté.',true);break;
  case'export':{const blob=new Blob([JSON.stringify(Object.assign({},S,{settings:Object.assign({},S.settings,{aiKey:''})}),null,1)],{type:'application/json'}),u=URL.createObjectURL(blob),l=document.createElement('a');l.href=u;l.download='journee-'+today()+'.json';document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);break}
 }
 if(pre)undoCommit(pre,a);
});
document.addEventListener('toggle',e=>{if(e.target.matches&&e.target.matches('[data-adv]'))advOpen=e.target.open},true);
document.addEventListener('submit',e=>{
 const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();
 if(f.dataset.form==='hours'){const h=x=>{const [a,b]=String(x||'').split(':').map(Number);return isNaN(a)?null:a+(b||0)/60};const hs=h(f.s.value),he=h(f.e.value);if(hs===null||he===null||he<=hs){toast('L’heure de fin doit être après le début');return}const d=today();S.days[d]=Object.assign(S.days[d]||{},{hs,he});save();render();return}
 const inp=f.querySelector('input,textarea'),v=inp.value.trim();if(!v)return;
 const k=f.dataset.form;
 if(k==='add'){const nt=addTask(v,f.dataset.day||null);if(nt&&f.dataset.proj&&!nt.proj){nt.proj=f.dataset.proj;save();render()}const n=document.querySelector(`[data-keep="${inp.dataset.keep}"]`);if(n)n.value='';if(ritual)renderRitual()}
 else if(k==='obj'){S.objectives.push({id:uid(),week:monday(ritual?ritual.day:cur),title:v,done:false});save();render();if(ritual)renderRitual()}
 else if(k==='ai'){inp.value='';aiAsk(v,false);return}
 else if(k==='sub'){const t=T(f.dataset.tid);if(t){t.subtasks.push({id:uid(),t:v,d:false});subShow(t.id);save();if(focusOn)renderFocus();if(modalTask===t.id)openTask(t.id);render()}}
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
 // heures du jour (puce « Il te reste ») : début / fin de cette journée
 if(el.dataset.dh){const d=el.dataset.day,[a,b]=(el.value||'').split(':').map(Number);if(!isNaN(a)){const v=a+(b||0)/60;S.days[d]=Object.assign(S.days[d]||{},el.dataset.dh==='s'?{hs:v,he:typeof (S.days[d]||{}).he==='number'?S.days[d].he:dayHours(d).end}:{he:v,hs:dayHours(d).s});if(flowOn()&&typeof reflow==='function')reflow(d);save();render();toast('Heures du jour : '+hhmm(dayHours(d).s)+' → '+hhmm(dayHours(d).end))}return}
 if(el.hasAttribute('data-ua')){const r=el.closest('[data-uaid]'),u=r&&(S.unavail||[]).find(x=>x.id===r.dataset.uaid);if(u){u[el.dataset.ua]=el.value;save();if(el.dataset.ua!=='label')render()}return}
 if(el.hasAttribute('data-adest')){adKeep();ad.est=+el.value||0;renderAdd();return}
 if(el.hasAttribute('data-adday')){adKeep();ad.day=el.value||null;renderAdd();return}
 if(el.dataset.durset){const t=T(el.dataset.durset);if(t){setEst(t,+el.value||0);if(ritual)renderRitual();render()}return}
 if(el.dataset.jobcal){S.settings.jobCals=Object.assign({},S.settings.jobCals||{},{[el.dataset.jobcal]:el.value});save();render();return}
 if(el.dataset.jh){const dd=el.dataset.d,[a,b2]=String(el.value||'').split(':').map(Number);if(!isNaN(a)){S.days[dd]=Object.assign(S.days[dd]||{},{[el.dataset.jh==='s'?'js':'je']:a+(b2||0)/60});save();render();if(ritual)renderRitual()}return}
 if(el.hasAttribute('data-fedit')){const t=T(el.dataset.fedit);const m=String(el.value).trim().match(/^(?:(\d+)\s*[h:]\s*)?(\d+)?\s*(?:min)?$/i);if(t&&m&&(m[1]||m[2])){const sec=((+m[1]||0)*60+(+m[2]||0))*60;if(S.running&&S.running.taskId===t.id)S.running.start=Date.now();t.actual=sec;save()}focusEdit=null;renderFocus();render();return}
 if(f&&modalTask){const t=T(modalTask);if(!t)return;const r=t.recurId&&S.recurring.find(x=>x.id===t.recurId);
  switch(f){
   case'channel':t.channel=el.value||null;t.aiCat=false;if(r)r.channel=t.channel;if(t.block)pushBlock(t);break;
   case'proj':t.proj=el.value||null;break;
   case'est':setEst(t,+el.value);break;
   case'day':{const nd=allowedDay(t,el.value||null);if(t.block&&ymd(new Date(t.block.start))!==nd)clearBlock(t,true);t.day=nd;if(nd)t.order=nextOrder(nd);break}
   case'time':if(el.value){const[hh,mm]=el.value.split(':').map(Number),dt=parseYmd(t.day||cur);dt.setHours(hh,mm,0,0);t.pinned=true;setBlock(t,dt,true);syncOrder(t.day)}else{t.pinned=false;if(!flowOn())clearBlock(t,true)}break;
   case'obj':t.objId=el.value||null;break;
   case'due':{t.due=el.value||null;if(t.due&&t.day&&t.day>t.due){const nd=t.due<today()?today():t.due;if(t.block&&ymd(new Date(t.block.start))!==nd)clearBlock(t,true);t.day=nd;t.order=nextOrder(nd);toast('Date prévue avancée au '+fmtDay(nd,{weekday:'long',day:'numeric'})+' pour tenir l’échéance')}break}
   case'prio':if((t.prio||'')!==(el.value||'')){t.prio=el.value;placeByPrio(t)}break;
   case'recur':setRecur(t,el.value);break;
   case'recpos':{const r=t.recurId&&S.recurring.find(x=>x.id===t.recurId);if(r){r.pos=el.value;save();toast(el.value==='genie'?'Le Génie la placera là où tu as l’habitude de la mettre':'Les prochaines fois : '+RECPOS[el.value].toLowerCase())}break}
   case'actual':if(S.running&&S.running.taskId===t.id)S.running.start=Date.now();t.actual=Math.max(0,+el.value||0)*60;break;
   default:return;
  }
  save();render();if(['day','time','recur','est','due'].includes(f))openTask(t.id);return;
 }
 if(el.dataset.ritime){const t=T(el.dataset.ritime);if(t){if(el.value){const[hh,mm]=el.value.split(':').map(Number),dt=parseYmd(ritual.day);dt.setHours(hh,mm,0,0);t.pinned=true;setBlock(t,dt,true);syncOrder(ritual.day)}else clearBlock(t,true);save();render();renderRitual()}return}
 if(el.dataset.set){const k=el.dataset.set;if(k==='aiKey'){const v=el.value.trim();aiKeyOpen=false;if(v){S.settings.aiKey=v;save();toast('Clé Claude enregistrée')}render();return}S.settings[k]=(k==='aiAuto'||k==='liveShift'||k==='sounds')?!!el.value:el.type==='number'?+el.value:el.value.trim();if(k==='aiBudget'){const c=document.querySelector('[data-live="aicost"]');if(c)c.textContent=costTxt()}save();if(el.type==='number'||k==='aiKey'||k==='mode')render();return}
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
 if(el.hasAttribute('data-sunsama')&&el.files[0]){try{const st=importSunsama(await el.files[0].text());showModal(`<div class="rit"><h2>Import Sunsama terminé</h2><div class="stat"><div><b>${st.tasks}</b><small>tâches actives ou récentes</small></div><div><b>${st.archive}</b><small>tâches dans l’historique</small></div><div><b>${st.channels}</b><small>catégories créées</small></div></div><p class="lead">${st.recurring} récurrence(s) active(s), ${st.skipped} rituels ignorés${st.dup?', '+st.dup+' déjà importées':''}.</p><div class="mfoot"><span class="sp"></span><button class="pri" data-act="close">Voir ma journée</button></div></div>`);view='today';cur=today();render()}catch(err){toast('Import impossible : '+err.message)}return}
 if(el.hasAttribute('data-import')&&el.files[0]){try{const j=JSON.parse(await el.files[0].text());if(!Array.isArray(j.tasks))throw new Error('format inconnu');S=Object.assign(defaults(),j);S.settings=Object.assign(defaults().settings,j.settings||{});save();render();toast('Sauvegarde importée')}catch(err){toast('Import impossible : '+err.message)}}
});

/* ---------- glisser-déposer ---------- */
function calMinute(z,y){const r=z.getBoundingClientRect();let m=calGeom().st*60+(y-r.top)/PX*60;m=Math.round(m/15)*15;return Math.max(calGeom().st*60,Math.min(24*60-15,m))}
document.addEventListener('dragstart',e=>{const c=e.target.closest('[data-drag]');if(!c)return;drag=c.dataset.drag;try{e.dataTransfer.setData('text/plain',drag);e.dataTransfer.effectAllowed='move'}catch(err){}
 // la tuile reste bien visible sous la souris : copie nette (pas l'original estompé) comme image de glissement
 try{const r=c.getBoundingClientRect(),g=c.cloneNode(true);g.classList.add('dragimg');{const id=(c.dataset.drag||'').split('|')[1];if(msel.size>1&&msel.has(id)){g.classList.add('dragmulti');g.setAttribute('data-n',msel.size)}}g.style.width=r.width+'px';document.body.appendChild(g);e.dataTransfer.setDragImage(g,Math.min(e.clientX-r.left,r.width-10),Math.min(e.clientY-r.top,r.height-6));setTimeout(()=>g.remove(),0)}catch(err){}
 lvStart(c);requestAnimationFrame(()=>{c.classList.add('dragging');const id=drag.split('|')[1];if(drag.startsWith('task|')&&msel.size>1&&msel.has(id))msel.forEach(x=>document.querySelectorAll(`#main .card[data-id="${x}"]`).forEach(k=>k.classList.add('dragging')))})});
document.addEventListener('dragend',()=>{lvEnd();document.querySelectorAll('.dragging,.over,.dropbefore,.dropafter,.dropsub,.subbefore,.subafter').forEach(x=>x.classList.remove('dragging','over','dropbefore','dropafter','dropsub','subbefore','subafter'));document.querySelectorAll('.ghostblk').forEach(g=>g.classList.add('hidden'));drag=null});

/* ---------- glisser-déposer vivant (v2.6) ----------
   Pendant le glisser, la liste du jour s'écarte pour ouvrir la place d'arrivée (le trait reste au milieu de l'espace) ;
   au dépôt, chaque tuile glisse vers sa nouvelle position (FLIP). La logique de dépôt reste celle des marqueurs dropbefore / dropafter / dropsub. */
let LV=null;
const lvMotion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
function lvStart(c){LV=null;if(!drag||!lvMotion())return;const id=drag.split('|')[1];if(msel.size>1&&msel.has(id))return;
 const r=c.getBoundingClientRect(),src=c.matches('.list .card')?c.closest('.list'):null;
 LV={h:Math.max(36,r.height),src,el:src?c:null,list:null,items:[],idx:-1};
 if(src)requestAnimationFrame(()=>{if(LV&&LV.el){c.classList.add('lvcol')}})}
function lvReset(list,anim){if(!list)return;list.classList.remove('lvlive');list.querySelectorAll('.card').forEach(k=>{if(!anim)k.style.transition='none';k.style.transform='';if(!anim)requestAnimationFrame(()=>k.style.transition='')})}
function lvLeave(){if(LV&&LV.list){lvReset(LV.list,true);LV.list.querySelectorAll('.dropbefore,.dropafter,.dropsub').forEach(x=>x.classList.remove('dropbefore','dropafter','dropsub'));LV.list=null;LV.idx=-1}}
function lvEnter(z){lvLeave();LV.list=z;z.classList.add('lvlive');
 const gap=parseFloat(getComputedStyle(z).rowGap)||6,zr=z.getBoundingClientRect();
 LV.items=[...z.querySelectorAll('.card[data-id]')].filter(k=>!k.classList.contains('lvcol')&&k.offsetParent&&!k.closest('.donegrp')).map(k=>{const r=k.getBoundingClientRect();return{el:k,top:r.top-zr.top,bottom:r.bottom-zr.top,mid:(r.top+r.bottom)/2-zr.top}});
 LV.sh=LV.h+(z===LV.src?0:gap);z.style.setProperty('--lvh',LV.sh+'px')}
function lvOver(z,e){
 if(!LV)return false;
 if(!z.matches('#main .list[data-drop^="day:"]')){lvLeave();return false}
 if(LV.list!==z)lvEnter(z);
 const zr=z.getBoundingClientRect(),y=e.clientY-zr.top;
 // sous-tâche : sur la tuile visée (moitié droite, milieu), la liste ne bouge pas
 const card=e.target.closest('.card[data-id]'),subOk=card&&z.contains(card)&&!card.classList.contains('lvcol')&&(drag.startsWith('task|')||drag.startsWith('sub|')&&card.dataset.id!==drag.split('|')[1]);
 if(subOk){const r=card.getBoundingClientRect(),fy=(e.clientY-r.top)/r.height;if(e.clientX>r.left+r.width*.55&&fy>.2&&fy<.8){z.querySelectorAll('.dropbefore,.dropafter').forEach(x=>x.classList.remove('dropbefore','dropafter'));z.querySelectorAll('.dropsub').forEach(x=>{if(x!==card)x.classList.remove('dropsub')});card.classList.add('dropsub');return true}}
 z.querySelectorAll('.dropsub').forEach(x=>x.classList.remove('dropsub'));
 const n=LV.items.length;let idx=LV.items.filter(it=>it.mid<y).length;
 if(idx!==LV.idx){LV.idx=idx;LV.items.forEach((it,i)=>{it.el.style.transform=i>=idx?`translateY(${LV.sh}px)`:'';it.el.classList.remove('dropbefore','dropafter')});
  if(n){if(idx<n)LV.items[idx].el.classList.add('dropbefore');else LV.items[n-1].el.classList.add('dropafter')}}
 return true}
function lvEnd(){if(!LV)return;lvLeave();if(LV.el)LV.el.classList.remove('lvcol');LV=null}
// défilement automatique quand on glisse près du bord
function lvScroll(e){let sc=e.target instanceof Element?e.target:null;while(sc&&sc!==document.body&&sc!==document.documentElement){const o=getComputedStyle(sc).overflowY;if(/(auto|scroll)/.test(o)&&sc.scrollHeight>sc.clientHeight+2)break;sc=sc.parentElement}
 if(!sc||sc===document.body||sc===document.documentElement)sc=document.scrollingElement;
 const r=sc===document.scrollingElement?{top:0,bottom:innerHeight}:sc.getBoundingClientRect(),m=56;
 if(e.clientY<r.top+m)sc.scrollTop-=Math.ceil((r.top+m-e.clientY)/4);else if(e.clientY>r.bottom-m)sc.scrollTop+=Math.ceil((e.clientY-(r.bottom-m))/4);}
// FLIP : après un dépôt, chaque tuile glisse de son ancienne place vers la nouvelle
function lvSnap(e){const m=new Map();document.querySelectorAll('#main .card[data-id]').forEach(k=>{if(!k.classList.contains('lvcol'))m.set(k.dataset.id,k.getBoundingClientRect().top)});return{m,y:e&&e.clientY,id:drag&&drag.split('|')[1]}}
function lvFlip(sn){if(!sn||!lvMotion())return;document.querySelectorAll('#main .card[data-id]').forEach(k=>{const id=k.dataset.id,nt=k.getBoundingClientRect().top;let ot=sn.m.get(id);
 if(ot==null&&id===sn.id&&sn.y!=null)ot=sn.y-k.offsetHeight/2;if(ot==null)return;const dy=ot-nt;if(Math.abs(dy)<1)return;
 k.style.transition='none';k.style.transform=`translateY(${dy}px)`;k.offsetHeight;k.style.transition='transform .22s cubic-bezier(.2,.8,.2,1)';k.style.transform='';k.addEventListener('transitionend',()=>{k.style.transition=''},{once:true})})}
// zone de dépôt : aussi juste au-dessus d'une liste (pour placer en première position)
function dropZone(e){const z=e.target.closest('[data-drop]');if(z)return z;for(const l of document.querySelectorAll('#main .list[data-drop^="day:"]')){const r=l.getBoundingClientRect();if(r.width&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top-56&&e.clientY<r.top)return l}return null}
document.addEventListener('dragover',e=>{
 if(drag&&drag.startsWith('sub|')){const row=e.target.closest('.csub,.sub');document.querySelectorAll('.subbefore,.subafter').forEach(x=>{if(x!==row)x.classList.remove('subbefore','subafter')});
  if(row&&row.dataset.drag&&row.dataset.drag!==drag){e.preventDefault();const r=row.getBoundingClientRect(),cls=e.clientY<r.top+r.height/2?'subbefore':'subafter';row.classList.remove('subbefore','subafter');row.classList.add(cls);return}}
 const z=dropZone(e);if(!z||!drag)return;e.preventDefault();
 document.querySelectorAll('.over').forEach(x=>{if(x!==z)x.classList.remove('over')});z.classList.add('over');
 lvScroll(e);if(lvOver(z,e))return;
 // place d'arrivée : un trait de couleur entre les tuiles
 {const card=e.target.closest('.list .card,.mrow .card'),cur=document.querySelector('.dropbefore,.dropafter,.dropsub');const sub=card&&(drag.startsWith('task|')||drag.startsWith('sub|')&&card.dataset.id!==drag.split('|')[1])&&!(msel.size>1&&msel.has(drag.split('|')[1]));if(card&&z.contains(card)&&!card.classList.contains('dragging')){const r=card.getBoundingClientRect(),fy=(e.clientY-r.top)/r.height,cls=sub&&e.clientX>r.left+r.width*.55&&fy>.2&&fy<.8?'dropsub':fy<.5?'dropbefore':'dropafter';if(cur&&(cur!==card||!cur.classList.contains(cls)))cur.classList.remove('dropbefore','dropafter','dropsub');card.classList.add(cls)}else if(!card&&(z.dataset.drop||'').startsWith('day:')){const n=nearCard(z,e.clientY);if(n){if(cur&&(cur!==n.c||!cur.classList.contains(n.cls)))cur.classList.remove('dropbefore','dropafter','dropsub');n.c.classList.add(n.cls)}}else if(cur&&!(card&&card===cur))cur.classList.remove('dropbefore','dropafter','dropsub')}
 document.querySelectorAll('.ghostblk').forEach(x=>{if(!z.contains(x))x.classList.add('hidden')});const g=z.querySelector('.ghostblk');if(g){if(z.dataset.drop==='cal'){const sp=drag.split('|'),tt=sp[0]!=='todo'&&T(sp[1]),dur=(tt&&tt.est)||30,m=calMinute(z,e.clientY);g.classList.remove('hidden');g.style.top=(m-S.settings.dayStart*60)/60*PX+'px';g.style.height=Math.max(18,dur/60*PX)+'px';g.textContent=pad(Math.floor(m/60))+':'+pad(m%60)+' – '+fmtMin(dur)}else g.classList.add('hidden')}
});
document.addEventListener('drop',async e=>{
 if(drag&&drag.startsWith('sub|')&&subDrop(e))return;
 const z=dropZone(e);if(!z||!drag)return;e.preventDefault();
 {const sn=lvSnap(e);setTimeout(()=>lvFlip(sn),0)}
 const pre=undoSnap();setTimeout(()=>undoCommit(pre,'drop'),0);
 const dz=z.dataset.drop==='today'?'day:'+today():z.dataset.drop,src=drag.split('|');drag=null;z.classList.remove('over');
 let t;
 if(src[0]==='todo'){const x=(todo.tasks[src[1]]||[]).find(x=>x.id===src[2]);if(!x)return;t=importTodo(src[1],x,dz==='backlog'?null:dz.startsWith('day:')?dz.slice(4):(z.dataset.day||cur))}
 else if(src[0]==='sub'){const p=T(src[1]),s=p&&(p.subtasks||[]).find(x=>x.id===src[2]);if(!s)return;
  // sur une autre tâche (moitié droite) : elle y devient sous-tâche
  const hs=e.target.closest('.card.dropsub')||document.querySelector('#main .card.dropsub');if(hs){const q=T(hs.dataset.id);hs.classList.remove('dropsub');if(q&&q!==p){p.subtasks=p.subtasks.filter(x=>x!==s);q.subtasks=q.subtasks||[];q.subtasks.push(s);subShow(q.id);save();render();toast('Sous-tâche déplacée dans « '+q.title+' »');return}}
  // ailleurs : elle devient une tâche à part entière, à l'endroit du dépôt
  p.subtasks=p.subtasks.filter(x=>x!==s);t=mk({title:s.t,done:!!s.d,doneAt:s.d?Date.now():null,channel:p.channel,proj:p.proj||null,day:null});S.tasks.push(t);src[0]='task';src[1]=t.id;toast('« '+s.t+' » est devenue une tâche')}
 else t=T(src[1]);
 if(!t)return;
 {const hs=e.target.closest('.card.dropsub')||document.querySelector('#main .card.dropsub');if(hs&&src[0]==='task'&&hs.dataset.id!==t.id){const p=T(hs.dataset.id);hs.classList.remove('dropsub');if(p){if(t.subtasks&&t.subtasks.length){toast('Cette tâche a déjà des sous-tâches : impossible d’en faire une sous-tâche');render();return}p.subtasks=p.subtasks||[];p.subtasks.push({id:uid(),t:t.title,d:!!t.done});subShow(p.id);deleteTask(t.id);save();render();toast('Devenue sous-tâche de « '+p.title+' » · ⌘/Ctrl Z pour annuler');return}}}
 if(src[0]!=='todo'&&msel.size>1&&msel.has(t.id)){const grp=mselOrdered([...msel]);msel.clear();renderMsel();return dropGroup(grp,z,dz,e)}
 if(dz==='cal'){const dd=z.dataset.day||cur,dt=parseYmd(dd);dt.setMinutes(calMinute(z,e.clientY));t.pinned=true;if(t.day!==dd)t.order=nextOrder(dd);const p=setBlock(t,dt,true);syncOrder(dd);save();render();await p;return}
 if(z.dataset.pz){const to=z.dataset.pz;moveTask(t.id,to);toast(to==='backlog'?'Au backlog':'Repoussée au '+fmtDay(to,{weekday:'long',day:'numeric',month:'short'}));if(ritual)renderRitual();return}
 if(dz==='backlog'){if(t.day!==null){moveTask(t.id,'backlog');toast('Renvoyée au backlog')}else render();return}
 if(dz.startsWith('day:')){
  const day=dz.slice(4),hit=z.querySelector('.card.dropbefore,.card.dropafter')||e.target.closest('.card:not(.lvcol)')||((z.dataset.drop||'').startsWith('day:')&&(nearCard(z,e.clientY)||{}).c)||null,after=hit&&(hit.classList.contains('dropafter')||(!hit.classList.contains('dropbefore')&&!e.target.closest('.card')&&!hit.classList.contains('dropbefore')&&nearCard(z,e.clientY)&&nearCard(z,e.clientY).cls==='dropafter')),before=hit;document.querySelectorAll('.dropbefore,.dropafter').forEach(x=>x.classList.remove('dropbefore','dropafter'));
  if(t.day!==day)moveTask(t.id,day,true);
  if(src[0]==='blk'&&t.block){if(flowOn()){t.pinned=false;toast('Créneau libéré : la tâche suit l’ordre de la liste')}else{clearBlock(t,true);toast('Retiré de l’agenda')}}
  if(before&&before.dataset.id!==t.id){const b=T(before.dataset.id);if(b&&b.day===day){t.order=b.order+(after?.5:-.5);renorm(day)}}
  recLearn(t);
  if(!flowOn()&&reflow(day))toast('Agenda réorganisé selon le nouvel ordre');else if(z.dataset.drop==='today'&&view!=='today')toast('Pour aujourd’hui · ⌘/Ctrl Z pour annuler');
  save();render();
 }
});

/* ---------- glisser au doigt (le glisser HTML ne marche pas au toucher) ----------
   On tire la poignée ⋮⋮ d'une tuile : on rejoue dragstart / dragover / drop / dragend sur les mêmes cibles qu'à la souris. */
(function(){let T0=null;
 const fire=(el,type,x,y,dt)=>{const ev=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(ev,'clientX',{value:x});Object.defineProperty(ev,'clientY',{value:y});Object.defineProperty(ev,'dataTransfer',{value:dt});el.dispatchEvent(ev);return ev};
 const mkDT=()=>{try{return new DataTransfer()}catch(e){const d={};return{setData:(k,v)=>{d[k]=v},getData:k=>d[k]||'',setDragImage(){},effectAllowed:'move',dropEffect:'move',types:[]}}};
 const scroller=el=>{for(let n=el;n&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);if(/(auto|scroll)/.test(cs.overflowY)&&n.scrollHeight>n.clientHeight)return n}return document.scrollingElement};
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const g=e.target.closest('[data-tgrip]'),src=g&&g.closest('[data-drag]');if(!src)return;
  e.preventDefault();try{g.setPointerCapture(e.pointerId)}catch(err){}
  T0={g,src,id:e.pointerId,x:e.clientX,y:e.clientY,on:false,dt:null,ghost:null,over:null,dx:0,dy:0}},{passive:false});
 document.addEventListener('pointermove',e=>{if(!T0||e.pointerId!==T0.id)return;e.preventDefault();const x=e.clientX,y=e.clientY;
  if(!T0.on){if(Math.hypot(x-T0.x,y-T0.y)<5)return;T0.on=true;T0.dt=mkDT();fire(T0.src,'dragstart',x,y,T0.dt);
   const r=T0.src.getBoundingClientRect(),gh=T0.src.cloneNode(true);gh.classList.add('touchghost');gh.classList.remove('dragging');{const id=(T0.src.dataset.drag||'').split('|')[1];if(msel.size>1&&msel.has(id)){gh.classList.add('dragmulti');gh.setAttribute('data-n',msel.size)}}
   gh.style.width=r.width+'px';T0.dx=x-r.left;T0.dy=y-r.top;document.body.appendChild(gh);T0.ghost=gh;document.body.classList.add('touchdrag');try{navigator.vibrate&&navigator.vibrate(10)}catch(err){}}
  T0.ghost.style.transform=`translate(${x-T0.dx}px,${y-T0.dy}px)`;
  const el=document.elementFromPoint(x,y);T0.over=el;if(el)fire(el,'dragover',x,y,T0.dt);
  // défilement automatique près des bords
  const m=70;if(el&&(y<m||y>innerHeight-m)){const sc=scroller(el);if(sc)sc.scrollTop+=y<m?-14:14}},{passive:false});
 const end=(e,cancel)=>{if(!T0||e.pointerId!==T0.id)return;const t=T0;T0=null;if(!t.on)return;e.preventDefault();
  if(t.ghost)t.ghost.remove();document.body.classList.remove('touchdrag');
  const el=cancel?null:document.elementFromPoint(e.clientX,e.clientY);if(el)fire(el,'drop',e.clientX,e.clientY,t.dt);
  fire(t.src.isConnected?t.src:document.body,'dragend',e.clientX,e.clientY,t.dt);
  // le clic qui suit le relâcher ne doit pas ouvrir la tâche
  const stop=ev=>{ev.stopPropagation();ev.preventDefault()};document.addEventListener('click',stop,true);setTimeout(()=>document.removeEventListener('click',stop,true),350)};
 document.addEventListener('pointerup',e=>end(e,false));document.addEventListener('pointercancel',e=>end(e,true));
})();
// carte la plus proche du pointeur dans une liste (dépôt dans un interstice ou sous la dernière)
function nearCard(z,y){const cs=[...z.querySelectorAll('.card[data-id]')].filter(c=>!c.classList.contains('dragging')&&c.offsetParent&&!c.closest('.donegrp'));if(!cs.length)return null;for(const c of cs){const r=c.getBoundingClientRect();if(y<r.top+r.height/2)return{c,cls:'dropbefore'}}return{c:cs[cs.length-1],cls:'dropafter'}}
// glisser plusieurs tâches sélectionnées d'un coup
async function dropGroup(grp,z,dz,e){
 const n=grp.length,ts=grp.map(T);
 if(dz==='cal'){const dd=z.dataset.day||cur,dt=parseYmd(dd);dt.setMinutes(calMinute(z,e.clientY));let at=+dt;
  ts.forEach(t=>{t.pinned=true;if(t.day!==dd){moveTask(t.id,dd,true);t.order=nextOrder(dd)}setBlock(t,new Date(at),true);at+=((t.est||30)*60000)});syncOrder(dd);save();render();toast(n+' tâches placées à la suite');return}
 const to=z.dataset.pz||(dz==='backlog'?'backlog':dz.startsWith('day:')?dz.slice(4):null);if(!to)return;
 if(z.dataset.pz||dz==='backlog'){ts.forEach(t=>{if(to==='backlog')t.roll=0;moveTask(t.id,to,true)});save();render();toast(to==='backlog'?n+' tâches au backlog':n+' tâches repoussées au '+fmtDay(to,{weekday:'long',day:'numeric',month:'short'}));if(ritual)renderRitual();return}
 const day=to,nc=nearCard(z,e.clientY),hit=e.target.closest('.card')||z.querySelector('.card.dropbefore,.card.dropafter')||(nc&&nc.c)||null,after=hit&&(hit.classList.contains('dropafter')||(!hit.classList.contains('dropbefore')&&nc&&nc.c===hit&&nc.cls==='dropafter'));document.querySelectorAll('.dropbefore,.dropafter').forEach(x=>x.classList.remove('dropbefore','dropafter'));
 ts.forEach(t=>{if(t.day!==day)moveTask(t.id,day,true)});
 const b=hit&&!grp.includes(hit.dataset.id)&&T(hit.dataset.id);
 if(b&&b.day===day){const base=b.order+(after?.5:-.5);ts.forEach((t,i)=>t.order=base+(i-n/2)*0.001);renorm(day)}
 if(!flowOn())reflow(day);save();render();toast(n+' tâches déplacées · ⌘/Ctrl Z pour annuler');
}
/* ---------- interactions fluides liste ↔ agenda ---------- */
const KEYS=[['A','Ajouter (une tâche, plusieurs lignes, ou ✦ un plan) · aussi ⌘K'],['G','Le Génie, là où tu es'],['T','Aujourd’hui'],['N','Semaine'],['B','Plus tard'],['H','Habitudes & routines'],['P','Planifier la journée'],['O','Clôturer la journée'],['F','Focus'],['K','Pause du minuteur'],['J','Liste ⇄ grand agenda'],['⇧ Espace','Revenir à aujourd’hui'],['⇧ ← →','Jour précédent / suivant'],['↑ ↓','Choisir une tâche'],['C','Cocher la tâche'],['Espace','Minuteur de la tâche'],['S','La mettre aujourd’hui'],['D','La reporter d’un jour'],['Z','Plus tard (⇧Z : en tête)'],['X','La placer dans l’agenda (⌘X : l’en retirer)'],['Q','Catégorie (⇧Q : celle suggérée)'],['W','Durée prévue'],['E','Temps passé'],['!','Priorité'],['@','Date'],['V','Ajouter une sous-tâche'],['⌘D','Dupliquer'],['⌘ ↑ ↓','Monter / descendre (⇧ : tout en haut / en bas)'],['Entrée','Ouvrir la tâche'],['⌘Z','Annuler'],['⇧L','Mode sombre'],['< >','Masquer / afficher les volets'],['?','Cette liste']];
function showKeys(){showModal(`<div class="rit"><h2>Raccourcis clavier</h2><div class="keys" style="margin-top:12px">${KEYS.map(([k,l])=>`<kbd>${k}</kbd><span>${l}</span>`).join('')}</div><div class="mfoot"><label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-tips ${lsGet('journee.tips')==='off'?'':'checked'} style="width:auto;min-height:0">Rappels réguliers en bas de l’écran</label><span class="sp"></span><button class="pri" data-act="close">OK</button></div></div>`)}
let tipI=0;
function renderTip(){const el=$('#tip');if(!el)return;if(lsGet('journee.tips')==='off'||innerWidth<720){el.innerHTML='';return}const [k,l]=KEYS[tipI%KEYS.length];el.innerHTML=`<span>Raccourci</span><kbd>${k}</kbd><span>${l}</span>`;tipI++}
setInterval(renderTip,20000);setTimeout(renderTip,1500);
function toggleLayout(){layout=layout==='cal'?'tasks':'cal';lsSet('journee.layout',layout);scrolledBig=false;if(view!=='today'&&view!=='week')view='today';if(layout==='cal')sideTab='cal';render();toast(layout==='cal'?'Grand agenda au centre, tâches à droite':'Liste au centre, agenda à droite')}
function closePop(){const p=$('#pop');if(p)p.remove()}
function estMenu(t,el){
 closePop();const r=el.getBoundingClientRect(),p=document.createElement('div');p.id='pop';
 p.className='durpop';p.setAttribute('role','listbox');p.setAttribute('aria-label','Durée estimée');
 p.innerHTML=durOpts(t.est).map(v=>`<button class="durit${t.est===v?' on':''}" role="option" aria-selected="${t.est===v}" data-act="setest" data-id="${t.id}" data-v="${v}">${fmtMin(v)}</button>`).join('');
 document.body.appendChild(p);const w=130;const on=p.querySelector('.on')||p.querySelector('[data-v="30"]');if(on)p.scrollTop=on.offsetTop-p.clientHeight/2+on.offsetHeight/2;p.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';p.style.top=Math.min(innerHeight-p.offsetHeight-8,r.bottom+6)+'px';
}
document.addEventListener('click',e=>{if(!e.target.closest('#pop')&&!e.target.closest('[data-act="estmenu"]'))closePop()},true);
document.addEventListener('mouseover',e=>{
 const el=e.target.closest('.card[data-id],.blk[data-id]');document.querySelectorAll('.hl').forEach(x=>x.classList.remove('hl'));
 if(!el)return;const id=el.dataset.id;document.querySelectorAll(`.card[data-id="${id}"],.blk[data-id="${id}"]`).forEach(x=>{if(x!==el)x.classList.add('hl')});
});
let adz=null;
document.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-adrz]');
 // le créneau entier se glisse aussi (comme une tâche) ; les poignées en haut et en bas changent le début et la fin
 const body=!h&&e.button===0&&!e.target.closest('a,button')?e.target.closest('.ev.allday[data-adday]'):null;if(!h&&!body)return;
 const el=h?h.closest('.ev.allday'):body,d=h?h.dataset.day:body.dataset.adday,sg=(jobSegs(d,true).find(x=>x.allday))||{s:8,e:18};
 if(h){e.preventDefault();e.stopPropagation()}
 adz={el,d,w:h?h.dataset.adrz:'m',y:e.clientY,top:el.offsetTop,h:el.offsetHeight,s:sg.s,e:sg.e};(h||body).setPointerCapture&&(h||body).setPointerCapture(e.pointerId)});
document.addEventListener('pointermove',e=>{if(!adz)return;if(adz.w==='m'&&adz.ns==null&&Math.abs(e.clientY-adz.y)<5)return;const dh=Math.round((e.clientY-adz.y)/PX*4)/4;let s=adz.s,en=adz.e;if(adz.w==='m'){const len=adz.e-adz.s;s=Math.max(0,Math.min(24-len,adz.s+dh));en=s+len;adz.el.classList.add('moving')}else if(adz.w==='s')s=Math.max(0,Math.min(en-.5,adz.s+dh));else en=Math.min(24,Math.max(s+.5,adz.e+dh));adz.ns=s;adz.ne=en;const top=adz.top+(s-adz.s)*PX,hh=(en-s)*PX;adz.el.style.top=top+'px';adz.el.style.height=hh+'px';const sm=adz.el.querySelector('small');if(sm)sm.textContent='journée entière · '+hShort(s)+'–'+hShort(en)});
document.addEventListener('pointerup',()=>{if(!adz)return;const a=adz;adz=null;a.el.classList.remove('moving');if(a.ns==null||(a.ns===a.s&&a.ne===a.e)){return}const pre=undoSnap();S.days[a.d]=Object.assign(S.days[a.d]||{},{ad:{s:a.ns,e:a.ne}});undoCommit(pre,'adjob');save();render();queueFlow();toast('Journée entière : '+hShort(a.ns)+'–'+hShort(a.ne)+' ce jour-là · ⌘/Ctrl Z pour annuler')});
document.addEventListener('dblclick',e=>{const b=e.target.closest('.ev.allday[data-adday]');if(!b)return;const d=b.dataset.adday;if(S.days[d]&&S.days[d].ad){const pre=undoSnap();delete S.days[d].ad;undoCommit(pre,'adjob');save();render();toast('Horaires par défaut rétablis')}});
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
 const cmds=[['Aujourd’hui','go:today'],['Semaine','go:week'],['Braindump','go:dump'],['Backlog et modèles','go:backlog'],['Revue : semaine et projets','go:objectives'],['Projets & Routines','go:projects'],['Arbre des catégories','go:tree'],['Revue : statistiques','go:stats'],['Figer ou libérer la journée','freeze'],['Réglages','go:settings'],['Planifier ma journée','plan'],['Clôturer la journée','shutdown'],['Focus sur la prochaine tâche','focus'],['Inverser liste et grand agenda','layout'],['Planifier la semaine','weekplan'],['Revue de la semaine','weekreview'],['Nouveau modèle','tplnew'],...(S.templates||[]).map(t=>['Appliquer « '+t.name+' » aujourd’hui','tpl:'+t.id])];
 const cmdHit=ql&&cmds.some(([l])=>norm(l).startsWith(ql));
 if(cmdHit)cmds.filter(([l])=>norm(l).includes(ql)).slice(0,6).forEach(([l,k])=>out.push({k,label:l,grp:'Commandes'}));
 if(ql){
  const d=dateWord(ql.replace(/^(aller a|aller au|au|le)\s+/,''));if(d)out.unshift({k:'day:'+d,label:'Aller au '+fmtDay(d),grp:'Aller'});
  out.push({k:'new',label:'Créer la tâche « '+q.trim()+' »',grp:'Créer',hint:'Entrée'});
  out.push({k:'dump',label:'Ajouter au braindump',grp:'Créer'});
  if(aiOn())out.push({k:'ask',label:'Demander à Génie : « '+q.trim()+' »',grp:'Créer'});
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
 if(k==='dump'){S.dump=(S.dump?S.dump.replace(/\s*$/,'')+'\n':'')+q;save();toast('Ajouté au braindump');return}
 if(k==='ask'){sideTab='ai';document.body.classList.add('side-open');return aiAsk(q,false)}
 if(k==='plan')return startRitual('plan',cur);if(k==='shutdown')return startRitual('shutdown',cur>today()?today():cur);if(k==='weekplan')return startRitual('weekplan',cur);if(k==='weekreview')return startRitual('weekreview',cur);
 if(k==='focus'){const t=dayTasks(cur).find(t=>!t.done);return t?openFocus(t.id):toast('Aucune tâche à faire')}
 if(k==='freeze'){const d=cur;S.days[d]=Object.assign(S.days[d]||{},{frozen:!(S.days[d]||{}).frozen});save();render();return toast(S.days[d].frozen?'Journée figée':'Journée libérée')}
 if(k==='layout')return toggleLayout();if(k==='tplnew')return editTpl('');
}
document.addEventListener('input',e=>{if(e.target.id==='palq'&&pal){pal.q=e.target.value;pal.sel=0;renderPal()}});
document.addEventListener('keydown',e=>{
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(ad)closeModal();else{if(!$('#modal').classList.contains('hidden'))closeModal();openAdd(cur)}return}
 if(!pal)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closePal();return}
 if(e.key==='ArrowDown'){e.preventDefault();pal.sel=Math.min(pal.sel+1,(pal.items||[]).length-1);renderPal()}
 else if(e.key==='ArrowUp'){e.preventDefault();pal.sel=Math.max(0,pal.sel-1);renderPal()}
 else if(e.key==='Enter'){e.preventDefault();runPal((pal.items||[])[pal.sel])}
},true);
document.addEventListener('click',e=>{const it=e.target.closest('[data-pal]');if(it&&pal){runPal(pal.items[+it.dataset.pal]);return}if(pal&&e.target.id==='pal')closePal()});

/* ---------- clavier ---------- */
// sélection et rangement au clavier : Maj+↑↓ étend la sélection, ⌘/Ctrl+A tout sélectionner, Alt+↑↓ déplace la tâche, Suppr efface la sélection
document.addEventListener('keydown',e=>{
 if(e.target.matches('input,textarea,select,[contenteditable]')||!$('#modal').classList.contains('hidden')||focusOn)return;
 if(!['today','week','backlog','projects'].includes(view))return;
 const cs=kbCards(),ids=cs.map(c=>c.dataset.id);if(!ids.length)return;
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'){e.preventDefault();ids.forEach(id=>{const t=T(id);if(t&&!t.done)msel.add(id)});renderMsel();return}
 if(e.shiftKey&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();const i=ids.indexOf(kbSel),j=i<0?0:Math.max(0,Math.min(ids.length-1,i+(e.key==='ArrowDown'?1:-1)));if(i>=0)msel.add(ids[i]);msel.add(ids[j]);kbSel=ids[j];mselAnchor=mselAnchor||ids[i<0?j:i];renderMsel();kbShow();return}
 if((e.altKey||e.metaKey||e.ctrlKey)&&(e.key==='ArrowDown'||e.key==='ArrowUp')&&kbSel){e.preventDefault();const t=T(kbSel);if(!t)return;const sib=ids.map(T).filter(x=>x&&x.day===t.day&&!x.done),i=sib.indexOf(t);let j=i+(e.key==='ArrowDown'?1:-1);if(e.shiftKey&&!e.altKey)j=e.key==='ArrowDown'?sib.length-1:0;if(i<0||j<0||j>=sib.length||j===i)return;if(e.shiftKey&&!e.altKey){const pre=undoSnap();t.order=e.key==='ArrowDown'?sib[sib.length-1].order+1:sib[0].order-1;if(t.day){renorm(t.day);recLearn(t);if(!flowOn())reflow(t.day)}undoCommit(pre,'kbmove');save();render();return}const pre=undoSnap();const o=sib[j].order;sib[j].order=t.order;t.order=o;if(t.day){renorm(t.day);recLearn(t);if(!flowOn())reflow(t.day)}undoCommit(pre,'kbmove');save();render();return}
 if((e.key==='Delete'||e.key==='Backspace')&&msel.size&&!e.metaKey){e.preventDefault();const pre=undoSnap();mselAct('del');undoCommit(pre,'mselact');return}
});
document.addEventListener('keydown',e=>{if(e.target.dataset&&e.target.dataset.keep==='ai'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.target.form.requestSubmit()}});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(!$('#modal').classList.contains('hidden'))closeModal();else if(focusOn){focusMin=focusOn;focusOn=null;renderFocus();render()}else document.body.classList.remove('side-open');return}
 if(e.target.matches('input,textarea,select')||focusOn||!$('#modal').classList.contains('hidden'))return;
 if((e.metaKey||e.ctrlKey)&&!(['d','x','enter'].includes(e.key.toLowerCase())&&kbSel))return;
 if(e.altKey)return;
 const k=e.key.toLowerCase();
 if(kbList(e))return;
 if(e.metaKey||e.ctrlKey)return;
 if(e.shiftKey&&e.code==='Space'){e.preventDefault();cur=today();go('today');return}
 if(e.shiftKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){const s=e.key==='ArrowLeft'?-1:1;cur=addDays(cur,s);if(view!=='today')go('today');else{render();daySlide(s)}return}
 if(e.shiftKey&&k==='l'){const dk=document.documentElement.dataset.mode==='dark'||(!document.documentElement.dataset.mode&&matchMedia('(prefers-color-scheme: dark)').matches);S.settings.mode=dk?'light':'dark';applyLook();save();return}
 if(e.key==='<'){paneTog('nav');return}if(e.key==='>'){paneTog('side');return}
 if(k==='a'){e.preventDefault();openAdd(view==='backlog'?null:cur)}
 else if(k==='n')go('week');
 else if(k==='t'){cur=today();go('today')}
 else if(k==='j'){toggleLayout()}
 else if(k==='g'){e.preventDefault();genieHere()}
 else if(k==='h')go('habits');
 else if(k==='k'){if(S.running){stopTimer();render();renderFocus();toast('Pause')}}
 else if(e.key==='?'){showKeys()}
 else if(e.key==='/'){e.preventDefault();openAdd(cur)}
 else if(k==='b')go('backlog');else if(k==='r')go('review');
 else if(k==='p')startRitual('plan',cur);else if(k==='o')startRitual('shutdown',cur>today()?today():cur);
 else if(k==='f'){const t=(kbSel&&T(kbSel)&&!T(kbSel).done)?T(kbSel):dayTasks(cur).find(t=>!t.done);if(t)openFocus(t.id)}
 else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const s=e.key==='ArrowLeft'?-1:1;cur=addDays(cur,(view==='week'||view==='objectives')?7*s:s);render();daySlide(s)}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('brand')){e.preventDefault();e.target.click()}});

// annuler la remise à zéro du minuteur (Ctrl/⌘+Z dans les 10 s)
let timerUndo=null;
document.addEventListener('keydown',e=>{if(e.code!=='Space'||e.target.matches('input,textarea,select,button,[contenteditable]'))return;
 // en grand, ou réduit en pastille (fenêtre fermée) : Espace met en pause et relance
 if(!focusOn&&kbSel&&T(kbSel)&&['today','week','backlog','projects'].includes(view))return;
 const big=focusOn&&!$('#focus').classList.contains('hidden'),mini=!focusOn&&$('#modal').classList.contains('hidden')&&(focusMin||S.running);if(!big&&!mini)return;
 e.preventDefault();const id=big?focusOn:(focusMin||S.running.taskId);if(S.running&&S.running.taskId===id){stopTimer();render()}else startTimer(id);renderFocus();renderMini()});
function undoTimer(){if(!timerUndo)return;const t=T(timerUndo.id);if(t){t.actual=timerUndo.a;if(timerUndo.run)startTimer(t.id);save();renderFocus();render();toast('Minuteur rétabli')}timerUndo=null}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&!e.target.matches('input,textarea')){if(timerUndo&&Date.now()-timerUndo.at<15000)undoTimer();else undoPop();e.preventDefault()}});

// clic droit sur une tâche : le même menu que l'appui long sur téléphone (monter, reporter, backlog, heure…)
document.addEventListener('contextmenu',e=>{const c=e.target.closest('.card[data-id],.blk[data-id]');if(!c||e.target.closest('input,textarea'))return;const t=T(c.dataset.id);if(!t)return;e.preventDefault();taskSheet(t.id)});

// petite récompense visuelle quand une tâche est cochée
function celebrate(id){requestAnimationFrame(()=>{document.querySelectorAll(`[data-id="${id}"] .chk, .chk[data-id="${id}"]`).forEach(c=>{c.classList.remove('burst');void c.offsetWidth;c.classList.add('burst');setTimeout(()=>c.classList.remove('burst'),700)});const r=document.querySelector('.dayring');if(r){r.classList.remove('bump');void r.offsetWidth;r.classList.add('bump')}})}

// cocher à la chaîne : après une coche, la case de la tâche suivante revient exactement sous le curseur
function keepUnder(b){
 const card=b.closest('.card'),list=card&&card.parentElement;if(!card||!list||!$('#main').contains(card))return()=>{};
 const undone=[...list.querySelectorAll(':scope > .card:not(.done)')],ix=undone.indexOf(card),y0=b.getBoundingClientRect().top;
 return ()=>{const nl=$('#main').querySelectorAll('.list > .card:not(.done) .chk'),nx=nl[ix];if(ix<0||!nx)return;
  const d=nx.getBoundingClientRect().top-y0;if(Math.abs(d)<1)return;const m=$('#main');
  if(d>0||m.scrollTop+d>=0){m.scrollTop+=d}else{const l=nx.closest('.list');l.style.paddingTop=(parseFloat(getComputedStyle(l).paddingTop)||0)+(-d-m.scrollTop)+'px';m.scrollTop=0}}
}

// ---------- annuler partout : Ctrl/⌘ Z revient avant la dernière action sur les tâches ----------
const UNDO_ACTS=new Set(['dumptotasks','mselact','rmsheet','toggle','ritdone','rm','mv','sheetmv','rolltomorrow','rolldrop','tobacklog','setprio','setwhere','keep','phare','rollover','dur','setjob','focusdone','focussubdone','subt','subd','projadd','aiapplyall','aiok','refineok']);
let undoStack=[];
const undoSnap=()=>JSON.stringify({tasks:S.tasks,days:S.days,projects:S.projects||[],unavail:S.unavail||[]});
function undoCommit(pre,a){if(undoSnap()===pre)return;undoStack.push({s:pre,a});if(undoStack.length>30)undoStack.shift()}
const UNDO_LBL={ua:'indisponibilité',kbmove:'déplacement',adjob:'journée entière',mselact:'sélection',toggle:'coche',ritdone:'coche',rm:'suppression',rolldrop:'suppression',mv:'déplacement',sheetmv:'déplacement',drop:'déplacement',rolltomorrow:'report',tobacklog:'backlog',setprio:'priorité',setwhere:'lieu',dur:'durée',setjob:'type de journée',focusdone:'tâche terminée',rollover:'report'};
function undoPop(){const u=undoStack.pop();if(!u){toast('Rien à annuler');return}const o=JSON.parse(u.s);S.tasks=o.tasks;S.days=o.days;S.projects=o.projects;if(o.unavail)S.unavail=o.unavail;save();render();if(ritual)renderRitual();toast('Annulé ('+(UNDO_LBL[u.a]||'dernière action')+')')}
// ---------- clavier sur la liste : ↑↓ pour choisir, X ou Espace pour cocher, Entrée pour ouvrir, F pour le focus ----------
let kbSel=null;
function kbCards(){return [...document.querySelectorAll('#main .list > .card[data-id], #main .donegrp[open] .card[data-id]')]}
function kbShow(){document.querySelectorAll('#main .card.kbsel').forEach(c=>c.classList.remove('kbsel'));if(!kbSel)return;const c=document.querySelector(`#main .card[data-id="${kbSel}"]`);if(c){c.classList.add('kbsel');c.scrollIntoView({block:'nearest'})}else kbSel=null}
function kbList(e){if(!['today','week','backlog','projects'].includes(view))return false;const cs=kbCards();if(!cs.length)return false;const ids=cs.map(c=>c.dataset.id),i=ids.indexOf(kbSel);
 if((e.key==='ArrowDown'||e.key==='ArrowUp')&&e.shiftKey)return true;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const s=e.key==='ArrowDown'?1:-1;kbSel=ids[i<0?(s>0?0:ids.length-1):Math.max(0,Math.min(ids.length-1,i+s))];kbShow();return true}
 if(!kbSel||i<0)return false;
 const t=T(kbSel),k=e.key,K=k.toLowerCase(),card=cs[i],keepSel=()=>setTimeout(()=>{const n=kbCards().map(c=>c.dataset.id);if(!n.includes(kbSel))kbSel=n[Math.min(i,n.length-1)]||null;kbShow()},30);
 if(!t)return false;
 const act=(fn,msg)=>{e.preventDefault();const pre=undoSnap();fn();undoCommit(pre,'kb');save();render();if(msg)toast(msg+' · ⌘/Ctrl Z pour annuler');keepSel();return true};
 // Sunsama : C cocher, Espace minuteur, S aujourd'hui, D +1 jour, Z backlog, X agenda, ⌘X hors agenda, Q catégorie, W durée, E temps passé, ! priorité, @ date, V sous-tâche, ⌘D dupliquer, G Génie
 if(K==='c'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();const b=card.querySelector('.chk');if(b)b.click();keepSel();return true}
 if(e.code==='Space'&&!e.shiftKey){e.preventDefault();if(S.running&&S.running.taskId===t.id)stopTimer();else startTimer(t.id);render();renderMini&&renderMini();return true}
 if(K==='s'&&!e.metaKey&&!e.ctrlKey)return act(()=>moveTask(t.id,today(),true),'Aujourd’hui : '+t.title);
 if(K==='d'&&!e.metaKey&&!e.ctrlKey)return act(()=>moveTask(t.id,addDays(t.day&&t.day>=today()?t.day:today(),1),true),'Reportée d’un jour : '+t.title);
 if(K==='z'&&!e.metaKey&&!e.ctrlKey)return act(()=>{moveTask(t.id,'backlog',true);if(e.shiftKey){const o=S.tasks.filter(x=>!x.day&&!x.done&&x!==t).map(x=>x.order||0);t.order=(o.length?Math.min(...o):1)-1}},'Plus tard : '+t.title);
 if(K==='x'&&(e.metaKey||e.ctrlKey))return act(()=>clearBlock(t,true),'Retirée de l’agenda');
 if(K==='x'){e.preventDefault();if(!t.day)moveTask(t.id,cur,true);const pre=undoSnap();t.pinned=false;const n=flowOn()?(reflow(t.day),1):autoBox(t.day);undoCommit(pre,'kb');save();render();toast(n?'Placée dans l’agenda':'Pas de créneau libre assez long');keepSel();return true}
 if(K==='q'&&!e.shiftKey){e.preventDefault();const b=card.querySelector('[data-act="pickcat"]');if(b)b.click();return true}
 if(K==='q'&&e.shiftKey)return act(()=>{const c=catGuess(t.title)||(hasTree()?ruleFor(t.title):null);if(c)t.channel=c},'Catégorie suggérée');
 if(K==='w'){e.preventDefault();const b=card.querySelector('[data-act="estmenu"]');if(b)b.click();return true}
 if(k==='!'){return act(()=>{t.prio=t.prio==='high'?'':t.prio===''?'low':'high'},'Priorité '+({high:'normale','':'basse',low:'haute'})[t.prio||'']);}
 if(K==='e'||k==='@'||K==='v'){e.preventDefault();openTask(t.id);setTimeout(()=>{const sel=K==='e'?'[data-f="actual"],[data-f="act"]':k==='@'?'[data-f="day"]':'[data-keep="sub"],form[data-form="sub"] input';const el=document.querySelector('#modal '+sel);if(el){const d=el.closest('details');if(d)d.open=true;el.focus();if(el.showPicker&&k==='@')try{el.showPicker()}catch(x){}}},60);return true}
 if(K==='d'&&(e.metaKey||e.ctrlKey))return act(()=>{const c=mk(Object.assign({},t,{id:uid(),done:false,doneAt:null,actual:0,block:null,pinned:false,recurId:null,habitId:null,subtasks:(t.subtasks||[]).map(x=>({id:uid(),t:x.t,d:false}))}));c.order=t.order+.5;S.tasks.push(c);if(c.day)renorm(c.day)},'Dupliquée');
 if(K==='g'){e.preventDefault();genieAsk('task','',t.id);return true}
 if(e.key==='Enter'){e.preventDefault();openTask(kbSel);return true}
 if(e.key==='Escape'){kbSel=null;kbShow();return true}
 return false}
document.addEventListener('toggle',e=>{if(e.target.matches&&e.target.matches('[data-donegrp]'))uiDoneOpen=e.target.open},true);
document.addEventListener('input',e=>{if(e.target.matches&&e.target.matches('[data-blf]')){blFilter=e.target.value;blApply()}});
// aperçu de ce que la saisie rapide a compris, sous le champ d'ajout
document.addEventListener('input',e=>{const i=e.target;if(!i.matches||!i.matches('form[data-form="add"] input'))return;const f=i.form;let p=f.querySelector('.qprev');if(!p){p=document.createElement('div');p.className='qprev';f.appendChild(p)}p.innerHTML=quickPreview(i.value)});

// fenêtre d'ajout : garder le titre tapé, Entrée pour ajouter, aperçu en direct
function adKeep(){const i=document.querySelector('[data-adtitle]');if(ad&&i)ad.title=i.value}
document.addEventListener('keydown',e=>{if(e.target.matches&&e.target.matches('[data-adtitle]')&&e.key==='Enter'&&!e.altKey){e.preventDefault();adKeep();addSubmit(e.shiftKey)}},true);
let adT=null;document.addEventListener('input',e=>{if(!e.target.matches||!e.target.matches('[data-adtitle]'))return;adKeep();const p=e.target.parentElement.querySelector('.qprev');if(p)p.innerHTML=quickPreview(e.target.value);clearTimeout(adT);adT=setTimeout(()=>{if(ad&&document.activeElement&&document.activeElement.matches('[data-adtitle]'))renderAdd()},350)});
// ---------- volets : un bouton en haut à gauche (menu) et un en haut à droite (agenda) ----------
function paneTog(which){if(innerWidth<=760){if(which==='side')document.body.classList.toggle('side-open');return}
 const hidden=document.body.classList.contains(which==='nav'?'hidenav':'hideside');lsSet('journee.p'+which,hidden?'show':'hide');applyPanes();scrolledBig=false;render()}

// fermer en cliquant à côté seulement si le clic a aussi COMMENCÉ à côté (une sélection de texte qui déborde ne ferme plus la fenêtre)
let downOnBackdrop=false;document.addEventListener('mousedown',e=>{downOnBackdrop=e.target.id==='modal'},true);

// ---------- multi-sélection : agir sur plusieurs tâches d'un coup ----------
let msel=new Set(),mselAnchor=null,lpMode=false,lpFired=false;
// téléphone : appui long sur une tâche = sélection ; ensuite un simple toucher ajoute ou retire
(function(){let tm=null,st=null;
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey))return;const c=e.target.closest('#main .card[data-id]');if(!c||e.target.closest('.chk,button,input,textarea,select,[data-tgrip]'))return;st={x:e.clientX,y:e.clientY};clearTimeout(tm);tm=setTimeout(()=>{tm=null;lpMode=true;lpFired=true;setTimeout(()=>{lpFired=false},900);msel.add(c.dataset.id);mselAnchor=c.dataset.id;renderMsel();try{navigator.vibrate&&navigator.vibrate(15)}catch(err){}},480)},{passive:true});
 document.addEventListener('pointermove',e=>{if(tm&&st&&Math.hypot(e.clientX-st.x,e.clientY-st.y)>6){clearTimeout(tm);tm=null}},{passive:true});
 document.addEventListener('dragstart',()=>{clearTimeout(tm);tm=null},true);
 ['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>{clearTimeout(tm);tm=null},{passive:true}));
 document.addEventListener('contextmenu',e=>{if(lpFired&&e.target.closest('#main .card[data-id]')){e.preventDefault();e.stopPropagation()}},true);
})();
function mselClick(id,range){
 const ids=[...document.querySelectorAll('#main .card[data-id]')].map(c=>c.dataset.id);
 if(range&&mselAnchor&&ids.includes(mselAnchor)){const a=ids.indexOf(mselAnchor),b=ids.indexOf(id);ids.slice(Math.min(a,b),Math.max(a,b)+1).forEach(x=>msel.add(x))}
 else{if(msel.has(id))msel.delete(id);else msel.add(id);mselAnchor=id}
 renderMsel()}
function renderMsel(){
 [...msel].forEach(id=>{if(!T(id))msel.delete(id)});
 document.querySelectorAll('#main .card.msel').forEach(c=>c.classList.remove('msel'));
 msel.forEach(id=>{const c=document.querySelector(`#main .card[data-id="${id}"]`);if(c)c.classList.add('msel')});
 let bar=$('#mselbar');if(!bar){bar=document.createElement('div');bar.id='mselbar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Actions sur la sélection');document.body.appendChild(bar)}
 if(!msel.size){bar.className='hidden';bar.innerHTML='';return}
 const B=(v,i,l)=>`<button data-act="mselact" data-v="${v}" title="${l}" aria-label="${l}">${ico(i)}<span>${l}</span></button>`;
 bar.className='';
 const tot=[...msel].map(T).filter(Boolean).reduce((x,t)=>x+(t.done?0:(t.est||0)),0);bar.innerHTML=`<b>${msel.size} sélectionnée${msel.size>1?'s':''}${tot?` <small>· ${fmtMin(tot)}</small>`:''}</b>${B('done','check','Cocher')}${B('today','sunrise','Aujourd’hui')}${B('tomorrow','next','Demain')}${B('backlog','tray','Backlog')}${B('top','addtop','En haut')}${B('bottom','addbottom','En bas')}<span class="mselprio">${PRIOS.map(([v,l])=>`<button data-act="mselact" data-v="p:${v}" title="Priorité ${l.toLowerCase()}" aria-label="Priorité ${l.toLowerCase()}">${flagSvg(v)}</button>`).join('')}</span>${B('del','trash','Supprimer')}<button class="mselx" data-act="mselact" data-v="clear" title="Tout désélectionner (Échap)" aria-label="Tout désélectionner">×</button>`}
function mselOrdered(ids){const pos=[...document.querySelectorAll('#main .card[data-id]')].map(c=>c.dataset.id);return ids.filter(id=>T(id)).sort((a,b)=>{const x=pos.indexOf(a),y=pos.indexOf(b);return (x<0?1e9:x)-(y<0?1e9:y)||(T(a).order||0)-(T(b).order||0)})}
function mselMove(ids,top){
 const days=new Set(ids.map(id=>T(id).day));
 days.forEach(day=>{const grp=mselOrdered(ids.filter(id=>T(id).day===day)),all=day==null?S.tasks.filter(t=>t.day==null&&!t.done):dayTasks(day);
  const os=all.map(t=>t.order||0),lo=Math.min(0,...os),hi=Math.max(0,...os);
  grp.forEach((id,i)=>{const t=T(id);t.order=top?lo-grp.length+i:hi+1+i});
  if(day!=null){renorm(day);if(!flowOn()&&reflow(day)){}}});
}
function mselAct(v){
 const ids=[...msel].filter(id=>T(id));if(v==='clear'||!ids.length){msel.clear();lpMode=false;renderMsel();return}
 const n=ids.length;let msg='';
 if(v==='done'){ids.forEach(id=>{const t=T(id);if(!t.done){t.done=true;t.doneAt=Date.now()}});msg=n+' cochée'+(n>1?'s':'')}
 else if(v==='today'){ids.forEach(id=>moveTask(id,today(),true));msg='Pour aujourd’hui'}
 else if(v==='tomorrow'){ids.forEach(id=>moveTask(id,nextFreeDay(T(id)),true));const by={};ids.forEach(id=>{const t=T(id);if(t&&t.day)(by[t.day]=by[t.day]||[]).push(id)});Object.entries(by).forEach(([dd,xs])=>putFront(xs,dd));msg='Reportées'}
 else if(v==='backlog'){ids.forEach(id=>{T(id).roll=0;moveTask(id,'backlog',true)});msg='Au backlog'}
 else if(v==='top'||v==='bottom'){mselMove(ids,v==='top');save();render();renderMsel();toast((v==='top'?'En haut':'En bas')+' · ⌘/Ctrl Z pour annuler');return}
 else if(v.startsWith('p:')){ids.forEach(id=>{T(id).prio=v.slice(2)});msg='Priorité changée'}
 else if(v==='del'){ids.forEach(id=>deleteTask(id));msg=n+' supprimée'+(n>1?'s':'')}
 msel.clear();save();render();renderMsel();toast(msg+' · ⌘/Ctrl Z pour annuler')}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&msel.size&&$('#modal').classList.contains('hidden')){msel.clear();renderMsel()}});

// surprise : une onde douce part de la case cochée et se dissout dans la page
function rippleAt(r){try{if(!r||!r.width||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const o=document.createElement('i');o.className='ripple';o.style.left=(r.left+r.width/2)+'px';o.style.top=(r.top+r.height/2)+'px';document.body.appendChild(o);setTimeout(()=>o.remove(),1200)}catch(e){}}
function ripple(id){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const c=document.querySelector(`#main [data-id="${id}"] .chk`)||document.querySelector(`[data-id="${id}"] .chk`);if(!c)return;const r=c.getBoundingClientRect(),o=document.createElement('i');o.className='ripple';o.style.left=(r.left+r.width/2)+'px';o.style.top=(r.top+r.height/2)+'px';document.body.appendChild(o);setTimeout(()=>o.remove(),1200)}catch(e){}}

// surprise v1.9.3 : en changeant de jour, la journée glisse doucement dans le sens du temps ; les flèches, elles, ne bougent pas
function daySlide(dir){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const els=document.querySelectorAll('#main .summary,#main .addopen,#main .nownext,#main .list,#main .dtxt,#main .head h1,#main .empty,#main .mlist');els.forEach(el=>{el.classList.remove('dslide-l','dslide-r');void el.offsetWidth;el.classList.add(dir<0?'dslide-l':'dslide-r')})}

// Espace depuis la fenêtre d'une tâche : lance le focus sur cette tâche
document.addEventListener('keydown',e=>{if(e.code!=='Space'||e.repeat||$('#modal').classList.contains('hidden')||e.target.matches('input,textarea,select,[contenteditable]'))return;
 const id=$('#sheet .tsheet')?sheetTid:modalTask&&$('#sheet .mhead')?modalTask:null,t=id&&T(id);if(!t||t.done)return;
 e.preventDefault();e.stopImmediatePropagation();closeModal();openFocus(id)},true);

// déposer une sous-tâche sur une autre sous-tâche : réordonner, ou changer de tâche parente
function subDrop(e){const row=e.target.closest('.csub,.sub');if(!row||!row.dataset.drag||row.dataset.drag===drag)return false;
 e.preventDefault();const [,pid,sid]=drag.split('|'),[,qid,rid]=row.dataset.drag.split('|'),p=T(pid),q=T(qid);drag=null;
 const after=row.classList.contains('subafter');document.querySelectorAll('.subbefore,.subafter,.dragging').forEach(x=>x.classList.remove('subbefore','subafter','dragging'));
 const s=p&&(p.subtasks||[]).find(x=>x.id===sid);if(!s||!q)return true;
 const pre=undoSnap();p.subtasks=p.subtasks.filter(x=>x!==s);q.subtasks=q.subtasks||[];let i=q.subtasks.findIndex(x=>x.id===rid);if(i<0)i=q.subtasks.length-1;q.subtasks.splice(after?i+1:i,0,s);
 if(q!==p)subShow(q.id);save();render();if(modalTask&&(modalTask===pid||modalTask===qid))openTask(modalTask);if(focusOn)renderFocus();undoCommit(pre,'drop');return true}

// titre d'une tâche : sur plusieurs lignes si besoin (téléphone), Entrée valide au lieu d'aller à la ligne
function fitTitle(el){el.style.height='auto';el.style.height=el.scrollHeight+'px'}
document.addEventListener('input',e=>{if(e.target.matches&&e.target.matches('textarea.mtitle'))fitTitle(e.target)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('textarea.mtitle')){e.preventDefault();e.target.blur()}});
new MutationObserver(()=>{const t=document.querySelector('#sheet textarea.mtitle');if(t&&!t.dataset.fit){t.dataset.fit=1;requestAnimationFrame(()=>fitTitle(t))}}).observe(document.getElementById('sheet'),{childList:true,subtree:true});
document.addEventListener('pointercancel',()=>{if(adz){adz.el.classList.remove('moving');adz=null;render()}});

// éditeur d'habitude : les champs mettent à jour le brouillon
document.addEventListener('input',e=>{const f=e.target.dataset&&e.target.dataset.hbf;if(!f||!hbDraft)return;const el=e.target;hbDraft[f]=el.type==='checkbox'?el.checked:el.type==='number'||f==='est'?+el.value:el.value;if(el.type==='checkbox')hbEditRender()});
document.addEventListener('change',e=>{const f=e.target.dataset&&e.target.dataset.hbf;if(!f||!hbDraft||e.target.type==='checkbox')return;hbDraft[f]=e.target.type==='number'||f==='est'?+e.target.value:e.target.value});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.hbf==='name'&&hbDraft){e.preventDefault();hbDraft.name=e.target.value;hbSave()}});

/* ---------- réordonner projets, habitudes et modèles (v2.8) : poignée ⋮⋮, la liste se réarrange pendant le geste ---------- */
let SRT=null;
document.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-sgrip]');if(!g||e.button>0)return;const it=g.closest('[data-sid]'),box=it&&it.closest('[data-sort]');if(!box||it.parentElement!==box)return;
 e.preventDefault();SRT={box,it,y0:e.clientY,pid:e.pointerId};it.classList.add('sorting');document.body.classList.add('sortingnow')});
document.addEventListener('pointermove',e=>{if(!SRT||e.pointerId!==SRT.pid)return;e.preventDefault();const {box,it}=SRT;
 it.style.transform=`translateY(${e.clientY-SRT.y0}px)`;
 const sib=[...box.children].filter(x=>x!==it&&x.dataset.sid);
 const before=sib.find(x=>{const r=x.getBoundingClientRect();return e.clientY<r.top+r.height/2});
 const next=before||null;if((next&&it.nextElementSibling===next)||(!next&&it===box.lastElementChild))return;
 const first=new Map(sib.map(x=>[x,x.getBoundingClientRect().top])),top0=it.getBoundingClientRect().top-(e.clientY-SRT.y0);
 box.insertBefore(it,next);
 const top1=it.getBoundingClientRect().top-(e.clientY-SRT.y0);SRT.y0+=top1-top0;it.style.transform=`translateY(${e.clientY-SRT.y0}px)`;
 if(lvMotion())sib.forEach(x=>{const dy=first.get(x)-x.getBoundingClientRect().top;if(!dy)return;x.style.transition='none';x.style.transform=`translateY(${dy}px)`;x.offsetHeight;x.style.transition='transform .18s cubic-bezier(.2,.8,.2,1)';x.style.transform=''})},{passive:false});
function srtEnd(e){if(!SRT||(e&&e.pointerId!==SRT.pid))return;const {box,it}=SRT;SRT=null;it.classList.remove('sorting');document.body.classList.remove('sortingnow');it.style.transform='';
 const ids=[...box.children].map(x=>x.dataset.sid).filter(Boolean),k=box.dataset.sort,pre=undoSnap();
 if(k==='proj')ids.forEach((id,i)=>{const p=(S.projects||[]).find(x=>x.id===id);if(p)p.order=i});
 else if(k==='hab')ids.forEach((id,i)=>{const h=(S.habits||[]).find(x=>x.id===id);if(h)h.order=i+1});
 else if(k==='rec'){const m=new Map(S.recurring.map(r=>[r.id,r]));S.recurring=[...ids.map(id=>m.get(id)).filter(Boolean),...S.recurring.filter(r=>!ids.includes(r.id))]}
 else if(k==='tpl'){const m=new Map((S.templates||[]).map(t=>[t.id,t]));S.templates=[...ids.map(id=>m.get(id)).filter(Boolean),...(S.templates||[]).filter(t=>!ids.includes(t.id))]}
 undoCommit(pre,'sort');save();render()}
document.addEventListener('pointerup',srtEnd);document.addEventListener('pointercancel',srtEnd);
