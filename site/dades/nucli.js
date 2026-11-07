// Nucli de les dades de Boombera: equips, partides i millors resultats.
// El fan servir el joc (servidor local al navegador), l'Apps Script del full de càlcul i les proves.
// No depèn del navegador ni de Google: treballa sobre un objecte { equips: [], partides: [] }.
var BoomberaNucli = (function () {
  var MEMBRES = { min: 2, max: 4 };
  var LLARGADA = { equip: 24, membre: 20 };
  var COLUMNES = {
    equips: ['id', 'nom', 'clau', 'membres', 'creat', 'agent', 'guia'],
    partides: ['id', 'data', 'equip', 'nom_equip', 'missio', 'guanyada', 'errors', 'marge', 'agent', 'guia', 'versio'],
  };
  // Els codis de les 24 missions (secció.missió). Una prova comprova que coincideixen amb les regles.
  var CODIS = [];
  for (var s = 1; s <= 6; s++) for (var m = 1; m <= 4; m++) CODIS.push(s + '.' + m);

  // «Tigres Àgils», «tigres  agils» i «TIGRES ÀGILS» són el mateix equip.
  function normalitza(text) {
    return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  var neteja = function (text) { return String(text || '').replace(/\s+/g, ' ').trim(); };

  // Millor partida: menys errors i, si n'hi ha igual, més marge.
  function millor(a, b) {
    if (!a) return b; if (!b) return a;
    if (a.errors !== b.errors) return a.errors < b.errors ? a : b;
    return b.marge > a.marge ? b : a;
  }
  function millors(db, equip) {
    var r = {};
    db.partides.forEach(function (p) {
      if (p.equip !== equip || !p.guanyada) return;
      var m = millor(r[p.missio], { errors: p.errors, marge: p.marge });
      r[p.missio] = { errors: m.errors, marge: m.marge };
    });
    return r;
  }
  function intents(db, equip) {
    var r = {};
    db.partides.forEach(function (p) { if (p.equip === equip) r[p.missio] = (r[p.missio] || 0) + 1; });
    return r;
  }
  var troba = function (db, id) { return db.equips.filter(function (e) { return e.id === id; })[0]; };
  var perNom = function (db, nom) { var c = normalitza(nom); return db.equips.filter(function (e) { return e.clau === c; })[0]; };
  // El que veu l'equip: sense els intents, que no es mostren als alumnes.
  function vista(db, e) {
    return { id: e.id, nom: e.nom, membres: e.membres.slice(), agent: e.agent || '', guia: e.guia || '', millors: millors(db, e.id) };
  }

  function validaMembres(llista) {
    var membres = []; var vistos = {};
    (llista || []).forEach(function (x) {
      var n = neteja(x); var c = normalitza(n);
      if (!c || vistos[c]) return;
      vistos[c] = true; membres.push(n.slice(0, LLARGADA.membre));
    });
    return membres;
  }
  var nouId = function (prefix, rng) { return prefix + Math.floor((rng || Math.random)() * 1e12).toString(36) + Date.now().toString(36).slice(-4); };

  /* ---------- Accions de l'equip ---------- */
  function creaEquip(db, q, ctx) {
    var nom = neteja(q.nom).slice(0, LLARGADA.equip);
    if (normalitza(nom).replace(/[0-9 ]/g, '').length < 2) return { ok: false, error: 'nom-curt' };
    if (perNom(db, nom)) return { ok: false, error: 'existeix' };
    var membres = validaMembres(q.membres);
    if (membres.length < MEMBRES.min) return { ok: false, error: 'pocs-membres' };
    if (membres.length > MEMBRES.max) return { ok: false, error: 'massa-membres' };
    var e = { id: nouId('e', ctx.rng), nom: nom, clau: normalitza(nom), membres: membres, creat: ctx.ara, agent: '', guia: '' };
    db.equips.push(e);
    return { ok: true, equip: vista(db, e), canvis: { equips: 'tot' } };
  }
  function recuperaEquip(db, q) {
    var e = perNom(db, q.nom);
    return e ? { ok: true, equip: vista(db, e) } : { ok: false, error: 'no-existeix' };
  }
  function afegeixMembre(db, q) {
    var e = troba(db, q.equip);
    if (!e) return { ok: false, error: 'no-existeix' };
    var membres = validaMembres(e.membres.concat([q.membre]));
    if (membres.length === e.membres.length) return { ok: false, error: 'repetit' };
    if (membres.length > MEMBRES.max) return { ok: false, error: 'massa-membres' };
    e.membres = membres;
    return { ok: true, equip: vista(db, e), canvis: { equips: 'tot' } };
  }
  // Les partides porten un identificador fet al navegador: si una s'envia dues vegades (per una connexió que cau), només compta una.
  function desaPartides(db, q, ctx) {
    var noves = []; var equips = {};
    var fetes = {}; db.partides.forEach(function (p) { fetes[p.id] = true; });
    (q.partides || []).forEach(function (p) {
      var e = troba(db, p.equip);
      if (!e || !p.id || fetes[p.id] || CODIS.indexOf(p.missio) < 0) return;
      var errors = Math.round(Number(p.errors)); var marge = Math.round(Number(p.marge));
      if (!(errors >= 0 && errors <= 3 && marge >= 0 && marge <= 599)) return;
      var fila = {
        id: String(p.id).slice(0, 40), data: neteja(p.data) || ctx.ara, equip: e.id, nom_equip: e.nom, missio: p.missio,
        guanyada: Boolean(p.guanyada), errors: errors, marge: p.guanyada ? marge : 0,
        agent: neteja(p.agent).slice(0, LLARGADA.membre), guia: neteja(p.guia).slice(0, LLARGADA.membre), versio: Number(p.versio) || 0,
      };
      fetes[fila.id] = true; db.partides.push(fila); noves.push(fila);
      e.agent = fila.agent; e.guia = fila.guia; equips[e.id] = true;
    });
    var r = { ok: true, desades: (q.partides || []).map(function (p) { return p.id; }) };
    var e = troba(db, q.equip);
    if (e) r.equip = vista(db, e);
    if (noves.length) r.canvis = { equips: 'tot', partides: noves };
    return r;
  }

  /* ---------- Accions del professorat ---------- */
  function tauler(db) {
    return {
      ok: true,
      equips: db.equips.map(function (e) {
        var v = vista(db, e); v.creat = e.creat; v.intents = intents(db, e.id);
        var ps = db.partides.filter(function (p) { return p.equip === e.id; });
        v.darrera = ps.length ? ps[ps.length - 1].data : '';
        return v;
      }),
      partides: db.partides.slice(),
    };
  }
  function esborraEquip(db, q) {
    if (!troba(db, q.equip)) return { ok: false, error: 'no-existeix' };
    db.equips = db.equips.filter(function (e) { return e.id !== q.equip; });
    db.partides = db.partides.filter(function (p) { return p.equip !== q.equip; });
    return { ok: true, canvis: { equips: 'tot', partides: 'tot' } };
  }
  function esborraPartida(db, q) {
    var n = db.partides.length;
    db.partides = db.partides.filter(function (p) { return p.id !== q.id; });
    return n === db.partides.length ? { ok: false, error: 'no-existeix' } : { ok: true, canvis: { partides: 'tot' } };
  }
  // Fusiona dos equips (per exemple, si se n'ha creat un de repetit): les partides passen a «a» i «de» desapareix.
  function fusiona(db, q) {
    var de = troba(db, q.de); var a = troba(db, q.a);
    if (!de || !a || de === a) return { ok: false, error: 'no-existeix' };
    db.partides.forEach(function (p) { if (p.equip === de.id) { p.equip = a.id; p.nom_equip = a.nom; } });
    a.membres = validaMembres(a.membres.concat(de.membres));
    db.equips = db.equips.filter(function (e) { return e !== de; });
    return { ok: true, equip: vista(db, a), canvis: { equips: 'tot', partides: 'tot' } };
  }

  var ACCIONS = { creaEquip: creaEquip, recuperaEquip: recuperaEquip, afegeixMembre: afegeixMembre, desaPartides: desaPartides };
  var PROFESSORAT = { tauler: tauler, esborraEquip: esborraEquip, esborraPartida: esborraPartida, fusiona: fusiona };
  // Executa una petició. Les del professorat només van si el transport diu que la clau és bona.
  function executa(db, q, ctx) {
    q = q || {}; ctx = ctx || {};
    if (!ctx.ara) ctx.ara = new Date().toISOString();
    if (q.accio === 'hola') return { ok: true, servei: 'Boombera' };
    if (ACCIONS[q.accio]) return ACCIONS[q.accio](db, q, ctx);
    if (PROFESSORAT[q.accio]) return ctx.professor ? PROFESSORAT[q.accio](db, q, ctx) : { ok: false, error: 'clau' };
    return { ok: false, error: 'accio' };
  }

  return { executa: executa, normalitza: normalitza, millor: millor, millors: millors, CODIS: CODIS, COLUMNES: COLUMNES, MEMBRES: MEMBRES, LLARGADA: LLARGADA };
})();
if (typeof module !== 'undefined') module.exports = BoomberaNucli;
