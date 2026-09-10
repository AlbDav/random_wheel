// URL del Google Sheet pubblicato sul web in CSV.
// Google Sheets → File → Condividi → Pubblica sul web → "Intero documento" → "Valori separati da virgola (.csv)".
// Incollalo completo così com'è: il `gid` della scheda viene impostato da ogni ruota del preset,
// e un eventuale `gid` già presente nell'URL viene sostituito.
export const SHEET_BASE = "https://docs.google.com/spreadsheets/d/e/<PUB_ID>/pub?single=true&output=csv";

// Oltre questo tempo il fetch è considerato fallito e si passa alla copia in cache.
export const FETCH_TIMEOUT_MS = 8000;
