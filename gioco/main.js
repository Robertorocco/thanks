import * as THREE from './lib/three.module.min.js';
import {
  MONDI, TRAGUARDO, BONUS_CAFFE, SPINTA, CRESCITA, MALUS_PRIMA_FILA, TEMPO_SCELTA,
  MODALITA_SVILUPPO, RESPAWN_INDIETRO, RESPAWN_INVULNERABILE, FISICA, ARCHI,
} from './mondi.js';
import { inviaTempo, leggiClassifica, formattaTempo } from './classifica.js';
import {
  creaRoberto, posaCorsa, posaFerma, posaGattona, azzeraPosa, creaOstacolo, creaArco,
  creaEdificio, creaMonumento, creaLampione, creaAlbero, caricaFotoLuogo,
} from './modelli.js';
import {
  creaSemaforo, creaScuola, creaParete, creaSoffitto, creaCartelloAppeso, creaPortaAula,
  creaPortone, creaMuroLungo,
} from './modelli-liceo.js';
import {
  creaPareteStile, creaSoffittoStile, creaArredo, creaPortaCasa, creaBonus, creaScuolaDarmon, ICONA_BONUS,
} from './modelli-infanzia.js';
import { costruisciPercorso } from './percorso.js';
import { CORSIE, PENDENZA_CROCIERA, generaLivello, distanzaPersona } from './livello.js';
import { creaAula } from './aula.js';

// L'etichetta mostra la versione del codice che sta davvero girando (dal ?v= con cui è caricato).
{
  const v = new URL(import.meta.url).searchParams.get('v');
  const el = document.querySelector('.versione');
  if (el && v) el.textContent = `v${v}`;
}

// ---------------------------------------------------------------------------
// Percorso: mondi, sezioni e tracciato
// ---------------------------------------------------------------------------

const VISTA = 200;          // metri generati davanti al giocatore
const DIETRO = 30;          // metri tenuti dietro prima di rimuovere un oggetto (serve anche all'intro)
const TRANSIZIONE = 40;     // metri di sfumatura dei colori tra due mondi

let cursore = 0;
const SEZIONI = [];         // lista piatta di tutte le sezioni, con inizio/fine assoluti
const TRATTI = MONDI.map((m, indice) => {
  const t = { ...m, indice, inizio: cursore, pavInt: m.interno?.corsie ?? m.corsie, intCielo: m.interno?.cielo ?? m.cielo, terraInt: m.interno?.terra ?? 0xC2BCB0 };
  if (m.sezioni) {
    t.sezioni = m.sezioni.map(s => {
      const sz = { ...s, inizio: cursore };
      cursore += s.lung;
      sz.fine = cursore;
      SEZIONI.push(sz);
      return sz;
    });
    t.lunghezza = cursore - t.inizio;
  } else {
    cursore += m.lunghezza;
    SEZIONI.push({ id: `mondo${indice}`, inizio: t.inizio, fine: cursore, lung: m.lunghezza, amb: 'est' });
  }
  t.fine = cursore;
  return t;
});
const LUNGHEZZA = cursore;
const perc = costruisciPercorso(SEZIONI, 260);

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

const ENTITA = generaLivello(TRATTI, perc, velocitaIn);
for (const t of TRATTI) if (!t.sezioni) caricaFotoLuogo(t.stile);
// I bonus sono numerati nell'ordine del percorso: C1, C2... in casa, D1... all'Istituto, 1, 2... dopo.
const contatori = { C: 0, D: 0, '': 0 };
for (const e of ENTITA) {
  if (e.genere !== 'caffe') continue;
  const st = MONDI[e.mondo].stile;
  const pre = st === 'casa' ? 'C' : st === 'darmon' ? 'D' : '';
  e.num = pre + (++contatori[pre]);
}
const CAFFE_TOTALI = contatori.C + contatori.D + contatori[''];
const mezzaLunghezza = e => (e.profondita ?? 0) / 2;

// Punti di ripartenza: l'inizio di ogni mondo e le tappe dentro il mondo 1.
const CHECKPOINT = [];
for (const t of TRATTI) {
  CHECKPOINT.push({ pos: t.inizio, mondo: t.indice, nome: t.nome, nuovoMondo: true });
  for (const s of t.sezioni ?? []) if (s.checkpoint) CHECKPOINT.push({ pos: s.inizio, mondo: t.indice, nome: s.checkpoint, sotto: s.sottotitolo ?? '' });
}
CHECKPOINT.sort((a, b) => a.pos - b.pos);

const LICEO = TRATTI.findIndex(t => t.stile === 'liceo');
const DARMON = TRATTI.findIndex(t => t.stile === 'darmon');
const SEZ_AULA = TRATTI[LICEO].sezioni.find(s => s.evento === 'aula');
const SEZ_INGRESSO = TRATTI[LICEO].sezioni.find(s => s.id === 'atrio');
const SEZ_INGRESSO_D = TRATTI[DARMON].sezioni.find(s => s.id === 'atrio-d');
const PORTA_AULA = SEZ_AULA.fine;           // la parete con la porta della 5ª H
const AVVICINAMENTO_AULA = 30;              // metri di rallentamento prima di entrare
const ORA_PARTENZA = 8 * 60 + 5, ORA_CAMPANELLA = 8 * 60 + 30;

// ---------------------------------------------------------------------------
// Scena
// ---------------------------------------------------------------------------

const contenitore = document.getElementById('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
contenitore.appendChild(renderer.domElement);

const NEBBIA_EST = [70, VISTA - 5], NEBBIA_INT = [8, 46];
const scena = new THREE.Scene();
scena.background = new THREE.Color(TRATTI[0].intCielo);
scena.fog = new THREE.Fog(TRATTI[0].intCielo, NEBBIA_INT[0], NEBBIA_INT[1]);

const camera = new THREE.PerspectiveCamera(65, 1, 0.3, 900);
let fovBase = 72;

const cielo = new THREE.HemisphereLight(0xffffff, 0x77736a, 1.5);
scena.add(cielo);
const sole = new THREE.DirectionalLight(0xfff4e0, 1.6);
sole.castShadow = true;
// Il riquadro delle ombre copre ~60 m davanti a chi corre (e segue le curve): le ombre sono già
// al loro posto quando gli oggetti arrivano vicino, invece di comparire all'ultimo.
sole.shadow.mapSize.set(2048, 2048);
Object.assign(sole.shadow.camera, { left: -11, right: 11, top: 34, bottom: -34, near: 1, far: 110 });
sole.shadow.bias = -0.0008;
scena.add(sole, sole.target);

const aula = creaAula();

function ridimensiona() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  fovBase = w < h ? 72 : 60;
  camera.fov = fovBase;
  camera.updateProjectionMatrix();
  aula.ridimensiona(w / h);
}
window.addEventListener('resize', ridimensiona);
ridimensiona();

// --- Frame di riferimento del percorso --------------------------------------
// Direzione avanti (sin ψ, -cos ψ), destra (cos ψ, sin ψ). Le coordinate locali sono
// x a destra, y in alto, z all'indietro rispetto a chi corre.
const tmp = {};
function mettiSulPercorso(obj, d, inclina) {
  perc.punto(d, tmp);
  obj.position.set(tmp.x, tmp.h, tmp.z);
  obj.rotation.order = 'YXZ';
  obj.rotation.set(inclina ? Math.atan(tmp.pend) : 0, -tmp.psi, 0);
}
function daLocale(d, lx, ly, lz, fuori) {
  perc.punto(d, tmp);
  const s = Math.sin(tmp.psi), c = Math.cos(tmp.psi);
  return fuori.set(tmp.x + c * lx - s * lz, tmp.h + ly, tmp.z + s * lx + c * lz);
}

// --- Strada, marciapiedi, terreno e pavimento interno: nastri lungo il percorso ---
const cA = new THREE.Color(), cB = new THREE.Color(), cC = new THREE.Color();
function coloreMondo(prop, d, fuori) {
  const i = mondoDi(d);
  const t = TRATTI[i], dopo = TRATTI[i + 1];
  fuori.setHex(t[prop]);
  if (dopo) fuori.lerp(cB.setHex(dopo[prop]), THREE.MathUtils.smoothstep(d, t.fine - TRANSIZIONE, t.fine));
  return fuori;
}

function texturaStrada() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
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
  return c;
}
function texturaPavimento() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128);
  return c;
}
function texDa(canvas, ripetiU = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(ripetiU, 1);
  return t;
}
function texturaGradini() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(0,0,0,.34)'; g.fillRect(0, 0, 64, 30);      // alzata in ombra
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 28, 64, 4);       // spigolo
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 32, 64, 8); // bordo chiaro del gradino
  return c;
}
function texturaParquet() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(0,0,0,${0.03 + (i % 2) * 0.06})`; g.fillRect(i * 32, 0, 32, 128);
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(i * 32, 0, 2, 128);
    for (let y = (i % 2) * 40; y < 128; y += 80) { g.fillRect(i * 32, y, 32, 2); }
  }
  return c;
}
const TILE_STRADA = 6, TILE_PAV = 4, PASSO_GRADINO = 0.6;

// Intervalli consecutivi dello stesso ambiente.
const INTERVALLI = [];
for (const s of SEZIONI) {
  const ultimo = INTERVALLI[INTERVALLI.length - 1];
  if (ultimo && ultimo.amb === s.amb) ultimo.fine = s.fine;
  else INTERVALLI.push({ amb: s.amb, inizio: s.inizio, fine: s.fine });
}
INTERVALLI[0].inizio = -40;
INTERVALLI[INTERVALLI.length - 1].fine += 120;

function nastro(a, b, sinistra, destra, quota, colore, vTile, materiale, passo = 2) {
  const n = Math.max(1, Math.ceil((b - a) / passo));
  const pos = new Float32Array((n + 1) * 6), col = new Float32Array((n + 1) * 6);
  const nor = new Float32Array((n + 1) * 6), uv = new Float32Array((n + 1) * 4);
  const c = new THREE.Color();
  for (let i = 0; i <= n; i++) {
    const d = a + ((b - a) * i) / n;
    perc.punto(d, tmp);
    const rx = Math.cos(tmp.psi), rz = Math.sin(tmp.psi);
    pos.set([tmp.x + rx * sinistra, tmp.h + quota, tmp.z + rz * sinistra, tmp.x + rx * destra, tmp.h + quota, tmp.z + rz * destra], i * 6);
    colore(d, c);
    col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    nor.set([0, 1, 0, 0, 1, 0], i * 6);
    uv.set([0, d / vTile, 1, d / vTile], i * 4);
  }
  const idx = [];
  for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, materiale);
  m.receiveShadow = true;
  scena.add(m);
  return m;
}

{
  const strada = new THREE.MeshLambertMaterial({ map: texDa(texturaStrada()), vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const terreno = new THREE.MeshLambertMaterial({ vertexColors: true });
  const marciapiede = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const pavimento = new THREE.MeshLambertMaterial({ map: texDa(texturaPavimento(), 2), vertexColors: true });
  const parquet = new THREE.MeshLambertMaterial({ map: texDa(texturaParquet(), 2), vertexColors: true });
  const gradini = new THREE.MeshLambertMaterial({ map: texDa(texturaGradini()), vertexColors: true });
  for (const iv of INTERVALLI) {
    if (iv.amb === 'est') {
      nastro(iv.inizio, iv.fine, -34, 34, -0.06, (d, c) => coloreMondo('terreno', d, c), 1000, terreno, 3);
      nastro(iv.inizio, iv.fine, -3.3, 3.3, 0.02, (d, c) => coloreMondo('corsie', d, c), TILE_STRADA, strada);
      const marc = (d, c) => coloreMondo('terreno', d, c).lerp(cC.setHex(0xffffff), 0.35);
      nastro(iv.inizio, iv.fine, -6.3, -3.3, 0.12, marc, 1000, marciapiede);
      nastro(iv.inizio, iv.fine, 3.3, 6.3, 0.12, marc, 1000, marciapiede);
    } else {
      // Dentro la scuola: pavimento a piastrelle, con i gradini sulle rampe di scale.
      const scale = SEZIONI.filter(s => s.amb === 'int' && s.id.startsWith('scale') && s.inizio >= iv.inizio && s.fine <= iv.fine);
      let da = iv.inizio;
      const matPav = TRATTI[mondoDi(iv.inizio + 1)].stile === 'casa' ? parquet : pavimento;
      const pezzo = (a, b, mat, tile) => { if (b > a) nastro(a, b, -4.4, 4.4, 0.0, (d, c) => coloreMondo('pavInt', d, c), tile, mat === pavimento ? matPav : mat, 1); };
      for (const s of scale) { pezzo(da, s.inizio, pavimento, TILE_PAV); pezzo(s.inizio, s.fine, gradini, PASSO_GRADINO); da = s.fine; }
      pezzo(da, iv.fine, pavimento, TILE_PAV);
    }
  }
}

// La scuola in lontananza: resta visibile da lontano (fuori dalla nebbia) con un velo d'aria.
const FACCIATE = [
  { mesh: creaScuola(), pos: SEZ_INGRESSO.inizio },
  { mesh: creaScuolaDarmon(), pos: SEZ_INGRESSO_D.inizio },
];
for (const f of FACCIATE) { mettiSulPercorso(f.mesh, f.pos, false); scena.add(f.mesh); }
const coloreCielo = new THREE.Color();

// ---------------------------------------------------------------------------
// Roberto
// ---------------------------------------------------------------------------

const R = creaRoberto(TRATTI[0].eta);
const roberto = R.radice;
roberto.scale.setScalar(FISICA[TRATTI[0].eta].scala);   // 0,8 = alto circa 1,8 m
roberto.rotation.order = 'YXZ';
scena.add(roberto);
R.volto().prepara(['neutro', 'sorriso', 'gioia', 'sforzo', 'sorpresa', 'dolore', 'piange']);

// Cambia l'età di Roberto: aspetto, proporzioni e fisica (salto, quote degli ostacoli, camera).
function impostaEta(eta) {
  if (G.eta === eta) return;
  G.eta = eta;
  R.vesti(eta);
  R.volto().prepara(['neutro', 'sorriso', 'gioia', 'sforzo', 'sorpresa', 'dolore', 'piange']);
  roberto.scale.setScalar(FISICA[eta].scala);
  G.statoPosa = null;
}
const fisica = () => FISICA[G.eta ?? 'liceo'];

// Gocce di sudore: nascono vicino alla fronte e restano indietro.
const GOCCE = Array.from({ length: 12 }, () => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: 0x8FD0FF }));
  m.visible = false;
  m.scale.set(0.9, 1.4, 0.9);
  scena.add(m);
  return { m, vita: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
});
let prossimaGoccia = 0;

function aggiornaSudore(dt, attivo, intensita) {
  prossimaGoccia -= dt;
  if (attivo && prossimaGoccia <= 0) {
    const g = GOCCE.find(x => x.vita <= 0);
    if (g) {
      // Gocce che schizzano dalle tempie verso l'alto e indietro, come nei fumetti (non sotto gli occhi).
      const lato = Math.random() < 0.5 ? -1 : 1;
      g.vita = 0.7 + Math.random() * 0.2;
      g.x = lato * (0.2 + Math.random() * 0.1); g.y = 1.85 + Math.random() * 0.1; g.z = 0.05;
      g.vx = lato * (0.9 + Math.random() * 1.1); g.vy = 2.0 + Math.random() * 1.2; g.vz = 1.5 + Math.random() * 2;
    }
    prossimaGoccia = 0.22 - 0.12 * intensita;
  }
  for (const g of GOCCE) {
    if (g.vita <= 0) { g.m.visible = false; continue; }
    g.vita -= dt;
    g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; g.vy -= 9 * dt;
    daLocale(G.pos, G.x + g.x, G.y + g.y, g.z, g.m.position);
    g.m.visible = g.vita > 0;
  }
}

// ---------------------------------------------------------------------------
// Oggetti del percorso
// ---------------------------------------------------------------------------

const INCLINATI = new Set(['ostacolo', 'semaforo', 'parete', 'soffitto', 'cartello', 'arredo']);

const texNumeri = new Map();
function texNumero(n) {
  if (!texNumeri.has(n)) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#1C1D2B'; g.beginPath(); g.arc(48, 48, 44, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(48, 48, 38, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1C1D2B'; g.font = '800 44px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n), 48, 52, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    texNumeri.set(n, t);
  }
  return texNumeri.get(n);
}

function creaMesh(e) {
  const t = TRATTI[e.mondo ?? 0];
  let m;
  if (e.genere === 'ostacolo') {
    if (e.lungo && (e.stile === 'liceo' || e.stile === 'liceoInt' || e.stile === 'darmon')) m = creaMuroLungo(e);
    else m = creaOstacolo(e, t);
    if (e.tipo !== 'crociera') m.position.x = CORSIE[e.corsia];
  }
  else if (e.genere === 'caffe') {
    m = creaBonus(t.stile);
    e.altBonus = t.stile === 'casa' ? 0.45 : t.stile === 'darmon' ? 0.7 : 0.85;
    m.position.set(CORSIE[e.corsia], e.altBonus, 0);
    const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNumero(e.num), transparent: true, depthWrite: false }));
    n.scale.set(0.7, 0.7, 1); n.position.y = 0.75;
    m.add(n);
  }
  else if (e.genere === 'edificio') m = creaEdificio(e, t);
  else if (e.genere === 'monumento') m = creaMonumento(e, t);
  else if (e.genere === 'lampione') m = creaLampione(e.lato);
  else if (e.genere === 'albero') m = creaAlbero(e.lato, e.scala);
  else if (e.genere === 'arco') m = creaArco(e);
  else if (e.genere === 'semaforo') m = creaSemaforo(e);
  else if (e.genere === 'parete') m = creaPareteStile(e);
  else if (e.genere === 'soffitto') m = creaSoffittoStile(e);
  else if (e.genere === 'arredo') m = creaArredo(e);
  else if (e.genere === 'cartello') m = creaCartelloAppeso(e.testo, e.w, e.colore);
  else if (e.genere === 'portaAula') m = creaPortaAula();
  else if (e.genere === 'portone') m = e.stile === 'casa' ? creaPortaCasa() : creaPortone();
  const involucro = new THREE.Group();
  involucro.add(m);
  if (e.genere === 'soffitto' || e.genere === 'parete') m.traverse(o => { o.castShadow = false; });
  e.interno = m;
  e.anima = m.userData?.anima ?? null;
  return involucro;
}

const bucoInStrada = e => e.genere === 'ostacolo' && e.tipo === 'buco' && e.stile === 'liceo';
const dinamico = e => e.genere === 'caffe' || bucoInStrada(e) || (e.genere === 'ostacolo' && (e.tipo === 'persona' || e.tipo === 'crociera'));

// Distanza effettiva lungo il percorso: i compagni ti vengono incontro.
function distanza(e, pos) {
  if (e.tipo === 'persona') return distanzaPersona(e, pos);
  return e.d;
}
const latoCrociera = (e, pos) => CORSIE[e.corsia] - e.dir * PENDENZA_CROCIERA * (e.d - pos);

function rimuovi(e) {
  scena.remove(e.mesh);
  e.mesh = null; e.interno = null; e.anima = null;
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
  stato: 'inizio',     // inizio | intro | conto | gioco | caduto | pausa | crescita | aulaIn | aula | aulaOut | aulaRientro | fine
  pos: 0,
  tempo: 0,
  malus: 0,
  caffe: 0,
  raccolti: new Set(),
  mondo: 0,
  cp: 0,
  checkpoint: null,
  aulaFatta: false,
  esitoAula: null,
  corsia: 1,
  x: 0,
  y: 0,
  vy: 0,
  scivola: 0,
  timer: 0,
  passo: 0,
  cadute: 0,
  nome: '',
  eta: null,           // neonato | bimbo | liceo
  bassa: 0,            // 0..1: a gattoni, quanto si striscia sulla pancia
  exprTemp: 0, exprNome: 'neutro',
};

G.eta = TRATTI[0].eta;
const GRAVITA = 28;
const DURATA_INTRO = 3.6;
const DURATA_SIPARIO = 0.45;

function azzeraGiocatore() {
  G.corsia = 1; G.x = 0; G.y = 0; G.vy = 0; G.scivola = 0;
}

// Dal menù di sviluppo si può partire da un mondo qualsiasi.
const elDevMondo = document.getElementById('dev-mondo');
if (elDevMondo && MODALITA_SVILUPPO) {
  elDevMondo.innerHTML = TRATTI.map((t, i) => `<option value="${i}">${i + 1} · ${t.nome}</option>`).join('');
  elDevMondo.closest('label').hidden = false;
  try { elDevMondo.value = localStorage.getItem('gioco-laurea:dev-mondo') || '0'; } catch {}
}
const mondoDiPartenza = () => Math.min(TRATTI.length - 1, Math.max(0, Number(elDevMondo?.value) || 0));

function salvaCheckpoint(i) {
  G.cp = i;
  G.checkpoint = { pos: CHECKPOINT[i].pos, mondo: CHECKPOINT[i].mondo, caffe: G.caffe, raccolti: new Set(G.raccolti) };
}

function nuovaPartita() {
  const m0 = MODALITA_SVILUPPO ? mondoDiPartenza() : 0;
  try { localStorage.setItem('gioco-laurea:dev-mondo', String(m0)); } catch {}
  G.pos = TRATTI[m0].inizio; G.tempo = 0; G.malus = 0; G.caffe = 0; G.raccolti = new Set(); G.mondo = m0; G.cadute = 0;
  G.aulaFatta = false; G.esitoAula = null; G.invul = 0; G.posCaduta = null; G.bassa = 0; G.exprTemp = 0;
  impostaEta(TRATTI[m0].eta);
  salvaCheckpoint(CHECKPOINT.findIndex(c => c.mondo === m0 && c.nuovoMondo));
  azzeraGiocatore();
  riposiziona(G.pos);
  mostraSchermo(null);
  hud.radice.hidden = true;
  elOrologio.hidden = true;
  elScelta.hidden = true;
  elSipario.classList.remove('nero');
  G.stato = 'intro';
  G.timer = 0;
  G.bannerIntro = false;
}

function iniziaCorsa() {
  G.stato = 'gioco';
  hud.radice.hidden = false;
  const t = TRATTI[G.mondo];
  banner(`Via!<small>${ARCHI[t.arco] ?? ''} · ${t.nome} · ${t.anni}</small>`, 1.8);
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
  G.posCaduta = G.pos;
  banner(`Ahi!<small>${MODALITA_SVILUPPO ? 'Si riparte da qui (modalità sviluppo)' : 'Si riparte dall\'ultimo checkpoint'}</small>`, 1.2);
  if (navigator.vibrate) navigator.vibrate(120);
}

function ripartiDalCheckpoint() {
  if (MODALITA_SVILUPPO) {
    // Si riparte poco prima del punto della caduta, tenendo caffè e tempo; i checkpoint restano
    // calcolati ma non si usano.
    G.pos = Math.max(0, (G.posCaduta ?? G.pos) - RESPAWN_INDIETRO);
    G.mondo = mondoDi(G.pos);
    impostaEta(TRATTI[G.mondo].eta);
    G.invul = RESPAWN_INVULNERABILE;
    azzeraGiocatore();
    riposiziona(G.pos);
    G.stato = 'gioco';
    return;
  }
  const c = G.checkpoint;
  G.mondo = c.mondo;
  impostaEta(TRATTI[G.mondo].eta);
  G.pos = c.pos;
  G.caffe = c.caffe;
  G.raccolti = new Set(c.raccolti);
  azzeraGiocatore();
  riposiziona(G.pos);
  G.stato = 'gioco';
}

function entraNelMondo(i) {
  G.mondo = i;
  const t = TRATTI[i];
  banner(`Mondo ${i + 1} di ${TRATTI.length}<small>${t.nome} · ${t.anni}</small>`, 2.2);
}

// ---------------------------------------------------------------------------
// Crescita: tra due età Roberto cresce davanti agli occhi (alla partenza del mondo successivo)
// ---------------------------------------------------------------------------

const DURATA_CRESCITA = 5.4;
const ANNI = { neonato: 0, bimbo: 6, liceo: 14 };
const elEta = document.getElementById('eta-conto');
const elLampo = document.getElementById('lampo');
const SCINTILLE = Array.from({ length: 36 }, (_, i) => {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: [0xFFD23F, 0xFFFFFF, 0xFF8FB0, 0x7FD6FF][i % 4], transparent: true }));
  m.visible = false;
  scena.add(m);
  return { m, vita: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
});

function scoppiaScintille(n, altezza) {
  for (const sc of SCINTILLE.slice(0, n)) {
    const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 2.5;
    sc.vita = 0.9 + Math.random() * 0.6;
    sc.x = 0; sc.y = altezza; sc.z = 0;
    sc.vx = Math.cos(a) * v; sc.vz = Math.sin(a) * v; sc.vy = 1.5 + Math.random() * 2.5;
  }
}
function aggiornaScintille(dt) {
  for (const sc of SCINTILLE) {
    if (sc.vita <= 0) { sc.m.visible = false; continue; }
    sc.vita -= dt;
    sc.x += sc.vx * dt; sc.y += sc.vy * dt; sc.z += sc.vz * dt; sc.vy -= 4 * dt;
    daLocale(G.pos, sc.x, sc.y, sc.z, sc.m.position);
    sc.m.visible = sc.vita > 0;
    sc.m.scale.setScalar(Math.max(0.01, Math.min(1, sc.vita * 2)));
    sc.m.rotation.y += dt * 6; sc.m.rotation.x += dt * 4;
  }
}

function avviaCrescita(m) {
  G.stato = 'crescita';
  G.timer = 0;
  G.crescita = { da: G.eta, a: TRATTI[m].eta, mondo: m, scambiato: false };
  G.invul = 0;
  azzeraGiocatore();
  elBanner.hidden = true;
  elEta.hidden = false;
  // L'arco del nuovo mondo resta fuori campo: la camera lo guarderebbe da dietro.
  for (const e of attive) if (e.genere === 'arco' && e.mesh) e.mesh.visible = false;
}

function finisciCrescita() {
  const m = G.crescita.mondo;
  elEta.hidden = true;
  for (const e of attive) if (e.genere === 'arco' && e.mesh) e.mesh.visible = true;
  G.crescita = null;
  G.statoPosa = null;
  G.invul = 0.6;
  entraNelMondo(m);
  G.stato = 'gioco';
}

async function fine() {
  G.stato = 'fine';
  hud.radice.hidden = true;
  elOrologio.hidden = true;
  const totale = Math.max(0, G.tempo + G.malus - G.caffe * BONUS_CAFFE);
  document.getElementById('fine-data').textContent = `${TRAGUARDO.nome} · ${TRAGUARDO.data}`;
  document.getElementById('fine-tempo').textContent = formattaTempo(totale);
  document.getElementById('fine-dettaglio').textContent =
    `Corsa ${formattaTempo(G.tempo)} · bonus ${G.caffe} su ${CAFFE_TOTALI} · ` +
    (G.cadute === 1 ? '1 caduta' : `${G.cadute} cadute`) +
    (G.malus ? ` · prima fila +${G.malus} s` : '');
  mostraSchermo('fine');
  const arrotondato = Math.round(totale * 10) / 10;
  await inviaTempo(G.nome, arrotondato);
  disegnaClassifica(document.getElementById('fine-classifica'), G.nome, arrotondato);
}

// ---------------------------------------------------------------------------
// La scena in classe
// ---------------------------------------------------------------------------

const elSipario = document.getElementById('sipario');
const elScelta = document.getElementById('scelta');
const elBarraScelta = document.getElementById('barra-scelta');
const elOrologio = document.getElementById('orologio');

function avviaAula() {
  G.stato = 'aulaIn';
  G.timer = 0;
  G.esitoAula = null;
  elSipario.classList.add('nero');
}

function scegliInAula(esito) {
  if (G.stato !== 'aula' || aula.stato !== 'scelta') return;
  aula.scegli(esito);
  applicaEsito(esito);
}

function applicaEsito(esito) {
  G.esitoAula = esito;
  elScelta.hidden = true;
  if (esito === 'prima') {
    G.malus += MALUS_PRIMA_FILA;
    banner(`Prima fila<small>+${MALUS_PRIMA_FILA} secondi di penalità</small>`, 2.4, 'in-basso');
  } else {
    banner('Ultima fila<small>Con i tuoi amici</small>', 2.0, 'in-basso');
  }
}
for (const b of document.querySelectorAll('[data-scelta]')) {
  b.addEventListener('click', () => scegliInAula(b.dataset.scelta));
}

function aggiornaAula(dt) {
  if (G.stato === 'aulaIn') {
    G.timer += dt;
    if (G.timer >= DURATA_SIPARIO) {
      G.stato = 'aula';
      aula.avvia();
      elBanner.hidden = true;
      elSipario.classList.remove('nero');
    }
  } else if (G.stato === 'aula') {
    aula.aggiorna(G.congela ? 0 : dt);
    if (aula.esito && !G.esitoAula) applicaEsito(aula.esito);   // tempo scaduto: prima fila
    const inScelta = aula.stato === 'scelta';
    if (inScelta && elScelta.hidden) elScelta.hidden = false;
    if (!inScelta && !elScelta.hidden) elScelta.hidden = true;
    if (inScelta) elBarraScelta.style.transform = `scaleX(${aula.residuo / TEMPO_SCELTA})`;
    if (aula.stato === 'fine') {
      G.stato = 'aulaOut';
      G.timer = 0;
      elSipario.classList.add('nero');
    }
  } else if (G.stato === 'aulaOut') {
    G.timer += dt;
    if (G.timer >= DURATA_SIPARIO) {
      G.aulaFatta = true;
      G.pos = PORTA_AULA + 0.6;
      G.corsia = 1; G.x = 0; G.y = 0; G.vy = 0;
      riposiziona(G.pos);
      G.stato = 'aulaRientro';
      G.timer = 0;
      elSipario.classList.remove('nero');
      banner('Fuori dall\'aula<small>La campanella è suonata, si scende</small>', 2.2);
    }
  } else if (G.stato === 'aulaRientro') {
    G.timer += dt;
    if (G.timer >= 0.5) G.stato = 'gioco';
  }
}

// ---------------------------------------------------------------------------
// Comandi
// ---------------------------------------------------------------------------

function comando(azione) {
  if (G.stato !== 'gioco') return;
  if (azione === 'sinistra') G.corsia = Math.max(0, G.corsia - 1);
  if (azione === 'destra') G.corsia = Math.min(2, G.corsia + 1);
  if (azione === 'su' && G.y <= 0.001) { G.vy = Math.sqrt(2 * GRAVITA * fisica().salto); G.scivola = 0; }
  if (azione === 'giu') {
    if (G.y > 0.001) G.vy = -Math.sqrt(2 * GRAVITA * fisica().salto) * 1.6;
    G.scivola = 0.75;
  }
}

function saltaCrescita() {
  if (G.stato === 'crescita' && MODALITA_SVILUPPO && G.timer < DURATA_CRESCITA - 0.5) G.timer = DURATA_CRESCITA - 0.5;
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
  saltaCrescita();
  if (G.stato === 'aula') {
    if (ev.code === 'ArrowUp' || ev.code === 'Digit1') scegliInAula('prima');
    if (ev.code === 'ArrowDown' || ev.code === 'Digit2') scegliInAula('ultima');
  }
  if (tasti[ev.code] && G.stato === 'gioco') { ev.preventDefault(); comando(tasti[ev.code]); }
  if (ev.code === 'Escape' || ev.code === 'KeyP') metti_in_pausa();
});

let tocco = null;
contenitore.addEventListener('touchstart', ev => {
  const t = ev.changedTouches[0];
  tocco = { x: t.clientX, y: t.clientY, usato: false };
  saltaIntro();
  saltaCrescita();
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

const cInt = new THREE.Color();
const cTerra = new THREE.Color(0x77736a), cTerraInt = new THREE.Color(0xC2BCB0);

function aggiornaColori() {
  const k = perc.quantoInterno(G.pos + 3, 6);
  coloreMondo('intCielo', G.pos, cInt);
  coloreMondo('cielo', G.pos, cA).lerp(cInt, k);
  scena.background.copy(cA);
  scena.fog.color.copy(cA);
  scena.fog.near = THREE.MathUtils.lerp(NEBBIA_EST[0], NEBBIA_INT[0], k);
  scena.fog.far = THREE.MathUtils.lerp(NEBBIA_EST[1], NEBBIA_INT[1], k);
  const notte = TRATTI[mondoDi(G.pos)].stile === 'festival';
  cielo.intensity += (THREE.MathUtils.lerp(notte ? 0.7 : 1.5, 1.9, k) - cielo.intensity) * 0.1;
  sole.intensity += (THREE.MathUtils.lerp(notte ? 0.5 : 1.6, 0.1, k) - sole.intensity) * 0.1;
  coloreMondo('terraInt', G.pos, cTerraInt);
  cielo.groundColor.copy(cTerra).lerp(cTerraInt, k);

  // La scuola in lontananza si schiarisce con la distanza (velo d'aria).
  for (const fa of FACCIATE) {
    fa.mesh.visible = G.pos < fa.pos + 4 && G.pos > fa.pos - 700;
    if (!fa.mesh.visible) continue;
    fa.mesh.userData.apri(aperturaPorta(fa.pos - G.pos));
    const f = THREE.MathUtils.smoothstep(fa.pos - G.pos, 90, 650) * 0.72;
    for (const { m, base } of fa.mesh.userData.materiali) m.color.copy(base).lerp(cA, f);
  }
}

// Le porte si aprono quando ci si avvicina: chiuse oltre 18 m, aperte a 8 m.
const aperturaPorta = distanza => THREE.MathUtils.smoothstep(18 - distanza, 0, 10);

function aggiornaEntita(ora) {
  const pos = G.pos;
  while (prossima < ENTITA.length && ENTITA[prossima].d - mezzaLunghezza(ENTITA[prossima]) < pos + VISTA) {
    const e = ENTITA[prossima++];
    if (distanza(e, pos) + mezzaLunghezza(e) < pos - DIETRO) continue;
    if (e.genere === 'caffe' && G.raccolti.has(e)) continue;
    if (e.genere === 'portaAula' && G.aulaFatta) continue;
    e.mesh = creaMesh(e);
    scena.add(e.mesh);
    if (!dinamico(e)) mettiSulPercorso(e.mesh, e.d, INCLINATI.has(e.genere));
    attive.push(e);
  }
  for (let i = attive.length - 1; i >= 0; i--) {
    const e = attive[i];
    const d = distanza(e, pos);
    if (d + mezzaLunghezza(e) < pos - DIETRO || (e.genere === 'portaAula' && G.aulaFatta)) {
      rimuovi(e); attive.splice(i, 1);
      continue;
    }
    if (e.genere === 'caffe') {
      mettiSulPercorso(e.mesh, e.d, false);
      e.interno.rotation.y += 0.05;
      e.interno.position.y = e.altBonus + Math.sin(ora / 250 + e.d) * 0.08;
    } else if (bucoInStrada(e)) {
      // La buca spunta con un rimbalzo circa 1 s prima di arrivarci.
      mettiSulPercorso(e.mesh, e.d, true);
      const v = velocitaIn(pos);
      const p = THREE.MathUtils.clamp((v * 1.15 - (e.d - pos)) / (v * 0.3), 0, 1), x = p - 1;
      e.interno.scale.setScalar(p === 0 ? 0.001 : Math.max(0.001, 1 + 2.70158 * x * x * x + 1.70158 * x * x));
    } else if (e.tipo === 'persona') {
      mettiSulPercorso(e.mesh, d, true);
      e.anima?.(ora / 1000);
    } else if (e.tipo === 'crociera') {
      mettiSulPercorso(e.mesh, e.d, true);
      const lat = latoCrociera(e, pos);
      e.mesh.position.x += Math.cos(tmp.psi) * lat;
      e.mesh.position.z += Math.sin(tmp.psi) * lat;
    } else if (e.interno.userData.apri) {
      e.interno.userData.apri(aperturaPorta(e.d - pos));
    }
  }
}

function controllaUrti() {
  if (G.immune || G.invul > 0) return;
  const f = fisica();
  const altezza = G.scivola > 0 ? f.altezzaBassa : f.altezza;
  const basso = G.y, alto = G.y + altezza;
  for (let i = attive.length - 1; i >= 0; i--) {
    const e = attive[i];
    if (e.genere !== 'ostacolo' && e.genere !== 'caffe') continue;
    const d = distanza(e, G.pos);
    if (Math.abs(d - G.pos) > mezzaLunghezza(e) + 0.4) continue;
    if (e.tipo === 'crociera') {
      // L'auto è larga 4,2 m lungo x: colpisce chi sta nella sua corsia o in quella accanto.
      if (Math.abs(latoCrociera(e, G.pos) - G.x) < 2.1 + 0.5 && basso < 1.3) { caduta(); return; }
      continue;
    }
    if (Math.abs(CORSIE[e.corsia] - G.x) > 1.15) continue;
    if (e.genere === 'caffe') {
      G.caffe++;
      G.exprNome = 'gioia'; G.exprTemp = 0.9;
      G.raccolti.add(e);
      rimuovi(e); attive.splice(i, 1);
      continue;
    }
    // Intervallo di quota occupato dall'ostacolo. La buca si supera saltando.
    const [oBasso, oAlto] = e.tipo === 'basso' ? [0, f.bassoMax] : e.tipo === 'alto' ? [f.altoDa, 3]
      : e.tipo === 'buco' ? [-1, f.bucoMax] : e.tipo === 'persona' && e.stile === 'casa' ? [0, FISICA.neonato.persona] : [0, 3];
    if (alto > oBasso && basso < oAlto) { caduta(); return; }
  }
}

// Quanto ci si sta avvicinando alla porta dell'aula: 0 lontano, 1 davanti alla porta.
function avvicinamentoAula() {
  if (G.aulaFatta || G.mondo !== LICEO) return 0;
  return THREE.MathUtils.smoothstep(G.pos, SEZ_AULA.inizio - AVVICINAMENTO_AULA, SEZ_AULA.inizio + 2);
}

function animaRoberto(dt) {
  perc.punto(G.pos, tmp);
  const c = Math.cos(tmp.psi), s = Math.sin(tmp.psi);
  roberto.position.set(tmp.x + c * G.x, tmp.h + G.y, tmp.z + s * G.x);
  roberto.rotation.set(Math.atan(tmp.pend) * 0.5, -tmp.psi, 0);
  roberto.visible = !(G.invul > 0) || Math.floor(G.invul * 12) % 2 === 0;   // lampeggia dopo la ripartenza
  const f = fisica();
  G.exprTemp = Math.max(0, G.exprTemp - dt);
  R.aggiornaVolto(dt);

  if (G.stato === 'intro') {
    const corre = G.timer > DURATA_INTRO - 1.2;
    const saluto = THREE.MathUtils.smoothstep(G.timer, 0.3, 0.7) * (1 - THREE.MathUtils.smoothstep(G.timer, 1.6, 2.0));
    R.espressione(saluto > 0.5 ? 'gioia' : 'sorriso');
    if (f.posa === 'gattona') {
      // Il neonato saluta a gattoni, alzando una manina.
      G.passo += dt * 14 * (corre ? 1 : 0);
      posaGattona(R, G.passo, corre ? Math.min(1, (G.timer - (DURATA_INTRO - 1.2)) * 2) : 0.0);
      if (!corre && saluto > 0) {
        const m = R.braccia[1];
        m.spalla.rotation.x = -Math.PI * 0.62 * saluto + (1 - saluto) * m.spalla.rotation.x;
        m.spalla.rotation.z = 0.35 * saluto;
        m.gomito.rotation.x = -0.3 + Math.sin(G.timer * 12) * 0.5 * saluto;
      }
      R.corpo.rotation.x = 0;
      return;
    }
    if (corre) { G.passo += dt * 14; posaCorsa(R, G.passo, Math.min(1, (G.timer - (DURATA_INTRO - 1.2)) * 2)); }
    else posaFerma(R, G.timer, saluto);
    R.corpo.rotation.x = 0;
    return;
  }

  if (G.stato === 'crescita') { animaCrescita(dt); return; }

  // Se lo stato precedente ha lasciato qualcosa di storto (intro saltata, caduta, ritorno dall'aula),
  // si riparte da una posa pulita.
  if (G.statoPosa !== G.stato) { azzeraPosa(R); G.statoPosa = G.stato; }
  const inCorsa = G.stato === 'gioco' || G.stato === 'aulaIn';
  const inAria = G.y > 0.001;

  // Espressione del volto.
  let nome;
  if (G.stato === 'caduto') nome = G.eta === 'neonato' ? 'piange' : 'dolore';
  else if (G.exprTemp > 0) nome = G.exprNome;
  else if (G.stato === 'conto') nome = 'sorriso';
  else if (inAria) nome = f.posa === 'gattona' ? 'gioia' : 'sorpresa';
  else if (G.scivola > 0) nome = 'sforzo';
  else nome = f.posa === 'gattona' ? 'sorriso' : 'sforzo';
  R.espressione(nome);

  if (f.posa === 'gattona') {
    // A gattoni: ritmo lento e dondolante; pancia a terra quando ci si abbassa.
    if (inCorsa) G.passo += dt * velocitaIn(G.pos) * 1.45;
    G.bassa += ((G.scivola > 0 ? 1 : 0) - G.bassa) * Math.min(1, dt * 14);
    posaGattona(R, G.passo, inAria ? 0.25 : 1, G.bassa);
    R.corpo.rotation.set(0, 0, 0);
    if (G.stato === 'caduto') { R.corpo.rotation.z = 1.25; R.corpo.position.y = 0.12; }
    roberto.rotation.z = (G.x - CORSIE[G.corsia]) * 0.12 + Math.sin(G.passo * 0.5) * 0.05;
    return;
  }

  if (inCorsa) G.passo += dt * velocitaIn(G.pos) * 0.75 * (1 - 0.65 * avvicinamentoAula());
  R.testa.rotation.set(0, 0, 0);
  posaCorsa(R, G.passo, inAria ? 0.35 : 1);
  if (inAria) for (const { ginocchio } of R.gambe) ginocchio.rotation.x = 1.1;

  const piegato = G.scivola > 0 ? -1.15 : 0;
  R.corpo.rotation.x += (piegato - R.corpo.rotation.x) * Math.min(1, dt * 18);
  R.corpo.position.y = G.scivola > 0 ? 0.35 : (inAria ? 0 : Math.abs(Math.sin(G.passo)) * 0.06);
  roberto.rotation.z = (G.x - CORSIE[G.corsia]) * 0.12;
  if (G.stato === 'caduto') { R.corpo.rotation.x = 1.3; R.corpo.position.y = 0.3; }
}

// La crescita: Roberto si ferma, sorpreso; cresce girando su se stesso tra scintille e un lampo;
// poi saluta con la nuova età e riparte.
const T_ATTESA = 0.9, T_CRESCE = 2.6, T_SALUTO = 1.3;
function progressoCrescita() {
  return THREE.MathUtils.smootherstep(G.timer, T_ATTESA, T_ATTESA + T_CRESCE);
}
function animaCrescita(dt) {
  const cr = G.crescita, t = G.timer;
  const k = progressoCrescita();
  const sDa = FISICA[cr.da].scala, sA = FISICA[cr.a].scala;
  // A metà crescita: lampo bianco, cambio d'abito, scintille.
  if (!cr.scambiato && k >= 0.5) {
    cr.scambiato = true;
    impostaEta(cr.a);
    elLampo.classList.add('acceso');
    setTimeout(() => elLampo.classList.remove('acceso'), 160);
    scoppiaScintille(36, 0.5 * sA / 0.8 + 0.4);
  }
  if (cr.scambiato && !cr.scintille2 && k >= 0.95) { cr.scintille2 = true; scoppiaScintille(18, 0.9 * sA / 0.8); }
  // Contatore degli anni.
  const anni = Math.round(THREE.MathUtils.lerp(ANNI[cr.da], ANNI[cr.a], k));
  elEta.innerHTML = `<b>${anni}</b> ${anni === 1 ? 'anno' : 'anni'}<small>${TRATTI[cr.mondo].nome}</small>`;
  elEta.style.transform = `translateX(-50%) scale(${1 + 0.12 * Math.sin(Math.min(1, k * 8) * Math.PI)})`;

  // Scala con un effetto "gomma": si allunga e si schiaccia mentre cresce.
  const squash = Math.sin(k * Math.PI * 7) * 0.09 * Math.sin(k * Math.PI);
  const s = THREE.MathUtils.lerp(sDa, sA, k);
  roberto.scale.set(s * (1 - squash * 0.6), s * (1 + squash), s * (1 - squash * 0.6));
  roberto.rotation.y = -tmp.psi + k * Math.PI * 2;

  azzeraPosa(R);
  if (t < T_ATTESA) { posaFerma(R, t, 0); R.espressione('sorpresa'); }
  else if (t < T_ATTESA + T_CRESCE) {
    posaFerma(R, t, 0);
    // Braccia in su mentre cresce.
    const su = Math.sin(k * Math.PI);
    R.braccia[0].spalla.rotation.z = -0.08 - su * 2.4; R.braccia[1].spalla.rotation.z = 0.08 + su * 2.4;
    R.espressione(k < 0.5 ? 'sforzo' : 'gioia');
  } else {
    const ts = t - (T_ATTESA + T_CRESCE);
    posaFerma(R, t, THREE.MathUtils.smoothstep(ts, 0.1, 0.4) * (1 - THREE.MathUtils.smoothstep(ts, T_SALUTO - 0.2, T_SALUTO)));
    R.espressione('gioia');
    roberto.scale.setScalar(sA);
  }
}

const guarda = new THREE.Vector3(), daIntro = new THREE.Vector3();
const camP = { ...FISICA[TRATTI[0].eta].camera };      // valori della camera, sfumati quando cambia l'età
function aggiornaCamera(dt) {
  const f = fisica();
  const cam = f.camera;
  if (G.stato === 'intro') {
    // Prima davanti al volto, poi un giro attorno a Roberto fino alla visuale di corsa.
    const k = THREE.MathUtils.smootherstep(G.timer, 1.6, DURATA_INTRO - 0.2);
    const ang = k * Math.PI;
    const sc = f.scala / 0.8;
    const gattona = f.posa === 'gattona';
    // A gattoni la testa è un po' avanti rispetto al centro del personaggio.
    const faccia = gattona ? 0.5 : 1.5 * sc, cz = gattona ? -0.3 : 0;
    const raggio = THREE.MathUtils.lerp(gattona ? 2.2 : 1.5 * sc, cam.indietro, k);
    const avvicina = 1 - THREE.MathUtils.smootherstep(G.timer, 0, 1.2);
    daLocale(G.pos, Math.sin(ang) * raggio * 0.6, THREE.MathUtils.lerp(faccia + 0.05, cam.alto, k), cz - Math.cos(ang) * raggio - avvicina * 0.8 * sc, camera.position);
    daLocale(G.pos, 0, faccia, gattona ? -0.55 : 0, guarda);
    daLocale(G.pos, 0, cam.guarda, -10, daIntro);
    guarda.lerp(daIntro, k * k);
    camera.lookAt(guarda);
    Object.assign(camP, cam);
    return;
  }
  if (G.stato === 'crescita') {
    // Davanti a Roberto, con un leggero giro, mentre cresce.
    const cr = G.crescita, k = progressoCrescita();
    const rel = THREE.MathUtils.lerp(FISICA[cr.da].scala, FISICA[cr.a].scala, k) / 0.8;
    const dist = 2.3 + 2.6 * rel;
    const ang = 0.5 * Math.sin(G.timer * 0.8);
    daLocale(G.pos, Math.sin(ang) * dist * 0.7, 0.6 + 0.75 * rel, -Math.cos(ang) * dist, camera.position);
    daLocale(G.pos, 0, 0.4 + 0.75 * rel, 0, guarda);
    camera.lookAt(guarda);
    Object.assign(camP, FISICA[cr.a].camera);
    camera.fov = fovBase * 0.95; camera.updateProjectionMatrix();
    return;
  }
  // Valori della camera dell'età: si adattano piano quando Roberto cambia età.
  const dolce = 1 - Math.exp(-dt * 3);
  for (const k of ['indietro', 'alto', 'guarda', 'fov']) camP[k] += (cam[k] - camP[k]) * dolce;
  const kAula = avvicinamentoAula();
  const kInt = perc.quantoInterno(G.pos, 6);
  const indietro = camP.indietro * THREE.MathUtils.lerp(1, 0.84, kInt) - 2.4 * kAula;
  const alto = camP.alto * THREE.MathUtils.lerp(1, 0.88, kInt) - 1.2 * kAula;
  // Il neonato dondola un po' mentre gattona.
  const dondolo = G.eta === 'neonato' && G.stato === 'gioco' ? Math.sin(G.passo * 0.5) : 0;
  const lat = G.x * 0.45 + dondolo * 0.1;

  perc.punto(G.pos - indietro, tmp);
  camera.position.set(tmp.x + Math.cos(tmp.psi) * lat, tmp.h + alto + G.y * 0.25, tmp.z + Math.sin(tmp.psi) * lat);
  perc.punto(G.pos + 10, tmp);
  guarda.set(tmp.x + Math.cos(tmp.psi) * lat, tmp.h + camP.guarda + 0.25 * kAula, tmp.z + Math.sin(tmp.psi) * lat);
  camera.lookAt(guarda);
  if (dondolo) camera.rotateZ(dondolo * 0.025);

  const fov = fovBase * camP.fov * (1 - 0.22 * kAula);
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

const pad2 = n => String(n).padStart(2, '0');
function aggiornaOrologio() {
  const visibile = G.mondo === LICEO && G.pos < SEZ_INGRESSO.inizio && !hud.radice.hidden
    && (G.stato === 'gioco' || G.stato === 'caduto' || G.stato === 'conto' || G.stato === 'pausa');
  elOrologio.hidden = !visibile;
  if (!visibile) return;
  const m = ORA_PARTENZA + (ORA_CAMPANELLA - ORA_PARTENZA) * Math.min(1, G.pos / SEZ_INGRESSO.inizio);
  elOrologio.textContent = `🔔 ${Math.floor(m / 60)}:${pad2(Math.floor(m % 60))}`;
  elOrologio.classList.toggle('urgente', m >= ORA_CAMPANELLA - 4);
}

function controllaCheckpoint() {
  while (G.cp + 1 < CHECKPOINT.length && G.pos >= CHECKPOINT[G.cp + 1].pos) {
    salvaCheckpoint(G.cp + 1);
    const c = CHECKPOINT[G.cp];
    if (c.nuovoMondo) continue;
    banner(`${c.nome}${c.sotto ? `<small>${c.sotto}</small>` : ''}`, 2.2);
  }
}

let ultimo = performance.now();
function ciclo(ora) {
  const dt = Math.min(0.05, (ora - ultimo) / 1000);
  ultimo = ora;

  if (G.stato === 'aulaIn' || G.stato === 'aula' || G.stato === 'aulaOut' || G.stato === 'aulaRientro') aggiornaAula(dt);

  if (G.stato === 'intro') {
    G.timer += dt;
    if (!G.bannerIntro && G.timer > 0.4) {
      G.bannerIntro = true;
      banner(`Roberto Rocco<small>${G.mondo === 0 ? 'Dalla culla alla laurea' : TRATTI[G.mondo].nome}</small>`, 1.5, 'in-basso');
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
  } else if (G.stato === 'gioco' || G.stato === 'aulaIn') {
    if (G.stato === 'gioco') G.tempo += dt;
    G.pos += velocitaIn(G.pos) * (1 - 0.65 * avvicinamentoAula()) * dt;

    const bersaglio = CORSIE[G.corsia];
    G.x += (bersaglio - G.x) * Math.min(1, dt * fisica().cambioCorsia);
    G.vy -= GRAVITA * dt;
    G.y = Math.max(0, G.y + G.vy * dt);
    if (G.y === 0) G.vy = 0;
    G.scivola = Math.max(0, G.scivola - dt);
    G.invul = Math.max(0, (G.invul ?? 0) - dt);

    if (G.stato === 'gioco') {
      const m = mondoDi(G.pos);
      if (m !== G.mondo) {
        // Cambio d'età: la crescita parte poco dopo l'arco del nuovo mondo.
        if (TRATTI[m].eta !== G.eta) { if (G.pos >= TRATTI[m].inizio + 3) avviaCrescita(m); }
        else entraNelMondo(m);
      }
      controllaCheckpoint();
      if (G.pos >= LUNGHEZZA) { G.pos = LUNGHEZZA; fine(); }
      else if (!G.aulaFatta && G.mondo === LICEO && G.pos >= SEZ_AULA.inizio + 3) avviaAula();
      else controllaUrti();
    }
  } else if (G.stato === 'crescita') {
    G.timer += dt;
    if (G.timer >= DURATA_CRESCITA) finisciCrescita();
  } else if (G.stato === 'caduto') {
    G.tempo += dt;
    G.timer -= dt;
    if (G.timer <= 0) ripartiDalCheckpoint();
  }

  if (durataBanner > 0) {
    durataBanner -= dt;
    if (durataBanner <= 0) { elBanner.hidden = true; elBanner.innerHTML = ''; }
  }

  const inAula = G.stato === 'aula' || G.stato === 'aulaOut';
  if (!inAula) {
    aggiornaEntita(ora);
    aggiornaColori();
    animaRoberto(dt);
    aggiornaCamera(dt);
    aggiornaScintille(dt);
    const sudore = G.mondo === LICEO && G.pos < SEZ_INGRESSO.inizio + 120 && (G.stato === 'gioco' || G.stato === 'aulaIn');
    aggiornaSudore(dt, sudore, Math.min(1, G.pos / SEZ_INGRESSO.inizio));

    // Il sole è fisso rispetto alla direzione di corsa; il riquadro è allungato lungo il percorso.
    perc.punto(G.pos, tmp);
    const sn = Math.sin(tmp.psi), cs = Math.cos(tmp.psi);
    sole.target.position.set(roberto.position.x + sn * 22, roberto.position.y, roberto.position.z - cs * 22);
    sole.position.set(sole.target.position.x - 4 * cs - 9 * sn, sole.target.position.y + 14, sole.target.position.z - 4 * sn + 9 * cs);
    sole.shadow.camera.up.set(sn, 0, -cs);
  }

  if (G.stato !== 'inizio' && G.stato !== 'fine' && G.stato !== 'pausa' && G.stato !== 'intro') {
    hud.tempo.textContent = formattaTempo(G.tempo + G.malus);
    hud.caffe.textContent = `${ICONA_BONUS[TRATTI[G.mondo].stile] ?? '☕'} ${G.caffe}`;
    hud.mondo.textContent = `${G.mondo + 1}/${TRATTI.length} · ${TRATTI[G.mondo].nome}${MODALITA_SVILUPPO ? ' · DEV' : ''}`;
    hud.barra.style.width = `${(G.pos / LUNGHEZZA) * 100}%`;
  }
  aggiornaOrologio();

  if (inAula) renderer.render(aula.scena, aula.camera);
  else renderer.render(scena, camera);
  requestAnimationFrame(ciclo);
}

riposiziona(0);
requestAnimationFrame(ciclo);

// Aiuto per i test automatici.
window.__gioco = {
  G, R, ENTITA, TRATTI, SEZIONI, CHECKPOINT, LUNGHEZZA, perc, aula, comando, velocitaIn, FISICA, impostaEta, avviaCrescita, camera, scena,
  mostraAula(esito, secondi = 0) {
    G.stato = 'aula'; G.esitoAula = esito; G.congela = true; G.immune = true; elSipario.classList.remove('nero');
    aula.avvia();
    if (esito) aula.scegli(esito);
    for (let t = 0; t < secondi; t += 0.05) aula.aggiorna(0.05);
  },
  teletrasporta(pos) {
    G.pos = pos; G.mondo = mondoDi(pos); G.aulaFatta = pos > PORTA_AULA; impostaEta(TRATTI[G.mondo].eta);
    G.cp = 0; while (G.cp + 1 < CHECKPOINT.length && pos >= CHECKPOINT[G.cp + 1].pos) G.cp++;
    G.checkpoint = { pos: CHECKPOINT[G.cp].pos, mondo: CHECKPOINT[G.cp].mondo, caffe: 0, raccolti: new Set() };
    azzeraGiocatore(); riposiziona(pos);
    G.stato = 'gioco'; hud.radice.hidden = false; mostraSchermo(null);
  },
};
