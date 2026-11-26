// Diem — synchro entre appareils par fusion (Google Drive)
/* ---------- synchro entre appareils (dossier caché de l'appli dans Google Drive) ---------- */
let syncBusy=false,syncState='',remoteMod=null,syncAgain=false;
async function dfetch(url,opts={}){
 const t=gTok();if(!t)throw new Error('Google non connecté');
 const r=await fetch(url,{...opts,headers:{Authorization:'Bearer '+t,...(opts.headers||{})}});
 if(r.status===401){lsDel('journee.g');throw new Error('session expirée')}
 if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error((j.error&&j.error.message)||('erreur '+r.status))}
 return r;
}
async function driveSync(light){
 if(!gTok()){if(!syncTried&&!gWas()){syncTried=true;queueFlow()}return}if(syncBusy){if(!light)syncAgain=true;return}syncBusy=true;
 try{
  const q=encodeURIComponent("name='journee.json'");
  const list=await (await dfetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`)).json();
  const f=list.files&&list.files[0];
  const local=()=>{const c=Object.assign({},S);delete c.running;c.settings=Object.assign({},S.settings);return JSON.stringify(c)};
  const dirty=(S.updatedAt||0)>(S.syncedAt||0);
  if(f&&light&&!dirty&&f.modifiedTime===remoteMod){syncState='Synchronisé à '+hm(new Date());return}
  if(f){remoteMod=f.modifiedTime;
   const remote=await (await dfetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`)).json();
   const base=S.syncedAt?S:Object.assign({},S,{tasks:S.tasks.filter(t=>!/^Exemple : /.test(t.title))});
   const merged=mergeState(base,remote);
   if(dataJson(merged)!==dataJson(S)){const run=S.running;S=Object.assign(defaults(),merged);S.settings=Object.assign(defaults().settings,merged.settings||{});S.running=run;snap=null;stamp();if(hasTree())treeColors();genRecurring();render()}
   S.syncedAt=Date.now();lsSet(KEY,JSON.stringify(S));
   if(dataJson(S)!==dataJson(Object.assign(defaults(),remote))){const up=await (await dfetch(`https://www.googleapis.com/upload/drive/v3/files/${f.id}?uploadType=media&fields=id,modifiedTime`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:local()})).json().catch(()=>({}));if(up.modifiedTime)remoteMod=up.modifiedTime}
   syncState='Synchronisé à '+hm(new Date());
  }else{
   const b='journee'+Date.now(),meta=JSON.stringify({name:'journee.json',parents:['appDataFolder']});
   await dfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${local()}\r\n--${b}--`});
   S.syncedAt=Date.now();lsSet(KEY,JSON.stringify(S));syncState='Synchronisé';
  }
 }catch(e){syncState='Synchro en échec : '+e.message;if(/insufficient|scope|permission/i.test(e.message))syncState='Reconnecte Google pour activer la synchro'}
 finally{syncBusy=false;if(!syncTried){syncTried=true;queueFlow()}document.querySelectorAll('[data-live="sync"]').forEach(el=>el.textContent=syncState);renderSyncBar();if(syncAgain){syncAgain=false;setTimeout(()=>driveSync(),300)}}
}

/* ---------- synchro quasi immédiate : envoi 1,5 s après chaque modification, vérification toutes les 15 s ---------- */
// la vérification ne télécharge rien si le fichier Drive n'a pas changé (une seule petite requête)
setInterval(()=>{if(!document.hidden&&navigator.onLine!==false)driveSync(true)},15000);
window.addEventListener('focus',()=>driveSync(true));
window.addEventListener('online',()=>driveSync());
window.addEventListener('pagehide',()=>{if((S.updatedAt||0)>(S.syncedAt||0))driveSync()});
// bandeau : cet appareil n'est pas relié à Google, donc pas synchronisé
function renderSyncBar(){
 const el=document.getElementById('syncbar');if(!el)return;
 const off=!gTok(),was=gWas();
 if(!off||lsGet('journee.sync.hide')===today()||(navigator.webdriver&&!lsGet('journee.sync.test'))){el.innerHTML='';el.classList.add('hidden');return}
 el.classList.remove('hidden');
 el.innerHTML=`<span>${was?'Session Google expirée : cet appareil ne se synchronise plus.':'Cet appareil n’est pas synchronisé avec tes autres appareils.'}</span><button class="sm pri" data-act="gin">${was?'Reconnecter':'Connecter Google'}</button><button class="x" data-act="synchide" aria-label="Masquer pour aujourd’hui">×</button>`;
}

// notifications activées sur un autre appareil : l'autorisation du navigateur est demandée ici au premier geste
document.addEventListener('click',function askN(){if(S.settings.notif&&'Notification' in window&&Notification.permission==='default'){try{Notification.requestPermission()}catch(e){}}if(!('Notification' in window)||Notification.permission!=='default'||!S.settings.notif)document.removeEventListener('click',askN,true)},true);
