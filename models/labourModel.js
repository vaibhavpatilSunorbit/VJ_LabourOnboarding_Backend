const {sql, poolPromise } = require('../config/dbConfig');
const { poolPromise2 } = require('../config/dbConfig2');
const { poolPromise3 } = require('../config/dbConfig3');
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


async function getNextUniqueID() {
    try {
        const pool = await poolPromise;
        
        // Fetch the maximum LabourID while excluding specific IDs
        let lastIDResult = await pool.request().query(`
            SELECT MAX(LabourID) AS lastID 
            FROM labourOnboarding 
            WHERE LabourID NOT IN ('JCO519', 'VJ3893')
        `);

        let initialID = 'JC4008'; // The starting ID
        let nextID = initialID;

        if (lastIDResult.recordset[0].lastID) {
            let lastID = lastIDResult.recordset[0].lastID;

            if (lastID) {
                const numericPart = parseInt(lastID.slice(2)) + 1;
                nextID = `JC${numericPart.toString().padStart(4, '0')}`; // Format to desired ID pattern
            }
        }

        return nextID;
    } catch (error) {
        throw new Error('Error fetching next unique ID');
    }
}



// This code changes on the 24-08-2024  This code working fine

// async function getNextUniqueID() {
//     try {
//         const pool = await poolPromise;
//         let lastIDResult = await pool.request().query('SELECT MAX(LabourID) AS lastID FROM labourOnboarding');

//         let initialID = 'JC4008'; // The starting ID
//         let nextID = initialID;
  
//         if (lastIDResult.recordset[0].lastID) {
//             let lastID = lastIDResult.recordset[0].lastID;

//             // Check if the lastID is the one to ignore
//             if (lastID === 'JCO519') {
//                 // Fetch the next valid last ID
//                 lastIDResult = await pool.request().query("SELECT MAX(LabourID) AS lastID FROM labourOnboarding WHERE LabourID != 'JCO519'");
//                 lastID = lastIDResult.recordset[0].lastID;
//             }

//             if (lastID) {
//                 const numericPart = parseInt(lastID.slice(2)) + 1;
//                 nextID = `JC${numericPart.toString().padStart(4, '0')}`; // Format to desired ID pattern
//             }
//         }

//         return nextID;
//     } catch (error) {
//         throw new Error('Error fetching next unique ID');
//     }
// }




// async function getNextUniqueID() {
//     try {
//       const pool = await poolPromise;
//       const result = await pool.request().query('SELECT MAX(LabourID) AS lastID FROM labourOnboarding');
      
//       let initialID = 'JC4008'; // The starting ID
//       let nextID = initialID;
  
//       if (result.recordset[0].lastID) {
//         const lastID = result.recordset[0].lastID;
//         const numericPart = parseInt(lastID.slice(2)) + 1;
//         nextID = `JC${numericPart.toString().padStart(4, '0')}`; // Format to desired ID pattern
//       }
  
//       return nextID;
//     } catch (error) {
//       throw new Error('Error fetching next unique ID');
//     }
//   }



// async function getNextUniqueID() {
//     try {
//         const pool = await poolPromise3;
//         const query = `
//         Select  TOP 1 [EmployeeCode], CAST(SUBSTRING([EmployeeCode], 3, 6) AS INT) + 1 AS IncrementedValue 
// From Employees   WHERE [EmployeeCode] LIKE 'JC%' 
// AND [EmployeeCode] NOT LIKE 'JCO%' 
// ORDER BY [EmployeeCode] DESC
//         `;
//         const result = await pool.request().query(query);

//         let nextID = 'JC3808'; 

//         if (result.recordset.length > 0) {
//             const incrementedValue = result.recordset[0].IncrementedValue;
//             nextID = `JC${incrementedValue.toString().padStart(4, '0')}`; 
//         }

//         return nextID;
//     } catch (error) {
//         console.error('Error in getNextUniqueID:', error.message);
//         throw new Error('Error fetching next unique ID');
//     }
// }

// async function getNextUniqueID() {
//     try {
//         const pool = await poolPromise3;
//         const query = `
//         SELECT TOP 1 
//         [EmployeeCode], 
//         CAST(SUBSTRING([EmployeeCode], 3, 6) AS INT) + 1 AS IncrementedValue 
//     FROM Employees 
//     WHERE [EmployeeCode] LIKE 'JC%' 
//     AND [EmployeeCode] NOT LIKE 'JCO%'
//     AND ISNUMERIC(SUBSTRING([EmployeeCode], 3, 6)) = 1
//     ORDER BY CAST(SUBSTRING([EmployeeCode], 3, 6) AS INT) DESC
//         `;
//         const result = await pool.request().query(query);

//         let nextID = 'JC0001'; 

//         if (result.recordset.length > 0) {
//             const incrementedValue = result.recordset[0].IncrementedValue;
//             nextID = `JC${incrementedValue.toString().padStart(4, '0')}`; 
//         }

//         return nextID;
//     } catch (error) {
//         console.error('Error in getNextUniqueID:', error.message);
//         throw new Error('Error fetching next unique ID');
//     }
// }


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
        'bankName', 'branch', 'ifscCode', 'contractorName', 'Inducted_By', 'OnboardName', 'title', 
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
        status, isApproved, title, Marital_Status, companyName, Induction_Date, Inducted_By, uploadInductionDoc, OnboardName, ValidTill, location, ConfirmDate, retirementDate, SalaryBu, WorkingBu, CreationDate, businessUnit, departmentId, designationId, labourCategoryId, departmentName) 
        VALUES (
        @LabourID, @labourOwnership, @uploadAadhaarFront, @uploadAadhaarBack, @uploadIdProof, @name, @aadhaarNumber,
        @dateOfBirth, @contactNumber, @gender, @dateOfJoining, @Group_Join_Date, @From_Date, @Period, @address, @pincode, @taluka, @district, @village,
        @state, @emergencyContact, @photoSrc, @bankName, @branch, @accountNumber, @ifscCode, @projectName,
        @labourCategory, @department, @workingHours, @contractorName, @contractorNumber, @designation,
        'Pending', 0, @title, @Marital_Status, @companyName, @Induction_Date, @Inducted_By, @uploadInductionDoc, @OnboardName,  @ValidTill, @location, @ConfirmDate, @retirementDate, @SalaryBu, @WorkingBu, @CreationDate, @businessUnit, @departmentId, @designationId, @labourCategoryId, @departmentName)
      `);
      return result.recordset;
  } catch (error) {
      throw error;
  }
}




async function updateData(labourData) {
    try {
        console.log("labourData:", labourData);

        const pool = await poolPromise;
        const request = pool.request();

        const toUpperCaseFields = [
            'address', 'name', 'taluka', 'district', 'village', 'state',
            'bankName', 'branch', 'ifscCode', 'contractorName', 'Inducted_By', 'OnboardName', 'title', 'Employee_Type'
        ];

        const setInputWithUpperCase = (key, value) => {
            request.input(key, sql.NVarChar, value ? value.toUpperCase() : null);
        };

        // Check if LabourID exists and is correct
        if (!labourData.LabourID) {
            console.error('LabourID is not provided or is null/undefined.');
            return null;
        }

        console.log("Updating LabourID:", labourData.LabourID);
        request.input('LabourID', sql.NVarChar, labourData.LabourID);

        Object.keys(labourData).forEach((key) => {
            if (key !== 'LabourID') {
                if (toUpperCaseFields.includes(key)) {
                    setInputWithUpperCase(key, labourData[key]);
                } else {
                    let sqlType = sql.NVarChar;
                    if (['aadhaarNumber', 'pincode', 'contactNumber'].includes(key)) {
                        sqlType = sql.NVarChar;
                    } else if (['dateOfBirth', 'dateOfJoining', 'Induction_Date', 'ValidTill', 'ConfirmDate', 'retirementDate', 'CreationDate'].includes(key)) {
                        sqlType = sql.DateTime;
                    } else if (['departmentId', 'designationId', 'labourCategoryId'].includes(key)) {
                        sqlType = sql.Int;
                    } else if (key === 'isApproved') {
                        sqlType = sql.Int;
                    }

                    const value = labourData[key] === 'null' ? null : labourData[key];
                    request.input(key, sqlType, value);
                }
            }
        });

        request.input('status', sql.NVarChar, 'Approved');
        request.input('isApproved', sql.Int, 1);

        console.log("Executing SQL Update...");
        const updateResult = await request.query(`
            UPDATE labourOnboarding SET
                labourOwnership = @labourOwnership,
                uploadAadhaarFront = @uploadAadhaarFront,
                uploadAadhaarBack = @uploadAadhaarBack,
                uploadIdProof = @uploadIdProof,
                uploadInductionDoc = @uploadInductionDoc,
                name = @name,
                aadhaarNumber = @aadhaarNumber,
                dateOfBirth = @dateOfBirth,
                contactNumber = @contactNumber,
                gender = @gender,
                dateOfJoining = @dateOfJoining,
                Group_Join_Date = @Group_Join_Date,
                From_Date = @From_Date,
                Period = @Period,
                address = @address,
                pincode = @pincode,
                taluka = @taluka,
                district = @district,
                village = @village,
                state = @state,
                emergencyContact = @emergencyContact,
                photoSrc = @photoSrc,
                bankName = @bankName,
                branch = @branch,
                accountNumber = @accountNumber,
                ifscCode = @ifscCode,
                projectName = @projectName,
                labourCategory = @labourCategory,
                department = @department,
                workingHours = @workingHours,
                contractorName = @contractorName,
                contractorNumber = @contractorNumber,
                designation = @designation,
                title = @title,
                Marital_Status = @Marital_Status,
                companyName = @companyName,
                Induction_Date = @Induction_Date,
                Inducted_By = @Inducted_By,
                OnboardName = @OnboardName,
                ValidTill = @ValidTill,
                location = @location,
                ConfirmDate = @ConfirmDate,
                retirementDate = @retirementDate,
                SalaryBu = @SalaryBu,
                WorkingBu = @WorkingBu,
                CreationDate = @CreationDate,
                businessUnit = @businessUnit,
                departmentId = @departmentId,
                designationId = @designationId,
                labourCategoryId = @labourCategoryId,
                departmentName = @departmentName,
                status = @status,
                isApproved = @isApproved
            WHERE LabourID = @LabourID
        `);

        if (updateResult.rowsAffected[0] === 0) {
            console.warn("No rows were updated, check LabourID or other conditions.");
            return null;
        }

        console.log("Update successful:", updateResult.rowsAffected[0], "rows updated.");

        // Fetch the updated record to return it
        const fetchResult = await request.query(`
            SELECT * FROM labourOnboarding WHERE LabourID = @LabourID
        `);

        return fetchResult.recordset[0];  // Return the first row of the updated data
    } catch (error) {
        console.error('Error updating data:', error);
        throw error;
    }
}









async function registerDataUpdate(labourData) {
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
          'bankName', 'branch', 'ifscCode', 'contractorName', 'Inducted_By', 'OnboardName', 'title', 
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
          status, isApproved, title, Marital_Status, companyName, Induction_Date, Inducted_By, uploadInductionDoc, OnboardName, ValidTill, location, ConfirmDate, retirementDate, SalaryBu, WorkingBu, CreationDate, businessUnit, departmentId, designationId, labourCategoryId, departmentName) 
          VALUES (
          @LabourID, @labourOwnership, @uploadAadhaarFront, @uploadAadhaarBack, @uploadIdProof, @name, @aadhaarNumber,
          @dateOfBirth, @contactNumber, @gender, @dateOfJoining, @Group_Join_Date, @From_Date, @Period, @address, @pincode, @taluka, @district, @village,
          @state, @emergencyContact, @photoSrc, @bankName, @branch, @accountNumber, @ifscCode, @projectName,
          @labourCategory, @department, @workingHours, @contractorName, @contractorNumber, @designation,
          'Pending', 0, @title, @Marital_Status, @companyName, @Induction_Date, @Inducted_By, @uploadInductionDoc, @OnboardName,  @ValidTill, @location, @ConfirmDate, @retirementDate, @SalaryBu, @WorkingBu, @CreationDate, @businessUnit, @departmentId, @designationId, @labourCategoryId, @departmentName)
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
        const result = await pool.request().query('SELECT * FROM labourOnboarding ORDER BY LabourID');
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


// async function update(id, updatedData) {
//     try {
//         // Check if updatedData is provided and is not empty
//         if (!updatedData || typeof updatedData !== 'object' || Object.keys(updatedData).length === 0) {
//             throw new Error('Updated data is required and should not be empty or invalid.');
//         }

//         // console.log('Received updatedData:', updatedData);  

//         const pool = await poolPromise;
//         const request = pool.request().input('id', sql.Int, id);
//         let updateQuery = 'UPDATE labourOnboarding SET ';

//         const columns = [
//             'labourOwnership', 'uploadAadhaarFront', 'uploadAadhaarBack', 'name',
//             'aadhaarNumber', 'dateOfBirth', 'contactNumber', 'gender',
//             'dateOfJoining', 'address', 'pincode', 'taluka', 'district',
//             'village', 'state', 'emergencyContact', 'bankName',
//             'branch', 'accountNumber', 'ifscCode', 'projectName', 'labourCategory',
//             'department', 'workingHours', 'contractorName', 'contractorNumber', 'designation', 'title', 'Nationality', 'Marital_Status',
//             'Payment_Mode', 'companyName', 'Employee_Type', 'Current_Status',
//             'Seating_Office', 'Period', 'From_Date', 'Group_Join_Date',
//             'Reject_Reason', 'Inducted_By', 'Induction_Date', 'ValidTill', 'location',
//             'OnboardName', 'expiryDate', 'CalenderType', 'ConfirmDate',
//             'retirementDate', 'SalaryBu', 'WorkingBu', 'CreationDate', 'businessUnit',
//             'departmentId', 'designationId', 'LedgerId', 'GradeId', 'labourCategoryId',
//             'empId', 'departmentName'
//         ];

//         const integerFields = [
//             'projectName', 'IsApproved', 'departmentId', 'designationId',
//             'LedgerId', 'GradeId', 'labourCategoryId', 'CalenderType'
//         ];

//         const uppercaseFields = [
//             'labourOwnership', 'name', 'gender', 'address', 'taluka', 'district',
//             'village', 'state', 'bankName', 'branch', 'accountNumber', 'ifscCode',
//             'labourCategory', 'workingHours', 'contractorName', 'designation', 'title',
//             'Nationality', 'Marital_Status', 'Payment_Mode', 'companyName', 'contractorNumber',
//             'Employee_Type', 'Current_Status', 'Seating_Office',
//             'Inducted_By', 'location', 'OnboardName', 'SalaryBu', 'WorkingBu',
//             'businessUnit', 'departmentName'
//         ];

//         let hasValidColumns = false;

//         columns.forEach((column, index) => {
//             if (updatedData.hasOwnProperty(column)) {
//                 let value = updatedData[column];

//                 // Convert 'null' string or empty string to actual null
//                 if (value === 'null' || value === '') {
//                     value = null;
//                 }

//                 // Convert strings that should be integers to actual integers
//                 if (integerFields.includes(column)) {
//                     if (value !== null) {
//                         value = parseInt(value, 10);
//                         if (isNaN(value)) {
//                             throw new Error(`Invalid integer format for ${column}: ${updatedData[column]}`);
//                         }
//                     }
//                  } else if (typeof value === 'string' && uppercaseFields.includes(column)) {
//                     value = value.toUpperCase();  // Convert specific strings to uppercase
//                 }

//                 // Convert date strings to proper date format
//                 if (['dateOfBirth', 'dateOfJoining', 'From_Date', 'Group_Join_Date', 'Induction_Date', 'ValidTill', 'ConfirmDate', 'retirementDate', 'CreationDate'].includes(column)) {
//                     if (value) {
//                         const dateValue = new Date(value);
//                         if (isNaN(dateValue.getTime())) {
//                             throw new Error(`Invalid date format for ${column}: ${value}`);
//                         }
//                         value = dateValue.toISOString().split('T')[0]; // Convert to 'YYYY-MM-DD'
//                     } else {
//                         value = null;
//                     }
//                 }

//                 // Log the value and type being set for debugging
//                 console.log(`Setting parameter ${index}:`, { value, type: typeof value });

//                 // Check if the value is a valid string before adding it as a parameter
//                 if (typeof value === 'string' && value.trim() === '') {
//                     throw new Error(`Invalid string format for ${column}: empty or whitespace string.`);
//                 }

//                 // Add the column to the update query
//                 updateQuery += `${column} = @param${index}, `;
//                 request.input(`param${index}`, value);
//                 hasValidColumns = true;
//             }
//         });

//         if (!hasValidColumns) {
//             throw new Error('No valid columns provided to update.');
//         }

//     // Set status and IsApproved based on the presence of LabourID
//     if (updatedData.LabourID && typeof updatedData.LabourID === 'string' && updatedData.LabourID.trim() !== '' && updatedData.LabourID !== 'null') {
//         // LabourID is a non-empty string and not explicitly 'null'
//         console.log("LabourID is present:", updatedData.LabourID);  // Debugging output
//         updateQuery += "status = @status, IsApproved = @IsApproved WHERE id = @id";
//         request.input('status', 'Approved');  // Set status to 'Approved'
//         request.input('IsApproved', 1);       // Set IsApproved to 1
//     } else {
//         // LabourID is null, undefined, an empty string, or explicitly the string 'null'
//         console.log("LabourID is null, undefined, or an empty string:", updatedData.LabourID);  // Debugging output
//         updateQuery += "status = @status, IsApproved = @IsApproved WHERE id = @id";
//         request.input('status', 'Pending');   // Set status to 'Pending'
//         request.input('IsApproved', 0);       // Set IsApproved to 0
//     }


//         const result = await request.query(updateQuery);
//         return result.rowsAffected[0];
//     } catch (error) {
//         console.error('Error in update function:', error);
//         throw error;
//     }
// }


async function updateLabour(id, updatedData) {
    try {
        const pool = await poolPromise;
        const request = pool.request().input('id', sql.Int, id);
        let updateQuery = 'UPDATE labourOnboarding SET ';

        Object.keys(updatedData).forEach((key, index) => {
            // Skip 'id' and 'LabourID' columns to not update them
            if (key !== 'id' && key !== 'LabourID') {
                updateQuery += `${key} = @param${index}, `;
                request.input(`param${index}`, updatedData[key]);
            }
        });

        // Remove the trailing comma and space, add WHERE clause
        updateQuery = updateQuery.slice(0, -2) + ' WHERE id = @id';
        
        const result = await request.query(updateQuery);
        return result.rowsAffected[0];
    } catch (error) {
        throw error;
    }
}

// async function updateLabour(id, updatedData) {
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
            .query('SELECT * FROM labourOnboarding WHERE name LIKE @query OR aadhaarNumber LIKE @query OR LabourID LIKE @query OR OnboardName LIKE @query');
        return result.recordset;
    } catch (error) {
        throw error;
    }
}


async function getAllLabours() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Labour order by LabourID");
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
            .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1, LabourID = @LabourID WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");
        
        console.log('Database update result:', result);

        if (result.rowsAffected[0] > 0) {
            const approvedResult = await pool.request()
                .input('id', sql.Int, id)
                .query("SELECT * FROM labourOnboarding WHERE id = @id AND status = 'Approved'");
            
            return approvedResult.recordset[0];
        } else {
            return null;
        }
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
    // update,
    deleteById,
    getImagePathsById,
    search,
    getAllLabours,
    approveLabour,
    rejectLabour,
    getApprovedLabours,
    resubmit,
    getLabourByAadhaar,  // Add this
    getFormDataByAadhaar,
    updateLabour,
    registerDataUpdate,
    updateData
    // updateLabour
};