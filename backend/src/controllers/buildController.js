const buildService = require('../services/buildService');

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

module.exports = {
  saveBuild,
  getBuild,
};