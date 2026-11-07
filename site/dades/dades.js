// Dades de la partida al navegador: l'equip, el seu progrés i la cua de partides per enviar.
// Si hi ha l'adreça de l'Apps Script, les dades van al full de càlcul. Si no, es desen només en aquest navegador
// amb el mateix nucli. Cada partida es desa al moment a la cua i s'envia en segon pla: si no hi ha xarxa, s'hi queda.
const N = window.BoomberaNucli;
const CONFIG = window.BOOMBERA_CONFIG || {};
const CLAUS = { cua: 'boombera.cua', local: 'boombera.servidor-local', equip: 'boombera.equip', mode: 'boombera.mode', professor: 'boombera.clau-professorat' };

const guarda = (magatzem, k, v) => { try { if (v === null) magatzem.removeItem(k); else magatzem.setItem(k, JSON.stringify(v)); } catch { /* sense espai o bloquejat */ } };
const recupera = (magatzem, k, def) => { try { const v = magatzem.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const local = (k, v) => (v === undefined ? recupera(localStorage, k, null) : guarda(localStorage, k, v));
const sessio = (k, v) => (v === undefined ? recupera(sessionStorage, k, null) : guarda(sessionStorage, k, v));

/* ---------- Transport ---------- */
export function creaServidor(url = CONFIG.servidor) {
  if (url) {
    return {
      remot: true,
      async crida(q) {
        const atura = new AbortController();
        const t = setTimeout(() => atura.abort(), 20000);
        try {
          // Sense capçaleres: és una petició simple i Google no demana permís previ (CORS).
          const r = await fetch(url, { method: 'POST', body: JSON.stringify(q), redirect: 'follow', signal: atura.signal });
          const j = await r.json();
          if (j && j.error === 'servidor') throw new Error(j.detall || 'servidor');
          return j;
        } catch (e) {
          const err = new Error('xarxa'); err.causa = e; throw err;
        } finally { clearTimeout(t); }
      },
    };
  }
  return {
    remot: false,
    async crida(q) {
      const db = local(CLAUS.local) || { equips: [], partides: [] };
      const r = N.executa(db, q, { professor: true });
      if (r.canvis) local(CLAUS.local, db);
      const { canvis, ...resposta } = r;
      return JSON.parse(JSON.stringify(resposta));
    },
  };
}

/* ---------- Codis ocults ---------- */
async function empremta(text) {
  const c = window.BOOMBERA_CODIS || {};
  const bytes = new TextEncoder().encode((c.sal || '') + N.normalitza(text));
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Torna «obre», «demo», «tauler» o null.
export async function quinCodi(text) {
  if (!text || !window.crypto || !crypto.subtle) return null;
  const e = await empremta(text);
  const c = window.BOOMBERA_CODIS || {};
  return ['obre', 'demo', 'tauler'].find((k) => c[k] === e) || null;
}
// El mode obert o demostració dura mentre la pestanya és oberta. Es desa el codi i es torna a comprovar en carregar.
export async function modeDesat() {
  const codi = sessio(CLAUS.mode);
  const m = codi ? await quinCodi(codi) : null;
  return m === 'obre' || m === 'demo' ? m : null;
}
export const desaMode = (codi) => sessio(CLAUS.mode, codi);
export const clauProfessorat = (v) => (v === undefined ? local(CLAUS.professor) : local(CLAUS.professor, v));

/* ---------- Equip i progrés ---------- */
const nouId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
export function creaDades(servidor = creaServidor()) {
  // equip: { id, nom, membres, agent, guia, millors } o bé null (sense equip: es juga sense desar).
  let equip = sessio(CLAUS.equip);
  let enviant = null;
  const escoltes = new Set();
  const avisa = () => escoltes.forEach((f) => f());
  const cua = () => local(CLAUS.cua) || [];
  const posaEquip = (e) => { equip = e; sessio(CLAUS.equip, e); avisa(); };

  // Les partides de la cua ja compten per al progrés que es veu, encara que no hagin arribat al full.
  function millors() {
    if (!equip) return {};
    const m = { ...equip.millors };
    for (const p of cua()) if (p.equip === equip.id && p.guanyada) m[p.missio] = N.millor(m[p.missio], { errors: p.errors, marge: p.marge });
    return m;
  }
  async function envia() {
    if (enviant) return enviant;
    const pendents = cua();
    if (!pendents.length) return true;
    enviant = (async () => {
      try {
        const r = await servidor.crida({ accio: 'desaPartides', equip: equip && equip.id, partides: pendents });
        if (!r.ok) return false;
        const fetes = new Set(r.desades);
        local(CLAUS.cua, cua().filter((p) => !fetes.has(p.id)));
        if (r.equip && equip && r.equip.id === equip.id) posaEquip({ ...r.equip });
        else avisa();
        return true;
      } catch { avisa(); return false; } finally { enviant = null; }
    })();
    return enviant;
  }
  async function accio(q) {
    try { return await servidor.crida(q); } catch { return { ok: false, error: 'xarxa' }; }
  }

  addEventListener('online', () => envia());
  setInterval(() => { if (cua().length) envia(); }, 60000);
  if (cua().length) envia();

  return {
    remot: servidor.remot,
    get equip() { return equip; },
    escolta: (f) => escoltes.add(f),
    millors,
    superades: () => Object.keys(millors()),
    pendents: () => cua().length,
    envia,
    async creaEquip(nom, membres) {
      const r = await accio({ accio: 'creaEquip', nom, membres });
      if (r.ok) posaEquip(r.equip);
      return r;
    },
    async recuperaEquip(nom) {
      const r = await accio({ accio: 'recuperaEquip', nom });
      if (r.ok) posaEquip(r.equip);
      return r;
    },
    async afegeixMembre(membre) {
      if (!equip) return { ok: false, error: 'no-existeix' };
      const r = await accio({ accio: 'afegeixMembre', equip: equip.id, membre });
      if (r.ok) posaEquip({ ...r.equip });
      return r;
    },
    surt() { posaEquip(null); },
    // Desa una partida d'una missió (no de la missió lliure). Diu si és el millor resultat i quines seccions s'han obert.
    registra({ missio, guanyada, errors, marge, agent, guia, versio }) {
      if (!equip) return { record: false };
      const abans = millors()[missio];
      const p = { id: nouId(), data: new Date().toISOString(), equip: equip.id, missio, guanyada, errors, marge: guanyada ? marge : 0, agent, guia, versio };
      local(CLAUS.cua, [...cua(), p]);
      equip = { ...equip, agent, guia }; sessio(CLAUS.equip, equip);
      envia();
      avisa();
      const nou = { errors, marge };
      const record = guanyada && (!abans || (N.millor(abans, nou) === nou && (nou.errors !== abans.errors || nou.marge !== abans.marge)));
      return { record, primera: guanyada && !abans };
    },
    professor: (q) => accio(q),
  };
}
