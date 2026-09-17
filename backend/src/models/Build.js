const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema(
  {
    primaryColor: String,
  },
  { _id: false }
);

// Keep this schema open so each saved build retains the complete frontend
// configuration snapshot, including fields added in future iterations.
const configSchema = new mongoose.Schema(
  {
    tenantId: String,
    appName: String,
    environment: String,
    androidPackageName: String,
    iosBundleId: String,
    theme: themeSchema,
  },
  { _id: false, strict: false }
);

const ciAccessSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: Date,
    secretName: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const buildSchema = new mongoose.Schema(
  {
    buildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['SAVED', 'QUEUED', 'BUILDING', 'BUILT', 'FAILED'],
    },
    platform: String,
    config: {
      type: configSchema,
      required: true,
    },
    publishedAt: Date,
    ciAccess: {
      type: ciAccessSchema,
      select: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Build', buildSchema);
