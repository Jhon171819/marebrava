import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = new URL('../src/game/beta/', import.meta.url);
const content = readFileSync(new URL('02a-story-content.js', src), 'utf8');
const runtime = readFileSync(new URL('06j-story-runtime.js', src), 'utf8');
const core = readFileSync(new URL('01-core.js', src), 'utf8');
const gameplay = readFileSync(new URL('06h-mobile-performance-contramare.js', src), 'utf8');
const combo = readFileSync(new URL('06i-final-player-polish.js', src), 'utf8');

test('campanha narrativa contém os gatilhos centrais e não executa código dos dados', () => {
  for (const id of [
    'story.arrival.mara', 'story.seal.moss', 'story.seal.mud', 'story.seal.bronze',
    'story.progress.firstSeal', 'story.progress.twoSeals', 'story.progress.threeSeals',
    'story.marks.complete', 'story.marks.safePoint', 'story.mechanisms.complete',
    'story.reef.approach', 'story.boss.intro', 'story.boss.defeated',
    'story.epilogue.basic', 'story.epilogue.marks', 'story.epilogue.mechanisms',
    'story.epilogue.community',
  ]) assert.ok(content.includes(id), `cena ausente: ${id}`);
  assert.doesNotMatch(content, /\beval\s*\(|\bnew\s+Function\s*\(/);
  assert.match(runtime, /case'setStoryFlag'/);
  assert.match(runtime, /STORY_SCENE_IDS/);
  assert.match(runtime, /storySelfTest\(\)/);
  assert.match(runtime, /resume\.pending\.length===1/);
});

test('fila salva cenas pendentes e integração preserva Save V7', () => {
  assert.match(runtime, /storySave\(\)/);
  assert.match(runtime, /s\.pending\.push\(id\)/);
  assert.match(runtime, /s\.pending=s\.pending\.filter/);
  assert.match(runtime, /defer|storySafe/);
  assert.match(core, /storySelfTest/);
  assert.match(readFileSync(new URL('../src/game/beta/06-world-v3.js', import.meta.url), 'utf8'), /storyCleanState\(raw\?\.storyBeats\)/);
  assert.match(readFileSync(new URL('../src/game/beta/01-core.js', import.meta.url), 'utf8'), /CURRENT_SAVE_VERSION=7/);
});

test('diagnósticos de combo e gancho usam estados alcançáveis', () => {
  assert.match(combo, /combo>=2/);
  assert.match(combo, /combo>=3/);
  assert.doesNotMatch(combo, /combo>=5|combo>=8/);
  assert.match(gameplay, /hook\.mode==='latched'/);
  assert.doesNotMatch(gameplay, /hook\.mode==='attached'/);
});
