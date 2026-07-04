const cds = require('@sap/cds');
const invoiceClient = require('./lib/invoice-client');

module.exports = class ApprovalService extends cds.ApplicationService {
  async init() {
    const { ApprovalHistory } = this.entities;

    const record = (inv, action, actor, comments) =>
      INSERT.into(ApprovalHistory).entries({
        invoiceID: inv.ID,
        invoiceNumber: inv.invoiceNumber,
        action,
        actor,
        actionAt: new Date().toISOString(),
        comments: comments || ''
      });

    // Shared orchestration: drive invoice-service state machine, then log history.
    const run = async (req, decision, comments) => {
      const actor = req.user.id;
      let inv;
      try {
        inv = await invoiceClient.applyDecision(req.data.invoiceID, decision, actor, comments);
      } catch (e) {
        const msg = (e.data && e.data.error && e.data.error.message) || e.message;
        return req.reject(e.status || 502, msg);
      }
      await record(inv, decision, actor, comments);
      return { status: inv.status, invoiceNumber: inv.invoiceNumber };
    };

    this.on('submitForApproval', (req) => run(req, 'SUBMITTED', 'Invoice submitted for approval'));
    this.on('approveInvoice',   (req) => run(req, 'APPROVED', req.data.comments || 'Invoice approved'));
    this.on('markAsPaid',       (req) => run(req, 'PAID', 'Invoice marked as paid'));
    this.on('rejectInvoice',    (req) => {
      const reason = req.data.reason && String(req.data.reason).trim();
      if (!reason) return req.error(400, 'Rejection reason is mandatory');
      return run(req, 'REJECTED', reason);
    });

    await super.init();
  }
};
