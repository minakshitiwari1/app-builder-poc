const buildService = require('../services/buildService');
const githubService = require('../services/githubService');

const VALID_PLATFORMS = ['android', 'ios'];

const saveBuild = (req, res) => {
  try {
    const config = req.body;

    if (!config.appName) {
      return res.status(400).json({
        success: false,
        message: 'appName is required',
      });
    }

    const build = buildService.createBuild(config);

    return res.status(201).json({
      success: true,
      message: 'Build configuration saved',
      data: build,
    });
  } catch (error) {
    console.error('Save build error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to save build configuration',
    });
  }
};

const getBuild = (req, res) => {
  try {
    const { buildId } = req.params;

    const build = buildService.getBuild(buildId);

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

    const build = buildService.getBuild(buildId);

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

    try {
      await githubService.triggerBuildWorkflow({ buildId, platform });
    } catch (githubError) {
      console.error(
        'GitHub workflow dispatch error:',
        githubError.response?.data || githubError.message
      );

      return res.status(502).json({
        success: false,
        message: 'Failed to trigger GitHub Actions workflow',
      });
    }

    const updatedBuild = buildService.markBuildQueued(buildId, platform);

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