/* Shared dark picker in place of native <select> menus (T02.05.06.01 item 61). No dependency; styles in page.css (.pk-*).
   Use: Picker.attach(selectEl) — the native select stays in the page, hidden, as the source of truth: its options and optgroups are
   read (again whenever they change), choosing a row sets select.value and fires 'change', so the page's existing handlers keep working.
   Per <option> (optional): data-tag (small tag before the text, e.g. the task category), data-meta (quiet text at the right),
   data-star (a star in the accent colour), title (full text on hover; default the option text). <optgroup label> = group caption.
   The button shows the chosen option (data-short if given); after setting select.value from script, call api.refresh(). A search field appears with more than 12 options.
   Keyboard as a listbox: Enter, Space or ArrowDown open; arrows move; typing filters; Enter selects; Escape closes and returns focus.
   role=listbox with aria-activedescendant; every row dir=auto (right-to-left texts). Closes on an outside click; at most 60 % of the
   window high; a full-width sheet below 600 px. Picker.all lists the attached pickers for checks.
   Picker.attach(sel, {footer: element}) puts the element at the bottom of the panel. */
(()=>{
'use strict';
if(window.Picker) return;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let uid=0;
function attach(sel,o={}){
  const id='pk'+(++uid), wrap=document.createElement('span'); wrap.className='pk';
  const btn=document.createElement('button'); btn.type='button'; btn.className='pk-btn'; btn.setAttribute('aria-haspopup','listbox'); btn.setAttribute('aria-expanded','false');
  if(sel.getAttribute('aria-label')) btn.setAttribute('aria-label',sel.getAttribute('aria-label'));
  const pan=document.createElement('div'); pan.className='pk-pan'; pan.hidden=true;
  pan.innerHTML=`<input class="pk-q" type="search" placeholder="Filter…" aria-label="Filter" hidden><div class="pk-list" role="listbox" id="${id}-lb" tabindex="-1"></div>`;
  sel.hidden=true; sel.after(wrap); wrap.append(btn,pan);
  if(o.footer){ o.footer.classList.add('pk-foot'); pan.append(o.footer); }   // e.g. a note on rows left out, with its own link
  const q=pan.querySelector('.pk-q'), lb=pan.querySelector('.pk-list');
  let rows=[], act=-1;
  const label=()=>{ const op=sel.options[sel.selectedIndex]; btn.innerHTML=`<span class="pk-cur">${esc(op?(op.dataset.short||op.textContent):'')}</span><span class="pk-car" aria-hidden="true">▾</span>`; btn.title=op?op.title||op.textContent:''; };
  function build(){ const f=q.value.trim().toLowerCase(); let h='', n=0; rows=[];
    const row=op=>{ if(!op.value&&!o.keepEmpty) return; const t=op.textContent; if(f&&!(t+' '+(op.dataset.tag||'')).toLowerCase().includes(f)) return;
      const k=rows.length; rows.push(op); n++;
      h+=`<div class="pk-row${op.selected?' sel':''}" role="option" id="${id}-o${k}" data-k="${k}" aria-selected="${op.selected}" title="${esc(op.title||t)}">${op.dataset.star?'<span class="pk-star" aria-label="featured">★</span>':''}${op.dataset.tag?`<span class="pk-tag">${esc(op.dataset.tag)}</span>`:''}<span class="pk-txt" dir="auto">${esc(t)}</span>${op.dataset.meta?`<span class="pk-meta">${esc(op.dataset.meta)}</span>`:''}</div>`; };
    for(const c of sel.children){ if(c.tagName==='OPTGROUP'){ const s=h; h+=`<div class="pk-grp" role="presentation">${esc(c.label)}</div>`; const before=rows.length; [...c.children].forEach(row); if(rows.length===before) h=s; } else row(c); }
    lb.innerHTML=h||'<div class="pk-none">No match</div>'; q.hidden=sel.options.length<=12; act=Math.max(0,rows.findIndex(r=>r.selected)); mark(); }
  function mark(){ lb.querySelectorAll('.pk-row').forEach(r=>r.classList.toggle('act',+r.dataset.k===act)); const a=lb.querySelector(`[data-k="${act}"]`);
    if(a){ lb.setAttribute('aria-activedescendant',a.id); a.scrollIntoView({block:'nearest'}); } else lb.removeAttribute('aria-activedescendant'); }
  function open(){ if(!pan.hidden) return; q.value=''; build(); pan.hidden=false; btn.setAttribute('aria-expanded','true'); (q.hidden?lb:q).focus(); }
  function close(back=true){ if(pan.hidden) return; pan.hidden=true; btn.setAttribute('aria-expanded','false'); if(back) btn.focus(); }
  function choose(k){ const op=rows[k]; if(!op) return; sel.value=op.value; sel.dispatchEvent(new Event('change',{bubbles:true})); label(); close(); }
  btn.addEventListener('click',()=>pan.hidden?open():close());
  btn.addEventListener('keydown',e=>{ if(['Enter',' ','ArrowDown'].includes(e.key)){ e.preventDefault(); open(); } });
  pan.addEventListener('keydown',e=>{ e.stopPropagation();
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); act=Math.max(0,Math.min(rows.length-1,act+(e.key==='ArrowDown'?1:-1))); mark(); }
    else if(e.key==='Enter'){ e.preventDefault(); choose(act); } else if(e.key==='Escape'){ e.preventDefault(); close(); } else if(e.key==='Tab') close(false);
    else if(e.target===lb&&e.key.length===1&&!q.hidden){ q.focus(); } });
  q.addEventListener('input',build);
  lb.addEventListener('click',e=>{ const r=e.target.closest('.pk-row'); if(r) choose(+r.dataset.k); });
  lb.addEventListener('mousemove',e=>{ const r=e.target.closest('.pk-row'); if(r&&+r.dataset.k!==act){ act=+r.dataset.k; mark(); } });
  document.addEventListener('pointerdown',e=>{ if(!wrap.contains(e.target)) close(false); },true);
  new MutationObserver(()=>{ label(); if(!pan.hidden) build(); }).observe(sel,{childList:true,subtree:true,attributes:true});
  sel.addEventListener('change',label); label();
  const api={refresh:label,open,close,choose:v=>{ sel.value=v; sel.dispatchEvent(new Event('change',{bubbles:true})); label(); },el:wrap,select:sel};
  Picker.all.push(api); return api; }
window.Picker={attach,all:[]};
})();
