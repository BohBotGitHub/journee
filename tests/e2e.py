"""Batterie de tests de bout en bout pour Journée.

Lance un serveur local, simule Google (Agenda, Drive), Anthropic et l'horloge,
puis exerce chaque fonction dans un vrai Chrome. Usage :
    python3 tests/e2e.py [chemin_export_sunsama.csv]
"""
import datetime, glob, json, os, re, sys, threading, http.server, functools, traceback, urllib.parse
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8791
BASE = f'http://localhost:{PORT}/'
CSV = sys.argv[1] if len(sys.argv) > 1 else (glob.glob('/mnt/user-data/uploads/*sunsama*.csv') or [None])[0]
CHROME = '/usr/bin/google-chrome'

def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    h.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

TODAY = datetime.date.today()
def d(n=0): return (TODAY + datetime.timedelta(days=n)).isoformat()
def at(h, m=0, day=0):
    return datetime.datetime.combine(TODAY + datetime.timedelta(days=day), datetime.time(h, m)).astimezone()

class Google:
    """Faux Google : agendas, événements, Drive appData."""
    def __init__(self):
        self.events = {'primary': [], 'pro@group': []}
        self.calls = []
        self.drive = None
        self.ver = 0
        self.downloads = 0
        self.add('primary', 'Réunion équipe', at(14), at(15))
        self.add('primary', 'Déjeuner', at(12, 30), at(13, 30), transparent=True)
        self.add('primary', 'Dentiste', at(10, 0, 1), at(11, 0, 1))
    def add(self, cal, summary, s, e, transparent=False):
        ev = {'id': f'ev{len(self.calls)}{summary[:3]}{s.hour}', 'summary': summary, 'status': 'confirmed',
              'start': {'dateTime': s.isoformat()}, 'end': {'dateTime': e.isoformat()}, 'htmlLink': 'https://calendar.google.com/x'}
        if transparent: ev['transparency'] = 'transparent'
        self.events[cal].append(ev)
    def route(self, route):
        req = route.request; u = urllib.parse.urlparse(req.url); path = u.path; m = req.method
        self.calls.append((m, path))
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=json.dumps(o))
        if path.endswith('/users/me/calendarList'):
            return J({'items': [{'id': 'primary', 'summary': 'Perso', 'primary': True, 'accessRole': 'owner', 'backgroundColor': '#2f9e6a'},
                                {'id': 'pro@group', 'summary': 'Pro', 'accessRole': 'owner', 'backgroundColor': '#3b6fd8'}]})
        mm = re.search(r'/calendar/v3/calendars/([^/]+)/events(?:/([^/]+))?(/move)?$', path)
        if mm:
            cal = urllib.parse.unquote(mm.group(1)); eid = mm.group(2)
            if m == 'GET' and not eid: return J({'items': self.events.get(cal, [])})
            if m == 'POST' and not eid:
                body = json.loads(req.post_data); body['id'] = f'mine{len(self.calls)}'; body['_cal'] = cal
                return J(body)
            return J({'id': eid or 'x'}) if m != 'DELETE' else route.fulfill(status=204, body='')
        if 'oauth2/v3/userinfo' in req.url: return J({'email': 'test@example.com'})
        if '/drive/v3/files' in path and m == 'GET' and 'alt=media' not in req.url:
            return J({'files': [{'id': 'f1', 'modifiedTime': f'2026-01-01T00:00:{self.ver:02d}Z'}] if self.drive else []})
        if 'alt=media' in req.url:
            self.downloads += 1; return J(self.drive or {})
        if '/upload/drive/v3/files' in path:
            data = req.post_data or ''
            ct = req.headers.get('content-type') or ''
            if 'multipart' in ct:
                bnd = ct.split('boundary=')[1]
                parts = [x for x in data.split('--' + bnd) if x.strip() and x.strip() != '--']
                j = parts[-1].split('\r\n\r\n', 1)[1].rsplit('\r\n', 1)[0]
            else: j = data
            try: self.drive = json.loads(j); self.ver += 1
            except Exception: pass
            return J({'id': 'f1', 'modifiedTime': f'2026-01-01T00:00:{self.ver:02d}Z'})
        return J({})

def claude_route(route):
    body = json.loads(route.request.post_data); txt = json.dumps(body['messages'])
    if (body.get('tool_choice') or {}).get('type') in ('tool', 'any'):
        return route.fulfill(status=400, content_type='application/json', body=json.dumps({'type': 'error', 'error': {'type': 'invalid_request_error', 'message': 'tool_choice: type "tool" and "any" are not supported for this model.'}}))
    if 'tools' not in body:
        # affinage en lot : 1re catégorie du domaine imposé, ou 1re catégorie tout court si « libre »
        prompt = body['messages'][0]['content']
        cats = re.findall(r'^([^\n|›(]+) › ([^\n|(]+)$', prompt, re.M)
        out = {}
        for n, dom, _t in re.findall(r'^(\d+) \| ([^|]+) \| (.+)$', prompt, re.M):
            dom = dom.strip(); pick = next((d + ' › ' + c for d, c in cats if dom == 'libre' or d.strip() == dom), None)
            out[n] = None if 'Inclassable' in _t else pick
        return route.fulfill(status=200, content_type='application/json',
                             body=json.dumps({'content': [{'type': 'text', 'text': json.dumps(out)}], 'usage': {'input_tokens': 900, 'output_tokens': 120}}))
    ids = re.findall(r'\[([a-z0-9-]{8,})\]', txt)
    inp = {'message': 'Proposition de test.'}
    if ids:
        inp['updates'] = [{'id': ids[0], 'est': 25, 'channel': 'Corps › Natation'}]
        inp['order'] = ids[:3][::-1]
    inp['new_tasks'] = [{'title': 'Tâche proposée', 'est': 15, 'day': 'backlog'}]
    route.fulfill(status=200, content_type='application/json',
                  body=json.dumps({'content': [{'type': 'tool_use', 'name': 'proposer', 'id': 't', 'input': inp}],
                                   'usage': {'input_tokens': 4000, 'output_tokens': 300}}))

RESULTS = []
def test(name):
    def deco(fn):
        def run(ctx):
            try:
                fn(ctx); RESULTS.append((name, True, ''))
            except Exception as e:
                RESULTS.append((name, False, f'{type(e).__name__}: {e}\n' + ''.join(traceback.format_tb(e.__traceback__)[-2:])))
        run.__name__ = name; TESTS.append(run); return run
    return deco
TESTS = []

def new_page(b, w=1440, h=900, clock=None, real=False, google=None, claude=False, scheme='light', storage=None):
    ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme=scheme)
    ctx.grant_permissions(['notifications'], origin=BASE.rstrip('/'))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    pg.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    if google: pg.route('https://www.googleapis.com/**', google.route)
    if claude: pg.route('https://api.anthropic.com/**', claude_route)
    if clock: pg.clock.install(time=clock)
    elif not real: pg.clock.set_fixed_time(at(10, 0))
    if storage is not None:
        pg.add_init_script(f"if(!sessionStorage.getItem('init')){{sessionStorage.setItem('init','1');localStorage.clear();{storage}}}")
    pg.goto(BASE); pg.wait_for_timeout(300)
    if clock: pg.clock.run_for(1500)
    else: pg.wait_for_timeout(900)
    return ctx, pg, errs

def st(pg, expr): return pg.evaluate(f'()=>{{const S=window.journee.state;const {{dayTasks,today,addDays,loadInfo,pushBlock,monday}}=window.journee.fn;return {expr}}}')
def add(pg, text):
    # on passe par la fenêtre d'ajout : bouton « Ajouter une tâche », titre, Entrée, Échap
    if pg.locator('#modal:not(.hidden) [data-adtitle]').count() == 0:
        pg.click('#main [data-act="addopen"]'); pg.wait_for_timeout(120)
    pg.fill('[data-adtitle]', text); pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(120)
def tick(pg, ms=400):
    try: pg.clock.run_for(ms)
    except Exception: pg.wait_for_timeout(ms)

TOKEN = "localStorage.setItem('journee.g',JSON.stringify({t:'tok',exp:Date.now()+3600e3,scope:'email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.appdata'}));localStorage.setItem('journee.g.on','1');"

# ---------------------------------------------------------------- tests
@test('Démarrage sans erreur et tâches d’exemple')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    assert not errs, errs
    assert st(pg, 'S.tasks.length') == 5
    ctx.close()

@test('Saisie rapide : durée, catégorie, projet, date')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    add(pg, 'Longueurs 30m #natation demain')
    t = st(pg, 'S.tasks.at(-1)')
    assert t['title'] == 'Longueurs', t['title']
    assert t['est'] == 30 and t['day'] == d(1), (t['est'], t['day'])
    assert t['channel'] == 'c-natation', t['channel']
    # raccourci partiel et accents ignorés, projet avec +
    pg.evaluate("()=>{const S=window.journee.state;S.projects.push({id:'pr1',name:'Déménagement',end:null,done:false});window.journee.save()}")
    add(pg, 'Cartons cuisine #villet +demen')
    t = st(pg, 'S.tasks.at(-1)'); assert t['channel'] == 'c-villette' and t['proj'] == 'pr1' and t['title'] == 'Cartons cuisine', t
    # sans # : MyDayBot devine par mots-clés
    add(pg, 'Passer l’aspirateur 20m')
    assert st(pg, 'S.tasks.at(-1).channel') == 'c-menage'
    assert 'Foyer › Ménage' in pg.inner_text('#main .list')
    add(pg, 'Rapport mensuel 1h30 lundi')
    t = st(pg, 'S.tasks.at(-1)'); assert t['est'] == 90
    assert datetime.date.fromisoformat(t['day']).weekday() == 0
    assert not errs, errs; ctx.close()

@test('Échéances : syntaxe « avant », planification automatique, alerte')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    add(pg, 'Dossier assurance avant vendredi 45m')
    t = st(pg, 'S.tasks.at(-1)')
    assert t['due'], 'échéance non comprise'
    tick(pg, 300); t = st(pg, 'S.tasks.at(-1)')
    assert t['day'] and d() <= t['day'] <= t['due'], (t['day'], t['due'])
    assert pg.locator('.due').count() >= 1
    assert not errs, errs; ctx.close()

@test('Cocher / décocher une tâche')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.click('#main .card .chk >> nth=0'); tick(pg, 300)
    assert st(pg, 'S.tasks.filter(t=>t.done).length') == 1
    assert not pg.locator('#main .card.done').is_visible(), 'les faites sont repliées'
    pg.click('#main .donegrp summary'); tick(pg, 150)
    pg.click('#main .card.done .chk'); tick(pg, 300)
    assert st(pg, 'S.tasks.filter(t=>t.done).length') == 0
    # Ctrl+Z revient en arrière (re-coche), puis encore (décoche)
    pg.keyboard.press('Control+z'); tick(pg, 200)
    assert st(pg, 'S.tasks.filter(t=>t.done).length') == 1
    pg.keyboard.press('Control+z'); tick(pg, 200)
    assert st(pg, 'S.tasks.filter(t=>t.done).length') == 0
    assert not errs, errs; ctx.close()

@test('Agenda vivant : créneaux dans l’ordre de la liste, réordonnancement')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 2))
    blocks = st(pg, "dayTasks(today()).filter(t=>!t.done).map(t=>t.block&&new Date(t.block.start).getTime())")
    assert all(blocks) and blocks == sorted(blocks), blocks
    cards = pg.locator('#main .list .card')
    first_title = cards.nth(0).locator('.ctitle').inner_text()
    cards.nth(2).drag_to(cards.nth(0), target_position={'x': 40, 'y': 4}); tick(pg)
    order = st(pg, "dayTasks(today()).map(t=>t.title)")
    assert order[1] == first_title or order[0] != first_title, order
    blocks = st(pg, "dayTasks(today()).filter(t=>!t.done).map(t=>new Date(t.block.start).getTime())")
    assert blocks == sorted(blocks), 'les créneaux ne suivent pas la liste'
    assert not errs, errs; ctx.close()

@test('Épingler en glissant dans l’agenda, libérer en revenant à la liste')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 2))
    pg.locator('#main .card').first.drag_to(pg.locator('.tlin'), target_position={'x': 80, 'y': 76 * 9 + 4}); tick(pg)
    assert st(pg, 'S.tasks.filter(t=>t.pinned).length') == 1
    h = st(pg, "new Date(S.tasks.find(t=>t.pinned).block.start).getHours()")
    assert h == 16, h
    pg.locator('.blk').filter(has_text='📌').drag_to(pg.locator('#main .list'), target_position={'x': 300, 'y': 3}); tick(pg)
    assert st(pg, 'S.tasks.filter(t=>t.pinned).length') == 0
    assert not errs, errs; ctx.close()

@test('Durée rapide et étirement d’un créneau')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 2))
    pg.click('#main .est >> nth=0'); pg.click('#pop button[data-v="60"]'); tick(pg)
    assert st(pg, 'dayTasks(today())[0].est') == 60
    blk = pg.locator('.blk').first; bb = blk.bounding_box()
    x, y = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] - 3
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x, y + 38, steps=4); pg.mouse.up(); tick(pg)
    assert st(pg, 'dayTasks(today())[0].est') == 90, st(pg, 'dayTasks(today())[0].est')
    assert not errs, errs; ctx.close()

@test('Focus : tâche active, sous-tâches, le temps décale la suite')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 2))
    pg.evaluate("()=>{const S=window.journee.state;const {dayTasks,today}=window.journee.fn;const t=dayTasks(today())[1];t.subtasks=[{id:'s1',t:'Étape A',d:false},{id:'s2',t:'Étape B',d:false}];window.journee.save()}")
    pg.click('#main .card >> nth=1 >> [data-act="play"]'); tick(pg)
    assert pg.inner_text('.ftitle') == 'Étape A'
    pg.click('[data-act="focussubdone"]'); tick(pg)
    assert pg.inner_text('.ftitle') == 'Étape B'
    pg.keyboard.press('Escape'); tick(pg)
    before = st(pg, "dayTasks(today()).filter(t=>!t.done&&!(S.running&&S.running.taskId===t.id)).map(t=>t.block.start)")
    tick(pg, 70 * 60 * 1000)
    after = st(pg, "dayTasks(today()).filter(t=>!t.done&&!(S.running&&S.running.taskId===t.id)).map(t=>t.block.start)")
    assert after != before, 'rien ne s’est décalé'
    assert pg.locator('.blk.active').count() == 1
    assert not errs, errs; ctx.close()

@test('Rituel du matin : étapes, reprise après rechargement, suggestions Claude')
def _(c):
    ctx, pg, errs = new_page(c['b'], claude=True, storage="localStorage.setItem('journee.v1',JSON.stringify({settings:{aiKey:'k',aiAuto:true}}))")
    if pg.is_visible('#modal:not(.hidden)'): pg.keyboard.press('Escape')
    pg.click('[data-act="plan"] >> nth=0')
    for _ in range(4): pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(300)
    pg.wait_for_timeout(400)
    assert pg.locator('.aibox .pitem').count() >= 1, 'pas de suggestion Claude'
    pg.reload(); pg.wait_for_timeout(1500)
    assert pg.inner_text('.rsteps .on') == 'Estimer'
    pg.click('[data-act="ritapplyall"]'); pg.wait_for_timeout(200)
    for _ in range(2): pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(300)
    pg.fill('[data-intent]', 'Avancer'); pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(300)
    assert st(pg, 'S.days[today()].planned') is True and st(pg, 'S.days[today()].intent') == 'Avancer'
    assert not errs, errs; ctx.close()

@test('Rituel du soir : report à demain et note')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.click('[data-act="daymenu"]'); pg.click('.menu [data-act="shutdown"]'); pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(200)
    pg.click('[data-act="mvday"]'); pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(200)
    pg.fill('[data-note]', 'Bonne journée'); pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(200)
    assert st(pg, "S.tasks.filter(t=>t.day===addDays(today(),1)).length") == 3
    assert st(pg, 'S.days[today()].note') == 'Bonne journée'
    assert not errs, errs; ctx.close()

@test('Vide-tête : lignes → tâches datées et à trier')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.keyboard.press('d'); pg.wait_for_timeout(200)
    pg.fill('[data-dump]', 'Rappeler garagiste\n- Acheter ampoules demain 15m\nOffrir livre avant 12/12')
    pg.dispatch_event('[data-dump]', 'input'); pg.click('[data-act="dumptasks"]'); pg.wait_for_timeout(300)
    ts = st(pg, 'S.tasks.slice(-3).map(t=>[t.title,t.day,t.inbox,t.due])')
    assert ts[0][2] is True and ts[1][1] == d(1) and ts[2][3], ts
    pg.click('[data-act="inbox"] >> nth=0'); pg.wait_for_timeout(200)
    assert st(pg, 'S.tasks.filter(t=>t.inbox).length') == 0
    assert not errs, errs; ctx.close()

@test('Palette Cmd+K : commandes, création, aller à une date, recherche')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.keyboard.press('Control+k'); pg.wait_for_selector('#palq')
    pg.keyboard.type('semaine'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    assert pg.evaluate('location.hash') == '#week'
    pg.keyboard.press('Control+k'); pg.keyboard.type('Nouvelle idée 20m'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    assert st(pg, 'S.tasks.at(-1).title') == 'Nouvelle idée' and st(pg, 'S.tasks.at(-1).est') == 20
    pg.keyboard.press('Control+k'); pg.keyboard.type('demain'); pg.wait_for_timeout(100)
    assert 'Aller au' in pg.inner_text('#pallist .palit.on')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.keyboard.press('Control+k'); pg.keyboard.type('courses'); pg.wait_for_timeout(100)
    assert pg.locator('.palgrp', has_text='Tâches').count() == 1
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    assert pg.locator('#pal.hidden').count() == 1
    assert not errs, errs; ctx.close()

@test('Modèles : créer, appliquer, depuis aujourd’hui')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.click('#nav [data-view="projects"]'); pg.click('[data-act="tplnew"]')
    pg.fill('[data-tplname]', 'Routine du matin'); pg.fill('[data-tpltext]', 'Méditer 10m\nPréparer le sac 10m\n- Gourde\n- Clés')
    pg.click('[data-act="tplsave"]'); pg.wait_for_timeout(200)
    assert st(pg, 'S.templates.length') == 1 and st(pg, 'S.templates[0].items[1].subs.length') == 2
    pg.click('[data-act="tplapply"] >> nth=0'); pg.wait_for_timeout(200)
    assert st(pg, "S.tasks.filter(t=>t.title==='Préparer le sac'&&t.day===today()&&t.subtasks.length===2).length") == 1
    pg.click('[data-act="tplfromday"]'); pg.wait_for_timeout(200); pg.click('[data-act="tplsave"]'); pg.wait_for_timeout(200)
    assert st(pg, 'S.templates.length') == 2
    assert not errs, errs; ctx.close()

@test('Import Sunsama, réimport sans doublon, statistiques, suggestions de routines, recherche historique')
def _(c):
    if not CSV: raise RuntimeError('export Sunsama introuvable')
    ctx, pg, errs = new_page(c['b'])
    pg.click('#nav [data-view="settings"]'); pg.set_input_files('[data-sunsama]', CSV); pg.wait_for_selector('.rit h2')
    n1 = st(pg, 'S.tasks.length+S.archive.length'); pg.click('[data-act="close"]')
    pg.click('#nav [data-view="settings"]'); pg.set_input_files('[data-sunsama]', CSV); pg.wait_for_selector('.rit h2')
    assert st(pg, 'S.tasks.length+S.archive.length') == n1, 'doublons au réimport'
    pg.click('[data-act="close"]'); pg.goto(BASE + '#stats'); pg.wait_for_timeout(500)
    txt = pg.inner_text('#main')
    assert 'NaN' not in txt and 'undefined' not in txt and 'Infinity' not in txt, 'valeur invalide dans les stats'
    pg.click('#nav [data-view="projects"]'); pg.wait_for_timeout(200)
    assert pg.locator('[data-act="tplsug"]').count() >= 1, 'pas de suggestion de routine'
    pg.keyboard.press('Control+k'); pg.keyboard.type('lessive'); pg.wait_for_timeout(200)
    assert pg.locator('.palgrp', has_text='Historique').count() == 1
    pg.keyboard.press('Escape')
    assert not errs, errs; ctx.close()

@test('Google Agenda : rendez-vous, occupé/disponible, agenda par catégorie, déplacement')
def _(c):
    g = Google()
    ctx, pg, errs = new_page(c['b'], clock=at(9, 2), google=g, storage=TOKEN)
    tick(pg, 1500)
    assert '2 rendez-vous' in pg.inner_text('.summary'), pg.inner_text('.summary')
    pg.click('[data-act="sum"][data-k="ev"]'); tick(pg, 300)
    assert pg.locator('.evrow').count() == 2, pg.locator('.evrow').count()
    load1 = st(pg, 'loadInfo(today()).meet')
    pg.click('.evrow:has-text("Réunion équipe") [data-act="evtoggle"]'); tick(pg)
    assert st(pg, 'loadInfo(today()).meet') < load1
    # agenda du pilier Bâtir -> Pro ; hérité par La Villette
    pg.evaluate("()=>{const S=window.journee.state;S.channels.find(c=>c.id==='p-batir').cal='pro@group';window.journee.save()}")
    add(pg, 'Préparer offre 30m #villette'); tick(pg, 1500)
    posts = [p for m, p in g.calls if m == 'POST' and p.endswith('/events')]
    assert any('pro%40group' in p or 'pro@group' in p for p in posts), posts
    t = st(pg, "S.tasks.find(t=>t.title==='Préparer offre')")
    assert t['block']['cal'] == 'pro@group', t['block']
    pg.evaluate("()=>{const S=window.journee.state;const t=S.tasks.find(t=>t.title==='Préparer offre');t.channel='c-natation';window.journee.save()}")
    pg.evaluate("()=>window.journee.fn.pushBlock(window.journee.state.tasks.find(t=>t.title==='Préparer offre'))"); tick(pg, 800)
    assert any(p.endswith('/move') for m, p in g.calls), 'pas de déplacement d’agenda'
    pg.goto(BASE + '#today'); tick(pg, 1500)
    pg.click('[data-act="next"]'); tick(pg, 800)
    assert pg.locator('.evrow', has_text='Dentiste').count() == 1, 'rendez-vous du lendemain absent'
    assert not errs, errs; ctx.close()

@test('Synchro Drive : tâches, réglages et clé Claude sur un autre appareil')
def _(c):
    g = Google()
    ctx, pg, errs = new_page(c['b'], google=g, storage=TOKEN)
    pg.evaluate("()=>{const S=window.journee.state;S.settings.aiKey='sk-test';S.settings.workStart=8;window.journee.save()}")
    add(pg, 'Tâche synchronisée'); pg.wait_for_timeout(5000)
    assert g.drive and any(t['title'] == 'Tâche synchronisée' for t in g.drive.get('tasks', [])), 'rien envoyé sur Drive'
    ctx.close()
    ctx2, pg2, errs2 = new_page(c['b'], google=g, storage=TOKEN); pg2.wait_for_timeout(1500)
    assert st(pg2, "S.tasks.some(t=>t.title==='Tâche synchronisée')"), 'données non récupérées'
    assert st(pg2, "S.settings.aiKey") == 'sk-test', 'clé Claude non recopiée'
    assert st(pg2, "S.settings.workStart") == 8, 'réglages non recopiés'
    # un réglage changé sur le 2e appareil n'efface pas la clé
    pg2.evaluate("()=>{const S=window.journee.state;S.settings.workEnd=19;window.journee.save()}"); pg2.wait_for_timeout(2500)
    assert g.drive['settings']['aiKey'] == 'sk-test' and g.drive['settings']['workEnd'] == 19
    assert not errs and not errs2, (errs, errs2); ctx2.close()

@test('Claude : chat, application des propositions, coût, plafond')
def _(c):
    ctx, pg, errs = new_page(c['b'], claude=True, storage="localStorage.setItem('journee.v1',JSON.stringify({settings:{aiKey:'k',aiAuto:false}}))")
    pg.click('.stabs [data-side="ai"]'); pg.fill('[data-keep="ai"]', 'Organise'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    assert pg.locator('[data-act="aiapply"]').count() >= 2
    pg.click('[data-act="aiapplyall"]'); pg.wait_for_timeout(200)
    assert st(pg, "S.tasks.some(t=>t.title==='Tâche proposée')")
    assert 'requête' in pg.inner_text('[data-live="aicost"]')
    pg.evaluate("()=>{window.journee.state.settings.aiBudget=0.0001}")
    pg.fill('[data-keep="ai"]', 'Encore'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    assert 'plafond' in pg.locator('.msg.a').last.inner_text()
    assert not errs, errs; ctx.close()

@test('Grand agenda (touche C) : 3 jours, semaine, dépôt sur un autre jour')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.keyboard.press('c'); pg.wait_for_timeout(300)
    assert pg.locator('.bccol').count() == 3
    pg.locator('#sidebody .card').first.drag_to(pg.locator('.bccol .tlin').nth(2), target_position={'x': 40, 'y': 76 * 5 + 4}); pg.wait_for_timeout(300)
    assert st(pg, "S.tasks.some(t=>t.pinned&&t.day===addDays(today(),2))")
    pg.click('[data-act="span"][data-n="7"]'); pg.wait_for_timeout(200)
    assert pg.locator('.bccol').count() == 7
    pg.keyboard.press('c')
    assert not errs, errs; ctx.close()

@test('Partager vers Journée : texte et lien reçus dans le vide-tête')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.goto(BASE + '?title=Article&text=A%20lire&url=https%3A%2F%2Fex.com'); pg.wait_for_timeout(800)
    assert 'Article' in st(pg, 'S.dump') and 'https://ex.com' in st(pg, 'S.dump')
    assert pg.evaluate('location.hash') == '#dump'
    assert not errs, errs; ctx.close()

@test('Notifications : début de créneau')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 2))
    pg.evaluate("()=>{window.__n=[];window.Notification=function(t,o){window.__n.push(t)};window.Notification.permission='granted';if(window.ServiceWorkerRegistration)ServiceWorkerRegistration.prototype.showNotification=function(t){window.__n.push(t);return Promise.resolve()};window.journee.state.settings.notif=true}")
    first = st(pg, "new Date(dayTasks(today())[0].block.start).getTime()-Date.now()")
    tick(pg, int(first) + 31000)
    assert any('C’est l’heure' in n or 'Planifie' in n for n in pg.evaluate('window.__n')), pg.evaluate('window.__n')
    assert not errs, errs; ctx.close()

@test('Raccourcis : ? affiche la liste ; bas de la barre rangé (minuteur, Réglages, Actualiser, version)')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.keyboard.press('?'); pg.wait_for_timeout(200)
    assert 'Raccourcis clavier' in pg.inner_text('#sheet')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    order = pg.evaluate("[...document.querySelectorAll('#nav > *')].slice(-4).map(e=>e.id||e.className.split(' ')[0])")
    assert order == ['runchip', 'navrefresh', 'navset', 'navver'], order
    ic = [round(pg.locator(s).first.bounding_box()['x']) for s in ('#nav [data-view="today"] svg', '#nav .navset svg', '#nav .navrefresh svg', '#nav .navver .vlogo')]
    assert round(pg.locator('#nav .navver b').bounding_box()['x']) == round(pg.locator('#nav .navrefresh .ll').bounding_box()['x'])
    assert len(set(ic)) == 1, ic
    assert not errs, errs; ctx.close()

@test('Mise en page : aucune vue ne déborde (ordinateur, téléphone, sombre)')
def _(c):
    for w, h, scheme in [(1440, 900, 'light'), (1100, 800, 'dark'), (1000, 760, 'light'), (390, 844, 'light'), (360, 740, 'dark')]:
        ctx, pg, errs = new_page(c['b'], w, h, scheme=scheme)
        for v in ['today', 'week', 'dump', 'backlog', 'review', 'stats', 'settings']:
            pg.evaluate(f"()=>{{location.hash='{v}'}}"); pg.goto(BASE + '#' + v); pg.wait_for_timeout(350)
            ow = pg.evaluate("()=>{const m=document.querySelector('#main');return [document.documentElement.scrollWidth-innerWidth,[...m.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+2&&!e.closest('.week,.bigcal,.scroll,.wkbars,.summary')}).slice(0,3).map(e=>e.className||e.tagName)]}")
            assert ow[0] <= 0 and not ow[1], f'{v} {w}px déborde : {ow}'
            if v == 'today' and w > 760:
                sd = pg.evaluate("(()=>{const r=document.getElementById('side').getBoundingClientRect();return [r.top, r.left, innerWidth]})()")
                vis = pg.locator('#side').is_visible()
                assert (not vis) or (sd[0] <= 1 and sd[1] < sd[2]), f'agenda mal placé à {w}px : {sd}'
                mw = pg.locator('#main').bounding_box()['width']; assert mw >= 480, f'liste trop étroite à {w}px : {mw}'
        assert not errs, errs; ctx.close()

@test('Synchro par fusion : modifications sur deux appareils, aucune perte, suppressions respectées')
def _(c):
    g = Google()
    a, pa, ea = new_page(c['b'], google=g, storage=TOKEN + "localStorage.setItem('journee.v1',JSON.stringify({settings:{workEnd:24}}));", real=True); pa.wait_for_timeout(1500)
    add(pa, 'Créée sur le Mac'); pa.wait_for_timeout(4800)
    b_, pb, eb = new_page(c['b'], google=g, storage=TOKEN, real=True); pb.wait_for_timeout(1500)
    assert st(pb, "S.tasks.some(t=>t.title==='Créée sur le Mac')"), 'pas récupérée sur le téléphone'
    add(pb, 'Créée sur le téléphone'); pb.wait_for_timeout(300)
    add(pa, 'Autre tâche Mac'); pa.wait_for_timeout(300)
    pb.evaluate("()=>{const S=window.journee.state;S.tasks=S.tasks.filter(t=>t.title!=='Créée sur le Mac');window.journee.save()}")
    pb.wait_for_timeout(4800); pa.wait_for_timeout(4800)
    pa.evaluate("()=>window.dispatchEvent(new Event('focus'))"); pa.evaluate("()=>{document.dispatchEvent(new Event('visibilitychange'))}"); pa.wait_for_timeout(2500)
    titles = st(pa, "S.tasks.map(t=>t.title)")
    assert 'Créée sur le téléphone' in titles and 'Autre tâche Mac' in titles, titles
    assert 'Créée sur le Mac' not in titles, 'suppression non propagée'
    assert not ea and not eb, (ea, eb); a.close(); b_.close()

@test('Figer la journée : les créneaux ne glissent plus avec l’heure')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 2))
    before = st(pg, "dayTasks(today()).map(t=>t.block.start)")
    pg.click('[data-act="freeze"]'); tick(pg)
    assert st(pg, 'S.days[today()].frozen') is True
    tick(pg, 90 * 60 * 1000)
    assert st(pg, "dayTasks(today()).map(t=>t.block.start)") == before, 'les créneaux ont bougé'
    pg.click('[data-act="freeze"]'); tick(pg, 31000)
    assert st(pg, "dayTasks(today()).map(t=>t.block.start)") != before, 'pas de reprise du glissement'
    assert not errs, errs; ctx.close()

@test('Téléphone : ligne de temps, appui long, menu Plus')
def _(c):
    g = Google()
    ctx, pg, errs = new_page(c['b'], 390, 844, clock=at(9, 2), google=g, storage=TOKEN); tick(pg, 1500)
    assert pg.locator('.mtl .mev').count() == 2, pg.locator('.mtl .mev').count()
    assert pg.locator('.mtl .card').count() == 3
    pg.evaluate("()=>window.journee.fn&&0")
    cid = pg.locator('.mtl .card').nth(1).get_attribute('data-id')
    pg.evaluate(f"()=>{{const el=document.querySelector('.card[data-id=\"{cid}\"] .ctitle');const t=new Touch({{identifier:1,target:el,clientX:100,clientY:300}});el.dispatchEvent(new TouchEvent('touchstart',{{touches:[t],bubbles:true}}))}}")
    tick(pg, 600)
    assert pg.locator('.menu [data-act="mvup"]').count() == 1, 'pas de menu à l’appui long'
    pg.click('.menu [data-act="mvup"]'); tick(pg)
    assert st(pg, "dayTasks(today())[0].id") == cid
    pg.click('#sidebtn'); tick(pg, 300)
    assert pg.locator('.stabs .mset').is_visible()
    assert not errs, errs; ctx.close()

@test('Revue : semaine et projets (plus d’objectifs), statistiques dans un seul onglet')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.evaluate("()=>{const S=window.journee.state,f=window.journee.fn;S.projects=[{id:'pj1',name:'Stardust',end:f.addDays(f.today(),2)}];S.tasks[0].proj='pj1';window.journee.save()}")
    pg.click('#nav [data-view="review"]'); pg.wait_for_timeout(200)
    assert pg.locator('.revtabs').count() == 1 and 'Ta semaine' in pg.inner_text('#main h1')
    assert 'Stardust' in pg.inner_text('#main') and 'objectif' not in pg.inner_text('#main').lower()
    pg.evaluate("()=>startRitual('weekplan',window.journee.fn.today())"); pg.wait_for_timeout(200)
    assert pg.locator('#sheet .rsteps .rtab').count() == 3 and pg.locator('#sheet .jobday').count() == 7
    pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(150)
    assert 'Stardust' in pg.inner_text('#sheet')
    pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(150); pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(200)
    assert st(pg, "S.weeks[monday(today())].planned") is True
    pg.evaluate("()=>openTask(window.journee.state.tasks[0].id)"); pg.wait_for_timeout(150)
    assert 'Objectif' not in pg.inner_text('#sheet')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    pg.click('[data-act="go"][data-v="stats"]'); pg.wait_for_timeout(200)
    assert 'Statistiques' in pg.inner_text('#main h1')
    assert pg.locator('#nav [data-view="review"].on').count() == 1
    assert not errs, errs; ctx.close()

@test('Arbre : 4 piliers, héritage des agendas, éditeur')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    assert st(pg, "S.channels.filter(c=>c.lvl===0).map(c=>c.name).join(',')") == 'Être,Grandir,Relier,Bâtir'
    assert st(pg, "S.channels.filter(c=>c.lvl===1).length") == 10
    assert st(pg, "S.channels.filter(c=>c.lvl===2).length") == 35
    assert st(pg, "window.journee.fn.nodeLabel('c-jdr')") == 'Jeu › MJ de JDR'
    # agenda : catégorie > domaine > pilier
    pg.evaluate("()=>{const S=window.journee.state,n=id=>S.channels.find(c=>c.id===id);n('p-grandir').cal='A';n('d-jeu').cal='B';window.journee.save()}")
    assert st(pg, "window.journee.fn.nodeCal('c-piano')") == 'A'
    assert st(pg, "window.journee.fn.nodeCal('c-magic')") == 'B'
    pg.click('#nav [data-view="tree"]'); pg.wait_for_timeout(200)
    assert pg.locator('.tvsvg .tvn').count() == 4 + 10 + 35, pg.locator('.tvsvg .tvn').count()
    # déployer un seul arbre : seuls ses nœuds restent détaillés
    pg.click('.tvtabs [data-id="p-grandir"]'); pg.wait_for_timeout(150)
    assert pg.locator('.tvsvg .tvn').count() == 4 + 3 + 9
    pg.click('[data-act="tvmode"][data-m="list"]'); pg.wait_for_timeout(150)
    assert pg.locator('.tpil').count() == 1
    pg.click('.tdom:has([data-node="d-jeu"]) [data-act="nodeadd"]'); pg.wait_for_timeout(200)
    nid = st(pg, "S.channels.at(-1).id")
    assert st(pg, "S.channels.at(-1).parent") == 'd-jeu'
    pg.fill(f'[data-nn="{nid}"]', 'Jeux vidéo'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    pg.fill(f'[data-nk="{nid}"]', 'JV'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    assert st(pg, f"window.journee.fn.findNode('jv').id") == nid
    # supprimer : on choisit où vont les tâches
    pg.evaluate(f"()=>{{const S=window.journee.state;S.tasks[0].channel='{nid}';window.journee.save()}}")
    pg.click(f'.tnode[data-node="{nid}"] [data-act="nodemenu"]'); pg.click('#modal [data-act="nodedelask"]'); pg.wait_for_selector('#pickov')
    assert pg.locator('#pickov [data-act="pkok"][disabled]').count() == 1
    pg.click('#pickov .pkt:has-text("Grandir")'); pg.click('#pickov .pkt:has-text("Jeu")')
    pg.click('#pickov .pkt:has-text("Magic")'); pg.click('#pickov [data-act="pkok"]'); pg.wait_for_timeout(150)
    assert st(pg, "S.tasks[0].channel") == 'c-magic' and not st(pg, f"S.channels.some(c=>c.id==='{nid}')")
    # déplacer une catégorie vers un autre domaine
    pg.click('.tvtabs [data-id=""]'); pg.wait_for_timeout(100)
    pg.evaluate("()=>{document.querySelectorAll('details.tdom').forEach(d=>d.open=true)}")
    pg.click('.tnode[data-node="c-lego"] [data-act="nodemenu"]'); pg.click('#modal [data-act="nodemove"]'); pg.wait_for_selector('#pickov')
    pg.click('#pickov .pkt:has-text("Création")'); pg.wait_for_timeout(150)
    assert st(pg, "S.channels.find(c=>c.id==='c-lego').parent") == 'd-creation'
    assert not errs, errs; ctx.close()

@test('Choisir la catégorie d’une tâche : recherche, suggestions, sans catégorie')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    add(pg, 'Récupérer colis 10m')
    assert st(pg, 'S.tasks.at(-1).channel') == 'c-demarches', st(pg, 'S.tasks.at(-1).channel')
    add(pg, 'Tonte barbe 10m')
    assert st(pg, 'S.tasks.at(-1).channel') == 'c-routines', 'tonte = pilosité, pas jardin'
    pg.click('#main .card:has-text("Tonte barbe") .chip.pc'); pg.wait_for_selector('#pickov')
    assert pg.locator('#pickov .pksug .pkc').count() >= 1
    # en 3 clics : on part du domaine actuel, on remonte aux piliers, puis pilier → domaine → catégorie
    pg.click('#pickov [data-act="pkup"][data-i="0"]'); pg.wait_for_timeout(80)
    assert pg.locator('#pickov .pkt').count() == 4
    pg.click('#pickov .pkt:has-text("Grandir")'); pg.wait_for_timeout(80)
    pg.click('#pickov .pkt:has-text("Jeu")'); pg.wait_for_timeout(80)
    pg.click('#pickov .pkt:has-text("Magic")'); pg.wait_for_timeout(150)
    assert st(pg, 'S.tasks.at(-1).channel') == 'c-magic' and pg.locator('#pickov').count() == 0
    pg.click('#main .card:has-text("Tonte barbe") .chip.pc'); pg.wait_for_selector('#pickov')
    assert pg.locator('#pickov .pkt:has-text("Magic")').count() == 1, 's’ouvre sur le domaine actuel'
    pg.fill('#pickov .pkq', 'nata'); pg.wait_for_timeout(100)
    assert pg.locator('#pickov .pkgrid .pkc').count() == 1
    pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
    assert st(pg, 'S.tasks.at(-1).channel') == 'c-natation' and pg.locator('#pickov').count() == 0
    # depuis le détail de la tâche
    pg.click('#main .card:has-text("Tonte barbe") .cbody .ctitle'); pg.click('#modal [data-act="pickcatm"]'); pg.wait_for_selector('#pickov')
    pg.click('#pickov [data-act="pkpick"][data-id=""]'); pg.wait_for_timeout(150)
    assert st(pg, 'S.tasks.at(-1).channel') is None and pg.locator('#modal:not(.hidden) .catbtn').count() == 1
    assert not errs, errs; ctx.close()

@test('Renvoyer au backlog : glisser sur le menu, bouton du détail, clic droit')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    n0 = st(pg, "S.tasks.filter(t=>!t.day).length")
    pg.locator('#main .card').first.drag_to(pg.locator('#nav [data-view="backlog"]')); pg.wait_for_timeout(200)
    assert st(pg, "S.tasks.filter(t=>!t.day).length") == n0 + 1, 'dépôt sur le menu Backlog sans effet'
    assert pg.evaluate('location.hash') != '#backlog', 'le dépôt ne doit pas changer de vue'
    pg.click('#main .card .cbody .ctitle >> nth=0'); pg.click('#modal [data-act="tobacklog"]'); pg.wait_for_timeout(150)
    assert st(pg, "S.tasks.filter(t=>!t.day).length") == n0 + 2
    assert pg.locator('#modal [data-act="tobacklog"]').count() == 0, 'le bouton doit disparaître une fois au backlog'
    pg.keyboard.press('Escape')
    pg.click('#main .card .cbody .ctitle >> nth=0', button='right'); pg.wait_for_timeout(150)
    pg.click('#modal [data-act="sheetmv"][data-to="backlog"]'); pg.wait_for_timeout(150)
    assert st(pg, "S.tasks.filter(t=>!t.day).length") == n0 + 3
    assert not errs, errs; ctx.close()

@test('Priorité en drapeaux, date prévue ≤ échéance, rappels d’échéance')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 30))
    # drapeaux dans le détail
    pg.click('#main .card .cbody .ctitle >> nth=0'); pg.click('#modal [data-act="setprio"][data-p="high"]'); tick(pg, 150)
    tid = st(pg, "dayTasks(today())[0].id")
    assert st(pg, f"S.tasks.find(t=>t.id==='{tid}').prio") == 'high'
    assert pg.locator('#modal .pbtn.on[data-p="high"]').count() == 1
    pg.keyboard.press('Escape'); tick(pg, 100)
    assert pg.locator(f'#main .card[data-id="{tid}"] .pflag').count() == 1
    # échéance demain : reporter à après-demain est bloqué, puis « Repousser l'échéance »
    pg.evaluate(f"()=>{{const S=window.journee.state;const t=S.tasks.find(t=>t.id==='{tid}');t.due=window.journee.fn.addDays(window.journee.fn.today(),1);window.journee.save()}}")
    pg.evaluate(f"()=>moveTask('{tid}',window.journee.fn.addDays(window.journee.fn.today(),2))"); tick(pg, 100)
    assert st(pg, f"S.tasks.find(t=>t.id==='{tid}').day") == d(1), 'la date prévue a dépassé l’échéance'
    assert 'Repousser' in pg.inner_text('#toast')
    pg.click('#toast [data-act="toastact"]'); tick(pg, 100)
    t = st(pg, f"S.tasks.find(t=>t.id==='{tid}')")
    assert t['due'] == d(2) and t['day'] == d(2), (t['due'], t['day'])
    # échéance avancée avant la date prévue : la date prévue suit
    pg.click(f'#main .card[data-id] .ctitle >> nth=0') if False else None
    pg.evaluate(f"()=>{{openTask('{tid}')}}"); tick(pg, 100)
    pg.fill('#modal [data-f="due"]', d(1)); pg.dispatch_event('#modal [data-f="due"]', 'change'); tick(pg, 150)
    assert st(pg, f"S.tasks.find(t=>t.id==='{tid}').day") == d(1)
    # rappels : matin du jour J et retard
    pg.evaluate("()=>{window.__n=[];const S=window.journee.state;S.settings.notif=true;const T=window.journee.fn.today,A=window.journee.fn.addDays;S.tasks.push(Object.assign({},S.tasks[0],{id:'dj',title:'Rendre dossier',due:T(),day:null,done:false,block:null}),Object.assign({},S.tasks[0],{id:'dl',title:'Vieux devis',due:A(T(),-2),day:null,done:false,block:null}),Object.assign({},S.tasks[0],{id:'ds',title:'Billets train',due:A(T(),3),day:null,done:false,block:null}));window.notify=(k,t,b)=>window.__n.push(t+' | '+b)}")
    pg.evaluate("()=>dueNotify(window.journee.fn.today(),Date.now(),+parseYmd(window.journee.fn.today()),window.journee.state.settings)"); tick(pg, 200)
    n = ' / '.join(pg.evaluate('window.__n||[]'))
    assert 'Rendre dossier' in n and 'Vieux devis' in n and 'Billets train' in n, n
    assert not errs, errs; ctx.close()

@test('Journée sans pression : heures au rituel du matin, rien ne glisse avant minuit, reports')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(16, 0))
    assert 'retard' not in pg.inner_text('#main')
    pg.click('[data-act="plan"] >> nth=0'); tick(pg, 200)
    assert pg.locator('#sheet .quote blockquote').count() == 1, 'citation du matin absente'
    pg.fill('[data-rh="e"]', '17:30'); pg.click('[data-act="ritnext"]'); tick(pg, 400)
    assert st(pg, "S.days[today()].he") == 17.5
    assert st(pg, "dayTasks(today()).length") == 3, 'rien ne doit glisser pendant le rituel'
    pg.keyboard.press('Escape'); pg.evaluate("()=>{const S=window.journee.state;S.days[window.journee.fn.today()].planned=true;window.journee.save()}"); tick(pg, 400)
    # v1.5 : plus de report en cours de journée, tout reste aujourd'hui jusqu'à minuit
    assert st(pg, "dayTasks(addDays(today(),1)).length") == 0 and st(pg, "dayTasks(today()).length") == 3
    # une priorité haute ne glisse pas
    pg.evaluate("()=>{const S=window.journee.state;S.tasks.forEach(t=>{if(t.day)t.prio='high'});S.tasks.filter(t=>t.day).forEach(t=>t.day=window.journee.fn.today());window.journee.save()}"); tick(pg, 400)
    assert st(pg, "dayTasks(today()).length") == 3
    # tâche d'hier : revient, compteur ; visible au matin (Revenues) et à la clôture
    pg.evaluate("()=>{const S=window.journee.state,f=window.journee.fn;S.days[f.today()].he=23;S.tasks.push(Object.assign({},S.tasks[0],{id:'old',title:'Vieille tâche',day:f.addDays(f.today(),-1),prio:'',roll:3,block:null,done:false}));window.journee.save()}"); tick(pg, 400)
    t = st(pg, "S.tasks.find(t=>t.id==='old')"); assert t['day'] == d() and t['roll'] == 4
    pg.evaluate("()=>startRitual('plan',window.journee.fn.today())"); tick(pg, 200)
    if 'Ce qui revient' not in pg.inner_text('#sheet'): pg.click('[data-act="ritnext"]'); tick(pg, 200)
    assert 'Vieille tâche' in pg.inner_text('#sheet') and pg.locator('#sheet .rrow.hot [data-act="phare"]').count() == 1
    pg.keyboard.press('Escape'); tick(pg, 100)
    pg.evaluate("()=>startRitual('shutdown',window.journee.fn.today())"); tick(pg, 150); pg.click('[data-act="ritnext"]'); tick(pg, 150)
    assert pg.locator('#sheet .rrow.hot').count() == 1
    pg.click('[data-act="ritnext"]'); tick(pg, 100); pg.click('[data-act="ritnext"]'); tick(pg, 100)
    assert pg.locator('#sheet .quote').count() == 1, 'citation du soir absente'
    pg.keyboard.press('Escape'); tick(pg, 100)
    pg.click('#main .rollm'); tick(pg, 150)
    pg.click('#modal [data-act="rolltomorrow"]'); tick(pg, 300)
    t = st(pg, "S.tasks.find(t=>t.id==='old')"); assert t['day'] == d(1) and t['roll'] == 0
    assert not errs, errs; ctx.close()

@test('Rituel : repousser en glissant vers Demain, 3 jours, semaine prochaine, Backlog')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.click('[data-act="plan"] >> nth=0')
    for _ in range(4): pg.click('[data-act="ritnext"]'); pg.wait_for_timeout(200)
    assert pg.locator('#sheet .pzone').count() == 4
    first = st(pg, "dayTasks(today())[0].id")
    pg.locator(f'#sheet [data-drag="task|{first}"]').drag_to(pg.locator('#sheet .pzone >> nth=1')); pg.wait_for_timeout(200)
    assert st(pg, f"S.tasks.find(t=>t.id==='{first}').day") == d(3)
    second = st(pg, "dayTasks(today())[0].id")
    pg.locator(f'#sheet [data-drag="task|{second}"]').drag_to(pg.locator('#sheet .pzone >> nth=3')); pg.wait_for_timeout(200)
    assert st(pg, f"S.tasks.find(t=>t.id==='{second}').day") is None
    assert pg.locator('#sheet .pzone').count() == 4, 'le rituel doit rester ouvert'
    assert not errs, errs; ctx.close()

OLD = """localStorage.setItem('journee.v1',JSON.stringify({seeded:true,settings:{aiKey:'k',aiAuto:false},channels:[{id:'o1',name:'Perso',color:'#2f9e6a',cal:'pro@group'},{id:'o2',name:'Ménage',color:'#888'},{id:'o3',name:'Déménagement',color:'#c90'}],
 tasks:[{id:'t1',title:'Douche',channel:'o1',day:null,subtasks:[]},{id:'t2',title:'Lessive',channel:'o2',day:null,subtasks:[]},{id:'t3',title:'Truc bizarre',channel:'o1',day:null,subtasks:[]},{id:'t4',title:'Cartons salon',channel:'o3',day:null,subtasks:[]}],
 archive:[{id:'a1',t:'Natation',c:'o1',d:'2025-01-01',a:1800},{id:'a2',t:'Méditation du soir',c:'o1',d:'2025-01-02',a:600}]}))"""

@test('Migration des anciens canaux vers l’arbre, puis affinage par Claude')
def _(c):
    ctx, pg, errs = new_page(c['b'], claude=True, storage=OLD)
    pg.wait_for_selector('[data-act="treego"]')
    assert 'Corps › Routines' in pg.inner_text('#modal')
    assert st(pg, "S.channels.some(c=>c.lvl===0)") is False, 'rien ne doit changer avant validation'
    pg.click('[data-act="treego"]'); pg.wait_for_timeout(200)
    ch = lambda i: st(pg, f"S.tasks.find(t=>t.id==='{i}').channel")
    assert ch('t1') == 'c-routines' and ch('t2') == 'c-menage' and ch('t3') is None and ch('t4') == 'd-foyer', [ch(x) for x in ['t1','t2','t3','t4']]
    assert st(pg, "S.tasks.find(t=>t.id==='t4').proj") and st(pg, "S.projects[0].name") == 'Déménagement'
    assert st(pg, "S.archive.map(a=>a.c).join(',')") == 'c-natation,c-meditation'
    assert st(pg, "S.channels.some(c=>c.lvl===undefined)") is False
    assert pg.evaluate("!!localStorage.getItem('journee.backup.pretree')")
    pg.click('#nav [data-view="settings"]'); pg.wait_for_timeout(200)
    pg.click('[data-act="refine"]'); pg.wait_for_selector('[data-act="refineok"]')
    pg.click('[data-act="refineok"]'); pg.wait_for_timeout(200)
    assert ch('t3') == 'c-callisthenie' and ch('t4') == 'c-menage', (ch('t3'), ch('t4'))
    assert not errs, errs; ctx.close()

@test('Synchro immédiate : envoi rapide, vérification légère, bandeau si non connecté')
def _(c):
    g = Google()
    ctx, pg, errs = new_page(c['b'], google=g, storage=TOKEN)
    pg.wait_for_timeout(1200); add(pg, 'Vite synchronisée'); pg.wait_for_timeout(2500)
    assert g.drive and any(t['title'] == 'Vite synchronisée' for t in g.drive['tasks']), 'pas envoyé en moins de 2,5 s'
    n = g.downloads
    pg.evaluate("()=>window.dispatchEvent(new Event('focus'))"); pg.wait_for_timeout(500)
    assert g.downloads == n, 'téléchargement inutile alors que rien n’a changé'
    # un autre appareil modifie : la vérification récupère
    g.drive['tasks'].append({'id': 'remote1', 'title': 'Venue du téléphone', 'day': None, 'subtasks': [], 'u': 9e15}); g.ver += 1
    pg.evaluate("()=>window.dispatchEvent(new Event('focus'))"); pg.wait_for_timeout(800)
    assert st(pg, "S.tasks.some(t=>t.title==='Venue du téléphone')"), 'modif distante non récupérée'
    ctx.close()
    ctx2, pg2, errs2 = new_page(c['b'], storage="localStorage.setItem('journee.sync.test','1')")
    assert pg2.locator('#syncbar:not(.hidden) [data-act="gin"]').count() == 1, 'bandeau absent'
    pg2.click('[data-act="synchide"]'); assert pg2.locator('#syncbar.hidden').count() == 1
    assert not errs and not errs2, (errs, errs2); ctx2.close()

@test('Le nom Diem ramène à Aujourd’hui')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.click('#nav [data-view="backlog"]'); pg.click('[data-act="next"]') if pg.locator('[data-act="next"]').count() else None
    pg.click('.brand'); pg.wait_for_timeout(200)
    assert pg.evaluate('location.hash') == '#today'
    assert st(pg, 'true') and 'Aujourd' in pg.inner_text('#main h1'), pg.inner_text('#main h1')
    assert not errs, errs; ctx.close()

@test('Rituels : cocher une tâche d’hier au matin et une tâche restante le soir')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.evaluate("()=>{const S=window.journee.state,f=window.journee.fn;S.days[f.today()]=Object.assign(S.days[f.today()]||{},{he:23});S.tasks.push(Object.assign({},S.tasks[0],{id:'y1',title:'Hier pas faite',day:f.addDays(f.today(),-1),prio:'',roll:0,block:null,done:false}));S.tasks.push(Object.assign({},S.tasks[0],{id:'y2',title:'Reste ce soir',day:f.today(),prio:'',roll:0,block:null,done:false}));window.journee.save()}"); tick(pg, 400)
    pg.evaluate("()=>startRitual('plan',window.journee.fn.today())"); tick(pg, 200)
    if 'Hier pas faite' not in pg.inner_text('#sheet'): pg.click('[data-act="ritnext"]'); tick(pg, 200)
    row = pg.locator('#sheet .rrow', has_text='Hier pas faite')
    assert row.locator('.chk').count() == 1 and row.locator('.btns [data-act="ritdone"]').count() == 0
    row.locator('.chk').click(); tick(pg, 300)
    assert st(pg, "S.tasks.find(t=>t.id==='y1').done") is True
    assert not pg.locator('#modal').get_attribute('class').count('hidden'), 'le rituel doit rester ouvert'
    pg.keyboard.press('Escape'); tick(pg, 100)
    pg.evaluate("()=>startRitual('shutdown',window.journee.fn.today())"); tick(pg, 150); pg.click('[data-act="ritnext"]'); tick(pg, 150)
    pg.locator('#sheet .rrow', has_text='Reste ce soir').locator('.chk').click(); tick(pg, 300)
    assert st(pg, "S.tasks.find(t=>t.id==='y2').done") is True
    assert not errs, errs; ctx.close()

@test('Affiner : ce que Claude ne sait pas ranger se range à la main, et il recommence sans erreur')
def _(c):
    ctx, pg, errs = new_page(c['b'], claude=True, storage=OLD)
    pg.wait_for_selector('[data-act="treego"]'); pg.click('[data-act="treego"]'); pg.wait_for_timeout(200)
    pg.evaluate("()=>{const S=window.journee.state;S.tasks.push(Object.assign({},S.tasks[0],{id:'inc',title:'Truc Inclassable',channel:null,mig:1,done:false,block:null}));window.journee.save()}")
    pg.click('#nav [data-view="settings"]'); pg.wait_for_timeout(200)
    pg.click('[data-act="refine"]'); pg.wait_for_selector('[data-act="refineok"]')
    assert 'À ranger toi-même' in pg.inner_text('#sheet') and 'Truc Inclassable' in pg.inner_text('#sheet')
    pg.click('[data-act="refineok"]'); pg.wait_for_timeout(200)
    assert st(pg, "S.tasks.find(t=>t.id==='inc').channel") is None
    pg.click('[data-act="refine"]'); pg.wait_for_selector('[data-act="refineok"]')
    assert 'Claude a déjà rangé' in pg.inner_text('#sheet'), pg.inner_text('#sheet')[:300]
    pg.select_option('[data-refsel="0"]', 'c-demarches'); pg.click('[data-act="refineok"]'); pg.wait_for_timeout(200)
    assert st(pg, "S.tasks.find(t=>t.id==='inc').channel") == 'c-demarches'
    # l'assistant (outil « proposer ») n'impose plus tool_choice
    pg.evaluate("()=>startRitual('plan',window.journee.fn.today())"); pg.wait_for_timeout(200)
    assert not errs, errs; ctx.close()

@test('Priorité : haute monte en tête, basse descend en fin, normale se place après les hautes')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.evaluate("()=>{const S=window.journee.state,f=window.journee.fn;S.tasks=S.tasks.filter(t=>t.day!==f.today());['A','B','C','D'].forEach((n,i)=>S.tasks.push({id:'p'+n,title:'Tâche '+n,day:f.today(),order:i+1,est:15,prio:'',done:false,subtasks:[]}));window.journee.save();window.journee.render&&window.journee.render()}"); tick(pg, 300)
    order = lambda: st(pg, "dayTasks(today()).filter(t=>!t.done).map(t=>t.id).join(',')")
    pg.evaluate("()=>window.journee.fn.openTask?0:0")
    def setp(i, p):
        pg.evaluate(f"()=>{{openTask('{i}')}}"); tick(pg, 100)
        pg.click(f'#modal [data-act="setprio"][data-p="{p}"]'); tick(pg, 100); pg.keyboard.press('Escape'); tick(pg, 100)
    setp('pC', 'high'); assert order() == 'pC,pA,pB,pD', order()
    setp('pA', 'low'); assert order() == 'pC,pB,pD,pA', order()
    setp('pD', 'high'); assert order() == 'pD,pC,pB,pA', order()
    setp('pD', ''); assert order() == 'pC,pD,pB,pA', order()
    assert not errs, errs; ctx.close()

@test('Un rituel rouvert repart toujours du premier onglet')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    for ty in ('shutdown', 'plan'):
        pg.evaluate(f"()=>startRitual('{ty}',window.journee.fn.today())"); tick(pg, 150)
        pg.click('[data-act="ritnext"]'); tick(pg, 150)
        pg.click('[data-act="close"] >> nth=-1'); tick(pg, 150)
        pg.evaluate(f"()=>startRitual('{ty}',window.journee.fn.today())"); tick(pg, 150)
        assert 'on' in pg.locator('#sheet .rsteps .rtab').nth(0).get_attribute('class'), ty
        pg.keyboard.press('Escape'); tick(pg, 100)
    assert not errs, errs; ctx.close()

@test('Minuteur : remise à zéro = pause, ±5 min, saisie directe, annulation')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    tid = st(pg, "dayTasks(today()).find(t=>!t.done).id")
    pg.evaluate(f"()=>openFocus('{tid}')")
    tick(pg, 200)
    pg.evaluate(f"()=>{{const t=window.journee.state.tasks.find(x=>x.id==='{tid}');t.actual=600;window.journee.save()}}"); tick(pg, 100)
    assert st(pg, f"!!(S.running&&S.running.taskId==='{tid}')") is True
    pg.click('#focus [data-act="timerreset"]'); tick(pg, 150)
    assert st(pg, "S.running") is None, 'la remise à zéro doit mettre en pause'
    assert st(pg, f"Math.round(actualSec(T('{tid}')))") == 0
    pg.click('#toast [data-act="toastact"]'); tick(pg, 150)
    assert st(pg, f"!!(S.running&&S.running.taskId==='{tid}')") is True and st(pg, f"Math.round(actualSec(T('{tid}'))/60)") == 10
    pg.click('#focus [data-act="timeradj"][data-v="5"]'); tick(pg, 100)
    assert st(pg, f"Math.round(actualSec(T('{tid}'))/60)") == 15
    pg.click('#focus [data-act="timeradj"][data-v="-5"]'); pg.click('#focus [data-act="timeradj"][data-v="-5"]'); pg.click('#focus [data-act="timeradj"][data-v="-5"]'); pg.click('#focus [data-act="timeradj"][data-v="-5"]'); tick(pg, 100)
    assert st(pg, f"Math.round(actualSec(T('{tid}')))") < 5
    pg.click('#focus [data-act="timeredit"]'); tick(pg, 100)
    pg.fill('#focus [data-fedit]', '1h20'); pg.press('#focus [data-fedit]', 'Enter'); tick(pg, 150)
    assert st(pg, f"Math.round(actualSec(T('{tid}'))/60)") == 80, st(pg, f"actualSec(T('{tid}'))")
    run = st(pg, "!!S.running"); pg.keyboard.press('Space'); tick(pg, 100)
    assert st(pg, "!!S.running") is (not run), 'Espace doit mettre en pause / reprendre'
    assert not errs, errs; ctx.close()

@test('Projets : page à part, création, tâche ajoutée au projet, progression')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.click('#nav [data-view="projects"]'); pg.wait_for_timeout(200)
    assert 'Projets' in pg.inner_text('#main h1')
    pg.click('#main [data-act="projadd"]'); pg.wait_for_timeout(200)
    pid = st(pg, "S.projects[S.projects.length-1].id")
    pg.fill(f'[data-pn="{pid}"]', 'Spectacle Villette'); pg.press(f'[data-pn="{pid}"]', 'Tab'); pg.wait_for_timeout(100)
    assert st(pg, "S.projects[S.projects.length-1].name") == 'Spectacle Villette'
    pg.fill(f'[data-keep="pj-{pid}"]', 'Plan de feu 30m'); pg.press(f'[data-keep="pj-{pid}"]', 'Enter'); pg.wait_for_timeout(200)
    assert st(pg, f"S.tasks.filter(t=>t.proj==='{pid}').length") == 1
    assert 'Plan de feu' in pg.inner_text('#main') and '0/1 tâches faites' in pg.inner_text('#main')
    assert '+spectaclevillette' in pg.inner_text('#main')
    pg.click('#nav [data-view="settings"]'); pg.wait_for_timeout(150)
    assert pg.locator('#main [data-pn]').count() == 0
    assert not errs, errs; ctx.close()

@test('Moteur : boulot en veille / sans pause, lieu des tâches, trajet')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.evaluate("()=>{const S=window.journee.state,f=window.journee.fn,d=f.today();S.tasks=S.tasks.filter(t=>t.day!==d);S.days[d]={hs:7,he:23};S.settings.travel=60;[['A','any'],['B','home'],['C','any'],['D','']].forEach(([n,w],i)=>S.tasks.push({id:'m'+n,title:'T'+n,day:d,order:i+1,est:30,prio:'high',done:false,subtasks:[],where:w,channel:n==='D'?'c-menage':null}));window.journee.save()}")
    plan = lambda: st(pg, "Object.fromEntries(simFlow(today()).map(([t,s])=>[t.id,new Date(s).getHours()+':'+String(new Date(s).getMinutes()).padStart(2,'0')]))")
    p = plan(); assert p['mA'] == '10:00' and p['mB'] == '10:30', p
    pg.evaluate("()=>{const S=window.journee.state;S.days[window.journee.fn.today()].job='watch';S.days[window.journee.fn.today()].js=9;S.days[window.journee.fn.today()].je=18}")
    p = plan(); assert p['mA'] == '10:00' and p['mC'] == '10:30' and p['mB'] == '19:00' and p['mD'] == '19:30', p
    pg.evaluate("()=>{window.journee.state.days[window.journee.fn.today()].job='busy'}")
    p = plan(); assert p['mA'] == '19:00' and p['mB'] == '19:30', p
    assert st(pg, "whereOf(T('mD'))") == 'home' if st(pg, "!!node('c-menage')") else True
    # interface : choix dans le rituel du matin et lieu dans la tâche
    pg.evaluate("()=>startRitual('plan',window.journee.fn.today())"); tick(pg, 200)
    pg.click('#sheet [data-act="setjob"][data-v="watch"]'); tick(pg, 100)
    assert st(pg, "S.days[today()].job") == 'watch' and pg.locator('#sheet [data-jh="s"]').count() == 1
    pg.keyboard.press('Escape'); tick(pg, 100)
    pg.evaluate("()=>openTask('mA')"); tick(pg, 100)
    pg.click('#sheet [data-act="setwhere"][data-v="out"]'); tick(pg, 100)
    assert st(pg, "T('mA').where") == 'out'
    assert not errs, errs; ctx.close()

@test('Moteur 2 : horaires de boulot lus dans l’agenda (phases, ignorés, journée entière), réglage manuel prioritaire')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.evaluate("""()=>{const S=window.journee.state,f=window.journee.fn,d=f.today();S.tasks=S.tasks.filter(t=>t.day!==d);S.days[d]={hs:7,he:23};S.settings.travel=60;
      const at=h=>{const x=new Date(f.parseYmd?f.parseYmd(d):new Date(d+'T00:00'));x.setMinutes(h*60);return x.toISOString()};
      const ev=(id,t,a,b)=>({id,summary:t,start:{dateTime:at(a)},end:{dateTime:at(b)},_cid:'travail-id',_cal:'Travail'});
      gEvents[d]=[ev('e1','AXA France / Montage',8,10),ev('e2','AXA France / Exploitation',10,15),ev('e3','Autre / Indisponible sur la phase',16,18)];
      [['A','any'],['B','home'],['C','any']].forEach(([n,w],i)=>S.tasks.push({id:'g'+n,title:'T'+n,day:d,order:i+1,est:30,prio:'high',done:false,subtasks:[],where:w}));window.journee.save()}""")
    plan = lambda: st(pg, "Object.fromEntries(simFlow(today()).map(([t,s])=>[t.id,new Date(s).getHours()+':'+String(new Date(s).getMinutes()).padStart(2,'0')]))")
    j = st(pg, "jobOf(today())"); assert j['auto'] and j['s'] == 8 and j['e'] == 15 and len(j['segs']) == 2, j
    p = plan(); assert p['gA'] == '10:00' and p['gC'] == '10:30' and p['gB'] == '16:00', p
    assert 'agenda' in st(pg, "jobLabel(today())")
    # journée entière = sans pause 8–18
    pg.evaluate("()=>{const d=window.journee.fn.today();gEvents[d]=[{id:'e9',summary:'Mvision',start:{date:d},end:{date:window.journee.fn.addDays(d,1)},_cid:'travail-id',_cal:'Travail',transparency:'transparent'}]}")
    p = plan(); assert p['gA'] == '19:00', p
    # réglage manuel : libre l'emporte, puis retour à l'agenda
    pg.evaluate("()=>{const S=window.journee.state;S.days[window.journee.fn.today()].job=''}")
    p = plan(); assert p['gA'] == '10:00' and p['gB'] == '10:30', p
    pg.evaluate("()=>startRitual('plan',window.journee.fn.today())"); tick(pg, 200)
    pg.click('#sheet [data-act="setjob"][data-v="auto"]'); tick(pg, 100)
    assert st(pg, "S.days[today()].job===undefined") is True and pg.locator('#sheet .jobseg').count() == 1
    assert not errs, errs; ctx.close()

@test('Rituels : onglets cliquables, heures gardées, heures invalides bloquent')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.evaluate("()=>startRitual('plan',window.journee.fn.today())"); tick(pg, 200)
    pg.fill('[data-rh="e"]', '20:00')
    pg.click('#sheet .rtab[data-i="4"]'); tick(pg, 150)
    assert st(pg, "ritual.step") == 4 and st(pg, "S.days[today()].he") == 20
    pg.click('#sheet .rtab[data-i="0"]'); tick(pg, 150)
    pg.fill('[data-rh="e"]', '06:00'); pg.click('#sheet .rtab[data-i="2"]'); tick(pg, 150)
    assert st(pg, "ritual.step") == 0, 'des heures invalides ne doivent pas laisser partir'
    assert not errs, errs; ctx.close()

@test('Focus : réduire en pastille (bouton ou Échap), pause depuis la pastille, agrandir')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    tid = st(pg, "dayTasks(today()).find(t=>!t.done).id")
    pg.evaluate(f"()=>openFocus('{tid}')"); tick(pg, 200)
    pg.click('#focus [data-act="focusmin"]'); tick(pg, 150)
    assert 'hidden' in pg.get_attribute('#focus', 'class') and pg.locator('#minifocus .mfexp').count() == 1
    assert st(pg, f"!!(S.running&&S.running.taskId==='{tid}')") is True, 'le minuteur continue'
    pg.click('#minifocus .mfplay'); tick(pg, 150)
    assert st(pg, "S.running") is None and pg.locator('#minifocus .mfexp').count() == 1, 'en pause, la pastille reste'
    pg.click('#minifocus .mfexp'); tick(pg, 150)
    assert 'hidden' not in pg.get_attribute('#focus', 'class') and pg.locator('#minifocus .mfexp').count() == 0
    pg.keyboard.press('Escape'); tick(pg, 150)
    assert pg.locator('#minifocus .mfexp').count() == 1, 'Échap réduit'
    run = st(pg, "!!S.running"); pg.keyboard.press('Space'); tick(pg, 150)
    assert st(pg, "!!S.running") is (not run), 'Espace marche aussi en pastille'
    pg.click('#minifocus .mfexp'); tick(pg, 100); pg.click('#focus [data-act="focusclose"]'); tick(pg, 150)
    # Quitter : si le minuteur tourne encore, la pastille le rappelle ; en pause, elle disparaît
    assert pg.locator('#minifocus .mfexp').count() == (1 if st(pg, "!!S.running") else 0)
    if st(pg, "!!S.running"): pg.click('#minifocus .mfplay'); tick(pg, 150)
    assert pg.locator('#minifocus .mfexp').count() == 0
    assert not errs, errs; ctx.close()

@test('Cocher à la chaîne : la case suivante revient sous le curseur')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.evaluate("()=>{const S=window.journee.state,f=window.journee.fn,d=f.today();S.tasks=S.tasks.filter(t=>t.day!==d);['Une tâche courte','Une tâche avec un titre bien plus long qui passe sur deux lignes dans la liste du jour, pour voir','Courte','Encore une','Dernière'].forEach((n,i)=>S.tasks.push({id:'k'+i,title:n,day:d,order:i+1,est:15,done:false,subtasks:[],due:i===1?d:null}));window.journee.save();render()}"); tick(pg, 300)
    bb = pg.locator('#main .card:not(.done) .chk').nth(0).bounding_box(); x, y = bb['x']+bb['width']/2, bb['y']+bb['height']/2
    for i in range(4): pg.mouse.click(x, y); tick(pg, 250)
    assert st(pg, "dayTasks(today()).filter(t=>t.done).length") == 4, st(pg, "dayTasks(today()).filter(t=>t.done).map(t=>t.title)")
    assert not errs, errs; ctx.close()

@test('Soirée : Maintenant/Ensuite, temps restant, saisie rapide, durée apprise, clavier, volet redimensionnable')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    assert pg.locator('#main .nownext .nowc .nowt').count() == 1
    assert 'prévues' in pg.inner_text('#main .summary')
    # durée apprise + saisie rapide
    pg.evaluate("()=>{const S=window.journee.state;S.archive=(S.archive||[]).concat([{id:'a1',t:'Tonte barbe',a:14*60,d:'2026-11-01'},{id:'a2',t:'Tonte barbe',a:11*60,d:'2026-11-08'},{id:'a3',t:'tonte  barbe',a:13*60,d:'2026-11-15'}]);window.journee.save()}")
    pg.click('#main [data-act="addopen"]'); tick(pg, 100)
    inp = '[data-adtitle]'
    pg.fill(inp, 'Tonte barbe demain ! @maison'); pg.dispatch_event(inp, 'input'); tick(pg, 100)
    prev = pg.inner_text('#sheet .qprev'); assert 'priorité haute' in prev and 'chez moi' in prev and '15 min' in prev, prev
    pg.press(inp, 'Enter'); tick(pg, 200); pg.keyboard.press('Escape'); tick(pg, 100)
    t = st(pg, "S.tasks.find(t=>t.title==='Tonte barbe')")
    assert t['est'] == 15 and t['prio'] == 'high' and t['where'] == 'home' and t['day'] == st(pg, "addDays(today(),1)"), t
    # clavier : ↓ choisit, X coche, Ctrl+Z annule
    pg.click('#main h1'); n0 = st(pg, "dayTasks(today()).filter(t=>t.done).length")
    pg.keyboard.press('ArrowDown'); tick(pg, 80)
    assert pg.locator('#main .card.kbsel').count() == 1
    pg.keyboard.press('x'); tick(pg, 200)
    assert st(pg, "dayTasks(today()).filter(t=>t.done).length") == n0 + 1
    assert pg.locator('#main .card.kbsel').count() == 1, 'la sélection passe à la suivante'
    pg.keyboard.press('Control+z'); tick(pg, 200)
    assert st(pg, "dayTasks(today()).filter(t=>t.done).length") == n0
    # volet de droite
    g = pg.locator('#side .sidegrip').bounding_box()
    pg.mouse.move(g['x']+4, 400); pg.mouse.down(); pg.mouse.move(g['x']-150, 400, steps=5); pg.mouse.up(); tick(pg, 100)
    w = pg.locator('#side').bounding_box()['width']; assert w > 420, w
    pg.dblclick('#side .sidegrip'); tick(pg, 100)
    assert abs(pg.locator('#side').bounding_box()['width'] - 300) < 3
    assert not errs, errs; ctx.close()

@test('v1.5 : durée en menu (5 min puis 15 min), ajout en haut / bas / Génie')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    opts = st(pg, "DUR_OPTS"); assert opts[:3] == [5, 10, 15] and 60 in opts and 75 in opts and 65 not in opts and 70 not in opts, opts[:16]
    tid = st(pg, "dayTasks(today()).find(t=>!t.done).id")
    pg.click(f'#main .card[data-id="{tid}"] [data-act="estmenu"]'); tick(pg, 100)
    assert pg.locator('#pop.durpop .durit').count() == len(opts) or pg.locator('#pop.durpop .durit').count() == len(opts) + 1
    pg.click('#pop.durpop .durit[data-v="35"]'); tick(pg, 100)
    assert st(pg, f"T('{tid}').est") == 35
    pg.evaluate(f"()=>openTask('{tid}')"); tick(pg, 100)
    assert pg.locator('#sheet select[data-f="est"] option[value="105"]').count() == 1
    pg.keyboard.press('Escape'); tick(pg, 100)
    # position d'ajout
    cyc = lambda: (pg.click('#main [data-act="addopen"]'), tick(pg, 100), pg.click('#sheet [data-act="addposcycle"]'), tick(pg, 100), pg.keyboard.press('Escape'), tick(pg, 100))
    assert pg.locator('#main [data-act="addpos"]').count() == 0, 'plus d’icônes à côté du champ'
    cyc()  # en bas → en haut
    add(pg, 'En haut 10m')
    assert st(pg, "dayTasks(today()).filter(t=>!t.done)[0].title") == 'En haut'
    cyc(); cyc()  # → Génie → en bas
    add(pg, 'En bas 10m')
    assert st(pg, "dayTasks(today()).filter(t=>!t.done).at(-1).title") == 'En bas'
    cyc(); cyc()  # → en haut → Génie
    add(pg, 'Urgente ! 10m')
    assert st(pg, "dayTasks(today()).filter(t=>!t.done)[0].title") == 'Urgente'
    add(pg, 'Pas pressée !bas 10m')
    assert st(pg, "dayTasks(today()).filter(t=>!t.done).at(-1).title") == 'Pas pressée'
    assert st(pg, "S.settings.addPos") == 'auto'
    assert not errs, errs; ctx.close()

@test('Fenêtre d’ajout : actions rapides, enchaîner ; boutons des volets')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.keyboard.press('n'); tick(pg, 150)
    assert pg.locator('#sheet [data-adtitle]').count() == 1, 'N ouvre la fenêtre d’ajout'
    pg.fill('[data-adtitle]', 'Ranger le bureau')
    pg.select_option('#sheet [data-adest]', '25'); tick(pg, 80)
    assert pg.input_value('[data-adtitle]') == 'Ranger le bureau', 'le titre reste après un réglage'
    pg.click('#sheet [data-act="adprio"][data-v="high"]'); pg.click('#sheet [data-act="adwhere"][data-v="home"]'); tick(pg, 80)
    pg.select_option('#sheet [data-adday]', st(pg, "addDays(today(),1)")); tick(pg, 80)
    pg.click('#sheet [data-act="adcat"]'); pg.wait_for_selector('#pickov')
    pg.click('#pickov [data-act="pkup"][data-i="0"]'); pg.click('#pickov .pkt:has-text("Bâtir")'); pg.click('#pickov .pkt:has-text("Foyer")'); pg.click('#pickov .pkt:has-text("Ménage")'); tick(pg, 100)
    assert 'Ménage' in pg.inner_text('#sheet')
    pg.press('[data-adtitle]', 'Enter'); tick(pg, 200)
    t = st(pg, "S.tasks.find(t=>t.title==='Ranger le bureau')")
    assert t['est'] == 25 and t['prio'] == 'high' and t['where'] == 'home' and t['channel'] == 'c-menage' and t['day'] == st(pg, "addDays(today(),1)"), t
    assert pg.locator('#sheet [data-adtitle]').count() == 1 and pg.input_value('[data-adtitle]') == '', 'on enchaîne'
    pg.keyboard.press('Escape'); tick(pg, 100)
    # volets
    pg.click('#sidetog'); tick(pg, 150)
    assert not pg.locator('#side').is_visible()
    pg.click('#navtog'); tick(pg, 150)
    nb = pg.locator('#nav').bounding_box(); assert nb and nb['width'] <= 70, ('menu replié en rail', nb); assert not pg.locator('#nav [data-view="week"] .ll').is_visible(); mw = pg.locator('#main').bounding_box()['width']; assert mw > pg.viewport_size['width'] - 110, mw
    pg.click('#navtog'); pg.click('#sidetog'); tick(pg, 150)
    assert pg.locator('#side').is_visible() and pg.locator('#nav').is_visible()
    assert not errs, errs; ctx.close()

@test('Report à minuit : ce qui n’est pas fait passe au lendemain au changement de jour')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(23, 50))
    pg.evaluate("()=>{const S=window.journee.state;S.days[window.journee.fn.today()]={hs:7,he:22,planned:true};window.journee.save()}"); tick(pg, 300)
    n = st(pg, "dayTasks(today()).filter(t=>!t.done).length"); d0 = st(pg, "today()")
    assert n >= 1 and st(pg, f"dayTasks(addDays('{d0}',1)).length") == 0
    tick(pg, 15 * 60 * 1000)
    assert st(pg, "today()") != d0
    assert st(pg, "dayTasks(today()).filter(t=>!t.done).length") >= n, 'reportées à minuit'
    assert not errs, errs; ctx.close()

@test('Clic droit : Supprimer (annulable), Aujourd’hui ; volet replié en le glissant sous sa taille minimale')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    tid = st(pg, "dayTasks(today()).find(t=>!t.done).id"); n = st(pg, "S.tasks.length")
    pg.click(f'#main .card[data-id="{tid}"] .ctitle', button='right'); tick(pg, 150)
    pg.click('#sheet [data-act="rmsheet"]'); tick(pg, 150)
    assert st(pg, "S.tasks.length") == n - 1
    pg.keyboard.press('Control+z'); tick(pg, 150)
    assert st(pg, "S.tasks.length") == n
    pg.evaluate("()=>{const S=window.journee.state;S.tasks.push(Object.assign({},S.tasks[0],{id:'tm',title:'Pour demain',day:window.journee.fn.addDays(window.journee.fn.today(),1),block:null,done:false}));window.journee.save();render()}")
    pg.evaluate("()=>taskSheet('tm')"); tick(pg, 100)
    pg.click('#sheet [data-act="sheetmv"][data-to="' + st(pg, "today()") + '"]'); tick(pg, 150)
    assert st(pg, "T('tm').day") == st(pg, "today()")
    g = pg.locator('#side .sidegrip').bounding_box(); W = pg.viewport_size['width']
    pg.mouse.move(g['x']+4, 400); pg.mouse.down(); pg.mouse.move(W - 225, 400, steps=5); pg.mouse.up(); tick(pg, 150)
    assert not pg.locator('#side').is_visible(), 'replié dès qu’on passe sous la taille minimale'
    pg.click('#sidetog'); tick(pg, 150)
    assert pg.locator('#side').is_visible() and pg.locator('#side').bounding_box()['width'] > 250
    assert not errs, errs; ctx.close()

@test('v1.6 : coche d’une tâche future, prochain jour libre, clôture du jour, projets du Génie, multi-sélection, journée entière, horizon')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(14, 0))
    # coche d'une tâche prévue demain : elle passe aujourd'hui, juste avant maintenant
    pg.evaluate("()=>{S.tasks.push(mk({id:'fut',title:'Prévue demain',day:addDays(today(),1),est:20}));save();render()}")
    pg.evaluate("()=>toggleDone('fut')"); tick(pg, 200)
    t = st(pg, "T('fut')"); assert t['done'] and t['day'] == d() and t['block'], t
    e = st(pg, "(new Date(T('fut').block.end)-Date.now())/60000"); s0 = st(pg, "(Date.now()-new Date(T('fut').block.start))/60000")
    assert abs(e) < 2 and abs(s0 - 20) < 2, (e, s0)
    # prochain jour libre : demain plein → après-demain
    pg.evaluate("()=>{const dm=addDays(today(),1);S.days[dm]=Object.assign(S.days[dm]||{},{hs:9,he:10});S.tasks.push(mk({id:'full',title:'Remplit demain',day:dm,est:60}));S.tasks.push(mk({id:'mv',title:'À reporter',day:today(),est:30}));save();render()}")
    pg.evaluate("()=>taskSheet('mv')"); tick(pg, 100)
    pg.click('#sheet [data-act="sheetmv"][data-to="' + d(1) + '"]'); tick(pg, 150)
    assert st(pg, "T('mv').day") == d(2), st(pg, "T('mv').day")
    # clôture lancée depuis demain : porte sur aujourd'hui
    pg.evaluate("()=>{cur=addDays(today(),1);render()}"); tick(pg, 100)
    pg.keyboard.press('s'); tick(pg, 150)
    assert st(pg, "ritual.day") == d(); pg.keyboard.press('Escape'); tick(pg, 100)
    pg.evaluate("()=>{cur=today();render()}"); tick(pg, 100)
    # le Génie crée un projet
    pg.evaluate("()=>{const m={prop:{message:'ok',new_projects:[{name:'Fête de Léa',end:addDays(today(),10),tasks:['Inviter','Gâteau']}]}};applyItem(m,'j0')}")
    pj = st(pg, "S.projects.find(p=>p.name==='Fête de Léa')"); assert pj and st(pg, f"S.tasks.filter(t=>t.proj==='{pj['id']}').length") == 2
    # multi-sélection
    ids = pg.evaluate("[...document.querySelectorAll('#main .list > .card[data-id]')].slice(0,2).map(c=>c.dataset.id)")
    pg.click(f'#main .card[data-id="{ids[0]}"] .ctitle', modifiers=['Control']); pg.click(f'#main .card[data-id="{ids[1]}"] .ctitle', modifiers=['Control']); tick(pg, 100)
    assert pg.locator('#main .card.msel').count() == 2 and '2 sélectionnées' in pg.inner_text('#mselbar')
    pg.click('#mselbar [data-v="backlog"]'); tick(pg, 150)
    assert st(pg, f"T('{ids[0]}').day") is None and st(pg, f"T('{ids[1]}').day") is None and 'hidden' in pg.get_attribute('#mselbar', 'class')
    pg.keyboard.press('Control+z'); tick(pg, 150)
    assert st(pg, f"T('{ids[0]}').day") == d()
    # journée entière : bloc hachuré 8 h–18 h dans l'agenda ; horizon
    pg.evaluate("()=>{const d=today();gEvents[d]=[{id:'mv1',summary:'Mvision',start:{date:d},end:{date:addDays(d,1)},_cid:'t',_cal:'Travail',transparency:'transparent'}];render()}"); tick(pg, 150)
    assert pg.locator('.ev.allday:has-text("Mvision")').count() >= 1
    assert pg.locator('#main .horizon .hsun').count() == 1
    assert not errs, errs; ctx.close()

@test('v1.6 : sélection en haut / en bas, glisser plusieurs tâches')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0))
    pg.evaluate("()=>{for(let i=1;i<=5;i++)S.tasks.push(mk({id:'m'+i,title:'Tâche '+i,day:today(),est:10,order:i}));save();render()}"); tick(pg, 150)
    order = lambda: pg.evaluate("[...document.querySelectorAll('#main .card[data-id^=\"m\"]')].map(c=>c.dataset.id)")
    o0 = order()
    pg.click('#main .card[data-id="m4"] .ctitle', modifiers=['Control']); pg.click('#main .card[data-id="m5"] .ctitle', modifiers=['Control']); tick(pg, 100)
    pg.click('#mselbar [data-v="top"]'); tick(pg, 150)
    o = order(); assert o[:2] == ['m4', 'm5'], o
    assert pg.locator('#main .card.msel').count() == 2
    pg.click('#mselbar [data-v="bottom"]'); tick(pg, 150)
    o = order(); assert o[-2:] == ['m4', 'm5'], o
    pg.keyboard.press('Escape'); tick(pg, 100)
    # glisser m1 + m2 (sélectionnées) vers le backlog
    pg.click('#main .card[data-id="m1"] .ctitle', modifiers=['Control']); pg.click('#main .card[data-id="m2"] .ctitle', modifiers=['Control']); tick(pg, 100)
    pg.evaluate("""()=>{const src=document.querySelector('#main .card[data-id="m1"]'),dst=document.querySelector('[data-drop="backlog"],[data-pz="backlog"]');const dt=new DataTransfer();src.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));dst.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));dst.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));src.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt}))}""")
    tick(pg, 200)
    assert st(pg, "T('m1').day") is None and st(pg, "T('m2').day") is None, (st(pg, "T('m1').day"), st(pg, "T('m2').day"))
    pg.keyboard.press('Control+z'); tick(pg, 150)
    assert st(pg, "T('m1').day") == d() and st(pg, "T('m2').day") == d()
    assert not errs, errs; ctx.close()

@test('v1.7 : tri du backlog, cible Aujourd’hui, sous-tâche par glisser, journée entière ajustable, Annuler cliquable, arbre zoomable')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0))
    drag = """([s,dsel,opt])=>{const src=document.querySelector(s),dst=document.querySelector(dsel);const dt=new DataTransfer();src.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));const r=dst.getBoundingClientRect(),x=r.left+r.width*(opt||.5),y=r.top+r.height/2;dst.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:x,clientY:y}));dst.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:x,clientY:y}));src.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt}))}"""
    pg.evaluate("()=>{S.tasks.push(mk({id:'b1',title:'Zeta',est:60,day:null,order:1,prio:'low'}),mk({id:'b2',title:'Alpha',est:10,day:null,order:2,prio:'high'}),mk({id:'s1',title:'Parent',day:today(),order:1,est:20}),mk({id:'s2',title:'Enfant',day:today(),order:2,est:10}));save();render()}")
    # tri du backlog
    pg.evaluate("()=>go('backlog')"); tick(pg, 150)
    pg.click('.blsort [data-v="est"]'); tick(pg, 150)
    ids = pg.evaluate("[...document.querySelectorAll('#main .card[data-id]')].map(c=>c.dataset.id)")
    assert ids.index('b2') < ids.index('b1'), ids
    pg.click('.blsort [data-v="prio"]'); tick(pg, 150)
    ids = pg.evaluate("[...document.querySelectorAll('#main .card[data-id]')].map(c=>c.dataset.id)")
    assert ids[0] == 'b2' and ids.index('b1') == len(ids) - 1, ids
    # cible Aujourd'hui de la barre de gauche
    pg.evaluate(drag, ['#main .card[data-id="b1"]', '#nav [data-view="today"]', .5]); tick(pg, 150)
    assert st(pg, "T('b1').day") == d()
    assert pg.locator('#toast .tact').count() == 1, pg.inner_text('#toast')
    pg.click('#toast .tact'); tick(pg, 150)
    assert st(pg, "T('b1').day") is None
    # glisser à droite = sous-tâche
    pg.evaluate("()=>go('today')"); tick(pg, 150)
    pg.evaluate(drag, ['#main .card[data-id="s2"]', '#main .card[data-id="s1"]', .85]); tick(pg, 150)
    assert st(pg, "T('s2')") is None and st(pg, "T('s1').subtasks.map(x=>x.t)") == ['Enfant']
    # journée entière ajustable
    pg.evaluate("()=>{const d=today();gEvents[d]=[{id:'mv1',summary:'Mvision',start:{date:d},end:{date:addDays(d,1)},_cid:'t',_cal:'Travail'}];sideTab='cal';render()}"); tick(pg, 200)
    h = pg.locator('#side .ev.allday .adrz.bot'); pg.evaluate("()=>document.querySelector('#side .ev.allday .adrz.bot').scrollIntoView({block:'center'})"); tick(pg, 100)
    bb = h.bounding_box(); pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + 4); pg.mouse.down(); pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + 4 - 76 * 2, steps=6); pg.mouse.up(); tick(pg, 200)
    assert st(pg, "S.days[today()].ad.e") == 16, st(pg, "S.days[today()].ad")
    assert '16 h' in pg.inner_text('#side .ev.allday')
    pg.dblclick('#side .ev.allday b'); tick(pg, 150)
    assert st(pg, "!S.days[today()].ad")
    # arbre zoomable
    pg.evaluate("()=>{view='tree';treeMode='map';render()}"); tick(pg, 200)
    if pg.locator('.tvzoom').count():
        vb0 = pg.get_attribute('.tvsvg', 'viewBox'); pg.click('.tvzoom [data-v="in"]'); vb1 = pg.get_attribute('.tvsvg', 'viewBox')
        assert vb0 != vb1 and '130 %' in pg.inner_text('.tvzoom')
        pg.click('.tvzoom [data-v="fit"]'); assert pg.get_attribute('.tvsvg', 'viewBox') == vb0
    assert not errs, errs; ctx.close()

@test('v1.7 : sélection au clavier, Alt+flèches, Suppr, appui long, filtre du backlog, total de la sélection')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0))
    pg.evaluate("()=>{for(let i=1;i<=4;i++)S.tasks.push(mk({id:'k'+i,title:'Clavier '+i,day:today(),est:15,order:i}));for(let i=1;i<=8;i++)S.tasks.push(mk({id:'f'+i,title:(i===3?'Garage ':'Truc ')+i,day:null,order:i}));save();render()}"); tick(pg, 150)
    order = lambda: pg.evaluate("[...document.querySelectorAll('#main .list > .card[data-id]')].map(c=>c.dataset.id)")
    pg.evaluate("()=>{kbSel='k1';kbShow()}")
    pg.keyboard.press('Shift+ArrowDown'); pg.keyboard.press('Shift+ArrowDown'); tick(pg, 100)
    assert 'k1' in st(pg, "[...msel]") and st(pg, "msel.size") == 3, st(pg, "[...msel]")
    assert '3 sélectionnées ·' in pg.inner_text('#mselbar'), pg.inner_text('#mselbar')
    pg.keyboard.press('Escape'); tick(pg, 50)
    pg.evaluate("()=>{const k=T('k1');k.order=-5;renorm(today());render();kbSel='k1';kbShow()}"); tick(pg, 100); assert order().index('k1') == 0, order()
    pg.keyboard.press('Alt+ArrowDown'); tick(pg, 150)
    o0 = None
    o = order(); assert o.index('k1') == 1, o
    pg.keyboard.press('Control+z'); tick(pg, 150)
    o = order(); assert o.index('k1') == 0, o
    pg.keyboard.press('Control+a'); tick(pg, 100)
    assert st(pg, "msel.size") >= 4
    pg.keyboard.press('Escape'); tick(pg, 50)
    pg.click('#main .card[data-id="k4"] .ctitle', modifiers=['Control']); pg.keyboard.press('Delete'); tick(pg, 150)
    assert st(pg, "T('k4')") is None
    pg.keyboard.press('Control+z'); tick(pg, 150)
    assert st(pg, "T('k4').title") == 'Clavier 4'
    # appui long (toucher)
    pg.evaluate("()=>{const c=document.querySelector('#main .card[data-id=\"k2\"] .ctitle'),r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',clientX:r.left+5,clientY:r.top+5}))}")
    tick(pg, 650)
    pg.evaluate("()=>document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}))")
    assert st(pg, "[...msel]") == ['k2'] and st(pg, "lpMode")
    pg.wait_for_timeout(950); pg.click('#main .card[data-id="k3"] .ctitle'); tick(pg, 100)
    assert set(st(pg, "[...msel]")) == {'k2', 'k3'} and pg.locator('#modal:not(.hidden)').count() == 0
    pg.click('#mselbar .mselx'); tick(pg, 100); assert not st(pg, "lpMode")
    # filtre du backlog
    pg.evaluate("()=>go('backlog')"); tick(pg, 150)
    pg.fill('[data-blf]', 'garage'); tick(pg, 100)
    vis = pg.evaluate("[...document.querySelectorAll('#main .card[data-id^=\"f\"]')].filter(c=>c.offsetParent).map(c=>c.dataset.id)")
    assert vis == ['f3'], vis
    assert not errs, errs; ctx.close()

@test('v1.7 : indisponibilités récurrentes (réglages, agenda, planification, annuler)')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0))
    pg.evaluate("()=>go('settings')"); tick(pg, 150)
    pg.click('[data-act="uaadd"]'); tick(pg, 150)
    pg.fill('.uarow [data-ua="label"]', 'Cours de piano'); pg.dispatch_event('.uarow [data-ua="label"]', 'change')
    pg.fill('.uarow [data-ua="s"]', '10:00'); pg.dispatch_event('.uarow [data-ua="s"]', 'change'); tick(pg, 100)
    pg.fill('.uarow [data-ua="e"]', '12:00'); pg.dispatch_event('.uarow [data-ua="e"]', 'change'); tick(pg, 100)
    wd = st(pg, "String(new Date().getDay())")
    days = st(pg, "S.unavail[0].days")
    if wd not in days:
        pg.click(f'.uarow .uadays [data-v="{wd}"]'); tick(pg, 100)
    u = st(pg, "S.unavail[0]"); assert u['label'] == 'Cours de piano' and u['s'] == '10:00' and u['e'] == '12:00' and wd in u['days'], u
    # agenda + planification
    pg.evaluate("()=>{S.tasks.filter(t=>t.day===today()).forEach(t=>t.day=null);S.tasks.push(mk({id:'u1',title:'Avant',day:today(),est:60,order:1}),mk({id:'u2',title:'Après',day:today(),est:60,order:2}));save();go('today');sideTab='cal';render()}"); tick(pg, 300)
    assert pg.locator('#side .ev.ua:has-text("Cours de piano")').count() == 1
    b2 = st(pg, "T('u2').block"); assert b2, 'u2 sans créneau'
    s2 = st(pg, "new Date(T('u2').block.start).getHours()")
    assert s2 >= 12 or st(pg, "new Date(T('u2').block.end).getHours()") <= 10, (st(pg, "T('u1').block"), b2)
    # pas de chevauchement avec 10 h-12 h pour aucune tâche
    ov = st(pg, "S.tasks.filter(t=>t.block&&t.day===today()).filter(t=>{const a=new Date(t.block.start).getHours()+new Date(t.block.start).getMinutes()/60,b=new Date(t.block.end).getHours()+new Date(t.block.end).getMinutes()/60;return a<12&&b>10}).map(t=>t.title)")
    assert ov == [], ov
    # suppression annulable
    pg.evaluate("()=>go('settings')"); tick(pg, 150)
    pg.click('[data-act="uadel"]'); tick(pg, 150); assert st(pg, "S.unavail.length") == 0
    pg.click('#toast .tact'); tick(pg, 150); assert st(pg, "S.unavail.length") == 1
    assert not errs, errs; ctx.close()

@test('v1.7 : sous-tâches dépliables, thème clair forcé sur appareil sombre, pas de section Projets dans les réglages')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0), scheme='dark')
    pg.evaluate("()=>{S.tasks.push(mk({id:'sp',title:'Avec sous-tâches',day:today(),order:-1,subtasks:[{id:'x1',t:'Première',d:false},{id:'x2',t:'Deuxième',d:false}]}));save();render()}"); tick(pg, 150)
    tg = '#main .card[data-id="sp"] .subtog'
    assert '0/2 sous-tâches' in pg.inner_text(tg) and pg.locator('#main .card[data-id="sp"] .csub').count() == 0
    pg.click(tg); tick(pg, 100)
    assert pg.locator('#main .card[data-id="sp"] .csub').count() == 2 and pg.locator('#modal:not(.hidden)').count() == 0
    pg.click('#main .card[data-id="sp"] .csub [data-s="x1"]'); tick(pg, 100)
    assert st(pg, "T('sp').subtasks[0].d") and '1/2' in pg.inner_text(tg)
    pg.keyboard.press('Control+z'); tick(pg, 100); assert not st(pg, "T('sp').subtasks[0].d")
    pg.click(tg); tick(pg, 100); assert pg.locator('#main .card[data-id="sp"] .csub').count() == 0
    # thème clair sur appareil sombre
    pg.evaluate("()=>go('settings')"); tick(pg, 150)
    assert 'Projets' not in pg.evaluate("[...document.querySelectorAll('#main section h2')].map(h=>h.textContent).join('|')")
    pg.select_option('[data-set="mode"]', 'light'); tick(pg, 200)
    bg = pg.evaluate("getComputedStyle(document.body).backgroundColor"); assert bg == 'rgb(230, 230, 227)', bg
    assert pg.evaluate("document.documentElement.style.colorScheme") == 'light'
    pg.select_option('[data-set="mode"]', 'auto'); tick(pg, 200)
    assert pg.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(16, 16, 18)'
    assert not errs, errs; ctx.close()

@test('v1.7 : croix du menu clic droit, appui long à la souris')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0))
    pg.evaluate("()=>{S.tasks.push(mk({id:'q1',title:'Un',day:today(),order:-2}),mk({id:'q2',title:'Deux',day:today(),order:-1}));save();render()}"); tick(pg, 150)
    pg.click('#main .card[data-id="q1"] .ctitle', button='right'); tick(pg, 150)
    assert pg.locator('#modal:not(.hidden) .sheetx').count() == 1
    pg.click('#modal .sheetx'); tick(pg, 150); assert pg.locator('#modal:not(.hidden)').count() == 0
    bb = pg.locator('#main .card[data-id="q1"] .ctitle').bounding_box()
    pg.mouse.move(bb['x'] + 8, bb['y'] + 5); pg.mouse.down(); pg.wait_for_timeout(650); pg.mouse.up(); tick(pg, 150)
    assert st(pg, "[...msel]") == ['q1'] and pg.locator('#modal:not(.hidden)').count() == 0
    pg.wait_for_timeout(950); pg.click('#main .card[data-id="q2"] .ctitle'); tick(pg, 100)
    assert set(st(pg, "[...msel]")) == {'q1', 'q2'}
    pg.keyboard.press('Escape'); tick(pg, 50)
    # un simple clic ouvre toujours la tâche
    pg.click('#main .card[data-id="q2"] .ctitle'); tick(pg, 150)
    assert pg.locator('#modal:not(.hidden)').count() == 1
    assert not errs, errs; ctx.close()

@test('v1.7 : déposer dans un interstice range quand même (seule ou à plusieurs), accent Or par défaut')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0))
    assert pg.evaluate("document.documentElement.dataset.accent") == 'or'
    pg.evaluate("()=>{S.tasks.filter(t=>t.day===today()).forEach(t=>t.day=null);for(let i=1;i<=5;i++)S.tasks.push(mk({id:'g'+i,title:'G'+i,day:today(),est:10,order:i}));save();render()}"); tick(pg, 150)
    order = lambda: pg.evaluate("[...document.querySelectorAll('#main .list > .card[data-id]')].map(c=>c.dataset.id)")
    gap = """([src,a])=>{const s=document.querySelector('#main .card[data-id="'+src+'"]'),c=document.querySelector('#main .card[data-id="'+a+'"]'),z=c.closest('[data-drop]'),r=c.getBoundingClientRect(),y=r.bottom+3,x=r.left+40;const dt=new DataTransfer();s.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));z.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:x,clientY:y}));z.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:x,clientY:y}));s.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt}))}"""
    pg.evaluate(gap, ['g1', 'g3']); tick(pg, 200)
    o = order(); assert o.index('g1') == o.index('g3') + 1, o
    pg.click('#main .card[data-id="g4"] .ctitle', modifiers=['Control']); pg.click('#main .card[data-id="g5"] .ctitle', modifiers=['Control'])
    pg.evaluate(gap, ['g4', 'g2']); tick(pg, 200)
    o = order(); i = o.index('g2'); assert o[i + 1:i + 3] == ['g4', 'g5'], o
    assert not errs, errs; ctx.close()

@test('v1.8 : site rassurant (noindex sauf la page À propos, pas de champ mot de passe, clé masquée derrière un bouton)')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0))
    assert pg.locator('meta[name="robots"][content*="noindex"]').count() == 1
    pg.evaluate("()=>go('settings')"); tick(pg, 150)
    assert pg.locator('input[type="password"]').count() == 0, 'champ mot de passe présent'
    assert pg.locator('[data-set="aiKey"]').count() == 0, 'champ de clé affiché d’office'
    assert pg.locator('#main a[href="about.html"]').count() == 1
    pg.click('[data-act="aikey"]'); tick(pg, 100)
    k = pg.locator('[data-set="aiKey"]'); assert k.count() == 1 and k.get_attribute('type') == 'text' and k.input_value() == ''
    k.fill('sk-ant-demo'); k.dispatch_event('change'); tick(pg, 150)
    assert st(pg, "S.settings.aiKey") == 'sk-ant-demo' and pg.locator('[data-set="aiKey"]').count() == 0
    # vide = garder l’ancienne clé
    pg.click('[data-act="aikey"]'); tick(pg, 100); pg.dispatch_event('[data-set="aiKey"]', 'change'); tick(pg, 100)
    assert st(pg, "S.settings.aiKey") == 'sk-ant-demo'
    p2 = ctx.new_page(); p2.goto(BASE + 'about.html')
    assert 'Diem' in p2.title() and p2.locator('meta[name="robots"][content*="noindex"]').count() == 0 and p2.locator('input').count() == 0
    assert not errs, errs; ctx.close()

@test('v1.8 : glisser au doigt avec la poignée (réordonner, vers le backlog, pas de clic parasite)')
def _(c):
    ctx = c['b'].new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=1)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.abort()); pg.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    pg.clock.install(time=at(9, 0)); pg.goto(BASE); pg.clock.run_for(1500)
    pg.evaluate("()=>{S.tasks.filter(t=>t.day===today()).forEach(t=>t.day=null);for(let i=1;i<=4;i++)S.tasks.push(mk({id:'h'+i,title:'H'+i,day:today(),est:10,order:i}));save();go('today');render()}"); tick(pg, 200)
    assert pg.evaluate("matchMedia('(pointer:coarse)').matches")
    cdp = ctx.new_cdp_session(pg)
    def touch(pts):
        for i, (x, y) in enumerate(pts):
            typ = 'touchStart' if i == 0 else 'touchMove'
            cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y}]}); pg.wait_for_timeout(30)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(50)
    order = lambda: pg.evaluate("[...document.querySelectorAll('#main .card[data-id]')].map(c=>c.dataset.id)")
    g = pg.locator('#main .card[data-id="h1"] .tgrip').bounding_box(); assert g and g['width'] > 10, 'poignée invisible'
    t3 = pg.locator('#main .card[data-id="h3"]').bounding_box()
    sx, sy = g['x'] + g['width'] / 2, g['y'] + g['height'] / 2; ty = t3['y'] + t3['height'] * 0.8
    touch([(sx, sy)] + [(sx + 2, sy + (ty - sy) * k / 8) for k in range(1, 9)])
    tick(pg, 200); o = order(); assert o.index('h1') == o.index('h3') + 1, o
    assert pg.locator('#modal:not(.hidden)').count() == 0, 'la tâche s’est ouverte après le glisser'
    assert pg.locator('.touchghost').count() == 0 and pg.locator('.dragging').count() == 0
    # vers le backlog (barre du bas)
    b = pg.locator('#nav [data-drop="backlog"]').bounding_box(); assert b, 'cible backlog absente'
    g = pg.locator('#main .card[data-id="h2"] .tgrip').bounding_box(); sx, sy = g['x'] + g['width'] / 2, g['y'] + g['height'] / 2
    bx, by = b['x'] + b['width'] / 2, b['y'] + b['height'] / 2
    touch([(sx, sy)] + [(sx + (bx - sx) * k / 8, sy + (by - sy) * k / 8) for k in range(1, 9)])
    tick(pg, 200); assert st(pg, "T('h2').day") is None, st(pg, "T('h2').day")
    assert not errs, errs; ctx.close()

@test('v1.8 : doublon Cuisine / Alimentation saine gardé (aucune proposition de fusion)')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0))
    assert st(pg, "dupCands().length") == 0
    pg.evaluate("()=>{view='tree';render()}"); tick(pg, 200)
    assert pg.locator('[data-act="dupkeep"],[data-act^="dup"]').count() == 0
    assert not errs, errs; ctx.close()

@test('v1.8 : Trier mes mails (faux Gmail, bouton masqué sans accès, tâches proposées par le Génie)')
def _(c):
    seen = {}
    def gmail(route):
        u = route.request.url
        if '/messages?' in u:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'messages': [{'id': 'm1'}, {'id': 'm2'}]}))
        mid = u.split('/messages/')[1].split('?')[0]
        data = {'m1': ('Point Relais <noreply@relais.example>', 'Votre colis vous attend jusqu’au 30/11'), 'm2': ('Alice Exemple <alice@example.com>', 'Tu viens samedi ?')}[mid]
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'id': mid, 'snippet': 'Texte fictif', 'payload': {'headers': [{'name': 'From', 'value': data[0]}, {'name': 'Subject', 'value': data[1]}, {'name': 'Date', 'value': 'Wed, 25 Nov 2026 08:00:00 +0100'}]}}))
    def claude(route):
        seen['body'] = route.request.post_data; return claude_route(route)
    # sans accès Gmail : pas de bouton
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0), storage=TOKEN + "localStorage.setItem('journee.v1',JSON.stringify({settings:{aiKey:'k',aiAuto:false}}))")
    pg.evaluate("()=>{sideTab='ai';renderSide()}"); tick(pg, 100)
    assert pg.locator('#side [data-act="mailsort"]').count() == 0
    pg.evaluate("()=>go('settings')"); tick(pg, 150)
    assert pg.locator('[data-act="mailallow"][data-k="g"]').count() == 1
    ctx.close()
    # avec accès Gmail
    tok = TOKEN.replace("drive.appdata'", "drive.appdata https://www.googleapis.com/auth/gmail.readonly'")
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0), storage=tok + "localStorage.setItem('journee.v1',JSON.stringify({settings:{aiKey:'k',aiAuto:false}}))")
    pg.route('https://gmail.googleapis.com/**', gmail); pg.unroute('https://api.anthropic.com/**'); pg.route('https://api.anthropic.com/**', claude)
    pg.evaluate("()=>{sideTab='ai';renderSide()}"); tick(pg, 100)
    assert pg.locator('#side [data-act="mailsort"]').count() == 1
    n0 = st(pg, "S.tasks.length")
    pg.click('#side [data-act="mailsort"]'); pg.wait_for_timeout(600); tick(pg, 200)
    assert 'Votre colis vous attend' in seen.get('body', '') and 'Tu viens samedi' in seen['body']
    assert 'colis' not in json.dumps(st(pg, "S.chat.map(m=>m.text)")).lower(), 'contenu des mails enregistré'
    pg.click('#side [data-act="aiapply"][data-k="n0"]'); tick(pg, 200)
    assert st(pg, "S.tasks.length") == n0 + 1 and st(pg, "S.tasks.at(-1).title") == 'Tâche proposée'
    # tâche automatique au-delà du seuil
    pg.unroute('https://gmail.googleapis.com/**')
    pg.route('https://gmail.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'id': 'INBOX', 'messagesUnread': 42})))
    pg.evaluate("()=>{S.settings.mailThresh=30;mailWatch()}"); pg.wait_for_timeout(300); tick(pg, 100)
    assert st(pg, "S.tasks.filter(t=>t.auto==='mail'&&t.day===today()).length") == 1
    pg.evaluate("()=>mailWatch()"); pg.wait_for_timeout(300)
    assert st(pg, "S.tasks.filter(t=>t.auto==='mail').length") == 1, 'tâche en double'
    pg.evaluate("()=>go('settings')"); tick(pg, 150)
    assert pg.locator('[data-act="mailstop"][data-k="g"]').count() == 1
    assert not errs, errs; ctx.close()

@test('Rendez-vous Google ajouté comme tâche, à heure fixe')
def _(c):
    g = Google()
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0), google=g, storage=TOKEN)
    pg.evaluate("()=>{sideTab='cal';render()}"); tick(pg, 300)
    eid = st(pg, "Object.values(gEvents).flat().find(e=>e.summary==='Réunion équipe').id")
    sel = f'[data-act="ev2task"][data-eid="{eid}"]'
    assert pg.locator(sel).count() >= 1, 'bouton absent'
    calls0 = len(g.calls)
    pg.locator(sel).first.click(); tick(pg, 300)
    t = st(pg, "S.tasks.find(t=>t.evId)")
    assert t and t['title'] == 'Réunion équipe' and t['est'] == 60 and t['pinned'], t
    assert t['block']['start'][11:13] != '' and t['day'] == st(pg, "today()")
    # le rendez-vous laisse la place à la tâche (pas affiché deux fois), et Google n'est pas modifié
    assert pg.locator(sel).count() == 0, 'rendez-vous encore affiché'
    assert not [x for x in g.calls[calls0:] if x[0] in ('POST', 'PATCH', 'DELETE') and '/calendar/' in x[1]], g.calls[calls0:]
    # les autres tâches ne passent pas dessus, et la tâche ne bouge pas
    s0 = t['block']['start']
    for i in range(4): add(pg, f'Tâche {i} 45m')
    pg.evaluate("()=>{const {today}=window.journee.fn;autoBox(today());cascade(today());pushOverlaps(today())}"); tick(pg, 200)
    assert st(pg, "S.tasks.find(t=>t.evId).block.start") == s0, 'la tâche-rendez-vous a bougé'
    over = st(pg, """(()=>{const r=S.tasks.find(t=>t.evId).block,a=+new Date(r.start),b=+new Date(r.end);return S.tasks.filter(t=>!t.evId&&t.block&&!t.done).filter(t=>+new Date(t.block.start)<b&&+new Date(t.block.end)>a).map(t=>t.title)})()""")
    assert not over, over
    # annuler : le rendez-vous revient
    pg.evaluate("()=>undoPop()"); tick(pg, 200)
    pg.evaluate("()=>{undoPop();undoPop();undoPop();undoPop()}"); tick(pg, 200)
    assert st(pg, "S.tasks.filter(t=>t.evId).length") == 0
    assert pg.locator(sel).count() >= 1
    # un rendez-vous passé non coché est compté comme fait (il ne revient pas le lendemain)
    pg.evaluate(f"()=>{{const t=evToTask('{eid}');t.day=window.journee.fn.addDays(t.day,-1);rollOver()}}")
    assert st(pg, "S.tasks.find(t=>t.evId).done") is True
    assert not errs, errs; ctx.close()

@test('Réglages synchronisés un par un : changer l’accent sur un appareil n’est pas écrasé par un autre réglage ailleurs')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(9, 0))
    r = pg.evaluate("""()=>{const L={settings:{accent:'sauge',mode:'auto'},su:{'set.accent':200,settings:200}};const R={settings:{accent:'or',mode:'dark'},su:{'set.mode':300,settings:300}};const o=mergeState(L,R);return o.settings}""")
    assert r['accent'] == 'sauge' and r['mode'] == 'dark', r
    pg.evaluate("()=>go('settings')"); tick(pg, 150)
    pg.click('.swatch[data-v="lavande"]'); tick(pg, 150)
    assert st(pg, "S.settings.accent") == 'lavande' and st(pg, "S.su['set.accent']") > 0
    assert pg.evaluate("document.documentElement.dataset.accent") == 'lavande'
    assert not errs, errs; ctx.close()

def main():
    srv = serve()
    only = os.environ.get('ONLY')
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        for t in TESTS:
            if only and only.lower() not in t.__name__.lower(): continue
            t({'b': b})
        b.close()
    srv.shutdown()
    ok = sum(1 for r in RESULTS if r[1])
    for name, passed, msg in RESULTS:
        print(('✅ ' if passed else '❌ ') + name + ('' if passed else '\n   ' + msg.replace('\n', '\n   ')))
    print(f'\n{ok}/{len(RESULTS)} tests réussis')
    sys.exit(0 if ok == len(RESULTS) else 1)

if __name__ == '__main__':
    main()
