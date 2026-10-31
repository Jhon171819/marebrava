'use strict';
// GD-027 — Mobile UX & Control Feel + Performance/Stability + Replayability/Contramaré.
// Save V7 permanece compatível: toda variação de Contramaré é derivada do ciclo já persistido.

const GD027={
 metrics:{touchPresses:0,touchContextPrompts:0,runtimeTrims:0,recoveries:0,pressureDrops:0,visibilityResumes:0,contramareStarts:0,contramareFirstClears:0,rememberedRoutes:0},
 guardTimer:0,pressureStreak:0,lastExtraMini:0,announcedCycle:-1,lastContext:'',
 runtime:{mode:'normal',maxParticles:0,maxTexts:0,maxTrails:0,lastHeapRatio:0}
};

const CONTRAMARE_RULES=[
 {id:'iron',name:'CORRENTE DE FERRO',desc:'Veteranos seguram melhor a linha. Gancho e ataques carregados recebem uma janela de resposta maior.',boon:'Gancho recupera 8% mais rápido.',waypoint:'forest'},
 {id:'echo',name:'ECO DA RESSACA',desc:'Mais inimigos podem surgir como Veteranos e Fendas de Contramaré aparecem com maior frequência.',boon:'Pipoca recupera 9% mais rápido e Veteranos pagam melhor.',waypoint:'marsh'},
 {id:'surge',name:'MARÉ CURTA',desc:'Ameaças se movem com mais urgência e a ilha cobra decisões mais rápidas.',boon:'Esquiva recupera 8% mais rápido; parry bem-sucedido devolve fôlego extra.',waypoint:'dunes'},
 {id:'drift',name:'ROTA QUE A ILHA LEMBROU',desc:'A corrente muda as aproximações e mantém uma antiga pedra de viagem na memória.',boon:'Eventos não hostis rendem um pouco mais e uma rota avançada começa conhecida.',waypoint:'reef'}
];

Object.assign(ACHIEVEMENT_DEFS,{
 undertow3:{name:'A TERCEIRA MARÉ',desc:'Conclua a Contramaré +3.',icon:'seal'},
 undertow6:{name:'A ILHA INSISTE',desc:'Conclua a Contramaré +6.',icon:'rain'},
 undertow9:{name:'NOVE VEZES CONTRA O MAR',desc:'Conclua a Contramaré +9.',icon:'hook'}
});

function gd027Rule(cycle=ngCycle()){if(cycle<=0)return null;return CONTRAMARE_RULES[(cycle-1)%CONTRAMARE_RULES.length]}
function gd027RememberedWaypoint(cycle=ngCycle()){return gd027Rule(cycle)?.waypoint||'forest'}
function gd027RuleText(cycle=ngCycle()){const r=gd027Rule(cycle);return r?`${r.name} · ${r.desc} ${r.boon}`:'JORNADA ORIGINAL'}
function gd027IsTouch(){return mobileRenderEnabled()||matchMedia?.('(pointer:coarse), (max-width:800px), (max-width:1024px) and (max-height:520px)')?.matches===true}

// ---------- Mobile UX ----------
function gd027EnsureTouchBadges(){
 const specs=[['touch-hook','GANCHO'],['touch-bird','PIPOCA'],['touch-dash','ESQUIVA'],['touch-parry','APARAR'],['touch-potion','POÇÕES']];
 for(const [id,label] of specs){const el=$(id);if(!el)continue;el.dataset.actionLabel=label;if(!el.querySelector('.touch-cd')){const b=document.createElement('span');b.className='touch-cd hidden';b.setAttribute('aria-hidden','true');el.appendChild(b)}}
 const hookBtn=$('touch-hook');if(hookBtn&&!hookBtn.querySelector('.touch-cd.action')){const a=document.createElement('span');a.className='touch-cd action hidden';a.setAttribute('aria-hidden','true');hookBtn.appendChild(a)}
}
function gd027TouchFeedback(){
 if(!gd027IsTouch()||!G.started)return;
 gd027EnsureTouchBadges();document.body.classList.toggle('touch-in-combat',player.combat>0);
 const state=[
  ['touch-hook',player.hookCD,!!hook,hook&&hook.mode==='latched'?'PUXE':hook&&hook.mode==='flying'?'MIRA':''],
  ['touch-bird',bird?.manualCD||0,false,''],['touch-dash',player.dashCD,false,''],['touch-parry',player.parryCD,false,'']
 ];
 for(const [id,cd,context,action] of state){const el=$(id),badge=el?.querySelector('.touch-cd:not(.action)');if(!el||!badge)continue;const cooling=cd>.08;el.classList.toggle('touch-cooling',cooling);el.classList.toggle('touch-ready',!cooling);el.classList.toggle('touch-context',!!context);badge.textContent=cooling?Math.max(.1,cd).toFixed(1):'';badge.classList.toggle('hidden',!cooling);const act=el.querySelector('.touch-cd.action');if(act){act.textContent=action||'';act.classList.toggle('hidden',!action)} }
 const potion=$('touch-potion'),pb=potion?.querySelector('.touch-cd');if(pb){pb.textContent=String(player.potions);pb.classList.remove('hidden');potion.classList.toggle('touch-cooling',player.potions<=0||player.potionCD>0)}
 $('touch-attack')?.classList.toggle('touch-charging',!!player.charging);
 const context=executionTarget?'execute':nearby?'interact':hook&&hook.mode==='latched'?'hook':'';
 if(context&&context!==GD027.lastContext){GD027.metrics.touchContextPrompts++;GD027.lastContext=context}else if(!context)GD027.lastContext='';
}
function gd027BindTouchPresses(){
 for(const el of document.querySelectorAll('#touch-controls button')){if(el.dataset.gd027Bound)return;el.dataset.gd027Bound='1';const down=()=>{el.classList.add('touch-pressed');GD027.metrics.touchPresses++};const up=()=>el.classList.remove('touch-pressed');el.addEventListener('pointerdown',down,{passive:true});el.addEventListener('pointerup',up,{passive:true});el.addEventListener('pointercancel',up,{passive:true});el.addEventListener('lostpointercapture',up,{passive:true})}
}

const _gd027UpdateHUD=updateHUD;
updateHUD=function(){const r=_gd027UpdateHUD();gd027TouchFeedback();gd027UpdateContramareChip();return r};

gd027EnsureTouchBadges();gd027BindTouchPresses();

// ---------- Performance & Stability ----------
function gd027TrimCosmetics(){
 const particleLimit=mobileRenderEnabled()?Math.max(80,mobileParticleCap()):420,textLimit=mobileRenderEnabled()?60:120,trailLimit=mobileRenderEnabled()?90:180;
 GD027.runtime.maxParticles=Math.max(GD027.runtime.maxParticles,particles.length);GD027.runtime.maxTexts=Math.max(GD027.runtime.maxTexts,texts.length);GD027.runtime.maxTrails=Math.max(GD027.runtime.maxTrails,trails.length);
 let trimmed=0;if(particles.length>particleLimit){trimmed+=particles.length-particleLimit;particles.splice(0,particles.length-particleLimit)}if(texts.length>textLimit){trimmed+=texts.length-textLimit;texts.splice(0,texts.length-textLimit)}if(trails.length>trailLimit){trimmed+=trails.length-trailLimit;trails.splice(0,trails.length-trailLimit)}
 if(trimmed){GD027.metrics.runtimeTrims+=trimmed}
 // Projetis/hazards são gameplay: nunca descartados só por orçamento. Limpa apenas entidades já marcadas como mortas em cenários anormais.
 if(projectiles.length>220)projectiles=projectiles.filter(p=>!p.dead);if(hazards.length>180)hazards=hazards.filter(h=>!h.dead&&h.life!==0)
}
function gd027RecoverInvalidState(){
 if(!G.started||!player)return false;const bad=![player.x,player.y,player.hp,player.stamina].every(Number.isFinite)||player.x<-80||player.y<-80||player.x>WORLD.w+80||player.y>WORLD.h+80;if(!bad)return false;
 player.x=Number.isFinite(player.x)?clamp(player.x,0,WORLD.w):HOME.x+27;player.y=Number.isFinite(player.y)?clamp(player.y,0,WORLD.h):HOME.y+83;player.hp=Number.isFinite(player.hp)?clamp(player.hp,1,maxHP()):maxHP();player.stamina=Number.isFinite(player.stamina)?clamp(player.stamina,0,maxStamina()):maxStamina();try{v3RecoverPosition(true)}catch(_){player.x=HOME.x+27;player.y=HOME.y+83}cam.x=player.x;cam.y=player.y;hook=null;touchMove={x:0,y:0};GD027.metrics.recoveries++;toast('A ilha corrigiu uma posição instável e colocou Nilo em terreno seguro.','gold');return true
}
function gd027RuntimeGuard(dt){
 GD027.guardTimer+=dt;if(GD027.guardTimer<.75)return;GD027.guardTimer=0;gd027TrimCosmetics();gd027RecoverInvalidState();
 if(!mobileRenderEnabled())return;const render=MOBILE_RENDER.renderP95||0,logic=MOBILE_RENDER.logicP95||0,severe=render>32||logic>17,slow=render>24||logic>12;
 GD027.pressureStreak=slow?GD027.pressureStreak+1:Math.max(0,GD027.pressureStreak-1);
 if(severe||GD027.pressureStreak>=4){const before=MOBILE_RENDER.runtimeFx;MOBILE_RENDER.runtimeFx=Math.max(.48,MOBILE_RENDER.runtimeFx-(severe?.12:.07));MOBILE_RENDER.cpuPressure=Math.min(2,MOBILE_RENDER.cpuPressure+(severe?1:.5));GD027.runtime.mode=severe?'emergency':'reduced';if(MOBILE_RENDER.runtimeFx<before){GD027.metrics.pressureDrops++;MOBILE_RENDER.budgetLevel++}GD027.pressureStreak=0}
 else if(render&&render<15&&logic&&logic<7&&MOBILE_RENDER.runtimeFx<1){MOBILE_RENDER.runtimeFx=Math.min(1,MOBILE_RENDER.runtimeFx+.025);if(MOBILE_RENDER.runtimeFx>.82)GD027.runtime.mode='normal'}
 if(performance.memory?.jsHeapSizeLimit){GD027.runtime.lastHeapRatio=performance.memory.usedJSHeapSize/performance.memory.jsHeapSizeLimit;if(GD027.runtime.lastHeapRatio>.72){MOBILE_RENDER.runtimeFx=Math.min(MOBILE_RENDER.runtimeFx,.58);GD027.runtime.mode='memory-pressure'}}
}
const _gd027Update=update;
update=function(dt){const r=_gd027Update(dt);gd027RuntimeGuard(dt);return r};

const _gd027Resize=resize;
resize=function(){if(GAME_RENDER.ready&&ctx){const nw=$('game-viewport').clientWidth,nh=$('game-viewport').clientHeight,nd=typeof effectiveRenderPixelRatio==='function'?effectiveRenderPixelRatio():Math.min(devicePixelRatio||1,dprCap()),cw=Math.max(1,Math.round(nw*nd)),ch=Math.max(1,Math.round(nh*nd));if(width===nw&&height===nh&&canvas.width===cw&&canvas.height===ch)return false}return _gd027Resize()};

const _gd027ShouldPaintMini=shouldPaintMini;
shouldPaintMini=function(now=performance.now()){if(mobileRenderEnabled()&&(MOBILE_RENDER.cpuPressure>0||MOBILE_RENDER.runtimeFx<.72)){const gap=MOBILE_RENDER.cpuPressure>=1.5?330:240;if(GD027.lastExtraMini&&now-GD027.lastExtraMini<gap)return false;GD027.lastExtraMini=now}return _gd027ShouldPaintMini(now)};

document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastTime=performance.now();if(typeof MOBILE_RENDER!=='undefined')MOBILE_RENDER.logicCarryMs=0;GD027.metrics.visibilityResumes++}});
addEventListener('pagehide',()=>{if(G.started)try{saveGame()}catch(_){}});

// ---------- Replayability & Contramaré ----------
function gd027PromoteVeteran(e){return promoteVeteran(e)}
const _gd027ApplyNg=applyNgPlusEnemy;
applyNgPlusEnemy=function(e){const r=_gd027ApplyNg(e);if(!ngActive()||!r)return r;const rule=gd027Rule();if(rule.id==='iron'){if(!r.boss&&!r.guardian)r.damage*=1.025}else if(rule.id==='echo'){const common=!r.boss&&!r.guardian&&!r.guardianMinion&&!r.miniBossId;if(common&&!r.ngElite&&worldRand(Math.floor(r.x*.11+r.y*.07),1700+ngCycle())<.085)gd027PromoteVeteran(r)}else if(rule.id==='surge'){r.speed*=r.boss||r.guardian?1.025:1.055;if(Number.isFinite(r.attackCD))r.attackCD*=.94}else if(rule.id==='drift'){if(!r.boss&&!r.guardian)r.xp=Math.round(r.xp*1.08)}return r};

const _gd027HookCooldown=hookCooldown;hookCooldown=function(){let v=_gd027HookCooldown();if(ngActive()&&gd027Rule()?.id==='iron')v*=.92;return Math.max(.45,v)};
const _gd027BirdCooldown=birdCooldown;birdCooldown=function(){let v=_gd027BirdCooldown();if(ngActive()&&gd027Rule()?.id==='echo')v*=.91;return Math.max(4.4,v)};
const _gd027DashCooldown=dashCooldown;dashCooldown=function(){let v=_gd027DashCooldown();if(ngActive()&&gd027Rule()?.id==='surge')v*=.92;return Math.max(.58,v)};

const _gd027TryParry=tryParry;
tryParry=function(from){const ok=_gd027TryParry(from);if(ok&&ngActive()&&gd027Rule()?.id==='surge')player.stamina=Math.min(maxStamina(),player.stamina+4);return ok};




const _gd027ChooseEvent=chooseDynamicEvent;
chooseDynamicEvent=function(){if(ngActive()&&gd027Rule()?.id==='echo'&&eventRoll(G.eventSeq,2727)<.24)return 'countertide';return _gd027ChooseEvent()};

const _gd027FinishEvent=finishDynamicEvent;
finishDynamicEvent=function(reason='complete'){const evt=G.activeEvent,rule=ngActive()?gd027Rule():null,beforeCoins=player?.coins||0;const r=_gd027FinishEvent(reason);if(reason==='complete'&&rule?.id==='drift'&&evt&&['merchant','birdFind','castaway'].includes(evt.type)){player.coins=Math.min(999999,player.coins+8);if(player.coins>beforeCoins)text(player.x,player.y-54,'MEMÓRIA DA MARÉ +8','#ead49a',9)}return r};

const _gd027Prepare=prepareGameState;
prepareGameState=function(data=null){GD027.guardTimer=0;GD027.pressureStreak=0;GD027.lastContext='';GD027.runtime.mode='normal';const r=_gd027Prepare(data);if(ngActive()){const wp=gd027RememberedWaypoint();if(!G.waypoints.includes(wp)){G.waypoints.push(wp);GD027.metrics.rememberedRoutes++}}return r};

const _gd027Finalize=finalizeGameStart;
finalizeGameStart=function(data=null){const r=_gd027Finalize(data);gd027EnsureContramareChip();gd027UpdateContramareChip();if(ngActive()&&GD027.announcedCycle!==ngCycle()){GD027.announcedCycle=ngCycle();const rule=gd027Rule();setTimeout(()=>{if(G.started&&!G.overlay)toast('CONTRAMARÉ +'+ngCycle()+' · '+rule.name+' · '+rule.boon,'gold')},350)}return r};

function gd027EnsureContramareChip(){let chip=$('gd027-contramare-chip');if(chip)return chip;chip=document.createElement('div');chip.id='gd027-contramare-chip';chip.className='gd027-contramare-chip';document.querySelector('.zone')?.appendChild(chip);return chip}
function gd027UpdateContramareChip(){const chip=gd027EnsureContramareChip();if(!chip)return;const rule=gd027Rule();chip.classList.toggle('active',!!rule);chip.textContent=rule?`NG+${ngCycle()} · ${rule.name}`:'';chip.title=rule?rule.desc+' '+rule.boon:''}

const _gd027StartNG=startNewGamePlus;
startNewGamePlus=function(){const next=Math.min(9,ngCycle()+1),ok=_gd027StartNG();if(ok){GD027.metrics.contramareStarts++;const rule=gd027Rule();toast('REGRA DO CICLO · '+rule.name,'gold');saveGame()}return ok};

const _gd027KillEnemy=killEnemy;
killEnemy=function(e){const cycle=ngCycle(),firstClear=!!(e?.boss&&!e.dead&&cycle>0&&ngPlusState().lastClearedCycle<cycle);const r=_gd027KillEnemy(e);if(firstClear){player.points=Math.min(120,player.points+1);player.coins=Math.min(999999,player.coins+60+cycle*10);GD027.metrics.contramareFirstClears++;toast('LEGADO DA CONTRAMARÉ · +1 ponto de habilidade · +'+(60+cycle*10)+' ouro','gold');if(cycle>=9)unlockAchievement('undertow9');else if(cycle>=6)unlockAchievement('undertow6');else if(cycle>=3)unlockAchievement('undertow3');saveGame();updateHUD()}return r};

function gd027InjectRuleCard(){const modal=$('modal');if(!modal||!ngActive()||modal.querySelector('.gd027-rule-card'))return;const rule=gd027Rule(),card=document.createElement('div');card.className='gd027-rule-card';card.innerHTML=`<b>CONTRAMARÉ +${ngCycle()} · ${rule.name}</b><br>${rule.desc}<small>${rule.boon} · A ilha lembrou a rota: ${gd027RememberedWaypoint()==='forest'?'Bosque':gd027RememberedWaypoint()==='marsh'?'Brejo':gd027RememberedWaypoint()==='dunes'?'Dunas':'Recife'}.</small>`;const foot=modal.querySelector('.footer-note');foot?foot.before(card):modal.appendChild(card)}
const _gd027ShowPause=showPause;showPause=function(){const r=_gd027ShowPause();gd027InjectRuleCard();return r};
const _gd027ShowVictory=showVictory;showVictory=function(){const r=_gd027ShowVictory();const modal=$('modal');if(modal){const next=Math.min(9,ngCycle()+1),rule=gd027Rule(next),card=document.createElement('div');card.className='gd027-rule-card';card.innerHTML=`<b>PRÓXIMA MARÉ · ${rule.name}</b><br>${rule.desc}<small>${rule.boon}</small>`;const menu=modal.querySelector('.menu-stack');menu?.before(card)}return r};

const _gd027Report=playtestReport;
playtestReport=function(){const r=_gd027Report();return {...r,gd027:{metrics:{...GD027.metrics},runtime:{...GD027.runtime,renderP95:MOBILE_RENDER?.renderP95||0,logicP95:MOBILE_RENDER?.logicP95||0,runtimeFx:MOBILE_RENDER?.runtimeFx||1,cpuPressure:MOBILE_RENDER?.cpuPressure||0},touch:{enabled:gd027IsTouch(),joystickDeadzone:.09,responseExponent:.78},contramare:ngActive()?{cycle:ngCycle(),rule:gd027Rule(),rememberedWaypoint:gd027RememberedWaypoint()}:null}}};

const _gd027SelfTest=runSelfTest;
runSelfTest=function(){const r=_gd027SelfTest(),f=[...(r.failures||[])];if(!CONTRAMARE_RULES.length)f.push('gd027-ng-rules');if(!ACHIEVEMENT_DEFS.undertow3||!ACHIEVEMENT_DEFS.undertow6||!ACHIEVEMENT_DEFS.undertow9)f.push('gd027-ng-achievements');if(gd027IsTouch()&&!$('touch-hook')?.querySelector('.touch-cd'))f.push('gd027-touch-feedback');return {...r,ok:f.length===0,failures:f}};

window.MareGD027={
 report:()=>({metrics:{...GD027.metrics},runtime:{...GD027.runtime},rule:gd027Rule(),touch:gd027IsTouch()}),
 rule:gd027Rule,ruleText:gd027RuleText,rememberedWaypoint:gd027RememberedWaypoint,
 guard:()=>{gd027TrimCosmetics();gd027RecoverInvalidState();return {particles:particles.length,texts:texts.length,trails:trails.length,mode:GD027.runtime.mode}},
 touchFeedback:gd027TouchFeedback
};
