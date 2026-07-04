using invoice from '../db/schema';

/**
 * InvoiceService - owns invoices, line items and attachments.
 * - Verifies the vendor is APPROVED by calling vendor-service on create.
 * - Row-level security for VendorManager is applied in the READ handler
 *   (their vendor ids are fetched from vendor-service).
 * - applyDecision() is the internal state-machine endpoint driven by
 *   approval-service (submit/approve/reject/pay).
 */
@path: '/odata/v4/invoice'
@requires: 'authenticated-user'
service InvoiceService {

  @cds.redirection.target
  @restrict: [
    { grant: 'READ', to: ['Admin', 'internal', 'Approver'] },
    { grant: 'READ', to: 'Viewer', where: 'status = ''APPROVED''' },
    { grant: 'READ', to: 'VendorManager' },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['Admin', 'VendorManager', 'internal'] }
  ]
  entity Invoices as projection on invoice.Invoices;

  entity InvoiceItems as projection on invoice.InvoiceItems;
  entity Attachments  as projection on invoice.Attachments;

  // Internal state-machine endpoint driven by approval-service.
  // Unbound (bound-action @requires is not honored reliably in CAP).
  @(requires: 'internal')
  action applyDecision(
    invoiceID : UUID,
    decision  : String(10),
    actor     : String(120),
    comments  : String(500)
  ) returns Invoices;

  @readonly
  entity InvoiceAnalytics as
    select from invoice.Invoices {
      key vendorID,
          vendorName,
          currency.code as currency,
          count(*)     as totalInvoices : Integer,
          sum(amount)  as totalAmount   : Decimal(15,2),
          sum(case when status = 'DRAFT'     then 1 else 0 end) as draftCount     : Integer,
          sum(case when status = 'SUBMITTED' then 1 else 0 end) as submittedCount : Integer,
          sum(case when status = 'APPROVED'  then 1 else 0 end) as approvedCount  : Integer,
          sum(case when status = 'REJECTED'  then 1 else 0 end) as rejectedCount  : Integer
    }
    group by vendorID, vendorName, currency.code;
}
