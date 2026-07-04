# Enterprise Vendor Invoice Management System

SAP BTP CAP capstone — a production-shaped Vendor Invoice Management System built with
**SAP CAP (Node.js)**, **HANA Cloud**, **Fiori Elements**, **XSUAA security**,
**S/4HANA Business Partner integration**, and **SAP Build Work Zone**.

## Features

| Feature | Where |
|---|---|
| CDS data model (aspects, associations, compositions, enums, calculated fields) | [db/schema.cds](db/schema.cds) |
| Role-based services (Admin / VendorManager / Approver / Viewer) | `srv/*-service.cds` |
| Business rules + workflow actions (submit / approve / reject / mark-paid) | [srv/lib/invoice-logic.js](srv/lib/invoice-logic.js) |
| Row-level security for Vendor Managers | [srv/vendor-manager-service.js](srv/vendor-manager-service.js) |
| S/4HANA Business Partner sync (upsert, mock fallback) | [srv/lib/s4-sync.js](srv/lib/s4-sync.js) |
| Fiori Elements List Report + Object Page annotations | [srv/annotations.cds](srv/annotations.cds) |
| Security model (scopes, roles, role collections, attributes) | [xs-security.json](xs-security.json) |
| Cloud Foundry MTA descriptor | [mta.yaml](mta.yaml) |
| Sample data (10 vendors, 20 invoices, 50 items, 25 history, 20 attachments) | `db/data/*.csv` |

## Business rules implemented

1. Only `APPROVED` vendors can hold invoices
2. Amount `> 0` and `<= 1,000,000`
3. Invoice date cannot be in the future
4. Only `SUBMITTED` invoices can be approved/rejected (state machine enforced)
5. Approver cannot approve their own submission
6. Vendor Managers only see invoices for their assigned vendors (row-level)
7. Invoice number unique per vendor
8. Line items must sum to the header amount (checked on submit)
9. At least one line item required for submission
10. Deleted/pending/suspended vendors cannot get new invoices

State machine: `DRAFT → SUBMITTED → APPROVED → PAID` with `SUBMITTED → REJECTED`.

## Run locally

> Requires **Node.js 18+** and `@sap/cds-dk` (`npm i -g @sap/cds-dk`).
> (The generator machine here has Node 10 — install a current LTS to run CAP.)

```bash
npm install
cds watch              # serves at http://localhost:4004 with mocked auth
```

Mocked users (development): `admin`, `manager`, `approver`, `viewer` (no password).
Service endpoints:

- `/admin/Invoices`, `/admin/Vendors`, `/admin/InvoiceAnalytics`
- `/vendor-manager/Invoices` (row-level filtered)
- `/approver/Invoices` (approve/reject actions)
- `/viewer/Invoices` (approved only)

### Trigger the S/4HANA sync (dev uses mock suppliers)

```bash
curl -X POST http://localhost:4004/admin/syncVendorsFromS4 \
  -H "Content-Type: application/json" -u admin:
```

## Deploy to Cloud Foundry + HANA Cloud

```bash
npm ci
mbt build                     # produces mta_archives/*.mtar
cf deploy mta_archives/vendor-invoice-mgmt_1.0.0.mtar
cf apps                       # vendor-invoice-srv should be started
cf services                   # all services create succeeded
```

Then create/assign the role collections (`VendorInvoice_Admin`, etc.) in the BTP cockpit
and add the HTML5 app to a SAP Build Work Zone site.

## Project layout

```
db/schema.cds            data model + sample data
srv/*.cds  *.js          four role services, actions, business logic
srv/lib/                 shared invoice logic + S/4HANA sync
srv/external/            trimmed S/4HANA Business Partner model
app/manage-invoices/     Fiori Elements UI
xs-security.json         XSUAA role model
mta.yaml                 Cloud Foundry deployment descriptor
```
