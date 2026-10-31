const wrapYaw = value => ((value+180)%360+360)%360-180;

// Panorama yaw zero varies between photographs. Convert through the shared
// museum heading, rather than copying raw yaw or restoring a scene's start view.
export function transitionView(project,fromId,toId,view) {
  const from = project.scenes[fromId], to = project.scenes[toId];
  const sourceHeading = project.map3d?.points?.[fromId]?.heading;
  const targetHeading = project.map3d?.points?.[toId]?.heading;
  let offset = 0;
  if (Number.isFinite(sourceHeading) && Number.isFinite(targetHeading)) {
    offset = sourceHeading-targetHeading;
  } else if (Number.isFinite(from?.northOffset) || Number.isFinite(to?.northOffset)) {
    offset = (from.northOffset || 0)-(to.northOffset || 0);
  } else {
    // Older tours without heading calibration can align a connected pair from
    // their forward/back hotspots. Arrival faces away from the return hotspot.
    const forward = from?.hotSpots.find(point => point.type === 'scene' && point.sceneId === toId);
    const back = to?.hotSpots.find(point => point.type === 'scene' && point.sceneId === fromId);
    if (Number.isFinite(forward?.yaw) && Number.isFinite(back?.yaw)) offset = back.yaw+180-forward.yaw;
  }
  return {pitch:view.pitch,yaw:wrapYaw(view.yaw+offset),hfov:view.hfov};
}

export function navigateScene(viewer,project,id,preserveView = true) {
  if (!viewer || !project.scenes[id]) return;
  if (viewer.getScene() === id) {
    if (!preserveView) {
      const scene = project.scenes[id];
      return viewer.lookAt(scene.pitch ?? 0,scene.yaw ?? 0,scene.hfov || 100,false);
    }
    return;
  }
  if (!preserveView) return viewer.loadScene(id);
  const view = transitionView(project,viewer.getScene(),id,{pitch:viewer.getPitch(),yaw:viewer.getYaw(),hfov:viewer.getHfov()});
  return viewer.loadScene(id,view.pitch,view.yaw,view.hfov);
}
