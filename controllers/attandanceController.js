
const { sql, poolPromise } = require('../config/dbConfig');
const { poolPromise3 } = require('../config/dbConfig3');
const {cron}=require('node-cron')
const labourModel = require('../models/labourModel');


function roundOvertime(overtimeHours) {
    if (overtimeHours <= 0) return 0;

    const hours = Math.floor(overtimeHours);
    let minutes = Math.round((overtimeHours - hours) * 60);

    if (minutes < 15) {
        minutes = 0;
    } else if (minutes < 45) {
        minutes = 30; // Convert to 0.5 hr
    } else {
        minutes = 0;
        return hours + 1;
    }

    return hours + (minutes / 60);
}

/**
 * Formats a given time string to "HH:MM:SS" format.
 * Returns "-" if the time is invalid.
 * @param {string} timeString - The time string to format.
 * @returns {string} - Formatted time or "-".
 */
function formatTimeToHoursMinutes(timeString) {
    try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return "-";
        const hours = date.getUTCHours().toString().padStart(2, "0");
        const minutes = date.getUTCMinutes().toString().padStart(2, "0");
        const seconds = date.getUTCSeconds().toString().padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
    } catch (error) {
        return "-";
    }
}

/**
 * Calculates hours worked between two punch times on a given date.
 * @param {Date} punchDate - The date of the punch.
 * @param {Date} firstPunch - The first punch time.
 * @param {Date} lastPunch - The last punch time.
 * @returns {number} - Total hours worked with 2 decimal places.
 */
function calculateHoursWorked(punchDate, firstPunch, lastPunch) {
    try {
        const punchDateStr = punchDate.toISOString().split('T')[0]; // Extract date from punchDate
        const punchInTime = new Date(`${punchDateStr}T${firstPunch.toISOString().split('T')[1]}`); // Combine date and time
        const punchOutTime = new Date(`${punchDateStr}T${lastPunch.toISOString().split('T')[1]}`); // Combine date and time

        const totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60); // Convert milliseconds to hours

        if (isNaN(totalHours) || totalHours < 0) {
            console.warn(`Invalid totalHours calculated. Setting to 0. Details: punchDate=${punchDate}, firstPunch=${firstPunch}, lastPunch=${lastPunch}`);
            return 0;
        }

        return parseFloat(totalHours.toFixed(2));  // Return hours with 2 decimal places as number
    } catch (error) {
        console.error(`Error in calculateHoursWorked: ${error.message}`);
        return 0;
    }
}

// Additional Helper Functions

/**
 * Determines the total shift hours based on workingHours string.
 * @param {string} workingHours - The working hours string.
 * @returns {number} - Shift hours.
 */
const getShiftHours = (workingHours) => (workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8);

/**
 * Determines half-day hours based on shift hours.
 * @param {number} shiftHours - Total shift hours.
 * @returns {number} - Half-day hours.
 */
const getHalfDayHours = (shiftHours) => (shiftHours === 9 ? 4.5 : 4);

/**
 * Calculates the difference in minutes between two punch times.
 * @param {Date} firstPunchTime - First punch time.
 * @param {Date} lastPunchTime - Last punch time.
 * @returns {number} - Difference in minutes.
 */
const calculateTimeDifferenceInMinutes = (firstPunchTime, lastPunchTime) => {
    const diffMs = lastPunchTime - firstPunchTime;
    return diffMs / (1000 * 60); // Convert milliseconds to minutes
};

/**
 * Determines the attendance status based on punches and shift parameters.
 * @param {Array} punches - Array of punch objects for the day.
 * @param {number} shiftHours - Total shift hours.
 * @param {number} halfDayHours - Half-day hours.
 * @param {string} workingHours - Working hours string.
 * @returns {Object} - Contains status, firstPunch, lastPunch, misPunch flag, and totalHours.
 */
const determineStatus = (punches, shiftHours, halfDayHours, workingHours) => {
    // Initialize default values
    let status = 'A';
    let misPunch = false;
    let consideredLastPunch = null;
    let totalHours = 0;

    if (!punches || punches.length === 0) {
        // No punches found
        // console.log(`No punches found for punches array: ${JSON.stringify(punches)}`);
        return { status, firstPunch: null, lastPunch: null, misPunch, totalHours };
    }

    // Sort punches by time
    punches.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

    const firstPunch = punches[0];
    const lastPunch = punches[punches.length - 1];

    const firstPunchTime = new Date(firstPunch.punch_time);
    const lastPunchTime = new Date(lastPunch.punch_time);

    const gapMinutes = calculateTimeDifferenceInMinutes(firstPunchTime, lastPunchTime);

    if (gapMinutes < 15) {
        // Gap less than 15 minutes, consider only firstPunch and mark as MisPunch
        misPunch = true;
        // console.log(`MisPunch detected. GapMinutes: ${gapMinutes}`);
    } else {
        // Consider both punches
        consideredLastPunch = lastPunch;
    }

    if (misPunch) {
        status = 'MP';
    } else {
        // Calculate total hours
        if (consideredLastPunch) {
            totalHours = calculateHoursWorked(new Date(firstPunch.punch_date), firstPunchTime, lastPunchTime);
        } else {
            // Only firstPunch is considered, no valid LastPunch
            totalHours = 0;
            // console.log(`Only firstPunch present without valid LastPunch. TotalHours set to 0.`);
        }

        // Define thresholds
        const pThreshold = workingHours === 'FLEXI SHIFT - 9 HRS' ? 4.5 : 4;
        const hdThreshold = 2; // Always 2 hours for HD
        const aThreshold = 0.25; // 15 minutes

        if (totalHours > pThreshold) {
            status = 'P';
        } else if (totalHours > hdThreshold && totalHours <= pThreshold) {
            status = 'HD';
        } else if (totalHours > aThreshold && totalHours <= hdThreshold) {
            status = 'A';
        } else {
            status = 'MP';
        }

        // console.log(`Status Determined: ${status} | TotalHours: ${totalHours}`);
    }

    return {
        status,
        firstPunch,
        lastPunch: consideredLastPunch,
        misPunch,
        totalHours,
    };
};

const compareAndUpdateLabourPunches = async () => {
  try {
    const getLabourIdsWithNullFirstPunch = async () => {
      const pool = await poolPromise;
      const result = await pool.request().query(`
        SELECT DISTINCT LabourId
        FROM [LabourAttendanceDetails]
        WHERE FirstPunch IS NULL
          AND [Date] >= DATEADD(DAY, -10, CAST(GETDATE() AS DATE))
      `);
      return result.recordset.map(row => row.LabourId);
    };

    const getLabourIdsWithValidPunchTime = async () => {
      const pool = await poolPromise3;
      const result = await pool.request().query(`
        SELECT DISTINCT user_id
        FROM Attendance
        WHERE punch_time IS NOT NULL
          AND punch_date >= DATEADD(DAY, -10, CAST(GETDATE() AS DATE))
      `);
      return result.recordset.map(row => row.user_id);
    };

    const [nullFirstPunchIds, validPunchTimeIds] = await Promise.all([
      getLabourIdsWithNullFirstPunch(),
      getLabourIdsWithValidPunchTime()
    ]);

    const validSet = new Set(validPunchTimeIds);
    const matchedIds = nullFirstPunchIds.filter(id => validSet.has(id));

    const today = new Date();
    const parsedMonth = today.getMonth() + 1;
    const parsedYear = today.getFullYear();
    const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

    for (const currentId of matchedIds) {
      console.log(`🔍 Processing Labour ID: ${currentId}`);
      const pool = await poolPromise;

      const result = await pool.request()
        .input('currentId', sql.VarChar, currentId)
        .query(`
          SELECT DISTINCT lo.LabourID AS labourId, lo.workingHours, lo.projectName, lo.status
          FROM [labourOnboarding] lo
          WHERE lo.status IN ('Approved', 'Disable') AND lo.LabourID = @currentId

          UNION

          SELECT DISTINCT lo.LabourID AS labourId, lo.workingHours, lo.projectName, lo.status
          FROM [labourOnboarding] lo
          JOIN [LabourOnboardingForm].[dbo].[LabourAttendanceLogs] lal
              ON lal.LabourID = lo.LabourID
          WHERE lo.LabourID = @currentId
        `);

      const approvedLabours = result.recordset;

      if (!approvedLabours || approvedLabours.length === 0) {
        console.log(`⚠️ No approved labour found for LabourId: ${currentId}`);
        continue;
      }

      for (let labour of approvedLabours) {
        const { labourId, workingHours, projectName } = labour;
        const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
        const halfDayHours = shiftHours === 9 ? 4.5 : 4;

        let presentDays = 0, halfDays = 0, missPunchDays = 0, absentDays = 0;
        let totalOvertimeHours = 0, roundOffTotalOvertime = 0, PayrollCalRoundoffTotalOvertime = 0;
        let totalManualOvertimeManually = 0;
        let monthlyAttendance = [];

        const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);

        for (let day = 1; day <= daysInMonth; day++) {
          const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

          let { status, firstPunch, lastPunch, totalHours } = determineStatus(punchesForDay, shiftHours, halfDayHours, workingHours);

          let overtime = 0, dailyRoundOffOvertime = 0;
          let firstPunchAttendanceId = null, firstPunchDeviceId = null;
          let lastPunchAttendanceId = null, lastPunchDeviceId = null;
          let projectIdFromDevicefirstPunch = null;
          let projectIdFromDeviceLastPunch = null;

          if (firstPunch) {
            firstPunchAttendanceId = firstPunch.attendance_id;
            firstPunchDeviceId = firstPunch.Device_id;
            if (firstPunchDeviceId) {
              projectIdFromDevicefirstPunch = await labourModel.getProjectIdByDeviceId(firstPunchDeviceId);
            }
          }

          if (lastPunch) {
            lastPunchAttendanceId = lastPunch.attendance_id;
            lastPunchDeviceId = lastPunch.Device_id;
            if (lastPunchDeviceId) {
              projectIdFromDeviceLastPunch = await labourModel.getProjectIdByDeviceId(lastPunchDeviceId);
            }
          }

          if (status === 'P') {
            overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;
          }

          dailyRoundOffOvertime = roundOvertime(overtime);
          let OvertimeManually = dailyRoundOffOvertime > 4 ? 4 : dailyRoundOffOvertime;

          switch (status) {
            case 'P': presentDays++; break;
            case 'HD': halfDays++; break;
            case 'MP': missPunchDays++; break;
            case 'A': absentDays++; break;
            default: absentDays++;
          }

          totalOvertimeHours += overtime;
          PayrollCalRoundoffTotalOvertime += roundOvertime(overtime);
          roundOffTotalOvertime += dailyRoundOffOvertime;
          totalManualOvertimeManually += OvertimeManually;

          const safeTotalHours = typeof totalHours === 'number' && !isNaN(totalHours) ? totalHours : 0;

          monthlyAttendance.push({
            labourId,
            projectName: parseInt(projectName, 10),
            date,
            firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
            firstPunchAttendanceId,
            firstPunchDeviceId,
            lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
            lastPunchAttendanceId,
            lastPunchDeviceId,
            totalHours: safeTotalHours.toFixed(2),
            overtime: overtime.toFixed(2),
            PayrollCalRoundOffOvertime: dailyRoundOffOvertime.toFixed(2),
            OvertimeManually: OvertimeManually.toFixed(2),
            status,
            creationDate: new Date(),
            projectIdFromDevicefirstPunch,
            projectIdFromDeviceLastPunch,
          });
        }

        const summary = {
          labourId,
          projectName: parseInt(projectName, 10),
          totalDays: daysInMonth,
          presentDays,
          halfDays,
          missPunchDays,
          absentDays,
          totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
          PayrollCalRoundoffTotalOvertime: parseFloat(PayrollCalRoundoffTotalOvertime.toFixed(2)),
          RoundOffTotalOvertime: parseFloat(roundOffTotalOvertime.toFixed(2)),
          TotalOvertimeHoursManually: parseFloat(totalManualOvertimeManually.toFixed(2)),
          shift: workingHours,
          creationDate: new Date(),
          selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`,
        };

        await labourModel.insertIntoLabourAttendanceSummary(summary);
        for (let dayAttendance of monthlyAttendance) {
          await labourModel.insertIntoLabourAttendanceDetails(dayAttendance);
        }
      }
    }

    return {
      success: true,
      message: 'Comparison successful',
      totalNullFirstPunch: nullFirstPunchIds.length,
      totalValidPunchTime: validPunchTimeIds.length,
      matchedCount: matchedIds.length,
      matchedLabourIds: matchedIds,
    };
  } catch (error) {
    console.error('[compareAndUpdateLabourPunches] Error:', error);
    return {
      success: false,
      message: 'Error comparing labour punch data',
      error: error.message
    };
  }
  }


  const getMatchedLabourIdsWithValidPunch = async () => {
  try {
    const pool1 = await poolPromise;
    const pool2 = await poolPromise3;

    // Fetch LabourIds with NULL FirstPunch in last 10 days
    const result1 = await pool1.request().query(`
      SELECT DISTINCT LabourId
      FROM [LabourAttendanceDetails]
      WHERE FirstPunch IS NULL
        AND [Date] >= DATEADD(DAY, -10, CAST(GETDATE() AS DATE))
    `);

    // Fetch user_ids with valid punch_time in last 10 days
    const result2 = await pool2.request().query(`
      SELECT DISTINCT user_id
      FROM Attendance
      WHERE punch_time IS NOT NULL
        AND punch_date >= DATEADD(DAY, -10, CAST(GETDATE() AS DATE))
    `);

    const nullFirstPunchIds = result1.recordset.map(row => row.LabourId);
    const validPunchTimeIds = new Set(result2.recordset.map(row => row.user_id));

    // Filter only those LabourIds which have valid punch
    const matchedIds = nullFirstPunchIds.filter(id => validPunchTimeIds.has(id));

    return matchedIds; // <- final response
  } catch (err) {
    console.error("Error in getMatchedLabourIdsWithValidPunch:", err);
    throw err;
  }
};

// compareAndUpdateLabourPunches()

module.exports = { compareAndUpdateLabourPunches, getMatchedLabourIdsWithValidPunch };