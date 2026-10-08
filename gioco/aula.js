// La scena in classe (5ª H). Il gioco si ferma, la camera entra in aula e il giocatore sceglie
// dove sedersi: in prima fila (sbagliato, penalità sul tempo) o in ultima, accanto al banco dei due amici
// (il pelato alto e secco col casco sul banco e la ragazza castana con la felpa viola).
// Le animazioni sono volutamente semplici e chiare. Alla fine tutti escono e si torna alla corsa.

import * as THREE from './lib/three.module.min.js';
import {
  materiale, blocco, scritta, tela, esa, creaPersona, posaCorsa, posaSeduto, posaInPiedi, CUBO,
} from './modelli.js';
import { creaCompagnaFelpa, creaCompagnoPelato, creaCasco } from './modelli-liceo.js';
import { TEMPO_SCELTA } from './mondi.js';

const LEGNO = 0xC89B5E, METALLO = 0x3B4A5A;
const SCALA_PERSONA = 0.8;
const ALTEZZA_SEDUTO = 0.3;           // quanto scende il busto da seduto, in unità del modello
const PORTA = new THREE.Vector3(-4.5, 0, 5.1);

// File (x) e colonne (z) dei banchi. Prima fila = più vicina alla lavagna.
const FILE_X = [2.6, 0.7, -1.2, -3.1];
const COL_Z = [-2.5, 0.0, 2.5];
// Ultima fila: il banco da due dei due amici (posti 0 e 1) e, accanto, il banco singolo di Roberto (posto 2).
const ULTIMA_Z = [-1.33, -0.37, 1.1];
const sedia = (f, c) => new THREE.Vector3(FILE_X[f] - 0.7, 0, f === 3 ? ULTIMA_Z[c] : COL_Z[c]);

// `largo` allarga il fumetto (per le frasi lunghe) senza schiacciare il testo.
export function fumetto(testo, colore = '#ffffff', inchiostro = '#1C1D2B', larghezza = 1.1, largo = 1) {
  const tex = tela(Math.round(256 * largo), 128, (g, W, H) => {
    g.fillStyle = colore;
    g.beginPath(); if (g.roundRect) g.roundRect(8, 8, W - 16, H - 36, 26); else g.rect(8, 8, W - 16, H - 36); g.fill();
    g.beginPath(); g.moveTo(W / 2 - 14, H - 30); g.lineTo(W / 2, H - 6); g.lineTo(W / 2 + 14, H - 30); g.fill();
    g.fillStyle = inchiostro; g.font = '800 54px "Bricolage Grotesque", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(testo, W / 2, (H - 28) / 2 + 6, W - 40);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(larghezza, larghezza / (2 * largo), 1);
  s.visible = false;
  return s;
}

// Ultima fila: banco da due posti per gli amici e banco singolo per Roberto, con le loro sedie.
function bancoUltimaFila() {
  const tutto = new THREE.Group();
  const f = 3;
  const zDue = (ULTIMA_Z[0] + ULTIMA_Z[1]) / 2;
  tutto.add(blocco(0.62, 0.05, 2.0, LEGNO, FILE_X[f], 0.7, zDue));
  tutto.add(blocco(0.62, 0.05, 1.2, LEGNO, FILE_X[f], 0.7, ULTIMA_Z[2]));
  for (const z of [zDue - 0.92, zDue + 0.92, ULTIMA_Z[2] - 0.52, ULTIMA_Z[2] + 0.52]) for (const x of [-0.24, 0.24]) tutto.add(blocco(0.05, 0.7, 0.05, METALLO, FILE_X[f] + x, 0, z));
  // Il casco da motorino del pelato, appoggiato sul banco davanti a lui.
  const casco = creaCasco();
  casco.position.set(FILE_X[f] - 0.02, 0.75, ULTIMA_Z[0] - 0.05);
  casco.rotation.y = -Math.PI / 2 - 0.5;
  tutto.add(casco);
  for (let c = 0; c < 3; c++) {
    const s = sedia(f, c);
    const seduta = new THREE.Group();
    seduta.add(blocco(0.46, 0.05, 0.46, 0x4B6A99, 0, 0.42));
    seduta.add(blocco(0.05, 0.5, 0.46, 0x4B6A99, -0.2, 0.42));
    for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) seduta.add(blocco(0.04, 0.42, 0.04, METALLO, x, 0, z));
    seduta.position.set(s.x, 0, s.z);
    tutto.add(seduta);
  }
  return tutto;
}

function banco(f, c) {
  const g = new THREE.Group();
  g.add(blocco(0.62, 0.05, 1.3, LEGNO, 0, 0.7));
  for (const z of [-0.55, 0.55]) for (const x of [-0.24, 0.24]) g.add(blocco(0.05, 0.7, 0.05, METALLO, x, 0, z));
  g.position.set(FILE_X[f], 0, COL_Z[c]);
  const s = sedia(f, c);
  const seduta = new THREE.Group();
  seduta.add(blocco(0.46, 0.05, 0.46, 0x4B6A99, 0, 0.42));
  seduta.add(blocco(0.05, 0.5, 0.46, 0x4B6A99, -0.2, 0.42));
  for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) seduta.add(blocco(0.04, 0.42, 0.04, METALLO, x, 0, z));
  seduta.position.set(s.x, 0, s.z);
  const tutto = new THREE.Group();
  tutto.add(g, seduta);
  return tutto;
}

export function creaAula() {
  const scena = new THREE.Scene();
  scena.background = new THREE.Color(0xCFE3EE);
  scena.fog = new THREE.Fog(0xCFE3EE, 18, 40);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);

  scena.add(new THREE.HemisphereLight(0xffffff, 0x9a9488, 1.7));
  const sole = new THREE.DirectionalLight(0xfff4e0, 1.3);
  sole.position.set(-5, 8, 6);
  scena.add(sole);

  // --- Stanza -------------------------------------------------------------
  const parete = materiale(0xF1ECE0);
  const dado = materiale(0x7FA7A0);
  scena.add(blocco(13, 0.2, 11, 0xCDBFA5, 0, -0.2, 0));                       // pavimento
  scena.add(blocco(13, 3.6, 0.3, parete, 0, 0, -5.4));                        // parete di fondo
  scena.add(blocco(13, 1.2, 0.34, dado, 0, 0, -5.4));
  scena.add(blocco(0.3, 3.6, 11, parete, -6.4, 0, 0));                        // sinistra (finestre)
  scena.add(blocco(0.34, 1.2, 11, dado, -6.4, 0, 0));
  scena.add(blocco(0.3, 3.6, 11, parete, 6.4, 0, 0));                         // destra (lavagna)
  scena.add(blocco(0.34, 1.2, 11, dado, 6.4, 0, 0));
  // Parete d'ingresso con la porta (a sinistra).
  scena.add(blocco(1.0, 3.6, 0.3, parete, -6.0, 0, 5.4));
  scena.add(blocco(10.0, 3.6, 0.3, parete, 1.5, 0, 5.4));
  scena.add(blocco(2.0, 0.8, 0.3, parete, -4.5, 2.8, 5.4));
  scena.add(blocco(2.0, 0.08, 0.3, 0x8A5A34, -4.5, 2.72, 5.4));
  // Finestre luminose.
  for (const z of [-3.2, 0, 3.2]) scena.add(blocco(0.06, 1.6, 1.8, new THREE.MeshBasicMaterial({ color: 0xDDF1FF }), -6.22, 1.2, z));
  // Lavagna e cattedra a destra.
  scena.add(blocco(0.08, 1.4, 4.6, 0x2F5D3A, 6.2, 1.0, -0.8));
  scena.add(blocco(0.1, 0.08, 4.8, 0xA97C50, 6.2, 0.95, -0.8));
  const gesso = scritta('a² + b² = c²', 2.4, 0.5, 0x2F5D3A, 0xffffff);
  gesso.rotation.y = -Math.PI / 2;
  gesso.position.set(6.12, 1.8, -0.8);
  scena.add(gesso);
  scena.add(blocco(0.9, 0.06, 2.2, LEGNO, 4.9, 0.75, -0.8));
  for (const z of [-1.7, 0.1]) for (const x of [4.6, 5.2]) scena.add(blocco(0.06, 0.75, 0.06, METALLO, x, 0, z));
  scena.add(blocco(0.5, 0.05, 0.5, 0x7A5230, 4.1, 0.42, -0.8));
  // Orologio, poster.
  const orologio = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  orologio.position.set(0, 2.9, -5.2);
  scena.add(orologio);
  scena.add(blocco(0.04, 0.2, 0.02, 0x1C1D2B, 0, 2.9, -5.18));
  scena.add(blocco(0.16, 0.03, 0.02, 0x1C1D2B, 0.06, 2.9, -5.18));

  // Banchi: 4 file x 3 colonne.
  for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) scena.add(banco(f, c));
  scena.add(bancoUltimaFila());

  // --- Personaggi ----------------------------------------------------------
  const MAGLIE = [0xC0392B, 0x27AE60, 0xF39C12, 0x8E44AD, 0x16A085, 0xD35400, 0x2980B9, 0xE84393];
  const CAPELLI = [0x2B1D14, 0x5A3A22, 0xC8A25A, 0x15110E, 0x7A4A2A];
  function persona(o, scala = 1) {
    const p = creaPersona(o);
    p.radice.scale.setScalar(SCALA_PERSONA * scala);
    scena.add(p.radice);
    return p;
  }
  function siediti(p, pos) {
    p.radice.position.copy(pos);
    p.radice.rotation.y = -Math.PI / 2;           // guarda verso la lavagna (+x)
    posaSeduto(p, ALTEZZA_SEDUTO);
    p.seduto = true;
  }

  const roberto = persona({ roberto: true, conZaino: true });
  roberto.radice.position.copy(PORTA);

  // I due amici, seduti vicini nell'ultima fila: il pelato alto e secco (col casco sul banco) e la
  // ragazza coi capelli castani e la felpa viola.
  const nuovo = (crea, scala) => { const p = crea(); p.radice.scale.setScalar(SCALA_PERSONA * scala); scena.add(p.radice); return p; };
  const amici = [nuovo(creaCompagnoPelato, 1.13), nuovo(creaCompagnaFelpa, 0.97)];
  amici[0].casella = [3, 0]; amici[1].casella = [3, 1];
  for (const p of amici) siediti(p, sedia(...p.casella));

  const compagni = [];
  // Il banco davanti ai due amici resta vuoto, così nella scena dell'ultima fila si vedono bene.
  [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 2]].forEach(([f, c], i) => {
    const p = persona({ maglia: MAGLIE[i % MAGLIE.length], capelli: CAPELLI[i % CAPELLI.length], pantaloni: i % 2 ? 0x34495E : 0x2A2D3A, conZaino: true, zaino: MAGLIE[(i + 3) % MAGLIE.length] });
    siediti(p, sedia(f, c));
    p.casella = [f, c];
    p.fase = i * 1.7;
    compagni.push(p);
  });
  const lanciatori = compagni.filter(p => p.casella[0] === 1);

  // Fumetti e palline di carta.
  const fRisata = [], fAmici = [];
  const nuovoFumetto = (lista, testo, colore, ink, w) => { const f = fumetto(testo, colore, ink, w); scena.add(f); lista.push(f); return f; };
  for (const p of compagni) nuovoFumetto(fRisata, 'O\'Cià', '#ffffff', '#1C1D2B', 1.25);
  const fAmico1 = nuovoFumetto(fAmici, 'WOOO!', '#FFE27A', '#1C1D2B', 1.1);
  const fAmico2 = nuovoFumetto(fAmici, 'AHAHAH', '#ffffff', '#1C1D2B', 1.25);
  const fRoberto = fumetto('...', '#E8E8E8', '#5B5E72', 0.8); scena.add(fRoberto);
  const fCampana = fumetto('DRIIIN!', '#FF6B6B', '#ffffff', 2.0); fCampana.position.set(0, 3.0, -4.6); scena.add(fCampana);

  const palline = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    m.visible = false;
    scena.add(m);
    palline.push({ m, t: -1, da: new THREE.Vector3(), a: new THREE.Vector3(), tiro: 0.5 });
  }

  // --- Stato ---------------------------------------------------------------
  const A = {
    scena, camera,
    stato: 'inattiva',      // inattiva | scelta | cammina | scena | campanella | esce | fine
    esito: null,            // 'prima' | 'ultima'
    residuo: TEMPO_SCELTA,
    t: 0,
  };
  const vista = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), fov: 55 };
  const daVista = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), fov: 55 };
  const aVista = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), fov: 55 };
  let percorso = [];       // punti per Roberto
  let tPercorso = 0;
  let seduta = new THREE.Vector3();
  let lanci = [];

  function imposta(v, px, py, pz, mx, my, mz, fov) { v.pos.set(px, py, pz); v.mira.set(mx, my, mz); v.fov = fov; }
  function mescolaVista(k) {
    const e = k * k * (3 - 2 * k);
    vista.pos.lerpVectors(daVista.pos, aVista.pos, e);
    vista.mira.lerpVectors(daVista.mira, aVista.mira, e);
    vista.fov = daVista.fov + (aVista.fov - daVista.fov) * e;
  }
  function vaiVerso(px, py, pz, mx, my, mz, fov) {
    daVista.pos.copy(vista.pos); daVista.mira.copy(vista.mira); daVista.fov = vista.fov;
    imposta(aVista, px, py, pz, mx, my, mz, fov);
  }

  A.avvia = function () {
    A.stato = 'scelta'; A.esito = null; A.residuo = TEMPO_SCELTA; A.t = 0;
    roberto.radice.position.copy(PORTA);
    roberto.radice.rotation.y = 0;
    posaInPiedi(roberto);
    roberto.testa.rotation.set(0, 0, 0);
    roberto.espressione('imbarazzo');
    for (const p of [...compagni, ...amici, roberto]) {
      for (const b of p.braccia) { b.spalla.rotation.set(0, 0, 0); b.gomito.rotation.set(0, 0, 0); }
      p.testa.rotation.set(0, 0, 0); p.corpo.rotation.set(0, 0, 0);
    }
    for (const p of compagni) { p.parla = 0; p.lancio = 0; }
    for (const p of [...compagni, ...amici]) siediti(p, sedia(...p.casella));
    for (const f of [...fRisata, ...fAmici, fRoberto, fCampana]) f.visible = false;
    for (const p of palline) { p.t = -1; p.m.visible = false; }
    // Panoramica dall'angolo della porta: cattedra e lavagna a destra, i banchi a sinistra.
    imposta(vista, -5.7, 3.6, 4.7, 1.8, 0.4, -0.8, 70);
    imposta(daVista, -5.7, 3.6, 4.7, 1.8, 0.4, -0.8, 70);
    imposta(aVista, -5.2, 3.3, 4.5, 1.8, 0.5, -0.6, 60);
  };

  A.scegli = function (esito) {
    if (A.stato !== 'scelta') return;
    A.esito = esito;
    roberto.espressione(esito === 'prima' ? 'triste' : 'sorriso');
    A.stato = 'cammina';
    A.t = 0;
    seduta = esito === 'prima' ? sedia(0, 1) : sedia(3, 2);
    const f = esito === 'prima' ? 0 : 3;
    const accesso = new THREE.Vector3(FILE_X[f] - 1.5, 0, 3.7);
    percorso = [PORTA.clone(), new THREE.Vector3(PORTA.x, 0, 3.7), accesso, new THREE.Vector3(FILE_X[f] - 1.5, 0, seduta.z), seduta.clone()];
    tPercorso = 0;
    // Prima fila: dal lato della lavagna si vedono Roberto e i compagni che ridono dietro di lui.
    // Ultima fila: dall'alto, davanti ai banchi, Roberto accanto ai due amici.
    if (esito === 'prima') vaiVerso(4.6, 2.0, 1.6, 0.8, 1.0, -0.1, 64);
    else vaiVerso(1.0, 3.0, 0.3, -3.8, 0.9, -0.25, 66);
    A.durataVista = 1.3;
    A.tVista = 0;
  };

  // Lunghezza del percorso e punto a distanza s.
  function lunghezzaPercorso(p) { let l = 0; for (let i = 1; i < p.length; i++) l += p[i].distanceTo(p[i - 1]); return l; }
  function puntoSu(p, s, out, dirOut) {
    let resto = s;
    for (let i = 1; i < p.length; i++) {
      const l = p[i].distanceTo(p[i - 1]);
      if (resto <= l || i === p.length - 1) {
        const k = Math.min(1, resto / l);
        out.lerpVectors(p[i - 1], p[i], k);
        dirOut.subVectors(p[i], p[i - 1]).normalize();
        return;
      }
      resto -= l;
    }
  }
  const tmp = new THREE.Vector3(), dir = new THREE.Vector3();

  // Gira il personaggio nella direzione `dir` sul piano (il suo avanti è -z).
  function guarda(p, d, k = 1) {
    const target = Math.atan2(-d.x, -d.z);
    let diff = target - p.radice.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    p.radice.rotation.y += diff * Math.min(1, k);
  }

  function lancia(da, a, t0) { lanci.push({ da, a, t0, fatto: false }); }

  function inizioScena() {
    A.stato = 'scena'; A.t = 0;
    posaSeduto(roberto, ALTEZZA_SEDUTO);
    roberto.radice.position.copy(seduta);
    roberto.radice.rotation.y = -Math.PI / 2;
    lanci = [];
    if (A.esito === 'prima') {
      [0.5, 1.1, 1.6, 2.3, 2.9, 3.5, 4.0].forEach((t0, i) => lancia(lanciatori[i % lanciatori.length], roberto, t0));
    }
  }

  function aggiornaCompagni(t, dt) {
    for (const p of compagni) {
      p.corpo.position.y = -ALTEZZA_SEDUTO + Math.sin(t * 1.6 + p.fase) * 0.01;
      p.testa.rotation.y = Math.sin(t * 0.7 + p.fase) * 0.25;
    }
  }

  A.aggiorna = function (dt) {
    A.t += dt;
    roberto.aggiornaVolto(dt);
    const t = A.t;

    if (A.stato === 'scelta') {
      A.residuo = Math.max(0, TEMPO_SCELTA - t);
      mescolaVista(Math.min(1, t / TEMPO_SCELTA));
      posaInPiedi(roberto);
      roberto.corpo.position.y = Math.sin(t * 2.4) * 0.012;
      aggiornaCompagni(t, dt);
      if (A.residuo <= 0) A.scegli('prima');      // indecisione: finisce in prima fila
    } else if (A.stato === 'cammina') {
      A.tVista += dt;
      mescolaVista(Math.min(1, A.tVista / A.durataVista));
      tPercorso += dt * 2.6;
      const L = lunghezzaPercorso(percorso);
      puntoSu(percorso, Math.min(L, tPercorso), tmp, dir);
      roberto.radice.position.copy(tmp);
      if (tPercorso < L) { guarda(roberto, dir, dt * 10); posaCorsa(roberto, t * 9, 0.55); }
      else { posaInPiedi(roberto); guarda(roberto, new THREE.Vector3(1, 0, 0), dt * 12); }
      aggiornaCompagni(t, dt);
      if (tPercorso >= L + 0.35) inizioScena();
    } else if (A.stato === 'scena') {
      aggiornaCompagni(t, dt);
      if (A.esito === 'prima') scenaPrimaFila(t, dt);
      else scenaUltimaFila(t, dt);
      if (t > 5.0) { A.stato = 'campanella'; A.t = 0; }
    } else if (A.stato === 'campanella') {
      aggiornaCompagni(t, dt);
      fCampana.visible = true;
      roberto.espressione('sorriso');
      fCampana.position.y = 3.0 + Math.sin(t * 30) * 0.03;
      for (const f of [...fRisata, ...fAmici, fRoberto]) f.visible = false;
      roberto.testa.rotation.x += (0 - roberto.testa.rotation.x) * Math.min(1, dt * 6);
      for (const b of roberto.braccia) { b.spalla.rotation.x *= 0.9; b.spalla.rotation.z *= 0.9; b.gomito.rotation.x *= 0.9; }
      for (const p of [...amici, ...compagni]) for (const b of p.braccia) { b.spalla.rotation.x *= 0.9; b.spalla.rotation.z *= 0.9; }
      if (t > 0.9) iniziaUscita();
    } else if (A.stato === 'esce') {
      aggiornaUscita(t, dt);
    }

    camera.fov = vista.fov;
    camera.position.copy(vista.pos);
    camera.lookAt(vista.mira);
    camera.updateProjectionMatrix();
    animaPalline(dt);
  };

  // --- Scena: prima fila (sbagliata) ---------------------------------------
  function scenaPrimaFila(t, dt) {
    // Roberto a testa bassa, spalle chiuse, trasalisce quando lo colpiscono.
    roberto.testa.rotation.x += (-0.65 - roberto.testa.rotation.x) * Math.min(1, dt * 6);
    for (const b of roberto.braccia) { b.spalla.rotation.x = -0.9; b.gomito.rotation.x = -0.4; }
    roberto.corpo.position.y = -ALTEZZA_SEDUTO - 0.02 + Math.sin(t * 2) * 0.004;
    roberto.corpo.rotation.x = 0.12;
    let colpo = 0, dolore = false;
    for (const l of lanci) {
      if (!l.fatto && t >= l.t0) {
        l.fatto = true;
        const pallina = palline.find(p => p.t < 0);
        if (pallina) {
          pallina.t = 0; pallina.tiro = 0.55;
          l.da.radice.getWorldPosition(pallina.da); pallina.da.y += 1.15;
          roberto.radice.getWorldPosition(pallina.a); pallina.a.y += 1.3;
          pallina.a.z += (Math.random() - 0.5) * 0.3;
          pallina.m.visible = true;
          l.da.lancio = 0.5;
          l.da.parla = 1.0;         // mentre tira dice "O'Cià"
        }
      }
      if (l.fatto && t - l.t0 > 0.5 && t - l.t0 < 0.7) colpo = 1;
      if (l.fatto && t - l.t0 > 0.45 && t - l.t0 < 1.0) dolore = true;
    }
    roberto.espressione(dolore ? 'dolore' : 'triste');
    roberto.corpo.rotation.z = colpo * Math.sin(t * 50) * 0.06;
    // Chi sta dietro ride e tira.
    for (const p of compagni) {
      if (p.casella[0] >= 1) {
        p.corpo.position.y = -ALTEZZA_SEDUTO + Math.abs(Math.sin(t * 7 + p.fase)) * 0.05;
        p.testa.rotation.x = Math.sin(t * 9 + p.fase) * 0.2;
      }
      if (p.lancio > 0) {
        p.lancio -= dt;
        p.braccia[1].spalla.rotation.x = -2.4 * Math.sin((0.5 - p.lancio) / 0.5 * Math.PI);
      }
    }
    // Fumetti di risata e pensiero.
    compagni.forEach((p, i) => {
      const f = fRisata[i];
      if (p.parla > 0) p.parla -= dt;
      const attivo = p.parla > 0 || (p.casella[0] >= 1 && ((t * 1.3 + i * 0.37) % 1.2) < 0.7 && t > 0.6);
      f.visible = attivo;
      if (attivo) { p.radice.getWorldPosition(f.position); f.position.y += 1.7; }
    });
    fRoberto.visible = t > 1.2;
    if (fRoberto.visible) { roberto.radice.getWorldPosition(fRoberto.position); fRoberto.position.y += 1.55; fRoberto.position.x += 0.3; }
    for (const p of amici) {      // gli amici dall'ultima fila guardano la scena senza intervenire
      p.corpo.position.y = -ALTEZZA_SEDUTO;
    }
    // Zoom lento sul volto.
    const k = Math.min(1, t / 5);
    vista.pos.set(4.6 - k * 0.8, 2.0 - k * 0.3, 1.6 - k * 0.6);
    vista.mira.set(0.8 + k * 0.4, 1.0 - k * 0.1, -0.1);
    vista.fov = 64 - k * 8;
  }

  // --- Scena: ultima fila, con gli amici -----------------------------------
  function scenaUltimaFila(t, dt) {
    const [a1, a2] = amici;
    roberto.espressione(['gioia', 'furbo', 'gioia', 'bacio'][Math.floor(t * 1.8) % 4]);
    // Roberto fa il cretino: braccia in alto a turno, testa che dondola, busto che ondeggia.
    roberto.testa.rotation.z = Math.sin(t * 8) * 0.28;
    roberto.testa.rotation.x = Math.sin(t * 5) * 0.15;
    roberto.corpo.rotation.z = Math.sin(t * 4) * 0.12;
    roberto.corpo.position.y = -ALTEZZA_SEDUTO + Math.abs(Math.sin(t * 5)) * 0.1;
    roberto.braccia[0].spalla.rotation.z = -0.3 - (Math.sin(t * 8) > 0 ? 2.2 : 0.2);
    roberto.braccia[1].spalla.rotation.z = 0.3 + (Math.sin(t * 8) < 0 ? 2.2 : 0.2);
    roberto.braccia[0].spalla.rotation.x = Math.sin(t * 8) * 0.4;
    roberto.braccia[1].spalla.rotation.x = -Math.sin(t * 8) * 0.4;
    // Gli amici si piegano dalle risate e battono il cinque.
    for (const [i, p] of [a1, a2].entries()) {
      p.corpo.position.y = -ALTEZZA_SEDUTO + Math.abs(Math.sin(t * 9 + i * 1.3)) * 0.07;
      p.corpo.rotation.x = Math.sin(t * 9 + i) * 0.15;
      p.testa.rotation.x = Math.sin(t * 9 + i) * 0.25;
      const cinque = t > 1.6 && t < 2.6;
      p.braccia[i === 0 ? 1 : 0].spalla.rotation.z = (i === 0 ? 1 : -1) * (cinque ? 1.9 : 0.15);
      p.braccia[i === 0 ? 1 : 0].spalla.rotation.x = cinque ? -0.3 : 0;
    }
    // Compagni lontani: ridono un po'.
    for (const p of compagni) if (p.casella[0] === 2) p.corpo.position.y = -ALTEZZA_SEDUTO + Math.abs(Math.sin(t * 6 + p.fase)) * 0.03;
    // Fumetti.
    fAmico1.visible = (t * 1.1) % 1.3 < 0.8 && t > 0.4;
    fAmico2.visible = (t * 1.1 + 0.6) % 1.3 < 0.8 && t > 0.4;
    a1.radice.getWorldPosition(fAmico1.position); fAmico1.position.y += 1.7;
    a2.radice.getWorldPosition(fAmico2.position); fAmico2.position.y += 1.7;
    for (const f of fRisata) f.visible = false;
    // Camera: davanti all'ultima fila, sopra il banco vuoto; si stringe piano sui tre.
    const k = Math.min(1, t / 5);
    vista.pos.set(1.0 - k * 0.3, 3.0 - k * 0.1, 0.3 - k * 0.3);
    vista.mira.set(-3.8, 0.9, -0.25);
    vista.fov = 66 - k * 4;
  }

  // --- Uscita ----------------------------------------------------------------
  let uscenti = [];
  function iniziaUscita() {
    A.stato = 'esce'; A.t = 0;
    const gente = [...compagni, ...amici];
    // Si alzano a ondate; Roberto per ultimo.
    gente.sort((p, q) => q.radice.position.x - p.radice.position.x);
    uscenti = [...gente, roberto].map((p, i) => {
      const da = p.radice.position.clone();
      const pt = [da, new THREE.Vector3(da.x - 0.9, 0, da.z), new THREE.Vector3(PORTA.x + (i % 3 - 1) * 0.35, 0, 3.7 + (da.z > 1 ? 0.4 : 0)), PORTA.clone().add(new THREE.Vector3((i % 3 - 1) * 0.3, 0, 0.8))];
      return { p, pt, ritardo: i * 0.28 + (p === roberto ? 0.5 : 0), s: 0 };
    });
    for (const u of uscenti) { posaInPiedi(u.p); u.p.corpo.rotation.set(0, 0, 0); u.p.testa.rotation.set(0, 0, 0); }
    vaiVerso(-0.5, 3.4, 1.2, -4.4, 0.9, 4.2, 68);
    A.tVista = 0; A.durataVista = 1.4;
    fCampana.visible = false;
  }

  function aggiornaUscita(t, dt) {
    A.tVista += dt;
    mescolaVista(Math.min(1, A.tVista / A.durataVista));
    let tutti = true;
    for (const u of uscenti) {
      const tt = t - u.ritardo;
      if (tt < 0) { tutti = false; continue; }
      const L = lunghezzaPercorso(u.pt);
      u.s = Math.min(L, tt * 3.3);
      puntoSu(u.pt, u.s, tmp, dir);
      u.p.radice.position.copy(tmp);
      if (u.s < L) { guarda(u.p, dir, dt * 12); posaCorsa(u.p, t * 10 + u.ritardo, 0.6); tutti = false; }
      else posaInPiedi(u.p);
    }
    if (tutti || t > 6) A.stato = 'fine';
  }

  function animaPalline(dt) {
    for (const p of palline) {
      if (p.t < 0) continue;
      p.t += dt;
      const k = Math.min(1, p.t / p.tiro);
      p.m.position.lerpVectors(p.da, p.a, k);
      p.m.position.y += Math.sin(k * Math.PI) * 0.35;
      if (k >= 1) {
        p.m.position.y = Math.max(0.78, p.a.y - (p.t - p.tiro) * 2);
        if (p.t > p.tiro + 0.5) { p.t = -1; p.m.visible = false; }
      }
    }
  }

  A.ridimensiona = function (aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); };
  return A;
}
