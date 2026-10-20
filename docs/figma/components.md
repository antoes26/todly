> Analisi del repository `antoes26/todly`, main al commit `d55cff4c99c0000750fe464228af403eba329ad7`, 20 ottobre 2026. Ricognizione del codice; nessun audit visivo autenticato o modifica dei servizi.

# Componenti e varianti

Componenti realmente montati: `RootLayout`, `PwaSupport` (senza UI), `Home`, `AuthPanel`, `Dashboard`, `TaskRow`, `EmptyState`, `TaskModal`. Sidebar, card e menu sono markup interno a Dashboard, non componenti della libreria generica. Le denominazioni Figma seguenti sono proposte di organizzazione, senza cambiare il prodotto.

| Component set Figma | Fonte | Proprietà / varianti modificabili |
| --- | --- | --- |
| Brand | globals.css, public/icons/todly.svg | 29 / 47; SVG vettoriale, senza rotazione |
| Auth/Card | auth-panel.tsx | signin / signup / reset / updatePassword; configured; busy; error; message |
| Auth/Field | auth-panel.tsx | email / password / confirmation; required; disabled; helper |
| Button/Primary | globals.css | default / hover / focus / disabled; label e icona opzionale |
| Button/Google | auth-panel.tsx | default / hover / disabled; testo e G tipografica |
| Button/Icon | todo-app.tsx | collapse / expand / add / close / logout / more; desktop e touch44 |
| Navigation/Sidebar | Dashboard | desktop-expanded / desktop-collapsed / mobile-open / mobile-closed |
| Navigation/Item | Dashboard | overview / tasks; default / active / hover; count opzionale |
| Navigation/Area | areaRow | default / active / hover / menu-open; pinned; archived; nome lungo; count; azioni rivelate |
| Navigation/Archived | Dashboard | expanded / collapsed; count |
| Navigation/Identity | Dashboard | avatar iniziale, nome, sottotitolo, logout busy |
| Header/Topbar | Dashboard | desktop / mobile; breadcrumb dinamico, data desktop, add |
| Card/Welcome | Dashboard | conteggio aperte; link verso attività da iniziare |
| Card/Stats | Dashboard | tre righe: aperte / in corso / completate |
| Card/Recent | Dashboard | populated / empty; lista istanze Task/Row |
| Card/Areas | Dashboard | fino a5 aree; nomi e conteggi; puntini senza azione |
| Card/Progress | Dashboard | conteggio e percentuale; barra da0 a100 |
| Task/Row | TaskRow | stato3, priorità4, pinned, note presenti, data presente, category presente, desktop/mobile |
| Task/Check | TaskRow | unchecked / checked / hover / focus |
| Task/Priority | TaskRow | Alta / Media / Bassa / Di routine; nascosta mobile |
| Task/Status | TaskRow | Da iniziare / In corso / Completato, dot6 |
| Filters/Search | Dashboard | empty / filled / focus; placeholder esatto dal codice |
| Filters/Select | Dashboard | status4 opzioni; creation4 opzioni; desktop/mobile |
| Filters/Archive | Dashboard | off / on; label invertita |
| Modal/Task | TaskModal | create / edit; blank / populated / saving; stato solo in edit |
| Field/Task | TaskModal | text / textarea / select / date; required / optional; focus |
| Menu/Task | Dashboard | pinned / unpinned, archived / active, saving; select altra area |
| Menu/Area | Dashboard | active / archived; rename / archive / restore / delete |
| Feedback/Error | Dashboard | testo, retry, close |
| Feedback/Loading | Dashboard | spinner18, testo |
| Feedback/Empty | EmptyState | icona, titolo, spiegazione, CTA |
| Feedback/Auth | AuthPanel | error role-alert / message role-status |
| Offline/Page | public/offline.html | informazione e link Riprova; nessun elenco locale |

Non costruire il prodotto combinando i componenti `components/ui/*` come se fossero già usati. Il grafo import dell'app non li monta. Inventario della libreria presente ma non collegata alle schermate analizzate:

`accordion`, `alert-dialog`, `alert`, `aspect-ratio`, `attachment`, `avatar`, `badge`, `breadcrumb`, `bubble`, `button-group`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `combobox`, `command`, `context-menu`, `dialog`, `direction`, `drawer`, `dropdown-menu`, `empty`, `field`, `form`, `hover-card`, `input-group`, `input-otp`, `input`, `item`, `kbd`, `label`, `marker`, `menubar`, `message-scroller`, `message`, `native-select`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `spinner`, `switch`, `table`, `tabs`, `textarea`, `toggle-group`, `toggle`, `tooltip`.

Le varianti interne di questa libreria (Radix, Base UI e utility Tailwind) non definiscono il design effettivo del dashboard. Non importare calendari, grafici, chat, drawer o carousel come nuove schermate.

## Specifica Task/Row

Testo principale = titolo; seconda riga = «Di routine» con Repeat2 se routine, poi area, categoria se presente e data formattata it-IT giorno/mese se presente; descrizione in anteprima quando valorizzata. Titolo completato barrato. Pin12 davanti al titolo se fissata. Routine con fondo viola e bordo sinistro3. Nessuna variante visiva `.is-pinned` autonoma oltre all'indicatore pin e all'ordine.

Su desktop testo flessibile, priorità/stato allineati; su mobile checkbox a sinistra, menu a destra, stato sotto il testo e priorità nascosta. Preservare note lunghe e a capo mobile, non sostituirle con un'altezza rigida.

## Asset e icone usate

Da `app/todo-app.tsx`: CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Folder, LayoutDashboard, ListTodo, LogOut, Menu, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pin, PinOff, Archive, ArchiveRestore, Trash2, Repeat2, ArrowRightLeft, Pencil, Plus, Search, SlidersHorizontal, Sparkles, X. Usare forme SVG editabili e misure JSX; non introdurre uno stile icone diverso. Gli asset del marchio sono già nel repository, senza necessità di un nuovo logo.

## Regole Auto Layout

Task row con testo Fill container e controlli fissi; le card Hug contents, wrapper Fill container; separatori stroke1. Sidebar verticale con navigazione aree scrollabile e identità in fondo. Modale con contenuto verticale scrollabile e footer sticky mobile. Esportare i badge come componenti, non come immagini. Le varianti ortogonali vanno espresse con proprietà booleane/testo e nested instances invece di duplicare tutte le combinazioni.
