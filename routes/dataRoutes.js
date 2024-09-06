
const express = require('express');
const { getProjectNames, getLabourCategories, getDepartments, getWorkingHours, getDesignations, getCompanyNamesByProjectId, getDevices, getAttendanceLogs, approveLabour, getProjectDeviceStatus,updateProjectDeviceStatus, deleteProjectDeviceStatus, getProjectDeviceStatusSS, fetchDynamicData, fetchOrgDynamicData, addFvEmpId, updateEmployeeMaster, saveApiResponsePayload } = require('../controllers/dataController');
const {addEmployee} =require("../controllers/sendLabourData")
const router = express.Router();

router.get('/project-names', getProjectNames);
router.get('/labour-categories', getLabourCategories);
router.get('/departments', getDepartments);
router.get('/working-hours', getWorkingHours);
router.get('/designations/:departmentId', getDesignations);
router.get('/company-names/:projectId', getCompanyNamesByProjectId);
router.get('/devices', getDevices);
router.get('/attendance-logs', getAttendanceLogs);
router.post('/AddEmployee',addEmployee);
router.post('/approveLabour', approveLabour);
router.get('/projectDeviceStatus/:projectName', getProjectDeviceStatus);
router.put('/projectDeviceStatus', updateProjectDeviceStatus);
router.delete('/projectDeviceStatus', deleteProjectDeviceStatus);
router.get('/projectDeviceStatus', getProjectDeviceStatusSS);
router.get('/fetchDynamicData', fetchDynamicData);
router.get('/fetchOrgDynamicData', fetchOrgDynamicData);
router.put('/addFvEmpId/:Id', addFvEmpId);
router.post('/updateEmployeeMaster', updateEmployeeMaster);
router.post('/saveApiResponsePayload', saveApiResponsePayload);

module.exports = router;

