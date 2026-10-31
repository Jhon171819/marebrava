# Maré Brava

Baseado na beta publicada GD-028 (`4.2-world5-gd028-final-player-experience`), importada da subpasta `game/` de Maré Brava. Preserva puzzles, missões, progressão, Contramaré, controles touch e Save V7. A pasta publicada é apenas a fonte de importação; o desenvolvimento e o build continuam neste projeto Vite.

Nilo usa PixiJS 8 com um rig 2D de partes articuladas: pernas, braços, cabeça, olhos, lenço e gancho. Inclui respiração, piscadas, caminhada em oito direções, carga, ataque, esquiva, defesa e reação a dano. Paleta e proporções seguem o desenho original.

## Rodar

É necessário Node.js. Pixi usa WebGL; sem suporte ou na perda de contexto, o personagem continua no Canvas original. Para comparar, acrescente `?renderer=canvas` à URL local.

```powershell
npm install
npm run dev
```

Abra o endereço local indicado pelo Vite. Para gerar a versão de produção, execute `npm run build` (saída em `dist/`). Para verificar a sintaxe, execute `npm run check`.

Também é possível abrir diretamente o `index.html` da raiz ou o `dist/index.html` gerado pelo build. Nesse modo, o jogo usa Canvas e carrega o script clássico local; Pixi requer servir o projeto. O build inclui a biblioteca localmente, sem CDN. Execute `npm test` para os testes de animação e perfis gráficos. Após o build, `npm run test:browser` testa a versão de produção em um perfil isolado do Chrome (Windows; use `CHROME_PATH` para outro caminho). As capturas ficam em `test-results/`. A emulação não substitui medições de FPS em celulares físicos.

Para publicar, envie o conteúdo de `dist/` ao servidor HTTP (raiz ou subpasta, como `/game/`; os assets usam caminhos relativos). A página principal deste projeto continua sendo o jogo; a landing page da pasta de Downloads não é incorporada. Para testar a versão com Pixi, use HTTP, por exemplo com `npm run preview`; ao abrir `dist/index.html` por `file://`, o jogo usa Canvas.

`npm run dev` também usa o bundle seguro, sem APIs de diagnóstico no `window`. Para inspecionar telemetria local, use explicitamente `npm run generate:dev` ou `npm run dev:diagnostic`. `npm run build` usa o bundle de produção: remove o debug, o harness de automação e os relatórios públicos, além de manter o jogo em um escopo privado. A ponte Pixi/Canvas é entregue por um evento interno e não cria uma propriedade pública no `window`.

## Gráficos no celular

Use **Gráficos e opções** na tela inicial ou **Pausa → Acessibilidade e desempenho → Complexidade gráfica** durante a partida. A preferência é salva no navegador, separada do save da aventura.

| Perfil | Limite de quadros/s | Resolução máxima | Terreno | Partículas |
| --- | --- | --- | --- | --- |
| Desempenho | 30 | 1,25× | 37,5% | 100 |
| Balanceada | 30 | 1,75× | 62,5% | 200 |
| Alta | 60 | 2× | 75% | 360 |

Automática usa Desempenho em celulares com até 4 GB de memória ou 4 processadores lógicos informados pelo navegador; nos outros celulares começa em Balanceada. Desktop começa em Alta. Uma escolha manual prevalece sobre essa detecção. Limites de quadros são metas, não garantia de desempenho.

Os perfis também controlam resolução e frequência do minimapa, clima, vegetação decorativa, resolução do personagem e frequência de atualização da animação. Balanceada/Alta aumentam a nitidez mobile em relação à beta. Desempenho reduz sombras da interface. A lógica de combate, colisões e avisos de perigo permanece independente do orçamento gráfico. Desempenho adaptativo pode reduzir efeitos em situações pesadas e pode ser desligado.

No mobile, apenas um aviso aparece por vez. Mensagens ambiente têm intervalo mínimo de oito segundos e cedem espaço ao combate; lembretes de objetivo ao fechar menus ficam no diário/mapa. Os prompts duplicados de interação, gancho e região são ocultados, mantendo os botões touch, a região no HUD e os alertas de perigo. O tutorial fica disponível na pausa. O terreno é desenhado com mais pixels e detalhes no cache, sem aumentar o zoom da câmera.

A troca de perfil aplica-se imediatamente, redesenhando apenas o terreno em cache quando necessário, sem reiniciar inimigos, puzzles ou a partida. Pode ocorrer uma breve pausa ao redesenhar o terreno. `src/graphics/profiles.js` concentra os valores editáveis. O perfil efetivo fica em `document.documentElement.dataset.graphics`; `?render=mobile-balanced` permite inspecionar o caminho mobile em desktop enquanto a seleção estiver em Automática.

## Organização

Publicidade no desktop: a partir de 1100 px, com mouse, o anúncio nativo flutua à esquerda entre os painéis da interface, sem reservar uma faixa nem reduzir o canvas. Se o script falhar, o anúncio fica oculto. A pausa mostra dois banners 468×60 nas laterais do menu, reduzidos proporcionalmente quando necessário. Celulares e janelas menores não carregam os anúncios. Os scripts ficam em iframes separados; a entrega depende da rede de anúncios e o jogo continua funcionando sem ela. A integração está em `src/game/desktop-ads.js` e `src/styles/desktop-ads.css`.

- `src/game/beta/`: os 21 scripts da beta publicada, na ordem de `manifest.json`.
- `src/game/index.template.html`: estrutura da página, HUD e menus da beta.
- `src/styles/beta/`: os seis estilos publicados, na ordem original.
- `src/styles/graphics.css`: ajustes gráficos da interface e menus mobile.
- `src/graphics/profiles.js`: configuração dos níveis de qualidade.
- `src/game/graphics.js`: integração de preferências, renderização e orçamento gráfico.
- `index.html` e `public/js/game.js`: arquivos gerados; não editar diretamente.
- `src/pixi-player.js`: adaptador do estado do jogo e composição no cenário.
- `src/characters/CharacterView.js`: sprites, rig, poses e efeitos reutilizáveis.
- `src/characters/animation.js`: controlador independente do renderizador, reutilizando um objeto de pose.
- `src/characters/atlas.js`: atlas procedural compartilhado por paleta, desenhado uma vez e liberado por contagem de referências.
- `src/characters/definitions.js`: Nilo e modelo de outro personagem com paleta e escala próprias.
- `scripts/build-game.mjs`: gera HTML e script clássico, validando os pontos de integração Pixi e os ajustes da beta. Executado automaticamente antes de `dev` e `build`; use `npm run generate` após editar fontes para abrir por `file://`.
- `scripts/import-beta.mjs`: importa uma pasta `game/` publicada. Exemplo: `node scripts/import-beta.mjs "C:/Users/User/Downloads/Mare Brava/game"`, seguido de `npm run generate`. Reimportar substitui as fontes em `src/game/beta/`, os estilos da beta e o template; preserve alterações locais antes de usar.
- `scripts/import-original.mjs`: importador legado do HTML monolítico, mantido como referência; não faz parte do fluxo atual da beta.

## Reutilizar em outro personagem

Abra `/characters.html` no servidor local para inspecionar as sete animações nas oito direções, pausar e comparar Nilo com o modelo Marinheira, incluindo movimento reduzido. A página também faz parte do build. A caminhada recria a referência em sprites articulados: frente, diagonais, perfil e costas, passos alternados, balanço dos braços e lenço. Não recorta o fundo da imagem enviada.

Informe `movementAngle` (radianos, Y positivo para baixo) para orientar a caminhada independentemente de `angle` (mira). Ao parar, a última orientação é mantida; durante ataques/carga/defesa, usa-se a mira. `directions.js` centraliza as oito orientações para todos os personagens. O atlas continua único por paleta, sem gerar texturas por quadro.

```js
import { CharacterView } from './src/characters/CharacterView.js';
import { characterTemplate } from './src/characters/definitions.js';
const npc = new CharacterView({ ...characterTemplate, name: 'Mara' });
app.stage.addChild(npc.body, npc.effects);
npc.body.position.set(200, 200);
npc.effects.position.copyFrom(npc.body.position);
// No loop existente: tempo/durações em segundos, ângulos em radianos.
npc.update({ moving: true, walk: time * 11, angle: 0 }, time,
  { paused: false, reducedMotion: false });
// Ao remover: npc.destroy();
```

Campos opcionais: `moving`, `walk`, `angle`, `charging`, `chargeTime`, `attackAnim` (tempo restante), `attackAnimMax`, `attackStep`, `attackAngle`, `dashTime`, `flash`, `invuln`, `parryWindow`, `parryFlash`, `perfectFlash`, `perfectReady`, `perfectWindow`. Prioridade: esquiva, dano, ataque, aparar, carregar, andar, repouso. As animações não modificam hitboxes, alcance ou cooldowns. Instancie um `CharacterView` por personagem e compartilhe paletas para reutilizar texturas.

## Desempenho

Um atlas por paleta, sprites persistentes, sem filtros nem geração de quadros por frame. Superfície WebGL de 384×256 (resolução máxima 2), atualizada no loop existente, sem segundo ticker. O personagem e ataque são compostos na fila original Canvas para respeitar árvores, câmera, noite e clima. A composição tem custo: ganho de FPS não é garantido e deve ser medido no hardware-alvo. O estado visual do adaptador aparece apenas como `document.documentElement.dataset.playerRenderer` (`pixi` ou `canvas`); a ponte de renderização permanece dentro do escopo do jogo.

O save mantém as chaves originais no `localStorage`. Entre `file://` e `localhost`, o navegador trata os dados como origens diferentes; use as opções de exportar/importar save do menu para transferir um progresso salvo ao abrir o arquivo antigo diretamente.
