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

    const validSet = new Set(validPunchTimeIds);
    const matchedIds = nullFirstPunchIds.filter(id => validSet.has(id));

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
