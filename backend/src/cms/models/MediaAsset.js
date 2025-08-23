const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MediaAsset = sequelize.define('MediaAsset', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    altText: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    category: {
      type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'archive'),
      allowNull: false
    },
    isOptimized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    optimizedVersions: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    cdnUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    uploaderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['filename']
      },
      {
        fields: ['mimeType']
      },
      {
        fields: ['category']
      },
      {
        fields: ['uploaderId']
      }
    ]
  });

  MediaAsset.associate = (models) => {
    MediaAsset.belongsTo(models.User, {
      foreignKey: 'uploaderId',
      as: 'uploader'
    });
    
    MediaAsset.belongsToMany(models.Blog, {
      through: 'BlogMediaAssets',
      as: 'blogs'
    });
    
    MediaAsset.belongsToMany(models.Project, {
      through: 'ProjectMediaAssets', 
      as: 'projects'
    });
  };

  return MediaAsset;
};