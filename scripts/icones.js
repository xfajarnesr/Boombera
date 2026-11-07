// Fa les icones de l'app a partir del logo (site/comu/logo.js): npm run icones.
// Les PNG es dibuixen amb el mateix Chromium de les proves, sense cap dependència més.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const Logo = require('../site/comu/logo.js');

const DIR = path.join(__dirname, '..', 'site', 'icones');
const { ICONES } = Logo;

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'icona.svg'), Logo.icona() + '\n');
  const nav = await chromium.launch();
  const p = await nav.newPage();
  for (const i of ICONES) {
    await p.setViewportSize({ width: i.mida, height: i.mida });
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${i.mida}px;height:${i.mida}px}</style>${Logo.icona({ ple: i.ple })}`);
    await p.screenshot({ path: path.join(DIR, i.nom), omitBackground: !i.ple });
  }
  await nav.close();
  console.log(`Icones fetes a site/icones (${ICONES.length} PNG i icona.svg).`);
})().catch((e) => { console.error(e); process.exit(1); });

