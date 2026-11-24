// MyDayBot — Microsoft To Do
/* ---------- Microsoft To Do (OAuth PKCE + Microsoft Graph) ---------- */
const MS='https://login.microsoftonline.com/common/oauth2/v2.0';
const MS_SCOPE='openid offline_access User.Read Tasks.ReadWrite';
const msOn=()=>!!lsGet('journee.m');
const b64url=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function msLogin(){
 if(!S.settings.msClientId){toast('Ajoute d’abord ton identifiant d’application Microsoft dans Réglages');go('settings');return}
 if(!window.crypto||!crypto.subtle){toast('Il faut ouvrir l’appli en https (ou sur localhost) pour se connecter');return}
 const v=b64url(crypto.getRandomValues(new Uint8Array(32)));lsSet('journee.m.v',v);
 const c=b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))));
 location.href=MS+'/authorize?'+new URLSearchParams({client_id:S.settings.msClientId.trim(),response_type:'code',redirect_uri:REDIRECT,scope:MS_SCOPE,code_challenge:c,code_challenge_method:'S256',state:'m',response_mode:'query',prompt:'select_account'});
}
function msLogout(){lsDel('journee.m');todo.lists=null;todo.tasks={};render()}
async function msToken(body){
 const old=JSON.parse(lsGet('journee.m')||'null');
 const r=await fetch(MS+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:S.settings.msClientId.trim(),scope:MS_SCOPE,...body})});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error_description||j.error||('erreur '+r.status));
 lsSet('journee.m',JSON.stringify({t:j.access_token,r:j.refresh_token||(old&&old.r),exp:Date.now()+(j.expires_in||3600)*1000}));
 return j.access_token;
}
async function msAccess(){
 let o;try{o=JSON.parse(lsGet('journee.m')||'null')}catch(e){o=null}
 if(!o)return null;if(o.exp>Date.now()+60000)return o.t;if(!o.r)return null;
 try{return await msToken({grant_type:'refresh_token',refresh_token:o.r})}catch(e){lsDel('journee.m');toast('Session Microsoft expirée, reconnecte-toi');return null}
}
async function graph(path,opts={}){
 const t=await msAccess();if(!t)throw new Error('Microsoft non connecté');
 const r=await fetch('https://graph.microsoft.com/v1.0'+path,{...opts,headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'}});
 if(r.status===204)return null;const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error((j.error&&j.error.message)||('erreur '+r.status));return j;
}
async function loadTodoLists(){
 if(todo.loading)return;todo.loading=true;
 try{const j=await graph('/me/todo/lists');todo.lists=j.value||[];
  if(!todo.listId||!todo.lists.some(l=>l.id===todo.listId)){const def=todo.lists.find(l=>l.wellknownListName==='defaultList')||todo.lists[0];todo.listId=def?def.id:null}
 }catch(e){todo.lists=todo.lists||[];toast('To Do : '+e.message)}
 finally{todo.loading=false;render()}
}
async function loadTodoTasks(l,force){
 if(!l||todo.tLoading||(todo.tasks[l]&&!force))return;todo.tLoading=true;
 try{let items=[],url=`/me/todo/lists/${encodeURIComponent(l)}/tasks?$top=100&$filter=${encodeURIComponent("status ne 'completed'")}`;
  for(let i=0;i<5&&url;i++){const j=await graph(url);items=items.concat(j.value||[]);url=j['@odata.nextLink']?j['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0',''):null}
  todo.tasks[l]=items;
 }catch(e){todo.tasks[l]=[];toast('To Do : '+e.message)}
 finally{todo.tLoading=false;render();if(ritual&&ritual.type==='plan'&&ritual.step===1)renderRitual()}
}
function importTodo(l,x,day){
 let t=S.tasks.find(t=>t.src&&t.src.taskId===x.id);
 if(t){if(day!==undefined&&t.day!==day)moveTask(t.id,day,true);return t}
 t=mk({title:x.title||'(sans titre)',notes:x.body&&x.body.content?(x.body.contentType==='html'?strip(x.body.content):x.body.content.trim()):'',day,order:nextOrder(day),src:{type:'mstodo',listId:l,taskId:x.id}});
 S.tasks.push(t);save();return t;
}
async function pushTodo(t){
 if(!todo.lists)await loadTodoLists();
 const l=todo.listId;if(!l){toast('Aucune liste To Do trouvée');return}
 try{const x=await graph(`/me/todo/lists/${encodeURIComponent(l)}/tasks`,{method:'POST',body:JSON.stringify({title:t.title,body:{content:t.notes||'',contentType:'text'}})});
  t.src={type:'mstodo',listId:l,taskId:x.id};save();delete todo.tasks[l];toast('Tâche créée dans To Do');render();if(modalTask===t.id)openTask(t.id);
 }catch(e){toast('To Do : '+e.message)}
}
let syncing=false;
async function syncTodo(){
 if(!msOn()||syncing)return;syncing=true;
 const lim=addDays(today(),-14);let changed=false;
 for(const t of S.tasks.filter(t=>t.src&&!t.done&&(!t.day||t.day>=lim)).slice(0,40)){
  try{const x=await graph(`/me/todo/lists/${encodeURIComponent(t.src.listId)}/tasks/${encodeURIComponent(t.src.taskId)}`);
   if(x.status==='completed'){t.done=true;t.doneAt=Date.now();changed=true}
   if(x.title&&x.title!==t.title){t.title=x.title;changed=true}
  }catch(e){if(/non connecté/.test(e.message))break}
 }
 syncing=false;if(changed){save();render()}
}
