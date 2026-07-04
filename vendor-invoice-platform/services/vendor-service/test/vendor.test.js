const cds = require('@sap/cds');
const { GET, POST, expect } = cds.test(__dirname + '/..');

const asAdmin   = { auth: { username: 'admin',   password: 'admin' } };
const asManager = { auth: { username: 'manager', password: 'manager' } };
const asViewer  = { auth: { username: 'viewer',  password: 'viewer' } };
const asSystem  = { auth: { username: 'system',  password: 'system-secret' } };

const V = '/odata/v4/vendor';

describe('VendorService', () => {
  it('Admin sees all 10 seeded vendors', async () => {
    const { data } = await GET(`${V}/Vendors`, asAdmin);
    expect(data.value.length).to.equal(10);
  });

  it('row-level security: manager sees only their assigned vendors', async () => {
    const { data } = await GET(`${V}/Vendors`, asManager);
    expect(data.value.length).to.equal(3); // Acme, Supply Chain Co, Equipment Rental
    data.value.forEach(v => expect(v.assignedManager).to.equal('manager'));
  });

  it('rejects vendor creation by a Viewer (403)', async () => {
    await expect(
      POST(`${V}/Vendors`, { vendorName: 'Hacker LLC' }, asViewer)
    ).to.be.rejectedWith(/403/);
  });

  it('approve action flips a PENDING vendor to APPROVED', async () => {
    const { data } = await GET(`${V}/Vendors?$filter=status eq 'PENDING'&$top=1`, asAdmin);
    const id = data.value[0].ID;
    const res = await POST(`${V}/Vendors(${id})/VendorService.approve`, {}, asAdmin);
    expect(res.data.status).to.equal('APPROVED');
  });

  it('upsertVendors creates a new vendor and updates an existing one', async () => {
    const res = await POST(`${V}/upsertVendors`, {
      items: [
        { vendorName: 'Acme Corp UPDATED', externalSystemId: 'S4-1001', currency: 'USD' }, // existing
        { vendorName: 'Brand New GmbH',    externalSystemId: 'S4-9999', currency: 'EUR' }   // new
      ]
    }, asSystem);
    expect(res.data.created).to.equal(1);
    expect(res.data.updated).to.equal(1);
    expect(res.data.failed).to.equal(0);
  });

  it('upsert is internal-only: a normal Admin token cannot call it', async () => {
    // 'internal' scope is required; admin lacks it
    await expect(
      POST(`${V}/upsertVendors`, { items: [] }, asAdmin)
    ).to.be.rejectedWith(/403/);
  });
});
