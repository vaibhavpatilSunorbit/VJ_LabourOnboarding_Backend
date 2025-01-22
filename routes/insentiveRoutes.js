const express = require('express');
const router = express.Router();
const insentiveController = require('../controllers/insentiveController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


router.post('/insentive', insentiveController.createRecord);
router.get('/searchLaboursFromVariablePay', insentiveController.searchLaboursFromVariablePay);  
router.get('/getVariablePayAndLabourOnboardingJoin', insentiveController.getVariablePayAndLabourOnboardingJoincontroller);  
router.post('/upsertVariablePay', insentiveController.upsertLabourVariablePay);
router.get('/checkExistingVariablePay', insentiveController.checkExistingVariablePayController);
router.post('/sendVariablePayForApproval', insentiveController.markVariablePayForApprovalController);
router.put('/admin/approveVariablePay', insentiveController.approveVariablePayAdmin);
router.put('/admin/rejectVariablePay', insentiveController.rejectVariablePayAdmin);
router.get('/admin/getVariablePayAdminApprovals', insentiveController.getVariablePayAdminApprovals);
router.get('/exportVariablePayexcelSheetWithBU', insentiveController.exportVariablePayexcelSheetWithBU);
router.get('/exportVariablePayExcel', insentiveController.exportVariablePayexcelSheet);

router.post('/importVariablePay', upload.single('file'), insentiveController.importVariablePay);

module.exports = router;