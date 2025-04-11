const { poolPromise2 } = require('../config/dbConfig2');
const {sql, poolPromise } = require('../config/dbConfig');  
const { poolPromise3 } = require('../config/dbConfig3');
// const sql = require('mssql');


async function checkAadhaarExists(aadhaarNumber) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('aadhaarNumber', aadhaarNumber)
            .query('SELECT LabourID, status, isApproved FROM [dbo].[labourOnboarding] WHERE aadhaarNumber = @aadhaarNumber');
            return result.recordset.length > 0 ? result.recordset : null;
    } catch (error) {
        console.error('Error checking Aadhaar number:', error);
        throw new Error('Error checking Aadhaar number');
    }
};


// async function getNextUniqueID() {
//     try {
//         const pool = await poolPromise;
        
//         // Fetch the maximum LabourID while excluding specific IDs
//         let lastIDResult = await pool.request().query(`
//             SELECT MAX(LabourID) AS lastID 
//             FROM labourOnboarding 
//             WHERE LabourID NOT IN ('JCO519', 'VJ3893')
//         `);

//         let initialID = 'JC4008'; // The starting ID
//         let nextID = initialID;

//         if (lastIDResult.recordset[0].lastID) {
//             let lastID = lastIDResult.recordset[0].lastID;

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


async function getNextUniqueID(departmentId) {
    try {
        const pool = await poolPromise;

        let prefix = 'JC';
        let initialID = 'JC4008';
        const exclusions = `'JCO519', 'VJ3893'`;

        if (departmentId === 334) {
            prefix = 'JIH';
            initialID = 'JIH0001';
        }

        let lastIDQuery = '';

        if (departmentId === 334) {
            lastIDQuery = `
                SELECT MAX(LabourID) AS lastID 
                FROM labourOnboarding 
                WHERE LabourID NOT IN (${exclusions}) 
                AND departmentId = ${departmentId} and LabourID like '%JIH%'
            `;
        } else {
            lastIDQuery = `
                SELECT MAX(LabourID) AS lastID 
                FROM labourOnboarding 
                WHERE LabourID NOT IN (${exclusions}) and LabourID like '%JC%'
            `;
        }

        const result = await pool.request().query(lastIDQuery);
        const lastID = result.recordset[0].lastID;

        if (!lastID) {
            return initialID;
        }

        const numericPart = parseInt(lastID.slice(prefix.length)) + 1;
        const nextID = `${prefix}${numericPart.toString().padStart(4, '0')}`;

        return nextID;
    } catch (error) {
        throw new Error(`Error fetching next unique ID: ${error.message}`);
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

      //console.log('Inserting data into database for OnboardName:', labourData.OnboardName);
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
      //console.log('Data successfully inserted for OnboardName:', labourData.OnboardName);
      return result.recordset;
  } catch (error) {
      throw error;
  }
}




async function updateData(labourData) {
    try {
        //console.log("labourData:........vaibhav now", labourData);

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

        //console.log("Updating LabourID:", labourData.LabourID);
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

        //console.log("Executing SQL Update...");
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

        //console.log("Update successful:", updateResult.rowsAffected[0], "rows updated.");

        // Fetch the updated record to return it
        const fetchResult = await request.query(`
            SELECT * FROM labourOnboarding WHERE LabourID = @LabourID
        `);
        //console.log('Data successfully inserted for OnboardName Edit button:', labourData.OnboardName);
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
        //console.log('Data successfully inserted for OnboardName Resubmmit button:', labourData.OnboardName);
        return result.recordset;
    } catch (error) {
        throw error;
    };
};
    // try {
    //     //console.log("labourData:", labourData);

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

    //     // //console.log("Updating LabourID:", labourData.LabourID);
    //     // request.input('LabourID', sql.NVarChar, labourData.LabourID);

    //     const finalOnboardName = labourData.OnboardName ? labourData.OnboardName : ''; // Fallback to empty string if undefined
    //     labourData.OnboardName = finalOnboardName;

    //     // New Logic: Check labourStatus to set LabourID, status, empId, and isApproved fields
    //     // if (labourData.status === 'Disable' && labourData.isApproved == 4) {
    //     //     //console.log('Labour is disabled and approved. Setting status to Pending, isApproved to 0, and LabourID to NULL');
            
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

    //     //console.log("Executing SQL Update...");
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

    //     //console.log("Update successful:", updateResult.rowsAffected[0], "rows updated.");
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
        //console.log('Data successfully inserted for OnboardName Resubmmit button:', labourData.OnboardName);
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
          status, isApproved, title, Marital_Status, companyName, Induction_Date, Inducted_By, uploadInductionDoc, OnboardName, ValidTill, location, ConfirmDate, retirementDate, SalaryBu, WorkingBu, CreationDate, businessUnit, departmentId, designationId, labourCategoryId, departmentName) 
          VALUES (
          @LabourID, @labourOwnership, @uploadAadhaarFront, @uploadAadhaarBack, @uploadIdProof, @name, @aadhaarNumber,
          @dateOfBirth, @contactNumber, @gender, @dateOfJoining, @Group_Join_Date, @From_Date, @Period, @address, @pincode, @taluka, @district, @village,
          @state, @emergencyContact, @photoSrc, @bankName, @branch, @accountNumber, @ifscCode, @projectName,
          @labourCategory, @department, @workingHours, @contractorName, @contractorNumber, @designation,
          'Pending', 0, @title, @Marital_Status, @companyName, @Induction_Date, @Inducted_By, @uploadInductionDoc, @OnboardName,  @ValidTill, @location, @ConfirmDate, @retirementDate, @SalaryBu, @WorkingBu, @CreationDate, @businessUnit, @departmentId, @designationId, @labourCategoryId, @departmentName)
        `);
        //console.log('Data successfully inserted for OnboardName Resubmmit button:', labourData.OnboardName);
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

//         // //console.log('Received updatedData:', updatedData);  

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
//                 //console.log(`Setting parameter ${index}:`, { value, type: typeof value });

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
//         //console.log("LabourID is present:", updatedData.LabourID);  // Debugging output
//         updateQuery += "status = @status, IsApproved = @IsApproved WHERE id = @id";
//         request.input('status', 'Approved');  // Set status to 'Approved'
//         request.input('IsApproved', 1);       // Set IsApproved to 1
//     } else {
//         // LabourID is null, undefined, an empty string, or explicitly the string 'null'
//         //console.log("LabourID is null, undefined, or an empty string:", updatedData.LabourID);  // Debugging output
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
            .query('SELECT * FROM labourOnboarding WHERE name LIKE @query OR aadhaarNumber LIKE @query OR LabourID LIKE @query OR OnboardName LIKE @query OR workingHours LIKE @query OR businessUnit LIKE @query OR designation LIKE @query');
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
};


async function approveLabour(id, nextID) {
    try {
        const pool = await poolPromise;
        const now = new Date();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('LabourID', sql.VarChar, nextID)
            .input('ApproveLabourDate', sql.DateTime, now)
            .query("UPDATE labourOnboarding SET status = 'Approved', isApproved = 1, LabourID = @LabourID, ApproveLabourDate = @ApproveLabourDate WHERE id = @id AND (status = 'Pending' OR status = 'Rejected')");
        
        //console.log('Database update result:', result);

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
        
        //console.log('Database update result:', result);

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
//             //console.log("Essl Status Query Result:", esslResult.recordset);
//         const employeeMasterResult = await pool.request()
//             .query('SELECT userId, employeeMasterStatus FROM [dbo].[API_ResponsePayloads]');
//             //console.log("Employee Master Status Query Result:", employeeMasterResult.recordset);

//         // Handle and validate userId properly
//         const esslStatusMap = esslResult.recordset.reduce((map, record) => {
//             const userId = validateId(record.userId);
//             //console.log(userId,"sadasdasdsadsad") // Ensure valid userId (as an int)
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
//         //console.log('Fetching attendance from DB for:', { labourId, month, year });
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
//             //console.log('SQL Result:', result.recordset);
//         return result.recordset;
//     } catch (err) {
//         console.error('SQL error', err);
//         throw new Error('Error fetching attendance data');
//     }
// };



// // Fetch Approved Labour IDs
// async function getAllApprovedLabourIds() {
//     try {
//         //console.log('Attempting to connect to the database...');
        
//         const pool = await poolPromise;
        
//         //console.log('Connected to the database. Executing query...');
        
//         const result = await pool
//             .request()
//             .query(`SELECT LabourID AS labourId FROM [dbo].[labourOnboarding] WHERE status = 'Approved'`);
        
//         //console.log('Fetched approved labour IDs:', result.recordset);
        
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

//         //console.log(`Fetched attendance for labour ID ${labourIds}:`, result.recordset);
//         return result.recordset;
//     } catch (err) {
//         console.error('SQL error fetching attendance data', err);
//         throw new Error('Error fetching attendance data');
//     }
// }




// Updated Model (model.js)
// async function getAttendanceByLabourId(labourId, month, year) {
//     try {
//         //console.log('Fetching attendance from DB for:', { labourId, month, year });
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
//         // //console.log('SQL Result:', result.recordset);
//         return result.recordset;
//     } catch (err) {
//         console.error('SQL error', err);
//         throw new Error('Error fetching attendance data');
//     }
// };

// // Fetch Approved Labour IDs
// async function getAllApprovedLabourIds() {
//     try {
//         //console.log('Attempting to connect to the database...');
//         const pool = await poolPromise;
//         const result = await pool
//             .request()
//             .query(`SELECT LabourID AS labourId FROM [dbo].[labourOnboarding] WHERE status = 'Approved'`);
//         //console.log('Fetched approved labour IDs:', result.recordset);
//         return result.recordset; // Returns an array of approved labour IDs
//     } catch (err) {
//         console.error('SQL error fetching approved labour IDs', err);
//         throw new Error('Error fetching approved labour IDs');
//     }
// }

// ------------------------------------------------------------------------  LABOUR PHASE 2 -------------------------------------------
// ------------------------------------------------------------------------  ATTENDANCE MODUL -------------------------------------------

async function getAttendanceByLabourId(labourId, month, year) {
    try {
        //console.log('Fetching attendance from DB for:', { labourId, month, year });
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
        // //console.log('SQL Result:', result.recordset);
        return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw new Error('Error fetching attendance data');
    }
};

// Fetch Approved Labour IDs with Working Hours
async function getAllApprovedLabours() {
    try {
        //console.log('Attempting to connect to the database...');
        const pool = await poolPromise;
        const result = await pool
            .request()
            .query(`SELECT LabourID AS labourId, workingHours, projectName FROM [LabourOnboardingForm].[dbo].[labourOnboarding] WHERE status = 'Approved'`);
        //console.log('Fetched approved labours:', result.recordset);
        return result.recordset; // Returns an array of approved labour IDs and working hours
    } catch (err) {
        console.error('SQL error fetching approved labour IDs', err);
        throw new Error('Error fetching approved labour IDs');
    }
}

// Fetch Labour Details by ID
async function getLabourDetailsById(labourId) {
    try {
        //console.log('Fetching labour details from DB for:', labourId);
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input('labourId', sql.NVarChar, labourId)
            .query(`SELECT LabourID AS labourId, workingHours FROM [dbo].[labourOnboarding] WHERE LabourID = @labourId`);
        //console.log('Fetched labour details:', result.recordset[0]);
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
        //console.log('Fetching attendance from DB for:', { labourId, date });
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
                FROM [dbo].[LabourAttendanceSummary] 
                WHERE LabourId = @LabourId AND SelectedMonth = @SelectedMonth
            `);

        if (existingRecord.recordset[0].count > 0) {
            //console.log(`Record already exists for LabourId: ${summary.labourId} in month: ${summary.selectedMonth}`);
            return; 
        }

        const query = `
            INSERT INTO [dbo].[LabourAttendanceSummary] (
                LabourId, TotalDays, PresentDays, HalfDays, AbsentDays, MissPunchDays,
                TotalOvertimeHours, Shift, CreationDate, SelectedMonth, Date
            ) VALUES (
                @LabourId, @TotalDays, @PresentDays, @HalfDays, @AbsentDays, @MissPunchDays,
                @TotalOvertimeHours, @Shift, @CreationDate, @SelectedMonth, @Date
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
            .input('Date', sql.Date, summary.date)
            .query(query);

        //console.log(`Inserted summary for LabourId: ${summary.labourId}`);
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
                FROM [dbo].[LabourAttendanceDetails]
                WHERE LabourId = @LabourId AND Date = @Date
            )
            BEGIN
                INSERT INTO [dbo].[LabourAttendanceDetails] (
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

        //console.log(`Attempted to insert details for LabourId: ${details.labourId} on Date: ${details.date}`);
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

//         //console.log(`Inserted details for LabourId: ${details.labourId} on Date: ${details.date}`);
//     } catch (err) {
//         console.error('Error inserting into LabourAttendanceDetails:', err);
//         throw err;
//     }
// }



async function insertOrUpdateLabourAttendanceSummary(labourId, date) {
    // //console.log('date++__++__++__',date)
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
                    SUM(Overtime) AS TotalOvertimeHours,
                    SUM(OvertimeManually) AS TotalOvertimeHoursManually
                FROM LabourAttendanceDetails
                WHERE LabourId = @LabourId
                AND FORMAT(Date, 'yyyy-MM') = @SelectedMonth
            `);

        const { TotalDays, PresentDays, HalfDays, AbsentDays, MissPunchDays, TotalOvertimeHours, TotalOvertimeHoursManually } =
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
                .input('TotalOvertimeHoursManually', sql.Float, TotalOvertimeHoursManually)
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
                        TotalOvertimeHoursManually = @TotalOvertimeHoursManually,
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
                .input('TotalOvertimeHoursManually', sql.Float, TotalOvertimeHoursManually)
                .input('CreationDate', sql.DateTime, new Date())
                .input('SelectedMonth', sql.NVarChar, date.substring(0, 7))
                .query(`
                    INSERT INTO LabourAttendanceSummary (
                        LabourId, TotalDays, PresentDays, HalfDays, AbsentDays, MissPunchDays,
                        TotalOvertimeHours, TotalOvertimeHoursManually, CreationDate, SelectedMonth
                    ) VALUES (
                        @LabourId, @TotalDays, @PresentDays, @HalfDays, @AbsentDays, @MissPunchDays,
                        @TotalOvertimeHours, @TotalOvertimeHoursManually, @CreationDate, @SelectedMonth
                    )
                `);

            console.log(`Inserted summary for LabourId: ${labourId} in month: ${date.substring(0, 7)}`);
        }
    } catch (err) {
        console.error('Error in insertOrUpdateLabourAttendanceSummary:', err);
        throw err;
    }
};


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

async function showAttendanceCalenderSingleLabour(labourId, month, year) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                SELECT 
                    att.Date,
                    CASE 
                        WHEN hol.HolidayDate IS NOT NULL THEN 'H'
                        ELSE ISNULL(att.Status, 'NA')
                    END AS Status
                FROM [dbo].[LabourAttendanceDetails] att
                LEFT JOIN [dbo].[HolidayDate] hol
                ON att.Date = hol.HolidayDate
                WHERE 
                    att.LabourId = @labourId
                    AND MONTH(att.Date) = @month
                    AND YEAR(att.Date) = @year
            `);

        return result.recordset.map(row => ({
            Date: row.Date,
            Status: row.Status || 'NA',
        }));
    } catch (error) {
        console.error('Error fetching attendance details for a single labour:', error);
        throw error;
    }
};

async function getHolidayDates(month, year) {
    try {
        // Ensure month is two digits
        const formattedMonth = String(month).padStart(2, '0');

        // Create startDate as the first day of the month
        const startDate = `${year}-${formattedMonth}-01`;

        // Calculate the last day of the month
        const endDateObj = new Date(year, month, 0); // Month is 1-indexed here
        const lastDay = endDateObj.getDate();
        const endDate = `${year}-${formattedMonth}-${String(lastDay).padStart(2, '0')}`;

        // Await the pool connection
        const pool = await poolPromise;

        // Use parameterized queries to prevent SQL injection
        const query = `
            SELECT CONVERT(VARCHAR(10), HolidayDate, 120) AS HolidayDate
            FROM [dbo].[HolidayDate]
            WHERE HolidayDate BETWEEN @startDate AND @endDate
        `;

        // Execute the query with parameters
        const result = await pool.request()
            .input('startDate', startDate)
            .input('endDate', endDate)
            .query(query);

        // Extract and return the holiday dates
        return result.recordset.map(holiday => holiday.HolidayDate);
    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error fetching holiday dates:', error);

        // You can choose to throw the error to be handled by the caller
        throw new Error('Failed to retrieve holiday dates. Please try again later.');
    }
};


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

async function markAttendanceForApproval(
    AttendanceId,
    labourId, 
    date, 
    overtimeManually, 
    firstPunchManually, 
    lastPunchManually, 
    remarkManually, 
    finalOnboardName
) {
    try {
        if (AttendanceId === undefined || AttendanceId === null || isNaN(AttendanceId)) {
            throw new Error('AttendanceId must be a valid number and cannot be empty.');
        }
        const pool = await poolPromise;
        const request = pool.request();

        // Bind inputs for both queries
        request.input('AttendanceId', sql.Int, AttendanceId);
        request.input('labourId', sql.NVarChar, labourId);
        request.input('date', sql.Date, date);
        request.input('overtimeManually', sql.Float, overtimeManually || null);
        request.input('remarkManually', sql.VarChar, remarkManually || null);
        request.input('finalOnboardName', sql.VarChar, finalOnboardName || null);
        request.input('firstPunchManually', sql.VarChar, firstPunchManually || null);
        request.input('lastPunchManually', sql.VarChar, lastPunchManually || null);

        // Perform the UPDATE query
        await request.query(`
            UPDATE [LabourAttendanceDetails]
            SET SentForApproval = 1,
                ApprovalStatus = 'Pending',
                OvertimeManually = @overtimeManually,
                RemarkManually = @remarkManually,
                OnboardName = @finalOnboardName,
                LastUpdatedDate = GETDATE()
            WHERE LabourId = @labourId AND Date = @date
        `);

        // Perform the INSERT query
        await request.query(`
            INSERT INTO LabourAttendanceApproval (
              AttendanceId, LabourId, Date, OvertimeManually, RemarkManually, OnboardName, FirstPunchManually, LastPunchManually
            )
            VALUES (
              @AttendanceId, @labourId, @date, @overtimeManually, @remarkManually, @finalOnboardName, @firstPunchManually, @lastPunchManually
            )
        `);

        //console.log('Attendance marked for admin approval.');
    } catch (error) {
        console.error('Error marking attendance for approval:', error);
        throw new Error('Error marking attendance for admin approval.');
    }
}

async function approveAttendance(id) {
    try {
        const pool = await poolPromise;

        // Fetch the approval record
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT *
                FROM LabourAttendanceApproval
                WHERE id = @id
            `);

        if (result.recordset.length === 0) {
            throw new Error('Approval record not found.');
        }

        const approvalData = result.recordset[0];

        // Extract only the date part of the Date field
        const formattedDate = approvalData.Date.toISOString().split('T')[0];

        console.log('Approval Data:', {
            ...approvalData,
            Date: formattedDate,
        });

        // Call upsertAttendance to handle insertion or update of LabourAttendanceDetails
        await upsertAttendance({
            labourId: approvalData.LabourId,
            date: formattedDate,
            firstPunchManually: approvalData.FirstPunchManually,
            lastPunchManually: approvalData.LastPunchManually,
            overtimeManually: approvalData.OvertimeManually,
            remarkManually: approvalData.RemarkManually,
            workingHours: approvalData.WorkingHours,
            onboardName: approvalData.OnboardName,
        });

        // Update the LabourAttendanceApproval table with 'Approved' status
        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE LabourAttendanceApproval
                SET ApprovalStatus = 'Approved',
                    ApprovalDate = GETDATE()
                WHERE id = @id
            `);

        // Update the LabourAttendanceDetails table with 'Approved' status
        await pool.request()
            .input('labourId', sql.NVarChar, approvalData.LabourId)
            .input('date', sql.Date, formattedDate)
            .input('isApprovedAttendance', sql.Bit, 1)
            .query(`
                UPDATE LabourAttendanceDetails
                SET ApprovalStatus = 'Approved',
                    ApprovalDate = GETDATE(),
                    isApprovedAttendance = @isApprovedAttendance
                WHERE LabourId = @labourId AND Date = @date
            `);

        console.log('Attendance approved and updated successfully.');
        return { success: true, message: 'Attendance approved successfully.' };
    } catch (error) {
        console.error('Error approving attendance:', error);
        throw new Error('Error approving attendance.');
    }
}


async function rejectAttendanceAdmin(id, rejectReason) {
    try {
        const pool = await poolPromise;

        // Fetch the approval record
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT *
                FROM LabourAttendanceApproval
                WHERE id = @id
            `);

        if (result.recordset.length === 0) {
            throw new Error('Approval record not found.');
        }

        const approvalData = result.recordset[0];

        // Extract only the date part of the Date field
        const formattedDate = approvalData.Date.toISOString().split('T')[0];

        //console.log('Approval Data:', {
        //     ...approvalData,
        //     Date: formattedDate,
        // });

        // Call upsertAttendance to handle insertion or update of LabourAttendanceDetails
        await upsertAttendance({
            labourId: approvalData.LabourId,
            date: formattedDate,
            firstPunchManually: approvalData.FirstPunchManually,
            lastPunchManually: approvalData.LastPunchManually,
            overtimeManually: approvalData.OvertimeManually,
            remarkManually: approvalData.RemarkManually,
            workingHours: approvalData.WorkingHours,
            onboardName: approvalData.OnboardName,
        });

        // Update the LabourAttendanceApproval table with 'Approved' status
        await pool.request()
            .input('id', sql.Int, id)
            .input('rejectReason', sql.NVarChar, rejectReason)
            .query(`
                UPDATE LabourAttendanceApproval
                SET ApprovalStatus = 'Rejected',
                    RejectedDate = GETDATE(),
                    RejectAttendanceReason = @rejectReason
                WHERE id = @id
            `);

        // Update the LabourAttendanceDetails table with 'Approved' status
        await pool.request()
            .input('labourId', sql.NVarChar, approvalData.LabourId)
            .input('date', sql.Date, formattedDate)
            .input('isRejectedAttendance', sql.Bit, 1)
            .query(`
                UPDATE LabourAttendanceDetails
                SET ApprovalStatus = 'Rejected',
                    RejectedDate = GETDATE(),
                    isRejectedAttendance = @isRejectedAttendance
                WHERE LabourId = @labourId AND Date = @date
            `);

        //console.log('Attendance Rejected and updated successfully.');
        return { success: true, message: 'Attendance Rejected successfully.' };
    } catch (error) {
        console.error('Error approving attendance:', error);
        throw new Error('Error approving attendance.');
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

//           // Calculate month and year for querying
//           const month = new Date(date).getMonth() + 1; // JavaScript months are 0-indexed
//           const year = new Date(date).getFullYear();
  
//           // Check if TimesUpdate for any record exceeds the threshold
//           const timesUpdateResult = await pool.request()
//               .input('labourId', sql.NVarChar, labourId)
//               .input('month', sql.Int, month)
//               .input('year', sql.Int, year)
//               .query(`
//                   SELECT MAX(TimesUpdate) AS MaxTimesUpdate
//                   FROM [LabourAttendanceDetails]
//                   WHERE LabourId = @labourId
//                     AND MONTH(Date) = @month
//                     AND YEAR(Date) = @year
//               `);
  
//           const maxTimesUpdate = timesUpdateResult.recordset[0]?.MaxTimesUpdate || 0;
  
//           if (maxTimesUpdate >= 3) {
//               //console.log('Maximum allowed edits for this month have been reached. It will be sent for Admin Approval.');
//               await pool.request()
//                   .input('labourId', sql.NVarChar, labourId)
//                   .input('date', sql.Date, date)
//                   .input('overtimeManually', sql.Float, overtimeManually)
//                   .input('remarkManually', sql.VarChar, remarkManually)
//                   .query(`
//                       UPDATE [dbo].[LabourAttendanceDetails]
//                       SET SentForApproval = 1, 
//                           ApprovalStatus = 'Pending', 
//                           OvertimeManually = @overtimeManually, 
//                           RemarkManually = @remarkManually, 
//                           LastUpdatedDate = GETDATE()
//                       WHERE LabourId = @labourId AND Date = @date
//                   `);
//               return;
//           }
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

//         //console.log('Upsert successful');
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

/**
 * ---------------------------------------
 * HELPER FUNCTIONS
 * ---------------------------------------
 */

/**
 * Formats a given time string to "HH:MM:SS" format.
 * Returns "-" if the time is invalid.
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
 */
function calculateHoursWorked(punchDate, firstPunch, lastPunch) {
    try {
        const punchDateStr = punchDate.toISOString().split('T')[0]; // e.g. "2025-02-01"
        const punchInTime  = new Date(`${punchDateStr}T${firstPunch.toISOString().split('T')[1]}`);
        const punchOutTime = new Date(`${punchDateStr}T${lastPunch.toISOString().split('T')[1]}`);

        const totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60); // milliseconds -> hours

        if (isNaN(totalHours) || totalHours < 0) {
            console.warn(`Invalid totalHours. Setting to 0. 
                punchDate=${punchDate}, firstPunch=${firstPunch}, lastPunch=${lastPunch}`);
            return 0;
        }

        return parseFloat(totalHours.toFixed(2));  // 2 decimal places
    } catch (error) {
        console.error(`Error in calculateHoursWorked: ${error.message}`);
        return 0;
    }
}

/** 
 * Determines shift hours based on workingHours string.
 */
function getShiftHours(workingHours) {
    return workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
}

/**
 * Determines half-day threshold based on shift hours.
 */
function getHalfDayHours(shiftHours) {
    return shiftHours === 9 ? 4.5 : 4;
}

/**
 * Calculates the difference in minutes between two punch times.
 */
function calculateTimeDifferenceInMinutes(firstPunchTime, lastPunchTime) {
    const diffMs = lastPunchTime - firstPunchTime;
    return diffMs / (1000 * 60); // ms -> minutes
}

/**
 * Determines the attendance status (P, HD, A, MP) based on punches and shift parameters.
 */
function determineStatus(punches, shiftHours, halfDayHours, workingHours) {
    let status = 'A';
    let misPunch = false;
    let consideredLastPunch = null;
    let totalHours = 0;

    if (!punches || punches.length === 0) {
        // No punches: absent
        return { status, firstPunch: null, lastPunch: null, misPunch, totalHours };
    }

    // Sort punches by ascending time
    punches.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

    const firstPunch = punches[0];
    const lastPunch  = punches[punches.length - 1];

    const firstPunchTime = new Date(firstPunch.punch_time);
    const lastPunchTime  = new Date(lastPunch.punch_time);

    const gapMinutes = calculateTimeDifferenceInMinutes(firstPunchTime, lastPunchTime);

    if (gapMinutes < 15) {
        // If total gap is less than 15 mins, treat as mis-punch
        misPunch = true;
    } else {
        consideredLastPunch = lastPunch;
    }

    if (misPunch) {
        status = 'MP';
    } else {
        // Calculate total hours
        if (consideredLastPunch) {
            const firstPunchDate = new Date(firstPunch.punch_date);
            totalHours = calculateHoursWorked(firstPunchDate, firstPunchTime, lastPunchTime);
        }

        // Define thresholds
        const pThreshold  = workingHours === 'FLEXI SHIFT - 9 HRS' ? 4.5 : 4;
        const hdThreshold = 2;     // Always 2 for half day
        const aThreshold  = 0.25;  // 15 minutes

        if (totalHours > pThreshold) {
            status = 'P';
        } else if (totalHours > hdThreshold && totalHours <= pThreshold) {
            status = 'HD';
        } else if (totalHours > aThreshold && totalHours <= hdThreshold) {
            status = 'A';
        } else {
            status = 'MP';
        }
    }

    return {
        status,
        firstPunch,
        lastPunch: consideredLastPunch,
        misPunch,
        totalHours,
    };
}

/**
 * -----------------------------------------------------
 * The main upsertAttendance function with integrated 
 * monthly logic.
 * -----------------------------------------------------
 */
async function upsertAttendance({
    labourId,
    date,
    firstPunchManually,
    lastPunchManually,
    overtimeManually,
    remarkManually,
    workingHours,
    onboardName,
    markWeeklyOff
}) {
    let totalHours = 0;
    let status     = 'A'; // default
    let calculatedOvertime = 0;

    const shiftHours   = getShiftHours(workingHours);
    const halfDayHours = getHalfDayHours(shiftHours);

    try {
        const pool = await poolPromise;

        // 1. Check if the date is a holiday:
        const holidayCheckResult = await pool.request()
            .input('date', sql.Date, date)
            .query(`
                SELECT [HolidayDate]
                FROM [dbo].[HolidayDate]
                WHERE [HolidayDate] = @date
            `);

        if (holidayCheckResult.recordset.length > 0) {
            throw new Error('The date is a holiday. You cannot modify punch times or overtime.');
        }

        // 2. Fetch existing attendance for (labour & date) from LabourAttendanceDetails
        const attendanceResult = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('date',     sql.Date, date)
            .query(`
                SELECT 
                    [TimesUpdate],
                    [SentForApproval],
                    [ApprovalStatus],
                    [FirstPunch],
                    [LastPunch]
                FROM [dbo].[LabourAttendanceDetails]
                WHERE [LabourId] = @labourId AND [Date] = @date
            `);

        let timesUpdate       = 0;
        let sentForApproval   = false;
        let approvalStatus    = null;
        let existingFirstPunch= null;
        let existingLastPunch = null;

        if (attendanceResult.recordset.length > 0) {
            const record = attendanceResult.recordset[0];
            timesUpdate        = record.TimesUpdate || 0;
            sentForApproval    = record.SentForApproval;
            approvalStatus     = record.ApprovalStatus;
            existingFirstPunch = record.FirstPunch;
            existingLastPunch  = record.LastPunch;

            // If the attendance is pending admin approval and not yet updated, prevent modification
            if (approvalStatus === 'Pending' && !sentForApproval) {
                throw new Error('Attendance is pending admin approval and cannot be modified.');
            }
        }

        // const firstPunch = firstPunchManually || existingFirstPunch;
        // const lastPunch  = lastPunchManually  || existingLastPunch;
        const firstPunch = markWeeklyOff ? '00:00:00' : firstPunchManually || existingFirstPunch;
        const lastPunch = markWeeklyOff ? '00:00:00' : lastPunchManually || existingLastPunch;
        console.log('firstPunch',firstPunch,"+", lastPunch)

        if (markWeeklyOff) {
            status = 'WO'; // Weekly Off
        } 
        // 4. If we have both punches, compute total hours & status
        else if (firstPunch && lastPunch) {
            const firstPunchTime = new Date(`${date}T${firstPunch}`);
            const lastPunchTime  = new Date(`${date}T${lastPunch}`);

            totalHours = (lastPunchTime - firstPunchTime) / (1000 * 60 * 60); 
            console.log('totalHours ++',totalHours)
            if (totalHours >= shiftHours) {
                status = 'P';
                calculatedOvertime = totalHours > shiftHours ? (totalHours - shiftHours) : 0;
            } else if (totalHours >= halfDayHours) {
                status = 'HD';
            } else if (totalHours > 0) {
                status = 'MP';
            }
        }
        // 5. If only overtime is provided, we assume "P" and use that for total overtime
        else if (overtimeManually) {
            status             = 'P';
            calculatedOvertime = parseFloat(overtimeManually);
        }

        // Round to 2 decimals
        totalHours         = parseFloat(totalHours.toFixed(2));
        calculatedOvertime = parseFloat(calculatedOvertime.toFixed(2));

        // 6. Upsert record in LabourAttendanceDetails for this single date
        const mergeQuery = `
            MERGE INTO [dbo].[LabourAttendanceDetails] AS [Target]
            USING (
                SELECT 
                    @labourId          AS [LabourId], 
                    @date              AS [Date], 
                    @firstPunch        AS [FirstPunch], 
                    @lastPunch         AS [LastPunch], 
                    @totalHours        AS [TotalHours], 
                    @calculatedOvertime AS [Overtime], 
                    @status            AS [Status],
                    @overtimeManually  AS [OvertimeManually],
                    @remarkManually    AS [RemarkManually],
                    @onboardName       AS [OnboardName],
                    GETDATE()          AS [LastUpdatedDate]
            ) AS [Source]
            ON [Target].[LabourId] = [Source].[LabourId]
               AND [Target].[Date] = [Source].[Date]
            
            WHEN MATCHED THEN 
                UPDATE SET 
                    [FirstPunch]         = COALESCE([Source].[FirstPunch], [Target].[FirstPunch]),
                    [LastPunch]          = COALESCE([Source].[LastPunch], [Target].[LastPunch]),
                    [FirstPunchManually] = COALESCE([Source].[FirstPunch], [Target].[FirstPunchManually]),
                    [LastPunchManually]  = COALESCE([Source].[LastPunch], [Target].[LastPunchManually]),
                    [TotalHours]         = [Source].[TotalHours],
                    [Overtime]           = [Source].[Overtime],
                    [Status]             = [Source].[Status],
                    [OvertimeManually]   = COALESCE([Source].[OvertimeManually], [Target].[OvertimeManually]),
                    [RemarkManually]     = COALESCE([Source].[RemarkManually], [Target].[RemarkManually]),
                    [OnboardName]        = COALESCE([Source].[OnboardName], [Target].[OnboardName]),
                    [LastUpdatedDate]    = GETDATE(),
                    [TimesUpdate]        = ISNULL([Target].[TimesUpdate], 0) + 1
            
            WHEN NOT MATCHED THEN 
                INSERT (
                    [LabourId], 
                    [Date], 
                    [FirstPunch], 
                    [LastPunch], 
                    [FirstPunchManually], 
                    [LastPunchManually], 
                    [TotalHours], 
                    [Overtime], 
                    [Status], 
                    [OvertimeManually],
                    [RemarkManually], 
                    [OnboardName], 
                    [LastUpdatedDate], 
                    [TimesUpdate]
                )
                VALUES (
                    [Source].[LabourId],
                    [Source].[Date],
                    [Source].[FirstPunch],
                    [Source].[LastPunch],
                    [Source].[FirstPunch],
                    [Source].[LastPunch],
                    [Source].[TotalHours],
                    [Source].[Overtime],
                    [Source].[Status],
                    [Source].[OvertimeManually],
                    [Source].[RemarkManually],
                    [Source].[OnboardName],
                    GETDATE(),
                    1
                );
        `;

        await pool.request()
            .input('labourId',           sql.NVarChar, labourId)
            .input('date',               sql.Date,     date)
            .input('firstPunch',         sql.VarChar,  firstPunch)
            .input('lastPunch',          sql.VarChar,  lastPunch)
            .input('totalHours',         sql.Float,    totalHours)
            .input('calculatedOvertime', sql.Float,    calculatedOvertime)
            .input('status',             sql.VarChar,  status)
            .input('overtimeManually',   sql.Float,    overtimeManually)
            .input('remarkManually',     sql.VarChar,  remarkManually)
            .input('onboardName',        sql.NVarChar, onboardName)
            .query(mergeQuery);

        /**
         * -------------------------------------------
         * RE-CALCULATE the entire month for this 
         * labour (similar to your controller logic).
         * -------------------------------------------
         */
        const [yearStr, monthStr] = date.split('-'); // e.g. "2025-02-15" -> ["2025","02","15"]
        const parsedYear  = parseInt(yearStr, 10);
        const parsedMonth = parseInt(monthStr, 10);
        const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

        // 6a. Fetch all "punches" from LabourAttendanceDetails for this labour for the month
        const labourAttendanceResult = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('year',     sql.Int,      parsedYear)
            .input('month',    sql.Int,      parsedMonth)
            .query(`
                SELECT
                    [LabourId],
                    [Date]       AS [punch_date],
                    [FirstPunch] AS [punch_time] 
                FROM [dbo].[LabourAttendanceDetails]
                WHERE [LabourId] = @labourId
                  AND YEAR([Date]) = @year
                  AND MONTH([Date]) = @month
                ORDER BY [Date]
            `);

        const labourAttendance = labourAttendanceResult.recordset || [];

        // Possibly get the labour's projectName
        const projectResult = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .query(`
                SELECT [projectName] 
                FROM [dbo].[LabourAttendanceDetails]
                WHERE [labourId] = @labourId
            `);

        let projectName = null;
        if (projectResult.recordset.length > 0) {
            projectName = parseInt(projectResult.recordset[0].projectName, 10) || null;
        }

        // Initialize counters
        let presentDays      = 0;
        let halfDays         = 0;
        let missPunchDays    = 0;
        let absentDays       = 0;
        let totalOvertimeHrs = 0.0;
        let monthlyAttendance= [];

        for (let day = 1; day <= daysInMonth; day++) {
            // e.g. "2025-02-01", "2025-02-02", ...
            const dayStr  = String(day).padStart(2, '0');
            const fullDate= `${yearStr}-${monthStr}-${dayStr}`;

            // Filter the "punches" from labourAttendance that match this date
            const punchesForDay = labourAttendance.filter((att) => {
                const attDate    = new Date(att.punch_date);
                const attDateStr = attDate.toISOString().split('T')[0];
                return attDateStr === fullDate;
            });

            // Use the same logic from `determineStatus`
            const { status, firstPunch, lastPunch, misPunch, totalHours } =
                determineStatus(punchesForDay, shiftHours, halfDayHours, workingHours);

            // Overtime if > shiftHours
            let overtime = 0;
            if (status === 'P' && totalHours > shiftHours) {
                overtime = parseFloat((totalHours - shiftHours).toFixed(2));
            }

            // Update counters
            switch (status) {
                case 'P':
                    presentDays++;
                    break;
                case 'HD':
                    halfDays++;
                    break;
                case 'MP':
                    missPunchDays++;
                    break;
                case 'A':
                default:
                    absentDays++;
                    break;
            }

            totalOvertimeHrs += overtime;

            // Prepare dayAttendance object
            monthlyAttendance.push({
                labourId,
                projectName,
                date: fullDate,
                firstPunch:  firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
                lastPunch:   lastPunch  ? formatTimeToHoursMinutes(lastPunch.punch_time)  : null,
                // If you have attendance_id or device_id columns, add them here
                totalHours:  totalHours.toFixed(2),
                overtime:    overtime.toFixed(1),
                status,
                misPunch,
                creationDate: new Date(),
            });
        }

        // 6b. Insert summary (like your original code)
        const summary = {
            labourId,
            projectName,
            totalDays: daysInMonth,
            presentDays,
            halfDays,
            missPunchDays,
            absentDays,
            totalOvertimeHours: parseFloat(totalOvertimeHrs.toFixed(1)),
            shift: workingHours,
            creationDate: new Date(),
            selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`, 
        };

        await insertIntoLabourAttendanceSummary(summary);
        await insertOrUpdateLabourAttendanceSummary(labourId, date);
        // 6c. Insert daily records (like your original code).
        for (const dayAttendance of monthlyAttendance) {
            await insertIntoLabourAttendanceDetails(dayAttendance);
        }

    } catch (error) {
        console.error('Error performing upsert:', error);
        if (error.statusCode) {
            throw error;
        } else {
            const serverError = new Error('Error updating attendance. Please try again later.');
            serverError.statusCode = 500;
            throw serverError;
        }
    }
};



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
//             throw new Error('The date is a holiday. You cannot modify punch times or overtime.');
//         }

//         // Fetch existing attendance details
//         const attendanceResult = await pool.request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('date', sql.Date, date)
//             .query(`
//                 SELECT TimesUpdate, SentForApproval, ApprovalStatus, FirstPunch, LastPunch
//                 FROM [dbo].[LabourAttendanceDetails]
//                 WHERE LabourId = @labourId AND Date = @date
//             `);

//         let timesUpdate = 0;
//         let sentForApproval = false;
//         let approvalStatus = null;
//         let existingFirstPunch = null;
//         let existingLastPunch = null;

//         if (attendanceResult.recordset.length > 0) {
//             const record = attendanceResult.recordset[0];
//             timesUpdate = record.TimesUpdate || 0;
//             sentForApproval = record.SentForApproval;
//             approvalStatus = record.ApprovalStatus;
//             existingFirstPunch = record.FirstPunch;
//             existingLastPunch = record.LastPunch;

//             // Prevent modification if approval is pending
//             if (approvalStatus === 'Pending' && !sentForApproval) {
//                 throw new Error('Attendance is pending admin approval and cannot be modified.');
//             }
//         }

//         // Determine final values for FirstPunch and LastPunch
//         const firstPunch = firstPunchManually || existingFirstPunch;
//         const lastPunch = lastPunchManually || existingLastPunch;

//         // Calculate TotalHours and Status
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
//                     FirstPunch = COALESCE(@firstPunch, Target.FirstPunch),
//                     LastPunch = COALESCE(@lastPunch, Target.LastPunch),
//                     FirstPunchManually = COALESCE(@firstPunch, Target.FirstPunchManually),
//                     LastPunchManually = COALESCE(@lastPunch, Target.LastPunchManually),
//                     TotalHours = @totalHours,
//                     Overtime = @calculatedOvertime,
//                     Status = @status,
//                     OvertimeManually = COALESCE(@overtimeManually, Target.OvertimeManually),
//                     RemarkManually = COALESCE(@remarkManually, Target.RemarkManually),
//                     OnboardName = COALESCE(@onboardName, Target.OnboardName),
//                     LastUpdatedDate = GETDATE(),
//                     TimesUpdate = ISNULL(Target.TimesUpdate, 0) + 1
//             WHEN NOT MATCHED THEN 
//                 INSERT (
//                     LabourId, 
//                     Date, 
//                     FirstPunch, 
//                     LastPunch, 
//                     FirstPunchManually, 
//                     LastPunchManually, 
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
//                     @labourId, 
//                     @date, 
//                     @firstPunch, 
//                     @lastPunch, 
//                     @firstPunch, 
//                     @lastPunch, 
//                     @totalHours, 
//                     @calculatedOvertime, 
//                     @status, 
//                     @overtimeManually,
//                     @remarkManually, 
//                     @onboardName, 
//                     GETDATE(), 
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

//             await insertOrUpdateLabourAttendanceSummary(labourId, date);
//         //console.log('Upsert successful');
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
// };


async function LabourAttendanceApprovalModel() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT *
            FROM [dbo].[LabourAttendanceApproval]
        `);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching attendance Approval:', error);
        throw error;
    }
};


async function rejectAttendance(id, rejectReason) {
    try {
        const pool = await poolPromise;

        // Check if the attendance record exists and its current status
        const existingRecord = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT *
                FROM [dbo].[LabourAttendanceDetails]
                WHERE AttendanceId = @id
            `);

        if (existingRecord.recordset.length === 0) {
            //console.log('No record found for AttendanceId:', id);
            return false; // Record not found
        }

        const { ApprovalStatus } = existingRecord.recordset[0];
        if (ApprovalStatus === 'Rejected') {
            throw new Error('Attendance is already rejected.');
        }

        // Update the attendance record
        await pool.request()
            .input('id', sql.Int, id)
            .input('rejectReason', sql.NVarChar, rejectReason)
            .query(`
                UPDATE [dbo].[LabourAttendanceDetails]
                SET RejectAttendanceReason = @rejectReason,
                    ApprovalStatus = 'Rejected',
                    LastUpdatedDate = GETDATE()
                WHERE AttendanceId = @id
            `);

        //console.log('Attendance rejected successfully for ID:', id);
        return true; // Success
    } catch (error) {
        console.error('Error rejecting attendance:', error);
        throw new Error('Error rejecting attendance.');
    }
}
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
  };
  

  
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
        //console.log(`Row matched:`, row);
        matchedRows.push(row);
      } else {
        //console.log(`Row unmatched:`, row);
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
  
      //console.log(`Row updated:`, row);
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
      //console.log(`Row to insert:`, row);
    });
  
    await pool.request().bulk(table);
    //console.log(`All unmatched rows inserted.`);
  }
// ------------------------   ////////////////////////////////////----------end -------  
  

// ---------------------------------------------------------------------------------------

// // Fetch attendance by Labour ID
// async function getAttendanceByLabourId(labourId, month, year) {
//     try {
//         //console.log('Fetching attendance from DB for:', { labourId, month, year });
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
//         //console.log('Attempting to connect to the database...');
//         const pool = await poolPromise;
//         const result = await pool
//             .request()
//             .query(`SELECT LabourID AS labourId, workingHours FROM [dbo].[labourOnboarding] WHERE status = 'Approved'`);
//         //console.log('Fetched approved labours:', result.recordset);
//         return result.recordset; // Returns an array of approved labour IDs and working hours
//     } catch (err) {
//         console.error('SQL error fetching approved labour IDs', err);
//         throw new Error('Error fetching approved labour IDs');
//     }
// }

// // Fetch labour details by ID
// async function getLabourDetailsById(labourId) {
//     try {
//         //console.log('Fetching labour details from DB for:', labourId);
//         const pool = await poolPromise;
//         const result = await pool
//             .request()
//             .input('labourId', sql.NVarChar, labourId)
//             .query(`SELECT LabourID AS labourId, workingHours FROM [dbo].[labourOnboarding] WHERE LabourID = @labourId`);
//         //console.log('Fetched labour details:', result.recordset[0]);
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

// --------------------------------------------------    LABOUR WAGES MODULE 20-12-2024  ----------------------------------------------------


// Fetch all wages




const getLabourMonthlyWages = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT 
            lmw.WageID, lmw.LabourID, lmw.WagesEditedBy, lmw.PayStructure,
            lmw.DailyWages, lmw.PerHourWages, lmw.MonthlyWages, lmw.YearlyWages,
            lmw.FromDate, lmw.EffectiveDate, lmw.CreatedAt, lo.Name, lo.Location, lo.Department
        FROM LabourMonthlyWages lmw
        JOIN labourOnboarding lo ON lmw.LabourID = lo.id
    `);
    return result.recordset;
};

// Add or update wages
const upsertLabourMonthlyWages = async (wage) => {
    try {
        const pool = await poolPromise;

        // Fetch existing Labour details
        const onboardingResult = await pool.request()
            .input('LabourID', sql.NVarChar, wage.labourId || '')
            .query(`
                SELECT LabourID, name, projectName, companyName, From_Date, businessUnit, departmentName
                FROM [dbo].[labourOnboarding]
                WHERE LabourID = @LabourID
            `);

        // Check if the result is undefined or empty
        if (!onboardingResult || !onboardingResult.recordset || onboardingResult.recordset.length === 0) {
            throw new Error(`LabourID ${wage.labourId} not found in labourOnboarding table`);
        }

        const labourDetails = onboardingResult.recordset[0];

        // UPSERT Query with OUTPUT to return WageID
        const query = `
            INSERT INTO LabourMonthlyWages 
            (LabourID, PayStructure, DailyWages, PerHourWages, MonthlyWages, YearlyWages, FixedMonthlyWages, WeeklyOff, 
             WagesEditedBy, name, projectName, companyName, From_Date, businessUnit, departmentName, FromDate, EffectiveDate, CreatedAt)
            OUTPUT INSERTED.WageID
            VALUES 
            (@LabourID, @PayStructure, @DailyWages, @PerHourWages, @MonthlyWages, @YearlyWages, 
             CASE WHEN @PayStructure = 'FIXED MONTHLY WAGES' THEN @FixedMonthlyWages ELSE NULL END,
             CASE WHEN @PayStructure = 'FIXED MONTHLY WAGES' THEN @WeeklyOff ELSE NULL END,
             @WagesEditedBy, @name, @projectName, @companyName, @From_Date, @businessUnit, @departmentName, 
             GETDATE(), @EffectiveDate, GETDATE());
        `;

        // Execute Query
        const insertResult = await pool.request()
            .input('LabourID', sql.NVarChar, wage.labourId || '')
            .input('PayStructure', sql.NVarChar, wage.payStructure || null)
            .input('DailyWages', sql.Float, wage.dailyWages || 0)
            .input('PerHourWages', sql.Float, wage.dailyWages ? wage.dailyWages / 8 : 0)
            .input('MonthlyWages', sql.Float, wage.monthlyWages || 0)
            .input('YearlyWages', sql.Float, wage.yearlyWages || 0)
            .input('FixedMonthlyWages', sql.Float, wage.fixedMonthlyWages || null)
            .input('WeeklyOff', sql.Int, wage.weeklyOff ? parseInt(wage.weeklyOff, 10) : null)
            .input('WagesEditedBy', sql.NVarChar, wage.wagesEditedBy || 'System')
            .input('name', sql.NVarChar, labourDetails.name || '')
            .input('projectName', sql.Int, labourDetails.projectName || '') // Fixed type issue
            .input('companyName', sql.NVarChar, labourDetails.companyName || '')
            .input('From_Date', sql.Date, labourDetails.From_Date || null)
            .input('businessUnit', sql.NVarChar, labourDetails.businessUnit || '')
            .input('departmentName', sql.NVarChar, labourDetails.departmentName || '')
            .input('EffectiveDate', sql.Date, wage.effectiveDate || null)
            .query(query);

        // Check if insertResult is valid
        if (!insertResult || !insertResult.recordset || insertResult.recordset.length === 0) {
            throw new Error('Failed to retrieve WageID after inserting');
        }

        return insertResult.recordset[0]; // Return the inserted WageID
    } catch (error) {
        console.error('Error in upsertLabourMonthlyWages:', error.message);
        throw new Error(`Failed to upsert wages: ${error.message}`);
    }
};



// Fetch all approvals
const getWagesAdminApprovals = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT * FROM WagesAdminApprovals
    `);
    return result.recordset;
};

const checkExistingWages = async (labourId) => {
    const pool = await poolPromise;

    const result = await pool.request()
        .input('LabourID', sql.NVarChar, labourId)
        .query(`
            SELECT TOP 1 *
            FROM LabourMonthlyWages
            WHERE LabourID = @LabourID
            ORDER BY EffectiveDate DESC
        `);

    return result.recordset[0] || null;
};

// Send wages for admin approval
async function markWagesForApproval(
    wageId,
            labourId,
            dailyWages,
            perHourWages,
            monthlyWages,
            yearlyWages,
            effectiveDate,
            fixedMonthlyWages,
            weeklyOff,
            payStructure,
            wagesEditedBy,
            remarks
) {
    try {
        const pool = await poolPromise;
        const request = pool.request();

        const perHourWages = dailyWages ? dailyWages / 8 : 0;
        const effectiveDateOnly = effectiveDate ? new Date(effectiveDate).toISOString().split('T')[0] : null;
        
        request.input('WageID', sql.Int, wageId);
        request.input('LabourID', sql.NVarChar, labourId);
        request.input('DailyWages', sql.Float, dailyWages || null);
        request.input('MonthlyWages', sql.Float, monthlyWages || null);
        request.input('PerHourWages', sql.Float, perHourWages);
        request.input('YearlyWages', sql.Float, yearlyWages || null);
        request.input('EffectiveDate', sql.Date, effectiveDateOnly);
        request.input('FixedMonthlyWages', sql.Float, fixedMonthlyWages || null);
        request.input('WeeklyOff', sql.Int, weeklyOff || null);
        request.input('PayStructure', sql.NVarChar, payStructure || null);
        request.input('WagesEditedBy', sql.VarChar, wagesEditedBy || null);
        request.input('Remarks', sql.NVarChar, remarks || null);

        // Update the LabourMonthlyWages table
        const updateResult = await request.query(`
            UPDATE [LabourMonthlyWages]
            SET ApprovalStatusWages = 'Pending',
                WagesEditedBy = @WagesEditedBy,
                EditDate = GETDATE()
            WHERE WageID = @WageID
        `);

        if (updateResult.rowsAffected[0] === 0) {
            throw new Error('Failed to update LabourMonthlyWages. WageID may not exist.');
        }

        // Insert into the WagesAdminApprovals table
        await request.query(`
            INSERT INTO [WagesAdminApprovals] (
                WageID, LabourID, DailyWages, MonthlyWages, FixedMonthlyWages, PerHourWages, YearlyWages, EffectiveDate,
                WeeklyOff, PayStructure, WagesEditedBy, ApprovalStatus, Remarks, CreatedAt
            )
            VALUES (
                @WageID, @LabourID, @DailyWages, @MonthlyWages, @FixedMonthlyWages, @PerHourWages, @YearlyWages, @EffectiveDate,
                @WeeklyOff, @PayStructure, @WagesEditedBy, 'Pending', @Remarks, GETDATE()
            )
        `);

        //console.log('Wages marked for admin approval.');
        return { success: true, message: 'Wages marked for admin approval.' };
    } catch (error) {
        console.error('Error marking wages for approval:', error.message || error);
        throw new Error(error.message || 'Error marking wages for approval.');
    }
};



async function approveWages(ApprovalID) {
    try {
        const pool = await poolPromise;
        //console.log('approvalWages ID in model.js:', ApprovalID);

        // Fetch the approval record
        const approvalResult = await pool.request()
            .input('ApprovalID', sql.Int, ApprovalID)
            .query(`
                SELECT * FROM [WagesAdminApprovals]
                WHERE ApprovalID = @ApprovalID
            `);

        if (approvalResult.recordset.length === 0) {
            throw new Error('Approval record not found.');
        }

        const approvalData = approvalResult.recordset[0];
        //console.log('approvalData:', approvalData);

        // Approve in LabourMonthlyWages
        await pool.request()
        .input('WageID', sql.Int, approvalData.WageID)
        .input('isApprovalDoneAdmin', sql.Bit, 1)
        .input('DailyWages', sql.Float, approvalData.DailyWages || null)
        .input('MonthlyWages', sql.Float, approvalData.MonthlyWages || null)
        .input('PerHourWages', sql.Float, approvalData.PerHourWages || null)
        .input('EffectiveDate', sql.Date, approvalData.EffectiveDate || null)
        .input('Remarks', sql.NVarChar, approvalData.Remarks || null)
        .query(`
            UPDATE [LabourMonthlyWages]
            SET ApprovalStatusWages = 'Approved',
                isApprovalDoneAdmin = @isApprovalDoneAdmin,
                DailyWages = @DailyWages,
                MonthlyWages = @MonthlyWages,
                PerHourWages = @PerHourWages,
                EffectiveDate = @EffectiveDate,
                Remarks = @Remarks,
                ApprovalDate = GETDATE()
            WHERE WageID = @WageID
        `);

        // Update WagesAdminApprovals
        await pool.request()
            .input('ApprovalID', sql.Int, ApprovalID)
            .query(`
                UPDATE [WagesAdminApprovals]
                SET ApprovalStatus = 'Approved',
                    ApprovalDate = GETDATE()
                WHERE ApprovalID = @ApprovalID
            `);

        //console.log('Wages approved successfully.');
        return { success: true, message: 'Wages approved successfully.' };
    } catch (error) {
        console.error('Error approving wages:', error);
        throw new Error('Error approving wages.');
    }
}


async function rejectWages(ApprovalID, Remarks) {
    try {
        const pool = await poolPromise;
        //console.log('Rejecting wages with ApprovalID:', ApprovalID, 'and Remarks:', Remarks);

        // Fetch the approval record
        const approvalResult = await pool.request()
            .input('ApprovalID', sql.Int, ApprovalID)
            .query(`
                SELECT * FROM [WagesAdminApprovals]
                WHERE ApprovalID = @ApprovalID
            `);

        if (approvalResult.recordset.length === 0) {
            throw new Error('Approval record not found.');
        }

        const approvalData = approvalResult.recordset[0];

        // Reject in LabourMonthlyWages
        await pool.request()
            .input('WageID', sql.Int, approvalData.WageID)
            .input('Remarks', sql.NVarChar, Remarks || null) // Allow null if no Remarks provided
            .input('isApprovalReject', sql.Bit, 1)
            .query(`
                UPDATE [LabourMonthlyWages]
                SET ApprovalStatusWages = 'Rejected',
                    Remarks = @Remarks,
                    isApprovalReject = @isApprovalReject
                WHERE WageID = @WageID
            `);

        // Update WagesAdminApprovals
        await pool.request()
            .input('ApprovalID', sql.Int, ApprovalID)
            .input('Remarks', sql.NVarChar, Remarks || null)
            .query(`
                UPDATE [WagesAdminApprovals]
                SET ApprovalStatus = 'Rejected',
                    RejectionDate = GETDATE(),
                    Remarks = @Remarks
                WHERE ApprovalID = @ApprovalID
            `);

        //console.log('Wages rejected successfully.');
        return { success: true, message: 'Wages rejected successfully.' };
    } catch (error) {
        console.error('Error rejecting wages:', error);
        throw new Error('Error rejecting wages.');
    }
}



// Add an approval
const addWageApproval = async (approval) => {
    const pool = await poolPromise;
    await pool.request()
        .input('WageID', sql.Int, approval.wageId)
        .input('AdminID', sql.Int, approval.adminId)
        .input('ApprovalStatus', sql.NVarChar, approval.approvalStatus)
        .input('WagesEditedBy', sql.NVarChar, approval.wagesEditedBy)
        .input('Remarks', sql.NVarChar, approval.remarks)
        .query(`
            INSERT INTO WagesAdminApprovals (WageID, AdminID, ApprovalStatus, WagesEditedBy, ApprovalDate, Remarks)
            VALUES (@WageID, @AdminID, @ApprovalStatus, @WagesEditedBy, GETDATE(), @Remarks)
        `);
};

async function getWagesByDateRange(projectName, startDate, endDate) {
    const pool = await poolPromise;

    let query = `
    WITH LatestWages AS (
        SELECT 
            onboarding.LabourID,
            onboarding.name,
            onboarding.projectName,
            onboarding.companyName,
            onboarding.From_Date,
            onboarding.businessUnit,
            onboarding.departmentName,
            wages.PayStructure,
            wages.DailyWages,
            wages.WeeklyOff,
            wages.FixedMonthlyWages,
            wages.EffectiveDate,
            wages.CreatedAt,
            ROW_NUMBER() OVER (PARTITION BY onboarding.LabourID ORDER BY wages.CreatedAt DESC) AS RowNum
        FROM 
            [dbo].[labourOnboarding] AS onboarding
        LEFT JOIN 
            [dbo].[LabourMonthlyWages] AS wages
        ON 
            onboarding.LabourID = wages.LabourID
        WHERE 
            onboarding.status = 'Approved'
    `;

    // ✅ Dynamically include filtering conditions only if projectName is not "all"
    if (projectName !== "all") {
        query += ` AND wages.ProjectName = @projectName AND onboarding.projectName = @projectName`;
    }

    if (startDate && endDate) {
        query += ` AND wages.CreatedAt BETWEEN @startDate AND @endDate`;
    }

    query += `)
    SELECT 
        LabourID,
        name,
        projectName,
        companyName,
        From_Date,
        businessUnit,
        departmentName,
        PayStructure,
        DailyWages,
        WeeklyOff,
        FixedMonthlyWages,
        EffectiveDate,
        CreatedAt
    FROM LatestWages
    WHERE RowNum = 1`;

    const request = pool.request();

    if (projectName !== "all") request.input('projectName', sql.VarChar, projectName);
    if (startDate && endDate) {
        request.input('startDate', sql.Date, startDate);
        request.input('endDate', sql.Date, endDate);
    }

    console.log("Executing SQL Query:", query);  // ✅ Debugging Log

    const result = await request.query(query);
    return result.recordset;
};




async function insertWagesData(row) {
    const pool = await poolPromise;

    // Convert Excel date to JavaScript date or handle as null
    let fromDate = null;
    if (row.From_Date) {
        const dateObj = new Date(row.From_Date);
        if (!isNaN(dateObj)) {
            fromDate = dateObj.toISOString().split('T')[0]; // Extract date part (YYYY-MM-DD)
        } else {
            throw new Error(`Invalid From_Date value: ${row.From_Date}`);
        }
    }

    // Handle EffectiveDate
    let effectiveDate = null;
    if (row.EffectiveDate) {
        if (typeof row.EffectiveDate === "number") {
            // Excel stores dates as numbers (serial date format)
            const excelDate = new Date((row.EffectiveDate - 25569) * 86400 * 1000);
            effectiveDate = excelDate.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
        } else if (typeof row.EffectiveDate === "string") {
            // Handle DD-MM-YYYY format
            const parts = row.EffectiveDate.split('-');
            if (parts.length === 3) {
                const [day, month, year] = parts.map((part) => parseInt(part, 10));
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    effectiveDate = new Date(year, month - 1, day).toISOString().split('T')[0]; // YYYY-MM-DD
                } else {
                    throw new Error(`Invalid EffectiveDate format: ${row.EffectiveDate}`);
                }
            } else {
                throw new Error(`Invalid EffectiveDate format: ${row.EffectiveDate}`);
            }
        } else {
            throw new Error(`Unexpected EffectiveDate type: ${typeof row.EffectiveDate}`);
        }
    }

    // Validate PayStructure
    const validPayStructures = ['DAILY WAGES', 'FIXED MONTHLY WAGES'];
    if (!row.PayStructure || !validPayStructures.includes(row.PayStructure)) {
        throw new Error(`Invalid PayStructure value: ${row.PayStructure}`);
    }

    // Check for both DAILY WAGES and FIXED MONTHLY WAGES in the same row
    if (row.PayStructure === 'DAILY WAGES' && row.WeeklyOff) {
        throw new Error('Cannot have WeeklyOff for DAILY WAGES PayStructure');
    }

    // Validate WeeklyOff for FIXED MONTHLY WAGES
    if (row.PayStructure === 'FIXED MONTHLY WAGES') {
        if (!row.WeeklyOff) {
            throw new Error(`Invalid WeeklyOff value: ${row.WeeklyOff}`);
        }
        const weeklyOff = parseInt(row.WeeklyOff, 10);
        if (isNaN(weeklyOff) || weeklyOff < 1 || weeklyOff > 4) {
            throw new Error('WeeklyOff must be a number between 1 and 4 for FIXED MONTHLY WAGES');
        }
    }

    // Fetch working hours for the LabourID from the labourOnboarding table
    const result = await pool
        .request()
        .input('LabourID', sql.VarChar, row.LabourID)
        .query(`
            SELECT LabourID AS labourId, workingHours 
            FROM [dbo].[labourOnboarding] 
            WHERE LabourID = @LabourID
        `);

    if (result.recordset.length === 0) {
        throw new Error(`LabourID ${row.LabourID} not found in labourOnboarding table`);
    }

    const workingHours = result.recordset[0].workingHours;

    // Determine the hours per day based on workingHours value
    let hoursPerDay;
    if (workingHours === 'FLEXI SHIFT - 9 HRS') {
        hoursPerDay = 9;
    } else if (workingHours === 'FLEXI SHIFT - 8 HRS') {
        hoursPerDay = 8;
    } else {
        throw new Error(`Invalid workingHours value: ${workingHours}`);
    }

    // Calculate wage-related fields
    let dailyWages = null;
    let perHourWages = null;
    let monthlyWages = null;
    let yearlyWages = null;
    let fixedMonthlyWages = null;

    if (row.PayStructure === 'DAILY WAGES') {
        dailyWages = parseFloat(row.DailyWages);
        if (isNaN(dailyWages)) {
            throw new Error(`Invalid DailyWages value: ${row.DailyWages}`);
        }

        perHourWages = dailyWages / hoursPerDay; // Calculate per hour wages based on workingHours
        monthlyWages = dailyWages * 26; // Assuming 26 working days/month
        yearlyWages = monthlyWages * 12; // 12 months/year
    } else if (row.PayStructure === 'FIXED MONTHLY WAGES') {
        fixedMonthlyWages = parseFloat(row.FixedMonthlyWages) || 13000;
    }

    // Insert data into the LabourMonthlyWages table
    const request = pool.request();
    request.input('LabourID', sql.VarChar, row.LabourID);
    request.input('WagesEditedBy', sql.VarChar, row.WagesEditedBy || 'System');
    request.input('name', sql.VarChar, row.name);
    request.input('projectName', sql.Int, row.projectName);
    request.input('companyName', sql.VarChar, row.companyName);
    request.input('From_Date', sql.Date, fromDate);
    request.input('businessUnit', sql.VarChar, row.businessUnit);
    request.input('departmentName', sql.VarChar, row.departmentName);
    request.input('PayStructure', sql.VarChar, row.PayStructure);
    request.input('DailyWages', sql.Decimal, dailyWages);
    request.input('PerHourWages', sql.Decimal, perHourWages);
    request.input('MonthlyWages', sql.Decimal, monthlyWages);
    request.input('YearlyWages', sql.Decimal, yearlyWages);
    request.input('FixedMonthlyWages', sql.Decimal, fixedMonthlyWages);
    request.input('WeeklyOff', sql.Int, parseInt(row.WeeklyOff, 10) || null);
    request.input('EffectiveDate', sql.Date, effectiveDate);
    request.input('CreatedAt', sql.DateTime, new Date());
    request.input('isApprovalSendAdmin', sql.Bit, 1);

    const insertResult = await request.query(`
        INSERT INTO [dbo].[LabourMonthlyWages] 
        (LabourID, WagesEditedBy, name, projectName, companyName, From_Date, businessUnit, departmentName, PayStructure, DailyWages, PerHourWages, MonthlyWages, YearlyWages, FixedMonthlyWages, WeeklyOff, EffectiveDate, CreatedAt, isApprovalSendAdmin)
        OUTPUT INSERTED.WageID
        VALUES (@LabourID, @WagesEditedBy, @name, @projectName, @companyName, @From_Date, @businessUnit, @departmentName, @PayStructure, @DailyWages, @PerHourWages, @MonthlyWages, @YearlyWages, @FixedMonthlyWages, @WeeklyOff, @EffectiveDate, @CreatedAt, @isApprovalSendAdmin)
    `);

    const wageId = insertResult.recordset[0].WageID;

    // Update the LabourMonthlyWages table
    await request.query(`
        UPDATE [LabourMonthlyWages]
        SET ApprovalStatusWages = 'Pending',
            EditDate = GETDATE()
        WHERE WageID = @WageID
    `);

    // Insert into the WagesAdminApprovals table
    await request.query(`
        INSERT INTO [WagesAdminApprovals] (
            WageID, LabourID, DailyWages, MonthlyWages, FixedMonthlyWages, PerHourWages, YearlyWages, EffectiveDate,
            WeeklyOff, PayStructure, WagesEditedBy, ApprovalStatus, Remarks, CreatedAt
        )
        VALUES (
            @WageID, @LabourID, @DailyWages, @MonthlyWages, @FixedMonthlyWages, @PerHourWages, @YearlyWages, @EffectiveDate,
            @WeeklyOff, @PayStructure, @WagesEditedBy, 'Pending', '', GETDATE()
        )
    `);

    return { success: true, message: 'Wages inserted and sent for approval.' };
};



// const getWagesAndLabourOnboardingJoin = async () => {
//     const pool = await poolPromise;

//     const result = await pool.request().query(`
//         SELECT 
//             onboarding.LabourID,
//             onboarding.name,
//             onboarding.businessUnit,
//             onboarding.departmentName,
//             onboarding.From_Date,
//             onboarding.projectName,
//             onboarding.department,
//             wages.WagesEditedBy,
//             wages.PayStructure,
//             wages.DailyWages,
//             wages.PerHourWages,
//             wages.MonthlyWages,
//             wages.YearlyWages,
//             wages.WeeklyOff,
//             wages.CreatedAt,
//             wages.FixedMonthlyWages,
//             wages.EffectiveDate
//         FROM
//             [dbo].[labourOnboarding] AS onboarding
//         LEFT JOIN
//             [dbo].[LabourMonthlyWages] AS wages
//         ON
//             onboarding.LabourID = wages.LabourID
//         WHERE
//             onboarding.status = 'Approved'
//             ORDER BY
//     onboarding.LabourID;
//     `);

//     return result.recordset;
// };

const getWagesAndLabourOnboardingJoin = async (filters = {}) => {
    const pool = await poolPromise;
  
    // Build the base query with aliasing
    let query = `
      SELECT 
        onboarding.LabourID,
        onboarding.name,
        onboarding.businessUnit,
        onboarding.departmentName,
        onboarding.From_Date,
        onboarding.projectName AS ProjectID,
        onboarding.department AS DepartmentID,
        wages.WagesEditedBy,
        wages.PayStructure,
        wages.DailyWages,
        wages.PerHourWages,
        wages.MonthlyWages,
        wages.YearlyWages,
        wages.WeeklyOff,
        wages.CreatedAt,
        wages.FixedMonthlyWages,
        wages.EffectiveDate
      FROM
        [dbo].[labourOnboarding] AS onboarding
      LEFT JOIN
        [dbo].[LabourMonthlyWages] AS wages
      ON
        onboarding.LabourID = wages.LabourID
      WHERE
        onboarding.status = 'Approved'
    `;
  
    // Append additional filters if provided from the frontend
    if (filters.ProjectID) {
      // Note: Ensure that the value of filters.ProjectID is safe or use a parameterized query.
      query += ` AND onboarding.projectName = ${filters.ProjectID}`;
    }
    if (filters.DepartmentID) {
      query += ` AND onboarding.department = ${filters.DepartmentID}`;
    }
  
    query += ` ORDER BY onboarding.LabourID;`;
  
    const result = await pool.request().query(query);
    return result.recordset;
  };


// Function to search FromWages records
async function searchFromWages(query) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('query', sql.NVarChar, `%${query}%`)
            .query('SELECT * FROM LabourMonthlyWages WHERE name LIKE @query OR companyName LIKE @query OR LabourID LIKE @query OR DailyWages LIKE @query OR departmentName LIKE @query OR WagesEditedBy LIKE @query OR PayStructure LIKE @query');
        return result.recordset;
    } catch (error) {
        throw error;
    }
}

const getVariablePayAndLabourOnboardingJoin = async () => {
    const pool = await poolPromise;

    const result = await pool.request().query(`
        SELECT 
            onboarding.id,
            onboarding.LabourID,
            onboarding.name,
            onboarding.businessUnit,
            onboarding.projectName,
            onboarding.departmentName,
            onboarding.department,
            variablepay.payAddedBy,
            variablepay.PayStructure,
            variablepay.AdvancePay,
            variablepay.DebitPay,
            variablepay.IncentivePay,
            variablepay.VariablepayAmount,
            variablepay.ApprovalStatusPay,
            variablepay.CreatedAt,
            variablepay.variablePayRemark,
            variablepay.EffectiveDate,
            variablepay.userId
        FROM 
            [labourOnboarding] AS onboarding
        LEFT JOIN 
            [VariablePay] AS variablepay
        ON 
            onboarding.LabourID = variablepay.LabourID
        WHERE 
            onboarding.status = 'Approved'
    `);

    return result.recordset;
};

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
    markAttendanceForApproval,
    approveAttendance,
    LabourAttendanceApprovalModel,
    rejectAttendance,
    rejectAttendanceAdmin,
    showAttendanceCalenderSingleLabour,
    
    // approveAttendance
    getLabourMonthlyWages,
    upsertLabourMonthlyWages,
    getWagesAdminApprovals,
    addWageApproval,
    getWagesByDateRange,
    insertWagesData,
    getWagesAndLabourOnboardingJoin,
    searchFromWages,
    checkExistingWages,
    markWagesForApproval,
    approveWages,
    rejectWages,
    getVariablePayAndLabourOnboardingJoin,
    getHolidayDates

};