// L'università: Via Claudio a Fuorigrotta, fuori dallo stadio Diego Armando Maradona, fino all'ingresso
// della Facoltà di Ingegneria della Federico II, e dentro il viale della facoltà.
// A sinistra lo stadio (struttura in acciaio, anelli di cemento, zoccolo ocra), auto parcheggiate a spina
// e dissuasori; a destra file di motorini sul marciapiede, la recinzione verde con la siepe e i palazzi
// della facoltà in mattoni rossi con le fasce chiare delle finestre.
//
// Gli scenari ripetuti (stadio, file di motorini e di auto, recinzioni) sono fatti di molti blocchi:
// `unisci` li fonde in una sola mesh con i colori nei vertici, così il telefono li disegna in un colpo.

import * as THREE from './lib/three.module.min.js';
import {
  materiale, blocco, cilindro, sfera, tela, esa, scritta, fronte, OSTACOLI, CUBO, creaPersona, posaCorsa, azzeraPosa,
} from './modelli.js';
import { creaAuto } from './modelli-liceo.js';

// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------

const matVertici = new THREE.MeshLambertMaterial({ vertexColors: true });
const nonIndicizzate = new WeakMap();
const senzaIndice = geo => {
  if (!geo.index) return geo;
  if (!nonIndicizzate.has(geo)) nonIndicizzate.set(geo, geo.toNonIndexed());
  return nonIndicizzate.get(geo);
};

// Fonde i blocchi a tinta unita (Lambert senza texture) in un'unica mesh; il resto resta com'è.
export function unisci(gruppo) {
  gruppo.updateMatrixWorld(true);
  const pos = [], nor = [], col = [];
  const resto = [];
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  gruppo.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    if (Array.isArray(m) || m.map || m.transparent || !m.isMeshLambertMaterial || m.vertexColors) { resto.push(o); return; }
    const geo = senzaIndice(o.geometry);
    const P = geo.attributes.position, N = geo.attributes.normal;
    nm.getNormalMatrix(o.matrixWorld);
    const c = m.color;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
    }
  });
  const g = new THREE.Group();
  if (pos.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, matVertici);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  for (const o of resto) {
    const k = new THREE.Mesh(o.geometry, o.material);
    o.matrixWorld.decompose(k.position, k.quaternion, k.scale);
    k.castShadow = o.castShadow; k.receiveShadow = o.receiveShadow; k.renderOrder = o.renderOrder;
    g.add(k);
  }
  return g;
}

// Ogni modello si costruisce e si fonde una volta sola; le copie condividono geometria e materiali.
const modelli = new Map();
function modello(chiave, costruisci) {
  if (!modelli.has(chiave)) modelli.set(chiave, unisci(costruisci()));
  return modelli.get(chiave).clone();
}

// Trave tra due punti [x, y, z], di sezione quadrata `s`.
const ASSE_Y = new THREE.Vector3(0, 1, 0);
function trave(a, b, s, col) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const m = new THREE.Mesh(CUBO, materiale(col));
  m.scale.set(s, d.length(), s);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(ASSE_Y, d.normalize());
  m.castShadow = true;
  return m;
}

// Generatore pseudo-casuale fisso, così i modelli in cache sono sempre uguali.
function semeCasuale(s) {
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// ---------------------------------------------------------------------------
// Texture
// ---------------------------------------------------------------------------

// Facciata dei palazzi della facoltà: pilastri in mattoni rossi e fasce chiare con le finestre a nastro.
// Un riquadro = una campata di 3 m per un piano di 3,3 m.
const texFacolta = tela(128, 128, (g, W, H) => {
  g.fillStyle = '#A85B3F'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(70,30,20,.28)';
  for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 1);
  for (let y = 0, r = 0; y < H; y += 6, r++) for (let x = (r % 2) * 8; x < W; x += 16) g.fillRect(x, y, 1, 6);
  // Fascia chiara (marcapiano) e finestra a nastro.
  g.fillStyle = '#ECE6D8'; g.fillRect(18, 22, W - 18, 78);
  g.fillStyle = '#D9D1BF'; g.fillRect(18, 92, W - 18, 8);
  g.fillStyle = '#5E7889'; g.fillRect(26, 34, W - 34, 46);
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(30, 36, 18, 42); g.fillRect(84, 36, 12, 42);
  g.fillStyle = '#ECE6D8';
  for (const x of [26 + (W - 34) / 3, 26 + (2 * (W - 34)) / 3]) g.fillRect(x - 2, 34, 4, 46);
  g.fillRect(26, 56, W - 34, 3);
  // Tapparelle mezze abbassate qua e là.
  g.fillStyle = '#C9C2B2'; g.fillRect(26 + (W - 34) / 3 + 2, 34, (W - 34) / 3 - 4, 18);
});
texFacolta.wrapS = texFacolta.wrapT = THREE.RepeatWrapping;

// Zoccolo dello stadio: pannelli ocra con i cartelli blu degli ingressi e la base grigia.
const texZoccolo = tela(256, 64, (g, W, H) => {
  g.fillStyle = '#DCC07A'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(120,90,40,.25)';
  for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 2, H - 12);
  g.fillStyle = '#9C978D'; g.fillRect(0, H - 12, W, 12);
  g.fillStyle = '#2E5EA6'; g.fillRect(40, 14, 56, 18); g.fillRect(168, 14, 30, 18);
  g.fillStyle = '#ffffff'; g.fillRect(46, 20, 30, 3); g.fillRect(46, 26, 20, 2); g.fillRect(174, 20, 18, 6);
});
texZoccolo.wrapS = THREE.RepeatWrapping;

// Asta della sbarra del parcheggio, a strisce bianche e rosse.
const texSbarra = tela(128, 16, (g, W, H) => {
  for (let x = 0; x < W; x += 32) {
    g.fillStyle = '#E8392E'; g.fillRect(x, 0, 16, H);
    g.fillStyle = '#ffffff'; g.fillRect(x + 16, 0, 16, H);
  }
});
texSbarra.wrapS = THREE.RepeatWrapping;

// Tenda a righe della bancarella.
const texTenda = tela(128, 64, (g, W, H) => {
  for (let x = 0; x < W; x += 16) {
    g.fillStyle = '#F4F4F2'; g.fillRect(x, 0, 8, H);
    g.fillStyle = '#7F8A93'; g.fillRect(x + 8, 0, 8, H);
  }
});

// L'insegna dell'ingresso: cartello blu con la scritta "Università degli Studi Federico II di Napoli"
// in lettere di bronzo, su due righe, e la cornice scura.
const texInsegna = tela(2048, 224, (g, W, H) => {
  g.fillStyle = '#2D5F9E'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(10,30,60,.25)';
  for (let y = 18; y < H; y += 26) g.fillRect(0, y, W, 3);
  g.strokeStyle = '#1C2A3A'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const riga = (t, y, px) => {
    g.font = `700 ${px}px Georgia, "Times New Roman", serif`;
    g.lineWidth = 10; g.strokeStyle = '#2A2112'; g.strokeText(t, W / 2, y, W - 120);
    g.fillStyle = '#E2BE62'; g.fillText(t, W / 2, y, W - 120);
  };
  riga('UNIVERSITÀ  DEGLI  STUDI', 70, 92);
  riga('FEDERICO  II  DI  NAPOLI', 166, 80);
});

// ---------------------------------------------------------------------------
// Lo stadio Maradona (lato sinistro): un pezzo lungo 12 m, ripetuto lungo la strada
// ---------------------------------------------------------------------------

const ACCIAIO = 0x9EA4AA, ACCIAIO_SC = 0x7B8188, CEMENTO = 0xC4BFB3, CEMENTO_SC = 0x8E8A82;
export const LUNGO_STADIO = 12;

function costruisciStadio() {
  const g = new THREE.Group();
  const L = LUNGO_STADIO + 0.05, h = L / 2;
  // Recinzione davanti: paletti e due corrimano.
  for (let z = -h; z < h; z += 1.5) g.add(blocco(0.08, 1.7, 0.08, 0x66736C, -12.4, 0, z));
  g.add(blocco(0.06, 0.06, L, 0x66736C, -12.4, 1.62, 0));
  g.add(blocco(0.05, 0.05, L, 0x66736C, -12.4, 0.85, 0));
  // Zoccolo ocra con i cartelli degli ingressi.
  const matZ = new THREE.MeshLambertMaterial({ map: texZoccolo.clone() });
  matZ.map.needsUpdate = true; matZ.map.repeat.set(L / 8, 1);
  const zoccolo = new THREE.Mesh(CUBO, [matZ, matZ, materiale(CEMENTO_SC), materiale(CEMENTO_SC), materiale(CEMENTO), materiale(CEMENTO)]);
  zoccolo.scale.set(0.5, 2.8, L); zoccolo.position.set(-14.3, 1.4, 0); zoccolo.receiveShadow = true;
  g.add(zoccolo);
  // Primo anello: massa di cemento con la fascia scura delle aperture.
  g.add(blocco(6.4, 7, L, CEMENTO, -17.8, 0));
  g.add(blocco(0.1, 1.1, L, 0x4E4B46, -14.62, 4.4));
  g.add(blocco(0.12, 0.3, L, 0xE3DED2, -14.63, 6.7));
  // Secondo anello: la gradinata vista da sotto, inclinata, con le nervature.
  const piano = trave([-15, 7.6, 0], [-34, 25.5, 0], 1, CEMENTO);
  piano.scale.set(0.9, piano.scale.y, L);
  g.add(piano);
  for (let z = -h + 1.5; z < h; z += 3) {
    const n = trave([-15.4, 7.0, z], [-34.4, 24.9, z], 0.4, CEMENTO_SC);
    n.scale.x = 1.1;
    g.add(n);
  }
  g.add(blocco(8, 3, L, CEMENTO, -36, 23));        // corona in cima
  // Struttura in acciaio: colonna reticolare, travi lungo la strada, croci di controvento, copertura.
  const X1 = -12.9, X2 = -15.4;
  for (const x of [X1, X2]) g.add(blocco(0.45, 31, 0.45, ACCIAIO, x, 0, 0));
  for (let y = 3; y < 31; y += 3.4) {
    g.add(trave([X1, y, 0], [X2, y, 0], 0.18, ACCIAIO_SC));
    g.add(trave([X1, y, 0], [X2, y + 3.4, 0], 0.14, ACCIAIO_SC));
  }
  for (const y of [17, 23.5, 30.5]) g.add(blocco(0.4, 0.5, L, ACCIAIO, X1, y, 0));
  g.add(trave([X1, 17.2, -h], [X1, 23.5, h], 0.22, ACCIAIO_SC));
  g.add(trave([X1, 17.2, h], [X1, 23.5, -h], 0.22, ACCIAIO_SC));
  g.add(trave([X1, 23.7, -h], [X1, 30.5, h], 0.22, ACCIAIO_SC));
  g.add(trave([X1, 23.7, h], [X1, 30.5, -h], 0.22, ACCIAIO_SC));
  // Copertura: sporge verso la strada, con le capriate.
  const tetto = trave([-10.5, 31.2, 0], [-38, 33.4, 0], 1, 0xD9DCDF);
  tetto.scale.set(0.35, tetto.scale.y, L);
  g.add(tetto);
  g.add(trave([-10.5, 30.6, 0], [-30, 33, 0], 0.35, ACCIAIO_SC));
  g.add(trave([X1, 30.5, 0], [-10.5, 31.0, 0], 0.3, ACCIAIO_SC));
  return g;
}

export function creaStadio() {
  return modello('stadio', costruisciStadio);
}

// ---------------------------------------------------------------------------
// Auto, motorini, recinzioni
// ---------------------------------------------------------------------------

// Auto parcheggiate a spina di pesce tra la strada e lo stadio, con i dissuasori dietro.
function costruisciAutoSpina(v) {
  const g = new THREE.Group();
  const r = semeCasuale(31 + v * 7);
  for (let i = 0; i < 5; i++) {
    if (r() < 0.12) continue;
    const a = creaAuto({ var: Math.floor(r() * 8) });
    a.rotation.y = Math.PI / 2 - 0.35;
    a.position.set(-8.6, 0, -4.8 + i * 2.4);
    g.add(a);
  }
  for (let z = -5.6; z < 6; z += 1.6) g.add(cilindro(0.12, 0.75, 0x8E7B62, -11.3, 0, z));
  return g;
}
export function creaAutoSpina(v = 0) {
  return modello(`autoSpina${v % 3}`, () => costruisciAutoSpina(v % 3));
}

// Auto parcheggiate in fila lungo il marciapiede (viale della facoltà).
function costruisciAutoFila(v, lato) {
  const g = new THREE.Group();
  const r = semeCasuale(57 + v * 13);
  for (let i = 0; i < 2; i++) {
    if (r() < 0.2) continue;
    const a = creaAuto({ var: Math.floor(r() * 8) });
    a.position.set(lato * 5.0, 0.12, -2.6 + i * 5.2);
    g.add(a);
  }
  return g;
}
export function creaAutoFila(v = 0, lato = 1) {
  return modello(`autoFila${v % 3}${lato}`, () => costruisciAutoFila(v % 3, lato));
}

// Motorino con i colori dati, lungo 1,6 m sull'asse z (davanti verso -z).
const COLORI_SCOOTER = [0xF2F2F2, 0x1C1D22, 0x9AA3AD, 0xF2F2F2, 0xC7372F, 0x2F5F9E, 0x1C1D22, 0xE9E4D8];
function scooter(col) {
  const g = new THREE.Group();
  const nero = 0x1C1D2B, grigio = 0x9AA3AD;
  for (const z of [-0.6, 0.58]) {
    const w = cilindro(0.23, 0.12, nero, 0, 0, z);
    w.rotation.z = Math.PI / 2; w.position.y = 0.23;
    g.add(w);
  }
  g.add(blocco(0.34, 0.1, 0.8, nero, 0, 0.28, 0.05));
  g.add(blocco(0.48, 0.4, 0.6, col, 0, 0.34, 0.4));
  g.add(blocco(0.38, 0.13, 0.6, nero, 0, 0.74, 0.34));
  g.add(blocco(0.44, 0.7, 0.12, col, 0, 0.28, -0.42));
  g.add(blocco(0.07, 0.48, 0.07, grigio, 0, 0.94, -0.45));
  g.add(blocco(0.66, 0.06, 0.06, nero, 0, 1.4, -0.45));
  g.add(blocco(0.18, 0.12, 0.08, 0xF7F4E6, 0, 1.26, -0.5));
  return g;
}

// Fila di motorini parcheggiati di traverso sul marciapiede (8 m), qualche bauletto.
function costruisciMotorini(v, lato, x0, file) {
  const g = new THREE.Group();
  const r = semeCasuale(101 + v * 17 + file * 3);
  for (let f = 0; f < file; f++) {
    for (let z = -3.6; z < 4; z += 0.95) {
      if (r() < 0.15) continue;
      const s = scooter(COLORI_SCOOTER[Math.floor(r() * COLORI_SCOOTER.length)]);
      if (r() < 0.4) s.add(blocco(0.4, 0.32, 0.4, r() < 0.5 ? 0x1C1D22 : 0xEDEDED, 0, 0.86, 0.5));
      s.rotation.y = lato * Math.PI / 2 + 0.55 + (r() - 0.5) * 0.3;     // di sbieco, come si parcheggia
      s.position.set(lato * (x0 + f * 1.9 + (r() - 0.5) * 0.2), 0, z);
      g.add(s);
    }
  }
  return g;
}
// x0: distanza dal centro della strada della prima fila; `file` file una dietro l'altra.
export function creaMotorini(v = 0, lato = 1, x0 = 4.6, file = 1) {
  return modello(`moto${v % 4}${lato}${x0}${file}`, () => costruisciMotorini(v % 4, lato, x0, file));
}

// Recinzione verde della facoltà con la siepe dietro (12 m), a distanza x dalla strada.
function costruisciRecinzione(lato, x) {
  const g = new THREE.Group();
  const L = 12.05, h = L / 2, VERDE = 0x2E6648;
  g.add(blocco(0.35, 0.45, L, 0xC9C3B6, lato * x, 0, 0));
  for (let z = -h; z < h; z += 0.22) g.add(blocco(0.04, 1.8, 0.04, VERDE, lato * x, 0.45, z));
  for (let z = -h; z < h; z += 2.4) g.add(blocco(0.1, 2.0, 0.1, VERDE, lato * x, 0.45, z));
  g.add(blocco(0.08, 0.08, L, VERDE, lato * x, 2.2, 0));
  g.add(blocco(0.06, 0.06, L, VERDE, lato * x, 0.6, 0));
  const r = semeCasuale(lato > 0 ? 7 : 11);
  for (let z = -h; z < h; z += 2) {
    g.add(blocco(1.2, 2.3 + r() * 0.5, 2.2, r() < 0.5 ? 0x4C7A33 : 0x426E2D, lato * (x + 0.85), 0, z + 1));
  }
  return g;
}
export function creaRecinzione(lato = 1, x = 9.6) {
  return modello(`recinto${lato}${x}`, () => costruisciRecinzione(lato, x));
}

// Albero dalle foglie rosso scuro (i pruni davanti alla facoltà) o verde.
export function creaAlberoFacolta(rosso, scala = 1) {
  const g = modello(`albero${rosso ? 1 : 0}`, () => {
    const k = new THREE.Group();
    k.add(cilindro(0.18, 2.4, 0x5A4030));
    const col = rosso ? 0x6A3446 : 0x4E7D3A;
    for (const [x, y, z, s] of [[0, 3.4, 0, 1.5], [0.7, 3.0, 0.3, 1.0], [-0.6, 3.1, -0.4, 1.05], [0.1, 4.2, -0.2, 1.0]]) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), materiale(col, { flatShading: true }));
      c.position.set(x, y, z); c.castShadow = true;
      k.add(c);
    }
    return k;
  });
  g.scale.setScalar(scala);
  return g;
}

// Lampione alto verde, come quello davanti all'ingresso.
export function creaLampioneVerde(lato = 1) {
  const g = modello('lampVerde', () => {
    const k = new THREE.Group();
    const V = 0x2F5E43;
    k.add(cilindro(0.11, 9, V));
    k.add(blocco(1.2, 0.1, 0.1, V, -0.5, 8.9));
    k.add(blocco(0.55, 0.22, 0.32, 0x2B2F33, -1.05, 8.75));
    k.add(blocco(0.4, 0.5, 0.3, 0xEFEDE6, 0.05, 6.6));
    return k;
  });
  g.position.x = lato * 3.9;
  g.rotation.y = lato > 0 ? 0 : Math.PI;
  return g;
}

// ---------------------------------------------------------------------------
// Palazzi della facoltà
// ---------------------------------------------------------------------------

// Palazzo in mattoni con le fasce chiare: e.larghezza lungo x, e.profondita lungo la strada, e.altezza.
export function creaPalazzoFacolta(e) {
  const g = new THREE.Group();
  const fronte = texFacolta.clone(); fronte.needsUpdate = true;
  fronte.repeat.set(Math.max(1, Math.round(e.profondita / 3)), Math.max(1, Math.round(e.altezza / 3.3)));
  const lato = texFacolta.clone(); lato.needsUpdate = true;
  lato.repeat.set(Math.max(1, Math.round(e.larghezza / 3)), Math.max(1, Math.round(e.altezza / 3.3)));
  const mF = new THREE.MeshLambertMaterial({ map: fronte }), mL = new THREE.MeshLambertMaterial({ map: lato });
  const tetto = materiale(0x7C776F);
  // +x, -x, +y, -y, +z, -z: verso la strada c'è la faccia ±x.
  const m = new THREE.Mesh(CUBO, [mF, mF, tetto, tetto, mL, mL]);
  m.scale.set(e.larghezza, e.altezza, e.profondita);
  m.position.y = e.altezza / 2;
  m.receiveShadow = true; m.castShadow = true;
  g.add(m);
  g.add(blocco(e.larghezza + 0.2, 0.45, e.profondita + 0.2, 0xE4DED0, 0, e.altezza));
  g.add(blocco(e.larghezza + 0.1, 0.9, e.profondita + 0.1, 0x7E3F2C, 0, 0));
  // Sul tetto: un volume tecnico e qualche condizionatore.
  if (e.altezza > 10) g.add(blocco(Math.min(4, e.larghezza * 0.4), 2.2, Math.min(5, e.profondita * 0.4), 0xE8E2D4, 0, e.altezza + 0.4));
  g.position.x = e.lato * (e.distanza + e.larghezza / 2);
  return g;
}

// ---------------------------------------------------------------------------
// Il furgone dei panini, la bancarella, la targa di Via Claudio
// ---------------------------------------------------------------------------

export function creaFurgonePanini(lato = 1) {
  const g = modello('panini', () => {
    const k = new THREE.Group();
    k.add(blocco(2.1, 2.3, 4.2, 0xF4F4F2, 0, 0.5, 0.6));
    k.add(blocco(2.0, 1.5, 1.5, 0xF4F4F2, 0, 0.5, -2.2));
    k.add(blocco(1.9, 0.6, 0.06, 0x2A3644, 0, 1.3, -2.97));
    k.add(blocco(2.12, 0.18, 4.2, 0x2F6DB5, 0, 1.8, 0.6));
    for (const z of [-2.0, 1.8]) for (const x of [-0.95, 0.95]) {
      const w = cilindro(0.38, 0.25, 0x15181D, x, 0, z);
      w.rotation.z = Math.PI / 2; w.position.y = 0.38; k.add(w);
    }
    // Gazebo blu dietro al furgone, con il banco dei panini.
    k.add(blocco(3.0, 0.25, 3.2, 0x2F7DD1, 0.2, 2.6, 5.0));
    for (const [x, z] of [[-1.2, 3.5], [1.6, 3.5], [-1.2, 6.5], [1.6, 6.5]]) k.add(blocco(0.06, 2.6, 0.06, 0xDDDDDD, x, 0, z));
    k.add(blocco(2.4, 0.9, 0.7, 0xE8E2D4, 0.2, 0, 4.0));
    return k;
  });
  g.position.x = lato * 7.9;
  if (lato < 0) g.rotation.y = Math.PI;
  return g;
}

export function creaBancarella(lato = 1) {
  const g = new THREE.Group();
  g.add(modello('bancarella', () => {
    const k = new THREE.Group();
    k.add(blocco(3.0, 0.9, 1.4, 0x8C6A4A, 0, 0));
    for (const [x, z] of [[-1.5, -0.8], [1.5, -0.8], [-1.5, 1.2], [1.5, 1.2]]) k.add(blocco(0.06, 2.4, 0.06, 0x888888, x, 0, z));
    for (let i = 0; i < 6; i++) k.add(blocco(0.35, 0.25, 0.35, [0xE0533F, 0xF2C14E, 0x4CAF6A][i % 3], -1.1 + i * 0.44, 0.9, -0.2));
    return k;
  }));
  const tenda = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshLambertMaterial({ map: texTenda, side: THREE.DoubleSide }));
  tenda.rotation.x = -Math.PI / 2 + 0.3; tenda.position.set(0, 2.55, 0.1);
  g.add(tenda);
  g.position.x = lato * 9.5;
  g.rotation.y = lato > 0 ? -Math.PI / 2 : Math.PI / 2;
  return g;
}

export function creaTargaVia(lato = 1) {
  const g = new THREE.Group();
  g.add(cilindro(0.05, 2.6, 0x5A5F66));
  const t = scritta('Via Claudio', 1.5, 0.38, 0xF4F1E8, 0x1C1D2B);
  t.position.set(0, 2.45, 0);
  t.rotation.y = -lato * Math.PI / 2;
  g.add(t);
  const r = t.clone(); r.rotation.y += Math.PI; g.add(r);
  g.position.x = lato * 6.0;
  return g;
}

// ---------------------------------------------------------------------------
// L'ingresso della Facoltà di Ingegneria
// ---------------------------------------------------------------------------

// Il portale con l'insegna azzurra su due pilastri scuri, i cancelli verdi aperti, la recinzione con la
// siepe; a sinistra la casetta in mattoni del custode e il palazzo alto, a destra il palazzo basso e la
// torre bianca. Il percorso passa in mezzo ai pilastri (x = ±4,1).
export function creaIngressoFacolta() {
  const g = new THREE.Group();
  g.add(modello('ingresso', () => {
    const k = new THREE.Group();
    const SCURO = 0x2B2F33, VERDE = 0x2E6648, MATTONE = 0xA35A3E;
    // Pilastri e trave sotto l'insegna.
    for (const x of [-4.1, 4.1]) k.add(blocco(0.5, 5.0, 0.5, SCURO, x, 0, 0));
    k.add(blocco(14.6, 0.25, 1.2, SCURO, -0.9, 4.95, 0));
    k.add(blocco(14.9, 0.18, 1.5, 0x9C4A34, -0.9, 6.85, 0));              // tettuccio rosso
    // Cancelli scorrevoli aperti, accostati alla recinzione.
    for (const s of [-1, 1]) {
      k.add(blocco(0.12, 2.3, 0.2, VERDE, s * 4.5, 0, -0.3));
      for (let x = 4.6; x < 9.2; x += 0.2) k.add(blocco(0.04, 2.0, 0.04, VERDE, s * x, 0.15, -0.4));
      k.add(blocco(4.6, 0.1, 0.08, VERDE, s * 6.9, 2.1, -0.4));
      k.add(blocco(4.6, 0.1, 0.08, VERDE, s * 6.9, 0.2, -0.4));
      // Recinzione fissa e siepe fino ai palazzi.
      k.add(blocco(8, 0.45, 0.35, 0xC9C3B6, s * 13.2, 0, -0.2));
      for (let x = 9.3; x < 17.2; x += 0.22) k.add(blocco(0.04, 1.8, 0.04, VERDE, s * x, 0.45, -0.2));
      k.add(blocco(8, 0.08, 0.08, VERDE, s * 13.2, 2.2, -0.2));
      k.add(blocco(8, 2.7, 1.3, 0x4C7A33, s * 13.2, 0, -1.2));
    }
    // Casetta del custode in mattoni, a sinistra, con i condizionatori sul tetto.
    k.add(blocco(9, 3.6, 7, MATTONE, -10.2, 0, 1.0));
    k.add(blocco(9.3, 0.3, 7.3, 0xD7CFBF, -10.2, 3.6, 1.0));
    for (const x of [-12.5, -8.5]) k.add(blocco(0.9, 0.6, 0.5, 0xE8E8E8, x, 3.9, 2.5));
    k.add(blocco(0.05, 2.2, 1.6, 0x3C4650, -5.68, 0.3, 2.6));
    // Palazzo basso in mattoni a destra.
    k.add(blocco(16, 8.5, 12, MATTONE, 17.5, 0, -8));
    k.add(blocco(16.3, 0.4, 12.3, 0x3D6FB6, 17.5, 8.5, -8));               // cornicione blu
    // Il viale oltre il cancello: muretti bassi ai lati.
    for (const s of [-1, 1]) k.add(blocco(0.3, 0.5, 14, 0xC9C3B6, s * 4.4, 0, -8));
    return k;
  }));
  // Insegna (texture) su entrambi i lati.
  const matI = new THREE.MeshLambertMaterial({ map: texInsegna });
  const insegna = new THREE.Mesh(CUBO, [materiale(0x2D5F9E), materiale(0x2D5F9E), materiale(0x2D5F9E), materiale(0x1F3F69), matI, matI]);
  insegna.scale.set(14.6, 1.6, 0.35);
  insegna.position.set(-0.9, 6.0, 0);
  insegna.castShadow = true;
  g.add(insegna);
  // Il civico "3" sulla casetta.
  const civico = scritta('3', 0.4, 0.4, 0xffffff, 0x1C1D2B);
  civico.position.set(-5.69, 2.6, 0.2); civico.rotation.y = Math.PI / 2;
  g.add(civico);
  // Palazzi alti dietro: a sinistra mattoni e fasce chiare, a destra la torre bianca.
  const alto = creaPalazzoFacolta({ larghezza: 14, profondita: 18, altezza: 23, lato: -1, distanza: 7 });
  alto.position.z = -16;
  g.add(alto);
  const torre = new THREE.Group();
  torre.add(blocco(7, 21, 7, 0xE7E2D6, 0, 0));
  for (let y = 2; y < 20; y += 3.3) torre.add(blocco(7.05, 0.5, 1.6, 0xC9C2B2, 0, y, -2));
  torre.position.set(9.5, 0, -24);
  g.add(unisci(torre));
  return g;
}

// ---------------------------------------------------------------------------
// Ostacoli di Via Claudio (triennale) e del viale della facoltà (magistrale)
// ---------------------------------------------------------------------------

// Barriere new jersey di plastica rossa, due di traverso nella corsia: si saltano.
function jersey() {
  return modello('jersey', () => {
    const k = new THREE.Group();
    const R = 0xE5533B, R2 = 0xC9432E;
    for (const x of [-0.5, 0.5]) {
      k.add(blocco(0.95, 0.22, 0.62, R2, x, 0));
      k.add(blocco(0.92, 0.32, 0.44, R, x, 0.22));
      k.add(blocco(0.9, 0.22, 0.28, R, x, 0.54));
      k.add(blocco(0.3, 0.06, 0.06, 0xF2F2F2, x, 0.6, -0.15));
    }
    return k;
  });
}

// Sbarra del parcheggio a strisce: si passa sotto.
function sbarra() {
  const g = new THREE.Group();
  g.add(modello('sbarraPalo', () => {
    const k = new THREE.Group();
    k.add(blocco(0.32, 1.15, 0.32, 0xE8E2D4, -1.0, 0));
    k.add(blocco(0.36, 0.22, 0.36, 0xE8392E, -1.0, 1.15));
    k.add(blocco(0.1, 1.3, 0.1, 0x8A8F96, 1.02, 0));
    return k;
  }));
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 10), new THREE.MeshLambertMaterial({ map: texSbarra }));
  asta.material.map.repeat.set(1, 1);
  asta.rotation.z = Math.PI / 2;
  asta.position.set(0.1, 1.33, 0);
  asta.castShadow = true;
  g.add(asta);
  return g;
}

// Striscione dei tifosi del Napoli tra due pali: si passa sotto.
function striscione() {
  const g = new THREE.Group();
  for (const x of [-1.0, 1.0]) g.add(cilindro(0.05, 2.7, 0xDDDDDD, x));
  const telo = scritta('FORZA NAPOLI', 2.1, 0.8, 0x2E8BD8, 0xffffff);
  telo.position.set(0, 1.75, 0);
  g.add(telo);
  const retro = telo.clone(); retro.rotation.y = Math.PI; retro.position.z = -0.01;
  g.add(retro);
  return g;
}

// Auto in doppia fila nella corsia (o il furgone): si cambia corsia.
function autoInCorsia(e) {
  return creaAuto({ var: (e.var ?? 0) + 2 });
}

// Bidoni carrellati verdi della raccolta (viale della facoltà): si saltano.
function bidoni() {
  return modello('bidoni', () => {
    const k = new THREE.Group();
    for (const x of [-0.5, 0.5]) {
      k.add(blocco(0.72, 0.72, 0.62, 0x2F7D46, x, 0.02));
      k.add(blocco(0.78, 0.08, 0.68, 0x24603A, x, 0.74));
      for (const s of [-1, 1]) { const w = cilindro(0.08, 0.05, 0x1C1D22, x + s * 0.3, 0, 0.3); w.rotation.z = Math.PI / 2; w.position.y = 0.08; k.add(w); }
    }
    return k;
  });
}

// Fila di auto parcheggiate nei corridoi di corsie.
function autoInFila(p, e) {
  const g = new THREE.Group();
  const n = Math.max(1, Math.round(p / 4.6));
  const passo = p / n;
  for (let i = 0; i < n; i++) {
    const a = creaAuto({ var: (e.var ?? 0) + i * 3 + Math.floor(e.d) });
    a.position.z = -p / 2 + passo * (i + 0.5);
    g.add(a);
  }
  return g;
}

OSTACOLI.triennale = {
  proprio: true,
  basso: () => jersey(),
  alto: (p, e) => ((e.var ?? 0) % 3 === 0 ? striscione() : sbarra()),
  muro: (p, e) => (e.lungo || p > 4.5 ? autoInFila(p, e) : autoInCorsia(e)),
};
OSTACOLI.magistrale = {
  proprio: true,
  basso: (p, e) => ((e.var ?? 0) % 2 ? bidoni() : jersey()),
  alto: () => sbarra(),
  muro: (p, e) => (e.lungo || p > 4.5 ? autoInFila(p, e) : autoInCorsia(e)),
};

// ---------------------------------------------------------------------------
// Il parcheggiatore abusivo
// ---------------------------------------------------------------------------

// Volto trasandato: barba ispida grigia, occhiaie, sopracciglia arruffate, naso rosso, sorriso con un
// dente mancante. In alto la fascia del berretto di lana.
function voltoParcheggiatore() {
  return tela(256, 256, (g) => {
    g.fillStyle = '#B9835F'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#3B4652'; g.fillRect(0, 0, 256, 44);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 38, 256, 6);
    // Rughe sulla fronte.
    g.strokeStyle = 'rgba(90,50,30,.45)'; g.lineWidth = 3;
    for (const y of [58, 68]) { g.beginPath(); g.moveTo(80, y); g.quadraticCurveTo(128, y - 6, 176, y); g.stroke(); }
    // Sopracciglia folte e storte.
    g.fillStyle = '#4A4440';
    g.save(); g.translate(82, 88); g.rotate(0.12); g.fillRect(-30, -6, 60, 12); g.restore();
    g.save(); g.translate(174, 84); g.rotate(-0.2); g.fillRect(-30, -6, 60, 12); g.restore();
    // Occhi piccoli e stanchi, con le occhiaie.
    for (const x of [84, 172]) {
      g.fillStyle = 'rgba(80,40,40,.35)'; g.beginPath(); g.ellipse(x, 126, 24, 10, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#F2EEE6'; g.beginPath(); g.ellipse(x, 112, 18, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3A2A1E'; g.beginPath(); g.arc(x + 2, 113, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#B9835F'; g.fillRect(x - 20, 100, 40, 8);                 // palpebra calante
    }
    // Naso grosso e arrossato.
    g.fillStyle = 'rgba(120,60,40,.25)'; g.fillRect(116, 116, 12, 44);
    g.fillStyle = '#C8705A'; g.beginPath(); g.ellipse(128, 160, 20, 14, 0, 0, Math.PI * 2); g.fill();
    // Barba ispida grigia: puntini fitti su mascella, mento e baffi.
    let s = 3;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 1400; i++) {
      const x = r() * 256, y = 150 + r() * 106;
      const dentro = y > 180 || x < 70 || x > 186 || (y > 168 && Math.abs(x - 128) < 50);
      if (!dentro) continue;
      g.fillStyle = r() < 0.5 ? 'rgba(70,66,62,.75)' : 'rgba(150,146,140,.7)';
      g.fillRect(x, y, 3, 3);
    }
    // Bocca storta con un dente mancante.
    g.fillStyle = '#5A2A22'; g.beginPath(); g.moveTo(92, 200); g.quadraticCurveTo(130, 222, 168, 194); g.lineTo(166, 202); g.quadraticCurveTo(130, 230, 94, 206); g.fill();
    g.fillStyle = '#E8DFC4'; g.fillRect(108, 203, 46, 7);
    g.fillStyle = '#5A2A22'; g.fillRect(126, 203, 9, 8);
  });
}

// Il parcheggiatore guarda verso +z (verso il giocatore). Giubbotto sformato e macchiato, tuta, berretto.
export function creaParcheggiatore(v = 0) {
  const giubbotto = [0x6B5B3E, 0x4F5A3C, 0x5A4A44][v % 3];
  const p = creaPersona({
    pelle: 0xB9835F, capelli: 0x3B4652, maglia: giubbotto, pantaloni: 0x4A4F58, scarpe: 0x3B3530,
    corpulenza: 1.14, volto: voltoParcheggiatore(),
  });
  // Berretto di lana con il risvolto e ciuffi grigi che escono ai lati.
  p.testa.add(blocco(0.5, 0.2, 0.5, 0x3B4652, 0, 0.17));
  p.testa.add(blocco(0.52, 0.08, 0.52, 0x2E3742, 0, 0.15));
  for (const s of [-1, 1]) p.testa.add(blocco(0.06, 0.12, 0.14, 0x8C8780, s * 0.24, 0.06, 0.08));
  // Maglia sporca che esce dal giubbotto aperto, macchie e una toppa.
  p.superiore.add(blocco(0.22, 0.62, 0.02, 0xBDB59C, 0, 1.0, -0.172));
  p.superiore.add(blocco(0.1, 0.08, 0.02, 0x7C6A4C, 0.04, 1.2, -0.184));
  p.superiore.add(blocco(0.14, 0.12, 0.02, 0x3E3524, -0.2, 1.3, -0.176));
  p.superiore.add(blocco(0.12, 0.1, 0.02, 0x8F7A55, 0.21, 1.05, 0.176));
  // Le monete nella mano tesa.
  const monete = new THREE.Group();
  for (const [x, z] of [[0, 0], [0.04, 0.03], [-0.03, 0.02]]) {
    const m = cilindro(0.035, 0.012, 0xD4AF37, x, -0.47, z - 0.05);
    monete.add(m);
  }
  p.braccia[1].gomito.add(monete);
  p.radice.scale.setScalar(0.8);
  const g = new THREE.Group();
  p.radice.rotation.y = Math.PI;
  g.add(p.radice);
  // `stato`: 0 fermo a lato, 1 ti viene incontro con la mano tesa. `passo` avanza mentre cammina.
  g.userData.anima = (t, stato, passo) => {
    azzeraPosa(p);
    if (stato > 0) posaCorsa(p, passo, 0.35);
    else {
      // Fermo: fa segno alle auto di venire avanti, con il braccio.
      p.braccia[0].spalla.rotation.x = -1.2 - 0.5 * Math.sin(t * 6);
      p.braccia[0].gomito.rotation.x = -0.6;
    }
    // Mano destra tesa verso Roberto, palmo in su, e la testa che si sporge.
    const k = Math.min(1, stato * 1.2);
    p.braccia[1].spalla.rotation.x = THREE.MathUtils.lerp(p.braccia[1].spalla.rotation.x, -1.35, k);
    p.braccia[1].gomito.rotation.x = THREE.MathUtils.lerp(p.braccia[1].gomito.rotation.x, -0.15, k);
    p.testa.rotation.x = 0.12 * k;
    p.superiore.rotation.x = 0.12 * k;
  };
  return g;
}

// ---------------------------------------------------------------------------
// Roberto all'università: più snello, camicia azzurra con le maniche arrotolate, jeans scuri,
// sneakers bianche e zaino grigio scuro (vedi ETA_ROBERTO.universita in modelli.js).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Scenografia: un'entità `genere: 'uni'` con il suo `tipo` (vedi livello.js)
// ---------------------------------------------------------------------------

export function creaScenaUni(e) {
  let m;
  switch (e.tipo) {
    case 'stadio': return creaStadio();
    case 'autoSpina': return creaAutoSpina(e.var);
    case 'autoFila': return creaAutoFila(e.var, e.lato);
    case 'motorini': return creaMotorini(e.var, e.lato, e.x0 ?? 4.6, e.file ?? 1);
    case 'recinzione': return creaRecinzione(e.lato, e.x ?? 9.6);
    case 'palazzo': return creaPalazzoFacolta(e);
    case 'panini': return creaFurgonePanini(e.lato);
    case 'bancarella': return creaBancarella(e.lato);
    case 'targa': return creaTargaVia(e.lato);
    case 'lampione': return creaLampioneVerde(e.lato);
    case 'ingresso': return creaIngressoFacolta();
    case 'jersey':
      m = jersey();
      m.position.x = e.lato * e.x; m.rotation.y = Math.PI / 2;
      return m;
    case 'albero':
      m = creaAlberoFacolta(e.rosso, e.scala ?? 1);
      m.position.x = e.lato * e.x;
      return m;
    default: return new THREE.Group();
  }
}
