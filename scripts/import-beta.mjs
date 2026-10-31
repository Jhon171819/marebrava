import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';

// Import the published GAME directory, not the marketing page beside it.
const source = resolve(process.argv[2] || '');
if (!process.argv[2]) throw Error('Uso: node scripts/import-beta.mjs <pasta/game>');
const root = resolve(import.meta.dirname, '..');
let html = readFileSync(join(source, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"?]+)(?:\?[^" ]*)?"><\/script>/g)];
if (scripts.length < 15 || !scripts.at(-1)[1].endsWith('09-loop-bootstrap.js')) throw Error('Beta não reconhecida. Nenhum arquivo alterado.');
mkdirSync(join(root, 'src/game/beta'), { recursive: true });
mkdirSync(join(root, 'src/styles/beta'), { recursive: true });
for (const [, file] of scripts) copyFileSync(join(source, file), join(root, 'src/game/beta', basename(file)));
writeFileSync(join(root, 'src/game/beta/manifest.json'), JSON.stringify(scripts.map(([,file]) => basename(file)), null, 2) + '\n');
html = html.replace(/href="(css\/[^"?]+)(?:\?[^" ]*)?"/g, (_, file) => {
  copyFileSync(join(source, file), join(root, 'src/styles/beta', basename(file)));
  return `href="./src/styles/beta/${basename(file)}"`;
});
html = html.replace(scripts.map(([tag]) => tag).join('\r\n'), '<!-- GAME_ENTRY -->');
if (!html.includes('<!-- GAME_ENTRY -->')) {
  for (const [tag] of scripts) html = html.replace(tag, tag === scripts[0][0] ? '<!-- GAME_ENTRY -->' : '');
}
html = html.replace('</head>', '<link rel="stylesheet" href="./src/styles/graphics.css">\n</head>');
html = html.replace('Jogue offline em um unico arquivo.', 'Explore a ilha no navegador, com animações e qualidade gráfica ajustável.');
writeFileSync(join(root, 'src/game/index.template.html'), html);
