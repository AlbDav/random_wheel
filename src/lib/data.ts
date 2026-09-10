import Papa from "papaparse";
import { FETCH_TIMEOUT_MS, SHEET_BASE } from "../config";
import type { Riga, RuotaConfig } from "./types";

export interface Lista {
  gid: string;
  /** Tutte le righe con `nome` valorizzato, prima dei filtri del preset. */
  righe: Riga[];
  fonte: "rete" | "cache";
  /** Momento in cui il CSV è stato scaricato. */
  ts: number;
  /** Perché il fetch è fallito, quando si sta usando la cache. */
  errore?: string;
}

interface VoceCache {
  ts: number;
  csv: string;
}

const chiaveCache = (gid: string) => `rw:csv:${SHEET_BASE}#${gid}`;

function urlScheda(gid: string): string {
  const u = new URL(SHEET_BASE);
  u.searchParams.set("gid", gid);
  // Google mette in cache in modo aggressivo: senza questo si vedono dati vecchi.
  u.searchParams.set("t", String(Date.now()));
  return u.toString();
}

async function scaricaCsv(gid: string): Promise<string> {
  if (SHEET_BASE.includes("<PUB_ID>")) throw new Error("SHEET_BASE non configurato in src/config.ts");

  let r: Response;
  try {
    r = await fetch(urlScheda(gid), { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e) {
    const timeout = e instanceof DOMException && e.name === "TimeoutError";
    throw new Error(timeout ? `il foglio non risponde da ${FETCH_TIMEOUT_MS / 1000}s` : "rete non raggiungibile");
  }
  if (!r.ok) {
    const motivo = [400, 404, 410].includes(r.status) ? "foglio non pubblicato o gid inesistente" : `HTTP ${r.status}`;
    throw new Error(`${motivo} (gid ${gid})`);
  }
  const tipo = r.headers.get("content-type") ?? "";
  if (!tipo.includes("text/csv")) throw new Error(`il foglio non risponde in CSV (${tipo || "tipo ignoto"}, gid ${gid})`);
  return r.text();
}

/** CSV → righe. Intestazioni normalizzate (trim + minuscolo), colonne extra conservate, righe senza `nome` scartate. */
export function parseCsv(csv: string): Riga[] {
  const { data } = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => v.trim(),
  });
  const righe: Riga[] = [];
  for (const grezza of data) {
    const riga: Record<string, string> = {};
    for (const [k, v] of Object.entries(grezza)) if (k && typeof v === "string") riga[k] = v;
    if (riga.nome) righe.push(riga as Riga);
  }
  return righe;
}

function leggiCache(gid: string): VoceCache | null {
  try {
    const s = localStorage.getItem(chiaveCache(gid));
    return s ? (JSON.parse(s) as VoceCache) : null;
  } catch {
    return null;
  }
}

function scriviCache(gid: string, voce: VoceCache) {
  try {
    localStorage.setItem(chiaveCache(gid), JSON.stringify(voce));
  } catch {
    // Storage pieno o bloccato: si lavora senza cache.
  }
}

/** Scarica una scheda; se fallisce usa l'ultima copia salvata. Senza nemmeno quella, errore con il motivo. */
export async function caricaLista(gid: string): Promise<Lista> {
  try {
    const csv = await scaricaCsv(gid);
    const ts = Date.now();
    scriviCache(gid, { ts, csv });
    return { gid, righe: parseCsv(csv), fonte: "rete", ts };
  } catch (e) {
    const errore = e instanceof Error ? e.message : String(e);
    const cache = leggiCache(gid);
    if (!cache) throw new Error(`${errore}, e non c'è una copia in cache`);
    return { gid, righe: parseCsv(cache.csv), fonte: "cache", ts: cache.ts, errore };
  }
}

/** Una lista per ruota, in parallelo. Ruote sulla stessa scheda condividono il fetch. */
export function caricaListe(ruote: RuotaConfig[]): Promise<Lista[]> {
  const perGid = new Map<string, Promise<Lista>>();
  for (const { gid } of ruote) if (!perGid.has(gid)) perGid.set(gid, caricaLista(gid));
  return Promise.all(ruote.map(({ gid }) => perGid.get(gid)!));
}

/** Righe estraibili per una ruota: senza `escludi_se_pieno` valorizzato, un solo esemplare per nome. */
export function pool(lista: Lista, ruota: RuotaConfig): Riga[] {
  const campo = ruota.escludi_se_pieno;
  const visti = new Set<string>();
  return lista.righe.filter((r) => {
    if (campo && r[campo]) return false;
    const chiave = r.nome.toLocaleLowerCase("it");
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });
}
