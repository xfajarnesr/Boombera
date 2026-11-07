// Logo de Boombera: les dues O són el «00» d'un visor de compte enrere, amb una metxa encesa.
// És l'única font del dibuix: el fan servir la portada (joc.js) i les icones de l'app (scripts/icones.js).
// Els zeros són de set segments dibuixats, sense tipografia, perquè la icona es vegi igual a tot arreu.
(function (global) {
  const VERMELL = '#ff2a14'; const APAGAT = '#140504'; const MARC = '#4f5354'; const CARGOL = '#6c6f70';
  const f = (n) => Number(n.toFixed(2));
  const punts = (ps) => ps.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  const horitzontal = (x1, x2, y, t) => [[x1, y], [x1 + t / 2, y - t / 2], [x2 - t / 2, y - t / 2], [x2, y], [x2 - t / 2, y + t / 2], [x1 + t / 2, y + t / 2]];
  const vertical = (y1, y2, x, t) => [[x, y1], [x + t / 2, y1 + t / 2], [x + t / 2, y2 - t / 2], [x, y2], [x - t / 2, y2 - t / 2], [x - t / 2, y1 + t / 2]];
  // Un zero de set segments: tots encesos menys el del mig, que es veu apagat com en un visor de veritat.
  function zero(x, y, w, h, t, g) {
    const xl = x + t / 2; const xr = x + w - t / 2; const yt = y + t / 2; const ym = y + h / 2; const yb = y + h - t / 2;
    const encesos = [
      horitzontal(xl + g, xr - g, yt, t), horitzontal(xl + g, xr - g, yb, t),
      vertical(yt + g, ym - g, xl, t), vertical(yt + g, ym - g, xr, t),
      vertical(ym + g, yb - g, xl, t), vertical(ym + g, yb - g, xr, t),
    ];
    return `<polygon fill="${APAGAT}" points="${punts(horitzontal(xl + g, xr - g, ym, t))}"/>`
      + encesos.map((s) => `<polygon fill="${VERMELL}" points="${punts(s)}"/>`).join('');
  }
  function espurna(cx, cy, r) {
    const ps = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const k = i % 2 ? 0.38 : (i % 4 ? 0.7 : 1); ps.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]); }
    return `<polygon fill="#ffb02e" points="${punts(ps)}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.28)}" fill="#fff3c4"/>`;
  }
  // El visor amb la metxa, dins un quadre de 84 × 56. x, y i k el col·loquen i l'escalen.
  function dibuixVisor(x = 0, y = 0, k = 1) {
    const cargols = [[7, 17], [61, 17], [7, 49], [61, 49]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.5" fill="${CARGOL}"/>`).join('');
    return `<g transform="translate(${x} ${y}) scale(${k})">`
      + `<path d="M58 13 C60 5 67 2 74 5" fill="none" stroke="#b9b7af" stroke-width="3" stroke-linecap="round"/>`
      + `<rect x="2" y="12" width="64" height="42" rx="5" fill="#050505" stroke="${MARC}" stroke-width="2.5"/>${cargols}`
      + zero(12, 18, 20, 30, 4.6, 0.9) + zero(36, 18, 20, 30, 4.6, 0.9)
      + espurna(76, 5, 6.5) + '</g>';
  }
  const Logo = {
    // Les icones de l'app (el manifest les llista): «ple» és la versió adaptable d'Android i la de l'iPhone.
    ICONES: [
      { nom: 'icona-192.png', mida: 192, ple: false },
      { nom: 'icona-512.png', mida: 512, ple: false },
      { nom: 'icona-adaptable-512.png', mida: 512, ple: true },
      { nom: 'icona-iphone-180.png', mida: 180, ple: true },
    ],
    // Les dues O del logo, per posar entre la «B» i «MBERA».
    visor: () => `<svg class="logo-visor" viewBox="0 0 84 56" aria-hidden="true">${dibuixVisor()}</svg>`,
    // Icona quadrada de 512. «ple» omple tot el quadre (icona adaptable d'Android i iPhone), i llavors el dibuix
    // es fa més petit perquè quedi dins el cercle segur. Si no, porta una placa arrodonida sobre fons transparent.
    icona({ ple = false } = {}) {
      const fons = ple ? '<rect width="512" height="512" fill="#121415"/>'
        : '<rect x="16" y="16" width="480" height="480" rx="104" fill="#121415" stroke="#2a2d2e" stroke-width="6"/>';
      const k = ple ? 4.1 : 5.0;
      const x = 256 - 34 * k; const y = 256 - 31 * k;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${fons}${dibuixVisor(x, y, k)}</svg>`;
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Logo;
  else global.BoomberaLogo = Logo;
})(typeof window !== 'undefined' ? window : globalThis);
