# Tour visuel de la démo : toutes les vues, ordinateur / fenêtre moyenne / téléphone
import threading, http.server, functools, sys, socketserver
from playwright.sync_api import sync_playwright
root='/tmp/diem-demo'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory=root));port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{port}/'
views=sys.argv[1].split(',') if len(sys.argv)>1 else ['today','week','backlog','projects','review','settings','tree']
with sync_playwright() as pw:
    b=pw.chromium.launch();errs=[]
    for (w,h) in [(1440,900),(1000,760),(390,844)]:
        pg=b.new_page(viewport={'width':w,'height':h});pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(url);pg.wait_for_timeout(1600);pg.evaluate("closeModal();const d=document.getElementById('demopanel');d&&d.classList.add('min')")
        for v in views:
            pg.evaluate(f"go('{v}')");pg.wait_for_timeout(300)
            ov=pg.evaluate("[document.documentElement.scrollWidth>innerWidth+2, (()=>{const s=document.getElementById('side');const r=s.getBoundingClientRect();return r.top>5&&getComputedStyle(s).position!=='fixed'&&getComputedStyle(s).display!=='none'})()]")
            if any(ov):print('PROBLÈME',w,v,'débordement' if ov[0] else '','agenda déplacé' if ov[1] else '')
            pg.screenshot(path=f'/tmp/r_{w}_{v}.png')
        pg.evaluate("go('today')");pg.wait_for_timeout(200)
        pg.click('#main [data-act="daymenu"]');pg.wait_for_timeout(200);pg.screenshot(path=f'/tmp/r_{w}_menu.png')
    print('erreurs JS :',errs or 'aucune')
srv.shutdown()
