const express = require('express');

const {
  saveBuild,
  getBuild,
} = require('../controllers/buildController');

const router = express.Router();

router.post('/builds', saveBuild);

router.get('/builds/:buildId', getBuild);

module.exports = router;