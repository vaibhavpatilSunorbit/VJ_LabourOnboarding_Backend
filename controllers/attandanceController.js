const { sql, poolPromise } = require('../config/dbConfig');
const { poolPromise3 } = require('../config/dbConfig3');

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
    const [nullFirstPunchIds, validPunchTimeIds] = await Promise.all([
      getLabourIdsWithNullFirstPunch(),
      getLabourIdsWithValidPunchTime(),

    ]);
    // console.log('Null First Punch IDs:', nullFirstPunchIds);
    const validSet = new Set(validPunchTimeIds);
    const matchedIds = nullFirstPunchIds.filter(id => validSet.has(id));
    // console.log('Matched IDs:', matchedIds);x
    for (let i = 0; i < matchedIds.length; i++) {
      console.log(`Matched ID ${i + 1}: ${matchedIds[i]}`);
      let currentId = matchedIds[i];
      //get first and last punch of this id
      let pool = await poolPromise3;
      const result = await pool.request()
        .input('currentId', currentId)
        .query(`
          select attendance_id, punch_time , punch_date , Device_id from [dbo].[Attendance] 
          where user_id = @currentId 
          and punch_date>= DATEADD(DAY, -10, CAST(GETDATE() AS DATE)) order by punch_date, punch_time
        `
        );
      //now i have fetched the  last ten days attendance now i am trying to get the first and last puch of each day
      const records = result.recordset;
      console.log("Resordsasjbcac =====", records);
      const groupedPunches = {};

      // Group punches by date
      for (const record of records) {
        const dateKey = record.punch_date.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        if (!groupedPunches[dateKey]) {
          groupedPunches[dateKey] = [];
        }
        groupedPunches[dateKey].push(record);
      }

      // Get first and last punch for each day
      const firstLastPunchPerDay = [];

      for (const [date, punches] of Object.entries(groupedPunches)) {
        // Sort punches by punch_time
        punches.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

        firstLastPunchPerDay.push({
          date,
          firstPunch: punches[0],
          lastPunch: punches[punches.length - 1]
        });
        console.log(`First Punch for ${date}:`, punches[0]);
      }



      console.log('First and Last Punch Per Day:', firstLastPunchPerDay);

      //------------------------------>>>Update In Table Starts From Here -------------------------------------------///>>>>
      const db = await poolPromise
      for (const day of firstLastPunchPerDay) {
        const date = day.date;
        const firstPunchTime = new Date(day.firstPunch.punch_time).toTimeString().slice(0, 8); // HH:mm:ss
        const lastPunchTime = new Date(day.lastPunch.punch_time).toTimeString().slice(0, 8); // HH:mm:ss

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

        console.log(`✅ Updated punches for ${currentId} on ${date}: First=${firstPunchTime}, Last=${lastPunchTime}`);
      }
      pool=await poolPromise3;

      // return;
    }


    res.status(200).json({
      success: true,
      message: 'Comparison successful',
      totalNullFirstPunch: nullFirstPunchIds.length,
      totalValidPunchTime: validPunchTimeIds.length,
      matchedCount: matchedIds.length,
      matchedLabourIds: matchedIds, // remove if you don't want IDs
    });
  } catch (error) {
    console.error('[CompareLabours] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing labour punch data',
    });
  }

};



module.exports = { getValidPunches };
