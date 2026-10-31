import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const game = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8');
const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('production game internals are enclosed and diagnostic globals are absent', () => {
  assert.match(game, /^\(\(\) => \{\n'use strict';/);
  for (const name of [
    'MareBoot', 'MareDebug', 'MareGraphics', 'MareMobileRender',
    'MareAIPlayer', 'MareJourneyTelemetry', 'MareLivingIsland',
    'MareFinalPolish', 'MareGD026', 'MareGD027',
  ]) {
    assert.doesNotMatch(game, new RegExp(`window\\.${name}\\s*=`), `${name} vazou para window`);
  }
  assert.doesNotMatch(game, /window\.MarePlayerRenderer/);
  assert.doesNotMatch(page, /window\.Mare[A-Za-z0-9_]+/);
});

test('sources, build scripts and generated game contain no console logging', () => {
  for (const directory of ['src/', 'scripts/']) {
    const root=new URL('../'+directory,import.meta.url);
    for (const path of readdirSync(root,{recursive:true})) {
      if (!/\.(?:js|mjs)$/.test(path)) continue;
      assert.doesNotMatch(readFileSync(new URL(path.replaceAll('\\','/'),root),'utf8'), /\bconsole\s*(?:\.|\[)/, directory+path);
    }
  }
  assert.doesNotMatch(game, /\bconsole\s*(?:\.|\[)/);
  assert.doesNotMatch(page, /\bconsole\s*(?:\.|\[)/);
  assert.match(readFileSync(new URL('../vite.config.js',import.meta.url),'utf8'), /drop:\s*\['console'\]/);
});
