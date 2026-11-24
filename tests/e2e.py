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
    sel = f'[data-keep="add-{st(pg, "today()") if False else d()}"]'
    pg.fill(sel, text); pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
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
    pg.click('#main .card.done .chk'); tick(pg, 300)
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
    pg.click('#main .est >> nth=0'); pg.click('#pop button >> nth=5'); tick(pg)
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
    pg.click('#nav [data-view="backlog"]'); pg.click('[data-act="tplnew"]')
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
    pg.click('#nav [data-view="backlog"]'); pg.wait_for_timeout(200)
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

@test('Raccourcis : ? affiche la liste, rappel tournant')
def _(c):
    ctx, pg, errs = new_page(c['b'])
    pg.keyboard.press('?'); pg.wait_for_timeout(200)
    assert 'Raccourcis clavier' in pg.inner_text('#sheet')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(1200)
    assert pg.locator('#tip kbd').count() == 1
    assert not errs, errs; ctx.close()

@test('Mise en page : aucune vue ne déborde (ordinateur, téléphone, sombre)')
def _(c):
    for w, h, scheme in [(1440, 900, 'light'), (1100, 800, 'dark'), (390, 844, 'light'), (360, 740, 'dark')]:
        ctx, pg, errs = new_page(c['b'], w, h, scheme=scheme)
        for v in ['today', 'week', 'dump', 'backlog', 'review', 'stats', 'settings']:
            pg.evaluate(f"()=>{{location.hash='{v}'}}"); pg.goto(BASE + '#' + v); pg.wait_for_timeout(350)
            ow = pg.evaluate("()=>{const m=document.querySelector('#main');return [document.documentElement.scrollWidth-innerWidth,[...m.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+2&&!e.closest('.week,.bigcal,.scroll,.wkbars')}).slice(0,3).map(e=>e.className||e.tagName)]}")
            assert ow[0] <= 0 and not ow[1], f'{v} {w}px déborde : {ow}'
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
    assert pg.locator('#sheet .rsteps span:not(.sp)').count() == 2 and 'Stardust' in pg.inner_text('#sheet')
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
    pg.click('#pickov .pkc:text-is("Magic")'); pg.click('#pickov [data-act="pkok"]'); pg.wait_for_timeout(150)
    assert st(pg, "S.tasks[0].channel") == 'c-magic' and not st(pg, f"S.channels.some(c=>c.id==='{nid}')")
    # déplacer une catégorie vers un autre domaine
    pg.click('.tvtabs [data-id=""]'); pg.wait_for_timeout(100)
    pg.evaluate("()=>{document.querySelectorAll('details.tdom').forEach(d=>d.open=true)}")
    pg.click('.tnode[data-node="c-lego"] [data-act="nodemenu"]'); pg.click('#modal [data-act="nodemove"]'); pg.wait_for_selector('#pickov')
    pg.click('#pickov .pkdh:has-text("Création")'); pg.wait_for_timeout(150)
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

@test('Journée sans pression : heures au rituel du matin, glissement silencieux, reports')
def _(c):
    ctx, pg, errs = new_page(c['b'], clock=at(16, 0))
    assert 'retard' not in pg.inner_text('#main')
    pg.click('[data-act="plan"] >> nth=0'); tick(pg, 200)
    assert pg.locator('#sheet .quote blockquote').count() == 1, 'citation du matin absente'
    pg.fill('[data-rh="e"]', '17:30'); pg.click('[data-act="ritnext"]'); tick(pg, 400)
    assert st(pg, "S.days[today()].he") == 17.5
    assert st(pg, "dayTasks(today()).length") == 3, 'rien ne doit glisser pendant le rituel'
    pg.keyboard.press('Escape'); pg.evaluate("()=>{const S=window.journee.state;S.days[window.journee.fn.today()].planned=true;window.journee.save()}"); tick(pg, 400)
    assert st(pg, "dayTasks(addDays(today(),1)).length") == 1
    tick(pg, 100)
    assert 'à demain' in pg.inner_text('.slidnote')
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
        assert pg.locator('#sheet .rsteps span').nth(0).get_attribute('class') == 'on', ty
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
