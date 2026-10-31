import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const root=resolve(import.meta.dirname,'..'),dist=join(root,'dist');
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
if(!existsSync(chrome))throw Error('Chrome não encontrado; defina CHROME_PATH.');
for(const file of await readdir(join(dist,'assets'))){
  if(file.endsWith('.js'))assert.equal(/\bconsole(?:\.[\w$]+|\[[^\]]+\])\s*\(/.test(await readFile(join(dist,'assets',file),'utf8')),false,`log no bundle ${file}`);
}
const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/game(?=\/)/,'');
  const file=resolve(dist,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(dist+sep)){res.writeHead(403);return res.end()}
  try{const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404);res.end()}
});
await new Promise(resolveServer=>server.listen(0,'127.0.0.1',resolveServer));
const url=`http://127.0.0.1:${server.address().port}/game/`,profile=await mkdtemp(join(tmpdir(),'marebrava-secure-smoke-'));
const chromeProcess=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try{
  let portFile;
  for(let i=0;i<100&&!portFile;i++){try{portFile=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n')}catch{await delay(100)}}
  assert.ok(portFile,'Chrome não iniciou');socket=new WebSocket(`ws://127.0.0.1:${portFile[0]}${portFile[1]}`);await new Promise((ok,bad)=>{socket.onopen=ok;socket.onerror=bad});
  let seq=0;const pending=new Map(),errors=[],consoleMessages=[];socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Runtime.consoleAPICalled')consoleMessages.push({type:m.params.type,args:m.params.args.map(arg=>arg.value??arg.description)})};
  const send=(method,params={},sessionId)=>new Promise((resolveCall,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error(`Timeout ${method}`))},30000);pending.set(id,{resolve:resolveCall,reject,timer});socket.send(JSON.stringify({id,method,params,sessionId}))});
  const evaluate=async(session,expression)=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},session);if(r.exceptionDetails)throw Error((r.exceptionDetails.exception?.description||r.exceptionDetails.text)+' :: '+expression);return r.result?.value};
  const waitFor=async(session,expression)=>{for(let i=0;i<300;i++){if(await evaluate(session,expression))return;await delay(100)}throw Error(`Timeout: ${expression}; page errors: ${JSON.stringify(errors)}`)};
  const click=async(session,id)=>{
    const {x,y}=await evaluate(session,`(()=>{const el=document.getElementById(${JSON.stringify(id)});el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1},session);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1},session);
  };
  async function page(urlToOpen,mobile=false,responsive=false){
    const {browserContextId}=await send('Target.createBrowserContext'),{targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    await send('Runtime.enable',{},sessionId);await send('Page.enable',{},sessionId);await send('Network.enable',{},sessionId);
    // Layout checks must also pass when the ad network is unavailable or blocked.
    await send('Network.setBlockedURLs',{urls:['*://bauval.org/*']},sessionId);
    await send('Page.addScriptToEvaluateOnNewDocument',{source:`
      document.addEventListener('mare-player-renderer-ready',event=>window.__testActor=event.detail);
      const originalDrawImage=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(...args){
        if(this.canvas.id==='game'&&args.length===5&&args[3]===5600&&args[4]===4400)window.__testTerrain=[args[0].width,args[0].height];
        return originalDrawImage.apply(this,args);
      };
    `},sessionId);
    if(mobile){await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true},sessionId);await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5},sessionId)}
    else await send('Emulation.setDeviceMetricsOverride',{width:responsive?390:1280,height:responsive?844:800,deviceScaleFactor:1,mobile:false},sessionId);
    await send('Page.navigate',{url:urlToOpen},sessionId);return {browserContextId,sessionId};
  }
  for(const mobile of [false,true]){
    const {browserContextId,sessionId}=await page(url+(mobile?'?render=mobile-balanced':''),mobile);
    await waitFor(sessionId,"document.documentElement?.dataset.graphics && document.documentElement.dataset.playerRenderer==='pixi'");
    assert.equal(await evaluate(sessionId,"(async()=>{const icon=document.querySelector('link[rel=icon]');if(!icon)return false;const response=await fetch(icon.href);return response.ok&&icon.type==='image/svg+xml'&&(await response.text()).includes('<svg')})()"),true,'favicon do jogo não carregou');
    assert.equal(await evaluate(sessionId,'document.documentElement.dataset.graphics'),mobile?'balanced':'high');
    assert.equal(await evaluate(sessionId,"Object.prototype.hasOwnProperty.call(window,'MareGameReady')"),false);
    assert.equal(await evaluate(sessionId,"Object.getOwnPropertyNames(window).some(name=>/^Mare/.test(name))"),false);
    assert.equal(await evaluate(sessionId,"['MareBoot','MareDebug','MareGraphics','MareMobileRender','MareAIPlayer','MareFinalPolish'].some(name=>Object.prototype.hasOwnProperty.call(window,name))"),false);
    assert.equal(await evaluate(sessionId,"Object.keys(window).some(name=>/^Mare(?:Boot|Debug|Graphics|AI|Final|Mobile)/.test(name))"),false);
    await evaluate(sessionId,"document.getElementById('title-settings').click()");
    assert.equal(await evaluate(sessionId,"document.getElementById('set-quality').options.length"),4);
    await evaluate(sessionId,"document.getElementById('settings-back').click();document.getElementById('start-btn').click()");
    await waitFor(sessionId,"document.documentElement.dataset.gameReady==='true'");
    if(!mobile){
      // Exercise the script-error notification from the real sandboxed frame.
      await evaluate(sessionId,`document.querySelector('#playing-ad iframe').srcdoc="<script>parent.postMessage('mare-playing-ad-failed','*')<"+'/script>'`);
      await waitFor(sessionId,"document.getElementById('playing-ad').dataset.adFailed==='true'");
      assert.equal(await evaluate(sessionId,"document.getElementById('playing-ad').hidden&&document.getElementById('game').getBoundingClientRect().left===0&&document.getElementById('game').width===innerWidth"),true,'falha do anúncio deixou faixa vazia');
      await mkdir(join(root,'test-results'),{recursive:true});
      const blockedShot=await send('Page.captureScreenshot',{format:'png'},sessionId);
      await writeFile(join(root,'test-results/desktop-playing-ad-blocked.png'),Buffer.from(blockedShot.data,'base64'));
      // Show a local creative fixture to check floating placement independently of the provider.
      await evaluate(sessionId,`(()=>{const slot=document.getElementById('playing-ad');delete slot.dataset.adFailed;slot.firstElementChild.srcdoc='<html><body style="margin:0;min-height:100vh;background:#e8cb88;color:#132d2b;font:14px sans-serif">ANÚNCIO DE TESTE</body></html>';slot.hidden=false;window.dispatchEvent(new Event('resize'))})()`);
      await evaluate(sessionId,"document.querySelector('#playing-ad iframe').focus()");
      await delay(100);
      assert.equal(await evaluate(sessionId,"document.documentElement.dataset.desktopAd"),'playing','foco no iframe do anúncio reabriu a pausa');
      await evaluate(sessionId,"document.getElementById('game').focus()");
      for(const method of ['resume-btn','close-modal','Escape','backdrop']){
        await click(sessionId,'pause-btn');
        await waitFor(sessionId,"document.documentElement.dataset.desktopAd==='pause'");
        if(method==='Escape'){
          await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
          await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
        }else if(method==='backdrop'){
          await send('Input.dispatchMouseEvent',{type:'mousePressed',x:10,y:10,button:'left',clickCount:1},sessionId);
          await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:10,y:10,button:'left',clickCount:1},sessionId);
        }else await click(sessionId,method);
        await delay(500);
        assert.equal(await evaluate(sessionId,"getComputedStyle(document.getElementById('modal-backdrop')).display"),'none',`pausa não fechou por ${method}`);
        assert.equal(await evaluate(sessionId,"document.documentElement.dataset.desktopAd"),'playing');
      }
    }
    if(mobile){
      assert.equal(await evaluate(sessionId,"document.querySelectorAll('.desktop-ad iframe').length"),0);
      await evaluate(sessionId,"document.getElementById('pause-btn').click()");
      assert.equal(await evaluate(sessionId,"document.querySelectorAll('.desktop-ad iframe').length"),0);
      await evaluate(sessionId,"document.getElementById('resume-btn').click()");
    }else{
      for(const width of [1100,1280,1366,1599,1920]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:false},sessionId);
        await waitFor(sessionId,"document.documentElement.dataset.desktopAd==='playing'");
        const layout=await evaluate(sessionId,`(()=>{
          const canvas=document.getElementById('game'),r=canvas.getBoundingClientRect(),ad=document.getElementById('playing-ad').getBoundingClientRect();
          return {left:r.left,right:r.right,adLeft:ad.left,adRight:ad.right,width:canvas.width,cssWidth:r.width,
            transparent:getComputedStyle(document.getElementById('playing-ad')).backgroundColor==='rgba(0, 0, 0, 0)',
            clear:[...document.querySelectorAll('.portrait-panel,.top-right,.hotbar,.minimap-panel,.quest,.tutorial,.controls-hint,#world-cue')].every(el=>{const b=el.getBoundingClientRect();return !b.width||!b.height||b.right<=ad.left||b.left>=ad.right||b.bottom<=ad.top||b.top>=ad.bottom}),
            frames:document.querySelectorAll('#playing-ad iframe').length};
        })()`);
        assert.ok(layout.left===0&&Math.abs(layout.right-width)<1,`anúncio reduziu o canvas: ${JSON.stringify(layout)}`);
        assert.ok(layout.adLeft===0&&layout.adRight<=240&&layout.transparent,'anúncio precisa flutuar à esquerda sem fundo');
        assert.equal(layout.width,Math.round(layout.cssWidth));assert.equal(layout.clear,true,'anúncio cobriu o HUD');assert.equal(layout.frames,1);
        if(width===1366){
          await mkdir(join(root,'test-results'),{recursive:true});
          const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);
          await writeFile(join(root,'test-results/desktop-playing-ad.png'),Buffer.from(shot.data,'base64'));
        }
        await evaluate(sessionId,"document.getElementById('pause-btn').click()");
        await waitFor(sessionId,"document.documentElement.dataset.desktopAd==='pause'");
        await evaluate(sessionId,"Promise.all(document.getElementById('modal').getAnimations().map(animation=>animation.finished.catch(()=>{})))");
        const pause=await evaluate(sessionId,`(()=>{
          const modal=document.getElementById('modal').getBoundingClientRect(),left=document.getElementById('pause-ad-left').getBoundingClientRect(),right=document.getElementById('pause-ad-right').getBoundingClientRect();
          return {clear:left.right<=modal.left&&right.left>=modal.right,inside:left.left>=0&&right.right<=innerWidth,
            playingHidden:document.getElementById('playing-ad').hidden,frames:document.querySelectorAll('.pause-ad iframe').length,
            scaled:[...document.querySelectorAll('.pause-ad')].every(slot=>slot.firstElementChild.getBoundingClientRect().width<=slot.clientWidth+1)};
        })()`);
        assert.deepEqual(pause,{clear:true,inside:true,playingHidden:true,frames:2,scaled:true});
        // Ad blockers may also hide ad containers, removing them from grid placement.
        for(const selector of ['#pause-ad-left','#pause-ad-right','.pause-ad']){
          await evaluate(sessionId,`(()=>{const style=document.createElement('style');style.id='adblock-layout-check';style.textContent=${JSON.stringify(selector+'{display:none!important}')};document.head.appendChild(style)})()`);
          const menu=await evaluate(sessionId,`(()=>{const el=document.getElementById('modal'),r=el.getBoundingClientRect();return {width:r.width,center:r.left+r.width/2,overflow:el.scrollWidth>el.clientWidth+1}})()`);
          assert.ok(Math.abs(menu.width-Math.min(width*.6,830))<1,`bloqueador encolheu o menu: ${selector} ${JSON.stringify(menu)}`);
          assert.ok(Math.abs(menu.center-width/2)<1,`bloqueador deslocou o menu: ${selector} ${JSON.stringify(menu)}`);
          assert.equal(menu.overflow,false,'menu ganhou rolagem horizontal');
          if(width===1599&&selector==='.pause-ad'){
            await click(sessionId,'resume-btn');
            await waitFor(sessionId,"document.documentElement.dataset.desktopAd==='playing'&&getComputedStyle(document.getElementById('modal-backdrop')).display==='none'");
            await click(sessionId,'pause-btn');
            await waitFor(sessionId,"document.documentElement.dataset.desktopAd==='pause'");
            await evaluate(sessionId,"Promise.all(document.getElementById('modal').getAnimations().map(animation=>animation.finished.catch(()=>{})))");
            await mkdir(join(root,'test-results'),{recursive:true});
            const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);
            await writeFile(join(root,'test-results/desktop-pause-adblock.png'),Buffer.from(shot.data,'base64'));
          }
          await evaluate(sessionId,"document.getElementById('adblock-layout-check').remove();window.dispatchEvent(new Event('resize'))");
        }
        if(width===1366){
          await mkdir(join(root,'test-results'),{recursive:true});
          const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);
          await writeFile(join(root,'test-results/desktop-pause-ads.png'),Buffer.from(shot.data,'base64'));
        }
        await evaluate(sessionId,"document.getElementById('pause-settings').click()");
        assert.equal(await evaluate(sessionId,"document.documentElement.dataset.desktopAd"),'off');
        await evaluate(sessionId,"document.getElementById('settings-back').click();document.getElementById('resume-btn').click()");
      }
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false},sessionId);
      await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5},sessionId);
      await waitFor(sessionId,"document.documentElement.dataset.desktopAd==='off'&&document.querySelectorAll('.desktop-ad iframe').length===0");
      await send('Emulation.setTouchEmulationEnabled',{enabled:false},sessionId);
      await waitFor(sessionId,"document.documentElement.dataset.desktopAd==='playing'");
    }
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
    if(mobile){
      const ui=await evaluate(sessionId,"(()=>{const style=id=>getComputedStyle(document.getElementById(id)).display;return {interact:style('interact'),hook:style('hook-prompt'),zone:style('polish-zone'),tutorial:style('tutorial'),touch:style('touch-controls'),notices:document.getElementById('toast-area').children.length};})()");
      assert.equal(ui.interact,'none');assert.equal(ui.hook,'none');assert.equal(ui.zone,'none');assert.equal(ui.tutorial,'none');assert.notEqual(ui.touch,'none');assert.ok(ui.notices<=1);
      await mkdir(join(root,'test-results'),{recursive:true});
      const portrait=await send('Page.captureScreenshot',{format:'png'},sessionId);
      await writeFile(join(root,'test-results/mobile-portrait.png'),Buffer.from(portrait.data,'base64'));
      await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:3,mobile:true},sessionId);
      await waitFor(sessionId,"document.getElementById('game').width===Math.round(844*1.75)");
      await delay(300); // Let the HUD's position transition finish after rotation.
      const landscape=await send('Page.captureScreenshot',{format:'png'},sessionId);
      await writeFile(join(root,'test-results/mobile-landscape.png'),Buffer.from(landscape.data,'base64'));
      await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true},sessionId);
    }
    await evaluate(sessionId,"document.getElementById('pause-btn').click()");
    if(mobile)assert.ok(await evaluate(sessionId,"document.getElementById('mobile-help')?.textContent.includes('analógico')"),'ajuda touch ausente na pausa');
    const originalSave=await evaluate(sessionId,"localStorage.getItem('mare-brava-save-v1')");
    await evaluate(sessionId,"document.getElementById('pause-settings').click()");
    for(const tier of ['low','balanced','high']){
      const result=await evaluate(sessionId,`(()=>{const s=document.getElementById('set-quality');s.value='${tier}';s.dispatchEvent(new Event('change',{bubbles:true}));return {tier:document.documentElement.dataset.graphics,prefs:JSON.parse(localStorage.getItem('mare-brava-settings-v2')||'null'),save:localStorage.getItem('mare-brava-save-v1')};})()`);
      assert.equal(result.tier,tier);assert.equal(result.prefs.quality,tier);assert.equal(result.save,originalSave,'qualidade alterou o save');
      if(mobile){
        const ratio={low:1.25,balanced:1.75,high:2}[tier],scale={low:.375,balanced:.625,high:.75}[tier];
        await waitFor(sessionId,`window.__testTerrain?.[0]===${5600*scale}`);
        const pixels=await evaluate(sessionId,"({canvas:document.getElementById('game').width,terrain:window.__testTerrain,actor:window.__testActor.stats.width})");
        assert.equal(pixels.canvas,Math.round(390*ratio));assert.deepEqual(pixels.terrain,[5600*scale,4400*scale]);assert.equal(pixels.actor,384*ratio);
      }
    }
    await send('Target.disposeBrowserContext',{browserContextId});
  }
  const responsivePage=await page(url+'?renderer=canvas',false,true);
  await waitFor(responsivePage.sessionId,"document.getElementById('start-btn')&&document.documentElement.dataset.graphics");
  await evaluate(responsivePage.sessionId,"document.getElementById('start-btn').click()");
  await waitFor(responsivePage.sessionId,"document.documentElement.dataset.gameReady==='true'");
  const controls=await evaluate(responsivePage.sessionId,`(()=>{
    const buttons=[...document.querySelectorAll('.touch-buttons button')];
    return {fine:matchMedia('(pointer:fine)').matches,touch:navigator.maxTouchPoints,
      layout:getComputedStyle(document.getElementById('touch-controls')).display,
      hotbar:getComputedStyle(document.querySelector('.hotbar')).display,
      icons:buttons.map(button=>{const svg=button.querySelector('svg'),shape=svg?.querySelector('path');return {label:button.getAttribute('aria-label'),drawn:!!shape&&shape.getBBox().width>0,viewport:svg?.getAttribute('viewBox'),keys:!!button.querySelector('.slot-key,.key')};}),
      emptyBadges:[...document.querySelectorAll('.touch-cd')].filter(el=>!el.textContent.trim()&&getComputedStyle(el).display!=='none').length};
  })()`);
  assert.equal(controls.fine,true);assert.equal(controls.touch,0);assert.equal(controls.layout,'block');assert.equal(controls.hotbar,'none');
  assert.equal(controls.icons.length,6);assert.ok(controls.icons.every(icon=>icon.label&&icon.drawn&&icon.viewport==='0 0 32 32'&&!icon.keys));assert.equal(controls.emptyBadges,0);
  await mkdir(join(root,'test-results'),{recursive:true});
  const responsiveShot=await send('Page.captureScreenshot',{format:'png'},responsivePage.sessionId);
  await writeFile(join(root,'test-results/mobile-dev-preview.png'),Buffer.from(responsiveShot.data,'base64'));
  await evaluate(responsivePage.sessionId,"document.getElementById('touch-dash').dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,pointerType:'mouse',bubbles:true,cancelable:true}));document.getElementById('touch-dash').dispatchEvent(new PointerEvent('pointerup',{pointerId:1,pointerType:'mouse',bubbles:true}))");
  await waitFor(responsivePage.sessionId,"(()=>{const badge=document.querySelector('#touch-dash .touch-cd');return parseFloat(badge.textContent)>0&&getComputedStyle(badge).display!=='none';})()");
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:false},responsivePage.sessionId);
  await waitFor(responsivePage.sessionId,"document.getElementById('game').width===844");
  assert.ok(await evaluate(responsivePage.sessionId,"getComputedStyle(document.getElementById('touch-controls')).display==='block'&&getComputedStyle(document.querySelector('.hotbar')).display==='none'"),'prévia landscape exibiu teclas de desktop');
  await send('Target.disposeBrowserContext',{browserContextId:responsivePage.browserContextId});
  const filePage=await page(pathToFileURL(join(root,'index.html')).href);
  await waitFor(filePage.sessionId,"document.documentElement?.dataset.graphics && document.getElementById('start-btn')");
  await evaluate(filePage.sessionId,"document.getElementById('start-btn').click()");await waitFor(filePage.sessionId,"document.documentElement.dataset.gameReady==='true'");
  assert.equal(await evaluate(filePage.sessionId,'!!window.MarePlayerRenderer'),false);await send('Target.disposeBrowserContext',{browserContextId:filePage.browserContextId});
  const distFilePage=await page(pathToFileURL(join(dist,'index.html')).href);
  await waitFor(distFilePage.sessionId,"document.documentElement?.dataset.graphics && document.getElementById('start-btn')");
  assert.equal(await evaluate(distFilePage.sessionId,"getComputedStyle(document.body).backgroundColor"),'rgb(22, 59, 59)','CSS local não carregou');
  await evaluate(distFilePage.sessionId,"document.getElementById('start-btn').click()");await waitFor(distFilePage.sessionId,"document.documentElement.dataset.gameReady==='true'");
  assert.equal(await evaluate(distFilePage.sessionId,'!!window.MarePlayerRenderer'),false);await send('Target.disposeBrowserContext',{browserContextId:distFilePage.browserContextId});
  assert.deepEqual(errors,[],'exceções do navegador');assert.deepEqual(consoleMessages,[],'logs no console de produção');await send('Browser.close');
}finally{socket?.close();chromeProcess.kill();server.close()}
