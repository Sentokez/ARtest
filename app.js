import { validateProject } from './validation.mjs';

const $ = id => document.getElementById(id);
const editor = location.pathname.endsWith('/editor.html');
document.body.classList.toggle('is-editor', editor);
if (innerWidth <= 850) document.body.classList.add('scenes-hidden');
const defaults = { accent:'#284985', hotspotBg:'#ffffff', hotspotColor:'#284985', hotspotSize:40, hotspotShape:'circle', animate:true, labels:true, loadingBg:'#284985', loadingMessage:'Sanal tur yükleniyor…' };
const symbols = { 'arrow-up':'↑', 'arrow-right':'→', 'arrow-left':'←', 'arrow-down':'↓', info:'i', video:'▷' };
let project, viewer, active, dirty = false, preview = false, placing = null, pointIndex = null, toastTimer, loadingTimer, movingPoint = null;
let renderedPointIds = [];
let revision = 0;
let copiedPoint = null;
const history = [];
function notify(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
function changed() { revision++; dirty = true; $('saveState').textContent = 'Kaydedilmemiş değişiklikler'; }
function snapshot() { history.push(JSON.stringify(project)); if (history.length > 30) history.shift(); }
function scene() { return project.scenes[active]; }
function pointKind(hs) { return hs.type === 'scene' ? 'scene' : hs.videoURL || hs.URL || hs.cssClass?.includes('type-video') ? 'video' : 'info'; }
function pointIcon(hs) { return hs.icon || Object.keys(symbols).find(icon => hs.cssClass?.includes(`icon-${icon}`)) || (pointKind(hs) === 'scene' ? 'arrow-up' : pointKind(hs)); }
function normalise(data) {
  validateProject(data);
  data.theme = { ...defaults, ...data.theme };
  for (const s of Object.values(data.scenes)) s.hotSpots.forEach(hs => { hs.id ||= crypto.randomUUID(); });
  return data;
}
function applyTheme() {
  const t = project.theme;
  const color = value => /^#[0-9a-f]{6}$/i.test(value) ? value : '#284985';
  for (const [key, value] of Object.entries({ '--accent':color(t.accent), '--hs-bg':color(t.hotspotBg), '--hs-color':color(t.hotspotColor), '--hs-size':`${Math.max(24,Math.min(80,Number(t.hotspotSize) || 40))}px`, '--hs-radius':t.hotspotShape === 'rounded' ? '10px' : '50%', '--loading-bg':color(t.loadingBg) })) document.documentElement.style.setProperty(key, value);
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
      el.textContent = symbols[pointIcon(hs)] || 'i';
      const label = pointKind(hs) === 'scene' ? project.scenes[hs.sceneId]?.title : hs.text || hs.description || 'Bilgi';
      el.dataset.label = label || 'Nokta'; el.setAttribute('aria-label', label || 'Nokta'); el.setAttribute('role','button'); el.tabIndex = 0;
      if (hs.style) {
        if (/^#[0-9a-f]{6}$/i.test(hs.style.bg)) el.style.setProperty('--hs-bg', hs.style.bg);
        if (/^#[0-9a-f]{6}$/i.test(hs.style.color)) el.style.setProperty('--hs-color', hs.style.color);
        el.style.setProperty('--hs-size', `${Math.max(24,Math.min(80,Number(hs.style.size) || 40))}px`);
      }
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activatePoint(hs,index); } });
    },
    clickHandlerFunc:e => { e.stopPropagation(); activatePoint(hs,index); }
  };
}
function activatePoint(hs,index) {
  if (placing) return;
  if (editor && !preview) return editPoint(index);
  if (pointKind(hs) === 'scene') return viewer.loadScene(hs.sceneId);
  openContent(hs);
}
function syncPoints() {
  for (const id of renderedPointIds) viewer.removeHotSpot(id, active);
  renderedPointIds = scene().hotSpots.map(hs => hs.id);
  scene().hotSpots.forEach((hs,index) => viewer.addHotSpot(makePoint(hs,index), active));
  renderPointList();
}
function mount(id = project.firstSceneId, view) {
  clearTimeout(loadingTimer); viewer?.destroy(); active = id; renderedPointIds = [];
  applyTheme(); startLoading();
  const scenes = Object.fromEntries(Object.entries(project.scenes).map(([sid,s]) => [sid, { ...s, hfov:s.hfov || 100, hotSpots:s.hotSpots.map(makePoint) }]));
  viewer = pannellum.viewer('panorama', { default:{ firstScene:id, autoLoad:true, sceneFadeDuration:450, showControls:false, escapeHTML:true }, scenes });
  viewer.on('load', () => { clearTimeout(loadingTimer); $('loading').hidden = true; active = viewer.getScene(); renderedPointIds = scene().hotSpots.map(hs => hs.id); renderSceneList(); fillScene(); updateAudio(); });
  viewer.on('scenechange', sid => { active = sid; startLoading(); renderSceneList(); fillScene(); $('audio').pause(); });
  viewer.on('error', text => loadingError(`Panorama açılamadı: ${text}`));
  if (view) viewer.lookAt(view.pitch, view.yaw, view.hfov, false);
  renderSceneList(); fillScene(); fillTheme();
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
    text.append(title,sub); button.append(img,text); button.onclick = () => { cancelPlacement(); if (id !== active) viewer.loadScene(id); if(innerWidth <= 850) document.body.classList.add('scenes-hidden'); }; $('sceneList').append(button);
  });
}
function fillScene() {
  $('sceneHeading').textContent = scene().title;
  $('sceneTitle').value = scene().title; $('scenePath').value = scene().panorama; $('sceneAudio').value = scene().audio || '';
  $('setFirst').textContent = active === project.firstSceneId ? '✓ Başlangıç' : 'Başlangıç yap'; renderPointList();
}
function renderPointList() {
  $('hotspotCount').textContent = scene().hotSpots.length; $('hotspotList').replaceChildren();
  scene().hotSpots.forEach((hs,index) => {
    const button = document.createElement('button'); button.className = 'hotspot-row';
    const icon = document.createElement('span'); icon.textContent = symbols[pointIcon(hs)] || 'i';
    const text = document.createElement('span'); text.textContent = (pointKind(hs) === 'scene' ? project.scenes[hs.sceneId]?.title : hs.text || hs.description) || 'Bilgi noktası';
    button.append(icon,text); button.onclick = () => editPoint(index); $('hotspotList').append(button);
  });
}
function fillTheme() {
  $('projectName').value = project.projectName;
  for (const key of Object.keys(defaults)) { const el = $(key); if (el) { if (el.type === 'checkbox') el.checked = !!project.theme[key]; else el.value = project.theme[key]; } }
  $('sizeOutput').textContent = `${project.theme.hotspotSize} px`;
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
function editPoint(index, coords, kind) {
  pointIndex = index;
  const hs = index == null ? { pitch:coords[0], yaw:coords[1], type:kind, text:'', description:'', icon:kind === 'scene' ? 'arrow-up' : kind } : scene().hotSpots[index];
  $('pointType').value = kind || pointKind(hs); $('pointText').value = hs.text || ''; $('pointDescription').value = hs.description || '';
  $('pointUrl').value = hs.videoURL || hs.URL || ''; $('pointImage').value = hs.coverImage || ''; $('pointIcon').value = pointIcon(hs);
  $('pointPitch').value = hs.pitch; $('pointYaw').value = hs.yaw;
  $('pointTarget').replaceChildren();
  Object.entries(project.scenes).forEach(([id,s]) => { if (id !== active) { const option = new Option(s.title,id); $('pointTarget').add(option); } });
  if (hs.sceneId) $('pointTarget').value = hs.sceneId;
  $('customStyle').checked = !!hs.style; $('pointBg').value = hs.style?.bg || project.theme.hotspotBg; $('pointColor').value = hs.style?.color || project.theme.hotspotColor; $('pointSize').value = hs.style?.size || project.theme.hotspotSize;
  $('deletePoint').hidden = index == null; $('reposition').hidden = index == null; $('copyPoint').hidden = index == null;
  showPointFields(); $('pointDialog').showModal();
}
function showPointFields() {
  const kind = $('pointType').value;
  $('targetField').hidden = kind !== 'scene'; $('urlField').hidden = kind !== 'video'; $('imageField').hidden = kind !== 'info'; $('descriptionField').hidden = kind !== 'info';
  $('pointTarget').required = kind === 'scene'; $('pointUrl').required = kind === 'video';
}
function cancelPlacement() { placing = null; movingPoint = null; document.body.classList.remove('placing'); $('placementHint').hidden = true; $('cancelPlace').hidden = true; document.querySelectorAll('.stage-toolbar .selected').forEach(el => el.classList.remove('selected')); }
function place(kind, index = null) { cancelPlacement(); placing = kind; movingPoint = index; document.body.classList.add('placing'); $('placementHint').textContent = kind === 'copy' ? 'Kopyayı yerleştirmek için panoramada bir konuma tıklayın. İptal: Esc' : 'Panoramada bir konuma tıklayın. İptal: Esc'; $('placementHint').hidden = false; $('cancelPlace').hidden = false; $({scene:'placeScene',info:'placeInfo',video:'placeVideo',copy:'pastePoint'}[kind]).classList.add('selected'); }
function readPointForm() {
  if (!$('pointForm').reportValidity()) return null;
  const kind = $('pointType').value;
  if (kind === 'scene' && !project.scenes[$('pointTarget').value]) { notify('Bir hedef sahne seçin.'); return null; }
  if (kind === 'video' && !/^https?:\/\//i.test($('pointUrl').value)) { notify('Geçerli bir HTTP veya HTTPS bağlantısı girin.'); return null; }
  const old = pointIndex == null ? {} : scene().hotSpots[pointIndex];
  const hs = { ...old, id:old.id || crypto.randomUUID(), type:kind === 'scene' ? 'scene' : 'info', text:$('pointText').value, description:$('pointDescription').value, pitch:Number($('pointPitch').value), yaw:Number($('pointYaw').value), icon:$('pointIcon').value };
  delete hs.URL; delete hs.videoURL; delete hs.sceneId; delete hs.coverImage; delete hs.cssClass; delete hs.style;
  if (kind === 'scene') hs.sceneId = $('pointTarget').value;
  if (kind === 'video') hs.videoURL = $('pointUrl').value;
  if (kind === 'info') hs.coverImage = $('pointImage').value || null;
  if ($('customStyle').checked) hs.style = {bg:$('pointBg').value,color:$('pointColor').value,size:Number($('pointSize').value)};
  return hs;
}
async function api(url, options = {}) {
  const response = await fetch(url,{ ...options, headers:{ 'X-Tour-Editor':'1',...options.headers } });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'İşlem başarısız.'); return result;
}
function pickFile(accept, multiple = false) {
  return new Promise(resolve => { const input = $('fileInput'); input.accept = accept; input.multiple = multiple; input.value = ''; input.onchange = () => resolve([...input.files]); input.oncancel = () => resolve([]); input.click(); });
}
async function upload(file) { return (await api(`/api/upload?name=${encodeURIComponent(file.name)}`,{ method:'POST', body:file })).path; }
async function uploadThumbnail(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = Math.round(320*bitmap.height/bitmap.width);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.75));
  return upload(new File([blob], 'thumbnail.jpg', {type:'image/jpeg'}));
}
async function uploadScene(replace = false) {
  const files = await pickFile('image/jpeg,image/png,image/webp', !replace); if (!files.length) return;
  notify('Görseller yükleniyor…');
  let last, uploaded = false;
  const target = active;
  try { for (const file of files) {
    // Decode before uploading, so a renamed non-image cannot become a scene.
    const bitmap = await createImageBitmap(file); const ratio = bitmap.width / bitmap.height; bitmap.close();
    if (Math.abs(ratio-2) > .1) throw new Error(`${file.name}: 360° panorama yaklaşık 2:1 oranında olmalı.`);
    const panorama = await upload(file); const thumbnail = await uploadThumbnail(file);
    snapshot();
    if (replace) {
      if (!project.scenes[target]) throw new Error('Görsel yüklenirken hedef sahne silindi.');
      Object.assign(project.scenes[target], { panorama, thumbnail });
    }
    else { last = `scene_${crypto.randomUUID()}`; project.scenes[last] = { title:file.name.replace(/\.[^.]+$/,''), panorama, thumbnail, pitch:0, yaw:0, hfov:100, audio:null, hotSpots:[] }; }
    changed(); uploaded = true;
  } } finally { if (uploaded) mount(last || (project.scenes[target] ? target : project.firstSceneId)); }
  notify('Görseller eklendi. Projeyi kaydetmeyi unutmayın.');
}
function handle(id, fn) { $(id).addEventListener('click', async event => { try { await fn(event); } catch(error) { notify(error.message); } }); }

handle('retry', () => mount(active));
handle('toggleScenes', () => { document.body.classList.toggle('scenes-hidden'); viewer.resize(); });
handle('zoomIn', () => viewer.setHfov(viewer.getHfov()-10));
handle('zoomOut', () => viewer.setHfov(viewer.getHfov()+10));
handle('fullscreen', async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await $('stage').requestFullscreen(); });
document.addEventListener('fullscreenchange', () => {
  for (const id of ['pointDialog','contentDialog']) (document.fullscreenElement ? $('stage') : document.body).append($(id));
  viewer?.resize();
});
handle('audioToggle', async () => { const audio = $('audio'); if (audio.paused) await audio.play(); else audio.pause(); $('audioToggle').textContent = audio.paused ? '♫ Sesi oynat' : 'Ⅱ Sesi durdur'; });
$('audio').addEventListener('error', () => notify('Ses dosyası açılamadı. Dosya yolunu kontrol edin.'));
handle('closeContent', () => { $('contentDialog').close(); });
$('contentDialog').addEventListener('close', () => $('contentBody').replaceChildren());
$('search').addEventListener('input', renderSceneList);
let down;
$('panorama').addEventListener('pointerdown', e => down = {x:e.clientX,y:e.clientY});
$('panorama').addEventListener('click', e => {
  if (!placing || !viewer.isLoaded() || !down || Math.hypot(e.clientX-down.x,e.clientY-down.y) > 6) return;
  const coords = viewer.mouseEventToCoords(e); const kind = placing; const index = movingPoint;
  cancelPlacement();
  if (kind === 'copy' && copiedPoint) {
    if (copiedPoint.type === 'scene' && !project.scenes[copiedPoint.sceneId]) return notify('Kopyalanan geçişin hedef sahnesi silinmiş. Başka bir nokta kopyalayın.');
    snapshot();
    scene().hotSpots.push({ ...structuredClone(copiedPoint), id:crypto.randomUUID(), pitch:coords[0], yaw:coords[1] });
    syncPoints(); renderSceneList(); changed(); notify('Nokta kopyası eklendi. Tekrar eklemek için “Noktayı yapıştır”ı kullanın.');
  }
  else if (index != null) { snapshot(); scene().hotSpots[index].pitch = coords[0]; scene().hotSpots[index].yaw = coords[1]; syncPoints(); changed(); editPoint(index); }
  else editPoint(null,coords,kind);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') cancelPlacement(); });
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
new ResizeObserver(() => viewer?.resize()).observe($('stage'));

if (editor) {
  handle('preview', () => { preview = !preview; cancelPlacement(); document.body.classList.toggle('is-preview',preview); $('preview').textContent = preview ? 'Düzenlemeye dön' : 'Ön izleme'; $('modeLabel').textContent = preview ? 'ÖN İZLEME' : 'DÜZENLEME ALANI'; viewer.resize(); });
  for (const kind of ['scene','info','video']) handle({scene:'placeScene',info:'placeInfo',video:'placeVideo'}[kind], () => place(kind));
  handle('cancelPlace', cancelPlacement);
  handle('closePoint', () => $('pointDialog').close());
  handle('copyPoint', () => {
    const hs = readPointForm(); if (!hs) return;
    copiedPoint = structuredClone(hs);
    $('pastePoint').hidden = false;
    $('pointDialog').close(); place('copy');
    notify('Nokta kopyalandı. Panoramada eklemek istediğiniz yere tıklayın.');
  });
  handle('pastePoint', () => { if (copiedPoint) place('copy'); });
  $('pointType').addEventListener('change', showPointFields);
  $('pointForm').addEventListener('submit', e => {
    e.preventDefault();
    const hs = readPointForm(); if (!hs) return;
    snapshot(); if (pointIndex == null) scene().hotSpots.push(hs); else scene().hotSpots[pointIndex] = hs;
    syncPoints(); renderSceneList(); changed(); $('pointDialog').close();
  });
  handle('deletePoint', () => { snapshot(); scene().hotSpots.splice(pointIndex,1); syncPoints(); renderSceneList(); changed(); $('pointDialog').close(); });
  handle('reposition', () => { const index = pointIndex; $('pointDialog').close(); place(pointKind(scene().hotSpots[index]),index); });
  handle('uploadCover', async () => { const [file] = await pickFile('image/jpeg,image/png,image/webp'); if(file) $('pointImage').value = await upload(file); });
  handle('save', async () => {
    const button = $('save'); button.disabled = true;
    const savedRevision = revision;
    try {
      validateProject(project); await api('/api/save',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(project) });
      if (savedRevision === revision) { dirty = false; $('saveState').textContent = '✓ Proje kaydedildi'; notify('Proje kaydedildi. Önceki sürüm backups klasöründe.'); }
      else notify('Önceki değişiklikler kaydedildi. Kayıt sırasında yaptığınız düzenlemeleri ayrıca kaydedin.');
    }
    finally { button.disabled = false; }
  });
  handle('addScene', () => uploadScene()); handle('replaceScene', () => uploadScene(true));
  $('sceneTitle').addEventListener('change', () => { const title = $('sceneTitle').value.trim(); if (!title) return fillScene(); snapshot(); scene().title = title; fillScene(); renderSceneList(); syncPoints(); changed(); });
  $('sceneAudio').addEventListener('change', () => { snapshot(); scene().audio = $('sceneAudio').value.trim() || null; updateAudio(); changed(); });
  handle('uploadAudio', async () => { const [file] = await pickFile('.mp3,.wav,.ogg'); if(file) { const asset = await upload(file); snapshot(); scene().audio = asset; fillScene(); updateAudio(); changed(); } });
  handle('clearAudio', () => { snapshot(); scene().audio = null; fillScene(); updateAudio(); changed(); });
  handle('saveView', () => { snapshot(); Object.assign(scene(),{pitch:viewer.getPitch(),yaw:viewer.getYaw(),hfov:viewer.getHfov()}); changed(); notify('Bu sahnenin başlangıç açısı kaydedildi.'); });
  handle('setFirst', () => { snapshot(); project.firstSceneId = active; changed(); renderSceneList(); fillScene(); });
  handle('deleteScene', () => {
    if (Object.keys(project.scenes).length === 1) return notify('Son sahne silinemez.');
    if (!confirm(`“${scene().title}” sahnesi ve bu sahneye gelen geçişler silinsin mi? Görsel dosyası korunur.`)) return;
    snapshot(); delete project.scenes[active];
    for (const s of Object.values(project.scenes)) s.hotSpots = s.hotSpots.filter(hs => hs.sceneId !== active);
    if (!project.scenes[project.firstSceneId]) project.firstSceneId = Object.keys(project.scenes)[0];
    changed(); mount();
  });
  for (const tab of ['scene','theme']) handle(`${tab}Tab`, () => { for (const id of ['scene','theme']) { $(`${id}Settings`).hidden = id !== tab; $(`${id}Tab`).classList.toggle('active',id === tab); $(`${id}Tab`).setAttribute('aria-selected',String(id === tab)); } });
  $('projectName').addEventListener('change', () => { snapshot(); project.projectName = $('projectName').value.trim() || 'Ankara Üniversitesi Müzesi'; applyTheme(); changed(); });
  for (const key of Object.keys(defaults)) {
    const el = $(key); if (!el) continue;
    el.addEventListener('change', () => { snapshot(); project.theme[key] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value; applyTheme(); $('sizeOutput').textContent = `${project.theme.hotspotSize} px`; changed(); });
    if (el.type === 'range' || el.type === 'color') el.addEventListener('input', () => { const value = project.theme[key]; project.theme[key] = el.type === 'range' ? Number(el.value) : el.value; applyTheme(); $('sizeOutput').textContent = `${project.theme.hotspotSize} px`; project.theme[key] = value; });
  }
  handle('export', () => { const blob = new Blob([JSON.stringify(project,null,2)],{type:'application/json'}); const a = document.createElement('a'); const url = URL.createObjectURL(blob); a.href = url; a.download = 'muze-tur-projesi.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); notify('JSON indirildi. Görsel ve ses dosyalarını ayrıca saklayın.'); });
  handle('import', async () => { const [file] = await pickFile('.json'); if (!file) return; const next = normalise(JSON.parse(await file.text())); if (dirty && !confirm('Kaydedilmemiş düzenlemeler yerine içe aktarılan proje açılsın mı?')) return; snapshot(); project = next; changed(); mount(); notify('Proje açıldı. Kalıcı olması için kaydedin.'); });
  // Undo is intentionally project-wide, including destructive scene changes.
  const undo = document.createElement('button'); undo.textContent = '↶ Geri al'; undo.title = 'Son proje değişikliğini geri al'; $('preview').before(undo);
  undo.onclick = () => { if (!history.length) return notify('Geri alınacak değişiklik yok.'); const id = active; project = JSON.parse(history.pop()); changed(); mount(project.scenes[id] ? id : project.firstSceneId); notify('Son değişiklik geri alındı.'); };
  $('modeLabel').textContent = 'DÜZENLEME ALANI';
}

try {
  const response = await fetch('config.json', {cache:'no-store'}); if (!response.ok) throw new Error('config.json okunamadı.');
  project = normalise(await response.json());
  if (!window.pannellum) throw new Error('360° görüntüleyici dosyası yüklenemedi.');
  mount(); $('saveState').textContent = 'Proje açıldı';
} catch(error) { loadingError(error.message + ' Projeyi yerel sunucu ile açın.'); }
