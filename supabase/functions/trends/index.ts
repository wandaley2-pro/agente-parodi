import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Estrae i titoli degli item da un feed RSS (supporta CDATA e tag plain)
function parseRssTitles(xml: string, limit: number): string[] {
  const titles: string[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && titles.length < limit) {
    const item = match[1];
    const m =
      item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
      item.match(/<title>([\s\S]*?)<\/title>/);
    const raw = m?.[1]?.trim() ?? "";
    if (raw && raw.length > 5) {
      titles.push(raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'));
    }
  }
  return titles;
}

const SOURCES = [
  { name: "Gambero Rosso", url: "https://www.gamberorosso.it/feed/" },
  { name: "Dissapore", url: "https://www.dissapore.com/feed/" },
  { name: "Il Fatto Alimentare", url: "https://www.ilfattoalimentare.it/feed/" },
  { name: "Agrodolce", url: "https://www.agrodolce.it/feed/" },
];

async function fetchRssTitles(source: { name: string; url: string }): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { "User-Agent": "ANGY/1.0 (Angelo Parodi social assistant)" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssTitles(xml, 5).map((t) => `[${source.name}] ${t}`);
  } catch {
    return [];
  }
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 512, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Risposta Gemini vuota");
  return text;
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

    if (!teamPassword || !geminiKey) {
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

    // Fetch RSS in parallelo con timeout per fonte
    const results = await Promise.allSettled(SOURCES.map(fetchRssTitles));
    const allTitles = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<string[]>).value);

    if (allTitles.length === 0) {
      return new Response(
        JSON.stringify({
          trends: [
            {
              titolo: "Tendenza stagionale",
              spunto: "Non ho recuperato i feed in questo momento. Prova a ricaricare tra qualche minuto.",
              angolo: "",
            },
          ],
          fonte: "offline",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Sei un consulente editoriale per Angelo Parodi, brand di conserve ittiche dal 1888.

Ecco le ultime notizie dal mondo food e lifestyle italiano (da Gambero Rosso, Dissapore, Il Fatto Alimentare, Agrodolce):

${allTitles.slice(0, 16).map((t, i) => `${i + 1}. ${t}`).join("\n")}

Sulla base di queste notizie, identifica 4 trend rilevanti per il brand Angelo Parodi.
Per ogni trend indica:
- "titolo": nome del trend (max 5 parole)
- "spunto": come Angelo Parodi potrebbe cavalcarlo in un post Instagram (max 40 parole, propositivo)
- "angolo": l'angolo creativo specifico per un post (es. "Reel di ricetta veloce con tonno")

Rispondi SOLO con JSON valido:
{"trends":[{"titolo":"...","spunto":"...","angolo":"..."},...],"data_aggiornamento":"${new Date().toLocaleDateString("it-IT")}"}`;

    const raw = await callGemini(prompt, geminiKey);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON non valido da Gemini");
      parsed = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Errore trends:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
