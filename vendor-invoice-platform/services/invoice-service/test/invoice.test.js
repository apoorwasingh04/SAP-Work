// vendor-client is mocked so these are true UNIT tests (no vendor-service needed).
jest.mock('../srv/lib/vendor-client', () => ({
  getVendor: jest.fn(),
  listVendorIdsForManager: jest.fn()
}));

const cds = require('@sap/cds');
const vendorClient = require('../srv/lib/vendor-client');
const { GET, POST, expect } = cds.test(__dirname + '/..');

const asAdmin   = { auth: { username: 'admin',   password: 'admin' } };
const asViewer  = { auth: { username: 'viewer',  password: 'viewer' } };
const asSystem  = { auth: { username: 'system',  password: 'system-secret' } };

const I = '/odata/v4/invoice';
const SOME_VENDOR = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vendorClient.getVendor.mockReset();
  vendorClient.listVendorIdsForManager.mockReset();
});

describe('InvoiceService', () => {
  it('Admin reads all 20 seeded invoices', async () => {
    const { data } = await GET(`${I}/Invoices`, asAdmin);
    expect(data.value.length).to.equal(20);
  });

  it('Viewer only sees APPROVED invoices (6)', async () => {
    const { data } = await GET(`${I}/Invoices`, asViewer);
    expect(data.value.length).to.equal(6);
    data.value.forEach(i => expect(i.status).to.equal('APPROVED'));
  });

  it('creating an invoice for an APPROVED vendor succeeds and denormalizes the name', async () => {
    vendorClient.getVendor.mockResolvedValue({ ID: SOME_VENDOR, status: 'APPROVED', vendorName: 'Acme Corp' });
    const { data } = await POST(`${I}/Invoices`, {
      invoiceNumber: 'INV-UNIT-1', vendorID: SOME_VENDOR,
      invoiceDate: '2025-01-10', amount: 100, currency_code: 'USD'
    }, asAdmin);
    expect(data.status).to.equal('DRAFT');
    expect(data.vendorName).to.equal('Acme Corp');
  });

  it('rejects an invoice for a non-approved vendor', async () => {
    vendorClient.getVendor.mockResolvedValue({ ID: SOME_VENDOR, status: 'PENDING', vendorName: 'New Vendor' });
    await expect(POST(`${I}/Invoices`, {
      invoiceNumber: 'INV-UNIT-2', vendorID: SOME_VENDOR,
      invoiceDate: '2025-01-10', amount: 100, currency_code: 'USD'
    }, asAdmin)).to.be.rejectedWith(/approved vendor/);
  });

  it('rejects a future-dated invoice', async () => {
    vendorClient.getVendor.mockResolvedValue({ ID: SOME_VENDOR, status: 'APPROVED', vendorName: 'Acme Corp' });
    await expect(POST(`${I}/Invoices`, {
      invoiceNumber: 'INV-UNIT-3', vendorID: SOME_VENDOR,
      invoiceDate: '2999-01-01', amount: 100, currency_code: 'USD'
    }, asAdmin)).to.be.rejectedWith(/future/);
  });

  it('applyDecision: cannot approve your own submission, but another approver can', async () => {
    // pick a seeded SUBMITTED invoice (submittedBy = 'manager')
    const { data } = await GET(`${I}/Invoices?$filter=status eq 'SUBMITTED'&$top=1`, asAdmin);
    const id = data.value[0].ID;
    const call = (body) => POST(`${I}/applyDecision`, body, asSystem);

    await expect(call({ invoiceID: id, decision: 'APPROVED', actor: 'manager', comments: 'x' }))
      .to.be.rejectedWith(/your own/);

    const ok = await call({ invoiceID: id, decision: 'APPROVED', actor: 'approver', comments: 'looks good' });
    expect(ok.data.status).to.equal('APPROVED');
  });

  it('applyDecision: submitting a draft with matching line-item totals works', async () => {
    const { data } = await GET(`${I}/Invoices?$filter=status eq 'DRAFT'&$top=1`, asAdmin);
    const id = data.value[0].ID;
    const res = await POST(`${I}/applyDecision`,
      { invoiceID: id, decision: 'SUBMITTED', actor: 'manager', comments: '' }, asSystem);
    expect(res.data.status).to.equal('SUBMITTED');
  });

  it('applyDecision is internal-only (Admin token is refused)', async () => {
    const { data } = await GET(`${I}/Invoices?$top=1`, asAdmin);
    const id = data.value[0].ID;
    await expect(POST(`${I}/applyDecision`,
      { invoiceID: id, decision: 'PAID', actor: 'admin', comments: '' }, asAdmin)).to.be.rejectedWith(/403/);
  });
});
