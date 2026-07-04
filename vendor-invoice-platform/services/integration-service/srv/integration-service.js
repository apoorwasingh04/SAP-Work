const cds = require('@sap/cds');
const s4 = require('./lib/s4');
const vendorClient = require('./lib/vendor-client');

module.exports = class IntegrationService extends cds.ApplicationService {
  async init() {
    const { SyncRuns } = this.entities;

    this.on('syncVendorsFromS4', async (req) => {
      const startedAt = new Date().toISOString();

      // 1. pull from S/4HANA (or mock)
      let suppliers;
      try {
        suppliers = await s4.fetchSuppliers();
      } catch (e) {
        await INSERT.into(SyncRuns).entries({
          startedAt, finishedAt: new Date().toISOString(),
          totalInS4: 0, created: 0, updated: 0, failed: 0,
          status: 'FAILED', message: 'Failed to connect to S/4HANA system. Please check destination configuration.'
        });
        return req.reject(502, 'Failed to connect to S/4HANA system. Please check destination configuration.');
      }

      // 2. upsert into vendor-service
      let summary;
      try {
        summary = await vendorClient.upsertVendors(suppliers);
      } catch (e) {
        await INSERT.into(SyncRuns).entries({
          startedAt, finishedAt: new Date().toISOString(),
          totalInS4: suppliers.length, created: 0, updated: 0, failed: suppliers.length,
          status: 'FAILED', message: 'vendor-service upsert failed: ' + e.message
        });
        return req.reject(502, 'Vendor service is unavailable, please retry');
      }

      // 3. log and return summary
      const status = summary.failed ? 'PARTIAL' : 'SUCCESS';
      const message = summary.failed
        ? `Sync completed with errors. ${summary.created + summary.updated} synced, ${summary.failed} failed.`
        : `Vendor sync completed successfully! Total: ${suppliers.length}, created: ${summary.created}, updated: ${summary.updated}`;

      await INSERT.into(SyncRuns).entries({
        startedAt, finishedAt: new Date().toISOString(),
        totalInS4: suppliers.length, created: summary.created, updated: summary.updated, failed: summary.failed,
        status, message
      });

      return {
        total: suppliers.length,
        created: summary.created,
        updated: summary.updated,
        failed: summary.failed,
        status,
        message
      };
    });

    await super.init();
  }
};
