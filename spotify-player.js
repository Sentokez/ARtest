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
  open({embed, href, title = 'Spotify sesli içerik'}) {
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
    this.expand();
    this.updateLayout();
  }
  expand() {
    if (!this.currentEmbed || this.mode === 'modal') return;
    if (this.dialog.open) this.dialog.close();
    this.mode = 'modal'; this.dialog.dataset.mode = this.mode; this.caption.textContent = 'SPOTIFY · SESLİ İÇERİK';
    this.dialog.showModal();
    this.updateLayout();
  }
  dock() {
    if (!this.currentEmbed || this.mode === 'docked') return;
    if (this.dialog.open) this.dialog.close();
    this.mode = 'docked'; this.dialog.dataset.mode = this.mode; this.caption.textContent = 'GEZERKEN DİNLE';
    this.dialog.show();
    this.updateLayout();
  }
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
    this.mode = 'closed'; this.dialog.dataset.mode = this.mode; this.currentEmbed = null;
    this.iframe.removeAttribute('src');
  }
  stop() { if (this.dialog.open) this.dialog.close(); this.clear(); }
  dispose() { this.resizeObserver.disconnect(); this.stop(); this.dialog.remove(); }
}
