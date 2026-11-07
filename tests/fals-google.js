// Un Google de mentida perquè les proves facin córrer l'Apps Script de debò (apps-script/Codi.gs) sense xarxa.
// Imita només el que fa servir el servidor: un full amb pestanyes, el bloqueig, les propietats i les respostes.
const vm = require('vm');
const fs = require('fs');
const path = require('path');

// El full es comporta com Google: un text amb apòstrof al davant es guarda com a text, sense l'apòstrof.
const guarda = (v) => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v);
function creaPestanya(nom) {
  const cel = []; let maxFiles = 1000;
  const p = {
    nom, cel,
    getLastRow: () => { for (let i = cel.length; i > 0; i--) if ((cel[i - 1] || []).some((x) => x !== '' && x !== undefined)) return i; return 0; },
    getMaxRows: () => maxFiles,
    insertRowsAfter: (_, n) => { maxFiles += n; },
    setFrozenRows: () => {},
    clearContents: () => { cel.length = 0; },
    getRange(f, c, nf = 1, nc = 1) {
      if (f + nf - 1 > maxFiles) throw new Error(`Fora del full: fila ${f + nf - 1} de ${maxFiles}`);
      return {
        setValues(v) {
          if (v.length !== nf || v.some((r) => r.length !== nc)) throw new Error('mida de setValues');
          v.forEach((r, i) => { cel[f - 1 + i] = cel[f - 1 + i] || []; r.forEach((x, j) => { cel[f - 1 + i][c - 1 + j] = guarda(x); }); });
        },
        getValues: () => Array.from({ length: nf }, (_, i) => Array.from({ length: nc }, (_, j) => { const x = (cel[f - 1 + i] || [])[c - 1 + j]; return x === undefined ? '' : x; })),
        clearContent() { for (let i = 0; i < nf; i++) for (let j = 0; j < nc; j++) if (cel[f - 1 + i]) cel[f - 1 + i][c - 1 + j] = ''; },
      };
    },
  };
  return p;
}

function creaGoogle({ clau = 'clau-de-prova' } = {}) {
  const pestanyes = {};
  const props = clau ? { CLAU_PROFESSORAT: clau } : {};
  const ss = { getSheetByName: (n) => pestanyes[n] || null, insertSheet: (n) => (pestanyes[n] = creaPestanya(n)) };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; }, getContent() { return t; } }) },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Codi.gs'), 'utf8'), ctx, { filename: 'Codi.gs' });
  return {
    post: (cos) => ctx.doPost({ postData: { contents: typeof cos === 'string' ? cos : JSON.stringify(cos) } }).getContent(),
    crida: (cos) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(cos) } }).getContent()),
    files: (nom) => (pestanyes[nom] ? pestanyes[nom].cel.filter((r) => r && r.some((x) => x !== '')).map((r) => [...r]) : []),
    pestanyes,
  };
}
module.exports = { creaGoogle };
