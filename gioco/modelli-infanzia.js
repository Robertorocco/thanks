// Modelli dell'infanzia di Roberto: la casa (neonato, a gattoni) e l'Istituto Darmon (elementari).
// Tutti guardano verso -z (avanti); chi arriva incontro al giocatore è ruotato di 180°.
// Le misure degli ostacoli seguono la fisica dell'età (FISICA in mondi.js): per il neonato "basso" è
// sotto ~0,32 m e "alto" parte da ~0,45 m; per il bambino 0,6 m e 0,84 m.

import * as THREE from './lib/three.module.min.js';
import {
  blocco, cilindro, sfera, tela, esa, scritta, OSTACOLI, creaPersona, posaCorsa, creaCaffe, CUBO,
} from './modelli.js';
import { creaParete, creaSoffitto, creaAuto } from './modelli-liceo.js';

const BASIC = n => new THREE.MeshBasicMaterial({ color: n });
const S = n => new THREE.MeshLambertMaterial({ color: n });
const PALETTE = [0xE0533F, 0x3A7CC4, 0xF2C14E, 0x4CAF6A, 0xB06AD1, 0xF08A3A, 0x3FC1C9, 0xE86A9A];

// ---------------------------------------------------------------------------
// Pareti e soffitti
// ---------------------------------------------------------------------------

const H_CASA = 3.9;
const META = 4.25;

// Carta da parati color crema a righe, zoccolino bianco.
const texCasa = tela(256, 256, (g, W, H) => {
  g.fillStyle = '#F6E7C8'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(214,170,110,.28)';
  for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 12, H);
  g.fillStyle = '#E9D2A8'; g.fillRect(0, H * 0.78, W, H * 0.22);
  g.fillStyle = '#FFFFFF'; g.fillRect(0, H * 0.76, W, 7); g.fillRect(0, H - 18, W, 18);
});
const matCasa = new THREE.MeshLambertMaterial({ map: texCasa });
const matSoffittoCasa = new THREE.MeshLambertMaterial({ color: 0xFFF8EA });

// Pareti dell'Istituto: sopra giallino, sotto una fascia colorata, con disegni dei bambini.
const FASCE = ['#7FBF9C', '#8DB8E8', '#F2B766', '#E99AB0'];
const texDarmon = FASCE.map(f => tela(256, 256, (g, W, H) => {
  g.fillStyle = '#FBF1D3'; g.fillRect(0, 0, W, H);
  g.fillStyle = f; g.fillRect(0, H * 0.55, W, H * 0.45);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, H * 0.55 - 5, W, 5);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, H - 14, W, 14);
}));
const matDarmon = texDarmon.map(t => new THREE.MeshLambertMaterial({ map: t }));

const disegni = Array.from({ length: 6 }, (_, i) => tela(128, 96, (g, W, H) => {
  g.fillStyle = '#FFFDF2'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#d9d2bd'; g.lineWidth = 3; g.strokeRect(2, 2, W - 4, H - 4);
  const c = PALETTE[i % PALETTE.length];
  if (i % 3 === 0) {          // sole e casetta
    g.fillStyle = '#F6C945'; g.beginPath(); g.arc(26, 24, 14, 0, 7); g.fill();
    g.fillStyle = esa(c); g.fillRect(48, 46, 50, 34);
    g.fillStyle = '#8C4A2F'; g.beginPath(); g.moveTo(42, 46); g.lineTo(73, 22); g.lineTo(104, 46); g.fill();
    g.fillStyle = '#6A4A2A'; g.fillRect(68, 60, 12, 20);
  } else if (i % 3 === 1) {   // albero e prato
    g.fillStyle = '#7BC47F'; g.fillRect(0, 72, W, 24);
    g.fillStyle = '#8B5A2B'; g.fillRect(60, 40, 10, 36);
    g.fillStyle = esa(c); g.beginPath(); g.arc(65, 34, 22, 0, 7); g.fill();
  } else {                    // pesce
    g.fillStyle = '#9ED8F0'; g.fillRect(0, 0, W, H);
    g.fillStyle = esa(c); g.beginPath(); g.ellipse(60, 48, 30, 18, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(88, 48); g.lineTo(112, 30); g.lineTo(112, 66); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(45, 42, 4, 0, 7); g.fill();
  }
}));
const matDisegni = disegni.map(t => new THREE.MeshLambertMaterial({ map: t }));

function parete(e, mats, altezza, decora) {
  const g = new THREE.Group();
  const spessore = 0.4;
  const muro = new THREE.Mesh(CUBO, mats[Math.abs(e.idx) % mats.length]);
  muro.scale.set(spessore, altezza, 3.7);
  muro.position.set(e.lato * (META + spessore / 2), altezza / 2, 0);
  muro.receiveShadow = true;
  g.add(muro);
  decora(g, e.lato * (META - 0.02), e);
  return g;
}

const matFinestra = new THREE.MeshBasicMaterial({ color: 0xDDF1FF });

export function creaPareteStile(e) {
  if (e.stile === 'casa') {
    return parete(e, [matCasa], H_CASA, (g, x, e) => {
      const k = Math.abs(e.idx);
      if (e.lato < 0 && k % 2 === 0) {
        // Finestra con tende.
        g.add(blocco(0.06, 1.6, 1.5, matFinestra, x, 1.3, 0));
        g.add(blocco(0.08, 0.08, 1.7, 0xFFFFFF, x, 1.22, 0));
        for (const z of [-0.85, 0.85]) g.add(blocco(0.12, 2.0, 0.45, k % 4 === 0 ? 0xE9A0A0 : 0x9FC8E8, x + 0.04, 1.0, z));
        g.add(blocco(0.1, 0.1, 2.2, 0x6B4A2B, x, 3.1, 0));
      } else if (e.lato > 0 && k % 3 === 0) {
        // Porta di una stanza.
        g.add(blocco(0.08, 2.6, 1.3, 0xB07A45, x, 0, 0));
        g.add(blocco(0.1, 0.12, 0.12, 0xD8B85A, x, 1.1, 0.4));
      } else if (k % 3 === 1) {
        // Cornici con le foto di famiglia.
        for (const [z, c, w, h] of [[-0.8, 0xF2C14E, 0.55, 0.7], [0.0, 0xE98A8A, 0.7, 0.55], [0.85, 0x8BC0E8, 0.5, 0.65]]) {
          g.add(blocco(0.06, h + 0.1, w + 0.1, 0x6B4A2B, x, 1.2, z));
          g.add(blocco(0.08, h, w, c, x, 1.25, z));
        }
      } else {
        // Mensola con peluche.
        g.add(blocco(0.5, 0.06, 1.8, 0x8C5E34, x - 0.2, 1.5, 0));
        g.add(blocco(0.25, 0.3, 0.25, 0xC9976B, x - 0.2, 1.56, -0.5));
        g.add(blocco(0.22, 0.26, 0.22, 0xF7D8E0, x - 0.2, 1.56, 0.3));
      }
    });
  }
  if (e.stile === 'darmon') {
    return parete(e, matDarmon, 4.2, (g, x, e) => {
      const k = Math.abs(e.idx);
      if (e.lato < 0 && k % 2 === 0) {
        g.add(blocco(0.06, 1.5, 1.7, matFinestra, x, 1.6, 0));
        g.add(blocco(0.08, 0.08, 1.8, 0xFFFFFF, x, 1.5, 0));
      } else if (e.lato > 0 && k % 4 === 0) {
        g.add(blocco(0.08, 2.9, 1.4, PALETTE[k % PALETTE.length], x, 0, 0));
        g.add(blocco(0.1, 0.5, 0.7, 0xFFFFFF, x, 3.1, 0));
      } else {
        // Disegni dei bambini appesi al muro.
        for (let i = 0; i < 2; i++) {
          const z = -0.85 + i * 1.7;
          const m = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.0), matDisegni[(k * 2 + i + (e.lato > 0 ? 1 : 0)) % matDisegni.length]);
          m.rotation.y = e.lato > 0 ? -Math.PI / 2 : Math.PI / 2;
          m.position.set(x - e.lato * 0.02, 1.5, z);
          g.add(m);
        }
      }
    });
  }
  return creaParete(e);
}

export function creaSoffittoStile(e) {
  if (e.stile === 'casa' || e.stile === 'darmon') {
    const h = e.stile === 'casa' ? H_CASA : 4.2;
    const g = new THREE.Group();
    g.add(blocco(8.9, 0.35, 3.7, e.stile === 'casa' ? matSoffittoCasa : S(0xF5F0E2), 0, h));
    if (e.luce) g.add(blocco(1.0, 0.06, 1.0, BASIC(0xFFF6D8), 0, h - 0.06));
    return g;
  }
  return creaSoffitto(e);
}

// ---------------------------------------------------------------------------
// Casa: arredi laterali
// ---------------------------------------------------------------------------

const LEGNO = 0xA9794A, LEGNO_CH = 0xD4A86E;

function culla() {
  const g = new THREE.Group();
  g.add(blocco(1.5, 0.12, 2.3, LEGNO, 0, 0.45));
  g.add(blocco(1.4, 0.22, 2.2, 0xFFF3F6, 0, 0.57));
  for (const x of [-0.7, 0.7]) for (const z of [-1.1, 1.1]) g.add(blocco(0.1, 1.15, 0.1, LEGNO, x, 0));
  for (const x of [-0.7, 0.7]) for (let i = 0; i < 9; i++) g.add(blocco(0.04, 0.5, 0.04, LEGNO_CH, x, 0.65, -1.0 + i * 0.25));
  for (const z of [-1.1, 1.1]) g.add(blocco(1.5, 0.1, 0.1, LEGNO, 0, 1.05, z));
  // Giostrina appesa sopra la culla.
  g.add(blocco(0.05, 1.2, 0.05, 0x9A9AA5, 0, 1.2, -1.1));
  g.add(cilindro(0.5, 0.05, 0xF7E6A8, 0, 2.35, -0.6));
  PALETTE.slice(0, 5).forEach((c, i) => {
    const a = (i / 5) * Math.PI * 2;
    g.add(blocco(0.02, 0.4, 0.02, 0x999999, Math.cos(a) * 0.4, 1.98, -0.6 + Math.sin(a) * 0.4));
    g.add(sfera(0.1, S(c), Math.cos(a) * 0.4, 1.9, -0.6 + Math.sin(a) * 0.4));
  });
  return g;
}

function tappeto(e) {
  const g = new THREE.Group();
  const cols = [0xF6B7B7, 0xFFF3E0, 0xB9D8F0, 0xFFE59A];
  cols.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(2.6 - i * 0.55, 28), new THREE.MeshLambertMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: -6 - i, polygonOffsetUnits: -6 - i }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.012 + i * 0.003;
    g.add(m);
  });
  return g;
}

function lampada() {
  const g = new THREE.Group();
  g.add(cilindro(0.3, 0.06, 0x555555)); g.add(cilindro(0.04, 2.4, 0x555555));
  const paralume = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 0.55, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0xFFE9B0, emissive: 0x6A5320, side: THREE.DoubleSide }));
  paralume.position.y = 2.55; g.add(paralume);
  return g;
}

function pianta(e) {
  const g = new THREE.Group();
  g.add(cilindro(0.38, 0.55, 0xC4694A));
  const foglie = [0x3F8F4F, 0x4FA35E, 0x2F7A44];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    const f = sfera(0.32, new THREE.MeshLambertMaterial({ color: foglie[i % 3], flatShading: true }), Math.cos(a) * 0.28, 0.95 + (i % 3) * 0.3, Math.sin(a) * 0.28);
    f.scale.set(0.34, 0.5, 0.2); f.rotation.z = Math.cos(a) * 0.5; f.rotation.x = Math.sin(a) * 0.5;
    g.add(f);
  }
  return g;
}

function libreria(e) {
  const g = new THREE.Group();
  g.add(blocco(1.6, 2.5, 0.45, LEGNO, 0, 0));
  for (let r = 0; r < 4; r++) {
    g.add(blocco(1.45, 0.05, 0.4, LEGNO_CH, 0, 0.2 + r * 0.58, -0.02));
    let x = -0.65;
    while (x < 0.6) {
      const w = 0.07 + ((x * 31 + r * 7 + e.var) % 5) * 0.012 + 0.03, h = 0.34 + ((r + e.var + Math.round(x * 10)) % 3) * 0.06;
      g.add(blocco(w, h, 0.26, PALETTE[(Math.round(x * 17) + r * 3 + e.var + 16) % PALETTE.length], x + w / 2, 0.25 + r * 0.58, -0.08));
      x += w + 0.01;
    }
  }
  return g;
}

function tv() {
  const g = new THREE.Group();
  g.add(blocco(1.7, 0.7, 0.5, LEGNO, 0, 0));
  g.add(blocco(1.5, 0.9, 0.08, 0x15181D, 0, 0.85, 0));
  g.add(blocco(1.4, 0.8, 0.02, BASIC(0x8FC6E8), 0, 0.9, -0.05));
  g.add(blocco(0.3, 0.05, 0.2, 0x222222, 0, 0.7, 0));
  return g;
}

function divanoArredo() {
  const g = new THREE.Group();
  g.add(blocco(2.6, 0.5, 1.0, 0x7B9CC4, 0, 0.1));
  g.add(blocco(2.6, 0.85, 0.25, 0x6B8DB5, 0, 0.1, 0.4));
  for (const x of [-1.3, 1.3]) g.add(blocco(0.25, 0.7, 1.0, 0x6B8DB5, x, 0.1));
  for (const [x, c] of [[-0.6, 0xF2C14E], [0.6, 0xE98A8A]]) g.add(blocco(0.7, 0.2, 0.7, c, x, 0.6, 0));
  return g;
}

function cassapanca() {
  const g = new THREE.Group();
  g.add(blocco(1.5, 0.6, 0.7, 0xC9702F, 0, 0));
  g.add(blocco(1.55, 0.1, 0.75, 0xE59A55, 0, 0.6));
  for (const [x, c] of [[-0.4, 0xE0533F], [0.3, 0x3A7CC4]]) g.add(blocco(0.35, 0.35, 0.35, c, x, 0.7, 0));
  return g;
}

function appendiabiti() {
  const g = new THREE.Group();
  g.add(blocco(0.1, 0.12, 1.8, 0x8C5E34, 0.0, 1.9));
  for (let i = 0; i < 4; i++) {
    g.add(blocco(0.08, 0.18, 0.08, 0xD8B85A, -0.05, 1.8, -0.7 + i * 0.47));
    g.add(blocco(0.12, 0.85, 0.4, PALETTE[(i + 2) % PALETTE.length], -0.13, 0.95, -0.7 + i * 0.47));
  }
  return g;
}

function scarpiera() {
  const g = new THREE.Group();
  g.add(blocco(1.3, 0.8, 0.45, LEGNO, 0, 0));
  g.add(blocco(1.2, 0.04, 0.4, 0x5A4026, 0, 0.4));
  for (const [x, c] of [[-0.35, 0xE0533F], [0.0, 0x3A7CC4], [0.35, 0x222222]]) g.add(blocco(0.22, 0.14, 0.34, c, x, 0.82, 0));
  return g;
}

function frigo() {
  const g = new THREE.Group();
  g.add(blocco(0.9, 2.2, 0.8, 0xEDEFF2, 0, 0));
  g.add(blocco(0.92, 0.03, 0.82, 0x9AA0A8, 0, 1.4));
  g.add(blocco(0.06, 0.5, 0.06, 0xBFC4CB, 0.3, 0.95, -0.42));
  g.add(blocco(0.06, 0.7, 0.06, 0xBFC4CB, 0.3, 1.5, -0.42));
  for (const [x, y, c] of [[-0.2, 1.8, 0xE0533F], [0.15, 1.6, 0x3A7CC4]]) g.add(blocco(0.18, 0.18, 0.02, c, x, y, -0.41));
  return g;
}

function bancone() {
  const g = new THREE.Group();
  g.add(blocco(0.7, 0.95, 4.2, 0xF2E8D2, 0, 0));
  g.add(blocco(0.78, 0.07, 4.3, 0xB8B2A6, 0, 0.95));
  g.add(blocco(0.5, 0.05, 0.8, 0x8F979E, 0, 1.0, 0.3));
  g.add(cilindro(0.04, 0.35, 0x8F979E, 0, 1.02, 0.7));
  for (const z of [-1.4, 0, 1.4]) g.add(blocco(0.04, 0.35, 0.8, 0xD9CFB8, -0.36, 0.3, z));
  g.add(cilindro(0.18, 0.25, 0xC4694A, 0, 1.02, -1.4));
  return g;
}

function tavoloArredo() {
  const g = new THREE.Group();
  g.add(blocco(1.5, 0.08, 1.0, 0xFFF1D6, 0, 0.78));
  g.add(blocco(1.52, 0.2, 1.02, 0xF2A9A9, 0, 0.64));
  for (const x of [-0.65, 0.65]) for (const z of [-0.4, 0.4]) g.add(blocco(0.08, 0.78, 0.08, LEGNO, x, 0));
  for (const z of [-0.85, 0.85]) {
    g.add(blocco(0.45, 0.06, 0.45, LEGNO_CH, 0, 0.45, z));
    g.add(blocco(0.45, 0.55, 0.06, LEGNO_CH, 0, 0.5, z + Math.sign(z) * 0.2));
    for (const x of [-0.18, 0.18]) g.add(blocco(0.05, 0.45, 0.05, LEGNO, x, 0, z));
  }
  g.add(cilindro(0.16, 0.06, 0xFFFFFF, 0.1, 0.86, 0.05));
  return g;
}

function seggiolone() {
  const g = new THREE.Group();
  for (const x of [-0.3, 0.3]) for (const z of [-0.3, 0.3]) g.add(blocco(0.06, 1.0, 0.06, 0xF2C14E, x, 0));
  g.add(blocco(0.7, 0.08, 0.7, 0xE0533F, 0, 0.95));
  g.add(blocco(0.7, 0.5, 0.08, 0xE0533F, 0, 1.0, 0.33));
  g.add(blocco(0.8, 0.05, 0.4, 0xFFFFFF, 0, 1.2, -0.45));
  return g;
}

// ---------------------------------------------------------------------------
// Istituto Darmon: arredi laterali
// ---------------------------------------------------------------------------

function panchina() {
  const g = new THREE.Group();
  g.add(blocco(1.8, 0.08, 0.5, 0x9B6B3E, 0, 0.5));
  g.add(blocco(1.8, 0.45, 0.07, 0x9B6B3E, 0, 0.75, 0.25));
  for (const x of [-0.8, 0.8]) g.add(blocco(0.08, 0.5, 0.5, 0x3A3F4A, x, 0));
  return g;
}

function aiuola() {
  const g = new THREE.Group();
  g.add(blocco(2.2, 0.35, 1.0, 0xC9B79A, 0, 0));
  g.add(blocco(2.0, 0.1, 0.8, 0x6B4A2B, 0, 0.35));
  for (let i = 0; i < 9; i++) {
    g.add(sfera(0.11, S(PALETTE[i % PALETTE.length]), -0.85 + i * 0.21, 0.6 + (i % 2) * 0.1, ((i * 37) % 5 - 2) * 0.12));
    g.add(blocco(0.03, 0.2, 0.03, 0x3F8F4F, -0.85 + i * 0.21, 0.4, ((i * 37) % 5 - 2) * 0.12));
  }
  return g;
}

function scivolo() {
  const g = new THREE.Group();
  g.add(blocco(1.0, 2.0, 1.0, 0xE0533F, 0, 0));
  g.add(blocco(1.0, 0.1, 1.0, 0xF2C14E, 0, 2.0));
  const rampa = blocco(0.9, 0.08, 3.0, 0x3A7CC4, 0, 0);
  rampa.rotation.x = -0.6; rampa.position.set(0, 1.0, -1.9);
  g.add(rampa);
  g.add(blocco(0.08, 1.0, 0.08, 0x777777, -0.45, 2.1)); g.add(blocco(0.08, 1.0, 0.08, 0x777777, 0.45, 2.1));
  return g;
}

function altalena() {
  const g = new THREE.Group();
  for (const x of [-1.4, 1.4]) { const gamba = blocco(0.1, 2.6, 0.1, 0x3A7CC4, x, 0, -0.5); gamba.rotation.z = -Math.sign(x) * 0.12; g.add(gamba); const g2 = blocco(0.1, 2.6, 0.1, 0x3A7CC4, x, 0, 0.5); g2.rotation.z = -Math.sign(x) * 0.12; g.add(g2); }
  g.add(blocco(3.0, 0.1, 0.1, 0x3A7CC4, 0, 2.55));
  for (const x of [-0.5, 0.5]) { g.add(blocco(0.03, 1.7, 0.03, 0x555555, x, 0.8)); g.add(blocco(0.5, 0.06, 0.25, 0xF2C14E, x, 0.78)); }
  return g;
}

function canestro() {
  const g = new THREE.Group();
  g.add(blocco(0.12, 3.0, 0.12, 0x555555, 0, 0));
  g.add(blocco(1.4, 0.9, 0.06, 0xFFFFFF, 0, 2.6, -0.1));
  const anello = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 14), S(0xE0533F));
  anello.rotation.x = Math.PI / 2; anello.position.set(0, 2.65, -0.45);
  g.add(anello);
  return g;
}

function giostra() {
  const g = new THREE.Group();
  g.add(cilindro(1.1, 0.12, 0x3A7CC4, 0, 0.15));
  g.add(cilindro(0.08, 0.9, 0x777777, 0, 0.2));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.add(blocco(0.06, 0.6, 0.6, PALETTE[i], Math.cos(a) * 0.9, 0.27, Math.sin(a) * 0.9));
  }
  return g;
}

function armadietto(e) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) g.add(blocco(0.55, 1.7, 0.5, PALETTE[(i + e.var) % PALETTE.length], 0, 0, -0.55 + i * 0.58));
  return g;
}

function palloncini(e) {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const x = ((i * 53) % 7 - 3) * 0.15, z = ((i * 29) % 5 - 2) * 0.15;
    g.add(blocco(0.015, 2.0 + (i % 3) * 0.3, 0.015, 0xDDDDDD, x, 0.35, z));
    const b = sfera(0.26, S(PALETTE[(i + e.var) % PALETTE.length]), x, 2.5 + (i % 3) * 0.3, z);
    b.scale.set(0.26, 0.32, 0.26);
    g.add(b);
  }
  g.add(blocco(0.5, 0.35, 0.5, 0xF2C14E, 0, 0));
  return g;
}

const ARREDI = {
  culla, tappeto, lampada, pianta, libreria, tv, divano: divanoArredo, cassapanca, appendiabiti, scarpiera,
  frigo, bancone, tavolo: tavoloArredo, seggiolone, panchina, aiuola, scivolo, altalena, canestro, giostra,
  armadietto, palloncini,
};

const RUOTA_AL_CENTRO = new Set(['libreria', 'tv', 'divano', 'cassapanca', 'scarpiera', 'frigo', 'panchina', 'canestro', 'altalena', 'aiuola']);
const RUOTA_LUNGO_MURO = new Set(['appendiabiti', 'armadietto']);

// Gli arredi stanno ai lati (sotto i muri all'interno, oltre il marciapiede all'aperto), con il fronte verso il centro.
export function creaArredo(e) {
  const g = new THREE.Group();
  const m = (ARREDI[e.tipo] ?? pianta)(e);
  g.add(m);
  if (e.lato) {
    m.position.x = e.lato * (e.esterno ? 7.4 : 3.55);
    if (RUOTA_AL_CENTRO.has(e.tipo)) m.rotation.y = e.lato * Math.PI / 2;
    if (RUOTA_LUNGO_MURO.has(e.tipo) && e.lato < 0) m.rotation.y = Math.PI;
  }
  m.traverse(o => { o.castShadow = false; });
  return g;
}

// ---------------------------------------------------------------------------
// Porta di casa
// ---------------------------------------------------------------------------

export function creaPortaCasa() {
  const g = new THREE.Group();
  const H = H_CASA;
  const muro = matCasa;
  g.add(blocco(3.15, H, 0.4, muro, -2.875, 0));
  g.add(blocco(3.15, H, 0.4, muro, 2.875, 0));
  g.add(blocco(2.6, H - 3.0, 0.4, muro, 0, 3.0));
  for (const x of [-1.2, 1.2]) g.add(blocco(0.2, 3.0, 0.5, 0xFFFFFF, x, 0));
  g.add(blocco(2.6, 0.2, 0.5, 0xFFFFFF, 0, 2.9));
  // Fuori si intravede il giardino.
  g.add(blocco(2.4, 2.9, 0.05, new THREE.MeshBasicMaterial({ color: 0xCFEAFB }), 0, 0, -0.7));
  g.add(blocco(2.4, 0.5, 0.06, new THREE.MeshBasicMaterial({ color: 0x9CCB78 }), 0, 0, -0.66));
  const perno = new THREE.Group();
  perno.position.set(-1.1, 0, 0.05);
  perno.add(blocco(2.2, 2.8, 0.1, 0x9C5F34, 1.1, 0, 0));
  perno.add(blocco(1.2, 0.9, 0.12, 0xDDF1FF, 1.1, 1.5, 0));
  perno.add(blocco(0.12, 0.28, 0.12, 0xD8B85A, 1.9, 1.3, 0.1));
  g.add(perno);
  g.userData.apri = k => { perno.rotation.y = k * 1.45; };
  return g;
}

// ---------------------------------------------------------------------------
// Ostacoli
// ---------------------------------------------------------------------------

function giocattolo(var_) {
  const g = new THREE.Group();
  const v = var_ % 4;
  if (v === 0) {                         // cubi dell'alfabeto
    for (const [x, y, z, c] of [[-0.3, 0, 0, 0xE0533F], [0.3, 0, 0, 0x3A7CC4], [0, 0.3, 0, 0xF2C14E]]) {
      g.add(blocco(0.3, 0.3, 0.3, c, x, y, z));
      g.add(blocco(0.14, 0.14, 0.01, 0xFFFFFF, x, y + 0.08, -0.16));
    }
  } else if (v === 1) {                  // palla a spicchi
    const palla = sfera(0.16, S(0xE0533F), 0, 0.16, 0);
    g.add(palla);
    g.add(blocco(0.34, 0.07, 0.34, 0xF2C14E, 0, 0.12)); g.add(blocco(0.1, 0.3, 0.34, 0x3A7CC4, 0, 0));
  } else if (v === 2) {                  // trenino
    for (let i = 0; i < 3; i++) {
      g.add(blocco(0.36, 0.2, 0.5, PALETTE[(i + 1) % PALETTE.length], 0, 0.08, -0.55 + i * 0.55));
      g.add(cilindro(0.07, 0.05, 0x222222, -0.18, 0.02, -0.55 + i * 0.55));
    }
    g.add(blocco(0.3, 0.12, 0.3, 0xF2C14E, 0, 0.28, -0.55));
  } else {                               // paperella
    g.add(sfera(0.2, S(0xFFD23F), 0, 0.2, 0)); g.add(sfera(0.12, S(0xFFD23F), 0, 0.38, -0.12));
    g.add(blocco(0.12, 0.05, 0.1, 0xF08A3A, 0, 0.36, -0.28));
  }
  return g;
}

// Il piano del tavolino è un po' trasparente: si vede il bambino che ci passa sotto.
const velo = (colore, op = 0.55) => new THREE.MeshLambertMaterial({ color: colore, transparent: true, opacity: op, depthWrite: false });
function tavolino(var_) {
  const g = new THREE.Group();
  const sedia = var_ % 2 === 1;
  if (sedia) {                           // sedia: si passa sotto la seduta
    g.add(blocco(1.5, 0.08, 1.0, velo(0xC89B5E), 0, 0.5));
    g.add(blocco(1.5, 0.9, 0.08, 0xC89B5E, 0, 0.55, 0.46));
    for (const x of [-0.65, 0.65]) for (const z of [-0.4, 0.4]) g.add(blocco(0.08, 0.5, 0.08, 0x8C5E34, x, 0, z));
    g.add(blocco(1.4, 0.12, 0.9, velo(0xE0533F), 0, 0.58));
  } else {                               // tavolino con la tovaglia
    g.add(blocco(1.9, 0.07, 1.2, velo(0xFFF1D6, 0.6), 0, 0.52));
    g.add(blocco(1.94, 0.12, 1.24, velo(0x6FB3E0, 0.6), 0, 0.45));
    for (const x of [-0.85, 0.85]) for (const z of [-0.5, 0.5]) g.add(blocco(0.08, 0.5, 0.08, 0x8C5E34, x, 0, z));
    g.add(cilindro(0.15, 0.1, 0xE0533F, 0.3, 0.6, 0)); g.add(blocco(0.25, 0.25, 0.25, 0xF2C14E, -0.4, 0.6, 0.1));
  }
  return g;
}

function mobileCasa(p, e) {
  const g = new THREE.Group();
  if (e.lungo || p > 3) {                // credenza lunga con piante in cima
    g.add(blocco(1.9, 1.2, p, 0xB98B5A, 0, 0));
    g.add(blocco(1.96, 0.08, p + 0.04, 0x8C5E34, 0, 1.2));
    for (let z = -p / 2 + 0.7; z < p / 2 - 0.4; z += 1.4) g.add(blocco(0.04, 0.8, 1.1, 0x8C5E34, -0.96, 0.15, z));
    for (let z = -p / 2 + 1.0; z < p / 2 - 0.5; z += 2.2) { g.add(cilindro(0.22, 0.35, 0xC4694A, 0, 1.28, z)); g.add(sfera(0.3, new THREE.MeshLambertMaterial({ color: 0x3F8F4F, flatShading: true }), 0, 1.9, z)); }
    return g;
  }
  const v = (e.var ?? 0) % 4;
  if (v === 0) {                         // divano
    g.add(blocco(1.9, 0.55, 1.1, 0xE0894F, 0, 0)); g.add(blocco(1.9, 0.9, 0.3, 0xD0763B, 0, 0.1, 0.4));
    for (const x of [-0.95, 0.95]) g.add(blocco(0.25, 0.8, 1.1, 0xD0763B, x, 0));
    g.add(blocco(0.5, 0.3, 0.5, 0xFFF1D6, -0.4, 0.55, 0));
  } else if (v === 1) {                  // scatolone
    g.add(blocco(1.6, 1.3, 1.3, 0xC9A06A, 0, 0)); g.add(blocco(1.62, 0.06, 0.2, 0xE7D2A8, 0, 1.0, -0.4)); g.add(blocco(0.5, 0.1, 0.01, 0x8C5E34, 0, 0.6, -0.66));
  } else if (v === 2) {                  // cassa dei giochi
    g.add(blocco(1.7, 1.0, 1.0, 0x3A7CC4, 0, 0)); g.add(blocco(1.76, 0.12, 1.06, 0xF2C14E, 0, 1.0));
    for (const [x, c] of [[-0.5, 0xE0533F], [0.4, 0x4CAF6A]]) g.add(blocco(0.4, 0.4, 0.4, c, x, 1.12, 0));
  } else {                               // cesta del bucato
    g.add(cilindro(0.62, 1.1, 0xF0DDB8)); g.add(cilindro(0.66, 0.08, 0xB98B5A, 0, 1.05));
    g.add(blocco(0.6, 0.35, 0.5, 0xFFB3C1, 0.1, 1.1, 0));
  }
  return g;
}

function gatto(e) {
  const v = e.var ?? 0;
  const pelo = [0xE59A4F, 0x6C6C74, 0x2A2A30, 0xEFE6D5][v % 4];
  const g = new THREE.Group();
  g.add(blocco(0.3, 0.28, 0.65, pelo, 0, 0.22));
  for (const [x, z] of [[-0.1, -0.22], [0.1, -0.22], [-0.1, 0.22], [0.1, 0.22]]) g.add(blocco(0.08, 0.22, 0.1, pelo, x, 0, z));
  g.add(blocco(0.28, 0.26, 0.26, pelo, 0, 0.36, -0.38));
  for (const x of [-0.09, 0.09]) { g.add(blocco(0.07, 0.1, 0.05, pelo, x, 0.6, -0.4)); g.add(blocco(0.05, 0.05, 0.02, BASIC(0xAEE08A), x * 0.9, 0.46, -0.52)); }
  g.add(blocco(0.05, 0.03, 0.02, BASIC(0xE98A8A), 0, 0.42, -0.52));
  const coda = blocco(0.07, 0.07, 0.55, pelo, 0, 0.4, 0.5);
  coda.rotation.x = -0.6; g.add(coda);
  return g;
}

function creaGattoCompagno(e) {
  const g = new THREE.Group();
  const gt = gatto(e);
  gt.scale.setScalar(1.15);
  gt.rotation.y = e.via ? 0 : Math.PI;
  g.add(gt);
  g.userData.anima = t => { gt.position.y = Math.abs(Math.sin(t * 7 + (e.var ?? 0))) * 0.03; gt.rotation.z = Math.sin(t * 7) * 0.05; };
  return g;
}

OSTACOLI.casa = {
  proprio: true,
  basso: (p, e) => giocattolo(e.var ?? 0),
  alto: (p, e) => tavolino(e.var ?? 0),
  muro: (p, e) => mobileCasa(p, e),
  persona: (p, e) => creaGattoCompagno(e),
};

// --- Darmon: all'aperto -----------------------------------------------------

function zainoATerra(var_) {
  const g = new THREE.Group();
  const c = PALETTE[var_ % PALETTE.length];
  g.add(blocco(0.55, 0.55, 0.3, c, 0, 0));
  g.add(blocco(0.42, 0.25, 0.1, 0xFFFFFF, 0, 0.05, -0.2));
  g.add(blocco(0.5, 0.06, 0.34, 0x333333, 0, 0.5));
  return g;
}

function pallone(var_) {
  const g = new THREE.Group();
  g.add(sfera(0.3, S(var_ % 2 ? 0xFFFFFF : 0xF2C14E), 0, 0.3, 0));
  g.add(blocco(0.62, 0.08, 0.62, 0x222222, 0, 0.26)); g.add(blocco(0.08, 0.6, 0.62, 0x222222, 0, 0));
  return g;
}

function arcoPalloncini(var_) {
  const g = new THREE.Group();
  for (const x of [-0.95, 0.95]) g.add(blocco(0.09, 2.6, 0.09, 0xFFFFFF, x, 0));
  g.add(blocco(2.0, 0.1, 0.1, 0xFFFFFF, 0, 1.0));
  const cartello = scritta('Evviva', 1.5, 0.45, 0xE0533F, 0xFFFFFF);
  cartello.position.set(0, 1.35, 0); g.add(cartello);
  for (let i = 0; i < 12; i++) {
    const a = (i / 11) * Math.PI;
    const b = sfera(0.24, S(PALETTE[(i + var_) % PALETTE.length]), -Math.cos(a) * 1.0, 2.0 + Math.sin(a) * 0.6, 0);
    b.scale.set(0.24, 0.3, 0.24);
    g.add(b);
  }
  return g;
}

function fioriera() {
  const g = new THREE.Group();
  g.add(blocco(1.9, 0.8, 0.8, 0xC8B79A, 0, 0));
  g.add(blocco(1.8, 0.12, 0.7, 0x6B4A2B, 0, 0.8));
  for (let i = 0; i < 8; i++) g.add(sfera(0.2, S(PALETTE[i % PALETTE.length]), -0.75 + i * 0.21, 1.1 + (i % 3) * 0.08, ((i * 37) % 3 - 1) * 0.15));
  for (let i = 0; i < 6; i++) g.add(sfera(0.3, new THREE.MeshLambertMaterial({ color: 0x4FA35E, flatShading: true }), -0.8 + i * 0.32, 1.0, 0));
  return g;
}

function bambino(e) {
  const v = e.var ?? 0;
  const p = creaPersona({
    maglia: [0x233A73, 0x2B2B3A, 0x2C6A4F, 0x7A2E3A][v % 4], capelli: [0x2B1D14, 0x5A3A22, 0xC8A25A, 0x15110E][(v >> 1) % 4],
    pantaloni: 0x3A3F52, zaino: PALETTE[(v + 3) % PALETTE.length], conZaino: true,
  });
  const g = new THREE.Group();
  p.radice.scale.setScalar(0.56 + (v % 3) * 0.03);
  p.radice.rotation.y = e.via ? 0 : Math.PI;
  g.add(p.radice);
  g.userData.anima = e.via ? (t => posaCorsa(p, t * 5 + v, 0.5)) : (t => posaCorsa(p, t * 8 + v, 0.75));
  return g;
}

OSTACOLI.darmon = {
  proprio: true,
  basso: (p, e) => ((e.var ?? 0) % 2 ? pallone(e.var) : zainoATerra(e.var ?? 0)),
  alto: (p, e) => arcoPalloncini(e.var ?? 0),
  muro: (p, e) => (e.var % 2 ? fioriera() : creaAuto(e)),
  persona: (p, e) => bambino(e),
};

// --- Darmon: dentro la scuola -----------------------------------------------

function festoni(var_) {
  const g = new THREE.Group();
  for (const x of [-1.0, 1.0]) g.add(blocco(0.08, 2.4, 0.08, 0x5B6B7A, x, 0));
  g.add(blocco(2.1, 0.05, 0.05, 0x5B6B7A, 0, 1.4));
  for (let i = 0; i < 9; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 3), S(PALETTE[(i + var_) % PALETTE.length]));
    t.rotation.x = Math.PI; t.scale.z = 0.2;
    t.position.set(-0.85 + i * 0.21, 1.2, 0);
    g.add(t);
  }
  return g;
}

function cuboAlfabeto(var_) {
  const g = new THREE.Group();
  const c = PALETTE[var_ % PALETTE.length];
  g.add(blocco(1.5, 1.5, 1.5, c, 0, 0));
  const lettera = scritta(['A', 'B', 'C', '1', '2', '3'][var_ % 6], 1.0, 1.0, 0xFFFFFF, c);
  lettera.position.set(0, 0.75, -0.76);
  g.add(lettera);
  return g;
}

function cubbies(p, var_) {
  const g = new THREE.Group();
  g.add(blocco(1.5, 1.4, p, 0xE9D2A0, 0, 0));
  for (let z = -p / 2 + 0.5; z < p / 2 - 0.2; z += 1.0) {
    g.add(blocco(0.04, 1.2, 0.9, 0xB08A55, -0.76, 0.1, z));
    g.add(blocco(0.1, 0.5, 0.5, PALETTE[(Math.round(z * 3) + var_ + 24) % PALETTE.length], -0.78, 0.55, z));
  }
  return g;
}

OSTACOLI.darmonInt = {
  proprio: true,
  basso: (p, e) => ((e.var ?? 0) % 2 ? pallone(e.var) : zainoATerra(e.var ?? 0)),
  alto: (p, e) => festoni(e.var ?? 0),
  muro: (p, e) => (p > 2 ? cubbies(p, e.var ?? 0) : cuboAlfabeto(e.var ?? 0)),
  persona: (p, e) => bambino(e),
};

// ---------------------------------------------------------------------------
// Bonus: biberon in casa, merendina all'Istituto, caffè altrove
// ---------------------------------------------------------------------------

function alone() {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
  );
  m.position.y = 0.14;
  return m;
}

function biberon() {
  const g = new THREE.Group();
  const vetro = new THREE.MeshLambertMaterial({ color: 0xE8F4FF, transparent: true, opacity: 0.85 });
  g.add(cilindro(0.16, 0.34, vetro, 0, -0.1));
  g.add(cilindro(0.15, 0.2, 0xFFFFFF, 0, -0.1));                 // latte
  g.add(cilindro(0.19, 0.07, 0x4FA3E0, 0, 0.24));                 // ghiera
  const tettarella = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 10), S(0xF2D2A0));
  tettarella.position.y = 0.42; g.add(tettarella);
  g.add(blocco(0.02, 0.18, 0.01, 0x4FA3E0, 0, 0.0, -0.17));
  g.add(alone());
  return g;
}

function merendina() {
  const g = new THREE.Group();
  g.add(blocco(0.42, 0.14, 0.26, 0xF08A3A, 0, 0.1));
  g.add(blocco(0.3, 0.15, 0.01, 0xFFFFFF, 0, 0.1, -0.135));
  g.add(blocco(0.1, 0.1, 0.3, 0xD96B1E, -0.24, 0.12));
  g.add(blocco(0.1, 0.1, 0.3, 0xD96B1E, 0.24, 0.12));
  g.add(alone());
  return g;
}

export function creaBonus(stile) {
  if (stile === 'casa') return biberon();
  if (stile === 'darmon') return merendina();
  return creaCaffe();
}

export const ICONA_BONUS = { casa: '🍼', darmon: '🥪' };

// ---------------------------------------------------------------------------
// La facciata dell'Istituto Darmon, vista da lontano e da vicino
// ---------------------------------------------------------------------------

const texFacciata = tela(512, 256, (g, W, H) => {
  g.fillStyle = '#F2D79C'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,.05)';
  for (let y = 0; y < H; y += 10) g.fillRect(0, y, W, 2);
  for (const y of [28, 142]) {
    for (let x = 22; x < W - 40; x += 82) {
      g.fillStyle = '#FFFFFF'; g.fillRect(x - 5, y - 5, 54, 86);
      g.fillStyle = '#6FA8CE'; g.fillRect(x, y, 44, 76);
      g.fillStyle = '#FFFFFF'; g.fillRect(x + 20, y, 4, 76); g.fillRect(x, y + 34, 44, 4);
      g.fillStyle = '#4C9A5F'; g.fillRect(x - 8, y + 80, 60, 8);
    }
  }
});

function cartelloDarmon() {
  const tex = tela(1024, 240, (g, W, H) => {
    g.fillStyle = '#2F5D9E'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '800 62px "Bricolage Grotesque", system-ui, sans-serif';
    g.fillText('SCUOLA ELEMENTARE', W / 2, 100, W - 80);
    g.font = '800 92px "Bricolage Grotesque", system-ui, sans-serif';
    g.fillText('ISTITUTO DARMON', W / 2, 196, W - 80);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(9, 2.1), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
}

// L'apertura al centro è l'ingresso: le ante di vetro scorrono ai lati quando ci si avvicina.
export function creaScuolaDarmon() {
  const g = new THREE.Group();
  const lat = new THREE.MeshLambertMaterial({ color: 0xE8CA8A, fog: false });
  const front = new THREE.MeshLambertMaterial({ map: texFacciata, fog: false });
  const M = (w, h, p, mat, x, y, z) => blocco(w, h, p, mat, x, y, z);
  // Due corpi laterali e architrave sopra l'ingresso (largo 6,4 m).
  const corpo = (x, larg) => {
    const m = new THREE.Mesh(CUBO, [lat, lat, lat, lat, front, lat]);
    m.scale.set(larg, 9.5, 3.2); m.position.set(x, 4.75, -1.4); m.castShadow = true; g.add(m);
  };
  corpo(-3.2 - 9, 18); corpo(3.2 + 9, 18);
  g.add(M(6.4, 5.3, 3.2, lat, 0, 4.2, -1.4));
  const portale = new THREE.MeshLambertMaterial({ color: 0xD9553F, fog: false });
  g.add(M(0.5, 4.2, 0.5, portale, -3.1, 0, 0.3)); g.add(M(0.5, 4.2, 0.5, portale, 3.1, 0, 0.3)); g.add(M(7.0, 0.5, 0.5, portale, 0, 4.2, 0.3));
  const cartello = cartelloDarmon();
  cartello.position.set(0, 7.2, 0.3); g.add(cartello);
  // Tetto a spiovente e bandiere.
  const tetto = new THREE.Mesh(new THREE.BoxGeometry(40, 0.6, 5), new THREE.MeshLambertMaterial({ color: 0xB05A3A, fog: false }));
  tetto.position.set(0, 9.8, -1.4); g.add(tetto);
  for (const [x, c1, c2, c3] of [[-2.0, 0x2e9d4a, 0xffffff, 0xd8352a]]) {
    g.add(M(0.1, 5, 0.1, S(0x9aa3ad), x, 10, -1.0));
    g.add(M(0.5, 0.9, 0.05, S(c1), x - 0.3, 14, -1.0)); g.add(M(0.5, 0.9, 0.05, S(c2), x, 14, -1.0)); g.add(M(0.5, 0.9, 0.05, S(c3), x + 0.3, 14, -1.0));
  }
  // Porta a vetri a due ante.
  const vetro = new THREE.MeshLambertMaterial({ color: 0x9CC8E0, fog: false });
  const telaio = new THREE.MeshLambertMaterial({ color: 0x2F5D9E, fog: false });
  const ante = [-1, 1].map(lato => {
    const anta = new THREE.Group();
    anta.add(M(3.1, 3.9, 0.12, vetro, 0, 0, 0));
    anta.add(M(3.1, 0.18, 0.2, telaio, 0, 0, 0)); anta.add(M(3.1, 0.18, 0.2, telaio, 0, 3.72, 0));
    anta.add(M(0.18, 3.9, 0.2, telaio, -lato * 1.46, 0, 0)); anta.add(M(0.18, 3.9, 0.2, telaio, lato * 1.46, 0, 0));
    anta.position.set(lato * 1.6, 0, -0.2);
    g.add(anta);
    return { anta, lato };
  });
  g.userData.apri = k => { for (const { anta, lato } of ante) anta.position.x = lato * (1.6 + 3.3 * k); };
  // Cancello e recinzione colorata davanti.
  for (const x of [-14, 14]) {
    for (let i = 0; i < 7; i++) g.add(M(0.14, 1.6, 0.14, S(PALETTE[(i + (x > 0 ? 3 : 0)) % PALETTE.length]), x + (x > 0 ? 1 : -1) * (i * 1.3), 0, 6.0));
    g.add(M(9.5, 0.12, 0.12, S(0x3A3F4A), x + (x > 0 ? 4 : -4), 1.2, 6.0));
  }
  const mats = [];
  g.traverse(o => {
    if (o.material && !Array.isArray(o.material)) mats.push(o.material);
    if (Array.isArray(o.material)) mats.push(...o.material);
  });
  g.userData.materiali = mats.filter(m => !m.map).map(m => ({ m, base: m.color.clone() }));
  return g;
}

