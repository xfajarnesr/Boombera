# Boombera

*Parla o peta.*

Joc d'aula per equips, en català. L'Agent veu la bomba a la pantalla, la Guia té el manual (imprès o en una altra pantalla), i només poden parlar. Es pot instal·lar com a app al mòbil o a l'ordinador i funciona sense connexió.

- **Joc:** https://xfajarnesr.github.io/Boombera/
- **Manual:** https://xfajarnesr.github.io/Boombera/manual/
- **Manual en PDF:** https://xfajarnesr.github.io/Boombera/manual/Boombera-manual.pdf

## Com funciona el codi

És una web estàtica, sense servidor ni compilació. Tot el que es publica és a `site/`.

- `site/comu/regles.js`: l'única font de les regles. La fan servir el joc, el manual i les proves.
- `site/moduls/<mòdul>/`: cada mòdul té el seu `3d.js`, el seu `joc.js` i el seu `manual.js`. `registre.js` els aplega.
- `site/index.html`, `joc.js` i `joc.css`: la portada, el «Com es juga», els panells i la partida.
- `site/comu/textos.js`: els textos de la portada, del «Com es juga» i dels avisos del mòbil, un bloc per idioma.
- `site/comu/logo.js`: el logo (el «00» del visor amb la metxa). D'aquí surten la portada i les icones (`npm run icones`, a `site/icones/`).
- `site/app.js`, `site/manifest.webmanifest` i `site/sw.js`: l'app instal·lable. `sw.js` el fa `npm run app` i guarda el joc per jugar sense connexió (no el manual ni el tauler).
- `site/motor/`: l'escena 3D, les peces comunes dels mòduls i el so, generat al navegador.
- `site/vendor/`: la biblioteca Three.js.
- `site/manual/`: el manual imprimible. El joc només hi enllaça des de la portada («Manual per a la Guia»).
- `site/dades/`: equips, partides i progrés. `nucli.js` és la lògica de les dades (la fan servir el joc, el full de càlcul i les proves) i `dades.js`, la part del navegador, amb la cua de partides per enviar.
- `site/comu/config.js`: l'adreça de l'Apps Script. Si és buida, les dades es desen només al navegador.
- `site/comu/codis.js`: les empremtes dels codis del professorat, fetes amb `scripts/codis.js`. Els codis no són al repositori.
- `site/tauler/`: el tauler del professorat. El joc no hi enllaça.
- `apps-script/`: el servidor del full de càlcul i com posar-lo en marxa ([LLEGEIX-ME](apps-script/LLEGEIX-ME.md)).
- `tests/`: comprova les regles i les dades, i juga partides reals al navegador. Cada mòdul té les seves proves a `tests/moduls/`. `tests/fals-google.js` fa córrer l'Apps Script de debò sobre un full de mentida.

## Proves en local

```
npm ci
npx playwright install chromium
npm test
npm run pdf
```

Cada canvi a `main` passa les proves, genera el PDF i es publica a GitHub Pages. Si una prova falla, no es publica res.

## Tipografies

Atkinson Hyperlegible, Barlow Condensed i Saira Stencil One, amb les seves llicències a `site/comu/fonts/`.
