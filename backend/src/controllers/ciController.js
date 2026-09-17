const buildService = require('../services/buildService');
const githubService = require('../services/githubService');

const getBuildConfigForCi = async (req, res) => {
  try {
    const { buildId } = req.params;
    const authorization = req.get('authorization');
    const build = await buildService.getBuildWithCiAccess(buildId);

    if (!build) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }

    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'CI authorization is required' });
    }

    const token = authorization.slice('Bearer '.length);
    const { ciAccess } = build;

    if (!ciAccess || !buildService.matchesCiToken(token, ciAccess.tokenHash)) {
      return res.status(401).json({ success: false, message: 'Invalid CI authorization' });
    }

    if (ciAccess.expiresAt <= new Date()) {
      return res.status(401).json({ success: false, message: 'CI authorization has expired' });
    }

    if (ciAccess.usedAt) {
      return res.status(403).json({ success: false, message: 'CI authorization has already been used' });
    }

    const consumedBuild = await buildService.consumeCiAccess(buildId, token);

    if (!consumedBuild) {
      return res.status(403).json({ success: false, message: 'CI authorization is no longer valid' });
    }

    try {
      await githubService.removeCiTokenSecret(ciAccess.secretName);
    } catch (error) {
      console.error('Failed to remove consumed GitHub CI secret:', error.message);
    }

    return res.json({
      success: true,
      data: {
        buildId: consumedBuild.buildId,
        platform: consumedBuild.platform,
        config: consumedBuild.config,
      },
    });
  } catch (error) {
    console.error('Get CI build config error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to get CI build configuration' });
  }
};

module.exports = { getBuildConfigForCi };
