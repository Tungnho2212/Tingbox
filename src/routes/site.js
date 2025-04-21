const express = require('express');
const router = express.Router();

const siteController = require('../app/controllers/SiteController');

router.get('/trangchu', siteController.index);

module.exports = router;
