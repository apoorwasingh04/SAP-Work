using vim from '../db/schema';

/**
 * VendorManagerService - read/write invoices for the manager's OWN vendors only.
 * Row-level security is enforced in the handler (vendor.assignedManager = user id).
 * Restricted to the VendorManager role.
 */
@path: '/vendor-manager'
@requires: 'VendorManager'
service VendorManagerService {

  @odata.draft.enabled
  entity Invoices as projection on vim.Invoices actions {
    action submitForApproval();
  };

  entity InvoiceItems    as projection on vim.InvoiceItems;
  entity Attachments     as projection on vim.Attachments;
  entity ApprovalHistory as projection on vim.ApprovalHistory;

  // Value-help / dropdown source: only the manager's assigned, APPROVED vendors
  @readonly
  entity Vendors as projection on vim.Vendors;
}
