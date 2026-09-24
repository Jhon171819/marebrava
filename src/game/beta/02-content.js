'use strict';
// Maré Brava — Definições de conteúdo: habilidades, inimigos, NPCs, equipamentos, segredos e quests.
const SKILLS=[{id:'line',branch:'CORDAME',name:'Corda longa',icon:'hook',desc:'+70 de alcance e retorno mais r\u00e1pido por grau.',max:3},{id:'harpoon',branch:'CORDAME',name:'Punho de ferro',icon:'sword',desc:'+11 de dano no gancho. A puxada tamb\u00e9m machuca.',max:3,requires:'line'},{id:'bird',branch:'ASAS',name:'Pombo de guerra',icon:'bird',desc:'+6 de dano e ataques autom\u00e1ticos mais frequentes.',max:3},{id:'rain',branch:'ASAS',name:'Chuva branca',icon:'rain',desc:'Mais \u00e1rea de impacto e +0,5 s de atordoamento.',max:3,requires:'bird'},{id:'vigor',branch:'INSTINTO',name:'Cora\u00e7\u00e3o de sal',icon:'heart',desc:'+25 de vida m\u00e1xima e 5% de resist\u00eancia por grau.',max:3},{id:'agility',branch:'INSTINTO',name:'Passo fantasma',icon:'dash',desc:'Esquiva mais barata, r\u00e1pida e com menor recarga.',max:3,requires:'vigor'}];
const GUARDIANS=[{id:'moss',x:2470,y:1080,name:'Garra de Musgo',type:'crab',level:2,hp:210,color:'#71956b',seal:'Musgo'},{id:'mire',x:2700,y:3470,name:'Lodo Antigo',type:'slime',level:3,hp:285,color:'#55a895',seal:'Lodo'},{id:'bronze',x:4260,y:1800,name:'Pin\u00e7a de Bronze',type:'crab',level:4,hp:340,color:'#c9a454',seal:'Bronze'}];
const MINIBOSS_DEFS={
 galeShell:{name:'Casco do Vendaval',zone:'meadow',type:'crab',x:2050,y:2500,level:2,hp:150,damage:13,speed:92,xp:75,variant:'reversalGuard',stinger:'DEFESA FRONTAL · QUEBRE A GUARDA'},
 hollowKing:{name:'Oco-Rei',zone:'forest',type:'mushroom',x:3200,y:1200,level:3,hp:175,damage:13,speed:42,xp:90,variant:'sporeBloom',stinger:'ESPOROS EM CAMADAS · SAIA DA ÁREA'},
 splitLight:{name:'Luz Fendida',zone:'marsh',type:'wisp',x:3000,y:3400,level:4,hp:165,damage:14,speed:124,xp:100,variant:'echoBlink',stinger:'TELEPORTE EM ECO · NÃO FIQUE PARADO'},
 rustRam:{name:'Aríete Ferrugem',zone:'dunes',type:'bandit',x:4050,y:1500,level:4,hp:195,damage:15,speed:110,xp:110,variant:'crossfire',stinger:'FOGO CRUZADO · ENCURTE A DISTÂNCIA'},
 saltJaw:{name:'Mandíbula de Sal',zone:'reef',type:'sponge',x:4700,y:2500,level:5,hp:220,damage:16,speed:100,xp:125,variant:'frenzyPack',stinger:'FRENESI DE BANDO · SEPARE O GRUPO'}
};
const BOSS_POS={x:4220,y:2990};
const TIDE_SHOALS=[{x:5030,y:3030,r:72},{x:5095,y:3052,r:78},{x:5165,y:3074,r:105}];
const TIDE_TREASURES=[{id:'reef-cache',x:5180,y:3060,name:'Cofre da Maré Baixa'}];
const ACHIEVEMENT_DEFS={
 hook50:{name:'MÁ IDEIA EXCELENTE',desc:'Puxe 50 inimigos com o gancho.',icon:'hook'},
 birdTriple:{name:'POMBO NUCLEAR',desc:'Derrote 3 inimigos com um único ataque do Pipoca.',icon:'bird'},
 noPotionBoss:{name:'NÃO PRECISAVA DISSO',desc:'Derrote Esponjão sem usar poção nesta aventura.',icon:'potion'},
 tourist:{name:'TURISTA',desc:'Visite todas as cinco regiões da ilha.',icon:'map'},
 perfect10:{name:'NO ÚLTIMO INSTANTE',desc:'Realize 10 esquivas perfeitas.',icon:'dash'},
 tideCache:{name:'O MAR DEVOLVEU',desc:'Abra um tesouro revelado pela maré baixa.',icon:'seal'},
 birdScout:{name:'O POMBO SABIA',desc:'Deixe Pipoca farejar um segredo do mundo.',icon:'bird'},
 ngClear:{name:'A MARÉ LEMBRA',desc:'Conclua uma jornada em New Game+.',icon:'seal'},
 undertowMap:{name:'A ILHA SE MOVE',desc:'Compreenda o significado das cinco marcas antigas.',icon:'map'},
 pigeonCurator:{name:'PATRIMÔNIO DO PIPOCA',desc:'Deixe Pipoca montar uma coleção de quatro achados questionáveis.',icon:'bird'}
};
const NPC_DEFS={
 nena:{name:'Nena Cartógrafa',role:'CARTÓGRAFA',day:{x:2055,y:1715},night:{x:1335,y:2535},camp:{x:1360,y:2585}},
 damiao:{name:'Damião da Rede',role:'PESCADOR',day:{x:3910,y:2715},night:{x:2585,y:3150},camp:{x:2510,y:3090}},
 ivo:{name:'Ivo Ferrugem',role:'FERREIRO ERRANTE',day:{x:3570,y:2155},night:{x:1305,y:2650},camp:{x:1390,y:2640}}
};
const EQUIPMENT_DEFS={
 navigator_hook:{name:'Gancho do Navegador',slot:'tool',icon:'hook',desc:'Engata argolas antigas e puxa Nilo até pontos antes inalcançáveis. Também amplia o alcance do gancho.'},
 wet_boots:{name:'Botas Encharcadas',slot:'boots',icon:'dash',desc:'Quase anulam terreno pegajoso e raízes. Na chuva, Nilo ganha mobilidade extra.'},
 mara_coat:{name:'Casaco de Mara',slot:'coat',icon:'shield',desc:'Absorve parte do primeiro golpe recebido após recarregar sua proteção.'},
 coral_ring:{name:'Anel de Coral',slot:'ring',icon:'seal',desc:'Esquivas perfeitas liberam uma onda que atordoa inimigos próximos e refresca o gancho.'},
 undertow_ring:{name:'Anel da Contramaré',slot:'ring',icon:'rain',desc:'Recompensa de NG+: um parry perfeito arma o próximo golpe carregado, que não gasta stamina e causa impacto ampliado.'}
};
const SECRET_DEFS={
 windWatch:{name:'Mirante do Vento',x:1760,y:1260,hint:'Uma elevação antiga no Bosque. O vento denuncia pedras que não pertencem ali.',xp:24,coins:14},
 moonWell:{name:'Poço da Lua',x:3025,y:3540,hint:'No Brejo, uma água parada só revela seu brilho quando a ilha escurece.',xp:32,coins:16,nightOnly:true},
 sunkenBell:{name:'Sino Afogado',x:4480,y:3260,hint:'No Recife, procure metal onde só deveria haver coral.',xp:35,coins:18},
 ancientAnchor:{name:'Âncora do Navegador',x:3260,y:1785,hint:'Uma corrente antiga nas Dunas não cede a mãos. Talvez ceda ao gancho.',xp:38,coins:20,requiresHook:true},
 coralHollow:{name:'Fenda de Coral',x:4750,y:2475,hint:'Corais fecham uma pequena passagem onde a maré não alcança.',xp:28,coins:22},
 pipocaNest:{name:'Ninho Improvisado de Pipoca',x:2230,y:1435,hint:'Há penas brancas demais perto de uma ruína do Bosque.',xp:18,coins:8},
 firstWind:{name:'Marco do Primeiro Vento',x:1880,y:2350,hint:'Nos Campos, uma pedra baixa aponta para um caminho que já não existe.',xp:20,coins:10},
 whistlingPost:{name:'Poste Assobiador',x:2250,y:2750,hint:'Uma estaca antiga nos Campos só canta quando o vento aperta.',xp:30,coins:12,weatherOnly:['wind','storm']},
 glassGarden:{name:'Jardim de Vidro',x:4350,y:1250,hint:'Nas Dunas, procure brilho onde a areia deveria apagar tudo.',xp:35,coins:20}
};
const GRAPPLE_ANCHORS=[
 {id:'ga-forest',x:2360,y:1280,name:'Argola do Bosque'},
 {id:'ga-marsh',x:3000,y:3190,name:'Argola do Brejo'},
 {id:'ga-dunes',x:4010,y:1740,name:'Argola das Dunas'},
 {id:'ga-reef',x:4320,y:2730,name:'Argola do Recife'}
];
const QUEST_DEFS={
 nena_marks:{giver:'nena',arc:1,title:'As marcas que o mar apagou',summary:'Nena quer comparar dois pontos que somem dos mapas antigos.',objectives:[
  {type:'discover',target:'windWatch',text:'Encontre o Mirante do Vento no Bosque.'},
  {type:'discover',target:'moonWell',text:'Encontre o Poço da Lua durante a noite.'},
  {type:'talk',target:'nena',text:'Volte para Nena com as duas referências.'}
 ],reward:{xp:75,coins:30,item:'wet_boots'}},
 nena_hollow:{giver:'nena',arc:2,requiresQuest:'nena_marks',title:'O mapa que não devia existir',summary:'Uma área do Bosque muda entre versões do mapa. Nena suspeita que algo esteja ocupando o lugar.',objectives:[
  {type:'killMiniboss',target:'hollowKing',text:'Encontre e derrote Oco-Rei no Bosque Sussurrante.'},
  {type:'discover',target:'pipocaNest',text:'Procure as penas brancas perto das ruínas do Bosque.'},
  {type:'talk',target:'nena',text:'Leve a Nena a explicação para o trecho que mudava no mapa.'}
 ],reward:{xp:115,coins:55,points:1}},
 damiao_bell:{giver:'damiao',arc:1,title:'O sino que o mar não levou',summary:'Damião jura ouvir um sino no Recife quando a corrente muda.',objectives:[
  {type:'discover',target:'sunkenBell',text:'Localize o Sino Afogado no Recife Esquecido.'},
  {type:'talk',target:'damiao',text:'Conte a Damião o que encontrou.'}
 ],reward:{xp:70,coins:35,item:'coral_ring'}},
 damiao_teeth:{giver:'damiao',arc:2,requiresQuest:'damiao_bell',title:'Dentes na arrebentação',summary:'Alguma coisa grande demais está rasgando as redes na maré baixa.',objectives:[
  {type:'killMiniboss',target:'saltJaw',text:'Derrote Mandíbula de Sal no Recife Esquecido.'},
  {type:'tideTreasure',target:'reef-cache',text:'Abra o Cofre da Maré Baixa enquanto o caminho estiver exposto.'},
  {type:'talk',target:'damiao',text:'Volte para Damião antes que ele invente outra teoria.'}
 ],reward:{xp:120,coins:70}},
 ivo_anchor:{giver:'ivo',arc:1,title:'Ferro que não devia boiar',summary:'Ivo quer saber por que uma velha âncora ainda responde ao metal do gancho.',objectives:[
  {type:'hookSecret',target:'ancientAnchor',text:'Use o gancho na Âncora do Navegador nas Dunas.'},
  {type:'talk',target:'ivo',text:'Volte para Ivo e descreva a reação da corrente.'}
 ],reward:{xp:85,coins:40,item:'navigator_hook'}},
 ivo_ram:{giver:'ivo',arc:2,requiresQuest:'ivo_anchor',title:'Ferrugem que anda',summary:'Ivo reconheceu marcas recentes no metal. O dono delas ainda está andando pelas Dunas.',objectives:[
  {type:'killMiniboss',target:'rustRam',text:'Encontre e derrote Aríete Ferrugem nas Dunas Douradas.'},
  {type:'talk',target:'ivo',text:'Mostre a Ivo o que restou do problema.'}
 ],reward:{xp:115,coins:60,points:1}},
 mara_noise:{giver:'mara',arc:1,title:'Barulho perto demais',summary:'Mara está cansada de ouvir pinças batendo perto demais do abrigo.',objectives:[
  {type:'killMiniboss',target:'galeShell',text:'Afaste Casco do Vendaval dos Campos do Vento.'},
  {type:'talk',target:'mara',text:'Volte ao abrigo e avise Mara.'}
 ],reward:{xp:55,coins:30}},
 mara_light:{giver:'mara',arc:2,requiresQuest:'mara_noise',requiresSeals:1,title:'Luz ruim no Brejo',summary:'Depois do primeiro selo, uma luz diferente começou a rondar o caminho do abrigo.',objectives:[
  {type:'killMiniboss',target:'splitLight',text:'Derrote Luz Fendida no Brejo Brilhante.'},
  {type:'talk',target:'mara',text:'Conte a Mara o que estava seguindo a trilha.'}
 ],reward:{xp:95,coins:45}},
 mara_before_tide:{giver:'mara',arc:3,requiresQuest:'mara_light',requiresSeals:2,title:'Antes da última maré',summary:'Mara quer que todos saibam que a próxima ida ao Recife pode ser a última.',objectives:[
  {type:'talk',target:'nena',text:'Avise Nena sobre a reta final.'},
  {type:'talk',target:'damiao',text:'Avise Damião sobre a reta final.'},
  {type:'talk',target:'ivo',text:'Avise Ivo sobre a reta final.'},
  {type:'talk',target:'mara',text:'Volte para Mara antes de seguir ao Recife.'}
 ],reward:{xp:150,coins:90,points:1}}
};

