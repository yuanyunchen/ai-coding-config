/* Data pipeline page: the skill's folder tree as a radial map (structure; a compact list beside it), a request walked through it
   step by step (run), and the walk's counterpart on the continuous DINO map (map). Data: data/atlas/<version>/atlas.json (contract:
   T02.05.02.03 brief.md), the map's pages from atlas.map.file, concept-graph names from data/pilot/graph_layered.json. No model call.
   URL: ?v=<version>&demo=<id>&node=<id>&focus=<id> (all optional). Keys: space play / pause, arrows step, Home replay, Esc clear,
   F overview, / search. */
(async()=>{
'use strict';
/* item 87: the page keeps its state for the session (sessionStorage 'pg:pipeline'): with no parameters in the address the stored
   version, request, step, node and focus are used; view, pan and zoom come back when the address is the one stored with them */
const PGK='pg:pipeline', PGS=(()=>{ try{ const o=JSON.parse(sessionStorage.getItem(PGK)||'null'); return o&&typeof o==='object'?o:null; }catch(e){ return null; } })();
const $=id=>document.getElementById(id), Q=new URLSearchParams(location.search||(PGS&&PGS.q)||'');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct=v=>v==null?'n/a':(v*100).toFixed(v<.1&&v>0?1:0)+'%', num=n=>n==null?'n/a':Number(n).toLocaleString('en-US');
const sg=v=>v==null?'n/a':(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(3);
const css=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const POS=[127,211,160], NEG=[240,138,138], NEU=[154,167,201], KL=[185,164,255], ICE=[143,198,255];   // KL: the kind-level branch any/<kind>
const rgba=(c,a)=>`rgba(${c},${a})`;
const ARMS={N:['Prompt alone','circle','#c9d2ea'],T:['taste.md','square','#ffc98a'],P:['Pipeline','diamond','#8fc6ff']};

/* versions: the tested version first and the default (item 80), the newer structure second, for comparison; ?v=v3 opens it.
   A staged directory can be opened by name (?v=v3.staged). */
const VERS=['r3','v3'], ls=await fetch('data/atlas/').then(r=>r.ok?r.text():'').catch(()=>'');   // the server's folder listing, when it gives one
const have=ls.includes('href=')?VERS.filter(v=>ls.includes(`"${v}/"`)):(await Promise.all(VERS.map(v=>fetch(`data/atlas/${v}/atlas.json`,{method:'HEAD'}).then(r=>r.ok).catch(()=>false)))).map((ok,i)=>ok&&VERS[i]).filter(Boolean);
const want=Q.get('v');
if(want&&!have.includes(want)&&/^[\w.-]+$/.test(want)&&await fetch(`data/atlas/${want}/atlas.json`,{method:'HEAD'}).then(r=>r.ok).catch(()=>false)) have.push(want);
const ver=have.includes(want)?want:have[0];
if(!ver){ $('view').innerHTML='<h1>No pipeline atlas yet</h1><p class="sub">data/atlas/&lt;version&gt;/atlas.json is missing.</p>'; return; }
const base=`data/atlas/${ver}/`;
const A=await fetch(base+'atlas.json').then(r=>r.json());
/* a link to a run (?demo=) that names no version opens the version holding that run (the arena links r3 runs) */
if(Q.get('demo')&&!want&&!(A.demos||[]).some(d=>d.id===Q.get('demo'))) for(const v of have.filter(v=>v!==ver)){
  const B=await fetch(`data/atlas/${v}/atlas.json`).then(r=>r.json()).catch(()=>null); if(B&&(B.demos||[]).some(d=>d.id===Q.get('demo'))){ Q.set('v',v); location.replace('?'+Q); return; } }
const [PT,GL,LVS]=await Promise.all([fetch(A.map.file).then(r=>r.json()),fetch('data/pilot/graph_layered.json').then(r=>r.ok?r.json():null).catch(()=>null),fetch('data/pilot/leaves.json').then(r=>r.ok?r.json():null).catch(()=>null)]);
const GN=Object.fromEntries(((GL&&GL.nodes)||[]).map(n=>[n.id,n.name]));

/* ── data: the folder tree, plus three kinds of virtual node that are not folders: the "to avoid" group under a scenario and its
   problems (atlas.problems), and a stub under a category for each kind of page it sends to the kind level any/<kind> ── */
const N=Object.fromEntries(A.tree.map(n=>[n.id,{...n}])), KIDS={}, C=Object.fromEntries(A.conditions.map(c=>[c.id,c])), S=Object.fromEntries(A.styles.map(s=>[s.id,s]));
for(const n of A.tree) if(n.parent) (KIDS[n.parent]=KIDS[n.parent]||[]).push(n.id);
const ROOT=A.tree.find(n=>n.level==='root').id, DEMOS=A.demos||[], DM=Object.fromEntries(DEMOS.map(d=>[d.id,d]));
const nfiles=n=>n.files||(n.file?[n.file]:[]), BYFILE={};
for(const n of A.tree) for(const f of nfiles(n)) BYFILE[f]=BYFILE[f]||n.id;
const PB={}, PBC={};
(A.problems||[]).forEach((p,i)=>{ let id=p.id; if(PB[id]||N[id]) id+='~'+i; p._id=id; PB[id]=p; (PBC[p.condition]=PBC[p.condition]||[]).push(id); });   // ids made unique for drawing; the checker reports duplicates
for(const [sc,ids] of Object.entries(PBC)) if(N[sc]){ const av='av:'+sc; N[av]={id:av,parent:sc,level:'avoid',title:'to avoid',file:N[sc].file,virtual:1}; (KIDS[sc]=KIDS[sc]||[]).push(av); KIDS[av]=ids;
  for(const id of ids) N[id]={id,parent:av,level:'problem',title:PB[id].name||PB[id].id,file:N[sc].file,virtual:1}; }
const FB={};   // target scenario -> its stubs
for(const c of A.tree.filter(n=>n.level==='category')) for(const m of (c.text||'').matchAll(/\(`([\w-]+)`\):\s*([\d.]+)% of pages\s*->\s*(\S+?)\/context\.md/g)){
  const t=BYFILE[m[3]+'/context.md']; if(!t||N[t].parent===c.id||N[t].level!=='scenario') continue;
  const id=`fb:${c.title}/${m[1]}`; N[id]={id,parent:c.id,level:'fallback',title:m[1],target:t,share:+m[2]/100,file:null,virtual:1}; (KIDS[c.id]=KIDS[c.id]||[]).push(id); (FB[t]=FB[t]||[]).push(id); }
for(const d of DEMOS){ d.category=d.category||d.reading.category; d.suggested=d.suggested||[];   // fields beyond the contract are optional
  d.files=d.files||[...new Set(d.path.flatMap(i=>nfiles(N[i]||{})))]; }
const arm=(a,d)=>{ const m=ARMS[a]||[a,'circle','#e9eefb']; return a==='P'&&d&&d.form?[`${m[0]} · form ${d.form}`,m[1],m[2]]:m; };
const tierOf=s=>s&&({clear:2,leaning:1,suggestive:1}[s.tier]||0), sign=s=>s&&s.value&&s.value.effect<0?-1:1;
const col=(s,a=1)=>{ const t=tierOf(s); if(!t) return rgba(NEU,a*.8); return rgba(sign(s)>0?POS:NEG,a*(t===2?1:.55)); };
const LF={};   // finer clusters inside a region (item 60), made when a region is selected
const REC=id=>S[id]||PB[id]||LF[id];   // a style, a problem or a finer cluster
const noRec=id=>A.styles.some(s=>'suggested' in s)&&(KIDS[id]||[]).some(k=>S[k])&&!(KIDS[id]||[]).some(k=>S[k]&&S[k].suggested!==false);   // a scenario whose styles are all withheld
/* styles the curation withholds (atlas `suggested: false`, with `curation: {verdict, reason}`): not drawn by default; absent field = all shown */
const CUR=A.styles.some(s=>'suggested' in s), wd=id=>!!S[id]&&S[id].suggested===false;
const WHY={no_evidence:'no real evidence',cliche:'cliché default look',not_a_style:'not a style',bound:'bound to one subject or image',low_craft:'low craft'};
const whyKey=s=>{ const c=s.curation||{}; if((c.reasons||[]).length) return WHY[c.reasons[0]]||String(c.reasons[0]).replace(/_/g,' '); const v=String(c.verdict||''); return v&&!/^(do not|don't|not\b|no$|withh|reject|exclu|false|skip)/i.test(v)?v:String(c.reason||'no reason given').split(/[:.;(—]/)[0].trim().slice(0,48); };
const scopeTag=s=>{ const sc=s&&s.scope; if(!sc) return ''; const sub=[].concat(sc.subject||sc.subjects||[]).map(x=>String(x).replace(/_/g,' ')).join(', '); return sub?'for: '+sub:'scoped'; };   // recommended for one subject domain
const RANK={scenario:0,fallback:1,style:0,avoid:1};
const wt=id=>{ const n=N[id]; return n.level==='style'?S[id].share:n.level==='scenario'?(C[id]||{}).n_pages||0:n.level==='fallback'?n.share:0; };
for(const k of Object.keys(KIDS)) KIDS[k].sort(N[k].level==='avoid'?(a,b)=>(PB[a].kind==='render_failure')-(PB[b].kind==='render_failure')||PB[a].value.effect-PB[b].value.effect:(a,b)=>(RANK[N[a].level]||0)-(RANK[N[b].level]||0)||wt(b)-wt(a));
/* a region's example pages as nodes: for every style the outermost ring of the structure map (item 68), for a problem while it is selected */
const exKids=rid=>{ const r=REC(rid); return [...(r.exemplars||[]),...(r.members_shown||[])].slice(0,4).map((e,i)=>{ const id='ex:'+rid+':'+i; N[id]={id,parent:rid,level:'example',title:`example ${i+1}`,file:N[rid].file,virtual:1,ex:e}; return id; }); };
const BASEK={}, exOf=sid=>(BASEK[sid]||[]).filter(k=>N[k].level==='example');   // a style's example pages (its finer clusters hang beside them)
 for(const s of A.styles) if(N[s.id]){ const k=exKids(s.id); if(k.length) KIDS[s.id]=BASEK[s.id]=k; }
function memo(f){ const m={}; return x=>m[x]||(m[x]=f(x)); }
const catPages=memo(id=>(KIDS[id]||[]).flatMap(s=>(C[s]||{}).pages||[]));
const catOf=id=>{ let n=id; while(n&&N[n].level!=='category') n=N[n].parent; return n; };
const scOf=id=>{ let n=id; while(n&&N[n].level!=='scenario') n=N[n].parent; return n||(N[id]&&N[id].target)||null; };
const anc=id=>{ const a=[]; for(let n=id;n;n=N[n].parent) a.unshift(n); return a; };
const isKL=id=>N[id]&&(id==='cat:any'||catOf(id)==='cat:any');
const COUNT={root:1,category:0,scenario:0,style:0,withheld:A.styles.filter(s=>s.suggested===false).length,scoped:A.styles.filter(s=>s.scope&&s.suggested!==false).length,problem:(A.problems||[]).length,fallback:Object.values(FB).flat().length};
for(const n of A.tree) if(n.level!=='root') COUNT[n.level]++;

/* ── state ── */
const OPEN0=()=>new Set(A.tree.filter(n=>n.level!=='style').map(n=>n.id));   // the open folders of a fresh load
const st={sel:Q.get('node')&&N[Q.get('node')]?Q.get('node'):null, demo:DM[Q.get('demo')]?Q.get('demo'):null, step:0, playing:false,
  open:OPEN0(), focus:Q.get('focus')&&N[Q.get('focus')]?Q.get('focus'):null, hover:null, q:'', view:'map', rf:true};
let timer=null, stepT0=0;

/* ── run: a demo becomes a list of steps ── */
const STOP={few_cards:'Fewer than two compatible styles here, so the request gets the global layer and the category notes only.',
  full_brief:'The request fixes the whole look, so it owns it: global layer and category notes only.',
  fixed_conflict:'The styles here clash with values the request fixes: global layer and category notes only.',
  read_failed:'The request could not be read: global layer only.'};
/* the drawn path: the stored path, with the request's own category and its stub inserted when the route goes to the kind level */
function vpath(d){ const p=d.path.slice(), rc=(d.reading||{}).category, i=p.indexOf('cat:any');
  if(i>0&&rc&&rc!=='any'){ const cat=A.tree.find(n=>n.level==='category'&&n.title===rc), sc=p[i+1], fb=cat&&(KIDS[cat.id]||[]).find(k=>N[k].target===sc);
    p.splice(i,d.files.includes(N['cat:any'].file)?0:1,...(cat?[cat.id]:[]),...(fb?[fb]:[])); }
  return p; }
function steps(d){
  if(!d) return [];
  const p=vpath(d), L=[{t:'request',cap:'A request arrives.'}];
  for(const f of ['category','kind','subject','fixed']) L.push({t:'read',f,cap:`Reading the request: ${f==='fixed'?'what it fixes about the look':f==='kind'?'the kind of page':f}.`});
  const fileAt=n=>d.files.filter(f=>nfiles(n).includes(f));
  for(const id of p){ const n=N[id]; if(n.level==='style') continue;
    if(n.level==='fallback'){ L.push({t:'walk',node:id,files:[],cap:`No folder ${N[n.parent].title}/${n.title}: too few pages there, so the route reads the kind level ${N[n.target].file}.`}); continue; }
    const fs=fileAt(n); L.push({t:'walk',node:id,files:fs,cap:`Reading ${fs.length?fs.join(' and '):n.level==='root'?'the root files':n.file}.`}); }
  const sc=p.find(i=>N[i].level==='scenario');
  const sf=d.files.filter(f=>d.suggested.some(i=>i!==d.chosen&&N[i]&&nfiles(N[i]).includes(f)));
  if(sf.length&&d.chosen) sf.push(...fileAt(N[d.chosen]));   // all suggested files are read, so the generator chooses among them
  if(sc&&(PBC[sc]||[]).length) L.push({t:'warn',node:sc,cap:`The scenario's file names ${PBC[sc].length} region${PBC[sc].length>1?'s':''} to avoid.`});
  L.push({t:'suggest',files:sf,cap:d.suggested.length&&d.chosen?`${d.suggested.length} style${d.suggested.length>1?'s':''} offered, 1 chosen${sf.length?' (each offered one read)':''}.`:'No style is drawn.'});
  if(d.chosen) L.push({t:'walk',node:d.chosen,files:sf.length?[]:fileAt(N[d.chosen]),cap:`Chosen: “${N[d.chosen].title}”${sf.length?' (the generator chose it)':', reading '+N[d.chosen].file}.`});
  const ek=d.chosen?exOf(d.chosen):[]; if(ek.length) L.push({t:'walk',node:ek[0],ex:1,files:[],cap:`The chosen style's ${ek.length} example page${ek.length>1?'s':''}, on the outermost ring.`});
  const rest=d.files.filter(f=>!L.some(s=>(s.files||[]).includes(f)));
  if(rest.length) L.push({t:'model',files:rest,cap:'Last, the file for the generating model.'});
  L.push({t:'land',cap:'The generated pages, placed on the map.'});
  return L; }
let STEPS=steps(DM[st.demo]); st.step=Math.max(0,Math.min(+Q.get('step')||0,STEPS.length-1));
const done=t=>STEPS.slice(0,st.step+1).some(s=>s.t===t);
const walked=()=>STEPS.slice(0,st.step+1).filter(s=>s.t==='walk').map(s=>s.node);
const cur=()=>STEPS[st.step]||{};
const readUpTo=f=>STEPS.slice(0,st.step+1).some(s=>s.t==='read'&&s.f===f);
const runSc=()=>walked().find(i=>N[i].level==='scenario');
function openWalk(){ for(const id of walked()) for(const a of anc(id)) if(a!==id||KIDS[id]) st.open.add(a); const sc=runSc(); if(sc&&done('warn')) st.open.add('av:'+sc); }
openWalk(); if(st.focus) for(const a of [...anc(st.focus),'av:'+st.focus]) if(KIDS[a]) st.open.add(a);

/* ── controls ── */
/* the task list feeds the shared dark picker (picker.js): category as a tag, the request on one line, the generator said once */
const GEN1=new Set(DEMOS.map(d=>d.generator)).size===1?DEMOS[0]&&DEMOS[0].generator:null;
const opt=d=>{ const t=d.prompt.replace(/\s+/g,' '); return `<option value="${esc(d.id)}" data-tag="${esc(d.category)}"${d.featured?' data-star="1"':''}${!GEN1&&d.generator?` data-meta="${esc(d.generator)}"`:''} title="${esc(t.slice(0,400))}" data-short="${esc(d.category)} · ${esc(t.slice(0,60))}${t.length>60?'…':''}">${esc(t.slice(0,160))}</option>`; };
/* the two relations for the generator shown (atlas.relations): taste.md above the prompt alone, the pipeline above taste.md */
const RL=A.relations, rate=v=>`${(v.rate*100).toFixed(1)}% [${(v.lo*100).toFixed(1)}, ${(v.hi*100).toFixed(1)}]`;
const ibar=v=>{ const X=t=>Math.round((Math.max(.3,Math.min(.75,t))-.3)/.45*120); return `<svg width="124" height="14" viewBox="0 0 124 14" aria-hidden="true"><line x1="${X(.5)}" x2="${X(.5)}" y1="0" y2="14" stroke="${css('--faint')}" stroke-dasharray="2 2"/><line x1="${X(v.lo)}" x2="${X(v.hi)}" y1="7" y2="7" stroke="${v.lo>.5?'rgb('+POS+')':css('--dim')}" stroke-width="3" stroke-linecap="round"/><circle cx="${X(v.rate)}" cy="7" r="3.5" fill="${css('--starlight')}"/></svg>`; };
/* versions by what they are (item 22); the loaded version's own data overrides the "not judged" state once it has judged rates */
const judged=!!(RL&&RL.pairs||[]).some(r=>r.sealed);
/* the cluster audit (item 35; data/pilot/cluster_audit.json, written by T02.05.06.02): non-repeating examples and a verdict per cluster;
   used wherever a style's or region's examples are shown, falling back to the atlas's own selection for items it lacks */
const AUD=await fetch('data/pilot/').then(r=>r.ok?r.text():'').catch(()=>'').then(t=>t.includes('cluster_audit.json')?fetch('data/pilot/cluster_audit.json').then(r=>r.ok?r.json():{}):{}).then(j=>j&&j.items?j.items:j||{}).catch(()=>({}));   // entries under `items` since the 14:10 rebuild; the folder listing first: no 404 while the file does not exist
const AUDV={image_bound:'one stock image',template_bound:'one template',subject_bound:'one subject',generator_bound:'one generator'};
const audOf=r=>r&&(AUD[r.id]||AUD[r.cluster]||AUD[r.region]||AUD[r.card])||null;   // r3 styles carry their cluster as `card` (item 84: 307 of 396 match)
const bound=a=>a&&((a.marks&&a.marks.bound)||(a.verdict&&a.verdict!=='look'&&(AUDV[a.verdict]||a.verdict.replace(/_/g,' '))))||null;   // "one stock image", "one template", ...
const effs=a=>a&&a.marks&&a.marks.effect_raw!=null?`${sg(a.marks.effect_raw)} → ${sg(a.marks.effect_dedup)} after de-duplication${a.marks.tier_change==='lost'?` (tier ${esc(a.marks.tier_raw)} → ${esc(a.marks.tier_dedup)})`:''}`:'';
/* a single page's own placement in its tournament (item 64): page.css --place-1..4, grey when unknown */
const PLACE=[1,2,3,4].map(i=>css('--place-'+i)||['#2fbf71','#9fe0b8','#f2a7a0','#d9443a'][i-1]), PLACE0=css('--place-none')||'#7d869c';
const placeCol=p=>p>=1&&p<=4?PLACE[p-1]:PLACE0;
const placeTxt=p=>p>=1&&p<=4?`${['1st','2nd','3rd','4th'][p-1]} of 4`:'';   // a single page named with its place (item 64)
const pplOf=r=>{ const m={}; (r.pages||[]).forEach((p,i)=>m[p[0]]=(r.page_places||[])[i]); return m; };   // a record's own pages with their places
const placeHTML=p=>p>=1&&p<=4?`<span class="place-${p}">${placeTxt(p)}</span> · `:'';
const META=Object.fromEntries(await Promise.all(have.map(v=>v===ver&&A.meta?[v,A.meta]:fetch(`data/atlas/${v}/meta.json`).then(r=>r.ok?r.json():null).catch(()=>null).then(m=>[v,m]))));   // each version's own label and status (atlas meta / meta.json)
const vname=v=>META[v]&&META[v].label||`${v} · unnamed version`;
const vstatus=()=>{ const P=(RL&&RL.pairs)||[], meas=P.filter(r=>r.sealed).map(r=>`${r.label} (${(r.sealed.source||'').split(',')[0]})`), earlier=P.filter(r=>!r.sealed&&r.earlier).map(r=>`${r.label} (earlier round)`), pend=P.filter(r=>!r.sealed).map(r=>r.label);
  const what=(META[ver]&&META[ver].status)||(judged?'judged':'not judged');
  return `<b>${esc(vname(ver))}</b>: ${what}. Measured: ${[...meas,...earlier,...(A.pilot?['a pilot without judges (30 prompts × 3 generators)']:[])].join('; ')||'nothing yet'}. Pending: ${pend.length?pend.join(', ')+(judged?' on the sealed test':' in the selection round'):'nothing'}.`; };
/* the strip of core numbers: the same slots in every version; judged rates where they exist, else "pending: selection round"; then the pilot measures without judges */
const RL_=RL||{pairs:[{label:'taste.md vs prompt alone'},{label:'pipeline vs taste.md'}]};
const relHTML=()=>{ const ag=Object.entries(RL_.all_generators||{}).filter(([,v])=>v&&v.rate!=null), PL=A.pilot, pc=v=>v?`${(v[0]*100).toFixed(0)}%`:'n/a';
  const slot=r=>r.sealed?`${ibar(r.sealed)} <b>${rate(r.sealed)}</b> <small>sealed test</small>`:r.earlier?`<small>${judged?'not judged on the sealed test':'pending: selection round'}</small> · ${ibar(r.earlier)} <b>${rate(r.earlier)}</b> <small>earlier round</small>`:`<small class="pend">pending: selection round</small>`;
  const pil=PL?`<span class="rc" title="${esc(PL.source)}"><span>Pilot, no judges</span> <small>A/B</small> render <b>${pc(PL.forms.A.render_ok)}/${pc(PL.forms.B.render_ok)}</b> · adherence <b>${pc(PL.forms.A.adherence)}/${pc(PL.forms.B.adherence)}</b> · in region <b>${pc(PL.forms.A.inside)}/${pc(PL.forms.B.inside)}</b> <small>(chance ${pc([PL.forms.A.natural_share])})</small> · <b>${PL.forms.A.distinct_styles}/${PL.forms.B.distinct_styles}</b> styles</span>`
    :`<span class="rc"><span>Pilot, no judges</span> <small>none: this version went to the judged test directly</small></span>`;
  return `<b title="The generator whose pages are shown">${esc(RL_.model||A.showcase_generator||RL_.generator||'')}</b>${RL_.pairs.map((r,i)=>`<span class="rc" title="${esc((r.sealed||r.earlier||{}).source||r.status||'')}"><span>${esc(r.label)}</span> ${slot(r)}</span>`).join('')}${pil}
  <details class="rd"><summary>All generators and how these are counted</summary><div class="vst">${vstatus()}</div>${ag.length?ag.map(([k,v])=>`<div>${esc({P_vs_T:'pipeline (r3) vs taste.md',W_vs_T:'pipeline (r2 incumbent) vs taste.md',T_vs_N:'taste.md vs prompt alone'}[k]||k)}: <b>${rate(v)}</b>, ${num(v.pairs)} pairs · ${esc(v.source)}</div>`).join(''):'<div>No judged comparison for this version yet.</div>'}${RL_.pairs.filter(r=>r.reference).map(r=>`<div>${esc(r.label)}, ${esc(RL_.model)}, ${esc(r.reference.arm)}: <b>${rate(r.reference)}</b></div>`).join('')}${PL?`<div>Pilot, all generators, forms A / B: render ok ${pc(PL.all_generators.A.render_ok)} / ${pc(PL.all_generators.B.render_ok)}, adherence ${pc(PL.all_generators.A.adherence)} / ${pc(PL.all_generators.B.adherence)}, in the style's region ${pc(PL.all_generators.A.inside)} / ${pc(PL.all_generators.B.inside)}, distinct styles ${PL.all_generators.A.distinct_styles} / ${PL.all_generators.B.distinct_styles}. ${esc(PL.source)}; adherence = share of the chosen style's look lines found on the page; in the region = the page lands among the style's member pages.</div>`:''}<div>Judged rates: share of pairs the vision-model panel gives the first arm, 95% interval by prompt; they come from all prompts of the generator; the task list is a showcase, featured first.</div></details>`; };
/* two rows above the columns (item 62): this row holds the controls; the version's status sentence is the pill's hover and focus text
   (and the first lines of "All generators and how these are counted"); the failed-runs line sits in the request picker's footer */
const plain=h=>{ const d=document.createElement('div'); d.innerHTML=h; return d.textContent; };
const vtitle=v=>v===ver?plain(vstatus()):META[v]&&META[v].status?`${vname(v)}: ${META[v].status}`:vname(v);
$('bar').innerHTML=`<button class="b" id="bReset" title="Back to the view of a fresh load (Esc steps back one level at a time)">Reset view</button>
  ${have.length>1?have.map(v=>`<a class="b${v===ver?' on':''}" href="?v=${v}" data-v="${esc(v)}" title="${esc(vtitle(v))}" aria-description="${esc(vtitle(v))}">${esc(vname(v))}</a>`).join(''):`<b title="${esc(vtitle(ver))}" tabindex="0">${esc(vname(ver))}</b>`}
  <select id="demo" aria-label="Request"></select>
  <span class="ctrl"><button class="b" id="bRe" title="Replay (Home)" aria-label="Replay">⏮</button> <button class="b" id="bPrev" title="Step back (←)" aria-label="Step back">◀</button> <button class="b" id="bPlay" title="Play / pause (space)" aria-label="Play">▶</button> <button class="b" id="bNext" title="Step forward (→)" aria-label="Step forward">▶|</button></span>
  <a class="b" href="arena-final.html#analysis" title="Quality and variety of the arms' pages">Quality and variety →</a>`;
/* the render-failure toggle and the run's step line live in the structure panel (they are about that map) */
{ const d=$('hdepth'); document.querySelector('#hoptb .hdl').append(d); d.hidden=false; }   // item 71: the level buttons live in the Options popover
if(COUNT.problem) $('hoptb').insertAdjacentHTML('afterbegin',`<label class="tg" title="Show the regions to avoid that are render failures"><input type="checkbox" id="rf" checked> render failures</label>`);
{ const f=document.createElement('div'); f.id='demoF'; f.className='pk-foot'; window.__demoFoot=f; }
$('rel').innerHTML=relHTML();
/* the header note's numbers come from the data (item 53); Details at its end (item 57) */
{ const ns=A.styles.length, nw=COUNT.withheld, el=$('pgnote');
  if(el) el.innerHTML=`A folder tree: root rules, task category, kind of page, style. Styles are looks with vote evidence${nw?`; <b data-n="withheld">${nw}</b> of <b data-n="styles">${ns}</b> withheld by a judgement gate`:` (<b data-n="styles">${ns}</b>)`}. Press ▶ on a request or click a node. <details class="pg-more"><summary>Details</summary><div>The left map is the skill's folder tree: root, task category, kind of page (scenario), then the styles a scenario suggests and the regions it names to avoid. Styles are clusters of real pages that won votes beyond their model's strength, each with examples; a judgement gate withholds looks without real evidence or a designer would not recommend. The middle map is the continuous DINO space of real pages. The version switch shows the newly built structure and the version the sealed test judged.</div></details>`; }
/* the task list: runs whose pipeline page is a true render failure are left out unless asked for (rates elsewhere count every run) */
function failedRun(d){ const p=(d.pages||{}).P; if(!p) return false; if(d.failed||p.failed) return true;
  const sc=d.path.find(i=>N[i]&&N[i].level==='scenario'); return landsIn(p,sc).some(i=>PB[i]&&PB[i].kind==='render_failure'); }
const pageBroken=(d,a)=>{ const p=(d.pages||{})[a]; if(!p) return true; if(p.failed) return true; const sc=d.path.find(i=>N[i]&&N[i].level==='scenario'); return landsIn(p,sc).some(i=>PB[i]&&PB[i].kind==='render_failure'); };
const intactPair=d=>!pageBroken(d,'P')&&!!(d.pages||{}).N&&!pageBroken(d,'N');   // both the pipeline's page and the prompt alone's render
function fillDemos(){ const F=DEMOS.filter(failedRun), ok=d=>st.failed||!F.includes(d)||d.id===st.demo, byIntact=ds=>[...ds.filter(intactPair),...ds.filter(d=>!intactPair(d))];
  $('demo').innerHTML=`<option value="">${DEMOS.length?'Pick a real request…':'No stored requests in this version'}</option>${[['Featured: pipeline preferred, looks most different',d=>d.featured],['Other prompts, most different first',d=>!d.featured&&d.set!=='block_3'],['Block 3: pipeline pages only',d=>!d.featured&&d.set==='block_3']].map(([t,f])=>{ const ds=byIntact(DEMOS.filter(d=>f(d)&&ok(d))); return ds.length?`<optgroup label="${esc(t)}${GEN1?' · '+esc(GEN1):''}">${ds.map(d=>F.includes(d)?opt(d).replace('<option ','<option data-meta="failed render" '):opt(d)).join('')}</optgroup>`:''; }).join('')}`;
  $('demo').value=st.demo||''; if(window.PK) PK.refresh();
  $('demoF').innerHTML=F.length?`${st.failed?`${F.length} failed run${F.length>1?'s':''} shown (✕)`:`${F.length} run${F.length>1?'s':''} with a failed pipeline page left out`} · <a href="#" id="demoFt">${st.failed?'hide failed runs':'show failed runs'}</a>`:'';
  const t=$('demoFt'); if(t) t.onclick=e=>{ e.preventDefault(); st.failed=!st.failed; fillDemos(); const n=$('demoFt'); if(n) n.focus(); }; }   // focus stays in the open picker
$('bReset').onclick=()=>reset();
/* back to a fresh load: no selection, run, focus, search or zoom; folders as first opened; map view; render failures shown. The
   version is part of the page's address, so a non-default version goes back by loading the default one. */
function reset(){ try{ sessionStorage.removeItem(PGK); }catch(e){} if(ver!==have[0]){ PGOFF=true; location.href=location.pathname; return; }
  play(false); if(st.demo) EXIT0=performance.now(); st.demo=null; STEPS=[]; st.step=0; st.sel=null; st.failed=false; fillDemos(); st.focus=null; st.hover=null; st.q=''; st.view='map'; st.rf=true; st.wd=false; st.open=OPEN0();
  $('hq').value=''; $('demo').value=''; if($('rf')) $('rf').checked=true; showTip(null,null); $('side').scrollTop=0; $('treeC').scrollTop=0; HZ.fit(); MZ.fit(); render(); }
/* Escape, one level at a time: the selection, then the zoom of either map, then the focus, then the run, then the search, then everything else */
const zoomed=z=>{ const v=z.get(); return v.z!==1||v.x||v.y; };
function escStep(){ if(st.sel&&N[st.sel].level==='leaf'){ select(N[st.sel].parent); return; } if(st.sel) st.sel=null; else if((zoomed(HZ)&&(!st.demo||HZ.gesture()))||zoomed(MZ)){ HZ.fit(); MZ.fit(); return; } else if(st.focus) st.focus=null; else if(st.demo){ setDemo(null); return; } else if(st.q){ st.q=''; $('hq').value=''; } else return reset(); render(); }
const deselect=()=>{ st.sel=null; render(); };
$('demo').onchange=e=>{ setDemo(e.target.value||null); if(st.demo) play(true); };
$('bRe').onclick=()=>{ if(!st.demo) return; play(false); go(0); play(true); };
$('bPrev').onclick=()=>{ play(false); go(st.step-1); };
$('bNext').onclick=()=>{ play(false); go(st.step+1); };
$('bPlay').onclick=()=>play(!st.playing);
if($('rf')) $('rf').onchange=e=>{ st.rf=e.target.checked; render(); };
function setDemo(id){ play(false); if(!id&&st.demo){ EXIT0=performance.now(); HZ.fit(); } HZ.claim(); st.demo=id; STEPS=steps(DM[id]); st.step=0; st.sel=null; st.focus=null; $('demo').value=id||''; stepT0=performance.now(); render(); }
function go(i){ if(!st.demo) return; const j=Math.max(0,Math.min(STEPS.length-1,i)); if(j!==st.step) stepT0=performance.now(); st.step=j; openWalk(); st.sel=null; render(); }
function play(on){ clearInterval(timer); st.playing=!!on&&!!st.demo;
  if(st.playing){ if(st.step>=STEPS.length-1) go(0); timer=setInterval(()=>{ if(st.step>=STEPS.length-1) return play(false); go(st.step+1); },RM.matches?1800:1500); }
  $('bPlay').textContent=st.playing?'❚❚':'▶'; $('bPlay').setAttribute('aria-label',st.playing?'Pause':'Play'); }
addEventListener('keydown',e=>{ if(e.key==='Escape'){ const o=document.querySelector('.hpop[open]'); if(o){ o.open=false; o.querySelector('summary').focus(); return; } }
  if(e.target.closest&&e.target.closest('.split')) return; if(e.target.closest&&e.target.closest('select,input,textarea')){ if(e.key==='Escape'&&e.target.id==='hq'){ e.target.value=''; st.q=''; e.target.blur(); render(); } return; }
  if((e.key==='r'||e.key==='R')&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&(e.target.closest('#hcw')||hcv.matches(':hover'))){ replay(); return; }   // item 76
  if(e.key===' '&&!e.target.closest('button')){ e.preventDefault(); play(!st.playing); }
  else if(e.key==='ArrowRight'){ e.preventDefault(); play(false); go(st.step+1); }
  else if(e.key==='ArrowLeft'){ e.preventDefault(); play(false); go(st.step-1); }
  else if(e.key==='Home'){ e.preventDefault(); if(st.demo){ play(false); go(0); play(true); } }
  else if(e.key==='f'||e.key==='F'){ setFocus(null); }
  else if(e.key==='/'){ e.preventDefault(); $('hq').focus(); }
  else if(e.key==='Escape') escStep(); });

/* ── search: title, file or id; matches light up, their branches open ── */
const hay=memo(id=>{ const n=N[id]; return `${n.title} ${n.file||''} ${id}`.toLowerCase(); });
const matches=()=>{ if(!st.q) return null; const q=st.q.toLowerCase(); return new Set(Object.keys(N).filter(id=>hay(id).includes(q)&&shown(id))); };
$('hq').addEventListener('input',e=>{ st.q=e.target.value.trim(); const m=matches(); if(m&&m.size<=80) for(const id of m) for(const a of anc(id).slice(0,-1)) st.open.add(a); render(); });
$('hq').addEventListener('keydown',e=>{ if(e.key!=='Enter') return; const m=matches(); if(!m||!m.size) return; const order=['scenario','category','style','problem','fallback','avoid','root'];
  const id=[...m].sort((a,b)=>order.indexOf(N[a].level)-order.indexOf(N[b].level))[0]; select(id); setFocus(scOf(id)||catOf(id)); });

/* ── structure, shared by the radial map and the list ── */
const runSt=()=>{ const d=DM[st.demo]; return d?[...(d.suggested||[]),d.chosen].filter(Boolean):[]; };
const shown=id=>{ const n=N[id]; if(n.level==='style') return st.wd||!wd(id)||runSt().includes(id); if(n.level==='problem') return st.rf||PB[id].kind!=='render_failure'; if(n.level==='avoid') return KIDS[id].some(shown); return true; };
const kids=id=>(KIDS[id]||[]).filter(shown);
function select(id){ st.sel=id; if(typeof syncFine==='function') syncFine(); for(const a of anc(id).slice(0,-1)) st.open.add(a); if(KIDS[id]) st.open.add(id); play(false); render(); }
function setFocus(id){ HZ.fit(); st.focus=id&&N[id]&&N[id].level!=='root'?id:null; if(st.focus){ for(const a of anc(st.focus)) st.open.add(a); const sc=N[st.focus].level==='scenario'?st.focus:null; if(sc){ st.open.add(sc); if(N['av:'+sc]) st.open.add('av:'+sc); } if(N[st.focus].level==='category') for(const k of KIDS[st.focus]||[]) st.open.add(k); } render(); }
function depth(lv){ st.open=new Set(Object.keys(N).filter(id=>KIDS[id]&&(lv==='category'?id===ROOT:lv==='scenario'?['root','category'].includes(N[id].level):lv==='style'?!['avoid','style','problem'].includes(N[id].level):true))); st.focus=null; render(); }
$('hdepth').addEventListener('click',e=>{ const b=e.target.closest('[data-d]'); if(b) depth(b.dataset.d); });
$('hview').addEventListener('click',e=>{ const b=e.target.closest('[data-v]'); if(!b) return; st.view=b.dataset.v; render(); });

/* list view: one row per file (and per virtual node), indented */
const metric=n=>{ if(n.level==='style'){ const s=S[n.id]; return `<span class="mt ${sign(s)>0?'pos':'neg'}${tierOf(s)===1?' lean':''}" title="vote effect (resid per vote) · share of the scenario's pages">${sg(s.value.effect)} · ${pct(s.share)}</span>`; }
  if(n.level==='problem'){ const p=PB[n.id]; return `<span class="mt neg" title="vote effect · share of the scenario's pages">${sg(p.value.effect)} · ${pct(p.share)}</span>`; }
  if(n.level==='avoid') return `<span class="mt neg">${kids(n.id).length}</span>`;
  if(n.level==='fallback') return `<span class="mt" title="share of the category's pages">${pct(n.share)} → any</span>`;
  if(n.level==='scenario'){ const c=C[n.id]||{}; return `<span class="mt" title="${c.fallback&&!isKL(n.id)?'too few labelled pages of this kind: the category\'s pages stand in · ':''}real pages · ${CUR?'recommended ':''}styles">${num(c.n_pages)} pp${c.fallback&&!isKL(n.id)?'*':''} · ${(KIDS[n.id]||[]).filter(k=>N[k].level==='style'&&!wd(k)).length}</span>`; }
  if(n.level==='category'){ const m=(KIDS[n.id]||[]).filter(k=>N[k].level==='scenario').length; return `<span class="mt">${m} scenario${m===1?'':'s'}</span>`; }
  return `<span class="mt">${new Set(A.tree.flatMap(x=>nfiles(x))).size} files</span>`; };
const glyphHTML=n=>{ const lk=look0(n.id,99); const d=Math.max(5,Math.min(16,Math.round(lk.r*2))); const tri=lk.shape==='tri';
  return `<i style="width:${d}px;height:${d}px;${tri?`background:${lk.fill||'transparent'};clip-path:polygon(50% 0,100% 100%,0 100%);${lk.fill?'':`box-shadow:inset 0 0 0 1.5px ${lk.stroke}`}`:`background:${lk.fill||'transparent'};border:${lk.stroke?`1.5px ${lk.dash?'dashed':'solid'} ${lk.stroke}`:'0'};border-radius:${lk.shape==='sq'?'2px':'50%'}`}"></i>`; };
function list(){
  const m=matches(), keep=m&&new Set([...m].flatMap(anc)), d=DM[st.demo], w=new Set(walked()), sug=new Set(done('suggest')&&d?d.suggested:[]), cho=d&&walked().includes(d.chosen)?d.chosen:null, now=cur().node;
  const rows=[]; (function add(id,dep){ const n=N[id], k=kids(id), open=st.open.has(id)||!!m;
    if(keep&&!keep.has(id)) return;
    rows.push(`<button class="tr lv-${n.level}${wd(id)?' wd':''}${st.sel===id?' sel':''}${w.has(id)?' on':''}${now===id?' cur':''}${sug.has(id)&&id!==cho?' sug':''}${id===cho?' cho':''}${m&&m.has(id)?' hit':''}" data-id="${esc(id)}" style="padding-left:${6+dep*14}px" aria-expanded="${k.length?open:''}" title="${esc(n.file||'')}">
      <span class="cr">${k.length?(open?'▾':'▸'):''}</span><span class="gl">${glyphHTML(n)}</span><span class="nm">${id===cho?'★ ':''}${esc(n.level==='fallback'?n.title+' → '+N[n.target].file.replace('/context.md','/'):n.title)}${S[id]&&S[id].scope?`<span class="sct">${esc(scopeTag(S[id]))}</span>`:''}</span>${metric(n)}</button>`);
    if(open) for(const c of k) add(c,dep+1); })(ROOT,0);
  $('treeC').innerHTML=rows.join('');
  const c=$('treeC').querySelector('.tr.cho')||$('treeC').querySelector('.tr.cur')||$('treeC').querySelector('.tr.sel'); if(c&&(st.demo||st.sel)){ const tc=$('treeC'), y=c.getBoundingClientRect().top-tc.getBoundingClientRect().top; if(y<30||y>tc.clientHeight-30) tc.scrollTop+=y-tc.clientHeight/2; } }   // the container only, never the window
$('treeC').addEventListener('click',e=>{ const b=e.target.closest('.tr'); if(!b) return; const id=b.dataset.id;
  if(KIDS[id]&&e.target.closest('.cr')){ st.open.has(id)?st.open.delete(id):st.open.add(id); play(false); render(); }
  else if(st.sel===id) deselect(); else select(id); });
$('treeC').addEventListener('mouseover',e=>{ const b=e.target.closest('.tr'); hoverOn(b?b.dataset.id:null); });
$('treeC').addEventListener('mouseleave',()=>hoverOn(null));

/* ── radial map of the hierarchy. Rings, inside out: root, category, scenario (and fallback stubs), styles and problems.
   Every visible leaf gets an equal angle; a focused branch gets 78% of the circle and the rest shares what is left. ── */
const SHORT={marketing_landing:'landing',dashboard_admin:'dashboard',document_text:'document',tool_utility:'tool',greeting_event:'greeting',game_scene:'game',mobile_mockup:'mobile',auth_form:'sign-in form',storefront:'store'};
const short=k=>SHORT[k]||String(k||'').replace(/_/g,' ');
const DEP={root:0,category:1,scenario:2,fallback:2,avoid:2.55,style:3,problem:3,leaf:3.75,example:3.5};
/* the levels a request reads (item 66): from the atlas meta (dual/site/atlas_examples.py derives them from the skill tree's folders); a node
   type maps to its level; problems sit at the kind of page, whose file names them. Without meta (r3) the fixed rings stand. */
const LEVELS=(A.meta&&A.meta.levels)||null;
const LVKEY={root:'root',category:'category',scenario:'kind',fallback:'kind',avoid:'kind',problem:'kind',style:'style',example:'example',leaf:'example'};
const LCOL=(()=>{ const ks=LEVELS?LEVELS.map(l=>l.key):['root','category','kind','style','example']; const c={}; ks.forEach((k,i)=>c[k]=i); return c; })();
const colOf=id=>{ const lv=N[id].level; if(lv==='avoid') return LCOL.kind+.5; if(lv==='problem') return LCOL.kind+1; return LCOL[LVKEY[lv]]??0; };
const NCOL=Math.max(...Object.values(LCOL))+1;
const depthWords=()=>LEVELS?`${LEVELS.length} levels: ${LEVELS.map(l=>l.key==='kind'?'kind of page':l.key==='example'?'examples':l.key).join(' › ')}`:'5 levels: root › category › kind of page › style › examples';   // r3's meta has no level list; its tree has the same five
const hcv=$('hmap'), hg=hcv.getContext('2d'); let HW=1,HH=1, HP={}, HT=null, HN=[], LIT=[], LBL=[], RCAPS=[], LNK=[], BADGE=[], HR=0, NS=1;
/* pan and zoom (panzoom.js): the drawing is fitted to the panel (radius ~ 84 % of the smaller half-dimension), the view zooms and pans
   on top of it; on a resize the pan scales with the fitted radius, so the user's zoom stays relative to the fitted view */
/* replay (item 76): the opening animation again, then the selected request's path ring by ring; selection, zoom and focus unchanged */
function replay(){ for(const k of Object.keys(HP)) delete HP[k]; LOAD0=performance.now();
  if(RM.matches){ hcv.style.transition='none'; hcv.style.opacity='0'; requestAnimationFrame(()=>{ hcv.style.transition='opacity .35s'; hcv.style.opacity='1'; }); }
  if(st.demo&&!RM.matches){ const end=st.step; clearInterval(timer); st.playing=false; st.step=0; openWalk(); render(); let i=0; setTimeout(()=>{ clearInterval(timer); timer=setInterval(()=>{ if(i>=end){ clearInterval(timer); return; } i++; st.step=i; stepT0=performance.now(); openWalk(); render(); },700); },1200); }
  else render(); hkick(); }
const HZ=PanZoom.attach(hcv,{min:.6,max:6,onChange:(v,live)=>live?hblit(v):hdraw(),isNode:e=>!!hhit(e)});
{ const bt=hcv.parentNode.querySelector('.pz-btns'); if(bt){ bt.insertAdjacentHTML('afterbegin','<button type="button" id="hreplay" aria-label="Replay the opening animation (R)">↻</button>'); $('hreplay').onclick=e=>{ e.stopPropagation(); replay(); }; } }
/* during a gesture only one transform of the last full drawing is drawn (item 36); the full drawing (layout, labels, glows) once it settles */
const HSNAP=document.createElement('canvas'), CNT={hdraw:0,hblit:0,draw:0,mblit:0}; let HV0=null;
function hblit(v){ if(!HV0||!HSNAP.width) return hdraw(); const d=hcv.width/HW, k=v.z/HV0.z, cx=HW/2, cy=HH/2;
  hg.setTransform(1,0,0,1,0,0); hg.clearRect(0,0,hcv.width,hcv.height); hg.setTransform(d*k,0,0,d*k,d*(cx-(cx+HV0.x)*k+v.x),d*(cy-(cy+HV0.y)*k+v.y)); hg.drawImage(HSNAP,0,0,HW,HH); hg.setTransform(d,0,0,d,0,0); CNT.hblit++; }
const runFocus=()=>{ if(!st.demo) return null; const w=walked(); return w.slice().reverse().find(i=>N[i].level==='scenario'||N[i].level==='category')||null; };
const gfocus=()=>st.focus||runFocus();
const maxScN=Math.max(1,...A.conditions.map(c=>c.n_pages||0)), catN=memo(id=>(KIDS[id]||[]).reduce((t,s)=>t+((C[s]||{}).n_pages||0),0)), maxCatN=Math.max(1,...Object.keys(N).filter(i=>N[i].level==='category').map(catN));
/* a packed radial tree (items 45, 73, 78): every drawn leaf gets the same small angle (examples and finer clusters .6, problems .7,
   withheld styles .35), a node's sector is the sum of its leaves', so siblings sit at a constant pitch in dense arcs inside their
   parent's sector; 1.5 degrees between categories. Rings from the number of levels L: r_i = .90 (1 - (1 - i/L)^1.25), i = 1..L.
   A focus widens its sector by a fisheye over the whole circle (at most 3 times, neighbours compressed, order and places kept), so a
   branch never moves to the other side of the disc. */
const ghost=id=>N[id].level==='style'&&wd(id)&&!st.wd&&!runSt().includes(id);   // withheld styles: faint small dots in their sector (item 75)
const kidsR=id=>(KIDS[id]||[]).filter(k=>shown(k)||ghost(k));
const RI={root:0,category:1,scenario:2,fallback:2,avoid:2.5,style:3,problem:3,example:4,leaf:5}, NL=LEVELS?LEVELS.length:5;
const ringR=i=>i?.9*(1-Math.pow(Math.max(0,1-i/NL),1.25)):0;
function layout(){
  const vis=[], leaves=[], T={}, TAU=2*Math.PI, GAP=TAU/240;
  const ks=id=>(st.open.has(id)||N[id].level==='style')&&!ghost(id)?kidsR(id):[];
  (function walk(id){ vis.push(id); const k=ks(id); if(!k.length) leaves.push(id); else k.forEach(walk); })(ROOT);
  let fo=gfocus(); while(fo&&!vis.includes(fo)) fo=N[fo].parent; if(fo===ROOT) fo=null;   // a focus inside a folded branch falls back to the branch
  const LWT={example:.6,leaf:.6,problem:.7};
  const wOf=memo0(id=>{ const k=ks(id); return k.length?k.reduce((t,c)=>t+wOf(c),0):ghost(id)?.35:LWT[N[id].level]||1; });
  const cats=ks(ROOT), unit=(TAU-GAP*cats.length)/Math.max(1e-9,cats.reduce((t,c)=>t+wOf(c),0));
  function place(id,a0){ T[id]={a0,a1:a0+wOf(id)*unit}; let a=a0; for(const c of ks(id)){ place(c,a); a+=wOf(c)*unit; } }
  T[ROOT]={a0:0,a1:TAU}; let a=GAP/2; for(const c of cats){ place(c,a); a+=wOf(c)*unit+GAP; }
  let warp=x=>x;
  if(fo&&T[fo]){ const w=T[fo].a1-T[fo].a0, c=(T[fo].a0+T[fo].a1)/2, w2=Math.min(3*w,Math.max(w,TAU/2)), m=(TAU-w2)/(TAU-w);
    warp=x=>{ const d=((x-c)%TAU+TAU*1.5)%TAU-Math.PI; return c+(Math.abs(d)<=w/2?d*w2/w:Math.sign(d)*(w2/2+(Math.abs(d)-w/2)*m)); }; }
  for(const id of vis){ const t=T[id]; if(id===ROOT){ Object.assign(t,{span:TAU,a:-Math.PI/2,r:0,y:0,col:0}); continue; }
    const b0=warp(t.a0); let b1=warp(t.a1); while(b1<b0-1e-9) b1+=TAU;
    Object.assign(t,{a0:b0,a1:b1,span:b1-b0,y:((b0+b1)/2)/TAU,a:-Math.PI/2+(b0+b1)/2,r:ringR(RI[N[id].level]),col:colOf(id)}); }
  return {vis,leaves,T,fo}; }
const lvCount=k=>{ const l=(LEVELS||[]).find(x=>x.key===k); return l?(k==='style'&&CUR?COUNT.style-COUNT.withheld:l.count):null; };
const rcap=(d,vis)=>{ const n=lv=>vis.filter(i=>N[i].level===lv).length, tot=((LEVELS||[]).find(x=>x.key==='example')||{}).count;
  return d===1?[`categories ${n('category')}`]:d===2?[`kinds ${n('scenario')}`]:d===2.5?[`avoid ${vis.filter(i=>N[i].level==='avoid').reduce((t,i)=>t+kids(i).length,0)}`]:d===3?[`styles ${vis.filter(i=>N[i].level==='style'&&!wd(i)).length}`,...(COUNT.withheld?[`withheld ${COUNT.withheld}`]:[])]
    :d===4?[`examples ${n('example')}${tot?'/'+tot:''}`]:d===5?[`clusters ${n('leaf')}`]:[]; };   // short: the key sits in a corner outside the disc
function memo0(f){ const m=new Map(); const g=x=>m.has(x)?m.get(x):(m.set(x,f(x)),m.get(x)); return g; }
function hsize(){ const r=hcv.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2), R0=HR; HW=r.width; HH=r.height; hcv.width=HW*d; hcv.height=HH*d; hg.setTransform(d,0,0,d,0,0);
  const v=HZ.get(), R1=Math.min(HW,HH)/2*.98; if(R0&&R1&&(v.x||v.y)){ const f=R1/R0, g0=HZ.gesture(); HZ.set({z:v.z,x:v.x*f,y:v.y*f}); if(!g0) HZ.claim(); } else hdraw(); }
let hraf=0; const hkick=()=>{ if(!hraf) hraf=requestAnimationFrame(hframe); };
let EXIT0=0;
function hframe(){ hraf=0; const still=hstep(), fitting=runFit(); hdraw(); if(!still||fitting||(!RM.matches&&performance.now()-stepT0<1300&&st.demo)||performance.now()-EXIT0<700) hkick(); }
/* during a run the view eases to fit the tree grown so far (zoom 1 to 3) until the user takes the view (item 79) */
function runFit(){ if(!st.demo||!HT||HZ.gesture()||st.view!=='map') return false; const L=litPairs(), R=HR||1; let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const i of [ROOT,...L.nodes,...L.cand,...(st.sel?[st.sel]:[])]){ const t=HT.T[i]; if(!t) continue; const x=Math.cos(t.a)*t.r*R, y=Math.sin(t.a)*t.r*R; x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
  if(x0>x1) return false; const z=Math.max(1,Math.min(3,(HW-90)/Math.max(60,x1-x0),(HH-90)/Math.max(60,y1-y0))), tx=-(x0+x1)/2*z, ty=-(y0+y1)/2*z, v=HZ.get();
  const ok=Math.abs(v.z-z)<.005&&Math.abs(v.x-tx)<.5&&Math.abs(v.y-ty)<.5; if(ok) return false;
  HZ.set(RM.matches?{z,x:tx,y:ty}:{z:v.z+(z-v.z)*.15,x:v.x+(tx-v.x)*.15,y:v.y+(ty-v.y)*.15}); HZ.claim(); return !RM.matches; }
let LOAD0=performance.now();   // on load the rings grow outward from the root: a node appears once the growth front passes its parent's ring
function hstep(){ if(!HT) return true; let still=true; const G=RM.matches?9:(performance.now()-LOAD0)/1100;
  for(const id of HT.vis){ const t=HT.T[id]; let p=HP[id]; if(!p){ const par=HT.T[N[id].parent]; if(par&&G<par.r){ still=false; continue; } const q=HP[N[id].parent]; p=HP[id]=q?{a:q.a,r:q.r}:{a:t.a,r:t.r}; }
    if(RM.matches){ p.a=t.a; p.r=t.r; continue; } const da=((t.a-p.a)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI;   // the short way round: nothing swings across the disc
    p.a+=da*.2; p.r+=(t.r-p.r)*.2; if(Math.abs(da)>.002||Math.abs(t.r-p.r)>.002) still=false; else { p.a=t.a; p.r=t.r; } }
  return still; }
function look(id,spanPx){ const o=look0(id,spanPx); return {...o,r:o.r*NS*1.15}; }
function look0(id,spanPx){ const n=N[id], lv=n.level;
  if(lv==='leaf'){ const r=LF[id]; return {shape:'c',r:2.6,fill:rgba(r.value.effect>0?POS:NEG,r.tier==='clear'?1:.6)}; }
  if(lv==='example'){ const p=n.ex&&n.ex.place; return {shape:'sq',r:2.6,fill:p?placeCol(p):rgba(ICE,.7)}; }
  if(lv==='root') return {shape:'sq',r:6,fill:css('--ice')};
  if(lv==='category') return {shape:'c',r:3.5+6*Math.sqrt(catN(id)/maxCatN),fill:rgba(isKL(id)?KL:ICE,.18),stroke:rgba(isKL(id)?KL:ICE,1)};
  if(lv==='scenario'){ const r=2.5+5*Math.sqrt(((C[id]||{}).n_pages||0)/maxScN), c=isKL(id)?KL:ICE; return noRec(id)?{shape:'c',r,fill:rgba(c,.08),stroke:rgba(c,.9)}:{shape:'c',r,fill:rgba(c,.9)}; }   // hollow: no style recommended here
  if(lv==='fallback') return {shape:'c',r:2.6,stroke:rgba(KL,.9),dash:1};
  const cap=Math.max(1.6,spanPx*.45);
  if(lv==='avoid') return {shape:'tri',r:Math.min(cap*1.3,3+1.1*Math.sqrt(kids(id).length)),fill:rgba(NEG,.95)};
  if(lv==='problem'){ const p=PB[id], t=tierOf(p)===2?1:.6; return {shape:'tri',r:Math.min(cap*1.2,2.2+12*Math.sqrt(p.share||0)),fill:p.kind==='render_failure'?null:rgba(NEG,t),stroke:rgba(NEG,t)}; }
  if(ghost(id)) return {shape:'c',r:1.3,fill:rgba(NEU,.45),ghost:1};
  if(wd(id)) return {shape:'c',r:Math.min(cap,1.6+10*Math.sqrt(S[id].share||0)),fill:rgba(NEU,.35),stroke:rgba(NEU,.7),dash:1};   // withheld, shown on request
  const s=S[id], c=sign(s)>0?POS:NEG, v=Math.max(.35,Math.min(1,Math.abs(s.value.effect)/.12)), mix=NEU.map((x,i)=>Math.round(x+(c[i]-x)*v)), t=tierOf(s);
  return {shape:'c',r:Math.min(cap,1.6+10*Math.sqrt(s.share||0)),fill:rgba(mix,s.tier==='clear'?1:s.tier==='leaning'?.8:.5),stroke:s.tier==='clear'?rgba(c,1):s.tier==='leaning'?rgba(c,.9):null,dash:s.tier==='leaning'}; }
function shapePath(c,s,x,y,r){ c.beginPath(); if(s==='sq') c.rect(x-r,y-r,2*r,2*r); else if(s==='tri'){ c.moveTo(x,y-r*1.15); c.lineTo(x+r,y+r*.75); c.lineTo(x-r,y+r*.75); c.closePath(); } else c.arc(x,y,r,0,7); }
function litPairs(){ const d=DM[st.demo]; if(!d) return {pairs:[],nodes:new Set(),cand:new Set(),off:new Set(),exThin:new Set(),exDash:new Set(),now:null};
  const w=walked(), pairs=[], sc=runSc(), now=cur();
  const route=w.filter(i=>N[i].level!=='style'&&N[i].level!=='example'); for(let i=1;i<route.length;i++) pairs.push([route[i-1],route[i],'path']);
  if(sc&&done('suggest')) for(const s of d.suggested) if(N[s]) pairs.push([sc,s,s===d.chosen&&w.includes(s)?'chosen':'sug']);
  if(sc&&done('warn')) for(const p of kids('av:'+sc)) pairs.push(['av:'+sc,p,'warn']), pairs.push([sc,'av:'+sc,'warn']);
  const ek=exOf(d.chosen); if(ek.length&&w.includes(ek[0])) pairs.push([d.chosen,ek[0],'exs']);   // item 85: the chosen example strong; the style's other examples thin
  const nodes=new Set([...w.filter(i=>N[i].level!=='style'),...(w.includes(d.chosen)?[d.chosen]:[]),...(ek.length&&w.includes(ek[0])?[ek[0]]:[])]);   // item 77: the files read, one path
  const cand=new Set(pairs.filter(p=>p[2]==='sug'||p[2]==='warn').map(p=>p[1]).filter(i=>!nodes.has(i)));
  /* item 85: the outer two rings stay a tree during a run: every style the routed kind offers is linked (candidates solid, the rest
     dashed and faint), the chosen style's other examples thin, the candidates' examples dashed */
  const offered=done('suggest')&&sc?kidsR(sc).filter(i=>N[i].level==='style'):[], off=new Set(offered.filter(i=>!cand.has(i)&&!nodes.has(i)&&i!==d.chosen));
  const exThin=new Set(w.includes(d.chosen)?ek.filter(e=>!nodes.has(e)):[]), exDash=new Set(done('suggest')?[...cand].filter(i=>N[i].level==='style'&&i!==d.chosen).flatMap(exOf):[]);
  return {pairs,nodes,cand,off,exThin,exDash,now:now.t==='walk'?now.node:now.t==='suggest'||now.t==='warn'?sc:null,nowPair:now.t==='walk'&&route.length>1&&now.node===route[route.length-1]?pairs[route.length-2]:null}; }
function hdraw(){
  if(!HT) return; CNT.hdraw++; const g=hg, half=Math.min(HW,HH)/2, m=matches(), rel=relSet(), v=HZ.get();
  const R=half*(HT.fo?.94:1.02); HR=R;   // outer ring at .88 R: the drawing fills ~86 % of the smaller side
  if(R<8){ g.clearRect(0,0,HW,HH); HN=[]; return; }   // a canvas too small to draw on (mid-layout)
  const cx=HW/2+v.x, cy=HH/2+v.y, ZR=R*v.z, SC=Math.max(.85,Math.min(1.7,R/220)); NS=SC*Math.min(2,Math.sqrt(v.z));
  const FS=b=>Math.max(11,Math.min(15,Math.round(b*SC*2)/2));   // label px: with the panel, never with the zoom; 11 to 15
  const LW=w=>w*Math.max(1,Math.min(1.6,SC));
  const TREE=st.view==='tree', NC=Math.max(2,...HT.vis.map(i=>Math.floor(HT.T[i].col)+1)), PADX=24, PADY=22, CW=(HW-2*PADX-150)/Math.max(1,NC-1);   // columns of the levels drawn; 150 px at the right for the last column's labels   // tree: one column per level, the last column's labels in the 120 px at the right
  const P=TREE?(id=>{ const t=HT.T[id]; return [HW/2+(PADX+t.col*CW-HW/2)*v.z+v.x,HH/2+(PADY+t.y*(HH-2*PADY)-HH/2)*v.z+v.y]; })
    :(id=>{ const p=HP[id]||HT.T[id]; return [cx+Math.cos(p.a)*p.r*ZR,cy+Math.sin(p.a)*p.r*ZR]; });
  const spanPx=id=>HT.T[id].span*(HT.T[id].r||0)*ZR;
  g.clearRect(0,0,HW,HH); HN=[]; LBL=[]; RCAPS=[]; LNK=[]; BADGE=[];
  const vis=HT.vis.filter(id=>HP[id]);
  const L=litPairs(), BR=st.demo?L.nodes:st.sel?rel:null, CD=st.demo?L.cand:st.sel?new Set(kids(st.sel)):null;
  const GR=st.demo?new Set([ROOT,...L.nodes,...L.cand,...L.off,...L.exThin,...L.exDash]):null, FA=EXIT0&&!st.demo?Math.min(1,.06+(performance.now()-EXIT0)/600):1;   // item 79: during a run only the request's tree grows
  const dim=id=>(m?(m.has(id)?1:.18):1)*(GR?(GR.has(id)?(L.nodes.has(id)?1:L.cand.has(id)?.7:.45):.06):FA*(!BR?1:BR.has(id)?1:CD.has(id)?.7:.28));   // item 77: bright path, candidates, the rest dimmed
  /* guide rings */
  g.lineWidth=1; g.strokeStyle=css('--line-soft');
  if(TREE){ g.font=`600 ${FS(11)}px "JetBrains Mono",ui-monospace,monospace`; g.textAlign='left'; const used=new Set(vis.map(i=>Math.floor(HT.T[i].col)));   // level columns, named at the top
    (LEVELS||[]).forEach((l,i)=>{ if(!used.has(i)) return; const x=HW/2+(PADX+i*CW-HW/2)*v.z+v.x; g.beginPath(); g.moveTo(x,PADY); g.lineTo(x,HH-PADY); g.stroke(); g.globalAlpha=.8; g.fillStyle=css('--faint'); g.fillText(CW>90?`${i+1} ${l.key}`:String(i+1),x+3,12); g.globalAlpha=1; }); }
  else { const RD={}; for(const i of vis) if(HT.T[i].r) RD[HT.T[i].r]=Math.max(RD[HT.T[i].r]||0,RI[N[i].level]);
    for(const r of Object.keys(RD)){ g.beginPath(); g.arc(cx,cy,r*ZR,0,7); g.stroke(); }
    HT.RD=RD; }
  /* tree links: radial elbows */
  const link=(a,b,prog=1)=>{ if(TREE){ const A0=P(a), B0=P(b), mx=(A0[0]+B0[0])/2; g.beginPath(); g.moveTo(...A0);   // tree: a horizontal S from parent to child
      if(prog>=1){ g.bezierCurveTo(mx,A0[1],mx,B0[1],...B0); return; } for(let i=1;i<=24*prog;i++){ const t=i/24,u=1-t; g.lineTo(u*u*u*A0[0]+3*u*u*t*mx+3*u*t*t*mx+t*t*t*B0[0],u*u*u*A0[1]+3*u*u*t*A0[1]+3*u*t*t*B0[1]+t*t*t*B0[1]); } return; }
    const pa=HP[a], pb=HP[b]; if(!pa||!pb) return; const rm=(pa.r+pb.r)/2*ZR, A0=P(a), B0=P(b), c1=[cx+Math.cos(pa.a)*rm,cy+Math.sin(pa.a)*rm], c2=[cx+Math.cos(pb.a)*rm,cy+Math.sin(pb.a)*rm];
    g.beginPath(); g.moveTo(...A0); if(prog>=1){ g.bezierCurveTo(...c1,...c2,...B0); return; }
    for(let i=1;i<=24*prog;i++){ const t=i/24, u=1-t; g.lineTo(u*u*u*A0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*B0[0],u*u*u*A0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*B0[1]); } };
  const bundle=(a,b,prog=1)=>{ const pa=HP[a], pb=HP[b]; if(!pa||!pb) return; const r0=Math.max(pa.r,pb.r)*ZR, da=((pb.a-pa.a)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI;   // along the ring, never across the centre (item 78)
    const pts=[P(a)]; for(let i=0;i<=24;i++){ const t=pa.a+da*i/24; pts.push([cx+Math.cos(t)*r0,cy+Math.sin(t)*r0]); } pts.push(P(b));
    g.beginPath(); g.moveTo(...pts[0]); const n=Math.max(1,Math.round((pts.length-1)*prog)); for(let i=1;i<=n;i++) g.lineTo(...pts[i]); };
  for(const id of vis){ const n=N[id]; if(!n.parent||!HP[n.parent]) continue; const lv=n.level, on=rel.has(id)&&rel.has(n.parent);
    const rc=st.demo&&(L.off.has(id)||L.exDash.has(id))?'dashed':st.demo&&L.exThin.has(id)?'solid':null;   // item 85: the run's outer links, quiet
    if(rc){ g.globalAlpha=rc==='dashed'?.34:.5; g.strokeStyle=rgba(lv==='style'?POS:ICE,1); g.lineWidth=LW(1); g.setLineDash(rc==='dashed'?[3,3]:[]); link(n.parent,id); g.stroke(); g.setLineDash([]); LNK.push({a:n.parent,b:id,cls:rc}); continue; }
    g.globalAlpha=dim(id)*(on?.9:.55)*(ghost(id)?.4:lv==='example'||lv==='leaf'?.5:1); g.strokeStyle=lv==='style'?rgba(POS,on?.7:.3):lv==='problem'||lv==='avoid'?rgba(NEG,on?.75:.32):lv==='fallback'?rgba(KL,.35):rgba(ICE,on?.6:.28); g.lineWidth=LW(on?1.6:1)*(n.parent===ROOT?1.7:N[n.parent].level==='category'?1.3:1); g.setLineDash(lv==='fallback'||ghost(id)?[2,3]:[]); link(n.parent,id); g.stroke(); }   // weak relations dashed (item 85): fallback routes, withheld styles
  g.setLineDash([]);
  /* fallback routes: from each stub to the kind-level scenario it reads (or its nearest visible ancestor) */
  const visSet=new Set(vis), visAnc=id=>{ while(id&&!visSet.has(id)) id=N[id].parent; return id; };
  for(const id of vis) if(N[id].level==='fallback'){ const t=visAnc(N[id].target); if(!t) continue; const on=rel.has(id)||rel.has(N[id].target);
    g.globalAlpha=dim(id)*(on?.85:.16); g.strokeStyle=rgba(KL,1); g.lineWidth=LW(on?1.4:1); g.setLineDash([4,3]); bundle(id,t); g.stroke(); }
  g.setLineDash([]);
  /* the run: links lit in reading order; the newest one grows */
  LIT=L.pairs.filter(p=>p[2]==='path').map(p=>p[1]); const prog=RM.matches?1:Math.min(1,(performance.now()-stepT0)/650);
  g.globalCompositeOperation='lighter';
  const flash=t=>cur().t===t&&!RM.matches?Math.max(0,1-(performance.now()-stepT0)/1200):0;   // candidates brighten at their own step, then fall back
  for(const pr of L.pairs){ const [a,b,k]=pr; if(!HP[a]||!HP[b]) continue; LNK.push({a,b,cls:k==='sug'||k==='warn'?'solid':'path'}); const c=k==='warn'?NEG:k==='chosen'||k==='exs'?[255,201,138]:k==='sug'?POS:ICE, grow=pr===L.nowPair||(k==='exs'&&cur().ex)?prog:1;
    if(k==='sug'||k==='warn'){ g.globalCompositeOperation='source-over'; g.globalAlpha=.3+.6*flash(k==='sug'?'suggest':'warn'); g.strokeStyle=rgba(c,1); g.lineWidth=LW(1); (N[b].parent===a?link:bundle)(a,b,1); g.stroke(); g.globalCompositeOperation='lighter'; continue; }
    for(const [lw,al] of [[6,.12],[2.2,.95]]){ g.globalAlpha=al; g.strokeStyle=rgba(c,1); g.lineWidth=LW(lw); (N[b].parent===a?link:bundle)(a,b,grow); g.stroke(); } }
  g.globalCompositeOperation='source-over';
  /* nodes */
  for(const id of vis){ const [x,y]=P(id), lk=look(id,spanPx(id)), al=dim(id); g.globalAlpha=al;
    if(x<-20||y<-20||x>HW+20||y>HH+20) continue;
    if((L.nodes.has(id)&&id!==ROOT)||id===st.sel||id===st.hover||(m&&m.has(id))){ const gr=g.createRadialGradient(x,y,0,x,y,lk.r+9); const c=N[id].level==='problem'||N[id].level==='avoid'?NEG:N[id].level==='style'?(id===(DM[st.demo]||{}).chosen?[255,201,138]:POS):ICE;
      gr.addColorStop(0,rgba(c,.5)); gr.addColorStop(1,rgba(c,0)); g.globalCompositeOperation='lighter'; g.fillStyle=gr; g.beginPath(); g.arc(x,y,lk.r+9,0,7); g.fill(); g.globalCompositeOperation='source-over'; }
    shapePath(g,lk.shape,x,y,lk.r); if(lk.fill){ g.fillStyle=lk.fill; g.fill(); } if(lk.stroke){ g.strokeStyle=lk.stroke; g.lineWidth=LW(1.3); g.setLineDash(lk.dash?[2.5,2]:[]); g.stroke(); g.setLineDash([]); }
    if(id===st.sel||id===st.hover){ g.strokeStyle=css('--starlight'); g.lineWidth=LW(1.5); shapePath(g,lk.shape==='tri'?'tri':'c',x,y,lk.r+3.5); g.stroke(); }
    else if(CD&&CD.has(id)){ g.globalAlpha=.55+.45*flash('suggest'); g.strokeStyle=css('--starlight'); g.lineWidth=1; g.beginPath(); g.arc(x,y,lk.r+2.5,0,7); g.stroke(); g.globalAlpha=al; }   // a candidate: a thin ring, no glow
    const d=DM[st.demo]; if(d&&id===d.chosen&&walked().includes(id)){ g.fillStyle=css('--ember'); g.font=`700 ${FS(15)}px sans-serif`; g.textAlign='center'; g.fillText('★',x,y-lk.r-3); }
    HN.push({id,x,y,r:Math.max(lk.ghost?2:5,lk.r+2),r0:lk.r,g:lk.ghost}); }
  g.globalAlpha=1;
  /* labels: whatever fits; the selection, hover and the run's current node always. Sizes 11 to 15 px whatever the zoom; more appear as
     zooming makes room. Category labels go outward from their node, with a collision pass against each other and the root's label. */
  const forced=new Set([st.sel,st.hover,L.now,HT.fo,...walked().filter(i=>N[i].level!=='root'),...(m&&m.size<=12?m:[])].filter(Boolean));
  const plate=(t,x,y,al,colr,font,mid,fs)=>{ g.font=font; g.textAlign='left'; const w=g.measureText(t).width; if(mid) x-=w/2; g.globalAlpha=.82*al; g.fillStyle=css('--void'); g.beginPath(); g.roundRect(x-3,y-fs,w+6,fs+4,3); g.fill(); g.globalAlpha=al; g.fillStyle=colr; g.fillText(t,x,y); return [x-3,y-fs,x+w+3,y+4]; };
  const fit=(t,max)=>{ if(g.measureText(t).width<=max) return t; while(t.length>2&&g.measureText(t+'…').width>max) t=t.slice(0,-1); return t+'…'; };
  const ray=(x,y,a)=>{ const ca=Math.cos(a), sa=Math.sin(a); return Math.max(0,Math.min(ca>1e-6?(HW-6-x)/ca:ca<-1e-6?(6-x)/ca:1e9,sa>1e-6?(HH-6-y)/sa:sa<-1e-6?(6-y)/sa:1e9)); };   // room to the canvas edge along the radius
  const hit=(b,B)=>B.some(c=>b[0]<c[2]&&b[2]>c[0]&&b[1]<c[3]&&b[3]>c[1]);
  g.textBaseline='alphabetic'; const boxes=[];
  /* the ring key (items 72, 74, 75): beside the disc, in two halves in the panel's corners, small quiet type, never over a node and
     never inside the disc; it moves to another corner or is left out; none under 380 px of panel width */
  if(!TREE&&HT.RD&&HW>=380){ const fs=9.5, font=`500 ${fs}px "JetBrains Mono",ui-monospace,monospace`, rows=Object.entries(HT.RD).sort((a,b)=>a[0]-b[0]).flatMap(([r,d])=>rcap(d,vis).map(t=>({r:+r,t})));
    g.font=font; const lh=fs+3.5, h1=Math.ceil(rows.length/2), parts=[rows.slice(0,h1),rows.slice(h1)].filter(q=>q.length), RO=Math.max(...vis.map(i=>HT.T[i].r))*ZR+4;
    const outside=b=>{ const dx=Math.max(b[0]-cx,0,cx-b[2]), dy=Math.max(b[1]-cy,0,cy-b[3]); return Math.hypot(dx,dy)>RO; };
    const clear=b=>!HN.some(h=>h.x+h.r>b[0]&&h.x-h.r<b[2]&&h.y+h.r>b[1]&&h.y-h.r<b[3])&&!hit(b,boxes)&&outside(b);
    const put=[]; for(const [pi,q] of parts.entries()){ const kw=Math.max(...q.map(x=>g.measureText(x.t).width))+12, kh=q.length*lh+6;
      const C=[[4,4],[HW-kw-4,4],[4,HH-kh-4],[HW-kw-4,HH-kh-44]], order=pi?[1,3,0,2]:[0,2,1,3];
      const at=order.map(k=>[C[k][0],C[k][1],C[k][0]+kw,C[k][1]+kh]).find(b=>clear(b)&&!put.some(o=>hit(b,[o.b]))); if(!at){ put.length=0; break; } put.push({q,b:at}); }
    if(put.length===parts.length) for(const {q,b} of put){ g.globalAlpha=.75; g.fillStyle=css('--void'); g.beginPath(); g.roundRect(b[0],b[1],b[2]-b[0],b[3]-b[1],5); g.fill(); g.globalAlpha=.85;
      q.forEach((x,k)=>{ g.textAlign='left'; g.fillStyle=css('--faint'); g.fillText(x.t,b[0]+6,b[1]+4+(k+1)*lh-3); RCAPS.push({r:x.r,t:x.t,box:b}); }); g.globalAlpha=1; boxes.push(b); } }
  const halo=(t,x,y,al,colr,font)=>{ g.font=font; g.textAlign='left'; const w=g.measureText(t).width; g.globalAlpha=.85*al; g.lineJoin='round'; g.lineWidth=3; g.strokeStyle=css('--void'); g.strokeText(t,x,y); g.globalAlpha=al; g.fillStyle=colr; g.fillText(t,x,y); return w; };   // a text halo, no box (item 74)
  { const [x,y]=P(ROOT), fs=FS(10.5), font=`500 ${fs}px "JetBrains Mono",ui-monospace,monospace`; if(x>-50&&x<HW+50&&y>-50&&y<HH+50){ g.font=font; const w=g.measureText('root').width, lx=TREE?x-6:x-w/2, ly=y+10+fs; halo('root',lx,ly,dim(ROOT),css('--dim'),font); const b=[lx-2,ly-fs,lx+w+2,ly+3]; boxes.push(b); LBL.push({id:ROOT,box:b,px:fs,level:'root',txt:'root'}); } }
  /* the run's reading order as numbered steps on its path (items 66, 86): each badge on the free side of its node, away from the next node
     on the path, clear of the other badges, the path's nodes and the labels placed so far; the labels placed after it avoid it */
  if(st.demo){ const w=walked(), PN=new Set(w);
    w.forEach((id,i)=>{ if(!HN.some(h=>h.id===id)) return; const [x,y]=P(id), lk=look(id,spanPx(id)), nx=w[i+1]&&HN.some(h=>h.id===w[i+1])?P(w[i+1]):w[i-1]&&HN.some(h=>h.id===w[i-1])?P(w[i-1]):[x+1,y+1];
      const a0=Math.atan2(y-nx[1],x-nx[0]), d=lk.r+9, cand=[0,-.6,.6,-1.2,1.2,-1.9,1.9,Math.PI].map(o=>[x+Math.cos(a0+o)*d,y+Math.sin(a0+o)*d]);
      const free=([bx,by])=>{ const b=[bx-8,by-8,bx+8,by+8]; return !hit(b,boxes)&&!HN.some(h=>PN.has(h.id)&&(h.x-bx)**2+(h.y-by)**2<(h.r+7)**2)&&bx>8&&by>8&&bx<HW-8&&by<HH-8; };
      const [bx,by]=cand.find(free)||cand[0]; boxes.push([bx-8,by-8,bx+8,by+8]); BADGE.push({n:i+1,id,x:bx,y:by,r:7}); }); }
  const cats=vis.filter(i=>N[i].level==='category').sort((a,b)=>(forced.has(b)-forced.has(a))||catN(b)-catN(a));
  for(const id of cats){ if(GR&&!GR.has(id)) continue; const n=N[id], t=HT.T[id], [x,y]=P(id), lk=look(id,spanPx(id)), al=dim(id), fs=FS(11.5), font=`500 ${fs}px "Space Grotesk",-apple-system,sans-serif`, ca=TREE?1:Math.cos(t.a), sa=TREE?0:Math.sin(t.a);
    g.font=font; let placed=null;
    for(const txt of [n.title+(isKL(id)?' (kind level)':''),n.title,n.title.length>6?n.title.slice(0,5)+'.':null].filter(Boolean)){ const w=g.measureText(txt).width;
      for(const dd of [6,16,28,42]){ const lx=x+ca*(lk.r+dd)-(ca<-.3?w:ca<.3?w/2:0), ly=y+sa*(lk.r+dd)+(sa>.3?fs:sa<-.3?-2:fs/3), b=[lx-3,ly-fs,lx+w+3,ly+4];
        if(b[0]<2||b[2]>HW-2||b[1]<2||b[3]>HH-2) continue; if(!hit(b,boxes)){ placed=[txt,lx,ly,b]; break; } }
      if(placed) break; }
    if(!placed) continue; boxes.push(placed[3]); LBL.push({id,box:placed[3],px:fs,level:'category',txt:placed[0]});
    halo(placed[0],placed[1],placed[2],al*.9,isKL(id)?rgba(KL,1):css('--starlight'),font); }
  /* other labels (item 37): never on the outer ring by default; a style or problem is named when hovered, selected or on the path of
     the run being played (one horizontal label with a background). Scenarios are named when zoomed in (z >= 1.6) where they do not collide. */
  const path=new Set([st.sel,st.hover,L.now,...walked()].filter(Boolean));
  for(const id of vis){ const n=N[id], lv=n.level; if(lv==='root'||lv==='category'||(GR&&!GR.has(id))) continue; const [x,y]=P(id), lk=look(id,spanPx(id)), f=path.has(id)||(lv==='scenario'&&forced.has(id));
    if(x<0||y<0||x>HW||y>HH) continue;
    if(!f&&!(lv==='scenario'&&(v.z>=1.6||TREE))) continue;
    const fs=FS(lv==='scenario'?11.5:11), font=`${f?'600 ':''}${fs}px ${lv==='style'||lv==='problem'?'"Space Grotesk",-apple-system,sans-serif':'"JetBrains Mono",ui-monospace,monospace'}`;
    let txt=lv==='scenario'?short((C[id]||{}).kind||n.title.split(' / ').pop()):lv==='fallback'?`${short(n.title)} ↷`:lv==='avoid'?`to avoid (${kids(id).length})`:n.title;
    g.font=font; txt=fit(txt,Math.min(260,HW*.45)); const w=g.measureText(txt).width, left=x>HW-w-lk.r-14;
    const spots=[[left?x-lk.r-6-w:x+lk.r+6,y+fs/3],[left?x+lk.r+6:x-lk.r-6-w,y+fs/3],[x-w/2,y-lk.r-6],[x-w/2,y+lk.r+fs+4]].map(([lx,ly])=>[lx,ly,[lx-3,ly-fs,lx+w+3,ly+4]]);
    const inb=b=>b[0]>=2&&b[2]<=HW-2&&b[1]>=2&&b[3]<=HH-2, pick=spots.find(q=>inb(q[2])&&!hit([q[2][0]-2,q[2][1]-2,q[2][2]+2,q[2][3]+2],boxes));   /* a path label tries both sides, then above and below (item 86) */
    if(!f&&(!pick||pick!==spots[0])) continue; const [lx,ly,b]=pick||spots[0]; boxes.push(b);
    const colr=lv==='style'?rgba(wd(id)?NEU:POS,1):lv==='problem'||lv==='avoid'?rgba(NEG,1):lv==='fallback'||isKL(id)?rgba(KL,1):css('--starlight');
    plate(txt,lx,ly,dim(id),f?css('--starlight'):colr,font,0,fs); LBL.push({id,px:fs,level:lv,box:b}); }
  g.font=`700 ${FS(11)-1}px "JetBrains Mono",ui-monospace,monospace`; g.textAlign='center';
  for(const q of BADGE){ g.globalAlpha=1; g.fillStyle=css('--ember'); g.beginPath(); g.arc(q.x,q.y,7,0,7); g.fill(); g.fillStyle=css('--void'); g.fillText(String(q.n),q.x,q.y+3.5); }
  /* the file being read, named at the run's current node */
  const now=cur(); if(st.demo&&L.now&&HP[L.now]){ const [x,y]=P(L.now), txt=now.t==='walk'?(now.files&&now.files.length?'reading '+now.files.join(' + '):now.cap.split(':')[0]):now.t==='suggest'?`${(DM[st.demo].suggested||[]).length} styles offered`:now.t==='warn'?'warning: regions to avoid':'';
    if(txt){ const fs=FS(12); g.font=`600 ${fs}px "JetBrains Mono",ui-monospace,monospace`; const w=Math.min(HW-12,g.measureText(txt).width+12), bx=Math.max(6,Math.min(HW-w-6,x-w/2)), by=Math.max(4,Math.min(HH-fs-12,y<cy?y+16:y-fs-22));
      g.globalAlpha=.94; g.fillStyle=css('--panel-2'); g.strokeStyle=rgba(now.t==='warn'?NEG:ICE,1); g.lineWidth=1; g.beginPath(); g.roundRect(bx,by,w,fs+8,5); g.fill(); g.stroke(); g.globalAlpha=1; g.fillStyle=now.t==='warn'?rgba(NEG,1):css('--ice'); g.textAlign='left'; g.fillText(fit(txt,w-12),bx+6,by+fs+2); } }
  g.globalAlpha=1; HSNAP.width=hcv.width; HSNAP.height=hcv.height; HSNAP.getContext('2d').drawImage(hcv,0,0); HV0=v; }
/* nodes related to the hover or selection: their ancestors and descendants, and a stub's target */
function relSet(){ const s=new Set(), id=st.hover||st.sel; if(!id) return s; for(const a of anc(id)) s.add(a);   // item 77: its ancestors and itself; its children are candidates
  if(N[id].target) s.add(N[id].target); for(const f of FB[id]||[]) { s.add(f); s.add(N[f].parent); } return s; }
const hhit=e=>{ const b=hcv.getBoundingClientRect(), mx=e.clientX-b.left, my=e.clientY-b.top; let best=null, bd=1e9; for(const h of HN){ if(h.g) continue; const d=(h.x-mx)**2+(h.y-my)**2; if(d<(h.r0+4)**2&&d<bd){ bd=d; best=h; } } return best; };
function tipFor(id){ const n=N[id], lv=n.level;
  if(lv==='example'){ const e=n.ex||{}; return `<b>${esc(N[n.parent].title)}</b> · ${esc(n.title)}${e.place?` · <span class="place-${e.place}">${['1st','2nd','3rd','4th'][e.place-1]} of 4</span>`:''}<img src="${base}${esc(e.img)}" alt="">`; }
  if(lv==='leaf'){ const r=LF[id]; return `<b style="color:rgb(${r.value.effect>0?POS:NEG})">${esc(r.name)}</b> · finer cluster<br>value ${sg(r.value.effect)} [${sg(r.value.lo)}, ${sg(r.value.hi)}] · ${esc(r.tier)}<br>${r.n_in} of its ${r.n_pilot} pilot pages inside ${esc(N[n.parent].title)}`; }
  if(lv==='style'){ const s=S[id], v=s.value; return `<b style="color:rgb(${wd(id)?NEU:POS})">${esc(n.title)}</b> · style${wd(id)?` · <b>withheld</b>: ${esc(whyKey(s))}`:''}<br>value ${sg(v.effect)} [${sg(v.lo)}, ${sg(v.hi)}] · ${esc(s.tier)}<br>${pct(s.share)} of the scenario's pages<br><code>${esc(n.file)}</code>`; }
  if(lv==='problem'){ const p=PB[id]; return `<b style="color:rgb(${NEG})">${esc(n.title)}</b> · ${p.kind==='render_failure'?'render failure':'look'} to avoid<br>value ${sg(p.value.effect)} [${sg(p.value.lo)}, ${sg(p.value.hi)}] · ${esc(p.tier)}<br>${pct(p.share)} of the scenario's pages`; }
  if(lv==='avoid'){ const k=kids(id); return `<b style="color:rgb(${NEG})">To avoid</b> in ${esc(N[n.parent].title)}<br>${k.length} problem${k.length>1?'s':''}, ${k.filter(i=>PB[i].kind==='render_failure').length} render failures<br>named in <code>${esc(n.file)}</code>`; }
  if(lv==='fallback') return `<b style="color:rgb(${KL})">${esc(N[n.parent].title)} / ${esc(n.title)}</b><br>${pct(n.share)} of the category's pages; too few for a folder, so it reads<br><code>${esc(N[n.target].file)}</code>`;
  if(lv==='scenario'){ const c=C[id]||{}, k=KIDS[id]||[]; return `<b>${esc(n.title)}</b> · scenario<br>${num(c.n_pages)} real pages · ${k.filter(i=>N[i].level==='style').length} styles · ${(PBC[id]||[]).length} problems${FB[id]?`<br>reached from ${FB[id].length} categories through the kind level`:''}<br><code>${esc(n.file)}</code>`; }
  if(lv==='category'){ const k=KIDS[id]||[]; return `<b>${esc(n.title)}</b> · ${isKL(id)?'kind level (all categories pooled)':'category'}<br>${k.filter(i=>N[i].level==='scenario').length} scenarios${k.some(i=>N[i].level==='fallback')?`, ${k.filter(i=>N[i].level==='fallback').length} kinds sent to the kind level`:''}<br><code>${esc(n.file)}</code>`; }
  return `<b>${esc(n.title)}</b><br><code>${esc(nfiles(n).join(' + '))}</code>`; }
function showTip(e,html){ const tp=$('tip'); if(!html){ tp.style.display='none'; return; } tp.innerHTML=html; tp.style.display='block'; tp.style.left=Math.min(innerWidth-275,e.clientX+14)+'px'; tp.style.top=Math.min(innerHeight-200,e.clientY+14)+'px'; }
function hoverOn(id,fromMap){ st.hsrc=fromMap&&id?1:0; if(!slotRaf) slotRaf=requestAnimationFrame(slotSync); if(id===st.hover) return; st.hover=id; hdraw(); draw(); }
/* item 69: a style, problem or finer cluster under the pointer on either map shows in the right panel at once (hoverslot.js, as on the
   correspondence page); moving off restores the panel and its scroll, a click pins it (it becomes the selection). One update per frame. */
/* item 89: the panel's type follows the screen (--fz, as on the correspondence and arena pages) and the panel's own width beyond 520 px */
{ const sd=$('side'), fit=()=>{ const w=sd.clientWidth, fz=Math.max(0,Math.min(4,(innerWidth-1440)*.0016)), z=window.matchMedia('(max-width:783px)').matches?1:(12.5+fz+Math.max(0,Math.min(4,(w-520)*.02)))/12.5;
    for(const e of sd.children) e.style.zoom=z.toFixed(3); sd.dataset.z=z.toFixed(3); }; new ResizeObserver(fit).observe(sd); addEventListener('resize',fit); new MutationObserver(fit).observe(sd,{childList:true}); }
const HSL=HoverSlot.attach($('side'),{key:id=>id,title:'Under the pointer',id:'hslot',render:slotHTML}), WIDE=matchMedia('(min-width:1304px)');
let slotRaf=0, slotId=null, sideTop=0;
function slotSync(){ slotRaf=0; const id=st.hsrc&&st.hover&&REC(st.hover)&&st.hover!==st.sel&&WIDE.matches?st.hover:null; if(id===slotId) return;
  const sd=$('side'); if(id&&!slotId) sideTop=sd.scrollTop; slotId=id;
  if(id){ HSL.show(id); $('sidec').hidden=true; sd.scrollTop=0; } else { HSL.clear(); $('sidec').hidden=false; sd.scrollTop=sideTop; } }
function slotHTML(id){ const r=REC(id), n=N[id], v=r.value, pb=!!PB[id], pl={}; (r.pages||[]).forEach((p,i)=>pl[p[0]]=(r.page_places||[])[i]);
  const au=audOf(r), seen=new Set(), ims=[...((au&&au.examples)||[]).map(pid=>({img:'../../pilot/thumbs/'+pid+'.webp',page_id:pid,place:pl[pid]??(r.audit_places||{})[pid]})),...(r.exemplars||[]),...(r.members_shown||[])]
    .filter(e=>{ const k=e.page_id||e.img; if(seen.has(k)) return false; seen.add(k); return true; }).slice(0,4);   // the audit's non-repeating examples first
  const type=n.level==='leaf'?'finer cluster':pb?(r.kind==='render_failure'?'render failure to avoid':'look to avoid'):wd(id)?'style, withheld':'style';
  const c=pb?NEG:n.level==='leaf'?(v.effect>0?POS:NEG):wd(id)?NEU:POS;
  const ds=pb?r.text:n.level==='leaf'?`${r.n_in} of its ${r.n_pilot} pilot pages lie inside ${N[n.parent].title}.`:((r.curation||{}).reason||String(n.text||'').split(/\n\s*\n/).find(t=>t.trim()&&!/^#/.test(t.trim()))||'');
  return `<h2 style="color:rgb(${c})">${esc(n.title)}</h2><p>${esc(type)} · value <b>${sg(v.effect)}</b> [${sg(v.lo)}, ${sg(v.hi)}] · ${esc(r.tier)}</p>`
    +(ims.length?grid4('',ims.map(e=>`<figure><img src="${base}${esc(e.img)}" alt="${esc(n.title)}" loading="lazy"><figcaption>${e.place?`<span class="place-${e.place}">${placeTxt(e.place)}</span>`:'&nbsp;'}</figcaption></figure>`)):'')
    +(ds?`<p>${esc(ds.length>240?ds.slice(0,239).trim()+'…':ds)}</p>`:''); }
/* the floating tooltip keeps to the name and value for what the slot shows */
const tipMap=id=>{ const r=REC(id); return r&&WIDE.matches&&N[id].level!=='example'?`<b style="color:rgb(${PB[id]?NEG:r.value.effect>0&&!wd(id)?POS:wd(id)?NEU:NEG})">${esc(N[id].title)}</b> · ${sg(r.value.effect)}`:tipFor(id); };
hcv.addEventListener('mousemove',e=>{ if(HZ.busy()) return; const h=hhit(e); hcv.style.cursor=h?'pointer':'default'; hoverOn(h?h.id:null,1); showTip(e,h&&tipMap(h.id)); });
hcv.addEventListener('mouseleave',()=>{ hoverOn(null); showTip(null,null); });
let clickT=null;
hcv.addEventListener('click',e=>{ const h=hhit(e); clearTimeout(clickT); clickT=setTimeout(()=>{ if(h) st.sel===h.id?deselect():select(h.id); else if(st.sel) deselect(); },240); });   // single click: select (again, or on the background: deselect); double click: focus
hcv.addEventListener('dblclick',e=>{ clearTimeout(clickT); const h=hhit(e); if(!h) return setFocus(null);
  const lv=N[h.id].level, f=lv==='category'||lv==='scenario'?h.id:lv==='fallback'?N[h.id].target:scOf(h.id)||catOf(h.id); if(lv!=='root') st.sel=h.id; setFocus(st.focus===f?null:f); });

/* ── continuous map ── */
const E=PT.encoders[A.map.encoder], X=E.x, Y=E.y, NP=X.length, cv=$('map'), g=cv.getContext('2d');
/* one level below a region (item 60): the atlas's own `children` when it has them; else the held clusters of data/pilot/leaves.json
   whose pilot pages lie mostly inside the region's outline: at least 60 % of the cluster's pilot pages and at least 8 of them */
const PAGEI={}; (PT.pages||[]).forEach((p,i)=>PAGEI[p.id]=i);
const fineOf=memo(rid=>{ const rec=REC(rid); if(!rec||!LVS) return [];
  if(Array.isArray(rec.children)) return rec.children.map(c=>typeof c==='string'?c:c.id).filter(c=>N[c]);
  const h=region(rid); if(h.length<3) return []; const PL=LVS.page_leaf||[], by={};
  for(let i=0;i<PL.length;i++){ const j=PL[i]; if(j==null||j<0||X[i]==null) continue; const b=by[j]||(by[j]={n:0,in:[]}); b.n++; if(inPoly(X[i],Y[i],h)) b.in.push(i); }
  const out=[];
  for(const [j,b] of Object.entries(by)){ if(b.in.length<8||b.in.length<.6*b.n) continue; const l=LVS.leaves[+j], id='lf:'+l.id+'@'+rid, au=AUD[l.id];   // one node per (cluster, region): a cluster can sit inside two overlapping regions
    const thumbs=[...new Set(b.in.map(i=>PT.pages[i].id))].slice(0,8), ex=au&&(au.examples||[]).length?au.examples:thumbs;
    LF[id]={id,name:l.name,tier:l.tier,cluster:l.id,value:{effect:+l.pref,lo:+l.pref_lo,hi:+l.pref_hi,votes:+l.n_votes,semdev:+l.confirm_pref},centre:[b.in.reduce((t,i)=>t+X[i],0)/b.in.length,b.in.reduce((t,i)=>t+Y[i],0)/b.in.length],
      pages:b.in.map(i=>[PT.pages[i].id,X[i],Y[i]]),page_values:b.in.map(i=>PT.pages[i].resid),page_places:b.in.map(i=>PT.pages[i].placement),audit:au||null,share:b.in.length/b.n,n_pages:+l.n_pages,n_in:b.in.length,n_pilot:b.n,
      members_shown:ex.slice(0,8).map(pid=>({img:'../../pilot/thumbs/'+pid+'.webp',page_id:pid,note:au?'example, no repeated image':'pilot page of this cluster'}))};
    N[id]={id,parent:rid,level:'leaf',title:l.name,file:N[rid].file,virtual:1}; out.push(id); }
  return out.sort((a,b)=>Math.abs(LF[b].value.effect)-Math.abs(LF[a].value.effect)); });
let FO=null;   // the region whose finer clusters hang in the structure map while it (or one of them) is selected
function syncFine(){ const n=N[st.sel], reg=n&&n.level==='leaf'?n.parent:n&&(n.level==='style'||n.level==='problem')?st.sel:null;
  if(FO&&FO!==reg){ if(BASEK[FO]) KIDS[FO]=BASEK[FO]; else delete KIDS[FO]; st.open.delete(FO); }
  if(reg&&reg!==FO){ const f=BASEK[reg]||[...exKids(reg),...fineOf(reg)]; if(f.length){ KIDS[reg]=f; st.open.add(reg); } }
  FO=reg; }
const MZ=PanZoom.attach(cv,{min:.6,max:8,onChange:(v,live)=>live?mblit(v):draw(),isNode:e=>!!mhit(e)});
const MSNAP=document.createElement('canvas'); let MV0=null;
function mblit(v){ if(!MV0||!MSNAP.width) return draw(); const d=cv.width/W, k=v.z/MV0.z, cx=W/2, cy=H/2;
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cv.width,cv.height); g.setTransform(d*k,0,0,d*k,d*(cx-(cx+MV0.x)*k+v.x),d*(cy-(cy+MV0.y)*k+v.y)); g.drawImage(MSNAP,0,0,W,H); g.setTransform(d,0,0,d,0,0); CNT.mblit++; }   // the user's view on top of the framing that follows the selection
const eff=()=>{ const v=MZ.get(); return {k:k*v.z,ox:W/2+(ox-W/2)*v.z+v.x,oy:H/2+(oy-H/2)*v.z+v.y}; };
let W=1,H=1,k=1,ox=0,oy=0,T=null; const B={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9};
for(let i=0;i<NP;i++){ if(X[i]==null) continue; B.x0=Math.min(B.x0,X[i]); B.x1=Math.max(B.x1,X[i]); B.y0=Math.min(B.y0,Y[i]); B.y1=Math.max(B.y1,Y[i]); }
const frame=(x0,x1,y0,y1,K)=>({k:K,ox:W/2-(x0+x1)/2*K,oy:H/2-(y0+y1)/2*K}), home=()=>frame(B.x0,B.x1,B.y0,B.y1,Math.min((W-40)/(B.x1-B.x0),(H-40)/(B.y1-B.y0)));
function size(){ const r=cv.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2); W=r.width; H=r.height; cv.width=W*d; cv.height=H*d; g.setTransform(d,0,0,d,0,0); T=null; ({k,ox,oy}=target()); draw(); }
function glide(){ if(!T) return; if(RM.matches){ ({k,ox,oy}=T); T=null; draw(); return; } k+=(T.k-k)*.2; ox+=(T.ox-ox)*.2; oy+=(T.oy-oy)*.2;
  if(Math.abs(T.k-k)<T.k*.003&&Math.abs(T.ox-ox)<.5&&Math.abs(T.oy-oy)<.5){ ({k,ox,oy}=T); T=null; } draw(); if(T) requestAnimationFrame(glide); }
const probs=sc=>(PBC[sc]||[]).filter(shown);
/* what the map shows: one "focus" derived from the selection or the run's step */
function focus(){
  const d=DM[st.demo];
  if(st.sel){ const n=N[st.sel], lv=n.level;
    if(lv==='style') return {cond:n.parent,styles:[n.id],problems:[],chosen:n.id,members:n.id,fine:fineOf(n.id)};
    if(lv==='leaf') return {cond:scOf(n.id),styles:[],problems:[],members:n.id,region:n.parent,fine:[n.id]};
    const shownSt=sc=>(KIDS[sc]||[]).filter(i=>N[i].level==='style'&&shown(i));
    if(lv==='problem') return {cond:scOf(n.id),styles:[],problems:[n.id],members:n.id,fine:fineOf(n.id)};
    if(lv==='avoid') return {cond:n.parent,styles:[],problems:probs(n.parent)};
    if(lv==='scenario'||lv==='fallback'){ const sc=lv==='scenario'?n.id:n.target; return {cond:sc,styles:shownSt(sc),problems:probs(sc)}; }
    if(lv==='category') return {cat:n.id};
    return {overview:true}; }
  if(d){ const w=walked(), sc=w.find(i=>N[i].level==='scenario'), ct=w.slice().reverse().find(i=>N[i].level==='category');
    return {cond:sc,cat:sc?null:ct,styles:done('suggest')?d.suggested.filter(i=>S[i]):[],problems:sc&&done('warn')?probs(sc):[],chosen:w.includes(d.chosen)?d.chosen:null,arms:done('land')?d:null}; }
  return {overview:true}; }
function target(){ const f=focus(); let pts=[];
  if(f.cond&&C[f.cond]) pts=C[f.cond].pages.map(p=>[p[1],p[2]]); else if(f.cat) pts=catPages(f.cat).map(p=>[p[1],p[2]]);
  for(const s of [...(f.styles||[]),...(f.problems||[])]) if(REC(s)&&REC(s).centre) pts.push(REC(s).centre);
  if(f.arms) for(const p of Object.values(f.arms.pages)) pts.push([p.x,p.y]);
  if(pts.length<5) return home();
  const xs=pts.map(p=>p[0]).sort((a,b)=>a-b), ys=pts.map(p=>p[1]).sort((a,b)=>a-b), q=(a,t)=>a[Math.floor((a.length-1)*t)];
  const ax=[...(f.arms?Object.values(f.arms.pages):[]),...(f.members?region(f.members).map(([x,y])=>({x,y})):[])];   // landed pages and the selected region stay in frame
  const x0=Math.min(q(xs,.03),...ax.map(p=>p.x)), x1=Math.max(q(xs,.97),...ax.map(p=>p.x)), y0=Math.min(q(ys,.03),...ax.map(p=>p.y)), y1=Math.max(q(ys,.97),...ax.map(p=>p.y));
  const K=Math.min(home().k*3,(W-60)/(x1-x0||1),(H-60)/(y1-y0||1)); return K>home().k?frame(x0,x1,y0,y1,K):home(); }
const hull=pts=>{ const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]); if(p.length<3) return p; const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[]; for(const q of p){ while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0) lo.pop(); lo.push(q); } for(const q of p.reverse()){ while(up.length>1&&cr(up[up.length-2],up[up.length-1],q)<=0) up.pop(); up.push(q); }
  return lo.slice(0,-1).concat(up.slice(0,-1)); };
const region=memo(id=>{ const s=REC(id); if(!s||!s.centre||!(s.pages||[]).length) return []; const c=s.centre, d=s.pages.map(p=>[p[1],p[2],(p[1]-c[0])**2+(p[2]-c[1])**2]).sort((a,b)=>a[2]-b[2]);
  return hull(d.slice(0,Math.max(3,Math.ceil(d.length*.8))).map(p=>[p[0],p[1]])); });   // the central 80% of the region's pages
const inPoly=(x,y,h)=>{ let c=false; for(let i=0,j=h.length-1;i<h.length;j=i++) if((h[i][1]>y)!==(h[j][1]>y)&&x<(h[j][0]-h[i][0])*(y-h[i][1])/(h[j][1]-h[i][1])+h[i][0]) c=!c; return h.length>2&&c; };
/* problem regions a generated page lands in: the atlas's `inside` list when given (named by this scenario's problem for that region, else
   any problem of that region), else the page inside the outline of one of the scenario's problem regions */
const landsIn=(p,sc)=>{ const own=PBC[sc]||[], hit=(id,x)=>{ const r=PB[id]; return x===r.id||x===r._id||x===r.region||x===r.cluster; };
  if(Array.isArray(p.inside)) return [...new Set(p.inside.map(x=>own.find(id=>hit(id,x))||Object.keys(PB).find(id=>hit(id,x))).filter(Boolean))];
  return own.filter(id=>inPoly(p.x,p.y,region(id))); };
const shape=(c,kind,x,y,r)=>{ c.beginPath(); if(kind==='circle') c.arc(x,y,r,0,7); else if(kind==='square') c.rect(x-r*.85,y-r*.85,r*1.7,r*1.7); else { c.moveTo(x,y-r*1.25); c.lineTo(x+r,y); c.lineTo(x,y+r*1.25); c.lineTo(x-r,y); c.closePath(); } };
let HIT=[], REG=[], DRAWN=[];
function draw(){ const {k,ox,oy}=eff(); CNT.draw++;
  const f=focus(), z=Math.sqrt(k/home().k), P=(x,y)=>[x*k+ox,y*k+oy]; HIT=[]; REG=[]; DRAWN=[];
  g.clearRect(0,0,W,H);
  g.globalAlpha=f.overview?.27:.32; g.fillStyle=css('--faint'); const s0=1.8*z; for(let i=0;i<NP;i++) if(X[i]!=null) g.fillRect(X[i]*k+ox-s0/2,Y[i]*k+oy-s0/2,s0,s0);
  if(f.overview){ for(const s of A.styles) if(s.centre&&shown(s.id)){ const [x,y]=P(...s.centre); g.globalAlpha=.6; g.fillStyle=col(s,.85); g.beginPath(); g.arc(x,y,2+8*Math.sqrt(s.share),0,7); g.fill(); HIT.push({x,y,r:6,id:s.id}); }
    for(const p of A.problems||[]) if(p.centre&&shown(p._id)){ const [x,y]=P(...p.centre); g.globalAlpha=.55; g.strokeStyle=rgba(NEG,1); g.lineWidth=1.5; g.beginPath(); g.moveTo(x-3,y-3); g.lineTo(x+3,y+3); g.moveTo(x+3,y-3); g.lineTo(x-3,y+3); g.stroke(); HIT.push({x,y,r:6,id:p._id}); } }
  const cond=C[f.cond], grid=A.map.grid;
  if(cond&&grid){ const n=grid.n, cw=(grid.x1-grid.x0)/n, ch=(grid.y1-grid.y0)/n, mx=Math.max(...cond.density.map(d=>d[1])); g.fillStyle=css('--ice');
    for(const [c,sh] of cond.density){ const gx=c%n, gy=Math.floor(c/n); g.globalAlpha=.05+.3*Math.sqrt(sh/mx); g.fillRect((grid.x0+gx*cw)*k+ox,(grid.y0+gy*ch)*k+oy,cw*k+.5,ch*k+.5); } }
  const pts=cond?cond.pages:f.cat?catPages(f.cat):[];
  if(pts.length){ g.globalAlpha=.75; g.fillStyle=css('--ice'); const s1=2.4*z; for(const p of pts) g.fillRect(p[1]*k+ox-s1/2,p[2]*k+oy-s1/2,s1,s1); }
  if(f.members&&REC(f.members)){ const r=REC(f.members), pv=r.page_values||[], s2=3*z;   // each member page in its own result's colour (item 59); the region's type is its outline
    const pp=r.page_places||[]; g.globalAlpha=.95;
    r.pages.forEach((p,i)=>{ g.fillStyle=placeCol(pp[i]); g.fillRect(p[1]*k+ox-s2/2,p[2]*k+oy-s2/2,s2,s2); }); }   // each member page in the colour of its own place in its tournament (item 64)
  if(f.region&&REC(f.region)){ const h=region(f.region); if(h.length>2){ g.globalAlpha=.7; g.beginPath(); h.forEach((p,i)=>g[i?'lineTo':'moveTo'](...P(...p))); g.closePath(); g.strokeStyle=rgba(PB[f.region]?NEG:sign(REC(f.region))>0?POS:NEG,1); g.lineWidth=1.3; g.setLineDash([5,4]); g.stroke(); g.setLineDash([]); } }
  for(const id of f.fine||[]){ const r=LF[id]; if(!r) continue; const h=hull(r.pages.map(p=>[p[1],p[2]])), c=r.value.effect>0?POS:NEG, on=id===st.sel||id===st.hover;   // finer clusters: their own outline and colour
    if(h.length>2){ g.globalAlpha=on?1:.75; g.beginPath(); h.forEach((p,i)=>g[i?'lineTo':'moveTo'](...P(...p))); g.closePath(); g.strokeStyle=rgba(c,1); g.lineWidth=on?2:1; g.setLineDash([2,2]); g.stroke(); g.setLineDash([]); }
    const [x,y]=P(...r.centre); g.globalAlpha=1; g.fillStyle=rgba(c,1); g.beginPath(); g.arc(x,y,on?4.5:3,0,7); g.fill(); HIT.push({x,y,r:9,id}); }
  /* regions: styles in green, problems in red (outline only for render failures); the hovered one, wherever it is, on top */
  const ids=[...(f.styles||[]),...(f.problems||[])]; if(st.hover&&REC(st.hover)&&!ids.includes(st.hover)) ids.push(st.hover);
  const lab=[];
  for(const id of ids){ const s=REC(id), h=region(id); if(!s||!s.centre) continue; const pb=!!PB[id], ch=id===f.chosen||id===st.sel, hv=id===st.hover, c=pb?NEG:sign(s)>0?POS:NEG, t=tierOf(s);
    if(h.length>2){ g.beginPath(); h.forEach((p,i)=>g[i?'lineTo':'moveTo'](...P(...p))); g.closePath();
      if(!(pb&&s.kind==='render_failure')){ g.globalAlpha=ch||hv?.24:.1; g.fillStyle=rgba(c,t===2?1:.7); g.fill(); }
      g.globalAlpha=ch||hv?1:st.hover&&!hv?.35:.85; g.strokeStyle=rgba(c,t===2?1:.7); g.lineWidth=ch||hv?2.6:1.3; g.setLineDash(t===1?[5,4]:pb&&s.kind==='render_failure'?[1.5,3]:[]); g.stroke(); g.setLineDash([]); REG.push({id,h}); }
    const [x,y]=P(...s.centre); g.globalAlpha=1;
    if(pb){ g.strokeStyle=rgba(NEG,1); g.lineWidth=2; g.beginPath(); g.moveTo(x-4,y-4); g.lineTo(x+4,y+4); g.moveTo(x+4,y-4); g.lineTo(x-4,y+4); g.stroke(); }
    else if(id===f.chosen){ g.fillStyle=css('--ember'); g.font='700 18px sans-serif'; g.textAlign='center'; g.fillText('★',x,y+6); }
    DRAWN.push({id,kind:pb?'problem':'style',colour:pb?'red':sign(s)>0?'green':'red'});
    lab.push({x,y,id,t:`${N[id].title}  ${sg(s.value.effect)}`,s,pb,ch:ch||hv}); HIT.push({x,y,r:12,id}); }
  /* labels: the chosen or selected one, the three strongest styles and the two strongest problems; the rest on hover */
  const top=[...lab.filter(l=>l.ch),...lab.filter(l=>!l.ch&&!l.pb).sort((a,b)=>b.s.value.effect-a.s.value.effect).slice(0,3),...lab.filter(l=>!l.ch&&l.pb).sort((a,b)=>a.s.value.effect-b.s.value.effect).slice(0,2)];
  g.font='600 12px "Space Grotesk",-apple-system,sans-serif'; g.textAlign='center'; const put=[];
  for(const L of top){ const t=L.t.length>40?L.t.slice(0,39)+'…':L.t, w=g.measureText(t).width/2+6, x=Math.max(w+4,Math.min(W-w-4,L.x)); let y=L.y-14;
    while(put.some(b=>Math.abs(b[0]-x)<b[2]+w&&Math.abs(b[1]-y)<19)) y-=19; put.push([x,y,w]);
    g.globalAlpha=.86; g.fillStyle=css('--void'); g.beginPath(); g.roundRect(x-w,y-13,w*2,18,4); g.fill(); g.globalAlpha=1; g.fillStyle=L.id===f.chosen?css('--ember'):L.pb?rgba(NEG,1):col(L.s); g.fillText(t,x,y); }
  if(f.arms) for(const [a,p] of Object.entries(f.arms.pages)){ const [x,y]=P(p.x,p.y), m=arm(a,f.arms), bad=landsIn(p,f.cond);
    g.globalAlpha=1; shape(g,m[1],x,y,7); g.fillStyle=m[2]; g.fill(); g.strokeStyle=css('--void'); g.lineWidth=2; g.stroke();
    if(bad.length){ g.strokeStyle=rgba(NEG,1); g.lineWidth=2; g.beginPath(); g.arc(x,y,12,0,7); g.stroke(); g.fillStyle=rgba(NEG,1); g.font='700 11px sans-serif'; g.textAlign='center'; g.fillText('✕',x+11,y-9); }
    HIT.push({x,y,r:11,html:`<b>${esc(m[0])}</b>${f.arms.generator?' · '+esc(f.arms.generator):''}${bad.length?`<br><span style="color:rgb(${NEG})">lands inside: ${bad.map(i=>esc(N[i].title)).join(', ')}</span>`:''}<img src="${base}${esc(p.img)}" alt="">`}); }
  g.globalAlpha=1; MSNAP.width=cv.width; MSNAP.height=cv.height; MSNAP.getContext('2d').drawImage(cv,0,0); MV0=MZ.get(); }
const mhit=e=>{ const b=cv.getBoundingClientRect(), mx=e.clientX-b.left, my=e.clientY-b.top, d=o=>(o.x-mx)**2+(o.y-my)**2, h=HIT.filter(o=>d(o)<o.r*o.r).sort((a,c)=>d(a)-d(c))[0];
  if(h) return h; const r=[...REG].reverse().find(o=>inPoly((mx-eff().ox)/eff().k,(my-eff().oy)/eff().k,o.h)); return r?{id:r.id}:null; };
cv.addEventListener('mousemove',e=>{ if(MZ.busy()) return; const h=mhit(e); cv.style.cursor=h&&h.id?'pointer':'default'; showTip(e,h&&(h.html||tipMap(h.id))); hoverOn(h&&h.id||null,1); });
cv.addEventListener('mouseleave',()=>{ showTip(null,null); hoverOn(null); });
cv.addEventListener('click',e=>{ const h=mhit(e); if(h&&h.id) st.sel===h.id?deselect():select(h.id); else if(!h&&st.sel) deselect(); });
const svgShape=(kind,c)=>`<svg width="13" height="13" viewBox="-7 -7 14 14">${kind==='circle'?`<circle r="5" fill="${c}"/>`:kind==='square'?`<rect x="-4.5" y="-4.5" width="9" height="9" fill="${c}"/>`:`<path d="M0-6L5 0 0 6-5 0Z" fill="${c}"/>`}</svg>`;
function caption(){ const f=focus(), d=DM[st.demo], cond=C[f.cond];
  let t='';
  if(f.overview) t=`<b>${A.styles.filter(x=>shown(x.id)).length}</b> ${COUNT.withheld&&!st.wd?'recommended ':''}styles of skill ${esc(A.version)} at the centres of their regions${COUNT.problem?`, <b style="color:rgb(${NEG})">${COUNT.problem}</b> problems as ✕`:''}, on ${num(NP)} real pages of the DINO map.<small>Pick a request above, or a node of the structure.</small>`;
  else if(cond) t=`Scenario <b>${esc(cond.category)} · ${esc(cond.kind.replace(/_/g,' '))}</b>: ${num(cond.n_pages)} real pages, ${num(cond.n_votes)} votes${cond.fallback&&!isKL(f.cond)?' (too few labelled pages of this kind: the whole category is shown)':''}.<small>Blue = where this scenario's pages lie (its conditional distribution). ${(f.styles||[]).length?`Green = the ${f.styles.length===1?'style':(f.styles.length+' styles')} ${d&&!st.sel?'suggested':'of this scenario'}. `:''}${(f.problems||[]).length?`Red = ${f.problems.length===1?'the region':f.problems.length+' regions'} to avoid. `:''}Outlines hold the central 80% of each region's pages.</small>`;
  else if(f.cat) t=`Category <b>${esc(N[f.cat].title)}</b>: the pages of its scenarios.<small>The route continues to the kind of page.</small>`;
  else if(d) t=`<b>${esc(cur().cap||'')}</b><small>The map follows once the route reaches the category.</small>`;
  $('cap').innerHTML=t;
  const fm=focus(); $('under').innerHTML=(fm.members?`<span class="lg">outline = the region (its effect); dots = each page's place in its tournament: ${[1,2,3,4].map(i=>`<i class="place-sw" style="background:var(--place-${i})"></i>${['1st','2nd','3rd','4th'][i-1]}`).join(' ')} <i class="place-sw" style="background:var(--place-none)"></i>unknown${(fm.fine||[]).length?'; small dashed outlines = finer clusters':''}</span>`:'')+`<span><svg width="13" height="13"><rect x="3" y="3" width="7" height="7" fill="${css('--faint')}"/></svg>real pages</span><span><svg width="13" height="13"><rect x="3" y="3" width="7" height="7" fill="${css('--ice')}"/></svg>conditional distribution</span>`+
    `<span><svg width="16" height="13"><rect x="1" y="2" width="14" height="9" rx="3" fill="rgba(${POS},.2)" stroke="rgb(${POS})" stroke-width="1.5"/></svg>style region (dashed = leaning)</span>`+
    (COUNT.problem?`<span><svg width="16" height="13"><rect x="1" y="2" width="14" height="9" rx="3" fill="rgba(${NEG},.2)" stroke="rgb(${NEG})" stroke-width="1.5"/></svg>problem region; dotted outline = render failure</span>`:'')+`<span style="color:var(--ember)">★ chosen</span>`+
    (f.arms?Object.keys(f.arms.pages).map(a=>`<span>${svgShape(arm(a)[1],arm(a)[2])}${esc(arm(a)[0])}</span>`).join('')+`<span style="color:rgb(${NEG})">◯✕ lands in a problem region</span>`:''); }

/* ── side: the run so far, then the selected file ── */
const md=t=>{ if(!t) return ''; const out=[]; let ul=false; const inl=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  for(const l of t.split('\n')){ const m=l.match(/^(#{1,6})\s+(.*)/), li=l.match(/^\s*[-*]\s+(.*)/);
    if(!li&&ul){ out.push('</ul>'); ul=false; }
    if(m) out.push(m[1].length<=1?`<h4>${inl(m[2])}</h4>`:`<h5>${inl(m[2])}</h5>`);
    else if(li){ if(!ul){ out.push('<ul>'); ul=true; } out.push(`<li>${inl(li[1])}</li>`); }
    else if(/^---+$/.test(l.trim())) out.push('<hr>');
    else if(l.startsWith('|')) out.push(`<pre>${esc(l)}</pre>`);
    else if(l.trim()) out.push(`<p>${inl(l)}</p>`); }
  if(ul) out.push('</ul>'); return `<div class="md">${out.join('')}</div>`; };
const fileNode=f=>{ const d=DM[st.demo]; return A.tree.find(n=>nfiles(n).includes(f)&&(!d||n.level!=='style'||d.path.includes(n.id))); };
const outcome=v=>v==null?'not judged':v===1?'won':v===0?'lost':'tie';
/* a file's heading and its first lines of guidance, from the text the atlas carries for its node */
function gist(f,k){ const n=fileNode(f), t=String(n&&n.text||''), L=t.split('\n').map(x=>x.trim()).filter(Boolean), hd=(L.find(x=>/^#/.test(x))||'').replace(/^#+\s*/,'');
  return {head:hd.slice(0,90),lines:k?L.filter(x=>!/^#/.test(x)).slice(0,k).map(x=>x.replace(/^[-*]\s+/,'• ').replace(/[`*_]/g,'').slice(0,240)):[]}; }
function runPanel(){ const d=DM[st.demo]; if(!d) return '';
  const r=d.reading, fx=Object.entries(r.fixed||{}), now=cur(), stepOf=f=>STEPS.findIndex(s=>s.t==='read'&&s.f===f), nw=f=>stepOf(f)===st.step?' new':'';
  const files=STEPS.slice(0,st.step+1).flatMap(s=>(s.files||[]).map(f=>[f,s===now]));
  let h=`<div class="sec">Request · ${esc(d.set==='final'?'final test':d.set==='block_3'?'block 3':d.set||'real request')}${d.generator?' · '+esc(d.generator):''}</div><div class="q">${esc(d.prompt)}</div>`;
  h+=`<div class="sec">Reading</div><div class="chips">${readUpTo('category')?`<span class="${nw('category')}">category <b>${esc(r.category)}</b></span>`:''}${readUpTo('kind')?`<span class="${nw('kind')}">kind <b>${esc((r.kind||'').replace(/_/g,' '))}</b></span>`:''}${readUpTo('subject')?`<span class="${nw('subject')}">subject <b>${esc((r.subject||'').replace(/_/g,' '))}</b></span>`:''}${readUpTo('fixed')?(fx.length?fx.map(([a,b])=>`<span class="${nw('fixed')}">${esc(a)} <b>${esc(b)}</b></span>`).join(''):`<span class="${nw('fixed')}">fixes <b>nothing</b></span>`)+`<span class="${nw('fixed')}">specificity <b>${esc(r.specificity)}</b></span>`:''}${st.step===0?'<span>…</span>':''}</div>`;
  const fbStep=STEPS.slice(0,st.step+1).find(s=>s.t==='walk'&&N[s.node].level==='fallback');
  h+=`<div class="sec">Files read, in order</div>${files.length?`<ol class="files">${files.map(([f,c],i)=>{ const fn=fileNode(f), dup=files.slice(0,i).some(([e])=>fileNode(e)===fn), g=dup?{head:'',lines:[]}:gist(f,c?7:0);   /* item 89: what each file contributes; the step being played expanded */
      return `<li class="${c?'cur':''}">${fileNode(f)?`<a data-file="${esc(f)}">${esc(f)}</a>`:esc(f)}${g.head?`<span class="fh"> · ${esc(g.head)}</span>`:''}${g.lines.length?`<div class="fg">${g.lines.map(l=>`<p>${esc(l)}</p>`).join('')}</div>`:''}</li>`; }).join('')}</ol>`:'<p class="none">None yet.</p>'}${fbStep?`<p class="kl">${esc(fbStep.cap)}</p>`:''}`;
  if(done('suggest')){ h+=`<div class="sec">Suggested styles</div>`;
    h+=d.suggested.filter(i=>S[i]).map(id=>{ const s=S[id]; return `<div class="sg${id===d.chosen&&walked().includes(id)?' cho':''}" data-id="${esc(id)}"><b>${id===d.chosen&&walked().includes(id)?'★ ':''}${esc(N[id].title)}</b><span class="ef">${wd(id)?'now withheld · ':''}${sg(s.value.effect)} · ${pct(s.share)}</span></div>`; }).join('');
    if(!d.chosen) h+=`<div class="stop">${esc(STOP[d.stop]||'No style is drawn for this request.')}${d.suggested.length?` (${d.suggested.length} compatible)`:''}</div>`;
    if(d.chosen&&ver==='r3') h+=`<p>r3 draws one of them at random, seeded by the request.</p>`; }
  const sc=runSc();
  if(done('warn')&&sc){ const ps=probs(sc); h+=`<div class="sec">To avoid, named in ${esc(N[sc].file)}</div>${ps.map(id=>`<div class="sg pb" data-id="${esc(id)}"><b>${esc(N[id].title)}</b><span class="ef">${PB[id].kind==='render_failure'?'render failure · ':''}${sg(PB[id].value.effect)}</span></div>`).join('')||'<p class="none">Render-failure problems are hidden (toggle above).</p>'}`; }
  if(done('land')){ const ORD=['P','N','T'], ar=Object.entries(d.pages).sort((x,y)=>(ORD.indexOf(x[0])+9)%12-(ORD.indexOf(y[0])+9)%12);   // the pipeline's page first, then the prompt alone, then taste.md
    const LAB={P:'Data pipeline',N:'Prompt alone',T:'taste.md'}, SUB={N:'no guidance',T:'the first study\'s taste file'};
    h+=`<div class="sec">${d.pages.N?'Same request, same model: with the pipeline and without':'Same request, generated with the pipeline'}</div><div class="arms n${ar.length}${ar.length===1?' one':''}" data-lb-group>${ar.map(([a,p])=>{ const bad=landsIn(p,sc), vd=a==='P'?(p.panel_vs?`panel vs prompt alone ${outcome(p.panel_vs.N)}, vs taste.md ${outcome(p.panel_vs.T)}`:'not judged'):p.panel==null?'not judged':`panel vs pipeline ${outcome(p.panel)}`, sty=(p.style||(a==='P'&&walked().includes(d.chosen)?d.chosen:null))&&N[p.style||d.chosen]?N[p.style||d.chosen].title:'';
      const lab=(LAB[a]||arm(a)[0]).toUpperCase(), sub=a==='P'?(sty?`style: ${sty}`:'no style drawn')+(d.form?` · form ${d.form}`:''):SUB[a]||'';
      const cap=[lab,sub,vd,p.F!=null?'F '+sg(p.F):'',bad.length&&'inside '+bad.map(i=>N[i].title).join(', ')].filter(Boolean).join(' · ');
      return `<div class="arm${bad.length?' bad':''}" style="--ac:${arm(a)[2]}"><div class="al">${svgShape(arm(a)[1],arm(a)[2])}<b>${esc(lab)}</b>${a==='N'?`<small class="i"> · ${esc(sub)}</small>`:sub?`<small>${esc(sub)}</small>`:''}</div><img src="${base}${esc(p.img)}" alt="${esc(lab)} page" loading="lazy" data-lb data-lb-cap="${esc(cap)}"><div>${esc(vd)}${p.F!=null?` · F ${sg(p.F)}`:''}${bad.length?`<br><span class="in">✕ inside ${bad.map(i=>esc(N[i].title)).join(', ')}</span>`:''}</div></div>`; }).join('')}</div>
      ${d.pages.N?'':'<p class="none">The page without guidance (prompt alone) was not generated for this run.</p>'}<p>Panel: majority of the vision-model panel on the pair. F: vote-fitted score of the page's look.</p>`; }
  return `<h2>Run</h2>`+h; }
/* the files a generator reads to reach a node, in order */
function crumbs(id){ const out=[]; let kl=false;
  for(const a of anc(id)){ const n=N[a];
    if(n.level==='avoid') continue;
    if(n.level==='problem'){ out.push([null,a,'to avoid: '+n.title]); continue; }
    if(n.level==='fallback'){ out.push([null,a,`no ${N[n.parent].title}/${n.title} folder`]); for(const t of anc(n.target).slice(1)) if(t!=='cat:any') for(const f of nfiles(N[t])) out.push([f,t]); continue; }
    if(a==='cat:any'){ kl=true; out.push([null,null,'<request category>/context.md']); continue; }
    for(const f of nfiles(n)) out.push([f,a]); }
  return {out,kl}; }
/* intermediate nodes (root, category, scenario, kind level, fallback stub): the routing condition in plain words, real requests, real pages
   (atlas `examples`, dual/site/atlas_examples.py); then the distribution; then the rest. Styles and problems: examples first, then numbers. */
const KD={}, CATK={};   // kind -> its description; category -> its kinds with share and destination, from the category files
for(const c of A.tree.filter(n=>n.level==='category'&&n.id!=='cat:any')) CATK[c.id]=[...(c.text||'').matchAll(/^- (.+?) \(`([\w-]+)`\):\s*([\d.]+)% of pages\s*->\s*(\S+?)\/context\.md/gm)].map(m=>{ KD[m[2]]=m[1]; const t=BYFILE[m[4]+'/context.md']; return {kind:m[2],desc:m[1],share:+m[3]/100,to:t,kl:m[4].startsWith('any/')}; });
const kdesc=k=>KD[k]||short(k);
/* a grid of page images: four shown (two by two), the rest only in the viewer, behind a "+N more" mark; one image takes the full width */
const grid4=(cls,figs)=>`<div class="ex${cls}${figs.length===1?' one':''}" data-lb-group>${figs.map((f,i)=>i<4?f:f.replace('<figure','<figure class="more"')).join('')}${figs.length>4?`<button class="mo" type="button" aria-label="Show all ${figs.length} images">+${figs.length-4} more</button>`:''}</div>`;
const SRC={demo:['r','routed','an atlas pilot demo the skill routed here'],routed:['r','routed','a development prompt whose stored reading the skill routes here'],votes:['','votes','a real request in the votes whose pages are mostly this kind']};
const rr=(arr,n)=>{ const out=[]; for(let i=0;out.length<n&&arr.some(a=>i<a.length);i++) for(const a of arr) if(i<a.length&&out.length<n) out.push(a[i]); return out; };   // round robin
function examplesOf(id){ const n=N[id], lv=n.level;
  if(lv==='scenario') return (C[id]||{}).examples;
  if(lv==='fallback'){ const e=(C[n.target]||{}).examples||{requests:[],pages:[]}, ce=N[n.parent].examples||{requests:[],pages:[]}, ct=N[n.parent].title, k=n.title, uniq=(a,f)=>a.filter((x,i)=>a.findIndex(y=>f(y)===f(x))===i);
    return {requests:uniq([...ce.requests.filter(r=>r.kind===k),...e.requests.filter(r=>r.category===ct)],r=>r.text).slice(0,8),pages:uniq([...ce.pages.filter(p=>p.kind===k),...e.pages.filter(p=>p.category===ct)],p=>p.page_id).slice(0,6)}; }
  if(lv==='category'&&id!=='cat:any') return n.examples;
  const subs=id==='cat:any'?(KIDS[id]||[]).filter(k=>N[k].level==='scenario').map(k=>(C[k]||{}).examples):(KIDS[ROOT]||[]).filter(k=>k!=='cat:any').map(k=>N[k].examples);
  const ex=subs.filter(Boolean); return ex.length?{requests:rr(ex.map(e=>e.requests),8),pages:rr(ex.map(e=>e.pages),9)}:null; }
/* the routing condition: one short line under the title, the detail behind "more" */
function condHTML(id){ const n=N[id], lv=n.level, o=(line,more)=>`<p class="cond">${line}</p>${more?`<details class="cmore"><summary>more</summary>${more}</details>`:''}`;
  if(lv==='root') return o(`Every request starts here; its task category and kind of page pick the next folders.`,`<p><b>README.md</b> and <b>quality.md</b> apply to every request. Then its task category (${COUNT.category-(N['cat:any']?1:0)} categories, the data's own label) and the kind of page it asks for pick the next folders.</p>`);
  if(n.id==='cat:any'){ const sc=(KIDS[id]||[]).filter(k=>N[k].level==='scenario');
    return o(`Kind level: requests whose category has too few pages of their kind.`,`<p>Not a task category. A request comes here when its own category has too few pages of the kind it asks for (${COUNT.fallback} such routes); every category's pages of that kind are pooled, because vote effects of looks differ by kind of page more than by category.</p><ul class="kinds">${sc.map(k=>`<li><a data-id="${esc(k)}">${esc(kdesc(C[k].kind))}</a><span class="to kl">${num(C[k].n_pages)} pages · from ${(FB[k]||[]).length} categor${(FB[k]||[]).length===1?'y':'ies'}</span></li>`).join('')}</ul>`); }
  if(lv==='category'){ const first=(n.text||'').match(/Real requests of this category in the data: ([^\n]+)/), K=CATK[id]||[];
    return o(`Requests labelled <b>${esc(n.title)}</b>; ${K.filter(k=>!k.kl).length} kinds of page have their own folder, ${K.filter(k=>k.kl).length} go to the kind level.`,`${first?`<p>${esc(first[1])}</p>`:''}<ul class="kinds">${K.map(k=>`<li><a data-id="${esc(k.kl?(KIDS[id]||[]).find(f=>N[f].level==='fallback'&&N[f].title===k.kind)||k.to:k.to)}">${esc(k.desc)}</a><span class="to${k.kl?' kl':''}">${pct(k.share)} → ${k.kl?'kind level':'own folder'}</span></li>`).join('')}</ul>`); }
  if(lv==='scenario'&&isKL(id)){ const k=(C[id]||{}).kind, fb=FB[id]||[], own=Object.values(N).filter(x=>x.level==='scenario'&&!isKL(x.id)&&(C[x.id]||{}).kind===k).map(x=>esc(C[x.id].category));
    return o(`<b>${esc(kdesc(k))}</b> from ${fb.length} categor${fb.length===1?'y':'ies'} too small to stand alone.`,`<p>From ${fb.map(f=>`${esc(N[N[f].parent].title)} (${pct(N[f].share)} of its pages)`).join(', ')||'none'}. Their category file sends them here, where every category's pages of this kind are pooled.${own.length?` Categories with their own folder for this kind (${own.join(', ')}) do not come here.`:''}</p>`); }
  if(lv==='scenario'){ const c=C[id]||{}, k=(CATK[catOf(id)]||[]).find(x=>x.kind===c.kind);
    return o(`<b>${esc(c.category)}</b> requests for <b>${esc(kdesc(c.kind))}</b>${k?` · ${pct(k.share)} of the category's pages`:''}.`); }
  if(lv==='fallback') return o(`<b>${esc(N[n.parent].title)}</b> requests for a <b>${esc(short(n.title))}</b>: read at the kind level.`,`<p>${pct(n.share)} of ${esc(N[n.parent].title)}'s real pages ask for this kind of page: too few for a folder of its own, so the route reads <code>${esc(N[n.target].file)}</code>, where every category's pages of this kind are pooled.</p>`);
  return ''; }
function pagesHTML(e,lv){ const P=(e&&e.pages)||[]; if(!P.length) return '';
  return `<div class="sec">Example pages · ${Math.min(4,P.length)} of ${P.length}, random</div>${grid4(' pg3',P.map(p=>{ const cap=`${p.place?placeTxt(p.place)+' · ':''}${p.model} · ${p.category} / ${short(p.kind)} · random page of this condition${p.request?` · request: “${p.request}”`:''}`; return `<figure><img src="${base}${esc(p.img)}" alt="${esc(p.model)} page" loading="lazy" data-lb data-lb-cap="${esc(cap)}"><figcaption>${placeHTML(p.place)}${esc(p.model)}${lv==='category'||lv==='root'||st.sel==='cat:any'?' · '+esc(short(p.kind)):''}</figcaption></figure>`; }))}`; }
function reqHTML(e,lv){ const R=(e&&e.requests)||[]; if(!R.length) return '';
  const mixed=lv!=='scenario'||isKL(st.sel), where=r=>lv==='category'?short(r.kind):isKL(st.sel)&&lv==='scenario'?r.category:mixed?`${r.category} / ${short(r.kind)}`:'';
  const li=r=>`<li title="${esc(SRC[r.source][2])}"><span title="${esc(r.text)}">${esc(r.text)}</span><small class="${SRC[r.source][0]}">${where(r)?esc(where(r))+' · ':''}${SRC[r.source][1]}</small></li>`;
  return `<div class="sec">Example requests · ${R.length}</div><ol class="rq">${R.slice(0,5).map(li).join('')}</ol>${R.length>5?`<details class="cmore"><summary>${R.length-5} more requests</summary><ol class="rq">${R.slice(5).map(li).join('')}</ol></details>`:''}
    <p class="none" style="font-size:11px">routed = the skill sends it here (an atlas demo, or a development prompt's stored reading); votes = a real request whose voted pages are mostly this kind. None from a sealed test set.</p>`; }
const nSty=sc=>{ const k=(KIDS[sc]||[]).filter(i=>N[i].level==='style'), w=k.filter(wd).length; return CUR?`${k.length-w} recommended styles${w?`, ${w} withheld`:''}`:`${k.length} styles`; };
function distHTML(id){ const n=N[id], lv=n.level;
  if(lv==='root'){ const pages=A.conditions.filter(c=>!isKL(c.id)).reduce((t,c)=>t+(c.n_pages||0),0); return `<div class="sec">Distribution</div><p><b>${COUNT.category-(N['cat:any']?1:0)}</b> task categories and the kind level, <b>${COUNT.scenario}</b> scenarios, <b>${CUR?COUNT.style-COUNT.withheld:COUNT.style}</b> ${CUR?`recommended styles (${COUNT.withheld} withheld)`:'styles'}, <span style="color:rgb(${NEG})">${COUNT.problem} problems</span>; ${num(pages)} real pages in the category scenarios.</p>`; }
  if(lv==='category'){ const sc=(KIDS[id]||[]).filter(k=>N[k].level==='scenario'), fb=(KIDS[id]||[]).filter(k=>N[k].level==='fallback'), st_=sc.flatMap(k=>(KIDS[k]||[]).filter(i=>N[i].level==='style')), w=st_.filter(wd).length;
    return `<div class="sec">Distribution</div><p><b>${num(catN(id))}</b> real pages in ${sc.length} scenario${sc.length===1?'':'s'}, ${st_.length-w} ${CUR?'recommended ':''}styles${w?` (${w} withheld)`:''}${fb.length?`; ${fb.length} kinds of page go to the kind level`:''}.</p>`; }
  if(lv==='scenario'){ const c=C[id]||{};
    return `<div class="sec">Distribution</div><p><b>${num(c.n_pages)}</b> real pages, ${num(c.n_votes)} votes${c.fallback&&!isKL(id)?' (fallback: the whole category)':''}; ${nSty(id)}, <span style="color:rgb(${NEG})">${(PBC[id]||[]).length} problems</span>.</p>${c.basis?`<p>${esc(c.basis)}.</p>`:''}`; }
  return ''; }
function nodePanel(){ const n=N[st.sel]; if(!n) return st.demo?'':`<h2>The skill as a map</h2><p>Every dot is a file of the skill (rings, inside out: root, task category, kind of page, style, and the style's example pages outermost; finer clusters beyond them; the counts per ring in the key in the map's corners; withheld styles as faint dots); red triangles are the regions to avoid that a scenario's file names; violet is the kind level <code>any/&lt;kind&gt;</code> and the dashed routes into it from categories with too few pages of a kind.</p><p>Pick a real request above and press ▶ to watch it walk the map, or click a node; double-click to focus a branch.</p>${md(N[ROOT].text)}`;
  const lv=n.level, rec=REC(n.id), {out,kl}=crumbs(n.id), inter=['root','category','scenario','fallback'].includes(lv);
  /* title line, then examples at once; then requests, distribution, the rest */
  let h=`<h2>${esc(n.title)}<span class="tag">${esc(lv==='fallback'?'fallback route':lv==='avoid'?'to avoid':isKL(n.id)&&lv!=='style'&&lv!=='problem'?'kind level':lv)}</span>${rec?`<span class="tag ${PB[n.id]?'neg':sign(rec)>0?'pos':''} ${tierOf(rec)===1?'lean':''}">${esc(rec.tier)}</span>`:''}${wd(n.id)?'<span class="tag wd">withheld</span>':''}${S[n.id]&&S[n.id].scope?`<span class="tag sct">${esc(scopeTag(S[n.id]))}</span>`:''}</h2>`;
  if(S[n.id]&&S[n.id].scope&&S[n.id].scope.note) h+=`<p class="wdr">${esc(S[n.id].scope.note)}</p>`;
  if(lv==='scenario'&&noRec(n.id)) h+=`<p class="wdr">No style recommended here${(C[n.id]||{}).no_style_route?': the route '+esc(C[n.id].no_style_route):''}.</p>`;   // what this version's router does, from the data
  if(wd(n.id)) h+=`<p class="wdr">Not suggested: ${esc((S[n.id].curation||{}).reason||whyKey(S[n.id]))}</p>`;
  if(inter){ const e=examplesOf(n.id); h+=condHTML(n.id)+pagesHTML(e,lv)+reqHTML(e,lv)+distHTML(n.id); }
  if(rec){ const v=rec.value, pb=!!PB[n.id];
    const au=audOf(rec), ims=au&&(au.examples||[]).length?au.examples.map(pid=>[{img:'../../pilot/thumbs/'+pid+'.webp',page_id:pid,place:(rec.audit_places||{})[pid]??pplOf(rec)[pid]},'example, no repeated image']):[...(rec.exemplars||[]).map(e=>[e,'chosen example']),...(rec.members_shown||[]).map(e=>[e,e.note||'member, not a chosen example'])];
    if(bound(au)) h+=`<p class="wdr"><span class="tag">${esc(bound(au))}</span> ${effs(au)||esc(au.note||au.reason||'')}</p>`;
    if(ims.length) h+=`<div class="sec">${(rec.exemplars||[]).length?'Examples':'Pages of this region'}</div>${grid4('',ims.map(([e,t])=>`<figure><img src="${base}${esc(e.img)}" alt="${esc(n.title)}: ${esc(t)}" loading="lazy" data-lb data-lb-cap="${e.place?placeTxt(e.place)+' · ':''}${esc(n.title)} · ${pb?'to avoid · ':''}${esc(t)}"><figcaption${pb?' class="neg"':''}>${placeHTML(e.place)}${esc(t)}</figcaption></figure>`))}`;
    h+=`<div class="sec">Distribution</div><p><b>${sg(v.effect)}</b> votes won per vote beyond model strength, 95% [${sg(v.lo)}, ${sg(v.hi)}], ${num(v.votes)} votes; held-out (semdev) ${sg(v.semdev)}.${pb?` ${rec.kind==='render_failure'?'A render failure':'A look'} that loses${rec.render_ok!=null||rec.render_ok_share!=null?`: ${pct(rec.render_ok??rec.render_ok_share)} of its pages render intact`:''}.`:''}</p>
      <p><b>${pct(rec.share)}</b> of this scenario's real pages${rec.n_in_condition!=null?` (${num(rec.n_in_condition)})`:rec.n_pages!=null?` (${num(rec.n_pages)})`:''} are in it${rec.n_members!=null?`; ${num(rec.n_members)} member pages in all`:''}.${n.subject?` Routed only when the request names <b>${esc(n.subject)}</b>.`:''}</p>`;
    if(pb) h+=`<div class="sec">The line the scenario's file gives</div><p class="pbt">${esc(rec.text)}</p>`;
    if(lv==='style'||lv==='problem'){ const fl=fineOf(n.id);   // one level below (item 60)
      h+=`<div class="sec">Inside this region · ${fl.length} finer cluster${fl.length===1?'':'s'}</div>`+(fl.length?fl.map(id=>{ const r=LF[id]; const bd=bound(r.audit); return `<div class="fine${bd?' bound':''}" data-id="${esc(id)}"><div class="fine-h"><b>${esc(r.name)}${bd?`<span class="tag">${esc(bd)}</span>`:''}</b><span class="ef ${r.value.effect>0?'pos':'neg'}">${sg(r.value.effect)} · ${esc(r.tier)} · ${r.n_in} pages</span></div>${bd&&effs(r.audit)?`<div class="none" style="font-size:11.5px">${effs(r.audit)}</div>`:''}${grid4(' fine-ex',r.members_shown.slice(0,2).map(e=>`<figure><img src="${base}${esc(e.img)}" alt="${esc(r.name)}" loading="lazy" data-lb data-lb-cap="${esc(r.name)} · ${esc(e.note)}"></figure>`))}</div>`; }).join('')
        :`<p class="none">No finer cluster holds inside this region (rule: at least 60 % of a cluster's pilot pages inside the outline, and at least 8). Rules and regions correspond from about 800 pages up; smaller mined regions are mostly not described.</p>`); }
    if(lv==='leaf') h+=`<p>${LF[n.id].n_in} of the cluster's ${LF[n.id].n_pilot} pilot pages lie inside <a data-id="${esc(n.parent)}">${esc(N[n.parent].title)}</a> (${pct(LF[n.id].share)}); ${num(LF[n.id].n_pages)} pages in all.</p>`;
    if((rec.profile||[]).length) h+=`<div class="sec">Profile</div><table class="pf2"><tr><th>label</th><th>in region</th><th>scenario</th><th>lift</th></tr>${rec.profile.map(p=>`<tr><td>${esc(p.key)} = ${esc(p.value)}</td><td>${pct(p.share_in)}</td><td>${pct(p.share_bg)}</td><td>${p.lift==null?'':(+p.lift).toFixed(1)+'×'}</td></tr>`).join('')}</table>`;
    if((rec.graph_nodes||[]).length) h+=`<div class="sec">In the concept graph</div><div class="links">${rec.graph_nodes.map(id=>`<a href="index.html?view=graph&concept=${encodeURIComponent(id)}">${esc(GN[id]||id)}</a>`).join('')}</div>`;
    if((rec.problems||[]).length) h+=`<div class="sec">What goes wrong near it</div>${rec.problems.map(p=>{ const id=typeof p==='string'&&(PB[p]?p:(A.problems||[]).find(x=>x.id===p||x.cluster===p||x.region===p)?._id); return id?`<div class="sg pb" data-id="${esc(id)}"><b>${esc(N[id].title)}</b><span class="ef">${sg(PB[id].value.effect)}</span></div>`:`<p>${esc(typeof p==='string'?p:p.name||JSON.stringify(p))}</p>`; }).join('')}`; }
  if(lv==='avoid') h+=kids(n.id).map(id=>`<div class="sg pb" data-id="${esc(id)}"><b>${esc(N[id].title)}</b><span class="ef">${PB[id].kind==='render_failure'?'render failure · ':''}${sg(PB[id].value.effect)} · ${pct(PB[id].share)}</span></div>`).join('');
  h+=`<div class="acts">${KIDS[n.id]?`<button class="b" data-act="fold">${st.open.has(n.id)?'Collapse':'Expand'} branch</button>`:''}${['category','scenario'].includes(lv)?`<button class="b" data-act="focus">${st.focus===n.id?'Show all':'Focus branch'}</button>`:''}</div>`;
  h+=`<div class="sec">Read in order</div><ol class="crumbs">${out.map(([f,id,t])=>`<li${id===n.id?' class="cur"':''}>${f?`<a data-id="${esc(id)}">${esc(f)}</a>`:`<span>${esc(t)}</span>`}</li>`).join('')}</ol>
    ${kl?`<p class="kl">Kind level: requests reach it from ${(FB[scOf(n.id)]||[]).map(i=>esc(N[N[i].parent].title)).join(', ')||'their category'}, after their own category's file.</p>`:''}`;
  const tx=lv==='fallback'?N[n.target]:lv==='problem'||lv==='avoid'?N[scOf(n.id)]:n;
  h+=tx.text?`<div class="sec">File · ${esc(tx.file)}</div>${md(tx.text)}`:`<p>${esc(tx.summary||'')}</p>`;
  return h; }
function side(){ const r=runPanel(), nd=nodePanel(); $('sidec').innerHTML=r+(r&&nd?'<hr style="border:0;border-top:1px solid var(--line);margin:16px 0 10px">':'')+nd;
  const last=st.demo&&!st.sel&&!slotId&&[...$('sidec').querySelectorAll('.sec')].pop(); if(last){ const sd=$('side'); sd.scrollTop=Math.max(0,last.getBoundingClientRect().top-sd.getBoundingClientRect().top+sd.scrollTop-sd.clientHeight*.3); } }   // keep the newest part of the run in view
$('side').addEventListener('click',e=>{ const mo=e.target.closest('.mo'); if(mo){ mo.parentNode.querySelectorAll('img[data-lb]')[4].click(); return; }
  const b=e.target.closest('[data-act]'); if(b){ const id=st.sel; if(b.dataset.act==='fold'){ st.open.has(id)?st.open.delete(id):st.open.add(id); render(); } else setFocus(st.focus===id?null:id); return; }
  const a=e.target.closest('[data-file],[data-id]'); if(!a) return; const id=a.dataset.id||(fileNode(a.dataset.file)||{}).id; if(id&&N[id]) select(id); });
$('side').addEventListener('mouseover',e=>{ const a=e.target.closest('.sg[data-id]'); hoverOn(a?a.dataset.id:null); });

/* the structure panel's header: counts per level and the legend */
function head(){
  $('hcount').innerHTML=`<span class="hdepth" title="Counts per level: the ring key on the map"><b>${esc(depthWords())}</b></span>`;   // item 71: the counts per level are the ring key
  const W=A.styles.filter(s=>s.suggested===false), byWhy={}; for(const s of W) byWhy[whyKey(s)]=(byWhy[whyKey(s)]||0)+1;
  $('hwd').innerHTML=W.length?`${W.length} styles not suggested (${Object.entries(byWhy).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${esc(k)} ${v}`).join(', ')}) ${st.wd?'shown greyed':'not drawn'} · <a href="#" id="wdT">${st.wd?'hide them':'show them greyed'}</a>`:'';
  const wt=$('wdT'); if(wt) wt.onclick=e=>{ e.preventDefault(); st.wd=!st.wd; if(st.sel&&!shown(st.sel)) st.sel=null; render(); };
  const m=matches(); $('hqn').textContent=m?`${m.size} match${m.size===1?'':'es'}`:'';
  $('hview').querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===st.view));
  $('hmap').hidden=st.view==='list'; $('treeC').hidden=st.view!=='list';
  const sc=cur(); $('hfocus').innerHTML=st.demo?`Step ${st.step+1} / ${STEPS.length} · ${esc(sc.cap||'')}`:gfocus()?`Focus: <b>${esc(N[gfocus()].title)}</b>${st.focus?' <a href="#" id="hall">show all</a>':''}`:m?`Search: ${m.size} match${m.size===1?'':'es'}`:'';   // the status line: the run's step, else the focus, else the search, else nothing
  const a=$('hall'); if(a) a.onclick=e=>{ e.preventDefault(); setFocus(null); };
  const dot=(c,extra='')=>`<i style="width:9px;height:9px;border-radius:50%;background:${c};${extra}"></i>`, tri=(c,fill=true)=>`<i style="width:10px;height:9px;${fill?`background:${c}`:`box-shadow:inset 0 0 0 1.5px ${c}`};clip-path:polygon(50% 0,100% 100%,0 100%);border-radius:0"></i>`;
  $('hleg').innerHTML=`<span>${dot(rgba(POS,1),`box-shadow:0 0 0 1.5px rgb(${POS})`)}style: size = share of its scenario's pages, colour strength = value; ring solid = clear, dashed = leaning${COUNT.withheld&&!st.wd?'; withheld styles are not drawn':', none = suggestive'}</span>
    ${COUNT.problem?`<span>${tri(rgba(NEG,1))}${tri(rgba(NEG,1),false)}problem to avoid (look, render failure), size = share</span>`:''}
    <span>${dot(css('--ice'))}scenario: size = its real pages</span>${COUNT.fallback?`<span>${dot(rgba(KL,1))}kind level <code>any/&lt;kind&gt;</code> ${dot('transparent',`border:1.5px dashed rgb(${KL})`)}a category's kind with too few pages, routed there (${COUNT.fallback} routes)</span>`:''}`; }
/* the popovers close on a click outside them and on Escape */
document.addEventListener('click',e=>{ for(const d of document.querySelectorAll('.hpop[open]')) if(!d.contains(e.target)) d.open=false; });

function render(){ if(window.PK) PK.refresh(); if(!render.fine){ render.fine=1; for(const s of A.styles) if(N[s.id]){ const f=fineOf(s.id); if(f.length) KIDS[s.id]=BASEK[s.id]=[...(BASEK[s.id]||[]),...f]; } }   // item 75: every style's finer clusters at rest
  syncFine(); if(!slotRaf) slotRaf=requestAnimationFrame(slotSync);
  HT=layout(); const vs=new Set(HT.vis); for(const id of Object.keys(HP)) if(!vs.has(id)) delete HP[id]; head(); if(st.view==='list') list(); side(); caption(); hkick();
  ['bRe','bPrev','bPlay','bNext'].forEach(b=>$(b).disabled=!st.demo);
  { const f=focus(), fk=JSON.stringify([f.cond,f.cat,f.members,!!f.overview,!!f.arms]); if(fk!==render.fk){ render.fk=fk; if(zoomed(MZ)) MZ.fit(); } }   // a new selection is framed afresh
  T=target(); requestAnimationFrame(glide);
  const qs=new URLSearchParams(Object.entries({v:ver!==have[0]?ver:'',demo:st.demo||'',node:st.sel||'',focus:st.focus||''}).filter(e=>e[1])).toString();
  if((qs?'?'+qs:'')!==location.search) history[PUSH?'pushState':'replaceState'](null,'',qs?'?'+qs:location.pathname);
  pgSaveSoon();
}
let PUSH=false, pgT=0, PGOFF=false;   /* PGOFF: a Reset that loads the default version saves nothing on its way out */
function pgSave(){ clearTimeout(pgT); if(PGOFF) return; try{ const h=HZ.get(), m=MZ.get(), atRest=!st.demo&&!st.sel&&!st.focus&&st.view==='map'&&ver===have[0]&&!h.x&&!h.y&&h.z===1&&!m.x&&!m.y&&m.z===1;
  if(atRest){ sessionStorage.removeItem(PGK); return; }
  const q=new URLSearchParams(Object.entries({v:ver,demo:st.demo||'',step:st.demo?String(st.step):'',node:st.sel||'',focus:st.focus||''}).filter(e=>e[1])).toString();
  sessionStorage.setItem(PGK,JSON.stringify({q,u:location.search,view:st.view,hz:h,mz:m})); }catch(e){} }
const pgSaveSoon=()=>{ clearTimeout(pgT); pgT=setTimeout(pgSave,200); };   // the first render only tidies the address; after it every change of selection, run or focus is a history entry
addEventListener('popstate',()=>{ const U=new URLSearchParams(location.search);
  if((U.get('v')||have[0])!==ver){ location.reload(); return; }
  const dm=DM[U.get('demo')]?U.get('demo'):null; if(dm!==st.demo){ play(false); st.demo=dm; STEPS=steps(DM[dm]); st.step=dm?STEPS.length-1:0; $('demo').value=dm||''; openWalk(); }
  st.sel=N[U.get('node')]?U.get('node'):null; st.focus=N[U.get('focus')]?U.get('focus'):null;
  for(const id of [st.sel,st.focus].filter(Boolean)) for(const a of anc(id)) if(KIDS[a]) st.open.add(a);
  PUSH=false; render(); PUSH=true; });
new ResizeObserver(()=>size()).observe(cv); new ResizeObserver(()=>hsize()).observe(hcv);
/* the three columns fill the window below the header (the header's height depends on the version's status and strip) */
{ const fit=()=>PgFrame.fit(document.querySelector('.pgrid')); window.PgFrame?fit():addEventListener('load',fit); }   // item 81: the grid fills the viewport below the header (page.css --work-h, at least 480 px)
window.PK=Picker.attach($('demo'),{footer:window.__demoFoot}); fillDemos(); size(); render(); hsize(); PUSH=true;
{ const okv=v=>v&&isFinite(v.z)&&isFinite(v.x)&&isFinite(v.y);   /* restore the view of the stored state, then keep saving it */
  if(PGS&&(!location.search||(PGS.u||'')===location.search||!new URLSearchParams(location.search).toString().replace(/(^|&)v=[^&]*/,''))){
    if(PGS.view==='list'||PGS.view==='map') st.view=PGS.view; render(); setTimeout(()=>{ if(okv(PGS.hz)){ HZ.set(PGS.hz); HZ.claim(); } if(okv(PGS.mz)) MZ.set(PGS.mz); },350); }
  addEventListener('pagehide',pgSave); }

/* column dividers: the shared module (columns.js); widths kept for the session */
const COLS=Columns.attach(document.querySelector('.pgrid'),{key:'pipeline.cols',mins:[300,260,260],storage:'session',narrow:1303}), setCols=w=>COLS.set(w);
window.PIPE={A,N,st,STEPS:()=>STEPS,go,setDemo,play,focus,render,setFocus,depth,vpath,reset,escStep,setCols,select,view:()=>({k,ox,oy,home:home().k}),
  hier:()=>({vis:HT.vis.slice(),drawn:HN.map(h=>({id:h.id,level:N[h.id].level,x:h.x,y:h.y,ghost:!!h.g})),lit:LIT.slice(),focus:gfocus(),labels:LBL.map(l=>({...l})),caps:RCAPS.slice(),links:LNK.slice(),badges:BADGE.map(b=>({...b})),R:HR,T:Object.fromEntries(Object.entries(HT.T).map(([k,t])=>[k,{a0:t.a0-Math.PI/2,a1:t.a1-Math.PI/2,a:t.a,r:t.r,col:t.col,y:t.y}])),view:HZ.get(),size:[HW,HH]}),hz:HZ,mz:MZ,counts:()=>({...CNT}),mview:()=>({...MZ.get(),eff:eff()}),regions:()=>DRAWN.slice(),COUNT,
  lit:()=>{ const L=litPairs(); return {bright:[...L.nodes],cand:[...L.cand],off:[...L.off],exThin:[...L.exThin],exDash:[...L.exDash],grown:st.demo?[...new Set([ROOT,...L.nodes,...L.cand])]:[],path:L.pairs.filter(p=>p[2]==='path').map(p=>p[1]),sug:L.pairs.filter(p=>p[2]==='sug'||p[2]==='chosen').map(p=>p[1]),warn:L.pairs.filter(p=>p[2]==='warn'&&N[p[1]].level==='problem').map(p=>p[1]),now:L.now}; },
  look:id=>look(id,99),replay,redraw:()=>{ hstep(); hdraw(); T=null; ({k,ox,oy}=target()); draw(); }};   // for tests
})();
