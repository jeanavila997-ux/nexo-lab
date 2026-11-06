# Supply Chain Risk Report — `nexo-lab`

**Scanned:** `C:\Users\Jean\nexo-lab`  
**Commit:** `2a71ebe9e676`  
**Manifests read:** `package.json`, `package-lock.json`  
**Scanned at:** 2026-11-06T03:44:17+00:00  
**Direct dependencies:** 64 (npm 64)

## Summary

- **No known advisory affects any of the 64 direct dependencies**, checked at the versions this project resolves.
- **1 transitive package carries known advisories** at the locked versions — see Transitive advisories.
- 12 of 64 dependencies carry at least one finding, 8 of which reach production.
- Weakest coverage: **Publisher concentration**, established for 20 of 64; the Coverage section lists every criterion.

## Production dependencies

46 dependencies are declared as runtime dependencies and ship in the built artifact. Advisory status is given for every one, clean or not.

| Dependency | Version | Advisories | Other findings |
|---|---|---|---|
| `@hookform/resolvers` | 5.9.2 | none known | — |
| `@radix-ui/react-accordion` | 1.3.1 | none known | — |
| `@radix-ui/react-alert-dialog` | 1.2.1 | none known | — |
| `@radix-ui/react-aspect-ratio` | 1.2.0 | none known | — |
| `@radix-ui/react-avatar` | 1.3.1 | none known | — |
| `@radix-ui/react-checkbox` | 1.4.1 | none known | — |
| `@radix-ui/react-collapsible` | 1.2.1 | none known | — |
| `@radix-ui/react-context-menu` | 2.4.1 | none known | — |
| `@radix-ui/react-dialog` | 1.3.1 | none known | — |
| `@radix-ui/react-dropdown-menu` | 2.2.1 | none known | — |
| `@radix-ui/react-hover-card` | 1.2.1 | none known | — |
| `@radix-ui/react-label` | 2.1.17 | none known | — |
| `@radix-ui/react-menubar` | 1.2.1 | none known | — |
| `@radix-ui/react-navigation-menu` | 1.4.1 | none known | — |
| `@radix-ui/react-popover` | 1.3.1 | none known | — |
| `@radix-ui/react-progress` | 1.2.1 | none known | — |
| `@radix-ui/react-radio-group` | 1.5.1 | none known | — |
| `@radix-ui/react-scroll-area` | 1.4.0 | none known | — |
| `@radix-ui/react-select` | 2.4.1 | none known | — |
| `@radix-ui/react-separator` | 1.2.0 | none known | — |
| `@radix-ui/react-slider` | 1.6.1 | none known | — |
| `@radix-ui/react-slot` | 1.5.0 | none known | — |
| `@radix-ui/react-switch` | 1.4.1 | none known | — |
| `@radix-ui/react-tabs` | 1.2.1 | none known | — |
| `@radix-ui/react-toggle` | 1.2.1 | none known | — |
| `@radix-ui/react-toggle-group` | 1.2.1 | none known | — |
| `@radix-ui/react-tooltip` | 1.4.1 | none known | — |
| `class-variance-authority` | 0.7.1 | none known | Publisher concentration |
| `clsx` | 2.1.1 | none known | Publisher concentration, Maintenance activity |
| `cmdk` | 1.1.1 | none known | — |
| `date-fns` | 4.4.0 | none known | Publisher concentration |
| `embla-carousel-react` | 8.6.0 | none known | Publisher concentration |
| `input-otp` | 1.5.0 | none known | — |
| `lucide-react` | 0.562.0 | none known | — |
| `next-themes` | 0.4.6 | none known | — |
| `react` | 19.3.1 | none known | — |
| `react-day-picker` | 9.14.0 | none known | — |
| `react-dom` | 19.3.1 | none known | — |
| `react-hook-form` | 7.91.0 | none known | Publisher concentration |
| `react-resizable-panels` | 4.14.8 | none known | Publisher concentration |
| `react-router` | 7.18.4 | none known | — |
| `recharts` | 2.15.4 | none known | — |
| `sonner` | 2.0.8 | none known | Publisher concentration |
| `tailwind-merge` | 3.7.0 | none known | — |
| `vaul` | 1.1.2 | none known | Publisher concentration |
| `zod` | 4.6.7 | none known | — |

## Findings

### Reaches production

| Dependency | Version | Weekly downloads | Findings |
|---|---|---|---|
| `clsx` | 2.1.1 | 161,442,938/wk | no push in 2 years (last 2024-06-10); single human publisher (lukeed) of 1 listed |
| `class-variance-authority` | 0.7.1 | 79,311,240/wk | single human publisher (joebell93) of 1 listed |
| `date-fns` | 4.4.0 | 117,779,232/wk | single human publisher (kossnocorp) of 1 listed |
| `embla-carousel-react` | 8.6.0 | 26,119,136/wk | single human publisher (davidjerleke) of 1 listed |
| `react-hook-form` | 7.91.0 | 60,582,639/wk | single human publisher (bluebill1049) of 1 listed |
| `react-resizable-panels` | 4.14.8 | 30,086,905/wk | single human publisher (brianvaughn) of 1 listed |
| `sonner` | 2.0.8 | 55,525,762/wk | single human publisher (emilkowalski) of 1 listed |
| `vaul` | 1.1.2 | 31,283,605/wk | single human publisher (emilkowalski) of 1 listed |

### Build-time only

Declared as development dependencies. A compromise here reaches build and CI hosts rather than users of the shipped artifact.

| Dependency | Version | Weekly downloads | Findings |
|---|---|---|---|
| `@types/node` | 24.19.2 | 622,282,506/wk | single human publisher (types) of 1 listed |
| `@types/react` | 19.3.0 | 222,034,731/wk | single human publisher (types) of 1 listed |
| `@types/react-dom` | 19.3.0 | 187,559,038/wk | single human publisher (types) of 1 listed |
| `tailwindcss-animate` | 1.0.7 | 23,341,597/wk | single human publisher (thejameskyle) of 1 listed |

## Upstream repository and CI hygiene — OpenSSF Scorecard

These criteria describe each dependency's own repository, not the audited
project. Remediation, where any exists, is upstream.

No dependency was flagged on these criteria.

## Transitive advisories

1 package of the 453 registry-verified packages beyond the direct set (resolved by `package-lock.json`) carries known advisories at the locked versions. Only advisories were checked at this depth.

| Package | Version | Reaches | Advisories |
|---|---|---|---|
| `minimatch` (npm) | 10.2.6 | build-time only | GHSA-g3hv-75wg-m249 |

## Informational

Measured, not flagged.

- **CI token permissions**: median 0/10 across 30 scored dependencies; 29 score below 6. Not flagged — this measures whether CI workflows declare least-privilege tokens, which tracks project maturity rather than the likelihood of malicious code being published.
- **Changes reviewed by a second person**: median 3/10 across 30 scored dependencies; 29 score below 6. Not flagged — this measures the share of recent commits reviewed by a second person, which is low for most small single-maintainer projects and largely restates publisher concentration.
- **Publish provenance**: 43 of 64 publish with build provenance.
  Without: `@eslint/js`, `@hookform/resolvers`, `@types/node`, `@types/react`, `@types/react-dom`, `class-variance-authority`, `clsx`, `cmdk`, `date-fns`, `embla-carousel-react` and 11 more
- **Security policy published**: 2 of 34 publish a security policy.
  Without: `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card` and 22 more
- **Download volume**: established for 64 of 64; median 62,979,312/week. Lowest: `kimi-plugin-inspect-react` (66,928/wk), `tailwindcss-animate` (23,341,597/wk), `input-otp` (26,023,869/wk).

## Coverage

What was and was not measured, per criterion.

| Criterion | Tier | Assessed | Flagged | Not assessable |
|---|---|---|---|---|
| Known advisories | A | 64/64 | 0 | 0 |
| Deprecated or yanked | A | 64/64 | 0 | 0 |
| Repository archived | A | 34/64 | 0 | 30 |
| Maintenance activity | A | 34/64 | 1 | 30 |
| Publisher concentration | B | 20/64 | 12 | 44 |
| Install-time script execution | B | 64/64 | 0 | 0 |
| Dangerous CI workflow | scorecard | 30/64 | 0 | 34 |
| CI token permissions | scorecard | 30/64 | 0 | 34 |
| Checked-in binaries | scorecard | 30/64 | 0 | 34 |
| Changes reviewed by a second person | scorecard | 30/64 | 0 | 34 |
| Publish provenance | info | 64/64 | 0 | 0 |
| Security policy published | info | 34/64 | 0 | 30 |
| Download volume | info | 64/64 | 0 | 0 |

## Not assessable

**Repository archived**

- 28 dependencies — the GitHub API rate-limited this audit: `@eslint/js`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `autoprefixer` and 22 more
- 2 dependencies — no source repository could be resolved for this package: `kimi-plugin-inspect-react`, `tailwindcss-animate`

**Checked-in binaries**

- 28 dependencies — the GitHub API rate-limited this audit: `@eslint/js`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `autoprefixer` and 22 more
- 4 dependencies — OpenSSF Scorecard has no report for this repository: `class-variance-authority`, `cmdk`, `embla-carousel-react`, `input-otp`
- 2 dependencies — no source repository to score: `kimi-plugin-inspect-react`, `tailwindcss-animate`

**Changes reviewed by a second person**

- 28 dependencies — the GitHub API rate-limited this audit: `@eslint/js`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `autoprefixer` and 22 more
- 4 dependencies — OpenSSF Scorecard has no report for this repository: `class-variance-authority`, `cmdk`, `embla-carousel-react`, `input-otp`
- 2 dependencies — no source repository to score: `kimi-plugin-inspect-react`, `tailwindcss-animate`

**Dangerous CI workflow**

- 28 dependencies — the GitHub API rate-limited this audit: `@eslint/js`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `autoprefixer` and 22 more
- 4 dependencies — OpenSSF Scorecard has no report for this repository: `class-variance-authority`, `cmdk`, `embla-carousel-react`, `input-otp`
- 2 dependencies — no source repository to score: `kimi-plugin-inspect-react`, `tailwindcss-animate`

**Publisher concentration**

- 43 dependencies — publishes from CI with provenance, so the effective publisher set is whoever can merge to the release branch — not externally observable: `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible` and 37 more
- 1 dependency — every listed maintainer looks automated; the human population is unknown: `eslint-plugin-react-hooks`

**Security policy published**

- 28 dependencies — the GitHub API rate-limited this audit: `@eslint/js`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `autoprefixer` and 22 more
- 2 dependencies — no source repository could be resolved for this package: `kimi-plugin-inspect-react`, `tailwindcss-animate`

**Maintenance activity**

- 28 dependencies — the GitHub API rate-limited this audit: `@eslint/js`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `autoprefixer` and 22 more
- 2 dependencies — no source repository could be resolved for this package: `kimi-plugin-inspect-react`, `tailwindcss-animate`

**CI token permissions**

- 28 dependencies — the GitHub API rate-limited this audit: `@eslint/js`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `autoprefixer` and 22 more
- 4 dependencies — OpenSSF Scorecard has no report for this repository: `class-variance-authority`, `cmdk`, `embla-carousel-react`, `input-otp`
- 2 dependencies — no source repository to score: `kimi-plugin-inspect-react`, `tailwindcss-animate`

## Method and caveats

- cache directory ownership was not verified: os.getuid is POSIX-only, so a cache at C:\Users\Jean\AppData\Local\Temp\supply-chain-risk-auditor-cache owned by another user would not be detected on this platform. Keep the cache under your own user profile, or pass --cache with a private path.
- gh is not authenticated. GitHub allows 60 requests/hour unauthenticated against 5000 authenticated, so repository signals may be unassessable.
- Repository-level criteria (archived, maintenance activity, security policy, and the Scorecard checks) describe the source repository rather than the package. 62 dependencies resolve to 33 distinct repositories, so one repository can appear as several findings. Shared: github.com/DefinitelyTyped/DefinitelyTyped, github.com/eslint/eslint, github.com/radix-ui/primitives, github.com/react/react
- Optional tooling detected: npm. Not installed, so not used: bundler-audit, cargo-audit, osv-scanner, pip-audit.
- Every criterion except advisories applies to direct dependencies only. The 453 registry-verified packages resolved by package-lock.json were checked for known advisories at their locked versions, and for nothing else.
- HTTP sources: 148 fetched, 239 served from cache (oldest 0.1h old), 0 refetched as stale, 0 unavailable offline, 28 errors.
