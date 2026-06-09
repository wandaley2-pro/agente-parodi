import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const { password } = await req.json();

    if (!password) {
      return new Response(JSON.stringify({ error: "Password mancante" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const teamPassword = Deno.env.get("TEAM_PASSWORD");
    if (!teamPassword) {
      console.error("TEAM_PASSWORD env var non configurata");
      return new Response(JSON.stringify({ error: "Configurazione server mancante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password !== teamPassword) {
      return new Response(JSON.stringify({ error: "Password errata" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Token semplice: base64 di timestamp + secret, valido 24h
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    const payload = `${expiry}:${teamPassword}`;
    const token = btoa(payload);

    return new Response(JSON.stringify({ token, expiresAt: expiry }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Errore auth:", err);
    return new Response(JSON.stringify({ error: "Errore interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
