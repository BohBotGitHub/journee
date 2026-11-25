// Diem — arbre des catégories : 4 piliers → domaines → catégories (→ compétences, plus tard)
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
  ['foyer','Foyer',[['menage','Ménage'],['courses','Courses'],['cuisine','Cuisine'],['bricolage','Bricolage'],['deco','Déco & aménagement']]],
  ['gestion','Gestion',[['admin','Administratif'],['budget','Budget & épargne'],['organisation','Organisation'],['demarches','Courses & démarches']]]]]];
const LVL=['Pilier','Domaine','Catégorie'];
const hasTree=()=>S.channels.some(c=>c.lvl!==undefined);
const node=id=>S.channels.find(c=>c.id===id);
const kids=id=>S.channels.filter(c=>(c.parent||null)===(id||null)&&c.lvl!==undefined).sort((a,b)=>(a.o||0)-(b.o||0));
const pillars=()=>kids(null).filter(c=>c.lvl===0);
function pathOf(id){const out=[];let n=node(id),g=0;while(n&&g++<6){out.unshift(n);n=n.parent?node(n.parent):null}return out}
const pillarOf=id=>pathOf(id)[0]||null;
const domainOf=id=>pathOf(id)[1]||null;
// libellé affiché : « Domaine › Catégorie » (ou le nom seul d'un pilier / domaine / ancien catégorie)
function nodeLabel(id){const p=pathOf(id);if(!p.length)return '';if(p.length>=3)return p[1].name+' › '+p[p.length-1].name;return p[p.length-1].name}
// couleurs : le pilier donne la teinte, chaque domaine une nuance, la catégorie hérite de son domaine
const shadeHex=(hex,k)=>{const n=parseInt(String(hex||'#888888').slice(1),16),cl=v=>Math.max(0,Math.min(255,v+k));return '#'+[n>>16,(n>>8)&255,n&255].map(v=>cl(v).toString(16).padStart(2,'0')).join('')};
// chaque domaine a sa propre teinte, voisine de celle de son pilier (rotation de teinte + léger écart de clarté)
function hueHex(hex,dh,dl,ds){let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;
 if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}
 h=(h+dh+360)%360;l=Math.max(.26,Math.min(.68,l+dl));s=Math.max(.35,Math.min(.85,s+ds));
 const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h/60%2-1)),m=l-c/2;let [R,G,B]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
 return '#'+[R,G,B].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('')}
const DOM_SHIFT=[[0,0,0],[-16,.13,.02],[16,-.12,.08],[-6,-.2,.04],[8,.2,-.06]];
function treeColors(){for(const p of pillars()){const ds=kids(p.id);ds.forEach((d,i)=>{const n=ds.length,k=n<=1?[0,0,0]:DOM_SHIFT[i%DOM_SHIFT.length];d.color=hueHex(p.color,k[0],k[1],k[2]);kids(d.id).forEach(c=>c.color=d.color)})}}
// sélection par #raccourci : raccourci exact, puis début du nom (catégorie d'abord, puis domaine, puis pilier)
function findNode(q){
 q=norm(String(q||'')).replace(/^#/,'').trim();if(!q)return null;
 const ns=S.channels,key=c=>norm(c.key||''),nm=c=>norm(c.name).replace(/[^a-z0-9]/g,''),qq=q.replace(/[^a-z0-9]/g,'');
 const full=ns.find(c=>norm(c.name)===q||nm(c)===qq)||ns.find(c=>key(c)===qq)||ns.find(c=>(c.aka||[]).some(a=>norm(a)===qq));if(full)return full;
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
 [/douche|\bbain\b|rasage|raser|tonte|tondre|tondeuse|epil|barbe|cheveux|coiffeur|brosse|dents|petit[- ]?dej|dejeuner|\bdiner|\brepas|manger|routine|habiller|skincare/,'c-routines'],
 [/\bpsy|kine|medecin|docteur|dentiste|ophtalmo|pharmacie|ordonnance|sieste|dormir|sommeil|coucher|prise de sang|vaccin|osteo/,'c-soins'],
 [/alimentation|nutrition|legumes|proteine|batch|healthy|\bjeun/,'c-alimentation'],
 [/duolingo|anglais|espagnol|italien|japonais|langue/,'c-langues'],[/presse|\bactu|news|le monde|mediapart|newsletter|veille/,'c-presse'],[/\blire\b|lecture|\blivre|roman|\bbd\b|manga/,'c-lecture'],
 [/piano|\bpartition|solfege/,'c-piano'],[/\bvj|resolume|vjing|mapping|visuels?\b/,'c-vj'],[/dessin|peinture|\bart\b|illustr|croquis|aquarelle/,'c-art'],
 [/\bjdr\b|\bmj\b|scenario|campagne|donjon|jeu de role|d&d|pathfinder|cthulhu/,'c-jdr'],[/lego/,'c-lego'],[/magic|\bmtg\b|\bdeck\b|\bdraft\b/,'c-magic'],
 [/maman|papa|parents|famille|frere|soeur|mamie|\bpapi\b|grand-?mere|grand-?pere|cousin|neveu|niece|tonton|tata/,'c-famille'],
 [/anniv|soiree|fete|evenement|concert|festival|mariage|\bexpo\b|spectacle|cine/,'c-evenements'],
 [/\bami|pote|copain|copine|appeler|message|\bsms\b|whatsapp|repondre a|nouvelles/,'c-amis'],
 [/manif|militan|\bpetition|greve|syndic|tract/,'c-militantisme'],[/\bdon\b|dons\b|caritati|benevol|association|asso\b|resto du coeur/,'c-caritatif'],[/\bvote|elect|citoyen|mairie|conseil de quartier|civique/,'c-citoyennete'],
 [/villette|synoptique|optique|\bdevis|\bregie|fiche technique|plan de feu/,'c-villette'],[/stardust/,'c-stardust'],[/formation|\bcours\b|\btuto/,'c-formation'],
 [/menage|aspirat|lessive|linge|vaisselle|poussiere|ranger|rangement|nettoy|serpill|poubelle|draps|\blit\b|salle de bain|toilettes|vitres|lave-?(linge|vaisselle)|etendre|repass/,'c-menage'],
 [/colis|\bposte\b|la poste|lettre recommandee|recommande|pressing|cordonnier|point relais|relais colis|mondial relay|chronopost|\bups\b|\bdhl\b|recuperer|deposer|rendre (le|la|les|un|une)|retourner (le|la|les|un|une)|\bretour\b|\bretirer\b|cle(s)? (a|chez)|double de cle/,'c-demarches'],
 [/courses|supermarche|carrefour|monoprix|franprix|lidl|picard|marche\b|drive\b/,'c-courses'],[/cuisine|cuisiner|recette|\bpatisser|gateau|\bcuire|prepar(er)? (le |un )?repas/,'c-cuisine'],
 [/bricol|\breparer|\breparation|percer|perceuse|visser|monter (le|la|les|un|une)|ampoule|plomb|joint/,'c-bricolage'],[/plantes?\b|arros|rempot/,'c-deco'],[/\bdeco|meuble|amenag|ikea|etagere|cadre|rideau|peindre (le|la|les) mur/,'c-deco'],
 [/impot|\bcaf\b|pole emploi|france travail|note de frais|papiers|assurance|mutuelle|urssaf|\bsecu\b|\bameli\b|administratif|dossier|formulaire|courrier|declaration|\bmail(s)?\b/,'c-admin'],
 [/budget|bankin|\bcomptes?\b|epargne|abonnement|plum|economie|facture|banque|virement|remboursement/,'c-budget'],
 [/planifi|organis|revue|planning|\btodo|to-do|agenda|sunsama|mydaybot|journee|\bappli|wishlist|claude|github|\bcode\b|\bdev\b|developpement|inbox/,'c-organisation'],
 [/\bsport|footing|courir|course a pied|\brun\b|velo|marche rapide|salle/,'d-corps']];
const ruleFor=title=>{const t=norm(title||'');for(const [re,id] of CAT_RULES)if(re.test(t))return mergedTo(id);return null};
// catégories fusionnées : l'ancienne adresse renvoie vers celle qui reste
function mergedTo(id){const m=(typeof S!=='undefined'&&S.merged)||{};let g=0;while(id&&m[id]&&g++<5)id=m[id];return id}
/* ---------- doublons connus de l'arbre par défaut : on propose la fusion, rien n'est fait sans accord ---------- */
// 25/11 : le propriétaire garde Cuisine et Alimentation saine séparées ; plus de proposition de fusion
const DUPS=[];
function dupCands(){S.fixes=S.fixes||{};return DUPS.filter(d=>!S.fixes['dup-'+d.id]&&node(d.a)&&node(d.b))}
const nodeUse=id=>S.tasks.filter(t=>t.channel===id).length+(S.archive||[]).filter(a=>a.c===id).length;
function mergeNodes(from,to,name){
 const f=node(from),t=node(to);if(!f||!t||from===to)return false;
 const pre=JSON.stringify({channels:S.channels,tasks:S.tasks,archive:S.archive||[],recurring:S.recurring||[],templates:S.templates||[],merged:S.merged||{},fixes:S.fixes||{}});
 const mv=x=>x===from?to:x;
 S.tasks.forEach(x=>{x.channel=mv(x.channel)});(S.archive||[]).forEach(a=>{a.c=mv(a.c)});(S.recurring||[]).forEach(r=>{r.channel=mv(r.channel)});(S.templates||[]).forEach(tp=>(tp.items||[]).forEach(i=>{i.channel=mv(i.channel)}));
 S.channels.filter(c=>c.parent===from).forEach(c=>{c.parent=to});
 if(!t.cal&&f.cal)t.cal=f.cal;if(name)t.name=name;t.aka=[...new Set([...(t.aka||[]),f.key,...(f.aka||[])].filter(Boolean))];
 S.channels=S.channels.filter(c=>c.id!==from);S.merged=Object.assign({},S.merged||{},{[from]:to});
 treeColors();save();return pre;
}
function mergeUndo(pre){const o=JSON.parse(pre);Object.assign(S,o);treeColors();save();render()}
function dupDecide(id,keep){const d=DUPS.find(x=>x.id===id);if(!d)return;S.fixes=S.fixes||{};
 if(keep==='both'){S.fixes['dup-'+id]='both';save();render();toast('Les deux catégories sont gardées');return}
 const [to,from,name]=keep==='a'?[d.a,d.b,d.na]:[d.b,d.a,d.nb];const n=nodeUse(from);
 const pre=mergeNodes(from,to,name);if(!pre)return;S.fixes['dup-'+id]=keep;save();render();
 toast(`Fusionnées dans ${nodeLabel(to)}${n?' · '+n+' tâche'+(n>1?'s':'')+' déplacée'+(n>1?'s':''):''}`,'Annuler',()=>mergeUndo(pre))}
function dupBanner(){const ds=dupCands();if(!ds.length)return '';return ds.map(d=>{const na=nodeUse(d.a),nb=nodeUse(d.b),pa=domainOf(d.a),pb=domainOf(d.b),use=na+nb?`${na} et ${nb} tâche${na+nb>1?'s':''} (historique compris).`:'Aucune tâche dedans pour l’instant.';
 return `<div class="dupcard" data-dup="${d.id}"><div><b>Doublon : ${esc(nodeLabel(d.a))} et ${esc(nodeLabel(d.b))}</b><span class="mute">${use} Les deux se recoupent : on n’en garde qu’une ?</span></div>
 <div class="row dupacts"><button class="sm pri" data-act="dupgo" data-id="${d.id}" data-k="a">Tout dans ${esc(pa?pa.name:'')} › ${esc(d.na)}</button><button class="sm" data-act="dupgo" data-id="${d.id}" data-k="b">Tout dans ${esc(pb?pb.name:'')} › ${esc(d.nb)}</button><button class="sm ghost" data-act="dupgo" data-id="${d.id}" data-k="both">Garder les deux</button></div></div>`}).join('')}
// anciens catégories Sunsama → nœud ; « fourre-tout » = on lit d'abord le titre
const OLD={'menage':'c-menage','courses':'c-courses','cusine':'c-cuisine','cuisine':'c-cuisine','bricolage':'c-bricolage','la villette':'c-villette','villette':'c-villette','stardust':'c-stardust','formation':'c-formation',
 'administratif':'c-admin','admin':'c-admin','economies':'c-budget','finances':'c-budget','organisation':'c-organisation','evenements':'c-evenements','social':'c-amis','vj bhbt':'c-vj','vj':'c-vj','art':'c-art',
 'sante':null,'perso':null,'pro':'d-metier','travail':'d-metier','ethique':'d-engagement','demenagement':'d-foyer','ludostream':'d-jeu'};
const FUZZY=['perso','sante','pro','travail','social','demenagement','ludostream','ethique','organisation','evenements'];
const PROJ_FROM=['demenagement','ludostream'];
// pilier de chaque nœud de l'arbre par défaut (pour filtrer les règles selon l'ancien canal)
const UP_OF={};TREE.forEach(([pk,,,ds])=>{UP_OF['p-'+pk]=['p-'+pk];ds.forEach(([dk,,cs])=>{UP_OF['d-'+dk]=['d-'+dk,'p-'+pk];cs.forEach(([ck])=>UP_OF['c-'+ck]=['c-'+ck,'d-'+dk,'p-'+pk])})});
// un ancien canal « Pro » ne peut donner que du Bâtir (pas « Amis » pour un mail à un collègue), « Santé » que de l'Être
const SCOPE={pro:['d-metier','d-gestion'],travail:['d-metier','d-gestion'],sante:['p-etre']};
function classify(title,oldName){
 const k=norm(oldName||'').trim(),base=OLD[k]||null;let rule=ruleFor(title);
 if(rule&&SCOPE[k]&&!(UP_OF[rule]||[]).some(x=>SCOPE[k].includes(x)))rule=null;
 if(!k)return rule;
 if(FUZZY.includes(k)||!base)return rule||base;
 return base;
}
// plan de migration : rien n'est modifié tant que l'utilisateur n'a pas validé
function planTree(){
 const oldName=id=>{const c=S.channels.find(x=>x.id===id&&x.lvl===undefined);return c?c.name:null};
 const map={},arch={},stats={},projs={},from={};
 const count=(nid)=>{const k=nid||'';stats[k]=(stats[k]||0)+1};
 for(const t of S.tasks){const on=oldName(t.channel);if(!t.channel||on!==null){const nid=classify(t.title,on);map[t.id]=nid;if(on)from[t.id]=on;count(nid);const k=norm(on||'');if(PROJ_FROM.includes(k))projs[t.id]=on}}
 for(const a of S.archive||[]){const on=oldName(a.c);if(!a.c||on!==null){const nid=classify(a.t,on);arch[a.id]=nid;if(on)from[a.id]=on;count(nid)}}
 const chMap={};for(const c of S.channels.filter(c=>c.lvl===undefined))chMap[c.id]=OLD[norm(c.name).trim()]||ruleFor(c.name)||null;
 return{map,arch,stats,projs,from,chMap,n:Object.keys(map).length+Object.keys(arch).length};
}
function applyTree(plan){
 plan=plan||planTree();
 try{lsSet('journee.backup.pretree',JSON.stringify(S))}catch(e){}
 const old=S.channels.filter(c=>c.lvl===undefined);
 const keep=S.channels.filter(c=>c.lvl!==undefined),fresh=keep.length?keep:buildTree();
 // garder l'agenda déjà choisi sur un ancien catégorie qui devient une catégorie
 for(const c of old){const to=plan.chMap[c.id];const n=fresh.find(x=>x.id===to);if(n&&c.cal&&!n.cal)n.cal=c.cal}
 S.channels=fresh;
 S.projects=S.projects||[];
 const projId=name=>{let p=S.projects.find(x=>norm(x.name)===norm(name));if(!p){p={id:'pr-'+norm(name).replace(/[^a-z0-9]+/g,'-'),name,end:null,done:false};S.projects.push(p)}return p.id};
 // une tâche venue d'un ancien canal mais non reconnue reste « à classer » : Claude la rangera
 for(const t of S.tasks){if(t.id in plan.map){t.channel=plan.map[t.id];if(!t.channel&&plan.from[t.id])t.mig=1}if(plan.projs[t.id])t.proj=projId(plan.projs[t.id])}
 for(const a of S.archive||[])if(a.id in plan.arch){a.c=plan.arch[a.id];if(!a.c&&plan.from[a.id])a.mig=1}
 for(const r of S.recurring||[])if(r.channel&&!node(r.channel))r.channel=classify(r.title,(old.find(c=>c.id===r.channel)||{}).name);
 for(const tp of S.templates||[])for(const i of tp.items||[])if(i.channel&&!node(i.channel))i.channel=classify(i.title,(old.find(c=>c.id===i.channel)||{}).name);
 treeColors();S.treeAt=Date.now();save();emit('tree:migrate',{n:plan.n});
}
// au démarrage : installation silencieuse si rien à migrer, sinon on demande
// corrections ponctuelles d'un arbre déjà installé
function treeFixes(){
 S.fixes=S.fixes||{};let ch=false;
 if(!S.fixes.jardin){S.fixes.jardin=1;const j=node('c-jardin');if(j&&/jardin/i.test(j.name)){S.tasks.forEach(t=>{if(t.channel==='c-jardin'){t.channel=/tont|tond/.test(norm(t.title))?'c-routines':'d-foyer';ch=true}});(S.archive||[]).forEach(a=>{if(a.c==='c-jardin')a.c=/tont|tond/.test(norm(a.t))?'c-routines':'d-foyer'});S.channels=S.channels.filter(c=>c.id!=='c-jardin');ch=true}}
 if(!S.fixes.demarches){S.fixes.demarches=1;if(node('d-gestion')&&!node('c-demarches')){S.channels.push({id:'c-demarches',name:'Courses & démarches',key:'demarches',lvl:2,parent:'d-gestion',o:kids('d-gestion').length});ch=true}}
 if(ch){treeColors();save()}
}
function ensureTree(){
 const old=S.channels.some(c=>c.lvl===undefined);
 if(!old){if(!hasTree())applyTree();else{treeFixes();treeColors()}return false}
 if(!planTree().n){applyTree();return false}
 return true; // une migration attend validation
}
function treeMigrationHtml(){
 const p=planTree(),rows=[];
 const fresh=buildTree(),nm=id=>{const n=fresh.find(x=>x.id===id);if(!n)return 'À classer (Claude proposera)';const d=fresh.find(x=>x.id===n.parent);return n.lvl===2?d.name+' › '+n.name:n.name+' (à affiner)'};
 const pil=id=>{let n=fresh.find(x=>x.id===id);while(n&&n.parent)n=fresh.find(x=>x.id===n.parent);return n};
 const by={};for(const [id,c] of Object.entries(p.stats)){const pl=pil(id);const k=pl?pl.name:'À classer';(by[k]=by[k]||[]).push([nm(id),c])}
 const order=['Être','Grandir','Relier','Bâtir','À classer'];
 const fuzzy=Object.entries(p.stats).filter(([id])=>!id||id.startsWith('d-')).reduce((a,[,c])=>a+c,0);
 return `<div class="rit"><h2>Passer à l’arbre des catégories</h2><p class="lead">${p.n} tâches (actives et historique) vont être rangées dans les 4 piliers. Une sauvegarde est faite avant ; rien n’est perdu.</p>
 <div class="migl">${order.filter(k=>by[k]).map(k=>`<div class="migp"><b>${esc(k)}</b>${by[k].sort((a,b)=>b[1]-a[1]).map(([l,c])=>`<div class="migr"><span>${esc(l)}</span><span class="mute">${c}</span></div>`).join('')}</div>`).join('')}</div>
 ${fuzzy?`<p class="mute">${fuzzy} tâches n’ont pas pu être rangées dans une catégorie précise (titre non reconnu). Après la migration, « Affiner avec Claude » dans Réglages les classera par catégorie (tu valideras encore).</p>`:''}
 <div class="row" style="margin-top:14px"><button class="ghost" data-act="close">Plus tard</button><span class="sp"></span><button class="pri" data-act="treego">Ranger mes tâches</button></div></div>`;
}
/* ---------- affinage par Claude des tâches restées au niveau domaine ---------- */
let refineProp=null,refineLeft=[];
const refineCands=()=>[...S.tasks.filter(t=>t.channel?(node(t.channel)||{}).lvl===1:t.mig&&!t.done).map(t=>({id:t.id,t:t.title,c:t.channel||null,k:'t'})),...(S.archive||[]).filter(a=>a.c?(node(a.c)||{}).lvl===1:a.mig).map(a=>({id:a.id,t:a.t,c:a.c||null,k:'a'}))];
async function aiRefine(onProg){
 const all=refineCands();refineLeft=[];if(!all.length)return[];
 const out=[];
 // regrouper les titres identiques (routines répétées) pour économiser des jetons
 const uniq={};for(const x of all){const k=norm(x.t).trim()+'|'+(x.c||'');(uniq[k]=uniq[k]||{t:x.t,c:x.c,ids:[]}).ids.push(x)}
 const list=Object.values(uniq);
 for(let i=0;i<list.length;i+=120){
  const chunk=list.slice(i,i+120);
  const cats=catPaths().filter(l=>l.includes('›')).join('\n');
  const prompt=`Range chaque tâche dans UNE catégorie. Catégories (Domaine › Catégorie) :\n${cats}\n\nTâches (numéro | domaine imposé ou « libre » | titre) :\n${chunk.map((x,j)=>`${j} | ${x.c?node(x.c).name:'libre'} | ${x.t}`).join('\n')}\n\nQuand un domaine est imposé, choisis une catégorie de ce domaine. Réponds uniquement par du JSON : {"numéro":"Domaine › Catégorie"} ; mets null si aucune ne convient.`;
  const j=await claudeJSON(prompt);
  for(const [k,v] of Object.entries(j||{})){const x=chunk[+k];if(!x||!v)continue;const c=nodeByName(v);if(c&&c.lvl===2&&(!x.c||c.parent===x.c))out.push({x,to:c.id})}
  if(onProg)onProg(Math.min(list.length,i+120),list.length);
 }
 const placed=new Set(out.map(r=>r.x));refineLeft=list.filter(x=>!placed.has(x));
 return out;
}
function refineHtml(){
 if(!refineProp&&!refineLeft.length)return '';refineProp=refineProp||[];
 const by={};for(const r of refineProp){const k=r.to;(by[k]=by[k]||[]).push(r)}
 const n=refineProp.reduce((a,r)=>a+r.x.ids.length,0);
 const opts=x=>'<option value="">Laisser à classer</option>'+S.channels.filter(c=>c.lvl===2&&(!x.c||c.parent===x.c)).map(c=>`<option value="${esc(c.id)}">${esc(nodeLabel(c.id))}</option>`).join('');
 const left=refineLeft.length?`<div class="migp"><b>À ranger toi-même (${refineLeft.length})</b><p class="mute" style="margin:2px 0 8px">Claude n’a pas trouvé de catégorie sûre pour celles-ci.</p>${refineLeft.slice(0,60).map((x,i)=>`<label class="migr"><span>${esc(x.t)}${x.ids.length>1?' <span class="mute">×'+x.ids.length+'</span>':''}</span><select data-refsel="${i}" style="max-width:260px;min-height:32px;font-size:14px">${opts(x)}</select></label>`).join('')}${refineLeft.length>60?`<small class="mute">… et ${refineLeft.length-60} autres</small>`:''}</div>`:'';
 return `<div class="rit"><h2>${n?'Proposition de Claude':'À ranger toi-même'}</h2><p class="lead">${n?`${n} tâches rangées dans ${Object.keys(by).length} catégories. Décoche ce qui ne va pas.`:'Claude a déjà rangé tout ce qu’il pouvait. Choisis une catégorie pour les tâches restantes.'}</p>
 <div class="migl">${Object.entries(by).map(([to,rs])=>`<div class="migp"><b>${esc(nodeLabel(to))}</b>${rs.slice(0,40).map(r=>`<label class="migr"><span><input type="checkbox" data-refine="${esc(r.x.ids[0].id)}" checked style="width:auto;min-height:0"> ${esc(r.x.t)}</span><span class="mute">${r.x.ids.length>1?'×'+r.x.ids.length:''}</span></label>`).join('')}${rs.length>40?`<small class="mute">… et ${rs.length-40} autres</small>`:''}</div>`).join('')}${left}</div>
 <div class="row" style="margin-top:14px"><button class="ghost" data-act="close">Annuler</button><span class="sp"></span><button class="pri" data-act="refineok">Appliquer</button></div></div>`;
}
function applyRefine(skip){
 let n=0;for(const r of refineProp||[]){if(skip.has(r.x.ids[0].id))continue;for(const it of r.x.ids){if(it.k==='t'){const t=T(it.id);if(t){t.channel=r.to;t.mig=0;if(t.block)pushBlock(t)}}else{const a=(S.archive||[]).find(a=>a.id===it.id);if(a){a.c=r.to;a.mig=0}}n++}}
 document.querySelectorAll('[data-refsel]').forEach(el=>{const x=refineLeft[+el.dataset.refsel];if(!x||!el.value)return;for(const it of x.ids){if(it.k==='t'){const t=T(it.id);if(t){t.channel=el.value;t.mig=0;if(t.block)pushBlock(t)}}else{const a=(S.archive||[]).find(a=>a.id===it.id);if(a){a.c=el.value;a.mig=0}}n++}});
 refineProp=null;refineLeft=[];save();return n;
}
/* ---------- projets : étiquettes transversales ---------- */
const proj=id=>(S.projects||[]).find(p=>p.id===id);
const activeProjects=()=>(S.projects||[]).filter(p=>!p.done);
function findProject(q){q=norm(q).replace(/[^a-z0-9]/g,'');if(!q)return null;return activeProjects().find(p=>norm(p.name).replace(/[^a-z0-9]/g,'').startsWith(q))||null}
function projProgress(id){const ts=S.tasks.filter(t=>t.proj===id);return{n:ts.length,done:ts.filter(t=>t.done).length}}
/* ---------- éditeur de l'arbre (Réglages) ---------- */
function treeEditorHtml(){
 if(!hasTree())return `<p>Tes tâches utilisent encore les anciens catégories.</p><button class="pri" data-act="treeask">Passer à l’arbre des catégories</button>`;
 const calSel=(n,lbl)=>gCals?`<select data-ncal="${esc(n.id)}" aria-label="Agenda de ${esc(n.name)}"><option value="">${lbl}</option>${gCals.filter(c=>c.write).map(c=>`<option value="${esc(c.id)}" ${n.cal===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`:'';
 const cnt=id=>S.tasks.filter(t=>!t.done&&pathOf(t.channel).some(x=>x.id===id)).length;
 const row=(n,extra)=>`<div class="tnode l${n.lvl}" data-node="${esc(n.id)}">${n.lvl===0?`<label class="cdot" style="--c:${esc(n.color)}"><input type="color" data-nc="${esc(n.id)}" value="${esc(n.color)}" aria-label="Couleur de ${esc(n.name)}"></label>`:`<span class="dot" style="--c:${esc(n.color)}"></span>`}<input class="tname" data-nn="${esc(n.id)}" value="${esc(n.name)}" aria-label="Nom">${n.lvl===2?`<input class="tkey" data-nk="${esc(n.id)}" value="${esc(n.key||'')}" placeholder="raccourci" aria-label="Raccourci #">`:''}<span class="mute tcnt">${cnt(n.id)||''}</span>${extra||''}<button class="x" data-act="nodemenu" data-id="${esc(n.id)}" aria-label="Options">⋯</button></div>`;
 return `<div class="tree">${pillars().map(p=>`<div class="tpil">${row(p,calSel(p,'Agenda par défaut'))}${kids(p.id).map(d=>`<div class="tdom">${row(d,calSel(d,'Agenda du pilier'))}<div class="tcats">${kids(d.id).map(c=>row(c,calSel(c,'Agenda du domaine'))).join('')}<button class="sm ghost" data-act="nodeadd" data-id="${esc(d.id)}">+ Catégorie</button></div></div>`).join('')}<button class="sm ghost" data-act="nodeadd" data-id="${esc(p.id)}">+ Domaine</button></div>`).join('')}</div>
 ${gTok()&&!gCals?(loadCals().then(()=>{if(view==='settings')render()}),'<p class="mute">Chargement des agendas…</p>'):!gTok()?'<p class="mute">Connecte Google pour choisir l’agenda de chaque pilier.</p>':''}`;
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
