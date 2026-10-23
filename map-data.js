// Coordinates are stored in the GLB's world space; the original model is never rescaled.
export const DEFAULT_MAP = { model:'models/muze-harita.glb', enabled:true, opacity:0.65, miniTilt:50, miniZoom:1, points:{} };
export function mapMiniZoom(value) {
  const number = Number(value);
  return value == null || value === '' || !Number.isFinite(number) ? 1 : Math.max(.5, Math.min(3, number));
}
export function mapMiniTilt(value) {
  const number = Number(value);
  return value == null || value === '' || !Number.isFinite(number) ? 50 : Math.max(20, Math.min(85, number));
}
export function mapOpacity(value) {
  const number = Number(value);
  return value == null || !Number.isFinite(number) ? 0.65 : Math.max(0.1, Math.min(1, number));
}
export function validMapPoint(point) {
  return !!point && ['x','y','z'].every(key => Number.isFinite(point[key])) && (point.heading == null || Number.isFinite(point.heading));
}
export function mapHeading(yaw, offset = 0) {
  return ((yaw + offset) % 360 + 360) % 360;
}
export function validateMap(map, scenes) {
  if (map == null) return;
  if (typeof map !== 'object' || typeof map.model !== 'string' || !/^models\/[a-zA-Z0-9._/-]+\.glb$/.test(map.model) || map.model.split('/').includes('..')) throw new Error('3D harita modeli models/ klasöründe bir GLB olmalı.');
  if (map.enabled != null && typeof map.enabled !== 'boolean') throw new Error('Harita görünürlüğü açık veya kapalı olmalı.');
  if (!Number.isFinite(map.opacity) || map.opacity < 0.1 || map.opacity > 1) throw new Error('Harita opaklığı 0.1–1 arasında olmalı.');
  if (map.miniTilt != null && (!Number.isFinite(map.miniTilt) || map.miniTilt < 20 || map.miniTilt > 85)) throw new Error('Mini harita eğimi 20–85 derece arasında olmalı.');
  if (map.miniZoom != null && (!Number.isFinite(map.miniZoom) || map.miniZoom < .5 || map.miniZoom > 3)) throw new Error('Mini harita yakınlığı 0.5–3 arasında olmalı.');
  if (!map.points || typeof map.points !== 'object' || Array.isArray(map.points)) throw new Error('Harita noktaları geçersiz.');
  for (const [id, point] of Object.entries(map.points)) {
    if (!Object.hasOwn(scenes,id) || !validMapPoint(point)) throw new Error('Harita noktasının sahnesi veya koordinatları geçersiz.');
  }
  if (map.view != null) {
    if (!['position','target'].every(key => Array.isArray(map.view[key]) && map.view[key].length === 3 && map.view[key].every(Number.isFinite)) || !Number.isFinite(map.view.zoom) || map.view.zoom < 0.2 || map.view.zoom > 8) throw new Error('Harita kamera açısı geçersiz.');
    if (map.view.position.every((number,index) => Math.abs(number-map.view.target[index]) < 1e-6)) throw new Error('Harita kamerası hedefle aynı konumda olamaz.');
  }
}
