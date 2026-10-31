/* GD-028 — Final Player Experience Polish
   Pure UX/presentation layer. Save V7 is intentionally untouched. */
const FINAL_POLISH={
  version:1,
  lastRecapAt:-999,
  lastHealthHintAt:-999,
  lastSkillHintAt:-999,
  comboMilestone:0,
  previousCombat:0,
  previousOverlay:null,
  returningRecapShown:false,
  victorySummaryShown:false
};

function finalObjectiveLine(){
  if(!G?.started)return '';
  const target=questTarget?.();
  if(target)return `${target.name} · ${Math.max(0,Math.round(dist(player,target)/10))} m`;
  if(G.bossDefeated)return 'A ilha está livre · explore fios que ficaram abertos';
  if(G.seals?.length===3)return 'Recife Esquecido · enfrente Esponjão';
  return 'Recupere os três selos da ilha';
}

function finalShowObjectiveRecap(force=false){
  if(mobileRenderEnabled())return false;
  if(!G?.started||G.overlay||player?.combat>0||player?.hp<=0)return false;
  if(!force&&G.playTime-FINAL_POLISH.lastRecapAt<55)return false;
  const line=finalObjectiveLine();
  if(!line)return false;
  FINAL_POLISH.lastRecapAt=G.playTime;
  toast(`RUMO · ${line}`,'recap');
  return true;
}

function finalReturningRecap(){
  if(FINAL_POLISH.returningRecapShown||!G?.started||G.playTime<120)return;
  FINAL_POLISH.returningRecapShown=true;
  const zone=zoneAt(player.x,player.y);
  setTimeout(()=>{
    if(!G.started||G.overlay)return;
    toast(`DE VOLTA À MARÉ · Nv.${player.level} · ${G.seals.length}/3 selos · ${zone.name}`,'recap');
    setTimeout(()=>finalShowObjectiveRecap(true),1050);
  },950);
}

function finalCombatHeartbeat(){
  if(!G?.started||!player)return;
  const combat=player.combat||0;
  if(FINAL_POLISH.previousCombat>0&&combat<=0&&!G.overlay){
    const hpRatio=player.hp/Math.max(1,maxHP());
    if(hpRatio<.35&&player.potions>0&&G.playTime-FINAL_POLISH.lastHealthHintAt>90){
      FINAL_POLISH.lastHealthHintAt=G.playTime;
      setTimeout(()=>{if(G.started&&!G.overlay&&player.combat<=0)toast(`Você está ferido · ${player.potions} poção${player.potions===1?'':'ões'} disponível${player.potions===1?'':'is'}.`,'recap')},450);
    }else if(player.points>0&&G.playTime-FINAL_POLISH.lastSkillHintAt>180){
      FINAL_POLISH.lastSkillHintAt=G.playTime;
      setTimeout(()=>{if(G.started&&!G.overlay&&player.combat<=0)toast(`${player.points} ponto${player.points===1?'':'s'} de habilidade esperando uma decisão.`,'recap')},450);
    }
  }
  FINAL_POLISH.previousCombat=combat;

  const combo=player.comboStep||0;
  if(combo<1)FINAL_POLISH.comboMilestone=0;
  if(combo>=2&&FINAL_POLISH.comboMilestone<2){
    FINAL_POLISH.comboMilestone=2;
    text(player.x,player.y-70,'RITMO ×2','#ffe0a0',12);
  }
  if(combo>=3&&FINAL_POLISH.comboMilestone<3){
    FINAL_POLISH.comboMilestone=3;
    text(player.x,player.y-76,'MARÉ DE AÇO ×3','#fff0b7',13);
    if(typeof sound==='function')sound('perfect',.8);
  }
}

function finalInjectVictorySummary(){
  if(FINAL_POLISH.victorySummaryShown)return;
  const stats=document.querySelector('#modal .result-stats');
  if(!stats)return;
  FINAL_POLISH.victorySummaryShown=true;
  const box=document.createElement('div');
  box.className='final-run-summary';
  const mini=G.minibosses?.length||0,secrets=G.secrets?.length||0,deaths=G.deathCount||0,chests=G.chests?.length||0;
  box.innerHTML=`<span><b>${mini}</b> minibosses</span><span><b>${secrets}</b> segredos</span><span><b>${chests}</b> baús</span><span><b>${deaths}</b> quedas</span>`;
  stats.insertAdjacentElement('afterend',box);
}

// Keep the existing start behavior, then add a compact returning-player recap.
if(typeof finalizeGameStart==='function'){
  const _finalizeGameStart=finalizeGameStart;
  finalizeGameStart=function(data=null){
    const out=_finalizeGameStart(data);
    FINAL_POLISH.returningRecapShown=false;
    FINAL_POLISH.victorySummaryShown=false;
    FINAL_POLISH.previousCombat=0;
    FINAL_POLISH.comboMilestone=0;
    if(data)finalReturningRecap();
    return out;
  };
}

// When the player closes a navigation-heavy overlay, gently restore orientation.
if(typeof closeOverlay==='function'){
  const _closeOverlay=closeOverlay;
  closeOverlay=function(){
    const prev=G?.overlay;
    const out=_closeOverlay();
    if(G?.started&&['pause','map','quests','skills','equipment','achievements'].includes(prev)){
      setTimeout(()=>finalShowObjectiveRecap(false),360);
    }
    return out;
  };
}

// Preserve the existing victory screen and enrich it with run-memory stats.
if(typeof showVictory==='function'){
  const _showVictory=showVictory;
  showVictory=function(){
    FINAL_POLISH.victorySummaryShown=false;
    const out=_showVictory();
    finalInjectVictorySummary();
    return out;
  };
}

let finalPolishRaf=0;
function finalPolishTick(){
  try{finalCombatHeartbeat()}catch(_){/* presentation must never break gameplay */}
  finalPolishRaf=requestAnimationFrame(finalPolishTick);
}
finalPolishRaf=requestAnimationFrame(finalPolishTick);

function finalPolishSelfTest(){
  const failures=[];
  if(BUILD_ID!=='4.2-world5-gd028-final-player-experience')failures.push('build');
  if(CURRENT_SAVE_VERSION!==7)failures.push('save-version');
  if(typeof finalObjectiveLine!=='function')failures.push('objective-recap');
  if(typeof finalInjectVictorySummary!=='function')failures.push('victory-summary');
  if(!FINAL_POLISH||FINAL_POLISH.version!==1)failures.push('state');
  return {ok:failures.length===0,failures,version:FINAL_POLISH.version};
}
window.MareFinalPolish={report:()=>({version:FINAL_POLISH.version,lastRecapAt:FINAL_POLISH.lastRecapAt,comboMilestone:FINAL_POLISH.comboMilestone}),selfTest:finalPolishSelfTest,objective:finalObjectiveLine};
