const express = require('express');

const router = express.Router();
const { body, param, query } = require('express-validator');

const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const versioningService = require('../services/versioningService');
const logger = require('../utils/logger');

// Create a new version
router.post(
  '/versions',
  authenticate,
  requireRole(['admin', 'editor', 'author']),
  [
    body('contentId').isUUID().withMessage('Valid content ID required'),
    body('contentType').isIn(['post', 'project', 'page', 'component']).withMessage('Invalid content type'),
    body('title').notEmpty().withMessage('Title is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('changeMessage').optional().isString(),
    body('branch').optional().isString().default('main'),
  ],
  validate,
  async (req, res) => {
    try {
      const versionData = {
        ...req.body,
        authorId: req.user.id,
        authorName: req.user.name || req.user.username,
        authorEmail: req.user.email,
      };

      const version = await versioningService.createVersion(versionData);

      logger.audit('version_created', req.user.id, {
        versionId: version.id,
        contentId: version.contentId,
        version: version.version,
      });

      res.status(201).json({
        success: true,
        version,
      });
    } catch (error) {
      logger.error('Failed to create version', { error, userId: req.user.id });
      res.status(500).json({
        success: false,
        error: 'Failed to create version',
      });
    }
  }
);

// Get version history
router.get(
  '/versions/:contentId/history',
  authenticate,
  [
    param('contentId').isUUID().withMessage('Valid content ID required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('branch').optional().isString(),
    query('includeDeleted').optional().isBoolean().toBoolean(),
  ],
  validate,
  async (req, res) => {
    try {
      const { contentId } = req.params;
      const { limit = 50, offset = 0, branch = 'main', includeDeleted = false } = req.query;

      const history = await versioningService.getVersionHistory(contentId, {
        limit,
        offset,
        branch,
        includeDeleted,
      });

      res.json({
        success: true,
        history: history.rows,
        total: history.count,
        limit,
        offset,
      });
    } catch (error) {
      logger.error('Failed to get version history', { error, contentId: req.params.contentId });
      res.status(500).json({
        success: false,
        error: 'Failed to get version history',
      });
    }
  }
);

// Compare two versions
router.get(
  '/versions/:versionId1/compare/:versionId2',
  authenticate,
  [
    param('versionId1').isUUID().withMessage('Valid version ID required'),
    param('versionId2').isUUID().withMessage('Valid version ID required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { versionId1, versionId2 } = req.params;

      const diff = await versioningService.getDiff(versionId1, versionId2);

      res.json({
        success: true,
        diff,
      });
    } catch (error) {
      logger.error('Failed to compare versions', { error, versionId1: req.params.versionId1 });
      res.status(500).json({
        success: false,
        error: 'Failed to compare versions',
      });
    }
  }
);

// Restore a version
router.post(
  '/versions/:versionId/restore',
  authenticate,
  requireRole(['admin', 'editor']),
  [param('versionId').isUUID().withMessage('Valid version ID required')],
  validate,
  async (req, res) => {
    try {
      const { versionId } = req.params;

      const authorData = {
        id: req.user.id,
        name: req.user.name || req.user.username,
        email: req.user.email,
      };

      const restoredVersion = await versioningService.restoreVersion(versionId, authorData);

      logger.audit('version_restored', req.user.id, {
        versionId,
        restoredVersionId: restoredVersion.id,
      });

      res.json({
        success: true,
        version: restoredVersion,
      });
    } catch (error) {
      logger.error('Failed to restore version', { error, versionId: req.params.versionId });
      res.status(500).json({
        success: false,
        error: 'Failed to restore version',
      });
    }
  }
);

// Publish a version
router.post(
  '/versions/:versionId/publish',
  authenticate,
  requireRole(['admin', 'editor']),
  [
    param('versionId').isUUID().withMessage('Valid version ID required'),
    body('scheduledPublishAt').optional().isISO8601().toDate(),
  ],
  validate,
  async (req, res) => {
    try {
      const { versionId } = req.params;
      const { scheduledPublishAt } = req.body;

      const publishedVersion = await versioningService.publishVersion(versionId, {
        scheduledPublishAt,
      });

      logger.audit('version_published', req.user.id, {
        versionId,
        scheduledPublishAt,
      });

      res.json({
        success: true,
        version: publishedVersion,
      });
    } catch (error) {
      logger.error('Failed to publish version', { error, versionId: req.params.versionId });
      res.status(500).json({
        success: false,
        error: 'Failed to publish version',
      });
    }
  }
);

// Create a branch
router.post(
  '/versions/:versionId/branch',
  authenticate,
  requireRole(['admin', 'editor', 'author']),
  [
    param('versionId').isUUID().withMessage('Valid version ID required'),
    body('branchName')
      .notEmpty()
      .withMessage('Branch name is required')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Branch name must be lowercase alphanumeric with hyphens'),
  ],
  validate,
  async (req, res) => {
    try {
      const { versionId } = req.params;
      const { branchName } = req.body;

      const authorData = {
        id: req.user.id,
        name: req.user.name || req.user.username,
        email: req.user.email,
      };

      const branchVersion = await versioningService.createBranch(versionId, branchName, authorData);

      logger.audit('branch_created', req.user.id, {
        versionId,
        branchName,
        branchVersionId: branchVersion.id,
      });

      res.json({
        success: true,
        version: branchVersion,
      });
    } catch (error) {
      logger.error('Failed to create branch', { error, versionId: req.params.versionId });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create branch',
      });
    }
  }
);

// Merge branches
router.post(
  '/versions/merge',
  authenticate,
  requireRole(['admin', 'editor']),
  [
    body('contentId').isUUID().withMessage('Valid content ID required'),
    body('sourceBranch').notEmpty().withMessage('Source branch is required'),
    body('targetBranch').notEmpty().withMessage('Target branch is required'),
    body('strategy').optional().isIn(['merge', 'useSource', 'useTarget']).default('merge'),
    body('conflictResolution').optional().isObject(),
  ],
  validate,
  async (req, res) => {
    try {
      const { contentId, sourceBranch, targetBranch, strategy, conflictResolution } = req.body;

      const authorData = {
        id: req.user.id,
        name: req.user.name || req.user.username,
        email: req.user.email,
      };

      const result = await versioningService.mergeBranches(sourceBranch, targetBranch, contentId, authorData, {
        strategy,
        conflictResolution,
      });

      logger.audit('branches_merged', req.user.id, {
        contentId,
        sourceBranch,
        targetBranch,
        mergedVersionId: result.version.id,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to merge branches', { error, contentId: req.body.contentId });
      res.status(500).json({
        success: false,
        error: 'Failed to merge branches',
      });
    }
  }
);

// Schedule publication
router.post(
  '/versions/:versionId/schedule',
  authenticate,
  requireRole(['admin', 'editor']),
  [
    param('versionId').isUUID().withMessage('Valid version ID required'),
    body('publishAt')
      .isISO8601()
      .toDate()
      .withMessage('Valid publish date required')
      .custom(value => new Date(value) > new Date())
      .withMessage('Publish date must be in the future'),
  ],
  validate,
  async (req, res) => {
    try {
      const { versionId } = req.params;
      const { publishAt } = req.body;

      const scheduledVersion = await versioningService.schedulePublication(versionId, publishAt);

      logger.audit('publication_scheduled', req.user.id, {
        versionId,
        publishAt,
      });

      res.json({
        success: true,
        version: scheduledVersion,
      });
    } catch (error) {
      logger.error('Failed to schedule publication', { error, versionId: req.params.versionId });
      res.status(500).json({
        success: false,
        error: 'Failed to schedule publication',
      });
    }
  }
);

// Process scheduled publications (admin only, typically called by cron job)
router.post('/versions/process-scheduled', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const results = await versioningService.processScheduledPublications();

    logger.audit('scheduled_publications_processed', req.user.id, {
      total: results.length,
      successful: results.filter(r => r.success).length,
    });

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('Failed to process scheduled publications', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process scheduled publications',
    });
  }
});

// Cleanup old versions (admin only)
router.delete(
  '/versions/cleanup',
  authenticate,
  requireRole(['admin']),
  [
    body('keepVersions').optional().isInt({ min: 1 }).default(100),
    body('olderThanDays').optional().isInt({ min: 1 }).default(90),
    body('keepPublished').optional().isBoolean().default(true),
  ],
  validate,
  async (req, res) => {
    try {
      const { keepVersions, olderThanDays, keepPublished } = req.body;

      const deletedCount = await versioningService.cleanupOldVersions({
        keepVersions,
        olderThanDays,
        keepPublished,
      });

      logger.audit('versions_cleaned_up', req.user.id, {
        deletedCount,
        keepVersions,
        olderThanDays,
        keepPublished,
      });

      res.json({
        success: true,
        deletedCount,
      });
    } catch (error) {
      logger.error('Failed to cleanup old versions', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup old versions',
      });
    }
  }
);

module.exports = router;
