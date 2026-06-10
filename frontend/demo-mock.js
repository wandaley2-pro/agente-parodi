// DEMO MOCK – intercetta le chiamate alle Edge Functions e risponde con dati finti.
// Solo per anteprima visiva: NON includere in produzione.
(function () {
  const realFetch = window.fetch;

  const MOCK = {
    auth: { token: "demo-token", expiresAt: Date.now() + 864e5 },
    generate: {
      id: "demo-1",
      copy: "Il segreto del pranzo perfetto? Sta in dispensa da 137 anni. 🐟 Filetti di tonno Angelo Parodi: apri, condisci, sorridi. Qual è il tuo abbinamento preferito? Raccontacelo nei commenti 👇",
      obiettivo: "Interazione",
      brief_visual: "Flatlay dall'alto su tavolo in legno chiaro: piatto di pasta fredda con filetti di tonno, pomodorini, basilico fresco. Luce naturale laterale, atmosfera mediterranea. Palette: blu #003399, bianco, tocchi di giallo.",
      hashtags: ["#angeloparodi", "#incucinaconangeloparodi", "#pastaaltonno", "#ricettaveloce", "#pranzoitaliano"],
      framework: "Domanda-engagement",
      keywords_visual: ["tonno mediterraneo flatlay", "pasta fredda estiva", "cucina italiana rustica", "seafood styling"],
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
      ],
      // Demo: una giornata cade "domani" per mostrare il promemoria
      giornate: [
        { id: "g0", mese: 6, giorno: 11, nome: "Giornata mondiale degli oceani (demo)", idea: "L'oceano come casa: contenuti emozionali su mare e pesca", rilevanza: "alta" },
        { id: "g1", mese: 6, giorno: 18, nome: "Giornata della gastronomia sostenibile (ONU)", idea: "Ricette sostenibili e anti-spreco con conserve ittiche", rilevanza: "alta" },
        { id: "g2", mese: 6, giorno: 30, nome: "Giornata mondiale dei social media", idea: "Meta-contenuto: dietro le quinte del team social", rilevanza: "alta" },
        { id: "g3", mese: 7, giorno: 17, nome: "Giornata mondiale delle emoji", idea: "Post giocoso: raccontare un prodotto solo con le emoji", rilevanza: "media" },
        { id: "g4", mese: 8, giorno: 10, nome: "Notte di San Lorenzo", idea: "Cena sotto le stelle: convivialità estiva italiana", rilevanza: "media" },
        { id: "g5", mese: 10, giorno: 25, nome: "Giornata mondiale della pasta", idea: "L'abbinamento perfetto: pasta e tonno, il classico italiano", rilevanza: "alta" },
        { id: "g6", mese: 5, giorno: 2, nome: "Giornata mondiale del tonno (ONU)", idea: "LA giornata del brand: storia, qualità e cultura del tonno", rilevanza: "alta" },
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
      ],
    },
  };

  function jsonResponse(obj) {
    return Promise.resolve(new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } }));
  }

  window.fetch = function (url, opts) {
    const u = String(url);
    if (u.includes("/functions/v1/auth")) return jsonResponse(MOCK.auth);
    if (u.includes("/functions/v1/generate")) return jsonResponse(MOCK.generate);
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
