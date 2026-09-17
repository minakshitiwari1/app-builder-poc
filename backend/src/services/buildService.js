const { createHash, randomBytes, randomUUID, timingSafeEqual } = require('crypto');
const Build = require('../models/Build');

const CI_TOKEN_TTL_MINUTES = Number.parseInt(process.env.CI_TOKEN_TTL_MINUTES, 10) || 10;

const hashCiToken = token => createHash('sha256').update(token).digest('hex');

const secretNameForBuild = buildId =>
  `CI_BUILD_${buildId.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase()}`;

const createBuild = async config => {
  const buildId = `BUILD-${randomUUID()}`;

  return Build.create({
    buildId,
    status: 'SAVED',
    config,
  });
};

const getBuild = buildId => Build.findOne({ buildId });

const markBuildQueued = async (buildId, platform) => {
  return Build.findOneAndUpdate(
    { buildId },
    {
      $set: {
        status: 'QUEUED',
        platform,
        publishedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
};

const issueCiAccess = async buildId => {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + CI_TOKEN_TTL_MINUTES * 60 * 1000);
  const secretName = secretNameForBuild(buildId);

  const build = await Build.findOneAndUpdate(
    { buildId },
    {
      $set: {
        ciAccess: {
          tokenHash: hashCiToken(token),
          expiresAt,
          secretName,
        },
      },
    },
    { returnDocument: 'after' }
  );

  if (!build) {
    return null;
  }

  return { token, expiresAt, secretName };
};

const invalidateCiAccess = buildId =>
  Build.findOneAndUpdate(
    { buildId },
    { $unset: { ciAccess: 1 } },
    { returnDocument: 'after' }
  );

const getBuildWithCiAccess = buildId => Build.findOne({ buildId }).select('+ciAccess');

const consumeCiAccess = (buildId, token) => {
  const tokenHash = hashCiToken(token);

  return Build.findOneAndUpdate(
    {
      buildId,
      'ciAccess.tokenHash': tokenHash,
      'ciAccess.expiresAt': { $gt: new Date() },
      'ciAccess.usedAt': { $exists: false },
    },
    { $set: { 'ciAccess.usedAt': new Date() } },
    { returnDocument: 'after' }
  ).select('+ciAccess');
};

const matchesCiToken = (token, tokenHash) => {
  const suppliedHash = Buffer.from(hashCiToken(token), 'hex');
  const storedHash = Buffer.from(tokenHash, 'hex');

  return suppliedHash.length === storedHash.length && timingSafeEqual(suppliedHash, storedHash);
};

module.exports = {
  createBuild,
  getBuild,
  markBuildQueued,
  issueCiAccess,
  invalidateCiAccess,
  getBuildWithCiAccess,
  consumeCiAccess,
  matchesCiToken,
};
