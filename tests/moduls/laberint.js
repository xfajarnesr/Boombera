// Regles i joc real del laberint. L'oracle porta les seves marques i sortides i llegeix les parets pel seu compte.
const assert = require('assert');
const MANUAL = [
  { marques: ['A2', 'E5'], sortides: ['D5', 'A4', 'A1', 'F2'] },
  { marques: ['A2', 'C6'], sortides: ['E3', 'A3', 'F5', 'A5'] },
  { marques: ['D1', 'E5'], sortides: ['E2', 'F5', 'A3', 'C5'] },
  { marques: ['D1', 'B4'], sortides: ['B3', 'C5', 'F6', 'F1'] },
  { marques: ['F3', 'C6'], sortides: ['F5', 'C1', 'A4', 'E3'] },
  { marques: ['F3', 'B4'], sortides: ['E6', 'D3', 'B1', 'A4'] },
];
const COL = 'ABCDEF';
const nom = (x, y) => `${COL[x]}${y + 1}`;
// Passadissos del laberint com a parelles de caselles, llegint les xifres de dalt a baix.
function passadissos(files) {
  const p = new Set();
  files.forEach((fila, r) => [...fila].forEach((d, x) => {
    const y = 5 - r;
    if (Number(d) & 1) { p.add(`${nom(x, y)}>${nom(x + 1, y)}`); p.add(`${nom(x + 1, y)}>${nom(x, y)}`); }
    if (Number(d) & 2) { p.add(`${nom(x, y)}>${nom(x, y - 1)}`); p.add(`${nom(x, y - 1)}>${nom(x, y)}`); }
  }));
  return p;
}
const PAS = { amunt: [0, 1], avall: [0, -1], dreta: [1, 0], esquerra: [-1, 0] };
const salta = (c, dir) => { const x = COL.indexOf(c[0]) + PAS[dir][0]; const y = Number(c[1]) - 1 + PAS[dir][1]; return x < 0 || y < 0 || x > 5 || y > 5 ? null : nom(x, y); };
// Camí més curt, com a llista de direccions.
function cami(files, des, a) {
  const p = passadissos(files);
  const ve = new Map([[des, null]]); const cua = [des];
  while (cua.length) {
    const c = cua.shift();
    for (const dir of Object.keys(PAS)) {
      const v = salta(c, dir);
      if (v && p.has(`${c}>${v}`) && !ve.has(v)) { ve.set(v, [c, dir]); cua.push(v); }
    }
  }
  if (!ve.has(a)) return null;
  const r = []; let c = a;
  while (ve.get(c)) { const [ant, dir] = ve.get(c); r.unshift(dir); c = ant; }
  return r;
}
function oracle(marques, piles) {
  const k = MANUAL.filter((L) => [...L.marques].sort().join() === [...marques].sort().join());
  assert.strictEqual(k.length, 1, 'les dues marques identifiquen un sol laberint');
  return { idx: MANUAL.indexOf(k[0]), sortida: k[0].sortides[piles - 1] };
}
const vista = (p) => p.evaluate(() => { const d = document.querySelector('#laberint').dataset; return { pos: d.pos, marques: d.marques.split(' ') }; });
const mou = (p, dir) => p.locator(`.fletxa-lab[data-dir="${dir}"]`).dispatchEvent('click');

module.exports = {
  oracle, cami, vista, mou, passadissos, salta,
  regles(R) {
    assert.strictEqual(R.LABERINTS.length, MANUAL.length);
    const totes = MANUAL.flatMap((L) => L.marques);
    for (const m of new Set(totes)) assert.strictEqual(totes.filter((x) => x === m).length, 2, `${m}: una marca sola no ha de bastar`);
    let casos = 0;
    R.LABERINTS.forEach((L, i) => {
      assert.deepStrictEqual(L.marques, MANUAL[i].marques); assert.deepStrictEqual(L.sortides, MANUAL[i].sortides);
      assert.strictEqual(L.files.length, 6); L.files.forEach((f) => assert(/^[0-3]{6}$/.test(f)));
      L.files.forEach((f) => assert(!(Number(f[5]) & 1), 'la vora dreta és tancada'));
      assert(![...L.files[5]].some((d) => Number(d) & 2), 'la vora de baix és tancada');
      // Laberint perfecte: tot connectat i 35 passadissos, així que només hi ha un camí entre dues caselles.
      assert.strictEqual(passadissos(L.files).size / 2, 35);
      assert.strictEqual(new Set([...L.sortides, ...L.marques]).size, 6, 'sortides i marques en caselles diferents');
      for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) for (const dir of Object.keys(PAS)) {
        const v = salta(nom(x, y), dir);
        assert.strictEqual(R.obert(L, [x, y], dir), Boolean(v && passadissos(L.files).has(`${nom(x, y)}>${v}`)));
        casos++;
      }
      assert.strictEqual(R.identificaLaberint([...L.marques].reverse()), i);
      for (let piles = 1; piles <= 4; piles++) {
        assert.strictEqual(R.nomCasella(R.sortidaLaberint({ piles, laberint: { idx: i } })), oracle(L.marques, piles).sortida);
        for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) assert(cami(L.files, nom(x, y), L.sortides[piles - 1]), 'tot és accessible');
      }
    });
    return `${casos} parets`;
  },
  bomba(R, b) {
    const L = R.LABERINTS[b.laberint.idx];
    const { sortida } = oracle(L.marques, b.piles);
    const inici = R.nomCasella(b.laberint.inici);
    assert(![...L.marques, ...L.sortides].includes(inici), 'la llum no comença sobre una marca ni una sortida');
    assert(cami(L.files, inici, sortida).length >= 5, 'la sortida no és a tocar');
    assert.strictEqual(R.nomCasella(R.sortidaLaberint(b)), sortida);
  },
  llegeix: async () => ({}),
  async resol(p, R, q) {
    const v = await vista(p);
    const { idx, sortida } = oracle(v.marques, q.piles);
    for (const dir of cami(R.LABERINTS[idx].files, v.pos, sortida)) await mou(p, dir);
  },
};
