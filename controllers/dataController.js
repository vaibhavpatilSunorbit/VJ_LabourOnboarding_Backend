const cron = require('node-cron');
const logger = require('../logger')
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
    if (!pool) {
      throw new Error('Database connection pool is not initialized');
    }
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

    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'No records found' });
    // }

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

const addFvEmpId = async (req, res) => {
  try {
    const { empId } = req.body;
    const { Id } = req.params;

    const pool = await poolPromise;
    await pool.request()
      .input('Id', sql.Int, Id)
      .input('empId', sql.Int, empId)
      .query(`
        update labourOnboarding set empId = @empId where id = @Id
      `);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};




const fetchDynamicData = async (req, res) => {
  const { businessUnitDesc, workingHours  } = req.query;

  console.log('Received query parameters:', { businessUnitDesc, workingHours });

  try {
    const pool = await poolPromise2;

    // Construct SQL queries dynamically based on provided parameters
    let businessUnitQuery = `SELECT * FROM Framework.BusinessUnit where Description LIKE '%${businessUnitDesc.replace(/'/g, "''")}%'`;
  
    const businessUnitQueryResult = await pool.request().query(businessUnitQuery);
    let result = businessUnitQueryResult.recordset[0];
    let parentResult;
    let ledgerResult;
    if(businessUnitQueryResult.recordset.length > 0){
      const frameworkQuery = `SELECT * FROM Framework.BusinessUnit Where Id = ${result.ParentId}`;
      const frameworkUnit = await pool.request().query(frameworkQuery);
      parentResult = frameworkUnit.recordset[0];
      console.log('parentIdResult : ' + parentResult);

      const frameworkQueryLedger = `SELECT * FROM Finance.Ledger Where Id = ${result.InterUnitLedgerId}`;
      const frameworkUnitLedger = await pool.request().query(frameworkQueryLedger);
      ledgerResult = frameworkUnitLedger.recordset[0];
      console.log('ledgerResult : ' + ledgerResult);
    }

     // Fetch shift details dynamically based on workingHours
     const shiftQuery = `SELECT Id, Description FROM Payroll.Shift WHERE Description LIKE '%${workingHours.replace(/'/g, "''")}%'`;
     const shiftResult = await pool.request().query(shiftQuery);
     const shift = shiftResult.recordset[0];

    // Construct the dynamic data object
    const dynamicData = {
      email1: 'system@javdekars.com',
      natureId: 0,
      interUnitLedgerId: result.interUnitLedgerId || null,
      interUnitParentId: result.interUnitParentId, 
      interUnitLedger: ledgerResult ? { ledgerGroupId: ledgerResult.GroupId } : null,
      id: result ? result.Id : null,
      code: result ? result.Code : null,
      description: result ? result.Description : null,
      parentId: parentResult ? parentResult.Id : null,
      parentDesc: parentResult ? parentResult.Description : null,
      shiftId: shift ? shift.Id : null, // Add shiftId dynamically
      shiftName: shift ? shift.Description : null,
    };

    res.json(dynamicData);
  } catch (error) {
    console.error('Error fetching dynamic data:', error);
    res.status(500).send('Error fetching dynamic data');
  } 
};







const fetchOrgDynamicData = async (req, res) => {
  // const { employeeId= 444, monthPeriodId=55, gradeId = 1, businessUnitId1 = 80, businessUnitId2 = 65, ledgerId = 170 } = req.query;
  const { employeeId, monthdesc, gradeId, salarybudescription, workbudesc, ledgerId, departmentId, designationId } = req.query;

  // Logging query parameters
  console.log('Received query parameters:', { employeeId, monthdesc, gradeId, salarybudescription, workbudesc, ledgerId, departmentId, designationId });

  // Validate required parameters
  if (!employeeId || !monthdesc || !gradeId || !salarybudescription || !workbudesc || !ledgerId || !departmentId || !designationId) {
    return res.status(400).send('Employee ID and Month Period ID are required');
  }

  try {
    const payrollPool = await poolPromise;
    const pool = await poolPromise2;

    // Construct SQL queries
    const payrollUnitQuery = `SELECT * FROM labourOnboarding WHERE empId = ${employeeId}`;
    const payrollGradUnitQuery = `SELECT * FROM Payroll.Grade WHERE id = ${gradeId}`;
    // const salaryBuQuery = `SELECT * FROM Framework.BusinessUnit WHERE Description like ${salarybudescription}`;
    const salaryBuQuery = `SELECT * FROM Framework.BusinessUnit WHERE Description LIKE '%${salarybudescription.replace(/'/g, "''")}%'`;
    // const workBuQuery = `SELECT * FROM Framework.BusinessUnit WHERE Description like ${workbudesc}`;
    const workBuQuery = `SELECT * FROM Framework.BusinessUnit WHERE Description LIKE '%${workbudesc.replace(/'/g, "''")}%'`;
    // const frameworkQuery = `SELECT * FROM Framework.BusinessUnit WHERE Id = ${businessUnitId1}`;
    // const financeQuery = `SELECT * FROM Finance.Ledger WHERE Id = ${ledgerId}`;
    // const frameworksQuery = `SELECT * FROM Framework.BusinessUnit WHERE Id = ${businessUnitId2}`;
    const payrollDepartmentQuery = `SELECT * FROM Payroll.Department WHERE Id = ${departmentId}`;
    const payrollDesignationQuery = `SELECT * FROM Payroll.Designation WHERE Id = ${designationId}`;
    // const payrollEmployeeQuery = `Select * From Framework.FiscalYearPeriod Where Description like ${monthdesc}`;
    const payrollEmployeeQuery = `Select * From Framework.FiscalYearPeriod Where Description like '%${monthdesc.replace(/'/g, "''")}%'`;

    const salaryBuQueryResult = await pool.request().query(salaryBuQuery);
    const salaryBuJson = JSON.stringify(salaryBuQueryResult);
    console.log('salaryBuQueryResult :' +salaryBuJson);
    let salaryUnitResult;
    let groupIdResult;
    if(salaryBuQueryResult.recordset.length > 0){
    const salaryBuDesc = salaryBuQueryResult.recordset[0];
    const frameworkQuery = `SELECT * FROM Framework.BusinessUnit WHERE Id = ${salaryBuDesc.Id}`;
    const frameworkUnit = await pool.request().query(frameworkQuery);
    console.log('salaryBuUnit :' +JSON.stringify(frameworkUnit));      
    salaryUnitResult = frameworkUnit.recordset[0];
    if(frameworkUnit.recordset.length > 0){
      console.log("salaryUnitResult : " + salaryUnitResult.InterUnitParentId);
      const frameworkQuery = `SELECT * FROM Finance.Ledger Where Id = ${salaryUnitResult.InterUnitParentId}`;
      const frameworkUnit = await pool.request().query(frameworkQuery);
      groupIdResult = frameworkUnit.recordset[0];
      console.log('groupIdResult : ' + groupIdResult);
    }
    console.log('salary :' +JSON.stringify(salaryUnitResult));      
    }

    const workBuQueryResult = await pool.request().query(workBuQuery);
    const workBuJson = JSON.stringify(workBuQueryResult);
    console.log('workBuQueryResult :' +workBuJson);      
    let workUnitResult;
    if(workBuQueryResult.recordset.length > 0){
      const workBuDesc = workBuQueryResult.recordset[0];
      const frameworkQuery = `SELECT * FROM Framework.BusinessUnit WHERE Id = ${workBuDesc.Id}`;
      const frameworkUnit = await pool.request().query(frameworkQuery);
    console.log('workbuUnit :' +JSON.stringify(frameworkUnit));      
      workUnitResult = frameworkUnit.recordset[0];
    console.log('workbu :' +workUnitResult);     

    }

    const monthPeriodResult = await pool.request().query(payrollEmployeeQuery);
    console.log(monthPeriodResult);
    let monthPeriodDetails;
    if(monthPeriodResult.recordset.length > 0){
      const month = monthPeriodResult.recordset[0];
      const frameworkQuery = `Select * From Framework.FiscalYearPeriod WHERE Id = ${month.Id}`;
      const frameworkUnit = await pool.request().query(frameworkQuery);
      monthPeriodDetails = frameworkUnit.recordset[0];
      console.log(monthPeriodDetails);
    }

    // Execute queries and handle results
    const [
      payrollUnitResult,
      payrollGradUnitResult,
      // financeUnitResult,
      payrollDepartmenUnitResult,
      payrollDesignationUnitResult,
    ] = await Promise.all([
      payrollPool.request().query(payrollUnitQuery),
      pool.request().query(payrollGradUnitQuery),
      // pool.request().query(financeQuery),
      pool.request().query(payrollDepartmentQuery),
      pool.request().query(payrollDesignationQuery),
    ]);

    const payrollUnit = payrollUnitResult.recordset[0];
    const payrollGradUnit = payrollGradUnitResult.recordset[0];
    // const financeUnit = financeUnitResult.recordset[0];
    const payrollDepartmentUnit = payrollDepartmenUnitResult.recordset[0];
    const payrollDesignationUnit = payrollDesignationUnitResult.recordset[0];
console.log("payrollUnit : " + payrollUnit);
    const dynamicData2 = {
      payrollUnit,
      monthPeriod: {
        id: monthPeriodDetails.Id,
        description: monthPeriodDetails.Description,
        periodFrom: monthPeriodDetails.PeriodFrom,
        periodTo: monthPeriodDetails.PeriodTo,
        actualPeriod: monthPeriodDetails.ActualPeriod,
        startDate: monthPeriodDetails.PeriodFrom,
        endDate: monthPeriodDetails.PeriodTo,
        cutOffPeriodFrom: monthPeriodDetails.CutOffPeriodFrom,
        cutOffPeriodTo: monthPeriodDetails.CutOffPeriodTo
      },
      grade: payrollGradUnit,
      email1: salaryUnitResult.Email1,
      natureId: salaryUnitResult.NatureId,
      interUnitLedgerId: salaryUnitResult.InterUnitLedgerId,
      interUnitParentId: salaryUnitResult.InterUnitParentId,
      interUnitLedger: {
        ledgerGroupId: groupIdResult.GroupId
      },
      id: salaryUnitResult.Id,
      code: salaryUnitResult.Code,
      description: salaryUnitResult.Description,
      parentId: salaryUnitResult.ParentId,
      parentDesc: payrollUnit.companyName,
      department: payrollDepartmentUnit,
      designation: payrollDesignationUnit,
      workbu: {
        code: workUnitResult.Code
      }
    };

    res.json(dynamicData2);
  } catch (error) {
    console.error('Error fetching dynamic data:', error);
    res.status(500).send('Error fetching dynamic data');
  }
};





const saveApiResponsePayload = async (req, res) => {
  const {
    userId,
    labourID: LabourID,
    name,
    aadharNumber,
    employeeMasterPayload,
    employeeMasterResponseId,
    employeeMasterLedgerId,
    employeeMasterUserId,
    employeeCompanyID,
    employeeExtraInfoId,
    employeeMasterFullResponse,
    organizationMasterPayload,
    organizationMasterResponseId,
    organizationMasterOrgId,
    organizationMasterStatus,
    organizationMasterFullResponse
  } = req.body;

  try {
    const pool = await poolPromise;
    const query = `
      INSERT INTO API_ResponsePayloads (
        userId, LabourID, name, aadharNumber,
        employeeMasterId, employeeMasterLedgerId,
        employeeMasterUserId, employeeCompanyID, employeeExtraInfoId, employeeMasterStatus,
        organizationMasterId, organizationMasterOrgId, organizationMasterStatus,
        employeeMasterPayload, organizationMasterPayload,
        employeeMasterResponse, organizationMasterResponse, createdAt, updatedAt
      ) VALUES (
        @userId, @LabourID, @name, @aadharNumber,
        @employeeMasterId, @employeeMasterLedgerId,
        @employeeMasterUserId, @employeeCompanyID, @employeeExtraInfoId, @employeeMasterStatus,
        @organizationMasterId, @organizationMasterOrgId, @organizationMasterStatus,
        @employeeMasterPayload, @organizationMasterPayload,
        @employeeMasterResponse, @organizationMasterResponse, GETDATE(), GETDATE()
      )
    `;

    // // Logging the extracted and full response data
    console.log('LabourID.....check:', LabourID);
    // console.log('employeeMasterLedgerId:', employeeMasterLedgerId);
    // console.log('employeeMasterUserId:', employeeMasterUserId);
    // console.log('employeeCompanyID:', employeeCompanyID);
    // console.log('employeeExtraInfoId:', employeeExtraInfoId);
    // console.log('employeeMasterFullResponse:', employeeMasterFullResponse);
    // console.log('organizationMasterResponseId:', organizationMasterResponseId);
    // console.log('organizationMasterOrgId:', organizationMasterOrgId);
    // console.log('organizationMasterStatus:', organizationMasterStatus);
    // console.log('organizationMasterFullResponse:', organizationMasterFullResponse);

    // Execute SQL query to insert data into the database
    await pool
      .request()
      .input('userId', sql.Int, userId)
      .input('LabourID', sql.NVarChar(50), LabourID)
      .input('name', sql.NVarChar(100), name)
      .input('aadharNumber', sql.NVarChar(20), aadharNumber)
      .input('employeeMasterId', sql.Int, employeeMasterResponseId)
      .input('employeeMasterLedgerId', sql.Int, employeeMasterLedgerId)
      .input('employeeMasterUserId', sql.Int, employeeMasterUserId)
      .input('employeeCompanyID', sql.Int, employeeCompanyID)
      .input('employeeExtraInfoId', sql.Int, employeeExtraInfoId)
      .input('employeeMasterStatus', sql.NVarChar(10), employeeMasterFullResponse?.status ? 'true' : 'false')
      .input('organizationMasterId', sql.Int, organizationMasterResponseId)
      .input('organizationMasterOrgId', sql.Int, organizationMasterOrgId)
      .input('organizationMasterStatus', sql.NVarChar(10), organizationMasterStatus ? 'true' : 'false')
      .input('employeeMasterPayload', sql.NVarChar(sql.MAX), JSON.stringify(employeeMasterPayload))
      .input('organizationMasterPayload', sql.NVarChar(sql.MAX), JSON.stringify(organizationMasterPayload))
      .input('employeeMasterResponse', sql.NVarChar(sql.MAX), JSON.stringify(employeeMasterFullResponse))
      .input('organizationMasterResponse', sql.NVarChar(sql.MAX), JSON.stringify(organizationMasterFullResponse))
      .query(query);

    res.status(200).send('API response and payload saved successfully.');
  } catch (err) {
    console.error('Error saving API response and payload:', err.message);
    res.status(500).send('Error saving API response and payload');
  }
};

// Function to update Employee Master data and save responses
const updateEmployeeMaster = async (req, res) => {
  const { userId, LabourID, name, aadharNumber, employeeMasterPayload, organizationMasterPayload } = req.body; 

  try {
      // API call to Employee Master
      const employeeMasterResponse = await axios.post('https://vjerp.farvisioncloud.com/Payroll/odata/Employees', employeeMasterPayload, {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'apikey 8d1588e79eb31ed7cb57ff57325510572baa1008d575537615e295d3bbd7d558' }
      });

      // API call to Organization Master
      const organizationMasterResponse = await axios.post('https://vjerp.farvisioncloud.com/Payroll/odata/Organisations', organizationMasterPayload, {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'apikey 8d1588e79eb31ed7cb57ff57325510572baa1008d575537615e295d3bbd7d558' }
      });

      // Check if both responses are successful and save to database
      if (employeeMasterResponse.data.status && organizationMasterResponse.data.status) {
          await saveApiResponsePayload(userId, LabourID, name, aadharNumber, {}, employeeMasterResponse.data, organizationMasterResponse.data);
          res.json({ message: 'Employee Master and Organization Master data updated successfully' });
      } else {
          res.status(400).json({ message: 'Failed to update data from Employee Master or Organization Master' });
      }

  } catch (error) {
      console.error('Error updating Employee Master:', error.message);
      res.status(500).json({ message: 'Error updating Employee Master data' });
  }
};



// ATTENDANCE LABOUR CODE 

// Get labors whose attendance is older than 15 days or not present
// const getLaboursWithOldAttendance = async (req, res) => {
//   try {
//     const poolLabour = await poolPromise;
//     const poolAttendance = await poolPromise3; // Ensure poolAttendance is initialized

//     const { page = 1, limit = 1000 } = req.query;
//     const offset = (page - 1) * limit;

//     const today = new Date();
//     const startDate = new Date(today);
//     startDate.setDate(startDate.getDate() - 15);

//     const todaySQL = today.toISOString().slice(0, 10);
//     const startDateSQL = startDate.toISOString().slice(0, 10);

//     // Fetch labor data with pagination
//     const labourResult = await poolLabour.request().query(`
//       SELECT * FROM labourOnboarding
//       ORDER BY id
//       OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
//     `);

//     const labourIds = labourResult.recordset.map(labour => labour.LabourID);

//     if (labourIds.length === 0) {
//       return res.status(200).json({ labors: [] });
//     }

//     // Fetch attendance data for the last 15 days for these labour IDs
//     const attendanceResult = await poolAttendance.request()
//       .input('StartDate', sql.Date, startDateSQL)
//       .input('TodayDate', sql.Date, todaySQL)
//       .query(`
//         SELECT user_id 
//         FROM [etimetracklite11.8].[dbo].[Attendance] 
//         WHERE punch_date BETWEEN @StartDate AND @TodayDate
//         AND user_id IN (${labourIds.map(id => `'${id}'`).join(",")})
//       `);

//     const attendedLabourIds = attendanceResult.recordset.map(att => att.user_id);

//     const laboursWithNoAttendance = labourResult.recordset.filter(labour => !attendedLabourIds.includes(labour.LabourID));

//     // Update their status to Disable and add Reject_Reason
//     for (let labour of laboursWithNoAttendance) {
//       labour.Reject_Reason = "This labour attendance is older than 15 days or not present";
      
//       await poolLabour.request()
//         .input('id', sql.Int, labour.id)
//         .input('status', sql.VarChar, 'Disable')
//         .input('isApproved', sql.Int, 4)
//         .input('Reject_Reason', sql.VarChar, labour.Reject_Reason)
//         .query(`
//           UPDATE labourOnboarding 
//           SET status = @status, isApproved = @isApproved, Reject_Reason = @Reject_Reason
//           WHERE id = @id
//         `);
//     }

//     res.status(200).json({ labors: laboursWithNoAttendance });
//   } catch (err) {
//     console.error("Error fetching labors:", err);
//     res.status(500).json({ error: "Error fetching labors" });
//   }
// };



let cachedLabours = null; // This will hold the results of the cron job
let lastUpdate = null;

const getLaboursWithOldAttendance = async () => {
  try {
    const poolLabour = await poolPromise;
    const poolAttendance = await poolPromise3; // Ensure poolAttendance is initialized

    // const { page = 1, limit = 1000 } = req.query;
    // const offset = (page - 1) * limit;

    const today = new Date();
    let startDate = new Date(today);

    // Set start date to 15 days ago
    startDate.setDate(today.getDate() - 15);

    const todaySQL = today.toISOString().slice(0, 10);
    const startDateSQL = startDate.toISOString().slice(0, 10);

    // Fetch labor data with pagination, excluding labors created/approved in the last 15 days
    // Also exclude labors with status 'Resubmitted' (IsApproved = 3) or 'Rejected' (IsApproved = 2)
    const labourResult = await poolLabour.request().query(`
      SELECT * FROM labourOnboarding 
      WHERE (DATEDIFF(DAY, CreationDate, GETDATE()) > 15 OR CreationDate IS NULL)
      AND (status != 'Resubmitted' OR IsApproved != 3)
      AND (status != 'Rejected' OR IsApproved != 2)
      ORDER BY id
    `);

    const labourIds = labourResult.recordset.map(labour => labour.LabourID);

    if (labourIds.length === 0) {
      logger.info('No labours found for updating attendance.');
      // return res.status(200).json({ labors: [] });
      return [];
    }

    // Fetch attendance data, excluding Sundays (weekday = 1 for Monday and weekday = 7 for Sunday)
    const attendanceResult = await poolAttendance.request()
      .input('StartDate', sql.Date, startDateSQL)
      .input('TodayDate', sql.Date, todaySQL)
      .query(`
        SELECT user_id 
        FROM [etimetracklite11.8].[dbo].[Attendance] 
        WHERE punch_date BETWEEN @StartDate AND @TodayDate
        AND DATEPART(dw, punch_date) != 1  -- Exclude Sundays
        AND user_id IN (${labourIds.map(id => `'${id}'`).join(",")})
      `);

    const attendedLabourIds = attendanceResult.recordset.map(att => att.user_id);

    // Find labors without attendance in the last 15 days
    const laboursWithNoAttendance = labourResult.recordset.filter(labour => !attendedLabourIds.includes(labour.LabourID));

    // Update their status to Disable and add Reject_Reason, but only if not Resubmitted or Rejected
    for (let labour of laboursWithNoAttendance) {
      if (labour.status !== 'Resubmitted' && labour.isApproved !== 3 && labour.status !== 'Rejected' && labour.isApproved !== 2) {
        labour.Reject_Reason = "This labour attendance is older than 15 days or not present";

        await poolLabour.request()
          .input('id', sql.Int, labour.id)
          .input('status', sql.VarChar, 'Disable')
          .input('isApproved', sql.Int, 4)
          .input('Reject_Reason', sql.VarChar, labour.Reject_Reason)
          .query(`
            UPDATE labourOnboarding 
            SET status = @status, isApproved = @isApproved, Reject_Reason = @Reject_Reason
            WHERE id = @id
          `);
      }
    }
    logger.info(`Updated ${laboursWithNoAttendance.length} labours to 'Disable' status.`);
    // res.status(200).json({ labors: laboursWithNoAttendance });
    cachedLabours = laboursWithNoAttendance;
    lastUpdate = new Date(); // Track the last time the cron job ran

    return laboursWithNoAttendance;
  } catch (err) {
    // console.error("Error fetching labors:", err);
    logger.error(`Error during getLaboursWithOldAttendance: ${err.message}`, err);
    throw err;
    // res.status(500).json({ error: "Error fetching labors" });
  }
};

cron.schedule('2 19 * * *', async () => {
  logger.info('Running labour attendance check at 10.37 AM');
  try {
    await getLaboursWithOldAttendance();  // Cache the results at 2 AM
  } catch (err) {
    logger.error('Cron job failed', err);
  }
});

// Serve cached results to the frontend
const fetchCachedLabours = async (req, res) => {
  try {
    // Check if cached data exists
    if (!cachedLabours) {
      // No cached data available yet
      return res.status(503).json({ error: 'Data is not available yet, please check back later.' });
    }

    // Return cached data
    res.status(200).json({ labours: cachedLabours, lastUpdate });
  } catch (err) {
    console.error('Error in fetching cached labours data:', err);
    res.status(500).json({ error: "Failed to fetch cached labours data", details: err.message });
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
  getAttendanceLogs,
  getProjectDeviceStatus,
  approveLabour,
  updateProjectDeviceStatus,
  deleteProjectDeviceStatus,
  getProjectDeviceStatusSS,
  fetchDynamicData,
  fetchOrgDynamicData,
  addFvEmpId,
  saveApiResponsePayload,
  updateEmployeeMaster,
  getLaboursWithOldAttendance,
  fetchCachedLabours 
  // resubmitLabor
};


