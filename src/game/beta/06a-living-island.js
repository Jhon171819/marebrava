'use strict';
// Maré Brava — Ilha Viva II: eventos condicionais, mistério encadeado,
// interações memoráveis e Pipoca como ferramenta de exploração.

const LIVING_MYSTERY=Object.freeze({
 wind:{name:'Marca do Primeiro Sopro',zone:'meadow',x:1860,y:2320,clue:'Uma espiral foi entalhada contra o sentido do vento. Ao lado, cinco riscos apontam para regiões diferentes.',lore:'A pedra não marca um lugar. Marca uma direção que muda quando a ilha muda.'},
 roots:{name:'Marca Entre Raízes',zone:'forest',x:2860,y:1040,clue:'A mesma espiral reaparece entre raízes antigas. Desta vez, um dos cinco riscos foi apagado.',lore:'Alguém revisitou esta marca depois de gravá-la. Ou alguma coisa cresceu sobre ela de propósito.'},
 mire:{name:'Marca Sob a Água',zone:'marsh',x:3090,y:3590,clue:'Sob a película do Brejo há uma espiral idêntica. A água parece evitar exatamente o centro do símbolo.',lore:'A marca não afunda, mesmo quando o chão ao redor cede. Isso não deveria ser possível.'},
 glass:{name:'Marca no Vidro',zone:'dunes',x:4380,y:1540,clue:'Um fragmento de vidro antigo projeta a mesma espiral quando o vento limpa a areia.',lore:'O risco aponta para o mar, mas o vidro foi feito antes de esta parte da ilha virar deserto.'},
 undertow:{name:'Marca da Vazante',zone:'reef',x:4870,y:3020,clue:'A maré baixa revela uma espiral gravada abaixo da linha normal da água. Há cinco pontos ao redor dela.',lore:'As cinco marcas formam o mesmo desenho visto de ângulos diferentes. Falta sobrepor os mapas.'}
});
const LIVING_MYSTERY_IDS=Object.keys(LIVING_MYSTERY);
const LIVING_INTERACTIONS=Object.freeze({
 bench:{name:'Banco do Mirante',kind:'bench',x:1760,y:1305,text:'Sentar um pouco'},
 bell:{name:'Sino de Damião',kind:'bell',x:3890,y:2735,text:'Tocar o sino'},
 sign:{name:'Placa do Abrigo',kind:'sign',x:1360,y:2600,text:'Ler a placa'},
 statue:{name:'Ídolo Queimado de Sol',kind:'statue',x:4400,y:1320,text:'Examinar o ídolo'},
 stones:{name:'Pedras de Arremesso',kind:'stones',x:4550,y:3220,text:'Jogar uma pedra'},
 circle:{name:'Círculo de Cogumelos',kind:'circle',x:3000,y:1120,text:'Cutucar os cogumelos'}
});
const LIVING_KEEP_SAKES=Object.freeze({
 button:{name:'Botão velho',desc:'Pipoca decidiu que isto é patrimônio histórico.'},
 thread:{name:'Fio azul',desc:'Comprimento insuficiente para qualquer plano razoável.'},
 spoon:{name:'Colher torta',desc:'A curvatura sugere uma história. A ferrugem sugere tétano.'},
 nail:{name:'Prego brilhante',desc:'Pipoca prefere o termo joia.'},
 shell:{name:'Concha furada',desc:'Assobia mal quando o vento passa.'},
 ticket:{name:'Bilhete molhado',desc:'Só dá para ler: “não pegue o barco”. Excelente conselho atrasado.'}
});
const LIVING_BIRD_SPOTS=[
 {id:'button',x:1970,y:2470},{id:'thread',x:2710,y:1290},{id:'spoon',x:2830,y:3360},
 {id:'nail',x:4010,y:1860},{id:'shell',x:4610,y:2780},{id:'ticket',x:4740,y:3290}
];
const LIVING_EVENT_TYPES=['windPages','forestEcho','marshChoir','sandChimes','lowTideMessage'];

function livingState(){
 const s=v3State();
 if(!Array.isArray(s.mystery))s.mystery=[];
 if(!Array.isArray(s.interactions))s.interactions=[];
 if(!Array.isArray(s.keepsakes))s.keepsakes=[];
 if(!Array.isArray(s.eventsSeen))s.eventsSeen=[];
 s.mysteryResolved=s.mysteryResolved===true;
 s.keepsakeReward=s.keepsakeReward===true;
 return s;
}
function livingCleanExploration(raw){
 const uniq=(a,allowed)=>Array.isArray(a)?[...new Set(a.filter(v=>allowed.includes(v)))]:[];
 const mystery=uniq(raw?.mystery,LIVING_MYSTERY_IDS);
 return {
  mystery,
  interactions:uniq(raw?.interactions,Object.keys(LIVING_INTERACTIONS)),
  keepsakes:uniq(raw?.keepsakes,Object.keys(LIVING_KEEP_SAKES)),
  eventsSeen:uniq(raw?.eventsSeen,LIVING_EVENT_TYPES),
  mysteryResolved:raw?.mysteryResolved===true&&mystery.length===LIVING_MYSTERY_IDS.length,
  keepsakeReward:raw?.keepsakeReward===true
 };
}
function livingMysteryFound(id){return livingState().mystery.includes(id)}
function livingMysteryAvailable(id){
 if(livingMysteryFound(id))return true;
 if(id==='wind')return G.tutorial?.mara===true||G.playTime>35;
 if(id==='roots')return v3Solved('birdsong')||['noite','madrugada'].includes(dayPhaseAt().id);
 if(id==='mire')return v3Solved('marshLights')||['noite','madrugada'].includes(dayPhaseAt().id)||weatherNow().id==='fog';
 if(id==='glass')return v3Solved('glassArray')||['wind','storm'].includes(weatherNow().id);
 if(id==='undertow')return lowTideOpen()||G.bossDefeated;
 return false;
}
function livingDiscoverMystery(id){
 if(!LIVING_MYSTERY[id]||livingMysteryFound(id)||!livingMysteryAvailable(id))return false;
 const s=livingState();s.mystery.push(id);const d=LIVING_MYSTERY[id];
 burst(d.x,d.y,'#ead891',20,105);text(d.x,d.y-42,'MARCA ANTIGA','#ffe6a3',12);sound('discover');
 toast(d.name+' registrada no Diário.','gold');
 if(s.mystery.length===LIVING_MYSTERY_IDS.length)toast('As cinco marcas repetem o mesmo desenho. Talvez alguém no abrigo saiba sobrepor os mapas.','gold');
 saveGame();return true;
}
function livingResolveMystery(){
 const s=livingState();if(s.mystery.length<LIVING_MYSTERY_IDS.length||s.mysteryResolved)return false;
 s.mysteryResolved=true;player.points=Math.min(120,player.points+1);player.coins=Math.min(999999,player.coins+75);
 unlockAchievement('undertowMap');sound('level');saveGame();
 toast('Mistério resolvido: +1 ponto de habilidade e 75 ouro.','gold');return true;
}
function livingShowMysteryFinal(){
 const s=livingState();if(s.mystery.length<LIVING_MYSTERY_IDS.length)return false;
 const first=!s.mysteryResolved;
 const html=modalHeader('AS CINCO MARCAS','UM MAPA QUE NÃO MOSTRA LUGARES')+
 `<div class="dialogue">Nena sobrepõe os cinco desenhos. As espirais não apontam para tesouro algum: elas registram como a ilha se move entre marés antigas.</div>
 <p>Quando as linhas são alinhadas, surge uma sexta forma no centro — exatamente onde hoje fica o abrigo. Alguém mapeou a ilha antes de ela ter a costa atual.</p>
 <div class="v3-guide-state">“Isso não é um mapa para chegar em algum lugar”, diz Nena. “É um mapa para provar que o lugar chegou até nós.”</div>
 <div class="modal-actions"><button id="living-mystery-close" class="primary">${first?'Guardar a descoberta':'Fechar o mapa'}</button></div>
 <div class="footer-note">O mistério é opcional. As marcas continuam registradas no Diário de Bordo.</div>`;
 setModal('livingMystery',html,true);$('living-mystery-close').onclick=()=>{if(first)livingResolveMystery();closeOverlay();updateHUD()};return true;
}

function livingBuildWorld(){
 const s=livingState();
 for(const [id,d] of Object.entries(LIVING_MYSTERY))structures.push({id:'living-mark-'+id,kind:'livingMystery',mysteryId:id,name:d.name,x:d.x,y:d.y,r:17,revealed:false});
 for(const [id,d] of Object.entries(LIVING_INTERACTIONS))structures.push({id:'living-int-'+id,kind:'livingInteract',interactionId:id,name:d.name,x:d.x,y:d.y,r:17});
 for(const d of LIVING_BIRD_SPOTS)structures.push({id:'living-bird-'+d.id,kind:'livingBirdSpot',keepsakeId:d.id,name:LIVING_KEEP_SAKES[d.id].name,x:d.x,y:d.y,r:14});
 structures.push({id:'living-mystery-final',kind:'livingMysteryFinal',name:'Mapas Sobrepostos de Nena',x:1325,y:2670,r:19,hidden:s.mystery.length<LIVING_MYSTERY_IDS.length});
}
function updateLivingIsland(dt){
 if(!G.started)return;const s=livingState();
 const final=structures.find(v=>v.id==='living-mystery-final');if(final)final.hidden=s.mystery.length<LIVING_MYSTERY_IDS.length;
 if(G._livingLastEventAt&&G.playTime-G._livingLastEventAt>80){G._livingLastEventAt=0;G._livingLastEventType=null}
}

function livingCanNearby(s){
 if(!s)return false;
 if(s.kind==='livingBirdSpot')return false;
 if(s.kind==='livingMystery')return livingMysteryAvailable(s.mysteryId);
 if(s.kind==='livingMysteryFinal')return livingState().mystery.length===LIVING_MYSTERY_IDS.length;
 if(s.kind==='livingEvent'||s.kind==='livingEventNode')return !!G.activeEvent&&G.activeEvent.id===s.eventId;
 return true;
}
function livingInteractionRange(s){return s?.kind?.startsWith('living')?88:null}
function livingInteractionLabel(s){
 if(!s)return null;
 if(s.kind==='livingMystery')return livingMysteryFound(s.mysteryId)?'Reexaminar '+s.name:'Examinar marca antiga';
 if(s.kind==='livingMysteryFinal')return 'Sobrepor as cinco marcas';
 if(s.kind==='livingInteract')return LIVING_INTERACTIONS[s.interactionId]?.text||'Interagir';
 if(s.kind==='livingEventNode')return s.eventSubtype==='marshChoir'?'Tocar o lume':'Examinar';
 if(s.kind==='livingEvent')return s.label||'Examinar';
 return null;
}
function interactLivingStructure(s){
 if(!s)return false;
 if(s.kind==='livingMystery'){
  if(!livingMysteryAvailable(s.mysteryId)){toast('A marca está coberta pelas condições da ilha.');return true}
  const d=LIVING_MYSTERY[s.mysteryId];
  if(!livingMysteryFound(s.mysteryId))livingDiscoverMystery(s.mysteryId);
  else toast(d.lore);
  return true;
 }
 if(s.kind==='livingMysteryFinal'){livingShowMysteryFinal();return true}
 if(s.kind==='livingInteract'){livingUseInteraction(s.interactionId,s);return true}
 if(s.kind==='livingEvent'||s.kind==='livingEventNode'){livingUseEventStructure(s);return true}
 return false;
}
function livingUseInteraction(id,s){
 const state=livingState(),first=!state.interactions.includes(id);if(first)state.interactions.push(id);
 if(id==='bench'){
  player.stamina=100;player.hp=Math.min(maxHP(),player.hp+Math.ceil(maxHP()*.08));
  toast(first?'Nilo descansa. Pipoca ocupa 70% do banco por razões desconhecidas.':'Pipoca continua convencido de que o banco é dele.');sound('potion',.65)
 }else if(id==='bell'){
  sound('secret',.72);burst(s.x,s.y-28,'#e3cf8d',10,55);toast(first?'O sino responde com duas notas. Damião grita de longe: “ESSA NÃO FUI EU!”':'Damião, em algum lugar: “EU JÁ DISSE PRA PARAR!”')
 }else if(id==='sign'){
  toast(first?'Placa: “ABRIGO DE MARA · NÃO ALIMENTE O POMBO”. A palavra NÃO foi bicada até sumir.':'A placa continua perdendo a discussão para Pipoca.')
 }else if(id==='statue'){
  burst(s.x,s.y,'#d8c189',7,45);if(first){player.coins+=1;toast('Uma moeda caiu do ídolo. Pipoca assume crédito integral.','gold')}else toast('O ídolo permanece dramaticamente indiferente.')
 }else if(id==='stones'){
  for(let i=0;i<7;i++)burst(s.x+24+i*9,s.y-8-i*2,'#d8d4ac',1,18);toast(first?'A pedra quica quatro vezes. Pipoca observa como se fosse uma afronta pessoal.':'Três quicadas. A anterior foi melhor.')
 }else if(id==='circle'){
  const night=['noite','madrugada'].includes(dayPhaseAt().id);burst(s.x,s.y,'#b9d69a',night?16:7,50);toast(night?'Os cogumelos acendem por um segundo. Pipoca recua. Sensato.':'Nada acontece. Pipoca bica um deles mesmo assim.')
 }
 if(first){saveGame();if(state.interactions.length===Object.keys(LIVING_INTERACTIONS).length)toast('Você mexeu em absolutamente tudo que parecia mexível. Mara ficaria preocupada.','gold')}
}

function drawLivingStructure(s){
 if(!s||!s.kind?.startsWith('living'))return false;
 const c=ctx,x=s.x,y=s.y;c.save();
 if(s.kind==='livingBirdSpot'){c.restore();return true}
 if(s.kind==='livingMystery'){
  if(!livingMysteryAvailable(s.mysteryId)){c.restore();return true}
  const found=livingMysteryFound(s.mysteryId);ellipse(c,x,y+5,22,7,'#2c55453b');
  circle(c,x,y-8,15,found?'#8f9a77':'#6e8069',found?'#e6d390':'#b9c59b',2);
  c.save();c.translate(x,y-8);c.rotate(G.time*.03);for(let i=0;i<5;i++){const a=i/5*TAU,r=9;circle(c,Math.cos(a)*r,Math.sin(a)*r,1.5,found?'#f1dda0':'#c7cfaa')}c.restore();
  line(c,[[x-5,y-8],[x+5,y-8],[x+1,y-3],[x-4,y-4]],found?'#f0d99a':'#c6cca5',1.4);
  if(dist(player,s)<155)worldLabel(x,y-38,found?s.name:'MARCA ANTIGA','#ead9a7',9);
 }else if(s.kind==='livingMysteryFinal'){
  if(s.hidden){c.restore();return true}ellipse(c,x,y+6,34,10,'#3154423a');rr(c,x-31,y-24,62,28,5,'#8d7d58','#d2bb80',2);for(let i=-2;i<=2;i++)line(c,[[x-24,y-12+i*4],[x+23,y-9+i*3]],'#e5d4a070',1);star(c,x,y-10,6,'#efd693');if(dist(player,s)<160)worldLabel(x,y-48,'CINCO MAPAS · UMA FORMA','#f2dda3',9)
 }else if(s.kind==='livingInteract'){
  const d=LIVING_INTERACTIONS[s.interactionId];ellipse(c,x,y+5,23,7,'#2f52413a');
  if(d.kind==='bench'){rr(c,x-27,y-19,54,9,3,'#967b52','#cfb57b',1.5);line(c,[[x-21,y-10],[x-21,y+4]],'#6d6246',4);line(c,[[x+21,y-10],[x+21,y+4]],'#6d6246',4)}
  else if(d.kind==='bell'){line(c,[[x,y+3],[x,y-42]],'#716449',5);c.beginPath();c.moveTo(x-12,y-31);c.quadraticCurveTo(x,y-47,x+12,y-31);c.lineTo(x+8,y-15);c.lineTo(x-8,y-15);c.closePath();c.fillStyle='#c7ad69';c.fill();circle(c,x,y-13,3,'#ead48f')}
  else if(d.kind==='sign'){line(c,[[x,y+3],[x,y-35]],'#766746',5);rr(c,x-25,y-48,50,24,3,'#9a8658','#d4ba7c',1.5);line(c,[[x-17,y-39],[x+16,y-39]],'#665c43',2)}
  else if(d.kind==='statue'){rr(c,x-18,y-12,36,13,4,'#958a67');circle(c,x,y-34,14,'#b7aa7d','#e0cb91',2);line(c,[[x-8,y-20],[x,y-7],[x+8,y-20]],'#827757',4)}
  else if(d.kind==='stones'){for(let i=0;i<4;i++)ellipse(c,x-18+i*12,y-i*2,9-i,5,'#a7ac91')}
  else {for(let i=0;i<8;i++){const a=i/8*TAU;ellipse(c,x+Math.cos(a)*20,y+Math.sin(a)*10,7,4,'#9da88a')}}
  if(dist(player,s)<130)worldLabel(x,y-53,s.name,'#d9d2aa',8)
 }else if(s.kind==='livingEvent'||s.kind==='livingEventNode'){
  const pulse=.65+.2*Math.sin(G.time*4+(s.slot||0));c.globalAlpha=pulse;ellipse(c,x,y+4,23,8,'#294f4038');
  if(s.eventSubtype==='windPages'){for(let i=0;i<3;i++){c.save();c.translate(x+i*9-9,y-18-i*4);c.rotate(-.25+i*.22);rr(c,-6,-4,12,8,1,'#d9d0ab','#8d815d',1);c.restore()}}
  else if(s.eventSubtype==='forestEcho'){circle(c,x,y-16,9,'#b9d3a366','#d8e0b1',1.5);circle(c,x,y-16,21,null,'#b5cf9b55',1)}
  else if(s.eventSubtype==='marshChoir'){line(c,[[x,y],[x,y-28]],'#617052',4);circle(c,x,y-35,10,s.done?'#dceb9b':'#779679','#edf0ab',2)}
  else if(s.eventSubtype==='sandChimes'){line(c,[[x,y],[x,y-38]],'#79694a',4);for(let i=-1;i<=1;i++){line(c,[[x+i*10,y-30],[x+i*10,y-13]],'#d1bd7c',2);circle(c,x+i*10,y-10,3,'#e8d69b')}}
  else if(s.eventSubtype==='lowTideMessage'){rr(c,x-7,y-21,14,24,5,'#8eb0a377','#d9dfb5',1.5);line(c,[[x-4,y-11],[x+4,y-7]],'#e7d49b',1)}
  if(dist(player,s)<145)worldLabel(x,y-50,s.name||G.activeEvent?.title,'#f0d99b',8);c.globalAlpha=1;
 }
 c.restore();return true;
}

function livingConditionalEventType(){
 const s=livingState(),z=zoneAt(player.x,player.y).id,w=weatherNow().id,ph=dayPhaseAt().id,unseen=t=>!s.eventsSeen.includes(t);
 if(z==='meadow'&&['wind','storm'].includes(w)&&unseen('windPages'))return 'windPages';
 if(z==='forest'&&(w==='fog'||['noite','madrugada'].includes(ph))&&unseen('forestEcho'))return 'forestEcho';
 if(z==='marsh'&&['noite','madrugada'].includes(ph)&&['fog','rain','storm'].includes(w)&&unseen('marshChoir'))return 'marshChoir';
 if(z==='dunes'&&['wind','storm'].includes(w)&&unseen('sandChimes'))return 'sandChimes';
 if(z==='reef'&&lowTideOpen()&&unseen('lowTideMessage'))return 'lowTideMessage';
 return null;
}
function startLivingDynamicEvent(type,evt,pos,level){
 if(!LIVING_EVENT_TYPES.includes(type))return false;
 if(type==='windPages'){evt.title='PÁGINAS AO VENTO';structures.push({id:'living-event-'+evt.id,kind:'livingEvent',eventSubtype:type,eventId:evt.id,name:'Papéis presos no mato',label:'Recolher as páginas',x:pos.x,y:pos.y,r:18})}
 else if(type==='forestEcho'){evt.title='ECO ENTRE AS RAÍZES';evt.birdOnly=true;structures.push({id:'living-event-'+evt.id,kind:'livingEvent',eventSubtype:type,eventId:evt.id,name:'Eco estranho',label:'Chamar Pipoca',x:pos.x,y:pos.y,r:18})}
 else if(type==='marshChoir'){evt.title='PROCISSÃO DOS LUMES';evt.nodes=[false,false,false];for(let i=0;i<3;i++){const a=i/3*TAU;structures.push({id:'living-event-'+evt.id+'-'+i,kind:'livingEventNode',eventSubtype:type,eventId:evt.id,slot:i,name:'Lume errante',x:pos.x+Math.cos(a)*58,y:pos.y+Math.sin(a)*42,r:15})}}
 else if(type==='sandChimes'){evt.title='SINOS DE AREIA';structures.push({id:'living-event-'+evt.id,kind:'livingEvent',eventSubtype:type,eventId:evt.id,name:'Mastro dos sinos',label:'Ouvir os sinos',x:pos.x,y:pos.y,r:18})}
 else if(type==='lowTideMessage'){evt.title='MENSAGEM DA VAZANTE';structures.push({id:'living-event-'+evt.id,kind:'livingEvent',eventSubtype:type,eventId:evt.id,name:'Garrafa antiga',label:'Abrir a garrafa',x:pos.x,y:pos.y,r:16})}
 toast(evt.title+' apareceu nas condições certas da ilha.','gold');return true;
}
function livingUseEventStructure(s){
 const evt=G.activeEvent;if(!evt||evt.id!==s.eventId)return false;
 if(evt.type==='windPages'){
  toast('Os papéis são rascunhos de Nena. Uma frase se repete: “a costa já esteve em outro lugar”.','gold');livingCompleteEvent(evt);return true
 }
 if(evt.type==='forestEcho'){
  if(!bird||bird.manualCD>0){toast('Pipoca olha para as raízes, depois para você, decepcionado.');return true}
  bird.scoutTarget=s;bird.scoutTime=2.4;bird.manualCD=Math.max(bird.manualCD,1.1);text(bird.x,bird.y-35,'?','#f7e4ab',16);toast('Pipoca inclinou a cabeça. Ele ouviu alguma coisa dentro das raízes.');return true
 }
 if(evt.type==='marshChoir'){
  if(evt.nodes?.[s.slot]){toast('Este lume já respondeu.');return true}evt.nodes[s.slot]=true;s.done=true;sound('secret',.7);burst(s.x,s.y,'#dbe89a',12,60);const n=evt.nodes.filter(Boolean).length;toast('Lume '+n+'/3 respondeu.');if(n===3){toast('Os três lumes repetem a mesma sequência de cinco pulsos.','gold');livingCompleteEvent(evt)}return true
 }
 if(evt.type==='sandChimes'){
  sound('secret',.9);toast('O vento toca cinco notas. A terceira repete exatamente o som do sino afogado.','gold');livingCompleteEvent(evt);return true
 }
 if(evt.type==='lowTideMessage'){
  const line=livingMysteryFound('undertow')?'A garrafa contém apenas sal e um mapa quase apagado.':'Dentro da garrafa: “quando a água recuar, olhe abaixo da linha que todos chamam de costa”.';toast(line,'gold');livingCompleteEvent(evt);return true
 }
 return false;
}
function livingCompleteEvent(evt){
 const s=livingState();if(!s.eventsSeen.includes(evt.type))s.eventsSeen.push(evt.type);G._livingLastEventType=evt.type;G._livingLastEventAt=G.playTime;finishDynamicEvent('complete');saveGame();
}
function livingEventReward(evt){
 const table={windPages:{coins:6,xp:16},forestEcho:{coins:4,xp:20},marshChoir:{coins:14,xp:24},sandChimes:{coins:10,xp:18},lowTideMessage:{coins:12,xp:20}};
 return table[evt?.type]||null;
}
function livingFinishBirdEvent(t){
 const evt=G.activeEvent;if(!evt||evt.id!==t.eventId||evt.type!=='forestEcho')return false;
 text(t.x,t.y-38,'PIPOCA OUVIU','#f4dfa0',10);burst(t.x,t.y,'#cfe3ae',14,70);toast('Pipoca segue o eco até uma raiz oca. Dentro dela há cinco riscos na madeira — o mesmo padrão das marcas antigas.','gold');livingCompleteEvent(evt);return true;
}

function livingBirdTarget(s){
 const state=livingState();
 if(s.kind==='livingBirdSpot')return !state.keepsakes.includes(s.keepsakeId);
 if(s.kind==='livingMystery')return !livingMysteryFound(s.mysteryId)&&livingMysteryAvailable(s.mysteryId);
 if(s.kind==='livingEvent'&&s.eventSubtype==='forestEcho'&&G.activeEvent?.id===s.eventId)return true;
 return false;
}
function finishLivingBirdScout(t){
 const state=livingState();
 if(t.kind==='livingBirdSpot'){
  if(state.keepsakes.includes(t.keepsakeId))return true;state.keepsakes.push(t.keepsakeId);const d=LIVING_KEEP_SAKES[t.keepsakeId];
  text(t.x,t.y-35,'TESOURO DO PIPOCA','#f4dfa0',10);burst(t.x,t.y,'#eee2b2',10,55);toast('Pipoca encontrou: '+d.name+'. '+d.desc,'gold');sound('bird',.85);
  if(state.keepsakes.length>=4&&!state.keepsakeReward){state.keepsakeReward=true;unlockAchievement('pigeonCurator');toast('Pipoca agora possui uma coleção. Ninguém sabe por quê.','gold')}
  saveGame();return true
 }
 if(t.kind==='livingMystery'){
  t.revealed=true;bird.hintTarget=t;bird.hintTime=8;text(t.x,t.y-38,'PIPOCA INSISTE','#f4dfa0',10);toast('Pipoca está bicando uma pedra com um desenho que parece intencional.');return true
 }
 if(t.kind==='livingEvent'&&t.eventSubtype==='forestEcho')return livingFinishBirdEvent(t);
 return false;
}

function livingNpcPriorityMood(id){
 const s=livingState(),recent=G._livingLastEventAt&&G.playTime-G._livingLastEventAt<45;
 if(s.mysteryResolved){return id==='nena'?'Eu redesenhei a ilha três vezes depois daquelas marcas. Em todas, o abrigo fica no centro de uma costa diferente. Isso não me tranquiliza.':id==='damiao'?'Então a ilha anda. Ótimo. Eu já achava peixe difícil de acompanhar.':'Metal muda de forma. Ilha mudar de lugar já é abuso de profissão.'}
 if(s.mystery.length>=3){return id==='nena'?'Essas marcas não são decoração. Traga todas antes que eu comece a desenhar teorias que vão me envergonhar.':id==='damiao'?'Cinco marcas, você disse? Pescador aprende cedo: quando cinco histórias repetem a mesma mentira, talvez seja verdade.':'Se as marcas são antigas, procure o que não enferrujou junto com elas.'}
 if(recent){const t=G._livingLastEventType;if(id==='nena'&&t==='windPages')return 'Então meus rascunhos realmente voaram. Eu ia culpar Pipoca, mas desta vez o vento tem álibi.';if(id==='damiao'&&t==='lowTideMessage')return 'Garrafa velha na vazante? Guarde a mensagem. O mar só devolve coisa quando quer que alguém leia.';if(id==='ivo'&&t==='sandChimes')return 'Cinco notas no vento. Metal antigo adora repetir padrão. Eu começaria a contar.'}
 return null;
}
function livingNpcMysteryLine(id){
 const s=livingState(),n=s.mystery.length;
 if(!n)return 'Marcas? Ainda não vi nada que mereça esse nome.';
 if(s.mysteryResolved)return id==='nena'?'As cinco não indicavam destino. Eram cinco medições da mesma ilha em épocas diferentes.':id==='damiao'?'Se a costa anda devagar o bastante, pescador chama de maré. Se anda por séculos, chama de lenda.':'Eu só sei que alguém fez aquelas marcas com ferramenta melhor que muita coisa nova.';
 const missing=LIVING_MYSTERY_IDS.find(k=>!s.mystery.includes(k)),zone=missing?LIVING_MYSTERY[missing].zone:null,where={meadow:'nos Campos',forest:'no Bosque',marsh:'no Brejo',dunes:'nas Dunas',reef:'no Recife'}[zone];
 return id==='nena'?`${n}/5 marcas. Elas compartilham escala e orientação. Ainda falta alguma coisa ${where||'na ilha'}.`:id==='damiao'?`${n} marcas e nenhuma aponta para peixe. Mesmo assim, eu procuraria ${where||'onde a água muda'}.`:`${n} marcas. Se encontrar outra, repare no desgaste: ferramenta e idade contam mais que desenho.`;
}
function livingRumorVariant(id,key){
 const lines={
  windPages:{nena:'O vento levou meus rascunhos de novo. Se vir folhas marcadas pela ilha, provavelmente eram minhas.',damiao:'Nena perdeu papel no vento suficiente para embrulhar um barco. Se achar folha voando, já sabe de quem é.',ivo:'Com esse vento, desenho solto vira projétil. Nena está atrás dos mapas que escaparam.'},
  forestEcho:{nena:'O Bosque devolve certos sons com atraso errado. Não parece eco comum.',damiao:'Tem gente jurando que o Bosque assobia de volta. Eu não assobiaria primeiro.',ivo:'O eco do Bosque não respeita distância. Isso me incomoda mais do que fantasma.'},
  marshChoir:{nena:'No Brejo, três luzes às vezes se alinham como se seguissem uma rota.',damiao:'Luz andando em fila no Brejo não é vagalume. Pelo menos vagalume decente não faz formação.',ivo:'As luzes do Brejo repetem padrão. Se forem naturais, a natureza está muito organizada.'},
  sandChimes:{nena:'As Dunas escondem cinco notas que só aparecem quando o vento encontra o ângulo certo.',damiao:'Tem sino nas Dunas sem torre nenhuma. Vento bom toca cinco notas e vai embora.',ivo:'Ouvi cinco frequências metálicas nas Dunas. Alguma estrutura enterrada ainda responde ao vento.'},
  lowTideMessage:{nena:'A vazante está devolvendo garrafas antigas. Algumas parecem ter sido lançadas de uma costa que não está mais no mapa.',damiao:'A maré baixa anda cuspindo garrafa que ninguém daqui lembra de ter jogado. Mar tem memória ruim e longa.',ivo:'As garrafas da vazante têm desgaste incompatível com a costa atual. Eu recolheria uma antes que a água leve de volta.'}
 };
 return lines[key]?.[id]||lines[key]?.nena||null
}
function livingRumorLine(id){
 const s=livingState(),z=zoneAt(player.x,player.y).id,w=weatherNow().id,ph=dayPhaseAt().id;
 if(!s.eventsSeen.includes('windPages')&&['wind','storm'].includes(w))return livingRumorVariant(id,'windPages');
 if(!s.eventsSeen.includes('forestEcho')&&(w==='fog'||['noite','madrugada'].includes(ph)))return livingRumorVariant(id,'forestEcho');
 if(!s.eventsSeen.includes('marshChoir')&&['noite','madrugada'].includes(ph))return livingRumorVariant(id,'marshChoir');
 if(!s.eventsSeen.includes('sandChimes')&&['wind','storm'].includes(w))return livingRumorVariant(id,'sandChimes');
 if(!s.eventsSeen.includes('lowTideMessage')&&lowTideOpen())return livingRumorVariant(id,'lowTideMessage');
 if(s.mystery.length>0&&s.mystery.length<5)return livingNpcMysteryLine(id);
 return null;
}
function livingMaraLine(){
 const s=livingState();if(s.mysteryResolved)return 'Nena passou a noite espalhando mapas na minha mesa. Só digo uma coisa: se a ilha resolver andar de novo, ela leva o aluguel junto.';
 if(s.mystery.length>=3)return 'Nena perguntou se você encontrou mais daquelas marcas. Eu respondi que você encontra problema até quando tenta sentar num banco.';
 if(stateRecentLivingEvent('windPages'))return 'Nena passou por aqui recolhendo o que restou dos rascunhos. O vento levou metade. Pipoca tentou levar a outra metade.';
 return null;
}
function stateRecentLivingEvent(type){return G._livingLastEventType===type&&G._livingLastEventAt&&G.playTime-G._livingLastEventAt<60}
function livingAchievementProgress(id){const s=livingState();if(id==='undertowMap')return s.mysteryResolved?'RESOLVIDO':`${s.mystery.length}/5`;if(id==='pigeonCurator')return `${Math.min(4,s.keepsakes.length)}/4`;return null}

function livingJournalHTML(){
 const s=livingState();if(!s.mystery.length&&!s.keepsakes.length&&!s.interactions.length)return '';
 let html='<section class="v3-journal"><div class="eyebrow">COISAS QUE A ILHA NÃO EXPLICA</div>';
 if(s.mystery.length){html+=`<p><b>As Cinco Marcas</b> · ${s.mystery.length}/5${s.mysteryResolved?' · mistério compreendido':''}. Nenhuma missão exige estas pistas.</p><div class="v3-journal-grid">`+LIVING_MYSTERY_IDS.map(id=>{const d=LIVING_MYSTERY[id],found=s.mystery.includes(id);return found?`<button class="v3-journal-card ${s.mysteryResolved?'done':''}" data-living-mark="${id}"><span>MARCA REGISTRADA</span><strong>${d.name}</strong><small>${d.clue}</small></button>`:`<div class="v3-journal-card unknown"><span>${{meadow:'CAMPOS',forest:'BOSQUE',marsh:'BREJO',dunes:'DUNAS',reef:'RECIFE'}[d.zone]}</span><strong>Marca ausente</strong><small>Talvez a própria condição da região esconda o desenho.</small></div>`}).join('')+'</div>';if(s.mystery.length===5)html+=`<div class="v3-guide-state">As cinco marcas podem ser sobrepostas no abrigo de Mara.</div>`}
 if(s.keepsakes.length){html+=`<div class="v3-biome-notes"><b>Coleção particular do Pipoca · ${s.keepsakes.length}/${Object.keys(LIVING_KEEP_SAKES).length}</b><p>${s.keepsakes.map(id=>LIVING_KEEP_SAKES[id].name).join(' · ')}</p></div>`}
 if(s.interactions.length){html+=`<div class="footer-note">Pequenas interações encontradas: ${s.interactions.length}/${Object.keys(LIVING_INTERACTIONS).length}. Nem tudo na ilha existe para dar recompensa.</div>`}
 return html+'</section>';
}
function livingShowMark(id){const d=LIVING_MYSTERY[id];if(!d||!livingMysteryFound(id))return;setModal('livingMark',modalHeader(d.name,'ANOTAÇÃO DE NILO')+`<div class="dialogue">${d.clue}</div><p>${d.lore}</p><button id="living-mark-close" class="primary" style="width:100%">Fechar anotação</button>`);$('living-mark-close').onclick=closeOverlay}
function livingBindJournal(){for(const b of document.querySelectorAll('[data-living-mark]'))b.onclick=()=>livingShowMark(b.dataset.livingMark)}

// Extend the existing exploration journal without replacing V3.
const _livingBaseJournalHTML=v3JournalHTML;
v3JournalHTML=function(){return _livingBaseJournalHTML()+livingJournalHTML()};
const _livingBaseBindJournal=v3BindJournal;
v3BindJournal=function(){_livingBaseBindJournal();livingBindJournal()};

function livingSelfTest(){
 const errors=[],s=livingState(),clean=livingCleanExploration(s);
 if(JSON.stringify(clean.mystery)!==JSON.stringify(s.mystery))errors.push('living-mystery-state');
 if(new Set(LIVING_BIRD_SPOTS.map(v=>v.id)).size!==LIVING_BIRD_SPOTS.length)errors.push('living-keepsake-ids');
 for(const d of Object.values(LIVING_MYSTERY))if(!landAt(d.x,d.y,25))errors.push('living-mark-off-land');
 for(const d of Object.values(LIVING_INTERACTIONS))if(!landAt(d.x,d.y,25))errors.push('living-interaction-off-land');
 return errors;
}

window.MareLivingIsland={
 report(){const s=livingState();return {build:BUILD_ID,mystery:[...s.mystery],mysteryResolved:s.mysteryResolved,interactions:[...s.interactions],keepsakes:[...s.keepsakes],eventsSeen:[...s.eventsSeen],conditionalNow:livingConditionalEventType()}}
};
