# Construit la démo (données fictives) dans /tmp/diem-demo à partir du dépôt.
# Usage : python3 dev/tools/build_demo.py   (depuis la racine du dépôt)
import re,shutil,os,sys
R=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'));D=sys.argv[1] if len(sys.argv)>1 else '/tmp/diem-demo'
shutil.rmtree(D,ignore_errors=True);os.makedirs(D)
for x in ('js','css'):shutil.copytree(f'{R}/{x}',f'{D}/{x}')
for f in os.listdir(f'{R}/dev/demo'):shutil.copy(f'{R}/dev/demo/{f}',f'{D}/{f}')
s=open(f'{R}/index.html').read()
s=re.sub(r'<link rel="manifest"[^>]*>','',s)
s=s.replace('<script src="js/core.js','<script src="demo-data.js"></script>\n<script src="js/core.js',1)
s=s.replace('</body>','<script src="demo-events.js"></script>\n<script src="demo-panel.js"></script>\n</body>',1)
open(f'{D}/index.html','w').write(s)
m=open(f'{D}/js/main.js').read()
m=m.replace("if('serviceWorker' in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').catch(()=>{})}",'')
m=m.replace("&&h0>=4&&h0<S.settings.workEnd&&!savedRit()","&&!savedRit()").replace("$('#modal').classList.contains('hidden')&&!navigator.webdriver)","$('#modal').classList.contains('hidden'))")
open(f'{D}/js/main.js','w').write(m);print('démo construite dans',D)
