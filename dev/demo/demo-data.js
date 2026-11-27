// Démo MyDayBot : données fictives, rien n'est envoyé nulle part (pas de Google, pas de synchro)
(function(){
 const KEY='journee.v1',VER='demo-hab-1';
 try{if(localStorage.getItem('journee.demo')===VER)return}catch(e){return}
 const d=new Date(),ymd=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
 const t0=ymd(d),y=ymd(new Date(d.getTime()-864e5)),id=()=>Math.random().toString(36).slice(2,10);
 const mk=(title,channel,est,o={})=>Object.assign({id:id(),title,notes:'',channel,est,actual:0,day:t0,done:false,doneAt:null,subtasks:[],order:0,objId:null,recurId:null,src:null,block:null,prio:'',due:null,proj:null},o);
 const tasks=[
  mk('Appeler la mutuelle pour comprendre pourquoi le remboursement de la séance de kiné du mois dernier n’est toujours pas arrivé','c-admin',0),
  mk('Relire le devis lumière pour le spectacle','c-villette',10,{prio:'high',due:ymd(new Date(d.getTime()+864e5))}),
  mk('Natation 1 km','c-natation',45),
  mk('Mesures du salon pour l’étagère','d-foyer',10),
  mk('Préparer la séance de JDR de samedi','c-jdr',60,{prio:'low'}),
  mk('Tonte barbe','c-routines',10),
  mk('Passer l’aspirateur',null,20),
  mk('Méditation du matin','c-meditation',10,{done:true,doneAt:Date.now()-3*3600e3,actual:600}),
  mk('Duolingo','c-langues',10,{done:true,doneAt:Date.now()-2*3600e3,actual:540}),
  mk('Envoyer le plan de feu à l’équipe','c-villette',15,{day:y,roll:3}),
  mk('Trier les papiers de la banque','c-budget',30,{day:null,due:ymd(new Date(d.getTime()+3*864e5))}),
  mk('Monter le meuble de l’entrée','c-bricolage',60,{day:null}),
 ];
 tasks.forEach((t,i)=>t.order=i+1);
 // habitudes fictives, avec un historique sur 2 mois
 const back=n=>ymd(new Date(d.getTime()-n*864e5)),lg=(p)=>{const o={};for(let i=1;i<62;i++)if(p(i))o[back(i)]=1;return o};
 const habits=[
  {id:'h1',name:'5 min de piano',kind:'build',freq:'daily',channel:'c-piano',icon:'piano',est:5,toDay:false,log:lg(i=>i%5!==0&&i<40),created:d.getTime()-62*864e5,order:1},
  {id:'h2',name:'Lecture',kind:'build',freq:'days',days:[1,3,5],channel:null,icon:'book',log:lg(i=>i%2===0),created:d.getTime()-62*864e5,order:2},
  {id:'h3',name:'Natation',kind:'build',freq:'week',n:2,channel:'c-natation',icon:'swim',log:lg(i=>i%4===1),created:d.getTime()-62*864e5,order:3},
  {id:'h4',name:'Pas d’écran après 23 h',kind:'quit',freq:'daily',icon:'nophone',log:lg(i=>i%3!==0),created:d.getTime()-62*864e5,order:4}];
 localStorage.setItem(KEY,JSON.stringify({seeded:true,habits,tasks,settings:{dayStart:7,dayEnd:21,workStart:9,workEnd:18,aiKey:'',aiAuto:false},channels:[],projects:[{id:'pr-dem',name:'Déménagement',end:null,done:false}]}));
 localStorage.setItem('journee.sync.hide',t0);localStorage.removeItem('journee.ritauto');localStorage.removeItem('journee.rit');
 localStorage.setItem('journee.demo',VER);
})();
// démo : deux projets fictifs pour la revue de la semaine
(function(){try{const K=Object.keys(localStorage).find(k=>k==='journee.v1');if(!K)return;const s=JSON.parse(localStorage.getItem(K));if((s.projects||[]).some(p=>p.id==='pj-spec'))return;const d=new Date(),iso=x=>x.toISOString().slice(0,10),e1=new Date(d);e1.setDate(d.getDate()+3);const e2=new Date(d);e2.setDate(d.getDate()+40);s.projects=(s.projects||[]).concat([{id:'pj-spec',name:'Spectacle Villette',end:iso(e1)},{id:'pj-salon',name:'Salon',end:iso(e2)}]);(s.tasks||[]).forEach(t=>{if(/plan de feu|devis lumi/i.test(t.title))t.proj='pj-spec';if(/salon|étagère/i.test(t.title))t.proj='pj-salon'});localStorage.setItem(K,JSON.stringify(s))}catch(e){}})();
