import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAnimator} from '../src/characters/animation.js';
import {readFileSync} from 'node:fs';
import {directionIndex,directionView} from '../src/characters/directions.js';
test('eight directions map consistently across angle wraps',()=>{
  for(let i=0;i<8;i++) {
    assert.equal(directionIndex(i*Math.PI/4),i);
    assert.equal(directionIndex(i*Math.PI/4-Math.PI*2),i);
  }
  assert.equal(directionView(6),'back'); assert.equal(directionView(2),'front');
  assert.equal(directionView(4),'profile');
});
test('walking follows movement, stopping retains direction, attacks follow aim',()=>{
  const a=createAnimator();
  let p=a.update({moving:true,movementAngle:-Math.PI/2,angle:0,walk:1},0);
  assert.equal(p.direction,6); assert.equal(p.view,'back');
  p=a.update({moving:false,angle:0},.1); assert.equal(p.direction,6);
  p=a.update({moving:true,movementAngle:-Math.PI/2,angle:Math.PI,attackAnim:.1},.2);
  assert.equal(p.direction,4); assert.equal(p.mirror,-1);
});
test('all eight walking poses are finite with distinct left/right facing',()=>{
  for(let i=0;i<8;i++) {
    const a=createAnimator();
    for(let frame=0;frame<120;frame++) {
      const p=a.update({moving:true,movementAngle:i*Math.PI/4,walk:frame/60*11},frame/60);
      assert.equal(p.direction,i);
      for(const v of Object.values(p))if(typeof v==='number')assert.ok(Number.isFinite(v));
    }
  }
});
test('state priority and supported poses',()=>{
  const a=createAnimator();
  for(const [input,state] of [[{},'idle'],[{moving:true},'walk'],[{charging:true},'charge'],[{parryWindow:.2,charging:true},'parry'],[{attackAnim:.1,parryWindow:.2},'attack'],[{flash:.1,attackAnim:.1},'hurt'],[{dashTime:.1,flash:.1},'dash']]) {
    const p=a.update(input,1); assert.equal(p.state,state);
    for(const v of Object.values(p)) if(typeof v==='number') assert.ok(Number.isFinite(v));
  }
});
test('paused pose is frozen and object reused',()=>{
  const a=createAnimator(), p=a.update({moving:true,walk:1},0), copy={...p};
  assert.equal(a.update({dashTime:1},1,{paused:true}),p); assert.deepEqual(p,copy);
});
test('reduced motion preserves combat state',()=>{
  const a=createAnimator(),b=createAnimator(), input={dashTime:.2,angle:0};
  const normal=a.update(input,0), reduced=b.update(input,0,{reducedMotion:true});
  assert.equal(reduced.state,'dash'); assert.ok(Math.abs(reduced.lean)<Math.abs(normal.lean));
});
test('transitions independent of frame rate',()=>{
  function simulate(fps) {const a=createAnimator(); for(let i=0;i<=fps;i++) a.update({moving:true,walk:1},i/fps);return {...a.pose};}
  const a=simulate(30),b=simulate(120); assert.ok(Math.abs(a.gait-b.gait)<1e-6); assert.ok(Math.abs(a.bob-b.bob)<1e-6);
});
test('original world draw slots and fallback are preserved',()=>{
  const game=readFileSync(new URL('../public/js/game.js',import.meta.url),'utf8');
  assert.ok(game.includes('playerRendererBridge?.prepare(player'));
  assert.ok(game.includes('playerRendererBridge.drawBody(ctx,player.x,player.y)'));
  assert.ok(game.includes('playerRendererBridge.drawEffects(ctx,player.x,player.y)'));
  assert.ok(!game.includes('MareBabylon'));
});
