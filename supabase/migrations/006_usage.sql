-- Migration 006: API usage tracking table
CREATE TABLE IF NOT EXISTS angy_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  cliente text NOT NULL DEFAULT 'Angelo Parodi',
  tipo text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(10,6) NOT NULL DEFAULT 0
);
