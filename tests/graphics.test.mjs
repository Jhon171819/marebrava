import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context={};
runInNewContext(readFileSync(new URL('../src/graphics/profiles.js',import.meta.url),'utf8')+'\nglobalThis.__testProfiles=MareGraphicsProfiles;',context);
const {profiles,resolve}=context.__testProfiles;
test('auto handles weak, unknown, mobile and desktop hardware',()=>{
  assert.equal(resolve('auto',{mobile:true,memory:2,cores:8}),'low');
  assert.equal(resolve('auto',{mobile:true,memory:8,cores:4}),'low');
  assert.equal(resolve('auto',{mobile:true}),'balanced');
  assert.equal(resolve('auto',{mobile:true,memory:8,cores:8}),'balanced');
  assert.equal(resolve('auto',{mobile:false}),'high');
  assert.equal(resolve('invalid',{mobile:true}),'balanced');
});
test('manual selection takes precedence over device inference',()=>{
  assert.equal(resolve('high',{mobile:true,memory:2,cores:2}),'high');
  assert.equal(resolve('low',{mobile:false,memory:32,cores:16}),'low');
});
test('lower presets actually reduce pixel memory and cosmetic work',()=>{
  for(const [a,b] of [['low','balanced'],['balanced','high']]) {
    assert.ok(profiles[a].pixelRatioCap<profiles[b].pixelRatioCap);
    assert.ok(profiles[a].terrainScale**2<profiles[b].terrainScale**2);
    assert.ok(profiles[a].particleCap<profiles[b].particleCap);
    assert.ok(profiles[a].actorResolution<profiles[b].actorResolution);
    assert.ok(profiles[a].minimapFps<profiles[b].minimapFps);
    assert.ok(profiles[a].fxScale<profiles[b].fxScale);
    assert.ok(profiles[a].targetFps<=profiles[b].targetFps);
  }
  assert.throws(()=>{profiles.low.particleCap=999;},TypeError);
});
