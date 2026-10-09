// Gli amici dell'università, nel corridoio della facoltà (magistrale), senza ostacoli:
//  0. Sui gradoni all'ingresso cinque amici seduti con un cappello blu guardano Roberto (il gioco rallenta).
//  1. Chiara (ora coi capelli castani) e un ragazzo biondo cenere escono dall'aula Ia1, passeggiano con
//     Roberto (il gioco rallenta ma non si ferma) ed entrano nell'aula RWC.
//  2. Arriva il gruppo di sette amici: Roberto si ferma e per circa 10 secondi parlano in cerchio, senza
//     parole, con lievi animazioni dei volti. La camera sta al centro e li mostra tutti di faccia.
// Tutto è funzione della posizione di Roberto (o del tempo della scena), così funziona anche dopo un respawn.

import * as THREE from './lib/three.module.min.js';
import { azzeraPosa, posaCorsa, posaFerma, posaSeduto } from './modelli.js';
import {
  creaChiaraAmica, creaAltoBiondo, creaGruppoAmici, creaPortaScorrevole, creaSedutiCappello, espressioneAmico,
} from './amici-uni.js';

const ss = THREE.MathUtils.smoothstep;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const TAU = Math.PI * 2;
const angolo = a => Math.atan2(Math.sin(a), Math.cos(a));              // riporta in -π..π
const lerpAngolo = (a, b, k) => a + angolo(b - a) * k;
const smax = (a, b, k) => (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2;   // massimo "morbido"

const DURATA = 10.4;               // secondi di cerchio (gioco fermo)
const RAGGIO = 2.3;
const MARGINE = 3.4;               // i passanti stanno fuori dalle corsie

// `A`: inizio del corridoio della facoltà; `gradoniD`: dove sta il gruppo di gradoni (centro del modello).
export function creaScenaAmici(scena, perc, A, gradoniD) {
  const PORTA_IA1 = A + 12, PORTA_RWC = A + 58;
  const C = A + 92.3, P0 = C - RAGGIO;           // centro del cerchio; qui si ferma Roberto
  const tmp = {};

  const chiara = creaChiaraAmica(), biondo = creaAltoBiondo();
  const gruppo = creaGruppoAmici();
  const porte = [creaPortaScorrevole('Ia1'), creaPortaScorrevole('RWC')];
  [PORTA_IA1, PORTA_RWC].forEach((d, i) => {
    perc.punto(d, tmp);
    porte[i].position.set(tmp.x, tmp.h, tmp.z);
    porte[i].rotation.y = -tmp.psi;
    scena.add(porte[i]);
  });

  // Ogni personaggio ha la sua "ultima distanza" e la fase del passo, per camminare solo se si muove.
  const pers = [chiara, biondo, ...gruppo].map(p => ({ p, ultimo: null, fase: 0, v: 0 }));
  for (const c of pers) { c.p.radice.visible = false; scena.add(c.p.radice); }
  const [cCh, cBi] = pers;
  const cGr = pers.slice(2);

  // Il cerchio: Roberto a φ=0; gli amici ai multipli di 45°. Il margine (dove stanno prima e dopo) è
  // dalla loro parte.
  const GR = cGr.map((c, i) => {
    const phi = (i + 1) * TAU / 8;
    const x = RAGGIO * Math.sin(phi), d = C - RAGGIO * Math.cos(phi);
    const lato = Math.abs(x) < 0.01 ? 1 : Math.sign(x);
    return { c, phi, x, d, lato, xm: lato * MARGINE, scarto: [0, 2.5, 1.2, 3.6, 4.6, 2.0, 5.6][i] };
  });

  const S = { attivo: false, t: 0, fatto: false };
  // Richieste alla camera (come per i personaggi a margine in main.js): il valore più alto vince.
  const ai = { lato: 0, k: 0, fuoco: 0, largo: false, mira: new THREE.Vector3() };
  const chiedi = (lato, k) => { if (k > ai.k) { ai.k = k; ai.lato = lato; } };

  // ---- utilità ----------------------------------------------------------
  // Posiziona il personaggio: `d` lungo il percorso, `lat` laterale (destra positiva), `rotta` = direzione
  // verso cui guarda, in radianti verso destra rispetto alla direzione di corsa (π = verso il giocatore).
  function metti(c, d, lat, rotta, y = 0) {
    perc.punto(d, tmp);
    c.p.radice.position.set(tmp.x + Math.cos(tmp.psi) * lat, tmp.h + y, tmp.z + Math.sin(tmp.psi) * lat);
    c.p.radice.rotation.set(0, -tmp.psi - rotta, 0);
  }
  // Passo: le gambe si muovono solo in proporzione a quanto il personaggio si sposta.
  function passo(c, d, dt, ampiezza, tempo) {
    const dd = c.ultimo === null ? 0 : clamp(Math.abs(d - c.ultimo), 0, 1.5);
    c.ultimo = d;
    c.v += (dd / Math.max(dt, 1e-3) - c.v) * Math.min(1, dt * 10);
    c.fase += dd * 0.75;
    azzeraPosa(c.p);
    const k = ss(c.v, 0.4, 2.2);
    if (k < 0.02) posaFerma(c.p, tempo, 0);
    else posaCorsa(c.p, c.fase, ampiezza * k);
    return k;
  }
  // La testa verso un punto (lat, d) del corridoio, dato il verso verso cui guarda il corpo.
  function guarda(c, x, d, rotta, mx, md, quanto = 1) {
    const verso = Math.atan2(mx - x, md - d);
    c.p.testa.rotation.y = -clamp(angolo(verso - rotta), -1.1, 1.1) * quanto;
  }
  const nascondi = () => { for (const c of pers) c.p.radice.visible = false; };

  // ---- i cinque seduti sui gradoni, col cappello blu ----------------------------------
  // Stanno sul secondo gradone (stesse misure di creaGradoni): vicini, rivolti alla strada, e girano la testa
  // per guardare Roberto mentre passa.
  const SEDUTI_Z = [1.4, 2.25, 3.1, 3.95, 4.8];
  const SEDUTI_X = -(4.6 + 1.0) - 0.32, SEDUTI_Y = 0.45 * 2 - 0.52;
  const D_SED = gradoniD - 3.1;                    // centro del gruppetto lungo il percorso
  const sedutiP = creaSedutiCappello();
  sedutiP.forEach((p, i) => {
    azzeraPosa(p);
    posaSeduto(p, 0.3);
    p.radice.scale.multiplyScalar(0.8 / 0.8);
    p.braccia[1].spalla.rotation.x = 0.5;
    scena.add(p.radice);
    p.radice.visible = false;
  });
  const miraSed = new THREE.Vector3();
  function seduti(G) {
    const p = G.pos;
    const vis = p > D_SED - 55 && p < D_SED + 25;
    for (const [i, q] of sedutiP.entries()) {
      q.radice.visible = vis;
      if (!vis) continue;
      const d = gradoniD - SEDUTI_Z[i];
      metti({ p: q }, d, SEDUTI_X, Math.PI / 2, SEDUTI_Y);
      // Guardano Roberto, un po' di nascosto: la testa ci mette un attimo a girarsi.
      const verso = Math.atan2(G.x - SEDUTI_X, p - d);
      const voglia = -clamp(angolo(verso - Math.PI / 2), -1.15, 1.15);
      q.testa.rotation.y += (voglia - q.testa.rotation.y) * 0.2;
      q.testa.rotation.x = Math.sin(G.tempo * 1.7 + i * 2) * 0.04;
      q.corpo.position.y = 0;
    }
    if (vis) {
      chiedi(-1, 0.7 * ss(p, D_SED - 32, D_SED - 22) * (1 - ss(p, D_SED + 6, D_SED + 14)));
      const f = 0.45 * ss(p, D_SED - 22, D_SED - 14) * (1 - ss(p, D_SED - 4, D_SED + 2));
      if (f > ai.fuoco) {
        perc.punto(D_SED, tmp);
        ai.mira.set(tmp.x + Math.cos(tmp.psi) * SEDUTI_X, tmp.h + 1.6, tmp.z + Math.sin(tmp.psi) * SEDUTI_X);
        ai.fuoco = f;
      }
    }
  }

  // ---- Chiara e il ragazzo biondo ----------------------------------------
  // `a`: quanto sono avanti rispetto a Roberto; `emerge`/`veer`: intervalli in cui escono e rientrano.
  const COPPIA = [
    { c: cCh, off: 1.4, porta1: PORTA_IA1 + 0.3, porta2: PORTA_RWC + 0.2, esce: [7.5, 10.2], entra: [48.5, 56.5], x: -3.4, soglia: -4.55, xs: -3.4, segui: [2.0, -0.2] },
    { c: cBi, off: -0.2, porta1: PORTA_IA1 - 0.5, porta2: PORTA_RWC - 0.4, esce: [8.3, 11], entra: [49.5, 57.5], x: -3.55, soglia: -4.55, xs: -3.55, segui: [2.5, -0.9] },
  ];

  function coppia(G, dt) {
    const p = G.pos;
    const sotto = p > A + 6 && p < A + 66;
    let aperta1 = 0, aperta2 = 0;
    if (sotto) {
      aperta1 = ss(p, A + 4.5, A + 8) * (1 - ss(p, A + 15, A + 20));
      aperta2 = ss(p, A + 44, A + 49) * (1 - ss(p, A + 59, A + 63));
    }
    porte[0].userData.apri(aperta1); porte[1].userData.apri(aperta2);
    for (const [i, o] of COPPIA.entries()) {
      const { c } = o;
      const s1 = ss(p, A + o.esce[0], A + o.esce[1]);
      const libera = smax(o.porta1, p + o.off, 2.2);
      const u = ss(libera, o.porta2 - 4.5, o.porta2 + 3.5);        // si sposta verso la porta solo quando ci arriva
      // Camminano accanto a Roberto, dal lato libero: se lui è al centro o a destra si spostano verso di lui
      // (restando a distanza), così nell'inquadratura si vedono sempre.
      const voglia = clamp(G.x - o.segui[0], o.x, o.segui[1]);
      o.xs += (voglia - o.xs) * Math.min(1, dt * 3);
      const x = lerp(lerp(-4.7, o.xs, s1), -4.9, u);
      const d = Math.min(libera, o.porta2);
      const rotta = (Math.PI / 2) * (1 - s1) - (Math.PI / 2) * u;
      c.p.radice.visible = sotto && x > o.soglia;
      if (!c.p.radice.visible) { c.ultimo = null; continue; }
      const tempo = G.tempo;
      passo(c, d, dt, 0.5, tempo);
      metti(c, d, x, rotta);
      // Parlano guardandosi: Chiara guarda Roberto, il biondo ora Roberto ora lei.
      const dopo = ss(p, A + 11, A + 14);
      const guardaRob = Math.sin(tempo * 0.9 + i * 2) > -0.3 ? 1 : 0.3;
      guarda(c, x, d, rotta, G.x, p, dopo * guardaRob);
      // Chiara saluta con la mano verso Roberto prima di entrare; il biondo accenna.
      const saluto = ss(p, A + 41, A + 44) * (1 - u);
      if (i === 0 && saluto > 0.05) {
        c.p.braccia[1].spalla.rotation.set(0, 0, 2.5 + Math.sin(tempo * 10) * 0.28);
      }
      if (i === 1) {
        // Mentre cammina gesticola con l'arco verso Roberto.
        const parla = ss(p, A + 16, A + 18) * (1 - ss(p, A + 38, A + 41));
        if (parla > 0.05) {
          c.p.braccia[1].spalla.rotation.x = 0.9 * parla + Math.sin(tempo * 7) * 0.2 * parla;
          c.p.braccia[1].gomito.rotation.x = 1.1 * parla;
        }
        if (saluto > 0.05) c.p.testa.rotation.x = Math.sin(tempo * 8) * 0.12 * saluto;
      }
      if (i === 1) espressioneAmico(c.p, ss(p, A + 16, A + 18) > 0.5 && Math.sin(tempo * 12) > 0.2 && u < 0.2 ? 'sorriso' : 'neutro');
    }
    if (sotto) {
      const k = ss(p, A + 9, A + 14) * (1 - ss(p, A + 52, A + 58));
      chiedi(-1, 0.55 * k);
      // La camera guarda a metà strada tra Roberto e i due amici, senza stringere l'inquadratura.
      if (k > 0.01 && 0.5 * k > ai.fuoco) {
        const xm = (COPPIA[0].xs + COPPIA[1].xs) / 2;
        perc.punto(p + 3.5, tmp);
        const l = (G.x + xm) / 2;
        ai.mira.set(tmp.x + Math.cos(tmp.psi) * l, tmp.h + 1.3, tmp.z + Math.sin(tmp.psi) * l);
        ai.fuoco = 0.5 * k;
        ai.largo = true;
      }
    }
  }

  // ---- il gruppo ----------------------------------------------------------
  // Chi parla, a turno (indici 0-6 gli amici, 7 Roberto); i turni durano `TURNO` secondi.
  const TURNO = 0.95, SEQ = [3, 5, 0, 6, 1, 4, 7, 2, 0, 5, 7];
  const RISATA = [5.4, 7.0];
  const parlaNow = t => SEQ[Math.floor(Math.max(0, t - 1.4) / TURNO) % SEQ.length];
  const rid = t => ss(t, RISATA[0], RISATA[0] + 0.3) * (1 - ss(t, RISATA[1] - 0.3, RISATA[1]));

  function gruppoAmici(G, dt) {
    const p = G.pos;
    const t = S.t;
    const vis = S.attivo || (p > A + 64 && p < C + 14);
    for (const g of GR) g.c.p.radice.visible = vis;
    if (!vis) { for (const g of GR) g.c.ultimo = null; return; }

    const m = S.attivo ? ss(t, 0, 1.5) : 0;
    const e = S.attivo ? ss(t, DURATA - 1.5, DURATA - 0.2) : 0;
    const parlante = S.attivo ? parlaNow(t) : -1;
    const ridono = S.attivo ? rid(t) : 0;

    for (const [i, g] of GR.entries()) {
      const { c } = g;
      // Prima vengono incontro a Roberto lungo i margini, sfalsati, e si raccolgono verso il cerchio.
      const resto = Math.max(0, P0 - p);
      const dMargine = g.d + resto * 0.35 + g.scarto * clamp(resto / 22, 0, 1);
      let d, x, rotta;
      const rCentro = Math.atan2(-g.x, C - g.d);                         // guarda il centro
      const rBordo = -g.lato * Math.PI / 2;                              // guarda attraverso il corridoio
      if (S.attivo) {
        // Entrano nel cerchio, poi tornano al margine.
        d = g.d;
        x = lerp(lerp(g.xm, g.x, m), g.xm, e);
        rotta = lerpAngolo(lerpAngolo(Math.PI, rCentro, m), rBordo, e);
      } else if (S.fatto) {
        d = g.d; x = g.xm; rotta = rBordo;
      } else {
        d = dMargine; x = g.xm; rotta = Math.PI;
      }
      const tempo = G.tempo + i;
      const cammina = (!S.attivo && !S.fatto) || (S.attivo && (m < 0.98 || e > 0.02));
      if (cammina) passo(c, d, dt, 0.5, tempo);
      else { c.ultimo = null; azzeraPosa(c.p); posaFerma(c.p, tempo, 0); }
      metti(c, d, x, rotta);

      if (S.attivo && m > 0.98 && e < 0.02) {
        // Chiacchierata: guardano chi parla, annuiscono, il parlante gesticola e muove la bocca.
        const sp = parlante;
        let bx, bd;
        if (sp === 7) { bx = 0; bd = P0; } else { bx = GR[sp].x; bd = GR[sp].d; }
        if (sp === i) {
          c.p.testa.rotation.y = Math.sin(t * 2.2 + i) * 0.35;
          c.p.testa.rotation.x = Math.sin(t * 9 + i) * 0.05;
          const br = c.p.braccia[1];
          br.spalla.rotation.x = 0.6 + Math.sin(t * 6.5 + i) * 0.35;
          br.gomito.rotation.x = 1.15 + Math.sin(t * 6.5 + i + 1) * 0.3;
          c.p.corpo.position.y = Math.abs(Math.sin(t * 4 + i)) * 0.015;
        } else {
          guarda(c, x, d, rotta, bx, bd, 0.6);
          c.p.testa.rotation.x = Math.max(0, Math.sin(t * 3.1 + i * 1.7)) * 0.16;          // annuisce
        }
        // Volto: bocca che si muove, sorrisi, occhi chiusi quando ridono o ammiccano.
        let faccia = 'neutro';
        if (sp === i) faccia = Math.sin(t * 13 + i) > -0.15 ? 'sorriso' : 'neutro';
        else if (((t * 0.23 + i * 0.37) % 1) < 0.22) faccia = 'sorriso';
        if (ridono > 0.5) faccia = Math.sin(t * 9 + i * 1.3) > -0.4 ? 'chiusi' : 'sorriso';
        else if (((t * 0.31 + i * 0.29) % 1) < 0.04) faccia = 'chiusi';
        espressioneAmico(c.p, faccia);
        if (ridono > 0.5) { c.p.corpo.position.y = Math.abs(Math.sin(t * 8 + i)) * 0.04; c.p.testa.rotation.x = -0.18; }
      } else {
        // In cammino verso Roberto o al margine: guardano lui, sorridono quando è vicino.
        if (S.fatto || S.attivo) guarda(c, x, d, rotta, G.x, p);
        else c.p.testa.rotation.y = 0;
        espressioneAmico(c.p, S.fatto && Math.abs(p - d) < 6 ? 'sorriso' : 'neutro');
      }
    }
  }

  // ---- Roberto nel cerchio -----------------------------------------------
  function posaRoberto(R, G) {
    const t = S.t;
    azzeraPosa(R);
    posaFerma(R, t, 0);
    const sp = parlaNow(t);
    const ridi = rid(t);
    let verso = 0;
    if (t > 1.2 && t < DURATA - 1.4) {
      const g = sp === 7 ? null : GR[sp];
      if (g) {
        const rot = Math.atan2(g.x - G.x, g.d - G.pos);
        verso = -clamp(rot, -1.1, 1.1);
      } else verso = Math.sin(t * 2.2) * 0.35;
    }
    R.testa.rotation.set(Math.max(0, Math.sin(t * 3.1)) * 0.12 - ridi * 0.18, verso, 0);
    if (sp === 7 && t > 1.2 && t < DURATA - 1.4) {
      R.braccia[1].spalla.rotation.x = 0.55 + Math.sin(t * 6.5) * 0.35;
      R.braccia[1].gomito.rotation.x = 1.1 + Math.sin(t * 6.5 + 1) * 0.3;
    }
    if (ridi > 0.5) { R.corpo.position.y = Math.abs(Math.sin(t * 8)) * 0.04; R.espressione('gioia'); }
    else R.espressione(sp === 7 || Math.sin(t * 1.3) > 0.2 ? 'sorriso' : 'neutra');
  }

  // ---- camera al centro del cerchio ------------------------------------------
  const camTmp = new THREE.PerspectiveCamera();
  const qA = new THREE.Quaternion(), pCentro = new THREE.Vector3(), mira = new THREE.Vector3();
  function camera(cam) {
    if (!S.attivo) return;
    const t = S.t;
    const k = ss(t, 0, 1.4) * (1 - ss(t, DURATA - 1.4, DURATA));
    if (k <= 0.001) return;
    // Il giro parte da Roberto (φ=0) e fa un giro completo.
    const u = clamp((t - 1.3) / (DURATA - 2.9), 0, 1);
    const phi = TAU * (0.8 * u + 0.2 * ss(u, 0, 1));
    perc.punto(C, tmp);
    const s = Math.sin(tmp.psi), c = Math.cos(tmp.psi);
    pCentro.set(tmp.x, tmp.h + 1.5 + Math.sin(t * 0.9) * 0.04, tmp.z);
    // direzione φ: avanti = (sinψ, -cosψ), destra = (cosψ, sinψ)
    const fx = s * Math.cos(phi) + c * Math.sin(phi), fz = -c * Math.cos(phi) + s * Math.sin(phi);
    mira.set(pCentro.x + fx * 4, tmp.h + 1.42, pCentro.z + fz * 4);
    camTmp.position.copy(pCentro);
    camTmp.lookAt(mira);
    qA.copy(cam.quaternion).slerp(camTmp.quaternion, k);
    cam.position.lerp(pCentro, k);
    cam.quaternion.copy(qA);
    cam.fov = lerp(cam.fov, 68, k); cam.updateProjectionMatrix();
  }

  // ---- interfaccia ----------------------------------------------------------
  return {
    get fatto() { return S.fatto; },
    get attivo() { return S.attivo; },
    get t() { return S.t; },
    inizioAnello: P0,
    centro: C,
    DURATA,
    avvia() { S.attivo = true; S.t = 0; },
    // Il tempo della scena (solo quando lo stato è 'amici'); 'fine' alla conclusione.
    avanza(dt) {
      if (!S.attivo) return null;
      S.t += dt;
      if (S.t >= DURATA) { S.attivo = false; S.fatto = true; S.t = DURATA; return 'fine'; }
      return null;
    },
    // Rallentamento del gioco (0..1) in funzione della posizione.
    rallenta(p) {
      const sed = 0.5 * ss(p, D_SED - 24, D_SED - 16) * (1 - ss(p, D_SED + 4, D_SED + 10));
      if (p < A || p > P0 + 0.1) return sed;
      const coppia = 0.55 * ss(p, A + 4, A + 9) * (1 - ss(p, A + 52, A + 60));
      const gruppo = 0.5 * ss(p, A + 74, A + 80);
      return Math.max(coppia, gruppo, sed);
    },
    // Posiziona tutto; da chiamare a ogni frame (anche con il gioco fermo).
    disponi(G, dt) {
      ai.k = 0; ai.fuoco = 0; ai.largo = false;
      if (G.pos < P0 - 4 && S.fatto && !S.attivo) S.fatto = false;       // respawn prima della scena
      seduti(G);
      if (G.pos < A - 2 || G.pos > C + 20) { nascondi(); porte[0].userData.apri(0); porte[1].userData.apri(0); return ai; }
      coppia(G, dt);
      gruppoAmici(G, dt);
      return ai;
    },
    posaRoberto,
    camera,
    reset() { S.attivo = false; S.t = 0; S.fatto = false; nascondi(); for (const c of pers) c.ultimo = null; },
    chiudi() { S.attivo = false; S.fatto = true; },
    _S: S,
    _pers: pers,
  };
}
