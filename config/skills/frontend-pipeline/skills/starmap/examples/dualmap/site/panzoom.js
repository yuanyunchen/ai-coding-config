/* Shared pan and zoom for the site's canvas maps (pipeline structure and continuous maps, correspondence map). No dependency;
   styles in columns.css. A page calls
     const pz=PanZoom.attach(canvas, {min:.6, max:6, onChange:v=>redraw(), isNode:e=>!!hitTest(e)})
   and draws with the view v={z, x, y}: a point at screen position s on the fitted drawing goes to c + (s - c) * z + (x, y), c = the
   canvas centre (pz.apply(sx, sy) does it; pz.invert(sx, sy) goes back).
   Gestures: wheel or pinch zooms about the pointer (limits min..max); dragging pans (from the background, or from a node once the
   pointer has moved 4 px; the click that ends a drag is swallowed); double click on the background (isNode false) fits; "+", "−",
   "fit" buttons in the canvas's bottom-right corner (keyboard: Tab to them, Enter). The page itself does not scroll while the pointer
   is on the map (touch-action none, wheel prevented). pz.fit() returns to {z:1, x:0, y:0} exactly; pz.set(v) for page state.
   PanZoom.all lists every attached map ({canvas, api}) for the site's interaction check.
   onChange(v, live): live = true during a gesture (throttled to one call per frame; draw a transform of the last full drawing,
   pz.busy() is true meanwhile, hover work should wait), false once it settles (120 ms after the last event) or for buttons and set().
   pz.gesture() tells whether the user has touched the view since the last pz.fit() or pz.claim() (a run's auto-pan yields to it). */
(()=>{
'use strict';
if(window.PanZoom) return;
/* zoom speed (item 46): a mouse-wheel notch (deltaY 100) ~ 20 %; a trackpad pinch (wheel with ctrlKey) faster per unit; one event
   clamped to x0.5..x2; the + and - buttons step by STEP */
const WHEEL=.002, PINCH=.012, STEP=1.4;
function attach(cv,o={}){
  const min=o.min||.6, max=o.max||6, host=cv.parentElement;
  let v={z:1,x:0,y:0}, user=false, raf=0, idle=0, live=false;
  const c=()=>{ const r=cv.getBoundingClientRect(); return [r.width/2,r.height/2]; };
  /* during a gesture (wheel, drag, pinch) the page hears onChange(v, true) at most once per animation frame, and draws cheaply (a
     transform of its last full drawing); 120 ms after the last event it hears onChange(v, false) once and redraws in full */
  const changed=(g)=>{ if(!o.onChange) return; clearTimeout(idle);
    if(!g){ live=false; cancelAnimationFrame(raf); raf=0; o.onChange(v,false); return; }
    live=true; if(!raf) raf=requestAnimationFrame(()=>{ raf=0; o.onChange(v,true); });
    idle=setTimeout(()=>{ live=false; cancelAnimationFrame(raf); raf=0; o.onChange(v,false); },120); };
  function zoomAt(f,mx,my,g){ const [cx,cy]=c(), z=Math.max(min,Math.min(max,v.z*f)), k=z/v.z; if(k===1) return;
    v={z,x:mx-cx-(mx-cx-v.x)*k,y:my-cy-(my-cy-v.y)*k}; user=true; changed(g); }
  const fit=()=>{ v={z:1,x:0,y:0}; user=false; changed(); };
  host.classList.add('pz-host'); cv.style.touchAction='none';
  const b=document.createElement('div'); b.className='pz-btns'; b.setAttribute('role','group'); b.setAttribute('aria-label','Zoom');
  b.innerHTML='<button type="button" data-pz="in" aria-label="Zoom in">+</button><button type="button" data-pz="out" aria-label="Zoom out">−</button><button type="button" data-pz="fit" aria-label="Fit the map">fit</button>';
  host.append(b);
  b.addEventListener('click',e=>{ const t=e.target.closest('[data-pz]'); if(!t) return; e.stopPropagation(); const [cx,cy]=c();
    if(t.dataset.pz==='fit') fit(); else zoomAt(t.dataset.pz==='in'?STEP:1/STEP,cx,cy); });
  b.addEventListener('dblclick',e=>e.stopPropagation());
  cv.addEventListener('wheel',e=>{ e.preventDefault(); const r=cv.getBoundingClientRect(); const dy=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*400:e.deltaY;
    zoomAt(Math.max(.5,Math.min(2,Math.exp(-dy*(e.ctrlKey?PINCH:WHEEL)))),e.clientX-r.left,e.clientY-r.top,true); },{passive:false});
  const P=new Map(); let drag=null, pinch=null, moved=false;
  cv.addEventListener('pointerdown',e=>{ if(e.button>0) return; P.set(e.pointerId,[e.clientX,e.clientY]); moved=false;
    if(P.size===1) drag={x:e.clientX,y:e.clientY,v0:{...v},node:o.isNode?o.isNode(e):false};
    else if(P.size===2){ const [a,q]=[...P.values()]; pinch={d:Math.hypot(a[0]-q[0],a[1]-q[1]),z:v.z}; drag=null; } });
  cv.addEventListener('pointermove',e=>{ if(!P.has(e.pointerId)) return; P.set(e.pointerId,[e.clientX,e.clientY]);
    if(pinch&&P.size===2){ const [a,q]=[...P.values()], r=cv.getBoundingClientRect(), d=Math.hypot(a[0]-q[0],a[1]-q[1]); moved=true;
      zoomAt(pinch.z*d/pinch.d/v.z,(a[0]+q[0])/2-r.left,(a[1]+q[1])/2-r.top,true); return; }
    if(!drag) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(!moved&&Math.hypot(dx,dy)<4) return;
    if(!moved){ moved=true; try{ cv.setPointerCapture(e.pointerId); }catch(_){} }
    v={...drag.v0,x:drag.v0.x+dx,y:drag.v0.y+dy}; user=true; cv.style.cursor='grabbing'; changed(true); });
  const end=e=>{ P.delete(e.pointerId); if(P.size<2) pinch=null; if(!P.size){ drag=null; cv.style.cursor=''; } };
  cv.addEventListener('pointerup',end); cv.addEventListener('pointercancel',end);
  cv.addEventListener('click',e=>{ if(moved){ e.stopImmediatePropagation(); e.preventDefault(); moved=false; } },true);   // the click that ends a drag is not a selection
  cv.addEventListener('dblclick',e=>{ if(!(o.isNode&&o.isNode(e))) fit(); });
  const api={busy:()=>live||!!drag&&moved,get:()=>({...v}),set:nv=>{ v={...nv}; changed(); },fit,zoomAt,gesture:()=>user,claim:()=>{ user=false; },
    apply:(sx,sy)=>{ const [cx,cy]=c(); return [cx+(sx-cx)*v.z+v.x,cy+(sy-cy)*v.z+v.y]; },
    invert:(sx,sy)=>{ const [cx,cy]=c(); return [cx+(sx-cx-v.x)/v.z,cy+(sy-cy-v.y)/v.z]; }};
  window.PanZoom.all.push({canvas:cv,api});   // every map on the page, for dual/site/interaction_check.py
  return api; }
window.PanZoom={attach,all:[]};
})();
