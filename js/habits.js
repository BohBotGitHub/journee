// Diem — Habitudes (inspiration : Habit Journal de Kurzgesagt)
// Une habitude = un nom, à prendre ou à arrêter, une fréquence, une catégorie de l'Arbre et une icône.
// Historique dans h.log (jour → 1), synchronisé avec le reste (collection « habits »).

const HB_ICONS=[['piano','Piano'],['book','Lecture'],['swim','Natation'],['run','Course'],['muscle','Muscu'],['lotus','Méditation'],['water','Eau'],['sleep','Sommeil'],['lang','Langue'],['pen','Écriture'],['leaf','Nature'],['heart','Soin'],['nophone','Sans écran'],['nosmoke','Sans cigarette'],['spark','Autre']];
const HB_MAX_PILLS=6;
const DOW=['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];

const habits=()=>(S.habits||[]).slice().sort((a,b)=>(a.order||0)-(b.order||0));
const H=id=>(S.habits||[]).find(h=>h.id===id);
const hbDow=d=>parseYmd(d).getDay();
function hbStart(h){const ks=Object.keys(h.log||{}).sort();const c=h.created?ymd(new Date(h.created)):today();return ks[0]&&ks[0]<c?ks[0]:c}
function hbDue(h,d){if(h.paused)return false;if(h.freq==='days')return (h.days||[]).includes(hbDow(d));return true}
const hbDone=(h,d)=>!!(h.log&&h.log[d]);
function hbWeekCount(h,d){const w=monday(d);let n=0;for(let i=0;i<7;i++)if(hbDone(h,addDays(w,i)))n++;return n}
function hbFreqLabel(h){if(h.freq==='week')return (h.n||1)+' fois par semaine';if(h.freq==='days')return (h.days||[]).slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(x=>DOW[x]).join(' ')||'aucun jour';return 'tous les jours'}

// série : jours prévus d'affilée (ou semaines réussies d'affilée pour « X fois par semaine »)
function hbStreak(h){
 const t0=today(),st=hbStart(h);let n=0;
 if(h.freq==='week'){const need=h.n||1;let w=monday(t0);if(hbWeekCount(h,w)>=need)n++;w=addDays(w,-7);
  for(let i=0;i<120&&w>=monday(st);i++,w=addDays(w,-7)){if(hbWeekCount(h,w)>=need)n++;else break}return n}
 let d=t0;if(hbDue(h,d)&&hbDone(h,d))n++;d=addDays(d,-1);
 for(let i=0;i<730&&d>=st;i++,d=addDays(d,-1)){if(!hbDue(h,d))continue;if(hbDone(h,d))n++;else break}
 return n}
const hbStreakLabel=h=>{const n=hbStreak(h);return h.freq==='week'?n+' sem.':n+' j'};

// force 0–100 % : monte doucement quand tu tiens, baisse doucement quand tu rates (un jour manqué ne remet pas à zéro)
function hbForceSeries(h,days){
 const t0=today(),st=hbStart(h),out=[];let s=0;
 if(h.freq==='week'){const a=1-Math.pow(.5,1/4),need=h.n||1;
  for(let w=monday(st);w<=t0;w=addDays(w,7)){const cur=w===monday(t0),c=hbWeekCount(h,w);if(!cur||c>=need)s=s*(1-a)+a*Math.min(1,c/need);out.push([w,Math.round(s*100)])}
 }else{const a=1-Math.pow(.5,1/13);
  for(let d=st;d<=t0;d=addDays(d,1)){if(hbDue(h,d)&&(d<t0||hbDone(h,d)))s=s*(1-a)+a*(hbDone(h,d)?1:0);out.push([d,Math.round(s*100)])}}
 if(days){const from=addDays(t0,-days);return out.filter(x=>x[0]>=from)}return out}
const hbForce=h=>{const s=hbForceSeries(h);return s.length?s[s.length-1][1]:0};

// cocher / décocher une habitude un jour donné (et la tâche liée, s'il y en a une)
function hbSet(h,d,v){h.log=Object.assign({},h.log||{});if(v)h.log[d]=1;else delete h.log[d];
 const t=S.tasks.find(x=>x.habitId===h.id&&x.day===d);if(t&&t.done!==!!v){t.done=!!v;t.doneAt=v?Date.now():null}}
function hbToggle(id,d){const h=H(id);if(!h)return;const v=!hbDone(h,d);hbSet(h,d,v);save();render();if(v){chime(784);emit('habit:done',{habit:h,day:d})}}

// tâches des habitudes « placées dans ma journée » (jours prévus, à partir d'aujourd'hui, sur 7 jours)
function genHabitTasks(){
 const t0=today();let ch=false;
 // « X fois par semaine » : proposée seulement aujourd'hui, tant que l'objectif de la semaine n'est pas atteint
 const wkOpen=h=>hbWeekCount(h,t0)<(h.n||1);
 const live=h=>h&&h.toDay&&h.est>0&&!h.paused;
 for(const h of S.habits||[]){if(!live(h))continue;
  if(h.freq==='week'){
   if(wkOpen(h)&&!hbDone(h,t0)&&!(h.skip||[]).includes(t0)&&!S.tasks.some(t=>t.habitId===h.id&&t.day===t0)){
    S.tasks.push(mk({title:h.name,est:h.est,channel:h.channel||null,day:t0,habitId:h.id,done:false,order:nextOrder(t0)}));ch=true}
   continue}
  for(let i=0;i<7;i++){const d=addDays(t0,i);if(!hbDue(h,d)||(h.skip||[]).includes(d))continue;
   if(S.tasks.some(t=>t.habitId===h.id&&t.day===d))continue;
   S.tasks.push(mk({title:h.name,est:h.est,channel:h.channel||null,day:d,habitId:h.id,done:hbDone(h,d),order:nextOrder(d)}));ch=true}}
 // une habitude qu'on ne place plus dans la journée : ses tâches à venir (non faites) disparaissent
 const keep=t=>{if(!t.habitId)return true;if(t.done||(t.day&&t.day<t0))return true;const h=H(t.habitId);if(!live(h))return false;
  return h.freq==='week'?(t.day===t0&&wkOpen(h)):hbDue(h,t.day)};
 const n0=S.tasks.length;S.tasks=S.tasks.filter(keep);if(S.tasks.length!==n0)ch=true;
 return ch}

/* ---------- vue ---------- */
const hbIcon=(k,cls='')=>`<span class="hbi ${cls}">${ico('hb-'+(k||'spark'))}</span>`;
const hbColor=h=>{const c=h.channel&&ch(h.channel);return c?c.color:'var(--acc)'};
function hbMonthGrid(h,m0){
 const first=m0||today().slice(0,8)+'01',f=parseYmd(first),y=f.getFullYear(),mo=f.getMonth(),nd=new Date(y,mo+1,0).getDate(),lead=(f.getDay()+6)%7,t0=today();
 let cells='';for(let i=0;i<lead;i++)cells+='<i class="hbc pad"></i>';
 for(let k=1;k<=nd;k++){const d=ymd(new Date(y,mo,k)),due=hbDue(h,d),dn=hbDone(h,d),fut=d>t0;
  cells+=`<button class="hbc${dn?' on':''}${due?'':' off'}${d===t0?' today':''}" ${fut?'disabled':''} data-act="hbtog" data-h="${h.id}" data-day="${d}" title="${cap1(fmtDay(d,{weekday:'long',day:'numeric',month:'long'}))}${dn?(h.kind==='quit'?' : tenu':' : fait'):''}" aria-label="${k}">${k}</button>`}
 return `<div class="hbgrid">${['L','M','M','J','V','S','D'].map(x=>`<b>${x}</b>`).join('')}${cells}</div>`}
function hbCard(h){
 const f=hbForce(h),wk=h.freq==='week'?`<span class="hbwk">${hbWeekCount(h,today())}/${h.n||1} cette semaine</span>`:'';
 return `<div class="hbcard${h.paused?' paused':''}" style="--hc:${esc(hbColor(h))}" data-hb="${h.id}" data-sid="${h.id}">${SGRIP}
  <div class="hbtop">${hbIcon(h.icon)}<div class="hbname"><b>${esc(h.name)}</b><small>${h.kind==='quit'?'À arrêter · ':''}${hbFreqLabel(h)}${h.channel?' · '+esc(nodeLabel(h.channel)):''}${h.toDay&&h.est?' · '+fmtMin(h.est)+' dans ta journée':''}${h.paused?' · en pause':''}</small></div>
  <button class="sm ghost" data-act="hbedit" data-h="${h.id}">Modifier</button></div>
  <div class="hbstats"><span><b>${hbStreakLabel(h)}</b> de série</span><span class="hbforce"><b>${f} %</b> de force<i style="--f:${f}%"></i></span>${wk}</div>
  ${hbMonthGrid(h)}</div>`}
function viewHabits(){
 const hs=habits();
 return `<div class="head"><div><h1>Habitudes & routines</h1><div class="sub">De toutes petites étapes, un jour après l’autre. Un jour manqué ne remet pas tout à zéro.</div></div><div class="acts">${(S.habits||[]).length?genieBtn('habits',null,'Ajuster'):''}<button class="pri" data-act="hbnew">${ico('plus')} Nouvelle habitude</button></div></div>
 ${(()=>{const h=structSugHtml(['habit','routine']);return h?`<div class="sugrow"><span class="mute">Suggestions</span>${h}</div>`:''})()}
 ${hs.length?`<div class="hblist" data-sort="hab">${hs.map(hbCard).join('')}</div>`:`<div class="empty"><p><b>Aucune habitude pour l’instant.</b></p><p class="mute">Commence petit : une seule habitude, facile à tenir. Tu pourras l’alléger ou la mettre en pause pendant la revue de la semaine.</p><button class="pri" data-act="hbnew">Créer ma première habitude</button></div>`}
 ${hs.filter(h=>!h.paused).length>HB_MAX_PILLS?`<p class="mute" style="margin-top:14px">Seules les ${HB_MAX_PILLS} premières s’affichent en haut d’Aujourd’hui.</p>`:''}
 ${recListHtml()}
 <div style="margin-top:26px">${tplHtml()}</div>`}
// routines (tâches qui reviennent) : liste, avec leur rythme et leur place dans la journée
function recListHtml(){const rs=S.recurring||[];if(!rs.length)return '';return `<h2 class="prsec" style="margin-top:28px">Routines</h2><div class="reclist" data-sort="rec">${rs.map(r=>`<div class="recrow" data-sid="${r.id}">${SGRIP}<b>${esc(r.title)}</b><span class="mute">${esc((RULES[r.rule]||'').toLowerCase())}${r.rule==='weekly'?' · '+['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'][r.dow||0]:''}${r.est?' · '+fmtMin(r.est):''} · ${esc((RECPOS[r.pos||'bottom']||'').split(' :')[0].toLowerCase())}</span></div>`).join('')}</div>`}

// pastilles en haut d'Aujourd'hui (6 au plus)
function hbPills(d){
 const hs=habits().filter(h=>!h.paused&&(h.freq==='week'||hbDue(h,d))).slice(0,HB_MAX_PILLS);if(!hs.length)return '';
 return `<div class="hbpills" aria-label="Habitudes du jour">${hs.map(h=>{const dn=hbDone(h,d);return `<button class="hbpill${dn?' on':''}" style="--hc:${esc(hbColor(h))}" data-act="hbtog" data-h="${h.id}" data-day="${d}" title="${esc(h.name)}${h.freq==='week'?' · '+hbWeekCount(h,d)+'/'+(h.n||1)+' cette semaine':''} · série ${hbStreakLabel(h)}" ${d>today()?'disabled':''}>${ico('hb-'+(h.icon||'spark'))}<span>${esc(h.name)}</span></button>`}).join('')}<button class="hbpill more" data-act="go" data-v="habits" title="Toutes les habitudes">${ico('right')}</button></div>`}

/* ---------- éditeur ---------- */
let hbDraft=null;
function hbEdit(id){
 const h=id?H(id):null;hbDraft=h?JSON.parse(JSON.stringify(h)):{id:null,name:'',kind:'build',freq:'daily',days:[1,2,3,4,5],n:3,channel:null,icon:'spark',est:0,toDay:false,paused:false};hbEditRender()}
function hbEditRender(){
 const h=hbDraft;
 showModal(`<div class="rit hbed"><div class="mhead"><h2>${h.id?'Modifier l’habitude':'Nouvelle habitude'}</h2><button class="x" data-act="close" aria-label="Fermer">×</button></div>
 <label class="full">Nom<input data-hbf="name" value="${esc(h.name)}" placeholder="Ex. : 5 min de piano" autocomplete="off"></label>
 <div class="seg" role="radiogroup" aria-label="Type"><button class="${h.kind!=='quit'?'on':''}" data-act="hbset" data-k="kind" data-v="build">À prendre</button><button class="${h.kind==='quit'?'on':''}" data-act="hbset" data-k="kind" data-v="quit">À arrêter</button></div>
 <h4>Fréquence</h4>
 <div class="seg"><button class="${h.freq==='daily'?'on':''}" data-act="hbset" data-k="freq" data-v="daily">Tous les jours</button><button class="${h.freq==='days'?'on':''}" data-act="hbset" data-k="freq" data-v="days">Certains jours</button><button class="${h.freq==='week'?'on':''}" data-act="hbset" data-k="freq" data-v="week">X fois par semaine</button></div>
 ${h.freq==='days'?`<div class="hbdays">${[1,2,3,4,5,6,0].map(x=>`<button class="${(h.days||[]).includes(x)?'on':''}" data-act="hbday" data-v="${x}">${DOW[x]}</button>`).join('')}</div>`:''}
 ${h.freq==='week'?`<label>Combien de fois par semaine<input type="number" min="1" max="7" data-hbf="n" value="${h.n||1}"></label>`:''}
 <h4>Catégorie et icône</h4>
 <button type="button" class="catbtn" data-act="hbcat" style="--c:${esc(h.channel&&ch(h.channel)?ch(h.channel).color:'var(--line)')}">${h.channel&&ch(h.channel)?`<span class="chip">${esc(nodeLabel(h.channel))}</span>`:'<span class="mute">Choisir une catégorie…</span>'}<span class="mute">Changer</span></button>
 <div class="hbicons">${HB_ICONS.map(([k,l])=>`<button class="${h.icon===k?'on':''}" data-act="hbset" data-k="icon" data-v="${k}" title="${l}" aria-label="${l}">${ico('hb-'+k)}</button>`).join('')}</div>
 ${h.kind==='quit'?'':`<h4>Dans ma journée</h4>
 <label class="chkrow"><input type="checkbox" data-hbf="toDay" ${h.toDay?'checked':''}> ${h.freq==='week'?'La proposer chaque jour comme une tâche, jusqu’à atteindre l’objectif de la semaine':'La placer comme une tâche les jours prévus'}</label>
 ${h.toDay?`<label>Durée<select data-hbf="est">${[5,10,15,20,30,45,60,90].map(v=>`<option value="${v}" ${v===(h.est||15)?'selected':''}>${fmtMin(v)}</option>`).join('')}</select></label>`:''}`}
 <div class="mfoot">${h.id?`<button class="danger" data-act="hbdel">Supprimer</button><button class="ghost" data-act="hbpause">${h.paused?'Reprendre':'Mettre en pause'}</button>`:''}<span class="sp"></span><button class="pri" data-act="hbsave">${h.id?'Enregistrer':'Créer'}</button></div></div>`);
 setTimeout(()=>{const i=document.querySelector('[data-hbf="name"]');if(i&&!h.name)i.focus()},30)}
function hbSave(){
 const h=hbDraft;if(!h)return;h.name=(h.name||'').trim();if(!h.name){toast('Donne un nom à ton habitude');return}
 if(h.freq==='days'&&!(h.days||[]).length){toast('Choisis au moins un jour');return}
 if(h.kind==='quit'){h.toDay=false}
 if(h.toDay&&!(h.est>0))h.est=15;
 S.habits=S.habits||[];
 if(h.id){const i=S.habits.findIndex(x=>x.id===h.id);if(i>=0)S.habits[i]=Object.assign({},S.habits[i],h)}
 else{h.id=uid();h.created=Date.now();h.log={};h.skip=[];h.order=Math.max(0,...S.habits.map(x=>x.order||0))+1;if(!h.channel&&typeof catGuess==='function')h.channel=catGuess(h.name);S.habits.push(h)}
 // les tâches à venir suivent le nouveau nom, la durée et la catégorie
 S.tasks.filter(t=>t.habitId===h.id&&!t.done&&t.day>=today()).forEach(t=>{t.title=h.name;t.est=h.est||t.est;t.channel=h.channel||t.channel});
 hbDraft=null;genHabitTasks();save();closeModal();render();toast('Habitude enregistrée')}
function hbDelete(){const h=hbDraft;if(!h||!h.id)return;const pre=undoSnap();S.habits=(S.habits||[]).filter(x=>x.id!==h.id);S.tasks=S.tasks.filter(t=>!(t.habitId===h.id&&!t.done&&t.day>=today()));undoCommit(pre,'hbdel');hbDraft=null;save();closeModal();render();toast('Habitude supprimée · ⌘/Ctrl Z pour annuler')}

/* ---------- revue de la semaine : garder, alléger, pause ---------- */
function hbReviewHtml(w){
 const hs=habits().filter(h=>!h.paused||Object.keys(h.log||{}).length);if(!hs.length)return '<p class="mute">Pas encore d’habitude. Tu peux en créer une depuis la page Habitudes.</p>';
 const days=[...Array(7)].map((_,i)=>addDays(w,i));
 return `<div class="hbrev">${hs.map(h=>{const c=h.freq==='week'?hbWeekCount(h,w):days.filter(d=>hbDone(h,d)).length,due=h.freq==='week'?(h.n||1):days.filter(d=>hbDue(h,d)).length;
  return `<div class="hbrrow" style="--hc:${esc(hbColor(h))}">${hbIcon(h.icon)}<div class="hbname"><b>${esc(h.name)}</b><small>${c}/${due} cette semaine · série ${hbStreakLabel(h)} · force ${hbForce(h)} %${h.paused?' · en pause':''}</small></div>
  <div class="hbweek">${days.map(d=>`<i class="${hbDone(h,d)?'on':''}${hbDue(h,d)||h.freq==='week'?'':' off'}" title="${cap1(fmtDay(d,{weekday:'long'}))}"></i>`).join('')}</div>
  <div class="hbacts"><button class="sm" data-act="hbkeep" data-h="${h.id}">Garder</button><button class="sm" data-act="hblight" data-h="${h.id}">Alléger</button><button class="sm ghost" data-act="hbpz" data-h="${h.id}">${h.paused?'Reprendre':'Pause'}</button></div></div>`}).join('')}</div>`}
// alléger : moins souvent ou plus court
function hbLighten(id){const h=H(id);if(!h)return;let msg='';
 if(h.toDay&&h.est>5){h.est=Math.max(5,Math.round(h.est/2/5)*5);msg='plus court : '+fmtMin(h.est);S.tasks.filter(t=>t.habitId===h.id&&!t.done&&t.day>=today()).forEach(t=>t.est=h.est)}
 else if(h.freq==='week'&&(h.n||1)>1){h.n--;msg=h.n+' fois par semaine'}
 else if(h.freq==='daily'){h.freq='week';h.n=5;msg='5 fois par semaine'}
 else if(h.freq==='days'&&(h.days||[]).length>1){h.days=h.days.slice(0,-1);msg=hbFreqLabel(h)}
 else msg='déjà au plus léger';
 genHabitTasks();save();if(ritual)renderRitual();else render();toast('« '+h.name+' » allégée : '+msg)}

/* ---------- statistiques : force sur 3 mois ---------- */
function hbStatsHtml(){
 const hs=habits();if(!hs.length)return '';
 const W=260,Hh=44;
 return `<h2 style="font-size:18px;margin:28px 0 6px">Habitudes : force sur 3 mois</h2><div class="hbstat">${hs.map(h=>{const s=hbForceSeries(h,92);if(!s.length)return '';
  const n=s.length,pts=s.map(([,v],i)=>`${(n>1?i/(n-1):1)*W},${Hh-v/100*Hh}`).join(' ');
  return `<div class="hbsrow" style="--hc:${esc(hbColor(h))}">${hbIcon(h.icon)}<span class="hbsn">${esc(h.name)}</span><svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" preserveAspectRatio="none" aria-label="Force de ${esc(h.name)}"><polyline points="0,${Hh} ${pts} ${W},${Hh}" class="area"/><polyline points="${pts}" class="ln"/></svg><b>${hbForce(h)} %</b><small>série ${hbStreakLabel(h)}</small></div>`}).join('')}</div>`}
