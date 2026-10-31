const entrances = new WeakMap();

// Capture before opening a dialog or hiding the sidebar, while the trigger is
// still in its original viewport position. Works for mouse, touch and keyboard.
export function contentOrigin(trigger) {
  const rect = trigger?.getBoundingClientRect?.() || trigger;
  if (!rect || !['left','top','width','height'].every(key => Number.isFinite(rect[key])) || rect.width <= 0 || rect.height <= 0) return null;
  return {left:rect.left,top:rect.top,width:rect.width,height:rect.height};
}
export function cancelContentEntrance(dialog) {
  const motion = entrances.get(dialog); entrances.delete(dialog); motion?.cancel();
}
// Hide the layout/camera handoff between the scaled modal and its compact HUD.
// The real player/canvas stays intact; only its presentation settles in.
export function animateContentSettle(element) {
  cancelContentEntrance(element);
  if (!element.animate || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  const motion = element.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out',fill:'both'});
  entrances.set(element,motion);
  motion.finished.then(() => {
    if (entrances.get(element) !== motion) return;
    entrances.delete(element); motion.cancel();
  }).catch(() => {});
  return motion;
}
export function animateContentEntrance(dialog,trigger) {
  const source = contentOrigin(trigger);
  cancelContentEntrance(dialog);
  if (!dialog.open || !dialog.animate || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  const target = contentOrigin(dialog);
  if (!target) return null;
  const initial = source ? {
    transform:`translate(${source.left-target.left}px,${source.top-target.top}px) scale(${source.width/target.width},${source.height/target.height})`,
    opacity:0
  } : {transform:'translateY(10px) scale(.95)',opacity:0};
  const motion = dialog.animate([
    {...initial,transformOrigin:'top left'},
    {transform:'translate(0,0) scale(1,1)',opacity:1,transformOrigin:'top left'}
  ],{duration:360,easing:'cubic-bezier(.18,.75,.15,1)',fill:'both'});
  entrances.set(dialog,motion);
  motion.finished.then(() => {
    if (entrances.get(dialog) !== motion) return;
    entrances.delete(dialog); motion.cancel();
  }).catch(() => {});
  return motion;
}
