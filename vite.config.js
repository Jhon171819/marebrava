import {defineConfig} from 'vite';
import {readFileSync, writeFileSync} from 'node:fs';

function fileOfflineEntry(){
  return {name:'file-offline-entry',closeBundle(){
    const path='dist/index.html';
    let html=readFileSync(path,'utf8');
    const moduleTag=/<script type="module" crossorigin src="([^"]+)"><\/script>/;
    if(!moduleTag.test(html))throw Error('Entrada modular do Vite não encontrada');
    html=html.replace(moduleTag,(_,src)=>`<script>window.__mareAssetsReady=location.protocol==='file:';if(!window.__mareAssetsReady){const script=document.createElement('script');script.type='module';script.src='${src}';const done=()=>{window.__mareAssetsReady=true;document.dispatchEvent(new Event('mare-assets-ready'))};script.onload=done;script.onerror=done;document.head.appendChild(script)}</script>`);
    html=html.replace(/<link rel="modulepreload" crossorigin href="[^"]+">/g,'');
    html=html.replace(/<link rel="stylesheet" crossorigin href=/g,'<link rel="stylesheet" href=');
    const gameEntry="location.protocol === 'file:' ? './public/js/game.js' : './js/game.js'";
    if(!html.includes(gameEntry))throw Error('Entrada clássica do jogo não encontrada');
    html=html.replace(gameEntry,"'./js/game.js'");
    html=html.replace('document.body.appendChild(script);','if(window.__mareAssetsReady)document.body.appendChild(script);else document.addEventListener(\'mare-assets-ready\',()=>document.body.appendChild(script),{once:true});');
    writeFileSync(path,html);
  }};
}

export default defineConfig({
  server: {
    allowedHosts: true
  },
  base: './',
  esbuild: { drop: ['console'], pure: ['globalThis.console.log'] },
  plugins:[fileOfflineEntry()],
  build: {
    rollupOptions: {
      input: {
        game: 'index.html',
        characters: 'characters.html',
      },
    },
  },
});
