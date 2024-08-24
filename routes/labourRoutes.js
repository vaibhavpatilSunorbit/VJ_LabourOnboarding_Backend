





const express = require('express');
const router = express.Router();
const labourController = require('../controllers/labourController');

router.post('/check-aadhaar', labourController.handleCheckAadhaar);
router.get('/next-id', labourController.getNextUniqueID);
router.post('/', labourController.createRecord);
router.get('/', labourController.getAllRecords);
router.get('/', labourController.getAllLabours);
router.get('/approved', labourController.getApprovedLabours);
router.get('/search', labourController.searchLabours); 
router.get('/:id', labourController.getRecordById);
router.delete('/:id', labourController.deleteRecord);
router.put('/update/:id', labourController.updateRecordLabour);
router.put('/updatelabour/:id', labourController.updateRecord);
router.put('/approve/:id', labourController.approveLabour);
router.put('/reject/:id', labourController.rejectLabour);
router.put('/resubmit/:id', labourController.resubmitLabour);
router.post('/essl/addEmployee', labourController.esslapi);



module.exports = router;


