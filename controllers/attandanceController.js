
const { sql, poolPromise } = require('../config/dbConfig');
const { poolPromise3 } = require('../config/dbConfig3');
const { cron } = require('node-cron')
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



function chunkArray(arr, size) {
  return arr.reduce((chunks, _, i) => (i % size ? chunks : [...chunks, arr.slice(i, i + size)]), []);
}



async function processLabourAttendanceForSpecificDate(labourId, date, pool1, { deviceProjectCache } = {}) {
  // deviceProjectCache: optional Map<number, number> to reuse across calls

  const safeRound2 = (n) => Math.round((n ?? 0) * 100) / 100;

  console.log(`\n🔄 Processing Labour ID: ${labourId} for Date: ${date}`);

  try {
    // 1) Parallel reads
    const [basicDataRes, punchesForDay] = await Promise.all([
      pool1.request()
        .input("currentId", sql.VarChar, labourId)
        .query(`
          SELECT LabourID AS labourId, workingHours, projectName
          FROM [labourOnboarding]
          WHERE LabourID = @currentId
        `),
      labourModel.getAttendanceByLabourIdAndDate(labourId, date),
    ]);

    const basicData = basicDataRes.recordset[0];
    if (!basicData) {
      console.log(`⚠️ No basic data found for Labour ID: ${labourId}. Skipping...`);
      return { labourId, date, skipped: true, reason: "no_basic_data" };
    }

    const { workingHours, projectName } = basicData;
    const shiftHours = getShiftHours(workingHours);
    const halfDayHours = getHalfDayHours(shiftHours);

    console.log(`📥 ${labourId} ${date}: ${punchesForDay.length} punches`);

    const { status, firstPunch, lastPunch, totalHours } = determineStatus(
      punchesForDay,
      shiftHours,
      halfDayHours,
      workingHours
    );

    console.log(`📆 ${date} | Status: ${status} | Punches: ${punchesForDay.length}`);

    // 2) Overtime math (keep numbers, not strings)
    const overtime = (status === "P" && totalHours > shiftHours) ? (totalHours - shiftHours) : 0;
    const dailyRoundOffOvertime = roundOvertime(overtime);  // your policy
    const overtimeManually = Math.min(dailyRoundOffOvertime, 4);

    // 3) Device→Project lookups (batch & cache)
    let projectIdFromDeviceFirstPunch = null;
    let projectIdFromDeviceLastPunch = null;

    const deviceIds = [
      firstPunch?.Device_id,
      lastPunch?.Device_id
    ].filter((v, i, arr) => v != null && arr.indexOf(v) === i);

    if (deviceIds.length) {
      const map = deviceProjectCache ?? new Map();
      const missing = deviceIds.filter(id => !map.has(id));
      if (missing.length) {
        // fetch missing in one DB round-trip
        const rows = await Promise.all(
          missing.map(async (rawId) => {
            const row = await labourModel.getProjectIdByDeviceId(rawId); // returns { Device_id, ProjectId } or null
            return row;
          })
        );

        rows.filter(Boolean).forEach(r => map.set(r.Device_id, r.ProjectId ?? null));
        if (deviceProjectCache) {
          for (const [k, v] of map) deviceProjectCache.set(k, v);
        }
      }
      projectIdFromDeviceFirstPunch = firstPunch?.Device_id != null ? (deviceProjectCache ?? map).get(firstPunch.Device_id) ?? null : null;
      projectIdFromDeviceLastPunch = lastPunch?.Device_id != null ? (deviceProjectCache ?? map).get(lastPunch.Device_id) ?? null : null;
    }

    // 4) Prepare detail payload with safe types
    const details = {
      labourId,
      // if projectName is numeric text, cast; otherwise keep null/undefined
      projectName: Number.isFinite(Number(projectName)) ? Number(projectName) : null,
      date,
      firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
      firstPunchAttendanceId: firstPunch?.attendance_id ?? null,
      firstPunchDeviceId: firstPunch?.Device_id ?? null,
      lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
      lastPunchAttendanceId: lastPunch?.attendance_id ?? null,
      lastPunchDeviceId: lastPunch?.Device_id ?? null,
      totalHours: safeRound2(totalHours),
      overtime: safeRound2(overtime),
      PayrollCalRoundOffOvertime: safeRound2(dailyRoundOffOvertime),
      OvertimeManually: safeRound2(overtimeManually),
      status,
      creationDate: new Date(),
      projectIdFromDevicefirstPunch: projectIdFromDeviceFirstPunch,
      projectIdFromDeviceLastPunch: projectIdFromDeviceLastPunch,
    };

    // 5) Transaction: upsert details + update summary atomically
    const tx = new sql.Transaction(pool1);
    await tx.begin();

    try {

      // Idempotent write for Details (MERGE or UPDATE/INSERT)
      await labourModel.insertIntoLabourAttendanceDetails(details);
      // Or:
      // await labourModel.insertIntoLabourAttendanceDetails(details, req)  // implement to use the transaction's request

      await labourModel.insertOrUpdateLabourAttendanceSummary(labourId, date);

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    return {
      labourId,
      date,
      status,
      firstPunch: details.firstPunch,
      lastPunch: details.lastPunch,
      totalHours: details.totalHours,
      overtime: details.overtime,
    };

  } catch (err) {
    console.error(`❌ processLabourAttendanceForSpecificDate(${labourId}, ${date})`, err);
    return { labourId, date, error: err.message };
  }
}


// ✅ Main function
// Run inside an async context
const compareAndUpdateLabourPunches = async ({
  daysBack = 30,            // was 2
  includeToday = false,      // true => up to today; false => up to yesterday
  labourId = null          // optional: limit to one LabourId (e.g., 'JC0617')
} = {}) => {
  try {
    console.log("🚀 Starting compareAndUpdateLabourPunches process...");

    const pool1 = await poolPromise;

    // Use half-open date window [start, end)
    // end = today + (includeToday ? 1 : 0) days, start = end - daysBack
    const dateWindow = await pool1.request()
      .input('daysBack', sql.Int, daysBack)
      .input('addEnd', sql.Int, includeToday ? 1 : 0)
      .query(`
        DECLARE @today date = CAST(GETDATE() AS date);
        SELECT
          DATEADD(DAY, -@daysBack, DATEADD(DAY, @addEnd, @today)) AS start_date,
          DATEADD(DAY, @addEnd, @today)                           AS end_date;
      `);

    const { start_date: startDate, end_date: endDate } = dateWindow.recordset[0];

    // 1 SQL round-trip: get only pairs that truly need processing
    //   - Missing first/last in details
    //   - And at least one punch for same labour/date in EsslAttendance
    const req = pool1.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate);

    if (labourId) req.input('filterLabour', sql.NVarChar, labourId);

    const missingPairsQuery = `
      WITH Missing AS (
        SELECT LabourId, [Date]
        FROM [dbo].[LabourAttendanceDetails]
        WHERE (FirstPunch IS NULL OR LastPunch IS NULL)
          AND [Date] >= @startDate AND [Date] < @endDate
          ${labourId ? 'AND LabourId = @filterLabour' : ''}
      )
      SELECT DISTINCT m.LabourId, m.[Date]
      FROM Missing m
      JOIN [dbo].[EsslAttendance] e
        ON e.user_id = m.LabourId
       AND e.punch_date = m.[Date]
       AND e.punch_time IS NOT NULL
      ORDER BY m.LabourId, m.[Date];
    `;

    const pairsRes = await req.query(missingPairsQuery);
    const pairs = pairsRes.recordset;

    if (!pairs.length) {
      console.log("✅ Nothing to update: no missing days with punches found.");
      return { success: true, message: 'No updates needed', totalPairs: 0 };
    }

    console.log(`🎯 Found ${pairs.length} labour-date pairs to process.`);

    // Concurrency control (use a small limit to avoid DB overload)
    const CONCURRENCY = 8;
    const queue = [];
    let active = 0, idx = 0, processed = 0, failed = 0;

    const runNext = async () => {
      if (idx >= pairs.length) return;
      const { LabourId, Date: punchDate } = pairs[idx++];
      active++;

      const dateStr = punchDate.toISOString().slice(0, 10); // safe because it came from SQL as a date
      try {
        await processLabourAttendanceForSpecificDate(LabourId, dateStr, pool1);
        processed++;
      } catch (err) {
        console.error(`❌ ${LabourId} ${dateStr}:`, err.message);
        failed++;
      } finally {
        active--;
        await runNext();
      }
    };

    // Start workers
    for (let i = 0; i < Math.min(CONCURRENCY, pairs.length); i++) {
      queue.push(runNext());
    }
    await Promise.all(queue);

    return {
      success: failed === 0,
      message: '✅ Attendance update completed',
      window: { startDate, endDateExclusive: endDate },
      totalPairs: pairs.length,
      processed,
      failed
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



const getMatchedLabourIdsWithValidPunch = async () => {
  try {
    const pool1 = await poolPromise;
    const pool2 = await poolPromise3;

    // Get labour IDs with missing punches
    const nullPunchResult = await pool1.request()
      .input('date', date)
      .query(`
        SELECT DISTINCT LabourId
        FROM LabourOnboardingForm.dbo.LabourAttendanceDetails
        WHERE FirstPunch IS NULL AND [Date] = @date
      `);

    const labourIds = nullPunchResult.recordset.map(row => row.LabourId);

    if (labourIds.length === 0) {
      return res.status(200).json({
        success: true,
        updatedLabourCount: 0,
        totalExpected: 0,
        updatedLabourIds: [],
        message: `No labourers with missing punches on ${date}`,
      });
    }

    // Process with a concurrency limit of 5
    const updatedLabourIds = await runWithConcurrency(
      labourIds,
      5, // max concurrent DB updates
      async (labourId) => await updatePunchForLabour(labourId, date, pool1, pool2)
    );

    const filteredIds = updatedLabourIds.filter(Boolean);

    return res.status(200).json({
      success: true,
      updatedLabourCount: filteredIds.length,
      totalExpected: labourIds.length,
      updatedLabourIds: filteredIds,
      message: `Punches updated for ${filteredIds.length} labourers on ${date}`,
    });

  } catch (error) {
    console.error("Error updating punches:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};




//  update Labour By Id  ----------------------------------------------------------------------

function calculateHoursAndOT(firstPunch, lastPunch) {
  const [fh, fm, fs] = firstPunch.split(':').map(Number);
  const [lh, lm, ls] = lastPunch.split(':').map(Number);

  const start = new Date(0, 0, 0, fh, fm, fs);
  const end = new Date(0, 0, 0, lh, lm, ls);

  let diffMs = end - start;
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

  const totalHours = diffMs / (1000 * 60 * 60);
  const standardHours = 8;
  const overtime = totalHours > standardHours ? totalHours - standardHours : 0;

  return {
    totalHours: parseFloat(totalHours.toFixed(2)),
    overtime: parseFloat(overtime.toFixed(2)),
  };
}
//  ----------------------------------------------- Add thecontroller to  the Get the All Status Update By User  __________________  
function calculateHoursAndOT(punchIn, punchOut) {
  const [inH, inM, inS] = punchIn.split(':').map(Number);
  const [outH, outM, outS] = punchOut.split(':').map(Number);

  const start = new Date(0, 0, 0, inH, inM, inS);
  const end = new Date(0, 0, 0, outH, outM, outS);
  let diff = (end - start) / 1000 / 60 / 60; // in hours

  if (diff < 0) diff += 24; // handle overnight shifts

  const totalHours = parseFloat(diff.toFixed(2));
  const overtime = totalHours > 9 ? parseFloat((totalHours - 9).toFixed(2)) : 0;

  return { totalHours, overtime };
}

async function updateAttandaceStatus(req, res) {
  const { labourId, date, status, FirstPunch, LastPunch } = req.body;

  if (!labourId || !date || !status) {
    return res.status(400).json({ message: 'labourId, date and status are required' });
  }

  let punchIn = null;
  let punchOut = null;
  let totalHours = 0;
  let overtime = 0;

  if (status === 'P') {
    // Present: use provided punches or default
    punchIn = FirstPunch || '09:00:00';
    punchOut = LastPunch || '18:00:00';

    const times = calculateHoursAndOT(punchIn, punchOut);
    totalHours = times.totalHours;
    overtime = times.overtime;

  } else if (status === 'H') {
    // Halfday: fixed hours
    punchIn = FirstPunch || '09:00:00';
    punchOut = LastPunch || '13:00:00';
    totalHours = 4;
    overtime = 0;

  } else if (status === 'A' || status === 'M') {
    // Absent or Misspunch: set zero punches instead of null
    punchIn = '00:00:00';
    punchOut = '00:00:00';
    totalHours = 0;
    overtime = 0;

  } else {
    // Other statuses - no work
    punchIn = '00:00:00';
    punchOut = '00:00:00';
    totalHours = 0;
    overtime = 0;
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('labourId', sql.NVarChar, labourId)
      .input('date', sql.Date, date)
      .input('status', sql.NVarChar, status)
      .input('firstPunch', sql.Time, punchIn)
      .input('lastPunch', sql.Time, punchOut)
      .input('totalHours', sql.Decimal(5, 2), totalHours)
      .input('overtime', sql.Decimal(5, 2), overtime)
      .query(`
        UPDATE [dbo].[LabourAttendanceDetails]
        SET 
          Status = @status,
          FirstPunch = @firstPunch,
          LastPunch = @lastPunch,
          TotalHours = @totalHours,
          Overtime = @overtime
        WHERE LabourId = @labourId AND Date = @date
      `);

    return res.status(200).json({
      message: 'Attendance updated successfully',
      rowsAffected: result.rowsAffected[0],
      totalHours,
      overtime,
    });

  } catch (error) {
    console.error('Error updating attendance:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}


module.exports = { compareAndUpdateLabourPunches,
  //  getValidPunches,
   updateAttandaceStatus
};

