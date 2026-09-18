const express = require('express');
const multer = require('multer');

const {
  saveBuild,
  getBuild,
  publishBuild,
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

router.get('/builds/:buildId', getBuild);

router.post('/builds/:buildId/publish', publishBuild);
router.get('/ci/builds/:buildId/config', getBuildConfigForCi);
router.post('/assets', ...uploadAsset);

module.exports = router;
