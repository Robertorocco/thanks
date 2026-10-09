// Il volto gigante della ragazza di Roberto (ultimo boss), dipinto su tela: capelli lunghi lisci scuri con la
// riga di lato, pelle chiara, occhi scuri, e il "ciuffetto": una ciocca frontale corta (a metà fronte) che si
// stacca dal resto dei capelli, come una mezza frangetta più corta.
// `dipingi({ espr, chiusi, ciuffo })` restituisce la tela; espressioni: neutro, sfida, musetto, urlo, bacio, ride.

export const VOLTO_W = 768, VOLTO_H = 864;
// Punto dove sta il ciuffetto sulla tela (serve per la mano che lo stacca): ritorna in coordinate 0..1.
export const CIUFFETTO = { x: 372 / VOLTO_W, y: 190 / VOLTO_H };

const C = {
  capello: '#2A1912', capelloChiaro: '#5A3A28', capelloMedio: '#3A241A',
  pelle: '#EDBE9C', pelleOmbra: '#D79E7C', pelleLuce: '#F7D3B6',
  occhio: '#4A2A16', ciglia: '#1B100B', labbro: '#C8736B', labbroScuro: '#A8524C', maglia: '#17322E',
};

const percorso = (g, pts) => {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p.length === 6) g.bezierCurveTo(...p); else if (p.length === 4) g.quadraticCurveTo(...p); else g.lineTo(p[0], p[1]);
  }
};

export function dipingi({ espr = 'neutro', chiusi = false, ciuffo = true } = {}) {
  const c = document.createElement('canvas');
  c.width = VOLTO_W; c.height = VOLTO_H;
  const g = c.getContext('2d');
  const CX = 384;
  g.lineCap = 'round'; g.lineJoin = 'round';

  // --- Capelli dietro: una massa lunga e liscia che scende oltre le spalle ---
  percorso(g, [[CX, 14], [128, 16, 36, 190, 48, 440], [58, 640, 22, 790, 36, 864], [732, 864], [746, 790, 710, 640, 720, 440], [732, 190, 640, 16, CX, 14]]);
  g.fillStyle = C.capello; g.fill();

  // --- Collo e maglia scura ---
  percorso(g, [[318, 620], [450, 620], [452, 800], [316, 800]]);
  g.fillStyle = C.pelleOmbra; g.fill();
  percorso(g, [[120, 864], [190, 800, 300, 772, 318, 770], [350, 830, 418, 830, 450, 770], [470, 772, 580, 800, 648, 864]]);
  g.fillStyle = C.maglia; g.fill();
  // scollo
  percorso(g, [[318, 770], [350, 826, 418, 826, 450, 770], [440, 770], [384, 800], [328, 770]]);
  g.fillStyle = C.pelle; g.fill();

  // --- Il viso: ovale un po' stretto verso il mento ---
  const viso = [[384, 166], [524, 166, 580, 290, 576, 420], [572, 548, 520, 684, 384, 712], [248, 684, 196, 548, 192, 420], [188, 290, 244, 166, 384, 166]];
  percorso(g, viso);
  const pelle = g.createRadialGradient(384, 330, 40, 384, 440, 320);
  pelle.addColorStop(0, C.pelleLuce); pelle.addColorStop(0.5, C.pelle); pelle.addColorStop(1, C.pelleOmbra);
  g.fillStyle = pelle; g.fill();

  const urla = espr === 'urlo';
  const occhiChiusi = chiusi || espr === 'bacio' || espr === 'ride' || urla;
  const musetto = espr === 'musetto';
  const sfida = espr === 'sfida';

  // Guance arrossate
  const rosso = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  rosso.addColorStop(0, 'rgba(236,110,110,0.55)'); rosso.addColorStop(1, 'rgba(236,110,110,0)');
  for (const [x, y, k] of [[268, 540, musetto || urla ? 1.35 : 1], [500, 540, musetto || urla ? 1.35 : 1]]) {
    g.save(); g.translate(x, y); g.scale(62 * k, 36 * k); g.fillStyle = rosso; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
  }
  if (urla) { g.fillStyle = 'rgba(230,80,80,0.16)'; percorso(g, viso); g.fill(); }

  // --- Occhi ---
  const occhio = (x, lato) => {
    const y = 410;
    if (occhiChiusi) {
      g.strokeStyle = C.ciglia; g.lineWidth = 11;
      g.beginPath();
      if (urla) { g.moveTo(x - lato * 46, y - 18); g.lineTo(x + lato * 40, y + 6); g.lineTo(x - lato * 46, y + 24); }
      else if (espr === 'ride') { g.moveTo(x - 46, y + 12); g.quadraticCurveTo(x, y - 34, x + 46, y + 12); }
      else { g.moveTo(x - 46, y - 4); g.quadraticCurveTo(x, y + 30, x + 46, y - 4); }
      g.stroke();
      return;
    }
    const grande = (musetto ? 1.15 : 1) * 1.18, soc = sfida ? 0.86 : 1;
    g.save(); g.translate(x, y); g.scale(grande, soc * grande);
    // bianco a mandorla
    percorso(g, [[-50, 4], [-24, -26, 24, -26, 50, 2], [26, 28, -26, 28, -50, 4]]);
    g.fillStyle = '#FFFFFF'; g.fill();
    g.save(); percorso(g, [[-50, 4], [-24, -26, 24, -26, 50, 2], [26, 28, -26, 28, -50, 4]]); g.clip();
    g.fillStyle = C.occhio; g.beginPath(); g.arc(lato * -2, 2, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#120A06'; g.beginPath(); g.arc(lato * -2, 2, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(lato * -2 + 9, -8, 7, 0, Math.PI * 2); g.fill();
    if (musetto) { g.beginPath(); g.arc(lato * -2 - 8, 10, 4, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // palpebra e ciglia
    g.strokeStyle = C.ciglia; g.lineWidth = 9;
    g.beginPath(); g.moveTo(-54, 6); g.quadraticCurveTo(0, -42, 54, 2); g.stroke();
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(-lato * 50, 0); g.lineTo(-lato * 68, -14); g.stroke();
    g.beginPath(); g.moveTo(-lato * 44, -10); g.lineTo(-lato * 58, -26); g.stroke();
    g.strokeStyle = 'rgba(120,70,50,0.45)'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-44, 32); g.quadraticCurveTo(0, 46, 44, 32); g.stroke();
    g.restore();
  };
  occhio(278, 1); occhio(490, -1);

  // --- Sopracciglia: sottili e ad arco ---
  g.strokeStyle = C.capelloMedio; g.lineWidth = 15;
  const sopr = (x0, y0, xp, yp, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(xp, yp, x1, y1); g.stroke(); };
  if (urla) { sopr(220, 336, 278, 340, 340, 372); sopr(552, 336, 492, 340, 430, 372); }
  else if (musetto) { sopr(220, 340, 278, 312, 340, 322); sopr(552, 340, 492, 312, 428, 322); }
  else if (sfida) { sopr(220, 356, 278, 336, 340, 350); sopr(428, 336, 494, 296, 552, 330); }
  else { sopr(220, 356, 278, 322, 340, 342); sopr(428, 342, 492, 322, 552, 356); }

  // --- Naso: ombra sul lato e narici ---
  g.strokeStyle = 'rgba(150,90,66,0.35)'; g.lineWidth = 8;
  g.beginPath(); g.moveTo(398, 410); g.quadraticCurveTo(414, 470, 410, 512); g.stroke();
  g.fillStyle = 'rgba(247,214,186,0.5)'; g.beginPath(); g.ellipse(384, 498, 14, 20, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(120,64,48,0.7)'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(352, 526); g.quadraticCurveTo(364, 540, 378, 530); g.stroke();
  g.beginPath(); g.moveTo(414, 530); g.quadraticCurveTo(428, 540, 440, 526); g.stroke();

  // --- Bocca ---
  const bx = 384, by = 604;
  if (urla) {
    percorso(g, [[bx - 96, by - 40], [bx - 70, by - 74, bx + 70, by - 74, bx + 96, by - 40], [bx + 120, by + 90, bx + 40, by + 200, bx, by + 200], [bx - 40, by + 200, bx - 120, by + 90, bx - 96, by - 40]]);
    g.fillStyle = '#4A0E12'; g.fill();
    g.save(); g.clip();
    g.fillStyle = '#E87A8A'; g.beginPath(); g.ellipse(bx, by + 160, 70, 52, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    g.fillStyle = '#FFFFFF'; percorso(g, [[bx - 84, by - 42], [bx, by - 66, bx, by - 66, bx + 84, by - 42], [bx + 70, by - 4], [bx - 70, by - 4]]); g.fill();
    g.strokeStyle = C.labbroScuro; g.lineWidth = 12;
    percorso(g, [[bx - 96, by - 40], [bx - 70, by - 74, bx + 70, by - 74, bx + 96, by - 40]]); g.stroke();
    g.strokeStyle = 'rgba(120,60,50,0.5)'; g.lineWidth = 6;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(bx + s * 150, by - 60); g.quadraticCurveTo(bx + s * 170, by, bx + s * 140, by + 70); g.stroke(); }
  } else if (musetto || espr === 'bacio') {
    // Labbra in avanti, piccole e tonde: il "musetto"
    const w = musetto ? 46 : 40;
    g.fillStyle = C.labbro;
    g.beginPath(); g.ellipse(bx, by + 4, w, 32, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.labbroScuro; g.beginPath(); g.ellipse(bx, by + 4, w * 0.5, 7, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(150,70,64,0.55)'; g.lineWidth = 4;
    for (const a of [-0.9, -0.3, 0.3, 0.9]) { g.beginPath(); g.moveTo(bx + Math.sin(a) * w * 0.55, by + 4 + Math.cos(a) * 12); g.lineTo(bx + Math.sin(a) * w * 0.95, by + 4 + Math.cos(a) * 24); g.stroke(); }
    g.fillStyle = 'rgba(255,230,230,0.55)'; g.beginPath(); g.ellipse(bx - 12, by - 8, 14, 7, -0.3, 0, Math.PI * 2); g.fill();
  } else if (espr === 'ride') {
    percorso(g, [[bx - 92, by - 30], [bx - 50, by - 12, bx + 50, by - 12, bx + 92, by - 30], [bx + 80, by + 70, bx + 30, by + 100, bx, by + 100], [bx - 30, by + 100, bx - 80, by + 70, bx - 92, by - 30]]);
    g.fillStyle = '#6A1A20'; g.fill();
    g.fillStyle = '#FFFFFF'; percorso(g, [[bx - 82, by - 26], [bx, by - 8, bx, by - 8, bx + 82, by - 26], [bx + 70, by + 8], [bx - 70, by + 8]]); g.fill();
    g.strokeStyle = C.labbroScuro; g.lineWidth = 9;
    percorso(g, [[bx - 92, by - 30], [bx - 50, by - 12, bx + 50, by - 12, bx + 92, by - 30]]); g.stroke();
  } else {
    // sorriso a bocca chiusa: labbro superiore, inferiore più pieno, angoli un po' su
    const su = sfida ? 14 : 0;
    percorso(g, [[bx - 82, by - 8 - (sfida ? 2 : 0)], [bx - 40, by - 24, bx - 12, by - 28, bx, by - 20], [bx + 12, by - 28, bx + 44, by - 22, bx + 86, by - 8 - su], [bx + 40, by + 8, bx - 40, by + 8, bx - 82, by - 8]]);
    g.fillStyle = C.labbro; g.fill();
    percorso(g, [[bx - 80, by - 6], [bx - 40, by + 44, bx + 40, by + 44, bx + 84, by - 6 - su], [bx + 40, by + 6, bx - 40, by + 6, bx - 80, by - 6]]);
    g.fillStyle = '#D9857C'; g.fill();
    g.strokeStyle = C.labbroScuro; g.lineWidth = 6;
    percorso(g, [[bx - 84, by - 8 - (sfida ? 2 : 0)], [bx - 40, by + 8, bx + 40, by + 8, bx + 88, by - 8 - su]]); g.stroke();
    g.fillStyle = 'rgba(255,235,230,0.5)'; g.beginPath(); g.ellipse(bx - 8, by + 24, 20, 6, 0, 0, Math.PI * 2); g.fill();
    // fossette
    g.strokeStyle = 'rgba(150,90,66,0.35)'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(bx - 100, by - 14); g.quadraticCurveTo(bx - 112, by, bx - 100, by + 14); g.stroke();
    g.beginPath(); g.moveTo(bx + 104 - su, by - 14 - su); g.quadraticCurveTo(bx + 116 - su, by - su, bx + 104 - su, by + 14 - su); g.stroke();
  }
  // fossetta sul mento
  g.fillStyle = 'rgba(190,130,104,0.35)'; g.beginPath(); g.ellipse(bx, by + 96, 18, 10, 0, 0, Math.PI * 2); g.fill();

  // --- Capelli davanti: due tendine dalla riga di lato, che coprono le orecchie e scendono lisce ---
  const riga = [338, 106];
  const tendina = (pts, colore) => { percorso(g, pts); g.fillStyle = colore; g.fill(); };
  // sinistra (la riga è un po' spostata a sinistra, quindi questa è più piccola)
  tendina([riga, [264, 128, 214, 210, 204, 316], [192, 430, 204, 520, 214, 600], [196, 640, 170, 760, 150, 864], [30, 864], [36, 440], [60, 200, 200, 30, 338, 18], [338, 80], riga], C.capello);
  // destra
  tendina([riga, [440, 118, 520, 170, 552, 262], [578, 360, 574, 470, 570, 560], [572, 640, 596, 760, 620, 864], [740, 864], [722, 440], [708, 200, 600, 30, 400, 18], [346, 70], riga], C.capello);
  // riflessi sui capelli
  g.lineWidth = 7; g.strokeStyle = C.capelloChiaro;
  const ciocca = (x0, y0, x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke(); };
  ciocca(300, 80, 230, 160, 208, 280); ciocca(196, 440, 176, 640, 160, 820); ciocca(90, 300, 74, 560, 80, 840);
  for (const [x0, k] of [[140, 1], [112, 2], [170, 3], [610, 1], [640, 2], [585, 3]]) ciocca(x0, 320 + k * 20, x0 - 6 * k, 560, x0 - 10 * k, 850);
  ciocca(250, 60, 190, 130, 150, 260); ciocca(480, 70, 580, 150, 640, 280); ciocca(120, 60, 70, 220, 60, 400);
  ciocca(430, 100, 520, 170, 550, 300); ciocca(572, 470, 586, 660, 606, 830); ciocca(660, 320, 676, 580, 664, 840);

  // --- Il ciuffetto: ciocca corta (a metà fronte) separata dai capelli ---
  if (ciuffo) {
    percorso(g, [[360, 134], [346, 172, 364, 214, 394, 258], [402, 208, 396, 168, 388, 134], [378, 126, 364, 126, 360, 134]]);
    g.fillStyle = C.capello; g.fill();
    g.strokeStyle = C.capelloChiaro; g.lineWidth = 3;
    g.beginPath(); g.moveTo(374, 150); g.quadraticCurveTo(372, 190, 386, 226); g.stroke();
  }
  return c;
}

// La mano che si stacca il ciuffetto: pizzica una ciocca (con o senza), con due braccialetti d'argento al polso.
export function dipingiMano(conCiocca = true) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';
  // polso e avambraccio (arriva dal basso)
  g.fillStyle = C.pelleOmbra; g.fillRect(96, 200, 66, 120);
  g.fillStyle = C.pelle; g.fillRect(100, 200, 58, 120);
  // palmo
  percorso(g, [[84, 214], [78, 150, 96, 120, 128, 116], [166, 120, 184, 150, 176, 214], [150, 236, 112, 236, 84, 214]]);
  g.fillStyle = C.pelle; g.fill();
  // dita: indice e pollice si chiudono a pinza in alto, le altre ripiegate
  g.strokeStyle = C.pelle; g.lineWidth = 26;
  g.beginPath(); g.moveTo(112, 130); g.quadraticCurveTo(100, 80, 126, 40); g.stroke();                // indice
  g.beginPath(); g.moveTo(86, 190); g.quadraticCurveTo(64, 120, 112, 52); g.stroke();                 // pollice
  g.lineWidth = 22;
  for (const [x, y] of [[138, 124], [158, 134], [172, 152]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 34, x - 6, y - 40); g.stroke(); }
  g.strokeStyle = 'rgba(150,90,66,0.5)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(104, 120); g.quadraticCurveTo(96, 86, 114, 56); g.stroke();
  // unghie
  g.fillStyle = '#F4C9B6';
  for (const [x, y] of [[124, 42], [112, 54]]) { g.beginPath(); g.ellipse(x, y, 7, 10, 0.3, 0, Math.PI * 2); g.fill(); }
  // la ciocca tra le dita
  if (conCiocca) {
    g.strokeStyle = C.capello; g.lineWidth = 9;
    g.beginPath(); g.moveTo(118, 46); g.quadraticCurveTo(124, 18, 112, 0); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(118, 46); g.quadraticCurveTo(110, 70, 122, 96); g.stroke();
  }
  // braccialetti d'argento
  for (const y of [236, 256]) {
    g.fillStyle = '#C9CED6'; g.fillRect(92, y, 74, 11);
    g.fillStyle = '#F2F5F8'; g.fillRect(92, y, 74, 4);
  }
  return c;
}
