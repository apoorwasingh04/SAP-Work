'use strict';

const remote = require('./remote');

function base() {
  return process.env.VENDOR_SERVICE_URL || 'http://vendor-service:4004/odata/v4/vendor';
}

async function upsertVendors(items) {
  return remote.request(base(), '/upsertVendors', { method: 'POST', body: { items } });
}

module.exports = { upsertVendors };
