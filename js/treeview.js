// MyDayBot — vue « Arbre » (diagramme radial éditable), sélecteur de catégorie, suppression avec transfert
let treeFocus=null,treeSel=null,treeMode=null;
const isNarrow=()=>window.innerWidth<760;
/* ---------- disposition radiale ---------- */
function treeLayout(){
 const R=[0,92,190,280];
 const vis=n=>{ // enfants visibles d'un nœud selon le focus
  const ks=kids(n?n.id:null);if(!treeFocus)return ks;
  const f=node(treeFocus);if(!f)return ks;const fp=pathOf(f.id).map(x=>x.id);
  if(!n)return ks;
  if(n.lvl===0)return fp[0]===n.id?ks:[];
  if(n.lvl===1)return f.lvl===0||fp.includes(n.id)?ks:[];
  return ks;
 };
 const leaves=[],items=[];
 (function walk(n,depth,group){const ch=vis(n);if(n){const it={n,depth,kids:[]};items.push(it);if(!ch.length){it.leaf=true;leaves.push({it,group})}}ch.forEach(c=>walk(c,depth+1,depth===0?c.id:group))})(null,0,null);
 // un espace entre deux piliers pour bien séparer les arbres
 let slots=0,prev=null;const pos=new Map();
 for(const l of leaves){if(prev!==null&&l.group!==prev)slots+=0.9;pos.set(l.it,slots);slots+=1;prev=l.group}
 const total=Math.max(slots,1),ang=s=>(s+0.5)/total*2*Math.PI;
 const byId=new Map(items.map(it=>[it.n.id,it]));
 for(let i=items.length-1;i>=0;i--){const it=items[i];
  if(it.leaf)it.a=ang(pos.get(it));else{const cs=items.filter(x=>x.n.parent===it.n.id&&byId.has(x.n.id));it.a=(Math.min(...cs.map(c=>c.a))+Math.max(...cs.map(c=>c.a)))/2;it.span=[Math.min(...cs.map(c=>c.a)),Math.max(...cs.map(c=>c.a))]}
  it.r=R[it.depth];
 }
 return items;
}
const P2=(a,r)=>[r*Math.sin(a),-r*Math.cos(a)];
function treeSvg(){
 const items=treeLayout(),cnt={};
 for(const t of S.tasks)if(!t.done)for(const p of pathOf(t.channel))cnt[p.id]=(cnt[p.id]||0)+1;
 const link=(pa,pr,ca,cr)=>{const [x0,y0]=P2(pa,pr),[x1,y1]=P2(ca,pr),[x2,y2]=P2(ca,cr);return pr?`M${x0},${y0}A${pr},${pr} 0 0 ${ca>pa?1:0} ${x1},${y1}L${x2},${y2}`:`M0,0L${x2},${y2}`};
 const byId=new Map(items.map(it=>[it.n.id,it]));
 let paths='',dots='',labels='';
 for(const it of items){
  const par=it.n.parent?byId.get(it.n.parent):null,col=esc(it.n.color||'#888');
  paths+=`<path d="${link(par?par.a:it.a,par?par.r:0,it.a,it.r)}" stroke="${col}" stroke-width="${[0,3,2,1.4][it.depth]}" fill="none"/>`;
  const [x,y]=P2(it.a,it.r),sel=treeSel===it.n.id;
  dots+=`<g class="tvn${sel?' sel':''}" data-act="tvsel" data-id="${esc(it.n.id)}"><circle cx="${x}" cy="${y}" r="${sel?11:[0,8,6,5][it.depth]+4}" fill="transparent"/><circle cx="${x}" cy="${y}" r="${[0,7,5.5,4.5][it.depth]}" fill="${col}"${sel?' stroke="var(--ink)" stroke-width="2.5"':''}/>${it.leaf&&it.depth<3&&kids(it.n.id).length?`<circle cx="${x}" cy="${y}" r="${[0,12,10][it.depth]}" fill="none" stroke="${col}" stroke-dasharray="3 3"/>`:''}</g>`;
  const name=esc(it.n.name)+(cnt[it.n.id]&&it.depth===3?` · ${cnt[it.n.id]}`:'');
  if(it.leaf){const deg=it.a*180/Math.PI-90,flip=it.a>Math.PI,off=it.r+(it.depth===3?10:16);
   labels+=`<text class="tvl d${it.depth}${sel?' sel':''}" data-act="tvsel" data-id="${esc(it.n.id)}" transform="rotate(${deg}) translate(${off},0)${flip?' rotate(180)':''}" text-anchor="${flip?'end':'start'}" dy="0.33em" fill="${col}">${name}${it.depth<3&&kids(it.n.id).length?' +':''}</text>`}
  else{const [lx,ly]=P2(it.a,it.r);labels+=`<text class="tvl d${it.depth} halo${sel?' sel':''}" data-act="tvsel" data-id="${esc(it.n.id)}" x="${lx}" y="${ly-(it.depth===1?14:11)}" text-anchor="middle" fill="${col}">${esc(it.n.name)}</text>`}
 }
 return `<svg class="tvsvg" viewBox="-530 -500 1060 1000" role="img" aria-label="Arbre des catégories"><circle r="8" fill="var(--mute)"/>${paths}${dots}${labels}</svg>`;
}
/* ---------- panneau d'édition du nœud choisi ---------- */
function tvPanel(){
 const n=node(treeSel);
 if(!n)return `<div class="tvp"><h3>Modifier l’arbre</h3><p class="mute">Clique un point ou un nom pour le modifier. Les boutons du haut déploient un seul arbre en grand.</p><button class="sm" data-act="tvaddpil">+ Pilier</button></div>`;
 const path=pathOf(n.id),act=S.tasks.filter(t=>!t.done&&pathOf(t.channel).some(x=>x.id===n.id)).length,done=allDone().filter(x=>pathOf(x.c).some(p=>p.id===n.id)).length;
 const inh=n.lvl===0?'Agenda par défaut':'Hérite : '+(()=>{const c=nodeCal(n.parent);const g=gCals&&gCals.find(x=>x.id===c);return g?g.name:'agenda par défaut'})();
 const cal=gCals?`<label>Agenda Google<select data-ncal="${esc(n.id)}"><option value="">${esc(inh)}</option>${gCals.filter(c=>c.write).map(c=>`<option value="${esc(c.id)}" ${n.cal===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`:`<p class="mute" style="font-size:13px">${gTok()?(loadCals().then(()=>{if(view==='tree')render()}),'Chargement des agendas…'):'Connecte Google pour choisir un agenda.'}</p>`;
 return `<div class="tvp"><small class="mute">${LVL[n.lvl]}${path.length>1?' · '+path.slice(0,-1).map(p=>esc(p.name)).join(' › '):''}</small>
 <div class="tvrow">${n.lvl===0?`<input type="color" data-nc="${esc(n.id)}" value="${esc(n.color)}" aria-label="Couleur">`:`<span class="dot" style="--c:${esc(n.color)}"></span>`}<input class="tvname" data-nn="${esc(n.id)}" value="${esc(n.name)}" aria-label="Nom"></div>
 ${n.lvl===2?`<label>Raccourci à la saisie<div class="tvkey"><span>#</span><input data-nk="${esc(n.id)}" value="${esc(n.key||'')}" placeholder="ex. natation" aria-label="Raccourci"></div></label>`:''}
 ${cal}
 <p class="mute" style="font-size:13px;margin:8px 0">${act} tâche${act>1?'s':''} en cours · ${done} terminée${done>1?'s':''}</p>
 <div class="tvacts">
  ${n.lvl<2?`<button class="sm" data-act="nodeadd" data-id="${esc(n.id)}">+ ${n.lvl===0?'Domaine':'Catégorie'}</button>`:''}
  ${n.lvl<2&&kids(n.id).length?`<button class="sm" data-act="tvfocus" data-id="${esc(n.id)}">${treeFocus===n.id?'Replier':'Déployer cet arbre'}</button>`:''}
  ${n.lvl?`<button class="sm" data-act="nodemove" data-id="${esc(n.id)}">Déplacer…</button>`:''}
  <button class="sm ghost" data-act="nodeup" data-id="${esc(n.id)}" aria-label="Monter">↑</button><button class="sm ghost" data-act="nodedown" data-id="${esc(n.id)}" aria-label="Descendre">↓</button>
  <span class="sp"></span><button class="sm danger" data-act="nodedelask" data-id="${esc(n.id)}">Supprimer…</button>
 </div></div>`;
}
function viewTree(){
 if(!hasTree())return `<div class="head"><div><h1>Arbre des catégories</h1></div></div><div class="empty">Tes tâches utilisent encore les anciennes catégories Sunsama.<br><button class="pri" data-act="treeask" style="margin-top:10px">Passer à l’arbre</button></div>`;
 const mode=treeMode||(isNarrow()?'list':'map');
 const tabs=`<div class="seg tvtabs"><button class="sm${!treeFocus?' on':''}" data-act="tvfocus" data-id="">Tout</button>${pillars().map(p=>`<button class="sm${treeFocus&&pillarOf(treeFocus)&&pillarOf(treeFocus).id===p.id?' on':''}" data-act="tvfocus" data-id="${esc(p.id)}" style="--c:${esc(p.color)}"><i class="pdot"></i>${esc(p.name)}</button>`).join('')}</div>`;
 const refine=refineCands().length?`<div class="note tvnote"><span>${refineCands().length} tâches ne sont rangées que dans un domaine.</span><button class="sm" data-act="refine" ${aiOn()?'':'disabled title="Ajoute ta clé Claude dans Réglages"'}>Affiner avec Claude</button></div>`:'';
 return `<div class="head"><div><h1>Arbre des catégories</h1><div class="sub">4 piliers → domaines → catégories. La base du futur skill tree.</div></div>
 <div class="acts"><div class="seg"><button class="sm${mode==='map'?' on':''}" data-act="tvmode" data-m="map">Diagramme</button><button class="sm${mode==='list'?' on':''}" data-act="tvmode" data-m="list">Liste</button></div></div></div>
 ${tabs}${refine}
 ${mode==='map'?`<div class="tvwrap"><div class="tvmap">${treeSvg()}</div>${tvPanel()}</div>`:`<div class="tvlist">${tvList()}</div>`}`;
}
function tvList(){
 const ps=treeFocus?[pillarOf(treeFocus)]:pillars();
 const cnt=id=>S.tasks.filter(t=>!t.done&&pathOf(t.channel).some(x=>x.id===id)).length;
 const row=n=>`<div class="tnode l${n.lvl}" data-node="${esc(n.id)}">${n.lvl===0?`<input type="color" data-nc="${esc(n.id)}" value="${esc(n.color)}" aria-label="Couleur">`:`<span class="dot" style="--c:${esc(n.color)}"></span>`}<input class="tname" data-nn="${esc(n.id)}" value="${esc(n.name)}" aria-label="Nom">${n.lvl===2?`<input class="tkey" data-nk="${esc(n.id)}" value="${esc(n.key||'')}" placeholder="raccourci" aria-label="Raccourci #">`:''}<span class="mute tcnt">${cnt(n.id)||''}</span><button class="x" data-act="nodemenu" data-id="${esc(n.id)}" aria-label="Options de ${esc(n.name)}">⋯</button></div>`;
 return `<div class="tree">${ps.map(p=>`<div class="tpil">${row(p)}${kids(p.id).map(d=>`<details class="tdom" ${treeFocus===d.id||ps.length===1?'open':''}><summary>${row(d)}</summary><div class="tcats">${kids(d.id).map(row).join('')}<button class="sm ghost" data-act="nodeadd" data-id="${esc(d.id)}">+ Catégorie</button></div></details>`).join('')}<button class="sm ghost" data-act="nodeadd" data-id="${esc(p.id)}">+ Domaine</button></div>`).join('')}</div>`;
}
function nodeMenu(id){const n=node(id);if(!n)return;treeSel=id;showModal(`<div class="rit"><h2>${esc(n.name)}</h2>${tvPanel()}</div>`)}
/* ---------- suppression : où vont les tâches ? ---------- */
function nodeDelAsk(id){
 const n=node(id);if(!n)return;
 const sub=new Set([id,...S.channels.filter(c=>pathOf(c.id).some(p=>p.id===id)).map(c=>c.id)]);
 const ts=S.tasks.filter(t=>sub.has(t.channel)),ar=(S.archive||[]).filter(a=>sub.has(a.c)),kidsN=sub.size-1;
 const doDel=to=>{
  S.tasks.forEach(t=>{if(sub.has(t.channel)){t.channel=to||null;if(t.block)pushBlock(t)}});(S.archive||[]).forEach(a=>{if(sub.has(a.c))a.c=to||null});
  (S.recurring||[]).forEach(r=>{if(sub.has(r.channel))r.channel=to||null});(S.templates||[]).forEach(tp=>(tp.items||[]).forEach(i=>{if(sub.has(i.channel))i.channel=to||null}));
  S.channels=S.channels.filter(c=>!sub.has(c.id));if(sub.has(treeSel))treeSel=null;if(sub.has(treeFocus))treeFocus=null;treeColors();save();closeModal();closePicker();render();
  toast(`« ${n.name} » supprimé${ts.length+ar.length?` · ${ts.length+ar.length} tâches déplacées${to?' vers '+nodeLabel(to):''}`:''}`);
 };
 if(!ts.length&&!ar.length){showModal(`<div class="rit"><h2>Supprimer « ${esc(n.name)} » ?</h2><p class="lead">${kidsN?`Ses ${kidsN} sous-éléments seront supprimés aussi. `:''}Aucune tâche n’y est rangée.</p><div class="row"><button class="ghost" data-act="close">Annuler</button><span class="sp"></span><button class="danger" data-act="nodedelgo" data-id="${esc(id)}">Supprimer</button></div></div>`);nodeDelGo=()=>doDel(null);return}
 nodeDelGo=null;
 openPicker({title:`Supprimer « ${n.name} »`,lead:`${ts.length} tâche${ts.length>1?'s':''} en cours${ar.length?` et ${ar.length} dans l’historique`:''} y ${ts.length+ar.length>1?'sont rangées':'est rangée'}${kidsN?` (avec ses ${kidsN} sous-éléments)`:''}. Choisis où les déplacer :`,exclude:sub,suggest:n.parent?[n.parent]:[],noneLabel:'Les laisser sans catégorie',confirm:to=>`Supprimer et déplacer vers ${to?nodeLabel(to):'« sans catégorie »'}`,onPick:doDel});
}
let nodeDelGo=null;
/* ---------- sélecteur de catégorie (tâche, déplacement, suppression) ---------- */
let pick=null;
function recentCats(){const seen=[];for(const t of [...S.tasks].sort((a,b)=>(b.u||0)-(a.u||0))){if(t.channel&&node(t.channel)&&node(t.channel).lvl===2&&!seen.includes(t.channel))seen.push(t.channel);if(seen.length>=6)break}return seen}
function openPicker(o){pick=Object.assign({q:'',exclude:new Set(),suggest:[],levels:[1,2]},o);renderPicker();setTimeout(()=>{const i=document.querySelector('#pickov .pkq');if(i&&!isNarrow())i.focus()},30)}
function closePicker(){pick=null;const ov=document.getElementById('pickov');if(ov)ov.remove()}
function pickMatches(n){if(!pick.q)return true;const q=norm(pick.q);return pathOf(n.id).some(p=>norm(p.name).includes(q))||norm(n.key||'').startsWith(q)}
function renderPicker(){
 let ov=document.getElementById('pickov');if(!pick){if(ov)ov.remove();return}
 if(!ov){ov=document.createElement('div');ov.id='pickov';ov.addEventListener('click',e=>{if(e.target===ov)closePicker()});document.body.appendChild(ov)}
 const ok=n=>!pick.exclude.has(n.id)&&pick.levels.includes(n.lvl);
 const chip=(id,extra)=>{const n=node(id);if(!n)return '';return `<button class="pkc${pick.sel===id?' on':''}${pick.current===id?' cur':''}" data-act="pkpick" data-id="${esc(id)}" style="--c:${esc(n.color)}">${extra||esc(n.name)}</button>`};
 const sug=[...new Set([...(pick.suggest||[]),...(pick.levels.includes(2)?recentCats():[])])].filter(id=>node(id)&&ok(node(id))&&id!==pick.current).slice(0,7);
 const cols=pillars().map(p=>{const ds=kids(p.id).map(d=>{const cs=kids(d.id).filter(c=>ok(c)&&pickMatches(c));const dOk=ok(d)&&pickMatches(d);if(!cs.length&&!dOk)return '';
   return `<div class="pkdom">${ok(d)?`<button class="pkdh" data-act="pkpick" data-id="${esc(d.id)}" style="--c:${esc(d.color)}">${esc(d.name)}${pick.levels.includes(2)&&kids(d.id).length?' <small>tout le domaine</small>':''}</button>`:`<div class="pkdh off" style="--c:${esc(d.color)}">${esc(d.name)}</div>`}<div class="pkcs">${cs.map(c=>chip(c.id)).join('')}</div></div>`}).join('');
  const pOk=ok(p)&&pickMatches(p);if(!ds&&!pOk)return '';
  return `<div class="pkcol"><div class="pkph" style="--c:${esc(p.color)}">${pOk?`<button data-act="pkpick" data-id="${esc(p.id)}">${esc(p.name)}</button>`:esc(p.name)}</div>${ds}</div>`}).join('');
 const sel=pick.sel!==undefined;
 ov.innerHTML=`<div class="pk" role="dialog" aria-label="${esc(pick.title||'Choisir une catégorie')}"><div class="pkhead"><b>${esc(pick.title||'Choisir une catégorie')}</b><button class="x" data-act="pkclose" aria-label="Fermer">×</button></div>
 ${pick.lead?`<p class="mute pklead">${esc(pick.lead)}</p>`:''}
 <input class="pkq" placeholder="Rechercher (ex. nata, villette, ménage)…" value="${esc(pick.q)}" aria-label="Rechercher une catégorie" autocomplete="off">
 ${sug.length&&!pick.q?`<div class="pksug"><small class="mute">Suggestions</small>${sug.map(id=>chip(id,esc(nodeLabel(id)))).join('')}</div>`:''}
 <div class="pkgrid">${cols||'<p class="mute">Aucune catégorie ne correspond.</p>'}</div>
 <div class="pkfoot">${pick.noneLabel!==false?`<button class="sm ghost${pick.sel===null?' on':''}" data-act="pkpick" data-id="">${esc(pick.noneLabel||'Sans catégorie')}</button>`:''}<span class="sp"></span>${pick.confirm?`<button class="pri" data-act="pkok" ${sel?'':'disabled'}>${esc(sel?pick.confirm(pick.sel):'Choisis une destination')}</button>`:''}</div></div>`;
}
function pickChoose(id){
 if(!pick)return;id=id||null;
 if(pick.confirm){pick.sel=id;renderPicker();return}
 const f=pick.onPick;closePicker();f(id);
}
document.addEventListener('input',e=>{if(e.target.classList&&e.target.classList.contains('pkq')&&pick){pick.q=e.target.value;const pos=e.target.selectionStart;renderPicker();const i=document.querySelector('#pickov .pkq');if(i){i.focus();i.setSelectionRange(pos,pos)}}});
document.addEventListener('keydown',e=>{if(!pick)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePicker()}else if(e.key==='Enter'&&e.target.classList.contains('pkq')){e.preventDefault();const b=document.querySelector('#pickov .pkgrid .pkc')||document.querySelector('#pickov .pkgrid [data-act="pkpick"]');if(b)pickChoose(b.dataset.id)}},true);
// catégorie d'une tâche
function pickTaskCat(id,reopen){
 const t=T(id);if(!t)return;const g=ruleFor(t.title);
 openPicker({title:'Catégorie de « '+t.title+' »',current:t.channel,suggest:[g,t.aiSug&&t.aiSug.channel].filter(Boolean),noneLabel:'Sans catégorie',onPick:to=>{t.channel=to;t.aiCat=false;t.aiSug=null;if(t.block)pushBlock(t);save();if(reopen)openTask(id);else render()}});
}
