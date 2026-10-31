import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const manifest = JSON.parse(read('src/game/beta/manifest.json'));
const diagnostics = process.argv.includes('--diagnostics');
const secureBundle = !diagnostics;
const productionOnly = new Set(['06c0-agent-config.js', '06d-ai-player-harness.js', '07-debug.js']);
function replaceOnce(code, needle, replacement) {
  if (code.split(needle).length !== 2) throw Error('Integração da beta mudou: ' + needle.slice(0, 100));
  return code.replace(needle, replacement);
}
let game = manifest.filter(file => !(secureBundle && productionOnly.has(file))).map(file => {
  let code = read('src/game/beta/' + file);
  if (file === '01-core.js') {
    code = replaceOnce(code, "quality:'high'", "quality:'auto'");
    code = replaceOnce(code, "if(!['high','balanced','low'].includes(p.quality))p.quality='high';", "if(!['auto','high','balanced','low'].includes(p.quality))p.quality='auto';");
  }
  if (file === '03-gameplay.js') {
    code = replaceOnce(code, 'player.moving=Math.hypot(v.x,v.y)>.1;', 'player.moving=Math.hypot(v.x,v.y)>.1;if(player.moving)player.movementAngle=Math.atan2(v.y,v.x);');
    code = replaceOnce(code, "detailStride=tier==='low'?6:tier==='high'?2:4", 'detailStride=graphicsProfile().detailStride');
    code = replaceOnce(code, "tier=mobile&&typeof MOBILE_RENDER!=='undefined'?MOBILE_RENDER.tier:'desktop'", "tier=mobile?GRAPHICS_LOGIC_TIER:'desktop'");
    code = replaceOnce(code, "(PREFS.quality==='low'?4:3)", 'GRAPHICS_DESKTOP_AI_STRIDE');
    code = code.replace('window.MareMobileRender?.compatibility?.()', "typeof mobileCompatibilityReport==='function'?mobileCompatibilityReport():{}");
  }
  if (file === '04-renderer.js') {
    code = replaceOnce(code, 'if(!G.started||!ctx)return;const c=ctx;', 'if(!G.started||!ctx)return;playerRendererBridge?.prepare(player,G.time,!!G.overlay,reducedMotion());const c=ctx;');
    code = replaceOnce(code, 'function drawPlayer(){const c=ctx;', 'function drawPlayer(){if(playerRendererBridge?.ready){playerRendererBridge.drawBody(ctx,player.x,player.y);return;}const c=ctx;');
    code = replaceOnce(code, 'function drawSword(){if(player.attackAnim<=0)return;', 'function drawSword(){if(playerRendererBridge?.ready){playerRendererBridge.drawEffects(ctx,player.x,player.y);return;}if(player.attackAnim<=0)return;');
    code = replaceOnce(code, "drawHuman(t.x,t.y,1.07,'player',t.angle,0)", "if(playerRendererBridge?.ready)playerRendererBridge.drawTrail(c,t.x,t.y);else drawHuman(t.x,t.y,1.07,'player',t.angle,0)");
  }
  if (file === '05-ui-save.js') {
    code = replaceOnce(code, '<label>Qualidade de efeitos</label><select id="set-quality">', '<label for="set-quality">Complexidade gráfica</label><select id="set-quality"><option value="auto">Automática · recomendada</option>');
    code = code.replace('Controla DPR, partículas e densidade de clima; gameplay não muda.', 'Alta: mais nitidez e detalhes. Balanceada: qualidade com menor consumo. Desempenho: para aparelhos menos potentes.');
  }
  if (file === '06i-final-player-polish.js') code = replaceOnce(code, '\nfinalPolishRaf=requestAnimationFrame(finalPolishTick);', '\n// Heartbeat is driven by the main loop in this project.');
  if (file === '06c-journey-telemetry.js') code = code.replace('window.MareMobileRender?.report?.()', "typeof mobileRenderReport==='function'?mobileRenderReport():null");
  if (secureBundle && file === '00-boot.js') code = code.replace('window.MareBoot={report:bootReport};', '');
  if (secureBundle && file === '01a-mobile-render.js') code = code.replace('window.MareMobileRender={report:mobileRenderReport,compatibility:mobileCompatibilityReport};', '');
  if (secureBundle && file === '06b-exploration-rhythm.js') code = code.replace(/window\.MareExplorationRhythm\s*=\s*\{[\s\S]*?\};\s*/g, '');
  if (secureBundle && file === '06c-journey-telemetry.js') code = code.replace(/window\.MareJourneyTelemetry\s*=\s*\{[\s\S]*?\};\s*/g, '');
  if (secureBundle && file === '06e-encounter-rhythm.js') code = code.replace(/window\.MareEncounterRhythm\s*=\s*\{[\s\S]*?\};\s*/g, '');
  if (secureBundle && file === '06f-mastery-discovery-puzzle.js') code = code.replace(/window\.MareQualityPass\s*=\s*\{[\s\S]*?\};\s*/g, '');
  if (secureBundle && file === '06g-quests-builds-bosses.js') code = code.replace(/window\.MareGD026\s*=\s*\{[\s\S]*?\};\s*/g, '');
  if (secureBundle && file === '06h-mobile-performance-contramare.js') code = code.replace(/window\.MareGD027\s*=\s*\{[\s\S]*?\};\s*/g, '');
  if (secureBundle && file === '06i-final-player-polish.js') code = code.replace(/window\.MareFinalPolish\s*=\s*\{[\s\S]*?\};\s*/g, '');
  if (secureBundle && file === '06a-living-island.js') code = code.replace(/window\.MareLivingIsland\s*=\s*\{[\s\S]*?\};\s*/g, '');
  if (file === '08-input.js' && secureBundle) code = `function updateDebugPanel(){} function toggleDebug(){return false} function selectNearestDebug(){return null}\n${code}`;
  // Adaptation is presentation only and precedes bootstrap, after beta wrappers.
  if (file === '09-loop-bootstrap.js') {
    code = replaceOnce(code, 'updatePolish(logicDt)', 'updatePolish(logicDt);finalCombatHeartbeat()');
    code = replaceOnce(code, "$('loading')?.classList.add('hidden');", "$('loading')?.classList.add('hidden');document.documentElement.dataset.gameReady='true';");
    if (secureBundle) {
      code = code.replace('const aiPerceptionFrozen=!!window.MARE_AI_PERCEPTION_FREEZE;', 'const aiPerceptionFrozen=false;');
      code = code.replace('window.MareAIPlayer?.tick?.();', '');
    }
    code = read('src/graphics/profiles.js') + '\n' + read('src/game/graphics.js') + '\n' + read('src/game/desktop-ads.js') + '\n' + code;
  }
  return `\n// ---- beta/${file} ----\n${code}\n`;
}).join('\n');
game = `(() => {\n'use strict';\nlet playerRendererBridge=null;document.addEventListener('mare-player-renderer-ready',event=>{playerRendererBridge=event.detail||null});\n${game}\n})();`;
// Validate before replacing generated output.
const { Script } = await import('node:vm');
new Script(game, { filename: 'public/js/game.js' });
const entry = `<script>
(() => {
  const script = document.createElement('script');
  script.src = location.protocol === 'file:' ? './public/js/game.js' : './js/game.js';
  script.onload = () => document.dispatchEvent(new Event('mare-game-ready'));
  script.onerror = () => { document.getElementById('loading').textContent = 'Não foi possível carregar o jogo.'; };
  document.body.appendChild(script);
})();
</script>
<script type="module">
if (location.protocol !== 'file:') {
  const loadPixi = () => import('./src/pixi-player.js').catch(() => {});
  document.addEventListener('mare-game-ready', loadPixi, {once:true});
}
</script>`;
writeFileSync(resolve(root, 'public/js/game.js'), game);
writeFileSync(resolve(root, 'index.html'), read('src/game/index.template.html').replace('<!-- GAME_ENTRY -->', entry));
