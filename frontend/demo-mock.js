// DEMO MOCK – intercetta le chiamate alle Edge Functions e risponde con dati finti.
// Solo per anteprima visiva: NON includere in produzione.
(function () {
  const realFetch = window.fetch;

  const MOCK = {
    auth: { token: "demo-token", expiresAt: Date.now() + 864e5 },

    generate_social: {
      id: "demo-1",
      copy: "Il segreto del pranzo perfetto? Sta in dispensa da 137 anni. 🐟 Filetti di tonno Angelo Parodi: apri, condisci, sorridi. Qual è il tuo abbinamento preferito?",
      obiettivo: "Interazione",
      brief_visual: "Flatlay dall'alto su tavolo in legno chiaro: piatto di pasta fredda con filetti di tonno, pomodorini, basilico fresco. Luce naturale laterale, atmosfera mediterranea. Palette: blu #003399, bianco, tocchi di giallo #FFD600.",
      hashtags: ["#angeloparodi", "#incucinaconangeloparodi", "#pastaaltonno", "#ricettaveloce", "#pranzoitaliano"],
      framework: "Domanda-engagement",
      keywords_visual: ["tonno mediterraneo flatlay", "pasta fredda estiva", "cucina italiana rustica", "seafood styling"],
    },

    generate_newsletter: {
      oggetto: "Il mare d'estate sta in dispensa.",
      preview_text: "Tre ricette estive, un prodotto, zero rimpianti.",
      saluto: "Ciao, amante della buona tavola,",
      paragrafi: [
        "Luglio è arrivato e con lui quella voglia irresistibile di cucinare meno e mangiare meglio. Lo conosciamo tutti: il frigo vuoto alle 12:30, il sole che picchia, la voglia di qualcosa di fresco e buono senza stare un'ora davanti ai fornelli.",
        "La risposta è in dispensa. I Filetti di Tonno Angelo Parodi all'Olio Extravergine di Oliva sono stati fatti esattamente per momenti come questo — aperti, conditi, serviti. Questa settimana ti portiamo tre ricette estive da preparare in meno di venti minuti: una pasta fredda da leccarsi le dita, una tartare veloce per stupire, un piatto unico da portare al mare.",
        "Quest'estate mangia bene, semplicemente. Come lo facciamo dal 1888."
      ],
      cta_testo: "Tutte e tre le ricette ti aspettano sul sito — le trovi nel link in bio.",
      firma: "Il team di Angelo Parodi"
    },

    generate_ricetta_idea: {
      idee: [
        { titolo: "Crostini di acciughe, burro salato e arancia", descrizione: "Un aperitivo che sorprende: la forza delle acciughe ammorbidita dal burro, la nota agrumata che apre il palato.", difficolta: "Facile", tempo_minuti: 10, angolo: "Aperitivo di classe in 10 minuti" },
        { titolo: "Insalata di farro con tonno, peperoni arrostiti e capperi", descrizione: "Piatto completo che si prepara la sera prima — perfetto per i pranzi fuori ufficio.", difficolta: "Facile", tempo_minuti: 25, angolo: "Meal prep anti-caldo estivo" },
        { titolo: "Salmone affumicato con avocado, sesamo tostato e lime", descrizione: "Quando vuoi fare colpo senza cucinare. Fresco, moderno, italiano nel carattere.", difficolta: "Facile", tempo_minuti: 10, angolo: "Social-ready in 10 minuti" },
        { titolo: "Pasta fredda con sgombro, olive taggiasche e pomodori confit", descrizione: "Il piatto di agosto: prepara oggi, porta domani al mare.", difficolta: "Facile", tempo_minuti: 20, angolo: "Picnic estivo con prodotti premium" },
        { titolo: "Frittata di tonno, patate e menta fresca", descrizione: "La frittata che non ti aspetti — profumata, compatta, buona anche fredda il giorno dopo.", difficolta: "Media", tempo_minuti: 30, angolo: "Classico reinterpretato con twist aromatico" }
      ]
    },

    generate_ricetta: {
      nome: "Pasta fredda al tonno con olive taggiasche e basilico",
      descrizione_breve: "Un piatto d'estate che sa di Mediterraneo: dalla dispensa alla tavola in venti minuti, con tutto il sapore del mare in ogni forchettata.",
      tempo_preparazione: "20 minuti",
      difficolta: "Facile",
      porzioni: "4 persone",
      ingredienti: [
        "280g Filetti di Tonno Angelo Parodi all'Olio Extravergine di Oliva",
        "320g pasta formato sedanini o mezze penne",
        "80g olive taggiasche denocciolate",
        "250g pomodorini ciliegino",
        "1 mazzo abbondante di basilico fresco",
        "2 cucchiai di olio extravergine di oliva",
        "Sale grosso, pepe nero macinato al momento"
      ],
      preparazione: [
        "Porta a ebollizione abbondante acqua salata. Cuoci la pasta per il tempo indicato in confezione, scolala al dente e raffreddala sotto acqua fredda corrente per fermare la cottura.",
        "Nel frattempo, taglia i pomodorini a metà e condiscili con un pizzico di sale. Lascia che rilascino il loro succo per 5 minuti.",
        "In una ciotola capiente, versa la pasta fredda, i filetti di tonno sgocciolati (spezzandoli grossolanamente con le mani per mantenere la consistenza), le olive taggiasche e i pomodorini con tutto il loro succo.",
        "Condisci con l'olio extravergine e un'abbondante macinata di pepe nero. Mescola con delicatezza per non spezzare troppo il tonno.",
        "Aggiungi le foglie di basilico spezzate a mano solo al momento di servire — così mantengono tutto il profumo."
      ],
      consiglio_chef: "Prepara questo piatto il giorno prima: riposando in frigorifero una notte, gli ingredienti si amalgamano e il sapore si intensifica. Ottimo anche da portare al mare o in ufficio come pranzo al sacco."
    },

    transcribe_ricetta: {
      nome: "Tagliolini al nero di seppia con polpa di granchio",
      descrizione_breve: "Dal video dello chef: una pasta elegante dove il nero di seppia incontra la delicatezza della polpa di granchio Angelo Parodi — un primo da grande occasione in soli 35 minuti.",
      tempo_preparazione: "35 minuti",
      difficolta: "Media",
      porzioni: "4 persone",
      prodotto_principale: "Polpa di Granchio Angelo Parodi",
      ingredienti: [
        "150g Polpa di Granchio Angelo Parodi",
        "400g tagliolini freschi al nero di seppia",
        "3 pomodorini datterini",
        "1 spicchio d'aglio",
        "4 cucchiai di olio extravergine di oliva",
        "Peperoncino fresco q.b.",
        "Prezzemolo fresco, sale marino"
      ],
      preparazione: [
        "In una padella ampia, scalda l'olio con lo spicchio d'aglio e il peperoncino a fuoco dolce per 2 minuti finché l'aglio è dorato.",
        "Aggiungi i datterini tagliati a metà, alza la fiamma e cuoci per 3 minuti finché si ammorbidiscono e rilasciano il succo.",
        "Unisci la polpa di granchio e mescola delicatamente per 1-2 minuti — il granchio non deve cuocere a lungo, solo scaldarsi per insaporirsi.",
        "Cuoci i tagliolini in abbondante acqua salata (4-5 minuti per i freschi). Scola conservando una tazza di acqua di cottura.",
        "Trasferisci la pasta nella padella con il condimento, salta a fuoco vivo aggiungendo qualche cucchiaio di acqua di cottura per mantecare.",
        "Servi subito con prezzemolo fresco tritato e un filo d'olio a crudo."
      ],
      consiglio_chef: "Per un risultato ancora più raffinato, aggiungi qualche scorza di limone grattuggiata al momento di impiattare — esalta la dolcezza naturale del granchio."
    },

    history: {
      posts: [
        { id: "h1", created_at: "2026-06-09T10:30:00Z", formato: "Reel", framework: "Tip veloce", obiettivo: "Copertura", status: "approvato", copy: "Lo sapevi? Le nostre acciughe riposano 12 mesi prima di arrivare sulla tua tavola. 🐟 La pazienza è l'ingrediente segreto.", hashtags: "#angeloparodi #incucinaconangeloparodi #acciughe" },
        { id: "h2", created_at: "2026-06-08T15:12:00Z", formato: "Carosello", framework: "Heritage", obiettivo: "Interazione", status: "bozza", copy: "1888: Angelo apre la prima bottega a Genova. Oggi quella ricetta è ancora la stessa. Scorri per scoprire la storia ➡️", hashtags: "#angeloparodi #storiaitaliana #dal1888" },
        { id: "h3", created_at: "2026-06-07T09:00:00Z", formato: "Singolo", framework: "PAS", obiettivo: "Traffico", status: "scartato", copy: "Frigo vuoto e zero voglia di cucinare? Capita anche ai migliori. 😅 Il rimedio è nel link in bio.", hashtags: "#angeloparodi #ricettafacile" },
      ],
    },

    memoria: {
      note: [
        { id: "n1", nota: "Non usare mai il termine \"conserva\" — preferisci \"filetti\", \"preparazione\", \"prodotto\"", tipo: "tono", attiva: true },
        { id: "n2", nota: "Il brand esiste dal 1888: quando menzioni la storia, usa quel numero", tipo: "brand", attiva: true },
        { id: "n3", nota: "Non fare mai claim di salute o nutrizionali specifici", tipo: "compliance", attiva: true },
        { id: "n4", nota: "Evita il tono pubblicitario aggressivo — preferisci storytelling quotidiano", tipo: "tono", attiva: false },
      ],
      hashtags: [
        { id: "t1", tag: "#angeloparodi", attiva: true },
        { id: "t2", tag: "#incucinaconangeloparodi", attiva: true },
        { id: "t3", tag: "#dal1888", attiva: false },
      ],
      strategia: [
        { id: "s1", sezione: "Target", contenuto: "Famiglie italiane 30-55 anni, appassionati di cucina autentica e pratica, chi cerca qualità riconoscibile senza fronzoli.", attiva: true, ordine: 1 },
        { id: "s2", sezione: "Tono di voce", contenuto: "Familiare, caldo, con ironia leggera quando viene naturale. Mai formale, mai freddo, mai da vecchia réclame.", attiva: true, ordine: 2 },
        { id: "s3", sezione: "Pilastri editoriali", contenuto: "Heritage (storia dal 1888), Qualità del prodotto, Vita quotidiana italiana, Ricette e abbinamenti pratici.", attiva: true, ordine: 3 },
      ],
      aforismi: [
        { id: "a1", testo: "A tavola non si invecchia.", autore: "Proverbio italiano", categoria: "tradizione" },
        { id: "a2", testo: "Il mare dà, e il mare prende. Bisogna saperlo ascoltare.", autore: "Detto dei pescatori", categoria: "mare" },
        { id: "a3", testo: "La semplicità è la massima sofisticazione.", autore: "Leonardo da Vinci", categoria: "creatività" },
        { id: "a4", testo: "Cucina bene chi ama bene.", autore: "Proverbio toscano", categoria: "tradizione" },
        { id: "a5", testo: "Il profumo del mare non si dimentica.", autore: "Anonimo", categoria: "mare" },
      ],
      giornate: [
        { id: "g01", mese: 1, giorno: 1,  nome: "Capodanno", idea: "Buoni propositi a tavola: il primo piatto dell'anno con Angelo Parodi", rilevanza: "media", tipo: "internazionale" },
        { id: "g02", mese: 1, giorno: 17, nome: "Giornata nazionale della cucina italiana", idea: "Celebra la tradizione: ricette italiane autentiche con i nostri prodotti", rilevanza: "alta", tipo: "italiana" },
        { id: "g03", mese: 1, giorno: 27, nome: "Giornata della Memoria", idea: "Memoria e tavola: storie di famiglia e ricette tramandate", rilevanza: "media", tipo: "internazionale" },
        { id: "g04", mese: 2, giorno: 5,  nome: "Giornata nazionale contro lo spreco alimentare", idea: "Zero sprechi in cucina: tutto quello che puoi fare con una scatoletta", rilevanza: "alta", tipo: "italiana" },
        { id: "g05", mese: 2, giorno: 14, nome: "San Valentino", idea: "Cena romantica in 15 minuti: salmone e semplicità", rilevanza: "alta", tipo: "internazionale" },
        { id: "g06", mese: 3, giorno: 8,  nome: "Festa della donna", idea: "Le donne che portano il mare in tavola ogni giorno", rilevanza: "alta", tipo: "italiana" },
        { id: "g07", mese: 3, giorno: 21, nome: "Giornata mondiale della felicità", idea: "La felicità è aprire la dispensa e trovarlo 🐟", rilevanza: "media", tipo: "internazionale" },
        { id: "g08", mese: 3, giorno: 22, nome: "Giornata mondiale dell'acqua", idea: "L'oceano che ci nutre: filiera sostenibile Angelo Parodi", rilevanza: "media", tipo: "internazionale" },
        { id: "g09", mese: 4, giorno: 22, nome: "Giornata della Terra", idea: "Pesca sostenibile: il nostro impegno per il pianeta", rilevanza: "alta", tipo: "internazionale" },
        { id: "g10", mese: 4, giorno: 25, nome: "Festa della Liberazione", idea: "Un classico italiano in tavola per il 25 aprile", rilevanza: "alta", tipo: "italiana" },
        { id: "g11", mese: 5, giorno: 1,  nome: "Festa del Lavoro", idea: "Il pranzo dei lavoratori: veloce, buono, italiano", rilevanza: "media", tipo: "italiana" },
        { id: "g12", mese: 5, giorno: 2,  nome: "Giornata mondiale del tonno (ONU)", idea: "LA giornata del brand: storia, qualità e cultura del tonno italiano", rilevanza: "alta", tipo: "internazionale" },
        { id: "g13", mese: 5, giorno: 22, nome: "Giornata mondiale della biodiversità marina", idea: "Rispettiamo il mare che ci dà tanto: biodiversità e pesca responsabile", rilevanza: "media", tipo: "internazionale" },
        { id: "g14", mese: 5, giorno: 27, nome: "Giornata internazionale del pesce", idea: "Ogni filetto ha una storia: dal mare alla tua tavola", rilevanza: "alta", tipo: "internazionale" },
        { id: "g15", mese: 6, giorno: 2,  nome: "Festa della Repubblica", idea: "Orgogliosamente italiani dal 1888: il gusto che non cambia", rilevanza: "alta", tipo: "italiana" },
        { id: "g16", mese: 6, giorno: 5,  nome: "Giornata mondiale dell'ambiente", idea: "Mare pulito, pesce buono: sostenibilità è il nostro metodo", rilevanza: "alta", tipo: "internazionale" },
        { id: "g17", mese: 6, giorno: 8,  nome: "Giornata mondiale degli oceani", idea: "L'oceano come casa: contenuti emozionali su mare e pesca", rilevanza: "alta", tipo: "internazionale" },
        { id: "g18", mese: 6, giorno: 18, nome: "Giornata della gastronomia sostenibile (ONU)", idea: "Ricette sostenibili e anti-spreco con conserve ittiche", rilevanza: "alta", tipo: "internazionale" },
        { id: "g19", mese: 6, giorno: 30, nome: "Giornata mondiale dei social media", idea: "Meta-contenuto: dietro le quinte del team social Angelo Parodi", rilevanza: "alta", tipo: "internazionale" },
        { id: "g20", mese: 7, giorno: 17, nome: "Giornata mondiale delle emoji", idea: "Post giocoso: racconta un prodotto solo con le emoji 🐟🍝🌊", rilevanza: "media", tipo: "internazionale" },
        { id: "g21", mese: 7, giorno: 18, nome: "Notte di San Lorenzo (anticipazione)", idea: "Cena sotto le stelle: convivialità estiva italiana", rilevanza: "media", tipo: "italiana" },
        { id: "g22", mese: 8, giorno: 10, nome: "Notte di San Lorenzo", idea: "Cena romantica sotto le stelle: salmone e bollicine", rilevanza: "media", tipo: "italiana" },
        { id: "g23", mese: 8, giorno: 15, nome: "Ferragosto", idea: "Il picnic perfetto all'italiana: Angelo Parodi non va in vacanza", rilevanza: "alta", tipo: "italiana" },
        { id: "g24", mese: 9, giorno: 16, nome: "Giornata dello strato di ozono", idea: "Oceani sani, futuro sicuro: scelte di consumo responsabile", rilevanza: "media", tipo: "internazionale" },
        { id: "g25", mese: 9, giorno: 29, nome: "Giornata mondiale del cuore", idea: "Pesce e benessere: il tonno come scelta di qualità quotidiana", rilevanza: "media", tipo: "internazionale" },
        { id: "g26", mese: 10, giorno: 2,  nome: "Festa dei nonni", idea: "Le ricette della nonna rivisitate con Angelo Parodi", rilevanza: "alta", tipo: "italiana" },
        { id: "g27", mese: 10, giorno: 4,  nome: "Giornata mondiale degli animali", idea: "Rispetto per il mare e le sue creature", rilevanza: "bassa", tipo: "internazionale" },
        { id: "g28", mese: 10, giorno: 16, nome: "Giornata mondiale dell'alimentazione (ONU)", idea: "Nutrire il mondo con qualità: 137 anni di esperienza", rilevanza: "alta", tipo: "internazionale" },
        { id: "g29", mese: 10, giorno: 25, nome: "Giornata mondiale della pasta", idea: "L'abbinamento perfetto: pasta e tonno, il classico italiano per eccellenza", rilevanza: "alta", tipo: "internazionale" },
        { id: "g30", mese: 10, giorno: 31, nome: "Halloween", idea: "Dolcetto o... filetto? La dispensa che non fa paura 🐟", rilevanza: "media", tipo: "internazionale" },
        { id: "g31", mese: 11, giorno: 16, nome: "Dieta mediterranea UNESCO", idea: "Il tonno al centro della dieta più sana del mondo", rilevanza: "alta", tipo: "internazionale" },
        { id: "g32", mese: 11, giorno: 19, nome: "Giornata mondiale dei diritti del mare", idea: "Mare, pesca e futuro: l'impegno Angelo Parodi", rilevanza: "media", tipo: "internazionale" },
        { id: "g33", mese: 11, giorno: 21, nome: "Giornata mondiale della pesca", idea: "Omaggio ai pescatori: le persone che rendono possibile ogni filetto", rilevanza: "alta", tipo: "internazionale" },
        { id: "g34", mese: 12, giorno: 2,  nome: "Giornata nazionale del fumetto", idea: "Storie a fumetti: l'avventura di Angelo Parodi raccontata in panel", rilevanza: "bassa", tipo: "italiana" },
        { id: "g35", mese: 12, giorno: 25, nome: "Natale", idea: "Antipasti di salmone Angelo Parodi per le feste: la tradizione del gusto", rilevanza: "alta", tipo: "italiana" },
        { id: "g36", mese: 12, giorno: 31, nome: "San Silvestro", idea: "Brindisi con il meglio del mare: last night of the year", rilevanza: "media", tipo: "italiana" },
      ],
      newsletter_esempi: [
        {
          id: "ne1",
          titolo: "Newsletter Maggio 2026 — Giornata del tonno",
          contenuto: "Ciao, amante della buona tavola,\n\nIl 2 maggio è la Giornata Mondiale del Tonno — e noi avevamo qualcosa da raccontarti.\n\nDal 1888, quando Angelo Parodi aprì la prima bottega a Genova, il tonno è stato molto più di un ingrediente per noi. È un artigianato, una filiera, una promessa rinnovata ogni anno: solo il pesce migliore, lavorato come si fa in casa.\n\nIn questi 137 anni abbiamo capito una cosa: il buon cibo non ha bisogno di spiegazioni. Apri la scatoletta, senti il profumo del mare — e già sai.\n\nPer festeggiare, abbiamo preparato tre ricette con i nostri filetti all'olio extravergine. Semplici, vere, buonissime. Le trovi sul sito nel link in bio.\n\nBuona Giornata del Tonno,\nIl team di Angelo Parodi",
          tipo: "stagionale"
        },
        {
          id: "ne2",
          titolo: "Newsletter Estate 2026 — Ricette fredde",
          contenuto: "Ciao,\n\nL'estate non aspetta nessuno, e nemmeno la fame.\n\nCi siamo messi al lavoro per te: cinque ricette fredde, pronte in meno di venti minuti, che fanno del tonno Angelo Parodi il protagonista assoluto dell'estate. Dalla pasta di emergenza (quella che salva il pranzo quando hai quattro minuti), alla tartare per quando vuoi stupire senza accendere i fornelli.\n\nQuest'anno non rinunciare a mangiare bene anche sotto il sole.\n\nTrovi tutto nel link in bio — buona estate.\n\nIl team di Angelo Parodi",
          tipo: "ricetta"
        }
      ],
    },

    news: {
      aggiornato: "10/06/2026, 09:30",
      news: [
        { titolo: "Instagram cambia l'algoritmo dei Reel: più spazio ai piccoli creator", link: "https://www.ninjamarketing.it/", fonte: "Ninja Marketing", data: "", perche: "Cambia la strategia di distribuzione dei Reel del brand", idea_post: "" },
        { titolo: "Pesca sostenibile nel Mediterraneo: nuove certificazioni in arrivo", link: "https://www.ilfattoalimentare.it/", fonte: "Il Fatto Alimentare", data: "", perche: "Tema centrale per la filiera Angelo Parodi", idea_post: "Post sulla trasparenza della filiera" },
        { titolo: "Estate 2026: boom delle ricette fredde con pesce azzurro", link: "https://www.gamberorosso.it/", fonte: "Gambero Rosso", data: "", perche: "Trend perfetto per i prodotti del brand in stagione", idea_post: "Carosello: 5 ricette fredde con sgombro e acciughe" },
      ],
    },

    trends: {
      data_aggiornamento: "10/06/2026",
      trends: [
        { titolo: "Cucina antispreco", spunto: "Cresce l'attenzione al riuso degli ingredienti: le conserve ittiche sono protagoniste naturali.", angolo: "Reel: 3 idee con un vasetto aperto ieri" },
        { titolo: "Pranzo al sacco estivo", spunto: "Con l'estate esplodono i contenuti su picnic e pranzi fuori casa.", angolo: "Carosello: la schiscetta perfetta col tonno" },
        { titolo: "Seafood pasta virale", spunto: "Le ricette di pasta col pesce continuano a dominare TikTok e Instagram Reels.", angolo: "Reel: la pasta al tonno fatta come si deve" },
      ],
    },
  };

  function jsonResponse(obj) {
    return Promise.resolve(new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } }));
  }

  window.fetch = function (url, opts) {
    const u = String(url);

    if (u.includes("/functions/v1/auth")) return jsonResponse(MOCK.auth);

    if (u.includes("/functions/v1/generate")) {
      const body = JSON.parse(opts?.body || "{}");
      if (body.tipo === "newsletter") return jsonResponse(MOCK.generate_newsletter);
      if (body.tipo === "ricetta_idea") return jsonResponse(MOCK.generate_ricetta_idea);
      if (body.tipo === "ricetta") return jsonResponse(MOCK.generate_ricetta);
      return jsonResponse(MOCK.generate_social);
    }

    if (u.includes("/functions/v1/transcribe")) return jsonResponse(MOCK.transcribe_ricetta);

    if (u.includes("/functions/v1/history")) {
      const body = JSON.parse(opts?.body || "{}");
      if (body.action === "status") return jsonResponse({ ok: true });
      return jsonResponse(MOCK.history);
    }

    if (u.includes("/functions/v1/memoria")) {
      const body = JSON.parse(opts?.body || "{}");
      if (body.action === "list") return jsonResponse(MOCK.memoria);
      return jsonResponse({ ok: true });
    }

    if (u.includes("/functions/v1/trends")) {
      const body = JSON.parse(opts?.body || "{}");
      if (body.action === "news") return jsonResponse(MOCK.news);
      return jsonResponse(MOCK.trends);
    }

    return realFetch(url, opts);
  };
})();
