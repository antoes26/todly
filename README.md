# Todly

Codice di Todly, importato dal progetto originale per preparare la migrazione su un account Cloudflare personale.

## Stato

Questa versione conserva interfaccia e funzioni, ma **non e ancora pronta per la pubblicazione indipendente**. L'accesso usa ancora le funzioni di ChatGPT Sites e deve essere sostituito. Anche configurazione di build e pubblicazione devono essere adattate al nuovo account.

## Dati personali

Il repository non contiene il backup delle attivita. `data-seed.json` e intenzionalmente vuoto. L'identificativo del proprietario originale e sostituito da un segnaposto. Prima del trasferimento bisogna importare sia le attivita iniziali sia i record del database dal backup privato e associarli ai nuovi account. Non pubblicare il backup in questo repository.

## Tecnologia

React, TypeScript, Vinext/Vite, Tailwind CSS; database Cloudflare D1. Dipendenze in `package.json` e `pnpm-lock.yaml`.

## Prossimi passaggi

1. Configurare il sistema di accesso indipendente.
2. Adattare build e pubblicazione a Cloudflare personale.
3. Creare il database e importare i dati privati fuori dal repository.
4. Verificare separazione account, funzionalita e completezza dei dati.
5. Collegare il dominio solo dopo le verifiche.

La versione attuale ospitata su ChatGPT non viene modificata da questo repository.
