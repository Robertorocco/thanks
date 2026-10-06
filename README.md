# thanks

Pagina della mia tesi magistrale, servita su https://robertorocco.github.io/thanks/ (il QR code nella tesi punta qui: non rinominare `index.html`).

- `index.html`: menù (Gioca / Ringraziamenti)
- `ringraziamenti/`: i ringraziamenti
- `gioco/`: "Corri, Roberto", runner 3D in Three.js (vendorizzato in `gioco/lib/`, licenza MIT)
  - `gioco/mondi.js`: mondi, colori, velocità e, per il mondo 1, l'elenco delle sezioni del percorso (salita, scuola, scale, aula…)
  - `gioco/percorso.js`: il tracciato (pendenze e curve) a partire dalle sezioni
  - `gioco/livello.js`: ostacoli, caffè e scenografia lungo il tracciato (stesso percorso per tutti)
  - `gioco/modelli.js`, `gioco/modelli-liceo.js`: modelli 3D a blocchi (personaggi, ostacoli, scuola, interni)
  - `gioco/aula.js`: la scena in classe (5ª H) con la scelta della fila
  - `gioco/classifica.js`: salvataggio dei tempi (classifica condivisa su Supabase se `gioco/config.js` è compilato, altrimenti solo sul dispositivo)
- `supabase/classifica.sql`: tabella e regole della classifica, da eseguire una volta nello SQL Editor di Supabase

Per provarlo in locale: `python3 -m http.server` e apri http://localhost:8000/.

## Versioni

A ogni nuova versione si aumenta il numero `vN` mostrato vicino al tasto Gioca (in `index.html`) e al tasto Inizia (in `gioco/index.html`), così chi prova il gioco vede subito se ha la versione nuova. Storico: v1 prototipo, v2 grafica/velocità/difficoltà/intro, v3 etichetta di versione, v4 mondo 1 rifatto (salita con semafori e buche, la scuola in lontananza, scale e curve all'interno, scena in aula con scelta della fila, uscita).
