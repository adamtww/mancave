"""Builds index.html from the source files in this folder: python3 src/build.py"""
import os
here=os.path.dirname(os.path.abspath(__file__));root=os.path.dirname(here)
r=lambda f:open(os.path.join(here,f),encoding='utf-8').read()
out=r('template.html').replace('/*ICONS*/',r('icons.js')).replace('/*CATALOG*/',r('catalog.js')).replace('/*PLAN*/','{"stamp":0}')
head='<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png"><meta name="apple-mobile-web-app-title" content="The Cave"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="mobile-web-app-capable" content="yes"><meta name="theme-color" content="#fbfaf7">'
out=out.replace('<meta name="apple-mobile-web-app-capable" content="yes">','<meta name="apple-mobile-web-app-capable" content="yes">'+head,1)
open(os.path.join(root,'index.html'),'w',encoding='utf-8').write(out)
print('built index.html')
