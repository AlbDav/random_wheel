import { randInt } from "./random";
import { perSchermo } from "./tipografia";
import type { Riga } from "./types";

/** Il contratto della ruota: qualsiasi implementazione (spicchi, rullo…) deve rispettarlo. */
export interface Ruota {
  readonly el: HTMLElement;
  /** Ridisegna con questi nomi. `el` deve essere già nel documento (serve a misurare il testo). */
  setFinalisti(righe: Riga[]): void;
  /** Gira per `durataMs` e si risolve nell'istante dell'arresto con la riga sotto il puntatore. */
  spin(durataMs: number): Promise<Riga>;
}

const NS = "http://www.w3.org/2000/svg";
const R = 500; // raggio, in unità del viewBox
const MOZZO = 62;
const MARGINE_BORDO = 46; // dal bordo all'inizio del testo
const MARGINE_MOZZO = 24;
const CORPO_MAX = 58;
// Forte decelerazione ma velocità finale non nulla: l'arresto cade in un frame preciso,
// senza un lungo strisciare impercettibile prima che compaia il nome.
const EASING = "cubic-bezier(0.2, 0.62, 0.45, 0.97)";

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** Punto sul cerchio: angolo in gradi, 0 = ore 12, senso orario. */
function punto(gradi: number, r: number): string {
  const t = (gradi * Math.PI) / 180;
  return `${(r * Math.sin(t)).toFixed(2)} ${(-r * Math.cos(t)).toFixed(2)}`;
}

export function creaRuota(label: string): Ruota {
  const el = document.createElement("div");
  el.className = "ruota";
  if (label) {
    const l = document.createElement("div");
    l.className = "ruota-label";
    l.textContent = label;
    el.append(l);
  }
  const corpo = document.createElement("div");
  corpo.className = "ruota-corpo";
  const disco = svg("svg", { viewBox: `${-R} ${-R} ${2 * R} ${2 * R}`, class: "ruota-disco" });
  const puntatore = svg("svg", { viewBox: "0 0 100 110", class: "ruota-puntatore" });
  puntatore.append(svg("path", { d: "M0 0H100L50 110Z" }));
  corpo.append(disco, puntatore);
  el.append(corpo);

  let righe: Riga[] = [];
  let rotazione = 0;

  function disegna() {
    disco.replaceChildren();
    const n = righe.length;
    const passo = 360 / n;
    disco.append(svg("circle", { r: R, class: "spicchio-chiaro" }));

    const testi: SVGTextElement[] = [];
    righe.forEach((riga, i) => {
      const scuro = i % 2 === 0;
      const centro = i * passo;
      if (n === 1) disco.append(svg("circle", { r: R, class: "spicchio-scuro" }));
      else if (scuro) {
        const d = `M0 0L${punto(centro - passo / 2, R)}A${R} ${R} 0 ${passo > 180 ? 1 : 0} 1 ${punto(centro + passo / 2, R)}Z`;
        disco.append(svg("path", { d, class: "spicchio-scuro" }));
      }
      // Il testo corre dal mozzo verso il bordo, allineato alla fine.
      const t = svg("text", {
        x: R - MARGINE_BORDO,
        dy: "0.35em",
        "text-anchor": "end",
        transform: `rotate(${centro - 90})`,
        class: scuro ? "testo-su-scuro" : "testo-su-chiaro",
      });
      t.textContent = perSchermo(riga.nome);
      disco.append(t);
      testi.push(t);
    });

    disco.append(svg("circle", { r: R - 8, class: "anello" }));
    disco.append(svg("circle", { r: MOZZO, class: "mozzo" }));
    disco.append(svg("circle", { r: 14, class: "rivetto" }));

    // Corpo per spicchio: il più grande che sta tra mozzo e bordo e nella larghezza dello spicchio.
    const lunghezza = R - MARGINE_BORDO - MOZZO - MARGINE_MOZZO;
    const tetto = Math.min(CORPO_MAX, 0.66 * R * Math.sin(((Math.min(passo, 180) / 2) * Math.PI) / 180));
    for (const t of testi) {
      t.setAttribute("font-size", "100");
      const l100 = t.getComputedTextLength() || (t.textContent?.length ?? 1) * 50;
      t.setAttribute("font-size", Math.min(tetto, (lunghezza / l100) * 100).toFixed(1));
    }
  }

  return {
    el,
    setFinalisti(nuove) {
      righe = nuove.slice();
      disegna();
    },
    async spin(durataMs) {
      const n = righe.length;
      if (!n) throw new Error("ruota senza finalisti");
      const k = randInt(n);
      const passo = 360 / n;
      // Mai esattamente sul confine tra due spicchi, mai sempre al centro.
      const scarto = (Math.random() - 0.5) * 0.7 * passo;
      const giri = Math.max(2, Math.round(durataMs / 500));
      const resto = (((-k * passo + scarto - rotazione) % 360) + 360) % 360;
      const arrivo = rotazione + giri * 360 + resto;

      const anim = disco.animate([{ transform: `rotate(${rotazione}deg)` }, { transform: `rotate(${arrivo}deg)` }], {
        duration: durataMs,
        easing: EASING,
        fill: "forwards",
      });
      await anim.finished;
      rotazione = arrivo % 360;
      disco.style.transform = `rotate(${rotazione}deg)`;
      anim.cancel();
      return righe[k];
    },
  };
}
