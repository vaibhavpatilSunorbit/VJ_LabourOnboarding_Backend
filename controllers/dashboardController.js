const { sql, poolPromise2 } = require('../config/dbConfig2');
const { poolPromise3 } = require('../config/dbConfig3');
const { poolPromise } = require('../config/dbConfig');
const path = require('path');
const fs = require('fs');
const axios = require('axios')
const multer = require('multer');
const { upload } = require('../server');
const xml2js = require('xml2js');
const labourModel = require('../models/insentiveModel');
const cron = require('node-cron');
const logger = require('../logger'); // Assuming logger is defined in logger.js   
const { createLogger, format, transports } = require('winston');
const { isHoliday } = require('../models/labourModel');
const xlsx = require('xlsx');
// const labourModel = require('../models/labourModel')


const getAllLaboursCount = async (req, res) => {
  const filters = req.query;

  try {
    const pool = await poolPromise;
    const request = pool.request();

    let query = `
        SELECT 
          status, 
          COUNT(*) AS count 
        FROM labourOnboarding 
        WHERE status IN ('Approved', 'Disable', 'Pending', 'Rejected', 'Resubmitted')
      `;

    // 🔍 Handle ProjectID filter (comma-separated)
    if (filters.ProjectID) {
      const projectIDs = filters.ProjectID.split(',').map(id => parseInt(id.trim())).filter(Boolean);
      if (projectIDs.length > 0) {
        const projectParams = projectIDs.map((val, idx) => {
          const param = `projectID${idx}`;
          request.input(param, val);
          return `@${param}`;
        });
        query += ` AND projectName IN (${projectParams.join(', ')})`;
      }
    }

    // 🔍 Add GROUP BY for aggregation
    query += ` GROUP BY status`;

    const result = await request.query(query);

    const statusCounts = {
      Approved: 0,
      Disable: 0,
      Pending: 0,
      Rejected: 0,
      Resubmitted: 0
    };

    result.recordset.forEach(row => {
      statusCounts[row.status] = row.count;
    });

    res.json({ success: true, data: statusCounts });

  } catch (err) {
    console.error('Error fetching labour counts:', err);
    res.status(500).send('Server error');
  }
};


const getAllWagesCount = async (req, res) => {
  const filters = req.query;

  try {
    const pool = await poolPromise;
    const request = pool.request();

    let query = `
        SELECT ApprovalStatusWages AS status, COUNT(*) AS count
        FROM [LabourMonthlyWages]
      `;

    const conditions = [];

    // Handle ProjectID filter (comma-separated)
    if (filters.ProjectID) {
      const projectIDs = filters.ProjectID.split(',').map(id => parseInt(id.trim())).filter(Boolean);
      if (projectIDs.length > 0) {
        const projectParams = projectIDs.map((val, idx) => {
          const param = `projectID${idx}`;
          request.input(param, val);
          return `@${param}`;
        });
        conditions.push(`ProjectName IN (${projectParams.join(', ')})`);
      }
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add GROUP BY
    query += ' GROUP BY ApprovalStatusWages';

    const result = await request.query(query);

    // Build a default object with all statuses initialized to 0
    const statusCounts = {
      Approved: 0,
      Pending: 0,
      Rejected: 0

    };

    result.recordset.forEach(row => {
      statusCounts[row.status] = row.count;
    });

    res.json({ success: true, data: statusCounts });

  } catch (err) {
    console.error('Error fetching labour wages status count:', err);
    res.status(500).send('Server error');
  }
};

const getAllSiteTransferCount = async (req, res) => {
  const filters = req.query;

  try {
    const pool = await poolPromise;
    const request = pool.request();

    let query = `
        SELECT adminStatus AS status, COUNT(*) AS count
        FROM [dbo].[AdminSiteTransferApproval]
      `;

    const conditions = [];

    // Handle ProjectID filter (if "currentSite" or similar represents the project)
    if (filters.ProjectID) {
      const projectIDs = filters.ProjectID.split(',').map(id => parseInt(id.trim())).filter(Boolean);
      if (projectIDs.length > 0) {
        const projectParams = projectIDs.map((val, idx) => {
          const param = `projectID${idx}`;
          request.input(param, val);
          return `@${param}`;
        });
        conditions.push(`currentSite IN (${projectParams.join(', ')})`);
      }
    }

    // Add WHERE clause if any filter was added
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Group by the correct column
    query += ' GROUP BY adminStatus';

    const result = await request.query(query);

    const statusCounts = {
      Approved: 0,
      Pending: 0,
      Rejected: 0,
    };

    result.recordset.forEach(row => {
      statusCounts[row.status] = row.count;
    });

    res.json({ success: true, data: statusCounts });

  } catch (err) {
    console.error('Error fetching site transfer status count:', err);
    res.status(500).send('Server error');
  }
};

const getAllVariablePayCount = async (req, res) => {
  const filters = req.query;

  try {
    const pool = await poolPromise;
    const request = pool.request();

    let query = `
        SELECT ApprovalStatusPay AS status, COUNT(*) AS count
        FROM [VariablePay]
      `;

    const conditions = [];

    // Handle ProjectID filter
    if (filters.ProjectID) {
      const projectIDs = filters.ProjectID.split(',').map(id => parseInt(id.trim())).filter(Boolean);
      if (projectIDs.length > 0) {
        const projectParams = projectIDs.map((val, idx) => {
          const param = `projectID${idx}`;
          request.input(param, val);
          return `@${param}`;
        });
        conditions.push(`currentSite IN (${projectParams.join(', ')})`);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY ApprovalStatusPay';

    const result = await request.query(query);

    const statusCounts = {
      Approved: 0,
      AdminPending: 0,
      Rejected: 0,
    };

    result.recordset.forEach(row => {
      statusCounts[row.status] = row.count;
    });

    res.json({ success: true, data: statusCounts });

  } catch (err) {
    console.error('Error fetching variable pay status count:', err);
    res.status(500).send('Server error');
  }
};



const getAllLastDayPAMCount = async (req, res) => {
  const filters = req.query;

  try {
    const pool = await poolPromise;
    const request = pool.request();

    // Declare yesterday date in SQL as a parameter here
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    request.input('Yesterday', yesterdayStr);

    // Base query
    let query = `
      SELECT 
        Status,
        COUNT(*) AS count
      FROM [LabourAttendanceDetails]
      WHERE [Date] = @Yesterday
    `;

    // Add ProjectID filter if provided
    if (filters.ProjectID) {
      const projectIDs = filters.ProjectID.split(',').map(id => id.trim()).filter(Boolean);
      if (projectIDs.length > 0) {
        const projectParams = projectIDs.map((val, idx) => {
          const paramName = `projectID${idx}`;
          request.input(paramName, val);
          return `@${paramName}`;
        });
        query += ` AND projectName IN (${projectParams.join(',')})`;
      }
    }

    query += `
      GROUP BY Status
    `;

    const result = await request.query(query);

    // Initialize counts with zero
    const statusCounts = {
      P: 0, // Present
      A: 0, // Absent
      MP: 0, // MissPunch
    };

    // Map counts from DB results
    result.recordset.forEach(row => {
      if (row.Status && statusCounts.hasOwnProperty(row.Status)) {
        statusCounts[row.Status] = row.count;
      }
    });

    res.json({ success: true, data: statusCounts });

  } catch (err) {
    console.error('Error fetching site transfer status count:', err);
    res.status(500).send('Server error');
  }
};


const getAttendanceByPeriod = async (req, res) => {
  try {
    const pool = await poolPromise;
    const request = pool.request();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    request.input('Yesterday', yesterdayStr);

    let startDate;
    const period = req.query.period || 'lastWeek'; // default last week

    if (period === 'lastWeek') {
      startDate = new Date(yesterday);
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'lastMonth') {
      startDate = new Date(yesterday);
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'allTime') {
      startDate = null; // no lower bound
    } else {
      return res.status(400).json({ success: false, message: 'Invalid period' });
    }

    if (startDate) {
      const startDateStr = startDate.toISOString().slice(0, 10);
      request.input('StartDate', startDateStr);
    }

    let query = `
      SELECT
        [Date],
        Status,
        COUNT(*) AS Count
      FROM [LabourAttendanceDetails]
      WHERE [Date] <= @Yesterday
    `;

    if (startDate) {
      query += ` AND [Date] >= @StartDate`;
    }

    query += `
      GROUP BY [Date], Status
      ORDER BY [Date], Status;
    `;

    const result = await request.query(query);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getAllActiveWorkers = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
     
    SELECT COUNT(DISTINCT LabourID) AS ActiveWorkersAllTime
      FROM [labourOnboarding]
      WHERE Status = 'Approved'
    `);
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Error fetching all-time active workers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllActiveWorkersPersentage = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        CAST(
          100.0 * 
          (SELECT COUNT(DISTINCT LabourId) 
           FROM [LabourAttendanceDetails] 
           WHERE Status = 'P')
          /
          NULLIF(
            (SELECT COUNT(DISTINCT LabourId) 
             FROM [LabourOnboarding]), 0
          )
        AS DECIMAL(5,2)) AS PresentPercentageOfAllActiveWorkers
    `);
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Error fetching all-time active workers percentage:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



const getAllAdminNotifacation = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        currentSiteName,
        COUNT(*) AS PendingCount
      FROM [AdminSiteTransferApproval]
      WHERE 
        (isAdminApproval = 0 OR isAdminApproval IS NULL)
        AND (isAdminReject = 0 OR isAdminReject IS NULL)
        AND adminStatus = 'Pending'
      GROUP BY currentSiteName
      ORDER BY PendingCount DESC;
    `);

    res.json({ success: true, data: result.recordset });  // Return all rows, not just first
  } catch (error) {
    console.error('Error fetching admin site transfer notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getNotificationAttendance = async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request().query(`
    
     SELECT TOP (5) *
 FROM [dbo].[LabourAttendanceApproval] where ApprovalStatus = 'Pending'
 ORDER BY id DESC ;
   `);
    res.json({ success: true, data: result.recordset })
  } catch (error) {
    console.error('Error fetching admin site transfer notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
  // Return all rows, not just first
}


const getNotificationVariablePay = async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request().query(`
     
  SELECT TOP (5) *
FROM [dbo].[VariablePay] WHERE ApprovalStatusPay ='AdminPending'
ORDER BY CreatedAt DESC;
  `);
    res.json({ success: true, data: result.recordset })
  } catch (error) {
    console.error('Error fetching admin site transfer notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
  // Return all rows, not just first
}

const getNotificationWagesApproval = async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request().query(`
               SELECT TOP (5) *
                FROM [dbo].[WagesAdminApprovals]
                ORDER BY CreatedAt DESC;
            `)
    res.json({ success: true, data: result.recordset })
  } catch (error) {
    console.error('Error fetching admin site transfer notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// DepartmentWiseWagesPercentage 

const getDepartmentWiseWagesPercentage = async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request().query(`
            
            WITH MonthlyDepartmentWages AS (
  SELECT
    departmentName,
    FORMAT(ISNULL(EffectiveDate, FromDate), 'yyyy-MM') AS wageMonth,
    SUM(ISNULL(MonthlyWages, 0) + ISNULL(FixedMonthlyWages, 0)) AS totalWages
  FROM [LabourMonthlyWages]
  WHERE 
    (MonthlyWages IS NOT NULL OR FixedMonthlyWages IS NOT NULL)
    AND ApprovalStatusWages = 'Approved'
  GROUP BY
    departmentName,
    FORMAT(ISNULL(EffectiveDate, FromDate), 'yyyy-MM')
),
MonthlyTotal AS (
  SELECT
    wageMonth,
    SUM(totalWages) AS grandTotal
  FROM MonthlyDepartmentWages
  GROUP BY wageMonth
)
SELECT
  mdw.wageMonth,
  mdw.departmentName,
  mdw.totalWages,
  ROUND(CAST(mdw.totalWages AS FLOAT) / mt.grandTotal * 100, 2) AS WagePayPercentage
FROM MonthlyDepartmentWages mdw
JOIN MonthlyTotal mt ON mdw.wageMonth = mt.wageMonth
ORDER BY mdw.wageMonth DESC, WagePayPercentage DESC;

          `)
          res.status(200).json({
            success: true,
            message: 'Department-wise wage pay percentage calculated successfully.',
            data: result.recordset
          });
  } catch (error) {
    console.error('Error fetching admin site transfer notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
const getDevicesWithPing = async (req, res) => {
  try {
    const pool = await poolPromise3;
    const result = await pool.request().query(`
      SELECT DeviceId, DeviceSName, DeviceLocation, SerialNumber, LastPing
      FROM Devices
    `);

    const devicesWithStatus = result.recordset.map(device => {
      const lastPingTime = new Date(device.LastPing);
      const now = new Date();

      // Calculate difference in minutes
      const diffMinutes = (now - lastPingTime) / (1000 * 60);

      return {
        ...device,
        Status: diffMinutes <= 10 ? 'Online' : 'Offline'
      };
    });

    res.json(devicesWithStatus);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


module.exports = {
  getAllLaboursCount,
  getAllWagesCount,
  getAllSiteTransferCount,
  getAllVariablePayCount,
  getAllLastDayPAMCount,
  getAttendanceByPeriod,
  getAllActiveWorkers,
  getAllActiveWorkersPersentage,

  getAllAdminNotifacation,
  getNotificationAttendance,
  getNotificationVariablePay,
  getNotificationWagesApproval,
  getDepartmentWiseWagesPercentage,
  getDevicesWithPing
}