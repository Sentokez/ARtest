export function validateProject(project) {
  const fail = message => { throw new Error(message); };
  if (!project || !project.scenes || Array.isArray(project.scenes) || typeof project.scenes !== 'object') fail('Geçerli bir tur projesi seçin.');
  const ids = Object.keys(project.scenes);
  if (!ids.length || ids.length > 500) fail('Projede 1–500 sahne olmalı.');
  if (!ids.includes(project.firstSceneId)) fail('Başlangıç sahnesi bulunamadı.');
  for (const id of ids) {
    const scene = project.scenes[id];
    if (!scene || typeof scene.title !== 'string' || typeof scene.panorama !== 'string' || !scene.panorama) fail('Sahne adı ve panoraması zorunludur.');
    if (!Array.isArray(scene.hotSpots)) fail('Sahne noktaları geçersiz.');
    for (const hs of scene.hotSpots) {
      if (!Number.isFinite(hs.pitch) || Math.abs(hs.pitch) > 90 || !Number.isFinite(hs.yaw) || Math.abs(hs.yaw) > 180) fail('Nokta koordinatları geçersiz.');
      if (hs.type === 'scene' && !ids.includes(hs.sceneId)) fail('Bir geçişin hedef sahnesi bulunamadı.');
    }
  }
  return project;
}
