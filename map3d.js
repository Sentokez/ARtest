import * as THREE from 'three';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { DEFAULT_MAP, mapOpacity, mapMiniTilt, mapMiniZoom, validMapPoint, mapHeading } from './map-data.js';

function element(tag, className, text) {
  const el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el;
}
export class MuseumMap {
  constructor({ getProject, getActive, onNavigate, onOpacityChange, keepOpen = false }) {
    Object.assign(this, {getProject, getActive, onNavigate, onOpacityChange, keepOpen});
    this.markers = new Map(); this.raycaster = new THREE.Raycaster(); this.frame = null;
    this.dialog = element('dialog', 'map-dialog'); this.dialog.id = 'map3dDialog'; this.dialog.setAttribute('aria-labelledby','map3dTitle');
    const header = element('div','map-header');
    const heading = element('div'); heading.append(element('span','eyebrow','MÜZEYE GENEL BAKIŞ'));
    const title = element('h2',null,'3D Müze Haritası'); title.id = 'map3dTitle'; heading.append(title);
    const close = element('button','map-close','×'); close.type = 'button'; close.setAttribute('aria-label','Haritayı kapat'); close.onclick = () => this.close(); header.append(heading,close);
    this.layout = element('div','map-layout'); this.viewport = element('div','map-viewport');
    this.viewport.setAttribute('aria-label','Üç boyutlu müze modeli');
    this.markerLayer = element('div','map-marker-layer');
    this.status = element('div','map-status','3D model yükleniyor…'); this.status.setAttribute('role','status');
    this.retry = element('button',null,'Tekrar dene'); this.retry.type = 'button'; this.retry.hidden = true;
    this.retry.onclick = () => { this.load().then(() => this.animate()).catch(error => this.showError(error)); };
    this.viewport.append(this.markerLayer,this.status,this.retry);
    this.panel = element('aside','map-editor-controls'); this.panel.hidden = true;
    this.layout.append(this.viewport,this.panel);
    const footer = element('div','map-footer');
    this.hint = element('p','map-hint','Döndürmek için sürükleyin · Yakınlaştırmak için kaydırın · Noktadan sahneye geçin');
    const controls = element('div','map-view-tools');
    const opacityLabel = element('label','map-opacity-label','Model opaklığı ');
    this.opacityOutput = element('output'); this.opacityInput = document.createElement('input');
    this.opacityInput.type = 'range'; this.opacityInput.min = '10'; this.opacityInput.max = '100'; this.opacityInput.step = '5'; this.opacityInput.setAttribute('aria-label','Model opaklığı');
    opacityLabel.append(this.opacityOutput,this.opacityInput);
    this.opacityInput.addEventListener('input', () => this.setOpacity(Number(this.opacityInput.value)/100));
    this.opacityInput.addEventListener('change', () => this.onOpacityChange?.(this.opacity));
    const top = element('button',null,'Üstten bak'); top.type = 'button'; top.onclick = () => this.fit(true);
    const reset = element('button',null,'Açıyı sıfırla'); reset.type = 'button'; reset.onclick = () => this.fit();
    controls.append(opacityLabel,top,reset); footer.append(this.hint,controls);
    this.dialog.append(header,this.layout,footer);
    (document.fullscreenElement || document.body).append(this.dialog);
    close.textContent = '↙'; close.title = 'Mini haritaya dön'; close.setAttribute('aria-label','Haritayı küçült');
    this.miniDock = element('section','map-minimap'); this.miniDock.hidden = true; this.miniDock.setAttribute('aria-label','Müze mini haritası');
    this.miniOpen = element('button','map-mini-open'); this.miniOpen.type = 'button'; this.miniOpen.setAttribute('aria-label','3D haritayı büyüt'); this.miniOpen.setAttribute('aria-haspopup','dialog');
    const miniLabel = element('span','map-mini-label','MÜZE HARİTASI');
    this.miniName = element('span','map-mini-scene');
    const expandLabel = element('span','map-mini-expand','Büyüt ↗');
    this.miniOpen.append(miniLabel,this.miniName,expandLabel);
    this.miniOpen.onclick = () => this.open();
    this.miniDock.append(this.viewport,this.miniOpen);
    (document.getElementById('stage') || document.body).append(this.miniDock);
    this.dialog.addEventListener('close', () => {
      if (this.dialog.open) return; // A fullscreen reparent may have reopened it already.
      this.cancelPlacement(); this.onClose?.(); this.dock();
    });
    this.onFullscreen = () => {
      const wasOpen = this.dialog.open;
      if (wasOpen) this.dialog.close();
      (document.fullscreenElement || document.body).append(this.dialog);
      if (wasOpen) { this.dialog.showModal(); this.resize(); this.animate(); }
    };
    document.addEventListener('fullscreenchange',this.onFullscreen);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.viewport);
  }
  settings() { return this.getProject().map3d || DEFAULT_MAP; }
  hide() {
    this.suspended = true;
    if (this.dialog.open) this.dialog.close();
    this.miniDock.hidden = true; this.stop(); this.cancelPlacement();
  }
  async showMini() {
    if (this.settings().enabled === false) { this.hide(); return; }
    if (this.dialog.open) return;
    this.suspended = false;
    this.dock();
    try {
      this.initRenderer(); this.controls.enabled = false; this.resize();
      if (!this.model || this.loadedPath !== this.settings().model) await this.load();
      this.setOpacity(this.settings().opacity); this.setMiniTilt(this.settings().miniTilt); this.setMiniZoom(this.settings().miniZoom); this.refreshMarkers(); this.animate();
    } catch(error) { this.showError(error); }
  }
  dock() {
    if (this.suspended) { this.miniDock.hidden = true; this.stop(); return; }
    this.miniDock.prepend(this.viewport); this.miniDock.hidden = false;
    this.markerLayer.setAttribute('aria-hidden','true');
    if (this.controls) this.controls.enabled = false;
    this.resize(); if (this.model) this.animate();
  }
  async open() {
    if (this.settings().enabled === false) { this.hide(); return; }
    this.suspended = false;
    this.miniDock.hidden = true; this.layout.prepend(this.viewport);
    this.markerLayer.setAttribute('aria-hidden','false');
    if (!this.dialog.open) this.dialog.showModal();
    try {
      this.initRenderer(); this.controls.enabled = true; this.resize();
      if (!this.model || this.loadedPath !== this.settings().model) await this.load();
      this.setOpacity(this.settings().opacity); this.setMiniTilt(this.settings().miniTilt); this.setMiniZoom(this.settings().miniZoom); this.refreshMarkers(); this.animate();
    } catch(error) { this.showError(error); }
  }
  close() { this.dialog.close(); }
  initRenderer() {
    if (this.renderer) return;
    const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer; renderer.domElement.className = 'map-canvas';
    renderer.domElement.setAttribute('aria-label','Müze modeli. Sahneleri seçmek için harita noktalarını kullanın.');
    this.viewport.prepend(renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#edf1ef');
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x708680,2.8));
    const sun = new THREE.DirectionalLight(0xffffff,2.5); sun.position.set(5,12,8); this.scene.add(sun);
    this.camera = new THREE.OrthographicCamera(-5,5,5,-5,0.01,1000);
    this.miniCamera = new THREE.OrthographicCamera(-5,5,5,-5,0.01,1000);
    this.controls = new OrbitControls(this.camera,renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = .09;
    this.controls.minPolarAngle = .03; this.controls.maxPolarAngle = Math.PI*.48;
    this.controls.minZoom = .2; this.controls.maxZoom = 8;
    renderer.domElement.addEventListener('pointerdown', event => { this.down = {x:event.clientX,y:event.clientY}; });
    renderer.domElement.addEventListener('click', event => this.pick(event));
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.stop(); this.status.hidden = false; this.status.textContent = '3D grafik bağlantısı kesildi. Görüntü geri geldiğinde harita devam edecek.';
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => { this.status.hidden = true; this.animate(); });
  }
  async load() {
    if (this.loading) return this.loading;
    this.loading = this.loadModel();
    try { await this.loading; } finally { this.loading = null; }
  }
  async loadModel() {
    this.initRenderer(); this.status.hidden = false; this.status.textContent = '3D model yükleniyor…'; this.retry.hidden = true;
    const path = this.settings().model || DEFAULT_MAP.model;
    const url = new URL(path,location.href);
    if (url.origin !== location.origin || !url.pathname.endsWith('.glb')) throw new Error('Model aynı projede bir GLB dosyası olmalı.');
    const response = await fetch(url); if (!response.ok) throw new Error('Model dosyası okunamadı. Sunucuyu yeniden başlatıp deneyin.');
    const data = await response.arrayBuffer();
    const loaded = await new GLTFLoader().parseAsync(data,new URL('.',url).href);
    const model = loaded.scene;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || !Number.isFinite(size.length()) || size.length() < 1e-8) { this.disposeObject(model); throw new Error('Modelde görünür bir geometri bulunamadı.'); }
    // Replace only after a successful load, so a bad upload cannot remove the old model.
    if (this.model) { this.scene.remove(this.model); this.disposeObject(this.model); }
    if (this.grid) { this.scene.remove(this.grid); this.disposeObject(this.grid); }
    this.model = model; this.bounds = bounds; this.span = Math.max(size.x,size.z,size.y,.1); this.floorY = bounds.min.y + this.span*.002;
    this.setMiniTilt(this.settings().miniTilt);
    this.setMiniZoom(this.settings().miniZoom);
    model.traverse(node => {
      if (!node.isMesh) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        material.userData.mapOriginalOpacity = material.opacity;
        material.side = THREE.DoubleSide; material.forceSinglePass = true;
      }
    });
    this.scene.add(model);
    this.grid = new THREE.GridHelper(this.span*1.5,20,0x9caca4,0xbfcac4); this.grid.position.copy(bounds.getCenter(new THREE.Vector3())); this.grid.position.y = bounds.min.y-this.span*.003;
    this.grid.material.transparent = true; this.grid.material.opacity = .25; this.scene.add(this.grid);
    this.loadedPath = path; this.setOpacity(this.settings().opacity); this.fit();
    const view = this.settings().view;
    if (view && [view.position,view.target].every(array => Array.isArray(array) && array.length === 3 && array.every(Number.isFinite))) {
      this.camera.position.fromArray(view.position); this.controls.target.fromArray(view.target); this.camera.zoom = Math.max(.2,Math.min(8,view.zoom || 1)); this.camera.updateProjectionMatrix(); this.controls.update();
    }
    this.status.hidden = true; this.refreshMarkers(); this.resize();
  }
  showError(error) {
    this.status.hidden = false; this.status.textContent = `Harita açılamadı: ${error.message || error}`;
    this.retry.hidden = false;
  }
  setMiniZoom(value) {
    this.miniZoom = mapMiniZoom(value);
    if (!this.miniCamera) return;
    this.miniCamera.zoom = this.miniZoom; this.miniCamera.updateProjectionMatrix(); this.updateMarkers();
  }
  setMiniTilt(value) {
    this.miniTilt = mapMiniTilt(value);
    this.miniFocus = null;
    this.centerMiniCamera(); this.resize(); this.updateMarkers();
  }
  centerMiniCamera(current = this.getActive()) {
    if (!this.bounds || !this.miniCamera) return;
    const point = this.settings().points?.[current.id];
    // Match the lifted marker's position exactly, so it projects to the viewport center.
    const center = validMapPoint(point) ? new THREE.Vector3(point.x,point.y+this.span*.008,point.z) : this.bounds.getCenter(new THREE.Vector3());
    const tilt = this.miniTilt ?? mapMiniTilt(this.settings().miniTilt);
    const previous = this.miniFocus;
    if (previous && previous.x === center.x && previous.y === center.y && previous.z === center.z && previous.tilt === tilt && previous.span === this.span) return;
    this.miniFocus = {x:center.x,y:center.y,z:center.z,tilt,span:this.span};
    const angle = THREE.MathUtils.degToRad(tilt), distance = this.span*1.8;
    const horizontal = distance*Math.cos(angle), azimuth = Math.atan2(.25,.45);
    this.miniCamera.position.set(center.x+horizontal*Math.sin(azimuth),center.y+distance*Math.sin(angle),center.z+horizontal*Math.cos(azimuth));
    this.miniCamera.near = this.span*.001; this.miniCamera.far = this.span*30;
    this.miniCamera.lookAt(center); this.miniCamera.updateMatrixWorld();
  }
  setOpacity(value) {
    this.opacity = mapOpacity(value); this.opacityInput.value = String(Math.round(this.opacity*100)); this.opacityOutput.textContent = `%${Math.round(this.opacity*100)}`;
    this.model?.traverse(node => {
      if (!node.isMesh) return;
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
        const transparent = this.opacity < 1 || material.userData.mapOriginalOpacity < 1;
        if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
        material.opacity = this.opacity*(material.userData.mapOriginalOpacity ?? 1); material.depthWrite = !transparent;
      }
    });
  }
  fit(top = false) {
    if (!this.bounds) return;
    const center = this.bounds.getCenter(new THREE.Vector3());
    this.controls.target.copy(center);
    this.camera.position.set(center.x+(top ? 0 : this.span*.9),center.y+this.span*1.3,center.z+(top ? .001*this.span : this.span*.9));
    this.camera.zoom = 1; this.camera.near = this.span*.001; this.camera.far = this.span*30;
    this.controls.update(); this.resize();
  }
  cameraView() { return {position:this.camera.position.toArray(),target:this.controls.target.toArray(),zoom:this.camera.zoom}; }
  resize() {
    if (!this.renderer) return;
    const width = this.viewport.clientWidth, height = this.viewport.clientHeight; if (!width || !height) return;
    this.renderer.setSize(width,height,false);
    const aspect = width/height;
    for (const camera of [this.camera,this.miniCamera]) {
      const extent = (this.span || 10)*(camera === this.miniCamera ? .62 : .75);
      camera.left = -extent*Math.max(1,aspect); camera.right = extent*Math.max(1,aspect);
      camera.top = extent/Math.min(1,aspect); camera.bottom = -extent/Math.min(1,aspect);
      camera.updateProjectionMatrix();
    }
  }
  refreshMarkers() {
    this.markerLayer.replaceChildren(); this.markers.clear();
    const project = this.getProject();
    Object.entries(project.scenes).forEach(([id,s],index) => {
      const point = this.settings().points?.[id]; if (!validMapPoint(point)) return;
      const button = element('button','map-marker',String(index+1)); button.type = 'button'; button.title = s.title; button.setAttribute('aria-label',s.title);
      const bearing = element('span','map-bearing'); bearing.setAttribute('aria-hidden','true'); button.append(bearing);
      button.addEventListener('click', () => { if (this.placement) return; this.onNavigate?.(id); if (!this.keepOpen) this.close(); });
      this.markerLayer.append(button); this.markers.set(id,{button,bearing});
    });
    this.updateMarkers(); this.onRefresh?.();
  }
  updateMarkers() {
    if (!this.camera || !this.bounds) return;
    const current = this.getActive(); const width = this.viewport.clientWidth, height = this.viewport.clientHeight;
    if (!this.dialog.open) this.centerMiniCamera(current);
    const camera = this.dialog.open ? this.camera : this.miniCamera;
    const sceneName = this.getProject().scenes[current.id]?.title || '';
    if (this.miniName.textContent !== sceneName) this.miniName.textContent = sceneName;
    const point = new THREE.Vector3(), forward = new THREE.Vector3();
    for (const [id,marker] of this.markers) {
      const data = this.settings().points?.[id]; if (!validMapPoint(data)) { marker.button.hidden = true; continue; }
      point.set(data.x,data.y+this.span*.008,data.z).project(camera);
      marker.button.hidden = point.z < -1 || point.z > 1 || Math.abs(point.x) > 1.1 || Math.abs(point.y) > 1.1;
      marker.button.style.left = `${(point.x+1)*width/2}px`; marker.button.style.top = `${(1-point.y)*height/2}px`;
      marker.button.classList.toggle('is-active',id === current.id); marker.button.setAttribute('aria-current',id === current.id ? 'location' : 'false');
      marker.button.tabIndex = this.dialog.open ? 0 : -1;
      marker.bearing.hidden = id !== current.id;
      if (id === current.id) {
        const offset = this.previewHeading?.id === id ? this.previewHeading.value : data.heading || 0;
        const heading = THREE.MathUtils.degToRad(mapHeading(current.yaw || 0,offset));
        forward.set(data.x+Math.sin(heading)*this.span*.1,data.y+this.span*.008,data.z-Math.cos(heading)*this.span*.1).project(camera);
        const dx = (forward.x-point.x)*width, dy = -(forward.y-point.y)*height;
        marker.bearing.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(dy,dx)*180/Math.PI+90}deg) translateY(-${this.dialog.open ? 26 : 18}px)`;
      }
    }
  }
  beginPlacement(callback) {
    this.placement = callback; this.fit(true); this.viewport.classList.add('is-placing');
    this.controls.enableRotate = false;
    this.hint.textContent = 'Seçtiğiniz panoramanın çekildiği yere tıklayın. Sürüklemek yalnızca haritayı taşır. Esc ile iptal edin.';
  }
  cancelPlacement() {
    this.placement = null; this.viewport.classList.remove('is-placing');
    if (this.controls) this.controls.enableRotate = true;
    this.hint.textContent = 'Döndürmek için sürükleyin · Yakınlaştırmak için kaydırın · Noktadan sahneye geçin';
    this.onPlacementEnd?.();
  }
  pick(event) {
    if (!this.placement || !this.model || !this.down || Math.hypot(event.clientX-this.down.x,event.clientY-this.down.y) > 6) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),this.camera);
    const hit = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-this.floorY),new THREE.Vector3());
    if (!hit || hit.x < this.bounds.min.x || hit.x > this.bounds.max.x || hit.z < this.bounds.min.z || hit.z > this.bounds.max.z) return;
    const callback = this.placement; this.cancelPlacement(); callback({x:hit.x,y:this.floorY,z:hit.z});
  }
  animate() {
    this.stop();
    let lastFrame = -Infinity;
    const tick = time => {
      if (!this.renderer || !this.viewport.isConnected || (!this.dialog.open && this.miniDock.hidden)) { this.frame = null; return; }
      this.frame = requestAnimationFrame(tick);
      if (document.hidden || time-lastFrame < (this.dialog.open ? 16 : 50)) return;
      lastFrame = time;
      if (this.dialog.open) this.controls.update();
      this.updateMarkers(); if (this.grid) this.grid.visible = this.dialog.open;
      this.renderer.render(this.scene,this.dialog.open ? this.camera : this.miniCamera);
    }; tick(performance.now());
  }
  stop() { if (this.frame != null) cancelAnimationFrame(this.frame); this.frame = null; }
  disposeObject(object) {
    object.traverse(node => {
      node.geometry?.dispose();
      for (const material of (Array.isArray(node.material) ? node.material : node.material ? [node.material] : [])) {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      }
    });
  }
  dispose() {
    this.stop(); this.resizeObserver.disconnect(); document.removeEventListener('fullscreenchange',this.onFullscreen);
    this.controls?.dispose(); if (this.model) this.disposeObject(this.model); if (this.grid) this.disposeObject(this.grid);
    this.renderer?.dispose(); this.dialog.remove(); this.miniDock.remove();
  }
}
