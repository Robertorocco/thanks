// Generazione del percorso di gioco: ostacoli, caffè e scenografia, in ordine di distanza.
// Tutti i partecipanti corrono lo stesso tracciato (generatore pseudo-casuale con seme).

import { TRAGUARDO } from './mondi.js';

export const CORSIE = [-2.2, 0, 2.2];
// Un compagno ti viene incontro: la sua distanza dal giocatore si accorcia del 30% in più.
export const VELOCITA_COMPAGNI = 0.3;
export const ANTICIPO_COMPAGNI = 70;
export const PENDENZA_CROCIERA = 0.4;   // metri di spostamento laterale per metro di avvicinamento

export function rng(seme) {
  return () => {
    seme |= 0; seme = (seme + 0x6D2B79F5) | 0;
    let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mescola(lista, r) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

// Lunghezza di ogni ostacolo lungo la corsa, per stile.
const PROF = {
  liceo:      { basso: 0.7, alto: 0.6, muro: 4.2, buco: 1.8, crociera: 2.0 },
  liceoInt:   { basso: 0.8, alto: 0.5, muro: 1.6, buco: 1.6, persona: 0.7 },
  _:          { basso: 0.8, alto: 0.4, muro: 0.9 },
};
const profondita = (stile, tipo, e = {}) => (PROF[stile] ?? PROF._)[tipo] ?? 0.9;

export function generaLivello(TRATTI, perc, velocitaIn) {
  const ENTITA = [];

  for (const t of TRATTI) {
    const r = rng(1009 + t.indice * 7919);
    const diff = t.indice / (TRATTI.length - 1);   // 0 nel primo mondo, 1 nell'ultimo
    const sezioni = t.sezioni ?? [{ id: 'tutto', inizio: t.inizio, fine: t.fine, amb: 'est' }];

    // --- Elementi base -----------------------------------------------------
    const ostacolo = (d, corsia, tipo, stile, extra = {}) => {
      const prof = extra.prof ?? profondita(stile, tipo);
      ENTITA.push({ d, genere: 'ostacolo', tipo, corsia, profondita: prof, stile, mondo: t.indice, var: Math.floor(r() * 16), ...extra });
    };
    const caffe = (d, corsia) => ENTITA.push({ d, genere: 'caffe', corsia, mondo: t.indice });
    const azione = permessi => {
      const a = permessi.filter(x => x !== 'muro');
      return a[Math.floor(r() * a.length)];
    };

    // Quante corsie sono già chiuse vicino a d (muri, auto, compagni, auto che attraversano).
    const bloccate = (d, finestra) => {
      const set = new Set();
      for (const e of ENTITA) {
        if (e.genere !== 'ostacolo') continue;
        const dd = e.tipo === 'persona' ? e.d - VELOCITA_COMPAGNI / (1 + VELOCITA_COMPAGNI) * ANTICIPO_COMPAGNI : e.d;
        if (Math.abs(dd - d) > finestra + e.profondita / 2) continue;
        if (e.tipo === 'muro' || e.tipo === 'persona') set.add(e.corsia);
        if (e.tipo === 'crociera') (e.dir > 0 ? [0, 1] : [1, 2]).forEach(c => set.add(c));
      }
      return set;
    };

    // Chiude le corsie con muri di lunghezza `lungo`; quella libera si sposta di una corsia alla volta.
    function corridoio(d, o) {
      const tratti = 3 + Math.floor(r() * (2 + diff * 2));
      let libera = Math.floor(r() * 3);
      for (let i = 0; i < tratti; i++) {
        const v = velocitaIn(d);
        const lungo = v * (0.8 + r() * 0.4);
        const centro = d + lungo / 2;
        for (const c of [0, 1, 2]) if (c !== libera) ostacolo(centro, c, 'muro', o.stile, { prof: lungo, var: 0, lungo: true });
        if (lungo > 10 && r() < 0.3 + 0.4 * diff) ostacolo(centro, libera, azione(o.tipi), o.stile);
        else if (r() < 0.6) caffe(centro, libera);
        d += lungo + v * 0.55;
        const mosse = [libera - 1, libera + 1].filter(c => c >= 0 && c <= 2);
        libera = mosse[Math.floor(r() * mosse.length)];
      }
      return d;
    }

    // Riempie [a, b) di ostacoli. Opzioni: stile, tipi ammessi, spaziatura, schemi permessi.
    function riempi(a, b, o) {
      const tipiPieni = o.tipi.filter(x => x !== 'persona');
      const pesca = () => tipiPieni[Math.floor(r() * tipiPieni.length)];
      let d = a;
      while (d < b) {
        const v = velocitaIn(d);
        const corsie = mescola([0, 1, 2], r);
        const x = r();
        const pCorr = o.corridoi === true ? 0.12 + 0.12 * diff : (o.corridoi || 0);
        const pMur = pCorr + (tipiPieni.includes('muro') ? 0.16 + 0.1 * diff : 0);
        const pBar = pMur + (o.barriere === false ? 0 : 0.12 + 0.08 * diff);
        const pDop = pBar + 0.3;
        const azioni = tipiPieni.filter(x => x !== 'muro');

        if (x < pCorr && d + v * 6 < b) {
          d = corridoio(d, o);
        } else if (x < pMur) {
          ostacolo(d, corsie[0], 'muro', o.stile);
          ostacolo(d, corsie[1], 'muro', o.stile);
          if (azioni.length && r() < 0.5 + 0.3 * diff) ostacolo(d, corsie[2], azione(tipiPieni), o.stile);
          else caffe(d, corsie[2]);
        } else if (x < pBar && azioni.length) {
          const tutti = r() < 0.6 ? azione(tipiPieni) : null;
          for (const c of corsie) ostacolo(d, c, tutti ?? azione(tipiPieni), o.stile);
        } else if (x < pDop) {
          ostacolo(d, corsie[0], pesca(), o.stile);
          ostacolo(d, corsie[1], pesca(), o.stile);
          if (r() < 0.6) caffe(d, corsie[2]);
        } else {
          ostacolo(d, corsie[0], pesca(), o.stile);
          if (r() < 0.6) caffe(d, corsie[1 + Math.floor(r() * 2)]);
        }
        d += velocitaIn(d) * (o.spazio ?? 1) * (1.05 - 0.15 * diff + r() * 0.45);
      }
    }

    // Compagni che vengono incontro: `n` persone sparse in [a, b), sempre con una corsia libera.
    function compagni(a, b, n, stile = 'liceoInt') {
      for (let i = 0; i < n; i++) {
        const d0 = a + (b - a) * ((i + 0.3 + r() * 0.5) / n);
        const dMeet = d0 - VELOCITA_COMPAGNI / (1 + VELOCITA_COMPAGNI) * ANTICIPO_COMPAGNI;
        if (dMeet < a - 4) continue;
        const bl = bloccate(dMeet, 10);
        const libere = [0, 1, 2].filter(c => !bl.has(c));
        if (libere.length < 2) continue;
        const corsia = libere[Math.floor(r() * libere.length)];
        ostacolo(d0, corsia, 'persona', stile, { d0 });
      }
    }

    // --- Sezioni -----------------------------------------------------------
    for (const sz of sezioni) {
      const a = sz.inizio, b = sz.fine;
      const int = sz.amb === 'int';
      const stileOst = t.stile === 'liceo' ? (int ? 'liceoInt' : 'liceo') : t.stile;

      if (!t.sezioni) {
        riempi(a + 45, b - 30, { stile: stileOst, tipi: ['basso', 'alto', 'muro'], corridoi: true });
        continue;
      }

      // Ostacoli, sezione per sezione (mondo del liceo).
      switch (sz.id) {
        case 'salita': {
          // Incroci con semaforo: in uno le auto attraversano, nell'altro è verde.
          const incroci = [{ d: 118, rosso: true }, { d: 205, rosso: false }, { d: 288, rosso: true }];
          for (const inc of incroci) {
            ENTITA.push({ d: inc.d, genere: 'semaforo', rosso: inc.rosso, mondo: t.indice, stile: 'liceo' });
            if (inc.rosso) {
              const dir = r() < 0.5 ? 1 : -1;
              ostacolo(inc.d, dir > 0 ? 0 : 2, 'crociera', 'liceo', { dir, var: Math.floor(r() * 8) });
            }
          }
          const liberi = [[a + 45, 100], [138, 190], [222, 272], [306, b]];
          for (const [x0, x1] of liberi) riempi(x0, x1, { stile: 'liceo', tipi: ['muro', 'muro', 'basso', 'alto', 'buco'], corridoi: 0.2 });
          break;
        }
        case 'avvicinamento':
          riempi(a + 25, b - 70, { stile: 'liceo', tipi: ['muro', 'buco', 'basso'], corridoi: 0.12, spazio: 1.4 });
          break;
        case 'hall':
          riempi(a + 14, b - 6, { stile: 'liceoInt', tipi: ['basso', 'muro', 'buco'], corridoi: true, spazio: 1.1 });
          compagni(a + 4, b, 2);
          break;
        case 'scale1': case 'scale2':
          compagni(a + 2, b - 2, 3);
          riempi(a + 6, b - 8, { stile: 'liceoInt', tipi: ['buco'], barriere: false, corridoi: false, spazio: 1.4 });
          break;
        case 'curva1': case 'curva2': case 'curva3':
          compagni(a + 2, b, 1);
          break;
        case 'corridoio': case 'corridoio5H':
          riempi(a + 6, b - (sz.id === 'corridoio5H' ? 16 : 6), { stile: 'liceoInt', tipi: ['basso', 'alto', 'muro', 'buco'], corridoi: true, spazio: 1.1 });
          compagni(a + 4, b - 12, sz.id === 'corridoio' ? 3 : 2);
          break;
        case 'uscita':
          // Dopo la scena in aula la corsa riparte in un tratto libero: nessun ostacolo per i primi ~45 m.
          break;
        case 'scale-giu':
          compagni(a + 20, b - 2, 3);
          break;
        case 'discesa': case 'curva4': case 'rettilineo': case 'curva5':
          riempi(a + (sz.id === 'discesa' ? 14 : 4), b - 4, { stile: 'liceo', tipi: ['muro', 'basso', 'alto', 'buco'], corridoi: 0.16, spazio: 1.1 });
          break;
        case 'fine':
          riempi(a + 4, b - 18, { stile: 'liceo', tipi: ['muro', 'basso', 'buco'], corridoi: false, spazio: 1.2 });
          break;
        default: break;
      }

      // Scenografia degli interni -------------------------------------------
      if (int) {
        const primo = Math.floor(a / 3) * 3;
        for (let q = primo, i = 0; q < b; q += 3, i++) {
          const k = Math.round(q / 3);
          for (const lato of [-1, 1]) ENTITA.push({ d: q + 1.5, genere: 'parete', lato, idx: k + (lato > 0 ? 1 : 0), mondo: t.indice });
          ENTITA.push({ d: q + 1.5, genere: 'soffitto', luce: k % 3 === 0, mondo: t.indice });
        }
        if (sz.piano) ENTITA.push({ d: sz.id === 'corridoio' ? a + 5 : b - 6, genere: 'cartello', testo: sz.piano.toUpperCase(), mondo: t.indice, w: 3.4 });
        if (sz.verso5H && sz.id === 'curva3') {
          ENTITA.push({ d: a - 8, genere: 'cartello', testo: '5ª H →', mondo: t.indice, w: 3.0, colore: 0x1F58B8 });
          ENTITA.push({ d: b - 8, genere: 'cartello', testo: '5ª H', mondo: t.indice, w: 2.6, colore: 0x1F58B8 });
        }
        if (sz.id === 'corridoio5H') ENTITA.push({ d: a + 22, genere: 'cartello', testo: '5ª H', mondo: t.indice, w: 2.6, colore: 0x1F58B8 });
        if (sz.id === 'aula') ENTITA.push({ d: b, genere: 'portaAula', mondo: t.indice });
        if (sz.id === 'portone') ENTITA.push({ d: b - 1.2, genere: 'portone', mondo: t.indice });
      } else {
        // Edifici, lampioni e alberi lungo la strada. Vicino alla scuola restano bassi e lontani.
        const vicinoScuola = sz.id === 'avvicinamento';
        // Agli incroci con semaforo la strada trasversale resta libera da edifici e alberi.
        const incrocio = q => ENTITA.some(x => x.genere === 'semaforo' && x.mondo === t.indice && Math.abs(x.d - q) < 15);
        for (let q = a - (a === 0 ? 28 : 0); q < b; q += 7) {
          if (t.sezioni && q > 596 && q < 700 && t.stile === 'liceo') continue;
          if (incrocio(q)) continue;
          for (const lato of [-1, 1]) {
            if (r() < 0.15) continue;
            ENTITA.push({
              d: q + r() * 3, genere: 'edificio', lato, mondo: t.indice, stile: stileOst,
              larghezza: 3 + r() * 3,
              altezza: vicinoScuola ? 3.5 + r() * 3.5 : 4 + r() * (t.stile === 'festival' ? 5 : t.stile === 'rennes' ? 6 : 12),
              profondita: 4 + r() * 3, scarto: r() * 2 + (vicinoScuola ? 2 : 0),
              colore: t.edifici[Math.floor(r() * t.edifici.length)],
            });
          }
        }
        for (let q = a === 0 ? -12 : a + 12; q < b; q += 24) {
          if (incrocio(q)) continue;
          for (const lato of [-1, 1]) ENTITA.push({ d: q, genere: 'lampione', lato, mondo: t.indice });
        }
        if (t.stile === 'liceo' || t.stile === 'rennes') {
          for (let q = a === 0 ? -10 : a + 6; q < b; q += 16) {
            if (incrocio(q)) continue;
            ENTITA.push({ d: q, genere: 'albero', lato: (Math.round(q / 16)) % 2 ? -1 : 1, scala: 0.8 + r() * 0.5, mondo: t.indice });
          }
        }
      }
    }

    // Scenografia per i mondi senza sezioni: monumento con foto del luogo.
    if (!t.sezioni) {
      const latoMonumento = t.indice % 2 ? 1 : -1;
      const dMonumento = t.inizio + 70;
      ENTITA.push({ d: dMonumento, genere: 'monumento', lato: latoMonumento, mondo: t.indice });
      ENTITA.forEach(e => { if (e.genere === 'edificio' && e.mondo === t.indice && e.lato === latoMonumento && Math.abs(e.d - dMonumento) < 14) e.nascosto = true; });
    }
    if (t.indice > 0) ENTITA.push({ d: t.inizio, genere: 'arco', testo: t.nome, colore: 0xC9962E });
  }

  ENTITA.push({ d: TRATTI[TRATTI.length - 1].fine, genere: 'arco', testo: `${TRAGUARDO.nome} · ${TRAGUARDO.data}`, colore: 0xD4AF37, traguardo: true });
  const lista = ENTITA.filter(e => !e.nascosto);
  lista.sort((a, b) => a.d - b.d);
  return lista;
}
