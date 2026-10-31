# Maré Brava — relatório técnico do sistema de combate

Data de referência: 3 de outubro de 2026, America/Fortaleza. Projeto: `mare-brava`, versão de pacote `2.6.0`, build de gameplay `4.2-world5-gd028-final-player-experience`, Save V7.

Este relatório descreve o código presente no diretório de trabalho, incluindo alterações locais ainda não commitadas. O commit-base é `c614668bc23b83f940abb243a8c331e37f5f2c36`; ele sozinho não identifica esta versão. O [manifesto da auditoria](./manifesto.json) registra hashes SHA-256 dos arquivos efetivamente analisados. O jogo não foi alterado para produzir o relatório.

A documentação é composta por este relatório explicativo, um [anexo de fontes integrais](./anexo-fontes.md), um [catálogo de funções e chamadas](./catalogo-funcoes.md) e um [inventário estruturado](./inventario-funcoes.json). O anexo preserva o conteúdo completo dos arquivos incluídos, inclusive funções auxiliares, comentários, constantes, listeners e versões de diagnóstico. As referências ao projeto apontam para as linhas originais; os trechos inseridos aqui têm apenas formatação normalizada. O anexo contém os originais exatos.

“Completo” significa cobrir a implementação disponível e suas dependências de combate: entrada, estado, simulação, ações, dano, IA, inimigos, chefes, equipamentos, progressão, mundo, eventos, interface, animação, morte, vitória, save e diagnóstico. A análise estática e os testes existentes não provam ausência de bugs nem comportamento em todos os dispositivos. Diferenças entre intenção textual e execução estão explicitamente registradas.

## 1. Arquitetura e ordem real de execução

O gameplay é JavaScript procedural, com estado compartilhado. Os scripts de `src/game/beta/` são concatenados na ordem de `manifest.json`. Diversos arquivos guardam uma função anterior em uma variável `_...` e depois reatribuem a função pública. Portanto, ler somente `03-gameplay.js` deixa de fora regras que estão ativas na versão final.

| Arquivo/camada | Responsabilidade relacionada ao combate |
|---|---|
| `00-boot.js` | Inicialização, falhas de carregamento, diagnóstico de boot. |
| `01-core.js` | `G`, `player`, arrays de entidades, `BALANCE`, `PLAYTEST`, `POLISH`, preferências, áudio de apresentação e feedback. |
| `01a-mobile-render.js` | Cadência de simulação e desenho, compatibilidade Canvas, custos de CPU e orçamento mobile. |
| `02-content.js` | Habilidades, guardiões, minibosses, equipamentos, conquistas, quests e posições. |
| `02a-story-content.js` | Dados das cenas ligadas aos selos, chefe e Contramaré. |
| `03-gameplay.js` | Ações, dano, IA, entidades, colisão, progressão, eventos, save e criação do mundo. |
| `04-renderer.js` | `update`, renderização dos ataques, inimigos, perigos e avisos. |
| `05-ui-save.js` | HUD, execução contextual, habilidades, abrigo, pausa, morte, vitória e viagem. |
| `06-world-v3.js` | Cobertura, vegetação, vento, brejo, barreiras, mecanismos, gancho e tarefa de Pipoca. |
| `06a-living-island.js` / `06b-exploration-rhythm.js` | Eventos e exploração que disputam atenção, comandos e espaço com o combate. |
| `06c-journey-telemetry.js` | Registro local da jornada, encontros, mortes, interações e estados. |
| `06e-encounter-rhythm.js` | Áreas tranquilas, respiração entre encontros, redução de percepção e substituição de eventos. |
| `06f-mastery-discovery-puzzle.js` | Interrupções de ataques, vulnerabilidade após ataques e quebra da matilha. |
| `06g-quests-builds-bosses.js` | Sinergias, equipamentos de miniboss, segunda fase e recuperação do chefe. |
| `06h-mobile-performance-contramare.js` | Regras rotativas de NG+, interface touch e proteção de runtime. |
| `06i-final-player-polish.js` | Feedback dos combos, lembretes após combate e resumo da vitória. |
| `06j-story-runtime.js` | Cenas e falas do chefe, selos e adiamento da vitória enquanto há narrativa pendente. |
| `08-input.js` | Teclado, mouse, joystick, touch, perda de foco e cancelamento de ações. |
| `09-loop-bootstrap.js` | `requestAnimationFrame`, pausa, hit stop, atualização e desenho. |
| `src/game/graphics.js` / `src/graphics/profiles.js` | Adaptação gráfica final, independente da escolha posterior de qualidade para o orçamento de IA. |
| `src/pixi-player.js` / `src/characters/*` | Apresentação de Nilo em Pixi e fallback Canvas. |
| `scripts/build-game.mjs` | Define a composição final e aplica ajustes às fontes antes de gerar o jogo. |

O bundle seguro exclui `06c0-agent-config.js`, `06d-ai-player-harness.js` e `07-debug.js`. `--diagnostics` inclui esses arquivos. O build seguro remove APIs públicas `window.Mare...` de diagnóstico, encerra o gameplay em uma IIFE com `'use strict'` e mantém uma ponte de renderização recebida por evento DOM. `DEBUG` e vários contadores internos ainda existem; excluir o painel não equivale a excluir toda instrumentação. A telemetria de jornada permanece no bundle e sua exportação aparece na pausa.

### 1.1 Encadeamentos que alteram o resultado

| Função final | Ordem de entrada da chamada, da camada externa para a interna |
|---|---|
| `damageEnemy` | GD027 → rastreamento GD026 da última fonte → multiplicadores GD026 → interrupções Quality → dano-base. |
| `hurtPlayer` | Reduções GD026 de equipamentos → dano-base; este chama a versão final de `tryParry` e de `triggerPerfectDodge`. |
| `tryParry` | Bônus Surge GD027 → redução de recarga GD026 → parry-base. |
| `triggerPerfectDodge` | Bônus híbridos e anel Split GD026 → esquiva perfeita-base. |
| `killEnemy` | Story → prêmio de primeira conclusão NG+ GD027 → espólio/anel Salt GD026 → quebra de matilha Quality → morte-base. |
| `updateSmartEnemy` | Fase 2 GD026 de miniboss → IA-base. |
| `resolveEnemyStrike` | Janela de domínio Quality → resolução-base; o pós-processamento vem depois do ataque-base. |
| `resolveBossAttack` | Recuperação/vulnerabilidade GD026 → resolução-base; o chamador `updateBoss` ainda escreve em `recover` depois. |
| `updateBoss` | Story → chefe-base. |
| `applyNgPlusEnemy` | Regra rotativa GD027 → escalonamento NG+-base. |
| `hookCooldown` | Regra Iron GD027 → equipamento/sinergia GD026 → fórmula-base. |
| `birdCooldown` / `dashCooldown` | Regra Echo/Surge GD027 → fórmula-base. |
| `collectLoot` | Notificação Story de selo → coleta-base. |
| `showVictory` | Espera Story → resumo Final Polish → cartão GD027 → modal-base. |
| `update` | Runtime Guard GD027 → descoberta Quality → pré/pós Encounter Rhythm → Journey Tick → atualização-base. |

O catálogo complementar lista todas as definições e reatribuições encontradas, com localização e chamadas diretas. Uma chamada em uma função-base procura a variável global atual: por exemplo, `attack()` chama o `damageEnemy` final, não apenas a declaração original.

## 2. Estado, unidades e relógios

As coordenadas são unidades do mundo em Canvas; distâncias e raios usam essa mesma unidade. Tempos de gameplay são segundos; `performance.now()` e `setTimeout()` usam milissegundos. Ângulos são radianos, com Y positivo para baixo. O mundo mede 5600 × 4400; Nilo tem raio lógico 13.

`G` guarda início/overlay, tempo visual e tempo da aventura, shake, hit stop, mortes, abates, selos, guardiões, vitória, inventário, equipamentos, quests, eventos, clima, maré e NG+. `player.combat` é um temporizador de contexto: não é uma identificação inequívoca de todos os inimigos que estão lutando. Ele é renovado para 5 s ao causar dano, 6 s ao sofrer dano e 2 s ao tentar ferir o chefe adormecido. Pode existir inimigo agressivo quando esse temporizador chega a zero.

Os arrays principais são `enemies`, `projectiles`, `hazards`, `props`, `loot`, `particles`, `texts` e `trails`. `hook` é um único objeto ou `null`; `bird` é o estado de Pipoca. `executionTarget` é recalculado pelo HUD; `nearby` representa interação contextual. Não existe múltiplo gancho simultâneo.

Fonte: [makePlayer — src/game/beta/03-gameplay.js:78](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:78). Trecho reformatado, sem mudança de regra.

```js
function makePlayer() {
  return { x: HOME.x + 27, y: HOME.y + 83, r: 13, hp: 120, stamina: 100, xp: 0, level: 1, coins: 0, potions: 0, points: 1, skills: { line: 0, harpoon: 0, bird: 0, rain: 0, vigor: 0, agility: 0 }, weapon: 0, angle: -0.25, moving: false, walk: 0, attackCD: 0, attackAnim: 0, attackAnimMax: 0.24, attackAngle: 0, attackStep: 1, comboStep: 0, comboTimer: 0, charging: false, chargeTime: 0, chargePulse: 0, chargeStage: 0, attackBuffer: 0, attackPressBuffered: false, undertowCharge: 0, dashCD: 0, dashTime: 0, dashX: 0, dashY: 0, invuln: 0, perfectWindow: 0, perfectReady: false, perfectFlash: 0, perfectCount: 0, parryCD: 0, parryWindow: 0, parryFlash: 0, parryCount: 0, counterWindow: 0, counterSource: "", slowTime: 0, coatCD: 0, hookCD: 0, potionCD: 0, flash: 0, combat: 0 };
}
```

Os principais campos transitórios de Nilo são:

| Grupo | Campos e significado |
|---|---|
| Ataque | `attackCD`, `attackAnim`, `attackAnimMax`, `attackAngle`, `attackStep`. Passos 1–3 são combo; 4 é carregado; 5 é execução. |
| Combo | `comboStep`, `comboTimer`; a continuidade expira após 0,62 s. |
| Carga | `charging`, `chargeTime`, `chargePulse`, `chargeStage`; carga lógica limitada a 1 s. |
| Buffer | `attackPressBuffered`, `attackBuffer`; tolerância de entrada de 0,14 s no fim da recarga. |
| Esquiva | `dashCD`, `dashTime`, `dashX/Y`, `invuln`, `perfectWindow`, `perfectReady`, `perfectFlash`, `perfectCount`. |
| Parry | `parryCD`, `parryWindow`, `parryFlash`, `parryCount`. |
| Contra-ataque | `counterWindow`, `counterSource`; janela de bônus de dano consumível. |
| Equipamento | `coatCD`, `undertowCharge` e campos `_gd026...` criados pelas sinergias. |
| Condições | `slowTime`, `flash`, `combat`, `hookCD`, `potionCD`, stamina e HP. |

`updatePlayer()` reduz os temporizadores listados no código com `max(0, valor-dt)`. Entre eles estão `counterWindow` e `undertowCharge`. Já `_gd026BirdTempo` e `_gd026SplitCharge` não aparecem nessa lista: não expiram por esse mecanismo.

### 2.1 Loop lógico e pausa

O loop obtém o intervalo real desde o último frame. No desktop, a lógica limita `dt` a 0,05 s. `mobileLogicDelta()` acumula intervalos muito curtos e limita o passo mobile; ver o código integral para a política de carry. Se `G.started && !G.overlay`, o loop aumenta `PLAYTEST.seconds` e executa `update(dt)`, exceto enquanto `G.hitStop > 0`: nesse caso, reduz o hit stop e suspende a atualização do gameplay naquele frame. `updatePolish()` continua atualizando a apresentação; o build também chama `finalCombatHeartbeat()` nesse ponto. Com overlay, o gameplay fica suspenso e `G.time` avança com metade do `dt`.

A ordem interna da atualização é: tempo → clima → maré → NPCs/ambiente → segredos → eventos → ilha viva → redução de shake → Nilo → gancho → inimigos → projéteis/perigos → loot → Pipoca → pedras de viagem/vitória → mundo V3 → partículas → save automático/HUD → câmera. Os wrappers fazem pré/pós-processamento ao redor dessa ordem. Por isso, dano de um projétil e dano de uma ação de entrada não necessariamente ocorrem na mesma etapa.

Pausar zera entradas, movimento touch, carga e buffer. Perder foco abre pausa, cancela entradas; ocultar a página também salva. Ao voltar à visibilidade, o sistema redefine `lastTime` e o acumulador mobile para evitar um salto temporal. Timers de `setTimeout()` de DOM, morte, vitória e narrativa seguem o relógio do navegador; suas condições de guarda estão nos callbacks. Hit stop não torna esses callbacks timers de simulação.

## 3. Controles e seleção de alvo

| Ação | Entrada padrão | Caminho |
|---|---|---|
| Movimento | WASD, setas ou joystick | `movementVector()` → `updatePlayer()` → `v3Walk()`/`moveEntity()`. |
| Espada | Pressionar/soltar mouse esquerdo ou botão touch | `beginAttackCharge()` → `releaseAttackCharge()` → `attack()` ou `chargedAttack()`. O slot desktop chama `attack()` diretamente. |
| Gancho | Q ou mouse direito | `useHook()`; novo comando inicia puxada se já houver gancho. |
| Pipoca | F | `birdAttack(true)`, com prioridade para mecanismo V3. |
| Esquiva | Espaço ou Shift | `dash()`. |
| Aparar | C | `parry()`. |
| Poção | R | `drinkPotion()`. |
| Executar/interagir | E | `interact()`; execução tem prioridade sobre estrutura próxima. |
| Habilidades/mapa | K/Tab e M | Abrem overlays que interrompem o gameplay. |
| Equipamento/quests/conquistas | I/J/L | Overlays e opções relacionadas à progressão. |
| Pausa | Esc | `showPause()`. |

Gancho, Pipoca, esquiva, aparar, poção e menus usam `actionKey()` e podem ser remapeados. `remapAction()` troca uma tecla que já está ocupada com a antiga tecla da ação; rejeita Esc/F3/F4/crase. WASD/setas, Shift como alternativa e mouse não dependem desse mapa. Eventos repetidos de teclado atualizam `keys`, sem repetir imediatamente as ações discretas.

`updateJoy()` aplica limite proporcional ao tamanho do joystick, zona morta de 9% e resposta `gain = rawGain^0.78`. `movementVector()` soma teclado e touch e normaliza vetores cujo comprimento exceda 1. `pointercancel`, perda de captura e blur limpam entradas; soltar o botão de ataque libera a carga. O joystick marca `pointer.known=false`, ativando mira automática.

`screenToWorld()` desfaz centralização, zoom e deslocamento de câmera. `currentAim()` usa a posição do mouse quando conhecida; assistência 1/2 busca inimigos vivos a até 430, numa tolerância angular de `0.11 + aimAssist*0.09`, penalizando levemente distância no score. Chefes dormentes são excluídos. Sem mouse conhecido, procura o inimigo mais próximo a `350 + aimAssist*45`; se não houver, conserva `player.angle`. Mesmo assistência 0 mantém essa busca no modo sem mouse.

`nearestEnemy(p,range,allowDormant=false)` varre o array e escolhe distância estritamente menor que o limite. As ações não usam todas o mesmo seletor: espada usa cone da mira, gancho usa trajetória e alvo de mecanismo, Pipoca usa alvo mais próximo da mira ou de Nilo, e execução usa proximidade mais HP baixo.

## 4. Vida, dano-base, stamina e mobilidade

Fonte: [maxHP — src/game/beta/03-gameplay.js:72](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:72). Trecho reformatado, sem mudança de regra.

```js
function maxHP() {
  return 120 + (player.level - 1) * 18 + player.skills.vigor * 25;
}
```
Fonte: [attackDamage — src/game/beta/03-gameplay.js:72](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:72). Trecho reformatado, sem mudança de regra.

```js
function attackDamage() {
  return 20 + (player.level - 1) * 3.8 + player.weapon * 6;
}
```
Fonte: [xpNextFor — src/game/beta/03-gameplay.js:72](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:72). Trecho reformatado, sem mudança de regra.

```js
function xpNextFor(level) {
  level = Math.max(1, Math.floor(Number(level) || 1));
  return 3 * Math.round(BALANCE.progression.levelBase + level * BALANCE.progression.levelLinear + level * level * BALANCE.progression.levelCurve);
}
```

As fórmulas são:

| Valor | Fórmula efetiva básica |
|---|---|
| HP máximo | `120 + (level-1)*18 + vigor*25`. |
| Dano-base da espada | `20 + (level-1)*3.8 + weapon*6`. |
| XP para o próximo nível | `3 * round(70 + level*36 + level²)`. |
| Stamina máxima | 100. |
| Regeneração de stamina | `22 + agility*4` por segundo de atualização de Nilo. |
| Caminhada | 198 por segundo antes dos modificadores de terreno/clima. |
| Esquiva | 690 por segundo, com duração `0.19 + agility*0.018`. |
| Regeneração passiva de HP | 0,8 por segundo; 6/s fora de combate a menos de 160 do abrigo. |
| Mitigação de Vigor | Dano recebido × `(1-vigor*0.05)`, antes do arredondamento final. |

Stamina regenera também durante combate, carga e esquiva. A condição de regeneração de HP não elimina a cura fora do abrigo durante combate: o ramo alternativo aplica 0,8/s. O jogo chama `updatePlayer()` somente se HP era positivo no início do bloco; ações de dano ainda podem reduzir HP a zero depois.

`staminaDenied()` destaca a barra por 320 ms, emite som e toast. A espada normal não consome stamina. Carga consome 18, salvo o anel Contramaré armado; esquiva consome `27-4*agility`; parry consome 10. Gancho e Pipoca não descontam stamina.

### 4.1 Colisão e deslocamento

`gridAdd()` indexa obstáculos estáticos em células de 180; `obstacles()` consulta a célula e oito vizinhas. `walkable()` exige solo, ausência de barreira V3 e distância suficiente dos obstáculos. `obstacleRadiusFor()` reduz o raio de vegetação para Nilo a 58% e de outros obstáculos a 80%; outros atores usam o raio completo.

`moveEntity()` tenta deslocamentos por eixo quando `ignore=false`. Isso permite deslizar em obstáculos. `ignore=true`, usado por vários recuos, investidas e puxadas, ignora a consulta comum de cenário, mas ainda exige terreno e ausência de sólido V3. O nome não significa atravessar qualquer obstáculo. No caso especial da argola da margem leste durante reeling, pode liberar a barreira da enseada.

## 5. Espada, combo, carga e buffer

### 5.1 Ataque normal — `attack()`

Rejeita ação sem partida, com overlay, morto, em recarga ou já carregando. Define tutorial/contadores, consome buffer, avança `comboStep` modularmente entre 1, 2 e 3 enquanto `comboTimer > 0`, e renova a janela para 0,62 s.

| Golpe | Recarga | Animação | Alcance | Limite angular absoluto | Multiplicador | Recuo base |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 0,31 s | 0,21 s | 76 | 1,22 rad | 1,00 | 10 |
| 2 | 0,34 s | 0,23 s | 82 | 1,30 rad | 1,10 | 14 |
| 3 | 0,48 s | 0,29 s | 92 | 1,42 rad | 1,34 | 27 |

O limite angular é a meia abertura: a abertura total é aproximadamente 139,8°, 149,0° e 162,7°. Para inimigos, o alcance soma `e.r`; a menos de 31, o código dispensa a restrição angular. Cada alvo faz sua própria rolagem aleatória de crítico: chance 10%, dano ×1,55. Fontes são `sword` nos dois primeiros golpes e `combo3` no terceiro.

O hit é calculado imediatamente na chamada, percorrendo todos os inimigos; não espera a lâmina desenhada completar o arco. Não há limite de um alvo por ataque. Recuo é `cfg.knock/e.weight`. Props usam alcance sem soma de raio, tolerância angular +0,13, ou distância <28, e são quebrados. O ataque é contado como hit se alcançou algum alvo geométrico/prop; isso não comprova dano efetivo, pois um chefe adormecido pode rejeitá-lo.

Fonte: [attack — src/game/beta/03-gameplay.js:207](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:207). Trecho reformatado, sem mudança de regra.

```js
function attack() {
  if (!G.started || G.overlay || player.hp <= 0 || player.attackCD > 0 || player.charging) return;
  G.tutorial.attacked = true;
  PLAYTEST.attacks++;
  player.attackBuffer = 0;
  player.attackPressBuffered = false;
  const step = player.comboTimer > 0 ? player.comboStep % 3 + 1 : 1;
  player.comboStep = step;
  player.comboTimer = 0.62;
  player.attackStep = step;
  const cfg = [null, { cd: 0.31, anim: 0.21, range: 76, arc: 1.22, mult: 1, knock: 10 }, { cd: 0.34, anim: 0.23, range: 82, arc: 1.3, mult: 1.1, knock: 14 }, { cd: 0.48, anim: 0.29, range: 92, arc: 1.42, mult: 1.34, knock: 27 }][step];
  player.attackCD = cfg.cd;
  player.attackAnim = player.attackAnimMax = cfg.anim;
  player.attackAngle = currentAim();
  player.angle = player.attackAngle;
  let hit = false;
  for (let e of enemies) {
    if (e.dead) continue;
    let d = dist(player, e), da = Math.atan2(Math.sin(angle(player, e) - player.attackAngle), Math.cos(angle(player, e) - player.attackAngle));
    if (d < cfg.range + e.r && (Math.abs(da) < cfg.arc || d < 31)) {
      const crit = Math.random() < 0.1, source = step === 3 ? "combo3" : "sword";
      damageEnemy(e, attackDamage() * cfg.mult * (crit ? 1.55 : 1), source, crit, step === 3);
      if (!e.dead && !(e.boss && !e.awake)) moveEntity(e, Math.cos(player.attackAngle) * cfg.knock / e.weight, Math.sin(player.attackAngle) * cfg.knock / e.weight, true);
      hit = true;
    }
  }
  for (let p of props) {
    if (p.dead) continue;
    let d = dist(player, p), da = Math.atan2(Math.sin(angle(player, p) - player.attackAngle), Math.cos(angle(player, p) - player.attackAngle));
    if (d < cfg.range && (Math.abs(da) < cfg.arc + 0.13 || d < 28)) {
      breakProp(p);
      hit = true;
    }
  }
  if (hit) PLAYTEST.hits++;
  PLAYTEST.maxCombo = Math.max(PLAYTEST.maxCombo, step);
  sound(hit ? step === 3 ? "heavy" : "hit" : "sword", step === 3 ? 1.15 : 1);
}
```

### 5.2 Entrada e buffer

`beginAttackCharge()` inicia carga se a ação está livre. Se existe recarga de até 0,14 s, marca `attackPressBuffered=true` e aceita a intenção sem iniciar carga. Ao soltar, `releaseAttackCharge()` converte essa intenção em `attackBuffer=0.14`. `updatePlayer()` executa `attack()` quando o buffer ainda está positivo e a recarga chegou a zero. A redução do timer precede esse teste; um passo grande pode consumir o buffer.

Carga iniciada normalmente zera o combo. Ao soltar antes de 0,42 s, executa ataque normal. A partir de 0,42 s, executa carregado. `updatePlayer()` limita `chargeTime` a 1 s, emite estágio pronto em 0,42 e estágio visual máximo em 0,9, além de partículas a intervalos. O máximo matemático do multiplicador só ocorre em 1 s.

Fonte: [beginAttackCharge — src/game/beta/03-gameplay.js:208](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:208). Trecho reformatado, sem mudança de regra.

```js
function beginAttackCharge() {
  if (!G.started || G.overlay || player.hp <= 0 || player.charging) return false;
  if (player.attackCD > 0) {
    if (player.attackCD <= 0.14) {
      player.attackPressBuffered = true;
      return true;
    }
    return false;
  }
  player.charging = true;
  player.chargeTime = 0;
  player.chargePulse = 0;
  player.chargeStage = 0;
  player.comboTimer = 0;
  return true;
}
```
Fonte: [releaseAttackCharge — src/game/beta/03-gameplay.js:209](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:209). Trecho reformatado, sem mudança de regra.

```js
function releaseAttackCharge() {
  if (player.attackPressBuffered) {
    player.attackPressBuffered = false;
    player.attackBuffer = 0.14;
    return true;
  }
  if (!player.charging) return false;
  const held = player.chargeTime;
  player.charging = false;
  player.chargeTime = 0;
  player.chargePulse = 0;
  player.chargeStage = 0;
  if (held >= 0.42) return chargedAttack(held);
  attack();
  return true;
}
```

### 5.3 Golpe carregado — `chargedAttack(held)`

`q=clamp((held-0.42)/0.58,0,1)`. Dano ×`(1.6+q*0.55)`; alcance `106+q*15`; recuo `35+q*13`. Chance de crítico 15%, multiplicador crítico 1,5. Abertura usa `abs(da)<1.5`, ou distância <34. Recarga 0,72 s, animação 0,42 s, fonte `charged`, passo visual 4.

Com `undertow_ring` equipado e `undertowCharge>0`, custo zero, dano ×1,25 adicional, alcance +10, recuo +8. O estado armado é consumido no início do golpe, mesmo que ele não acerte. Sem stamina, o código já incrementou `attacks` e `charged`, chama `attack()` como fallback e retorna `false`: os contadores podem contabilizar duas tentativas para a mesma soltura.

Props a menos do alcance são quebrados sem teste de arco. O golpe aplica hit stop de `0.055+q*0.03` até quando erra. A animação e os efeitos não são hitboxes.

Fonte: [chargedAttack — src/game/beta/03-gameplay.js:210](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:210). Trecho reformatado, sem mudança de regra.

```js
function chargedAttack(held = 0.42) {
  if (!G.started || G.overlay || player.hp <= 0 || player.attackCD > 0) return false;
  G.tutorial.attacked = true;
  PLAYTEST.attacks++;
  PLAYTEST.charged++;
  const primed = equipped("undertow_ring") && player.undertowCharge > 0, cost = primed ? 0 : 18;
  if (player.stamina < cost) {
    staminaDenied("Sem f\xF4lego para completar o golpe carregado.");
    attack();
    return false;
  }
  const charge = clamp((held - 0.42) / 0.58, 0, 1), mult = (1.6 + charge * 0.55) * (primed ? 1.25 : 1), range = 106 + charge * 15 + (primed ? 10 : 0), knock = 35 + charge * 13 + (primed ? 8 : 0);
  player.stamina -= cost;
  player.undertowCharge = 0;
  player.attackCD = 0.72;
  player.attackAnim = player.attackAnimMax = 0.42;
  player.attackStep = 4;
  player.comboStep = 0;
  player.attackAngle = currentAim();
  player.angle = player.attackAngle;
  let hit = false;
  for (let e of enemies) {
    if (e.dead) continue;
    let d = dist(player, e), da = Math.atan2(Math.sin(angle(player, e) - player.attackAngle), Math.cos(angle(player, e) - player.attackAngle));
    if (d < range + e.r && (Math.abs(da) < 1.5 || d < 34)) {
      const crit = Math.random() < 0.15;
      damageEnemy(e, attackDamage() * mult * (crit ? 1.5 : 1), "charged", crit, true);
      if (!e.dead && !(e.boss && !e.awake)) moveEntity(e, Math.cos(player.attackAngle) * knock / e.weight, Math.sin(player.attackAngle) * knock / e.weight, true);
      hit = true;
    }
  }
  for (let p of props) {
    if (!p.dead && dist(player, p) < range) {
      breakProp(p);
      hit = true;
    }
  }
  G.hitStop = Math.max(G.hitStop, 0.055 + charge * 0.03);
  if (!reducedMotion()) G.shake = Math.max(G.shake, 4 + charge * 2);
  if (hit) {
    PLAYTEST.hits++;
    PLAYTEST.chargedHits++;
  }
  sound(hit ? "heavy" : "sword", 1.2 + charge * 0.15);
  return true;
}
```

## 6. Esquiva, esquiva perfeita, parry e contra-ataque

### 6.1 `dash()`

A direção vem do movimento quando sua magnitude excede 0,1; caso contrário, da orientação atual de Nilo. Custo `27-4*agility`, duração `0.19+0.018*agility`, invulnerabilidade `0.28+0.03*agility`, janela perfeita `0.12+0.012*agility`, recarga `max(0.65,1.3-0.17*agility)`, alterada por Surge. A distância nominal em terreno livre é 131,1–168,36; colisão e discretização podem reduzi-la. Invulnerabilidade dura mais que o movimento.

Ao contrário de várias outras ações, a função-base `dash()` não verifica `player.hp<=0`; os listeners de teclado têm essa guarda, mas alguns caminhos de UI dependem de suas próprias condições. Não há proibição de esquivar durante carga nem cancelamento de carga dentro de `dash()`.

### 6.2 `triggerPerfectDodge(from)`

É chamado por `hurtPlayer()` quando existe invulnerabilidade e janela perfeita. Logo, “perfeita” exige que uma tentativa de dano seja recebida nesse intervalo; pressionar esquiva perto de um ataque sem contato não basta. Pode ocorrer por perigos ambientais, não apenas golpe direto. A janela é consumida após o primeiro evento.

Efeitos: +11 stamina; recarga de esquiva −0,32 s; `counterWindow` de 0,72 s; oportunidade de Pipoca de 2,6 s; hit stop de 0,055 s; contador/conquista; flash e som. Uma fonte inimiga não chefe a menos de 175 recebe stun de pelo menos 0,42 s e tem `strikePending`/windup cancelados. Isso não limpa `guardianPending` de um guardião.

Anel Coral reduz `hookCD` em 0,5 s e atordoa não chefes a menos de 145 por pelo menos 0,55 s. GD026 acrescenta Cordame+Instinto (gancho −0,55 s), Asas+Instinto (Pipoca manual −1,4 s e preparação de +20% de dano), e Anel Split (preparação de +35%).

### 6.3 `parry()` e `tryParry(from)`

`parry()` exige HP positivo, ausência de overlay/recarga/carga e stamina ≥10. Debita 10, recarga 0,92 s, janela 0,17 s, flash inicial 0,22 s e impõe pelo menos 0,16 s de recarga de ataque.

`hurtPlayer()` tenta parry **antes** de testar invulnerabilidade. `tryParry()` rejeita perigos `spore`, `root`, `sticky`, `lightning` e `tideWave`; obtém fonte pelo inimigo direto ou por `from.owner`; rejeita fonte ausente/morta. Chefe ou guardião exige `source.parryable=true`. Inimigos comuns não exigem esse flag. Não há cone frontal nem teste de orientação no parry.

Sucesso consome janela, concede +7 stamina comum ou +10 elite, arma contra-ataque de 0,95/1,15 s, dá stun de 0,82/1,05 s e vulnerabilidade de 1,08/1,45 s. Cancela `strikePending`, `guardianPending`, `bossPending` e windup; limpa flags de defesa; marca projétil morto quando aplicável. Não reflete nem causa dano automaticamente. Anel Contramaré arma carga por 3 s; Cordame+Instinto reduz gancho em 0,65 s; Surge devolve +4 stamina.

Fonte: [tryParry — src/game/beta/03-gameplay.js:212](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:212). Trecho reformatado, sem mudança de regra.

```js
function tryParry(from) {
  if (player.parryWindow <= 0) return false;
  if (from && ["spore", "root", "sticky", "lightning", "tideWave"].includes(from.type)) return false;
  const source = enemies.includes(from) ? from : from?.owner;
  if (!source || source.dead) return false;
  const elite = source.boss || source.guardian;
  if (elite && !source.parryable) return false;
  player.parryWindow = 0;
  player.parryFlash = 0.42;
  POLISH.parryPulse = 1;
  POLISH.counterTimer = 0.9;
  player.parryCount++;
  PLAYTEST.parries++;
  haptic([10, 18, 16]);
  gameEvent("parry");
  armCounter("parry", elite ? 1.15 : 0.95);
  if (bird) bird.opportunity = Math.max(bird.opportunity || 0, 2.6);
  player.stamina = Math.min(100, player.stamina + (elite ? 10 : 7));
  G.hitStop = Math.max(G.hitStop, elite ? 0.095 : 0.075);
  if (!reducedMotion()) G.shake = Math.max(G.shake, elite ? 5.8 : 4.2);
  source.stun = Math.max(source.stun, elite ? 1.05 : 0.82);
  source.vulnerable = Math.max(source.vulnerable || 0, elite ? 1.45 : 1.08);
  source.strikePending = null;
  source.guardianPending = null;
  source.bossPending = null;
  source.windup = 0;
  source.parryable = false;
  source.hookBreakable = false;
  if (from && from !== source && from.dead !== void 0) from.dead = true;
  text(player.x, player.y - 58, elite ? "PARRY PERFEITO!" : "APAROU!", "#fff0ae", elite ? 17 : 15);
  text(source.x, source.y - source.r - 27, "VULNER\xC1VEL", "#ffe2a0", 10);
  burst(player.x, player.y - 5, "#f6dfa0", elite ? 30 : 22, elite ? 190 : 160);
  sound("parry", elite ? 1.3 : 1.15);
  if (equipped("undertow_ring")) {
    player.undertowCharge = 3;
    text(player.x, player.y - 76, "CONTRAMAR\xC9 ARMADA", "#bfe3d2", 10);
  }
  if (player.parryCount === 1) toast("Parry perfeito: o inimigo fica vulner\xE1vel por um instante.", "gold");
  return true;
}
```

### 6.4 Contra-ataque e vulnerabilidade

`armCounter(kind,duration)` estende a janela pelo maior valor e registra a origem. `combatMeleeSource()` reconhece `sword`, `combo3`, `charged`, `hook`, `pull` e `crate`. O bônus-base ×1,28 é aplicado somente se a janela está ativa, a fonte é reconhecida, não é `crate` e nenhum bloqueio marcou aquele dano. É consumido pelo primeiro inimigo elegível da varredura; não beneficia automaticamente todos os alvos do mesmo ataque.

Vulnerabilidade é um timer por inimigo e concede ×1,38 para todas as fontes exceto `poop` e `crate`. Pode acumular com contra-ataque, crítico, habilidades, itens e domínio de miniboss. Não exige “crítico”. Instinto especializado aplica ×1,12 antes da verificação-base de bloqueio; seu alcance de aplicação não é idêntico ao bônus-base de contra-ataque.

## 7. Execução contextual

`isExecutable(e)` aceita inimigo vivo, com HP máximo positivo, HP ≤18% do máximo, excluindo chefe, guardião e miniboss nomeado. Veteranos, inimigos de evento e pequenas crias não são excluídos por essas categorias sozinhas.

O HUD escolhe o candidato mais próximo dentro de 88. `interact()` tenta executar antes de qualquer conversa/baú/estrutura. `executeEnemy()` exige distância ≤88 e ataque livre, cancela carga, anima passo 5 por 0,4 s, recarga 0,58 s, invulnerabilidade mínima 0,52 s, desloca Nilo 10 unidades e chama `killEnemy()` diretamente. Não passa por `damageEnemy()`, não consome stamina nem exige rolagem de dano. A morte gera recompensas pelas regras normais de categoria; não incrementa automaticamente o contador `gameEvent('execute')` nem os contadores de dano/ataques.

Fonte: [executeEnemy — src/game/beta/03-gameplay.js:214](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:214). Trecho reformatado, sem mudança de regra.

```js
function executeEnemy(e) {
  if (!isExecutable(e) || dist(player, e) > 88 || player.attackCD > 0) return false;
  player.charging = false;
  player.chargeTime = 0;
  player.attackCD = 0.58;
  player.attackAnim = player.attackAnimMax = 0.4;
  player.attackStep = 5;
  player.attackAngle = angle(player, e);
  player.angle = player.attackAngle;
  player.invuln = Math.max(player.invuln, 0.52);
  moveEntity(player, Math.cos(player.attackAngle) * 10, Math.sin(player.attackAngle) * 10, true);
  G.hitStop = Math.max(G.hitStop, 0.1);
  POLISH.zoomKick = Math.max(POLISH.zoomKick, 0.016);
  cameraImpact(player.attackAngle, 1.15);
  if (!reducedMotion()) G.shake = Math.max(G.shake, 6);
  text(e.x, e.y - e.r - 35, "EXECU\xC7\xC3O", "#ffe09a", 17);
  burst(e.x, e.y, "#f1cb78", 34, 210);
  sound("execute", 1.2);
  killEnemy(e);
  executionTarget = null;
  return true;
}
```

## 8. Gancho: estados, dano, puxada, caixas e navegação

`hookRange()` básico: `365 + line*70 + (navigator_hook?90:0)`; Fecho do Vendaval acrescenta 55. Gancho Navegador no grau 3 chega a 665; Fecho no grau 3 a 630. Os dois ocupam o mesmo slot e não se equipam juntos. Recarga básica `max(0.58,1.12-line*0.13)`, seguida dos fatores GD026 e Iron.

### 8.1 `useHook()`

Sem gancho e com `hookCD==0`, lança da posição de Nilo +18 na direção `v3HookAim()`, velocidade 760, estado `flying`. Com gancho existente, ignora novo comando se já está `reeling`/`returning`; caso contrário, muda para `reeling`, zera idade e processa o alvo.

Inimigo recebe dano de puxada `10+7*harpoon`, stun mínimo 0,75 e evento `hookEnemy`. Segredo acionado pelo gancho é descoberto e usa recarga de 65% do normal. Mecanismo `rigging` que não é lastro vai para `v3Pull()`. Caixote/barril permanece objeto móvel. Disparo e puxada não gastam stamina.

### 8.2 `updateHook(dt)`

| Estado | Comportamento |
|---|---|
| `flying` | Avança, acumula distância, usa `segmentDistance` no trecho percorrido para colisão contínua com alvo. |
| `latched` | Segue a posição do alvo. Aguarda novo comando ou 4,2 s de idade. |
| `reeling` | Puxa alvo para Nilo ou Nilo para argola; pode disparar dano de colisão de prop. |
| `returning` | Retorna sem alvo; ao terminar, limpa `hook` e define recarga. |

Alvos incluem inimigos vivos, props, loot, segredos condicionais que requerem gancho, argolas habilitadas pelo equipamento e mecanismos V3. Escolhe um mecanismo relevante entre interseções quando existir; senão o mais próximo do começo do trecho. Não usa oclusão comum de cenário no voo. Chefe dormente rejeita o engate e retorna.

Impacto em inimigo: `15 + level*2 + harpoon*11`, fonte `hook`, stun mínimo 0,25. Se a distância excede o alcance, muda para retorno. Após 4,2 s engatado, segredos/argolas/mecanismos voltam sem puxar; outros alvos são puxados automaticamente, com dano `pull` e evento para inimigos. Esse ramo automático não aplica exatamente todas as atribuições do comando manual.

Puxada comum usa velocidade `(880+line*85) / weight^0.63`, para a `player.r+target.r+9`; atualiza coordenadas diretamente, testando sólidos V3 na próxima posição. Enquanto puxado, inimigo recebe stun mínimo 0,12; ao chegar, stun mínimo `0.7+harpoon*0.15`. Loot é coletado ao chegar.

Caixa/barril puxado que encosta num inimigo aplica `22+level*2`, fonte `crate`, stun mínimo 1 s, quebra e retorna. A colisão usa soma dos raios e exclui chefe dormente. `breakProp()` gera três moedas de valor 2–4 e partículas.

Argola puxa Nilo a velocidade `760+line*35`, para a distância 34, com invulnerabilidade mínima 0,08 s durante o deslocamento. Se Nilo não sai do lugar por >0,3 s, aborta, aplica recarga e busca posição segura. Conclusão usa meia recarga. A argola especial do Recife estabelece tensão de 24 s.

Gancho influencia IA: `updateEnemies()` suspende guardiões e comuns enquanto estão engatados ou puxados; o chefe só interrompe sua atualização durante `reeling`. Isso é adicional ao stun e altera a cadência de ataques.

### 8.3 Mecanismos que compartilham a ação

`v3HookAim()` prioriza objeto de mecanismo apontado ou relevante quando não há mouse conhecido; pode usar orientação/mira de combate como fallback. `v3Hookable()` exclui poleiro e mecanismos já resolvidos; `v3TargetRelevant()` define o alvo útil da etapa. `v3HookLatched()` descobre e sinaliza engate; `v3HookMissFeedback()` sugere alvo após duas falhas. `v3Pull()` aciona trava, sino, guincho, lumes, espelhos, válvula e corrente; `v3ReelWeight()` move o lastro e limita o trajeto por colisão. Esses caminhos tomam o mesmo gancho que seria usado para lutar.

`v3ResetSite()`/`v3ResetTransient()` limpam gancho ou progresso transitório de mecanismos. `v3RecoverPosition()` cancela gancho/esquiva, leva Nilo a solo caminhável e aplica invulnerabilidade mínima de 1 s. Esses helpers importam para retorno de morte, fechamento de passagem e travessia durante combate; a solução completa de cada puzzle está no anexo.

## 9. Pipoca: manual, automático, oportunidade, resgate e atordoamento

Pipoca começa com `autoTimer=3`, recarga manual 0, resgate 8 s e nenhum bônus de oportunidade. `updateBird()` primeiro delega a `v3BirdUpdate()` se o pombo estiver em tarefa de mecanismo; nesse caso, não faz o fluxo comum de combate.

### 9.1 Seleção e lançamento — `birdAttack(manual,rescue)`

Comando manual primeiro tenta `v3BirdCommand()`; também recusa ataque normal se `V3.birdTask` está ativo. Rejeita overlay, morte, ausência de partida ou recarga manual positiva.

Com mouse conhecido e comando manual, escolhe inimigo vivo/desperto a menos de 420 de Nilo mais próximo da posição da mira. Sem ele, usa o mais próximo de Nilo a 430 para manual, 305 para automático. Sem alvo, manual vira `birdScout()`; automático falha e `updateBird()` tenta de novo em 0,7 s.

Manual define recarga `max(5,9-birdRank*0.85)`, alterada por Echo. Automático define `autoTimer=max(4.1,8.5-birdRank*1.15)`. São relógios distintos: usar o manual não simplesmente reinicia o automático. Resgate ou manual com oportunidade ativa gera projétil `boosted`; manual consome oportunidade. O projétil leva 0,47 s normal ou 0,34 s boosted e grava o ponto do alvo no lançamento: não rastreia seu movimento posterior.

Fonte: [birdAttack — src/game/beta/03-gameplay.js:219](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:219). Trecho reformatado, sem mudança de regra.

```js
function birdAttack(manual = false, rescue = false) {
  if (G.started && !G.overlay && player.hp > 0 && manual && v3BirdCommand()) return true;
  if (V3.birdTask) return false;
  if (!G.started || G.overlay || player.hp <= 0 || manual && bird.manualCD > 0) return false;
  let target = null;
  if (pointer.known && manual) {
    let aim = screenToWorld(pointer.x, pointer.y);
    for (let e of enemies) {
      if (!e.dead && (!e.boss || e.awake) && dist(e, player) < 420 && (!target || dist(e, aim) < dist(target, aim))) target = e;
    }
  }
  if (!target) target = nearestEnemy(player, manual ? 430 : 305);
  if (!target) {
    if (manual) return birdScout();
    return false;
  }
  const boosted = rescue || manual && bird.opportunity > 0;
  if (manual) {
    bird.manualCD = birdCooldown();
    if (boosted) bird.opportunity = 0;
  } else bird.autoTimer = Math.max(4.1, 8.5 - player.skills.bird * 1.15);
  bird.attackAnim = 0.55;
  projectiles.push({ type: "poop", x: bird.x, y: bird.y - 20, sx: bird.x, sy: bird.y - 20, tx: target.x, ty: target.y, age: 0, duration: boosted ? 0.34 : 0.47, r: 7, manual, boosted, dead: false });
  if (boosted) {
    text(bird.x, bird.y - 38, rescue ? "SOCORRO A\xC9REO" : "OPORTUNISTA!", "#ffe5a2", 11);
    burst(bird.x, bird.y - 8, "#f1dfa4", 10, 70);
  }
  sound("bird", boosted ? 1.2 : 1);
  return true;
}
```

### 9.2 Impacto — ramo `poop` de `updateProjectiles()`

Raio `manual?60:40`, +`rain*18`, +24 se boosted. Dano básico `10+level*2+birdRank*6`, ×1,35 boosted, depois todos os multiplicadores GD026/defesa. Todos os inimigos vivos/despertos dentro de `radius+e.r` recebem dano. O ponto desenha `splat` por 3 s, que é cosmético e não causa dano persistente.

Stun básico `2 + rain*0.5 + (boosted?0.55:0)`, ×0,4 para chefe, ×0,65 para guardião, ×1 para comuns, depois redução de repetição. `registerBirdControl()` aplica escala 1, 0,72, 0,5 e 0,34 para impactos consecutivos dentro de 6 s. Não reduz diretamente o dano; reduz o atordoamento. Boosted redefine o contador e recebe escala 1. O stun é aplicado como máximo do atual, sem somar durações.

Os abates do mesmo impacto alimentam `birdKill`, recorde `birdMultiKill` quando ≥3, conquista Pombo Nuclear e comemoração por 1,4 s. Tutorial `bird` avança se algum alvo foi atingido.

### 9.3 Oportunidade e resgate

Parry e esquiva perfeita estendem `bird.opportunity` para 2,6 s; somente o manual nessa janela consome essa oportunidade e vira boosted. Com HP <35% e resgate livre, `updateBird()` verifica inimigo a até 290, define resgate em 18 s e chama ataque automático boosted. Não cura nem transporta Nilo nesse caminho. O resgate também define `autoTimer` pelo fluxo não manual.

`updateBird()` reduz recargas, oportunidade, animação, comemoração e dicas; move o pombo por interpolação em torno de Nilo e orienta-o para um inimigo durante combate. Tempestade o aproxima mais do corpo. Quando está farejando, segue o alvo de exploração e retorna antes do combate comum naquele tick. `birdScout()` usa alvos em até 260, recarga mínima 1,1 s e duração até 2,4 s; `finishBirdScout()` revela pistas/achados, concede recompensas aplicáveis e limpa o alvo.

### 9.4 Pipoca reservado ao puzzle

`v3BirdCommand()` pode liberar uma tarefa existente ou enviar Pipoca ao poleiro quando sino está ativo, distância e intenção são válidas. Exige recarga manual ≤0,05, estabelece tarefa com retenção de 11 s e limpa scout. `v3BirdUpdate()` move até o poleiro, começa a reduzir retenção após chegar e libera ao expirar, morrer ou ficar a mais de 465. Enquanto essa atualização retorna `true`, o ataque automático/resgate comum não acontece. `v3ReleaseBird()` impõe recargas mínimas de 0,8 s.

## 10. Pipeline completo de dano contra inimigos

Toda espada, gancho, puxada, caixa e impacto de Pipoca passa pelo `damageEnemy` final. Execução chama morte diretamente. Ordem de cálculo:

1. GD027: em Iron, veterano atingido por `hook`, `pull` ou `charged` recebe ×1,15.
2. GD026 rastreia `_gd026LastSource` enquanto o inimigo está vivo.
3. GD026 calcula sinergias: Cordame ×1,12 gancho/puxada; Asas ×1,10 Pipoca; Instinto ×1,12 quando janela de contra-ataque e fonte reconhecida; marca híbrida, preparações de Pipoca, equipamento Storm e domínio de miniboss.
4. Quality interrompe `mushroomSpore` por carga/gancho/puxada e `wispBlink` por gancho/puxada, criando vulnerabilidade antes do dano-base.
5. Base rejeita morto ou chefe adormecido; aplica barreira de veterano, quebra de coroa do chefe, guardas de Musgo/caranguejo, proteção do Lodo e armadura de Bronze.
6. Base verifica contra-ataque ×1,28, depois vulnerabilidade ×1,38.
7. Arredonda uma vez ao final desse pipeline para inteiro, mínimo 1; incrementa telemetria; subtrai HP; marca aggro/contexto/impacto; divide slime ou mata.

Fonte: [damageEnemy — src/game/beta/03-gameplay.js:224](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:224). Trecho reformatado, sem mudança de regra.

```js
function damageEnemy(e, amount, source, critical = false, strong = false) {
  if (e.dead) return;
  if (e.boss && !e.awake) {
    if (player.combat <= 0) toast("Tr\xEAs selos. S\xF3 ent\xE3o o rei poder\xE1 ser ferido.");
    player.combat = 2;
    return;
  }
  let blocked = false, countered = false;
  if (e.ngElite && e.ngBarrier) {
    e.ngBarrier = false;
    amount *= 0.52;
    blocked = true;
    text(e.x, e.y - e.r - 40, "CASCA DE CONTRAMAR\xC9", "#bfe0cf", 10);
    burst(e.x, e.y, "#9bc7b4", 10, 70);
    sound("block", 0.7);
  }
  if (e.boss && e.hookBreakable && ["hook", "pull"].includes(source)) {
    e.hookBreakable = false;
    e.bossPending = null;
    e.windup = 0;
    e.stun = Math.max(e.stun, 0.72);
    e.vulnerable = Math.max(e.vulnerable || 0, 1);
    text(e.x, e.y - e.r - 46, "COROA ARRANCADA", "#ffe2a0", 12);
    sound("reel", 1.15);
    G.hitStop = Math.max(G.hitStop, 0.07);
  }
  if (e.guardian === "moss" && e.guard > 0 && ["sword", "combo3", "charged", "hook", "pull"].includes(source)) {
    const incoming = angle(e, player), da = Math.abs(Math.atan2(Math.sin(incoming - e.guardAngle), Math.cos(incoming - e.guardAngle)));
    if (da < 1.12) {
      if (source === "hook" || source === "pull") {
        e.guard = 0;
        e.stun = Math.max(e.stun, 0.65);
        e.vulnerable = Math.max(e.vulnerable, 0.9);
        text(e.x, e.y - e.r - 38, "ESPINHOS ARRANCADOS", "#ffe2a0", 11);
        sound("reel", 1);
      } else if (source === "charged") {
        amount *= 0.8;
        e.guard = 0;
        e.stun = Math.max(e.stun, 0.6);
        e.vulnerable = Math.max(e.vulnerable, 0.7);
        blocked = true;
        text(e.x, e.y - e.r - 38, "GUARDA ESMAGADA", "#ffe2a0", 11);
        sound("heavy", 1.08);
      } else {
        amount *= source === "combo3" ? 0.58 : 0.25;
        blocked = true;
        text(e.x, e.y - e.r - 38, source === "combo3" ? "GUARDA QUEBRADA" : "ESPINHOS", "#e7d8ad", 10);
        if (source === "combo3") {
          e.guard = 0;
          e.vulnerable = Math.max(e.vulnerable, 0.45);
        }
        sound("block", 0.85);
      }
    }
  }
  if (e.guardian === "moss" && e.guard > 0 && source === "poop") {
    amount *= 0.55;
    blocked = true;
    if ((e.birdGuardTextCD || 0) <= 0) {
      e.birdGuardTextCD = 1.1;
      text(e.x, e.y - e.r - 38, "ESPINHOS SEGURAM", "#dce5b6", 9);
      sound("block", 0.7);
    }
  }
  if (e.type === "crab" && !e.guardian && e.guard > 0 && source === "poop") {
    amount *= BALANCE.combat.crabBirdGuard;
    blocked = true;
    if ((e.birdGuardTextCD || 0) <= 0) {
      e.birdGuardTextCD = 1.2;
      text(e.x, e.y - e.r - 36, "CASCO SEGURA", "#e5d6a6", 9);
      sound("block", 0.72);
    }
  }
  if (e.type === "crab" && !e.guardian && e.guard > 0 && ["sword", "combo3", "charged", "hook", "pull"].includes(source)) {
    const incoming = angle(e, player), da = Math.abs(Math.atan2(Math.sin(incoming - e.guardAngle), Math.cos(incoming - e.guardAngle)));
    if (da < 1.08) {
      if (source === "hook" || source === "pull") {
        e.guard = 0;
        e.stun = Math.max(e.stun, 0.5);
        e.vulnerable = Math.max(e.vulnerable, 0.45);
        text(e.x, e.y - e.r - 35, "GUARDA PUXADA", "#ffe2a0", 11);
        sound("block", 0.8);
      } else if (source === "charged") {
        amount *= 0.82;
        e.guard = 0;
        e.stun = Math.max(e.stun, 0.55);
        e.vulnerable = Math.max(e.vulnerable, 0.55);
        blocked = true;
        text(e.x, e.y - e.r - 35, "GUARDA ESMAGADA", "#ffe2a0", 11);
        sound("heavy", 1.05);
      } else if (source === "combo3") {
        amount *= 0.62;
        e.guard = 0;
        e.stun = Math.max(e.stun, 0.3);
        blocked = true;
        text(e.x, e.y - e.r - 35, "GUARDA QUEBRADA", "#ffe2a0", 11);
        sound("block", 1.1);
      } else {
        amount *= 0.28;
        blocked = true;
        text(e.x, e.y - e.r - 35, "BLOQUEIO", "#e7d8ad", 10);
        sound("block", 0.8);
      }
    }
  }
  if (e.guardian === "mire" && mirelingsAlive(e) > 0) {
    amount *= 0.48;
    blocked = true;
    if (Math.random() < 0.35) text(e.x, e.y - e.r - 40, "LODO PROTEGE", "#cfe4b1", 10);
  }
  if (e.guardian === "bronze" && e.guardianPhase >= 2 && !e.parryable && e.vulnerable <= 0 && !["charged", "hook", "pull"].includes(source)) {
    amount *= 0.72;
    blocked = true;
  }
  if ((player.counterWindow || 0) > 0 && combatMeleeSource(source) && source !== "crate" && !blocked) {
    amount *= BALANCE.combat.counterBonus;
    countered = true;
    player.counterWindow = 0;
    player.counterSource = "";
    PLAYTEST.counterHits++;
    text(e.x, e.y - e.r - 47, "CONTRA-ATAQUE", "#ffe39a", 10);
    G.hitStop = Math.max(G.hitStop, 0.075);
  }
  if (e.vulnerable > 0 && !["poop", "crate"].includes(source)) amount *= BALANCE.combat.vulnerableBonus;
  amount = Math.max(1, Math.round(amount));
  PLAYTEST.damageDealt += amount;
  combatRecordDamage(source, amount);
  if (e.boss) PLAYTEST.bossDamage += amount;
  if (e.guardian) PLAYTEST.guardianDamage += amount;
  e.hp -= amount;
  e.flash = strong ? 0.19 : 0.13;
  e.aggro = true;
  if (smartEnemy(e)) {
    e.lastSeenX = player.x;
    e.lastSeenY = player.y;
    if (e.aiState === "idle" || e.aiState === "return") setEnemyState(e, "alert", 0.14);
  }
  player.combat = 5;
  combatImpact(e, source, critical, strong && !blocked || countered);
  text(e.x + (Math.random() - 0.5) * 16, e.y - e.r - 14, critical ? amount + "!" : String(amount), source === "poop" ? "#eef5d5" : critical ? "#ffdc87" : countered ? "#ffe39a" : blocked ? "#e4d3a7" : strong ? "#ffe1a0" : "#fff0c6", critical ? 20 : countered ? 19 : strong ? 18 : 15);
  if (e.hp > 0) maybeSplitSlime(e);
  if (e.hp <= 0) killEnemy(e);
}
```

### 10.1 Defesas e interrupções

| Defesa | Condição | Resultado |
|---|---|---|
| Casca NG+ | `ngElite && ngBarrier` | Primeiro dano ×0,52; barreira é consumida e `blocked=true`. Qualquer fonte que chega ao ramo a consome. |
| Coroa do chefe | `boss && hookBreakable`, gancho/puxada | Cancela ataque pendente, stun ≥0,72, vulnerável ≥1 s; o próprio golpe já aproveita vulnerabilidade. |
| Musgo frontal | Guarda ativa, ângulo <1,12 | Espada ×0,25; combo3 ×0,58 e quebra; carga ×0,8, quebra e stun/vulnerável; gancho/puxada remove sem essa redução, dá stun 0,65 e vulnerabilidade 0,9. |
| Musgo contra Pipoca | Guarda ativa | Dano ×0,55 independentemente da direção. |
| Caranguejo comum contra Pipoca | Guarda ativa | Dano ×0,62. |
| Caranguejo frontal | Guarda ativa, ângulo <1,08 | Espada ×0,28; combo3 ×0,62 e quebra; carga ×0,82 e quebra; gancho/puxada quebra e expõe. |
| Lodo protegido | Minions de Lodo vivos em até 650 | Qualquer dano ×0,48. |
| Bronze fase ≥2 | Sem `parryable`, sem vulnerabilidade e fonte fora de carga/gancho/puxada | Dano ×0,72. |

Guardas frontais só limitam as fontes explicitamente listadas. Caixa não entra na lista frontal; Pipoca tem seu próprio ramo. Nem todo bloqueio impede dano: vários apenas reduzem e desligam o contra-ataque-base. Vulnerabilidade pode multiplicar um dano marcado como bloqueado. Crítico usa o flag que veio da ação; não é sorteado novamente em `damageEnemy()`.

`maybeSplitSlime()` atua quando uma gosma comum sobrevive com ≤42% de HP, sem já ter dividido e sem ser guardião, chefe ou `mini`. Encolhe o original, reduz peso para 0,78, velocidade ×1,08 e gera duas gosmas pequenas com 28% do HP máximo original, 58% do dano, velocidade ×1,12, XP reduzido e sem respawn. Isso ocorre após aplicar o dano, antes de decidir morte. Uma pancada que mata não divide.

## 11. Dano recebido, cura e morte de Nilo

GD026 reduz esporo ×0,65 com Botas de Micélio ou projétil `bubble`/`spit` ×0,78 com Casaco Ferrugem. A função-base então:

1. Retorna em god mode, HP zero ou partida não iniciada.
2. Tenta parry final.
3. Se `invuln>0`, tenta esquiva perfeita quando válida e ignora dano.
4. Calcula direção de impacto/câmera; Casaco de Mara pronto reduz ×0,58 e entra em recarga de 12 s.
5. Aplica Vigor, arredonda e garante dano mínimo 1.
6. Subtrai HP, aplica invulnerabilidade de 0,62 s, cancela janelas perfeita/parry, flash de 0,17, contexto de combate 6 s, recuo de 13, som/partículas/vibração.
7. Ao morrer, incrementa mortes, cancela gancho/carga/botão e agenda tela após 550 ms se HP continuar zero.

Fonte: [hurtPlayer — src/game/beta/03-gameplay.js:235](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:235). Trecho reformatado, sem mudança de regra.

```js
function hurtPlayer(amount, from = null) {
  if (DEBUG.godMode || player.hp <= 0 || !G.started) return;
  if (tryParry(from)) return;
  if (player.invuln > 0) {
    if (player.perfectReady && player.perfectWindow > 0) triggerPerfectDodge(from);
    return;
  }
  const polishSource = enemies.includes(from) ? from : from?.owner || from;
  if (polishSource?.x !== void 0) {
    POLISH.damageAngle = angle(player, polishSource);
    POLISH.damagePulse = 1;
    cameraImpact(POLISH.damageAngle, 0.7);
  }
  let coatGuard = false;
  if (equipped("mara_coat") && player.coatCD <= 0) {
    amount *= 0.58;
    player.coatCD = 12;
    coatGuard = true;
    text(player.x, player.y - 58, "CASACO DE MARA", "#d9e4bd", 11);
    sound("block", 0.75);
  }
  amount = Math.max(1, Math.round(amount * (1 - player.skills.vigor * 0.05)));
  PLAYTEST.damageTaken += amount;
  haptic(18);
  player.hp = Math.max(0, player.hp - amount);
  player.invuln = 0.62;
  player.perfectReady = false;
  player.perfectWindow = 0;
  player.parryWindow = 0;
  player.flash = 0.17;
  player.combat = 6;
  G.shake = 5;
  text(player.x, player.y - 43, "-" + amount, "#ffb296", 17);
  burst(player.x, player.y - 5, "#dc876c", 8, 100);
  if (from) {
    let src = enemies.includes(from) ? from : from?.owner || from, a = angle(src, player);
    moveEntity(player, Math.cos(a) * 13, Math.sin(a) * 13, true);
  }
  $("damage-flash").style.opacity = String(0.43 * PREFS.flashes);
  setTimeout(() => {
    $("damage-flash").style.opacity = 0;
  }, 170);
  sound("hit");
  if (player.hp <= 0) {
    G.deathCount++;
    PLAYTEST.deaths++;
    haptic([28, 35, 45]);
    hook = null;
    player.charging = false;
    pointer.down = false;
    setTimeout(() => {
      if (player.hp <= 0) showDeath();
    }, 550);
  }
}
```

`drinkPotion()` exige partida, ausência de overlay e recarga livre; verifica estoque e vida incompleta. Consome uma, registra uso para conquista, cura `ceil(maxHP*0.58)` limitada ao máximo, recarga 0,75 s e salva. O texto exibe a cura calculada, mesmo se parte dela exceder o déficit de HP. A função não tem a mesma guarda explícita de HP positivo das ações ofensivas; o acesso normal por teclado está protegido.

`showCamp()` oferece descanso gratuito que restaura HP/stamina, zera `combat` e salva. Reforço de espada custa 80/150/220 ouro para graus 1/2/3; cada grau +6 dano. Com dois selos, Casaco de Mara é oferecido. Não exige encerrar todos os inimigos pelo contador de aggro para abrir o modal do abrigo; o abrigo tem proteções de percepção próprias.

## 12. Inimigos: atributos, criação, categorias e respawn

`spawnEnemy(type,x,y,level,opts)` usa a ficha-base, escala pelo nível, cria estado de IA/combate, sobrescreve com `opts`, corrige HP máximo se `opts.hp` é truthy, aplica NG+ final, ativa estado `combat` quando `opts.aggro` e adiciona ao array.

| Tipo | HP-base | Dano-base | Velocidade | Raio | XP-base | Identidade |
|---|---:|---:|---:|---:|---:|---|
| `slime` | 32 | 7 | 62 | 18 | 20 | Salto, lodo e divisão. |
| `crab` | 43 | 10 | 86 | 18 | 25 | Pinça, guarda frontal e investida contra distância. |
| `bandit` | 49 | 10 | 104 | 14 | 30 | Atirador e rajada. |
| `mushroom` | 40 | 9 | 37 | 18 | 27 | Áreas de esporo. |
| `wisp` | 29 | 8 | 112 | 13 | 24 | Teleporte e tiro. |
| `sponge` | 35 | 10 | 94 | 15 | 17 | Mordida e força em matilha. |

HP antes de overrides: `baseHP*(1+(level-1)*0.27)`; dano `baseDamage+(level-1)*2.2`; XP `baseXP+level*5`. O tipo `boss` não tem ficha-base própria no dicionário e usa fallback slime antes de os atributos do chefe serem sobrescritos.

`buildWorld()` e a variante progressiva mobile geram cenário, caixas, baús, inimigos ambientais por bioma, quatro inimigos introdutórios, minibosses ainda não mortos, guardiões ainda não vencidos, selos não coletados e chefe ainda não morto. `BALANCE.rhythm.ambientEnemies=72` é número de tentativas de geração, não garantia de 72 inimigos: candidatos fora de terreno, perto de abrigo/arena/guardiões ou sem espaço são descartados.

Campos relevantes: HP/dano/raio/peso, `homeX/Y`, `aiState`, `aiTimer`, `lastSeenX/Y`, `aggro`, `attackCD`, `stun`, `recover`, `windup`, `windupMax`, ataques pendentes, alvo previsto `strikeX/Y`, `guard/guardAngle`, `vulnerable`, fase, minions, variantes, barreira NG+, repetição de Pipoca, cerco e slot de performance.

### 12.1 Atualização e distância

`updateEnemies()` reduz stun/flash/impacto/repetição e encaminha para chefe, guardião ou IA inteligente. Para comuns distantes, suspende atualização além do limite e atualiza por stride numa zona intermediária, compensando o `dt` quando executa. No desktop: limite 1150, throttle a partir de 650, stride 3 ou 4 capturado no início. No mobile: limite 900/1000/1100 e throttle 430/520/600 conforme tier lógico; stride 6/4/3 mais pressão de CPU, máximo 8.

O build troca `MOBILE_RENDER.tier` usado nesse cálculo por `GRAPHICS_LOGIC_TIER` capturado inicialmente e a escolha desktop por `GRAPHICS_DESKTOP_AI_STRIDE`. Trocar qualidade depois não refaz os parâmetros básicos de IA. A pressão de CPU ainda pode alterar stride mobile. Duração observada de um inimigo longe não deve ser interpretada como atualização constante a 60 Hz.

Morto comum sem `guardian`, `boss`, tipo sponge ou `noRespawn` tem timer de 70–100 s. Só renasce se timer terminou e posição da entidade morta está a mais de 720 de Nilo. Renasce na home com HP cheio, limpando parte do estado. `rewardKills` permanece e reduz XP dos próximos abates. Gosmas que dividiram restauram `splitDone=false`, mas a rotina não restaura explicitamente raio, peso e velocidade originais. As categorias excluídas não reaparecem por esse mecanismo.

## 13. Máquina de estados da IA comum

`smartEnemy()` reconhece os seis tipos comuns, excluindo guardiões e chefe. `setEnemyState()` define estado/timer; sair de `combat` limpa guarda, e estados diferentes de `alert` limpam o ataque comum pendente. Quality acrescenta apresentação da identidade na primeira entrada de cada espécie em alerta/combate.

| Estado | Comportamento e transição |
|---|---|
| `idle` | Passeia perto da home; vendo Nilo entra em `alert`. |
| `alert` | Timer curto de reação; se perde visão/distância entra em `investigate`, senão `combat`. |
| `combat` | Executa padrão da espécie; pode investigar ou recuar quando perde percepção/HP. |
| `investigate` | Vai ao último ponto visto a 58% da velocidade; termina por timer ou proximidade, entra em `return`. |
| `return` | Volta à home a 55%; chegando faz interpolação e volta a idle; nova percepção reabre alerta. |
| `retreat` | Se afasta por 1,25 s a 105% da velocidade com componente lateral; retorna ao combate ou home. |

Percepção-base: bandit 325, crab 280, slime 260, mushroom 285, sponge 275, wisp 360 de dia/420 à noite/475 na neblina. Quiet zone de puzzle aplica ×0,62. Encounter Rhythm aplica outros fatores; NG+ aplica `1+0.045*min(5,ciclo)`. `v3Awareness()` limita a 112 para comuns ou 175 para wisp quando Nilo está oculto, fora de combate, sem ataque/carga; exclui miniboss/guardião/chefe.

Abrigo a menos de 162, quiet zone de puzzle para alvo a mais de 105 e proteção de ritmo tornam percepção segura. `sees` não faz raycast geral por paredes; cobertura de projétil não significa visão bloqueada da IA. Eventos e inimigos já feridos têm exceções no ritmo.

`updateSmartEnemy()` mantém timers, percepção e último ponto visto. Detecta tentativa de manter distância se Nilo está movendo e a distância excede 215; acumula `kiteTime` até 4 ou reduz a 1,6/s. Caranguejo, bandit e mushroom com HP baixo entram em retreat (27% normal, 18% NG+, recarga 5 s). Ataques pendentes são processados antes da checagem de stun: um stun sozinho não cancela necessariamente um ataque já preparado. Interrupções explícitas limpam o pending.

### 13.1 Preparação e resolução

`startEnemyStrike()` grava tipo, windup, alvo e remove guarda. NG+ multiplica windup por `ngTempoFactor()`. `resolveEnemyStrike()` aplica o ataque e um `recover` básico; Quality adiciona exposição e algumas recuperações. O movimento e o alvo variam por espécie:

| Espécie/ação | Ativação e windup | Resolução e resposta |
|---|---|---|
| Crab pinça | Em distância <108; windup 0,42; CD 1,62 | Dano `e.damage+2` se distância <`e.r+13+36`; guarda 0,64 s ou 0,9 reversalGuard, orientada ao jogador, salvo esquiva perfeita detectada. Recover 0,28. |
| Crab cerco | `kiteTime>1.35`, distância 165–330, CDs livres; windup 0,58; CD 2,35; punição 4,6 | Desloca até 185 na posição gravada, dano +3 em faixa de raio+44; guarda mínima 0,5; efeito de investida. |
| Bandit tiro | Distância <355; windup 0,5; CD 1,85–2,20 | Tiro atual na direção de Nilo a velocidade 235. Se variante crossfire, três tiros 245/265/245 com offsets ±0,16. |
| Bandit rajada de pressão | Kite >1,60, distância 235–410; windup 0,7; CD 2,75; punição 5,2 | Três tiros; Quality recover mínimo 0,42 e vulnerabilidade 0,72. |
| Slime salto | Distância <185; windup 0,46; CD 1,72–2,07 | Desloca até 135; lodo raio 62, espera 0,08, vida 3,8; contato dá dano +1. DoubleWake gera mais duas poças. Recover 0,24 e vulnerabilidade 0,52. |
| Wisp teleporte | Distância <390; windup 0,4; CD 2,25–2,75 | Até sete tentativas de posição caminhável a 145–235 de Nilo; tiro 250 ou trio 255/270/255 Echo. Exposição 0,42. |
| Mushroom esporo | Distância <315; windup 0,62; CD 2,45–2,80 | Mira prevê vetor de movimento ×42; área raio 86, espera 0,45, vida 4,4; dano `round(0.58*e.damage)`, mínimo 2. Bloom acrescenta duas áreas menores. Recover mínimo 0,34; exposição 0,48. |
| Sponge mordida | Distância <82; windup 0,34 ou 0,24 com ≥3 membros | Contato <raios+26; dano `e.damage*(1+0.08*min(3,pack-1))`. CD decresce com matilha; Frenzy tem maior bônus de velocidade e menor piso de CD. Recover 0,2. |

Caranguejo aproxima com componente lateral, recua se muito perto; bandit mantém faixa e strafing; slime oscila velocidade; wisp mantém faixa maior; mushroom evita aproximação curta; sponge converge em grupo. `wakeSpongePack()` alerta esponjinhas a até 230. Matilha conta outras esponjas a até 175; velocidade cresce até três membros extras em 11% ou 16% por membro. Ao matar uma, Quality dá stun ≥0,22 às próximas em 190, zera kite e reduz boost registrado para 1; a matilha pode ser recalculada no tick seguinte.

### 13.2 Domínio Quality

`qualityExpose()` abre timer de vulnerabilidade, marca texto e métrica. Carga/gancho/puxada interrompe `mushroomSpore`: stun ≥0,62, exposição 0,95, pending cancelado. Gancho/puxada interrompe `wispBlink`: stun ≥0,48, exposição 0,78, phaseShift zerado. Bandit rajada, pouso de slime, reaparição wisp e esporo concluído abrem as janelas da tabela. `drawCombatTelegraph` final exibe essas pistas quando labels estão em modo full.

## 14. Minibosses opcionais

| ID/nome | Tipo, posição, nível | HP/dano/velocidade/XP | Variante | Espólio |
|---|---|---|---|---|
| `galeShell` / Casco do Vendaval | Crab, (2050,2500), 2 | 150 / 13 / 92 / 75 | reversalGuard | storm_hook |
| `hollowKing` / Oco-Rei | Mushroom, (3200,1200), 3 | 175 / 13 / 42 / 90 | sporeBloom | spore_boots |
| `splitLight` / Luz Fendida | Wisp, (3000,3400), 4 | 165 / 14 / 124 / 100 | echoBlink | split_ring |
| `rustRam` / Aríete Ferrugem | Bandit, (4050,1500), 4 | 195 / 15 / 110 / 110 | crossfire | rust_coat |
| `saltJaw` / Mandíbula de Sal | Sponge, (4700,2500), 5 | 220 / 16 / 100 / 125 | frenzyPack | salt_ring |

Usam `mini=true`, `miniBossId`, `noRespawn=true`, peso 1,65; raio 18 wisp, 19 bandit e 24 demais. Valores recebem alterações NG+ depois da ficha. Não podem ser executados e não usam a máquina dos guardiões: usam IA comum com wrappers.

`gd026MiniMastery()` aplica: Casco com guarda e carga/gancho/puxada ×1,16; Oco preparando esporo com essas fontes ×1,14; Luz com gancho/puxada ×1,12; Aríete durante recovery com espada/combo/carga ×1,18; Mandíbula isolada (`packBoost<=1`) com espada/combo/carga/gancho/puxada ×1,16. Mensagem “Leitura certa” tem cooldown 0,8 s; o multiplicador não depende da disponibilidade da mensagem.

`gd026MiniPhase()` roda antes da IA e dispara uma vez quando HP ≤55%: Casco ganha guarda 1,8 s e velocidade ×1,06; Oco cria quatro esporos ao redor e recover 0,65; Luz cria dois ecos wisp; Aríete dispara trio 260/285/260 e recover 0,72; Mandíbula cria duas esponjinhas. Crias têm XP zero, sem respawn e vínculo `gd026MiniParent`; morrem ao morrer/resetar o miniboss pai.

Ao matar, registra ID em `G.minibosses`, avança quest, salva e entrega item se ainda não houver no inventário. `grantEquipment()` equipa automaticamente apenas se slot estiver vazio; sua mensagem normal pode dizer “adquirido e equipado” mesmo com slot já ocupado. NG+ mantém o inventário, portanto recompra do mesmo espólio não gera duplicação. Miniboss derrotado fica ausente após reconstruir mundo.

## 15. Guardiões e os três selos

| Guardião | Posição/nível | HP efetivo normal | Dano | Velocidade | XP bruto |
|---|---|---:|---:|---:|---:|
| Garra de Musgo (`moss`) | (2470,1080), 2 | **630** | 21 | 68 | 185 |
| Lodo Antigo (`mire`) | (2700,3470), 3 | **855** | 24 | 52 | 215 |
| Pinça de Bronze (`bronze`) | (4260,1800), 4 | **1020** | 27 | 68 | 245 |

As fichas `GUARDIANS` declaram 210/285/340, mas `buildWorld()` usa `hp:q.hp*3`. Todos têm raio 35 e peso 2,7. `guardianPhaseFor()` muda para fase 2 em HP ≤67% e fase 3 em ≤34%. Introdução em distância <410, aggro mantido dentro da zona; afastamento >720 acumula leash de 4 s, cancela preparação e retorna à home. Se houve dano/onda, reset recompõe encontro.

`updateGuardian()` reduz guarda/vulnerável/recuperação, processa introdução, leash, fase, ataque pendente, stun e ataques. Cada fase invoca uma onda uma vez: pede fase+1 minions, acrescenta até dois por NG+ e limita a cinco vivos por guardião. Minions de Musgo são mushrooms; Lodo slimes; Bronze crabs. HP `28+fase*9`, dano `5+fase*2`, velocidade 82, raio 12, peso 0,55, XP zero e sem respawn.

### 15.1 Musgo

Sequência incrementa `guardianPattern` antes de módulo: raízes → investida → garra. Na introdução ganha guarda 1,35; mudança de fase guarda 1,45 e exposição breve. Aproxima a 78% da velocidade com lateral.

`mossRoots`: preparação 0,72, área gravada raio 82, espera 0,5, vida 3,2 e dano mínimo 3 de 45% do dano; NG+ adiciona raiz menor. `mossLunge`: preparação 0,82 na fase 1 ou 0,62 nas outras, desloca até 170, cria raiz raio 68 e dá contato `damage+4`. `mossClaw`: preparação 0,52, perigo `enemy` raio 112 com espera 0,08, dano +2 e guarda 0,8. Recarga 1,8 ou 1,45 fase 3.

`startGuardianAttack()` marca `hookBreakable` para mossLunge, mas o ramo especial de quebra por esse flag no dano-base só testa `e.boss`. O congelamento por gancho e as regras de guarda ainda afetam Musgo; não há nesse ramo uma implementação idêntica à “coroa arrancada” do chefe.

### 15.2 Lodo

Alterna salto → explosão de lodo. `mireLeap`: preparação 0,58, desloca até 150, lodo raio 78, espera 0,05, vida 4,4 e contato +2 dano. `mireBurst`: preparação 0,7, cria `3+fase+extraNG` poças raio 48 ao redor de Nilo, esperas escalonadas e vida 3,5. Recarga 1,9 ou 1,5 fase 3; aproxima a 60% da velocidade.

Enquanto houver minions de Lodo vivos perto dele, dano ×0,48. Ao matar o último, `killEnemy()` abre núcleo: vulnerabilidade ≥1,05 s e stun ≥0,35. Morte dos minions não dá XP/moedas/abates globais no ramo-base, que retorna cedo.

### 15.3 Bronze

Sequência investida → nova → garra. `bronzeCharge`: preparação 0,66 ou 0,48 na fase 3; desloca até 235; contato dano +6. É o ataque de guardião marcado como `parryable`. `bronzeNova`: preparação 0,62, tiros `8+fase*2+extraNG`, velocidade `175+fase*10+12NG`, em bolhas. `bronzeClaw`: preparação 0,45; área raio 106, espera 0,06, dano +3. Recarga 1,7 ou 1,35 fase 3; aproxima a 80% e alterna lado.

Fase ≥2 tem mitigação ×0,72 para fontes sem bypass quando não há parryable/vulnerável. Bolhas de guardião normalmente não são aparáveis quando o dono já limpou `parryable`; a propriedade é do dono atual, não do projétil no disparo.

### 15.4 Morte, selo e mundo

Morte registra `G.guardians`, dropa selo, mata minions relacionados e salva. Coleta do selo é separada: `collectLoot()` registra em `G.seals`, dá 55 XP, grava nível/momento, anuncia progresso e salva. Com três, abre objetivo do chefe. Se guardião já consta morto mas selo não foi coletado, a construção do mundo recria o selo na posição definida. Story acrescenta cena pendente. V3 abre raízes, firma lodo ou libera grade conforme selo; esses resultados alteram rotas, retorno de morte e acesso ao combate.

## 16. Esponjão: despertar, fases, arena e ataques

Chefe em (4220,2990), nível 6, HP 1920 normal, dano 29, velocidade 40, raio 47, peso 5, XP bruto 520. Só desperta com exatamente três selos e distância <455. Enquanto dormente, dano-base não o fere, gancho retorna e seleção normal o exclui. Despertar registra nível de entrada, CD 1,7×tempo NG, arena inicial 330 normal/315 NG+, fala e stinger.

Fase 2 quando proporção de HP **<0,64**; fase 3 **<0,31**. São comparações estritas, diferentes dos limites inclusivos dos guardiões. A mudança zera pattern/pending/flags, dá vulnerabilidade ≥0,55, CD 1 s, altera arena e conserva perigos root/sticky do chefe enquanto filtra outros tipos dele.

| Fase | Arena normal | Arena NG+ | Sequência normal no array | Sequência NG+ no array |
|---|---:|---:|---|---|
| 1 | 330 | 315 | mossCrown, mireTide, bronzeRush | mossCrown, bronzeRush, undertow, mireTide |
| 2 | 292 | 275 | tideWave, mossCrown, summon, bronzeRush, sealStorm | tideWave, undertow, mossCrown, summon, bronzeRush, sealStorm |
| 3 | 248 | 230 | tideWave, bronzeRush, mireTide, sealStorm, mossCrown | undertow, bronzeRush, tideWave, mireTide, sealStorm, mossCrown |

`pattern` é incrementado antes de `seq[pattern % length]`. Assim o primeiro ataque de cada fase é o segundo item do array, não o primeiro. O timer de arena é processado após ataques pendentes e stun/recuperação: sair do limite não gera necessariamente dano em todo frame. Fora do raio +18, tenta dano `5+fase*2` a cada 0,72 s, com fonte o próprio chefe; o pipeline normal de defesa/invulnerabilidade se aplica.

Dentro do loop comum, chefe aproxima quando distância >125, usa `moveEntity(...,true)`, e fase 3 velocidade ×1,22. Se distância >780, acumula leash, interpola rumo à home e, após 3 s com HP abaixo do máximo, reseta. Enquanto está sendo puxado pelo gancho, `updateBoss()` retorna cedo após parte da redução de timers.

### 16.1 Catálogo de ataques

| Ação | Preparação/recarga | Efeito |
|---|---|---|
| `mossCrown` | Windup 0,72; CD conforme fase | `2+fase` raízes ao redor de Nilo, raio 58, esperas `0.35+i*0.08`, dano `max(4,damage*0.3)`, vida 3. Gancho/puxada cancela durante flag `hookBreakable`. |
| `mireTide` | 0,62 | `3+fase` poças de lodo, raio 52, esperas escalonadas, vida 4. |
| `bronzeRush` | 0,68 ou 0,5 fase 3 | Desloca até 260 ao ponto gravado, contato em raios+50 com dano +7. Flag `parryable`. |
| `sealStorm` | 0,58 | `10+fase*2+extraNG` bolhas radiais; velocidade `150+fase*24+12NG`. |
| `undertow` | 0,64 | Onda expansiva com dano `damage+3`, vida 2,05 e raio final arena+45; mais quatro raízes ao redor de Nilo. |
| `summon` | 0,55 | Tenta `2+fase` esponjinhas nível 3; limita esponjas comuns vivas a 8. Minions do chefe: XP zero, sem respawn. |
| `tideWave` | Sem pending/windup convencional | Cria onda em BOSS_POS, vida 2,35, raio final arena+35; CD 1,7 ou 1,35 fase 3. |

Ataques com windup multiplicam preparação por `ngTempoFactor`; suas recargas são 2,05/1,8/1,45 conforme fase, também multiplicadas por tempo NG. `tideWave` no ramo direto não recebe esse mesmo fator de recarga. `resolveBossAttack()` limpa flags de parry/gancho após resolução.

GD026 pretende dar recover de 0,52/0,38/0,66/0,44/0,30/0,25 conforme ataque e vulnerabilidade adicional em coroa/investida/rajada. Mas `updateBoss()` faz `e.recover=.2` logo após chamar a versão final de `resolveBossAttack()`: a recuperação maior é sobrescrita. A vulnerabilidade GD026 permanece. Essa é uma diferença efetiva entre camada de qualidade e execução final.

Story substitui parte das falas do despertar/fase, adiciona frase abaixo de 86% de HP na fase 1 e enfileira narrativa. `updateBossMusic()` usa intervalos 1,8/1,45/1,15 e notas diferentes por fase; só toca com som habilitado.

## 17. Projéteis e perigos: geração, colisão e duração

`enemyShot()` gera projétil com owner, dano atual do dono, origem Y−9, velocidade vetorial e vida 4 s. `bubble` tem raio 11; `spit` raio 6. O dano é copiado no disparo; flags de parry são consultadas no dono no impacto. `addHazard()` grava tipo, centro, raio, espera, owner, vida padrão `wait+0.6`, age/tick e permite overrides via opts.

Em `updateProjectiles()`, `poop` usa interpolação entre ponto inicial e alvo fixo. Outros chamam `v3Projectile()`, movem pelo vetor, decrementam vida e morrem fora de ilha ou ao colidir com Nilo. A colisão com Nilo é teste circular na posição após o deslocamento, sem varredura contínua equivalente à do gancho. O projétil morre mesmo se `hurtPlayer()` ignorar o dano por invulnerabilidade ou parry.

| Perigo | Ativação, dano e regras |
|---|---|
| `splat` | Mancha visual de Pipoca; pula lógica de dano. |
| `sticky` | Após wait, aplica slowTime mínimo 0,2; botas molhadas 0,06. Não causa dano. |
| `spore` | Ativa após wait; se estiver dentro, tenta dano por tick de 0,82 s. Não pode aparar. |
| `root` | Ativa após wait; slowTime 0,28 ou 0,08 com botas; dano a cada 0,95 s. Não pode aparar. |
| `tideWave` | Expande de 20 até maxR pela fração da vida total; quando distância ao anel <30, marca `hit=true` e tenta `max(5,round(damage*0.72))`. Uma tentativa por onda. |
| `enemy` | Impacto circular quando age≥wait; cancela se owner já morto/stun no momento do disparo. |
| `lightning` | Impacto após aviso, flash/som; dano definido na geração, não aparável. |
| `summon` | Ramo genérico legado que cria até três esponjas por ativação, limitado por vivos. |
| `nova` | Ramo genérico legado de bolhas radiais pela fase do owner. |
| `leap` | Move o owner ao centro na ativação e dá dano na área. |
| `slam` | Impacto de área; com fase ≥2 gera oito bolhas. |

Os ramos genéricos summon/nova/leap/slam existem, mas não constituem a sequência atual de Esponjão. O relatório os inclui porque continuam implementados e podem ser usados por diagnóstico/alterações de conteúdo. A lista de chamadas no catálogo ajuda a distinguir declaração de utilização real.

Sticky/spore/root/tideWave possuem processamento próprio antes da guarda geral de owner morto; podem continuar agindo depois da morte do dono. Perigos genéricos marcam triggered e deixam de resolver se owner morto ou stun. Vida é decrementada antes de processar e o filtro de vida positiva só acontece após a passagem; dependendo do dt, a última iteração ainda pode processar um perigo que acabou de expirar.

Na onda, `life+age` mantém a duração total e o raio usa interpolação. `wait` não é testado nesse ramo. `hit=true` é marcado antes do resultado do dano, então uma esquiva/invulnerabilidade que evita a tentativa consome a onda para Nilo. A origem fixa da onda do chefe é BOSS_POS, não a posição atual de Esponjão.

## 18. Mundo, clima, maré e cobertura

`weatherAt()` deriva clima por slots de 84 s e seed, com condições de hora. Dia completo dura 720 s a partir das 8h. `weatherEnemySpeed()` calcula gosma ×1,2 em chuva/tempestade, wisp ×1,08 na neblina e crab/sponge ×1,12 em Recife na maré alta. Na IA inteligente atual, gosma e wisp efetivamente chamam o helper no combate; crab/sponge não o usam no movimento de combate específico, embora ele exista no passeio comum. Não se deve generalizar que toda movimentação desses tipos recebe o bônus de maré.

`updateWeatherSystem()` cria raios em tempestade se longe do abrigo (>210), sem chefe/guardião vivo relevante a menos de 520. Escolhe ponto a 75–230 de Nilo, raio 38, aviso 0,78 s, dano 12 e vida 1,35. Próximo intervalo 4–8,5 s. O perigo climático passa por mitigação/invulnerabilidade/esquiva perfeita como outros danos.

`tideLevel()` usa ciclo de 240 s: `0.5-0.5*cos(fase)`. Solo tidal existe com maré <0,36, em shoals definidos. `updateTideSystem()` cria três inimigos de maré baixa por ciclo (dois crabs e um sponge nível 4, sem respawn), remove-os vivos quando a passagem fecha e chama `rescueFromTide()` se Nilo ficou fora da ilha firme. O resgate cancela gancho/esquiva/tarefa de Pipoca e busca terreno; não é morte nem ataque do pombo. `tidalGroundAt()`/`terrainGroundAt()` influenciam colisão.

Vento em Campos/Dunas aplica deslocamento em `v3Walk()` fora de arenas/abrigo/cobertura. `v3WindData()` força 8 limpo, 14 chuva, 27 vento, 31 tempestade, direção variável. `v3Sheltered()` identifica a faixa atrás de cobertura. `v3Projectile()` curva projéteis comuns por `force*0.72`, limita componentes a ±550 e usa `v3ShotBlock()` com amostragem em passos de até 9 para bloquear por cobertura/raízes/grades. Ignora Pipoca, donos chefe/guardião/miniboss e projéteis em zonas de arena segura.

Vegetação densa via `v3Hidden()` reduz percepção se Nilo está quieto ofensivamente. `v3SafeArena()` exclui arenas de efeitos ambientais: abrigo 230, chefe 510, guardiões 310, minibosses 185. `v3BogAt()` ignora regiões seguras, pedras de travessia e brejo drenado pelo selo de Lodo. Caminhada no brejo recebe fator 0,73, ou 0,9 com botas; slow de perigo é outro multiplicador, que pode acumular.

`v3Update()` detecta pouca movimentação no brejo (<30 unidades/s), acumula espera e cria aviso após 1,65 s ou 2,9 com botas. Aviso esporo: 1,15 s, raio 47, dano 8, cooldown 3,8 s. Pode ser evitado por movimento, invulnerabilidade ou esquiva; por ser tipo spore recebe mitigação de Micélio e não é aparável. Recuperação de posição pode dar invulnerabilidade adicional quando uma barreira fecha sobre Nilo.

## 19. Ritmo dos encontros e eventos dinâmicos

`encounterRhythmQuietStructureAt()` encontra estrutura tranquila mais próxima pelo raio configurado: abrigo 300, NPC 190, placa 225, mistério 155, interação 150, ponto de Pipoca 135, final de mistério 200, momento de exploração 150, segredo 115, waystone 105. `encounterRhythmEnemySafe()` só protege contra comuns inteiros, a mais de 92, excluindo elites/eventos/crias/inimigos tidal e especial perto. Inimigo já ferido não perde pressão automaticamente.

Ao sair do estado `player.combat>0`, abre respiro de 8 s. Três inícios de combate em 45 s abrem redução de pressão por 20 s. Percepção pode receber estrada em movimento ×0,86, respiro ×0,66, pressão ×0,78 e lugar tranquilo ×0,60; helper limita fator a 0,42–1. `encounterRhythmRelocateEnemy()` move spawns comuns da vizinhança de pontos tranquilos na criação, procurando posições válidas sem colidir com outras zonas.

`updateDynamicEvents()` permite um evento ativo. Novos são bloqueados por timer, combat positivo, abrigo <340, puzzle quiet, ritmo/respiro/pressão ou chefe/guardião relevante <600. `eventPoint()` procura até 18 posições caminháveis a 235–355, excluindo abrigo, elites e áreas tranquilas. `eventLevel()` usa nível regional 1/2/3/3/4.

| Evento hostil | Entidades | Conclusão |
|---|---|---|
| Emboscada | 3 bandits ou 4 em nível regional >3 | Todos mortos; 20 ouro +18 XP de evento. |
| Migração | 4 crabs | Todos mortos; 18 ouro +18 XP. |
| Luz Náufraga | Wisp nível regional+1, HP `96+level*14`, velocidade 132 | Morto; 28 ouro +32 XP. |
| Naufrágio | Cache guardado por crab e sponge | Guardas mortos liberam cache; abrir gera moedas de loot e 12 ouro +18 XP. |
| Fenda de Contramaré | 4+min(2,ciclo) inimigos crab/bandit/wisp/sponge, nível regional+1 | Marca veteranos/barreira, cria onda; todos mortos dão `42+6*ciclo` ouro e `45+6*ciclo` XP. |

XP individual de mob é calculado separadamente. Fenda define `ngElite=true` após spawn, mas só recebe multiplicadores específicos de criação quando esses foram aplicados naquele spawn; atribuir o flag depois não reaplica automaticamente HP/XP de veterano.

Eventos não hostis merchant/birdFind/castaway e eventos Living podem ocupar o mesmo canal e impedir evento hostil simultâneo. `chooseDynamicEvent()` considera clima/noite/região/NG+ e Living. Encounter Rhythm troca evento hostil por achado/viajante/mercador se pressão alta ou evento hostil nos últimos 90 s, com exceção parcial da Fenda. Echo tem override externo de 24% para Fenda antes desse seletor interno.

`finishDynamicEvent()` remove estruturas, dá recompensa conforme tipo/motivo e define próximo evento após 46–74 s. Após evento hostil, Rhythm impõe respiro de 10 e próximo evento no mínimo +58 s. Living registra eventos/recompensas próprios; Drift acrescenta +8 ouro a certos eventos não hostis concluídos. Hostis expiram após 85 s se Nilo está a mais de 560; achados/viajantes/Living após 120. Expirar marca mobs mortos sem chamar morte/recompensa normal. Detalhes completos do seletor e eventos de exploração constam no anexo.

## 20. Habilidades, equipamentos e builds

Cada habilidade tem três graus; cada grau custa um ponto. `harpoon` exige ao menos um `line`; `rain` exige `bird`; `agility` exige `vigor`. `showSkills()` valida no clique, desconta ponto, salva e atualiza HUD. Aprender Vigor acrescenta ao HP atual a diferença de HP máximo, não só muda o teto.

| Habilidade | Efeito real |
|---|---|
| Corda longa | +70 alcance/grau; melhora recarga e velocidade de puxada/argola. |
| Punho de ferro | +11 dano de impacto/grau, +7 puxada/grau, +0,15 s stun final/grau. |
| Pombo de guerra | +6 dano/grau; reduz recarga manual e intervalo automático. |
| Chuva branca | +18 raio/grau e +0,5 s stun/grau. |
| Coração de sal | +25 HP/grau e 5% mitigação/grau. |
| Passo fantasma | −4 stamina/grau, menor recarga, maior duração e invulnerabilidade de esquiva, maior janela perfeita, +4 stamina/s de regeneração/grau. A velocidade base da esquiva continua 690. |

`gd026BranchRanks()` soma os dois ranks por ramo. Especialização exige soma ≥4; híbrido exige ≥2 em cada ramo correspondente. Não exige maximizar uma habilidade específica.

| Sinergia | Efeito |
|---|---|
| Cordame | Gancho/puxada ×1,12; recarga ×0,94. |
| Asas | Pipoca ×1,10. |
| Instinto | Fonte reconhecida em janela de counter ×1,12, antes do filtro-base de bloqueio. |
| Cordame+Asas | Gancho/puxada marca o alvo por 3,2 s; próximo `poop` nele ×1,22 e consome marca. |
| Cordame+Instinto | Esquiva perfeita −0,55 s hookCD; parry −0,65 s. |
| Asas+Instinto | Esquiva perfeita −1,4 s manualCD e arma próximo dano de Pipoca ×1,20. |

| Equipamento | Slot | Regra e aquisição |
|---|---|---|
| Gancho do Navegador | tool | +90 alcance e acesso a argolas especiais; quest Ivo âncora. |
| Botas Encharcadas | boots | Slow fator 0,88 em vez de 0,62; brejo 0,9 em vez de 0,73; chuva/tempestade caminhada ×1,09; delays/slow ambientais melhorados; quest Nena marcas. |
| Casaco de Mara | coat | Primeiro dano com proteção pronta ×0,58; cooldown 12 s; presente após dois selos. |
| Anel de Coral | ring | Esquiva perfeita cria stun local e hookCD −0,5; quest Damião sino. |
| Anel da Contramaré | ring | Parry arma carga por 3 s: sem custo, dano ×1,25, alcance/recuo extra; primeira vitória NG+ se ainda não possuído. |
| Fecho do Vendaval | tool | +55 alcance; recarga ×0,90; gancho/puxada ×1,12; Casco. |
| Botas de Micélio Seco | boots | Esporo recebido ×0,65; Oco. |
| Anel da Luz Fendida | ring | Esquiva perfeita arma próxima aplicação `poop` ×1,35; Luz. |
| Casaco de Placas Ferrugem | coat | Dano `bubble`/`spit` ×0,78; Aríete. |
| Anel da Mandíbula de Sal | ring | Abate por última fonte espada/combo/carga/gancho/puxada dentro de 120: +12 stamina e hookCD −0,3; Mandíbula. |

Um item por slot. `hasItem()` lê inventário; `equipped()` compara ID e slot; `equipItem()` valida posse, troca e salva. `showEquipment()` permite troca em overlay; não existe custo de stamina/recarga de equipar. As preparações GD026 são estado de Nilo, não do projétil. No impacto em área, a varredura consome BirdTempo e SplitCharge no primeiro alvo que recebe `damageEnemy`; não multiplica toda a explosão. Também não há expiração de 4 s implementada para BirdTempo, apesar do valor atribuído 4. Remover o anel depois de armar não é verificado novamente no consumo Split.

Salt usa `_gd026LastSource`, definido por dano anterior; uma execução direta pode aproveitar essa última fonte antiga. A categoria “corpo a corpo” inclui gancho/puxada nesse prêmio. O wrapper de abate não faz uma guarda adicional universal de transição vivo→morto para o proc Salt; chamadas repetidas de morte por ferramentas podem diferir do fluxo normal.

## 21. Recompensas, XP, níveis, quests e conquistas

`enemyXpReward()` usa prioridade de categoria: boss → guardian → miniboss → ngElite → eventId → abate repetido → common. Isso importa para um mob de evento veterano: recebe categoria elite antes da redução de evento.

| Categoria | Multiplicador de XP bruto |
|---|---:|
| Chefe/guardião | 1,00 |
| Miniboss | 0,85 |
| Veterano NG+ | 0,70 |
| Mob de evento | 0,35 |
| Comum após primeiro abate (`rewardKills>0`) | 0,15 |
| Comum no primeiro abate | 0,60 |

XP premiado é inteiro, mínimo 1 se bruto >0. Minions com XP zero continuam zero. `gainXP()` arredonda entrada, registra fonte e aplica níveis até 40. Cada nível +1 ponto, restaura `ceil(maxHP*0.5)` limitado ao máximo e stamina 100; pode processar vários níveis em uma chamada. No nível 40, o loop para mesmo que reste XP suficiente.

`killEnemy()` marca morto, desliga aggro, define respawn e retorna cedo para guardianMinion. Demais incrementam `G.kills`, `PLAYTEST.kills`, tutorial e XP. Drop de moedas: comum três pilhas de 2–5; guardião oito de 6; chefe 22 de 10; miniboss sete de 5; veterano seis de 5. Coleta é separada, portanto ouro dropado não é necessariamente ouro recebido naquele instante.

`dropLoot()` cria objeto; `updateLoot()` atrai selos a 90 com velocidade 155 e demais a 118 com velocidade 260, coleta se distância <25. `collectLoot()` adiciona moedas, limita poções a 99 e trata selos. `breakProp()` não dá XP de combate, mas gera moedas. Baús dão quatro pilhas de 7–11, uma poção e 18 XP de exploração.

Quests de eliminação são `killMiniboss`; `questEvent()` distribui evento entre quests ativas cujo objetivo atual combina. `syncQuestProgress()` reconhece objetivos já concluídos pelo estado salvo. `completeQuest()` dá XP/moedas/pontos/item, feedback e save. GD026 adiciona voz, próximo objetivo e conclusão de arco. As quests liberam equipamentos e pontos que mudam combate; não há aumento automático do dano por aceitar uma quest.

Conquistas relacionadas: 50 puxadas registradas (`hook50`), três abates por impacto de Pipoca (`birdTriple`), dez esquivas perfeitas (`perfect10`), chefe sem poção na aventura (`noPotionBoss`, exclui `legacyRun`), vitória NG+ (`ngClear`) e ciclos 3/6/9. `gameEvent()` atualiza contadores e verifica critérios. Não dá multiplicador de dano por conquista. Nos marcos NG+, GD027 usa `if/else if`: concluir diretamente um ciclo alto não dispara todos os marcos inferiores nessa mesma chamada.

## 22. Contramaré / New Game+

`ngPlusState()` normaliza estado; `ngCycle()` inteiro não negativo; `ngActive()` ciclo>0. `startNewGamePlus()` exige partida iniciada e chefe derrotado. Próximo ciclo limitado a 9. Mantém nível/XP/moedas/poções/pontos/habilidades/arma/inventário/equipamento/conquistas, kills e deathCount acumulados; reinicia selos/guardiões/baús/rotas/quests/segredos/tesouros/minibosses/exploração e tempo. Tutorial vem concluído; uso de poções da aventura é zerado. GD027 lembra uma rota conforme regra.

### 22.1 Escalonamento

Para stats gerais, `c=min(5,ciclo)`. `ngRewardFactor=1+0.18*min(4,ciclo)`; `ngTempoFactor=max(0.76,1-ciclo*0.045)`, portanto tempo continua reduzindo após o teto de stats até o piso.

| Categoria | HP | Dano | Velocidade | XP bruto |
|---|---|---|---|---|
| Chefe | ×(1+0,12c) | ×(1+0,055c) | ×(1+0,025c) | ×(1+0,20c) |
| Guardião | ×(1+0,10c) | ×(1+0,05c) | ×(1+0,025c) | ×(1+0,18c) |
| Minion de guardião | ×(1+0,05c) | ×(1+0,035c) | sem fator desse ramo | sem fator desse ramo |
| Demais, incluindo miniboss | ×(1+0,055c) | ×(1+0,03c) | ×(1+0,012c) | ×ngRewardFactor |

Comuns não `mini` podem virar veteranos, probabilidade `min(0.1+c*0.035,0.24)`: HP ×1,32, dano ×1,10, XP ×1,65 e primeira casca. Variantes por tipo: reversalGuard, crossfire, doubleWake, echoBlink, sporeBloom, frenzyPack. O helper Echo pode promover comuns adicionais: HP ×1,22, dano ×1,07, XP ×1,32 e casca. Os caminhos de promoção não são idênticos.

### 22.2 Regras rotativas

`gd027Rule()` usa `(ciclo-1)%4`:

| Ciclos | Regra | Efeitos executados |
|---|---|---|
| 1,5,9 | Iron / Corrente de Ferro | Não chefes/não guardiões dano ×1,025; hookCD ×0,92; dano gancho/puxada/carga em veterano ×1,15; rota forest. |
| 2,6 | Echo / Eco da Ressaca | Chance adicional 8,5% de promoção elegível por worldRand; birdCooldown ×0,91; override 24% Fenda; rota marsh. |
| 3,7 | Surge / Maré Curta | Velocidade ×1,025 elite ou ×1,055 demais; CD inicial ×0,94; dashCooldown ×0,92; parry +4 stamina; rota dunes. |
| 4,8 | Drift / Rota que a Ilha Lembrou | XP bruto de não chefe/não guardião ×1,08; +8 ouro em merchant/birdFind/castaway concluídos; rota reef. |

Fórmulas finais de recarga respeitam ordem dos clamps: hook base → Storm ×0,90 → Cordame ×0,94 → piso 0,48 → Iron ×0,92 → piso 0,45; bird base → Echo ×0,91 → piso 4,4; dash base → Surge ×0,92 → piso 0,58. O CD inicial ×0,94 de Surge não é um fator universal em todas as futuras recargas atribuídas pela IA.

Primeira vitória por ciclo NG+ dá +1 ponto e `60+10*ciclo` ouro; atualiza `lastClearedCycle` e métricas. Anel Contramaré é entregue se não possuído. No ciclo 9, “próximo” continua 9; pode reiniciar a ilha nesse teto, mas `lastClearedCycle=9` impede prêmio de primeira conclusão de novo no mesmo estado.

## 23. Reset de encontros, retorno de morte e vitória

`resetEliteEnemy()` aceita elite vivo com dano/aggro/despertar/ondas. Reenche HP, volta à home, zera stun/flash/impacto/guarda/vulnerável/recuperação/windup/pending e repetição de Pipoca. Guardião volta fase 1, pattern/ondas 0, CD 1,4 e mata minions; chefe adormece, volta fase 1/arena/CD e mata minions. Remove projéteis/perigos do dono, exceto Pipoca, e cancela gancho se preso nele. GD026 zera fase 2 de miniboss e mata crias; não desfaz explicitamente o multiplicador de velocidade de fase 2 do Casco. Repetir fase após reset pode acumular esse fator.

`resetEliteEncounters()` aplica a todos os elites vivos elegíveis, inclusive minibosses. Guardiões/chefe têm reset por leash; miniboss não tem um ramo geral equivalente de leash na IA comum. Morte de Nilo chama reset global quando o botão de retorno é acionado.

`deathRespawnPoint()` monta candidatos do abrigo, waystones conhecidos e âncoras dos selos, ordena pela distância da morte e escolhe primeiro ponto seguro por `v3FindSafe()`. `showDeath()` mostra penalidade `min(40,floor(coins*0.1))`. Ao retornar: preserva progressão, desconta penalidade, enche HP/stamina, invulnerabilidade 3 s, zera combat/attackCD, cancela gancho, reinicia transitórios V3, limpa projéteis/perigos e reposiciona pombo/câmera. Não existe perda de nível, habilidade, equipamento ou selo.

Na morte do chefe, registra vitória/ciclo/conquista, dá invulnerabilidade mínima 4 s, hit stop 0,34, `pendingWin=0.85`, limpa hazards e projéteis exceto Pipoca, mata esponjas vivas e salva. O temporizador lógico e callback de 900 ms oferecem caminhos de abertura de vitória. Story adia o modal enquanto há cena tocando ou pendente, tentando de novo após 500 ms. `showVictory()` zera pendingWin, apresenta estatísticas e permite continuar explorando ou iniciar NG+; Final Polish adiciona contagens e GD027 a regra seguinte.

## 24. HUD, telegraphs, feedback, acessibilidade e renderização

`updateHUD()` exibe HP/stamina/XP/nível/moedas/poções/pontos, selos, contexto de combate e objetivo. Vida <30% altera barra, <25% retrato; stamina <24 tired e <12 exhausted. Slots mostram recarga, atividade de carga/parry/gancho, buffer e estágio máximo. `pulseCooldownReady()` anima ação pronta ao cruzar 0,08 s. Barra do chefe aparece vivo/desperto a menos de 800; `updatePolish()` mantém barra atrasada para percepção do dano.

O caption prioriza carga → parry → janela perfeita → counter → puxada → engate → tutorial de combo. `POLISH.counterTimer` é feedback separado de `player.counterWindow`: o texto não é uma validação exata de toda janela de dano. HUD também escolhe execução e interação; sua atualização-base ocorre a cada >0,085 s, além de chamadas explícitas.

`gd027TouchFeedback()` mostra cooldowns numéricos, estado pronto/contexto, “PUXE” e “MIRA”, quantidade de poções, carga e contexto de execução. `gd027BindTouchPresses()` adiciona classe de pressionado e métrica. Os listeners de combate continuam em `08-input.js`.

`drawCombatTelegraph()` exibe alerta/investigação, progresso de windup, linhas de tiro/investida, área de esporo, guarda, vulnerabilidade e execução. Labels full exibem nomes; essencial reduz texto. `drawGuardianOverlay()` e `drawBossArenaState()` acrescentam instrução de parry/gancho/área e contorno de arena. `drawHazard()` desenha perímetro, contagem visual e expansão do perigo. Essas funções não calculam hit; podem produzir aparência diferente da hitbox circular efetiva.

`drawEnemy()`/`drawBoss()` usam deformação de impacto, flash e estado; `drawStun()` desenha estrelas; `drawSword()` arco visual; `drawHook()` corda/gancho; `drawProjectile()` trajetória visual; `drawPigeon()` oportunidade/dica/comemoração; `drawLoot()` identifica recompensa. `render()` compõe terreno, perigos, fila de entidades por profundidade, efeitos e overlays com câmera. O build insere `playerRendererBridge.prepare()` e delega corpo/efeitos/trail de Nilo ao Pixi quando pronto.

`combatImpact()` marca impacto, shake, hit stop para forte/crítico, hit marker e câmera; `impactProfile()` escolhe paleta por inimigo/fonte; `impactBurst()` gera partículas. `text()` dura 1,08 s e `updateParticles()` move textos/partículas/trails e poda cosméticos. `burst()` usa effectsFactor e pool; não remove projéteis ativos.

`initAudio()` prepara Web Audio, `tone()` sintetiza os sons, `sound()` mapeia espada/hit/heavy/gancho/reel/Pipoca/impacto/dash/perfeito/block/parry/charge/execute/poção/nível/chefe. `polishMusic()`/`polishAmbience()` mudam ambiente em combate; chefe tem música própria. `updatePolish()` pulsa vida crítica e confirma golpes; `drawPolishScreen()` mostra direção de dano, flashes e vinheta. `haptic()` depende de preferência e suporte do navegador.

Preferências controlam shake, flashes, texto, contraste, movimento reduzido, assistência de mira, touch, vibração, labels, qualidade e remapeamento. Movimento reduzido atenua animação e certas atribuições de shake, sem alterar alcance, HP ou timer das ações. Alguns ramos ainda atribuem `G.shake` diretamente; a renderização aplica preferência na apresentação. Alertas de dano e efeitos devem ser avaliados também pelos controles `PREFS.flashes`/`PREFS.shake`.

### 24.1 Pixi e animação

`createAnimator()` produz pose reutilizável. Prioridade: dash → hurt → attack → parry → charge → walk → idle. Movimento orienta pés; ataque/carga/parry usam mira; parada conserva direção. `progress=1-attackAnim/attackAnimMax`; pose não chama dano nem modifica cooldown. `CharacterView.update()` aplica pose aos sprites/rig, lâmina, anel e sparks; `destroy()` libera recursos.

`src/pixi-player.js` cria superfície WebGL 384×256 transparente, sem ticker automático separado. `prepare()` atualiza ator no loop existente, limita render do ator a 30/60 conforme perfil e força redraw na mudança de estado. `drawBody`/`drawEffects`/`drawTrail` compõem recortes no Canvas original. Erro ou perda de contexto troca para Canvas; `?renderer=canvas` força fallback. Atlas procedural é compartilhado por paleta e usa contagem de referências. Não há hitbox proporcional à resolução do sprite.

### 24.2 Proteção de performance

`gd027RuntimeGuard()` a cada 0,75 s poda cosméticos, recupera estado inválido e reduz efeitos/pressão no mobile quando custos altos. `gd027TrimCosmetics()` limita textos/trails/partículas; projéteis/perigos só são filtrados quando já mortos/inativos em situações anormais, não descartados por quantidade gráfica. `gd027RecoverInvalidState()` corrige coordenadas/HP/stamina não finitos ou fora do mundo, busca solo e cancela gancho/touch.

`src/game/graphics.js` substitui funções de perfil visual, minimapa, resolução, efeitos e cadência de desenho; o orçamento lógico inicial é preservado por constantes específicas. Perfil gráfico não refaz mundo nem reinicia inimigos. Separar cosmético não significa que todo comportamento temporal seja idêntico em qualquer FPS: há discretização, throttling de IA distante e estados consultados por ordem de atualização.

## 25. Save, carregamento e integridade do progresso

`packSave()` persiste posição/HP/stamina/XP/nível/moedas/poções/pontos/habilidades/arma, selos/guardiões/baús/rotas, tempo/abates/vitória/mortes, tutorial, quests, segredos, inventário/equipamento, tesouros, conquistas, NG+, minibosses e exploração/story. Não salva os arrays de inimigos, HP parcial de elite, projéteis, perigos, gancho, janelas defensivas, combo, recargas ou preparações de Pipoca.

`cleanSave()` migra versões, limita valores e filtra IDs conhecidos. Level 1–40, arma 0–3, skills 0–3, stamina 0–100, poções 0–99, pontos 0–120, moedas 0–999999, ciclo 0–9. Equipamento exige slot correto e posse. `bossDefeated` só é aceito com três selos. `readSave()` tenta principal e backup. `saveGame()` exige partida e HP positivo; copia save principal validado para backup antes de gravar o novo; auto-save base a cada >25 s e vários eventos salvam imediatamente.

`prepareGameState()` cria Nilo e atribui os campos persistidos, limita HP ao máximo e força stamina 100, mesmo que o save contenha stamina menor. `buildWorld()` reconstrói entidades a partir da seed e progresso; encontros não concluídos retornam com ficha cheia. `finalizeGameStart()` recupera posição, exibe HUD e salva. Recarregar não preserva uma luta parcialmente vencida nem cooldowns usados para abri-la.

`setModal()`/`closeOverlay()` cancelam carga/buffer e controlam pausa/foco. `travelTo()` exige rota conhecida, `combat<=0` e nenhum inimigo aggro a menos de 360; cancela gancho/tarefa de Pipoca e concede invulnerabilidade 2 s. Exportar/importar save usa JSON validado, sem executar código do arquivo. Os dados são locais por origem do navegador; não há lógica de combate em servidor neste projeto.

## 26. Telemetria, debug, automação e testes

`PLAYTEST` registra ataques/hits/carga/dash/parry/perfeitas/poções/abates/mortes/dano por fonte/XP/níveis/curas/upgrades/combos/reset de elites/nível de entrada e vitória. `combatRecordDamage()` classifica Pipoca, carregado, gancho/puxada/caixa e espada/combo. `playtestReport()` calcula acurácia `hits/attacks`, razão de dano e estatísticas; wrappers acrescentam ritmo, domínio, build, minibosses, regras NG+ e runtime. Esses indicadores não são uma especificação formal de acerto: execução e fallback de carga têm diferenças de contagem já descritas.

`journeyTick()` e seus helpers registram encontro de combate, tempo/posição, mortes, mudanças de progressão, interações e eventos. `journeyTrackCombat()` usa `player.combat>0` para início/fim; `journeyDeath()` captura contexto. Os dados têm limites e persistência local; `journeyReport()`/`journeyExport()` permitem análise da jornada. O anexo inclui esquema, limites, flags de ativação e wrappers completos para não ocultar instrumentação.

No modo diagnóstico, `07-debug.js` inclui comandos e visão de estado para inspecionar combate, colisão, IA e progressão. `06c0-agent-config.js` e `06d-ai-player-harness.js` permitem controle de jogador artificial; o loop diagnóstico também aceita freeze de percepção. Esses caminhos não são controles normais disponíveis ao jogador no bundle seguro. O build substitui funções de painel por no-op onde os listeners ainda as chamam.

`runSelfTest()` e wrappers validam save, IDs, estruturas/puzzles, narrativa, ritmo e itens; `finalPolishSelfTest()` verifica apresentação/build/save. Não equivalem a simular todos os ataques. Os testes existentes foram executados na auditoria: **19 testes passaram, zero falhas** (`npm test`); **checagem sintática passou** (`npm run check`). Cobrem animação/direções/pausa/movimento reduzido, slots de desenho, encapsulamento, perfis gráficos, notificações mobile e integração narrativa. Não há nessa suíte uma cobertura completa de fórmulas, IA, chefes ou todos os encadeamentos de dano. Não foi executado um playtest humano exaustivo nem medição em celular físico para este relatório.

### 26.1 APIs de diagnóstico que podem afetar uma luta

No bundle de diagnóstico, `window.MareDebug` oferece `spawn` dos seis tipos comuns (nível limitado a 1–10), teleport para terreno válido, concessão de XP/moedas/equipamento, mudança de clima/hora/maré, disparo de evento e flags de god mode/colisão/aggro/caminhos. `killBoss()` força despertar e chama a morte diretamente; `resetBoss()` remove o chefe anterior e recria sua ficha, com despertar condicionado aos três selos. Esses comandos podem alterar uma aventura e alguns resultados são salvos pelos helpers chamados. `runDebugCommand()` interpreta uma lista fechada de comandos; não utiliza eval para interpretar a entrada. `selectNearestDebug()` escolhe a entidade viva mais próxima; `updateDebugPanel()` mostra HP, timers, estados, stats, região e métricas.

O harness `window.MareAIPlayer` exige configuração de agente no modo diagnóstico. `availableActions()` restringe ações conforme título, morte e overlay; `ensureAllowed()` registra tentativas recusadas. `act({type,...})` encaminha `attack`, `dash`, `parry`, `bird`, `hook`, `potion` e `interact` às mesmas funções do jogador. `charge` segura por 0,15–1,05 s de relógio do navegador antes de soltar; a carga lógica continua limitada a 1 s. `move` usa direções cardinais/diagonais por 0,15–6 s; `hold` mantém movimento por 0,2–6 s de tempo do jogo até `tick()` limpar; `stop` limpa teclado/touch; `face` orienta Nilo e desliga mira de mouse. `wait` aguarda 0,1–8 s, e `choose` clica botão visível de modal por índice começando em 1. Ações têm pequenos delays de observação e são registradas, mas não substituem as guardas internas das funções de gameplay.

`observation()` descreve HUD, inimigos/objetos visíveis, modal e ações disponíveis. `beginPerception()`/`endPerception()` mantêm profundidade de congelamento e `MARE_AI_PERCEPTION_FREEZE`; a versão segura fixa esse caminho como desativado. `report()` combina métricas de jornada e ações, `finish()` encerra a execução, e `resetAll()` remove o progresso local/configurado daquele teste. Esse reset é ferramenta de diagnóstico, não regra de morte do jogo. O anexo contém todos os limites e o corpo dessas APIs.

### 26.2 Conferência dirigida desta auditoria

Além da suíte existente, a auditoria confirmou os hashes dos **63 arquivos**, analisou sintaticamente os **13 trechos de código** inseridos e executou **sete verificações dirigidas** usando as próprias funções extraídas das fontes: dano de contra-ataque mais vulnerabilidade; guarda frontal de caranguejo; três golpes de combo; carga completa; redução repetida do stun de Pipoca; fórmulas iniciais de HP/dano/XP; e sobrescrita da recuperação do chefe após GD026. Todas passaram. O último caso confirmou recuperação final de 0,2 s e preservação de vulnerabilidade de aproximadamente 0,84 s para bronzeRush no cenário isolado.

Essas verificações usam dependências de apresentação simuladas e valores controlados. Elas confirmam os casos descritos, sem substituir uma partida completa. O [verificador reproduzível](./verificar-relatorio.mjs) pode ser executado a partir da raiz com `node docs/combate/verificar-relatorio.mjs`; se alguma fonte mudar, a conferência de hashes identifica que o snapshot precisa ser atualizado.

## 27. Particularidades e riscos identificados na leitura

Os pontos abaixo documentam a execução observada no código; não foram corrigidos como parte desta entrega.

| Ponto | Evidência e consequência |
|---|---|
| HP dos guardiões | Valores das fichas são multiplicados por 3 na criação; usar só `GUARDIANS.hp` subestima HP. |
| Primeiro ataque da sequência | Guardiões e chefe incrementam pattern antes do módulo, começando pelo índice 1. |
| Recuperação do chefe | Recover GD026 é sobrescrito por 0,2 s no chamador; vulnerabilidade continua. |
| Bônus de Pipoca em área | BirdTempo/SplitCharge são consumidos por primeira aplicação de dano no loop, não por todo o impacto; BirdTempo não possui decremento temporal. |
| Interrupção por stun | Pending é resolvido antes de testar stun na IA comum/guardião/chefe; precisa cancelamento explícito para impedir ataque preparado. |
| Fonte elite de projétil | Parry depende de `owner.parryable` no momento do hit; não é flag capturado no tiro. |
| Dano da arena | Fonte é chefe direto; durante flag parryable, essa tentativa também pode entrar no parry-base, sem teste de cone/distância específico da ação. |
| Gancho em guardião | Estado engatado congela updateGuardian; comportamento não é apenas aplicar stun. |
| Investida de Musgo | Flag hookBreakable existe, mas quebra especial por flag no dano é limitada ao chefe. |
| Execução | Mata diretamente; pode usar última fonte antiga para Salt e não atualiza todos os contadores de ataque/execução. |
| Buffer e estatística de carga | Buffer pode expirar no decremento antes do teste; carga sem fôlego faz fallback após contar tentativa carregada. |
| Crítico/hit | Críticos são por alvo; hit count registra interseção e props, não apenas dano aceito. |
| Respawn de slime dividido | Reativa splitDone, mas não restaura explicitamente tamanho/peso/velocidade modificados. |
| Casco fase/reset | Reset não remove ×1,06 de velocidade; nova entrada em fase 2 pode multiplicar de novo. |
| Bônus climático | Helper contém crab/sponge em maré alta, mas padrões de combate desses tipos não o chamam. |
| Fenda promovida após spawn | Marcar veterano depois da criação não reaplica automaticamente todos os stats de promoção. |
| Onda expansiva | Wait não governa esse ramo; uma tentativa evitada marca hit e consome contato da onda. |
| Perigos de dono morto | Root/spore/sticky/onda têm caminhos próprios e podem permanecer ativos. |
| Recarga durante carga | Não há cancelamento geral por dash; ações têm guardas diferentes e podem coexistir. |
| Save de itens de miniboss | Morte-base salva antes do wrapper GD026 conceder item, que então salva de novo; são duas etapas. |
| Tetos NG+ | Ciclo 9 pode ser reiniciado, mas primeiro-clear não se repete; stats gerais saturam em 5, recompensa geral em 4, tempo usa ciclo até piso. |
| Diagnósticos | Remover APIs públicas não remove toda telemetria interna nem a exportação local de jornada. |

## 28. Catálogo explicativo das funções por responsabilidade

Esta tabela completa o mapeamento das rotinas centrais e de suporte. Os corpos integrais, incluindo callbacks, reatribuições e helpers de apresentação não listados individualmente aqui, estão no anexo e no catálogo extraído da AST.

| Rotinas | Contrato e efeitos |
|---|---|
| `maxHP`, `attackDamage`, `xpNextFor`, `xpNext` | Calculam stats de Nilo/progressão; leem level, weapon, skills e BALANCE. |
| `hookRange`, `hookCooldown`, `birdCooldown`, `dashCooldown` | Calculam disponibilidade/alcance aplicando wrappers de itens, sinergias e NG+. |
| `makePlayer` | Cria estado inicial e todos os timers-base. |
| `currentAim`, `screenToWorld`, `nearestEnemy` | Convertem mira e selecionam direção/alvos sem causar dano. |
| `movementVector`, `updatePlayer`, `v3Walk`, `moveEntity` | Entradas, timers, regeneração, movimento e deslocamentos. |
| `gridAdd`, `obstacles`, `obstacleRadiusFor`, `walkable`, `segmentDistance` | Consulta geométrica/estática e colisão de gancho/movimento. |
| `attack`, `beginAttackCharge`, `releaseAttackCharge`, `chargedAttack` | Combo, charge e buffer; acionam dano e efeitos. |
| `parry`, `tryParry`, `dash`, `triggerPerfectDodge`, `armCounter` | Defesa temporal, interrupção, bônus e oportunidade. |
| `isExecutable`, `executeEnemy`, `interact` | Elegibilidade/seleção contextual e morte direta. |
| `useHook`, `updateHook`, `v3HookAim`, `v3Hookable`, `v3TargetRelevant` | Máquina do gancho, escolha e engate em combate/mundo. |
| `v3HookLatched`, `v3HookMissFeedback`, `v3Pull`, `v3ReelWeight` | Feedback/acionamento físico de mecanismos e puxada de lastro. |
| `birdAttack`, `updateBird`, `registerBirdControl` | Comando e IA de Pipoca, recargas, resgate e repetição de stun. |
| `nearestBirdClue`, `birdScout`, `finishBirdScout` | Alternativa exploratória ao ataque sem alvo. |
| `v3BirdCommand`, `v3BirdUpdate`, `v3ReleaseBird` | Ocupação/liberação de Pipoca em puzzle e bloqueio do fluxo de ataque. |
| `combatMeleeSource`, `combatRecordDamage`, `combatImpact` | Classificação de fontes, métricas e feedback de dano. |
| `damageEnemy`, `hurtPlayer`, `maybeSplitSlime`, `killEnemy` | Transformação de dano, aplicação, divisão e morte/recompensas. |
| `drinkPotion`, `staminaDenied`, `showCamp` | Consumível, recusa de gasto, cura/descanso/upgrades. |
| `enemyShot`, `addHazard`, `updateProjectiles`, `v3Projectile`, `v3ShotBlock` | Geração, atualização, colisão, cobertura e dano de área. |
| `dropLoot`, `breakProp`, `updateLoot`, `collectLoot` | Objetos de recompensa e coleta, incluindo selos. |
| `spawnEnemy`, `buildWorld`, `buildWorldProgressiveMobile` | Fichas, overrides, criação/reconstrução de inimigos e arenas. |
| `smartEnemy`, `setEnemyState`, `enemyAwareness`, `smartWander` | Classificação, estados, percepção e passeio. |
| `startEnemyStrike`, `resolveEnemyStrike`, `updateSmartCombat`, `updateSmartEnemy`, `wakeSpongePack` | Decisão ofensiva, preparação e resolução de cada espécie. |
| `guardianPhaseFor`, `mirelingsAlive`, `spawnGuardianMinions`, `guardianSpeak` | Fases, proteção de Lodo, ondas e falas. |
| `startGuardianAttack`, `resolveGuardianAttack`, `updateGuardian` | Padrões próprios dos três guardiões. |
| `bossSpeak`, `bossPhaseStinger`, `updateBossMusic`, `startBossAttack`, `resolveBossAttack`, `updateBoss` | Estados, ataques, áudio e fases de Esponjão. |
| `updateEnemies`, `resetEliteEnemy`, `resetEliteEncounters` | Cadência de IA, respawn e recomposição de encontros. |
| `qualityEnemyIntro`, `qualityExpose`, `qualityResetRuntime` | Apresentação da identidade, janelas de domínio e limpeza. |
| `gd026MiniMastery`, `gd026MiniPhase`, `gd026BranchRanks`, `gd026Synergies`, `gd026Reset` | Bônus, fase adicional, build e métricas. |
| `hasItem`, `equipped`, `grantEquipment`, `equipItem`, `showEquipment` | Posse, slot, recompensa, troca e UI de equipamento. |
| `gainXP`, `enemyXpReward`, `showSkills` | XP por categoria, níveis e aplicação de skills. |
| `questRequirementsMet`, `syncQuestProgress`, `questEvent`, `completeQuest`, `startQuest` | Gates, progresso e recompensa das quests ligadas a combate. |
| `achievementState`, `gameEvent`, `unlockAchievement`, `achievementProgress`, `showAchievements` | Contadores/requisitos e exibição das conquistas. |
| `ngPlusState`, `ngCycle`, `ngActive`, `ngLabel`, `ngTempoFactor`, `ngRewardFactor`, `applyNgPlusEnemy`, `startNewGamePlus` | Ciclo, escala, variantes e reinício. |
| `gd027Rule`, `gd027PromoteVeteran`, `gd027RememberedWaypoint`, `gd027RuleText` | Regra rotativa, promoção extra e rota lembrada. |
| `eventRoll`, `eventPoint`, `eventLevel`, `chooseDynamicEvent`, `startDynamicEvent`, `finishDynamicEvent`, `updateDynamicEvents` | Agendamento, seleção, spawn, conclusão e expiração de eventos. |
| `startLivingDynamicEvent`, `livingEventReward`, `livingCompleteEvent`, `livingFinishBirdEvent` | Eventos exploratórios e recompensa no canal dinâmico compartilhado. |
| `encounterRhythmReset`, `encounterRhythmPreTick`, `encounterRhythmPostTick`, `encounterRhythmRecordCombatStart` | Contexto de pressão/respiro e contadores. |
| `encounterRhythmQuietStructureAt`, `encounterRhythmQuietPoint`, `encounterRhythmSpecialThreatNear`, `encounterRhythmEnemySafe`, `encounterRhythmAwarenessScale` | Proteções espaciais e ajuste de percepção. |
| `encounterRhythmBlocksEvent`, `encounterRhythmHash`, `encounterRhythmRelocateEnemy`, `encounterRhythmApplyWorldSpacing`, `encounterRhythmReport` | Adiamento e distribuição de ameaças, diagnóstico. |
| `weatherAt`, `weatherNow`, `weatherEnemySpeed`, `updateWeatherSystem`, `nightStrength` | Clima, efeitos de velocidade/percepção e raios. |
| `tideLevel`, `tideInfo`, `lowTideOpen`, `tidalGroundAt`, `terrainGroundAt`, `updateTideSystem`, `rescueFromTide` | Solo tidal, spawn, fechamento e resgate. |
| `v3WindData`, `v3Sheltered`, `v3Hidden`, `v3SafeArena`, `v3BogAt`, `v3Awareness`, `v3Update` | Efeitos ambientais na mobilidade, percepção e dano. |
| `v3SolidAt`, `v3WallOpen`, `v3GapAt`, `v3FindSafe`, `v3RecoverPosition`, `v3ResetTransient` | Barreiras, retorno seguro e reset de mundo transitório. |
| `update`, `loop`, `startGameLoop`, `mobileLogicDelta`, `shouldRenderGameFrame` | Orquestração/relógio/pausa/hit stop e cadência. |
| `updateHUD`, `pulseCooldownReady`, `gd027TouchFeedback`, `gd027EnsureTouchBadges`, `gd027BindTouchPresses` | Estado disponível ao jogador e controles mobile. |
| `drawCombatTelegraph`, `drawGuardianOverlay`, `drawBossArenaState`, `drawHazard` | Avisos de timing, guarda, domínio, arena e risco. |
| `drawPlayer`, `drawHuman`, `drawEnemy`, `drawBoss`, `drawStun`, `drawSword`, `drawHook`, `drawProjectile`, `drawPigeon`, `drawLoot`, `render` | Apresentação Canvas, sem aplicação direta de dano. |
| `impactProfile`, `impactBurst`, `burst`, `text`, `updateParticles`, `cameraImpact` | Impacto visual, textos e cosméticos. |
| `initAudio`, `tone`, `sound`, `haptic`, `polishMusic`, `polishAmbience`, `updatePolish`, `drawPolishWorld`, `drawPolishScreen` | Feedback de áudio/vibração e apresentação de combate. |
| `createAnimator`, `CharacterView.update`, `bridge.prepare`, `drawBody`, `drawEffects`, `drawTrail` | Adaptação visual Pixi com fallback, pose e composição. |
| `gd027TrimCosmetics`, `gd027RecoverInvalidState`, `gd027RuntimeGuard`, `graphicsTier`, `graphicsProfile` | Orçamento e recuperação de runtime sem descarte de ataques ativos. |
| `deathRespawnPoint`, `showDeath`, `showVictory`, `finalCombatHeartbeat`, `finalInjectVictorySummary` | Retorno, fim do objetivo e feedback de jornada. |
| `storySafe`, `storyQueue`, `storyTick`, `storyNotify`, `storyFinish` | Narrativa segura, cenas por selo/chefe e espera da vitória. |
| `packSave`, `cleanSave`, `migrateSave`, `readSave`, `saveGame`, `prepareGameState`, `finalizeGameStart` | Validação, persistência e reconstrução do combate. |
| `setModal`, `closeOverlay`, `showPause`, `travelTo`, `returnTitle` | Suspensão, foco, cancelamento de entradas e transição. |
| `resetPlaytest`, `playtestReport`, `runSelfTest`, `journeyTick`, `journeyTrackCombat`, `journeyDeath`, `journeyReport`, `journeyExport` | Instrumentação e verificações, distintas de regras de dano. |

## 29. Como conferir qualquer informação deste relatório

O [catálogo](./catalogo-funcoes.md) identifica declaração e cada wrapper separadamente, lista a linha e as chamadas diretas; ele também inclui funções de diagnóstico. O [anexo](./anexo-fontes.md) preserva os arquivos completos em ordem de composição e arquivos de suporte, com hashes. O [manifesto](./manifesto.json) identifica a base Git, o estado local e os resultados de testes. O inventário não tenta inferir chamadas dinâmicas, eventos DOM ou todos os efeitos de callbacks; esses constam no código completo e no fluxo explicado acima.

Para alterar balanceamento, confira primeiro o atributo-base, depois a criação com opts, NG+, wrappers de dano e a etapa que arredonda/consome estados. Para alterar timing, confira preparação, recuperação, pending, stun, pause/hit stop e cadência de update. Para alterar apresentação, confira o fallback Canvas, a ponte Pixi e os perfis finais do build. Os arquivos gerados `public/js/game.js` e `index.html` refletem a versão local; as fontes editáveis e o script de geração estão preservados na auditoria.

## 30. Referências diretas às implementações

As localizações abaixo remetem às declarações originais; as reatribuições estão no catálogo.

- [makePlayer](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:78) — `src/game/beta/03-gameplay.js:78`.
- [updatePlayer](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:238) — `src/game/beta/03-gameplay.js:238`.
- [attack](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:207) — `src/game/beta/03-gameplay.js:207`.
- [beginAttackCharge](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:208) — `src/game/beta/03-gameplay.js:208`.
- [releaseAttackCharge](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:209) — `src/game/beta/03-gameplay.js:209`.
- [chargedAttack](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:210) — `src/game/beta/03-gameplay.js:210`.
- [parry](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:211) — `src/game/beta/03-gameplay.js:211`.
- [tryParry](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:212) — `src/game/beta/03-gameplay.js:212`.
- [dash](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:220) — `src/game/beta/03-gameplay.js:220`.
- [triggerPerfectDodge](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:221) — `src/game/beta/03-gameplay.js:221`.
- [armCounter](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:75) — `src/game/beta/03-gameplay.js:75`.
- [executeEnemy](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:214) — `src/game/beta/03-gameplay.js:214`.
- [useHook](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:215) — `src/game/beta/03-gameplay.js:215`.
- [updateHook](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:218) — `src/game/beta/03-gameplay.js:218`.
- [birdAttack](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:219) — `src/game/beta/03-gameplay.js:219`.
- [updateBird](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:51) — `src/game/beta/03-gameplay.js:51`.
- [registerBirdControl](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:76) — `src/game/beta/03-gameplay.js:76`.
- [damageEnemy](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:224) — `src/game/beta/03-gameplay.js:224`.
- [hurtPlayer](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:235) — `src/game/beta/03-gameplay.js:235`.
- [killEnemy](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:234) — `src/game/beta/03-gameplay.js:234`.
- [maybeSplitSlime](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:223) — `src/game/beta/03-gameplay.js:223`.
- [spawnEnemy](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:125) — `src/game/beta/03-gameplay.js:125`.
- [updateEnemies](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:298) — `src/game/beta/03-gameplay.js:298`.
- [updateSmartEnemy](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:261) — `src/game/beta/03-gameplay.js:261`.
- [updateSmartCombat](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:255) — `src/game/beta/03-gameplay.js:255`.
- [startEnemyStrike](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:246) — `src/game/beta/03-gameplay.js:246`.
- [resolveEnemyStrike](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:247) — `src/game/beta/03-gameplay.js:247`.
- [updateGuardian](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:282) — `src/game/beta/03-gameplay.js:282`.
- [startGuardianAttack](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:280) — `src/game/beta/03-gameplay.js:280`.
- [resolveGuardianAttack](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:281) — `src/game/beta/03-gameplay.js:281`.
- [updateBoss](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:296) — `src/game/beta/03-gameplay.js:296`.
- [startBossAttack](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:294) — `src/game/beta/03-gameplay.js:294`.
- [resolveBossAttack](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:295) — `src/game/beta/03-gameplay.js:295`.
- [resetEliteEnemy](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:289) — `src/game/beta/03-gameplay.js:289`.
- [updateProjectiles](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:320) — `src/game/beta/03-gameplay.js:320`.
- [enemyShot](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:239) — `src/game/beta/03-gameplay.js:239`.
- [addHazard](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:240) — `src/game/beta/03-gameplay.js:240`.
- [gainXP](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:204) — `src/game/beta/03-gameplay.js:204`.
- [enemyXpReward](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:205) — `src/game/beta/03-gameplay.js:205`.
- [collectLoot](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:236) — `src/game/beta/03-gameplay.js:236`.
- [gd026Synergies](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06g-quests-builds-bosses.js:35) — `src/game/beta/06g-quests-builds-bosses.js:35`.
- [gd026MiniMastery](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06g-quests-builds-bosses.js:78) — `src/game/beta/06g-quests-builds-bosses.js:78`.
- [gd026MiniPhase](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06g-quests-builds-bosses.js:102) — `src/game/beta/06g-quests-builds-bosses.js:102`.
- [gd027Rule](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06h-mobile-performance-contramare.js:24) — `src/game/beta/06h-mobile-performance-contramare.js:24`.
- [applyNgPlusEnemy](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:13) — `src/game/beta/03-gameplay.js:13`.
- [startNewGamePlus](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:14) — `src/game/beta/03-gameplay.js:14`.
- [encounterRhythmEnemySafe](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06e-encounter-rhythm.js:11) — `src/game/beta/06e-encounter-rhythm.js:11`.
- [encounterRhythmAwarenessScale](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06e-encounter-rhythm.js:12) — `src/game/beta/06e-encounter-rhythm.js:12`.
- [v3Awareness](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06-world-v3.js:68) — `src/game/beta/06-world-v3.js:68`.
- [v3Projectile](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06-world-v3.js:67) — `src/game/beta/06-world-v3.js:67`.
- [v3Walk](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06-world-v3.js:66) — `src/game/beta/06-world-v3.js:66`.
- [v3Update](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/06-world-v3.js:100) — `src/game/beta/06-world-v3.js:100`.
- [updateDynamicEvents](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:336) — `src/game/beta/03-gameplay.js:336`.
- [packSave](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:166) — `src/game/beta/03-gameplay.js:166`.
- [cleanSave](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/03-gameplay.js:164) — `src/game/beta/03-gameplay.js:164`.
- [showDeath](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/05-ui-save.js:49) — `src/game/beta/05-ui-save.js:49`.
- [showVictory](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/05-ui-save.js:50) — `src/game/beta/05-ui-save.js:50`.
- [drawCombatTelegraph](C:/Users/User/Documents/ChatGPT/marebrava/src/game/beta/04-renderer.js:49) — `src/game/beta/04-renderer.js:49`.
- [createAnimator](C:/Users/User/Documents/ChatGPT/marebrava/src/characters/animation.js:5) — `src/characters/animation.js:5`.
