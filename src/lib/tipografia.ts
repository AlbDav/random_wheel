/** Come un nome va a schermo: maiuscolo, apostrofo tipografico. */
export const perSchermo = (s: string) => s.replace(/'/g, "’").toLocaleUpperCase("it");

/**
 * Il corpo più grande (px interi, tra `min` e `max`) con cui il testo di `el` sta nel box
 * del genitore, su al massimo `righe` righe e senza spezzare le parole.
 * `el` deve essere un blocco largo quanto il genitore. Lavora in px logici: la scala dello stage non conta.
 */
export function adatta(el: HTMLElement, max: number, min: number, righe: number): number {
  const box = el.parentElement!;
  el.style.fontSize = "100px";
  const interlinea = parseFloat(getComputedStyle(el).lineHeight) / 100;

  const sta = (px: number) => {
    el.style.fontSize = `${px}px`;
    const h = el.offsetHeight;
    return el.scrollWidth <= box.clientWidth && h <= box.clientHeight && h <= px * interlinea * righe + 1;
  };

  let lo = min;
  let hi = max;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (sta(mid)) lo = mid;
    else hi = mid - 1;
  }
  el.style.fontSize = `${lo}px`;
  return lo;
}
