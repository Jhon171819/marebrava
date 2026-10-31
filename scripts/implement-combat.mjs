import {readFileSync,writeFileSync} from 'node:fs';
import {parseAst} from 'rollup/parseAst';
const dir='src/game/beta/';
const read=f=>readFileSync(dir+f,'utf8');
const write=(f,s)=>{parseAst(s);writeFileSync(dir+f,s)};
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Anchor: '+a.slice(0,100));return s.replace(a,b)};
const replaceFn=(s,id,replacement)=>{const n=parseAst(s).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===id);if(!n)throw Error(id);return s.slice(0,n.start)+replacement+s.slice(n.end)};
let s=read('03-gameplay.js');
s=replaceFn(s,'maxHP','function maxHP(){return rpgMaxHp()}');
s=replaceFn(s,'attackDamage','function attackDamage(){return rpgAttackPower()}');
s=once(s,'potions:0,points:1','potions:0,potionCharges:0,points:1');
s=once(s,'player.stamina=100;BOOT.stage','player.stamina=maxStamina();rpgState();rpgResetMetrics();BOOT.stage');
s=once(s,'out.exploration=v3CleanState(raw.exploration);return out','out.exploration=v3CleanState(raw.exploration);rpgCleanPlayer(out.player,p,out.ngPlus.cycle);return out');
s=s.replaceAll('skills:{...player.skills},weapon:player.weapon','skills:{...player.skills},weapon:player.weapon,rpg:JSON.parse(JSON.stringify(rpgState())),potionCharges:player.potionCharges||0');
s=once(s,"['stamina',100,0,100]","['stamina',100,0,150]");
s=once(s,'hp:d.hp*(1+(level-1)*.27),maxHp:d.hp*(1+(level-1)*.27),damage:d.damage+(level-1)*2.2','hp:BALANCE.enemies.hp[type]*(1+(level-1)*BALANCE.enemies.hpLevel),maxHp:BALANCE.enemies.hp[type]*(1+(level-1)*BALANCE.enemies.hpLevel),damage:BALANCE.enemies.damage[type]+(level-1)*BALANCE.enemies.damageLevel');
s=once(s,'if(opts.hp)e.hp=e.maxHp=opts.hp;applyNgPlusEnemy(e);','if(opts.hp)e.hp=e.maxHp=opts.hp;if(e.guardian){e.hp=e.maxHp=BALANCE.guardians.hp[e.guardian];e.damage=BALANCE.guardians.damage[e.guardian]}else if(e.boss){e.hp=e.maxHp=BALANCE.boss.hp;e.damage=BALANCE.boss.damage}else if(e.miniBossId){e.hp=e.maxHp=Math.round((opts.hp||e.maxHp)*4.2);e.damage*=1.3}applyNgPlusEnemy(e);rpgEnemyInit(e);');
s=once(s,'const c=Math.min(5,ngCycle()),common','const c=Math.min(9,ngCycle()),common');
s=s.replaceAll('1+.12*c','1+BALANCE.ngPlus.hp*c').replaceAll('1+.1*c','1+BALANCE.ngPlus.hp*c').replaceAll('1+.055*c','1+BALANCE.ngPlus.hp*c').replaceAll('1+.05*c','1+BALANCE.ngPlus.damage*c').replaceAll('1+.03*c','1+BALANCE.ngPlus.damage*c').replaceAll('1+.025*c','1+BALANCE.ngPlus.speed*c').replaceAll('1+.012*c','1+BALANCE.ngPlus.speed*c');
// Boss .055 damage was changed by the HP replacement above; correct its explicit context.
s=once(s,'e.damage*=1+BALANCE.ngPlus.hp*c','e.damage*=1+BALANCE.ngPlus.damage*c');
s=once(s,"player.stamina=100;burst(player.x,player.y,'#f5d890'","player.stamina=Math.min(maxStamina(),player.stamina+maxStamina()*.3);burst(player.x,player.y,'#f5d890'");
s=once(s,'Metade da vida restaurada e +1 ponto de habilidade.','18% da vida e 30% de energia recuperados; +1 ponto de talento e atributo.');
// Existing animations, aim and collision are retained. Costs and criticals use shared rules.
s=once(s,'player.comboStep=step;player.comboTimer=.62;','if(step===3&&!rpgSpend(BALANCE.stamina.combo3)){player.comboStep=0;staminaDenied("Sem fôlego para terminar o combo.");return}player.comboStep=step;player.comboTimer=.62;');
const cfgStart=s.indexOf('const cfg=[null,'),cfgEnd=s.indexOf('[step];',cfgStart)+7;
s=s.slice(0,cfgStart)+'const cfg=BALANCE.attacks.combo[step];'+s.slice(cfgEnd);
s=once(s,"const crit=Math.random()<.1,source=step===3?'combo3':'sword';damageEnemy(e,attackDamage()*cfg.mult*(crit?1.55:1),source,crit,step===3)","const source=step===3?'combo3':'sword';damageEnemy(e,attackDamage()*cfg.mult,source,null,step===3)");
s=once(s,'cost=primed?0:18','cost=primed?0:BALANCE.stamina.charged');
s=once(s,"const crit=Math.random()<.15;damageEnemy(e,attackDamage()*mult*(crit?1.5:1),'charged',crit,true)","damageEnemy(e,attackDamage()*mult,'charged',null,true,{charge})");
s=s.replaceAll('player.stamina-=cost','rpgSpend(cost)');
s=once(s,'const cost=10;if(player.stamina<cost)','const cost=BALANCE.stamina.parry;if(player.stamina<cost)');
s=once(s,'const cost=27-player.skills.agility*4','const cost=BALANCE.stamina.dash-Math.min(2,player.skills.agility*.65)');
s=once(s,'player.dashCD=dashCooldown();rpgSpend(cost)','player.dashCD=dashCooldown();player.dashAttackWindow=.5;rpgSpend(cost)');
s=once(s,'windup*=ngActive()?ngTempoFactor():1;e.strikePending','if(!rpgTakeToken(e,kind))return false;windup=Math.max(BALANCE.ngPlus.windupFloor,windup*(ngActive()?ngTempoFactor():1));e.strikePending');
s=once(s,'function updateEnemies(dt){','function updateEnemies(dt){rpgTokenTick();');
s=once(s,'PERF.aiUpdated++;e.phase+=edt*4;','PERF.aiUpdated++;rpgEnemyTick(e,edt);e.phase+=edt*4;');
s=once(s,'e.hp=e.maxHp;e.x=e.homeX;e.y=e.homeY;','e.hp=e.maxHp;rpgEnemyInit(e);e.x=e.homeX;e.y=e.homeY;');
s=once(s,'e.hp=e.maxHp;e.stun=0;e.impact=0;e.aggro=false;','e.hp=e.maxHp;rpgEnemyInit(e);e.stun=0;e.impact=0;e.aggro=false;');
s=once(s,'player.stamina=Math.min(100,player.stamina+dt*(22+player.skills.agility*4));','rpgPlayerTick(dt);');
s=once(s,'if(player.hp<maxHP())player.hp=Math.min(maxHP(),player.hp+dt*(player.combat<=0&&dist(player,HOME)<160?6:BALANCE.healthRegen))','');
s=replaceFn(s,'drinkPotion',`function drinkPotion(){if(!G.started||G.overlay||player.hp<=0||player.potionCD>0||player.potionTime>0)return false;if((player.potionCharges||0)<=0){toast('Bolsa vazia. Descanse no abrigo para repor do estoque.');return false}if(player.hp>=maxHP()){toast('Sua vida já está completa.');return false}player.potionCharges--;player.potionTime=BALANCE.healing.animation;player.potionCD=BALANCE.healing.cooldown;player.charging=false;player.attackBuffer=0;player.attackPressBuffered=false;player.attackCD=Math.max(player.attackCD,player.potionTime);PLAYTEST.potions++;gameEvent('potionUsed');saveGame();return true}`);
s=once(s,'let coatGuard=false;','if(player.potionTime>0){amount*=1.1;player.potionTime=0;text(player.x,player.y-58,"POÇÃO INTERROMPIDA","#efbd98",10)}let coatGuard=false;');
s=once(s,'amount=Math.max(1,Math.round(amount*(1-player.skills.vigor*.05)))','amount=Math.max(1,Math.round(amount*(1-Math.min(.15,player.skills.vigor*.025+rpgAttribute("vitality")*.003))*(rpgTalent("survivor")?.95:1)))');
s=once(s,'e.dead=true;e.aggro=false;e.respawn=','rpgRecordDeath(e);e.dead=true;e.aggro=false;e.attackToken=null;e.respawn=');
// Calculate after contextual guards, but before effects and death rewards. Guard = defense, not another damage pipeline.
s=once(s,'function damageEnemy(e,amount,source,critical=false,strong=false)','function damageEnemy(e,amount,source,critical=null,strong=false,context={})');
s=once(s,'let blocked=false,countered=false;','const baseAmount=amount;let blocked=false,countered=false;if(e.strikePending==="mushroomSpore"&&["charged","hook","pull"].includes(source)||e.strikePending==="wispBlink"&&["hook","pull"].includes(source)){rpgControl(e,.6);e.phaseShift=0;e.vulnerable=Math.max(e.vulnerable||0,.8);if(typeof QUALITY_PASS!=="undefined")QUALITY_PASS.metrics.masteryInterrupts++}');
s=once(s,'amount*=BALANCE.combat.counterBonus;countered=true;player.counterWindow=0;player.counterSource=\'\';','countered=true;');
s=once(s,"if(e.vulnerable>0&&!['poop','crate'].includes(source))amount*=BALANCE.combat.vulnerableBonus;amount=Math.max(1,Math.round(amount));PLAYTEST.damageDealt+=amount;",'const result=calculateDamage(e,baseAmount,source,{...context,critical,counter:countered,defense:baseAmount>0?amount/baseAmount:1});critical=result.critical;amount=result.damage;const actualDamage=rpgRecordHit(e,result,source);if(countered){player.counterWindow=0;player.counterSource=""}PLAYTEST.damageDealt+=actualDamage;');
s=once(s,'combatRecordDamage(source,amount);if(e.boss)','combatRecordDamage(source,actualDamage);if(e.boss)');
s=once(s,'PLAYTEST.bossDamage+=amount','PLAYTEST.bossDamage+=actualDamage');s=once(s,'PLAYTEST.guardianDamage+=amount','PLAYTEST.guardianDamage+=actualDamage');
s=once(s,'e._gd026LastSource=\'execution\';PLAYTEST.attacks++;PLAYTEST.hits++;PLAYTEST.executions=(PLAYTEST.executions||0)+1;PLAYTEST.damageDealt+=Math.max(0,e.hp);PLAYTEST.executionDamage=(PLAYTEST.executionDamage||0)+Math.max(0,e.hp);gameEvent(\'execute\');killEnemy(e);','PLAYTEST.attacks++;PLAYTEST.hits++;PLAYTEST.executions=(PLAYTEST.executions||0)+1;const remaining=e.hp;damageEnemy(e,e.boss||e.guardian||e.miniBossId?attackDamage()*2:e.hp*4,"execution",true,true);PLAYTEST.executionDamage=(PLAYTEST.executionDamage||0)+Math.min(remaining,Math.max(0,remaining-e.hp));gameEvent("execute");');
s=replaceFn(s,'isExecutable','function isExecutable(e){return !!e&&!e.dead&&(!e.boss||e.awake)&&e.maxHp>0&&e.hp/e.maxHp<=.18&&(!(e.boss||e.guardian||e.miniBossId)||e.vulnerable>0)}');
s=s.replaceAll('Math.min(100,player.stamina+','Math.min(maxStamina(),player.stamina+');
// Scale the original level-dependent auxiliary attacks down; talents and item stats do the rest.
s=s.replaceAll("10+player.skills.harpoon*7,'pull'","10+player.skills.harpoon*4+rpgItemStat('hook'),'pull'");
s=once(s,"15+player.level*2+player.skills.harpoon*11,'hook'","15+player.level*.5+player.skills.harpoon*5+rpgItemStat('hook'),'hook'");
s=once(s,'10+player.level*2+player.skills.bird*6','10+player.level*.4+player.skills.bird*5+rpgItemStat("bird")');
s=once(s,"*(p.buildBonus||1),'poop'","*(p.buildBonus||1),'poop',null,false,{boosted:p.boosted}");
s=once(s,'player.skills.rain*18+(p.boosted?24:0)','player.skills.rain*10+(rpgTalent("dust")?10:0)+(rpgTalent("storm")?15:0)+(p.boosted?24:0)');
s=once(s,'source.stun=Math.max(source.stun,elite?1.05:.82);','rpgControl(source,elite?.55:.7);rpgPostureHit(source,BALANCE.posture.impact.parry);if(rpgTalent("resolve"))player.stamina=Math.min(maxStamina(),player.stamina+3);');
s=once(s,'manual?430:305','manual?430+(rpgTalent("wings")?25:0):305');
// Convert stun grants only; preserve Math.max(0, stun - dt) countdowns.
let edits=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type==='AssignmentExpression'&&n.operator==='='&&n.left.type==='MemberExpression'&&n.left.property.name==='stun'&&n.right.type==='CallExpression'&&n.right.callee.object?.name==='Math'&&n.right.callee.property?.name==='max'){const obj=s.slice(n.left.object.start,n.left.object.end),arg=n.right.arguments[1];if(arg&&s.slice(n.right.arguments[0].start,n.right.arguments[0].end)===s.slice(n.left.start,n.left.end))edits.push([n.start,n.end,`rpgControl(${obj},${s.slice(arg.start,arg.end)})`]);return}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}walk(parseAst(s));for(const [a,b,r] of edits.sort((a,b)=>b[0]-a[0]))s=s.slice(0,a)+r+s.slice(b);
write('03-gameplay.js',s);
for(const f of ['06f-mastery-discovery-puzzle.js','06g-quests-builds-bosses.js','06h-mobile-performance-contramare.js']){s=read(f);const ast=parseAst(s),cuts=[];for(const n of ast.body){if(n.type==='ExpressionStatement'&&n.expression.type==='AssignmentExpression'&&n.expression.left.name==='damageEnemy'||n.type==='VariableDeclaration'&&n.declarations.some(d=>d.init?.name==='damageEnemy'))cuts.push([n.start,n.end])}for(const [a,b] of cuts.reverse())s=s.slice(0,a)+s.slice(b);s=s.replaceAll('Math.min(100,player.stamina+','Math.min(maxStamina(),player.stamina+');if(f.startsWith('06g'))s=s.replace('const windows={mossCrown:.52,mireTide:.38,bronzeRush:.66,sealStorm:.44,undertow:.30,summon:.25}','const windows=BALANCE.boss.recovery');write(f,s)}
const manifest=JSON.parse(read('manifest.json'));manifest.splice(manifest.indexOf('03-gameplay.js'),0,'02b-combat-rules.js');writeFileSync(dir+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
