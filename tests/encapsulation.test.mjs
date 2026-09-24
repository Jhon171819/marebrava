import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
