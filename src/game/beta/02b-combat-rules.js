// Combat rules are shared by gameplay, menus, deterministic tests and balance simulations.
Object.assign(BALANCE,{
 levelUpHeal:.18,healthRegen:0,
 player:{hp:120,hpLevel:3,damage:20,damageLevel:.55,weaponDamage:4,attributeCap:20,attributeSoftCap:8},
 stamina:{max:100,regen:22,delay:.38,combo3:7,charged:21,dash:25,parry:12},
 attacks:{combo:[null,{cd:.31,anim:.21,range:76,arc:1.22,mult:1,knock:10},{cd:.34,anim:.23,range:82,arc:1.3,mult:1.1,knock:14},{cd:.48,anim:.29,range:92,arc:1.42,mult:1.34,knock:27}],chargedMin:1.6,chargedExtra:.55,critical:1.5,conditionalCap:2.25,vulnerable:1.25,counter:1.20,crit:{sword:.05,combo3:.08,charged:.10,hook:.03,pull:.03,poop:.02,execution:1}},
 posture:{delay:2,regen:.12,reset:.45,immunity:2.2,controlImmunity:1.1,impact:{sword:8,combo3:22,charged:38,hook:22,pull:28,poop:18,crate:35,execution:40,parry:46},limits:{common:60,tank:90,veteran:110,mini:170,guardian:250,boss:360},breakTime:{common:1.4,tank:1.4,veteran:1.15,mini:1,guardian:.8,boss:.65}},
 enemies:{hpLevel:.085,damageLevel:.65,veteranHp:3.6,veteranDamage:1.15,hp:{slime:160,crab:280,bandit:175,mushroom:170,wisp:145,sponge:165},damage:{slime:14,crab:17,bandit:15,mushroom:15,wisp:14,sponge:16}},
 guardians:{hp:{moss:3600,mire:4200,bronze:4800},damage:{moss:25,mire:28,bronze:31}},
 boss:{hp:10000,damage:34,recovery:{mossCrown:.9,mireTide:.7,bronzeRush:1.15,sealStorm:.85,undertow:.65,summon:.6}},
 progressionRpg:{campaignTalents:12,ngTalents:2,maxTalents:22,respec:30,specFee:20},
 healing:{charges:4,fraction:.42,animation:.65,cooldown:4.5,outOfCombatDelay:8,regen:1.2},
 ngPlus:{hp:.055,damage:.025,speed:.012,levelHp:.035,levelDamage:.015,windupFloor:.38,extraTokenCycle:3}
});
BALANCE.combat.counterBonus=BALANCE.attacks.counter;
BALANCE.combat.vulnerableBonus=BALANCE.attacks.vulnerable;
const RPG_BRANCHES={cordame:['line','harpoon'],asas:['bird','rain'],instinto:['vigor','agility']};
const RPG_ATTRIBUTES={strength:'Força',vitality:'Vitalidade',agility:'Agilidade',technique:'Técnica'};
// Each branch contains two existing foundations and eight new choices (10 talents).
const RPG_TALENTS=[
 ['cordame','tension','Tensão',1,'Gancho e puxada: +20% postura.'],['cordame','reach','Linha longa',1,'Gancho: +45 alcance.'],
 ['cordame','reel','Recolher',2,'Puxada: +15% dano.'],['cordame','anchor','Âncora',2,'Alvo preso recebe +10% postura.'],
 ['cordame','finisher','Nó final',2,'Espada em alvo recém-puxado: +15% dano.'],['cordame','weight','Lastro',3,'Carregado: +20% postura.'],
 ['cordame','breaker','Quebra-casco',3,'Especialização: gancho +30% postura.','cordameSpec'],['cordame','sailor','Marinheiro',3,'Especialização: gancho recarrega 15% mais rápido.','cordameSpec'],
 ['asas','wings','Asas largas',1,'Pipoca: +25 alcance.'],['asas','dust','Poeira',1,'Pipoca: +10 raio.'],
 ['asas','mark','Marca aérea',2,'Pipoca marca por 3s; espada detona +20% dano.'],['asas','opportunity','Oportunista',2,'Pipoca preparada: +10% dano.'],
 ['asas','flock','Bando',2,'Pipoca: +15% postura.'],['asas','rhythm','Ritmo aéreo',3,'Pipoca manual recarrega 12% mais rápido.'],
 ['asas','storm','Tempestade',3,'Especialização: Pipoca +15% dano e +15 raio.','asasSpec'],['asas','scout','Batedor',3,'Especialização: marca dura 5s; detona +30% dano.','asasSpec'],
 ['instinto','breath','Fôlego',1,'Regeneração de energia +2/s.'],['instinto','edge','Fio',1,'Espada: +2% crítico.'],
 ['instinto','riposte','Riposta',2,'Após parry: crítico +8% e dano +8%.'],['instinto','step','Passo ofensivo',2,'Ataque até .5s após esquiva: +10% dano.'],
 ['instinto','precision','Precisão',2,'Crítico contra vulnerável: +4%.'],['instinto','resolve','Resolução',3,'Parry devolve +3 energia.'],
 ['instinto','duelist','Duelista',3,'Especialização: contra-ataque +12% dano.','instintoSpec'],['instinto','survivor','Sobrevivente',3,'Especialização: +10% vida e -5% dano recebido.','instintoSpec']
].map(([branch,id,name,tier,desc,exclusive])=>({branch,id,name,tier,desc,exclusive}));
const RPG_ITEMS={
 navigator_hook:{branch:'Cordame',stats:{hook:2,posture:.04},effect:'Gancho +90 alcance e ancoragem.'},
 wet_boots:{branch:'Instinto',stats:{stamina:4},effect:'Resiste a lentidão; movimento +9% na chuva.'},
 mara_coat:{branch:'Instinto',stats:{hp:12},effect:'Primeiro impacto reduzido em 42%; recarga 12s.'},
 coral_ring:{branch:'Cordame / Instinto',stats:{crit:.01},effect:'Esquiva perfeita libera onda e reduz recarga do gancho.'},
 undertow_ring:{branch:'Instinto',stats:{counter:.03},effect:'Parry prepara carregado sem custo por 3s.'},
 storm_hook:{branch:'Cordame',stats:{hook:3},effect:'Gancho +55 alcance, recarga -10%, dano +12%.'},
 spore_boots:{branch:'Asas',stats:{stamina:5},effect:'Esporos causam 35% menos dano.'},
 split_ring:{branch:'Asas / Instinto',stats:{bird:2},effect:'Esquiva perfeita prepara Pipoca +35% por 4s.'},
 rust_coat:{branch:'Cordame',stats:{hp:10},effect:'Projéteis causam 22% menos dano.'},
 salt_ring:{branch:'Instinto / Cordame',stats:{damage:1},effect:'Abate próximo de espada/gancho devolve 12 energia e .3s de gancho.'}
};
function rpgState(p=player){if(!p.rpg)p.rpg={version:1,attributes:{strength:0,vitality:0,agility:0,technique:0},talents:[],swordSpec:null,respecs:0};return p.rpg}
function rpgTalent(id,p=player){return rpgState(p).talents.includes(id)}
function rpgAttribute(id,p=player){const n=rpgState(p).attributes[id]||0;return Math.min(n,8)+Math.max(0,n-8)*.4}
function rpgItemStat(id){let v=0;for(const item of Object.values(G.equipment||{}))v+=RPG_ITEMS[item]?.stats[id]||0;return v}
function rpgMaxHp(p=player){return Math.round((BALANCE.player.hp+(p.level-1)*BALANCE.player.hpLevel+rpgAttribute('vitality',p)*7+p.skills.vigor*9+(p===player?rpgItemStat('hp'):0))*(rpgTalent('survivor',p)?1.1:1))}
function rpgAttackPower(p=player){return BALANCE.player.damage+(p.level-1)*BALANCE.player.damageLevel+p.weapon*BALANCE.player.weaponDamage+rpgAttribute('strength',p)*1.35+(p===player?rpgItemStat('damage'):0)}
function maxStamina(){return BALANCE.stamina.max+rpgAttribute('agility')*1.5+rpgItemStat('stamina')}
function rpgStaminaRegen(){return BALANCE.stamina.regen+rpgAttribute('agility')*.6+(rpgTalent('breath')?2:0)}
function rpgSpend(cost){if(player.stamina<cost)return false;player.stamina-=cost;player.staminaDelay=BALANCE.stamina.delay;RPG_METRICS.staminaSpent+=cost;return true}
function rpgTalentLimit(p=player,cycle=ngCycle()){return Math.min(BALANCE.progressionRpg.maxTalents,BALANCE.progressionRpg.campaignTalents+cycle*BALANCE.progressionRpg.ngTalents)}
function rpgSpent(p=player){return Object.values(p.skills).reduce((a,b)=>a+b,0)+rpgState(p).talents.length}
function rpgBranchSpent(branch,p=player){return RPG_BRANCHES[branch].reduce((n,id)=>n+p.skills[id],0)+RPG_TALENTS.filter(t=>t.branch===branch&&rpgTalent(t.id,p)).length}
function rpgCanLearn(id){const t=RPG_TALENTS.find(t=>t.id===id);if(!t||rpgTalent(id)||player.points<1||rpgSpent()>=rpgTalentLimit())return false;if(rpgBranchSpent(t.branch)<(t.tier-1)*2)return false;return !t.exclusive||!RPG_TALENTS.some(o=>o.exclusive===t.exclusive&&rpgTalent(o.id))}
function rpgLearn(id){if(!rpgCanLearn(id))return false;rpgState().talents.push(id);player.points--;return true}
function rpgAttributeBudget(p=player){return Math.min(60,Math.max(0,p.level-1))}
function rpgRaiseAttribute(id){const s=rpgState(),used=Object.values(s.attributes).reduce((a,b)=>a+b,0);if(!Object.hasOwn(RPG_ATTRIBUTES,id)||used>=rpgAttributeBudget()||s.attributes[id]>=BALANCE.player.attributeCap)return false;s.attributes[id]++;player.hp=Math.min(player.hp,maxHP());return true}
function rpgRespec(){const s=rpgState(),fee=s.respecs?BALANCE.progressionRpg.respec:0;if(!G.seals.length&&player.level<5||player.combat>0||dist(player,HOME)>180||player.coins<fee)return false;player.coins-=fee;player.points+=rpgSpent();for(const k in player.skills)player.skills[k]=0;s.talents=[];for(const k in s.attributes)s.attributes[k]=0;s.respecs++;player.hp=Math.min(player.hp,maxHP());player.stamina=Math.min(player.stamina,maxStamina());return true}
function rpgSwordSpec(id){if(player.weapon<3||!['chain','heavy','counter'].includes(id)||player.combat>0||dist(player,HOME)>180)return false;const s=rpgState(),fee=s.swordSpec?BALANCE.progressionRpg.specFee:0;if(player.coins<fee)return false;player.coins-=fee;s.swordSpec=id;return true}
function rpgCleanPlayer(p,raw,cycle=0){const finite=(v,max)=>Number.isFinite(v)?clamp(Math.floor(v),0,max):0;const s=rpgState(p),old=raw.rpg;let excess=Math.max(0,rpgSpent(p)-rpgTalentLimit(p,cycle));if(excess){for(const id of ['agility','vigor','rain','bird','harpoon','line']){const refund=Math.min(excess,p.skills[id]);p.skills[id]-=refund;p.points+=refund;excess-=refund}s.migrated=true}
 if(old&&old.version===1){for(const k in s.attributes)s.attributes[k]=finite(old.attributes?.[k],BALANCE.player.attributeCap);let budget=rpgAttributeBudget(p);for(const k in s.attributes){s.attributes[k]=Math.min(budget,s.attributes[k]);budget-=s.attributes[k]}s.talents=[];for(const t of RPG_TALENTS){if(!Array.isArray(old.talents)||!old.talents.includes(t.id)||rpgSpent(p)>=rpgTalentLimit(p,cycle)||rpgBranchSpent(t.branch,p)<(t.tier-1)*2)continue;if(t.exclusive&&RPG_TALENTS.some(o=>o.exclusive===t.exclusive&&s.talents.includes(o.id)))continue;s.talents.push(t.id)}s.swordSpec=p.weapon>=3&&['chain','heavy','counter'].includes(old.swordSpec)?old.swordSpec:null;s.respecs=finite(old.respecs,999);
 }
 // Legacy potions become carried charges plus stock, preserving their total.
 p.potionCharges=Number.isFinite(raw.potionCharges)?finite(raw.potionCharges,BALANCE.healing.charges):Math.min(BALANCE.healing.charges,p.potions);
 if(!Number.isFinite(raw.potionCharges))p.potions-=p.potionCharges;return p
}
function rpgEnemyCategory(e){return e.boss?'boss':e.guardian?'guardian':e.miniBossId?'mini':e.ngElite?'veteran':e.type==='crab'?'tank':'common'}
function rpgEnemyInit(e){const c=rpgEnemyCategory(e);e.postureMax=BALANCE.posture.limits[c];e.posture=e.postureMax;e.postureDelay=0;e.postureImmune=0;e.controlImmune=0;e.controlBudget=0;e.markUntil=0;e.hookSetup=0;e.attackToken=null;e.encounterStart=null;e.encounterDamage=0;return e}
function rpgControl(e,duration){if(!e||e.dead||e.controlImmune>0)return false;const cap=BALANCE.posture.breakTime[rpgEnemyCategory(e)],room=Math.max(0,cap-(e.controlBudget||0));if(room<=0)return false;const applied=Math.min(duration,room);e.stun=Math.max(e.stun||0,applied);e.controlBudget=(e.controlBudget||0)+applied;cancelEnemyAttack(e);if(e.controlBudget>=cap-.001)e.controlImmune=cap+BALANCE.posture.controlImmunity;return true}
function rpgPostureHit(e,impact){if(e.dead)return false;if(!Number.isFinite(e.posture))rpgEnemyInit(e);e.postureDelay=BALANCE.posture.delay;if(e.postureImmune>0)return false;e.posture=Math.max(0,e.posture-impact);if(e.posture>0)return false;const duration=BALANCE.posture.breakTime[rpgEnemyCategory(e)];cancelEnemyAttack(e);e.controlImmune=0;e.controlBudget=0;rpgControl(e,duration);e.vulnerable=Math.max(e.vulnerable||0,duration+.4);e.posture=e.postureMax*BALANCE.posture.reset;e.postureImmune=duration+BALANCE.posture.immunity;RPG_METRICS.postureBreaks++;text(e.x,e.y-e.r-52,'POSTURA QUEBRADA','#8fe7e1',11);sound('block',1.05);return true}
function rpgEnemyTick(e,dt){if(!Number.isFinite(e.posture))rpgEnemyInit(e);e.postureDelay=Math.max(0,e.postureDelay-dt);e.postureImmune=Math.max(0,e.postureImmune-dt);e.controlImmune=Math.max(0,e.controlImmune-dt);if(e.controlImmune<=0&&e.stun<=0)e.controlBudget=0;if(e.postureDelay<=0&&e.stun<=0)e.posture=Math.min(e.postureMax,e.posture+e.postureMax*BALANCE.posture.regen*dt);if(e.encounterStart!==null)e.encounterSeconds=(e.encounterSeconds||0)+dt}
const RPG_RESISTS={slime:{slash:-.1,bird:.08},crab:{slash:.18,impact:-.12,hook:-.1},bandit:{bird:-.08},mushroom:{bird:.12,slash:-.08},wisp:{hook:-.15,impact:.1},sponge:{slash:.08,impact:-.1}};
function rpgDamageType(source){return ['hook','pull'].includes(source)?'hook':source==='poop'?'bird':['charged','crate'].includes(source)?'impact':['sword','combo3','execution'].includes(source)?'slash':'environment'}
function rpgCritChance(source,e,context={}){let chance=BALANCE.attacks.crit[source]||0;if(source==='charged')chance=.08+.04*(context.charge||0);if(rpgDamageType(source)==='slash'||source==='charged'){chance+=rpgAttribute('technique')*.003+rpgItemStat('crit')+(rpgTalent('edge')?.02:0);if(e?.vulnerable>0)chance+=.03+(rpgTalent('precision')?.04:0);if(player.counterWindow>0&&player.counterSource==='parry')chance+=.04+(rpgTalent('riposte')?.08:0)}return Math.min(.35,chance)}
function calculateDamage(e,base,source,context={}){const type=rpgDamageType(source),counter=!!context.counter,critical=context.critical??(Math.random()<rpgCritChance(source,e,context));let conditional=1,build=1;
 if(e.vulnerable>0&&type!=='environment')conditional*=BALANCE.attacks.vulnerable;if(counter)conditional*=BALANCE.attacks.counter+rpgItemStat('counter');if(critical)conditional*=BALANCE.attacks.critical;
 if(type==='hook'){build*=1+(rpgTalent('reel')&&source==='pull'?.15:0);if(equipped('storm_hook'))build*=1.12}
 if(type==='bird'){build*=1+(rpgTalent('storm')?.15:0)+(context.boosted&&rpgTalent('opportunity')?.1:0)}
 if(counter&&rpgTalent('duelist'))conditional*=1.12;if(counter&&player.counterSource==='parry'&&rpgTalent('riposte'))conditional*=1.08;
 if(type==='slash'&&e.hookSetup>G.playTime&&rpgTalent('finisher'))conditional*=1.15;
 if(type==='slash'&&e.markUntil>G.playTime&&rpgTalent('mark'))conditional*=rpgTalent('scout')?1.3:1.2;
 if(type==='slash'&&player.dashAttackWindow>0&&rpgTalent('step'))conditional*=1.1;
 const spec=rpgState().swordSpec;if(spec==='chain'&&source==='combo3')build*=1.15;if(spec==='heavy'&&source==='charged')build*=1.15;if(spec==='counter'&&counter)build*=1.15;
 if(typeof gd026MiniMastery==='function')conditional*=gd026MiniMastery(e,source);if(ngActive()&&typeof gd027Rule==='function'&&gd027Rule()?.id==='iron'&&e.ngElite&&['hook','pull','charged'].includes(source))conditional*=1.15;
 conditional=Math.min(BALANCE.attacks.conditionalCap,conditional);const resist=clamp(RPG_RESISTS[e.type]?.[type]||0,-.15,.2),defense=context.defense??1;
 const damage=Math.max(1,Math.round(base*build*conditional*defense*(1-resist)));
 let posture=(BALANCE.posture.impact[source]||0)*(1+rpgAttribute('technique')*.015+rpgItemStat('posture'));
 if(type==='hook')posture*=1+(rpgTalent('tension')?.2:0)+(rpgTalent('breaker')?.3:0);if(type==='bird'&&rpgTalent('flock'))posture*=1.15;if(source==='charged'&&rpgTalent('weight'))posture*=1.2;if(hook?.target===e&&rpgTalent('anchor'))posture*=1.1;
 return {damage,posture,critical,counter,type,base,build,conditional,defense,resist}
}
const RPG_METRICS={damage:{},staminaSpent:0,postureBreaks:0,encounters:[],potionHealing:0,lastDamage:null};
function rpgRecordHit(e,result,source){e._gd026LastSource=source;const actual=Math.min(Math.max(0,e.hp),result.damage),m=RPG_METRICS.damage[source]||(RPG_METRICS.damage[source]={hits:0,damage:0,critical:0});m.hits++;m.damage+=actual;m.critical+=result.critical?1:0;e.encounterDamage=(e.encounterDamage||0)+actual;if(e.encounterStart===null||e.encounterStart===undefined){e.encounterStart=G.playTime;e.encounterSeconds=0;e.encounterEntryHp=player.hp}if(typeOfDebug())RPG_METRICS.lastDamage={source,...result};if(source==='pull')e.hookSetup=G.playTime+2;if(source==='poop'&&rpgTalent('mark'))e.markUntil=G.playTime+(rpgTalent('scout')?5:3);if(rpgDamageType(source)==='slash'){e.markUntil=0;e.hookSetup=0;player.dashAttackWindow=0}rpgPostureHit(e,result.posture);return actual}
function typeOfDebug(){return typeof DEBUG!=='undefined'&&!!DEBUG.visible}
function rpgRecordDeath(e){if(e.encounterStart===null||e.encounterStart===undefined)return;RPG_METRICS.encounters.push({name:e.name,category:rpgEnemyCategory(e),duration:e.encounterSeconds||0,level:player.level,cycle:ngCycle(),damage:e.encounterDamage,entryHp:e.encounterEntryHp,endHp:player.hp});if(RPG_METRICS.encounters.length>100)RPG_METRICS.encounters.shift()}
function combatBalanceReport(){const seconds=Math.max(1,PLAYTEST.seconds||G.playTime||1);return {version:1,damage:JSON.parse(JSON.stringify(RPG_METRICS.damage)),dps:Object.fromEntries(Object.entries(RPG_METRICS.damage).map(([k,v])=>[k,v.damage/seconds])),staminaSpent:RPG_METRICS.staminaSpent,postureBreaks:RPG_METRICS.postureBreaks,encounters:RPG_METRICS.encounters.slice(),deaths:PLAYTEST.deaths,potions:PLAYTEST.potions,potionHealing:RPG_METRICS.potionHealing,parries:PLAYTEST.parries,perfectDodges:PLAYTEST.perfectDodges,hp:player.hp,build:JSON.parse(JSON.stringify(rpgState())),lastDamage:RPG_METRICS.lastDamage}}
function rpgResetMetrics(){RPG_METRICS.damage={};RPG_METRICS.staminaSpent=0;RPG_METRICS.postureBreaks=0;RPG_METRICS.encounters=[];RPG_METRICS.potionHealing=0;RPG_METRICS.lastDamage=null}
let rpgTokens={melee:0,ranged:0};
function rpgTokenTick(){rpgTokens={melee:0,ranged:0};for(const e of enemies){if(e.attackToken&&(e.dead||e.stun>0||!(e.strikePending||e.guardianPending||e.bossPending||e.recover>0)))e.attackToken=null;if(e.attackToken)rpgTokens[e.attackToken]++}}
function rpgTakeToken(e,kind){if(e.boss||e.guardian)return true;if(e.attackToken)return true;const group=['bandit','mushroom','wisp'].includes(e.type)||/Rush|Volley/.test(kind)?'ranged':'melee',limit=group==='melee'?2+(ngCycle()>=BALANCE.ngPlus.extraTokenCycle?1:0):1;if(rpgTokens[group]>=limit)return false;e.attackToken=group;rpgTokens[group]++;return true}
function rpgRefillPouch(){const p=player,need=Math.max(0,BALANCE.healing.charges-(p.potionCharges||0)),fill=Math.min(need,p.potions);p.potions-=fill;p.potionCharges=(p.potionCharges||0)+fill;return fill}
function rpgPlayerTick(dt){player.staminaDelay=Math.max(0,(player.staminaDelay||0)-dt);player.dashAttackWindow=Math.max(0,(player.dashAttackWindow||0)-dt);if(player.staminaDelay<=0)player.stamina=Math.min(maxStamina(),player.stamina+rpgStaminaRegen()*dt);player.outOfCombat=player.combat>0?0:(player.outOfCombat||0)+dt;if(player.outOfCombat>=BALANCE.healing.outOfCombatDelay&&player.hp>0)player.hp=Math.min(maxHP(),player.hp+dt*BALANCE.healing.regen);if(player.potionTime>0){player.potionTime=Math.max(0,player.potionTime-dt);if(player.potionTime===0){const before=player.hp;player.hp=Math.min(maxHP(),player.hp+Math.ceil(maxHP()*BALANCE.healing.fraction));RPG_METRICS.potionHealing+=player.hp-before;text(player.x,player.y-43,'+'+(player.hp-before),'#bce5ac',18);sound('potion');saveGame()}}}
