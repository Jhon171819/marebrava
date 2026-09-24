import { Container, Sprite } from 'pixi.js';
import { acquireAtlas } from './atlas.js';
import { createAnimator } from './animation.js';

export class CharacterView {
  constructor(definition) {
    this.definition = definition;
    this.atlas = acquireAtlas(definition.palette);
    this.animator = createAnimator();
    this.body = new Container(); this.effects = new Container(); this.rig = new Container();
    this.rig.sortableChildren = true;
    this.body.eventMode = this.effects.eventMode = 'none';
    this.parts = {};
    const add = (name, texture, parent, x = 0, y = 0) => {
      const sprite = new Sprite(this.atlas.textures[texture]); sprite.anchor.set(.5); sprite.scale.set(.5); sprite.position.set(x,y); parent.addChild(sprite); this.parts[name] = sprite; return sprite;
    };
    add('shadow','shadow',this.body);
    this.body.addChild(this.rig);
    add('leftLeg','leg',this.rig,-6,-5); add('rightLeg','leg',this.rig,6,-5);
    add('scarf','scarf',this.rig,-5,-18);
    add('leftArm','arm',this.rig,-11,-18);
    add('torso','body',this.rig,0,-11);
    add('rightArm','arm',this.rig,11,-18);
    add('head','head',this.rig,0,-26); add('eyes','eyes',this.rig,0,-27);
    add('collar','collar',this.rig,0,-17); add('hook','hook',this.rig,14,-6);
    add('ring','ring',this.body,0,-8);
    this.sparks = Array.from({length:3},(_,i)=>add(`spark${i}`,'spark',this.body));
    add('slash','slash',this.effects,0,-10);
    this.body.scale.set(definition.scale || 1); this.effects.scale.set(definition.scale || 1);
  }
  update(input, time, options) {
    if (options?.paused && this.initialized) {
      this.animator.update(input,time,options);
      return this.animator.pose;
    }
    this.initialized = true;
    const p = this.animator.update(input,time,options), s = this.parts;
    const profile = p.view === 'profile', back = p.view.startsWith('back'), diagonal = p.view.endsWith('diagonal');
    const width = profile ? .82 : diagonal ? .94 : 1;
    this.rig.y = p.bob; this.rig.rotation = p.lean; this.rig.scale.set(p.mirror * width / Math.sqrt(p.stretch),p.stretch);
    this.body.alpha = p.alpha;
    const stride = profile ? 6 : diagonal ? 3.5 : 1;
    s.leftLeg.position.set((profile ? -3 : -6) + p.gait * stride,-5 + (profile ? -Math.max(0,p.gait)*3 : p.gait*3.7));
    s.rightLeg.position.set((profile ? 3 : 6) - p.gait * stride,-5 + (profile ? Math.min(0,p.gait)*3 : -p.gait*3.7));
    s.leftLeg.rotation = -p.gait * (profile ? .35 : .13); s.rightLeg.rotation = p.gait * (profile ? .35 : .13);
    s.leftLeg.zIndex = 0; s.rightLeg.zIndex = 1;
    s.torso.texture = this.atlas.textures[back || profile ? 'bodyBack' : 'body'];
    s.torso.scale.x = profile ? .4 : .5;
    s.torso.zIndex = 4;
    s.leftArm.x = profile ? 0 : -11; s.rightArm.x = profile ? 2 : 11;
    s.leftArm.zIndex = profile ? 2 : back ? 3 : 5;
    s.rightArm.zIndex = 6;
    s.leftArm.rotation = -p.arm; s.rightArm.rotation = p.arm;
    s.hook.visible = !back && !profile;
    s.hook.zIndex = 10;
    s.hook.position.set(11 - Math.sin(p.arm) * 13,-18 + Math.cos(p.arm)*13);
    s.hook.rotation = Math.atan2(Math.sin(p.angle),Math.cos(p.angle)*p.mirror) + .9 + p.arm * .5;
    s.scarf.rotation = p.scarf;
    s.scarf.position.set(back ? 5 : -5,-18);
    s.scarf.scale.x = back ? -.5 : .5;
    s.scarf.zIndex = back ? 7 : 2;
    s.collar.zIndex = 8;
    s.head.texture = this.atlas.textures[profile ? 'headProfile' : p.view === 'back' ? 'headBack' : back ? 'headBackDiagonal' : 'head'];
    s.head.x = diagonal ? 1.5 : 0;
    s.head.zIndex = 9;
    s.eyes.visible = !back;
    s.eyes.texture = this.atlas.textures[profile ? 'eyesProfile' : 'eyes'];
    s.eyes.x = diagonal ? 3 : 0;
    s.eyes.scale.x = diagonal ? .43 : .5;
    s.eyes.zIndex = 11;
    s.eyes.scale.y = .5*p.blink;
    const guarding = input.parryWindow > 0 || input.parryFlash > 0 || input.perfectFlash > 0 || (input.perfectReady && input.perfectWindow > 0);
    s.ring.visible = !!input.charging || guarding;
    s.ring.alpha = guarding ? .85 : .55;
    s.ring.scale.set(.5 + (input.charging ? Math.min(input.chargeTime || 0,1)*.28 : Math.max(input.parryFlash || 0,input.perfectFlash || 0)*.3));
    this.sparks.forEach((spark,i)=>{ spark.visible=!!input.charging; const a=time*2+i*Math.PI*2/3; spark.position.set(Math.cos(a)*30,-8+Math.sin(a)*20); });
    s.slash.visible = input.attackAnim > 0;
    s.slash.rotation = (input.attackAngle || 0) - .2 + p.progress*1.7;
    s.slash.alpha = (1-p.progress)*.85;
    s.slash.scale.set(input.attackStep === 4 ? .68 : input.attackStep === 5 ? .56 : .5);
    return p;
  }
  destroy() { this.body.destroy({children:true}); this.effects.destroy({children:true}); this.atlas.release(); }
}
