# thanks

Pagina della mia tesi magistrale, servita su https://robertorocco.github.io/thanks/ (il QR code nella tesi punta qui: non rinominare `index.html`).

- `index.html`: menù (Gioca / Ringraziamenti)
- `ringraziamenti/`: i ringraziamenti
- `gioco/`: "Corri, Roberto", runner 3D in Three.js (vendorizzato in `gioco/lib/`, licenza MIT)
  - `gioco/mondi.js`: mondi, colori, lunghezze e velocità
  - `gioco/classifica.js`: salvataggio dei tempi (classifica condivisa su Supabase se `gioco/config.js` è compilato, altrimenti solo sul dispositivo)
- `supabase/classifica.sql`: tabella e regole della classifica, da eseguire una volta nello SQL Editor di Supabase

Per provarlo in locale: `python3 -m http.server` e apri http://localhost:8000/.
