import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const root=resolve(import.meta.dirname,'..'),dist=join(root,'dist');
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
if(!existsSync(chrome))throw Error('Chrome não encontrado; defina CHROME_PATH.');
const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/game(?=\/)/,'');
  const file=resolve(dist,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(dist+sep)){res.writeHead(403);return res.end()}
  try{const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404);res.end()}
});
await new Promise(resolveServer=>server.listen(0,'127.0.0.1',resolveServer));
const url=`http://127.0.0.1:${server.address().port}/game/`,profile=await mkdtemp(join(tmpdir(),'marebrava-secure-smoke-'));
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try{
  let portFile;
  for(let i=0;i<100&&!portFile;i++){try{portFile=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n')}catch{await delay(100)}}
  assert.ok(portFile,'Chrome não iniciou');socket=new WebSocket(`ws://127.0.0.1:${portFile[0]}${portFile[1]}`);await new Promise((ok,bad)=>{socket.onopen=ok;socket.onerror=bad});
  let seq=0;const pending=new Map(),errors=[];socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)};
  const send=(method,params={},sessionId)=>new Promise((resolveCall,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error(`Timeout ${method}`))},30000);pending.set(id,{resolve:resolveCall,reject,timer});socket.send(JSON.stringify({id,method,params,sessionId}))});
  const evaluate=async(session,expression)=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},session);if(r.exceptionDetails)throw Error((r.exceptionDetails.exception?.description||r.exceptionDetails.text)+' :: '+expression);return r.result?.value};
  const waitFor=async(session,expression)=>{for(let i=0;i<300;i++){if(await evaluate(session,expression))return;await delay(100)}throw Error(`Timeout: ${expression}; page errors: ${JSON.stringify(errors)}`)};
  async function page(urlToOpen,mobile=false){
    const {browserContextId}=await send('Target.createBrowserContext'),{targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    await send('Runtime.enable',{},sessionId);await send('Page.enable',{},sessionId);await send('Network.enable',{},sessionId);
    if(mobile){await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true},sessionId);await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5},sessionId)}
    await send('Page.navigate',{url:urlToOpen},sessionId);return {browserContextId,sessionId};
  }
  for(const mobile of [false,true]){
    const {browserContextId,sessionId}=await page(url+(mobile?'?render=mobile-balanced':''),mobile);
    await waitFor(sessionId,"document.documentElement.dataset.graphics && document.documentElement.dataset.playerRenderer==='pixi'");
    assert.equal(await evaluate(sessionId,'document.documentElement.dataset.graphics'),mobile?'balanced':'high');
    assert.equal(await evaluate(sessionId,"Object.prototype.hasOwnProperty.call(window,'MareGameReady')"),false);
    assert.equal(await evaluate(sessionId,"Object.getOwnPropertyNames(window).some(name=>/^Mare/.test(name))"),false);
    assert.equal(await evaluate(sessionId,"['MareBoot','MareDebug','MareGraphics','MareMobileRender','MareAIPlayer','MareFinalPolish'].some(name=>Object.prototype.hasOwnProperty.call(window,name))"),false);
    assert.equal(await evaluate(sessionId,"Object.keys(window).some(name=>/^Mare(?:Boot|Debug|Graphics|AI|Final|Mobile)/.test(name))"),false);
    await evaluate(sessionId,"document.getElementById('title-settings').click()");
    assert.equal(await evaluate(sessionId,"document.getElementById('set-quality').options.length"),4);
    await evaluate(sessionId,"document.getElementById('settings-back').click();document.getElementById('start-btn').click()");
    await waitFor(sessionId,"document.documentElement.dataset.gameReady==='true'");
    if(mobile)await evaluate(sessionId,"document.getElementById('touch-interact').click()");
    else await evaluate(sessionId,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'e',bubbles:true}))");
    await waitFor(sessionId,"document.getElementById('modal-title')?.textContent==='A maré fora do compasso'");
    const storySize=await evaluate(sessionId,"(()=>{const r=document.getElementById('modal').getBoundingClientRect();return {close:!!document.getElementById('close-modal'),inside:r.top>=0&&r.bottom<=innerHeight+1}})()");
    assert.equal(storySize.close,true);if(mobile)assert.equal(storySize.inside,true,'modal narrativa saiu da viewport mobile');
    for(let i=0;i<15;i++){if(await evaluate(sessionId,"document.getElementById('modal-title')?.textContent!=='A maré fora do compasso'"))break;await evaluate(sessionId,"document.getElementById('story-next')?.click()");await delay(80)}
    await waitFor(sessionId,"document.getElementById('modal-backdrop').classList.contains('hidden')");
    const storySave=await evaluate(sessionId,"JSON.parse(localStorage.getItem('mare-brava-save-v1')||'null')");
    assert.equal(storySave?.version,7);assert.equal(storySave?.exploration?.storyBeats?.seen?.['story.arrival.mara'],true,'abertura não foi persistida');
    const legacySave={...storySave,exploration:{...storySave.exploration}};delete legacySave.exploration.storyBeats;
    await evaluate(sessionId,`localStorage.setItem('mare-brava-save-v1',${JSON.stringify(JSON.stringify(legacySave))});location.reload()`);
    await waitFor(sessionId,"document.getElementById('continue-btn')&&!document.getElementById('continue-btn').classList.contains('hidden')");
    await evaluate(sessionId,"document.getElementById('continue-btn').click()");await waitFor(sessionId,"document.documentElement.dataset.gameReady==='true'&&document.getElementById('title-screen').classList.contains('hidden')");
    if(mobile)await evaluate(sessionId,"document.getElementById('touch-interact').click()");else await evaluate(sessionId,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'e',bubbles:true}))");
    await waitFor(sessionId,"!document.getElementById('modal-backdrop').classList.contains('hidden')");
    assert.notEqual(await evaluate(sessionId,"document.getElementById('modal-title')?.textContent"),'A maré fora do compasso','Save V7 antigo repetiu a abertura');
    await evaluate(sessionId,"document.getElementById('close-modal').click()");await waitFor(sessionId,"document.getElementById('modal-backdrop').classList.contains('hidden')");
    await evaluate(sessionId,"document.getElementById('pause-btn').click()");
    const originalSave=await evaluate(sessionId,"localStorage.getItem('mare-brava-save-v1')");
    await evaluate(sessionId,"document.getElementById('pause-settings').click()");
    for(const tier of ['low','balanced','high']){
      const result=await evaluate(sessionId,`(()=>{const s=document.getElementById('set-quality');s.value='${tier}';s.dispatchEvent(new Event('change',{bubbles:true}));return {tier:document.documentElement.dataset.graphics,prefs:JSON.parse(localStorage.getItem('mare-brava-settings-v2')||'null'),save:localStorage.getItem('mare-brava-save-v1')};})()`);
      assert.equal(result.tier,tier);assert.equal(result.prefs.quality,tier);assert.equal(result.save,originalSave,'qualidade alterou o save');
    }
    await send('Target.disposeBrowserContext',{browserContextId});console.log(JSON.stringify({mode:mobile?'mobile':'desktop',encapsulated:true,qualitySwitch:true,storyArrival:true,storySave:true,legacySave:true}));
  }
  const filePage=await page(pathToFileURL(join(root,'index.html')).href);
  await waitFor(filePage.sessionId,"document.documentElement.dataset.graphics && document.getElementById('start-btn')");
  await evaluate(filePage.sessionId,"document.getElementById('start-btn').click()");await waitFor(filePage.sessionId,"document.documentElement.dataset.gameReady==='true'");
  assert.equal(await evaluate(filePage.sessionId,'!!window.MarePlayerRenderer'),false);await send('Target.disposeBrowserContext',{browserContextId:filePage.browserContextId});console.log(JSON.stringify({mode:'file',canvasFallback:true}));
  assert.deepEqual(errors,[],'exceções do navegador');await send('Browser.close');
}finally{socket?.close();chromeProcess.kill();server.close()}
