// Il percorso: una linea che sale, scende e curva. Ogni sezione dichiara lunghezza, pendenza
// (metri di dislivello per metro, positiva in salita), curva totale (radianti, positiva a destra)
// e ambiente ('est' o 'int'). Qui si ricavano posizione, direzione e quota in ogni punto.
//
// Convenzioni: la direzione iniziale è verso -z. Con heading ψ il vettore avanti è (sin ψ, -cos ψ)
// e il vettore destra è (cos ψ, sin ψ).

const PASSO = 1;               // metri tra un campione e il successivo
const FINESTRA_PEND = 10;      // sfumatura delle pendenze, per non avere spigoli
const FINESTRA_CURVA = 8;

function sfuma(v, mezza) {
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    let somma = 0, n = 0;
    for (let k = -mezza; k <= mezza; k++) {
      const j = i + k;
      if (j >= 0 && j < v.length) { somma += v[j]; n++; }
    }
    out[i] = somma / n;
  }
  return out;
}

// `sezioni`: lista piatta con `inizio`/`fine` già calcolati. `extra`: metri dopo il traguardo.
export function costruisciPercorso(sezioni, extra = 260) {
  const totale = sezioni[sezioni.length - 1].fine;
  const N = Math.ceil(totale / PASSO) + extra + 2;
  const pend = new Float32Array(N);
  const giro = new Float32Array(N);
  const interno = new Uint8Array(N);

  for (const s of sezioni) {
    for (let i = Math.floor(s.inizio / PASSO); i < Math.min(N, Math.floor(s.fine / PASSO)); i++) {
      pend[i] = s.pend ?? 0;
      giro[i] = (s.curva ?? 0) / (s.lung / PASSO);
      interno[i] = s.amb === 'int' ? 1 : 0;
    }
  }
  const p = sfuma(pend, FINESTRA_PEND);
  const g = sfuma(giro, FINESTRA_CURVA);

  const X = new Float32Array(N), Z = new Float32Array(N), PSI = new Float32Array(N), H = new Float32Array(N);
  for (let i = 0; i < N - 1; i++) {
    PSI[i + 1] = PSI[i] + g[i];
    X[i + 1] = X[i] + Math.sin(PSI[i]) * PASSO;
    Z[i + 1] = Z[i] - Math.cos(PSI[i]) * PASSO;
    H[i + 1] = H[i] + p[i] * PASSO;
  }

  function indice(d) {
    return Math.min(N - 2, Math.max(0, Math.floor(d / PASSO)));
  }

  // Scrive in `out` il punto della linea centrale a distanza d.
  function punto(d, out = {}) {
    if (d < 0) {
      // Prima dell'inizio il tracciato prosegue all'indietro lungo la direzione iniziale.
      out.x = X[0] + Math.sin(PSI[0]) * d;
      out.z = Z[0] - Math.cos(PSI[0]) * d;
      out.psi = PSI[0];
      out.h = H[0] + p[0] * d;
      out.pend = p[0];
      out.interno = interno[0];
      return out;
    }
    const i = indice(d);
    const t = Math.min(1, Math.max(0, d / PASSO - i));
    out.x = X[i] + (X[i + 1] - X[i]) * t;
    out.z = Z[i] + (Z[i + 1] - Z[i]) * t;
    out.psi = PSI[i] + (PSI[i + 1] - PSI[i]) * t;
    out.h = H[i] + (H[i + 1] - H[i]) * t;
    out.pend = p[i];
    out.interno = interno[i];
    return out;
  }

  // Quanto si è "dentro" a una distanza, da 0 a 1, con transizione morbida (per luci e nebbia).
  function quantoInterno(d, raggio = 8) {
    let somma = 0, n = 0;
    for (let k = -raggio; k <= raggio; k += 2) {
      somma += interno[indice(d + k)]; n++;
    }
    return somma / n;
  }

  function sezioneIn(d) {
    let a = 0, b = sezioni.length - 1;
    while (a < b) {
      const m = (a + b + 1) >> 1;
      if (sezioni[m].inizio <= d) a = m; else b = m - 1;
    }
    return sezioni[a];
  }

  return { punto, quantoInterno, sezioneIn, totale, N };
}
