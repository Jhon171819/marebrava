import {test} from 'node:test';import assert from 'node:assert/strict';
import {combatWorld,foe,source} from './combat-support.mjs';

function combatTicks(c,seconds){
 const dt=1/60;
 for(let i=0;i<Math.ceil(seconds/dt);i++){
  c.frame++;c.G.time+=dt;c.G.playTime+=dt;
  c.player.invuln=Math.max(0,c.player.invuln-dt);
  c.updateEnemies(dt);c.updateProjectiles(dt);
 }
}

test('all regular enemy types detect the player, complete attacks and deal damage in the enemy loop',()=>{
 for(const [type,distance] of [['slime',100],['crab',60],['sponge',50],['bandit',200],['mushroom',200],['wisp',200]]){
  const c=combatWorld();c.player.x=2000;c.player.y=2500;
  c.spawnEnemy(type,c.player.x+distance,c.player.y);
  combatTicks(c,8);
  assert.ok(c.PLAYTEST.damageTaken>0,`${type} never landed an attack`);
 }
});

test('stun expires and regular enemies, guardians and bosses resume attacking',()=>{
 for(const [type,opts] of [['slime',{}],['crab',{guardian:'bronze'}],['boss',{boss:true,awake:true}]]){
  const c=combatWorld(),arena=c.run('BOSS_POS');
  c.player.x=arena.x+45;c.player.y=arena.y;
  const e=c.spawnEnemy(type,arena.x,arena.y,1,opts);
  c.rpgControl(e,.5);combatTicks(c,.25);
  assert.ok(e.stun>0&&e.stun<.3,'stun countdown must decrease');
  assert.equal(c.PLAYTEST.damageTaken,0,'stunned enemy attacked');
  combatTicks(c,8);
  assert.equal(e.stun,0,'stun never expired');
  assert.ok(c.PLAYTEST.damageTaken>0,`${type} did not resume attacks`);
 }
});

test('all enemy types resume repeated attacks after Pipoca, automatic stuns and knockback',()=>{
 for(const [type,distance] of [['crab',90],['sponge',70],['slime',100],['bandit',200],['mushroom',200],['wisp',200]]){
  const c=combatWorld();c.player.x=2000;c.player.y=2500;c.player.hp=1000;
  c.player.skills.bird=3;c.player.skills.rain=3;
  const e=c.spawnEnemy(type,c.player.x+distance,c.player.y,1,{hp:2000});
  c.birdAttack(true);c.updateProjectiles(1);
  assert.ok(e.stun>0,`${type} was not hit by Pipoca`);
  // Keep automatic bird attacks active, as in the full game.
  const updateEnemies=c.updateEnemies;
  c.updateEnemies=dt=>{c.updateBird(dt);updateEnemies(dt)};
  combatTicks(c,3);
  const before=c.PLAYTEST.damageTaken;combatTicks(c,8);
  assert.ok(c.PLAYTEST.damageTaken>before,`${type} cannot reach the player after stun`);
  const after=c.PLAYTEST.damageTaken;combatTicks(c,8);
  assert.ok(c.PLAYTEST.damageTaken>after,`${type} cannot reach the player again after knockback`);
 }
});
test('damage pipeline caps stacked conditional bonuses and applies mild typed resistance',()=>{const c=combatWorld(),e=foe(c,'crab',{vulnerable:2});c.player.counterWindow=1;c.player.counterSource='parry';c.rpgState().talents=['duelist','riposte'];const r=c.calculateDamage(e,100,'sword',{counter:true,critical:true});assert.equal(r.conditional,2.25);assert.equal(r.damage,185);assert.equal(c.calculateDamage(e,100,'hook',{critical:false}).resist,-.1)});
test('third combo spends stamina, first two remain available exhausted',()=>{const c=combatWorld();c.player.stamina=0;c.attack();c.player.attackCD=0;c.attack();assert.equal(c.PLAYTEST.attacks,2);c.player.attackCD=0;c.attack();assert.equal(c.player.comboStep,0);assert.equal(c.player.stamina,0)});
test('charge, dash, parry use the new stamina costs and delayed recovery',()=>{for(const [action,cost]of [['chargedAttack',21],['dash',25],['parry',12]]){const c=combatWorld();c[action](1);assert.equal(c.player.stamina,100-cost);c.updatePlayer(.2);assert.equal(c.player.stamina,100-cost);c.updatePlayer(.2);assert(c.player.stamina>100-cost)}});
test('counter is consumed by the first eligible unblocked hit only',()=>{const c=combatWorld();const a=foe(c,'bandit'),b=foe(c,'bandit');c.armCounter('parry',1);c.damageEnemy(a,20,'sword',false);c.damageEnemy(b,20,'sword',false);assert.equal(c.PLAYTEST.counterHits,1);assert(a.hp<b.hp)});
test('posture break interrupts, opens vulnerability and cannot repeat during immunity',()=>{const c=combatWorld(),e=foe(c,'bandit',{strikePending:'bandit',windup:.5});c.rpgPostureHit(e,1000);assert.equal(e.strikePending,null);assert(e.vulnerable>0);assert.equal(e.posture,e.postureMax*.45);const breaks=c.combatBalanceReport().postureBreaks;c.rpgPostureHit(e,1000);assert.equal(c.combatBalanceReport().postureBreaks,breaks);c.rpgEnemyTick(e,4);e.stun=0;c.rpgPostureHit(e,1000);assert.equal(c.combatBalanceReport().postureBreaks,breaks+1)});
test('control budget bounds repeated bird and hook refreshes for every category',()=>{for(const opts of [{},{ngElite:true},{miniBossId:'galeShell'},{guardian:'moss'},{boss:true,awake:true}]){const c=combatWorld(),e=foe(c,'slime',opts);for(let i=0;i<100;i++)c.rpgControl(e,.12);assert(e.stun<=c.BALANCE.posture.breakTime[c.rpgEnemyCategory(e)]);assert(e.controlImmune>0);assert.equal(c.rpgControl(e,2),false)}});
test('posture regenerates only after delay and complete reset clears transient combat state',()=>{const c=combatWorld(),e=foe(c,'crab',{guardian:'bronze'});c.rpgPostureHit(e,20);const p=e.posture;c.rpgEnemyTick(e,1);assert.equal(e.posture,p);e.stun=0;c.rpgEnemyTick(e,1.5);assert(e.posture>p);e.markUntil=100;e.hp-=1;c.resetEliteEnemy(e);assert.equal(e.posture,e.postureMax);assert.equal(e.markUntil,0);assert.equal(e.attackToken,null)});
test('healing has four carried charges, separate stock, use time, cooldown and interruption',()=>{const c=combatWorld();c.player.potions=7;c.rpgRefillPouch();assert.equal(c.player.potions,3);assert.equal(c.player.potionCharges,4);c.player.hp=20;c.drinkPotion();assert.equal(c.player.hp,20);assert.equal(c.player.potionCharges,3);assert.equal(c.attack(),false);c.rpgPlayerTick(.7);assert.equal(c.player.hp,20+Math.ceil(c.maxHP()*.42));assert.equal(c.drinkPotion(),false);c.player.potionCD=0;c.player.hp=20;c.drinkPotion();c.hurtPlayer(10);c.rpgPlayerTick(1);assert.equal(c.player.potionTime,0);assert(c.player.hp<20)});
test('no passive combat heal; outside combat waits eight seconds',()=>{const c=combatWorld();c.player.hp=20;c.player.combat=6;c.rpgPlayerTick(20);assert.equal(c.player.hp,20);c.player.combat=0;c.rpgPlayerTick(7);assert.equal(c.player.hp,20);c.rpgPlayerTick(1);assert(c.player.hp>20)});
test('level-up grants restrained healing and energy, not a complete refill',()=>{const c=combatWorld();c.player.hp=10;c.player.stamina=10;c.gainXP(c.xpNext());assert.equal(c.player.level,2);assert.equal(c.player.hp,10+Math.ceil(c.maxHP()*.18));assert.equal(c.player.stamina,40)});
test('old Save V7 migrates potions without creating inventory and refunds excess legacy skill ranks',()=>{const c=combatWorld();const raw={version:7,player:{level:20,potions:9,points:2,skills:{line:3,harpoon:3,bird:3,rain:3,vigor:3,agility:3}},seals:['moss'],guardians:['moss'],inventory:['navigator_hook'],equipment:{tool:'navigator_hook'},ngPlus:{cycle:0}};const saved=c.cleanSave(raw);assert.equal(saved.version,7);assert.equal(saved.player.potionCharges,4);assert.equal(saved.player.potions,5);assert.equal(c.rpgSpent(saved.player),12);assert.equal(saved.player.points,8);assert.equal(saved.equipment.tool,'navigator_hook');assert.equal(saved.seals[0],'moss');const twice=c.cleanSave(saved);assert.equal(twice.player.points,8);assert.equal(twice.player.potions,5)});
test('new save sanitizes attribute budgets and mutually exclusive talents',()=>{const c=combatWorld();const raw={version:7,player:{level:5,weapon:3,skills:{line:3,harpoon:3},rpg:{version:1,attributes:{strength:20,vitality:20,agility:Infinity,technique:-4},talents:['breaker','sailor','breaker','unknown'],swordSpec:'heavy'}}};const p=c.cleanSave(raw).player;assert.equal(Object.values(p.rpg.attributes).reduce((a,b)=>a+b,0),4);assert.equal(p.rpg.talents.filter(t=>['breaker','sailor'].includes(t)).length,1);assert.equal(p.rpg.swordSpec,'heavy')});
test('talents enforce tiers, exclusive specialization, campaign and NG budgets',()=>{const c=combatWorld();c.player.points=30;assert.equal(c.rpgLearn('breaker'),false);c.player.skills.line=3;c.player.skills.harpoon=3;assert.equal(c.rpgLearn('breaker'),true);assert.equal(c.rpgLearn('sailor'),false);c.player.skills.bird=3;c.player.skills.rain=2;assert.equal(c.rpgLearn('dust'),false);c.G.ngPlus.cycle=1;assert.equal(c.rpgLearn('dust'),true)});
test('four attributes have diminishing returns and respec is free first, paid later',()=>{const c=combatWorld();c.player.level=20;c.player.x=c.HOME.x;c.player.y=c.HOME.y;c.player.points=2;c.player.skills.line=3;c.rpgState().attributes.strength=10;assert.equal(c.rpgAttribute('strength'),8.8);assert.equal(c.rpgRespec(),true);assert.equal(c.player.points,5);assert.equal(c.rpgState().respecs,1);assert.equal(c.rpgRespec(),false);c.player.coins=30;assert.equal(c.rpgRespec(),true);assert.equal(c.player.coins,0)});
test('sword specialization is reversible at camp and only applies to its action',()=>{const c=combatWorld();c.player.weapon=3;c.player.x=c.HOME.x;c.player.y=c.HOME.y;assert(c.rpgSwordSpec('heavy'));const e=foe(c,'bandit');assert.equal(c.calculateDamage(e,100,'charged',{critical:false}).damage,115);assert.equal(c.calculateDamage(e,100,'sword',{critical:false}).damage,100);c.player.coins=20;assert(c.rpgSwordSpec('chain'));assert.equal(c.player.coins,0)});
test('enemy tokens bound simultaneous melee and ranged/heavy attacks and release on death',()=>{const c=combatWorld();const es=Array.from({length:5},()=>foe(c,'slime'));assert(c.rpgTakeToken(es[0],'slime'));assert(c.rpgTakeToken(es[1],'slime'));assert.equal(c.rpgTakeToken(es[2],'slime'),false);const a=foe(c,'bandit'),b=foe(c,'wisp');assert(c.rpgTakeToken(a,'bandit'));assert.equal(c.rpgTakeToken(b,'wisp'),false);es[0].dead=true;es[1].strikePending='slime';a.strikePending='bandit';c.rpgTokenTick();assert(c.rpgTakeToken(es[2],'slime'));c.G.ngPlus.cycle=5;assert(c.rpgTakeToken(es[3],'slime'))});
test('NG+ retains readable windup floor for regulars, guardians and boss',()=>{const c=combatWorld();c.G.ngPlus.cycle=9;for(const [fn,opts]of [['startEnemyStrike',{}],['startGuardianAttack',{guardian:'bronze'}],['startBossAttack',{boss:true}]]){const e=foe(c,'crab',opts);c[fn](e,'bronzeRush',.4);assert(e.windup>=.38)}});
test('elite execution deals contextual damage and cannot bypass remaining boss health',()=>{const c=combatWorld(),e=foe(c,'boss',{boss:true,awake:true,vulnerable:2});e.hp=e.maxHp*.15;const before=e.hp;assert(c.executeEnemy(e));assert(e.hp>0);assert(e.hp<before);assert.equal(e._gd026LastSource,'execution')});
test('all final damage mutations are centralized, and every declared talent has gameplay use',()=>{for(const f of ['06f-mastery-discovery-puzzle.js','06g-quests-builds-bosses.js','06h-mobile-performance-contramare.js'])assert(!source(f).includes('damageEnemy=function'));const c=combatWorld(),ids=c.run('RPG_TALENTS.map(t=>t.id)');const mechanics=source('02b-combat-rules.js')+source('03-gameplay.js');for(const id of ids)assert(mechanics.includes("rpgTalent('"+id+"')")||mechanics.includes('rpgTalent("'+id+'")'),id)});
