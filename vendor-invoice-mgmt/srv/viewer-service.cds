using vim from '../db/schema';

/**
 * ViewerService - read-only access to APPROVED invoices and analytics.
 * Restricted to the Viewer role.
 */
@path: '/viewer'
@requires: 'Viewer'
@readonly
service ViewerService {

  entity Invoices as
    projection on vim.Invoices
    where status = 'APPROVED';

  entity InvoiceItems    as projection on vim.InvoiceItems;
  entity ApprovalHistory as projection on vim.ApprovalHistory;
  entity Vendors         as projection on vim.Vendors;

  entity InvoiceAnalytics as
    select from vim.Invoices {
      key vendor.ID          as vendorID,
          vendor.vendorName  as vendorName,
          currency.code      as currency,
          count(*)           as totalInvoices : Integer,
          sum(amount)        as totalAmount   : Decimal(15,2)
    }
    where status = 'APPROVED'
    group by vendor.ID, vendor.vendorName, currency.code;
}
