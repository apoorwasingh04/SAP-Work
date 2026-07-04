# Vendor Invoice Management — Microservices Platform

A 12-factor, Docker-first rebuild of the Enterprise Vendor Invoice Management System,
decomposed into independent **SAP CAP** domain microservices backed by **PostgreSQL**,
fronted by a **Fiori Elements** UI behind an **nginx gateway**.

> Full 12-factor mapping: [docs/12-FACTOR.md](docs/12-FACTOR.md) ·
> Architecture & service boundaries: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Services

| Service | Domain | Port | Database |
|---|---|---|---|
| `vendor-service` | Vendor master | 4004 | vendordb |
| `invoice-service` | Invoices, line items, attachments | 4004 | invoicedb |
| `approval-service` | Approval workflow + audit trail | 4004 | approvaldb |
| `integration-service` | S/4HANA Business Partner sync | 4004 | integrationdb |
| `gateway` | nginx: serves the UI + proxies the APIs | 8080 | — |

Each service is an independent, stateless CAP app with its own Postgres database,
its own `Dockerfile`, its own tests, and config supplied entirely via environment.

## Quick start (Docker)

Requires Docker Desktop (Compose v2).

```bash
cd vendor-invoice-platform
docker compose up --build -d      # or: make up
```

Then open **http://localhost:8080** — the Fiori invoice list (seeded with 20 invoices).

API endpoints through the gateway:

```
GET  http://localhost:8080/vendor/Vendors
GET  http://localhost:8080/invoice/Invoices
GET  http://localhost:8080/approval/ApprovalHistory
POST http://localhost:8080/integration/syncVendorsFromS4
```

Browser calls default to the `admin` user (see gateway note in
[docs/12-FACTOR.md](docs/12-FACTOR.md)). To call as another role, send Basic auth,
e.g. `-u approver:approver`.

### Example: full workflow via curl

```bash
BASE=http://localhost:8080

# 1. sync vendors from S/4HANA (mock data in dev)
curl -s -X POST $BASE/integration/syncVendorsFromS4 | jq

# 2. list draft invoices
curl -s "$BASE/invoice/Invoices?\$filter=status eq 'DRAFT'" | jq '.value[].invoiceNumber'

# 3. submit one for approval (manager)
INV=<invoice-guid>
curl -s -u manager:manager -X POST $BASE/approval/submitForApproval \
  -H 'content-type: application/json' -d "{\"invoiceID\":\"$INV\"}" | jq

# 4. approve it (approver — cannot be the submitter)
curl -s -u approver:approver -X POST $BASE/approval/approveInvoice \
  -H 'content-type: application/json' -d "{\"invoiceID\":\"$INV\",\"comments\":\"ok\"}" | jq
```

## Scaling (12-factor VIII)

```bash
docker compose up -d --scale invoice-service=3
```

## Tests

Backend services use `cds.test` against in-memory SQLite; cross-service HTTP is mocked,
so every suite is a true unit test with no other service running. The frontend has a
Jest unit test for the formatter plus an OPA5 journey template.

```bash
make test            # all services + frontend  (needs Node 18+)
# or individually:
cd services/invoice-service && npm install && npm test
cd frontend && npm install && npm test
```

## Local dev without Docker

Each service runs on the fast in-memory profile:

```bash
cd services/vendor-service
npm install
npm run watch        # cds watch -> http://localhost:4004 (sqlite, auto-seeded)
```

## Layout

```
services/<name>/
  db/schema.cds        domain model (one bounded context)
  db/data/*.csv        seed data (deterministic, cross-service-consistent ids)
  srv/*.cds *.js       OData service + handlers
  srv/lib/             cross-service HTTP clients (mockable)
  test/                jest + cds.test unit tests
  Dockerfile           build
  entrypoint.sh        release (cds deploy) + run (cds-serve)
  .env.example         config contract
gateway/               nginx reverse proxy + static UI host
frontend/webapp/       Fiori Elements app (loads UI5 from CDN)
infra/postgres/init/   creates one database per service
scripts/gen-seed.js    regenerate seed data (one-off admin process)
docker-compose.yml     full local topology
```

## Production notes

- Replace the nginx gateway with the **SAP approuter + XSUAA** for real SSO/roles.
- Replace `SYSTEM_*` Basic auth between services with **client-credentials OAuth**.
- Point `CDS_REQUIRES_DB_CREDENTIALS_*` at managed Postgres (or swap `@cap-js/postgres`
  for `@cap-js/hana` to target SAP HANA Cloud) — config-only changes.
