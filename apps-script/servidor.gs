/* ---------- Servidor de Boombera al full de càlcul ---------- */
// Pestanyes: Equips, Partides i Altres partides (les dades), i Millors (la vista per al professorat, que es refà sola).
// Altres partides: les que es juguen sense equip i les missions lliures. No compten per al progrés.
// La clau del professorat es posa des del menú Boombera del full: no és enlloc del codi.

var PESTANYES = { equips: 'Equips', partides: 'Partides', altres: 'Altres partides' };
// Detall per mòdul: errors fets a cada mòdul i segon en què s'ha resolt (comptant des del començament).
var CAP_MODULS = BoomberaNucli.MODULS.map(function (m) { return 'Errors ' + m; })
  .concat(BoomberaNucli.MODULS.map(function (m) { return 'Resolt ' + m + ' (s)'; }));
var CAPCALERES = {
  equips: ['Id', 'Equip', 'Nom normalitzat', 'Membres', 'Creat', 'Darrer agent', 'Darrer guia'],
  partides: ['Id', 'Data', 'Id equip', 'Equip', 'Missió', 'Guanyada', 'Errors', 'Marge (s)', 'Agent', 'Guia', 'Versió regles', 'Estat', 'Seqüència'].concat(CAP_MODULS),
  altres: ['Id', 'Data', 'Id equip', 'Equip', 'Missió', 'Mòduls', 'Temps (s)', 'Peta amb', 'Estat', 'Errors', 'Marge (s)', 'Versió regles', 'Seqüència'].concat(CAP_MODULS),
};

function doGet() { return surt({ ok: true, servei: 'Boombera' }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var q = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var clau = PropertiesService.getScriptProperties().getProperty('CLAU_PROFESSORAT');
    var professor = Boolean(clau) && q.clau === clau;
    var db = llegeixDades();
    var r = BoomberaNucli.executa(db, q, { ara: new Date().toISOString(), professor: professor });
    if (r.canvis) { escriuDades(db, r.canvis); refaMillors(db); }
    delete r.canvis;
    return surt(r);
  } catch (err) {
    return surt({ ok: false, error: 'servidor', detall: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) { /* no hi havia bloqueig */ }
  }
}

function surt(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function full(nom, capcalera) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName(nom);
  if (!f) {
    f = ss.insertSheet(nom);
    f.getRange(1, 1, 1, capcalera.length).setValues([capcalera]);
    f.setFrozenRows(1);
  } else if (capcalera.length > 1) {
    // Un full d'una versió anterior: les columnes noves s'afegeixen a la capçalera, i les files velles les deixen buides.
    var ara = f.getRange(1, 1, 1, capcalera.length).getValues()[0];
    if (ara.some(function (v, i) { return String(v) !== capcalera[i]; })) f.getRange(1, 1, 1, capcalera.length).setValues([capcalera]);
  }
  return f;
}

function llegeixDades() {
  var db = { equips: [], partides: [], altres: [] };
  Object.keys(PESTANYES).forEach(function (t) {
    var f = full(PESTANYES[t], CAPCALERES[t]);
    var n = f.getLastRow() - 1;
    if (n < 1) return;
    var cols = BoomberaNucli.COLUMNES[t];
    f.getRange(2, 1, n, cols.length).getValues().forEach(function (fila) {
      if (fila[0] === '' || fila[0] === null) return;
      var o = {};
      cols.forEach(function (c, i) { var v = fila[i]; o[c] = v instanceof Date ? v.toISOString() : v; });
      db[t].push(o);
    });
  });
  db.equips.forEach(function (e) {
    e.id = String(e.id); e.nom = String(e.nom); e.clau = BoomberaNucli.normalitza(e.nom);
    e.membres = String(e.membres || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean);
    e.agent = String(e.agent || ''); e.guia = String(e.guia || '');
  });
  db.partides.forEach(function (p) {
    p.id = String(p.id); p.equip = String(p.equip); p.missio = String(p.missio);
    p.guanyada = p.guanyada === true || String(p.guanyada).toUpperCase() === 'TRUE' || p.guanyada === 'Sí';
    p.errors = Number(p.errors) || 0; p.marge = Number(p.marge) || 0; p.versio = Number(p.versio) || 0;
    p.estat = String(p.estat || (p.guanyada ? 'guanyada' : 'perduda'));
  });
  db.altres.forEach(function (p) {
    p.id = String(p.id); p.equip = String(p.equip || ''); p.missio = String(p.missio);
    p.errors = Number(p.errors) || 0; p.marge = Number(p.marge) || 0; p.versio = Number(p.versio) || 0;
  });
  return db;
}

// Els textos van amb un apòstrof al davant: el full no els converteix (1.1 no es torna una data ni un nombre)
// i un nom que comenci amb «=» no es pot convertir en una fórmula.
function text(v) { return "'" + String(v); }
function aFila(t, o) {
  return BoomberaNucli.COLUMNES[t].map(function (c) {
    var v = c === 'membres' ? o.membres.join(' | ') : o[c];
    if (v === undefined || v === null || v === '') return '';
    return typeof v === 'string' ? text(v) : v;
  });
}
function espai(f, files) {
  var falten = files - f.getMaxRows();
  if (falten > 0) f.insertRowsAfter(f.getMaxRows(), falten + 200);
}

function escriuDades(db, canvis) {
  Object.keys(PESTANYES).forEach(function (t) {
    var canvi = canvis[t];
    if (!canvi) return;
    var f = full(PESTANYES[t], CAPCALERES[t]);
    var cols = BoomberaNucli.COLUMNES[t].length;
    if (canvi === 'tot') {
      var n = f.getLastRow() - 1;
      if (n > 0) f.getRange(2, 1, n, cols).clearContent();
      espai(f, db[t].length + 1);
      if (db[t].length) f.getRange(2, 1, db[t].length, cols).setValues(db[t].map(function (o) { return aFila(t, o); }));
    } else if (canvi.length) {
      espai(f, f.getLastRow() + canvi.length);
      f.getRange(f.getLastRow() + 1, 1, canvi.length, cols).setValues(canvi.map(function (o) { return aFila(t, o); }));
    }
  });
}

// Millors: una fila per equip i una columna per missió, amb el millor marge i els errors. Al final, els intents.
function format(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
function refaMillors(db) {
  var f = full('Millors', ['Equip']);
  var cap = ['Equip', 'Membres', 'Superades'].concat(BoomberaNucli.CODIS).concat(['Partides jugades']);
  var files = db.equips.map(function (e) {
    var m = BoomberaNucli.millors(db, e.id);
    var jugades = db.partides.filter(function (p) { return p.equip === e.id; }).length;
    return [text(e.nom), text(e.membres.join(', ')), Object.keys(m).length]
      .concat(BoomberaNucli.CODIS.map(function (c) { return m[c] ? text(format(m[c].marge) + ' · ' + m[c].errors + ' err') : ''; }))
      .concat([jugades]);
  });
  f.clearContents();
  espai(f, files.length + 1);
  f.getRange(1, 1, 1, cap.length).setValues([cap.map(function (c) { return text(c); })]);
  if (files.length) f.getRange(2, 1, files.length, cap.length).setValues(files);
  f.setFrozenRows(1);
}

/* ---------- Menú del full ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Boombera')
    .addItem('Prepara les pestanyes', 'preparaFull')
    .addItem('Posa la clau del professorat', 'posaClau')
    .addItem('Refés la pestanya Millors', 'refesMillors')
    .addToUi();
}
function preparaFull() {
  Object.keys(PESTANYES).forEach(function (t) { full(PESTANYES[t], CAPCALERES[t]); });
  refaMillors(llegeixDades());
  SpreadsheetApp.getUi().alert('Pestanyes a punt. Ara posa la clau del professorat i publica-ho com a aplicació web.');
}
function posaClau() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Clau del professorat', "Escriu la clau que demanarà el tauler (com a mínim 8 caràcters). No es guarda al full, sinó a les propietats de l'script.", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var clau = r.getResponseText().trim();
  if (clau.length < 8) { ui.alert('Massa curta: com a mínim 8 caràcters.'); return; }
  PropertiesService.getScriptProperties().setProperty('CLAU_PROFESSORAT', clau);
  ui.alert('Clau desada.');
}
function refesMillors() { refaMillors(llegeixDades()); }
