-- Migrazione iniziale ANGY – Angelo Parodi
-- Esegui questo SQL su Supabase > SQL Editor

-- Tabella storico generazioni
create table if not exists ped_history (
  id uuid default gen_random_uuid() primary key,
  cliente text default 'Angelo Parodi',
  data date,
  formato text,
  copy text,
  obiettivo text,
  brief_visual text,
  status text default 'bozza',
  created_at timestamptz default now()
);

-- Indice per query veloci sugli ultimi 15
create index if not exists ped_history_cliente_created
  on ped_history (cliente, created_at desc);

-- Tabella memoria permanente (modificabile manualmente)
create table if not exists angy_memoria (
  id uuid primary key default gen_random_uuid(),
  cliente text default 'Angelo Parodi',
  nota text not null,
  tipo text default 'da_ricordare',
  attiva boolean default true
);

-- Note iniziali di esempio (puoi modificarle/aggiungerne da Supabase)
insert into angy_memoria (cliente, nota, tipo, attiva) values
  ('Angelo Parodi', 'Non usare mai il termine "conserva" — preferisci "filetti", "preparazione", "prodotto"', 'tono', true),
  ('Angelo Parodi', 'Il brand esiste dal 1888: quando menzioni la storia, usa quel numero', 'brand', true),
  ('Angelo Parodi', 'Non fare mai claim di salute o nutrizionali specifici', 'compliance', true),
  ('Angelo Parodi', 'Evita il tono pubblicitario aggressivo — preferisci storytelling quotidiano', 'tono', true);

-- RLS: abilita Row Level Security
alter table ped_history enable row level security;
alter table angy_memoria enable row level security;

-- Policy: solo service_role può leggere/scrivere (le Edge Functions usano service_role)
create policy "service_role_only_history" on ped_history
  using (auth.role() = 'service_role');

create policy "service_role_only_memoria" on angy_memoria
  using (auth.role() = 'service_role');
