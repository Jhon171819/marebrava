'use strict';
// Presentation adapter. Never rebuild the world or change a saved adventure.
const GRAPHICS = { tier:null, baked:[], terrainSeed:null };
// Preserve the beta's initial simulation budget independently of visual changes.
const GRAPHICS_LOGIC_TIER=MOBILE_RENDER.tier;
const GRAPHICS_DESKTOP_AI_STRIDE=PREFS.quality==='low'?4:3;
function graphicsTier() {
  let selection = PREFS.quality;
  if (selection === 'auto') {
    const forced = MOBILE_RENDER.forced.replace('mobile-', '');
    const query = new URLSearchParams(location.search).get('renderProfile');
    if (['low','balanced','high'].includes(forced)) selection = forced;
    else if (['low','balanced','high'].includes(query)) selection = query;
  }
  return MareGraphicsProfiles.resolve(selection, { mobile:mobileRenderEnabled(), memory:MOBILE_RENDER.memory, cores:MOBILE_RENDER.cores });
}
function graphicsProfile() { return MareGraphicsProfiles.profiles[graphicsTier()]; }
function graphicsResetPressure() {
  MOBILE_RENDER.runtimeFx=1; MOBILE_RENDER.cpuPressure=0; MOBILE_RENDER.budgetLevel=0;
  PERF.adaptiveScale=1; PERF.slowSamples=PERF.fastSamples=0;
}

// A single budget now drives both touch and desktop; no double reduction of FX.
renderProfile = graphicsProfile;
qualityFactor = () => 1;
renderEffectScale = () => graphicsProfile().fxScale * (PREFS.adaptiveQuality ? MOBILE_RENDER.runtimeFx * (1-MOBILE_RENDER.cpuPressure*.08) : 1);
renderTerrainScale = () => graphicsProfile().terrainScale;
mobileParticleCap = () => Math.max(60, Math.round(graphicsProfile().particleCap * (PREFS.adaptiveQuality ? 1-MOBILE_RENDER.cpuPressure*.18 : 1)));
effectiveRenderPixelRatio = () => bootDiag('dpr1') ? 1 : Math.min(devicePixelRatio || 1, graphicsProfile().pixelRatioCap);
configureMinimapBacking = () => {
  const [w,h] = graphicsProfile().minimap;
  if (mini.width !== w) mini.width=w;
  if (mini.height !== h) mini.height=h;
};
shouldPaintMini = function(now=performance.now()) {
  const interval=1000/graphicsProfile().minimapFps;
  if (!MOBILE_RENDER.lastMiniAt || now-MOBILE_RENDER.lastMiniAt>=interval) { MOBILE_RENDER.lastMiniAt=now; return true; }
  return false;
};
shouldRenderGameFrame = function(now) {
  const interval=1000/graphicsProfile().targetFps;
  if (!MOBILE_RENDER.lastRenderAt) { MOBILE_RENDER.lastRenderAt=now; return true; }
  const elapsed=now-MOBILE_RENDER.lastRenderAt;
  if (elapsed>=interval-.75) {
    // Carry fractional frame time instead of drifting at 90/120 Hz.
    MOBILE_RENDER.lastRenderAt=now-(elapsed>=interval ? elapsed%interval : 0);
    return true;
  }
  return false;
};

// Existing safety guards still trim cosmetics and recover invalid state. Turning
// adaptive graphics off must also disable the beta's secondary FX reductions.
const graphicsRecordRenderCost=recordRenderCost;
recordRenderCost=function(ms) { graphicsRecordRenderCost(ms); if(!PREFS.adaptiveQuality)graphicsResetPressure(); };
const graphicsRecordLogicCost=recordLogicCost;
recordLogicCost=function(ms) { graphicsRecordLogicCost(ms); if(!PREFS.adaptiveQuality)graphicsResetPressure(); };
const graphicsRuntimeGuard=gd027RuntimeGuard;
gd027RuntimeGuard=function(dt) { graphicsRuntimeGuard(dt); if(!PREFS.adaptiveQuality)graphicsResetPressure(); };

// Keep the exact random state used to paint the original terrain. Refreshing its
// resolution must not advance gameplay RNG or respawn enemies/loot/puzzles.
const graphicsBuildTerrain=buildTerrain;
buildTerrain=function() { GRAPHICS.terrainSeed=seed; return graphicsBuildTerrain(); };
const graphicsBuildTerrainMobile=buildTerrainProgressiveMobile;
buildTerrainProgressiveMobile=async function() { GRAPHICS.terrainSeed=seed; return graphicsBuildTerrainMobile(); };
const graphicsBake=bakeMobileGroundDecor;
bakeMobileGroundDecor=function() {
  GRAPHICS.baked=mobileRenderEnabled()?scenery.filter(s=>!s.collision&&['grass','flowers','bush'].includes(s.kind)):[];
  return graphicsBake();
};
function graphicsRefreshTerrain() {
  if (!terrain || GAME_RENDER.starting || GRAPHICS.terrainSeed===null) return;
  const oldSeed=seed, oldTerrain=terrain, oldLand=landPath, oldInner=innerPath, oldCtx=ctx;
  try {
    seed=GRAPHICS.terrainSeed;
    graphicsBuildTerrain();
    if (GRAPHICS.baked.length) {
      const tc=terrain.getContext('2d'), scale=terrain.width/WORLD.w;
      tc.save(); tc.setTransform(scale,0,0,scale,0,0); ctx=tc;
      try { for(const item of GRAPHICS.baked)drawScenery(item); }
      finally { tc.restore(); }
    }
  } catch(error) {
    terrain=oldTerrain;
    console.warn('Mantendo o terreno anterior.',error);
  } finally { seed=oldSeed; ctx=oldCtx; landPath=oldLand; innerPath=oldInner; }
}
function graphicsApply() {
  const tier=graphicsTier(), changed=tier!==GRAPHICS.tier;
  GRAPHICS.tier=tier; MOBILE_RENDER.tier=tier; MOBILE_RENDER.profile=graphicsProfile();
  document.documentElement.dataset.graphics=tier;
  document.documentElement.dataset.graphicsDevice=mobileRenderEnabled()?'mobile':'desktop';
  if (changed) {
    graphicsResetPressure();
    MOBILE_RENDER.lastRenderAt=MOBILE_RENDER.lastMiniAt=0;
    graphicsRefreshTerrain();
    window.dispatchEvent(new Event('mare-graphics-change'));
  }
  if (!PREFS.adaptiveQuality) graphicsResetPressure();
}
const graphicsApplyPrefs=applyPrefs;
applyPrefs=function(resizeCanvas=true) { graphicsApply(); const result=graphicsApplyPrefs(resizeCanvas); if(ctx)ctx.imageSmoothingQuality=GRAPHICS.tier==='low'?'low':'high'; return result; };
const graphicsResize=resize;
resize=function() { const result=graphicsResize(); if(ctx)ctx.imageSmoothingQuality=graphicsTier()==='low'?'low':'high'; return result; };

const graphicsShowSettings=showSettings;
showSettings=function() {
  const focusId=document.activeElement?.id;
  graphicsShowSettings();
  const row=$('set-quality').closest('.setting-row');
  row.classList.add('graphics-quality-row');
  $('modal').querySelector('.settings-grid').prepend(row,$('set-adaptive').closest('.setting-row'));
  const summary=document.createElement('p'); summary.className='graphics-summary'; summary.id='graphics-summary'; summary.setAttribute('role','status');
  const p=graphicsProfile();
  summary.textContent=`${PREFS.quality==='auto'?'Seleção automática: ':''}${p.label} · até ${p.targetFps} quadros/s. Alterações aplicadas agora e salvas neste navegador.`;
  row.appendChild(summary); $('set-quality').setAttribute('aria-describedby','graphics-summary');
  for(const select of $('modal').querySelectorAll('select')) { const label=select.closest('.setting-row')?.querySelector('label'); if(label)label.htmlFor=select.id; }
  if(!G.started)$('settings-back').onclick=closeOverlay;
  if(focusId?.startsWith('set-'))requestAnimationFrame(() => $(focusId)?.focus({preventScroll:true}));
};
const graphicsTitleButton=document.createElement('button');
graphicsTitleButton.id='title-settings'; graphicsTitleButton.className='secondary'; graphicsTitleButton.textContent='Gráficos e opções';
graphicsTitleButton.onclick=showSettings; document.querySelector('.title-actions').appendChild(graphicsTitleButton);
