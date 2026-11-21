/* Arena for the data pipeline: one prompt at a time, exactly three pages side by side (Base, taste.md, Data pipeline)
   and the judges' verdicts on the three pairs; plus a grid of all first screens per arm, where variety shows at a glance.
   Data: data/ab/model/ab.json (the run for the target model; arms base, taste, pipeline) when present, else data/ab/v2/ab.json
   (arms N, A, Bx; its fixed-text arm B shows only under "Earlier runs"), data/ab/ab.json (first runs), data/pipeline/pipeline.json.
   The ab files have the same shape, written by dual/ab/assemble.py. Layout follows the first study's arena. */
(()=>{
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct=x=>x==null?'n/a':Math.round(x*100)+'%', num=n=>n.toLocaleString('en-US');
const get=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
const rng=s=>!s||s.share_b==null?'no decisive verdicts':`${pct(s.share_b)} (95% interval ${pct(s.lo)} to ${pct(s.hi)})`;
const level=s=>!s||s.share_b==null?'':s.lo>.5?'ahead':s.hi<.5?'behind':'level';
const short=id=>id.split('/').pop(), look=id=>{ const t=String(id||'').replace(/^style_/,'').replace(/_/g,' '); return t.charAt(0).toUpperCase()+t.slice(1); };
const view=document.getElementById('view');

// the model run is requested only where the folder listings show it (or the server gives no listing), so its absence logs no 404
const list=u=>fetch(u).then(r=>r.ok?r.text():'').catch(()=>'');
list('data/ab/').then(async ls=>!ls.includes('href=')||(ls.includes('"model/"')&&(await list('data/ab/model/')).includes('"ab.json"'))).then(has=>
Promise.all([has?get('data/ab/model/ab.json'):null,get('data/ab/v2/ab.json'),get('data/ab/ab.json'),get('data/pipeline/pipeline.json'),get('data/pilot/graph_layered.json')])).then(async([mod,v2,old,pipe,graph])=>{
  const RUNS={}; if(mod) RUNS.model={d:mod,base:'data/ab/model/'}; if(v2) RUNS.v2={d:v2,base:'data/ab/v2/'}; if(old) RUNS.old={d:old,base:'data/ab/'};
  if(!Object.keys(RUNS).length){ view.innerHTML='<h1>No arena data yet</h1><p class="sub">data/ab/ab.json is missing.</p>'; return; }
  // "Earlier runs" also holds the latest file with every arm when it has more than the three shown (v2's fixed text, a general-pipeline arm of the model run)
  const LATEST=Object.keys(RUNS)[0], EARLY=['model','v2','old'].filter(k=>RUNS[k]&&(k!='model'||Object.keys(mod.arms).length>3));
  const SKILL=mod?'../skills/taste-gemini-37-flash/':'../skills/taste-adaptive/', skill=await get(SKILL+'manifest.json');
  const S={run:LATEST,early:false,model:null,i:-1,grid:false,list:'featured',L:[]};   // i indexes the run's prompts; L = the indices in the list on show
  const cur=()=>RUNS[S.run], prompts=()=>cur().d.prompts.filter(p=>p.models[S.model]);
  /* pipeline versions of the model run (arms named pipeline*): one is on show as "Data pipeline", chosen in its pane's header; the others are hidden arms */
  const PVS=mod?Object.keys(mod.arms).filter(k=>/^pipeline/.test(k)):[]; let PV=mod&&mod.arms[mod.display_arm]?mod.display_arm:'pipeline';
  const pvName=k=>k=='pipeline'?'v1':k.replace(/^pipeline_?/,'').replace(/_/g,' ');
  const ARMS=d=>d.arms.pipeline?['base','taste',d===mod?PV:'pipeline']:['N','A',d.arms.Bx?'Bx':'B'];   // [Base, taste.md, Data pipeline] of a run
  const X=d=>ARMS(d)[2];
  const NAME=d=>{ const [n,a,x]=ARMS(d); return {...Object.fromEntries(Object.keys(d.arms).map(k=>[k,/^pipeline/.test(k)?'Data pipeline '+pvName(k):k])),B:'Pipeline, one fixed text',general:'General pipeline',fdp:'frontend-design-pro',[n]:'Base',[a]:'taste.md',[x]:'Data pipeline'}; };
  // a page that did not render: no first screen, a blank one, or generation cut at the token limit
  const BAD=g=>!g||!g.rendered?'not generated':g.blank?'did not render':g.finish=='length'?'cut at the token limit':'';
  const NOTES=d=>{ const [n,a,x]=ARMS(d); return {B:'the same rules, not routed',general:'the skill tree not built for this model',[n]:'the prompt alone',[a]:"the first study's taste file",[x]:/^pipeline/.test(x)?'overall rules + the routed skill, built for this model':x=='Bx'?'overall rules + the routed skill':'guidance from the concept graph'}; };
  /* verdict share of arm a against arm b, whichever way round the file stores the pair */
  const flip=s=>s&&{...s,share_b:s.share_b==null?null:1-s.share_b,lo:1-s.hi,hi:1-s.lo,prefer_b:s.prefer_other,prefer_other:s.prefer_b,neither_cut:flip(s.neither_cut)};
  const pairKey=(d,a,b)=>[[a,b],[b,a]].flatMap(([p,q],r)=>['v','_v_','_vs_','vs'].map(j=>[p+j+q,r])).find(([k])=>d.comparisons[k])||[];
  const stat=(d,a,b,m)=>{ const [k,r]=pairKey(d,a,b), c=k&&d.comparisons[k], s=c&&(m?c.by_model[m]:c.all); return r?flip(s):s; };
  /* per prompt, for the pipeline: verdicts of a pair, its votes, won (majority over taste.md and over Base) / lost (over neither) / mixed, and the featured order */
  const VS=(d,m,q,f,o)=>q.models[m].verdicts[pairKey(d,f,o)[0]]||[];
  const VOTES=(d,m,q,o)=>{ const x=X(d), v=VS(d,m,q,x,o); return [v.filter(z=>z.winner==x).length,v.filter(z=>z.winner==o).length]; };
  const RES=(d,m,q)=>{ const [n,a]=ARMS(d), [a1,b1]=VOTES(d,m,q,a), [a2,b2]=VOTES(d,m,q,n); return a1>b1&&a2>b2?'w':a1<b1&&a2<b2?'l':''; };
  const SPREAD=(m,q)=>{ const v=q.models[m].arm_spread??q.arm_spread; return (v&&v.value)??v??0; };
  // featured: an open brief the pipeline won, and only when all three pages on show rendered
  const WINS=(d,m,P)=>{ const [n,a]=ARMS(d), pv=q=>VOTES(d,m,q,a)[0]+VOTES(d,m,q,n)[0]; return P.filter(q=>!q.style_named&&RES(d,m,q)=='w'&&ARMS(d).every(k=>!BAD(q.models[m].pages[k]))).sort((u,v)=>pv(v)-pv(u)||SPREAD(m,v)-SPREAD(m,u)); };
  const setRun=r=>{ S.run=r; S.model=Object.keys(cur().d.generators)[0]; S.i=-1; S.grid=false; S.list='featured'; };
  setRun(S.run);

  /* header: the latest test in one sentence, one line of stages, the rules behind a disclosure */
  const L=RUNS[LATEST].d, [ln,la,lx]=ARMS(L), H=stat(L,lx,la)||{}, gens=Object.keys(L.generators);
  const q={ahead:'ahead of',level:'level with',behind:'behind'}[level(H)]||'not yet compared with';
  const per=gens.length>1?` (${gens.map(g=>{ const s=stat(L,lx,la,g); return `${short(L.generators[g])} ${pct(s.share_b)}, ${level(s)}`; }).join('; ')})`:'';
  const tot=(arm,k)=>{ let a=0,b=0; gens.forEach(g=>{ const f=L.by_arm[g][arm][k]; if(f){ a+=f.pages; b+=f.of; } }); return b?a/b:null; };
  const fitX=tot(lx,'fit_recommended'), fitA=tot(la,'fit_recommended');
  const looksOf=arm=>gens.map(g=>L.by_arm[g][arm].distinct_looks).join(' and ');
  const second=fitX==null?'':`Its pages land in a look recommended for their kind of site ${pct(fitX)} of the time, taste.md's ${pct(fitA)}. Different looks per generator: ${looksOf(lx)} against ${looksOf(la)}. `;
  // the same share over open briefs only (prompts that name no style), counted from the verdicts; shown when the file marks them
  const OP=L.prompts.filter(q=>!q.style_named), ok=pairKey(L,lx,la)[0]; let ow=0, ol=0;
  OP.forEach(q=>gens.forEach(g=>((q.models[g]||{verdicts:{}}).verdicts[ok]||[]).forEach(v=>{ if(v.winner==lx) ow++; else if(v.winner==la) ol++; })));
  const oc=(L.comparisons[ok]||{}).open, os=oc&&(oc.all||oc);   // the file's own open-brief figure, with its interval, when it has one
  const openTxt=OP.length<L.prompts.length&&ow+ol?` On the ${OP.length} open briefs (prompts that name no style) it is ${os&&os.share_b!=null&&!pairKey(L,lx,la)[1]?rng(os):pct(ow/(ow+ol))+`, ${ow} of ${ow+ol} decisive verdicts`}.`:'';
  const R=pipe&&pipe.rules, c=R&&R.counts, st=pipe&&pipe.manifest.stages;
  const nRules=c?['avoid','avoid_looks','avoid_parts','looks','do'].reduce((a,k)=>a+(c[k]||0),0):0;
  const li=(n,sign)=>`<li>${sign} ${esc(n.name)}<span>${n.pref>0?'+':'−'}${Math.abs(n.pref*100).toFixed(1)} pp per vote · ${num(n.n)} pages${n.basis?' · '+esc(n.basis):''}</span></li>`;
  const rules=R?`<div class="rules" id="rules" hidden>
    <div><h3 class="av">Avoid</h3><ul>${[...(R.avoid||[]),...(R.avoid_looks||[]),...(R.avoid_parts||[])].map(n=>li(n,'−')).join('')||'<li>none</li>'}</ul></div>
    ${R.looks?`<div><h3 class="do">Looks, one per page</h3><ul>${R.looks.map(n=>li(n,'+')).join('')}</ul><p>For each prompt the pipeline names the look voters favoured for that kind of site.</p></div>`:''}
    <div><h3 class="do">Use</h3><ul>${R.do.map(n=>li(n,'+')).join('')}</ul></div>
    <div><h3 class="nu">Not rules</h3><p>${c.dropped_replication||0} concepts dropped because their sign did not reappear on held-out prompts${R.dropped_replication?` (${R.dropped_replication.map(n=>esc(n.name)).join(', ')})`:''}; ${c.neutral} with no evidence either way.</p>
    <p style="margin-top:8px">The skill tree routes each task: <a href="${SKILL}SKILL.md">SKILL.md</a> → category → look → <a href="${SKILL}overall.md">overall.md</a>. <a href="data/pipeline/guidance.md">The fixed guidance text</a> is the same rules without routing.</p></div></div>`:'';
  const strip=pipe?`<div class="strip">
    <span class="s"><b>${num(st.votes)}</b>votes</span><i>→</i>
    <span class="s"><b>${num(st.pages_labelled)}</b>labelled pages</span><i>→</i>
    <span class="s"><b>${graph?graph.nodes.length+' / '+graph.edges.length:R.nodes}</b>graph nodes / links</span><i>→</i>
    <span class="s"><b>${skill?Object.keys(skill.files).length+1:nRules}</b>${skill?`<a href="${SKILL}SKILL.md">skill tree files</a>`:'rules'}</span><i>→</i>
    <span class="s out"><b>${L.pages.generated}</b>generated pages</span>
    <span class="sp"></span>
    <button class="b" id="showRules" aria-expanded="false">Show the rules</button>
    <a class="b" href="data/pipeline/manifest.json">Data pack and files</a>
    <button class="b" id="theme">Light</button></div>${rules}`:'';
  view.innerHTML=`<button class="b" id="detX">← Back to the arena</button><div class="eb" style="margin-top:18px">Arena details · Base, taste.md, Data pipeline</div>${L.standin?'<p class="standin"><b>Stand-in data</b> in the shape of the model run: not real results.</p>':''}
    <h1>On ${H.prompts??L.prompts.length} fresh prompts generated by ${gens.map(g=>esc(short(L.generators[g]))).join(' and ')}, the data pipeline is <em>${q} taste.md</em> on quality: judges preferred it in ${rng(H)} of decisive verdicts${per}.</h1>
    <p class="sub">${openTxt?'All '+L.prompts.length+' prompts are counted above.'+openTxt+' ':''}${second}Against Base (the prompt alone) the data pipeline is ${level(stat(L,lx,ln))||'not compared'} (${rng(stat(L,lx,ln))}); taste.md against Base is ${level(stat(L,la,ln))||'not compared'} (${rng(stat(L,la,ln))}).</p>
    <p class="sub" style="margin-top:6px">Same prompt, same model, different system message. Three vision models compare first screens blind. The guidance is text in the prompt; no model was trained.</p>
    ${strip}<div id="det"></div>`;
  const rb=document.getElementById('showRules');
  if(rb) rb.onclick=()=>{ const el=document.getElementById('rules'); el.hidden=!el.hidden; rb.textContent=el.hidden?'Show the rules':'Hide the rules'; rb.setAttribute('aria-expanded',!el.hidden); };
  const tb=document.getElementById('theme'), root=document.documentElement;
  if(tb) tb.onclick=()=>{ const dark=root.dataset.theme!=='dark'; root.dataset.theme=dark?'dark':'light'; tb.textContent=dark?'Light':'Dark'; };

  function draw(){
    const {d,base}=cur(), P=prompts(), m=S.model, show=ARMS(d), [bN,bA,x]=show, C=d.comparisons, name=NAME(d), NOTE=NOTES(d), F=d.first_run, ba=d.by_arm[m];
    const a=stat(d,x,bA,m), n=stat(d,x,bN,m), routed=x!='B';
    const vs=(q,f,o)=>VS(d,m,q,f,o), res=q=>RES(d,m,q), spread=q=>SPREAD(m,q);
    /* open briefs name no style (style_named false; a file without the field treats every prompt as open). Featured = open briefs the pipeline won,
       most judge votes first, then most different across arms; with none won, the open briefs by arm_spread. Only the one-prompt list uses it. */
    const open=P.filter(q=>!q.style_named), flagged=P.some(q=>'style_named' in q), wins=WINS(d,m,P), feat=wins.length?wins:[...open].sort((u,v)=>spread(v)-spread(u));
    S.L=(S.list=='all'?P:feat).map(q=>P.indexOf(q)); if(!S.L.includes(S.i)) S.i=S.L[0];
    const p=P[S.i], li=S.L.indexOf(S.i);
    /* one colour per labelled look, shared by the strips and the pages */
    const pageOf=(q,arm)=>q.models[m].pages[arm]||{}, LOOKS=[...new Set(P.flatMap(q=>show.map(k=>pageOf(q,k).look)).filter(Boolean))].sort();
    const lk=l=>l?`<i class="lk" style="--c:hsl(${(LOOKS.indexOf(l)*137.5)%360} 60% 64%)">${look(l)}</i>`:'<i class="lk none">not labelled</i>';
    const strip=arm=>{ const ls=open.map(q=>pageOf(q,arm).look).filter(Boolean), cnt={}; ls.forEach(l=>cnt[l]=(cnt[l]||0)+1);
      return `<div class="srow${arm==x?' new':''}"><div class="sh"><b>${name[arm]}</b><span>${ls.length?`${Object.keys(cnt).length} different looks · ${pct(Math.max(...Object.values(cnt))/ls.length)} in the most common one`:'looks not labelled'}</span></div>
        ${open.map(q=>{ const g=pageOf(q,arm), j=P.indexOf(q); return `<button data-i="${j}" data-list="all" title="Prompt ${j+1} · ${esc(q.subcategory)}">${g.rendered?`<img loading="lazy" src="${base}shots/${q.prompt_id}_${m}_${arm}.webp" alt="">`:'<span class="no">none</span>'}${lk(g.look)}</button>`; }).join('')}</div>`; };
    const strips=S.early?'':`<div class="card strips"><div class="sl"><b>The looks each arm produced</b> on the ${open.length} ${flagged?'open briefs (prompts that name no style)':'prompts (the data does not mark which name a style, so all count as open briefs)'}, same prompt in each column. ${LOOKS.map(lk).join('')}</div>
      <div class="sx">${show.map(strip).join('')}</div></div>`;
    /* per arm: quality against taste.md, variety, task fit */
    const qual=arm=>arm==bA?['—','reference']:(s=>s&&s.share_b!=null?[pct(s.share_b),`${pct(s.lo)}–${pct(s.hi)} · ${level(s)}`]:['n/a','not judged'])(stat(d,arm,bA,m));
    const score=arm=>{ const z=ba[arm], [qv,qn]=qual(arm), f=z.fit_recommended, cl=z.clip;
      return `<div class="card sc${arm==x?' new':''}"><h4>${name[arm]}</h4><div class="k3">
        <div><b>${qv}</b><span>quality vs taste.md</span><small>${qn}</small></div>
        <div><b>${z.distinct_looks??'n/a'}</b><span>different looks</span><small>${z.look_entropy_bits!=null?z.look_entropy_bits.toFixed(2)+' bits'+(cl?` · CLIP ${cl.mean_pairwise_distance.toFixed(2)}`:''):'not labelled'}</small></div>
        <div><b>${f?pct(f.share):'n/a'}</b><span>task fit</span><small>${f?`${f.pages} of ${f.of} pages in a recommended look`:'no context data'}</small></div></div></div>`; };
    /* every pairwise comparison the file holds, hidden arms included */
    const AK=Object.keys(d.arms), cmpRows=Object.keys(C).map(k=>{ const pr=AK.flatMap(f=>AK.map(o=>[f,o])).find(([f,o])=>f!=o&&[f+'v'+o,f+'_v_'+o,f+'_vs_'+o,f+'vs'+o].includes(k)), z=C[k].by_model&&C[k].by_model[m]||C[k].all; return pr&&z?{pr,z,o:C[k].open&&(C[k].open.all||C[k].open)}:null; }).filter(Boolean);
    const pairs=cmpRows.length?`<div class="card probs"><h4>Every pairwise comparison in this test · ${esc(short(d.generators[m]))}</h4><div class="tw"><table><tr><th>Preferred</th><th>over</th><th>Share of decisive verdicts</th><th>95% interval</th><th></th><th>Verdicts</th><th>Prompts</th>${cmpRows.some(r=>r.o)?'<th>Open briefs only</th>':''}</tr>
      ${cmpRows.map(({pr,z,o})=>`<tr><td>${name[pr[0]]}</td><td>${name[pr[1]]}</td><td>${pct(z.share_b)}</td><td>${pct(z.lo)} to ${pct(z.hi)}</td><td class="${level(z)}">${level(z)}</td><td>${z.prefer_b??''} to ${z.prefer_other??''}${z.ties?`, ${z.ties} ties`:''}</td><td>${z.prompts??''}</td>${cmpRows.some(r=>r.o)?`<td>${o&&o.share_b!=null?`${pct(o.share_b)} (${pct(o.lo)} to ${pct(o.hi)}, ${o.prompts} prompts)`:''}</td>`:''}</tr>`).join('')}</table></div>
      <p>Share = verdicts for the first arm among verdicts that picked a side. “level” = the interval includes 50%.</p></div>`:'';
    const arms=(S.early?Object.keys(d.arms):show).filter(k=>ba[k]&&ba[k].pages);   // extra arms (the fixed text) only under "Earlier runs"
    const pane=arm=>{ const g=p.models[m].pages[arm], k=`${p.prompt_id}_${m}_${arm}`, flag=BAD(g), cx=p.context;
      // above the pipeline's page: its route (category -> candidate looks -> the look picked); the other arms have none
      const route=arm==x&&routed&&cx?`<span class="rt">category · ${esc(cx.context)}</span> → ${(cx.candidates?cx.candidates.map(c=>c[0]):cx.recommended||[]).map(l=>`<span class="rt">${look(l)}</span>`).join(' ')||'<span class="rt">no candidates</span>'} → <span class="rt pk">${cx.look?'picked · '+look(cx.look):'no look picked'}</span>`:`No route: ${NOTE[arm]}.`;
      return `<div class="card pane${arm==x?' new':''}"><div class="ph"><b>${name[arm]}</b><span>${NOTE[arm]}</span>${flag?`<span class="flag">${flag}</span>`:''}</div><div class="rl">${route}</div>
        ${g&&g.rendered?`<a class="stage" href="${base}pages/${k}.html" target="_blank" rel="noopener" title="Open the generated page"><img src="${base}shots/${k}.webp" alt="${name[arm]}: first screen of the generated page">${lk(g.look)}</a>`:'<div class="stage"><div class="no">not generated</div></div>'}</div>`; };
    const verd=(f,o)=>`<div class="card vc"><h4><b>${name[f]}</b> against <b>${name[o]}</b></h4>${vs(p,f,o).map(v=>`<span class="chip ${v.winner==f?'w':v.winner==o?'l':''}" title="${esc(v.reason)}">${esc(short(d.judges[v.judge]))} <em>${v.winner==f?'✓ '+name[f]:v.winner==o?'✗ '+name[o]:'tie'}</em></span>`).join('')||'<span class="chip">no verdicts</span>'}</div>`;
    /* the model's known problems: share of each arm's pages that show them (rows as the file gives them: per-arm numbers or {share}) */
    const pr=d.problem_rates||d.problems, prow=Array.isArray(pr)?pr:Object.entries(pr||{}).map(([id,v])=>({id,...v}));
    const rate=(r,k)=>{ const v=((ba[k]||{}).problems||{})[r.id]??(r.rates||r.by_arm||r)[k]; return v==null?'n/a':typeof v=='object'?`${pct(v.share)}${v.of?` · ${v.pages} of ${v.of}`:''}`:pct(v); };
    const probs=prow.length&&!S.early?`<div class="card probs"><h4>The model's known problems: how often each appears in the generated pages</h4><div class="tw"><table><tr><th>Problem</th>${show.map(k=>`<th>${name[k]}</th>`).join('')}</tr>
      ${prow.map(r=>`<tr><td>${esc(r.name||r.statement||look(r.id))}</td>${show.map(k=>`<td>${rate(r,k)}</td>`).join('')}</tr>`).join('')}</table></div><p>Share of each arm's pages on which the project's labeler finds the problem. Lower is better.</p></div>`:'';
    const sheet=arm=>{ const z=ba[arm]; return `<div class="card sheet${arm==x?' new':''}"><div class="ph"><b>${name[arm]}</b><span>${z.distinct_looks!=null?`${z.distinct_looks} different looks · most common on ${pct(z.top_look_share)} of pages${z.clip?` · CLIP distance ${z.clip.mean_pairwise_distance.toFixed(2)}`:''}`:''}</span></div>
      <div class="grid">${P.map((q,j)=>{ const g=q.models[m].pages[arm]; return g&&g.rendered?`<button data-i="${j}" title="Prompt ${j+1} · ${esc(q.subcategory)}${g.look?' · '+look(g.look):''}"><img loading="lazy" src="${base}shots/${q.prompt_id}_${m}_${arm}.webp" alt=""></button>`:'<button disabled></button>'; }).join('')}</div></div>`; };
    const cx=p.context;
    document.getElementById('det').innerHTML=`
      <div class="scores">${arms.map(score).join('')}</div>${strips}${pairs}
      <div class="ctl">
        <div class="g"><span class="l">Generator</span>${Object.keys(d.generators).map(k=>`<button class="b${k==m?' on':''}" data-model="${k}">${esc(short(d.generators[k]))}</button>`).join('')}</div>
        <div class="g"><span class="l">View</span><button class="b${S.grid?'':' on'}" data-grid="0">One prompt</button><button class="b${S.grid?' on':''}" data-grid="1">All pages</button></div>
        ${S.grid?'':`<div class="g"><button class="b" data-step="-1" ${li?'':'disabled'}>‹ Previous</button><button class="b" data-step="1" ${li<S.L.length-1?'':'disabled'}>Next prompt ›</button></div>`}
        <span class="sp"></span>
        ${S.early?EARLY.map(k=>`<button class="b sm${k==S.run?' on':''}" data-run="${k}">${k=='model'?'This test, all arms':k=='v2'?'General skill tree, all arms':'First runs (sonnet)'}</button>`).join(''):''}
        ${EARLY.length?`<button class="b sm" data-early="${S.early?0:1}">${S.early?'Back to the latest test':'Earlier runs'}</button>`:''}
      </div>
      ${S.early&&S.run=='v2'?`<p class="run"><b>Earlier run: the general skill tree${mod?', not built for one model':''}.</b> Every arm of that test is listed, including the pipeline's rules as one fixed text.</p>`:''}
      ${S.run=='old'?`<p class="run"><b>Earlier runs (sonnet generator, superseded).</b> Guidance v1 turned every clear node into one fixed rule list. ${F?`First run (${num(F.max_tokens)}-token limit, confounded by cut-off pages): ${rng(F.comparisons.BvA)}. `:''}Second run, ${num(d.max_tokens)}-token limit, ${esc(short(d.generators[m]))}: against the baseline ${rng(a)}; against no guidance ${rng(n)}.</p>`:''}
      ${S.grid?`<div class="sheets">${sheet(bA)}${sheet(x)}</div><p class="run">Every first screen of the ${P.length} prompts, same order in both sheets. Click one to open its prompt.</p>`:`
      <p class="run fl">${S.list=='all'?`<b>All ${P.length} prompts</b> in their original order. Dot: green = a majority of judges preferred Data pipeline over both taste.md and Base (${P.filter(q=>res(q)=='w').length}), red = over neither (${P.filter(q=>res(q)=='l').length}), grey = mixed (${P.filter(q=>!res(q)).length}).`
        :wins.length?`<b>Featured: ${wins.length} of ${open.length} open briefs</b> where a majority of judges preferred Data pipeline over both taste.md and Base, most judge votes first. These are its wins, not a typical sample.`
        :`<b>No open brief</b> was won by Data pipeline over both taste.md and Base, so the ${open.length} open briefs are listed, most different across the arms first.`}
        ${S.list=='all'||flagged?'':'The data does not mark which prompts name a style, so all count as open briefs.'}
        <button class="b sm" data-list="${S.list=='all'?'featured':'all'}">${S.list=='all'?'Back to featured':`See all ${P.length} prompts`}</button></p>
      <div class="pick" role="tablist" aria-label="Prompts">${S.L.map(j=>{ const q=P[j], w=res(q); return `<button class="${j==S.i?'on ':''}${w}" data-i="${j}" title="${esc(q.subcategory)} · judges ${w=='w'?'prefer the data pipeline over both':w=='l'?'prefer both others':'are mixed'}">${j+1}</button>`; }).join('')}</div>
      <div class="card prompt"><div class="meta"><span>${p.prompt_id}</span><span>${esc(p.subcategory)}</span><span>${p.month}</span><span>${esc(p.language)}</span></div><q>${esc(p.prompt)}</q>
        ${cx&&routed?`<p class="cx">Route taken by the skill tree: <a class="rt" href="${SKILL}category/${esc(cx.context)}.md">category · ${esc(cx.context)}</a> → ${cx.look?`<a class="rt" href="${SKILL}style/${cx.look.replace('style_','')}.md">look · ${look(cx.look)}</a>`:'<span class="rt">no look routed</span>'} → ${(cx.files||[]).filter(f=>/^(cell|overall)/.test(f)).map(f=>`<a class="rt" href="${SKILL}${f}">${f}</a>`).join(' + ')}${cx.evidence?` <span class="st">link: ${cx.evidence}</span>`:''}${(cx.avoid||[]).length?` <span class="st">avoid: ${cx.avoid.map(look).join(', ')}</span>`:''}</p>`:''}</div>
      <div class="panes">${show.map(pane).join('')}</div>
      <div class="verd">${verd(x,bA)}${verd(x,bN)}${verd(bA,bN)}</div>${probs}`}
      <details class="about"><summary>About this test and its limits</summary>
        <div class="tw"><table><tr><th>${esc(short(d.generators[m]))}</th><th>Pages</th><th>Ended at the ${num(d.max_tokens)}-token limit</th><th>Blank first screen</th><th>Shows an avoided look</th><th>Looks seen</th></tr>
        ${arms.map(k=>`<tr><td>${name[k]}</td><td>${ba[k].pages}</td><td>${ba[k].cut_at_max_tokens}</td><td>${ba[k].blank_first_screen}</td><td>${ba[k].shows_avoided?`${ba[k].shows_avoided.pages} of ${ba[k].shows_avoided.of}`:'n/a'}</td><td>${ba[k].looks?Object.entries(ba[k].looks).map(([l,c])=>`${look(l)} ${c}`).join(', '):''}</td></tr>`).join('')}</table></div>
        <ul><li>Quality: ${name[x]} against the baseline ${rng(a)}, ${a.prefer_b} to ${a.prefer_other} with ${a.ties} ties; against no guidance ${rng(n)}, ${n.prefer_b} to ${n.prefer_other} with ${n.ties} ties. Counting only pairs where neither page ended at the token limit: ${rng(a.neither_cut)} and ${rng(n.neither_cut)}.</li>
        ${S.early&&d.arms.Bx&&C.BvA?`<li>The fixed guidance text (same rules, not adapted to the prompt): against the baseline ${rng(C.BvA.by_model[m])}; against no guidance ${rng(C.BvN.by_model[m])}.</li>`:''}
        <li>Share = verdicts for the first arm out of verdicts that picked a side; ties are counted apart. "Level" means the 95% interval includes 50%. Intervals resample prompts${d.bootstrap?' '+num(d.bootstrap.resamples)+' times':''}.</li>
        <li>Looks are read by the project's own labeler from each generated page. Different looks = how many distinct looks an arm's pages show; bits = entropy of that distribution; CLIP = mean pairwise distance between first screens. Task fit = pages whose look is one of the two the pipeline recommends for that prompt's kind of site; the skill tree routes to the first of them, the other arms are not told.</li>
        <li>${d.prompts.length} prompts from the held-out confirm set (July to September), one generation per arm; ${d.pages.generated} of ${d.pages.expected} pages and ${d.verdicts} of ${d.verdicts_expected} verdicts exist.</li>
        <li>Judges are vision models, not people: ${Object.values(d.judges).map(esc).join(', ')}. They saw the first screen only, at 1440 × 900.</li>
        <li>The guidance comes from a pilot-scale graph (${num(st?st.pages_labelled:0)} labelled pages). Baseline: the first study's <a href="../starmap/index.html">starmap</a> and <a href="../report.html">report</a>.</li></ul>
      </details>`;
  }
  document.getElementById('det').addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b||b.disabled) return;
    if(b.dataset.run) setRun(b.dataset.run);
    else if(b.dataset.early){ S.early=b.dataset.early=='1'; setRun(S.early?EARLY[0]:LATEST); }
    else if(b.dataset.model){ const id=prompts()[S.i].prompt_id; S.model=b.dataset.model; S.i=prompts().findIndex(p=>p.prompt_id==id); }
    else if(b.dataset.grid) S.grid=b.dataset.grid=='1';
    else if(b.dataset.step) S.i=S.L[S.L.indexOf(S.i)+ +b.dataset.step];
    else if(b.dataset.i){ S.i=+b.dataset.i; S.grid=false; if(b.dataset.list) S.list=b.dataset.list; }
    else if(b.dataset.list) S.list=b.dataset.list;
    else return;
    draw();
  });
  const DET=()=>document.body.classList.contains('det');
  addEventListener('keydown',e=>{ const s=e.key=='ArrowRight'?1:e.key=='ArrowLeft'?-1:0, j=S.L.indexOf(S.i)+s; if(DET()&&!S.grid&&s&&S.L[j]!=null){ S.i=S.L[j]; draw(); } });
  draw();

  /* ── main screen: the first study's arena, one for one, with three panes. Latest run only; everything else is behind "Details" (the view above). ── */
  let [aN,aA,aX]=ARMS(L), AN=NAME(L); const BASE=RUNS[LATEST].base, GEN=g=>short(L.generators[g]).replace(/-/g,' ').replace(/\b[a-z]/g,c=>c.toUpperCase());
  const M={g:gens[0],i:0,dev:{}};
  // paging order: the featured prompts (open briefs the pipeline won over both, most judge votes first), then the rest in their own order
  const order=()=>{ const P=L.prompts.filter(p=>p.models[M.g]), f=WINS(L,M.g,P); return [...f,...P.filter(q=>!f.includes(q))]; };
  document.body.insertAdjacentHTML('beforeend',`<section id="arena"><div class="ar-w">
    <div class="ar-top"><div><div class="sm-eyebrow">Data pipeline arena · ${L.prompts.length} real prompts · ${gens.length} model${gens.length>1?'s':''}</div><h1>Same prompt, same model: no guidance, taste.md, data pipeline.</h1>
      <p>Only the system prompt differs. Generated by ${gens.map(GEN).join(' and ')}; ${Object.keys(L.judges).length} vision models judged the first screens blind.${L.standin?' <b style="color:var(--ember)">Stand-in data, not real results.</b>':''}</p></div>
      <div class="ar-ctl" id="arM"></div></div>
    <div class="ar-card ar-pr"><div class="tx" id="arTx"></div>
      <div class="ar-ctl"><select class="ar-b" id="arJump" aria-label="All prompts"></select><span class="ar-cnt" id="arCnt"></span><button class="ar-b" id="arPrev">← Previous</button><button class="ar-b ar-next" id="arNext">Next prompt →</button></div></div>
    <div class="ar-main" id="arMain"></div></div></section>
    <div class="ar-fs" id="arFs"><div class="h"><span id="arFsT"></span><button class="ar-b" id="arFsX">Close ✕</button></div><iframe sandbox="allow-scripts"></iframe></div>`);
  const $=q=>document.querySelector(q), file=(q,arm,dir,ext)=>`${BASE}${dir}/${q.prompt_id}_${M.g}_${arm}.${ext}`, pgOf=(q,arm)=>q.models[M.g].pages[arm]||{};
  function fill(arm){     // the live page scaled into the pane (desktop 1280 wide, mobile 390), or its first-screen screenshot
    const q=order()[M.i], st=$(`.ar-pane[data-s="${arm}"] .ar-stage`), g=pgOf(q,arm); let d=M.dev[arm]||'desktop';
    st.classList.toggle('mob',d=='mobile');
    if(!g.rendered){ st.innerHTML='<div class="no">not generated</div>'; return; }
    if(g.blank&&d!='shot'){ d='shot'; }   // a blank page is shown as its (blank) first screen rather than a live frame
    if(d=='shot'){ st.innerHTML=`<img class="ar-pg in" alt="${AN[arm]}: first screen" src="${file(q,arm,'shots','webp')}">`; return; }
    const el=document.createElement('iframe'); el.setAttribute('sandbox','allow-scripts'); el.title=AN[arm]; el.src=file(q,arm,'pages','html'); el.className='ar-pg';
    const fit=()=>{ const W=st.clientWidth, H=st.clientHeight, mob=d=='mobile', w=mob?390:1280, k=Math.min(1,(W-(mob?24:0))/w);
      el.style.width=w+'px'; el.style.height=(mob?H-24:H)/k+'px'; el.style.left=mob?(W-w*k)/2+'px':'0'; el.style.top=mob?'12px':'0'; el.style.transform=`scale(${k})`; };
    st.replaceChildren(el); fit(); new ResizeObserver(fit).observe(st); el.onload=()=>el.classList.add('in'); setTimeout(()=>el.classList.add('in'),2500);
  }
  function side(q){
    const a=stat(L,aX,aA,M.g)||{}, tone=z=>!z||z.share_b==null?'':z.lo>.5?'up':z.hi<.5?'dn':'';   // a bar is green only when ahead, red when behind
    const bar=(t,z)=>!z||z.share_b==null?'':`<div class="ar-row"><span>${t}</span><div class="ar-bar ${tone(z)}"><s></s><u style="left:${z.lo*100}%;width:${(z.hi-z.lo)*100}%"></u><i style="width:${z.share_b*100}%"></i></div><span class="v">${pct(z.share_b)}</span></div>`;
    const dots=(t,o)=>{ const v=VS(L,M.g,q,aX,o), w=v.filter(z=>z.winner==aX).length; return `<div class="ar-gr cur"><span>${t}</span><b>${v.map(z=>`<i class="${z.winner==aX?'taste':z.winner==o?'base':''}" title="${esc(short(L.judges[z.judge]))}: ${esc(z.reason)}"></i>`).join('')}</b><span class="v">${v.length?w+'/'+v.length:'–'}</span></div>`; };
    const cx=q.context, cell=cx&&(cx.files||[]).find(f=>/^cell/.test(f));
    return `<div class="ar-card ar-side">
      <div class="sm-sec">All prompts · data pipeline wins</div>
      <div class="ar-big">${pct(a.share_b)}<small>95% CI ${pct(a.lo)}–${pct(a.hi)}${a.verdicts?` · n=${a.verdicts}`:''}</small></div>${bar('vs taste.md',a)}${bar('vs Base',stat(L,aX,aN,M.g))}
      <div class="ar-note">Share of decisive verdicts for the data pipeline, all ${L.prompts.length} prompts; dashed line = 50%.</div>
      <div class="sm-sec">This prompt</div>${dots('vs taste.md',aA)}${dots('vs Base',aN)}<div class="ar-note">One dot per judge: green chose the data pipeline's page, red the other.</div>
      <div class="sm-sec">Route</div>
      ${cx?`<div class="ar-rt"><span>${esc(cx.context)}</span>→<span>${cx.look?look(cx.look):'no look'}</span>${cell?`→<a href="${SKILL}${esc(cell)}">${esc(cell.replace(/^cell\//,''))}</a>`:''}</div>`:'<div class="ar-note">No route recorded.</div>'}
      <div class="ar-lk">${[aN,aA,aX].map(k=>`<span><em>${AN[k]}</em>${pgOf(q,k).look?look(pgOf(q,k).look):'not labelled'}</span>`).join('')}</div>
      <div class="ar-note">Labelled look of each page, read by the project's labeler.</div>
      <a class="ar-det" href="#details" id="arDet">Details: numbers, looks per arm, rules, earlier runs →</a></div>`;
  }
  function show(anim){
    const O=order(); M.i=Math.max(0,Math.min(O.length-1,M.i)); const q=O[M.i], nf=WINS(L,M.g,O).length;
    $('#arM').innerHTML=gens.length>1?gens.map(g=>`<button class="ar-b ${g==M.g?'on':''}" data-g="${g}">${esc(GEN(g))}</button>`).join(''):'';
    $('#arTx').innerHTML=`<div class="ar-meta"><span>${esc(q.prompt_id)}</span><span>${esc(GEN(M.g))}</span><span>${esc(q.subcategory)}</span><span>${esc(q.language||'')}</span>${M.i<nf?'<span class="ft">featured: judges preferred the pipeline over both</span>':''}</div><q>${esc(q.prompt)}</q>`;
    $('#arCnt').textContent=`${M.i+1} / ${O.length}`; $('#arPrev').disabled=!M.i;
    $('#arJump').innerHTML=`<option value="">All prompts</option>`+O.map((p,j)=>`<option value="${j}">${j+1} · ${esc(p.prompt_id)} · ${esc(p.subcategory)} · ${{w:'pipeline won',l:'pipeline lost','':'mixed'}[RES(L,M.g,p)]}${j<nf?' · featured':''}</option>`).join('');
    $('#arMain').innerHTML=[aN,aA,aX].map(k=>`<div class="ar-card ar-pane" data-s="${k}"${anim?'':' style="animation:none"'}><div class="ar-ph"><div class="ar-lab"><span class="f${k==aX?' t':''}">${AN[k]}</span></div>${k==aX&&L===mod&&PVS.length>1?`<select class="ar-b" id="arPV" aria-label="Pipeline version" title="Pipeline version on show">${PVS.map(v=>`<option value="${v}"${v==PV?' selected':''}>${esc(pvName(v))}</option>`).join('')}</select>`:''}${BAD(pgOf(q,k))?`<span class="ar-bad">${BAD(pgOf(q,k))}</span>`:''}
      ${['desktop','mobile','shot'].map(d=>`<button class="ar-b ${(M.dev[k]||'desktop')==d?'on':''}" data-d="${d}">${d=='shot'?'Screenshot':d[0].toUpperCase()+d.slice(1)}</button>`).join('')}
      <button class="ar-b" data-fs title="Open full screen">⤢</button></div><div class="ar-stage"></div></div>`).join('')+side(q);
    [aN,aA,aX].forEach(fill);
  }
  const go=n=>{ const O=order().length; M.i=(n+O)%O; show(true); };
  $('#arena').addEventListener('click',e=>{ const b=e.target.closest('button,a'); if(!b) return;
    if(b.id=='arDet'){ e.preventDefault(); document.body.classList.add('det'); }
    else if(b.dataset.g){ M.g=b.dataset.g; M.i=0; show(true); }
    else if(b.id=='arNext') go(M.i+1); else if(b.id=='arPrev') go(M.i-1);
    else if(b.dataset.d){ const k=b.closest('.ar-pane').dataset.s; M.dev[k]=b.dataset.d; b.parentNode.querySelectorAll('[data-d]').forEach(x=>x.classList.toggle('on',x===b)); fill(k); }
    else if(b.dataset.fs!=null){ const k=b.closest('.ar-pane').dataset.s; $('#arFs iframe').src=file(order()[M.i],k,'pages','html'); $('#arFsT').textContent=AN[k]; $('#arFs').classList.add('on'); } });
  $('#arJump').onchange=e=>{ if(e.target.value!=='') go(+e.target.value); };
  $('#arena').addEventListener('change',e=>{ if(e.target.id!='arPV') return; const id=order()[M.i].prompt_id; PV=e.target.value; [aN,aA,aX]=ARMS(L); AN=NAME(L);   // another pipeline version: same prompt, new third pane, numbers and order
    M.i=Math.max(0,order().findIndex(q=>q.prompt_id==id)); show(false); draw(); });
  $('#arFsX').onclick=()=>{ $('#arFs').classList.remove('on'); $('#arFs iframe').src='about:blank'; };
  document.getElementById('detX').onclick=()=>document.body.classList.remove('det');
  addEventListener('keydown',e=>{ if(DET()||e.target.tagName=='SELECT') return; if(e.key=='ArrowRight') go(M.i+1); else if(e.key=='ArrowLeft'&&M.i) go(M.i-1); });
  show(true);
});
})();
