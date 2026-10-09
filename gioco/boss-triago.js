// L'ultimo ultimo boss: il TRIAGo, un robot gigantesco e spaventoso (il TIAGo del laboratorio, in versione
// mostro). "Ingegnere VS TRIAGo": il robot parte nella posa della foto, di fronte, e comincia a sollevare
// minacciosamente un braccio per attaccare... ma a metà i freni di emergenza scattano, si pianta lì e si
// affloscia miseramente. Il combattimento finisce senza che sferri nemmeno un attacco.
//
// Il robot sta a bordo strada, davanti a chi corre; Roberto frena e si ferma a una trentina di metri,
// la camera si abbassa e lo guarda dal basso. Finita la scena si riparte verso il traguardo.

import * as THREE from './lib/three.module.min.js';
import { blocco, cilindro, sfera, scritta, tela, posaFerma, azzeraPosa } from './modelli.js';
import { unisci } from './modelli-universita.js';

const ss = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;

const SCALA = 9;                  // il robot vero è alto ~1,8 m: qui ~16 m
const X_ROBOT = 8.2;              // a bordo strada, a destra
const IMBARDATA = -0.3;           // un po' girato verso la strada
export const D_ROBOT = 130;       // distanza del robot dall'inizio della sezione
const D_AVVIO = 52;               // da quanti metri dal robot Roberto comincia a frenare
const T_FRENA = 1.4;
// Tempi della scena (secondi): attesa, il braccio sale, i freni di emergenza, il robot crolla, fine.
const T = { alza: 1.8, ambra: 3.0, rosso: 3.5, stop: 4.3, crolla: 5.6, fine: 9.2 };

const NERO = 0x17181B, NERO_CH = 0x2C2E33, BIANCO = 0xF6F6F3, GRIGIO = 0xB8BCC2;

// ---- il robot ---------------------------------------------------------------------------------
function costruisciRobot() {
  const radice = new THREE.Group();
  const fisso = new THREE.Group();          // le parti ferme si fondono in un'unica mesh
  // Ruote mecanum agli angoli della base.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const r = new THREE.Group();
    r.add(cilindro(0.11, 0.13, 0x4E5258, 0, -0.065, 0));
    r.add(cilindro(0.06, 0.145, 0xA2A6AC, 0, -0.0725, 0));
    r.rotation.z = Math.PI / 2;
    r.position.set(sx * 0.3, 0.11, sz * 0.2);
    fisso.add(r);
  }
  // Base bianca con la targhetta PAL, il lettore giallo davanti e il piano nero sopra.
  fisso.add(blocco(0.6, 0.26, 0.58, BIANCO, 0, 0.06));
  fisso.add(blocco(0.62, 0.1, 0.6, BIANCO, 0, 0.32));
  const targa = scritta('PAL', 0.2, 0.07, 0xF6F6F3, 0x1C1D2B);
  targa.position.set(0, 0.28, 0.302);
  fisso.add(targa);
  fisso.add(blocco(0.14, 0.07, 0.01, NERO_CH, 0, 0.125, 0.292));
  fisso.add(blocco(0.1, 0.035, 0.012, 0xF2C300, 0, 0.142, 0.296));
  fisso.add(blocco(0.6, 0.05, 0.56, NERO, 0, 0.42));
  // Colonna nera con le feritoie di raffreddamento.
  fisso.add(blocco(0.4, 0.3, 0.3, NERO, 0, 0.47));
  for (let i = 0; i < 6; i++) fisso.add(blocco(0.42, 0.012, 0.31, NERO_CH, 0, 0.5 + i * 0.04));
  fisso.add(blocco(0.44, 0.13, 0.32, NERO, 0, 0.77));
  // Il busto bianco con "PAL" e le due casse, le spalle nere.
  fisso.add(blocco(0.4, 0.36, 0.2, BIANCO, 0, 0.9));
  const pal = scritta('PAL', 0.14, 0.05, 0xF6F6F3, 0x1C1D2B);
  pal.position.set(0, 1.18, 0.102);
  fisso.add(pal);
  for (const sx of [-1, 1]) fisso.add(blocco(0.05, 0.05, 0.006, GRIGIO, sx * 0.15, 1.0, 0.102));
  fisso.add(blocco(0.5, 0.17, 0.25, NERO, 0, 1.22));
  fisso.add(cilindro(0.09, 0.1, NERO, 0, 1.38));
  const corpo = unisci(fisso);
  corpo.traverse(o => { if (o.isMesh) o.castShadow = false; });
  radice.add(corpo);

  // L'anello blu sul fianco della colonna (cambia colore) e il suo alone.
  const matAnello = new THREE.MeshBasicMaterial({ color: 0x3AA8FF });
  const anello = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 28), matAnello);
  anello.position.set(0, 0.835, 0.163);
  radice.add(anello);
  const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAlone(), color: 0x3AA8FF, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  alone.scale.set(0.7, 0.7, 1);
  alone.position.set(0, 0.835, 0.25);
  radice.add(alone);

  // Il collo: un lungo braccio che sale dalle spalle con la testa-telecamera in cima.
  const collo = new THREE.Group();
  collo.position.set(0, 1.42, 0);
  collo.add(cilindro(0.05, 0.2, NERO, 0, 0, 0));
  const giunto = new THREE.Group();
  giunto.position.set(0, 0.2, 0); giunto.rotation.z = Math.PI / 2;
  giunto.add(cilindro(0.08, 0.14, NERO_CH, 0, -0.07, 0));
  collo.add(giunto);
  const collo2 = new THREE.Group();
  collo2.position.set(0, 0.2, 0);
  collo2.add(cilindro(0.045, 0.14, NERO, 0, 0, 0));
  collo.add(collo2);
  const testa = new THREE.Group();
  testa.position.set(0, 0.14, 0);
  testa.add(sfera(0.065, NERO_CH, 0, 0.02, 0));
  testa.add(blocco(0.24, 0.075, 0.08, NERO, 0, 0.045, 0));
  testa.add(blocco(0.22, 0.035, 0.012, GRIGIO, 0, 0.065, 0.042));
  for (const x of [-0.06, 0.0, 0.06]) testa.add(sfera(0.014, 0x2E4E7A, x, 0.082, 0.045));
  collo2.add(testa);
  radice.add(collo);

  // Le braccia: spalla, gomito, polso e pinza con due dita.
  const braccia = [-1, 1].map(sx => {
    const spalla = new THREE.Group();
    spalla.position.set(sx * 0.31, 1.3, 0);
    spalla.add(sfera(0.1, NERO, 0, 0, 0));
    spalla.add(cilindro(0.06, 0.27, NERO, 0, -0.27, 0));
    spalla.add(cilindro(0.07, 0.07, NERO_CH, 0, -0.16, 0));
    const gomito = new THREE.Group();
    gomito.position.y = -0.27;
    gomito.add(sfera(0.08, NERO, 0, 0, 0));
    gomito.add(cilindro(0.055, 0.28, NERO, 0, -0.28, 0));
    spalla.add(gomito);
    const polso = new THREE.Group();
    polso.position.y = -0.28;
    polso.add(sfera(0.06, NERO, 0, 0, 0));
    polso.add(blocco(0.1, 0.09, 0.07, NERO_CH, 0, -0.12, 0));
    gomito.add(polso);
    const dita = [-1, 1].map(s => {
      const d = new THREE.Group();
      d.position.set(s * 0.04, -0.2, 0);
      d.add(blocco(0.03, 0.1, 0.045, NERO, 0, -0.1, 0));
      d.add(blocco(0.012, 0.055, 0.035, GRIGIO, -s * 0.0125, -0.09, 0));
      polso.add(d);
      return d;
    });
    radice.add(spalla);
    return { spalla, gomito, polso, dita, sx };
  });
  radice.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return { radice, anello, matAnello, alone, collo, collo2, testa, braccia };
}

let texA = null;
function texAlone() {
  texA ??= tela(128, 128, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  return texA;
}

// ctx: { sez, daLocale(d, lx, ly, lz, out), psi(d), vs() }
export function creaBossTriago(scena, ctx) {
  const { sez } = ctx;
  const dRobot = sez.inizio + D_ROBOT;
  const S = { fase: 'fuori', t: 0, tF: 0, prossimoFumo: 0 };
  const V = new THREE.Vector3();

  const gruppo = new THREE.Group();
  gruppo.visible = false;
  gruppo.scale.setScalar(SCALA);
  scena.add(gruppo);
  const R = costruisciRobot();
  gruppo.add(R.radice);
  ctx.daLocale(dRobot, X_ROBOT, 0, 0, gruppo.position);
  gruppo.rotation.y = -ctx.psi(dRobot) + IMBARDATA;
  const braccioMinaccia = R.braccia[0];            // quello verso la strada

  // Il cartello dei freni di emergenza.
  const cartello = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tela(256, 96, (g, W, H) => {
      g.fillStyle = '#D8261C';
      g.beginPath(); if (g.roundRect) g.roundRect(6, 6, W - 12, H - 12, 22); else g.rect(6, 6, W - 12, H - 12); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 54px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('E-STOP', W / 2, H / 2 + 3, W - 40);
    }), transparent: true, depthWrite: false, fog: false,
  }));
  cartello.scale.set(5.4, 2.0, 1);
  cartello.visible = false;
  scena.add(cartello);

  // Sbuffi di fumo che escono dai giunti quando il robot si pianta.
  const fumi = Array.from({ length: 16 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAlone(), color: 0x8D9096, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false;
    scena.add(s);
    return { s, t: 9, vx: 0, vy: 0, vz: 0, dim: 2 };
  });
  function sbuffa(origine) {
    const f = fumi.find(x => x.t >= 1.7);
    if (!f) return;
    origine.getWorldPosition(V);
    f.s.position.copy(V);
    f.t = 0; f.vx = (Math.random() - 0.5) * 1.2; f.vy = 1.2 + Math.random() * 1.1; f.vz = (Math.random() - 0.5) * 1.2;
    f.dim = 1.6 + Math.random() * 1.6;
  }

  // ---- la posa del robot al tempo t della scena --------------------------------------------------
  function posaRobot(t, orologio) {
    const { radice, collo, collo2, testa, braccia, matAnello, alone, anello } = R;
    // Riposo (come nella foto): braccia lungo i fianchi, gomiti in fuori, pinze in basso davanti.
    for (const b of braccia) {
      b.spalla.rotation.set(0, 0, b.sx * 0.62);
      b.gomito.rotation.set(-0.45, 0, -b.sx * 0.95);
      b.dita[0].rotation.z = -0.05; b.dita[1].rotation.z = 0.05;
    }
    // Il braccio sale; ai freni si pianta dov'è (73% della corsa), trema, poi cede.
    const b = braccioMinaccia, sx = b.sx;
    const k = ss(Math.min(t, T.stop), T.alza, 5.6);
    const dopo = Math.max(0, t - T.stop);
    const tremito = Math.sin(t * 55) * 0.018 * Math.exp(-dopo * 2.2);
    const cede = ss(t, T.crolla, T.crolla + 2.6);
    const rimbalzo = Math.sin(cede * Math.PI * 2.2) * 0.05 * (1 - cede);
    b.spalla.rotation.z = sx * (lerp(0.62, 2.55, k) + tremito - 1.15 * cede + rimbalzo);
    b.gomito.rotation.z = -sx * lerp(0.95, 0.15, k) - sx * 1.1 * cede;
    b.gomito.rotation.x = lerp(-0.45, -0.2, k);
    const apri = ss(t, 2.7, T.stop) * (1 - cede);
    b.dita[0].rotation.z = -lerp(0.05, 0.75, apri); b.dita[1].rotation.z = lerp(0.05, 0.75, apri);
    // Collo e testa: la telecamera scruta, poi segue Roberto, poi si china sconsolata.
    const scruta = Math.sin(orologio * 1.3);
    const sguardo = 1 - ss(t, T.alza - 0.4, T.alza + 0.6);
    const piega = ss(t, 5.2, 7.8);
    collo.rotation.set(0.55 * piega, 0, 0.1 * scruta * sguardo);
    collo2.rotation.set(0.5 * piega, 0, -0.08 * scruta * sguardo);
    testa.rotation.set(0.6 * piega, 0.5 * Math.sin(orologio * 1.7) * sguardo + 0.05 * Math.sin(t * 40) * Math.exp(-dopo * 3) * (dopo > 0 ? 1 : 0), 0);
    // Il corpo trema per il blocco e poi si accascia un po' in avanti.
    radice.rotation.set(0.05 * ss(t, T.crolla, T.crolla + 2.2), 0, dopo > 0 ? Math.sin(t * 60) * 0.012 * Math.exp(-dopo * 4) : 0);

    // L'anello: blu che pulsa, ambra, rosso fisso, rosso che sfarfalla, spento.
    let col = 0x3AA8FF, lum = 0.75 + 0.25 * Math.sin(orologio * 4);
    if (t >= T.rosso && t < T.stop) { col = 0xFF2D2D; lum = 0.7 + 0.3 * Math.sin(t * 22); }
    else if (t >= T.ambra && t < T.rosso) { col = 0xFFA630; lum = 0.8 + 0.2 * Math.sin(t * 12); }
    else if (t >= T.stop && t < 6.4) { col = 0xFF2D2D; lum = Math.sin(t * 30) > 0 ? 1 : 0.05; }
    else if (t >= 6.4) {
      // Spento, con un ultimo debole battito ogni tanto (il lampeggio dell'arresto).
      col = 0xFF2D2D;
      lum = t < T.fine ? (Math.abs(t - 7.5) < 0.12 ? 0.8 : 0.03) : ((orologio % 1.8) < 0.14 ? 0.8 : 0.03);
    }
    matAnello.color.setHex(col).multiplyScalar(Math.max(0.12, lum));
    alone.material.color.setHex(col);
    alone.material.opacity = lum;
    alone.visible = lum > 0.1;
    anello.visible = true;
  }

  // ---- ciclo ---------------------------------------------------------------------------------------
  Object.defineProperty(S, 'attivo', { get: () => S.fase === 'frena' || S.fase === 'scena' });
  S.fattore = () => (S.fase === 'frena' ? 1 - ss(S.tF, 0, T_FRENA) : 1);
  Object.defineProperty(S, 'pronto', { get: () => S.fase === 'frena' && S.tF >= T_FRENA });
  Object.defineProperty(S, 'finita', { get: () => S.fase === 'scena' && S.t >= T.fine });
  S.avvia = () => { S.fase = 'scena'; S.t = 0; S.prossimoFumo = T.stop; };
  S.concludi = () => { S.fase = 'fatto'; };
  S.reset = () => {
    Object.assign(S, { fase: 'fuori', t: 0, tF: 0 });
    cartello.visible = false;
    for (const f of fumi) { f.t = 9; f.s.visible = false; }
  };
  S.chiudi = () => { S.reset(); S.fase = 'fatto'; };
  S.dentro = pos => pos >= sez.inizio && pos < sez.fine;

  S.aggiorna = (dt, G) => {
    const pos = G.pos;
    const inGioco = G.stato === 'gioco', inScena = G.stato === 'triago';
    if (pos < sez.inizio - 90 && S.fase !== 'fuori' && S.fase !== 'fatto') S.reset();
    gruppo.visible = pos > dRobot - 230 && pos < dRobot + 60;
    if (!gruppo.visible) return;
    if (S.fase === 'fuori' && inGioco && pos >= dRobot - D_AVVIO && pos < dRobot - 15) {
      S.fase = 'frena'; S.tF = 0;
      ctx.vs?.();
    }
    if (S.fase === 'frena' && inGioco) S.tF += dt;
    if (S.fase === 'scena' && inScena) S.t += dt;
    const orologio = performance.now() / 1000;
    posaRobot(S.fase === 'fatto' ? 99 : S.fase === 'scena' ? S.t : 0, orologio);

    // Fumo dai giunti dopo lo stop, e il cartello E-STOP.
    if (S.fase === 'scena' && S.t >= S.prossimoFumo && S.t < T.stop + 4.2) {
      S.prossimoFumo += 0.2;
      sbuffa([braccioMinaccia.polso, braccioMinaccia.gomito, R.testa, R.anello][Math.floor(Math.random() * 4)]);
    }
    for (const f of fumi) {
      if (f.t >= 1.7) { f.s.visible = false; continue; }
      f.t += dt;
      f.s.visible = true;
      f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt;
      const e = f.t / 1.7;
      f.s.scale.setScalar(f.dim * (0.5 + 1.6 * e));
      f.s.material.opacity = 0.65 * (1 - e) * Math.min(1, f.t * 6);
    }
    cartello.visible = S.fase === 'scena' && S.t > T.stop + 0.15 && S.t < T.stop + 2.6;
    if (cartello.visible) {
      gruppo.updateMatrixWorld(true);
      R.radice.localToWorld(V.set(0, 1.95, 0.15));
      cartello.position.copy(V);
    }
  };

  // ---- Roberto e la camera -------------------------------------------------------------------------
  // Roberto: braccia in alto dalla paura mentre il braccio sale; ai freni si abbassano, scrolla le spalle e sorride.
  S.posaRoberto = (Rob, G) => {
    const t = S.t;
    azzeraPosa(Rob);
    posaFerma(Rob, t, 0);
    const paura = ss(t, T.alza, T.alza + 0.7) * (1 - ss(t, T.stop + 0.1, T.stop + 0.8));
    Rob.braccia[0].spalla.rotation.z = -0.08 - 2.0 * paura;
    Rob.braccia[1].spalla.rotation.z = 0.08 + 2.0 * paura;
    if (paura > 0.3) for (const { gomito } of Rob.braccia) gomito.rotation.x = -0.5 * paura;
    Rob.espressione(t < 0.5 ? 'neutro' : t < T.stop ? 'sorpresa' : t < T.stop + 1.2 ? 'sforzo' : t < T.stop + 3.2 ? 'sorriso' : 'gioia');
    Rob.corpo.rotation.x = -0.12 * paura;
  };

  const camPos = new THREE.Vector3(), camMira = new THREE.Vector3();
  S.camera = (cam, G) => {
    if (G.stato !== 'triago') return;
    const t = S.t, k = ss(t, 0, 1.3);
    // Bassa, dietro Roberto a sinistra, rivolta al petto del robot.
    ctx.daLocale(G.pos, -2.0, 1.5, 4.2, camPos);
    ctx.daLocale(dRobot, X_ROBOT - 0.6, 6.5 + 1.2 * ss(t, T.stop, T.fine), 0, camMira);
    const scossa = Math.exp(-Math.max(0, t - T.stop) * 5) * (t >= T.stop ? 0.22 : 0);
    camPos.x += Math.sin(t * 70) * scossa; camPos.y += Math.sin(t * 63 + 1) * scossa;
    cam.position.lerp(camPos, k);
    cam.getWorldDirection(V).multiplyScalar(10).add(cam.position);
    V.lerp(camMira, k);
    cam.lookAt(V);
  };

  return S;
}
