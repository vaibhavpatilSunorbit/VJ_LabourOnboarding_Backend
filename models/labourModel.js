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
        'bankName', 'branch', 'ifscCode', 'contractorName', 'Inducted_By','OnboardName', 'title', 
      ];
  
      const setInputWithUpperCase = (key, value) => {
        const valueAsString = value ? String(value) : '';
        request.input(key, sql.VarChar, valueAsString ? valueAsString.toUpperCase() : '');
      };
  
      request.input('LabourID', sql.VarChar, labourData.LabourID);
      request.input('location', sql.VarChar, labourData.location);

      const finalOnboardName = labourData.OnboardName ? labourData.OnboardName : ''; // Fallback to empty string if undefined
      labourData.OnboardName = finalOnboardName;
  
      Object.keys(labourData).forEach((key) => {
        if (key !== 'LabourID' && key !== 'location') {
          if (toUpperCaseFields.includes(key)) {
            setInputWithUpperCase(key, labourData[key]);
          } else {
            request.input(key, sql.VarChar, labourData[key]);
          }
        }
      });

      console.log('Inserting data into database for OnboardName:', labourData.OnboardName);
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
      console.log('Data successfully inserted for OnboardName:', labourData.OnboardName);
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

        // const setInputWithUpperCase = (key, value) => {
        //     request.input(key, sql.NVarChar, value ? value.toUpperCase() : null);
        // };
        const setInputWithUpperCase = (key, value) => {
            const valueAsString = value ? String(value) : '';
            request.input(key, sql.VarChar, valueAsString ? valueAsString.toUpperCase() : '');
          };

        // Check if LabourID exists and is correct
        if (!labourData.LabourID) {
            console.error('LabourID is not provided or is null/undefined.');
            return null;
        }

        console.log("Updating LabourID:", labourData.LabourID);
        request.input('LabourID', sql.NVarChar, labourData.LabourID);

        const finalOnboardName = labourData.OnboardName ? labourData.OnboardName : ''; // Fallback to empty string if undefined
      labourData.OnboardName = finalOnboardName;

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
        console.log('Data successfully inserted for OnboardName Edit button:', labourData.OnboardName);
        return fetchResult.recordset[0];  // Return the first row of the updated data
    } catch (error) {
        console.error('Error updating data:', error);
        throw error;
    }
}













async function updateDataDisableStatus(labourData) {
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
        // const setInputWithUpperCase = (key, value) => {
        //   request.input(key, sql.VarChar, value ? value.toUpperCase() : '');
        // };

        const setInputWithUpperCase = (key, value) => {
            const valueAsString = value ? String(value) : '';
            request.input(key, sql.VarChar, valueAsString ? valueAsString.toUpperCase() : '');
          };
    
        request.input('LabourID', sql.VarChar, labourData.LabourID);
        request.input('location', sql.VarChar, labourData.location);

        const finalOnboardName = labourData.OnboardName ? labourData.OnboardName : ''; // Fallback to empty string if undefined
        labourData.OnboardName = finalOnboardName;
    
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
        console.log('Data successfully inserted for OnboardName Resubmmit button:', labourData.OnboardName);
        return result.recordset;
    } catch (error) {
        throw error;
    };
};
    // try {
    //     console.log("labourData:", labourData);

    //     const pool = await poolPromise;
    //     const request = pool.request();

    //     const toUpperCaseFields = [
    //         'address', 'name', 'taluka', 'district', 'village', 'state',
    //         'bankName', 'branch', 'ifscCode', 'contractorName', 'Inducted_By', 'OnboardName', 'title', 'Employee_Type'
    //     ];

    //     const setInputWithUpperCase = (key, value) => {
    //         const valueAsString = value ? String(value) : '';
    //         request.input(key, sql.VarChar, valueAsString ? valueAsString.toUpperCase() : '');
    //     };

    //     // Check if LabourID exists and is correct
    //     // if (!labourData.LabourID) {
    //     //     console.error('LabourID is not provided or is null/undefined.');
    //     //     return null;
    //     // }

    //     // console.log("Updating LabourID:", labourData.LabourID);
    //     // request.input('LabourID', sql.NVarChar, labourData.LabourID);

    //     const finalOnboardName = labourData.OnboardName ? labourData.OnboardName : ''; // Fallback to empty string if undefined
    //     labourData.OnboardName = finalOnboardName;

    //     // New Logic: Check labourStatus to set LabourID, status, empId, and isApproved fields
    //     // if (labourData.status === 'Disable' && labourData.isApproved == 4) {
    //     //     console.log('Labour is disabled and approved. Setting status to Pending, isApproved to 0, and LabourID to NULL');
            
    //     //     // Update fields
    //     //     labourData.LabourID = null; // Set LabourID to null
    //     //     labourData.status = 'Pending'; // Set status to Pending
    //     //     labourData.isApproved = 0; // Set isApproved to 0
    //     // } else {
    //     //     return { error: 'Labour is not in disabled state or approval status is not 4' };
    //     // }
    //     labourData.status = labourData.status || 'Pending';  // Set status to Pending if undefined
    //     labourData.isApproved = labourData.isApproved || 0;  // Set isApproved to 0 if undefined
    //     labourData.LabourID = labourData.LabourID === 'Disable' ? null : labourData.LabourID;

    //     // const labourStatus = labourData.status || 'Pending';

    //     Object.keys(labourData).forEach((key) => {
    //         if (key !== 'LabourID' && key !== 'status' && key !== 'isApproved') {
    //             if (toUpperCaseFields.includes(key)) {
    //                 setInputWithUpperCase(key, labourData[key]);
    //             } else {
    //                 let sqlType = sql.NVarChar;
    //                 if (['aadhaarNumber', 'pincode', 'contactNumber'].includes(key)) {
    //                     sqlType = sql.NVarChar;
    //                 } else if (['dateOfBirth', 'dateOfJoining', 'Induction_Date', 'ValidTill', 'ConfirmDate', 'retirementDate', 'CreationDate'].includes(key)) {
    //                     sqlType = sql.DateTime;
    //                 } else if (['departmentId', 'designationId', 'labourCategoryId'].includes(key)) {
    //                     sqlType = sql.Int;
    //                 } 

    //                 const value = labourData[key] === 'null' ? null : labourData[key];
    //                 request.input(key, sqlType, value);
    //             }
    //         }
    //     });

    //     request.input('status', sql.VarChar, labourData.status)
    //            .input('isApproved', sql.Int, labourData.isApproved)
    //            .input('LabourID', sql.NVarChar, labourData.LabourID);

    //     console.log("Executing SQL Update...");
    //     const updateResult = await request.query(`
    //         UPDATE labourOnboarding SET
    //             labourOwnership = @labourOwnership,
    //             uploadAadhaarFront = @uploadAadhaarFront,
    //             uploadAadhaarBack = @uploadAadhaarBack,
    //             uploadIdProof = @uploadIdProof,
    //             uploadInductionDoc = @uploadInductionDoc,
    //             name = @name,
    //             aadhaarNumber = @aadhaarNumber,
    //             dateOfBirth = @dateOfBirth,
    //             contactNumber = @contactNumber,
    //             gender = @gender,
    //             dateOfJoining = @dateOfJoining,
    //             Group_Join_Date = @Group_Join_Date,
    //             From_Date = @From_Date,
    //             Period = @Period,
    //             address = @address,
    //             pincode = @pincode,
    //             taluka = @taluka,
    //             district = @district,
    //             village = @village,
    //             state = @state,
    //             emergencyContact = @emergencyContact,
    //             photoSrc = @photoSrc,
    //             bankName = @bankName,
    //             branch = @branch,
    //             accountNumber = @accountNumber,
    //             ifscCode = @ifscCode,
    //             projectName = @projectName,
    //             labourCategory = @labourCategory,
    //             department = @department,
    //             workingHours = @workingHours,
    //             contractorName = @contractorName,
    //             contractorNumber = @contractorNumber,
    //             designation = @designation,
    //             title = @title,
    //             Marital_Status = @Marital_Status,
    //             companyName = @companyName,
    //             Induction_Date = @Induction_Date,
    //             Inducted_By = @Inducted_By,
    //             OnboardName = @OnboardName,
    //             ValidTill = @ValidTill,
    //             location = @location,
    //             ConfirmDate = @ConfirmDate,
    //             retirementDate = @retirementDate,
    //             SalaryBu = @SalaryBu,
    //             WorkingBu = @WorkingBu,
    //             CreationDate = @CreationDate,
    //             businessUnit = @businessUnit,
    //             departmentId = @departmentId,
    //             designationId = @designationId,
    //             labourCategoryId = @labourCategoryId,
    //             departmentName = @departmentName,
    //             status = @status,
    //             isApproved = @isApproved
    //         WHERE LabourID IS NULL
    //     `);

    //     if (updateResult.rowsAffected[0] === 0) {
    //         console.warn("No rows were updated, check LabourID or other conditions.");
    //         return null;
    //     }

    //     console.log("Update successful:", updateResult.rowsAffected[0], "rows updated.");
    //     return updateResult;
    //     // Fetch the updated record to return it
    //     // Return the first row of the updated data
    // } catch (error) {
    //     console.error('Error updating data:', error);
    //     throw error;
    // }
// };







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
        // const setInputWithUpperCase = (key, value) => {
        //   request.input(key, sql.VarChar, value ? value.toUpperCase() : '');
        // };

        const setInputWithUpperCase = (key, value) => {
            const valueAsString = value ? String(value) : '';
            request.input(key, sql.VarChar, valueAsString ? valueAsString.toUpperCase() : '');
          };
    
        request.input('LabourID', sql.VarChar, labourData.LabourID);
        request.input('location', sql.VarChar, labourData.location);

        const finalOnboardName = labourData.OnboardName ? labourData.OnboardName : ''; // Fallback to empty string if undefined
        labourData.OnboardName = finalOnboardName;
    
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
        console.log('Data successfully inserted for OnboardName Resubmmit button:', labourData.OnboardName);
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
        const now = new Date();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('LabourID', sql.VarChar, nextID)
            .input('ApproveLabourDate', sql.DateTime, now)
            .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1, LabourID = @LabourID, ApproveLabourDate = @ApproveLabourDate WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");
        
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



async function rejectLabour(id, rejectReason) {
    try {
        const pool = await poolPromise;
        const now = new Date();
        const labour = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM labourOnboarding WHERE id = @id');
        
        if (labour.recordset.length === 0) {
            return false; // labour not found
        }
        
        const labourData = labour.recordset[0];

        // Update the labour status
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('Reject_Reason', sql.VarChar, rejectReason)
            .input('RejectLabourDate', sql.DateTime, now)
            .query('UPDATE labourOnboarding SET status = \'Rejected\', isApproved = 2, Reject_Reason = @Reject_Reason, RejectLabourDate = @RejectLabourDate WHERE id = @id AND (status = \'Pending\' OR status = \'Approved\')');

        // Insert into RejectLabours table
        await pool.request()
            .input('userId', sql.Int, labourData.id)
            .input('name', sql.VarChar, labourData.name)
            .input('status', sql.VarChar, 'Rejected')
            .input('Reject_Reason', sql.VarChar, rejectReason)
            .input('OnboardName', sql.VarChar, labourData.OnboardName)
            .input('aadhaarNumber', sql.VarChar, labourData.aadhaarNumber)
            .input('isApproved', sql.Int, 2) // isApproved is 2 for rejected
            .query('INSERT INTO RejectLabours (userId, name, status, Reject_Reason, OnboardName, aadhaarNumber, isApproved) VALUES (@userId, @name, @status, @Reject_Reason, @OnboardName, @aadhaarNumber, @isApproved)');

        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error("Error in rejectLabour:", error);
        throw error;
    }
};



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


// This Below resubmit code WITH any status === Disable logic
async function resubmit(id) {
    try {
      const pool = await poolPromise;
      const now = new Date();
      const labour = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT * FROM labourOnboarding WHERE id = @id');
      
      if (labour.recordset.length === 0) {
        return 0; // labour not found
      }
  
      const labourData = labour.recordset[0];
      let rejectReason = labourData.Reject_Reason || "This labour attendance is older than 15 days or not present";
  
      // Update the labour status only if it's not 'Disable'
      if (labourData.status !== 'Disable') {
        await pool.request()
          .input('id', sql.Int, id)
          .input('status', sql.VarChar, 'Resubmitted')
          .input('isApproved', sql.Int, 3)
          .input('ResubmitLabourDate', sql.DateTime, now)
          .query('UPDATE labourOnboarding SET status = @status, isApproved = @isApproved, ResubmitLabourDate = @ResubmitLabourDate WHERE id = @id');
      }
  
      // Insert into RejectLabours table
      await pool.request()
        .input('userId', sql.Int, labourData.id)
        .input('name', sql.VarChar, labourData.name)
        // .input('status', sql.VarChar, labourData.status === 'Disable' ? 'Disable' : 'Resubmitted')
        .input('status', sql.VarChar, 'Resubmitted')
        .input('Reject_Reason', sql.VarChar, rejectReason) // might be empty on resubmission
        .input('OnboardName', sql.VarChar, labourData.OnboardName)
        .input('aadhaarNumber', sql.VarChar, labourData.aadhaarNumber)
        // .input('isApproved', sql.Int, labourData.status === 'Disable' ? labourData.isApproved : 3) // isApproved is 3 for resubmitted
        .input('isApproved', sql.Int, 3)
        .query('INSERT INTO RejectLabours (userId, name, status, Reject_Reason, OnboardName, aadhaarNumber, isApproved) VALUES (@userId, @name, @status, @Reject_Reason, @OnboardName, @aadhaarNumber, @isApproved)');
  
      return labour.recordset[0];
    } catch (error) {
      console.error("Error in resubmitLabour:", error);
      throw error;
    }
  };


// This Below resubmit code without any status === Disable logic
// async function resubmit(id) {
//     try {
//         const pool = await poolPromise;
//       const now = new Date();
//         const labour = await pool.request()
//             .input('id', sql.Int, id)
//             .query('SELECT * FROM labourOnboarding WHERE id = @id');
        
//         if (labour.recordset.length === 0) {
//             return 0; // labour not found
//         }

//         const labourData = labour.recordset[0];

//         // Update the labour status
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .input('status', sql.VarChar, 'Resubmitted')
//             .input('isApproved', sql.Int, 3)
//              .input('ResubmitLabourDate', sql.DateTime, now)
//           .query('UPDATE labourOnboarding SET status = @status, isApproved = @isApproved, ResubmitLabourDate = @ResubmitLabourDate WHERE id = @id');

//         // Insert into RejectLabours table
//         await pool.request()
//             .input('userId', sql.Int, labourData.id)
//             .input('name', sql.VarChar, labourData.name)
//             .input('status', sql.VarChar, 'Resubmitted')
//             .input('Reject_Reason', sql.VarChar, labourData.Reject_Reason) // might be empty on resubmission
//             .input('OnboardName', sql.VarChar, labourData.OnboardName)
//             .input('aadhaarNumber', sql.VarChar, labourData.aadhaarNumber)
//             .input('isApproved', sql.Int, 3) // isApproved is 3 for resubmitted
//             .query('INSERT INTO RejectLabours (userId, name, status, Reject_Reason, OnboardName, aadhaarNumber, isApproved) VALUES (@userId, @name, @status, @Reject_Reason, @OnboardName, @aadhaarNumber, @isApproved)');

//         return result.rowsAffected[0];
//     } catch (error) {
//         console.error("Error in resubmitLabour:", error);
//         throw error;
//     }
// };


// Edit labour functionlity button 
async function editLabour(id) {
    try {
        const pool = await poolPromise;
        const now = new Date(); 
        const labour = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM labourOnboarding WHERE id = @id');
        
        if (labour.recordset.length === 0) {
            return 0; // labour not found
        }

        const labourData = labour.recordset[0];

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar, 'Approved')
            .input('isApproved', sql.Int, 1)
            .input('EditLabourDate', sql.DateTime, now)
            .query('UPDATE labourOnboarding SET status = @status, isApproved = @isApproved, EditLabourDate = @EditLabourDate WHERE id = @id');

        await pool.request()
            .input('userId', sql.Int, labourData.id)
            .input('name', sql.VarChar, labourData.name)
            .input('status', sql.VarChar, 'Approved')
            .input('Reject_Reason', sql.VarChar, labourData.Reject_Reason) 
            .input('OnboardName', sql.VarChar, labourData.OnboardName)
            .input('aadhaarNumber', sql.VarChar, labourData.aadhaarNumber)
            .input('isApproved', sql.Int, 1) 
            .query('INSERT INTO RejectLabours (userId, name, status, Reject_Reason, OnboardName, aadhaarNumber, isApproved) VALUES (@userId, @name, @status, @Reject_Reason, @OnboardName, @aadhaarNumber, @isApproved)');

        return result.rowsAffected[0];
    } catch (error) {
        console.error("Error in resubmitLabour:", error);
        throw error;
    }
};



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
};

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
};


// async function getCombinedStatuses() {
//     try {
//         const pool = await poolPromise;
 
//         // Query both tables
//         const esslResult = await pool.request()
//             .query('SELECT userId, esslStatus FROM [dbo].[API_EsslPayloads]');
//             console.log("Essl Status Query Result:", esslResult.recordset);
//         const employeeMasterResult = await pool.request()
//             .query('SELECT userId, employeeMasterStatus FROM [dbo].[API_ResponsePayloads]');
//             console.log("Employee Master Status Query Result:", employeeMasterResult.recordset);

//         // Handle and validate userId properly
//         const esslStatusMap = esslResult.recordset.reduce((map, record) => {
//             const userId = validateId(record.userId);
//             console.log(userId,"sadasdasdsadsad") // Ensure valid userId (as an int)
//             if (userId !== null) {
//                 map[userId] = record.esslStatus;
//             }
//             return map;
//         }, {});

//         const employeeMasterStatusMap = employeeMasterResult.recordset.reduce((map, record) => {
//             const userId = validateId(record.userId); // Ensure valid userId (as an int)
//             if (userId !== null) {
//                 map[userId] = record.employeeMasterStatus;
//             }
//             return map;
//         }, {});

//         // Combine the two results
//         const combinedStatuses = Object.keys(esslStatusMap).map(userId => ({
//             userId: parseInt(userId, 10), // Ensure userId is an integer
//             esslStatus: esslStatusMap[userId],
//             employeeMasterStatus: employeeMasterStatusMap[userId] || 'not found'
//         }));

//         return combinedStatuses;
//     } catch (error) {
//         console.error('Error fetching combined statuses:', error);
//         throw error;
//     }
// }

// // Validate userId to ensure it's a valid integer
// function validateId(id) {
//     if (typeof id === 'number' && !isNaN(id) && id !== null && id !== undefined) {
//         return id;
//     } else {
//         console.warn(`Invalid userId: ${id}`);
//         return null; // Skip invalid userIds
//     }
// }




async function getLabourStatuses(labourIds) {
    try {
        // Convert labourIds to a comma-separated string for SQL query
        const labourIdsString = labourIds.map(id => `'${id}'`).join(',');

        const pool = await poolPromise;
        const result = await pool.request()
        .query(`
           SELECT 
                    COALESCE(e.userId, r.userId) AS userId,
                    CAST(COALESCE(e.LabourID, r.LabourID) AS VARCHAR(50)) AS LabourID,
                    COALESCE(e.name, r.name) AS name,
                    ISNULL(e.esslStatus, '-') AS esslStatus,
                    CASE 
                        WHEN r.employeeMasterStatus = 'true' OR r.employeeMasterStatus = 1 THEN 'true'
                        ELSE '-'
                    END AS employeeMasterStatus
                FROM [dbo].[API_EsslPayloads] e
                FULL OUTER JOIN [dbo].[API_ResponsePayloads] r
                ON CAST(e.LabourID AS VARCHAR(50)) = CAST(r.LabourID AS VARCHAR(50))
                WHERE e.LabourID IS NOT NULL OR r.LabourID IS NOT NULL
                AND COALESCE(e.LabourID, r.LabourID) IN (${labourIdsString});
        `);


        return result.recordset;
    } catch (error) {
        console.error("Error in getLabourStatuses:", error.message, error.stack);
        throw new Error('Error fetching labour statuses');
    }
};





async function updateHideResubmit(labourId, hideResubmitValue) {
    try {
        const pool = await poolPromise;
        const request = pool.request()
            .input('id', sql.Int, labourId)
            .input('hideResubmit', sql.Bit, hideResubmitValue); // Use Bit for boolean values

        const result = await request.query('UPDATE labourOnboarding SET hideResubmit = @hideResubmit WHERE id = @id');
        return result.rowsAffected[0]; // Return number of affected rows
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
    updateData,
    editLabour,
    updateDataDisableStatus,
    // getCombinedStatuses
    getLabourStatuses,
    updateHideResubmit
    // getEsslStatuses,
    // getEmployeeMasterStatuses
    // updateLabour
};