'use strict';

// Thin client over vendor-service. Isolated in its own module so unit tests can
// mock it (jest.mock) without needing a running vendor-service.

const remote = require('./remote');

function base() {
  return process.env.VENDOR_SERVICE_URL || 'http://vendor-service:4004/odata/v4/vendor';
}

async function getVendor(id) {
  return remote.request(base(), `/Vendors(${id})?$select=ID,status,vendorName`);
}

async function listVendorIdsForManager(managerId) {
  const r = await remote.request(
    base(),
    `/Vendors?$filter=assignedManager eq '${managerId}'&$select=ID`
  );
  return (r && r.value ? r.value : []).map((v) => v.ID);
}

module.exports = { getVendor, listVendorIdsForManager };
