

// const express = require('express');
// const router = express.Router();
// const labourController = require('../controllers/labourController');


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

// module.exports = router;






const express = require('express');
const router = express.Router();
const labourController = require('../controllers/labourController');


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

module.exports = router;