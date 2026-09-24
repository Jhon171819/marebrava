import { Texture, Rectangle } from 'pixi.js';

const cache = new Map();
// Paint once at 2x; every body part and effect uses the same GPU texture.
export function acquireAtlas(palette) {
  const key = JSON.stringify(palette);
  if (cache.has(key)) { const entry = cache.get(key); entry.users++; return entry; }
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const c = canvas.getContext('2d'); c.scale(2, 2);
  const source = Texture.from(canvas);
  const textures = {};
  let index = 0;
  const ellipse = (x, y, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  const line = (points, color, width) => { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.stroke(); };
  const polygon = (points, color) => { c.fillStyle = color; c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fill(); };
  function part(name, paint) {
    const x = (index % 8) * 64, y = Math.floor(index / 8) * 64; index++;
    c.save(); c.translate(x + 32, y + 32); paint(); c.restore();
    textures[name] = new Texture({ source: source.source, frame: new Rectangle(x * 2, y * 2, 128, 128) });
  }
  const p = palette;
  part('shadow', () => ellipse(1, 5, 16, 7, '#284d3c45'));
  part('leg', () => { line([[0,0],[0,11]],p.pants,7); line([[-2,12],[4,12]],p.boots,5); });
  part('body', () => { c.beginPath(); c.moveTo(-10,-11); c.quadraticCurveTo(-14,0,-14,11); c.quadraticCurveTo(1,17,14,11); c.lineTo(9,-11); c.closePath(); c.fillStyle=p.shade; c.fill(); polygon([[-6,-12],[8,-11],[10,10],[-3,10]],p.coat); line([[-9,4],[10,4]],'#dac087',3); c.fillStyle='#ebd89d'; c.fillRect(-1,2,5,5); });
  part('arm', () => { line([[0,0],[3,10]],p.shade,8); ellipse(3,13,4,4,p.skin); });
  part('head', () => { ellipse(0,0,10,11,p.skin); ellipse(-10,0,3,3,p.skin); ellipse(10,0,3,3,p.skin); ellipse(-1,-8,11,7,p.hair); c.beginPath(); c.moveTo(-11,-5); c.quadraticCurveTo(-16,-13,-6,-16); c.quadraticCurveTo(8,-19,13,-7); c.lineTo(4,-7); c.lineTo(-2,-11); c.lineTo(-7,-3); c.closePath(); c.fillStyle=p.hair; c.fill(); line([[2,5],[5,5]],'#bb8760',1); });
  part('eyes', () => { ellipse(-4,0,1.1,1.6,p.hair); ellipse(5,0,1.1,1.6,p.hair); });
  part('scarf', () => { c.beginPath(); c.moveTo(-2,0); c.quadraticCurveTo(-17,4,-21,-2); c.lineTo(-16,7); c.quadraticCurveTo(-8,8,0,5); c.closePath(); c.fillStyle=p.scarf; c.fill(); });
  part('collar', () => line([[-10,-1],[1,3],[12,-2]],p.scarf,6));
  part('hook', () => { line([[0,0],[0,11]],'#cbbd93',3); c.beginPath(); c.arc(-4,11,4,0,Math.PI*1.5); c.strokeStyle='#e9dbb4'; c.lineWidth=2; c.stroke(); });
  part('ring', () => { c.beginPath(); c.arc(0,0,23,0,Math.PI*2); c.strokeStyle='#ffe5a5'; c.lineWidth=1.5; c.stroke(); });
  part('spark', () => polygon([[0,-4],[1,0],[4,1],[1,2],[0,5],[-1,2],[-4,1],[-1,0]],'#fff1bd'));
  part('headBack', () => { ellipse(-10,0,3,3,p.skin); ellipse(10,0,3,3,p.skin); ellipse(0,1,9,9,p.skin); ellipse(0,-6,12,11,p.hair); });
  part('headProfile', () => { ellipse(2,0,9,10,p.skin); ellipse(10,1,4,3,p.skin); ellipse(-5,0,3.5,4,p.skin); ellipse(-1,-8,11,8,p.hair); polygon([[-11,-8],[-4,-16],[7,-13],[12,-5],[5,-6],[2,-1],[-1,-6]],p.hair); line([[7,6],[10,6]],'#bb8760',1); });
  part('headBackDiagonal', () => { ellipse(3,2,9,9,p.skin); ellipse(10,0,3,3,p.skin); ellipse(-1,-6,12,11,p.hair); polygon([[-10,-7],[6,-11],[10,-4],[5,4],[-5,5]],p.hair); });
  part('bodyBack', () => { c.beginPath(); c.moveTo(-9,-11); c.quadraticCurveTo(-14,0,-13,10); c.quadraticCurveTo(0,16,13,10); c.lineTo(9,-11); c.closePath(); c.fillStyle=p.shade; c.fill(); c.beginPath(); c.moveTo(-7,-10); c.quadraticCurveTo(-10,4,-7,10); c.quadraticCurveTo(0,13,10,9); c.lineTo(8,-10); c.fillStyle=p.coat; c.fill(); });
  part('eyesProfile', () => ellipse(6,-1,1.1,1.6,p.hair));
  // A larger dedicated tile for the sword arc, still on the shared source.
  c.save(); c.translate(128,192); c.beginPath(); c.arc(0,0,54,-1.1,.4); c.strokeStyle='#f7de9e'; c.lineWidth=12; c.stroke(); c.beginPath(); c.arc(0,0,64,-1.1,.45); c.strokeStyle='#f8edd0'; c.lineWidth=2; c.stroke(); line([[22,0],[62,0]],'#f1e7c8',4); c.restore();
  textures.slash = new Texture({ source: source.source, frame: new Rectangle(0,256,512,256) });
  source.source.update();
  const entry = { textures, users: 1, release() { if (--entry.users === 0) { Object.values(textures).forEach(t => t.destroy()); source.destroy(true); cache.delete(key); } } };
  cache.set(key, entry); return entry;
}
