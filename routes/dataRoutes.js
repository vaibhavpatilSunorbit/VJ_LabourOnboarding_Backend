
const express = require('express');
const { getProjectNames, getLabourCategories, getDepartments, getWorkingHours, getDesignations } = require('../controllers/dataController');

const router = express.Router();

router.get('/project-names', getProjectNames);
router.get('/labour-categories', getLabourCategories);
router.get('/departments', getDepartments);
router.get('/working-hours', getWorkingHours);
router.get('/designations/:departmentId', getDesignations);

module.exports = router;
