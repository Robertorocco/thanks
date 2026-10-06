import * as THREE from './lib/three.module.min.js';
import { MONDI, TRAGUARDO, BONUS_CAFFE, SPINTA, CRESCITA } from './mondi.js';
import { inviaTempo, leggiClassifica, formattaTempo } from './classifica.js';
import {
  creaRoberto, posaCorsa, posaFerma, creaOstacolo, creaCaffe, creaArco,
  creaEdificio, creaMonumento, creaLampione, creaAlbero, caricaFotoLuogo,
} from './modelli.js';

// ---------------------------------------------------------------------------
// Percorso
// ---------------------------------------------------------------------------

const CORSIE = [-2.2, 0, 2.2];
const VISTA = 150;          // metri generati davanti al giocatore
const DIETRO = 30;          // metri tenuti dietro prima di rimuovere un oggetto (serve anche all'intro)
const TRANSIZIONE = 40;     // metri di sfumatura dei colori tra due mondi

let cursore = 0;
const TRATTI = MONDI.map((m, indice) => {
  const t = { ...m, indice, inizio: cursore, fine: cursore + m.lunghezza };
  cursore += m.lunghezza;
  return t;
});
const LUNGHEZZA = cursore;

function mondoDi(pos) {
  for (let i = TRATTI.length - 1; i >= 0; i--) if (pos >= TRATTI[i].inizio) return i;
  return 0;
}

// Velocità in un punto del percorso: cresce dentro ogni mondo e riparte al successivo.
function velocitaIn(pos) {
  const t = TRATTI[mondoDi(Math.min(pos, LUNGHEZZA - 0.01))];
  const k = THREE.MathUtils.clamp((pos - t.inizio) / t.lunghezza, 0, 1);
  return t.velocita * SPINTA * (1 + CRESCITA * k);
}

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

const PROFONDITA = { basso: 0.8, alto: 0.4, muro: 0.9 };

// Tutto ciò che compare lungo il percorso, ordinato per distanza.
// Per gli ostacoli `d` è il centro e `profondita` la lunghezza lungo la corsa.
const ENTITA = [];

for (const t of TRATTI) {
  const r = rng(1009 + t.indice * 7919);
  const diff = t.indice / (TRATTI.length - 1);   // 0 nel primo mondo, 1 nell'ultimo
  const ostacolo = (d, corsia, tipo, profondita = PROFONDITA[tipo]) =>
    ENTITA.push({ d, genere: 'ostacolo', tipo, corsia, profondita, mondo: t.indice });
  const caffe = (d, corsia) => ENTITA.push({ d, genere: 'caffe', corsia, mondo: t.indice });
  const azione = () => (r() < 0.5 ? 'basso' : 'alto');

  // Corridoio: due corsie chiuse da pareti lunghe, quella libera si sposta di una
  // corsia alla volta. Dentro la corsia libera può esserci un salto o una scivolata.
  function corridoio(d) {
    const tratti = 3 + Math.floor(r() * (2 + diff * 2));
    let libera = Math.floor(r() * 3);
    for (let i = 0; i < tratti; i++) {
      const v = velocitaIn(d);
      const lungo = v * (0.8 + r() * 0.4);
      const centro = d + lungo / 2;
      for (const c of [0, 1, 2]) if (c !== libera) ostacolo(centro, c, 'muro', lungo);
      if (lungo > 10 && r() < 0.3 + 0.4 * diff) ostacolo(centro, libera, azione());
      else if (r() < 0.6) caffe(centro, libera);
      d += lungo + v * 0.55;
      const mosse = [libera - 1, libera + 1].filter(c => c >= 0 && c <= 2);
      libera = mosse[Math.floor(r() * mosse.length)];
    }
    return d;
  }

  let d = t.inizio + 45;
  while (d < t.fine - 30) {
    const v = velocitaIn(d);
    const corsie = mescola([0, 1, 2], r);
    const x = r();
    const pCorridoio = 0.12 + 0.12 * diff;
    const pMuraglia = pCorridoio + 0.16 + 0.1 * diff;
    const pBarriera = pMuraglia + 0.12 + 0.08 * diff;
    const pDoppio = pBarriera + 0.3;

    if (x < pCorridoio && d + v * 6 < t.fine - 30) {
      d = corridoio(d);
    } else if (x < pMuraglia) {
      // Due muri: una sola corsia percorribile, a volte con un ostacolo da saltare o scivolare.
      ostacolo(d, corsie[0], 'muro');
      ostacolo(d, corsie[1], 'muro');
      if (r() < 0.5 + 0.3 * diff) ostacolo(d, corsie[2], azione());
      else caffe(d, corsie[2]);
    } else if (x < pBarriera) {
      // Tutte e tre le corsie chiuse da ostacoli bassi o alti: bisogna saltare o scivolare.
      const tutti = r() < 0.6 ? azione() : null;
      for (const c of corsie) ostacolo(d, c, tutti ?? azione());
    } else if (x < pDoppio) {
      const tipi = ['basso', 'alto', 'muro'];
      ostacolo(d, corsie[0], tipi[Math.floor(r() * 3)]);
      ostacolo(d, corsie[1], tipi[Math.floor(r() * 3)]);
      if (r() < 0.6) caffe(d, corsie[2]);
    } else {
      const tipi = ['basso', 'alto', 'muro'];
      ostacolo(d, corsie[0], tipi[Math.floor(r() * 3)]);
      if (r() < 0.6) caffe(d, corsie[1 + Math.floor(r() * 2)]);
    }
    d += velocitaIn(d) * (1.05 - 0.15 * diff + r() * 0.45);
  }

  // Scenografia: monumento con la foto del luogo, edifici, lampioni, alberi.
  const latoMonumento = t.indice % 2 ? 1 : -1;
  const dMonumento = t.inizio + 70;
  ENTITA.push({ d: dMonumento, genere: 'monumento', lato: latoMonumento, mondo: t.indice });
  caricaFotoLuogo(t.stile);
  for (let q = t.inizio - (t.indice === 0 ? 28 : 0); q < t.fine; q += 7) {
    for (const lato of [-1, 1]) {
      if (r() < 0.15) continue;
      if (lato === latoMonumento && Math.abs(q - dMonumento) < 14) continue;
      ENTITA.push({
        d: q + r() * 3, genere: 'edificio', lato, mondo: t.indice,
        larghezza: 3 + r() * 3, altezza: 4 + r() * (t.stile === 'festival' ? 5 : t.stile === 'rennes' ? 6 : 12),
        profondita: 4 + r() * 3, scarto: r() * 2, colore: t.edifici[Math.floor(r() * t.edifici.length)],
      });
    }
  }
  for (let q = t.inizio + (t.indice === 0 ? -12 : 12); q < t.fine; q += 24) {
    for (const lato of [-1, 1]) ENTITA.push({ d: q, genere: 'lampione', lato, mondo: t.indice });
  }
  if (t.stile === 'liceo' || t.stile === 'rennes') {
    for (let q = t.inizio + 6; q < t.fine; q += 16) {
      ENTITA.push({ d: q, genere: 'albero', lato: (q / 16) % 2 < 1 ? -1 : 1, scala: 0.8 + r() * 0.5, mondo: t.indice });
    }
  }
  if (t.indice > 0) ENTITA.push({ d: t.inizio, genere: 'arco', testo: t.nome, colore: 0xC9962E });
}
ENTITA.push({ d: LUNGHEZZA, genere: 'arco', testo: `${TRAGUARDO.nome} · ${TRAGUARDO.data}`, colore: 0xD4AF37, traguardo: true });
ENTITA.sort((a, b) => a.d - b.d);

const CAFFE_TOTALI = ENTITA.filter(e => e.genere === 'caffe').length;
const mezzaLunghezza = e => (e.profondita ?? 0) / 2;

// ---------------------------------------------------------------------------
// Scena
// ---------------------------------------------------------------------------

const contenitore = document.getElementById('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
contenitore.appendChild(renderer.domElement);

const scena = new THREE.Scene();
scena.background = new THREE.Color(TRATTI[0].cielo);
scena.fog = new THREE.Fog(TRATTI[0].cielo, 60, VISTA - 5);

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 400);

const cielo = new THREE.HemisphereLight(0xffffff, 0x77736a, 1.5);
scena.add(cielo);
const sole = new THREE.DirectionalLight(0xfff4e0, 1.6);
sole.castShadow = true;
sole.shadow.mapSize.set(1024, 1024);
Object.assign(sole.shadow.camera, { left: -12, right: 12, top: 14, bottom: -14, near: 1, far: 50 });
sole.shadow.bias = -0.0008;
scena.add(sole, sole.target);

function ridimensiona() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 72 : 60;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', ridimensiona);
ridimensiona();

// Strada a tre corsie con texture che scorre.
const tela = document.createElement('canvas');
tela.width = 256; tela.height = 256;
{
  const g = tela.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  g.fillStyle = 'rgba(255,255,255,.9)';
  for (const x of [85, 171]) g.fillRect(x - 3, 20, 6, 90);
  g.fillStyle = 'rgba(0,0,0,.3)';
  g.fillRect(0, 0, 8, 256); g.fillRect(248, 0, 8, 256);
}
const texStrada = new THREE.CanvasTexture(tela);
texStrada.wrapS = texStrada.wrapT = THREE.RepeatWrapping;
texStrada.colorSpace = THREE.SRGBColorSpace;
texStrada.anisotropy = 8;
const LUNGHEZZA_STRADA = 260;
const TILE = 6;
texStrada.repeat.set(1, LUNGHEZZA_STRADA / TILE);

function piano(w, x, y, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, LUNGHEZZA_STRADA), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, -LUNGHEZZA_STRADA / 2 + 20);
  m.receiveShadow = true;
  scena.add(m);
  return m;
}
const strada = piano(6.6, 0, 0.01, new THREE.MeshLambertMaterial({ map: texStrada, color: TRATTI[0].corsie }));
const prato = piano(300, 0, 0, new THREE.MeshLambertMaterial({ color: TRATTI[0].terreno }));
const matMarciapiede = new THREE.MeshLambertMaterial({ color: 0xffffff });
const marciapiedi = [piano(3, -4.8, 0.06, matMarciapiede), piano(3, 4.8, 0.06, matMarciapiede)];

// ---------------------------------------------------------------------------
// Roberto
// ---------------------------------------------------------------------------

const ALTEZZA_ROBERTO = 0.8;     // scala del modello: alto circa 1,8 m
const R = creaRoberto();
const roberto = R.radice;
roberto.scale.setScalar(ALTEZZA_ROBERTO);
scena.add(roberto);

// ---------------------------------------------------------------------------
// Oggetti del percorso
// ---------------------------------------------------------------------------

function creaMesh(e) {
  const t = TRATTI[e.mondo ?? 0];
  let m;
  if (e.genere === 'ostacolo') { m = creaOstacolo(e, t); m.position.x = CORSIE[e.corsia]; }
  else if (e.genere === 'caffe') { m = creaCaffe(); m.position.set(CORSIE[e.corsia], 0.85, 0); }
  else if (e.genere === 'edificio') m = creaEdificio(e, t);
  else if (e.genere === 'monumento') m = creaMonumento(e, t);
  else if (e.genere === 'lampione') m = creaLampione(e.lato);
  else if (e.genere === 'albero') m = creaAlbero(e.lato, e.scala);
  else if (e.genere === 'arco') m = creaArco(e);
  return m;
}

function rimuovi(e) {
  scena.remove(e.mesh);
  e.mesh.traverse(o => {
    // Le geometrie e i materiali condivisi restano in cache; si liberano solo le texture clonate.
    if (o.material && !Array.isArray(o.material) && o.material.map?.isCanvasTexture === false) o.material.dispose();
  });
  e.mesh = null;
}

let prossima = 0;      // indice della prossima entità da far comparire
const attive = [];

function svuota() {
  for (const e of attive) rimuovi(e);
  attive.length = 0;
}

function riposiziona(pos) {
  svuota();
  prossima = 0;
  while (prossima < ENTITA.length && ENTITA[prossima].d < pos - 40) prossima++;
}

// ---------------------------------------------------------------------------
// Stato di gioco
// ---------------------------------------------------------------------------

const G = {
  stato: 'inizio',     // inizio | intro | conto | gioco | caduto | pausa | fine
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
const DURATA_INTRO = 3.6;

function azzeraGiocatore() {
  G.corsia = 1; G.x = 0; G.y = 0; G.vy = 0; G.scivola = 0;
}

function nuovaPartita() {
  G.pos = 0; G.tempo = 0; G.caffe = 0; G.raccolti = new Set(); G.mondo = 0; G.cadute = 0;
  G.checkpoint = { mondo: 0, caffe: 0, raccolti: new Set() };
  azzeraGiocatore();
  riposiziona(0);
  mostraSchermo(null);
  hud.radice.hidden = true;
  G.stato = 'intro';
  G.timer = 0;
  G.bannerIntro = false;
}

function iniziaCorsa() {
  G.stato = 'gioco';
  hud.radice.hidden = false;
  const t = TRATTI[0];
  banner(`Via!<small>Mondo 1 di ${TRATTI.length} · ${t.nome} · ${t.anni}</small>`, 1.8);
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
  const arrotondato = Math.round(totale * 10) / 10;
  await inviaTempo(G.nome, arrotondato);
  disegnaClassifica(document.getElementById('fine-classifica'), G.nome, arrotondato);
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

function saltaIntro() {
  if (G.stato === 'intro' && G.timer < DURATA_INTRO - 0.4) G.timer = DURATA_INTRO - 0.4;
}

window.addEventListener('keydown', ev => {
  const tasti = {
    ArrowLeft: 'sinistra', KeyA: 'sinistra',
    ArrowRight: 'destra', KeyD: 'destra',
    ArrowUp: 'su', KeyW: 'su', Space: 'su',
    ArrowDown: 'giu', KeyS: 'giu',
  };
  if (G.stato === 'intro') saltaIntro();
  if (tasti[ev.code] && G.stato === 'gioco') { ev.preventDefault(); comando(tasti[ev.code]); }
  if (ev.code === 'Escape' || ev.code === 'KeyP') metti_in_pausa();
});

let tocco = null;
contenitore.addEventListener('touchstart', ev => {
  const t = ev.changedTouches[0];
  tocco = { x: t.clientX, y: t.clientY, usato: false };
  saltaIntro();
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
function banner(html, durata, posizione = '') {
  elBanner.innerHTML = html;
  elBanner.className = `banner ${posizione}`;
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
  const { voci, condivisa } = await leggiClassifica(10);
  const nota = condivisa ? '' : '<li class="vuota">Classifica salvata solo su questo telefono.</li>';
  if (!voci.length) {
    ol.innerHTML = '<li class="vuota">Nessun tempo ancora. Sii il primo.</li>';
    return;
  }
  let evidenziato = false;
  ol.innerHTML = voci.map(v => {
    const tu = !evidenziato && nome && v.nome.toLowerCase() === nome.toLowerCase() && Math.abs(v.tempo - tempo) < 0.06;
    if (tu) evidenziato = true;
    return `<li${tu ? ' class="tu"' : ''}><span>${scappa(v.nome)}</span><span class="t">${formattaTempo(Number(v.tempo))}</span></li>`;
  }).join('') + nota;
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
  matMarciapiede.color.copy(prato.material.color).lerp(cB.setHex(0xffffff), 0.35);
  const notte = TRATTI[mondoDi(G.pos)].stile === 'festival';
  cielo.intensity += ((notte ? 0.7 : 1.5) - cielo.intensity) * 0.05;
  sole.intensity += ((notte ? 0.5 : 1.6) - sole.intensity) * 0.05;
}

function aggiornaEntita() {
  while (prossima < ENTITA.length && ENTITA[prossima].d - mezzaLunghezza(ENTITA[prossima]) < G.pos + VISTA) {
    const e = ENTITA[prossima++];
    if (e.d + mezzaLunghezza(e) < G.pos - DIETRO) continue;
    if (e.genere === 'caffe' && G.raccolti.has(e)) continue;
    e.mesh = creaMesh(e);
    scena.add(e.mesh);
    attive.push(e);
  }
  for (let i = attive.length - 1; i >= 0; i--) {
    const e = attive[i];
    if (e.d + mezzaLunghezza(e) < G.pos - DIETRO) {
      rimuovi(e); attive.splice(i, 1);
      continue;
    }
    e.mesh.position.z = G.pos - e.d;
    if (e.genere === 'caffe') {
      e.mesh.rotation.y += 0.05;
      e.mesh.position.y = 0.85 + Math.sin(performance.now() / 250 + e.d) * 0.08;
    }
  }
}

function controllaUrti() {
  const altezza = G.scivola > 0 ? 0.85 : 1.8;
  const basso = G.y, alto = G.y + altezza;
  for (let i = attive.length - 1; i >= 0; i--) {
    const e = attive[i];
    if (e.genere !== 'ostacolo' && e.genere !== 'caffe') continue;
    if (Math.abs(e.d - G.pos) > mezzaLunghezza(e) + 0.4) continue;
    if (Math.abs(CORSIE[e.corsia] - G.x) > 1.15) continue;
    if (e.genere === 'caffe') {
      G.caffe++;
      G.raccolti.add(e);
      rimuovi(e); attive.splice(i, 1);
      continue;
    }
    const [oBasso, oAlto] = e.tipo === 'basso' ? [0, 0.85] : e.tipo === 'alto' ? [1.2, 3] : [0, 3];
    if (alto > oBasso && basso < oAlto) { caduta(); return; }
  }
}

function animaRoberto(dt) {
  roberto.position.set(G.x, G.y, 0);
  roberto.rotation.y = 0;

  if (G.stato === 'intro') {
    const corre = G.timer > DURATA_INTRO - 1.2;
    const saluto = THREE.MathUtils.smoothstep(G.timer, 0.3, 0.7) * (1 - THREE.MathUtils.smoothstep(G.timer, 1.6, 2.0));
    if (corre) { G.passo += dt * 14; posaCorsa(R, G.passo, Math.min(1, (G.timer - (DURATA_INTRO - 1.2)) * 2)); }
    else posaFerma(R, G.timer, saluto);
    R.corpo.rotation.x = 0;
    return;
  }

  const inCorsa = G.stato === 'gioco';
  if (inCorsa) G.passo += dt * velocitaIn(G.pos) * 0.75;
  const inAria = G.y > 0.001;
  posaCorsa(R, G.passo, inAria ? 0.35 : 1);
  if (inAria) for (const { ginocchio } of R.gambe) ginocchio.rotation.x = 1.1;

  const piegato = G.scivola > 0 ? -1.15 : 0;
  R.corpo.rotation.x += (piegato - R.corpo.rotation.x) * Math.min(1, dt * 18);
  R.corpo.position.y = G.scivola > 0 ? 0.35 : (inAria ? 0 : Math.abs(Math.sin(G.passo)) * 0.06);
  roberto.rotation.z = (G.x - CORSIE[G.corsia]) * 0.12;
  if (G.stato === 'caduto') { R.corpo.rotation.x = 1.3; R.corpo.position.y = 0.3; }
}

const guarda = new THREE.Vector3(), daIntro = new THREE.Vector3();
function aggiornaCamera() {
  const dietroPos = new THREE.Vector3(G.x * 0.45, 3.3 + G.y * 0.25, 6.2);
  const dietroGuarda = new THREE.Vector3(G.x * 0.45, 1.3, -10);
  if (G.stato === 'intro') {
    // Prima davanti al volto, poi un giro attorno a Roberto fino alla visuale di corsa.
    const k = THREE.MathUtils.smootherstep(G.timer, 1.6, DURATA_INTRO - 0.2);
    const ang = k * Math.PI;
    const raggio = THREE.MathUtils.lerp(1.5, 6.2, k);
    const avvicina = 1 - THREE.MathUtils.smootherstep(G.timer, 0, 1.2);
    daIntro.set(Math.sin(ang) * raggio * 0.6, THREE.MathUtils.lerp(1.55, 3.3, k), -Math.cos(ang) * raggio - avvicina * 0.8);
    camera.position.copy(daIntro);
    guarda.set(0, 1.5, 0).lerp(dietroGuarda, k * k);
    camera.lookAt(guarda);
    return;
  }
  camera.position.copy(dietroPos);
  camera.lookAt(dietroGuarda);
}

let ultimo = performance.now();
function ciclo(ora) {
  const dt = Math.min(0.05, (ora - ultimo) / 1000);
  ultimo = ora;

  if (G.stato === 'intro') {
    G.timer += dt;
    if (!G.bannerIntro && G.timer > 0.4) {
      G.bannerIntro = true;
      banner('Roberto Rocco<small>Dal liceo alla laurea</small>', 1.5, 'in-basso');
    }
    if (G.timer >= DURATA_INTRO) iniziaCorsa();
  } else if (G.stato === 'conto') {
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
    G.pos += velocitaIn(G.pos) * dt;

    const bersaglio = CORSIE[G.corsia];
    G.x += (bersaglio - G.x) * Math.min(1, dt * 15);
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
  animaRoberto(dt);
  aggiornaCamera();

  sole.position.set(G.x - 6, 14, 8);
  sole.target.position.set(G.x, 0, -6);

  if (G.stato !== 'inizio' && G.stato !== 'fine' && G.stato !== 'pausa' && G.stato !== 'intro') {
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
window.__gioco = { G, ENTITA, TRATTI, LUNGHEZZA, comando, velocitaIn };
