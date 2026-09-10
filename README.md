# random_wheel

Estrae a sorte un nome da una lista e lo mostra in uno stage 9:16, pensato per essere registrato
con uno screen recorder come apertura di un reel Instagram.

Astro statico + TypeScript vanilla + PapaParse. Nessun backend: le liste arrivano da un Google Sheet
pubblicato in CSV, scaricato **nel browser a ogni caricamento** (mai al build), quindi un nome aggiunto
dal telefono è estraibile subito, senza deploy.

## Setup

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # output statico in dist/
```

Node ≥ 22.12.

## Configurazione

### Il foglio — `src/config.ts`

Google Sheets → File → Condividi → **Pubblica sul web** → *Intero documento* → *Valori separati da
virgola (.csv)*. Incolla l'URL completo in `SHEET_BASE`. Il `gid` di ogni scheda lo imposta il preset
(un eventuale `gid` già nell'URL viene sostituito); al fetch si aggiunge sempre `&t=<timestamp>`
contro la cache di Google.

Schema della scheda (intestazioni case-insensitive, colonne extra conservate):

| Colonna       | Uso                                                        |
| ------------- | ---------------------------------------------------------- |
| `nome`        | Obbligatoria. Righe senza nome ignorate.                   |
| `proposto_da` | Mostrato in piccolo sotto il risultato.                    |
| `usato`       | Se valorizzato, la riga esce dal pool.                     |

Nomi duplicati (stesso testo, maiuscole a parte) contano una volta sola.

### I preset — `src/presets.json`

Richiamati con `/?p=<id>`; senza `?p=` (o con un id inesistente) si usa il primo del file.

```json
{
  "paesi": {
    "titolo": "Oggi tocca a",
    "spin_ms": 2000,
    "finalisti": 8,
    "ruote": [
      { "label": "", "gid": "0", "sottotitolo": "proposto_da",
        "escludi_se_pieno": "usato", "enfasi": 2, "no_ripetizioni": false }
    ]
  }
}
```

Più ruote nello stesso preset girano insieme e si fermano nello stesso frame. Nessuna modifica al codice.

| Proprietà ruota    | Effetto                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `label`            | Etichetta sopra la ruota. Vuota = nessun elemento.                   |
| `gid`              | Scheda da cui pescare.                                               |
| `sottotitolo`      | Campo mostrato sotto il risultato, come “proposto da @utente”.       |
| `escludi_se_pieno` | Campo che, se valorizzato, esclude la riga.                          |
| `enfasi`           | `2` dominante, `1` secondario (corpo circa la metà).                 |
| `no_ripetizioni`   | `true` = chi è uscito in questa sessione non può riuscire.           |

## Uso

| Tasto    | Azione                                                     |
| -------- | ---------------------------------------------------------- |
| `spazio` | Gira                                                       |
| `R`      | Rimescola i finalisti (nuovo campione, senza fetch)        |
| `L`      | Ricarica le liste dal foglio                               |

I pulsanti equivalenti stanno fuori dallo stage e spariscono durante il giro. Sullo stage il cursore è nascosto.

Il pannello in alto a sinistra (fuori dall'inquadratura) mostra lo stato: puntino verde = dati live,
ambra = copia in cache perché il foglio non risponde (con il motivo). Mostra anche la dimensione esatta
dello stage in pixel, utile per impostare l'area dello screen recorder.

- `/?p=paesi&view=finalisti`: i nomi in gara su fondo pulito, 9:16, da screenshottare per le storie.

I finalisti restano salvati nel browser finché non premi `R`, così la vista finalisti e la ruota mostrano
sempre gli stessi nomi. Se un finalista esce dal pool (per esempio lo segni `usato`), viene sostituito da un
nome a caso.

## Struttura

```
src/
  config.ts          URL del foglio
  presets.json       i format
  lib/data.ts        fetch + parsing + cache localStorage
  lib/finalisti.ts   campione persistito
  lib/ruota.ts       la ruota SVG — contratto Ruota { setFinalisti, spin(): Promise<Riga> }
  lib/tipografia.ts  autofit del nome
  scripts/app.ts     composizione dello stage e comandi
  styles/global.css  palette, font, layout a 1080×1920 logici
public/fonts/        Barlow Condensed 600 e 900 (subset latin), self-hosted
```

Per sostituire la ruota (per esempio con un rullo verticale) basta un'altra implementazione di `Ruota`.

## Deploy

Netlify o Vercel, zero config: build `npm run build`, cartella `dist`.

## Font

Barlow Condensed © 2017 The Barlow Project Authors (https://github.com/jpt/barlow), licenza
SIL Open Font License 1.1 (https://openfontlicense.org).
