"""Builds space-planner.html from this folder: python3 planner/build.py"""
import os
here=os.path.dirname(os.path.abspath(__file__));root=os.path.dirname(here)
r=lambda *f:open(os.path.join(*f),encoding='utf-8').read()
out=r(here,'template.html').replace('/*LIBCSS*/',r(here,'lib.css')).replace('/*CATALOG*/',r(root,'src','catalog.js')).replace('/*ICONS*/',r(root,'src','icons.js')).replace('/*PLANNER*/',r(here,'planner.js').replace('/*EXPLORE*/',r(here,'explore.js')).replace('/*ZONES*/',r(here,'zones.js')))
open(os.path.join(root,'space-planner.html'),'w',encoding='utf-8').write(out)
print('built space-planner.html')
