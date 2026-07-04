using vim from '../db/schema';

/**
 * AdminService - full CRUD on all entities, analytics, S/4HANA sync.
 * Restricted to the Admin role.
 */
@path: '/admin'
@requires: 'Admin'
service AdminService {

  @odata.draft.enabled
  entity Invoices as projection on vim.Invoices actions {
    action submitForApproval();
    action approveInvoice(comments : String(500));
    action rejectInvoice(reason : String(500) not null);
    action markAsPaid();
  };

  entity InvoiceItems    as projection on vim.InvoiceItems;
  entity Attachments     as projection on vim.Attachments;
  entity ApprovalHistory as projection on vim.ApprovalHistory;
  entity Vendors         as projection on vim.Vendors actions {
    action approveVendor();
  };

  // Unbound action: import suppliers from S/4HANA Business Partner API
  action syncVendorsFromS4() returns {
    totalInS4        : Integer;
    created          : Integer;
    updated          : Integer;
    failed           : Integer;
    message          : String;
  };

  // Aggregated analytics for the reports dashboard
  @readonly
  @cds.redirection.target
  entity InvoiceAnalytics as
    select from vim.Invoices {
      key vendor.ID           as vendorID,
          vendor.vendorName   as vendorName,
          currency.code       as currency,
          count(*)            as totalInvoices  : Integer,
          sum(amount)         as totalAmount    : Decimal(15,2),
          sum(case when status = 'DRAFT'     then 1 else 0 end) as draftCount     : Integer,
          sum(case when status = 'SUBMITTED' then 1 else 0 end) as submittedCount : Integer,
          sum(case when status = 'APPROVED'  then 1 else 0 end) as approvedCount  : Integer,
          sum(case when status = 'REJECTED'  then 1 else 0 end) as rejectedCount  : Integer
    }
    group by vendor.ID, vendor.vendorName, currency.code;
}
