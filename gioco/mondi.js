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

// Proporzioni e fisica di Roberto nelle varie età: `scala` del modello, salto (altezza massima in metri),
// altezza del corpo (in piedi/strisciando) e quote degli ostacoli ("basso" si salta, "alto" si passa sotto).
// `posa` è il modo di muoversi. `camera`: distanza dietro, altezza e quota guardata.
export const FISICA = {
  neonato: {
    // Primi passi: niente scivolata e solo un saltello, che non basta a superare nulla.
    // Gli ostacoli o si schivano o si urtano.
    nome: 'Neonato', posa: 'primipassi', senzaScivolata: true, scala: 0.5, salto: 0.3, altezza: 1.1, altezzaBassa: 1.1,
    bassoMax: 0, altoDa: 9, bucoMax: 0, persona: 3, cambioCorsia: 9,
    camera: { indietro: 4.4, alto: 2.4, guarda: 0.6, fov: 1.0, segue: 0.95 },
  },
  bimbo: {
    nome: 'Bambino', posa: 'corsa', scala: 0.6, salto: 1.25, altezza: 1.3, altezzaBassa: 0.62,
    bassoMax: 0.6, altoDa: 0.84, bucoMax: 0.22, persona: 3, cambioCorsia: 13,
    camera: { indietro: 5.0, alto: 2.7, guarda: 1.0, fov: 1.0, segue: 0.8 },
  },
  liceo: {
    nome: 'Ragazzo', posa: 'corsa', scala: 0.8, salto: 1.79, altezza: 1.8, altezzaBassa: 0.85,
    bassoMax: 0.85, altoDa: 1.2, bucoMax: 0.3, persona: 3, cambioCorsia: 15,
    camera: { indietro: 6.2, alto: 3.3, guarda: 1.3, fov: 1.0, segue: 0.45 },
  },
};
// All'università stessa fisica del liceo; cambia l'aspetto (più snello, vedi modelli.js).
FISICA.universita = { ...FISICA.liceo, nome: 'Universitario' };

// Gli archi del racconto: gruppi di mondi con un nome.
export const ARCHI = {
  infanzia: 'Primi passi',
  scuole: 'Gli anni di scuola',
  universita: 'Università',
};

export const MONDI = [
  {
    nome: 'Casa mia',
    stile: 'casa',
    arco: 'infanzia',
    eta: 'neonato',
    anni: '0 anni',
    luogo: 'Casa',
    ordine: -2,
    sezioni: [
      { id: 'culla',      lung: 20, amb: 'int' },
      { id: 'salotto',    lung: 64, amb: 'int', checkpoint: 'Salotto', sottotitolo: 'Primi passi verso la cucina' },
      { id: 'curva-c1',   lung: 26, curva: Math.PI / 2, amb: 'int' },
      { id: 'corridoio-c', lung: 50, amb: 'int' },
      { id: 'curva-c2',   lung: 26, curva: -Math.PI / 2, amb: 'int' },
      { id: 'cucina',     lung: 58, amb: 'int', checkpoint: 'Cucina', sottotitolo: 'La porta di casa è aperta' },
      { id: 'soglia',     lung: 22, amb: 'int' },
    ],
    velocita: 3.7,
    cielo: 0xF3E4CF,
    terreno: 0xC7B493,
    corsie: 0xC9A173,
    edifici: [0xF1D9A7, 0xE6B98A, 0xF4EBD9],
    ostacoli: { basso: 0xE0533F, alto: 0x3A7CC4, muro: 0x8C6A4A },
    interno: { cielo: 0xF7ECD8, terreno: 0xE7D5B6, corsie: 0xF0D6AA, terra: 0xFFE3BC },
  },
  {
    nome: 'Istituto Darmon',
    stile: 'darmon',
    arco: 'infanzia',
    eta: 'bimbo',
    anni: '8 anni',
    luogo: 'Napoli',
    ordine: -1,
    sezioni: [
      { id: 'via',        lung: 170, pend: 0.13, amb: 'est' },     // la salita verso i Camaldoli
      { id: 'cortile',    lung: 80,  amb: 'est' },
      { id: 'atrio-d',    lung: 14,  amb: 'int', checkpoint: 'Ingresso all\'Istituto', sottotitolo: 'Si entra a scuola' },
      { id: 'corridoio-d', lung: 78, amb: 'int' },
      { id: 'aula-d',     lung: 6,  amb: 'int', evento: 'darmon', checkpoint: 'La 3ª B', sottotitolo: 'Sta per arrivare il maestro' },
      // All'uscita dalla 3ª B c'è il fratello di Roberto: corrono insieme, poi lui entra nella sua classe
      // (porta a `portaFratello` metri dall'inizio della sezione).
      { id: 'uscita-d',   lung: 110, amb: 'int', portaFratello: 58 },
      { id: 'piazzale',   lung: 110, pend: -0.02, amb: 'est' },
      // Boss di fine medie, prima di diventare liceale: il Gelato Gigante (vedi boss-gelato.js). Si sopravvive
      // fino in fondo alla piazza; ogni colpo fa ingrassare e rallentare Roberto.
      { id: 'boss-gelato', lung: 420, amb: 'est', boss: 'gelato', checkpoint: 'Il Gelato Gigante' },
    ],
    velocita: 9,
    cielo: 0xBFE3F5,
    terreno: 0xB5C98A,
    corsie: 0xCFC7B8,
    edifici: [0xF4D9A0, 0xE9B7A0, 0xCFE0C0],
    ostacoli: { basso: 0xE0533F, alto: 0x3A7CC4, muro: 0xF2C14E },
    interno: { cielo: 0xE9DCD0, terreno: 0xD9925E, corsie: 0xE09A64, terra: 0xE0B48E },
  },
  {
    nome: 'Liceo Vittorini',
    stile: 'liceo',
    arco: 'scuole',
    eta: 'liceo',
    ordine: 0,
    anni: '2015 – 2020',
    luogo: 'Napoli',
    // Sezioni del percorso (vedi percorso.js). `evento: 'aula'` ferma la corsa per la scena in
    // classe; `checkpoint` segna un punto da cui ripartire dentro lo stesso mondo.
    sezioni: [
      { id: 'salita',        lung: 330, pend: 0.15, amb: 'est' },
      { id: 'avvicinamento', lung: 310, pend: 0.06, amb: 'est' },
      { id: 'atrio',         lung: 14,  amb: 'int', checkpoint: 'Ingresso a scuola', sottotitolo: 'Sono le 8:30, corri verso la 5ª H' },
      { id: 'hall',          lung: 62,  amb: 'int' },
      { id: 'scale1',        lung: 34,  pend: 0.30, amb: 'int', piano: '1° piano' },
      { id: 'curva1',        lung: 26,  curva: Math.PI / 2, amb: 'int' },
      { id: 'scale2',        lung: 34,  pend: 0.30, amb: 'int', piano: '2° piano' },
      { id: 'curva2',        lung: 26,  curva: -Math.PI / 2, amb: 'int' },
      { id: 'corridoio',     lung: 52,  amb: 'int', piano: '3° piano', ragazza: 1 },   // "Ciao amo
      { id: 'curva3',        lung: 26,  curva: Math.PI / 2, amb: 'int', verso5H: true },
      { id: 'corridoio5H',   lung: 44,  amb: 'int', verso5H: true },
      { id: 'aula',          lung: 6,   amb: 'int', evento: 'aula' },
      { id: 'uscita',        lung: 30,  amb: 'int', checkpoint: 'Uscita dall\'aula', sottotitolo: 'Ora giù dalle scale' },
      { id: 'scale-giu',     lung: 42,  pend: -0.30, amb: 'int' },
      { id: 'portone',       lung: 12,  amb: 'int' },
      { id: 'discesa',       lung: 90,  pend: -0.08, amb: 'est' },
      { id: 'curva4',        lung: 58,  pend: -0.04, curva: Math.PI / 2, amb: 'est' },
      { id: 'rettilineo',    lung: 44,  amb: 'est' },
      // Boss di fine liceo: a ping pong con il cugino (vedi boss-pingpong.js). Il tavolo è a 30 m dall'inizio
      // della sezione; dopo la curva non si vede già l'università.
      { id: 'pingpong',      lung: 56,  amb: 'est', boss: 'pingpong', checkpoint: 'Il cugino' },
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
    // Triennale e magistrale sono due mondi diversi ma un'unica tappa: un solo cartello all'ingresso.
    arco: 'universita',
    gruppo: 'Università Federico II',
    eta: 'universita',
    ordine: 1,
    stile: 'triennale',
    anni: '2020 – 2023',
    luogo: 'Napoli',
    // Via Claudio, fuori dallo stadio Maradona, fino all'ingresso della Facoltà di Ingegneria.
    sezioni: [
      // Via Claudio gira attorno allo stadio: nella lunga curva (a destra, stadio sul lato esterno) lo si vede davanti per tutto il tempo.
      { id: 'via-claudio',   lung: 110, amb: 'est' },
      { id: 'curva-stadio',  lung: 270, amb: 'est', curva: Math.PI * 0.6 },
      { id: 'via-claudio2',  lung: 90,  amb: 'est' },
      { id: 'piazzale-ing',  lung: 110, amb: 'est' },
      { id: 'ingresso-ing',  lung: 20,  amb: 'est' },
    ],
    velocita: 13.5,
    cielo: 0xA9D0F2,
    terreno: 0x9C9890,
    corsie: 0xACA8A0,
    edifici: [0xC9962E, 0xE2D3B5, 0xA9A397],
    ostacoli: { basso: 0x2C5F8A, alto: 0xC9962E, muro: 0x5B5E72 },
  },
  {
    nome: 'Federico II · Magistrale',
    arco: 'universita',
    gruppo: 'Università Federico II',
    eta: 'universita',
    ordine: 2,
    stile: 'magistrale',
    anni: '2023 – 2026',
    luogo: 'Napoli',
    // Il viale dentro la Facoltà di Ingegneria. A metà, l'esame: Roberto corre verso la facoltà ed entra
    // in aula (vedi aula-esame.js).
    // Oltre il cancello la strada si divide (sinistra, dritto, destra): si va a sinistra. A sinistra i
    // cinque gradoni con gli studenti che mangiano, davanti dieci scalini; poi dentro l'edificio, un breve
    // corridoio con tre aule: si entra nella Ia3.
    sezioni: [
      { id: 'viale-ing',     lung: 50,  amb: 'est' },
      { id: 'bivio',         lung: 40,  amb: 'est', curva: -Math.PI / 2 },    // curva negativa = a sinistra
      { id: 'gradoni',       lung: 70,  amb: 'est' },
      { id: 'scalinata',     lung: 6,   amb: 'est', pend: 0.28, gradini: true },
      { id: 'davanti-ed',    lung: 8,   amb: 'est' },
      { id: 'atrio-uni',     lung: 8,   amb: 'int' },
      { id: 'corridoio-uni', lung: 110, amb: 'int' },
      { id: 'esame',         lung: 6,   amb: 'int', evento: 'esame' },
      { id: 'uscita-uni',    lung: 22,  amb: 'int' },
      { id: 'portone-uni',   lung: 10,  amb: 'int' },
      { id: 'dopo-esame',    lung: 340, amb: 'est' },
      { id: 'boss-ragazza',  lung: 700, amb: 'est', boss: 'ragazza', checkpoint: 'La fidanzata' },   // ultimo boss: il tratto è lungo perché durante lo scontro si corre piano
    ],
    velocita: 15,
    cielo: 0xA9D0F2,
    terreno: 0x8F8B84,
    corsie: 0x9E9A92,
    interno: { cielo: 0xD8D4CA, terreno: 0xCFCAC0, corsie: 0xD6D1C6 },
    edifici: [0xE9EEF3, 0xB8C4D0, 0x6C7A89],
    ostacoli: { basso: 0xE07A2E, alto: 0x3A3F4A, muro: 0xF2C14E },
  },
  {
    nome: 'Rennes',
    arco: 'universita',
    eta: 'universita',
    ordine: 3,
    stile: 'rennes',
    anni: '2026',
    luogo: 'Bretagna, Francia',
    // Una corsa corta sotto la pioggerella, tra le casette a schiera: prima il CROUS (qui le prime quattro
    // persone), poi un incrocio, la piazza con la chiesa gotica e la giostra, infine la Fitness Park.
    sezioni: [
      { id: 'rennes-via',      lung: 50,  amb: 'est' },
      { id: 'rennes-crous',    lung: 130, amb: 'est' },
      { id: 'rennes-incrocio', lung: 60,  amb: 'est' },
      { id: 'rennes-piazza',   lung: 135, amb: 'est' },
      { id: 'rennes-fitness',  lung: 85,  amb: 'est' },
      { id: 'rennes-fine',     lung: 25,  amb: 'est' },
    ],
    velocita: 17.5,
    cielo: 0x8E99A6,
    terreno: 0x56605A,
    corsie: 0x5C636B,
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

// Ogni bonus raccolto (caffè, nutella, joystick...) toglie questo tempo dal timer (secondi).
export const BONUS_CAFFE = 5;
// Ogni colpo preso nel boss della fidanzata aggiunge questo tempo al timer (secondi).
export const MALUS_BOSS_RAGAZZA = 3;

// Penalità se in aula ci si siede in prima fila (secondi), e tempo per scegliere.
export const MALUS_PRIMA_FILA = 10;
export const TEMPO_SCELTA = 9;

// Modalità sviluppo: se si muore si riparte da dove si è morti (un po' prima dell'ostacolo),
// invece che dall'ultimo checkpoint. I checkpoint restano calcolati ma non vengono usati.
// Metti false per usare i checkpoint, come nel gioco finale.
export const MODALITA_SVILUPPO = true;
export const RESPAWN_INDIETRO = 16;     // metri prima del punto della caduta
export const RESPAWN_INVULNERABILE = 0.35;// secondi senza urti dopo la ripartenza
