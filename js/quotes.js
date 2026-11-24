// MyDayBot — citations des rituels : textes authentiques, sources vérifiées.
// Traductions : publiques (XIXe s.) quand elles existent, sinon traduites par MyDayBot depuis l'original (indiqué « trad. MyDayBot »).
// Camus est encore protégé : ses idées sont reformulées (kind:'idea', sans guillemets).
// tags : matin, soir, charge (journée pleine), calme (énergie basse, trouble), retard (reports), reussi (journée faite), dur (journée difficile)
const QUOTES=[
 {t:'Il suffit que tu disposes bien du moment où tu es.',a:'Marc Aurèle',w:'Pensées, VI, 2 (trad. Barthélemy-Saint-Hilaire, 1876)',s:'stoïcien',tags:['matin','charge','calme']},
 {t:'Que l’obstacle même qui te gêne soit l’occasion pour toi de t’exercer à une autre vertu.',a:'Marc Aurèle',w:'Pensées, VI, 50 (trad. Barthélemy-Saint-Hilaire, 1876)',s:'stoïcien',tags:['soir','dur','retard']},
 {t:'Quand, par suite de circonstances inévitables, tu te sens profondément troublé, reviens à toi le plus vite que tu peux.',a:'Marc Aurèle',w:'Pensées, VI, 11 (trad. Barthélemy-Saint-Hilaire, 1876)',s:'stoïcien',tags:['calme','dur']},
 {t:'Regarde le dedans des choses.',a:'Marc Aurèle',w:'Pensées, VI, 3 (trad. Barthélemy-Saint-Hilaire, 1876)',s:'stoïcien',tags:['matin']},
 {t:'Nous n’avons point reçu une vie courte, c’est nous qui l’avons rendue telle.',a:'Sénèque',w:'De la brièveté de la vie, I, 4 (trad. Charpentier, 1860)',s:'stoïcien',tags:['matin','charge','retard']},
 {t:'Nous ne vivons que la moindre partie du temps de notre vie.',a:'Sénèque',w:'De la brièveté de la vie, II (trad. Charpentier, 1860)',s:'stoïcien',tags:['matin','retard']},
 {t:'Toi qui n’es pas maître de demain, tu remets la joie à plus tard ; la vie se perd à attendre.',a:'Épicure',w:'Sentences vaticanes, 14 (trad. MyDayBot)',s:'épicurien',tags:['soir','reussi','retard']},
 {t:'Nous sommes nés une fois ; il n’est pas possible de naître deux fois.',a:'Épicure',w:'Sentences vaticanes, 14 (trad. MyDayBot)',s:'épicurien',tags:['matin','reussi']},
 {t:'À partir d’un certain point, il n’y a plus de retour. C’est ce point qu’il faut atteindre.',a:'Franz Kafka',w:'Aphorismes de Zürau, 5 (trad. MyDayBot)',s:'absurde',tags:['matin','charge']},
 {t:'Il y a deux péchés capitaux dont tous les autres dérivent : l’impatience et la nonchalance.',a:'Franz Kafka',w:'Aphorismes de Zürau, 3 (trad. MyDayBot)',s:'absurde',tags:['retard','calme']},
 {t:'Le rocher redescend toujours ; c’est dans la remontée elle-même que se loge le sens, et il faut imaginer celui qui la recommence heureux.',a:'d’après Albert Camus',w:'Le Mythe de Sisyphe (idée reformulée)',s:'absurde',kind:'idea',tags:['soir','dur','retard']},
 {t:'La révolte donne son prix à la vie : vivre lucidement, sans espoir d’en finir, et pourtant y mettre toute sa force.',a:'d’après Albert Camus',w:'Le Mythe de Sisyphe (idée reformulée)',s:'absurde',kind:'idea',tags:['matin','charge']},
 {t:'Je suis pessimiste par l’intelligence, mais optimiste par la volonté.',a:'Antonio Gramsci',w:'Lettre de prison, 19 décembre 1929 (trad. MyDayBot)',s:'révolutionnaire',tags:['matin','dur','charge']},
 {t:'Je hais les indifférents. Je crois que vivre veut dire prendre parti.',a:'Antonio Gramsci',w:'« Indifferenti », La Città futura, 1917 (trad. MyDayBot)',s:'révolutionnaire',tags:['matin']},
 {t:'Fais en sorte de rester un être humain.',a:'Rosa Luxemburg',w:'Lettre à Mathilde Wurm, 28 décembre 1916 (trad. MyDayBot)',s:'révolutionnaire',tags:['soir','dur','calme']}
];
// choisit une citation selon la journée ; stable pour un même jour et un même rituel
function pickQuote(kind,d){
 const ts=dayTasks(d),done=ts.filter(t=>t.done).length,L=loadInfo(d),info=S.days[d]||{};
 const want=[kind];
 if(kind==='matin'){if(L.over>0||ts.length>=8)want.push('charge');if(info.energy==='low')want.push('calme');if(ts.some(t=>(t.roll||0)>=2))want.push('retard')}
 else{if(ts.length&&done/ts.length>=0.7)want.push('reussi');else want.push('dur');if(ts.some(t=>!t.done&&(t.roll||0)>=2))want.push('retard')}
 const score=q=>want.reduce((a,w)=>a+(q.tags.includes(w)?1:0),0);
 const best=Math.max(...QUOTES.map(score)),pool=QUOTES.filter(q=>score(q)===best);
 let h=0;for(const c of d+kind)h=(h*31+c.charCodeAt(0))>>>0;
 return pool[h%pool.length];
}
const quoteHtml=q=>`<figure class="quote"><blockquote>${q.kind==='idea'?esc(q.t):'« '+esc(q.t)+' »'}</blockquote><figcaption>${esc(q.a)} · <span>${esc(q.w)}</span></figcaption></figure>`;
