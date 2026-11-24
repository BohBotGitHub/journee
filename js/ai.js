// MyDayBot — assistant Claude
/* ---------- assistant Claude (API Anthropic, clé de l'utilisateur) ---------- */
let modalAI=null,aiBusy=false,aiUnread=0,aiQueue=new Set(),aiT=null;
const aiOn=()=>!!(S.settings.aiKey||'').trim();
const AI_TOOL={name:'proposer',description:'Propose des changements concrets au planning de l’utilisateur. Utilise uniquement des ids de tâches existants pour order et updates.',input_schema:{type:'object',properties:{
 message:{type:'string',description:'Réponse courte à l’utilisateur, en français, au tutoiement.'},
 order:{type:'array',items:{type:'string'},description:'Ids des tâches non terminées du jour, dans l’ordre conseillé.'},
 updates:{type:'array',items:{type:'object',properties:{id:{type:'string'},channel:{type:'string',description:'Nom exact d’un canal existant'},est:{type:'integer',description:'Durée estimée en minutes'},day:{type:'string',description:'YYYY-MM-DD, ou backlog'},drop:{type:'boolean',description:'true pour proposer d’abandonner une tâche obsolète'},subtasks:{type:'array',items:{type:'string'},description:'Sous-tâches à ajouter'},reason:{type:'string'}},required:['id']}},
 pick:{type:'array',items:{type:'string'},description:'Ids de tâches existantes (backlog, autres jours) à ajouter au jour affiché'},
 blocks:{type:'array',items:{type:'object',properties:{id:{type:'string'},start:{type:'string',description:'HH:MM'}},required:['id','start']},description:'Créneaux horaires proposés pour des tâches du jour'},
 intent:{type:'string',description:'Intention courte pour la journée'},
 objectives:{type:'array',items:{type:'string'},description:'Objectifs proposés pour la semaine'},
 new_tasks:{type:'array',items:{type:'object',properties:{title:{type:'string'},channel:{type:'string'},est:{type:'integer'},day:{type:'string',description:'YYYY-MM-DD, ou backlog'},reason:{type:'string'}},required:['title']}}
},required:['message']}};
function aiContext(){
 const d=cur,t0=today(),now=new Date(),line=t=>`- [${t.id}] ${t.title}${t.prio?' | priorité '+t.prio:''}${t.est?' | '+t.est+' min':' | sans durée'}${ch(t.channel)?' | canal '+ch(t.channel).name:' | sans canal'}${t.block?' | créneau '+hm(new Date(t.block.start)):''}${t.done?' | FAITE':''}${t.src?' | To Do':''}${t.due?' | échéance '+t.due:''}`;
 const hist=S.tasks.filter(t=>t.done&&t.day&&t.day>=addDays(t0,-14)&&t.est&&t.actual).slice(-25).map(t=>`- ${t.title} : estimé ${t.est} min, réel ${Math.round(t.actual/60)} min`);
 const meet=timedEvents(d).map(e=>`- ${hm(new Date(e.start.dateTime))}–${hm(new Date(e.end.dateTime))} ${e.summary||'(sans titre)'} (${evFree(e)?'compatible avec du travail sur les tâches':'occupé'})`);
 const wk=monday(d),days=[...Array(7)].map((_,i)=>addDays(wk,i));
 return `Maintenant : ${cap1(fmtDay(t0))}, ${hm(now)}. Jour affiché : ${fmtDay(d)} (${d}).
Heures de travail : ${S.settings.workStart}h–${S.settings.workEnd}h.
Canaux : ${S.channels.map(c=>c.name).join(', ')||'aucun'}.
Objectifs de la semaine : ${weekObjs(wk).map(o=>o.title+(o.done?' (atteint)':'')).join(' ; ')||'aucun'}.
${(S.days[d]||{}).intent?'Intention du jour : '+S.days[d].intent+'\n':''}Réunions du jour :\n${meet.join('\n')||'- aucune connue'}
Tâches du jour :\n${dayTasks(d).map(line).join('\n')||'- aucune'}
En retard (jours précédents) :\n${pastUndone().slice(0,15).map(t=>line(t)+' | prévue le '+t.day).join('\n')||'- rien'}
Reste de la semaine :\n${days.filter(x=>x!==d&&x>=t0).map(x=>dayTasks(x).filter(t=>!t.done).map(t=>line(t)+' | '+x).join('\n')).filter(Boolean).join('\n')||'- rien'}
Backlog :\n${S.tasks.filter(t=>!t.day&&!t.done).slice(0,40).map(line).join('\n')||'- vide'}
Historique estimé/réel :\n${hist.join('\n')||'- pas encore de données'}
Habitudes passées (archive, durée réelle moyenne) :\n${archivePatterns()||'- aucune'}`;
}
const AI_SYS=`Tu es Claude, l'assistant de planification intégré à l'appli « MyDayBot » (équivalent de Sunsama). Tu aides l'utilisateur à organiser son temps : ordre des tâches, catégorie (canal), durée réaliste, répartition dans la semaine, et nouvelles tâches utiles (préparer une réunion, un suivi, une étape vers un objectif de la semaine).
Règles :
- Français, tutoiement, ton chaleureux et direct, réponses courtes (3-6 phrases max).
- Sois réaliste : tâches + réunions ne doivent pas dépasser les heures de travail ; s'il y a trop, propose de reporter (updates avec day) plutôt que d'entasser.
- Ordre conseillé : tâches importantes et exigeantes tôt, petites tâches entre les réunions, liées aux objectifs de la semaine en priorité.
- Durées : appuie-toi sur l'historique estimé/réel quand il existe (si l'utilisateur sous-estime, corrige).
- Canaux : uniquement des noms de la liste fournie.
- Échéances : une tâche doit être planifiée avant sa date d’échéance ; signale celles qui sont menacées.
- Nouvelles tâches : maximum 3, seulement si vraiment utiles, avec une raison courte.
- Dès que tu suggères un changement concret, utilise l'outil « proposer » : l'utilisateur validera chaque élément. Ne prétends jamais avoir modifié quelque chose toi-même.`;
// coût en dollars par million de jetons (tarifs publics Anthropic ; Haiku : prompts ≤ 100 000 jetons)
const PRICES={'claude-haiku-5-5':[0.10,0.50],'claude-sonnet-5-5':[2,10]};
const monthKey=()=>today().slice(0,7);
function usageNow(){let u=S.aiUsage||{};if(u.m!==monthKey())u={m:monthKey(),usd:0,calls:0,inT:0,outT:0};return u}
function trackUsage(us,model){if(!us)return;const u=usageNow(),[pi,po]=PRICES[model]||PRICES['claude-haiku-5-5'];const inT=(us.input_tokens||0)+(us.cache_creation_input_tokens||0)+(us.cache_read_input_tokens||0);u.inT+=inT;u.outT+=us.output_tokens||0;u.calls++;u.usd+=inT/1e6*pi+(us.output_tokens||0)/1e6*po;S.aiUsage=u;save();const el=document.querySelector('[data-live="aicost"]');if(el)el.textContent=costTxt()}
const usd=v=>v<0.01?'< 0,01 $':v.toFixed(2).replace('.',',')+' $';
function costTxt(){const u=usageNow(),b=+S.settings.aiBudget||0;return `Ce mois-ci : ${usd(u.usd)}${b?' sur '+usd(b):''} · ${u.calls} requête${u.calls>1?'s':''}`}
async function callClaude(messages,force){
 {const b=+S.settings.aiBudget||0;if(b&&usageNow().usd>=b)throw new Error(`plafond mensuel atteint (${usd(b)}) — modifiable dans Réglages`)}
 const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':S.settings.aiKey.trim(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
  body:JSON.stringify({model:S.settings.aiModel||'claude-haiku-5-5',max_tokens:1600,system:AI_SYS,tools:[AI_TOOL],tool_choice:force?{type:'tool',name:'proposer'}:{type:'auto'},messages})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(r.status===401?'clé API refusée':(j.error&&j.error.message)||('erreur '+r.status));
 trackUsage(j.usage,S.settings.aiModel||'claude-haiku-5-5');
 let text='',prop=null;
 for(const b of j.content||[]){if(b.type==='text')text+=b.text;if(b.type==='tool_use'&&b.name==='proposer')prop=b.input}
 if(prop&&prop.message){text=(text?text+'\n':'')+prop.message}
 return{text:text.trim(),prop};
}
function propItems(p){
 if(!p)return[];const out=[];
 const tt=id=>{const t=T(id);return t?t.title:null};
 if(p.order&&p.order.filter(tt).length>1)out.push({k:'order',label:'Réordonner : '+p.order.filter(tt).map(tt).join(' → ')});
 (p.updates||[]).forEach((u,i)=>{const t=T(u.id);if(!t)return;if(u.drop){out.push({k:'u'+i,label:'Abandonner : '+t.title,reason:u.reason});return}const parts=[];if(u.subtasks&&u.subtasks.length)parts.push('sous-tâches : '+u.subtasks.join(', '));if(u.channel)parts.push('canal '+u.channel);if(u.est)parts.push(fmtMin(u.est));if(u.day)parts.push(u.day==='backlog'?'au backlog':'le '+fmtDay(u.day,{weekday:'long',day:'numeric'}));if(parts.length)out.push({k:'u'+i,label:t.title+' : '+parts.join(', '),reason:u.reason})});
 (p.pick||[]).forEach((id,i)=>{const t=T(id);if(t&&t.day!==cur&&!t.done)out.push({k:'p'+i,label:'Ajouter au jour : '+t.title+(t.est?' ('+fmtMin(t.est)+')':'')})});
 (p.blocks||[]).forEach((b,i)=>{const t=T(b.id);if(t&&/^\d{1,2}:\d{2}$/.test(b.start||''))out.push({k:'b'+i,label:'Créneau '+b.start+' : '+t.title})});
 if(p.intent)out.push({k:'i',label:'Intention : '+p.intent});
 (p.objectives||[]).forEach((o,i)=>{if(o)out.push({k:'o'+i,label:'Objectif : '+o})});
 (p.new_tasks||[]).forEach((n,i)=>{if(n.title)out.push({k:'n'+i,label:'Nouvelle tâche : '+n.title+(n.est?' ('+fmtMin(n.est)+')':''),reason:n.reason})});
 return out;
}
const chByName=n=>n?S.channels.find(c=>c.name.toLowerCase()===String(n).toLowerCase().trim()):null;
function applyItem(m,k){
 const p=m.prop;if(!p)return;m.applied=m.applied||{};if(m.applied[k])return;
 if(k==='order'){const ids=p.order.filter(id=>T(id));ids.forEach((id,i)=>{T(id).order=i+1});const rest=dayTasks(cur).filter(t=>!ids.includes(t.id));rest.forEach((t,i)=>t.order=ids.length+i+1);reflow(cur)}
 else if(k[0]==='p'){const t=T(p.pick[+k.slice(1)]);if(t)moveTask(t.id,cur,true)}
 else if(k[0]==='b'){const b=p.blocks[+k.slice(1)],t=b&&T(b.id);if(t){const[hh,mm]=b.start.split(':').map(Number),dt=parseYmd(cur);dt.setHours(hh,mm,0,0);if(t.day!==cur)moveTask(t.id,cur,true);t.pinned=true;setBlock(t,dt,true)}}
 else if(k==='i'){S.days[cur]=Object.assign(S.days[cur]||{},{intent:p.intent})}
 else if(k[0]==='o'){const o=p.objectives[+k.slice(1)];if(o)S.objectives.push({id:uid(),week:monday(cur),title:o,done:false})}
 else if(k[0]==='u'&&p.updates[+k.slice(1)]&&p.updates[+k.slice(1)].drop){const t=T(p.updates[+k.slice(1)].id);if(t)deleteTask(t.id)}
 else if(k[0]==='u'){const u=p.updates[+k.slice(1)],t=u&&T(u.id);if(t){if(u.subtasks)u.subtasks.forEach(x=>t.subtasks.push({id:uid(),t:x,d:false}));const c=chByName(u.channel);if(c)t.channel=c.id;if(u.est)t.est=u.est;if(u.day){moveTask(t.id,u.day==='backlog'?'backlog':u.day,true)}t.aiSug=null}}
 else if(k[0]==='n'){const n=p.new_tasks[+k.slice(1)];if(n){const day=n.day==='backlog'?null:(n.day||cur);const c=chByName(n.channel);S.tasks.push(mk({title:n.title,est:n.est||0,channel:c?c.id:null,day,order:nextOrder(day)}))}}
 m.applied[k]=true;save();render();
}
async function aiAsk(text,force){
 if(!aiOn()){sideTab='ai';renderSide();toast('Ajoute ta clé API Anthropic dans Réglages');return}
 if(aiBusy)return;aiBusy=true;
 if(text)S.chat.push({role:'user',text,at:Date.now()});
 S.chat=S.chat.slice(-30);save();renderSide();
 const hist=S.chat.slice(-10).map(m=>({role:m.role,content:m.text||'(propositions)'}));
 while(hist.length&&hist[0].role!=='user')hist.shift();
 const last=hist[hist.length-1];if(!last||last.role!=='user')hist.push({role:'user',content:'Regarde ma journée et propose-moi une organisation.'});
 hist[hist.length-1]={role:'user',content:`<contexte>\n${aiContext()}\n</contexte>\n\n${hist[hist.length-1].content}`};
 try{const r=await callClaude(hist,force);S.chat.push({role:'assistant',text:r.text||'Voici mes propositions.',prop:r.prop,at:Date.now()});if(sideTab!=='ai'||document.body.classList.contains('side-open')===false&&innerWidth<=1100){aiUnread++}}
 catch(e){S.chat.push({role:'assistant',text:'Je n’ai pas pu répondre : '+e.message,at:Date.now()})}
 finally{aiBusy=false;S.chat=S.chat.slice(-30);save();renderSide();renderBadge()}
}
function renderBadge(){const b=$('#aibadge');if(b)b.innerHTML=aiUnread?`<span class="badge">${aiUnread}</span>`:''}
// en sous-marin : catégorie et durée des nouvelles tâches
function aiWatch(t){if(!aiOn()||!S.settings.aiAuto||!t||(t.est&&t.channel))return;aiQueue.add(t.id);clearTimeout(aiT);aiT=setTimeout(aiClassify,2500)}
async function aiClassify(){
 const ids=[...aiQueue].filter(id=>T(id));aiQueue.clear();if(!ids.length||!aiOn())return;
 try{const r=await callClaude([{role:'user',content:`<contexte>\n${aiContext()}\n</contexte>\n\nPour ces tâches uniquement, propose un canal et une durée (updates, sans order ni new_tasks, message très court) : ${ids.map(id=>'['+id+'] '+T(id).title).join(' ; ')}`}],true);
  (r.prop&&r.prop.updates||[]).forEach(u=>{const t=T(u.id);if(!t||t.done)return;const c=chByName(u.channel);const sug={};if(c&&c.id!==t.channel)sug.channel=c.id;if(u.est&&!t.est)sug.est=u.est;if(sug.channel||sug.est)t.aiSug=sug});
  save();render();
 }catch(e){}
}
// en sous-marin : revue du matin, une fois par jour
function aiMorning(){
 const d=today();if(!aiOn()||!S.settings.aiAuto||cur!==d||(S.days[d]||{}).aiDone)return;
 S.days[d]=Object.assign(S.days[d]||{},{aiDone:true});save();
 setTimeout(()=>aiAsk('Bonjour ! Regarde ma journée : propose un ordre, complète les catégories et durées manquantes, signale si je suis surchargé, et suggère au besoin 1 à 3 tâches utiles.',true),gTok()?2500:500);
}
function viewAI(){
 if(!aiOn())return `<div class="sinfo"><b>Claude, ton assistant de planification</b><span>Il propose l’ordre de tes tâches, leur catégorie et leur durée, repère quand tu es surchargé et suggère des tâches utiles. Tu valides chaque proposition.</span><span>Il faut une clé API Anthropic (payée à l’usage, quelques euros par mois). Crée-la sur console.anthropic.com, puis colle-la dans Réglages.</span><button class="pri" data-act="goset">Ouvrir les réglages</button></div>`;
 const msgs=S.chat.map((m,mi)=>{const items=m.role==='assistant'?propItems(m.prop):[];const ap=m.applied||{};
  return `<div class="msg ${m.role==='user'?'u':'a'}">${esc(m.text)}${items.length?`<div class="prop">${items.map(it=>`<div class="pitem${ap[it.k]?' ok':''}"><div>${esc(it.label)}${it.reason?`<small class="mute">${esc(it.reason)}</small>`:''}</div>${ap[it.k]?'<small>Fait</small>':`<button class="sm pri" data-act="aiapply" data-m="${mi}" data-k="${it.k}">Appliquer</button>`}</div>`).join('')}${items.filter(it=>!ap[it.k]).length>1?`<button class="sm" data-act="aiapplyall" data-m="${mi}">Tout appliquer</button>`:''}</div>`:''}</div>`}).join('');
 return `<div class="chat">${msgs||'<div class="sinfo" style="padding:0"><span>Demande-moi d’organiser ta journée, ou pose une question.</span></div>'}</div>
 ${aiBusy?'<div class="thinking">Claude réfléchit…</div>':''}
 <div class="aibar"><button data-act="aiq" data-q="Organise ma journée : ordre, durées et catégories.">Organise ma journée</button><button data-act="aiq" data-q="Qu’est-ce que j’oublie cette semaine ? Suggère des tâches.">Qu’est-ce que j’oublie ?</button><button data-act="aiq" data-q="Je suis débordé, aide-moi à alléger ma journée.">Je suis débordé</button><button data-act="aiq" data-q="Répartis mon backlog sur la semaine.">Répartis mon backlog</button></div>
 <div class="sinfo" style="padding:0 14px 6px;font-size:12px" data-live="aicost">${costTxt()}</div>
 <form class="aiform" data-form="ai"><textarea name="t" data-keep="ai" rows="1" placeholder="Écris à Claude…" aria-label="Message à Claude"></textarea><button class="pri" type="submit">Envoyer</button></form>`;
}
