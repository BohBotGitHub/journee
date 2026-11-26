// Diem — Trier mes mails : le Génie lit les non-lus (lecture seule) et propose des tâches
/* Rien n'est lu tant que l'accès n'a pas été accordé (Gmail : gmail.readonly ; Outlook : Mail.Read).
   Les mails ne sont jamais enregistrés : seules les tâches proposées restent dans la conversation. */
function gmailOk(){return !!gTok()&&/gmail\.readonly/.test(gScope())}
function outlookOk(){try{const o=JSON.parse(lsGet('journee.m')||'null');return !!(o&&/Mail\.Read/i.test(o.scope||''))}catch(e){return false}}
function mailOn(){return gmailOk()||outlookOk()}
let mailBusy=false;
/* Message clair selon la cause réelle du refus Gmail */
function gmailErr(st,j){
 const e=(j&&j.error)||{},m=(e.message||'')+' '+JSON.stringify(e.details||e.errors||'');
 if(st===401)return 'ta connexion Google a expiré : Réglages › Réglages avancés › Trier mes mails › Gmail › Arrêter puis Autoriser';
 if(/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(m))return 'l’API Gmail n’est pas activée dans ton projet Google Cloud (Bibliothèque › Gmail API › Activer), puis réessaie dans quelques minutes';
 if(st===403&&/insufficient|scope|ACCESS_TOKEN_SCOPE/i.test(m))return 'Google n’a pas donné l’accès aux mails : Réglages › Réglages avancés › Trier mes mails › Gmail › Arrêter puis Autoriser, et coche « Afficher vos e-mails » sur l’écran Google';
 if(st===403)return 'accès Gmail refusé ('+(e.message||'403')+')';
 if(st===429)return 'Gmail limite les lectures pour l’instant, réessaie dans une minute';
 return e.message||'Gmail : erreur '+st;
}
async function gmailUnread(){
 const t=gTok(),H={Authorization:'Bearer '+t},B='https://gmail.googleapis.com/gmail/v1/users/me/messages';
 const r=await fetch(B+'?maxResults=25&q='+encodeURIComponent('is:unread in:inbox newer_than:14d'),{headers:H});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(gmailErr(r.status,j));
 const out=[];
 for(const m of (j.messages||[]).slice(0,25)){
  const x=await fetch(`${B}/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,{headers:H}).then(r=>r.ok?r.json():null).catch(()=>null);if(!x)continue;
  const h=n=>((x.payload&&x.payload.headers)||[]).find(y=>y.name.toLowerCase()===n.toLowerCase())?.value||'';
  out.push({src:'Gmail',from:h('From'),subject:h('Subject'),date:h('Date'),snippet:(x.snippet||'').slice(0,300)});
 }
 return out;
}
async function outlookUnread(){
 const j=await graph("/me/mailFolders/inbox/messages?$top=25&$filter="+encodeURIComponent('isRead eq false')+"&$select=subject,from,receivedDateTime,bodyPreview");
 return (j&&j.value||[]).map(m=>({src:'Outlook',from:((m.from||{}).emailAddress||{}).name||((m.from||{}).emailAddress||{}).address||'',subject:m.subject||'',date:m.receivedDateTime||'',snippet:(m.bodyPreview||'').slice(0,300)}));
}
async function unreadMails(){const all=[],errs=[];
 if(gmailOk())try{all.push(...await gmailUnread())}catch(e){errs.push(e.message)}
 if(outlookOk())try{all.push(...await outlookUnread())}catch(e){errs.push('Outlook : '+e.message)}
 return{all,errs}}
const MAIL_ASK=`Voici mes mails non lus. Propose des tâches concrètes (new_tasks) seulement pour ce qui demande une action de ma part :
- une question directe qui attend ma réponse (« Répondre à … sur … ») ;
- un colis ou un retrait à faire (« Retirer le colis … au point relais … », avec la date limite si elle est donnée) ;
- un rendez-vous à noter ou confirmer ;
- une facture à payer ou un document à envoyer, avec l’échéance ;
- toute autre échéance.
Ignore les newsletters, promotions, notifications automatiques sans action. Une tâche par action, titre court à l’infinitif, durée réaliste (5 à 30 min), catégorie de la liste, day = aujourd’hui si c’est urgent, sinon le bon jour ou backlog. Dans reason, indique l’expéditeur et l’objet du mail. Pas d’order, pas d’updates. Message : une phrase qui résume (combien de mails lus, combien demandent une action).`;
async function mailSort(){
 if(!aiOn()){toast('Ajoute d’abord une clé Claude dans Réglages');return}
 if(!mailOn()||mailBusy||aiBusy)return;
 mailBusy=aiBusy=true;S.chat.push({role:'user',text:'Trie mes mails non lus.',at:Date.now()});save();renderSide();
 try{
  const {all,errs}=await unreadMails();
  if(!all.length){S.chat.push({role:'assistant',text:errs.length?'Je n’ai pas pu lire tes mails : '+errs.join(' ; '):'Aucun mail non lu ces 14 derniers jours. Boîte de réception tranquille !',at:Date.now()})}
  else{
   const list=all.map((m,i)=>`${i+1}. [${m.src}] De : ${m.from} | Objet : ${m.subject} | ${m.date}\n   ${m.snippet.replace(/\s+/g,' ')}`).join('\n');
   const r=await callClaude([{role:'user',content:`<contexte>\n${aiContext()}\n</contexte>\n\n${MAIL_ASK}\n\n<mails>\n${list}\n</mails>`}],true);
   if(r.prop){delete r.prop.order;delete r.prop.updates;delete r.prop.pick;delete r.prop.blocks}
   S.chat.push({role:'assistant',text:(r.text||'Voici les tâches tirées de tes mails.')+(errs.length?' ('+errs.join(' ; ')+')':''),prop:r.prop,at:Date.now(),mail:all.length});
  }
 }catch(e){S.chat.push({role:'assistant',text:'Je n’ai pas pu trier tes mails : '+e.message,at:Date.now()})}
 finally{mailBusy=aiBusy=false;S.chat=S.chat.slice(-30);save();renderSide();renderBadge()}
}
// autoriser la lecture : on relance la connexion avec l'accès en plus (la page de consentement officielle s'ouvre)
function mailAllow(k){if(k==='g'){lsSet('journee.g.mail','1');gLogin()}else{lsSet('journee.m.mail','1');msLogin()}}
function mailStop(k){if(k==='g'){lsDel('journee.g.mail');toast('Gmail : Diem ne demandera plus la lecture des mails (révocation complète : myaccount.google.com › Sécurité › Applis tierces)')}else{lsDel('journee.m.mail');toast('Outlook : lecture des mails désactivée à la prochaine connexion')}render()}
function mailSettingsHtml(){
 const g=gmailOk(),o=outlookOk();
 return `<section><h2>Trier mes mails</h2><p>Le Génie lit tes mails non lus des 14 derniers jours (lecture seule, sans rien enregistrer) quand tu cliques « Trier mes mails » dans son onglet, et propose des tâches : réponses attendues, colis, rendez-vous, factures, échéances. Les mails partent seulement vers Claude, avec ta clé.</p>
  <div class="connrow"><b>Gmail</b><span class="mute">Lecture seule</span><span class="sp"></span><span class="status${g?' on':''}">${g?'Autorisé':'Non autorisé'}</span>${g?'<button class="sm ghost" data-act="mailstop" data-k="g">Arrêter</button>':`<button class="sm" data-act="mailallow" data-k="g" ${S.settings.googleClientId?'':'disabled'}>Autoriser</button>`}</div>
  <div class="connrow"><b>Outlook</b><span class="mute">Lecture seule, compte personnel</span><span class="sp"></span><span class="status${o?' on':''}">${o?'Autorisé':'Non autorisé'}</span>${o?'<button class="sm ghost" data-act="mailstop" data-k="m">Arrêter</button>':`<button class="sm" data-act="mailallow" data-k="m" ${S.settings.msClientId?'':'disabled title="Ajoute d’abord l’identifiant Azure (Réglages avancés)"'}>Autoriser</button>`}</div>
  <div class="grid2" style="margin-top:10px"><label>Tâche « Lire mes mails » à partir de (non lus, 0 = jamais)<input type="number" min="0" max="500" data-set="mailThresh" value="${esc(S.settings.mailThresh??20)}"></label></div>
  <p class="mute" style="font-size:13px;margin:8px 0 0">Avant d’autoriser : ajoute l’accès <code>gmail.readonly</code> à Diem dans la console Google Cloud (et <code>Mail.Read</code> dans Azure pour Outlook), sinon Google ou Microsoft refusera.</p></section>`;
}
/* tâche automatique « Lire mes mails » quand les non-lus s'accumulent (seuil réglable, 0 = jamais) */
async function unreadCount(){let n=0;
 if(gmailOk())try{const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX',{headers:{Authorization:'Bearer '+gTok()}});if(r.ok){const j=await r.json();n+=j.messagesUnread||0}}catch(e){}
 if(outlookOk())try{const j=await graph('/me/mailFolders/inbox?$select=unreadItemCount');n+=(j&&j.unreadItemCount)||0}catch(e){}
 return n}
async function mailWatch(){
 const th=+(S.settings.mailThresh??20);if(!th||!mailOn())return;
 const d=today();if(S.tasks.some(t=>t.auto==='mail'&&!t.done&&t.day&&t.day<=d)||(S.days[d]||{}).mailAuto)return;
 const n=await unreadCount();if(n<th)return;
 S.days[d]=Object.assign(S.days[d]||{},{mailAuto:true});
 S.tasks.push(mk({title:'Lire mes mails ('+n+' non lus)',est:15,day:d,order:nextOrder(d),auto:'mail',channel:node('c-admin')?'c-admin':null}));
 save();render();toast(n+' mails non lus : tâche « Lire mes mails » ajoutée');
}
setTimeout(mailWatch,4000);setInterval(mailWatch,30*60000);
