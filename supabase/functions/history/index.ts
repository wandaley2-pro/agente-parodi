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

    const { action, cliente = "Angelo Parodi", id, status } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "list") {
      const { data, error } = await supabase
        .from("ped_history")
        .select("id, data, formato, copy, obiettivo, brief_visual, hashtags, framework, status, created_at")
        .eq("cliente", cliente)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return new Response(JSON.stringify({ posts: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const statiValidi = ["bozza", "approvato", "scartato"];
      if (!id || !statiValidi.includes(status)) {
        return new Response(JSON.stringify({ error: "id o status non validi" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("ped_history")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Azione non valida. Usa: list, status" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Errore history:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
