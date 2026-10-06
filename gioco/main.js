import * as THREE from './lib/three.module.min.js';
import { MONDI, TRAGUARDO, BONUS_CAFFE } from './mondi.js';
import { inviaTempo, leggiClassifica, formattaTempo } from './classifica.js';

// ---------------------------------------------------------------------------
// Percorso
// ---------------------------------------------------------------------------

const CORSIE = [-2.2, 0, 2.2];
const VISTA = 150;          // metri generati davanti al giocatore
const DIETRO = 15;          // metri tenuti dietro prima di rimuovere un oggetto
const TRANSIZIONE = 40;     // metri di sfumatura dei colori tra due mondi

let cursore = 0;
const TRATTI = MONDI.map((m, indice) => {
  const t = { ...m, indice, inizio: cursore, fine: cursore + m.lunghezza };
  cursore += m.lunghezza;
  return t;
});
const LUNGHEZZA = cursore;

// Generatore pseudo-casuale con seme: tutti i partecipanti corrono lo stesso percorso.
function rng(seme) {
  return () => {
    seme |= 0; seme = (seme + 0x6D2B79F5) | 0;
    let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mescola(lista, r) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

// Tutto ciò che compare lungo il percorso, ordinato per distanza.
const ENTITA = [];

for (const t of TRATTI) {
  const r = rng(1009 + t.indice * 7919);
  const tipi = ['basso', 'alto', 'muro'];
  let d = t.inizio + 40;
  while (d < t.fine - 25) {
    const corsie = mescola([0, 1, 2], r);
    const doppio = r() < 0.3 + 0.08 * t.indice;
    for (const c of corsie.slice(0, doppio ? 2 : 1)) {
      ENTITA.push({ d, genere: 'ostacolo', tipo: tipi[Math.floor(r() * 3)], corsia: c, mondo: t.indice });
    }
    if (r() < 0.6) ENTITA.push({ d, genere: 'caffe', corsia: corsie[2], mondo: t.indice });
    d += t.velocita * (1.0 - 0.03 * t.indice + r() * 0.55);
  }
  for (let q = t.inizio; q < t.fine; q += 7) {
    for (const lato of [-1, 1]) {
      if (r() < 0.2) continue;
      ENTITA.push({
        d: q + r() * 3, genere: 'quinta', lato, mondo: t.indice,
        larghezza: 3 + r() * 3, altezza: 3 + r() * (t.indice === 3 ? 4 : 10),
        profondita: 4 + r() * 3, scarto: r() * 3, colore: t.edifici[Math.floor(r() * t.edifici.length)],
      });
    }
  }
  if (t.indice > 0) ENTITA.push({ d: t.inizio, genere: 'arco', testo: t.nome, colore: 0xC9962E });
}
ENTITA.push({ d: LUNGHEZZA, genere: 'arco', testo: `${TRAGUARDO.nome} · ${TRAGUARDO.data}`, colore: 0xD4AF37, traguardo: true });
ENTITA.sort((a, b) => a.d - b.d);

const CAFFE_TOTALI = ENTITA.filter(e => e.genere === 'caffe').length;

// ---------------------------------------------------------------------------
// Scena
// ---------------------------------------------------------------------------

const contenitore = document.getElementById('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
contenitore.appendChild(renderer.domElement);

const scena = new THREE.Scene();
scena.background = new THREE.Color(TRATTI[0].cielo);
scena.fog = new THREE.Fog(TRATTI[0].cielo, 50, VISTA - 10);

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 400);

scena.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.6));
const sole = new THREE.DirectionalLight(0xffffff, 1.4);
sole.position.set(-4, 10, 6);
scena.add(sole);

function ridimensiona() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 72 : 60;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', ridimensiona);
ridimensiona();

const materiali = new Map();
function materiale(colore) {
  if (!materiali.has(colore)) materiali.set(colore, new THREE.MeshLambertMaterial({ color: colore }));
  return materiali.get(colore);
}
const cubo = new THREE.BoxGeometry(1, 1, 1);

function blocco(w, h, p, colore, x = 0, y = h / 2, z = 0) {
  const m = new THREE.Mesh(cubo, materiale(colore));
  m.scale.set(w, h, p);
  m.position.set(x, y, z);
  return m;
}

// Strada a tre corsie con texture che scorre.
const tela = document.createElement('canvas');
tela.width = 256; tela.height = 256;
{
  const g = tela.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = 'rgba(255,255,255,.9)';
  for (const x of [85, 171]) g.fillRect(x - 3, 20, 6, 90);
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(0, 0, 6, 256); g.fillRect(250, 0, 6, 256);
}
const texStrada = new THREE.CanvasTexture(tela);
texStrada.wrapS = texStrada.wrapT = THREE.RepeatWrapping;
texStrada.colorSpace = THREE.SRGBColorSpace;
const LUNGHEZZA_STRADA = 260;
const TILE = 6;
texStrada.repeat.set(1, LUNGHEZZA_STRADA / TILE);
const strada = new THREE.Mesh(
  new THREE.PlaneGeometry(6.6, LUNGHEZZA_STRADA),
  new THREE.MeshLambertMaterial({ map: texStrada, color: TRATTI[0].corsie }),
);
strada.rotation.x = -Math.PI / 2;
strada.position.set(0, 0.01, -LUNGHEZZA_STRADA / 2 + 20);
scena.add(strada);

const prato = new THREE.Mesh(
  new THREE.PlaneGeometry(200, LUNGHEZZA_STRADA),
  new THREE.MeshLambertMaterial({ color: TRATTI[0].terreno }),
);
prato.rotation.x = -Math.PI / 2;
prato.position.set(0, 0, -LUNGHEZZA_STRADA / 2 + 20);
scena.add(prato);

// ---------------------------------------------------------------------------
// Roberto (segnaposto low-poly)
// ---------------------------------------------------------------------------

const PELLE = 0xE0B08A, CAPELLI = 0x2B1D14, MAGLIA = 0x1F5F8B, PANTALONI = 0x2A2D3A, SCARPE = 0xF2F2F2;

const roberto = new THREE.Group();
const corpo = new THREE.Group();
roberto.add(corpo);

corpo.add(blocco(0.62, 0.7, 0.34, MAGLIA, 0, 1.15));
const testa = new THREE.Group();
testa.position.y = 1.62;
testa.add(blocco(0.4, 0.42, 0.4, PELLE, 0, 0));
testa.add(blocco(0.44, 0.14, 0.44, CAPELLI, 0, 0.22));
testa.add(blocco(0.44, 0.3, 0.1, CAPELLI, 0, 0.06, 0.2));
corpo.add(testa);

function arto(colore, colorePunta, x, y, lungo) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.add(blocco(0.2, lungo, 0.22, colore, 0, -lungo / 2));
  g.add(blocco(0.22, 0.12, 0.3, colorePunta, 0, -lungo - 0.02, -0.04));
  corpo.add(g);
  return g;
}
const gambaSx = arto(PANTALONI, SCARPE, -0.16, 0.8, 0.72);
const gambaDx = arto(PANTALONI, SCARPE, 0.16, 0.8, 0.72);
const braccioSx = arto(MAGLIA, PELLE, -0.42, 1.46, 0.56);
const braccioDx = arto(MAGLIA, PELLE, 0.42, 1.46, 0.56);

const ombra = new THREE.Mesh(
  new THREE.CircleGeometry(0.45, 20),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }),
);
ombra.rotation.x = -Math.PI / 2;
ombra.position.y = 0.02;
scena.add(ombra);
scena.add(roberto);

// ---------------------------------------------------------------------------
// Oggetti del percorso
// ---------------------------------------------------------------------------

function etichetta(testo, colore) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#' + colore.toString(16).padStart(6, '0');
  g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#1C1D2B';
  g.font = '800 64px "Bricolage Grotesque", "Avenir Next", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(testo.toUpperCase(), 512, 68, 980);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(8, 1), new THREE.MeshBasicMaterial({ map: tex }));
}

function creaMesh(e) {
  const t = TRATTI[e.mondo ?? 0];
  if (e.genere === 'ostacolo') {
    const col = t.ostacoli[e.tipo];
    const g = new THREE.Group();
    if (e.tipo === 'basso') {
      g.add(blocco(1.8, 0.8, 0.8, col));
      g.add(blocco(1.9, 0.08, 0.9, 0xffffff, 0, 0.82));
    } else if (e.tipo === 'alto') {
      g.add(blocco(2.0, 0.55, 0.4, col, 0, 1.5));
      g.add(blocco(0.12, 1.8, 0.12, 0x333333, -0.95, 0.9));
      g.add(blocco(0.12, 1.8, 0.12, 0x333333, 0.95, 0.9));
    } else {
      g.add(blocco(1.9, 2.6, 0.9, col));
      g.add(blocco(1.5, 0.2, 0.92, 0xffffff, 0, 2.0));
    }
    g.position.x = CORSIE[e.corsia];
    return g;
  }
  if (e.genere === 'caffe') {
    const g = new THREE.Group();
    const tazza = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.36, 12), materiale(0xffffff));
    const crema = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12), materiale(0x6B3E1F));
    crema.position.y = 0.18;
    g.add(tazza, crema);
    g.position.set(CORSIE[e.corsia], 1.0, 0);
    return g;
  }
  if (e.genere === 'quinta') {
    const x = e.lato * (6 + e.larghezza / 2 + e.scarto);
    return blocco(e.larghezza, e.altezza, e.profondita, e.colore, x);
  }
  if (e.genere === 'arco') {
    const g = new THREE.Group();
    g.add(blocco(0.4, 4.6, 0.4, e.colore, -4, 2.3));
    g.add(blocco(0.4, 4.6, 0.4, e.colore, 4, 2.3));
    const cartello = etichetta(e.testo, e.colore);
    cartello.position.y = 4.6;
    g.add(cartello);
    return g;
  }
}

let prossima = 0;      // indice della prossima entità da far comparire
const attive = [];

function svuota() {
  for (const e of attive) { scena.remove(e.mesh); e.mesh = null; }
  attive.length = 0;
}

function riposiziona(pos) {
  svuota();
  prossima = 0;
  while (prossima < ENTITA.length && ENTITA[prossima].d < pos - DIETRO) prossima++;
}

// ---------------------------------------------------------------------------
// Stato di gioco
// ---------------------------------------------------------------------------

const G = {
  stato: 'inizio',     // inizio | conto | gioco | caduto | pausa | fine
  pos: 0,
  tempo: 0,
  caffe: 0,
  raccolti: new Set(),
  mondo: 0,
  checkpoint: { mondo: 0, caffe: 0, raccolti: new Set() },
  corsia: 1,
  x: 0,
  y: 0,
  vy: 0,
  scivola: 0,
  timer: 0,
  passo: 0,
  cadute: 0,
  nome: '',
};

const GRAVITA = 28, SALTO = 10;

function velocita() { return TRATTI[G.mondo].velocita; }

function mondoDi(pos) {
  for (let i = TRATTI.length - 1; i >= 0; i--) if (pos >= TRATTI[i].inizio) return i;
  return 0;
}

function azzeraGiocatore() {
  G.corsia = 1; G.x = 0; G.y = 0; G.vy = 0; G.scivola = 0;
}

function nuovaPartita() {
  G.pos = 0; G.tempo = 0; G.caffe = 0; G.raccolti = new Set(); G.mondo = 0; G.cadute = 0;
  G.checkpoint = { mondo: 0, caffe: 0, raccolti: new Set() };
  azzeraGiocatore();
  riposiziona(0);
  mostraSchermo(null);
  hud.radice.hidden = false;
  avviaConto(`Mondo 1 di ${TRATTI.length} · ${TRATTI[0].nome} · ${TRATTI[0].anni}`);
}

function avviaConto(sottotitolo) {
  G.stato = 'conto';
  G.timer = 3;
  G.sottotitoloConto = sottotitolo;
}

function caduta() {
  G.stato = 'caduto';
  G.timer = 1.2;
  G.cadute++;
  banner('Ahi!<small>Si riparte dal checkpoint</small>', 1.2);
  if (navigator.vibrate) navigator.vibrate(120);
}

function ripartiDalCheckpoint() {
  const c = G.checkpoint;
  G.mondo = c.mondo;
  G.pos = TRATTI[c.mondo].inizio;
  G.caffe = c.caffe;
  G.raccolti = new Set(c.raccolti);
  azzeraGiocatore();
  riposiziona(G.pos);
  G.stato = 'gioco';
}

function entraNelMondo(i) {
  G.mondo = i;
  G.checkpoint = { mondo: i, caffe: G.caffe, raccolti: new Set(G.raccolti) };
  const t = TRATTI[i];
  banner(`Mondo ${i + 1} di ${TRATTI.length}<small>${t.nome} · ${t.anni}</small>`, 2.2);
}

async function fine() {
  G.stato = 'fine';
  hud.radice.hidden = true;
  const totale = Math.max(0, G.tempo - G.caffe * BONUS_CAFFE);
  document.getElementById('fine-data').textContent = `${TRAGUARDO.nome} · ${TRAGUARDO.data}`;
  document.getElementById('fine-tempo').textContent = formattaTempo(totale);
  document.getElementById('fine-dettaglio').textContent =
    `Corsa ${formattaTempo(G.tempo)} · ☕ ${G.caffe} di ${CAFFE_TOTALI} · ` +
    (G.cadute === 1 ? '1 caduta' : `${G.cadute} cadute`);
  mostraSchermo('fine');
  await inviaTempo(G.nome, Math.round(totale * 10) / 10);
  disegnaClassifica(document.getElementById('fine-classifica'), G.nome, totale);
}

// ---------------------------------------------------------------------------
// Comandi
// ---------------------------------------------------------------------------

function comando(azione) {
  if (G.stato !== 'gioco') return;
  if (azione === 'sinistra') G.corsia = Math.max(0, G.corsia - 1);
  if (azione === 'destra') G.corsia = Math.min(2, G.corsia + 1);
  if (azione === 'su' && G.y <= 0.001) { G.vy = SALTO; G.scivola = 0; }
  if (azione === 'giu') {
    if (G.y > 0.001) G.vy = -SALTO * 1.6;
    G.scivola = 0.75;
  }
}

window.addEventListener('keydown', ev => {
  const tasti = {
    ArrowLeft: 'sinistra', KeyA: 'sinistra',
    ArrowRight: 'destra', KeyD: 'destra',
    ArrowUp: 'su', KeyW: 'su', Space: 'su',
    ArrowDown: 'giu', KeyS: 'giu',
  };
  if (tasti[ev.code] && G.stato === 'gioco') { ev.preventDefault(); comando(tasti[ev.code]); }
  if (ev.code === 'Escape' || ev.code === 'KeyP') metti_in_pausa();
});

let tocco = null;
contenitore.addEventListener('touchstart', ev => {
  const t = ev.changedTouches[0];
  tocco = { x: t.clientX, y: t.clientY, usato: false };
}, { passive: true });
contenitore.addEventListener('touchmove', ev => {
  if (!tocco || tocco.usato) return;
  const t = ev.changedTouches[0];
  const dx = t.clientX - tocco.x, dy = t.clientY - tocco.y;
  if (Math.hypot(dx, dy) < 28) return;
  tocco.usato = true;
  if (Math.abs(dx) > Math.abs(dy)) comando(dx < 0 ? 'sinistra' : 'destra');
  else comando(dy < 0 ? 'su' : 'giu');
}, { passive: true });
contenitore.addEventListener('touchend', () => { tocco = null; }, { passive: true });

function metti_in_pausa() {
  if (G.stato !== 'gioco' && G.stato !== 'conto' && G.stato !== 'caduto') return;
  G.statoPrima = G.stato;
  G.stato = 'pausa';
  mostraSchermo('pausa');
}

document.addEventListener('visibilitychange', () => { if (document.hidden) metti_in_pausa(); });
document.getElementById('hud-pausa').addEventListener('click', metti_in_pausa);
document.getElementById('riprendi').addEventListener('click', () => {
  mostraSchermo(null);
  if (G.statoPrima === 'caduto') { ripartiDalCheckpoint(); }
  avviaConto('');
});

// ---------------------------------------------------------------------------
// Interfaccia
// ---------------------------------------------------------------------------

const hud = {
  radice: document.getElementById('hud'),
  tempo: document.getElementById('hud-tempo'),
  caffe: document.getElementById('hud-caffe'),
  mondo: document.getElementById('hud-mondo'),
  barra: document.getElementById('hud-barra'),
};
document.getElementById('hud-tacche').innerHTML =
  TRATTI.slice(1).map(t => `<span style="left:${(t.inizio / LUNGHEZZA) * 100}%"></span>`).join('');

const elBanner = document.getElementById('banner');
let durataBanner = 0;
function banner(html, durata) {
  elBanner.innerHTML = html;
  elBanner.hidden = false;
  durataBanner = durata;
}

const schermi = {
  inizio: document.getElementById('schermo-inizio'),
  pausa: document.getElementById('schermo-pausa'),
  fine: document.getElementById('schermo-fine'),
  classifica: document.getElementById('schermo-classifica'),
};
function mostraSchermo(nome) {
  for (const [k, el] of Object.entries(schermi)) el.hidden = k !== nome;
}

function scappa(testo) {
  const d = document.createElement('div');
  d.textContent = testo;
  return d.innerHTML;
}

async function disegnaClassifica(ol, nome, tempo) {
  const voci = await leggiClassifica(10);
  if (!voci.length) {
    ol.innerHTML = '<li class="vuota">Nessun tempo ancora. Sii il primo.</li>';
    return;
  }
  let evidenziato = false;
  ol.innerHTML = voci.map(v => {
    const tu = !evidenziato && v.nome === nome && Math.abs(v.tempo - tempo) < 0.06;
    if (tu) evidenziato = true;
    return `<li${tu ? ' class="tu"' : ''}><span>${scappa(v.nome)}</span><span class="t">${formattaTempo(v.tempo)}</span></li>`;
  }).join('');
}

const campoNome = document.getElementById('nome');
try { campoNome.value = localStorage.getItem('gioco-laurea:nome') || ''; } catch {}

document.getElementById('modulo-nome').addEventListener('submit', ev => {
  ev.preventDefault();
  const nome = campoNome.value.trim().slice(0, 24);
  if (!nome) { campoNome.focus(); return; }
  G.nome = nome;
  try { localStorage.setItem('gioco-laurea:nome', nome); } catch {}
  campoNome.blur();
  nuovaPartita();
});

for (const b of document.querySelectorAll('[data-ricomincia]')) {
  b.addEventListener('click', () => (G.nome ? nuovaPartita() : mostraSchermo('inizio')));
}
for (const b of document.querySelectorAll('[data-apri="classifica"]')) {
  b.addEventListener('click', apriClassifica);
}
document.querySelector('[data-chiudi-classifica]').addEventListener('click', () => {
  history.replaceState(null, '', location.pathname);
  mostraSchermo('inizio');
});

function apriClassifica() {
  mostraSchermo('classifica');
  disegnaClassifica(document.getElementById('classifica'), null, null);
}

if (location.hash === '#classifica') apriClassifica();
else mostraSchermo('inizio');

// ---------------------------------------------------------------------------
// Ciclo principale
// ---------------------------------------------------------------------------

const cA = new THREE.Color(), cB = new THREE.Color();
function sfuma(prop, pos) {
  const i = mondoDi(pos);
  const t = TRATTI[i], dopo = TRATTI[i + 1];
  cA.setHex(t[prop]);
  if (dopo) {
    const k = THREE.MathUtils.smoothstep(pos, t.fine - TRANSIZIONE, t.fine);
    cA.lerp(cB.setHex(dopo[prop]), k);
  }
  return cA;
}

function aggiornaColori() {
  scena.background.copy(sfuma('cielo', G.pos));
  scena.fog.color.copy(scena.background);
  strada.material.color.copy(sfuma('corsie', G.pos));
  prato.material.color.copy(sfuma('terreno', G.pos));
}

function aggiornaEntita() {
  while (prossima < ENTITA.length && ENTITA[prossima].d < G.pos + VISTA) {
    const e = ENTITA[prossima++];
    if (e.genere === 'caffe' && G.raccolti.has(e)) continue;
    e.mesh = creaMesh(e);
    scena.add(e.mesh);
    attive.push(e);
  }
  for (let i = attive.length - 1; i >= 0; i--) {
    const e = attive[i];
    if (e.d < G.pos - DIETRO) {
      scena.remove(e.mesh); e.mesh = null; attive.splice(i, 1);
      continue;
    }
    e.mesh.position.z = G.pos - e.d;
    if (e.genere === 'caffe') e.mesh.rotation.y += 0.05;
  }
}

function controllaUrti() {
  const altezza = G.scivola > 0 ? 0.85 : 1.8;
  const basso = G.y, alto = G.y + altezza;
  for (let i = attive.length - 1; i >= 0; i--) {
    const e = attive[i];
    if (Math.abs(e.d - G.pos) > 0.8) continue;
    if (Math.abs(CORSIE[e.corsia] - G.x) > 1.15) continue;
    if (e.genere === 'caffe') {
      G.caffe++;
      G.raccolti.add(e);
      scena.remove(e.mesh); e.mesh = null; attive.splice(i, 1);
      continue;
    }
    if (e.genere !== 'ostacolo') continue;
    const [oBasso, oAlto] = e.tipo === 'basso' ? [0, 0.82] : e.tipo === 'alto' ? [1.22, 3] : [0, 2.6];
    if (alto > oBasso && basso < oAlto) { caduta(); return; }
  }
}

function animaRoberto(dt, inCorsa) {
  roberto.position.set(G.x, G.y, 0);
  ombra.position.x = G.x;
  ombra.scale.setScalar(1 - Math.min(G.y, 2) * 0.2);

  if (inCorsa) G.passo += dt * velocita() * 0.9;
  const s = Math.sin(G.passo);
  const inAria = G.y > 0.001;
  const ampiezza = inAria ? 0.3 : 0.9;
  gambaSx.rotation.x = s * ampiezza;
  gambaDx.rotation.x = -s * ampiezza;
  braccioSx.rotation.x = -s * ampiezza * 0.8;
  braccioDx.rotation.x = s * ampiezza * 0.8;

  const piegato = G.scivola > 0 ? -1.15 : 0;
  corpo.rotation.x += (piegato - corpo.rotation.x) * Math.min(1, dt * 18);
  corpo.position.y = G.scivola > 0 ? 0.3 : (inAria ? 0 : Math.abs(s) * 0.06);
  roberto.rotation.z = (G.x - CORSIE[G.corsia]) * 0.12;
  if (G.stato === 'caduto') { corpo.rotation.x = 1.3; corpo.position.y = 0.3; }
}

let ultimo = performance.now();
function ciclo(ora) {
  const dt = Math.min(0.05, (ora - ultimo) / 1000);
  ultimo = ora;

  if (G.stato === 'conto') {
    const prima = Math.ceil(G.timer);
    G.timer -= dt;
    const n = Math.ceil(G.timer);
    if (n !== prima || elBanner.hidden) {
      const sotto = G.sottotitoloConto ? `<small>${G.sottotitoloConto}</small>` : '';
      banner(n > 0 ? `${n}${sotto}` : 'Via!', n > 0 ? 1.1 : 0.7);
    }
    if (G.timer <= 0) G.stato = 'gioco';
  } else if (G.stato === 'gioco') {
    G.tempo += dt;
    G.pos += velocita() * dt;

    const bersaglio = CORSIE[G.corsia];
    G.x += (bersaglio - G.x) * Math.min(1, dt * 14);
    G.vy -= GRAVITA * dt;
    G.y = Math.max(0, G.y + G.vy * dt);
    if (G.y === 0) G.vy = 0;
    G.scivola = Math.max(0, G.scivola - dt);

    const m = mondoDi(G.pos);
    if (m !== G.mondo) entraNelMondo(m);

    if (G.pos >= LUNGHEZZA) { G.pos = LUNGHEZZA; fine(); }
    else controllaUrti();
  } else if (G.stato === 'caduto') {
    G.tempo += dt;
    G.timer -= dt;
    if (G.timer <= 0) ripartiDalCheckpoint();
  }

  if (durataBanner > 0) {
    durataBanner -= dt;
    if (durataBanner <= 0) { elBanner.hidden = true; elBanner.innerHTML = ''; }
  }

  texStrada.offset.y = (G.pos / TILE) % 1;
  aggiornaEntita();
  aggiornaColori();
  animaRoberto(dt, G.stato === 'gioco');

  camera.position.set(G.x * 0.45, 3.3 + G.y * 0.25, 6.2);
  camera.lookAt(G.x * 0.45, 1.3, -10);

  if (G.stato !== 'inizio' && G.stato !== 'fine' && G.stato !== 'pausa') {
    hud.tempo.textContent = formattaTempo(G.tempo);
    hud.caffe.textContent = `☕ ${G.caffe}`;
    hud.mondo.textContent = `${G.mondo + 1}/${TRATTI.length} · ${TRATTI[G.mondo].nome}`;
    hud.barra.style.width = `${(G.pos / LUNGHEZZA) * 100}%`;
  }

  renderer.render(scena, camera);
  requestAnimationFrame(ciclo);
}

riposiziona(0);
requestAnimationFrame(ciclo);

// Aiuto per i test automatici.
window.__gioco = { G, ENTITA, TRATTI, LUNGHEZZA, comando };
