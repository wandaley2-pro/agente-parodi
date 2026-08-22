# ANGY — Architettura tecnica

Documento di riferimento per chi deve analizzare o valutare il progetto.
Risponde a: **dove sta il "RAG"**, **come viene chiamato il modello AI**, **come è organizzata l'app**.

---

## 1. Struttura del progetto

```
agente-parodi/
├── frontend/
│   ├── index.html          # APP DI PRODUZIONE — 1.654 righe, single-file
│   ├── demo.html           # Demo self-contained con dati finti (no API)
│   └── demo-mock.js        # Dati mock legacy
├── supabase/
│   ├── config.toml         # Config Edge Functions (verify_jwt = false per funzione)
│   ├── functions/          # BACKEND — Deno / TypeScript
│   │   ├── auth/           #  63 righe — login con password condivisa
│   │   ├── generate/       # 504 righe — ⭐ IL CUORE: prompt + chiamata AI
│   │   ├── history/        # 111 righe — storico contenuti generati
│   │   ├── memoria/        # 204 righe — CRUD memoria brand
│   │   ├── transcribe/     # 162 righe — trascrizione audio → testo
│   │   └── trends/         # 269 righe — news e trend di settore
│   └── migrations/         # 5 file SQL — schema Postgres
├── .env.example            # Variabili ambiente (solo placeholder)
└── DEPLOY.md               # Istruzioni di deploy
```

**Totale: ~4.800 righe.** Nessun framework, nessun build step, nessun `node_modules`.

---

## 2. Stack

| Livello | Tecnologia | Note |
|---|---|---|
| Frontend | HTML + CSS + JavaScript vanilla | Nessun React/Vue. Un solo file. |
| Hosting frontend | Netlify (static) | Deploy automatico da branch git |
| Backend | Supabase Edge Functions (Deno) | 6 funzioni serverless in TypeScript |
| Database | Supabase Postgres | 6 tabelle |
| Modello AI | Google Gemini `gemini-2.0-flash` | Chiamata REST diretta |
| Auth | Password condivisa di team | Non c'è login per singolo utente |

---

## 3. Come viene chiamato il modello AI

**File:** `supabase/functions/generate/index.ts`, funzione `callGemini()` (righe 56–94).

Chiamata **REST diretta**, senza SDK:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=API_KEY
```

Caratteristiche:

- **JSON mode nativo** — `responseMimeType: "application/json"` forza il modello a restituire JSON strutturato invece di testo libero.
- **Retry automatico** — 3 tentativi con backoff progressivo (1s, 2s).
- **Parametri per tipo di contenuto**:

| Tipo | maxTokens | temperature | Perché |
|---|---|---|---|
| Social | 896 | 0.90 | Creatività alta, testo breve |
| Newsletter | 800 | 0.85 | Struttura più controllata |
| Ricetta completa | 1200 | 0.75 | Precisione sulle quantità |
| Idee ricette | 1000 | 0.95 | Massima divergenza creativa |

- **Parsing difensivo** — `parseJson()` prova `JSON.parse()`; se fallisce, estrae il primo blocco `{...}` con regex. Serve perché i modelli a volte aggiungono testo attorno al JSON.
- **Validazione post-generazione** — il copy viene troncato a 220 caratteri, l'obiettivo verificato contro un enum chiuso, gli hashtag deduplicati e limitati a 8.

La chiave API (`GEMINI_KEY`) sta **solo lato server**, come variabile d'ambiente della Edge Function. Non è mai esposta al browser.

---

## 4. Il "RAG" — precisazione importante

**Non è un RAG vettoriale.** Non ci sono embedding, non c'è un vector database, non c'è ricerca semantica per similarità.

È un sistema di **context injection basato su SQL**: prima di ogni generazione, il backend interroga il database e concatena i risultati dentro il prompt come blocchi di testo.

**Dove:** `generate/index.ts`, righe 324–334.

```ts
const [memoriaRes, strategiaRes, storiaRes, tagsRes] = await Promise.all([
  supabase.from("angy_memoria").select("nota, tipo")...,        // regole fisse del brand
  supabase.from("angy_strategia").select("sezione, contenuto")..., // strategia editoriale
  supabase.from("ped_history").select("copy, formato, framework")
          .order("created_at", {ascending:false}).limit(15),     // ultimi 15 post
  supabase.from("angy_hashtags").select("tag")...,               // hashtag fissi
]);
```

Quattro query in parallelo → i risultati diventano quattro sezioni del prompt:

```
═══ STRATEGIA EDITORIALE DEL BRAND ═══
{strategia}

═══ REGOLE FISSE DA RISPETTARE SEMPRE ═══
{noteMemoria}

═══ TEMI GIÀ USATI — ANGOLO DIVERSO OBBLIGATORIO ═══
{temiUsati}

HASHTAG FISSI DEL BRAND (già presenti, non duplicare):
{hashtagsFissi}
```

### Perché funziona comunque bene

Il dataset è piccolo e strutturato (poche decine di righe per cliente): un RAG vettoriale sarebbe **overengineering**. Con questi volumi, iniettare tutto il contesto è più preciso della ricerca semantica — non c'è rischio di recuperare il chunk sbagliato.

**Il limite:** non scala. Oltre qualche centinaio di righe di memoria brand il prompt diventerebbe troppo lungo e costoso. A quel punto servirebbe un vero retrieval con embedding.

---

## 5. Anti-ripetizione — la parte non ovvia

Due meccanismi impediscono al modello di produrre contenuti sempre uguali:

**A. Iniezione dello storico.** Gli ultimi 15 post generati vengono inseriti nel prompt sotto l'header `TEMI GIÀ USATI — ANGOLO DIVERSO OBBLIGATORIO`. Il modello vede cosa ha già scritto e deve differenziarsi.

**B. Rotazione dei framework.** Ci sono 6 framework di copywriting hardcoded (righe 23–54):

`Hook & Punch` · `PAS` · `Mini-storytelling` · `Domanda-engagement` · `Tip veloce` · `Heritage`

Ad ogni generazione il sistema legge i 3 framework usati più di recente, li **esclude** dai candidati, e ne pesca uno a caso tra i restanti:

```ts
const frameworkRecenti = storiaRes.data.slice(0,3).map(s => s.framework);
const candidati = FRAMEWORKS.filter(f => !frameworkRecenti.includes(f.nome));
const framework = candidati[Math.floor(Math.random() * candidati.length)];
```

Il framework scelto viene salvato insieme al post, così il ciclo si autoalimenta.

---

## 6. Schema database

| Tabella | Contenuto |
|---|---|
| `ped_history` | Ogni contenuto generato: copy, formato, obiettivo, brief visual, hashtag, framework, status |
| `angy_memoria` | Regole operative del brand ("usa sempre X", "mai dire Y") |
| `angy_strategia` | Strategia editoriale per sezioni (target, pilastri, tono) |
| `angy_hashtags` | Hashtag fissi sempre inclusi |
| `angy_newsletter_esempi` | Newsletter passate usate come esempi di stile (few-shot) |
| `angy_giornate` | Calendario giornate mondiali / ricorrenze |

Tutte le tabelle hanno una colonna `cliente`. **Il progetto è già predisposto a livello dati per il multi-tenant**, anche se l'interfaccia attuale è cablata su un solo brand.

---

## 7. Autenticazione

Meccanismo semplice, pensato per un team interno di poche persone.

```
token = btoa(scadenza_timestamp + ":" + TEAM_PASSWORD)
```

- Il token viene generato da `auth/index.ts` dopo la verifica della password.
- Salvato in `sessionStorage` del browser, scadenza 24 ore.
- Ogni Edge Function lo valida con `validateToken()`: decodifica base64, confronta la password con la env var, controlla la scadenza.

**Limiti noti** (rilevanti in caso di valutazione tecnica):
- Password unica condivisa, nessun utente individuale
- Nessun audit trail per persona
- Il token è reversibile in base64 (non è un JWT firmato)

Adeguato per uso interno, **da rifare** se il prodotto va venduto a più clienti.

---

## 8. Le altre funzioni

| Funzione | Cosa fa |
|---|---|
| `auth` | Verifica password, emette token |
| `generate` | ⭐ Genera social / newsletter / ricette / idee ricette |
| `history` | Legge e aggiorna lo storico (`ped_history`), cambio status bozza→approvato |
| `memoria` | CRUD su memoria, strategia, hashtag — è il pannello di controllo del brand |
| `transcribe` | Audio → testo (per dettare i brief a voce) |
| `trends` | Recupera news e trend di settore da fonti esterne |

---

## 9. Flusso completo di una generazione

```
1. Utente compila il form nel frontend (formato, brief libero, trend)
        ↓
2. POST /functions/v1/generate  +  Bearer token
        ↓
3. Edge Function valida il token
        ↓
4. 4 query parallele su Postgres → contesto brand
        ↓
5. Costruzione del prompt (~2.500 parole: identità, voce, esempi
   positivi/negativi, framework attivo, regole SEO, storico, formato)
        ↓
6. POST a Gemini 2.0-flash in JSON mode (retry 3×)
        ↓
7. Parsing difensivo + validazione (troncamento 220 char, enum,
   dedup hashtag)
        ↓
8. INSERT in ped_history
        ↓
9. JSON al frontend → render di copy, hashtag, brief visuale
```

---

## 10. Valutazione onesta

**Punti di forza**
- Il prompt engineering è il vero asset: ~250 righe di istruzioni tarate sul brand, con esempi positivi e negativi, stop-words vietate, regole SEO social specifiche per Instagram.
- L'anti-ripetizione con rotazione framework è un'idea non banale e funziona.
- Zero dipendenze, zero build, costi di infrastruttura vicini allo zero.
- Schema dati già multi-cliente.

**Punti deboli**
- Auth non adatta a un prodotto multi-utente.
- Nessun test automatico.
- Frontend monolitico in un solo file da 1.654 righe: manutenibile ora, ingestibile a 5.000.
- Dipendenza da un solo provider AI senza fallback.
- Nessuna gestione di quota/costi per cliente.

**In sintesi:** è un tool interno solido e ben pensato, non ancora un prodotto SaaS. La distanza tra i due è soprattutto autenticazione, billing e onboarding — non la logica AI, che è la parte già matura.
