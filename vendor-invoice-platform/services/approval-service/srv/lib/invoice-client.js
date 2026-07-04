'use strict';

// Client over invoice-service. Isolated for unit-test mocking.
const remote = require('./remote');

function base() {
  return process.env.INVOICE_SERVICE_URL || 'http://invoice-service:4004/odata/v4/invoice';
}

async function applyDecision(invoiceID, decision, actor, comments) {
  return remote.request(base(), '/applyDecision', {
    method: 'POST',
    body: { invoiceID, decision, actor, comments: comments || '' }
  });
}

module.exports = { applyDecision };
