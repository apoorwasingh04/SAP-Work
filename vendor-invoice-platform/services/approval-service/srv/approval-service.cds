using approval from '../db/schema';

/**
 * ApprovalService - orchestrates the invoice workflow.
 * Each action calls invoice-service.applyDecision() to change the invoice state,
 * then records the transition in its own ApprovalHistory.
 */
@path: '/odata/v4/approval'
@requires: 'authenticated-user'
service ApprovalService {

  @readonly
  entity ApprovalHistory as projection on approval.ApprovalHistory;

  @(requires: ['Admin', 'VendorManager'])
  action submitForApproval(invoiceID : UUID) returns { status : String; invoiceNumber : String; };

  @(requires: ['Admin', 'Approver'])
  action approveInvoice(invoiceID : UUID, comments : String(500)) returns { status : String; invoiceNumber : String; };

  @(requires: ['Admin', 'Approver'])
  action rejectInvoice(invoiceID : UUID, reason : String(500)) returns { status : String; invoiceNumber : String; };

  @(requires: 'Admin')
  action markAsPaid(invoiceID : UUID) returns { status : String; invoiceNumber : String; };
}
