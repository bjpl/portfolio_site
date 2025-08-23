/**
 * API Routes Index
 * Main API router with versioning support
 */

const express = require('express');
const { specs, swaggerUi, swaggerUiOptions } = require('../../utils/swagger');
const { errorHandler, notFoundHandler } = require('../../middleware/errorHandler');

// Import API versions
const v1Routes = require('./v1');

const router = express.Router();

// API Documentation
router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(specs, swaggerUiOptions));

// OpenAPI spec endpoints
router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

router.get('/openapi.yaml', (req, res) => {
  const yaml = require('yaml');
  res.setHeader('Content-Type', 'application/yaml');
  res.send(yaml.stringify(specs));
});

// API version routing
router.use('/v1', v1Routes);

// Default to v1 for now
router.use('/', v1Routes);

// Handle 404s for API routes
router.use('*', notFoundHandler);

// Error handling for API routes
router.use(errorHandler);

module.exports = router;