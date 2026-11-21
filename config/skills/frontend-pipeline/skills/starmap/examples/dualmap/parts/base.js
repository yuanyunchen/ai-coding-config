/* Dual map: continuous page map (own canvas) linked to the concept graph (vendor/starmap.js).
   Data: data/<scale>/{points,tournaments,graph,members,corr}.json, shapes in .agents/memory/contracts.md. */
(async function(){
'use strict';
const $=id=>document.getElementById(id), root=document.documentElement;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sgn=(v,d=2)=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d);
const cls=v=>v>0?'pos':v<0?'neg':'';
const pct=v=>(v*100).toFixed(v<.1?1:0)+'%';
const pp=v=>v==null?'n/a':sgn(v*100,1);   // effects are shown in percentage points
const MONTH=['January','February','March','April','May','June','July','August','September','October','November','December'];
const mName=(m,short)=>{ const n=MONTH[+m.slice(5)-1]; return (short?n.slice(0,3):n)+' '+m.slice(0,4); };

/* ── themes: canvas colours (DOM colours are CSS tokens in dualmap.css) ── */
const THEMES={
  light:{ground:'#eceae4',dim:'#aeaba2',dimA:.3,litA:.72,gam:1,pos:[38,150,84],neu:[204,201,193],neg:[214,62,58],ink:'#1d1b17',sub:'#57534a',
    accent:'#1f5fbf',amber:'#a8620a',edge:[150,150,146],chip:'#f6f5f1',particle:'#57534a',place:['#c99a1e','#8f98a6','#b97a4e','#6b4a36'],sat:'62%',lum:'42%',
    g:{bg0:'#f0eee8',bg1:'#e6e3db',plate:'rgba(236,234,228,.88)',blend:'source-over'}},
  dark:{ground:'#060913',dim:'#39405a',dimA:.4,litA:.92,gam:.6,pos:[56,217,112],neu:[58,64,84],neg:[255,78,92],ink:'#e9eefb',sub:'#9aa7c9',
    accent:'#8fc6ff',amber:'#ffc98a',edge:[110,124,160],chip:'#10162a',particle:'#b4d6ff',place:['#e3b341','#c0c7d1','#c98b5e','#8a6248'],sat:'60%',lum:'64%',
    g:{bg0:'#0b1120',bg1:'#050710',plate:'rgba(6,9,19,.82)',blend:'lighter'}}};
let TH=THEMES[root.dataset.theme]; const GTH={...TH.g};
const BINS=11;   // diverging ramp: bin 0 = strongest red, BINS = neutral, 2*BINS = strongest green
// gam < 1 lifts middling values off the dim neutral so green and red read on the dark ground; the legend ramp uses the same bins
const divRGB=b=>{ const t=(b-BINS)/BINS, to=t>0?TH.pos:TH.neg, a=Math.abs(t)**TH.gam; return TH.neu.map((c,i)=>Math.round(c+(to[i]-c)*a)); };
const divBin=(v,dom)=>Math.round(BINS+BINS*Math.max(-1,Math.min(1,v/dom)));
const hue=i=>`hsl(${(i*137.5)%360},${TH.sat},${TH.lum})`;
const rampCSS=()=>`linear-gradient(90deg,${Array.from({length:2*BINS+1},(_,b)=>`rgb(${divRGB(b)})`).join(',')})`;

/* ── shared by every view of this file ───────────────────────────────
   Page images open in the site's shared viewer (lightbox.js, included by index.html: window.LB). A grid of one node's
   examples is one group (data-lb-group on the grid, data-lb on each img). */
const LB=window.LB;
/* "Reset view" and the vocabulary switch sit in the header's tools, the same place on every view */
function headerTools(reset, vocab){
  const t=document.querySelector('#ctrlrow .tools, .top .tools'); if(!t) return;
  if(vocab){ const a=document.createElement('a'); a.className='hbtn'; a.id='vocab'; a.href=vocab.href; a.textContent=vocab.text; a.title=vocab.title; t.prepend(a); }
  const b=document.createElement('button'); b.className='hbtn'; b.id='resetView'; b.textContent='Reset view'; b.title='Back to the state of a fresh load (Escape steps back one at a time)'; b.onclick=reset; t.prepend(b);
}
/* the concept graph's three modes, one switch: the network (default), the full network (every node), the details (the lists) */
function modeSwitch(get, set){
  const t=document.querySelector('#ctrlrow .tools, .top .tools'); if(!t) return;
  const M=[['net','Network','?view=graph'],['dense','Full network','?view=graph&mode=dense'],['full','Details','?view=graph&mode=full']].filter(m=>m[0]!=='dense'||window.DENSE_LIVE);   // Details = the former Full structure
  const s=document.createElement('span'); s.className='seg'; s.id='gmode'; s.setAttribute('role','group'); s.setAttribute('aria-label','Concept graph mode');
  s.innerHTML=M.map(([k,t,h])=>`<a class="hbtn" data-gmode="${k}" href="${h}">${t}</a>`).join('');
  const mark=()=>s.querySelectorAll('[data-gmode]').forEach(a=>a.classList.toggle('on',a.dataset.gmode===get()));
  s.addEventListener('click',e=>{ const a=e.target.closest('[data-gmode]'); if(!a||!set) return; e.preventDefault(); set(a.dataset.gmode); mark(); });
  t.querySelector('#resetView')?t.querySelector('#resetView').after(s):t.prepend(s); mark(); return mark;
}
/* the divider between the graph and its panel (the engine's .sm-rz): drag (the engine), arrow keys move it 24 px (Shift 96),
   a double click or Enter resets it; the width is remembered per view; the graph re-fits through a ResizeObserver */
function drawerSplit(insp, key, refit){
  const rz=insp&&insp.querySelector('.sm-rz'); if(!rz) return;
  const st=(()=>{ try{ return localStorage; }catch(e){ return null; } })(), get=()=>{ try{ return st&&st.getItem(key); }catch(e){ return null; } }, put=v=>{ try{ st&&(v?st.setItem(key,v):st.removeItem(key)); }catch(e){} };
  const w0=get(); if(w0) insp.style.setProperty('--iw',w0);
  rz.setAttribute('role','separator'); rz.setAttribute('aria-orientation','vertical'); rz.tabIndex=0; rz.setAttribute('aria-label','Resize the panel (arrow keys; double click or Enter resets)');
  const set=w=>{ if(w==null){ insp.style.removeProperty('--iw'); put(null); return; } const v=Math.max(340,Math.min(innerWidth*.8,w))+'px'; insp.style.setProperty('--iw',v); put(v); };
  rz.addEventListener('dblclick',()=>set(null));
  rz.addEventListener('keydown',e=>{ const w=insp.getBoundingClientRect().width, d=e.shiftKey?96:24;
    if(e.key==='ArrowLeft'){ e.preventDefault(); set(w+d); } else if(e.key==='ArrowRight'){ e.preventDefault(); set(w-d); } else if(e.key==='Enter'){ e.preventDefault(); set(null); } });
  addEventListener('pointerup',()=>{ const v=insp.style.getPropertyValue('--iw'); if(v) put(v.trim()); });
  let t=null; new ResizeObserver(()=>{ clearTimeout(t); t=setTimeout(refit,60); }).observe(insp);
}
/* the cluster audit (data/pilot/cluster_audit.json, written by the audit dispatch): {id: {verdict, examples: [page ids, one per duplicate group]}}.
   Where it has an item, example grids take its examples; a verdict other than "look" shows as a small tag. Absent file: {} (asked for
   only when the folder listing names it, so the console stays clean). */
async function loadAudit(){ try{ const ls=await fetch('data/pilot/').then(r=>r.ok?r.text():''); if(ls&&!ls.includes('cluster_audit.json')) return {};
  return await fetch('data/pilot/cluster_audit.json').then(r=>r.ok?r.json():{}).catch(()=>({})); }catch(e){ return {}; } }
const AUDTAG={image_bound:'one stock image',template_bound:'one template',subject_bound:'one subject',generator_bound:'one generator'};
const audTag=a=>a&&AUDTAG[a.verdict]?` <span class="audtag" title="cluster audit: ${a.verdict.replace('_',' ')}">${AUDTAG[a.verdict]}</span>`:'';
/* the site's header pattern (page.css): line 1 the title = the navigation label, line 2 one sentence, line 3 a small note;
   counts, methods and definitions behind "details" */
function pageHeader(title, sentence, note, details){
  // one heading "<Page name>: <sentence>" (key phrase in <em>), the note under it, Details inline at its end; nothing beside it
  const e=document.querySelector('.sm-eyebrow'); if(e) e.remove();
  const t=document.getElementById('title'); t.innerHTML=`${title}: ${sentence}`; t.className='pg-title'; (t.closest('.top')||t.parentElement).classList.add('pg-head');   // the header block is a child of .pg-frame
  const s=document.getElementById('sub'); if(s){ s.textContent=''; s.hidden=true; }   // kept (hidden) for the code that still writes to it
  let n=document.getElementById('pnote'); if(!n){ n=document.createElement('div'); n.id='pnote'; n.className='pg-note'; t.after(n); }
  n.innerHTML=`<span class="pn-t">${note}</span> <details class="pg-more" id="pdet"><summary>Details</summary><div>${details}</div></details>`; n.dataset.base=note;
  // the page's controls (Reset view, mode switch, counters, theme) sit in the row under the header, not beside the heading
  const top=document.querySelector('.top'), tools=top&&top.querySelector('.tools');
  if(tools&&!document.getElementById('ctrlrow')){ const r=document.createElement('div'); r.id='ctrlrow'; r.className='ctrlrow'; r.append(tools); top.after(r); } }
/* the Light / Dark switch lives at the right end of the navigation bar, beside the update stamp (site-wide place, item 31) */
function themeToNav(){ if(document.readyState==='loading') return addEventListener('DOMContentLoaded',themeToNav,{once:true});   // after nav.js has drawn the bar
  const t=document.getElementById('theme'), n=document.getElementById('site-nav'); if(t&&n&&!n.contains(t)){ t.classList.add('navtheme'); n.append(t); } }
const setNote=html=>{ const n=document.querySelector('#pnote .pn-t'); if(n) n.innerHTML=html==null?document.getElementById('pnote').dataset.base:html; };
/* a starmap engine zoomed and panned by the shared panzoom.js: the engine keeps its own camera, set here from the fitted camera
   `base()` and the pan-zoom view {z, x, y} (screen = centre + cam + world * k, so cam = base * z + (x, y)); the engine's own wheel
   and drag are switched off (its panGain / zoomGain ~ 0) */
function engineZoom(sm, canvas, base, isNode){
  const apply=v=>{ const b=base(), c=sm.cam; if(!b) return; c.k=b.k*v.z; c.x=b.x*v.z+v.x; c.y=b.y*v.z+v.y; };
  const pz=PanZoom.attach(canvas,{min:.4,max:6,onChange:v=>apply(v),isNode});
  canvas.addEventListener('dblclick',()=>setTimeout(()=>{ sm.zoomBy(1); apply(pz.get()); },0));   // the engine's own double-click zoom yields to the view
  return pz; }
/* The site's shared dark picker (picker.js, item 25) in place of every native select menu on these pages: the select stays in the
   page (hidden) with its value and 'change' event, so the code that reads it is unchanged. Selects drawn later (the graph's strip
   redraws) are picked up as they appear; when a choice redraws the strip, focus goes to the new picker of the same select. */
function pickerizeAll(){ if(!window.Picker) return; let back=null;
  const go=()=>{ document.querySelectorAll('select:not([data-pk])').forEach(s=>{ if(s.hidden||!s.id) return; s.dataset.pk=1; Picker.attach(s,{keepEmpty:true});
    s.addEventListener('change',()=>{ back={id:s.id,sel:s,t:performance.now()}; }); });
    if(back){ const s=document.getElementById(back.id), b=s&&s!==back.sel&&document.querySelector(`#${back.id} + .pk .pk-btn`);   // the strip redrew: a new select of the same id
      if(b){ if(!document.querySelector('.pk-pan:not([hidden])')) b.focus(); back=null; } else if(performance.now()-back.t>3000) back=null; } };
  go(); new MutationObserver(go).observe(document.body,{childList:true,subtree:true}); }

/* ── data ─────────────────────────────────────────────────────────── */
const Q=new URLSearchParams(location.search), asked=Q.get('data');
/* ?view=map or ?view=graph shows one pane full width as its own page; no view keeps both */
if(Q.get('view')==='corr'){ Q.delete('view'); location.replace('corr.html?'+Q); return; }   // the correspondence page is its own file
const VIEW={map:'map',graph:'graph'}[Q.get('view')]||'map';   // no view: the continuous space, the navigation's first item
pickerizeAll();   // dark picker for every select (item 25)
if(VIEW==='graph'){ await graphV2(); return; }   // the concept graph: network and full structure (the first study's view is retired; ?vocab=first lands here)
const other=(view,concept,more)=>'?'+new URLSearchParams({view,...(asked?{data:asked}:{}),...(concept?{concept}:{}),...(S.model?{model:1}:{}),...more});   // another page, carrying the selection
if(VIEW){ document.body.dataset.view=VIEW;
}
async function load(scale){
  const base=`data/${scale}/`;
  // where the server lists the folder (python's http.server does), absent optional files are not requested, so the console stays clean;
  // without a listing every file is tried and each absent one shows as one 404
  const ls=await fetch(base).then(r=>r.ok?r.text():'').catch(()=>''), listed=ls.includes('.json"');
  const get=f=>listed&&!ls.includes(`"${f}.json"`)?Promise.resolve(null):fetch(base+f+'.json').then(r=>r.ok?r.json():null).catch(()=>null);
  const mf=(ls.match(/"(model_[^"]+)\.json"/)||[])[1]||'model_gemini_37_flash';   // one model profile per folder (contracts: model_<slug>.json)
  const [points,tours,corr,layered,extra,ctx,regions,model,leaves]=await Promise.all(['points','tournaments','corr','graph_layered','case_node','context_looks','regions',mf,'leaves'].map(get));
  // the layered graph and its members win when the folder has them
  const graph=layered||await get('graph'), members=await get(layered?'members_layered':'members');
  if(!points&&!graph) return null;
  const D={base,scale,tours:tours||[],graph:graph||{nodes:[],edges:[]},corr:corr||{},layered:!!layered,noPoints:!points};
  // a folder with a graph but no points still shows the graph: no pages, so no members either (they are page indices)
  D.points=points||{months:Object.keys((D.graph.nodes[0]||{}).supply||{}).sort(),encoders:{none:{x:[],y:[],cluster:[],resid_knn:[]}},pages:[]};
  D.members=points&&members||{}; D.regions=points&&regions; D.model=points&&model; D.leaves=points&&leaves;
  // case_node.json: one node found by the worked example (case.html), added to the graph and marked
  const cn=extra&&(extra.node||extra);
  if(cn&&cn.id&&!D.graph.nodes.some(n=>n.id===cn.id)){ D.graph.nodes.push({type:'composition',supply:{},supply_all:0,...cn,layer:0,_case:1}); D.caseNode=cn; }
  // task categories: context nodes and conditioned_on edges from the graph file; when it has none, built from context_looks.json
  const G=D.graph, looks=new Set(G.nodes.map(n=>n.id));
  if(ctx&&ctx.by_context&&!G.nodes.some(n=>n.type==='context')){ const L=1+Math.max(0,...G.nodes.map(n=>n.layer||0)); D.ctxFromFile=true;
    for(const [k,c] of Object.entries(ctx.by_context)){ const id='ctx_'+k, link=(ids,sign)=>(ids||[]).filter(x=>looks.has(x)).forEach(dst=>{ const r=(c.looks||[]).find(x=>x.id===dst)||{}; G.edges.push({src:id,dst,type:'conditioned_on',sign,shrunk:r.shrunk,n:r.n}); });
      G.nodes.push({id,type:'context',layer:L,name:k,definition:`Task category: pages generated for ${k} prompts.`,supply:{},supply_all:0,n:c.pages}); link(c.recommended,1); link(c.avoid,-1); } }
  // clusters: only the clear and the leaning ones (see `tier`) are part of the graph (user rulings 2026-11-19); the rest are counted, not drawn
  const t5=n=>n.tier?n.tier!=='none':n.pref_lo!=null?(n.pref_lo>0||n.pref_hi<0||Math.abs(n.pref)>1.2816*(n.pref_hi-n.pref_lo)/3.92):!!n.strong;   // clear or leaning
  /* Clusters: every clear or leaning one stays in the graph data; which are on show is decided at run time (`leafShow`), so the filters switch in place.
     Flags: held = sign kept on held-out pages (`conclusion`, else `confirm_same_sign`); task-specific (`subject`); one model's habit (`one_model`). */
  const LF=Object.fromEntries((leaves?leaves.leaves:[]).map(l=>[l.id,l]));
  const lv=G.nodes.filter(n=>n.type==='leaf'), drop=new Set(lv.filter(n=>!t5(n)).map(n=>n.id));
  lv.forEach(n=>{ const l=LF[n.id]||{}; n._held=(l.conclusion??l.confirm_same_sign??(n.confirm||{}).same_sign)!==false; n._subj=!!l.subject; n._tok=l.subject_token; n._tshare=l.subject_share;
    n._one=!!l.one_model; n._tm=l.top_model; n._tms=l.top_model_share; });
  D.leafAll=lv.length; D.leafOk=lv.length-drop.size; D.leafHeld=lv.filter(n=>!drop.has(n.id)&&n._held).length; D.leafPages=leaves&&leaves.pages;
  G.nodes=G.nodes.filter(n=>!drop.has(n.id)); G.edges=G.edges.filter(e=>!drop.has(e.src)&&!drop.has(e.dst));
  return D;
}
// default: pilot when it has points or a graph, else smoke; fixture only with ?data=fixture. Each optional file that is absent shows as one 404 in the console.
const D=asked?await load(asked):await load('pilot')||await load('smoke');
if(!D){ document.querySelector('main').innerHTML=`<div class="empty">No points.json or graph.json found in ${asked?`data/${esc(asked)}/`:'data/pilot/ or data/smoke/'}</div>`; return; }
if(D.noPoints){ document.body.dataset.nopoints=''; $('noPoints').hidden=false;
  $('noPoints').innerHTML=`<span>${esc(D.scale)} embeddings not delivered yet`+(D.scale==='smoke'?'':` · <a href="?${VIEW?'view='+VIEW+'&':''}data=smoke">open the smoke sample</a>`)+'</span>'; }
// two layouts only: the first-screen view of each encoder (the whole-page arrays stay in the file, unused)
const FOLD=Object.keys(D.points.encoders).filter(k=>k.endsWith('__fold'));
const P=D.points.pages, N=P.length, ENC=FOLD.length?Object.fromEntries(FOLD.map(k=>[k,D.points.encoders[k]])):D.points.encoders, GN=D.graph.nodes;
const MONTHS=D.points.months||[...new Set(P.map(p=>p.month))].sort();
const MODELS=[...new Set(P.map(p=>p.model))].sort();
const byId=Object.fromEntries(GN.map(n=>[n.id,n]));
/* regions induced from DINO (regions.json) and one model's sub-space (model_<slug>.json) */
const RG=D.regions, REG=RG?RG.regions:[], regById=Object.fromEntries(REG.map(r=>[r.id,r])), CREG=RG?RG.concept_regions:{};
const MD=D.model, MR=Object.fromEntries((MD&&MD.by_region||[]).map(r=>[r.region,r])), MC=Object.fromEntries((MD?MD.by_concept:[]).map(c=>[c.id,c]));
const LEAF=Object.fromEntries((D.leaves?D.leaves.leaves:[]).map(l=>[l.id,l]));   // leaves.json: the card of each leaf node
const STANDIN=[['regions',RG],['model profile',MD],['clusters',D.leaves]].filter(x=>x[1]&&x[1].standin).map(x=>x[0]);
if(STANDIN.length) $('fixture').innerHTML=`<b>Stand-in data</b> for the ${STANDIN.join(' and the ')}: not real results.`;
$('fixture').hidden=!D.points.fixture&&!STANDIN.length;
if(VIEW==='map') pageHeader('Continuous space','every page placed by its look, <em>green where voters favoured it, red where not</em>.',
  `${N.toLocaleString()} pages from ${D.tours.length.toLocaleString()} tournaments, placed by how their first screen looks. Colour = each page’s place in its tournament; click one to see it.`,
  `<p class="rocount">${N.toLocaleString()} pages · ${D.tours.length.toLocaleString()} tournaments · ${GN.length.toLocaleString()} concepts · ${D.graph.edges.length.toLocaleString()} links · ${esc(D.scale)} data</p>
   <p><b>Position</b>: DINO (or CLIP) vectors of each page's first screen, laid out by t-SNE; positions stay put across months and colour modes.</p>
   <p><b>Placement</b> (default colour): the page's own place in its tournament of four, 1st to 4th; grey where the page has none.</p>
   <p><b>Look's record</b>: for each page, the votes of its 30 nearest look-alikes made in the chosen month, pooled: wins over votes minus 50 %, or with “Beyond model strength” the votes won beyond what each page's model strength predicts, per vote. “All months” is the mean of the monthly values. It is the record of the page's look, not of the page: a page can win its tournament in a look that usually loses. <b>Month shift</b> colours the change in the look's record between two months.</p>`);
if(false) $('sub').textContent=`Each dot is one generated page (${N.toLocaleString()} pages from ${D.tours.length.toLocaleString()} tournaments). Pages that look alike sit close together: position comes from an image model’s reading of the first screen (DINO or CLIP, switch above), not from any label. Colour: green where voters favoured pages that look like this, red where they disfavoured them, grey-blue where there is no lean.`;
else { const ty=t=>GN.filter(n=>n.type===t||(t==='element'&&n.layer===0&&n.type!=='context')).length;
  // the first study's concept-graph header is retired with its view (item 18)
  if(false) $('sub').textContent=`Read left to right: ${ty('element')} single elements combine into ${ty('composition')} combinations and ${ty('style')} whole looks; on the right, ${D.leafAll} clusters found on the continuous map. Dot colour = effect on votes (green wins more, red fewer); lines = “is part of” and “is over-represented in”. Click a node to see its links; the current, deeper structure is one switch away.`; }

$('ro').innerHTML=[['Pages',N||'n/a'],['Tournaments',D.tours.length],['Concepts',GN.length],['Links',D.graph.edges.length],['Data',D.scale]]
  .map(([k,v],i)=>(i?'<div class="sep"></div>':'')+`<div><span>${k}</span><b>${esc(v.toLocaleString())}</b></div>`).join('');

/* ── state ────────────────────────────────────────────────────────── */
const hasPref=Object.values(ENC).every(e=>e.pref), hasCtrl=Object.values(ENC).every(e=>e.pref_ctrl);
const MODES=[['placement','Placement'],...(hasPref?[['pref','Look’s record'],['shift','Month shift']]:[['resid','Observed wins vs expected']]),
  ...(GN.length?[['concept','Concept']]:[])];
const S={enc:Object.keys(ENC)[0], month:null, mode:MODES[0][0], ctrl:false, only:false, from:MONTHS[0], concept:GN[0]&&GN[0].id,
  brush:false, rect:null, sel:null, task:null,
  reg:null,                                             // region whose concepts are ringed in the graph (?region=)
  model:!!MD&&Q.has('model'), prob:null, cmp:false};    // model sub-space on, chosen problem (index), density comparison shown
const encLabel=k=>k.startsWith('dinov2')?'DINO':k.startsWith('clip')?'CLIP':k;
const fill=(el,opts,val)=>{ el.innerHTML=opts.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join(''); el.value=val; };
fill($('enc'),Object.keys(ENC).map(k=>[k,encLabel(k)]),S.enc);
fill($('mode'),MODES,S.mode);
fill($('from'),MONTHS.map(m=>[m,mName(m)]),S.from);
fill($('concept'),GN.map(n=>[n.id,n.name]),S.concept);
// layout and colour are rows of buttons; each drives its (hidden) select
for(const k of ['enc','mode']){ $(k+'B').innerHTML=[...$(k).options].map(o=>`<button class="hbtn" data-v="${esc(o.value)}">${esc(o.text)}</button>`).join('');
  $(k+'B').onclick=e=>{ const v=e.target.dataset.v; if(v!=null){ $(k).value=v; $(k).onchange({target:$(k)}); } }; }
$('segs').innerHTML=MONTHS.map(m=>`<button data-m="${m}" title="${mName(m)}" aria-label="${mName(m)}"></button>`).join('');

/* ── values ───────────────────────────────────────────────────────── */
const cache={};
const memo=(k,f)=>cache[k]||(cache[k]=f());
const prefSet=()=>ENC[S.enc][S.ctrl&&hasCtrl?'pref_ctrl':'pref'];
const prefKey=()=>S.enc+(S.ctrl&&hasCtrl?'|c':'|p');
// "All" = the monthly scores averaged
const prefAll=()=>memo('all|'+prefKey(),()=>{ const ps=prefSet(), o=new Float32Array(N);
  for(const m of MONTHS){ const a=ps[m]; for(let i=0;i<N;i++) o[i]+=a[i]/MONTHS.length; } return o; });
const q98=a=>{ const s=Float32Array.from(a,Math.abs).sort(); return s[Math.floor(s.length*.98)]||1; };
function values(){            // -> {v: array aligned with pages, dom: symmetric colour limit} for the diverging modes
  if(S.mode==='resid') return {v:ENC[S.enc].resid_knn, dom:memo('rd|'+S.enc,()=>q98(ENC[S.enc].resid_knn))};
  const ps=prefSet();
  if(S.mode==='pref') return {v:S.month?ps[S.month]:prefAll(),          // one limit for every month, so months compare
    dom:memo('pd|'+prefKey(),()=>q98(MONTHS.flatMap(m=>Array.from(ps[m]))))};
  const a=ps[S.from], b=ps[S.month], v=memo(`sh|${prefKey()}|${S.from}|${S.month}`,()=>Float32Array.from(b,(x,i)=>x-a[i]));
  return {v, dom:memo(`shd|${prefKey()}|${S.from}|${S.month}`,()=>q98(v))};
}
const DIV=()=>S.mode==='pref'||S.mode==='shift'||S.mode==='resid';
/* task categories: a page's task is its tournament's subcategory; a context node is matched to it by name or id */
const TASK=P.map(p=>(D.tours[p.t]||{}).subcategory||null), TASKSET=new Set(TASK);
const CTX=GN.filter(n=>n.type==='context'), sgnOf=l=>l.sign==='-'||l.sign<0?-1:1;
const ctxKey=n=>[n.name,n.id,n.id.replace(/^(ctx|context)[_:]/,'')].map(x=>String(x).toLowerCase()).find(k=>TASKSET.has(k))||n.name;
const ctxMax=Math.max(1,...CTX.map(n=>n.n||0));
const memberMask=id=>memo('mm|'+id,()=>{ const m=new Uint8Array(N); (D.members[id]||[]).forEach(i=>m[i]=1); return m; });

/* ── map canvas ───────────────────────────────────────────────────── */
const cv=$('map'), g=cv.getContext('2d'), pane=$('mapPane');
let W=1,H=1,dpr=1,kFit=1, X,Y, cam={x:0,y:0,k:1}, PAL=[], buckets=[], dimL=[], order=[], hulls=[], hov=-1, queued=false;
const lit=new Uint8Array(N), times=[];
const dirty=()=>{ if(!queued){ queued=true; requestAnimationFrame(render); } };
function resize(){
  const r=pane.getBoundingClientRect(); if(!r.width) return;
  dpr=Math.min(devicePixelRatio||1,2); W=r.width; H=r.height; cv.width=W*dpr; cv.height=H*dpr;
  pane.style.setProperty('--ctl-b',($('ctl').offsetHeight+22)+'px');
  document.body.style.setProperty('--dock-top',r.top+'px'); document.body.style.setProperty('--dock-h',r.height+'px');   // the docked viewer sits beside the map
  fit(true);   // a size change keeps the reader's pan and zoom
}
/* One coordinate frame per layout, from the pilot pages alone: every mode (all models, one model, filters, highlights) draws in it,
   so switching never moves the background. Pages of the model that fall outside are clamped to its 2% margin. */
const extent=enc=>memo('ext|'+enc,()=>{ const e=ENC[enc]; let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(let i=0;i<N;i++){ if(e.x[i]==null) continue; if(e.x[i]<x0)x0=e.x[i]; if(e.x[i]>x1)x1=e.x[i]; if(e.y[i]<y0)y0=e.y[i]; if(e.y[i]>y1)y1=e.y[i]; }
  return {x0,x1,y0,y1,mx:(x1-x0)*.02,my:(y1-y0)*.02}; });
function fit(keep){
  const {x0,x1,y0,y1}=extent(S.enc);
  const top=$('ctl').offsetHeight+24, pad=18;
  kFit=Math.min((W-pad*2)/(x1-x0||1),(H-top-pad)/(y1-y0||1));
  cam={k:kFit, x:W/2-(x0+x1)/2*kFit, y:top+(H-top-pad)/2-(y0+y1)/2*kFit}; MBASE={...cam}; if(MPZ){ if(keep) mpzView(MPZ.get()); else MPZ.fit(); } dirty();
}
function zoom(f,cx=W/2,cy=H/2){
  const k=Math.max(kFit*.5,Math.min(kFit*40,cam.k*f)); cam.x=cx-(cx-cam.x)*(k/cam.k); cam.y=cy-(cy-cam.y)*(k/cam.k); cam.k=k; dirty();
}
function hull(pts){           // convex hull (monotone chain) of the 90 % of points nearest the median, so strays do not stretch it
  const med=a=>a.slice().sort((p,q)=>p-q)[a.length>>1], mx=med(pts.map(p=>p[0])), my=med(pts.map(p=>p[1]));
  pts=pts.map(p=>[p[0],p[1],Math.hypot(p[0]-mx,p[1]-my)]).sort((a,b)=>a[2]-b[2]).slice(0,Math.ceil(pts.length*.9))
    .sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]), half=ps=>{ const h=[];
    for(const p of ps){ while(h.length>1&&cross(h[h.length-2],h[h.length-1],p)<=0) h.pop(); h.push(p); } h.pop(); return h; };
  return half(pts).concat(half(pts.slice().reverse()));
}
function setEnc(){
  const e=ENC[S.enc]; X=e.x; Y=e.y; S.rect=null; S.sel=null;
  const un=new Set(((D.corr[S.enc]||{}).unexplained)||[]), by={};
  if(un.size) for(let i=0;i<N;i++) if(un.has(e.cluster[i])) (by[e.cluster[i]]=by[e.cluster[i]]||[]).push([X[i],Y[i]]);
  hulls=Object.values(by).filter(p=>p.length>2).map(hull);
  fit(); recolor();
}
function recolor(){           // palette index and lit flag per page, then draw lists per colour
  const col=new Uint16Array(N), e=ENC[S.enc], mem=S.mode==='concept'&&S.concept?memberMask(S.concept):null;
  if(DIV()){ const {v,dom}=values(); PAL=Array.from({length:2*BINS+1},(_,b)=>`rgb(${divRGB(b)})`);
    for(let i=0;i<N;i++) col[i]=divBin(v[i],dom);
    order=PAL.map((_,b)=>b).sort((a,b)=>Math.abs(a-BINS)-Math.abs(b-BINS)); }   // strong colours drawn last, on top
  else { if(S.mode==='placement'){ PAL=placePal(); for(let i=0;i<N;i++) col[i]=P[i].placement?P[i].placement-1:4; }
    else if(S.mode==='model'){ PAL=MODELS.map((_,i)=>hue(i)); const ix=Object.fromEntries(MODELS.map((m,i)=>[m,i])); for(let i=0;i<N;i++) col[i]=ix[P[i].model]; }
    else if(S.mode==='cluster'){ const ks=[...new Set(e.cluster)].sort((a,b)=>a-b), ix=Object.fromEntries(ks.map((k,i)=>[k,i])); PAL=ks.map((_,i)=>hue(i)); for(let i=0;i<N;i++) col[i]=ix[e.cluster[i]]; }
    else PAL=[TH.accent];
    order=PAL.map((_,b)=>b); }
  buckets=PAL.map(()=>[]); dimL=[];
  for(let i=0;i<N;i++){
    lit[i]=!S.model&&(!S.only||!S.month||P[i].month===S.month)&&(!mem||mem[i])&&(!S.task||TASK[i]===S.task)?1:0;
    (lit[i]?buckets[col[i]]:dimL).push(i);
  }
  // placement: the four shades drawn in eight interleaved rounds, so no place is painted over the others (4th last made the map look red)
  if(S.mode==='placement'){ const nb=[], np=[]; for(let c=0;c<8;c++) buckets.forEach((l,b)=>{ nb.push(l.filter((_,j)=>j%8===c)); np.push(PAL[b]); }); buckets=nb; PAL=np; order=nb.map((_,b)=>b); }
  legend(); if(S.sel) region(); dirty();
}
function render(){
  queued=false; const t0=performance.now(), k=cam.k, ox=cam.x, oy=cam.y;
  g.setTransform(dpr,0,0,dpr,0,0); g.fillStyle=TH.ground; g.fillRect(0,0,W,H);
  const s=Math.max(2.5,Math.min(12,3.2*Math.sqrt(k/kFit)*(N>5000?1:1.35)*Math.max(1,Math.min(1.6,Math.sqrt(W*H/(1280*685)))))), h=s/2;
  const put=list=>{ for(let j=0;j<list.length;j++){ const i=list[j], x=X[i]*k+ox, y=Y[i]*k+oy;
    if(x>-s&&x<W+s&&y>-s&&y<H+s) g.fillRect(Math.round(x-h),Math.round(y-h),s,s); } };
  g.globalAlpha=TH.dimA; g.fillStyle=TH.dim; put(dimL);
  g.globalAlpha=TH.litA; for(const b of order) if(buckets[b].length){ g.fillStyle=PAL[b]; put(buckets[b]); }
  if(mOn()){ const mh=h; g.globalAlpha=TH.litA;   // the model's own pages on top of the dimmed pilot: same square, same ramp and limit as the all-models view
    mpages().bins.forEach(([b,list])=>{ g.fillStyle=`rgb(${divRGB(b)})`; for(const p of list) g.fillRect(Math.round(p._x*k+ox-mh),Math.round(p._y*k+oy-mh),s,s); });
    g.globalAlpha=1; if(hovM>=0){ const p=mpages().ps[hovM]; g.strokeStyle=TH.ink; g.lineWidth=1.5; g.strokeRect(p._x*k+ox-mh-2,p._y*k+oy-mh-2,s+4,s+4); } }
  if(S.model&&S.prob!=null) drawProblem(k,ox,oy);
  g.globalAlpha=1; g.lineWidth=1.5; g.strokeStyle=g.fillStyle=TH.amber; g.font='500 11px "Space Grotesk",-apple-system,sans-serif';
  for(const hl of hulls){ g.setLineDash([6,4]); g.beginPath(); hl.forEach((p,i)=>g[i?'lineTo':'moveTo'](p[0]*k+ox,p[1]*k+oy)); g.closePath(); g.stroke();
    const top=hl.reduce((a,p)=>p[1]<a[1]?p:a); g.textAlign='center'; g.fillText('no concept explains this yet',Math.max(84,Math.min(W-84,top[0]*k+ox)),top[1]*k+oy-7); g.textAlign='left'; }
  g.setLineDash([]);
  if(S.rect){ const r=S.rect; g.strokeStyle=TH.ink; g.lineWidth=1.2; g.setLineDash([4,3]);
    g.strokeRect(r.x0*k+ox,r.y0*k+oy,(r.x1-r.x0)*k,(r.y1-r.y0)*k); g.setLineDash([]); }
  if(hov>=0){ g.strokeStyle=TH.ink; g.lineWidth=1.5; g.strokeRect(X[hov]*k+ox-h-2,Y[hov]*k+oy-h-2,s+4,s+4); }
  times.push(performance.now()-t0); if(times.length>600) times.shift();
}

/* ── model sub-space on the map ── */
const MENC=Object.keys(ENC).find(k=>k.startsWith('dinov2'))||Object.keys(ENC)[0];   // the model's pages are placed in the DINO layout (contracts)
/* Model pages, drawn like the all-models view with "Beyond model strength" on: position clamped into the frame; colour = `resid` (votes won minus
   what the model's strength predicts) pooled over the 30 nearest of the model's own pages on the map (itself included), per vote: sum of resid
   over sum of `n_votes`, a page without `n_votes` counting as 3 votes (one tournament of four = three comparisons; on the pilot, resid per page
   spreads 2.7 times as wide as the per-vote score). Same colour limit as `pref_ctrl`. Neighbours are taken on the 2D map: the embedding is not in the browser. */
const mpages=()=>memo('mp',()=>{ const E=extent(MENC), ps=MD.pages.filter(p=>p.x!=null), n=ps.length, K=Math.min(30,n);
  ps.forEach(p=>{ p._x=Math.max(E.x0-E.mx,Math.min(E.x1+E.mx,p.x)); p._y=Math.max(E.y0-E.my,Math.min(E.y1+E.my,p.y)); });
  const o=ps.map((_,i)=>i).sort((a,b)=>ps[a].x-ps[b].x), bd=new Float64Array(K), bv=new Float64Array(K), bn=new Float64Array(K);
  o.forEach((i,r)=>{ const p=ps[i]; let m=0;   // K nearest by a sweep outwards along x, stopping when the x gap alone exceeds the K-th distance
    const put=q=>{ const d=(q.x-p.x)**2+(q.y-p.y)**2; if(m<K||d<bd[m-1]){ let t=m<K?m++:K-1; while(t>0&&bd[t-1]>d){ bd[t]=bd[t-1]; bv[t]=bv[t-1]; bn[t]=bn[t-1]; t--; } bd[t]=d; bv[t]=q.resid; bn[t]=q.n_votes??3; } };
    put(p);
    for(let a=r-1,b=r+1; a>=0||b<n; ){ const da=a>=0?(ps[o[a]].x-p.x)**2:Infinity, db=b<n?(ps[o[b]].x-p.x)**2:Infinity;
      if(m===K&&Math.min(da,db)>bd[K-1]) break; if(da<=db) put(ps[o[a--]]); else put(ps[o[b++]]); }
    let sum=0, nv=0; for(let t=0;t<m;t++){ sum+=bv[t]; nv+=bn[t]; } p._s=nv?sum/nv:0; });
  const ps0=ENC[MENC].pref_ctrl||ENC[MENC].pref, dom=ps0?q98(MONTHS.flatMap(m=>Array.from(ps0[m]))):q98(ps.map(p=>p._s)), by={};
  for(const p of ps) (by[divBin(p._s,dom)]=by[divBin(p._s,dom)]||[]).push(p);
  return {ps,bins:Object.entries(by).map(([b,l])=>[+b,l]).sort((a,b)=>Math.abs(a[0]-BINS)-Math.abs(b[0]-BINS))}; });
const mOn=()=>S.model&&S.enc===MENC;
let hovM=-1;
// the chosen problem's area(s), softly shaded and named; nothing else about regions is drawn on this page (the Correspondence page has them)
function drawProblem(k,ox,oy){
  const pr=MD.problems[S.prob], ids=pr.kind==='region'?[pr.id]:pr.kind==='concept'?(CREG[pr.id]||[]).filter(x=>x.lift>=1.5).slice(0,3).map(x=>x.region):[];
  if(!RG||S.enc!==RG.encoder) return;
  g.font='600 13px "Space Grotesk",-apple-system,sans-serif'; g.textAlign='center';
  for(const r of ids.map(id=>regById[id]).filter(Boolean)){
    if(!r.scattered){ g.beginPath(); r.outline.forEach((p,i)=>g[i?'lineTo':'moveTo'](p[0]*k+ox,p[1]*k+oy)); g.closePath(); g.globalAlpha=.22; g.fillStyle=TH.accent; g.fill(); }
    const x=r.centroid[0]*k+ox, y=r.centroid[1]*k+oy, w=g.measureText(r.label).width/2+5;
    g.globalAlpha=.86; g.fillStyle=TH.g.plate; g.beginPath(); g.roundRect(x-w,y-13,w*2,18,4); g.fill(); g.globalAlpha=1; g.fillStyle=TH.ink; g.fillText(r.label,x,y); }
  g.textAlign='left'; g.globalAlpha=1;
}
function hitM(p){ let best=-1, bd=100; if(mOn()) mpages().ps.forEach((q,j)=>{ const dx=q._x*cam.k+cam.x-p.x, dy=q._y*cam.k+cam.y-p.y, d=dx*dx+dy*dy; if(d<bd){bd=d;best=j;} }); return best; }
function openModelPage(j){ const p=mpages().ps[j], r=regById[p.region];
  $('dt').textContent=MD.model;
  $('db').innerHTML=`<div class="card"><div class="meta">${mName(p.month)} · ${ord(p.placement)} of 4 · <span class="${cls(p.resid)}">${sgn(p.resid)} wins vs expected from model strength</span>${r?' · region “'+esc(r.label)+'”':''}</div>
    <div class="prompt">${esc(p.prompt||'')}</div>${p.thumb?`<img class="one" src="${D.base}thumbs/${esc(p.id)}.webp" alt="Page by ${esc(MD.model)}">`:'<div class="ph">no screenshot</div>'}</div>`;
  dlg.showModal(); }
/* small picture of the DINO map on a canvas: all pilot pages dim, and bright on top either the given points ({x, y}) or the pilot pages of an index list */
function mini(c,pts,idx){
  const e=ENC[RG?RG.encoder:S.enc]||ENC[S.enc], x=c.getContext('2d'), w=c.width, h=c.height;
  const b=extent(RG&&ENC[RG.encoder]?RG.encoder:S.enc);
  const k=Math.min((w-12)/(b.x1-b.x0),(h-12)/(b.y1-b.y0)), ox=w/2-(b.x0+b.x1)/2*k, oy=h/2-(b.y0+b.y1)/2*k, lit=pts||idx;
  x.fillStyle=TH.ground; x.fillRect(0,0,w,h); x.fillStyle=lit?TH.dim:TH.sub; x.globalAlpha=lit?.5:.3;
  for(let i=0;i<N;i++) if(e.x[i]!=null) x.fillRect(e.x[i]*k+ox-1,e.y[i]*k+oy-1,2,2);
  x.fillStyle=TH.accent; x.globalAlpha=.8;
  for(const p of pts||[]) x.fillRect((p._x??p.x)*k+ox-1.5,(p._y??p.y)*k+oy-1.5,3,3);
  for(const i of idx||[]) if(e.x[i]!=null) x.fillRect(e.x[i]*k+ox-1.5,e.y[i]*k+oy-1.5,3,3);
  x.globalAlpha=1;
}

/* ── map pointer: drag pans, drag in select mode (or with Shift) brushes, click opens the tournament ── */
const at=e=>{ const r=cv.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };
function hit(p){
  let best=-1, bd=10*10;
  for(let i=0;i<N;i++){ if(!lit[i]) continue; const dx=X[i]*cam.k+cam.x-p.x, dy=Y[i]*cam.k+cam.y-p.y, d=dx*dx+dy*dy; if(d<bd){bd=d;best=i;} }
  return best;
}
const HC=HoverCard.attach(cv,{width:340}), tip={hide:HC.hide}; HC.el.id='mtip';   // the id the checks read the map's card by   // the site's shared hover card (hovercard.js), 340 px on this page (item 34c)
function showTip(i,e){ const p=P[i], L=lookReading(i), c=clash(i);   // two separately labelled readings (item 32)
  HC.show(e,{img:p.thumb?`${D.base}thumbs/${p.id}.webp`:'', title:`${esc(p.model)} <span class="hc-m">· made ${mName(p.month,true)}</span>`, lines:[ownReading(i),...(L?[L.html]:[])], extra:c?`<em class="tv-clash">${c}</em>`:''}); }
function showTipM(j,e){ const p=mpages().ps[j];
  HC.show(e,{img:p.thumb?`${D.base}thumbs/${p.id}.webp`:'', title:esc(MD.model), lines:[`<b>this page:</b> <span class="place-${p.placement||0}">${ord(p.placement)} of 4</span> · made ${mName(p.month,true)}`,`<b>its look:</b> ${sgn(p._s)} per vote beyond model strength, over its 30 nearest pages of this model`]}); }
const ord=n=>['1st','2nd','3rd','4th'][n-1]||n;
/* the four placement shades come from page.css (--place-1 strong green .. --place-4 strong red), one definition for the site */
const placePal=()=>{ const cs=getComputedStyle(document.documentElement), f=['#2fbf71','#9fe0b6','#f2a3a3','#e0453a'];
  return [...f.map((d,i)=>cs.getPropertyValue('--place-'+(i+1)).trim()||d),'#7d8597']; };
const dotColour=j=>{ if(DIV()){ const d=values(), v=d.v[j]; return v==null?placePal()[4]:`rgb(${divRGB(divBin(v,d.dom))})`; } return placePal()[(P[j].placement||5)-1]; };
const valueLabel=()=>S.mode==='shift'?'shift':S.mode==='pref'?'score':'wins vs expected';
let ptr=null;
cv.addEventListener('pointerdown',e=>{ cv.setPointerCapture(e.pointerId); const p=at(e);
  ptr={x:p.x,y:p.y,x0:p.x,y0:p.y,moved:0,brush:S.brush||e.shiftKey}; });
cv.addEventListener('pointermove',e=>{ const p=at(e);
  if(!ptr){ const i=hit(p); if(i!==hov){ hov=i; dirty(); } if(i>=0) showTip(i,e); else tip.hide();
    if(S.model){ const j=hitM(p); if(j!==hovM){ hovM=j; dirty(); } if(j>=0) showTipM(j,e); } return; }
  ptr.moved+=Math.abs(p.x-ptr.x)+Math.abs(p.y-ptr.y); tip.hide();
  if(ptr.brush){ const w=q=>[(q[0]-cam.x)/cam.k,(q[1]-cam.y)/cam.k], a=w([ptr.x0,ptr.y0]), b=w([p.x,p.y]);
    S.rect={x0:Math.min(a[0],b[0]),y0:Math.min(a[1],b[1]),x1:Math.max(a[0],b[0]),y1:Math.max(a[1],b[1])}; }
  ptr.x=p.x; ptr.y=p.y; dirty(); });   // panning is the shared pan-zoom's
cv.addEventListener('pointerup',e=>{ const was=ptr; ptr=null; if(!was) return;
  if(was.moved<5){ const p=at(e), i=hit(p); if(S.model&&hitM(p)>=0) openModelPage(hitM(p)); else if(i>=0) openPage(i); else if(S.rect){ S.rect=null; S.sel=null; region(); dirty(); } else if(S.prob!=null){ S.prob=null; sync(); } }
  else if(was.brush){ setBrush(false); region(); } });
/* item 32: two readings wherever a page is shown. The dot's colour is the record of the page's LOOK (its 30 nearest pages of the
   month, pooled), not the page's own result; the page's own result is its placement and its own votes against its model's strength. */
function lookReading(i){ const d=DIV()?values():null; if(!d||d.v[i]==null) return null; const v=d.v[i], m=S.month?' in '+mName(S.month,true):'';
  const what=S.mode==='shift'?`pages that look like it ${v<0?'lost':'gained'} favour from ${mName(S.from,true)} to ${S.month?mName(S.month,true):''}`
    :S.mode==='resid'||S.ctrl&&hasCtrl?`pages that look like it win ${v<0?'fewer':'more'} votes than their models’ strength predicts${m}`
    :`pages that look like it win ${v<0?'less':'more'} than half their votes${m}`;
  return {v, html:`<b>its look:</b> <span style="color:${dotColour(i)}">${sgn(v)}</span> (${what})`, txt:`its look: ${sgn(v)} (${what})`}; }
const votes=p=>p.n_votes!=null?`won ${p.wins} of ${p.n_votes} vote${p.n_votes===1?'':'s'}`:'';   // the page's own votes (points.json wins / n_votes)
function ownReading(i){ const p=P[i]; return `<b>this page:</b> <span class="place-${p.placement||0}">${ord(p.placement)} of 4</span>${votes(p)?' · '+votes(p):''}${p.resid!=null?` · ${sgn(p.resid)} vs what its model’s strength predicts`:''}`; }
function clash(i){ const L=lookReading(i), pl=P[i].placement; if(!L||!pl) return '';
  return pl===1&&L.v<0?'Placed 1st, in a look that usually loses.':pl===4&&L.v>0?'Placed 4th, in a look that usually wins.':''; }
/* item 33: the viewer shows the whole tournament: the task, the four outputs (model, placement, own result, dot colour), the page
   large; a second row of the pages that look like it. Left / right move along the row that holds the page; a click shows any page. */
let TV=null;
function openPage(i){ const near=[];
  for(let j=0;j<N;j++){ if(!lit[j]||j===i||X[j]==null||!P[j].thumb) continue; near.push([(X[j]-X[i])**2+(Y[j]-Y[i])**2,j]); }
  near.sort((a,b)=>a[0]-b[0]); TV={home:i,cur:i,near:near.slice(0,10).map(x=>x[1])}; tvInit(); tvDraw(); if(dlg.open) return;
  if(innerWidth>=2400){ dlg.classList.add('dock'); document.body.classList.add('tv-docked'); dlg.show(); } else dlg.showModal(); }
function tvDraw(){ pgSave(); const i=TV.cur, t=D.tours[P[i].t]||{pages:[i]}, L=lookReading(i), c=clash(i), d=DIV()?values():null, row=t.pages.includes(i)?'t':'n';
  const pr=String(t.prompt||''), long=pr.length>300;
  const th=j=>{ const p=P[j], v=d&&d.v[j]; return `<button class="tv-o${j===i?' cur':''}" data-tv="${j}" title="${esc(p.model)}, ${ord(p.placement)} of 4">${p.thumb?`<img loading="lazy" src="${D.base}thumbs/${esc(p.id)}.webp" alt="">`:'<div class="ph">no screenshot</div>'}
    <span class="tv-m"><span class="badge p${p.placement}">${ord(p.placement)}</span>${esc(p.model)}</span><s><i class="tv-dot" style="background:${dotColour(j)}" title="its dot on the map"></i><span>${[votes(p),p.resid!=null?`${sgn(p.resid)} vs model`:''].filter(Boolean).join(' · ')}</span></s></button>`; };
  $('dt').textContent='Tournament';
  $('db').innerHTML=`<div class="tv"><div class="tv-task"><span class="tv-meta">${esc(t.subcategory||'')} · ${t.month?mName(t.month):''}</span>
      <p class="tv-q" dir="auto">${esc(long?pr.slice(0,300)+'…':pr)}${long?' <button class="tv-more">more</button>':''}</p></div>
    <figure class="tv-big">${P[i].thumb?`<img src="${D.base}thumbs/${esc(P[i].id)}.webp" alt="Page by ${esc(P[i].model)}">`:'<div class="ph">no screenshot</div>'}
      <figcaption><b>${esc(P[i].model)}</b> · made ${mName(P[i].month,true)}${i===TV.home?'':' · <a href="#" class="tv-home">back to the page you opened</a>'}<br>${ownReading(i)}${L?'<br>'+L.html:''}${c?`<br><em class="tv-clash">${c}</em>`:''}</figcaption></figure>
    <div class="tv-row tv-t${row==='t'?' on':''}"><h4>This tournament</h4><div class="tv-strip">${t.pages.map(j=>th(j)).join('')}</div></div>
    <div class="tv-row tv-n${row==='n'?' on':''}"><h4>Pages that look like it</h4><div class="tv-strip">${[TV.home,...TV.near].filter((j,k,a)=>a.indexOf(j)===k).map(j=>th(j)).join('')}</div></div>
    <p class="tv-key">← → move along the row that holds the page · square = the page’s dot on the map (${DIV()?'colour = its look’s record, not its own placement':'colour = its place in its tournament'}) · “vs model” = votes won beyond what its model’s strength predicts</p></div>`;
  const mo=$('db').querySelector('.tv-more'); if(mo) mo.onclick=()=>{ $('db').querySelector('.tv-q').textContent=pr; };
  const hm=$('db').querySelector('.tv-home'); if(hm) hm.onclick=e=>{ e.preventDefault(); TV.cur=TV.home; tvDraw(); }; }
function tvInit(){ if(tvInit.done) return; tvInit.done=1;   // the dialog is declared further down: wired on first use
$('db').addEventListener('click',e=>{ const b=e.target.closest('[data-tv]'); if(!b||!TV) return; TV.cur=+b.dataset.tv; tvDraw(); });
dlg.addEventListener('keydown',e=>{ if(!TV||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')) return; e.preventDefault(); const t=D.tours[P[TV.cur].t]||{pages:[]};
  const row=t.pages.includes(TV.cur)?t.pages:[TV.home,...TV.near], k=row.indexOf(TV.cur); TV.cur=row[(k+(e.key==='ArrowRight'?1:-1)+row.length)%row.length]; tvDraw(); });
dlg.addEventListener('close',()=>{ TV=null; pgSave(); dlg.classList.remove('dock'); document.body.classList.remove('tv-docked'); });
addEventListener('keydown',e=>{ if(e.key==='Escape'&&dlg.open&&dlg.classList.contains('dock')){ e.preventDefault(); dlg.close(); } }); }
cv.addEventListener('wheel',()=>tip.hide(),{passive:true});
cv.addEventListener('pointerleave',()=>{ tip.hide(); hovM=-1; if(hov>=0){ hov=-1; dirty(); } });
var MBASE=null, MPZ=null;
function mpzView(v){ if(!MBASE) return; const cx=W/2, cy=H/2; cam={k:MBASE.k*v.z,x:(MBASE.x-cx)*v.z+cx+v.x,y:(MBASE.y-cy)*v.z+cy+v.y}; dirty(); pgSave(); }
MPZ=PanZoom.attach(cv,{min:.6,max:40,onChange:mpzView,isNode:e=>hit(at(e))>=0});
new ResizeObserver(()=>resize()).observe(pane);   // the pane changes size with the window, the dock and the frame
if(window.PgFrame) PgFrame.fit(document.querySelector('.pg-frame>main'));   // item 81: the map fills the viewport below the controls
// a brush drag belongs to the brush: the pan-zoom does not see it
pane.addEventListener('pointerdown',e=>{ if(e.target===cv&&(S.brush||e.shiftKey)){ e.stopPropagation(); cv.setPointerCapture(e.pointerId); const p=at(e); ptr={x:p.x,y:p.y,x0:p.x,y0:p.y,moved:0,brush:true}; } },true);
pane.addEventListener('pointermove',e=>{ if(ptr&&ptr.brush){ e.stopPropagation(); const p=at(e); ptr.moved+=Math.abs(p.x-ptr.x)+Math.abs(p.y-ptr.y);
  const w=q=>[(q[0]-cam.x)/cam.k,(q[1]-cam.y)/cam.k], a=w([ptr.x0,ptr.y0]), b=w([p.x,p.y]); S.rect={x0:Math.min(a[0],b[0]),y0:Math.min(a[1],b[1]),x1:Math.max(a[0],b[0]),y1:Math.max(a[1],b[1])}; ptr.x=p.x; ptr.y=p.y; dirty(); } },true);
pane.addEventListener('pointerup',e=>{ if(ptr&&ptr.brush){ e.stopPropagation(); const was=ptr; ptr=null; if(was.moved>=5){ setBrush(false); region(); } } },true);

function setBrush(on){ S.brush=on; $('brush').classList.toggle('on',on); cv.classList.toggle('brush',on);
  $('brush').textContent=on?'Drag on the map…':'Select region'; }
$('brush').onclick=()=>setBrush(!S.brush);

/* ── brushed region: which concepts fill it, and how its pages fare ── */
function region(){
  const r=S.rect, box=$('region'); if(!r){ box.hidden=true; return; }
  const inside=new Uint8Array(N); let n=0, pop=0, rs=0, vs=0; const d=DIV()?values():null;
  const inM=i=>!S.only||!S.month||P[i].month===S.month;   // the concept highlight does not narrow the comparison
  for(let i=0;i<N;i++){ if(!inM(i)) continue; pop++;
    if(X[i]>=r.x0&&X[i]<=r.x1&&Y[i]>=r.y0&&Y[i]<=r.y1){ inside[i]=1; n++; rs+=P[i].resid; if(d) vs+=d.v[i]; } }
  S.sel=inside; pgSave();
  const rows=GN.map(c=>{ let a=0,b=0; for(const i of D.members[c.id]||[]) if(inM(i)) inside[i]?a++:b++;
    return {c,a,inn:n?a/n:0,out:pop>n?b/(pop-n):0}; }).filter(x=>x.a&&x.inn>x.out).sort((x,y)=>y.inn/(y.out||1e-9)-x.inn/(x.out||1e-9));
  const stat=(t,v)=>`<div class="stat"><span>${t}</span><b class="${cls(v)}">${sgn(v)}</b></div>`;
  box.innerHTML=`<button class="hbtn x">Clear</button><h3>${n.toLocaleString()} pages selected</h3>`+(n?
    (S.mode==='shift'?stat(`Mean shift, ${mName(S.from,true)} → ${mName(S.month,true)}`,vs/n):S.mode==='pref'?stat(`Mean of the look’s record, ${S.month?mName(S.month,true):'all months'}`,vs/n):'')+
    stat('Mean wins vs expected, per page',rs/n)+
    (rows.length?`<table><tr><td><b>More common here than elsewhere</b></td><td class="n">here · elsewhere</td></tr>`+
      rows.map(x=>`<tr class="go" data-go="${esc(x.c.id)}"><td>${esc(x.c.name)}</td><td class="n">${pct(x.inn)} · ${pct(x.out)}${x.out?' · '+(x.inn/x.out).toFixed(1)+'×':''}</td></tr>`).join('')+'</table>'
      :(GN.length?'<p>No concept is more common here than elsewhere.</p>':''))+(VIEW&&rows.length?'<p>Click a concept to open it in the concept graph →</p>':''):'<p>No pages inside the rectangle.</p>');
  box.hidden=false;
}
$('region').addEventListener('click',e=>{
  if(e.target.closest('.x')){ S.rect=null; S.sel=null; region(); dirty(); return; }
  const go=e.target.closest('[data-go]'); if(go){ location.href=other('graph',go.dataset.go); } });

/* ── tournament card ──────────────────────────────────────────────── */
const dlg=document.querySelector('dialog.sm-dlg');
function openCard(i){
  const t=D.tours[P[i].t]; if(!t) return;
  $('dt').textContent='Tournament';
  $('db').innerHTML=`<div class="card"><div class="meta">${mName(t.month)} · ${esc(t.subcategory||'')} · four models answered this prompt, voters ranked them</div>
    <div class="prompt">${esc(t.prompt)}</div><div class="four">`+t.pages.map(j=>{ const p=P[j];
      return `<figure class="${j===i?'cur':''}">${p.thumb?`<img loading="lazy" src="${D.base}thumbs/${esc(p.id)}.webp" alt="Page by ${esc(p.model)}">`:'<div class="ph">no screenshot</div>'}
        <figcaption><span class="badge p${p.placement}">${ord(p.placement)}</span>${esc(p.model)}<s class="${cls(p.resid)}">${sgn(p.resid)} wins vs expected from model strength</s></figcaption></figure>`; }).join('')+'</div></div>';
  dlg.showModal();
}

/* ── legends ──────────────────────────────────────────────────────── */
function legend(){
  const sw=c=>`<i class="sw" style="background:${c}"></i>`, m=S.month?mName(S.month):null;
  let colour, key;
  if(DIV()){ const {dom}=values(), words={
      pref:[`how ${m?m+'’s voters':'voters, averaged over the months,'} treated the pages that look most like this one (colour = the look’s record, not the page’s own placement; a page can win its tournament in a look that usually loses): ${S.ctrl?'wins beyond what model strength predicts, per vote,':'win rate minus 50%'} over its 30 nearest look-alikes made ${m?'that month':'in each month'}. Every page is coloured, whatever month it was made in.`,'disfavoured','favoured'],
      shift:[`change in the look’s record from ${mName(S.from)} to ${m}${S.ctrl?', model strength removed':''}.`,'lost favour','gained favour'],
      resid:['votes won minus the votes its model’s strength predicts, averaged over the 30 most similar pages.','wins fewer','wins more']}[S.mode];
    colour=`<p><b>Colour</b> = ${words[0]}</p><div class="ramp" style="background:${rampCSS()}"></div>
      <div class="ends"><span>−${dom.toFixed(2)} ${words[1]}</span><span>0</span><span>${words[2]} +${dom.toFixed(2)}</span></div>`;
    key=`${{pref:'Colour = the look’s record, not the page’s own placement:',shift:'Colour = change in the look’s record:',resid:''}[S.mode]} ${words[1]} <i class="ramp" style="background:${rampCSS()}"></i> ${words[2]}`; }
  else if(S.mode==='placement'){ const pl=placePal(); key=pl.slice(0,4).map((c,i)=>`<span class="it">${sw(c)}${ord(i+1)}</span>`).join('')+' in its tournament'; colour='<p><b>Colour</b> = the page’s own place in its tournament of four: '+pl.slice(0,4).map((c,i)=>`<span class="it">${sw(c)}${ord(i+1)}</span>`).join('')+' (grey: no placement). “Look’s record” colours each page instead by how voters treated the pages that look like it.</p>'; }
  else if(S.mode==='model'){ key='one colour per model'; colour='<p><b>Colour</b> = the model that generated the page</p><p>'+MODELS.map((x,i)=>`<span class="it">${sw(PAL[i])}${esc(x)}</span>`).join('')+'</p>'; }
  else if(S.mode==='cluster'){ key='one colour per group of similar pages'; colour=`<p><b>Colour</b> = one of ${PAL.length} groups of similar-looking pages (k-means on the image vectors)</p>`; }
  else { key=`${sw(TH.accent)}has “${esc((byId[S.concept]||{}).name||'')}”`; colour=`<p>${sw(TH.accent)}<b>Lit</b> = pages that have this concept; the rest are faded.</p>`; }
  $('mapKey').innerHTML=key;
  $('mapLegendBody').innerHTML=`<p><b>Each square</b> is one generated page. Pages that look alike sit close together; positions stay put when the month changes.</p>${colour}`+
    (S.only&&S.month?`<p>${sw(TH.dim)}Faded = made in another month</p>`:'')+(S.task?`<p>${sw(TH.dim)}Faded = pages of other tasks than ${esc(S.task)}</p>`:'')+
    (hulls.length?`<p><svg width="26" height="10"><rect x="1" y="1" width="24" height="8" fill="none" stroke="${TH.amber}" stroke-dasharray="4 3"/></svg> Dashed outline = a group no concept explains yet</p>`:'')+
    (S.model?`<p><b>${esc(MD.model)}</b>: its ${MD.pages.length.toLocaleString()} pages are the bright squares, coloured beyond model strength on the same scale and limit as that all-models view: votes won minus what the model’s strength predicts, per vote, pooled over each page’s 30 nearest pages of this model. So green = where this model does better than its own average, red = worse. Neighbours are the nearest on this 2D map (the image vectors are not loaded in the browser)${MD.pages.some(p=>p.n_votes!=null)?'':'; the file has no vote counts per page, so each page counts as three votes (one tournament of four)'}. Every other page is dimmed. Blue patch = the area of the problem chosen in the list.</p>`:'');
}
const TYPE_WORD={context:'what the page is for',primitive:'a single visible element',structure:'a layout block',relation:'how two elements sit together',
  composition:'concepts used together',style:'a whole look',failure:'something broken'};
const EDGE={composed_of:{t:'is part of',dash:[],arrow:true}, is_a:{t:'is a kind of',dash:[],arrow:true,over:'Is a kind of'},
  conditioned_on:{t:'task routing: a task to the looks that win (green) or lose (red) for it; thick when the interval excludes zero',dash:[],arrow:false,over:'Task routing'}, contrasts_with:{t:'excludes',dash:[2,4],arrow:false,over:'Excludes'},
  co_occurs:{t:'often together with',dash:[5,4],arrow:false,thin:true,over:'Often together'},
  realised_in:{t:'is over-represented in the cluster',dash:[],arrow:false,thin:true,over:'Into clusters'}};
/* ── controls ─────────────────────────────────────────────────────── */
function setConcept(id){ S.concept=id; $('concept').value=id; if(S.mode!=='concept'){ S.mode='concept'; $('mode').value='concept'; } sync(); }
function sync(){              // one place where state reaches the controls, the map and the graph
  setTimeout(()=>urlSync(true)); pgSave();
  if(S.mode==='shift'&&!S.month) S.month=MONTHS[MONTHS.length-1];
  $('mTitle').textContent=S.mode==='shift'?`to ${mName(S.month,true)}`:S.month?mName(S.month,true):'All months';
  const mi=MONTHS.indexOf(S.month);
  [...$('segs').children].forEach((b,i)=>b.classList.toggle('on',mi<0||i<=mi));
  $('mAll').classList.toggle('on',!S.month); $('mAll').hidden=S.mode==='shift';
  $('fromL').hidden=S.mode!=='shift'; $('conceptL').hidden=S.mode!=='concept';
  $('toGraph').hidden=VIEW!=='map'||S.mode!=='concept'; $('toGraph').href=other('graph',S.concept);
  document.querySelectorAll('[data-mod]').forEach(b=>b.classList.toggle('on',(b.dataset.mod==='1')===S.model));
  $('modelL').hidden=!MD;
  problems();
  $('ctrlL').hidden=!hasCtrl||(S.mode!=='pref'&&S.mode!=='shift'); $('onlyL').hidden=!S.month;
  const capAll=`Each dot is one generated page (${N.toLocaleString()} pages from ${D.tours.length.toLocaleString()} tournaments, ${D.scale} sample), placed by how its first screen looks. `+
    ({pref:'Green = looks that voters favoured'+(S.month?' in '+mName(S.month):', averaged over the months')+'; red = disfavoured; grey-blue = no lean.',
      shift:`Green = gained favour from ${mName(S.from,true)} to ${S.month?mName(S.month,true):''}; red = lost favour.`,
      concept:'Bright = pages that have the chosen concept.',resid:'Green = wins more votes than its model’s strength predicts; red = fewer.'}[S.model?'':S.mode]||'')+(S.task&&!S.model?` Only ${S.task} pages are lit.`:'');
  // with a model chosen the caption is replaced, not lengthened: it stays one line, so the strip keeps its height and the map its frame
  $('mapCap').textContent=!S.model?capAll:mOn()?`Dim = all ${N.toLocaleString()} pilot pages. Bright = ${MD.model}’s ${MD.pages.length.toLocaleString()} pages, beyond model strength (locked on): green where it does better than its own average, red where worse; same scale.`
    :`Dim = all pilot pages. ${MD.model}’s pages are placed in the DINO layout only: choose DINO to see them.`;
  $('mapCap').title=$('mapCap').textContent;
  [...$('tasks').children].forEach(b=>b.classList.toggle('on',(b.dataset.task||null)===S.task));
  if($('mtask')&&$('mtask').value!==(S.task||'')){ $('mtask').value=S.task||''; window.Picker&&Picker.all.forEach(p=>p.refresh&&p.refresh()); }
  for(const k of ['enc','mode']) [...$(k+'B').children].forEach(b=>b.classList.toggle('on',b.dataset.v===S[k]));
  recolor();
}
const setMonth=m=>{ S.month=m; sync(); };
$('mPrev').onclick=()=>{ const i=MONTHS.indexOf(S.month); setMonth(MONTHS[i<0?MONTHS.length-1:Math.max(0,i-1)]); };
$('mNext').onclick=()=>{ const i=MONTHS.indexOf(S.month); setMonth(MONTHS[Math.min(MONTHS.length-1,i+1)]); };
$('mAll').onclick=()=>setMonth(null);
$('segs').onclick=e=>{ const m=e.target.dataset.m; if(m) setMonth(m===S.month&&S.mode!=='shift'?null:m); };   // the chosen month again: all months
$('enc').onchange=e=>{ S.enc=e.target.value; setEnc(); region(); sync(); };
$('mode').onchange=e=>{ S.mode=e.target.value; sync(); };
$('from').onchange=e=>{ S.from=e.target.value; sync(); };
$('concept').onchange=e=>{ S.concept=e.target.value; sync(); };
$('ctrl').onchange=e=>{ S.ctrl=e.target.checked; sync(); };
$('only').onchange=e=>{ S.only=e.target.checked; sync(); };
/* model sub-space: the switch (map and graph), the problems list, the two density pictures.
   A model's pages are coloured beyond model strength, so that toggle is on and locked while a model is chosen (the earlier choice comes back after). */
function setModel(on){ if(on) S._ctrl=S.ctrl; S.model=on; S.ctrl=on?true:!!S._ctrl; S.prob=null; hovM=-1; $('ctrl').checked=S.ctrl; $('ctrl').disabled=on; }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-mod]'); if(b&&(b.dataset.mod==='1')!==S.model){ setModel(b.dataset.mod==='1'); sync(); }
  if(e.target.id==='gRegX'){ S.reg=null; sync(); } });
if(MD) document.querySelector('#modelB [data-mod="1"]').textContent=MD.model;
function problems(){ const box=$('probs'); box.hidden=!S.model; if(!S.model) return;
  // evidence: a sentence as given, or the profile's numbers (share against the others, own effect with interval, pages; the same on the confirm set)
  const nums=x=>[x.model_share!=null&&`${pct(x.model_share)} of its pages vs ${pct(x.overall_share)} of the others’`+(x.ratio!=null?` (${x.ratio}×)`:''),
    x.model_pref!=null&&`own effect ${pp(x.model_pref)} pp [${pp(x.model_lo)}, ${pp(x.model_hi)}]`,x.n!=null&&`${x.n.toLocaleString()} pages`].filter(Boolean).join(' · ');
  const ev=x=>typeof x==='string'?x:x?nums(x)+(x.confirm?' · confirm set: '+nums(x.confirm):''):'';
  const gid=p=>p.kind==='concept'?(byId[p.id]&&p.id):p.kind==='task'?(CTX.find(n=>ctxKey(n)===p.id||n.id===p.id)||{}).id:null;
  box.innerHTML=(S.cmp?`<div class="two"><figure><canvas id="cmpA" width="280" height="200"></canvas><figcaption>All models · ${N.toLocaleString()} pages</figcaption></figure>
      <figure><canvas id="cmpM" width="280" height="200"></canvas><figcaption>${esc(MD.model)} · ${MD.pages.length.toLocaleString()} pages</figcaption></figure></div>`:'')+
    `<button class="hbtn${S.cmp?' on':''}" id="cmpB">Compare densities</button><h3>This model’s problems</h3>`+(MD.problems.length?`<ol>${MD.problems.map((p,i)=>`<li class="${i===S.prob?'on':''}" data-prob="${i}"><b>${esc(p.statement)}</b><span>${esc(ev(p.evidence))}</span>${
      i===S.prob?`<em>${p.kind==='region'?(regById[p.id]?'Shaded on the map: “'+esc(regById[p.id].label)+'”.':'')
        :p.kind==='concept'?(CREG[p.id]?'Its areas are shaded on the map. ':''):''}${gid(p)?`<a data-gograph="${esc(gid(p))}" href="${other('graph',gid(p))}">Open it in the concept graph →</a>`:''}</em>`:''}</li>`).join('')}</ol>
      <p>Ranked by the profile; click one to see where it sits.</p>`:'<p>The profile lists none.</p>');
  if(S.cmp){ mini($('cmpA')); mini($('cmpM'),mpages().ps); }
}
$('probs').onclick=e=>{ if(e.target.id==='cmpB'){ S.cmp=!S.cmp; sync(); return; } const a=e.target.closest('[data-gograph]'); if(a) return;
  const li=e.target.closest('[data-prob]'); if(li){ const i=+li.dataset.prob; S.prob=S.prob===i?null:i; sync(); } };
function mapChrome(){ const t=document.querySelector('#ctrlrow .tools'), ctl=$('ctl'); if(!t||!ctl) return;
  const sel=document.createElement('select'); sel.id='mtask'; sel.setAttribute('aria-label','Task');
  sel.innerHTML='<option value="">All tasks</option>'+CTX.map(n=>`<option value="${esc(ctxKey(n))}">${esc(n.name)}</option>`).join(''); sel.value=S.task||'';
  sel.onchange=()=>{ S.task=sel.value||null; sync(); }; const lab=document.createElement('label'); lab.className='mtaskL'; lab.append('Task ',sel);
  // one row in the order of item 48 (Reset view is put first by headerTools); a mode's own extra control sits beside what it qualifies
  const op=ctl.querySelector('.opts'), mo=ctl.querySelector('.mo'); op.prepend($('modeB'),$('conceptL'),$('encB'),$('fromL'),mo,lab);
  t.append(op); ctl.hidden=true;
  // the toggles that refine the colour or the lit pages sit in the map's top-left corner, shown only in the modes that have them
  const mo2=document.createElement('div'); mo2.className='mapopts'; mo2.append($('ctrlL'),$('onlyL'),$('toGraph')); pane.append(mo2); $('tasks').hidden=true; $('tasks').classList.add('gone');
}
function setTab(t){ document.body.dataset.tab=t; document.querySelectorAll('.tabs .hbtn').forEach(b=>b.classList.toggle('on',b.dataset.tab===t)); dispatchEvent(new Event('resize')); }
document.querySelectorAll('.tabs .hbtn').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('theme').onclick=()=>{ const dark=root.dataset.theme!=='dark'; root.dataset.theme=dark?'dark':'light'; $('theme').textContent=dark?'Light':'Dark';
  TH=THEMES[root.dataset.theme]; Object.assign(GTH,TH.g); recolor(); };
addEventListener('resize',resize);

// one row of task buttons for both pages: lights task -> looks -> elements on the graph and filters the map to that task's pages
if(CTX.length){ $('tasks').hidden=false;
  $('tasks').innerHTML='<span>Task</span><button class="hbtn" data-task="">All</button>'+CTX.map(n=>`<button class="hbtn" data-task="${esc(ctxKey(n))}" data-id="${esc(n.id)}">${esc(n.name)}</button>`).join('');
  $('tasks').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; S.task=b.dataset.task&&b.dataset.task!==S.task?b.dataset.task:null;   // the chosen task again: back to All
    sync(); }; }
mapChrome();
setEnc(); setTab(VIEW||'map'); sync();
document.fonts.ready.then(resize);   // once more when the fonts are in and the controls have their final height, so the frame never depends on load timing
const c0=Q.get('concept'); if(byId[c0]) setConcept(c0);   // selection handed over by URL
if(S.model){ setModel(true); sync(); }   // ?model=1
/* state in the URL; Back undoes the last change; Reset view and Escape return to a fresh load's state */
var NOURL=false, URLREADY=false;   // var: urlSync may be called while the page starts, before this line
function urlSync(push){ if(NOURL) return; push=push&&URLREADY; const q=new URLSearchParams(); q.set('view','map'); if(asked) q.set('data',asked);
  { if(S.enc!==Object.keys(ENC)[0]) q.set('enc',S.enc); if(S.mode!==MODES[0][0]) q.set('mode',S.mode); if(S.month) q.set('month',S.month); if(S.ctrl&&!S.model) q.set('ctrl','1'); if(S.only) q.set('only','1');
    if(S.mode==='shift'&&S.from!==MONTHS[0]) q.set('from',S.from); if(S.mode==='concept') q.set('concept',S.concept); if(S.task) q.set('task',S.task); if(S.prob!=null) q.set('prob',S.prob); }
  if(S.model) q.set('model','1'); if(S.reg!=null) q.set('region',S.reg);
  const u='?'+q; if(u!==location.search) history[push?'pushState':'replaceState'](null,'',u); }
function resetAll(apply){ NOURL=true; dlg.open&&dlg.close(); LB.close&&LB.close();
  S.task=null; S.reg=null; if(S.model) setModel(false); S.month=null; S.mode=MODES[0][0]; S.enc=Object.keys(ENC)[0]; S.ctrl=false; S.only=false; S.from=MONTHS[0]; S.concept=GN[0]&&GN[0].id; S.prob=null; S.cmp=false;
  $('ctrl').checked=false; $('only').checked=false; [['enc',S.enc],['mode',S.mode],['from',S.from],['concept',S.concept]].forEach(([k,v])=>{ $(k).value=v; });
  if(S.rect){ S.rect=null; S.sel=null; region(); } setBrush(false); setEnc(); sync(); 
  if(apply) apply(); NOURL=false; fit(); urlSync(!apply); }
function fromURL(){ const q=new URLSearchParams(location.search);
  { if(q.get('enc')&&ENC[q.get('enc')]){ S.enc=q.get('enc'); $('enc').value=S.enc; setEnc(); } if(q.get('mode')){ S.mode=q.get('mode'); $('mode').value=S.mode; }
    if(q.get('month')) S.month=q.get('month'); if(q.get('ctrl')) { S.ctrl=true; $('ctrl').checked=true; } if(q.get('only')){ S.only=true; $('only').checked=true; } if(q.get('from')){ S.from=q.get('from'); $('from').value=S.from; }
    if(q.get('concept')&&byId[q.get('concept')]){ S.concept=q.get('concept'); $('concept').value=S.concept; } if(q.get('task')) S.task=q.get('task'); if(q.get('model')==='1'&&MD) setModel(true); if(q.get('prob')!=null) S.prob=+q.get('prob'); sync(); } }
addEventListener('popstate',()=>resetAll(fromURL));
headerTools(()=>resetAll(), null); themeToNav();   // the Light switch at the navigation bar's right end (item 31)
// Escape: the viewer, the dialog and the drawer close first (their own handlers); then the rest of the state, one step
addEventListener('keydown',e=>{ if(e.key!=='Escape'||LB.state().open||dlg.open||document.querySelector('#graphPane .sm-insp.on')) return;
  if(S.rect){ S.rect=null; S.sel=null; region(); dirty(); return; } resetAll(); },true);
// a click on the selected node again deselects it
/* the page keeps its state when the reader comes back from another page (site contract: sessionStorage 'pg:map', saved ~200 ms after
   a change and on pagehide; restored when the URL carries no state of its own, explicit URL parameters win; Reset view clears it; a
   stored state that no longer fits the data is dropped silently; storage that throws is ignored) */
var PGOFF=true, pgT=0;   // var: sync() and the pan-zoom call pgSave before this block has run
const PGKEY='pg:map', SS=(()=>{ try{ return window.sessionStorage; }catch(e){ return null; } })();
function pgRead(){ try{ return JSON.parse(SS&&SS.getItem(PGKEY)||'null'); }catch(e){ return null; } }
function pgWrite(v){ try{ if(SS){ if(v) SS.setItem(PGKEY,JSON.stringify(v)); else SS.removeItem(PGKEY); } }catch(e){} }
function pgState(){ const v=MPZ.get(), st={ver:1,enc:S.enc,mode:S.mode,month:S.month,ctrl:S.ctrl,only:S.only,from:S.from,concept:S.concept,task:S.task,model:S.model,prob:S.prob,
    v, rect:S.rect, home:TV?P[TV.home].id:null, open:TV?P[TV.cur].id:null};
  const rest=st.enc===Object.keys(ENC)[0]&&st.mode===MODES[0][0]&&!st.month&&!st.ctrl&&!st.only&&!st.task&&!st.model&&!st.rect&&!st.home&&Math.abs(v.z-1)<1e-6&&Math.abs(v.x)<.5&&Math.abs(v.y)<.5;
  return rest?null:st; }   // the rest state is not stored: Reset view leaves nothing behind
function pgSave(now){ if(PGOFF!==false) return;   // not before the restore below has run
  clearTimeout(pgT); if(now) pgWrite(pgState()); else pgT=setTimeout(()=>pgWrite(pgState()),200); }
function pgRestore(st){ if(!st||st.ver!==1) return;
  if(ENC[st.enc]&&st.enc!==S.enc){ S.enc=st.enc; $('enc').value=S.enc; setEnc(); }
  if(MODES.some(m=>m[0]===st.mode)){ S.mode=st.mode; $('mode').value=S.mode; }
  if(st.month==null||MONTHS.includes(st.month)) S.month=st.month||null;
  if(MONTHS.includes(st.from)){ S.from=st.from; $('from').value=S.from; }
  if(byId[st.concept]){ S.concept=st.concept; $('concept').value=S.concept; }
  if(st.task==null||TASKSET.has(st.task)) S.task=st.task||null;
  S.ctrl=!!st.ctrl&&hasCtrl; $('ctrl').checked=S.ctrl; S.only=!!st.only; $('only').checked=S.only;
  if(st.model&&MD){ setModel(true); if(Number.isInteger(st.prob)&&MD.problems[st.prob]) S.prob=st.prob; }
  sync();
  if(st.rect&&['x0','y0','x1','y1'].every(k=>Number.isFinite(st.rect[k]))){ S.rect=st.rect; region(); }
  if(st.v&&['z','x','y'].every(k=>Number.isFinite(st.v[k]))) MPZ.set(st.v);
  const ix=id=>id?P.findIndex(p=>p.id===id):-1, h=ix(st.home), c=ix(st.open);
  if(h>=0){ openPage(h); if(c>=0&&c!==h){ TV.cur=c; tvDraw(); } } }
addEventListener('pagehide',()=>pgSave(true));
{ const own=[...new URLSearchParams(location.search).keys()].filter(k=>!['view','data'].includes(k));
  if(own.some(k=>!['concept','model'].includes(k))) fromURL();   // explicit URL state wins (concept and model were applied above)
  else if(!own.length) pgRestore(pgRead());
  PGOFF=false; pgSave(); }
setTimeout(()=>{ urlSync(false); URLREADY=true; });
window.DM={resetAll,urlSync,S,times,cam:()=>cam,D};   // for tests and the frame-time measurement
/*@@GRAPH2@@*/
})();
