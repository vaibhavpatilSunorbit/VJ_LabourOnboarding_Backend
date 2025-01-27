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

// --------------------------------------------------   routes for salary generation process -----------------------------------
router.post('/generateMonthlyPayroll', insentiveController.generateMonthlyPayroll);
router.post('/generateMonthlyPayroll/:labourId', insentiveController.generateMonthlyPayrollForSingleLabour);
// labourRoutes.js or payrollRoutes.js


/**
 * 1) GET /api/payroll/eligibleLabours?month=12&year=2024
 *    Returns a list of labour IDs who have at least 1 day attendance
 *    and have an approved wage record for the given month/year.
 */
router.get('/eligibleLabours', insentiveController.getEligibleLaboursAPI);

/**
 * 2) GET /api/payroll/labour/:labourId/attendance?month=12&year=2024
 *    Returns attendance summary (presentDays, absentDays, etc.) for a single labour in the month/year.
 */
router.get('/:labourId/attendance', insentiveController.getAttendanceSummaryAPI);

/**
 * 3) GET /api/payroll/labour/:labourId/wageInfo?month=12&year=2024
 *    Returns the wage info (daily or monthly, weeklyOff, etc.) for that labour in the month/year.
 */
router.get('/:labourId/wageInfo', insentiveController.getWageInfoAPI);

/**
 * 4) GET /api/payroll/labour/:labourId/variablePay?month=12&year=2024
 *    Returns the variable pay amounts and remarks (advance, debit, incentive) for that labour in the month/year.
 */
router.get('/:labourId/variablePay', insentiveController.getVariablePayAPI);

/**
 * 5) GET /api/payroll/labour/:labourId/calculate?month=12&year=2024
 *    Calculates the final salary for a single labour (but does not insert).
 */
router.get('/:labourId/calculate', insentiveController.calculateSingleLabourAPI);

/**
 * 6) POST /api/payroll/generate
 *    { "month": 12, "year": 2024 }
 *    Generates monthly payroll for all eligible labours and inserts into [MonthlySalaryGeneration].
 *    Returns an array of final results.
 */
router.post('/generate', insentiveController.generateMonthlyPayrollAPI);

/**
 * 7) GET /api/payroll/monthlySalaries?month=12&year=2024
 *    Retrieves final salary records from [MonthlySalaryGeneration] for that month/year (if you want to show them).
 */
router.get('/monthlySalaries', insentiveController.getMonthlySalariesAPI);


// router.get('/showAttendanceCalenderSingleLabour/:id', insentiveController.getAttendanceCalenderSingleLabour);
// router.post('/generateMonthlyPayroll', insentiveController.generateMonthlyPayroll);
// router.post('/generateMonthlyPayroll/:labourId', insentiveController.generateMonthlyPayrollForSingleLabour);


module.exports = router;