# Boombera

Joc d'aula en català inspirat en la idea de desactivar una bomba parlant. Parla a Xavi en català i de manera directa.

- No copiïs cap text, taula, valor, símbol ni element gràfic del joc original, ni pugis el seu manual al repositori. El nom i l'aspecte han de continuar sent propis.
- Les regles només es defineixen a `site/comu/regles.js`. El manual les ha de llegir d'allà, mai escriure-les a mà.
- El joc només enllaça el manual des de la portada («Manual per a la Guia», en una altra pestanya), perquè la Guia el pugui obrir o baixar abans d'entrar l'equip. Mai des de la pantalla de la bomba ni des dels panells de la partida.
- Els textos nous de la interfície van a `site/comu/textos.js` (un bloc per idioma), pensant en el multiidioma.
- Si canvies algun fitxer de `site/`, torna a fer `npm run app` (el service worker porta la llista i la versió). Si canvies el logo (`site/comu/logo.js`), fes també `npm run icones`. Les proves ho comproven.
- El manual no porta la llista de nombres primers: Xavi la té a part.
- Abans de programar un mòdul nou, proposa'n les regles a Xavi i espera que les validi.
- Incrementa `VERSIO` a `regles.js` quan canviïn les regles, perquè la placa i el manual ho mostren.
- Els canvis van en branques, i a `main` només el que Xavi hagi aprovat. `main` es publica sol.
- L'estil és blindatge fosc en penombra, en 3D: res de taller ni de cinta de pintor. Els colors i textos dels mòduls s'han de llegir d'un cop d'ull.
- Els nivells no porten el nom de cap curs.
- Passa `npm test` abans de pujar res.
