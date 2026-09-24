// End-to-end regression checks against the production build in an isolated,
// disposable Chrome profile. No installed npm browser automation dependency.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const root=resolve(import.meta.dirname,'..'), dist=join(root,'dist');
const chrome=process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if(!existsSync(chrome))throw Error('Defina CHROME_PATH com o executável do Chrome.');
const profile=await mkdtemp(join(tmpdir(),'marebrava-browser-test-'));
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/game(?=\/)/,'');
  const file=resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(dist+sep)){res.writeHead(403);res.end();return;}
  try { const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(data); }
  catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/game/`;
const child=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try {
  let port;
  for(let i=0;i<100;i++){try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');break;}catch{await delay(100);}}
  assert.ok(port,'Chrome did not start');
  socket=new WebSocket(`ws://127.0.0.1:${port[0]}${port[1]}`);
  await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let sequence=0;const pending=new Map(),errors=[];
  socket.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id){const task=pending.get(message.id);if(!task)return;pending.delete(message.id);clearTimeout(task.timer);message.error?task.reject(Error(JSON.stringify(message.error))):task.resolve(message.result);}
    else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
    else if(message.method==='Network.loadingFailed' && ['Script','Stylesheet'].includes(message.params.type))errors.push(message.params.errorText);
  };
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout: '+method));},45000);
    pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,sessionId}));
  });
  const evaluate=async(sessionId,expression)=>{
    const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);
    if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  };
  const until=async(session,expression)=>{
    for(let i=0;i<180;i++){if(await evaluate(session,expression))return;await delay(200);}
    throw Error('Condition not met: '+expression+'\n'+errors.join('\n'));
  };
  await mkdir(join(root,'test-results'),{recursive:true});
  for(const mobile of [false,true]) {
    const {browserContextId}=await send('Target.createBrowserContext');
    const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    await send('Runtime.enable',{},sessionId);await send('Page.enable',{},sessionId);await send('Network.enable',{},sessionId);
    await send('Page.bringToFront',{},sessionId);
    if(!mobile)await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false},sessionId);
    if(mobile) {
      await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true},sessionId);
      await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5},sessionId);
    }
    await send('Page.navigate',{url:url+(mobile?'?render=mobile-balanced':'')},sessionId);
    await until(sessionId,"!!window.MareGraphics && window.MareBoot?.report().done && !!window.MarePlayerRenderer?.ready");
    assert.equal(await evaluate(sessionId,'MareGraphics.report().tier'),mobile?'balanced':'high');
    await evaluate(sessionId,"document.getElementById('title-settings').click()");
    assert.equal(await evaluate(sessionId,"document.getElementById('set-quality').options.length"),4);
    await evaluate(sessionId,"document.getElementById('settings-back').click();document.getElementById('start-btn').click()");
    await until(sessionId,"G.started && !GAME_RENDER.starting && !!BOOT.marks.firstGameFrame && window.MarePlayerRenderer.stats.frames>0");
    const self=await evaluate(sessionId,'runSelfTest()');assert.equal(self.ok,true,JSON.stringify(self));
    assert.equal(await evaluate(sessionId,'MareFinalPolish.selfTest().ok'),true);
    await evaluate(sessionId,'showSettings()');
    for(const tier of ['low','balanced','high']) {
      const result=await evaluate(sessionId,`(()=>{
        const save=packSave();delete save.meta;
        const before=JSON.stringify(save),oldSeed=seed,oldEnemies=enemies,oldScenery=scenery,oldProps=props,oldStructures=structures;
        const select=document.getElementById('set-quality');select.value='${tier}';select.dispatchEvent(new Event('change',{bubbles:true}));
        const after=packSave();delete after.meta;
        return {same:before===JSON.stringify(after),rng:seed===oldSeed,entities:enemies===oldEnemies&&scenery===oldScenery&&props===oldProps&&structures===oldStructures,report:MareGraphics.report(),actor:MarePlayerRenderer.stats,prefs:JSON.parse(localStorage.getItem(PREFS_KEY))};
      })()`);
      assert.equal(result.same,true,'quality changed save');assert.equal(result.rng,true,'quality advanced RNG');assert.equal(result.entities,true,'quality rebuilt world');
      assert.equal(result.report.tier,tier);assert.equal(result.prefs.quality,tier);
      assert.equal(result.report.terrain[0],Math.round(5600*result.report.terrainScale));
      assert.equal(result.actor.width,Math.round(384*Math.min(mobile?3:1,result.report.actorResolution)));
    }
    assert.equal(await evaluate(sessionId,`(()=>{PREFS.adaptiveQuality=false;applyPrefs();MOBILE_RENDER.runtimeFx=.48;recordRenderCost(45);return MOBILE_RENDER.runtimeFx;})()`),1);
    await evaluate(sessionId,'closeOverlay()');
    // A movement update reaches the articulated rig; pausing freezes its pose.
    await evaluate(sessionId,mobile?"touchMove={x:1,y:0}":"keys.add('d')");
    await until(sessionId,"Number.isFinite(player.movementAngle) && MarePlayerRenderer.stats.state==='walk'");
    assert.equal(await evaluate(sessionId,"Number.isFinite(player.movementAngle)"),true,JSON.stringify({errors,state:await evaluate(sessionId,'({overlay:G.overlay,started:G.started,hp:player.hp,keys:[...keys],loop:GAME_RENDER.loopRunning,frame,freeze:window.MARE_AI_PERCEPTION_FREEZE,logs:DEBUG.log})')}));
    await evaluate(sessionId,"keys.clear();showPause()");
    const frames=await evaluate(sessionId,'MarePlayerRenderer.stats.frames');await delay(250);
    assert.ok((await evaluate(sessionId,'MarePlayerRenderer.stats.frames'))-frames<=1,'paused rig keeps repainting');
    await evaluate(sessionId,'closeOverlay()');
    const screen=await send('Page.captureScreenshot',{format:'png'},sessionId);
    await writeFile(join(root,'test-results',mobile?'mobile-portrait.png':'desktop.png'),Buffer.from(screen.data,'base64'));
    if(mobile){
      await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:3,mobile:true},sessionId);
      await evaluate(sessionId,'showSettings()');
      const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);
      await writeFile(join(root,'test-results/mobile-settings-landscape.png'),Buffer.from(shot.data,'base64'));
    }
    // Preferences survive a navigation; saved beta progress can still be loaded.
    await send('Page.reload',{},sessionId);
    await until(sessionId,'!!window.MareGraphics && window.MareBoot?.report().done');
    assert.equal(await evaluate(sessionId,'MareGraphics.report().selection'),'high');
    assert.equal(await evaluate(sessionId,"!!savedGame && cleanSave(savedGame).version===7"),true);
    await evaluate(sessionId,"document.getElementById('continue-btn').click()");
    await until(sessionId,'G.started && !GAME_RENDER.starting && !!BOOT.marks.firstGameFrame');
    assert.equal(await evaluate(sessionId,'runSelfTest().ok'),true);
    console.log(JSON.stringify({mode:mobile?'mobile':'desktop',selfTest:self.ok,qualitySwitch:'preserves adventure and RNG',persistence:true}));
    await send('Target.disposeBrowserContext',{browserContextId});
  }
  for(const fallback of ['canvas-http','file']) {
    const {browserContextId}=await send('Target.createBrowserContext');
    const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    await send('Runtime.enable',{},sessionId);await send('Network.enable',{},sessionId);await send('Page.enable',{},sessionId);
    await send('Page.bringToFront',{},sessionId);
    await send('Page.navigate',{url:fallback==='file'?pathToFileURL(join(root,'index.html')).href:url+'?renderer=canvas'},sessionId);
    await until(sessionId,'!!window.MareGraphics && window.MareBoot?.report().done');
    await evaluate(sessionId,"document.getElementById('start-btn').click()");
    await until(sessionId,'G.started && !GAME_RENDER.starting && !!BOOT.marks.firstGameFrame');
    assert.equal(await evaluate(sessionId,'!!window.MarePlayerRenderer'),false);
    assert.equal(await evaluate(sessionId,'runSelfTest().ok'),true);
    console.log(JSON.stringify({mode:fallback,started:true,selfTest:true}));
    await send('Target.disposeBrowserContext',{browserContextId});
  }
  assert.deepEqual(errors,[],'browser exceptions');
  await send('Browser.close');
} finally {socket?.close();child.kill();server.close();}
