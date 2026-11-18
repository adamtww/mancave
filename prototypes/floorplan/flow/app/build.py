# stitches the new-layout flow onto the current shape editor prototype
import re
src=open('/home/claude/build/shape-proto/index.html').read()
fl=open('/home/claude/build/flow/app/flow.html').read()
css=fl.split('<!--CSS-->')[1].split('<!--HTML-->')[0].strip()
html=fl.split('<!--HTML-->')[1].split('<!--JS-->')[0].strip()
js=fl.split('<!--JS-->')[1].strip()
css=css.replace('<style>','').replace('</style>','')
assert src.count('</style>')>=1 and src.count('</body>')==1
i=src.index('</style>');src=src[:i]+css+'\n'+src[i:]
src=src.replace('</body>',html+'\n'+js+'\n</body>')
src=src.replace('pick the type and width on the left','pick the type and width on the right')
src=re.sub(r'<title>[^<]*','<title>The Cave — new layout flow',src,count=1)
import sys;sys.path.insert(0,'/home/claude/build');from wording import apply;src=apply(src)
open('/home/claude/build/flow/app/index.html','w').write(src)
print('ok',len(src))
