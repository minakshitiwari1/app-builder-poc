const express = require('express');

const {
  saveBuild,
  getBuild,
  publishBuild,
} = require('../controllers/buildController');

const router = express.Router();

router.post('/builds', saveBuild);

router.get('/builds/:buildId', getBuild);

router.post('/builds/:buildId/publish', publishBuild);

module.exports = router;