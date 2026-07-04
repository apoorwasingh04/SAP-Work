namespace invoice;

using { managed, cuid, Currency } from '@sap/cds/common';

type InvoiceStatus : String(10) enum {
  DRAFT; SUBMITTED; APPROVED; REJECTED; PAID;
}

entity Invoices : cuid, managed {
  invoiceNumber     : String(40) not null   @title: 'Invoice Number';
  // Reference to a vendor owned by vendor-service (UUID only, no cross-db FK).
  vendorID          : UUID not null          @title: 'Vendor';
  vendorName        : String(100)            @title: 'Vendor Name';   // denormalized for display/search
  invoiceDate       : Date not null          @title: 'Invoice Date';
  dueDate           : Date                   @title: 'Due Date';
  amount            : Decimal(15,2) not null @title: 'Amount' @assert.range: [0.01, 1000000.00];
  currency          : Currency               @title: 'Currency';
  status            : InvoiceStatus default 'DRAFT'  @title: 'Status';

  statusCriticality : Integer = case status
                        when 'REJECTED'  then 1
                        when 'SUBMITTED' then 2
                        when 'APPROVED'  then 3
                        when 'PAID'      then 3
                        else 0 end;

  submittedBy       : String(120);  submittedAt : Timestamp;
  approvedBy        : String(120);  approvedAt  : Timestamp;  approvalComments : String(500);
  rejectedBy        : String(120);  rejectedAt  : Timestamp;  rejectionReason  : String(500);

  items             : Composition of many InvoiceItems on items.invoice = $self;
  attachments       : Composition of many Attachments  on attachments.invoice = $self;
}

annotate Invoices with @assert.unique: { invoicePerVendor: [ vendorID, invoiceNumber ] };

entity InvoiceItems : cuid {
  invoice     : Association to Invoices not null;
  lineNumber  : Integer                 @title: 'Line No';
  description : String(255) not null     @title: 'Description';
  quantity    : Decimal(13,3) not null   @title: 'Quantity'   @assert.range: [0.001, 9999999.999];
  unitPrice   : Decimal(15,2) not null   @title: 'Unit Price' @assert.range: [0.01, 1000000.00];
  totalAmount : Decimal(15,2)            @title: 'Total Amount';
}

entity Attachments : cuid, managed {
  invoice     : Association to Invoices not null;
  fileName    : String(255)  @title: 'File Name';
  mimeType    : String(100)  @title: 'Media Type' @Core.IsMediaType;
  fileSize    : Integer      @title: 'File Size';
  content     : LargeBinary  @title: 'Content' @Core.MediaType: mimeType;
  uploadedBy  : String(120);
  uploadedAt  : Timestamp;
}
