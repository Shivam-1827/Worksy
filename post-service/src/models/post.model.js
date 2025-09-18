
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Post = sequelize.define(
  "Post",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    professionalTags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    postType: {
      type: DataTypes.ENUM("ARTICLE", "VIDEO", "AUDIO"),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    mediaUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("PROCESSING", "COMPLETED", "FAILED"),
      defaultValue: "PROCESSING",
    },
  },
  {
    timestamps: true,
    tableName: "posts",
  }
);

module.exports = Post;
