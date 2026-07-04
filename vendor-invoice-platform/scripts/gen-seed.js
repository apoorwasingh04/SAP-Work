'use strict';
// Generates per-service seed CSVs with CONSISTENT ids across service boundaries.
// invoice-service and approval-service reference vendors/invoices by UUID (no cross-db FK),
// with denormalized display fields (vendorName / invoiceNumber).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.argv[2];
if (!ROOT) { console.error('usage: node gen-seed.js <platformRoot>'); process.exit(1); }

const dirs = {
  vendor:   path.join(ROOT, 'services/vendor-service/db/data'),
  invoice:  path.join(ROOT, 'services/invoice-service/db/data'),
  approval: path.join(ROOT, 'services/approval-service/db/data')
};
Object.values(dirs).forEach(d => fs.mkdirSync(d, { recursive: true }));

function uuid() {
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
function csv(rows) {
  return rows.map(r => r.map(v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(',')).join('\r\n') + '\r\n';
}
function write(dir, name, header, rows) {
  fs.writeFileSync(path.join(dir, name), csv([header, ...rows]));
  console.log(path.relative(ROOT, path.join(dir, name)), '->', rows.length, 'rows');
}

/* Vendors */
const vendorDefs = [
  ['Acme Corp',        'sales@acme.com',        '+1-415-555-0100', '1 Market Street San Francisco', 'US', 'USD', 'US-ACM-01', 'S4-1001', 'APPROVED', 'manager'],
  ['Tech Solutions Ltd','info@techsol.co.uk',   '+44-20-7946-0102','221B Baker Street London',      'GB', 'EUR', 'GB-TEC-02', 'S4-1002', 'APPROVED', 'manager2'],
  ['Global Supplies',  'contact@globalsup.in',  '+91-22-2500-0103','MG Road Mumbai',                'IN', 'INR', 'IN-GLO-03', 'S4-1003', 'APPROVED', 'manager2'],
  ['New Vendor Inc',   'hello@newvendor.com',   '+1-212-555-0104', '5th Avenue New York',           'US', 'USD', 'US-NEW-04', 'S4-1004', 'PENDING',  ''],
  ['Quality Parts',    'sales@qualityparts.de', '+49-30-5555-0105','Alexanderplatz Berlin',         'DE', 'EUR', 'DE-QUA-05', 'S4-1005', 'APPROVED', 'manager2'],
  ['Supply Chain Co',  'orders@supplychain.uk', '+44-161-555-0106','Deansgate Manchester',          'GB', 'GBP', 'GB-SUP-06', 'S4-1006', 'APPROVED', 'manager'],
  ['Materials Plus',   'info@materialsplus.ca', '+1-416-555-0107', 'King Street Toronto',           'CA', 'USD', 'CA-MAT-07', 'S4-1007', 'REJECTED', ''],
  ['Service Provider', 'support@servicepro.au', '+61-2-5550-0108', 'Pitt Street Sydney',            'AU', 'AUD', 'AU-SER-08', 'S4-1008', 'APPROVED', 'manager2'],
  ['Industrial Goods', 'sales@indgoods.fr',     '+33-1-5555-0109', 'Champs Elysees Paris',          'FR', 'EUR', 'FR-IND-09', 'S4-1009', 'PENDING',  ''],
  ['Equipment Rental', 'rentals@equipment.com', '+1-310-555-0110', 'Sunset Blvd Los Angeles',       'US', 'USD', 'US-EQU-10', 'S4-1010', 'APPROVED', 'manager']
];
const vendors = vendorDefs.map(d => ({
  ID: uuid(), vendorName: d[0], email: d[1], phone: d[2], address: d[3],
  country_code: d[4], currency_code: d[5], taxId: d[6], externalSystemId: d[7], status: d[8], assignedManager: d[9]
}));
write(dirs.vendor, 'vendor-Vendors.csv',
  ['ID','vendorName','email','phone','address','country_code','currency_code','taxId','externalSystemId','status','assignedManager'],
  vendors.map(v => [v.ID,v.vendorName,v.email,v.phone,v.address,v.country_code,v.currency_code,v.taxId,v.externalSystemId,v.status,v.assignedManager]));

const approved = vendors.filter(v => v.status === 'APPROVED');

/* Invoices + Items + Attachments (invoice-service) & History (approval-service) */
const plan = [].concat(Array(5).fill('DRAFT'), Array(5).fill('SUBMITTED'), Array(6).fill('APPROVED'), Array(4).fill('REJECTED'));
const descriptions = ['Software Licenses','Support Services','Consulting Services','Hardware Units','Maintenance','Training','Cloud Subscription','Spare Parts','Installation','Logistics'];

const invoices = [], items = [], attachments = [], history = [];
const submitter = 'manager', approver = 'approver';

plan.forEach((status, i) => {
  const v = approved[i % approved.length];
  const invID = uuid();
  const num = `INV-${String(i + 1).padStart(3, '0')}`;
  const month = (i % 12) + 1;
  const invoiceDate = `2025-${String(month).padStart(2,'0')}-05`;
  const dueDate     = `2025-${String(month).padStart(2,'0')}-25`;

  const nItems = 2 + (i % 2);
  let amount = 0;
  for (let li = 1; li <= nItems; li++) {
    const qty = li + (i % 3) + 1;
    const price = (li * 1000) + (i % 5) * 250;
    const total = Math.round(qty * price * 100) / 100;
    amount += total;
    items.push([uuid(), invID, li, descriptions[(i + li) % descriptions.length], qty, price.toFixed(2), total.toFixed(2)]);
  }
  amount = Math.round(amount * 100) / 100;

  const subAt = `${invoiceDate}T10:30:00Z`, actAt = `${invoiceDate}T15:45:00Z`;
  const row = {
    ID: invID, invoiceNumber: num, vendorID: v.ID, vendorName: v.vendorName,
    invoiceDate, dueDate, amount: amount.toFixed(2), currency_code: v.currency_code, status,
    submittedBy: '', submittedAt: '', approvedBy: '', approvedAt: '', approvalComments: '',
    rejectedBy: '', rejectedAt: '', rejectionReason: ''
  };

  if (status !== 'DRAFT') { row.submittedBy = submitter; row.submittedAt = subAt;
    history.push([uuid(), invID, num, 'SUBMITTED', submitter, subAt, 'Invoice submitted for approval']); }
  if (status === 'APPROVED') { row.approvedBy = approver; row.approvedAt = actAt; row.approvalComments = 'Approved - all documents verified';
    history.push([uuid(), invID, num, 'APPROVED', approver, actAt, 'Approved - all documents verified']); }
  if (status === 'REJECTED') { row.rejectedBy = approver; row.rejectedAt = actAt; row.rejectionReason = 'Missing supporting documents';
    history.push([uuid(), invID, num, 'REJECTED', approver, actAt, 'Missing supporting documents']); }

  invoices.push(row);
  attachments.push([uuid(), invID, `${num}.pdf`, 'application/pdf', 100000 + i * 1000, submitter, subAt]);
});

write(dirs.invoice, 'invoice-Invoices.csv',
  ['ID','invoiceNumber','vendorID','vendorName','invoiceDate','dueDate','amount','currency_code','status','submittedBy','submittedAt','approvedBy','approvedAt','approvalComments','rejectedBy','rejectedAt','rejectionReason'],
  invoices.map(r => [r.ID,r.invoiceNumber,r.vendorID,r.vendorName,r.invoiceDate,r.dueDate,r.amount,r.currency_code,r.status,r.submittedBy,r.submittedAt,r.approvedBy,r.approvedAt,r.approvalComments,r.rejectedBy,r.rejectedAt,r.rejectionReason]));
write(dirs.invoice, 'invoice-InvoiceItems.csv',
  ['ID','invoice_ID','lineNumber','description','quantity','unitPrice','totalAmount'], items);
write(dirs.invoice, 'invoice-Attachments.csv',
  ['ID','invoice_ID','fileName','mimeType','fileSize','uploadedBy','uploadedAt'], attachments);
write(dirs.approval, 'approval-ApprovalHistory.csv',
  ['ID','invoiceID','invoiceNumber','action','actor','actionAt','comments'], history);

// integrity check
const byInv = {}; items.forEach(it => { byInv[it[1]] = (byInv[it[1]] || 0) + Number(it[6]); });
let ok = true;
invoices.forEach(inv => { const s = Math.round((byInv[inv.ID]||0)*100)/100; if (s !== Number(inv.amount)) { ok = false; console.error('MISMATCH', inv.invoiceNumber, s, inv.amount); } });
console.log('items:', items.length, '| sums match:', ok, '| history:', history.length);
