import sys,threading,http.server,functools,socketserver,sys,re
from playwright.sync_api import sync_playwright
D='/tmp/diem-demo'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.TCPServer(('127.0.0.1',0),functools.partial(Q,directory=D));port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
SKIP=re.compile(r'del|rm|logout|gout|mout|reset|wipe|import|export|clear|hardrefresh|gin|min|login|notif|ai|refine|ask|claude|palopen|sunsama|close',re.I)
views=['today','week','dump','backlog','review','projects','tree','settings']
found={}
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,h in ((1440,900),(1000,760),(390,844)):
        for v in views:
            pg=b.new_page(viewport={'width':w,'height':h})
            errs=[];pg.on('pageerror',lambda e,errs=errs:errs.append(str(e)))
            pg.goto(f'http://127.0.0.1:{port}/');pg.wait_for_timeout(1200)
            pg.evaluate("()=>{document.getElementById('demopanel')?.remove();closeModal&&closeModal()}")
            pg.evaluate(f"()=>{{view='{v}';render()}}");pg.wait_for_timeout(200)
            acts=pg.evaluate("[...new Set([...document.querySelectorAll('#main [data-act], #side [data-act]')].filter(e=>e.offsetParent).map(e=>e.dataset.act))]")
            print(w,v,len(acts),flush=True)
            for a in acts:
                if SKIP.search(a):continue
                try:
                    pg.evaluate(f"()=>{{closeModal();view='{v}';render()}}");pg.wait_for_timeout(60)
                    el=pg.locator(f'#main [data-act="{a}"]:visible, #side [data-act="{a}"]:visible').first
                    el.click(timeout=1500);pg.wait_for_timeout(150);pg.keyboard.press('Escape');pg.wait_for_timeout(60)
                except Exception as ex:
                    pass
                for e in errs:found.setdefault(e[:200],set()).add(f'{w}/{v}/{a}')
                errs.clear()
            pg.close()
for k,v in found.items():print('ERR',k,'→',sorted(v)[:6])
print('fin',len(found))
