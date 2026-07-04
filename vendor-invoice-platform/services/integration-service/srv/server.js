const cds = require('@sap/cds');

cds.on('bootstrap', (app) => {
  app.get('/health', (_req, res) =>
    res.status(200).json({ status: 'UP', service: process.env.SERVICE_NAME || 'integration-service' })
  );
});

module.exports = cds.server;
