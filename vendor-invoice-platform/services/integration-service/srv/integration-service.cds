using integration from '../db/schema';

/**
 * IntegrationService - imports Business Partner (Supplier) data from S/4HANA and
 * upserts it into vendor-service. Records every run in SyncRuns.
 */
@path: '/odata/v4/integration'
@requires: 'authenticated-user'
service IntegrationService {

  @readonly
  entity SyncRuns as projection on integration.SyncRuns;

  @(requires: ['Admin', 'internal'])
  action syncVendorsFromS4() returns {
    total   : Integer;
    created : Integer;
    updated : Integer;
    failed  : Integer;
    status  : String;
    message : String;
  };
}
