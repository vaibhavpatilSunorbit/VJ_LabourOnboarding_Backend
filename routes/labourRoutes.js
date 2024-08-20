





const express = require('express');
const router = express.Router();
const labourController = require('../controllers/labourController');

router.post('/check-aadhaar', labourController.handleCheckAadhaar);
router.get('/next-id', labourController.getNextUniqueID);
router.post('/', labourController.createRecord);
router.get('/', labourController.getAllRecords);
router.get('/approved', labourController.getApprovedLabours);
router.get('/search', labourController.searchLabours); 
router.get('/:id', labourController.getRecordById);
router.put('/update/:id', labourController.updateRecord);
router.delete('/:id', labourController.deleteRecord);

router.get('/', labourController.getAllLabours);
router.put('/approve/:id', labourController.approveLabour);
router.put('/reject/:id', labourController.rejectLabour);
router.put('/resubmit/:id', labourController.resubmitLabour);
router.post('/essl/addEmployee', labourController.esslapi);



module.exports = router;











// imp code changes 16-07-2024


// const express = require('express');
// const router = express.Router();
// const labourController = require('../controllers/labourController');

// router.post('/check-aadhaar', labourController.handleCheckAadhaar);
// router.get('/next-id', labourController.getNextUniqueID);
// router.post('/', labourController.createRecord);
// router.get('/', labourController.getAllRecords);
// router.get('/approved', labourController.getApprovedLabours);
// router.get('/search', labourController.searchLabours); 
// router.get('/:id', labourController.getRecordById);
// router.put('/update/:id', labourController.updateRecord);
// router.delete('/:id', labourController.deleteRecord);

// router.get('/', labourController.getAllLabours);
// router.put('/approve/:id', labourController.approveLabour);
// router.put('/reject/:id', labourController.rejectLabour);
// router.put('/resubmit/:id', labourController.resubmitLabour);


// module.exports = router;