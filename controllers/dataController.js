const cron = require('node-cron');
const axios = require('axios');
const logger = require('../logger')
const { sql, poolPromise2 } = require('../config/dbConfig2');
const { poolPromise3 } = require('../config/dbConfig3');
const { poolPromise } = require('../config/dbConfig');
const xml2js = require("xml2js")
// const SOAP_URL = "https://essl.vjerp.com:8530/iclock/WebAPIService.asmx";

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
    let businessUnitQuery = `SELECT * FROM Framework.BusinessUnit where Description LIKE '%${businessUnitDesc.replace(/'/g, "''")}%' and Type = 'C'`;
    const businessUnitQueryResult = await pool.request().query(businessUnitQuery);
    let result = businessUnitQueryResult.recordset[0];
    // console.log('getting result in 02-01-2025',result)
    let parentResult;
    let ledgerResult;
    let bankIdResult;
    if(businessUnitQueryResult.recordset.length > 0){
      const frameworkQuery = `SELECT * FROM Framework.BusinessUnit Where Id = ${result.ParentId}`;
      const frameworkUnit = await pool.request().query(frameworkQuery);
      parentResult = frameworkUnit.recordset[0];
      console.log('parentIdResult : ' + parentResult);

      const frameworkQueryLedger = `SELECT * FROM Finance.Ledger Where Id = ${result.InterUnitLedgerId}`;
      const frameworkUnitLedger = await pool.request().query(frameworkQueryLedger);
      ledgerResult = frameworkUnitLedger.recordset[0];
      console.log('ledgerResult : ' + ledgerResult);

      const paymentBankId = `select Id from [Payroll].[Bank] where CompanyId = ${result.Id}`;
      const paymentBankIdRecord = await pool.request().query(paymentBankId);
      bankIdResult = paymentBankIdRecord.recordset[0];
      console.log('BankIdResultForPayment: ',bankIdResult)

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
      bankId: bankIdResult ? bankIdResult.Id : null
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


const employeeMasterPayloadUpdatepost = async (req, res) => {
  console.log('Received Request Body:', req.body);

  const employeeMasterPayload = req.body;

  if (!employeeMasterPayload || Object.keys(employeeMasterPayload).length === 0) {
    console.error('Employee Master Payload is missing or empty');
    return res.status(400).json({ message: 'Employee Master Payload is required' });
  }

  try {
    // Validate critical fields
    if (!employeeMasterPayload.companyName || !employeeMasterPayload.code) {
      return res.status(400).json({ message: 'companyName and code are required' });
    }

    console.log('Sending Payload:', employeeMasterPayload);

    const employeeMasterResponse = await axios.post(
      'https://vjerp.farvisioncloud.com/Payroll/odata/Employees',
      employeeMasterPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'apikey 8d1588e79eb31ed7cb57ff57325510572baa1008d575537615e295d3bbd7d558',
        },
      }
    );

    console.log('Response from API:', employeeMasterResponse.data);

    const { status, outputList } = employeeMasterResponse.data;

    // Validate `details` structure before accessing `outputList`
    if (status === true) {
      return res.status(200).json({
        status: true,
        message: 'Employee master details updated successfully.',
        outputList: outputList || {},
      });
    } else if (details?.status === true) {
      // Handle case where `details.status` is true but top-level status is false
      return res.status(200).json({
        status: true,
        message: 'Employee master details updated successfully (with partial success).',
        outputList: outputList || {},
      });
    } else {
      // Fallback for invalid or incomplete responses
      return res.status(400).json({
        status: false,
        message: message || 'Failed to update employee master details.',
      });
    }
  } catch (error) {
    console.error('Error updating Employee Master:', error.response?.data || error.message);

    if (error.response?.status === 409) {
      return res.status(409).json({
        message: 'Conflict occurred while updating Employee Master. Check for duplicate or conflicting data.',
        details: error.response?.data,
      });
    }

    return res.status(500).json({
      message: 'Internal Server Error',
      details: error.response?.data || error.message,
    });
  }
};

const organizationMasterPayloadUpdatepost = async (req, res) => {
  console.log('Received Request Body:', req.body);

  const organizationMasterPayload = req.body;

  // Validate that the payload exists and is not emptys
  if (!organizationMasterPayload || Object.keys(organizationMasterPayload).length === 0) {
    console.error('Organization Master Payload is missing or empty');
    return res.status(400).json({ message: 'Organization Master Payload is required' });
  }

  try {
    // if (!organizationMasterPayload.companyName || !organizationMasterPayload.code) {
    //   return res.status(400).json({ message: 'companyName and code are required' });
    // }

    const organizationMasterResponse = await axios.post(
      'https://vjerp.farvisioncloud.com/Payroll/odata/Organisations',
      organizationMasterPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'apikey 8d1588e79eb31ed7cb57ff57325510572baa1008d575537615e295d3bbd7d558',
        },
      }
    );
console.log('organizationMasterResponse 2025 ', organizationMasterResponse)
    // Check if the response status is successful
    if (organizationMasterResponse.data.status) {
      res.status(200).json({
        status: true,
        outputList: organizationMasterResponse.data.outputList,
        message: 'Organization master details updated successfully.',
      });
    } else {
      console.error(
        'Failed to update organization master details:',
        organizationMasterResponse.data.message || 'No error message provided by the API.'
      );
      res.status(400).json({
        status: false,
        message: organizationMasterResponse.data.message || 'Failed to update organization master details.',
      });
    }
  } catch (error) {
    console.error(
      'Error updating Organization Master:',
      error.response?.data || error.message
    );

    if (error.response?.status === 409) {
      return res.status(409).json({
        message: 'Conflict occurred while updating Organization Master. Check for duplicate or conflicting data.',
        details: error.response?.data,
      });
    }

    return res.status(500).json({
      message: 'Internal Server Error',
      details: error.message,
    });
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


const getAllLaboursWithTransferDetails = async (req, res) => {
  try {
    const { labourIds } = req.body;
    if (!labourIds || labourIds.length === 0) {
      return res.status(400).json({ message: 'No labour IDs provided.' });
    }

    // SQL query to fetch transfer site names and createdAt for the provided labour IDs
    const query = `
      SELECT LabourID, transferSiteName, currentSiteName, createdAt 
      FROM [dbo].[API_TransferSite] 
      WHERE LabourID IN (${labourIds.map((id) => `'${id}'`).join(', ')})
    `;

    const pool = await poolPromise;
    const result = await pool.request().query(query);

    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // Send the fetched data as response
    } else {
      res.status(404).json({ message: 'No transfer data found for the given Labour IDs.' });
    }
  } catch (error) {
    console.error('Error fetching transfer site names:', error);
    res.status(500).json({
      message: 'Failed to fetch transfer site names.',
      error: error.message,
    });
  }
};








// let cachedLabours = null; // This will hold the results of the cron job
// let lastUpdate = null;

// const getLaboursWithOldAttendance = async () => {
//   try {
//     const poolLabour = await poolPromise;
//     const poolAttendance = await poolPromise3; // Ensure poolAttendance is initialized

//     // const { page = 1, limit = 1000 } = req.query;
//     // const offset = (page - 1) * limit;

//     const today = new Date();
//     let startDate = new Date(today);

//     // Set start date to 15 days ago
//     startDate.setDate(today.getDate() - 15);

//     const todaySQL = today.toISOString().slice(0, 10);
//     const startDateSQL = startDate.toISOString().slice(0, 10);

//     // Fetch labor data with pagination, excluding labors created/approved in the last 15 days
//     // Also exclude labors with status 'Resubmitted' (IsApproved = 3) or 'Rejected' (IsApproved = 2)
//     const labourResult = await poolLabour.request().query(`
//       SELECT * FROM labourOnboarding 
//       WHERE (DATEDIFF(DAY, CreationDate, GETDATE()) > 15 OR CreationDate IS NULL)
//       AND (status != 'Resubmitted' OR IsApproved != 3)
//       AND (status != 'Rejected' OR IsApproved != 2)
//       ORDER BY id
//     `);

//     const labourIds = labourResult.recordset.map(labour => labour.LabourID);

//     if (labourIds.length === 0) {
//       logger.info('No labours found for updating attendance.');
//       // return res.status(200).json({ labors: [] });
//       return [];
//     }

//     // Fetch attendance data, excluding Sundays (weekday = 1 for Monday and weekday = 7 for Sunday)
//     const attendanceResult = await poolAttendance.request()
//       .input('StartDate', sql.Date, startDateSQL)
//       .input('TodayDate', sql.Date, todaySQL)
//       .query(`
//         SELECT user_id 
//         FROM [etimetracklite11.8].[dbo].[Attendance] 
//         WHERE punch_date BETWEEN @StartDate AND @TodayDate
//         AND DATEPART(dw, punch_date) != 1  -- Exclude Sundays
//         AND user_id IN (${labourIds.map(id => `'${id}'`).join(",")})
//       `);

//     const attendedLabourIds = attendanceResult.recordset.map(att => att.user_id);

//     // Find labors without attendance in the last 15 days
//     const laboursWithNoAttendance = labourResult.recordset.filter(labour => !attendedLabourIds.includes(labour.LabourID));

//     // Update their status to Disable and add Reject_Reason, but only if not Resubmitted or Rejected
//     for (let labour of laboursWithNoAttendance) {
//       if (labour.status !== 'Resubmitted' && labour.isApproved !== 3 && labour.status !== 'Rejected' && labour.isApproved !== 2) {
//         labour.Reject_Reason = "This labour attendance is older than 15 days or not present";

//         await poolLabour.request()
//           .input('id', sql.Int, labour.id)
//           .input('status', sql.VarChar, 'Disable')
//           .input('isApproved', sql.Int, 4)
//           .input('Reject_Reason', sql.VarChar, labour.Reject_Reason)
//           .query(`
//             UPDATE labourOnboarding 
//             SET status = @status, isApproved = @isApproved, Reject_Reason = @Reject_Reason
//             WHERE id = @id
//           `);
//       }
//     }
//     logger.info(`Updated ${laboursWithNoAttendance.length} labours to 'Disable' status.`);
//     // res.status(200).json({ labors: laboursWithNoAttendance });
//     cachedLabours = laboursWithNoAttendance;
//     lastUpdate = new Date(); // Track the last time the cron job ran

//     return laboursWithNoAttendance;
//   } catch (err) {
//     // console.error("Error fetching labors:", err);
//     logger.error(`Error during getLaboursWithOldAttendance: ${err.message}`, err);
//     throw err;
//     // res.status(500).json({ error: "Error fetching labors" });
//   }
// };

// cron.schedule('17 10 * * *', async () => {
//   logger.info('Running labour attendance check at 10.16 AM labours Attendancea at 17-10-2024');
//   try {
//     await getLaboursWithOldAttendance();  // Cache the results at 2 AM
//   } catch (err) {
//     logger.error('Cron job failed', err);
//   }
// });

// // Serve cached results to the frontend
// const fetchCachedLabours = async (req, res) => {
//   try {
//     // Check if cached data exists
//     if (!cachedLabours) {
//       // No cached data available yet
//       return res.status(503).json({ error: 'Data is not available yet, please check back later.' });
//     }

//     res.status(200).json({ labours: cachedLabours, lastUpdate });
//   } catch (err) {
//     console.error('Error in fetching cached labours data:', err);
//     res.status(500).json({ error: "Failed to fetch cached labours data", details: err.message });
//   }
// };











// ATTENDANCE LABOUR CODE 

let cachedLabours = [];
let previousLabours = [];
let lastUpdate = null;

// Helper function to get the SerialNumber based on the labour's BusinessUnit
const getSerialNumberByLabourID = async (labourID) => {
  console.log(`Fetching SerialNumber for LabourID: ${labourID}`);
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('LabourID', sql.NVarChar, labourID)
      .query(`
        SELECT pds.SerialNumber
        FROM ProjectDeviceStatus pds
        JOIN labourOnboarding lob ON pds.BusinessUnit = lob.BusinessUnit
        WHERE lob.LabourID = @LabourID
      `);

    if (result.recordset.length === 0) {
      logger.warn(`No serial number found for LabourID: ${labourID}`);
      console.log(`No serial number found for LabourID: ${labourID}`);
      return null;
    }
    const serialNumber = result.recordset[0].SerialNumber;
    console.log(`Found SerialNumber: ${serialNumber} for LabourID: ${labourID}`);
    return serialNumber;
  } catch (error) {
    logger.error(`Error fetching serial number for LabourID: ${labourID}`, error);
    console.error(`Error fetching serial number for LabourID: ${labourID}`, error);
    throw error;
  }
};

// Save SOAP request and response logs to the database
const saveLogToDatabase = async (userId, labourID, serialNumber, soapRequestPayload, soapResponsePayload, status, rejectReason = null, attendanceStatus = 'N/A', commandId = 'N/A') => {
  console.log(`Saving log for LabourID: ${labourID}, status: ${status}`);
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('LabourID', sql.NVarChar, labourID || '')
      .input('SerialNumber', sql.VarChar, serialNumber || 'N/A') // Handle null values
      .input('soapRequestPayload', sql.NVarChar(sql.MAX), typeof soapRequestPayload === 'string' ? soapRequestPayload.trim() : JSON.stringify(soapRequestPayload || '{}'))
      .input('soapResponsePayload', sql.NVarChar(sql.MAX), typeof soapResponsePayload === 'string' ? soapResponsePayload.trim() : JSON.stringify(soapResponsePayload || '{}'))
      .input('status', sql.VarChar, status || 'Unknown')
      .input('RejectReason', sql.VarChar, rejectReason || 'N/A') // Default to N/A if null
      .input('attendanceStatus', sql.VarChar, attendanceStatus || 'N/A') // Handle attendanceStatus
      .input('CommandId', sql.VarChar, commandId || 'N/A')
      .query(`
        INSERT INTO LabourAttendanceLogs 
         (userId, LabourID, SerialNumber, soapRequestPayload, soapResponsePayload, status, RejectReason,attendanceStatus, CommandId, CreatedAt)
        VALUES (@userId, @LabourID, @SerialNumber, @soapRequestPayload, @soapResponsePayload, @status, @RejectReason, @attendanceStatus, @CommandId, GETDATE())
      `);

    console.log(`Log saved successfully for LabourID: ${labourID}`);
  } catch (error) {
    console.error(`Error saving log for LabourID: ${labourID}`, error);
  }
};

// Send SOAP request to delete user
const sendDeleteUserRequest = async (labour) => {
  const labourID = labour?.LabourID; // Safely extract LabourID from labour object
  const userId = labour?.id; // Extract userId from labour object
  let attendanceStatus = 'Disable'; 

  if (!labourID || typeof labourID !== 'string') {
    console.error(`Invalid LabourID for labour:`, labour);
    return false; // Early return if LabourID is invalid
  }
  console.log(`Sending SOAP request for LabourID: ${labourID}`);
  try {
    const serialNumber = await getSerialNumberByLabourID(labourID);
    if (!serialNumber) {
      console.log(`No SerialNumber found for LabourID: ${labourID}`);
      attendanceStatus = 'Disable'; // Mark attendanceStatus as Disable if no serial number
      await saveLogToDatabase(userId, labourID, null, {}, {}, 'Error', 'SerialNumber not found', attendanceStatus, null);
      return false;
    }

    const soapEnvelope = `
      <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <DeleteUser xmlns="http://tempuri.org/">
            <APIKey>11</APIKey>
            <EmployeeCode>${labourID}</EmployeeCode>
            <SerialNumber>${serialNumber}</SerialNumber>
            <UserName>test</UserName>
            <UserPassword>Test@123</UserPassword>
            <CommandId>25</CommandId>
          </DeleteUser>
        </soap:Body>
      </soap:Envelope>`;

      console.log(`SOAP Request for LabourID: ${labourID}`, soapEnvelope);

    const response = await axios.post(
      'https://essl.vjerp.com:8530/iclock/WebAPIService.asmx?op=DeleteUser',
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://tempuri.org/DeleteUser',
        },
      }
    );

    console.log(`SOAP Response for LabourID: ${labourID}`, response.data);
    const parsedResponse = await xml2js.parseStringPromise(response.data, { trim: true, explicitArray: false });
    const soapResponseBody = parsedResponse['soap:Envelope']['soap:Body']; // Only store the body part

    const status = soapResponseBody?.DeleteUserResponse?.DeleteUserResult === 'success' ? 'success' : 'Failure';
    const CommandId = soapResponseBody?.DeleteUserResponse?.CommandId || 'N/A';

    // Save the SOAP request/response in the database
    await saveLogToDatabase(userId, labourID, serialNumber, soapEnvelope, JSON.stringify(soapResponseBody), status, null, attendanceStatus, CommandId);

    if (status === 'success') {
      console.log(`Updating labourOnboarding for LabourID: ${labourID} after successful SOAP response.`);
      try {
        const poolLabour = await poolPromise;
        await poolLabour.request()
          .input('id', sql.Int, labour.id)
          .input('status', sql.NVarChar, 'Disable')
          .input('isApproved', sql.Int, 4)
          .input('Reject_Reason', sql.VarChar, labour.Reject_Reason || 'SOAP deletion successful')
          .query(`
            UPDATE labourOnboarding 
            SET status = @status, isApproved = @isApproved, Reject_Reason = @Reject_Reason
            WHERE id = @id
          `);
        console.log(`Successfully updated labourOnboarding for LabourID: ${labourID}.`);
      } catch (updateError) {
        console.error(`Error updating labourOnboarding for LabourID: ${labourID}`, updateError);
        throw updateError;
      }
    }

    return status === 'success';
  } catch (error) {
    console.error(`Error sending SOAP request for LabourID: ${labourID}`, error);

    await saveLogToDatabase(userId, labourID, null, soapEnvelope, JSON.stringify({ message: error.message }), 'Error', 'SOAP request failed', attendanceStatus, null);
    return false;
  }
};


const isLabourAlreadyLogged = async (labourID) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('LabourID', sql.NVarChar, labourID)
      .query(`
        SELECT COUNT(*) as count FROM LabourAttendanceLogs WHERE LabourID = @LabourID
      `);
    return result.recordset[0].count > 0; // Return true if LabourID exists
  } catch (error) {
    console.error(`Error checking LabourAttendanceLogs for LabourID: ${labourID}`, error);
    return false; // Assume not logged if error occurs
  }
};

// Main function to get labours with old attendance and process them
const getLaboursWithOldAttendance = async () => {
  console.log('Fetching labours with old attendance...');
  try {
    const poolLabour = await poolPromise;
    const poolAttendance = await poolPromise3;

    const today = new Date();
    let startDate = new Date(today);
    startDate.setDate(today.getDate() - 15);

    const todaySQL = today.toISOString().slice(0, 10);
    const startDateSQL = startDate.toISOString().slice(0, 10);

    const labourResult = await poolLabour.request().query(`
      SELECT * FROM labourOnboarding 
      WHERE (DATEDIFF(DAY, CreationDate, GETDATE()) > 15 OR CreationDate IS NULL)
      AND (status != 'Resubmitted' OR IsApproved != 3)
      AND (status != 'Rejected' OR IsApproved != 2)
      ORDER BY id
    `);

    const labourIds = labourResult.recordset.map(labour => labour.LabourID);
    console.log(`Found ${labourIds.length} labours for processing.`);
    if (labourIds.length === 0) {
      logger.info('No labours found for updating attendance.');
      return [];
    }

    const attendanceResult = await poolAttendance.request()
      .input('StartDate', sql.Date, startDateSQL)
      .input('TodayDate', sql.Date, todaySQL)
      .query(`
        SELECT user_id 
        FROM [etimetracklite11.8].[dbo].[Attendance] 
        WHERE punch_date BETWEEN @StartDate AND @TodayDate
        AND user_id IN (${labourIds.map(id => `'${id}'`).join(",")})
      `);

    const attendedLabourIds = attendanceResult.recordset.map(att => att.user_id);
    console.log(`Found ${attendedLabourIds.length} labours with attendance.`);

    const laboursWithNoAttendance = labourResult.recordset.filter(
      labour => !attendedLabourIds.includes(labour.LabourID)
    );

    console.log(`Found ${laboursWithNoAttendance.length} labours with no attendance.`);

    let newLabourCount = 0;

    for (let labour of laboursWithNoAttendance) {
      if (!labour.LabourID) {
        console.log(`Invalid LabourID for labour with id: ${labour.id}`);
        continue;
      }

      const alreadyLogged = await isLabourAlreadyLogged(labour.LabourID);
      if (alreadyLogged) {
        console.log(`LabourID: ${labour.LabourID} is already logged. Skipping SOAP request.`);
        continue; // Skip if LabourID is already logged
      }

      console.log(`Processing LabourID: ${labour.LabourID}`);
      if (labour.status !== 'Resubmitted' && labour.isApproved !== 3 &&
          labour.status !== 'Rejected' && labour.isApproved !== 2) {
        labour.Reject_Reason = "This labour attendance is older than 15 days or not present";

        const success = await sendDeleteUserRequest(labour);  // Pass full labour object
        if (success) {
          console.log(`Successfully processed LabourID: ${labour.LabourID}`);
          await poolLabour.request()
            .input('id', sql.Int, labour.id)
            .input('status', sql.NVarChar, 'Disable')
            .input('isApproved', sql.Int, 4)
            .input('Reject_Reason', sql.VarChar, labour.Reject_Reason)
            .query(`
              UPDATE labourOnboarding 
              SET status = @status, isApproved = @isApproved, Reject_Reason = @Reject_Reason
              WHERE id = @id
            `);
          newLabourCount++; // Increment count of processed labours
        }
      }
    }

    logger.info(`Updated ${newLabourCount} new labours to 'Disable' status today.`);
    cachedLabours = [...cachedLabours, ...laboursWithNoAttendance];
    previousLabours = [...laboursWithNoAttendance];
    lastUpdate = new Date();

    return newLabourCount; // Return the number of new labours processed
  } catch (error) {
    console.error('Error during getLaboursWithOldAttendance:', error);
    logger.error(`Error during getLaboursWithOldAttendance: ${error.message}`);
    throw error;
  }
};

cron.schedule('08 01 * * *', async () => {
  logger.info('Running labour attendance check at 01:08 AM');
  try {
    const newLaboursProcessed = await getLaboursWithOldAttendance();  // Cache the results and get count
    logger.info(`${newLaboursProcessed} new labours were processed for deletion today.`);
  } catch (err) {
    logger.error('Cron job failed', err);
  }
});


//-----------------------------   Function for addEmployee and deleteUser from ESSL Device -----------------------------

const getAdminSiteTransferApproval = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT * FROM AdminSiteTransferApproval`);
    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'No records found' });
    // }
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

const siteTransferRequestforAdmin = async (req, res) => {
  try {
      const { userId, LabourID, name, currentSite, transferSite, currentSiteName, transferSiteName, transferDate, siteTransferBy } = req.body;

      if (!LabourID || !currentSite || !transferSite) {
          return res.status(400).json({ message: "All fields are required." });
      }

      const pool = await poolPromise;
      await pool.request()
          .input("userId", sql.Int, userId || null)
          .input("LabourID", sql.NVarChar(50), LabourID)
          .input("name", sql.NVarChar(255), name || null)
          .input("currentSite", sql.Int, currentSite)
          .input("transferSite", sql.Int, transferSite)
          .input("currentSiteName", sql.NVarChar(255), currentSiteName)
          .input("transferSiteName", sql.NVarChar(255), transferSiteName)
          .input("transferDate", sql.Date, transferDate || null)
          .input("siteTransferBy", sql.NVarChar(50), siteTransferBy || null)
          .query(`
              INSERT INTO AdminSiteTransferApproval 
              (userId, LabourID, name, currentSite, transferSite, currentSiteName, transferSiteName, siteTransferBy, transferDate, adminStatus, isAdminApproval, isAdminReject)
              VALUES (@userId, @LabourID, @name, @currentSite, @transferSite, @currentSiteName, @transferSiteName, @siteTransferBy, @transferDate, 'Pending', 0, 0)
          `);

      res.status(201).json({ message: "Transfer request submitted successfully." });
  } catch (error) {
      console.error("Error adding transfer request:", error);
      res.status(500).json({ message: "Failed to add transfer request.", error: error.message });
  }
};



const approveSiteTransfer = async (req, res) => {
  try {
    const { id } = req.query; // Extract `id` from query parameters.

    if (!id) {
      return res.status(400).json({ message: "ID is required." });
    }

    const pool = await poolPromise;

    // Fetch the approval details using `id`
    const approval = await pool.request()
      .input("id", sql.NVarChar(50), id)
      .query(`
        SELECT * FROM AdminSiteTransferApproval
        WHERE id = @id AND adminStatus = 'Pending'
      `);

    if (approval.recordset.length === 0) {
      return res.status(404).json({ message: "No pending approval found for the given ID." });
    }

    const transferDetails = approval.recordset[0];

    // Update admin approval status
    await pool.request()
      .input("id", sql.NVarChar(50), id)
      .query(`
        UPDATE AdminSiteTransferApproval
        SET adminStatus = 'Approved', isAdminApproval = 1, updatedAt = GETDATE(), siteTransferApproveDate = GETDATE()
        WHERE id = @id AND adminStatus = 'Pending'
      `);

    // Call saveTransferData with the fetched details
    await saveTransferData({
      body: {
        userId: transferDetails.userId,
        LabourID: transferDetails.LabourID, // Keep `LabourID` here if required downstream
        name: transferDetails.name,
        currentSite: transferDetails.currentSite,
        transferSite: transferDetails.transferSite,
        currentSiteName: transferDetails.currentSiteName,
        transferSiteName: transferDetails.transferSiteName,
        siteTransferBy: transferDetails.siteTransferBy,
      },
    }, {
      status: (statusCode) => ({
        json: (response) => {
          console.log("saveTransferData Response:", response);
        },
      }),
    });

    // Log admin approval
    await saveLogToDatabaseSiteTransfer(
      transferDetails.userId,
      transferDetails.LabourID, // Use LabourID for logging purposes
      "Admin Approved",
      `Site transfer approved for ${transferDetails.name} from ${transferDetails.currentSiteName} to ${transferDetails.transferSiteName}.`,
      "Success"
    );

    res.status(200).json({ message: "Site transfer approved and processed successfully." });
  } catch (error) {
    console.error("Error approving site transfer:", error);
    res.status(500).json({ message: "Failed to approve site transfer.", error: error.message });
  }
};


const rejectSiteTransfer = async (req, res) => {
  try {
    const { id, rejectReason } = req.body; // Extract `id` and `rejectReason` from the request body.

    if (!id) {
      return res.status(400).json({ message: "ID is required." });
    }

    const pool = await poolPromise;

    // Fetch the approval details using `id`
    const approval = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT * FROM AdminSiteTransferApproval
        WHERE id = @id AND adminStatus = 'Pending'
      `);

    if (approval.recordset.length === 0) {
      return res.status(404).json({ message: "No pending approval found for the given ID." });
    }

    const transferDetails = approval.recordset[0];

    // Update admin rejection status in AdminSiteTransferApproval
    await pool.request()
      .input("id", sql.Int, id)
      .input("rejectReason", sql.NVarChar(sql.MAX), rejectReason || "No reason provided")
      .query(`
        UPDATE AdminSiteTransferApproval
        SET 
          adminStatus = 'Rejected', 
          isAdminReject = 1, 
          updatedAt = GETDATE(), 
          rejectionReason = @rejectReason, 
          siteTransferRejectDate = GETDATE()
        WHERE id = @id AND adminStatus = 'Pending'
      `);

    // Update rejectionReason in API_TransferSite
    await pool.request()
      .input("LabourID", sql.NVarChar(50), transferDetails.LabourID)
      .input("rejectReason", sql.NVarChar(sql.MAX), rejectReason || "No reason provided")
      .query(`
        UPDATE API_TransferSite
        SET rejectionReason = @rejectReason, updatedAt = GETDATE()
        WHERE LabourID = @LabourID
      `);

    // Log admin rejection
    await saveLogToDatabaseSiteTransfer(
      transferDetails.userId,
      transferDetails.LabourID,
      "Admin Rejected",
      `Site transfer request for LabourID ${transferDetails.LabourID} was rejected. Reason: ${rejectReason || "No reason provided"}`,
      "Rejected"
    );

    res.status(200).json({ message: "Site transfer request rejected successfully." });
  } catch (error) {
    console.error("Error rejecting site transfer:", error);
    res.status(500).json({ message: "Failed to reject site transfer.", error: error.message });
  }
};




const editSiteTransfer = async (req, res) => {
  try {
    const { LabourID, transferSite, transferDate } = req.body;

    if (!LabourID || !transferSite) {
      return res.status(400).json({ message: "LabourID and transferSite are required." });
    }

    const pool = await poolPromise;

    // Fetch the approval details using LabourID
    const approval = await pool.request()
      .input("LabourID", sql.NVarChar(50), LabourID)
      .query(`
        SELECT * FROM AdminSiteTransferApproval
        WHERE LabourID = @LabourID AND adminStatus = 'Pending'
      `);

    if (approval.recordset.length === 0) {
      return res.status(404).json({ message: "No pending approval found for the given LabourID." });
    }

    // Update the transfer details
    await pool.request()
      .input("LabourID", sql.NVarChar(50), LabourID)
      .input("transferSite", sql.Int, transferSite)
      .input("transferDate", sql.Date, transferDate)
      .query(`
        UPDATE AdminSiteTransferApproval
        SET transferSite = @transferSite, transferDate = @transferDate, updatedAt = GETDATE()
        WHERE LabourID = @LabourID AND adminStatus = 'Pending'
      `);

    // Log admin edit
    await saveLogToDatabaseSiteTransfer(
      approval.recordset[0].userId,
      LabourID,
      "Admin Edited",
      `Site transfer request for LabourID ${LabourID} was updated. New Site: ${transferSite}, Transfer Date: ${transferDate}`,
      "Edited"
    );

    res.status(200).json({ message: "Site transfer request updated successfully." });
  } catch (error) {
    console.error("Error editing site transfer:", error);
    res.status(500).json({ message: "Failed to edit site transfer.", error: error.message });
  }
};



const saveLogToDatabaseSiteTransfer = async (userId, LabourID, action, message, status) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("userId", sql.Int, userId)
      .input("LabourID", sql.NVarChar(50), LabourID)
      .input("action", sql.NVarChar(255), action)
      .input("message", sql.NVarChar(sql.MAX), message)
      .input("status", sql.NVarChar(50), status)
      .query(`
        INSERT INTO SiteTransferLogs (userId, LabourID, action, message, status, createdAt)
        VALUES (@userId, @LabourID, @action, @message, @status, GETDATE())
      `);
  } catch (error) {
    console.error("Error saving log to database:", error);
  }
};


// Function to get SerialNumber by ProjectID
const getSerialNumberByProjectID = async (projectId) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query(`SELECT SerialNumber FROM ProjectDeviceStatus WHERE ProjectID = @projectId`);

    return result.recordset.length > 0 ? result.recordset[0].SerialNumber : null;
  } catch (error) {
    console.error("Error fetching SerialNumber:", error);
    return null;
  }
};

// Function to handle transfer data
const saveTransferData = async (req, res) => {
  try {
    const {
      userId,
      LabourID,
      name,
      currentSite,
      transferSite,
      currentSiteName,
      transferSiteName,
      siteTransferBy,
    } = req.body;

    // Validate required fields
    if (!userId || !LabourID || !name || !currentSite || !transferSite) {
      return res.status(400).json({
        message: "Missing required fields. Ensure all mandatory fields are provided.",
      });
    }

    const sanitizedCurrentSite = parseInt(currentSite);
    const sanitizedTransferSite = parseInt(transferSite);

    if (isNaN(sanitizedCurrentSite) || isNaN(sanitizedTransferSite)) {
      return res.status(400).json({
        message: "Invalid site values. Both currentSite and transferSite must be integers.",
      });
    }

    // Fetch SerialNumbers
    const currentSerialNumber = await getSerialNumberByProjectID(sanitizedCurrentSite);
    const transferSerialNumber = await getSerialNumberByProjectID(sanitizedTransferSite);

    if (!currentSerialNumber) {
      return res.status(400).json({
        message: `No SerialNumber found for currentSite: ${sanitizedCurrentSite}`,
      });
    }

    if (!transferSerialNumber) {
      return res.status(400).json({
        message: `No SerialNumber found for transferSite: ${sanitizedTransferSite}`,
      });
    }

    // Step 1: Add User to Transfer Site
    const addUserEnvelope = `
      <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <AddEmployee xmlns="http://tempuri.org/">
            <APIKey>11</APIKey>
            <EmployeeCode>${LabourID}</EmployeeCode>
            <EmployeeName>${name}</EmployeeName>
            <CardNumber>${userId}</CardNumber>
            <SerialNumber>${transferSerialNumber}</SerialNumber>
            <UserName>test</UserName>
            <UserPassword>Test@123</UserPassword>
            <CommandId>25</CommandId>
          </AddEmployee>
        </soap:Body>
      </soap:Envelope>`;

    let addResponseParsed, extractedCommandId;
    try {
      const addResponse = await axios.post(
        "https://essl.vjerp.com:8530/iclock/WebAPIService.asmx?op=AddEmployee",
        addUserEnvelope,
        {
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            SOAPAction: "http://tempuri.org/AddEmployee",
          },
        }
      );

      const parser = new xml2js.Parser({ explicitArray: false });
      const parsedResponse = await parser.parseStringPromise(addResponse.data);
      extractedCommandId = parsedResponse?.["soap:Envelope"]?.["soap:Body"]?.["AddEmployeeResponse"]?.["CommandId"] || 25;
      addResponseParsed = JSON.stringify(parsedResponse);
    } catch (error) {
      console.error("Error during AddEmployee:", error);
      return res.status(500).json({ message: "Failed to add user to new site.", error: error.message });
    }

    // Step 2: Delete User from Current Site
    const deleteUserEnvelope = `
      <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <DeleteUser xmlns="http://tempuri.org/">
            <APIKey>11</APIKey>
            <EmployeeCode>${LabourID}</EmployeeCode>
            <SerialNumber>${currentSerialNumber}</SerialNumber>
            <UserName>test</UserName>
            <UserPassword>Test@123</UserPassword>
            <CommandId>${extractedCommandId}</CommandId>
          </DeleteUser>
        </soap:Body>
      </soap:Envelope>`;

    let deleteResponseParsed;
    try {
      const deleteResponse = await axios.post(
        "https://essl.vjerp.com:8530/iclock/WebAPIService.asmx?op=DeleteUser",
        deleteUserEnvelope,
        {
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            SOAPAction: "http://tempuri.org/DeleteUser",
          },
        }
      );

      const parser = new xml2js.Parser({ explicitArray: false });
      deleteResponseParsed = JSON.stringify(await parser.parseStringPromise(deleteResponse.data));
    } catch (error) {
      console.error("Error during DeleteUser:", error);
      deleteResponseParsed = JSON.stringify({ error: error.message });
    }

    // Step 3: Database Insertion and Update Logic (unchanged from previous examples)
    const pool = await poolPromise;
    const insertQuery = `
      INSERT INTO [dbo].[API_TransferSite] 
      ([userId], [LabourID], [name], [currentSite], [currentSiteName], 
       [transferSite], [transferSiteName], [esslStatus], [esslCommandId], 
       [esslPayload], [esslApiResponse], [esslResponseStatus], [siteTransferBy],
       [deleteEsslPayload], [deleteEsslResponse], 
       [createdAt], [updatedAt])
      VALUES (@userId, @LabourID, @name, @currentSite, @currentSiteName, 
              @transferSite, @transferSiteName, @esslStatus, @esslCommandId, 
              @esslPayload, @esslApiResponse, @esslResponseStatus, @siteTransferBy,
              @deleteEsslPayload, @deleteEsslResponse, 
              GETDATE(), GETDATE())
    `;
    await pool.request()
      .input("userId", sql.Int, userId || null)
      .input("LabourID", sql.NVarChar(50), LabourID)
      .input("name", sql.NVarChar(255), name || null)
      .input("currentSite", sql.Int, sanitizedCurrentSite)
      .input("currentSiteName", sql.NVarChar(255), currentSiteName)
      .input("transferSite", sql.Int, sanitizedTransferSite)
      .input("transferSiteName", sql.NVarChar(255), transferSiteName)
      .input("esslStatus", sql.NVarChar(50), "Transferred")
      .input("esslCommandId", sql.Int, extractedCommandId)
      .input("esslPayload", sql.NVarChar(sql.MAX), addUserEnvelope)
      .input("esslApiResponse", sql.NVarChar(sql.MAX), addResponseParsed)
      .input("esslResponseStatus", sql.NVarChar(50), "Success")
      .input("deleteEsslPayload", sql.NVarChar(sql.MAX), deleteUserEnvelope)
      .input("deleteEsslResponse", sql.NVarChar(sql.MAX), deleteResponseParsed)
      .input("siteTransferBy", sql.NVarChar(50), siteTransferBy || null)
      .query(insertQuery);

       // Step 4: Update [labourOnboarding] with transfer site details
    const updateQuery = `
      UPDATE [dbo].[labourOnboarding]
      SET
        projectName = @transferSite,
        location = @transferSiteName,
        WorkingBu = @transferSiteName,
        businessUnit = @transferSiteName,
        OnboardingProjectName = @currentSite,
        OnboardingBusinessUnit = @currentSiteName,
        isSiteTransfer = @isSiteTransfer
      WHERE id = @userId
    `;

    const updateResult = await pool.request()
      .input("userId", sql.Int, userId)
      .input("transferSite", sql.Int, sanitizedTransferSite)
      .input("transferSiteName", sql.NVarChar(255), transferSiteName)
      .input("currentSite", sql.Int, sanitizedCurrentSite)
      .input("currentSiteName", sql.NVarChar(255), currentSiteName)
      .input("isSiteTransfer", sql.Bit, 1) // Set isSiteTransfer to true
      .query(updateQuery);

    if (updateResult.rowsAffected[0] === 0) {
      return res.status(400).json({
        message: "No rows updated in labourOnboarding table.",
      });
    }

    res.status(201).json({
      message: "Transfer data saved and labourOnboarding updated successfully.",
    });
  } catch (error) {
    console.error("Error saving transfer data and updating labourOnboarding:", error);
    res.status(500).json({
      message: "Failed to save transfer data and update labourOnboarding.",
      error: error.message,
    });
  }
};

cron.schedule('28 12 * * *', async () => {
  console.log('Running site transfer approval cron job at 01:08 AM');

  try {
    const pool = await poolPromise;

    // Fetch pending approvals for the current date
    const pendingApprovals = await pool.request()
      .query(`
        SELECT LabourID 
        FROM AdminSiteTransferApproval
        WHERE adminStatus = 'Pending' AND transferDate = CAST(GETDATE() AS DATE)
      `);

    if (pendingApprovals.recordset.length === 0) {
      console.log("No pending approvals found for today's date For Site Transfer.");
      return;
    }

    console.log(`Found ${pendingApprovals.recordset.length} pending approvals For Site Transfer.`);

    for (const approval of pendingApprovals.recordset) {
      try {
        // Call approveSiteTransfer for each pending LabourID
        await approveSiteTransfer(
          { body: { LabourID: approval.LabourID } },
          {
            status: (statusCode) => ({
              json: (response) => {
                console.log(`Approval Response For Site Transfer LabourID ${approval.LabourID}:`, response);
              },
            }),
          }
        );
      } catch (error) {
        console.error(
          `Failed to approve transfer for LabourID ${approval.LabourID}:`,
          error.message
        );
      }
    }

    console.log("Cron job completed successfully For Site Transfer.");
  } catch (error) {
    console.error("Cron job failed for site transfer approval:", error.message);
  }
});



// Serve cached results to the frontend
const fetchCachedLabours = async (req, res) => {
  try {
    // Check if cached data exists
    if (!cachedLabours || cachedLabours.length === 0) {
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
  fetchCachedLabours,
  saveTransferData,
  getAllLaboursWithTransferDetails, 
  // resubmitLabor
  getAdminSiteTransferApproval,
  employeeMasterPayloadUpdatepost,
  organizationMasterPayloadUpdatepost,
  siteTransferRequestforAdmin,
  approveSiteTransfer,
  rejectSiteTransfer,
  editSiteTransfer,

};


