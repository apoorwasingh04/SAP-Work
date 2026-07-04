namespace approval;

using { cuid } from '@sap/cds/common';

type HistoryAction : String(10) enum { SUBMITTED; APPROVED; REJECTED; PAID; }

/**
 * Audit trail of every workflow transition. References the invoice by UUID
 * (owned by invoice-service) plus a denormalized invoiceNumber for display.
 */
entity ApprovalHistory : cuid {
  invoiceID     : UUID          @title: 'Invoice';
  invoiceNumber : String(40)    @title: 'Invoice Number';
  action        : HistoryAction @title: 'Action';
  actor         : String(120)   @title: 'Actor';
  actionAt      : Timestamp     @title: 'Timestamp';
  comments      : String(500)   @title: 'Comments';
}
