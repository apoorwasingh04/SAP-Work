# Architecture

## Service topology

```
                          ┌──────────────────────────────┐
      Browser  ─────────► │  gateway (nginx :8080)        │
                          │  - serves Fiori UI (static)   │
                          │  - reverse-proxies /vendor,    │
                          │    /invoice, /approval,        │
                          │    /integration               │
                          └───────┬───────────────────────┘
              ┌───────────────────┼───────────────────┬───────────────────┐
              ▼                   ▼                   ▼                   ▼
    ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌────────────────────┐
    │ vendor-service   │ │ invoice-service  │ │ approval-service │ │ integration-service│
    │  Vendors         │ │  Invoices        │ │  ApprovalHistory │ │  SyncRuns          │
    │                  │◄┤  InvoiceItems    │◄┤  (orchestrates   │ │                    │
    │  approve()       │ │  Attachments     │ │   submit/approve │ │  syncVendorsFromS4 │
    │  upsertVendors() │ │  applyDecision() │ │   /reject/pay)   │ │        │           │
    └────────┬─────────┘ └────────┬─────────┘ └──────────────────┘ └────────┼───────────┘
             │ vendordb           │ invoicedb        │ approvaldb            │ integrationdb
             ▼                    ▼                   ▼                      ▼
    ┌───────────────────────────────────────────────────────────────────────────────────┐
    │                         Postgres (one database per service)                         │
    └───────────────────────────────────────────────────────────────────────────────────┘

    integration-service ──upsertVendors──► vendor-service
    invoice-service     ──getVendor──────► vendor-service   (verify APPROVED, row-level ids)
    approval-service    ──applyDecision──► invoice-service  (state transitions)
```

## Ownership & boundaries

| Service | Owns (DB) | Public API | Talks to |
|---|---|---|---|
| vendor-service | `Vendors` (vendordb) | CRUD, `approve`, `upsertVendors` (internal) | — |
| invoice-service | `Invoices`, `InvoiceItems`, `Attachments` (invoicedb) | CRUD + draft, `applyDecision` (internal), analytics | vendor-service |
| approval-service | `ApprovalHistory` (approvaldb) | `submitForApproval`, `approveInvoice`, `rejectInvoice`, `markAsPaid` | invoice-service |
| integration-service | `SyncRuns` (integrationdb) | `syncVendorsFromS4` | vendor-service, S/4HANA |

## Key design decisions

- **No cross-database foreign keys.** Services reference each other by UUID and keep a
  small denormalized copy (`vendorName` on invoices, `invoiceNumber` on history) for
  display/search. This preserves service autonomy.
- **State transitions are centralized** in `invoice-service.applyDecision` (it owns the
  invoice status), while `approval-service` orchestrates the workflow and owns the audit
  trail. The "cannot approve your own invoice" and "line items must total the header"
  rules live where the data lives.
- **Synchronous REST** between services (OData/HTTP). For higher decoupling this could
  evolve to events (outbox + message broker) without changing the domain boundaries.
- **Idempotent seed/deploy** via `cds deploy` on container start — the release step.

## Workflow (happy path)

1. `integration-service.syncVendorsFromS4` → pulls suppliers → `vendor-service.upsertVendors` (PENDING).
2. Admin `vendor-service.approve` a vendor → APPROVED.
3. `invoice-service` create invoice (verifies vendor APPROVED) + line items (auto totals).
4. `approval-service.submitForApproval` → `applyDecision(SUBMITTED)` (validates totals, ≥1 item) → history.
5. `approval-service.approveInvoice` (different user) → `applyDecision(APPROVED)` → history.
