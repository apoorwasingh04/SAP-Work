using AdminService as service from './admin-service';

/* ===========================================================================
   Value help + status criticality
=========================================================================== */
annotate service.Invoices with {
  vendor @(
    Common.Text: vendor.vendorName,
    Common.TextArrangement: #TextOnly,
    Common.ValueList: {
      CollectionPath: 'Vendors',
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: vendor_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'vendorName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'status' }
      ]
    }
  );
}

// Semantic status colouring (criticality): 1 red, 2 yellow, 3 green
annotate service.Invoices with {
  status @Common.Text: status @(
    UI.TextArrangement: #TextOnly
  );
}

annotate service.Invoices with @(
  UI.StatusCriticalityCalculation: []  // handled by criticality path below
);

/* ===========================================================================
   List Report
=========================================================================== */
annotate service.Invoices with @(
  UI.SelectionFields: [ vendor_ID, status, invoiceDate, amount ],

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: invoiceNumber, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: vendor_ID, Label: 'Vendor' },
    { $Type: 'UI.DataField', Value: invoiceDate },
    { $Type: 'UI.DataField', Value: dueDate },
    { $Type: 'UI.DataField', Value: amount },
    { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency' },
    { $Type: 'UI.DataField', Value: status, Criticality: statusCriticality },
    { $Type: 'UI.DataFieldForAction', Action: 'AdminService.submitForApproval', Label: 'Submit for Approval' },
    { $Type: 'UI.DataFieldForAction', Action: 'AdminService.approveInvoice',    Label: 'Approve' },
    { $Type: 'UI.DataFieldForAction', Action: 'AdminService.rejectInvoice',     Label: 'Reject' }
  ],

  UI.PresentationVariant: {
    SortOrder: [ { Property: invoiceDate, Descending: true } ],
    Visualizations: ['@UI.LineItem']
  }
);

/* ===========================================================================
   Object Page  (Header + 4 facets)
=========================================================================== */
annotate service.Invoices with @(
  UI.HeaderInfo: {
    TypeName: 'Invoice',
    TypeNamePlural: 'Invoices',
    Title:       { Value: invoiceNumber },
    Description: { Value: vendor.vendorName }
  },

  UI.HeaderFacets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Status', Label: 'Status' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Audit',  Label: 'Audit' }
  ],

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'General',  Label: 'General Information', Target: '@UI.FieldGroup#General' },
    { $Type: 'UI.ReferenceFacet', ID: 'Items',    Label: 'Line Items',         Target: 'items/@UI.LineItem' },
    { $Type: 'UI.ReferenceFacet', ID: 'Attach',   Label: 'Attachments',        Target: 'attachments/@UI.LineItem' },
    { $Type: 'UI.ReferenceFacet', ID: 'History',  Label: 'Approval History',   Target: 'history/@UI.LineItem' }
  ],

  UI.FieldGroup #General: { Data: [
    { Value: invoiceNumber },
    { Value: vendor_ID, Label: 'Vendor' },
    { Value: invoiceDate },
    { Value: dueDate },
    { Value: amount },
    { Value: currency_code, Label: 'Currency' },
    { Value: status, Criticality: statusCriticality }
  ]},

  UI.FieldGroup #Status: { Data: [
    { Value: status, Criticality: statusCriticality }
  ]},

  UI.FieldGroup #Audit: { Data: [
    { Value: createdBy, Label: 'Created By' },
    { Value: createdAt, Label: 'Created At' },
    { Value: submittedBy, Label: 'Submitted By' },
    { Value: approvedBy,  Label: 'Approved By' },
    { Value: rejectedBy,  Label: 'Rejected By' },
    { Value: rejectionReason, Label: 'Rejection Reason' }
  ]}
);

// Line items table on the object page
annotate service.InvoiceItems with @(
  UI.LineItem: [
    { Value: lineNumber,  Label: 'Line No' },
    { Value: description },
    { Value: quantity },
    { Value: unitPrice },
    { Value: totalAmount }
  ]
);

// Attachments table
annotate service.Attachments with @(
  UI.LineItem: [
    { Value: fileName },
    { Value: fileSize },
    { Value: uploadedBy },
    { Value: uploadedAt }
  ]
);

// Approval history timeline (read-only)
annotate service.ApprovalHistory with @(
  UI.LineItem: [
    { Value: action },
    { Value: actor },
    { Value: actionAt },
    { Value: comments }
  ],
  UI.PresentationVariant: { SortOrder: [ { Property: actionAt, Descending: false } ] }
);
