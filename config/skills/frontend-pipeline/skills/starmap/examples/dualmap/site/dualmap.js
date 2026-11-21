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
/* ── concept graph v2: the current discrete structure (data/graph_v2/graph.json, built by dual/site/graph_v2.py) ──
   Six levels left to right: context, primitives, rules of 1-2 literals, rules of 3-5 literals and sub-profiles, looks,
   regions. Default: a readable selection per level (half the strongest, half the most reused); "+" shows more.
   Selecting a node lights its chain (down to the primitives it is made of, up to the looks and regions it is realised in);
   its own links then carry the difference itself: line = how much more or less common the linked node is among the
   selected node's pages (lift), dot = how the linked node does in votes among them. State lives in the URL. */
async function graphV2(){
  const B2=new URLSearchParams(location.search).get('stage')?'data/graph_v2.next/':'data/graph_v2/', LEAN=.55, short=(s,k=20)=>s.length>k?s.slice(0,k-1).trimEnd()+'…':s, strong=v=>`rgb(${v>0?TH.pos:TH.neg})`,
    pc=v=>v==null?'–':v>0&&v<.001?'<0.1 %':(v>0&&v<.1?(v*100).toFixed(1):Math.round(v*100))+' %';
  const G2=await fetch(B2+'graph.json').then(r=>r.ok?r.json():null).catch(()=>null);
  if(!G2){ document.querySelector('main').innerHTML='<div class="empty">No data/graph_v2/graph.json yet: run python dual/site/graph_v2.py</div>'; return; }
  document.body.dataset.view='graph'; document.body.dataset.gv='2'; document.body.dataset.tab='graph';
  const NN=G2.N, PAGES=G2.pages, OWN=new Set(G2.pages_own||[]), AUD=((await loadAudit())||{}).items||{};   // the audit's entries sit under items (item 56)
  const thumb=i=>(OWN.has(i)?B2+'thumbs/':'data/pilot/thumbs/')+PAGES[i]+'.webp';
  const byId={}; G2.nodes.forEach(n=>{ byId[n.id]=n; n._on=false; });
  const LV=G2.levels, LT=G2.link_types;
  const LINKS=G2.links.map((l,i)=>({...l,_i:i}));
  const inc={}, out={};   // incident links per node
  LINKS.forEach(l=>{ (out[l.s]=out[l.s]||[]).push(l); (inc[l.t]=inc[l.t]||[]).push(l); });
  const PARTS=id=>(inc[id]||[]).filter(l=>l.type==='composed_of'||l.type==='conditioned_on'&&byId[l.s].lv===0);
  const DOWN=id=>(inc[id]||[]).filter(l=>l.type==='composed_of'||l.type==='realised_in'||l.type==='conditioned_on'&&byId[l.s].lv===0);   // a region's chain runs down through what lands in it
  const UP=id=>(out[id]||[]).filter(l=>l.type==='composed_of'||l.type==='realised_in');
  let FILT=null;   // cond_filters.json, loaded when a task or kind is chosen
  const DEF={sel:null,task:null,kind:null,fail:false,q:'',more:[0,0,0,0,0,0],fam:'',links:'composed_of,realised_in,modifies',mode:'net',model:false,chain:null,step:0};
  /* the Full network (items 35-38) is built and checked but published in its own swap: until then the switch does not offer it */
  const DENSE_LIVE=!!window.DualModes; window.DENSE_LIVE=DENSE_LIVE;   // the Full network (fullnet.js) is offered when the module is on the page
  const LAY=new URLSearchParams(location.search).get('layout')||'hetero';   // the heterogeneous network (round 3 design, items 49); lattice (round 4), cols (A), arc (B) by URL   // the network's layout: hetero (chosen), cols (A) and arc (B) kept for the comparison
  const BASEK=[21,40,24,26,26,28];   // fallback; Details fills the frame (baseK)
  const SUBCOLS=[1,2,1,2,2,2];   // levels with two sub-columns in Details: primitives; rules of 3-5 literals and sub-profiles; looks and regions (item 62)
  const baseK=L=>Math.max(BASEK[L],ROWS*SUBCOLS[L]);
  const S2=JSON.parse(JSON.stringify(DEF));
  const fromURL=()=>{ const q=new URLSearchParams(location.search); Object.assign(S2,JSON.parse(JSON.stringify(DEF)));
    S2.sel=byId[q.get('node')]?q.get('node'):null; S2.task=q.get('task'); S2.kind=q.get('kind'); S2.fail=q.get('fail')==='1'; S2.q=q.get('q')||''; S2.fam=q.get('fam')||'';
    S2.chain=q.get('chain')||null; S2.step=+q.get('step')||0;
    S2.mode=q.get('mode')==='full'?'full':q.get('mode')==='dense'&&DENSE_LIVE?'dense':'net'; S2.model=q.get('model')==='1';
    if(q.get('more')) S2.more=q.get('more').split(',').map(Number).concat([0,0,0,0,0,0]).slice(0,6); if(q.get('links')!=null) S2.links=q.get('links'); };
  const toURL=push=>{ const q=new URLSearchParams({view:'graph'}); if(S2.sel) q.set('node',S2.sel); if(S2.task) q.set('task',S2.task); if(S2.kind) q.set('kind',S2.kind);
    if(S2.fail) q.set('fail','1'); if(S2.q) q.set('q',S2.q); if(S2.fam) q.set('fam',S2.fam); if(S2.more.some(x=>x)) q.set('more',S2.more.join(',')); if(S2.links!==DEF.links) q.set('links',S2.links);
    if(S2.mode!=='net') q.set('mode',S2.mode); if(S2.chain&&S2.mode==='net'){ q.set('chain',S2.chain); q.set('step',S2.step); } if(LAY!=='hetero') q.set('layout',LAY); if(S2.model) q.set('model','1'); if(new URLSearchParams(location.search).get('stage')) q.set('stage','1');
    const u='?'+q; if(u!==location.search) history[push?'pushState':'replaceState'](null,'',u); };
  fromURL();
  /* item 64: the page keeps its state across pages in the session (sessionStorage['pg:graph']): mode, selection, filters, story position
     and the pan / zoom of each mode; restored when the URL carries no state of its own (explicit parameters win); Reset view clears it */
  const PGK='pg:graph', PGV=G2.built||G2.nodes.length;
  const pgRead=()=>{ try{ const o=JSON.parse(sessionStorage.getItem(PGK)||'null'); return o&&o.v===PGV?o:null; }catch(e){ return null; } };
  const pgClear=()=>{ try{ sessionStorage.removeItem(PGK); }catch(e){} };
  let PGVIEWS={}, PGT=0;
  function pgSave(now){ clearTimeout(PGT); const go=()=>{ try{ if(pz2&&S2.mode!=='dense') PGVIEWS[S2.mode]=pz2.get(); if(S2.mode==='dense'&&window.DualModes&&DualModes.fullnet.getView){ const v=DualModes.fullnet.getView(); if(v) PGVIEWS.dense=v; }   /* Full network view: top-level getView, the host re-mounts the module */
      const st={}; ['mode','sel','task','kind','model','fail','q','fam','more','links','alllinks','chain','step'].forEach(k=>{ st[k]=S2[k]; });
      sessionStorage.setItem(PGK,JSON.stringify({v:PGV,s:st,views:PGVIEWS})); }catch(e){} }; if(now) go(); else PGT=setTimeout(go,200); }
  const PGIN=(()=>{ const q=new URLSearchParams(location.search); if([...q.keys()].some(k=>k!=='view'&&k!=='stage')) return null;   // explicit parameters win
    const o=pgRead(); if(!o) return null; const t=o.s||{};
    if(t.sel&&!byId[t.sel]) t.sel=null; if(t.task&&!G2.tasks.includes(t.task)) t.task=null; if(t.kind&&!G2.kinds.includes(t.kind)) t.kind=null;
    if(!['net','full','dense'].includes(t.mode)) t.mode='net'; Object.assign(S2,t); PGVIEWS=o.views||{}; return o; })();
  const linkOn=t=>S2.links.split(',').includes(t);
  const TI=t=>G2.tasks.indexOf(t), KI=k=>G2.kinds.indexOf(k);
  const ppv=v=>v==null?'n/a':sgn(v*100,1);
  const tierOf=a=>!a||a[1]==null?0:(a[1]>0||a[2]<0)?2:Math.abs(a[0])>1.2816*(a[2]-a[1])/3.92?1:0;
  const nm=(n,k=34)=>short(n.name,k);

  /* ── heading ── */
  pageHeader('Concept graph','how design elements combine into looks, and <em>what voters reward at each step</em>.',
    `${NN.toLocaleString()} labelled pages; ${G2.networks.all.nodes.length} of ${G2.nodes.length.toLocaleString()} nodes. Colour = vote effect: solid at 95 %, lighter at 80 %. Hover a node to light its chain.`,
    `<p>Levels, left to right: ${LV.map(l=>esc(l.name)+' '+l.n.toLocaleString()).join(' · ')}. Resolution: rules and areas of the continuous space correspond for areas of about 800 pages and up; ${G2.res_uncovered} of the 594 smaller mined regions are not described by any rule.</p><p>${esc(G2.net_rule)}</p><p>Population of the computed numbers: ${esc(G2.populations.bundle)}</p>`);
  const SUBNET=()=>`Design elements combine, stage by stage, into rules and looks that land in regions of the continuous space; at every stage voters gain (green) or lose (red) preference. Resolution: rules and areas correspond for areas of about 800 pages and up; ${G2.res_uncovered} of the 594 smaller mined regions are not described by any rule.`;
  const SUB0=`Read left to right: page context, then primitives (single values and scale bands), rules that combine them, shared sub-profiles, looks, and finally the regions of the continuous space they land in. Dot colour = effect on votes (green wins more, red fewer); a line = "is part of" or "lands in". Click any node to light its chain.`;
  headerTools(()=>{ resetAll(); }, null); const MARK=modeSwitch(()=>S2.mode, m=>{ if(m===S2.mode) return; S2.mode=m; S2.sel=null; sm2.closeInsp(); refresh(true,true); });
  const NOTE={net:$('pnote').dataset.base,
    dense:`${NN.toLocaleString()} labelled pages; all ${G2.nodes.length.toLocaleString()} nodes in their sub-layers. Colour = vote effect: solid at 95 %, lighter at 80 %. Zoom in to read the names.`,
    full:`${NN.toLocaleString()} labelled pages; every level as lists with counts and search. Colour = vote effect: solid at 95 %, lighter at 80 %. Click a node for its links.`};   // the page note follows the mode
  themeToNav();   // the strip joins the one controls row in the network (item 31); the full structure keeps it in its pane
  $('ro').innerHTML=[['Nodes',G2.nodes.length],['Links',LINKS.length],['Labelled pages',NN]].map(([k,v],i)=>(i?'<div class="sep"></div>':'')+`<div><span>${k}</span><b>${v.toLocaleString()}</b></div>`).join('');

  /* ── which nodes are on show ── */
  const famOk=n=>n.lv!==1||!S2.fam||n.fam===S2.fam;
  const filtOk=n=>(!S2.task||n.lv===0||(n.tcl||[])[TI(S2.task)]>0)&&(!S2.kind||n.lv===0||(n.kc||[])[KI(S2.kind)]>0);
  const qOk=n=>!S2.q||n.name.toLowerCase().includes(S2.q.toLowerCase())||n.id.toLowerCase().includes(S2.q.toLowerCase());
  const pool=L=>G2.nodes.filter(n=>n.lv===L&&(S2.fail||!n.fail)&&famOk(n)&&filtOk(n));
  const strength=n=>(n.vt||0)*10+Math.abs((n.vote||[0])[0]||0)*100;
  let APPLIED=undefined, NOPUSH=false, SHOWN=new Set(), AUTO=new Set(), LIT=null, CHAIN=null, REGTOP=new Map(), POOLN=[];
  let NET=null, NETL=new Set(), NETKEY='all';
  function chooseNet(){ NETKEY=S2.task?'task='+S2.task:S2.kind?'kind='+S2.kind:'all'; NET=G2.networks[NETKEY]||G2.networks.all;
    SHOWN=new Set(NET.nodes); NETL=new Set(NET.links); AUTO=new Set(); REGTOP=new Map(); APPLIED=S2.sel; POOLN=LV.map(L=>L.n);
    CHAIN=null; LIT=null; if(S2.sel){ SHOWN.add(S2.sel); LIT=netChain(S2.sel); const lv=byId[S2.sel].lv;
      CHAIN={down:new Set([...LIT].filter(i=>byId[i].lv<lv)),up:new Set([...LIT].filter(i=>byId[i].lv>lv)),upAdd:new Set(),nb:new Set()}; }
    if(S2.chain&&story()){ LIT=playSet(); }   // a story being played lights its steps so far
    G2.nodes.forEach(n=>n._on=SHOWN.has(n.id)); }
  /* ── playback (item 46): stories = complete chains of the network; a step lights one more layer: elements, the rule they compose, the
     deeper rule or sub-profile, the look, the regions ── */
  const story=()=>((NET&&NET.stories)||[]).find(x=>x.id===S2.chain)||null;
  const steps=st=>st.steps.filter(x=>x&&x.length&&x[0]);   // a story without a parent rule has one step fewer
  function playSet(){ const st=story(); if(!st) return null; const ss=steps(st), k=Math.max(1,Math.min(S2.step,ss.length)); return new Set(ss.slice(0,k).flat().filter(id=>byId[id])); }
  const storyName=st=>{ const ss=steps(st), lk=byId[ss[ss.length-2][0]], rg=byId[ss[ss.length-1][0]]; return `${lk?lk.sn||lk.name:''} → ${rg?rg.sn||rg.name:''}`; };
  function storyReading(){ const st=story(); if(!st) return null; const ss=steps(st), k=Math.max(1,Math.min(S2.step,ss.length));
    const nm=id=>{ const n=byId[id]; return n?esc(n.sn||n.name):''; }, ef=id=>{ const n=byId[id]; return n&&n.vote&&n.vote[0]!=null?` <b class="${cls(n.vote[0])}">${ppv(n.vote[0])} pp</b>`:''; };
    return `Step ${k} of ${ss.length}: `+ss.slice(0,k).map((x,i)=>i===0?x.map(nm).join(' + '):x.map(id=>nm(id)+ef(id)).join(', ')).join(' → '); }
  function playGo(chain,step){ const L=(NET&&NET.stories)||[]; if(!L.length) return; let i=L.findIndex(x=>x.id===chain); if(i<0){ i=0; step=1; }
    let st=L[i], n=steps(st).length; if(step>n){ i=(i+1)%L.length; st=L[i]; step=1; } if(step<1){ step=1; }
    S2.chain=st.id; S2.step=step; S2.sel=null; sm2.closeInsp(); refresh(true).then(()=>{ setNote(storyReading()); if(step===steps(st).length){ const lk=steps(st).slice(-2)[0][0]; if(byId[lk]) { NOPUSH=true; sm2.openNode(lk); NOPUSH=false; } } }); }
  /* every chain through a node, inside the network: its ancestors and its descendants along the network's links */
  function netChain(id){ const s=new Set([id]), dn=[id], up=[id];
    while(dn.length){ const x=dn.pop(); for(const l of inc[x]||[]) if(NETL.has(l._i)&&!s.has(l.s)&&byId[l.s].lv<byId[x].lv){ s.add(l.s); dn.push(l.s); } }
    const u=new Set([id]); while(up.length){ const x=up.pop(); for(const l of out[x]||[]) if(NETL.has(l._i)&&!u.has(l.t)&&byId[l.t].lv>byId[x].lv){ u.add(l.t); s.add(l.t); up.push(l.t); } }
    return s; }
  function choose(){ if(S2.mode==='net') return chooseNet();
    SHOWN=new Set(); AUTO=new Set(); POOLN=[]; APPLIED=S2.sel;
    for(let L=0;L<6;L++){ const p=pool(L), q=p.filter(qOk); POOLN[L]=p.length;
      const k=S2.q||S2.more[L]?p.length:Math.min(p.length,baseK(L));   // the frame's rows; "show all" lists the level
      if(S2.q||L===0){ q.slice(0,k).forEach(n=>SHOWN.add(n.id)); continue; }
      const mk=n=>!n.md?-1:S2.msort==='meff'?(n.md.model_pref==null?-1:Math.abs(n.md.model_pref)):(n.md.ratio||0);
      const byS=p.slice().sort((a,b)=>S2.model&&S2.msort&&(L===4||L===5)?mk(b)-mk(a):strength(b)-strength(a)), byR=p.slice().sort((a,b)=>(b.reuse||0)-(a.reuse||0)||strength(b)-strength(a));
      for(let i=0;SHOWN.size<1e9&&[...SHOWN].filter(id=>byId[id].lv===L).length<k&&i<p.length;i++){ SHOWN.add(byS[i].id); if([...SHOWN].filter(id=>byId[id].lv===L).length<k) SHOWN.add(byR[i].id); } }
    // every region on show draws its one or two strongest incoming links; their sources come on show with it
    REGTOP=new Map();
    for(const id of [...SHOWN]) if(byId[id].lv===5){ const ls=(inc[id]||[]).filter(l=>l.type==='realised_in');
      const lk=l=>{ const c=l.c||{n:[0,0,0]}; return c.lift||0; }, ok=ls.filter(l=>(l.c||{n:[0,0,0]}).n[2]>=MIN), rest=ls.filter(l=>!ok.includes(l));
      const look=x=>x.filter(l=>byId[l.s].lv===4).sort((a,b)=>lk(b)-lk(a)), other=x=>x.filter(l=>byId[l.s].lv!==4).sort((a,b)=>lk(b)-lk(a));
      const top=[...look(ok),...other(ok),...look(rest),...other(rest)].slice(0,2);
      // the strongest comes on show with the region; the second is drawn when its source is on show anyway
      if(top[0]&&!SHOWN.has(top[0].s)){ SHOWN.add(top[0].s); AUTO.add(top[0].s); }
      REGTOP.set(id,top); }
    // the selection and its chain
    CHAIN=null; LIT=null;
    if(S2.sel){ SHOWN.add(S2.sel); CHAIN=chainOf(S2.sel); CHAIN.down.forEach(id=>SHOWN.add(id));
      CHAIN.upAdd.forEach(id=>SHOWN.add(id)); CHAIN.nb.forEach(id=>SHOWN.add(id));
      LIT=new Set([S2.sel,...CHAIN.down,...CHAIN.up,...CHAIN.nb]); }
    G2.nodes.forEach(n=>n._on=SHOWN.has(n.id));
  }
  const MIN=G2.floors.min_show;
  /* chain: down = everything it is made of (composed_of, its context), up = what it is part of and the regions it lands in.
     Up can be hundreds of rules for a primitive: those on show light, and the strongest few per level come on show. */
  function chainOf(id){
    const down=new Set(), up=new Set(), q=[id];
    while(q.length){ const x=q.pop(); for(const l of DOWN(x)) if(!down.has(l.s)&&l.s!==id){ down.add(l.s); q.push(l.s); } }
    const q2=[id]; while(q2.length&&up.size<4000){ const x=q2.pop(); for(const l of UP(x)) if(!up.has(l.t)&&l.t!==id){ up.add(l.t); q2.push(l.t); } }
    const upAdd=new Set(); for(let L=byId[id].lv+1;L<6;L++){ [...up].map(i=>byId[i]).filter(n=>n.lv===L&&(S2.fail||!n.fail)).sort((a,b)=>strength(b)-strength(a)).slice(0,12).forEach(n=>upAdd.add(n.id)); }
    // direct neighbours of the chosen kinds of link (their lines carry the conditional shares)
    const nb=new Set(); for(const l of [...(inc[id]||[]),...(out[id]||[])]) if(linkOn(l.type)||l.type==='composed_of'||l.type==='realised_in'){ const o=l.s===id?l.t:l.s; if(S2.fail||!byId[o].fail||o===id) nb.add(o); }
    return {down,up,upAdd,nb};
  }

  /* ── layout: one column per level, sub-columns of rows; primitives grouped by family ── */
  let SUBW=136, RH=13, FS=1; let ROWS=30; const GAP=26;   /* Details: a sub-column's width follows the frame's width (item 67, ultrawide: columns span the frame, labels widen) */   // Details: row height 15, the number of rows from the frame's height (refresh)
  let BOX2={cols:[],h:0};
  let NW=1000; const NH=646;   // world size: the fit scales it to the pane (labels keep their screen size)   // 34 px between neighbours in a layer
  let CROSS=null;
  function bandLinks(){   // the adjacent-layer links drawn per band (see netSel)
    return SEL_ADJ; }
  function crossings(key=n=>n._k){ const out=[]; for(let L=0;L<5;L++){ const ls=SEL_ADJ.filter(l=>byId[l.s].lv===L); let c=0;
      for(let a=0;a<ls.length;a++) for(let b=a+1;b<ls.length;b++){ const p=ls[a],q=ls[b], d1=key(byId[p.s])-key(byId[q.s]), d2=key(byId[p.t])-key(byId[q.t]); if(d1*d2<0) c++; }
      out.push(c); } return out; }
  function layoutNet(){
    NW=Math.round(1000*Math.max(1,Math.min(2.2,((gp.clientWidth-DOCK())/Math.max(300,gp.clientHeight))/2)));   /* the layers spread with the frame's width (wide screens, item 58) */
    netSel();
    const cols=[0,1,2,3,4,5].map(L=>G2.nodes.filter(n=>n._on&&n.lv===L));
    const adj={}; SEL_ADJ.forEach(l=>{ (adj[l.s]=adj[l.s]||[]).push(l.t); (adj[l.t]=adj[l.t]||[]).push(l.s); });
    const nb=(n,L)=>{ const ys=(adj[n.id]||[]).map(x=>byId[x]).filter(o=>o.lv===L&&o._k!=null).map(o=>o._k); return ys.length?ys.reduce((a,b)=>a+b,0)/ys.length:null; };
    const ev=c=>c.forEach((n,i)=>n._k=c.length>1?i/(c.length-1):.5);
    cols.forEach(c=>{ c.sort((a,b)=>((b.vote||[0])[0]??-9)-((a.vote||[0])[0]??-9)); ev(c); });
    const before=crossings();
    for(let it=0;it<8;it++){ const seq=it%2?[4,3,2,1,0]:[1,2,3,4,5];   // barycentre sweeps: related chains run level, crossings stay between chains
      for(const L of seq){ const ref=it%2?L+1:L-1; cols[L].forEach(n=>{ const b=nb(n,ref); n._b=b==null?n._k:b; }); ev(cols[L].sort((a,b)=>a._b-b._b)); } }
    CROSS={before,after:crossings()};   // hetero recounts on the drawn positions
    const GAPY=NH/19;   // one spacing for every layer: a layer with fewer nodes is shorter, centred on the axis
    BOX2={cols:[],h:NH,fam:[],top:-NH/2,w:NW};
    if(LAY==='lattice') return layoutLattice(cols);
    if(LAY==='hetero') return layoutHetero(cols);
    cols.forEach((c,L)=>{ const x=-NW/2+L*NW/5, h=(c.length-1)*GAPY; BOX2.cols.push({L,x,w:NW/5,n:c.length,top:-h/2});
      const sh=c.map(n=>Math.sqrt(Math.max(1e-6,(n.n_all||n.n||1)/(n.dpop==='all'?G2.pop_N:NN)))), lo=Math.min(...sh), hi=Math.max(...sh);
      c.forEach((n,i)=>{ const t=hi>lo?(sh[i]-lo)/(hi-lo):.5; n.r=4+11*t;   // diameter 8 to 30 px: continuous in the square root of the share, stretched over the layer
        if(LAY==='arc'){ const R0=900, R=R0+L*20, y=-h/2+n._k*h, th=y/R; n.x=x-R0*(1-Math.cos(th))*(L-2.5)/2.5; n.y=y; }
        else { n.x=x+(L===5&&c.length>14?(i%2?22:-22):0); n.y=-h/2+n._k*h; } }); });
  }
  /* version C, a heterogeneous network: context tags at the left edge; primitives in clusters by family; rules as diamonds (1-2 literals)
     and hexagons (3-5), sized by their drawn degree, sub-profiles double-ringed, a 3-literal rule a little left of a 5-literal one; looks
     as larger discs carrying an example page; regions as a miniature of the continuous map (their pages' centre, scaled into the last
     column), the densest layer. Every shape and group is in the legend. */
  const HET=LAY==='hetero'||LAY==='lattice';
  /* round 4 (item 41): a regular lattice of seven straight columns, evenly spaced, one pitch, centred: context | primitives | rules of
     1-2 literals | rules of 3-5 literals | sub-profiles | looks | regions and clusters, the last a 4-column grid ordered by the angle of
     their positions on the continuous map, with the true positions as an inset */
  const LP=20, LGX=17;   // world: pitch along a column, pitch between the region grid's columns
  let COLGAP=160, GRIDR=0;
  function layoutLattice(cols){
    const D=deg(); BOX2={cols:[],h:NH,fam:[],top:-NH/2,w:NW,hetero:1,lattice:1};
    const lanes=[cols[0],cols[1],cols[2],cols[3].filter(n=>n.t!=='sub'),cols[3].filter(n=>n.t==='sub'),cols[4],cols[5]], LV7=[0,1,2,3,3,4,5];
    const fk={}; lanes[1].forEach(n=>{ (fk[n.fam]=fk[n.fam]||[]).push(n._k); }); const fm=f=>fk[f].reduce((a,b)=>a+b,0)/fk[f].length;
    lanes[1].sort((a,b)=>fm(a.fam)-fm(b.fam)||a._k-b._k); lanes[0].forEach(n=>{ n.fam=n.t==='task'?'task':'kind of page'; }); lanes[0].sort((a,b)=>a.fam!==b.fam?(a.fam==='task'?-1:1):a._k-b._k);
    const xs=i=>-NW/2+i*NW/7.2; COLGAP=NW/7.2;
    lanes.forEach((c,i)=>{ const x0=xs(i);
      if(i===6){   // regions: 4 columns, ordered by angle round the centre of their map positions, column by column
        const P=n=>n.xy&&n.xy.length?[n.xy.reduce((a,p)=>a+p[0],0)/n.xy.length,n.xy.reduce((a,p)=>a+p[1],0)/n.xy.length]:[0,0], ps=c.map(P), cx=ps.reduce((a,p)=>a+p[0],0)/Math.max(1,ps.length), cy=ps.reduce((a,p)=>a+p[1],0)/Math.max(1,ps.length);
        c.forEach((n,j)=>{ n._xy=ps[j]; n._ang=Math.atan2(ps[j][1]-cy,ps[j][0]-cx); }); c.sort((a,b)=>a._ang-b._ang||a.id.localeCompare(b.id));
        const rows=Math.ceil(c.length/4), H=(rows-1)*LP; c.forEach((n,j)=>{ n.x=x0+Math.floor(j/rows)*LGX; n.y=-H/2+(j%rows)*LP; });
        GRIDR=x0+3*LGX; BOX2.cols.push({L:5,x:x0+1.5*LGX,n:c.length,top:-H/2}); BOX2.inset={x:x0,y:H/2+28,w:3*LGX+40,h:70,ps:c.map(n=>[n,n._xy])}; return; }
      const grp=i===0||i===1, gs=grp?[...new Set(c.map(n=>n.fam))]:[0], gap=grp?LP*.6:0, H=(c.length-1)*LP+(gs.length-1)*gap; let y=-H/2, last=null;
      c.forEach((n,j)=>{ if(grp&&last!==null&&n.fam!==last) y+=gap; if(grp&&n.fam!==last) BOX2.fam.push({t:n.fam,x:x0-14,y,ns:[]}); if(grp) BOX2.fam[BOX2.fam.length-1].ns.push(n); last=n.fam; n.x=x0; n.y=y; y+=LP; });
      BOX2.cols.push({L:LV7[i],x:x0,n:c.length,top:-H/2,sub:i===4}); });
    const sh=n=>Math.sqrt(Math.max(1e-6,(n.n_all||n.n||1)/(n.dpop==='all'?G2.pop_N:NN)));
    lanes.forEach((c,i)=>{ const L=LV7[i], v=c.map(n=>L===2||L===3?Math.sqrt(D[n.id]||1):sh(n)), lo=Math.min(...v), hi=Math.max(...v);
      c.forEach((n,j)=>{ const t=hi>lo?(v[j]-lo)/(hi-lo):.5; n.r=L===4?4.2+6.4*t:L===5?2.4+3.8*t:L===0?3+4.6*t:L===1?3+5*t:3.2+6*t; }); });   // rules: size = links drawn; others: share of pages
    CROSS.after=crossings(n=>n.y); LABK=null; }
  const XF=[0,.18,.36,.54,.72,.82];   // even steps between the layers; the region map starts at .82
  let LABK=null, LABOK=new Map();
  const LFZ=px=>px/Math.max(.45,(BASE2&&BASE2.k)||1);   // network text: px on screen at the fitted view, growing with the user's zoom
  function labelCands(n){ const up=[n.x,n.y-n.r-7,'center'], dn=[n.x,n.y+n.r+15,'center'], rt=[n.x+n.r+6,n.y+4,'left'], lf=[n.x-n.r-6,n.y+4,'right'];
    if(LAY==='lattice') return n.lv<=1?[lf]:n.lv===5?[[GRIDR+10,n.y+4,'left']]:[rt];
    if(n.lv===0||n.lv===1||n.lv===4) return [lf]; if(n.lv===5) return [rt,lf,up,dn]; return n.lv===2?[up,dn]:[up,dn,rt]; }
  const labelPos=n=>LABOK.get(n.id)||labelCands(n)[0];
  /* a label never crosses the neighbouring column: in the lattice it is fitted to the gap */
  const labelText=(c,n)=>{ const nm=n.sn||n.name; return LAY==='lattice'&&n.lv<5?fitTxt(c,nm,COLGAP-n.r-16):nm; };
  function placeLabels(c,k){ if(LABK===k) return; LABK=k; LABOK=new Map(); const fz=LFZ(12.5), boxes=[];
    c.save(); c.font='500 '+fz.toFixed(1)+'px "Space Grotesk",-apple-system,sans-serif';
    const d=deg(), ns=G2.nodes.filter(n=>n._on), pri=n=>n.lv<=1?0:n.lv===4?1:HUBS.has(n.id)?2+(1/(1+(d[n.id]||0))):REGLAB.has(n.id)?4:9;
    ns.forEach(o=>{ if(o.lv>=2) boxes.push([o.x-o.r-1,o.y-o.r-1,o.x+o.r+1,o.y+o.r+1,o.id]); });   // labels keep off the other nodes
    ns.filter(n=>pri(n)<9).sort((a,b)=>pri(a)-pri(b)||(b.r-a.r)).forEach(n=>{ const w=c.measureText(labelText(c,n)).width;
      for(const p of labelCands(n)){ const [x,y,al]=p, x0=al==='center'?x-w/2:al==='left'?x:x-w, b=[x0-2,y-fz+1,x0+w+2,y+3];
        if(n.lv<=1||!boxes.some(q=>q[4]!==n.id&&b[0]<q[2]&&b[2]>q[0]&&b[1]<q[3]&&b[3]>q[1])){ boxes.push(b); LABOK.set(n.id,p); break; } } });
    c.restore(); }
  function deg(){ const d={}; SEL_ADJ.forEach(l=>{ d[l.s]=(d[l.s]||0)+1; d[l.t]=(d[l.t]||0)+1; }); return d; }
  function layoutHetero(cols){
    const D=deg(); BOX2={cols:[],h:NH,fam:[],top:-NH/2,w:NW,hetero:1};
    const fk={}; cols[1].forEach(n=>{ (fk[n.fam]=fk[n.fam]||[]).push(n._k); }); const fm=f=>fk[f].reduce((a,b)=>a+b,0)/fk[f].length;
    cols[1].sort((a,b)=>fm(a.fam)-fm(b.fam)||a._k-b._k).forEach((n,i,c)=>n._k=c.length>1?i/(c.length-1):.5);   // families in the order their members want
    const adj={}; SEL_ADJ.forEach(l=>{ (adj[l.s]=adj[l.s]||[]).push(l.t); (adj[l.t]=adj[l.t]||[]).push(l.s); });
    const bc=(n,L)=>{ const ys=(adj[n.id]||[]).map(x=>byId[x]).filter(o=>o.lv===L).map(o=>o._k); return ys.length?ys.reduce((a,b)=>a+b,0)/ys.length:n._k; };
    for(let it=0;it<6;it++) for(const L of it%2?[3,2]:[2,3,4]){ const ref=it%2?L+1:L-1; cols[L].forEach(n=>n._b=bc(n,ref)); cols[L].sort((a,b)=>a._b-b._b).forEach((n,i,c)=>n._k=c.length>1?i/(c.length-1):.5); }
    cols.forEach((c,L)=>{ const x0=-NW/2+XF[L]*NW;
      if(L===0||L===1){   // context: task categories, then kinds of page; primitives: clusters by family; a gap between groups
        if(L===0) c.forEach(n=>{ n.fam=n.t==='task'?'task':'kind of page'; }); c.sort((a,b)=>L===0?(a.fam!==b.fam?(a.fam==='task'?-1:1):a._k-b._k):a._k-b._k);
        const fams=[...new Set(c.map(n=>n.fam))], gap=L===0?18:12, pitch=L===0?25:23, H=(c.length-1)*pitch+(fams.length-1)*gap; let y=-H/2, last=null;
        c.forEach(n=>{ if(last!==null&&n.fam!==last) y+=gap; if(n.fam!==last) BOX2.fam.push({t:n.fam,x:x0-14,y,ns:[]}); BOX2.fam[BOX2.fam.length-1].ns.push(n); last=n.fam; n.x=x0; n.y=y; y+=pitch; });
        BOX2.cols.push({L,x:x0,n:c.length,top:-H/2}); }
      else if(L===5){   // regions: their centre on the continuous map, scaled into a block; a light push keeps them apart
        const med=(n,i)=>{ const v=(n.xy||[]).map(p=>p[i]).sort((a,b)=>a-b); return v.length?v[v.length>>1]:0; };   // the median of its pages' positions
        const W=.25*NW, H=Math.max(440,...BOX2.cols.map(b=>-2*b.top)), xs=c.map(n=>med(n,0)), ys=c.map(n=>med(n,1));
        const ax=Math.min(...xs), bx=Math.max(...xs), ay=Math.min(...ys), by=Math.max(...ys);
        c.forEach((n,i)=>{ n.x=x0+(bx>ax?(xs[i]-ax)/(bx-ax):.5)*W; n.y=-H/2+(by>ay?(ys[i]-ay)/(by-ay):.5)*H; });
        for(let it=0;it<60;it++) for(let a=0;a<c.length;a++) for(let b=a+1;b<c.length;b++){ const p=c[a],q=c[b], dx=q.x-p.x, dy=q.y-p.y, d=Math.hypot(dx,dy)||1, m=Math.max(12,Math.min(16,15*Math.sqrt(66/Math.max(1,c.length))*1.25));
          if(d<m){ const k=(m-d)/2/d; p.x-=dx*k; p.y-=dy*k; q.x+=dx*k; q.y+=dy*k; } }
        BOX2.cols.push({L,x:x0+W/2,n:c.length,top:Math.min(...c.map(n=>n.y))}); BOX2.map={x:x0-16,y:-H/2-16,w:W+32,h:H+32};
        // regional bands (item 45), as soft groups inside the block: k-means on the block positions, seeded around the centre by angle
        const K=Math.max(6,Math.min(10,Math.round(c.length/7))), cx=c.reduce((a,n)=>a+n.x,0)/c.length, cy=c.reduce((a,n)=>a+n.y,0)/c.length;
        const byA=c.slice().sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx)||a.id.localeCompare(b.id)); let C=[...Array(K)].map((_,i)=>{ const n=byA[Math.floor(i*byA.length/K)]; return [n.x,n.y]; });
        for(let it=0;it<12;it++){ c.forEach(n=>{ let b=0,bd=1e9; C.forEach((q,j)=>{ const d=(n.x-q[0])**2+(n.y-q[1])**2; if(d<bd){ bd=d; b=j; } }); n._band=b; });
          C=C.map((q,j)=>{ const m=c.filter(n=>n._band===j); return m.length?[m.reduce((a,n)=>a+n.x,0)/m.length,m.reduce((a,n)=>a+n.y,0)/m.length]:q; }); }
        const KS={marketing_landing:'marketing',storefront:'shops',dashboard_admin:'dashboards',tool_utility:'tools',document_text:'documents',auth_form:'login forms',game_scene:'games',greeting_event:'greetings',mobile_mockup:'mobile mock-ups',other:'other kinds',none:'no kind'};
        BOX2.bands=C.map((q,j)=>{ const m=c.filter(n=>n._band===j); if(!m.length) return null; const kc=new Array(G2.kinds.length).fill(0); m.forEach(n=>(n.kc||[]).forEach((v,i)=>{ kc[i]+=v; }));
          const all=new Array(G2.kinds.length).fill(0); c.forEach(n=>(n.kc||[]).forEach((v,i)=>{ all[i]+=v; })); const S_=kc.reduce((a,b)=>a+b,0)||1, A_=all.reduce((a,b)=>a+b,0)||1;
          const lift=kc.map((v,i)=>v>=3?(v/S_)/((all[i]||1)/A_):0), top=lift.indexOf(Math.max(...lift));   // the band is named by its most over-represented kind of page
          return {j,ns:m,x0:Math.min(...m.map(n=>n.x)),x1:Math.max(...m.map(n=>n.x)),y0:Math.min(...m.map(n=>n.y)),y1:Math.max(...m.map(n=>n.y)),cap:KS[G2.kinds[top]]||G2.kinds[top]}; }).filter(Boolean); }
      else if(L===2||L===3){   // one axis per layer: each node at the mean height of the elements it is made of, then spread to a minimum gap
        const tgt=n=>{ const ys=SEL_ADJ.filter(l=>l.t===n.id&&byId[l.s].lv===1).map(l=>byId[l.s].y); return ys.length?ys.reduce((a,b)=>a+b,0)/ys.length:null; };
        const H0=(c.length-1)*30; c.forEach(n=>{ const t=tgt(n); n.y=t==null?-H0/2+n._k*H0:t; }); c.sort((a,b)=>a.y-b.y||a.id.localeCompare(b.id));
        const MG=Math.max(14,Math.min(24,620/Math.max(1,c.length))); /* a fuller column keeps to the height of the others */ for(let it=0;it<40;it++){ for(let i=1;i<c.length;i++){ const d=c[i].y-c[i-1].y; if(d<MG){ const m=(MG-d)/2; c[i].y+=m; c[i-1].y-=m; } } }
        const mid=(c[0].y+c[c.length-1].y)/2; c.forEach(n=>{ n.y-=mid; });
        const dg=deg(), hub=n=>Math.min(16,Math.max(0,((dg[n.id]||0)-3)*2.5));   // hubs step a little off the axis, to the right
        c.forEach((n,i)=>{ n.x=x0+hub(n)*(i%2?1:-.6); });
        BOX2.cols.push({L,x:x0,n:c.length,top:Math.min(...c.map(n=>n.y))}); }
      else { const pitch=L===4?31:40, H=(c.length-1)*pitch;
        c.forEach((n,i)=>{ n.y=-H/2+n._k*H; n.x=x0; });
        BOX2.cols.push({L,x:x0,n:c.length,top:-H/2}); } });
    const sh=n=>Math.sqrt(Math.max(1e-6,(n.n_all||n.n||1)/(n.dpop==='all'?G2.pop_N:NN)));
    cols.forEach((c,L)=>{ const v=c.map(n=>L===2||L===3?Math.sqrt(D[n.id]||1):sh(n)), lo=Math.min(...v), hi=Math.max(...v);
      c.forEach((n,i)=>{ const t=hi>lo?(v[i]-lo)/(hi-lo):.5; n.r=L===4?6.5+10*t:L===5?3+4.7*t:L===0?3.2+5.3*t:4+11*t; }); });   // rules: size = degree (hubs big); others: share of pages
    CROSS.after=crossings(n=>n.y); LABK=null;   // crossings as drawn
  }
  function layout(){ if(S2.mode==='net') return layoutNet();
    let x=0; BOX2={cols:[],h:0,fam:[]};
    for(let L=0;L<6;L++){
      let ns=G2.nodes.filter(n=>n.lv===L&&n._on);
      const pin=n=>S2.sel&&CHAIN&&(n.id===S2.sel||CHAIN.down.has(n.id)||CHAIN.up.has(n.id))?0:1;   // item 47: the selected node's closure at the top of every column
      if(L===1) ns.sort((a,b)=>pin(a)-pin(b)||G2.families.indexOf(a.fam)-G2.families.indexOf(b.fam)||((b.vote||[0])[0]-(a.vote||[0])[0]));
      else if(L===0) ns.sort((a,b)=>pin(a)-pin(b)||(a.t===b.t?0:a.t==='task'?-1:1)||(b.n-a.n));
      else ns.sort((a,b)=>pin(a)-pin(b)||((b.vote||[0])[0]??-9)-((a.vote||[0])[0]??-9));
      const rows=[]; let last=null;
      ns.forEach(n=>{ if((L===1&&n.fam!==last)||(L===0&&n.t!==last)){ rows.push({head:L===1?n.fam:n.t==='task'?'task categories':'kinds of page'}); last=L===1?n.fam:n.t; } rows.push(n); });
      const sub=Math.max(1,Math.ceil(rows.length/ROWS)), per=Math.ceil(rows.length/sub);
      rows.forEach((r,i)=>{ const cx=x+Math.floor(i/per)*SUBW, cy=(i%per)*RH; if(r.head) BOX2.fam.push({t:r.head,x:cx,y:cy}); else { r.x=cx; r.y=cy; } });
      BOX2.cols.push({L,x,w:sub*SUBW,n:ns.length}); BOX2.h=Math.max(BOX2.h,per*RH); x+=sub*SUBW+GAP; }
    const W0=x-GAP, cx=W0/2, cy=BOX2.h/2;
    G2.nodes.forEach(n=>{ if(n._on){ n.x-=cx; n.y-=cy; n.r=3+Math.min(5,Math.sqrt((n.n||0)/NN)*14); } });
    BOX2.cols.forEach(c=>c.x-=cx); BOX2.fam.forEach(f=>{ f.x-=cx; f.y-=cy; }); BOX2.top=-cy; BOX2.w=W0;
  }

  /* ── what the selected node's links say ── */
  function condOf(l,A){   // A selected, B the other end: shares, lift, votes of the pages with both, overall or inside the chosen task / kind
    const c=l.c; if(!c||!c.n) return null; const B=l.s===A?l.t:l.s, a=l.s===A?0:1, b=1-a;
    let na=c.n[a], nb=c.n[b], nab=c.n[2], N=NN, v=c.v, where='overall';
    const f=FILT&&FILT[l._i];
    if(S2.task||S2.kind){ const ti=S2.task?TI(S2.task):KI(S2.kind), key=S2.task?'tt':'kk', cnt=S2.task?'tcl':'kc', tot=S2.task?G2.task_n:G2.kind_n;
      const r=f&&f[key]&&f[key][ti]; na=(byId[A][cnt]||[])[ti]||0; nb=(byId[B][cnt]||[])[ti]||0; nab=r?r[0]:0; N=tot[ti]; v=r&&r.length>1?r.slice(1):null;
      where='in '+(S2.task||S2.kind).replace(/_/g,' '); }
    const clus=byId[B].lv===5&&byId[A].lv!==5;   // into a cluster: read from the cluster's side
    const p=clus?(nb?nab/nb:null):(na?nab/na:null), base=clus?na/N:nb/N, den=clus?nb:na;
    const lift=na&&nb?nab*N/(na*nb):null;
    return {B,na,nb,nab,N,p,base,lift,v:nab>=MIN?v:null,few:den<MIN,den,clus,where};
  }
  const liftTxt=(r,An)=>r.few?`too few pages (${r.den})`:r.lift==null?'–':r.clus?`${pc(r.p)} of this cluster’s pages · ${pc(r.base)} ${r.where}`:
    r.lift>=1?`${r.lift.toFixed(1)}× more common ${r.where==='overall'?'here':r.where}`:`${r.lift.toFixed(r.lift<.1?2:1)}×: rare ${r.where==='overall'?'here':r.where}`;
  const voteTxt=r=>r.v?`${ppv(r.v[0])} pp`:r.nab?`votes: few pages (${r.nab})`:'';
  let SELROWS=null;
  function selRows(){ if(!S2.sel) return SELROWS=null; const A=S2.sel, m=new Map();
    for(const l of [...(inc[A]||[]),...(out[A]||[])]){ const r=condOf(l,A); if(!r) continue; const o=m.get(r.B); if(!o||l.type!=='substitutes'&&o.l.type==='substitutes') m.set(r.B,{...r,l}); }
    return SELROWS=m; }

  /* ── the engine ── */
  const gp=$('graphPane');
  const engNodes=byId;
  const LIFTC=TH.accent, LESS=TH.amber;
  const lw=r=>r&&r.lift>0&&!r.few?1+Math.min(5,Math.abs(Math.log2(r.lift))*1.6):1;
  const isRegTop=l=>{ const t=REGTOP.get(l.t); return !!t&&t.some(x=>x._i===l._i); };
  function NHIT(n,p){ return S2.mode==='net'?Math.hypot(p.x-n.x,p.y-n.y)<=n.r+4/sm2.cam.k:p.x>=n.x-n.r-6/sm2.cam.k&&p.x<=n.x+Math.min(SUBW-16,n.r+8+(n.name||'').length*6.2)&&Math.abs(p.y-n.y)<=Math.min(RH/2,n.r+6/sm2.cam.k+3); }   // one hit test for the engine and the example card
  const sm2=Starmap({canvas:'#graphPane canvas.sm-sky', inspector:'#graphPane .sm-insp', theme:GTH, nodes:engNodes, links:LINKS, layout:'none', focusOnSelect:false, panGain:1e-9, zoomGain:1e-9,
    padT:150, padB:40,
    visible:n=>n._on,
    related:id=>S2.mode==='net'?(LIT||netChain(id)):LIT||new Set([id,...[...(inc[id]||[]),...(out[id]||[])].map(l=>l.s===id?l.t:l.s)]),
    linkVisible:l=>LVIS(l),
    linkPath(l){ if(S2.mode!=='net') return null; const a=l.S,b=l.T, x1=a.x+a.r+3, x2=b.x-b.r-6, dx=Math.max(40,(x2-x1)*.5);   // smooth flow from left to right
      return {x1,y1:a.y,c1x:x1+dx,c1y:a.y,c2x:x2-dx,c2y:b.y,x2,y2:b.y}; },
    linkStyle(l){ const A=S2.sel;
      if(S2.mode==='net'&&!(A&&(l.s===A||l.t===A))) return netStyle(l);
      if(A&&(l.s===A||l.t===A)){ const r=SELROWS&&SELROWS.get(l.s===A?l.t:l.s);
        if(!r||r.few||r.lift==null) return {rgb:TH.edge,width:.9,dash:[2,4],arrow:false,particles:false};
        return {rgb:r.lift>=1?hex(LIFTC):hex(LESS),width:lw(r),dash:r.lift>=1?[]:[6,4],arrow:false,particles:false}; }
      if(!A&&S2.mode==='full'&&hovId!==l.s&&hovId!==l.t){ const v=Math.min(1,lstr(l)/.6), f=.3+.55*v;   // item 63: quiet at rest: ~0.6 px, dim, strength ordered
        const dk=GTH.blend==='lighter'; return {rgb:TH.edge.map(x=>Math.round(dk?x*f*.42:255-(255-x)*f*.42)),width:.6+.3*v,arrow:false,particles:false}; }   /* dark ground: towards black (links add light); light ground: towards white */
      if(l.type==='realised_in') return {rgb:TH.edge,width:hovId===l.t?2:1.5,arrow:false,particles:false};
      if(l.type==='composed_of'||l.type==='conditioned_on') return {rgb:TH.edge,width:A?1.3:.7,arrow:!!A,particles:false};
      return {rgb:TH.edge,width:.8,dash:l.type==='excludes'?[2,4]:[5,4],arrow:false,particles:false}; },
    nodeGlow:n=>{ const c=dotRGB(n); return GTH.blend==='lighter'&&!c.own?[0,0,0]:c.rgb; },
    labelBox:n=>S2.mode==='net'?{halfW:n.r+150,up:n.r+16,down:n.r+16}:{halfW:SUBW/2+10,up:n.r+10,down:n.r+10},
    hit:(n,p)=>NHIT(n,p),
    drawNode(c,n,st){ drawHeads(c,st,n); S2.mode==='net'?drawNet(c,n,st):drawN(c,n,st); },
    tooltip(x,isLink){ return isLink||window.HoverCard?null:nodeTip(x); },   // nodes: the example card below (item 54); text only without hovercard.js   // a tooltip only on a node (item 40); a link explains itself in the node's panel and on click
    inspectNode(n){ S2.sel=n.id; if(APPLIED!==n.id) refresh(!NOPUSH); return panel(n); },
    inspectLink(l){ return {k:'Link · '+l.type.replace('_',' '), title:`${esc(byId[l.s].name)} → ${esc(byId[l.t].name)}`, one:esc(G2.link_doc[l.type]||''), body:linkBody(l)}; }});
  const BORN=performance.now(), RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const born=n=>RM?1:Math.max(0,Math.min(1,(performance.now()-BORN-n.lv*260)/420));
  const STEP={}; LINKS.forEach(l=>{ if(l.type==='modifies'||l.type==='modifies_F') STEP[l.s+'|'+l.t]=l; else if(l.type==='conditioned_on'&&l.iv) STEP[l.s+'|'+l.t]=l; });
  function LVISnet(l){ return false; }   // the network's links are drawn by netLinks
  const netDrawn=l=>l.S._on&&l.T._on&&NETL.has(l._i)&&(l.type==='composed_of'||l.type==='realised_in'||l.type==='conditioned_on');
  const mix=(rgb,f)=>rgb.map((v,i)=>Math.round(TH.neu[i]+(v-TH.neu[i])*f));
  const STEPF={3:1,2:.78,1:.55,0:.4};   // four steps of evidence: strong, clear, leaning, cannot tell / F alone
  const BANDCAP=90;   // links per band at most, beyond the two per node per side
  let SEL_ADJ=[], SEL_SKIP=[];
  const lstr=l=>{ const c=l.c||{}; if(l.type==='realised_in') return c.n&&c.n[1]?Math.min(1,c.n[2]/c.n[1]):.2; return c.lift?Math.log10(Math.max(1,c.lift)):0; };
  let HUBS=new Set(), REGLAB=new Set();
  function netSel(){ SEL_ADJ=[]; SEL_SKIP=[]; HUBS=new Set(); REGLAB=new Set(); if(!NET) return;
    const ls=sm2.links.filter(l=>l.S._on&&l.T._on&&NETL.has(l._i)&&(l.type==='composed_of'||l.type==='realised_in'||l.type==='conditioned_on'));
    for(let L=0;L<5;L++){ const band=ls.filter(l=>l.S.lv===L&&(l.T.lv===L+1||l.type!=='conditioned_on'&&l.T.lv>L)).sort((a,b)=>lstr(b)-lstr(a)), keep=new Set(band.slice(0,BANDCAP));   // a band = the links leaving one layer (composition may pass a parallel layer: deep rules land in regions beside the looks)
      const per={}; band.forEach(l=>{ for(const e of [l.s+'>',l.t+'<']) if((per[e]=(per[e]||0)+1)<=2) keep.add(l); });   // at least two links per node per side where the data has them
      const k=[...keep].sort((a,b)=>lstr(a)-lstr(b)); k.forEach((l,r)=>{ l._w=k.length>1?r/(k.length-1):.5; }); SEL_ADJ.push(...k); }   // rank in the band: weakest 0, strongest 1
    const sk=(NET.skip||[]).map((o,r)=>({S:byId[o.s],T:byId[o.t],s:o.s,t:o.t,type:o.type,lift:o.lift,_w:1-r/Math.max(1,(NET.skip||[]).length-1),skip:1})).filter(o=>o.S&&o.T&&o.S._on&&o.T._on);
    SEL_SKIP=sk;
    const d=deg(); HUBS=new Set(G2.nodes.filter(n=>n._on&&(n.lv===2||n.lv===3)).sort((a,b)=>(d[b.id]||0)-(d[a.id]||0)).slice(0,LAY==='lattice'?34:16).map(n=>n.id));
    REGLAB=new Set(G2.nodes.filter(n=>n._on&&n.lv===5&&(n.cl||0)>=2).sort((a,b)=>(b.cl||0)-(a.cl||0)||Math.abs((b.vote||[0])[0]||0)-Math.abs((a.vote||[0])[0]||0)).slice(0,14).map(n=>n.id)); }   // item 59: the strong regions carry their label
  /* fine fibres: width 0.6 to 3 px and opacity 0.12 to 0.6 by rank in the band (strongest 5 x the weakest); neutral composition in a
     cool, dark grey-blue so the nodes lead; green / red only on a step that itself gains or loses votes */
  const NETEDGE=()=>GTH.blend==='lighter'?[78,98,140]:[128,140,170];
  function linkLook(l){ const st=STEP[l.s+'|'+l.t], w=l._w??.5, e=w**1.6, W=.5+1.5*e, A=.10+.35*e;   // a convex ramp in the band: most fibres fine, the strongest few heavier (item 42)
    if(l.skip) return {rgb:mix(TH.accent.match(/\w\w/g).map(x=>parseInt(x,16)),.6),w:.5+1.2*w,a:.12+.25*w,dash:[5,5],skip:1};
    if(l.type==='conditioned_on') return {rgb:NETEDGE(),w:.5+1.5*w,a:A*.8,dash:[2,4]};
    if(st&&st.iv&&(st.vote_ok||st.F_ok)){ const v=st.vote_ok, pos=(v?st.iv[0]:(st.iF||[0])[0])>0, k=v?(st.strong?3:Math.abs(st.iv[0])>.06?2:1):0;
      return {rgb:mix(pos?TH.pos:TH.neg,STEPF[k]*.85),w:Math.min(2.5,W+.5),a:Math.min(.5,A+.08),step:1}; }   // muted: colour says the step gains or loses votes, nothing says look here first
    return {rgb:NETEDGE(),w:W,a:A}; }
  let LITSET=null;
  function netLinks(c,time){ const foc=S2.sel||hovId||(S2.chain&&LIT?S2.chain:null), set=foc?(LIT||netChain(foc)):null; LITSET=set||new Set(((NET&&NET.top)||[]).flat());
    const top=new Set(((NET&&NET.top)||[]).flatMap(ch=>ch.slice(0,-1).map((x,i)=>[x+'|'+ch[i+1],ch[i+1]+'|'+x])).flat());
    const topC={}; ((NET&&NET.top)||[]).forEach(ch=>{ const end=byId[ch[ch.length-1]], v=end&&end.vote&&end.vote[0]; const rgb=v==null?null:mix(v>0?TH.pos:TH.neg,1).map(x=>Math.min(255,x+25));
      ch.slice(0,-1).forEach((x,i)=>{ topC[x+'|'+ch[i+1]]=topC[ch[i+1]+'|'+x]=rgb; }); });
    const all=[...SEL_ADJ,...SEL_SKIP].filter(l=>born(l.S)>=.5&&born(l.T)>=.5).map(l=>[l,linkLook(l)]);
    const isTop=l=>top.has(l.s+'|'+l.t)&&!l.skip;
    all.sort((p,q)=>isTop(p[0])-isTop(q[0])||(p[1].step||0)-(q[1].step||0)||(p[0]._w-q[0]._w));   // weakest first, steps above, the strongest chains last
    c.save(); c.globalCompositeOperation='source-over'; c.lineCap='round';
    const P=l=>{ const a=l.S,b=l.T;
      if(l.skip){ const x1=a.x+a.r+2,x2=b.x-b.r-3, mx=(x1+x2)/2, up=(l.S.lv+l.T.lv)%2?-1:1, bow=Math.min(70,30+Math.abs(x2-x1)*.08)*up;   // a shallow bow: arcs stay inside the drawing, clear of the legend
        return [x1,a.y,mx-(x2-x1)*.15,Math.min(a.y,b.y)*(up<0?1:0)+Math.max(a.y,b.y)*(up>0?1:0)+bow,mx+(x2-x1)*.15,Math.min(a.y,b.y)*(up<0?1:0)+Math.max(a.y,b.y)*(up>0?1:0)+bow,x2,b.y]; }
      const x1=a.x+a.r+2, x2=b.x-b.r-3, dx=Math.max(30,(x2-x1)*.5); return [x1,a.y,x1+dx,a.y,x2-dx,b.y,x2,b.y]; };
    for(const [l,s] of all){ const on=!set||set.has(l.s)&&set.has(l.t), p=P(l), glow=false;   // no strand is emphasised at rest (item 43)
      c.globalAlpha=on?(foc?Math.min(1,s.a+.3):glow?.9:s.a):.05*s.a; c.strokeStyle=`rgb(${s.rgb})`; c.lineWidth=glow?Math.min(3.5,s.w+.8):s.w; c.setLineDash(s.dash||[]);
      if(glow){ c.shadowColor=`rgb(${s.step?s.rgb:TH.accent.match(/\w\w/g).map(x=>parseInt(x,16))})`; c.shadowBlur=8; const tc=topC[l.s+'|'+l.t]; if(tc){ c.strokeStyle=`rgb(${tc})`; c.shadowColor=`rgb(${tc})`; } } else c.shadowBlur=0;
      c.beginPath(); c.moveTo(p[0],p[1]); c.bezierCurveTo(p[2],p[3],p[4],p[5],p[6],p[7]); c.stroke(); }
    c.setLineDash([]); c.shadowBlur=0;
    if(false&&!foc&&NET&&NET.top){ const fz=LFZ(11.5); c.font='600 '+fz.toFixed(1)+'px "JetBrains Mono",monospace'; c.textAlign='center'; c.globalAlpha=1;
      new Set(NET.top.flat()).forEach(id=>{ const n=byId[id]; if(!n||!n._on||!n.vote||n.vote[0]==null||n.lv<1) return; const t=ppv(n.vote[0]), w=c.measureText(t).width, side=n.lv===1, x=side?n.x+n.r+4+w/2:n.x, y=side?n.y+fz*.35:n.y+n.r+fz+3;   // primitives: to the right (their rows are close)
        c.fillStyle=TH.g.plate; c.fillRect(x-w/2-2,y-fz+1,w+4,fz+2); c.fillStyle=`rgb(${mix(n.vote[0]>0?TH.pos:TH.neg,1)})`; c.fillText(t,x,y); }); c.textAlign='left'; }
    // at rest, a slow pulse of light dots along the three strongest chains (not during a gesture, not under reduced motion)
    if(!RM&&foc&&set&&!(pz2&&pz2.busy())&&!PAUSE){   // the pulse runs only along a hovered or selected chain c.fillStyle=TH.ink; c.globalAlpha=.85;
      for(const [l] of all) if(set.has(l.s)&&set.has(l.t)&&!l.skip){ const p=P(l), u=((time||0)/3.2+(l.S.lv*.17))%1, v=1-u;
        const x=v*v*v*p[0]+3*v*v*u*p[2]+3*v*u*u*p[4]+u*u*u*p[6], y=v*v*v*p[1]+3*v*v*u*p[3]+3*v*u*u*p[5]+u*u*u*p[7];
        c.beginPath(); c.arc(x,y,2.2,0,7); c.fill(); } }
    c.restore(); }
  function LVIS(l){ if(S2.mode==='net') return LVISnet(l); if(!l.S._on||!l.T._on) return false;
      if(S2.sel){ const A=S2.sel, mine=l.s===A||l.t===A;
        if(mine) return l.type!=='modifies'&&(linkOn(l.type)||l.type==='composed_of'||l.type==='realised_in');
        const dn=x=>x===A||CHAIN.down.has(x), upx=x=>x===A||CHAIN.up.has(x);
        return (l.type==='composed_of'||l.type==='realised_in'||l.type==='conditioned_on'&&l.S.lv===0)&&(dn(l.s)&&dn(l.t)||upx(l.s)&&upx(l.t)); }
      if(!S2.alllinks&&KEYL&&!KEYL.has(l._i)&&!(l.type==='realised_in'&&isRegTop(l))&&hovId!==l.s&&hovId!==l.t) return false;   /* every region keeps its top incoming link */   // item 63: at rest the key links only; a hovered node shows all of its own
      if(l.type==='realised_in') return linkOn('realised_in')&&isRegTop(l);
      if(l.type==='composed_of') return linkOn('composed_of')&&l.T.lv>1;
      return l.type!=='modifies'&&l.type!=='realised_in'&&linkOn(l.type)&&(l.type!=='substitutes'&&l.type!=='conditioned_on'||hovId===l.s||hovId===l.t); }
  let KEYL=null;   // Details at rest (item 63): for each shown node its strongest link toward each neighbouring level, plus links of the top 5 % strength
  function keyLinks(){ if(S2.mode!=='full'){ KEYL=null; return; } const best=new Map(), all=[];
    for(const l of LINKS){ const S=byId[l.s], T=byId[l.t]; if(!S||!T||!S._on||!T._on||!(l.type==='composed_of'||l.type==='realised_in')) continue; const v=lstr(l); all.push(v);
      for(const [n,o] of [[S,T],[T,S]]){ const k=n.id+'>'+o.lv, b=best.get(k); if(!b||v>b[0]) best.set(k,[v,l._i]); } }
    all.sort((a,b)=>b-a); const thr=all.length?all[Math.floor(all.length*.05)]:Infinity; KEYL=new Set([...best.values()].map(x=>x[1]));
    for(const l of LINKS){ const S=byId[l.s], T=byId[l.t]; if(S&&T&&S._on&&T._on&&(l.type==='composed_of'||l.type==='realised_in')&&lstr(l)>=thr) KEYL.add(l._i); } }
  const FT=new Map();
  function fitTxt(c,s,w){ const k=c.font+'|'+w+'|'+s; if(FT.has(k)) return FT.get(k); let t=s;
    if(c.measureText(t).width>w){ let lo=0,hi=s.length; while(lo<hi){ const m=(lo+hi+1)>>1; if(c.measureText(s.slice(0,m)+'…').width<=w) lo=m; else hi=m-1; } t=s.slice(0,lo).trimEnd()+'…'; }
    FT.set(k,t); return t; }
  /* line weight = strength of the relation; colour only where the step itself gains or loses votes with support */
  function netStyle(l){ const skip=l.T.lv-l.S.lv>1, st=STEP[l.s+'|'+l.t];
    if(l.type==='conditioned_on') return {rgb:TH.edge,width:.8,dash:[3,4],arrow:false,particles:false};
    if(l.type==='realised_in'){ const c=l.c, sh=c&&c.n&&c.n[1]?c.n[2]/c.n[1]:.3; return {rgb:TH.edge,width:.8+4*Math.min(1,sh),arrow:false,particles:false}; }
    if(st&&st.iv){ const v=st.vote_ok, c=st.iv[0]>0?TH.pos:TH.neg; return {rgb:v?c:faintC(c,.55),width:1.6+Math.min(4,Math.abs(v?st.iv[0]:(st.iF||[0])[0]/4)*45),arrow:false,particles:!!v&&!!st.strong}; }
    return {rgb:TH.edge,width:skip?.9:1.6,arrow:false,particles:false}; }
  const faintC=(rgb,f)=>{ const g0=GTH.blend==='lighter'?[0,0,0]:[236,234,228]; return rgb.map((v,i)=>Math.round(g0[i]+(v-g0[i])*f)); };
  function hex(c){ const m=c.match(/\w\w/g); return m.map(x=>parseInt(x,16)); }
  /* node colour: its own vote effect at rest; with a node selected, a linked node shows its vote among the selected node's pages */
  function dotRGB(n){
    let e=n.vote, k=n.cl!=null?n.cl:(n.vt||0);
    if(S2.model&&(n.lv===4||n.lv===5)&&!(S2.sel&&n.id!==S2.sel&&SELROWS&&SELROWS.get(n.id))){ const m=n.md;
      if(!m||m.model_pref==null) return {rgb:TH.neu,a:.35,few:1};
      e=[m.model_pref,m.model_lo,m.model_hi]; const t=tierOf(e); k=t===2&&Math.abs(e[0])/((e[2]-e[1])/3.92)>=3?3:t; }
    const r=S2.sel&&n.id!==S2.sel&&SELROWS&&SELROWS.get(n.id);
    if(r){ if(!r.v) return {rgb:TH.neu,a:.5,few:1}; e=r.v; const t=tierOf(r.v); k=t===2&&Math.abs(e[0])/((e[2]-e[1])/3.92)>=3?3:t; }
    if(!e||e[0]==null||!k){ if(n.fe&&!r) return {rgb:mix(n.fe>0?TH.pos:TH.neg,STEPF[0]),a:.85,lean:1,fonly:1}; return {rgb:TH.neu,a:.8}; }
    const rgb=mix(e[0]>0?TH.pos:TH.neg,STEPF[k]);
    return k>=2?{rgb,a:.95,own:1,k}:{rgb,a:.85,lean:1,k};
  }
  let headFrame=-1, hovId=null, hovNext=null;
  let lastHov=null;
  function drawHeads(c,st,n){ if(st.time===headFrame) return; headFrame=st.time; hovId=hovNext; hovNext=null;
    if(S2.mode==='net'&&!S2.sel&&hovId!==lastHov){ lastHov=hovId; setNote(hovId?chainReading(hovId):S2.chain&&story()?storyReading():null); } const a=c.globalAlpha; c.globalAlpha=1;
    c.font='600 12.5px "JetBrains Mono",monospace'; c.textAlign='left'; c.fillStyle=TH.ink;
    if(S2.mode==='net'){ netLinks(c,st.time); c.globalAlpha=.8; c.textBaseline='alphabetic';
      if(BOX2.hetero){ c.save(); c.globalAlpha=.55; c.strokeStyle=TH.edge; c.lineWidth=1; c.font='500 11px "Space Grotesk",-apple-system,sans-serif'; c.fillStyle=TH.sub;
        c.font='500 '+LFZ(12.5).toFixed(1)+'px "Space Grotesk",-apple-system,sans-serif'; BOX2.fam.forEach(f=>{ f.x=Math.min(...f.ns.map(n=>n.x-n.r-6-c.measureText(n.sn||n.name).width))-8; });
        BOX2.fam.forEach(f=>{ const ys=f.ns.map(n=>n.y); c.beginPath(); c.moveTo(f.x+4,Math.min(...ys)-8); c.lineTo(f.x,Math.min(...ys)-8); c.lineTo(f.x,Math.max(...ys)+8); c.lineTo(f.x+4,Math.max(...ys)+8); c.stroke(); });
        if(BOX2.inset){ const m=BOX2.inset, xs=m.ps.map(p=>p[1][0]), ys=m.ps.map(p=>p[1][1]), ax=Math.min(...xs), bx=Math.max(...xs), ay=Math.min(...ys), by=Math.max(...ys);   // the regions' true positions, as an inset
          c.setLineDash([3,4]); c.beginPath(); c.roundRect(m.x-8,m.y-6,m.w,m.h+12,6); c.stroke(); c.setLineDash([]);
          m.ps.forEach(([n,p])=>{ const t=dotRGB(n); c.fillStyle=`rgba(${t.rgb},.9)`; c.fillRect(m.x+(bx>ax?(p[0]-ax)/(bx-ax):.5)*(m.w-16)-1.5,m.y+(by>ay?(p[1]-ay)/(by-ay):.5)*m.h-1.5,3,3); });
          c.fillStyle=TH.sub; c.textAlign='left'; c.font=`500 ${LFZ(10.5)}px "Space Grotesk",-apple-system,sans-serif`; c.fillText('as placed on the continuous map',m.x-8,m.y+m.h+6+LFZ(12)); }
        if(BOX2.bands){ const hb=hovId&&byId[hovId]&&byId[hovId].lv===5?byId[hovId]._band:-1; c.save(); c.font=`500 ${LFZ(10)}px "Space Grotesk",-apple-system,sans-serif`; c.textAlign='left';
          BOX2.bands.forEach(b=>{ c.globalAlpha=b.j===hb?.55:.16; c.strokeStyle=TH.sub; c.lineWidth=1; c.beginPath(); c.roundRect(b.x0-9,b.y0-9,b.x1-b.x0+18,b.y1-b.y0+18,10); c.stroke();
            c.globalAlpha=b.j===hb?.95:.5; c.fillStyle=TH.sub; c.fillText(b.cap,b.x0-6,b.y0-12); }); c.restore(); }
        if(BOX2.map){ const m=BOX2.map; c.setLineDash([3,4]); c.beginPath(); c.roundRect(m.x,m.y,m.w,m.h,10); c.stroke(); c.setLineDash([]); c.textAlign='center'; c.fillText('regions, placed as on the continuous map',m.x+m.w/2,m.y+m.h+16); }
        c.restore(); }
      const ty=Math.min(...BOX2.cols.map(b=>b.top))-LFZ(36); c.textAlign='center';
      const cf=LFZ(12), xs=BOX2.cols.map(b=>b.x).sort((a,b)=>a-b);
      BOX2.cols.forEach(col=>{ const L0=LV[col.L], L=BOX2.lattice&&col.L===3?{name:col.sub?'Sub-profiles':'Rules of 3–5 literals',n:G2.nodes.filter(n=>n.lv===3&&(n.t==='sub')===!!col.sub).length}:L0, i=xs.indexOf(col.x), room=Math.min(i?col.x-xs[i-1]:400,i<xs.length-1?xs[i+1]-col.x:400)-12;
        c.font=`600 ${cf}px "Space Grotesk",-apple-system,sans-serif`; c.fillStyle=TH.sub; let nm=[L.name];
        if(c.measureText(L.name).width>room){ const w=L.name.split(' '); let a=w.length-1; while(a>1&&c.measureText(w.slice(0,a).join(' ')).width>room) a--; nm=[w.slice(0,a).join(' '),fitTxt(c,w.slice(a).join(' '),room)]; }
        nm.forEach((t,i)=>c.fillText(t,col.x,ty-(nm.length-1-i)*cf*1.3));
        c.font=`400 ${cf}px "Space Grotesk",-apple-system,sans-serif`; c.fillText(`${col.n} of ${L.n.toLocaleString()}`,col.x,ty+cf*1.35); }); c.textAlign='left';
      if(BOX2.hetero){ c.font='500 '+LFZ(10.5).toFixed(1)+'px "JetBrains Mono",monospace'; c.fillStyle=TH.sub; c.globalAlpha=.6; c.textAlign='left'; BOX2.fam.forEach(f=>{ c.save(); c.translate(f.x-6,f.y); c.rotate(-Math.PI/2); c.textAlign='right'; const ys=f.ns.map(n=>n.y); c.fillText(fitTxt(c,f.t,Math.max(...ys)-Math.min(...ys)+16),0,0); c.restore(); }); }
      c.globalAlpha=a; return; }
    { const k=st.k, top=(-gp.clientHeight/2-sm2.cam.y)/k, y0=Math.max(BOX2.top-44/k,top+18/k);   // sticky headers: fixed size on screen, pinned to the top of the frame, following the columns
      c.save(); c.globalAlpha=.92; c.fillStyle=TH.g.plate; c.fillRect((-gp.clientWidth/2-sm2.cam.x)/k,y0-16/k,gp.clientWidth/k,34/k); c.restore();
      BOX2.cols.forEach(col=>{ const L=LV[col.L], pn=POOLN[col.L]; c.font=`600 ${12.5/k}px "JetBrains Mono",monospace`; c.fillStyle=TH.ink; c.fillText(fitTxt(c,L.name.toUpperCase(),col.w-10),col.x,y0);   /* the caption keeps to its column */
        c.font=`400 ${11.5/k}px "Space Grotesk",-apple-system,sans-serif`; c.fillStyle=TH.sub;
        c.fillText(fitTxt(c,`${col.n} of ${pn.toLocaleString()}${pn<L.n?' (filtered)':''}`,col.w-10),col.x,y0+14/k); }); }
    c.font='600 12.5px "JetBrains Mono",monospace'; c.fillStyle=TH.ink;
    c.globalAlpha=.6; c.font='400 '+(10.5*FS)+'px "JetBrains Mono",monospace'; c.fillStyle=TH.sub; BOX2.fam.forEach(f=>c.fillText(f.t.toUpperCase(),f.x,f.y+4)); c.globalAlpha=a; }
  function chainReading(id){ const s=netChain(id), A=byId[id], up=[...s].map(x=>byId[x]).filter(n=>n.lv<A.lv&&n.lv>0).sort((a,b)=>a.lv-b.lv), dn=[...s].map(x=>byId[x]).filter(n=>n.lv>A.lv).sort((a,b)=>a.lv-b.lv);
    const nm=n=>esc(n.sn||n.name), ef=n=>n.vote&&n.vote[0]!=null?` <b class="${n.cl?cls(n.vote[0]):''}">${ppv(n.vote[0])} pp</b>`:'';
    return `${up.slice(0,3).map(nm).join(' + ')}${up.length>3?' …':''}${up.length?' → ':''}<b>${nm(A)}</b>${ef(A)}${dn.length?' → '+dn.slice(-2).map(n=>nm(n)+ef(n)).join(', '):''}`; }
  function shape(c,n){ c.beginPath(); const r=n.r;
    if(HET&&n.lv===5){ c.rect(n.x-r,n.y-r,2*r,2*r); return; }
    if(HET&&n.lv===0){ c.roundRect(n.x-r,n.y-r,2*r,2*r,r*.45); return; }
    if(!HET||n.lv===1||n.lv===4||n.t==='sub'){ c.arc(n.x,n.y,r,0,7); return; }
    const k=n.lv===2?4:6, a0=n.lv===2?0:Math.PI/6; for(let i=0;i<=k;i++){ const a=a0+i*2*Math.PI/k, x=n.x+r*1.15*Math.cos(a), y=n.y+r*1.15*Math.sin(a); i?c.lineTo(x,y):c.moveTo(x,y); } c.closePath(); }
  const IMG={};
  function lookImg(c,n){ const i=(n.ex||[])[0]; if(i==null) return; let im=IMG[n.id]; if(!im){ im=IMG[n.id]=new Image(); im.src=thumb(i); }
    if(!im.complete||!im.naturalWidth) return; c.save(); c.beginPath(); c.arc(n.x,n.y,n.r-2,0,7); c.clip(); const s=(n.r-2)*2; c.globalAlpha*=.9; c.drawImage(im,n.x-s*.8,n.y-s/2,s*1.6,s); c.restore(); }
  function drawNet(c,n,st){ if(st.hover) hovNext=n.id;   // the network's links and the note follow the pointer
    const b=born(n); if(b<=0) return; const ga=c.globalAlpha; c.globalAlpha=ga*b;
    const t=dotRGB(n), sel=n.id===S2.sel;
    if(S2.chain&&LIT&&!S2.sel){ if(!LIT.has(n.id)) c.globalAlpha=ga*b*.22; else { c.beginPath(); c.arc(n.x,n.y,n.r+5,0,7); c.fillStyle=`rgba(${t.rgb},.22)`; c.fill(); } }
    if(t.k===3&&!S2.sel){ c.beginPath(); c.arc(n.x,n.y,n.r+5,0,7); c.fillStyle=`rgba(${t.rgb},.18)`; c.fill(); }   // a soft halo on the strong tier
    shape(c,n); c.fillStyle=TH.chip; c.fill(); c.fillStyle=`rgba(${t.rgb},${t.a})`; c.fill();
    if(HET&&n.lv===4) lookImg(c,n);
    shape(c,n); c.strokeStyle=sel?TH.accent:`rgba(${t.own||t.lean?mix(t.rgb.map(v=>Math.min(255,v+40)),1):TH.edge},.95)`; c.lineWidth=sel?2.6:1.1; if(t.lean) c.setLineDash([2,2]); c.stroke(); c.setLineDash([]);
    if(HET&&n.t==='sub'){ c.beginPath(); c.arc(n.x,n.y,n.r+3,0,7); c.stroke(); }
    if(st.hover||sel){ c.beginPath(); c.arc(n.x,n.y,n.r+4,0,7); c.strokeStyle=TH.ink; c.lineWidth=1.2; c.stroke(); }
    const r=S2.sel&&!sel&&SELROWS&&SELROWS.get(n.id);
    const fz=S2.mode==='net'?LFZ(12.5):11/Math.min(1,st.k);   // labels stay at 11 px on screen when the view is zoomed out
    c.font=(sel||st.hover?'600 ':'500 ')+fz.toFixed(1)+'px "Space Grotesk",-apple-system,sans-serif';
    const nm=S2.mode==='net'?labelText(c,n):n.sn||n.name, w=c.measureText(nm).width;
    let lx, ly, al;
    if(HET){ placeLabels(c,st.k); const lab=LABOK.has(n.id)||sel||st.hover||n.lv===5&&LITSET&&LITSET.has(n.id);   // regions: the strongest, and those on a lit chain
      if(!lab){ c.textAlign='left'; c.globalAlpha=ga; return; }
      [lx,ly,al]=labelPos(n); }
    else if(n.lv===0){ lx=n.x-n.r-6; ly=n.y+4; al='right'; } else if(n.lv===5){ lx=n.x+n.r+6; ly=n.y+4; al='left'; } else { lx=n.x; ly=n.y-n.r-5; al='center'; }
    if(LAY==='lattice'&&n.lv===5){ c.save(); c.strokeStyle=TH.edge; c.globalAlpha=.5; c.lineWidth=.6; c.beginPath(); c.moveTo(n.x+n.r+1,n.y); c.lineTo(lx-3,n.y); c.stroke(); c.restore(); }
    c.textAlign=al; const cx=al==='center'?lx:al==='left'?lx+w/2:lx-w/2;
    st.plate(nm,cx,ly,2,12); c.fillStyle=TH.ink; c.fillText(nm,lx,ly);
    if(r&&TOPLAB.has(n.id)){ const txt=liftTxt(r)+(r.v?' · '+voteTxt(r):''); c.font='600 10.5px "Space Grotesk",-apple-system,sans-serif'; c.textAlign='center';
      st.plate(txt,n.x,n.y+n.r+16,2,11); c.fillStyle=r.lift>=1?TH.accent:TH.amber; c.fillText(txt,n.x,n.y+n.r+15); }
    c.textAlign='left'; c.globalAlpha=ga; }
  function drawN(c,n,st){
    const t=dotRGB(n), sel=n.id===S2.sel, unc=n.lv===5&&!(inc[n.id]||[]).some(l=>l.type==='realised_in');
    c.beginPath(); c.arc(n.x,n.y,n.r,0,7);
    if(unc){ c.setLineDash([2,2]); c.strokeStyle=TH.sub; c.lineWidth=1.2; c.stroke(); c.setLineDash([]); }
    else { c.fillStyle=TH.chip; c.fill(); c.fillStyle=`rgba(${t.rgb},${t.a})`; c.fill(); c.strokeStyle=sel?TH.accent:`rgb(${t.own||t.lean?t.rgb:TH.edge})`; c.lineWidth=sel?2.4:1; if(t.lean) c.setLineDash([2,2]); c.stroke(); c.setLineDash([]); }
    if(n.fail){ c.strokeStyle=TH.amber; c.lineWidth=1; c.beginPath(); c.arc(n.x,n.y,n.r+2.5,0,7); c.stroke(); }
    if(AUTO.has(n.id)&&!st.hover){ c.globalAlpha*=.85; }
    c.textAlign='left'; c.textBaseline='middle'; c.font=(sel?'600 ':'500 ')+(11.5*FS)+'px "Space Grotesk",-apple-system,sans-serif';
    const r=S2.sel&&!sel&&SELROWS&&SELROWS.get(n.id), val=r?voteTxt(r):(n.vote&&n.vote[0]!=null?ppv(n.vote[0]):''), vw=r?0:40;
    const wmax=SUBW-n.r-18-vw-(r?92:0);
    c.fillStyle=unc?TH.sub:TH.ink; c.fillText(fitTxt(c,unc?n.name+' · not described':n.name,wmax),n.x+n.r+5,n.y+.5);
    if(!r&&val){ c.font='500 '+(10.5*FS)+'px "JetBrains Mono",monospace'; c.fillStyle=t.own||t.lean?strong((n.vote||[0])[0]):TH.sub; c.textAlign='right'; c.fillText(val,n.x+SUBW-16,n.y+.5); }
    if(r){   // paired bar: share among the selected node's pages (top) against the overall share (bottom), same scale
      const bx=n.x+SUBW-104, w=60, p=r.few?null:r.p, b=r.base;
      c.fillStyle=TH.edge; c.globalAlpha*=.35; c.fillRect(bx,n.y-5,w,10); c.globalAlpha/=.35;
      if(p!=null){ c.fillStyle=r.lift>=1?TH.accent:TH.amber; c.fillRect(bx,n.y-5,Math.max(1,w*p),4.5); }
      c.fillStyle=TH.sub; c.fillRect(bx,n.y+1,Math.max(1,w*b),4);
      c.font='500 10.5px "JetBrains Mono",monospace'; c.textAlign='right'; c.fillStyle=r.v?strong(r.v[0]):TH.sub; c.fillText(r.v?ppv(r.v[0]):r.few?'few':'·',n.x+SUBW-16,n.y+.5); }
    c.textBaseline='alphabetic';
    if(st.hover) hovNext=n.id;
    if(r&&TOPLAB.has(n.id)){ const txt=liftTxt(r)+(r.v?' · '+voteTxt(r):''); c.font='600 11px "Space Grotesk",-apple-system,sans-serif'; c.textAlign='left';
      st.plate(txt,n.x+n.r+5+c.measureText(txt).width/2,n.y-9,3,11); c.fillStyle=r.lift>=1?TH.accent:TH.amber; c.fillText(txt,n.x+n.r+5,n.y-9); }
  }
  let TOPLAB=new Set();
  function topLabels(){ TOPLAB=new Set(); if(!SELROWS) return; [...SELROWS.values()].filter(r=>!r.few&&r.lift&&byId[r.B]._on).sort((a,b)=>Math.abs(Math.log(b.lift))-Math.abs(Math.log(a.lift))).slice(0,8).forEach(r=>TOPLAB.add(r.B)); }

  function nodeTip(n){ if(S2.mode==='net'&&!S2.sel) return `<b>${esc(n.sn||n.name)}</b>${n.vote&&n.vote[0]!=null?' · '+ppv(n.vote[0])+' pp':''}`;   // one line: the chain reads in the note
    const r=S2.sel&&n.id!==S2.sel&&SELROWS&&SELROWS.get(n.id), A=S2.sel&&byId[S2.sel];
    const mtx=S2.model&&(n.lv===4||n.lv===5)?(n.md&&n.md.model_pref!=null?`<br><b>${esc(G2.model.name)}: ${ppv(n.md.model_pref)} pp [${ppv(n.md.model_lo)}, ${ppv(n.md.model_hi)}]</b> on ${n.md.n} of its pages; ${pc(n.md.model_share)} of its pages vs ${pc(n.md.overall_share)} of the others’ · all models ${ppv((n.vote||[])[0])} pp`:`<br><b>too few pages of ${esc(G2.model.name)} (${n.md?n.md.n:0})</b>`):'';
    const head=`<b>${esc(n.sn&&n.sn!==n.name?n.sn:n.name)}</b>${mtx}${n.sn&&n.sn!==n.name?`<br><s>${esc(n.name)}</s>`:''}<br><s>${esc(LV[n.lv].name)} · ${esc(n.fam||n.t)}${n.fail?' · render-failure family':''}<br>${n.n.toLocaleString()} labelled pages${n.n_all?` · ${n.n_all.toLocaleString()} in all`:''} · vote ${effTxt(n.vote,n.vt)}</s>`;
    if(!r) return head+(n.lv===5&&!(inc[n.id]||[]).some(l=>l.type==='realised_in')?'<br><s>not described by the vocabulary: no rule, sub-profile or look lands here</s>':'');
    return head+`<br><b>${esc(liftTxt(r))}</b>${r.v?` · <b>${voteTxt(r)}</b> in votes among ${esc(short(A.name,24))}’s pages`:''}<br><s>${r.clus?`${pc(r.p)} of this cluster’s pages have ${esc(short(A.name,24))} · ${pc(r.base)} ${r.where}`:`${pc(r.p)} of ${esc(short(A.name,24))}’s pages have it · ${pc(r.base)} ${r.where}`} · ${r.nab.toLocaleString()} pages with both</s>`; }
  function linkTip(l){ const r=S2.sel&&(l.s===S2.sel||l.t===S2.sel)&&condOf(l,S2.sel);
    return `<b>${esc(byId[l.s].name)}</b> ${l.type.replace('_',' ')} <b>${esc(byId[l.t].name)}</b>`+(r?`<br>${esc(liftTxt(r))}${r.v?' · '+voteTxt(r):''}`:'')+stepTxt(l); }
  function stepTxt(l){ const m=(out[l.s]||[]).find(x=>x.type==='modifies'&&x.t===l.t)||(l.type==='modifies'?l:null)||(l.type==='conditioned_on'&&l.iv?l:null);
    if(!m) return ''; if(m.xi) return `<br><s>interaction ${sgn(m.xi[0],2)} log-odds [${sgn(m.xi[1],2)}, ${sgn(m.xi[2],2)}] beyond the two values (report (b))</s>`;
    return `<br><s>adding ${esc(lit(m.add))}: ${m.vote_ok?'votes '+ppv(m.iv[0])+' pp ['+ppv(m.iv[1])+', '+ppv(m.iv[2])+'], semdev '+ppv(m.ivs):''}${m.vote_ok&&m.F_ok?' · ':''}${m.F_ok?'F '+sgn(m.iF[0],3)+' ['+sgn(m.iF[1],3)+', '+sgn(m.iF[2],3)+']':''} against the rest of the parent’s ${m.rest} pages in the area</s>`; }
  const lit=s=>byId[s]?byId[s].name:String(s).replace(/_/g,' ');
  const effTxt=(v,t)=>!v||v[0]==null?'n/a':`${ppv(v[0])} pp${v[1]!=null?` [${ppv(v[1])}, ${ppv(v[2])}]`:''}${t===2?' clear':t===1?' leaning':''}`;

  /* ── the panel: title and numbers, examples, distribution, then everything else ── */
  function panel(n){
    const pop=G2.populations[n.vs]||'', ex=exHTML(n);
    const one=`<span class="def" title="${esc(n.definition||'')}">${esc(n.definition||(n.lits?'Pages with '+n.lits.map(lit).join(' + ')+', inside one area of the continuous space.':''))}</span>`+
      `<div class="hl"><span><b>${(n.n_all||n.n).toLocaleString()}</b> pages${n.n_all?` (${n.n.toLocaleString()} labelled)`:''}</span><span>vote <b class="${n.vt?cls(n.vote[0]):''}">${effTxt(n.vote,n.vt)}</b></span>${n.held!=null?`<span>${n.held?'same sign on semdev':'sign flips on semdev'}</span>`:''}${n.fail?'<span class="warn">render-failure family</span>':''}</div>`;
    const body=`${ex}${distHTML(n)}${restHTML(n)}`;
    setTimeout(()=>{ const c=$('g2map'); if(c) miniMap(c,n); });
    const jump=S2.mode==='dense'?'<button class="hbtn g2jump" data-jump="full">Show in Details</button>':S2.mode==='net'&&DENSE_LIVE?'<button class="hbtn g2jump" data-jump="dense">Show in Full network</button>':'';
    return {k:`${esc(LV[n.lv].name)} · ${esc(n.fam||n.t)}`, title:esc(n.name), mono:esc(n.id), one:one+jump, body};
  }
  function exHTML(n){
    const ims=[], au=AUD[n.id];
    if(au&&au.examples&&au.examples.length){ const pix=Object.fromEntries(PAGES.map((p,i)=>[p,i]));   // the audit's examples: no two from one duplicate group
      au.examples.forEach(id=>ims.push({src:pix[id]!=null?thumb(pix[id]):'data/pilot/thumbs/'+id+'.webp', cap:`${n.name}: an example the cluster audit kept (one per duplicate group)`})); }
    else if(n.exemplars) n.exemplars.forEach((p,i)=>ims.push({src:'data/atlas/v3/'+p, cap:`${n.name}: chosen exemplar ${i+1}`, mark:'chosen exemplar'}));
    if(!(au&&au.examples&&au.examples.length)) (n.ex||[]).forEach(i=>ims.push({src:thumb(i), cap:`${n.name}: a page that ${n.lv===4||n.lv===5?'is a member':'satisfies it'} (sampled, not picked)`}));
    if(!ims.length) return `<div class="sm-sec">Example pages</div><div class="meas">No page of this node has a screenshot on the site.</div>`;
    const g='ex:'+n.id;
    return `<div class="sm-sec" title="${n.ex_pool?`sampled from the ${n.ex_pool.toLocaleString()} pages of this node with a screenshot on the site`:''}">Example pages · ${Math.min(4,ims.length)} of ${ims.length}${audTag(au)}</div><div class="exg${ims.length===1?' one':''}" data-lb-group="${esc(g)}">`+
      ims.map((m,i)=>`<figure${i>3?' hidden':''}>${m.mark?`<span class="exm">${m.mark}</span>`:''}<img loading="lazy" src="${esc(m.src)}" data-lb="${esc(g)}" data-lb-cap="${esc(m.cap)}" alt="${esc(m.cap)}">${i===3&&ims.length>4?`<span class="exmore">+${ims.length-4} more</span>`:''}</figure>`).join('')+'</div>';
  }
  const bar=(p,b,lab,tip)=>`<div class="pb" title="${esc(tip||'')}"><span class="g2l">${lab}</span><span class="pw"><i class="p1" style="width:${(100*Math.min(1,p||0)).toFixed(1)}%"></i><i class="p0" style="width:${(100*Math.min(1,b||0)).toFixed(1)}%"></i></span><span class="pv">${pc(p)}<em> · ${pc(b)}</em></span></div>`;
  function distHTML(n){
    const all=n.dpop==='all', tot=all?G2.pop_task_n:G2.task_n, N0=all?G2.pop_N:NN, nAll=all?n.n_all:n.n, prev=nAll/N0;
    let head='';
    if(S2.task||S2.kind){ const ti=S2.task?TI(S2.task):KI(S2.kind), here=S2.task?(n.tc[ti]||0)/tot[ti]:(n.kc[ti]||0)/G2.kind_n[ti];
      head=bar(here,prev,`in ${esc((S2.task||S2.kind).replace(/_/g,' '))} · overall`,'share of that task’s (kind’s) pages that have it, against its share of all pages'); }
    else head='';
    // composition: the share of the node's pages in each task / kind (bar) against the share of all pages (tick)
    const rows=(cs,ts,names,on)=>{ const s=cs.reduce((a,b)=>a+b,0)||1, S=ts.reduce((a,b)=>a+b,0)||1, mx=Math.max(...cs.map(c=>c/s),...ts.map(t=>t/S),1e-9);
      return cs.map((c,i)=>c/s<.005&&ts[i]/S<.02&&on!==names[i]?'':`<div class="tb${on===names[i]?' on':''}" title="${esc(names[i])}: ${pc(c/s)} of its pages, ${pc(ts[i]/S)} of all"><span>${esc(names[i].replace(/[-_]/g,' '))}</span><span class="tw"><i style="width:${(100*c/s/mx).toFixed(1)}%"></i><b style="left:${(100*ts[i]/S/mx).toFixed(1)}%"></b></span><em>${pc(c/s)}</em></div>`).join(''); };
    const mm=G2.months.map((m,i)=>(all?n.mc[i]/G2.pop_month_n[i]:n.mc[i]/G2.month_n[i])), mmx=Math.max(...mm,1e-9);
    return `<div class="sm-sec" title="bars: how its pages split; ticks: how all pages split">Distribution · ${pc(prev)} of ${all?`all ${G2.pop_N.toLocaleString()} pages`:`${NN.toLocaleString()} labelled pages`}</div>${head}
      <div class="dg3"><div><div class="dh">by task <span>| all pages</span></div>${rows(n.tc,tot,G2.tasks,S2.task)}</div>
      <div><div class="dh"${all?' title="labelled pages only"':''}>by kind of page</div>${rows(n.kc,G2.kind_n,G2.kinds,S2.kind)}</div>
      <div><div class="dh" title="share of that month’s pages">by month</div><div class="mb">${mm.map((v,i)=>`<i title="${mName(G2.months[i])}: ${pc(v)}" style="height:${(100*v/mmx).toFixed(0)}%"></i>`).join('')}</div><div class="ml"><span>${mName(G2.months[0],true)}</span><span>${mName(G2.months[G2.months.length-1],true)}</span></div>
      <div class="dh">on the continuous map</div><canvas id="g2map" width="320" height="170"></canvas><div class="ml"><a href="index.html?view=map">continuous space →</a>${n.lv===5&&n.level==='leaf'?` <a href="corr.html?leaf=${esc(n.id)}">correspondence →</a>`:''}${n.lv===4&&n.t==='style'?` <a href="pipeline.html?v=v3&node=${encodeURIComponent(n.id)}">pipeline page →</a>`:''}</div></div></div>`;
  }
  function miniMap(cv,n){ const d=G2.density, x=cv.getContext('2d'), w=cv.width, h=cv.height, mx=Math.max(...d.c);
    x.fillStyle=TH.ground; x.fillRect(0,0,w,h); const cw=w/d.n, ch=h/d.n;
    for(let j=0;j<d.n;j++) for(let i=0;i<d.n;i++){ const v=d.c[j*d.n+i]; if(!v) continue; x.globalAlpha=.12+.5*Math.sqrt(v/mx); x.fillStyle=TH.dim; x.fillRect(i*cw,j*ch,cw+.5,ch+.5); }
    x.globalAlpha=.9; x.fillStyle=TH.accent; const X=v=>(v-d.x0)/(d.x1-d.x0)*w, Y=v=>(v-d.y0)/(d.y1-d.y0)*h;
    for(const [a,b] of n.xy) { x.beginPath(); x.arc(X(a),Y(b),2.6,0,7); x.fill(); } x.globalAlpha=1; }
  function restHTML(n){
    const A=n.id, parts=PARTS(A), ups=UP(A), rows=SELROWS?[...SELROWS.values()]:[];
    const mods=(inc[A]||[]).filter(l=>l.type==='modifies');
    const rel=(t,ls,side)=>ls.length?`<div class="sm-sec">${t} · ${ls.length}</div>`+ls.slice(0,40).map(l=>{ const o=byId[side==='s'?l.s:l.t];
      return `<div class="sm-rel" data-go2="${esc(o.id)}"><div class="r">${esc(o.name)}</div><div class="m">${effTxt(o.vote,o.vt)}${stepTxt(l)?' · step':''}</div></div>`; }).join('')+(ls.length>40?`<div class="meas">and ${ls.length-40} more</div>`:''):'';
    const rk=(t,xs,f)=>xs.length?`<div class="rk"><div class="dh">${t}</div>${xs.map(f).join('')}</div>`:'';
    const sh=r=>bar(r.clus?r.p:r.p,r.base,`<a data-go2="${esc(r.B)}">${esc(short(byId[r.B].name,26))}</a>`,`${liftTxt(r)}; ${r.nab} pages with both`)+`<div class="rkn">${esc(liftTxt(r))} · n ${r.nab.toLocaleString()}</div>`;
    const ok=rows.filter(r=>!r.few&&r.lift!=null&&!r.clus);
    const vs=rows.filter(r=>r.v);
    const vrow=r=>`<div class="sm-rel" data-go2="${esc(r.B)}"><div class="r">${esc(short(byId[r.B].name,30))}</div><div class="m"><b class="${tierOf(r.v)?cls(r.v[0]):''}">${ppv(r.v[0])} pp</b> [${ppv(r.v[1])}, ${ppv(r.v[2])}] · ${r.nab}</div></div>`;
    const lists=rows.length?`<div class="sm-sec">Among ${esc(short(n.name,30))}’s pages${S2.task||S2.kind?' in '+esc(S2.task||S2.kind):''}</div><div class="rks">
      ${rk('more common here than overall',ok.filter(r=>r.lift>1).sort((a,b)=>b.lift-a.lift).slice(0,5),sh)}${rk('less common here',ok.filter(r=>r.lift<1).sort((a,b)=>a.lift-b.lift).slice(0,5),sh)}</div>
      <div class="rks">${rk('wins more here',vs.filter(r=>r.v[0]>0).sort((a,b)=>b.v[0]-a.v[0]).slice(0,5),vrow)}${rk('wins less here',vs.filter(r=>r.v[0]<0).sort((a,b)=>a.v[0]-b.v[0]).slice(0,5),vrow)}</div>`:'';
    const src=`<div class="sm-sec">Numbers and their population</div><div class="meas">Vote: ${esc(G2.populations[n.vs]||'')}${n.vq!=null?` q ${n.vq}.`:''}${n.vn?` ${(+n.vn).toLocaleString()} votes.`:''}</div>
      ${n.F?`<div class="meas">F ${sgn(n.F[0],3)} [${sgn(n.F[1],3)}, ${sgn(n.F[2],3)}]: ${esc(G2.populations[n.Fs]||'')}</div>`:''}
      ${n.vc&&n.vs!=='bundle'?`<div class="meas">Computed on the ${NN.toLocaleString()} labelled pages for comparison: ${effTxt(n.vc,tierOf(n.vc))}, ${n.vc[3].toLocaleString()} pages.</div>`:''}
      ${n.pr?`<div class="meas">Rule and area: P(area | rule) ${pc(n.pr.p)} on scoring pages, ${pc(n.pr.ps)} on semdev; P(rule | area) ${pc(n.pr.r)} / ${pc(n.pr.rs)}; ${Math.round(n.pr.pop).toLocaleString()} population pages in rule and area, area ${n.pr.area.toLocaleString()}.${n.sel!=null?' Selected pair '+(n.sel+1)+' of 33 (greedy, explains F).':''}</div>`:''}
      ${n.cover?`<div class="meas">Covered by rules: ${pc(n.cover.leaf)} of its labelled members inside a passing pair at leaf resolution (${pc(n.cover.counting)} inside one that carries a vote effect)${n.cover_pairs?`; ${n.cover_pairs} pairs hold half of them, the 5 most precise are linked`:''}. Best rule: ${esc(n.cover.best||'')}.</div>`:''}
      ${n.xi?`<div class="meas">Interaction ${sgn(n.xi[0],2)} log-odds per vote [${sgn(n.xi[1],2)}, ${sgn(n.xi[2],2)}], q ${n.xq}: ${esc(G2.populations.report_x)}</div>`:''}`;
    return `${S2.mode==='net'?`<div class="sm-sec">Its chains in the network</div><div class="g2path inpanel">${chainHTML()}</div>`:''}${lists}${rel('Made of',parts,'s')}${mods.length?`<div class="sm-sec">What each step adds or costs · ${mods.length}</div>`+mods.slice(0,20).map(l=>`<div class="sm-rel" data-go2="${esc(l.s)}"><div class="r">${esc(byId[l.s].name)}</div><div class="m">${stepTxt(l).replace(/<br>|<\/?s>/g,'')}</div></div>`).join(''):''}
      ${rel('Part of, lands in',ups,'t')}${src}${tableHTML(rows)}${n.cond?`<div class="meas">Atlas condition ${esc(n.cond)}.</div>`:''}`;
  }
  let TS={k:'lift',d:-1};
  function tableHTML(rows){ if(!rows.length) return ''; const k=TS.k, val=r=>k==='name'?byId[r.B].name:k==='v'?(r.v?r.v[0]:null):k==='p'?r.p:k==='base'?r.base:k==='n'?r.nab:r.few?null:r.lift;
    const rs=rows.slice().sort((a,b)=>{ const x=val(a),y=val(b); return x==null||y==null?(x==null)-(y==null):(typeof x==='string'?x.localeCompare(y):x-y)*TS.d; });
    const th=(c,t)=>`<th data-ts="${c}" style="cursor:pointer;text-align:${c==='name'?'left':'right'}">${t}${k===c?(TS.d<0?' ▾':' ▴'):''}</th>`;
    return `<div class="sm-sec">Every linked node · ${rows.length}</div><table class="sum cond lt">${'<tr>'+th('name','node')+th('p','Given')+th('base','Overall')+th('lift','Lift')+th('v','Votes')+th('n','n')+'</tr>'}
      ${rs.map(r=>`<tr class="go" data-go2="${esc(r.B)}"><td>${esc(short(byId[r.B].name,30))} <span style="color:var(--faint)">${esc(r.l.type.replace('_',' '))}</span></td><td class="n">${r.few?'few':pc(r.p)}</td><td class="n">${pc(r.base)}</td><td class="n">${r.few||r.lift==null?'–':r.lift.toFixed(1)+'×'}</td><td class="n ${r.v&&tierOf(r.v)?cls(r.v[0]):''}">${r.v?ppv(r.v[0]):'few'}</td><td class="n">${r.nab.toLocaleString()}</td></tr>`).join('')}</table>
      <div class="meas">Given = share of the selected node’s pages that have the linked node (into a cluster: share of the cluster’s pages that have the selected node); Overall = the linked node’s share of all pages; Lift = Given ÷ Overall; Votes = votes won beyond model strength by the pages with both (pp), “few” under ${MIN} pages. Population: ${esc(G2.populations.bundle)}</div>`; }
  function linkBody(l){ const c=l.c||{}; return `<div class="meas">${c.n?`${c.n[0].toLocaleString()} / ${c.n[1].toLocaleString()} labelled pages, ${c.n[2].toLocaleString()} with both; lift ${c.lift!=null?c.lift.toFixed(2):'–'}${c.v?`; votes of the pages with both ${ppv(c.v[0])} pp [${ppv(c.v[1])}, ${ppv(c.v[2])}]`:''}.`:''}</div>${stepTxt(l)?`<div class="meas">${stepTxt(l).replace(/<br>|<\/?s>/g,'')}</div>`:''}${l.share_in!=null?`<div class="meas">In the look's profile: ${pc(l.share_in)} of its pages against ${pc(l.share_bg)} of its condition (lift ${l.plift}).</div>`:''}${l.ce?`<div class="meas">Effect inside ${esc(byId[l.s].name)}: ${effTxt(l.ce,l.ct)} (report (a), ${l.cn} votes).</div>`:''}${l.phi!=null?`<div class="meas">phi ${l.phi}</div>`:''}`; }

  /* ── header strip: counts per level and per link type, show more, filters ── */
  const gopts=$('gopts');
  function stripNet(){ const n=NET.nodes.length, ln=[...NETL].filter(i=>['composed_of','realised_in','conditioned_on'].includes(LINKS[i].type)).length;
    const vs=new Set(LINKS.filter(l=>(l.type==='modifies'||l.type==='conditioned_on'&&l.iv)&&l.vote_ok).map(l=>l.t+'|'+l.add)), st=new Set(LINKS.filter(l=>l.strong).map(l=>l.t+'|'+l.add)),
      fo=new Set(LINKS.filter(l=>(l.type==='modifies_F'||l.type==='conditioned_on'&&l.iv&&!l.vote_ok)&&l.F_ok).map(l=>l.t+'|'+l.add));
    gopts.innerHTML=`<div class="g2row"><details class="netrule"><summary><b>${n}</b> of ${G2.nodes.length.toLocaleString()}${NETKEY!=='all'?' for '+esc(NETKEY.replace('=',' ').replace(/_/g,' ')):''} · which</summary><div>
        <p><b>${n}</b> nodes and <b>${ln}</b> links on show, of ${G2.nodes.length.toLocaleString()} nodes and ${LINKS.length.toLocaleString()} links built from ${NN.toLocaleString()} labelled pages. Steps that change votes: ${vs.size} (${st.size} strong); by F alone ${fo.size.toLocaleString()}.</p><p>${esc(G2.net_rule)}</p></div></details>
      ${(NET.stories||[]).length?`<span class="seg g2play" role="group" aria-label="Play a chain step by step"><button class="hbtn" data-play="first" title="First step">⏮</button><button class="hbtn" data-play="prev" title="Previous step (←)">◀</button><button class="hbtn" data-play="next" title="Next step (→)">▶</button><button class="hbtn" data-play="last" title="Last step">⏭</button></span>
      <select id="g2story" aria-label="Story"><option value="">Stories (${NET.stories.length})</option>${NET.stories.map(st=>`<option value="${esc(st.id)}"${st.id===S2.chain?' selected':''}>${esc(storyName(st))}</option>`).join('')}</select>`:''}
      <label>Task <select id="g2task"><option value="">All</option>${G2.tasks.map(t=>`<option${t===S2.task?' selected':''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Kind <select id="g2kind"><option value="">All</option>${G2.kinds.map(t=>`<option${t===S2.kind?' selected':''}>${esc(t)}</option>`).join('')}</select></label>${modelSeg()}</div>`; }
  const modelSeg=()=>`<span>Model</span><span class="seg"><button class="hbtn${S2.model?'':' on'}" data-model="0">All models</button><button class="hbtn${S2.model?' on':''}" data-model="1">${esc(G2.model.name)}</button></span>${S2.model&&S2.mode==='full'?`<span class="seg"><button class="hbtn${S2.msort==='meff'?' on':''}" data-msort="meff">by the model’s effect</button><button class="hbtn${S2.msort==='ratio'?' on':''}" data-msort="ratio">model over-represented</button></span>`:''}`;
  function strip(){ if(S2.mode==='net') return stripNet();
    const unc=G2.nodes.filter(n=>n.lv===5&&!(inc[n.id]||[]).some(l=>l.type==='realised_in')).length;
    const lt=Object.keys(LT).map(t=>`<button class="hbtn${linkOn(t)?' on':''}" data-lt="${t}" title="${esc(G2.link_doc[t]||'')}">${t.replace('_',' ')} ${LT[t].toLocaleString()}</button>`).join('');
    const lv=LV.map((L,i)=>`<span class="lvc">${esc(L.name)} <b>${[...SHOWN].filter(id=>byId[id].lv===i).length}</b>/${POOLN[i].toLocaleString()}${i&&POOLN[i]>baseK(i)&&!S2.more[i]?`<button class="hbtn" data-more="${i}">show all</button>`:''}${S2.more[i]?`<button class="hbtn" data-less="${i}">fewer</button>`:''}</span>`).join('');
    const fam=['',...G2.families].map(f=>`<option value="${esc(f)}"${f===S2.fam?' selected':''}>${f?esc(f):'all families'}</option>`).join('');
    const nf=G2.nodes.filter(n=>n.fail).length;
    // one row (item 39): Task, Kind, Model, search and one Filters popover with the level chips, the undescribed regions, link types, family, failures
    gopts.innerHTML=`<div class="g2row"><details class="netrule dfilt"><summary>Filters</summary><div><p>${lv}</p><p><span class="lvc warn" title="regions no rule, sub-profile or look lands in">not described by the vocabulary: <b>${unc}</b> of ${LV[5].n} regions</span></p>
      <p><span>Links</span> ${lt} <button class="hbtn${S2.alllinks?' on':''}" id="g2alll" title="At rest only the key links are drawn (each node's strongest toward each neighbouring level, and the strongest overall); this draws them all">All links ${S2.alllinks?'on':'off'}</button></p><p><label>Primitives <select id="g2fam">${fam}</select></label>
      <button class="hbtn${S2.fail?' on':''}" id="g2fail" title="Rules, regions and looks whose pages mostly do not render intact (blank, raw text, loading, broken, missing assets); render-state values">Render failures ${nf.toLocaleString()} ${S2.fail?'shown':'hidden'}</button></p></div></details>
      <label>Task <select id="g2task"><option value="">All</option>${G2.tasks.map(t=>`<option${t===S2.task?' selected':''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Kind <select id="g2kind"><option value="">All</option>${G2.kinds.map(t=>`<option${t===S2.kind?' selected':''}>${esc(t)}</option>`).join('')}</select></label>
      <input id="g2q" type="search" placeholder="Search nodes" value="${esc(S2.q)}">${modelSeg()}</div>`;
  }
  gopts.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.play){ const st=story(), n=st?steps(st).length:5, p=b.dataset.play; playGo(S2.chain, !st?1:p==='first'?1:p==='last'?n:p==='prev'?S2.step-1:S2.step+1); return; }
    if(b.dataset.lt){ const s=new Set(S2.links.split(',').filter(Boolean)); s.has(b.dataset.lt)?s.delete(b.dataset.lt):s.add(b.dataset.lt); S2.links=[...s].join(','); }
    else if(b.dataset.more!=null) S2.more[+b.dataset.more]++; else if(b.dataset.less!=null) S2.more[+b.dataset.less]=Math.max(0,S2.more[+b.dataset.less]-1);
    else if(b.id==='g2fail') S2.fail=!S2.fail; else if(b.id==='g2alll') S2.alllinks=!S2.alllinks; else if(b.dataset.model!=null){ S2.model=b.dataset.model==='1'; if(!S2.model) S2.msort=''; } else if(b.dataset.msort!=null) S2.msort=S2.msort===b.dataset.msort?'':b.dataset.msort; else return;
    refresh(true,true); });
  gopts.addEventListener('change',e=>{ if(e.target.id==='g2story'){ if(e.target.value) playGo(e.target.value,1); else { S2.chain=null; S2.step=0; refresh(true); } } });
  gp.tabIndex=0; addEventListener('keydown',e=>{ if(S2.mode!=='net'||!(e.key==='ArrowRight'||e.key==='ArrowLeft')||LB.state().open) return;   // arrow keys step when the graph or the transport has focus
    const a=document.activeElement; if(!(a===gp||gp.contains(a)||a&&a.closest&&a.closest('.g2play')||S2.chain&&(a===document.body||!a))) return;
    e.preventDefault(); playGo(S2.chain, (S2.chain?S2.step:0)+(e.key==='ArrowRight'?1:-1)); });
  gopts.addEventListener('change',async e=>{ if(e.target.id==='g2task'){ S2.task=e.target.value||null; if(S2.task) S2.kind=null; } else if(e.target.id==='g2kind'){ S2.kind=e.target.value||null; if(S2.kind) S2.task=null; } else if(e.target.id==='g2fam') S2.fam=e.target.value; else return;
    refresh(true,true); });
  let qt=null; gopts.addEventListener('input',e=>{ if(e.target.id!=='g2q') return; clearTimeout(qt); qt=setTimeout(()=>{ S2.q=e.target.value.trim(); refresh(true,true); setTimeout(()=>{ const q=$('g2q'); q&&(q.focus(),q.setSelectionRange(q.value.length,q.value.length)); }); },300); });

  /* ── path panel: the chain in order ── */
  const pathBox=document.createElement('div'); pathBox.className='region g2path'; pathBox.hidden=true; gp.append(pathBox);
  function pathPanel(){ if(!S2.sel||S2.mode==='net'){ pathBox.hidden=true; return; } pathBox.innerHTML=`<button class="hbtn x">Clear</button>`+chainHTML(); pathBox.hidden=false; }
  function chainHTML(){ if(!S2.sel||!CHAIN) return ''; const A=byId[S2.sel], ch=CHAIN;
    const lvl=(set,dir)=>[0,1,2,3,4,5].map(L=>{ const ns=[...set].map(i=>byId[i]).filter(n=>n.lv===L&&(dir!=='up'||S2.fail||!n.fail)); if(!ns.length) return '';
      ns.sort((a,b)=>strength(b)-strength(a)); const k=dir==='up'?6:ns.length;
      return `<div class="g2l"><span class="g2n">${esc(LV[L].name)}</span>${ns.slice(0,k).map(n=>{ const st=dir==='down'?stepTxt((out[n.id]||[]).find(l=>l.t===S2.sel&&(l.type==='modifies'||l.type==='conditioned_on'&&l.iv))||{}):'';
        return `<a data-go2="${esc(n.id)}" title="${esc(n.name)}">${esc(short(n.name,28))} <b class="${n.vt?cls(n.vote[0]):''}">${n.vote&&n.vote[0]!=null?ppv(n.vote[0]):''}</b>${st?' <em>step</em>':''}</a>`; }).join('')}${ns.length>k?`<i>+${(ns.length-k).toLocaleString()} more</i>`:''}</div>`; }).join('');
    const steps=(inc[S2.sel]||[]).filter(l=>l.type==='modifies'||(l.type==='conditioned_on'&&l.iv));
    return `<h3>Chain of ${esc(short(A.name,40))}</h3>
      <div class="g2h">made of (down to the primitives)</div>${lvl(ch.down,'down')||'<div class="meas">nothing below it</div>'}
      <div class="g2l sel"><span class="g2n">selected</span><a>${esc(short(A.name,40))} <b class="${A.vt?cls(A.vote[0]):''}">${effTxt(A.vote,A.vt)}</b></a></div>
      ${steps.length?`<div class="g2h">what each step adds or costs (against the parent, where supported)</div>`+steps.slice(0,6).map(l=>`<div class="g2l"><a data-go2="${esc(l.s)}">+ ${esc(lit(l.add||l.s))}</a><span>${stepTxt(l).replace(/<br>|<\/?s>/g,'').replace(/^adding [^:]*: /,'')}</span></div>`).join(''):''}
      <div class="g2h">part of, lands in (up to the looks and regions)</div>${lvl(ch.up,'up')||'<div class="meas">nothing above it</div>'}`; }
  pathBox.addEventListener('click',e=>{ if(e.target.closest('.x')){ select(null); return; } const g=e.target.closest('[data-go2]'); if(g) select(g.dataset.go2); });
  document.querySelector('#graphPane .sm-body').addEventListener('click',e=>{ const ts=e.target.closest('[data-ts]'); if(ts){ const k=ts.dataset.ts; TS=TS.k===k?{k,d:-TS.d}:{k,d:k==='name'?1:-1}; sm2.openNode(S2.sel); return; }
    const g=e.target.closest('[data-go2]'); if(g&&!e.target.closest('[data-lb]')) select(g.dataset.go2); });

  /* ── state changes ── */
  function select(id){ if(id&&id===S2.sel) id=null; if(id) sm2.openNode(id); else { S2.sel=null; sm2.closeInsp(); refresh(true); } }
  let GPTOP=null, GPLEFT=null, FNEL=null, LASTSIG=null;   // FNEL: the Full network module's element
  async function refresh(push,refit){
    if((S2.task||S2.kind)&&!FILT){ const f=await fetch(B2+'cond_filters.json').then(r=>r.ok?r.json():null).catch(()=>null); FILT=f?f.links:{}; }
    document.body.dataset.gmode=S2.mode; MARK&&MARK();
    { const t=document.querySelector('#ctrlrow .tools'); if(t&&gopts.parentElement!==t) t.append(gopts); }
    if(S2.mode==='dense'&&window.DualModes){ const FV=!S2.flyTo&&PGVIEWS.dense; sm2.closeInsp(); gp.querySelector('canvas.sm-sky').hidden=true; DualModes.fullnet.mount(FNEL||(FNEL=gp.appendChild(document.createElement('div'))),{G:G2,base:B2,audit:AUD,task:S2.task,kind:S2.kind,model:S2.model,netIds:[...G2.networks.all.nodes],node:S2.flyTo,row:gopts,openPanel:id=>sm2.openNode(id),openViewer:(l,i)=>LB.open(l,i),onFilter:f=>{ Object.assign(S2,f); toURL(); },onDetails:id=>{ S2.mode='full'; S2.sel=id; refresh(true,true); },onView:v=>{ PGVIEWS.dense=v; pgSave(); }}); if(FV&&DualModes.fullnet.setView) requestAnimationFrame(()=>requestAnimationFrame(()=>S2.mode==='dense'&&DualModes.fullnet.setView(FV))); S2.flyTo=null;   /* the stored view, read before mount (mounting reports its fitted view through onView), set after it once the frame has its size; a fly-to wins */ $('pnote').dataset.base=NOTE.dense; setNote(null); toURL(push); return; }
    if(window.DualModes){ DualModes.fullnet.unmount(); gp.querySelector('canvas.sm-sky').hidden=false; } $('pnote').dataset.base=NOTE[S2.mode]||NOTE.net;
    { const t=document.querySelector('#ctrlrow .tools'); if(t&&gopts.parentElement!==t) t.append(gopts); }   // every mode: one controls row (items 31, 37, 39)
    SUBW=Math.round(Math.max(136,Math.min(440,(gp.clientWidth-60-5*GAP)/SUBCOLS.reduce((a,b)=>a+b,0)))); FT.clear();
    { const kx=Math.max(.6,Math.min(1,(gp.clientWidth-40)/(SUBCOLS.reduce((a,b)=>a+b,0)*SUBW+5*GAP+40))); ROWS=Math.max(24,Math.floor((gp.clientHeight-110)/(13*kx))); }   // the rows the frame holds at the width-fitted scale   // Details: the rows the frame holds below its sticky headers (the control row keeps a fixed height, so this does not change as it fills)
    choose(); selRows(); topLabels(); RH=13; FS=1; layout();
    if(S2.mode!=='net'&&BOX2.h){ const kx=Math.max(.6,Math.min(1,(gp.clientWidth-40)/(BOX2.w+40))), rh=Math.max(13,Math.min(22,Math.floor((gp.clientHeight-110)/(kx*BOX2.h/13)*10)/10)); if(rh>13){ RH=rh; FS=Math.min(1.3,rh/13); layout(); } }   /* item 58: the same rows spread over the free height, type up to 1.3x */
    keyLinks(); strip(); pathPanel(); legend2(); toURL(push);
    const h0=$('pnote').offsetHeight; requestAnimationFrame(()=>{ const r=gp.getBoundingClientRect(); if($('pnote').offsetHeight!==h0||r.top!==GPTOP||r.left!==GPLEFT){ GPTOP=r.top; GPLEFT=r.left; dispatchEvent(new Event('resize')); } });   // the engine reads its canvas offset on resize: a moved canvas would shift every hit (item 40a)
    if(S2.chain&&story()) setNote(storyReading()); else if(!S2.sel) setNote(null);
    else setNote(`<b>${esc(byId[S2.sel].name)}</b>, ${esc(LV[byId[S2.sel].lv].name.toLowerCase())}, ${(byId[S2.sel].n_all||byId[S2.sel].n).toLocaleString()} pages${S2.task||S2.kind?` (shares inside ${esc(S2.task||S2.kind)})`:''}. Line = how much more (solid blue) or less (dashed amber) common each linked node is among its pages; dot colour = how the linked node does in votes among its pages; bars = share among its pages (top) against overall (bottom).`);
    const sig=S2.mode+'|'+NETKEY+'|'+[...SHOWN].sort().join(',');   // item 61: no refit when only the selection changed
    if(refit||sig!==LASTSIG||!BASE2){ fit2(); if(PGVIEWS[S2.mode]&&pz2&&!LASTSIG?.startsWith(S2.mode+'|')) requestAnimationFrame(()=>pz2.set(PGVIEWS[S2.mode])); } LASTSIG=sig; pgSave(); }
  function DOCK(){ return innerWidth>=2400?document.querySelector('#graphPane .sm-insp').offsetWidth||500:0; }   /* item 58, >= 2400 px: the node panel docks in its own column at the right; the network is fitted beside it, so opening it covers and moves nothing */
  function fit2(){ const c=sm2.cam, w=gp.clientWidth-(S2.mode==='net'&&DOCK()?DOCK():(document.querySelector('#graphPane .sm-insp.on')?document.querySelector('#graphPane .sm-insp').offsetWidth:0)), h=gp.clientHeight, top=30;   // the controls sit in the row above the frame; the sticky headers need ~30 px
    if(S2.mode==='net'){ const ns=G2.nodes.filter(n=>n._on); if(!ns.length) return; const x0=Math.min(...ns.map(n=>n.x-n.r)), x1=Math.max(...ns.map(n=>n.x+n.r)), y0=Math.min(...ns.map(n=>n.y-n.r)), y1=Math.max(...ns.map(n=>n.y+n.r));
      const L=150, Rt=175, T=72, B=10, kh=(document.getElementById('graphLegend')||{}).offsetHeight||28, av=h-kh-12;   // screen px: labels left of the first layers, region labels right, column heads above
      const k=Math.max(.45,Math.min(2.4,(w-L-Rt)/(x1-x0),(av-T-B)/(y1-y0))); c.k=k;
      c.x=-gp.clientWidth/2+L-x0*k+Math.max(0,(w-L-Rt-(x1-x0)*k)/2); c.y=-h/2+T-y0*k+Math.max(0,(av-T-B-(y1-y0)*k)/2); BASE2={...c}; LABK=null; typeof pz2!=='undefined'&&pz2&&pz2.fit(); return; }
    const k=Math.max(.6,Math.min(1,(w-40)/(BOX2.w+40)));   // Details: width-fitted, top-aligned; a taller list ("show all") is dragged into view
    c.k=k; c.x=(w-gp.clientWidth)/2; c.y=-h/2+top+(-BOX2.top+50)*k;
    const n=S2.sel&&byId[S2.sel]; if(n){ const W=gp.clientWidth, sx=W/2+c.x+n.x*k; if(sx>w-SUBW*k-20) c.x-=sx-(w-SUBW*k-20); else if(sx<30) c.x+=30-sx; }
    BASE2={...c}; typeof pz2!=='undefined'&&pz2&&pz2.fit(); }
  function resetAll(){ pgClear(); PGVIEWS={}; const m=S2.mode; if(m==='dense'&&window.DualModes&&DualModes.fullnet.reset){ DualModes.fullnet.reset(); return; } Object.assign(S2,JSON.parse(JSON.stringify(DEF))); S2.mode=m; sm2.closeInsp(); refresh(true,true); }   // the mode is the page: Reset keeps it
  // the drawer closing (its ✕, Escape, a click on the background) clears the selection
  new MutationObserver(()=>{ if(!document.querySelector('#graphPane .sm-insp').classList.contains('on')&&S2.sel){ S2.sel=null; refresh(true); } else if(S2.mode!=='net') fit2(); })   /* the network keeps its view when the panel opens or closes (item 61) */
    .observe(document.querySelector('#graphPane .sm-insp'),{attributes:true,attributeFilter:['class']});
  // a click on the selected node again deselects it (before the engine opens it once more)
  $('graphPane').querySelector('canvas.sm-sky').addEventListener('click',e=>{ if(!S2.sel) return; const r=gp.getBoundingClientRect(), c=sm2.cam, n=byId[S2.sel];
    const x=(e.clientX-r.left-r.width/2-c.x)/c.k, y=(e.clientY-r.top-r.height/2-c.y)/c.k;
    if(x>=n.x-n.r-4&&x<=n.x+SUBW-16&&Math.abs(y-n.y)<=RH/2){ e.stopImmediatePropagation(); select(null); } },true);
  $('graphPane').querySelector('canvas.sm-sky').addEventListener('click',e=>{ if(S2.mode!=='net'||S2.sel) return; const r=gp.getBoundingClientRect(), c=sm2.cam;
    const x=(e.clientX-r.left-r.width/2-c.x)/c.k, y=(e.clientY-r.top-r.height/2-c.y)/c.k, n=G2.nodes.find(n=>n._on&&n.lv===0&&Math.abs(x-n.x)<=n.r+5&&Math.abs(y-n.y)<=n.r+5);
    if(!n) return; e.stopImmediatePropagation(); const [f,v]=n.id.split('='); if(f!=='task'&&f!=='kind') return;
    if(f==='task'){ S2.task=S2.task===v?null:v; if(S2.task) S2.kind=null; } else { S2.kind=S2.kind===v?null:v; if(S2.kind) S2.task=null; } refresh(true,true); },true);
  document.querySelector('#graphPane .sm-insp').addEventListener('click',e=>{ const b=e.target.closest('[data-jump]'); if(!b||!S2.sel) return; const id=S2.sel, m=b.dataset.jump;
    S2.mode=m; if(m==='dense'){ S2.sel=null; S2.flyTo=id; sm2.closeInsp(); refresh(true,true); } else { refresh(true,true); } MARK&&MARK(); });
  // Escape: the viewer and the drawer close first (engine, viewer); with both closed it clears the filters step by step
  addEventListener('keydown',e=>{ if(e.key!=='Escape'||LB.state().open||document.querySelector('#graphPane .sm-insp.on')) return;
    if(S2.q||S2.task||S2.kind||S2.fam||S2.fail||S2.more.some(x=>x)||S2.links!==DEF.links) resetAll(); },true);
  addEventListener('popstate',()=>{ fromURL(); NOPUSH=true; APPLIED=undefined; if(S2.sel) sm2.openNode(S2.sel); else { sm2.closeInsp(); refresh(false,true); } NOPUSH=false; });
  function legend2(){ if(S2.mode==='net'&&!S2.sel) return legendNet();
    const dot=(rgb,a,d)=>`<i class="sw" style="border-radius:50%;width:11px;height:11px;background:rgba(${rgb},${a});border:1px ${d?'dashed':'solid'} rgb(${rgb})"></i>`;
    $('graphKey').innerHTML=S2.sel?`<span class="tiers"><span><svg width="30" height="10"><line x1="1" y1="5" x2="29" y2="5" stroke="${TH.accent}" stroke-width="4"/></svg> line = more common among the selected node’s pages (thicker = larger lift); <svg width="30" height="10"><line x1="1" y1="5" x2="29" y2="5" stroke="${TH.amber}" stroke-width="3" stroke-dasharray="6 4"/></svg> less common</span><span>${dot(TH.pos,.95)}${dot(TH.neg,.95)} dot = the linked node’s votes among the selected node’s pages; grey = fewer than ${MIN} pages</span></span>`
      :`<span class="tiers"><span>${dot(TH.pos,.95)}${dot(TH.neg,.95)}solid = 95% interval excludes zero</span><span>${dot(TH.pos,LEAN*.8,1)}${dot(TH.neg,LEAN*.8,1)}lighter, dashed = leaning (80%)</span><span>${dot(TH.neu,.8)}grey = cannot tell · <i class="sw" style="border-radius:50%;width:11px;height:11px;border:1px dashed ${TH.sub}"></i> region not described by the vocabulary · amber ring = render-failure family</span></span>`;
    $('graphLegendBody').innerHTML=`<p><b>Columns</b> are levels, left to right: ${LV.map(l=>esc(l.name)+' ('+l.n.toLocaleString()+')').join(', ')}. Each column shows a readable selection (half the strongest effects, half the most reused nodes); “+20” in the header shows more, search finds any node. Inside a column, higher = wins more.</p>
      <p><b>Dot colour</b> = the node’s effect on votes, from its source (each node’s panel names the population); <b>size</b> = share of the labelled pages. <b>Number</b> on the right = that effect in percentage points.</p>
      <p><b>Lines at rest</b>: grey “made of” lines between the nodes on show (a rule from its literals and from its parent rule with one literal fewer; a look from the values of its profile), and each region’s one or two strongest incoming lines (a look first, else a rule or sub-profile; strongest = largest lift, with at least ${MIN} labelled pages behind it where possible). The header switches each kind of link on or off.</p>
      <p><b>Select a node</b>: its chain lights, down to the primitives it is made of and up to the looks and regions it lands in; the chain panel lists it in order with each node’s effect and, where joint mining supports it (≥ ${G2.floors.inc_rest} pages on the other side and the same sign on semdev), what the step adds or costs. Its own lines then show the difference: <b>line</b> = how much more (solid blue, thicker = larger lift) or less (dashed amber) common the linked node is among the selected node’s pages; <b>dot colour</b> = how the linked node does in votes among those pages; the <b>paired bar</b> beside it = share among them (top) against overall (bottom), one scale. Prevalence and preference never share a channel. With a task or kind chosen, every share is inside it.</p>
      <p><b>Reset view</b> (top right), Escape, a click on the background or on the selected node again, and the browser’s Back button undo a selection.</p>`; }
  function legendNet(){ const dot=(rgb,a,d)=>`<i class="sw" style="border-radius:50%;width:11px;height:11px;background:rgba(${rgb},${a});border:1px ${d?'dashed':'solid'} rgb(${rgb})"></i>`;
    const sw=(k,pos)=>{ const c=mix(pos?TH.pos:TH.neg,STEPF[k]); return `<i class="sw" style="border-radius:50%;width:11px;height:11px;background:rgba(${c},${k>=2?.95:.85});border:1px ${k<2?'dashed':'solid'} rgb(${c})"></i>`; };
    $('graphKey').innerHTML=`<span class="netcore">colour = vote effect:</span>
      <span class="tiers"><span>${[3,2,1].map(k=>sw(k,1)+sw(k,0)+' '+['','','leaning','clear','strong'][k+1]).join(' ')} ${dot(TH.neu,.8)} none · ▢ context ● element ◆ rule ◎ sub-profile ◉ look ▪ region · <svg width="22" height="8"><line x1="1" y1="4" x2="21" y2="4" stroke="rgb(${TH.accent.match(/\w\w/g).map(x=>parseInt(x,16))})" stroke-width="2" stroke-dasharray="5 4"/></svg> skip · green / red link = gains / loses votes</span></span>`;
    $('graphLegendBody').innerHTML=`<p><b>Colour</b>: hue = sign (green wins more votes, red fewer); four steps of evidence: strong (95 % interval clear of zero and |effect| ≥ 3 se), clear (95 %), leaning (80 %, dashed rim), cannot tell (grey); paler middle nodes have evidence on F alone. <b>Size</b>: share of pages (rules: number of links drawn). <b>Lines</b>: part of / lands in, thicker and brighter = stronger within its band; green or red = a step that itself gains or loses votes (paler: by F alone); dashed arcs = skip connections that act directly; no link is emphasised at rest; pointing at a node lights its chains. <b>Shapes</b>: context nodes as rounded squares, task categories and kinds of page in two groups (size = share of pages; a click filters the graph to it); primitives bracketed by family; diamonds = rules of 1–2 literals; hexagons = rules of 3–5 literals; double ring = shared sub-profile; looks carry an example page; regions are placed as on the continuous map.</p><p>${esc(G2.net_rule)}</p><p>Point at a node: every chain through it lights. Click: it stays lit and its panel opens (examples, distribution, then the rest); its own lines then show how much more or less common each linked node is among its pages. <b>Full network</b> (header) draws every node of the structure; <b>Details</b> lists every level with counts and search; <b>Reset view</b>, Escape, a click on the background, the selected node again and Back return here.</p>`;   const pd=document.querySelector('#pdet>div'); if(pd){ let x=pd.querySelector('.howto'); if(!x){ x=document.createElement('div'); x.className='howto'; pd.append(x); } x.innerHTML='<p><b>How to read the graph.</b></p>'+$('graphLegendBody').innerHTML; } }   // "How to read" joins Details (item 31)
  let BASE2=null; const pz2=engineZoom(sm2,document.querySelector('#graphPane canvas.sm-sky'),()=>BASE2,e=>{ const r=gp.getBoundingClientRect(), c=sm2.cam, x=(e.clientX-r.left-r.width/2-c.x)/c.k, y=(e.clientY-r.top-r.height/2-c.y)/c.k;
    return G2.nodes.some(n=>n._on&&Math.hypot(x-n.x,y-n.y)<=n.r+6); });
  drawerSplit(document.querySelector('#graphPane .sm-insp'),'dualmap.v2.panel',()=>fit2());
  /* item 54: a node under the pointer shows, after 120 ms, a card with its examples (the shared hovercard.js): name, one line of numbers,
     2-4 pages that have it, and for an element two that lack it; nothing when the pointer is off every node (the same hit test) */
  const NHC=window.HoverCard?HoverCard.attach(document.querySelector('#graphPane canvas.sm-sky'),{width:470}):null;
  let hcT=0, hcId=null, hcOn=false;
  function cardFor(n){ const ex=(n.ex||[]).slice(0,4), w=n.lv===1?(n.exw||[]).slice(0,2):[], im=i=>`<img src="${thumb(i)}" alt="" loading="lazy">`;
    return {title:esc(n.sn||n.name), lines:[`${esc(LV[n.lv].name)} · ${(n.n_all||n.n||0).toLocaleString()} pages · vote ${effTxt(n.vote,n.vt)}`],
      extra:`<div class="nhc-g">${ex.map(im).join('')}</div>${w.length?`<div class="nhc-w">without it</div><div class="nhc-g nhc-wo">${w.map(im).join('')}</div>`:''}`}; }
  if(NHC){ const cvs=document.querySelector('#graphPane canvas.sm-sky');
    cvs.addEventListener('pointermove',e=>{ if(pz2&&pz2.busy()){ NHC.hide(); hcOn=false; return; } const r=gp.getBoundingClientRect(), c=sm2.cam, p={x:(e.clientX-r.left-r.width/2-c.x)/c.k, y:(e.clientY-r.top-r.height/2-c.y)/c.k};
      const n=G2.nodes.find(n=>n._on&&NHIT(n,p)), id=n?n.id:null;
      if(id!==hcId){ hcId=id; clearTimeout(hcT); NHC.hide(); hcOn=false; if(id) hcT=setTimeout(()=>{ if(hcId===id){ NHC.show(e,cardFor(byId[id])); hcOn=true; } },120); }
      else if(id&&hcOn) NHC.show(e,cardFor(byId[id])); });
    cvs.addEventListener('pointerleave',()=>{ clearTimeout(hcT); hcId=null; hcOn=false; NHC.hide(); });
    cvs.addEventListener('pointerdown',()=>{ clearTimeout(hcT); NHC.hide(); hcOn=false; }); }
  /* ── start ── */
  window.addEventListener('resize',()=>fit2());
  gp.style.setProperty('--g2top','1');
  if(S2.sel){ NOPUSH=true; sm2.openNode(S2.sel); NOPUSH=false; } else await refresh(false,true);
  if(PGIN&&PGVIEWS[S2.mode]&&pz2&&S2.mode!=='dense') requestAnimationFrame(()=>pz2.set(PGVIEWS[S2.mode]));   // the stored pan / zoom of this mode
  addEventListener('pagehide',()=>pgSave(true));
  { const cv_=document.querySelector('#graphPane canvas.sm-sky'); ['wheel','pointerup','dblclick'].forEach(ev=>cv_.addEventListener(ev,()=>pgSave(),{passive:true})); document.addEventListener('click',e=>{ if(e.target.closest('.pz-btns')) pgSave(); }); }
  $('theme').onclick=()=>{ const dark=root.dataset.theme!=='dark'; root.dataset.theme=dark?'dark':'light'; $('theme').textContent=dark?'Light':'Dark'; TH=THEMES[root.dataset.theme]; Object.assign(GTH,TH.g); legend2(); };

  var PAUSE=false;
  window.DM2={play:()=>({chain:S2.chain,step:S2.step,lit:LIT?[...LIT]:[],note:document.querySelector('#pnote .pn-t').textContent}), playGo:(c,st)=>playGo(c,st), lattice:()=>BOX2&&BOX2.lattice?G2.nodes.filter(n=>n._on).map(n=>({id:n.id,lv:n.lv,sub:n.t==='sub',x:n.x,y:n.y})):null, labs:()=>[...LABOK.entries()].map(([id,p])=>({id,lv:byId[id].lv,p})), crossings:()=>CROSS, adj:()=>SEL_ADJ.map(l=>({s:l.s,t:l.t,w:l._w,lw:linkLook(l).w})), skips:()=>SEL_SKIP.map(l=>({s:l.s,t:l.t,type:l.type})), pause:v=>{ PAUSE=!!v; }, S2,sm2,byId,LINKS,shown:()=>[...SHOWN],REGTOP:()=>REGTOP,rows:()=>SELROWS,cond:condOf,reset:resetAll,select,G2,
    drawn:()=>sm2.links.filter(l=>LVIS(l)), style:l=>netStyle(l), colours:()=>({pos:TH.pos,neg:TH.neg}), chain:id=>netChain(id), lit:()=>LIT||new Set()};
}

})();
