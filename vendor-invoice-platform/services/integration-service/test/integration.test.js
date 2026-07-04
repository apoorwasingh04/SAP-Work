// s4 + vendor-client mocked -> no S/4HANA and no vendor-service required.
jest.mock('../srv/lib/s4', () => ({ fetchSuppliers: jest.fn() }));
jest.mock('../srv/lib/vendor-client', () => ({ upsertVendors: jest.fn() }));

const cds = require('@sap/cds');
const s4 = require('../srv/lib/s4');
const vendorClient = require('../srv/lib/vendor-client');
const { GET, POST, expect } = cds.test(__dirname + '/..');

const asAdmin  = { auth: { username: 'admin',  password: 'admin' } };
const asViewer = { auth: { username: 'viewer', password: 'viewer' } };

const N = '/odata/v4/integration';

beforeEach(() => {
  s4.fetchSuppliers.mockReset();
  vendorClient.upsertVendors.mockReset();
});

describe('IntegrationService', () => {
  it('syncVendorsFromS4 returns a summary and logs a SyncRun', async () => {
    s4.fetchSuppliers.mockResolvedValue([{ vendorName: 'A' }, { vendorName: 'B' }, { vendorName: 'C' }]);
    vendorClient.upsertVendors.mockResolvedValue({ total: 3, created: 1, updated: 2, failed: 0 });

    const res = await POST(`${N}/syncVendorsFromS4`, {}, asAdmin);
    expect(res.data.status).to.equal('SUCCESS');
    expect(res.data.total).to.equal(3);
    expect(res.data.created).to.equal(1);

    const runs = await GET(`${N}/SyncRuns`, asAdmin);
    expect(runs.data.value.length).to.equal(1);
    expect(runs.data.value[0].status).to.equal('SUCCESS');
  });

  it('reports PARTIAL when some upserts fail', async () => {
    s4.fetchSuppliers.mockResolvedValue([{ vendorName: 'A' }, { vendorName: 'B' }]);
    vendorClient.upsertVendors.mockResolvedValue({ total: 2, created: 1, updated: 0, failed: 1 });

    const res = await POST(`${N}/syncVendorsFromS4`, {}, asAdmin);
    expect(res.data.status).to.equal('PARTIAL');
    expect(res.data.failed).to.equal(1);
  });

  it('returns 502 and logs FAILED when S/4HANA is unreachable', async () => {
    s4.fetchSuppliers.mockRejectedValue(Object.assign(new Error('conn refused'), { status: 502 }));
    await expect(POST(`${N}/syncVendorsFromS4`, {}, asAdmin)).to.be.rejectedWith(/Failed to connect/);
  });

  it('a Viewer cannot trigger a sync (403)', async () => {
    await expect(POST(`${N}/syncVendorsFromS4`, {}, asViewer)).to.be.rejectedWith(/403/);
  });
});
