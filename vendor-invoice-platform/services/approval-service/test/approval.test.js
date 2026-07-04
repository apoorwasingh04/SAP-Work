// invoice-client mocked -> unit tests do not require a running invoice-service.
jest.mock('../srv/lib/invoice-client', () => ({ applyDecision: jest.fn() }));

const cds = require('@sap/cds');
const invoiceClient = require('../srv/lib/invoice-client');
const { GET, POST, expect } = cds.test(__dirname + '/..');

const asAdmin    = { auth: { username: 'admin',    password: 'admin' } };
const asApprover = { auth: { username: 'approver', password: 'approver' } };
const asViewer   = { auth: { username: 'viewer',   password: 'viewer' } };

const A = '/odata/v4/approval';
const INV = '22222222-2222-4222-8222-222222222222';

beforeEach(() => invoiceClient.applyDecision.mockReset());

describe('ApprovalService', () => {
  it('loads the seeded audit trail (25 entries)', async () => {
    const { data } = await GET(`${A}/ApprovalHistory`, asAdmin);
    expect(data.value.length).to.equal(25);
  });

  it('approveInvoice drives the state machine and writes a history entry', async () => {
    invoiceClient.applyDecision.mockResolvedValue({ ID: INV, invoiceNumber: 'INV-777', status: 'APPROVED' });

    const before = (await GET(`${A}/ApprovalHistory/$count`, asApprover)).data;
    const res = await POST(`${A}/approveInvoice`, { invoiceID: INV, comments: 'ok' }, asApprover);

    expect(res.data.status).to.equal('APPROVED');
    expect(invoiceClient.applyDecision).toHaveBeenCalledWith(INV, 'APPROVED', 'approver', 'ok');

    const after = (await GET(`${A}/ApprovalHistory/$count`, asApprover)).data;
    expect(after).to.equal(before + 1);
  });

  it('rejectInvoice requires a reason', async () => {
    await expect(POST(`${A}/rejectInvoice`, { invoiceID: INV, reason: '  ' }, asApprover))
      .to.be.rejectedWith(/reason is mandatory/);
    expect(invoiceClient.applyDecision).not.toHaveBeenCalled();
  });

  it('propagates downstream errors (e.g. approving your own invoice)', async () => {
    invoiceClient.applyDecision.mockRejectedValue({
      status: 403, data: { error: { message: 'You cannot approve your own submitted invoice' } }
    });
    await expect(POST(`${A}/approveInvoice`, { invoiceID: INV, comments: 'x' }, asApprover))
      .to.be.rejectedWith(/your own/);
  });

  it('a Viewer cannot approve (403)', async () => {
    await expect(POST(`${A}/approveInvoice`, { invoiceID: INV, comments: 'x' }, asViewer))
      .to.be.rejectedWith(/403/);
  });
});
