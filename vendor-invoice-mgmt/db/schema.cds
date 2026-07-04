namespace vim;

using { managed, cuid, Country, Currency } from '@sap/cds/common';

/* ---------------------------------------------------------------------------
   Enumerations for status / action fields
--------------------------------------------------------------------------- */
type VendorStatus  : String(10) enum {
  PENDING;    // newly synced or created, not yet approved
  APPROVED;   // usable for invoice creation
  SUSPENDED;  // blocked for new invoices
  DELETED;    // soft-deleted, hidden from normal views
}

type InvoiceStatus : String(10) enum {
  DRAFT;
  SUBMITTED;
  APPROVED;
  REJECTED;
  PAID;       // optional bonus state
}

type HistoryAction : String(10) enum {
  SUBMITTED;
  APPROVED;
  REJECTED;
  PAID;
}

/* ---------------------------------------------------------------------------
   Vendors  (Business Partner / Supplier master)
--------------------------------------------------------------------------- */
entity Vendors : cuid, managed {
  vendorName        : String(100) not null  @title: 'Vendor Name';
  email             : String(120)           @title: 'Email';
  phone             : String(30)            @title: 'Phone';
  address           : String(255)           @title: 'Address';
  country           : Country               @title: 'Country';
  currency          : Currency              @title: 'Default Currency';
  taxId             : String(30)            @title: 'Tax ID';
  externalSystemId  : String(40)            @title: 'S/4HANA Supplier ID';
  status            : VendorStatus default 'PENDING'  @title: 'Status';
  // user id of the Vendor Manager who owns this vendor (row-level security key)
  assignedManager   : String(120)           @title: 'Assigned Manager';

  invoices          : Association to many Invoices on invoices.vendor = $self;
}

/* ---------------------------------------------------------------------------
   Invoices  (header)
--------------------------------------------------------------------------- */
entity Invoices : cuid, managed {
  invoiceNumber     : String(40) not null   @title: 'Invoice Number';
  vendor            : Association to Vendors not null  @title: 'Vendor';
  invoiceDate       : Date not null          @title: 'Invoice Date';
  dueDate           : Date                   @title: 'Due Date';
  amount            : Decimal(15,2) not null @title: 'Amount'
                        @assert.range: [0.01, 1000000.00];
  currency          : Currency               @title: 'Currency';
  status            : InvoiceStatus default 'DRAFT'  @title: 'Status';

  // UI criticality (calculated on read): 1=red 2=yellow 3=green 0=neutral
  statusCriticality : Integer = case status
                        when 'REJECTED'  then 1
                        when 'SUBMITTED' then 2
                        when 'APPROVED'  then 3
                        when 'PAID'      then 3
                        else 0 end;

  // workflow / audit fields
  submittedBy       : String(120)            @title: 'Submitted By';
  submittedAt       : Timestamp              @title: 'Submitted At';
  approvedBy        : String(120)            @title: 'Approved By';
  approvedAt        : Timestamp              @title: 'Approved At';
  approvalComments  : String(500)            @title: 'Approval Comments';
  rejectedBy        : String(120)            @title: 'Rejected By';
  rejectedAt        : Timestamp              @title: 'Rejected At';
  rejectionReason   : String(500)            @title: 'Rejection Reason';

  // compositions (children owned by the invoice)
  items             : Composition of many InvoiceItems   on items.invoice = $self;
  attachments       : Composition of many Attachments    on attachments.invoice = $self;
  history           : Composition of many ApprovalHistory on history.invoice = $self;
}

// Business Rule #7: invoice number unique per vendor
annotate Invoices with @assert.unique: { invoicePerVendor: [ vendor, invoiceNumber ] };

/* ---------------------------------------------------------------------------
   Invoice Line Items
--------------------------------------------------------------------------- */
entity InvoiceItems : cuid {
  invoice     : Association to Invoices not null;
  lineNumber  : Integer                 @title: 'Line No';
  description : String(255) not null     @title: 'Description';
  quantity    : Decimal(13,3) not null   @title: 'Quantity'   @assert.range: [0.001, 9999999.999];
  unitPrice   : Decimal(15,2) not null   @title: 'Unit Price' @assert.range: [0.01, 1000000.00];
  totalAmount : Decimal(15,2)            @title: 'Total Amount';  // auto = quantity * unitPrice
}

/* ---------------------------------------------------------------------------
   Attachments
--------------------------------------------------------------------------- */
entity Attachments : cuid, managed {
  invoice     : Association to Invoices not null;
  fileName    : String(255)  @title: 'File Name';
  mimeType    : String(100)  @title: 'Media Type' @Core.IsMediaType;
  fileSize    : Integer      @title: 'File Size';
  content     : LargeBinary  @title: 'Content' @Core.MediaType: mimeType;
  uploadedBy  : String(120)  @title: 'Uploaded By';
  uploadedAt  : Timestamp    @title: 'Uploaded At';
}

/* ---------------------------------------------------------------------------
   Approval History  (audit trail)
--------------------------------------------------------------------------- */
entity ApprovalHistory : cuid {
  invoice   : Association to Invoices not null;
  action    : HistoryAction  @title: 'Action';
  actor     : String(120)    @title: 'Actor';
  actionAt  : Timestamp      @title: 'Timestamp';
  comments  : String(500)    @title: 'Comments';
}
