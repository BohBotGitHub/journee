// tests automatisés : pas d'animation des volets (les mesures se font tout de suite)
if(navigator.webdriver)document.documentElement.classList.add('notrans');
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
(function(){const r=document.documentElement,K='journee.sidew',set=w=>{w=Math.max(240,Math.min(Math.round(innerWidth*0.6),w));r.style.setProperty('--sidew',w+'px');r.style.setProperty('--sidewr',w+'px');return w};
 const v=+lsGet(K);if(v)set(v);
 document.addEventListener('pointerdown',e=>{const g=e.target.closest&&e.target.closest('.sidegrip');if(!g)return;e.preventDefault();g.setPointerCapture(e.pointerId);document.body.classList.add('sizing');
  const MINW=240,mv=ev=>{const w=innerWidth-ev.clientX;document.body.classList.toggle('sidecollapse',w<MINW);set(w)},w0=+lsGet(K)||0,up=ev=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);document.body.classList.remove('sizing','sidecollapse');const w=innerWidth-ev.clientX;
   // glissé sous la taille minimale : le volet se replie (on garde la largeur d'avant pour sa réouverture)
   if(w<MINW){if(w0)set(w0);else{r.style.removeProperty('--sidew');r.style.removeProperty('--sidewr')}lsSet('journee.pside','hide');applyPanes();if(typeof render==='function')render();return}
   lsSet(K,String(set(w)))};
  g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up)});
 document.addEventListener('dblclick',e=>{if(e.target.closest&&e.target.closest('.sidegrip')){r.style.removeProperty('--sidew');lsDel(K)}});
})();

// volets : ton choix (bouton) l'emporte ; sinon ils se cachent tout seuls quand la fenêtre est trop étroite
function applyPanes(){const b=document.body;if(innerWidth<=760){b.classList.remove('hidenav','hideside');return}
 const sw=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidew'))||300,MIN=520,ps=lsGet('journee.pside'),pn=lsGet('journee.pnav');
 // quand la place manque, le menu de gauche se replie d'abord en rail d'icônes (64 px), l'agenda de droite ensuite
 const autoS=innerWidth-64-sw>=MIN,showS=ps==='show'||(ps!=='hide'&&autoS),showN=pn==='show'||(pn!=='hide'&&innerWidth-(showS?sw:0)-196>=MIN);
 b.classList.toggle('hideside',!showS);b.classList.toggle('hidenav',!showN)}
applyPanes();
let paneW=innerWidth;addEventListener('resize',()=>{if(Math.abs(innerWidth-paneW)>40){lsDel("journee.pside");lsDel("journee.pnav");paneW=innerWidth}applyPanes()});
