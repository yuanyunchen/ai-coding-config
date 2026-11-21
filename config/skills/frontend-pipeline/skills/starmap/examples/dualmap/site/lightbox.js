/* Shared viewer for page images (pipeline, correspondence, arena, concept graph). No dependency; include lightbox.css and this file.
   How a page uses it:
   - mark a thumbnail <img data-lb ...>; a click (or Enter / space once focused) opens it enlarged over the page;
   - a group = the nearest ancestor with [data-lb-group]; left / right, arrow keys and swipe move through that ancestor's img[data-lb]
     in document order (the examples of one node, the pages of one run, the members of one cluster). Without a group the image is alone;
   - optional on the img: data-lb-src (a larger image than src), data-lb-cap (caption; default: the enclosing figure's figcaption text,
     else the img's alt), data-lb-href (link to the live page, opened in a new tab);
   - from script: LB.open([{src, cap, href}], index).
   Escape, the ✕ or a click outside the image closes it; focus stays inside while open and returns to the thumbnail; reduced motion is
   respected (lightbox.css). Images marked later (re-rendered panels) are picked up by a MutationObserver. */
(()=>{
'use strict';
if(window.LB) return;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const box=document.createElement('div'); box.className='lb'; box.hidden=true; box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','Page image');
box.innerHTML=`<button class="lb-b lb-x" aria-label="Close">✕</button><button class="lb-b lb-p" aria-label="Previous image">‹</button><button class="lb-b lb-n" aria-label="Next image">›</button>
  <figure class="lb-f"><img class="lb-i" alt=""><figcaption class="lb-c"></figcaption></figure>`;
const $=s=>box.querySelector(s);
let L=[], i=0, back=null, x0=null;
const item=img=>{ const fig=img.closest('figure'), fc=fig&&fig.querySelector('figcaption');
  return {src:img.dataset.lbSrc||img.currentSrc||img.src, cap:img.dataset.lbCap||(fc?fc.textContent.trim():'')||img.alt||'', href:img.dataset.lbHref||'', el:img}; };
function show(){ const it=L[i]; $('.lb-i').src=it.src; $('.lb-i').alt=it.cap;
  $('.lb-c').innerHTML=`${esc(it.cap)}${it.href?` <a href="${esc(it.href)}" target="_blank" rel="noopener">Open the live page ↗</a>`:''}${L.length>1?`<span class="lb-k">${i+1} / ${L.length}</span>`:''}`;
  $('.lb-p').hidden=$('.lb-n').hidden=L.length<2; }
function open(list,j=0){ if(!list.length) return; L=list; i=Math.max(0,Math.min(j,L.length-1)); back=document.activeElement;
  if(!box.isConnected) document.body.append(box); box.hidden=false; document.documentElement.classList.add('lb-on'); show(); $('.lb-x').focus(); }
function close(){ if(box.hidden) return; box.hidden=true; $('.lb-i').removeAttribute('src'); document.documentElement.classList.remove('lb-on'); if(back&&back.focus) back.focus(); back=null; }
const step=d=>{ if(L.length<2) return; i=(i+d+L.length)%L.length; show(); };
function fromImg(img){ const g=img.closest('[data-lb-group]'), all=g?[...g.querySelectorAll('img[data-lb]')]:[img]; open(all.map(item),all.indexOf(img)); }
document.addEventListener('click',e=>{ const img=e.target.closest&&e.target.closest('img[data-lb]'); if(img&&!box.contains(img)){ e.preventDefault(); e.stopPropagation(); fromImg(img); } },true);
document.addEventListener('keydown',e=>{
  if(!box.hidden){
    if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if(e.key==='ArrowRight'){ e.preventDefault(); e.stopImmediatePropagation(); step(1); }
    else if(e.key==='ArrowLeft'){ e.preventDefault(); e.stopImmediatePropagation(); step(-1); }
    else if(e.key==='Tab'){ const f=[...box.querySelectorAll('button:not([hidden]),a[href]')]; const a=f.indexOf(document.activeElement);   // focus trap
      e.preventDefault(); f[(a+(e.shiftKey?-1:1)+f.length)%f.length].focus(); }
    else if(!e.target.closest||!box.contains(e.target)) e.stopImmediatePropagation();   // the page's own keys wait while the viewer is open
    return; }
  const img=e.target.closest&&e.target.closest('img[data-lb]'); if(img&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); e.stopImmediatePropagation(); fromImg(img); } },true);
box.addEventListener('click',e=>{ if(e.target.closest('.lb-x')) close(); else if(e.target.closest('.lb-p')) step(-1); else if(e.target.closest('.lb-n')) step(1);
  else if(!e.target.closest('.lb-i,.lb-c')) close(); });
box.addEventListener('touchstart',e=>{ x0=e.touches[0].clientX; },{passive:true});
box.addEventListener('touchend',e=>{ if(x0==null) return; const dx=e.changedTouches[0].clientX-x0; x0=null; if(Math.abs(dx)>40) step(dx<0?1:-1); });
/* thumbnails become focusable buttons as they appear */
const mark=root=>(root.querySelectorAll?root:document).querySelectorAll('img[data-lb]:not([tabindex])').forEach(m=>{ m.tabIndex=0; m.setAttribute('role','button'); if(!m.getAttribute('aria-label')) m.setAttribute('aria-label','Enlarge: '+(m.dataset.lbCap||m.alt||'page image')); });
new MutationObserver(()=>mark(document)).observe(document.documentElement,{childList:true,subtree:true}); mark(document);
window.LB={open,close,step,state:()=>({open:!box.hidden,i,n:L.length,cap:(L[i]||{}).cap||''})};
})();
