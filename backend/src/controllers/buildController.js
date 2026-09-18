const buildService = require('../services/buildService');
const githubService = require('../services/githubService');
const assetService = require('../services/assetService');

const VALID_PLATFORMS = ['android', 'ios'];

const saveBuild = async (req, res) => {
  const savedAssetIds = [];
  try {
    const config = typeof req.body.config === 'string' ? JSON.parse(req.body.config) : req.body;

    if (!config.appName) {
      return res.status(400).json({
        success: false,
        message: 'appName is required',
      });
    }

    // Files arrive only with this Save request. They are never written to disk.
    for (const [fieldName, configKey] of [
      ['appIcon', 'appIconAsset'],
      ['splashLogo', 'splashAsset'],
    ]) {
      const file = req.files?.[fieldName]?.[0];
      if (!file) continue;
      const assetId = await assetService.saveImage(file);
      savedAssetIds.push(assetId);
      config.branding = { ...config.branding, [configKey]: { assetId } };
    }

    await assetService.assertAssetReference(config.branding?.appIconAsset);
    await assetService.assertAssetReference(config.branding?.splashAsset);

    const build = await buildService.createBuild(config);

    return res.status(201).json({
      success: true,
      message: 'Build configuration saved',
      data: build,
    });
  } catch (error) {
    if (savedAssetIds.length) {
      await assetService.deleteAssets(savedAssetIds);
    }
    console.error('Save build error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to save build configuration',
    });
  }
};

const getBuild = async (req, res) => {
  try {
    const { buildId } = req.params;

    const build = await buildService.getBuild(buildId);

    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found',
      });
    }

    return res.json({
      success: true,
      data: build,
    });
  } catch (error) {
    console.error('Get build error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get build',
    });
  }
};

const publishBuild = async (req, res) => {
  try {
    const { buildId } = req.params;
    const { platform } = req.body;

    const build = await buildService.getBuild(buildId);

    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found',
      });
    }

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: `platform must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    const ciAccess = await buildService.issueCiAccess(buildId);

    if (!ciAccess) {
      return res.status(404).json({
        success: false,
        message: 'Build not found',
      });
    }

    try {
      await githubService.createCiTokenSecret({
        secretName: ciAccess.secretName,
        token: ciAccess.token,
      });

      await githubService.triggerBuildWorkflow({
        buildId,
        platform,
        ciTokenSecretName: ciAccess.secretName,
      });
    } catch (githubError) {
      console.error(
        'GitHub publish flow failed',
        githubService.getSafeGitHubErrorDetails(
          githubError.githubOperation || 'GitHub API operation',
          githubError
        )
      );

      await buildService.invalidateCiAccess(buildId);
      await githubService.removeCiTokenSecret(ciAccess.secretName).catch(cleanupError => {
        console.error(
          'GitHub temporary secret cleanup failed',
          githubService.getSafeGitHubErrorDetails(
            cleanupError.githubOperation || 'delete temporary secret',
            cleanupError
          )
        );
      });

      return res.status(502).json({
        success: false,
        message: 'Failed to trigger GitHub Actions workflow',
      });
    }

    const updatedBuild = await buildService.markBuildQueued(buildId, platform);

    return res.json({
      success: true,
      message: 'GitHub Actions workflow triggered successfully',
      data: {
        buildId: updatedBuild.buildId,
        platform: updatedBuild.platform,
        status: updatedBuild.status,
      },
    });
  } catch (error) {
    console.error('Publish build error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to publish build',
    });
  }
};

module.exports = {
  saveBuild,
  getBuild,
  publishBuild,
};
