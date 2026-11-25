# usage: shots.py view1,view2 [dark]
import threading,http.server,functools,socketserver,sys
from playwright.sync_api import sync_playwright
D=(sys.argv[3] if len(sys.argv)>3 else '/tmp/diem-demo')
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.TCPServer(('127.0.0.1',0),functools.partial(Q,directory=D));port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
views=sys.argv[1].split(',');themes=sys.argv[2].split(',') if len(sys.argv)>2 else ['light','dark']
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for th in themes:
        for w,h in ((1440,900),(1000,760),(390,844)):
            pg=b.new_page(viewport={'width':w,'height':h},color_scheme=th);pg.on('pageerror',lambda e:errs.append(str(e)))
            pg.goto(f'http://127.0.0.1:{port}/');pg.wait_for_timeout(1300)
            pg.evaluate(f"()=>{{document.getElementById('demopanel')?.remove();closeModal();document.documentElement.dataset.theme='{th}';const t=document.getElementById('toast');t&&t.classList.remove('show')}}")
            for v in views:
                pg.evaluate(f"()=>{{view='{v}';render()}}");pg.wait_for_timeout(1500 if v=="tree" else 250)
                pg.screenshot(path=f'/tmp/s_{th}_{w}_{v}.png')
            pg.close()
print('erreurs:',errs or 'aucune')
