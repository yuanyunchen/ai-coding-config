/* Full network (concept graph, third mode; T02.05.06.03/S02, items 35-38 and 47 of T02.05.06/S04): every node of
   data/graph_v2/graph.json on one canvas, in the data's own 16 sub-layers, each sub-layer a grid of small marks (blocks by family,
   kind of page or resolution). Links bundled between blocks at the overview, resolved into single links as one zooms in. Three zoom
   levels (far: blocks, captions, bundles; mid: hubs and strong nodes named; near: every node in view named with its effect), a
   minimap, search that flies to a node and lights its closure, hover card with examples, click for the node panel.
   Standalone: window.DualModes.fullnet = {mount(el, ctx), unmount()}. ctx (only G is required):
     G          the loaded graph.json
     base       folder of graph.json (default 'data/graph_v2/'), for the thumbnails of pages_own
     audit      data/pilot/cluster_audit.json (its items are used; loaded here when absent)
     task, kind, model   the page's filters (strings or null; model true = Gemini 3.7 Flash colouring of looks and regions)
     netIds     ids the Network view draws (ringed); default G.networks.all.nodes
     node       id to fly to on mount ("show in Full network")
     row        element that receives this mode's controls (search, Filters, Task, Kind, Model); default: a row on top of el
     controls   false when the host draws Task, Kind and Model itself
     openPanel(id)        the page's node panel; default: the module's own panel
     openViewer(list, i)  the page's image viewer; default window.LB.open
     onFilter({task, kind, model})  told when the filters change here
     onDetails(id)        "Show in Details" in the module's own panel
   Uses the shared panzoom.js (required), hovercard.js, picker.js and lightbox.js when present. */
(()=>{
'use strict';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const THEME={
  dark:{pos:[56,217,112],neg:[255,78,92],neu:[58,64,84],ink:'#e9eefb',sub:'#9aa7c9',accent:'#8fc6ff',edge:[110,124,160],plate:'rgba(6,9,19,.84)',ring:'#e9eefb',box:'rgba(148,178,255,.3)'},
  light:{pos:[38,150,84],neg:[214,62,58],neu:[204,201,193],ink:'#1d1b17',sub:'#57534a',accent:'#1f5fbf',edge:[120,124,140],plate:'rgba(236,234,228,.9)',ring:'#1d1b17',box:'rgba(60,50,30,.28)'}};
const STEPF={3:1,2:.78,1:.55,0:.4};   // four steps of evidence per sign: strong, clear, leaning, F alone
const KSHORT={marketing_landing:'marketing',storefront:'shop',dashboard_admin:'dashboard',tool_utility:'tool',document_text:'document',auth_form:'login form',game_scene:'game',greeting_event:'greeting',mobile_mockup:'mobile mock-up',other:'other kind',none:'no kind'};
const LTN={composed_of:'composed of',modifies:'modifies (votes)',modifies_F:'modifies (F)',modifies_x:'two-value interaction',conditioned_on:'conditioned on',realised_in:'realised in',substitutes:'substitutes',co_occurs:'co-occurs',excludes:'excludes'};
const DEFLINKS=['composed_of','realised_in','modifies'];
const DP=11, DPX=30, DGAP=44, CAPB=16;   // world units: row pitch, column pitch, gap between sub-layers, block caption height
const FAR=22, NEAR=110;                // screen px of one column: below FAR = far, from NEAR = near (every name)
const ppv=v=>v==null?'n/a':(v>0?'+':v<0?'−':'')+Math.abs(v*100).toFixed(1);
const pc=v=>v==null?'–':(v*100<1&&v>0?(v*100).toFixed(2):(v*100).toFixed(1))+' %';
let M=null;   // the mounted instance

function mount(el,ctx){ if(M) unmount(); M=make(el,ctx||{}); return M.api; }
function unmount(){ if(!M) return; M.destroy(); M=null; }

function make(el,ctx){
  const G=ctx.G, base=ctx.base||'data/graph_v2/', NN=G.N, PAGES=G.pages, OWN=new Set(G.pages_own||[]);
  const PIX=new Map(PAGES.map((p,i)=>[p,i]));
  const thumb=i=>(OWN.has(i)?base+'thumbs/':'data/pilot/thumbs/')+PAGES[i]+'.webp';
  const thumbU=u=>PIX.has(u)?thumb(PIX.get(u)):'data/pilot/thumbs/'+u+'.webp';
  let AUD=(ctx.audit&&(ctx.audit.items||ctx.audit))||null;
  if(!AUD) fetch('data/pilot/cluster_audit.json').then(r=>r.ok?r.json():{}).then(a=>{ AUD=a.items||a; }).catch(()=>{ AUD={}; });
  const byId={}; G.nodes.forEach(n=>byId[n.id]=n);
  const LINKS=G.links, inc={}, out={};
  LINKS.forEach((l,i)=>{ l._i=i; (out[l.s]=out[l.s]||[]).push(l); (inc[l.t]=inc[l.t]||[]).push(l); });
  const STEP={}; LINKS.forEach(l=>{ if((l.type==='modifies'||l.type==='modifies_F')&&l.vote_ok&&l.iv&&(l.iv[1]>0||l.iv[2]<0)) STEP[l.s+'|'+l.t]=l.iv[0]>0?1:-1; });
  const lstr=l=>{ const c=l.c||{}; if(l.type==='realised_in') return c.n&&c.n[1]?Math.min(1,c.n[2]/c.n[1]):.2; return c.lift?Math.log10(Math.max(1,c.lift)):0; };
  const DEG={}; LINKS.forEach(l=>{ if(l.type==='composed_of'||l.type==='realised_in'){ DEG[l.s]=(DEG[l.s]||0)+1; DEG[l.t]=(DEG[l.t]||0)+1; } });
  const NET=new Set(ctx.netIds||(G.networks&&G.networks.all?G.networks.all.nodes:[]));
  // a region no rule lands in is not described by the vocabulary (the same rule as the build's res_uncovered)
  const UNDESC=new Set(G.nodes.filter(n=>n.lv===5&&!(inc[n.id]||[]).some(l=>l.type==='realised_in'&&byId[l.s]&&byId[l.s].t==='rule')).map(n=>n.id));
  const kindOf=n=>{ const k=n.kc||[]; let b=-1, v=0; k.forEach((x,i)=>{ if(x>v){ v=x; b=i; } }); return b<0?'any kind':(KSHORT[G.kinds[b]]||G.kinds[b]); };
  const FAMS={'content and components':'content','density and whitespace':'density','craft scales':'craft','render state':'render'};   // short block captions
  const RES={cat:['Coarse areas',12],knn:['Mid areas',13],leaf:['Leaf clusters',14]};
  /* the sub-layer and block of a node: [order, sub-layer, block] */
  function subOf(n){
    if(n.lv===0) return [0,'Context',n.t==='task'?'tasks':'kinds'];
    if(n.lv===1) return n.t==='band'?[3,'Scale bands',FAMS[n.fam]||n.fam]:[2,'Values',FAMS[n.fam]||n.fam];
    if(n.lv===2) return n.t==='interaction'?[5,'Two-value interactions',n.fam==='loop interaction node'?'from the loop':'from the report']:[4,'Rules of 1–2 literals',''];
    if(n.lv===3) return n.t==='sub'?[9,'Sub-profiles','']:[3+Math.min(5,Math.max(3,n.nlit||3)),`Rules of ${Math.min(5,Math.max(3,n.nlit||3))} literals`,''];
    if(n.lv===4) return n.t==='problem'?[11,'Problems','']:[10,'Looks by kind of page',kindOf(n)];
    const p=n.id.split('_')[0], R=RES[p]||RES.leaf;
    return UNDESC.has(n.id)?[15,'Not described by vocabulary',R[0].toLowerCase()]:[R[1],R[0],''];
  }
  const SUPER=[[0,1,'Context'],[2,3,'Primitives'],[4,9,'Rules and sub-profiles'],[10,11,'Looks'],[12,15,'Regions of the continuous space']];
  const share=n=>(n.n_all||n.n||0)/(n.dpop==='all'?G.pop_N:NN);
  const Q={}; [0,1,2,3,4,5].forEach(L=>{ const v=G.nodes.filter(n=>n.lv===L).map(share).sort((a,b)=>a-b); Q[L]=[v[Math.floor(v.length/3)],v[Math.floor(2*v.length/3)]]; });
  G.nodes.forEach(n=>{ const sh=share(n), t=sh<=Q[n.lv][0]?0:sh<=Q[n.lv][1]?1:2; n._r=1.9+1.5*t+(n.lv===5?.5:0); n._sz=t;   // regions and clusters at the end a little larger, so the last layer stands out
    n._shape=n.lv===0||n.lv===5?'sq':n.lv===2||n.lv===3&&n.t!=='sub'?'di':'ci'; });
  const S={task:ctx.task||null,kind:ctx.kind||null,model:!!ctx.model,fail:false,fam:'',links:new Set(DEFLINKS),sel:null,hov:null,fly:null};
  const TH=()=>THEME[document.documentElement.dataset.theme==='light'?'light':'dark'];
  const mix=(rgb,f)=>{ const t=TH(); return rgb.map((v,i)=>Math.round(t.neu[i]+(v-t.neu[i])*f)); };
  const tierOf=a=>!a||a[1]==null?0:(a[1]>0||a[2]<0)?2:Math.abs(a[0])>1.2816*(a[2]-a[1])/3.92?1:0;
  function dot(n){ const t=TH(); let e=n.vote, k=n.cl!=null?n.cl:(n.vt||0);
    if(S.model&&(n.lv===4||n.lv===5)){ const m=n.md; if(!m||m.model_pref==null) return [t.neu,.35]; e=[m.model_pref,m.model_lo,m.model_hi]; const q=tierOf(e); k=q===2&&Math.abs(e[0])/((e[2]-e[1])/3.92)>=3?3:q; }
    if(!e||e[0]==null||!k){ if(n.fe) return [mix(n.fe>0?t.pos:t.neg,STEPF[0]),.85]; return [t.neu,.8]; }
    return [mix(e[0]>0?t.pos:t.neg,STEPF[k]),k>=2?.95:.85]; }
  const TI=x=>G.tasks.indexOf(x), KI=x=>G.kinds.indexOf(x);
  const filtOk=n=>(!S.task||n.lv===0&&n.id==='task='+S.task||n.lv>0&&(n.tcl||[])[TI(S.task)]>0||n.lv===0&&n.t==='kind')&&(!S.kind||n.lv===0&&n.id==='kind='+S.kind||n.lv>0&&(n.kc||[])[KI(S.kind)]>0||n.lv===0&&n.t==='task');
  const famOk=n=>!S.fam||n.lv!==1||n.fam===S.fam;

  /* ── DOM ── */
  el.classList.add('fn-host'); el.innerHTML='';
  const row=document.createElement('div'); row.className='fn-row'; (ctx.row||el).append(row);
  const frame=document.createElement('div'); frame.className='fn-frame'; el.append(frame);
  const cv=document.createElement('canvas'); cv.className='fn-cv'; cv.tabIndex=0; cv.setAttribute('aria-label','Full network of the concept graph: drag to pan, wheel to zoom'); frame.append(cv);
  const mini=document.createElement('canvas'); mini.className='fn-mini'; mini.setAttribute('aria-label','Minimap: click to move the view'); frame.append(mini);
  const lvl=document.createElement('div'); lvl.className='fn-lvl'; lvl.setAttribute('role','group'); lvl.setAttribute('aria-label','Zoom level');
  lvl.innerHTML='<button type="button" data-z="0">Whole</button><button type="button" data-z="1">Hubs</button><button type="button" data-z="2">Names</button>'; frame.append(lvl);
  const key=document.createElement('div'); key.className='fn-key'; frame.append(key);
  const panel=document.createElement('aside'); panel.className='fn-panel'; panel.hidden=true; frame.append(panel);
  const BOT=()=>{ const r=key.getBoundingClientRect(), f=frame.getBoundingClientRect(); return r.height?r.top-f.top-4:H-20; };   // labels end above the key line
  const ctx2=cv.getContext('2d'), mctx=mini.getContext('2d');
  const hc=window.HoverCard?HoverCard.attach(cv,{width:476}):null; if(hc) hc.el.classList.add('fn-card');
  let DRAWNL=[], F=1, W=0, H=0, dpr=1, k0=1, o=[0,0], BOX=null, GRID=null, BUND=[], SHOWN=[], LIT=null, LABELS=[], lastLab=null, raf=0, live=false, labFade=1, labT0=0;
  const pz=PanZoom.attach(cv,{min:.6,max:30,onChange:(v,g)=>{ live=!!g; draw(); if(!g&&ctx.onView) ctx.onView(getView()); },isNode:e=>!!pick(e)});
  const K=()=>k0*pz.get().z;
  const T=()=>{ const v=pz.get(); return [W/2+(o[0]-W/2)*v.z+v.x, H/2+(o[1]-H/2)*v.z+v.y]; };
  const toS=(x,y)=>{ const k=K(), t=T(); return [x*k+t[0],y*k+t[1]]; };
  const toW=(sx,sy)=>{ const k=K(), t=T(); return [(sx-t[0])/k,(sy-t[1])/k]; };
  const level=()=>{ const z=pz.get().z, p=DPX*K(); return z<1.5&&p<NEAR?0:p<NEAR?1:2; };
  const R=(n,k)=>Math.min(n._r,(3.2+1.9*n._sz)/k);   // world radius; on screen at most 3.2 / 5.1 / 7 px, so marks stay marks up close
  // a short name for labels: a rule's literals without the context ones (in <task>, kind: <kind>), which its column already implies
  const lname=n=>{ if(n.sn) return n.sn; const nm=n.name; if(n.t!=='rule'||!nm.includes(' + ')) return nm.replace(/^kind: /,'').replace(/^in /,''); const p=nm.split(' + '), q=p.filter(x=>!/^(in |kind: )/.test(x)); return (q.length?q:p).join(' + '); };

  /* ── layout: sub-layers left to right, every sub-layer starts on one top line; the height is chosen so the whole has the frame's
     proportions; a sub-layer wraps into as many columns as that height needs ── */
  function layout(){
    SHOWN=G.nodes.filter(n=>S.fail||!n.fail); const groups=new Map();
    SHOWN.forEach(n=>{ const [ord,name,blk]=subOf(n); n._L=ord; if(!groups.has(ord)) groups.set(ord,{ord,name,blocks:new Map()}); const g=groups.get(ord); if(!g.blocks.has(blk)) g.blocks.set(blk,[]); g.blocks.get(blk).push(n); });
    const GS=[...groups.values()].sort((a,b)=>a.ord-b.ord);
    GS.forEach(g=>{ g.bl=[...g.blocks.entries()].sort((a,b)=>g.ord===0?b[0].localeCompare(a[0]):b[1].length-a[1].length||a[0].localeCompare(b[0])); g.capt=g.bl.length>1?CAPB:0;
      g.bl.forEach(([,ns])=>ns.sort((a,b)=>((b.vote||[])[0]??-9)-((a.vote||[])[0]??-9)||a.id.localeCompare(b.id))); });
    const colsFor=(g,h)=>{ let c=g.bl.length>1?3:1;   // a sub-layer with blocks keeps three columns, so its block captions have room
      for(;c<400;c++){ if(g.bl.reduce((s,[,ns])=>s+Math.ceil(ns.length/c)*DP+g.capt,0)<=h) break; } return c; };
    const A=Math.max(1.1,(W-40)/Math.max(200,H-142));
    const widthAt=h=>GS.reduce((s,g)=>s+colsFor(g,h)*DPX+DGAP,-DGAP);
    let lo=150, hi=4000; for(let i=0;i<26;i++){ const m=(lo+hi)/2; widthAt(m)/m>A?lo=m:hi=m; } const DH=Math.ceil(hi);
    BOX={layers:[],blocks:[],h:DH,w:0}; let x=0;
    GS.forEach(g=>{ const cols=colsFor(g,DH); let y=0; const L={ord:g.ord,name:g.name,x,w:cols*DPX-DPX+DP,n:0,blocks:[],y:0};
      g.bl.forEach(([blk,ns])=>{ const rows=Math.ceil(ns.length/cols); y+=g.capt; const B={name:blk,L,x,y,w:Math.min(cols,ns.length)*DPX-DPX+DP,h:rows*DP,ns,cap:g.capt,i:BOX.blocks.length};
        ns.forEach((n,i)=>{ n.x=x+(i%cols)*DPX+DP/2; n.y=y+Math.floor(i/cols)*DP+DP/2; n._b=B.i; });
        y+=rows*DP; L.n+=ns.length; L.blocks.push(B); BOX.blocks.push(B); });
      L.h=y; L.cols=cols; BOX.layers.push(L); x+=cols*DPX-DPX+DP+DGAP; });
    BOX.w=x-DGAP;
    GRID=new Map(); SHOWN.forEach(n=>{ const k=Math.floor(n.x/DPX)+','+Math.floor(n.y/DPX); if(!GRID.has(k)) GRID.set(k,[]); GRID.get(k).push(n); });
    bundles(); fit(); }
  function fit(){ const top=108*F, bot=34, side=20; k0=Math.min((W-2*side)/BOX.w,(H-top-bot)/BOX.h); o=[(W-BOX.w*k0)/2, top+((H-top-bot)-BOX.h*k0)/2]; }
  const vis=n=>n.x!==undefined&&(S.fail||!n.fail);
  /* bundles: one ribbon per pair of blocks and link type on; anchors spread along the block's height by the other end's position */
  function bundles(){ const m=new Map();
    for(const l of LINKS){ if(!S.links.has(l.type)) continue; const a=byId[l.s], b=byId[l.t]; if(!vis(a)||!vis(b)||a._b===b._b) continue;
      const kk=a._b+'>'+b._b; let u=m.get(kk); if(!u) m.set(kk,u={a:a._b,b:b._b,n:0,pos:0,neg:0}); u.n++; const st=STEP[l.s+'|'+l.t]; if(st>0) u.pos++; else if(st<0) u.neg++; }
    BUND=[...m.values()]; const mx=Math.max(1,...BUND.map(u=>u.n)); BUND.forEach(u=>u.w=u.n/mx);
    const ends=new Map(); BUND.forEach(u=>{ [[u.a,u,'s'],[u.b,u,'t']].forEach(([bi,uu,side])=>{ const k=bi+side; if(!ends.has(k)) ends.set(k,[]); ends.get(k).push(uu); }); });
    ends.forEach((list,k)=>{ const side=k.slice(-1), bi=+k.slice(0,-1), B=BOX.blocks[bi]; const other=u=>BOX.blocks[side==='s'?u.b:u.a];
      list.sort((p,q)=>(other(p).y+other(p).h/2)-(other(q).y+other(q).h/2)); list.forEach((u,i)=>{ u[side+'y']=B.y+B.h*(i+1)/(list.length+1); }); });
    BUND.sort((p,q)=>p.n-q.n); }

  /* ── closure (item 47): every element a node is made of (down to the primitives and the context it is conditioned on) and every
     look and region it ends in (up through composition and landing); the selected or searched node's closure is named at any zoom ── */
  function closure(id,cap=1500){ const s=new Set([id]), dn=[id], up=[id];
    while(dn.length&&s.size<cap){ const x=dn.pop(); for(const l of inc[x]||[]){ if(!(l.type==='composed_of'||l.type==='realised_in'||l.type==='conditioned_on'&&byId[l.s].lv===0)) continue; const a=byId[l.s]; if(!vis(a)||s.has(l.s)) continue; s.add(l.s); dn.push(l.s); } }
    while(up.length&&s.size<cap){ const x=up.pop(); for(const l of out[x]||[]){ if(!(l.type==='composed_of'||l.type==='realised_in')) continue; const b=byId[l.t]; if(!vis(b)||s.has(l.t)) continue; s.add(l.t); up.push(l.t); } }
    return s; }
  const focus=()=>S.sel||S.hov;
  function relit(){ const f=focus(); LIT=f?closure(f):null; }

  /* ── drawing ── */
  function resize(){ const r=frame.getBoundingClientRect(); dpr=devicePixelRatio||1; W=Math.max(300,r.width); H=Math.max(300,r.height); F=Math.min(1.3,Math.max(1,(W/1450)**.3)); frame.style.setProperty('--fn-f',F);
    cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px'; const had=BOX; layout(); if(had) draw(); }
  const draw=()=>{ if(!raf) raf=requestAnimationFrame(()=>{ raf=0; paint(); }); };
  const bez=(c,x1,y1,x2,y2,bow)=>{ const dx=Math.max(20,(x2-x1)*.5); c.moveTo(x1,y1); c.bezierCurveTo(x1+dx,y1-bow,x2-dx,y2-bow,x2,y2); };
  let STATS={};
  function paint(){ const t0=performance.now(), c=ctx2, th=TH(), k=K(), tr=T(), z=level(), lit=LIT, foc=focus();
    const zf=Math.max(0,Math.min(1,(pz.get().z-1.15)/.6));   // 0 far .. 1 mid: bundles fade out, single links fade in
    c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,H);
    const V={x0:(-tr[0])/k,x1:(W-tr[0])/k,y0:(-tr[1])/k,y1:(H-tr[1])/k}, inV=n=>n.x>=V.x0-DPX&&n.x<=V.x1+DPX&&n.y>=V.y0-DP&&n.y<=V.y1+DP;
    c.setTransform(dpr*k,0,0,dpr*k,dpr*tr[0],dpr*tr[1]); c.lineCap='round';
    const E=th.edge; let nl=0;
    // block outlines once the grids open
    { c.strokeStyle=th.box; c.lineWidth=1/k; c.beginPath(); BOX.blocks.forEach(B=>{ if(B.x>V.x1||B.x+B.w<V.x0||!B.cap&&z===0) return; c.roundRect(B.x-4,B.y-4,B.w+8,B.h+8,4); }); c.stroke(); }   // block outlines (blocked sub-layers also at far zoom)
    // bundles (far, fading out towards mid), not while a closure is lit
    if(zf<1&&!lit){ for(const u of BUND){ const A=BOX.blocks[u.a], B=BOX.blocks[u.b]; if(A.L===B.L) continue; const vs=u.pos+u.neg, col=vs>u.n/2?mix(u.pos>=u.neg?th.pos:th.neg,.8):E;
        const back=B.x<=A.x, x1=back?A.x:A.x+A.w, x2=back?B.x+B.w:B.x, skip=Math.abs(B.L.ord-A.L.ord)>1&&!back, near=Math.abs(x2-x1)<90, ym=(u.sy+u.ty)/2;   // neighbours: a straight band, not a vertical S
        c.strokeStyle=`rgb(${col})`; c.globalAlpha=(.08+.42*Math.sqrt(u.w))*(1-zf); c.lineWidth=Math.min(near?2.5:6,.5+5.5*Math.sqrt(u.w))/k;
        c.beginPath(); bez(c,x1,near?ym:u.sy,x2,near?ym:u.ty,skip?Math.min(220,(x2-x1)*.12):0); c.stroke(); nl++; } }
    // single links: those of the nodes in view, strongest first, capped per screen; or the lit closure's
    if(zf>0||lit){ const cand=[];
      for(const l of LINKS){ const a=byId[l.s], b=byId[l.t]; if(!vis(a)||!vis(b)) continue;
        if(lit){ if(!(lit.has(l.s)&&lit.has(l.t))||!(l.type==='composed_of'||l.type==='realised_in'||l.type==='conditioned_on')) continue; }
        else if(!S.links.has(l.type)||!(inV(a)||inV(b))) continue; cand.push(l); }
      cand.sort((p,q)=>lstr(q)-lstr(p)); const sel=cand.slice(0,lit?900:z===2?260:320), n=sel.length; DRAWNL=sel;
      sel.forEach((l,i)=>{ const a=byId[l.s], b=byId[l.t], w=1-i/Math.max(1,n), st=STEP[l.s+'|'+l.t], e=w*w;
        c.strokeStyle=lit?th.accent:`rgb(${st?mix(st>0?th.pos:th.neg,.85):E})`; c.globalAlpha=lit?.3+.45*e:(z===2?.05+.25*e:.08+.42*e)*zf; c.lineWidth=(lit?.6+1.2*e:.5+1.7*e)/k;
        c.beginPath(); if(a._b===b._b||a.x===b.x){ const mx=(a.x+b.x)/2+(b.y-a.y)*.25, my=(a.y+b.y)/2-(b.x-a.x)*.25; c.moveTo(a.x,a.y); c.quadraticCurveTo(mx,my,b.x,b.y); }
        else { const back=b.x<a.x, skip=Math.abs(b._L-a._L)>1; bez(c,a.x,a.y,b.x,b.y,skip&&!back?Math.min(160,Math.abs(b.x-a.x)*.1):0); } c.stroke(); nl++; }); }
    c.globalAlpha=1;
    // nodes: batched by colour, alpha and shape
    const groups=new Map(); let drawn=0;
    for(const n of SHOWN){ if(!inV(n)) continue; drawn++; const [rgb,a]=dot(n), dim=(S.task||S.kind)&&!filtOk(n)||!famOk(n)||lit&&!lit.has(n.id);
      const kk=rgb.join(',')+'|'+(dim?a*.16:a); let g=groups.get(kk); if(!g) groups.set(kk,g=[]); g.push(n); }
    groups.forEach((ns,kk)=>{ const [rgb,a]=kk.split('|'); c.fillStyle=`rgba(${rgb},${a})`; c.beginPath();
      for(const n of ns){ const r=R(n,k); if(n._shape==='sq'){ c.moveTo(n.x-r,n.y-r); c.rect(n.x-r,n.y-r,2*r,2*r); } else if(n._shape==='di'){ const d=r*1.25; c.moveTo(n.x,n.y-d); c.lineTo(n.x+d,n.y); c.lineTo(n.x,n.y+d); c.lineTo(n.x-d,n.y); c.closePath(); } else { c.moveTo(n.x+r,n.y); c.arc(n.x,n.y,r,0,7); } }
      c.fill(); });
    // rings: the Network view's nodes; the lit closure; the focus
    c.strokeStyle=th.ring; c.globalAlpha=lit?.35:.8; c.lineWidth=Math.max(.5,1.1/k); c.beginPath();
    for(const n of SHOWN){ if(NET.has(n.id)&&inV(n)&&!((S.task||S.kind)&&!filtOk(n))){ const r=R(n,k)+1.8/k; c.moveTo(n.x+r,n.y); c.arc(n.x,n.y,r,0,7); } } c.stroke();
    if(lit){ c.strokeStyle=th.accent; c.globalAlpha=.9; c.lineWidth=1.3/k; c.beginPath(); lit.forEach(id=>{ const n=byId[id]; if(n&&vis(n)&&inV(n)){ const r=R(n,k)+2.4/k; c.moveTo(n.x+r,n.y); c.arc(n.x,n.y,r,0,7); } }); c.stroke(); }
    if(foc&&byId[foc]&&vis(byId[foc])){ const n=byId[foc]; c.globalAlpha=1; c.strokeStyle=th.accent; c.lineWidth=2.4/k; c.beginPath(); c.arc(n.x,n.y,R(n,k)+(S.fly===foc?7:3.5)/k,0,7); c.stroke(); }
    c.globalAlpha=1; c.setTransform(dpr,0,0,dpr,0,0);
    captions(c,th,k,tr,z,V); labels(c,th,k,z,V,lit,foc); minimap(); keyLine(z);
    STATS={ms:performance.now()-t0,drawn,links:nl,level:z,k,col:DPX*k};
    lvl.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.z===z)); }

  /* captions: the five levels on the top line, each sub-layer's name and count under it, each block's name and count above the block;
     fixed size on screen; when zoomed in they stay pinned to the top of the frame above their columns */
  let CAPS=[];
  function captions(c,th,k,tr,z,V){ CAPS=[]; const sx=x=>x*k+tr[0], sy=y=>y*k+tr[1];
    if(pz.get().z>1.02){ c.fillStyle=th.plate; c.globalAlpha=.94; c.fillRect(0,0,W,96*F); c.globalAlpha=1; }   // pinned captions sit on a band of their own once the map scrolls under them
    c.textBaseline='alphabetic'; c.textAlign='left';
    const Ls=BOX.layers, room=i=>{ let j=i+1; const x0=sx(Ls[i].x); return (j<Ls.length?sx(Ls[j].x):W)-x0-6; };
    // level line
    c.font=`600 ${10.5*F}px "Space Grotesk",-apple-system,sans-serif`;
    SUPER.forEach(([a,b,name],si)=>{ const la=Ls.find(L=>L.ord>=a&&L.ord<=b), lb=[...Ls].reverse().find(L=>L.ord>=a&&L.ord<=b); if(!la) return;
      const nx=si+1<SUPER.length?Ls.find(L=>L.ord>=SUPER[si+1][0]):null, x0=Math.max(6,sx(la.x)), x1=Math.min(W-6,sx(lb.x+lb.w)), lim=(nx?sx(nx.x):W)-x0-10; if(lim<20||x0>W) return; const y=16*F;
      c.strokeStyle=th.box; c.globalAlpha=1; c.lineWidth=1; c.beginPath(); c.moveTo(x0,y+5); c.lineTo(Math.max(x0+8,x1),y+5); c.stroke();
      c.fillStyle=th.sub; const t=fitTxt(c,name.toUpperCase(),lim); c.fillText(t,x0,y); CAPS.push({t,x:x0,y:y-10,w:c.measureText(t).width,h:12}); });
    // sub-layer captions, full names, packed into three rows: each goes into the row where it needs the least shift to the right of its
    // sub-layer's left edge; a thin leader joins a shifted caption to its sub-layer
    const ends=[-1e9,-1e9,-1e9,-1e9], RY=[38,54,70,86].map(v=>v*F);
    Ls.forEach((L,i)=>{ const x=Math.max(4,sx(L.x)); if(x>W-20||sx(L.x+L.w)<12) return;   // a sub-layer out of view has no caption
      c.font=`600 ${12*F}px "Space Grotesk",-apple-system,sans-serif`; const nm=L.name, w1=c.measureText(nm).width; c.font=`400 ${11*F}px "JetBrains Mono",ui-monospace,monospace`;
      const cnt=L.n.toLocaleString(), w=w1+6+c.measureText(cnt).width; let r=0, best=1e9;
      let xx=x; for(let j=0;j<4;j++){ const cx=Math.min(Math.max(x,ends[j]+12),Math.max(x,W-6-w)); if(cx<ends[j]+12) continue; const sh=cx-x; if(sh<best-.5){ best=sh; r=j; xx=cx; } }
      if(best===1e9){ r=ends.indexOf(Math.min(...ends)); xx=Math.max(x,ends[r]+12); } const y=RY[r]; ends[r]=xx+w; if(xx>W||xx+w<0) return;
      c.font=`600 ${12*F}px "Space Grotesk",-apple-system,sans-serif`; c.fillStyle=th.ink; c.fillText(nm,xx,y);
      c.font=`400 ${11*F}px "JetBrains Mono",ui-monospace,monospace`; c.fillStyle=th.sub; c.fillText(cnt,xx+w1+6,y);
      CAPS.push({t:nm,n:L.n,x:xx,y:y-11,w,h:14,layer:nm});
      const yb=Math.max(y+4,sy(L.y)-(L.blocks[0].cap?CAPB*k:0)-4); c.strokeStyle=th.box; c.lineWidth=1; c.beginPath();
      if(xx!==x){ c.moveTo(xx,y+4); c.lineTo(x,y+4); } else c.moveTo(x,y+4); c.lineTo(x,Math.min(yb,Math.max(y+4,100))); c.stroke(); });
    // block captions (family, kind of page, resolution), when the block is wide enough on screen
    c.font=`500 ${10.5*F}px "Space Grotesk",-apple-system,sans-serif`;
    BOX.blocks.forEach(B=>{ if(!B.cap) return; const x=sx(B.x), y=sy(B.y)-4, w=Math.max(B.w*k,0); if(x>W||x+w<0||y<108*F||y>H) return;
      const t=fitTxt(c,`${B.name} ${B.ns.length}`,Math.max(w+DGAP*k*.6,0)); if(!t||w<26) return; c.fillStyle=th.sub; c.globalAlpha=.95; c.fillText(t,x,y);
      CAPS.push({t:B.name,n:B.ns.length,x,y:y-10,w:c.measureText(t).width,h:12,block:1}); });
    c.globalAlpha=1; }
  function fitTxt(c,s,w){ if(w<14) return ''; if(c.measureText(s).width<=w) return s; let a=0, b=s.length; while(a<b){ const m=(a+b+1)>>1; c.measureText(s.slice(0,m)+'…').width<=w?a=m:b=m-1; } return a<2?'':s.slice(0,a).trimEnd()+'…'; }

  /* node labels: none at far zoom (except a selected or searched node's closure); hubs, strong nodes, the Network view's nodes and the
     closure at mid; every node in view at near, fitted to its cell; placed in priority order, a label that would overlap a label already
     placed is left out */
  function wrapN(c,s,w,m){ if(m<=1||c.measureText(s).width<=w) return [fitTxt(c,s,w)]; const ws=s.split(' '); let a='';
    for(let i=0;i<ws.length;i++){ const t=a?a+' '+ws[i]:ws[i]; if(c.measureText(t).width>w){ if(!a) return [fitTxt(c,s,w)]; return [a,...wrapN(c,ws.slice(i).join(' '),w,m-1)]; } a=t; } return [a]; }
  // the label area: inside the frame, under the caption band, clear of the minimap, the level switch and the key line
  const inArea=(n,k,tr,keep)=>{ const x=n.x*k+tr[0], y=n.y*k+tr[1]; return x>=0&&x<=W-60&&y>=114*F&&y<=BOT()-9*F&&!keep.some(q=>x>=q[0]&&x<=q[2]&&y>=q[1]&&y<=q[3]); };
  const keepZones=()=>{ const fr=cv.getBoundingClientRect(); return [mini,lvl,key].map(e=>{ const r=e.getBoundingClientRect(); return [r.left-fr.left-4,r.top-fr.top-4,r.right-fr.left+4,r.bottom-fr.top+4]; }); };
  function labels(c,th,k,z,V,lit,foc){
    if(live&&lastLab&&Math.abs(lastLab.k/k-1)>.002){ LABELS=[]; return; }   // while zooming the labels wait for the gesture to settle
    const want=[], cell=DPX*k, row=DP*k, tr=T();
    const fr=cv.getBoundingClientRect(), keep=[mini,lvl,key].map(e=>{ const r=e.getBoundingClientRect(); return [r.left-fr.left-4,r.top-fr.top-4,r.right-fr.left+4,r.bottom-fr.top+4]; });
    const hit=(b,q)=>b[0]<q[2]&&b[2]>q[0]&&b[1]<q[3]&&b[3]>q[1];
    for(const n of SHOWN){ if(!inArea(n,k,tr,keep)) continue; const own=n.id===foc, inL=lit&&lit.has(n.id);
      let p; if(own) p=0; else if(inL) p=1; else if(z===0) continue; else if(NET.has(n.id)) p=2; else if(n.cl===3||n.vt===2&&n._sz===2) p=3; else if((DEG[n.id]||0)>=12) p=4; else if(z===2) p=9; else continue;
      want.push([p,-(DEG[n.id]||0),n]); }
    want.sort((a,b)=>a[0]-b[0]||a[1]-b[1]); const boxes=[], fz=(z===2?11.5:11)*F, lh=fz*1.2, cap=z===2?900:140;
    const occ=b=>boxes.some(q=>hit(b,q))||keep.some(q=>hit(b,q))||CAPS.some(q=>hit(b,[q.x,q.y,q.x+q.w,q.y+q.h]));
    c.save(); c.textBaseline='middle'; c.textAlign='left'; c.font=`500 ${fz}px "Space Grotesk",-apple-system,sans-serif`; const out=[];
    for(const [p,,n] of want){ if(out.length>=cap) break; const nm=lname(n), ef=n.vote&&n.vote[0]!=null&&(z===2||p<=1)?' '+ppv(n.vote[0]):'';
      const r=R(n,k)*k, y=n.y*k+tr[1], inCell=z===2&&p>1, lim0=inCell?cell-r-9:Math.max(cell-r-9,210);
      const room=Math.max(1,Math.min(Math.floor(2*(y-100*F)/lh),Math.floor(2*(BOT()-2-y)/lh))), ml=Math.min(room,inCell?Math.max(1,Math.min(4,Math.floor((row-3)/lh))):2);   // near the band or the bottom: fewer lines
      let x=n.x*k+tr[0]+r+3; const edge=W-x-4<lim0, lim=Math.min(W-x-4,lim0); let lines=wrapN(c,nm+ef,lim,ml);
      const fitEf=L=>{ if(ef&&L[L.length-1].endsWith('…')){ const t2=fitTxt(c,L[L.length-1].replace(/…$/,''),lim-c.measureText(ef).width); L[L.length-1]=(t2||'…')+ef; } return L; };
      // at the right edge a name that would be cut goes to the left of its node instead
      if(edge&&lines[lines.length-1].endsWith('…')){ const wl=Math.min(lim0,x-r-10); const l2=wl>30?wrapN(c,nm+ef,wl,ml):['']; if(l2[0]&&!l2[l2.length-1].endsWith('…')){ lines=l2; x=n.x*k+tr[0]-r-3-Math.max(...l2.map(t=>c.measureText(t).width)); } else lines=fitEf(lines); }
      else lines=fitEf(lines);
      if(!lines[0]) continue; const w=Math.max(...lines.map(t=>c.measureText(t).width)), h=lines.length*lh, b=[x-2,y-h/2-1,x+w+2,y+h/2+1];
      if(b[2]<0||b[0]>W||b[1]<100*F||b[3]>BOT()||occ(b)) continue; boxes.push(b); out.push({id:n.id,t:lines.join(' '),lines,x,y,b,p}); }
    const fade=Math.min(1,(performance.now()-labT0)/160);
    for(const L of out){ c.globalAlpha=.93*fade; c.fillStyle=th.plate; c.fillRect(L.b[0],L.b[1],L.b[2]-L.b[0],L.b[3]-L.b[1]); c.globalAlpha=fade; c.fillStyle=L.p<=1||z===2?th.ink:L.p<=4?th.ink:th.sub;
      L.lines.forEach((t,i)=>c.fillText(t,L.x,L.y+(i-(L.lines.length-1)/2)*lh)); }
    c.restore(); LABELS=out; lastLab={k}; if(fade<1) draw(); }

  /* minimap: the sub-layers as blocks, the view as a frame, bottom left; click or drag moves the view */
  function minimap(){ const mw=150, mh=Math.max(36,Math.min(96,mw*BOX.h/BOX.w)); if(mini.width!==mw*dpr){ mini.width=mw*dpr; mini.height=mh*dpr; mini.style.width=mw+'px'; mini.style.height=mh+'px'; }
    const th=TH(), c=mctx, s=Math.min((mw-8)/BOX.w,(mh-8)/BOX.h); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,mw,mh);
    c.fillStyle=th.sub; c.globalAlpha=.45; BOX.blocks.forEach(B=>c.fillRect(4+B.x*s,4+B.y*s,Math.max(1,B.w*s),Math.max(1,B.h*s)));
    if(LIT){ c.fillStyle=th.accent; c.globalAlpha=1; LIT.forEach(id=>{ const n=byId[id]; if(n&&vis(n)) c.fillRect(4+n.x*s-1,4+n.y*s-1,2,2); }); }
    const [x0,y0]=toW(0,0), [x1,y1]=toW(W,H); c.globalAlpha=1; c.strokeStyle=th.accent; c.lineWidth=1.2; c.strokeRect(4+x0*s,4+y0*s,(x1-x0)*s,(y1-y0)*s); mini._s=s; }
  function miniGo(e){ const r=mini.getBoundingClientRect(), s=mini._s; centreOn((e.clientX-r.left-4)/s,(e.clientY-r.top-4)/s,pz.get().z,false); }
  mini.addEventListener('pointerdown',e=>{ e.stopPropagation(); miniGo(e); const mv=ev=>miniGo(ev), up=()=>{ removeEventListener('pointermove',mv); removeEventListener('pointerup',up); }; addEventListener('pointermove',mv); addEventListener('pointerup',up); });

  function keyLine(z){ const th=TH(), d=(rgb,a)=>`<i style="background:rgba(${rgb},${a})"></i>`;
    const tiers=[3,2,1].map(s=>d(mix(th.pos,STEPF[s]),.95)+d(mix(th.neg,STEPF[s]),.95)+' '+['','leaning','clear','strong'][s]).join(' ');
    const h=`<span>colour = vote effect${S.model?' (looks, regions: Gemini 3.7 Flash)':''}</span><span>green wins more votes, red fewer: ${tiers} ${d(th.neu,.8)} none</span><span>▪ context, region ● element, look ◆ rule</span><span>○ in the Network view</span><span>${z===0?'ribbon width = links between two blocks':'thicker line = stronger link'}</span>`;
    if(key.dataset.h!==h){ key.innerHTML=h; key.dataset.h=h; } }

  /* ── camera ── */
  let anim=0;
  function centreOn(wx,wy,z,smooth=true){ const f=[k0*wx+o[0],k0*wy+o[1]], to={z,x:-(f[0]-W/2)*z,y:-(f[1]-H/2)*z};
    cancelAnimationFrame(anim); if(!smooth||matchMedia('(prefers-reduced-motion: reduce)').matches){ pz.set(to); return; }
    const from=pz.get(), t0=performance.now(), D=480, lz=Math.log(from.z), lz1=Math.log(to.z);
    const step=()=>{ const u=Math.min(1,(performance.now()-t0)/D), e=u<.5?2*u*u:1-(-2*u+2)**2/2, zz=Math.exp(lz+(lz1-lz)*e);
      // interpolate the world point at the centre, so the motion is a straight glide plus zoom
      const c0=toWfrom(from), c1=[wx,wy], cx=c0[0]+(c1[0]-c0[0])*e, cy=c0[1]+(c1[1]-c0[1])*e, ff=[k0*cx+o[0],k0*cy+o[1]];
      pz.set({z:zz,x:-(ff[0]-W/2)*zz,y:-(ff[1]-H/2)*zz}); if(u<1) anim=requestAnimationFrame(step); };
    anim=requestAnimationFrame(step); }
  const toWfrom=v=>{ const k=k0*v.z, t=[W/2+(o[0]-W/2)*v.z+v.x,H/2+(o[1]-H/2)*v.z+v.y]; return [(W/2-t[0])/k,(H/2-t[1])/k]; };
  const zFor=lv=>lv===0?1:lv===1?Math.max(1.05,(FAR*2.2)/(DPX*k0)):Math.max(1.05,200/(DPX*k0));
  lvl.addEventListener('click',e=>{ const b=e.target.closest('[data-z]'); if(!b) return; const l=+b.dataset.z; if(l===0){ cancelAnimationFrame(anim); pz.fit(); return; } const c=toWfrom(pz.get()); centreOn(c[0],c[1],zFor(l)); });
  function flyTo(id){ const n=byId[id]; if(!n) return false; if(!vis(n)){ S.fail=true; layout(); syncRow(); } S.sel=id; S.fly=id; relit(); centreOn(n.x,n.y,Math.max(zFor(2),pz.get().z)); hideCard(); return true; }

  /* ── hit test: a spatial grid in world units, pick radius in screen pixels ── */
  function pick(e){ const r=cv.getBoundingClientRect(), [wx,wy]=toW(e.clientX-r.left,e.clientY-r.top), k=K(), rad=n=>R(n,k)*1.25+4/k;   // the drawn mark plus 4 px: a pointer on a link next to a node is not on the node
    const gx=Math.floor(wx/DPX), gy=Math.floor(wy/DPX); let best=null, bd=1e9;
    for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) for(const n of GRID.get((gx+i)+','+(gy+j))||[]){ const d=Math.hypot(n.x-wx,n.y-wy); if(d<=rad(n)&&d<bd){ bd=d; best=n; } }
    return best; }

  /* ── hover card (shared hovercard.js): name, one line of numbers, two to four example pages; after 120 ms ── */
  let cardT=0;
  function examples(n){ const ex=n.examples, A=AUD&&AUD[n.id];
    if(ex&&(ex.length||ex.with)){ const w=(ex.with||ex).map(x=>({src:typeof x==='number'?thumb(x):thumbU(x)})), wo=(ex.without||[]).map(x=>({src:typeof x==='number'?thumb(x):thumbU(x),without:1})); return w.slice(0,wo.length?2:4).concat(wo.slice(0,2)); }
    if(A&&A.examples&&A.examples.length) return A.examples.slice(0,4).map(u=>({src:thumbU(u)}));
    return (n.ex||[]).slice(0,4).map(i=>({src:thumb(i)})); }
  const lvName=n=>{ const [,L,b]=subOf(n); return L+(b?' · '+b:''); };
  function nums(n){ const v=n.vote, t=v&&v[1]!=null?(v[1]>0||v[2]<0?'clear':tierOf(v)===1?'leaning':'cannot tell'):'no vote estimate';
    return `${(n.n_all||n.n||0).toLocaleString()} pages (${pc(share(n))}) · votes ${v&&v[0]!=null?`<b class="${v[0]>0?'pos':'neg'}">${ppv(v[0])} pp</b> [${ppv(v[1])}, ${ppv(v[2])}] ${t}`:t}`; }
  function showCard(e,n){ if(!hc) return; const ex=examples(n);
    const grid=ex.length?`<div class="fn-hgrid">${ex.map(x=>`<figure${x.without?' class="wo"':''}><img src="${esc(x.src)}" alt="">${x.without?'<figcaption>without</figcaption>':''}</figure>`).join('')}</div>`:'<div class="fn-hnone">No example pages for this node.</div>';
    hc.show(e,{title:esc(n.sn||n.name),lines:[`<span class="fn-hl">${esc(lvName(n))}</span>`,nums(n)],extra:grid}); hc.el.dataset.node=n.id; }
  function hideCard(){ clearTimeout(cardT); if(hc){ hc.hide(); delete hc.el.dataset.node; } }
  cv.addEventListener('pointermove',e=>{ if(pz.busy()){ hideCard(); return; } const n=pick(e), id=n?n.id:null;
    cv.style.cursor=n?'pointer':'';
    if(id!==S.hov){ S.hov=id; if(!S.sel) relit(); draw(); hideCard(); if(n){ cardT=setTimeout(()=>showCard(e,n),120); } } });
  cv.addEventListener('pointerleave',()=>{ S.hov=null; if(!S.sel) relit(); hideCard(); draw(); });
  cv.addEventListener('click',e=>{ const n=pick(e); hideCard();
    if(!n){ if(S.sel){ S.sel=null; S.fly=null; relit(); closePanel(); draw(); } return; }
    if(S.sel===n.id){ S.sel=null; S.fly=null; relit(); closePanel(); draw(); return; }
    S.sel=n.id; S.fly=null; relit(); draw(); (ctx.openPanel||openPanel)(n.id); });
  const onKey=e=>{ if(e.key!=='Escape'||!el.isConnected) return; if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.pk-pan,.lb')) return;
    if(!panel.hidden) return closePanel(); if(S.sel){ S.sel=null; S.fly=null; relit(); draw(); return; } reset(); };
  addEventListener('keydown',onKey);

  /* ── the module's own node panel (used when the page gives no openPanel): examples first, then the numbers, then its links ── */
  function openPanel(id){ const n=byId[id]; if(!n) return; const ex=examples(n), list=ex.map(x=>({src:x.src,cap:(n.sn||n.name)+(x.without?' (without)':'')}));
    const linkRows=(arr,side)=>arr.slice().sort((p,q)=>lstr(q)-lstr(p)).slice(0,8).map(l=>{ const m=byId[side==='s'?l.s:l.t]; return m?`<li><button type="button" data-go="${esc(m.id)}">${esc(m.sn||m.name)}</button> <span>${LTN[l.type]||l.type}</span></li>`:''; }).join('');
    const parts=(inc[id]||[]).filter(l=>l.type==='composed_of'||l.type==='realised_in'||l.type==='conditioned_on'), ups=(out[id]||[]).filter(l=>l.type==='composed_of'||l.type==='realised_in');
    panel.innerHTML=`<button type="button" class="fn-x" aria-label="Close">✕</button><div class="fn-pl">${esc(lvName(n))}</div><h3>${esc(n.name)}</h3>
      ${ex.length?`<div class="fn-pgrid">${ex.map((x,i)=>`<figure${x.without?' class="wo"':''}><img src="${esc(x.src)}" alt="" data-i="${i}">${x.without?'<figcaption>without</figcaption>':''}</figure>`).join('')}</div>`:''}
      <p class="fn-pn">${nums(n)}</p>${n.definition?`<p>${esc(n.definition)}</p>`:''}
      ${parts.length?`<h4>Made of, or landing here (${parts.length})</h4><ul>${linkRows(parts,'s')}</ul>`:''}${ups.length?`<h4>Part of, or lands in (${ups.length})</h4><ul>${linkRows(ups,'t')}</ul>`:''}
      ${ctx.onDetails?'<button type="button" class="hbtn fn-det">Show in Details</button>':''}`;
    panel.hidden=false;
    panel.querySelector('.fn-x').onclick=closePanel;
    panel.querySelectorAll('img[data-i]').forEach(im=>im.onclick=()=>(ctx.openViewer||(window.LB&&LB.open)||(()=>{}))(list,+im.dataset.i));
    panel.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ flyTo(b.dataset.go); openPanel(b.dataset.go); });
    const d=panel.querySelector('.fn-det'); if(d) d.onclick=()=>ctx.onDetails(id); }
  function closePanel(){ panel.hidden=true; panel.innerHTML=''; }

  /* ── the controls row: count, search, Filters (link types, primitives family, render failures, sub-layer counts), Task, Kind, Model ── */
  function syncRow(){ const fails=G.nodes.filter(n=>n.fail).length, inF=(S.task||S.kind)?SHOWN.filter(filtOk).length:SHOWN.length;
    const LT=G.link_types||{}, fams=[...new Set(G.nodes.filter(n=>n.lv===1).map(n=>n.fam))];
    row.innerHTML=`<span class="fn-count" title="nodes drawn of the nodes in the data"><b>${inF.toLocaleString()}</b> of ${G.nodes.length.toLocaleString()} nodes${S.task||S.kind?' in '+esc((S.task||S.kind).replace(/_/g,' ')):''}</span>
      <input class="fn-q" type="search" placeholder="Find a node" aria-label="Find a node" list="fnql"><datalist id="fnql"></datalist>
      <details class="fn-filt"><summary class="hbtn">Filters</summary><div class="fn-pop">
        <p class="fn-ph">Links</p><div class="fn-chips">${Object.keys(LTN).filter(t=>LT[t]).map(t=>`<button type="button" class="hbtn${S.links.has(t)?' on':''}" data-lt="${t}">${LTN[t]} <span>${(LT[t]||0).toLocaleString()}</span></button>`).join('')}</div>
        <p class="fn-ph">Primitives family</p><div class="fn-chips"><button type="button" class="hbtn${!S.fam?' on':''}" data-fam="">all</button>${fams.map(f=>`<button type="button" class="hbtn${S.fam===f?' on':''}" data-fam="${esc(f)}">${esc(f)}</button>`).join('')}</div>
        <p class="fn-ph">Render failures</p><div class="fn-chips"><button type="button" class="hbtn${S.fail?' on':''}" data-fail="1">${fails.toLocaleString()} nodes of the render-failure family ${S.fail?'shown':'hidden'}</button></div>
        <p class="fn-ph">${BOX.layers.length} sub-layers (click to go there)</p><div class="fn-chips">${BOX.layers.map((L,i)=>`<button type="button" class="hbtn" data-go-l="${i}">${esc(L.name)} <span>${L.n.toLocaleString()}</span></button>`).join('')}</div>
      </div></details>
      ${ctx.controls===false?'':`<label>Task <select id="fnTask"><option value="">All</option>${G.tasks.map(t=>`<option${t===S.task?' selected':''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Kind <select id="fnKind"><option value="">All</option>${G.kinds.map(t=>`<option value="${esc(t)}"${t===S.kind?' selected':''}>${esc(KSHORT[t]||t)}</option>`).join('')}</select></label>
      <span class="seg fn-model" role="group" aria-label="Model"><button type="button" class="hbtn${S.model?'':' on'}" data-m="0">All models</button><button type="button" class="hbtn${S.model?' on':''}" data-m="1">${esc((G.model&&G.model.name)||'Model')}</button></span>`}`;
    const q=row.querySelector('.fn-q'), dl=row.querySelector('#fnql');
    q.addEventListener('input',()=>{ const s=q.value.trim().toLowerCase(); dl.innerHTML=s.length<2?'':find(s,12).map(n=>`<option value="${esc(n.sn||n.name)}">`).join(''); q.classList.remove('miss'); });
    q.addEventListener('keydown',e=>{ if(e.key!=='Enter') return; const s=q.value.trim().toLowerCase(); if(!s) return; const n=find(s,1)[0]; q.classList.toggle('miss',!n); if(n) flyTo(n.id); });
    row.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{ const t=b.dataset.lt; S.links.has(t)?S.links.delete(t):S.links.add(t); b.classList.toggle('on',S.links.has(t)); bundles(); draw(); });
    row.querySelectorAll('[data-fam]').forEach(b=>b.onclick=()=>{ S.fam=b.dataset.fam; row.querySelectorAll('[data-fam]').forEach(x=>x.classList.toggle('on',x===b)); draw(); });
    row.querySelector('[data-fail]').onclick=()=>{ S.fail=!S.fail; layout(); relit(); syncRow(); row.querySelector('.fn-filt').open=true; draw(); };
    row.querySelectorAll('[data-go-l]').forEach(b=>b.onclick=()=>{ const L=BOX.layers[+b.dataset.goL]; centreOn(L.x+L.w/2,Math.min(L.h/2,(H/2-o[1])/k0),Math.max(zFor(1),pz.get().z)); });
    const tk=row.querySelector('#fnTask'), kd=row.querySelector('#fnKind');
    if(tk){ tk.onchange=()=>setFilters({task:tk.value||null,kind:null},true); kd.onchange=()=>setFilters({kind:kd.value||null,task:null},true);
      row.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>setFilters({model:b.dataset.m==='1'},true));
      if(window.Picker){ [tk,kd].forEach(s=>{ try{ Picker.attach(s,{keepEmpty:true}); }catch(_){ } }); } } }
  function find(s,k){ const sc=n=>{ const a=(n.sn||'').toLowerCase(), b=n.name.toLowerCase(); return n.id.toLowerCase()===s||a===s||b===s?0:a.startsWith(s)||b.startsWith(s)?1:a.includes(s)||b.includes(s)?2:9; };
    return G.nodes.filter(n=>sc(n)<9).sort((p,q)=>sc(p)-sc(q)||(DEG[q.id]||0)-(DEG[p.id]||0)||(q.n||0)-(p.n||0)).slice(0,k); }
  function setFilters(f,fromHere){ Object.assign(S,f); syncRow(); draw(); if(fromHere&&ctx.onFilter) ctx.onFilter({task:S.task,kind:S.kind,model:S.model}); }
  function reset(){ S.sel=null; S.hov=null; S.fly=null; S.fam=''; S.links=new Set(DEFLINKS); LIT=null; closePanel(); hideCard(); cancelAnimationFrame(anim); if(S.fail){ S.fail=false; layout(); } bundles(); syncRow(); pz.fit(); draw(); }

  /* ── size: the frame fills the window below its top, at least 520 px ── */
  function size(){ const top=frame.getBoundingClientRect().top+scrollY; frame.style.height=Math.max(520,innerHeight-top-14)+'px'; }
  size(); resize(); syncRow();
  const ro=new ResizeObserver(()=>{ resize(); }); ro.observe(frame);
  const onWin=()=>size(); addEventListener('resize',onWin);
  const mo=new MutationObserver(()=>draw()); mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  pz.set({z:1,x:0,y:0}); labT0=performance.now();
  if(ctx.node) requestAnimationFrame(()=>flyTo(ctx.node));

  /* for the page's checks (fullnet.check.py) */
  const debug=()=>{ const tr=T(), k=K(); const ov=[]; for(let i=0;i<LABELS.length;i++) for(let j=i+1;j<LABELS.length;j++){ const a=LABELS[i].b, b=LABELS[j].b; if(a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1]) ov.push([LABELS[i].id,LABELS[j].id]); }
    const f=S.sel&&byId[S.sel]; return {data:G.nodes.length,drawn:SHOWN.length,fail:G.nodes.filter(n=>n.fail).length,failShown:S.fail,inView:STATS.drawn,
      layers:BOX.layers.map(L=>({name:L.name,n:L.n,blocks:L.blocks.map(B=>[B.name,B.ns.length])})),captions:CAPS.filter(c=>c.layer).map(c=>({name:c.layer,n:c.n})),
      level:STATS.level,col:STATS.col,inLabelArea:(()=>{ const kz=keepZones(); return SHOWN.filter(n=>inArea(n,k,tr,kz)).length; })(),unnamed:(()=>{ const kz=keepZones(), L=new Set(LABELS.map(l=>l.id)); return SHOWN.filter(n=>inArea(n,k,tr,kz)&&!L.has(n.id)).map(n=>[n.id,Math.round(n.x*k+tr[0]),Math.round(n.y*k+tr[1])]); })(),ms:STATS.ms,links:STATS.links,labels:LABELS.map(L=>({id:L.id,t:L.t,lit:L.p<=1})),overlaps:ov,
      sel:S.sel,lit:LIT?LIT.size:0,selScreen:f?[f.x*k+tr[0],f.y*k+tr[1]]:null,W,H,frame:frame.getBoundingClientRect().toJSON(),ring:SHOWN.filter(n=>NET.has(n.id)).length,net:NET.size,
      undesc:UNDESC.size,resUncovered:G.res_uncovered,card:hc&&!hc.el.hidden?hc.el.dataset.node:null,cardImgs:hc&&!hc.el.hidden?[...hc.el.querySelectorAll('img')].map(i=>i.getAttribute('src')):[]};
  };
  // for the check: screen midpoints of drawn single links (straight-drawn ones: the bezier's midpoint is the chord's) at least 14 px from any node
  const linkMids=(m=10)=>{ const k=K(), tr=T(), r=cv.getBoundingClientRect(), out=[];
    for(const l of DRAWNL){ const a=byId[l.s], b=byId[l.t]; if(a._b===b._b||a.x===b.x||Math.abs(b._L-a._L)>1) continue; const x=(a.x+b.x)/2*k+tr[0], y=(a.y+b.y)/2*k+tr[1]; if(x<20||x>W-20||y<130||y>H-120) continue;
      const [wx,wy]=toW(x,y); let near=false; for(let i=-1;i<=1&&!near;i++) for(let j=-1;j<=1&&!near;j++) for(const n of GRID.get((Math.floor(wx/DPX)+i)+','+(Math.floor(wy/DPX)+j))||[]) if(Math.hypot(n.x-wx,n.y-wy)*k<14){ near=true; break; }
      if(!near) out.push([r.left+x,r.top+y,l.s,l.t]); if(out.length>=m) break; } return out; };
  /* the view, for the host to keep across pages: {v:1, k (screen px per world unit), cx, cy (world point at the frame's centre), level
     (0 Whole, 1 Hubs, 2 Names: what that scale shows), sel (selected or flown-to node id or null)}. setView restores it without
     animation, in whatever window size: the same world point at the centre at the same scale (clamped to the zoom limits); an id that
     is not a node of the data or is hidden is dropped; anything malformed is ignored. */
  function getView(){ const k=K(), [cx,cy]=toWfrom(pz.get()); return {v:1,k:+k.toFixed(6),cx:+cx.toFixed(3),cy:+cy.toFixed(3),level:level(),sel:S.sel||null}; }
  function setView(o){ if(!o||typeof o!=='object') return false; cancelAnimationFrame(anim);
    if(Number.isFinite(o.k)&&o.k>0&&Number.isFinite(o.cx)&&Number.isFinite(o.cy)){ const z=Math.max(.6,Math.min(30,o.k/k0)); centreOn(o.cx,o.cy,z,false); }
    const id=typeof o.sel==='string'&&byId[o.sel]&&vis(byId[o.sel])?o.sel:null; S.sel=id; S.fly=null; relit(); draw(); return true; }
  const api={getView,setView,linkMids,flyTo,reset,set:f=>setFilters(f,false),debug,closure:id=>[...closure(id)],screenOf:id=>{ const n=byId[id], k=K(), tr=T(); const r=cv.getBoundingClientRect(); return n&&n.x!==undefined?[r.left+n.x*k+tr[0],r.top+n.y*k+tr[1]]:null; },pz,canvas:cv,level:()=>STATS.level};
  function destroy(){ ro.disconnect(); mo.disconnect(); removeEventListener('resize',onWin); removeEventListener('keydown',onKey); cancelAnimationFrame(raf); cancelAnimationFrame(anim); hideCard();
    if(hc) hc.el.remove(); const i=PanZoom.all.findIndex(x=>x.canvas===cv); if(i>=0) PanZoom.all.splice(i,1); row.remove(); el.innerHTML=''; el.classList.remove('fn-host'); }
  // a settle after a gesture restarts the label fade
  let wasLive=false; const tick=()=>{ if(wasLive&&!live){ labT0=performance.now(); draw(); } wasLive=live; }; const tk2=setInterval(tick,60);
  const d0=destroy; return {api,destroy:()=>{ clearInterval(tk2); d0(); }};
}
window.DualModes=window.DualModes||{};
window.DualModes.fullnet={mount,unmount,get api(){ return M&&M.api; },getView:()=>M?M.api.getView():null,setView:o=>M?M.api.setView(o):false,reset:()=>M&&M.api.reset()};
})();
