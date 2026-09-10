import { caricaListe, pool, type Lista } from "../lib/data";
import { finalisti } from "../lib/finalisti";
import { leggiPreset } from "../lib/preset";
import { creaRuota, type Ruota } from "../lib/ruota";
import { adatta, perSchermo } from "../lib/tipografia";
import type { Riga, RuotaConfig } from "../lib/types";

const params = new URLSearchParams(location.search);
const { id: presetId, preset } = leggiPreset(params);
const SPIN_MS = preset.spin_ms ?? 2000;

const $ = (sel: string) => document.querySelector<HTMLElement>(sel)!;
const stage = $("#stage");
const tela = $("#tela");

function div(classe: string, testo?: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = classe;
  if (testo !== undefined) el.textContent = testo;
  return el;
}

interface Slot {
  cfg: RuotaConfig;
  enfasi: 1 | 2;
  pool: Riga[];
  finalisti: Riga[];
  /** Nomi usciti in questa sessione (pagina), per `no_ripetizioni`. */
  usciti: Set<string>;
  ruota?: Ruota;
  nome?: HTMLElement;
  sotto?: HTMLElement;
}

const slots: Slot[] = preset.ruote.map((cfg) => ({
  cfg,
  enfasi: cfg.enfasi === 1 ? 1 : 2,
  pool: [],
  finalisti: [],
  usciti: new Set(),
}));

const estraibili = (s: Slot) => (s.cfg.no_ripetizioni ? s.pool.filter((r) => !s.usciti.has(r.nome)) : s.pool);

// ---------- Scala dello stage ----------

new ResizeObserver(() => {
  const { width, height } = stage.getBoundingClientRect();
  tela.style.setProperty("--scala", String(width / 1080));
  // Chrome non reimpagina il testo SVG quando cambia la scala di un antenato: senza questo,
  // dopo un resize le etichette degli spicchi escono dalla ruota.
  for (const disco of tela.querySelectorAll<SVGSVGElement>(".ruota-disco")) {
    disco.style.display = "none";
    disco.getBoundingClientRect();
    disco.style.display = "";
  }
  misure = `stage ${Math.round(width)}×${Math.round(height)} css · ${Math.round(width * devicePixelRatio)}×${Math.round(height * devicePixelRatio)} px`;
  aggiornaDettagli();
}).observe(stage);

// ---------- Pannello di servizio (fuori dallo stage) ----------

let misure = "";

function stato(testo: string, fonte?: "rete" | "cache" | "errore") {
  $("#stato").textContent = testo;
  const p = $("#puntino");
  if (fonte) p.dataset.fonte = fonte;
  else delete p.dataset.fonte;
}

function statoListe(liste: Lista[]) {
  const quando = (ts: number) =>
    new Date(ts).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const inCache = liste.filter((l) => l.fonte === "cache");
  if (inCache.length === 0) return stato(`live · ${quando(Date.now())}`, "rete");
  const piuVecchia = Math.min(...inCache.map((l) => l.ts));
  stato(`cache del ${quando(piuVecchia)} · ${inCache[0].errore}`, "cache");
}

function aggiornaDettagli() {
  const righe = slots.map((s, i) => {
    const nome = s.cfg.label || `ruota ${i + 1}`;
    const usciti = s.cfg.no_ripetizioni ? ` · usciti ${s.usciti.size}` : "";
    return `${nome}: pool ${s.pool.length} · in ruota ${s.finalisti.length}${usciti}`;
  });
  $("#dettagli").textContent = [`preset “${presetId}”`, ...righe, misure].join("\n");
}

function mostraErrore(motivo: string) {
  tela.replaceChildren();
  const box = div("errore");
  const h = document.createElement("h1");
  h.textContent = "Non riesco a caricare la lista";
  const p = document.createElement("p");
  p.textContent = motivo;
  box.append(h, p);
  tela.append(box);
  stato(motivo, "errore");
}

// ---------- Dati ----------

/** Scarica le liste e ricalcola pool e finalisti. False se non c'è niente da estrarre. */
async function aggiornaDati(): Promise<boolean> {
  stato("caricamento…");
  let liste: Lista[];
  try {
    liste = await caricaListe(preset.ruote);
  } catch (e) {
    mostraErrore(e instanceof Error ? e.message : String(e));
    return false;
  }
  for (const [i, s] of slots.entries()) {
    s.pool = pool(liste[i], s.cfg);
    if (estraibili(s).length === 0) {
      mostraErrore(`La scheda gid ${s.cfg.gid} non ha nomi estraibili.`);
      return false;
    }
    s.finalisti = finalisti(presetId, i, estraibili(s), preset.finalisti);
    console.groupCollapsed(`[${s.cfg.label || `ruota ${i + 1}`}] gid ${s.cfg.gid} · ${liste[i].fonte} · pool ${s.pool.length}`);
    console.table(s.pool);
    console.log("finalisti", s.finalisti.map((r) => r.nome));
    console.groupEnd();
  }
  statoListe(liste);
  aggiornaDettagli();
  return true;
}

// ---------- Vista ruota ----------

let pronto = false;
let inGiro = false;

function montaRuote() {
  const n = slots.length;
  const conLabel = slots.some((s) => s.cfg.label);
  const d = Math.floor(Math.min(620 - (conLabel ? 60 : 0), (960 - (n - 1) * 40) / n));

  const zona = div("zona-ruote");
  zona.style.setProperty("--d", `${d}px`);
  const risultati = div("zona-risultati");
  for (const s of slots) {
    s.ruota = creaRuota(s.cfg.label);
    zona.append(s.ruota.el);

    const r = div("risultato");
    r.dataset.enfasi = String(s.enfasi);
    const box = div("nome-box");
    s.nome = div("nome");
    box.append(s.nome);
    r.append(box);
    if (s.cfg.sottotitolo) {
      s.sotto = div("sotto");
      r.append(s.sotto);
    }
    risultati.append(r);
  }
  tela.append(zona);
  if (preset.titolo) tela.append(div("titolo", preset.titolo));
  tela.append(risultati);
}

function pulisciRisultati() {
  for (const s of slots) {
    s.nome!.textContent = "";
    if (s.sotto) s.sotto.textContent = "";
  }
}

/** Scrive il risultato e ne restituisce il corpo. `tetto` limita i secondari. */
function mostraRisultato(s: Slot, riga: Riga, tetto = 150): number {
  s.nome!.textContent = perSchermo(riga.nome);
  const corpo = s.enfasi === 2 ? adatta(s.nome!, 300, 24, 3) : adatta(s.nome!, tetto, Math.min(20, tetto), 2);

  const campo = s.cfg.sottotitolo;
  if (s.sotto && campo) {
    const valore = riga[campo];
    s.sotto.textContent = valore ? `${campo.replace(/_/g, " ")} ${valore}` : "";
  }
  return corpo;
}

async function avviaRuota() {
  montaRuote();
  if (!(await aggiornaDati())) return;
  for (const s of slots) s.ruota!.setFinalisti(s.finalisti);
  pronto = true;
}

async function gira() {
  if (!pronto || inGiro) return;

  // no_ripetizioni: chi è già uscito lascia la ruota prima del giro successivo.
  for (const [i, s] of slots.entries()) {
    if (!s.cfg.no_ripetizioni) continue;
    const rimasti = s.finalisti.filter((r) => !s.usciti.has(r.nome));
    if (rimasti.length === s.finalisti.length) continue;
    if (rimasti.length === 0 && estraibili(s).length === 0) {
      stato(`${s.cfg.label || `ruota ${i + 1}`}: tutti i nomi sono già usciti`, "errore");
      return;
    }
    s.finalisti = rimasti.length ? rimasti : finalisti(presetId, i, estraibili(s), preset.finalisti, true);
    s.ruota!.setFinalisti(s.finalisti);
  }

  inGiro = true;
  document.body.classList.add("in-giro");
  pulisciRisultati();

  const vincitori = await Promise.all(slots.map((s) => s.ruota!.spin(SPIN_MS)));
  // Stesso task dell'arresto: il nome è a schermo nel frame successivo.
  // Prima i dominanti; i secondari non superano metà del corpo del più piccolo di loro.
  let tetto = 150;
  slots.forEach((s, i) => {
    if (s.enfasi === 2) tetto = Math.min(tetto, Math.floor(mostraRisultato(s, vincitori[i]) / 2));
  });
  slots.forEach((s, i) => {
    if (s.enfasi === 1) mostraRisultato(s, vincitori[i], tetto);
    s.usciti.add(vincitori[i].nome);
  });

  inGiro = false;
  document.body.classList.remove("in-giro");
  aggiornaDettagli();
}

function rimescola() {
  if (!pronto || inGiro) return;
  for (const [i, s] of slots.entries()) {
    s.finalisti = finalisti(presetId, i, estraibili(s), preset.finalisti, true);
    s.ruota!.setFinalisti(s.finalisti);
  }
  pulisciRisultati();
  aggiornaDettagli();
}

async function ricarica() {
  if (inGiro) return;
  // Primo caricamento fallito: lo stage mostra l'errore, si riparte da capo.
  if (!pronto) return location.reload();
  pronto = false;
  if (!(await aggiornaDati())) return;
  for (const s of slots) s.ruota!.setFinalisti(s.finalisti);
  pronto = true;
}

// ---------- Vista finalisti (screenshot per le storie) ----------

async function avviaFinalisti() {
  document.body.classList.add("vista-finalisti");
  if (!(await aggiornaDati())) return;

  const zona = div("fin-zona");
  const lista = div("fin-lista");
  lista.append(div("fin-titolo", "In gara"));
  const nomi: HTMLElement[] = [];
  for (const s of slots) {
    const gruppo = div("fin-gruppo");
    if (s.cfg.label) gruppo.append(div("fin-label", s.cfg.label));
    for (const nome of s.finalisti.map((r) => r.nome).sort((a, b) => a.localeCompare(b, "it"))) {
      const el = div("fin-nome", perSchermo(nome));
      gruppo.append(el);
      nomi.push(el);
    }
    lista.append(gruppo);
  }
  zona.append(lista);
  tela.append(zona);

  // Un solo corpo per tutti, il più grande che fa stare la lista; i nomi troppo larghi si stringono da soli.
  let corpo = 150;
  const applica = () => {
    lista.style.setProperty("--riga", `${corpo}px`);
    for (const el of nomi) el.style.fontSize = `${corpo}px`;
  };
  applica();
  while (lista.offsetHeight > zona.clientHeight && corpo > 20) {
    corpo -= 2;
    applica();
  }
  for (const el of nomi) {
    if (el.scrollWidth > el.clientWidth) el.style.fontSize = `${Math.floor((corpo * el.clientWidth) / el.scrollWidth)}px`;
  }
}

// ---------- Comandi ----------

const azioni: Record<string, () => void> = { gira, rimescola, ricarica };

document.querySelectorAll<HTMLButtonElement>("[data-azione]").forEach((b) => {
  // Niente focus sul pulsante: la barra spaziatrice resta della ruota.
  b.addEventListener("mousedown", (e) => e.preventDefault());
  b.addEventListener("click", () => azioni[b.dataset.azione!]());
});

// ---------- Avvio ----------

await Promise.all([
  document.fonts.load('600 100px "Barlow Condensed"'),
  document.fonts.load('900 100px "Barlow Condensed"'),
]);

if (params.get("view") === "finalisti") {
  await avviaFinalisti();
} else {
  const perCodice: Record<string, () => void> = { Space: gira, KeyR: rimescola, KeyL: ricarica };
  const perTasto: Record<string, () => void> = { " ": gira, r: rimescola, l: ricarica };
  addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const azione = perCodice[e.code] ?? perTasto[e.key.toLowerCase()];
    if (!azione) return;
    e.preventDefault();
    azione();
  });
  await avviaRuota();
}
