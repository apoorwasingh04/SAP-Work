using vendor from '../db/schema';

/**
 * VendorService - owns the vendor master.
 * Row-level security: a VendorManager only sees vendors assigned to them.
 * Writes are restricted to Admin / internal (service-to-service) callers.
 */
@path: '/odata/v4/vendor'
@requires: 'authenticated-user'
service VendorService {

  @restrict: [
    { grant: 'READ', to: ['Admin', 'Approver', 'Viewer', 'internal'] },
    { grant: 'READ', to: 'VendorManager', where: 'assignedManager = $user.managerId' },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['Admin', 'internal'] }
  ]
  entity Vendors as projection on vendor.Vendors actions {
    @(requires: ['Admin', 'internal'])
    action approve() returns Vendors;
  };

  // Input shape for the S/4HANA upsert (called by integration-service)
  type VendorIn : {
    vendorName       : String(100);
    email            : String(120);
    phone            : String(30);
    address          : String(255);
    country          : String(3);
    currency         : String(5);
    taxId            : String(30);
    externalSystemId : String(40);
  };

  @(requires: 'internal')
  action upsertVendors(items : many VendorIn) returns {
    total   : Integer;
    created : Integer;
    updated : Integer;
    failed  : Integer;
  };
}
