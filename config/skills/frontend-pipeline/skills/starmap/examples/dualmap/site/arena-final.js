/* Arena of the sealed final test: one generator (data field), all its prompts paged. Opens with two columns, prompt alone and
   the data pipeline (the system the test registered); "Add taste.md" puts taste.md between them. The panel's verdicts and F per
   pair on screen, the pipeline's route; then the quality and variety block. Data: data/arena_final/arena.json and analysis.json
   (python -m dual.site.arena_build). State in the URL, one history entry per change (Back undoes it):
   ?cols=3&p=<prompt id>&dev=<arm>:<mobile|shot>,...&fs=<arm>&scope=all (all optional; no parameter = the first-load view).
   Undo: "Reset view" (first-load view), Escape (full screen first, then the rest), Back. Keys: arrows page. */
(async()=>{
'use strict';
const $=s=>document.querySelector(s), BASE='data/arena_final/';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const p1=v=>v==null?'n/a':(v*100).toFixed(1)+'%', iv=v=>`${p1(v.rate)} [${(v.lo*100).toFixed(1)}, ${(v.hi*100).toFixed(1)}]`;
const sg=v=>v==null?'n/a':(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(2);
const [D,AN]=await Promise.all([fetch(BASE+'arena.json').then(r=>r.json()),fetch(BASE+'analysis.json').then(r=>r.ok?r.json():null).catch(()=>null)]);
const X=D.system||'W', P=Object.fromEntries(D.prompts.map(p=>[p.id,p])), SHORT={N:'Prompt alone',T:'taste.md',[X]:'Data pipeline'};
const MODES=D.modes||{three:['N','T',X]}, modeOf=c=>c===3||!MODES.two?'three':'two';
const ORDER=m=>D.order[m]||D.order[X], FEAT=m=>D.featured[m]??D.featured[X];
const FAILTXT={blank:'did not render: blank',loading:'did not render: stuck loading',raw_text:'did not render: raw text',unstyled:'did not render: unstyled',missing_assets:'broken images',broken_layout:'broken layout',sparse_empty:'unfinished first screen'};
/* badge from the render split (T02.05.02.04/S02): true failures name themselves; a sparse first screen that is a finished design is a look, not a failure */
const bad0=g=>g.withheld?'not judged: not shown':!g.page?'no page':g.split==='failure'?(FAILTXT[g.render]||'did not render'):g.split==='sparse_design'?'sparse first screen (a look)':'';
const bad=g=>g.forfeit?['partner page missing: forfeit',bad0(g)].filter(Boolean).join(' · '):bad0(g);   // decided by forfeit, never judged
const FK={pinned:'featured: pinned by the user',pinned_broken:'featured: pinned by the user (a page is broken)',win:'featured: both pages intact, the panel preferred the pipeline',loss:'featured: both pages intact, the panel preferred the other page (shown at its true share)',broken:'featured: a page is broken (mixed in at its true share)'};
const STOP={uncovered:'no style card fits this request: global layer and category notes',style_fixed:'the request fixes the look: global layer only',
  specific:'a detailed request: global layer and category notes',few_cards:'fewer than two compatible style cards: global layer and category notes',
  full_brief:'the request fixes the whole look: global layer and category notes',fixed_conflict:'the style cards clash with what the request fixes: global layer and category notes'};

/* view state <-> URL; the first-load view has no parameter */
let S, ARENA_COLS=null, PK=null;
function fromURL(){ const U=new URLSearchParams(location.search), cols=U.get('cols')==='3'?3:2, m=modeOf(cols), j=ORDER(m).indexOf(U.get('p'));
  const dev={}; (U.get('dev')||'').split(',').forEach(z=>{ const [a,d]=z.split(':'); if(MODES.three.includes(a)&&(d==='mobile'||d==='shot')) dev[a]=d; });
  const fs=MODES[m].includes(U.get('fs'))?U.get('fs'):null;
  const pv=MODES[m].includes(U.get('pv'))&&U.get('pv')!==MODES[m][0]?U.get('pv'):null;   // narrow screens: the pane shown (item 81)
  S={cols,i:Math.max(0,j),dev,fs,scope:U.get('scope')==='all'?'all':'shown',pv}; }
function toURL(){ const q=new URLSearchParams(), dv=Object.entries(S.dev).filter(([,d])=>d!=='desktop');
  if(S.cols===3) q.set('cols','3'); if(S.i) q.set('p',cur().id); if(dv.length) q.set('dev',dv.map(([a,d])=>a+':'+d).join(','));
  if(S.fs) q.set('fs',S.fs); if(S.scope==='all') q.set('scope','all'); if(S.pv) q.set('pv',S.pv);
  const s=q.toString(); return location.pathname+(s?'?'+s:''); }
const commit=()=>{ const u=toURL(); if(u!==location.pathname+location.search) history.pushState(null,'',u+location.hash); $('#arReset').disabled=isDefault(); };
const mode=()=>modeOf(S.cols), arms=()=>MODES[mode()], O=()=>ORDER(mode()), cur=()=>P[O()[S.i]];
const isDefault=()=>S.cols===2&&!S.i&&!Object.keys(S.dev).length&&!S.fs&&S.scope==='shown'&&!S.pv;
/* the view kept for the session (sessionStorage 'pg:arena', same contract on every page): {q: the URL query, side: sidebar sections open,
   more: request expanded}; q is restored only when the URL has no state parameter of its own (side and more always), all dropped when its prompt is unknown */
const SK='pg:arena', QK=['cols','p','dev','fs','scope','pv'];
let SIDE={}, ST=null, T0;
try{ ST=JSON.parse(sessionStorage.getItem(SK)); }catch(e){ ST=null; }
if(ST&&typeof ST==='object'){ const U=new URLSearchParams(ST.q||'');
  if(U.has('p')&&!ORDER(modeOf(U.get('cols')==='3'?3:2)).includes(U.get('p'))){ ST=null; try{ sessionStorage.removeItem(SK); }catch(e){} }
  else{ if(!QK.some(k=>new URLSearchParams(location.search).has(k))){ const s=U.toString(); history.replaceState(null,'',location.pathname+(s?'?'+s:'')+location.hash); }
    SIDE=ST.side&&typeof ST.side==='object'?ST.side:{}; } }
else ST=null;
const moreOpen=()=>!!$('#arTx')&&$('#arTx').classList.contains('open');
function save(){ clearTimeout(T0); const q=toURL().slice(location.pathname.length+1), rest=isDefault()&&!Object.values(SIDE).some(Boolean)&&!moreOpen();
  try{ if(rest) sessionStorage.removeItem(SK); else sessionStorage.setItem(SK,JSON.stringify({q,side:SIDE,more:moreOpen()})); }catch(e){} }
const sched=()=>{ clearTimeout(T0); T0=setTimeout(save,200); };
addEventListener('pagehide',save);
fromURL();

$('#view').innerHTML=`<header class="pg-head"><h1 class="pg-title">Arena: same prompt, same model, <em>with the data pipeline and without</em>.</h1>
  <div class="pg-note" id="arNote">${D.prompts.length} sealed prompts, pages by ${esc(D.model)}, judged blind by ${D.judges[D.generator].length} vision models; rates use all prompts. Arrow keys change the prompt.
    <details class="pg-more"><summary>Details</summary><div>Sealed final test: ${D.prompts.length} real prompts, generated by ${esc(D.model)}, the generator where the pipeline does best. Only the system prompt differs. The panel judged the first screens both ways round; win rates and counts use every prompt. <span id="arRule"></span> The counting of rates is explained in the sidebar.</div></details></div></header>
  <div class="ar-card ar-pr"><div class="tx" id="arTx"></div>
    <div class="ar-cl"><div class="ar-ctl"><select class="ar-b" id="arJump" aria-label="All prompts"></select><span class="ar-cnt" id="arCnt"></span><button class="ar-b" id="arPrev">← Previous</button><button class="ar-b ar-next" id="arNext">Next prompt →</button></div>
      <div class="ar-ctl ar-vc" role="group" aria-label="View"><button class="ar-b" id="arT" aria-pressed="false">+ Add taste.md</button><button class="ar-b" id="arReset" title="Back to the view of the first load (Escape)">Reset view</button></div></div></div>
  <div class="ar-main" id="arMain"><div class="ar-panes" id="arPanes" data-lb-group></div><div id="arSplit"></div><div id="arSide"></div></div>
  <section class="ar-card an" id="analysis" aria-label="Quality and variety"></section>`;
if(ST&&ST.more) $('#arTx').classList.add('open');

/* the aggregates of the shown generator, from all its prompts (report.json), for the pairs on screen; the detail line for all generators */
/* the counting note and all-generator rates, in the sidebar under the overall rates (item 56: no strip above the panes) */
function aggMore(){ const A=D.aggregates, t=A[`${X} vs T`], n=A[`${X} vs N`], three=S.cols===3, g=z=>Object.entries(z.by_generator).map(([k,v])=>`${k} ${p1(v.rate)}`).join(', ');
  return `<details class="ar-note how agm"${SIDE.agm?' open':''}><summary>All generators and how these are counted</summary>
      Share of pairs the panel gives the first-named page, after the registered discounts; ${n.shown.prompts} prompts of ${esc(D.model)}, a missing page loses, 95% interval by prompt. Green = the interval clears 50%.<br>
      All three generators (${n.all.prompts} prompts each): pipeline vs prompt alone <b>${iv(n.all)}</b> (${g(n)})${three?`; pipeline vs taste.md <b>${iv(t.all)}</b> (${g(t)})`:''}. Registered decision: vs prompt alone ${esc(n.decision)}${three?`, vs taste.md ${esc(t.decision)}`:''}.<br>
      The data pipeline shown is system ${esc(X)}, the one the test registered as primary (tree ${esc((D.trees[X]||{}).tree)} with repair). The report also holds a secondary variant of the pipeline; it is not shown here.${D.prompts.some(q=>Object.values(q.pages).some(g=>g.withheld))?' A page no judge has seen is not shown.':''}</details>`; }

/* one prompt: the panes on screen and the side card */
const pg=(q,a)=>q.pages[a]||{};
function fill(arm){ const q=cur(), st=document.querySelector(`.ar-pane[data-s="${arm}"] .ar-stage`), g=pg(q,arm); let d=S.dev[arm]||'desktop';
  st.classList.toggle('mob',d==='mobile');
  if(!g.page){ st.innerHTML=`<div class="no">${g.withheld?'not judged: not shown':'no page'}</div>`; return; }
  if(d==='shot'){ st.innerHTML=`<img class="ar-pg in" data-lb alt="${SHORT[arm]}: first screen" data-lb-cap="${esc(SHORT[arm])} · ${esc(q.id)} · first screen${bad(g)?' · '+esc(bad(g)):''}" data-lb-href="${BASE}pages/${q.key}_${arm}.html" src="${BASE}shots/${q.key}_${arm}.webp">`; return; }
  const el=document.createElement('iframe'); el.setAttribute('sandbox','allow-scripts'); el.title=SHORT[arm]; el.src=`${BASE}pages/${q.key}_${arm}.html`; el.className='ar-pg';
  /* natural width (desktop 1280, mobile 390), scaled down only when the pane is narrower, centred in the pane (item 81) */
  const fit=()=>{ const W=st.clientWidth, H=st.clientHeight, mob=d==='mobile', w=mob?390:1280; if(!W||!H) return; const k=Math.min(1,(W-(mob?24:0))/w);
    el.style.width=w+'px'; el.style.height=(mob?H-24:H)/k+'px'; el.style.left=Math.round((W-w*k)/2)+'px'; el.style.top=mob?'12px':'0'; el.style.transform=`scale(${k})`; };
  st.replaceChildren(el); fit(); new ResizeObserver(fit).observe(st); el.onload=()=>el.classList.add('in'); setTimeout(()=>el.classList.add('in'),2500); }
function side(q){ const judges=D.judges[D.generator], A=D.aggregates, three=S.cols===3, on=arms(), Q=AN&&AN.scopes.shown;
  const ivs=z=>`${p1(z.rate)} <small>[${(z.lo*100).toFixed(1)}, ${(z.hi*100).toFixed(1)}]</small>`;
  const core=(t,z)=>z&&z.shown?`<div class="cr"><span>${t}</span><b class="${z.shown.lo>.5?'up':z.shown.hi<.5?'dn':''}">${ivs(z.shown)}</b><span>F ${sg(z.F_diff.rate)}</span></div>`:`<div class="cr"><span>${t}</span><b class="nj">not judged</b><span></span></div>`;
  const per=Q?`<table class="pa"><tr><th></th>${on.map(a=>`<th>${SHORT[a]}</th>`).join('')}</tr>
    <tr><td>Intact</td>${on.map(a=>`<td data-a="${a}">${((Q.quality[a].intact||Q.quality[a].render_ok)[0]*100).toFixed(0)}%</td>`).join('')}</tr>
    <tr><td>Styles</td>${on.map(a=>`<td data-a="${a}">${Q.variety.arms[a].effective_styles[0].toFixed(0)}</td>`).join('')}</tr></table>`:'';
  const pair=o=>{ const r=q.pairs[`${X}v${o}`]; if(!r) return `<div class="ar-gr cur"><span>vs ${SHORT[o]}</span><b></b><span class="v">–</span></div>`;
    const w=r.verdicts.filter(v=>v.pick==='a').length;
    return `<div class="ar-gr cur"><span>vs ${SHORT[o]}</span><b>${r.verdicts.map(v=>`<i class="${v.pick==='a'?'taste':v.pick==='b'?'base':''}" title="${esc(v.judge)}, order ${v.order}: ${esc(v.reason)}"></i>`).join('')}</b><span class="v">${w}/${r.verdicts.length}</span></div>
      <div class="pv"><span>panel ${r.majority===1?'prefers the pipeline':r.majority===0?'prefers '+SHORT[o]:'tie'}</span></div>`; };
  const r=q.routes[X], tr=D.trees[X], href=f=>tr.served?`<a href="${tr.served}${f}" target="_blank" rel="noopener">${esc(f)}</a>`:`<span>${esc(f)}</span>`;
  return `<div class="ar-card ar-side">
    <div class="sm-sec">Overall · ${esc(D.model)}, ${A[`${X} vs N`].shown.prompts} prompts</div>
    ${core('Pipeline vs prompt alone',A[`${X} vs N`])}${three?core('Pipeline vs taste.md',A[`${X} vs T`])+core('taste.md vs prompt alone',A['T vs N']):''}
    ${per}${aggMore()}
    <div class="sm-sec">This prompt</div>${on.filter(a=>a!==X).reverse().map(pair).join('')}
    <div class="ar-note">F ${on.map(a=>`${SHORT[a]} ${sg(pg(q,a).F)}`).join(' · ')}</div>
    <details class="ar-note how"${SIDE.how?' open':''}><summary>How to read</summary>Win rate = share of pairs the panel gives the pipeline, after the registered discounts, 95% interval by prompt; green when the interval clears 50%. F = vote-fitted score of a page's look, higher is better; overall F is the mean difference, pipeline minus the other page. One dot per verdict (${judges.join(', ')}, both orders): green chose the pipeline's page, red the other, grey a tie. Intact = pages without a true failure as a visitor sees them; styles = effective number of styles (inverse Simpson of layout × background × imagery).</details>
    <div class="sm-sec">Route of the pipeline (tree ${esc(tr.tree)})</div>
    <div class="ar-rt">${href(`context/${r.category}.md`)}→<span>${esc((r.kind||'').replace(/_/g,' '))}</span>→${r.card?href(`card/${r.card}.md`):'<span>no card</span>'}</div>
    <div class="ar-note">${r.card?`Style card: ${esc(r.card_name||r.card)}${r.candidates>1?`, drawn from ${r.candidates} compatible`:''}.`:esc(STOP[r.stop]||r.stop||'')}</div>
    ${q.pipeline_demo?`<a class="run" href="pipeline.html?demo=${encodeURIComponent(q.key)}">Watch this request walk the skill →</a><div class="ar-note">On the pipeline page: tree r3, a later tree than the one tested here, so its route can differ.</div>`:'<div class="ar-note">No run of this request on the pipeline page.</div>'}
  </div>`; }
function show(anim){
  const L=O(), q=cur(), nf=FEAT(mode()), A=arms(), three=S.cols===3;
  const tb=$('#arT'); tb.classList.toggle('on',three); tb.setAttribute('aria-pressed',three); tb.textContent=three?'− Remove taste.md':'+ Add taste.md';
  $('#arReset').disabled=isDefault();
  $('#arTx').innerHTML=`<div class="ar-meta"><span>${esc(q.id)}</span><span>${esc(D.model)}</span><span>${esc(q.category)}</span>${q.language?`<span>${esc(q.language)}</span>`:''}${S.i<nf?(f=>`<span class="ft" title="${f}">${f}</span>`)(esc(FK[(D.featured_kind||{})[mode()]?.[q.id]]||'featured')):''}</div><q>${esc(q.prompt)}</q><button class="ar-more" id="arMore" hidden aria-expanded="false">more</button>`;
  moreFit();
  const nb=(D.featured_broken||{})[mode()];
  $('#arRule').textContent=nb==null?'':`Examples lead with pairs where ${three?'all three':'both'} pages rendered; ${nb} pairs with a broken page are mixed in (at most one in five, never in the first three). Rates and counts use all ${D.prompts.length} prompts.`;
  $('#arCnt').textContent=`${S.i+1} / ${L.length}`; $('#arPrev').disabled=!S.i;
  const opt=(id,j)=>{ const t=P[id].prompt.replace(/\s+/g,' ');   // the shared picker (picker.js) reads these options
    return `<option value="${j}"${j===S.i?' selected':''} data-tag="${esc(P[id].category)}" data-meta="#${j+1}" data-short="${j+1} · ${esc(id)}"${j<nf?' data-star="1"':''} title="${esc(t.slice(0,300))}">${esc(id)} · ${esc(t.slice(0,72))}${t.length>72?'…':''}</option>`; };
  $('#arJump').innerHTML=`<optgroup label="Featured examples · ${esc(D.model)}">${L.slice(0,nf).map((id,j)=>opt(id,j)).join('')}</optgroup><optgroup label="Other prompts">${L.slice(nf).map((id,j)=>opt(id,j+nf)).join('')}</optgroup>`;
  if(PK) PK.refresh();
  const m=$('#arPanes'), cp=A.includes(S.pv)?S.pv:A[0]; m.classList.toggle('c2',!three);
  /* narrow screens (page.css: <= 783 px) show one pane at a time; the switch picks it (hidden on wider screens) */
  m.innerHTML=`<div class="ar-sw" role="tablist" aria-label="Pane shown">${A.map(k=>`<button class="ar-b${k===cp?' on':''}" role="tab" aria-selected="${k===cp}" data-pv="${k}">${SHORT[k]}</button>`).join('')}</div>`+A.map(k=>`<div class="ar-card ar-pane${k===cp?' cur':''}" data-s="${k}"${anim?'':' style="animation:none"'}><div class="ar-ph"><div class="ar-lab"><span class="f${k===X?' t':''}">${SHORT[k]}</span></div>
    ${['desktop','mobile','shot'].map(d=>`<button class="ar-b ${(S.dev[k]||'desktop')===d?'on':''}" data-d="${d}">${d==='shot'?'Screenshot':d[0].toUpperCase()+d.slice(1)}</button>`).join('')}
    <button class="ar-b" data-fs title="Open full screen" aria-label="Open ${SHORT[k]} full screen">⤢</button></div><div class="ar-stage"></div>${bad(pg(q,k))?`<span class="ar-bad${pg(q,k).split==='sparse_design'?' look':''}" title="${esc(pg(q,k).why||'')}">${bad(pg(q,k))}</span>`:''}</div>`).join(''); $('#arSide').innerHTML=side(q);
  A.forEach(fill); }
function moreFit(){ const t=$('#arTx'), qe=t.querySelector('q'), mb=$('#arMore'); if(!qe) return;
  if(t.classList.contains('open')){ mb.hidden=false; mb.textContent='less'; mb.setAttribute('aria-expanded',true); return; }   // kept open across prompts and reloads: "less" closes it
  mb.hidden=qe.scrollHeight<=qe.clientHeight+1; }   // "more" only when the request runs past two lines
addEventListener('resize',moreFit);
function fullscreen(){ const on=!!S.fs&&pg(cur(),S.fs).page, f=$('#arFs');
  if(on){ const u=`${BASE}pages/${cur().key}_${S.fs}.html`; if($('#arFs iframe').getAttribute('src')!==u) $('#arFs iframe').src=u; $('#arFsT').textContent=SHORT[S.fs]; f.classList.add('on'); $('#arFsX').focus(); }
  else if(f.classList.contains('on')){ f.classList.remove('on'); $('#arFs iframe').src='about:blank'; } }
function render(anim){ show(anim); analysis(); fullscreen(); sched(); }
const change=(f,anim)=>{ f(); commit(); render(anim); };
const go=n=>{ const L=O().length; change(()=>{ S.i=(n+L)%L; S.fs=null; },true); };
function reset(){ S={cols:2,i:0,dev:{},fs:null,scope:'shown',pv:null}; SIDE={}; $('#arTx').classList.remove('open'); if(location.search||location.hash) history.pushState(null,'',location.pathname); render(true); save(); scrollTo(0,0); }

$('#view').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return;
  if(b.id==='arMore'){ const o=$('#arTx').classList.toggle('open'); b.textContent=o?'less':'more'; b.setAttribute('aria-expanded',o); sched(); return; }
  if(b.id==='arT'){ const id=cur().id; change(()=>{ S.cols=S.cols===3?2:3; S.i=Math.max(0,O().indexOf(id)); if(S.cols===2){ delete S.dev.T; if(S.pv==='T') S.pv=null; } },false); }
  else if(b.dataset.pv){ const k=b.dataset.pv; change(()=>{ S.pv=k===arms()[0]?null:k; },false); }
  else if(b.id==='arReset') reset();
  else if(b.id==='arNext') go(S.i+1); else if(b.id==='arPrev') go(S.i-1);
  else if(b.dataset.d){ const k=b.closest('.ar-pane').dataset.s;   // a second click on the device shown goes back to desktop
    change(()=>{ const d=(S.dev[k]||'desktop')===b.dataset.d?'desktop':b.dataset.d; if(d==='desktop') delete S.dev[k]; else S.dev[k]=d; },false); }
  else if(b.dataset.fs!=null){ const k=b.closest('.ar-pane').dataset.s; if(pg(cur(),k).page) change(()=>{ S.fs=k; },false); }
  else if(b.dataset.scope&&b.dataset.scope!==S.scope){ S.scope=b.dataset.scope; commit(); analysis(); sched(); } });
$('#arSide').addEventListener('toggle',e=>{ const d=e.target; if(d.tagName==='DETAILS'){ SIDE[d.classList.contains('agm')?'agm':'how']=d.open; sched(); } },true);   // toggle does not bubble
$('#arJump').onchange=e=>go(+e.target.value);
$('#arFsX').onclick=()=>{ if(S.fs) change(()=>{ S.fs=null; },false); };
addEventListener('popstate',()=>{ fromURL(); render(false); });
addEventListener('keydown',e=>{ if(e.target.closest&&e.target.closest('select,input,textarea,.pk')) return;   // the image viewer handles its own keys first
  const row=e.target.closest&&e.target.closest('.row'); if(row&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){ e.preventDefault(); slide(row,e.key==='ArrowRight'?1:-1); return; }
  if(e.key==='Escape'){ if(S.fs) $('#arFsX').click(); else if(!isDefault()) reset(); }
  else if(S.fs) return;
  else if(e.key==='ArrowRight') go(S.i+1); else if(e.key==='ArrowLeft'&&S.i) go(S.i-1); });

/* quality and variety (analysis.json), for the arms on screen: findings first, then one table, the most common styles (one sliding row
   per arm) and the contact sheets */
function analysis(){ const el=$('#analysis'); if(!AN){ el.hidden=true; return; }
  const Z=AN.scopes[S.scope], arms_=arms().filter(a=>Z.quality[a]), ci=(v,f)=>v&&v[0]!=null?`${f(v[0])}<small>${f(v[1])}–${f(v[2])}</small>`:'n/a';
  const pc=v=>(v*100).toFixed(1)+'%', d2=v=>v.toFixed(2), AW={[X]:'pipeline',T:'taste.md',N:'prompt alone'};
  const prow=n=>{ const z=Z.pairs[n], t=n.split(' vs ').map(k=>AW[k]).join(' vs '); return z.panel?`${t} ${pc(z.panel[0])} [${(z.panel[1]*100).toFixed(1)}, ${(z.panel[2]*100).toFixed(1)}]`:`${t}: ${z.status}`; };
  const live=(k,a)=>{ const q=P[(k||'').replace(/_[a-z]+$/,'')]; return q&&q.key===k&&pg(q,a).page; };   // only the shown generator's pages are served
  const fd=Array.isArray(Z.findings)?Z.findings:Z.findings[mode()], pairs=[`${X} vs N`].concat(S.cols===3?[`${X} vs T`,'T vs N']:[]).filter(n=>Z.pairs[n]);
  el.innerHTML=`<div class="eb">Quality and variety · computed from stored data</div><h2>What each arm produces</h2>
    <div class="sc">${['shown','all'].map(k=>`<button class="ar-b ${k===S.scope?'on':''}" data-scope="${k}">${esc(AN.scopes[k].label)}</button>`).join('')}</div>
    <ul class="fd">${fd.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
    <div class="tw"><table><tr><th>arm</th><th>intact</th><th>true failure</th><th>sparse look</th><th>task fit ≤ 1</th><th>density 0–4</th><th>craft 0–4</th><th>F mean</th><th>effective styles</th><th>distinct styles</th><th>map cells</th><th>mean distance</th></tr>
    ${arms_.map(a=>{ const q=Z.quality[a], v=Z.variety.arms[a]; return `<tr class="${a===X?'x':''}"><td>${SHORT[a]}</td><td>${ci(q.intact||q.render_ok,pc)}</td><td>${ci(q.failure,pc)}</td><td>${ci(q.sparse_design,pc)}</td><td>${ci(q.task_fit_le1,pc)}</td><td>${ci(q.density,d2)}</td><td>${ci(q.craft,d2)}</td><td>${ci(q.F,d2)}</td><td>${ci(v.effective_styles,v=>v.toFixed(1))}</td><td>${v.distinct_styles}</td><td>${v.occupied_cells}</td><td>${v.mean_pairwise_distance.toFixed(3)}</td></tr>`; }).join('')}</table></div>
    <p class="n">${Z.prompts} prompts, ${Z.pages_per_arm} pages per arm; quality: 95% interval by prompt; intact = no true failure as a visitor sees the page (scrolled, after loading): true failures are blank, stuck loading, raw text, unstyled, broken images or layout, an unfinished sparse page or a missing page; a sparse first screen that is a finished design counts as intact and is shown apart ("sparse look"); task fit ≤ 1 = pages that miss the request (lower is better). Variety on the ${Z.variety.cells_matched} (prompt, generator) cells where every arm of the test rendered: effective styles = inverse Simpson of layout × background × imagery, 95% jackknife by prompt; map cells = cells of the pipeline page's 40 × 40 map grid the pages occupy; mean distance = between first screens in DINO space.<br>
    Panel, from the report: ${pairs.map(prow).join(' · ')}.</p>
    <h3>Most common styles per arm</h3>
    ${arms_.map(a=>{ const tops=Z.variety.arms[a].top||Z.variety.arms[a].top5; return `<div class="strip"><b class="${a===X?'x':''}">${SHORT[a]}<small>${tops.length} most common</small></b>
      <button class="ar-b sl" data-sl="-1" aria-label="Scroll ${SHORT[a]} styles left">‹</button>
      <div class="row" tabindex="0" role="group" aria-label="${SHORT[a]}: most common styles (arrow keys scroll)" data-lb-group>${tops.map((t,j)=>`<figure><img src="${BASE}${esc(t.thumb)}" alt="${esc(t.style)}" loading="lazy" draggable="false" data-lb data-lb-cap="${esc(SHORT[a])} · #${j+1} ${esc(t.style.replace(/_/g,' '))} · ${pc(t.share)} of its pages"${live(t.page,a)?` data-lb-href="${BASE}pages/${esc(t.page)}_${a}.html"`:''}><span>${j+1}. ${esc(t.style.replace(/_/g,' '))}</span><em>${pc(t.share)}</em></figure>`).join('')}</div>
      <button class="ar-b sl" data-sl="1" aria-label="Scroll ${SHORT[a]} styles right">›</button></div>`; }).join('')}
    <h3>Contact sheets: one tile per style, most common first</h3>
    <div data-lb-group>${arms_.map(a=>`<details><summary>${SHORT[a]} · ${Z.variety.arms[a].sheet_tiles} styles</summary><img src="${BASE}${esc(Z.variety.arms[a].sheet)}" alt="Contact sheet of ${SHORT[a]}" loading="lazy" data-lb data-lb-cap="Contact sheet · ${esc(SHORT[a])} · ${Z.variety.arms[a].sheet_tiles} styles, most common first"></details>`).join('')}</div>
    <details><summary>Effective styles per task category</summary><div class="tw"><table><tr><th>category</th><th>pages per arm</th>${arms_.map(a=>`<th>${SHORT[a]}</th>`).join('')}</tr>
      ${Object.entries(Z.variety.by_category).map(([c,v])=>`<tr><td>${esc(c)}</td><td>${v.pages}</td>${arms_.map(a=>`<td>${ci(v.count[a],z=>z.toFixed(1))}</td>`).join('')}</tr>`).join('')}</table></div></details>`; }

/* the style rows slide: arrow buttons, arrow keys on a focused row, wheel, drag (a drag does not open the viewer) */
const slide=(row,d)=>row.scrollBy({left:d*row.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
$('#analysis').addEventListener('click',e=>{ const b=e.target.closest('[data-sl]'); if(b) slide(b.parentNode.querySelector('.row'),+b.dataset.sl); });
$('#analysis').addEventListener('wheel',e=>{ const row=e.target.closest('.row'); if(!row||Math.abs(e.deltaX)>Math.abs(e.deltaY)) return;
  const max=row.scrollWidth-row.clientWidth; if((e.deltaY<0&&row.scrollLeft>0)||(e.deltaY>0&&row.scrollLeft<max-1)){ e.preventDefault(); row.scrollLeft+=e.deltaY; } },{passive:false});
let drag=null, dragged=false;
$('#analysis').addEventListener('pointerdown',e=>{ const row=e.target.closest('.row'); if(row&&e.button===0){ drag={row,x:e.clientX,l:row.scrollLeft}; dragged=false; } });
addEventListener('pointermove',e=>{ if(!drag) return; const dx=e.clientX-drag.x; if(Math.abs(dx)>5){ dragged=true; drag.row.classList.add('drag'); } if(dragged) drag.row.scrollLeft=drag.l-dx; });
addEventListener('pointerup',()=>{ if(drag) drag.row.classList.remove('drag'); drag=null; });
addEventListener('click',e=>{ if(dragged){ dragged=false; e.stopPropagation(); e.preventDefault(); } },true);   // window capture runs before the viewer's

/* panes | sidebar divider (shared columns.js, two-column mode): panes take the rest, the sidebar's width is kept in localStorage
   'arena.cols' (storage access inside columns.js's try/catch); the divider is #arSplit */
PK=window.Picker?Picker.attach($('#arJump')):null;   // the prompt list as the site's picker; the hidden select stays the source of truth
if(window.Columns) ARENA_COLS=Columns.attach($('#arMain'),{key:'arena.cols',mins:[480,240],storage:'local',narrow:1303});   // page.css: three columns from 1304 px
if(window.PgFrame) PgFrame.fit($('#arMain'));   // the panes and the sidebar fill the viewport below the top block (page.css .pg-work)
render(true);
if(location.hash==='#analysis') $('#analysis').scrollIntoView();
window.ARENA={D,get S(){ return S; },render,go,reset,toURL,get cols(){ return ARENA_COLS; }};   // for tests
})();
