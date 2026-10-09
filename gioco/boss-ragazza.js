// L'ultimo boss: la ragazza di Roberto. Di lei c'è solo la faccia, gigante, davanti alle tre corsie.
// Il combattimento è una sequenza fissa di 10 attacchi, sempre la stessa, da schivare uno dopo l'altro:
//  · Musetto: la bocca si aggruccia (molto carina) e manda due cuori in due corsie: se ne schiva cambiando corsia.
//  · "ROBBETTOO": un urlo stridulo: le lettere stesse escono dalla bocca e arrivano in fila su tutte le corsie, si saltano.
//  · Ciuffetto: una mano compare, strappa il ciuffetto (a sinistra del volto, che resta sempre al suo posto) e lo
//    lancia come uno spuntone lungo una corsia.
// Ogni attacco schivato avvicina la faccia (la distanza cala); se si viene colpiti la distanza aumenta e la
// sequenza riparte da capo. Dopo 10 attacchi schivati di fila Roberto la raggiunge e le dà un bacetto.

import * as THREE from './lib/three.module.min.js';
import { posaFerma, azzeraPosa } from './modelli.js';
import { dipingi, dipingiMano, VOLTO_W, VOLTO_H, CIUFFETTO } from './volto-ragazza.js';

export const N_ATTACCHI = 10;
const D_MAX = 32, D_MIN = 15, D_ENTRA = 70;
const LARG = 20, ALT = LARG * VOLTO_H / VOLTO_W, CENTRO_Y = 8.0;
const SPAZIO = 1.9;                       // secondi tra l'inizio di un attacco e il successivo
const FATTORE_VELOCITA = 0.55;            // durante lo scontro il mondo scorre più piano
const ATTESA = { musetto: 0.75, robbettoo: 0.95, ciuffetto: 1.35 };    // preparazione prima del lancio
const DURATA_BACIO = 5.2;

// La sequenza è sempre uguale, così si impara a memoria (corsie: 0 sinistra, 1 centro, 2 destra).
// musetto: le corsie con i cuori; ciuffetto: la corsia dello spuntone; robbettoo: salto.
export const SEQUENZA = [
  { t: 'musetto', corsie: [0, 2] },
  { t: 'ciuffetto', corsie: [1] },
  { t: 'robbettoo', corsie: [0, 1, 2] },
  { t: 'musetto', corsie: [1, 2] },
  { t: 'ciuffetto', corsie: [0] },
  { t: 'robbettoo', corsie: [0, 1, 2] },
  { t: 'ciuffetto', corsie: [2] },
  { t: 'musetto', corsie: [0, 1] },
  { t: 'robbettoo', corsie: [0, 1, 2] },
  { t: 'ciuffetto', corsie: [1] },
];

const ss = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

// ---- texture (si dipingono al primo uso) ----------------------------------------------------
const cacheTex = new Map();
function texVolto(o) {
  const chiave = `${o.espr ?? 'neutro'}|${o.chiusi ? 1 : 0}|${o.ciuffo === false ? 0 : 1}`;
  if (!cacheTex.has(chiave)) {
    const t = new THREE.CanvasTexture(dipingi(o));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    cacheTex.set(chiave, t);
  }
  return cacheTex.get(chiave);
}
const cacheMano = new Map();
function texMano(con) {
  if (!cacheMano.has(con)) {
    const t = new THREE.CanvasTexture(dipingiMano(con));
    t.colorSpace = THREE.SRGBColorSpace;
    cacheMano.set(con, t);
  }
  return cacheMano.get(con);
}

// ---- oggetti degli attacchi ---------------------------------------------------------------------
let geoCuore = null;
function creaCuore() {
  if (!geoCuore) {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.55);
    sh.bezierCurveTo(-1.0, 0.1, -0.55, 0.95, 0, 0.42);
    sh.bezierCurveTo(0.55, 0.95, 1.0, 0.1, 0, -0.55);
    geoCuore = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 2, curveSegments: 10 });
    geoCuore.translate(0, 0, -0.17);
  }
  const m = new THREE.Mesh(geoCuore, new THREE.MeshLambertMaterial({ color: 0xFF4F8B, emissive: 0x7A1535 }));
  m.scale.setScalar(1.7);
  return m;
}

function creaSpuntone() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x2A1912, emissive: 0x120A06 });
  const cono = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4.6, 6), mat);
  cono.rotation.x = Math.PI / 2;             // la punta verso il giocatore (+z)
  g.add(cono);
  const coda = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 6), new THREE.MeshLambertMaterial({ color: 0x5A3A28 }));
  coda.rotation.x = -Math.PI / 2; coda.position.z = -3.0;
  g.add(coda);
  return g;
}

// "ROBBETTOO": nove lettere a blocchi (font 5×7), che sono loro stesse l'ostacolo.
const PAROLA = 'ROBBETTOO';
const VOX = 0.14, PROF = 0.34, PASSO_LETTERA = 0.84, ALT_LETTERA = 7 * VOX;
const FONT = {
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
};
const geoLettere = {};
function geoLettera(ch) {
  if (geoLettere[ch]) return geoLettere[ch];
  const pos = [], nor = [], idx = [];
  const faccia = (n, a, b, c, d) => {
    const i0 = pos.length / 3;
    for (const v of [a, b, c, d]) { pos.push(...v); nor.push(...n); }
    idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  };
  FONT[ch].forEach((riga, r) => {
    [...riga].forEach((cella, c) => {
      if (cella !== '#') return;
      const x0 = (c - 2.5) * VOX, x1 = x0 + VOX, y0 = (6 - r) * VOX, y1 = y0 + VOX, z0 = -PROF / 2, z1 = PROF / 2;
      faccia([0, 0, 1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
      faccia([0, 0, -1], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
      faccia([1, 0, 0], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
      faccia([-1, 0, 0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
      faccia([0, 1, 0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
      faccia([0, -1, 0], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
    });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return (geoLettere[ch] = g);
}
let matLettere = null;
function creaParola() {
  matLettere ??= [0xFF4F8B, 0x66D8FF].map(c => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.45 }));
  const lettere = [...PAROLA].map((ch, i) => {
    const m = new THREE.Mesh(geoLettera(ch), matLettere[i % 2]);
    m.rotation.order = 'YXZ';
    m.userData.x = (i - (PAROLA.length - 1) / 2) * PASSO_LETTERA;
    return m;
  });
  return lettere;
}

function creaMarcatore(colore) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.2), new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: 0, depthWrite: false }));
  m.rotation.order = 'YXZ';
  m.visible = false;
  return m;
}

// ctx: { sez, corsie, daLocale(d, lx, ly, lz, out), psi(d), fisica(), immune(), colpito(), vs(), banner(html, s), sipario(nero) }
export function creaBossRagazza(scena, ctx) {
  const { sez, corsie } = ctx;
  const B = {
    fase: 'fuori', ok: 0, idx: 0, tNext: 0, pausa: 0, dist: D_ENTRA, ride: 0, entra: 0, colpiti: 0,
    attacchi: [], vel: 1, fx: 0, fy: CENTRO_Y, boccaY: 6, mx: 0, my: 16, punta: null, fatto: false, tb: 0, scossa: 0, cuori: [], t: 0,
  };
  const V = new THREE.Vector3(), V2 = new THREE.Vector3();

  // La faccia: un piano dipinto, con la mano che si stacca il ciuffetto.
  const gruppo = new THREE.Group();
  gruppo.visible = false;
  scena.add(gruppo);
  const matVolto = new THREE.MeshBasicMaterial({ map: texVolto({}), transparent: true, alphaTest: 0.04 });
  const piano = new THREE.Mesh(new THREE.PlaneGeometry(LARG, ALT), matVolto);
  gruppo.add(piano);
  const LM = LARG * 0.26, HM = LM * 320 / 256;
  const matMano = new THREE.MeshBasicMaterial({ map: texMano(true), transparent: true, alphaTest: 0.04 });
  const mano = new THREE.Mesh(new THREE.PlaneGeometry(LM, HM), matMano);
  mano.position.z = 0.08; mano.visible = false;
  gruppo.add(mano);
  const puntaMano = new THREE.Vector2((118 / 256 - 0.5) * LM, (0.5 - 40 / 320) * HM);     // le dita che pizzicano
  const posCiuffetto = new THREE.Vector2((CIUFFETTO.x - 0.5) * LARG, (0.5 - CIUFFETTO.y) * ALT);
  const marcatori = [0, 1, 2].map(() => creaMarcatore(0xFF4F8B));
  for (const m of marcatori) scena.add(m);

  const aggiungi = (o) => { scena.add(o); return o; };
  const togli = (a) => { for (const m of a.mesh) scena.remove(m); };

  function piazza(obj, d, x, y) {
    ctx.daLocale(d, x, y, 0, obj.position);
    obj.rotation.y = -ctx.psi(d);
  }

  // In orizzontale il campo visivo verticale è più stretto: la faccia si rimpicciolisce e si abbassa, così
  // restano in vista fronte e ciuffetto.
  const misura = () => (ctx.orizzontale?.() ? { s: 0.64, cy: 6.2 } : { s: 1, cy: CENTRO_Y });

  B.dentro = pos => pos >= sez.inizio && pos < sez.fine;
  Object.defineProperty(B, 'attivo', { get: () => B.fase === 'ingresso' || B.fase === 'combatte' || B.fase === 'finale' || B.fase === 'bacio' });
  B.fattore = () => B.vel;
  B.progresso = () => B.ok / N_ATTACCHI;

  function pulisci() {
    for (const a of B.attacchi) togli(a);
    B.attacchi = [];
    for (const c of B.cuori) scena.remove(c.m);
    B.cuori = [];
    for (const m of marcatori) m.visible = false;
  }
  B.reset = () => {
    pulisci();
    Object.assign(B, { fase: 'fuori', ok: 0, idx: 0, tNext: 0, pausa: 0, dist: D_ENTRA, ride: 0, entra: 0, colpiti: 0, vel: 1, punta: null, fatto: false, tb: 0, scossa: 0 });
    gruppo.visible = false; mano.visible = false;
    gruppo.scale.setScalar(1);
  };
  B.chiudi = () => { B.reset(); B.fatto = true; B.fase = 'fatto'; };

  // ---- attacchi ------------------------------------------------------------------------------
  function lancia() {
    const def = SEQUENZA[B.idx++];
    B.attacchi.push({ tipo: def.t, corsie: def.corsie, t: 0, W: ATTESA[def.t], F: 1.4, u: -1, mesh: [], risolto: false });
  }

  function rilascia(a) {
    a.F = clamp(B.dist / 16, 0.95, 2.0);
    a.u = 0;
    if (a.tipo === 'musetto') {
      for (const l of a.corsie) { const m = aggiungi(creaCuore()); a.mesh.push(m); m.userData.lane = l; }
    } else if (a.tipo === 'robbettoo') {
      for (const m of creaParola()) { aggiungi(m); a.mesh.push(m); }
      a.x0 = B.fx; a.y0 = B.boccaY;
      B.scossa = 0.9;
    } else {
      const s = aggiungi(creaSpuntone()); a.mesh.push(s); s.userData.lane = a.corsie[0];
      a.x0 = B.mx; a.y0 = B.my;                      // parte dalle dita che hanno strappato il ciuffetto
    }
  }

  // Il corpo di Roberto contro l'attacco; true se lo prende.
  function colpisce(a, G, rel) {
    if (ctx.immune() || Math.abs(rel) > 0.8) return false;
    const f = ctx.fisica();
    const alto = G.y + (G.scivola > 0 ? f.altezzaBassa : f.altezza);
    if (a.tipo === 'robbettoo') return G.y < ALT_LETTERA + 0.08 - 0.16;
    return a.corsie.some(l => Math.abs(corsie[l] - G.x) < 0.95) && (a.tipo === 'musetto' ? (alto > 0.35 && G.y < 2.7) : (alto > 0.55 && G.y < 1.5));
  }

  function colpisci(G) {
    for (const a of B.attacchi) togli(a);
    B.attacchi = [];
    B.ok = 0; B.idx = 0;
    B.pausa = 1.9; B.ride = 1.5;
    B.dist = Math.min(D_MAX + 6, B.dist + 7);      // il colpo ci spinge indietro: lei è più lontana
    B.colpiti++;
    ctx.colpito();
  }

  // ---- la faccia: espressione e movimenti ---------------------------------------------------------
  function precarica() {
    for (const o of [{ espr: 'musetto' }, { espr: 'urlo' }, { espr: 'sfida' }, { espr: 'ride' }, { chiusi: true }]) texVolto(o);
    texMano(false);
  }

  function animaFaccia(dt, G) {
    const t = performance.now() / 1000;
    let espr = 'neutro', chiusi = false;
    let scala = 1, tilt = 0, scuoti = 0, manoFase = -1, manoK = 0;
    const att = B.attacchi.find(a => a.u < 0) ?? B.attacchi.find(a => a.tipo === 'robbettoo' && a.t - a.W < 0.8) ?? B.attacchi.find(a => a.tipo === 'ciuffetto' && a.t - a.W < 0.7);
    if (B.ride > 0) { espr = 'ride'; tilt = 0.06 * Math.sin(t * 22); }
    else if (B.fase === 'bacio') espr = B.tb > 1.8 ? 'bacio' : 'neutro';
    else if (att) {
      const k = att.t;
      if (att.tipo === 'musetto') {
        espr = 'musetto';
        tilt = 0.14 * Math.sin(Math.min(1, k / att.W) * Math.PI * 1.4);          // inclina la testa, da tenera
        scala = 1 + 0.04 * ss(k, 0, att.W);
      } else if (att.tipo === 'robbettoo') {
        if (k < att.W) { chiusi = true; scala = 1 + 0.10 * ss(k, 0.1, att.W); }     // prende fiato
        else { espr = 'urlo'; scala = 1.1 + 0.03 * Math.sin(t * 40); scuoti = 1; }
      } else {
        // Il ciuffetto resta sempre al suo posto sul volto: la mano compare, lo strappa (con una ciocca in
        // mano) e lo lancia. Fasi in frazioni dell'attesa: sale (0-.32), pizzica e tira (.32-.62), lancia (.62-1).
        espr = 'sfida';
        const f = k / att.W;
        if (f < 0.32) manoFase = 0, manoK = f / 0.32;
        else if (f < 0.62) { manoFase = 1; manoK = (f - 0.32) / 0.30; }
        else manoFase = 2, manoK = clamp((f - 0.62) / 0.38, 0, 1);
        if (att.u >= 0) manoFase = 3, manoK = clamp(att.u * 3, 0, 1);       // dopo il lancio la mano si ritira
      }
    } else if ((t % 3.6) < 0.13) chiusi = true;                              // ammicca
    if (B.fase === 'bacio' && B.tb > 2.9) espr = 'ride';
    const tx = texVolto({ espr, chiusi });
    if (matVolto.map !== tx) matVolto.map = tx;

    const entra = B.entra;
    const mis = misura();
    const fs = scala * lerp(0.7, 1, entra) * mis.s;
    // Mano: arriva dal basso a sinistra, pizzica il ciuffetto (a sinistra del volto), tira, poi lo lancia.
    mano.visible = manoFase >= 0 && manoFase < 4 && B.fase !== 'bacio';
    if (mano.visible) {
      const fuori = new THREE.Vector2(-LARG * 0.5, ALT * 0.62);
      const ciuf = new THREE.Vector2(posCiuffetto.x, posCiuffetto.y - 0.2);       // dove pizzica
      const corsiaLancio = att?.corsie?.[0] ?? 1;
      const lancio = new THREE.Vector2((corsie[corsiaLancio] - B.fx) / Math.max(fs, 0.3), ciuf.y + 1.4);
      let tx2, ty2, rot = 0, gr = 1;
      if (manoFase === 0) { const e = ss(manoK, 0, 1); tx2 = lerp(fuori.x, ciuf.x, e); ty2 = lerp(fuori.y, ciuf.y, e); rot = Math.PI + 0.55 * (1 - e); }
      else if (manoFase === 1) {
        // tira: due strattoni verso il basso a sinistra, il ciuffetto sul volto si vede sotto le dita
        const strappo = Math.abs(Math.sin(manoK * Math.PI * 2.5)) * (0.35 + 0.65 * manoK);
        tx2 = ciuf.x - 0.55 * strappo; ty2 = ciuf.y - 0.7 * strappo; rot = Math.PI + 0.25 * strappo;
      }
      else if (manoFase === 2) {
        const e = ss(manoK, 0, 1);
        const carica = Math.sin(clamp(manoK / 0.35, 0, 1) * Math.PI * 0.5) * (1 - ss(manoK, 0.35, 0.6));    // si carica indietro e poi lancia
        tx2 = lerp(ciuf.x, lancio.x, e) - 1.2 * carica; ty2 = lerp(ciuf.y, lancio.y, e) + 0.3 * carica;
        rot = Math.PI - 0.9 * ss(manoK, 0.3, 1) + 0.3 * carica; gr = 1 + 0.5 * e;
      }
      else { const e = ss(manoK, 0, 1); tx2 = lerp(lancio.x, fuori.x, e); ty2 = lerp(lancio.y, fuori.y, e); gr = 1.5 - 0.5 * e; rot = Math.PI - 0.9 * (1 - e); }
      mano.scale.setScalar(gr);
      mano.rotation.z = rot;
      const cr = Math.cos(rot), sr = Math.sin(rot), ox = puntaMano.x * gr, oy = puntaMano.y * gr;
      mano.position.x = tx2 - (ox * cr - oy * sr); mano.position.y = ty2 - (ox * sr + oy * cr);
      mano.position.z = 0.08 + (manoFase === 2 ? 1.5 * ss(manoK, 0.4, 1) : manoFase === 3 ? 1.5 : 0);
      B.punta = [tx2, ty2];
      const conCiocca = manoFase === 1 || manoFase === 2;
      const m = texMano(conCiocca);
      if (matMano.map !== m) matMano.map = m;
    }

    // Posizione, scala e movimento della faccia (nel bacio ci pensa aggiornaBacio)
    if (B.fase === 'bacio') return;
    const bob = Math.sin(t * 1.6) * 0.18 + (scuoti ? Math.sin(t * 55) * 0.12 : 0);
    const y = lerp(-ALT * 0.7 * mis.s, mis.cy, entra) + bob * mis.s;
    const fx = scuoti ? Math.sin(t * 47) * 0.12 : Math.sin(t * 0.8) * 0.25;
    piazza(gruppo, G.pos + B.dist, fx, y);
    gruppo.rotation.z = tilt + (scuoti ? Math.sin(t * 41) * 0.035 : 0);
    gruppo.scale.setScalar(fs);
    gruppo.visible = B.fase !== 'fuori' && B.fase !== 'fatto';
    // Dove stanno bocca e dita (nello spazio della corsa): da lì partono lettere e spuntone.
    B.fx = fx; B.fy = y; B.boccaY = y + (0.5 - 604 / VOLTO_H) * ALT * fs;
    const [px, py] = B.punta ?? [posCiuffetto.x, posCiuffetto.y];
    B.mx = fx + px * fs; B.my = y + py * fs;
  }

  // ---- il ciclo del combattimento -------------------------------------------------------------------
  B.aggiorna = (dt, G, inGioco) => {
    const pos = G.pos;
    if (B.fatto || pos < sez.inizio - 80) {
      if (B.fase !== 'fuori' && B.fase !== 'fatto') B.reset();
      B.vel += (1 - B.vel) * Math.min(1, dt * 3);
      return;
    }
    B.ride = Math.max(0, B.ride - dt);
    B.scossa = Math.max(0, B.scossa - dt);
    if (B.fase === 'fuori' && inGioco && pos >= sez.inizio + 30 && pos < sez.fine - 120) {
      B.fase = 'ingresso'; B.t = 0; B.dist = D_ENTRA; B.entra = 0;
      ctx.vs?.();
      precarica();
    }
    // Il mondo scorre piano durante lo scontro.
    const vTarget = B.attivo && B.fase !== 'bacio' ? FATTORE_VELOCITA : 1;
    B.vel += (vTarget - B.vel) * Math.min(1, dt * 2.5);
    if (B.fase === 'fuori') return;

    if (inGioco) {
      if (B.fase === 'ingresso') {
        B.t += dt;
        B.entra = ss(B.t, 0, 2.6);
        B.dist = lerp(D_ENTRA, D_MAX, ss(B.t, 0, 3.0));
        if (B.t >= 3.4) { B.fase = 'combatte'; B.tNext = 0.6; }
      } else if (B.fase === 'finale') {
        B.dist += (D_MIN - B.dist) * Math.min(1, dt * 2.2);
      } else if (B.fase === 'combatte') {
        // Distanza: cala a ogni attacco schivato; dopo un colpo torna al massimo.
        const bersaglio = D_MAX - (D_MAX - D_MIN) * (B.ok / N_ATTACCHI);
        B.dist += (bersaglio - B.dist) * Math.min(1, dt * 2.2);
        if (B.pausa > 0) {
          B.pausa -= dt;
          if (B.pausa <= 0) B.tNext = 0.5;
        } else if (B.idx < N_ATTACCHI) {
          B.tNext -= dt;
          if (B.tNext <= 0) { lancia(); B.tNext = SPAZIO; }
        }
      }
    }

    // Gli attacchi in corso.
    const danger = [null, null, null];
    if (inGioco && B.fase !== 'bacio') {
      for (const a of [...B.attacchi]) {
        a.t += dt;
        if (a.u < 0 && a.t >= a.W) rilascia(a);
        if (a.u < 0) continue;
        a.u += dt / a.F;
        const dd = B.dist * (1 - a.u);               // quanto manca a Roberto, in metri
        const d = pos + dd;
        const e = a.u;
        if (a.tipo === 'musetto') {
          for (const m of a.mesh) {
            piazza(m, d, corsie[m.userData.lane], lerp(B.fy - 0.2 * ALT * misura().s, 1.25, Math.pow(e, 0.6)) + Math.sin(a.t * 6 + m.userData.lane) * 0.12);
            m.rotation.y += dt * 3.2; m.rotation.z = Math.sin(a.t * 5) * 0.12;
            m.scale.setScalar(1.3 + 0.5 * e);
          }
        } else if (a.tipo === 'robbettoo') {
          // Le lettere escono dalla bocca una dopo l'altra (la R per prima), si aprono a ventaglio e atterrano in fila.
          for (const [i, m] of a.mesh.entries()) {
            const ei = clamp((e - i * 0.03) / (1 - i * 0.03), 0, 1);
            const aperto = ss(ei, 0, 0.5), giu = ss(ei, 0, 0.62);
            piazza(m, d + (1 - giu) * 0.8, a.x0 + (m.userData.x - a.x0) * aperto, lerp(a.y0, 0.08, giu) + Math.sin(a.t * 14 + i) * 0.04 * giu);
            m.scale.setScalar(lerp(0.5, 1, giu));
            m.rotation.z = (1 - giu) * 0.5 * Math.sin(a.t * 9 + i * 1.7);
          }
        } else {
          const s = a.mesh[0];
          piazza(s, d, lerp(a.x0, corsie[s.userData.lane], ss(e, 0, 0.45)), lerp(a.y0, 1.05, Math.pow(e, 0.7)));
          s.rotation.z += dt * 9;
          s.rotation.x = -0.35 * (1 - e);                 // in discesa verso Roberto
        }
        // Avvisi sul pavimento nelle corsie colpite, sempre più forti quando manca poco.
        const forza = ss(dd, 16, 4);
        for (const l of a.corsie) {
          if (!danger[l] || forza > danger[l].forza) danger[l] = { forza, tipo: a.tipo };
        }
        if (!a.risolto && colpisce(a, G, dd)) { colpisci(G); break; }
        if (dd < -0.9) {
          a.risolto = true; togli(a);
          B.attacchi.splice(B.attacchi.indexOf(a), 1);
          if (B.fase === 'combatte') {
            B.ok++;
            if (B.ok >= N_ATTACCHI) { B.fase = 'finale'; B.tb = 0; }
          }
        }
      }
    }
    for (const [l, m] of marcatori.entries()) {
      const dg = danger[l];
      m.visible = Boolean(dg) && inGioco;
      if (!m.visible) continue;
      m.material.color.setHex(dg.tipo === 'musetto' ? 0xFF4F8B : dg.tipo === 'robbettoo' ? 0x44C7FF : 0xE0382C);
      m.material.opacity = 0.55 * dg.forza * (0.65 + 0.35 * Math.sin(performance.now() / 70));
      ctx.daLocale(pos + 3.6, corsie[l], 0.07, 0, m.position);
      m.rotation.set(-Math.PI / 2, -ctx.psi(pos + 3.6), 0);
    }
    animaFaccia(dt, G);
  };

  // ---- il bacetto ----------------------------------------------------------------------------------------
  B.avviaBacio = (G) => {
    B.fase = 'bacio'; B.tb = 0; B.dist0 = B.dist; B.pos0 = G.pos;
    pulisci();
  };
  B.aggiornaBacio = (dt, G) => {
    B.tb += dt;
    const t = B.tb;
    // La faccia si avvicina e si rimpicciolisce fino alla misura di una persona.
    const k = ss(t, 0, 1.5);
    B.dist = lerp(B.dist0, 2.2, k) - 1.0 * ss(t, 1.5, 2.4);
    B.entra = 1;
    const mis = misura();
    const sc = lerp(mis.s, 0.13, k);
    const piccola = ss(t, 0, 1.5);
    const t0 = performance.now() / 1000;
    piazza(gruppo, G.pos + B.dist, 0, lerp(mis.cy, 1.85, piccola) + Math.sin(t0 * 1.6) * 0.05 * (1 - piccola));
    gruppo.scale.setScalar(sc);
    gruppo.rotation.z = 0.12 * ss(t, 1.6, 2.4) * (1 - ss(t, 3.0, 3.6));
    gruppo.visible = true;
    mano.visible = false;
    // Il bacio: a contatto (2,4 s) esplodono i cuori.
    if (t >= 2.4 && !B.baciato) {
      B.baciato = true;
      ctx.daLocale(G.pos, 0.25, 1.9, -1.0, V);
      for (let i = 0; i < 18; i++) {
        const m = creaCuore();
        m.scale.setScalar(0.28 + Math.random() * 0.3);
        m.position.copy(V);
        m.rotation.y = Math.random() * 6;
        scena.add(m);
        B.cuori.push({ m, vx: (Math.random() - 0.5) * 3.2, vy: 1.6 + Math.random() * 2.6, vz: (Math.random() - 0.5) * 2.4, t: 0 });
      }
    }
    for (let i = B.cuori.length - 1; i >= 0; i--) {
      const c = B.cuori[i];
      c.t += dt;
      c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.position.z += c.vz * dt;
      c.vy -= 1.2 * dt;
      c.m.rotation.y += dt * 2;
      if (c.t > 2.2) { scena.remove(c.m); B.cuori.splice(i, 1); }
    }
    ctx.sipario?.(t > DURATA_BACIO - 0.9);
    if (t >= DURATA_BACIO) {
      pulisci();
      gruppo.visible = false;
      B.fatto = true; B.fase = 'fatto'; B.baciato = false;
      return 'fine';
    }
    return null;
  };

  // La posa di Roberto nel bacio: si ferma, si sporge verso di lei e la bacia sulla guancia.
  B.posaRoberto = (R, G) => {
    const t = B.tb;
    azzeraPosa(R);
    posaFerma(R, t, 0);
    const avanti = ss(t, 1.5, 2.3) * (1 - ss(t, 2.9, 3.6));
    R.superiore.rotation.x = -0.28 * avanti;
    R.testa.rotation.set(-0.1 * avanti, 0.45 * avanti, 0);
    R.espressione(t > 2.3 ? 'gioia' : 'sorriso');
  };

  // Camera del bacio: da dietro a destra, un po' in alto, sulla coppia.
  const camPos = new THREE.Vector3(), camMira = new THREE.Vector3();
  B.camera = (cam, G) => {
    if (B.fase !== 'bacio') return;
    const k = ss(B.tb, 0, 1.4);
    ctx.daLocale(G.pos, 1.5, 2.1, 3.0, camPos);
    ctx.daLocale(G.pos, 0.1, 1.7, -1.4, camMira);
    cam.position.lerp(camPos, k);
    // sguardo: dalla direzione attuale a quella sulla coppia
    cam.getWorldDirection(V).multiplyScalar(10).add(cam.position);
    V.lerp(camMira, k);
    cam.lookAt(V);
  };

  return B;
}
