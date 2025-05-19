const express = require('express');
const { getAllLaboursCount, getAllWagesCount ,getAllSiteTransferCount, getAllVariablePayCount,
} = require('../controllers/dashboardController');
const router = express.Router();

router.get('/getAllLaboursCount', getAllLaboursCount);
router.get('/getWagesCount', getAllWagesCount);
router.get('/getAllSiteTransferCount', getAllSiteTransferCount);
router.get('/getAllVariableCount' , getAllVariablePayCount);
// router.get('/getYesterdayAttendanceCount' ,getYesterdayAttendanceCount)

module.exports = router