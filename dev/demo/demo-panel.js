// Démo Diem : panneau « à tester » (n'existe pas dans la vraie appli)
(function(){
 const ITEMS=[
  ['Relié à Claude','Réglages › « Claude : tes conversations » : une fois relié, ce que tu demandes dans une conversation Claude (« ajoute ça dans Diem », plan d’attaque) arrive ici ; les suggestions arrivent dans l’onglet du Génie. Inactif dans la démo.','settings'],
  ['Focus Lampe','Lance le focus sur une tâche (▶) : la lampe du Génie, l’anneau doré se remplit avec le temps prévu, une volute de fumée par sous-tâche faite.','today'],
  ['Page Habitudes','Menu › Habitudes : une carte par habitude avec la grille du mois (clique un jour pour le cocher), la série et la force (0–100 %).','habits'],
  ['Nouvelle habitude','« Nouvelle habitude » : nom, à prendre ou à arrêter, fréquence (tous les jours, certains jours, X fois par semaine), catégorie, icône, et « la placer comme une tâche ».','habits'],
  ['Pastilles du jour','En haut d’Aujourd’hui : jusqu’à 6 pastilles ; un clic coche l’habitude du jour.','today'],
  ['Tâche liée','Une habitude « placée dans ma journée » devient une tâche les jours prévus ; cocher la tâche coche l’habitude (et l’inverse).','habits'],
  ['X fois par semaine','Natation › Modifier : coche « la proposer chaque jour » ; la tâche revient chaque jour tant que l’objectif de la semaine n’est pas atteint.','habits'],
  ['Revue de la semaine','••• › Revoir la semaine : nouvelle étape « Habitudes » avec Garder, Alléger (plus court ou moins souvent) et Pause.','today'],
  ['Statistiques','Statistiques, tout en bas : la force de chaque habitude sur 3 mois.','stats'],
  ['Menu et Braindump','Menu : Aujourd’hui, Semaine, Braindump, Habitudes, Backlog, Projets, Arbre, Statistiques. Sur téléphone, Habitudes est dans « Plus ».','today']];
 const K='journee.demo61.checks';let st={};try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
 const save=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}};
 const box=document.createElement('div');box.id='demopanel';document.body.appendChild(box);
 const css=document.createElement('style');css.textContent=`body:has(#mselbar:not(.hidden)) #demopanel{bottom:190px}#demopanel{position:fixed;right:12px;bottom:12px;z-index:90;width:min(360px,calc(100vw - 24px));max-height:min(70vh,560px);display:flex;flex-direction:column;background:var(--panel);color:var(--ink);border:2px solid #c2410c;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.2);font-size:14px}
 #demopanel.min{width:auto;max-height:none}#demopanel.min .dpbody{display:none}
 #demopanel .dph{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line);cursor:pointer}#demopanel.min .dph{border:0}
 #demopanel .dph b{flex:1}#demopanel .dpbody{overflow:auto;padding:6px 12px 12px}
 #demopanel .it{padding:8px 0;border-bottom:1px solid var(--line)}#demopanel .it:last-child{border:0}
 #demopanel .it b{display:block;margin-bottom:2px}#demopanel .it p{margin:0 0 6px;color:var(--mute);font-size:13px;line-height:1.4}
 #demopanel .row2{display:flex;gap:6px;flex-wrap:wrap}#demopanel button{min-height:32px;font-size:13px;padding:4px 10px}
 #demopanel .ok{background:#1f7a4f;border-color:#1f7a4f;color:#fff}#demopanel .ko{background:#b4232c;border-color:#b4232c;color:#fff}
 #demopanel .tag{font-size:12px;border-radius:99px;padding:1px 8px;background:var(--panel2);color:var(--mute)}
 @media (max-width:760px){#demopanel{bottom:70px}}`;document.head.appendChild(css);
 let min=window.innerWidth<760;
 function show(k){
  if(['habits','stats','week','settings','dump'].includes(k)){if(typeof go==='function')go(k);return}
  if(k==='today'){window.journee&&location.hash!=='#today'&&(location.hash='#today');document.querySelector('#nav [data-view="today"]').click()}
  if(k==='future'){document.querySelector('#nav [data-view="today"]').click()}
  if(k==='mvision'){document.querySelector('#nav [data-view="today"]').click();setTimeout(()=>{cur=addDays(today(),3);render()},120)}
  if(k==='backlog')document.querySelector('#nav [data-view="backlog"]').click();
  if(k==='tree')document.querySelector('#nav [data-view="tree"]').click();
  if(k==='add'){document.querySelector('#nav [data-view="today"]').click();setTimeout(()=>{const i=document.querySelector('#main form.add input');if(i)i.focus()},100)}
  if(k==='picker'){document.querySelector('#nav [data-view="today"]').click();setTimeout(()=>{const c=document.querySelector('#main .chip.pc');if(c)c.click()},150)}
  if(k==='projects')document.querySelector('#nav [data-view="projects"]').click();
  if(k==='review')document.querySelector('#nav [data-view="review"]').click();
  if(k==='mail'){sideTab='ai';if(window.innerWidth<760){document.body.classList.add('side-open')}else{lsSet('journee.pside','show');applyPanes()}renderSide()}
  if(k==='cal'){document.querySelector('#nav [data-view="today"]').click();sideTab='cal';if(window.innerWidth<760){document.body.classList.add('side-open')}else{lsSet('journee.pside','show');applyPanes()}renderSide()}
  if(k==='settings')document.querySelector('#nav [data-view="settings"]').click();
  if(k==='shutdown')startRitual('shutdown',today());
  if(k==='plan')startRitual('plan',today());
  if(window.innerWidth<760){min=true;draw()}
 }
 function draw(){
  const n=Object.values(st).filter(v=>v==='ok').length,pb=Object.values(st).filter(v=>v==='ko').length;
  box.className=min?'min':'';
  box.innerHTML=`<div class="dph" data-d="tog"><b>Démo · à tester (${n}/${ITEMS.length} ✓${pb?' · '+pb+' ✗':''})</b><span class="tag">${min?'Ouvrir':'Réduire'}</span></div>
  <div class="dpbody"><p style="margin:6px 0;font-size:13px;color:var(--mute)">Version de test avec des tâches fictives. Teste chaque point, puis dis-moi dans la conversation ce qui va ou pas.</p>
  ${ITEMS.map(([t,p,k],i)=>`<div class="it"><b>${i+1}. ${t} ${st[i]==='ok'?'✓':st[i]==='ko'?'✗':''}</b><p>${p}</p><div class="row2"><button data-d="show" data-k="${k}">Montrer</button><button class="${st[i]==='ok'?'ok':''}" data-d="ok" data-i="${i}">Ça me va</button><button class="${st[i]==='ko'?'ko':''}" data-d="ko" data-i="${i}">Pas bon</button></div></div>`).join('')}
  <div class="row2" style="margin-top:8px"><button data-d="reset">Remettre la démo à zéro</button></div></div>`;
 }
 box.addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(!b)return;e.stopPropagation();const d=b.dataset.d;
  if(d==='tog'){min=!min;draw()}
  if(d==='show')show(b.dataset.k);
  if(d==='ok'||d==='ko'){const i=b.dataset.i;st[i]=st[i]===d?undefined:d;save();draw()}
  if(d==='reset'){['journee.v1','journee.demo','journee.demo61.checks'].forEach(k=>localStorage.removeItem(k));location.reload()}});
 draw();
})();
