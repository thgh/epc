# Official Flemish EPC sources

## Formulestructuur (versioned)

| Id | Valid | Source |
| --- | --- | --- |
| `2022` | 2022-01-01 → 2023-12-31 | [EPC 2022 Formulestructuur PDF](https://assets.vlaanderen.be/image/upload/v1659343451/EPC_2022_Formulestructuur_r8m89y.pdf) |
| `2024` | 2024-01-01 → 2026-06-30 | [Documenten type A](https://www.vlaanderen.be/epc-pedia/info-type-a/documenten-voor-de-energiedeskundige-type-a) (Bijlage 18/3, BS 7 dec 2023) |
| `2026-07` | from 2026-07-01 | Same type A page → “Formulestructuur vanaf 1-7-2026” |

Core definition (all versions):

\[
ES = \frac{Q_{\mathrm{prim,tot}}}{A_{\mathrm{bruikbaar}}} \quad [\mathrm{kWh}/(\mathrm{m}^2\cdot\mathrm{jaar})]
\]

Label bands (residential, since 2019): A+ ≤ 0, A ≤ 100, B ≤ 200, C ≤ 300, D ≤ 400, E ≤ 500, F > 500.

## VEKA rekenmotor APIs

Documented on [Test-uw-EPC](https://www.vlaanderen.be/bouwen-wonen-en-energie/energieprestatiecertificaat-epc-bij-overdracht-of-verhuur-van-een-wooneenheid/test-uw-epc-simuleer-of-vergelijk-het-epc-label-van-een-woning):

| API | Role |
| --- | --- |
| **Berekening** | Full input → official engine |
| **BerekenIndicatief** | Simple input + assumptions → full input → engine (powers Test-uw-EPC) |
| **BerekenVenster / BerekenVlak / BerekenVerwarming** | Partial component scores |

Access is not public self-serve. Request via `veka@vlaanderen.be`. Typical integration uses mTLS against `energie-*-secure.api.vlaanderen.be`.

This repo:

1. Implements a **simplified** local engine with fidelity marker `simplified-formulestructuur`.
2. Calls VEKA when `VEKA_EPC_API_URL` (+ optional client cert/key) is set.
3. Diffs PDF ↔ local ↔ API so residual deltas can be reverse-engineered into the local model.

## Certificate lookup (separate from calculation)

MAGDA `Energie.GeefEpc-02.01` and Skryv’s VEKA connector fetch existing certificates by attestnummer/address — useful later for golden fixtures, not for what-if recalculation.
