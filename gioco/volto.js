// Il volto di Roberto: una testa a cubo smussato con il viso disegnato al volo (nessuna foto sul
// telefono) ispirato alla sua foto: pelle olivastra, sopracciglia folte, occhi scuri, riccioli neri,
// barba piena e baffi. Il viso si ridisegna per ogni espressione; le espressioni si cambiano con
// `imposta('sorriso')` e l'ammiccamento è automatico (`aggiorna`).
//
// Si adatta all'età: neonato (niente barba, pochi capelli, occhioni), bimbo (niente barba, ricci corti),
// adulto (barba e riccioli folti).

import * as THREE from './lib/three.module.min.js';

const FACCIA = 384;                       // lato della texture del viso
const esa = n => '#' + n.toString(16).padStart(6, '0');

export const ETA_VOLTO = {
  neonato: { pelle: 0xD9A27C, guance: 'rgba(235,110,100,.35)', barba: 0, occhi: 1.28, sopracciglia: 0.55, naso: 0.7, riccioli: 9, ricciolo: 0.06, capelli: 0x2A1A10 },
  bimbo:   { pelle: 0xD29468, guance: 'rgba(225,105,90,.3)', barba: 0, occhi: 1.2, sopracciglia: 0.6, naso: 0.62, riccioli: 46, ricciolo: 0.066, capelli: 0x1B1009, cranio: [0.47, 0.46, 0.45], frangia: 0.8 },
  adulto:  { pelle: 0xC48A62, guance: 'rgba(205,95,80,.18)', barba: 1, occhi: 1.0, sopracciglia: 1.0, naso: 1.0, riccioli: 46, ricciolo: 0.105, capelli: 0x17100A },
};
const BARBA = '#2E1D13';

// Espressioni: occhi, inclinazione e quota delle sopracciglia (sx, dx), bocca, guance rosse, sguardo (x, y).
export const ESPRESSIONI = {
  neutro:    { occhi: 'aperti',  sopr: [0, 0, 0],       bocca: 'neutra' },
  sorriso:   { occhi: 'aperti',  sopr: [-4, -4, 0.05],  bocca: 'sorriso' },
  gioia:     { occhi: 'felici',  sopr: [-9, -9, 0.1],   bocca: 'gioia', guance: true },
  sforzo:    { occhi: 'stretti', sopr: [5, 5, -0.28],   bocca: 'sforzo' },
  sorpresa:  { occhi: 'larghi',  sopr: [-15, -15, 0],   bocca: 'o' },
  dolore:    { occhi: 'chiusi',  sopr: [3, 3, 0.4],     bocca: 'smorfia' },
  triste:    { occhi: 'giu',     sopr: [-3, -3, 0.38],  bocca: 'triste' },
  imbarazzo: { occhi: 'giu',     sopr: [-3, -3, 0.2],   bocca: 'storta', guance: true },
  furbo:     { occhi: 'ammicca', sopr: [-10, 2, 0.0],   bocca: 'furbo' },
  bacio:     { occhi: 'aperti',  sopr: [-5, -5, 0.08],  bocca: 'bacio' },
  piange:    { occhi: 'chiusi',  sopr: [-2, -2, 0.45],  bocca: 'urlo', guance: true },
  sonno:     { occhi: 'chiusi',  sopr: [0, 0, 0.05],    bocca: 'neutra' },
};

function disegnaFaccia(eta, espr, chiuso) {
  const P = ETA_VOLTO[eta];
  const c = document.createElement('canvas');
  c.width = c.height = FACCIA;
  const g = c.getContext('2d');
  const W = FACCIA;
  const pelle = esa(P.pelle);

  // Pelle con un po' di ombra ai bordi.
  g.fillStyle = pelle; g.fillRect(0, 0, W, W);
  const ombra = g.createRadialGradient(W / 2, W * 0.5, W * 0.25, W / 2, W * 0.5, W * 0.72);
  ombra.addColorStop(0, 'rgba(255,200,160,.10)'); ombra.addColorStop(1, 'rgba(60,20,0,.28)');
  g.fillStyle = ombra; g.fillRect(0, 0, W, W);

  // Guance.
  const rosse = espr.guance;
  g.fillStyle = rosse ? 'rgba(225,90,80,.38)' : P.guance;
  for (const x of [0.2, 0.8]) { g.beginPath(); g.ellipse(W * x, W * 0.57, W * 0.1, W * 0.065, 0, 0, Math.PI * 2); g.fill(); }

  // Barba piena: dalle basette alla mascella, attorno alla bocca, con barbetta sul mento.
  if (P.barba) {
    g.fillStyle = BARBA;
    g.beginPath();
    g.moveTo(0, W * 0.4);
    g.lineTo(W * 0.1, W * 0.42); g.lineTo(W * 0.12, W * 0.6);
    g.quadraticCurveTo(W * 0.3, W * 0.62, W * 0.37, W * 0.665);    // guancia sinistra, verso il baffo
    g.quadraticCurveTo(W * 0.5, W * 0.64, W * 0.63, W * 0.665);    // sopra il labbro (baffi)
    g.quadraticCurveTo(W * 0.7, W * 0.62, W * 0.88, W * 0.6);
    g.lineTo(W * 0.9, W * 0.42); g.lineTo(W, W * 0.4); g.lineTo(W, W); g.lineTo(0, W);
    g.closePath(); g.fill();
    // Sfumatura delle guance: barba che sale piano verso gli zigomi.
    const sfuma = g.createLinearGradient(0, W * 0.5, 0, W * 0.64);
    sfuma.addColorStop(0, 'rgba(46,29,19,0)'); sfuma.addColorStop(1, 'rgba(46,29,19,.5)');
    g.fillStyle = sfuma; g.fillRect(W * 0.1, W * 0.5, W * 0.8, W * 0.16);
    // Puntini di barba più chiari.
    g.fillStyle = 'rgba(120,80,50,.35)';
    for (let i = 0; i < 160; i++) g.fillRect((i * 97 % W), W * 0.6 + ((i * 53) % (W * 0.4)), 2, 2);
  }

  // Attaccatura dei capelli: frangia di riccioli sulla fronte.
  g.fillStyle = esa(P.capelli);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, W * 0.09);
  const ric = 9;
  for (let i = ric; i >= 0; i--) {
    const x = (W * i) / ric;
    g.quadraticCurveTo(x + W / ric * 0.5, W * (0.13 + (i % 2) * 0.05), x, W * 0.09 + (i % 3) * 4);
  }
  g.closePath(); g.fill();

  // Naso: due ombre laterali, narici e punta.
  const naso = P.naso;
  g.strokeStyle = 'rgba(90,40,20,.35)'; g.lineWidth = 7 * naso; g.lineCap = 'round';
  g.beginPath(); g.moveTo(W * 0.465, W * 0.4); g.quadraticCurveTo(W * 0.45, W * 0.5, W * 0.43, W * 0.55); g.stroke();
  g.beginPath(); g.moveTo(W * 0.535, W * 0.4); g.quadraticCurveTo(W * 0.55, W * 0.5, W * 0.57, W * 0.55); g.stroke();
  g.fillStyle = 'rgba(255,215,180,.28)'; g.beginPath(); g.ellipse(W * 0.5, W * 0.5, W * 0.035 * naso, W * 0.045 * naso, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(55,25,12,.8)';
  for (const x of [0.455, 0.545]) { g.beginPath(); g.ellipse(W * x, W * 0.565, W * 0.021 * naso, W * 0.013 * naso, x < 0.5 ? 0.35 : -0.35, 0, Math.PI * 2); g.fill(); }

  // Occhi.
  const sguardo = espr.sguardo ?? [0, 0];
  const aperto = espr.occhi !== 'chiusi' && !chiuso;
  for (const lato of [-1, 1]) {
    const cx = W * (0.5 + lato * 0.185), cy = W * 0.42;
    const ew = W * 0.088 * P.occhi, eh = W * 0.06 * P.occhi;
    let tipo = chiuso ? 'chiusi' : espr.occhi;
    if (tipo === 'ammicca' && lato === 1) tipo = 'chiusi';
    else if (tipo === 'ammicca') tipo = 'aperti';
    const sc = '#1B0F08';
    if (tipo === 'chiusi' || tipo === 'felici') {
      g.strokeStyle = sc; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath();
      if (tipo === 'felici') { g.moveTo(cx - ew, cy + 4); g.quadraticCurveTo(cx, cy - eh * 1.6, cx + ew, cy + 4); }
      else { g.moveTo(cx - ew, cy); g.quadraticCurveTo(cx, cy + eh * 0.9, cx + ew, cy); }
      g.stroke();
      if (tipo === 'chiusi' && espr.occhi === 'chiusi' && !chiuso) {
        // Palpebre strette: due rughette sotto l'occhio.
        g.lineWidth = 3; g.strokeStyle = 'rgba(70,30,15,.5)';
        g.beginPath(); g.moveTo(cx - ew * 0.6, cy + eh * 1.3); g.lineTo(cx + ew * 0.6, cy + eh * 1.3); g.stroke();
      }
      continue;
    }
    const alto = tipo === 'larghi' ? 1.25 : tipo === 'stretti' ? 0.55 : tipo === 'giu' ? 0.8 : 1;
    const h = eh * alto;
    // Bianco.
    g.fillStyle = '#F4EFE6';
    g.beginPath(); g.ellipse(cx, cy, ew, h, 0, 0, Math.PI * 2); g.fill();
    // Iride scura e pupilla.
    const ix = cx + sguardo[0] * ew * 0.5;
    const iy = cy + sguardo[1] * h * 0.4 + (tipo === 'giu' ? h * 0.3 : 0);
    const ir = Math.min(ew * 0.72, h * 1.15);
    g.save();
    g.beginPath(); g.ellipse(cx, cy, ew, h, 0, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#4A2A1C'; g.beginPath(); g.arc(ix, iy, ir, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#150A05'; g.beginPath(); g.arc(ix, iy, ir * 0.55, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(ix - ir * 0.3, iy - ir * 0.35, ir * 0.24, 0, Math.PI * 2); g.fill();
    // Palpebra superiore: copre la parte alta dell'occhio fino a una certa quota.
    const copre = tipo === 'stretti' ? 0.45 : tipo === 'giu' ? 0.5 : tipo === 'larghi' ? 0 : 0.12;
    g.fillStyle = pelle;
    g.fillRect(cx - ew - 2, cy - h - 4, ew * 2 + 4, 4 + 2 * h * copre);
    g.restore();
    // Linea della palpebra, spessa come nella foto.
    g.strokeStyle = sc; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.ellipse(cx, cy, ew * 1.02, h * 1.02, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(60,25,10,.55)';
    g.beginPath(); g.ellipse(cx, cy + 3, ew * 0.95, h * 0.95, 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
  }

  // Sopracciglia folte e scure, un po' arcuate.
  const [yS, yD, inclina] = espr.sopr;
  for (const lato of [-1, 1]) {
    const cx = W * (0.5 + lato * 0.185), cy = W * 0.335 + (lato < 0 ? yS : yD) * (W / 384);
    const lung = W * 0.105, sp = W * 0.042 * P.sopracciglia;
    // Estremo interno più alto o più basso a seconda dell'espressione.
    const dentro = -inclina * lung * 0.9 * -1;
    g.fillStyle = '#1C120B';
    g.beginPath();
    const xi = cx - lato * lung, xe = cx + lato * lung;
    const yi = cy + dentro * 0 - inclina * lung * 0.9 * 1, ye = cy + inclina * lung * 0.35;
    g.moveTo(xi, yi + sp * 0.4);
    g.quadraticCurveTo(cx, cy - sp * 2.1 - (inclina > 0 ? 0 : 0), xe, ye + sp * 0.2);
    g.quadraticCurveTo(cx, cy + sp * 0.5, xi, yi + sp * 1.5);
    g.closePath(); g.fill();
  }

  // Bocca.
  disegnaBocca(g, W, espr.bocca, P);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function disegnaBocca(g, W, tipo, P) {
  const cx = W * 0.5, cy = W * 0.745;
  const labbro = '#A24A45', labbroScuro = '#6E2A2A', dentro = '#3A0F10';
  const conBarba = P.barba;
  // Intorno alla bocca (con la barba: pelle chiara sotto i baffi).
  if (conBarba) {
    const patch = g.createRadialGradient(cx, cy, 4, cx, cy, W * 0.17);
    patch.addColorStop(0, 'rgba(150,100,72,.9)'); patch.addColorStop(1, 'rgba(120,80,56,0)');
    g.fillStyle = patch; g.fillRect(cx - W * 0.2, cy - W * 0.12, W * 0.4, W * 0.26);
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  const labbra = (ampiezza, apertura, curva, spessore = 12) => {
    // Linea della bocca da (cx-ampiezza, y) a (cx+ampiezza, y) con curvatura e apertura.
    const yAng = cy - curva;
    if (apertura > 0) {
      g.fillStyle = dentro;
      g.beginPath();
      g.moveTo(cx - ampiezza, yAng);
      g.quadraticCurveTo(cx, cy - apertura * 0.6 + curva * 0.5, cx + ampiezza, yAng);
      g.quadraticCurveTo(cx, cy + apertura * 1.4 + curva * 0.5, cx - ampiezza, yAng);
      g.fill();
      g.strokeStyle = labbro; g.lineWidth = spessore;
      g.stroke();
    } else {
      g.strokeStyle = labbro; g.lineWidth = spessore;
      g.beginPath();
      g.moveTo(cx - ampiezza, yAng);
      g.quadraticCurveTo(cx, cy + curva * 0.9 + 2, cx + ampiezza, yAng);
      g.stroke();
    }
  };
  const denti = (ampiezza, y, h) => {
    g.fillStyle = '#F6F0E4';
    g.beginPath(); g.roundRect(cx - ampiezza * 0.78, y, ampiezza * 1.56, h, 4); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 1; i < 6; i++) g.fillRect(cx - ampiezza * 0.78 + (ampiezza * 1.56 * i) / 6, y, 1.5, h);
  };
  switch (tipo) {
    case 'neutra': labbra(W * 0.105, 0, -2, 15); break;
    case 'sorriso': labbra(W * 0.125, 0, 12, 14); break;
    case 'gioia':
      g.fillStyle = dentro;
      g.beginPath(); g.moveTo(cx - W * 0.15, cy - 8);
      g.quadraticCurveTo(cx, cy + W * 0.12, cx + W * 0.15, cy - 8);
      g.quadraticCurveTo(cx, cy - 12, cx - W * 0.15, cy - 8); g.fill();
      denti(W * 0.15, cy - 9, 15);
      g.strokeStyle = labbro; g.lineWidth = 10;
      g.beginPath(); g.moveTo(cx - W * 0.15, cy - 8); g.quadraticCurveTo(cx, cy + W * 0.12, cx + W * 0.15, cy - 8); g.stroke();
      g.fillStyle = '#C8595A'; g.beginPath(); g.ellipse(cx, cy + 24, W * 0.06, 9, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'sforzo':
      g.fillStyle = dentro; g.beginPath(); g.ellipse(cx, cy, W * 0.1, 15, 0, 0, Math.PI * 2); g.fill();
      denti(W * 0.1, cy - 12, 12);
      g.strokeStyle = labbro; g.lineWidth = 9; g.beginPath(); g.ellipse(cx, cy, W * 0.1, 15, 0, 0, Math.PI * 2); g.stroke();
      break;
    case 'o':
      g.fillStyle = dentro; g.beginPath(); g.ellipse(cx, cy + 4, 17, 25, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = labbro; g.lineWidth = 11; g.beginPath(); g.ellipse(cx, cy + 4, 17, 25, 0, 0, Math.PI * 2); g.stroke();
      break;
    case 'smorfia':
      g.fillStyle = dentro; g.beginPath(); g.roundRect(cx - W * 0.1, cy - 9, W * 0.2, 24, 8); g.fill();
      denti(W * 0.1, cy - 8, 10);
      g.strokeStyle = labbro; g.lineWidth = 8; g.beginPath(); g.roundRect(cx - W * 0.1, cy - 9, W * 0.2, 24, 8); g.stroke();
      break;
    case 'triste': labbra(W * 0.095, 0, -16, 14); break;
    case 'storta':
      g.strokeStyle = labbro; g.lineWidth = 11;
      g.beginPath(); g.moveTo(cx - W * 0.09, cy + 2); g.quadraticCurveTo(cx - W * 0.02, cy + 8, cx + W * 0.02, cy); g.quadraticCurveTo(cx + W * 0.06, cy - 6, cx + W * 0.1, cy - 4); g.stroke();
      break;
    case 'furbo':
      g.strokeStyle = labbro; g.lineWidth = 11;
      g.beginPath(); g.moveTo(cx - W * 0.08, cy + 3); g.quadraticCurveTo(cx + W * 0.02, cy + 10, cx + W * 0.12, cy - 12); g.stroke();
      break;
    case 'bacio':
      // Labbra a cuoricino in avanti, come nella foto.
      g.fillStyle = '#C46A62';
      g.beginPath(); g.ellipse(cx, cy, W * 0.075, 17, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#E39A91'; g.beginPath(); g.ellipse(cx, cy - 4, W * 0.055, 8, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = labbroScuro; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - W * 0.05, cy + 1); g.lineTo(cx + W * 0.05, cy + 1); g.stroke();
      break;
    case 'urlo':
      g.fillStyle = dentro; g.beginPath(); g.roundRect(cx - W * 0.1, cy - 8, W * 0.2, 44, 16); g.fill();
      g.fillStyle = '#C8595A'; g.beginPath(); g.ellipse(cx, cy + 28, W * 0.07, 11, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = labbro; g.lineWidth = 9; g.beginPath(); g.roundRect(cx - W * 0.1, cy - 8, W * 0.2, 44, 16); g.stroke();
      break;
    default: labbra(W * 0.09, 0, 0, 11);
  }
}

// Fianchi e retro della testa: pelle, orecchio, basette e barba in basso.
function texturaLato(eta, lato) {
  const P = ETA_VOLTO[eta];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = esa(P.pelle); g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(70,30,10,.22)'; g.beginPath(); g.ellipse(64, 62, 11, 17, 0, 0, Math.PI * 2); g.fill();   // orecchio
  g.fillStyle = esa(P.capelli); g.fillRect(0, 0, 128, 34);
  if (P.barba) {
    g.fillStyle = BARBA; g.beginPath();
    g.moveTo(lato > 0 ? 0 : 128, 46); g.lineTo(lato > 0 ? 38 : 90, 78); g.lineTo(lato > 0 ? 0 : 128, 128); g.lineTo(lato > 0 ? 128 : 0, 128); g.lineTo(lato > 0 ? 128 : 0, 80);
    g.lineTo(lato > 0 ? 128 : 0, 46); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Cubo smussato: sfera e cubo mescolati, con il mento più stretto.
function geometriaTesta() {
  const g = new THREE.BoxGeometry(1, 1, 1, 7, 7, 7);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const sfera = v.clone().multiplyScalar(2).normalize().multiplyScalar(0.5 * 1.05);
    v.lerp(sfera, 0.4);
    if (v.y < 0) v.x *= 1 - 0.14 * Math.min(1, -v.y / 0.5);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
const GEO_TESTA = geometriaTesta();

const cacheLati = new Map();
const matCapelli = new Map();
const GEO_RICCIOLO = new THREE.IcosahedronGeometry(1, 1);

// Costruisce la testa per una certa età. Restituisce il gruppo e i comandi.
export function creaTestaRoberto(eta = 'adulto') {
  const P = ETA_VOLTO[eta];
  const gruppo = new THREE.Group();
  const pelle = new THREE.MeshLambertMaterial({ color: P.pelle });
  const capelli = new THREE.MeshLambertMaterial({ color: P.capelli });
  const capelliChiari = new THREE.MeshLambertMaterial({ color: new THREE.Color(P.capelli).offsetHSL(0, 0.0, 0.025), flatShading: true });
  const barba = new THREE.MeshLambertMaterial({ color: 0x2E1D13 });
  const chiave = l => `${eta}${l}`;
  const lato = l => {
    if (!cacheLati.has(chiave(l))) cacheLati.set(chiave(l), new THREE.MeshLambertMaterial({ map: texturaLato(eta, l) }));
    return cacheLati.get(chiave(l));
  };
  const viso = new THREE.MeshLambertMaterial({ color: 0xffffff });
  // Ordine delle facce: +x, -x, +y, -y, +z, -z. Il viso guarda verso -z.
  const cranio = new THREE.Mesh(GEO_TESTA, [lato(1), lato(-1), capelli, P.barba ? barba : pelle, capelli, viso]);
  cranio.scale.set(...(P.cranio ?? [0.47, 0.5, 0.45]));
  cranio.castShadow = true;
  gruppo.add(cranio);

  // Riccioli: sfere appiattite sul cranio, folti sopra e dietro, frangia sulla fronte.
  let seme = 7;
  const r = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
  const riccioli = new THREE.Group();
  const n = P.riccioli;
  const aureo = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    // Punti ben distribuiti sulla calotta: dall'alto (y = 1) fino appena sotto l'equatore.
    const y = 1 - (i / (n - 1)) * 1.12;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const ph = i * aureo;
    const x = rr * Math.cos(ph), z = rr * Math.sin(ph);
    // Davanti (z < 0) restano solo la fascia alta, per lasciare libero il viso; ai lati sopra l'orecchio.
    if (z < -0.15 && y < 0.72) continue;
    if (Math.abs(x) > 0.6 && y < 0.2) continue;
    const raggio = P.ricciolo * (0.85 + r() * 0.35);
    const m = new THREE.Mesh(GEO_RICCIOLO, i % 3 === 0 ? capelliChiari : capelli);
    m.scale.set(raggio * 1.1, raggio, raggio * 1.05);
    m.position.set(x * 0.235, y * 0.25 + 0.01, z * 0.225);
    m.castShadow = true;
    riccioli.add(m);
  }
  // Frangia di riccioli sulla fronte (solo con i capelli abbondanti).
  if (P.barba || eta === 'bimbo') {
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(GEO_RICCIOLO, capelli);
      const k = P.ricciolo * (0.85 + r() * 0.3) * (P.frangia ?? 1);
      m.scale.set(k, k * 0.95, k);
      m.position.set(-0.19 + i * 0.076, 0.205 + r() * 0.03 - (P.frangia ? 0.02 : 0), -0.205 - r() * 0.02);
      riccioli.add(m);
    }
  }
  gruppo.add(riccioli);

  // Barba: una massa sotto il mento e sulle guance, per darle volume.
  if (P.barba) {
    const b = new THREE.Mesh(GEO_RICCIOLO, barba);
    b.scale.set(0.2, 0.1, 0.16);
    b.position.set(0, -0.2, -0.065);
    gruppo.add(b);
  }

  // Espressioni: texture create al primo uso e conservate.
  const cache = new Map();
  const faccia = (nome, chiuso) => {
    const k = `${nome}|${chiuso ? 1 : 0}`;
    if (!cache.has(k)) cache.set(k, disegnaFaccia(eta, ESPRESSIONI[nome] ?? ESPRESSIONI.neutro, chiuso));
    return cache.get(k);
  };
  const stato = { nome: 'neutro', chiuso: false, prossimoBattito: 1.5, resto: 0, testo: null };
  const applica = () => {
    viso.map = faccia(stato.nome, stato.chiuso);
    viso.needsUpdate = true;
  };
  applica();

  return {
    gruppo, cranio, riccioli, viso,
    // Cambia espressione (nome in ESPRESSIONI). Non ridisegna se è la stessa.
    imposta(nome) {
      if (!ESPRESSIONI[nome]) nome = 'neutro';
      if (stato.nome === nome) return;
      stato.nome = nome; applica();
    },
    corrente: () => stato.nome,
    // Ammicca ogni tanto: occhi chiusi per ~0.12 s.
    aggiorna(dt) {
      if (ESPRESSIONI[stato.nome].occhi === 'chiusi' || ESPRESSIONI[stato.nome].occhi === 'felici') return;
      if (stato.chiuso) {
        stato.resto -= dt;
        if (stato.resto <= 0) { stato.chiuso = false; applica(); }
      } else {
        stato.prossimoBattito -= dt;
        if (stato.prossimoBattito <= 0) {
          stato.chiuso = true; stato.resto = 0.13; stato.prossimoBattito = 2.2 + Math.random() * 3;
          applica();
        }
      }
    },
    // Prepara le texture di tutte le espressioni (evita scatti alla prima volta).
    prepara(nomi = Object.keys(ESPRESSIONI)) {
      for (const n of nomi) { faccia(n, false); if (!['chiusi', 'felici'].includes(ESPRESSIONI[n].occhi)) faccia(n, true); }
    },
  };
}
