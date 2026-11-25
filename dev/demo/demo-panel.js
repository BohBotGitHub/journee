// Démo Diem : panneau « à tester » (n'existe pas dans la vraie appli)
(function(){
 const ITEMS=[
  ['Refonte visuelle','Cartes en relief, couleur d’accent sur ce qui est actif, titres et agenda retravaillés, fenêtres sur fond flouté. Regarde en clair et en sombre (Réglages › Mode).','today'],
  ['Arbre en grand','Le diagramme prend toute la place. Molette ou pincement pour zoomer, glisser pour te déplacer, boutons − + ⤢ en haut à gauche. Clique un nom : la fenêtre de modification flotte par-dessus (× pour la fermer).','tree'],
  ['Tri et filtre du backlog','Boutons Catégorie, Échéance, Priorité, Durée, Récentes, Anciennes ; champ « Filtrer » dès 7 tâches.','backlog'],
  ['Sous-tâche par glisser','Glisse une tâche sur la moitié droite d’une autre : elle devient sa sous-tâche (Annuler dans le message).','today'],
  ['Journée entière ajustable','Agenda de droite, 3 jours plus loin : tire le haut ou le bas du bloc Mvision ; double-clic pour revenir à 8 h–18 h.','mvision'],
  ['Clavier et sélection','Maj + ↑↓ étend la sélection, ⌘/Ctrl A tout sélectionner, Alt + ↑↓ monte ou descend la tâche choisie, Suppr efface la sélection. La barre affiche la durée totale.','today'],
  ['Appui long (souris et téléphone)','Reste appuyé une demi-seconde sur une tâche sans bouger : elle est sélectionnée ; ensuite un simple clic ou toucher ajoute ou retire. × ou Échap pour sortir.','today'],
  ['Croix du clic droit','Clic droit sur une tâche : une × en haut à droite ferme le menu.','today'],
  ['Annuler d’un clic','Les messages « annulable » ont maintenant un bouton Annuler (utile sur téléphone).','today'],
  ['Sous-tâches dépliables (nouveau)','Sur « Préparer la séance de JDR », clique « 1/3 sous-tâches » : elles se déplient sous la tâche et se cochent directement.','today'],
  ['Thème clair','Réglages › Mode › Clair : la page entière passe en clair, même si ton appareil est en sombre. Dis-moi ce que tu vois si ça ne marche pas.','settings'],
  ['Indisponibilités récurrentes (nouveau)','Réglages › Indisponibilités récurrentes : nom, jours, horaires. Diem ne place rien dessus et les montre hachurées dans l’agenda (la démo a un déjeuner en semaine et un cours de piano le mercredi).','settings'],
  ['Arbre étoile','Orbites, une couleur douce par pilier, un cœur lumineux, des domaines aux teintes bien distinctes, et les catégories grossissent avec le nombre de tâches en cours.','tree'],
  ['Déposer sur Aujourd’hui','Glisse une tâche du backlog sur « Aujourd’hui » dans la barre de gauche.','backlog']];
 const K='journee.demo27.checks';let st={};try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
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
  if(k==='today'){window.journee&&location.hash!=='#today'&&(location.hash='#today');document.querySelector('#nav [data-view="today"]').click()}
  if(k==='future'){document.querySelector('#nav [data-view="today"]').click()}
  if(k==='mvision'){document.querySelector('#nav [data-view="today"]').click();setTimeout(()=>{cur=addDays(today(),3);render()},120)}
  if(k==='backlog')document.querySelector('#nav [data-view="backlog"]').click();
  if(k==='tree')document.querySelector('#nav [data-view="tree"]').click();
  if(k==='add'){document.querySelector('#nav [data-view="today"]').click();setTimeout(()=>{const i=document.querySelector('#main form.add input');if(i)i.focus()},100)}
  if(k==='picker'){document.querySelector('#nav [data-view="today"]').click();setTimeout(()=>{const c=document.querySelector('#main .chip.pc');if(c)c.click()},150)}
  if(k==='projects')document.querySelector('#nav [data-view="projects"]').click();
  if(k==='review')document.querySelector('#nav [data-view="review"]').click();
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
  if(d==='reset'){['journee.v1','journee.demo','journee.demo27.checks'].forEach(k=>localStorage.removeItem(k));location.reload()}});
 draw();
})();
