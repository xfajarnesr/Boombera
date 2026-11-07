// Textos de la portada, del «Com es juga» i dels avisos del mòbil, separats del codi perquè un dia es puguin traduir.
// Per afegir un idioma, es copia el bloc «ca» amb una altra clau. La resta del joc encara té els textos a joc.js.
(function (global) {
  const TEXTOS = {
    ca: {
      lema: 'Parla o peta',
      portada: {
        missions: 'Missions',
        manual: 'Manual per a la Guia',
        manualDesc: 'Llegeix-lo en pantalla o baixa\'l en PDF',
        manualTitol: 'Obre el manual en una altra pestanya: es pot llegir en pantalla o baixar en PDF',
        comEsJuga: 'Com es juga',
        equip: 'Equip',
        demo: 'Mode demostració',
        obre: 'Mode obert',
      },
      comEsJuga: {
        titol: 'Com es juga',
        salta: 'Salta',
        seguent: 'Següent',
        final: 'Som-hi',
        tanca: 'Tanca',
        passos: [
          { titol: 'Dos rols', text: "L'<b>Agent</b> té la bomba a la pantalla, però no té el manual. La <b>Guia</b> té el manual, però no veu la pantalla." },
          { titol: 'Només parlant', text: "Seieu d'esquena. L'Agent descriu el que veu, gira la bomba i llegeix les dades de la franja de dalt. La Guia pregunta i diu què cal fer." },
          { titol: 'Errors i torns', text: "Cada error encén un llum, i quan s'encenen tots, peta. Si supereu 3 missions d'una secció, s'obre la següent. Després de cada partida, canvieu els rols." },
        ],
      },
      joc: {
        gira: 'Gira la bomba',
        davant: 'Davant',
        darrere: 'Darrere',
        allunya: 'Torna a veure tota la bomba',
        zona: 'Apropa-hi la càmera',
        desactivada: 'Desactivada',
        musica: { apaga: 'Apaga la música de tensió', encen: 'Encén la música de tensió' },
        efectes: { apaga: 'Apaga els sons dels botons', encen: 'Encén els sons dels botons' },
      },
      // Indicador ocult de rendiment (Ctrl + Alt + D), per provar-ho als PC d'aula.
      diag: {
        titol: 'Rendiment',
        fps: 'fotogrames/s',
        mediana: 'mediana',
        lent: '5 % més lent',
        grao: 'qualitat',
        auto: 'automàtica',
        forcada: 'forçada',
        crides: 'crides de dibuix',
        gpu: 'targeta',
        mida: 'mida',
        tria: 'Força',
        tanca: 'Tanca',
      },
      mobil: {
        gira: 'Gira el mòbil',
        abans: 'La bomba només es pot jugar amb el mòbil apaïsat. Quan el giris, començarà la missió.',
        durant: "Posa el mòbil apaïsat: el rellotge no s'atura.",
        torna: 'Torna',
      },
    },
  };
  const idioma = 'ca';
  const T = TEXTOS[idioma];
  const Textos = { idioma, T, TEXTOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Textos;
  else global.BoomberaTextos = Textos;
})(typeof window !== 'undefined' ? window : globalThis);
