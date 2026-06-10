-- Migrazione 003 – Strategia editoriale + Aforismi

-- Strategia editoriale (editabile dall'app)
create table if not exists angy_strategia (
  id uuid primary key default gen_random_uuid(),
  cliente text default 'Angelo Parodi',
  sezione text not null,
  contenuto text not null,
  ordine int default 0,
  attiva boolean default true,
  created_at timestamptz default now()
);

-- Valori di default per Angelo Parodi (il team può modificarli dall'app)
insert into angy_strategia (cliente, sezione, contenuto, ordine) values
  ('Angelo Parodi', 'Target', 'Famiglie italiane 30-55 anni, appassionati di cucina autentica e pratica, chi cerca qualità riconoscibile senza fronzoli. Presente su Instagram e Facebook.', 1),
  ('Angelo Parodi', 'Tono di voce', 'Familiare, caldo, con ironia leggera quando viene naturale. Mai formale, mai freddo, mai da vecchia réclame. Scrivi come parlerebbe una persona vera che ama la buona tavola.', 2),
  ('Angelo Parodi', 'Pilastri editoriali', 'Heritage (storia dal 1888), Qualità del prodotto (filetti, non conserve), Vita quotidiana italiana (la tavola come momento di connessione), Ricette e abbinamenti pratici.', 3),
  ('Angelo Parodi', 'Obiettivi social', 'Interazione autentica > reach passivo. Costruire familiarità col brand, non vendere direttamente. Il prodotto è protagonista silenzioso, non il messaggio principale.', 4),
  ('Angelo Parodi', 'Prodotti core', 'Tonno (filetti in olio, al naturale), Acciughe, Sgombro, Sardine, Paté di tonno. Qualità mediterranea, pesca sostenibile, ricette della tradizione italiana.', 5),
  ('Angelo Parodi', 'Cosa evitare', 'Claim nutrizionali o di salute specifici. Tono aggressivo o promozionale. Parola "conserva". Emoji in eccesso (max 2 per post). Hashtag generici (#food #yummy).', 6);

-- Aforismi curati su cibo, mare, tradizione italiana
create table if not exists angy_aforismi (
  id uuid primary key default gen_random_uuid(),
  testo text not null,
  autore text default 'Anonimo',
  categoria text default 'food',
  attiva boolean default true
);

insert into angy_aforismi (testo, autore, categoria) values
  ('A tavola non si invecchia.', 'Proverbio italiano', 'tradizione'),
  ('La cucina è un atto d''amore che si rinnova ogni giorno.', 'Paul Bocuse', 'food'),
  ('Dimmi cosa mangi, ti dirò chi sei.', 'Jean-Anthelme Brillat-Savarin', 'food'),
  ('La semplicità è la massima sofisticazione.', 'Leonardo da Vinci', 'creatività'),
  ('Non c''è amore più sincero di quello per il cibo.', 'George Bernard Shaw', 'food'),
  ('Prima si mangia con gli occhi.', 'Proverbio italiano', 'tradizione'),
  ('Il mare dà, e il mare prende. Bisogna saperlo ascoltare.', 'Detto dei pescatori', 'mare'),
  ('Ogni ricetta è una storia che qualcuno ha voluto ricordare.', 'Anonimo', 'food'),
  ('La qualità si ricorda molto tempo dopo che il prezzo è stato dimenticato.', 'Aldo Gucci', 'brand'),
  ('Cucina buona, famiglia felice.', 'Proverbio italiano', 'tradizione'),
  ('Il Mediterraneo non è solo un mare: è un modo di vivere.', 'Fernand Braudel', 'mare'),
  ('La tradizione non è culto delle ceneri, è trasmissione del fuoco.', 'Gustav Mahler', 'brand'),
  ('In cucina come nella vita: la qualità degli ingredienti fa sempre la differenza.', 'Anonimo', 'food'),
  ('Il pasto è il solo momento della giornata in cui nessuno è davvero straniero.', 'Anonimo', 'tradizione'),
  ('Il tonno è il maiale del mare: non si butta via niente.', 'Detto dei pescatori siciliani', 'mare'),
  ('Un piatto buono non ha bisogno di spiegazioni.', 'Joël Robuchon', 'food'),
  ('Il profumo del mare in una lattina: questo è il miracolo della conservazione.', 'Anonimo', 'mare'),
  ('Mangiare è una necessità. Mangiare bene è un''arte.', 'François de La Rochefoucauld', 'food'),
  ('Il sapore autentico non si inventa: si tramanda.', 'Anonimo', 'brand'),
  ('Dal mare alla tavola: il viaggio più breve è sempre il migliore.', 'Anonimo', 'mare'),
  ('Ogni generazione cucina per la prossima. È così che si resta in vita.', 'Anonimo', 'tradizione'),
  ('La pesca è pazienza fatta mestiere, e il mare è il premio.', 'Anonimo', 'mare');

-- RLS
alter table angy_strategia enable row level security;
alter table angy_aforismi enable row level security;

create policy "service_role_only_strategia" on angy_strategia
  using (auth.role() = 'service_role');

create policy "service_role_only_aforismi" on angy_aforismi
  using (auth.role() = 'service_role');
