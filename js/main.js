// MyDayBot — démarrage
/* ---------- démarrage ---------- */
genRecurring();
render();
runFlow(); // les fonctions des autres modules n'existaient pas encore pendant l'initialisation des données
if(S.running&&T(S.running.taskId))renderRun();
if(msOn()&&S.settings.msClientId)setTimeout(syncTodo,1500);
setTimeout(driveSync,800);
setTimeout(aiMorning,1500);
{const r=savedRit();if(r&&Date.now()-r.at<3*3600e3&&r.day>=today()){cur=r.day;setTimeout(()=>{if(!ritual&&$('#modal').classList.contains('hidden')){ritual=r;renderRitual()}},400)}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){setTimeout(gSilent,800);liveTick();driveSync();if(msOn())syncTodo();if(gTok()){gEvents={};render()}}});
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').catch(()=>{})}
