using vim from '../db/schema';

/**
 * ApproverService - read submitted invoices + approve / reject actions.
 * Restricted to the Approver role.
 */
@path: '/approver'
@requires: 'Approver'
service ApproverService {

  @readonly
  entity Invoices as projection on vim.Invoices actions {
    action approveInvoice(comments : String(500));
    action rejectInvoice(reason : String(500) not null);
  };

  @readonly entity InvoiceItems    as projection on vim.InvoiceItems;
  @readonly entity Attachments     as projection on vim.Attachments;
  @readonly entity ApprovalHistory as projection on vim.ApprovalHistory;
  @readonly entity Vendors         as projection on vim.Vendors;
}
