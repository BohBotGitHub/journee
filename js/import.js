// MyDayBot — import Sunsama
/* ---------- import Sunsama (export CSV : Settings → Account Management) ---------- */
function archivePatterns(){
 const m={};for(const a of S.archive||[]){if(!a.a)continue;const k=a.t.toLowerCase();(m[k]=m[k]||{t:a.t,n:0,s:0,c:a.c});m[k].n++;m[k].s+=a.a}
 return Object.values(m).filter(x=>x.n>=3).sort((a,b)=>b.n-a.n).slice(0,25).map(x=>`- ${x.t} : ${x.n} fois, ~${Math.round(x.s/x.n/60)} min${ch(x.c)?' | '+ch(x.c).name:''}`).join('\n');
}
function parseCSV(txt){
 const rows=[];let row=[],f='',q=false;
 for(let i=0;i<txt.length;i++){const c=txt[i];
  if(q){if(c==='"'){if(txt[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
  else if(c==='"')q=true;else if(c===','){row.push(f);f=''}else if(c==='\n'){row.push(f);rows.push(row);row=[];f=''}else if(c!=='\r')f+=c}
 if(f||row.length){row.push(f);rows.push(row)}
 const h=rows.shift().map(x=>x.replace(/^﻿/,''));return rows.filter(r=>r.length>1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]||''])));
}
const htmlText=h=>{if(!h)return'';const x=h.replace(/<li>/g,'<li>- ').replace(/<\/(p|li|h\d)>|<br\s*\/?>/g,'\n');return strip(x).replace(/\n{3,}/g,'\n\n').trim()};
const jparse=(v,d)=>{try{return JSON.parse(v)}catch(e){return d}};
function importSunsama(txt){
 const rows=parseCSV(txt);if(!rows.length||!('sequenceRule' in rows[0]))throw new Error('ce fichier ne ressemble pas à un export Sunsama');
 const t0=today(),stale=addDays(t0,-30),RIT=/^(daily planning|daily shutdown|weekly planning|weekly review)$/i;
 const CTX={Perso:'#2f9e6a',Pro:'#3b6fd8',Art:'#9b4dca','Déménagement':'#c99a06'};
 const shade=(hex,i)=>{const n=parseInt(hex.slice(1),16),k=(i%4)*18-18,cl=v=>Math.max(0,Math.min(255,v+k));return '#'+[n>>16,(n>>8)&255,n&255].map(v=>cl(v).toString(16).padStart(2,'0')).join('')};
 const st={tasks:0,archive:0,channels:0,objectives:0,recurring:0,skipped:0,dup:0};
 S.tasks=S.tasks.filter(t=>!/^Exemple : /.test(t.title));
 const chIdx={},perCtx={},tree=hasTree();
 // arbre en place : chaque tâche est rangée d'après son ancien canal et son titre
 const cname=r=>(r.channel||'').replace(/^#/,'').trim();
 const chOf=r=>tree?classify(r.text,cname(r)):(chIdx[cname(r)]||null);
 const projOf=r=>{if(!tree)return null;const n=cname(r);if(!PROJ_FROM.includes(norm(n)))return null;S.projects=S.projects||[];let p=S.projects.find(x=>norm(x.name)===norm(n));if(!p){p={id:'pr-'+norm(n).replace(/[^a-z0-9]+/g,'-'),name:n,end:null,done:false};S.projects.push(p)}return p.id};
 if(!tree)for(const r of rows){const name=(r.channel||'').replace(/^#/,'').trim();if(!name||chIdx[name])continue;const ctx=(r.context||'').replace(/^#/,'').trim();
  let c=S.channels.find(x=>x.name.toLowerCase()===name.toLowerCase());perCtx[ctx]=(perCtx[ctx]||0)+1;
  if(!c){c={id:'sun-c-'+name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-'),name,color:shade(CTX[ctx]||'#8a8f98',perCtx[ctx])};S.channels.push(c);st.channels++}
  c.ctx=ctx;chIdx[name]=c.id}
 if(!tree)S.channels=S.channels.filter(c=>!(['c1','c3'].includes(c.id)&&!S.tasks.some(t=>t.channel===c.id)));
 const rec={},recMap={};
 for(const r of rows){if(!r.sequenceRule)continue;const k=r.text+'|'+r.sequenceRule;(rec[k]=rec[k]||[]).push(r)}
 const DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
 for(const [k,list] of Object.entries(rec)){const last=list.map(r=>r.startDate).filter(Boolean).sort().pop();if(!last||last<addDays(t0,-60))continue;
  const r0=list[0],rule=r0.sequenceRule;const tpl={id:'sun-r-'+r0.id,title:r0.text,channel:chOf(r0),est:+r0.timeEstimate||0,notes:'',subs:[],from:addDays(last,1),skip:[]};
  let m;
  if(/every day/.test(rule))tpl.rule='daily';else if((m=rule.match(/every week on (\w+)/i))){tpl.rule='weekly';tpl.dow=DAYS.indexOf(m[1].toLowerCase())}else if((m=rule.match(/every month on the (\d+)/))){tpl.rule='monthly';tpl.dom=+m[1]}else continue;
  if(!S.recurring.some(x=>x.id===tpl.id)){S.recurring.push(tpl);st.recurring++}recMap[k]=tpl.id}
 const objMap={};S.archive=S.archive||[];
 const have=new Set(S.tasks.map(t=>t.id)),haveA=new Set(S.archive.map(a=>a.id));
 for(const r of rows){
  const id='sun-'+r.id;if(have.has(id)||haveA.has(id)){st.dup++;continue}
  if(!r.text||RIT.test(r.text.trim())){st.skipped++;continue}
  const done=!!r.completedDate;let day=r.startDate||null;const chId=chOf(r);
  const actual=+r.actualTimeSeconds||0,est=+r.timeEstimate||0;
  if(done&&day&&day<stale){const a={id,t:r.text,c:chId,d:day,e:est,a:actual};if(r.objective)a.o=r.objective;S.archive.push(a);st.archive++;continue}
  if(!done&&day&&day<stale)day=null;
  const subs=jparse(r.subtasks,[]).map(x=>({id:uid(),t:x.title||'',d:!!x.completedDate})).filter(x=>x.t);
  const t=mk({id,title:r.text,notes:htmlText(r.notes),channel:chId,est,actual,day,done,doneAt:done?Date.parse(r.completedDate):null,subtasks:subs,order:r.createdAt?Date.parse(r.createdAt)/1e12:0,
   proj:projOf(r),prio:{Urgent:'urgent',Priority:'high','Low Priority':'low'}[r.latestDailyPriority]||'',recurId:recMap[r.text+'|'+r.sequenceRule]||null});
  const sch=jparse(r.scheduledTime,[])[0];if(!done&&day&&day>=t0&&sch&&sch.startDate&&sch.endDate)t.block={start:sch.startDate,end:sch.endDate,gcalId:null,title:t.title};
  if(r.objective&&day&&day>=stale){const w=monday(day),k=w+'|'+r.objective;if(!objMap[k]){let o=S.objectives.find(o=>o.week===w&&o.title===r.objective);if(!o){o={id:'sun-o-'+uid(),week:w,title:r.objective,done:false};S.objectives.push(o);st.objectives++}objMap[k]=o}t.objId=objMap[k].id}
  S.tasks.push(t);st.tasks++;
 }
 for(const o of Object.values(objMap)){const lt=S.tasks.filter(t=>t.objId===o.id);if(lt.length&&lt.every(t=>t.done))o.done=true}
 for(const d of new Set(S.tasks.filter(t=>t.day).map(t=>t.day)))renorm(d);
 genRecurring();save();render();emit('import:sunsama',st);return st;
}
