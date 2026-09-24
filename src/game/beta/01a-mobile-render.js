'use strict';
// Maré Brava — pipeline de renderização dedicado a dispositivos móveis.
// A lógica de gameplay continua única; apenas o orçamento gráfico e a cadência de desenho mudam.
const MOBILE_RENDER=(()=>{
  let query={};
  try{query=Object.fromEntries(new URLSearchParams(location.search))}catch(_){}
  const coarse=matchMedia?.('(pointer:coarse)')?.matches===true;
  const touch=(navigator.maxTouchPoints||0)>0;
  const forced=String(query.render||window.__MARE_RENDER_OVERRIDE||window.__MARE_AGENT_BOOT?.render||'').toLowerCase();
  const mobileByInput=coarse&&touch;
  const mobileByViewport=touch&&Math.min(innerWidth,innerHeight)<=1024;
  const enabled=forced==='desktop'?false:forced.startsWith('mobile')||mobileByInput||mobileByViewport;
  const memory=Number(navigator.deviceMemory)||0;
  const cores=Number(navigator.hardwareConcurrency)||0;
  let tier='balanced';
  if(enabled){
    if(forced==='mobile-low'||query.renderProfile==='low')tier='low';
    else if(forced==='mobile-high'||query.renderProfile==='high')tier='high';
    else if(forced==='mobile-balanced'||query.renderProfile==='balanced')tier='balanced';
    else if((memory&&memory<=4)||(cores&&cores<=4))tier='low';
    // Conservador por padrão: high-end também começa em balanced. Estabilidade vem primeiro.
  }else tier='desktop';
  const profiles={
    desktop:{targetFps:0,pixelRatioCap:null,terrainScale:.5,fxScale:1,minimapFps:12,minimap:[336,268],sparkles:15,clouds:4,surfMin:36,windMin:14,biomeMin:5,particleCap:450},
    high:{targetFps:45,pixelRatioCap:1.25,terrainScale:.33,fxScale:.82,minimapFps:8,minimap:[196,156],sparkles:10,clouds:3,surfMin:24,windMin:10,biomeMin:4,particleCap:280},
    balanced:{targetFps:30,pixelRatioCap:1,terrainScale:.25,fxScale:.62,minimapFps:6,minimap:[160,128],sparkles:7,clouds:2,surfMin:16,windMin:7,biomeMin:3,particleCap:180},
    low:{targetFps:30,pixelRatioCap:1,terrainScale:.20,fxScale:.42,minimapFps:4,minimap:[128,102],sparkles:4,clouds:1,surfMin:10,windMin:5,biomeMin:2,particleCap:110}
  };
  const profile=profiles[tier]||profiles.balanced;
  return {
    enabled,tier,profile,forced,coarse,touch,memory,cores,
    lastRenderAt:0,lastMiniAt:0,logicCarryMs:0,startedAt:0,
    renderSamples:0,renderMsTotal:0,renderMsAvg:0,renderMsMax:0,renderedFrames:0,renderP95:0,renderCosts:[],logicSamples:0,logicMsAvg:0,logicP95:0,logicCosts:[],cpuPressure:0,runtimeFx:1,budgetLevel:0,bakedDecor:0,
    sceneryGrid:new Map(),sceneryScratch:[],gridCell:360,gridReady:false
  };
})();

const CANVAS_COMPAT=(()=>{
  const P=typeof CanvasRenderingContext2D!=='undefined'?CanvasRenderingContext2D.prototype:null;
  const native={roundRect:!!P&&typeof P.roundRect==='function',ellipse:!!P&&typeof P.ellipse==='function',lineDash:!!P&&typeof P.setLineDash==='function'};
  if(!P)return {...native,patched:false};
  let patched=false;
  if(typeof P.roundRect!=='function'){
    P.roundRect=function(x,y,w,h,r=0){const rad=Math.max(0,Math.min(Array.isArray(r)?Number(r[0])||0:Number(r)||0,Math.abs(w)/2,Math.abs(h)/2));this.moveTo(x+rad,y);this.lineTo(x+w-rad,y);this.quadraticCurveTo(x+w,y,x+w,y+rad);this.lineTo(x+w,y+h-rad);this.quadraticCurveTo(x+w,y+h,x+w-rad,y+h);this.lineTo(x+rad,y+h);this.quadraticCurveTo(x,y+h,x,y+h-rad);this.lineTo(x,y+rad);this.quadraticCurveTo(x,y,x+rad,y);this.closePath()};patched=true;
  }
  if(typeof P.ellipse!=='function'){
    P.ellipse=function(x,y,rx,ry,rotation=0,startAngle=0,endAngle=TAU,anticlockwise=false){this.save();this.translate(x,y);this.rotate(rotation);this.scale(Math.max(.0001,rx),Math.max(.0001,ry));this.arc(0,0,1,startAngle,endAngle,anticlockwise);this.restore()};patched=true;
  }
  if(typeof P.setLineDash!=='function'){P.setLineDash=function(){};patched=true}
  return {...native,patched};
})();
function mobileRenderEnabled(){return MOBILE_RENDER.enabled}
function renderProfile(){return MOBILE_RENDER.profile}
function renderEffectScale(){return mobileRenderEnabled()?renderProfile().fxScale*MOBILE_RENDER.runtimeFx*(1-MOBILE_RENDER.cpuPressure*.08):1}
function mobileParticleCap(){if(!mobileRenderEnabled())return PREFS.quality==='low'?240:PREFS.quality==='balanced'?340:450;return Math.max(72,Math.round(renderProfile().particleCap*(1-MOBILE_RENDER.cpuPressure*.18)))}
function renderTerrainScale(){return mobileRenderEnabled()?renderProfile().terrainScale:.5}
function effectiveRenderPixelRatio(){
  const native=devicePixelRatio||1;
  if(bootDiag?.('dpr1'))return 1;
  if(!mobileRenderEnabled())return Math.min(native,dprCap());
  return Math.max(1,Math.min(native,renderProfile().pixelRatioCap));
}
function configureMinimapBacking(){
  if(!mini)return;
  const [w,h]=mobileRenderEnabled()?renderProfile().minimap:[336,268];
  if(mini.width!==w)mini.width=w;
  if(mini.height!==h)mini.height=h;
}
function shouldPaintMini(now=performance.now()){
  const hz=mobileRenderEnabled()?renderProfile().minimapFps:12;
  const interval=1000/Math.max(1,hz);
  if(!MOBILE_RENDER.lastMiniAt||now-MOBILE_RENDER.lastMiniAt>=interval){MOBILE_RENDER.lastMiniAt=now;return true}
  return false;
}
function shouldRenderGameFrame(now){
  if(!mobileRenderEnabled())return true;
  if(!BOOT.marks.firstGameFrame)return true;
  const interval=1000/renderProfile().targetFps;
  if(!MOBILE_RENDER.lastRenderAt||now-MOBILE_RENDER.lastRenderAt>=interval-1){MOBILE_RENDER.lastRenderAt=now;return true}
  return false;
}
// Evita executar a lógica 90/120 vezes por segundo em telas de alta taxa de atualização.
// Em aparelhos lentos não força updates extras: apenas limita o teto a ~60 Hz.
function mobileLogicDelta(rawMs){
  if(!mobileRenderEnabled())return Math.min(rawMs/1000,.05);
  MOBILE_RENDER.logicCarryMs+=rawMs;
  if(MOBILE_RENDER.logicCarryMs<15.5)return null;
  const ms=Math.min(MOBILE_RENDER.logicCarryMs,50);
  MOBILE_RENDER.logicCarryMs=0;
  return ms/1000;
}
function recordRenderCost(ms){
  if(!mobileRenderEnabled())return;
  const r=MOBILE_RENDER;r.renderSamples++;r.renderedFrames++;r.renderMsTotal+=ms;r.renderMsMax=Math.max(r.renderMsMax*.998,ms);
  r.renderMsAvg=r.renderMsAvg?lerp(r.renderMsAvg,ms,.08):ms;
  const costs=r.renderCosts;costs.push(ms);if(costs.length>60)costs.shift();
  if(costs.length>=20&&r.renderSamples%20===0){const sorted=[...costs].sort((a,b)=>a-b),idx=Math.min(sorted.length-1,Math.floor(sorted.length*.95));r.renderP95=sorted[idx];
    // Mobile deve preservar frame pacing antes de preservar efeitos decorativos.
    if(r.renderP95>28&&r.runtimeFx>.56){r.runtimeFx=Math.max(.56,r.runtimeFx-.08);r.budgetLevel++}
    else if(r.renderP95<16&&r.runtimeFx<1&&r.renderSamples%80===0)r.runtimeFx=Math.min(1,r.runtimeFx+.04);
  }
}
function recordLogicCost(ms){
  if(!mobileRenderEnabled())return;
  const r=MOBILE_RENDER;r.logicSamples++;r.logicMsAvg=r.logicMsAvg?lerp(r.logicMsAvg,ms,.08):ms;const costs=r.logicCosts;costs.push(ms);if(costs.length>60)costs.shift();
  if(costs.length>=20&&r.logicSamples%20===0){const sorted=[...costs].sort((a,b)=>a-b),idx=Math.min(sorted.length-1,Math.floor(sorted.length*.95));r.logicP95=sorted[idx];
    if(r.logicP95>13)r.cpuPressure=Math.min(2,r.cpuPressure+1);else if(r.logicP95<7&&r.cpuPressure>0&&r.logicSamples%80===0)r.cpuPressure--;
  }
}
function rebuildMobileSceneryGrid(){
  const r=MOBILE_RENDER;r.sceneryGrid.clear();r.gridReady=false;if(!mobileRenderEnabled())return;
  const cell=r.gridCell;
  for(const s of scenery){const key=Math.floor(s.x/cell)+','+Math.floor(s.y/cell);let bucket=r.sceneryGrid.get(key);if(!bucket){bucket=[];r.sceneryGrid.set(key,bucket)}bucket.push(s)}
  r.gridReady=true;
}
function mobileVisibleScenery(cx,cy,hw,hh,pad=0){
  const r=MOBILE_RENDER;if(!mobileRenderEnabled()||!r.gridReady)return scenery;
  const out=r.sceneryScratch;out.length=0;const cell=r.gridCell;
  const x0=Math.floor((cx-hw-pad)/cell),x1=Math.floor((cx+hw+pad)/cell),y0=Math.floor((cy-hh-pad)/cell),y1=Math.floor((cy+hh+pad)/cell);
  for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const bucket=r.sceneryGrid.get(gx+','+gy);if(bucket)out.push(...bucket)}
  return out;
}
function bakeMobileGroundDecor(){
  const r=MOBILE_RENDER;if(!mobileRenderEnabled()||!terrain||typeof drawScenery!=='function')return 0;
  const bakeKinds=new Set(['grass','flowers','bush']),tc=terrain.getContext('2d');if(!tc)return 0;
  const scale=terrain.width/WORLD.w,oldCtx=ctx,keep=[];let baked=0;
  tc.save();tc.setTransform(scale,0,0,scale,0,0);ctx=tc;
  try{for(const s of scenery){if(!s.collision&&bakeKinds.has(s.kind)){drawScenery(s);baked++}else keep.push(s)}}finally{ctx=oldCtx;tc.restore()}
  scenery=keep;r.bakedDecor=baked;return baked;
}
function mobileRenderReport(){
  const r=MOBILE_RENDER,p=renderProfile();
  return {enabled:r.enabled,tier:r.tier,targetFps:p.targetFps,pixelRatio:+dpr.toFixed(2),nativeDpr:devicePixelRatio||1,terrainScale:p.terrainScale,fxScale:+(p.fxScale*r.runtimeFx*(1-r.cpuPressure*.08)).toFixed(2),runtimeFx:+r.runtimeFx.toFixed(2),particleCap:mobileParticleCap(),minimap:`${mini?.width||0}x${mini?.height||0}@${p.minimapFps}Hz`,actualRenderFps:r.startedAt?+(r.renderedFrames*1000/Math.max(1,performance.now()-r.startedAt)).toFixed(1):0,renderMsAvg:+r.renderMsAvg.toFixed(2),renderMsP95:+r.renderP95.toFixed(2),renderMsMax:+r.renderMsMax.toFixed(2),logicMsAvg:+r.logicMsAvg.toFixed(2),logicMsP95:+r.logicP95.toFixed(2),cpuPressure:r.cpuPressure,budgetLevel:r.budgetLevel,bakedDecor:r.bakedDecor,sceneryCells:r.sceneryGrid.size,deviceMemory:r.memory||null,hardwareConcurrency:r.cores||null,coarsePointer:r.coarse};
}
function mobileCompatibilityReport(){
  let probe=null;
  try{probe=document.createElement('canvas').getContext('2d')}catch(_){}
  return {
    roundRect:!!probe&&typeof probe.roundRect==='function',
    roundRectNative:CANVAS_COMPAT.roundRect,
    ellipse:!!probe&&typeof probe.ellipse==='function',
    ellipseNative:CANVAS_COMPAT.ellipse,
    lineDash:!!probe&&typeof probe.setLineDash==='function',
    lineDashNative:CANVAS_COMPAT.lineDash,
    compatibilityPatched:CANVAS_COMPAT.patched,
    path2D:typeof Path2D==='function',
    offscreenCanvas:typeof OffscreenCanvas==='function',
    userAgent:navigator.userAgent
  };
}
window.MareMobileRender={report:mobileRenderReport,compatibility:mobileCompatibilityReport};
