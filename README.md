# Curtcircuit

Joc d'aula per parelles, en català. Qui desactiva veu la bomba a la pantalla, qui fa d'expert té el manual imprès, i només poden parlar.

- **Joc:** https://xfajarnesr.github.io/Curtcircuit/
- **Manual:** https://xfajarnesr.github.io/Curtcircuit/manual/
- **Manual en PDF:** https://xfajarnesr.github.io/Curtcircuit/manual/Curtcircuit-manual.pdf

## Com funciona el codi

És una web estàtica, sense servidor ni compilació. Tot el que es publica és a `site/`.

- `site/comu/regles.js`: l'única font de les regles. La fan servir el joc, el manual i les proves.
- `site/moduls/<mòdul>/`: cada mòdul té el seu `3d.js`, el seu `joc.js` i el seu `manual.js`. `registre.js` els aplega.
- `site/index.html`, `joc.js` i `joc.css`: la partida.
- `site/motor/`: l'escena 3D, les peces comunes dels mòduls i el so, generat al navegador.
- `site/vendor/`: la biblioteca Three.js.
- `site/manual/`: el manual imprimible. El joc no hi enllaça.
- `tests/`: comprova les regles i juga partides reals al navegador. Cada mòdul té les seves proves a `tests/moduls/`.

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
