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
v17: Roberto ha la barba appena accennata da liceale ed è più robusto, con un po' di pancia, sia a 8 anni sia al liceo; il corridoio dell'Istituto Darmon è rifatto dalla foto (zoccolatura verde acqua, muro rosa salmone con fascia di piastrelle, termosifoni gialli, pavimento in cotto, porte marroni, estintori, plafoniere quadrate) e si vede anche oltre la porta della 3ª B; la scuola da fuori è il blocco rosa su due piani con finestre a grata, scala esterna bianca, pensiline verde e di tegole, recinzione verde sul muretto, pino e cartello pedonale.
v18: all'inizio (e quando arrivano salto e scivolata, all'Istituto Darmon) i comandi restano a schermo 5 secondi mentre si gioca; un mobile sulla corsia di sinistra prima del papà col joystick; il demonio ha braccia con gomiti e mani ad artiglio che si alzano durante la trasformazione e la scritta è "Roberto aveva paura del maestro Rodolfo"; l'uscita dal Darmon è più lunga (circa 10 s) con il fratello e il suo creeper, che poi entra nella sua classe ("Dove vai?"); fuori dal liceo il biondo chiede i compiti, va al suo motorino sul marciapiede e si salutano.
v19: Roberto da bambino ha capelli neri corti, quasi senza ricci; il fratello all'uscita dalla 3ª B si fa vedere in faccia per qualche secondo, girato verso la camera che si avvicina, e alza un creeper di peluche più grande salutando con l'altra mano.
v20: il festival El Row non c'è più; triennale e magistrale sono un unico arco "Università Federico II" (un solo arco e un solo banner, i due mondi restano com'erano) e Rennes passa sotto l'università; a fine liceo c'è il primo boss, il Gelato Gigante: si sopravvive a tre fasi di attacco (pistacchio: coni che cadono dal cielo; fragola: palle che rotolano; cioccolato: onde da saltare o da passare sotto); ogni colpo vale +1 s, fa ingrassare Roberto (al massimo 5 volte) e lo rallenta, e ogni 5 s senza colpi dimagrisce un po' fino alla forma normale.
v21: meno scritte in tutto il gioco (niente "Via!", "Ahi!", nomi dei checkpoint e "Mondo N di 5"; i comandi sono una riga con una parola per gesto; l'arrivo in un mondo mostra solo nome e anni); il dialogo col biondo parte appena usciti dall'aula, con fumetti più piccoli e veloci, e finisce sulle scale; il boss del gelato non ha più scritte: ogni colpo è uno schizzo del gusto, Roberto barcolla e ingrassa, e rallenta del 20% a colpo (a 5 colpi va alla metà); il gelato ha la faccia sulla pallina di pistacchio, codette e cialda in cima e fa le smorfie quando attacca; il cioccolato è un'onda lucida che si arriccia con la scia sull'asfalto, oppure un getto lucido sospeso con le colature.
v22: il boss del gelato si sposta alla fine delle medie (Istituto Darmon), prima di diventare liceale, e si apre con il banner da picchiaduro "Il Bulimico Roby VS Cono Gelato"; uscito dalla 3ª B il fratello, prima di entrare nella sua classe, lancia il creeper in una corsia davanti a Roberto: atterra, lampeggia ed esplode, e va schivato; i bonus cambiano con l'età (ciuccio in casa, Nutella alle medie, joystick al liceo, CFU all'università); alla magistrale si entra nella facoltà di Ingegneria per l'esame: Roberto alla lavagna piena di matrici di controllo ottimo, il professore con solo tre dita seduto a un banchetto e dietro Chiara col tablet; si sceglie Copiare (Chiara alza il tablet con la risposta: promosso) o Rispondere (non la sa: il professore alza la mano con le sue tre dita e lo boccia, +10 s).
v23: nel boss del gelato Roberto ingrassa molto di più a ogni colpo (busto, pancia, braccia e faccia), corre più lento anche con le gambe, ciondola e suda, e il gelato gli scappa avanti quando rallenta; senza colpi dimagrisce piano piano, di continuo; nel corridoio del 3° piano del liceo una ragazza bionda con gli occhi azzurri gli viene incontro: "Ciao amo!", "Ciao!", poi si gira mentre lui passa; in 5ª H i due amici dell'ultima fila sono il pelato alto e secco col casco sul banco e la ragazza castana con la felpa viola, nel banco da due accanto a quello di Roberto.
v24: i personaggi che accompagnano Roberto non stanno più nelle corsie: la ragazza bionda, l'amico biondo del liceo e il fratello alle medie camminano lungo il muro, fuori dalle corsie, e la camera si sposta verso di loro per inquadrarli insieme a Roberto; la scena della ragazza dura di più (Roberto rallenta a metà), la camera stringe sul suo viso mentre dice "Ciao amo!" e poi la segue di spalle mentre supera Roberto lungo il muro e sparisce in fondo al corridoio.
