import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const gameplay=readFileSync(new URL('../src/game/beta/03-gameplay.js',import.meta.url),'utf8');
const toastSource=gameplay.slice(gameplay.indexOf('function toast('),gameplay.indexOf('function text('));
function notices(mobile) {
  const children=[],timers=[];
  const area={children,appendChild:el=>children.push(el),get firstChild(){return children[0]},querySelector:()=>children.find(el=>el.className==='toast danger')};
  const state={now:0,POLISH:{},player:{combat:0},mobileRenderEnabled:()=>mobile,$:()=>area,
    performance:{now:()=>state.now},setTimeout:(fn,ms)=>timers.push({fn,ms}),
    document:{createElement:()=>({classList:{add(){}},remove(){const i=children.indexOf(this);if(i>=0)children.splice(i,1)}})}};
  runInNewContext(toastSource,state);
  return {...state,state,children,timers};
}

test('mobile limits notices, suppresses repeat chatter/recaps and preserves danger',()=>{
  const {state,children,timers}=notices(true);
  state.toast('Rumo ao bosque','recap');assert.equal(children.length,0);
  state.toast('Pipoca viu algo');assert.equal(children.length,1);assert.equal(timers[0].ms,2600);
  children[0].remove();state.now=2000;
  state.toast('Outra fala ambiente');assert.equal(children.length,0);
  state.now=8000;state.toast('Outra fala ambiente');assert.equal(children.length,1);
  state.toast('Selo recuperado','gold');assert.equal(children.length,1);assert.equal(children[0].textContent,'Selo recuperado');
  state.toast('Saia do círculo','danger');assert.equal(children.length,1);assert.equal(timers.at(-1).ms,3800);
  state.toast('Missão concluída','gold');assert.equal(children[0].textContent,'Saia do círculo');
  children[0].remove();state.player.combat=2;state.now=16000;
  state.toast('Fala ambiente');assert.equal(children.length,0);
  state.toast('Inimigo exposto','danger');assert.equal(children.length,1);
});

test('desktop keeps its existing three notices and recap behavior',()=>{
  const {state,children,timers}=notices(false);
  for(const message of ['Primeiro','Segundo','Terceiro','Rumo'])state.toast(message,'recap');
  assert.equal(children.length,3);assert.equal(children[0].textContent,'Segundo');
  assert.ok(timers.every(timer=>timer.ms===3800));
});
