// MyDayBot — Google Agenda : connexion, lecture des agendas, créneaux
/* ---------- Google Agenda (OAuth implicite, côté navigateur) ---------- */
const REDIRECT=location.origin+location.pathname;
const calId=()=>encodeURIComponent(S.settings.calendarId||'primary');
// agenda cible d'une tâche : celui de son canal, sinon celui de son contexte, sinon l'agenda par défaut
function taskCal(t){const c=ch(t.channel);return (c&&c.cal)||(c&&c.ctx&&(S.settings.ctxCal||{})[c.ctx])||S.settings.calendarId||'primary'}
const blkCal=t=>encodeURIComponent((t.block&&t.block.cal)||S.settings.calendarId||'primary');
function gTok(){try{const o=JSON.parse(lsGet('journee.g')||'null');return o&&o.exp>Date.now()+30000?o.t:null}catch(e){return null}}
const gWas=()=>!!lsGet('journee.g.on');
function gLogin(silent){
 if(!S.settings.googleClientId){toast('Ajoute d’abord ton identifiant client Google dans Réglages');go('settings');return}
 const hint=lsGet('journee.g.email');
 const p=new URLSearchParams({client_id:S.settings.googleClientId.trim(),redirect_uri:REDIRECT,response_type:'token',scope:'email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.appdata',include_granted_scopes:'true',state:(silent?'gs':'g')+'|'+view+'|'+cur,prompt:silent?'none':'consent'});
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
   do{const j=await gFetch(`/calendars/${encodeURIComponent(c.id)}/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}${page?'&pageToken='+encodeURIComponent(page):''}`);(j.items||[]).forEach(e=>{e._cal=c.name;e._col=c.color});items=items.concat(j.items||[]);page=j.nextPageToken}while(page);
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
const timedEvents=d=>(gEvents[d]||[]).filter(e=>e.start.dateTime&&!isMine(e));
function meetingMin(d){return timedEvents(d).filter(e=>!evFree(e)).reduce((a,e)=>a+Math.max(0,(new Date(e.end.dateTime)-new Date(e.start.dateTime))/60000),0)}
const evBody=t=>({summary:(t.done?'✓ ':'')+t.title,description:(t.notes?t.notes+'\n\n':'')+'Planifié avec MyDayBot',start:{dateTime:t.block.start},end:{dateTime:t.block.end},extendedProperties:{private:{journeeTask:t.id}}});
const gPend={},gDirty={};
async function pushBlock(t){
 if(!gTok()||!t.block)return;
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
