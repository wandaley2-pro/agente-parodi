-- Migration 005: expanded giornate with tipo + newsletter esempi table

-- Add tipo column to giornate
ALTER TABLE angy_giornate ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'internazionale';

-- Clear and re-seed with expanded + typed list
DELETE FROM angy_giornate;

INSERT INTO angy_giornate (mese, giorno, nome, idea, rilevanza, tipo) VALUES
-- GENNAIO
(1, 1,  'Capodanno', 'Buoni propositi a tavola: il primo piatto dell''anno con Angelo Parodi', 'media', 'internazionale'),
(1, 17, 'Giornata nazionale della cucina italiana', 'Celebra la tradizione: ricette italiane autentiche con i nostri prodotti', 'alta', 'italiana'),
(1, 27, 'Giornata della Memoria', 'Memoria e tavola: storie di famiglia e ricette tramandate', 'media', 'internazionale'),
-- FEBBRAIO
(2, 5,  'Giornata nazionale contro lo spreco alimentare', 'Zero sprechi in cucina: tutto quello che puoi fare con una scatoletta', 'alta', 'italiana'),
(2, 14, 'San Valentino', 'Cena romantica in 15 minuti: salmone e semplicità', 'alta', 'internazionale'),
-- MARZO
(3, 8,  'Festa della donna', 'Le donne che portano il mare in tavola ogni giorno', 'alta', 'italiana'),
(3, 21, 'Giornata mondiale della felicità', 'La felicità è aprire la dispensa e trovarlo.', 'media', 'internazionale'),
(3, 22, 'Giornata mondiale dell''acqua', 'L''oceano che ci nutre: filiera sostenibile Angelo Parodi', 'media', 'internazionale'),
(3, 25, 'Festa dell''Annunciazione / Giornata nazionale', 'Tradizione e tavola italiana', 'bassa', 'italiana'),
-- APRILE
(4, 22, 'Giornata della Terra', 'Pesca sostenibile: il nostro impegno per il pianeta', 'alta', 'internazionale'),
(4, 25, 'Festa della Liberazione', 'Un classico italiano in tavola per il 25 aprile', 'alta', 'italiana'),
-- MAGGIO
(5, 1,  'Festa del Lavoro', 'Il pranzo dei lavoratori: veloce, buono, italiano', 'media', 'italiana'),
(5, 2,  'Giornata mondiale del tonno (ONU)', 'LA giornata del brand: storia, qualità e cultura del tonno italiano', 'alta', 'internazionale'),
(5, 22, 'Giornata mondiale della biodiversità marina', 'Rispettiamo il mare che ci dà tanto: biodiversità e pesca responsabile', 'media', 'internazionale'),
(5, 27, 'Giornata internazionale del pesce', 'Ogni filetto ha una storia: dal mare alla tua tavola', 'alta', 'internazionale'),
-- GIUGNO
(6, 2,  'Festa della Repubblica', 'Orgogliosamente italiani dal 1888: il gusto che non cambia', 'alta', 'italiana'),
(6, 5,  'Giornata mondiale dell''ambiente', 'Mare pulito, pesce buono: sostenibilità è il nostro metodo', 'alta', 'internazionale'),
(6, 8,  'Giornata mondiale degli oceani', 'L''oceano come casa: contenuti emozionali su mare e pesca', 'alta', 'internazionale'),
(6, 18, 'Giornata della gastronomia sostenibile (ONU)', 'Ricette sostenibili e anti-spreco con conserve ittiche', 'alta', 'internazionale'),
(6, 30, 'Giornata mondiale dei social media', 'Meta-contenuto: dietro le quinte del team social Angelo Parodi', 'alta', 'internazionale'),
-- LUGLIO
(7, 17, 'Giornata mondiale delle emoji', 'Post giocoso: racconta un prodotto solo con le emoji', 'media', 'internazionale'),
(7, 18, 'Notte di San Lorenzo (anticipazione)', 'Cena sotto le stelle: convivialità estiva italiana', 'media', 'italiana'),
-- AGOSTO
(8, 10, 'Notte di San Lorenzo', 'Cena romantica sotto le stelle: salmone e bollicine', 'media', 'italiana'),
(8, 15, 'Ferragosto', 'Il picnic perfetto all''italiana: Angelo Parodi non va in vacanza', 'alta', 'italiana'),
-- SETTEMBRE
(9, 16, 'Giornata internazionale per la protezione dello strato di ozono', 'Oceani sani, futuro sicuro: scelte di consumo responsabile', 'media', 'internazionale'),
(9, 29, 'Giornata mondiale del cuore', 'Pesce e benessere: il tonno come scelta di qualità quotidiana', 'media', 'internazionale'),
-- OTTOBRE
(10, 2, 'Festa dei nonni', 'Le ricette della nonna rivisitate con Angelo Parodi', 'alta', 'italiana'),
(10, 4, 'Giornata mondiale degli animali', 'Rispetto per il mare e le sue creature', 'bassa', 'internazionale'),
(10, 16, 'Giornata mondiale dell''alimentazione (ONU)', 'Nutrire il mondo con qualità: 137 anni di esperienza', 'alta', 'internazionale'),
(10, 25, 'Giornata mondiale della pasta', 'L''abbinamento perfetto: pasta e tonno, il classico italiano per eccellenza', 'alta', 'internazionale'),
(10, 31, 'Halloween', 'Dolcetto o... filetto? La dispensa che non fa paura', 'media', 'internazionale'),
-- NOVEMBRE
(11, 16, 'Giornata internazionale della dieta mediterranea (UNESCO)', 'Il tonno al centro della dieta più sana del mondo', 'alta', 'internazionale'),
(11, 19, 'Giornata mondiale dei diritti del mare', 'Mare, pesca e futuro: l''impegno Angelo Parodi', 'media', 'internazionale'),
(11, 21, 'Giornata mondiale della pesca', 'Omaggio ai pescatori: le persone che rendono possibile ogni filetto', 'alta', 'internazionale'),
-- DICEMBRE
(12, 2, 'Giornata nazionale del fumetto', 'Storie a fumetti: l''avventura di Angelo Parodi raccontata in panel', 'bassa', 'italiana'),
(12, 25, 'Natale', 'Antipasti di salmone Angelo Parodi per le feste: la tradizione del gusto', 'alta', 'italiana'),
(12, 31, 'San Silvestro / Capodanno', 'Brindisi con il meglio del mare: last night of the year', 'media', 'italiana');

-- Newsletter esempi table
CREATE TABLE IF NOT EXISTS angy_newsletter_esempi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente TEXT NOT NULL,
  titolo TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  tipo TEXT DEFAULT 'generale',
  attiva BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE angy_newsletter_esempi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON angy_newsletter_esempi FOR ALL TO service_role USING (true);
