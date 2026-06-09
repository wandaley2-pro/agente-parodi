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

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 512,
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

    const { formato, cliente = "Angelo Parodi" } = await req.json();

    if (!formato || !["Singolo", "Carosello", "Reel"].includes(formato)) {
      return new Response(JSON.stringify({ error: "Formato non valido. Usa: Singolo, Carosello, Reel" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Legge memoria attiva
    const { data: memoria, error: memoriaErr } = await supabase
      .from("angy_memoria")
      .select("nota, tipo")
      .eq("cliente", cliente)
      .eq("attiva", true);

    if (memoriaErr) {
      console.error("Errore lettura memoria:", memoriaErr);
    }

    // Legge ultimi 15 post per evitare ripetizioni
    const { data: storia, error: storiaErr } = await supabase
      .from("ped_history")
      .select("copy, formato, data")
      .eq("cliente", cliente)
      .order("created_at", { ascending: false })
      .limit(15);

    if (storiaErr) {
      console.error("Errore lettura storia:", storiaErr);
    }

    const noteMemoria = memoria?.map((n) => `- [${n.tipo}] ${n.nota}`).join("\n") ?? "";
    const temiUsati = storia?.map((s) => `- [${s.formato}] ${s.copy}`).join("\n") ?? "";

    const formatoGuida: Record<string, string> = {
      Singolo: "Un'immagine statica con copy breve e incisivo. Max 220 caratteri.",
      Carosello:
        "Serie di slide (3-7). Il copy introduce la serie con curiosità. Max 220 caratteri per l'introduzione.",
      Reel:
        "Video breve (15-30 sec). Il copy è una caption che invita alla visione. Tono vivace. Max 220 caratteri.",
    };

    const prompt = `Sei ANGY, il copywriter ufficiale di Angelo Parodi — brand di conserve ittiche dal 1888.

TONO: familiare, caldo, con ironia leggera quando è naturale. Mai formale, mai freddo, mai generico.
BRAND: prodotti ittici di qualità (tonno, acciughe, sgombro, sardine, paté). Italiani, con storia, vicini alla tavola di tutti.

REGOLE FISSE DA RISPETTARE SEMPRE:
${noteMemoria || "Nessuna regola specifica al momento."}

FORMATO RICHIESTO: ${formato}
ISTRUZIONI FORMATO: ${formatoGuida[formato]}

TEMI E COPY GIÀ USATI (NON RIPETERE, non riciclare angoli simili):
${temiUsati || "Nessun post precedente."}

ISTRUZIONI:
1. Scegli un angolo FRESCO e DIVERSO da tutti i precedenti
2. Il copy deve essere max 220 caratteri (conta i caratteri!)
3. Includi 2-3 emoji pertinenti
4. Il brief_visual deve descrivere l'immagine/video al grafico: soggetto, stile, atmosfera, colori suggeriti
5. L'obiettivo deve essere uno tra: Interazione, Traffico, Copertura

Rispondi SOLO con JSON valido, senza markdown, senza spiegazioni:
{"copy":"...","obiettivo":"Interazione|Traffico|Copertura","brief_visual":"..."}`;

    const raw = await callGemini(prompt, geminiKey);

    let parsed: { copy: string; obiettivo: string; brief_visual: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Prova a estrarre il JSON dalla risposta
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON non trovato nella risposta Gemini");
      parsed = JSON.parse(match[0]);
    }

    // Valida campi
    if (!parsed.copy || !parsed.obiettivo || !parsed.brief_visual) {
      throw new Error("Campi JSON mancanti nella risposta");
    }

    // Taglia copy a 220 caratteri se necessario
    if (parsed.copy.length > 220) {
      parsed.copy = parsed.copy.substring(0, 217) + "...";
    }

    // Valida obiettivo
    const obiettiviValidi = ["Interazione", "Traffico", "Copertura"];
    if (!obiettiviValidi.includes(parsed.obiettivo)) {
      parsed.obiettivo = "Interazione";
    }

    // Salva su ped_history
    const { error: insertErr } = await supabase.from("ped_history").insert({
      cliente,
      data: new Date().toISOString().split("T")[0],
      formato,
      copy: parsed.copy,
      obiettivo: parsed.obiettivo,
      brief_visual: parsed.brief_visual,
      status: "bozza",
    });

    if (insertErr) {
      console.error("Errore salvataggio:", insertErr);
      // Non blocca la risposta — il contenuto è già generato
    }

    // Log opzionale (IP)
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    console.log(`GENERATE OK | cliente=${cliente} | formato=${formato} | ip=${ip} | copy_len=${parsed.copy.length}`);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
