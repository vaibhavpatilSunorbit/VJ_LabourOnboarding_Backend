const express = require('express');
const router = express.Router();
const insentiveController = require('../controllers/insentiveController');
const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });


router.post('/insentive', insentiveController.createRecord);
router.get('/searchLaboursFromWages', insentiveController.searchLaboursFromWages);  
router.get('/getVariablePayAndLabourOnboardingJoin', insentiveController.getVariablePayAndLabourOnboardingJoincontroller);  
router.post('/upsertVariablePay', insentiveController.upsertLabourVariablePay);
router.get('/checkExistingVariablePay', insentiveController.checkExistingVariablePayController);
router.post('/sendVariablePayForApproval', insentiveController.markVariablePayForApprovalController);
router.put('/admin/approveVariablePay', insentiveController.approveVariablePayAdmin);
router.put('/admin/rejectVariablePay', insentiveController.rejectVariablePayAdmin);
router.get('/admin/getVariablePayAdminApprovals', insentiveController.getVariablePayAdminApprovals);


module.exports = router;