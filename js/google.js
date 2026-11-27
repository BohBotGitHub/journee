// Diem — Google Agenda : connexion, lecture des agendas, créneaux
/* ---------- Google Agenda (OAuth implicite, côté navigateur) ---------- */
const REDIRECT=location.origin+location.pathname;
const calId=()=>encodeURIComponent(S.settings.calendarId||'primary');
// agenda cible d'une tâche : celui de sa catégorie, sinon celui de son contexte, sinon l'agenda par défaut
function taskCal(t){const c=ch(t.channel);if(c&&c.lvl!==undefined)return nodeCal(c.id)||S.settings.calendarId||'primary';return (c&&c.cal)||(c&&c.ctx&&(S.settings.ctxCal||{})[c.ctx])||S.settings.calendarId||'primary'}
const blkCal=t=>encodeURIComponent((t.block&&t.block.cal)||S.settings.calendarId||'primary');
function gTok(){try{const o=JSON.parse(lsGet('journee.g')||'null');return o&&o.exp>Date.now()+30000?o.t:null}catch(e){return null}}
const gWas=()=>!!lsGet('journee.g.on');
function gLogin(silent){
 if(!S.settings.googleClientId){toast('Ajoute d’abord ton identifiant client Google dans Réglages');go('settings');return}
 const hint=lsGet('journee.g.email');
 const p=new URLSearchParams({client_id:S.settings.googleClientId.trim(),redirect_uri:REDIRECT,response_type:'token',scope:'email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.appdata'+(lsGet('journee.g.mail')?' https://www.googleapis.com/auth/gmail.readonly':''),include_granted_scopes:'true',state:(silent?'gs':'g')+'|'+view+'|'+cur,prompt:silent?'none':'consent'});
 if(hint)p.set('login_hint',hint);
 if(silent)lsSet('journee.g.last',String(Date.now()));
 location.href='https://accounts.google.com/o/oauth2/v2/auth?'+p;
}
function gSilent(){
 // renouvelle la session Google sans clic (aller-retour éclair) quand elle a expiré et que tu n'es pas en train de saisir
 if(gTok()||!gWas()||document.hidden||!S.settings.googleClientId)return;
 if(!$('#modal').classList.contains('hidden')||focusOn||drag||rz)return;
 const a=document.activeElement;if(a&&a.matches('input,textarea,select')&&a.value)return;
 const last=+(lsGet('journee.g.last')||0),fail=+(lsGet('journee.g.fail')||0);
 if(Date.now()-last<3*60000||Date.now()-fail<30*60000)return;
 gLogin(true);
}
function gLogout(){lsDel('journee.g');lsDel('journee.g.on');lsDel('journee.g.email');gEvents={};render()}
async function gFetch(path,opts={}){
 const t=gTok();if(!t)throw new Error('session expirée, reconnecte Google');
 const r=await fetch('https://www.googleapis.com/calendar/v3'+path,{...opts,headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'}});
 if(r.status===401){lsDel('journee.g');throw new Error('session expirée, reconnecte Google')}
 if(r.status===204)return null;
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error((j.error&&j.error.message)||('erreur '+r.status));return j;
}
let gErr='',gCals=null;
const gScope=()=>{try{return (JSON.parse(lsGet('journee.g')||'{}').scope)||''}catch(e){return ''}};
async function loadCals(){
 if(gCals)return gCals;
 try{const j=await gFetch('/users/me/calendarList?minAccessRole=reader&maxResults=100');gCals=(j.items||[]).map(c=>({id:c.id,name:c.summaryOverride||c.summary,color:c.backgroundColor,primary:!!c.primary,selected:c.selected!==false,write:c.accessRole==='owner'||c.accessRole==='writer'}))}
 catch(e){gCals=[{id:S.settings.calendarId||'primary',name:'Agenda principal',primary:true,selected:true}]}
 return gCals;
}
const calOn=c=>{const m=(S.settings.cals||{})[c.id];return m===undefined?c.selected:m};
async function ensureRange(from,to,force){
 if(!gTok())return;
 const days=[];for(let d=from;d<=to;d=addDays(d,1))days.push(d);
 if(!force&&days.every(d=>gEvents[d]))return;
 const k=from+to;if(gLoading[k])return;gLoading[k]=1;
 try{
  const tMin=parseYmd(from).toISOString(),tMax=parseYmd(addDays(to,1)).toISOString();let items=[],page='';
  const cals=(await loadCals()).filter(calOn);
  for(const c of cals){page='';
   do{const j=await gFetch(`/calendars/${encodeURIComponent(c.id)}/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}${page?'&pageToken='+encodeURIComponent(page):''}`);(j.items||[]).forEach(e=>{e._cal=c.name;e._col=c.color;e._cid=c.id});items=items.concat(j.items||[]);page=j.nextPageToken}while(page);
  }
  gErr='';
  days.forEach(d=>gEvents[d]=[]);
  for(const e of items){
   if(e.status==='cancelled'||!e.start)continue;
   if(e.attendees&&e.attendees.some(a=>a.self&&a.responseStatus==='declined'))continue;
   if(e.start.dateTime){const sd=ymd(new Date(e.start.dateTime));if(gEvents[sd])gEvents[sd].push(e)}
   else if(e.start.date){for(let x=e.start.date;x<(e.end&&e.end.date||addDays(e.start.date,1));x=addDays(x,1))if(gEvents[x])gEvents[x].push(e)}
  }
 }catch(e){days.forEach(d=>gEvents[d]=gEvents[d]||[]);gErr=/insufficient|scope|permission|403/i.test(e.message)?'Autorisation Agenda manquante':e.message;toast('Google Agenda : '+gErr)}
 finally{delete gLoading[k];render()}
}
const evKey=e=>e.recurringEventId||e.id;
const evFree=e=>{const m=(S.evMode||{})[evKey(e)];return m?m==='free':e.transparency==='transparent'};
const isMine=e=>!!(e.extendedProperties&&e.extendedProperties.private&&e.extendedProperties.private.journeeTask);
// indisponibilités récurrentes réglées dans Diem : vues comme des rendez-vous occupés (agenda, planification, temps libre, Génie)
const UA_DAYS=[['1','L'],['2','M'],['3','M'],['4','J'],['5','V'],['6','S'],['0','D']];
function uaEvents(d){const L=S.unavail||[];if(!L.length)return[];const wd=String(parseYmd(d).getDay()),at=hm=>{const[h,m]=(hm||'0:0').split(':').map(Number),x=parseYmd(d);x.setHours(h||0,m||0,0,0);return x.toISOString()};
 return L.filter(u=>(u.days||[]).includes(wd)&&u.s&&u.e&&u.e>u.s&&!(S.uaSkip||{})[u.id+'|'+d]).map(u=>({id:'ua-'+u.id+'-'+d,recurringEventId:'ua-'+u.id,summary:u.label||'Indisponible',start:{dateTime:at(u.s)},end:{dateTime:at(u.e)},_cid:'diem-ua',_cal:'Indisponibilités',_ua:u.id}))}
// rendez-vous Google ajoutés comme tâches : la tâche prend la place du rendez-vous (même créneau, fixe), le rendez-vous n'est jamais modifié dans Google
const evTaskIds=()=>new Set(S.tasks.filter(t=>t.evId).map(t=>t.evId));
const evTask=e=>e&&e.id&&S.tasks.find(t=>t.evId===e.id);
function evToTask(id){
 const e=Object.values(gEvents).flat().find(x=>x.id===id);if(!e||!e.start||!e.start.dateTime)return null;
 const ex=evTask(e);if(ex)return ex;
 const st=new Date(e.start.dateTime),en=new Date(e.end.dateTime),title=(e.summary||'Rendez-vous').trim(),d=ymd(st);
 const t=mk({title,est:Math.max(5,Math.round((en-st)/60000)),day:d,order:nextOrder(d),channel:(typeof hasTree==='function'&&hasTree()&&typeof ruleFor==='function')?ruleFor(title):null,notes:'Rendez-vous de ton agenda Google'+(e._cal?' ('+e._cal+')':'')});
 t.evId=e.id;t.evCal=e._cid||null;t.pinned=true;t.block={start:st.toISOString(),end:en.toISOString(),gcalId:null,cal:null,title};
 S.tasks.push(t);save();render();if(typeof emit==='function')emit('task:add',{task:t});return t;
}
const timedEvents=d=>{const L=evTaskIds();return [...(gEvents[d]||[]).filter(e=>e.start.dateTime&&!isMine(e)&&!L.has(e.id)),...uaEvents(d)].sort((a,b)=>a.start.dateTime<b.start.dateTime?-1:1)};
function meetingMin(d){return timedEvents(d).filter(e=>!evFree(e)).reduce((a,e)=>a+Math.max(0,(new Date(e.end.dateTime)-new Date(e.start.dateTime))/60000),0)}
const evBody=t=>({summary:(t.done?'✓ ':'')+t.title,description:(t.notes?t.notes+'\n\n':'')+'Planifié avec Diem',start:{dateTime:t.block.start},end:{dateTime:t.block.end},extendedProperties:{private:{journeeTask:t.id}}});
const gPend={},gDirty={};
async function pushBlock(t){
 if(!gTok()||!t.block||t.evId)return;
 if(gPend[t.id]){gDirty[t.id]=true;return}
 gPend[t.id]=true;
 try{
  const want=taskCal(t);
  if(t.block.gcalId&&t.block.cal&&t.block.cal!==want){
   try{await gFetch(`/calendars/${encodeURIComponent(t.block.cal)}/events/${encodeURIComponent(t.block.gcalId)}/move?destination=${encodeURIComponent(want)}`,{method:'POST'});t.block.cal=want}
   catch(e){await gFetch(`/calendars/${encodeURIComponent(t.block.cal)}/events/${encodeURIComponent(t.block.gcalId)}`,{method:'DELETE'}).catch(()=>{});t.block.gcalId=null}
  }
  if(t.block.gcalId)await gFetch(`/calendars/${blkCal(t)}/events/${encodeURIComponent(t.block.gcalId)}`,{method:'PATCH',body:JSON.stringify(evBody(t))});
  else{const ev=await gFetch(`/calendars/${encodeURIComponent(want)}/events`,{method:'POST',body:JSON.stringify(evBody(t))});if(t.block){t.block.gcalId=ev.id;t.block.cal=want}else gFetch(`/calendars/${encodeURIComponent(want)}/events/${encodeURIComponent(ev.id)}`,{method:'DELETE'}).catch(()=>{})}
  save();
 }catch(e){toast('Google Agenda : '+e.message)}
 finally{delete gPend[t.id];if(gDirty[t.id]){delete gDirty[t.id];pushBlock(t)}}
}
function setRange(t,start,end,noRender){
 t.block={start:start.toISOString(),end:end.toISOString(),gcalId:t.block&&t.block.gcalId||null,cal:t.block&&t.block.cal||null,title:t.title};
 t.day=ymd(start);save();if(!noRender)render();
 return pushBlock(t);
}
function setBlock(t,start,noRender){
 if(!t.est)t.est=30;
 return setRange(t,start,new Date(start.getTime()+t.est*60000),noRender);
}

// ---------- agendas de boulot : chaque événement dit si tu es au boulot, et comment ----------
// réglage par agenda : 'busy' (toujours sans pause, par défaut) · 'phases' (au choix : Exploitation = en veille, autres phases = sans pause) · 'off'
function jobCalMode(id,name){const m=(S.settings.jobCals||{})[id];if(m)return m;const n=(name||'')+' '+(id||'');if(/diesesoftware|villette/i.test(n))return 'busy';if(/^(travail|boulot|work)$/i.test((name||'').trim()))return 'busy';return 'off'} // Exploitation comprise : occupé par défaut ; « Prestations » la met en veille sur demande
function classifyEv(e){
 if(!e||isMine(e)||!e._cid)return null;const m=jobCalMode(e._cid,e._cal);if(m==='off')return null;
 const t=(e.summary||'').trim();if(/^(autre|vacances|cong[ée]s?)\b/i.test(t))return 'ignore';
 if(!e.start.dateTime)return 'allday';
 if(new Date(e.end.dateTime)-new Date(e.start.dateTime)>20*3600e3)return 'ignore';
 if(m==='busy')return 'busy';
 const ph=t.includes(' / ')?t.split(' / ').pop():'';return /exploitation/i.test(ph)?'watch':'busy';
}
// segments de boulot d'un jour (heures décimales), déduits de l'agenda
function jobSegs(d){const base=+parseYmd(d),out=[];
 for(const e of (gEvents[d]||[])){const k=classifyEv(e);if(!k||k==='ignore')continue;
  if(e.start.dateTime&&typeof evFree==='function'&&evFree(e))continue; // passé en « disponible » : ce n'est plus du boulot ce jour-là
  if(k==='allday'){const o=(S.days[d]&&S.days[d].ad)||{};out.push({s:o.s??S.settings.allDayStart??8,e:o.e??S.settings.allDayEnd??18,mode:'busy',t:e.summary||'',allday:true,col:e._col,custom:o.s!=null});continue}
  const s=(new Date(e.start.dateTime)-base)/3600e3,en=Math.min(24,(new Date(e.end.dateTime)-base)/3600e3);if(en>s)out.push({s,e:en,mode:k,t:e.summary||''})}
 return out.sort((a,b)=>a.s-b.s)}
