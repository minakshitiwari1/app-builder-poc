const axios = require('axios');
const sodium = require('libsodium-wrappers');

const getGitHubConfig = () => {
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

  return { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_WORKFLOW, GITHUB_BRANCH };
};

const githubHeaders = token => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

const createCiTokenSecret = async ({ secretName, token }) => {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = getGitHubConfig();
  const baseUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/secrets`;

  const { data: publicKey } = await axios.get(`${baseUrl}/public-key`, {
    headers: githubHeaders(GITHUB_TOKEN),
  });

  await sodium.ready;
  const encryptedValue = Buffer.from(
    sodium.crypto_box_seal(
      Buffer.from(token),
      Buffer.from(publicKey.key, 'base64')
    )
  ).toString('base64');

  await axios.put(
    `${baseUrl}/${encodeURIComponent(secretName)}`,
    {
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id,
    },
    { headers: githubHeaders(GITHUB_TOKEN) }
  );
};

const removeCiTokenSecret = async secretName => {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = getGitHubConfig();
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/secrets/${encodeURIComponent(secretName)}`;

  try {
    await axios.delete(url, { headers: githubHeaders(GITHUB_TOKEN) });
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error;
    }
  }
};

const triggerBuildWorkflow = async ({ buildId, platform, ciTokenSecretName }) => {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_WORKFLOW, GITHUB_BRANCH } =
    getGitHubConfig();
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`;

  await axios.post(
    url,
    {
      ref: GITHUB_BRANCH,
      inputs: {
        build_id: buildId,
        platform,
        ci_token_secret_name: ciTokenSecretName,
      },
    },
    {
      headers: githubHeaders(GITHUB_TOKEN),
    }
  );

  return true;
};

module.exports = {
  triggerBuildWorkflow,
  createCiTokenSecret,
  removeCiTokenSecret,
};
