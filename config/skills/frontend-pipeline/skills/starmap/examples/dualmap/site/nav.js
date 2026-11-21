/* Site navigation, the same five items in the same order on every page of the site; fills <nav id="site-nav">. The first study's
   starmap is not in it: it stays at its address (../starmap/), linked where the site refers to the first study, and on that page this
   script only adds a small link back to the site (the page keeps its own Starmap / Arena pill and routes #starmap / #arena itself).
   "Arena" opens the sealed test (arena-final.html); on the arena pages a secondary switch leads to the first study's two-way arena
   (the starmap's #arena view). The prototype arena.html is no longer linked.
   Links are relative to this file, so the site works wherever deliverables/ is served. */
(()=>{
const here=document.currentScript.getAttribute('src').replace(/nav\.js.*$/,'');   // '' inside dualmap/, '../dualmap/' from the starmap
const star=here?'':'../starmap/', q=new URLSearchParams(location.search);
const data=!here&&q.get('data')?'&data='+encodeURIComponent(q.get('data')):'';
const file=location.pathname.split('/').pop()||'index.html', view=q.get('view');
const ITEMS=[   // order of the bar: one line per item, move a line to move it
  ['map','Continuous space',here+'index.html?view=map'+data],
  ['graph','Concept graph',here+'index.html?view=graph'+data],
  ['corr','Correspondence',here+'corr.html'+data.replace('&','?')],
  ['pipeline','Data pipeline',here+'pipeline.html'],
  ['arena','Arena',here+'arena-final.html']];
const SWITCH=[
  ['final','Sealed test: data pipeline',here+'arena-final.html'],
  ['first',"First study's arena: taste.md vs none →",star+'index.html#arena',"On the first study's starmap"]];
// which item is this page: the starmap page holds two (its arena is the #arena view); index.html without ?view is both map and graph
const page=()=>here?(location.hash==='#arena'?'arena':'starmap'):file==='arena.html'||file==='arena-final.html'?'arena':file==='corr.html'?'corr':file==='pipeline.html'?'pipeline':file==='index.html'?view||'both':file;
const current=k=>k===page()||(page()==='both'&&(k==='map'||k==='graph'));
let nav=document.getElementById('site-nav');
if(!nav){ nav=document.createElement('nav'); nav.id='site-nav'; nav.className='float'; document.body.prepend(nav); }
nav.setAttribute('aria-label','Site');
nav.innerHTML=here?`<a href="${here}index.html?view=map" data-k="site">← Back to the site</a>`   // the starmap page: only the way back
  :ITEMS.map(([k,t,h])=>`<a href="${h}" data-k="${k}">${t}</a>`).join('');
const sw=document.createElement('div'); sw.id='arena-switch'; if(here||file==='arena.html') sw.className='float';   // both arena screens: pills at the top right
sw.innerHTML=SWITCH.map(([k,t,h,ti])=>`<a href="${h}" data-k="${k}"${ti?` title="${ti}"`:''}>${t}</a>`).join('');
nav.after(sw);
function mark(){
  const set=(a,on)=>{ a.classList.toggle('on',on); on?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'); };
  nav.querySelectorAll('a').forEach(a=>set(a,current(a.dataset.k)));
  sw.hidden=page()!=='arena'; sw.querySelectorAll('a').forEach(a=>set(a,a.dataset.k===(here?'first':file==='arena-final.html'?'final':'')));
}
mark(); addEventListener('hashchange',mark);
/* below 900 px the header note is clamped to two lines (page.css); a "more" button opens it */
addEventListener('load',()=>{ const n=document.querySelector('.pg-note'); if(!n||n.querySelector('.pg-note-more')) return;
  const b=document.createElement('button'); b.type='button'; b.className='pg-note-more'; b.textContent='more'; b.hidden=true;
  const fit=()=>{ b.hidden=n.classList.contains('open')||n.scrollHeight<=n.clientHeight+1; }; b.onclick=()=>{ n.classList.add('open'); b.hidden=true; };
  n.after(b); new ResizeObserver(fit).observe(n); fit(); });
/* "updated HH:MM" for the page shown (item 49): data/build.json is a list of {page, updated, round, what}, one line per swap; the newest
   line of the page wins; no file or no line: no stamp. The data folder's listing is read first, so a missing file raises no 404. */
(()=>{ const base=here+'data/'; fetch(base).then(r=>r.ok?r.text():'').then(t=>t.includes('build.json')?fetch(base+'build.json').then(r=>r.ok?r.json():[]):[]).then(L=>{
  const k=page(), mine=(Array.isArray(L)?L:[]).filter(e=>e&&(e.page===k||(k==='both'&&(e.page==='map'||e.page==='graph')))&&e.updated).sort((a,b)=>String(a.updated).localeCompare(String(b.updated)));
  if(!mine.length) return; const e=mine[mine.length-1], d=new Date(e.updated); if(isNaN(d)) return;
  const sp=document.createElement('span'); sp.id='nav-upd'; sp.textContent='updated '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  sp.title=(e.what||'')+(e.round?' ('+e.round+')':''); nav.append(sp); }).catch(()=>{}); })();
if(!document.querySelector('link[href$="page.css"]')) document.head.insertAdjacentHTML('beforeend',`<link rel="stylesheet" href="${here}page.css">`);   // the side gutters of the bar come from the site's one width rule
document.head.insertAdjacentHTML('beforeend',`<style>
#site-nav{position:relative;z-index:12;display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line,rgba(148,178,255,.14));
  font-family:var(--font-ui,'Space Grotesk',-apple-system,sans-serif)}
#site-nav a,#arena-switch a{padding:6px 13px;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.02em;white-space:nowrap;text-decoration:none;color:var(--starlight,#e9eefb)}
#site-nav a:hover,#arena-switch a:hover{background:var(--ice-soft,rgba(143,198,255,.16))}
#site-nav a.on{background:var(--ice,#8fc6ff);color:var(--void,#060913)}
#site-nav.float{position:fixed;z-index:60;top:14px;left:14px;flex-wrap:nowrap;max-width:calc(100vw - 24px);overflow-x:auto;padding:4px;
  background:var(--panel,rgba(13,19,38,.72));border:1px solid var(--line,rgba(148,178,255,.14));border-radius:999px;
  box-shadow:0 6px 24px rgba(0,0,0,.35);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
#arena-switch{position:relative;z-index:12;display:flex;flex-wrap:wrap;gap:4px;padding:8px 0;font-family:var(--font-ui,'Space Grotesk',-apple-system,sans-serif)}
#arena-switch[hidden]{display:none}
#nav-upd{margin-left:auto;font:11px var(--font-data,ui-monospace,monospace);color:var(--faint,#6b7799);white-space:nowrap;cursor:default;padding:0 4px}
#site-nav.float #nav-upd{display:none}
#arena-switch a{font-size:12px;font-weight:500;border:1px solid var(--line-strong,rgba(148,178,255,.3));color:var(--dim,#9aa7c9)}
#arena-switch a.on{color:var(--starlight,#e9eefb);border-color:var(--ice,#8fc6ff);background:var(--ice-soft,rgba(143,198,255,.16))}
#arena-switch.float{position:fixed;z-index:60;top:62px;right:24px;padding:0}
</style>`);
/* item 81: the main working area fills the viewport below what is above it. PgFrame.fit(el) gives el the class .pg-work and keeps
   its --work-top (the px above it, plus 16 px at the bottom) current on resize and when anything above it changes height (page.css
   turns that into --work-h = max(480px, 100dvh - top)). */
window.PgFrame=window.PgFrame||{fit(el){ if(!el) return; el.classList.add('pg-work');
  const set=()=>{ const t=Math.round(el.getBoundingClientRect().top+scrollY+16); if(el.style.getPropertyValue('--work-top')!==t+'px') el.style.setProperty('--work-top',t+'px'); };
  set(); addEventListener('resize',set); const ro=new ResizeObserver(set); ro.observe(document.body); return set; }};
})();
