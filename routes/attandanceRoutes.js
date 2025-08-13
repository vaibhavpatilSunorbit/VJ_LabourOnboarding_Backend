 const express = require('express');
 const router = express.Router();
 const attandanceController = require('../controllers/attandanceController');

//  router.get('/validPunches', attandanceController.getMatchedLabourIdsWithValidPunch);
    router.get('/vaild-punch', attandanceController.getValidPunches)
    router.post('/updateStatus', attandanceController.updateAttandaceStatus)
    module.exports =router;