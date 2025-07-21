const { sql, poolPromise } = require('../config/dbConfig');
const { poolPromise3 } = require('../config/dbConfig3');

const compareAndUpdateLabourPunches = async () => {
  try {
    // Get Labour IDs with NULL FirstPunch
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

    // Get user_ids with valid punches
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

    for (let i = 0; i < matchedIds.length; i++) {
      const currentId = matchedIds[i];
      console.log(`🔍 Processing Labour ID: ${currentId}`);

      const pool3 = await poolPromise3;
      const result = await pool3.request()
        .input('currentId', currentId)
        .query(`
          SELECT attendance_id, punch_time, punch_date, Device_id
          FROM [dbo].[Attendance]
          WHERE user_id = @currentId
            AND punch_date >= DATEADD(DAY, -10, CAST(GETDATE() AS DATE))
          ORDER BY punch_date, punch_time
        `);

      const records = result.recordset;
      const groupedPunches = {};

      for (const record of records) {
        const dateKey = record.punch_date.toISOString().split('T')[0];
        if (!groupedPunches[dateKey]) {
          groupedPunches[dateKey] = [];
        }
        groupedPunches[dateKey].push(record);
      }

      const firstLastPunchPerDay = [];
      for (const [date, punches] of Object.entries(groupedPunches)) {
        punches.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));
        firstLastPunchPerDay.push({
          date,
          firstPunch: punches[0],
          lastPunch: punches[punches.length - 1],
        });
      }

      const db = await poolPromise;
      for (const day of firstLastPunchPerDay) {
        const date = day.date;
        const firstPunchTime = new Date(day.firstPunch.punch_time).toTimeString().slice(0, 8);
        const lastPunchTime = new Date(day.lastPunch.punch_time).toTimeString().slice(0, 8);

        // Update FirstPunch
        await db.request()
          .input('labourId', sql.VarChar, currentId)
          .input('date', sql.Date, date)
          .input('firstPunch', sql.VarChar, firstPunchTime)
          .query(`
            UPDATE [LabourOnboardingForm_TEST].[dbo].[LabourAttendanceDetails]
            SET [FirstPunch] = @firstPunch
            WHERE LabourId = @labourId AND [Date] = @date
          `);

        // Update LastPunch
        await db.request()
          .input('labourId', sql.VarChar, currentId)
          .input('date', sql.Date, date)
          .input('lastPunch', sql.VarChar, lastPunchTime)
          .query(`
            UPDATE [LabourOnboardingForm_TEST].[dbo].[LabourAttendanceDetails]
            SET [LastPunch] = @lastPunch
            WHERE LabourId = @labourId AND [Date] = @date
          `);

        // Update Status to 'P' if currently 'A'
        await db.request()
          .input('labourId', sql.VarChar, currentId)
          .input('date', sql.Date, date)
          .query(`
            UPDATE [LabourOnboardingForm_TEST].[dbo].[LabourAttendanceDetails]
            SET [Status] = 'P'
            WHERE LabourId = @labourId AND [Date] = @date AND Status = 'A'
          `);

        console.log(`✅ Updated ${currentId} on ${date} → First: ${firstPunchTime}, Last: ${lastPunchTime}, Status: P`);
      }
    }

    console.log('✅ Labour Punch Comparison Completed');
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
};

module.exports = { compareAndUpdateLabourPunches };
