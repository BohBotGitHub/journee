// Diem — retour des connexions OAuth et partage Android
/* ---------- retour de connexion OAuth ---------- */
(function handleAuth(){
 const h=new URLSearchParams(location.hash.slice(1));
 const gst=(h.get('state')||'').split('|');
 if(gst[0]==='g'||gst[0]==='gs'){
  const silent=gst[0]==='gs';
  if(gst[1]&&VIEWS.includes(gst[1]))view=gst[1];if(/^\d{4}-\d\d-\d\d$/.test(gst[2]||''))cur=gst[2];
  if(h.get('access_token')){const tok=h.get('access_token');lsSet('journee.g',JSON.stringify({t:tok,exp:Date.now()+(+h.get('expires_in')||3600)*1000,scope:h.get('scope')||''}));lsSet('journee.g.on','1');lsDel('journee.g.fail');if(!silent)setTimeout(()=>toast('Google Agenda connecté'),300);
   fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+tok}}).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.email)lsSet('journee.g.email',j.email)}).catch(()=>{})}
  else if(h.get('error')){if(silent)lsSet('journee.g.fail',String(Date.now()));else setTimeout(()=>toast('Google : '+h.get('error')),300)}
  history.replaceState(null,'',REDIRECT+'#'+view);
 }
 const q=new URLSearchParams(location.search);
 if(q.has('share')||q.has('text')||q.has('url')){const txt=[q.get('title'),q.get('text'),q.get('url')].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' — ');if(txt){S.dump=(S.dump?S.dump.replace(/\s*$/,'')+'\n':'')+txt;lsSet(KEY,JSON.stringify(S));setTimeout(()=>toast('Ajouté au braindump'),400)}view='dump';history.replaceState(null,'',REDIRECT+'#dump')}
 if(q.get('state')==='m'){
  history.replaceState(null,'',REDIRECT);
  if(q.get('code'))msToken({grant_type:'authorization_code',code:q.get('code'),redirect_uri:REDIRECT,code_verifier:lsGet('journee.m.v')||''})
   .then(()=>{lsDel('journee.m.v');toast('Microsoft To Do connecté');sideTab='todo';loadTodoLists()})
   .catch(e=>toast('Connexion Microsoft impossible : '+e.message));
  else if(q.get('error'))setTimeout(()=>toast('Microsoft : '+(q.get('error_description')||q.get('error'))),300);
 }
 {const v=location.hash.slice(1);if(VIEWS.includes(v))view=v}
})();
