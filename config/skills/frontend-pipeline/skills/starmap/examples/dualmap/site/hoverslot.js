/* Shared "Under the pointer" slot (correspondence; the pipeline page can reuse it). No dependency; styles .hslot in page.css.
   A page with a side panel calls
     const hs=HoverSlot.attach(panelEl, {render:item=>html, key:item=>id, title:'Under the pointer', id:'hslot'})
   The slot is inserted as the first child of panelEl, hidden. hs.show(item) fills it with the title and render(item) (re-rendered only when
   key(item) changes) and shows it; hs.clear() hides it, so the panel's own content below it is what remains. The panel's content is never
   touched: write it into a sibling element after the slot. Returns {show, clear, el}. */
(()=>{
'use strict';
if(window.HoverSlot) return;
function attach(panel,o={}){
  const el=document.createElement('div'); el.className='hslot'; el.hidden=true; el.setAttribute('aria-live','polite'); if(o.id) el.id=o.id;
  panel.prepend(el);
  const key=o.key||(x=>x), title=o.title??'Under the pointer'; let cur;
  function show(item){ const k=String(key(item)); if(k!==cur){ cur=k; el.innerHTML=(title?`<div class="hslot-t">${title}</div>`:'')+o.render(item); } el.hidden=false; }
  const clear=()=>{ el.hidden=true; };
  return {show,clear,el};
}
window.HoverSlot={attach};
})();
