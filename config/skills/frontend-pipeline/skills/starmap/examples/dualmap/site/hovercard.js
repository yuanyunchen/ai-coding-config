/* Shared hover card for page points on the site's canvas maps (correspondence; the continuous-space page can switch to it). No dependency;
   styles in hovercard.css. A page calls
     const hc=HoverCard.attach(canvas, {width: 260})   // card width in px (default 420; correspondence 260, continuous space 340)
   and on pointer move hc.show(event, {img, title, lines:[html, ...], extra:html}) or hc.hide(). The card shows the page's first screen
   (the given width, narrower when the map is), the title (the model), small lines (placement, value) and an optional extra line for what
   the page adds. It follows the pointer, stays inside the canvas's box, never takes pointer events (clicks reach the map), and appears at
   once (no delay). The caller hides it during pan / zoom gestures and on pointer leave. */
(()=>{
'use strict';
if(window.HoverCard) return;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function attach(cv,o={}){
  const el=document.createElement('div'); el.className='hcard'; el.hidden=true; el.setAttribute('aria-hidden','true'); document.body.append(el);
  let src='';
  function show(e,c){ const r=cv.getBoundingClientRect(), w=Math.min(o.width||420,Math.max(200,r.width-16));
    el.style.width=w+'px';
    if(c.img!==src){ src=c.img||''; el.innerHTML=`${src?`<img src="${esc(src)}" alt="">`:''}<div class="hc-t"></div><div class="hc-s"></div><div class="hc-x"></div>`; }
    el.querySelector('.hc-t').innerHTML=c.title||''; el.querySelector('.hc-s').innerHTML=(c.lines||[]).join('<br>'); const x=el.querySelector('.hc-x'); x.innerHTML=c.extra||''; x.hidden=!c.extra;
    el.hidden=false; const h=el.offsetHeight, gap=16;
    let left=e.clientX+gap; if(left+w>r.right-8) left=e.clientX-gap-w; left=Math.max(r.left+8,Math.min(left,r.right-8-w));
    let top=e.clientY-h/2; top=Math.max(r.top+8,Math.min(top,r.bottom-8-h));
    el.style.left=left+'px'; el.style.top=top+'px'; }
  const hide=()=>{ el.hidden=true; };
  return {show,hide,el};
}
window.HoverCard={attach};
})();
