// Rennes (Bretagna): una strada corta e piovigginosa tra le tipiche casette a schiera, il CROUS (insegna
// bianca su rosso), la piazza con la chiesa gotica e la giostra coi cavalli dorati, e la Fitness Park
// (scritta bianca su cartello grigio scuro sottolineato di giallo). Tutti vestono pesante.
//
// Casette, chiesa, giostra e palestra sono fatte di molti blocchi: `unisci` li fonde in una mesh sola.

import * as THREE from './lib/three.module.min.js';
import { materiale, blocco, cilindro, sfera, tela, esa, scritta, OSTACOLI, creaPersona, posaCorsa } from './modelli.js';
import { unisci } from './modelli-universita.js';
import { creaAuto, capelliLunghi } from './modelli-liceo.js';
import { amico, creaChiaraAmica, espressioneAmico } from './amici-uni.js';

// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------

const modelli = new Map();
function modello(chiave, costruisci) {
  if (!modelli.has(chiave)) modelli.set(chiave, unisci(costruisci()));
  return modelli.get(chiave).clone();
}

// Prisma a base triangolare (tetto a due falde) con il colmo lungo z: `l` larghezza alla base (x),
// `h` altezza, `lungo` lunghezza lungo z; la base sta all'altezza y.
const PRISMA = new THREE.CylinderGeometry(1, 1, 1, 3);
function prisma(l, h, lungo, col, x, y, z) {
  const m = new THREE.Mesh(PRISMA, materiale(col));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(l / 1.732, lungo, h / 1.5);
  m.position.set(x, y + h / 3, z);
  m.castShadow = true;
  return m;
}
// Lo stesso, con il colmo lungo x (per le finestre delle pareti laterali).
function prismaX(l, h, lungo, col, x, y, z) {
  const g = new THREE.Group();
  g.add(prisma(l, h, lungo, col, 0, 0, 0));
  g.rotation.y = Math.PI / 2;
  g.position.set(x, y, z);
  return g;
}
// Guglia a base quadrata: `mezzo` è metà lato della base.
const CONO4 = new THREE.ConeGeometry(1, 1, 4);
function guglia(mezzo, h, col, x, y, z) {
  const m = new THREE.Mesh(CONO4, materiale(col));
  m.rotation.y = Math.PI / 4;
  m.scale.set(mezzo * 1.4142, h, mezzo * 1.4142);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  return m;
}
// Disco con l'asse lungo z (rosone), centrato in (x, y, z).
function disco(r, sp, col, x, y, z) {
  const g = new THREE.Group();
  g.add(cilindro(r, sp, col, 0, -sp / 2, 0));
  g.rotation.x = Math.PI / 2;
  g.position.set(x, y, z);
  return g;
}
const CONO16 = new THREE.ConeGeometry(1, 1, 16);

const BIANCO = 0xF1EEE6, VETRO = 0x34414F, ARDESIA = 0x474D58, MATTONI = 0x8E4636, ORO = 0xE0B13C;
const ROSSO_CROUS = 0xC6202B;

// ---------------------------------------------------------------------------
// Casette a schiera: rosse, azzurre, marroni, con il bow window, il tetto d'ardesia e i camini
// ---------------------------------------------------------------------------

const MURI = { rosso: 0xB5503C, azzurro: 0x78A9C8, marrone: 0x86644A, crema: 0xD6C9A6 };
const PORTE = [0x1F2933, 0x2F5D3A, 0x1D3557, 0x8E1B1B, 0x1F2933];
const LARGO_CASA = 4.8, N_CASE = 3;
export const LUNGO_CASETTE = LARGO_CASA * N_CASE;
const SCHIERE = [
  ['rosso', 'azzurro', 'marrone'], ['azzurro', 'marrone', 'rosso'],
  ['marrone', 'rosso', 'azzurro'], ['rosso', 'marrone', 'azzurro'],
  ['azzurro', 'rosso', 'crema'], ['marrone', 'azzurro', 'rosso'],
];

function costruisciSchiera(s, x0, v) {
  const g = new THREE.Group();
  const X = u => s * u;
  const D = 7.5, H = 5.4, L = LUNGO_CASETTE;
  g.add(prisma(D + 0.9, 2.6, L + 0.3, ARDESIA, X(x0 + D / 2), H, 0));
  for (let i = 0; i < N_CASE; i++) {
    const z = -L / 2 + LARGO_CASA * (i + 0.5);
    const col = MURI[SCHIERE[v % SCHIERE.length][i]];
    g.add(blocco(D, H, LARGO_CASA, col, X(x0 + D / 2), 0, z));
    const zp = z - 1.4, zb = z + 0.95;
    // Porta con stipite bianco, tettino e gradino.
    g.add(blocco(0.1, 2.3, 1.3, BIANCO, X(x0 - 0.05), 0, zp));
    g.add(blocco(0.14, 2.1, 1.0, PORTE[(v + i) % PORTE.length], X(x0 - 0.08), 0, zp));
    g.add(blocco(0.5, 0.12, 1.6, BIANCO, X(x0 - 0.2), 2.3, zp));
    g.add(blocco(0.5, 0.15, 1.2, 0xA6A39C, X(x0 - 0.3), 0, zp));
    // Bow window al piano terra.
    g.add(blocco(0.9, 2.6, 2.4, col, X(x0 - 0.45), 0, zb));
    g.add(blocco(0.12, 1.5, 2.0, VETRO, X(x0 - 0.93), 0.65, zb));
    for (const dz of [-0.5, 0.5]) g.add(blocco(0.14, 1.5, 0.06, BIANCO, X(x0 - 0.97), 0.65, zb + dz));
    g.add(blocco(1.0, 0.12, 2.6, BIANCO, X(x0 - 0.5), 2.6, zb));
    // Finestre a ghigliottina al primo piano.
    for (const zw of [zp, zb]) {
      g.add(blocco(0.1, 1.6, 1.2, BIANCO, X(x0 - 0.05), 3.0, zw));
      g.add(blocco(0.12, 1.4, 1.0, VETRO, X(x0 - 0.07), 3.1, zw));
      g.add(blocco(0.14, 0.07, 1.0, BIANCO, X(x0 - 0.08), 3.8, zw));
    }
    // Cancelletto basso di ferro davanti al bow window.
    g.add(blocco(0.06, 0.85, 3.1, 0x20252B, X(x0 - 0.6), 0, z + 0.85));
  }
  // Camini sul colmo, uno a ogni muro divisorio, con i comignoli.
  for (let i = 0; i <= N_CASE; i++) {
    const z = -L / 2 + LARGO_CASA * i;
    g.add(blocco(0.12, H, 0.14, BIANCO, X(x0 - 0.06), 0, z));
    g.add(blocco(0.8, 2.2, 0.9, MATTONI, X(x0 + D / 2), H + 1.6, Math.min(L / 2 - 0.5, Math.max(-L / 2 + 0.5, z))));
    for (const dx of [-0.2, 0.2]) g.add(cilindro(0.12, 0.38, 0xC25A2B, X(x0 + D / 2 + dx), H + 3.8, Math.min(L / 2 - 0.5, Math.max(-L / 2 + 0.5, z))));
  }
  return g;
}
export function creaSchiera(e) {
  const x0 = e.x ?? 7.0;
  return modello(`schiera|${e.lato}|${x0}|${e.var % SCHIERE.length}`, () => costruisciSchiera(e.lato, x0, e.var));
}

// ---------------------------------------------------------------------------
// CROUS: la residenza universitaria, con l'insegna bianca su rosso
// ---------------------------------------------------------------------------

function costruisciCrous(s) {
  const g = new THREE.Group();
  const X = u => s * u;
  const x0 = 7.8, D = 11, H = 11.5, L = 26;
  g.add(blocco(D, H, L, 0xD9D1BE, X(x0 + D / 2), 0, 0));
  for (const y of [3.4, 6.2, 9.0]) g.add(blocco(D + 0.2, 0.22, L + 0.2, 0xBDB5A3, X(x0 + D / 2), y, 0));
  g.add(blocco(D + 0.2, 0.9, L + 0.2, ROSSO_CROUS, X(x0 + D / 2), H, 0));
  // File di finestre: il piano terra lascia libero l'ingresso, il primo piano la fascia dell'insegna.
  for (const y of [0.9, 4.2, 7.0, 9.5]) {
    for (let z = -10.5; z < 11; z += 3) {
      if (y === 0.9 && Math.abs(z) < 3.6) continue;
      if (y === 4.2 && Math.abs(z) < 4.2) continue;
      g.add(blocco(0.12, 1.7, 1.5, BIANCO, X(x0 - 0.04), y, z));
      g.add(blocco(0.14, 1.5, 1.3, VETRO, X(x0 - 0.05), y + 0.1, z));
    }
  }
  // Ingresso a vetri con pensilina rossa.
  g.add(blocco(0.14, 2.8, 5.0, BIANCO, X(x0 - 0.06), 0, 0));
  g.add(blocco(0.16, 2.6, 4.7, 0x2F4B5C, X(x0 - 0.08), 0, 0));
  g.add(blocco(0.16, 2.6, 0.1, BIANCO, X(x0 - 0.1), 0, 0));
  g.add(blocco(1.8, 0.2, 6.2, ROSSO_CROUS, X(x0 - 0.9), 3.1, 0));
  for (const z of [-2.9, 2.9]) g.add(cilindro(0.08, 3.1, 0xCCCCCC, X(x0 - 1.7), 0, z));
  // L'insegna sopra l'ingresso: scritta bianca su rosso.
  const insegna = scritta('CROUS', 7.4, 1.8, ROSSO_CROUS, 0xFFFFFF);
  insegna.rotation.y = -s * Math.PI / 2;
  insegna.position.set(X(x0 - 0.12), 4.9, 0);
  g.add(insegna);
  g.add(blocco(0.08, 2.0, 7.6, 0xFFFFFF, X(x0 - 0.06), 3.9, 0));
  // Bandiera sul davanti: l'insegna a bandiera si legge anche arrivando da lontano.
  const bandiera = new THREE.Group();
  bandiera.position.set(X(x0 - 1.7), 5.9, 4.8);
  bandiera.add(blocco(1.8, 0.08, 0.08, 0x2B2F36, X(0.85), 0.5, 0));
  for (const rovescio of [false, true]) {
    const cartello = scritta('CROUS', 1.7, 0.85, ROSSO_CROUS, 0xFFFFFF);
    cartello.position.z = rovescio ? -0.05 : 0.05;
    if (rovescio) cartello.rotation.y = Math.PI;
    bandiera.add(cartello);
  }
  g.add(bandiera);
  // Rastrelliera con qualche bici contro la facciata.
  for (let i = 0; i < 4; i++) {
    const bici = new THREE.Group();
    bici.position.set(X(x0 - 1.2), 0, 7.5 + i * 0.8);
    bici.add(blocco(0.05, 0.6, 1.5, 0x2B2F36, 0, 0.1));
    bici.add(blocco(0.4, 0.05, 0.05, [0xC0392B, 0x2E86C1, 0x1ABC9C, 0xF1C40F][i], 0, 0.8));
    g.add(bici);
  }
  return g;
}
export const creaCrous = lato => modello(`crous|${lato}`, () => costruisciCrous(lato));

// ---------------------------------------------------------------------------
// Chiesa gotica: facciata con rosone, portale a sesto acuto e due torri con le guglie; la navata con le
// bifore colorate e i contrafforti; la freccia sul colmo del tetto
// ---------------------------------------------------------------------------

function costruisciChiesa(s) {
  const g = new THREE.Group();
  const PIETRA = 0xC9C2B0, PIETRA_CH = 0xDAD4C4, PIETRA_SC = 0x9C9585, SC = 0x3D4552;
  const W = 10, xc = s * 19, ZF = 12;                     // ZF: la facciata (verso chi arriva)
  const vetri = [0x2F5FB5, 0xC23B32, 0xE4B93C, 0x2F5FB5];
  // Basamento, navata e tetto.
  g.add(blocco(W + 0.6, 0.6, 28.6, PIETRA_SC, xc, 0, -2));
  g.add(blocco(W, 9, 28, PIETRA, xc, 0, -2));
  g.add(prisma(W + 0.8, 5, 27.8, SC, xc, 9, -2.1));
  // Scalini davanti al portale.
  g.add(blocco(5.4, 0.2, 1.6, PIETRA_SC, xc, 0, ZF + 0.9));
  g.add(blocco(4.4, 0.2, 1.0, PIETRA_SC, xc, 0.2, ZF + 0.7));
  // Portale a sesto acuto.
  g.add(blocco(3.8, 4.2, 0.3, PIETRA_CH, xc, 0, ZF + 0.1));
  g.add(prisma(3.8, 1.8, 0.3, PIETRA_CH, xc, 4.2, ZF + 0.1));
  g.add(blocco(2.4, 3.6, 0.2, 0x4A3322, xc, 0.2, ZF + 0.28));
  g.add(prisma(2.4, 1.4, 0.2, 0x4A3322, xc, 3.8, ZF + 0.28));
  g.add(blocco(0.08, 3.6, 0.05, 0x2C1E14, xc, 0.2, ZF + 0.4));
  // Rosone con i raggi.
  g.add(disco(2.1, 0.3, PIETRA_CH, xc, 7.4, ZF + 0.15));
  g.add(disco(1.7, 0.2, 0x2F5FB5, xc, 7.4, ZF + 0.26));
  g.add(disco(1.1, 0.2, 0xC23B32, xc, 7.4, ZF + 0.32));
  g.add(disco(0.5, 0.2, 0xE4B93C, xc, 7.4, ZF + 0.38));
  for (let k = 0; k < 4; k++) {
    const raggio = new THREE.Group();
    raggio.position.set(xc, 7.4, ZF + 0.45);
    raggio.rotation.z = k * Math.PI / 4;
    raggio.add(blocco(0.1, 3.4, 0.08, PIETRA_CH, 0, -1.7, 0));
    g.add(raggio);
  }
  // Timpano sopra il rosone, con una finestrella e la croce dorata.
  g.add(prisma(W + 0.4, 5, 0.6, PIETRA, xc, 9, ZF - 0.2));
  g.add(blocco(0.5, 1.4, 0.1, vetri[0], xc, 9.4, ZF + 0.12));
  g.add(prisma(0.5, 0.5, 0.1, vetri[0], xc, 10.8, ZF + 0.12));
  g.add(blocco(0.12, 0.9, 0.12, ORO, xc, 14.0, ZF - 0.2));
  g.add(blocco(0.5, 0.12, 0.12, ORO, xc, 14.5, ZF - 0.2));
  // Le due torri.
  for (const sx of [-1, 1]) {
    const tx = xc + sx * 4.4, tz = ZF - 1.8;
    g.add(blocco(3.8, 15, 3.8, PIETRA, tx, 0, tz));
    for (const y of [5, 10]) g.add(blocco(4.0, 0.25, 4.0, PIETRA_SC, tx, y, tz));
    g.add(blocco(0.5, 2.6, 0.1, 0x2A3550, tx, 6.3, ZF + 0.12));
    g.add(prisma(0.5, 0.6, 0.1, 0x2A3550, tx, 8.9, ZF + 0.12));
    // Cella campanaria con tre aperture ad arco.
    g.add(blocco(3.4, 3.5, 3.4, PIETRA, tx, 15, tz));
    g.add(blocco(0.9, 2.2, 0.1, 0x2A2D38, tx, 15.5, tz + 1.72));
    g.add(prisma(0.9, 0.9, 0.1, 0x2A2D38, tx, 17.7, tz + 1.72));
    g.add(prismaX(0.9, 0.9, 0.1, 0x2A2D38, tx + sx * 1.72, 17.7, tz));
    g.add(blocco(0.1, 2.2, 0.9, 0x2A2D38, tx + sx * 1.72, 15.5, tz));
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(guglia(0.22, 1.6, PIETRA, tx + dx * 1.55, 18.5, tz + dz * 1.55));
    g.add(guglia(1.7, 9.5, SC, tx, 18.5, tz));
    g.add(sfera(0.2, ORO, tx, 28.2, tz));
  }
  // Bifore sulla navata, con i contrafforti e le guglie.
  for (const sx of [-1, 1]) {
    const xp = xc + sx * (W / 2);
    [6, 2, -2, -6, -10, -14].forEach((z, i) => {
      const c = vetri[i % vetri.length];
      g.add(blocco(0.14, 4.2, 1.3, c, xp + sx * 0.02, 2.4, z));
      g.add(prismaX(1.3, 1.6, 0.14, c, xp + sx * 0.02, 6.6, z));
      g.add(blocco(0.18, 4.2, 0.08, PIETRA_CH, xp + sx * 0.04, 2.4, z));
    });
    for (const z of [8, 4, 0, -4, -8, -12, -16]) {
      g.add(blocco(0.9, 8.0, 0.7, PIETRA, xp + sx * 0.3, 0, z));
      g.add(guglia(0.3, 1.8, PIETRA, xp + sx * 0.3, 8.0, z));
    }
  }
  // La freccia sul colmo.
  g.add(blocco(1.6, 1.0, 1.6, SC, xc, 13.6, -2));
  g.add(guglia(0.9, 7.5, SC, xc, 14.6, -2));
  g.add(sfera(0.16, ORO, xc, 22.3, -2));
  return g;
}
export const creaChiesa = lato => modello(`chiesa|${lato}`, () => costruisciChiesa(lato));

// ---------------------------------------------------------------------------
// Giostra con i cavallucci dorati: la parte che gira e la base ferma
// ---------------------------------------------------------------------------

function cavallo() {
  const g = new THREE.Group();
  const CREMA = 0xFFF3C8;
  g.add(blocco(0.55, 0.6, 1.4, ORO, 0, 0, 0));
  g.add(blocco(0.36, 0.9, 0.4, ORO, 0, 0.35, -0.6));
  g.add(blocco(0.3, 0.32, 0.6, ORO, 0, 1.0, -0.9));
  g.add(blocco(0.1, 0.8, 0.14, CREMA, 0, 0.5, -0.4));
  g.add(blocco(0.12, 0.7, 0.16, CREMA, 0, 0.0, 0.75));
  g.add(blocco(0.6, 0.1, 0.5, 0xC8352B, 0, 0.6, 0.05));
  for (const x of [-0.15, 0.15]) {
    g.add(blocco(0.14, 0.7, 0.16, ORO, x, -0.6, -0.5));
    g.add(blocco(0.14, 0.7, 0.16, ORO, x, -0.6, 0.5));
  }
  for (const x of [-0.1, 0.1]) g.add(blocco(0.07, 0.16, 0.07, ORO, x, 1.32, -0.75));
  return g;
}
const RAGGIO_GIOSTRA = 4.4;
function costruisciGiostraGira() {
  const g = new THREE.Group();
  const R = RAGGIO_GIOSTRA;
  g.add(cilindro(R, 0.3, 0x8A5A32, 0, 0.35, 0));
  g.add(cilindro(R + 0.12, 0.12, ORO, 0, 0.35, 0));
  g.add(cilindro(0.9, 4.6, 0xE8DCC0, 0, 0.65, 0));
  for (const y of [1.5, 3.0]) g.add(cilindro(0.95, 0.2, ORO, 0, y, 0));
  g.add(cilindro(R + 0.65, 0.5, 0xC8352B, 0, 5.0, 0));
  g.add(cilindro(R + 0.7, 0.18, 0xF3EBD6, 0, 5.5, 0));
  const tetto = new THREE.Mesh(CONO16, materiale(0xC8352B));
  tetto.scale.set(R + 0.6, 1.9, R + 0.6);
  tetto.position.y = 5.68 + 0.95;
  tetto.castShadow = true;
  g.add(tetto);
  g.add(sfera(0.3, ORO, 0, 7.8, 0));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.add(sfera(0.35, 0xF3EBD6, Math.cos(a) * (R + 0.5), 4.95, Math.sin(a) * (R + 0.5)));
    g.add(sfera(0.1, 0xFFF4C2, Math.cos(a) * (R + 0.75), 5.4, Math.sin(a) * (R + 0.75)));
  }
  // Due giri di cavalli sulle aste dorate, ognuno a un'altezza diversa.
  for (const [n, r, fase] of [[8, 3.3, 0], [5, 1.95, 0.5]]) {
    for (let i = 0; i < n; i++) {
      const a = ((i + fase) / n) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      g.add(cilindro(0.05, 4.3, ORO, x, 0.65, z));
      const c = cavallo();
      c.position.set(x, 1.5 + 0.45 * Math.sin(i * 1.7), z);
      c.rotation.y = -a;
      g.add(c);
    }
  }
  return g;
}
function costruisciGiostraBase() {
  const g = new THREE.Group();
  g.add(cilindro(RAGGIO_GIOSTRA + 0.7, 0.2, 0x6D6A63, 0, 0, 0));
  return g;
}
export function creaGiostra(e) {
  const g = new THREE.Group();
  const gira = modello('giostraGira', costruisciGiostraGira);
  const base = modello('giostraBase', costruisciGiostraBase);
  for (const m of [gira, base]) { m.position.x = e.lato * (e.x ?? 15); g.add(m); }
  g.userData.anima = t => { gira.rotation.y = t * 0.55; };
  return g;
}

// ---------------------------------------------------------------------------
// Fitness Park: scritta bianca su un cartello grigio scuro sottolineato di giallo
// ---------------------------------------------------------------------------

const GIALLO = 0xF2C300, GRIGIO_SC = 0x3A3F45;
function texFitness(due, W, H) {
  return tela(W, H, (g) => {
    g.fillStyle = esa(GRIGIO_SC); g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (due) {
      g.font = `800 ${H * 0.28}px Arial, Helvetica, sans-serif`;
      g.fillText('FITNESS', W / 2, H * 0.27, W * 0.9); g.fillText('PARK', W / 2, H * 0.55, W * 0.9);
      g.fillStyle = esa(GIALLO); g.fillRect(W * 0.1, H * 0.76, W * 0.8, H * 0.08);
    } else {
      g.font = `800 ${H * 0.5}px Arial, Helvetica, sans-serif`;
      g.fillText('FITNESS PARK', W / 2, H * 0.42, W * 0.92);
      g.fillStyle = esa(GIALLO); g.fillRect(W * 0.06, H * 0.78, W * 0.88, H * 0.1);
    }
  });
}
function cartelloFitness(due, w, h, W, H) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texFitness(due, W, H) }));
  return m;
}

function costruisciFitness(s) {
  const g = new THREE.Group();
  const X = u => s * u;
  const x0 = 8.5, D = 13, H = 6.4, L = 24;
  g.add(blocco(D, H, L, 0xA9AEB3, X(x0 + D / 2), 0, 0));
  g.add(blocco(D + 0.3, 0.3, L + 0.3, GIALLO, X(x0 + D / 2), H, 0));
  // Vetrata del piano terra con i montanti scuri e, dentro, i tapis roulant.
  g.add(blocco(0.2, 4.0, 18, 0x2F4A58, X(x0 - 0.1), 0.3, 0));
  for (let z = -9; z <= 9.01; z += 3) g.add(blocco(0.28, 4.3, 0.18, 0x2B2F36, X(x0 - 0.16), 0.2, z));
  g.add(blocco(0.3, 0.2, 18.4, 0x2B2F36, X(x0 - 0.16), 0.2, 0));
  g.add(blocco(0.3, 0.2, 18.4, 0x2B2F36, X(x0 - 0.16), 4.3, 0));
  for (const col of [0, 1]) for (let z = -7.5; z <= 7.6; z += 3) {
    g.add(blocco(0.9, 1.4, 1.8, 0x23272D, X(x0 + 1.8 + col * 2.8), 0.3, z));
    g.add(blocco(0.3, 0.3, 0.9, GIALLO, X(x0 + 1.5 + col * 2.8), 1.7, z));
  }
  // Fascia scura sopra la vetrata, con l'insegna.
  g.add(blocco(0.3, 2.1, L, GRIGIO_SC, X(x0 - 0.12), 4.3, 0));
  const insegna = cartelloFitness(false, 12, 1.9, 1536, 242);
  insegna.rotation.y = -s * Math.PI / 2;
  insegna.position.set(X(x0 - 0.3), 5.35, 0);
  g.add(insegna);
  // Insegna a bandiera, per leggerla anche arrivando da lontano.
  const bandiera = new THREE.Group();
  bandiera.position.set(X(x0 - 1.8), 0, 8.5);
  bandiera.add(blocco(1.8, 0.08, 0.08, 0x2B2F36, X(0.9), 6.2, 0));
  for (const rovescio of [false, true]) {
    const c = cartelloFitness(true, 1.9, 1.5, 512, 400);
    c.position.set(0, 5.45, rovescio ? -0.05 : 0.05);
    if (rovescio) c.rotation.y = Math.PI;
    bandiera.add(c);
  }
  g.add(bandiera);
  return g;
}
export const creaFitness = lato => modello(`fitness|${lato}`, () => costruisciFitness(lato));

// ---------------------------------------------------------------------------
// Il selciato della piazza (pavimentazione chiara ai lati della strada)
// ---------------------------------------------------------------------------

function creaSelciato(e) {
  const g = new THREE.Group();
  const lungo = e.lungo ?? 100;
  const piano = new THREE.Mesh(new THREE.PlaneGeometry(26, lungo), materiale(0x8F8A80));
  piano.rotation.x = -Math.PI / 2;
  piano.position.set(e.lato * (6.3 + 13), 0.1, 0);
  piano.receiveShadow = true;
  g.add(piano);
  return g;
}

// ---------------------------------------------------------------------------
// Scenografia: un unico punto d'ingresso per main.js
// ---------------------------------------------------------------------------

export function creaScenaRennes(e) {
  switch (e.tipo) {
    case 'schiera': return creaSchiera(e);
    case 'crous': return creaCrous(e.lato);
    case 'chiesa': return creaChiesa(e.lato);
    case 'giostra': return creaGiostra(e);
    case 'fitness': return creaFitness(e.lato);
    case 'selciato': return creaSelciato(e);
    default: return new THREE.Group();
  }
}

// ---------------------------------------------------------------------------
// Vestiti pesanti: giaccone con le maniche, sciarpa. Si può nascondere (Roberto lo porta solo a Rennes).
// ---------------------------------------------------------------------------

export function giaccone(p, col, sciarpa = 0xE9E4D8, lungo = false) {
  const m = materiale(col);
  const parti = [];
  const agg = (padre, o) => { padre.add(o); parti.push(o); return o; };
  const y0 = lungo ? 0.45 : 0.8;
  agg(p.superiore, blocco(0.74, 1.77 - y0, 0.44, m, 0, y0));
  for (const { spalla, gomito } of p.braccia) {
    agg(spalla, blocco(0.23, 0.42, 0.24, m, 0, -0.4));
    agg(gomito, blocco(0.2, 0.22, 0.2, m, 0, -0.2));
  }
  if (sciarpa != null) {
    agg(p.superiore, blocco(0.46, 0.18, 0.4, sciarpa, 0, 1.68));
    agg(p.superiore, blocco(0.13, 0.55, 0.05, sciarpa, 0.14, 1.15, -0.23));
  }
  return { parti, imposta: v => { for (const o of parti) o.visible = v; } };
}

// ---------------------------------------------------------------------------
// Le sette persone da incontrare (nell'ordine in cui si incontrano) e i passanti
// ---------------------------------------------------------------------------

// 1 · La ragazza che dice "Abuso!": caschetto rosso scuro tendente al castano, occhi marroni.
function ragazzaAbuso() {
  const CAP = 0x6A2B20;
  const p = amico({ pelle: 0xF1D3BC, capelli: CAP, iride: 0x5A3418, donna: true, maglia: 0x2F5D62, pantaloni: 0x2B2F3A, scarpe: 0x4A3020, acconciatura: 'caschetto', corpulenza: 0.92 }, 0.97);
  giaccone(p, 0x2F5D62, 0xD8C7A6);
  return p;
}
// 2 · Occhi azzurri, in forma, bionda cenere.
function ragazzaBionda() {
  const CAP = 0xC9B68E;
  const p = amico({ pelle: 0xF6DDC9, capelli: CAP, iride: 0x4FA3E0, donna: true, maglia: 0x2B3350, pantaloni: 0x22262E, scarpe: 0xF4F1EA, corpulenza: 0.86 }, 1.0);
  capelliLunghi(p, CAP, 0.7, true);
  giaccone(p, 0x2B3350, 0xF1EEE6);
  return p;
}
// 3 · La ragazza che somiglia a Levi: il mantello verde sopra il suo look.
function ragazzaLevi() {
  const p = creaChiaraAmica();
  giaccone(p, 0x5E6B49, 0x3A3F34);
  return p;
}
// 4 · Castano chiaro, capelli lisci con la riga di lato, vestito alla moda: cappotto lungo cammello.
function ragazzoModa() {
  const CAP = 0x9C7B52;
  const p = amico({ pelle: 0xF0D2B8, capelli: CAP, iride: 0x6B4A2A, donna: false, maglia: 0xC19A6B, pantaloni: 0x1E2126, scarpe: 0xF4F1EA, acconciatura: 'lato' }, 1.06);
  giaccone(p, 0xC19A6B, 0x2B2D42, true);
  return p;
}
// 5 · Lisci tirati di lato, biondo scuro, occhi chiari, bello e alto.
function ragazzoAlto() {
  const CAP = 0x8F7448;
  const p = amico({ pelle: 0xF4DCC8, capelli: CAP, iride: 0x7FB0C8, donna: false, maglia: 0x3A3F48, pantaloni: 0x2A2D35, scarpe: 0x2B2A2A, acconciatura: 'lato' }, 1.17);
  giaccone(p, 0x3A3F48, 0x8A8F99);
  return p;
}
// 6 · Capelli rasati scuri, faccia simpatica: sorride.
function ragazzoRasato() {
  const CAP = 0x1E1712;
  const p = amico({ pelle: 0xE2B896, capelli: CAP, iride: 0x3A2618, donna: false, maglia: 0xD9A441, pantaloni: 0x34495E, acconciatura: 'pelato', corpulenza: 1.08 }, 1.03);
  p.cranio.material[2] = p.cranio.material[4] = materiale(CAP);
  giaccone(p, 0xD9A441, 0x2B2D42);
  espressioneAmico(p, 'sorriso');
  return p;
}
// 7 · Chiaro di carnagione, capelli rossi.
function ragazzoRosso() {
  const CAP = 0xB8451F;
  const p = amico({ pelle: 0xF8E4D6, capelli: CAP, iride: 0x6FA0B0, donna: false, maglia: 0x2F4F7F, pantaloni: 0x3A3F4A, scarpe: 0xE9E5DC, acconciatura: 'ciuffo' }, 1.04);
  giaccone(p, 0x2F4F7F, 0xE9E4D8);
  return p;
}

const PERSONE = {
  abuso: ragazzaAbuso, bionda: ragazzaBionda, levi: ragazzaLevi, moda: ragazzoModa,
  alto: ragazzoAlto, rasato: ragazzoRasato, rosso: ragazzoRosso,
};

// Passanti qualunque: cappotti scuri e capelli di tutti i tipi.
const GIACCHE = [0x2F4858, 0x6B3F2A, 0x3E5C3A, 0x7A2E3A, 0x2B2D42, 0x8A7A5C, 0x4A4E69, 0x1F3B4D];
const CAPELLI_G = [0x1E1712, 0x3B2A1E, 0x6B4A2E, 0x2A2A2E, 0x8A6A3A, 0xB08A55];
const PELLI_G = [0xF1D3BB, 0xE6BD9A, 0xD9A981, 0xF5DECB];
function passante(v) {
  const donna = v % 3 === 0;
  const CAP = CAPELLI_G[(v >> 1) % CAPELLI_G.length];
  const giacca = GIACCHE[v % GIACCHE.length];
  const p = amico({
    pelle: PELLI_G[(v >> 2) % PELLI_G.length], capelli: CAP, iride: 0x4A3A2A, donna,
    maglia: giacca, pantaloni: v % 2 ? 0x2B2F3A : 0x3A4458, scarpe: 0x2B2A2A,
    acconciatura: !donna && v % 4 === 1 ? 'lato' : undefined, corpulenza: donna ? 0.9 : 1,
  }, donna ? 0.96 : 1.0 + (v % 3) * 0.03);
  if (donna && v % 2 === 0) capelliLunghi(p, CAP, 0.55, false);
  giaccone(p, giacca, GIACCHE[(v + 3) % GIACCHE.length]);
  return p;
}

// Chi cammina verso di te: lentamente, così lo si può guardare.
// A Rennes le persone sono il 25% più grandi, con la testa ancora più grande, per riconoscere i volti.
function ingrandisci(p) {
  p.radice.scale.multiplyScalar(1.25);
  p.testa.scale.setScalar(1.3);
}

export function creaPersonaRennes(e) {
  const v = e.var ?? 0;
  const p = (PERSONE[e.membro] ?? (() => passante(v)))();
  ingrandisci(p);
  p.radice.traverse(o => { if (o.isMesh) o.castShadow = false; });
  const g = new THREE.Group();
  p.radice.rotation.y = Math.PI;
  g.add(p.radice);
  g.userData.anima = t => {
    posaCorsa(p, t * 3.6 + v, 0.42);
    p.testa.rotation.z = Math.sin(t * 1.8 + v) * 0.04;
  };
  return g;
}

// Due persone ferme a chiacchierare in strada (ostacolo pieno).
function coppiaFerma(e) {
  const g = new THREE.Group();
  const v = e.var ?? 0;
  [[-0.45, v + 1, 0.3], [0.45, v + 6, -0.3]].forEach(([x, k, giro]) => {
    const p = passante(k);
    ingrandisci(p);
    p.radice.traverse(o => { if (o.isMesh) o.castShadow = false; });
    p.radice.rotation.y = Math.PI + giro;
    p.radice.position.x = x;
    g.add(p.radice);
  });
  return g;
}

// ---------------------------------------------------------------------------
// Ostacoli: transenne, coni e fioriere (si saltano); semafori e insegna (si scivola sotto);
// auto, coppie di passanti e pochi robot (si schivano)
// ---------------------------------------------------------------------------

const vecchio = OSTACOLI.rennes;

function coni() {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.55, 0.1], [0.05, -0.15], [0.6, 0.12]]) {
    g.add(cilindro(0.17, 0.05, 0x2B2F36, x, 0, z));
    const c = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 10), materiale(0xF07A1E));
    c.scale.set(0.15, 0.6, 0.15);
    c.position.set(x, 0.35, z);
    g.add(c);
    g.add(cilindro(0.1, 0.07, 0xF1EEE6, x, 0.24, z));
  }
  g.add(blocco(1.7, 0.05, 0.4, 0x2B2F36, 0, 0));
  return g;
}
function fioriera() {
  const g = new THREE.Group();
  g.add(blocco(1.7, 0.6, 0.6, 0x3E6E9E, 0, 0));
  g.add(blocco(1.6, 0.15, 0.5, 0x4A3A2A, 0, 0.6));
  for (const x of [-0.55, -0.1, 0.4]) g.add(sfera(0.28, 0x4F8F4A, x, 0.82, 0));
  for (const [x, c] of [[-0.45, 0xE9C2D4], [0.0, 0xF2E28A], [0.5, 0xE9C2D4]]) g.add(sfera(0.1, c, x, 1.0, 0.1));
  return g;
}
function semaforoPortale() {
  const g = new THREE.Group();
  for (const x of [-1.05, 1.05]) g.add(cilindro(0.07, 3.3, 0x30343B, x));
  g.add(blocco(2.3, 0.12, 0.12, 0x30343B, 0, 3.2));
  for (const x of [-0.55, 0.55]) {
    g.add(blocco(0.06, 0.2, 0.06, 0x30343B, x, 3.0));
    g.add(blocco(0.38, 1.0, 0.3, 0x15181D, x, 2.0));
    const lampade = [[0xFF2D2D, true], [0xFFC83D, false], [0x3DFF7A, false]];
    lampade.forEach(([c, acceso], i) => {
      const l = sfera(0.11, acceso ? new THREE.MeshBasicMaterial({ color: c }) : materiale(0x2A2D33), x, 2.8 - i * 0.3, -0.16);
      g.add(l);
      const l2 = sfera(0.11, acceso ? new THREE.MeshBasicMaterial({ color: c }) : materiale(0x2A2D33), x, 2.8 - i * 0.3, 0.16);
      g.add(l2);
    });
  }
  return g;
}

OSTACOLI.rennes = {
  proprio: true,
  basso: (p, e) => [vecchio.basso, coni, fioriera][(e.var ?? 0) % 3](p, e),
  alto: (p, e) => ((e.var ?? 0) % 3 === 2 ? vecchio.alto(p, e) : semaforoPortale()),
  muro: (p, e) => {
    const k = (e.var ?? 0) % 8;
    return k < 5 ? creaAuto(e) : k < 7 ? coppiaFerma(e) : vecchio.muro(p, e);
  },
  persona: (p, e) => creaPersonaRennes(e),
};
