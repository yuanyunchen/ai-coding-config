/* Correspondence: every node of the concept graph against the areas of the continuous (DINO) map.
   Data: data/<scale>/{points, graph_layered | graph, members_layered | members, regions, model_<slug>}.json, shapes in .agents/memory/contracts.md.
   A node "corresponds to" an area when the node is at least LIFT times as common inside it as elsewhere and at least MINP of its pages are there. */
(async()=>{
'use strict';
const LIFT=1.5, MINP=20, TOP=3;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct=v=>(v*100).toFixed(v<.1&&v>0?1:0)+'%', num=n=>n.toLocaleString('en-US');
const pp=v=>(v>0?'+':v<0?'−':'')+Math.abs(v*100).toFixed(1);
const sure=e=>e.pref!=null&&(e.pref_lo>0||e.pref_hi<0);
/* evidence tiers (same rule as the concept graph): 2 = clear, the 95% interval excludes zero; 1 = leaning, only the 80% one does (|effect| > 1.2816 se, se = interval width / 3.92); 0 = cannot tell. A `tier` field wins. */
const tier=e=>e.tier?({clear:2,suggestive:1,leaning:1}[e.tier]||0):e.pref==null||e.pref_lo==null?0:e.pref_lo>0||e.pref_hi<0?2:Math.abs(e.pref)>1.2816*(e.pref_hi-e.pref_lo)/3.92?1:0;
const cls=e=>tier(e)?(e.pref>0?'pos':'neg')+(tier(e)===1?' lean':''):'';
const eff=e=>e.pref==null?'<span class="ef">n/a</span>':`<span class="ef ${cls(e)}">${pp(e.pref)} pp</span>`;
const effCI=e=>e.pref==null?'no estimate':`<span class="ef ${cls(e)}">${pp(e.pref)} pp</span> [${pp(e.pref_lo)}, ${pp(e.pref_hi)}]`;
const view=document.getElementById('view'), Q=new URLSearchParams(location.search), scale=Q.get('data')||'pilot', base=`data/${scale}/`, dq=Q.get('data')?'&data='+encodeURIComponent(scale):'';
const ls=await fetch(base).then(r=>r.ok?r.text():'').catch(()=>''), listed=ls.includes('.json"');
const get=f=>listed&&!ls.includes(`"${f}.json"`)?Promise.resolve(null):fetch(base+f+'.json').then(r=>r.ok?r.json():null).catch(()=>null);
const mf=(ls.match(/"(model_[^"]+)\.json"/)||[])[1]||'model_gemini_37_flash';
const [PT,GL,ML,RG,MD,LF,CA]=await Promise.all(['points','graph_layered','members_layered','regions',mf,'leaves','cluster_audit'].map(get));
/* cluster audit (cluster_audit.json, when present): a cluster's example pages come from its `examples` (one page per duplicate group), and a
   bound cluster (`marks.bound`) is grey, its binding and both effects said once in its card; clusters missing from the file keep their own prototypes */
const AU=(CA&&CA.items)||{};
const G=GL||await get('graph'), MEM=(GL?ML:await get('members'))||{};
if(!PT||!G||!RG){ view.innerHTML=`<h1>No correspondence data yet</h1><p class="sub">${esc(base)} needs points.json, a graph file and regions.json.</p>`; return; }

const P=PT.pages, N=P.length, E=PT.encoders[RG.encoder], X=E.x, Y=E.y, PR=RG.page_region, REG=RG.regions, R=Object.fromEntries(REG.map(r=>[r.id,r]));
const inArea=PR.filter(r=>R[r]).length;
/* leaf clusters (leaves.json): small specific groups of look-alike pages with a one-sided preference; the page leads with them when the folder has them */
const bound=l=>((AU[l.id]||{}).marks||{}).bound||null, BOUND='#7c869e';   // a cluster bound to one photo, template, subject or generator (cluster audit): grey
const LV=LF?LF.leaves:[], LEAF=Object.fromEntries(LV.map(l=>[l.id,l])), PL=LF?LF.page_leaf:null, neg=l=>l.pref<0, lcol=l=>bound(l)?BOUND:tier(l)?`rgba(${neg(l)?NEG:POS},${tier(l)===2?1:.55})`:'#9aa7c9';   // full colour when clear, weaker when leaning, grey otherwise
/* colours. A page's dot: its own place in its tournament (page.css --place-1 strong green, --place-2 light green, --place-3 light red,
   --place-4 strong red, --place-none grey); the number is named wherever a single page is. A cluster or an area: green or red by its effect,
   only when the interval excludes zero (as on the concept graph). */
const POS=[56,217,112], NEG=[255,78,92];
const PLC=(()=>{ const cs=getComputedStyle(document.documentElement), v=(k,d)=>cs.getPropertyValue(k).trim()||d;
  return [v('--place-none','#6b7593'),v('--place-1','#2fbf6a'),v('--place-2','#a8e6bd'),v('--place-3','#f4b0b0'),v('--place-4','#e5484d')]; })();
const PLACE=Uint8Array.from(P,p=>p.placement>=1&&p.placement<=4?p.placement:0), PORD=[0,2,3,1,4];   // strong colours drawn last, on top
const ordn=n=>['1st','2nd','3rd','4th'][n-1]||'', placeTag=n=>n?`<b style="color:${PLC[n]}">${ordn(n)} of 4</b>`:'no placement';
const PLEG=a=>[1,2,3,4].map(k=>`<i style="background:${PLC[k]};opacity:${a}"></i>${ordn(k)}`).join(' ')+' in its tournament';
/* the overall map sits behind the text. Field and cluster patches are each drawn opaque on their own layer and laid on the map at one
   opacity, so overlapping points do not add up (per-point alpha did: 0.3 per point drew as 0.83). Field 0.55 and a quarter less
   saturated, cluster patches 0.75 (a step above), a chosen cluster 1 with everything else at 0.3. */
const FIELD={alpha:.8,patch:.6,dim:.35};
const LAY=[document.createElement('canvas'),document.createElement('canvas')];
const layer=(j,fn,a)=>{ const c=LAY[j]; if(c.width!==cv.width||c.height!==cv.height){ c.width=cv.width; c.height=cv.height; }
  const x=c.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,c.width,c.height); x.setTransform(cv.width/W,0,0,cv.height/H,0,0); fn(x); g.globalAlpha=a; g.drawImage(c,0,0,W,H); };
const tone=e=>tier(e)?`rgba(${e.pref>0?POS:NEG},${tier(e)===2?1:.55})`:'#9aa7c9';
/* nodes with their pages; per node the page count in every area, and the areas it corresponds to */
const GROUP=n=>n.type==='context'?'Task categories':n.type==='style'?'Whole looks':(n.layer||0)===0?'Elements':'Combinations', GORDER=['Elements','Combinations','Whole looks','Task categories'];
const held=l=>(l.conclusion??l.confirm_same_sign)!==false, subj=l=>!!l.subject, onem=l=>!!l.one_model;   // sign kept on held-out pages; pages answering near-identical prompts
const rankL=(a,b)=>Math.abs(b.pref)-Math.abs(a.pref);   // the strongest effect first; task-specific clusters are ranked with the rest
const subjTip=l=>`${l.subject_share!=null?Math.round(l.subject_share*100)+'% of this cluster’s tournaments mention ‘'+l.subject_token+'’; ':''}the result holds for that kind of task`;
// a cluster's points on the map: its pilot pages, or the positions the file gives (`xy`, up to 300 members) when those are more: full-scale clusters often have only a handful of pilot pages
const lpts=l=>l._p||(l._p=(pg=>(l.xy||[]).length>pg.length?l.xy:pg.map(i=>[X[i],Y[i]]))((l.pages||[]).filter(i=>X[i]!=null)));
const NODES=G.nodes.filter(n=>(MEM[n.id]||[]).length&&!LEAF[n.id]).map(n=>{   // leaves have their own list and card, not a row among the nodes
  const mem=MEM[n.id], cnt={}; for(const i of mem) if(R[PR[i]]) cnt[PR[i]]=(cnt[PR[i]]||0)+1;
  const file=Object.fromEntries(((RG.concept_regions||{})[n.id]||[]).map(x=>[x.region,x.lift]));
  // lift: the file's value; for nodes the file does not list, the same ratio (share inside the area / share outside) from page counts
  const areas=Object.entries(cnt).map(([k,a])=>{ const r=R[k], out=(mem.length-a)/(N-r.n); return {r,a,share:a/mem.length,lift:file[r.id]??(out?a/r.n/out:Infinity)}; }).sort((x,y)=>y.lift-x.lift);
  const hit=areas.filter(x=>x.lift>=LIFT&&x.a>=MINP), top=hit.slice(0,TOP);
  return {...n,mem,areas,hit,top,conc:top.reduce((s,x)=>s+x.share,0),group:GROUP(n),counted:!Object.keys(file).length}; });
const byId=Object.fromEntries(NODES.map(n=>[n.id,n]));
const MC=Object.fromEntries((MD&&MD.by_concept||[]).map(c=>[c.id,c]));
const S={node:null,area:null,leaf:null,dot:-1,hover:null,model:!!MD&&Q.has('model'),sort:null};
const concLine=n=>n.top.length?`${pct(n.conc)} in ${n.top.length} area${n.top.length>1?'s':''}`:'spread out';

const share=inArea/N, co=RG.cohesion;
view.innerHTML=`<header class="pg-head"><h1 class="pg-title">Correspondence: where each concept and cluster sits on the <em>continuous map</em>.</h1>
  <div class="pg-note">${LV.length?`${num(LV.length)} clusters from ${num(LF.pages||N)} pages; ${CA&&CA.summary&&CA.summary.clusters?`${num(CA.summary.clusters.held_with_tier_dedup)} held their sign on held-out pages, duplicates collapsed`:`${num(LV.filter(l=>tier(l)&&held(l)).length)} held their sign on held-out pages`}. `:''}Concept to area: ${LIFT}× as common inside, ${MINP}+ pages.
    <details class="pg-more"><summary>Details</summary><div><p><b>${pct(share)}</b> of the ${num(N)} pilot pages sit in one of <b>${REG.length}</b> named areas${RG.method?` (areas found by ${esc(RG.method)} on the DINO first-screen map, without using any label)`:''}; the other ${num(N-inArea)} pages lie between areas and belong to none.${co&&co.cohesion!=null?` Area cohesion is <b>${co.cohesion.toFixed(2)}</b> against <b>${co.chance.toFixed(2)}</b> expected by chance (values as reported in regions.json).`:''}
${LV.length?` The <b>${LV.length}</b> clusters were found on ${LF.pages?num(LF.pages)+' pages of the full data':'the pilot pages'} and placed on this pilot map; <b>${LV.filter(l=>tier(l)&&held(l)).length}</b> kept their sign on held-out pages and are shown first${LF.method==='regions-interim'?' (interim clusters from the map regions)':''}.`:''}
    A node is matched to an area when it is at least ${LIFT}× as common inside as elsewhere and at least ${MINP} of its pages are there.</p></div></details></div></header>
  ${[['regions',RG],['model profile',MD],['clusters',LF]].filter(x=>x[1]&&x[1].standin).map(x=>`<p class="standin"><b>Stand-in data</b> for the ${x[0]}: not real results.</p>`).join('')}
  <div class="bar"><button class="b" id="reset" title="Back to the state of a first load (Escape steps back one level at a time)">Reset view</button>${MD?`<span>Model</span><button class="b" data-mod="0">All models</button><button class="b" data-mod="1">${esc(MD.model)}</button>`:''}
</div>
  <div class="main"><div class="card col" id="nodes"></div><div></div>
    <div class="card mapc"><div class="cap" id="cap"></div><div class="mw"><canvas id="map"></canvas><span class="mv" id="mv" hidden></span><span class="hring" id="hring" hidden></span></div><div class="under" id="under"></div></div><div></div>
    <div class="card col side" id="side"><div id="sidec"></div></div></div>
  <h2 class="t">Where each concept lives</h2><p class="d">One small map per node, its own pages lit by their place in their tournaments (1st strong green to 4th strong red). Ordered by concentration: the share of a node's pages inside the (at most ${TOP}) areas it is matched to. Tight single patches come first, nodes spread over the whole map last. Click one to select it above.</p>
  <div class="multi" id="multi"></div>
  <h2 class="t">Nodes × areas</h2><p class="d">Cell = lift (how many times as common the node is inside the area as elsewhere), filled only at ${LIFT}× or more with at least ${MINP} pages. Column heads are area ids, green or red when the area’s effect is clear; point at one for its name and effect. Click a column head to sort the nodes by that area, “Node” for the graph's order, “Conc.” for concentration. Pointing at a cell shows it on the map above; clicking selects the node.</p>
  <div class="card mx" id="mx"></div>`;
const $=id=>document.getElementById(id);

/* ── map ── */
const cv=$('map'), g=cv.getContext('2d'), css=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim();
let W=1,H=1,k=1,ox=0,oy=0; const B={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9};
for(let i=0;i<N;i++){ if(X[i]==null) continue; B.x0=Math.min(B.x0,X[i]); B.x1=Math.max(B.x1,X[i]); B.y0=Math.min(B.y0,Y[i]); B.y1=Math.max(B.y1,Y[i]); }
/* view: the whole map, or closed in on the selected leaf (never more than 5x, so its surroundings stay visible); changes glide */
const frame=(x0,x1,y0,y1,K)=>({k:K,ox:W/2-(x0+x1)/2*K,oy:H/2-(y0+y1)/2*K}), home=()=>frame(B.x0,B.x1,B.y0,B.y1,Math.min((W-32)/(B.x1-B.x0),(H-32)/(B.y1-B.y0)));
function target(){ const l=LEAF[S.leaf]; if(!l) return home();
  const xs=lpts(l).map(p=>p[0]), ys=lpts(l).map(p=>p[1]); if(!xs.length) return home();
  const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  const K=Math.min(home().k*5,W*.3/(x1-x0||1),H*.3/(y1-y0||1)); return K>home().k?frame(x0,x1,y0,y1,K):home(); }   // a cluster spread over the map keeps the whole-map view
let T=null;
function glide(){ if(!T) return; k+=(T.k-k)*.2; ox+=(T.ox-ox)*.2; oy+=(T.oy-oy)*.2; if(Math.abs(T.k-k)<T.k*.003&&Math.abs(T.ox-ox)<.5&&Math.abs(T.oy-oy)<.5){ k=T.k; ox=T.ox; oy=T.oy; T=null; } draw(); if(T) requestAnimationFrame(glide); }
// the frame is the pilot pages' extent, here and in the small maps; a model page outside it is clamped to a 2% margin
const clampX=v=>Math.max(B.x0-(B.x1-B.x0)*.02,Math.min(B.x1+(B.x1-B.x0)*.02,v)), clampY=v=>Math.max(B.y0-(B.y1-B.y0)*.02,Math.min(B.y1+(B.y1-B.y0)*.02,v));
/* the user's pan and zoom (panzoom.js) on top of the page's own frame: screen = c + (frame - c) * z + (x, y); points grow with sqrt(z) */
let pz=null;
const vw=()=>{ const v=pz?pz.get():{z:1,x:0,y:0}, cx=W/2, cy=H/2; return {K:k*v.z,OX:cx+(ox-cx)*v.z+v.x,OY:cy+(oy-cy)*v.z+v.y,q:Math.sqrt(v.z)}; };
// marks grow with the drawing area: 1 up to about a 760 x 760 px map, at most 1.8 (an ultrawide map of 3,400 x 1,100 px)
const dsz=()=>Math.max(1,Math.min(1.8,Math.sqrt(W*H)/760));
function size(){ const r=cv.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2); if(r.width<2||r.height<2) return;   // not laid out yet: the ResizeObserver calls again
  W=r.width; H=r.height; cv.width=W*d; cv.height=H*d; g.setTransform(d,0,0,d,0,0);
  T=null; ({k,ox,oy}=target()); draw(); }
const dots=(c,idx,s,K,OX,OY)=>{ for(const i of idx) if(X[i]!=null) c.fillRect(X[i]*K+OX-s/2,Y[i]*K+OY-s/2,s,s); };
const dotsPlace=(c,idx,s,K,OX,OY)=>{ const by=[[],[],[],[],[]]; for(const i of idx) by[PLACE[i]].push(i); for(const b of PORD){ c.fillStyle=PLC[b]; dots(c,by[b],s,K,OX,OY); } };   // pages in green / red
const ALL=Array.from({length:N},(_,i)=>i);
const regPages=memo(id=>ALL.filter(i=>PR[i]===id));
function memo(f){ const m={}; return x=>m[x]||(m[x]=f(x)); }
// model pages that carry a node: from per-page labels when the model file has them, else the model's pages inside the node's matched areas
const modelOf=n=>{ const lab=MD.pages.some(p=>p.concepts); return {lab,pages:MD.pages.filter(p=>p.x!=null&&(lab?(p.concepts||[]).includes(n.id):n.top.some(x=>x.r.id===p.region)))}; };
/* the model's share of every cluster: by_leaf of the model file (the clusters' exact members at full scale, the model's pages against the
   other models' in its months; an own vote effect only from 20 of its pages). Which of the model's drawn pages belong to a cluster is
   known only when its pages carry `leaf`; the map then marks them. */
let PI=null; const pidx=id=>(PI||(PI=Object.fromEntries(P.map((p,i)=>[p.id,i]))))[id];   // pilot index of a page id, for its dot
const LIX=Object.fromEntries(LV.map((l,j)=>[l.id,j]));
const BL=Object.fromEntries((MD&&MD.by_leaf||[]).filter(b=>LEAF[b.id]&&LEAF[b.id].name===b.name).map(b=>[b.id,b]));
const BR=Object.fromEntries((MD&&MD.by_region||[]).map(b=>[b.region,b]));
const MIN_OWN=20;
let MLF=null, PK=null;
function mleaf(){ if(MLF||!MD||!LV.length) return MLF;
  const one=Object.values(BL).find(b=>b.n>0&&b.model_share>0), T=one?Math.round(one.n/one.model_share):0;   // the model's page total behind the shares
  return MLF={T,mp:MD.pages.filter(p=>p.x!=null),by:LV.map(l=>{ const b=BL[l.id]; if(!b) return null; const exp=b.overall_share*T;
    return {n:b.n,ms:b.model_share,os:b.overall_share,exp,diff:b.n-exp,ratio:b.ratio,clear:Math.abs(b.share_z)>=2,b}; })}; }   // beyond chance: |z| of the share difference >= 2
const mby=l=>S.model&&mleaf()?MLF.by[LIX[l.id]]:null;
const p2=v=>(v*100).toFixed(v>=.1?1:2)+'%', mx=v=>v==null?'–':v===Infinity?'∞':v.toFixed(v<10?1:0)+'×';
const mword=s=>s.clear?(s.diff>0?'more than expected':'fewer than expected'):'within chance of the expected share';
const mchip=l=>{ const s=mby(l); if(!s) return '';
  return `<i class="mdl${s.clear?'':' weak'}" data-diff="${s.diff.toFixed(3)}">${s.diff>0?'▲':s.diff<0?'▼':''}${s.n?mx(s.ratio):'0'}</i>`; };
const mLeafLine=l=>{ if(!S.model||!mleaf()) return ''; const s=mby(l);
  if(!s) return `<small class="mline"><b>${esc(MD.model)}</b>: this cluster is not in the model file</small>`;
  return `<small class="mline"><b>${esc(MD.model)}</b>: ${s.n?`${num(s.n)} of its ${num(MLF.T)} pages are in this cluster (${p2(s.ms)}) against ${p2(s.os)} of the other models’ pages: ${mx(s.ratio)}, ${mword(s)} (${s.exp.toFixed(1)} expected)`
    :`no pages of this model in this cluster (${s.exp.toFixed(1)} expected from the other models’ share)`}
    · ${s.b.model_pref!=null?`its own vote effect here: ${pp(s.b.model_pref)} pp [${pp(s.b.model_lo)}, ${pp(s.b.model_hi)}]`:`too few pages of this model (${s.n}) for its own effect`}</small>`; };
const mAreaLine=a=>{ const b=BR[a.id], n=MD.pages.filter(p=>p.region===a.id&&p.x!=null).length;
  return `<small class="mline"><b>${esc(MD.model)}</b>: ${n?`${num(n)} of its pages drawn here`:'no pages of this model here'}${b?` · on ${p2(b.model_share)} of its pages against ${p2(b.overall_share)} for the other models (${mx(b.ratio)})${b.model_pref!=null?`, own effect ${pp(b.model_pref)} pp [${pp(b.model_lo)}, ${pp(b.model_hi)}]`:''}`:' · the model file has no share for this area'}</small>`; };
/* a full drawing is copied to `snap`; during a pan / zoom gesture only that copy is moved and scaled (one drawImage per frame), the full
   drawing (point sizes, labels) comes back when the gesture settles */
let snap=null, snapV=null;
function draw(){ paint(); if(!pz||!cv.width||!cv.height) return; if(!snap) snap=document.createElement('canvas');
  if(snap.width!==cv.width||snap.height!==cv.height){ snap.width=cv.width; snap.height=cv.height; }
  const s=snap.getContext('2d'); s.clearRect(0,0,snap.width,snap.height); s.drawImage(cv,0,0); snapV=pz.get(); }
function blit(){ if(!snap||!snap.width||!snapV){ draw(); return; } const v=pz.get(), r=v.z/snapV.z, cx=W/2, cy=H/2; g.clearRect(0,0,W,H); g.drawImage(snap,cx-r*(cx+snapV.x)+v.x,cy-r*(cy+snapV.y)+v.y,W*r,H*r); }
function paint(){
  const f=S.hover||S, n=byId[f.node], a=R[f.area], ember=css('--ember'), lf=!S.hover&&LEAF[S.leaf], {K,OX,OY,q:q0}=vw(), D=dsz(), q=q0*D, z=Math.sqrt(K/home().k)*D;
  g.clearRect(0,0,W,H);
  if(LV.length&&!n&&!a){   // leaves lead: every page in green / red (faint), each leaf's pages bright in the leaf's colour; with one chosen, the others recede
    layer(0,x=>dotsPlace(x,ALL,2.2*z,K,OX,OY),lf?FIELD.dim:FIELD.alpha);
    const patch=(x,l,sz)=>{ x.fillStyle=lcol(l); for(const q of lpts(l)) x.fillRect(q[0]*K+OX-sz/2,q[1]*K+OY-sz/2,sz,sz); };
    // clear and leaning clusters are emphasised (leaning weaker, by its colour); an unclear one only when it is the chosen one
    layer(1,x=>{ for(const l of LV) if(LSET.has(l.id)&&l!==lf) patch(x,l,3.4*z); },lf?FIELD.dim:FIELD.patch);
    if(lf){ g.globalAlpha=1; patch(g,lf,3.2*z); }
    if(S.model&&mleaf()){   // the model's pages over everything; with a cluster chosen they recede, and its own pages there (when the file says which) are large and outlined
      const s=2.4*z, at=p=>[clampX(p.x)*K+OX,clampY(p.y)*K+OY], mine=p=>lf&&p.leaf===lf.id; g.fillStyle=css('--ember');
      g.globalAlpha=lf?.35:.75; for(const p of MLF.mp) if(!mine(p)){ const [x,y]=at(p); g.fillRect(x-s/2,y-s/2,s,s); }
      if(lf){ g.globalAlpha=1; g.strokeStyle=css('--void'); g.lineWidth=1.5; for(const p of MLF.mp) if(mine(p)){ const [x,y]=at(p); g.fillRect(x-4,y-4,8,8); g.strokeRect(x-4,y-4,8,8); } } }
    if(S.dot>=0&&X[S.dot]!=null){ g.globalAlpha=1; g.strokeStyle=css('--starlight'); g.lineWidth=2; g.strokeRect(X[S.dot]*K+OX-7,Y[S.dot]*K+OY-7,14,14); }
    g.globalAlpha=1; return; }
  g.globalAlpha=.55; g.fillStyle=css('--faint'); dots(g,ALL,2.2*q,K,OX,OY);
  const shade=n?(S.hover&&a?[a]:n.top.map(x=>x.r)):a?[a]:[];
  for(const r of shade){ if(!r.scattered&&r.outline.length>2){ g.beginPath(); r.outline.forEach((p,i)=>g[i?'lineTo':'moveTo'](p[0]*K+OX,p[1]*K+OY)); g.closePath(); g.globalAlpha=.2; g.fillStyle=tone(r); g.fill(); if(tier(r)===1){ g.globalAlpha=.8; g.setLineDash([4,4]); g.strokeStyle=tone(r); g.lineWidth=1.2; g.stroke(); g.setLineDash([]); } } }
  g.globalAlpha=S.model&&n?.45:.95;
  if(n) dotsPlace(g,n.mem,3*q,K,OX,OY); else if(a) dotsPlace(g,regPages(a.id),3*q,K,OX,OY);
  if(S.model){ g.globalAlpha=1; g.fillStyle=ember; const ps=n?modelOf(n).pages:a?MD.pages.filter(p=>p.region===a.id&&p.x!=null):[]; for(const p of ps) g.fillRect(clampX(p.x)*K+OX-2*q,clampY(p.y)*K+OY-2*q,4*q,4*q); }
  const FS=Math.round(13*Math.min(1.35,D)), U=FS/13; g.globalAlpha=1; g.font=`600 ${FS}px "Space Grotesk",-apple-system,sans-serif`; g.textAlign='center';
  const put=[];   // labels of neighbouring areas are moved down until they clear each other
  for(const r of shade){ const t=`${r.label}  ${r.id}  ${pp(r.pref)} pp`, w=g.measureText(t).width/2+6, x=Math.max(w+4,Math.min(W-w-4,r.centroid[0]*K+OX)); let y=r.centroid[1]*K+OY;
    while(put.some(b=>Math.abs(b[0]-x)<b[2]+w&&Math.abs(b[1]-y)<23*U)) y+=23*U; put.push([x,y,w]);
    g.globalAlpha=.84; g.fillStyle=css('--void'); g.beginPath(); g.roundRect(x-w,y-14*U,w*2,20*U,4); g.fill(); g.globalAlpha=1; g.fillStyle=tier(r)?tone(r):css('--starlight'); g.fillText(t,x,y); }
}
/* hit test on a spatial grid of the pilot pages (data units), so a pointer move looks at a few cells, not every page */
const HG=(()=>{ const cs=(B.x1-B.x0)/120||1, m=new Map(); for(let i=0;i<N;i++){ if(X[i]==null) continue; const c=Math.floor(X[i]/cs)+','+Math.floor(Y[i]/cs); if(!m.has(c)) m.set(c,[]); m.get(c).push(i); } return {cs,m}; })();
const pageAt=e=>{ const b=cv.getBoundingClientRect(), mx=e.clientX-b.left, my=e.clientY-b.top, {K,OX,OY}=vw(), dx0=(mx-OX)/K, dy0=(my-OY)/K, rad=12/K;   // 12 px on screen
  const c0=Math.floor((dx0-rad)/HG.cs), c1=Math.floor((dx0+rad)/HG.cs), r0=Math.floor((dy0-rad)/HG.cs), r1=Math.floor((dy0+rad)/HG.cs); let best=-1, bd=144;
  for(let a=c0;a<=c1;a++) for(let q=r0;q<=r1;q++) for(const i of HG.m.get(a+','+q)||[]){ const dx=X[i]*K+OX-mx, dy=Y[i]*K+OY-my, d=dx*dx+dy*dy; if(d<bd){ bd=d; best=i; } }
  return best; };
const leafAt=i=>i>=0&&PL&&PL[i]>=0?LV[PL[i]]:null;
cv.onclick=e=>{ const i=pageAt(e), l=leafAt(i);   // the chosen item again, or empty map, clears the selection
  if(l) pick(l.id===S.leaf?{}:{leaf:l.id}); else if(i>=0&&R[PR[i]]) pick(PR[i]===S.area&&!S.node?{}:{area:PR[i]}); else pick({}); };
/* hover: the shared card (hovercard.js) with the page's first screen, its model, placement and score, and the cluster and area it is in */
/* hover: at desktop width the page under the pointer is shown in the "Under the pointer" slot at the top of the right column (the
   selected cluster's card stays below it) and a small ring marks it on the map; when the columns stack, the shared floating card instead */
const HC=HoverCard.attach(cv,{width:260}), stacked=()=>matchMedia('(max-width:1303px)').matches;   // two columns or one (page.css breakpoints): the card is below the map
const HS=HoverSlot.attach($('side'),{id:'hslot',key:i=>i,render:i=>{ const p=P[i], img=p.thumb?`${base}thumbs/${p.id}.webp`:'';
  return `${img?`<img src="${esc(img)}" alt="">`:''}<p><b>${placeTag(PLACE[i])}</b> in its tournament · ${esc(p.model)} · ${esc(p.month||'')}</p><p>${where(i)}</p>`; }});
const where=i=>{ const l=leafAt(i), r=R[PR[i]]; return `${l?`Cluster <b style="color:${lcol(l)}">${esc(l.name)}</b> ${pp(l.pref)} pp`:'In no cluster'} · ${r?`area ${esc(r.id)} “${esc(r.label)}”`:'between areas'}`; };
function unhover(){ HC.hide(); HS.clear(); $('hring').hidden=true; }
cv.addEventListener('pointermove',e=>{ if(pz&&pz.busy()||e.buttons){ unhover(); return; } const i=pageAt(e); if(i<0){ unhover(); return; }
  const p=P[i];
  if(stacked()){ HC.show(e,{img:p.thumb?`${base}thumbs/${p.id}.webp`:'',title:esc(p.model),lines:[`${placeTag(PLACE[i])} in its tournament · ${esc(p.month||'')}`],extra:where(i)}); return; }
  HS.show(i);
  const {K,OX,OY}=vw(), ring=$('hring'); ring.style.left=(cv.offsetLeft+X[i]*K+OX)+'px'; ring.style.top=(cv.offsetTop+Y[i]*K+OY)+'px'; ring.hidden=false; });
cv.addEventListener('pointerleave',unhover);

/* ── panels ── */
// page thumbnails open in the shared viewer (lightbox.js): one group per panel block, the 480 px image when enlarged
// four shown (2 x 2, one alone at full width; from 2,400 px six, 3 x 2: the page's CSS decides), the rest only in the viewer's group;
// "+N more" opens the viewer at the first image not shown
const wide=()=>matchMedia('(min-width:2400px)').matches;
const grid=ims=>`<div class="six${ims.length===1?' one':''}${ims.length<=6?' le6':''}" data-lb-group>${ims.join('')}${ims.length>4?`<button class="more" type="button" data-more><span class="m4">+${num(ims.length-4)} more</span><span class="m6">+${num(Math.max(0,ims.length-6))} more</span></button>`:''}</div>`;
const thumbs=(idx,cap)=>{ const s=idx.filter(i=>P[i].thumb);
  return grid(s.map((i,j)=>`<img loading="lazy" src="${base}thumbs/${esc(P[i].id)}.webp" data-lb data-lb-cap="${esc(cap)} · page ${j+1} of ${s.length}" alt="">`)); };
const TIERS=`<span class="tiers"><b>solid</b> = 95% interval excludes zero · <b>lighter, dashed</b> = only the 80% one does (leaning; about one in five by chance) · <b>grey</b> = cannot tell</span>`;
const legend=()=>{ const n=byId[S.node];
  if(LV.length&&!n&&S.area==null){ $('under').innerHTML=`every pilot page by its place: ${PLEG(S.leaf?FIELD.dim:FIELD.alpha)}
    <i style="background:rgb(${POS});opacity:${S.leaf?1:FIELD.patch}"></i>pages of a cluster that wins more votes<i style="background:rgb(${NEG});opacity:${S.leaf?1:FIELD.patch}"></i>of one that wins fewer<i style="background:${BOUND}"></i>bound to one photo, template, subject or generator${
    S.model?`<i style="background:var(--ember)"></i>${esc(MD.model)}’s pages${S.leaf?(MD.pages.some(p=>p.leaf)?' (its pages in this cluster: large, outlined)':' (the model file does not say which of them belong to this cluster; its share is in the caption)'):''}; ▲ / ▼ in the list = its share of a cluster against the other models’, faint = within chance`:''}${TIERS}`; return; }
  $('under').innerHTML=`<i style="background:var(--faint)"></i>every pilot page`+(n||S.area!=null?`${n?' · pages with this node'+(S.model?', all models':''):' · pages of this area'}, by their place: ${PLEG(1)}
  <i style="background:rgb(${POS});opacity:.45"></i><i style="background:rgb(${NEG});opacity:.45;margin-left:2px"></i><i style="background:#9aa7c9;opacity:.45;margin-left:2px"></i>${n?'its matched areas':'the area'}${TIERS}`:'')+
  (S.model&&(n||S.area!=null)?`<i style="background:var(--ember)"></i>${esc(MD.model)}: ${n?(modelOf(n).lab?'its pages with this node':'its pages inside those areas (the model file has no per-page labels)'):'its pages in this area'}`:''); };
function panel(){
  const n=byId[S.node], a=R[S.area], cap=$('cap'), side=$('sidec'), l=LEAF[S.leaf];
  if(l){ const ci=(v,lo,hi)=>v==null?'n/a':`<span class="ef ${lo==null||lo>0||hi<0?(v>0?'pos':'neg'):''}">${pp(v)} pp</span>${lo!=null?` [${pp(lo)}, ${pp(hi)}]`:''}`, par=R[l.parent_region];
    // thumbnails by page id (`prototype_ids`: pages outside the pilot have no index); only a pilot page has a dot to mark
    const pix=l.prototypes||l.pages||[], au=AU[l.id]&&(AU[l.id].examples||[]).length?AU[l.id].examples:null, pid=au||l.prototype_ids||pix.map(i=>P[i]&&P[i].id);
    const shown=pid.filter(Boolean).length;
    const img=(id,j)=>id?`<img ${pidx(id)!=null?`data-dot="${pidx(id)}"`:''} loading="lazy" src="${base}thumbs/${esc(id)}.webp" onerror="this.onerror=null;this.src='${base}thumbs_s/${esc(id)}.webp'" data-lb data-lb-cap="${esc(l.name)} · example page ${j+1} of ${shown}" alt="">`:'';
    const notes=[!held(l)&&'<b style="color:var(--ember)">Did not hold on held-out pages</b>: the sign flipped there.',subj(l)&&`<b>Use when the brief is about: ${esc(l.subject_token||'')}</b> · task-specific: ${esc(subjTip(l))}.`,
      onem(l)&&`<b>One model’s habit · ${esc(l.top_model||'')}</b>${l.top_model_share!=null?`: ${Math.round(l.top_model_share*100)}% of this cluster’s pages come from that model.`:''}`,
      l.n_prompts!=null&&`${num(l.n_prompts)} different prompts${l.top_prompt_share!=null?`, the most common one on ${pct(l.top_prompt_share)} of its pages`:''}.`,l.usable_as_direction!=null&&(l.usable_as_direction?'Usable as a design direction.':'Not usable as a design direction.')].filter(Boolean);   // 480 px thumbnail, the 96 px one where it is missing
    cap.innerHTML=`<b style="color:${lcol(l)}">${esc(l.name)}</b>: its ${num(l.n)} pages${l.n_votes!=null?` (${num(l.n_votes)} votes)`:''} ${tier(l)===2?`win ${neg(l)?'fewer':'more'} votes than their models’ strength predicts`:tier(l)?`lean towards winning ${neg(l)?'fewer':'more'} votes (only the 80% interval excludes zero)`:'show no clear lean (the interval includes zero)'}: ${ci(l.pref,l.pref_lo,l.pref_hi)} per vote.<small>${l.confirm_n!=null&&l.confirm_pref!=null?`On ${num(l.confirm_n)} held-out confirm pages: ${pp(l.confirm_pref)} pp, ${l.confirm_same_sign?'✓ same sign':'✗ the sign does not hold'} · `:''}${par?`inside area “${esc(par.label)}” (${esc(par.id)})`:'outside the named areas'}</small>${mLeafLine(l)}`;
    side.innerHTML=`<h2 style="color:${lcol(l)}">${esc(l.name)}</h2>${dd(l)&&dd(l).pref!=null?`<p class="aud">${bound(l)?`<b>Bound to ${esc(bound(l))}</b>: `:''}effect ${ci(l.pref,l.pref_lo,l.pref_hi)} as found; with duplicate pages collapsed (${num((AU[l.id].numbers||{}).n_groups||0)} groups of ${num((AU[l.id].numbers||{}).n||0)} pages) ${ci(dd(l).pref,dd(l).lo,dd(l).hi)}, ${esc(dd(l).tier||'no tier')}.</p>`:''}<p>${esc(l.what||'')}</p>${grid(pid.map(img).filter(Boolean))}${au?'<p>Examples: one page per duplicate group (cluster audit).</p>':''}${notes.map(t=>`<p>${t}</p>`).join('')}${(l.xy||[]).length>(l.pages||[]).length?`<p>${(l.pages||[]).length} of its pages are in the pilot sample; the map shows the positions the file gives for ${l.xy.length} of its pages.</p>`:''}
      ${l.differs?`<div class="sec">What sets it apart from its look-alikes</div><p style="color:var(--starlight)">${esc(l.differs)}</p>`:''}
      ${l.spec?`<div class="sec">Specification</div><table class="spec">${Object.entries(l.spec).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`:''}
      ${l.instruction?`<div class="sec">Instruction for a generator</div><p style="color:var(--starlight)">${esc(l.instruction)}</p>`:''}
      <div class="sec">Effect on votes won</div><table class="spec"><tr><td>found on ${num(l.n)} pages${l.n_votes!=null?`, ${num(l.n_votes)} votes`:''}${l.q!=null?` · q ${(+l.q).toPrecision(2)}`:''}${l.source?` · ${esc(l.source)}`:''}${l.k!=null?` · k ${esc(l.k)}`:''}</td><td>${ci(l.pref,l.pref_lo,l.pref_hi)}</td></tr>${l.confirm_n!=null&&l.confirm_pref!=null?`<tr><td>${num(l.confirm_n)} confirm pages</td><td>${ci(l.confirm_pref)} ${l.confirm_same_sign?'✓':'✗'}</td></tr>`:''}
        ${l.share_pos!=null?`<tr><td>pages that won more / fewer than expected</td><td>${pct(l.share_pos)} / ${pct(l.share_neg)}</td></tr>`:''}</table>
      <div class="sec">Nodes it is made of</div>${(l.concepts||[]).map(c=>`<button class="nd" ${byId[c.id]?`data-node="${esc(c.id)}"`:'disabled'}><span>${esc(c.name)}</span><span class="ef">${c.lift!=null?c.lift.toFixed(1)+'×':''}${c.share_in!=null?` · on ${pct(c.share_in)} of its pages`:''}</span></button>`).join('')||'<p>No node is over-represented in it.</p>'}
      ${(l.tasks||[]).length?`<div class="sec">Tasks over-represented</div><p>${l.tasks.map(t=>`${esc(String(t.id).replace(/^ctx_/,''))}${t.lift!=null?' '+t.lift.toFixed(1)+'×':''}`).join(' · ')}</p>`:''}
      ${tier(l)?`<p><a href="index.html?view=graph&concept=${encodeURIComponent(l.id)}${dq}">Open it in the concept graph →</a></p>`:'<p>Not drawn in the concept graph: its effect is not separable from zero.</p>'}`; }
  else if(n){ const m=S.model&&MC[n.id];
    cap.innerHTML=(n.top.length?`<b>${pct(n.conc)}</b> of the pages with “${esc(n.name)}” sit in <b>${n.top.length} area${n.top.length>1?'s':''}</b> (lift ${n.top.map(x=>x.lift.toFixed(1)).join(', ').replace(/, ([^,]*)$/,' and $1')}).`
      :`“${esc(n.name)}” has no area of its own: none holds it at ${LIFT}× or more with ${MINP}+ pages. Its ${num(n.mem.length)} pages are spread over the map.`)+
      `<small>${num(n.mem.length)} pages have it · ${n.hit.length} matched area${n.hit.length===1?'':'s'} in all${n.counted?' · lift computed here from page counts (regions.json does not list this node)':''}${m?` · ${esc(MD.model)}: on ${pct(m.model_share)} of its pages against ${pct(m.overall_share)} overall${m.model_pref!=null?', own effect '+pp(m.model_pref)+' pp ['+pp(m.model_lo)+', '+pp(m.model_hi)+']':''}`:''}</small>${
      S.model&&!m?`<small class="mline"><b>${esc(MD.model)}</b>: the model file has no share or effect for this node${modelOf(n).pages.length?'':'; no pages of this model here'}</small>`:S.model&&!modelOf(n).pages.length?`<small class="mline"><b>${esc(MD.model)}</b>: no pages of this model in its areas</small>`:''}`;
    side.innerHTML=`<h2>${esc(n.name)}</h2><p>${esc(n.group)} · effect on votes won ${effCI(n)}</p><p>${esc(n.definition||'')}</p>
      <a href="index.html?view=graph&concept=${encodeURIComponent(n.id)}${dq}">Open it in the concept graph →</a>
      <div class="sec">Areas it corresponds to</div>`+(n.hit.map(x=>`<div class="ar" style="border-left:3px solid ${tone(x.r)};padding-left:9px"><h4 data-area="${esc(x.r.id)}">${esc(x.r.label)} <small>area ${esc(x.r.id)}</small></h4>
        <div class="m">lift ${x.lift.toFixed(1)}× · ${num(x.a)} of its pages (${pct(x.share)}) · area: ${num(x.r.n)} pages, ${effCI(x.r)}</div>${thumbs(n.mem.filter(i=>PR[i]===x.r.id),`“${n.name}” in area ${x.r.id} “${x.r.label}”`)}</div>`).join('')||'<p>None at the threshold.</p>'); }
  else if(a){ const here=NODES.map(n=>({n,x:n.hit.find(x=>x.r.id===a.id)})).filter(o=>o.x).sort((p,q)=>q.x.lift-p.x.lift);
    const looks=here.filter(o=>o.n.type==='style'&&o.n.hit.length>1);
    cap.innerHTML=`Area <b>${esc(a.label)}</b> holds ${num(a.n)} pages (${pct(a.share)} of the map); <b>${here.length}</b> node${here.length===1?' is':'s are'} matched to it.<small>Effect on votes won for pages here: ${effCI(a)}${a.scattered?' · scattered, so it is not shaded':''}</small>${S.model?mAreaLine(a):''}`;
    side.innerHTML=`<h2>${esc(a.label)} <small>area ${esc(a.id)}</small></h2><p>${num(a.n)} pages · effect ${effCI(a)}</p>
      <a href="index.html?view=graph&region=${encodeURIComponent(a.id)}${dq}">Ring its top concepts in the concept graph →</a>${thumbs(a.pages,`Area ${a.id} “${a.label}”`)}
      <div class="sec">Nodes enriched here</div>${here.map(o=>`<button class="nd" data-node="${esc(o.n.id)}"><span>${esc(o.n.name)}</span><span class="ef">${o.x.lift.toFixed(1)}× · ${pct(o.x.a/a.n)} of the area</span></button>`).join('')||'<p>No node reaches the threshold here.</p>'}
      <div class="sec">The same look in several areas</div>`+(looks.map(o=>{ const xs=[...o.n.hit].sort((p,q)=>q.r.pref-p.r.pref), win=xs.some(x=>sure(x.r)&&x.r.pref>0), lose=xs.some(x=>sure(x.r)&&x.r.pref<0);
        return `<div class="split"><b>${esc(o.n.name)}</b> <span class="ef">${win&&lose?'splits into a winning and a losing area':'area effects from '+pp(xs[xs.length-1].r.pref)+' to '+pp(xs[0].r.pref)+' pp'+(win||lose?'':'; no area’s interval excludes zero')}</span>
          <div class="row">${xs.map(x=>`<span class="a ${cls(x.r)}${x.r.id===a.id?' cur':''}" data-area="${esc(x.r.id)}" title="${esc(x.r.label)} · ${num(x.a)} pages of this look · [${pp(x.r.pref_lo)}, ${pp(x.r.pref_hi)}]">area ${esc(x.r.id)} · ${pp(x.r.pref)} pp</span>`).join('')}</div></div>`; }).join('')||'<p>No look matched here is also matched to another area.</p>'); }
  else if(LV.length){ const w=LV.filter(l=>tier(l)===2&&!neg(l)).length;
    cap.innerHTML=`All ${num(N)} pilot pages, each dot in its own tournament place (legend below). The bright patches are the <b>${LV.filter(l=>tier(l)&&held(l)).length} clusters</b> whose sign held on held-out pages (${LV.filter(l=>tier(l)===2&&held(l)).length} clear, ${LV.filter(l=>tier(l)===1&&held(l)).length} leaning, drawn weaker); ${LV.filter(l=>!(tier(l)&&held(l))).length} others are under “Show all”.${S.model&&mleaf()?(()=>{ const up=MLF.by.filter(s=>s&&s.clear&&s.diff>0).length, dn=MLF.by.filter(s=>s&&s.clear&&s.diff<0).length;
      return `<small class="mline"><b>Model view · ${esc(MD.model)}</b>: its ${num(MLF.mp.length)} placed pilot pages in amber over all pages. It has more pages than the other models’ share predicts in ${up} clusters and fewer in ${dn} (beyond chance); ▲ / ▼ in the list, “by model share” sorts by it.</small>`; })():''}`;
    side.innerHTML='<p>A cluster’s card, the areas a node corresponds to, or the nodes an area is made of, are shown here.</p>'; }
  else { cap.innerHTML='Nothing selected.<small>Pick a node on the left, a small map below, or click the map.</small>'; side.innerHTML='<p>The areas a node corresponds to, or the nodes an area is made of, are listed here.</p>'; }
  document.querySelectorAll('[data-leaf]').forEach(b=>b.classList.toggle('on',b.dataset.leaf===S.leaf));
  document.querySelectorAll('[data-node]').forEach(b=>b.classList.toggle('on',b.dataset.node===S.node));
  const cur=document.querySelector('#nodes .nd.on');
  if(cur){ for(let d=cur.closest('details');d;d=d.parentElement.closest('details')) d.open=true;   // the selected row's groups open
    $('nodes').scrollTop=cur.offsetTop-$('nodes').clientHeight/2; }
  if(MD){ $('mv').hidden=!S.model; $('mv').textContent=`Model view on · ${MD.model}`; }
  document.querySelectorAll('#mx tr[data-row]').forEach(t=>t.classList.toggle('on',t.dataset.row===S.node));
  document.querySelectorAll('[data-mod]').forEach(b=>b.classList.toggle('on',(b.dataset.mod==='1')===S.model));
  legend(); T=target(); requestAnimationFrame(glide);
}
function pick(s){ if((s.leaf??null)!==S.leaf&&pz) pz.fit();   // a new cluster frame: the user's zoom starts again from it
  S.node=s.node??null; S.area=s.area??null; S.leaf=s.leaf??null; S.dot=-1; S.hover=null; panel(); writeURL(true); }
/* the whole view state lives in the URL: every selection is a history entry, so Back undoes it; Reset view = the URL of a first load */
function readURL(){ const u=new URLSearchParams(location.search), r0=REG.find(r=>String(r.id)===u.get('region'));
  S.leaf=LEAF[u.get('leaf')]?u.get('leaf'):LEAF[u.get('concept')]?u.get('concept'):null;
  S.node=!S.leaf&&byId[u.get('concept')]?u.get('concept'):null; S.area=!S.leaf&&!S.node&&r0?r0.id:null;
  if(!LV.length&&!S.node&&S.area==null) S.node=([...NODES].filter(n=>n.type==='style').sort((a,b)=>b.conc-a.conc)[0]||NODES[0]).id;   // start on the most concentrated look
  S.model=!!MD&&u.has('model'); S.sort=(m=>m==='conc'||REG.some(r=>String(r.id)===m)?m:null)(u.get('mx')); S.dot=-1; S.hover=null; LS.q=u.get('q')||'';
  LS.sort=['pages','task'].includes(u.get('sort'))||MD&&u.get('sort')==='model'?u.get('sort'):'effect'; LS.all=u.has('all'); }
const clean=()=>Q.get('data')?'?data='+encodeURIComponent(scale):'';
function writeURL(push){ pgSave(); const u=new URLSearchParams(clean().slice(1));
  if(S.leaf) u.set('leaf',S.leaf); else if(S.node) u.set('concept',S.node); else if(S.area!=null) u.set('region',S.area);
  if(S.model) u.set('model','1'); if(LS.q) u.set('q',LS.q); if(LS.sort!=='effect') u.set('sort',LS.sort); if(LS.all) u.set('all','1'); if(S.sort!=null) u.set('mx',S.sort);
  const q=u.toString()?'?'+u:''; if(q===location.search) return; history[push?'pushState':'replaceState'](null,'',q||location.pathname); }
function render(){ if(LV.length){ $('lvQ').value=LS.q; $('lvS').value=LS.sort; PK&&PK.refresh(); leafList(); } matrix(); panel(); }
function reset(){ if(window.LB) LB.close(); pz.fit(); if(location.search!==clean()) history.pushState(null,'',clean()||location.pathname); readURL(); render();
  for(const k in GS) delete GS[k]; document.querySelectorAll('#nodes details[data-g]').forEach(d=>d.open=true);
  clearTimeout(pgT); try{ sessionStorage.removeItem(PG); }catch(_){} }
addEventListener('popstate',()=>{ readURL(); render(); pgSave(); });
addEventListener('pagehide',()=>pgPut());
addEventListener('keydown',e=>{ if(e.key!=='Escape') return;   // the viewer closes itself first (lightbox.js); then the selection, then everything else
  if(S.leaf||S.node||S.area!=null) pick({}); else reset(); });
$('side').addEventListener('mouseover',e=>{ const d=e.target.dataset.dot; S.dot=d!=null?+d:-1; if(!T) draw(); });   // pointing at a prototype marks its dot on the map
const dd=l=>((AU[l.id]||{}).effect_dedup)||null;   // the effect with duplicate pages collapsed (cluster audit)
const lrow=l=>`<button class="nd lf${bound(l)?' bnd':''}" data-leaf="${esc(l.id)}""><span class="nm">${esc(l.name)}${(t=>t?`<span class="tgs">${t}</span>`:'')(   // tags under the name, so the name keeps the row's width
  (subj(l)?`<i class="tg">task-specific · ${esc(l.subject_token||'')}</i>`:'')+(onem(l)?`<i class="tg">one model · ${esc(l.top_model||'')}</i>`:'')+(held(l)?'':'<i class="tg bad">did not hold</i>'))}</span>${mchip(l)}<b class="ef ${bound(l)?'':cls(l)}">${pp(l.pref)}</b></button>`;
/* the directory: collapsible groups with their counts; open / closed is kept for the session (a search opens every group that has a match
   and does not change what is kept) */
/* page state for the session (site contract, sessionStorage pg:corr): selection, model switch, list and matrix settings, open groups and
   the map's pan / zoom. Restored on a load whose URL names no state of its own (UK); stale ids fall away in readURL; Reset view forgets it */
const PG='pg:corr', UK=['leaf','concept','region','model','q','sort','all','mx'];
const pgGet=()=>{ try{ const s=JSON.parse(sessionStorage.getItem(PG)); return s&&s.d===scale?s:null; }catch(_){ return null; } };
let pgT=0; const pgSave=()=>{ clearTimeout(pgT); pgT=setTimeout(pgPut,200); };
function pgPut(){ clearTimeout(pgT); try{ sessionStorage.setItem(PG,JSON.stringify({d:scale,leaf:S.leaf,node:S.node,area:S.area,model:S.model,mx:S.sort,q:LS.q,sort:LS.sort,all:LS.all,groups:GS,pz:pz&&pz.get()})); }catch(_){} }
const GS=(pgGet()||{}).groups||{};
const grp=(key,title,n,body,cls,def=true)=>`<details class="${cls}" data-g="${esc(key)}"${LS.q.trim()||(GS[key]??def)?' open':''}><summary>${title}<span class="c">${n}</span></summary>${body}</details>`;
const KINDS=[['general','Clusters',l=>!subj(l)&&!onem(l)],['task','Task-specific clusters',subj],['model','One model’s habit',onem]];   // section ids stay k:<id>
/* cluster list: kind of cluster, then wins more / wins fewer (clear before leaning, then by size of effect), by pages or by the model's
   excess of pages inside; or grouped by the task most over-represented in each. A search narrows it by name, description, concept or task.
   Clusters that are neither clear nor leaning stay behind "Show all" unless a search is on. */
const LS={q:'',sort:'effect',all:false}; let LSET=new Set();
function leafList(){ const q=LS.q.trim().toLowerCase(), txt=l=>[l.name,l.what,...(l.concepts||[]).map(c=>c.name),...(l.tasks||[]).map(t=>t.id)].join(' ').toLowerCase();
  const ok=l=>tier(l)&&held(l), ls=LV.filter(l=>(!q||txt(l).includes(q))&&(LS.all||q||ok(l))), hid=LV.filter(l=>!ok(l)).length;
  const ord=LS.sort==='pages'?(a,b)=>b.n-a.n:LS.sort==='model'&&S.model?(a,b)=>((mby(b)||{}).diff??-1e9)-((mby(a)||{}).diff??-1e9):(a,b)=>tier(b)-tier(a)||rankL(a,b);
  const sub=(k,t,xs,c,def)=>xs.length?grp(k,t,xs.length,[...xs].sort(ord).map(lrow).join(''),'gs '+c,def):'';
  const task=l=>l.tasks&&l.tasks[0]?String(l.tasks[0].id).replace(/^ctx_/,''):'no task stands out';
  const kind=([k,t,f])=>{ const xs=ls.filter(f); return xs.length?grp('k:'+k,t,xs.length,
      sub(k+':more','Wins more ▲',xs.filter(l=>ok(l)&&!neg(l)),'pos')+sub(k+':fewer','Wins fewer ▼',xs.filter(l=>ok(l)&&neg(l)),'neg')+
      sub(k+':zero','Not separable from zero',xs.filter(l=>held(l)&&!tier(l)),'')+sub(k+':flip','Did not hold on held-out pages',xs.filter(l=>!held(l)),''),'gk'):''; };
  // sections: 1 Clusters (lvA), 2-4 node groups, 5 Task-specific clusters, 6 One model's habit (lvB, with "Show all" under them), 7 Elements
  $('lvA').innerHTML=LS.sort==='task'?[...new Set(ls.map(task))].sort().map(t=>{ const xs=ls.filter(l=>task(l)===t); return grp('t:'+t,'Task · '+esc(t),xs.length,[...xs].sort(ord).map(lrow).join(''),'gk'); }).join(''):kind(KINDS[0]);
  $('lvB').innerHTML=(LS.sort==='task'?'':kind(KINDS[1])+kind(KINDS[2]))+
    (ls.length?'':'<p class="none">No cluster matches.</p>')+(hid&&!LS.all&&!q?`<button class="nd" id="lvMore"><span style="color:var(--ice)">Show all ${LV.length} clusters</span></button>`:'');
  document.querySelectorAll('#lvList [data-leaf]').forEach(b=>b.classList.toggle('on',b.dataset.leaf===S.leaf));
  LSET=new Set(ls.map(l=>l.id)); if(typeof W==='number'&&W>1&&!T) draw(); }   // the map emphasises exactly the clusters listed
$('nodes').innerHTML=(LV.length?`<div class="lvc"><input id="lvQ" type="search" placeholder="Search clusters" aria-label="Search clusters"><select id="lvS" aria-label="Sort clusters"><option value="effect">by effect</option><option value="pages">by pages</option>${MD?'<option value="model">by model share</option>':''}<option value="task">by task</option></select></div>`:'')+(()=>{ const ng=gr=>{ const ns=NODES.filter(n=>n.group===gr); return ns.length?grp('n:'+gr,gr,ns.length,ns.map(n=>`<button class="nd" data-node="${esc(n.id)}"><span>${esc(n.name)}</span>${eff(n)}</button>`).join(''),'gk'):''; };
    return `<div id="lvList"><div id="lvA"></div>${ng('Combinations')+ng('Whole looks')+ng('Task categories')}<div id="lvB"></div>${ng('Elements')}</div>`; })();
$('nodes').addEventListener('toggle',e=>{ const d=e.target; if(!d.dataset||!d.dataset.g||LS.q.trim()) return; if((GS[d.dataset.g]??true)===d.open) return; GS[d.dataset.g]=d.open; pgSave(); },true);   // groups are open by default

/* small multiples, ordered by concentration */
$('multi').innerHTML=[...NODES].sort((a,b)=>b.conc-a.conc).map(n=>`<button class="card mm" data-node="${esc(n.id)}" data-scroll="1"><canvas width="304" height="208" data-mini="${esc(n.id)}"></canvas><b>${esc(n.name)}</b><span>${eff(n)}<span>${concLine(n)}</span></span></button>`).join('');
{ const w=304,h=208, K=Math.min((w-10)/(B.x1-B.x0),(h-10)/(B.y1-B.y0)), OX=w/2-(B.x0+B.x1)/2*K, OY=h/2-(B.y0+B.y1)/2*K, bg=document.createElement('canvas'); bg.width=w; bg.height=h;
  const c=bg.getContext('2d'); c.fillStyle=css('--void'); c.fillRect(0,0,w,h); c.globalAlpha=.5; c.fillStyle=css('--faint'); dots(c,ALL,1.4,K,OX,OY);
  document.querySelectorAll('[data-mini]').forEach(el=>{ const x=el.getContext('2d'); x.drawImage(bg,0,0); x.globalAlpha=.9; dotsPlace(x,byId[el.dataset.mini].mem,2,K,OX,OY); }); }

/* matrix */
function matrix(){
  const rows=[...NODES].sort(S.sort==='conc'?(a,b)=>b.conc-a.conc:S.sort!=null?(a,b)=>((b.hit.find(x=>String(x.r.id)===S.sort)||{}).lift||0)-((a.hit.find(x=>String(x.r.id)===S.sort)||{}).lift||0):()=>0);
  $('mx').innerHTML=`<table><tr><th data-sort="" class="${S.sort==null?'on':''}" style="text-align:left">Node</th><th data-sort="conc" class="${S.sort==='conc'?'on':''}">Conc.</th>${REG.map(r=>`<th data-sort="${esc(r.id)}" class="${S.sort===String(r.id)?'on':''}" style="${sure(r)?'color:'+tone(r):''}" title="${esc(r.label)} · ${num(r.n)} pages · ${pp(r.pref)} pp [${pp(r.pref_lo)}, ${pp(r.pref_hi)}]">${esc(r.id)}</th>`).join('')}</tr>
    ${rows.map(n=>`<tr data-row="${esc(n.id)}"><td class="n" data-node="${esc(n.id)}">${esc(n.name)}</td><td>${n.top.length?pct(n.conc):'–'}</td>${REG.map(r=>{ const x=n.hit.find(x=>x.r.id===r.id);
      return x?`<td class="c" data-node="${esc(n.id)}" data-cell="${esc(r.id)}" title="${esc(n.name)} in “${esc(r.label)}”: ${num(x.a)} pages" style="background:rgba(143,198,255,${Math.min(.6,.1+x.lift/14).toFixed(2)})">${x.lift>=10?Math.round(x.lift):x.lift.toFixed(1)}</td>`:'<td></td>'; }).join('')}</tr>`).join('')}</table>`;
}
matrix();
$('mx').addEventListener('mouseover',e=>{ const c=e.target.closest('[data-cell]'), h=c?{node:c.dataset.node,area:REG.find(r=>String(r.id)===c.dataset.cell).id}:null;
  if((h&&h.node+h.area)!==(S.hover&&S.hover.node+S.hover.area)){ S.hover=h; draw(); } });
$('mx').addEventListener('mouseleave',()=>{ if(S.hover){ S.hover=null; draw(); } });

document.addEventListener('click',e=>{
  if(e.target.id==='reset'){ reset(); return; }
  if(e.target.closest('[data-more]')){ e.target.closest('.six').querySelectorAll('img[data-lb]')[wide()?6:4].click(); return; }   // the viewer, at the first image not shown
  const t=e.target.closest('[data-sort],[data-mod],[data-area],[data-node],[data-leaf]');
  if(!t){ if(e.target.matches('html,body,#view,.main,.mapc,.mw,.under,.cap')&&(S.leaf||S.node||S.area!=null)) pick({}); return; }   // empty background clears the selection
  if(t.dataset.leaf){ pick(t.dataset.leaf===S.leaf?{}:{leaf:t.dataset.leaf}); return; }   // the selected item clicked again deselects it
  if(t.dataset.sort!=null){ S.sort=t.dataset.sort||null; matrix(); panel(); writeURL(true); }
  else if(t.dataset.mod){ S.model=t.dataset.mod==='1'; if(LV.length) leafList(); panel(); writeURL(true); }
  else if(t.dataset.area!=null){ const id=REG.find(r=>String(r.id)===t.dataset.area).id; pick(id===S.area&&!S.node&&!S.leaf?{}:{area:id}); }
  else if(t.dataset.node===S.node) pick({});
  else { pick({node:t.dataset.node}); if(t.dataset.scroll||t.closest('#mx')) document.querySelector('.main').scrollIntoView({behavior:'smooth',block:'center'}); }
});
if(LV.length){ $('lvQ').oninput=e=>{ const was=LS.q; LS.q=e.target.value; leafList(); writeURL(!was); };   // one history entry per search
  PK=Picker.attach($('lvS'));   // the site's dark picker; the hidden select stays the source of truth
  $('lvS').onchange=e=>{ LS.sort=e.target.value; if(LS.sort==='model'&&!S.model){ S.model=true; panel(); } leafList(); writeURL(true); };   // sorting by the model's share turns the model view on
  $('lvList').addEventListener('click',e=>{ if(e.target.closest('#lvMore')){ LS.all=true; leafList(); writeURL(true); } }); }
new ResizeObserver(()=>{ const r=cv.getBoundingClientRect(); if(r.width&&(r.width!==W||r.height!==H)) size(); }).observe(cv);   // dividers, window, stacking
pz=PanZoom.attach(cv,{min:.6,max:8,onChange:(v,live)=>{ if(!live) pgSave(); if(T) return; if(live&&snap) blit(); else draw(); },isNode:e=>pageAt(e)>=0});
Columns.attach(document.querySelector('.main'),{key:'corr.cols',mins:[260,340,280],storage:'local',narrow:1303});
{ const fit=()=>window.PgFrame&&PgFrame.fit(document.querySelector('.main')); if(window.PgFrame) fit(); else addEventListener('DOMContentLoaded',fit); }   // PgFrame (nav.js) keeps the working area's --work-top current
cv.addEventListener('contextrestored',size);   // the browser may drop a canvas's pixels (memory pressure, background tab): draw again
addEventListener('pageshow',()=>size()); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) size(); });
if(document.fonts) document.fonts.ready.then(()=>size());
readURL(); const PS=pgGet();
if(PS&&!UK.some(k=>Q.has(k))){ Object.assign(S,{leaf:PS.leaf,node:PS.node,area:PS.area,model:!!PS.model,sort:PS.mx??null}); Object.assign(LS,{q:PS.q||'',sort:PS.sort||'effect',all:!!PS.all}); writeURL(false); readURL(); }
if(PS&&PS.pz&&[PS.pz.z,PS.pz.x,PS.pz.y].every(Number.isFinite)&&PS.leaf===S.leaf&&PS.node===S.node&&PS.area===S.area) pz.set({z:Math.max(.6,Math.min(8,PS.pz.z)),x:PS.pz.x,y:PS.pz.y});   // the view belongs to its selection's frame
if(LV.length){ $('lvQ').value=LS.q; $('lvS').value=LS.sort; PK&&PK.refresh(); leafList(); } matrix(); size(); panel();
window.CORR={FIELD,S,LS,NODES,REG,LV,pick,reset,mleaf,view:()=>({...pz.get(),k,ox,oy,home:home().k}),
  hit:(x,y)=>{ const r=cv.getBoundingClientRect(); return pageAt({clientX:r.left+x,clientY:r.top+y}); },
  lay:()=>LAY, PLC, PLACE:i=>PLACE[i],
  pagePos:i=>{ const {K,OX,OY}=vw(); return [X[i]*K+OX,Y[i]*K+OY]; },
  scr:k=>{ const {K,OX,OY}=vw(), m=q=>[q[0]*K+OX,q[1]*K+OY];   // screen positions for the contrast check: a cluster's points, or field pages in no listed cluster
    if(k==='field'){ const o=[]; for(let i=0;i<N&&o.length<3000;i+=3) if(X[i]!=null&&!(PL&&PL[i]>=0&&LSET.has(LV[PL[i]].id))) o.push(m([X[i],Y[i]])); return o; }
    if(k==='held') return LV.filter(l=>LSET.has(l.id)).flatMap(l=>lpts(l).slice(0,20)).map(m);
    return lpts(LEAF[k]).map(m); },
  spot:id=>{ const i=(LEAF[id].pages||[]).find(i=>X[i]!=null), {K,OX,OY}=vw(); return i==null?null:[X[i]*K+OX,Y[i]*K+OY]; }};   // for tests
})();
