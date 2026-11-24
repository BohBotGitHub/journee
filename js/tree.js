// MyDayBot — arbre des catégories : 4 piliers → domaines → catégories (→ compétences, plus tard)
// Les nœuds vivent dans S.channels (lvl 0 = pilier, 1 = domaine, 2 = catégorie) : t.channel pointe vers un nœud.
const TREE=[
 ['etre','Être','#1d9e75',[
  ['corps','Corps',[['callisthenie','Callisthénie'],['natation','Natation'],['mobilite','Mobilité'],['alimentation','Alimentation saine'],['soins','Sommeil & soins'],['routines','Routines']]],
  ['equilibre','Équilibre',[['meditation','Méditation & respiration'],['journal','Journal']]]]],
 ['grandir','Grandir','#7f77dd',[
  ['savoir','Savoir',[['lecture','Lecture'],['presse','Presse'],['langues','Langues']]],
  ['creation','Création',[['piano','Piano'],['vj','VJing'],['art','Art']]],
  ['jeu','Jeu',[['jdr','MJ de JDR'],['magic','Magic'],['lego','LEGO']]]]],
 ['relier','Relier','#d4537e',[
  ['liens','Liens',[['famille','Famille'],['amis','Amis'],['evenements','Événements']]],
  ['engagement','Engagement',[['militantisme','Militantisme'],['caritatif','Caritatif'],['citoyennete','Citoyenneté']]]]],
 ['batir','Bâtir','#378add',[
  ['metier','Métier',[['villette','La Villette'],['stardust','Stardust'],['formation','Formation']]],
  ['foyer','Foyer',[['menage','Ménage'],['courses','Courses'],['cuisine','Cuisine'],['bricolage','Bricolage'],['jardin','Jardin'],['deco','Déco & aménagement']]],
  ['gestion','Gestion',[['admin','Administratif'],['budget','Budget & épargne'],['organisation','Organisation']]]]]];
const LVL=['Pilier','Domaine','Catégorie'];
const hasTree=()=>S.channels.some(c=>c.lvl!==undefined);
const node=id=>S.channels.find(c=>c.id===id);
const kids=id=>S.channels.filter(c=>(c.parent||null)===(id||null)&&c.lvl!==undefined).sort((a,b)=>(a.o||0)-(b.o||0));
const pillars=()=>kids(null).filter(c=>c.lvl===0);
function pathOf(id){const out=[];let n=node(id),g=0;while(n&&g++<6){out.unshift(n);n=n.parent?node(n.parent):null}return out}
const pillarOf=id=>pathOf(id)[0]||null;
const domainOf=id=>pathOf(id)[1]||null;
// libellé affiché : « Domaine › Catégorie » (ou le nom seul d'un pilier / domaine / ancien canal)
function nodeLabel(id){const p=pathOf(id);if(!p.length)return '';if(p.length>=3)return p[1].name+' › '+p[p.length-1].name;return p[p.length-1].name}
// couleurs : le pilier donne la teinte, chaque domaine une nuance, la catégorie hérite de son domaine
const shadeHex=(hex,k)=>{const n=parseInt(String(hex||'#888888').slice(1),16),cl=v=>Math.max(0,Math.min(255,v+k));return '#'+[n>>16,(n>>8)&255,n&255].map(v=>cl(v).toString(16).padStart(2,'0')).join('')};
function treeColors(){for(const p of pillars())kids(p.id).forEach((d,i)=>{d.color=shadeHex(p.color,[0,-26,22,-46][i%4]);kids(d.id).forEach(c=>c.color=d.color)})}
// sélection par #raccourci : raccourci exact, puis début du nom (catégorie d'abord, puis domaine, puis pilier)
function findNode(q){
 q=norm(String(q||'')).replace(/^#/,'').trim();if(!q)return null;
 const ns=S.channels,key=c=>norm(c.key||''),nm=c=>norm(c.name).replace(/[^a-z0-9]/g,''),qq=q.replace(/[^a-z0-9]/g,'');
 const full=ns.find(c=>norm(c.name)===q||nm(c)===qq)||ns.find(c=>key(c)===qq);if(full)return full;
 const byL=l=>ns.filter(c=>(c.lvl===undefined?2:c.lvl)===l);
 for(const l of [2,1,0]){const h=byL(l).find(c=>nm(c).startsWith(qq)||key(c).startsWith(qq)||norm(c.name).split(/[^a-z0-9]+/).some(w=>w.length>2&&w.startsWith(qq)));if(h)return h}
 return null;
}
// accepte « Corps › Natation », « Natation » ou un raccourci
function nodeByName(n){if(!n)return null;const s=String(n);if(s.includes('›')){const parts=s.split('›').map(x=>norm(x).trim());const c=S.channels.find(c=>norm(c.name)===parts[parts.length-1]&&(!parts[0]||norm((node(c.parent)||{}).name||'')===parts[0]));if(c)return c}return findNode(s)}
// agenda Google : catégorie, sinon domaine, sinon pilier, sinon agenda par défaut
function nodeCal(id){for(const n of pathOf(id).reverse())if(n.cal)return n.cal;return null}
function catPaths(){const out=[];for(const p of pillars())for(const d of kids(p.id)){out.push(p.name+' / '+d.name);for(const c of kids(d.id))out.push(d.name+' › '+c.name)}return out}
function treeOptions(sel,emptyLabel){
 if(!hasTree())return `<option value="">${emptyLabel||'Aucune'}</option>`+S.channels.map(c=>`<option value="${esc(c.id)}" ${c.id===sel?'selected':''}>${esc(c.name)}</option>`).join('');
 return `<option value="">${emptyLabel||'Aucune'}</option>`+pillars().map(p=>`<optgroup label="${esc(p.name)}">${kids(p.id).map(d=>`<option value="${esc(d.id)}" ${d.id===sel?'selected':''}>${esc(d.name)} (tout le domaine)</option>${kids(d.id).map(c=>`<option value="${esc(c.id)}" ${c.id===sel?'selected':''}>   ${esc(c.name)}</option>`).join('')}`).join('')}</optgroup>`).join('');
}
/* ---------- construction et migration ---------- */
function buildTree(){
 const out=[];TREE.forEach(([pk,pn,pc,ds],pi)=>{out.push({id:'p-'+pk,name:pn,color:pc,lvl:0,parent:null,o:pi});
  ds.forEach(([dk,dn,cs],di)=>{out.push({id:'d-'+dk,name:dn,lvl:1,parent:'p-'+pk,o:di});cs.forEach(([ck,cn],ci)=>out.push({id:'c-'+ck,name:cn,key:ck,lvl:2,parent:'d-'+dk,o:ci}))})});
 return out;
}
// mots-clés → catégorie (titres normalisés, sans accents)
const CAT_RULES=[
 [/callisth|traction|pompes?\b|dips|muscu|gainage|abdo|street ?work/,'c-callisthenie'],[/natation|piscine|nager|\bnage/,'c-natation'],[/mobilit|etirement|stretch|yoga|souplesse/,'c-mobilite'],
 [/medit|mantra|coherence|respir/,'c-meditation'],[/\bjournal(ing)?\b(?! du)|introspect|gratitude/,'c-journal'],
 [/douche|\bbain\b|rasage|raser|brosse|dents|petit[- ]?dej|dejeuner|\bdiner|\brepas|manger|routine|habiller|skincare/,'c-routines'],
 [/\bpsy|kine|medecin|docteur|dentiste|ophtalmo|pharmacie|ordonnance|sieste|dormir|sommeil|coucher|prise de sang|vaccin|osteo/,'c-soins'],
 [/alimentation|nutrition|legumes|proteine|batch|healthy|\bjeun/,'c-alimentation'],
 [/duolingo|anglais|espagnol|italien|japonais|langue/,'c-langues'],[/presse|\bactu|news|le monde|mediapart|newsletter|veille/,'c-presse'],[/\blire\b|lecture|\blivre|roman|bd\b|manga/,'c-lecture'],
 [/piano|partition|solfege/,'c-piano'],[/\bvj|resolume|vjing|mapping|visuels?\b/,'c-vj'],[/dessin|peinture|\bart\b|illustr|croquis|aquarelle/,'c-art'],
 [/\bjdr\b|\bmj\b|scenario|campagne|donjon|jeu de role|d&d|pathfinder|cthulhu/,'c-jdr'],[/magic|\bmtg\b|\bdeck|draft|commander/,'c-magic'],[/lego/,'c-lego'],
 [/maman|papa|parents|famille|frere|soeur|mamie|papi|grand-?mere|grand-?pere|cousin|neveu|niece|tonton|tata/,'c-famille'],
 [/anniv|soiree|fete|evenement|concert|festival|mariage|\bexpo\b|spectacle|cine/,'c-evenements'],
 [/\bami|pote|copain|copine|appeler|message|\bsms\b|whatsapp|repondre a|nouvelles/,'c-amis'],
 [/manif|militan|petition|greve|syndic|tract/,'c-militantisme'],[/\bdon\b|dons\b|caritati|benevol|association|asso\b|resto du coeur/,'c-caritatif'],[/\bvote|elect|citoyen|mairie|conseil de quartier|civique/,'c-citoyennete'],
 [/villette|synoptique|optique|devis|resa|reservation|plans?\b|regie|fiche technique/,'c-villette'],[/stardust/,'c-stardust'],[/formation|cours\b|certif|tuto/,'c-formation'],
 [/menage|aspirat|lessive|linge|vaisselle|poussiere|ranger|rangement|nettoy|serpill|poubelle|draps|\blit\b|salle de bain|toilettes|vitres|lave-?(linge|vaisselle)|etendre|repass/,'c-menage'],
 [/courses|supermarche|carrefour|monoprix|franprix|lidl|picard|marche\b|drive\b/,'c-courses'],[/cuisine|cuisiner|recette|\bpatisser|gateau|\bcuire|prepar(er)? (le |un )?repas/,'c-cuisine'],
 [/bricol|reparer|reparation|percer|perceuse|visser|monter (le|la|les|un|une)|ampoule|plomb|joint/,'c-bricolage'],[/tonte|tondre|jardin|plantes?\b|arros|haie|potager|pelouse/,'c-jardin'],[/\bdeco|meuble|amenag|ikea|etagere|cadre|rideau|peindre (le|la|les) mur/,'c-deco'],
 [/impot|\bcaf\b|pole emploi|france travail|note de frais|papiers|assurance|mutuelle|urssaf|secu\b|ameli|administratif|dossier|formulaire|courrier|declaration|\bmail(s)?\b/,'c-admin'],
 [/budget|bankin|\bcomptes?\b|epargne|abonnement|plum|economie|facture|banque|virement|remboursement/,'c-budget'],
 [/planifi|organis|revue|planning|\btodo|to-do|agenda|sunsama|mydaybot|inbox/,'c-organisation'],
 [/sport|footing|courir|course a pied|\brun\b|velo|marche rapide|salle/,'d-corps']];
const ruleFor=title=>{const t=norm(title||'');for(const [re,id] of CAT_RULES)if(re.test(t))return id;return null};
// anciens canaux Sunsama → nœud ; « fourre-tout » = on lit d'abord le titre
const OLD={'menage':'c-menage','courses':'c-courses','cusine':'c-cuisine','cuisine':'c-cuisine','bricolage':'c-bricolage','la villette':'c-villette','villette':'c-villette','stardust':'c-stardust','formation':'c-formation',
 'administratif':'c-admin','admin':'c-admin','economies':'c-budget','finances':'c-budget','organisation':'c-organisation','evenements':'c-evenements','social':'c-amis','vj bhbt':'c-vj','vj':'c-vj','art':'c-art',
 'sante':'d-corps','perso':'d-corps','pro':'d-metier','travail':'d-metier','ethique':'d-engagement','demenagement':'d-foyer','ludostream':'d-jeu'};
const FUZZY=['perso','sante','pro','travail','social','demenagement','ludostream','ethique','organisation'];
const PROJ_FROM=['demenagement','ludostream'];
function classify(title,oldName){
 const k=norm(oldName||'').trim(),base=OLD[k]||null,rule=ruleFor(title);
 if(!k)return rule;
 if(FUZZY.includes(k)||!base)return rule||base;
 return base;
}
// plan de migration : rien n'est modifié tant que l'utilisateur n'a pas validé
function planTree(){
 const oldName=id=>{const c=S.channels.find(x=>x.id===id&&x.lvl===undefined);return c?c.name:null};
 const map={},arch={},stats={},projs={};
 const count=(nid)=>{const k=nid||'';stats[k]=(stats[k]||0)+1};
 for(const t of S.tasks){const on=oldName(t.channel);if(!t.channel||on!==null){const nid=classify(t.title,on);map[t.id]=nid;count(nid);const k=norm(on||'');if(PROJ_FROM.includes(k))projs[t.id]=on}}
 for(const a of S.archive||[]){const on=oldName(a.c);if(!a.c||on!==null){const nid=classify(a.t,on);arch[a.id]=nid;count(nid)}}
 const chMap={};for(const c of S.channels.filter(c=>c.lvl===undefined))chMap[c.id]=OLD[norm(c.name).trim()]||ruleFor(c.name)||null;
 return{map,arch,stats,projs,chMap,n:Object.keys(map).length+Object.keys(arch).length};
}
function applyTree(plan){
 plan=plan||planTree();
 try{lsSet('journee.backup.pretree',JSON.stringify(S))}catch(e){}
 const old=S.channels.filter(c=>c.lvl===undefined);
 const keep=S.channels.filter(c=>c.lvl!==undefined),fresh=keep.length?keep:buildTree();
 // garder l'agenda déjà choisi sur un ancien canal qui devient une catégorie
 for(const c of old){const to=plan.chMap[c.id];const n=fresh.find(x=>x.id===to);if(n&&c.cal&&!n.cal)n.cal=c.cal}
 S.channels=fresh;
 S.projects=S.projects||[];
 const projId=name=>{let p=S.projects.find(x=>norm(x.name)===norm(name));if(!p){p={id:'pr-'+norm(name).replace(/[^a-z0-9]+/g,'-'),name,end:null,done:false};S.projects.push(p)}return p.id};
 for(const t of S.tasks){if(t.id in plan.map)t.channel=plan.map[t.id];if(plan.projs[t.id])t.proj=projId(plan.projs[t.id])}
 for(const a of S.archive||[])if(a.id in plan.arch)a.c=plan.arch[a.id];
 for(const r of S.recurring||[])if(r.channel&&!node(r.channel))r.channel=classify(r.title,(old.find(c=>c.id===r.channel)||{}).name);
 for(const tp of S.templates||[])for(const i of tp.items||[])if(i.channel&&!node(i.channel))i.channel=classify(i.title,(old.find(c=>c.id===i.channel)||{}).name);
 treeColors();S.treeAt=Date.now();save();emit('tree:migrate',{n:plan.n});
}
// au démarrage : installation silencieuse si rien à migrer, sinon on demande
function ensureTree(){
 const old=S.channels.some(c=>c.lvl===undefined);
 if(!old){if(!hasTree())applyTree();else treeColors();return false}
 if(!planTree().n){applyTree();return false}
 return true; // une migration attend validation
}
function treeMigrationHtml(){
 const p=planTree(),rows=[];
 const fresh=buildTree(),nm=id=>{const n=fresh.find(x=>x.id===id);if(!n)return 'Sans catégorie';const d=fresh.find(x=>x.id===n.parent);return n.lvl===2?d.name+' › '+n.name:n.name+' (à affiner)'};
 const pil=id=>{let n=fresh.find(x=>x.id===id);while(n&&n.parent)n=fresh.find(x=>x.id===n.parent);return n};
 const by={};for(const [id,c] of Object.entries(p.stats)){const pl=pil(id);const k=pl?pl.name:'—';(by[k]=by[k]||[]).push([nm(id),c])}
 const order=['Être','Grandir','Relier','Bâtir','—'];
 const fuzzy=Object.entries(p.stats).filter(([id])=>id.startsWith('d-')).reduce((a,[,c])=>a+c,0);
 return `<div class="rit"><h2>Passer à l’arbre des catégories</h2><p class="lead">${p.n} tâches (actives et historique) vont être rangées dans les 4 piliers. Une sauvegarde est faite avant ; rien n’est perdu.</p>
 <div class="migl">${order.filter(k=>by[k]).map(k=>`<div class="migp"><b>${esc(k)}</b>${by[k].sort((a,b)=>b[1]-a[1]).map(([l,c])=>`<div class="migr"><span>${esc(l)}</span><span class="mute">${c}</span></div>`).join('')}</div>`).join('')}</div>
 ${fuzzy?`<p class="mute">${fuzzy} tâches n’ont pas pu être rangées plus finement que leur domaine. Après la migration, « Affiner avec Claude » dans Réglages les classera par catégorie (tu valideras encore).</p>`:''}
 <div class="row" style="margin-top:14px"><button class="ghost" data-act="close">Plus tard</button><span class="sp"></span><button class="pri" data-act="treego">Ranger mes tâches</button></div></div>`;
}
/* ---------- affinage par Claude des tâches restées au niveau domaine ---------- */
let refineProp=null;
const refineCands=()=>[...S.tasks.filter(t=>t.channel&&(node(t.channel)||{}).lvl===1).map(t=>({id:t.id,t:t.title,c:t.channel,k:'t'})),...(S.archive||[]).filter(a=>a.c&&(node(a.c)||{}).lvl===1).map(a=>({id:a.id,t:a.t,c:a.c,k:'a'}))];
async function aiRefine(onProg){
 const all=refineCands();if(!all.length)return[];
 const out=[];
 // regrouper les titres identiques (routines répétées) pour économiser des jetons
 const uniq={};for(const x of all){const k=norm(x.t).trim()+'|'+x.c;(uniq[k]=uniq[k]||{t:x.t,c:x.c,ids:[]}).ids.push(x)}
 const list=Object.values(uniq);
 for(let i=0;i<list.length;i+=120){
  const chunk=list.slice(i,i+120);
  const cats=[...new Set(chunk.map(x=>x.c))].map(d=>`${node(d).name} : ${kids(d).map(c=>c.name).join(', ')}`).join('\n');
  const prompt=`Range chaque tâche dans UNE catégorie de son domaine. Catégories par domaine :\n${cats}\n\nTâches (numéro | domaine | titre) :\n${chunk.map((x,j)=>`${j} | ${node(x.c).name} | ${x.t}`).join('\n')}\n\nRéponds uniquement par du JSON : {"numéro":"nom exact de la catégorie"} ; mets null si aucune ne convient.`;
  const j=await claudeJSON(prompt);
  for(const [k,v] of Object.entries(j||{})){const x=chunk[+k];if(!x||!v)continue;const c=kids(x.c).find(c=>norm(c.name)===norm(v));if(c)out.push({x,to:c.id})}
  if(onProg)onProg(Math.min(list.length,i+120),list.length);
 }
 return out;
}
function refineHtml(){
 if(!refineProp)return '';
 const by={};for(const r of refineProp){const k=r.to;(by[k]=by[k]||[]).push(r)}
 const n=refineProp.reduce((a,r)=>a+r.x.ids.length,0);
 return `<div class="rit"><h2>Proposition de Claude</h2><p class="lead">${n} tâches rangées dans ${Object.keys(by).length} catégories. Décoche ce qui ne va pas.</p>
 <div class="migl">${Object.entries(by).map(([to,rs])=>`<div class="migp"><b>${esc(nodeLabel(to))}</b>${rs.slice(0,40).map(r=>`<label class="migr"><span><input type="checkbox" data-refine="${esc(r.x.ids[0].id)}" checked style="width:auto;min-height:0"> ${esc(r.x.t)}</span><span class="mute">${r.x.ids.length>1?'×'+r.x.ids.length:''}</span></label>`).join('')}${rs.length>40?`<small class="mute">… et ${rs.length-40} autres</small>`:''}</div>`).join('')}</div>
 <div class="row" style="margin-top:14px"><button class="ghost" data-act="close">Annuler</button><span class="sp"></span><button class="pri" data-act="refineok">Appliquer</button></div></div>`;
}
function applyRefine(skip){
 let n=0;for(const r of refineProp||[]){if(skip.has(r.x.ids[0].id))continue;for(const it of r.x.ids){if(it.k==='t'){const t=T(it.id);if(t){t.channel=r.to;if(t.block)pushBlock(t)}}else{const a=(S.archive||[]).find(a=>a.id===it.id);if(a)a.c=r.to}n++}}
 refineProp=null;save();return n;
}
/* ---------- projets : étiquettes transversales ---------- */
const proj=id=>(S.projects||[]).find(p=>p.id===id);
const activeProjects=()=>(S.projects||[]).filter(p=>!p.done);
function findProject(q){q=norm(q).replace(/[^a-z0-9]/g,'');if(!q)return null;return activeProjects().find(p=>norm(p.name).replace(/[^a-z0-9]/g,'').startsWith(q))||null}
function projProgress(id){const ts=S.tasks.filter(t=>t.proj===id);return{n:ts.length,done:ts.filter(t=>t.done).length}}
/* ---------- éditeur de l'arbre (Réglages) ---------- */
function treeEditorHtml(){
 if(!hasTree())return `<p>Tes tâches utilisent encore les anciens canaux.</p><button class="pri" data-act="treeask">Passer à l’arbre des catégories</button>`;
 const calSel=(n,lbl)=>gCals?`<select data-ncal="${esc(n.id)}" aria-label="Agenda de ${esc(n.name)}"><option value="">${lbl}</option>${gCals.filter(c=>c.write).map(c=>`<option value="${esc(c.id)}" ${n.cal===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`:'';
 const cnt=id=>S.tasks.filter(t=>!t.done&&pathOf(t.channel).some(x=>x.id===id)).length;
 const row=(n,extra)=>`<div class="tnode l${n.lvl}" data-node="${esc(n.id)}">${n.lvl===0?`<input type="color" data-nc="${esc(n.id)}" value="${esc(n.color)}" aria-label="Couleur">`:`<span class="dot" style="--c:${esc(n.color)}"></span>`}<input class="tname" data-nn="${esc(n.id)}" value="${esc(n.name)}" aria-label="Nom">${n.lvl===2?`<input class="tkey" data-nk="${esc(n.id)}" value="${esc(n.key||'')}" placeholder="raccourci" aria-label="Raccourci #">`:''}<span class="mute tcnt">${cnt(n.id)||''}</span>${extra||''}<button class="x" data-act="nodemenu" data-id="${esc(n.id)}" aria-label="Options">⋯</button></div>`;
 return `<div class="tree">${pillars().map(p=>`<div class="tpil">${row(p,calSel(p,'Agenda par défaut'))}${kids(p.id).map(d=>`<div class="tdom">${row(d,calSel(d,'Agenda du pilier'))}<div class="tcats">${kids(d.id).map(c=>row(c,calSel(c,'Agenda du domaine'))).join('')}<button class="sm ghost" data-act="nodeadd" data-id="${esc(d.id)}">+ Catégorie</button></div></div>`).join('')}<button class="sm ghost" data-act="nodeadd" data-id="${esc(p.id)}">+ Domaine</button></div>`).join('')}</div>
 ${gTok()&&!gCals?(loadCals().then(()=>{if(view==='settings')render()}),'<p class="mute">Chargement des agendas…</p>'):!gTok()?'<p class="mute">Connecte Google pour choisir l’agenda de chaque pilier.</p>':''}`;
}
function nodeMenu(id){
 const n=node(id);if(!n)return;
 const parents=n.lvl===0?[]:S.channels.filter(c=>c.lvl===n.lvl-1);
 showModal(`<div class="rit"><h2>${esc(n.name)}</h2><p class="lead">${LVL[n.lvl]}${n.lvl?' · dans '+esc(node(n.parent).name):''}</p>
 ${parents.length?`<label>Déplacer vers<select data-nmove="${esc(n.id)}">${parents.map(p=>`<option value="${esc(p.id)}" ${p.id===n.parent?'selected':''}>${esc(p.lvl===1?node(p.parent).name+' › '+p.name:p.name)}</option>`).join('')}</select></label>`:''}
 <div class="row" style="margin-top:14px"><button class="ghost" data-act="nodeup" data-id="${esc(n.id)}">↑ Monter</button><button class="ghost" data-act="nodedown" data-id="${esc(n.id)}">↓ Descendre</button><span class="sp"></span>${n.lvl?`<button class="danger" data-act="nodedel" data-id="${esc(n.id)}">Supprimer</button>`:''}</div>
 ${n.lvl?'<p class="mute" style="font-size:13px">Supprimer range ses tâches dans le niveau au-dessus.</p>':''}</div>`);
}
function nodeAdd(parentId){
 const p=node(parentId);if(!p||p.lvl>=2)return;
 const n={id:uid(),name:p.lvl===0?'Nouveau domaine':'Nouvelle catégorie',lvl:p.lvl+1,parent:p.id,o:kids(p.id).length};
 if(n.lvl===2)n.key='';S.channels.push(n);treeColors();save();return n;
}
function nodeDel(id){
 const n=node(id);if(!n||!n.lvl)return;
 const ids=new Set([id,...S.channels.filter(c=>c.parent===id).map(c=>c.id)]);
 S.tasks.forEach(t=>{if(ids.has(t.channel)){t.channel=n.parent;if(t.block)pushBlock(t)}});(S.archive||[]).forEach(a=>{if(ids.has(a.c))a.c=n.parent});
 (S.recurring||[]).forEach(r=>{if(ids.has(r.channel))r.channel=n.parent});
 S.channels=S.channels.filter(c=>!ids.has(c.id));treeColors();save();
}
function nodeShift(id,dir){const n=node(id);if(!n)return;const sib=kids(n.parent);const i=sib.indexOf(n),j=i+dir;if(j<0||j>=sib.length)return;[sib[i],sib[j]]=[sib[j],sib[i]];sib.forEach((x,k)=>x.o=k);treeColors();save()}
function nodeMove(id,to){const n=node(id),p=node(to);if(!n||!p||p.lvl!==n.lvl-1)return;n.parent=to;n.o=kids(to).length;treeColors();save();relocateBlocks()}
