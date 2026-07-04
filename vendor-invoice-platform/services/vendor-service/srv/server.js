const cds = require('@sap/cds');

// Liveness/readiness probe for container orchestration (12-factor IX: disposability).
cds.on('bootstrap', (app) => {
  app.get('/health', (_req, res) =>
    res.status(200).json({ status: 'UP', service: process.env.SERVICE_NAME || 'vendor-service' })
  );
});

module.exports = cds.server;
