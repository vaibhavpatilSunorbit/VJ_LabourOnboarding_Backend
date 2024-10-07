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
router.post('/:id/updateRecord', labourController.createRecordUpdate);
router.delete('/:id', labourController.deleteRecord);
router.put('/updatelabour/:id', labourController.updateRecord);
router.put('/update/:id', labourController.updateRecordLabour);
router.put('/approve/:id', labourController.approveLabour);
router.put('/reject/:id', labourController.rejectLabour);
router.put('/resubmit/:id', labourController.resubmitLabour);
router.put('/editLabour/:id', labourController.editbuttonLabour);
router.post('/essl/addEmployee', labourController.esslapi);
router.get('/commandstatus/:commandId', labourController.getCommandStatus);
router.put('/updatelabourDisableStatus/:id', labourController.updateRecordWithDisable);

// router.get('/getEsslStatuses', labourController.getEsslStatuses);
// router.get('/getEmployeeMasterStatuses', labourController.getEmployeeMasterStatuses);
router.post('/getCombinedStatuses', labourController.getUserStatusController);
router.put('/updateHideResubmit/:id', labourController.updateHideResubmitLabour);
// router.get('/labour-status', labourController.getLabourStatus);


module.exports = router;