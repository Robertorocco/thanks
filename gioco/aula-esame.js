// La scena dell'esame all'università (magistrale). Roberto è alla lavagna, piena di matrici di controllo
// ottimo; il professore, che ha solo le prime tre dita, gli fa domande seduto a un banchetto come uno
// studente; dietro di lui c'è Chiara (sembra Levi de L'attacco dei giganti) con il tablet, pronta a
// suggerire. Dopo la domanda si sceglie: Copiare (giusto: Chiara alza il tablet e Roberto legge la risposta)
// o Rispondere (Roberto non la sa e il professore lo boccia alzando la mano con le sue tre dita).
// Stessa interfaccia delle altre scene in classe (aula.js): avvia, scegli, aggiorna, stato, esito, residuo.

import * as THREE from './lib/three.module.min.js';
import { materiale, blocco, scritta, tela, creaPersona, posaSeduto, posaInPiedi } from './modelli.js';
import { fumetto } from './aula.js';
import { TEMPO_SCELTA } from './mondi.js';

const SCALA = 0.8;
const LEGNO = 0xC89B5E, METALLO = 0x3B4A5A;
const POS_ROBERTO = new THREE.Vector3(-1.0, 0, -4.2);
const POS_PROF = new THREE.Vector3(0.0, 0, -1.1);
const POS_CHIARA = new THREE.Vector3(2.4, 0, 1.0);
const BASIC = c => new THREE.MeshBasicMaterial({ color: c });

// ---------------------------------------------------------------------------
// Formule col gesso: testo con apici e pedici, scritto a mano libera
// ---------------------------------------------------------------------------

// `s` usa ^{...} per gli apici e _{...} per i pedici; \dot{x} mette il punto sopra.
function formula(g, s, x, y, px) {
  const parti = [];
  const re = /\^\{([^}]*)\}|_\{([^}]*)\}|\\dot\{([^}]*)\}|([^^_\\]+)/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[1] != null) parti.push([m[1], 'su']);
    else if (m[2] != null) parti.push([m[2], 'giu']);
    else if (m[3] != null) parti.push([m[3], 'punto']);
    else parti.push([m[4], 'n']);
  }
  let cx = x;
  for (const [t, modo] of parti) {
    const dim = modo === 'su' || modo === 'giu' ? px * 0.6 : px;
    g.font = `italic ${dim}px Georgia, "Times New Roman", serif`;
    const dy = modo === 'su' ? -px * 0.38 : modo === 'giu' ? px * 0.28 : 0;
    g.fillText(t, cx, y + dy);
    const w = g.measureText(t).width;
    if (modo === 'punto') { g.beginPath(); g.arc(cx + w * 0.55, y - px * 0.55, px * 0.07, 0, Math.PI * 2); g.fill(); }
    cx += w + (modo === 'n' ? 0 : 2);
  }
  return cx;
}

function matrice(g, x, y, nome, righe, px) {
  g.font = `italic ${px}px Georgia, serif`;
  g.fillText(nome, x, y);
  const x0 = x + g.measureText(nome).width + 10;
  const col = righe[0].length, h = righe.length * px * 1.05, w = col * px * 1.35;
  const top = y - h / 2 - 2;
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(x0 + 10, top); g.lineTo(x0, top); g.lineTo(x0, top + h + 4); g.lineTo(x0 + 10, top + h + 4); g.stroke();
  g.beginPath(); g.moveTo(x0 + w + 10, top); g.lineTo(x0 + w + 20, top); g.lineTo(x0 + w + 20, top + h + 4); g.lineTo(x0 + w + 10, top + h + 4); g.stroke();
  g.textAlign = 'center';
  righe.forEach((r, i) => r.forEach((v, j) => g.fillText(v, x0 + 10 + (j + 0.5) * (w / col), top + (i + 0.55) * (h / righe.length) + 2)));
  g.textAlign = 'left';
}

const texLavagna = tela(1024, 300, (g, W, H) => {
  g.fillStyle = '#2E4A3C'; g.fillRect(0, 0, W, H);
  // Aloni di gesso cancellato.
  g.fillStyle = 'rgba(255,255,255,.06)';
  for (let i = 0; i < 16; i++) g.fillRect((i * 263) % W, (i * 97) % H, 140, 26);
  g.fillStyle = '#F2EFE4'; g.strokeStyle = '#F2EFE4'; g.textBaseline = 'middle';
  formula(g, '\\dot{x} = Ax + Bu', 34, 44, 34);
  formula(g, 'J = ∫ (x^{T}Qx + u^{T}Ru) dt', 34, 104, 34);
  formula(g, 'A^{T}P + PA − PBR^{−1}B^{T}P + Q = 0', 34, 168, 34);
  formula(g, 'u* = −Kx', 34, 232, 34);
  matrice(g, 600, 70, 'A =', [['0', '1'], ['−2', '−3']], 32);
  matrice(g, 840, 70, 'B =', [['0'], ['1']], 32);
  matrice(g, 600, 200, 'Q =', [['1', '0'], ['0', '1']], 32);
  formula(g, 'R = 1', 846, 200, 32);
  // Un riquadro intorno all'equazione di Riccati, come si fa a lezione.
  g.lineWidth = 2.5; g.strokeRect(24, 142, 520, 52);
});

const texTablet = tela(256, 176, (g, W, H) => {
  g.fillStyle = '#10131C'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1D2A44'; g.fillRect(10, 10, W - 20, H - 20);
  g.fillStyle = '#FFFFFF'; g.textBaseline = 'middle';
  formula(g, 'K = R^{−1}B^{T}P', 30, H / 2, 44);
});

// ---------------------------------------------------------------------------
// Facciata della facoltà sulla strada: la porta si apre mentre Roberto arriva
// ---------------------------------------------------------------------------

export function creaFacolta() {
  const g = new THREE.Group();
  const muro = materiale(0xA85B3F), pietra = materiale(0xE4DED0);     // mattoni e fasce chiare, come i palazzi di Ingegneria
  g.add(blocco(7.6, 9, 0.8, muro, -5.1, 0, -0.2));
  g.add(blocco(7.6, 9, 0.8, muro, 5.1, 0, -0.2));
  g.add(blocco(2.6, 5.6, 0.8, muro, 0, 3.4, -0.2));
  g.add(blocco(18.4, 0.6, 1.3, pietra, 0, 9));
  g.add(blocco(18.4, 0.5, 1.0, pietra, 0, 0));
  for (const x of [-8.4, -5.4, -2.2, 2.2, 5.4, 8.4]) g.add(blocco(0.7, 7.2, 0.5, pietra, x, 0.5, 0.45));
  const vetro = BASIC(0x9DBBCE);
  for (const y of [4.3, 6.6]) for (const x of [-7.0, -3.8, 3.8, 7.0]) g.add(blocco(1.5, 1.5, 0.1, vetro, x, y, 0.22));
  for (const x of [-7.0, -3.8, 3.8, 7.0]) g.add(blocco(1.5, 2.0, 0.1, vetro, x, 1.4, 0.22));
  const insegna = scritta('INGEGNERIA', 6.4, 0.9, 0xE6DAC2, 0x2F3A4A);
  insegna.position.set(0, 7.95, 0.24);
  g.add(insegna);
  g.add(blocco(2.6, 3.4, 0.05, BASIC(0xEDE6D6), 0, 0, -0.55));            // si intravede l'atrio
  const anta = (x, verso) => {
    const perno = new THREE.Group();
    perno.position.set(x, 0, 0.1);
    perno.add(blocco(1.25, 3.3, 0.1, 0x5A3A22, verso * 0.625, 0, 0));
    perno.add(blocco(0.8, 1.6, 0.04, BASIC(0xB9CFDC), verso * 0.625, 1.3, 0.06));
    g.add(perno);
    return perno;
  };
  const sx = anta(-1.25, 1), dx = anta(1.25, -1);
  g.userData.apri = k => { sx.rotation.y = k * 1.4; dx.rotation.y = -k * 1.4; };
  return g;
}

// ---------------------------------------------------------------------------
// La scena
// ---------------------------------------------------------------------------

// Mano con solo pollice, indice e medio (il professore): più grande, così si vede bene.
function manoTreDita(pelle) {
  const m = new THREE.Group();
  m.add(blocco(0.19, 0.17, 0.08, pelle, 0.0, -0.17));
  m.add(blocco(0.045, 0.17, 0.06, pelle, -0.072, -0.34));         // indice
  m.add(blocco(0.045, 0.2, 0.06, pelle, -0.002, -0.37));          // medio
  const pollice = blocco(0.05, 0.14, 0.06, pelle, 0, -0.12);
  pollice.position.set(-0.11, -0.06, 0); pollice.rotation.z = -0.7;
  m.add(pollice);
  // Dove mancano anulare e mignolo, solo due monconi arrotondati.
  m.add(blocco(0.045, 0.03, 0.06, pelle, 0.066, -0.2));
  m.scale.setScalar(1.5);
  return m;
}

// Volto di Chiara alla Levi: occhi sottili e freddi, sopracciglia dritte, bocca piccola e seria.
function voltoLevi() {
  return tela(256, 256, (g) => {
    g.fillStyle = '#F2D5C0'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#121216'; g.fillRect(0, 0, 256, 30);
    g.fillStyle = '#1A1A1E'; g.fillRect(56, 92, 54, 7); g.fillRect(146, 92, 54, 7);
    g.fillStyle = '#ffffff'; g.fillRect(62, 114, 42, 12); g.fillRect(152, 114, 42, 12);
    g.fillStyle = '#5E6670'; g.fillRect(74, 114, 16, 12); g.fillRect(164, 114, 16, 12);
    g.fillStyle = '#1C1D2B'; g.fillRect(60, 110, 46, 5); g.fillRect(150, 110, 46, 5);
    g.fillStyle = 'rgba(80,60,80,.25)'; g.fillRect(64, 130, 40, 6); g.fillRect(154, 130, 40, 6);
    g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(120, 124, 16, 40);
    g.fillStyle = '#9B5A50'; g.fillRect(106, 190, 44, 7);
  });
}

export function creaAulaEsame() {
  const scena = new THREE.Scene();
  scena.background = new THREE.Color(0xD5DCE2);
  scena.fog = new THREE.Fog(0xD5DCE2, 18, 40);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  scena.add(camera);
  scena.add(new THREE.HemisphereLight(0xffffff, 0x9a9488, 1.7));
  const sole = new THREE.DirectionalLight(0xfff4e0, 1.2);
  sole.position.set(5, 8, 6);
  scena.add(sole);

  // --- Aula universitaria ----------------------------------------------------
  const parete = materiale(0xEDEAE2);
  scena.add(blocco(14, 0.2, 12, 0xBDB6A6, 0, -0.2, 0));
  scena.add(blocco(14, 4.0, 0.3, parete, 0, 0, -5.5));
  scena.add(blocco(0.3, 4.0, 12, parete, -6.8, 0, 0));
  scena.add(blocco(0.3, 4.0, 12, parete, 6.8, 0, 0));
  scena.add(blocco(14, 4.0, 0.3, parete, 0, 0, 5.8));
  scena.add(blocco(14, 0.2, 12, BASIC(0xF4F4F0), 0, 4.0, 0));
  for (const z of [-3.2, 0.2, 3.6]) scena.add(blocco(0.06, 1.9, 2.2, BASIC(0xDDF1FF), 6.62, 1.2, z));
  for (const x of [-3, 0, 3]) for (const z of [-3, 1]) scena.add(blocco(1.6, 0.05, 0.4, BASIC(0xFFFFFF), x, 3.94, z));
  // Lavagna con le matrici, cornice e vaschetta del gesso.
  const lavagna = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.1), new THREE.MeshLambertMaterial({ map: texLavagna }));
  lavagna.position.set(0, 2.0, -5.32);
  scena.add(lavagna);
  scena.add(blocco(7.5, 0.1, 0.1, 0x8A6A44, 0, 3.05, -5.32));
  scena.add(blocco(7.5, 0.1, 0.25, 0x8A6A44, 0, 0.9, -5.25));
  scena.add(blocco(0.1, 2.2, 0.1, 0x8A6A44, -3.65, 0.9, -5.32));
  scena.add(blocco(0.1, 2.2, 0.1, 0x8A6A44, 3.65, 0.9, -5.32));
  scena.add(blocco(0.25, 0.06, 0.06, 0xFFFFFF, 1.2, 1.0, -5.2));
  // Cattedra vuota (il professore si è seduto tra i banchi).
  scena.add(blocco(2.2, 0.08, 0.9, LEGNO, 4.2, 0.78, -3.6));
  for (const [x, z] of [[3.2, -3.9], [5.2, -3.9], [3.2, -3.3], [5.2, -3.3]]) scena.add(blocco(0.08, 0.78, 0.08, METALLO, x, 0, z));
  // Banchetti con la sedia, rivolti verso la lavagna (-z).
  function banchetto(x, z) {
    scena.add(blocco(1.1, 0.05, 0.55, LEGNO, x, 0.72, z - 0.75));
    for (const dx of [-0.48, 0.48]) for (const dz of [-0.22, 0.22]) scena.add(blocco(0.05, 0.72, 0.05, METALLO, x + dx, 0, z - 0.75 + dz));
    scena.add(blocco(0.46, 0.05, 0.46, 0x4B6A99, x, 0.42, z));
    scena.add(blocco(0.46, 0.5, 0.05, 0x4B6A99, x, 0.42, z + 0.21));
    for (const dx of [-0.18, 0.18]) for (const dz of [-0.18, 0.18]) scena.add(blocco(0.04, 0.42, 0.04, METALLO, x + dx, 0, z + dz));
  }
  banchetto(POS_PROF.x, POS_PROF.z);
  banchetto(POS_CHIARA.x, POS_CHIARA.z);
  for (const [x, z] of [[-2.6, -1.1], [-2.6, 1.0], [-0.2, 1.0], [-2.6, 3.0], [0.0, 3.0], [2.4, 3.0]]) banchetto(x, z);
  // Il libretto dell'esame sul banchetto del professore.
  scena.add(blocco(0.32, 0.03, 0.24, 0x1F58B8, POS_PROF.x + 0.25, 0.77, POS_PROF.z - 0.8));

  // --- Personaggi ------------------------------------------------------------
  function persona(o, scala = 1) {
    const p = creaPersona(o);
    p.radice.scale.setScalar(SCALA * scala);
    scena.add(p.radice);
    return p;
  }
  const roberto = persona({ roberto: true });
  roberto.vesti('universita');
  roberto.volto().prepara(['neutro', 'sorriso', 'gioia', 'furbo', 'imbarazzo', 'sforzo', 'triste', 'sorpresa']);

  const PELLE_PROF = 0xE6BC98;
  const prof = persona({
    pelle: PELLE_PROF, capelli: 0x9A9DA3, acconciatura: 'calvo', occhiali: true, serio: true,
    maglia: 0x2B3A55, pantaloni: 0x2A2D3A, scarpe: 0x1A1410, abito: 'elegante', corpulenza: 1.08,
  });
  // La mano destra ha solo tre dita.
  const gomitoProf = prof.braccia[1].gomito;
  for (const c of gomitoProf.children) if (Math.abs(c.position.y + 0.4) < 0.01) c.visible = false;
  const mano = manoTreDita(PELLE_PROF);
  mano.position.y = -0.4;
  gomitoProf.add(mano);

  // Chiara alla Levi: bassa, capelli neri con la riga in mezzo e i lati rasati, foulard bianco,
  // giacca color sabbia con le cinghie, pantaloni chiari e stivali.
  const chiara = persona({
    pelle: 0xF2D5C0, capelli: 0x121216, maglia: 0xB89668, pantaloni: 0xEDE6D8, scarpe: 0x4A3020, conZaino: false,
  }, 0.9);
  const testaC = chiara.testa;
  testaC.children[0].material[5] = new THREE.MeshLambertMaterial({ map: voltoLevi() });
  for (const s of [-1, 1]) {
    const ciocca = blocco(0.22, 0.17, 0.06, 0x121216, s * 0.115, 0.06, -0.228);
    ciocca.rotation.z = s * 0.38;
    testaC.add(ciocca);
    testaC.add(blocco(0.06, 0.2, 0.08, 0x121216, s * 0.205, -0.08, -0.19));       // ciocche ai lati del viso
    testaC.add(blocco(0.03, 0.14, 0.4, 0x3A3A40, s * 0.222, -0.16, 0.02));          // lati rasati
  }
  chiara.superiore.add(blocco(0.16, 0.2, 0.06, 0xFFFFFF, 0, 1.5, -0.18));            // foulard
  chiara.superiore.add(blocco(0.24, 0.07, 0.06, 0xFFFFFF, 0, 1.66, -0.17));
  for (const x of [-0.17, 0.17]) chiara.superiore.add(blocco(0.04, 0.5, 0.02, 0x3A2416, x, 1.12, -0.18));
  chiara.superiore.add(blocco(0.5, 0.04, 0.02, 0x3A2416, 0, 1.3, -0.185));
  const tablet = new THREE.Group();
  tablet.add(blocco(0.62, 0.44, 0.03, 0x1C1D24, 0, -0.22));
  const schermo = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.38), new THREE.MeshBasicMaterial({ map: texTablet }));
  schermo.position.set(0, 0, -0.02); schermo.rotation.y = Math.PI;
  tablet.add(schermo);
  scena.add(tablet);

  // Fumetti.
  const bolla = (t, c, ink, w, largo) => { const f = fumetto(t, c, ink, w, largo); scena.add(f); return f; };
  const fDomanda = bolla('Mi ricava il guadagno ottimo K?', '#FFFFFF', '#1C1D2B', 1.55, 2.8);
  const fEhm = bolla('Ehm…', '#FFFFFF', '#1C1D2B', 0.65);
  const fRisposta = bolla('K = R⁻¹BᵀP', '#FFFFFF', '#1C1D2B', 1.0, 1.4);
  const fTrenta = bolla('Perfetto, 30 e lode!', '#FFE27A', '#1C1D2B', 1.3, 2.0);
  const fAppello = bolla("Ci vediamo al prossimo appello", "#FFFFFF", "#1C1D2B", 1.15, 2.8);
  const bolle = [fDomanda, fEhm, fRisposta, fTrenta, fAppello];

  // --- Inquadrature ----------------------------------------------------------
  const V = (px, py, pz, mx, my, mz, fov) => ({ pos: new THREE.Vector3(px, py, pz), mira: new THREE.Vector3(mx, my, mz), fov });
  // Pensate per il telefono in verticale: i tre personaggi uno dietro l'altro, a quote diverse nell'inquadratura.
  const INTRO = V(4.2, 3.3, 5.4, -0.2, 0.8, -2.0, 60);
  const DOMANDA = V(1.4, 2.1, 1.7, -0.8, 1.35, -4.2, 46);
  const TABLET = V(-0.5, 1.55, -3.6, 2.4, 1.45, 1.0, 30);
  const PROF = V(-1.5, 1.5, -4.1, 0.1, 1.65, -1.0, 44);
  const vista = V(0, 0, 0, 0, 0, 0, 50), da = V(0, 0, 0, 0, 0, 0, 50);
  let a = INTRO, tVista = 0, durVista = 0.01;
  function vaiA(v, dur = 0.7) { da.pos.copy(vista.pos); da.mira.copy(vista.mira); da.fov = vista.fov; a = v; tVista = 0; durVista = dur; }
  function stacca(v) { vaiA(v, 0.01); }

  const A = { scena, camera, stato: 'inattiva', esito: null, residuo: TEMPO_SCELTA, t: 0, uscito: false };
  let tScena = 0, tScelta = 0;

  function posaBase() {
    roberto.radice.position.copy(POS_ROBERTO);
    roberto.radice.rotation.set(0, Math.PI + 0.2, 0);
    posaInPiedi(roberto);
    for (const b of roberto.braccia) { b.spalla.rotation.set(0, 0, 0); b.gomito.rotation.set(0, 0, 0); }
    roberto.testa.rotation.set(0, 0, 0);
    // Il professore seduto al banchetto, girato verso la lavagna; Chiara dietro di lui.
    for (const [p, pos] of [[prof, POS_PROF], [chiara, POS_CHIARA]]) {
      p.radice.position.copy(pos);
      p.radice.rotation.set(0, 0, 0);
      posaSeduto(p, 0.3);
      for (const b of p.braccia) { b.spalla.rotation.set(0.9, 0, 0); b.gomito.rotation.set(0.5, 0, 0); }
      p.testa.rotation.set(0, 0, 0);
    }
    prof.braccia[0].spalla.rotation.set(0.6, 0, 0.1);
  }

  A.avvia = function () {
    A.stato = 'scelta'; A.esito = null; A.residuo = TEMPO_SCELTA; A.t = 0; A.uscito = false;
    tScena = 0; tScelta = 0;
    posaBase();
    roberto.espressione('sforzo');
    vista.pos.copy(INTRO.pos); vista.mira.copy(INTRO.mira); vista.fov = INTRO.fov;
    vaiA(INTRO, 0.01);
    for (const b of bolle) b.visible = false;
  };

  A.scegli = function (esito) {
    if (A.stato !== 'scelta') return;
    A.esito = esito;
    A.stato = 'scena';
    tScena = 0;
  };

  // Dove sta il tablet: in mano davanti al petto, o alzato sopra la testa verso Roberto.
  function mettiTablet(alza) {
    tablet.position.set(POS_CHIARA.x, THREE.MathUtils.lerp(0.98, 1.92, alza), POS_CHIARA.z - THREE.MathUtils.lerp(0.42, 0.22, alza));
    tablet.rotation.set(THREE.MathUtils.lerp(-0.9, 0.05, alza), -0.35 * alza, 0);
    for (const b of chiara.braccia) {
      b.spalla.rotation.set(THREE.MathUtils.lerp(0.9, 2.85, alza), 0, 0);
      b.gomito.rotation.set(THREE.MathUtils.lerp(0.5, 0.1, alza), 0, 0);
    }
  }

  const sopra = (p, dy, out) => { p.radice.getWorldPosition(out); out.y += dy; return out; };

  A.aggiorna = function (dt) {
    A.t += dt;
    const t = A.t;
    roberto.aggiornaVolto(dt);
    for (const b of bolle) b.visible = false;
    let alza = 0;

    if (A.stato === 'scelta') {
      // Inquadratura larga, poi dietro le spalle del professore mentre fa la domanda.
      if (t > 1.4 && a === INTRO) vaiA(DOMANDA, 0.9);
      tScelta += dt;
      A.residuo = Math.max(0, TEMPO_SCELTA - tScelta);
      if (t > 1.6) {
        fDomanda.position.set(POS_PROF.x - 0.35, 1.95, POS_PROF.z - 1.2);
        fDomanda.visible = true;
      }
      prof.testa.rotation.x = Math.sin(t * 3) * 0.03;
      if (A.residuo <= 0) A.scegli('rispondere');         // indecisione: non la sa
    } else if (A.stato === 'scena') {
      tScena += dt;
      const ts = tScena;
      if (a === INTRO) vaiA(DOMANDA, 0.5);
      if (A.esito === 'copiare') {
        // Roberto sbircia Chiara, che alza il tablet con la risposta; lui la legge e il professore è contento.
        if (ts < 0.45) roberto.espressione('furbo');
        if (ts >= 0.45 && a !== TABLET && ts < 2.9) stacca(TABLET);
        alza = THREE.MathUtils.smoothstep(ts, 0.6, 1.2) * (1 - THREE.MathUtils.smoothstep(ts, 3.0, 3.5));
        if (ts >= 2.9 && a === TABLET) stacca(DOMANDA);
        const guardaLei = THREE.MathUtils.smoothstep(ts, 0.1, 0.5) * (1 - THREE.MathUtils.smoothstep(ts, 2.9, 3.2));
        roberto.testa.rotation.y = -0.7 * guardaLei;
        if (ts > 3.1 && ts < 4.7) { roberto.espressione('sorriso'); sopra(roberto, 1.95, fRisposta.position); fRisposta.visible = true; }
        if (ts > 4.7) {
          roberto.espressione('gioia');
          fTrenta.position.set(POS_PROF.x - 0.35, 1.95, POS_PROF.z - 1.2); fTrenta.visible = true;
          prof.testa.rotation.x = Math.abs(Math.sin(ts * 7)) * 0.18;          // annuisce
          A.uscito = true;
        }
        if (ts > 7.0) A.stato = 'fine';
      } else {
        // Non la sa: imbarazzo, poi il professore alza la mano con le sue tre dita e lo boccia.
        roberto.espressione(ts < 2.0 ? 'imbarazzo' : 'triste');
        if (ts < 2.1) {
          sopra(roberto, 1.95, fEhm.position); fEhm.visible = ts > 0.3;
          const k = THREE.MathUtils.smoothstep(ts, 0.2, 0.6);
          roberto.braccia[1].spalla.rotation.set(2.6 * k, 0, -0.5 * k);       // si gratta la testa
          roberto.braccia[1].gomito.rotation.set(1.5 * k + Math.sin(ts * 18) * 0.15 * k, 0, 0);
        } else {
          roberto.braccia[1].spalla.rotation.set(0, 0, 0); roberto.braccia[1].gomito.rotation.set(0, 0, 0);
          if (a !== PROF) stacca(PROF);
          const su = THREE.MathUtils.smoothstep(ts, 2.3, 2.8);
          prof.radice.rotation.y = 0.3 * su;
          prof.braccia[1].spalla.rotation.set(THREE.MathUtils.lerp(0.9, 2.95, su), 0, 0.2 * su);
          prof.braccia[1].gomito.rotation.set(THREE.MathUtils.lerp(0.5, 0.05, su), 0, 0);
          mano.rotation.z = Math.sin(ts * 6) * 0.12 * su;                    // il palmo verso Roberto, agitato
          if (ts > 2.8) { fAppello.position.set(POS_PROF.x + 0.12, 2.5, POS_PROF.z + 0.3); fAppello.visible = true; }
          if (ts > 3.4) A.uscito = true;
        }
        if (ts > 6.6) A.stato = 'fine';
      }
    }
    mettiTablet(alza);

    // Camera.
    tVista += dt;
    const k = Math.min(1, tVista / durVista), e = k * k * (3 - 2 * k);
    vista.pos.lerpVectors(da.pos, a.pos, e);
    vista.mira.lerpVectors(da.mira, a.mira, e);
    vista.fov = da.fov + (a.fov - da.fov) * e;
    camera.position.copy(vista.pos);
    camera.lookAt(vista.mira);
    if (Math.abs(camera.fov - vista.fov) > 0.01) { camera.fov = vista.fov; camera.updateProjectionMatrix(); }
  };

  A.ridimensiona = function (aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); };
  return A;
}
