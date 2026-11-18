# user-facing wording: a "layout" is now a "Floor Plan" (the uploaded drawing becomes the "original plan")
R=[("<h1>New layout — building shape</h1>","<h1>New Floor Plan — building shape</h1>"),
(">Create layout<",">Create Floor Plan<"),
("so your layout wasn\\'t changed","so your floor plan wasn\\'t changed"),
("Floor plan removed from this layout","Original plan removed from this floor plan"),
("couldn\\'t be read as a layout","couldn\\'t be read as a floor plan"),
("this would create the layout (","this would create the floor plan ("),
("Building your layout","Building your floor plan"),
("Restored your last layout","Restored your last floor plan"),
('<span id="nf-st">New layout</span>','<span id="nf-st">New Floor Plan</span>'),
("Scales the whole layout so the usable floor matches.","Scales the whole floor plan so the usable floor matches."),
('title="View the attached floor plan">📄 Floor plan<','title="View the original plan you uploaded">📄 Original plan<'),
('<b id="pv-name">Floor plan</b>','<b id="pv-name">Original plan</b>'),
('<title>The Cave — new layout flow','<title>The Cave — new Floor Plan flow')]
R+=[("'<span>Blackout</span>'","'<span>Unusable Space</span>'"),
("grp('Blackout',[bkBtn])","grp('Unusable Space',[bkBtn])"),
("<span>Blacked out</span>","<span>Unusable space</span>"),
("<span>Blackouts</span>","<span>Unusable areas</span>"),
("<h2>Blackout</h2>","<h2>Unusable Space</h2>"),
("a wall, corner or blackout for options","a wall, corner or unusable area for options"),
("?'Interior':'Blackout';","?'Interior':'Unusable space';"),
(">Delete blackout</button>",">Delete unusable area</button>"),
("l:'Delete blackout'","l:'Delete unusable area'"),
("blk:['Blackout','Space you can\\'t use: columns, stairs","blk:['Unusable Space','Space you can\\'t use: columns, stairs"),
("and black out space you can't use.","and mark space you can't use."),
("'+S.blk.length+' blackouts.'","'+S.blk.length+' unusable area'+(S.blk.length===1?'':'s')+'.'"),
("<b>Blackout</b> · ","<b>Unusable space</b> · "),
("toast('Blackout added')","toast('Unusable area added')"),
("box:'Drag to black out a rectangle'","box:'Drag to mark a rectangle as unusable'"),
("Tap a blackout to label or delete it.","Tap an unusable area to label or delete it.")]
def apply(src):
    for a,b in R:
        if a in src: src=src.replace(a,b)
    return src
