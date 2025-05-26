const express = require('express');
const { getAllLaboursCount, getAllWagesCount ,getAllSiteTransferCount, getAllVariablePayCount, 
    getAllLastDayPAMCount, getAttendanceByPeriod, getAllActiveWorkers, getAllActiveWorkersPersentage, 
    getAllAdminNotifacation, getNotificationAttendance, getNotificationVariablePay, getNotificationWagesApproval,
    getDepartmentWiseWagesPercentage,
} = require('../controllers/dashboardController');
const router = express.Router();

router.get('/getAllLaboursCount', getAllLaboursCount);
router.get('/getWagesCount', getAllWagesCount);
router.get('/getAllSiteTransferCount', getAllSiteTransferCount);
router.get('/getAllVariableCount' , getAllVariablePayCount);
router.get('/getAPM' , getAllLastDayPAMCount);
router.get('/getAllAPM' ,getAttendanceByPeriod );
router.get('/getAllActive' ,getAllActiveWorkers);
router.get('/getAllActivep', getAllActiveWorkersPersentage);
router.get('/getnotification' ,getAllAdminNotifacation);
router.get('/getAllNotification' , getNotificationAttendance);
router.get('/getNotificationVariablePay', getNotificationVariablePay);
router.get('/getNotificationWagesApproval', getNotificationWagesApproval);
router.get('/deptPercentageCount' , getDepartmentWiseWagesPercentage)
// router.get('/getYesterdayAttendanceCount' ,getYesterdayAttendanceCount)

module.exports = router