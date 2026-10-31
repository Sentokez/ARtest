const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

export function constrainImage({width,height,imageWidth,imageHeight,scale,x,y}) {
  const fit = Math.min(width/imageWidth,height/imageHeight);
  const limitX = Math.max(0,(imageWidth*fit*scale-width)/2);
  const limitY = Math.max(0,(imageHeight*fit*scale-height)/2);
  return {x:clamp(x,-limitX,limitX) || 0,y:clamp(y,-limitY,limitY) || 0};
}

export function createImageViewer(src,alt) {
  const element = document.createElement('div'); element.className = 'image-viewport';
  element.tabIndex = 0; element.setAttribute('role','region');
  element.setAttribute('aria-label','Görsel: tekerlekle yakınlaştırın, sol tuşla sürükleyin. Çift tıklama veya 0 ile sıfırlayın.');
  const img = document.createElement('img'); img.alt = alt; img.draggable = false;
  element.append(img);
  let scale = 1, x = 0, y = 0, drag;
  const events = new AbortController();
  const on = (target,type,handler,options = {}) => target.addEventListener(type,handler,{...options,signal:events.signal});
  const draw = () => {
    if (img.naturalWidth && element.clientWidth && element.clientHeight) {
      ({x,y} = constrainImage({width:element.clientWidth,height:element.clientHeight,imageWidth:img.naturalWidth,imageHeight:img.naturalHeight,scale,x,y}));
    }
    img.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    element.classList.toggle('is-zoomed',scale > 1);
  };
  const zoom = (next,px = 0,py = 0) => {
    const ratio = clamp(next,1,6)/scale;
    scale = clamp(next,1,6); x = px-(px-x)*ratio; y = py-(py-y)*ratio; draw();
  };
  const local = event => {
    const rect = element.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*element.clientWidth/rect.width-element.clientWidth/2,y:(event.clientY-rect.top)*element.clientHeight/rect.height-element.clientHeight/2};
  };
  on(element,'wheel',event => {
    event.preventDefault(); event.stopPropagation();
    const point = local(event);
    const delta = event.deltaY*(event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
    zoom(scale*Math.exp(-clamp(delta,-240,240)*.002),point.x,point.y);
  },{passive:false});
  on(element,'pointerdown',event => {
    if (event.button !== 0 || scale <= 1 || drag) return;
    event.preventDefault(); element.focus({preventScroll:true});
    drag = {id:event.pointerId,...local(event),panX:x,panY:y};
    element.setPointerCapture(event.pointerId); element.classList.add('is-dragging');
  });
  on(element,'pointermove',event => {
    if (!drag || drag.id !== event.pointerId) return;
    const point = local(event); x = drag.panX+point.x-drag.x; y = drag.panY+point.y-drag.y; draw();
  });
  const end = event => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null; element.classList.remove('is-dragging');
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  };
  for (const type of ['pointerup','pointercancel','lostpointercapture']) on(element,type,end);
  on(element,'dblclick',() => {scale=1;x=0;y=0;draw();});
  on(element,'keydown',event => {
    if (!['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === '+' || event.key === '=') zoom(scale*1.2);
    else if (event.key === '-') zoom(scale/1.2);
    else if (event.key === '0') {scale=1;x=0;y=0;draw();}
    else {x+=event.key==='ArrowLeft'?40:event.key==='ArrowRight'?-40:0;y+=event.key==='ArrowUp'?40:event.key==='ArrowDown'?-40:0;draw();}
  });
  on(img,'load',draw);
  const observer = new ResizeObserver(draw); observer.observe(element);
  img.src = src; draw();
  return {element,dispose(){events.abort();observer.disconnect();if(drag)end({pointerId:drag.id});}};
}
