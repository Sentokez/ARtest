import { animateContentEntrance, animateContentSettle, cancelContentEntrance, contentOrigin } from './content-motion.js';

// Keep one iframe attached to the stage. Switching dialog modes changes only
// presentation, so docking never reparents or navigates the playing iframe.
function element(tag, className, text) {
  const node = document.createElement(tag); if (className) node.className = className;
  if (text) node.textContent = text; return node;
}
export function fitSpotifyFrame(availableWidth, frameHeight = 152) {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return null;
  // Our layout canvas is intentionally wider than the HUD; scale the whole
  // embedded UI rather than depending on Spotify's narrow-screen breakpoints.
  const renderWidth = Math.max(400,availableWidth);
  const scale = availableWidth/renderWidth;
  return {renderWidth,scale,height:frameHeight*scale};
}
export class SpotifyPlayer {
  constructor(stage) {
    this.stage = stage; this.mode = 'closed'; this.currentEmbed = null;
    this.dialog = element('dialog','spotify-dialog'); this.dialog.dataset.media = 'spotify'; this.dialog.setAttribute('aria-label','Spotify oynatıcısı');
    this.header = element('div','spotify-header');
    this.caption = element('span','media-caption','SPOTIFY · SESLİ İÇERİK');
    this.expandButton = element('button','spotify-expand','⤢'); this.expandButton.type = 'button'; this.expandButton.title = 'Oynatıcıyı büyüt'; this.expandButton.setAttribute('aria-label','Spotify oynatıcısını büyüt');
    const close = element('button','spotify-close','×'); close.type = 'button'; close.title = 'Dinlemeyi bitir'; close.setAttribute('aria-label','Spotify oynatıcısını kapat ve dinlemeyi bitir');
    this.header.append(this.caption,this.expandButton,close);
    this.iframe = document.createElement('iframe'); this.iframe.className = 'spotify-frame';
    this.iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture'; this.iframe.allowFullscreen = true;
    this.frameViewport = element('div','spotify-frame-viewport'); this.frameViewport.append(this.iframe);
    this.actions = element('div','spotify-actions');
    this.listenButton = element('button','spotify-listen','Gezerken dinle'); this.listenButton.type = 'button';
    this.externalLink = element('a',null,'Spotify’da aç ↗'); this.externalLink.target = '_blank'; this.externalLink.rel = 'noopener noreferrer';
    this.actions.append(this.listenButton,this.externalLink);
    this.dialog.append(this.header,this.frameViewport,this.actions); stage.append(this.dialog);
    // A drag crossing the player must not enlarge it. Require a fresh pointer
    // entry with no pressed buttons, including after releasing over the player.
    this.dialog.addEventListener('pointerenter',event => {
      this.dialog.dataset.hoverReady = String(event.buttons === 0 && event.pointerType !== 'touch');
    });
    this.dialog.addEventListener('pointerleave',() => { this.dialog.dataset.hoverReady = 'false'; });
    this.onStagePointerDown = event => {
      if (!event.composedPath().includes(this.dialog)) this.dialog.dataset.hoverReady = 'false';
    };
    stage.addEventListener('pointerdown',this.onStagePointerDown,true);
    this.resizeObserver = new ResizeObserver(() => this.updateLayout()); this.resizeObserver.observe(this.frameViewport);
    this.listenButton.addEventListener('click', () => this.dock());
    this.expandButton.addEventListener('click', () => this.expand());
    close.addEventListener('click', () => this.stop());
    this.dialog.addEventListener('close', () => {
      // close() queues this event. A modal/non-modal transition may already have
      // reopened the same dialog by the time it fires; don't stop that playback.
      if (!this.dialog.open) this.clear();
    });
  }
  open({embed, href, title = 'Spotify sesli içerik', origin}) {
    const url = new URL(embed);
    if (url.origin !== 'https://open.spotify.com' || !/^\/embed\/(episode|track|album|playlist)\/[a-zA-Z0-9]+\/?$/.test(url.pathname)) throw new Error('Geçerli bir Spotify oynatıcı bağlantısı gerekli.');
    const height = /^\/embed\/(episode|track)\//.test(url.pathname) ? 152 : 352;
    this.frameHeight = height;
    this.dialog.style.setProperty('--spotify-frame-height',`${height}px`); this.iframe.height = String(height);
    this.iframe.title = title;
    if (this.currentEmbed !== url.href) { this.currentEmbed = url.href; this.iframe.src = url.href; }
    let external;
    try { external = new URL(href); } catch { external = url; }
    this.externalLink.href = external.origin === 'https://open.spotify.com' ? external.href : url.href;
    const source = contentOrigin(origin);
    if (source) {
      this.cancelMotion(); this.switchMode('modal'); this.updateLayout();
      animateContentEntrance(this.dialog,source);
    } else this.expand();
    this.updateLayout();
  }
  expand() {
    if (!this.currentEmbed || (this.mode === 'modal' && !this.motion)) return;
    const source = this.dialog.open ? this.dialog.getBoundingClientRect?.() : null;
    this.cancelMotion(); this.switchMode('modal');
    const target = this.dialog.getBoundingClientRect?.();
    if (source && target && this.canAnimate()) this.playMotion(source,target,false);
  }
  dock() {
    if (!this.currentEmbed || this.mode === 'docked' || this.motion) return;
    const source = this.dialog.getBoundingClientRect?.();
    const target = this.canAnimate() ? this.measureDockRect() : null;
    if (source && target && this.canAnimate()) this.playMotion(source,target,true,() => this.switchMode('docked'));
    else this.switchMode('docked');
  }
  switchMode(mode) {
    if (this.dialog.open && this.mode === mode) { this.updateLayout(); return; }
    if (this.dialog.open) this.dialog.close();
    this.mode = mode; this.dialog.dataset.mode = mode;
    this.dialog.dataset.hoverReady = 'false';
    this.caption.textContent = mode === 'modal' ? 'SPOTIFY · SESLİ İÇERİK' : 'GEZERKEN DİNLE';
    if (mode === 'modal') this.dialog.showModal(); else this.dialog.show();
    this.updateLayout();
  }
  canAnimate() { return !!this.dialog.animate && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }
  measureDockRect() {
    // Measure a lightweight shell: never clone, detach or navigate the real iframe.
    const probe = element('div','spotify-dialog'); probe.dataset.mode = 'docked';
    probe.setAttribute('open',''); probe.setAttribute('aria-hidden','true'); probe.inert = true;
    probe.style.visibility = 'hidden'; probe.style.pointerEvents = 'none';
    const header = element('div','spotify-header');
    header.append(element('span','media-caption','GEZERKEN DİNLE'),element('span','spotify-expand','⤢'),element('span','spotify-close','×'));
    const frame = element('div','spotify-frame-viewport'); probe.append(header,frame);
    this.stage.append(probe);
    try {
      const layout = fitSpotifyFrame(frame.clientWidth,this.frameHeight || 152);
      if (!layout) return null;
      frame.style.height = `${layout.height}px`;
      return probe.getBoundingClientRect();
    } finally { probe.remove(); }
  }
  playMotion(source,target,shrinking,onFinish) {
    this.cancelMotion();
    const base = this.dialog.getBoundingClientRect?.();
    if (!base?.width || !base.height || !source.width || !target.width) { onFinish?.(); return; }
    const frame = (rect,opacity) => ({transform:`translate(${rect.left-base.left}px,${rect.top-base.top}px) scale(${rect.width/base.width},${rect.height/base.height})`,transformOrigin:'top left',opacity});
    const motion = this.dialog.animate([frame(source,shrinking ? 1 : .35),frame(target,shrinking ? 0 : 1)],{duration:shrinking ? 360 : 320,easing:'cubic-bezier(.22,.68,0,1)',fill:'both'});
    this.motion = motion; this.listenButton.disabled = true;
    motion.finished.then(() => {
      if (this.motion !== motion) return;
      this.motion = null; this.listenButton.disabled = false;
      onFinish?.(); motion.cancel();
      if (shrinking && this.dialog.open) animateContentSettle(this.dialog);
    }).catch(() => {});
  }
  cancelMotion() { cancelContentEntrance(this.dialog); const motion = this.motion; this.motion = null; this.listenButton.disabled = false; motion?.cancel(); }
  updateLayout() {
    const layout = fitSpotifyFrame(this.frameViewport.clientWidth,this.frameHeight || 152);
    if (!layout || !this.dialog.open) return;
    if (this.lastLayout?.width === this.frameViewport.clientWidth && this.lastLayout?.height === this.frameHeight) return;
    this.lastLayout = {width:this.frameViewport.clientWidth,height:this.frameHeight};
    this.frameViewport.style.setProperty('--spotify-render-width',`${layout.renderWidth}px`);
    this.frameViewport.style.setProperty('--spotify-frame-scale',String(layout.scale));
    this.frameViewport.style.setProperty('--spotify-scaled-height',`${layout.height}px`);
  }
  clear() {
    this.cancelMotion();
    this.mode = 'closed'; this.dialog.dataset.mode = this.mode; this.currentEmbed = null;
    this.iframe.removeAttribute('src');
  }
  stop() { if (this.dialog.open) this.dialog.close(); this.clear(); }
  dispose() { this.stage.removeEventListener('pointerdown',this.onStagePointerDown,true); this.resizeObserver.disconnect(); this.stop(); this.dialog.remove(); }
}
