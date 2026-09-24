'use strict';
// Maré Brava — CARD 47: Ritmo de Exploração e Densidade de Interesse.
// Mede lacunas de conteúdo autoral, preenche os maiores vazios com micro-marcos
// e oferece telemetria de "tempo morto" sem transformar a ilha em uma lista de GPS.

const RHYTHM_MOMENTS=Object.freeze({
 windRibbons:{name:'Fitas do Vendaval',zone:'meadow',x:780,y:1760,kind:'ribbons',action:'Examinar as fitas',first:'As fitas estão amarradas em alturas diferentes. Quando venta, elas apontam para três caminhos — nenhum deles é o principal.',repeat:'As fitas continuam discutindo com o vento. O vento continua ganhando.'},
 dryWell:{name:'Poço de Pedra Seca',zone:'meadow',x:2686,y:2234,kind:'well',action:'Olhar dentro do poço',first:'O poço está seco, mas o fundo tem marcas de corda recentes. Alguém ainda usa isto para alguma coisa.',repeat:'Continua seco. Pipoca continua achando que olhar de novo vai produzir água.'},
 seaCairn:{name:'Marco que Aponta para Fora',zone:'meadow',x:420,y:2700,kind:'cairn',action:'Examinar o marco',first:'Todas as pedras apontam para o mar aberto. A mais velha tem uma palavra quase apagada: “antes”.',repeat:'O marco continua apontando para um lugar onde hoje só existe água.'},
 whiteNest:{name:'Ninho de Galhos Brancos',zone:'forest',x:2220,y:420,kind:'nest',action:'Examinar o ninho',first:'Galhos claros, linha azul e uma pena que definitivamente não é do Pipoca. Ele discorda.',repeat:'Pipoca olha para o ninho como quem suspeita de concorrência.'},
 namedTree:{name:'Árvore dos Nomes Raspados',zone:'forest',x:900,y:1260,kind:'tree',action:'Ler os riscos no tronco',first:'Há dezenas de nomes raspados até ficarem ilegíveis. Um único risco recente diz: “VOLTEI”.',repeat:'Os nomes não voltaram. A palavra “VOLTEI” continua recente demais.'},
 lostDial:{name:'Relógio sem Ponteiro',zone:'dunes',x:3780,y:780,kind:'dial',action:'Examinar o relógio',first:'A pedra foi feita para medir uma sombra, mas o ponteiro sumiu. Mesmo assim, cinco marcas ainda recebem luz ao longo do dia.',repeat:'Sem ponteiro, o relógio mede apenas a sua insistência.'},
 brokenMast:{name:'Mastro Partido',zone:'dunes',x:5220,y:2220,kind:'mast',action:'Examinar o mastro',first:'O tecido preso ao mastro não combina com nenhum barco da ilha. A ponta aponta para oeste quando não há vento.',repeat:'O pedaço de tecido continua apontando para o lado errado. Confortante.'},
 stoppedTracks:{name:'Pegadas que Param',zone:'marsh',x:900,y:3180,kind:'tracks',action:'Seguir as pegadas',first:'As pegadas entram no lodo e simplesmente acabam. Não voltam, não afundam, não seguem. Acabam.',repeat:'Você confirma novamente: sim, elas terminam no meio de lugar nenhum.'},
 mudBoat:{name:'Barco Preso no Lodo',zone:'marsh',x:1260,y:3780,kind:'boat',action:'Examinar o barco',first:'O barco está longe demais da costa para ter vindo pela maré atual. Dentro dele há lama seca até no teto.',repeat:'Ainda não existe uma explicação boa para a lama no teto.'},
 shellSpiral:{name:'Conchas em Espiral',zone:'reef',x:3780,y:3780,kind:'shells',action:'Examinar as conchas',first:'As conchas formam uma espiral quase perfeita. No centro, uma está virada para baixo como se escondesse alguma coisa — não esconde.',repeat:'A concha do centro continua sem esconder nada. Isso já parece provocação.'}
});
const RHYTHM_MOMENT_IDS=Object.keys(RHYTHM_MOMENTS);
const RHYTHM_INTEREST_KINDS=new Set(['camp','waystone','npc','secret','chest','grappleAnchor','tideCache','worldBoard','livingMystery','livingInteract','livingBirdSpot','livingMysteryFinal','rhythmMoment']);
const RHYTHM={runtime:{lastX:null,lastY:null,scan:0,nearest:0,quietTime:0,quietDistance:0,maxQuietTime:0,maxQuietDistance:0,nudgeCooldown:18,nudges:0,lastZone:null},metrics:{momentsFound:0},densityTarget:420};

function rhythmState(){const s=livingState();if(!Array.isArray(s.rhythmSeen))s.rhythmSeen=[];return s}
function rhythmSeen(id){return rhythmState().rhythmSeen.includes(id)}
function rhythmCleanExploration(raw){const base=_rhythmBaseLivingCleanExploration(raw),seen=Array.isArray(raw?.rhythmSeen)?[...new Set(raw.rhythmSeen.filter(id=>RHYTHM_MOMENT_IDS.includes(id)))]:[];return {...base,rhythmSeen:seen}}

function rhythmBuildWorld(){
 for(const [id,d] of Object.entries(RHYTHM_MOMENTS)){
  const safe=typeof v3FindSafe==='function'?(v3FindSafe(d.x,d.y,18)||{x:d.x,y:d.y}):{x:d.x,y:d.y};
  structures.push({id:'rhythm-'+id,kind:'rhythmMoment',momentId:id,name:d.name,x:safe.x,y:safe.y,r:16,zone:d.zone});
 }
 RHYTHM.runtime.lastX=player?.x??null;RHYTHM.runtime.lastY=player?.y??null;RHYTHM.runtime.quietTime=0;RHYTHM.runtime.quietDistance=0;RHYTHM.runtime.maxQuietTime=0;RHYTHM.runtime.maxQuietDistance=0;RHYTHM.runtime.nudgeCooldown=18;RHYTHM.runtime.nudges=0;RHYTHM.runtime.scan=0;RHYTHM.runtime.nearest=0;RHYTHM.runtime.lastZone=player?zoneAt(player.x,player.y).id:null;
}

function rhythmMomentContext(id){
 const w=weatherNow().id,ph=dayPhaseAt().id;
 if(id==='windRibbons'&&['wind','storm'].includes(w))return 'Com o vento forte, a fita mais alta aponta diretamente para o interior da ilha por alguns segundos.';
 if(id==='dryWell'&&['rain','storm'].includes(w))return 'A chuva entra no poço e demora demais para produzir qualquer som de queda.';
 if(id==='seaCairn'&&['noite','madrugada'].includes(ph))return 'No escuro, o último alinhamento de pedras coincide com uma estrela baixa no horizonte.';
 if(id==='whiteNest'&&bird?.hintTime>0)return 'Pipoca fica perto demais do ninho e depois age como se nada tivesse acontecido.';
 if(id==='namedTree'&&weatherNow().id==='fog')return 'Com neblina, a palavra “VOLTEI” parece muito mais recente que o resto do tronco.';
 if(id==='lostDial'&&['noite','madrugada'].includes(ph))return 'À noite, o Relógio sem Ponteiro finalmente funciona perfeitamente: não mostra absolutamente nada.';
 if(id==='brokenMast'&&w==='clear')return 'Não há vento suficiente para mover tecido algum. Mesmo assim, a ponta ainda puxa para oeste.';
 if(id==='stoppedTracks'&&['rain','storm'].includes(w))return 'A chuva apaga pegadas ao redor, mas não estas.';
 if(id==='mudBoat'&&w==='fog')return 'A neblina faz o barco parecer perto de água por alguns segundos. Só parecer.';
 if(id==='shellSpiral'&&lowTideOpen())return 'Na vazante, uma segunda espiral menor aparece alguns passos adiante e termina antes de completar a volta.';
 return null;
}
function rhythmUseMoment(id,s){
 const d=RHYTHM_MOMENTS[id];if(!d)return false;const state=rhythmState(),first=!state.rhythmSeen.includes(id),context=rhythmMomentContext(id);
 if(first){state.rhythmSeen.push(id);RHYTHM.metrics.momentsFound++;sound('secret',.38);burst(s.x,s.y-8,'#dfd09a',7,42);text(s.x,s.y-38,'DETALHE DA ILHA','#eadba8',9);toast(d.name+' · '+(context||d.first),'gold');saveGame()}
 else toast(context||d.repeat);
 if(state.rhythmSeen.length===RHYTHM_MOMENT_IDS.length&&first)toast('Você encontrou todos os pequenos lugares que ninguém transformou em missão. Mara provavelmente aprova.','gold');
 rhythmResetQuiet();return true;
}

function drawRhythmMoment(s){
 if(s?.kind!=='rhythmMoment')return false;const d=RHYTHM_MOMENTS[s.momentId];if(!d)return true;const c=ctx,x=s.x,y=s.y,seen=rhythmSeen(s.momentId);c.save();ellipse(c,x,y+6,25,8,'#294b3e35');
 if(d.kind==='ribbons'){line(c,[[x,y+4],[x,y-45]],'#776849',4);for(let i=0;i<3;i++){const yy=y-38+i*11,flutter=Math.sin(G.time*2.4+i)*5;line(c,[[x,yy],[x+22+flutter,yy-4+i]],i===1?'#d0b37c':'#a9b37e',2.5)}}
 else if(d.kind==='well'){circle(c,x,y-10,22,'#676e5b','#b8b28b',3);circle(c,x,y-10,13,'#263d36');line(c,[[x-20,y-9],[x-14,y+4]],'#8d8261',3);line(c,[[x+20,y-9],[x+14,y+4]],'#8d8261',3)}
 else if(d.kind==='cairn'){for(let i=0;i<4;i++)ellipse(c,x+i*3,y-i*9,18-i*3,7-i*.7,i%2?'#8b9078':'#a8a989');line(c,[[x+18,y-29],[x+34,y-37]],'#d5c789',2)}
 else if(d.kind==='nest'){ellipse(c,x,y-12,23,10,'#756f53');for(let i=0;i<8;i++){const a=i/8*TAU;line(c,[[x+Math.cos(a)*10,y-12+Math.sin(a)*4],[x+Math.cos(a)*24,y-12+Math.sin(a)*9]],i%3===0?'#d6d4bd':'#8b7c58',2)}circle(c,x+4,y-14,4,'#d8d7c8')}
 else if(d.kind==='tree'){line(c,[[x,y+3],[x-2,y-62]],'#665b43',13);for(let i=0;i<4;i++)line(c,[[x-8,y-18-i*9],[x+8,y-20-i*8]],'#d1bd85',1.4);ellipse(c,x-8,y-64,28,13,'#4d744f');ellipse(c,x+14,y-59,25,12,'#5f8359')}
 else if(d.kind==='dial'){circle(c,x,y-7,24,'#a49b75','#dccb91',2);line(c,[[x,y-7],[x+Math.cos(G.time*.03)*17,y-7+Math.sin(G.time*.03)*8]],'#6d6044',3);for(let i=0;i<5;i++){const a=-2.4+i*.55;circle(c,x+Math.cos(a)*18,y-7+Math.sin(a)*13,1.8,'#ead89d')}}
 else if(d.kind==='mast'){line(c,[[x,y+4],[x-4,y-62]],'#746548',7);line(c,[[x-4,y-52],[x+30,y-38]],'#c2a66f',2);c.beginPath();c.moveTo(x+29,y-39);c.lineTo(x+50,y-33);c.lineTo(x+31,y-24);c.closePath();c.fillStyle='#8b9c78';c.fill()}
 else if(d.kind==='tracks'){for(let i=0;i<5;i++){const xx=x-27+i*13,yy=y-8-i*5;ellipse(c,xx,yy,5,3,'#6a7561',i%2?-.3:.25);circle(c,xx+3,yy-4,1.5,'#869078')}}
 else if(d.kind==='boat'){c.beginPath();c.moveTo(x-31,y-9);c.lineTo(x+30,y-9);c.lineTo(x+19,y+8);c.lineTo(x-22,y+8);c.closePath();c.fillStyle='#806f4f';c.fill();line(c,[[x-25,y-4],[x+23,y-4]],'#c0a977',2);line(c,[[x-3,y-8],[x+2,y-43]],'#756447',4)}
 else if(d.kind==='shells'){for(let i=0;i<11;i++){const a=i*.72,r=3+i*2.2;ellipse(c,x+Math.cos(a)*r,y-8+Math.sin(a)*r*.55,4,2.5,i%2?'#dec7aa':'#b9d0b2',a)}}
 if(seen)circle(c,x+21,y-31,3,'#dfcc8d');if(dist(player,s)<135)worldLabel(x,y-51,d.name,seen?'#d2caa4':'#eddaa0',8);c.restore();return true;
}

function rhythmInterestPoints(){
 const points=[];
 for(const s of structures){if(RHYTHM_INTEREST_KINDS.has(s.kind)&&!s.hidden&&!(s.kind==='chest'&&s.opened))points.push({x:s.x,y:s.y,kind:s.kind,id:s.id||s.name||'',zone:zoneAt(s.x,s.y).id})}
 for(const [id,m] of Object.entries(MINIBOSS_DEFS))points.push({x:m.x,y:m.y,kind:'miniboss',id,zone:m.zone});
 for(const q of GUARDIANS)points.push({x:q.x,y:q.y,kind:'guardian',id:q.id,zone:zoneAt(q.x,q.y).id});
 points.push({x:BOSS_POS.x,y:BOSS_POS.y,kind:'boss',id:'boss',zone:zoneAt(BOSS_POS.x,BOSS_POS.y).id});return points;
}
function rhythmPercentile(values,p){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y),i=Math.min(a.length-1,Math.max(0,Math.round((a.length-1)*p)));return a[i]}
function rhythmDensityReport(step=120){
 const pts=rhythmInterestPoints(),zones={};let total=0,dead=0,max=0;
 for(let y=420;y<WORLD.h-260;y+=step)for(let x=420;x<WORLD.w-260;x+=step){if(!terrainGroundAt(x,y,35))continue;const z=zoneAt(x,y).id;let best=Infinity;for(const p of pts)best=Math.min(best,Math.hypot(x-p.x,y-p.y));if(!zones[z])zones[z]=[];zones[z].push(best);total++;if(best>RHYTHM.densityTarget)dead++;max=Math.max(max,best)}
 const out={};for(const [z,a] of Object.entries(zones))out[z]={samples:a.length,mean:+(a.reduce((n,v)=>n+v,0)/a.length).toFixed(1),p90:+rhythmPercentile(a,.9).toFixed(1),max:+Math.max(...a).toFixed(1),overTarget:a.filter(v=>v>RHYTHM.densityTarget).length};
 return {target:RHYTHM.densityTarget,points:pts.length,samples:total,overTarget:dead,max:+max.toFixed(1),zones:out};
}
function rhythmNearestInterestDistance(){let best=Infinity;for(const p of rhythmInterestPoints()){const d=Math.hypot(player.x-p.x,player.y-p.y);if(d<best)best=d}return best}
function rhythmResetQuiet(){const r=RHYTHM.runtime;r.quietTime=0;r.quietDistance=0;r.nudgeCooldown=Math.max(r.nudgeCooldown,12)}
function rhythmMaybeNudge(){
 const r=RHYTHM.runtime;if(r.nudgeCooldown>0||r.quietTime<12||r.quietDistance<850||!bird||bird.scoutTarget||player.combat>0||G.overlay)return false;
 let target=null,best=480;for(const s of structures){if(s.kind!=='rhythmMoment'||rhythmSeen(s.momentId))continue;const d=dist(player,s);if(d>145&&d<best){best=d;target=s}}
 if(!target)return false;bird.hintTime=Math.max(bird.hintTime||0,5);r.nudges++;r.nudgeCooldown=95;toast('Pipoca começou a olhar demais para alguma coisa adiante.');return true;
}
function rhythmUpdate(dt){
 if(!G.started||!player)return;const r=RHYTHM.runtime;r.nudgeCooldown=Math.max(0,r.nudgeCooldown-dt);const x=player.x,y=player.y;if(r.lastX===null){r.lastX=x;r.lastY=y;return}const moved=Math.hypot(x-r.lastX,y-r.lastY);r.lastX=x;r.lastY=y;
 if(G.overlay||player.hp<=0||player.combat>0||G.activeEvent){rhythmResetQuiet();return}
 r.scan+=dt;if(r.scan>=.38){r.scan=0;r.nearest=rhythmNearestInterestDistance()}
 if(r.nearest>285&&moved>.15){r.quietTime+=dt;r.quietDistance+=moved;r.maxQuietTime=Math.max(r.maxQuietTime,r.quietTime);r.maxQuietDistance=Math.max(r.maxQuietDistance,r.quietDistance)}else if(r.nearest<=285)rhythmResetQuiet();
 const z=zoneAt(x,y).id;if(r.lastZone&&r.lastZone!==z)rhythmResetQuiet();r.lastZone=z;rhythmMaybeNudge();
}

function rhythmJournalHTML(){const s=rhythmState();if(!s.rhythmSeen.length)return '';return `<div class="v3-biome-notes"><b>Lugares que não viraram missão · ${s.rhythmSeen.length}/${RHYTHM_MOMENT_IDS.length}</b><p>${s.rhythmSeen.map(id=>RHYTHM_MOMENTS[id].name).join(' · ')}</p><small>São observações de viagem, não objetivos. Nenhum deles aparece como marcador no mapa.</small></div>`}

// Integração com Ilha Viva sem duplicar regras de interação/render/save.
const _rhythmBaseLivingCleanExploration=livingCleanExploration;
livingCleanExploration=function(raw){return rhythmCleanExploration(raw)};
const _rhythmBaseLivingBuildWorld=livingBuildWorld;
livingBuildWorld=function(){_rhythmBaseLivingBuildWorld();rhythmBuildWorld()};
const _rhythmBaseUpdateLivingIsland=updateLivingIsland;
updateLivingIsland=function(dt){_rhythmBaseUpdateLivingIsland(dt);rhythmUpdate(dt)};
const _rhythmBaseLivingCanNearby=livingCanNearby;
livingCanNearby=function(s){if(s?.kind==='rhythmMoment')return true;return _rhythmBaseLivingCanNearby(s)};
const _rhythmBaseLivingInteractionRange=livingInteractionRange;
livingInteractionRange=function(s){if(s?.kind==='rhythmMoment')return 88;return _rhythmBaseLivingInteractionRange(s)};
const _rhythmBaseLivingInteractionLabel=livingInteractionLabel;
livingInteractionLabel=function(s){if(s?.kind==='rhythmMoment')return RHYTHM_MOMENTS[s.momentId]?.action||'Examinar';return _rhythmBaseLivingInteractionLabel(s)};
const _rhythmBaseInteractLivingStructure=interactLivingStructure;
interactLivingStructure=function(s){if(s?.kind==='rhythmMoment')return rhythmUseMoment(s.momentId,s);return _rhythmBaseInteractLivingStructure(s)};
const _rhythmBaseDrawLivingStructure=drawLivingStructure;
drawLivingStructure=function(s){if(s?.kind==='rhythmMoment')return drawRhythmMoment(s);return _rhythmBaseDrawLivingStructure(s)};
const _rhythmBaseLivingBirdTarget=livingBirdTarget;
livingBirdTarget=function(s){if(s?.kind==='rhythmMoment')return !rhythmSeen(s.momentId);return _rhythmBaseLivingBirdTarget(s)};
const _rhythmBaseFinishLivingBirdScout=finishLivingBirdScout;
finishLivingBirdScout=function(t){if(t?.kind==='rhythmMoment'){bird.hintTarget=t;bird.hintTime=7;text(t.x,t.y-37,'PIPOCA DESCONFIA','#f4dfa0',10);toast('Pipoca pousou perto de '+t.name+'. Talvez valha olhar com seus próprios olhos.');return true}return _rhythmBaseFinishLivingBirdScout(t)};
const _rhythmBaseLivingJournalHTML=livingJournalHTML;
livingJournalHTML=function(){const base=_rhythmBaseLivingJournalHTML();if(!base)return rhythmState().rhythmSeen.length?`<section class="v3-journal"><div class="eyebrow">COISAS QUE A ILHA NÃO EXPLICA</div>${rhythmJournalHTML()}</section>`:'';return base.replace('</section>',rhythmJournalHTML()+'</section>')};
const _rhythmBaseLivingSelfTest=livingSelfTest;
livingSelfTest=function(){const errors=_rhythmBaseLivingSelfTest();const ids=structures.filter(s=>s.kind==='rhythmMoment').map(s=>s.momentId);if(G.started&&new Set(ids).size!==RHYTHM_MOMENT_IDS.length)errors.push('rhythm-moment-count');for(const [id,d] of Object.entries(RHYTHM_MOMENTS)){if(!landAt(d.x,d.y,25))errors.push('rhythm-off-land:'+id);if(zoneAt(d.x,d.y).id!==d.zone)errors.push('rhythm-zone:'+id)}const clean=livingCleanExploration(rhythmState());if(JSON.stringify(clean.rhythmSeen)!==JSON.stringify(rhythmState().rhythmSeen))errors.push('rhythm-save-state');return errors};

window.MareExplorationRhythm={
 report(){const r=RHYTHM.runtime,s=rhythmState();return {build:BUILD_ID,seen:[...s.rhythmSeen],seenCount:s.rhythmSeen.length,total:RHYTHM_MOMENT_IDS.length,quiet:{currentSeconds:+r.quietTime.toFixed(1),currentDistance:+r.quietDistance.toFixed(1),maxSeconds:+r.maxQuietTime.toFixed(1),maxDistance:+r.maxQuietDistance.toFixed(1),nearestInterest:+r.nearest.toFixed(1),nudges:r.nudges}}},
 density:rhythmDensityReport,
 resetTelemetry(){RHYTHM.runtime.maxQuietTime=RHYTHM.runtime.maxQuietDistance=RHYTHM.runtime.quietTime=RHYTHM.runtime.quietDistance=0;RHYTHM.runtime.nudges=0;return true}
};
