const cds = require('@sap/cds');

/* Small helpers -------------------------------------------------------------- */

const MAX_AMOUNT = 1000000.00;

// today's date as YYYY-MM-DD (date-only comparison, no timezone surprises)
function today() {
  return new Date().toISOString().slice(0, 10);
}

// round to 2 decimals to avoid floating point noise when comparing money
function money(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// write one row into the audit trail
async function addHistory(tx, ApprovalHistory, invoiceID, action, actor, comments) {
  await tx.run(INSERT.into(ApprovalHistory).entries({
    invoice_ID: invoiceID,
    action,
    actor,
    actionAt: new Date().toISOString(),
    comments
  }));
}

/* ----------------------------------------------------------------------------
   Validation registered on CREATE / UPDATE of Invoices.
   Covers business rules 1, 2, 3, 10 and the due-date rule.
---------------------------------------------------------------------------- */
function registerInvoiceValidations(srv) {
  const { Invoices, Vendors } = srv.entities;

  srv.before(['CREATE', 'UPDATE'], 'Invoices', async (req) => {
    const inv = req.data;

    // Amount: > 0 and <= 1,000,000  (rule 2)
    if (inv.amount != null) {
      const amt = Number(inv.amount);
      if (!(amt > 0) || amt > MAX_AMOUNT) {
        req.error({ target: 'amount', message: 'Amount must be between 0.01 and 1,000,000' });
      }
    }

    // Invoice date cannot be in the future  (rule 3)
    if (inv.invoiceDate && inv.invoiceDate > today()) {
      req.error({ target: 'invoiceDate', message: 'Invoice date cannot be in the future' });
    }

    // Due date must be on or after invoice date
    if (inv.dueDate && inv.invoiceDate && inv.dueDate < inv.invoiceDate) {
      req.error({ target: 'dueDate', message: 'Due date must be on or after invoice date' });
    }

    // Currency mandatory
    if (inv.currency_code === '' ) {
      req.error({ target: 'currency_code', message: 'Currency is required' });
    }

    // Vendor must exist and be APPROVED (rules 1 & 10 - DELETED/PENDING/SUSPENDED rejected)
    const vendorID = inv.vendor_ID;
    if (vendorID) {
      const vendor = await SELECT.one.from(Vendors).where({ ID: vendorID });
      if (!vendor) {
        req.error({ target: 'vendor_ID', message: 'Please select an approved vendor' });
      } else if (vendor.status !== 'APPROVED') {
        req.error({ target: 'vendor_ID', message: 'Please select an approved vendor' });
      }
    }
  });

  // Friendlier message for the unique constraint (rule 7)
  srv.on('error', (err, req) => {
    if (err.code === 'ASSERT_UNIQUE' || /unique/i.test(err.message || '')) {
      const inv = req.data || {};
      if (inv.invoiceNumber) {
        err.message = `Invoice number ${inv.invoiceNumber} already exists for this vendor`;
      }
    }
  });
}

/* ----------------------------------------------------------------------------
   Line-item total auto-calculation (Total = Quantity x Unit Price)
---------------------------------------------------------------------------- */
function registerItemCalculation(srv) {
  srv.before(['CREATE', 'UPDATE'], 'InvoiceItems', (req) => {
    const it = req.data;
    if (it.quantity != null && it.unitPrice != null) {
      it.totalAmount = money(Number(it.quantity) * Number(it.unitPrice));
    }
    if (it.quantity != null && !(Number(it.quantity) > 0)) {
      req.error({ target: 'quantity', message: 'Quantity must be greater than zero' });
    }
    if (it.unitPrice != null && !(Number(it.unitPrice) > 0)) {
      req.error({ target: 'unitPrice', message: 'Unit price must be greater than zero' });
    }
    if (it.description != null && !String(it.description).trim()) {
      req.error({ target: 'description', message: 'Line item description is required' });
    }
  });
}

/* ----------------------------------------------------------------------------
   Workflow action: Submit for Approval (DRAFT -> SUBMITTED)
---------------------------------------------------------------------------- */
function registerSubmit(srv) {
  const { Invoices, InvoiceItems, ApprovalHistory } = srv.entities;

  srv.on('submitForApproval', 'Invoices', async (req) => {
    const tx = cds.tx(req);
    const inv = await tx.run(SELECT.one.from(req.subject));
    if (!inv) return req.error(404, 'Invoice not found');

    // rule 4 / state machine: only DRAFT can be submitted
    if (inv.status !== 'DRAFT') {
      return req.error(400, 'Only draft invoices can be submitted');
    }

    // rule 9: at least one line item
    const items = await tx.run(SELECT.from(InvoiceItems).where({ invoice_ID: inv.ID }));
    if (!items.length) {
      return req.error(400, 'Invoice must have at least one line item');
    }

    // rule 8: sum of line items must equal header amount
    const sum = money(items.reduce((s, i) => s + Number(i.totalAmount || 0), 0));
    if (sum !== money(inv.amount)) {
      return req.error(400,
        `Line items total (${sum}) does not match invoice amount (${money(inv.amount)}). Adjustment required.`);
    }

    const now = new Date().toISOString();
    await tx.run(UPDATE(Invoices, inv.ID).set({
      status: 'SUBMITTED',
      submittedBy: req.user.id,
      submittedAt: now
    }));
    await addHistory(tx, ApprovalHistory, inv.ID, 'SUBMITTED', req.user.id, 'Invoice submitted for approval');

    req.info(`Invoice ${inv.invoiceNumber} submitted for approval successfully`);
    return await tx.run(SELECT.one.from(Invoices).where({ ID: inv.ID }));
  });
}

/* ----------------------------------------------------------------------------
   Workflow action: Approve Invoice (SUBMITTED -> APPROVED)
---------------------------------------------------------------------------- */
function registerApprove(srv) {
  const { Invoices, ApprovalHistory } = srv.entities;

  srv.on('approveInvoice', 'Invoices', async (req) => {
    const tx = cds.tx(req);
    const inv = await tx.run(SELECT.one.from(req.subject));
    if (!inv) return req.error(404, 'Invoice not found');

    if (inv.status !== 'SUBMITTED') {
      return req.error(400, 'Only submitted invoices can be approved');
    }
    // rule 5: approver cannot approve their own submission
    if (inv.submittedBy && inv.submittedBy === req.user.id) {
      return req.error(403, 'You cannot approve your own submitted invoice');
    }

    const comments = (req.data && req.data.comments) || 'Invoice approved';
    const now = new Date().toISOString();
    await tx.run(UPDATE(Invoices, inv.ID).set({
      status: 'APPROVED',
      approvedBy: req.user.id,
      approvedAt: now,
      approvalComments: comments
    }));
    await addHistory(tx, ApprovalHistory, inv.ID, 'APPROVED', req.user.id, comments);

    req.info(`Invoice ${inv.invoiceNumber} approved successfully by ${req.user.id}`);
    return await tx.run(SELECT.one.from(Invoices).where({ ID: inv.ID }));
  });
}

/* ----------------------------------------------------------------------------
   Workflow action: Reject Invoice (SUBMITTED -> REJECTED)
---------------------------------------------------------------------------- */
function registerReject(srv) {
  const { Invoices, ApprovalHistory } = srv.entities;

  srv.on('rejectInvoice', 'Invoices', async (req) => {
    const tx = cds.tx(req);
    const inv = await tx.run(SELECT.one.from(req.subject));
    if (!inv) return req.error(404, 'Invoice not found');

    if (inv.status !== 'SUBMITTED') {
      return req.error(400, 'Only submitted invoices can be rejected');
    }
    const reason = req.data && req.data.reason ? String(req.data.reason).trim() : '';
    if (!reason) {
      return req.error(400, 'Rejection reason is mandatory');
    }

    const now = new Date().toISOString();
    await tx.run(UPDATE(Invoices, inv.ID).set({
      status: 'REJECTED',
      rejectedBy: req.user.id,
      rejectedAt: now,
      rejectionReason: reason
    }));
    await addHistory(tx, ApprovalHistory, inv.ID, 'REJECTED', req.user.id, reason);

    req.info(`Invoice ${inv.invoiceNumber} rejected by ${req.user.id}`);
    return await tx.run(SELECT.one.from(Invoices).where({ ID: inv.ID }));
  });
}

/* ----------------------------------------------------------------------------
   Bonus action: Mark as Paid (APPROVED -> PAID)
---------------------------------------------------------------------------- */
function registerMarkAsPaid(srv) {
  const { Invoices, ApprovalHistory } = srv.entities;
  if (!srv.operations || !srv.entities.Invoices) return;

  srv.on('markAsPaid', 'Invoices', async (req) => {
    const tx = cds.tx(req);
    const inv = await tx.run(SELECT.one.from(req.subject));
    if (!inv) return req.error(404, 'Invoice not found');
    if (inv.status !== 'APPROVED') {
      return req.error(400, 'Only approved invoices can be marked as paid');
    }
    await tx.run(UPDATE(Invoices, inv.ID).set({ status: 'PAID' }));
    await addHistory(tx, ApprovalHistory, inv.ID, 'PAID', req.user.id, 'Invoice marked as paid');
    return await tx.run(SELECT.one.from(Invoices).where({ ID: inv.ID }));
  });
}

module.exports = {
  today,
  money,
  addHistory,
  registerInvoiceValidations,
  registerItemCalculation,
  registerSubmit,
  registerApprove,
  registerReject,
  registerMarkAsPaid
};
