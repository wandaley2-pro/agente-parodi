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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const teamPassword = Deno.env.get("TEAM_PASSWORD");
    const geminiKey = Deno.env.get("GEMINI_KEY");

    if (!teamPassword || !geminiKey) {
      return new Response(JSON.stringify({ error: "Configurazione incompleta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !validateToken(token, teamPassword)) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { video_base64, mime_type = "video/mp4" } = await req.json();
    if (!video_base64) {
      return new Response(JSON.stringify({ error: "video_base64 richiesto" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Upload al Gemini Files API (resumable upload)
    const videoBytes = Uint8Array.from(atob(video_base64), (c) => c.charCodeAt(0));
    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "raw",
          "X-Goog-Upload-Command": "start, upload, finalize",
          "X-Goog-Upload-Header-Content-Type": mime_type,
          "X-Goog-Upload-Header-Content-Length": String(videoBytes.length),
          "Content-Type": mime_type,
        },
        body: videoBytes,
      }
    );

    if (!uploadRes.ok) {
      throw new Error(`Upload fallito (${uploadRes.status}): ${await uploadRes.text()}`);
    }
    const uploadData = await uploadRes.json();
    const fileUri = uploadData.file?.uri;
    const fileName = uploadData.file?.name;
    if (!fileUri) throw new Error("URI file non ricevuto da Gemini");

    // 2. Poll finché lo stato diventa ACTIVE (max 60s, intervallo 2s)
    let isActive = uploadData.file?.state === "ACTIVE";
    for (let i = 0; i < 30 && !isActive; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`
      );
      if (poll.ok) isActive = (await poll.json()).state === "ACTIVE";
    }
    if (!isActive) throw new Error("Timeout: il video non è stato elaborato entro 60 secondi. Riprova con un video più breve.");

    // 3. Estrazione ricetta con Gemini 1.5 Pro (multimodale, supporto nativo video)
    const extractRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { file_data: { mime_type, file_uri: fileUri } },
                {
                  text: `Guarda questo video di ricetta e trascrivila nel formato editoriale Angelo Parodi (brand italiano di conserve ittiche premium dal 1888). Estrai ogni dettaglio visivo e audio con precisione.

Rispondi ESCLUSIVAMENTE con JSON valido, niente testo prima o dopo:
{
  "nome": "Nome evocativo della ricetta",
  "descrizione_breve": "Due frasi appetitose e concrete nello stile Angelo Parodi — sensoriali, calde, mai salutiste",
  "tempo_preparazione": "es. 25 minuti",
  "difficolta": "Facile",
  "porzioni": "4 persone",
  "prodotto_principale": "es. Filetti di Tonno Angelo Parodi all'Olio Extravergine di Oliva",
  "ingredienti": [
    "200g Filetti di Tonno Angelo Parodi all'Olio Extravergine",
    "320g pasta formato mezze penne",
    "altro ingrediente con quantità"
  ],
  "preparazione": [
    "Step 1: istruzione precisa con tempo se visibile",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "consiglio_chef": "Un consiglio pratico o variante interessante osservata nel video"
}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2000,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!extractRes.ok) {
      throw new Error(`Estrazione fallita (${extractRes.status}): ${await extractRes.text()}`);
    }
    const raw = (await extractRes.json())?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("Risposta Gemini vuota durante l'estrazione");

    let recipe: object;
    try {
      recipe = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON ricetta non trovato nella risposta Gemini");
      recipe = JSON.parse(match[0]);
    }

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    console.log(`TRANSCRIBE OK | ip=${ip}`);

    return new Response(JSON.stringify(recipe), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Errore transcribe:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
