const cds = require('@sap/cds');
const logic = require('./lib/invoice-logic');

module.exports = class ApproverService extends cds.ApplicationService {
  async init() {
    // Approver only gets approve / reject (no create/submit)
    logic.registerApprove(this);
    logic.registerReject(this);

    // The "Approve Invoices" Work Zone tile deep-links here with
    // $filter=status eq 'SUBMITTED'; no extra server filter is required since
    // the Approver role is read-only across invoices.

    await super.init();
  }
};
