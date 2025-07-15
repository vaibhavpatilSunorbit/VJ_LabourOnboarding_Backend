 const express = require('express');
 const router = express.Router();
 const attandanceController = require('../controllers/attandanceController');

 router.get('/valid-punches', attandanceController.getValidPunches);

 module.exports =router;