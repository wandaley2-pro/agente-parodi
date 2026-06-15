import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function validateToken(token: string, teamPassword: string): boolean {
  try {
    const decoded = atob(token);
    const [expiryStr, secret] = decoded.split(/:(.+)/);
    const expiry = parseInt(expiryStr, 10);
    if (secret !== teamPassword) return false;
    if (Date.now() > expiry) return false;
    return true;
  } catch {
    return false;
  }
}

const FRAMEWORKS = [
  {
    nome: "Hook & Punch",
    guida:
      "Apri con un hook fortissimo nelle prime 8-10 parole (domanda provocatoria, affermazione inattesa o immagine vivida). Chiudi con una battuta o un'immagine memorabile. Niente parte centrale lunga.",
  },
  {
    nome: "PAS",
    guida:
      "Problema-Agitazione-Soluzione compresso: un problema quotidiano reale (fretta, dispensa vuota, pranzo triste), agitalo con ironia leggera in una frase, e il prodotto arriva come soluzione naturale. Mai venditore.",
  },
  {
    nome: "Mini-storytelling",
    guida:
      "Una micro-scena di vita quotidiana italiana (il pranzo della domenica, la pausa in ufficio, la dispensa di casa) in cui il prodotto è protagonista silenzioso. Dettagli concreti, sensoriali.",
  },
  {
    nome: "Domanda-engagement",
    guida:
      "Apri con una domanda diretta alla community che inviti davvero a rispondere nei commenti (preferenze, abitudini, ricordi legati alla tavola). La domanda deve essere facile e divertente da rispondere.",
  },
  {
    nome: "Tip veloce",
    guida:
      "Un consiglio pratico e inaspettato d'uso del prodotto in cucina, formato 'lo sapevi che' o 'prova così'. Deve dare valore reale: il lettore impara qualcosa.",
  },
  {
    nome: "Heritage",
    guida:
      "Un riferimento alla storia del brand dal 1888, raccontato con leggerezza e orgoglio, mai polveroso. Collega il passato a un momento di oggi.",
  },
];

async function callGemini(
  prompt: string,
  apiKey: string,
  maxTokens = 896,
  temperature = 0.9
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  };
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * attempt));
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Risposta Gemini vuota");
      return text;
    } catch (err) {
      lastError = err as Error;
      console.error(`Tentativo ${attempt + 1} fallito:`, err);
    }
  }
  throw lastError ?? new Error("Gemini non disponibile");
}

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON non trovato nella risposta Gemini");
    return JSON.parse(match[0]) as T;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const teamPassword = Deno.env.get("TEAM_PASSWORD");
    const geminiKey = Deno.env.get("GEMINI_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!teamPassword || !geminiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Configurazione server incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !validateToken(token, teamPassword)) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      tipo = "social",
      cliente = "Angelo Parodi",
      // social
      formato,
      rigenera_id,
      trend_selezionato,
      // newsletter
      tema,
      prodotto,
      stagione,
      tono_newsletter,
      // ricette
      titolo_ricetta,
      note_chef,
      occasione,
      n_idee = 5,
    } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    // ═══════════════════════════════════════════════════
    // TIPO: NEWSLETTER
    // ═══════════════════════════════════════════════════
    if (tipo === "newsletter") {
      if (!tema || !prodotto) {
        return new Response(JSON.stringify({ error: "tema e prodotto sono obbligatori" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const esempiRes = await supabase
        .from("angy_newsletter_esempi")
        .select("titolo, contenuto, tipo")
        .eq("cliente", cliente)
        .eq("attiva", true)
        .limit(3);

      const esempiTesto =
        esempiRes.data
          ?.map((e) => `--- ESEMPIO: "${e.titolo}" (${e.tipo}) ---\n${e.contenuto.substring(0, 600)}`)
          .join("\n\n") ??
        "Nessun esempio disponibile: usa voce AP calda, diretta, mai promozionale.";

      const prompt = `Sei ANGY, il copywriter di Angelo Parodi (brand italiano di conserve ittiche premium fondato a Genova nel 1888).
Scrivi una newsletter email completa per la mailing list del brand.

IDENTITÀ BRAND: Angelo Parodi produce filetti di tonno (olio EVO, naturale, in vetro), sgombro, acciughe, salmone affumicato, polpa di granchio. Posizionamento: qualità riconoscibile senza fronzoli, non luxury non discount — il meglio della tavola italiana quotidiana.

VOCE: familiare, caldo, ironia leggera quando viene naturale. MAI: formale, salutista, da vecchia réclame, urlatoria.

TEMA NEWSLETTER: ${tema}
PRODOTTO IN PRIMO PIANO: ${prodotto}
STAGIONE/OCCASIONE: ${stagione || "Non specificata"}
TONO: ${tono_newsletter || "Caldo e narrativo"}

ESEMPI DI STILE NEWSLETTER AP (analizza la voce, ritmo e struttura):
${esempiTesto}

REGOLE NEWSLETTER ANGELO PARODI:
1. Oggetto: max 50 caratteri — intrigante, onesto, deve far aprire l'email. Mai clickbait, mai maiuscole urlatorie.
2. Preview text: 60-90 caratteri — completa l'oggetto senza ripeterlo
3. Saluto: personale e caldo ("Ciao, amante della buona tavola," o simile)
4. Corpo: 3 paragrafi, totale 180-250 parole. Struttura: apertura narrativa → contenuto centrale → valore + chiusura
5. CTA: unica, naturale nel flusso del testo — mai un bottone sparato alla fine
6. Firma: "Il team di Angelo Parodi" con eventuale riferimento al prodotto
7. ZERO: "offerta imperdibile", urgenza artificiale, claim di salute, maiuscole eccessive

Rispondi ESCLUSIVAMENTE con JSON valido, niente testo prima o dopo:
{"oggetto":"...","preview_text":"...","saluto":"...","paragrafi":["paragrafo 1","paragrafo 2","paragrafo 3"],"cta_testo":"...","firma":"..."}`;

      const raw = await callGemini(prompt, geminiKey, 800, 0.85);
      const parsed = parseJson<{
        oggetto: string;
        preview_text: string;
        saluto: string;
        paragrafi: string[];
        cta_testo: string;
        firma: string;
      }>(raw);

      console.log(`GENERATE NEWSLETTER OK | ${cliente} | ip=${ip}`);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════
    // TIPO: RICETTA_IDEA
    // ═══════════════════════════════════════════════════
    if (tipo === "ricetta_idea") {
      if (!prodotto || !occasione) {
        return new Response(JSON.stringify({ error: "prodotto e occasione sono obbligatori" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `Sei ANGY, il food editor di Angelo Parodi (brand italiano di conserve ittiche dal 1888).
Il team ha bisogno di idee di ricette originali da sviluppare per social e sito.

PRODOTTO PRINCIPALE: ${prodotto}
OCCASIONE/STAGIONE: ${occasione}
NUMERO IDEE RICHIESTE: ${n_idee}

CRITERI CREATIVI:
- Ricette pratiche (15-35 minuti), adatte alla cucina italiana di tutti i giorni
- Il prodotto Angelo Parodi deve essere l'ingrediente PROTAGONISTA, non una comparsa
- Nomi evocativi e originali — non "Pasta al tonno" ma qualcosa che fa venire l'acquolina
- Mix equilibrato: una ricetta rapida, una elegante, una inaspettata, una classica reinterpretata
- Target: italiano 30-55 anni, ama cucinare bene ma ha poco tempo

Rispondi ESCLUSIVAMENTE con JSON valido:
{"idee":[{"titolo":"Nome originale e appetitoso","descrizione":"Una frase che fa venire voglia","difficolta":"Facile","tempo_minuti":20,"angolo":"Perché funziona per i social/sito — max 10 parole"}]}`;

      const raw = await callGemini(prompt, geminiKey, 1000, 0.95);
      const parsed = parseJson<{ idee: object[] }>(raw);

      console.log(`GENERATE RICETTA_IDEA OK | ${cliente} | ip=${ip}`);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════
    // TIPO: RICETTA (ricetta completa)
    // ═══════════════════════════════════════════════════
    if (tipo === "ricetta") {
      if (!titolo_ricetta) {
        return new Response(JSON.stringify({ error: "titolo_ricetta è obbligatorio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `Sei ANGY, il food writer di Angelo Parodi (brand italiano di conserve ittiche premium dal 1888).
Scrivi una ricetta completa nel formato editoriale del brand — come apparirebbe sul sito angeloparodi.it.

RICETTA: ${titolo_ricetta}
${note_chef ? `NOTE DELLO CHEF: ${note_chef}` : ""}

STILE EDITORIALE ANGELO PARODI:
- Descrizione breve: 2 frasi poetiche e concrete, voce AP (sensoriale, calda, mai salutiste, mai "ricco di omega-3")
- Il prodotto AP deve essere la prima voce degli ingredienti con il nome commerciale completo (es. "200g Filetti di Tonno Angelo Parodi all'Olio Extravergine di Oliva")
- Ingredienti: lista precisa con quantità per 4 persone
- Preparazione: 4-6 step numerati, chiari, con tempi precisi dove possibile
- Consiglio chef: una variante, un abbinamento, una tecnica che fa la differenza

Rispondi ESCLUSIVAMENTE con JSON valido, niente testo prima o dopo:
{
  "nome": "Nome finale della ricetta",
  "descrizione_breve": "Due frasi appetitose, voce Angelo Parodi",
  "tempo_preparazione": "es. 25 minuti",
  "difficolta": "Facile",
  "porzioni": "4 persone",
  "ingredienti": ["200g Filetti di Tonno Angelo Parodi...","..."],
  "preparazione": ["Step 1: istruzione precisa","Step 2: ...","..."],
  "consiglio_chef": "Un consiglio che sorprende o insegna qualcosa"
}`;

      const raw = await callGemini(prompt, geminiKey, 1200, 0.75);
      const parsed = parseJson<object>(raw);

      console.log(`GENERATE RICETTA OK | ${cliente} | ${titolo_ricetta} | ip=${ip}`);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════
    // TIPO: SOCIAL (default — logica originale)
    // ═══════════════════════════════════════════════════
    if (!formato || !["Singolo", "Carosello", "Reel"].includes(formato)) {
      return new Response(
        JSON.stringify({ error: "Formato non valido. Usa: Singolo, Carosello, Reel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [memoriaRes, strategiaRes, storiaRes, tagsRes] = await Promise.all([
      supabase.from("angy_memoria").select("nota, tipo").eq("cliente", cliente).eq("attiva", true),
      supabase.from("angy_strategia").select("sezione, contenuto").eq("cliente", cliente).eq("attiva", true).order("ordine"),
      supabase.from("ped_history").select("copy, formato, framework").eq("cliente", cliente).order("created_at", { ascending: false }).limit(15),
      supabase.from("angy_hashtags").select("tag").eq("cliente", cliente).eq("attiva", true),
    ]);

    const noteMemoria = memoriaRes.data?.map((n) => `- [${n.tipo}] ${n.nota}`).join("\n") ?? "";
    const strategia = strategiaRes.data?.map((s) => `[${s.sezione}] ${s.contenuto}`).join("\n") ?? "";
    const temiUsati = storiaRes.data?.map((s) => `- [${s.formato}] ${s.copy}`).join("\n") ?? "";
    const hashtagsFissi = tagsRes.data?.map((t) => t.tag) ?? [];

    const frameworkRecenti = (storiaRes.data ?? []).slice(0, 3).map((s) => s.framework).filter(Boolean);
    const candidati = FRAMEWORKS.filter((f) => !frameworkRecenti.includes(f.nome));
    const framework = candidati[Math.floor(Math.random() * candidati.length)] ?? FRAMEWORKS[0];

    const formatoGuida: Record<string, string> = {
      Singolo: "Un'immagine statica con copy breve e incisivo. Max 220 caratteri.",
      Carosello: "Serie di slide (3-7). Il copy introduce la serie con curiosità e invita a scorrere. Max 220 caratteri per l'introduzione.",
      Reel: "Video breve (15-30 sec). Il copy è una caption che invita alla visione. Tono vivace. Max 220 caratteri.",
    };

    const trendBlock = trend_selezionato
      ? `\nTREND DI ATTUALITÀ DA CAVALCARE (il team lo ha selezionato come contesto per questo post):\n"${trend_selezionato}"\nIntegralo in modo naturale se pertinente — non forzarlo.\n`
      : "";

    const prompt = `Sei ANGY, il copywriter senior di Angelo Parodi — brand italiano di conserve ittiche premium fondato a Genova nel 1888.

IDENTITÀ DEL BRAND
Angelo Parodi non è un prodotto da supermercato qualsiasi: è un'istituzione italiana, presente in milioni di dispense da 137 anni. I prodotti core sono filetti di tonno (in olio extravergine, al naturale, in vetro), filetti di sgombro, acciughe, salmone affumicato e polpa di granchio. Il posizionamento è "qualità riconoscibile senza fronzoli" — non luxury, non discount: il meglio della tavola quotidiana italiana.

CHI SEI COME COPYWRITER
Scrivi come una persona vera che ama la buona tavola italiana e che conosce il brand da dentro. Il tuo registro è: familiare ma non sciatto, ironico quando viene naturale (mai forzato), caldo, concreto. Usi dettagli sensoriali reali (il profumo del mare, l'olio che irrora la pasta, la semplicità di un pranzo ben fatto). Non sei mai: formale, freddo, da réclame anni '90, salutista estremo, paternalistico.

VOCE — ESEMPI DI ORIENTAMENTO
✅ BENE: "Frigo vuoto alle 12:45. Dispensa piena di soluzioni. 🐟 Come ogni giorno dal 1888."
✅ BENE: "C'è pasta fredda e c'è pasta fredda con il tonno Angelo Parodi. La differenza la sai."
✅ BENE: "Tua nonna la chiamava 'pasta di emergenza'. Noi la chiamiamo pranzo."
❌ MALE: "Scopri i nostri straordinari prodotti di qualità superiore!"
❌ MALE: "Ricco di proteine e omega-3 per il tuo benessere quotidiano."
❌ MALE: "Non perdere questa incredibile opportunità!"

═══ STRATEGIA EDITORIALE DEL BRAND ═══
${strategia || "Target: famiglie italiane 30-55 anni, appassionati di cucina autentica. Pilastri: Heritage 1888, Qualità del prodotto, Vita quotidiana italiana, Ricette pratiche."}

═══ REGOLE FISSE DA RISPETTARE SEMPRE ═══
${noteMemoria || "Nessuna regola aggiuntiva al momento."}

═══ FRAMEWORK ATTIVO PER QUESTO POST: ${framework.nome} ═══
${framework.guida}

APPLICAZIONE PRATICA DEL FRAMEWORK
Per questo post, il framework ${framework.nome} significa: segui la struttura indicata dalla prima all'ultima parola. Non imbastire il copy e poi adattarlo — costruiscilo da zero secondo la logica del framework.

═══ FORMATO: ${formato} ═══
${formatoGuida[formato]}
${trendBlock}
═══ REGOLE SEO SOCIAL — TUTTE OBBLIGATORIE ═══
1. HOOK: le prime 8-10 parole devono agganciare e contenere una keyword di prodotto naturale ("tonno", "sgombro", "acciughe", "filetti"). Instagram mostra solo i primi 125 caratteri prima del "Altro": in quei 125 ci deve essere già tutto il valore.
2. KEYWORD NATURALE: nomina il prodotto specifico in modo che suoni come conversazione, non come pubblicità.
3. CTA su misura per l'obiettivo:
   - Interazione → domanda a cui è facile rispondere (preferenze, ricordi di tavola, abitudini), invito a commentare o taggare qualcuno
   - Traffico → "link in bio" inserito in modo narrativo, non in fondo come etichetta
   - Copertura → frase finale così vera o riconoscibile che il lettore voglia salvarla o condividerla
4. ZERO hashtag nel testo del copy — vanno solo nel campo hashtags
5. STOP WORDS vietate: gratis, offerta, incredibile, compra, scopri ora, straordinario, qualità superiore, benessere, omega-3, proteine
6. MAX 2 emoji, integrate nel flusso del testo (non in coda come decorazione)

═══ TEMI GIÀ USATI — ANGOLO DIVERSO OBBLIGATORIO ═══
${temiUsati || "Nessun post precedente — campo libero."}

HASHTAG FISSI DEL BRAND (già presenti, non duplicare):
${hashtagsFissi.join(" ") || "nessuno ancora"}

═══ OUTPUT — ISTRUZIONI PRECISE ═══
1. Copy: angolo FRESCO, diverso da tutti i precedenti per struttura e immagine evocata
2. Lunghezza copy: MASSIMO 220 caratteri — conta ogni carattere inclusi spazi ed emoji
3. Obiettivo: scegli quello più coerente con la CTA che hai scritto (Interazione / Traffico / Copertura)
4. Hashtag contestuali: 3-4 nuovi, specifici al tema (non generici come #food #cucina #italia)
5. brief_visual: istruzione precisa per il grafico — soggetto principale, inquadratura (top-down/frontale/dettaglio), stile luce (naturale/studio), atmosfera (rustica/moderna/estiva), palette cromatica con eventuali hex (usa sempre i brand colors: blu #003399, giallo #FFD600 come accento)
6. keywords_visual: 4-5 termini misti italiano/inglese per ricerca Pinterest/Unsplash (es: "tonno sott'olio flatlay", "cucina ligure rustica", "seafood pasta styling", "dispensa italiana")

Rispondi ESCLUSIVAMENTE con JSON valido. Niente markdown, niente commenti, niente testo prima o dopo:
{"copy":"...","obiettivo":"Interazione|Traffico|Copertura","brief_visual":"...","hashtags":["#..."],"keywords_visual":["...","..."]}`;

    const raw = await callGemini(prompt, geminiKey);

    let parsed: {
      copy: string;
      obiettivo: string;
      brief_visual: string;
      hashtags?: string[];
      keywords_visual?: string[];
    };
    parsed = parseJson(raw);

    if (!parsed.copy || !parsed.obiettivo || !parsed.brief_visual) {
      throw new Error("Campi JSON mancanti nella risposta");
    }

    if (parsed.copy.length > 220) {
      parsed.copy = parsed.copy.substring(0, 217) + "...";
    }

    if (!["Interazione", "Traffico", "Copertura"].includes(parsed.obiettivo)) {
      parsed.obiettivo = "Interazione";
    }

    const contestuali = (parsed.hashtags ?? [])
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .map((t) => t.replace(/\s+/g, ""));
    const visti = new Set<string>();
    const hashtagsFinali: string[] = [];
    for (const t of [...hashtagsFissi, ...contestuali]) {
      const key = t.toLowerCase();
      if (!visti.has(key) && hashtagsFinali.length < 8) {
        visti.add(key);
        hashtagsFinali.push(t);
      }
    }

    const keywordsVisual = (parsed.keywords_visual ?? []).slice(0, 5);

    const record = {
      cliente,
      data: new Date().toISOString().split("T")[0],
      formato,
      copy: parsed.copy,
      obiettivo: parsed.obiettivo,
      brief_visual: parsed.brief_visual,
      hashtags: hashtagsFinali.join(" "),
      framework: framework.nome,
      status: "bozza",
    };

    let postId: string | null = null;
    if (rigenera_id) {
      const { data: updated, error } = await supabase
        .from("ped_history")
        .update(record)
        .eq("id", rigenera_id)
        .select("id")
        .single();
      if (error) console.error("Errore rigenera:", error);
      postId = updated?.id ?? null;
    } else {
      const { data: inserted, error } = await supabase
        .from("ped_history")
        .insert(record)
        .select("id")
        .single();
      if (error) console.error("Errore salvataggio:", error);
      postId = inserted?.id ?? null;
    }

    console.log(`GENERATE SOCIAL OK | ${cliente} | ${formato} | ${framework.nome} | rigenera=${!!rigenera_id} | ip=${ip}`);

    return new Response(
      JSON.stringify({
        id: postId,
        copy: parsed.copy,
        obiettivo: parsed.obiettivo,
        brief_visual: parsed.brief_visual,
        hashtags: hashtagsFinali,
        framework: framework.nome,
        keywords_visual: keywordsVisual,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Errore generate:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
