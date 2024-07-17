
const { sql, poolPromise } = require('../config/dbConfig2');
const { poolPromise3 } = require('../config/dbConfig3');

const getProjectNames = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
    SELECT a.id, a.Description AS Business_Unit, a.ParentId, b.Description AS Segment_Description
      FROM Framework.BusinessUnit a
      LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
      WHERE (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
      AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
      AND b.Id = 3
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

const getLabourCategories = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT * FROM Payroll.Grade
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

const getDepartments = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT * FROM Payroll.Department
      WHERE IsDeleted IS NULL AND TenantId = 278
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

const getWorkingHours = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Id, Description AS Shift_Name, Type FROM Payroll.Shift
      WHERE Id IN (3, 4)
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

const getDesignations = async (req, res) => {
  const departmentId = req.params.departmentId;
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT a.id, a.TenantId, a.Description, a.ParentId, a.DepartmentId, b.Description AS Department_Name
      FROM Payroll.Designation a
      LEFT JOIN Payroll.Department b ON b.Id = a.DepartmentId
      WHERE a.DepartmentId = ${departmentId}
      AND a.IsDeleted IS NULL
      AND a.TenantId = 278
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

const getCompanyNamesByProjectId = async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const pool = await poolPromise;
    
    // Step 1: Get the ParentId for the selected project
    const parentIdResult = await pool.request().query(`
      SELECT ParentId 
      FROM Framework.BusinessUnit 
      WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
      AND (IsDeleted = 0 OR IsDeleted IS NULL) 
      AND Id = ${projectId}
    `);

    if (parentIdResult.recordset.length === 0) {
      return res.status(404).send('ParentId not found for the selected project');
    }

    const parentId = parentIdResult.recordset[0].ParentId;

    // Step 2: Get the Company Name using the ParentId
    const companyNameResult = await pool.request().query(`
      SELECT Description AS Company_Name 
      FROM Framework.BusinessUnit 
      WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
      AND (IsDeleted = 0 OR IsDeleted IS NULL) 
      AND Id = ${parentId}
    `);

    res.json(companyNameResult.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

const getDevices = async (req, res) => {
  try {
    const pool = await poolPromise3;
    const result = await pool.request().query(`
      SELECT DeviceID, DeviceSName, DeviceLocation, SerialNumber
      FROM Devices
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


module.exports = {
  getProjectNames,
  getLabourCategories,
  getDepartments,
  getWorkingHours,
  getDesignations,
  getCompanyNamesByProjectId,
  getDevices,
};

















// imp code changes 16-07-2024



// const { sql, poolPromise } = require('../config/dbConfig2');

// const getProjectNames = async (req, res) => {
//   try {
//     const pool = await poolPromise;
//     const result = await pool.request().query(`
//     SELECT a.id, a.Description AS Business_Unit, a.ParentId, b.Description AS Segment_Description
//       FROM Framework.BusinessUnit a
//       LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
//       WHERE (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
//       AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
//       AND b.Id = 3
//     `);
//     res.json(result.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// };

// const getLabourCategories = async (req, res) => {
//   try {
//     const pool = await poolPromise;
//     const result = await pool.request().query(`
//       SELECT * FROM Payroll.Grade
//     `);
//     res.json(result.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// };

// const getDepartments = async (req, res) => {
//   try {
//     const pool = await poolPromise;
//     const result = await pool.request().query(`
//       SELECT * FROM Payroll.Department
//       WHERE IsDeleted IS NULL AND TenantId = 278
//     `);
//     res.json(result.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// };

// const getWorkingHours = async (req, res) => {
//   try {
//     const pool = await poolPromise;
//     const result = await pool.request().query(`
//       SELECT Id, Description AS Shift_Name, Type FROM Payroll.Shift
//       WHERE Id IN (3, 4)
//     `);
//     res.json(result.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// };

// const getDesignations = async (req, res) => {
//   const departmentId = req.params.departmentId;
//   try {
//     const pool = await poolPromise;
//     const result = await pool.request().query(`
//       SELECT a.id, a.TenantId, a.Description, a.ParentId, a.DepartmentId, b.Description AS Department_Name
//       FROM Payroll.Designation a
//       LEFT JOIN Payroll.Department b ON b.Id = a.DepartmentId
//       WHERE a.DepartmentId = ${departmentId}
//       AND a.IsDeleted IS NULL
//       AND a.TenantId = 278
//     `);
//     res.json(result.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// };

// const getCompanyNamesByProjectId = async (req, res) => {
//   const projectId = req.params.projectId;
//   try {
//     const pool = await poolPromise;
    
//     // Step 1: Get the ParentId for the selected project
//     const parentIdResult = await pool.request().query(`
//       SELECT ParentId 
//       FROM Framework.BusinessUnit 
//       WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
//       AND (IsDeleted = 0 OR IsDeleted IS NULL) 
//       AND Id = ${projectId}
//     `);

//     if (parentIdResult.recordset.length === 0) {
//       return res.status(404).send('ParentId not found for the selected project');
//     }

//     const parentId = parentIdResult.recordset[0].ParentId;

//     // Step 2: Get the Company Name using the ParentId
//     const companyNameResult = await pool.request().query(`
//       SELECT Description AS Company_Name 
//       FROM Framework.BusinessUnit 
//       WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
//       AND (IsDeleted = 0 OR IsDeleted IS NULL) 
//       AND Id = ${parentId}
//     `);

//     res.json(companyNameResult.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// };

// module.exports = {
//   getProjectNames,
//   getLabourCategories,
//   getDepartments,
//   getWorkingHours,
//   getDesignations,
//   getCompanyNamesByProjectId,
// };
