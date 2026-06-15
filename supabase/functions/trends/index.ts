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

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–");
}

// Estrae title + link + pubDate da ogni <item> del feed RSS
function parseRssItems(xml: string, sourceName: string, limit: number): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const titleMatch =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
      block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch =
      block.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/) ||
      block.match(/<link>([\s\S]*?)<\/link>/);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    const title = decodeEntities(titleMatch?.[1]?.trim() ?? "");
    const link = (linkMatch?.[1]?.trim() ?? "").replace(/&amp;/g, "&");

    if (title.length > 5 && link.startsWith("http")) {
      items.push({
        title,
        link,
        pubDate: dateMatch?.[1]?.trim() ?? "",
        source: sourceName,
      });
    }
  }
  return items;
}

// Fonti per i TREND creativi (ispirazione editoriale food)
const TREND_SOURCES = [
  { name: "Gambero Rosso", url: "https://www.gamberorosso.it/feed/" },
  { name: "Dissapore", url: "https://www.dissapore.com/feed/" },
  { name: "Il Fatto Alimentare", url: "https://www.ilfattoalimentare.it/feed/" },
  { name: "Agrodolce", url: "https://www.agrodolce.it/feed/" },
];

// Fonti per le NEWS quotidiane: 3 fonti autorevoli
// food + settore alimentare + mondo social/marketing
const NEWS_SOURCES = [
  { name: "Gambero Rosso", url: "https://www.gamberorosso.it/feed/" },
  { name: "Il Fatto Alimentare", url: "https://www.ilfattoalimentare.it/feed/" },
  { name: "Ninja Marketing", url: "https://www.ninjamarketing.it/feed/" },
];

async function fetchRss(source: { name: string; url: string }, limit: number): Promise<RssItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { "User-Agent": "ANGY/1.0 (Angelo Parodi social assistant)" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, source.name, limit);
  } catch {
    return [];
  }
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 768, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Risposta Gemini vuota");
  return text;
}

function extractJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON non valido da Gemini");
    return JSON.parse(match[0]);
  }
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

    let action = "trends";
    try {
      const body = await req.json();
      if (body?.action) action = body.action;
    } catch { /* body vuoto → default trends */ }

    // ═══════════ NEWS QUOTIDIANE (con link ufficiali) ═══════════
    if (action === "news") {
      const results = await Promise.allSettled(NEWS_SOURCES.map((s) => fetchRss(s, 8)));
      const allItems = results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<RssItem[]>).value);

      if (allItems.length === 0) {
        return new Response(
          JSON.stringify({ news: [], errore: "Feed non raggiungibili in questo momento, riprova tra poco." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Gemini fa SOLO da filtro: sceglie gli indici delle news rilevanti.
      // I link restano quelli originali del feed — mai generati dall'AI.
      const prompt = `Sei il media analyst di Angelo Parodi, brand di conserve ittiche dal 1888.

Ecco le ultime notizie da 3 fonti autorevoli (Gambero Rosso = food, Il Fatto Alimentare = settore alimentare, Ninja Marketing = social media e digital marketing):

${allItems.map((item, i) => `${i}. [${item.source}] ${item.title}`).join("\n")}

Seleziona le 5-6 notizie PIÙ RILEVANTI per chi gestisce i social di Angelo Parodi. Criteri:
- Mondo ittico, conserve, pesca, sostenibilità marina → priorità massima
- Tendenze food e consumi alimentari in Italia → alta
- Novità su Instagram, Facebook, algoritmi, social media marketing → alta (servono al team!)
- ESCLUDI: politica, cronaca nera, gossip, notizie locali irrilevanti

Per ogni notizia scelta indica:
- "indice": il numero della notizia nella lista sopra (deve esistere!)
- "perche": perché è rilevante per il team (max 20 parole)
- "idea_post": eventuale spunto per un post Angelo Parodi, o "" se è solo da sapere

Rispondi SOLO con JSON valido:
{"selezione":[{"indice":0,"perche":"...","idea_post":"..."}]}`;

      const raw = await callGemini(prompt, geminiKey);
      const parsed = extractJson(raw) as { selezione?: { indice: number; perche: string; idea_post: string }[] };

      const news = (parsed.selezione ?? [])
        .filter((s) => typeof s.indice === "number" && allItems[s.indice])
        .slice(0, 6)
        .map((s) => ({
          titolo: allItems[s.indice].title,
          link: allItems[s.indice].link,
          fonte: allItems[s.indice].source,
          data: allItems[s.indice].pubDate,
          perche: s.perche ?? "",
          idea_post: s.idea_post ?? "",
        }));

      return new Response(
        JSON.stringify({ news, aggiornato: new Date().toLocaleString("it-IT") }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════ TREND CREATIVI ═══════════
    const results = await Promise.allSettled(TREND_SOURCES.map((s) => fetchRss(s, 5)));
    const allTitles = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<RssItem[]>).value)
      .map((i) => `[${i.source}] ${i.title}`);

    if (allTitles.length === 0) {
      return new Response(
        JSON.stringify({
          trends: [{ titolo: "Feed non disponibili", spunto: "Riprova tra qualche minuto.", angolo: "" }],
          fonte: "offline",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Sei un consulente editoriale per Angelo Parodi, brand di conserve ittiche dal 1888.

Ecco le ultime notizie dal mondo food e lifestyle italiano:

${allTitles.slice(0, 16).map((t, i) => `${i + 1}. ${t}`).join("\n")}

Identifica 4 trend rilevanti per il brand. Per ogni trend:
- "titolo": nome del trend (max 5 parole)
- "spunto": come Angelo Parodi potrebbe cavalcarlo su Instagram (max 40 parole)
- "angolo": l'angolo creativo specifico (es. "Reel di ricetta veloce con tonno")

Rispondi SOLO con JSON valido:
{"trends":[{"titolo":"...","spunto":"...","angolo":"..."}],"data_aggiornamento":"${new Date().toLocaleDateString("it-IT")}"}`;

    const raw = await callGemini(prompt, geminiKey);
    const parsed = extractJson(raw);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Errore trends/news:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
