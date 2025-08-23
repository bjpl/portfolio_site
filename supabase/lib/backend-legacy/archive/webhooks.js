/**
 * Webhook Management Routes
 * Third-party integrations and event notifications
 */

const express = require('express');
const crypto = require('crypto');
const { body, query, param } = require('express-validator');
const webhookService = require('../../services/webhookService');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { cacheMiddleware, clearCache } = require('../../middleware/cache');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/v2/webhooks:
 *   get:
 *     summary: List all webhooks
 *     description: Retrieve all configured webhooks with their status and statistics
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, active, inactive, error]
 *           default: all
 *       - name: event
 *         in: query
 *         schema:
 *           type: string
 *           enum: [content.created, content.updated, content.deleted, user.created, analytics.report]
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: List of webhooks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 webhooks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Webhook'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     inactive:
 *                       type: integer
 *                     error:
 *                       type: integer
 */
router.get('/', [
  query('status').optional().isIn(['all', 'active', 'inactive', 'error']),
  query('event').optional().isIn(['content.created', 'content.updated', 'content.deleted', 'user.created', 'analytics.report']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], cacheMiddleware(300), async (req, res) => {
  try {
    const {
      status = 'all',
      event,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      status: status === 'all' ? undefined : status,
      event
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await webhookService.listWebhooks(filters, options);

    res.json(result);
  } catch (error) {
    logger.error('Error listing webhooks:', error);
    res.status(500).json({
      error: 'Failed to retrieve webhooks',
      code: 'WEBHOOKS_LIST_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/webhooks:
 *   post:
 *     summary: Create a new webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWebhookRequest'
 *           examples:
 *             content_webhook:
 *               summary: Content management webhook
 *               value:
 *                 name: "Slack Content Notifications"
 *                 url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
 *                 events: ["content.created", "content.updated", "content.deleted"]
 *                 secret: "your-webhook-secret-key"
 *                 isActive: true
 *             analytics_webhook:
 *               summary: Analytics reporting webhook
 *               value:
 *                 name: "Weekly Analytics Report"
 *                 url: "https://api.example.com/analytics/webhook"
 *                 events: ["analytics.report"]
 *                 secret: "analytics-secret-key"
 *                 isActive: true
 *     responses:
 *       201:
 *         description: Webhook created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Webhook'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be under 100 characters'),
  body('url').isURL({ protocols: ['http', 'https'] }).withMessage('Valid URL is required'),
  body('events').isArray({ min: 1 }).withMessage('At least one event must be specified'),
  body('events.*').isIn(['content.created', 'content.updated', 'content.deleted', 'user.created', 'analytics.report']),
  body('secret').optional().isLength({ min: 16, max: 256 }).withMessage('Secret must be 16-256 characters'),
  body('isActive').optional().isBoolean(),
  body('retryAttempts').optional().isInt({ min: 0, max: 5 }),
  body('timeout').optional().isInt({ min: 1000, max: 30000 }),
  validateRequest
], async (req, res) => {
  try {
    const {
      name,
      url,
      events,
      secret,
      isActive = true,
      retryAttempts = 3,
      timeout = 10000
    } = req.body;

    // Generate secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

    const webhookData = {
      name,
      url,
      events,
      secret: webhookSecret,
      isActive,
      retryAttempts,
      timeout,
      createdBy: req.user.id
    };

    const webhook = await webhookService.createWebhook(webhookData);

    clearCache('webhooks_*');

    logger.info(`Webhook created: ${webhook.id}`, {
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      userId: req.user.id
    });

    res.status(201).json(webhook);
  } catch (error) {
    logger.error('Error creating webhook:', error);
    
    if (error.code === 'WEBHOOK_URL_EXISTS') {
      return res.status(409).json({
        error: 'A webhook with this URL already exists',
        code: 'WEBHOOK_URL_EXISTS',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to create webhook',
      code: 'WEBHOOK_CREATE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/webhooks/{id}:
 *   get:
 *     summary: Get webhook details
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: includeDeliveries
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include recent delivery attempts
 *       - name: deliveryLimit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Webhook details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Webhook'
 *                 - type: object
 *                   properties:
 *                     deliveries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           event:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [success, failed, pending]
 *                           statusCode:
 *                             type: integer
 *                           responseTime:
 *                             type: number
 *                           attempts:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           nextRetry:
 *                             type: string
 *                             format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', [
  param('id').isLength({ min: 1 }),
  query('includeDeliveries').optional().isBoolean(),
  query('deliveryLimit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const {
      includeDeliveries = false,
      deliveryLimit = 10
    } = req.query;

    const webhook = await webhookService.getWebhookById(id, {
      includeDeliveries: includeDeliveries === 'true',
      deliveryLimit: parseInt(deliveryLimit)
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        code: 'WEBHOOK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    res.json(webhook);
  } catch (error) {
    logger.error('Error fetching webhook:', error);
    res.status(500).json({
      error: 'Failed to fetch webhook',
      code: 'WEBHOOK_FETCH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/webhooks/{id}:
 *   put:
 *     summary: Update webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateWebhookRequest'
 *     responses:
 *       200:
 *         description: Webhook updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Webhook'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', [
  param('id').isLength({ min: 1 }),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('url').optional().isURL({ protocols: ['http', 'https'] }),
  body('events').optional().isArray({ min: 1 }),
  body('events.*').optional().isIn(['content.created', 'content.updated', 'content.deleted', 'user.created', 'analytics.report']),
  body('secret').optional().isLength({ min: 16, max: 256 }),
  body('isActive').optional().isBoolean(),
  body('retryAttempts').optional().isInt({ min: 0, max: 5 }),
  body('timeout').optional().isInt({ min: 1000, max: 30000 }),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingWebhook = await webhookService.getWebhookById(id);
    if (!existingWebhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        code: 'WEBHOOK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    updateData.updatedBy = req.user.id;
    updateData.updatedAt = new Date();

    const updatedWebhook = await webhookService.updateWebhook(id, updateData);

    clearCache(`webhook_${id}`);
    clearCache('webhooks_*');

    logger.info(`Webhook updated: ${id}`, {
      changes: Object.keys(updateData),
      userId: req.user.id
    });

    res.json(updatedWebhook);
  } catch (error) {
    logger.error('Error updating webhook:', error);
    res.status(500).json({
      error: 'Failed to update webhook',
      code: 'WEBHOOK_UPDATE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/webhooks/{id}:
 *   delete:
 *     summary: Delete webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Webhook deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', [
  param('id').isLength({ min: 1 }),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;

    const existingWebhook = await webhookService.getWebhookById(id);
    if (!existingWebhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        code: 'WEBHOOK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    await webhookService.deleteWebhook(id);

    clearCache(`webhook_${id}`);
    clearCache('webhooks_*');

    logger.info(`Webhook deleted: ${id}`, {
      name: existingWebhook.name,
      userId: req.user.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    res.status(500).json({
      error: 'Failed to delete webhook',
      code: 'WEBHOOK_DELETE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/webhooks/{id}/test:
 *   post:
 *     summary: Test webhook
 *     description: Send a test payload to the webhook to verify it's working correctly
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [content.created, content.updated, content.deleted, user.created, analytics.report]
 *                 description: Event type to simulate (must be in webhook's events list)
 *               testData:
 *                 type: object
 *                 description: Custom test data to send
 *     responses:
 *       200:
 *         description: Test webhook result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 responseTime:
 *                   type: number
 *                   description: Response time in milliseconds
 *                 responseHeaders:
 *                   type: object
 *                 responseBody:
 *                   type: string
 *                 errorMessage:
 *                   type: string
 *                 testedAt:
 *                   type: string
 *                   format: date-time
 */
router.post('/:id/test', [
  param('id').isLength({ min: 1 }),
  body('event').optional().isIn(['content.created', 'content.updated', 'content.deleted', 'user.created', 'analytics.report']),
  body('testData').optional().isObject(),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { event, testData } = req.body;

    const webhook = await webhookService.getWebhookById(id);
    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        code: 'WEBHOOK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // Use first event if none specified
    const testEvent = event || webhook.events[0];

    // Validate event is supported by webhook
    if (!webhook.events.includes(testEvent)) {
      return res.status(400).json({
        error: `Webhook does not support event '${testEvent}'`,
        code: 'UNSUPPORTED_EVENT',
        supportedEvents: webhook.events,
        timestamp: new Date().toISOString()
      });
    }

    const testResult = await webhookService.testWebhook(id, testEvent, testData, req.user.id);

    logger.info(`Webhook test completed: ${id}`, {
      event: testEvent,
      success: testResult.success,
      statusCode: testResult.statusCode,
      userId: req.user.id
    });

    res.json(testResult);
  } catch (error) {
    logger.error('Error testing webhook:', error);
    res.status(500).json({
      error: 'Failed to test webhook',
      code: 'WEBHOOK_TEST_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/webhooks/{id}/deliveries:
 *   get:
 *     summary: Get webhook delivery history
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, success, failed, pending]
 *           default: all
 *       - name: event
 *         in: query
 *         schema:
 *           type: string
 *       - name: dateFrom
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: dateTo
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Webhook delivery history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deliveries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       event:
 *                         type: string
 *                       status:
 *                         type: string
 *                       statusCode:
 *                         type: integer
 *                       responseTime:
 *                         type: number
 *                       attempts:
 *                         type: integer
 *                       payload:
 *                         type: object
 *                       response:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     success:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     avgResponseTime:
 *                       type: number
 */
router.get('/:id/deliveries', [
  param('id').isLength({ min: 1 }),
  query('status').optional().isIn(['all', 'success', 'failed', 'pending']),
  query('event').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status = 'all',
      event,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    const webhook = await webhookService.getWebhookById(id);
    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        code: 'WEBHOOK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    const filters = {
      status: status === 'all' ? undefined : status,
      event,
      dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : undefined
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const deliveries = await webhookService.getWebhookDeliveries(id, filters, options);

    res.json(deliveries);
  } catch (error) {
    logger.error('Error fetching webhook deliveries:', error);
    res.status(500).json({
      error: 'Failed to fetch webhook deliveries',
      code: 'WEBHOOK_DELIVERIES_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/webhooks/{id}/deliveries/{deliveryId}/retry:
 *   post:
 *     summary: Retry failed webhook delivery
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: deliveryId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery retry result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deliveryId:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *                 responseTime:
 *                   type: number
 *                 retriedAt:
 *                   type: string
 *                   format: date-time
 */
router.post('/:id/deliveries/:deliveryId/retry', [
  param('id').isLength({ min: 1 }),
  param('deliveryId').isLength({ min: 1 }),
  validateRequest
], async (req, res) => {
  try {
    const { id, deliveryId } = req.params;

    const retryResult = await webhookService.retryWebhookDelivery(id, deliveryId, req.user.id);

    if (!retryResult) {
      return res.status(404).json({
        error: 'Webhook delivery not found or cannot be retried',
        code: 'DELIVERY_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Webhook delivery retried: ${deliveryId}`, {
      webhookId: id,
      success: retryResult.success,
      userId: req.user.id
    });

    res.json(retryResult);
  } catch (error) {
    logger.error('Error retrying webhook delivery:', error);
    res.status(500).json({
      error: 'Failed to retry webhook delivery',
      code: 'DELIVERY_RETRY_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;