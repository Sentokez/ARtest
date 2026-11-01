import * as THREE from 'three';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { validModelPath, modelCameraFrame } from './model-data.js';

function element(tag,className,text) {
  const node = document.createElement(tag); node.className = className;
  if (text) node.textContent = text; return node;
}
export function disposeModel(model) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  model?.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
    node.skeleton?.dispose();
  });
  for (const resource of [...textures,...materials,...geometries]) resource.dispose();
}

export class ModelViewer {
  constructor() {
    this.dialog = element('dialog','model-overlay'); this.dialog.setAttribute('aria-label','Üç boyutlu eser');
    this.viewport = element('div','model-view');
    const header = element('div','model-overlay-header');
    this.title = element('span','model-overlay-title');
    const reset = element('button','model-reset','Görünümü sıfırla'); reset.type = 'button'; reset.onclick = () => this.reset();
    const close = element('button','model-overlay-close','×'); close.type = 'button'; close.setAttribute('aria-label','3D modeli kapat'); close.onclick = () => this.close();
    header.append(this.title,reset,close);
    this.status = element('p','model-overlay-status'); this.status.setAttribute('role','status');
    this.hint = element('p','model-overlay-hint','Sol tuş: döndür · Tekerlek: yakınlaştır · Sağ tuş / Shift + sol tuş: kaydır');
    this.dialog.append(this.viewport,header,this.status,this.hint);
    this.onEscape = event => {
      if (!this.dialog.open || event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); this.close();
    };
    this.dialog.addEventListener('close',() => {
      if (this.dialog.open) return;
      document.removeEventListener('keydown',this.onEscape,true); this.release();
    });
  }
  createRenderer() {
    return new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  }
  loadModel(path) { return new GLTFLoader().loadAsync(path); }
  createControls() { return new OrbitControls(this.camera,this.renderer.domElement); }
  async open({modelURL,text}) {
    if (!validModelPath(modelURL)) throw new Error('models/ klasöründen bir GLB model seçin.');
    this.release();
    const token = this.token;
    // Keep both blur and WebGL inside the tour stage, including fullscreen.
    const stage = document.getElementById('stage');
    if (!stage) throw new Error('Gezinme alanı bulunamadı.');
    stage.append(this.dialog);
    this.title.textContent = text || '3D eser'; this.status.textContent = '3D model yükleniyor…'; this.status.hidden = false;
    if (!this.dialog.open) {
      this.dialog.show(); this.dialog.querySelector('.model-overlay-close')?.focus({preventScroll:true});
    }
    document.addEventListener('keydown',this.onEscape,true);
    try {
      this.renderer = this.createRenderer();
      this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1,2));
      this.renderer.setClearColor(0x000000,0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.domElement.className = 'model-canvas'; this.renderer.domElement.setAttribute('aria-label','Döndürülüp yakınlaştırılabilen 3D model');
      this.viewport.append(this.renderer.domElement);
      this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(35,1,.01,1000);
      this.scene.add(new THREE.HemisphereLight(0xffffff,0xb5c5d5,2.6));
      for (const [position,intensity] of [[[3,5,4],3],[[-4,2,-3],2]]) {
        const light = new THREE.DirectionalLight(0xffffff,intensity); light.position.set(...position); this.scene.add(light);
      }
      this.controls = this.createControls();
      this.controls.enableDamping = true; this.controls.dampingFactor = .09; this.controls.screenSpacePanning = true;
      this.controls.addEventListener('change',() => this.render());
      this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(this.viewport); this.resize();
      const gltf = await this.loadModel(modelURL);
      if (this.token !== token || !this.dialog.open) { disposeModel(gltf.scene); return; }
      this.model = gltf.scene; this.scene.add(this.model);
      this.bounds = new THREE.Box3().setFromObject(this.model);
      if (this.bounds.isEmpty()) throw new Error('Modelde görüntülenecek bir nesne bulunamadı.');
      const sphere = this.bounds.getBoundingSphere(new THREE.Sphere());
      this.center = sphere.center; this.radius = sphere.radius;
      this.reset(); this.status.hidden = true;
      this.tick();
    } catch(error) {
      if (this.token !== token) return;
      this.release(); this.status.hidden = false;
      this.status.textContent = `Model açılamadı: ${error.message}`;
    }
  }
  resize() {
    if (!this.renderer) return;
    const width = this.viewport.clientWidth, height = this.viewport.clientHeight;
    if (!width || !height) return;
    const oldAspect = this.camera.aspect;
    this.camera.aspect = width/height; this.camera.updateProjectionMatrix(); this.renderer.setSize(width,height);
    // Refit only when the viewport changes shape, not while orbiting or zooming.
    if (this.radius != null && Math.abs(oldAspect-this.camera.aspect) > .01) this.reset();
    this.render();
  }
  reset() {
    if (!this.controls || this.radius == null) return;
    const frame = modelCameraFrame(this.radius,this.camera.aspect);
    this.camera.near = frame.near; this.camera.far = frame.far; this.camera.updateProjectionMatrix();
    this.controls.minDistance = frame.minDistance; this.controls.maxDistance = frame.maxDistance;
    this.controls.target.copy(this.center);
    this.camera.position.copy(this.center).add(new THREE.Vector3(0,0,frame.distance));
    this.controls.update(); this.render();
  }
  render() { if (this.renderer && this.dialog.open) this.renderer.render(this.scene,this.camera); }
  tick() {
    if (!this.renderer || !this.dialog.open) return;
    if (!document.hidden) this.controls.update();
    this.frame = requestAnimationFrame(() => this.tick());
  }
  release() {
    this.token = (this.token || 0)+1;
    cancelAnimationFrame(this.frame); this.frame = null; this.observer?.disconnect(); this.controls?.dispose();
    disposeModel(this.model); this.model = null; this.radius = null;
    this.renderer?.dispose(); this.renderer?.forceContextLoss(); this.renderer = null;
    this.controls = null; this.scene = null; this.camera = null; this.observer = null;
    this.viewport.replaceChildren();
  }
  close() { this.dialog.close(); this.release(); }
}
