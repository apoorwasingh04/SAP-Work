const cds = require('@sap/cds');

/**
 * Map an S/4HANA Business Partner (Supplier) record to a local Vendor.
 * Field mapping per the spec (Action 6).
 */
function mapSupplierToVendor(bp) {
  return {
    vendorName:       bp.BusinessPartnerName || bp.OrganizationBPName1 || bp.SupplierName,
    email:            bp.EmailAddress || null,
    phone:            bp.PhoneNumber || null,
    address:          bp.StreetName ? `${bp.StreetName}, ${bp.CityName || ''}`.trim() : null,
    country_code:     bp.Country || null,
    currency_code:    bp.Currency || 'USD',
    taxId:            bp.TaxNumber1 || bp.BusinessPartnerTaxNumber || null,
    externalSystemId: bp.Supplier || bp.BusinessPartner
  };
}

/**
 * Local fallback when no S/4HANA destination is configured (development / demo).
 * Returns a small, realistic set of suppliers so the sync action still runs.
 */
function mockSuppliers() {
  return [
    { Supplier: 'S4-1001', BusinessPartnerName: 'Acme Corp',          EmailAddress: 'sales@acme.com',        Country: 'US', Currency: 'USD', TaxNumber1: 'US-ACM-01', StreetName: '1 Market St', CityName: 'San Francisco' },
    { Supplier: 'S4-1002', BusinessPartnerName: 'Nordic Components',   EmailAddress: 'info@nordic.se',        Country: 'SE', Currency: 'EUR', TaxNumber1: 'SE-NOR-77', StreetName: 'Kungsgatan 2', CityName: 'Stockholm' },
    { Supplier: 'S4-1003', BusinessPartnerName: 'Pacific Traders',     EmailAddress: 'hello@pacifictr.au',    Country: 'AU', Currency: 'AUD', TaxNumber1: 'AU-PAC-33', StreetName: 'George St 9', CityName: 'Sydney' }
  ];
}

/**
 * syncVendorsFromS4 - upsert vendors from S/4HANA.
 * Matches existing vendors by externalSystemId (or taxId); creates new ones as PENDING.
 */
async function syncVendorsFromS4(req) {
  const db = await cds.connect.to('db');
  const { Vendors } = db.entities('vim');

  let suppliers;
  try {
    const s4 = await cds.connect.to('S4_BUSINESS_PARTNER');
    // A_Supplier is the Business Partner supplier view
    suppliers = await s4.run(SELECT.from('A_Supplier').limit(200));
  } catch (e) {
    // No destination in dev / connection failed -> fall back to mock data
    if (process.env.NODE_ENV === 'production') {
      return req.error(502, 'Failed to connect to S/4HANA system. Please check destination configuration.');
    }
    suppliers = mockSuppliers();
  }

  let created = 0, updated = 0, failed = 0;
  for (const bp of suppliers) {
    try {
      const mapped = mapSupplierToVendor(bp);
      const existing = await SELECT.one.from(Vendors).where(
        mapped.externalSystemId ? { externalSystemId: mapped.externalSystemId } : { taxId: mapped.taxId }
      );
      if (existing) {
        await UPDATE(Vendors, existing.ID).set(mapped);
        updated++;
      } else {
        await INSERT.into(Vendors).entries(Object.assign({ status: 'PENDING' }, mapped));
        created++;
      }
    } catch (err) {
      failed++;
    }
  }

  const message = failed
    ? `Sync completed with errors. ${created + updated} vendors synced successfully. ${failed} vendors failed.`
    : `Vendor sync completed successfully! Total: ${suppliers.length}, created: ${created}, updated: ${updated}`;

  return { totalInS4: suppliers.length, created, updated, failed, message };
}

module.exports = { syncVendorsFromS4, mapSupplierToVendor };
