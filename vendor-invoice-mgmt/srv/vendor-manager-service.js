const cds = require('@sap/cds');
const logic = require('./lib/invoice-logic');

module.exports = class VendorManagerService extends cds.ApplicationService {
  async init() {
    const { Invoices, Vendors } = this.entities;

    logic.registerInvoiceValidations(this);
    logic.registerItemCalculation(this);
    logic.registerSubmit(this);

    // ---- Row-level security -------------------------------------------------
    // A Vendor Manager only ever sees invoices/vendors they are assigned to.
    // The manager id is taken from the XSUAA attribute "managerId" (falls back
    // to the technical user id in development).
    const managerId = (req) => (req.user.attr && req.user.attr.managerId) || req.user.id;

    // Filter the manager's own vendors
    this.before('READ', 'Vendors', (req) => {
      req.query.where({ assignedManager: managerId(req), status: 'APPROVED' });
    });

    // Filter invoices to the manager's vendors
    this.before('READ', 'Invoices', (req) => {
      req.query.where(`vendor.assignedManager =`, managerId(req));
    });

    // Block direct access (deep link) to an invoice for a foreign vendor -> 403
    this.after('READ', 'Invoices', (data, req) => {
      const rows = Array.isArray(data) ? data : (data ? [data] : []);
      // single-record read of a foreign invoice returns empty -> raise 403
      if (req.params && req.params.length && rows.length === 0) {
        req.reject(403, 'Access denied. You do not have permission to view this invoice.');
      }
    });

    // Stamp the assigned manager / restrict vendor choice on create
    this.before('CREATE', 'Invoices', async (req) => {
      const vId = req.data.vendor_ID;
      if (vId) {
        const v = await SELECT.one.from(Vendors).where({ ID: vId });
        if (!v || v.assignedManager !== managerId(req)) {
          req.reject(403, 'You can only create invoices for your assigned vendors');
        }
      }
    });

    await super.init();
  }
};
