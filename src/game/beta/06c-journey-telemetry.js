'use strict';
// Maré Brava — CARD 48: Telemetria local de jornada e playtest de retenção.
// Não envia dados. Mantém uma sessão compacta no navegador e permite exportar JSON.

const JOURNEY_AGENT=window.MareAgentConfig?.enabled?window.MareAgentConfig:null;
const JOURNEY_STORAGE_KEY='mare-brava-playtest-journey-v1'+(JOURNEY_AGENT?.tester?.id?'-'+JOURNEY_AGENT.tester.id:'');
const JOURNEY_SCHEMA=2;
const JOURNEY_LIMITS=Object.freeze({path:2400,events:900,pulls:180,stops:120,deaths:80,overlays:180,history:8});
const JOURNEY={
 active:false,
 data:null,
 runtime:{t:0,lastX:null,lastY:null,lastZone:null,lastCell:null,sample:0,stateScan:0,persist:0,state:null,near:null,stopTime:0,stopStart:null,combat:null,puzzle:null,puzzleCooldown:{},overlay:null,pendingPull:null,lastMeaningful:0,lastMeaningfulDistance:0,totalDistance:0,tickCarry:0,lastDeathCount:0,lastBossDefeated:false,lastKills:0},
 history:[]
};

function journeyRound(n,d=1){const p=10**d;return Math.round((Number(n)||0)*p)/p}
function journeyPush(arr,item,limit){arr.push(item);if(arr.length>limit)arr.splice(0,arr.length-limit)}
function journeyNow(){return JOURNEY.runtime.t}
function journeyZone(){return player?zoneAt(player.x,player.y).id:'unknown'}
function journeyDevice(){const m=window.MareMobileRender?.report?.();return {mobile:!!m?.enabled,tier:m?.tier||'desktop',viewport:[innerWidth,innerHeight],dpr:journeyRound(devicePixelRatio||1,2),pixelRatio:m?.pixelRatio??null,memory:m?.deviceMemory??null,cores:m?.hardwareConcurrency??navigator.hardwareConcurrency??null,touch:matchMedia?.('(pointer:coarse)')?.matches===true}}
function journeyBlankZones(){return {meadow:{seconds:0,distance:0,entries:0},forest:{seconds:0,distance:0,entries:0},marsh:{seconds:0,distance:0,entries:0},dunes:{seconds:0,distance:0,entries:0},reef:{seconds:0,distance:0,entries:0}}}
function journeyReadStore(){try{const raw=JSON.parse(localStorage.getItem(JOURNEY_STORAGE_KEY)||'null');if(!raw||raw.schema!==JOURNEY_SCHEMA)return {schema:JOURNEY_SCHEMA,history:[],current:null};return {schema:JOURNEY_SCHEMA,history:Array.isArray(raw.history)?raw.history.slice(-JOURNEY_LIMITS.history):[],current:raw.current||null}}catch(_){return {schema:JOURNEY_SCHEMA,history:[],current:null}}}
function journeySessionSummary(d){if(!d)return null;return {build:d.build,sessionId:d.sessionId,mode:d.mode,startedAt:d.startedAt,lastActiveAt:d.lastActiveAt||d.startedAt,duration:journeyRound(d.duration||0),distance:journeyRound(d.distance||0),zonesVisited:Object.values(d.zones||{}).filter(v=>v.entries>0).length,meaningful:d.counters?.meaningful||0,deaths:d.deaths?.length||0,puzzleSolves:Object.values(d.puzzles||{}).reduce((n,p)=>n+(p.solves||0),0),puzzleAbandons:Object.values(d.puzzles||{}).reduce((n,p)=>n+(p.abandons||0),0),ignored:d.counters?.ignored||0,returning:d.mode==='continue'}}
function journeyPersist(){if(!JOURNEY.data)return false;try{JOURNEY.data.lastActiveAt=Date.now();const store={schema:JOURNEY_SCHEMA,history:JOURNEY.history.slice(-JOURNEY_LIMITS.history),current:JOURNEY.data};localStorage.setItem(JOURNEY_STORAGE_KEY,JSON.stringify(store));return true}catch(_){return false}}
function journeyArchiveCurrent(reason='new-session'){
 const store=journeyReadStore();JOURNEY.history=store.history;
 const prev=JOURNEY.data||store.current;
 if(prev&&prev.build){prev.endedReason=reason;prev.endedAt=prev.lastActiveAt||Date.now();const summary=journeySessionSummary(prev);if(summary&&!JOURNEY.history.some(s=>s.sessionId===summary.sessionId))journeyPush(JOURNEY.history,summary,JOURNEY_LIMITS.history)}
}
function journeyRuntimeResetFromData(d){
 const t=Number(d?.duration)||0,total=Number(d?.distance)||0;
 Object.assign(JOURNEY.runtime,{t,lastX:player?.x??null,lastY:player?.y??null,lastZone:player?journeyZone():null,lastCell:null,sample:0,stateScan:0,persist:0,state:null,near:null,stopTime:0,stopStart:null,combat:null,puzzle:null,puzzleCooldown:{},overlay:null,pendingPull:null,lastMeaningful:t,lastMeaningfulDistance:total,totalDistance:total,tickCarry:0,lastDeathCount:G.deathCount||0,lastBossDefeated:!!G.bossDefeated,lastKills:G.kills||0});
 JOURNEY.runtime.state=journeyStateSnapshot();
}
function journeyReset(mode='new'){
 const store=journeyReadStore(),resume=!!(JOURNEY_AGENT?.runId&&store.current?.agentRunId===JOURNEY_AGENT.runId&&!store.current?.finishedAt);
 if(resume){
  JOURNEY.history=store.history;JOURNEY.data=store.current;JOURNEY.data.build=BUILD_ID;JOURNEY.data.mode=JOURNEY.data.mode||mode;JOURNEY.data.device=JOURNEY.data.device||journeyDevice();JOURNEY.data.reloads=(JOURNEY.data.reloads||0)+1;JOURNEY.active=true;journeyRuntimeResetFromData(JOURNEY.data);journeyEvent('sessionResume',{mode,reload:JOURNEY.data.reloads,playTime:journeyRound(G.playTime||0)});journeyPersist();return JOURNEY.data;
 }
 journeyArchiveCurrent('next-session');
 const now=Date.now(),zones=journeyBlankZones();
 JOURNEY.data={schema:JOURNEY_SCHEMA,build:BUILD_ID,sessionId:`${now.toString(36)}-${Math.floor(Math.random()*0xffffff).toString(36)}`,agentRunId:JOURNEY_AGENT?.runId||null,tester:JOURNEY_AGENT?.tester||null,reloads:0,mode,startedAt:now,lastActiveAt:now,duration:0,distance:0,device:journeyDevice(),zones,path:[],heat:{},events:[],pulls:[],stops:[],deaths:[],overlays:[],interests:{},puzzles:{},dialogue:{},counters:{meaningful:0,interactions:0,ignored:0,exposures:0,combatEncounters:0,worldEvents:0,discoveries:0,mapOpens:0,journalOpens:0,pauseOpens:0},silence:{currentSeconds:0,maxSeconds:0,currentDistance:0,maxDistance:0},returnContext:{previousSessions:JOURNEY.history.length,lastSession:JOURNEY.history.length?JOURNEY.history[JOURNEY.history.length-1]:null}};
 journeyRuntimeResetFromData(JOURNEY.data);JOURNEY.active=true;if(JOURNEY.runtime.lastZone&&zones[JOURNEY.runtime.lastZone])zones[JOURNEY.runtime.lastZone].entries=1;journeyEvent('sessionStart',{mode,playTime:journeyRound(G.playTime||0)});journeyPersist();return JOURNEY.data;
}

function journeyEvent(type,data={}){if(!JOURNEY.active||!JOURNEY.data)return;journeyPush(JOURNEY.data.events,{t:journeyRound(journeyNow()),type,x:journeyRound(player?.x||0),y:journeyRound(player?.y||0),zone:player?journeyZone():'unknown',...data},JOURNEY_LIMITS.events)}
function journeyTargetKey(s){if(!s)return null;return s.id||`${s.kind||'object'}:${s.npcId||s.site||s.momentId||s.interactionId||s.mysteryId||s.name||Math.round(s.x)+','+Math.round(s.y)}`}
function journeyTargetLabel(s){if(!s)return 'Desconhecido';if(s.kind==='worldBoard'&&s.site&&V3_SITES?.[s.site])return V3_SITES[s.site].name;return s.name||s.kind||'Interação'}
function journeyInterest(s){const key=journeyTargetKey(s);if(!key)return null;const all=JOURNEY.data.interests;if(!all[key])all[key]={key,name:journeyTargetLabel(s),kind:s.kind||'unknown',exposures:0,interactions:0,ignored:0,dwell:0,zone:zoneAt(s.x,s.y).id};return all[key]}
function journeyCloseExposure(reason='left'){
 const n=JOURNEY.runtime.near;if(!n||!JOURNEY.data)return;const duration=Math.max(0,journeyNow()-n.started),row=JOURNEY.data.interests[n.key];if(row)row.dwell+=duration;
 if(!n.interacted&&duration>=1.5){if(row)row.ignored++;JOURNEY.data.counters.ignored++;journeyEvent('interestIgnored',{id:n.key,name:n.name,kind:n.kind,duration:journeyRound(duration),reason})}
 JOURNEY.runtime.near=null;
}
function journeyObserveNearby(){
 const s=nearby,key=journeyTargetKey(s),r=JOURNEY.runtime;
 if(r.near&&r.near.key!==key)journeyCloseExposure('left-range');
 if(s&&!r.near){const row=journeyInterest(s);row.exposures++;JOURNEY.data.counters.exposures++;r.near={key,name:row.name,kind:row.kind,started:journeyNow(),interacted:false}}
}
function journeyInteraction(s){if(!JOURNEY.active||!s)return;const row=journeyInterest(s);if(row){row.interactions++;JOURNEY.data.counters.interactions++}if(JOURNEY.runtime.near&&JOURNEY.runtime.near.key===journeyTargetKey(s))JOURNEY.runtime.near.interacted=true;journeyEvent('interaction',{id:journeyTargetKey(s),name:journeyTargetLabel(s),kind:s.kind});journeyMeaningful('interaction',journeyTargetKey(s),journeyTargetLabel(s),false)}

function journeyStateSnapshot(){
 const e=typeof livingState==='function'?livingState():G.exploration||{};
 return {known:new Set(G.exploration?.known||[]),solved:new Set(G.exploration?.solved||[]),secrets:new Set(G.secrets||[]),mystery:new Set(e.mystery||[]),rhythm:new Set(e.rhythmSeen||[]),keepsakes:new Set(e.keepsakes||[]),interactions:new Set(e.interactions||[]),eventsSeen:new Set(e.eventsSeen||[]),seals:new Set(G.seals||[]),waypoints:new Set(G.waypoints||[]),boss:!!G.bossDefeated,deaths:G.deathCount||0,kills:G.kills||0,quests:Object.fromEntries(Object.entries(G.quests||{}).map(([id,q])=>[id,JSON.stringify({step:q.step,status:q.status,completed:q.completed})]))};
}
function journeyName(type,id){if(type==='puzzle')return V3_SITES?.[id]?.name||id;if(type==='secret')return SECRET_DEFS?.[id]?.name||id;if(type==='mystery')return LIVING_MYSTERY?.[id]?.name||id;if(type==='rhythm')return RHYTHM_MOMENTS?.[id]?.name||id;if(type==='keepsake')return LIVING_KEEP_SAKES?.[id]?.name||id;if(type==='seal')return ({moss:'Selo do Musgo',mire:'Selo do Lodo',bronze:'Selo de Bronze'})[id]||id;return id}
function journeyNewSet(now,before,cb){for(const id of now)if(!before.has(id))cb(id)}
function journeyMeaningful(type,id,name,discovery=true){
 if(!JOURNEY.active)return;const r=JOURNEY.runtime,d=JOURNEY.data,t=journeyNow(),x=player?.x||0,y=player?.y||0;
 d.counters.meaningful++;if(discovery)d.counters.discoveries++;d.silence.currentSeconds=0;d.silence.currentDistance=0;
 const prev=r.pendingPull;if(prev&&prev.id!==id){const elapsed=t-prev.t,travel=Math.hypot(x-prev.x,y-prev.y);if(elapsed>=3&&elapsed<=120&&travel>=120)journeyPush(d.pulls,{from:{type:prev.type,id:prev.id,name:prev.name,zone:prev.zone},to:{type,id,name,zone:journeyZone()},seconds:journeyRound(elapsed),distance:journeyRound(travel)},JOURNEY_LIMITS.pulls)}
 r.pendingPull={type,id,name,t,x,y,zone:journeyZone()};r.lastMeaningful=t;r.lastMeaningfulDistance=r.totalDistance;journeyEvent('meaningful',{kind:type,id,name});
}
function journeyScanState(){
 const before=JOURNEY.runtime.state,now=journeyStateSnapshot();if(!before){JOURNEY.runtime.state=now;return}
 journeyNewSet(now.known,before.known,id=>{journeyEvent('puzzleDiscovered',{id,name:journeyName('puzzle',id)});journeyMeaningful('puzzleDiscovered',id,journeyName('puzzle',id))});
 journeyNewSet(now.solved,before.solved,id=>{journeyPuzzleSolved(id);journeyEvent('puzzleSolved',{id,name:journeyName('puzzle',id)});journeyMeaningful('puzzleSolved',id,journeyName('puzzle',id))});
 journeyNewSet(now.secrets,before.secrets,id=>{journeyEvent('secretFound',{id,name:journeyName('secret',id)});journeyMeaningful('secret',id,journeyName('secret',id))});
 journeyNewSet(now.mystery,before.mystery,id=>{journeyEvent('mysteryMark',{id,name:journeyName('mystery',id)});journeyMeaningful('mystery',id,journeyName('mystery',id))});
 journeyNewSet(now.rhythm,before.rhythm,id=>{journeyEvent('microLandmark',{id,name:journeyName('rhythm',id)});journeyMeaningful('microLandmark',id,journeyName('rhythm',id))});
 journeyNewSet(now.keepsakes,before.keepsakes,id=>{journeyEvent('pipocaKeepsake',{id,name:journeyName('keepsake',id)});journeyMeaningful('pipocaKeepsake',id,journeyName('keepsake',id))});
 journeyNewSet(now.seals,before.seals,id=>{journeyEvent('seal',{id,name:journeyName('seal',id)});journeyMeaningful('seal',id,journeyName('seal',id))});
 journeyNewSet(now.waypoints,before.waypoints,id=>{journeyEvent('waypoint',{id});journeyMeaningful('waypoint',id,id)});
 journeyNewSet(now.eventsSeen,before.eventsSeen,id=>journeyMeaningful('conditionalEvent',id,id));
 for(const [id,value] of Object.entries(now.quests))if(before.quests[id]!==value){journeyEvent('questProgress',{id});journeyMeaningful('quest',id,id,false)}
 if(now.boss&&!before.boss)journeyMeaningful('bossDefeated','boss','Esponjão');
 if(now.deaths>before.deaths){for(let i=before.deaths;i<now.deaths;i++)journeyDeath()}
 JOURNEY.runtime.state=now;
}

function journeyPuzzleRow(id){if(!JOURNEY.data.puzzles[id])JOURNEY.data.puzzles[id]={id,name:V3_SITES?.[id]?.name||id,attempts:0,solves:0,abandons:0,totalSeconds:0,longestAttempt:0};return JOURNEY.data.puzzles[id]}
function journeyPuzzleSolved(id){const r=JOURNEY.runtime,entry=journeyPuzzleRow(id);entry.solves=1;if(r.puzzle?.id===id){const dur=journeyNow()-r.puzzle.started;entry.totalSeconds+=dur;entry.longestAttempt=Math.max(entry.longestAttempt,dur);journeyEvent('puzzleAttemptSolved',{id,duration:journeyRound(dur)});r.puzzle=null}}
function journeyTrackPuzzle(){
 if(typeof V3_SITE_ENTRIES==='undefined')return;const r=JOURNEY.runtime,t=journeyNow();for(const id of Object.keys(r.puzzleCooldown))if(r.puzzleCooldown[id]<=t)delete r.puzzleCooldown[id];
 if(r.puzzle){const site=V3_SITES[r.puzzle.id];if(v3Solved(r.puzzle.id)){journeyPuzzleSolved(r.puzzle.id);return}if(!site||dist(player,site)>500){const dur=t-r.puzzle.started,entry=journeyPuzzleRow(r.puzzle.id);entry.totalSeconds+=dur;entry.longestAttempt=Math.max(entry.longestAttempt,dur);if(dur>=8){entry.abandons++;journeyEvent('puzzleAbandoned',{id:r.puzzle.id,name:entry.name,duration:journeyRound(dur),distanceFromSite:journeyRound(site?dist(player,site):0)})}r.puzzleCooldown[r.puzzle.id]=t+20;r.puzzle=null}return}
 let candidate=null,best=360;const fb=V3.feedback?.until>G.playTime?V3.objects?.find(o=>o.id===V3.feedback.id):null;for(const [id,site] of V3_SITE_ENTRIES){if(v3Solved(id)||r.puzzleCooldown[id])continue;const d=dist(player,site),intent=(fb?.site===id)||(hook?.target?.site===id)||(id==='birdsong'&&V3.birdTask);if(intent&&d<best){best=d;candidate=id}}
 if(candidate){const entry=journeyPuzzleRow(candidate);entry.attempts++;r.puzzle={id:candidate,started:t};journeyEvent('puzzleAttemptStart',{id:candidate,name:entry.name})}
}

function journeyDeath(){const d={t:journeyRound(journeyNow()),x:journeyRound(player.x),y:journeyRound(player.y),zone:journeyZone(),nearbyPuzzle:JOURNEY.runtime.puzzle?.id||null,combat:!!JOURNEY.runtime.combat};journeyPush(JOURNEY.data.deaths,d,JOURNEY_LIMITS.deaths);journeyEvent('death',d);journeyMeaningful('death',String(JOURNEY.data.deaths.length),'Morte',false)}
function journeyTrackCombat(){const r=JOURNEY.runtime,inCombat=player.combat>0;if(inCombat&&!r.combat){r.combat={started:journeyNow(),x:player.x,y:player.y,kills:G.kills};JOURNEY.data.counters.combatEncounters++;journeyEvent('combatStart')}else if(!inCombat&&r.combat){const c=r.combat;journeyEvent('combatEnd',{duration:journeyRound(journeyNow()-c.started),kills:Math.max(0,G.kills-c.kills)});r.combat=null}}
function journeyTrackStop(dt,moved){const r=JOURNEY.runtime;if(player.combat>0){r.stopTime=0;r.stopStart=null;return}if(moved<1.2){r.stopTime+=dt;if(r.stopTime>=3&&!r.stopStart)r.stopStart={t:journeyNow()-r.stopTime,x:player.x,y:player.y,zone:journeyZone()}}else if(r.stopStart){const dur=journeyNow()-r.stopStart.t;if(dur>=4)journeyPush(JOURNEY.data.stops,{...r.stopStart,duration:journeyRound(dur)},JOURNEY_LIMITS.stops);r.stopTime=0;r.stopStart=null}else r.stopTime=0}
function journeyTrackPath(dt,moved){
 const r=JOURNEY.runtime,d=JOURNEY.data,z=journeyZone();r.sample+=dt;
 const cell=`${Math.floor(player.x/280)},${Math.floor(player.y/280)}`;if(!d.heat[cell])d.heat[cell]={x:Math.floor(player.x/280)*280+140,y:Math.floor(player.y/280)*280+140,seconds:0,visits:0,zone:z};d.heat[cell].seconds+=dt;if(cell!==r.lastCell){d.heat[cell].visits++;r.lastCell=cell}
 if(d.zones[z]){d.zones[z].seconds+=dt;d.zones[z].distance+=moved}
 if(r.lastZone!==z){if(d.zones[z])d.zones[z].entries++;journeyEvent('zoneEnter',{from:r.lastZone,to:z});const p=r.pendingPull;if(p){const elapsed=journeyNow()-p.t,travel=Math.hypot(player.x-p.x,player.y-p.y);if(elapsed>=5&&elapsed<=120&&travel>=220){journeyPush(d.pulls,{from:{type:p.type,id:p.id,name:p.name,zone:p.zone},to:{type:'zoneEnter',id:z,name:z,zone:z},seconds:journeyRound(elapsed),distance:journeyRound(travel)},JOURNEY_LIMITS.pulls);r.pendingPull=null}}r.lastZone=z}
 if(r.sample>=.75){r.sample=0;journeyPush(d.path,{t:journeyRound(journeyNow()),x:Math.round(player.x),y:Math.round(player.y),zone:z},JOURNEY_LIMITS.path)}
}
function journeyTrackSilence(dt,moved){const s=JOURNEY.data.silence;s.currentSeconds+=dt;s.currentDistance+=moved;s.maxSeconds=Math.max(s.maxSeconds,s.currentSeconds);s.maxDistance=Math.max(s.maxDistance,s.currentDistance)}
function journeyUpdate(dt){
 if(!JOURNEY.active||!JOURNEY.data||!G.started||!player)return;const r=JOURNEY.runtime,d=JOURNEY.data;r.t+=dt;d.duration=r.t;
 const moved=r.lastX===null?0:Math.hypot(player.x-r.lastX,player.y-r.lastY);r.lastX=player.x;r.lastY=player.y;r.totalDistance+=moved;d.distance=r.totalDistance;
 journeyTrackPath(dt,moved);journeyTrackStop(dt,moved);journeyTrackSilence(dt,moved);journeyTrackCombat();journeyObserveNearby();journeyTrackPuzzle();
 r.stateScan+=dt;if(r.stateScan>=.55){r.stateScan=0;journeyScanState()}
 r.persist+=dt;if(r.persist>=45&&player.combat<=0&&!G.activeEvent){r.persist=0;journeyPersist()}
}

function journeyTick(dt){const r=JOURNEY.runtime;r.tickCarry=(r.tickCarry||0)+dt;if(r.tickCarry<.2)return;const step=r.tickCarry;r.tickCarry=0;journeyUpdate(step)}

function journeyOverlayOpen(kind){if(!JOURNEY.active||!JOURNEY.data)return;const r=JOURNEY.runtime;if(r.overlay)journeyOverlayClose('replaced');r.overlay={kind,started:performance.now()};if(kind==='map')JOURNEY.data.counters.mapOpens++;else if(kind==='quests')JOURNEY.data.counters.journalOpens++;else if(kind==='pause')JOURNEY.data.counters.pauseOpens++;journeyEvent('overlayOpen',{kind})}
function journeyOverlayClose(reason='close'){const r=JOURNEY.runtime;if(!r.overlay||!JOURNEY.data)return;const duration=(performance.now()-r.overlay.started)/1000;journeyPush(JOURNEY.data.overlays,{kind:r.overlay.kind,duration:journeyRound(duration),reason,t:journeyRound(journeyNow())},JOURNEY_LIMITS.overlays);journeyEvent('overlayClose',{kind:r.overlay.kind,duration:journeyRound(duration),reason});r.overlay=null}
function journeyDialogue(s,topic){if(!JOURNEY.active||!s)return;const id=s.npcId||s.name||'npc',key=topic?`${id}:${topic}`:id;if(!JOURNEY.data.dialogue[key])JOURNEY.data.dialogue[key]={npc:id,topic:topic||null,opens:0};JOURNEY.data.dialogue[key].opens++;journeyEvent(topic?'dialogueTopic':'dialogueOpen',{npc:id,topic:topic||null})}
function journeyWorldEventStart(evt){if(!JOURNEY.active||!evt)return;JOURNEY.data.counters.worldEvents++;journeyEvent('worldEventStart',{id:evt.id,eventType:evt.type,title:evt.title||''})}
function journeyWorldEventFinish(evt,reason){if(!JOURNEY.active||!evt)return;journeyEvent('worldEventFinish',{id:evt.id,eventType:evt.type,title:evt.title||'',reason});if(reason==='complete')journeyMeaningful('worldEvent',evt.type,evt.title||evt.type)}

function journeyTopHeat(limit=12){return Object.values(JOURNEY.data?.heat||{}).sort((a,b)=>b.seconds-a.seconds).slice(0,limit).map(v=>({...v,seconds:journeyRound(v.seconds)}))}
function journeyTopIgnored(limit=12){return Object.values(JOURNEY.data?.interests||{}).filter(v=>v.ignored>0).sort((a,b)=>b.ignored-a.ignored||b.exposures-a.exposures).slice(0,limit).map(v=>({...v,dwell:journeyRound(v.dwell)}))}
function journeyOpenThreads(){if(!G.started)return [];const out=[];for(const id of G.exploration?.known||[])if(!v3Solved(id))out.push({type:'puzzle',id,name:journeyName('puzzle',id)});const ls=typeof livingState==='function'?livingState():null;if(ls&&ls.mystery?.length>0&&!ls.mysteryResolved)out.push({type:'mystery',id:'fiveMarks',name:`As Cinco Marcas (${ls.mystery.length}/5)`});if(ls&&ls.keepsakes?.length>0&&ls.keepsakes.length<Object.keys(LIVING_KEEP_SAKES||{}).length)out.push({type:'pipoca',id:'keepsakes',name:`Coleção do Pipoca (${ls.keepsakes.length}/${Object.keys(LIVING_KEEP_SAKES).length})`});return out}
function journeyReport(includeRaw=true){
 if(!JOURNEY.data)return {build:BUILD_ID,active:false};const d=JOURNEY.data,puzzles=Object.values(d.puzzles),zoneRows=Object.entries(d.zones).map(([id,v])=>({id,seconds:journeyRound(v.seconds),distance:journeyRound(v.distance),entries:v.entries})),meaningfulRate=d.duration>0?d.counters.meaningful/(d.duration/600):0,interactionRate=d.counters.exposures?d.counters.interactions/d.counters.exposures:0;
 const summary={build:BUILD_ID,schema:JOURNEY_SCHEMA,active:JOURNEY.active,sessionId:d.sessionId,agentRunId:d.agentRunId||null,tester:d.tester||null,reloads:d.reloads||0,mode:d.mode,returning:d.mode==='continue',durationSeconds:journeyRound(d.duration),distance:journeyRound(d.distance),zonesVisited:zoneRows.filter(z=>z.entries>0).length,zoneStats:zoneRows,meaningfulMoments:d.counters.meaningful,meaningfulPer10Min:journeyRound(meaningfulRate,2),discoveries:d.counters.discoveries,interactions:d.counters.interactions,exposures:d.counters.exposures,ignored:d.counters.ignored,interactionRate:journeyRound(interactionRate*100,1),maxSilentSeconds:journeyRound(d.silence.maxSeconds),maxSilentDistance:journeyRound(d.silence.maxDistance),combatEncounters:d.counters.combatEncounters,deaths:d.deaths.length,puzzleAttempts:puzzles.reduce((n,p)=>n+p.attempts,0),puzzleSolves:puzzles.reduce((n,p)=>n+p.solves,0),puzzleAbandons:puzzles.reduce((n,p)=>n+p.abandons,0),worldEvents:d.counters.worldEvents,mapOpens:d.counters.mapOpens,journalOpens:d.counters.journalOpens,pauseOpens:d.counters.pauseOpens,topIgnored:journeyTopIgnored(),longestStops:[...d.stops].sort((a,b)=>b.duration-a.duration).slice(0,10),topHeat:journeyTopHeat(),pulls:[...d.pulls].sort((a,b)=>a.seconds-b.seconds).slice(0,20),openThreads:journeyOpenThreads(),previousSessions:[...JOURNEY.history]};
 return includeRaw?{summary,session:d}:summary;
}
function dSafeTester(){return JOURNEY.data?.tester?.id||JOURNEY_AGENT?.tester?.id||'player'}
function journeyFinalize(reason='agent-finish'){if(!JOURNEY.data)return null;journeyCloseExposure('finish');journeyOverlayClose('finish');JOURNEY.data.endedReason=reason;JOURNEY.data.endedAt=Date.now();JOURNEY.data.finishedAt=Date.now();JOURNEY.active=false;journeyPersist();return journeyReport(true)}
function journeyExport(){try{journeyPersist();const report=journeyReport(true),blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mare-brava-playtest-${dSafeTester()}-${JOURNEY.data?.agentRunId||JOURNEY.data?.sessionId||'session'}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);toast('Relatório de jornada exportado. Nenhum dado foi enviado pela internet.','gold');return true}catch(_){toast('Não foi possível exportar o relatório de playtest.','danger');return false}}
function journeyClear(){try{localStorage.removeItem(JOURNEY_STORAGE_KEY)}catch(_){}JOURNEY.history=[];JOURNEY.active=false;JOURNEY.data=null;if(G.started)journeyReset('manual-reset');return true}
function journeySelfTest(){const e=[];if(!JOURNEY.data)return e;if(JOURNEY.data.schema!==JOURNEY_SCHEMA)e.push('journey-schema');if(JOURNEY.data.path.length>JOURNEY_LIMITS.path)e.push('journey-path-limit');if(JOURNEY.data.events.length>JOURNEY_LIMITS.events)e.push('journey-event-limit');if(Object.values(JOURNEY.data.zones).some(v=>!Number.isFinite(v.seconds)||v.seconds<0))e.push('journey-zone-time');return e}

// Hooks não invasivos: o gameplay continua sendo a fonte de verdade.
const _journeyBasePrepareGameState=prepareGameState;
prepareGameState=function(data=null){const out=_journeyBasePrepareGameState(data);journeyReset(data?.ngPlus?.cycle>0&&!(data?.playTime>0)?'ngplus':data?'continue':'new');return out};
const _journeyBaseUpdate=update;
update=function(dt){_journeyBaseUpdate(dt);journeyTick(dt)};
const _journeyBaseInteract=interact;
interact=function(){const target=nearby;if(target)journeyInteraction(target);return _journeyBaseInteract()};
const _journeyBaseSetModal=setModal;
setModal=function(kind,content,compact=false){if(JOURNEY.active)journeyOverlayOpen(kind);return _journeyBaseSetModal(kind,content,compact)};
const _journeyBaseCloseOverlay=closeOverlay;
closeOverlay=function(){if(JOURNEY.active)journeyOverlayClose('close');return _journeyBaseCloseOverlay()};
const _journeyBaseShowNPC=showNPC;
showNPC=function(s,topic=null){journeyDialogue(s,topic);return _journeyBaseShowNPC(s,topic)};
const _journeyBaseStartDynamicEvent=startDynamicEvent;
startDynamicEvent=function(type=null){const evt=_journeyBaseStartDynamicEvent(type);if(evt)journeyWorldEventStart(evt);return evt};
const _journeyBaseFinishDynamicEvent=finishDynamicEvent;
finishDynamicEvent=function(reason='complete'){const evt=G.activeEvent;if(evt)journeyWorldEventFinish({...evt},reason);return _journeyBaseFinishDynamicEvent(reason)};
const _journeyBaseShowPause=showPause;
showPause=function(){_journeyBaseShowPause();const modal=$('modal'),footer=$('save-feedback');if(!modal||!footer)return;const r=journeyReport(false),box=document.createElement('div');box.className='playtest-card';box.id='journey-playtest-card';box.innerHTML=`<b>JORNADA DO PLAYTEST</b> · ${r.meaningfulMoments} momentos · silêncio máx. ${Math.round(r.maxSilentSeconds)} s · ${r.ignored} ignorados · puzzles ${r.puzzleSolves}/${r.puzzleAttempts}<div class="menu-stack" style="margin-top:9px"><button id="journey-export-btn" class="secondary">Exportar relatório de jornada <small>JSON · SOMENTE LOCAL</small></button></div>`;footer.before(box);$('journey-export-btn').onclick=journeyExport};

const _journeyBaseReturnTitle=returnTitle;
returnTitle=function(){if(JOURNEY.data){JOURNEY.data.endedReason='return-title';JOURNEY.data.endedAt=Date.now();journeyPersist()}return _journeyBaseReturnTitle()};

// Completa o self-test global sem alterar o schema do save.
const _journeyBaseRunSelfTest=runSelfTest;
runSelfTest=function(){const result=_journeyBaseRunSelfTest();const extra=journeySelfTest();if(extra.length){result.failures.push(...extra);result.ok=false}return result};

window.MareJourneyTelemetry={
 report:journeyReport,
 summary:()=>journeyReport(false),
 export:journeyExport,
 persist:journeyPersist,
 clear:journeyClear,
 reset:()=>journeyReset(G.started?'manual-reset':'new'),
 history:()=>[...JOURNEY.history],
 finalize:journeyFinalize,
 storageKey:()=>JOURNEY_STORAGE_KEY
};
addEventListener('pagehide',()=>journeyPersist());
