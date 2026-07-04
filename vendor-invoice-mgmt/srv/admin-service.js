const cds = require('@sap/cds');
const logic = require('./lib/invoice-logic');
const { syncVendorsFromS4 } = require('./lib/s4-sync');

module.exports = class AdminService extends cds.ApplicationService {
  async init() {
    // Business rules & workflow actions
    logic.registerInvoiceValidations(this);
    logic.registerItemCalculation(this);
    logic.registerSubmit(this);
    logic.registerApprove(this);
    logic.registerReject(this);
    logic.registerMarkAsPaid(this);

    // Admin can approve a PENDING vendor so it becomes usable for invoices
    this.on('approveVendor', 'Vendors', async (req) => {
      const { Vendors } = this.entities;
      const v = await cds.tx(req).run(SELECT.one.from(req.subject));
      if (!v) return req.error(404, 'Vendor not found');
      await UPDATE(Vendors, v.ID).set({ status: 'APPROVED' });
      req.info(`Vendor ${v.vendorName} approved`);
      return await SELECT.one.from(Vendors).where({ ID: v.ID });
    });

    // S/4HANA vendor sync (Admin only - already guarded by @requires on the service)
    this.on('syncVendorsFromS4', (req) => syncVendorsFromS4(req));

    await super.init();
  }
};
