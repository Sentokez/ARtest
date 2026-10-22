import { validateProject } from './validation.mjs';
import { resolveIcon, iconElement, iconStroke, pointVisual } from './icons.js';

// Public, read-only museum tour. The local editor is kept outside Git.
const $ = id => document.getElementById(id);
if (innerWidth <= 850) document.body.classList.add('scenes-hidden');
const defaults = { accent:'#284985', hotspotBg:'#ffffff', hotspotColor:'#284985', hotspotSize:40, hotspotStroke:2.5, hotspotShape:'circle', animate:true, labels:true, loadingBg:'#284985', loadingMessage:'Sanal tur yükleniyor…' };
let project, viewer, active, toastTimer, loadingTimer;

function notify(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }

function scene() { return project.scenes[active]; }
function pointKind(hs) { return hs.type === 'scene' ? 'scene' : hs.videoURL || hs.URL || hs.cssClass?.includes('type-video') ? 'video' : 'info'; }
function pointIcon(hs) { return resolveIcon(hs, pointKind(hs) === 'scene' ? 'arrow-up' : pointKind(hs)); }
function normalise(data) {
  validateProject(data);
  data.theme = { ...defaults, ...data.theme };
  for (const s of Object.values(data.scenes)) s.hotSpots.forEach(hs => { hs.id ||= crypto.randomUUID(); });
  return data;
}

function applyTheme() {
  const t = project.theme;
  const color = value => /^#[0-9a-f]{6}$/i.test(value) ? value : '#284985';
  for (const [key, value] of Object.entries({ '--accent':color(t.accent), '--hs-stroke':String(iconStroke(t.hotspotStroke)), '--hs-bg':color(t.hotspotBg), '--hs-color':color(t.hotspotColor), '--hs-size':`${Math.max(24,Math.min(80,Number(t.hotspotSize) || 40))}px`, '--hs-radius':t.hotspotShape === 'rounded' ? '10px' : '50%', '--loading-bg':color(t.loadingBg) })) document.documentElement.style.setProperty(key, value);
  document.body.classList.toggle('animate-points', !!t.animate);
  document.body.classList.toggle('show-labels', !!t.labels);
  $('loadingText').textContent = t.loadingMessage;
  document.title = `${project.projectName} · 360° Sanal Tur`;
}
function startLoading() {
  $('loading').hidden = false; $('retry').hidden = true;
  $('loadingText').textContent = project.theme.loadingMessage;
  clearTimeout(loadingTimer);
  loadingTimer = setTimeout(() => loadingError('Görsel yüklenemedi. Dosya yolunu ve WebGL desteğini kontrol edin.'), 25000);
}
function loadingError(text) { clearTimeout(loadingTimer); $('loading').hidden = false; $('loadingText').textContent = text; $('retry').hidden = false; }

function makePoint(hs, index) {
  return {
    id:hs.id, pitch:hs.pitch, yaw:hs.yaw, type:'info', cssClass:'tour-point',
    createTooltipFunc:el => {
      el.replaceChildren(pointVisual(pointIcon(hs)));
      const label = pointKind(hs) === 'scene' ? project.scenes[hs.sceneId]?.title : hs.text || hs.description || 'Bilgi';
      el.dataset.label = label || 'Nokta'; el.setAttribute('aria-label', label || 'Nokta'); el.setAttribute('role','button'); el.tabIndex = 0;
      if (hs.style) {
        if (hs.style.stroke != null) el.style.setProperty('--hs-stroke', String(iconStroke(hs.style.stroke)));
        if (/^#[0-9a-f]{6}$/i.test(hs.style.bg)) el.style.setProperty('--hs-bg', hs.style.bg);
        if (/^#[0-9a-f]{6}$/i.test(hs.style.color)) el.style.setProperty('--hs-color', hs.style.color);
        el.style.setProperty('--hs-size', `${Math.max(24,Math.min(80,Number(hs.style.size) || 40))}px`);
      }
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activatePoint(hs,index); } });
    },
    clickHandlerFunc:e => { e.stopPropagation(); activatePoint(hs,index); }
  };
}

function activatePoint(hs) {
  if (pointKind(hs) === 'scene') return viewer.loadScene(hs.sceneId);
  openContent(hs);
}
function fillScene() { $('sceneHeading').textContent = scene().title; }
function mount(id = project.firstSceneId) {
  clearTimeout(loadingTimer); viewer?.destroy(); active = id;
  applyTheme(); startLoading();
  const scenes = Object.fromEntries(Object.entries(project.scenes).map(([sid,s]) => [sid, { ...s, hfov:s.hfov || 100, hotSpots:s.hotSpots.map(makePoint) }]));
  viewer = pannellum.viewer('panorama', { default:{ firstScene:id, autoLoad:true, sceneFadeDuration:450, showControls:false, escapeHTML:true }, scenes });
  viewer.on('load', () => { clearTimeout(loadingTimer); $('loading').hidden = true; active = viewer.getScene(); renderSceneList(); fillScene(); updateAudio(); });
  viewer.on('scenechange', sid => { active = sid; startLoading(); renderSceneList(); fillScene(); $('audio').pause(); });
  viewer.on('error', text => loadingError(`Panorama açılamadı: ${text}`));
  renderSceneList(); fillScene();
}

function renderSceneList() {
  const query = $('search').value.toLocaleLowerCase('tr');
  $('sceneCount').textContent = Object.keys(project.scenes).length;
  $('sceneList').replaceChildren();
  Object.entries(project.scenes).forEach(([id,s],index) => {
    if (!s.title.toLocaleLowerCase('tr').includes(query)) return;
    const button = document.createElement('button'); button.className = `scene-card${id === active ? ' active' : ''}`; button.setAttribute('aria-current', id === active ? 'true' : 'false');
    const img = document.createElement('img'); img.src = safeAsset(s.thumbnail || s.panorama); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    const text = document.createElement('span'); const title = document.createElement('strong'); title.textContent = s.title;
    const sub = document.createElement('small'); sub.textContent = `${String(index+1).padStart(2,'0')} · ${s.hotSpots.length} nokta${id === project.firstSceneId ? ' · Başlangıç' : ''}`;
    text.append(title,sub); button.append(img,text); button.onclick = () => { if (id !== active) viewer.loadScene(id); if(innerWidth <= 850) document.body.classList.add('scenes-hidden'); }; $('sceneList').append(button);
  });
}

function updateAudio() {
  const audio = $('audio'); audio.pause(); audio.removeAttribute('src');
  $('audioToggle').hidden = !scene().audio; $('audioToggle').textContent = '♫ Sesi oynat';
  if (scene().audio) audio.src = safeAsset(scene().audio);
}
function safeAsset(value) {
  if (!value || typeof value !== 'string') return '';
  try { const url = new URL(value,location.href); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
function embedUrl(value) {
  try {
    const u = new URL(value); if (u.protocol !== 'https:') return null;
    if (['www.youtube.com','youtube.com','youtu.be','www.youtube-nocookie.com'].includes(u.hostname)) {
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.split('/').pop();
      if (/^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (u.hostname === 'drive.google.com') { const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1]; if (id) return `https://drive.google.com/file/d/${id}/preview`; }
    if (u.hostname === 'open.spotify.com' && /^\/(?:embed\/)?(track|episode|album|playlist)\/[\w]+/.test(u.pathname)) return `https://open.spotify.com/embed/${u.pathname.replace(/^\/embed\//,'/').slice(1)}`;
  } catch { /* Unrecognised URL is shown as an external link. */ }
  return null;
}
function openContent(hs) {
  const body = $('contentBody'); body.replaceChildren();
  if (pointKind(hs) === 'video') {
    const url = hs.videoURL || hs.URL; const embed = embedUrl(url);
    if (embed) { const iframe = document.createElement('iframe'); iframe.src = embed; iframe.title = hs.text || 'Müze medya içeriği'; iframe.allow = 'fullscreen; encrypted-media; picture-in-picture'; iframe.allowFullscreen = true; body.append(iframe); }
    const href = safeAsset(url); if (href) { const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'İçeriği yeni sekmede aç ↗'; body.append(a); }
  } else {
    if (hs.coverImage) {
      const img = document.createElement('img'); img.src = safeAsset(hs.coverImage); img.alt = hs.text || 'Eser görseli';
      const viewport = document.createElement('div'); viewport.className = 'image-viewport'; viewport.append(img);
      const controls = document.createElement('div'); controls.className = 'image-tools'; let scale = 1;
      const resize = () => { img.style.width = `${scale*100}%`; };
      for (const [label,fn] of [['−',() => scale = Math.max(1,scale-.25)],['Sıfırla',() => scale = 1],['+',() => scale = Math.min(4,scale+.25)]]) { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { fn(); resize(); }; controls.append(b); }
      resize(); body.append(controls,viewport);
    }
    const text = document.createElement('p'); text.textContent = hs.description || hs.text || ''; body.append(text);
  }
  $('contentDialog').showModal();
}

function handle(id, fn) { $(id).addEventListener('click', async event => { try { await fn(event); } catch(error) { notify(error.message); } }); }


handle('retry', () => mount(active));
handle('toggleScenes', () => { document.body.classList.toggle('scenes-hidden'); viewer.resize(); });
handle('zoomIn', () => viewer.setHfov(viewer.getHfov()-10));
handle('zoomOut', () => viewer.setHfov(viewer.getHfov()+10));
handle('fullscreen', async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await $('stage').requestFullscreen(); });
document.addEventListener('fullscreenchange', () => {
  for (const id of ['contentDialog']) (document.fullscreenElement ? $('stage') : document.body).append($(id));
  viewer?.resize();
});
handle('audioToggle', async () => { const audio = $('audio'); if (audio.paused) await audio.play(); else audio.pause(); $('audioToggle').textContent = audio.paused ? '♫ Sesi oynat' : 'Ⅱ Sesi durdur'; });
$('audio').addEventListener('error', () => notify('Ses dosyası açılamadı. Dosya yolunu kontrol edin.'));
handle('closeContent', () => { $('contentDialog').close(); });
$('contentDialog').addEventListener('close', () => $('contentBody').replaceChildren());
$('search').addEventListener('input', renderSceneList);

new ResizeObserver(() => viewer?.resize()).observe($('stage'));

try {
  const response = await fetch('config.json', {cache:'no-store'}); if (!response.ok) throw new Error('config.json okunamadı.');
  project = normalise(await response.json());
  if (!window.pannellum) throw new Error('360° görüntüleyici dosyası yüklenemedi.');
  mount();
} catch(error) { loadingError(error.message + ' Lütfen sayfayı yenileyin.'); }
