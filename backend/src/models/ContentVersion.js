const { DataTypes } = require('sequelize');

const { sequelize } = require('./User');

const ContentVersion = sequelize.define(
  'ContentVersion',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    contentId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID of the content this version belongs to',
    },

    contentType: {
      type: DataTypes.ENUM('post', 'project', 'page', 'component'),
      allowNull: false,
      comment: 'Type of content',
    },

    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Version number',
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'The actual content in markdown or HTML',
    },

    frontMatter: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'YAML front matter as JSON',
    },

    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Additional metadata like tags, categories, etc.',
    },

    diff: {
      type: DataTypes.JSON,
      defaultValue: null,
      comment: 'Diff from previous version',
    },

    changeType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['create', 'update', 'delete', 'publish', 'unpublish', 'restore']],
      },
    },

    changeMessage: {
      type: DataTypes.TEXT,
      comment: 'Commit message describing the change',
    },

    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'User who made this change',
    },

    authorName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Name of the author at the time of change',
    },

    authorEmail: {
      type: DataTypes.STRING(255),
      comment: 'Email of the author at the time of change',
    },

    publishedAt: {
      type: DataTypes.DATE,
      comment: 'When this version was published',
    },

    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    isDraft: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    hash: {
      type: DataTypes.STRING(64),
      unique: true,
      comment: 'SHA256 hash of the content for integrity',
    },

    size: {
      type: DataTypes.INTEGER,
      comment: 'Size of content in bytes',
    },

    wordCount: {
      type: DataTypes.INTEGER,
      comment: 'Number of words in content',
    },

    readingTime: {
      type: DataTypes.INTEGER,
      comment: 'Estimated reading time in minutes',
    },

    previousVersionId: {
      type: DataTypes.UUID,
      comment: 'ID of the previous version',
    },

    branchName: {
      type: DataTypes.STRING(100),
      defaultValue: 'main',
      comment: 'Branch name for content branching',
    },

    mergedFromId: {
      type: DataTypes.UUID,
      comment: 'ID of version this was merged from',
    },

    conflictResolution: {
      type: DataTypes.JSON,
      comment: 'Details of any conflict resolution',
    },

    reviewStatus: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'approved', 'rejected', 'changes_requested']],
      },
    },

    reviewedBy: {
      type: DataTypes.UUID,
      comment: 'User who reviewed this version',
    },

    reviewedAt: {
      type: DataTypes.DATE,
      comment: 'When this version was reviewed',
    },

    reviewNotes: {
      type: DataTypes.TEXT,
      comment: 'Review notes or feedback',
    },

    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },

    categories: {
      type: DataTypes.JSON,
      defaultValue: [],
    },

    attachments: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'List of attached files or media',
    },

    seoMetadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'SEO-specific metadata',
    },

    socialMetadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Social media metadata (OG tags, Twitter cards)',
    },

    expiresAt: {
      type: DataTypes.DATE,
      comment: 'When this version should expire or be archived',
    },

    scheduledPublishAt: {
      type: DataTypes.DATE,
      comment: 'When this version should be automatically published',
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: 'content_versions',
    indexes: [
      {
        fields: ['contentId', 'version'],
        unique: true,
      },
      {
        fields: ['slug'],
      },
      {
        fields: ['authorId'],
      },
      {
        fields: ['hash'],
        unique: true,
      },
      {
        fields: ['branchName'],
      },
      {
        fields: ['isPublished'],
      },
      {
        fields: ['createdAt'],
      },
      {
        fields: ['publishedAt'],
      },
      {
        fields: ['tags'],
        using: 'gin',
      },
      {
        fields: ['categories'],
        using: 'gin',
      },
    ],
  }
);

// Instance methods
ContentVersion.prototype.toJSON = function () {
  const values = { ...this.get() };

  // Remove sensitive data
  delete values.deletedAt;

  return values;
};

ContentVersion.prototype.calculateHash = function () {
  const crypto = require('crypto');
  const contentString = JSON.stringify({
    content: this.content,
    frontMatter: this.frontMatter,
    metadata: this.metadata,
  });

  return crypto.createHash('sha256').update(contentString).digest('hex');
};

ContentVersion.prototype.calculateStats = function () {
  const words = this.content.split(/\s+/).filter(w => w.length > 0);
  this.wordCount = words.length;
  this.readingTime = Math.ceil(words.length / 200);
  this.size = Buffer.byteLength(this.content, 'utf8');
};

// Class methods
ContentVersion.getLatestVersion = async function (contentId, options = {}) {
  const { branch = 'main', includeDeleted = false } = options;

  const where = {
    contentId,
    branchName: branch,
  };

  if (!includeDeleted) {
    where.isDeleted = false;
  }

  return this.findOne({
    where,
    order: [['version', 'DESC']],
  });
};

ContentVersion.getPublishedVersion = async function (contentId) {
  return this.findOne({
    where: {
      contentId,
      isPublished: true,
      isDeleted: false,
    },
    order: [['publishedAt', 'DESC']],
  });
};

ContentVersion.getVersionHistory = async function (contentId, options = {}) {
  const { limit = 50, offset = 0, branch = 'main', includeDeleted = false } = options;

  const where = {
    contentId,
    branchName: branch,
  };

  if (!includeDeleted) {
    where.isDeleted = false;
  }

  return this.findAndCountAll({
    where,
    order: [['version', 'DESC']],
    limit,
    offset,
  });
};

ContentVersion.createDiff = function (oldContent, newContent) {
  const diff = require('diff');
  return diff.createPatch('content', oldContent, newContent);
};

ContentVersion.applyDiff = function (content, diffPatch) {
  const diff = require('diff');
  return diff.applyPatch(content, diffPatch);
};

// Hooks
ContentVersion.beforeCreate(async version => {
  // Calculate hash
  version.hash = version.calculateHash();

  // Calculate stats
  version.calculateStats();

  // Set version number
  if (!version.version) {
    const lastVersion = await ContentVersion.findOne({
      where: {
        contentId: version.contentId,
        branchName: version.branchName,
      },
      order: [['version', 'DESC']],
    });

    version.version = lastVersion ? lastVersion.version + 1 : 1;
  }

  // Create diff from previous version
  if (version.previousVersionId) {
    const previousVersion = await ContentVersion.findByPk(version.previousVersionId);
    if (previousVersion) {
      version.diff = ContentVersion.createDiff(previousVersion.content, version.content);
    }
  }
});

ContentVersion.beforeUpdate(async version => {
  // Recalculate hash if content changed
  if (version.changed('content') || version.changed('frontMatter') || version.changed('metadata')) {
    version.hash = version.calculateHash();
    version.calculateStats();
  }
});

module.exports = ContentVersion;
