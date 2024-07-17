
const {sql, poolPromise } = require('../config/dbConfig');
// const sql = require('mssql');


async function checkAadhaarExists(aadhaarNumber) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('aadhaarNumber', aadhaarNumber)
            .query('SELECT LabourID, status, isApproved FROM labourOnboarding WHERE aadhaarNumber = @aadhaarNumber');
            return result.recordset.length > 0 ? result.recordset[0] : null;
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
      
    //   request.input('LabourID', sql.VarChar, labourData.LabourID);
    //   request.input('location', labourData.location);
      
    //   Object.keys(labourData).forEach((key, index) => {
    //       if (key !== 'LabourID' && key !== 'location') {
    //           request.input(key, sql.VarChar, labourData[key]);
    //       }
    //   });


    const toUpperCaseFields = [
        'address', 'name', 'taluka', 'district', 'village', 'state', 
        'bankName', 'branch', 'ifscCode', 'contractorName', 'Inducted_By', 'OnboardName', 'title', 'Period', 
      ];
  
      // Helper function to set input with uppercase conversion
      const setInputWithUpperCase = (key, value) => {
        request.input(key, sql.VarChar, value ? value.toUpperCase() : '');
      };
  
      request.input('LabourID', sql.VarChar, labourData.LabourID);
      request.input('location', sql.VarChar, labourData.location);
  
      Object.keys(labourData).forEach((key) => {
        if (key !== 'LabourID' && key !== 'location') {
          if (toUpperCaseFields.includes(key)) {
            setInputWithUpperCase(key, labourData[key]);
          } else {
            request.input(key, sql.VarChar, labourData[key]);
          }
        }
      });

      const result = await request.query(`
      INSERT INTO labourOnboarding (
        LabourID, labourOwnership, uploadAadhaarFront, uploadAadhaarBack, uploadIdProof, name, aadhaarNumber,
        dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date, From_Date, Period, address, pincode, taluka, district, village,
        state, emergencyContact, photoSrc, bankName, branch, accountNumber, ifscCode, projectName, 
        labourCategory, department, workingHours, contractorName, contractorNumber, designation,
        status, isApproved, title, Marital_Status, companyName, Induction_Date, Inducted_By, uploadInductionDoc, OnboardName, ValidTill, location) 
        VALUES (
        @LabourID, @labourOwnership, @uploadAadhaarFront, @uploadAadhaarBack, @uploadIdProof, @name, @aadhaarNumber,
        @dateOfBirth, @contactNumber, @gender, @dateOfJoining, @Group_Join_Date, @From_Date, @Period, @address, @pincode, @taluka, @district, @village,
        @state, @emergencyContact, @photoSrc, @bankName, @branch, @accountNumber, @ifscCode, @projectName,
        @labourCategory, @department, @workingHours, @contractorName, @contractorNumber, @designation,
        'Pending', 0, @title, @Marital_Status, @companyName, @Induction_Date, @Inducted_By, @uploadInductionDoc, @OnboardName,  @ValidTill, @location)
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
// async function update(id, updatedData) {
//     try {
//         const pool = await poolPromise;
//         const request = pool.request().input('id', sql.Int, id);
//         let updateQuery = 'UPDATE labourOnboarding SET ';

//         Object.keys(updatedData).forEach((key, index) => {
//             updateQuery += `${key} = @param${index}, `;
//             request.input(`param${index}`, sql.VarChar, updatedData[key]);
//         });

//         updateQuery = updateQuery.slice(0, -2) + ' WHERE id = @id';
//         const result = await request.query(updateQuery);
//         return result.rowsAffected[0];
//     } catch (error) {
//         throw error;
//     }
// }
async function update(id, updatedData) {
    try {
        const pool = await poolPromise;
        const request = pool.request().input('id', sql.Int, id);
        let updateQuery = 'UPDATE labourOnboarding SET ';

        Object.keys(updatedData).forEach((key, index) => {
            if (key !== 'id') {  // Skip the 'id' column
                updateQuery += `${key} = @param${index}, `;
                request.input(`param${index}`, updatedData[key]);
            }
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
            .query('SELECT * FROM labourOnboarding WHERE name LIKE @query OR aadhaarNumber LIKE @query OR LabourID LIKE @query');
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

async function approveLabour(id, nextID) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('LabourID', sql.VarChar, nextID)
            // .input('OnboardName', sql.VarChar, onboardName) 
            // .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1 WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");
            .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1, LabourID = @LabourID WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");
            // .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1, LabourID = @LabourID, OnboardName = @OnboardName WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");

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
            .input('status', sql.VarChar, 'Resubmitted')
            .input('isApproved', sql.Int, 3);

        const result = await request.query('UPDATE labourOnboarding SET status = @status, isApproved = @isApproved WHERE id = @id');
        return result.rowsAffected[0];
    } catch (error) {
        throw error;
    }
}

async function getLabourByAadhaar(aadhaarNumber) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('aadhaarNumber',  aadhaarNumber)
            .query('SELECT * FROM labourOnboarding WHERE aadhaarNumber = @aadhaarNumber');
        return result.recordset[0];
    } catch (error) {
        console.error('Error fetching labour by Aadhaar:', error);
        throw error;
    }
}

// Function to get form data by Aadhaar number
async function getFormDataByAadhaar(aadhaarNumber) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('aadhaarNumber', aadhaarNumber)
            .query('SELECT * FROM labourOnboarding WHERE aadhaarNumber = @aadhaarNumber');
        return result.recordset[0];
    } catch (error) {
        console.error('Error fetching form data by Aadhaar:', error);
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
    resubmit,
    getLabourByAadhaar,  // Add this
    getFormDataByAadhaar
};


















// imp code changes 16-07-2024



// const {sql, poolPromise } = require('../config/dbConfig');
// // const sql = require('mssql');


// async function checkAadhaarExists(aadhaarNumber) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('aadhaarNumber', aadhaarNumber)
//             .query('SELECT LabourID, status, isApproved FROM labourOnboarding WHERE aadhaarNumber = @aadhaarNumber');
//             return result.recordset.length > 0 ? result.recordset[0] : null;
//     } catch (error) {
//         console.error('Error checking Aadhaar number:', error);
//         throw new Error('Error checking Aadhaar number');
//     }
// }


// // Function to get the next unique ID
// async function getNextUniqueID() {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request().query('SELECT MAX(LabourID) AS lastID FROM labourOnboarding');
//         let  nextID = 'JC3615'; // Default starting ID if no records exist

//         if (result.recordset[0].lastID) {
//             const lastID = result.recordset[0].lastID;
//             // console.log("lastId",lastID)
//             const numericPart = parseInt(lastID.slice(2)) + 1; 
//             console.log("numericPart",numericPart)
//             nextID = `JC${numericPart.toString().padStart(4, '0')}`; // Format to desired ID pattern
//         }

//         return nextID;
//     } catch (error) {
//         throw new Error('Error fetching next unique ID');
//     }
// }

// // Function to register data
// async function registerData(labourData) {
//   try {
//       const pool = await poolPromise;
//       const request = pool.request();
//       request.input('LabourID', sql.VarChar, labourData.LabourID);
      
//       Object.keys(labourData).forEach((key, index) => {
//           if (key !== 'LabourID') {
//               request.input(key, sql.VarChar, labourData[key]);
//           }
//       });

//       const result = await request.query(`
//       INSERT INTO labourOnboarding (
//         LabourID, labourOwnership, uploadAadhaarFront, uploadAadhaarBack, uploadIdProof, name, aadhaarNumber,
//         dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date, From_Date, Period, address, pincode, taluka, district, village,
//         state, emergencyContact, photoSrc, bankName, branch, accountNumber, ifscCode, projectName, 
//         labourCategory, department, workingHours, contractorName, contractorNumber, designation,
//         status, isApproved, title, Marital_Status, companyName, Induction_Date, Inducted_By, uploadInductionDoc, OnboardName) 
//         VALUES (
//         @LabourID, @labourOwnership, @uploadAadhaarFront, @uploadAadhaarBack, @uploadIdProof, @name, @aadhaarNumber,
//         @dateOfBirth, @contactNumber, @gender, @dateOfJoining, @Group_Join_Date, @From_Date, @Period, @address, @pincode, @taluka, @district, @village,
//         @state, @emergencyContact, @photoSrc, @bankName, @branch, @accountNumber, @ifscCode, @projectName,
//         @labourCategory, @department, @workingHours, @contractorName, @contractorNumber, @designation,
//         'Pending', 0, @title, @Marital_Status, @companyName, @Induction_Date, @Inducted_By, @uploadInductionDoc, @OnboardName)
//       `);
//       return result.recordset;
//   } catch (error) {
//       throw error;
//   }
// }


// // Function to get all records
// async function getAll() {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request().query('SELECT * FROM labourOnboarding');
//         return result.recordset;
//     } catch (error) {
//         throw error;
//     }
// }

// // Function to get a record by ID
// async function getById(id) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .query('SELECT * FROM labourOnboarding WHERE id = @id');
//         return result.recordset[0];
//     } catch (error) {
//         throw error;
//     }
// }

// // Function to update a record
// // async function update(id, updatedData) {
// //     try {
// //         const pool = await poolPromise;
// //         const request = pool.request().input('id', sql.Int, id);
// //         let updateQuery = 'UPDATE labourOnboarding SET ';

// //         Object.keys(updatedData).forEach((key, index) => {
// //             updateQuery += `${key} = @param${index}, `;
// //             request.input(`param${index}`, sql.VarChar, updatedData[key]);
// //         });

// //         updateQuery = updateQuery.slice(0, -2) + ' WHERE id = @id';
// //         const result = await request.query(updateQuery);
// //         return result.rowsAffected[0];
// //     } catch (error) {
// //         throw error;
// //     }
// // }
// async function update(id, updatedData) {
//     try {
//         const pool = await poolPromise;
//         const request = pool.request().input('id', sql.Int, id);
//         let updateQuery = 'UPDATE labourOnboarding SET ';

//         Object.keys(updatedData).forEach((key, index) => {
//             if (key !== 'id') {  // Skip the 'id' column
//                 updateQuery += `${key} = @param${index}, `;
//                 request.input(`param${index}`, updatedData[key]);
//             }
//         });

//         updateQuery = updateQuery.slice(0, -2) + ' WHERE id = @id';
//         const result = await request.query(updateQuery);
//         return result.rowsAffected[0];
//     } catch (error) {
//         throw error;
//     }
// }

// // Function to delete a record by ID
// async function deleteById(id) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .query('DELETE FROM labourOnboarding WHERE id = @id');
//         return result.rowsAffected[0];
//     } catch (error) {
//         throw error;
//     }
// }

// // Function to get image paths by ID
// async function getImagePathsById(id) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .query('SELECT uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof, uploadInductionDoc FROM labourOnboarding WHERE id = @id');
//         return result.recordset[0];
//     } catch (error) {
//         throw error;
//     }
// }

// // Function to search records
// async function search(query) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('query', sql.NVarChar, `%${query}%`)
//             .query('SELECT * FROM labourOnboarding WHERE name LIKE @query OR aadhaarNumber LIKE @query');
//         return result.recordset;
//     } catch (error) {
//         throw error;
//     }
// }


// async function getAllLabours() {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request().query("SELECT * FROM Labour");
//         return result.recordset;
//     } catch (error) {
//         console.error("Error in getAllLabours:", error);
//         throw error;
//     }
// }

// async function approveLabour(id, nextID) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .input('LabourID', sql.VarChar, nextID)
//             // .input('OnboardName', sql.VarChar, onboardName) 
//             // .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1 WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");
//             .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1, LabourID = @LabourID WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");
//             // .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1, LabourID = @LabourID, OnboardName = @OnboardName WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");

//             console.log('Database update result:', result);

//         return result.rowsAffected[0] > 0;
//     } catch (error) {
//         console.error("Error in approveLabour:", error);
//         throw error;
//     }
// }

// async function rejectLabour(id, rejectReason) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .input('Reject_Reason', sql.VarChar, rejectReason)
//             // .query("UPDATE labourOnboarding SET status = 'Rejected', isApproved = 2 WHERE id = @id AND (status = 'Pending' OR status = 'Approved')");
//             .query('UPDATE labourOnboarding SET status = \'Rejected\', isApproved = 2, Reject_Reason = @Reject_Reason WHERE id = @id AND (status = \'Pending\' OR status = \'Approved\')');

//         return result.rowsAffected[0] > 0;
//     } catch (error) {
//         console.error("Error in rejectLabour:", error);
//         throw error;
//     }
// }



// // Function to get all approved labours
// async function getApprovedLabours() {
//   try {
//       const pool = await poolPromise;
//       const result = await pool.request()
//           .query('SELECT * FROM labourOnboarding WHERE isApproved = 1');
//       return result.recordset;
//   } catch (error) {
//       throw error;
//   }
// }

// async function resubmit(id) {
//     try {
//         const pool = await poolPromise;
//         const request = pool.request()
//             .input('id', sql.Int, id)
//             .input('status', sql.VarChar, 'Resubmitted')
//             .input('isApproved', sql.Int, 3);

//         const result = await request.query('UPDATE labourOnboarding SET status = @status, isApproved = @isApproved WHERE id = @id');
//         return result.rowsAffected[0];
//     } catch (error) {
//         throw error;
//     }
// }

// async function getLabourByAadhaar(aadhaarNumber) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('aadhaarNumber',  aadhaarNumber)
//             .query('SELECT * FROM labourOnboarding WHERE aadhaarNumber = @aadhaarNumber');
//         return result.recordset[0];
//     } catch (error) {
//         console.error('Error fetching labour by Aadhaar:', error);
//         throw error;
//     }
// }

// // Function to get form data by Aadhaar number
// async function getFormDataByAadhaar(aadhaarNumber) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('aadhaarNumber', aadhaarNumber)
//             .query('SELECT * FROM labourOnboarding WHERE aadhaarNumber = @aadhaarNumber');
//         return result.recordset[0];
//     } catch (error) {
//         console.error('Error fetching form data by Aadhaar:', error);
//         throw error;
//     }
// }
// module.exports = {
//     checkAadhaarExists,
//     getNextUniqueID,
//     registerData,
//     getAll,
//     getById,
//     update,
//     deleteById,
//     getImagePathsById,
//     search,
//     getAllLabours,
//     approveLabour,
//     rejectLabour,
//     getApprovedLabours,
//     resubmit,
//     getLabourByAadhaar,  // Add this
//     getFormDataByAadhaar
// };





