# Attivare Todly nei propri account

Il codice supporta email/password, registrazione con conferma email, recupero password e Google. Prima dell'uso reale occorre configurare i servizi descritti sotto. Le attivita rimangono in Cloudflare D1; Supabase gestisce soltanto identita e accessi.

## 1. Supabase

1. Creare un account su https://supabase.com/dashboard e un progetto chiamato `todly`.
2. Nella sezione Connect/API keys annotare **Project URL** e **Publishable key**. Non usare la chiave `service_role` o una Secret key nell'app.
3. In Authentication abilitare il provider Email, mantenere la conferma email e impostare password di almeno 12 caratteri.
4. Quando si conosce l'indirizzo Cloudflare, impostarlo come **Site URL** in Authentication > URL Configuration. Aggiungere il callback esatto `https://INDIRIZZO-TODLY/auth/callback` ai redirect consentiti.
5. Per conferma e recupero da un altro dispositivo, impostare questi link nei template email (sostituire il link di conferma, mantenendo la parte `{{ ... }}` letterale):

Conferma registrazione:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Conferma il tuo account Todly</a>
```

Recupero password:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Scegli una nuova password</a>
```

6. Configurare un server SMTP per inviare email ai destinatari previsti. Il mittente di prova integrato ha restrizioni sui destinatari e limiti di invio: non considerare conferme e recupero pronti per tutti prima di una prova reale. I dati SMTP si inseriscono in Supabase, mai nel repository.

## 2. Google

1. Aprire https://console.cloud.google.com/ e creare/selezionare un progetto per Todly.
2. In Google Auth Platform configurare nome applicazione e contatti richiesti. In modalita di test aggiungere gli account che useranno la prova.
3. Creare un client OAuth di tipo **Web application**. Copiare il callback mostrato da Supabase per Google tra gli **Authorized redirect URIs**: normalmente `https://PROJECT_REF.supabase.co/auth/v1/callback`.
4. In Supabase > Authentication > Sign In / Providers > Google abilitare il provider e inserire Client ID e Client Secret. Il segreto Google rimane in Supabase, non serve a Cloudflare o al codice.
5. Usare soltanto gli scope necessari per l'accesso: email, profilo e openid. Non sono richiesti Gmail o Drive.

Supabase collega normalmente le identita con la stessa email verificata. Usare la stessa email per entrambi i metodi e verificare nella prova che conducano allo stesso ID utente e alle stesse attivita. Email diverse possono creare spazi separati.

## 3. Cloudflare

1. Creare un database D1 denominato `todly-db` nel proprio account e copiarne il Database ID.
2. Sostituire il segnaposto `00000000-0000-4000-8000-000000000000` in `wrangler.jsonc` con quel Database ID. Il nome del binding deve restare `DB`.
3. Creare un'applicazione **Workers** collegata al repository privato GitHub `todly`. Non usare un progetto Pages statico.
4. Impostare installazione `pnpm install --frozen-lockfile`, build `pnpm run build`, deploy `pnpm run deploy`. Usare Node.js 22.13 o superiore e pnpm della versione indicata in package.json.
5. Configurare nel Worker tre variabili di runtime:

| Nome | Valore |
| --- | --- |
| `SUPABASE_URL` | Project URL Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key Supabase |
| `APP_URL` | Origine HTTPS esatta di Todly, senza percorsi; per esempio `https://todly.NOME.workers.dev` |

6. Applicare lo schema al database remoto con `pnpm run db:migrate:remote` da un ambiente autenticato nel proprio account Cloudflare. Questo comando non viene eseguito automaticamente dal deploy.
7. Pubblicare/aggiornare il Worker e verificare che il binding D1 e le variabili siano presenti. Senza variabili il sito mostra l'accesso disabilitato; senza database le operazioni sulle attivita restituiscono un errore, senza fingere il salvataggio.

Il build genera `dist/server/wrangler.json`, usato dallo script deploy. Il sito puo essere pubblicato prima di configurare Supabase per ottenere l'indirizzo; poi impostare APP_URL, Site URL e callback e ripubblicare.

## 4. Importare i dati privati

1. Fare una copia aggiornata del vecchio sito prima del passaggio e non modificarne i dati durante la copia.
2. Accedere una volta al nuovo Todly con l'account del proprietario. Leggere il suo **User UID** in Supabase > Authentication > Users.
3. Estrarre il backup privato. Conservare fuori da GitHub sia `dati/esportazione-originale.json` sia `codice/data-seed.json`.
4. Preparare l'importazione in un file privato con:

```sh
python3 scripts/prepare-data-import.py \
  --backup /PERCORSO-PRIVATO/esportazione-originale.json \
  --seed /PERCORSO-PRIVATO/data-seed.json \
  --source-user ID_ORIGINALE_DAL_BACKUP \
  --target-user UUID_DEL_NUOVO_ACCOUNT \
  --output private-data/import.sql
```

5. Eseguire dapprima su un database di prova con lo schema gia creato. Lo script unisce le attivita iniziali ai record del database, conserva eliminazioni e impostazioni e sostituisce l'associazione al vecchio account.
6. Dopo il confronto, importare nel database remoto nuovo con `pnpm exec wrangler d1 execute DB --remote --file private-data/import.sql`. L'importazione usa INSERT: se una chiave esiste gia si interrompe, senza sovrascriverla. Non ripetere alla cieca un'importazione parzialmente riuscita.
7. Per ulteriori utenti ripetere con l'associazione corretta; non assegnare attivita del proprietario al primo visitatore o in base a un'email fornita dal browser.

Il nuovo codice legge tutto da D1: il file data-seed.json nel repository e vuoto e non viene usato per attribuire dati al proprietario.

## 5. Verifica finale

- Registrazione, conferma email, email/password e uscita.
- Accesso Google, callback, sessione e uscita.
- Recupero password con un'email reale e collegamento aperto anche da altro dispositivo.
- Stessa email verificata: stesso account con entrambi gli accessi.
- Due account distinti: nessuna attivita visibile o modificabile tra utenti.
- Confronto attivita, aree, archivio, routine e date con il vecchio sito.
- Solo dopo questi controlli collegare il dominio finale e aggiornare tutte le URL nei servizi.

## Sviluppo e controlli

Copiare `.dev.vars.example` in `.dev.vars`, compilare valori locali e usare `pnpm run dev`. I cookie sono HttpOnly; sono Secure su HTTPS. La verifica dell'utente avviene sul server tramite Supabase, non tramite header ChatGPT. Le richieste che modificano dati richiedono un Origin uguale ad APP_URL. Il vecchio sito ospitato su ChatGPT non viene modificato.

```sh
pnpm test
pnpm run typecheck
pnpm run build
```

I test locali usano identita e provider simulati. Non sostituiscono una prova reale degli account e dell'invio email.

Documentazione ufficiale:
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-smtp
- https://developers.cloudflare.com/workers/vite-plugin/reference/api/
