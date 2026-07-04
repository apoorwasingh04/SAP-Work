namespace integration;

using { managed, cuid } from '@sap/cds/common';

/** Audit log of each S/4HANA vendor sync run. */
entity SyncRuns : cuid, managed {
  startedAt  : Timestamp   @title: 'Started At';
  finishedAt : Timestamp   @title: 'Finished At';
  totalInS4  : Integer     @title: 'Total in S/4HANA';
  created    : Integer     @title: 'Created';
  updated    : Integer     @title: 'Updated';
  failed     : Integer     @title: 'Failed';
  status     : String(10)  @title: 'Status';   // SUCCESS | PARTIAL | FAILED
  message    : String(500) @title: 'Message';
}
