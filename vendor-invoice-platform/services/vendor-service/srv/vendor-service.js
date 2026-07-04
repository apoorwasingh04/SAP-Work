const cds = require('@sap/cds');

module.exports = class VendorService extends cds.ApplicationService {
  async init() {
    const { Vendors } = this.entities;

    // Bound action: approve a PENDING vendor so it can hold invoices
    this.on('approve', 'Vendors', async (req) => {
      const v = await SELECT.one.from(req.subject);
      if (!v) return req.error(404, 'Vendor not found');
      await UPDATE(Vendors, v.ID).set({ status: 'APPROVED' });
      req.info(`Vendor ${v.vendorName} approved`);
      return await SELECT.one.from(Vendors).where({ ID: v.ID });
    });

    // Unbound action: upsert suppliers coming from S/4HANA (integration-service).
    // Match by external system id (or tax id), update existing, create new as PENDING.
    this.on('upsertVendors', async (req) => {
      const list = (req.data && req.data.items) || [];
      let created = 0, updated = 0, failed = 0;
      for (const s of list) {
        try {
          const mapped = {
            vendorName: s.vendorName,
            email: s.email || null,
            phone: s.phone || null,
            address: s.address || null,
            country_code: s.country || null,
            currency_code: s.currency || 'USD',
            taxId: s.taxId || null,
            externalSystemId: s.externalSystemId || null
          };
          const match = mapped.externalSystemId
            ? { externalSystemId: mapped.externalSystemId }
            : { taxId: mapped.taxId };
          const existing = await SELECT.one.from(Vendors).where(match);
          if (existing) {
            await UPDATE(Vendors, existing.ID).set(mapped);
            updated++;
          } else {
            await INSERT.into(Vendors).entries(Object.assign({ status: 'PENDING' }, mapped));
            created++;
          }
        } catch (e) {
          failed++;
        }
      }
      return { total: list.length, created, updated, failed };
    });

    await super.init();
  }
};
