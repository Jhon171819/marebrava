import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('desktop ads follow gameplay and pause, reuse frames and unload on mobile/title',()=>{
  const media={matches:true,addEventListener(){}},slots={};
  for(const id of ['playing-ad','pause-ad-left','pause-ad-right'])slots[id]={
    clientWidth:234,firstElementChild:null,hidden:true,dataset:{},style:{},getBoundingClientRect:()=>({width:234}),
    appendChild(frame){this.firstElementChild=frame},replaceChildren(){this.firstElementChild=null},
  };
  let resizes=0;const listeners={};
  const state={G:{started:false,overlay:'title'},GAME_RENDER:{ready:true},
    matchMedia:()=>media,addEventListener:(type,fn)=>{listeners[type]=fn},$:id=>slots[id],resize(){resizes++},
    innerHeight:800,ResizeObserver:class{observe(){}},
    document:{documentElement:{dataset:{}},querySelector:()=>null,createElement:()=>({style:{},contentWindow:{},setAttribute(){}})},
  };
  runInNewContext(readFileSync(new URL('../src/game/desktop-ads.js',import.meta.url),'utf8'),state);
  const mode=()=>state.document.documentElement.dataset.desktopAd;
  state.updateDesktopAds();assert.equal(mode(),'off');assert.equal(slots['playing-ad'].firstElementChild,null);
  state.G.started=true;state.G.overlay=null;state.updateDesktopAds();
  const playing=slots['playing-ad'].firstElementChild;
  assert.equal(mode(),'playing');assert.equal(slots['playing-ad'].hidden,false);
  assert.match(playing.srcdoc,/async="async" data-cfasync="false"/);
  assert.match(playing.srcdoc,/container-fb1f6af8ed19145ef71ffbd68ffc8e14/);
  state.updateDesktopAds();assert.equal(slots['playing-ad'].firstElementChild,playing);
  state.G.overlay='pause';state.updateDesktopAds();
  assert.equal(mode(),'pause');assert.equal(slots['playing-ad'].hidden,true);
  for(const id of ['pause-ad-left','pause-ad-right']){
    assert.equal(slots[id].hidden,false);
    assert.match(slots[id].firstElementChild.srcdoc,/format:'iframe',height:60,width:468/);
    assert.equal(slots[id].firstElementChild.style.transform,'scale(0.5)');
  }
  state.G.overlay='settings';state.updateDesktopAds();assert.equal(mode(),'off');
  assert.ok(Object.values(slots).every(slot=>slot.hidden));
  state.G.overlay=null;state.updateDesktopAds();assert.equal(slots['playing-ad'].firstElementChild,playing);
  listeners.message({data:'mare-playing-ad-failed',source:{}});assert.equal(slots['playing-ad'].hidden,false);
  listeners.message({data:'mare-playing-ad-failed',source:playing.contentWindow});assert.equal(slots['playing-ad'].hidden,true);
  state.updateDesktopAds();assert.equal(slots['playing-ad'].hidden,true,'failed ads must not intercept clicks');
  media.matches=false;state.updateDesktopAds();assert.equal(mode(),'off');
  assert.ok(Object.values(slots).every(slot=>slot.hidden&&!slot.firstElementChild));
  media.matches=true;state.updateDesktopAds();state.G.started=false;state.G.overlay='title';state.updateDesktopAds();
  assert.ok(Object.values(slots).every(slot=>slot.hidden&&!slot.firstElementChild));
  assert.equal(resizes,0,'ads must not resize the game');
});

test('mouse aiming follows the canvas position',()=>{
  const source=readFileSync(new URL('../src/game/beta/03-gameplay.js',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('function screenToWorld('),source.indexOf('\n',source.indexOf('function screenToWorld(')));
  const state={width:1040,height:800,zoom:1,cam:{x:900,y:1200},canvas:{getBoundingClientRect:()=>({left:240,top:0})}};
  runInNewContext(fn,state);
  const center=state.screenToWorld(760,400);assert.equal(center.x,900);assert.equal(center.y,1200);
  const edge=state.screenToWorld(240,0);assert.equal(edge.x,380);assert.equal(edge.y,800);
});

test('auto-pause ignores focus inside ads and still pauses on window focus loss',()=>{
  const source=readFileSync(new URL('../src/game/beta/08-input.js',import.meta.url),'utf8');
  const blur=source.slice(source.indexOf("addEventListener('blur'"),source.indexOf("document.addEventListener('visibilitychange'"));
  let handler,timer,focused=false,pauses=0;
  const state={keys:new Set(['w']),pointer:{down:true},player:{hp:120},touchMove:{x:1,y:0},G:{started:true,overlay:null},
    addEventListener:(type,fn)=>{handler=fn},setTimeout:fn=>{timer=fn},
    document:{hasFocus:()=>focused},showPause:()=>{pauses++;state.G.overlay='pause'},
  };
  runInNewContext(blur,state);
  handler();assert.equal(state.keys.size,0);assert.equal(state.pointer.down,false);
  focused=true;timer();assert.equal(pauses,0,'focus settled in a child iframe');
  focused=false;handler();timer();assert.equal(pauses,1,'focus left the browser window');
  handler();timer();assert.equal(pauses,1,'already paused');
});
