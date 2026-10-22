import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { validateProject } from '../validation.mjs';

const project = JSON.parse(await readFile(new URL('../config.json',import.meta.url),'utf8'));
test('Editable project is valid and all referenced local assets exist', async () => {
  validateProject(project);
  for (const scene of Object.values(project.scenes)) {
    await access(new URL('../'+scene.panorama,import.meta.url));
    if (scene.thumbnail) await access(new URL('../'+scene.thumbnail,import.meta.url));
    for (const hs of scene.hotSpots) if (hs.coverImage) await access(new URL('../'+hs.coverImage,import.meta.url));
  }
});
test('Rejects broken first scene, dangling transitions and invalid coordinates', () => {
  const broken = structuredClone(project); broken.firstSceneId = 'missing';
  assert.throws(() => validateProject(broken), /Başlangıç/);
  const scene = Object.values(broken.scenes)[0]; broken.firstSceneId = project.firstSceneId;
  scene.hotSpots.push({type:'scene',sceneId:'missing',pitch:0,yaw:0});
  assert.throws(() => validateProject(broken), /hedef/);
  scene.hotSpots.pop(); scene.hotSpots.push({type:'info',pitch:91,yaw:0});
  assert.throws(() => validateProject(broken), /koordinat/);
});
