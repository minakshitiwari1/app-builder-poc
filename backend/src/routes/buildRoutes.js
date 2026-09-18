const express = require('express');

const {
  saveBuild,
  getBuild,
  publishBuild,
} = require('../controllers/buildController');
const { getBuildConfigForCi } = require('../controllers/ciController');
const { uploadAsset } = require('../controllers/assetController');

const router = express.Router();

router.post('/builds', saveBuild);

router.get('/builds/:buildId', getBuild);

router.post('/builds/:buildId/publish', publishBuild);
router.get('/ci/builds/:buildId/config', getBuildConfigForCi);
router.post('/assets', ...uploadAsset);

module.exports = router;
