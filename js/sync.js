// MyDayBot — synchro entre appareils par fusion (Google Drive)
/* ---------- synchro entre appareils (dossier caché de l'appli dans Google Drive) ---------- */
let syncBusy=false,syncState='';
async function dfetch(url,opts={}){
 const t=gTok();if(!t)throw new Error('Google non connecté');
 const r=await fetch(url,{...opts,headers:{Authorization:'Bearer '+t,...(opts.headers||{})}});
 if(r.status===401){lsDel('journee.g');throw new Error('session expirée')}
 if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error((j.error&&j.error.message)||('erreur '+r.status))}
 return r;
}
async function driveSync(){
 if(!gTok()||syncBusy)return;syncBusy=true;
 try{
  const q=encodeURIComponent("name='journee.json'");
  const list=await (await dfetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`)).json();
  const f=list.files&&list.files[0];
  const local=()=>{const c=Object.assign({},S);delete c.running;c.settings=Object.assign({},S.settings,{aiKey:''});return JSON.stringify(c)};
  if(f){
   const remote=await (await dfetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`)).json();
   const base=S.syncedAt?S:Object.assign({},S,{tasks:S.tasks.filter(t=>!/^Exemple : /.test(t.title))});
   const merged=mergeState(base,remote);
   if(dataJson(merged)!==dataJson(S)){const run=S.running;S=Object.assign(defaults(),merged);S.settings=Object.assign(defaults().settings,merged.settings||{});S.running=run;snap=null;stamp();genRecurring();render()}
   S.syncedAt=Date.now();lsSet(KEY,JSON.stringify(S));
   if(dataJson(S)!==dataJson(Object.assign(defaults(),remote))){await dfetch(`https://www.googleapis.com/upload/drive/v3/files/${f.id}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:local()})}
   syncState='Synchronisé à '+hm(new Date());
  }else{
   const b='journee'+Date.now(),meta=JSON.stringify({name:'journee.json',parents:['appDataFolder']});
   await dfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${local()}\r\n--${b}--`});
   S.syncedAt=Date.now();lsSet(KEY,JSON.stringify(S));syncState='Synchronisé';
  }
 }catch(e){syncState='Synchro en échec : '+e.message;if(/insufficient|scope|permission/i.test(e.message))syncState='Reconnecte Google pour activer la synchro'}
 finally{syncBusy=false;const el=document.querySelector('[data-live="sync"]');if(el)el.textContent=syncState}
}
