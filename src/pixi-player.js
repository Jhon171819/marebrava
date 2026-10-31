import { Application, Container } from 'pixi.js';
import { CharacterView } from './characters/CharacterView.js';
import { nilo } from './characters/definitions.js';

// Render a small transparent surface once, then composite at the world's original
// depth-sorted draw slots. Trees, weather, camera shake and night tint remain correct.
async function start() {
  if (new URLSearchParams(location.search).get('renderer') === 'canvas') return;
  const app = new Application();
  const profile = () => {
    const tier = document.documentElement.dataset.graphics;
    return tier === 'low' ? { actorResolution:1.25, actorFps:30 } :
      tier === 'balanced' ? { actorResolution:1.75, actorFps:30 } : { actorResolution:2, actorFps:60 };
  };
  await app.init({ width:384, height:256, resolution:Math.min(devicePixelRatio || 1,profile().actorResolution), backgroundAlpha:0, antialias:true, preference:'webgl', autoStart:false, sharedTicker:false, preserveDrawingBuffer:true });
  const actor = new CharacterView(nilo);
  const stage = new Container(); stage.eventMode = 'none';
  actor.body.position.set(64,80); actor.effects.position.set(256,128);
  stage.addChild(actor.body,actor.effects);
  let frames = 0;
  let resolution = app.renderer.resolution, lastRenderTime=-Infinity, lastPaused=false, lastState='';
  const configure = () => {
    resolution=Math.min(devicePixelRatio || 1,profile().actorResolution);
    app.renderer.resize(384,256,resolution);
    lastRenderTime=-Infinity;
  };
  window.addEventListener('mare-graphics-change',configure);
  window.addEventListener('resize',configure);
  const blit = (ctx,sx,sy,w,h,x,y) => ctx.drawImage(app.canvas,sx*resolution,sy*resolution,w*resolution,h*resolution,x,y,w,h);
  const bridge = {
    ready:true,
    prepare(player,time,paused,reducedMotion) {
      if (!this.ready) return;
      try {
        const state=player.dashTime>0?'dash':player.flash>0?'hurt':player.attackAnim>0?'attack':player.parryWindow>0?'parry':player.charging?'charge':player.moving?'walk':'idle';
        const changed=state!==lastState || paused!==lastPaused;
        actor.update(player,time,{paused,reducedMotion});
        if(frames && !changed && time>=lastRenderTime && (paused || time-lastRenderTime<1/profile().actorFps-.001))return;
        app.renderer.render({container:stage}); frames++; lastRenderTime=time; lastState=state; lastPaused=paused;
      }
      catch { this.ready=false; document.documentElement.dataset.playerRenderer='canvas'; }
    },
    drawBody(ctx,x,y) { blit(ctx,0,0,128,128,x-64,y-80); },
    drawEffects(ctx,x,y) { blit(ctx,128,0,256,256,x-128,y-128); },
    drawTrail(ctx,x,y) { blit(ctx,0,0,128,128,x-64,y-80); },
    get stats() { return {frames, renderer:'pixi-webgl',state:actor.animator.pose.state,textureAtlases:1,width:app.canvas.width,height:app.canvas.height}; },
    dispose() { this.ready=false; window.removeEventListener('mare-graphics-change',configure); window.removeEventListener('resize',configure); actor.destroy(); stage.destroy(); app.destroy(true); document.documentElement.dataset.playerRenderer='canvas'; },
  };
  app.canvas.addEventListener('webglcontextlost',()=>{ bridge.ready=false; document.documentElement.dataset.playerRenderer='canvas'; });
  // The classic game receives the bridge through a private DOM event. This
  // keeps the renderer out of window while still allowing HMR replacement.
  document.dispatchEvent(new CustomEvent('mare-player-renderer-ready', { detail: bridge }));
  document.documentElement.dataset.playerRenderer='pixi';
  if(import.meta.hot) import.meta.hot.dispose(()=>bridge.dispose());
}
start().catch(()=>{document.documentElement.dataset.playerRenderer='canvas';});
