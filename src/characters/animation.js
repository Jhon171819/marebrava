import { directionIndex, directionView } from './directions.js';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// Renderer-independent, allocation-free pose evaluator. All clocks are in seconds.
export function createAnimator() {
  const pose = {};
  let clock = 0, previousTime, motion = 0;
  return {
    pose,
    update(input, time, { paused = false, reducedMotion = false } = {}) {
      const dt = previousTime === undefined ? 0 : clamp(time - previousTime, 0, .05);
      previousTime = time;
      if (paused && pose.state) return pose;
      clock += dt;
      motion += ((input.moving ? 1 : 0) - motion) * (1 - Math.exp(-18 * dt));
      const amount = reducedMotion ? .22 : 1;
      const gait = Math.sin(input.walk || 0) * motion;
      const progress = clamp(1 - (input.attackAnim || 0) / (input.attackAnimMax || .24));
      pose.state = input.dashTime > 0 ? 'dash' : input.flash > 0 ? 'hurt' : input.attackAnim > 0 ? 'attack' : input.parryWindow > 0 ? 'parry' : input.charging ? 'charge' : input.moving ? 'walk' : 'idle';
      pose.angle = input.angle || 0;
      // Locomotion follows the feet, not the mouse aim. Combat still uses aim.
      const combat = ['attack','charge','parry'].includes(pose.state);
      if (pose.direction === undefined || input.moving || combat || pose.state === 'dash') {
        const angle = combat ? pose.angle : pose.state === 'dash' && (input.dashX || input.dashY) ? Math.atan2(input.dashY,input.dashX) : (input.movementAngle ?? pose.angle);
        pose.direction = directionIndex(angle);
      }
      pose.view = directionView(pose.direction);
      pose.mirror = [3,4,5].includes(pose.direction) ? -1 : 1;
      pose.gait = gait * amount;
      pose.bob = (Math.sin(clock * 2.8) * .45 * (1 - motion) - Math.abs(gait) * 1.35) * amount;
      pose.lean = gait * .035 * amount;
      pose.stretch = 1 + Math.sin(clock * 2.8) * .012 * amount;
      pose.arm = gait * .32 * amount;
      pose.scarf = (Math.sin(clock * 6 - .8) * .12 + motion * .2) * amount;
      pose.blink = clock % 4.7 > 4.55 ? .12 : 1;
      pose.alpha = input.invuln > 0 && Math.floor(clock * 18) % 2 ? .6 : 1;
      pose.progress = progress;
      if (pose.state === 'charge') { pose.arm = -.95; pose.lean = -.08 * amount; pose.stretch = .96; }
      if (pose.state === 'parry') pose.arm = -1.25;
      if (pose.state === 'attack') {
        const swing = Math.sin(progress * Math.PI);
        pose.arm = -1.3 + progress * 2.7;
        pose.lean = Math.cos(pose.angle) * swing * .2 * amount;
        pose.stretch = 1 + swing * .05 * amount;
      }
      if (pose.state === 'dash') { pose.lean = Math.cos(pose.angle) * .32 * amount; pose.stretch = .87; pose.arm = .9; pose.scarf = .5 * amount; }
      if (pose.state === 'hurt') { pose.lean = -.16 * amount; pose.arm = -.5; }
      return pose;
    },
  };
}
