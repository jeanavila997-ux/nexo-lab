# Supply Chain Risk Report — `electron`

**Scanned:** `C:\Users\Jean\nexo-lab\electron`  
**Manifests read:** `package.json`, `package-lock.json`  
**Scanned at:** 2026-11-06T03:44:44+00:00  
**Direct dependencies:** 2 (npm 2)

## Summary

- **1 of 2 dependencies have known advisories.** See the findings below.
- **3 transitive packages carry known advisories** at the locked versions — see Transitive advisories.
- 1 of 2 dependencies carry at least one finding, 0 of which reach production.
- Weakest coverage: **Repository archived**, established for 0 of 2; the Coverage section lists every criterion.

## Production dependencies

Every direct dependency is declared as a development dependency, so none
of them ships in the built artifact.

## Findings

### Build-time only

Declared as development dependencies. A compromise here reaches build and CI hosts rather than users of the shipped artifact.

| Dependency | Version | Weekly downloads | Findings |
|---|---|---|---|
| `electron` | 39.8.10 | 12,319,954/wk | 12 advisories affect the installed 39.8.10 |

## Upstream repository and CI hygiene — OpenSSF Scorecard

These criteria describe each dependency's own repository, not the audited
project. Remediation, where any exists, is upstream.

No criterion in this tier was assessable for any dependency.

## Transitive advisories

3 packages of the 270 registry-verified packages beyond the direct set (resolved by `package-lock.json`) carry known advisories at the locked versions. Only advisories were checked at this depth.

| Package | Version | Reaches | Advisories |
|---|---|---|---|
| `extract-zip` (npm) | 2.0.1 | build-time only | GHSA-7pqw-9j4j-h8q3, GHSA-jmr9-qjv8-65gv |
| `minimatch` (npm) | 10.2.6 | build-time only | GHSA-g3hv-75wg-m249 |
| `minimatch` (npm) | 9.0.9 | build-time only | GHSA-g3hv-75wg-m249 |

## Informational

Measured, not flagged.

- **Publish provenance**: 1 of 2 publish with build provenance.
  Without: `electron`
- **Security policy published**: not determinable for any dependency in this project.
- **Download volume**: established for 2 of 2; median 12,319,954/week. Lowest: `electron-builder` (7,760,937/wk), `electron` (12,319,954/wk).

## Coverage

What was and was not measured, per criterion.

| Criterion | Tier | Assessed | Flagged | Not assessable |
|---|---|---|---|---|
| Known advisories | A | 2/2 | 1 | 0 |
| Deprecated or yanked | A | 2/2 | 0 | 0 |
| Repository archived | A | 0/2 | 0 | 2 |
| Maintenance activity | A | 0/2 | 0 | 2 |
| Publisher concentration | B | 1/2 | 0 | 1 |
| Install-time script execution | B | 2/2 | 0 | 0 |
| Dangerous CI workflow | scorecard | 0/2 | 0 | 2 |
| CI token permissions | scorecard | 0/2 | 0 | 2 |
| Checked-in binaries | scorecard | 0/2 | 0 | 2 |
| Changes reviewed by a second person | scorecard | 0/2 | 0 | 2 |
| Publish provenance | info | 2/2 | 0 | 0 |
| Security policy published | info | 0/2 | 0 | 2 |
| Download volume | info | 2/2 | 0 | 0 |

## Not assessable

**Repository archived**

- 2 dependencies — the GitHub API rate-limited this audit: `electron`, `electron-builder`

**Checked-in binaries**

- 2 dependencies — the GitHub API rate-limited this audit: `electron`, `electron-builder`

**Changes reviewed by a second person**

- 2 dependencies — the GitHub API rate-limited this audit: `electron`, `electron-builder`

**Dangerous CI workflow**

- 2 dependencies — the GitHub API rate-limited this audit: `electron`, `electron-builder`

**Publisher concentration**

- 1 dependency — publishes from CI with provenance, so the effective publisher set is whoever can merge to the release branch — not externally observable: `electron-builder`

**Security policy published**

- 2 dependencies — the GitHub API rate-limited this audit: `electron`, `electron-builder`

**Maintenance activity**

- 2 dependencies — the GitHub API rate-limited this audit: `electron`, `electron-builder`

**CI token permissions**

- 2 dependencies — the GitHub API rate-limited this audit: `electron`, `electron-builder`

## Method and caveats

- cache directory ownership was not verified: os.getuid is POSIX-only, so a cache at C:\Users\Jean\AppData\Local\Temp\supply-chain-risk-auditor-cache owned by another user would not be detected on this platform. Keep the cache under your own user profile, or pass --cache with a private path.
- gh is not authenticated. GitHub allows 60 requests/hour unauthenticated against 5000 authenticated, so repository signals may be unassessable.
- Optional tooling detected: npm. Not installed, so not used: bundler-audit, cargo-audit, osv-scanner, pip-audit.
- Every criterion except advisories applies to direct dependencies only. The 270 registry-verified packages resolved by package-lock.json were checked for known advisories at their locked versions, and for nothing else.
- HTTP sources: 6 fetched, 2 served from cache (oldest 0.0h old), 0 refetched as stale, 0 unavailable offline, 2 errors.
