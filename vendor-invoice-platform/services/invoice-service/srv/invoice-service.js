const cds = require('@sap/cds');
const vendorClient = require('./lib/vendor-client');

const MAX_AMOUNT = 1000000.00;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

module.exports = class InvoiceService extends cds.ApplicationService {
  async init() {
    const { Invoices, InvoiceItems } = this.entities;

    /* ---- Invoice header validation + vendor verification (cross-service) ---- */
    this.before(['CREATE', 'UPDATE'], 'Invoices', async (req) => {
      const inv = req.data;

      if (inv.amount != null) {
        const a = Number(inv.amount);
        if (!(a > 0) || a > MAX_AMOUNT) {
          req.error(400, 'Amount must be between 0.01 and 1,000,000', 'amount');
        }
      }
      if (inv.invoiceDate && inv.invoiceDate > today()) {
        req.error(400, 'Invoice date cannot be in the future', 'invoiceDate');
      }
      if (inv.dueDate && inv.invoiceDate && inv.dueDate < inv.invoiceDate) {
        req.error(400, 'Due date must be on or after invoice date', 'dueDate');
      }
      if (inv.currency_code === '') {
        req.error(400, 'Currency is required', 'currency_code');
      }

      // Verify the vendor exists and is APPROVED (business rules 1 & 10).
      if (inv.vendorID) {
        let vendor = null;
        try {
          vendor = await vendorClient.getVendor(inv.vendorID);
        } catch (e) {
          if (e.status === 404) vendor = null;
          else return req.reject(502, 'Vendor service is unavailable, please retry');
        }
        if (!vendor || vendor.status !== 'APPROVED') {
          return req.error(400, 'Please select an approved vendor', 'vendorID');
        }
        inv.vendorName = vendor.vendorName; // denormalize for display
      }
    });

    /* ---- Row-level security: a VendorManager only sees their vendors' invoices */
    this.before('READ', 'Invoices', async (req) => {
      const u = req.user;
      const isManagerOnly = u.is('VendorManager') && !u.is('Admin') && !u.is('internal');
      if (!isManagerOnly) return;
      const mgr = (u.attr && u.attr.managerId) || u.id;
      const ids = await vendorClient.listVendorIdsForManager(mgr);
      if (!ids.length) { req.query.where('1 = 0'); return; }
      req.query.where({ vendorID: { in: ids } });
    });

    /* ---- Line-item total auto-calculation + item validation ---- */
    this.before(['CREATE', 'UPDATE'], 'InvoiceItems', (req) => {
      const it = req.data;
      if (it.quantity != null && it.unitPrice != null) {
        it.totalAmount = money(Number(it.quantity) * Number(it.unitPrice));
      }
      if (it.quantity != null && !(Number(it.quantity) > 0)) {
        req.error(400, 'Quantity must be greater than zero', 'quantity');
      }
      if (it.unitPrice != null && !(Number(it.unitPrice) > 0)) {
        req.error(400, 'Unit price must be greater than zero', 'unitPrice');
      }
      if (it.description != null && !String(it.description).trim()) {
        req.error(400, 'Line item description is required', 'description');
      }
    });

    /* ---- Internal state machine (unbound), driven by approval-service ---- */
    this.on('applyDecision', async (req) => {
      const { invoiceID, decision, actor, comments } = req.data;
      const inv = await SELECT.one.from(Invoices).where({ ID: invoiceID });
      if (!inv) return req.error(404, 'Invoice not found');
      const now = new Date().toISOString();

      switch (decision) {
        case 'SUBMITTED': {
          if (inv.status !== 'DRAFT') return req.error(400, 'Only draft invoices can be submitted');
          const items = await SELECT.from(InvoiceItems).where({ invoice_ID: inv.ID });
          if (!items.length) return req.error(400, 'Invoice must have at least one line item');
          const sum = money(items.reduce((s, i) => s + Number(i.totalAmount || 0), 0));
          if (sum !== money(inv.amount)) {
            return req.error(400,
              `Line items total (${sum}) does not match invoice amount (${money(inv.amount)}). Adjustment required.`);
          }
          await UPDATE(Invoices, inv.ID).set({ status: 'SUBMITTED', submittedBy: actor, submittedAt: now });
          break;
        }
        case 'APPROVED': {
          if (inv.status !== 'SUBMITTED') return req.error(400, 'Only submitted invoices can be approved');
          if (inv.submittedBy && inv.submittedBy === actor) {
            return req.error(403, 'You cannot approve your own submitted invoice');
          }
          await UPDATE(Invoices, inv.ID).set({
            status: 'APPROVED', approvedBy: actor, approvedAt: now,
            approvalComments: comments || 'Invoice approved'
          });
          break;
        }
        case 'REJECTED': {
          if (inv.status !== 'SUBMITTED') return req.error(400, 'Only submitted invoices can be rejected');
          const reason = comments && String(comments).trim();
          if (!reason) return req.error(400, 'Rejection reason is mandatory');
          await UPDATE(Invoices, inv.ID).set({ status: 'REJECTED', rejectedBy: actor, rejectedAt: now, rejectionReason: reason });
          break;
        }
        case 'PAID': {
          if (inv.status !== 'APPROVED') return req.error(400, 'Only approved invoices can be marked as paid');
          await UPDATE(Invoices, inv.ID).set({ status: 'PAID' });
          break;
        }
        default:
          return req.error(400, `Unknown decision '${decision}'`);
      }
      return await SELECT.one.from(Invoices).where({ ID: inv.ID });
    });

    /* ---- Friendly message for unique invoice number per vendor ---- */
    this.on('error', (err, req) => {
      if (err.code === 'ASSERT_UNIQUE' || /unique/i.test(err.message || '')) {
        const inv = (req && req.data) || {};
        if (inv.invoiceNumber) err.message = `Invoice number ${inv.invoiceNumber} already exists for this vendor`;
      }
    });

    await super.init();
  }
};
