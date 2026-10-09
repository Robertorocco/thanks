// Generazione del percorso di gioco: ostacoli, caffè e scenografia, in ordine di distanza.
// Tutti i partecipanti corrono lo stesso tracciato (generatore pseudo-casuale con seme).

import { TRAGUARDO } from './mondi.js';

export const CORSIE = [-2.2, 0, 2.2];
// Un compagno ti viene incontro: la sua distanza dal giocatore si accorcia del 30% in più.
export const VELOCITA_COMPAGNI = 0.3;
export const ANTICIPO_COMPAGNI = 70;
// Chi esce da scuola cammina nella tua stessa direzione, più lentamente: la distanza si allunga del 30%
// del tuo avanzamento, quindi lo raggiungi con una velocità relativa del 70%.
export const VELOCITA_CAMMINATORI = 0.3;
export const PENDENZA_CROCIERA = 0.4;   // metri di spostamento laterale per metro di avvicinamento

// Posizione lungo il percorso di una persona quando il giocatore è in `pos`.
// `e.vel` cambia la velocità di chi viene incontro (la famiglia in casa cammina più svelta).
export function distanzaPersona(e, pos) {
  const k = Math.max(0, pos - (e.d0 - ANTICIPO_COMPAGNI));
  return e.via ? e.d0 + VELOCITA_CAMMINATORI * k : e.d0 - (e.vel ?? VELOCITA_COMPAGNI) * k;
}
// Posizione del giocatore in cui incrocia la persona.
export const incontroPersona = e => (e.via
  ? e.d0 + VELOCITA_CAMMINATORI * ANTICIPO_COMPAGNI / (1 - VELOCITA_CAMMINATORI)
  : e.d0 - (e.vel ?? VELOCITA_COMPAGNI) * ANTICIPO_COMPAGNI / (1 + (e.vel ?? VELOCITA_COMPAGNI)));

// Lanci in casa: mamma urla (la voce vola verso di te), papà tira il joystick. L'oggetto parte da chi
// lancia quando il giocatore è a `ANTICIPO_LANCIO` metri e gli viene incontro; la corsia è quella in cui
// si trova il giocatore al momento del lancio, quindi va schivato.
export const ANTICIPO_LANCIO = 16;
export const VELOCITA_LANCIO = 0.9;
export function distanzaLancio(e, pos) {
  return e.d0 - e.vel * Math.max(0, pos - (e.d0 - e.anticipo));
}
export const incontroLancio = e => e.d0 - e.vel * e.anticipo / (1 + e.vel);

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
  liceo:      { basso: 0.7, alto: 0.6, muro: 4.2, buco: 1.8, crociera: 2.0, persona: 0.7 },
  liceoInt:   { basso: 0.8, alto: 0.5, muro: 1.6, buco: 1.6, persona: 0.7 },
  casa:       { basso: 0.6, alto: 0.9, muro: 1.2, persona: 0.7 },
  darmon:     { basso: 0.6, alto: 0.6, muro: 4.2, persona: 0.6 },
  darmonInt:  { basso: 0.6, alto: 0.5, muro: 1.4, persona: 0.6 },
  triennale:  { basso: 0.65, alto: 0.4, muro: 4.2, parcheggiatore: 0.7 },
  magistrale: { basso: 0.65, alto: 0.4, muro: 4.2 },
  _:          { basso: 0.8, alto: 0.4, muro: 0.9 },
};
const profondita = (stile, tipo, e = {}) => (PROF[stile] ?? PROF._)[tipo] ?? 0.9;

export function generaLivello(TRATTI, perc, velocitaIn) {
  const ENTITA = [];

  for (const t of TRATTI) {
    // `ordine` tiene fisso il seme e la difficoltà dei mondi esistenti quando se ne aggiungono prima.
    const ordine = t.ordine ?? t.indice;
    const r = rng(1009 + ordine * 7919);
    const diff = Math.max(0, ordine / 4);   // 0 nei mondi iniziali, 1 nell'ultimo
    const o0 = t.inizio;                    // le posizioni fisse sono relative all'inizio del mondo
    const primaDelMondo = ENTITA.length;
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
        const dd = e.tipo === 'persona' ? incontroPersona(e) : e.d;
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
        if (lungo > 10 && o.tipi.some(x => x !== 'muro') && r() < 0.3 + 0.4 * diff) ostacolo(centro, libera, azione(o.tipi), o.stile);
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
        // Con `evita`, niente ostacoli dove sta per passare una persona (la famiglia in casa).
        if (o.evita && ENTITA.some(e => e.mondo === t.indice && ((e.tipo === 'persona' && Math.abs(incontroPersona(e) - d) < 9) || (e.tipo === 'lancio' && Math.abs(incontroLancio(e) - d) < 11)))) { d += v * (o.spazio ?? 1) * 1.1; continue; }
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
    // Con via = true sono ragazzi che escono da scuola e camminano davanti a te, più piano.
    function compagni(a, b, n, stile = 'liceoInt', via = false, membri = null) {
      for (let i = 0; i < n; i++) {
        const d0 = a + (b - a) * ((i + 0.3 + r() * 0.5) / n);
        const dMeet = incontroPersona({ d0, via });
        if (dMeet < a - 4) continue;
        const bl = bloccate(dMeet, 10);
        const libere = [0, 1, 2].filter(c => !bl.has(c));
        if (libere.length < 2) continue;
        const corsia = libere[Math.floor(r() * libere.length)];
        ostacolo(d0, corsia, 'persona', stile, { d0, via, membro: membri ? membri[i % membri.length] : undefined, vel: stile === 'casa' ? 0.6 : undefined });
      }
    }

    // Mamma che urla o papà sul divano col joystick, a lato della corsia: lanciano qualcosa da schivare.
    function lancia(d, membro, lato) {
      const proiettile = {
        d, d0: d, genere: 'ostacolo', tipo: 'lancio', corsia: 1, profondita: 0.8, stile: 'casa', mondo: t.indice,
        lato, oggetto: membro === 'mamma' ? 'voce' : 'joystick', anticipo: ANTICIPO_LANCIO, vel: VELOCITA_LANCIO,
      };
      ENTITA.push({ d, genere: 'lanciatore', membro, lato, mondo: t.indice, stile: 'casa', proiettile });
      ENTITA.push(proiettile);
      if (membro === 'papa') {
        ENTITA.push({ d, genere: 'arredo', tipo: 'divano', lato, mondo: t.indice, stile: 'casa', esterno: false, var: 0 });
        ENTITA.push({ d, genere: 'arredo', tipo: 'tv', lato: -lato, mondo: t.indice, stile: 'casa', esterno: false, var: 0 });
      }
    }

    // Arredi e decorazioni laterali (non sono ostacoli): casa e Istituto Darmon.
    function arreda(sz, a, b) {
      const metti = (tipo, lato, d, extra = {}) => { if (d < b - 1) ENTITA.push({ d, genere: 'arredo', tipo, lato, mondo: t.indice, stile: t.stile, esterno: sz.amb === 'est', var: Math.floor(r() * 8), ...extra }); };
      const lati = [-1, 1];
      switch (sz.id) {
        case 'culla':
          metti('culla', -1, a + 7); metti('tappeto', 0, a + 10); metti('lampada', 1, a + 5); metti('pianta', 1, a + 15);
          break;
        case 'salotto':
          metti('libreria', -1, a + 9); metti('tv', 1, a + 12); metti('tappeto', 0, a + 30); metti('divano', -1, a + 26);
          metti('pianta', 1, a + 22); metti('lampada', 1, a + 36); metti('cassapanca', 1, a + 44); metti('libreria', -1, a + 46); metti('pianta', -1, a + 57);
          break;
        case 'curva-c1': case 'curva-c2':
          metti('lampada', sz.id === 'curva-c1' ? -1 : 1, a + 8); metti('pianta', sz.id === 'curva-c1' ? 1 : -1, a + 16);
          break;
        case 'corridoio-c':
          metti('appendiabiti', 1, a + 8); metti('scarpiera', -1, a + 15); metti('pianta', 1, a + 24);
          metti('lampada', -1, a + 31); metti('cassapanca', 1, a + 38); metti('pianta', -1, a + 44);
          // Giocattoli sparsi lungo i muri (non si urtano: sono fuori dalle corsie).
          for (const [lato, q] of [[1, 4], [-1, 9], [1, 13], [-1, 24], [1, 19], [-1, 29], [1, 33], [-1, 39], [1, 43]]) metti('giochiSparsi', lato, a + q);
          break;
        case 'cucina':
          metti('frigo', 1, a + 8); metti('bancone', 1, a + 17); metti('tavolo', -1, a + 24);
          metti('seggiolone', -1, a + 33); metti('pianta', 1, a + 42); metti('tavolo', -1, a + 46);
          break;
        case 'soglia':
          metti('scarpiera', -1, a + 6); metti('appendiabiti', 1, a + 8);
          break;
        case 'via': case 'piazzale':
          for (let q = a + 18; q < b - 8; q += 34) metti('panchina', Math.round(q / 34) % 2 ? -1 : 1, q);
          for (let q = a + 40; q < b - 8; q += 47) metti('aiuola', lati[Math.round(q / 47) % 2], q);
          break;
        case 'cortile':
          metti('scivolo', -1, a + 12); metti('altalena', 1, a + 24); metti('canestro', -1, a + 40);
          metti('giostra', 1, a + 54); metti('panchina', -1, a + 62); metti('aiuola', 1, a + 70);
          break;
        case 'uscita-d':
          metti('portaClasse', 1, a + sz.portaFratello);
          for (let q = a + 8, i = 0; q < b - 8; q += 13, i++) if (Math.abs(q - a - sz.portaFratello) > 6) metti(i % 2 ? 'armadietto' : 'appendiabiti', -1, q);
          break;
        case 'corridoio-d':
          for (let q = a + 6, i = 0; q < b - 8; q += 11, i++) metti(i % 3 === 0 ? 'appendiabiti' : i % 3 === 1 ? 'armadietto' : 'pianta', i % 2 ? -1 : 1, q);
          ENTITA.push({ d: a + 4, genere: 'cartello', testo: '3ª B', mondo: t.indice, w: 2.6, colore: 0xE0533F, stile: 'darmon' });
          break;
        default: break;
      }
    }

    // Scenografia dell'università (vedi modelli-universita.js): Via Claudio con lo stadio a sinistra e la
    // facoltà a destra, il piazzale pieno di motorini, l'ingresso, il viale dentro la facoltà.
    function scenaUni(sz, a, b) {
      const metti = (tipo, lato, d, extra = {}) => ENTITA.push({ d, genere: 'uni', tipo, lato, mondo: t.indice, var: Math.floor(r() * 12), ...extra });
      const palazzi = (lato, da, a2, distanza, hMin, hMax) => {
        for (let q = da; q < a2;) {
          const prof = 18 + r() * 12;
          if (q + prof / 2 > a2) break;
          metti('palazzo', lato, q + prof / 2, { profondita: prof, larghezza: 12 + r() * 6, altezza: hMin + r() * (hMax - hMin), distanza });
          q += prof + 3 + r() * 5;
        }
      };
      switch (sz.id) {
        case 'via-claudio': case 'curva-stadio': case 'via-claudio2': {
          // Lo stadio sta all'interno della curva: i pezzi si sovrappongono un po', senza buchi.
          const inizioStadio = sz.id === 'via-claudio' ? a + 14 : a;
          for (let q = inizioStadio; q < b + 2; q += 12) { metti('stadio', -1, q); metti('autoSpina', -1, q); }
          const panini = sz.id === 'via-claudio2' ? a + 50 : null;
          for (let q = a + (sz.id === 'via-claudio' ? 10 : 4); q < b - 2; q += 8) if ((panini === null || Math.abs(q - panini) > 9) && r() > 0.12) metti('motorini', 1, q);
          for (let q = a + 6; q < b + 6; q += 11) metti('recinzione', 1, q);
          for (let q = a + 22; q < b; q += 26) metti('albero', 1, q, { x: 11.6, rosso: r() < 0.6, scala: 0.9 + r() * 0.4 });
          for (let q = a + 18; q < b; q += 30) metti('lampione', 1, q);
          palazzi(1, a + 4, b + (sz.id === 'via-claudio2' ? 20 : 0), 13.5, 13, 22);
          if (panini !== null) metti('panini', 1, panini);
          if (sz.id === 'via-claudio') metti('targa', 1, a + 16);
          break;
        }
        case 'piazzale-ing':
          for (const lato of [-1, 1]) {
            for (let q = a + 6; q < b - 4; q += 8) metti('motorini', lato, q, { file: 3 });
            palazzi(lato, a + (lato < 0 ? 4 : 30), b - 18, 16, 10, 16);
            for (let q = a + 4; q < b + 6; q += 12) if (lato > 0) metti('recinzione', lato, q, { x: 12.4 });
          }
          for (const lato of [-1, 1]) for (const q of [b - 14, b - 9]) metti('jersey', lato, q, { x: 3.75 });
          metti('bancarella', 1, b - 7);
          metti('albero', 1, b - 16, { x: 14, rosso: true, scala: 1.3 });
          metti('albero', 1, b - 30, { x: 14, rosso: false, scala: 1.2 });
          metti('lampione', 1, b - 3);
          break;
        case 'ingresso-ing':
          metti('ingresso', 0, a + 4);
          break;
        case 'campus': case 'esame': case 'dopo-esame':
          for (const lato of [-1, 1]) {
            palazzi(lato, a + (sz.id === 'campus' ? 26 : 2), b, 9, 12, 24);
            for (let q = a + 8; q < b - 4; q += 12) if (r() > 0.25) metti('autoFila', lato, q);
            for (let q = a + 14 + (lato > 0 ? 0 : 13); q < b; q += 26) metti('albero', lato, q, { x: 7.2, rosso: r() < 0.35, scala: 0.8 + r() * 0.3 });
            for (let q = a + 20 + (lato > 0 ? 15 : 0); q < b; q += 30) metti('lampione', lato, q);
          }
          break;
        default: break;
      }
    }

    // Il parcheggiatore abusivo: aspetta a lato della strada e ti viene incontro nella tua corsia, con la
    // mano tesa (main.js). Attorno a lui la strada resta libera da altri ostacoli.
    const parcheggiatore = (d, lato) => ostacolo(d, 1, 'parcheggiatore', 'triennale', { lato, prof: 0.7 });

    // --- Sezioni -----------------------------------------------------------
    const dopo = [];     // generati a fine mondo, quando tutti gli ostacoli fissi sono già al loro posto
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
          const incroci = [{ d: o0 + 118, rosso: true }, { d: o0 + 205, rosso: false }, { d: o0 + 288, rosso: true }];
          for (const inc of incroci) {
            ENTITA.push({ d: inc.d, genere: 'semaforo', rosso: inc.rosso, mondo: t.indice, stile: 'liceo' });
            if (inc.rosso) {
              const dir = r() < 0.5 ? 1 : -1;
              ostacolo(inc.d, dir > 0 ? 0 : 2, 'crociera', 'liceo', { dir, var: Math.floor(r() * 8) });
            }
          }
          // Segnali di salita lungo la strada e, a un certo punto, l'ingresso della Metro.
          ENTITA.push({ d: a + 20, genere: 'segnale', lato: 1, testo: '15%', mondo: t.indice });
          ENTITA.push({ d: o0 + 160, genere: 'metro', lato: -1, mondo: t.indice });
          ENTITA.push({ d: o0 + 245, genere: 'segnale', lato: 1, testo: '15%', mondo: t.indice });
          const liberi = [[a + 45, o0 + 100], [o0 + 138, o0 + 190], [o0 + 222, o0 + 272], [o0 + 306, b]];
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
        case 'corridoio': case 'corridoio5H': {
          const opz = { stile: 'liceoInt', tipi: ['basso', 'alto', 'muro', 'buco'], corridoi: true, spazio: 1.1 };
          if (sz.ragazza) {
            // La ragazza che saluta Roberto (main.js): attorno all'incontro il corridoio resta libero.
            const m = a + sz.ragazza;
            riempi(a + 6, m - 22, opz);
            riempi(m + 14, b - 4, opz);
            compagni(a + 2, m - 26, 1);
          } else {
            riempi(a + 6, b - 16, opz);
            compagni(a + 4, b - 12, 2);
          }
          break;
        }
        case 'uscita':
          // Dopo la scena in aula la corsa riparte in un tratto libero: nessun ostacolo per i primi ~45 m.
          break;
        case 'scale-giu':
          // Qui Roberto scende insieme all'amico (vedi main.js): nessun altro in mezzo.
          break;
        case 'discesa': case 'curva4': case 'rettilineo': case 'curva5':
          // Ragazzi che escono da scuola davanti a te, sulla discesa e nelle curve.
          if (sz.id !== 'curva5') dopo.push(() => compagni(a + 2, b - 4, sz.id === 'discesa' ? 4 : 2, 'liceo', true));
          riempi(a + (sz.id === 'discesa' ? 14 : 4), b - 4, { stile: 'liceo', tipi: ['muro', 'basso', 'alto', 'buco'], corridoi: 0.16, spazio: 1.1 });
          break;
        case 'fine':
          riempi(a + 4, b - 18, { stile: 'liceo', tipi: ['muro', 'basso', 'buco'], corridoi: false, spazio: 1.2 });
          break;
        // --- Casa (neonato): niente salto né scivolata, gli ostacoli si schivano e basta ---
        case 'culla': break;
        // La prima volta mamma, papà e nonna camminano verso di te; poi mamma urla e papà tira il joystick.
        case 'salotto':
          compagni(a + 6, b - 4, 2, 'casa', false, ['mamma', 'papa']);
          riempi(a + 8, b - 6, { stile: 'casa', tipi: ['muro'], corridoi: 0, spazio: 1.5, evita: true });
          break;
        case 'curva-c1':
          compagni(a + 2, b + 8, 1, 'casa', false, ['nonna']);
          riempi(a + 2, b - 2, { stile: 'casa', tipi: ['muro'], barriere: false, corridoi: false, spazio: 1.9, evita: true });
          break;
        case 'curva-c2':
          riempi(a + 2, b - 2, { stile: 'casa', tipi: ['muro'], barriere: false, corridoi: false, spazio: 1.9, evita: true });
          break;
        case 'corridoio-c': {
          // L'unica volta che la mamma urla: il corridoio è pieno di giocattoli da mettere in ordine.
          lancia(a + 20, 'mamma', -1);
          compagni(a + 30, b + 8, 1, 'casa', false, ['nonna']);
          const primo = ENTITA.length;
          riempi(a + 3, b - 4, { stile: 'casa', tipi: ['muro'], corridoi: 0.1, spazio: 1.1, evita: true });
          for (let i = primo; i < ENTITA.length; i++) if (ENTITA[i].genere === 'ostacolo') ENTITA[i].giochi = true;
          break;
        }
        case 'cucina':
          lancia(a + 12, 'papa', -1);
          ostacolo(a + 1, 0, 'muro', 'casa');     // un mobile sulla corsia di sinistra prima del papà
          riempi(a + 6, b - 8, { stile: 'casa', tipi: ['muro'], corridoi: 0.1, spazio: 1.35, evita: true });
          break;
        case 'soglia': break;
        // --- Istituto Darmon (bambino) ---
        case 'via':
          // La salita verso i Camaldoli: cartelli con la distanza, il segnale della pendenza e le fosse.
          ENTITA.push({ d: a + 30, genere: 'camaldoli', lato: 1, testo: '1,2 km', mondo: t.indice });
          ENTITA.push({ d: a + 40, genere: 'segnale', lato: -1, testo: '13%', mondo: t.indice });
          ENTITA.push({ d: a + 82, genere: 'camaldoli', lato: -1, testo: '800 m', mondo: t.indice });
          ENTITA.push({ d: b - 12, genere: 'camaldoli', lato: 1, testo: '400 m', mondo: t.indice });
          riempi(a + 30, b - 10, { stile: 'darmon', tipi: ['basso', 'buco', 'alto', 'muro', 'buco'], corridoi: 0.08, spazio: 1.3 });
          // Bambini che vanno a scuola nella tua stessa direzione, più piano.
          dopo.push(() => compagni(a + 24, b - 12, 4, 'darmon', true));
          break;
        case 'cortile':
          riempi(a + 4, b - 6, { stile: 'darmon', tipi: ['basso', 'alto', 'muro'], corridoi: 0.1, spazio: 1.2 });
          compagni(a + 8, b - 10, 3, 'darmon');
          break;
        case 'atrio-d': break;
        case 'corridoio-d':
          riempi(a + 6, b - 8, { stile: 'darmonInt', tipi: ['basso', 'alto', 'muro'], corridoi: 0.1, spazio: 1.15 });
          compagni(a + 8, b - 14, 3, 'darmonInt');
          break;
        case 'aula-d': break;                // la porta della 3ª B: qui c'è l'evento
        case 'uscita-d':
          // Prima un tratto libero con il fratello accanto e il creeper che lui lancia, poi gli ostacoli.
          riempi(a + sz.portaFratello + 36, b - 10, { stile: 'darmonInt', tipi: ['basso', 'alto', 'muro'], corridoi: 0.1, spazio: 1.2 });
          break;
        // --- Triennale: Via Claudio, il piazzale e l'ingresso di Ingegneria ---
        case 'via-claudio': case 'curva-stadio': case 'via-claudio2': {
          // Un parcheggiatore nella curva e uno nell'ultimo rettilineo; attorno a loro la strada è libera.
          const opz = { stile: 'triennale', tipi: ['basso', 'alto', 'muro'], corridoi: 0.12, spazio: 1.05 };
          const p = sz.id === 'curva-stadio' ? a + 130 : sz.id === 'via-claudio2' ? a + 60 : null;
          const da = sz.id === 'via-claudio' ? a + 40 : a;
          if (p === null) { riempi(da, b, opz); break; }
          parcheggiatore(p, sz.id === 'curva-stadio' ? -1 : 1);
          riempi(da, p - 22, opz);
          riempi(p + 16, b - (sz.id === 'via-claudio2' ? 4 : 0), opz);
          break;
        }
        case 'piazzale-ing': {
          const p3 = a + 34;
          parcheggiatore(p3, -1);
          riempi(p3 + 16, b - 18, { stile: 'triennale', tipi: ['basso', 'alto', 'muro'], corridoi: false, spazio: 1.1 });
          break;
        }
        case 'ingresso-ing': break;
        // --- Magistrale: prima e dopo l'esame ---
        case 'campus':
          riempi(a + 45, b - 40, { stile: t.stile, tipi: ['basso', 'alto', 'muro'], corridoi: true });
          break;
        case 'esame': break;
        case 'dopo-esame':
          riempi(a + 30, b - 30, { stile: t.stile, tipi: ['basso', 'alto', 'muro'], corridoi: true });
          break;
        case 'piazzale':
          riempi(a + 10, b - 30, { stile: 'darmon', tipi: ['basso', 'alto', 'muro'], corridoi: 0.1, spazio: 1.2 });
          dopo.push(() => compagni(a + 10, b - 30, 3, 'darmon', true));
          break;
        default: break;
      }

      // Scenografia degli interni -------------------------------------------
      if (int) {
        const primo = Math.floor(a / 3) * 3;
        for (let q = primo, i = 0; q < b; q += 3, i++) {
          const k = Math.round(q / 3);
          for (const lato of [-1, 1]) {
            const spoglia = lato > 0 && sz.portaFratello && Math.abs(q + 1.5 - a - sz.portaFratello) < 3.6;
            ENTITA.push({ d: q + 1.5, genere: 'parete', lato, idx: k + (lato > 0 ? 1 : 0), mondo: t.indice, stile: t.stile, spoglia });
          }
          ENTITA.push({ d: q + 1.5, genere: 'soffitto', luce: k % 3 === 0, mondo: t.indice, stile: t.stile });
        }
        if (sz.piano) ENTITA.push({ d: sz.id === 'corridoio' ? a + 5 : b - 6, genere: 'cartello', testo: sz.piano.toUpperCase(), mondo: t.indice, w: 3.4 });
        if (sz.verso5H && sz.id === 'curva3') {
          ENTITA.push({ d: a - 8, genere: 'cartello', testo: '5ª H →', mondo: t.indice, w: 3.0, colore: 0x1F58B8 });
          ENTITA.push({ d: b - 8, genere: 'cartello', testo: '5ª H', mondo: t.indice, w: 2.6, colore: 0x1F58B8 });
        }
        if (sz.id === 'corridoio5H') ENTITA.push({ d: a + 22, genere: 'cartello', testo: '5ª H', mondo: t.indice, w: 2.6, colore: 0x1F58B8 });
        if (t.stile === 'casa' || t.stile === 'darmon') arreda(sz, a, b);
        if (sz.id === 'aula') ENTITA.push({ d: b, genere: 'portaAula', mondo: t.indice });
        if (sz.id === 'aula-d') ENTITA.push({ d: b, genere: 'portaAula', mondo: t.indice, stile: 'darmon' });
        if (sz.id === 'corridoio-d') ENTITA.push({ d: b - 12, genere: 'cartello', testo: '3ª B', mondo: t.indice, w: 2.6, colore: 0xE0533F, stile: 'darmon' });
        if (sz.id === 'portone') ENTITA.push({ d: b - 1.2, genere: 'portone', mondo: t.indice });
        if (sz.id === 'soglia') ENTITA.push({ d: b - 1.2, genere: 'portone', mondo: t.indice, stile: 'casa' });
        if (sz.id === 'uscita-d') ENTITA.push({ d: b - 1.2, genere: 'portone', mondo: t.indice, stile: 'darmon' });
      } else if (t.stile === 'triennale' || t.stile === 'magistrale') {
        scenaUni(sz, a, b);
        if (sz.id === 'esame') ENTITA.push({ d: b, genere: 'portaAula', mondo: t.indice, stile: 'facolta' });
      } else {
        // Edifici, lampioni e alberi lungo la strada. Vicino alla scuola restano bassi e lontani.
        const vicinoScuola = sz.id === 'avvicinamento';
        // Agli incroci con semaforo la strada trasversale resta libera da edifici e alberi.
        const incrocio = q => ENTITA.some(x => x.genere === 'semaforo' && x.mondo === t.indice && Math.abs(x.d - q) < 15)
          || (sz.id === 'cortile' && t.stile === 'darmon' && q > b - 48);   // davanti all'Istituto si vede la scuola intera
        for (let q = a - (a === o0 ? 28 : 0); q < b; q += 7) {
          if (t.sezioni && q > o0 + 596 && q < o0 + 700 && t.stile === 'liceo') continue;
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
        for (let q = a === o0 ? o0 - 12 : a + 12; q < b; q += 24) {
          if (incrocio(q)) continue;
          for (const lato of [-1, 1]) ENTITA.push({ d: q, genere: 'lampione', lato, mondo: t.indice });
        }
        if (t.stile === 'liceo' || t.stile === 'rennes' || t.stile === 'darmon') {
          for (let q = a === o0 ? o0 - 10 : a + 6; q < b; q += 16) {
            if (incrocio(q)) continue;
            ENTITA.push({ d: q, genere: 'albero', lato: (Math.round(q / 16)) % 2 ? -1 : 1, scala: 0.8 + r() * 0.5, mondo: t.indice });
          }
        }
        if (t.stile === 'darmon') arreda(sz, a, b);
        // La facciata della facoltà dove si fa l'esame: si nasconde dopo la scena, come le porte delle aule.
        if (sz.id === 'esame') ENTITA.push({ d: b, genere: 'portaAula', mondo: t.indice, stile: 'facolta' });
      }
    }

    for (const f of dopo) f();
    // Sul lato della Metro niente edifici, alberi o lampioni troppo vicini all'ingresso.
    for (const m of ENTITA) {
      if (m.genere !== 'metro' || m.mondo !== t.indice) continue;
      for (const e of ENTITA) {
        if (e.mondo === t.indice && e.lato === m.lato && ['edificio', 'albero', 'lampione'].includes(e.genere) && Math.abs(e.d - m.d) < 10) e.nascosto = true;
      }
    }
    // Davanti alla facciata della facoltà niente edifici, alberi o lampioni che la attraversino.
    for (const f of ENTITA) {
      if (f.genere !== 'portaAula' || f.stile !== 'facolta' || f.mondo !== t.indice) continue;
      for (const e of ENTITA) {
        if (e.mondo !== t.indice) continue;
        if (['edificio', 'albero', 'lampione'].includes(e.genere) && Math.abs(e.d - f.d) < 8) e.nascosto = true;
        // All'università: niente palazzi, alberi o auto davanti alla facciata della facoltà.
        if (e.genere === 'uni' && Math.abs(e.d - f.d) < 8 + (e.profondita ?? 0) / 2) e.nascosto = true;
      }
    }
    // Edifici, lampioni e alberi generati prima dell'inizio del mondo sono quelli del mondo precedente.
    for (let i = primaDelMondo; i < ENTITA.length; i++) {
      const e = ENTITA[i];
      if (t.indice > 0 && e.d < o0 && (e.genere === 'edificio' || e.genere === 'lampione' || e.genere === 'albero')) e.nascosto = true;
    }

    // Scenografia per i mondi senza sezioni: monumento con foto del luogo.
    if (!t.sezioni) {
      const latoMonumento = t.indice % 2 ? 1 : -1;
      const dMonumento = t.inizio + 70;
      ENTITA.push({ d: dMonumento, genere: 'monumento', lato: latoMonumento, mondo: t.indice });
      ENTITA.forEach(e => { if (e.genere === 'edificio' && e.mondo === t.indice && e.lato === latoMonumento && Math.abs(e.d - dMonumento) < 14) e.nascosto = true; });
    }
    // Un arco all'ingresso di ogni tappa: i mondi dello stesso gruppo (triennale e magistrale) ne hanno uno solo.
    const stessoGruppo = t.gruppo && TRATTI[t.indice - 1]?.gruppo === t.gruppo;
    // L'università non ha l'arco: la sua porta è l'ingresso vero della facoltà, in fondo a Via Claudio.
    if (t.indice > 0 && !stessoGruppo && t.gruppo !== 'Università Federico II') ENTITA.push({ d: t.inizio, genere: 'arco', testo: t.gruppo ?? t.nome, colore: 0xC9962E });
  }

  // Chi cammina nella stessa corsia di un bonus, poco oltre, resta nascosto dietro al bonus (e al suo
  // numero) finché non ti è addosso: lo si sposta in una corsia senza bonus davanti e senza ostacoli dove lo raggiungi.
  const bonus = ENTITA.filter(e => e.genere === 'caffe');
  const copre = (c, o, corsia) => {
    if (c.corsia !== corsia) return false;
    const avanti = distanzaPersona(o, c.d) - c.d;
    return avanti > 0 && avanti < 45;
  };
  const coperto = (o, corsia) => bonus.some(c => copre(c, o, corsia));
  const irrisolte = [];
  ENTITA.spostatePersone = [];
  for (const o of ENTITA) {
    if (o.tipo !== 'persona' || o.stile === 'casa' || !coperto(o, o.corsia)) continue;     // in casa la famiglia è voluta così
    const dm = incontroPersona(o);
    const occupata = c => ENTITA.some(x => x !== o && x.genere === 'ostacolo' && (x.tipo === 'persona' ? incontroPersona(x) : x.d) > dm - 10
      && (x.tipo === 'persona' ? incontroPersona(x) : x.d) < dm + 10
      && (x.corsia === c || (x.tipo === 'crociera' && (x.dir > 0 ? [0, 1] : [1, 2]).includes(c))));
    const altra = [0, 1, 2].find(c => c !== o.corsia && !coperto(o, c) && !occupata(c));
    ENTITA.spostatePersone.push([Math.round(o.d0), o.corsia, altra ?? null]);
    if (altra !== undefined) o.corsia = altra; else irrisolte.push(o);
  }

  // Nessun caffè deve restare dentro un ostacolo: se la sua corsia è chiusa (muri, auto, persone che
  // passano) lo si sposta in una corsia libera, altrimenti si toglie.
  const chiusa = (corsia, d) => ENTITA.some(o => {
    if (o.genere !== 'ostacolo') return false;
    const m = o.profondita / 2 + 1.4;
    if (o.tipo === 'muro') return o.corsia === corsia && Math.abs(o.d - d) <= m;
    if (o.tipo === 'crociera') return (o.dir > 0 ? [0, 1] : [1, 2]).includes(corsia) && Math.abs(o.d - d) <= m;
    if (o.tipo === 'persona') {
      if (o.corsia !== corsia) return false;
      for (let pos = d - 1.2; pos <= d + 1.2; pos += 0.4) if (Math.abs(distanzaPersona(o, pos) - pos) <= m) return true;
    }
    return false;
  });
  // Se la persona non può cambiare corsia, si sposta il bonus che la copre.
  for (const o of irrisolte) {
    for (const c of bonus) {
      if (!copre(c, o, o.corsia)) continue;
      const libera = [1, 0, 2].find(k => k !== o.corsia && !chiusa(k, c.d));
      if (libera !== undefined) c.corsia = libera;
    }
  }
  ENTITA.spostati = [];
  for (const e of ENTITA) {
    if (e.genere !== 'caffe' || !chiusa(e.corsia, e.d)) continue;
    const libera = [1, 0, 2].find(c => c !== e.corsia && !chiusa(c, e.d));
    ENTITA.spostati.push({ d: Math.round(e.d), da: e.corsia, a: libera ?? null });
    if (libera === undefined) e.nascosto = true; else e.corsia = libera;
  }

  ENTITA.push({ d: TRATTI[TRATTI.length - 1].fine, genere: 'arco', testo: `${TRAGUARDO.nome} · ${TRAGUARDO.data}`, colore: 0xD4AF37, traguardo: true });
  const lista = ENTITA.filter(e => !e.nascosto);
  lista.sort((a, b) => a.d - b.d);
  lista.spostati = ENTITA.spostati;
  lista.spostatePersone = ENTITA.spostatePersone;
  return lista;
}
