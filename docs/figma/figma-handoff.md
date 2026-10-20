> Analisi del repository `antoes26/todly`, main al commit `d55cff4c99c0000750fe464228af403eba329ad7`, 20 ottobre 2026. Ricognizione del codice; nessun audit visivo autenticato o modifica dei servizi.

# Handoff per il file Figma esistente

Destinazione unica: https://www.figma.com/design/jf5499ScF266PvXPeGSWFA

Sito di riferimento: https://todly.antonioemanuelespena.workers.dev/

## Stato della consegna

È stata verificata la disponibilità degli strumenti nella sessione: non è presente un'integrazione Figma callable, quindi non è stato possibile leggere struttura/permessi del file né scrivere frame nel documento. **Il file Figma non è stato modificato e non è stato creato un file nuovo.** Il link condiviso da solo non concede capacità di scrittura a questa sessione.

La documentazione deriva dal codice del commit indicato, non da una cattura autenticata del sito pubblicato. Non si presume che produzione e commit coincidano. Per completare la fedeltà visiva servono confronto nel browser, font risolto e schermate con dati sintetici autorizzati. Non servono modifiche a Supabase, Cloudflare o deploy per redigere questo handoff.

## Pacchetto da trasferire tramite ChatGPT

Allega o incolla, nell'ordine, [screen-inventory.md](screen-inventory.md), [design-tokens.md](design-tokens.md), [components.md](components.md), [interactions.md](interactions.md) e questo file. Aggiungi gli asset originali `public/icons/todly.svg` e gli SVG Lucide corrispondenti; i PNG PWA sono riferimenti di installazione, non sostituti dei frame editabili. I contenuti JSX sono la fonte esatta dei microtesti. Il registro CSS completo è incluso in design-tokens.md.

Se ChatGPT dispone in un'altra sessione di un'integrazione Figma, chiedere prima di verificare le operazioni effettivamente disponibili: una funzione di lettura o screenshot non implica creazione di nodi. Serve scrittura su questo specifico file. In assenza di tale capacità, seguire la costruzione manuale qui sotto; non trasformare screenshot in un unico livello raster e non dichiarare eseguito l'import.

### Prompt riutilizzabile

> Usa esclusivamente il file Figma esistente jf5499ScF266PvXPeGSWFA. Leggi i cinque documenti allegati di docs/figma e verifica le tue effettive capacità di scrittura prima di agire. Conserva i contenuti esistenti: ispezionali e riusa o aggiungi sezioni Todly senza cancellare nulla. Ricostruisci solo superfici implementate, usando frame, Auto Layout, testi editabili, SVG e componenti con varianti. Non aggiungere Production Plan o calendario. Segui i valori CSS finali e segnala le differenze non verificabili in browser. Non creare un nuovo file, non modificare codice o servizi e non effettuare deploy. Al termine elenca i nodi creati con link reali, le verifiche fatte e le limitazioni; se non puoi scrivere, dichiaralo.

## Ordine di costruzione manuale o con integrazione

1. Aprire il file esistente, controllare permesso di modifica e struttura già presente. I nomi seguenti sono una proposta di organizzazione; non sono pagine già create né impongono la rimozione di contenuti esistenti.
2. Preparare sezioni `Todly / Foundations`, `Components`, `Desktop`, `Mobile`, `States & Flows` nel file, riutilizzando strutture equivalenti se presenti.
3. Creare variabili colore dalla palette finale e text styles dalle misure. Conservare differenze semantiche tra priorità, stato e routine. Non installare o imporre Inter senza verificare il font del browser di riferimento.
4. Creare prima Brand, Button, Field, Badge, TaskRow e NavigationItem, poi Sidebar, Topbar e card. Usare proprietà testuali, boolean e swap icon, mantenendo layer nominati ed editabili.
5. Ricostruire AUTH-01–04, poi APP-01–04 con la stessa shell, quindi MOD-01/02, MENU-01/02, NAV-01/02 e PWA-01. Riprendere gli ID dell'inventario nei nomi dei frame.
6. Aggiungere stati di caricamento, errore, vuoto, conferma e busy secondo la matrice. Non trasformare Google, email o prompt nativi in nuove schermate proprietarie.
7. Collegare i flussi descritti in interactions.md mediante navigazione, overlay e interactive components. Le risposte backend sono simulazioni dichiarate.
8. Confrontare a scala100% con browser alla stessa larghezza, usando screenshot solo come riferimento temporaneo; controllare font, bounding box, ritorni a capo, scroll, colori, icone e varianti. Rimuovere o nascondere il riferimento raster dalla consegna finale.

## Frame di riferimento e vincoli

Le dimensioni seguenti sono **proposte per il lavoro di ricostruzione**, non dimensioni dichiarate dal sito: desktop1440×1000, tablet1024×1000, mobile390×844. Aggiungere verifiche a760/761 e360/361 per i breakpoint. Frame verticalmente scrollabili per contenuti più lunghi; non ridurre la tipografia per farli stare.

Desktop: Sidebar fixed324 (compressa76), topbar sticky76, main fill. A1440, main1116; workspace border-box min(1160,100%) =1116, con padding laterale42. Sopra1100 le due griglie sono a due colonne. A1024 il media query <=1100 le impila e usa padding26. A390 sidebar mobile min(324,351)=324, main390, workspace laterali14 salvo safe area. Menu e modali sono overlay, non colonne aggiunte al layout.

Non impostare una griglia di pagina inventata da12 colonne. Auto Layout deve rappresentare flex/grid presenti. Applicare scroll e fixed position nei prototype constraints; adattare safe area solo al dispositivo scelto, annotando il valore perché env(safe-area-inset-*) dipende dal contesto reale.

## Dati sintetici di confronto

Usare nomi di aree come Personale, Lavoro, Studio; attività brevi e lunghe, con e senza note/categoria/data. Includere ogni stato e priorità, una routine completata oggi, un elemento fissato, uno archiviato e un'area archiviata. Questi esempi sono fixture di design, non dati presenti nel repository. Non importare backup, attività private o sessioni reali nel file Figma. Derivare conteggi e percentuali dalle fixture, evitando numeri incoerenti tra sidebar e dashboard.

## Checklist di accettazione

- [ ] Il file di destinazione è quello esistente; contenuti precedenti preservati.
- [ ] Tutti gli ID e stati della matrice sono coperti su desktop/mobile; tablet e limiti responsive verificati.
- [ ] Testi sono layer editabili, card e righe istanze; icone sono vettori, non screenshot dell'intera UI.
- [ ] Form login, registro, recupero e nuova password mantengono campi e messaggi reali.
- [ ] Sidebar estesa/compressa e mobile, archivi separati, pin e menu hanno le varianti corrette.
- [ ] Badge, colori e font corrispondono alla cascata finale; nessuna palette iniziale applicata per errore.
- [ ] Routine, ricerca, filtri e ordinamento rispettano le eccezioni implementate.
- [ ] Errori, busy, vuoto e offline non simulano funzionalità mancanti.
- [ ] Non sono stati aggiunti Production Plan, calendario o nuove funzioni.
- [ ] Fedeltà verificata contro browser con viewport e font annotati; differenze residue elencate.
- [ ] Consegnati link ai frame effettivi e stato del prototipo, senza affermare verifiche non eseguite.

Questa checklist è intenzionalmente non spuntata: documentazione pronta non significa file Figma completato. Nessuna schermata autenticata, asset raster di confronto o modifica del file è stata prodotta in questa sessione.
