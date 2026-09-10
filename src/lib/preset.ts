import presets from "../presets.json";
import type { Preset } from "./types";

const tutti = presets as Record<string, Preset>;

/** Preset da `?p=`; se manca o non esiste, il primo del file. */
export function leggiPreset(params: URLSearchParams): { id: string; preset: Preset } {
  const richiesto = params.get("p");
  const id = richiesto && Object.hasOwn(tutti, richiesto) ? richiesto : Object.keys(tutti)[0];
  return { id, preset: tutti[id] };
}
