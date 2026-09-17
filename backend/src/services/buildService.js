const { randomUUID } = require('crypto');
const builds = require('../store/buildStore');

const createBuild = config => {
  const buildId = `BUILD-${randomUUID()}`;

  const build = {
    buildId,

    status: 'SAVED',

    createdAt: new Date().toISOString(),

    config: {
      ...config,
    },
  };

  builds.set(buildId, build);

  return build;
};

const getBuild = buildId => {
  return builds.get(buildId);
};

const markBuildQueued = (buildId, platform) => {
  const build = builds.get(buildId);

  if (!build) {
    return null;
  }

  build.status = 'QUEUED';
  build.platform = platform;
  build.publishedAt = new Date().toISOString();

  return build;
};

module.exports = {
  createBuild,
  getBuild,
  markBuildQueued,
};