/* Shared column dividers (pipeline, correspondence, arena). No dependency.
   A page with three side-by-side columns in a CSS grid calls
     Columns.attach(grid, {key:'pipeline.cols', mins:[300,260,260], storage:'session'|'local'})
   where `grid` has five children: column, divider, column, divider, column (dividers: any element; this module gives them
   role=separator, tabindex and the .colsplit class from columns.css). The outer columns get pixel widths, the middle one takes the rest.
   Dividers: drag with the pointer; ← / → move 24 px (Shift: 96); Enter or a double click resets the default widths and forgets them.
   Widths are kept per page under `key` (sessionStorage or localStorage, inside try/catch) and re-clamped on window resize.
   Below `narrow` px (default 1100) the page's own CSS stacks the columns; the module then leaves the grid alone.
   Two columns: a grid of three children (column, divider, column) works the same way; the right column gets the pixel width, the
   left one takes the rest (set({r}); mins = [left, right]).
   Maps inside the columns re-fit through their own ResizeObserver. Returns {set({l,r}), reset(), widths()}. */
(()=>{
'use strict';
if(window.Columns) return;
function attach(grid,o={}){
  const two=grid.children.length===3, [c1,s1,,s2,c3]=two?[grid.children[0],grid.children[1],null,grid.children[1],grid.children[2]]:grid.children;
  const mins=o.mins||(two?[300,240]:[260,260,260]), key=o.key||('cols:'+location.pathname), narrow=o.narrow||1100;
  const store=(()=>{ try{ return o.storage==='local'?localStorage:sessionStorage; }catch(e){ return null; } })();
  const get=()=>{ try{ return JSON.parse(store&&store.getItem(key)); }catch(e){ return null; } }, put=v=>{ try{ store&&(v?store.setItem(key,JSON.stringify(v)):store.removeItem(key)); }catch(e){} };
  const isNarrow=()=>matchMedia(`(max-width:${narrow}px)`).matches, gap=()=>two?s1.getBoundingClientRect().width:s1.getBoundingClientRect().width+s2.getBoundingClientRect().width;
  const widths=()=>({l:c1.getBoundingClientRect().width,r:c3.getBoundingClientRect().width});
  function set(w,save=true){ const tot=grid.clientWidth-gap();
    if(!w){ grid.style.gridTemplateColumns=''; put(null); }
    else if(!isNarrow()&&two){ const r=Math.round(Math.max(mins[1],Math.min(w.r,tot-mins[0])));
      grid.style.gridTemplateColumns=`minmax(${mins[0]}px,1fr) ${s1.getBoundingClientRect().width||12}px ${r}px`; if(save) put({l:tot-r,r}); }
    else if(!isNarrow()){ const l=Math.round(Math.max(mins[0],Math.min(w.l,tot-mins[1]-mins[2]))), r=Math.round(Math.max(mins[2],Math.min(w.r,tot-l-mins[1])));
      grid.style.gridTemplateColumns=`${l}px ${s1.getBoundingClientRect().width||12}px minmax(${mins[1]}px,1fr) ${s2.getBoundingClientRect().width||12}px ${r}px`; if(save) put({l,r}); }
    const c=widths(); if(two){ s1.setAttribute('aria-valuenow',Math.round((tot-c.r)/tot*100)); return; } s1.setAttribute('aria-valuenow',Math.round(c.l/tot*100)); s2.setAttribute('aria-valuenow',Math.round((tot-c.r)/tot*100)); }
  for(const sp of two?[s1]:[s1,s2]){ const left=!two&&sp===s1;
    sp.classList.add('colsplit'); sp.setAttribute('role','separator'); sp.setAttribute('aria-orientation','vertical'); sp.tabIndex=0; sp.setAttribute('aria-valuemin','0'); sp.setAttribute('aria-valuemax','100');
    if(!sp.getAttribute('aria-label')) sp.setAttribute('aria-label',`Resize the ${left?'left':'right'} column (arrow keys; double click or Enter resets)`);
    sp.addEventListener('pointerdown',e=>{ e.preventDefault(); sp.setPointerCapture(e.pointerId); sp.classList.add('drag'); document.body.classList.add('resizing'); const x0=e.clientX, w0=widths();
      const mv=ev=>{ const dx=ev.clientX-x0; set(left?{l:w0.l+dx,r:w0.r}:{l:w0.l,r:w0.r-dx}); };
      const up=()=>{ sp.removeEventListener('pointermove',mv); sp.classList.remove('drag'); document.body.classList.remove('resizing'); };
      sp.addEventListener('pointermove',mv); sp.addEventListener('pointerup',up,{once:true}); sp.addEventListener('pointercancel',up,{once:true}); });
    sp.addEventListener('keydown',e=>{ const d=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0; if(!d&&e.key!=='Enter') return; e.preventDefault(); e.stopPropagation();
      if(e.key==='Enter'){ set(null); return; } const w=widths(), s=(e.shiftKey?96:24)*d; set(left?{l:w.l+s,r:w.r}:{l:w.l,r:w.r-s}); });
    sp.addEventListener('dblclick',()=>set(null)); }
  { const w=get(); if(w&&w.l&&w.r) set(w,false); else set(null); }
  addEventListener('resize',()=>{ if(grid.style.gridTemplateColumns) set(widths()); });
  return {set,reset:()=>set(null),widths}; }
window.Columns={attach};
})();
