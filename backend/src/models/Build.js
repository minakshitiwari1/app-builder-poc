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

const ciStatusSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    secretName: { type: String, required: true },
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
    queuedAt: Date,
    buildStartedAt: Date,
    buildCompletedAt: Date,
    failedAt: Date,
    failureReason: String,
    ciAccess: {
      type: ciAccessSchema,
      select: false,
    },
    ciStatus: { type: ciStatusSchema, select: false },
  },
  { timestamps: true }
);

// A package ID identifies an app, not a single immutable build snapshot.
// Multiple releases of the same app intentionally reuse these identifiers.
buildSchema.index({ 'config.androidPackageName': 1 });
buildSchema.index({ 'config.iosBundleId': 1 });

module.exports = mongoose.model('Build', buildSchema);
