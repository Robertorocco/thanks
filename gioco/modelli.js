// Modelli 3D low-poly del gioco: Roberto, ostacoli di ogni mondo, edifici e decorazioni.
// Tutto è costruito con forme semplici e texture disegnate al volo, senza file esterni,
// tranne le foto dei luoghi (assets/luoghi) se presenti. Il volto di Roberto è in volto.js.

import * as THREE from './lib/three.module.min.js';
import { creaTestaRoberto, ETA_VOLTO } from './volto.js';

// ---------------------------------------------------------------------------
// Utilità condivise
// ---------------------------------------------------------------------------

const cacheMateriali = new Map();
export function materiale(colore, extra = {}) {
  const chiave = colore + JSON.stringify(extra);
  if (!cacheMateriali.has(chiave)) {
    cacheMateriali.set(chiave, new THREE.MeshLambertMaterial({ color: colore, ...extra }));
  }
  return cacheMateriali.get(chiave);
}

export const CUBO = new THREE.BoxGeometry(1, 1, 1);
export const CILINDRO = new THREE.CylinderGeometry(1, 1, 1, 14);
export const SFERA = new THREE.SphereGeometry(1, 14, 10);

export function ombre(m) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Parallelepipedo con la base all'altezza y (a terra se non indicata). Lo stesso vale per cilindro().
export function blocco(w, h, p, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(CUBO, typeof mat === 'number' ? materiale(mat) : mat);
  m.scale.set(w, h, p);
  m.position.set(x, y + h / 2, z);
  return ombre(m);
}

export function cilindro(r, h, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(CILINDRO, typeof mat === 'number' ? materiale(mat) : mat);
  m.scale.set(r, h, r);
  m.position.set(x, y + h / 2, z);
  return ombre(m);
}

export function sfera(r, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(SFERA, typeof mat === 'number' ? materiale(mat) : mat);
  m.scale.setScalar(r);
  m.position.set(x, y, z);
  return ombre(m);
}

export function tela(w, h, disegna) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  disegna(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export const esa = n => '#' + n.toString(16).padStart(6, '0');
export const FONT = '"Bricolage Grotesque", "Avenir Next", system-ui, sans-serif';

const cacheScritte = new Map();
// Pannello con una scritta, largo w e alto h metri.
export function scritta(testo, w, h, sfondo, inchiostro = 0x1C1D2B) {
  const chiave = `${testo}|${sfondo}|${inchiostro}|${w / h}`;
  if (!cacheScritte.has(chiave)) {
    const px = 128;
    const tex = tela(Math.round(px * w / h), px, (g, W, H) => {
      g.fillStyle = esa(sfondo); g.fillRect(0, 0, W, H);
      g.fillStyle = esa(inchiostro);
      g.font = `800 ${H * 0.55}px ${FONT}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(testo.toUpperCase(), W / 2, H * 0.54, W * 0.92);
    });
    cacheScritte.set(chiave, new THREE.MeshBasicMaterial({ map: tex }));
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cacheScritte.get(chiave));
  m.rotation.y = 0;
  return m;
}

// Il lato visibile degli ostacoli guarda verso la telecamera (+z).
export function fronte(mesh, z) {
  mesh.position.z = z;
  return mesh;
}

// ---------------------------------------------------------------------------
// Texture degli edifici
// ---------------------------------------------------------------------------

const facciate = {
  // Palazzo napoletano: intonaco, finestre con persiane verdi, balconi.
  napoli: tela(256, 256, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(0,0,0,.06)';
    for (let y = 0; y < 256; y += 8) g.fillRect(0, y, 256, 1);
    for (const x of [40, 152]) {
      for (const y of [30, 158]) {
        g.fillStyle = '#e9e3d6'; g.fillRect(x - 6, y - 6, 76, 104);
        g.fillStyle = '#2e5a3c'; g.fillRect(x, y, 30, 80); g.fillRect(x + 34, y, 30, 80);
        g.fillStyle = 'rgba(0,0,0,.25)';
        for (let k = y + 4; k < y + 80; k += 6) { g.fillRect(x, k, 30, 2); g.fillRect(x + 34, k, 30, 2); }
        g.fillStyle = '#3a3a3a'; g.fillRect(x - 12, y + 84, 88, 6);
        for (let k = x - 10; k < x + 76; k += 8) g.fillRect(k, y + 66, 2, 20);
      }
    }
  }),
  // Edificio moderno: vetrate in griglia.
  moderno: tela(256, 256, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 64) {
      for (let y = 0; y < 256; y += 64) {
        const grad = g.createLinearGradient(x, y, x + 64, y + 64);
        grad.addColorStop(0, '#5d7a96'); grad.addColorStop(1, '#2c3e52');
        g.fillStyle = grad; g.fillRect(x + 6, y + 8, 52, 46);
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 8, y + 10, 14, 42);
      }
    }
  }),
  // Case a graticcio bretoni.
  colombage: tela(256, 256, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#5a3a22'; g.lineWidth = 12;
    g.strokeRect(6, 6, 244, 244);
    g.beginPath();
    g.moveTo(128, 0); g.lineTo(128, 256);
    g.moveTo(0, 128); g.lineTo(256, 128);
    g.moveTo(0, 0); g.lineTo(128, 128); g.moveTo(256, 0); g.lineTo(128, 128);
    g.moveTo(0, 256); g.lineTo(128, 128); g.moveTo(256, 256); g.lineTo(128, 128);
    g.stroke();
    g.fillStyle = '#34495e';
    for (const [x, y] of [[40, 40], [176, 40], [40, 168], [176, 168]]) {
      g.fillStyle = '#f1ece0'; g.fillRect(x - 6, y - 6, 52, 60);
      g.fillStyle = '#34495e'; g.fillRect(x, y, 40, 48);
      g.fillStyle = '#f1ece0'; g.fillRect(x + 18, y, 4, 48); g.fillRect(x, y + 22, 40, 4);
    }
  }),
  // Festival: pannelli scuri con strisce luminose.
  festival: tela(256, 256, (g) => {
    g.fillStyle = '#181020'; g.fillRect(0, 0, 256, 256);
    const colori = ['#ff4fa3', '#3ee0d0', '#ffd23f', '#9b5cff'];
    for (let i = 0; i < 8; i++) {
      g.fillStyle = colori[i % 4];
      g.fillRect(0, 16 + i * 30, 256, 5);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = colori[i % 4];
      g.beginPath(); g.arc((i * 53) % 256, (i * 97) % 256, 3, 0, Math.PI * 2); g.fill();
    }
  }),
};
for (const t of Object.values(facciate)) t.wrapS = t.wrapT = THREE.RepeatWrapping;

// Una foto di un luogo vero, se presente in assets/luoghi/, sostituisce la facciata.
export const loader = new THREE.TextureLoader();
const fotoLuoghi = new Map();
export function caricaFotoLuogo(nome) {
  if (fotoLuoghi.has(nome)) return;
  fotoLuoghi.set(nome, null);
  loader.load(`assets/luoghi/${nome}.jpg`, tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    fotoLuoghi.set(nome, tex);
  }, undefined, () => {});
}

const STILE_FACCIATA = {
  liceo: 'napoli', darmon: 'napoli', triennale: 'napoli', magistrale: 'moderno', festival: 'festival', rennes: 'colombage',
};

export function creaEdificio(e, mondo) {
  const tipo = STILE_FACCIATA[mondo.stile];
  const tex = facciate[tipo].clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(e.profondita / 3)), Math.max(1, Math.round(e.altezza / 3)));
  const texFronte = facciate[tipo].clone();
  texFronte.needsUpdate = true;
  texFronte.repeat.set(Math.max(1, Math.round(e.larghezza / 3)), Math.max(1, Math.round(e.altezza / 3)));
  const opzioni = mondo.stile === 'festival'
    ? { emissive: 0xffffff, emissiveIntensity: 0.9 }
    : {};
  const lato = new THREE.MeshLambertMaterial({ color: e.colore, map: tex, ...opzioni, emissiveMap: opzioni.emissive ? tex : null });
  const davanti = new THREE.MeshLambertMaterial({ color: e.colore, map: texFronte, ...opzioni, emissiveMap: opzioni.emissive ? texFronte : null });
  const tetto = materiale(0x55504a);
  const g = new THREE.Group();
  const m = new THREE.Mesh(CUBO, [lato, lato, tetto, tetto, davanti, davanti]);
  m.scale.set(e.larghezza, e.altezza, e.profondita);
  m.position.y = e.altezza / 2;
  m.receiveShadow = true;
  g.add(m);
  // Cornicione sul tetto.
  if (mondo.stile !== 'festival') g.add(blocco(e.larghezza + 0.3, 0.3, e.profondita + 0.3, 0xe8e2d4, 0, e.altezza));
  if (mondo.stile === 'rennes') {
    // Tetto a punta in ardesia.
    const tettoPunta = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), materiale(0x3d4450));
    tettoPunta.scale.set(e.larghezza * 0.75, 2.2, e.profondita * 0.75);
    tettoPunta.rotation.y = Math.PI / 4;
    tettoPunta.position.y = e.altezza + 1.1;
    g.add(tettoPunta);
  }
  g.position.x = e.lato * (6.2 + e.larghezza / 2 + e.scarto);
  return g;
}

// Monumento all'inizio di un mondo, con la foto del luogo se presente.
export function creaMonumento(e, mondo) {
  const g = new THREE.Group();
  const foto = fotoLuoghi.get(mondo.stile);
  const w = 14, h = 9;
  const mat = foto
    ? new THREE.MeshBasicMaterial({ map: foto })
    : new THREE.MeshLambertMaterial({ color: mondo.edifici[0], map: facciate[STILE_FACCIATA[mondo.stile]] });
  const quadro = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  quadro.position.set(0, h / 2 + 0.5, 0);
  g.add(quadro);
  g.add(blocco(w + 0.6, 0.5, 0.6, 0xe8e2d4, 0, 0));
  g.position.x = e.lato * 14;
  g.rotation.y = -e.lato * 0.35;
  return g;
}

export function creaLampione(lato) {
  const g = new THREE.Group();
  g.add(cilindro(0.07, 4.2, 0x2b2f36));
  g.add(blocco(1.1, 0.08, 0.08, 0x2b2f36, -lato * 0.5, 4.15));
  g.add(blocco(0.4, 0.14, 0.24, 0xfff3c4, -lato * 1.0, 4.05));
  g.position.x = lato * 4.4;
  return g;
}

export function creaAlbero(lato, scala = 1) {
  const g = new THREE.Group();
  g.add(cilindro(0.15, 1.4, 0x6b4a2b));
  const chioma = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), materiale(0x4f7d3a, { flatShading: true }));
  chioma.position.y = 2.2;
  chioma.castShadow = true;
  g.add(chioma);
  g.scale.setScalar(scala);
  g.position.x = lato * 5.0;
  return g;
}

// ---------------------------------------------------------------------------
// Ostacoli, uno stile per mondo
// ---------------------------------------------------------------------------
//
// Ingombri da rispettare (devono combaciare con il controllo urti in main.js):
//   basso: da terra fino a 0.85 m   -> si salta
//   alto:  da 1.2 m in su           -> si scivola sotto
//   muro:  tutta l'altezza          -> si cambia corsia

const LEGNO = 0xC89B5E, METALLO = 0x3B4A5A;

export const OSTACOLI = {
  liceo: {
    basso: () => {
      // Banco di scuola con pannello frontale e zaino appoggiato.
      const g = new THREE.Group();
      g.add(blocco(1.7, 0.06, 0.7, LEGNO, 0, 0.74));
      for (const x of [-0.78, 0.78]) for (const z of [-0.3, 0.3]) g.add(blocco(0.05, 0.74, 0.05, METALLO, x, 0, z));
      g.add(fronte(blocco(1.6, 0.45, 0.03, METALLO, 0, 0.28), 0.32));
      g.add(blocco(0.45, 0.5, 0.25, 0xB03A2E, 0.45, 0, 0.45));
      return g;
    },
    alto: () => {
      // Lavagna appesa tra due montanti.
      const g = new THREE.Group();
      g.add(blocco(1.9, 1.0, 0.08, LEGNO, 0, 1.25));
      g.add(fronte(blocco(1.75, 0.86, 0.02, 0x2F5D3A, 0, 1.32), 0.05));
      const gesso = scritta('a² + b² = c²', 1.2, 0.3, 0x2F5D3A, 0xffffff);
      gesso.position.set(0, 1.78, 0.07);
      g.add(gesso);
      for (const x of [-1.0, 1.0]) g.add(blocco(0.08, 2.6, 0.08, METALLO, x, 0));
      return g;
    },
    muro: (p) => {
      // Fila di armadietti.
      const g = new THREE.Group();
      for (const [i, x] of [-0.62, 0, 0.62].entries()) {
        g.add(blocco(0.6, 2.5, p, [0x5577AA, 0x4B6A99, 0x6A88B8][i], x, 0));
        for (const y of [0.9, 1.9]) g.add(fronte(blocco(0.3, 0.04, 0.02, 0x1C1D2B, x, y), p / 2 + 0.01));
        g.add(fronte(blocco(0.04, 0.2, 0.02, 0xdddddd, x + 0.2, 1.3), p / 2 + 0.01));
      }
      return g;
    },
  },
  triennale: {
    basso: () => {
      // Due pile di libri.
      const g = new THREE.Group();
      const colori = [0x2C5F8A, 0xB03A2E, 0xC9962E, 0x2F5D3A, 0x6B4A8E, 0xE8E2D4];
      for (const [k, cx] of [-0.45, 0.45].entries()) {
        let y = 0;
        for (let i = 0; i < 5; i++) {
          const h = 0.13 + ((i + k) % 3) * 0.03;
          const libro = blocco(0.8 - (i % 2) * 0.1, h, 0.55, colori[(i + k * 2) % colori.length], cx + ((i % 3) - 1) * 0.04, y);
          libro.rotation.y = ((i * 37 + k * 11) % 9 - 4) * 0.03;
          g.add(libro);
          y += h;
        }
      }
      return g;
    },
    alto: () => {
      // Striscione "Esame" tra due pali.
      const g = new THREE.Group();
      for (const x of [-1.0, 1.0]) g.add(cilindro(0.05, 2.6, 0xdddddd, x));
      const telo = scritta('Esame', 2.0, 0.85, 0xB03A2E, 0xffffff);
      telo.position.set(0, 1.75, 0);
      g.add(telo);
      const retro = telo.clone(); retro.rotation.y = Math.PI; retro.position.z = -0.01;
      g.add(retro);
      return g;
    },
    muro: (p) => {
      // Muro di tufo con la porta dell'aula.
      const g = new THREE.Group();
      g.add(blocco(1.95, 2.8, p, 0xC9A86A, 0, 0));
      g.add(fronte(blocco(0.9, 2.0, 0.04, 0x6b4a2b, 0, 0), p / 2 + 0.02));
      const cartello = scritta('Sessione', 1.4, 0.3, 0xffffff);
      cartello.position.set(0, 2.35, p / 2 + 0.03);
      g.add(cartello);
      return g;
    },
  },
  magistrale: {
    basso: () => {
      // Cassa di attrezzature con strisce di sicurezza.
      const g = new THREE.Group();
      g.add(blocco(1.6, 0.7, 0.8, 0x4a5563, 0, 0));
      g.add(blocco(1.65, 0.12, 0.85, 0xF2C14E, 0, 0.7));
      const etichetta = fronte(scritta('Fragile', 0.8, 0.22, 0xF2C14E), 0.41);
      etichetta.position.y = 0.4;
      g.add(etichetta);
      return g;
    },
    alto: () => {
      // Braccio robotico che attraversa la corsia.
      const g = new THREE.Group();
      g.add(cilindro(0.25, 0.3, 0x3A3F4A, 1.0));
      g.add(cilindro(0.14, 1.6, 0xE07A2E, 1.0, 0.3));
      g.add(sfera(0.2, 0x3A3F4A, 1.0, 1.95));
      const link = cilindro(0.13, 1.8, 0xE07A2E, 0.1, 0);
      link.rotation.z = Math.PI / 2;
      link.position.y = 1.95;
      g.add(link);
      g.add(sfera(0.17, 0x3A3F4A, -0.8, 1.95));
      g.add(blocco(0.12, 0.45, 0.3, 0x3A3F4A, -0.8, 1.4));
      g.add(blocco(0.25, 0.08, 0.06, 0x888888, -0.8, 1.32, 0.1));
      g.add(blocco(0.25, 0.08, 0.06, 0x888888, -0.8, 1.32, -0.1));
      return g;
    },
    muro: (p) => {
      // Robot a due braccia.
      const g = new THREE.Group();
      g.add(blocco(1.3, 0.5, Math.max(p, 0.9), 0x3A3F4A, 0, 0));
      g.add(blocco(0.7, 1.2, 0.5, 0xF2F2F2, 0, 0.5));
      g.add(blocco(0.5, 0.45, 0.45, 0xF2F2F2, 0, 1.75));
      g.add(fronte(blocco(0.42, 0.14, 0.02, 0x1C1D2B, 0, 1.92), 0.235));
      for (const s of [-1, 1]) {
        g.add(sfera(0.14, 0xE07A2E, s * 0.45, 1.55));
        const braccio = blocco(0.12, 0.9, 0.12, 0xE07A2E, s * 0.62, 0.75);
        braccio.rotation.z = s * 0.35;
        g.add(braccio);
      }
      g.add(cilindro(0.02, 0.4, 0x888888, 0.15, 2.2));
      g.add(sfera(0.05, 0xff3b30, 0.15, 2.62));
      return g;
    },
  },
  festival: {
    basso: () => {
      // Cassa audio.
      const g = new THREE.Group();
      g.add(blocco(1.5, 0.8, 0.7, 0x1A1A1A, 0, 0));
      for (const x of [-0.4, 0.4]) {
        const cono = cilindro(0.25, 0.04, 0x444444, x, 0.4, 0.36);
        cono.rotation.x = Math.PI / 2;
        g.add(cono);
        const centro = cilindro(0.08, 0.05, 0x3EE0D0, x, 0.4, 0.37);
        centro.rotation.x = Math.PI / 2;
        g.add(centro);
      }
      return g;
    },
    alto: () => {
      // Traliccio con luci colorate.
      const g = new THREE.Group();
      for (const x of [-1.0, 1.0]) g.add(blocco(0.14, 2.8, 0.14, 0x888888, x, 0));
      g.add(blocco(2.1, 0.35, 0.35, 0x666666, 0, 1.3));
      const luci = [0xFF4FA3, 0x3EE0D0, 0xFFD23F, 0x9b5cff];
      for (let i = 0; i < 4; i++) {
        g.add(sfera(0.13, new THREE.MeshBasicMaterial({ color: luci[i] }), -0.75 + i * 0.5, 1.42, 0.25));
      }
      const telo = scritta('ElRow', 1.6, 0.5, 0xFF4FA3, 0xffffff);
      telo.position.set(0, 1.95, 0.05);
      g.add(telo);
      return g;
    },
    muro: (p) => {
      // Bancone del bar con scaffale di bottiglie.
      const g = new THREE.Group();
      g.add(blocco(1.95, 1.15, p, 0x5a2d82, 0, 0));
      g.add(blocco(2.05, 0.08, p + 0.1, 0x222222, 0, 1.15));
      g.add(blocco(1.95, 1.5, 0.3, 0x2a1640, 0, 1.23, -p / 2 + 0.15));
      const colori = [0x3EE0D0, 0xFFD23F, 0xFF4FA3, 0x7bd389, 0xffffff];
      for (let i = 0; i < 7; i++) {
        g.add(cilindro(0.06, 0.32, new THREE.MeshBasicMaterial({ color: colori[i % 5] }), -0.75 + i * 0.25, 1.55, -p / 2 + 0.3));
      }
      const insegna = scritta('Bar', 0.9, 0.35, 0x3EE0D0);
      insegna.position.set(0, 0.6, p / 2 + 0.01);
      g.add(insegna);
      g.add(blocco(0.4, 2.8, 0.3, 0x2a1640, -0.8, 0, -p / 2 + 0.15));
      return g;
    },
  },
  rennes: {
    basso: () => {
      // Transenna con cartello.
      const g = new THREE.Group();
      for (const x of [-0.8, 0.8]) g.add(blocco(0.06, 0.82, 0.5, 0x8a9199, x, 0));
      g.add(blocco(1.7, 0.06, 0.06, 0x8a9199, 0, 0.76));
      const pannello = scritta('Travaux', 1.5, 0.45, 0xE9E4D8, 0xB03A2E);
      pannello.position.set(0, 0.45, 0.04);
      g.add(pannello);
      return g;
    },
    alto: () => {
      // Insegna "Bienvenue à Rennes".
      const g = new THREE.Group();
      for (const x of [-1.0, 1.0]) g.add(cilindro(0.05, 2.6, 0x1F2A44, x));
      const insegna = scritta('Bienvenue', 2.0, 0.7, 0x1F2A44, 0xffffff);
      insegna.position.set(0, 1.7, 0.02);
      g.add(insegna);
      g.add(blocco(2.05, 0.75, 0.03, 0x1F2A44, 0, 1.33));
      return g;
    },
    muro: (p) => {
      // Robot mobile: base circolare, colonna, testa con due telecamere, un braccio.
      const g = new THREE.Group();
      g.add(cilindro(0.65, 0.45, 0xE9E4D8));
      g.add(cilindro(0.66, 0.06, 0x3A3F4A, 0, 0.45));
      g.add(blocco(0.45, 1.3, 0.45, 0xE9E4D8, 0, 0.5));
      g.add(blocco(0.75, 0.45, 0.55, 0xE9E4D8, 0, 1.8));
      g.add(blocco(0.4, 0.35, 0.38, 0xE9E4D8, 0, 2.25));
      for (const x of [-0.1, 0.1]) {
        const occhio = cilindro(0.05, 0.04, 0x1C1D2B, x, 2.42, 0.2);
        occhio.rotation.x = Math.PI / 2;
        g.add(occhio);
      }
      const braccio = blocco(0.14, 0.75, 0.14, 0x3A3F4A, 0.5, 1.35);
      braccio.rotation.z = -0.4;
      g.add(braccio);
      g.add(blocco(0.14, 0.6, 0.14, 0x3A3F4A, 0.62, 0.95, 0.2));
      // Ingombro pieno: la base del robot copre la corsia anche ai lati.
      g.add(blocco(1.8, 0.12, Math.max(p, 0.6), 0x3A3F4A, 0, 0));
      return g;
    },
  },
};

// Pareti lunghe dei corridoi: stesse tinte del mondo, con fasce decorative.
function muroLungo(mondo, p) {
  const g = new THREE.Group();
  const col = mondo.ostacoli.muro;
  g.add(blocco(1.95, 2.7, p, col, 0, 0));
  g.add(blocco(2.0, 0.25, p + 0.02, 0xffffff, 0, 2.2));
  g.add(blocco(2.0, 0.15, p + 0.02, 0x1C1D2B, 0, 0.1));
  return g;
}

export function creaOstacolo(e, mondo) {
  const p = e.profondita;
  const stile = OSTACOLI[e.stile ?? mondo.stile];
  if (stile.proprio) return stile[e.tipo](p, e);
  return e.tipo === 'muro' && p > 2 ? muroLungo(mondo, p) : stile[e.tipo](p, e);
}

// ---------------------------------------------------------------------------
// Caffè e archi
// ---------------------------------------------------------------------------

const TORO = new THREE.TorusGeometry(0.1, 0.03, 8, 16);
export function creaCaffe() {
  const g = new THREE.Group();
  g.add(cilindro(0.2, 0.28, 0xffffff, 0, 0));
  g.add(cilindro(0.17, 0.02, 0x6B3E1F, 0, 0.27));
  g.add(cilindro(0.32, 0.03, 0xffffff, 0, -0.03));
  const manico = new THREE.Mesh(TORO, materiale(0xffffff));
  manico.position.set(0.22, 0.14, 0);
  g.add(manico);
  const alone = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
  );
  alone.position.y = 0.14;
  g.add(alone);
  return g;
}

export function creaArco(e) {
  // Alto abbastanza da restare fuori dall'inquadratura quando il giocatore riparte sotto l'arco.
  const H = 7.4;
  const g = new THREE.Group();
  for (const x of [-4, 4]) {
    g.add(blocco(0.5, H, 0.5, e.colore, x, 0));
    g.add(blocco(0.7, 0.3, 0.7, 0xffffff, x, H));
  }
  const cartello = scritta(e.testo, 8, 1, e.colore);
  cartello.position.y = H + 0.6;
  g.add(cartello);
  g.add(blocco(8.6, 0.25, 0.4, e.colore, 0, H + 1.0));
  if (e.traguardo) {
    // Corona d'alloro stilizzata.
    const corona = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.12, 8, 24), materiale(0x4f7d3a, { flatShading: true }));
    corona.position.y = H + 2.3;
    g.add(corona);
    for (let i = 0; i < 12; i++) {
      const foglia = new THREE.Mesh(SFERA, materiale(0x5f9445, { flatShading: true }));
      const a = (i / 12) * Math.PI * 2;
      foglia.scale.set(0.12, 0.22, 0.08);
      foglia.position.set(Math.cos(a) * 0.75, H + 2.3 + Math.sin(a) * 0.75, 0);
      foglia.rotation.z = a;
      g.add(foglia);
    }
  } else {
    // Bandierine del checkpoint.
    for (const x of [-4, 4]) {
      g.add(blocco(0.04, 1.0, 0.04, 0x333333, x, H + 0.3));
      g.add(blocco(0.6, 0.4, 0.02, 0xB03A2E, x + 0.3, H + 0.9));
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Roberto
// ---------------------------------------------------------------------------

const PELLE_R = 0xE0B08A, CAPELLI_R = 0x2B1D14, MAGLIA_R = 0x1F5F8B, PANTALONI_R = 0x2A2D3A, SCARPE_R = 0xF2F2F2;

// Volto disegnato per i personaggi generici (Roberto ha la testa di volto.js).
function voltoDisegnato(pelle, capelli) {
  return tela(256, 256, (g) => {
    g.fillStyle = esa(pelle); g.fillRect(0, 0, 256, 256);
    g.fillStyle = esa(capelli); g.fillRect(0, 0, 256, 50);
    g.fillStyle = '#2b1d14';
    g.fillRect(52, 86, 56, 10); g.fillRect(148, 86, 56, 10);
    g.fillStyle = '#ffffff'; g.fillRect(60, 108, 40, 24); g.fillRect(156, 108, 40, 24);
    g.fillStyle = '#3b2a1e'; g.fillRect(72, 110, 18, 20); g.fillRect(168, 110, 18, 20);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(116, 120, 24, 50);
    g.fillStyle = '#9b4a3c'; g.fillRect(92, 188, 72, 12);
  });
}

// Proporzioni e abiti di Roberto nelle varie età: testa (scala), braccia e gambe (scala), colori, zaino, grembiule.
export const ETA_ROBERTO = {
  neonato: { testa: 1.45, arti: 0.68, gambe: 0.6, maglia: 0xA9D6CC, polsi: 0xA9D6CC, pantaloni: 0xA9D6CC, scarpe: 0xF4F1E8, zaino: false, grembiule: false, anni: '0 anni' },
  bimbo:   { testa: 1.28, arti: 0.84, gambe: 0.78, maglia: 0x233A73, polsi: null, pantaloni: 0x3A3F52, scarpe: 0xF2F2F2, zaino: true, grembiule: true, anni: '6 anni' },
  liceo:   { testa: 1.0, arti: 1.0, gambe: 1.0, maglia: MAGLIA_R, polsi: null, pantaloni: PANTALONI_R, scarpe: SCARPE_R, zaino: true, grembiule: false, anni: '14 anni' },
};
const VOLTO_ETA = { neonato: 'neonato', bimbo: 'bimbo', liceo: 'adulto' };
const ETA_PELLE = { neonato: ETA_VOLTO.neonato.pelle, bimbo: ETA_VOLTO.bimbo.pelle, liceo: ETA_VOLTO.adulto.pelle };

// Personaggio a blocchi. Con `roberto: true` ha il volto di Roberto con le espressioni e si può
// rivestire per età con `vesti('neonato' | 'bimbo' | 'liceo')`.
export function creaPersona(o = {}) {
  const rob = Boolean(o.roberto);
  const PELLE = o.pelle ?? PELLE_R, CAPELLI = o.capelli ?? CAPELLI_R, MAGLIA = o.maglia ?? MAGLIA_R;
  const PANTALONI = o.pantaloni ?? PANTALONI_R, SCARPE = o.scarpe ?? SCARPE_R;
  // Roberto ha materiali propri, così cambiano colore con l'età senza toccare gli altri personaggi.
  const mat = c => (rob ? new THREE.MeshLambertMaterial({ color: c }) : c);
  const matMaglia = mat(MAGLIA), matPantaloni = mat(PANTALONI), matScarpe = mat(SCARPE), matPelle = mat(PELLE);
  const matPolsi = rob ? new THREE.MeshLambertMaterial({ color: PELLE }) : PELLE;
  const radice = new THREE.Group();
  const corpo = new THREE.Group();
  radice.add(corpo);
  // Busto, testa e braccia stanno in `superiore`: serve a piegarlo in avanti a gattoni.
  const superiore = new THREE.Group();
  corpo.add(superiore);

  // Busto: maglia leggermente rastremata, cintura, collo.
  superiore.add(blocco(0.56, 0.08, 0.31, 0x1C1D2B, 0, 1.0));
  superiore.add(blocco(0.58, 0.42, 0.3, matMaglia, 0, 1.04));
  superiore.add(blocco(0.66, 0.32, 0.34, matMaglia, 0, 1.42));
  superiore.add(blocco(0.16, 0.1, 0.16, matPelle, 0, 1.72));

  // Grembiule da scolaro: gonna sopra i fianchi, colletto bianco e fiocco.
  const grembiule = new THREE.Group();
  if (rob) {
    grembiule.add(blocco(0.62, 0.44, 0.36, matMaglia, 0, 0.72));
    grembiule.add(blocco(0.5, 0.1, 0.2, 0xFFFFFF, 0, 1.76, -0.08));
    grembiule.add(blocco(0.22, 0.12, 0.06, 0xE3B23C, 0, 1.62, -0.19));
    grembiule.visible = false;
    superiore.add(grembiule);
  }

  const testa = new THREE.Group();
  testa.position.y = 2.02;
  let volti = null;          // le teste di Roberto per età, create al primo uso
  let voltoCorrente = null;
  let cranio, voltoMat = null;
  const pelle = materiale(PELLE);
  const capelli = materiale(CAPELLI);
  if (!rob) {
    voltoMat = new THREE.MeshLambertMaterial({ map: voltoDisegnato(PELLE, CAPELLI) });
    // Ordine delle facce del cubo: +x, -x, +y, -y, +z, -z. Il volto guarda verso -z (avanti).
    cranio = new THREE.Mesh(CUBO, [pelle, pelle, capelli, pelle, capelli, voltoMat]);
    cranio.scale.set(0.42, 0.48, 0.42);
    cranio.castShadow = true;
    testa.add(cranio);
    testa.add(blocco(0.46, 0.12, 0.46, CAPELLI, 0, 0.2));
    testa.add(blocco(0.46, 0.34, 0.12, CAPELLI, 0, -0.02, 0.18));
    if (o.acconciatura === 'ciuffo') {
      // Ciuffo che cade sulla fronte, più lungo da un lato.
      testa.add(blocco(0.44, 0.13, 0.07, CAPELLI, 0, 0.09, -0.225));
      testa.add(blocco(0.2, 0.12, 0.07, CAPELLI, 0.1, -0.02, -0.225));
    } else if (o.acconciatura === 'lato') {
      // Capelli lisci pettinati da un lato: massa che scende sulla tempia sinistra e frangia obliqua.
      testa.add(blocco(0.1, 0.36, 0.42, CAPELLI, -0.245, -0.14, 0));
      testa.add(blocco(0.3, 0.12, 0.07, CAPELLI, -0.07, 0.1, -0.225));
      testa.add(blocco(0.12, 0.16, 0.07, CAPELLI, -0.17, -0.02, -0.225));
    }
    for (const s of [-1, 1]) testa.add(blocco(0.05, 0.12, 0.08, PELLE, s * 0.23, -0.04));
  }
  superiore.add(testa);

  function gamba(x) {
    const anca = new THREE.Group();
    anca.position.set(x, 1.0, 0);
    anca.add(blocco(0.22, 0.48, 0.24, matPantaloni, 0, -0.48));
    const ginocchio = new THREE.Group();
    ginocchio.position.y = -0.48;
    ginocchio.add(blocco(0.2, 0.46, 0.22, matPantaloni, 0, -0.46));
    ginocchio.add(blocco(0.22, 0.1, 0.34, matScarpe, 0, -0.52, -0.05));
    anca.add(ginocchio);
    corpo.add(anca);
    return { anca, ginocchio };
  }
  function braccio(x) {
    const spalla = new THREE.Group();
    spalla.position.set(x, 1.66, 0);
    spalla.add(blocco(0.17, 0.34, 0.18, matMaglia, 0, -0.34));
    const gomito = new THREE.Group();
    gomito.position.y = -0.34;
    gomito.add(blocco(0.14, 0.3, 0.15, matPolsi, 0, -0.3));
    gomito.add(blocco(0.15, 0.12, 0.15, matPelle, 0, -0.4));
    spalla.add(gomito);
    superiore.add(spalla);
    return { spalla, gomito };
  }

  // Zaino sulla schiena (la schiena è verso +z).
  const zaino = new THREE.Group();
  zaino.add(blocco(0.5, 0.62, 0.22, o.zaino ?? 0xB03A2E, 0, 1.08, 0.27));
  zaino.add(blocco(0.4, 0.26, 0.1, 0x8C2D23, 0, 1.12, 0.4));
  zaino.visible = Boolean(o.conZaino);
  superiore.add(zaino);

  const parti = {
    radice, corpo, superiore, testa, cranio, voltoMat, zaino, grembiule,
    gambe: [gamba(-0.14), gamba(0.14)],
    braccia: [braccio(-0.43), braccio(0.43)],
    eta: null,
    dim: ETA_ROBERTO.liceo,
    // Espressioni del viso di Roberto (vedi volto.js); per gli altri personaggi non fanno nulla.
    espressione(nome) { voltoCorrente?.imposta(nome); },
    aggiornaVolto(dt) { voltoCorrente?.aggiorna(dt); },
    volto: () => voltoCorrente,
  };

  if (rob) {
    volti = {};
    // Veste Roberto per l'età: testa, proporzioni, colori e accessori.
    parti.vesti = (eta) => {
      const d = ETA_ROBERTO[eta];
      parti.eta = eta; parti.dim = d;
      const ve = VOLTO_ETA[eta];
      if (!volti[eta]) {
        volti[eta] = creaTestaRoberto(ve);
        volti[eta].gruppo.visible = false;
        testa.add(volti[eta].gruppo);
      }
      for (const [k, v] of Object.entries(volti)) v.gruppo.visible = k === eta;
      const prima = voltoCorrente?.corrente() ?? 'neutro';
      voltoCorrente = volti[eta];
      voltoCorrente.imposta(prima);
      matMaglia.color.setHex(d.maglia); matPantaloni.color.setHex(d.pantaloni); matScarpe.color.setHex(d.scarpe);
      const pel = new THREE.Color(ETA_PELLE[eta]);
      matPelle.color.copy(pel);
      matPolsi.color.set(d.polsi ?? ETA_PELLE[eta]);
      grembiule.visible = d.grembiule;
      zaino.visible = d.zaino;
      testa.scale.setScalar(d.testa);
      testa.position.y = 2.02 + (d.testa - 1) * 0.17;
      const dy = (1 - d.gambe) * 1.0;
      superiore.position.y = -dy;
      for (const { anca } of parti.gambe) { anca.scale.setScalar(d.gambe); anca.position.y = d.gambe; }
      for (const { spalla } of parti.braccia) spalla.scale.setScalar(d.arti);
      azzeraPosa(parti);
    };
    parti.vesti('liceo');
  }
  return parti;
}

export const creaRoberto = (eta = 'liceo') => {
  const r = creaPersona({ roberto: true, conZaino: true });
  r.vesti(eta);
  return r;
};

// Riporta ogni articolazione alla posa neutra. Le pose qui sotto impostano comunque tutti gli assi
// di ogni giunto a ogni chiamata, così nessun valore residuo di una posa precedente può restare.
export function azzeraPosa(r) {
  for (const { anca, ginocchio } of r.gambe) { anca.rotation.set(0, 0, 0); ginocchio.rotation.set(0, 0, 0); anca.position.y = r.dim.gambe; }
  for (const { spalla, gomito } of r.braccia) { spalla.rotation.set(0, 0, 0); gomito.rotation.set(0, 0, 0); }
  r.testa.rotation.set(0, 0, 0);
  r.corpo.rotation.set(0, 0, 0);
  r.corpo.position.set(0, 0, 0);
  r.superiore.rotation.set(0, 0, 0);
  r.superiore.position.set(0, -(1 - r.dim.gambe), 0);
}

// Posa di corsa: fase in radianti, ampiezza 0..1.
export function posaCorsa(r, fase, ampiezza) {
  const s = Math.sin(fase);
  for (const [i, { anca, ginocchio }] of r.gambe.entries()) {
    const v = i === 0 ? s : -s;
    anca.rotation.set(v * 0.85 * ampiezza, 0, 0);
    ginocchio.rotation.set(Math.max(0, -Math.cos(fase + (i === 0 ? 0 : Math.PI))) * 1.3 * ampiezza, 0, 0);
  }
  for (const [i, { spalla, gomito }] of r.braccia.entries()) {
    const v = i === 0 ? -s : s;
    spalla.rotation.set(v * 0.7 * ampiezza, 0, 0);
    gomito.rotation.set(-0.9 * ampiezza, 0, 0);
  }
}

// Posa ferma, con saluto della mano destra se `saluto` > 0.
export function posaFerma(r, t, saluto) {
  for (const { anca, ginocchio } of r.gambe) { anca.rotation.set(0, 0, 0); ginocchio.rotation.set(0, 0, 0); }
  const [sx, dx] = r.braccia;
  sx.spalla.rotation.set(0, 0, -0.08);
  sx.gomito.rotation.set(-0.15, 0, 0);
  dx.spalla.rotation.set(0, 0, 0.08 + saluto * 2.6);
  dx.gomito.rotation.set(0, 0, saluto * Math.sin(t * 10) * 0.5);
  r.corpo.position.y = Math.sin(t * 2.5) * 0.015;
}

// A gattoni: busto quasi orizzontale, mani a terra, ginocchia a terra. `fase` in radianti, `ampiezza` 0..1,
// `bassa` 0..1 abbassa il busto fino a strisciare sulla pancia.
export function posaGattona(r, fase, ampiezza, bassa = 0) {
  const d = r.dim;
  const braccioLungo = 0.74 * d.arti;
  const anca = 0.48 * d.gambe + 0.08 - 0.12 * bassa;
  const lungBusto = 0.66;
  const alza = Math.asin(THREE.MathUtils.clamp((braccioLungo - anca - 0.1 * bassa) / lungBusto, -0.3, 0.7));
  const th = -(Math.PI / 2 - alza);                          // busto inclinato in avanti
  const s = Math.sin(fase), c = Math.cos(fase);
  // Il busto ruota attorno al bacino, che resta all'altezza `anca`.
  r.superiore.rotation.set(th, 0, s * 0.07 * ampiezza);
  r.superiore.position.set(0, anca - 1.0 * Math.cos(th) - (1 - d.gambe) * 0, -1.0 * Math.sin(th));
  r.corpo.position.y = Math.abs(c) * 0.025 * ampiezza;
  // Mani: scendono in verticale, avanti e indietro a turno.
  for (const [i, { spalla, gomito }] of r.braccia.entries()) {
    const v = i === 0 ? s : -s;
    spalla.rotation.set(-th + v * 0.55 * ampiezza, 0, 0);
    gomito.rotation.set(Math.max(0, -v) * -0.7 * ampiezza, 0, 0);
  }
  // Gambe: cosce in verticale, stinchi indietro lungo il pavimento, un po' di oscillazione.
  for (const [i, { anca: a, ginocchio }] of r.gambe.entries()) {
    const v = i === 0 ? -s : s;
    a.position.y = anca;
    a.rotation.set(v * 0.45 * ampiezza, 0, 0);
    ginocchio.rotation.set(-(Math.PI / 2 - 0.15) + Math.max(0, v) * 0.4 * ampiezza, 0, 0);
  }
  // Testa: contro-ruota per guardare avanti, un po' in su.
  r.testa.rotation.set(-th + 0.1, 0, 0);
}

// Seduto su una sedia: cosce in avanti (verso -z), busto abbassato di `abbassa` metri.
export function posaSeduto(r, abbassa = 0.5) {
  for (const { anca, ginocchio } of r.gambe) { anca.rotation.x = -Math.PI / 2; ginocchio.rotation.x = Math.PI / 2; }
  r.corpo.position.y = -abbassa;
}

// Ripristina le gambe dopo una posa da seduto.
export function posaInPiedi(r) {
  for (const { anca, ginocchio } of r.gambe) { anca.rotation.x = 0; ginocchio.rotation.x = 0; }
  r.corpo.position.y = 0;
}
