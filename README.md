# thanks

Pagina della mia tesi magistrale, servita su https://robertorocco.github.io/thanks/ (il QR code nella tesi punta qui: non rinominare `index.html`).

- `index.html`: menù (Gioca / Ringraziamenti)
- `ringraziamenti/`: i ringraziamenti
- `gioco/`: "Corri, Roberto", runner 3D in Three.js (vendorizzato in `gioco/lib/`, licenza MIT)
  - `gioco/mondi.js`: mondi, colori, lunghezze e velocità
  - `gioco/classifica.js`: salvataggio dei tempi (classifica condivisa su Supabase se `gioco/config.js` è compilato, altrimenti solo sul dispositivo)
- `supabase/classifica.sql`: tabella e regole della classifica, da eseguire una volta nello SQL Editor di Supabase

Per provarlo in locale: `python3 -m http.server` e apri http://localhost:8000/.

## Versioni

A ogni nuova versione si aumenta il numero `vN` mostrato vicino al tasto Gioca (in `index.html`) e al tasto Inizia (in `gioco/index.html`), così chi prova il gioco vede subito se ha la versione nuova. Storico: v1 prototipo, v2 grafica/velocità/difficoltà/intro, v3 etichetta di versione.
