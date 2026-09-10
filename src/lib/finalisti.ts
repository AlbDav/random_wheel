import { campiona } from "./random";
import type { Riga } from "./types";

const chiave = (presetId: string, ruota: number) => `rw:finalisti:${presetId}:${ruota}`;

/**
 * I nomi disegnati sulla ruota. Il campione è salvato in localStorage, così la vista
 * `?view=finalisti` e la ruota mostrano gli stessi nomi anche tra un caricamento e l'altro.
 * I salvati che non sono più nel pool vengono sostituiti a caso; `rimescola` riparte da zero.
 */
export function finalisti(presetId: string, ruota: number, pool: Riga[], n: number, rimescola = false): Riga[] {
  const perNome = new Map(pool.map((r) => [r.nome, r]));
  let salvati: string[] = [];
  if (!rimescola) {
    try {
      salvati = JSON.parse(localStorage.getItem(chiave(presetId, ruota)) ?? "[]");
    } catch {
      salvati = [];
    }
  }
  const tenuti = [...new Set(salvati)]
    .map((nome) => perNome.get(nome))
    .filter((r): r is Riga => r !== undefined)
    .slice(0, n);
  const resto = pool.filter((r) => !tenuti.includes(r));
  const scelti = [...tenuti, ...campiona(resto, n - tenuti.length)];
  try {
    localStorage.setItem(chiave(presetId, ruota), JSON.stringify(scelti.map((r) => r.nome)));
  } catch {
    // Senza storage il campione vale solo per questa pagina.
  }
  return scelti;
}
