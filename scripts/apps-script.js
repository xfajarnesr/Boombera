// Fa apps-script/Codi.gs, l'únic fitxer que cal enganxar a l'Apps Script del full: el nucli de les dades i el servidor.
// Una prova comprova que està al dia: després de canviar site/dades/nucli.js o apps-script/servidor.gs, cal tornar-lo a fer.
const fs = require('fs');
const path = require('path');
const arrel = path.join(__dirname, '..');
const llegeix = (f) => fs.readFileSync(path.join(arrel, f), 'utf8');
const codi = () => [
  '// Boombera: servidor del full de càlcul. Fitxer generat per scripts/apps-script.js: no l\'editis a mà.',
  '// Instruccions: apps-script/LLEGEIX-ME.md',
  '',
  llegeix('site/dades/nucli.js'),
  llegeix('apps-script/servidor.gs'),
].join('\n');
module.exports = { codi };
if (require.main === module) {
  fs.writeFileSync(path.join(arrel, 'apps-script', 'Codi.gs'), codi());
  console.log('apps-script/Codi.gs a punt.');
}
