// démo : faux agendas de boulot (aucune donnée réelle)
(function(){
 const f=()=>{try{
  gCals=[{id:'demo-travail',name:'Travail',selected:true},{id:'demo-villette',name:'webcal://villette.diesesoftware.com/demo.ics',selected:true},{id:'demo-perso',name:'Perso',selected:true}];
  const t0=today(),at=(d,h)=>{const x=parseYmd(d);x.setMinutes(Math.round(h*60));return x.toISOString()};
  const ev=(d,id,t,a,b,cid,cal)=>({id,summary:t,start:{dateTime:at(d,a)},end:{dateTime:at(d,b)},_cid:cid,_cal:cal,_col:'#7f9cc0'});
  const T=(d,id,t,a,b)=>ev(d,id,t,a,b,'demo-travail','Travail'),V=(d,id,t,a,b)=>ev(d,id,t,a,b,'demo-villette','Villette');
  const d1=addDays(t0,1),d2=addDays(t0,2),d3=addDays(t0,3);
  const P=(d,id,t,a,b)=>Object.assign(ev(d,id,t,a,b,'demo-perso','Perso'),{_col:'#2f9e6a',htmlLink:'https://calendar.google.com/'});
  gEvents[t0]=[T(t0,'x1','Salon Démo / Montage',8,11),T(t0,'x2','Salon Démo / Exploitation',11,17),P(t0,'p1','Appel avec Léa (fictif)',20,20.5)];
  gEvents[d1]=[T(d1,'x3','Autre / Indisponible sur la phase du jour',9,18),P(d1,'p2','Dentiste (fictif)',18.5,19.25)];
  gEvents[d2]=[V(d2,'x4','Son/AV équipe A - Spectacle de démo',13.5,19.5)];
  gEvents[d3]=[{id:'x5',summary:'Mvision',start:{date:d3},end:{date:addDays(d3,1)},_cid:'demo-travail',_cal:'Travail',transparency:'transparent'}];
  // la tâche reportée 4 fois reste aujourd'hui (priorité haute) pour être visible dans la clôture
  const pf=S.tasks.find(t=>/plan de feu/i.test(t.title));if(pf){pf.day=t0;pf.block=null;pf.pinned=false;pf.done=false;pf.prio='high';pf.roll=Math.max(4,pf.roll||0);save()}
  if(!(S.archive||[]).some(a=>a.id==='dm-a1')){S.archive=(S.archive||[]).concat([{id:'dm-a1',t:'Passer l’aspirateur',a:22*60,d:addDays(t0,-7)},{id:'dm-a2',t:'Passer l’aspirateur',a:18*60,d:addDays(t0,-14)},{id:'dm-a3',t:'Passer l’aspirateur',a:20*60,d:addDays(t0,-21)}]);save()}
  {const t=S.tasks.find(x=>x.day===today()&&!x.done&&!(x.subtasks||[]).length&&/JDR/.test(x.title));if(t&&!t._dmsub){t._dmsub=1;t.subtasks=[{id:'dms1',t:'Relire le scénario',d:true},{id:'dms2',t:'Préparer les fiches PNJ',d:false},{id:'dms3',t:'Imprimer la carte',d:false}];save()}}
  if(!S.unavail){S.unavail=[{id:'dm-ua1',label:'Cours de piano',days:['3'],s:'18:30',e:'19:30'},{id:'dm-ua2',label:'Déjeuner',days:['1','2','3','4','5'],s:'12:30',e:'13:15'}];save()}
  if(!S.tasks.some(t=>t.id==='dm-b1')){[['Réserver le contrôle technique',30,'high',-2],['Trier les photos de vacances',90,'',-9],['Changer l’ampoule du couloir',10,'low',-1],['Racheter des piles',5,'',-4],['Ranger la cave',120,'low',-20],['Écrire à Lucie pour le week-end',15,'high',-3],['Comparer les box internet',45,'',-12],['Réparer la chaise bancale',30,'',-6]].forEach(([t,e,p,ago],i)=>S.tasks.push(mk({id:'dm-b'+(i+1),title:t,est:e,prio:p,day:null,order:100+i,created:Date.now()+ago*864e5})));save()}
  if(!S.tasks.some(t=>t.id==='dm-fut')){S.tasks.push(mk({id:'dm-fut',title:'Préparer la valise',day:d2,est:25,order:1}));save()}
  render();
 }catch(e){console.warn(e)}};
 // dans la démo, le cadre de Claude bloque le rechargement : « Actualiser » rafraîchit l'affichage
 document.addEventListener('click',e=>{const b=e.target.closest('.navrefresh');if(!b)return;e.stopImmediatePropagation();e.preventDefault();b.classList.add('spin');setTimeout(()=>{b.classList.remove('spin');render();toast('Démo actualisée (dans l’appli en ligne, la page se recharge)')},600)},true);
 window.addEventListener('load',()=>setTimeout(f,300));
 // démo « Trier mes mails » : faux mails, faux Génie (rien ne part nulle part)
 window.addEventListener('load',()=>{
  if(!S.settings.aiKey){S.settings.aiKey='demo';save()}
  gmailOk=()=>true;unreadCount=async()=>4;
  unreadMails=async()=>({errs:[],all:[{src:'Gmail',from:'Point Relais Démo',subject:'Votre colis vous attend jusqu’au '+fmtDay(addDays(today(),4),{day:'numeric',month:'long'}),date:'',snippet:''},{src:'Gmail',from:'Lucie (fictive)',subject:'Tu viens samedi ?',date:'',snippet:''},{src:'Outlook',from:'Fournisseur Démo',subject:'Facture n° 0042 à régler avant le 5',date:'',snippet:''},{src:'Gmail',from:'Newsletter Démo',subject:'Les promos de la semaine',date:'',snippet:''}]});
  callClaude=async(msgs)=>{const txt=JSON.stringify(msgs);await new Promise(r=>setTimeout(r,700));
   if(txt.includes('<mails>'))return{text:'4 mails lus, 3 demandent une action (la newsletter est ignorée).',prop:{message:'',new_tasks:[{title:'Retirer le colis au point relais',est:15,day:addDays(today(),1),channel:'Gestion › Courses & démarches',reason:'Point Relais Démo · « Votre colis vous attend »'},{title:'Répondre à Lucie pour samedi',est:5,day:today(),channel:'Liens › Amis',reason:'Lucie · « Tu viens samedi ? »'},{title:'Payer la facture 0042',est:10,day:'backlog',channel:'Gestion › Budget & épargne',reason:'Fournisseur Démo · « Facture à régler avant le 5 »'}]}};
   return{text:'Démo : le Génie n’est pas branché ici. Essaie « Trier mes mails ».',prop:null}};
 });

})();
