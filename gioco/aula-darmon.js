// La scena in classe all'Istituto Darmon (3ª B). Il gioco si ferma: i bambini giocano in classe, arriva
// il maestro Rodolfo, vecchio e serioso, e Roberto deve scegliere: piangere (giusto: il casino fa uscire
// tutti dalla classe) o salutare il maestro (sbagliato: si trasforma in un demonio infuocato).
// Stessa interfaccia della scena del liceo (aula.js): avvia, scegli, aggiorna, stato, esito, residuo.

import * as THREE from './lib/three.module.min.js';
import {
  materiale, blocco, cilindro, scritta, creaPersona, posaCorsa, posaSeduto, posaInPiedi, posaFerma,
} from './modelli.js';
import { fumetto } from './aula.js';
import { TEMPO_SCELTA } from './mondi.js';
import { matDarmon, termosifone } from './modelli-infanzia.js';

const S = n => new THREE.MeshLambertMaterial({ color: n });
const BASIC = n => new THREE.MeshBasicMaterial({ color: n });
const SCALA_BIMBI = 0.6;
const SCALA_MAESTRO = 0.86;
const PORTA = new THREE.Vector3(-4.5, 0, 5.1);
const SOGLIA = new THREE.Vector3(-4.5, 0, 3.7);
const POS_ROBERTO = new THREE.Vector3(-2.9, 0, 2.5);
const POS_MAESTRO = new THREE.Vector3(-1.2, 0, 1.1);
// Inquadratura finale: dall'alto, dal lato opposto della classe, verso la porta, così chi scappa si allontana
// dalla camera invece di passarle addosso.
const FINALE = { pos: new THREE.Vector3(5.7, 3.35, 2.6), mira: new THREE.Vector3(-4.0, 0.9, 2.8), fov: 64 };
const COLORI = [0xE0533F, 0x3A7CC4, 0xF2C14E, 0x4CAF6A, 0xB06AD1, 0xF08A3A, 0x3FC1C9, 0xE86A9A];

// ---------------------------------------------------------------------------
// Il demonio: il maestro dopo il saluto
// ---------------------------------------------------------------------------

function creaDemonio() {
  const g = new THREE.Group();
  const rosso = BASIC(0xC8281C), scuro = BASIC(0x8A1812), nero = BASIC(0x2A1210);
  const brace = BASIC(0xFFD23F), fuoco = [BASIC(0xFF6A1F), BASIC(0xFFB02E), BASIC(0xFF3B1A)];
  for (const x of [-0.32, 0.32]) {
    g.add(blocco(0.42, 1.15, 0.42, scuro, x, 0, 0));
    g.add(blocco(0.55, 0.22, 0.7, nero, x, 0, -0.1));
  }
  g.add(blocco(1.35, 1.25, 0.75, rosso, 0, 1.1, 0));
  g.add(blocco(1.0, 0.55, 0.1, scuro, 0, 1.55, -0.4));
  g.add(blocco(1.7, 0.35, 0.8, scuro, 0, 2.15, 0));            // spalle
  // Braccia con spalla, gomito e mano artigliata: si alzano durante la trasformazione, poi graffiano l'aria.
  const braccia = [];
  for (const lato of [-1, 1]) {
    const sp = new THREE.Group();
    sp.position.set(lato * 0.88, 2.2, 0);
    sp.add(blocco(0.5, 0.42, 0.5, scuro, 0, -0.26, 0));                     // spallaccio
    sp.add(blocco(0.36, 0.72, 0.36, rosso, 0, -0.78, 0));
    const gomito = new THREE.Group();
    gomito.position.y = -0.74;
    gomito.add(blocco(0.31, 0.62, 0.31, rosso, 0, -0.62, 0));
    gomito.add(blocco(0.36, 0.14, 0.36, nero, 0, -0.56, 0));                // bracciale
    const mano = new THREE.Group();
    mano.position.y = -0.62;
    mano.add(blocco(0.38, 0.3, 0.24, scuro, 0, -0.3, 0));
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 5), nero);
      c.position.set(-0.14 + i * 0.093, -0.44, -0.05); c.rotation.x = Math.PI + 0.35; mano.add(c);
    }
    const pollice = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.26, 5), nero);
    pollice.position.set(-lato * 0.2, -0.24, -0.08); pollice.rotation.set(Math.PI + 0.6, 0, -lato * 0.7); mano.add(pollice);
    gomito.add(mano);
    sp.add(gomito);
    g.add(sp);
    braccia.push({ sp, gomito, mano, lato });
  }
  // Testa: occhi che brillano, sopracciglia cattive, bocca con i denti, corna.
  const testa = new THREE.Group();
  testa.position.y = 2.7;
  testa.add(blocco(0.85, 0.8, 0.78, rosso, 0, -0.4, 0));
  for (const x of [-0.2, 0.2]) {
    testa.add(blocco(0.2, 0.13, 0.05, brace, x, -0.2, -0.4));
    const sopr = blocco(0.34, 0.09, 0.06, nero, x, -0.07, -0.4);
    sopr.rotation.z = x < 0 ? -0.45 : 0.45; testa.add(sopr);
  }
  testa.add(blocco(0.56, 0.24, 0.05, nero, 0, -0.62, -0.4));
  for (let i = 0; i < 5; i++) {
    const d = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 4), BASIC(0xFFFFFF));
    d.position.set(-0.2 + i * 0.1, -0.55, -0.42); d.rotation.x = Math.PI; testa.add(d);
  }
  for (const lato of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.75, 6), nero);
    c.position.set(lato * 0.32, 0.25, 0); c.rotation.z = -lato * 0.3; testa.add(c);
  }
  g.add(testa);
  // Fiamme che avvolgono il corpo.
  const fiamme = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.2 + (i % 3) * 0.05, 0.9 + (i % 4) * 0.2, 5), fuoco[i % 3]);
    f.position.set(Math.cos(a) * (1.1 + (i % 2) * 0.3), 0.3 + (i % 4) * 0.3, Math.sin(a) * (0.8 + (i % 2) * 0.25));
    g.add(f); fiamme.push(f);
  }
  const luce = new THREE.PointLight(0xFF6A1F, 0, 14);
  luce.position.set(0, 1.6, -0.8);
  g.add(luce);
  g.userData = {
    luce,
    // su: 0 braccia lungo i fianchi, 1 alzate ad artiglio; insegue: le braccia si allungano in avanti.
    anima(t, k, su = 1, insegue = false) {
      fiamme.forEach((f, i) => { f.scale.set(1, (0.8 + 0.5 * Math.abs(Math.sin(t * 17 + i * 1.9))) * k, 1); f.position.y = (0.3 + (i % 4) * 0.3) * k; });
      for (const [i, { sp, gomito, mano, lato }] of braccia.entries()) {
        const graffio = Math.sin(t * 7 + i * Math.PI);
        if (insegue) {
          sp.rotation.set(1.35 + graffio * 0.25, 0, lato * 0.45);
          gomito.rotation.set(0.35 + graffio * 0.2, 0, 0);
        } else {
          // Gomiti in fuori e avambracci in su, con gli artigli verso chi guarda.
          sp.rotation.set((0.45 + graffio * 0.25) * su, 0, lato * (0.15 + 1.45 * su));
          gomito.rotation.set((0.55 + graffio * 0.35) * su, 0, lato * 0.85 * su);
        }
        mano.rotation.x = 0.3 + Math.max(0, graffio) * 0.5;
      }
      testa.rotation.z = Math.sin(t * 11) * 0.06;
      g.position.y = Math.abs(Math.sin(t * 7)) * 0.05;
    },
  };
  return g;
}

// ---------------------------------------------------------------------------
// La scena
// ---------------------------------------------------------------------------

export function creaAulaDarmon() {
  const scena = new THREE.Scene();
  const CIELO = new THREE.Color(0xCFE3EE);
  scena.background = CIELO.clone();
  scena.fog = new THREE.Fog(0xCFE3EE, 18, 40);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  scena.add(camera);

  const emisfero = new THREE.HemisphereLight(0xffffff, 0xa89f8a, 1.7);
  scena.add(emisfero);
  const sole = new THREE.DirectionalLight(0xfff4e0, 1.3);
  sole.position.set(-5, 8, 6);
  scena.add(sole);

  // --- Stanza: pareti gialle, banner dell'alfabeto, finestre, lavagna, tappeto -------------
  const parete = materiale(0xFCEBB0), dado = materiale(0xE7A33F);
  scena.add(blocco(13, 0.2, 11, 0xD4C29A, 0, -0.2, 0));
  scena.add(blocco(13, 0.2, 11, BASIC(0xEFE5CC), 0, 3.6, 0));
  scena.add(blocco(13, 3.6, 0.3, parete, 0, 0, -5.4));
  scena.add(blocco(13, 1.1, 0.34, dado, 0, 0, -5.4));
  scena.add(blocco(0.3, 3.6, 11, parete, -6.4, 0, 0));
  scena.add(blocco(0.34, 1.1, 11, dado, -6.4, 0, 0));
  scena.add(blocco(0.3, 3.6, 11, parete, 6.4, 0, 0));
  scena.add(blocco(0.34, 1.1, 11, dado, 6.4, 0, 0));
  scena.add(blocco(1.0, 3.6, 0.3, parete, -6.0, 0, 5.4));
  scena.add(blocco(10.0, 3.6, 0.3, parete, 1.5, 0, 5.4));
  scena.add(blocco(2.0, 0.8, 0.3, parete, -4.5, 2.8, 5.4));
  scena.add(blocco(2.0, 0.08, 0.3, 0xE0533F, -4.5, 2.72, 5.4));
  for (const z of [-3.2, 0, 3.2]) scena.add(blocco(0.06, 1.7, 1.8, BASIC(0xDDF1FF), -6.22, 1.3, z));
  // Oltre la porta, il corridoio della scuola: verde acqua e rosa, pavimento in cotto, termosifone giallo.
  scena.add(blocco(18, 0.2, 3.6, 0xD9925E, -1, -0.2, 7.3));
  scena.add(blocco(18, 0.2, 3.6, BASIC(0xF6F6F2), -1, 3.6, 7.3));
  scena.add(blocco(18, 3.6, 0.3, matDarmon[0], -1, 0, 9.0));
  const rad = termosifone(0, 0);
  rad.rotation.y = Math.PI / 2; rad.position.set(-4.5, 0, 8.75); scena.add(rad);
  scena.add(blocco(0.08, 1.4, 4.6, 0x2F5D3A, 6.2, 1.0, -0.8));
  const gesso = scritta('3ª B', 1.8, 0.5, 0x2F5D3A, 0xffffff);
  gesso.rotation.y = -Math.PI / 2; gesso.position.set(6.12, 1.8, -0.8);
  scena.add(gesso);
  // Alfabeto colorato sul muro di fondo e disegni appesi.
  'ABCDEFGHI'.split('').forEach((l, i) => {
    const m = scritta(l, 0.7, 0.7, COLORI[i % COLORI.length], 0xFFFFFF);
    m.position.set(-4.4 + i * 1.1, 2.7, -5.2);
    scena.add(m);
  });
  for (let i = 0; i < 6; i++) scena.add(blocco(0.7, 0.55, 0.03, COLORI[(i + 2) % COLORI.length], -4.6 + i * 1.8, 1.8, -5.22));
  // Tappeto tondo e giochi.
  const tappeto = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.03, 28), S(0x6FB7D6));
  tappeto.position.set(1.2, 0.01, -1.4); scena.add(tappeto);
  const anello = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.04, 28), S(0xF2C14E));
  anello.position.set(1.2, 0.02, -1.4); scena.add(anello);
  for (let i = 0; i < 9; i++) scena.add(blocco(0.28, 0.28, 0.28, COLORI[i % COLORI.length], 0.2 + (i % 3) * 0.7, 0.14, -2.2 + Math.floor(i / 3) * 0.55));
  // Cattedra del maestro.
  scena.add(blocco(2.0, 0.08, 0.9, 0x8A5A34, 5.0, 0.78, 3.4));
  for (const [x, z] of [[4.1, 3.0], [5.9, 3.0], [4.1, 3.8], [5.9, 3.8]]) scena.add(blocco(0.08, 0.78, 0.08, 0x4A4F57, x, 0, z));
  // Tavolini bassi con le seggioline.
  const sedie = [];
  const tavolino = (x, z) => {
    scena.add(blocco(1.5, 0.06, 0.9, 0xE9D2A0, x, 0.52, z));
    for (const dx of [-0.68, 0.68]) for (const dz of [-0.38, 0.38]) scena.add(blocco(0.06, 0.52, 0.06, 0x8C6A4A, x + dx, 0, z + dz));
    for (const lato of [-1, 1]) {
      const sx = x + lato * 0.45, sz = z + 0.85;
      scena.add(blocco(0.4, 0.04, 0.4, COLORI[(Math.round(x * 3) + (lato > 0 ? 1 : 0) + 9) % COLORI.length], sx, 0.3, sz));
      for (const dx of [-0.16, 0.16]) for (const dz of [-0.16, 0.16]) scena.add(blocco(0.04, 0.3, 0.04, 0x4A4F57, sx + dx, 0, sz + dz));
      sedie.push(new THREE.Vector3(sx, 0, sz));
    }
  };
  tavolino(-3.6, -3.4); tavolino(3.6, -4.0); tavolino(-1.5, -3.9);

  // --- Personaggi ----------------------------------------------------------------------------
  function persona(o, scala) {
    const p = creaPersona(o);
    p.radice.scale.setScalar(scala);
    scena.add(p.radice);
    return p;
  }
  const roberto = persona({ roberto: true }, SCALA_BIMBI);
  roberto.vesti('bimbo');
  roberto.volto().prepara(['neutro', 'sorriso', 'gioia', 'sorpresa', 'triste', 'piange', 'imbarazzo']);

  const maestro = persona({
    pelle: 0xE3B592, capelli: 0xBFC2C8, acconciatura: 'calvo', occhiali: true, serio: true,
    maglia: 0x23262E, pantaloni: 0x1C1E24, scarpe: 0x16120F, corpulenza: 1.05,
  }, SCALA_MAESTRO);
  maestro.superiore.add(blocco(0.2, 0.07, 0.16, 0xFFFFFF, 0, 1.69, -0.14));      // colletto bianco
  maestro.superiore.add(blocco(0.05, 0.22, 0.02, 0xD8B85A, 0, 1.5, -0.19));      // croce al collo
  maestro.superiore.add(blocco(0.13, 0.05, 0.02, 0xD8B85A, 0, 1.55, -0.19));
  const demonio = creaDemonio();
  demonio.scale.setScalar(0.9);
  demonio.visible = false;
  scena.add(demonio);

  const MAGLIE = [0xC0392B, 0x27AE60, 0xF39C12, 0x8E44AD, 0x16A085, 0xD35400, 0x2980B9, 0xE84393];
  const CAPELLI = [0x2B1D14, 0x5A3A22, 0xC8A25A, 0x15110E, 0x7A4A2A];
  const ACC = [undefined, 'ciuffo', 'caschetto', 'lato', undefined, 'caschetto', 'ricci', 'ciuffo'];
  const ATTIVITA = [
    { tipo: 'corre', fase: 0 }, { tipo: 'corre', fase: 2.1 }, { tipo: 'corre', fase: 4.2 },
    { tipo: 'salta', pos: [3.5, -2.6] }, { tipo: 'salta', pos: [-0.5, -1.0] },
    { tipo: 'siede', sedia: 0 }, { tipo: 'siede', sedia: 1 }, { tipo: 'gioca', pos: [2.0, -0.2] },
  ];
  const bimbi = ATTIVITA.map((att, i) => {
    const p = persona({
      maglia: MAGLIE[i], capelli: CAPELLI[i % CAPELLI.length], acconciatura: ACC[i], pantaloni: i % 2 ? 0x34495E : 0x2A2D3A,
      gonna: ACC[i] === 'caschetto' ? COLORI[(i + 3) % COLORI.length] : undefined, conZaino: false,
    }, SCALA_BIMBI + (i % 3) * 0.02);
    Object.assign(p, att, { fase: att.fase ?? i * 1.3, fuga: null });
    return p;
  });

  // Fumetti.
  const bolla = (t, c, ink, w) => { const f = fumetto(t, c, ink, w); scena.add(f); return f; };
  const gridi = ['AAAH!', 'Aiuto!', 'Mamma!', 'NOOO!', 'Scappa!', 'AAAH!', 'Aiuto!', 'Via!'];
  const fBimbi = bimbi.map((_, i) => bolla(gridi[i], '#FFFFFF', '#1C1D2B', 1.1));
  const fPianto = bolla('UÈÈÈÈ!', '#CFE8FF', '#1F58B8', 1.7);
  const fSaluto = bolla('Buongiorno, maestro!', '#ffffff', '#1C1D2B', 2.3);
  const fBasta = bolla('Basta!', '#FFE27A', '#1C1D2B', 1.1);
  const fRaah = bolla('RAAAAH!', '#FF6B6B', '#ffffff', 2.4);
  const fGioco = bolla('Dai, prendimi!', '#ffffff', '#1C1D2B', 1.7);
  const tutteLeBolle = [...fBimbi, fPianto, fSaluto, fBasta, fRaah, fGioco];

  // Lampo bianco sul dobbiettivo e lacrime.
  const lampo = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  lampo.position.z = -0.6; lampo.renderOrder = 999; lampo.frustumCulled = false;
  camera.add(lampo);
  const lacrime = Array.from({ length: 8 }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0x8FD0FF }));
    m.visible = false; m.scale.set(0.9, 1.4, 0.9); scena.add(m); return m;
  });

  // --- Stato ---------------------------------------------------------------------------------
  const A = { scena, camera, stato: 'inattiva', esito: null, residuo: TEMPO_SCELTA, t: 0, uscito: false };
  const vista = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), fov: 62 };
  const daVista = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), fov: 62 };
  const aVista = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), fov: 62 };
  const impostaV = (v, px, py, pz, mx, my, mz, fov) => { v.pos.set(px, py, pz); v.mira.set(mx, my, mz); v.fov = fov; };
  const mescola = k => {
    const e = k * k * (3 - 2 * k);
    vista.pos.lerpVectors(daVista.pos, aVista.pos, e);
    vista.mira.lerpVectors(daVista.mira, aVista.mira, e);
    vista.fov = daVista.fov + (aVista.fov - daVista.fov) * e;
  };
  const vaiVerso = (px, py, pz, mx, my, mz, fov) => {
    daVista.pos.copy(vista.pos); daVista.mira.copy(vista.mira); daVista.fov = vista.fov;
    impostaV(aVista, px, py, pz, mx, my, mz, fov);
  };

  const base = { pos: new THREE.Vector3(), mira: new THREE.Vector3() };   // inquadratura della scena, con un lento avvicinamento
  let tScena = 0, arrivato = false, tCammino = 0, tVista = 0, durVista = 1;
  let uscite = [];       // chi sta scappando dalla porta
  let tTaglio = 0, tagliato = false, tUscito = -1;
  const tmp = new THREE.Vector3(), dir = new THREE.Vector3();
  const percMaestro = [PORTA.clone(), SOGLIA.clone(), new THREE.Vector3(-1.2, 0, 3.3), POS_MAESTRO.clone()];

  const lunghezza = p => { let l = 0; for (let i = 1; i < p.length; i++) l += p[i].distanceTo(p[i - 1]); return l; };
  function puntoSu(p, s, out, dirOut) {
    let resto = s;
    for (let i = 1; i < p.length; i++) {
      const l = p[i].distanceTo(p[i - 1]);
      if (resto <= l || i === p.length - 1) {
        out.lerpVectors(p[i - 1], p[i], Math.min(1, resto / l));
        dirOut.subVectors(p[i], p[i - 1]).normalize();
        return;
      }
      resto -= l;
    }
  }
  function guarda(p, d, k = 1) {
    const target = Math.atan2(-d.x, -d.z);
    let diff = target - p.radice.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    p.radice.rotation.y += diff * Math.min(1, k);
  }
  const verso = (da, a) => dir.subVectors(a, da).setY(0).normalize();

  function postazioneBimbo(p, i) {
    const r = p.radice;
    r.rotation.set(0, 0, 0);
    if (p.tipo === 'siede') {
      const s = sedie[p.sedia];
      r.position.set(s.x, 0, s.z);
      r.rotation.y = Math.PI;                  // guarda il tavolino (verso -z)
      posaSeduto(p, 0.5);
    } else if (p.tipo === 'corre') {
      posaInPiedi(p);
    } else {
      r.position.set(p.pos[0], 0, p.pos[1]);
      posaInPiedi(p);
    }
  }

  A.avvia = function () {
    A.stato = 'scelta'; A.esito = null; A.residuo = TEMPO_SCELTA; A.t = 0; A.uscito = false;
    tScena = 0; arrivato = false; tCammino = 0; uscite = []; tagliato = false; tUscito = -1;
    roberto.radice.visible = true;
    bimbi.forEach(p => { p.radice.visible = true; });
    demonio.rotation.set(0, 0, 0);
    scena.background.copy(CIELO); emisfero.intensity = 1.7; sole.intensity = 1.3;
    demonio.visible = false; demonio.userData.luce.intensity = 0;
    maestro.radice.visible = true;
    maestro.radice.scale.setScalar(SCALA_MAESTRO);
    maestro.radice.position.copy(PORTA);
    posaInPiedi(maestro); azzeraBraccia(maestro);
    maestro.radice.rotation.set(0, 0, 0);
    maestro.testa.rotation.set(0, 0, 0); maestro.corpo.rotation.set(0, 0, 0);
    roberto.radice.position.copy(POS_ROBERTO);
    roberto.radice.rotation.set(0, -Math.PI / 2 + 0.25, 0);
    posaInPiedi(roberto); azzeraBraccia(roberto);
    roberto.testa.rotation.set(0, 0, 0); roberto.corpo.rotation.set(0, 0, 0);
    roberto.espressione('sorriso');
    bimbi.forEach((p, i) => { azzeraBraccia(p); p.testa.rotation.set(0, 0, 0); p.corpo.rotation.set(0, 0, 0); p.fuga = null; postazioneBimbo(p, i); });
    for (const f of tutteLeBolle) f.visible = false;
    for (const l of lacrime) l.visible = false;
    lampo.material.opacity = 0;
    // Panoramica dall'angolo della porta sulla classe che gioca.
    impostaV(vista, -5.9, 3.5, 4.9, 0.8, 0.5, -1.0, 72);
    impostaV(daVista, -5.9, 3.5, 4.9, 0.8, 0.5, -1.0, 72);
    impostaV(aVista, -5.0, 2.2, 5.0, -1.8, 0.9, 1.8, 62);
  };

  function azzeraBraccia(p) {
    for (const b of p.braccia) { b.spalla.rotation.set(0, 0, 0); b.gomito.rotation.set(0, 0, 0); }
  }

  A.scegli = function (esito) {
    if (A.stato !== 'scelta') return;
    A.esito = esito;
    A.stato = arrivato ? 'scena' : 'attesa';
    if (arrivato) inizioScena();
  };

  function inizioScena() {
    A.stato = 'scena'; tScena = 0;
    roberto.espressione(A.esito === 'piango' ? 'triste' : 'gioia');
    // Il maestro si mette di fronte a Roberto.
    guarda(maestro, verso(maestro.radice.position, roberto.radice.position), 1);
    guarda(roberto, verso(roberto.radice.position, maestro.radice.position), 1);
    // Chi sarà in fuga e quando: dopo il pianto più tardi, dopo il saluto subito.
    const piango = A.esito === 'piango';
    // Prima scappano i bambini, poi Roberto; dopo il pianto anche il maestro esce, tappandosi le orecchie.
    bimbi.forEach((p, i) => { p.fugaA = (piango ? 3.9 : 3.1) + i * (piango ? 0.2 : 0.13); });
    roberto.fugaA = piango ? 5.5 : 4.4;
    maestro.fugaA = 6.0;
    tTaglio = (piango ? 3.9 : 3.1) - 0.35;      // un attimo prima della fuga si passa all'inquadratura finale
    uscite = [];
    impostaV(daVista, vista.pos.x, vista.pos.y, vista.pos.z, vista.mira.x, vista.mira.y, vista.mira.z, vista.fov);
    if (piango) impostaV(aVista, 1.5, 1.5, 5.2, -2.5, 1.15, 2.0, 84);
    else impostaV(aVista, 1.9, 1.8, 5.2, -2.4, 1.55, 1.8, 82);
    base.pos.copy(aVista.pos); base.mira.copy(aVista.mira);
    tVista = 0; durVista = 1.2;
  }

  // Giochi dei bambini prima dell'arrivo del maestro.
  function giocano(t, calmi) {
    bimbi.forEach((p, i) => {
      if (p.fuga) return;
      const r = p.radice;
      if (p.tipo === 'corre') {
        const a = t * 1.5 * (calmi ? 0.5 : 1) + p.fase;
        r.position.set(1.4 + Math.cos(a) * 2.1, 0, -1.5 + Math.sin(a) * 1.8);
        r.rotation.y = Math.atan2(Math.sin(a), -Math.cos(a));       // guarda nel verso della corsa
        posaCorsa(p, t * 9 + p.fase, 0.75);
        p.braccia[1].spalla.rotation.x = -2.2;      // un braccio alzato: sta giocando a prendersi
      } else if (p.tipo === 'salta') {
        const y = Math.abs(Math.sin(t * 5 + p.fase)) * 0.38;
        r.position.y = y;
        for (const b of p.braccia) b.spalla.rotation.z = (b === p.braccia[0] ? -1 : 1) * (0.5 + Math.abs(Math.sin(t * 5 + p.fase)) * 2.0);
        p.testa.rotation.y = Math.sin(t * 1.3 + p.fase) * 0.5;
      } else if (p.tipo === 'siede') {
        p.corpo.position.y = -0.5 + Math.sin(t * 3 + p.fase) * 0.012;
        p.braccia[0].spalla.rotation.x = -1.2 + Math.sin(t * 8 + p.fase) * 0.15;   // disegna
        p.braccia[0].gomito.rotation.x = -0.4;
        p.testa.rotation.x = -0.35;
      } else {
        p.braccia[0].spalla.rotation.x = -1.6 + Math.sin(t * 6) * 0.3;
        p.braccia[1].spalla.rotation.x = -1.4 - Math.sin(t * 6) * 0.3;
        p.corpo.position.y = Math.abs(Math.sin(t * 4)) * 0.04;
        p.testa.rotation.y = Math.sin(t * 1.7) * 0.4;
      }
    });
  }

  A.aggiorna = function (dt) {
    A.t += dt;
    const t = A.t;
    roberto.aggiornaVolto(dt);

    if (A.stato === 'scelta' || A.stato === 'attesa') {
      A.residuo = Math.max(0, TEMPO_SCELTA - t);
      if (A.stato === 'scelta') mescola(Math.min(1, t / TEMPO_SCELTA));
      giocano(t, false);
      // Il maestro entra e raggiunge Roberto con passo lento e pesante.
      tCammino = Math.max(0, t - 0.5);
      const L = lunghezza(percMaestro);
      puntoSu(percMaestro, Math.min(L, tCammino * 1.9), tmp, dir);
      maestro.radice.position.copy(tmp);
      if (tCammino * 1.9 < L) {
        guarda(maestro, dir, dt * 8);
        posaCorsa(maestro, t * 5.2, 0.32);
        maestro.corpo.position.y = Math.abs(Math.sin(t * 5.2)) * 0.03;
      } else {
        if (!arrivato) { arrivato = true; posaInPiedi(maestro); }
        guarda(maestro, verso(maestro.radice.position, roberto.radice.position), dt * 8);
        // Braccia conserte (dietro la schiena): le mani si alzano un po' davanti.
        for (const b of maestro.braccia) { b.spalla.rotation.set(-0.7, 0, 0); b.gomito.rotation.set(-1.4, 0, 0); }
      }
      // Roberto: in piedi, nervoso, guarda il maestro che arriva.
      posaInPiedi(roberto);
      roberto.corpo.position.y = Math.sin(t * 2.4) * 0.012;
      guarda(roberto, verso(roberto.radice.position, maestro.radice.position), dt * 4);
      roberto.espressione(arrivato || t > 2.2 ? 'sorpresa' : 'sorriso');
      if (A.stato === 'scelta' && A.residuo <= 0) A.scegli('saluto');         // indecisione: sbagliato
      if (A.stato === 'attesa' && arrivato) inizioScena();
      if (A.stato === 'scelta' && t > 4.5) fGioco.visible = false;
    } else if (A.stato === 'scena') {
      tScena += dt;
      tVista += dt;
      if (A.esito === 'piango') scenaPianto(tScena, dt); else scenaSaluto(tScena, dt);
      mescola(Math.min(1, tVista / durVista));
      aggiornaFughe(tScena, dt);
      finale(tScena);
    }

    camera.fov = vista.fov;
    camera.position.copy(vista.pos);
    if (demonio.visible) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06));
    camera.lookAt(vista.mira);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  };

  const sopra = (p, bolla, extra = 0.45) => { p.radice.getWorldPosition(bolla.position); bolla.position.y += 2.35 * p.radice.scale.x + extra; };

  // --- Scena: piango (giusto) --------------------------------------------------------------------
  function scenaPianto(t, dt) {
    const sc = roberto.radice.scale.x;
    roberto.espressione(t < 0.35 ? 'triste' : 'piange');
    roberto.testa.rotation.set(-0.25, 0, Math.sin(t * 24) * 0.08);
    for (const [i, b] of roberto.braccia.entries()) {
      b.spalla.rotation.set(-2.35 + Math.sin(t * 10 + i * 2) * 0.12, 0, (i ? 1 : -1) * 0.3);
      b.gomito.rotation.set(-1.9, 0, 0);
    }
    roberto.corpo.rotation.x = Math.sin(t * 24) * 0.04;
    // Fumetto di pianto che pulsa.
    fPianto.visible = t > 0.35 && t < 4.6;
    sopra(roberto, fPianto);
    const pulsa = 1 + Math.sin(t * 14) * 0.08;
    fPianto.scale.set(1.7 * pulsa, 0.85 * pulsa, 1);
    // Lacrime che schizzano dagli occhi.
    lacrime.forEach((l, i) => {
      const tt = (t * 2.6 + i / lacrime.length) % 1;
      if (t < 0.35) { l.visible = false; return; }
      l.visible = true;
      const lato = i % 2 ? 1 : -1;
      roberto.testa.getWorldPosition(l.position);
      // lato = in avanti/sinistra rispetto a Roberto (che guarda +x)
      l.position.x += 0.1 * sc + tt * 0.25 * sc;
      l.position.z += lato * 0.1 * sc * (1 + tt * 2);
      l.position.y += 0.02 - tt * tt * 0.9 * sc + 0.1 * sc;
    });
    // Il maestro si tappa le orecchie, scuote la testa, arretra e dice "Basta!".
    const kb = THREE.MathUtils.smoothstep(t, 0.5, 1.0);
    for (const [i, b] of maestro.braccia.entries()) {
      b.spalla.rotation.set(-2.6 * kb, 0, (i ? 1 : -1) * 0.45 * kb);
      b.gomito.rotation.set(-1.7 * kb, 0, 0);
    }
    maestro.testa.rotation.set(0, Math.sin(t * 9) * 0.25 * kb, 0);
    maestro.corpo.rotation.x = -0.1 * kb;
    fBasta.visible = t > 1.4 && t < 3.2 && !maestro.fuga;
    sopra(maestro, fBasta);
    // I bambini si tappano le orecchie, urlano e corrono qua e là.
    bimbi.forEach((p, i) => {
      if (p.fuga) return;
      const ks = THREE.MathUtils.smoothstep(t, 0.4 + i * 0.1, 0.9 + i * 0.1);
      if (p.tipo === 'corre') {
        const a = t * 3.2 + p.fase;       // corrono più forte e senza meta
        p.radice.position.set(1.4 + Math.cos(a) * 2.3, 0, -1.5 + Math.sin(a * 1.3) * 2.0);
        p.radice.rotation.y = Math.atan2(Math.sin(a), -Math.cos(a));
        posaCorsa(p, t * 12 + p.fase, 0.9);
      }
      for (const b of p.braccia) {
        if (ks > 0.5) { b.spalla.rotation.set(-2.5, 0, (b === p.braccia[0] ? -1 : 1) * 0.35); b.gomito.rotation.set(-1.8, 0, 0); }
      }
      if (p.tipo === 'salta') p.radice.position.y = Math.abs(Math.sin(t * 8 + p.fase)) * 0.45;
      if (p.tipo === 'siede') p.corpo.rotation.x = Math.sin(t * 20 + p.fase) * 0.05;
      const f = fBimbi[i];
      f.visible = t > 0.8 + i * 0.18 && t < 3.6 + i * 0.1 && !p.fuga && ((t * 2.2 + i * 0.4) % 1.1) < 0.8;
      sopra(p, f);
    });
    // Camera: un lento avvicinamento al viso di Roberto.
    if (!tagliato) aVista.pos.lerpVectors(base.pos, base.mira, 0.3 * Math.min(1, t / 4.5));
  }

  // --- Scena: saluto (sbagliato) -----------------------------------------------------------------
  function scenaSaluto(t, dt) {
    const sc = roberto.radice.scale.x;
    const trasf = t > 1.9;
    // Roberto saluta con la mano, poi resta di sasso.
    if (!trasf) {
      roberto.espressione('gioia');
      roberto.braccia[1].spalla.rotation.set(0, 0, 0.08 + 2.6 * THREE.MathUtils.smoothstep(t, 0.1, 0.5));
      roberto.braccia[1].gomito.rotation.set(0, 0, Math.sin(t * 10) * 0.5);
    } else {
      roberto.espressione('sorpresa');
      const kk = THREE.MathUtils.smoothstep(t, 1.9, 2.3);
      roberto.braccia[1].spalla.rotation.set(0, 0, 0.08 + 2.6 * (1 - kk));
      roberto.braccia[1].gomito.rotation.set(0, 0, 0);
      for (const b of roberto.braccia) { b.spalla.rotation.x = -0.9 * kk * (b === roberto.braccia[1] ? 0 : 1); }
      roberto.testa.rotation.set(0.25 * kk, 0, 0);
      roberto.corpo.rotation.x = -0.18 * kk;
    }
    fSaluto.visible = t > 0.3 && t < 1.9;
    sopra(roberto, fSaluto);
    // Il maestro: immobile e minaccioso, trema sempre di più, poi il lampo e il demonio.
    maestro.radice.visible = !trasf;
    if (!trasf) {
      const tr = THREE.MathUtils.smoothstep(t, 0.7, 1.9);
      maestro.corpo.position.x = Math.sin(t * 55) * 0.03 * tr;
      maestro.radice.scale.setScalar(SCALA_MAESTRO * (1 + tr * 0.25));
      maestro.testa.rotation.z = Math.sin(t * 40) * 0.05 * tr;
      // I pugni si stringono e le braccia si sollevano: la trasformazione comincia dalle braccia.
      for (const [i, b] of maestro.braccia.entries()) {
        const lato = i ? 1 : -1;
        b.spalla.rotation.set(tr * 0.5, 0, lato * tr * 0.9 + Math.sin(t * 50 + i) * 0.04 * tr);
        b.gomito.rotation.set(tr * 1.1, 0, 0);
      }
    }
    demonio.visible = trasf;
    if (trasf) {
      const td = t - 1.9;
      const pop = Math.min(1, td / 0.35);
      // Ruggisce verso di noi; quando Roberto scappa, gli va dietro verso la porta.
      const insegue = roberto.fuga && t > roberto.fugaA + 0.4;
      if (insegue) {
        verso(maestro.radice.position, SOGLIA);
        const resta = maestro.radice.position.distanceTo(SOGLIA) - 1.3;
        if (resta > 0) maestro.radice.position.addScaledVector(dir, Math.min(resta, dt * 1.7));
      }
      demonio.position.set(maestro.radice.position.x, demonio.position.y, maestro.radice.position.z);
      const verGuardo = insegue
        ? Math.atan2(-(SOGLIA.x - demonio.position.x), -(SOGLIA.z - demonio.position.z))
        : Math.atan2(-(camera.position.x - demonio.position.x), -(camera.position.z - demonio.position.z));
      let dr = verGuardo - demonio.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      demonio.rotation.y += insegue ? dr * Math.min(1, dt * 4) : dr;
      demonio.scale.setScalar(0.9 * (0.2 + 0.8 * (1 + 2.7 * Math.pow(pop - 1, 3) + 1.7 * Math.pow(pop - 1, 2))));
      demonio.userData.anima(t, Math.min(1, 0.4 + td), THREE.MathUtils.smoothstep(td, 0.05, 0.7), insegue);
      demonio.userData.luce.intensity = 4 * Math.min(1, td * 3) * (0.85 + 0.15 * Math.sin(t * 25));
      // La stanza si fa rossa e buia.
      const rs = Math.min(1, td * 2);
      scena.background.copy(CIELO).lerp(new THREE.Color(0x4A0D08), rs);
      scena.fog.color.copy(scena.background);
      emisfero.intensity = 1.7 - 1.0 * rs; sole.intensity = 1.3 - 0.9 * rs;
      lampo.material.opacity = Math.max(0, 1 - td / 0.5);
      fRaah.visible = td > 0.2 && ((td - 0.2) % 2.2) < 1.6;
      sopra(maestro, fRaah, 1.6);
      fRaah.scale.set(2.4 * (1 + Math.sin(t * 20) * 0.07), 1.2 * (1 + Math.sin(t * 20) * 0.07), 1);
    } else {
      lampo.material.opacity = 0;
    }
    // I bambini: all'inizio guardano, poi urlano e scappano (vedi aggiornaFughe).
    bimbi.forEach((p, i) => {
      if (p.fuga) return;
      const f = fBimbi[i];
      const ks = THREE.MathUtils.smoothstep(t, 1.95, 2.3);
      if (p.tipo === 'corre') { p.radice.rotation.y += dt * 4; posaInPiedi(p); }
      for (const b of p.braccia) if (ks > 0.2) b.spalla.rotation.set(-2.3, 0, (b === p.braccia[0] ? -1 : 1) * 0.35);
      f.visible = ks > 0.3 && !p.fuga;
      sopra(p, f);
    });
    if (!tagliato) aVista.pos.lerpVectors(base.pos, base.mira, 0.12 * Math.min(1, t / 5));
  }

  // --- Fughe dalla porta ------------------------------------------------------------------------
  function avviaFuga(p, ritardo = 0) {
    const da = p.radice.position.clone(); da.y = 0;
    const j = bimbi.indexOf(p);
    const x = SOGLIA.x + ((j < 0 ? 3 : j) % 3 - 1) * 0.35;
    p.fuga = { pt: [da, new THREE.Vector3(da.x - 0.6, 0, da.z), new THREE.Vector3(x, 0, SOGLIA.z + (da.z > 1 ? 0.3 : 0)), new THREE.Vector3(x, 0, PORTA.z + 1.0)], s: 0, ritardo, t: 0 };
    posaInPiedi(p); azzeraBraccia(p);
    p.corpo.rotation.set(0, 0, 0); p.corpo.position.set(0, 0, 0); p.testa.rotation.set(0, 0, 0);
    p.radice.position.y = 0;
  }

  function aggiornaFughe(t, dt) {
    for (const p of [...bimbi, maestro, roberto]) {
      if (p === maestro && A.esito !== 'piango') continue;
      if (!p.fuga && t >= p.fugaA) { avviaFuga(p); }
      if (!p.fuga) continue;
      const f = p.fuga;
      f.t += dt;
      const L = lunghezza(f.pt);
      f.s = Math.min(L, f.t * (p === maestro ? 2.6 : 4.2));
      puntoSu(f.pt, f.s, tmp, dir);
      p.radice.position.copy(tmp);
      if (f.s < L) {
        guarda(p, dir, dt * 12);
        posaCorsa(p, t * 11 + p.fase, p === maestro ? 0.4 : 0.8);
        if (p !== maestro) { for (const b of p.braccia) { b.spalla.rotation.z = (b === p.braccia[0] ? -1 : 1) * 0.8; } }
      } else { p.radice.visible = false; }
    }
  }

  // Stacco sull'inquadratura finale e lento avvicinamento alla porta. La scena finisce poco dopo che
  // Roberto è uscito: la classe resta vuota (o con il demonio) mentre compare il cartello dell'esito.
  function finale(t) {
    if (!tagliato && t >= tTaglio) {
      tagliato = true;
      for (const v of [vista, daVista, aVista]) { v.pos.copy(FINALE.pos); v.mira.copy(FINALE.mira); v.fov = FINALE.fov; }
      tVista = durVista = 1;
    }
    if (tagliato) {
      const k = THREE.MathUtils.smoothstep(t, tTaglio, tTaglio + 5);
      aVista.pos.lerpVectors(FINALE.pos, FINALE.mira, 0.18 * k);
      aVista.mira.copy(FINALE.mira); aVista.fov = FINALE.fov;
      daVista.pos.copy(aVista.pos); daVista.mira.copy(aVista.mira); daVista.fov = aVista.fov;
    }
    const L = roberto.fuga ? lunghezza(roberto.fuga.pt) : 1;
    if (tUscito < 0 && roberto.fuga && roberto.fuga.s >= L - 0.01) { tUscito = t; A.uscito = true; }
    if ((tUscito >= 0 && t > tUscito + 1.9) || t > 12) A.stato = 'fine';
  }

  A.ridimensiona = function (aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); };
  return A;
}
