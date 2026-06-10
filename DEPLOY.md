# Deploy ANGY – Guida passo-passo

## Requisiti
- Account [Supabase](https://supabase.com) (gratuito)
- Account [Vercel](https://vercel.com) o [Netlify](https://netlify.com) (gratuito)
- API Key Google Gemini da [aistudio.google.com](https://aistudio.google.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installata localmente

---

## Passo 1 — Database Supabase

1. Vai su [supabase.com](https://supabase.com) → **New project**
2. Appunta: URL del progetto e le chiavi API (Settings → API)
3. Vai su **SQL Editor** e incolla il contenuto di `supabase/migrations/001_init.sql`
4. Clicca **Run** — verifica che le tabelle siano state create in **Table Editor**
5. Ripeti con `supabase/migrations/002_hashtags_framework.sql` (hashtag del team + framework tracking)

---

## Passo 2 — Edge Functions

### Installa Supabase CLI
```bash
npm install -g supabase
supabase login
```

### Collega al progetto
```bash
supabase link --project-ref IL_TUO_PROJECT_REF
# Il project ref si trova su: Settings → General → Reference ID
```

### Configura le variabili ambiente (lato server)
```bash
supabase secrets set TEAM_PASSWORD="la_password_che_scegli"
supabase secrets set GEMINI_KEY="AIzaSy..."
# SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono iniettate automaticamente
```

### Deploy delle funzioni
```bash
supabase functions deploy auth
supabase functions deploy generate
supabase functions deploy history
supabase functions deploy memoria
supabase functions deploy trends
```

### Verifica
```bash
# Test auth
curl -X POST https://IL_TUO_URL.supabase.co/functions/v1/auth \
  -H "Content-Type: application/json" \
  -H "apikey: LA_TUA_ANON_KEY" \
  -d '{"password":"la_password_che_scegli"}'

# Risposta attesa: {"token":"...","expiresAt":...}
```

---

## Passo 3 — Frontend

### Modifica `frontend/index.html`

Apri il file e aggiorna il blocco CONFIG:

```javascript
const CONFIG = {
  supabaseUrl: "https://XXXXXXXXXXXXXXXX.supabase.co",   // il tuo URL
  supabaseAnonKey: "eyJhb...",                            // la tua anon key
};
```

> ⚠️ L'anon key è pubblica per design — non mette a rischio la sicurezza.
> Le chiavi segrete sono SOLO nelle variabili ambiente Supabase.

### Deploy su Netlify (più semplice)

1. Vai su [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
2. Trascina la cartella `frontend/` nel browser
3. Netlify ti dà un URL tipo `https://amazing-name-123.netlify.app`
4. Condividi l'URL con il team insieme alla password

### Oppure deploy su Vercel

```bash
npm install -g vercel
cd frontend
vercel --prod
```

---

## Passo 4 — Test finale

1. Apri l'URL del sito
2. Inserisci la password che hai configurato in TEAM_PASSWORD
3. Scegli un formato e clicca **Genera**
4. Verifica che il risultato appaia in < 5 secondi
5. Genera una seconda volta — i temi devono essere diversi

---

## Gestione memoria (angy_memoria)

Per aggiungere/modificare regole che ANGY deve rispettare:

1. Vai su **Supabase → Table Editor → angy_memoria**
2. Aggiungi una riga con:
   - `cliente`: "Angelo Parodi"
   - `nota`: la regola in linguaggio naturale
   - `tipo`: "tono" | "brand" | "compliance" | "da_ricordare"
   - `attiva`: true
3. Al prossimo post generato, la regola verrà rispettata automaticamente

---

## Cambiare password

```bash
supabase secrets set TEAM_PASSWORD="nuova_password"
```
Le sessioni attive scadono dopo 24h.

---

## Costi stimati

| Servizio | Piano | Costo |
|---|---|---|
| Supabase | Free (500MB, 2 funzioni) | €0 |
| Gemini 1.5 Flash | Pay-per-use (~€0.001/richiesta) | ~€0 |
| Netlify/Vercel | Free (hosting statico) | €0 |
| **Totale** | | **~€0/mese** |
