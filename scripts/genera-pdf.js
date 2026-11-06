// Genera el PDF del manual a partir de la mateixa pàgina que es veu a la web.
const { chromium } = require('playwright');
const path = require('path');
const manual = path.join(__dirname, '..', 'site', 'manual');

(async () => {
  const nav = await chromium.launch();
  const p = await nav.newPage();
  await p.goto('file://' + path.join(manual, 'index.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(manual, 'Curtcircuit-manual.pdf'), preferCSSPageSize: true, printBackground: true });
  await nav.close();
  console.log('PDF generat.');
})().catch((e) => { console.error(e); process.exit(1); });
