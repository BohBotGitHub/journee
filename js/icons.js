// Diem — icônes : chaque action se reconnaît d'un coup d'œil, le texte vient en appui
const IC={
 'hb-piano':'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v9M12 5v9M16 5v9M6.5 5v5h3V5M14.5 5v5h3V5"/>',
 'hb-book':'<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 1h13v-3"/>',
 'hb-swim':'<circle cx="16" cy="6" r="2"/><path d="M3 18c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0"/><path d="M5 14l5-4 3 3 3-2"/>',
 'hb-run':'<circle cx="14" cy="4.5" r="2"/><path d="M7 21l3-6 3 2v4M10 15l1-5 4 2 3 0M11 10l-3 1-2 3"/>',
 'hb-muscle':'<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
 'hb-lotus':'<path d="M12 20c-4 0-8-2-9-6 3 0 6 1 9 4 3-3 6-4 9-4-1 4-5 6-9 6z"/><path d="M12 18c-2-3-2-8 0-12 2 4 2 9 0 12z"/>',
 'hb-water':'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
 'hb-sleep':'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M15 4h4l-4 4h4"/>',
 'hb-lang':'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
 'hb-pen':'<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
 'hb-leaf':'<path d="M5 19c0-9 6-14 15-15-1 9-6 15-15 15z"/><path d="M5 19l8-8"/>',
 'hb-heart':'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
 'hb-nophone':'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M4 4l16 16"/>',
 'hb-nosmoke':'<path d="M3 15h13v3H3zM19 15v3M17 8c0-2 2-2 2-4M4 4l16 16"/>',
 'hb-spark':'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 tree:'<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v5M12 12l-6 5M12 12l6 5"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 addtop:'<path d="M5 4h14M12 20V9M7 13l5-5 5 5"/>',
 addbottom:'<path d="M5 20h14M12 4v11M7 11l5 5 5-5"/>',
 genie:'<path d="M4 17c0-2 2.5-3 6.5-3 2.6 0 4.2.7 5.2 1.6l3-2.2c.5-.4 1 .2.7.7L17 17.2zM8 17h7l-1 2H9zM18 12c-1.8-1 .8-2.6-.6-4.2S14.5 7.5 15 6M14 4l.6 1.6L16.2 6l-1.6.6L14 8.2l-.6-1.6L11.8 6l1.6-.4z"/>',
 minimize:'<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
 maximize:'<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 laptop:'<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
 auto:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
 case:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
 home:'<path d="M4 11l8-7 8 7M6 9.5V20h12V9.5"/>',
 walk:'<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 3 3v3M9 12l2-4 3 1 2 3M11 8l-2 1-1 3"/>',
 play:'<path d="M8 5v14l11-7z"/>',
 tray:'<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
 next:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M10 15h6M14 13l2 2-2 2"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
 open:'<path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
 sunrise:'<path d="M4 18h16M7 14a5 5 0 0 1 10 0M12 4v4M5 9l2 2M19 9l-2 2M9 7l3-3 3 3"/>',
 moon:'<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
 snow:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4l3 2 3-2M9 20l3-2 3 2"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 check:'<path d="M5 12l5 5 9-10"/>',
 pin:'<path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/>',
 star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
 left:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
 right:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 wand:'<path d="M4 20L16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6z"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 move:'<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
 up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
 down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
 spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
 cut:'<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 19M8.5 15.5L20 5"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 download:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
 bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 send:'<path d="M4 12l16-8-6 16-2-6z"/>',
 zoom:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>'
};
const ico=n=>IC[n]?`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`:'';
// action → icône (selon data-act, et data-to pour les déplacements)
function icoFor(b){
 const a=b.dataset.act,to=b.dataset.to;
 if(['sheetmv','mv'].includes(a))return to==='backlog'?'tray':'next';
 return ({play:'play',focusnext:'play',tobacklog:'tray',rolltomorrow:'next',mvday:'next',mvall:'next',rm:'trash',rmsheet:'trash',del:'trash',rolldrop:'trash',nodedelask:'trash',nodedelgo:'trash',open:'open',
  plan:'sunrise',weekplan:'calendar',weekreview:'chart',shutdown:'moon',freeze:'snow',tplfromday:'copy',palopen:'search',ritdone:'check',keep:'pin',phare:'star',ritback:'left',ritnext:'right',ritauto:'wand',ritunblock:'x',
  pushtodo:'send',refine:'spark',aisplit:'cut',ritai:'spark',nodeadd:'plus',projadd:'plus',tvaddpil:'plus',nodemove:'move',nodeup:'up',nodedown:'down',tvfocus:'zoom',gin:'link',export:'download',notifon:'bell',notiftest:'bell',
  tplnew:'plus',tplapply:'copy',hardrefresh:'',refineok:'check',treego:'check',dumpapplyall:'check',ritapplyall:'check',aiapplyall:'check',modalapplyall:'check',hoursreset:'clock',aiok:'check'})[a]||'';
}
// ajoute l'icône aux boutons d'action qui n'en ont pas (menus, rituels, détail, panneaux)
function iconize(root){
 (root||document).querySelectorAll('.menu button[data-act],.btns button[data-act],.mfoot button[data-act],.head .acts button[data-act],.tvacts button[data-act],.set button[data-act],.rit>button[data-act],.rit .row button[data-act],.dayrow button[data-act],.aibox button[data-act]').forEach(b=>{
  if(b.querySelector('svg')||b.classList.contains('more')||b.classList.contains('mvico')||b.classList.contains('layoutbtn'))return;
  let n=icoFor(b);if(!n&&b.dataset.act==='close'&&b.textContent.trim()==='Plus tard')n='clock';
  if(n){const f=b.firstChild;if(f&&f.nodeType===3)f.nodeValue=f.nodeValue.replace(/^\s*[✓✔+★▶↻×→←⋯]\s*/,'');b.insertAdjacentHTML('afterbegin',ico(n));b.classList.add('hasic')}
 });
}

// la lampe du Génie (logo, mascotte)
const LAMP_SVG=`<svg class="logo glogo" viewBox="0 0 64 64" aria-hidden="true"><g transform="translate(-24 -19.8) scale(.4)"><path class="ls" d="M196 92c-7-5 5-11-2-18s-12-2-10-9"/><circle class="lh" cx="78" cy="138" r="13"/><path class="la" d="M168 142C180 136 190 122 200 116c6-4 12 2 8 8-8 14-22 32-42 36z"/><ellipse class="la" cx="126" cy="146" rx="48" ry="30"/><path class="ll" d="M96 126a30 22 0 0 1 60 0z"/><circle class="ll" cx="126" cy="100" r="6"/><rect class="lt" x="106" y="172" width="40" height="8" rx="4"/><circle class="le" cx="112" cy="150" r="3.4"/><circle class="le" cx="140" cy="150" r="3.4"/><path class="lm" d="M118 158q8 6 16 0"/><circle class="lf" cx="206" cy="104" r="7.5"/></g></svg>`;
const genieTag=(t='Génie')=>`<b class="gtag">${LAMP_SVG}${t}</b>`;

// poignée pour réordonner projets, habitudes, modèles
const SGRIP='<span class="sgrip2" data-sgrip title="Glisse pour changer l’ordre" aria-hidden="true"><svg viewBox="0 0 12 20" width="10" height="18"><g fill="currentColor"><circle cx="3" cy="4" r="1.6"/><circle cx="9" cy="4" r="1.6"/><circle cx="3" cy="10" r="1.6"/><circle cx="9" cy="10" r="1.6"/><circle cx="3" cy="16" r="1.6"/><circle cx="9" cy="16" r="1.6"/></g></svg></span>';
