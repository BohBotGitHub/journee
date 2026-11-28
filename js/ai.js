// Diem — assistant Claude
/* ---------- assistant Claude (API Anthropic, clé de l'utilisateur) ---------- */
let modalAI=null,aiBusy=false,aiUnread=0,aiQueue=new Set(),aiT=null;
const aiOn=()=>!!(S.settings.aiKey||'').trim();
const AI_TOOL={name:'proposer',description:'Propose des changements concrets au planning de l’utilisateur. Utilise uniquement des ids de tâches existants pour order et updates.',input_schema:{type:'object',properties:{
 message:{type:'string',description:'Réponse courte à l’utilisateur, en français, au tutoiement.'},
 order:{type:'array',items:{type:'string'},description:'Ids des tâches non terminées du jour, dans l’ordre conseillé.'},
 updates:{type:'array',items:{type:'object',properties:{id:{type:'string'},title:{type:'string',description:'Nouveau titre'},channel:{type:'string',description:'Catégorie existante, au format « Domaine › Catégorie »'},est:{type:'integer',description:'Durée estimée en minutes'},day:{type:'string',description:'YYYY-MM-DD, ou backlog (aussi pour écarter une tâche obsolète : tu ne supprimes jamais rien)'},at:{type:'string',description:'HH:MM : heure fixe ce jour-là'},prio:{type:'string',enum:['high','low','none']},due:{type:'string',description:'YYYY-MM-DD, ou none'},done:{type:'boolean',description:'Cocher (true) ou rouvrir (false)'},project:{type:'string',description:'Nom d’un projet existant ou créé dans la même réponse, ou none'},where:{type:'string',enum:['home','out','any']},notes:{type:'string',description:'Texte ajouté aux notes'},repeat:{type:'string',enum:['daily','weekdays','weekly','monthly','none'],description:'En faire une routine (ou l’arrêter)'},phare:{type:'boolean',description:'En faire la tâche phare de son jour'},subtasks:{type:'array',items:{type:'string'},description:'Sous-tâches à ajouter'},reason:{type:'string'}},required:['id']}},
 new_items:{type:'array',items:{type:'object',properties:{type:{type:'string',enum:['task','project','routine','habit']},title:{type:'string'},name:{type:'string'},quick:{type:'string',description:'Tâche en syntaxe rapide Diem'},est:{type:'integer'},day:{type:'string'},at:{type:'string'},due:{type:'string'},cat:{type:'string'},project:{type:'string'},prio:{type:'string'},notes:{type:'string'},subtasks:{type:'array',items:{type:'string'}},end:{type:'string'},tasks:{type:'array',items:{type:'string'}},rule:{type:'string',enum:['daily','weekdays','weekly','monthly']},dow:{type:'string'},kind:{type:'string',enum:['build','quit']},freq:{type:'string',enum:['daily','days','week']},days:{type:'array',items:{type:'string'}},n:{type:'integer'},icon:{type:'string'},toDay:{type:'boolean'},reason:{type:'string'}},required:['type']},description:'Créer des tâches détaillées, projets, routines (tâches qui reviennent) ou habitudes'},
 habit_checks:{type:'array',items:{type:'object',properties:{habit:{type:'string',description:'Nom de l’habitude'},day:{type:'string'},done:{type:'boolean'}},required:['habit']},description:'Cocher ou décocher une habitude un jour donné'},
 objectives:{type:'array',items:{type:'string'},description:'Objectifs de la semaine à ajouter'},
 day_hours:{type:'object',properties:{start:{type:'string'},end:{type:'string'}},description:'Heures de début et de fin du jour affiché (HH:MM)'},
 focus:{type:'string',description:'Id d’une tâche dont lancer le focus maintenant'},
 pick:{type:'array',items:{type:'string'},description:'Ids de tâches existantes (backlog, autres jours) à ajouter au jour affiché'},
 blocks:{type:'array',items:{type:'object',properties:{id:{type:'string'},start:{type:'string',description:'HH:MM'}},required:['id','start']},description:'Créneaux horaires proposés pour des tâches du jour'},
 intent:{type:'string',description:'Intention courte pour la journée'}
},required:['message']}};
let aiScope='';
function aiContext(){
 if(aiScope&&GENIE_CTX[aiScope])return GENIE_CTX[aiScope]();
 const d=cur,t0=today(),now=new Date(),line=t=>`- [${t.id}] ${t.title}${t.prio?' | priorité '+t.prio:''}${t.est?' | '+t.est+' min':' | sans durée'}${ch(t.channel)?' | catégorie '+nodeLabel(t.channel):' | sans catégorie'}${t.block?' | créneau '+hm(new Date(t.block.start)):''}${t.done?' | FAITE':''}${t.src?' | To Do':''}${t.due?' | échéance '+t.due:''}`;
 const hist=S.tasks.filter(t=>t.done&&t.day&&t.day>=addDays(t0,-14)&&t.est&&t.actual).slice(-25).map(t=>`- ${t.title} : estimé ${t.est} min, réel ${Math.round(t.actual/60)} min`);
 const meet=timedEvents(d).map(e=>`- ${hm(new Date(e.start.dateTime))}–${hm(new Date(e.end.dateTime))} ${e.summary||'(sans titre)'} (${evFree(e)?'compatible avec du travail sur les tâches':'occupé'})`);
 const wk=monday(d),days=[...Array(7)].map((_,i)=>addDays(wk,i));
 return `Maintenant : ${cap1(fmtDay(t0))}, ${hm(now)}. Jour affiché : ${fmtDay(d)} (${d}).
Heures de travail : ${S.settings.workStart}h–${S.settings.workEnd}h.
${hasTree()?'Catégories (pilier / domaine, puis domaine › catégorie) :\n'+catPaths().join('\n'):'Catégories : '+(S.channels.map(c=>c.name).join(', ')||'aucun')}.${activeProjects().length?'\nProjets en cours : '+activeProjects().map(p=>p.name+(p.end?' (fin '+p.end+')':'')).join(', '):''}
${(S.days[d]||{}).intent?'Intention du jour : '+S.days[d].intent+'\n':''}Réunions du jour :\n${meet.join('\n')||'- aucune connue'}
Tâches du jour :\n${dayTasks(d).map(line).join('\n')||'- aucune'}
En retard (jours précédents) :\n${pastUndone().slice(0,15).map(t=>line(t)+' | prévue le '+t.day).join('\n')||'- rien'}
Reste de la semaine :\n${days.filter(x=>x!==d&&x>=t0).map(x=>dayTasks(x).filter(t=>!t.done).map(t=>line(t)+' | '+x).join('\n')).filter(Boolean).join('\n')||'- rien'}
Backlog :\n${S.tasks.filter(t=>!t.day&&!t.done).slice(0,40).map(line).join('\n')||'- vide'}
Habitudes :\n${(S.habits||[]).filter(h=>!h.paused).map(h=>'- '+h.name+(h.kind==='quit'?' (à arrêter)':'')+(hbDone(h,d)?' | faite ce jour':'')).join('\n')||'- aucune'}\nRoutines :\n${S.recurring.map(r=>'- '+r.title+' ('+(RULES[r.rule]||r.rule||'').toLowerCase()+')').join('\n')||'- aucune'}\nHistorique estimé/réel :\n${hist.join('\n')||'- pas encore de données'}
Habitudes passées (archive, durée réelle moyenne) :\n${archivePatterns()||'- aucune'}`;
}
const AI_SYS=`Tu es Claude, l'assistant de planification intégré à l'appli « Diem » (équivalent de Sunsama). Tu aides l'utilisateur à organiser son temps : ordre des tâches, catégorie, durée réaliste, répartition dans la semaine, et nouvelles tâches utiles (préparer une rendez-vous, un suivi, une étape vers un objectif de la semaine).
Règles :
- Français, tutoiement, ton chaleureux et direct, réponses courtes (3-6 phrases max).
- Sois réaliste : tâches + rendez-vous ne doivent pas dépasser les heures de travail ; s'il y a trop, propose de reporter (updates avec day) plutôt que d'entasser.
- Ordre conseillé : tâches importantes et exigeantes tôt, petites tâches entre les rendez-vous, liées aux projets en cours en priorité.
- Pour créer quoi que ce soit (tâche, projet avec ses tâches, routine, habitude), utilise new_items.
- Durées : appuie-toi sur l'historique estimé/réel quand il existe (si l'utilisateur sous-estime, corrige).
- Catégories : uniquement des noms de la liste fournie.
- Échéances : une tâche doit être planifiée avant sa date d’échéance ; signale celles qui sont menacées.
- Nouvelles tâches non demandées : maximum 3, seulement si vraiment utiles, avec une raison courte.
- Tu peux proposer toutes les actions de l’appli sauf les réglages et les suppressions : créer (new_items : tâches détaillées, projets, routines, habitudes), modifier une tâche (titre, jour, heure fixe, durée, catégorie, priorité, échéance, projet, lieu, notes, sous-tâches, routine, tâche phare, cocher), réordonner, cocher une habitude, objectifs de la semaine, heures du jour, lancer un focus. Tu ne supprimes jamais rien : pour écarter une tâche, envoie-la au backlog.
- Dès que tu suggères un changement concret, utilise l'outil « proposer » : l'utilisateur validera chaque élément. Ne prétends jamais avoir modifié quelque chose toi-même.`;
// coût en dollars par million de jetons (tarifs publics Anthropic ; Haiku : prompts ≤ 100 000 jetons)
const PRICES={'claude-haiku-5-5':[0.10,0.50],'claude-sonnet-5-5':[2,10]};
const monthKey=()=>today().slice(0,7);
function usageNow(){let u=S.aiUsage||{};if(u.m!==monthKey())u={m:monthKey(),usd:0,calls:0,inT:0,outT:0};return u}
function trackUsage(us,model){if(!us)return;const u=usageNow(),[pi,po]=PRICES[model]||PRICES['claude-haiku-5-5'];const inT=(us.input_tokens||0)+(us.cache_creation_input_tokens||0)+(us.cache_read_input_tokens||0);u.inT+=inT;u.outT+=us.output_tokens||0;u.calls++;u.usd+=inT/1e6*pi+(us.output_tokens||0)/1e6*po;S.aiUsage=u;save();const el=document.querySelector('[data-live="aicost"]');if(el)el.textContent=costTxt()}
const usd=v=>v<0.01?'< 0,01 $':v.toFixed(2).replace('.',',')+' $';
function costTxt(){const u=usageNow(),b=+S.settings.aiBudget||0;return `Ce mois-ci : ${usd(u.usd)}${b?' sur '+usd(b):''} · ${u.calls} requête${u.calls>1?'s':''}`}
async function callClaude(messages,force,big){
 {const b=+S.settings.aiBudget||0;if(b&&usageNow().usd>=b)throw new Error(`plafond mensuel atteint (${usd(b)}) — modifiable dans Réglages`)}
 const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':S.settings.aiKey.trim(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
  body:JSON.stringify({model:S.settings.aiModel||'claude-haiku-5-5',max_tokens:big?6000:3000,system:[{type:'text',text:AI_SYS,cache_control:{type:'ephemeral'}},...(force?[{type:'text',text:'Pour cette demande, réponds obligatoirement en appelant l’outil « proposer ».'}]:[])],tools:[Object.assign({},AI_TOOL,{cache_control:{type:'ephemeral'}})],tool_choice:{type:'auto'},messages})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(r.status===401?'clé API refusée':(j.error&&j.error.message)||('erreur '+r.status));
 trackUsage(j.usage,S.settings.aiModel||'claude-haiku-5-5');
 let text='',prop=null;
 for(const b of j.content||[]){if(b.type==='text')text+=b.text;if(b.type==='tool_use'&&b.name==='proposer')prop=b.input}
 if(prop&&prop.message){text=(text?text+'\n':'')+prop.message}
 return{text:text.trim(),prop,cut:j.stop_reason==='max_tokens'};
}
// réponse JSON libre (sans outil), pour les traitements en lot
async function claudeJSON(prompt){
 {const b=+S.settings.aiBudget||0;if(b&&usageNow().usd>=b)throw new Error(`plafond mensuel atteint (${usd(b)})`)}
 const model=S.settings.aiModel||'claude-haiku-5-5';
 const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':S.settings.aiKey.trim(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
  body:JSON.stringify({model,max_tokens:4000,messages:[{role:'user',content:prompt}]})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(r.status===401?'clé API refusée':(j.error&&j.error.message)||('erreur '+r.status));
 trackUsage(j.usage,model);
 const txt=(j.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
 const m=txt.match(/\{[\s\S]*\}/);try{return m?JSON.parse(m[0]):{}}catch(e){return {}}
}
function propItems(p){
 if(!p)return[];const out=[];
 const tt=id=>{const t=T(id);return t?t.title:null};
 if(p.order&&p.order.filter(tt).length>1)out.push({k:'order',label:'Réordonner : '+p.order.filter(tt).map(tt).join(' → ')});
 (p.updates||[]).forEach((u,i)=>{const t=T(u.id);if(!t)return;if(u.drop){out.push({k:'u'+i,label:'Au backlog : '+t.title,reason:u.reason});return}const parts=[];if(u.title&&u.title!==t.title)parts.push('renommer en « '+u.title+' »');if(u.done===true)parts.push('cocher');if(u.done===false)parts.push('rouvrir');if(u.at)parts.push('à '+u.at);if(u.prio)parts.push(u.prio==='none'?'priorité normale':'priorité '+(u.prio==='high'?'haute':'basse'));if(u.due)parts.push(u.due==='none'?'sans échéance':'échéance '+fmtDay(u.due,{day:'numeric',month:'short'}));if(u.project)parts.push(u.project==='none'?'hors projet':'projet '+u.project);if(u.where)parts.push({home:'chez moi',out:'dehors',any:'partout'}[u.where]||'');if(u.repeat)parts.push(u.repeat==='none'?'ne plus répéter':'répéter : '+(RULES[u.repeat]||u.repeat).toLowerCase());if(u.phare)parts.push('tâche phare');if(u.notes)parts.push('note');if(u.subtasks&&u.subtasks.length)parts.push('sous-tâches : '+u.subtasks.join(', '));if(u.channel)parts.push('catégorie '+u.channel);if(u.est)parts.push(fmtMin(u.est));if(u.day)parts.push(u.day==='backlog'?'au backlog':'le '+fmtDay(u.day,{weekday:'long',day:'numeric'}));if(parts.length)out.push({k:'u'+i,label:t.title+' : '+parts.join(', '),reason:u.reason})});
 (p.pick||[]).forEach((id,i)=>{const t=T(id);if(t&&t.day!==cur&&!t.done)out.push({k:'p'+i,label:'Ajouter au jour : '+t.title+(t.est?' ('+fmtMin(t.est)+')':'')})});
 (p.blocks||[]).forEach((b,i)=>{const t=T(b.id);if(t&&/^\d{1,2}:\d{2}$/.test(b.start||''))out.push({k:'b'+i,label:'Créneau '+b.start+' : '+t.title})});
 if(p.intent)out.push({k:'i',label:'Intention : '+p.intent});
 (p.objectives||[]).forEach((o,i)=>{if(o)out.push({k:'o'+i,label:'Objectif : '+o})});
 (p.new_projects||[]).forEach((n,i)=>{if(n.name)out.push({k:'j'+i,label:'Nouveau projet : '+n.name+(n.end?' (fin '+fmtDay(n.end,{day:'numeric',month:'short'})+')':'')+(n.tasks&&n.tasks.length?' · '+n.tasks.length+' tâche'+(n.tasks.length>1?'s':''):'')})});
 (p.cx||[]).forEach((it,i)=>out.push({k:'x'+i,label:ixLabel(it),reason:it.reason}));
 (p.new_items||[]).forEach((it,i)=>{if(it&&(it.title||it.name||it.quick))out.push({k:'y'+i,label:ixLabel(it),reason:it.reason})});
 (p.habit_checks||[]).forEach((c,i)=>{const h=hbByName(c.habit);if(h)out.push({k:'h'+i,label:(c.done===false?'Décocher':'Cocher')+' l’habitude : '+h.name+(c.day&&c.day!==today()?' ('+fmtDay(c.day,{weekday:'short',day:'numeric'})+')':'')})});
 if(p.day_hours&&(p.day_hours.start||p.day_hours.end))out.push({k:'dh',label:'Heures du jour : '+(p.day_hours.start||hhmm(dayHours(cur).s))+' → '+(p.day_hours.end||hhmm(dayHours(cur).end))});
 if(p.focus&&T(p.focus))out.push({k:'f',label:'Lancer le focus : '+T(p.focus).title});
 (p.new_tasks||[]).forEach((n,i)=>{if(n.title)out.push({k:'n'+i,label:'Nouvelle tâche : '+n.title+(n.est?' ('+fmtMin(n.est)+')':''),reason:n.reason})});
 return out;
}
const chByName=n=>n?nodeByName(n):null;
const hbByName=n=>{if(!n)return null;const q=norm(String(n));return (S.habits||[]).find(h=>h.id===n||norm(h.name)===q)||(S.habits||[]).find(h=>norm(h.name).includes(q))||null};
function applyItem(m,k){
 const p=m.prop;if(!p)return;m.applied=m.applied||{};if(m.applied[k])return;
 if(k==='order'){const ids=p.order.filter(id=>T(id));ids.forEach((id,i)=>{T(id).order=i+1});const rest=dayTasks(cur).filter(t=>!ids.includes(t.id));rest.forEach((t,i)=>t.order=ids.length+i+1);reflow(cur)}
 else if(k[0]==='p'){const t=T(p.pick[+k.slice(1)]);if(t)moveTask(t.id,cur,true)}
 else if(k[0]==='b'){const b=p.blocks[+k.slice(1)],t=b&&T(b.id);if(t){const[hh,mm]=b.start.split(':').map(Number),dt=parseYmd(cur);dt.setHours(hh,mm,0,0);if(t.day!==cur)moveTask(t.id,cur,true);t.pinned=true;setBlock(t,dt,true)}}
 else if(k==='i'){S.days[cur]=Object.assign(S.days[cur]||{},{intent:p.intent})}
 else if(k[0]==='o'){const o=p.objectives[+k.slice(1)];if(o)S.objectives.push({id:uid(),week:monday(cur),title:o,done:false})}
 else if(k[0]==='u'&&p.updates[+k.slice(1)]&&p.updates[+k.slice(1)].drop){const t=T(p.updates[+k.slice(1)].id);if(t)moveTask(t.id,'backlog',true)}
 else if(k[0]==='u'){const u=p.updates[+k.slice(1)],t=u&&T(u.id);if(t){if(u.subtasks)u.subtasks.forEach(x=>t.subtasks.push({id:uid(),t:x,d:false}));subShow(t.id);const c=chByName(u.channel);if(c)t.channel=c.id;if(u.est)t.est=u.est;if(u.day){moveTask(t.id,u.day==='backlog'?'backlog':u.day,true)}
  if(u.title)t.title=u.title;if(u.prio)t.prio=u.prio==='none'?'':u.prio;if(u.due)t.due=u.due==='none'?null:(/^\d{4}-\d{2}-\d{2}$/.test(u.due)?u.due:t.due);
  if(u.project){const pj=u.project==='none'?null:findProject(u.project);t.proj=pj?pj.id:null}if(u.where)t.where=u.where;if(u.notes)t.notes=(t.notes?t.notes+'\n':'')+u.notes;
  if(u.repeat){setRecur(t,u.repeat==='none'?'':u.repeat)}if(u.phare&&t.day)S.days[t.day]=Object.assign(S.days[t.day]||{},{phare:t.id});
  if(u.at&&/^\d{1,2}:\d{2}$/.test(u.at)&&typeof setBlock==='function'){const d=t.day||cur;if(!t.day)moveTask(t.id,d,true);const[hh,mm]=u.at.split(':').map(Number),dt=parseYmd(d);dt.setHours(hh,mm,0,0);t.pinned=true;setBlock(t,dt,true)}
  if(typeof u.done==='boolean'&&u.done!==!!t.done)toggleDone(t.id);
  t.aiSug=null}}
 else if(k[0]==='j'){const n=p.new_projects[+k.slice(1)];if(n){S.projects=S.projects||[];const pj={id:uid(),name:n.name,end:/^\d{4}-\d{2}-\d{2}$/.test(n.end||'')?n.end:null,done:false};S.projects.push(pj);(n.tasks||[]).forEach(tt=>{if(tt)S.tasks.push(mk({title:tt,est:0,day:null,order:nextOrder(null),proj:pj.id}))})}}
 else if(k[0]==='y'){const it=p.new_items[+k.slice(1)];if(it){ixApplyOne(it,uid());genRecurring()}}
 else if(k[0]==='h'){const c=p.habit_checks[+k.slice(1)],h=c&&hbByName(c.habit);if(h)hbSet(h,/^\d{4}-\d{2}-\d{2}$/.test(c.day||'')?c.day:today(),c.done===false?0:1)}
 else if(k==='dh'){const v=x=>{const[a,b]=String(x||'').split(':').map(Number);return isNaN(a)?null:a+(b||0)/60},hs=v(p.day_hours.start),he=v(p.day_hours.end);S.days[cur]=Object.assign(S.days[cur]||{},{hs:hs!=null?hs:dayHours(cur).s,he:he!=null?he:dayHours(cur).end});if(flowOn())reflow(cur)}
 else if(k==='f'){const t=T(p.focus);if(t){m.applied[k]=true;save();openFocus(t.id);return}}
 else if(k[0]==='x'){const it=p.cx[+k.slice(1)];if(it){ixApplyOne(it,(p.cxBase||'cx')+'-'+k.slice(1));genRecurring()}}
 else if(k[0]==='n'){const n=p.new_tasks[+k.slice(1)];if(n){const day=n.day==='backlog'?null:(n.day||cur);const c=chByName(n.channel);S.tasks.push(mk({title:n.title,est:n.est||0,channel:c?c.id:null,day,order:nextOrder(day)}))}}
 m.applied[k]=true;save();render();
}
async function aiAsk(text,force,sendText){
 if(!aiOn()){sideTab='ai';renderSide();toast('Ajoute ta clé API Anthropic dans Réglages');return}
 if(aiBusy)return;aiBusy=true;
 if(text)S.chat.push({role:'user',text,at:Date.now()});
 S.chat=S.chat.slice(-30);save();renderSide();
 // l'historique renvoyé au Génie : ses propositions résumées, jamais une réponse vide (sinon il finit par l'imiter)
 const hist=S.chat.slice(-4).filter(m=>!m.empty&&!(m.role==='assistant'&&/^Voici mes propositions\.?$/.test(m.text||'')&&!propItems(m.prop).length)).map(m=>{if(m.role!=='assistant')return{role:m.role,content:m.text};const it=propItems(m.prop).map(x=>'- '+x.label).join('\n');return{role:'assistant',content:[m.text,it].filter(Boolean).join('\n')}}).filter(m=>m.content&&m.content.trim());
 while(hist.length&&hist[0].role!=='user')hist.shift();
 const last=hist[hist.length-1];if(!last||last.role!=='user')hist.push({role:'user',content:'Regarde ma journée et propose-moi une organisation.'});
 hist[hist.length-1]={role:'user',content:`<contexte>\n${aiContext()}\n</contexte>\n\n${sendText||hist[hist.length-1].content}`};
 try{let r=await callClaude(hist,force);
  // réponse coupée ou vide : on réessaie une fois, avec plus de place et l'outil obligatoire
  if(r.cut||(!r.text&&!propItems(r.prop).length))r=await callClaude(hist,true,true);
  const items=propItems(r.prop);
  if(!r.text&&!items.length)S.chat.push({role:'assistant',empty:true,text:r.cut?'Ma réponse était trop longue et a été coupée. Demande-moi une partie à la fois (par exemple seulement l’ordre de la journée).':'Je n’ai rien trouvé d’utile à te proposer cette fois. Reformule ta demande ou précise ce que tu veux changer.',at:Date.now()});
  else S.chat.push({role:'assistant',text:r.text||(items.length>1?'Voici '+items.length+' propositions.':'Voici une proposition.'),prop:r.prop,at:Date.now()});
  if(sideTab!=='ai'||document.body.classList.contains('side-open')===false&&innerWidth<=1100){aiUnread++}}
 catch(e){S.chat.push({role:'assistant',text:'Je n’ai pas pu répondre : '+e.message,at:Date.now()})}
 finally{aiBusy=false;S.chat=S.chat.slice(-30);save();renderSide();renderBadge()}
}
function renderBadge(){const b=$('#aibadge');if(b)b.innerHTML=aiUnread?`<span class="badge">${aiUnread}</span>`:''}
// en sous-marin : catégorie et durée des nouvelles tâches
function aiWatch(t){return;if(!aiOn()||!t||(t.est&&t.channel))return;aiQueue.add(t.id);clearTimeout(aiT);aiT=setTimeout(aiClassify,2500)}
async function aiClassify(){
 const ids=[...aiQueue].filter(id=>T(id));aiQueue.clear();if(!ids.length||!aiOn())return;
 try{const r=await callClaude([{role:'user',content:`<contexte>\n${aiContext()}\n</contexte>\n\nPour ces tâches uniquement, propose une catégorie (format « Domaine › Catégorie ») et une durée (updates, sans order ni new_tasks, message très court) : ${ids.map(id=>'['+id+'] '+T(id).title).join(' ; ')}`}],true);
  (r.prop&&r.prop.updates||[]).forEach(u=>{const t=T(u.id);if(!t||t.done)return;const c=chByName(u.channel);const sug={};if(c&&!t.channel){t.channel=c.id;t.aiCat=true;if(t.block)pushBlock(t)}else if(c&&c.id!==t.channel&&!t.aiCat)sug.channel=c.id;if(u.est&&!t.est)sug.est=u.est;if(sug.channel||sug.est)t.aiSug=sug});
  save();render();
 }catch(e){}
}
// en sous-marin : revue du matin, une fois par jour
function aiMorning(){return;
 const d=today();if(!aiOn()||!S.settings.aiAuto||cur!==d||(S.days[d]||{}).aiDone)return;
 S.days[d]=Object.assign(S.days[d]||{},{aiDone:true});save();
 setTimeout(()=>aiAsk('Bonjour ! Regarde ma journée : propose un ordre, complète les catégories et durées manquantes, signale si je suis surchargé, et suggère au besoin 1 à 3 tâches utiles.',true),gTok()?2500:500);
}
function viewAI(){
 if(!aiOn()&&!(S.chat||[]).some(m=>m.from==='claude'))return `<div class="sinfo"><b>Le Génie, ton assistant de planification (propulsé par Claude)</b><span>Il propose l’ordre de tes tâches, leur catégorie et leur durée, repère quand tu es surchargé et suggère des tâches utiles. Tu valides chaque proposition.</span><span>Il faut une clé API Anthropic (payée à l’usage, quelques euros par mois). Crée-la sur console.anthropic.com, puis colle-la dans Réglages.</span><button class="pri" data-act="goset">Ouvrir les réglages</button></div>`;
 const msgs=S.chat.map((m,mi)=>{const items=m.role==='assistant'?propItems(m.prop):[];const ap=m.applied||{};
  return `<div class="msg ${m.role==='user'?'u':'a'}">${esc(m.text)}${items.length?`<div class="prop">${items.map(it=>`<div class="pitem${ap[it.k]?' ok':''}"><div>${esc(it.label)}${it.reason?`<small class="mute">${esc(it.reason)}</small>`:''}</div>${ap[it.k]?'<small>Fait</small>':`<button class="sm pri" data-act="aiapply" data-m="${mi}" data-k="${it.k}">Appliquer</button>`}</div>`).join('')}${items.filter(it=>!ap[it.k]).length>1?`<button class="sm" data-act="aiapplyall" data-m="${mi}">Tout appliquer</button>`:''}</div>`:''}</div>`}).join('');
 return `<div class="chat">${msgs||'<div class="sinfo" style="padding:0"><span>Demande-moi d’organiser ta journée, ou pose une question.</span></div>'}</div>
 ${aiBusy?`<div class="thinking gthink">${LAMP_SVG}Le Génie réfléchit…</div>`:''}
 <div class="aibar">${mailOn()?`<button data-act="mailsort" ${aiBusy?'disabled':''}>${ico('mail')}Trier mes mails</button>`:''}<button data-act="aiq" data-q="Organise ma journée : ordre, durées et catégories.">Organise ma journée</button><button data-act="aiq" data-q="Qu’est-ce que j’oublie cette semaine ? Suggère des tâches.">Qu’est-ce que j’oublie ?</button><button data-act="aiq" data-q="Je suis débordé, aide-moi à alléger ma journée.">Je suis débordé</button><button data-act="aiq" data-q="Répartis mon backlog sur la semaine.">Répartis mon backlog</button></div>
 <div class="sinfo" style="padding:0 14px 6px;font-size:12px" data-live="aicost">${costTxt()}</div>
 <form class="aiform" data-form="ai"><textarea name="t" data-keep="ai" rows="1" placeholder="Écris au Génie…" aria-label="Message au Génie"></textarea><button class="pri" type="submit">Envoyer</button></form>`;
}

/* ---------- le Génie à chaque endroit (v3.0) : un seul appel, un contexte limité à l'endroit ---------- */
const tline=t=>`- [${t.id}] ${t.title}${t.prio?' | priorité '+t.prio:''}${t.est?' | '+t.est+' min':' | sans durée'}${ch(t.channel)?' | '+nodeLabel(t.channel):''}${t.block?' | '+hm(new Date(t.block.start)):''}${t.due?' | échéance '+t.due:''}${t.done?' | FAITE':''}`;
const ctxHead=()=>`Maintenant : ${cap1(fmtDay(today()))}, ${hm(new Date())}. Jour affiché : ${cur}.\n${hasTree()?'Catégories :\n'+catPaths().join('\n'):'Catégories : '+(S.channels.map(c=>c.name).join(', ')||'aucune')}${activeProjects().length?'\nProjets en cours : '+activeProjects().map(p=>p.name+(p.end?' (fin '+p.end+')':'')).join(', '):''}`;
const dayLine=x=>{const L=loadInfo(x);return `${x} (${fmtDay(x,{weekday:'long'})}) : ${fmtMin(L.task)} de tâches, ${fmtMin(L.meet)} de rendez-vous, ${fmtMin(L.cap)} disponibles`};
const GENIE_CTX={
 add:()=>`${ctxHead()}\nHabitudes : ${(S.habits||[]).map(h=>h.name).join(', ')||'aucune'}\nRoutines : ${S.recurring.map(r=>r.title).join(', ')||'aucune'}\nCharge des 7 prochains jours :\n${[...Array(7)].map((_,i)=>dayLine(addDays(today(),i))).join('\n')}`,
 day:()=>{const d=cur;return `${ctxHead()}\n${dayLine(d)}\nHeures : ${hhmm(dayHours(d).s)}–${hhmm(dayHours(d).end)}\nRendez-vous :\n${timedEvents(d).map(e=>`- ${hm(new Date(e.start.dateTime))}–${hm(new Date(e.end.dateTime))} ${e.summary||''}${evFree(e)?' (compatible)':''}`).join('\n')||'- aucun'}\nTâches du jour :\n${dayTasks(d).map(tline).join('\n')||'- aucune'}\nEn retard :\n${pastUndone().slice(0,6).map(tline).join('\n')||'- rien'}\nPlus tard (extrait) :\n${S.tasks.filter(t=>!t.day&&!t.done).slice(0,12).map(tline).join('\n')||'- vide'}`},
 task:()=>{const t=T(GENIE_ID);if(!t)return ctxHead();return `${ctxHead()}\nTâche :\n${tline(t)}\nSous-tâches : ${(t.subtasks||[]).map(x=>x.t).join(' ; ')||'aucune'}\nNotes : ${t.notes||'aucune'}\n${t.day?dayLine(t.day):'Sans date'}\nDurées réelles de tâches proches : ${S.tasks.filter(x=>x.done&&x.actual&&x.channel===t.channel).slice(-5).map(x=>x.title+' '+Math.round(x.actual/60)+' min').join(' ; ')||'aucune'}`},
 week:()=>{const w=monday(cur),ds=[...Array(7)].map((_,i)=>addDays(w,i));return `${ctxHead()}\nSemaine du ${w} :\n${ds.map(x=>dayLine(x)+'\n'+dayTasks(x).filter(t=>!t.done).map(tline).join('\n')).join('\n')}`},
 backlog:()=>`${ctxHead()}\nPlus tard (sans date) :\n${S.tasks.filter(t=>!t.day&&!t.done).slice(0,60).map(tline).join('\n')||'- vide'}\nCharge des 7 prochains jours :\n${[...Array(7)].map((_,i)=>dayLine(addDays(today(),i))).join('\n')}`,
 project:()=>{const p=(S.projects||[]).find(x=>x.id===GENIE_ID);if(!p)return ctxHead();return `${ctxHead()}\nProjet : ${p.name}${p.end?' (fin '+p.end+')':' (sans date de fin)'}\nSes tâches :\n${S.tasks.filter(t=>t.proj===p.id).map(t=>tline(t)+(t.day?' | '+t.day:' | plus tard')).join('\n')||'- aucune'}\nCharge des 14 prochains jours :\n${[...Array(14)].map((_,i)=>dayLine(addDays(today(),i))).join('\n')}`},
 habits:()=>`${ctxHead()}\nHabitudes :\n${(S.habits||[]).map(h=>`- ${h.name} (${h.kind==='quit'?'à arrêter':hbFreqLabel(h)}) : force ${Math.round(hbForce(h)*100)} %, série ${hbStreak(h)}${h.paused?', en pause':''}`).join('\n')||'- aucune'}`,
 focus:()=>{const t=T(GENIE_ID);if(!t)return ctxHead();return `Tâche en cours : ${t.title}${t.est?' ('+t.est+' min prévues)':''}, ${Math.round(actualSec(t)/60)} min passées.\nSous-tâches : ${(t.subtasks||[]).map(x=>(x.d?'✓ ':'')+x.t).join(' ; ')||'aucune'}\nNotes : ${t.notes||'aucune'}`},
};
const GENIE_Q={
 add:x=>`Transforme ceci en plan concret avec new_items (tâches datées et durées réalistes, projet si plusieurs étapes, routines ou habitudes si ça revient) :\n${x}`,
 day:()=>`Organise ma journée : un ordre (order), des créneaux si utile (blocks), complète durées et catégories manquantes (updates), et si c’est trop chargé, propose des reports (updates day).`,
 task:()=>`Prépare cette tâche : sous-tâches concrètes, durée réaliste, catégorie si absente, et le tout premier petit pas dans le message.`,
 week:()=>`Répartis ma semaine : équilibre la charge entre les jours (updates day), signale les jours surchargés, sans toucher aux heures fixes.`,
 backlog:()=>`Trie mes tâches « plus tard » : repère les doublons (renomme ou envoie au backlog celle en trop, ne supprime rien), propose un jour pour celles qui pressent (updates day), et regroupe en projet (new_items) ce qui forme un tout.`,
 project:()=>`Fais le plan d’attaque de ce projet : les étapes manquantes en tâches (new_items, project = son nom) et un jour pour chacune jusqu’à l’échéance, sans surcharger mes journées.`,
 habits:()=>`Ajuste mes habitudes d’après leur force : laquelle alléger (plus petite ou moins souvent), laquelle renforcer, en 3-4 phrases ; coche celles que je dis avoir faites (habit_checks).`,
 focus:()=>`Je bloque sur cette tâche. Donne-moi le prochain tout petit pas, concret, en une ou deux phrases, et propose-le en sous-tâche (updates subtasks).`,
};
let GENIE_ID=null;
function genieAsk(where,text,id){
 if(!aiOn()){sideTab='ai';document.body.classList.add('side-open');renderSide();toast('Ajoute ta clé du Génie dans Réglages');return}
 GENIE_ID=id||null;aiScope=where;sideTab='ai';document.body.classList.add('side-open');renderSide();
 const q=(GENIE_Q[where]||(x=>x))(text),lbl={add:'✦ '+String(text||'').slice(0,140),day:'✦ Organise ma journée',task:'✦ Prépare « '+((T(id)||{}).title||'')+' »',week:'✦ Répartis ma semaine',backlog:'✦ Trie « plus tard »',project:'✦ Plan d’attaque : '+(((S.projects||[]).find(p=>p.id===id))||{}).name,habits:'✦ Ajuste mes habitudes',focus:'✦ Je bloque sur « '+((T(id)||{}).title||'')+' »'}[where]||text;
 aiAsk(lbl,true,q).finally(()=>{aiScope='';GENIE_ID=null});
}
// le bouton ✦ de l'endroit où tu es (touche G)
function genieHere(){
 if(focusOn)return genieAsk('focus','',focusOn);
 if(modalTask)return genieAsk('task','',modalTask);
 if(ad){const tx=(document.querySelector('[data-adtitle]')||{}).value||'';if(tx.trim()){closeModal();return genieAsk('add',tx)}}
 if(view==='week')return genieAsk('week');if(view==='backlog')return genieAsk('backlog');if(view==='habits')return genieAsk('habits');
 return genieAsk('day')}
const genieBtn=(where,id,label)=>`<button class="genie" data-act="genie" data-w="${where}"${id?` data-id="${id}"`:''} title="${label} · G">${LAMP_SVG}<span>${label}</span></button>`;
