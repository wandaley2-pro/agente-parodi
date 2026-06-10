-- Migrazione 002 – Hashtag gestiti dal team + framework tracking

-- Tabella hashtag (il team aggiunge variazioni da qui o dall'app)
create table if not exists angy_hashtags (
  id uuid primary key default gen_random_uuid(),
  cliente text default 'Angelo Parodi',
  tag text not null,
  attiva boolean default true,
  created_at timestamptz default now()
);

-- Hashtag fissi del brand
insert into angy_hashtags (cliente, tag) values
  ('Angelo Parodi', '#angeloparodi'),
  ('Angelo Parodi', '#incucinaconangeloparodi');

-- Colonne aggiuntive su ped_history
alter table ped_history add column if not exists framework text;
alter table ped_history add column if not exists hashtags text;

-- RLS
alter table angy_hashtags enable row level security;

create policy "service_role_only_hashtags" on angy_hashtags
  using (auth.role() = 'service_role');
