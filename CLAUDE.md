# Regole di lavoro per Todly

## Rami
- `main` è il sito ufficiale: https://todly.antonioemanuelespena.workers.dev
- `claude/compassionate-davinci-rk90gr` è il ramo di test fisso. Anteprima: https://claude-compassionate-davinci-rk90gr-todly.antonioemanuelespena.workers.dev

## Come lavorare
- Lavora sempre e solo sul ramo `claude/compassionate-davinci-rk90gr`. Non creare altri rami e non scrivere mai direttamente su `main`.
- Se la sessione si apre su un altro ramo, passa subito a `claude/compassionate-davinci-rk90gr`.
- Prima di iniziare una modifica, aggiorna il ramo di test con le ultime novità di `main`.
- Dopo ogni modifica fai commit e push sul ramo di test: Cloudflare aggiorna l'anteprima da solo in pochi minuti.
- Quando hai finito, dammi il link dell'anteprima e aspetta che io la approvi.

## Pubblicazione
- Solo quando ti dico "pubblica": apri (o aggiorna) la pull request da `claude/compassionate-davinci-rk90gr` a `main` e uniscila.
- Dopo il merge verifica che la build di produzione su Cloudflare sia andata a buon fine e che la modifica sia online.
- Non eliminare mai il ramo `claude/compassionate-davinci-rk90gr`, nemmeno dopo il merge.

## Comunicazione
- Spiegami le modifiche in italiano, in poche righe e senza termini tecnici inutili.
