-- Migrazione 004 – Calendario giornate nazionali e internazionali rilevanti per Angelo Parodi

create table if not exists angy_giornate (
  id uuid primary key default gen_random_uuid(),
  mese int not null check (mese between 1 and 12),
  giorno int not null check (giorno between 1 and 31),
  nome text not null,
  idea text,
  rilevanza text default 'media', -- alta | media
  attiva boolean default true
);

-- Calendario curato: food, mare, tradizione italiana, mondo social
insert into angy_giornate (mese, giorno, nome, idea, rilevanza) values
  (1, 17, 'Giornata Internazionale della Cucina Italiana', 'Celebrare un piatto iconico della tradizione con protagonista il tonno o le acciughe', 'alta'),
  (2, 5,  'Giornata nazionale contro lo spreco alimentare', 'Le conserve ittiche come alleate anti-spreco: lunga durata, zero rinunce alla qualità', 'alta'),
  (3, 20, 'Giornata internazionale della felicità', 'I piccoli momenti felici a tavola: il pranzo semplice che mette di buon umore', 'media'),
  (3, 22, 'Giornata mondiale dell''acqua', 'Il legame tra mare, acqua e qualità del pescato', 'media'),
  (4, 11, 'Giornata nazionale del mare (Italia)', 'La cultura marinara italiana: il mare come radice del brand dal 1888', 'alta'),
  (4, 22, 'Giornata mondiale della Terra', 'Pesca sostenibile e rispetto degli ecosistemi marini', 'alta'),
  (5, 2,  'Giornata mondiale del tonno (ONU)', 'LA giornata del brand: storia, qualità e cultura del tonno. Da preparare in anticipo!', 'alta'),
  (5, 22, 'Giornata mondiale della biodiversità', 'La ricchezza del Mediterraneo e la pesca responsabile', 'media'),
  (6, 5,  'Giornata mondiale dell''ambiente', 'Impegno e trasparenza sulla filiera sostenibile', 'media'),
  (6, 8,  'Giornata mondiale degli oceani', 'L''oceano come casa: contenuti emozionali su mare e pesca', 'alta'),
  (6, 18, 'Giornata della gastronomia sostenibile (ONU)', 'Ricette sostenibili e anti-spreco con conserve ittiche', 'alta'),
  (6, 30, 'Giornata mondiale dei social media', 'Meta-contenuto: dietro le quinte del team social, community celebration', 'alta'),
  (7, 17, 'Giornata mondiale delle emoji', 'Post giocoso: raccontare un prodotto solo con le emoji', 'media'),
  (8, 10, 'Notte di San Lorenzo', 'Cena sotto le stelle: convivialità estiva italiana', 'media'),
  (9, 29, 'Giornata internazionale contro perdite e sprechi alimentari (ONU)', 'La dispensa intelligente: il valore della lunga conservazione', 'alta'),
  (10, 2,  'Festa dei nonni (Italia)', 'Le ricette dei nonni, la tradizione che si tramanda: heritage perfetto per il brand', 'alta'),
  (10, 16, 'Giornata mondiale dell''alimentazione (FAO)', 'Il diritto al cibo buono e accessibile: la qualità per tutti', 'alta'),
  (10, 20, 'Giornata internazionale dei cuochi', 'Omaggio a chi cucina ogni giorno, dai professionisti ai genitori', 'media'),
  (10, 25, 'Giornata mondiale della pasta', 'L''abbinamento perfetto: pasta e tonno, il classico italiano per eccellenza', 'alta'),
  (11, 13, 'Giornata mondiale della gentilezza', 'Un gesto gentile: preparare il pranzo a qualcuno che ami', 'media'),
  (11, 16, 'Anniversario UNESCO Dieta Mediterranea', 'La dieta mediterranea patrimonio dell''umanità: il pesce azzurro al centro', 'alta'),
  (11, 18, 'Settimana della Cucina Italiana nel Mondo (terza settimana di novembre)', 'L''italianità nel mondo: il made in Italy alimentare', 'alta'),
  (11, 21, 'Giornata mondiale della pesca', 'Omaggio ai pescatori: il primo anello della filiera di qualità', 'alta'),
  (12, 5,  'Giornata mondiale del suolo', 'Filiera e ambiente: ogni scelta conta', 'media');

-- RLS
alter table angy_giornate enable row level security;

create policy "service_role_only_giornate" on angy_giornate
  using (auth.role() = 'service_role');
