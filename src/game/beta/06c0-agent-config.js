'use strict';
// Maré Brava — GD-027 AI Player Harness V2: identidade e run persistente do playtest.
(()=>{
 const profiles=Object.freeze({
  lia:{id:'lia',name:'Lia',profile:'Exploradora Curiosa'},
  caio:{id:'caio',name:'Caio',profile:'Casual Impaciente'},
  rafael:{id:'rafael',name:'Rafael',profile:'Sistêmico/Dominador'}
 });
 const q=new URLSearchParams(location.search),boot=window.__MARE_AGENT_BOOT||{},id=String(q.get('tester')||boot.tester||PLAYTEST_TESTER_ID||'').toLowerCase(),tester=profiles[id]||null;
 const enabled=!!tester&&(q.get('agent')!=='0')&&(boot.agent!==false);
 const key=tester?`mare-brava-agent-run-${tester.id}`:'mare-brava-agent-run';
 let runId=String(q.get('run')||boot.run||'').trim();
 if(!runId&&enabled){try{runId=localStorage.getItem(key)||''}catch(_){}}
 if(!runId&&enabled)runId=`${tester.id}-${Date.now().toString(36)}-${Math.floor(Math.random()*0xffffff).toString(36)}`;
 if(enabled){try{localStorage.setItem(key,runId)}catch(_){}}
 const cfg={enabled,tester,runId,storageKey:key,startedAt:Date.now(),build:BUILD_ID};
 window.MareAgentProfiles=profiles;
 window.MareAgentConfig=cfg;
 document.body.dataset.agentPlaytest=enabled?'true':'false';
 if(tester)document.body.dataset.agentTester=tester.id;
})();
