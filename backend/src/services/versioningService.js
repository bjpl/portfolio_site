const crypto = require('crypto');

const diff = require('diff');
const { Op } = require('sequelize');

const ContentVersion = require('../models/ContentVersion');
const logger = require('../utils/logger');

class VersioningService {
  /**
   * Create a new version of content
   */
  async createVersion(contentData, options = {}) {
    const {
      contentId,
      contentType,
      title,
      slug,
      content,
      frontMatter = {},
      metadata = {},
      authorId,
      authorName,
      authorEmail,
      changeMessage = 'Content updated',
      changeType = 'update',
      branch = 'main',
      isDraft = true,
    } = contentData;

    try {
      // Get the previous version
      const previousVersion = await ContentVersion.getLatestVersion(contentId, { branch });

      // Create new version
      const newVersion = await ContentVersion.create({
        contentId,
        contentType,
        title,
        slug,
        content,
        frontMatter,
        metadata,
        authorId,
        authorName,
        authorEmail,
        changeMessage,
        changeType,
        branchName: branch,
        isDraft,
        previousVersionId: previousVersion ? previousVersion.id : null,
        version: previousVersion ? previousVersion.version + 1 : 1,
      });

      logger.info('Content version created', {
        contentId,
        versionId: newVersion.id,
        version: newVersion.version,
        authorId,
      });

      return newVersion;
    } catch (error) {
      logger.error('Failed to create content version', error);
      throw error;
    }
  }

  /**
   * Get version history for content
   */
  async getVersionHistory(contentId, options = {}) {
    const { limit = 50, offset = 0, branch = 'main', includeDeleted = false } = options;

    try {
      const history = await ContentVersion.getVersionHistory(contentId, {
        limit,
        offset,
        branch,
        includeDeleted,
      });

      // Add comparison info
      const versions = history.rows;
      for (let i = 0; i < versions.length - 1; i++) {
        const current = versions[i];
        const previous = versions[i + 1];

        current.changes = this.compareVersions(previous, current);
      }

      return history;
    } catch (error) {
      logger.error('Failed to get version history', error);
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  compareVersions(oldVersion, newVersion) {
    const changes = {
      content: {
        added: 0,
        removed: 0,
        modified: false,
      },
      frontMatter: {},
      metadata: {},
    };

    // Compare content
    if (oldVersion.content !== newVersion.content) {
      const patch = diff.createPatch('content', oldVersion.content, newVersion.content);
      const lines = patch.split('\n');

      lines.forEach(line => {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          changes.content.added++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          changes.content.removed++;
        }
      });

      changes.content.modified = true;
    }

    // Compare front matter
    const oldFrontMatter = oldVersion.frontMatter || {};
    const newFrontMatter = newVersion.frontMatter || {};

    const allKeys = new Set([...Object.keys(oldFrontMatter), ...Object.keys(newFrontMatter)]);

    allKeys.forEach(key => {
      if (oldFrontMatter[key] !== newFrontMatter[key]) {
        changes.frontMatter[key] = {
          old: oldFrontMatter[key],
          new: newFrontMatter[key],
        };
      }
    });

    return changes;
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(versionId, authorData) {
    try {
      const versionToRestore = await ContentVersion.findByPk(versionId);

      if (!versionToRestore) {
        throw new Error('Version not found');
      }

      // Create a new version with the restored content
      const restoredVersion = await this.createVersion({
        contentId: versionToRestore.contentId,
        contentType: versionToRestore.contentType,
        title: versionToRestore.title,
        slug: versionToRestore.slug,
        content: versionToRestore.content,
        frontMatter: versionToRestore.frontMatter,
        metadata: versionToRestore.metadata,
        authorId: authorData.id,
        authorName: authorData.name,
        authorEmail: authorData.email,
        changeMessage: `Restored from version ${versionToRestore.version}`,
        changeType: 'restore',
        branch: versionToRestore.branchName,
      });

      logger.info('Version restored', {
        versionId,
        restoredVersionId: restoredVersion.id,
        authorId: authorData.id,
      });

      return restoredVersion;
    } catch (error) {
      logger.error('Failed to restore version', error);
      throw error;
    }
  }

  /**
   * Publish a version
   */
  async publishVersion(versionId, publishData = {}) {
    try {
      const version = await ContentVersion.findByPk(versionId);

      if (!version) {
        throw new Error('Version not found');
      }

      // Unpublish any currently published version
      await ContentVersion.update(
        { isPublished: false },
        {
          where: {
            contentId: version.contentId,
            isPublished: true,
          },
        }
      );

      // Publish this version
      version.isPublished = true;
      version.isDraft = false;
      version.publishedAt = new Date();

      if (publishData.scheduledPublishAt) {
        version.scheduledPublishAt = publishData.scheduledPublishAt;
      }

      await version.save();

      logger.info('Version published', {
        versionId,
        contentId: version.contentId,
        version: version.version,
      });

      return version;
    } catch (error) {
      logger.error('Failed to publish version', error);
      throw error;
    }
  }

  /**
   * Create a branch from a version
   */
  async createBranch(versionId, branchName, authorData) {
    try {
      const sourceVersion = await ContentVersion.findByPk(versionId);

      if (!sourceVersion) {
        throw new Error('Source version not found');
      }

      // Check if branch already exists
      const existingBranch = await ContentVersion.findOne({
        where: {
          contentId: sourceVersion.contentId,
          branchName,
        },
      });

      if (existingBranch) {
        throw new Error(`Branch ${branchName} already exists`);
      }

      // Create new version in the new branch
      const branchVersion = await this.createVersion({
        contentId: sourceVersion.contentId,
        contentType: sourceVersion.contentType,
        title: sourceVersion.title,
        slug: sourceVersion.slug,
        content: sourceVersion.content,
        frontMatter: sourceVersion.frontMatter,
        metadata: sourceVersion.metadata,
        authorId: authorData.id,
        authorName: authorData.name,
        authorEmail: authorData.email,
        changeMessage: `Created branch ${branchName} from version ${sourceVersion.version}`,
        changeType: 'create',
        branch: branchName,
      });

      logger.info('Branch created', {
        branchName,
        sourceVersionId: versionId,
        newVersionId: branchVersion.id,
      });

      return branchVersion;
    } catch (error) {
      logger.error('Failed to create branch', error);
      throw error;
    }
  }

  /**
   * Merge branches
   */
  async mergeBranches(sourceBranch, targetBranch, contentId, authorData, options = {}) {
    const { strategy = 'merge', conflictResolution = {} } = options;

    try {
      // Get latest versions from both branches
      const sourceVersion = await ContentVersion.getLatestVersion(contentId, {
        branch: sourceBranch,
      });

      const targetVersion = await ContentVersion.getLatestVersion(contentId, {
        branch: targetBranch,
      });

      if (!sourceVersion || !targetVersion) {
        throw new Error('Branch versions not found');
      }

      // Check for conflicts
      const conflicts = this.detectConflicts(sourceVersion, targetVersion);

      let mergedContent = targetVersion.content;
      let mergedFrontMatter = targetVersion.frontMatter;
      let mergedMetadata = targetVersion.metadata;

      if (conflicts.length > 0) {
        // Apply conflict resolution
        const resolved = this.resolveConflicts(sourceVersion, targetVersion, conflictResolution);

        mergedContent = resolved.content;
        mergedFrontMatter = resolved.frontMatter;
        mergedMetadata = resolved.metadata;
      } else {
        // No conflicts, use source version
        mergedContent = sourceVersion.content;
        mergedFrontMatter = sourceVersion.frontMatter;
        mergedMetadata = sourceVersion.metadata;
      }

      // Create merged version
      const mergedVersion = await this.createVersion({
        contentId,
        contentType: sourceVersion.contentType,
        title: sourceVersion.title,
        slug: sourceVersion.slug,
        content: mergedContent,
        frontMatter: mergedFrontMatter,
        metadata: mergedMetadata,
        authorId: authorData.id,
        authorName: authorData.name,
        authorEmail: authorData.email,
        changeMessage: `Merged ${sourceBranch} into ${targetBranch}`,
        changeType: 'update',
        branch: targetBranch,
        mergedFromId: sourceVersion.id,
        conflictResolution: conflicts.length > 0 ? conflictResolution : null,
      });

      logger.info('Branches merged', {
        sourceBranch,
        targetBranch,
        contentId,
        mergedVersionId: mergedVersion.id,
        conflictsResolved: conflicts.length,
      });

      return {
        version: mergedVersion,
        conflicts,
        resolved: conflicts.length > 0,
      };
    } catch (error) {
      logger.error('Failed to merge branches', error);
      throw error;
    }
  }

  /**
   * Detect conflicts between versions
   */
  detectConflicts(version1, version2) {
    const conflicts = [];

    // Check content conflicts
    if (version1.content !== version2.content) {
      const contentDiff = diff.diffLines(version1.content, version2.content);
      const hasConflict = contentDiff.some(part => part.added && part.removed);

      if (hasConflict) {
        conflicts.push({
          type: 'content',
          description: 'Content has conflicting changes',
        });
      }
    }

    // Check front matter conflicts
    const fm1 = version1.frontMatter || {};
    const fm2 = version2.frontMatter || {};

    Object.keys(fm1).forEach(key => {
      if (fm2[key] !== undefined && fm1[key] !== fm2[key]) {
        conflicts.push({
          type: 'frontMatter',
          field: key,
          value1: fm1[key],
          value2: fm2[key],
        });
      }
    });

    return conflicts;
  }

  /**
   * Resolve conflicts between versions
   */
  resolveConflicts(sourceVersion, targetVersion, resolution) {
    const resolved = {
      content: targetVersion.content,
      frontMatter: { ...targetVersion.frontMatter },
      metadata: { ...targetVersion.metadata },
    };

    // Apply resolution strategy
    if (resolution.strategy === 'useSource') {
      resolved.content = sourceVersion.content;
      resolved.frontMatter = sourceVersion.frontMatter;
      resolved.metadata = sourceVersion.metadata;
    } else if (resolution.strategy === 'useTarget') {
      // Already set to target
    } else if (resolution.strategy === 'manual') {
      // Apply manual resolutions
      if (resolution.content) {
        resolved.content = resolution.content;
      }

      if (resolution.frontMatter) {
        Object.assign(resolved.frontMatter, resolution.frontMatter);
      }

      if (resolution.metadata) {
        Object.assign(resolved.metadata, resolution.metadata);
      }
    }

    return resolved;
  }

  /**
   * Get diff between versions
   */
  async getDiff(versionId1, versionId2) {
    try {
      const version1 = await ContentVersion.findByPk(versionId1);
      const version2 = await ContentVersion.findByPk(versionId2);

      if (!version1 || !version2) {
        throw new Error('Version not found');
      }

      const contentDiff = diff.createPatch(
        'content',
        version1.content,
        version2.content,
        `Version ${version1.version}`,
        `Version ${version2.version}`
      );

      const frontMatterDiff = diff.diffJson(version1.frontMatter || {}, version2.frontMatter || {});

      const metadataDiff = diff.diffJson(version1.metadata || {}, version2.metadata || {});

      return {
        content: contentDiff,
        frontMatter: frontMatterDiff,
        metadata: metadataDiff,
        summary: {
          linesAdded: (contentDiff.match(/^\+/gm) || []).length,
          linesRemoved: (contentDiff.match(/^-/gm) || []).length,
        },
      };
    } catch (error) {
      logger.error('Failed to get diff', error);
      throw error;
    }
  }

  /**
   * Schedule content publication
   */
  async schedulePublication(versionId, publishAt) {
    try {
      const version = await ContentVersion.findByPk(versionId);

      if (!version) {
        throw new Error('Version not found');
      }

      version.scheduledPublishAt = publishAt;
      await version.save();

      logger.info('Publication scheduled', {
        versionId,
        publishAt,
      });

      return version;
    } catch (error) {
      logger.error('Failed to schedule publication', error);
      throw error;
    }
  }

  /**
   * Process scheduled publications
   */
  async processScheduledPublications() {
    try {
      const now = new Date();

      const scheduledVersions = await ContentVersion.findAll({
        where: {
          scheduledPublishAt: {
            [Op.lte]: now,
          },
          isPublished: false,
          isDeleted: false,
        },
      });

      const results = [];

      for (const version of scheduledVersions) {
        try {
          await this.publishVersion(version.id);
          results.push({
            versionId: version.id,
            success: true,
          });
        } catch (error) {
          results.push({
            versionId: version.id,
            success: false,
            error: error.message,
          });
        }
      }

      logger.info('Processed scheduled publications', {
        total: scheduledVersions.length,
        successful: results.filter(r => r.success).length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to process scheduled publications', error);
      throw error;
    }
  }

  /**
   * Clean up old versions
   */
  async cleanupOldVersions(options = {}) {
    const { keepVersions = 100, olderThanDays = 90, keepPublished = true } = options;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Get all content IDs
      const contentIds = await ContentVersion.findAll({
        attributes: ['contentId'],
        group: ['contentId'],
        raw: true,
      });

      let totalDeleted = 0;

      for (const { contentId } of contentIds) {
        // Get versions to keep
        const versionsToKeep = await ContentVersion.findAll({
          where: {
            contentId,
            [Op.or]: [{ isPublished: !!keepPublished }, { createdAt: { [Op.gte]: cutoffDate } }],
          },
          order: [['version', 'DESC']],
          limit: keepVersions,
          attributes: ['id'],
        });

        const keepIds = versionsToKeep.map(v => v.id);

        // Delete old versions
        const deleted = await ContentVersion.destroy({
          where: {
            contentId,
            id: { [Op.notIn]: keepIds },
            createdAt: { [Op.lt]: cutoffDate },
          },
        });

        totalDeleted += deleted;
      }

      logger.info('Cleaned up old versions', {
        totalDeleted,
        options,
      });

      return totalDeleted;
    } catch (error) {
      logger.error('Failed to cleanup old versions', error);
      throw error;
    }
  }
}

module.exports = new VersioningService();
