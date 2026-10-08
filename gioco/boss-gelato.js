// Boss di fine liceo: il Gelato Gigante. Fluttua davanti a Roberto lungo la sezione 'boss-gelato' e attacca
// in tre fasi, una per gusto:
//   pistacchio  coni gelato che cadono dal cielo (l'ombra a terra dice dove): si cambia corsia;
//   fragola     palline di fragola lanciate che rotolano verso di te: si salta o si cambia corsia;
//   cioccolato  onde di cioccolato: quelle alte si passano abbassandosi, quelle basse saltando.
// Niente scritte: ogni colpo è uno schizzo di gelato del suo gusto, Roberto ingrassa (al massimo 5 volte),
// rallenta del 20% a colpo (a 5 colpi va alla metà) e perde 1 secondo; ogni 5 secondi senza colpi
// dimagrisce di un passo, piano piano, fino alla forma di partenza.

import * as THREE from './lib/three.module.min.js';
import { tela } from './modelli.js';

export const MAX_GRASSO = 5;
export const MALUS_COLPO = 1;            // secondi per ogni colpo
const RALLENTA = 0.2;                    // a ogni passo di grasso: velocità / (1 + 0.2 · passi)
const DIMAGRISCE_DOPO = 5;               // secondi senza colpi per perdere un passo
const INVULNERABILE = 1.0;

const L = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const BAS = c => new THREE.MeshBasicMaterial({ color: c });

export const GUSTI = {
  pistacchio: { colore: 0x9CCB6A, scuro: 0x6E9E45, chiaro: 0xC4E39A },
  fragola: { colore: 0xF29BB5, scuro: 0xD9638A, chiaro: 0xFBC9D8 },
  cioccolato: { colore: 0x6B3E26, scuro: 0x4A2716, chiaro: 0x9A6644 },
};
// Fasi lungo la sezione (frazione percorsa).
const FASI = [
  { da: 0.0, gusto: null },
  { da: 0.08, gusto: 'pistacchio' },
  { da: 0.38, gusto: 'fragola' },
  { da: 0.66, gusto: 'cioccolato' },
  { da: 0.93, gusto: null, fine: true },
];

// ---------------------------------------------------------------------------
// Modelli
// ---------------------------------------------------------------------------

const texCialda = tela(128, 128, (g, W, H) => {
  g.fillStyle = '#DDA45A'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#A8702F'; g.lineWidth = 5;
  for (let i = -W; i < W * 2; i += 22) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke();
    g.beginPath(); g.moveTo(i, H); g.lineTo(i + H, 0); g.stroke();
  }
});
texCialda.wrapS = texCialda.wrapT = THREE.RepeatWrapping;
texCialda.repeat.set(3, 2);
const matCialda = new THREE.MeshLambertMaterial({ map: texCialda });

function pallina(raggio, colore, scuro, colature = 7) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(raggio, raggio > 0.8 ? 2 : 1), L(colore));
  m.scale.y = 0.88;
  g.add(m);
  // Bordo irregolare e colature sotto la pallina.
  for (let i = 0; i < colature; i++) {
    const a = (i / colature) * Math.PI * 2 + 0.3;
    const c = new THREE.Mesh(new THREE.ConeGeometry(raggio * 0.22, raggio * (0.5 + (i % 3) * 0.2), 6), L(i % 2 ? colore : scuro));
    c.rotation.x = Math.PI;
    c.position.set(Math.cos(a) * raggio * 0.82, -raggio * 0.55, Math.sin(a) * raggio * 0.82);
    g.add(c);
  }
  return g;
}

function cono(alto, raggio) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(raggio, alto, 14, 1, true), matCialda);
  m.rotation.x = Math.PI;                          // punta in basso
  return m;
}

// Il Gelato Gigante: cono di cialda con il bordo, tre palline (pistacchio, fragola, cioccolato) con la
// faccia sulla pallina grande, codette e cialda arrotolata in cima, braccia di cialda con i guanti.
function creaGelato() {
  const g = new THREE.Group();
  const corpo = new THREE.Group();
  g.add(corpo);
  const c = cono(3.0, 1.35);
  c.position.y = 1.5;
  corpo.add(c);
  const bordo = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.17, 8, 22), L(0xC98C45));
  bordo.rotation.x = Math.PI / 2; bordo.position.y = 3.0;
  corpo.add(bordo);
  // Le tre palline, impilate.
  const palline = {};
  const pila = [['pistacchio', 1.5, 3.6], ['fragola', 1.28, 5.05], ['cioccolato', 1.08, 6.25]];
  for (const [gusto, r, y] of pila) {
    const p = pallina(r, GUSTI[gusto].colore, GUSTI[gusto].scuro, 10);
    p.position.y = y;
    corpo.add(p);
    palline[gusto] = p;
  }
  // Faccia sulla pallina di pistacchio (davanti è -z): occhi grandi e cattivi, sopracciglia, bocca aperta.
  const faccia = new THREE.Group();
  faccia.position.set(0, 3.7, -1.22);
  const occhi = [];
  for (const s of [-1, 1]) {
    const occhio = new THREE.Group();
    occhio.position.set(s * 0.46, 0.22, 0);
    const bianco = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), BAS(0xFFFFFF));
    bianco.scale.z = 0.55; occhio.add(bianco);
    const pupilla = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), BAS(0x1C1D2B));
    pupilla.position.set(-s * 0.04, -0.03, -0.17); occhio.add(pupilla);
    const luce = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), BAS(0xFFFFFF));
    luce.position.set(-s * 0.08, 0.04, -0.3); occhio.add(luce);
    faccia.add(occhio); occhi.push(occhio);
    const ciglio = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.13, 0.12), BAS(0x2E4A1A));
    ciglio.position.set(s * 0.44, 0.62, -0.12); ciglio.rotation.z = s * 0.42; faccia.add(ciglio);
    const guancia = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: 0xE77FA0, transparent: true, opacity: 0.6 }));
    guancia.position.set(s * 0.82, -0.18, -0.02); guancia.rotation.y = Math.PI + s * 0.5; faccia.add(guancia);
  }
  const bocca = new THREE.Group();
  bocca.position.set(0, -0.36, -0.02);
  const cavo = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), BAS(0x4A1410));
  cavo.scale.set(1.15, 0.6, 0.35); bocca.add(cavo);
  const lingua = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), BAS(0xE0607E));
  lingua.scale.set(1.3, 0.55, 0.5); lingua.position.set(0, -0.12, -0.08); bocca.add(lingua);
  for (let i = 0; i < 5; i++) {
    const dente = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 4), BAS(0xFFFFFF));
    dente.rotation.x = Math.PI; dente.position.set(-0.28 + i * 0.14, 0.17, -0.12); bocca.add(dente);
  }
  faccia.add(bocca);
  corpo.add(faccia);
  // Codette colorate sul cioccolato.
  const colori = [0xFF5A5F, 0xFFD23F, 0x3EC1D3, 0xFFFFFF, 0x9B5DE5, 0x7BD389];
  for (let i = 0; i < 26; i++) {
    const t = i * 2.399, h = 0.25 + (i % 7) / 7 * 0.7;
    const rr = Math.sqrt(1 - h * h) * 1.06;
    const cod = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.14, 2, 4), BAS(colori[i % colori.length]));
    cod.position.set(Math.cos(t) * rr, 6.25 + h * 1.06 * 0.88, Math.sin(t) * rr);
    cod.rotation.set(t, t * 1.7, t * 0.6);
    corpo.add(cod);
  }
  // Cialda arrotolata piantata in cima e ciliegina.
  const cialdina = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.4, 10), L(0xE2B36B));
  cialdina.position.set(0.45, 7.2, 0.2); cialdina.rotation.z = -0.5; corpo.add(cialdina);
  const ciliegia = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), L(0xD42A1F));
  ciliegia.position.set(-0.15, 7.35, 0); corpo.add(ciliegia);
  const gambo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), L(0x4F7F3A));
  gambo.position.set(-0.03, 7.75, 0); gambo.rotation.z = -0.4; corpo.add(gambo);
  // Braccia di cialda con i guanti bianchi.
  const braccia = [];
  for (const s of [-1, 1]) {
    const spalla = new THREE.Group();
    spalla.position.set(s * 1.3, 2.75, 0);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 1.5, 8), matCialda);
    b.position.y = -0.75; spalla.add(b);
    const mano = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), L(0xFFFFFF));
    mano.scale.set(1, 0.85, 0.8); mano.position.y = -1.6; spalla.add(mano);
    const polsino = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 6, 12), L(0xFFFFFF));
    polsino.rotation.x = Math.PI / 2; polsino.position.y = -1.32; spalla.add(polsino);
    spalla.rotation.z = s * 0.9;
    corpo.add(spalla);
    braccia.push(spalla);
  }
  // Ombra a terra.
  const ombra = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2;
  g.add(ombra);
  g.userData = { corpo, palline, braccia, faccia, ombra, occhi, bocca };
  return g;
}

function conoCadente() {
  const g = new THREE.Group();
  const c = cono(1.1, 0.42);
  c.position.y = 0.55;
  const p = pallina(0.5, GUSTI.pistacchio.colore, GUSTI.pistacchio.scuro, 6);
  p.position.y = 1.25;
  const tutto = new THREE.Group();
  tutto.add(c, p);
  tutto.rotation.x = Math.PI;                      // cade a testa in giù: prima la pallina
  tutto.position.y = 1.7;
  g.add(tutto);
  return g;
}

function bersaglio(colore) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 24), new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

function macchia(colore) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14), L(colore));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(1, 0.7, 1);
  return m;
}

// Onde di cioccolato fuso. Quella bassa è un'onda che si arriccia verso Roberto e scorre sull'asfalto
// (si salta); quella alta è un getto denso sospeso all'altezza della testa, con le colature (ci si abbassa).
const CIOCC_LUCIDO = new THREE.MeshPhongMaterial({ color: 0x6B3E26, specular: 0x8A6048, shininess: 60, side: THREE.DoubleSide });
const CIOCC_SCIA = new THREE.MeshPhongMaterial({ color: 0x4A2716, specular: 0x5A4030, shininess: 50, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
function ondaCioccolato(alta, larghezza, f) {
  const g = new THREE.Group();
  const ciocc = CIOCC_LUCIDO, scuro = new THREE.MeshPhongMaterial({ color: GUSTI.cioccolato.scuro, specular: 0x6A4A38, shininess: 50 }), lucido = BAS(GUSTI.cioccolato.chiaro);
  const parti = [];
  if (alta) {
    const punti = [];
    for (let i = 0; i <= 8; i++) {
      const x = -larghezza / 2 + (i / 8) * larghezza;
      punti.push(new THREE.Vector3(x, 0.45 + Math.sin(i * 1.7) * 0.07, Math.sin(i * 2.3) * 0.12));
    }
    const curva = new THREE.CatmullRomCurve3(punti);
    const getto = new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.42, 9), ciocc);
    g.add(getto);
    const riflesso = new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.1, 5), lucido);
    riflesso.position.set(0, 0.26, 0.18); g.add(riflesso);
    for (let x = -larghezza / 2 + 0.35; x < larghezza / 2 - 0.2; x += 0.62) {
      const lung = Math.min(0.16 + Math.abs(Math.sin(x * 3.1)) * 0.12, (f.altoDa - f.altezzaBassa) * 0.55);
      const goccia = new THREE.Group();
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, lung, 7), scuro);
      c.rotation.x = Math.PI; c.position.y = -lung / 2; goccia.add(c);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5), scuro);
      p.position.y = -lung; goccia.add(p);
      goccia.position.set(x, 0.12, 0);
      g.add(goccia); parti.push(goccia);
    }
  } else {
    // Profilo dell'onda (u verso Roberto, v in alto): sale piano da dietro, si arriccia in avanti e ricade.
    const f = new THREE.Path();
    f.moveTo(-1.2, 0);
    f.quadraticCurveTo(-0.5, 0.12, -0.05, 0.55);
    f.quadraticCurveTo(0.2, 0.84, 0.48, 0.72);
    f.quadraticCurveTo(0.66, 0.6, 0.52, 0.47);
    f.quadraticCurveTo(0.32, 0.4, 0.34, 0.26);
    f.quadraticCurveTo(0.4, 0.06, 0.75, 0);
    const profilo = f.getPoints(8);
    // Superficie liscia lungo la strada: la cresta ondeggia e si abbassa a zero ai due capi.
    const nx = 28, np = profilo.length, pos = [], idx = [];
    for (let i = 0; i <= nx; i++) {
      const x = -larghezza / 2 + (i / nx) * larghezza;
      const bordo = THREE.MathUtils.smoothstep(larghezza / 2 - Math.abs(x), 0, 0.5);
      const h = bordo * (0.92 + 0.16 * Math.sin(x * 2.3 + 0.5));
      const avanti = Math.sin(x * 1.7) * 0.1;
      for (const q of profilo) pos.push(x, q.y * h, (q.x - 0.15) * (0.55 + 0.45 * bordo) + avanti);
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < np - 1; j++) {
      const a0 = i * np + j, b0 = (i + 1) * np + j;
      idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const onda = new THREE.Mesh(geo, CIOCC_LUCIDO);
    onda.scale.y = Math.min(1, f.bassoMax / 0.85);          // più bassa per il Roberto bambino
    g.add(onda);
    // La scia di cioccolato fuso sull'asfalto, dietro l'onda fino al gelato.
    const scia = new THREE.Mesh(new THREE.PlaneGeometry(larghezza - 0.6, 7), CIOCC_SCIA);
    scia.rotation.x = -Math.PI / 2; scia.position.set(0, 0.07, -4.6); g.add(scia);
  }
  g.userData.parti = parti;
  return g;
}

// Schizzo di gelato quando Roberto viene colpito: palline del gusto che volano via e ricadono.
const GEO_SCHIZZO = new THREE.IcosahedronGeometry(0.11, 0);

// ---------------------------------------------------------------------------
// Logica del combattimento
// ---------------------------------------------------------------------------

// ctx: { sez, daLocale(d, lx, ly, lz, out), psi(d), corsie, fisica(), velocita(pos), immune(), colpito() }
export function creaBossGelato(scena, ctx) {
  const gelato = creaGelato();
  gelato.visible = false;
  gelato.scale.setScalar(1.35);
  scena.add(gelato);
  const { sez, corsie } = ctx;
  const lung = sez.fine - sez.inizio;
  const tmpV = new THREE.Vector3();
  const r = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

  const B = {
    grasso: 0, grassoVis: 0, senzaColpi: 0, colpi: 0, invul: 0,
    fase: -1, attesa: 1.0, proiettili: [], sciolto: 0, finito: false, lancio: 0, scossa: 0, schizzi: [],
  };

  function schizza(G, gusto) {
    const gu = GUSTI[gusto];
    ctx.daLocale(G.pos, G.x, G.y + 1.1, 0, tmpV);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(GEO_SCHIZZO, L(i % 3 ? gu.colore : i % 2 ? gu.chiaro : gu.scuro));
      m.position.copy(tmpV);
      const a = r() * Math.PI * 2, su = 2 + r() * 3.5, fuori = 1.5 + r() * 2.5;
      m.scale.setScalar(0.7 + r() * 0.9);
      scena.add(m);
      B.schizzi.push({ m, vx: Math.cos(a) * fuori, vy: su, vz: Math.sin(a) * fuori, t: 0 });
    }
  }

  function pulisci() {
    for (const p of B.proiettili) for (const m of p.mesh) scena.remove(m);
    B.proiettili = [];
    for (const s of B.schizzi) scena.remove(s.m);
    B.schizzi = [];
  }
  B.reset = () => {
    pulisci();
    Object.assign(B, { grasso: 0, grassoVis: 0, senzaColpi: 0, colpi: 0, invul: 0, fase: -1, attesa: 1.0, sciolto: 0, finito: false });
    gelato.visible = false;
  };

  // Mette un oggetto nel mondo: d lungo il percorso, x di lato, y in quota; gira con la strada.
  function piazza(obj, d, x, y, versoGiocatore = false) {
    ctx.daLocale(d, x, y, 0, obj.position);
    obj.rotation.y = -ctx.psi(d) + (versoGiocatore ? Math.PI : 0);
  }

  function aggiungi(p) {
    for (const m of p.mesh) scena.add(m);
    B.proiettili.push(p);
  }

  // Corsie da colpire: una o due, mai tutte e tre (tranne l'onda alta, che si passa abbassandosi).
  function corsieACaso(n) {
    const tutte = [0, 1, 2].sort(() => r() - 0.5);
    return tutte.slice(0, n);
  }

  function lanciaPistacchio(G, v) {
    const T = 1.35;
    const n = r() < 0.45 ? 2 : 1;
    // Una delle corsie è sempre quella in cui sei: così bisogna spostarsi.
    const qui = corsie.reduce((a, x, i) => (Math.abs(x - G.x) < Math.abs(corsie[a] - G.x) ? i : a), 0);
    const scelte = [qui, ...corsieACaso(3).filter(c => c !== qui)].slice(0, n);
    for (const c of scelte) {
      const d = G.pos + v * T + (r() - 0.5) * 1.5;
      aggiungi({ tipo: 'cono', d, x: corsie[c], t: 0, T, y: 14, mesh: [conoCadente(), bersaglio(GUSTI.pistacchio.colore)] });
    }
  }
  function lanciaFragola(G) {
    const n = r() < 0.4 ? 2 : 1;
    const qui = corsie.reduce((a, x, i) => (Math.abs(x - G.x) < Math.abs(corsie[a] - G.x) ? i : a), 0);
    const scelte = [qui, ...corsieACaso(3).filter(c => c !== qui)].slice(0, n);
    for (const c of scelte) {
      const raggio = ctx.fisica().bassoMax * 0.48;
      const m = pallina(raggio, GUSTI.fragola.colore, GUSTI.fragola.scuro, 5);
      aggiungi({ tipo: 'palla', d: B.dBoss - 1.5, x: corsie[c], vd: -9, raggio, giro: 0, salto: 0.6, mesh: [m] });
    }
    B.lancio = 0.5;
  }
  function lanciaCioccolato(G) {
    const alta = r() < 0.5;
    const f = ctx.fisica();
    if (alta) {
      // Tutta la strada: ci si deve abbassare.
      aggiungi({ tipo: 'onda', alta, d: B.dBoss - 1.5, x: 0, larg: 7.2, vd: -8, da: f.altoDa, a: f.altoDa + 0.9, mesh: [ondaCioccolato(true, 7.2, f)] });
    } else {
      // Due corsie su tre, bassa: si salta o si va nella corsia libera.
      const libera = Math.floor(r() * 3);
      const prese = [0, 1, 2].filter(c => c !== libera);
      const x = (corsie[prese[0]] + corsie[prese[1]]) / 2;
      aggiungi({ tipo: 'onda', alta, d: B.dBoss - 1.5, x, larg: 4.6, vd: -8, da: 0, a: f.bassoMax * 0.95, mesh: [ondaCioccolato(false, 4.6, f)] });
    }
    B.lancio = 0.5;
  }

  function colpisci(G, gusto) {
    if (B.invul > 0) return;
    schizza(G, gusto);
    B.invul = INVULNERABILE;
    B.colpi++;
    B.grasso = Math.min(MAX_GRASSO, B.grasso + 1);
    B.senzaColpi = 0;
    B.scossa = 1;
    B.ride = 0.8;
    ctx.colpito(B);
  }

  // Vero se il corpo di Roberto (quota basso..alto) tocca il volume [da, a] in corsia x a distanza d.
  function tocca(G, d, x, mezzaLarg, da, a, prof = 0.6) {
    if (ctx.immune()) return false;
    if (Math.abs(d - G.pos) > prof) return false;
    if (Math.abs(x - G.x) > mezzaLarg) return false;
    const f = ctx.fisica();
    const basso = G.y, alto = G.y + (G.scivola > 0 ? f.altezzaBassa : f.altezza);
    return alto > da && basso < a;
  }

  B.dentro = pos => pos >= sez.inizio && pos < sez.fine;
  B.gusto = () => (B.finito ? null : FASI[Math.max(0, B.fase)]?.gusto ?? null);
  // Fattore di velocità dovuto al grasso (1 = normale).
  B.fattore = () => 1 / (1 + RALLENTA * B.grassoVis);

  B.aggiorna = (dt, G, inGioco) => {
    const pos = G.pos;
    // Fuori dalla zona del boss (e dal tratto dopo, in cui Roberto finisce di dimagrire) si azzera tutto.
    if (pos < sez.inizio - 60 || pos > sez.fine + 400) {
      if (B.fase !== -1 || B.grasso) B.reset();
      return;
    }
    // Dopo un azzeramento (Roberto cresce subito dopo la piazza) il combattimento non riparte.
    if (pos >= sez.fine && B.fase === -1) return;
    const k = (pos - sez.inizio) / lung;

    // Grasso: sale subito a ogni colpo (con un piccolo sobbalzo), scende piano.
    B.invul = Math.max(0, B.invul - dt);
    B.scossa = Math.max(0, B.scossa - dt * 2.5);
    if (inGioco) {
      B.senzaColpi += dt;
      const ogni = B.finito ? 1.0 : DIMAGRISCE_DOPO;
      if (B.grasso > 0 && B.senzaColpi >= ogni) { B.grasso--; B.senzaColpi = 0; }
    }
    const vel = B.grassoVis < B.grasso ? 6 : 0.9;
    B.grassoVis += Math.sign(B.grasso - B.grassoVis) * Math.min(Math.abs(B.grasso - B.grassoVis), dt * vel);

    // Il gelato: compare poco prima della piazza, fluttua davanti a Roberto e lo guarda.
    gelato.visible = k > -0.12 && B.sciolto < 1;
    B.dBoss = Math.max(sez.inizio + 6, pos + 19);
    if (k >= 1) B.dBoss = sez.fine + 4;
    if (gelato.visible) {
      const t = performance.now() / 1000;
      const entra = THREE.MathUtils.smoothstep(k, -0.1, 0.03);
      const quota = THREE.MathUtils.lerp(-9, 1.0 + Math.sin(t * 2.2) * 0.35, entra) * (1 - B.sciolto);
      piazza(gelato, B.dBoss, Math.sin(t * 0.9) * 1.2, 0, true);
      const u = gelato.userData;
      u.corpo.position.y = quota;
      u.corpo.rotation.z = Math.sin(t * 1.7) * 0.06;
      u.ombra.position.y = 0.05;
      u.ombra.scale.setScalar(Math.max(0.2, 1 - Math.max(0, quota) * 0.08));
      // La pallina del gusto di turno pulsa; le braccia lanciano.
      const gusto = FASI[Math.max(0, B.fase)]?.gusto;
      for (const [nome, p] of Object.entries(u.palline)) {
        const attiva = nome === gusto;
        p.scale.setScalar(attiva ? 1 + 0.08 * Math.sin(t * 9) : 1);
      }
      B.lancio = Math.max(0, B.lancio - dt * 1.5);
      B.ride = Math.max(0, (B.ride ?? 0) - dt);
      u.bocca.scale.set(1, 0.6 + 1.1 * Math.sin(B.lancio * Math.PI) + (B.ride > 0 ? 0.5 + 0.4 * Math.sin(t * 30) : 0), 1);
      const batte = (t % 3.2) < 0.12 ? 0.1 : 1;
      for (const o of u.occhi) o.scale.y = batte;
      u.faccia.rotation.x = B.ride > 0 ? -0.15 : 0;
      for (const [i, sp] of u.braccia.entries()) {
        const s = i ? 1 : -1;
        sp.rotation.z = s * (0.9 + Math.sin(t * 3 + i) * 0.15) + (i ? 1.6 * Math.sin(B.lancio * Math.PI) : 0);
        sp.rotation.x = i ? -1.2 * Math.sin(B.lancio * Math.PI) : 0;
      }
      // Alla fine si scioglie: si schiaccia e affonda.
      u.corpo.scale.set(1 + B.sciolto * 0.6, 1 - B.sciolto * 0.85, 1 + B.sciolto * 0.6);
    }

    // Fasi.
    let fase = 0;
    for (let i = 0; i < FASI.length; i++) if (k >= FASI[i].da) fase = i;
    if (fase !== B.fase && inGioco) {
      B.fase = fase;
      const F = FASI[fase];
      if (F.fine) B.finito = true;
      B.attesa = 1.2;
    }
    if (B.finito) B.sciolto = Math.min(1, B.sciolto + dt * 0.7);

    // Nuovi attacchi.
    const gusto = FASI[Math.max(0, B.fase)]?.gusto;
    if (inGioco && gusto && !B.finito) {
      B.attesa -= dt;
      if (B.attesa <= 0) {
        const v = ctx.velocita(pos) * B.fattore();
        if (gusto === 'pistacchio') { lanciaPistacchio(G, v); B.attesa = 1.05 + r() * 0.35; }
        if (gusto === 'fragola') { lanciaFragola(G); B.attesa = 1.0 + r() * 0.4; }
        if (gusto === 'cioccolato') { lanciaCioccolato(G); B.attesa = 1.35 + r() * 0.35; }
      }
    }

    // Proiettili.
    for (let i = B.proiettili.length - 1; i >= 0; i--) {
      const p = B.proiettili[i];
      let via = p.d < pos - 12;
      if (p.tipo === 'cono') {
        const [m, segno] = p.mesh;
        if (inGioco) p.t += dt;
        const caduta = Math.min(1, p.t / p.T);
        p.y = 14 * (1 - caduta * caduta);
        piazza(m, p.d, p.x, p.y);
        piazza(segno, p.d, p.x, 0.06);
        segno.rotation.x = -Math.PI / 2;
        segno.scale.setScalar(0.6 + 0.6 * caduta);
        segno.material.opacity = 0.35 + 0.5 * caduta;
        if (caduta >= 1 && !p.atterrato) {
          // Si pianta nell'asfalto: resta il cono capovolto con la macchia di pistacchio intorno.
          p.atterrato = true;
          scena.remove(segno);
          const mac = macchia(GUSTI.pistacchio.colore);
          p.mesh.push(mac); scena.add(mac);
          piazza(mac, p.d, p.x, 0.05); mac.rotation.x = -Math.PI / 2;
          m.children[0].rotation.x = Math.PI + 0.25;
          m.children[0].position.y = 1.1;
        }
        // In volo colpisce dall'alto; piantato è un ostacolo basso (si salta).
        if (!p.atterrato && p.y < 2.2 && tocca(G, p.d, p.x, 0.95, p.y, p.y + 1.7)) colpisci(G, 'pistacchio');
        if (p.atterrato && tocca(G, p.d, p.x, 0.9, 0, ctx.fisica().bassoMax * 0.9, 0.45)) colpisci(G, 'pistacchio');
      } else if (p.tipo === 'palla') {
        const [m] = p.mesh;
        if (inGioco) {
          p.d += p.vd * dt;
          p.giro += -p.vd * dt / p.raggio;
          p.salto = Math.max(0, p.salto - dt);
        }
        const rimbalzo = Math.abs(Math.sin(p.salto * 6)) * p.salto * 2.5;
        piazza(m, p.d, p.x, p.raggio * 0.9 + rimbalzo);
        m.rotation.x = p.giro;
        if (tocca(G, p.d, p.x, 0.95, rimbalzo, rimbalzo + p.raggio * 1.8, 0.55)) colpisci(G, 'fragola');
      } else if (p.tipo === 'onda') {
        const [m] = p.mesh;
        if (inGioco) p.d += p.vd * dt;
        piazza(m, p.d, p.x, p.da);
        const t = performance.now() / 1000;
        m.scale.y = 1 + Math.sin(t * 8 + p.d) * 0.05;
        for (const [j, q] of m.userData.parti.entries()) q.position.y = (q.userData.y0 ??= q.position.y) + 0.06 * Math.sin(t * 9 + j * 1.3);
        if (tocca(G, p.d, p.x, p.larg / 2 + 0.2, p.da, p.a, 0.5)) colpisci(G, 'cioccolato');
      }
      if (via) { for (const mm of p.mesh) scena.remove(mm); B.proiettili.splice(i, 1); }
    }
    for (let i = B.schizzi.length - 1; i >= 0; i--) {
      const s = B.schizzi[i];
      s.t += dt;
      s.vy -= 14 * dt;
      s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt;
      s.m.scale.multiplyScalar(1 - dt * 1.2);
      if (s.t > 0.7) { scena.remove(s.m); B.schizzi.splice(i, 1); }
    }
    if (B.finito && B.proiettili.length) { for (const p of B.proiettili) for (const m of p.mesh) scena.remove(m); B.proiettili = []; }
  };

  return B;
}
