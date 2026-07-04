using InvoiceService as service from './invoice-service';

// Invoices are created/deleted through the workflow (approval-service) and the
// integration flow, not ad-hoc from the List Report. Marking the entity
// non-insertable/non-deletable removes the FE "Create/Delete" buttons (and the
// benign "NewPage creation navigation missing" warning that comes with them).
annotate service.Invoices with @(
  Capabilities.InsertRestrictions: { Insertable: false },
  Capabilities.DeleteRestrictions: { Deletable: false }
);

annotate service.Invoices with @(
  UI.SelectionFields: [ vendorName, status, invoiceDate, amount ],

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: invoiceNumber, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: vendorName,    Label: 'Vendor' },
    { $Type: 'UI.DataField', Value: invoiceDate },
    { $Type: 'UI.DataField', Value: dueDate },
    { $Type: 'UI.DataField', Value: amount },
    { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency' },
    { $Type: 'UI.DataField', Value: status, Criticality: statusCriticality }
  ],

  UI.PresentationVariant: {
    SortOrder: [ { Property: invoiceDate, Descending: true } ],
    Visualizations: [ '@UI.LineItem' ]
  },

  UI.HeaderInfo: {
    TypeName: 'Invoice',
    TypeNamePlural: 'Invoices',
    Title:       { Value: invoiceNumber },
    Description: { Value: vendorName }
  },

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'General', Label: 'General Information', Target: '@UI.FieldGroup#General' },
    { $Type: 'UI.ReferenceFacet', ID: 'Items',   Label: 'Line Items',         Target: 'items/@UI.LineItem' },
    { $Type: 'UI.ReferenceFacet', ID: 'Attach',  Label: 'Attachments',        Target: 'attachments/@UI.LineItem' }
  ],

  UI.FieldGroup #General: { Data: [
    { Value: invoiceNumber },
    { Value: vendorName, Label: 'Vendor' },
    { Value: invoiceDate },
    { Value: dueDate },
    { Value: amount },
    { Value: currency_code, Label: 'Currency' },
    { Value: status, Criticality: statusCriticality },
    { Value: createdBy, Label: 'Created By' },
    { Value: submittedBy, Label: 'Submitted By' },
    { Value: approvedBy, Label: 'Approved By' },
    { Value: rejectedBy, Label: 'Rejected By' },
    { Value: rejectionReason, Label: 'Rejection Reason' }
  ]}
);

annotate service.InvoiceItems with @(
  UI.LineItem: [
    { Value: lineNumber,  Label: 'Line No' },
    { Value: description },
    { Value: quantity },
    { Value: unitPrice },
    { Value: totalAmount }
  ]
);

annotate service.Attachments with @(
  UI.LineItem: [
    { Value: fileName },
    { Value: fileSize },
    { Value: uploadedBy },
    { Value: uploadedAt }
  ]
);
