/** Una riga della scheda. `nome` è sempre presente; le altre colonne sono conservate così come sono. */
export type Riga = { nome: string } & Record<string, string>;

export interface RuotaConfig {
  /** Etichetta sopra la ruota. Vuota = nessun elemento. */
  label: string;
  /** Scheda del foglio da cui pescare. */
  gid: string;
  /** Campo della riga mostrato in piccolo sotto il risultato. */
  sottotitolo?: string;
  /** Campo che, se valorizzato, esclude la riga dal pool. */
  escludi_se_pieno?: string;
  /** 2 = dominante, 1 = secondario. */
  enfasi: 1 | 2;
  /** Se true, un nome già uscito nella sessione non può riuscire. */
  no_ripetizioni?: boolean;
}

export interface Preset {
  titolo: string;
  spin_ms?: number;
  finalisti: number;
  ruote: RuotaConfig[];
}
