import re
src=open('/home/claude/build/fork/editor.html').read()
src=src.replace('/*ZONES*/',open('/home/claude/build/fork/zones.js').read(),1)
lib=open('/home/claude/build/fork/polygon-clipping.umd.min.js').read()
src=src.replace('</head>','<script>/* polygon-clipping 0.15.7 · MIT License · github.com/mfogel/polygon-clipping */\n'+lib+'\n</script>\n</head>',1)
def parts(path):
    fl=open(path).read()
    css=fl.split('<!--CSS-->')[1].split('<!--HTML-->')[0].strip().replace('<style>','').replace('</style>','')
    html=fl.split('<!--HTML-->')[1].split('<!--JS-->')[0].strip()
    js=fl.split('<!--JS-->')[1].strip()
    return css,html,js
for path in ['/home/claude/build/flow/app/flow.html','/home/claude/build/fork/extra.html']:
    css,html,js=parts(path)
    i=src.index('</style>');src=src[:i]+css+'\n'+src[i:]
    src=src.replace('</body>',html+'\n'+js+'\n</body>')
src=src.replace('pick the type and width on the left','pick the type and width on the right')
src=re.sub(r'<title>[^<]*','<title>Floor Plan + Rooms',src,count=1)
import sys;sys.path.insert(0,'/home/claude/build');from wording import apply;src=apply(src)
open('/home/claude/build/fork/index.html','w').write(src)
print('ok',len(src))
