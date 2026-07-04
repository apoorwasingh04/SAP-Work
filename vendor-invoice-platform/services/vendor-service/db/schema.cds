namespace vendor;

using { managed, cuid, Country, Currency } from '@sap/cds/common';

type VendorStatus : String(10) enum {
  PENDING;    // newly synced or created, not yet approved
  APPROVED;   // usable for invoice creation
  SUSPENDED;  // blocked for new invoices
  DELETED;    // soft-deleted
}

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
  assignedManager   : String(120)           @title: 'Assigned Manager';
}
