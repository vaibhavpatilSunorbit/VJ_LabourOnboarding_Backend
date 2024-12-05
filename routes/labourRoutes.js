const express = require('express');
const router = express.Router();
const labourController = require('../controllers/labourController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/check-aadhaar', labourController.handleCheckAadhaar);
router.get('/next-id', labourController.getNextUniqueID);
router.post('/', labourController.createRecord);
router.get('/', labourController.getAllRecords);
router.get('/', labourController.getAllLabours);
router.get('/approved', labourController.getApprovedLabours);
router.get('/search', labourController.searchLabours);  
router.post('/:id/updateRecord', labourController.createRecordUpdate);
router.delete('/:id', labourController.deleteRecord);
router.put('/updatelabour/:id', labourController.updateRecord);
router.put('/update/:id', labourController.updateRecordLabour);
router.put('/approve/:id', labourController.approveLabour);
router.put('/approveDisableLabour/:id', labourController.approveDisableLabour);
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

// --------------------------------   ALL ROUTES ARE LABOUR PHASE 2 -----------------------------------------------------------------

router.get('/attendance/:labourId', labourController.getAttendance);
router.get('/attendance', labourController.getAllLaboursAttendance);
router.get('/cachedattendance', labourController.getCachedAttendance);
router.post('/attendance/submit', labourController.submitAttendanceController);
router.post('/add', labourController.addWeeklyOff);
router.post('/save', labourController.saveWeeklyOffs);
router.get('/disabledmonth', labourController.getDisabledMonthsAndYears);
router.delete('/deleteAttendance', labourController.deleteAttendance);

// ----------------------------------  fetch attendance -----------------
router.get('/summary', labourController.getAttendanceSummary);
router.get('/details', labourController.getAttendanceDetails);
router.post('/saveattendancemonthly', labourController.saveAttendance);
router.get('/attendancelabours', labourController.getAttendanceDetails);
router.get('/attendancelaboursforsinglelabour/:id', labourController.getAttendanceDetailsForSingleLabour);
router.post('/upsertAttendance', labourController.upsertAttendance);

router.get('/export', labourController.exportAttendance);
router.post('/import', upload.single('file'), labourController.importAttendance);

// ------------------------------------------------------- IMP ROUTE AND GET USING VIEW DETAILS FOR LABOUR --------------------------------------------------
router.get('/:id', labourController.getRecordById);


module.exports = router;