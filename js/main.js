// Diem — démarrage
/* ---------- démarrage ---------- */
const treePending=ensureTree();
genRecurring();
render();
runFlow(); // les fonctions des autres modules n'existaient pas encore pendant l'initialisation des données
if(S.running&&T(S.running.taskId))renderRun();
if(msOn()&&S.settings.msClientId)setTimeout(syncTodo,1500);
setTimeout(()=>{if(!gTok())gSilent();driveSync()},300);
setTimeout(aiMorning,1500);
// migration vers l'arbre : après la première synchro (un autre appareil l'a peut-être déjà faite)
if(treePending)setTimeout(()=>{if(ensureTree()&&$('#modal').classList.contains('hidden'))showModal(treeMigrationHtml());else{render()}},gTok()?3500:500);
{const d0=today(),i0=S.days[d0]||{},h0=new Date().getHours()+new Date().getMinutes()/60;if(!i0.planned&&lsGet('journee.ritauto')!==d0&&h0>=4&&h0<S.settings.workEnd&&!savedRit()){lsSet('journee.ritauto',d0);setTimeout(()=>{if(!ritual&&$('#modal').classList.contains('hidden')&&!navigator.webdriver)startRitual('plan',d0)},900)}}
{const r=savedRit();if(r&&Date.now()-r.at<3*3600e3&&r.day>=today()){cur=r.day;setTimeout(()=>{if(!ritual&&$('#modal').classList.contains('hidden')){ritual=r;renderRitual()}},400)}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){setTimeout(gSilent,800);liveTick();driveSync();if(msOn())syncTodo();if(gTok()){gEvents={};render()}}});
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').catch(()=>{})}

// volet de droite : largeur réglable à la souris, gardée sur cet appareil
(function(){const r=document.documentElement,K='journee.sidew',set=w=>{w=Math.max(260,Math.min(Math.round(innerWidth*0.55),w));r.style.setProperty('--sidew',w+'px');return w};
 const v=+lsGet(K);if(v)set(v);
 document.addEventListener('pointerdown',e=>{const g=e.target.closest&&e.target.closest('.sidegrip');if(!g)return;e.preventDefault();g.setPointerCapture(e.pointerId);document.body.classList.add('sizing');
  const mv=ev=>set(innerWidth-ev.clientX),up=ev=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);document.body.classList.remove('sizing');lsSet(K,String(set(innerWidth-ev.clientX)))};
  g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up)});
 document.addEventListener('dblclick',e=>{if(e.target.closest&&e.target.closest('.sidegrip')){r.style.removeProperty('--sidew');lsDel(K)}});
})();
