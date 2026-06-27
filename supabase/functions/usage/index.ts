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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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

    const { cliente = "Angelo Parodi" } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from("angy_usage")
      .select("tipo, prompt_tokens, output_tokens, total_tokens, cost_usd")
      .eq("cliente", cliente)
      .gte("created_at", monthStart);

    if (error) throw error;

    const rows = data || [];
    const total_calls = rows.length;
    const total_prompt_tokens = rows.reduce((s: number, r: { prompt_tokens: number }) => s + (r.prompt_tokens || 0), 0);
    const total_output_tokens = rows.reduce((s: number, r: { output_tokens: number }) => s + (r.output_tokens || 0), 0);
    const total_tokens = rows.reduce((s: number, r: { total_tokens: number }) => s + (r.total_tokens || 0), 0);
    const total_cost_usd = rows.reduce((s: number, r: { cost_usd: string }) => s + parseFloat(r.cost_usd || "0"), 0);

    const tipoMap: Record<string, { calls: number; prompt_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number }> = {};
    for (const r of rows as Array<{ tipo: string; prompt_tokens: number; output_tokens: number; total_tokens: number; cost_usd: string }>) {
      if (!tipoMap[r.tipo]) tipoMap[r.tipo] = { calls: 0, prompt_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0 };
      tipoMap[r.tipo].calls++;
      tipoMap[r.tipo].prompt_tokens += r.prompt_tokens || 0;
      tipoMap[r.tipo].output_tokens += r.output_tokens || 0;
      tipoMap[r.tipo].total_tokens += r.total_tokens || 0;
      tipoMap[r.tipo].cost_usd += parseFloat(r.cost_usd || "0");
    }

    const by_tipo = Object.entries(tipoMap)
      .map(([tipo, v]) => ({ tipo, ...v }))
      .sort((a, b) => b.calls - a.calls);

    return new Response(
      JSON.stringify({
        total_calls,
        total_prompt_tokens,
        total_output_tokens,
        total_tokens,
        total_cost_usd: Math.round(total_cost_usd * 1_000_000) / 1_000_000,
        by_tipo,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Errore usage:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
