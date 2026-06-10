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

// Framework di copywriting per social — ANGY li ruota per non scrivere mai
// due post consecutivi con la stessa struttura
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
      maxOutputTokens: 768,
      responseMimeType: "application/json",
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
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

    const { formato, cliente = "Angelo Parodi", rigenera_id } = await req.json();

    if (!formato || !["Singolo", "Carosello", "Reel"].includes(formato)) {
      return new Response(JSON.stringify({ error: "Formato non valido. Usa: Singolo, Carosello, Reel" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Memoria attiva (regole permanenti)
    const { data: memoria } = await supabase
      .from("angy_memoria")
      .select("nota, tipo")
      .eq("cliente", cliente)
      .eq("attiva", true);

    // Ultimi 15 post: copy da non ripetere + framework usati di recente
    const { data: storia } = await supabase
      .from("ped_history")
      .select("copy, formato, framework")
      .eq("cliente", cliente)
      .order("created_at", { ascending: false })
      .limit(15);

    // Hashtag fissi del brand (gestiti dal team)
    const { data: tagsFissi } = await supabase
      .from("angy_hashtags")
      .select("tag")
      .eq("cliente", cliente)
      .eq("attiva", true);

    const noteMemoria = memoria?.map((n) => `- [${n.tipo}] ${n.nota}`).join("\n") ?? "";
    const temiUsati = storia?.map((s) => `- [${s.formato}] ${s.copy}`).join("\n") ?? "";
    const hashtagsFissi = tagsFissi?.map((t) => t.tag) ?? [];

    // Rotazione framework: mai uno usato negli ultimi 3 post
    const frameworkRecenti = (storia ?? [])
      .slice(0, 3)
      .map((s) => s.framework)
      .filter(Boolean);
    const candidati = FRAMEWORKS.filter((f) => !frameworkRecenti.includes(f.nome));
    const framework = candidati[Math.floor(Math.random() * candidati.length)] ?? FRAMEWORKS[0];

    const formatoGuida: Record<string, string> = {
      Singolo: "Un'immagine statica con copy breve e incisivo. Max 220 caratteri.",
      Carosello:
        "Serie di slide (3-7). Il copy introduce la serie con curiosità e invita a scorrere. Max 220 caratteri per l'introduzione.",
      Reel:
        "Video breve (15-30 sec). Il copy è una caption che invita alla visione. Tono vivace. Max 220 caratteri.",
    };

    const ctaPerObiettivo = `- Se obiettivo = Interazione: chiudi con una domanda o un invito a commentare/taggare
- Se obiettivo = Traffico: chiudi con un rimando al "link in bio" naturale, non forzato
- Se obiettivo = Copertura: scrivi una frase così condivisibile/salvabile che il lettore voglia girarla a qualcuno`;

    const prompt = `Sei ANGY, il copywriter senior di Angelo Parodi — brand di conserve ittiche dal 1888.

TONAL VOICE (non negoziabile): familiare, caldo, ironia leggera quando è naturale. Mai formale, mai freddo, mai generico, mai "da pubblicità anni 90". Scrivi come parlerebbe una persona vera che ama la buona tavola italiana.
BRAND: prodotti ittici di qualità (tonno, acciughe, sgombro, sardine, paté). Italiani, con storia, vicini alla tavola di tutti.

REGOLE FISSE DA RISPETTARE SEMPRE:
${noteMemoria || "Nessuna regola specifica al momento."}

FRAMEWORK DI SCRITTURA DA USARE PER QUESTO POST: ${framework.nome}
${framework.guida}

FORMATO RICHIESTO: ${formato}
ISTRUZIONI FORMATO: ${formatoGuida[formato]}

REGOLE SEO SOCIAL (obbligatorie):
1. Le prime 125 battute devono contenere il hook E la keyword di prodotto (Instagram tronca il copy lì: chi non legge oltre deve aver già capito tutto)
2. Inserisci la keyword di prodotto in modo naturale (es. "tonno", "acciughe", "filetti") — serve alla ricerca interna di Instagram
3. CTA coerente con l'obiettivo che scegli:
${ctaPerObiettivo}
4. NIENTE hashtag dentro il copy: vanno SOLO nel campo separato "hashtags"
5. Evita parole spam-trigger (gratis, incredibile, compra ora, offerta)
6. Frasi brevi, ritmo parlato, italiano impeccabile

TEMI E COPY GIÀ USATI (NON RIPETERE, non riciclare angoli simili):
${temiUsati || "Nessun post precedente."}

HASHTAG GIÀ FISSI DEL BRAND (NON ripeterli, generane di NUOVI e contestuali):
${hashtagsFissi.join(" ") || "nessuno"}

ISTRUZIONI FINALI:
1. Scegli un angolo FRESCO e DIVERSO da tutti i precedenti
2. Il copy deve essere max 220 caratteri (conta i caratteri!)
3. Includi 1-2 emoji pertinenti, mai più di 2
4. Genera 3-4 hashtag CONTESTUALI al post (in italiano, pertinenti al tema, no generici tipo #food)
5. Il brief_visual deve descrivere al grafico: soggetto, inquadratura, stile, atmosfera, palette colori suggerita

Rispondi SOLO con JSON valido, senza markdown, senza spiegazioni:
{"copy":"...","obiettivo":"Interazione|Traffico|Copertura","brief_visual":"...","hashtags":["#...","#..."]}`;

    const raw = await callGemini(prompt, geminiKey);

    let parsed: {
      copy: string;
      obiettivo: string;
      brief_visual: string;
      hashtags?: string[];
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

    const obiettiviValidi = ["Interazione", "Traffico", "Copertura"];
    if (!obiettiviValidi.includes(parsed.obiettivo)) {
      parsed.obiettivo = "Interazione";
    }

    // Hashtag finali: fissi del brand + contestuali generati, dedup, max 8
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

    // Rigenera = sovrascrive il record scartato invece di crearne uno nuovo
    let postId: string | null = null;
    if (rigenera_id) {
      const { data: updated, error: updErr } = await supabase
        .from("ped_history")
        .update(record)
        .eq("id", rigenera_id)
        .select("id")
        .single();
      if (updErr) console.error("Errore rigenera:", updErr);
      postId = updated?.id ?? null;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("ped_history")
        .insert(record)
        .select("id")
        .single();
      if (insErr) console.error("Errore salvataggio:", insErr);
      postId = inserted?.id ?? null;
    }

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    console.log(
      `GENERATE OK | cliente=${cliente} | formato=${formato} | framework=${framework.nome} | rigenera=${!!rigenera_id} | ip=${ip}`
    );

    return new Response(
      JSON.stringify({
        id: postId,
        copy: parsed.copy,
        obiettivo: parsed.obiettivo,
        brief_visual: parsed.brief_visual,
        hashtags: hashtagsFinali,
        framework: framework.nome,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Errore generate:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
