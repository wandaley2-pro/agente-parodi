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

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 896,
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
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

    const { formato, cliente = "Angelo Parodi", rigenera_id, trend_selezionato } = await req.json();

    if (!formato || !["Singolo", "Carosello", "Reel"].includes(formato)) {
      return new Response(
        JSON.stringify({ error: "Formato non valido. Usa: Singolo, Carosello, Reel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Caricamento dati in parallelo per ridurre latenza
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

    // Rotazione framework: esclude quelli usati negli ultimi 3 post
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
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON non trovato nella risposta Gemini");
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.copy || !parsed.obiettivo || !parsed.brief_visual) {
      throw new Error("Campi JSON mancanti nella risposta");
    }

    if (parsed.copy.length > 220) {
      parsed.copy = parsed.copy.substring(0, 217) + "...";
    }

    if (!["Interazione", "Traffico", "Copertura"].includes(parsed.obiettivo)) {
      parsed.obiettivo = "Interazione";
    }

    // Hashtag: fissi + contestuali, dedup, max 8
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

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    console.log(`GENERATE OK | ${cliente} | ${formato} | ${framework.nome} | rigenera=${!!rigenera_id} | ip=${ip}`);

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
