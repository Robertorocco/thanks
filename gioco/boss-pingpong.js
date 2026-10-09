// Boss di fine liceo: la sfida a ping pong con il cugino ("Pallettaro VS Frat Chiu' mportant").
// Roberto arriva al tavolo e il gioco cambia: non si corre più, si sposta la racchetta (e il braccio
// che la segue) sulle tre corsie del tavolo. Il cugino tira sempre la stessa sequenza di colpi: se la
// palla passa, fa punto ("Ahaha coglione") e ricomincia dalla sua battuta, così a forza di tentativi
// la sequenza si impara. Al 5° colpo Roberto gli dà del "Cherato", al 7° lui risponde "Pallettaro";
// il 9° è una schiacciata preceduta dall'Hollow Purple di Gojo. Se Roberto la prende, chiude il punto
// di rovescio (il 10° colpo) e la partita finisce.

import * as THREE from './lib/three.module.min.js';
import { blocco, cilindro, tela, creaPersona, posaCorsa, azzeraPosa } from './modelli.js';
import { fumetto } from './aula.js';

// Il tavolo: il bordo dalla parte di Roberto è a z = 0, quello del cugino a z = -LUNGO.
// Il tavolo è molto più largo di uno vero: le tre corsie occupano tutta la larghezza dello schermo.
const LUNGO = 3.8, LARGO = 3.4, ALTO = 0.76, RAGGIO = 0.06;
const PIANO = ALTO + RAGGIO;
const ROBERTO_Z = 0.62;                     // dove sta Roberto, dietro al bordo
const CUGINO_Z = -LUNGO - 0.62;
const CORSIA = 1.1;                         // distanza tra le corsie del tavolo (anche lo spostamento di Roberto)
const SPOSTA_CUGINO = 2.5;                  // `da` dei colpi → posizione laterale del cugino

// La sequenza dei colpi del cugino, sempre uguale. `a`: corsia d'arrivo (0 sinistra, 1 centro, 2 destra
// per chi guarda da dietro Roberto); `T`: secondi di volo; `finta`: la palla punta prima su un'altra
// corsia e poi cambia direzione; `da`: dove si sposta il cugino per tirarlo.
const COLPI = [
  { a: 1, T: 1.3, da: 0 },                  // la battuta
  { a: 0, T: 1.05, da: 0.3 },
  { a: 2, T: 0.95, da: -0.3 },
  { a: 2, T: 0.85, da: 0.4 },
  { a: 0, T: 0.8, da: -0.4 },               // ripreso questo, Roberto gli dà del "Cherato"
  { a: 2, T: 1.0, da: 0, finta: 0 },
  { a: 1, T: 0.72, da: 0.3, frase: 'Pallettaro!' },
  { a: 0, T: 0.95, da: -0.2, finta: 2 },
  // L'Hollow Purple: arriva dritta al centro a velocità normale e poi si spinge contro la racchetta (vedi 'duello').
  { a: 1, T: 1.1, da: 0, hollow: true },
];
export const N_COLPI = COLPI.length + 1;    // con il rovescio finale di Roberto
const DURATA_HOLLOW = 2.6;
// Il duello finale: bisogna toccare lo schermo (o un tasto) TAP_RICHIESTI volte entro TAP_TEMPO secondi.
const TAP_RICHIESTI = 10, TAP_TEMPO = 3;

const BASE = c => new THREE.MeshBasicMaterial({ color: c });

// Alone luminoso (per le sfere dell'Hollow Purple e la scia della palla).
const texAlone = tela(128, 128, (g, W) => {
  const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  r.addColorStop(0.6, 'rgba(255,255,255,0.18)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, W, W);
});
function alone(colore, scala, somma = true) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAlone, color: colore, transparent: true, depthWrite: false, blending: somma ? THREE.AdditiveBlending : THREE.NormalBlending }));
  s.scale.setScalar(scala);
  s.visible = false;
  return s;
}

function creaTavolo() {
  const g = new THREE.Group();
  g.add(blocco(LARGO, 0.04, LUNGO, 0x1F5FA8, 0, ALTO - 0.04, -LUNGO / 2));
  // Bordi bianchi e linea centrale.
  const bianco = BASE(0xF4F4F0);
  for (const s of [-1, 1]) g.add(blocco(0.03, 0.005, LUNGO, bianco, s * (LARGO / 2 - 0.015), ALTO, -LUNGO / 2));
  for (const z of [-0.015, -LUNGO + 0.015]) g.add(blocco(LARGO, 0.005, 0.03, bianco, 0, ALTO, z));
  g.add(blocco(0.015, 0.005, LUNGO, bianco, 0, ALTO, -LUNGO / 2));
  // La rete.
  g.add(blocco(LARGO + 0.16, 0.15, 0.015, new THREE.MeshLambertMaterial({ color: 0x1C1D22, transparent: true, opacity: 0.75 }), 0, ALTO, -LUNGO / 2));
  g.add(blocco(LARGO + 0.16, 0.025, 0.02, bianco, 0, ALTO + 0.14, -LUNGO / 2));
  for (const s of [-1, 1]) g.add(blocco(0.03, 0.18, 0.04, 0x2B2B30, s * (LARGO / 2 + 0.08), ALTO - 0.02, -LUNGO / 2));
  // Gambe e telaio.
  for (const x of [-LARGO / 2 + 0.15, LARGO / 2 - 0.15]) for (const z of [-0.3, -LUNGO + 0.3]) g.add(blocco(0.06, ALTO - 0.04, 0.06, 0x3A3D44, x, 0, z));
  g.add(blocco(LARGO - 0.3, 0.05, 0.05, 0x3A3D44, 0, 0.25, -LUNGO / 2));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function creaRacchetta(gomma) {
  const g = new THREE.Group();
  g.add(blocco(0.05, 0.13, 0.03, 0xB07A45, 0, -0.13, 0));                 // manico
  const pala = cilindro(0.12, 0.022, gomma, 0, 0, 0);
  pala.rotation.x = Math.PI / 2;
  pala.position.set(0, -0.27, 0);
  g.add(pala);
  const legno = cilindro(0.125, 0.012, 0xC89A63, 0, 0, 0);
  legno.rotation.x = Math.PI / 2;
  legno.position.set(0, -0.27, 0.014);
  g.add(legno);
  g.userData.pala = pala;
  return g;
}

// Il cugino: secco, più basso di Roberto, capelli lisci corti con il ciuffo sulla fronte.
function creaCugino() {
  const p = creaPersona({ maglia: 0xF2C14E, pantaloni: 0x1C1D22, scarpe: 0xF4F4F0, capelli: 0x1B140F, acconciatura: 'ciuffo' });
  p.radice.scale.set(0.66, 0.73, 0.68);
  p.radice.rotation.y = Math.PI;             // guarda verso Roberto (+z)
  return p;
}

// `d`: dove sta il bordo del tavolo dalla parte di Roberto; `metti(oggetto, d)` lo mette sul percorso.
// `ui`: { banner(html, secondi), nascondi() } per il suggerimento "TOCCA!" durante il duello.
export function creaPingPong(scena, d, metti, ui = {}) {
  const radice = new THREE.Group();
  scena.add(radice);
  metti(radice, d);
  radice.add(creaTavolo());

  const cugino = creaCugino();
  radice.add(cugino.radice);
  const racchettaC = creaRacchetta(0x1C1D22);
  racchettaC.position.y = -0.42;
  cugino.braccia[1].gomito.add(racchettaC);

  const racchettaR = creaRacchetta(0xC0392B);
  racchettaR.position.y = -0.42;
  racchettaR.visible = false;

  const palla = new THREE.Mesh(new THREE.SphereGeometry(RAGGIO, 12, 8), new THREE.MeshLambertMaterial({ color: 0xFF8C1A, emissive: 0x552200 }));
  palla.castShadow = true;
  radice.add(palla);
  const ombra = new THREE.Mesh(new THREE.CircleGeometry(RAGGIO * 1.1, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2;
  radice.add(ombra);
  const scia = Array.from({ length: 7 }, (_, i) => { const s = alone(0xFFB060, 0.16 - i * 0.012); radice.add(s); return s; });
  const storia = [];

  // L'Hollow Purple: una sfera blu e una rossa che si avvicinano girando e si fondono in una viola.
  // Colori pieni (non additivi): sul cielo chiaro le sfere restano blu, rosse e viola.
  const blu = alone(0x2A5BFF, 0.9, false), rosso = alone(0xFF1A1A, 0.9, false), viola = alone(0x7A1FE0, 1.2, false), lampo = alone(0xB46CFF, 3, false);
  const nucleoBlu = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), BASE(0x6F9BFF));
  const nucleoRosso = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), BASE(0xFF6060));
  const nucleoViola = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), BASE(0xB070FF));
  blu.add(nucleoBlu); rosso.add(nucleoRosso); viola.add(nucleoViola);
  nucleoBlu.scale.setScalar(1 / 0.6); nucleoRosso.scale.setScalar(1 / 0.6); nucleoViola.scale.setScalar(1 / 1.2);
  const anello = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xC080FF, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  anello.visible = false;
  radice.add(blu, rosso, viola, lampo, anello);

  const bollaCugino = fumetto('Ahaha coglione', '#ffffff', '#1C1D2B', 1.5, 1.7);
  const bollaPallettaro = fumetto('Pallettaro!', '#ffffff', '#1C1D2B', 1.25, 1.3);
  const bollaCherato = fumetto('Cherato!', '#FFE27A', '#1C1D2B', 1.1, 1.1);
  radice.add(bollaCugino, bollaPallettaro, bollaCherato);

  const v = new THREE.Vector3(), v2 = new THREE.Vector3();
  const GIU = new THREE.Vector3(0, -1, 0), ASSE_Y = new THREE.Vector3(0, 1, 0);
  const qSwing = new THREE.Quaternion();
  const camPos = new THREE.Vector3(), camGuarda = new THREE.Vector3();

  const S = {
    attivo: false, fatto: false, fase: 'ferma', t: 0,
    colpo: 0, ripresi: 0, taps: 0, orbZ: 0.3,
    p: 0, pBersaglio: 0,                    // racchetta di Roberto: -1 sinistra, 0 centro, 1 destra
    swingR: 0, tipoSwingR: 1, swingC: 0,
    cuginoX: 0, cuginoBersaglio: 0,
    volo: null, inquadra: 0, scossa: 0, bolle: [],
    punti: [new THREE.Vector3(-CORSIA, PIANO + 0.18, 0.05), new THREE.Vector3(0, PIANO + 0.18, 0.05), new THREE.Vector3(CORSIA, PIANO + 0.18, 0.05)],
  };

  function posizionaCugino(dt, t) {
    S.cuginoX = THREE.MathUtils.damp(S.cuginoX, S.cuginoBersaglio, 6, dt);
    cugino.radice.position.set(S.cuginoX + 0.24, 0, CUGINO_Z);
  }

  // Posa del cugino: piegato pronto, racchetta avanti; `alza` (0..1) per l'Hollow Purple.
  function posaCugino(t, alza = 0) {
    azzeraPosa(cugino);
    // (per gli arti, una rotazione x positiva li porta in avanti, verso -z)
    for (const [i, { anca, ginocchio }] of cugino.gambe.entries()) { anca.rotation.set(0.3, 0, (i ? 1 : -1) * 0.1); ginocchio.rotation.set(-0.55, 0, 0); }
    cugino.corpo.position.y = -0.07 + Math.sin(t * 7) * 0.012;
    const [sx, dx] = cugino.braccia;
    sx.spalla.rotation.set(0.6 + alza * 2.1, 0, -0.3 - alza * 0.5);
    sx.gomito.rotation.set(0.8 * (1 - alza), 0, 0);
    v.set(-0.25 - 0.43, -0.45, -0.6).normalize();
    dx.spalla.quaternion.setFromUnitVectors(GIU, v);
    if (alza > 0) dx.spalla.rotation.set(0.6 + alza * 2.1, 0, 0.3 + alza * 0.5);
    if (S.swingC > 0) {
      const k = Math.sin((1 - S.swingC / 0.28) * Math.PI);
      dx.spalla.quaternion.premultiply(qSwing.setFromAxisAngle(ASSE_Y, 0.9 * k));
    }
    dx.gomito.rotation.set(0.3, 0, 0);
  }

  // Posa di Roberto al tavolo: gambe piegate, il braccio destro porta la racchetta sulla corsia `p`.
  function posaRoberto(R, p) {
    azzeraPosa(R);
    for (const [i, { anca, ginocchio }] of R.gambe.entries()) { anca.rotation.set(0.35, 0, (i ? 1 : -1) * 0.12); ginocchio.rotation.set(-0.62, 0, 0); }
    R.corpo.position.y = -0.08;
    const [sx, dx] = R.braccia;
    sx.spalla.rotation.set(0.55, 0, -0.35);
    sx.gomito.rotation.set(0.9, 0, 0);
    // Dritto a destra e al centro, rovescio a sinistra (la racchetta passa davanti al corpo).
    v.set(p * 0.36 + 0.06 - 0.43, -0.42, -0.62).normalize();
    dx.spalla.quaternion.setFromUnitVectors(GIU, v);
    if (S.swingR > 0) {
      const k = Math.sin((1 - S.swingR / 0.3) * Math.PI);
      dx.spalla.quaternion.premultiply(qSwing.setFromAxisAngle(ASSE_Y, S.tipoSwingR * 0.8 * k));
    }
    dx.gomito.rotation.set(0.35, 0, 0);
    racchettaR.rotation.set(0.9, 0, p < -0.3 ? -0.4 : 0.3);
  }

  // Traiettoria: dal punto `da` al punto `a` in T secondi, con un rimbalzo sul tavolo a z = zr.
  function lancia(da, a, T, zr, o = {}) {
    S.volo = { da: da.clone(), a: a.clone(), T, u: 0, ur: (zr - da.z) / (a.z - da.z), h1: o.h1 ?? 0.3, h2: o.h2 ?? 0.22, finta: o.finta, hollow: o.hollow, via: o.via };
    storia.length = 0;
  }
  function puntoVolo(f, u, out) {
    out.z = THREE.MathUtils.lerp(f.da.z, f.a.z, u);
    let x = THREE.MathUtils.lerp(f.da.x, f.a.x, u);
    if (f.via) {
      // Tappe laterali: ogni tratto si muove con una curva dolce da una corsia all'altra.
      const pts = [[0, f.da.x], ...f.via, [1, f.a.x]];
      for (let i = 0; i < pts.length - 1; i++) {
        if (u <= pts[i + 1][0] || i === pts.length - 2) { x = THREE.MathUtils.lerp(pts[i][1], pts[i + 1][1], THREE.MathUtils.smoothstep(u, pts[i][0], pts[i + 1][0])); break; }
      }
    } else if (f.finta !== undefined) {
      const xf = THREE.MathUtils.lerp(f.da.x, f.finta, u);
      x = THREE.MathUtils.lerp(xf, x, THREE.MathUtils.smoothstep(u, 0.42, 0.78));
    }
    out.x = x;
    if (u < f.ur) {
      const s = u / f.ur;
      out.y = THREE.MathUtils.lerp(f.da.y, PIANO, s) + f.h1 * 4 * s * (1 - s);
    } else {
      const s = (u - f.ur) / (1 - f.ur);
      out.y = Math.max(RAGGIO, THREE.MathUtils.lerp(PIANO, f.a.y, s) + f.h2 * 4 * s * (1 - s));
    }
    return out;
  }

  function racchettaCuginoLocale(out) {
    radice.updateMatrixWorld(true);
    racchettaC.userData.pala.getWorldPosition(out);
    return radice.worldToLocal(out);
  }

  function dici(bolla, durata, sopra) {
    bolla.visible = true;
    bolla.userData.t = durata;
    bolla.userData.sopra = sopra;
  }

  function tira() {
    const c = COLPI[S.colpo];
    racchettaCuginoLocale(v2);
    S.swingC = 0.28;
    const arrivo = S.punti[c.a];
    // Colpi normali un po' più veloci (+20%), quelli a giro (con finta) più lenti (-20%); l'Hollow resta a velocità normale.
    const T = c.hollow ? c.T : c.finta !== undefined ? c.T * 1.25 : c.T / 1.2;
    lancia(v2, arrivo, T, -1.1, {
      finta: c.finta !== undefined ? S.punti[c.finta].x : undefined, h1: c.hollow ? 0.0 : 0.3, hollow: c.hollow,
      via: c.via?.map(([u, lane]) => [u, S.punti[lane].x]),
    });
    if (c.hollow) S.volo.da.y = 1.55;
    if (c.frase) dici(bollaPallettaro, 1.3, 'cugino');
    S.fase = 'volo';
  }

  const api = {
    radice, colpi: COLPI,
    posTavolo: d - ROBERTO_Z,                // dove si ferma Roberto
    inizio: d - ROBERTO_Z - 2.6,             // da qui parte la sfida
    get attivo() { return S.attivo; },
    get fatto() { return S.fatto; },
    get fase() { return S.fase; },
    // Quanti colpi mancano (per la barra del pannello).
    get rimasti() { return S.fase === 'duello' ? 1 - Math.min(1, S.taps / TAP_RICHIESTI) : 1 - S.ripresi / N_COLPI; },
    // Un tocco sullo schermo o su un tasto: conta solo nel duello finale.
    tocca() {
      if (!S.attivo || S.fase !== 'duello') return;
      S.taps++;
      S.tipoSwingR = S.taps % 2 ? 1 : -1;
      S.swingR = 0.3; S.scossa = 0.12;
      if (navigator.vibrate) navigator.vibrate(15);
    },
    get inquadra() { return S.inquadra; },
    reset() {
      S.attivo = false; S.fatto = false; S.fase = 'ferma'; S.colpo = 0; S.ripresi = 0; S.inquadra = 0;
      S.cuginoX = 0; S.cuginoBersaglio = 0; S.volo = null; S.taps = 0;
      palla.visible = false; ombra.visible = false;
      for (const b of [bollaCugino, bollaPallettaro, bollaCherato]) b.visible = false;
      for (const s of [blu, rosso, viola, lampo, ...scia]) s.visible = false;
      anello.visible = false;
      posizionaCugino(1, 0); posaCugino(0);
    },
    // Per le prove automatiche: dove va il colpo in volo e dove sta la racchetta.
    _debug() { const c = COLPI[S.colpo]; return S.fase === 'volo' && S.volo ? { u: S.volo.u, a: c.a, finta: c.finta, p: S.p } : { u: 0, a: 1, p: S.p }; },
    _duello() { S.colpo = COLPI.length - 1; S.fase = 'duello'; S.t = 0; S.taps = 0; S.orbZ = 0.3; S.pBersaglio = 0; ui.banner?.(`TOCCA!<small>${TAP_RICHIESTI} volte in ${TAP_TEMPO} secondi</small>`, TAP_TEMPO + 0.3); },
    _hollow() { S.colpo = COLPI.length - 1; S.ripresi = S.colpo; S.fase = 'hollow'; S.t = 0; palla.visible = false; },
    // Sfida già fatta (si riparte da più avanti).
    chiudi() { api.reset(); S.fatto = true; },
    // Roberto arriva al tavolo: si prende la racchetta e si calcola dove sta per ciascuna corsia.
    avvia(R, G) {
      S.posArrivo = G.pos;
      S.attivo = true; S.fase = 'arrivo'; S.t = 0; S.colpo = 0; S.ripresi = 0; S.p = 0; S.pBersaglio = 0;
      R.braccia[1].gomito.add(racchettaR);
      racchettaR.visible = true;
      // La racchetta per ogni corsia, nel sistema del tavolo (Roberto è in ROBERTO_Z, spostato di p · 0,4).
      const pos0 = R.radice.position.clone(), rot0 = R.radice.quaternion.clone();
      R.radice.position.set(0, 0, 0); R.radice.quaternion.identity();
      for (const p of [-1, 0, 1]) {
        S.swingR = 0;
        posaRoberto(R, p);
        R.radice.updateMatrixWorld(true);
        racchettaR.userData.pala.getWorldPosition(v);
        S.punti[p + 1].set(p * CORSIA + v.x, v.y, ROBERTO_Z + v.z);
      }
      R.radice.position.copy(pos0); R.radice.quaternion.copy(rot0);
    },
    comando(azione) {
      if (!S.attivo) return;
      if (azione === 'sinistra') S.pBersaglio = Math.max(-1, S.pBersaglio - 1);
      if (azione === 'destra') S.pBersaglio = Math.min(1, S.pBersaglio + 1);
    },
    // Avanza la partita. Restituisce 'fine' quando Roberto riparte di corsa.
    aggiorna(dt, G) {
      if (!S.attivo) {
        S.inquadra = Math.max(0, S.inquadra - dt);
        posizionaCugino(dt, 0); posaCugino(performance.now() / 1000);
        return null;
      }
      S.t += dt;
      const t = performance.now() / 1000;
      S.p = THREE.MathUtils.damp(S.p, S.pBersaglio, 16, dt);
      S.swingR = Math.max(0, S.swingR - dt);
      S.swingC = Math.max(0, S.swingC - dt);
      S.scossa = Math.max(0, S.scossa - dt);
      let esito = null;

      if (S.fase === 'arrivo') {
        // Gli ultimi passi fino al tavolo, mentre la telecamera si alza dietro a Roberto.
        S.inquadra = Math.min(1, S.t / 1.0);
        G.pos = THREE.MathUtils.lerp(S.posArrivo, api.posTavolo, THREE.MathUtils.smoothstep(S.t, 0, 0.9));
        if (S.t > 3.0) { S.fase = 'battuta'; S.t = 0; }
      } else if (S.fase === 'battuta') {
        // Il cugino palleggia sulla racchetta, poi batte.
        S.cuginoBersaglio = COLPI[0].da * SPOSTA_CUGINO;
        racchettaCuginoLocale(v2);
        palla.visible = true;
        palla.position.set(v2.x, v2.y + 0.05 + Math.abs(Math.sin(S.t * 6)) * 0.3, v2.z + 0.05);
        if (S.t > 1.1) tira();
      } else if (S.fase === 'volo' || S.fase === 'ritorno' || S.fase === 'punto' || S.fase === 'vincente') {
        const f = S.volo;
        f.u += dt / f.T;
        puntoVolo(f, f.u, palla.position);
        palla.visible = true;
        if (S.fase === 'volo' && f.u >= 1) {
          const c = COLPI[S.colpo];
          if (Math.abs(S.p - (c.a - 1)) < 0.45) {
            // Presa: Roberto rimanda la palla dove il cugino tirerà il prossimo colpo.
            S.ripresi = S.colpo + 1;
            S.tipoSwingR = c.a === 0 ? -1 : 1;
            S.swingR = 0.3;
            if (S.colpo === 4) dici(bollaCherato, 1.3, 'roberto');
            if (c.hollow) {
              // L'Hollow Purple non si rimanda con un colpo solo: la sfera spinge contro la racchetta e
              // bisogna toccare tante volte per respingerla.
              S.ripresi = COLPI.length - 1;
              S.fase = 'duello'; S.t = 0; S.taps = 0; S.orbZ = 0.3;
              palla.visible = false;
              ui.banner?.(`TOCCA!<small>${TAP_RICHIESTI} volte in ${TAP_TEMPO} secondi</small>`, TAP_TEMPO + 0.3);
            } else {
              S.colpo++;
              const prossimo = COLPI[S.colpo];
              S.cuginoBersaglio = prossimo.da * SPOSTA_CUGINO;
              v.copy(palla.position);
              lancia(v, v2.set(prossimo.da * SPOSTA_CUGINO - 0.3, PIANO + 0.25, CUGINO_Z + 0.4), 0.7, -LUNGO + 0.9, { h1: 0.32, h2: 0.15 });
              S.fase = 'ritorno';
            }
          } else {
            // Punto del cugino: la palla passa e cade dietro Roberto.
            S.fase = 'punto'; S.t = 0;
            f.T *= 1.0;
            dici(bollaCugino, 1.6, 'cugino');
            G.exprNome = 'dolore'; G.exprTemp = 1.0;
            if (navigator.vibrate) navigator.vibrate(60);
          }
        } else if (S.fase === 'ritorno' && f.u >= 1) {
          if (COLPI[S.colpo].hollow) { S.fase = 'hollow'; S.t = 0; palla.visible = false; }
          else tira();
        } else if (S.fase === 'punto') {
          if (f.u > 1.6) palla.visible = false;
          if (S.t > 2.0) {
            S.colpo = 0; S.ripresi = 0;
            S.fase = 'battuta'; S.t = 0;
          }
        } else if (S.fase === 'vincente') {
          if (f.u > 1.5) palla.visible = false;
          G.exprNome = 'gioia'; G.exprTemp = 0.5;
          if (S.t > 1.2) {
            // Roberto fa un passo a sinistra per girare attorno al tavolo e riparte.
            G.corsia = 0;
            G.x = THREE.MathUtils.damp(G.x, -2.2, 4, dt);
          }
          if (S.t > 2.3) {
            S.fase = 'fine'; S.attivo = false; S.fatto = true;
            racchettaR.visible = false; racchettaR.removeFromParent();
            palla.visible = false; ombra.visible = false;
            esito = 'fine';
          }
        }
      } else if (S.fase === 'duello') {
        const prog = Math.min(1, S.taps / TAP_RICHIESTI);
        // La sfera viola spinge contro la racchetta; a ogni tocco arretra verso il cugino.
        S.orbZ = THREE.MathUtils.damp(S.orbZ, THREE.MathUtils.lerp(-0.1, -LUNGO * 0.9, prog), 14, dt);
        const tremo = (1 - prog) * 0.05;
        palla.position.set(S.punti[1].x + Math.sin(S.t * 70) * tremo, PIANO + 0.75 + Math.cos(S.t * 55) * tremo, S.orbZ);
        viola.visible = true;
        viola.position.copy(palla.position);
        viola.scale.setScalar(1.35 + Math.sin(S.t * 30) * 0.12);
        S.scossa = Math.max(S.scossa, 0.05);
        if (S.taps >= TAP_RICHIESTI) {
          // Respinta: il rovescio vincente va nell'angolo lontano, il cugino non ci arriva.
          ui.nascondi?.();
          S.ripresi = N_COLPI;
          S.tipoSwingR = -1; S.swingR = 0.3;
          palla.visible = true;
          v.copy(palla.position);
          lancia(v, v2.set(1.7, 0.5, -LUNGO - 1.6), 0.55, -LUNGO + 0.6, { h1: 0.18, h2: 0.25 });
          S.fase = 'vincente'; S.t = 0;
          S.cuginoBersaglio = 0.3;
        } else if (S.t >= TAP_TEMPO) {
          // Troppo pochi tocchi: la sfera travolge Roberto, punto del cugino.
          ui.nascondi?.();
          palla.visible = true;
          v.copy(palla.position);
          lancia(v, v2.set(0, 0.3, ROBERTO_Z + 2.4), 0.5, ROBERTO_Z - 0.4, { h1: 0.1, h2: 0.3 });
          S.fase = 'punto'; S.t = 0;
          dici(bollaCugino, 1.6, 'cugino');
          G.exprNome = 'dolore'; G.exprTemp = 1.0;
          if (navigator.vibrate) navigator.vibrate(80);
        }
      } else if (S.fase === 'hollow') {
        const k = S.t / DURATA_HOLLOW;
        const centro = v.set(S.cuginoX, 2.15, CUGINO_Z + 0.2);
        // Blu e rosso nascono dalle mani alzate, girano e si avvicinano; poi si fondono nel viola.
        const avvicina = THREE.MathUtils.smoothstep(k, 0.12, 0.62);
        const ang = k * 14;
        const raggio = 0.75 * (1 - avvicina);
        blu.visible = rosso.visible = k < 0.64;
        blu.position.set(centro.x - Math.cos(ang) * raggio, centro.y + Math.sin(ang * 0.5) * 0.12, centro.z + Math.sin(ang) * raggio * 0.5);
        rosso.position.set(centro.x + Math.cos(ang) * raggio, centro.y - Math.sin(ang * 0.5) * 0.12, centro.z - Math.sin(ang) * raggio * 0.5);
        const pulsa = 1 + Math.sin(S.t * 30) * 0.08;
        blu.scale.setScalar(0.95 * pulsa * THREE.MathUtils.smoothstep(k, 0, 0.1));
        rosso.scale.setScalar(0.95 * pulsa * THREE.MathUtils.smoothstep(k, 0, 0.1));
        viola.visible = k >= 0.6;
        const cresce = THREE.MathUtils.smoothstep(k, 0.6, 0.78) * (1 - 0.75 * THREE.MathUtils.smoothstep(k, 0.86, 1));
        viola.position.copy(centro);
        viola.scale.setScalar(Math.max(0.01, 2.4 * cresce * pulsa));
        lampo.visible = k > 0.6 && k < 0.85;
        lampo.position.copy(centro);
        lampo.material.opacity = 0.7 * Math.sin(THREE.MathUtils.clamp((k - 0.6) / 0.25, 0, 1) * Math.PI);
        lampo.scale.setScalar(4 + 7 * THREE.MathUtils.clamp((k - 0.6) / 0.25, 0, 1));
        anello.visible = k > 0.62 && k < 0.9;
        if (anello.visible) {
          const a = (k - 0.62) / 0.28;
          anello.position.copy(centro);
          anello.scale.setScalar(0.3 + a * 3.4);
          anello.material.opacity = 1 - a;
        }
        if (k > 0.6 && k < 0.8) S.scossa = 0.12;
        if (k >= 1) {
          for (const s of [blu, rosso, lampo]) s.visible = false;
          anello.visible = false;
          S.t = 0;
          tira();
        }
      }
      // La palla viola dell'Hollow Purple: alone che la segue.
      const hollowInVolo = S.volo?.hollow && S.fase === 'volo';
      viola.visible = viola.visible && (S.fase === 'hollow' || S.fase === 'duello' || hollowInVolo);
      if (hollowInVolo) { viola.visible = true; viola.position.copy(palla.position); viola.scale.setScalar(1.1 + Math.sin(S.t * 30) * 0.1); }
      palla.material.color.setHex(hollowInVolo ? 0xD9A6FF : 0xFF8C1A);

      // Ombra della palla sul tavolo (aiuta a capire dove arriva) e scia.
      ombra.visible = palla.visible && palla.position.z < 0 && palla.position.z > -LUNGO && Math.abs(palla.position.x) < LARGO / 2;
      ombra.position.set(palla.position.x, ALTO + 0.004, palla.position.z);
      if (palla.visible) { storia.unshift(palla.position.clone()); if (storia.length > scia.length * 2) storia.pop(); }
      scia.forEach((s, i) => {
        const q = storia[i * 2 + 1];
        s.visible = Boolean(q) && palla.visible && (S.fase === 'volo' || S.fase === 'vincente');
        if (q) s.position.copy(q);
        s.material.color.setHex(hollowInVolo ? 0xA040FF : 0xFFB060);
      });

      // Fumetti.
      for (const b of [bollaCugino, bollaPallettaro, bollaCherato]) {
        if (!b.visible) continue;
        b.userData.t -= dt;
        if (b.userData.t <= 0) { b.visible = false; continue; }
        if (b.userData.sopra === 'cugino') b.position.set(S.cuginoX, 2.05, CUGINO_Z);
        else b.position.set(G.x + 0.2, 2.15, ROBERTO_Z);
      }

      posizionaCugino(dt, t);
      const alza = S.fase === 'hollow' ? THREE.MathUtils.smoothstep(S.t / DURATA_HOLLOW, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(S.t / DURATA_HOLLOW, 0.9, 1)) : 0;
      posaCugino(t, alza);
      if (S.fase === 'vincente') {
        // Il cugino si allunga verso l'angolo, ma tardi.
        cugino.corpo.rotation.z = -0.35 * THREE.MathUtils.smoothstep(S.t, 0.15, 0.5);
      }
      // Roberto si sposta di lato insieme alla racchetta.
      if (S.fase !== 'arrivo' && S.fase !== 'vincente') G.x = S.p * CORSIA;
      return esito;
    },
    posa(R, dt, G) {
      if (S.fase === 'arrivo' && S.t < 0.9) {
        G.passo += dt * 9;
        posaCorsa(R, G.passo, 0.5 * (1 - S.t / 0.9));
        return;
      }
      if (S.fase === 'vincente' && S.t > 1.2) {
        G.passo += dt * 12;
        posaCorsa(R, G.passo, 0.6);
        return;
      }
      posaRoberto(R, S.p);
      if (S.fase === 'vincente') {
        // Pugno alzato.
        R.braccia[0].spalla.rotation.set(2.8 * THREE.MathUtils.smoothstep(S.t, 0.3, 0.6), 0, -0.2);
        R.braccia[0].gomito.rotation.set(0.5, 0, 0);
      }
    },
    // Telecamera dietro e sopra Roberto, che guarda il tavolo e il cugino.
    camera(cam) {
      if (S.inquadra <= 0) return;
      const k = THREE.MathUtils.smoothstep(S.inquadra, 0, 1);
      radice.updateMatrixWorld(true);
      camPos.set(0, 4.7, ROBERTO_Z + 2.7);
      radice.localToWorld(camPos);
      camGuarda.set(0, 0, -LUNGO * 0.5);
      radice.localToWorld(camGuarda);
      // Durante l'Hollow Purple la telecamera si avvicina al cugino.
      const zoom = S.fase === 'hollow' ? 0.75 * THREE.MathUtils.smoothstep(S.t, 0, 0.5) * (1 - THREE.MathUtils.smoothstep(S.t, DURATA_HOLLOW - 0.35, DURATA_HOLLOW)) : 0;
      if (zoom > 0) {
        camPos.lerp(radice.localToWorld(v2.set(S.cuginoX * 0.4, 4.6, ROBERTO_Z + 1.4)), zoom);
        camGuarda.lerp(radice.localToWorld(v2.set(S.cuginoX, 1.7, CUGINO_Z)), zoom);
      }
      if (S.scossa > 0) camPos.x += Math.sin(performance.now() / 14) * 0.06, camPos.y += Math.cos(performance.now() / 17) * 0.05;
      // Partenza: dove la telecamera di gioco guarda ora (circa 12 m avanti).
      cam.getWorldDirection(v).multiplyScalar(12).add(cam.position);
      cam.position.lerp(camPos, k);
      v.lerp(camGuarda, k);
      cam.lookAt(v);
    },
  };
  return api;
}
