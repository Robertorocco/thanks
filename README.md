# thanks

Pagina della mia tesi magistrale, servita su https://robertorocco.github.io/thanks/ (il QR code nella tesi punta qui: non rinominare `index.html`).

- `index.html`: menù (Gioca / Ringraziamenti)
- `ringraziamenti/`: i ringraziamenti
- `gioco/`: "Corri, Roberto", runner 3D in Three.js (vendorizzato in `gioco/lib/`, licenza MIT)
  - `gioco/mondi.js`: mondi, colori, velocità e, per il mondo 1, l'elenco delle sezioni del percorso (salita, scuola, scale, aula…)
  - `gioco/percorso.js`: il tracciato (pendenze e curve) a partire dalle sezioni
  - `gioco/livello.js`: ostacoli, caffè e scenografia lungo il tracciato (stesso percorso per tutti)
  - `gioco/modelli.js`, `gioco/modelli-liceo.js`, `gioco/modelli-infanzia.js`: modelli 3D a blocchi (personaggi con le tre età neonato/bimbo/liceo, ostacoli, scuole, interni, casa e Istituto Darmon)
  - `gioco/aula.js`, `gioco/aula-darmon.js`: le scene in classe (5ª H al liceo, 3ª B col maestro Rodolfo all'Istituto Darmon)
  - `gioco/volto.js`: il volto stilizzato di Roberto (riccioli, barba, sopracciglia) con 12 espressioni e battito di ciglia
  - `gioco/aula.js`: la scena in classe (5ª H) con la scelta della fila
  - `gioco/classifica.js`: salvataggio dei tempi (classifica condivisa su Supabase se `gioco/config.js` è compilato, altrimenti solo sul dispositivo)
- `supabase/classifica.sql`: tabella e regole della classifica, da eseguire una volta nello SQL Editor di Supabase

Per provarlo in locale: `python3 -m http.server` e apri http://localhost:8000/.

## Versioni

Per cambiare versione basta `./bump.sh N`: aggiorna etichette, import map, `versione.json` e il controllo automatico (le pagine confrontano la loro versione con `versione.json` e, se arrivano dalla cache del browser, si ricaricano da sole). A ogni nuova versione si aumenta il numero `vN` mostrato vicino al tasto Gioca (in `index.html`) e al tasto Inizia (in `gioco/index.html`), così chi prova il gioco vede subito se ha la versione nuova. Storico: v1 prototipo, v2 grafica/velocità/difficoltà/intro, v3 etichetta di versione, v4 mondo 1 rifatto (salita con semafori e buche, la scuola in lontananza, scale e curve all'interno, scena in aula con scelta della fila, uscita). v5 buche con cartello di pericolo, pilastri più chiari, sudore, ultimo banco da tre con due amici. v6 tratto libero dopo la scena in aula, ombre che arrivano da lontano. v7 buche senza cartello (cono più grande, la buca spunta 1 s prima), caffè numerati e da -2 s, modalità sviluppo con respawn dove si muore.  v9 caffè 10 e 11 spostati fuori dalle persone, ragazzi che escono da scuola (camminano più piano davanti a te), porte animate (ingresso, aula, uscita), pose delle braccia sempre azzerate, "O'Cià" in prima fila.

## Modalità sviluppo

In `gioco/mondi.js` la costante `MODALITA_SVILUPPO` (ora `true`) fa ripartire da poco prima del punto della caduta invece che dall'ultimo checkpoint; nel menù di gioco compare "DEV". I checkpoint restano calcolati: per riattivarli, come nel gioco finale, basta metterla a `false`.

## Cache del telefono

I moduli JavaScript vengono caricati con `?v=N` (import map in `gioco/index.html`) e l'etichetta di versione del gioco si legge dal codice che gira davvero. A ogni versione cambia `N` nell'import map, nello `<script src="main.js?v=N">` e nell'etichetta di `index.html`.

v10: nuovo arco "Primi passi" prima del liceo (mondo "Casa mia" da neonato che gattona, poi "Istituto Darmon" da bambino; l'evento dell'Istituto è ancora un segnaposto), cutscene di crescita tra le età (contatore degli anni, lampo, scintille), volto stilizzato con espressioni usato nella corsa, nell'intro e in aula, caffè/biberon/merendine numerati per gruppo (C1.., D1.., 1..), menù sviluppo per partire da qualunque mondo. Cache `?v=10`.

v11: aggiornamento automatico quando il browser mostra pagine vecchie (`versione.json` + `bump.sh`).

v12: casa con i primi passi (niente salto né scivolata, camera che segue meglio il cambio di corsia, mamma/papà/nonna al posto dei gatti), Istituto Darmon con Roberto di 8 anni con la cartellina e la scena del maestro Rodolfo (piangere = giusto, salutare = +10 s e il maestro diventa un demonio), liceo con salita più ripida e visuale che la mostra, ingresso della Metro e l'amico biondo che esce da scuola con Roberto e poi viene seminato.

v13: Roberto torna a fare un saltello anche da piccolissimo.

v14: in casa le prime apparizioni di mamma, papà e nonna camminano più svelte; poi la mamma urla dal lato del corridoio e lancia la sua voce ("METTI IN ORDINE!") nella tua corsia, e il papà dal divano davanti alla TV ti tira il joystick: entrambi vanno schivati.

v15: Istituto Darmon rivisto: Roberto a 8 anni ha l'aspetto di un ragazzino (testa e busto più piccoli, riccioli corti, viso più giovane, grembiule con le maniche lunghe) e in mano una valigetta trasparente con dentro un disegno; la via verso la scuola è una salita verso i Camaldoli, con fosse segnalate dal cono e cartelli con la distanza; la scena del maestro Rodolfo finisce con un'inquadratura dall'alto verso la porta, tutti che escono (o il demonio che insegue) e il cartello dell'esito a classe vuota.

v16: in casa la mamma urla una volta sola, nel corridoio pieno di giocattoli (mucchi da schivare e giochi sparsi lungo i muri); il suo urlo che vola è uno scoppio a fumetto "ORDINE!"; papà è seduto bene sul divano, tiene il joystick con le due mani e lo lancia caricando il braccio sopra la testa; le braccia dei personaggi robusti non si deformano più quando si muovono.
