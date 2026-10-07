// I mondi del percorso, in ordine. Ogni mondo inizia con un checkpoint:
// se il giocatore urta un ostacolo riparte dall'inizio del mondo, il cronometro continua.
//
// `stile` sceglie i modelli degli ostacoli e degli edifici (vedi modelli.js) e il nome
// della foto facoltativa del luogo in assets/luoghi/<stile>.jpg.
//
// Tipi di ostacolo:
//   basso -> si salta (swipe in su)
//   alto  -> si scivola sotto (swipe in giù)
//   muro  -> si cambia corsia (swipe a sinistra/destra)

export const MONDI = [
  {
    nome: 'Liceo Vittorini',
    stile: 'liceo',
    anni: '2015 – 2020',
    luogo: 'Napoli',
    // Sezioni del percorso (vedi percorso.js). `evento: 'aula'` ferma la corsa per la scena in
    // classe; `checkpoint` segna un punto da cui ripartire dentro lo stesso mondo.
    sezioni: [
      { id: 'salita',        lung: 330, pend: 0.09, amb: 'est' },
      { id: 'avvicinamento', lung: 310, pend: 0.035, amb: 'est' },
      { id: 'atrio',         lung: 14,  amb: 'int', checkpoint: 'Ingresso a scuola' },
      { id: 'hall',          lung: 62,  amb: 'int' },
      { id: 'scale1',        lung: 34,  pend: 0.30, amb: 'int', piano: '1° piano' },
      { id: 'curva1',        lung: 26,  curva: Math.PI / 2, amb: 'int' },
      { id: 'scale2',        lung: 34,  pend: 0.30, amb: 'int', piano: '2° piano' },
      { id: 'curva2',        lung: 26,  curva: -Math.PI / 2, amb: 'int' },
      { id: 'corridoio',     lung: 52,  amb: 'int', piano: '3° piano' },
      { id: 'curva3',        lung: 26,  curva: Math.PI / 2, amb: 'int', verso5H: true },
      { id: 'corridoio5H',   lung: 44,  amb: 'int', verso5H: true },
      { id: 'aula',          lung: 6,   amb: 'int', evento: 'aula' },
      { id: 'uscita',        lung: 30,  amb: 'int', checkpoint: 'Uscita dall\'aula' },
      { id: 'scale-giu',     lung: 42,  pend: -0.30, amb: 'int' },
      { id: 'portone',       lung: 12,  amb: 'int' },
      { id: 'discesa',       lung: 90,  pend: -0.08, amb: 'est' },
      { id: 'curva4',        lung: 58,  pend: -0.04, curva: Math.PI / 2, amb: 'est' },
      { id: 'rettilineo',    lung: 44,  amb: 'est' },
      { id: 'curva5',        lung: 58,  curva: -Math.PI / 2, amb: 'est' },
      { id: 'fine',          lung: 40,  amb: 'est' },
    ],
    velocita: 12,
    cielo: 0xBFE3F5,
    terreno: 0xD9C7A3,
    corsie: 0xE8DCC4,
    edifici: [0xF1D9A7, 0xE6B98A, 0xF4EBD9],
    ostacoli: { basso: 0x7A5230, alto: 0x2F5D3A, muro: 0x9A3B2E },
    // Aspetto degli interni della scuola.
    interno: { cielo: 0xB9B3A8, terreno: 0xCFC8B8, corsie: 0xD9D2C2 },
  },
  {
    nome: 'Federico II · Triennale',
    stile: 'triennale',
    anni: '2020 – 2023',
    luogo: 'Napoli',
    lunghezza: 600,
    velocita: 13.5,
    cielo: 0xCFE0F0,
    terreno: 0x8E8A84,
    corsie: 0xB9B4AC,
    edifici: [0xC9962E, 0xE2D3B5, 0xA9A397],
    ostacoli: { basso: 0x2C5F8A, alto: 0xC9962E, muro: 0x5B5E72 },
  },
  {
    nome: 'Federico II · Magistrale',
    stile: 'magistrale',
    anni: '2023 – 2026',
    luogo: 'Napoli',
    lunghezza: 600,
    velocita: 15,
    cielo: 0xDDE6EE,
    terreno: 0x5F6B78,
    corsie: 0x8A97A5,
    edifici: [0xE9EEF3, 0xB8C4D0, 0x6C7A89],
    ostacoli: { basso: 0xE07A2E, alto: 0x3A3F4A, muro: 0xF2C14E },
  },
  {
    nome: 'ElRow Festival',
    stile: 'festival',
    anni: '2024 – 2025',
    luogo: 'Campovolo, Emilia-Romagna',
    lunghezza: 550,
    velocita: 16,
    cielo: 0x2A1640,
    terreno: 0x3B2A52,
    corsie: 0x6B4A8E,
    edifici: [0xFF4FA3, 0x3EE0D0, 0xFFD23F],
    ostacoli: { basso: 0x1A1A1A, alto: 0xFF4FA3, muro: 0x3EE0D0 },
  },
  {
    nome: 'Rennes',
    stile: 'rennes',
    anni: '2026',
    luogo: 'Bretagna, Francia',
    lunghezza: 650,
    velocita: 17.5,
    cielo: 0xA9B7C6,
    terreno: 0x4E5A52,
    corsie: 0x7D8B80,
    edifici: [0xD8D2C4, 0x8B5E3C, 0x5E6B7A],
    ostacoli: { basso: 0x3E6E9E, alto: 0xE9E4D8, muro: 0x1F2A44 },
  },
];

export const TRAGUARDO = {
  nome: 'Laurea',
  data: '28 settembre 2026',
};

// Velocità: ogni mondo parte da velocita × SPINTA e accelera in modo graduale fino a
// velocita × SPINTA × (1 + CRESCITA) alla fine del mondo; al mondo successivo riparte.
export const SPINTA = 1.25;
export const CRESCITA = 0.25;

// Ogni caffè raccolto toglie questo tempo dal totale (secondi).
export const BONUS_CAFFE = 2;

// Penalità se in aula ci si siede in prima fila (secondi), e tempo per scegliere.
export const MALUS_PRIMA_FILA = 10;
export const TEMPO_SCELTA = 6;

// Modalità sviluppo: se si muore si riparte da dove si è morti (un po' prima dell'ostacolo),
// invece che dall'ultimo checkpoint. I checkpoint restano calcolati ma non vengono usati.
// Metti false per usare i checkpoint, come nel gioco finale.
export const MODALITA_SVILUPPO = true;
export const RESPAWN_INDIETRO = 16;     // metri prima del punto della caduta
export const RESPAWN_INVULNERABILE = 0.35;// secondi senza urti dopo la ripartenza
