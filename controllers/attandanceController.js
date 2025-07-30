
const { sql, poolPromise } = require('../config/dbConfig');
const { poolPromise3 } = require('../config/dbConfig3');
const { cron } = require('node-cron')
const labourModel = require('../models/labourModel');
const { log } = require('@tensorflow/tfjs');


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

// const compareAndUpdateLabourPunches = async () => {
//   try {
//     const getLabourIdsWithNullFirstPunch = async () => {
//       const pool = await poolPromise;
//       const result = await pool.request().query(`
//         SELECT DISTINCT LabourId
//       FROM [LabourOnboardingForm].[dbo].[LabourAttendanceDetails]
//       WHERE FirstPunch IS NULL
//         AND [Date] BETWEEN DATEADD(DAY, -60, CAST(GETDATE() AS DATE)) 
//                         AND DATEADD(DAY, -2, CAST(GETDATE() AS DATE))
//       `);
//       const labourIdsWithLogs = result.recordset.map(row => row.LabourId);
//       if (labourIdsWithLogs.length === 0) return [];
//       return labourIdsWithLogs;
//     };

//      // Step 2: Check which of these have logs in current month in LabourAttendanceLogs
//     const matchedIdString = nullFirstPunchIds.map(id => `'${id}'`).join(',');
//     const result2 = await pool1.request().query(`
//       SELECT DISTINCT LabourId
//       FROM [LabourOnboardingForm].[dbo].[LabourAttendanceLogs]
//       WHERE LabourId IN (${matchedIdString})
//         AND MONTH(CreatedAt) = MONTH(GETDATE())
//         AND YEAR(CreatedAt) = YEAR(GETDATE())
//     `);
//  const labourIdsWithLogs = result2.recordset.map(row => row.LabourId);
//     if (labourIdsWithLogs.length === 0) return [];
//     const getLabourIdsWithValidPunchTime = async () => {
//       const pool = await poolPromise3;
//       const result3 = await pool.request().query(`
//          SELECT DISTINCT user_id
//       FROM [etimetracklite11.8].[dbo].[Attendance]
//       WHERE punch_time IS NOT NULL
//         AND punch_date BETWEEN DATEADD(DAY, -60, CAST(GETDATE() AS DATE)) 
//                            AND DATEADD(DAY, -2, CAST(GETDATE() AS DATE))
//         AND user_id IN (${labourIdsWithLogsString})
//         AND (
//           user_id LIKE 'JC%' 
//           OR user_id LIKE 'JIH%'
//         );
//       `);
//        const finalMatchedIds = result3.recordset.map(row => row.user_id);

//     console.log("Final Matched IDs (FirstPunch NULL + Logs This Month + Valid Punch):", finalMatchedIds);
//     return finalMatchedIds;
//     };

//     const [nullFirstPunchIds, validPunchTimeIds] = await Promise.all([
//       getLabourIdsWithNullFirstPunch(),
//       getLabourIdsWithValidPunchTime()
//     ]);

//     const validSet = new Set(validPunchTimeIds);
//     const matchedIds = nullFirstPunchIds.filter(id => validSet.has(id));
//     console.log("Matched Labour IDs with Valid Punch:", matchedIds);

//     const today = new Date();
//     const parsedMonth = today.getMonth() + 1;
//     const parsedYear = today.getFullYear();
//     const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

//     for (const currentId of matchedIds) {
//       console.log(`🔍 Processing Labour ID: ${currentId}`);
//       const pool = await poolPromise;

//       const result = await pool.request()
//         .input('currentId', sql.VarChar, currentId)
//         .query(`
//           SELECT DISTINCT lo.LabourID AS labourId, lo.workingHours, lo.projectName, lo.status
//           FROM [labourOnboarding] lo
//           WHERE lo.status IN ('Approved', 'Disable') AND lo.LabourID = @currentId

//           UNION

//           SELECT DISTINCT lo.LabourID AS labourId, lo.workingHours, lo.projectName, lo.status
//           FROM [labourOnboarding] lo
//           JOIN [LabourOnboardingForm].[dbo].[LabourAttendanceLogs] lal
//               ON lal.LabourID = lo.LabourID
//           WHERE lo.LabourID = @currentId
//         `);

//       const approvedLabours = result.recordset;

//       if (!approvedLabours || approvedLabours.length === 0) {
//         console.log(`⚠️ No approved labour found for LabourId: ${currentId}`);
//         continue;
//       }

//       for (let labour of approvedLabours) {
//         const { labourId, workingHours, projectName } = labour;
//         const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//         const halfDayHours = shiftHours === 9 ? 4.5 : 4;

//         let presentDays = 0, halfDays = 0, missPunchDays = 0, absentDays = 0;
//         let totalOvertimeHours = 0, roundOffTotalOvertime = 0, PayrollCalRoundoffTotalOvertime = 0;
//         let totalManualOvertimeManually = 0;
//         let monthlyAttendance = [];

//         const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);

//         for (let day = 1; day <= daysInMonth; day++) {
//           const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//           const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

//           let { status, firstPunch, lastPunch, totalHours } = determineStatus(punchesForDay, shiftHours, halfDayHours, workingHours);

//           let overtime = 0, dailyRoundOffOvertime = 0;
//           let firstPunchAttendanceId = null, firstPunchDeviceId = null;
//           let lastPunchAttendanceId = null, lastPunchDeviceId = null;
//           let projectIdFromDevicefirstPunch = null;
//           let projectIdFromDeviceLastPunch = null;

//           if (firstPunch) {
//             firstPunchAttendanceId = firstPunch.attendance_id;
//             firstPunchDeviceId = firstPunch.Device_id;
//             if (firstPunchDeviceId) {
//               projectIdFromDevicefirstPunch = await labourModel.getProjectIdByDeviceId(firstPunchDeviceId);
//             }
//           }

//           if (lastPunch) {
//             lastPunchAttendanceId = lastPunch.attendance_id;
//             lastPunchDeviceId = lastPunch.Device_id;
//             if (lastPunchDeviceId) {
//               projectIdFromDeviceLastPunch = await labourModel.getProjectIdByDeviceId(lastPunchDeviceId);
//             }
//           }

//           if (status === 'P') {
//             overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;
//           }

//           dailyRoundOffOvertime = roundOvertime(overtime);
//           let OvertimeManually = dailyRoundOffOvertime > 4 ? 4 : dailyRoundOffOvertime;

//           switch (status) {
//             case 'P': presentDays++; break;
//             case 'HD': halfDays++; break;
//             case 'MP': missPunchDays++; break;
//             case 'A': absentDays++; break;
//             default: absentDays++;
//           }

//           totalOvertimeHours += overtime;
//           PayrollCalRoundoffTotalOvertime += roundOvertime(overtime);
//           roundOffTotalOvertime += dailyRoundOffOvertime;
//           totalManualOvertimeManually += OvertimeManually;

//           const safeTotalHours = typeof totalHours === 'number' && !isNaN(totalHours) ? totalHours : 0;

//           monthlyAttendance.push({
//             labourId,
//             projectName: parseInt(projectName, 10),
//             date,
//             firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
//             firstPunchAttendanceId,
//             firstPunchDeviceId,
//             lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
//             lastPunchAttendanceId,
//             lastPunchDeviceId,
//             totalHours: safeTotalHours.toFixed(2),
//             overtime: overtime.toFixed(2),
//             PayrollCalRoundOffOvertime: dailyRoundOffOvertime.toFixed(2),
//             OvertimeManually: OvertimeManually.toFixed(2),
//             status,
//             creationDate: new Date(),
//             projectIdFromDevicefirstPunch,
//             projectIdFromDeviceLastPunch,
//           });
//         }

//         const summary = {
//           labourId,
//           projectName: parseInt(projectName, 10),
//           totalDays: daysInMonth,
//           presentDays,
//           halfDays,
//           missPunchDays,
//           absentDays,
//           totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
//           PayrollCalRoundoffTotalOvertime: parseFloat(PayrollCalRoundoffTotalOvertime.toFixed(2)),
//           RoundOffTotalOvertime: parseFloat(roundOffTotalOvertime.toFixed(2)),
//           TotalOvertimeHoursManually: parseFloat(totalManualOvertimeManually.toFixed(2)),
//           shift: workingHours,
//           creationDate: new Date(),
//           selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`,
//         };

//         await labourModel.insertIntoLabourAttendanceSummary(summary);
//         for (let dayAttendance of monthlyAttendance) {
//           await labourModel.insertIntoLabourAttendanceDetails(dayAttendance);
//         }
//       }
//     }

//     return {
//       success: true,
//       message: 'Comparison successful',
//       totalNullFirstPunch: nullFirstPunchIds.length,
//       totalValidPunchTime: validPunchTimeIds.length,
//       matchedCount: matchedIds.length,
//       matchedLabourIds: matchedIds,
//     };
//   } catch (error) {
//     console.error('[compareAndUpdateLabourPunches] Error:', error);
//     return {
//       success: false,
//       message: 'Error comparing labour punch data',
//       error: error.message
//     };
//   }
//   }


// const compareAndUpdateLabourPunches = async () => {
//   try {
//     console.log("🚀 Starting compareAndUpdateLabourPunches process...");

//     const pool1 = await poolPromise;
//     const pool2 = await poolPromise3;

//     // Step 1: Get LabourIds with NULL FirstPunch
//     console.log("🔍 Fetching Labour IDs with NULL FirstPunch...");
//     const nullFirstPunchIds = (
//       await pool1.request().query(`
//         SELECT DISTINCT LabourId
//         FROM [LabourOnboardingForm].[dbo].[LabourAttendanceDetails]
//         WHERE LastPunch IS NULL
//           AND [Date] BETWEEN DATEADD(DAY, -30, CAST(GETDATE() AS DATE)) 
//                           AND DATEADD(DAY, -2, CAST(GETDATE() AS DATE))
//       `)
//     ).recordset.map(row => row.LabourId);

//     console.log(`✅ Found ${nullFirstPunchIds.length} Labour IDs with NULL LastPunch.`);

//     if (nullFirstPunchIds.length === 0) {
//       console.log("⚠️ No Labour IDs found. Exiting function.");
//       return [];
//     }

//     // Step 2: Get LabourIds who have logs in current month
//     console.log("🔍 Checking Labour IDs with logs in current month...");
//     const matchedIdString = nullFirstPunchIds.map(id => `'${id}'`).join(',');
//     const labourIdsWithLogs = (
//       await pool1.request().query(`
//         SELECT DISTINCT LabourId
//         FROM [LabourOnboardingForm].[dbo].[LabourAttendanceLogs]
//         WHERE LabourId IN (${matchedIdString})
//           AND MONTH(CreatedAt) = MONTH(GETDATE())
//           AND YEAR(CreatedAt) = YEAR(GETDATE())
//       `)
//     ).recordset.map(row => row.LabourId);

//     console.log(`✅ Found ${labourIdsWithLogs.length} Labour IDs with logs this month.`);

//     if (labourIdsWithLogs.length === 0) {
//       console.log("⚠️ No matching Labour IDs with logs found. Exiting function.");
//       return [];
//     }

//     // Step 3: Get valid punches from Attendance system
//     console.log("🔍 Fetching valid punches from Attendance system...");
//     const labourIdsWithLogsString = labourIdsWithLogs.map(id => `'${id}'`).join(',');
//     const validPunchTimeIds = (
//       await pool2.request().query(`
//         SELECT DISTINCT user_id
//         FROM [etimetracklite11.8].[dbo].[Attendance]
//         WHERE punch_time IS NOT NULL
//           AND punch_date BETWEEN DATEADD(DAY, -30, CAST(GETDATE() AS DATE)) 
//                              AND DATEADD(DAY, -2, CAST(GETDATE() AS DATE))
//           AND user_id IN (${labourIdsWithLogsString})
//           AND (user_id LIKE 'JC%' OR user_id LIKE 'JIH%');
//       `)
//     ).recordset.map(row => row.user_id);

//     console.log(`✅ Found ${validPunchTimeIds.length} Labour IDs with valid punches.`);

//     const matchedIds = nullFirstPunchIds.filter(id => validPunchTimeIds.includes(id));
//     console.log(`🎯 Matched ${matchedIds.length} Labour IDs for processing:`, matchedIds);

//     // Step 4: Process each matched labourId
//     for (const labourId of matchedIds) {
//       console.log(`\n🔄 Processing Labour ID: ${labourId}`);

//       const basicDataRes = await pool1.request()
//         .input('currentId', sql.VarChar, labourId)
//         .query(`
//           SELECT LabourID AS labourId, workingHours, projectName
//           FROM [labourOnboarding]
//           WHERE LabourID = @currentId
//         `);

//       const basicData = basicDataRes.recordset[0];
//       if (!basicData) {
//         console.log(`⚠️ No basic data found for Labour ID: ${labourId}. Skipping...`);
//         continue;
//       }

//       const { workingHours, projectName } = basicData;
//       const shiftHours = getShiftHours(workingHours);
//       const halfDayHours = getHalfDayHours(shiftHours);

//       const today = new Date();
//       const parsedMonth = today.getMonth() + 1;
//       const parsedYear = today.getFullYear();
//       const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

//       console.log(`📅 Month: ${parsedMonth}, Year: ${parsedYear}, Days: ${daysInMonth}`);
//       console.log(`🕒 Working Hours: ${workingHours}, ShiftHours: ${shiftHours}, HalfDayHours: ${halfDayHours}`);

//       // Fetch attendance punches for labourId
//       const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);
//       console.log(`📥 Retrieved ${labourAttendance.length} punch records for Labour ID: ${labourId}`);

//       // Prepare counters
//       let presentDays = 0, halfDays = 0, missPunchDays = 0, absentDays = 0;
//       let totalOvertimeHours = 0, PayrollCalRoundoffTotalOvertime = 0, roundOffTotalOvertime = 0, totalManualOvertimeManually = 0;

//       // Loop over all days of month
//       for (let day = 1; day <= daysInMonth; day++) {
//         const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

//         const punchesForDay = labourAttendance.filter(att =>
//           new Date(att.punch_date).toISOString().split('T')[0] === date
//         );

//         const { status, firstPunch, lastPunch, totalHours } =
//           determineStatus(punchesForDay, shiftHours, halfDayHours, workingHours);

//         console.log(`📆 ${date} | Status: ${status} | Punches: ${punchesForDay.length}`);

//         // Compute Overtime
//         const overtime = status === 'P' && totalHours > shiftHours ? totalHours - shiftHours : 0;
//         const dailyRoundOffOvertime = roundOvertime(overtime);
//         const OvertimeManually = dailyRoundOffOvertime > 4 ? 4 : dailyRoundOffOvertime;

//         // Update counters
//         if (status === 'P') presentDays++;
//         else if (status === 'HD') halfDays++;
//         else if (status === 'MP') missPunchDays++;
//         else absentDays++;

//         totalOvertimeHours += overtime;
//         PayrollCalRoundoffTotalOvertime += dailyRoundOffOvertime;
//         roundOffTotalOvertime += dailyRoundOffOvertime;
//         totalManualOvertimeManually += OvertimeManually;

//         // Prepare details row
//         const details = {
//           labourId,
//           projectName: parseInt(projectName, 10),
//           date,
//           firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
//           firstPunchAttendanceId: firstPunch?.attendance_id || null,
//           firstPunchDeviceId: firstPunch?.Device_id || null,
//           lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
//           lastPunchAttendanceId: lastPunch?.attendance_id || null,
//           lastPunchDeviceId: lastPunch?.Device_id || null,
//           totalHours: totalHours.toFixed(2),
//           overtime: overtime.toFixed(2),
//           PayrollCalRoundOffOvertime: dailyRoundOffOvertime.toFixed(2),
//           OvertimeManually: OvertimeManually.toFixed(2),
//           status,
//           creationDate: new Date(),
//           projectIdFromDevicefirstPunch: firstPunch?.Device_id
//             ? await labourModel.getProjectIdByDeviceId(firstPunch.Device_id)
//             : null,
//           projectIdFromDeviceLastPunch: lastPunch?.Device_id
//             ? await labourModel.getProjectIdByDeviceId(lastPunch.Device_id)
//             : null,
//         };

//         console.log(`📝 Updating attendance for ${date} | Status: ${status}, Hours: ${totalHours}`);
//         await labourModel.insertIntoLabourAttendanceDetails(details);
//       }

//       // Prepare monthly summary
//       const summary = {
//         labourId,
//         projectName: parseInt(projectName, 10),
//         totalDays: daysInMonth,
//         presentDays,
//         halfDays,
//         missPunchDays,
//         absentDays,
//         totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
//         PayrollCalRoundoffTotalOvertime: parseFloat(PayrollCalRoundoffTotalOvertime.toFixed(2)),
//         RoundOffTotalOvertime: parseFloat(roundOffTotalOvertime.toFixed(2)),
//         TotalOvertimeHoursManually: parseFloat(totalManualOvertimeManually.toFixed(2)),
//         shift: workingHours,
//         creationDate: new Date(),
//         selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`,
//         date: today,
//       };

//       console.log(`📊 Saving monthly summary for Labour ID: ${labourId}`);
//       await labourModel.insertIntoLabourAttendanceSummary(summary);
//     }

//     console.log("✅ compareAndUpdateLabourPunches completed successfully!");

//     return {
//       success: true,
//       message: '✅ Attendance Updated Successfully',
//       totalNullFirstPunch: nullFirstPunchIds.length,
//       matchedCount: matchedIds.length,
//       matchedLabourIds: matchedIds,
//     };
//   } catch (error) {
//     console.error('[compareAndUpdateLabourPunches] ❌ Error:', error);
//     return { success: false, message: 'Error updating attendance', error: error.message };
//   }
// };


// ✅ Helper to split array into chunks
function chunkArray(arr, size) {
  return arr.reduce((chunks, _, i) => (i % size ? chunks : [...chunks, arr.slice(i, i + size)]), []);
}

// ✅ Extracted labour processing logic
async function processLabourAttendance(labourId, pool1) {
  console.log(`\n🔄 Processing Labour ID: ${labourId}`);

  const basicDataRes = await pool1
    .request()
    .input("currentId", sql.VarChar, labourId)
    .query(`
      SELECT LabourID AS labourId, workingHours, projectName
      FROM [labourOnboarding]
      WHERE LabourID = @currentId
    `);

  const basicData = basicDataRes.recordset[0];
  if (!basicData) {
    console.log(`⚠️ No basic data found for Labour ID: ${labourId}. Skipping...`);
    return;
  }

  const { workingHours, projectName } = basicData;
  const shiftHours = getShiftHours(workingHours);
  const halfDayHours = getHalfDayHours(shiftHours);

  const today = new Date();
  const parsedMonth = today.getMonth() + 1;
  const parsedYear = today.getFullYear();
  const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

  const labourAttendance = await labourModel.getAttendanceByLabourId(
    labourId,
    parsedMonth,
    parsedYear
  );

  console.log(`📥 Retrieved ${labourAttendance.length} punch records for ${labourId}`);

  // Counters
  let presentDays = 0,
    halfDays = 0,
    missPunchDays = 0,
    absentDays = 0;
  let totalOvertimeHours = 0,
    PayrollCalRoundoffTotalOvertime = 0,
    roundOffTotalOvertime = 0,
    totalManualOvertimeManually = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${parsedYear}-${String(parsedMonth).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;

    const punchesForDay = labourAttendance.filter(
      (att) => new Date(att.punch_date).toISOString().split("T")[0] === date
    );

    const { status, firstPunch, lastPunch, totalHours } = determineStatus(
      punchesForDay,
      shiftHours,
      halfDayHours,
      workingHours
    );

    console.log(`📆 ${date} | Status: ${status} | Punches: ${punchesForDay.length}`);

    const overtime = status === "P" && totalHours > shiftHours ? totalHours - shiftHours : 0;
    const dailyRoundOffOvertime = roundOvertime(overtime);
    const OvertimeManually = dailyRoundOffOvertime > 4 ? 4 : dailyRoundOffOvertime;

    if (status === "P") presentDays++;
    else if (status === "HD") halfDays++;
    else if (status === "MP") missPunchDays++;
    else absentDays++;

    totalOvertimeHours += overtime;
    PayrollCalRoundoffTotalOvertime += dailyRoundOffOvertime;
    roundOffTotalOvertime += dailyRoundOffOvertime;
    totalManualOvertimeManually += OvertimeManually;

    const details = {
      labourId,
      projectName: parseInt(projectName, 10),
      date,
      firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
      firstPunchAttendanceId: firstPunch?.attendance_id || null,
      firstPunchDeviceId: firstPunch?.Device_id || null,
      lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
      lastPunchAttendanceId: lastPunch?.attendance_id || null,
      lastPunchDeviceId: lastPunch?.Device_id || null,
      totalHours: totalHours.toFixed(2),
      overtime: overtime.toFixed(2),
      PayrollCalRoundOffOvertime: dailyRoundOffOvertime.toFixed(2),
      OvertimeManually: OvertimeManually.toFixed(2),
      status,
      creationDate: new Date(),
      projectIdFromDevicefirstPunch: firstPunch?.Device_id
        ? await labourModel.getProjectIdByDeviceId(firstPunch.Device_id)
        : null,
      projectIdFromDeviceLastPunch: lastPunch?.Device_id
        ? await labourModel.getProjectIdByDeviceId(lastPunch.Device_id)
        : null,
    };

    await labourModel.insertIntoLabourAttendanceDetails(details);
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
    selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, "0")}`,
    date: today,
  };

  await labourModel.insertIntoLabourAttendanceSummary(summary);
}

// ✅ Main function
const compareAndUpdateLabourPunches = async () => {
  try {
    console.log("🚀 Starting compareAndUpdateLabourPunches process...");

    const pool1 = await poolPromise;
    const pool2 = await poolPromise3;

    // Step 1: Get LabourIds with NULL LastPunch
    const nullFirstPunchIds = (
      await pool1.request().query(`
        SELECT DISTINCT LabourId
        FROM [LabourOnboardingForm].[dbo].[LabourAttendanceDetails]
        WHERE LastPunch IS NULL
          AND [Date] BETWEEN DATEADD(DAY, -30, CAST(GETDATE() AS DATE)) 
                          AND DATEADD(DAY, -2, CAST(GETDATE() AS DATE))
      `)
    ).recordset.map((row) => row.LabourId);

    console.log(`✅ Found ${nullFirstPunchIds.length} Labour IDs with NULL LastPunch.`);

    if (nullFirstPunchIds.length === 0) {
      console.log("⚠️ No Labour IDs found. Exiting function.");
      return [];
    }

    // ✅ Step 2: Fetch valid punches in chunks
    console.log("🔍 Fetching valid punches in chunks...");
    const chunks = chunkArray(nullFirstPunchIds, 300);
    let validPunchTimeIds = [];

    for (const chunk of chunks) {
      const chunkString = chunk.map((id) => `'${id}'`).join(",");
      const result = await pool2.request().query(`
        SELECT DISTINCT user_id
        FROM [etimetracklite11.8].[dbo].[Attendance]
        WHERE punch_time IS NOT NULL
          AND punch_date BETWEEN DATEADD(DAY, -30, CAST(GETDATE() AS DATE)) 
                             AND DATEADD(DAY, -2, CAST(GETDATE() AS DATE))
          AND user_id IN (${chunkString})
          AND (user_id LIKE 'JC%' OR user_id LIKE 'JIH%');
      `);

      validPunchTimeIds.push(...result.recordset.map((row) => row.user_id));
    }

    console.log(`✅ Found ${validPunchTimeIds.length} Labour IDs with valid punches.`);

    const matchedIds = nullFirstPunchIds.filter((id) => validPunchTimeIds.includes(id));
    console.log(`🎯 Matched ${matchedIds.length} Labour IDs for processing.`);

    // ✅ Process in batches of 5 labour IDs
    const BATCH_SIZE = 5;
    for (let i = 0; i < matchedIds.length; i += BATCH_SIZE) {
      const batch = matchedIds.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(batch.map((labourId) => processLabourAttendance(labourId, pool1)));
    }

    console.log("✅ compareAndUpdateLabourPunches completed successfully!");

    return {
      success: true,
      message: "✅ Attendance Updated Successfully",
      totalNullFirstPunch: nullFirstPunchIds.length,
      matchedCount: matchedIds.length,
      matchedLabourIds: matchedIds,
    };
  } catch (error) {
    console.error("[compareAndUpdateLabourPunches] ❌ Error:", error);
    return { success: false, message: "Error updating attendance", error: error.message };
  }
};



// ==============================================       RUNNING CODE CORRECTLY      ============================================

//   const compareAndUpdateLabourPunches = async () => {
//   try {
//     const pool1 = await poolPromise;
//     const pool2 = await poolPromise3;

//     // Step 1: Get LabourIds with NULL FirstPunch in last 60 to 2 days
//     const getLabourIdsWithNullFirstPunch = async () => {
//       const result = await pool1.request().query(`
//         SELECT DISTINCT LabourId
//         FROM [LabourOnboardingForm].[dbo].[LabourAttendanceDetails]
//         WHERE FirstPunch IS NULL
//           AND [Date] BETWEEN DATEADD(DAY, -60, CAST(GETDATE() AS DATE)) 
//                           AND DATEADD(DAY, -2, CAST(GETDATE() AS DATE))
//       `);
//       return result.recordset.map(row => row.LabourId);
//     };

//     const nullFirstPunchIds = await getLabourIdsWithNullFirstPunch();
//     if (nullFirstPunchIds.length === 0) return [];

//     // Step 2: Get those LabourIds who have logs in current month
//     const matchedIdString = nullFirstPunchIds.map(id => `'${id}'`).join(',');
//     const result2 = await pool1.request().query(`
//       SELECT DISTINCT LabourId
//       FROM [LabourOnboardingForm].[dbo].[LabourAttendanceLogs]
//       WHERE LabourId IN (${matchedIdString})
//         AND MONTH(CreatedAt) = MONTH(GETDATE())
//         AND YEAR(CreatedAt) = YEAR(GETDATE())
//     `);

//     const labourIdsWithLogs = result2.recordset.map(row => row.LabourId);
//     if (labourIdsWithLogs.length === 0) return [];

//     // Step 3: Get valid punches from Attendance system
//     const labourIdsWithLogsString = labourIdsWithLogs.map(id => `'${id}'`).join(',');
//     const result3 = await pool2.request().query(`
//       SELECT DISTINCT user_id
//       FROM [etimetracklite11.8].[dbo].[Attendance]
//       WHERE punch_time IS NOT NULL
//         AND punch_date BETWEEN DATEADD(DAY, -60, CAST(GETDATE() AS DATE)) 
//                            AND DATEADD(DAY, -2, CAST(GETDATE() AS DATE))
//         AND user_id IN (${labourIdsWithLogsString})
//         AND (
//           user_id LIKE 'JC%' 
//           OR user_id LIKE 'JIH%'
//         );
//     `);

//     const validPunchTimeIds = result3.recordset.map(row => row.user_id);
//     const validSet = new Set(validPunchTimeIds);
//     const matchedIds = nullFirstPunchIds.filter(id => validSet.has(id));

//     console.log("Matched Labour IDs with Valid Punch:", matchedIds);

//     // Proceed with processing each matched labourId
//     const today = new Date();
//     const parsedMonth = today.getMonth() + 1;
//     const parsedYear = today.getFullYear();
//     const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

//     for (const labourId of matchedIds) {
//       console.log(`🔍 Processing Labour ID: ${labourId}`);
//       const pool = await poolPromise;

//       // You can still fetch basic onboarding data if needed
//       const result = await pool.request()
//         .input('currentId', sql.VarChar, labourId)
//         .query(`
//           SELECT DISTINCT LabourID AS labourId, workingHours, projectName, status
//           FROM [labourOnboarding]
//           WHERE LabourID = @currentId
//         `);

//       const basicData = result.recordset[0];
//       if (!basicData) continue;

//       const { workingHours, projectName } = basicData;
//       const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//       const halfDayHours = shiftHours === 9 ? 4.5 : 4;

//       let presentDays = 0, halfDays = 0, missPunchDays = 0, absentDays = 0;
//       let totalOvertimeHours = 0, roundOffTotalOvertime = 0, PayrollCalRoundoffTotalOvertime = 0;
//       let totalManualOvertimeManually = 0;
//       let monthlyAttendance = [];

//       const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);

//       for (let day = 1; day <= daysInMonth; day++) {
//         const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//         const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

//         let { status, firstPunch, lastPunch, totalHours } = determineStatus(punchesForDay, shiftHours, halfDayHours, workingHours);

//         let overtime = 0, dailyRoundOffOvertime = 0;
//         let firstPunchAttendanceId = null, firstPunchDeviceId = null;
//         let lastPunchAttendanceId = null, lastPunchDeviceId = null;
//         let projectIdFromDevicefirstPunch = null;
//         let projectIdFromDeviceLastPunch = null;

//         if (firstPunch) {
//           firstPunchAttendanceId = firstPunch.attendance_id;
//           firstPunchDeviceId = firstPunch.Device_id;
//           if (firstPunchDeviceId) {
//             projectIdFromDevicefirstPunch = await labourModel.getProjectIdByDeviceId(firstPunchDeviceId);
//           }
//         }

//         if (lastPunch) {
//           lastPunchAttendanceId = lastPunch.attendance_id;
//           lastPunchDeviceId = lastPunch.Device_id;
//           if (lastPunchDeviceId) {
//             projectIdFromDeviceLastPunch = await labourModel.getProjectIdByDeviceId(lastPunchDeviceId);
//           }
//         }

//         if (status === 'P') {
//           overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;
//         }

//         dailyRoundOffOvertime = roundOvertime(overtime);
//         let OvertimeManually = dailyRoundOffOvertime > 4 ? 4 : dailyRoundOffOvertime;

//         switch (status) {
//           case 'P': presentDays++; break;
//           case 'HD': halfDays++; break;
//           case 'MP': missPunchDays++; break;
//           case 'A': absentDays++; break;
//           default: absentDays++;
//         }

//         totalOvertimeHours += overtime;
//         PayrollCalRoundoffTotalOvertime += roundOvertime(overtime);
//         roundOffTotalOvertime += dailyRoundOffOvertime;
//         totalManualOvertimeManually += OvertimeManually;

//         const safeTotalHours = typeof totalHours === 'number' && !isNaN(totalHours) ? totalHours : 0;

//         monthlyAttendance.push({
//           labourId,
//           projectName: parseInt(projectName, 10),
//           date,
//           firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
//           firstPunchAttendanceId,
//           firstPunchDeviceId,
//           lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
//           lastPunchAttendanceId,
//           lastPunchDeviceId,
//           totalHours: safeTotalHours.toFixed(2),
//           overtime: overtime.toFixed(2),
//           PayrollCalRoundOffOvertime: dailyRoundOffOvertime.toFixed(2),
//           OvertimeManually: OvertimeManually.toFixed(2),
//           status,
//           creationDate: new Date(),
//           projectIdFromDevicefirstPunch,
//           projectIdFromDeviceLastPunch,
//         });
//       }

//       const summary = {
//         labourId,
//         projectName: parseInt(projectName, 10),
//         totalDays: daysInMonth,
//         presentDays,
//         halfDays,
//         missPunchDays,
//         absentDays,
//         totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
//         PayrollCalRoundoffTotalOvertime: parseFloat(PayrollCalRoundoffTotalOvertime.toFixed(2)),
//         RoundOffTotalOvertime: parseFloat(roundOffTotalOvertime.toFixed(2)),
//         TotalOvertimeHoursManually: parseFloat(totalManualOvertimeManually.toFixed(2)),
//         shift: workingHours,
//         creationDate: new Date(),
//         selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`,
//       };

//       await labourModel.insertIntoLabourAttendanceSummary(summary);
//       for (let dayAttendance of monthlyAttendance) {
//           console.log(`Attendance Controller function ${labourId} on ${dayAttendance.date}:`, dayAttendance);
//         await labourModel.insertIntoLabourAttendanceDetails(dayAttendance);
//       }
//     }

//     return {
//       success: true,
//       message: 'Comparison successful',
//       totalNullFirstPunch: nullFirstPunchIds.length,
//       totalValidPunchTime: validPunchTimeIds.length,
//       matchedCount: matchedIds.length,
//       matchedLabourIds: matchedIds,
//     };
//   } catch (error) {
//     console.error('[compareAndUpdateLabourPunches] Error:', error);
//     return {
//       success: false,
//       message: 'Error comparing labour punch data',
//       error: error.message
//     };
//   }
// };



const getLabourIdsWithNullFirstPunch = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT DISTINCT LabourId
    FROM LabourOnboardingForm.dbo.LabourAttendanceDetails
    WHERE FirstPunch IS NULL
      AND [Date] >= DATEADD(DAY, -10, CAST(GETDATE() AS DATE))
  `);
  return result.recordset.map(row => row.LabourId);



};


// Helper 2: Labour IDs with punch_time NOT NULL in last 10 days
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

// Main Controller: Compare both results
const getValidPunches = async (req, res) => {
  try {
    const nullFirstPunchIds = await getLabourIdsWithNullFirstPunch(); // returns list like ['JC0929', 'JC0833', ...]

    const poolAttendance = await poolPromise3; // For Attendance DB
    const poolTarget = await poolPromise; // For LabourAttendanceDetails DB

    let totalUpdated = 0;

    for (const currentId of nullFirstPunchIds) {
      console.log(`⏳ Processing LabourId: ${currentId}`);

      const result = await poolAttendance.request()
        .input('currentId', sql.VarChar, currentId)
        .query(`
          SELECT attendance_id, punch_time, punch_date, Device_id
          FROM [dbo].[Attendance]
          WHERE user_id = @currentId
            AND punch_date >= DATEADD(DAY, -10, CAST(GETDATE() AS DATE))
          ORDER BY punch_date, punch_time
        `);

      const records = result.recordset;
   console.log( records , '-----------records');
   
      if (!records.length) {
        console.log(`⚠️ No attendance records for LabourId: ${currentId}`);
        continue;
      }

      // Group punches by punch_date
      const groupedPunches = {};
      for (const record of records) {
        console.log( record , '------------recordSet');
        
        const dateKey = record.punch_date.toISOString().split('T')[0];
        if (!groupedPunches[dateKey]) groupedPunches[dateKey] = [];
        groupedPunches[dateKey].push(record);
      }

      for (const [date, punches] of Object.entries(groupedPunches)) {

        console.log(groupedPunches , '------------------------ record set Of Valid ');
        
        punches.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));
        const firstPunchTime = punches[0].punch_time.toTimeString().slice(0, 8);
        const lastPunchTime = punches[punches.length - 1].punch_time.toTimeString().slice(0, 8);

        // Update FirstPunch and LastPunch in [LabourAttendanceDetails]
        const resultSet = await poolTarget.request()
          .input('labourId', sql.VarChar, currentId)
          .input('date', sql.Date, date)
          .input('firstPunch', sql.VarChar, firstPunchTime)
          .input('lastPunch', sql.VarChar, lastPunchTime)
          .query(`
            UPDATE [LabourAttendanceDetails]
            SET FirstPunch = @firstPunch,
                LastPunch = @lastPunch
            WHERE LabourId = @labourId AND [Date] = @date
          `);

        const rows = resultSet.rowsAffected[0];
        if (rows > 0) {
          console.log(`✅ Updated: ${currentId} | ${date} | First=${firstPunchTime} | Last=${lastPunchTime}`);
          totalUpdated += rows;
        } else {
          console.log(`⚠️ No matching record to update for ${currentId} on ${date}`);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `✅ Punch update completed`,
      updatedLabours: nullFirstPunchIds.length,
      totalUpdates: totalUpdated
    });
  } catch (error) {
    console.error('[getValidPunches] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during punch update',
      error: error.message
    });
  }
};





module.exports = { compareAndUpdateLabourPunches, getValidPunches };

