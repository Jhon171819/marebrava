// Shared by the classic game bundle and Node tests; no DOM or renderer required.
const MareGraphicsProfiles = (() => {
  const profiles = {
    low: { label:'Desempenho', targetFps:30, pixelRatioCap:1, terrainScale:.25, fxScale:.45, minimapFps:4, minimap:[144,114], sparkles:4, clouds:1, surfMin:10, windMin:5, biomeMin:2, particleCap:100, actorResolution:1, actorFps:30, detailStride:6 },
    balanced: { label:'Balanceada', targetFps:30, pixelRatioCap:1.5, terrainScale:.375, fxScale:.72, minimapFps:8, minimap:[224,178], sparkles:9, clouds:2, surfMin:22, windMin:9, biomeMin:4, particleCap:200, actorResolution:1.5, actorFps:30, detailStride:3 },
    high: { label:'Alta', targetFps:60, pixelRatioCap:2, terrainScale:.5, fxScale:1, minimapFps:12, minimap:[336,268], sparkles:15, clouds:4, surfMin:36, windMin:14, biomeMin:5, particleCap:360, actorResolution:2, actorFps:60, detailStride:1 },
  };
  for (const profile of Object.values(profiles)) { Object.freeze(profile.minimap); Object.freeze(profile); }
  Object.freeze(profiles);
  function resolve(selection, device = {}) {
    if (Object.hasOwn(profiles, selection)) return selection;
    if (!device.mobile) return 'high';
    if ((device.memory > 0 && device.memory <= 4) || (device.cores > 0 && device.cores <= 4)) return 'low';
    return 'balanced';
  }
  return Object.freeze({ profiles, resolve });
})();
