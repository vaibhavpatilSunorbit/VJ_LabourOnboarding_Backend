const express = require('express');
const router = express.Router();
const insentiveController = require('../controllers/insentiveController');
const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });


router.post('/insentive', insentiveController.createRecord);
router.get('/searchLaboursFromWages', insentiveController.searchLaboursFromWages);  
router.post('/upsertVariablePay', insentiveController.upsertLabourVariablePay);

module.exports = router;