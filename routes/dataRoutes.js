
const express = require('express');
const { getProjectNames, getLabourCategories, getDepartments, getWorkingHours, getDesignations, getCompanyNamesByProjectId, getDevices   } = require('../controllers/dataController');

const router = express.Router();

router.get('/project-names', getProjectNames);
router.get('/labour-categories', getLabourCategories);
router.get('/departments', getDepartments);
router.get('/working-hours', getWorkingHours);
router.get('/designations/:departmentId', getDesignations);
router.get('/company-names/:projectId', getCompanyNamesByProjectId);
router.get('/devices', getDevices);

module.exports = router;







// imp code changes 16-07-2024


// const express = require('express');
// const { getProjectNames, getLabourCategories, getDepartments, getWorkingHours, getDesignations, getCompanyNamesByProjectId  } = require('../controllers/dataController');

// const router = express.Router();

// router.get('/project-names', getProjectNames);
// router.get('/labour-categories', getLabourCategories);
// router.get('/departments', getDepartments);
// router.get('/working-hours', getWorkingHours);
// router.get('/designations/:departmentId', getDesignations);
// router.get('/company-names/:projectId', getCompanyNamesByProjectId);

// module.exports = router;
