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

const getSafeGitHubErrorDetails = (operation, error) => ({
  operation,
  status: error?.response?.status,
  message: error?.response?.data?.message || error?.message,
  documentationUrl: error?.response?.data?.documentation_url,
});

const logGitHubOperationFailure = (operation, error) => {
  if (error && typeof error === 'object') {
    error.githubOperation = operation;
  }

  console.error(`GitHub ${operation} failed`, getSafeGitHubErrorDetails(operation, error));
};

const createCiTokenSecret = async ({ secretName, token }) => {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = getGitHubConfig();
  const baseUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/secrets`;

  let publicKey;

  try {
    ({ data: publicKey } = await axios.get(`${baseUrl}/public-key`, {
      headers: githubHeaders(GITHUB_TOKEN),
    }));
  } catch (error) {
    logGitHubOperationFailure('get repository Actions public key', error);
    throw error;
  }

  await sodium.ready;
  const encryptedValue = Buffer.from(
    sodium.crypto_box_seal(
      Buffer.from(token),
      Buffer.from(publicKey.key, 'base64')
    )
  ).toString('base64');

  try {
    await axios.put(
      `${baseUrl}/${encodeURIComponent(secretName)}`,
      {
        encrypted_value: encryptedValue,
        key_id: publicKey.key_id,
      },
      { headers: githubHeaders(GITHUB_TOKEN) }
    );
  } catch (error) {
    logGitHubOperationFailure('create temporary Actions secret', error);
    throw error;
  }
};

const removeCiTokenSecret = async secretName => {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = getGitHubConfig();
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/secrets/${encodeURIComponent(secretName)}`;

  try {
    await axios.delete(url, { headers: githubHeaders(GITHUB_TOKEN) });
  } catch (error) {
    if (error.response?.status !== 404) {
      logGitHubOperationFailure('delete temporary secret', error);
      throw error;
    }
  }
};

const triggerBuildWorkflow = async ({ buildId, platform, ciTokenSecretName }) => {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_WORKFLOW, GITHUB_BRANCH } =
    getGitHubConfig();
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`;

  try {
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
  } catch (error) {
    logGitHubOperationFailure('workflow dispatch', error);
    throw error;
  }

  return true;
};

module.exports = {
  triggerBuildWorkflow,
  createCiTokenSecret,
  removeCiTokenSecret,
  getSafeGitHubErrorDetails,
};
