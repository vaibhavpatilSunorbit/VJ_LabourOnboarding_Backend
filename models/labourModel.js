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
        console.log("labourData:........vaibhav now", labourData);

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

    //     const finalOnboardName = labourData.OnboardName ? labourData.OnboardName : ''; // Fallback to empty string if undefined
    //   labourData.OnboardName = finalOnboardName;
    
    let finalOnboardName = Array.isArray(labourData.OnboardName)
    ? labourData.OnboardName.filter(name => name && name.trim() !== '').pop()
    : labourData.OnboardName;

if (!finalOnboardName || finalOnboardName.trim() === '') {
    throw new Error('OnboardName is missing or invalid.');
}

labourData.OnboardName = finalOnboardName.toUpperCase();

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

        request.input('status', sql.NVarChar, 'Pending');
        request.input('isApproved', sql.Int, 0);

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

        let finalOnboardName = Array.isArray(labourData.OnboardName)
        ? labourData.OnboardName.filter(name => name && name.trim() !== '').pop()
        : labourData.OnboardName;

    if (!finalOnboardName || finalOnboardName.trim() === '') {
        throw new Error('OnboardName is missing or invalid.');
    }

    labourData.OnboardName = finalOnboardName.toUpperCase();
    
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

// -----------------------------------------------------------------------------------------------------------------------------------

async function registerDataUpdateDisable(labourData) {
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
        // request.input('isResubmit', sql.Bit, labourData.isResubmit);

        // const finalOnboardName = labourData.OnboardName ? labourData.OnboardName : ''; // Fallback to empty string if undefined
        // labourData.OnboardName = finalOnboardName;

        let finalOnboardName = Array.isArray(labourData.OnboardName)
        ? labourData.OnboardName.filter(name => name && name.trim() !== '').pop()
        : labourData.OnboardName;

    if (!finalOnboardName || finalOnboardName.trim() === '') {
        throw new Error('OnboardName is missing or invalid.');
    }

    labourData.OnboardName = finalOnboardName.toUpperCase();
    
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
          status, isApproved, title, Marital_Status, companyName, Induction_Date, Inducted_By, uploadInductionDoc, OnboardName, ValidTill, location, ConfirmDate, retirementDate, SalaryBu, WorkingBu, CreationDate, businessUnit, departmentId, designationId, labourCategoryId, departmentName, isResubmit) 
          VALUES (
          @LabourID, @labourOwnership, @uploadAadhaarFront, @uploadAadhaarBack, @uploadIdProof, @name, @aadhaarNumber,
          @dateOfBirth, @contactNumber, @gender, @dateOfJoining, @Group_Join_Date, @From_Date, @Period, @address, @pincode, @taluka, @district, @village,
          @state, @emergencyContact, @photoSrc, @bankName, @branch, @accountNumber, @ifscCode, @projectName,
          @labourCategory, @department, @workingHours, @contractorName, @contractorNumber, @designation,
          'Pending', 0, @title, @Marital_Status, @companyName, @Induction_Date, @Inducted_By, @uploadInductionDoc, @OnboardName,  @ValidTill, @location, @ConfirmDate, @retirementDate, @SalaryBu, @WorkingBu, @CreationDate, @businessUnit, @departmentId, @designationId, @labourCategoryId, @departmentName, @isResubmit)
        `);
        console.log('Data successfully inserted for OnboardName Resubmmit button:', labourData.OnboardName);
        return result.recordset;
    } catch (error) {
        throw error;
    }
  }
  
// -----------------------------------------------------------------------------------------------------------------------------------


  


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
            .query('SELECT * FROM labourOnboarding WHERE name LIKE @query OR aadhaarNumber LIKE @query OR LabourID LIKE @query OR OnboardName LIKE @query OR workingHours LIKE @query');
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

// ------------------------------------  approve Disable labour changes 14-11-2024 -------------

async function approveDisableLabours(id, labourID) {
    try {
        const pool = await poolPromise;
        const now = new Date();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('LabourID', sql.NVarChar, labourID)
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

// ------------------------------------------------------------ end ----------------------------



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
      }else{
        await pool.request()
        .input('id', sql.Int, id)
        .input('isResubmit', sql.Bit, 1)
        .query('UPDATE labourOnboarding SET isResubmit = @isResubmit WHERE id = @id');
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


// ------------------------------    LABOUR APP PHASE 2 START HERE DATE 21-10-2024   ---------------------------
//   ATTENDACE REPORT CODE HERE ----- Implement Date 22/10/2024 ---- //////////////////////////////

// async function getAttendanceByLabourId(labourId, month, year) {
//     try {
//         console.log('Fetching attendance from DB for:', { labourId, month, year });
//         const pool = await poolPromise3;
//         const result = await pool
//             .request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('month', sql.Int, month)
//             .input('year', sql.Int, year)
//             .query(`
//                 SELECT * FROM [dbo].[Attendance]
//                 WHERE user_id = @labourId
//                 AND MONTH(punch_date) = @month
//                 AND YEAR(punch_date) = @year
//                 ORDER BY punch_date, punch_time
//             `);
//             console.log('SQL Result:', result.recordset);
//         return result.recordset;
//     } catch (err) {
//         console.error('SQL error', err);
//         throw new Error('Error fetching attendance data');
//     }
// };



// // Fetch Approved Labour IDs
// async function getAllApprovedLabourIds() {
//     try {
//         console.log('Attempting to connect to the database...');
        
//         const pool = await poolPromise;
        
//         console.log('Connected to the database. Executing query...');
        
//         const result = await pool
//             .request()
//             .query(`SELECT LabourID AS labourId FROM [dbo].[labourOnboarding] WHERE status = 'Approved'`);
        
//         console.log('Fetched approved labour IDs:', result.recordset);
        
//         return result.recordset; // Returns an array of approved labour IDs
//     } catch (err) {
//         console.error('SQL error fetching approved labour IDs', err);
//         throw new Error('Error fetching approved labour IDs');
//     }
// }

// // Fetch Attendance for All Approved Labour IDs for a Given Month and Year
// async function getAttendanceForAllLabours(labourId, month, year) {
//     try {
//         // Parse and validate parameters
//         const parsedLabourId = parseInt(labourId, 10);
//         const parsedMonth = parseInt(month, 10);
//         const parsedYear = parseInt(year, 10);

//         if (isNaN(parsedLabourId) || isNaN(parsedMonth) || isNaN(parsedYear)) {
//             console.error('Invalid parameter(s):', { labourId, month, year });
//             throw new Error('Invalid labourId, month, or year');
//         }

//         const pool = await poolPromise3;

//         const result = await pool
//             .request()
//             .input('labourId', sql.Int, parsedLabourId)
//             .input('month', sql.Int, parsedMonth)
//             .input('year', sql.Int, parsedYear)
//             .query(`
//                 SELECT * FROM [dbo].[Attendance]
//                 WHERE user_id = @labourId
//                 AND MONTH(punch_date) = @month
//                 AND YEAR(punch_date) = @year
//                 ORDER BY punch_date, punch_time
//             `);

//         console.log(`Fetched attendance for labour ID ${labourIds}:`, result.recordset);
//         return result.recordset;
//     } catch (err) {
//         console.error('SQL error fetching attendance data', err);
//         throw new Error('Error fetching attendance data');
//     }
// }




// Updated Model (model.js)
// async function getAttendanceByLabourId(labourId, month, year) {
//     try {
//         console.log('Fetching attendance from DB for:', { labourId, month, year });
//         const pool = await poolPromise3;
//         const result = await pool
//             .request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('month', sql.Int, month)
//             .input('year', sql.Int, year)
//             .query(`
//                 SELECT * FROM [dbo].[Attendance]
//                 WHERE user_id = @labourId
//                 AND MONTH(punch_date) = @month
//                 AND YEAR(punch_date) = @year
//                 ORDER BY punch_date, punch_time
//             `);
//         // console.log('SQL Result:', result.recordset);
//         return result.recordset;
//     } catch (err) {
//         console.error('SQL error', err);
//         throw new Error('Error fetching attendance data');
//     }
// };

// // Fetch Approved Labour IDs
// async function getAllApprovedLabourIds() {
//     try {
//         console.log('Attempting to connect to the database...');
//         const pool = await poolPromise;
//         const result = await pool
//             .request()
//             .query(`SELECT LabourID AS labourId FROM [dbo].[labourOnboarding] WHERE status = 'Approved'`);
//         console.log('Fetched approved labour IDs:', result.recordset);
//         return result.recordset; // Returns an array of approved labour IDs
//     } catch (err) {
//         console.error('SQL error fetching approved labour IDs', err);
//         throw new Error('Error fetching approved labour IDs');
//     }
// }

// ------------------------------------------------------------------------  LABOUR PHASE 2 -------------------------------------------

async function getAttendanceByLabourId(labourId, month, year) {
    try {
        console.log('Fetching attendance from DB for:', { labourId, month, year });
        const pool = await poolPromise3;
        const result = await pool
            .request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                SELECT * FROM [dbo].[Attendance]
                WHERE user_id = @labourId
                AND MONTH(punch_date) = @month
                AND YEAR(punch_date) = @year
                ORDER BY punch_date, punch_time
            `);
        // console.log('SQL Result:', result.recordset);
        return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw new Error('Error fetching attendance data');
    }
};

// Fetch Approved Labour IDs with Working Hours
async function getAllApprovedLabours() {
    try {
        console.log('Attempting to connect to the database...');
        const pool = await poolPromise;
        const result = await pool
            .request()
            .query(`SELECT LabourID AS labourId, workingHours, projectName FROM [dbo].[labourOnboarding] WHERE status = 'Approved'`);
        console.log('Fetched approved labours:', result.recordset);
        return result.recordset; // Returns an array of approved labour IDs and working hours
    } catch (err) {
        console.error('SQL error fetching approved labour IDs', err);
        throw new Error('Error fetching approved labour IDs');
    }
}

// Fetch Labour Details by ID
async function getLabourDetailsById(labourId) {
    try {
        console.log('Fetching labour details from DB for:', labourId);
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input('labourId', sql.NVarChar, labourId)
            .query(`SELECT LabourID AS labourId, workingHours FROM [dbo].[labourOnboarding] WHERE LabourID = @labourId`);
        console.log('Fetched labour details:', result.recordset[0]);
        return result.recordset[0];
    } catch (err) {
        console.error('SQL error fetching labour details', err);
        throw new Error('Error fetching labour details');
    }
};




// Helper function to determine if a given date is a holiday
async function isHoliday(date) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('date', sql.Date, date)
            .query(`
                SELECT * 
                FROM [dbo].[HolidayDate] 
                WHERE HolidayDate = @date
            `);
        return result.recordset.length > 0;
    } catch (err) {
        console.error('Error checking if date is a holiday', err);
        throw new Error('Error checking if date is a holiday');
    }
}

// Check if weekly off exists
async function getWeeklyOff(LabourID, offDate) {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input('LabourID', sql.NVarChar, LabourID)
            .input('offDate', sql.Date, offDate)
            .query(`
                SELECT * 
                FROM [dbo].[WeeklyOffs] 
                WHERE LabourID = @LabourID AND offDate = @offDate
            `);
        return result.recordset[0]; // Return the record if it exists
    } catch (err) {
        console.error('Error fetching weekly off:', err);
        throw new Error('Error fetching weekly off');
    }
}

// Add a new weekly off
async function addWeeklyOff(LabourID, offDate, addedBy) {
    try {
        const pool = await poolPromise;
        await pool
            .request()
            .input('LabourID', sql.NVarChar, LabourID)
            .input('offDate', sql.Date, offDate)
            .input('addedBy', sql.NVarChar, addedBy)
            .query(`
                INSERT INTO [dbo].[WeeklyOffs] (LabourID, offDate, addedBy)
                VALUES (@LabourID, @offDate, @addedBy)
            `);
        return true;
    } catch (err) {
        console.error('Error adding weekly off:', err);
        return false;
    }
}

// Save multiple weekly offs
async function saveWeeklyOffs(LabourID, weeklyOffDates) {
    try {
        const pool = await poolPromise;

        // Delete existing weekly offs for this labour for the same month
        await pool
            .request()
            .input('LabourID', sql.NVarChar, LabourID)
            .query(`
                DELETE FROM [dbo].[WeeklyOffs]
                WHERE LabourID = @LabourID 
                  AND MONTH(offDate) = MONTH(GETDATE())
                  AND YEAR(offDate) = YEAR(GETDATE())
            `);

        // Insert new weekly off dates
        for (const date of weeklyOffDates) {
            await pool
                .request()
                .input('LabourID', sql.NVarChar, LabourID)
                .input('offDate', sql.Date, date)
                .query(`
                    INSERT INTO [dbo].[WeeklyOffs] (LabourID, offDate)
                    VALUES (@LabourID, @offDate)
                `);
        }

        return true;
    } catch (err) {
        console.error('Error saving weekly offs:', err);
        return false;
    }
}

async function getAttendanceByLabourIdForDate(labourId, date) {
    try {
        console.log('Fetching attendance from DB for:', { labourId, date });
        const pool = await poolPromise3;
        const result = await pool
            .request()
            .input('labourId', sql.NVarChar, labourId)
            .input('date', sql.Date, date)
            .query(`
                SELECT * FROM [dbo].[Attendance]
                WHERE user_id = @labourId
                AND CAST(punch_date AS DATE) = @date
                ORDER BY punch_time
            `);
        return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw new Error('Error fetching attendance data');
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------

// Get miss punch count for a specific labour and date
async function getMissPunchCount(labourId, punchDate) {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("labourId", sql.NVarChar, labourId)
            .input("punchDate", sql.Date, punchDate)
            .query(`
                SELECT COUNT(*) AS missPunchCount
                FROM [dbo].[Attendance]
                WHERE user_id = @labourId AND punch_date = @punchDate AND isMissPunch = 1
            `);
        return result.recordset[0];
    } catch (err) {
        console.error("SQL error fetching miss punch count", err);
        throw new Error("Error fetching miss punch count");
    }
}

// Add a miss punch entry
async function addMissPunch(labourId, punchType, punchDate, punchTime) {
    try {
        const pool = await poolPromise;
        await pool
            .request()
            .input("labourId", sql.NVarChar, labourId)
            .input("punchType", sql.NVarChar, punchType)
            .input("punchDate", sql.Date, punchDate)
            .input("punchTime", sql.Time, punchTime)
            .query(`
                INSERT INTO [dbo].[Attendance] (user_id, punch_type, punch_date, punch_time, isMissPunch)
                VALUES (@labourId, @punchType, @punchDate, @punchTime, 1)
            `);
        return true;
    } catch (err) {
        console.error("SQL error adding miss punch", err);
        return false;
    }
}

// Add an admin approval request
async function addApprovalRequest(labourId, punchType, punchDate, punchTime) {
    try {
        const pool = await poolPromise;
        await pool
            .request()
            .input("labourId", sql.NVarChar, labourId)
            .input("punchType", sql.NVarChar, punchType)
            .input("punchDate", sql.Date, punchDate)
            .input("punchTime", sql.Time, punchTime)
            .query(`
                INSERT INTO [dbo].[AdminApprovals] (labour_id, punch_type, punch_date, punch_time, status)
                VALUES (@labourId, @punchType, @punchDate, @punchTime, 'Pending')
            `);
        return true;
    } catch (err) {
        console.error("SQL error adding approval request", err);
        return false;
    }
}



async function insertIntoLabourAttendanceSummary(summary) {
    try {
        const pool = await poolPromise;
        const existingRecord = await pool
            .request()
            .input('LabourId', sql.NVarChar, summary.labourId)
            .input('SelectedMonth', sql.NVarChar, summary.selectedMonth)
            .query(`
                SELECT COUNT(*) AS count 
                FROM LabourAttendanceSummary 
                WHERE LabourId = @LabourId AND SelectedMonth = @SelectedMonth
            `);

        if (existingRecord.recordset[0].count > 0) {
            console.log(`Record already exists for LabourId: ${summary.labourId} in month: ${summary.selectedMonth}`);
            return; 
        }

        const query = `
            INSERT INTO LabourAttendanceSummary (
                LabourId, TotalDays, PresentDays, HalfDays, AbsentDays, MissPunchDays,
                TotalOvertimeHours, Shift, CreationDate, SelectedMonth
            ) VALUES (
                @LabourId, @TotalDays, @PresentDays, @HalfDays, @AbsentDays, @MissPunchDays,
                @TotalOvertimeHours, @Shift, @CreationDate, @SelectedMonth
            )
        `;

        await pool
            .request()
            .input('LabourId', sql.NVarChar, summary.labourId)
            .input('TotalDays', sql.Int, summary.totalDays)
            .input('PresentDays', sql.Int, summary.presentDays)
            .input('HalfDays', sql.Int, summary.halfDays)
            .input('AbsentDays', sql.Int, summary.absentDays)
            .input('MissPunchDays', sql.Int, summary.missPunchDays)
            .input('TotalOvertimeHours', sql.Float, summary.totalOvertimeHours)
            .input('Shift', sql.NVarChar, summary.shift)
            .input('CreationDate', sql.DateTime, summary.creationDate)
            .input('SelectedMonth', sql.NVarChar, summary.selectedMonth)
            .query(query);

        console.log(`Inserted summary for LabourId: ${summary.labourId}`);
    } catch (err) {
        console.error('Error inserting into LabourAttendanceSummary:', err);
        throw err;
    }
}


async function insertIntoLabourAttendanceDetails(details) {
    try {
        const pool = await poolPromise;

        // Check and insert in a single query using `IF NOT EXISTS`
        const query = `
            IF NOT EXISTS (
                SELECT 1
                FROM LabourAttendanceDetails
                WHERE LabourId = @LabourId AND Date = @Date
            )
            BEGIN
                INSERT INTO LabourAttendanceDetails (
                    LabourId, Date, FirstPunch, FirstPunchAttendanceId, FirstPunchDeviceId,
                    LastPunch, LastPunchAttendanceId, LastPunchDeviceId, 
                    TotalHours, Overtime, Status, CreationDate, projectName
                ) VALUES (
                    @LabourId, @Date, @FirstPunch, @FirstPunchAttendanceId, @FirstPunchDeviceId,
                    @LastPunch, @LastPunchAttendanceId, @LastPunchDeviceId, 
                    @TotalHours, @Overtime, @Status, @CreationDate, @projectName
                )
            END
        `;

        await pool
            .request()
            .input('LabourId', sql.NVarChar, details.labourId)
            .input('projectName', sql.Int, details.projectName)
            .input('Date', sql.Date, details.date)
            .input('FirstPunch', sql.NVarChar, details.firstPunch)
            .input('FirstPunchAttendanceId', sql.Int, details.firstPunchAttendanceId)
            .input('FirstPunchDeviceId', sql.NVarChar, details.firstPunchDeviceId)
            .input('LastPunch', sql.NVarChar, details.lastPunch)
            .input('LastPunchAttendanceId', sql.Int, details.lastPunchAttendanceId)
            .input('LastPunchDeviceId', sql.NVarChar, details.lastPunchDeviceId)
            .input('TotalHours', sql.Float, details.totalHours)
            .input('Overtime', sql.Float, details.overtime)
            .input('Status', sql.NVarChar, details.status)
            .input('CreationDate', sql.DateTime, details.creationDate)
            .query(query);

        console.log(`Attempted to insert details for LabourId: ${details.labourId} on Date: ${details.date}`);
    } catch (err) {
        console.error('Error inserting into LabourAttendanceDetails:', err);
        throw err;
    }
}

// async function insertIntoLabourAttendanceDetails(details) {
//     try {
//         const pool = await poolPromise;
//         const query = `
//             INSERT INTO LabourAttendanceDetails (
//                 LabourId, Date, FirstPunch, FirstPunchAttendanceId, FirstPunchDeviceId,
//                 LastPunch, LastPunchAttendanceId, LastPunchDeviceId, 
//                 TotalHours, Overtime, Status, CreationDate
//             ) VALUES (
//                 @LabourId, @Date, @FirstPunch, @FirstPunchAttendanceId, @FirstPunchDeviceId,
//                 @LastPunch, @LastPunchAttendanceId, @LastPunchDeviceId, 
//                 @TotalHours, @Overtime, @Status, @CreationDate
//             )
//         `;
//         await pool
//             .request()
//             .input('LabourId', sql.NVarChar, details.labourId)
//             .input('Date', sql.Date, details.date)
//             .input('FirstPunch', sql.NVarChar, details.firstPunch)
//             .input('FirstPunchAttendanceId', sql.Int, details.firstPunchAttendanceId)
//             .input('FirstPunchDeviceId', sql.NVarChar, details.firstPunchDeviceId)
//             .input('LastPunch', sql.NVarChar, details.lastPunch)
//             .input('LastPunchAttendanceId', sql.Int, details.lastPunchAttendanceId)
//             .input('LastPunchDeviceId', sql.NVarChar, details.lastPunchDeviceId)
//             .input('TotalHours', sql.Float, details.totalHours)
//             .input('Overtime', sql.Float, details.overtime)
//             .input('Status', sql.NVarChar, details.status)
//             .input('CreationDate', sql.DateTime, details.creationDate)
//             .query(query);

//         console.log(`Inserted details for LabourId: ${details.labourId} on Date: ${details.date}`);
//     } catch (err) {
//         console.error('Error inserting into LabourAttendanceDetails:', err);
//         throw err;
//     }
// }



async function insertOrUpdateLabourAttendanceSummary(labourId, date) {
    // console.log('date++__++__++__',date)
    try {
        const pool = await poolPromise;

        // Calculate summary data for the given LabourId and Date range
        const summaryData = await pool
            .request()
            .input('LabourId', sql.NVarChar, labourId)
            .input('SelectedMonth', sql.NVarChar, date.substring(0, 7)) // e.g., "2024-12"
            .query(`
                SELECT 
                    COUNT(*) AS TotalDays,
                    SUM(CASE WHEN Status = 'P' THEN 1 ELSE 0 END) AS PresentDays,
                    SUM(CASE WHEN Status = 'HD' THEN 1 ELSE 0 END) AS HalfDays,
                    SUM(CASE WHEN Status = 'A' THEN 1 ELSE 0 END) AS AbsentDays,
                    SUM(CASE WHEN Status = 'MP' THEN 1 ELSE 0 END) AS MissPunchDays,
                    SUM(Overtime) AS TotalOvertimeHours
                FROM LabourAttendanceDetails
                WHERE LabourId = @LabourId
                AND FORMAT(Date, 'yyyy-MM') = @SelectedMonth
            `);

        const { TotalDays, PresentDays, HalfDays, AbsentDays, MissPunchDays, TotalOvertimeHours } =
            summaryData.recordset[0];

        // Check if an existing summary record exists for this LabourId and SelectedMonth
        const existingRecord = await pool
            .request()
            .input('LabourId', sql.NVarChar, labourId)
            .input('SelectedMonth', sql.NVarChar, date.substring(0, 7)) // e.g., "2024-12"
            .query(`
                SELECT COUNT(*) AS count 
                FROM LabourAttendanceSummary 
                WHERE LabourId = @LabourId AND SelectedMonth = @SelectedMonth
            `);

        if (existingRecord.recordset[0].count > 0) {
            // Update existing record
            await pool
                .request()
                .input('LabourId', sql.NVarChar, labourId)
                .input('TotalDays', sql.Int, TotalDays)
                .input('PresentDays', sql.Int, PresentDays)
                .input('HalfDays', sql.Int, HalfDays)
                .input('AbsentDays', sql.Int, AbsentDays)
                .input('MissPunchDays', sql.Int, MissPunchDays)
                .input('TotalOvertimeHours', sql.Float, TotalOvertimeHours)
                .input('CreationDate', sql.DateTime, new Date())
                .input('SelectedMonth', sql.NVarChar, date.substring(0, 7))
                .query(`
                    UPDATE LabourAttendanceSummary
                    SET 
                        TotalDays = @TotalDays,
                        PresentDays = @PresentDays,
                        HalfDays = @HalfDays,
                        AbsentDays = @AbsentDays,
                        MissPunchDays = @MissPunchDays,
                        TotalOvertimeHours = @TotalOvertimeHours,
                        CreationDate = @CreationDate
                    WHERE LabourId = @LabourId AND SelectedMonth = @SelectedMonth
                `);

            console.log(`Updated summary for LabourId: ${labourId} in month: ${date.substring(0, 7)}`);
        } else {
            // Insert new record
            await pool
                .request()
                .input('LabourId', sql.NVarChar, labourId)
                .input('TotalDays', sql.Int, TotalDays)
                .input('PresentDays', sql.Int, PresentDays)
                .input('HalfDays', sql.Int, HalfDays)
                .input('AbsentDays', sql.Int, AbsentDays)
                .input('MissPunchDays', sql.Int, MissPunchDays)
                .input('TotalOvertimeHours', sql.Float, TotalOvertimeHours)
                .input('CreationDate', sql.DateTime, new Date())
                .input('SelectedMonth', sql.NVarChar, date.substring(0, 7))
                .query(`
                    INSERT INTO LabourAttendanceSummary (
                        LabourId, TotalDays, PresentDays, HalfDays, AbsentDays, MissPunchDays,
                        TotalOvertimeHours, CreationDate, SelectedMonth
                    ) VALUES (
                        @LabourId, @TotalDays, @PresentDays, @HalfDays, @AbsentDays, @MissPunchDays,
                        @TotalOvertimeHours, @CreationDate, @SelectedMonth
                    )
                `);

            console.log(`Inserted summary for LabourId: ${labourId} in month: ${date.substring(0, 7)}`);
        }
    } catch (err) {
        console.error('Error in insertOrUpdateLabourAttendanceSummary:', err);
        throw err;
    }
}


async function deleteAttendanceDetails(month, year) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                DELETE FROM [dbo].[LabourAttendanceDetails]
                WHERE MONTH(Date) = @month AND YEAR(Date) = @year
            `);
    } catch (error) {
        console.error('Error deleting attendance details:', error);
        throw new Error('Error deleting attendance details');
    }
};

async function deleteAttendanceSummary(month, year) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                DELETE FROM [dbo].[LabourAttendanceSummary]
                WHERE MONTH(SelectedMonth) = @month AND YEAR(SelectedMonth) = @year
            `);
    } catch (error) {
        console.error('Error deleting attendance summary:', error);
        throw new Error('Error deleting attendance summary');
    }
};


// ------------------------------------------------  fetch attendance model ---------------------


async function fetchAttendanceByMonthYear(month, year) {
    try {
        const formattedMonth = `${year}-${month.toString().padStart(2, '0')}`;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('selectedMonth', sql.NVarChar, formattedMonth)
            .query(`
                SELECT *
                FROM [dbo].[LabourAttendanceSummary]
                WHERE SelectedMonth = @selectedMonth
            `);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching attendance by month and year:', error);
        throw error;
    }
};



async function fetchAttendanceSummary() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT *
            FROM [dbo].[LabourAttendanceSummary]
        `);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        throw error;
    }
};

async function fetchAttendanceDetailsByMonthYear(month, year) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                SELECT *
                FROM [dbo].[LabourAttendanceSummary]
                WHERE 
                    MONTH(CONVERT(DATE, SelectedMonth + '-01')) = @month 
                    AND YEAR(CONVERT(DATE, SelectedMonth + '-01')) = @year
            `);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching attendance details for all labours:', error);
        throw error;
    }
}


async function fetchAttendanceDetailsByMonthYearForSingleLabour(labourId, month, year) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                SELECT 
                    att.AttendanceId,
                    att.LabourId,
                    att.Date,
                    att.FirstPunch,
                    att.LastPunch,
                    att.TotalHours,
                    att.Overtime,
                    CASE 
                        WHEN hol.HolidayDate IS NOT NULL THEN 'H'
                        ELSE att.Status
                    END AS Status,
                    att.CreationDate,
                    att.FirstPunchManually,
                    att.LastPunchManually,
                    att.OvertimeManually,
                    att.RemarkManually,
                    att.FirstPunchAttendanceId,
                    att.FirstPunchDeviceId,
                    att.LastPunchAttendanceId,
                    att.LastPunchDeviceId,
                    att.TimesUpdate,
                    att.EditUserName,
                    att.LastUpdatedDate,
                    att.WorkingHours,
                    att.OnboardName
                FROM [dbo].[LabourAttendanceDetails] att
                LEFT JOIN [dbo].[HolidayDate] hol
                    ON att.Date = hol.HolidayDate
                WHERE 
                    att.LabourId = @labourId
                    AND MONTH(att.Date) = @month 
                    AND YEAR(att.Date) = @year
            `);

        return result.recordset.map((row) => {
            // Ensure the status is not an array
            row.Status = Array.isArray(row.Status) ? row.Status[0] : row.Status;
            return row;
        });
    } catch (error) {
        console.error('Error fetching attendance details for a single labour:', error);
        throw error;
    }
}

async function getTimesUpdateForMonth(labourId, date) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, new Date(date).getMonth() + 1)
            .input('year', sql.Int, new Date(date).getFullYear())
            .query(`
                SELECT SUM(TimesUpdate) AS TotalTimesUpdate
                FROM [LabourAttendanceDetails]
                WHERE LabourId = @labourId
                  AND MONTH(Date) = @month
                  AND YEAR(Date) = @year
            `);

        return result.recordset[0]?.TotalTimesUpdate || 0;
    } catch (error) {
        console.error('Error fetching TimesUpdate:', error);
        throw new Error('Error fetching TimesUpdate for month.');
    }
}


async function markAttendanceForApproval(labourId, date, overtimeManually, remarkManually) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('date', sql.Date, date)
            .input('overtimeManually', sql.Float, overtimeManually || null)
            .input('remarkManually', sql.VarChar, remarkManually || null)
            .query(`
                UPDATE [LabourAttendanceDetails]
                SET SentForApproval = 1,
                    ApprovalStatus = 'Pending',
                    OvertimeManually = @overtimeManually,
                    RemarkManually = @remarkManually,
                    LastUpdatedDate = GETDATE()
                WHERE LabourId = @labourId AND Date = @date
            `);
        console.log('Attendance marked for admin approval.');
    } catch (error) {
        console.error('Error marking attendance for approval:', error);
        throw new Error('Error marking attendance for admin approval.');
    }
}


async function fetchAttendanceDetails(labourId, month, year, attendance) {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        // Delete existing attendance for the labour in the given month
        await transaction.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                DELETE FROM [dbo].[LabourAttendanceDetails]
                WHERE LabourId = @labourId 
                AND MONTH(Date) = @month 
                AND YEAR(Date) = @year
            `);

        // Insert new attendance records
        const insertQuery = `
            INSERT INTO [dbo].[LabourAttendanceDetails] (
                LabourId, Date, FirstPunch, LastPunch, TotalHours, Overtime, Status, CreationDate
            ) VALUES (@labourId, @date, @firstPunch, @lastPunch, @totalHours, @overtime, @status, GETDATE())
        `;

        const request = transaction.request();
        for (const record of attendance) {
            await request
                .input('labourId', sql.NVarChar, labourId)
                .input('date', sql.Date, record.date)
                .input('firstPunch', sql.Time, record.firstPunch || null)
                .input('lastPunch', sql.Time, record.lastPunch || null)
                .input('totalHours', sql.Float, record.totalHours || 0)
                .input('overtime', sql.Float, record.overtime || 0)
                .input('status', sql.NVarChar, record.status)
                .query(insertQuery);
        }

        await transaction.commit();
    } catch (error) {
        console.error('Error saving full month attendance:', error);
        throw error;
    }
};






// -------------------------------------------  EXCEL BUTTON DOWNLOAD   --------------------------------------------

// async function upsertAttendance({
//     labourId,
//     date,
//     firstPunchManually,
//     lastPunchManually,
//     overtimeManually,
//     remarkManually,
//     workingHours,
//     onboardName,
// }) {
//     let totalHours = 0;
//     let status = 'A'; // Default: Absent
//     let calculatedOvertime = 0;

//     const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//     const halfDayHours = shiftHours === 9 ? 4.5 : 4;

//     try {
//         const pool = await poolPromise;

//         // Check if the date is a holiday
//         const holidayCheckResult = await pool.request()
//             .input('date', sql.Date, date)
//             .query(`
//                 SELECT HolidayDate 
//                 FROM [dbo].[HolidayDate]
//                 WHERE HolidayDate = @date
//             `);

//         if (holidayCheckResult.recordset.length > 0) {
//             // If it's a holiday, prevent modifications
//             const holidayError = new Error('The date is a holiday. You cannot modify punch times or overtime.');
//             holidayError.statusCode = 400; // Bad Request
//             throw holidayError;
//         }

//         // Fetch the existing attendance record
//         let existingFirstPunch = null;
//         let existingLastPunch = null;

//         const attendanceResult = await pool.request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('date', sql.Date, date)
//             .query(`
//                 SELECT FirstPunch, LastPunch, Status 
//                 FROM [LabourAttendanceDetails]
//                 WHERE LabourId = @labourId AND Date = @date
//             `);

//         if (attendanceResult.recordset.length > 0) {
//             existingFirstPunch = attendanceResult.recordset[0].FirstPunch;
//             existingLastPunch = attendanceResult.recordset[0].LastPunch;

//             // If the current status is 'H', prevent modifications
//             if (attendanceResult.recordset[0].Status === 'H') {
//                 throw new Error('The date is a holiday. You cannot modify punch times or overtime.');
//             }
//         }

//         // Calculate TotalHours and Status
//         const firstPunch = firstPunchManually || existingFirstPunch;
//         const lastPunch = lastPunchManually || existingLastPunch;

//         if (firstPunch && lastPunch) {
//             const firstPunchTime = new Date(`${date}T${firstPunch}`);
//             const lastPunchTime = new Date(`${date}T${lastPunch}`);

//             totalHours = (lastPunchTime - firstPunchTime) / (1000 * 60 * 60); // Convert to hours

//             if (totalHours >= shiftHours) {
//                 status = 'P'; // Present
//                 calculatedOvertime = totalHours > shiftHours ? totalHours - shiftHours : 0;
//             } else if (totalHours >= halfDayHours) {
//                 status = 'HD'; // Half Day
//             } else if (totalHours > 0) {
//                 status = 'MP'; // Miss Punch
//             }
//         } else if (overtimeManually) {
//             // Use manually provided overtime if no punches are provided
//             status = 'P'; // Mark as Present
//             calculatedOvertime = parseFloat(overtimeManually);
//         }

//         // Round values
//         totalHours = parseFloat(totalHours.toFixed(2));
//         calculatedOvertime = parseFloat(calculatedOvertime.toFixed(2));

//         // Update or Insert record
//         const query = `
//             MERGE INTO [LabourAttendanceDetails] AS Target
//             USING (
//                 SELECT 
//                     @labourId AS LabourId, 
//                     @date AS Date, 
//                     @firstPunch AS FirstPunch, 
//                     @lastPunch AS LastPunch, 
//                     @totalHours AS TotalHours, 
//                     @calculatedOvertime AS Overtime, 
//                     @status AS Status,
//                     @overtimeManually AS OvertimeManually,
//                     @remarkManually AS RemarkManually,
//                     @onboardName AS OnboardName,
//                     GETDATE() AS LastUpdatedDate
//             ) AS Source
//             ON Target.LabourId = Source.LabourId AND Target.Date = Source.Date
//             WHEN MATCHED THEN 
//                 UPDATE SET 
//                     FirstPunch = COALESCE(Source.FirstPunch, Target.FirstPunch),
//                     LastPunch = COALESCE(Source.LastPunch, Target.LastPunch),
//                     TotalHours = COALESCE(Source.TotalHours, Target.TotalHours),
//                     Overtime = COALESCE(Source.Overtime, Target.Overtime),
//                     Status = COALESCE(Source.Status, Target.Status),
//                     OvertimeManually = COALESCE(Source.OvertimeManually, Target.OvertimeManually),
//                     RemarkManually = COALESCE(Source.RemarkManually, Target.RemarkManually),
//                     OnboardName = COALESCE(Source.OnboardName, Target.OnboardName),
//                     LastUpdatedDate = Source.LastUpdatedDate,
//                     TimesUpdate = ISNULL(Target.TimesUpdate, 0) + 1
//             WHEN NOT MATCHED THEN 
//                 INSERT (
//                     LabourId, 
//                     Date, 
//                     FirstPunch, 
//                     LastPunch, 
//                     TotalHours, 
//                     Overtime, 
//                     Status, 
//                     OvertimeManually,
//                     RemarkManually, 
//                     OnboardName, 
//                     LastUpdatedDate, 
//                     TimesUpdate
//                 )
//                 VALUES (
//                     Source.LabourId, 
//                     Source.Date, 
//                     Source.FirstPunch, 
//                     Source.LastPunch, 
//                     Source.TotalHours, 
//                     Source.Overtime, 
//                     Source.Status, 
//                     Source.OvertimeManually,
//                     Source.RemarkManually, 
//                     Source.OnboardName, 
//                     Source.LastUpdatedDate, 
//                     1
//                 );
//         `;

//         // Execute the query
//         await pool.request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('date', sql.Date, date)
//             .input('firstPunch', sql.VarChar, firstPunch)
//             .input('lastPunch', sql.VarChar, lastPunch)
//             .input('totalHours', sql.Float, totalHours)
//             .input('calculatedOvertime', sql.Float, calculatedOvertime)
//             .input('status', sql.VarChar, status)
//             .input('overtimeManually', sql.Float, overtimeManually)
//             .input('remarkManually', sql.VarChar, remarkManually)
//             .input('onboardName', sql.NVarChar, onboardName)
//             .query(query);

//         console.log('Upsert successful');
//     } catch (error) {
//         console.error('Error performing upsert:', error);
//         if (error.statusCode) {
//             throw error; // Custom error with statusCode and message
//         } else {
//             const serverError = new Error('Error updating attendance. Please try again later.');
//             serverError.statusCode = 500; // Internal Server Error
//             throw serverError;
//         }
//     }
// }

async function upsertAttendance({
    labourId,
    date,
    firstPunchManually,
    lastPunchManually,
    overtimeManually,
    remarkManually,
    workingHours,
    onboardName,
}) {
    let totalHours = 0;
    let status = 'A'; // Default: Absent
    let calculatedOvertime = 0;

    const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
    const halfDayHours = shiftHours === 9 ? 4.5 : 4;

    try {
        const pool = await poolPromise;

        // Check if the date is a holiday
        const holidayCheckResult = await pool.request()
            .input('date', sql.Date, date)
            .query(`
                SELECT HolidayDate 
                FROM [dbo].[HolidayDate]
                WHERE HolidayDate = @date
            `);

        if (holidayCheckResult.recordset.length > 0) {
            // If it's a holiday, prevent modifications
            const holidayError = new Error('The date is a holiday. You cannot modify punch times or overtime.');
            holidayError.statusCode = 400; // Bad Request
            throw holidayError;
        }

          // Calculate month and year for querying
          const month = new Date(date).getMonth() + 1; // JavaScript months are 0-indexed
          const year = new Date(date).getFullYear();
  
          // Check if TimesUpdate for any record exceeds the threshold
          const timesUpdateResult = await pool.request()
              .input('labourId', sql.NVarChar, labourId)
              .input('month', sql.Int, month)
              .input('year', sql.Int, year)
              .query(`
                  SELECT MAX(TimesUpdate) AS MaxTimesUpdate
                  FROM [LabourAttendanceDetails]
                  WHERE LabourId = @labourId
                    AND MONTH(Date) = @month
                    AND YEAR(Date) = @year
              `);
  
          const maxTimesUpdate = timesUpdateResult.recordset[0]?.MaxTimesUpdate || 0;
  
          if (maxTimesUpdate >= 3) {
              console.log('Maximum allowed edits for this month have been reached. It will be sent for Admin Approval.');
              await pool.request()
                  .input('labourId', sql.NVarChar, labourId)
                  .input('date', sql.Date, date)
                  .input('overtimeManually', sql.Float, overtimeManually)
                  .input('remarkManually', sql.VarChar, remarkManually)
                  .query(`
                      UPDATE [dbo].[LabourAttendanceDetails]
                      SET SentForApproval = 1, 
                          ApprovalStatus = 'Pending', 
                          OvertimeManually = @overtimeManually, 
                          RemarkManually = @remarkManually, 
                          LastUpdatedDate = GETDATE()
                      WHERE LabourId = @labourId AND Date = @date
                  `);
              return;
          }
        // Fetch the existing attendance record
        let existingFirstPunch = null;
        let existingLastPunch = null;

        const attendanceResult = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('date', sql.Date, date)
            .query(`
                SELECT FirstPunch, LastPunch, Status 
                FROM [LabourAttendanceDetails]
                WHERE LabourId = @labourId AND Date = @date
            `);

        if (attendanceResult.recordset.length > 0) {
            existingFirstPunch = attendanceResult.recordset[0].FirstPunch;
            existingLastPunch = attendanceResult.recordset[0].LastPunch;

            // If the current status is 'H', prevent modifications
            if (attendanceResult.recordset[0].Status === 'H') {
                throw new Error('The date is a holiday. You cannot modify punch times or overtime.');
            }
        }

        // Calculate TotalHours and Status
        const firstPunch = firstPunchManually || existingFirstPunch;
        const lastPunch = lastPunchManually || existingLastPunch;

        if (firstPunch && lastPunch) {
            const firstPunchTime = new Date(`${date}T${firstPunch}`);
            const lastPunchTime = new Date(`${date}T${lastPunch}`);

            totalHours = (lastPunchTime - firstPunchTime) / (1000 * 60 * 60); // Convert to hours

            if (totalHours >= shiftHours) {
                status = 'P'; // Present
                calculatedOvertime = totalHours > shiftHours ? totalHours - shiftHours : 0;
            } else if (totalHours >= halfDayHours) {
                status = 'HD'; // Half Day
            } else if (totalHours > 0) {
                status = 'MP'; // Miss Punch
            }
        } else if (overtimeManually) {
            // Use manually provided overtime if no punches are provided
            status = 'P'; // Mark as Present
            calculatedOvertime = parseFloat(overtimeManually);
        }

        // Round values
        totalHours = parseFloat(totalHours.toFixed(2));
        calculatedOvertime = parseFloat(calculatedOvertime.toFixed(2));
        

        // Update or Insert record
        const query = `
            MERGE INTO [LabourAttendanceDetails] AS Target
            USING (
                SELECT 
                    @labourId AS LabourId, 
                    @date AS Date, 
                    @firstPunch AS FirstPunch, 
                    @lastPunch AS LastPunch, 
                    @totalHours AS TotalHours, 
                    @calculatedOvertime AS Overtime, 
                    @status AS Status,
                    @overtimeManually AS OvertimeManually,
                    @remarkManually AS RemarkManually,
                    @onboardName AS OnboardName,
                    GETDATE() AS LastUpdatedDate
            ) AS Source
            ON Target.LabourId = Source.LabourId AND Target.Date = Source.Date
            WHEN MATCHED THEN 
                UPDATE SET 
                    FirstPunch = COALESCE(Source.FirstPunch, Target.FirstPunch),
                    LastPunch = COALESCE(Source.LastPunch, Target.LastPunch),
                    TotalHours = COALESCE(Source.TotalHours, Target.TotalHours),
                    Overtime = COALESCE(Source.Overtime, Target.Overtime),
                    Status = COALESCE(Source.Status, Target.Status),
                    OvertimeManually = COALESCE(Source.OvertimeManually, Target.OvertimeManually),
                    RemarkManually = COALESCE(Source.RemarkManually, Target.RemarkManually),
                    OnboardName = COALESCE(Source.OnboardName, Target.OnboardName),
                    LastUpdatedDate = Source.LastUpdatedDate,
                    TimesUpdate = ISNULL(Target.TimesUpdate, 0) + 1
            WHEN NOT MATCHED THEN 
                INSERT (
                    LabourId, 
                    Date, 
                    FirstPunch, 
                    LastPunch, 
                    TotalHours, 
                    Overtime, 
                    Status, 
                    OvertimeManually,
                    RemarkManually, 
                    OnboardName, 
                    LastUpdatedDate, 
                    TimesUpdate
                )
                VALUES (
                    Source.LabourId, 
                    Source.Date, 
                    Source.FirstPunch, 
                    Source.LastPunch, 
                    Source.TotalHours, 
                    Source.Overtime, 
                    Source.Status, 
                    Source.OvertimeManually,
                    Source.RemarkManually, 
                    Source.OnboardName, 
                    Source.LastUpdatedDate, 
                    1
                );
        `;

        // Execute the query
        await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('date', sql.Date, date)
            .input('firstPunch', sql.VarChar, firstPunch)
            .input('lastPunch', sql.VarChar, lastPunch)
            .input('totalHours', sql.Float, totalHours)
            .input('calculatedOvertime', sql.Float, calculatedOvertime)
            .input('status', sql.VarChar, status)
            .input('overtimeManually', sql.Float, overtimeManually)
            .input('remarkManually', sql.VarChar, remarkManually)
            .input('onboardName', sql.NVarChar, onboardName)
            .query(query);

        console.log('Upsert successful');
    } catch (error) {
        console.error('Error performing upsert:', error);
        if (error.statusCode) {
            throw error; // Custom error with statusCode and message
        } else {
            const serverError = new Error('Error updating attendance. Please try again later.');
            serverError.statusCode = 500; // Internal Server Error
            throw serverError;
        }
    }
}

// async function upsertAttendance({
//     labourId,
//     date,
//     firstPunchManually,
//     lastPunchManually,
//     overtimeManually,
//     remarkManually,
//     workingHours,
//     onboardName,
// }) {
//     let totalHours = 0;
//     let status = 'A'; // Default: Absent
//     let calculatedOvertime = 0;

//     const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//     const halfDayHours = shiftHours === 9 ? 4.5 : 4;

//     try {
//         const pool = await poolPromise;

//         // Check if the date is a holiday
//         const holidayCheckResult = await pool.request()
//             .input('date', sql.Date, date)
//             .query(`
//                 SELECT HolidayDate 
//                 FROM [dbo].[HolidayDate]
//                 WHERE HolidayDate = @date
//             `);

//         if (holidayCheckResult.recordset.length > 0) {
//             const holidayError = new Error('The date is a holiday. You cannot modify punch times or overtime.');
//             holidayError.statusCode = 400;
//             throw holidayError;
//         }


//         const attendanceResult = await pool.request()
//         .input('labourId', sql.NVarChar, labourId)
//         .input('date', sql.Date, date)
//         .query(`
//             SELECT TimesUpdate, SentForApproval, ApprovalStatus
//             FROM [dbo].[LabourAttendanceDetails]
//             WHERE LabourId = @labourId AND Date = @date
//         `);

//     let timesUpdate = 0;
//     let sentForApproval = false;
//     let approvalStatus = null;

//     if (attendanceResult.recordset.length > 0) {
//         const record = attendanceResult.recordset[0];
//         timesUpdate = record.TimesUpdate || 0;
//         sentForApproval = record.SentForApproval;
//         approvalStatus = record.ApprovalStatus;

//         if (approvalStatus === 'Pending') {
//             throw new Error('Attendance is pending admin approval and cannot be modified.');
//         }
//     }

//     // If updates exceed 3 times, send for admin approval
//     if (timesUpdate >= 3) {
//         await pool.request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('date', sql.Date, date)
//             .input('overtimeManually', sql.Float, overtimeManually || null)
//             .input('remarkManually', sql.VarChar, remarkManually || null)
//             .query(`
//                 UPDATE [dbo].[LabourAttendanceDetails]
//                 SET SentForApproval = 1,
//                     ApprovalStatus = 'Pending',
//                     OvertimeManually = @overtimeManually,
//                     RemarkManually = @remarkManually,
//                     LastUpdatedDate = GETDATE()
//                 WHERE LabourId = @labourId AND Date = @date
//             `);

//         return { success: true, message: "Attendance update sent for admin approval." };
//     }

//         // Calculate TotalHours and Status
//         const firstPunch = firstPunchManually 
//         const lastPunch = lastPunchManually 

//         if (firstPunch && lastPunch) {
//             const firstPunchTime = new Date(`${date}T${firstPunch}`);
//             const lastPunchTime = new Date(`${date}T${lastPunch}`);

//             totalHours = (lastPunchTime - firstPunchTime) / (1000 * 60 * 60); // Convert to hours

//             if (totalHours >= shiftHours) {
//                 status = 'P'; // Present
//                 calculatedOvertime = totalHours > shiftHours ? totalHours - shiftHours : 0;
//             } else if (totalHours >= halfDayHours) {
//                 status = 'HD'; // Half Day
//             } else if (totalHours > 0) {
//                 status = 'MP'; // Miss Punch
//             }
//         } else if (overtimeManually) {
//             status = 'P'; // Mark as Present
//             calculatedOvertime = parseFloat(overtimeManually);
//         }

//         // Round values
//         totalHours = parseFloat(totalHours.toFixed(2));
//         calculatedOvertime = parseFloat(calculatedOvertime.toFixed(2));

//         // // Check if the edit requires admin approval
//         // if (existingTimesUpdate >= 3) {
//         //     await pool.request()
//         //         .input('labourId', sql.NVarChar, labourId)
//         //         .input('date', sql.Date, date)
//         //         .input('overtimeManually', sql.Float, overtimeManually)
//         //         .input('remarkManually', sql.VarChar, remarkManually)
//         //         .query(`
//         //             UPDATE [LabourAttendanceDetails]
//         //             SET SentForApproval = 1,
//         //                 ApprovalStatus = 'Pending',
//         //                 OvertimeManually = @overtimeManually,
//         //                 RemarkManually = @remarkManually,
//         //                 LastUpdatedDate = GETDATE()
//         //             WHERE LabourId = @labourId AND Date = @date
//         //         `);
//         //     console.log('Attendance sent for admin approval.');
//         //     return;
//         // }

//         // Update or Insert record
//         const query = `
//             MERGE INTO [LabourAttendanceDetails] AS Target
//             USING (
//                 SELECT 
//                     @labourId AS LabourId, 
//                     @date AS Date, 
//                     @firstPunch AS FirstPunch, 
//                     @lastPunch AS LastPunch, 
//                     @totalHours AS TotalHours, 
//                     @calculatedOvertime AS Overtime, 
//                     @status AS Status,
//                     @overtimeManually AS OvertimeManually,
//                     @remarkManually AS RemarkManually,
//                     @onboardName AS OnboardName,
//                     GETDATE() AS LastUpdatedDate
//             ) AS Source
//             ON Target.LabourId = Source.LabourId AND Target.Date = Source.Date
//             WHEN MATCHED THEN 
//                 UPDATE SET 
//                     FirstPunch = COALESCE(Source.FirstPunch, Target.FirstPunch),
//                     LastPunch = COALESCE(Source.LastPunch, Target.LastPunch),
//                     TotalHours = COALESCE(Source.TotalHours, Target.TotalHours),
//                     Overtime = COALESCE(Source.Overtime, Target.Overtime),
//                     Status = COALESCE(Source.Status, Target.Status),
//                     OvertimeManually = COALESCE(Source.OvertimeManually, Target.OvertimeManually),
//                     RemarkManually = COALESCE(Source.RemarkManually, Target.RemarkManually),
//                     OnboardName = COALESCE(Source.OnboardName, Target.OnboardName),
//                     LastUpdatedDate = Source.LastUpdatedDate,
//                     TimesUpdate = ISNULL(Target.TimesUpdate, 0) + 1
//             WHEN NOT MATCHED THEN 
//                 INSERT (
//                     LabourId, 
//                     Date, 
//                     FirstPunch, 
//                     LastPunch, 
//                     TotalHours, 
//                     Overtime, 
//                     Status, 
//                     OvertimeManually,
//                     RemarkManually, 
//                     OnboardName, 
//                     LastUpdatedDate, 
//                     TimesUpdate
//                 )
//                 VALUES (
//                     Source.LabourId, 
//                     Source.Date, 
//                     Source.FirstPunch, 
//                     Source.LastPunch, 
//                     Source.TotalHours, 
//                     Source.Overtime, 
//                     Source.Status, 
//                     Source.OvertimeManually,
//                     Source.RemarkManually, 
//                     Source.OnboardName, 
//                     Source.LastUpdatedDate, 
//                     1
//                 );
//         `;

//         // Execute the query
//         await pool.request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('date', sql.Date, date)
//             .input('firstPunch', sql.VarChar, firstPunch)
//             .input('lastPunch', sql.VarChar, lastPunch)
//             .input('totalHours', sql.Float, totalHours)
//             .input('calculatedOvertime', sql.Float, calculatedOvertime)
//             .input('status', sql.VarChar, status)
//             .input('overtimeManually', sql.Float, overtimeManually)
//             .input('remarkManually', sql.VarChar, remarkManually)
//             .input('onboardName', sql.NVarChar, onboardName)
//             .query(query);

//         console.log('Upsert successful');
//     } catch (error) {
//         console.error('Error performing upsert:', error);
//         if (error.statusCode) {
//             throw error;
//         } else {
//             const serverError = new Error('Error updating attendance. Please try again later.');
//             serverError.statusCode = 500;
//             throw serverError;
//         }
//     }
// }


// ------------------------------------   Excel sheet import and Export funnciton --------------------

async function getAttendanceByDateRange(projectName, startDate, endDate) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('projectName', sql.Int, projectName)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(
        `SELECT AttendanceId, LabourId, Date, projectName, FirstPunchManually, LastPunchManually, OvertimeManually, RemarkManually 
         FROM LabourAttendanceDetails 
         WHERE ProjectName = @projectName AND Date BETWEEN @startDate AND @endDate`
      );
    return result.recordset;
  }
  

  
//   ----------------------------------------------------------      IMP changes in 06-12-2024-------
  async function getMatchedRows(data) {
    const pool = await poolPromise;
    const matchedRows = [];
    const unmatchedRows = [];
  
    for (const row of data) {
      const result = await pool
        .request()
        .input('AttendanceId', sql.Int, row.AttendanceId)
        .input('LabourId', sql.VarChar(50), row.LabourId)
        .input('Date', sql.Date, row.Date)
        .query(
          `SELECT AttendanceId, LabourId, Date 
           FROM LabourAttendanceDetails
           WHERE AttendanceId = @AttendanceId AND LabourId = @LabourId AND Date = @Date`
        );
  
      if (result.recordset.length > 0) {
        console.log(`Row matched:`, row);
        matchedRows.push(row);
      } else {
        console.log(`Row unmatched:`, row);
        unmatchedRows.push(row);
      }
    }
  
    return { matchedRows, unmatchedRows };
  }
  
  async function updateMatchedRows(data) {
    const pool = await poolPromise;
  
    for (const row of data) {
      await pool
        .request()
        .input('AttendanceId', sql.Int, row.AttendanceId)
        .input('LabourId', sql.VarChar(50), row.LabourId)
        .input('Date', sql.Date, row.Date)
        .input('FirstPunchManually', sql.NVarChar(255), row.FirstPunchManually || null)
        .input('LastPunchManually', sql.NVarChar(255), row.LastPunchManually || null)
        .input('OvertimeManually', sql.Decimal(18, 2), row.OvertimeManually || null)
        .input('RemarkManually', sql.NVarChar(255), row.RemarkManually || null)
        .query(
          `UPDATE LabourAttendanceDetails
           SET FirstPunchManually = @FirstPunchManually,
               LastPunchManually = @LastPunchManually,
               OvertimeManually = @OvertimeManually,
               RemarkManually = @RemarkManually
           WHERE AttendanceId = @AttendanceId AND LabourId = @LabourId AND Date = @Date`
        );
  
      console.log(`Row updated:`, row);
    }
  }
  
  async function insertUnmatchedRows(data) {
    const pool = await poolPromise;
    const table = new sql.Table('LabourAttendanceDetails');
    table.columns.add('AttendanceId', sql.Int);
    table.columns.add('LabourId', sql.VarChar(50));
    table.columns.add('Date', sql.Date);
    table.columns.add('FirstPunchManually', sql.NVarChar(255));
    table.columns.add('LastPunchManually', sql.NVarChar(255));
    table.columns.add('OvertimeManually', sql.Decimal(18, 2));
    table.columns.add('RemarkManually', sql.NVarChar(255));
  
    data.forEach((row) => {
      table.rows.add(
        row.AttendanceId,
        row.LabourId,
        row.Date,
        row.FirstPunchManually || null,
        row.LastPunchManually || null,
        row.OvertimeManually || null,
        row.RemarkManually || null
      );
      console.log(`Row to insert:`, row);
    });
  
    await pool.request().bulk(table);
    console.log(`All unmatched rows inserted.`);
  }
// ------------------------   ////////////////////////////////////----------end -------  
  

// ---------------------------------------------------------------------------------------

// // Fetch attendance by Labour ID
// async function getAttendanceByLabourId(labourId, month, year) {
//     try {
//         console.log('Fetching attendance from DB for:', { labourId, month, year });
//         const pool = await poolPromise3;
//         const result = await pool
//             .request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('month', sql.Int, month)
//             .input('year', sql.Int, year)
//             .query(`
//                 SELECT * FROM [dbo].[Attendance]
//                 WHERE user_id = @labourId
//                 AND MONTH(punch_date) = @month
//                 AND YEAR(punch_date) = @year
//                 ORDER BY punch_date, punch_time
//             `);
//         return result.recordset;
//     } catch (err) {
//         console.error('SQL error', err);
//         throw new Error('Error fetching attendance data');
//     }
// };

// // Fetch approved Labour IDs with working hours
// async function getAllApprovedLabours() {
//     try {
//         console.log('Attempting to connect to the database...');
//         const pool = await poolPromise;
//         const result = await pool
//             .request()
//             .query(`SELECT LabourID AS labourId, workingHours FROM [dbo].[labourOnboarding] WHERE status = 'Approved'`);
//         console.log('Fetched approved labours:', result.recordset);
//         return result.recordset; // Returns an array of approved labour IDs and working hours
//     } catch (err) {
//         console.error('SQL error fetching approved labour IDs', err);
//         throw new Error('Error fetching approved labour IDs');
//     }
// }

// // Fetch labour details by ID
// async function getLabourDetailsById(labourId) {
//     try {
//         console.log('Fetching labour details from DB for:', labourId);
//         const pool = await poolPromise;
//         const result = await pool
//             .request()
//             .input('labourId', sql.NVarChar, labourId)
//             .query(`SELECT LabourID AS labourId, workingHours FROM [dbo].[labourOnboarding] WHERE LabourID = @labourId`);
//         console.log('Fetched labour details:', result.recordset[0]);
//         return result.recordset[0];
//     } catch (err) {
//         console.error('SQL error fetching labour details', err);
//         throw new Error('Error fetching labour details');
//     }
// }

// // Helper function to determine if a given date is a holiday
// async function isHoliday(date) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('date', sql.Date, date)
//             .query(`
//                 SELECT * 
//                 FROM [dbo].[HolidayDate] 
//                 WHERE HolidayDate = @date
//             `);
//         return result.recordset.length > 0;
//     } catch (err) {
//         console.error('Error checking if date is a holiday', err);
//         throw new Error('Error checking if date is a holiday');
//     }
// }

// // Helper function to determine if a given date is a weekly off
// async function isWeeklyOff(labourId, date) {
//     // Fetch weekly off details from the database or configuration
//     // For simplicity, assume that Sunday is a fixed weekly off
//     try {
//         const dayOfWeek = new Date(date).getDay();
//         return dayOfWeek === 0; // 0 represents Sunday
//     } catch (err) {
//         console.error('Error checking if date is a weekly off', err);
//         throw new Error('Error checking if date is a weekly off');
//     }
// }

// // Helper function to handle attendance approval
// async function approveAttendance(labourId, date) {
//     try {
//         const pool = await poolPromise;
//         await pool.request()
//             .input('labourId', sql.NVarChar(50), labourId) // Adjusted length to prevent truncation
//             .input('date', sql.Date, date)
//             .query(`UPDATE [dbo].[DailyAttendance] SET status = 'Approved' WHERE LabourID = @labourId AND punch_date = @date`);
//     } catch (err) {
//         console.error('Error approving attendance', err);
//         throw new Error('Error approving attendance');
//     }
// }




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
    registerDataUpdateDisable,
    updateData,
    editLabour,
    updateDataDisableStatus,
    // getCombinedStatuses
    getLabourStatuses,
    updateHideResubmit,
    getAttendanceByLabourId,
    // submitAttendance,
    approveDisableLabours,
    // getAllApprovedLabourIds,
    // getAttendanceForAllLabours
    // getEsslStatuses,
    // getEmployeeMasterStatuses,
    // updateLabour,
    getAllApprovedLabours,
    getLabourDetailsById,
    isHoliday,
    // isWeeklyOff,
    getMissPunchCount,
    addMissPunch,
    addApprovalRequest,
    addWeeklyOff,
    saveWeeklyOffs,
    insertIntoLabourAttendanceSummary,
    insertIntoLabourAttendanceDetails,
    deleteAttendanceDetails,
    deleteAttendanceSummary,
    fetchAttendanceSummary,
    fetchAttendanceDetails,
    fetchAttendanceByMonthYear,
    fetchAttendanceDetailsByMonthYear,
    fetchAttendanceDetailsByMonthYearForSingleLabour,
    upsertAttendance,
    getAttendanceByDateRange,
    // bulkInsertAttendance,
    getMatchedRows,
    updateMatchedRows,
    insertUnmatchedRows,
    getAttendanceByLabourIdForDate,
    insertOrUpdateLabourAttendanceSummary,
    getTimesUpdateForMonth,
    markAttendanceForApproval
    // approveAttendance

};