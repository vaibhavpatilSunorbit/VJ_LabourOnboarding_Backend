
const { sql, poolPromise2 } = require('../config/dbConfig2');
const { poolPromise3 } = require('../config/dbConfig3');
const { poolPromise } = require('../config/dbConfig');

const getProjectNames = async (req, res) => {
  try {
    const pool = await poolPromise2;
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
    const pool = await poolPromise2;
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
    const pool = await poolPromise2;
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
    const pool = await poolPromise2;
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
    const pool = await poolPromise2;
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
    const pool = await poolPromise2;
    
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
      SELECT DeviceId, DeviceSName, DeviceLocation, SerialNumber
      FROM Devices
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};



const getAttendanceLogs = async (req, res) => {
  try {
    const { AppKey, StartDate, EndDate } = req.query;
    const response = await axios.get(`http://abc.com/api/WebAPI/GetAttendanceBetweenDates`, {
      params: {
        AppKey,
        StartDate,
        EndDate,
      },
    });
    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


const approveLabour = async (req, res) => {
  try {
    const { projectId, deviceId } = req.body;

    if (!projectId || !deviceId) {
      return res.status(400).json({ message: 'ProjectID and DeviceID are required' });
    }

    // Query from the first database (dbConfig2) for the project
    const pool2 = await poolPromise2;
    const projectResult = await pool2.request()
      .input('ProjectID', sql.Int, projectId)
      .query('SELECT Description FROM Framework.BusinessUnit WHERE id = @ProjectID');

    // Query from the second database (dbConfig3) for the device
    const pool3 = await poolPromise3;
    const deviceResult = await pool3.request()
      .input('DeviceID', sql.Int, deviceId)
      .query('SELECT DeviceSName, DeviceLocation, SerialNumber FROM dbo.Devices WHERE DeviceID = @DeviceID');

    // Validate the results
    if (projectResult.recordset.length === 0 || deviceResult.recordset.length === 0) {
      return res.status(400).send('Invalid ProjectID or DeviceID');
    }

    const BusinessUnit = projectResult.recordset[0].Description;
    const DeviceSName = deviceResult.recordset[0].DeviceSName;
    const DeviceLocation = deviceResult.recordset[0].DeviceLocation;
    const DeviceSerialNumber = deviceResult.recordset[0].SerialNumber;

    const pool1 = await poolPromise;
    await pool1.request()
      .input('ProjectID', sql.Int, projectId)
      .input('DeviceID', sql.Int, deviceId)
      .input('BusinessUnit', sql.VarChar, BusinessUnit)
      .input('DeviceSName', sql.VarChar, DeviceSName)
      .input('DeviceLocation', sql.VarChar, DeviceLocation)
      .input('SerialNumber', sql.VarChar, DeviceSerialNumber)
      .input('Status', sql.VarChar, 'Active')
      .query(`
        INSERT INTO ProjectDeviceStatus (ProjectID, DeviceID, BusinessUnit, DeviceSName, DeviceLocation, SerialNumber, Status)
        VALUES (@ProjectID, @DeviceID, @BusinessUnit, @DeviceSName, @DeviceLocation, @SerialNumber, @Status)
      `);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


const getProjectDeviceStatus = async (req, res) => {
  try {
    const { projectName } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ProjectName', sql.VarChar, projectName)
      .query(`
        SELECT pds.[SerialNumber]
        FROM ProjectDeviceStatus AS pds
        JOIN labourOnboarding AS lob
        ON pds.[ProjectID] = lob.[projectName]
        WHERE pds.[ProjectID] = @ProjectName
        AND lob.[projectName] = @ProjectName
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Serial number not found' });
    }

    res.json({ serialNumber: result.recordset[0].SerialNumber });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


const getProjectDeviceStatusSS = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT ProjectID, DeviceID, BusinessUnit, DeviceSName, DeviceLocation, SerialNumber, Status
      FROM ProjectDeviceStatus
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'No records found' });
    }

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};



const updateProjectDeviceStatus = async (req, res) => {
  try {
    const { projectId, deviceId, newProjectId, newDeviceId } = req.body;

    // Query from the first database (dbConfig2) for the project
    const pool2 = await poolPromise2;
    const projectResult = await pool2.request()
      .input('ProjectID', sql.Int, newProjectId)
      .query('SELECT Description FROM Framework.BusinessUnit WHERE id = @ProjectID');

    // Query from the second database (dbConfig3) for the device
    const pool3 = await poolPromise3;
    const deviceResult = await pool3.request()
      .input('DeviceID', sql.Int, newDeviceId)
      .query('SELECT DeviceSName, DeviceLocation, SerialNumber FROM dbo.Devices WHERE DeviceID = @DeviceID');

    // Validate the results
    if (projectResult.recordset.length === 0 || deviceResult.recordset.length === 0) {
      return res.status(400).send('Invalid ProjectID or DeviceID');
    }

    const BusinessUnit = projectResult.recordset[0].Description;
    const DeviceSName = deviceResult.recordset[0].DeviceSName;
    const DeviceLocation = deviceResult.recordset[0].DeviceLocation;
    const DeviceSerialNumber = deviceResult.recordset[0].SerialNumber;

    const pool1 = await poolPromise;
    await pool1.request()
      .input('ProjectID', sql.Int, projectId)
      .input('DeviceID', sql.Int, deviceId)
      .input('NewProjectID', sql.Int, newProjectId)
      .input('NewDeviceID', sql.Int, newDeviceId)
      .input('BusinessUnit', sql.VarChar, BusinessUnit)
      .input('DeviceSName', sql.VarChar, DeviceSName)
      .input('DeviceLocation', sql.VarChar, DeviceLocation)
      .input('SerialNumber', sql.VarChar, DeviceSerialNumber)
      .input('Status', sql.VarChar, 'Active')
      .query(`
        UPDATE ProjectDeviceStatus
        SET ProjectID = @NewProjectID,
            DeviceID = @NewDeviceID,
            BusinessUnit = @BusinessUnit,
            DeviceSName = @DeviceSName,
            DeviceLocation = @DeviceLocation,
            SerialNumber = @SerialNumber,
            Status = @Status
        WHERE ProjectID = @ProjectID AND DeviceID = @DeviceID
      `);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// const updateProjectDeviceStatus = async (req, res) => {
//   try {
//     const { projectId, deviceId, businessUnit, deviceSName, deviceLocation, serialNumber, status } = req.body;

//     const pool = await poolPromise;
//     await pool.request()
//       .input('ProjectID', sql.Int, projectId)
//       .input('DeviceID', sql.Int, deviceId)
//       .input('BusinessUnit', sql.VarChar, businessUnit)
//       .input('DeviceSName', sql.VarChar, deviceSName)
//       .input('DeviceLocation', sql.VarChar, deviceLocation)
//       .input('SerialNumber', sql.VarChar, serialNumber)
//       .input('Status', sql.VarChar, status)
//       .query(`
//         UPDATE ProjectDeviceStatus
//         SET BusinessUnit = @BusinessUnit,
//             DeviceSName = @DeviceSName,
//             DeviceLocation = @DeviceLocation,
//             SerialNumber = @SerialNumber,
//             Status = @Status
//         WHERE ProjectID = @ProjectID AND DeviceID = @DeviceID
//       `);

//     res.status(200).json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// };


const deleteProjectDeviceStatus = async (req, res) => {
  try {
    const { projectId, deviceId } = req.body;

    const pool = await poolPromise;
    await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .input('DeviceID', sql.Int, deviceId)
      .query(`
        DELETE FROM ProjectDeviceStatus
        WHERE ProjectID = @ProjectID AND DeviceID = @DeviceID
      `);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


const fetchDynamicData = async (req, res) => {
  try {
    const pool = await poolPromise2;
    
    const businessUnitQuery = `
      SELECT * FROM Framework.BusinessUnit 
      WHERE Description = 'SANKALP CONTRACTS PRIVATE LIMITED'
    `;
    const parentBusinessUnitQuery = `
      SELECT * FROM Framework.BusinessUnit 
      WHERE Id = 64
    `;
    const ledgerQuery = `
      SELECT * FROM Finance.Ledger 
      WHERE Id = 6559
    `;

    const businessUnitResult = await pool.request().query(businessUnitQuery);
    const parentBusinessUnitResult = await pool.request().query(parentBusinessUnitQuery);
    const ledgerResult = await pool.request().query(ledgerQuery);

    const businessUnit = businessUnitResult.recordset[0];
    const parentBusinessUnit = parentBusinessUnitResult.recordset[0];
    const ledger = ledgerResult.recordset[0];

    const dynamicData = {
      // phone1: '+91-...', 
      email1: 'system@javdekars.com', 
      natureId: 0,
      interUnitLedgerId: 6559,
      interUnitParentId: 169,
      interUnitLedger: {
        ledgerGroupId: ledger.GroupId 
      },
      id: businessUnit.Id,
      code: businessUnit.Code,
      description: businessUnit.Description,
      parentId: parentBusinessUnit.Id,
      parentDesc: parentBusinessUnit.Description
    };

    res.json(dynamicData);
  } catch (error) {
    console.error('Error fetching dynamic data:', error);
    res.status(500).send('Error fetching dynamic data');
  } finally {
    await sql.close();
  }
};


// const approveLabour = async (req, res) => {
//   try {
//     const { projectName, deviceName } = req.body;

//     // Query from the first database (dbConfig2)
//     const pool2 = await poolPromise2;
//     const projectResult = await pool2.request()
//       .input('ProjectID', sql.Int, projectName)
//       .query('SELECT Description FROM Framework.BusinessUnit WHERE id = @ProjectID');

//     // Query from the second database (dbConfig3)
//     const pool3 = await poolPromise3;
//     const deviceResult = await pool3.request()
//       .input('DeviceID', sql.Int, deviceName)
//       .query('SELECT DeviceSName, DeviceLocation, SerialNumber FROM dbo.Devices WHERE DeviceID = @DeviceID');

//     // Validate the results
//     if (projectResult.recordset.length === 0 || deviceResult.recordset.length === 0) {
//       return res.status(400).send('Invalid ProjectID or DeviceID');
//     }

//     // Extract values from the query results
//     const BusinessUnit = projectResult.recordset[0].Description;
//     const DeviceSName = deviceResult.recordset[0].DeviceSName;
//     const DeviceLocation = deviceResult.recordset[0].DeviceLocation;
//     const DeviceSerialNumber = deviceResult.recordset[0].SerialNumber;

//     // Insert into ProjectDeviceStatus in the appropriate database
//     const pool1 = await poolPromise;
//     await pool1.request()
//       .input('ProjectID', sql.Int, projectName)
//       .input('DeviceID', sql.Int, deviceName)
//       .input('BusinessUnit', sql.VarChar, BusinessUnit)
//       .input('DeviceSName', sql.VarChar, DeviceSName)
//       .input('DeviceLocation', sql.VarChar, DeviceLocation)
//       .input('SerialNumber', sql.VarChar, DeviceSerialNumber) // Ensure using the correct variable
//       .input('Status', sql.VarChar, 'Active')
//       .query(`
//         INSERT INTO ProjectDeviceStatus (ProjectID, DeviceID, BusinessUnit, DeviceSName, DeviceLocation, SerialNumber, Status)
//         VALUES (@ProjectID, @DeviceID, @BusinessUnit, @DeviceSName, @DeviceLocation, @SerialNumber, @Status)
//       `);

//     res.status(200).json({ message: 'Data submitted successfully' });
//   } catch (err) {
//     console.error('Error in approveLabour:', err);
//     res.status(500).send('Server error');
//   }
// };



module.exports = {
  getProjectNames,
  getLabourCategories,
  getDepartments,
  getWorkingHours,
  getDesignations,
  getCompanyNamesByProjectId,
  getDevices,
  getAttendanceLogs,
  getProjectDeviceStatus,
  approveLabour,
  updateProjectDeviceStatus,
  deleteProjectDeviceStatus,
  getProjectDeviceStatusSS,
  fetchDynamicData
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
