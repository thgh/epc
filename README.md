# EPC playground

Upload a Flemish residential EPC PDF, tweak the numbers, and compare results against **versioned official formulestructuur** rules — and optionally the **VEKA rekenmotor APIs**.

Stack: **Docker · Bun · React · Tailwind** (no database, no Vite).

## Run

```sh
bun install
bun run dev
# → http://localhost:26130
```

Docker:

```sh
docker compose up --build
# → http://localhost:26130
```

## What it does

1. **Parse** an EPC PDF (text extraction → energiescore, label, area, volume, …).
2. **Play** with envelope / installation inputs; local engine recomputes score + label.
3. **Pin** a formulestructuur version (`2022` / `2024` / `2026-07`).
4. **Diff** PDF ↔ local ↔ VEKA API to verify identity and reverse-engineer gaps.

The local engine is intentionally marked `simplified-formulestructuur`: structure follows the official docs (primary energy / usable floor area → label), but it is not a full port of the 100-page formulestructuur. Use API diffs to close gaps.

## VEKA API (optional)

Request access: `veka@vlaanderen.be`  
See [docs/official-sources.md](docs/official-sources.md).

```sh
cp .env.example .env
# VEKA_EPC_API_URL=https://energie-dev-secure.api.vlaanderen.be
# VEKA_EPC_CLIENT_CERT=...
# VEKA_EPC_CLIENT_KEY=...
```

In the UI, enable **Vergelijk** (Berekening or BerekenIndicatief). Payload field names in `calc/veka-api.ts` are placeholders until real OpenAPI/docs arrive — adjust there and lock with fixtures.

## Tests

```sh
bun test
```

## Repo

https://github.com/thgh/epc
