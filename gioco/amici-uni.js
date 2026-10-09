// I personaggi dell'università e della sfida a ping pong: gli amici di Roberto (Chiara con il biondo, il gruppo
// di sette), la ragazza che se ne va con il cugino e la porta dell'aula RWC.

import * as THREE from './lib/three.module.min.js';
import { blocco, materiale, tela, esa, creaPersona, FONT } from './modelli.js';
import { capelliLunghi } from './modelli-liceo.js';
import { targaAula } from './modelli-universita.js';

// ---------------------------------------------------------------------------
// Volti: tre espressioni (neutro, sorriso, occhi chiusi) per animare i visi senza parole
// ---------------------------------------------------------------------------

function disegnaVolto(o, stato) {
  return tela(256, 256, (g) => {
    const { pelle, capelli, iride, donna } = o;
    g.fillStyle = esa(pelle); g.fillRect(0, 0, 256, 256);
    g.fillStyle = esa(capelli); g.fillRect(0, 0, 256, donna ? 38 : 46);
    // Sopracciglia: sottili e arcuate per lei, piene per lui.
    g.fillStyle = esa(o.sopracciglia ?? capelli);
    for (const [x, v] of [[80, 1], [176, -1]]) {
      g.save(); g.translate(x, stato === 'sorriso' ? 82 : 86); g.rotate(-0.12 * v);
      g.fillRect(-26, donna ? -4 : -6, 52, donna ? 7 : 11); g.restore();
    }
    for (const x of [82, 174]) {
      if (stato === 'chiusi') {
        g.strokeStyle = '#2B1D14'; g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x - 24, 114); g.quadraticCurveTo(x, 126, x + 24, 114); g.stroke();
        continue;
      }
      const h = stato === 'sorriso' ? 11 : 15;
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, 116, 25, h, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = esa(iride); g.beginPath(); g.arc(x, 116, Math.min(13, h), 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1C1D2B'; g.beginPath(); g.arc(x, 116, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(x + 3, 109, 5, 5);
      if (donna) {
        g.fillStyle = '#1C1D2B'; g.fillRect(x - 28, 100, 56, 6);
        const fuori = x < 128 ? -1 : 1;
        g.save(); g.translate(x + fuori * 27, 102); g.rotate(-fuori * 0.6); g.fillRect(-2, -12, 6, 14); g.restore();
      }
    }
    if (donna) {
      g.fillStyle = 'rgba(240,120,130,.3)';
      g.beginPath(); g.ellipse(62, 160, 20, 12, 0, 0, Math.PI * 2); g.ellipse(194, 160, 20, 12, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(120, 124, 16, 44);                                   // naso
    // Bocca: dritta, oppure un sorriso aperto con i denti.
    if (stato === 'sorriso') {
      g.fillStyle = donna ? '#C9505F' : '#8E4439';
      g.beginPath(); g.moveTo(88, 184); g.quadraticCurveTo(128, 222, 168, 184); g.quadraticCurveTo(128, 196, 88, 184); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(104, 190, 48, 6);
    } else {
      g.fillStyle = donna ? '#D85C6E' : '#9B5A50';
      g.beginPath(); g.ellipse(128, 192, donna ? 22 : 20, donna ? 8 : 5, 0, 0, Math.PI * 2); g.fill();
    }
  });
}

// Le tre facce di un personaggio, pronte da scambiare con `espressioneAmico`.
function facce(o) {
  const m = {};
  for (const s of ['neutro', 'sorriso', 'chiusi']) m[s] = new THREE.MeshLambertMaterial({ map: disegnaVolto(o, s) });
  return m;
}
export function espressioneAmico(p, stato) {
  if (p.faccia !== stato && p.facce?.[stato]) { p.cranio.material[5] = p.facce[stato]; p.faccia = stato; }
}

// Il personaggio con il suo set di facce.
export function amico(o, scala, extra = {}) {
  const f = facce(o);
  const p = creaPersona({
    pelle: o.pelle, capelli: o.capelli, maglia: o.maglia, pantaloni: o.pantaloni, scarpe: o.scarpe ?? 0xE9E5DC,
    conZaino: false, occhiali: o.occhiali, acconciatura: o.acconciatura, corpulenza: o.corpulenza,
    volto: f.neutro.map, ...extra,
  });
  p.facce = f; p.faccia = 'neutro';
  p.radice.scale.setScalar(0.8 * scala);
  return p;
}

export const riccioli = (p, colore, punti, r = 0.09) => {
  const m = materiale(colore);
  for (const [x, y, z] of punti) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m);
    b.position.set(x, y, z); b.castShadow = true;
    p.testa.add(b);
  }
};

// ---------------------------------------------------------------------------
// Chiara (quella che sembra Levi, ora con i capelli castani) e il ragazzo biondo cenere dal look all'antica
// ---------------------------------------------------------------------------

// Una lettera grande disegnata sulla schiena della maglia (la schiena guarda verso +z).
function letteraSchiena(p, lettera, colore, y, z, dim) {
  const tex = tela(128, 128, (g) => {
    g.fillStyle = colore; g.font = `900 112px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(lettera, 64, 70);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(dim, dim),
    new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.35 }));
  m.position.set(0, y, z);
  p.superiore.add(m);
}

function voltoChiara() {
  return tela(256, 256, (g) => {
    g.fillStyle = '#F2D5C0'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#5B3A24'; g.fillRect(0, 0, 256, 30);
    g.fillStyle = '#3F2A1B'; g.fillRect(56, 92, 54, 7); g.fillRect(146, 92, 54, 7);
    g.fillStyle = '#ffffff'; g.fillRect(62, 114, 42, 12); g.fillRect(152, 114, 42, 12);
    g.fillStyle = '#5E6670'; g.fillRect(74, 114, 16, 12); g.fillRect(164, 114, 16, 12);
    g.fillStyle = '#2B1D14'; g.fillRect(60, 110, 46, 5); g.fillRect(150, 110, 46, 5);
    g.fillStyle = 'rgba(80,60,80,.25)'; g.fillRect(64, 130, 40, 6); g.fillRect(154, 130, 40, 6);
    g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(120, 124, 16, 40);
    g.fillStyle = '#9B5A50'; g.fillRect(106, 190, 44, 7);
  });
}

export function creaChiaraAmica() {
  const CAP = 0x5B3A24, argento = new THREE.MeshPhongMaterial({ color: 0xD8DCE2, shininess: 120, specular: 0xffffff });
  const p = creaPersona({
    pelle: 0xF2D5C0, capelli: CAP, maglia: 0xDDF7A0, pantaloni: 0xEDE6D8, scarpe: 0x4A3020, conZaino: false,
    volto: voltoChiara(),
  });
  p.radice.scale.setScalar(0.8 * 0.9);
  for (const s of [-1, 1]) {
    // Riga in mezzo: due bande che scendono ai lati della fronte, sopra le sopracciglia (il viso resta scoperto).
    const ciocca = blocco(0.2, 0.1, 0.07, CAP, s * 0.12, 0.12, -0.228);
    ciocca.rotation.z = s * -0.25;
    p.testa.add(ciocca);
    p.testa.add(blocco(0.06, 0.2, 0.08, CAP, s * 0.205, -0.08, -0.19));
    p.testa.add(blocco(0.03, 0.14, 0.4, 0x3A2A20, s * 0.222, -0.16, 0.02));        // lati rasati
    p.superiore.add(blocco(0.16, 0.09, 0.05, 0xF1FBD2, s * 0.09, 1.64, -0.175));
  }
  for (const b of p.braccia) for (const dx of [-0.04, 0.035]) b.gomito.add(blocco(0.045, 0.035, 0.18, argento, dx, -0.39, 0));
  letteraSchiena(p, 'C', '#2F4A12', 1.48, 0.172, 0.4);
  return p;
}

export function creaAltoBiondo() {
  // Alto, chiarissimo, biondo cenere pettinato di lato; gilet di lana, camicia chiara e pantaloni a vita alta.
  const p = amico({ pelle: 0xF6E3D3, capelli: 0xC9B58E, iride: 0x8FB3C9, donna: false, maglia: 0xEFE8D6, pantaloni: 0x6B5E4E, scarpe: 0x4A3020, acconciatura: 'lato' }, 1.13);
  const gilet = 0x8A6A3F, filo = 0x6C5230;
  p.superiore.add(blocco(0.6, 0.68, 0.36, gilet, 0, 1.0));
  p.superiore.add(blocco(0.22, 0.14, 0.02, 0xEFE8D6, 0, 1.52, -0.19));               // colletto della camicia che spunta
  p.superiore.add(blocco(0.04, 0.66, 0.02, filo, 0, 1.0, -0.19));
  p.corpo.add(blocco(0.56, 0.2, 0.34, 0x6B5E4E, 0, 0.84));                          // cintura alta
  letteraSchiena(p, 'W', '#F3E9CC', 1.34, 0.182, 0.46);
  return p;
}

// ---------------------------------------------------------------------------
// Il gruppo di amici (sette): un'unica lista in ordine di descrizione
// ---------------------------------------------------------------------------

export function creaGruppoAmici() {
  const gruppo = [];

  // 1 · Alto, grosso, occhiali, capelli corti ricci neri.
  {
    const p = amico({ pelle: 0xE4BE9A, capelli: 0x14100D, iride: 0x2B1D14, donna: false, maglia: 0x3E4A5C, pantaloni: 0x2B2E36, occhiali: true, acconciatura: 'ricci', corpulenza: 1.25 }, 1.16);
    gruppo.push(p);
  }
  // 2 · Un po' più basso, biondo cenere, lisci con la riga in mezzo che si apre ai lati, chiaro di pelle.
  {
    const CAP = 0xC8B08A;
    const p = amico({ pelle: 0xF4DCC8, capelli: CAP, iride: 0x7FA0B8, donna: false, maglia: 0xA8B4C2, pantaloni: 0x3A3F4A }, 1.05);
    for (const s of [-1, 1]) {
      const banda = blocco(0.24, 0.1, 0.07, CAP, s * 0.12, 0.13, -0.225); banda.rotation.z = s * -0.3; p.testa.add(banda);
      p.testa.add(blocco(0.1, 0.34, 0.4, CAP, s * 0.245, -0.06, 0.0));
      p.testa.add(blocco(0.14, 0.12, 0.07, CAP, s * 0.17, -0.02, -0.225));
    }
    gruppo.push(p);
  }
  // 3 · Stessa altezza del secondo, biondo più chiaro, occhi chiari, un po' più lunghi e molto mossi, tutti da un lato.
  {
    const CAP = 0xE9D9A2;
    const p = amico({ pelle: 0xF2D6C0, capelli: CAP, iride: 0x6FB0E0, donna: false, maglia: 0x6F8E6A, pantaloni: 0x3B3A36, acconciatura: 'lato' }, 1.05);
    p.testa.add(blocco(0.46, 0.3, 0.12, CAP, 0, -0.14, 0.2));
    riccioli(p, CAP, [[-0.2, 0.22, -0.1], [-0.27, 0.1, -0.02], [-0.29, -0.05, -0.04], [-0.27, -0.2, 0.02], [-0.06, 0.28, -0.1], [0.12, 0.27, -0.04], [-0.18, 0.2, 0.08], [-0.26, -0.3, 0.06]], 0.085);
    gruppo.push(p);
  }
  // 4 · Occhiali, capelli castano chiaro, occhi verdi, alto quanto il terzo.
  {
    const p = amico({ pelle: 0xEDCBAA, capelli: 0x9C7A4F, iride: 0x4E9A5A, donna: false, maglia: 0x56705B, pantaloni: 0x4A4F5C, occhiali: true, acconciatura: 'ciuffo' }, 1.05);
    gruppo.push(p);
  }
  // 5 · Ragazza, capelli castano scuro lunghi e mossi (quasi ricci), occhi chiari.
  {
    const CAP = 0x4A2C1E;
    const p = amico({ pelle: 0xF1D0B5, capelli: CAP, iride: 0x8FBBC9, donna: true, maglia: 0xD7A6B5, pantaloni: 0x4A6FA5, corpulenza: 0.9 }, 0.97);
    capelliLunghi(p, CAP, 0.75, false);
    riccioli(p, CAP, [[-0.28, -0.35, 0.04], [0.28, -0.35, 0.04], [-0.26, -0.55, 0.08], [0.26, -0.55, 0.08], [0, -0.5, 0.26], [-0.2, -0.65, 0.18], [0.2, -0.65, 0.18], [0.0, 0.26, 0.05]], 0.1);
    gruppo.push(p);
  }
  // 6 · Ragazza, castano scuro, occhi scuri, lisci appena sotto le spalle.
  {
    const CAP = 0x3E2619;
    const p = amico({ pelle: 0xEACBB0, capelli: CAP, iride: 0x2B1D14, donna: true, maglia: 0x4F7F9B, pantaloni: 0x2F3340, corpulenza: 0.9 }, 0.97);
    capelliLunghi(p, CAP, 0.58, false);
    gruppo.push(p);
  }
  // 7 · Ragazza, capelli scuri corti sopra le spalle, occhi chiari.
  {
    const CAP = 0x2E211A;
    const p = amico({ pelle: 0xF0D4BE, capelli: CAP, iride: 0x9DB89A, donna: true, maglia: 0x8E7BB5, pantaloni: 0x34495E, corpulenza: 0.9 }, 0.95);
    capelliLunghi(p, CAP, 0.36, false);
    gruppo.push(p);
  }
  for (const p of gruppo) p.radice.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return gruppo;
}

// ---------------------------------------------------------------------------
// La ragazza che se ne va con il cugino: capelli lunghi castani e ricci, bella, alta quanto lui
// ---------------------------------------------------------------------------

export function creaRagazzaCugino() {
  const CAP = 0x5A3A22;
  const p = amico({ pelle: 0xF0CDB2, capelli: CAP, iride: 0x6A4A2A, donna: true, maglia: 0xF3EBDD, pantaloni: 0x6B84A8, scarpe: 0xF4F1EA, corpulenza: 0.9 }, 1);
  capelliLunghi(p, CAP, 0.82, false);
  riccioli(p, CAP, [[-0.28, -0.3, 0.04], [0.28, -0.3, 0.04], [-0.27, -0.52, 0.06], [0.27, -0.52, 0.06], [-0.2, -0.7, 0.14], [0.2, -0.7, 0.14], [0, -0.58, 0.26], [0, -0.78, 0.22], [-0.16, 0.25, -0.02], [0.16, 0.25, -0.02]], 0.1);
  p.radice.scale.set(0.66, 0.73, 0.68);          // alta quanto il cugino
  return p;
}

// ---------------------------------------------------------------------------
// Porta di un'aula sul lato sinistro del corridoio (Ia1, RWC) con l'anta che scorre via: si apre quando
// i personaggi escono o entrano. `apri(k)`: 0 chiusa, 1 aperta.
// ---------------------------------------------------------------------------

export function creaPortaScorrevole(testo) {
  const g = new THREE.Group();
  const X = -4.2, L = 1.3;
  g.add(blocco(0.1, 2.9, L + 0.3, 0x6E4524, X, 0, 0));                              // stipite
  const buio = new THREE.Mesh(new THREE.PlaneGeometry(L, 2.6), new THREE.MeshBasicMaterial({ color: 0x23262C }));
  buio.rotation.y = Math.PI / 2; buio.position.set(X + 0.08, 1.3, 0);
  g.add(buio);
  const perno = new THREE.Group();
  perno.position.set(X + 0.1, 0, L / 2);
  perno.add(blocco(0.1, 2.6, L, 0x8A5A34, 0, 0, -L / 2));
  perno.add(blocco(0.14, 0.1, 0.22, 0xD8B85A, 0.04, 1.15, -L + 0.2));
  g.add(perno);
  const targa = targaAula(testo, 0.9, 0.42);
  targa.position.set(-4.1, 3.25, 0); targa.rotation.y = Math.PI / 2;
  g.add(targa);
  g.userData.apri = k => { perno.scale.z = Math.max(0.04, 1 - k * 0.96); };
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}

// ---------------------------------------------------------------------------
// I cinque seduti sui gradoni, tutti con un cappello blu: una ragazza mora, una castana tendente al
// rosso, un ragazzo moro, Chiara e il ragazzo biondo chiaro. Ordine da sinistra a destra (dalla strada).
// ---------------------------------------------------------------------------

// Scritta bianca sul davanti del cappello (una sola texture per tutti).
let scrittaCap = null;
function cappelloBlu(p) {
  const t = p.testa;
  if (!scrittaCap) {
    scrittaCap = new THREE.MeshBasicMaterial({ transparent: true, map: tela(256, 80, (g, W, H) => {
      g.fillStyle = '#2F5FD0'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffffff'; g.font = `800 ${H * 0.78}px Arial, Helvetica, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NOCAP', W / 2, H * 0.54, W * 0.94);
    }) });
  }
  t.add(blocco(0.48, 0.15, 0.48, 0x2F5FD0, 0, 0.17, 0));
  t.add(blocco(0.4, 0.08, 0.4, 0x2F5FD0, 0, 0.32, 0));
  t.add(blocco(0.49, 0.05, 0.49, 0x1E3F9A, 0, 0.17, 0));                 // risvolto più scuro
  t.add(blocco(0.1, 0.1, 0.1, 0x6F9BF0, 0, 0.4, 0));                     // pon pon
  // Visiera davanti, leggermente piegata verso il basso, e "NOCAP" sulla fronte del cappello.
  const visiera = blocco(0.44, 0.04, 0.3, 0x1E3F9A, 0, 0.145, -0.37);
  visiera.rotation.x = -0.14;
  t.add(visiera);
  const scritta = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.125), scrittaCap);
  scritta.position.set(0, 0.265, -0.2475); scritta.rotation.y = Math.PI;
  t.add(scritta);
}

export function creaSedutiCappello() {
  const lista = [];
  {   // ragazza mora, capelli lunghi lisci
    const CAP = 0x2A1C14;
    const p = amico({ pelle: 0xEFCFB4, capelli: CAP, iride: 0x3A2618, donna: true, maglia: 0xC9556A, pantaloni: 0x3A4458, corpulenza: 0.9 }, 0.97);
    capelliLunghi(p, CAP, 0.6, false);
    lista.push(p);
  }
  {   // ragazza castana tendente al rosso, capelli mossi
    const CAP = 0x8A4528;
    const p = amico({ pelle: 0xF4D8C3, capelli: CAP, iride: 0x6A8A52, donna: true, maglia: 0xEDE3C8, pantaloni: 0x4A5F7E, corpulenza: 0.9 }, 0.97);
    capelliLunghi(p, CAP, 0.5, false);
    riccioli(p, CAP, [[-0.28, -0.3, 0.05], [0.28, -0.3, 0.05], [-0.26, -0.5, 0.08], [0.26, -0.5, 0.08]], 0.09);
    lista.push(p);
  }
  {   // ragazzo moro, capelli corti
    const p = amico({ pelle: 0xE2BA96, capelli: 0x1C1511, iride: 0x2B1D14, donna: false, maglia: 0x555E6B, pantaloni: 0x2F3340 }, 1.03);
    lista.push(p);
  }
  lista.push(creaChiaraAmica());
  lista.push(creaAltoBiondo());
  for (const p of lista) cappelloBlu(p);
  return lista;
}
