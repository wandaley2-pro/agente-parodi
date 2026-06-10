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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!teamPassword || !supabaseUrl || !supabaseServiceKey) {
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
    const { action, cliente = "Angelo Parodi" } = body;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- NOTE / REGOLE ----

    if (action === "list") {
      const [note, hashtags] = await Promise.all([
        supabase
          .from("angy_memoria")
          .select("id, nota, tipo, attiva")
          .eq("cliente", cliente)
          .order("tipo"),
        supabase
          .from("angy_hashtags")
          .select("id, tag, attiva")
          .eq("cliente", cliente)
          .order("created_at"),
      ]);

      if (note.error) throw note.error;
      if (hashtags.error) throw hashtags.error;

      return new Response(JSON.stringify({ note: note.data, hashtags: hashtags.data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_nota") {
      const { nota, tipo = "da_ricordare" } = body;
      if (!nota || nota.trim().length < 3) {
        return new Response(JSON.stringify({ error: "Nota troppo corta" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("angy_memoria")
        .insert({ cliente, nota: nota.trim(), tipo, attiva: true });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_nota") {
      const { id, attiva } = body;
      if (!id || typeof attiva !== "boolean") {
        return new Response(JSON.stringify({ error: "Parametri non validi" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("angy_memoria")
        .update({ attiva })
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- HASHTAG ----

    if (action === "add_hashtag") {
      let { tag } = body;
      if (!tag || tag.trim().length < 2) {
        return new Response(JSON.stringify({ error: "Hashtag troppo corto" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      tag = tag.trim().replace(/\s+/g, "");
      if (!tag.startsWith("#")) tag = `#${tag}`;

      const { error } = await supabase
        .from("angy_hashtags")
        .insert({ cliente, tag, attiva: true });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, tag }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_hashtag") {
      const { id, attiva } = body;
      if (!id || typeof attiva !== "boolean") {
        return new Response(JSON.stringify({ error: "Parametri non validi" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("angy_hashtags")
        .update({ attiva })
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Azione non valida. Usa: list, add_nota, toggle_nota, add_hashtag, toggle_hashtag" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Errore memoria:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
