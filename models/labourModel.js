
const {sql, poolPromise } = require('../config/dbConfig');
// const sql = require('mssql');


async function checkAadhaarExists(aadhaarNumber) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('aadhaarNumber', aadhaarNumber)
            .query('SELECT LabourID FROM labourOnboarding WHERE aadhaarNumber = @aadhaarNumber');
        return result.recordset.length > 0;
    } catch (error) {
        console.error('Error checking Aadhaar number:', error);
        throw new Error('Error checking Aadhaar number');
    }
}


// Function to get the next unique ID
async function getNextUniqueID() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT MAX(LabourID) AS lastID FROM labourOnboarding');
        let  nextID = 'JC3615'; // Default starting ID if no records exist

        if (result.recordset[0].lastID) {
            const lastID = result.recordset[0].lastID;
            // console.log("lastId",lastID)
            const numericPart = parseInt(lastID.slice(2)) + 1; 
            console.log("numericPart",numericPart)
            nextID = `JC${numericPart.toString().padStart(4, '0')}`; // Format to desired ID pattern
        }

        return nextID;
    } catch (error) {
        throw new Error('Error fetching next unique ID');
    }
}

// Function to register data
async function registerData(labourData) {
  try {
      const pool = await poolPromise;
      const request = pool.request();
      request.input('LabourID', sql.VarChar, labourData.LabourID);
      
      Object.keys(labourData).forEach((key, index) => {
          if (key !== 'LabourID') {
              request.input(key, sql.VarChar, labourData[key]);
          }
      });

      const result = await request.query(`
      INSERT INTO labourOnboarding (
        LabourID, labourOwnership, uploadAadhaarFront, uploadAadhaarBack, uploadIdProof, name, aadhaarNumber,
        dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date, From_Date, Period, address, pincode, taluka, district, village,
        state, emergencyContact, photoSrc, bankName, branch, accountNumber, ifscCode, projectName, 
        labourCategory, department, workingHours, contractorName, contractorNumber, designation,
        status, isApproved, title, Marital_Status, companyName, Induction_Date, Inducted_By, uploadInductionDoc, OnboardName) 
        VALUES (
        @LabourID, @labourOwnership, @uploadAadhaarFront, @uploadAadhaarBack, @uploadIdProof, @name, @aadhaarNumber,
        @dateOfBirth, @contactNumber, @gender, @dateOfJoining, @Group_Join_Date, @From_Date, @Period, @address, @pincode, @taluka, @district, @village,
        @state, @emergencyContact, @photoSrc, @bankName, @branch, @accountNumber, @ifscCode, @projectName,
        @labourCategory, @department, @workingHours, @contractorName, @contractorNumber, @designation,
        'Pending', 0, @title, @Marital_Status, @companyName, @Induction_Date, @Inducted_By, @uploadInductionDoc, @OnboardName)
      `);
      return result.recordset;
  } catch (error) {
      throw error;
  }
}


// Function to get all records
async function getAll() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM labourOnboarding');
        return result.recordset;
    } catch (error) {
        throw error;
    }
}

// Function to get a record by ID
async function getById(id) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM labourOnboarding WHERE id = @id');
        return result.recordset[0];
    } catch (error) {
        throw error;
    }
}

// Function to update a record
async function update(id, updatedData) {
    try {
        const pool = await poolPromise;
        const request = pool.request().input('id', sql.Int, id);
        let updateQuery = 'UPDATE labourOnboarding SET ';

        Object.keys(updatedData).forEach((key, index) => {
            updateQuery += `${key} = @param${index}, `;
            request.input(`param${index}`, sql.VarChar, updatedData[key]);
        });

        updateQuery = updateQuery.slice(0, -2) + ' WHERE id = @id';
        const result = await request.query(updateQuery);
        return result.rowsAffected[0];
    } catch (error) {
        throw error;
    }
}

// Function to delete a record by ID
async function deleteById(id) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM labourOnboarding WHERE id = @id');
        return result.rowsAffected[0];
    } catch (error) {
        throw error;
    }
}

// Function to get image paths by ID
async function getImagePathsById(id) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof, uploadInductionDoc FROM labourOnboarding WHERE id = @id');
        return result.recordset[0];
    } catch (error) {
        throw error;
    }
}

// Function to search records
async function search(query) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('query', sql.NVarChar, `%${query}%`)
            .query('SELECT * FROM labourOnboarding WHERE name LIKE @query OR aadhaarNumber LIKE @query');
        return result.recordset;
    } catch (error) {
        throw error;
    }
}


async function getAllLabours() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Labour");
        return result.recordset;
    } catch (error) {
        console.error("Error in getAllLabours:", error);
        throw error;
    }
}

async function approveLabour(id, nextID, onboardName) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('LabourID', sql.VarChar, nextID)
            .input('OnboardName', sql.VarChar, onboardName) 
            // .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1 WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");
            // .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1, LabourID = @LabourID WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");
            .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1, LabourID = @LabourID, OnboardName = @OnboardName WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");

            console.log('Database update result:', result);

        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error("Error in approveLabour:", error);
        throw error;
    }
}

async function rejectLabour(id, rejectReason) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('Reject_Reason', sql.VarChar, rejectReason)
            // .query("UPDATE labourOnboarding SET status = 'Rejected', isApproved = 2 WHERE id = @id AND (status = 'Pending' OR status = 'Approved')");
            .query('UPDATE labourOnboarding SET status = \'Rejected\', isApproved = 2, Reject_Reason = @Reject_Reason WHERE id = @id AND (status = \'Pending\' OR status = \'Approved\')');

        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error("Error in rejectLabour:", error);
        throw error;
    }
}



// Function to get all approved labours
async function getApprovedLabours() {
  try {
      const pool = await poolPromise;
      const result = await pool.request()
          .query('SELECT * FROM labourOnboarding WHERE isApproved = 1');
      return result.recordset;
  } catch (error) {
      throw error;
  }
}

async function resubmit(id) {
    try {
        const pool = await poolPromise;
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar, 'Resubmit')
            .input('isApproved', sql.Int, 3);

        const result = await request.query('UPDATE labourOnboarding SET status = @status, isApproved = @isApproved WHERE id = @id');
        return result.rowsAffected[0];
    } catch (error) {
        throw error;
    }
}

module.exports = {
    checkAadhaarExists,
    getNextUniqueID,
    registerData,
    getAll,
    getById,
    update,
    deleteById,
    getImagePathsById,
    search,
    getAllLabours,
    approveLabour,
    rejectLabour,
    getApprovedLabours,
    resubmit
};
































// const { poolPromise } = require('../config/dbConfig');
// const sql = require('mssql');
// const path = require('path');


// async function getNextUniqueID() {
//     try {
//       const pool = await poolPromise; 
//       const result = await pool.request().query(`
//         SELECT MAX(LabourID) AS lastID FROM labourOnboarding
//       `);
  
//       let nextID = 'VJLBF110001'; 
//       if (result.recordset[0].lastID) {
//         const lastID = result.recordset[0].lastID;
//         console.log("lastID",lastID)
//         const numericPart = parseInt(lastID.slice(6)) + 1;
//         console.log("numericPart",numericPart)
//         nextID = `VJLBF${numericPart.toString().padStart(6, '0')}`;
//         console.log("nextID",nextID)
//       }
//       return nextID;
//     } catch (error) {
//       throw new Error('Error fetching next unique ID');
//     }
//   }

//   const registerData = async (labourData) => {
//     try {
//         const pool = await poolPromise;
//         const request = pool.request();

      
//         request.input('LabourID', sql.VarChar, labourData.LabourID);
//         Object.keys(labourData).forEach((key, index) => {
//             if (key !== 'LabourID') {
//                 request.input(`param${index}`, labourData[key]);
//             }
//         });

//         const result = await request.query(`
//             INSERT INTO labourOnboarding (
//                 LabourID, labourOwnership, uploadAadhaarFront, uploadAadhaarBack, name, aadhaarNumber, 
//                 dateOfBirth, contactNumber, gender, dateOfJoining, address, pincode, 
//                 taluka, district, village, state, emergencyContact, photoSrc, bankName, 
//                 branch, accountNumber, ifscCode, projectName, labourCategory, department, 
//                 workingHours, contractorName, contractorNumber, designation
//             ) VALUES (
//                 @LabourID, ${Object.keys(labourData).filter(key => key !== 'LabourID').map((_, index) => `@param${index}`).join(', ')}
//             )
//         `);
//         return { ...result.recordset, LabourID: labourData.LabourID };
//     } catch (error) {
//         throw error;
//     }
// };


// async function getAll() {
//     const pool = await poolPromise;
//     try {
//         const result = await pool.request().query('SELECT * FROM labourOnboarding');
//         return result.recordset;
//     } catch (error) {
//         throw error;
//     }
// }

// async function getById(id) {
//     const pool = await poolPromise;
//     try {
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .query('SELECT * FROM labourOnboarding WHERE id = @id');
//         return result.recordset[0];
//     } catch (error) {
//         throw error;
//     }
// }

// async function update(id, updatedData) {
//     const pool = await poolPromise;
//     try {
//         let updateQuery = 'UPDATE labourOnboarding SET ';
//         const request = pool.request().input('id', sql.Int, id);
//         Object.keys(updatedData).forEach((key, index) => {
//             updateQuery += `${key} = @param${index}, `;
//             request.input(`param${index}`, updatedData[key]);
//         });
//         updateQuery = updateQuery.slice(0, -2) + ' WHERE id = @id';
//         const result = await request.query(updateQuery);
//         return result.rowsAffected[0];
//     } catch (error) {
//         throw error;
//     }
// }

// async function deleteById(id) {
//     const pool = await poolPromise;
//     try {
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .query('DELETE FROM labourOnboarding WHERE id = @id');
//         return result.rowsAffected[0];
//     } catch (error) {
//         throw error;
//     }
// }

// async function getImagePathsById(id) {
//     const pool = await poolPromise;
//     try {
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .query('SELECT uploadAadhaarFront, uploadAadhaarBack, photoSrc FROM labourOnboarding WHERE id = @id');
//         return result.recordset[0];
//     } catch (error) {
//         throw error;
//     }
// }

// async function search(query) {
//     const pool = await poolPromise;
//     try {
//         const result = await pool.request()
//             .input('query', sql.NVarChar, `%${query}%`)
//             .query(`SELECT * FROM labourOnboarding WHERE name LIKE @query OR aadhaarNumber LIKE @query`);
//         return result.recordset;
//     } catch (error) {
//         throw error;
//     }
// }

// const getAllLabours = async (req, res) => {
//   try {
//     const labours = await labourModel.getAllLabours();
//     res.json(labours);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const approveLabour = async (req, res) => {
//   const id = parseInt(req.params.id, 10); 

//   if (isNaN(id)) {
//     return res.status(400).json({ message: 'Invalid labour ID' });
//   }

//   try {
//     const success = await labourModel.approveLabour(id);
//     if (success) {
//       res.json({ success: true, message: 'Labour approved successfully.' });
//     } else {
//       res.status(404).json({ message: 'Labour not found or already approved.' });
//     }
//   } catch (error) {
//     console.error('Error in approveLabour:', error.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

// const rejectLabour = async (req, res) => {
//   const id = parseInt(req.params.id, 10); 

//   if (isNaN(id)) {
//     return res.status(400).json({ message: 'Invalid labour ID' });
//   }

//   try {
//     const success = await labourModel.rejectLabour(id);
//     if (success) {
//       res.json({ success: true, message: 'Labour rejected successfully.' });
//     } else {
//       res.status(404).json({ message: 'Labour not found or already rejected.' });
//     }
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const getApprovedLabours = async (req, res) => {
//   try {
//     const approvedLabours = await labourModel.getApprovedLabours();
//     res.json(approvedLabours);
//   } catch (error) {
//     console.error('Error fetching approved labours:', error.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

// module.exports = {
//   getNextUniqueID,
//   registerData,
//   getAll,
//   getById,
//   update,
//   deleteById,
//   getImagePathsById,
//   search,
//   getAllLabours,
//   approveLabour,
//   rejectLabour,
//   getApprovedLabours,
// };


