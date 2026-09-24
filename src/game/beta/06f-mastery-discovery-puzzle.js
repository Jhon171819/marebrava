'use strict';
// GD-025 — Combat Mastery + Exploration Discovery + Puzzle Environmental Clarity.
// Este passe não aumenta grind nem simplifica soluções: ele torna leitura, domínio e personalidade mais claros.

const QUALITY_PASS={
 enemySeen:new Set(),approachCues:new Set(),puzzleEntered:new Set(),
 ambienceTick:0,lastZone:null,
 metrics:{identityIntroductions:0,masteryInterrupts:0,recoveryWindows:0,spongePackBreaks:0,discoveryCues:0,puzzleEntryCues:0}
};
const ENEMY_IDENTITY=Object.freeze({
 crab:{label:'CASCO FRONTAL',color:'#e0b17c'},
 bandit:{label:'ATIRADOR',color:'#d8c08f'},
 slime:{label:'SALTO + LODO',color:'#acd18f'},
 mushroom:{label:'ESPOROS',color:'#caa8c2'},
 wisp:{label:'TELEPORTE',color:'#b8ded1'},
 sponge:{label:'MATILHA',color:'#e2ca79'}
});

function qualityResetRuntime(){QUALITY_PASS.enemySeen.clear();QUALITY_PASS.approachCues.clear();QUALITY_PASS.puzzleEntered.clear();QUALITY_PASS.ambienceTick=0;QUALITY_PASS.lastZone=null;for(const k of Object.keys(QUALITY_PASS.metrics))QUALITY_PASS.metrics[k]=0}
function qualityEnemyIntro(e){if(!G.started||!e||e.dead||e.boss||e.guardian||e.miniBossId||!ENEMY_IDENTITY[e.type]||QUALITY_PASS.enemySeen.has(e.type))return;QUALITY_PASS.enemySeen.add(e.type);QUALITY_PASS.metrics.identityIntroductions++;const d=ENEMY_IDENTITY[e.type];text(e.x,e.y-e.r-46,d.label,d.color,10)}
function qualityExpose(e,label,seconds=.55){if(!e||e.dead)return;e.vulnerable=Math.max(e.vulnerable||0,seconds);e.masteryCue=label;e.masteryCueUntil=G.playTime+seconds;QUALITY_PASS.metrics.recoveryWindows++}

const _qualityBaseSetEnemyState=setEnemyState;
setEnemyState=function(e,state,time=0){const r=_qualityBaseSetEnemyState(e,state,time);if(state==='alert'||state==='combat')qualityEnemyIntro(e);return r};

const _qualityBaseDamageEnemy=damageEnemy;
damageEnemy=function(e,amount,source,critical=false,strong=false){
 if(e&&!e.dead&&e.strikePending==='mushroomSpore'&&(['charged','hook','pull'].includes(source))){
  e.strikePending=null;e.windup=0;e.stun=Math.max(e.stun,.62);qualityExpose(e,'ESPOROS INTERROMPIDOS',.95);text(e.x,e.y-e.r-42,'ESPOROS INTERROMPIDOS','#ecd29b',9);burst(e.x,e.y-16,'#d8b9d0',10,70);QUALITY_PASS.metrics.masteryInterrupts++;
 }
 if(e&&!e.dead&&e.strikePending==='wispBlink'&&(['hook','pull'].includes(source))){
  e.strikePending=null;e.windup=0;e.phaseShift=0;e.stun=Math.max(e.stun,.48);qualityExpose(e,'LUZ PRESA',.78);text(e.x,e.y-e.r-39,'LUZ PRESA','#c8e8dc',9);burst(e.x,e.y-14,'#b9ddd0',11,75);QUALITY_PASS.metrics.masteryInterrupts++;
 }
 return _qualityBaseDamageEnemy(e,amount,source,critical,strong);
};

const _qualityBaseResolveEnemyStrike=resolveEnemyStrike;
resolveEnemyStrike=function(e,kind){
 const r=_qualityBaseResolveEnemyStrike(e,kind);
 if(!e||e.dead)return r;
 if(kind==='banditVolley'){e.recover=Math.max(e.recover,.42);qualityExpose(e,'RECARREGANDO',.72)}
 else if(kind==='slimeLeap'){qualityExpose(e,'POUSO ABERTO',.52)}
 else if(kind==='wispBlink'){qualityExpose(e,'REAPARECEU',.42)}
 else if(kind==='mushroomSpore'){e.recover=Math.max(e.recover,.34);qualityExpose(e,'SEM ESPOROS',.48)}
 return r;
};

const _qualityBaseKillEnemy=killEnemy;
killEnemy=function(e){
 const pack=e?.type==='sponge'&&!e.dead?enemies.filter(n=>n!==e&&!n.dead&&n.type==='sponge'&&!n.boss&&!n.guardian&&dist(e,n)<190):[];
 const r=_qualityBaseKillEnemy(e);
 if(pack.length){for(const n of pack){n.stun=Math.max(n.stun,.22);n.kiteTime=0;n.packBoost=1}if(pack.length>=2){text(e.x,e.y-e.r-43,'MATILHA QUEBROU','#ead99b',9);QUALITY_PASS.metrics.spongePackBreaks++}}
 return r;
};

const _qualityBaseDrawCombatTelegraph=drawCombatTelegraph;
drawCombatTelegraph=function(e,c){_qualityBaseDrawCombatTelegraph(e,c);if(!e||e.dead||!e.masteryCue||e.masteryCueUntil<=G.playTime||PREFS.telegraphLabels!=='full')return;worldLabel(e.x,e.y-e.r*2.15-52,e.masteryCue,'#f2dda2',7)};

// -------- Exploração: personalidade, legibilidade e reação do mundo --------
const _qualityBaseRhythmMomentContext=rhythmMomentContext;
rhythmMomentContext=function(id){
 const normal=_qualityBaseRhythmMomentContext(id);if(!rhythmSeen(id))return normal;
 if(G.bossDefeated){
  if(id==='seaCairn')return 'Com a maré finalmente estável, uma faixa de pedra antes submersa aparece na direção apontada pelo marco.';
  if(id==='shellSpiral')return 'A água recua sem discutir. Pela primeira vez, a espiral inteira fica visível por alguns segundos.';
  if(id==='brokenMast')return 'Sem a pressão estranha da maré, o tecido finalmente acompanha o vento comum. Quase parece aliviado.';
 }
 if(G.seals.includes('moss')&&id==='namedTree')return 'As raízes recuaram do tronco e revelaram um nome que antes estava coberto. Alguém realmente voltou.';
 if(G.seals.includes('mire')&&id==='stoppedTracks')return 'Com o lodo mais firme, aparecem duas pegadas depois do ponto onde a trilha costumava acabar.';
 if(G.seals.includes('bronze')&&id==='lostDial')return 'A vibração metálica do Selo de Bronze faz uma das cinco marcas do relógio responder com um brilho curto.';
 return normal;
};

const _qualityBaseDrawRhythmMoment=drawRhythmMoment;
drawRhythmMoment=function(s){const handled=_qualityBaseDrawRhythmMoment(s);if(!s||s.kind!=='rhythmMoment'||rhythmSeen(s.momentId)||(typeof mobileRenderEnabled==='function'&&mobileRenderEnabled()))return handled;const d=dist(player,s);if(d>145&&d<285){const c=ctx,p=.5+.5*Math.sin(G.time*2.1+s.x*.01);c.save();c.globalAlpha=.12+.12*p;circle(c,s.x,s.y-8,30+p*8,null,'#e7d596',1.2);c.restore()}return handled};

function qualityWorldAmbience(){
 if(!G.started||!player||G.overlay||(typeof mobileRenderEnabled==='function'&&mobileRenderEnabled()))return;const c=ctx,z=zoneAt(player.x,player.y).id,t=G.time;
 c.save();
 if(z==='meadow'&&['wind','storm'].includes(weatherNow().id)){c.globalAlpha=.13;for(let i=0;i<3;i++){const q=(t*.35+i*.31)%1,a=v3WindData(),x=player.x-170+a.x*q*340+i*24,y=player.y-105+a.y*q*210+i*36;line(c,[[x,y],[x+a.x*36,y+a.y*20]],'#eadba8',1)}}
 else if(z==='forest'&&(['noite','madrugada'].includes(dayPhaseAt().id)||weatherNow().id==='fog')){c.globalAlpha=.22;for(let i=0;i<4;i++){const a=t*.32+i*1.7,r=70+i*24;circle(c,player.x+Math.cos(a)*r,player.y-20+Math.sin(a*1.3)*45,1.8,'#dce9a6')}}
 else if(z==='marsh'){c.globalAlpha=.13;for(let i=0;i<3;i++){const a=t*.22+i*2.2,r=55+i*31;circle(c,player.x+Math.cos(a)*r,player.y+Math.sin(a*.8)*38,5+i*2,null,'#cdd9a5',1)}}
 else if(z==='dunes'&&['wind','storm'].includes(weatherNow().id)){c.globalAlpha=.12;for(let i=0;i<3;i++){const q=(t*.28+i*.27)%1,x=player.x-160+q*320,y=player.y-70+i*42;line(c,[[x,y],[x+42,y-8]],'#ead7a4',1)}}
 else if(z==='reef'){c.globalAlpha=.12+.05*Math.sin(t*2);for(let i=0;i<3;i++)circle(c,player.x-45+i*45,player.y+45+Math.sin(t+i)*8,12+i*3,null,'#cbe2d3',1)}
 c.restore();
}
const _qualityBaseDrawPolishWorld=drawPolishWorld;
drawPolishWorld=function(){_qualityBaseDrawPolishWorld();qualityWorldAmbience()};

function qualityDiscoveryUpdate(dt){
 if(!G.started||!player||G.overlay||player.combat>0)return;QUALITY_PASS.ambienceTick-=dt;if(QUALITY_PASS.ambienceTick>0)return;QUALITY_PASS.ambienceTick=(typeof mobileRenderEnabled==='function'&&mobileRenderEnabled())?.55:.32;
 let best=null,bd=230;for(const s of structures){if(s.kind!=='rhythmMoment'||rhythmSeen(s.momentId)||QUALITY_PASS.approachCues.has(s.momentId))continue;const d=dist(player,s);if(d<bd&&d>120){best=s;bd=d}}
 if(best){QUALITY_PASS.approachCues.add(best.momentId);QUALITY_PASS.metrics.discoveryCues++;text(best.x,best.y-46,'…','#e0d4a6',12);if(bird)bird.hintTime=Math.max(bird.hintTime||0,2.2);sound('secret',.16)}
}

// -------- Puzzles: pistas ambientais e estado físico do mecanismo --------
V3_SITES.counterweight.clue='O círculo gravado no chão está ligado por corda à ponte. O lastro altera a tensão; a trava acima só parece ceder quando o cabo relaxa.';
V3_SITES.marshLights.clue='Os três lumes compartilham a mesma linha antiga. Quando um responde ao gancho, os outros também despertam por alguns segundos.';
V3_SITES.glassArray.clue='Cada pedestal tem quatro posições. As marcas douradas no chão indicam onde a luz deveria passar; puxar a armação gira o espelho.';
V3_SITES.tidalLock.clue='Válvula e corrente pertencem à mesma eclusa. Na vazante, a água deixa a engrenagem respirar; a corrente fica acessível do lado leste.';

function qualityPuzzleLinks(){
 if(!G.started||(typeof mobileRenderEnabled==='function'&&mobileRenderEnabled()))return;const c=ctx;c.save();c.lineWidth=1.5;
 // Contrapeso: cabo visível entre placa, mecanismo e trava.
 if(!v3Solved('counterweight')&&v3Visible(1810,1985,260)){
  c.globalAlpha=.36;line(c,[[V3_PLATE.x,V3_PLATE.y],[1848,1992],[1848,1918],[1825,1885]],V3.plate>=.45?'#ead690':'#9d9872',2);
  if(V3.plate>=.45){c.globalAlpha=.18+.12*Math.sin(G.time*4);circle(c,1825,1885,27,null,'#efd89b',2)}
 }
 // Trava das Vozes: o cordame mostra que são partes do mesmo sistema, sem entregar ordem.
 if(!v3Solved('birdsong')&&v3Visible(1620,950,280)){
  const bell=v3Object('v3-bell'),perch=v3Object('v3-perch'),winch=v3Object('v3-winch');if(bell&&perch&&winch){c.globalAlpha=.3;line(c,[[bell.x,bell.y-35],[perch.x,perch.y-38],[winch.x,winch.y-18]],V3.bell>0?'#e3cf8d':'#918568',1.6)}
 }
 // Lumes: circuito entre os três pontos deixa o estado coletivo legível.
 if(!v3Solved('marshLights')&&v3Visible(2070,3620,330)){
  const lamps=['a','b','c'].map(k=>v3Object('v3-lamp-'+k)).filter(Boolean);if(lamps.length===3){for(let i=0;i<3;i++){const a=lamps[i],b=lamps[(i+1)%3],on=V3.marshLights[i]>0&&V3.marshLights[(i+1)%3]>0;c.globalAlpha=on?.48:.17;line(c,[[a.x,a.y-18],[b.x,b.y-18]],on?'#e4e89b':'#6f826b',on?2.2:1.2)}}
 }
 // Jardim de Vidro: espelhos alinhados realmente desenham o caminho da luz.
 if(!v3Solved('glassArray')&&v3Visible(4210,1410,330)){
  const center={x:4210,y:1320};for(let i=0;i<3;i++){const o=v3Object('v3-mirror-'+['a','b','c'][i]);if(!o)continue;const ok=V3.mirrorAngles[i]===V3.mirrorTarget[i];if(ok){c.globalAlpha=.26+.1*Math.sin(G.time*5+i);line(c,[[o.x,o.y-24],[center.x,center.y]],'#f2dfa0',2);circle(c,center.x,center.y,7+i*2,null,'#f2dfa0',1)}}
  c.globalAlpha=.45;circle(c,center.x,center.y,5,'#ead58f');
 }
 // Eclusa: mostra fisicamente a cadeia válvula -> passagem -> corrente.
 if(!v3Solved('tidalLock')&&v3Visible(4850,2810,360)){
  const valve=v3Object('v3-valve'),chain=v3Object('v3-chain');if(valve&&chain){c.globalAlpha=V3.valve>0?.42:.2;line(c,[[valve.x,valve.y-18],[4820,2790],[4910,2830],[chain.x,chain.y-18]],V3.valve>0?'#c8dfc7':'#829a88',V3.valve>0?2.2:1.3);if(V3.valve>0){const q=(G.time*.45)%1,x=lerp(valve.x,chain.x,q),y=lerp(valve.y-18,chain.y-18,q);circle(c,x,y,3,'#d8e8cf')}}
 }
 c.restore();
}
const _qualityBaseV3DrawGround=v3DrawGround;
v3DrawGround=function(){_qualityBaseV3DrawGround();qualityPuzzleLinks()};

function qualityPuzzleEntryUpdate(){
 if(!G.started||!player||G.overlay)return;for(const [id,s] of V3_SITE_ENTRIES){if(v3Solved(id)||QUALITY_PASS.puzzleEntered.has(id)||dist(player,s)>270)continue;QUALITY_PASS.puzzleEntered.add(id);QUALITY_PASS.metrics.puzzleEntryCues++;text(s.x,s.y-78,'MECANISMO ANTIGO','#e7d69c',10);sound('secret',.22);break}
}
const _qualityBaseV3Update=v3Update;
v3Update=function(dt){_qualityBaseV3Update(dt);qualityPuzzleEntryUpdate()};

const _qualityBaseV3BuildWorld=v3BuildWorld;
v3BuildWorld=function(){qualityResetRuntime();return _qualityBaseV3BuildWorld()};

const _qualityBaseUpdate=update;
update=function(dt){_qualityBaseUpdate(dt);qualityDiscoveryUpdate(dt)};

const _qualityBasePlaytestReport=playtestReport;
playtestReport=function(){const r=_qualityBasePlaytestReport();r.qualityPass={enemySeen:[...QUALITY_PASS.enemySeen],approachCues:[...QUALITY_PASS.approachCues],puzzlesEntered:[...QUALITY_PASS.puzzleEntered],metrics:{...QUALITY_PASS.metrics}};return r};

const _qualityBaseRunSelfTest=runSelfTest;
runSelfTest=function(){const r=_qualityBaseRunSelfTest(),f=[...(r.failures||[])];if(!V3_SITES.counterweight.clue.includes('tensão'))f.push('gd025-puzzle-clue-counterweight');if(!V3_SITES.glassArray.clue.includes('marcas douradas'))f.push('gd025-puzzle-clue-glass');if(!ENEMY_IDENTITY.crab||!ENEMY_IDENTITY.wisp||!ENEMY_IDENTITY.sponge)f.push('gd025-enemy-identity');return {...r,ok:f.length===0,failures:f}};

window.MareQualityPass={report:()=>({enemySeen:[...QUALITY_PASS.enemySeen],approachCues:[...QUALITY_PASS.approachCues],puzzlesEntered:[...QUALITY_PASS.puzzleEntered],metrics:{...QUALITY_PASS.metrics}}),reset:qualityResetRuntime};
