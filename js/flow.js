// Diem — agenda vivant, focus, temps qui passe, notifications
/* ---------- journée vivante : le focus et le temps qui passe décalent l'agenda ---------- */
const M5=3e5,ceil5=x=>Math.ceil(x/M5)*M5,floor5=x=>Math.floor(x/M5)*M5;
const runningTask=()=>{const r=S.running&&T(S.running.taskId);return r&&!r.done?r:null};
function busyAt(d){return timedEvents(d).filter(e=>!evFree(e)&&!['watch','ignore'].includes(typeof classifyEv==='function'?classifyEv(e):null)).map(e=>[+new Date(e.start.dateTime),+new Date(e.end.dateTime)])}
// créneaux où une tâche de ce lieu ne peut pas être placée : trajet avant/après le boulot, et le boulot lui-même (sauf « n'importe où » en veille)
function locBusy(d,where){const j=jobOf(d);if(!j)return[];const base=+parseYmd(d),ws=base+j.s*3600e3,we=base+j.e*3600e3,tr=(S.settings.travel??60)*60000,out=[];
 if(tr>0){out.push([ws-tr,ws]);out.push([we,we+tr])}
 if(j.segs){if(where!=='any')out.push([ws,we]);for(const x of j.segs)if(x.mode==='busy')out.push([base+x.s*3600e3,base+x.e*3600e3]);return out}
 if(j.mode==='busy'||where!=='any')out.push([ws,we]);return out}
function activate(t){
 const now=Date.now(),d=today();
 if(t.day!==d){t.day=d}
 const b=t.block,inWin=b&&+new Date(b.start)<=now&&+new Date(b.end)>now;
 const left=Math.max(10,(t.est||30)-Math.floor((t.actual||0)/60))*60000;
 if(inWin)setRange(t,new Date(b.start),new Date(Math.max(+new Date(b.end),ceil5(now)+M5)),true);
 else{const st=floor5(now);setRange(t,new Date(st),new Date(Math.max(st+left,ceil5(now)+M5)),true)}
 if(!flowOn())cascade(d);syncOrder(d);save();render();
}
function cascade(d){
 if(d!==today()||S.settings.liveShift===false)return 0;
 const now=Date.now(),r=runningTask(),busy=busyAt(d);
 let cursor=ceil5(now);if(r&&r.block&&r.day===d)cursor=Math.max(cursor,+new Date(r.block.end));
 const ts=dayTasks(d).filter(t=>!t.done&&t.block&&t!==r).sort((a,b)=>new Date(a.block.start)-new Date(b.block.start));
 let n=0;
 for(const t of ts){
  const st=+new Date(t.block.start),en=+new Date(t.block.end);
  if(st>=cursor){cursor=Math.max(cursor,en);continue}
  let dur=en-st;if(en<=now&&t.actual)dur=Math.max(10*60000,(t.est||30)*60000-t.actual*1000);
  let ns=cursor;for(let g=0;g<50;g++){const hit=busy.find(([a,b])=>ns<b&&ns+dur>a);if(!hit)break;ns=ceil5(hit[1])}
  if(Math.abs(ns-st)>=60000){setRange(t,new Date(ns),new Date(ns+dur),true);n++}
  cursor=ns+dur;
 }
 return n;
}
function flowOn(){return S.settings.liveShift!==false}
var flowQ=null,inFlow=false;
// les tâches non faites des jours passés reviennent aujourd'hui, sans bruit ; on compte seulement les reports
function rollOver(){
 const t0=today();let n=0;
 for(const t of pastUndone()){
  if(t.recurId){deleteTask(t.id);n++;continue}
  if(t.block)clearBlock(t,true);
  t.roll=(t.roll||0)+1;t.pinned=false;t.day=t0;t.order=nextOrder(t0);n++;
 }
 return n;
}
// placement théorique d'une journée : [tâche, début, fin] dans l'ordre de la liste
function simFlow(d){
 const t0=today(),H=dayHours(d),base=+parseYmd(d),ws=base+H.s*3600e3,now=Date.now(),r=runningTask(),frozen=(S.days[d]||{}).frozen;
 let cursor=d===t0&&!frozen?Math.max(ceil5(now),ws):ws;
 if(frozen){const st=dayTasks(d).filter(t=>!t.done&&t.block&&!t.pinned).map(t=>+new Date(t.block.start));if(st.length)cursor=Math.min(...st)}
 if(r&&r.day===d&&r.block)cursor=Math.max(cursor,+new Date(r.block.end));
 const busy=busyAt(d);
 for(const t of dayTasks(d))if(t.block&&t!==r&&(t.pinned||t.done))busy.push([+new Date(t.block.start),+new Date(t.block.end)]);
 const out=[],pend=dayTasks(d).filter(t=>!t.done&&t!==r&&!t.pinned),lb={};
 const D=t=>Math.max(10,(t.est||30)-(t.actual?Math.floor(t.actual/60):0))*60000;
 const fit=(t,cur,loc)=>{const dur=D(t),bz=loc?busy.concat(lb[whereOf(t)]=lb[whereOf(t)]||locBusy(d,whereOf(t))):busy;let ns=cur;for(let g=0;g<80;g++){const hit=bz.find(([a,b])=>ns<b&&ns+dur>a);if(!hit)break;ns=ceil5(hit[1])}return ns};
 // dans l'ordre de la liste ; une tâche qui attend d'être chez toi laisse passer celles qui peuvent se faire avant
 while(pend.length){
  let k=0,ns=fit(pend[0],cursor,true);
  if(ns!==fit(pend[0],cursor,false))for(let i=1;i<pend.length;i++){const x=fit(pend[i],cursor,true);if(x<ns){ns=x;k=i}}
  const t=pend.splice(k,1)[0],ne=ns+D(t);out.push([t,ns,ne]);busy.push([ns,ne]);if(k===0)cursor=ne;
 }
 out.sort((a,b)=>a[1]-b[1]);
 return out;
}
function planFlow(d){
 // agenda vivant : chaque tâche du jour a un créneau, dans l'ordre de la liste, à partir de maintenant ; les créneaux épinglés et les rendez-vous occupés sont contournés
 const t0=today();if(d<t0)return 0;
 const now=Date.now(),r=runningTask(),frozen=(S.days[d]||{}).frozen;
 if(!frozen)for(const t of dayTasks(d))if(t.pinned&&!t.done&&t.block&&+new Date(t.block.end)<=now&&t!==r)t.pinned=false;
 let n=0,plan=simFlow(d);
 // la journée déborde : ce qui finirait après l'heure de fin glisse au lendemain, sans message.
 // D'abord les drapeaux bas, puis les tâches normales ; jamais une priorité haute ni une échéance qui tombe ce jour-là.
 // aujourd'hui, rien ne glisse tant que tu n'as pas confirmé tes heures du jour
 if(!frozen&&(d!==t0||(S.days[d]||{}).planned)){
  const end=+parseYmd(d)+dayHours(d).e*3600e3,next=addDays(d,1),canGo=t=>t.prio!=='high'&&!(t.due&&t.due<=d);
  for(let g=0;g<80&&plan.length&&plan[plan.length-1][2]>end;g++){
   const over=plan.filter(p=>p[2]>end).map(p=>p[0]);
   const pool=plan.map(p=>p[0]).filter(canGo);
   const pick=[...pool].reverse().find(t=>t.prio==='low')||[...over].reverse().find(canGo)||null;
   if(!pick)break;
   if(pick.block)clearBlock(pick,true);
   pick.day=next;pick.order=0.5;pick.slid=d;pick.roll=(pick.roll||0)+1;renorm(next);n++;
   plan=simFlow(d);
  }
 }
 for(const [t,ns,ne] of plan){
  const same=t.block&&Math.abs(+new Date(t.block.start)-ns)<60000&&Math.abs(+new Date(t.block.end)-ne)<60000;
  if(!same){setRange(t,new Date(ns),new Date(ne),true);n++}
 }
 return n;
}
function queueFlow(){if(inFlow||!flowOn())return;clearTimeout(flowQ);flowQ=setTimeout(runFlow,60)}
function runFlow(){
 if(!flowOn())return;inFlow=true;let n=0;
 try{n+=rollOver();n+=scheduleDue();const t0=today(),days=new Set([t0,addDays(t0,1)]);if(cur>t0)days.add(cur);if(view==='week'){const w=monday(cur);for(let i=0;i<7;i++){const x=addDays(w,i);if(x>=t0)days.add(x)}}if(layout==='cal')bigDays().forEach(x=>{if(x>=t0)days.add(x)});for(const d of days)n+=planFlow(d)}
 finally{inFlow=false}
 if(n){lsSet(KEY,JSON.stringify(S));if(!rz&&!drag)render()}
}
const notifOk=()=>S.settings.notif&&'Notification' in window&&Notification.permission==='granted';
function notify(key,title,body){
 const d=today();let n;try{n=JSON.parse(lsGet('journee.notified')||'{}')}catch(e){n={}}if(n.d!==d)n={d,k:[]};if(n.k.includes(key))return;n.k.push(key);lsSet('journee.notified',JSON.stringify(n));
 const opt={body,icon:'icon-192.png',badge:'icon-192.png',tag:key};
 if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.ready.then(r=>r.showNotification(title,opt)).catch(()=>{try{new Notification(title,opt)}catch(e){}});
 else{try{new Notification(title,opt)}catch(e){}}
}
function notifyTick(){
 if(!notifOk())return;const d=today(),now=Date.now(),s=S.settings,info=S.days[d]||{},base=+parseYmd(d);
 if(now>=base+s.workStart*3600e3&&now<base+(s.workStart+3)*3600e3&&!info.planned)notify('plan','Planifie ta journée','Quelques minutes pour choisir et ordonner tes tâches du jour.');
 if(now>=base+s.workEnd*3600e3&&!info.shutdown)notify('shut','Clôture ta journée','Fais le bilan et range ce qui reste pour demain.');
 const r=runningTask();
 if(r&&r.est&&actualSec(r)>=r.est*60)notify('est'+r.id+'-'+r.est,'Temps estimé atteint : '+r.title,fmtMin(r.est)+' prévues. Tu continues, ou tu passes à la suite ?');
 for(const t of dayTasks(d))if(!t.done&&t.block&&t!==r){const st=+new Date(t.block.start);if(st<=now+30000&&st>now-120000)notify('t'+t.id+st,'C’est l’heure : '+t.title,(t.est?fmtMin(t.est)+' prévues':'')+(t.block?' · jusqu’à '+hm(new Date(t.block.end)):''))}
 dueNotify(d,now,base,s);
 for(const e of timedEvents(d))if(!evFree(e)){const st=+new Date(e.start.dateTime);if(st-now<=5*60000&&st-now>-60000)notify('e'+e.id,'Dans 5 min : '+(e.summary||'rendez-vous'),hm(new Date(st))+'–'+hm(new Date(e.end.dateTime)))}
}
function liveTick(){
 notifyTick();
 if(flowOn()){const r=runningTask(),now=Date.now();if(r&&r.block&&r.day===today()&&+new Date(r.block.end)<now+60000){inFlow=true;setRange(r,new Date(r.block.start),new Date(ceil5(now)+M5),true);inFlow=false}runFlow();return}
 const d=today(),now=Date.now();let ch=false;const r=runningTask();
 if(r&&r.day===d){if(!r.block){activate(r);return}if(+new Date(r.block.end)<now+60000){setRange(r,new Date(r.block.start),new Date(ceil5(now)+M5),true);ch=true}}
 if(cascade(d))ch=true;
 if(ch){syncOrder(d);save();if(!rz&&!drag)render()}
}
function finishBlock(t){
 // tâche terminée en avance : le créneau se raccourcit et les créneaux enchaînés derrière remontent
 if(!t.block||t.day!==today())return;
 const now=Date.now(),st=+new Date(t.block.start),oldEnd=+new Date(t.block.end);
 if(oldEnd<=now||st>now)return;
 const ne=Math.max(st+M5,ceil5(now));setRange(t,new Date(st),new Date(ne),true);
 let from=oldEnd,to=ne;
 for(const x of dayTasks(t.day).filter(x=>!x.done&&x.block).sort((a,b)=>new Date(a.block.start)-new Date(b.block.start))){
  const xs=+new Date(x.block.start),xe=+new Date(x.block.end);
  if(Math.abs(xs-from)<=60000){setRange(x,new Date(to),new Date(to+(xe-xs)),true);from=xe;to=to+(xe-xs)}
 }
}
function relocateBlocks(){
 // déplace les créneaux à venir vers le bon agenda après un changement de correspondance
 const now=Date.now();S.tasks.filter(t=>t.block&&t.block.gcalId&&!t.done&&+new Date(t.block.end)>now&&(t.block.cal||S.settings.calendarId||'primary')!==taskCal(t)).forEach(t=>pushBlock(t));
}
function clearBlock(t,noRender){
 const id=t.block&&t.block.gcalId,cl=blkCal(t);t.block=null;save();
 if(id&&gTok())gFetch(`/calendars/${cl}/events/${encodeURIComponent(id)}`,{method:'DELETE'}).catch(()=>{});
 if(!noRender)render();
}
function dueLabel(t){
 if(!t.due)return '';const n=Math.round((parseYmd(t.due)-parseYmd(today()))/864e5);
 const cls=t.done?'':n<0?' late':n<=1?' soon':'';const txt=n<0?`en retard de ${-n} j`:n===0?'aujourd’hui':n===1?'demain':n<7?`dans ${n} j`:fmtDay(t.due,{day:'numeric',month:'short'});
 return `<span class="due${cls}" title="Échéance : ${fmtDay(t.due)}">⏰ ${txt}</span>`;
}
function scheduleDue(){
 // place chaque tâche à échéance sur le jour le moins chargé avant sa date limite
 const t0=today();let n=0,msgs=[];
 for(const t of S.tasks){
  if(t.done||!t.due)continue;
  if(t.day&&t.day<=t.due&&t.day>=t0)continue;
  if(t.day&&t.day<t0)continue; // en retard : géré par le report
  const last=t.due<t0?t0:t.due;let best=null,bl=1e9;
  for(let d=t0;d<=last;d=addDays(d,1)){const L=loadInfo(d),over=L.task+L.meet+(t.est||30)-L.cap,score=(over>0?1e5+over:0)+L.task;if(score<bl){bl=score;best=d}}
  if(best&&best!==t.day){if(t.block&&ymd(new Date(t.block.start))!==best)clearBlock(t,true);t.day=best;t.inbox=false;t.order=nextOrder(best);n++;msgs.push(t.title+' → '+fmtDay(best,{weekday:'short',day:'numeric'}))}
 }
 if(n)toast((n>1?n+' tâches planifiées':'Planifiée')+' avant l’échéance : '+msgs.slice(0,2).join(', '));
 return n;
}
function syncOrder(d){
 // la liste suit l'agenda : les tâches planifiées reprennent l'ordre horaire, les autres gardent leur place
 const ts=dayTasks(d).filter(t=>!t.done),slots=[];ts.forEach((t,i)=>{if(t.block)slots.push(i)});
 const bl=ts.filter(t=>t.block).sort((a,b)=>new Date(a.block.start)-new Date(b.block.start)),arr=ts.slice();
 slots.forEach((pos,k)=>arr[pos]=bl[k]);arr.forEach((t,i)=>t.order=i+1);dayTasks(d).filter(t=>t.done).forEach((t,i)=>t.order=arr.length+i+1);
}
function overlaps(d){const b=dayTasks(d).filter(t=>!t.done&&t.block).map(t=>[new Date(t.block.start)-0,new Date(t.block.end)-0]).sort((x,y)=>x[0]-y[0]);for(let i=1;i<b.length;i++)if(b[i][0]<b[i-1][1])return true;return false}
function setEst(t,v){
 t.est=v;if(t.recurId){const r=S.recurring.find(x=>x.id===t.recurId);if(r)r.est=v}
 if(t.block){setBlock(t,new Date(t.block.start),true);if(t.day&&!flowOn())pushOverlaps(t.day,t)}
 t.aiSug=null;save();render();
}
function pushOverlaps(d,from){
 // décale vers plus tard uniquement les créneaux qui se chevauchent, sans toucher aux autres
 const ts=dayTasks(d).filter(t=>!t.done&&t.block).sort((a,b)=>new Date(a.block.start)-new Date(b.block.start));let n=0;
 for(let i=1;i<ts.length;i++){const prevEnd=new Date(ts[i-1].block.end);if(new Date(ts[i].block.start)<prevEnd){setBlock(ts[i],prevEnd,true);n++}}
 if(n)toast(n+' créneau'+(n>1?'x':'')+' décalé'+(n>1?'s':'')+' pour éviter un chevauchement');return n;
}
function reflow(d){
 // suit l'ordre de la liste : les tâches déjà placées dans l'agenda sont réenchaînées dans cet ordre
 const ts=dayTasks(d).filter(t=>!t.done&&t.block);if(ts.length<2)return 0;
 const base=parseYmd(d),mins=x=>{const a=new Date(x);return a.getHours()*60+a.getMinutes()};
 let st=Math.min(...ts.map(t=>mins(t.block.start)));
 const busy=timedEvents(d).filter(e=>!evFree(e)).map(e=>[mins(e.start.dateTime),mins(e.end.dateTime)]);
 S.tasks.filter(t=>t.done&&t.block&&ymd(new Date(t.block.start))===d).forEach(t=>busy.push([mins(t.block.start),mins(t.block.end)]));
 let n=0;
 for(const t of ts){const dur=t.est||30;for(let g=0;g<200;g++){const hit=busy.find(([a,b])=>st<b&&st+dur>a);if(!hit)break;st=Math.ceil(hit[1]/5)*5}
  const dt=new Date(base);dt.setMinutes(st);if(dt.toISOString()!==new Date(t.block.start).toISOString()){setBlock(t,dt,true);n++}st+=dur}
 return n;
}
function autoBox(d){
 const s=S.settings,base=parseYmd(d);
 let from=s.workStart*60;
 if(d===today()){const n=new Date();from=Math.max(from,Math.ceil((n.getHours()*60+n.getMinutes())/15)*15)}
 const end=s.workEnd*60;
 const busy=timedEvents(d).filter(e=>!evFree(e)).map(e=>{const a=new Date(e.start.dateTime),b=new Date(e.end.dateTime);return[a.getHours()*60+a.getMinutes(),b.getHours()*60+b.getMinutes()+(ymd(b)!==d?1440:0)]});
 S.tasks.filter(t=>t.block&&ymd(new Date(t.block.start))===d).forEach(t=>{const a=new Date(t.block.start),b=new Date(t.block.end);busy.push([a.getHours()*60+a.getMinutes(),b.getHours()*60+b.getMinutes()])});
 let n=0;
 for(const t of dayTasks(d).filter(t=>!t.done&&!t.block)){
  const dur=t.est||30;let st=from;
  for(let guard=0;guard<200;guard++){const hit=busy.find(([a,b])=>st<b&&st+dur>a);if(!hit)break;st=Math.ceil(hit[1]/5)*5}
  if(st+dur>end)continue;
  const dt=new Date(base);dt.setMinutes(st);setBlock(t,dt,true);busy.push([st,st+dur]);n++;
 }
 syncOrder(d);save();render();return n;
}

// rappels d'échéance : 3 jours avant (si pas de date prévue), la veille au soir, le matin du jour J, chaque matin en cas de retard
function dueNotify(d,now,base,s){
 const open=S.tasks.filter(t=>!t.done&&t.due),tom=addDays(d,1),morning=now>=base+s.workStart*3600e3,evening=now>=base+s.workEnd*3600e3;
 const list=xs=>xs.slice(0,3).map(t=>t.title).join(' · ')+(xs.length>3?' · +'+(xs.length-3):'');
 if(morning){
  const today_=open.filter(t=>t.due===d),late=open.filter(t=>t.due<d),soon=open.filter(t=>!t.day&&t.due>d&&t.due<=addDays(d,3));
  if(today_.length)notify('dueJ','Échéance aujourd’hui',list(today_));
  if(late.length)notify('dueLate',late.length>1?late.length+' échéances dépassées':'Échéance dépassée',list(late));
  if(soon.length)notify('dueSoon','Échéance dans '+(soon.length>1?'les prochains jours':'quelques jours')+', pas encore prévue',list(soon));
 }
 if(evening){const tm=open.filter(t=>t.due===tom);if(tm.length)notify('dueEve','Demain : échéance',list(tm))}
}
