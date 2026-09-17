const axios = require('axios');

const triggerBuildWorkflow = async ({ buildId, platform }) => {
  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_WORKFLOW,
    GITHUB_BRANCH,
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_WORKFLOW || !GITHUB_BRANCH) {
    throw new Error('GitHub configuration is missing required environment variables');
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`;

  await axios.post(
    url,
    {
      ref: GITHUB_BRANCH,
      inputs: {
        build_id: buildId,
        platform,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  return true;
};

module.exports = {
  triggerBuildWorkflow,
};
