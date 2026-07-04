# 12-Factor Compliance

How this platform maps to the [Twelve-Factor App](https://12factor.net/) methodology.

| # | Factor | How it is applied here |
|---|--------|------------------------|
| I | **Codebase** | One monorepo tracked in Git; each service has one codebase, many deploys (dev via `cds watch`, containers via Compose, cloud via the same image). |
| II | **Dependencies** | Every service declares deps in its own `package.json` and isolates them (`npm install` in its container). No reliance on system-wide packages. |
| III | **Config** | All config is in the environment — DB credentials, downstream service URLs, and system credentials come from `CDS_REQUIRES_DB_CREDENTIALS_*`, `*_SERVICE_URL`, `SYSTEM_*` env vars. See each service's `.env.example`. No secrets in code. |
| IV | **Backing services** | Postgres and the downstream microservices are attached resources referenced by URL/credentials. Swapping a DB or pointing to a remote service is a config change only. |
| V | **Build, release, run** | `Dockerfile` = build. `entrypoint.sh` runs the release step (`cds deploy`, schema + seed) then the run step (`cds-serve`) as distinct phases. |
| VI | **Processes** | Services are stateless; no session state is kept in memory. All persistent state lives in Postgres. Any instance can serve any request. |
| VII | **Port binding** | Each service self-hosts HTTP and binds `$PORT` (4004). The gateway binds 8080. No injected web server required. |
| VIII | **Concurrency** | Stateless processes scale horizontally: `docker compose up --scale invoice-service=3`. Work is handled by adding processes, not threads-in-one-box. |
| IX | **Disposability** | `dumb-init` gives correct signal handling; CAP shuts down gracefully on SIGTERM. Fast startup; `/health` endpoints back orchestrator probes. |
| X | **Dev/prod parity** | Same image and Postgres everywhere. Local dev uses in-memory SQLite only for the fast `cds watch`/test loop; the container path uses Postgres — the deployed path. |
| XI | **Logs** | Every process writes to stdout/stderr (CAP logger, nginx `access_log /dev/stdout`). No log files are managed by the app; the platform aggregates the streams. |
| XII | **Admin processes** | One-off tasks run as one-off processes against the same code/config: `cds deploy` (migrations/seed), `scripts/gen-seed.js` (regenerate seed), `npm test`. |

## Notes on the auth model

- Local/dev uses CAP **mocked auth** with fixed users (`admin`, `manager`, `approver`, `viewer`, `system`).
- Service-to-service calls authenticate as the shared **`system`** principal (scope `internal`) via Basic auth, credentials injected by env (`SYSTEM_USER` / `SYSTEM_PASSWORD`). In production this is replaced by XSUAA/IAS **client-credentials** OAuth tokens — a config/binding change, no code change (factor IV).
- The nginx gateway injects an `admin` Authorization header for browser calls that omit one, purely for a zero-login local demo. In production the gateway is the SAP approuter performing real XSUAA login.
