'use strict';
// GD-026 — Quest Flow & NPC Personality + Progression/Rewards/Build Diversity + Boss/Miniboss Quality.
// Save V7 permanece intacto: novas recompensas usam os slots já existentes e IDs reconhecidos por EQUIPMENT_DEFS.

const GD026={
 metrics:{questStarts:0,questSteps:0,questCompletions:0,arcCompletions:0,synergyHits:0,hybridProcs:0,minibossPhases:0,minibossMasteryBreaks:0,minibossRewards:0,bossRecoveryWindows:0},
 miniPhaseSeen:new Set(),rewardSeen:new Set()
};

const NPC_VOICE={
 nena:{tag:'NENA',start:'Não precisa acreditar no mapa. Só volte com algo que faça ele parar de mentir.',done:'Ótimo. Agora tenho um erro a menos no papel e três perguntas novas.'},
 damiao:{tag:'DAMIÃO',start:'Vai com calma. Mar não gosta de gente com pressa e eu gosto menos ainda de buscar gente molhada.',done:'Eu sabia que tinha história aí. Só esperava uma história com menos dentes.'},
 ivo:{tag:'IVO',start:'Olha antes de bater, puxa antes de forçar e, se quebrar, pelo menos me traz as peças.',done:'Agora isso parece problema de ferreiro. Finalmente alguma coisa civilizada.'},
 mara:{tag:'MARA',start:'Resolve isso e volta inteiro. Essa segunda parte não é opcional.',done:'Bom. Menos um problema fazendo barulho perto da minha fogueira.'}
};

// Recompensas de miniboss passam a criar escolhas reais de equipamento, não só moedas/XP.
Object.assign(EQUIPMENT_DEFS,{
 storm_hook:{name:'Fecho do Vendaval',slot:'tool',icon:'hook',desc:'Gancho de combate: +55 de alcance, recarga 10% menor e +12% de dano de gancho/puxada. Não substitui as argolas especiais do Gancho do Navegador.'},
 spore_boots:{name:'Botas de Micélio Seco',slot:'boots',icon:'dash',desc:'Reduz em 35% o dano de esporos. Uma escolha defensiva para áreas contaminadas, em troca da mobilidade das Botas Encharcadas.'},
 split_ring:{name:'Anel da Luz Fendida',slot:'ring',icon:'bird',desc:'Esquiva perfeita arma Pipoca: o próximo impacto dele causa +35% de dano.'},
 rust_coat:{name:'Casaco de Placas Ferrugem',slot:'coat',icon:'shield',desc:'Reduz em 22% dano de projéteis. Proteção constante à distância, em vez do bloqueio periódico do Casaco de Mara.'},
 salt_ring:{name:'Anel da Mandíbula de Sal',slot:'ring',icon:'sword',desc:'Abates corpo a corpo próximos recuperam 12 de stamina e aceleram o gancho. Recompensa jogar no meio da confusão.'}
});
const MINIBOSS_REWARD_ITEMS={galeShell:'storm_hook',hollowKing:'spore_boots',splitLight:'split_ring',rustRam:'rust_coat',saltJaw:'salt_ring'};
if(QUEST_DEFS.damiao_teeth?.reward)QUEST_DEFS.damiao_teeth.reward.points=Math.max(1,QUEST_DEFS.damiao_teeth.reward.points||0);
MINIBOSS_DEFS.galeShell.stinger='VENTO CONTRÁRIO · GANCHO OU CARGA QUEBRAM A GUARDA';
MINIBOSS_DEFS.hollowKing.stinger='FLORAÇÃO AZEDA · INTERROMPA OS ESPOROS';
MINIBOSS_DEFS.splitLight.stinger='ECO PARTIDO · PRENDA O TELEPORTE';
MINIBOSS_DEFS.rustRam.stinger='FOGO CRUZADO · PUNA A RECARGA';
MINIBOSS_DEFS.saltJaw.stinger='BANDO DE SAL · SEPARE A MATILHA';

function gd026Reset(){for(const k of Object.keys(GD026.metrics))GD026.metrics[k]=0;GD026.miniPhaseSeen.clear();GD026.rewardSeen.clear()}
function gd026BranchRanks(){return {cordame:(player?.skills?.line||0)+(player?.skills?.harpoon||0),asas:(player?.skills?.bird||0)+(player?.skills?.rain||0),instinto:(player?.skills?.vigor||0)+(player?.skills?.agility||0)}}
function gd026Synergies(){const r=gd026BranchRanks();return {cordame:r.cordame>=4,asas:r.asas>=4,instinto:r.instinto>=4,cordameAsas:r.cordame>=2&&r.asas>=2,cordameInstinto:r.cordame>=2&&r.instinto>=2,asasInstinto:r.asas>=2&&r.instinto>=2,ranks:r}}
function gd026RewardName(q){const reward=[];if(q?.reward?.xp)reward.push(q.reward.xp+' XP');if(q?.reward?.coins)reward.push(q.reward.coins+' ouro');if(q?.reward?.points)reward.push('+'+q.reward.points+' ponto');if(q?.reward?.item)reward.push(EQUIPMENT_DEFS[q.reward.item]?.name||q.reward.item);return reward.join(' · ')}
function gd026QuestVoice(id,kind='start'){const q=QUEST_DEFS[id],v=NPC_VOICE[q?.giver];return v?.[kind]||''}
function gd026QuestChanged(id,before){const st=G.quests[id];if(!st)return;if(st.status==='done'&&before?.status!=='done'){GD026.metrics.questCompletions++;const q=QUEST_DEFS[id],v=NPC_VOICE[q.giver];if(v){toast(v.tag+': “'+v.done+'”','gold')}const giverDone=completedQuestCount(q.giver),giverTotal=questsForGiver(q.giver).length;if(giverDone===giverTotal){GD026.metrics.arcCompletions++;toast((NPC_DEFS[q.giver]?.name||'Mara')+' · arco concluído.','gold')}}else if(st.status==='active'&&st.step!==(before?.step??st.step)){GD026.metrics.questSteps++;const obj=questObjective(id);if(obj)toast('PRÓXIMO PASSO · '+obj.text,'gold')}}

const _gd026StartQuest=startQuest;
startQuest=function(id){const ok=_gd026StartQuest(id);if(ok){GD026.metrics.questStarts++;const q=QUEST_DEFS[id],v=NPC_VOICE[q.giver],line=gd026QuestVoice(id,'start');if(v&&line)toast(v.tag+': “'+line+'”');const obj=questObjective(id);if(obj)setTimeout(()=>{if(G.started&&G.quests[id]?.status==='active')toast('AGORA · '+obj.text,'gold')},250);saveGame()}return ok};

const _gd026QuestEvent=questEvent;
questEvent=function(type,data={}){const before=Object.fromEntries(activeQuests().map(id=>[id,{status:G.quests[id].status,step:G.quests[id].step}]));const r=_gd026QuestEvent(type,data);for(const [id,b] of Object.entries(before))gd026QuestChanged(id,b);return r};

const _gd026CompleteQuest=completeQuest;
completeQuest=function(id){const before=G.quests[id]?{...G.quests[id]}:null;const ok=_gd026CompleteQuest(id);if(ok&&before?.status!=='done'){const q=QUEST_DEFS[id],next=availableQuestForGiver(q.giver);if(next)setTimeout(()=>toast((NPC_DEFS[q.giver]?.name||'Mara')+' ainda tem outra história quando você quiser.','gold'),450)}return ok};

// Personalidade: a informação continua a mesma, mas cada pessoa fala com cadência própria.
const _gd026NpcMood=npcMoodLine;
npcMoodLine=function(id){
 const active=activeQuestForGiver(id);if(active){const obj=questObjective(active[0]);if(id==='nena')return obj?.type==='talk'?'Voltou com alguma coisa que faça sentido no papel? Ótimo. Eu já tinha começado a desconfiar do papel.':'Se o terreno contradizer meu mapa, acredite no terreno. Depois venha me contar exatamente onde ele me humilhou.';
 if(id==='damiao')return obj?.type==='talk'?'Conta logo. Se tiver sino, dente ou água fazendo coisa estranha, eu quero a versão curta primeiro.':'Se for entrar na água, olha duas vezes. Se alguma coisa olhar de volta, já olhou uma vez demais.';
 if(id==='ivo')return obj?.type==='talk'?'Mostra. Metal deixa marca quando mente, diferente de gente.':'Não luta contra a peça. Descobre onde ela trava e faz o problema trabalhar para você.'}
 return _gd026NpcMood(id)
};
const _gd026NpcResponse=npcResponse;
npcResponse=function(id,topic){
 if(topic==='bird'){if(id==='nena')return 'Pipoca pousou em três mapas hoje. Em dois ele virou referência geográfica. No terceiro eu desisti.';if(id==='damiao')return 'Ele roubou minha isca, assustou os peixes e voltou orgulhoso. Tecnicamente, eficiência impressionante.';if(id==='ivo')return 'Bicou a bigorna de novo. A bigorna segue invicta. Pipoca discorda do resultado.'}
 if(id==='nena'&&topic==='island')return G.seals.length===3?'Agora todos os meus traços terminam no Recife. Quando mapas diferentes concordam assim, eu começo a me preocupar.':'A ilha não muda de lugar inteira. Ela muda pequenas certezas. É por isso que eu marco pedra, vento e ruína — coisas que têm menos opinião.';
 if(id==='damiao'&&topic==='reef')return 'Recife bom tem corrente previsível. Este aqui parece que acorda de mau humor e decide redesenhar a costa.';
 if(id==='ivo'&&topic==='combat')return 'Golpe forte não é golpe lento. É golpe dado quando o outro não pode responder. Se abriu guarda, cobra a dívida.';
 return _gd026NpcResponse(id,topic)
};

// Build diversity: especialização dá identidade; híbridos criam combinações, sem apagar os estilos puros.
const _gd026HookRange=hookRange;hookRange=function(){let v=_gd026HookRange();if(equipped('storm_hook'))v+=55;return v};
const _gd026HookCooldown=hookCooldown;hookCooldown=function(){let v=_gd026HookCooldown();if(equipped('storm_hook'))v*=.90;const s=gd026Synergies();if(s.cordame)v*=.94;return Math.max(.48,v)};

const _gd026PerfectDodge=triggerPerfectDodge;
triggerPerfectDodge=function(from){const ok=_gd026PerfectDodge(from);if(ok){const s=gd026Synergies();if(s.cordameInstinto){player.hookCD=Math.max(0,player.hookCD-.55);GD026.metrics.hybridProcs++}if(s.asasInstinto&&bird){bird.manualCD=Math.max(0,bird.manualCD-1.4);player._gd026BirdTempo=4;GD026.metrics.hybridProcs++}if(equipped('split_ring'))player._gd026SplitCharge=1}return ok};
const _gd026TryParry=tryParry;
tryParry=function(from){const ok=_gd026TryParry(from);if(ok){const s=gd026Synergies();if(s.cordameInstinto){player.hookCD=Math.max(0,player.hookCD-.65);GD026.metrics.hybridProcs++}}return ok};

const _gd026HurtPlayer=hurtPlayer;
hurtPlayer=function(amount,from=null){if(equipped('spore_boots')&&from?.type==='spore')amount*=.65;if(equipped('rust_coat')&&['bubble','spit'].includes(from?.type))amount*=.78;return _gd026HurtPlayer(amount,from)};

function gd026MiniMastery(e,source){if(!e?.miniBossId||e.dead)return 1;let m=1,breakIt=false;
 if(e.miniBossId==='galeShell'&&e.guard>0&&['charged','hook','pull'].includes(source)){m=1.16;breakIt=true}
 else if(e.miniBossId==='hollowKing'&&e.strikePending==='mushroomSpore'&&['charged','hook','pull'].includes(source)){m=1.14;breakIt=true}
 else if(e.miniBossId==='splitLight'&&['hook','pull'].includes(source)){m=1.12;breakIt=true}
 else if(e.miniBossId==='rustRam'&&e.recover>0&&['sword','combo3','charged'].includes(source)){m=1.18;breakIt=true}
 else if(e.miniBossId==='saltJaw'&&(e.packBoost||1)<=1&&['sword','combo3','charged','hook','pull'].includes(source)){m=1.16;breakIt=true}
 if(breakIt&&(e._gd026MasteryCue||0)<=G.playTime){e._gd026MasteryCue=G.playTime+.8;GD026.metrics.minibossMasteryBreaks++;text(e.x,e.y-e.r-50,'LEITURA CERTA','#ffe2a0',10)}return m}

const _gd026DamageEnemy=damageEnemy;
damageEnemy=function(e,amount,source,critical=false,strong=false){
 const s=gd026Synergies();let mult=1;
 if(['hook','pull'].includes(source)&&s.cordame)mult*=1.12;
 if(source==='poop'&&s.asas)mult*=1.10;
 if((player.counterWindow||0)>0&&combatMeleeSource(source)&&s.instinto)mult*=1.12;
 if(['hook','pull'].includes(source)&&s.cordameAsas&&e&&!e.dead){e._gd026HookMarkUntil=G.playTime+3.2}
 if(source==='poop'&&e?._gd026HookMarkUntil>G.playTime){mult*=1.22;e._gd026HookMarkUntil=0;GD026.metrics.hybridProcs++;text(e.x,e.y-e.r-48,'MARCA + PIPOCA','#f4e3a8',9)}
 if(source==='poop'&&player._gd026BirdTempo>0){mult*=1.20;player._gd026BirdTempo=0;GD026.metrics.hybridProcs++}
 if(source==='poop'&&player._gd026SplitCharge>0){mult*=1.35;player._gd026SplitCharge=0;text(e.x,e.y-e.r-49,'LUZ FENDIDA','#cfe8dc',9)}
 if(equipped('storm_hook')&&['hook','pull'].includes(source))mult*=1.12;
 mult*=gd026MiniMastery(e,source);
 if(mult>1.001)GD026.metrics.synergyHits++;
 return _gd026DamageEnemy(e,amount*mult,source,critical,strong)
};

function gd026MiniPhase(e){if(!e?.miniBossId||e.dead||e._gd026Phase2||e.hp/e.maxHp>.55)return;e._gd026Phase2=true;GD026.metrics.minibossPhases++;GD026.miniPhaseSeen.add(e.miniBossId);const id=e.miniBossId;
 if(id==='galeShell'){e.guard=Math.max(e.guard,1.8);e.guardAngle=angle(e,player);e.speed*=1.06;text(e.x,e.y-e.r-48,'VENTO CONTRÁRIO','#f1d8a0',11)}
 else if(id==='hollowKing'){for(let i=0;i<4;i++){const a=i/4*TAU;addHazard('spore',e.x+Math.cos(a)*72,e.y+Math.sin(a)*56,48,.28+i*.08,Math.max(2,Math.round(e.damage*.4)),e,{life:3.4,tick:.25})}e.recover=.65;text(e.x,e.y-e.r-48,'FLORAÇÃO AZEDA','#dbbfd4',11)}
 else if(id==='splitLight'){for(let i=0;i<2;i++){let a=(i?.65:-.65)+angle(player,e),x=e.x+Math.cos(a)*55,y=e.y+Math.sin(a)*55;spawnEnemy('wisp',x,y,Math.max(1,e.level-1),{hp:32,damage:Math.max(4,e.damage*.55),speed:118,xp:0,noRespawn:true,aggro:true,mini:true,gd026MiniParent:id,name:'Eco de Luz'})}e.phaseShift=1;text(e.x,e.y-e.r-48,'ECO PARTIDO','#c5e3db',11)}
 else if(id==='rustRam'){const a=angle(e,player);enemyShot(e,a-.22,260,'spit');enemyShot(e,a,285,'spit');enemyShot(e,a+.22,260,'spit');e.recover=.72;text(e.x,e.y-e.r-48,'CANOS EM BRASA','#edc27b',11)}
 else if(id==='saltJaw'){for(let i=0;i<2;i++){const a=i?1.1:-1.1;spawnEnemy('sponge',e.x+Math.cos(a)*62,e.y+Math.sin(a)*54,Math.max(2,e.level-1),{hp:38,xp:0,noRespawn:true,aggro:true,mini:true,gd026MiniParent:id,name:'Cria de Sal'})}text(e.x,e.y-e.r-48,'CHAMADO DA MATILHA','#ead88d',11)}
 burst(e.x,e.y,'#ead399',22,140);sound('boss')
}
const _gd026UpdateSmartEnemy=updateSmartEnemy;
updateSmartEnemy=function(e,dt,d,homeD){gd026MiniPhase(e);return _gd026UpdateSmartEnemy(e,dt,d,homeD)};

const _gd026ResolveBossAttack=resolveBossAttack;
resolveBossAttack=function(e,kind){const r=_gd026ResolveBossAttack(e,kind);if(!e||e.dead)return r;const windows={mossCrown:.52,mireTide:.38,bronzeRush:.66,sealStorm:.44,undertow:.30,summon:.25};const w=windows[kind]||0;if(w){e.recover=Math.max(e.recover||0,w);if(['mossCrown','bronzeRush','sealStorm'].includes(kind)){e.vulnerable=Math.max(e.vulnerable||0,w+.18);text(e.x,e.y-e.r-54,kind==='bronzeRush'?'INVESTIDA ABERTA':kind==='mossCrown'?'COROA EXPOSTA':'RECUPERANDO','#ffe1a0',9);GD026.metrics.bossRecoveryWindows++}}return r};

const _gd026ResetElite=resetEliteEnemy;
resetEliteEnemy=function(e,reason='reset'){const id=e?.miniBossId;const r=_gd026ResetElite(e,reason);if(r&&id){e._gd026Phase2=false;e._gd026MasteryCue=0;enemies.filter(n=>!n.dead&&n.gd026MiniParent===id).forEach(n=>n.dead=true)}return r};

const _gd026KillEnemy=killEnemy;
killEnemy=function(e){const wasMini=e?.miniBossId&&!e.dead?e.miniBossId:null;const nearby=player&&e?dist(player,e):999;const meleeKill=e&&['sword','combo3','charged','hook','pull'].includes(e._gd026LastSource||'');const r=_gd026KillEnemy(e);if(wasMini){enemies.filter(n=>!n.dead&&n.gd026MiniParent===wasMini).forEach(n=>n.dead=true);const item=MINIBOSS_REWARD_ITEMS[wasMini];if(item&&!hasItem(item)){grantEquipment(item,true);GD026.metrics.minibossRewards++;GD026.rewardSeen.add(item);toast('ESPÓLIO ÚNICO · '+EQUIPMENT_DEFS[item].name,'gold');sound('level')}}if(equipped('salt_ring')&&nearby<120&&meleeKill){player.stamina=Math.min(100,player.stamina+12);player.hookCD=Math.max(0,player.hookCD-.3);text(player.x,player.y-56,'FOME DE SAL','#e8d49b',9)}return r};

// Registra a fonte final para recompensas de abate corpo a corpo.
const _gd026DamageEnemyTracked=damageEnemy;
damageEnemy=function(e,amount,source,critical=false,strong=false){if(e&&!e.dead)e._gd026LastSource=source;return _gd026DamageEnemyTracked(e,amount,source,critical,strong)};

// Exibe ressonâncias ativas junto da árvore, para o jogador saber por que a build se comporta diferente.
const _gd026ShowSkills=showSkills;
showSkills=function(){_gd026ShowSkills();const modal=$('modal');if(!modal)return;const s=gd026Synergies(),active=[];if(s.cordame)active.push('CORDAME · gancho/puxada +12% e recarga melhor');if(s.asas)active.push('ASAS · Pipoca +10% dano');if(s.instinto)active.push('INSTINTO · contra-ataques +12%');if(s.cordameAsas)active.push('CORDAME + ASAS · gancho marca o alvo para Pipoca');if(s.cordameInstinto)active.push('CORDAME + INSTINTO · timing acelera o gancho');if(s.asasInstinto)active.push('ASAS + INSTINTO · esquiva perfeita prepara Pipoca');const box=document.createElement('div');box.className='playtest-card';box.innerHTML='<b>RESSONÂNCIAS DA BUILD</b><br>'+(active.length?active.join('<br>'):'Invista em 4 pontos de um ramo para especializá-lo, ou 2 + 2 em dois ramos para abrir uma sinergia híbrida.');modal.appendChild(box)};

const _gd026Prepare=prepareGameState;
prepareGameState=function(data=null){gd026Reset();const r=_gd026Prepare(data);return r};

const _gd026Report=playtestReport;
playtestReport=function(){const r=_gd026Report();return {...r,gd026:{metrics:{...GD026.metrics},miniPhases:[...GD026.miniPhaseSeen],rewards:[...GD026.rewardSeen],build:gd026Synergies()}}};

const _gd026SelfTest=runSelfTest;
runSelfTest=function(){const r=_gd026SelfTest(),f=[...(r.failures||[])];for(const id of Object.values(MINIBOSS_REWARD_ITEMS))if(!EQUIPMENT_DEFS[id])f.push('gd026-reward:'+id);if((QUEST_DEFS.damiao_teeth?.reward?.points||0)<1)f.push('gd026-damiao-reward');if(!MINIBOSS_DEFS.galeShell.stinger.includes('GANCHO'))f.push('gd026-mini-stinger');return {...r,ok:f.length===0,failures:f}};

window.MareGD026={report:()=>({metrics:{...GD026.metrics},miniPhases:[...GD026.miniPhaseSeen],rewards:[...GD026.rewardSeen],build:gd026Synergies()}),reset:gd026Reset,synergies:gd026Synergies,miniPhase:gd026MiniPhase};
