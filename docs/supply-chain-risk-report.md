# Supply chain risk report — NEXO Lab

**Audited:** 2026-11-06  
**Commit:** `2a71ebe9e676`  
**Scopes:** app web (`package.json`) + desktop (`electron/package.json`)  
**Tooling:** supply-chain-risk-auditor (collect + render)

Artifacts medidos (completos):

- [supply-chain-risk-report-web.md](./supply-chain-risk-report-web.md)
- [supply-chain-risk-report-electron.md](./supply-chain-risk-report-electron.md)
- JSON: `supply-chain-findings-web.json`, `supply-chain-findings-electron.json`

## Summary

| Escopo | Diretas | Advisories diretas | Transitivos com advisory |
|---|---|---|---|
| App web | 64 | 0 | 1 (`minimatch@10.2.6`) |
| Electron | 2 | 1 (`electron@39.8.10`, 12 GHSAs) | 3 (`extract-zip@2.0.1`, `minimatch@10.2.6`, `minimatch@9.0.9`) |

- Produção (runtime do app web): nenhuma advisory conhecida nas versões do lockfile.
- `npm audit --omit=dev` no root: 0 vulnerabilidades; grafo completo (com dev): 7 moderate.
- Nenhum install script flagado nas deps diretas avaliadas.
- `gh` ausente nesta corrida: vários critérios de repositório ficaram unassessable (rate limit).

## Act on first

### 1. Upgrade `electron` 39.8.10

12 advisories. A linha 39 termina em 39.8.10; correções OSV estão em 41.x–45.x.

| Destino | Efeito |
|---|---|
| **≥ 42.11.16** | Limpa as 12 advisories na linha 42 |
| **45.2.3** (latest estável na auditoria) | Limpa na linha atual |

Custo: salto de várias majors, reteste do packaging NSIS, rebuild do instalador.

Advisories (electron 39.8.10):  
`GHSA-2p8c-gr87-2676`, `GHSA-3qxv-5xgr-q7w9`, `GHSA-98mx-cjp9-gchm`, `GHSA-997q-gvvc-jwmx`, `GHSA-9qh4-3jw8-366w`, `GHSA-fw47-9c62-h3vw`, `GHSA-gr2m-v5gq-v685`, `GHSA-h3v5-h239-pg29`, `GHSA-hq2x-r82h-9wj4`, `GHSA-j84w-jfhq-vhvj`, `GHSA-jr5w-w6x2-84p9`, `GHSA-x562-297c-g43g`.

### 2. `extract-zip` 2.0.1 (transitivo do Electron 39)

`GHSA-7pqw-9j4j-h8q3`, `GHSA-jmr9-qjv8-65gv` — sem release patchado no registry. Electron 42+ usa `@electron-internal/extract-zip`. O upgrade do Electron remove esse pacote do lockfile.

### 3. `minimatch` 10.2.6 / 9.0.9 (build-time)

`GHSA-g3hv-75wg-m249` (DoS via globparts). Patch em **11.0.1**.

- Web: via `@typescript-eslint/typescript-estree` (`minimatch@^10.2.2`)
- Electron: via `app-builder-lib`

Até o upstream subir, `overrides` npm com `minimatch@11.0.1` limpa o advisory; validar eslint e electron-builder após o pin.

## Lower urgency

- **`clsx` 2.1.1** — sem push desde 2024-06-10; ~161M downloads/semana; publisher único. Sem troca obrigatória.
- **Publisher concentration** em `class-variance-authority`, `date-fns`, `embla-carousel-react`, `react-hook-form`, `react-resizable-panels`, `sonner`, `vaul` — sinal de monitoramento.
- **Deps diretas sem import em `src/`** (julgamento): vários `@radix-ui/*`, `cmdk`, `vaul`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`. Radix usados de fato: slot, dialog, label, separator, slider, tooltip, toggle (+ `recharts`). Remover não usados reduz o grafo de install.

## Coverage caveats

- Critérios de repositório (archived, maintenance, Scorecard) parcialmente unassessable sem `gh` autenticado.
- Advisories transitivas: só o que o lockfile resolve; demais critérios só em deps diretas.
- Esta auditoria não instala, não builda e não executa código de dependências.
