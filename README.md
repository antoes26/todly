# Todly

Spazio personale per attivita, aree di lavoro e scadenze.

## Versione indipendente

Questa versione usa Cloudflare Workers e D1 per il sito e le attivita, e Supabase Auth per:
- accesso con email e password;
- registrazione e conferma email;
- recupero e aggiornamento password;
- accesso con Google;
- verifica dell'identita sul server e dati separati per account.

## Prima di pubblicare

Il codice e predisposto, ma l'attivazione richiede gli account e la configurazione descritti in [CONFIGURAZIONE.md](CONFIGURAZIONE.md). Sostituire il Database ID segnaposto, configurare le tre variabili di runtime e impostare Google e l'invio email in Supabase.

La pubblicazione di questo repository non modifica il vecchio sito ospitato su ChatGPT. I dati personali non sono inclusi: importarli dal backup privato solo dopo aver creato il nuovo account. Lo script `scripts/prepare-data-import.py` prepara l'associazione al nuovo utente senza contattare il sito online.

## Comandi

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run build
```

Per sviluppo copiare `.dev.vars.example` in `.dev.vars`, configurare i valori e usare `pnpm run dev`.

Per Cloudflare: build `pnpm run build`, deploy `pnpm run deploy`. Lo schema D1 si applica separatamente con `pnpm run db:migrate:remote` in un ambiente autenticato.

## Dati e credenziali

Non caricare backup, attivita personali, `.dev.vars`, password, chiavi segrete o sessioni in questo repository. Supabase usa una chiave publishable nell'app; la chiave service_role non serve. Il Client Secret Google rimane nelle impostazioni Supabase.

## Verifiche

I test locali coprono separazione account, operazioni sulle attivita, gestione delle identita, flussi di accesso simulati e controlli di origine. Email reali, Google e il nuovo database remoto vanno verificati dopo la configurazione dei servizi.
