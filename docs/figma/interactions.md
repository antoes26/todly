> Analisi del repository `antoes26/todly`, main al commit `d55cff4c99c0000750fe464228af403eba329ad7`, 20 ottobre 2026. Ricognizione del codice; nessun audit visivo autenticato o modifica dei servizi.

# Interazioni e comportamento

Fonti: [todo-app.tsx](../../app/todo-app.tsx), [auth-panel.tsx](../../app/auth-panel.tsx), route `app/api` e `app/auth`. Il prototipo Figma deve simulare questi comportamenti; non deve contattare servizi o raccogliere credenziali.

| Trigger | Risultato implementato | Note per il prototipo |
| --- | --- | --- |
| Marchio o Panoramica | view overview, area Tutte le aree, chiusura menu mobile | Naviga ad APP-01 |
| Tutte le attività | view tasks, area Tutte le aree, chiusura menu mobile | APP-02; gli altri filtri non sono azzerati |
| Area sidebar | view tasks, area selezionata, chiusura menu mobile | APP-03 |
| Area panoramica | view tasks, area selezionata | Stessa vista APP-03 |
| Vai alle attività nel benvenuto | view tasks, stato Da iniziare | Non azzera tutti gli altri filtri |
| Vedi tutte | view tasks, stato Tutte | Non azzera ricerca o area implicitamente |
| Aggiunta da topbar / pagina / empty / aree + | Apre nuova attività | Area predefinita selezionata nella vista area, altrimenti Personale |
| Titolo di un'attività | Apre modifica | Include campo stato |
| Checkbox | PATCH con Completato oppure Da iniziare | Aggiornamento dopo risposta; non passa per In corso |
| Selettore stato in modifica | Imposta anche In corso | Effettivo al salvataggio |
| Ricerca | Filtra titolo, note, area e categoria, case insensitive | Nessuna richiesta server per filtro |
| Stato | Tutte / Da iniziare / In corso / Completato | Eccezione routine sotto |
| Data creazione | Tutte le date / ultimi7 /30 /90 giorni | Non è filtro per scadenza |
| Attività archiviate | Inverte selezione archivio | Etichetta Torna alle attività quando attivo |
| Pin area | POST pinProject; aggiorna impostazioni dopo successo | Ordinamento fissate prima, poi alfabetico italiano |
| Aree archiviate | Espande/collassa gruppo sidebar | Non archivia tutte le attività singolarmente |
| Menu area: rinomina | Prompt nativo, trim; POST renameProject | Annulla o nome invariato non inviano |
| Menu area: archivia/ripristina | POST archiveProject; rimuove pin | Se area corrente, passa a lista generale |
| Menu area: elimina | Confirm nativo; POST deleteProject | Messaggio include numero attività; rimozione dall'UI |
| Menu attività: sposta | Select altre aree attive; PATCH | Nessuna creazione di nuova area dal menu |
| Menu attività: fissa | PATCH pinned | Label Rimuovi dall'alto quando fissata |
| Menu attività: archivia | PATCH archived | Label Ripristina attività in archivio |
| Menu attività: elimina | Confirm nativo, DELETE | Nessun undo o cestino |
| Logout | POST /api/auth action signout, redirect / | Errore nel banner, nessun successo simulato in caso di failure |
| Riprova banner | Ricarica attività | Non reinvia ultima mutazione |
| Chiudi banner | Azzera errore | Nessun cambiamento dati |

## Salvataggio e finestre

Titolo obbligatorio trim, max180; note max1200; categoria opzionale. Area è select con Personale e aree disponibili. Priorità Alta/Media/Bassa/Di routine; nuova attività parte Da iniziare. Data facoltativa. Il submit disabilita il pulsante durante salvataggio o se titolo vuoto. Successo chiude modale e aggiorna lista; errore mantiene la modale e appare nel banner della pagina sottostante. Non inventare toast di successo o errori inline assenti.

Annulla, X e click sul backdrop chiudono il modulo; Escape chiude salvo saving. Nel codice X, Annulla e backdrop non hanno la stessa protezione saving di Escape: per fedeltà annotare la differenza, senza correggerla nel design. Modale e menu mobile bloccano lo scroll del body; i menu contestuali no. Menu si chiudono con Escape o scrim trasparente; l'apertura del menu attività chiude quello area.

## Ordinamento, dati e date

Routine e fissati sono prominenti, ma l'ordine completo è: non completate prima, routine prima, pinned prima, data creazione decrescente. Recenti = tutte le routine/fissate più fino a6 altre attività, poi lo stesso ordinamento. Conteggi e progresso escludono attività e aree archiviate. Per valori positivi la barra ha un minimo grafico del4%, mentre la percentuale testuale è arrotondata; se non ci sono attività la barra è0.

Le routine ignorano ricerca, stato e range creazione, ma rispettano area e archivio. Ogni nuovo giorno Europe/Rome una routine completata torna Da iniziare; controllo al caricamento server, focus e timer30s browser. La data testuale in topbar usa locale it-IT e fuso del browser, mentre il giorno routine è esplicitamente Europe/Rome.

## Autenticazione

- Signin: email e password12–128; POST signin; successo ritorna `/`. Google apre `/auth/google`, provider esterno, callback e ritorno alla home.
- Signup: email, password e conferma; controllo corrispondenza client; successo con sessione torna a `/`, senza sessione mostra messaggio di conferma email.
- Reset: solo email; risposta neutra senza rivelare se l'account esiste. Link recovery via `/auth/confirm` porta a `/auth/update-password`.
- Update password richiede sessione verificata; altrimenti redirect `/?auth_error=expired`. Salvataggio riuscito torna alla home.
- Cambio modalità pulisce password, conferma, errore e messaggio; conserva email. Durante busy i link di cambio modalità sono nascosti, i campi disabilitati e il submit mostra Un momento….
- Configurazione assente disabilita accesso e Google. Errori query `google`, `callback`, `expired` diventano messaggi nella schermata accesso.

## Responsive, focus e movimento

Menu mobile apre da sinistra, transizione .22s; sidebar desktop comprime a76. Dropdown e date picker sono controlli nativi e dipendono dalla piattaforma. Non promettere il focus trap o navigazione menu con frecce: non sono implementati esplicitamente. Esistono autofocus, Escape e outline; vanno verificati con tastiera. Riduzione movimento imposta transizioni/animazioni a .01ms. Spinner ruota .8s; progress width .3s.

Non ci sono route distinte per filtri o aree, né persistenza locale dei filtri. Non c'è shortcut Cmd-K funzionante: il markup del suggerimento è presente, ma nascosto dal CSS finale e senza handler. Nessun Production Plan, calendario interattivo, notifiche o modifica del profilo da prototipare.
