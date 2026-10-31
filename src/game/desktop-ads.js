// Keep third-party markup isolated from the game's layout.
const desktopAdMedia=matchMedia('(min-width:1100px) and (pointer:fine) and (hover:hover)');
function mountDesktopAd(slot,banner=false){
  if(slot.firstElementChild)return;
  const frame=document.createElement('iframe');
  frame.title=banner?'Publicidade · banner da pausa':'Publicidade · lateral';
  frame.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms');
  frame.width=banner?'468':'100%';frame.height=banner?'60':'100%';
  const content=banner
    ?`<script>atOptions={key:'d288966219e2f81fbc873b39fcabc571',format:'iframe',height:60,width:468,params:{}};<\/script><script src="https://bauval.org/22/d288966219e2f81fbc873b39fcabc571"><\/script>`
    :`<script async="async" data-cfasync="false" src="https://bauval.org/21/fb1f6af8ed19145ef71ffbd68ffc8e14" onerror="parent.postMessage('mare-playing-ad-failed','*')"><\/script><div id="container-fb1f6af8ed19145ef71ffbd68ffc8e14"></div>`;
  frame.srcdoc=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;min-height:100%;background:transparent}*{box-sizing:border-box}</style></head><body>${content}</body></html>`;
  slot.appendChild(frame);
}
function positionPlayingAd(){
  const slot=$('playing-ad');if(slot.hidden)return;
  const width=slot.getBoundingClientRect().width;
  const portrait=document.querySelector('.portrait-panel')?.getBoundingClientRect();
  const top=Math.max(140,(portrait?.bottom||0)+16);
  let bottom=innerHeight-24;
  for(const selector of ['.tutorial','.controls-hint','#world-cue']){
    const rect=document.querySelector(selector)?.getBoundingClientRect();
    if(rect?.width&&rect.height&&rect.left<width)bottom=Math.min(bottom,rect.top-16);
  }
  slot.style.top=top+'px';slot.style.height=Math.max(0,bottom-top)+'px';
}
addEventListener('message',event=>{
  const slot=$('playing-ad');
  if(event.data!=='mare-playing-ad-failed'||event.source!==slot.firstElementChild?.contentWindow)return;
  slot.dataset.adFailed='true';slot.hidden=true;
});
const playingAdLayoutObserver=new ResizeObserver(positionPlayingAd);
for(const selector of ['.portrait-panel','.tutorial','.controls-hint','#world-cue']){
  const el=document.querySelector(selector);if(el)playingAdLayoutObserver.observe(el);
}
function updateDesktopAds(){
  const mode=desktopAdMedia.matches&&G.started?(G.overlay==='pause'?'pause':!G.overlay?'playing':'off'):'off';
  const root=document.documentElement;
  root.dataset.desktopAd=mode;
  const playing=$('playing-ad'),banners=[$('pause-ad-left'),$('pause-ad-right')];
  playing.hidden=mode!=='playing'||playing.dataset.adFailed==='true';
  for(const slot of banners)slot.hidden=mode!=='pause';
  if(!desktopAdMedia.matches||!G.started){
    for(const slot of [playing,...banners])slot.replaceChildren();
    delete playing.dataset.adFailed;
  }else if(mode==='playing')mountDesktopAd(playing);
  else if(mode==='pause')for(const slot of banners){
    mountDesktopAd(slot,true);
    slot.firstElementChild.style.transform=`scale(${slot.clientWidth/468})`;
  }
  positionPlayingAd();
}
addEventListener('resize',updateDesktopAds);
desktopAdMedia.addEventListener('change',updateDesktopAds);
