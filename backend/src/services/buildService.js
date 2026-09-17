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

module.exports = {
  createBuild,
  getBuild,
};