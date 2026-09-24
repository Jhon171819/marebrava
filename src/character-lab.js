import {Application} from 'pixi.js';
import {CharacterView} from './characters/CharacterView.js';
import {nilo,characterTemplate} from './characters/definitions.js';
const app=new Application();
await app.init({width:900,height:420,background:'#365347',antialias:true,preference:'webgl',resolution:Math.min(devicePixelRatio,2)});
document.querySelector('#stage').append(app.canvas);
const actors=[nilo,characterTemplate].map((definition,i)=>{
  const actor=new CharacterView(definition);
  actor.body.position.set(230+i*440,280); actor.effects.position.copyFrom(actor.body.position);
  actor.body.scale.set(3.5); actor.effects.scale.set(3.5); app.stage.addChild(actor.body,actor.effects); return actor;
});
const state=document.querySelector('#state'),paused=document.querySelector('#paused'),reduced=document.querySelector('#reduced'),status=document.querySelector('#status'),direction=document.querySelector('#direction');
state.value='walk';
direction.addEventListener('change',()=>{for(const actor of actors) actor.animator.pose.direction=undefined;});
let time=0,lastState;
const input={};
app.ticker.add(ticker=>{
  if(!paused.checked)time+=ticker.deltaMS/1000;
  const angle=Number(direction.value)*Math.PI/4;
  Object.assign(input,{angle,movementAngle:angle,walk:time*11,moving:false,charging:false,chargeTime:0,attackAnim:0,attackAnimMax:.5,attackStep:1,attackAngle:angle,dashTime:0,parryWindow:0,flash:0});
  const phase=time%1;
  if(state.value==='walk') input.moving=true;
  if(state.value==='charge'){input.charging=true;input.chargeTime=phase;}
  if(state.value==='attack')input.attackAnim=Math.max(0,.5-phase);
  if(state.value==='dash')input.dashTime=.15;
  if(state.value==='parry')input.parryWindow=.2;
  if(state.value==='hurt')input.flash=.1;
  for(const actor of actors)actor.update(input,time,{paused:paused.checked,reducedMotion:reduced.checked});
  const key=state.value+direction.value;
  if(lastState!==key){status.textContent=`PixiJS / WebGL · 2 rigs · estado: ${state.value} · direção: ${direction.selectedOptions[0].textContent}`;lastState=key;}
});
if(import.meta.hot)import.meta.hot.dispose(()=>{actors.forEach(a=>a.destroy());app.destroy(true);});
