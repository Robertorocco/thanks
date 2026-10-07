// Modelli del mondo del liceo: strada in salita, la scuola in lontananza, gli interni.
// Tutti i modelli guardano verso -z (avanti); chi arriva incontro al giocatore è ruotato di 180°.

import * as THREE from './lib/three.module.min.js';
import {
  materiale, blocco, cilindro, sfera, tela, esa, scritta, fronte, loader, OSTACOLI,
  creaPersona, posaCorsa, CUBO,
} from './modelli.js';

const liceoVecchio = OSTACOLI.liceo;   // banco, lavagna e armadietti del modello precedente

const S = n => new THREE.MeshLambertMaterial({ color: n });
const BASIC = n => new THREE.MeshBasicMaterial({ color: n });

// ---------------------------------------------------------------------------
// Strada
// ---------------------------------------------------------------------------

const COLORI_AUTO = [0xC0392B, 0x2E86C1, 0xECF0F1, 0x2C3E50, 0xF1C40F, 0x7F8C8D, 0x1ABC9C, 0x8E44AD];
const VETRO = 0x1d2a38;

function ruota(g, x, z, r = 0.34) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.26, 12), materiale(0x15181d));
  m.rotation.z = Math.PI / 2;
  m.position.set(x, r, z);
  m.castShadow = true;
  g.add(m);
}

// Auto lunga 4,2 m sull'asse z. `giu` = 1 da fermo, usato anche per le auto che attraversano.
export function creaAuto(e) {
  const v = e.var ?? 0;
  const col = COLORI_AUTO[v % COLORI_AUTO.length];
  const g = new THREE.Group();
  const furgone = v % 5 === 4;
  g.add(blocco(1.8, 0.55, 4.2, col, 0, 0.28));
  if (furgone) {
    g.add(blocco(1.8, 1.1, 3.0, col, 0, 0.8, 0.5));
    g.add(blocco(1.65, 0.5, 1.0, VETRO, 0, 1.0, -1.1));
  } else {
    g.add(blocco(1.6, 0.52, 2.2, col, 0, 0.83, 0.25));
    g.add(blocco(1.64, 0.34, 2.0, VETRO, 0, 0.9, 0.25));
    g.add(blocco(1.5, 0.05, 2.0, col, 0, 1.35, 0.25));
  }
  for (const x of [-0.85, 0.85]) { ruota(g, x, -1.3); ruota(g, x, 1.3); }
  // Davanti verso -z (fari), dietro verso +z (stop rossi): le auto davanti al giocatore gli danno le spalle.
  for (const x of [-0.6, 0.6]) {
    g.add(blocco(0.35, 0.16, 0.06, BASIC(0xff3b30), x, 0.5, 2.12));
    g.add(blocco(0.35, 0.16, 0.06, BASIC(0xfff2c0), x, 0.5, -2.12));
  }
  g.add(blocco(0.5, 0.14, 0.04, BASIC(0xf2f2f2), 0, 0.3, 2.13));
  return g;
}

const stripesAvviso = tela(128, 32, (g, W, H) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e02d2d';
  for (let x = -H; x < W; x += 32) {
    g.beginPath(); g.moveTo(x, H); g.lineTo(x + 16, H); g.lineTo(x + 16 + H, 0); g.lineTo(x + H, 0); g.fill();
  }
});
const matStrisceAvviso = new THREE.MeshLambertMaterial({ map: stripesAvviso, emissive: 0x333333 });

function tombino() {
  const g = new THREE.Group();
  const buco = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), BASIC(0x0e0f12));
  buco.rotation.x = -Math.PI / 2;
  buco.scale.set(1.15, 1.0, 1);
  buco.position.y = 0.035;
  g.add(buco);
  // Bordo giallo e nero ben visibile, due coni arancioni e una fascia a righe davanti alla buca.
  const bordo = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.2, 24), BASIC(0xFFD400));
  bordo.rotation.x = -Math.PI / 2;
  bordo.scale.set(1.15, 1.0, 1);
  bordo.position.y = 0.045;
  g.add(bordo);
  const filo = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.3, 24), BASIC(0x15181d));
  filo.rotation.x = -Math.PI / 2;
  filo.scale.set(1.15, 1.0, 1);
  filo.position.y = 0.04;
  g.add(filo);
  for (const [x, z] of [[1.25, 0.9], [-1.25, 0.9], [0, 1.2]]) {
    const cono = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.0, 12), materiale(0xFF7A1A));
    cono.position.set(x, 0.5, z);
    cono.castShadow = true;
    g.add(cono);
    g.add(blocco(0.85, 0.06, 0.85, 0xFF7A1A, x, 0.0, z));
    g.add(blocco(0.46, 0.17, 0.46, 0xFFFFFF, x, 0.4, z));
  }
  g.add(blocco(2.4, 0.3, 0.06, matStrisceAvviso, 0, 0.45, 1.5));
  return g;
}

const stripes = tela(128, 32, (g, W, H) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e8541e';
  for (let x = -H; x < W; x += 32) {
    g.beginPath(); g.moveTo(x, H); g.lineTo(x + 16, H); g.lineTo(x + 16 + H, 0); g.lineTo(x + H, 0); g.fill();
  }
});
const matStrisce = new THREE.MeshLambertMaterial({ map: stripes });

function ponteggio() {
  const g = new THREE.Group();
  for (const x of [-1.0, 1.0]) {
    g.add(blocco(0.12, 2.9, 0.12, 0x9aa3ad, x, 0));
    g.add(blocco(0.12, 0.12, 0.7, 0x9aa3ad, x, 2.9, 0));
  }
  g.add(blocco(2.1, 0.5, 0.3, matStrisce, 0, 1.25));
  g.add(blocco(2.1, 0.08, 0.7, 0x9aa3ad, 0, 2.9));
  const cartello = scritta('Lavori', 1.2, 0.35, 0xF2C14E);
  cartello.position.set(0, 2.35, 0.1);
  g.add(cartello);
  return g;
}

function barrieraStradale() {
  const g = new THREE.Group();
  g.add(blocco(1.9, 0.8, 0.7, 0xC8C8C8, 0, 0));
  g.add(blocco(1.95, 0.2, 0.72, 0xC0392B, 0, 0.22));
  g.add(blocco(1.95, 0.2, 0.72, 0xC0392B, 0, 0.55));
  g.add(blocco(2.0, 0.08, 0.8, 0xDDDDDD, 0, 0.8));
  return g;
}

// Auto che attraversa da un lato: il giocatore la incontra al suo passaggio.
// L'asse lungo è x, lo spostamento laterale lo decide main.js.
export function creaAutoCrociera(e) {
  const g = new THREE.Group();
  const auto = creaAuto({ var: e.var });
  auto.rotation.y = e.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  g.add(auto);
  g.userData.auto = auto;
  return g;
}

OSTACOLI.liceo = {
  proprio: true,
  basso: () => barrieraStradale(),
  alto: () => ponteggio(),
  muro: (p, e) => creaAuto(e),
  buco: () => tombino(),
  crociera: (p, e) => creaAutoCrociera(e),
  persona: (p, e) => creaCompagno(e),
};

// Zebre e semaforo agli incroci.
export function creaSemaforo(e) {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    g.add(blocco(0.7, 0.04, 2.6, 0xF2F2F2, -3.0 + i * 1.0, 0.0, 0));
  }
  const rosso = e.rosso;
  for (const lato of [-1, 1]) {
    const x = lato * 4.7;
    g.add(blocco(0.16, 4.4, 0.16, 0x30343b, x, 0, -1.8));
    const testa = new THREE.Group();
    testa.position.set(x, 3.0, -1.8);
    testa.add(blocco(0.5, 1.25, 0.4, 0x15181d, 0, 0));
    const lampade = [[0xff2d2d, rosso], [0xffc83d, false], [0x3dff7a, !rosso]];
    lampade.forEach(([c, acceso], i) => {
      const l = sfera(0.15, acceso ? BASIC(c) : S(0x2a2d33), 0, 0.95 - i * 0.38, 0.2);
      testa.add(l);
    });
    g.add(testa);
  }
  return g;
}

// ---------------------------------------------------------------------------
// La scuola, vista da lontano e da vicino
// ---------------------------------------------------------------------------

loader.load('assets/murale.jpg', tex => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  muraleMat.map = tex;
  muraleMat.color.set(0xffffff);
  muraleMat.needsUpdate = true;
}, undefined, () => {});
const muraleMat = new THREE.MeshLambertMaterial({ color: 0xA87858, fog: false });

function cartelloBlu() {
  const tex = tela(1024, 320, (g, W, H) => {
    g.fillStyle = '#1F58B8'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '800 70px "Bricolage Grotesque", system-ui, sans-serif';
    g.fillText('LICEO SCIENTIFICO STATALE', W / 2, 120, W - 80);
    g.font = '800 96px "Bricolage Grotesque", system-ui, sans-serif';
    g.fillText('ELIO VITTORINI', W / 2, 225, W - 80);
    g.font = '500 44px "Bricolage Grotesque", system-ui, sans-serif';
    g.fillText('Scientifico · Linguistico', W / 2, 288, W - 80);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
}

const texRecinzione = tela(512, 128, (g, W, H) => {
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#2A5AA8';
  for (let x = 4; x < W; x += 16) g.fillRect(x, 0, 6, H);
  g.fillRect(0, 10, W, 8); g.fillRect(0, H - 22, W, 8);
});

// Edificio della scuola come nella foto: pannello alto con il murale, scale arancioni a destra,
// recinzione blu davanti, cartello a sinistra. L'apertura al centro è l'ingresso.
export function creaScuola() {
  const g = new THREE.Group();
  const muro = new THREE.MeshLambertMaterial({ color: 0xD9BC8C, fog: false });
  const M = (w, h, p, mat, x, y, z) => { const b = blocco(w, h, p, mat, x, y, z); return b; };

  // Zoccolo con l'apertura.
  g.add(M(4.2, 4.8, 3.2, muro, -5.3, 0, -1.4));
  g.add(M(4.2, 4.8, 3.2, muro, 5.3, 0, -1.4));
  g.add(M(6.4, 0.6, 3.2, muro, 0, 4.2, -1.4));
  // Pannello del murale.
  const lati = new THREE.MeshLambertMaterial({ color: 0xC9A97E, fog: false });
  const slab = new THREE.Mesh(CUBO, [lati, lati, lati, lati, muraleMat, lati]);
  slab.scale.set(12.8, 14.5, 2.6);
  slab.position.set(0, 4.8 + 14.5 / 2, -1.7);
  slab.castShadow = true;
  g.add(slab);
  // Porta d'ingresso a vetri: due ante che scorrono dentro lo zoccolo quando ci si avvicina.
  const vetro = new THREE.MeshLambertMaterial({ color: 0x9CC8E0, fog: false });
  const telaio = new THREE.MeshLambertMaterial({ color: 0x2B58B8, fog: false });
  const ante = [-1, 1].map(lato => {
    const anta = new THREE.Group();
    anta.add(M(3.1, 3.9, 0.12, vetro, 0, 0, 0));
    anta.add(M(3.1, 0.18, 0.2, telaio, 0, 0, 0));
    anta.add(M(3.1, 0.18, 0.2, telaio, 0, 3.72, 0));
    anta.add(M(0.18, 3.9, 0.2, telaio, -lato * 1.46, 0, 0));
    anta.add(M(0.18, 3.9, 0.2, telaio, lato * 1.46, 0, 0));
    anta.position.set(lato * 1.6, 0, -0.2);
    g.add(anta);
    return { anta, lato };
  });
  g.userData.apri = k => { for (const { anta, lato } of ante) anta.position.x = lato * (1.6 + 3.3 * k); };

  // Edificio giallo e scale arancioni a destra.
  const giallo = new THREE.MeshLambertMaterial({ color: 0xF2C230, fog: false });
  const arancio = new THREE.MeshLambertMaterial({ color: 0xE8793A, fog: false });
  const arancioChiaro = new THREE.MeshLambertMaterial({ color: 0xF09A66, fog: false });
  const blu = new THREE.MeshLambertMaterial({ color: 0x2B58B8, fog: false });
  g.add(M(11, 15, 7, giallo, 17.5, 0, -6));
  for (let i = 0; i < 4; i++) {
    g.add(M(7.5, 1.3, 4.2, i % 2 ? arancioChiaro : arancio, 12.5 + (i % 2) * 2.4, 2.6 + i * 2.6, -2.4));
    g.add(M(0.9, 2.6, 0.9, blu, 13.0 + (i % 2) * 0.8, 1.3 + i * 2.6, 0.2));
  }
  g.add(M(4, 1.0, 3.5, arancio, 12.0, 0, 1.0));

  // Cartello e lampione a sinistra.
  const cartello = cartelloBlu();
  cartello.position.set(-13.5, 6.4, 1.2);
  cartello.rotation.y = 0.25;
  g.add(cartello);
  g.add(M(0.2, 5.4, 0.2, S(0x8d949c), -17.0, 0, 1.0));
  g.add(M(0.2, 5.4, 0.2, S(0x8d949c), -10.2, 0, 1.2));

  // Recinzione blu con il cancello aperto.
  const rec = new THREE.MeshBasicMaterial({ map: texRecinzione, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, fog: false });
  for (const [x0, larg] of [[-13.0, 18.0], [13.0, 18.0]]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(larg, 2.4), rec.clone());
    r.material.map = texRecinzione.clone();
    r.material.map.needsUpdate = true;
    r.material.map.wrapS = THREE.RepeatWrapping;
    r.material.map.repeat.set(larg / 16, 1);
    r.position.set(x0 + (x0 < 0 ? -0.0 : 0.0), 1.2, 6.0);
    g.add(r);
  }

  // Bandiere.
  for (const [x, c1, c2, c3] of [[-3.0, 0x2e9d4a, 0xffffff, 0xd8352a], [3.0, 0x1b4fb0, 0x1b4fb0, 0xf2c230]]) {
    g.add(M(0.1, 6, 0.1, S(0x9aa3ad), x, 19.0, -1.0));
    g.add(M(0.5, 0.9, 0.05, S(c1), x - 0.3, 24.0, -1.0));
    g.add(M(0.5, 0.9, 0.05, S(c2), x, 24.0, -1.0));
    g.add(M(0.5, 0.9, 0.05, S(c3), x + 0.3, 24.0, -1.0));
  }

  // Elenco dei materiali per l'effetto lontananza.
  const mats = [];
  g.traverse(o => {
    if (o.material && !Array.isArray(o.material)) mats.push(o.material);
    if (Array.isArray(o.material)) mats.push(...o.material);
  });
  g.userData.materiali = mats.filter(m => !m.map).map(m => ({ m, base: m.color.clone() }));
  return g;
}

// ---------------------------------------------------------------------------
// Interni
// ---------------------------------------------------------------------------

const texParete = tela(256, 256, (g, W, H) => {
  g.fillStyle = '#F1ECE0'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#7FA7A0'; g.fillRect(0, H * 0.5, W, H * 0.5);
  g.fillStyle = '#E8E2D2'; g.fillRect(0, H * 0.5 - 6, W, 6);
  g.fillStyle = '#4f6b66'; g.fillRect(0, H - 14, W, 14);
  g.fillStyle = 'rgba(0,0,0,.05)';
  for (let i = 0; i < 120; i++) g.fillRect(Math.random() * W, Math.random() * H, 3, 3);
});
const matParete = new THREE.MeshLambertMaterial({ map: texParete });
const matSoffitto = new THREE.MeshLambertMaterial({ color: 0xEFEBE2 });
const matLuce = new THREE.MeshBasicMaterial({ color: 0xFFFFEE });
const matFinestra = new THREE.MeshBasicMaterial({ color: 0xDDF1FF });

const ALTEZZA_INTERNO = 4.6;
const META_CORRIDOIO = 4.25;

// Segmento di parete di 3,6 m (3 m di passo più sovrapposizione). lato: -1 sinistra, +1 destra.
export function creaParete(e) {
  const g = new THREE.Group();
  const spessore = 0.4;
  const muro = new THREE.Mesh(CUBO, matParete);
  muro.scale.set(spessore, ALTEZZA_INTERNO, 3.7);
  muro.position.set(e.lato * (META_CORRIDOIO + spessore / 2), ALTEZZA_INTERNO / 2, 0);
  muro.receiveShadow = true;
  g.add(muro);
  const x = e.lato * (META_CORRIDOIO - 0.02);
  if (e.lato < 0 && e.idx % 2 === 0) {
    // Finestra luminosa.
    const f = blocco(0.06, 1.5, 1.7, matFinestra, x, 1.7, 0);
    g.add(f);
    g.add(blocco(0.08, 0.08, 1.8, 0xE8E2D2, x, 1.62, 0));
  } else if (e.lato > 0 && e.idx % 3 === 0) {
    // Porta di un'aula.
    g.add(blocco(0.08, 2.9, 1.5, 0x8A5A34, x, 0, 0));
    g.add(blocco(0.1, 0.5, 0.7, 0xFFFFFF, x, 3.1, 0));
  } else if (e.lato > 0 && e.idx % 3 === 1) {
    // Armadietti sul muro.
    const col = [0x4B6A99, 0x5C7DB0, 0x3F5C86][e.idx % 3];
    for (let k = 0; k < 3; k++) g.add(blocco(0.4, 2.1, 0.9, col, x - 0.15, 0, -1.0 + k * 1.0));
  } else if (e.lato > 0) {
    // Bacheca.
    g.add(blocco(0.06, 1.2, 1.8, 0xB07A45, x, 1.4, 0));
    g.add(blocco(0.08, 0.5, 0.6, 0xFFE27A, x, 1.8, -0.4));
    g.add(blocco(0.08, 0.5, 0.5, 0xFF8FA3, x, 1.5, 0.4));
  }
  return g;
}

export function creaSoffitto(e) {
  const g = new THREE.Group();
  g.add(blocco(8.9, 0.35, 3.7, matSoffitto, 0, ALTEZZA_INTERNO));
  if (e.luce) g.add(blocco(0.8, 0.06, 1.6, matLuce, 0, ALTEZZA_INTERNO - 0.06));
  return g;
}

export function creaCartelloAppeso(testo, w = 3.4, colore = 0x2D7D4F, inchiostro = 0xffffff) {
  const g = new THREE.Group();
  const pannello = scritta(testo, w, 0.78, colore, inchiostro);
  pannello.position.y = 3.72;
  g.add(pannello);
  const retro = pannello.clone(); retro.rotation.y = Math.PI; retro.position.z = -0.02;
  g.add(retro);
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) g.add(blocco(0.04, 0.6, 0.04, 0x30343b, x, 4.0));
  return g;
}

// Parete di fondo con la porta dell'aula: l'anta si apre verso l'interno quando ci si avvicina.
// Sparisce dopo la scena in classe.
export function creaPortaAula(testo = '5ª H', colore = 0x1F58B8) {
  const g = new THREE.Group();
  const H = ALTEZZA_INTERNO;
  g.add(blocco(3.15, H, 0.4, matParete, -2.875, 0));
  g.add(blocco(3.15, H, 0.4, matParete, 2.875, 0));
  g.add(blocco(2.6, H - 3.3, 0.4, matParete, 0, 3.3));
  for (const x of [-1.2, 1.2]) g.add(blocco(0.2, 3.3, 0.5, 0x6E4524, x, 0));
  g.add(blocco(2.6, 0.2, 0.5, 0x6E4524, 0, 3.2));
  // Si intravede l'aula oltre la porta.
  g.add(blocco(2.4, 3.2, 0.05, new THREE.MeshBasicMaterial({ color: 0xE9E3D4 }), 0, 0, -0.7));
  g.add(blocco(1.0, 1.4, 0.06, new THREE.MeshBasicMaterial({ color: 0xDDF1FF }), -0.5, 1.2, -0.66));
  const perno = new THREE.Group();
  perno.position.set(-1.1, 0, 0.05);
  perno.add(blocco(2.2, 3.0, 0.1, 0x8A5A34, 1.1, 0, 0));
  perno.add(blocco(0.12, 0.3, 0.12, 0xD8B85A, 1.9, 1.4, 0.1));
  g.add(perno);
  const cartello = scritta(testo, 2.2, 0.8, 0xFFFFFF, colore);
  cartello.position.set(0, 3.9, 0.22);
  g.add(cartello);
  g.userData.apri = k => { perno.rotation.y = k * 1.45; };
  return g;
}

export function creaPortone() {
  const g = new THREE.Group();
  g.add(blocco(1.4, 4.4, 0.6, 0xD9BC8C, -3.8, 0));
  g.add(blocco(1.4, 4.4, 0.6, 0xD9BC8C, 3.8, 0));
  g.add(blocco(8.9, 0.8, 0.6, 0xD9BC8C, 0, 4.4));
  const cartello = scritta('Uscita', 2.2, 0.6, 0x2D7D4F, 0xffffff);
  cartello.position.set(0, 4.8, 0.32);
  g.add(cartello);
  // Porta a due ante che scorrono dentro i pilastri.
  const ante = [-1, 1].map(lato => {
    const anta = new THREE.Group();
    anta.add(blocco(3.1, 4.2, 0.1, 0x8A5A34, 0, 0, 0));
    anta.add(blocco(2.4, 1.6, 0.14, 0x9CC8E0, 0, 1.9, 0));
    anta.position.x = lato * 1.55;
    g.add(anta);
    return { anta, lato };
  });
  g.userData.apri = k => { for (const { anta, lato } of ante) anta.position.x = lato * (1.55 + 2.3 * k); };
  return g;
}

// Ostacoli interni -----------------------------------------------------------

// Materiali un po' autoilluminati: i pilastri restano chiari anche nei corridoi in ombra.
const matColonna = new THREE.MeshLambertMaterial({ color: 0xFBF8F1, emissive: 0x4A463E });
const matBase = new THREE.MeshLambertMaterial({ color: 0xE9E3D6, emissive: 0x3A372F });
function colonna() {
  const g = new THREE.Group();
  g.add(blocco(1.6, 4.6, 1.6, matColonna, 0, 0));
  g.add(blocco(1.9, 0.3, 1.9, matBase, 0, 0));
  g.add(blocco(1.9, 0.3, 1.9, matBase, 0, 4.3));
  g.add(blocco(1.65, 0.08, 1.65, matBase, 0, 1.2));
  return g;
}

function bagnato() {
  const g = new THREE.Group();
  const pozza = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: 0x8FC6E8, transparent: true, opacity: 0.75 }));
  pozza.rotation.x = -Math.PI / 2;
  pozza.scale.set(1.2, 1.0, 1);
  pozza.position.y = 0.04;
  g.add(pozza);
  // Cavalletto giallo "pavimento bagnato".
  for (const s of [-1, 1]) {
    const lato = blocco(0.55, 0.62, 0.04, 0xF4D03F, 0, 0, 0.02);
    lato.rotation.x = s * 0.25;
    lato.position.set(0.8, 0.31, 0.3 + s * 0.1);
    g.add(lato);
  }
  const t = scritta('Attenzione', 0.5, 0.2, 0xF4D03F);
  t.position.set(0.8, 0.36, 0.5);
  g.add(t);
  return g;
}

const MAGLIE = [0xC0392B, 0x27AE60, 0xF39C12, 0x8E44AD, 0x16A085, 0xD35400, 0x2980B9, 0xE84393];
const CAPELLI = [0x2B1D14, 0x5A3A22, 0xC8A25A, 0x15110E, 0x7A4A2A];

// Compagno che ti viene incontro: guarda verso +z (verso il giocatore).
export function creaCompagno(e) {
  const v = e.var ?? 0;
  const p = creaPersona({
    maglia: MAGLIE[v % MAGLIE.length], capelli: CAPELLI[(v >> 1) % CAPELLI.length],
    pantaloni: v % 2 ? 0x34495E : 0x2A2D3A, zaino: MAGLIE[(v + 3) % MAGLIE.length], conZaino: true,
  });
  const g = new THREE.Group();
  p.radice.scale.setScalar(0.8);
  p.radice.rotation.y = e.via ? 0 : Math.PI;      // chi esce da scuola cammina nella tua direzione
  g.add(p.radice);
  g.userData.anima = e.via ? (t => posaCorsa(p, t * 6 + v, 0.55)) : (t => posaCorsa(p, t * 9 + v, 0.8));
  return g;
}

OSTACOLI.liceoInt = {
  proprio: true,
  basso: (p, e) => liceoVecchio.basso(p, e),
  alto: () => {
    const g = new THREE.Group();
    for (const x of [-1.0, 1.0]) g.add(blocco(0.08, 2.7, 0.08, 0x3B4A5A, x, 0));
    const telo = scritta('Assemblea', 2.0, 0.8, 0xE67E22, 0xffffff);
    telo.position.set(0, 1.75, 0);
    g.add(telo);
    const retro = telo.clone(); retro.rotation.y = Math.PI; retro.position.z = -0.01;
    g.add(retro);
    return g;
  },
  muro: (p, e) => (e.var === 1 ? liceoVecchio.muro(0.9, e) : colonna()),
  buco: () => bagnato(),
  persona: (p, e) => creaCompagno(e),
};

// Muri lunghi dei corridoi di corsie: auto in fila per strada, una fila di armadietti dentro.
const texArmadietti = tela(128, 128, (g, W, H) => {
  g.fillStyle = '#4B6A99'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#3F5C86'; g.fillRect(0, 0, 4, H); g.fillRect(W - 4, 0, 4, H);
  g.fillStyle = '#2F4668'; g.fillRect(W * 0.3, H * 0.12, W * 0.4, 4); g.fillRect(W * 0.3, H * 0.2, W * 0.4, 4);
  g.fillRect(0, H * 0.62, W, 3);
  g.fillStyle = '#C8CFD8'; g.fillRect(W * 0.75, H * 0.4, 6, 14);
});

export function creaMuroLungo(e) {
  const p = e.profondita;
  const g = new THREE.Group();
  if (e.stile === 'liceoInt') {
    const lati = materiale(0x3F5C86);
    const frontale = new THREE.MeshLambertMaterial({ map: texArmadietti.clone() });
    frontale.map.needsUpdate = true;
    frontale.map.wrapS = THREE.RepeatWrapping;
    frontale.map.repeat.set(p / 1.6, 1);
    const m = new THREE.Mesh(CUBO, [frontale, frontale, lati, lati, lati, lati]);
    m.scale.set(1.9, 2.5, p);
    m.position.y = 1.25;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return g;
  }
  const n = Math.max(1, Math.round(p / 4.5));
  const passo = p / n;
  for (let i = 0; i < n; i++) {
    const a = creaAuto({ var: (e.var ?? 0) + i * 3 + Math.floor(e.d) });
    a.position.z = -p / 2 + passo * (i + 0.5);
    g.add(a);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Metro, segnale di salita e l'amico biondo
// ---------------------------------------------------------------------------

// Ingresso della Metro: scala che scende sotto il marciapiede, tettoia e un'alta insegna rossa con la M.
export function creaMetro(lato) {
  const g = new THREE.Group();
  g.position.x = lato * 6.2;
  g.add(blocco(3.0, 0.05, 2.6, 0x16181c, 0, 0.02, 0));                    // la scala che scende
  for (let i = 0; i < 5; i++) g.add(blocco(2.7, 0.04, 0.18, 0x3A3F48, 0, 0.04, -0.9 + i * 0.4));
  for (const x of [-1.5, 1.5]) g.add(blocco(0.08, 1.0, 2.7, 0xF2C14E, x, 0, 0));
  g.add(blocco(3.0, 0.08, 0.08, 0xF2C14E, 0, 1.0, 1.35));
  for (const x of [-1.3, 1.3]) g.add(blocco(0.12, 2.8, 0.12, 0x4A4F57, x, 0, -1.2));
  g.add(blocco(3.4, 0.16, 2.2, 0x4A4F57, 0, 2.8, -0.2));                   // tettoia
  const rossa = new THREE.MeshBasicMaterial({ color: 0xD9262C });
  g.add(blocco(0.2, 7.2, 0.2, 0x2B2F36, 0, 0, 1.6));                       // palo
  g.add(blocco(2.4, 2.4, 0.18, rossa, 0, 5.2, 1.6));                       // insegna rossa
  const emme = scritta('M', 2.0, 2.0, 0xD9262C, 0xFFFFFF);
  emme.position.set(0, 5.2, 1.7);
  g.add(emme);
  const nome = scritta('Metro', 2.4, 0.7, 0x16181c, 0xFFFFFF);
  nome.position.set(0, 3.7, 1.7);
  g.add(nome);
  return g;
}

// Segnale triangolare di salita con la pendenza.
export function creaSegnaleSalita(lato, testo = '15%') {
  const g = new THREE.Group();
  g.position.x = lato * 4.8;
  g.add(blocco(0.1, 2.9, 0.1, 0x2B2F36, 0, 0, 0));
  const tex = tela(256, 256, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    const tri = (inset, colore) => {
      c.fillStyle = colore; c.beginPath();
      c.moveTo(W / 2, inset); c.lineTo(W - inset * 0.55, H - inset * 0.7); c.lineTo(inset * 0.55, H - inset * 0.7); c.closePath(); c.fill();
    };
    tri(10, '#D9262C'); tri(46, '#FFFFFF');
    c.fillStyle = '#1C1D2B';
    c.beginPath(); c.moveTo(70, 190); c.lineTo(180, 190); c.lineTo(180, 120); c.closePath(); c.fill();   // la salita
    c.fillRect(150, 150, 38, 18);
    c.font = '800 46px Arial, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#1C1D2B';
    c.fillText(testo, W / 2 - 4, 112);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.position.set(0, 3.0, 0.08);
  g.add(m);
  return g;
}

// L'amico biondo riccio che esce da scuola insieme a Roberto.
export function creaAmico() {
  const p = creaPersona({
    pelle: 0xEBC4A0, capelli: 0xD9B55A, acconciatura: 'ricci', maglia: 0xE8D9B0, pantaloni: 0x34495E,
    conZaino: true, zaino: 0x2C3E50,
  });
  p.radice.scale.setScalar(0.8 * 1.06);
  return p;
}
