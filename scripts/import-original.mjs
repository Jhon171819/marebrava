import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Mechanical import: keep the original drawing and game logic byte-for-byte
// inside the extracted style and script blocks. Pass the source HTML path.
const source = process.argv[2];
if (!source) throw new Error('Uso: node scripts/import-original.mjs <caminho/index.html>');
const root = resolve(import.meta.dirname, '..');
const original = readFileSync(resolve(source), 'utf8');
const styles = [];
const cssNames = ['base', 'macro-polish-v11', 'macro-polish-v13', 'blind-playtest-fixes-v15', 'world-v3'];
let html = original.replace(/<style(?:\s+[^>]*)?>([\s\S]*?)<\/style>/gi, (_, css) => {
  const name = cssNames[styles.length];
  if (!name) throw new Error('Há mais estilos do que o esperado; revise a importação.');
  styles.push({ name, css });
  return `<link rel="stylesheet" href="./src/styles/${name}.css">`;
});
if (styles.length !== cssNames.length) throw new Error(`Esperados ${cssNames.length} estilos; encontrados ${styles.length}.`);
const scripts = [];
html = html.replace(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi, (_, js) => {
  scripts.push(js);
  return '<script src="./js/game.js"></script>';
});
if (scripts.length !== 1) throw new Error(`Esperado 1 script; encontrados ${scripts.length}.`);

function replaceOnce(code, needle, replacement) {
  const first = code.indexOf(needle);
  if (first < 0 || code.indexOf(needle, first + needle.length) >= 0) {
    throw new Error(`Ponto de integração não único: ${needle.slice(0, 70)}`);
  }
  return code.slice(0, first) + replacement + code.slice(first + needle.length);
}

html = replaceOnce(html, '<script src="./js/game.js"></script>', `
<script>
(() => {
  const script = document.createElement('script');
  script.src = location.protocol === 'file:' ? './public/js/game.js' : './js/game.js';
  window.MareGameReady = new Promise((resolve, reject) => {
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error('Não foi possível carregar ' + script.src)), { once: true });
  });
  window.MareGameReady.catch(() => {
    const loading = document.getElementById('loading');
    if (loading) loading.textContent = 'Não foi possível carregar o jogo.';
  });
  document.body.appendChild(script);
})();
</script>
<script type="module">
if (location.protocol !== 'file:') {
  window.MareGameReady.then(() => import('./src/pixi-player.js')).catch(() => {});
}
</script>`.trim());

let game = scripts[0];
game = replaceOnce(game, 'player.moving=Math.hypot(v.x,v.y)>.1;', 'player.moving=Math.hypot(v.x,v.y)>.1;if(player.moving)player.movementAngle=Math.atan2(v.y,v.x);');
game = replaceOnce(game, 'function render(){PERF.drawCalls=0;', 'function render(){window.MarePlayerRenderer?.prepare(player,G.time,!!G.overlay&&G.started,reducedMotion());PERF.drawCalls=0;');
game = replaceOnce(game, 'function drawPlayer(){const c=ctx;', 'function drawPlayer(){if(window.MarePlayerRenderer?.ready){window.MarePlayerRenderer.drawBody(ctx,player.x,player.y);return;}const c=ctx;');
game = replaceOnce(game, 'function drawSword(){if(player.attackAnim<=0)return;', 'function drawSword(){if(window.MarePlayerRenderer?.ready){window.MarePlayerRenderer.drawEffects(ctx,player.x,player.y);return;}if(player.attackAnim<=0)return;');
game = replaceOnce(game, "for(let t of trails){c.globalAlpha=t.age/.23*.22;drawHuman(t.x,t.y,1.07,'player',t.angle,0)}", "for(let t of trails){c.globalAlpha=t.age/.23*.22;if(window.MarePlayerRenderer?.ready)window.MarePlayerRenderer.drawTrail(c,t.x,t.y);else drawHuman(t.x,t.y,1.07,'player',t.angle,0)}");

mkdirSync(join(root, 'src', 'styles'), { recursive: true });
mkdirSync(join(root, 'public', 'js'), { recursive: true });
for (const { name, css } of styles) writeFileSync(join(root, 'src', 'styles', `${name}.css`), css, 'utf8');
writeFileSync(join(root, 'public', 'js', 'game.js'), game, 'utf8');
writeFileSync(join(root, 'index.html'), html, 'utf8');
