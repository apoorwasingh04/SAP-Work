'use strict';

// Fetches suppliers from the S/4HANA Business Partner API (A_Supplier) and maps
// them to the vendor-service VendorIn shape. Falls back to mock data when no
// S/4HANA destination is configured (local dev / demo).

function mapSupplier(bp) {
  return {
    vendorName: bp.BusinessPartnerName || bp.OrganizationBPName1 || bp.SupplierName,
    email: bp.EmailAddress || null,
    phone: bp.PhoneNumber || null,
    address: bp.StreetName ? `${bp.StreetName}, ${bp.CityName || ''}`.trim() : null,
    country: bp.Country || null,
    currency: bp.Currency || 'USD',
    taxId: bp.TaxNumber1 || bp.BusinessPartnerTaxNumber || null,
    externalSystemId: bp.Supplier || bp.BusinessPartner
  };
}

function mockSuppliers() {
  return [
    { Supplier: 'S4-1001', BusinessPartnerName: 'Acme Corp',        EmailAddress: 'sales@acme.com',     Country: 'US', Currency: 'USD', TaxNumber1: 'US-ACM-01', StreetName: '1 Market St', CityName: 'San Francisco' },
    { Supplier: 'S4-2001', BusinessPartnerName: 'Nordic Components', EmailAddress: 'info@nordic.se',     Country: 'SE', Currency: 'EUR', TaxNumber1: 'SE-NOR-77', StreetName: 'Kungsgatan 2', CityName: 'Stockholm' },
    { Supplier: 'S4-2002', BusinessPartnerName: 'Pacific Traders',   EmailAddress: 'hello@pacifictr.au', Country: 'AU', Currency: 'AUD', TaxNumber1: 'AU-PAC-33', StreetName: 'George St 9', CityName: 'Sydney' }
  ];
}

async function fetchSuppliers() {
  const baseUrl = process.env.S4_BASE_URL;
  if (!baseUrl) return mockSuppliers().map(mapSupplier);

  const headers = { accept: 'application/json' };
  if (process.env.S4_USER) {
    headers.authorization = 'Basic ' + Buffer.from(`${process.env.S4_USER}:${process.env.S4_PASSWORD || ''}`).toString('base64');
  }
  const url = baseUrl.replace(/\/+$/, '') + '/A_Supplier?$top=200&$format=json';
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = new Error(`S/4HANA responded ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  const rows = (body.d && body.d.results) || body.value || [];
  return rows.map(mapSupplier);
}

module.exports = { fetchSuppliers, mapSupplier };
