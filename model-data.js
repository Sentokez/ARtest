export function validModelPath(value) {
  return typeof value === 'string' && /^models\/[a-zA-Z0-9._/-]+\.glb$/i.test(value) && !value.split('/').includes('..');
}

export function modelCameraFrame(radius,aspect) {
  const safeRadius = Math.max(radius,0.001);
  const halfFov = Math.atan(Math.tan(35*Math.PI/360)*Math.min(1,aspect));
  const distance = safeRadius/Math.sin(halfFov)*1.15;
  return {distance,near:safeRadius/1000,far:distance+safeRadius*100,minDistance:safeRadius*.15,maxDistance:distance*5};
}
