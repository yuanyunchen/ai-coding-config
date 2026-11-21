/* Blind vote: one pair of first screens per screen, the prompt above, sides set by a fresh coin on every view.
   Data: data/vote/pairs.json (opaque ids: pair, comparison c, prompt q, hidden arm keys k, hashed image names). Pairs are shown in
   the file's order (a fixed random order of the designed sample first), so a voter's first votes are already a random sample.
   Votes: kept in localStorage first, then POSTed to /api/vote; unsent ones are retried on every load and vote.
   vote.html?results=1: win rate per comparison with a bootstrap interval over prompts, grouped by source; names, pair weights
   and missing pages come from data/vote/key.json, which only this view fetches. Designed pairs: weighted, ties as half, a
   missing page loses. Earlier runs: unweighted, ties apart (as before). */
(()=>{
const view=document.getElementById('view');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const get=u=>fetch(u,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
const LS='humanvote.votes.v1', LN='humanvote.voter';
const load=(k,d)=>{ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } };
const store=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } };
// FNV-1a and mulberry32: the same voter gets the same order and the same sides on every load
const hash=s=>{ let h=2166136261; for(const c of s){ h^=c.codePointAt(0); h=Math.imul(h,16777619); } return h>>>0; };
const rand=seed=>()=>{ seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
// which page a vote favours: "did not load" is a loss for that page; equal / neither loaded have no winner
const winner=v=>({left:v.left,right:v.right,left_failed:v.right,right_failed:v.left})[v.choice]??null;
let votes=load(LS,[]);
const save=()=>store(LS,votes);

get('data/vote/pairs.json').then(d=>{
  if(!d){ view.innerHTML='<p class="note">The pair list could not be loaded.</p>'; return; }
  new URLSearchParams(location.search).get('results')?results(d.pairs):voting(d.pairs);
});

function voting(P){
  const S={voter:load(LN,''),order:[],mode:''};
  const makeOrder=()=>P;   // the file's order is the design's fixed random order
  const mine=()=>new Set(votes.filter(v=>v.voter==S.voter).map(v=>v.pair));
  const sides=p=>Math.random()<.5?[p.b,p.a]:[p.a,p.b];   // per view
  const pending=()=>votes.filter(v=>!v.synced).length;
  let busy=false;
  async function sync(){   // one sender at a time; a vote stays unsynced (and in localStorage) until the server confirms it
    if(busy) return; busy=true; let v;
    while((v=votes.find(v=>!v.synced))){   // re-checked each round, so a vote cast while a send is in flight goes out too
      try{ const {synced,...body}=v, r=await fetch('/api/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        if(r.ok){ v.synced=true; save(); } else if(r.status==400){ v.rejected=(await r.json()).error; v.synced=true; save(); } else break; }
      catch(e){ break; }
    }
    busy=false; status();
  }
  const status=()=>{ const el=document.getElementById('sync'); if(!el) return; const n=pending();
    el.innerHTML=n?`${n} vote${n>1?'s':''} saved in this browser, not yet sent <button class="lnk" id="retry">send now</button>`:'all votes sent'; };
  function exportVotes(){
    const blob=new Blob([votes.map(v=>JSON.stringify(v)).join('\n')+'\n'],{type:'application/x-ndjson'}), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=`votes-${S.voter.replace(/[^\w-]+/g,'_')||'anon'}-${new Date().toISOString().slice(0,10)}.jsonl`;
    document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function nameForm(){
    view.innerHTML=`<form class="card form" id="nf"><div class="eb">Blind comparison</div><h1>Which page is better?</h1>
      <p>Each screen shows a request and the first screen of two pages made for it. Pick the one you would rather get, or say they are equally good. Your name is stored with each vote.</p>
      <input id="nm" name="voter" autocomplete="name" placeholder="Your name" maxlength="80" required value="${esc(S.voter)}"><button class="b pri" type="submit">Start</button></form>`;
    const f=document.getElementById('nf'), nm=document.getElementById('nm'); nm.focus();
    f.onsubmit=e=>{ e.preventDefault(); const v=nm.value.trim(); if(!v) return; S.voter=v; store(LN,v); S.order=makeOrder(); draw(); };
  }
  function draw(){
    const done=mine(), p=S.order.find(q=>!done.has(q.id)), n=done.size;
    S.mode=''; S.cur=p;
    const foot=`<div class="foot"><span id="sync"></span><button class="lnk" id="exp">export my votes</button></div>`;
    if(!p){ view.innerHTML=`<div class="card done"><div class="eb">Blind comparison</div><h1>All ${P.length} pairs voted. Thank you.</h1><p>Voting as <b>${esc(S.voter)}</b>.</p>${foot}</div>`; status(); return; }
    const [L,R]=sides(p); S.sides=[L,R];
    view.innerHTML=`<div class="top"><div><span class="eb">Blind comparison</span></div>
        <span class="who">Voting as <b>${esc(S.voter)}</b> · <button class="lnk" id="chg">change</button></span>
        <span class="cnt">${n} of ${P.length} voted</span></div>
      <div class="bar"><i style="width:${n/P.length*100}%"></i></div>
      <div class="card prompt"><div class="l">The request</div><q dir="auto">${esc(p.prompt)}</q></div>
      <div class="panes">${[L,R].map((s,i)=>`<div class="card pane"><div class="ph"><span class="wide">${i?'Right':'Left'}</span><span class="narrow">${i?'Bottom':'Top'}</span></div>
        <div class="shot"><img src="data/vote/img/${s.img}" alt="${i?'Right':'Left'} page, first screen"></div></div>`).join('')}</div>
      <div class="act wait" id="act"></div><div class="ask" id="ask"></div>${foot}
      <p class="note" style="text-align:center">Keys: ← left · → right · ↓ equally good · X one did not load</p>`;
    // votes open once both images have loaded or failed, so no one votes on a pane still painting
    const ims=[...view.querySelectorAll('.shot img')], settle=()=>{ if(S.cur===p&&ims.every(im=>im.complete)) document.getElementById('act').classList.remove('wait'); };
    ims.forEach(im=>{ im.onload=settle; im.onerror=()=>{ im.replaceWith(Object.assign(document.createElement('div'),{className:'no',textContent:'did not load'})); ims.splice(ims.indexOf(im),1); settle(); }; });
    buttons(); settle(); status();
    // preload the next pair so it shows at once
    const nx=S.order.find(q=>!done.has(q.id)&&q!==p); if(nx) [nx.a,nx.b].forEach(s=>{ new Image().src='data/vote/img/'+s.img; });
  }
  function buttons(){
    const act=document.getElementById('act'), ask=document.getElementById('ask'), W=(w,n)=>`<span class="wide">${w}</span><span class="narrow">${n}</span>`;
    act.innerHTML=S.mode?`<button class="b warn" data-c="left_failed">${W('Left','Top')} did not load<kbd>←</kbd></button>
        <button class="b warn" data-c="both_failed">Neither loaded<kbd>↓</kbd></button>
        <button class="b warn" data-c="right_failed">${W('Right','Bottom')} did not load<kbd>→</kbd></button><button class="b sec" data-c="cancel">Cancel<kbd>Esc</kbd></button>`
      :`<button class="b pri" data-c="left">${W('Left','Top')} is better<kbd>←</kbd></button>
        <button class="b" data-c="equal">Equally good<kbd>↓</kbd></button>
        <button class="b pri" data-c="right">${W('Right','Bottom')} is better<kbd>→</kbd></button><button class="b sec" data-c="failed">One did not load<kbd>X</kbd></button>`;
    ask.textContent=S.mode?'Which page did not load?':'';
  }
  function choose(c){
    if(document.getElementById('act').classList.contains('wait')) return;
    if(c=='failed'||c=='cancel'){ S.mode=c=='failed'?'failed':''; buttons(); return; }
    const p=S.cur, [L,R]=S.sides;
    votes.push({vid:Date.now().toString(36)+Math.random().toString(36).slice(2,10),pair:p.id,left:L.k,right:R.k,choice:c,voter:S.voter,
      time:new Date().toISOString(),user_agent:navigator.userAgent,synced:false});
    if(!save()) alert('This browser does not keep votes locally; they are only sent to the server.');
    draw(); window.scrollTo(0,0); sync();
  }
  view.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.c) choose(b.dataset.c); else if(b.id=='chg') nameForm(); else if(b.id=='exp') exportVotes(); else if(b.id=='retry') sync(); });
  addEventListener('keydown',e=>{
    if(!S.cur||e.repeat||e.metaKey||e.ctrlKey||e.altKey||/INPUT|TEXTAREA/.test(e.target.tagName)||!document.getElementById('act')) return;
    const k=e.key, c=S.mode?{ArrowLeft:'left_failed',ArrowRight:'right_failed',ArrowDown:'both_failed',Escape:'cancel'}[k]
      :{ArrowLeft:'left',ArrowRight:'right',ArrowDown:'equal',e:'equal',E:'equal',x:'failed',X:'failed'}[k];
    if(c){ e.preventDefault(); choose(c); } });
  if(S.voter){ S.order=makeOrder(); draw(); } else nameForm();
  sync();
}

async function results(P){
  const [kj,srv]=await Promise.all([get('data/vote/key.json'),get('/api/votes')]);
  const key=kj&&kj.comparisons?kj.comparisons:kj, Wt=(kj&&kj.weights)||{}, Miss=(kj&&kj.missing)||{};
  const src=srv?'the server':'this browser only (the server did not answer)', last={};
  (srv||votes).forEach(v=>{ last[v.voter+'|'+v.pair]=v; });   // one vote per voter and pair: the latest counts
  const V=Object.values(last), byId=Object.fromEntries(P.map(p=>[p.id,p])), C={};
  for(const v of V){ const p=byId[v.pair]; if(!p) continue; const c=C[p.c]=C[p.c]||{votes:0,ties:0,failed:0,voters:new Set(),q:{}};
    const t=key&&key[p.c]?key[p.c].treat:p.b.k, wt=Wt[p.id]; c.votes++; c.voters.add(v.voter); if(/failed/.test(v.choice)) c.failed++;
    const g=c.q[p.q]=c.q[p.q]||{w:0,n:0};
    if(wt!=null){ // designed pair: weighted; a missing page loses; ties count half
      const m=Miss[p.id], s=m?(m==t?0:1):(winner(v)==null?.5:winner(v)==t?1:0); if(!m&&winner(v)==null) c.ties++; g.n+=wt; g.w+=wt*s; }
    else { const w=winner(v); if(w==null) c.ties++; else { g.n++; if(w==t) g.w++; } } }
  const pct=x=>x==null||isNaN(x)?'n/a':Math.round(x*100)+'%', num=x=>Math.abs(x-Math.round(x))<1e-9?String(Math.round(x)):x.toFixed(1);
  const rows=Object.keys(key||{}).concat(Object.keys(C).filter(c=>!(key||{})[c])).map(id=>{ const c=C[id]||{votes:0,ties:0,failed:0,voters:new Set(),q:{}}, G=Object.values(c.q).filter(g=>g.n);
    const W=G.reduce((s,g)=>s+g.w,0), N=G.reduce((s,g)=>s+g.n,0), r=rand(hash('boot|'+id)), B=[];
    if(G.length>1) for(let i=0;i<2000;i++){ let w=0,n=0; for(let j=0;j<G.length;j++){ const g=G[Math.floor(r()*G.length)]; w+=g.w; n+=g.n; } B.push(w/n); }
    B.sort((a,b)=>a-b);
    return {id,k:(key||{})[id],pairs:P.filter(p=>p.c==id).length,c,W,N,rate:N?W/N:null,lo:B.length?B[Math.floor(.025*B.length)]:null,hi:B.length?B[Math.ceil(.975*B.length)-1]:null,prompts:G.length}; });
  const bar=r=>r.rate==null?'':`<div class="rb"><s></s>${r.lo!=null?`<u style="left:${r.lo*100}%;width:${(r.hi-r.lo)*100}%"></u>`:''}<i style="width:${r.rate*100}%"></i></div>`;
  view.innerHTML=`<div class="eb">Blind comparison · results</div><h1 style="font-family:var(--font-display);font-size:24px;margin:10px 0 6px">Human win rate per comparison</h1>
    <p class="note">${V.length} votes from ${new Set(V.map(v=>v.voter)).size} voters, read from ${src}. Win rate = votes for the first-named page out of votes that picked a side; “did not load” counts as a loss for that page. Designed sample: each pair weighted back to its stratum's share, ties count half, a page the generator never returned loses. Earlier runs: ties are counted apart. 95% interval: bootstrap over prompts (2,000 resamples). The latest vote of a voter on a pair counts.</p>
    <div class="tw"><table class="res"><tr><th>Comparison</th><th>Run</th><th>Win rate</th><th></th><th>95% interval</th><th>Wins / decisive</th><th>Ties</th><th>Did not load</th><th>Prompts</th><th>Voters</th><th>Pairs voted / all</th></tr>
    ${rows.map((r,i)=>(r.k&&r.k.source&&(!i||!rows[i-1].k||rows[i-1].k.source!=r.k.source)?`<tr class="src"><td colspan="11">${esc(r.k.source)}</td></tr>`:'')+`<tr><td>${esc(r.k?r.k.label:r.id)}</td><td>${esc(r.k?r.k.run:'')}</td><td class="n">${pct(r.rate)}</td><td>${bar(r)}</td><td class="n">${r.lo==null?'n/a':pct(r.lo)+' to '+pct(r.hi)}</td>
      <td class="n">${num(r.W)} / ${num(r.N)}</td><td class="n">${r.c.ties}</td><td class="n">${r.c.failed}</td><td class="n">${r.prompts}</td><td class="n">${r.c.voters.size}</td><td class="n">${new Set(V.filter(v=>byId[v.pair]&&byId[v.pair].c==r.id).map(v=>v.pair)).size} / ${r.pairs}</td></tr>`).join('')}</table></div>
    ${key?'':'<p class="note">data/vote/key.json is missing: comparisons are shown by id.</p>'}`;
}
})();
