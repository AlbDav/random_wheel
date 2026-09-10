/** Intero uniforme in [0, n), da crypto e senza bias da modulo. */
export function randInt(n: number): number {
  if (n <= 0) throw new RangeError("n deve essere > 0");
  const limite = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limite);
  return buf[0] % n;
}

/** `k` elementi distinti in ordine casuale (Fisher–Yates parziale). */
export function campiona<T>(arr: readonly T[], k: number): T[] {
  const a = arr.slice();
  const n = Math.min(k, a.length);
  for (let i = 0; i < n; i++) {
    const j = i + randInt(a.length - i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
