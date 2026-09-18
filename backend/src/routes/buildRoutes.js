const express = require('express');
const multer = require('multer');

const {
  saveBuild,
  listBuilds,
  getBuild,
  publishBuild,
  updateCiStatus,
} = require('../controllers/buildController');
const { getBuildConfigForCi } = require('../controllers/ciController');
const { uploadAsset } = require('../controllers/assetController');

const router = express.Router();
const buildUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post(
  '/builds',
  buildUpload.fields([
    { name: 'appIcon', maxCount: 1 },
    { name: 'splashLogo', maxCount: 1 },
  ]),
  saveBuild
);
router.get('/builds', listBuilds);

router.get('/builds/:buildId', getBuild);

router.post('/builds/:buildId/publish', publishBuild);
router.get('/ci/builds/:buildId/config', getBuildConfigForCi);
router.post('/ci/builds/:buildId/status', updateCiStatus);
router.post('/assets', ...uploadAsset);

module.exports = router;
