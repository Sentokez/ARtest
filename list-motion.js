// Reveal only the visible rows, so scrolling down doesn't wait for offscreen rows.
export function animateContentList(list) {
  if (!list?.getBoundingClientRect || list.hidden || document.body.classList.contains('scenes-hidden')) return;
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const bounds = list.getBoundingClientRect();
  if (bounds.height <= 0) return;
  const rows = [...list.children].filter(row => {
    if (!row.animate) return false;
    const rect = row.getBoundingClientRect();
    return rect.bottom > bounds.top && rect.top < bounds.bottom;
  });
  rows.forEach((row,index) => {
    for (const animation of row.getAnimations?.() || []) if (animation.id === 'content-card-reveal') animation.cancel();
    const animation = row.animate([
      {opacity:0,transform:'translateY(-10px)'},
      {opacity:1,transform:'translateY(0)'}
    ],{duration:280,delay:Math.min(index*35,280),easing:'cubic-bezier(.2,.65,.2,1)',fill:'backwards'});
    animation.id = 'content-card-reveal';
  });
}
