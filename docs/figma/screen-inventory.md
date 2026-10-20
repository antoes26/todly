> Analisi del repository `antoes26/todly`, main al commit `d55cff4c99c0000750fe464228af403eba329ad7`, 20 ottobre 2026. Ricognizione del codice; nessun audit visivo autenticato o modifica dei servizi.

# Inventario delle schermate per Figma

Inventario del codice al 20 ottobre 2026. È una ricognizione funzionale delle schermate e degli stati implementati, non un audit visivo o di accessibilità svolto in browser. Le varianti responsive non sono pagine separate.

## Schermate e viste

| ID | Superficie | Route / ingresso | Contenuti e azioni | Stati rilevanti |
| --- | --- | --- | --- | --- |
| AUTH-01 | Accesso | `/`, utente anonimo | Marchio, email, password, Accedi, Google, Registrati, Password dimenticata | Invio in corso, credenziali non valide, email non confermata, errore callback, accesso non configurato |
| AUTH-02 | Registrazione | Cambio modalità in AUTH-01, stessa route | Email, password e conferma, Crea account, Google, ritorno all'accesso | Password diverse, validazione, invio, richiesta conferma email, errore provider |
| AUTH-03 | Recupero password | Password dimenticata, stessa route | Email, Invio email di recupero, ritorno all'accesso | Messaggio neutro anche per email sconosciuta, indisponibilità invio |
| AUTH-04 | Nuova password | `/auth/update-password` dopo recupero | Nuova password, conferma, Salva nuova password, Torna alle attività | Invio, mancata corrispondenza, sessione scaduta con ritorno all'accesso |
| APP-01 | Panoramica | `/`, utente autenticato; voce Panoramica | Benvenuto, conteggi aperte/in corso/completate, attività recenti, fino a cinque aree, progresso, aggiunta attività | Caricamento, account vuoto, errore API, elenco popolato |
| APP-02 | Tutte le attività | Voce sidebar o link dalla panoramica, sempre `/` | Ricerca, stato, intervallo di creazione, lista, completamento rapido, modifica e menu attività | Nessun risultato, elenco popolato, errore, archivio attivo |
| APP-03 | Attività di un'area | Selezione area da sidebar o panoramica | Stessa lista di APP-02 con titolo e ambito dell'area selezionata | Area attiva o archiviata, elenco vuoto, filtri mantenuti nello stato locale |
| APP-04 | Attività archiviate | Toggle in APP-02/03 | Lista filtrata per attività archiviate, ripristino via menu | Ambito globale o di area; ritorno alle attività non archiviate |
| PWA-01 | Connessione assente | Fallback della navigazione alla home; `/offline.html` | Pagina pubblica informativa | Assenza rete; nessun dato personale disponibile offline |

Registrazione e recupero sono modalità dello stesso componente `AuthPanel`, non nuove route. `/auth/google`, `/auth/callback` e `/auth/confirm` sono passaggi di protocollo con redirect, non schermate autonome progettate nell'app; le eventuali pagine Google/Supabase sono esterne.

## Modali, menu e interazioni secondarie

| ID | Superficie | Apertura | Campi / azioni | Chiusura e feedback |
| --- | --- | --- | --- | --- |
| MOD-01 | Nuova attività | CTA nella topbar, pagina, stato vuoto o «+» delle aree | Titolo obbligatorio, note, area selezionabile, categoria, priorità, data; Aggiungi attività | Annulla, X, backdrop, Escape; pulsante Salvataggio…; chiusura dopo successo |
| MOD-02 | Modifica attività | Titolo di una riga | Campi di MOD-01 più Stato; Salva modifiche | Stessi meccanismi; errore nel banner della pagina sottostante |
| MENU-01 | Opzioni attività | Pulsante puntini della riga | Sposta in altra area disponibile, fissa/rimuovi dall'alto, archivia/ripristina, elimina | Click sullo sfondo o Escape; azioni di scrittura con stato busy |
| MENU-02 | Opzioni area | Puntini nella sidebar | Rinomina, archivia/ripristina, elimina | Sfondo o Escape; rinomina con prompt nativo |
| NAV-01 | Sidebar desktop | Sempre visibile, espandibile/comprimibile | Home, Panoramica, Tutte le attività, aree e conteggi, aree archiviate espandibili, identità e uscita | Indicazione della voce selezionata; fissaggio delle aree |
| NAV-02 | Menu mobile | Pulsante Apri menu | Contenuti della sidebar in pannello sovrapposto | X, sfondo, Escape o scelta della destinazione; blocco dello scroll sottostante |
| SYS-01 | Rinomina area | MENU-02 | `window.prompt` con nome corrente | Annullamento o invio; errori nel banner |
| SYS-02 | Conferma eliminazione | Menu di area o attività | `window.confirm`; per l'area viene esplicitato il coinvolgimento delle attività | Conferma o annullamento; nessun cestino UI |

Il selettore Area del modulo offre aree esistenti e Personale; non è un campo libero per creare un'area. Lo spostamento dal menu offre altre aree attive già disponibili. Non esiste una schermata separata di dettaglio attività: il dettaglio modificabile è MOD-02.

## Anatomia e stati condivisi

- **Shell autenticata:** sidebar, breadcrumb «Il mio spazio», titolo della vista, data, CTA di aggiunta e footer. L'identità mostra un'iniziale e il nome o parte dell'email; non apre una pagina profilo.
- **Riga attività:** completamento, titolo, area/categoria/data, anteprima note se presenti, priorità, stato e menu. Routine, elementi fissati e completati hanno varianti visive.
- **Caricamento:** spinner e messaggio «Sto preparando le tue attività…» al posto del contenuto.
- **Vuoto:** «Qui è tutto in ordine» con CTA Nuova attività. Lo stesso componente appare anche quando i filtri non trovano risultati; non c'è un testo specifico per la ricerca senza risultati.
- **Errore dati:** banner con messaggio, Riprova e chiusura. Riprova ricarica i dati; non reinvia automaticamente una modifica fallita.
- **Errore accesso:** messaggio con `role="alert"`; conferme con `role="status"`. La configurazione assente disabilita i campi di accesso e mostra «L'accesso sarà disponibile a breve».
- **Salvataggio:** risposta del server prima dell'aggiornamento della lista. Il modulo non salva i campi a ogni battuta.

## Comportamenti da preservare nelle revisioni UX

1. Le routine restano nella lista anche quando non soddisfano ricerca, stato o filtro temporale; la selezione dell'area e dell'archivio continua ad applicarsi.
2. Le attività completate vengono dopo quelle aperte; routine e fissaggio precedono la data. Non presentare la lista come ordinata per priorità Alta/Media/Bassa.
3. Le viste e i filtri sono stato React locale; un ricaricamento non ripristina un URL di area o archivio.
4. L'archivio delle aree è una sezione della sidebar; l'archivio delle attività è un filtro della lista. Non sono la stessa operazione.
5. I puntini della card «Le tue aree» non hanno un handler associato; quelli nell'intestazione dei conteggi sono un'icona. Non vanno conteggiati come menu funzionanti.
6. La ricerca mostra il suggerimento visivo `⌘ K`, ma nel codice esaminato non è registrata la relativa scorciatoia.

## Stile e adattamento ai dispositivi

Gli stili applicativi sono in `app/globals.css`: impianto chiaro con bianco e grigi, accenti per stati e priorità, marchio a spunta e icone Lucide. La font stack parte da Inter e usa font di sistema come fallback. Il file contiene più livelli di override: per valutare il risultato conta la cascata finale, non solo i primi token.

Su desktop la sidebar può comprimersi; su mobile, sotto il breakpoint di 760 px, diventa un pannello sovrapposto. Le griglie della panoramica si impilano, alcune informazioni come la pillola priorità vengono nascoste nella lista, mentre i menu delle righe restano accessibili. Sono presenti regole per schermi stretti, safe area, altezza dinamica, modali scorrevoli e preferenza di movimento ridotto.

## Accessibilità e verifiche consigliate

Il codice include label dei campi, nomi accessibili di molti pulsanti iconici, outline del focus, semantica dialog/menu, gestione Escape e stati di invio. Questo non dimostra conformità WCAG.

Restano da verificare in browser: ordine e contenimento del focus nelle modali, ritorno del focus dopo la chiusura, navigazione da tastiera nei menu, lettura dei banner del dashboard con screen reader, contrasto effettivo, zoom, tastiera virtuale e uso dei controlli touch. Non è stato eseguito un audit visivo di tutte le viste autenticate durante l'onboarding.

Per una futura raccolta screenshot usare account e dati sintetici autorizzati, coprendo AUTH-01–04, APP-01–04, MOD-01–02, menu aperti, caricamento/errore/vuoto e varianti desktop/mobile. Verificare separatamente installazione PWA su iPhone e percorsi reali Google/email.

## Fonti

- [app/page.tsx](../../app/page.tsx), [app/auth-panel.tsx](../../app/auth-panel.tsx), [app/auth/update-password/page.tsx](../../app/auth/update-password/page.tsx).
- [app/todo-app.tsx](../../app/todo-app.tsx), [app/globals.css](../../app/globals.css).
- [public/sw.js](../../public/sw.js), [app/pwa-support.tsx](../../app/pwa-support.tsx).
- [Componenti](components.md), [interazioni](interactions.md), [handoff](figma-handoff.md).

## Completezza e assenze verificate

**Production Plan: non trovato** nei sorgenti frontend, nelle route e nei contenuti pubblici. Non aggiungere una pagina con questo nome. Non c'è neppure una route calendario: `.calendar-*` e `components/ui/calendar.tsx` non sono prova di una funzionalità collegata.

Le sezioni della Panoramica sono: benvenuto «Un passo alla volta», conteggi «Il tuo spazio», «Attività recenti», «Le tue aree», «Ogni cosa al suo posto» con barra di avanzamento. La sidebar comprende marchio/home, Panoramica, Tutte le attività, aree attive con fissaggio e conteggio, espansione delle aree archiviate, identità e logout.

Tutte le superfici AUTH, APP, MOD, MENU e NAV sopra richiedono una rappresentazione desktop e mobile. SYS-01/02 sono finestre native del browser: documentarle come dipendenza dalla piattaforma, senza inventare una modale grafica del prodotto. PWA-01 ha un layout unico fluido. Gli stati di errori callback sono varianti di AUTH-01, non pagine nuove.

### Matrice di copertura dei frame

| Gruppo | Varianti da ricostruire | Contenuto di prova |
| --- | --- | --- |
| AUTH-01–04 | Default, busy, errore, conferma ove prevista; accesso disabilitato in AUTH-01 | Email sintetica, nessuna password reale |
| APP-01 | Popolata, vuota, caricamento, errore | Conteggi coerenti con le attività di prova |
| APP-02 | Tutte, stato selezionato, ricerca, intervallo temporale, nessun risultato | Routine sempre visibile anche se non corrisponde ai tre filtri |
| APP-03 | Area attiva e area archiviata selezionata | Titolo uguale all'area selezionata |
| APP-04 | Archivio generale e per area | Attività ripristinabile |
| MOD-01/02 | Default, campi compilati, salvataggio, titolo vuoto | MOD-02 include stato; MOD-01 no |
| MENU-01/02 | Elemento attivo, fissato e archiviato | Etichette invertite per le azioni reversibili |
| NAV-01/02 | Desktop estesa/compressa, mobile aperta/chiusa; aree archiviate aperte/chiuse | Nomi lunghi e conteggi |
| PWA-01 | Offline | Testo reale di public/offline.html |

Le combinazioni di stato non devono generare nuove funzionalità. Le dimensioni di riferimento dei frame sono proposte operative in [figma-handoff.md](figma-handoff.md), non misure del dispositivo dell'utente.
