// Fa site/comu/codis.js amb les empremtes dels codis ocults. Els codis no es guarden enlloc del repositori.
//   node scripts/codis.js <codi per obrir-ho tot> <codi del mode demostració> <codi del tauler>
// Es compara sense distingir majúscules, accents, espais ni guions.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { normalitza } = require('../site/dades/nucli.js');
const empremta = (sal, codi) => crypto.createHash('sha256').update(sal + normalitza(codi)).digest('hex');
function fitxer(codis, sal = crypto.randomBytes(12).toString('hex')) {
  const e = Object.fromEntries(Object.entries(codis).map(([k, v]) => [k, empremta(sal, v)]));
  return `// Empremtes (SHA-256) dels codis ocults. Fet amb scripts/codis.js: els codis no són al repositori.\nwindow.BOOMBERA_CODIS = ${JSON.stringify({ sal, ...e }, null, 2)};\n`;
}
module.exports = { fitxer, empremta };
if (require.main === module) {
  const [obre, demo, tauler] = process.argv.slice(2);
  if (!obre || !demo || !tauler) { console.error('Cal: node scripts/codis.js <obre> <demo> <tauler>'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'site', 'comu', 'codis.js'), fitxer({ obre, demo, tauler }));
  console.log('site/comu/codis.js a punt.');
}
