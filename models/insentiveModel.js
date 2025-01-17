const { poolPromise2 } = require('../config/dbConfig2');
const {sql, poolPromise } = require('../config/dbConfig');  
const { poolPromise3 } = require('../config/dbConfig3');


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




const checkExistingVariablePay = async (LabourID) => {
    const pool = await poolPromise;

    const result = await pool.request()
        .input('LabourID', sql.NVarChar, LabourID)
        .query(`
            SELECT TOP 1 *
            FROM VariablePay
            WHERE LabourID = @LabourID
            ORDER BY EffectiveDate DESC
        `);
    return result.recordset[0] || null;
};



// Add or update variablePay
const upsertLabourVariablePay = async (variablePay) => {
    const pool = await poolPromise;
    console.log('Payload received for variablePay:', variablePay);
    // Step 2: Perform the upsert operation
    const onboardingData = await pool.request()
    .input('LabourID', sql.NVarChar, variablePay.LabourID || '')
    .query(`
        SELECT 
            LabourID,
            name,
            projectName,
            companyName,
            businessUnit,
            departmentName
        FROM [dbo].[labourOnboarding]
        WHERE LabourID = @LabourID
    `);

if (onboardingData.recordset.length === 0) {
    throw new Error(`LabourID ${variablePay.LabourID} not found in labourOnboarding table`);
}

const labourDetails = onboardingData.recordset[0];

const effectiveDate = new Date(variablePay.effectiveDate + 'T00:00:00'); // Append time part to avoid time zone issues
if (isNaN(effectiveDate.getTime())) {
    console.log("effectiveDate", effectiveDate)
    console.error('Invalid effective date provided:', variablePay.effectiveDate);
    throw new Error('Invalid effective date');
}

    const advancePay = variablePay.payStructure === 'Advance' ? 1 : 0;
    const debitPay = variablePay.payStructure === 'Debit' ? 1 : 0;
    const incentivePay = variablePay.payStructure === 'Incentive' ? 1 : 0;

    const ApprovalStatusPay = 'AdminPending';
    // Define the SQL query for inserting the variable pay
    const query = `
        INSERT INTO VariablePay 
        (userId, LabourID, PayStructure, AdvancePay, DebitPay, IncentivePay, VariablepayAmount,
         payAddedBy, name, projectName, companyName, businessUnit, departmentName, variablePayRemark, EffectiveDate, CreatedAt, ApprovalStatusPay, isApprovalSendAdmin)
        VALUES 
        (@userId, @LabourID, @PayStructure, @AdvancePay, @DebitPay, @IncentivePay, @VariablepayAmount, 
         @payAddedBy, @name, @projectName, @companyName, @businessUnit, @departmentName, @variablePayRemark,
         @EffectiveDate, GETDATE(), @ApprovalStatusPay, @isApprovalSendAdmin);
    `;

    // Execute the query with the proper parameters
    await pool.request()
        .input('userId', sql.Int, variablePay.userId)
        .input('LabourID', sql.NVarChar, variablePay.LabourID)
        .input('PayStructure', sql.NVarChar, variablePay.payStructure)
        .input('AdvancePay', sql.Bit, advancePay)
        .input('DebitPay', sql.Bit, debitPay)
        .input('IncentivePay', sql.Bit, incentivePay)
        .input('VariablepayAmount', variablePay.variablePay)
        .input('payAddedBy', sql.NVarChar, variablePay.payAddedBy)
        .input('name', sql.NVarChar, labourDetails.name)
        .input('projectName', sql.Int, labourDetails.projectName)
        .input('companyName', sql.NVarChar, labourDetails.companyName)
        .input('businessUnit', sql.NVarChar, labourDetails.businessUnit)
        .input('variablePayRemark', sql.NVarChar, variablePay.variablePayRemark)
        .input('departmentName', sql.NVarChar, labourDetails.departmentName)
        .input('EffectiveDate', sql.Date, effectiveDate)
        .input('ApprovalStatusPay', sql.NVarChar, ApprovalStatusPay)
        .input('isApprovalSendAdmin', sql.Bit, 1)
        .query(query);
};



// Send VariablePay for admin approval
async function markVariablePayForApproval(
    payId,
            LabourID,
            payAddedBy,
            variablePay,
            variablePayRemark,
            payStructure,
            effectiveDate,
            userId,
            name
) {
    try {
        const pool = await poolPromise;
        const request = pool.request();

        const effectiveDateOnly = effectiveDate ? new Date(effectiveDate).toISOString().split('T')[0] : null;
        
        request.input('VariablePayId', sql.Int, payId);
        request.input('LabourID', sql.NVarChar, LabourID);
        request.input('payAddedBy', sql.NVarChar, payAddedBy || null);
        request.input('VariablepayAmount', variablePay || null);
        request.input('variablePayRemark', sql.NVarChar, variablePayRemark);
        request.input('EffectiveDate', sql.Date, effectiveDateOnly);
        request.input('PayStructure', sql.NVarChar, payStructure || null);
        request.input('userId', sql.Int, userId);
        request.input('name', sql.NVarChar, name);

        // Update the LabourMonthlyWages table
        const updateResult = await request.query(`
            UPDATE [VariablePay]
            SET ApprovalStatusPay = 'Pending',
                payAddedBy = @payAddedBy,
                EditDate = GETDATE()
            WHERE VariablePayId = @VariablePayId
        `);

        if (updateResult.rowsAffected[0] === 0) {
            throw new Error('Failed to update VariablePay. VariablePayId may not exist.');
        }

        // Insert into the WagesAdminApprovals table
        await request.query(`
            INSERT INTO [VariablePayAdminApprovals] (
                VariablePayId, LabourID, payAddedBy, VariablepayAmount, variablePayRemark, EffectiveDate,
                 PayStructure, ApprovalStatusPay, CreatedAt, userId, name
            )
            VALUES (
                @VariablePayId, @LabourID, @payAddedBy, @VariablepayAmount, @variablePayRemark, @EffectiveDate,
                 @PayStructure, 'Pending', GETDATE(), @userId, @name
            )
        `);

        console.log('Variable Pay marked for admin approval.');
        return { success: true, message: 'Variable Pay marked for admin approval.' };
    } catch (error) {
        console.error('Error marking Variable Pay for approval:', error.message || error);
        throw new Error(error.message || 'Error marking Variable Pay for approval.');
    }
}



async function approvalAdminVariablePay(ApprovalID) {
    try {
        const pool = await poolPromise;
        console.log('Variable Pay ID in model.js:', ApprovalID);

        // Fetch the approval record
        const approvalResult = await pool.request()
            .input('ApprovalID', sql.Int, ApprovalID)
            .query(`
                SELECT * FROM [VariablePayAdminApprovals]
                WHERE ApprovalID = @ApprovalID
            `);

        if (approvalResult.recordset.length === 0) {
            throw new Error('Approval record not found.');
        }

        const approvalData = approvalResult.recordset[0];
        console.log('approvalData:', approvalData);

        // Approve in VariablePay
        await pool.request()
        .input('VariablePayId', sql.Int, approvalData.VariablePayId)
        .input('isApprovalDoneAdmin', sql.Bit, 1)
        .input('IsApproved', sql.Bit, 1)
        .input('PayStructure', sql.NVarChar, approvalData.PayStructure || null)
        .input('VariablepayAmount', approvalData.VariablepayAmount || null)
        .input('EffectiveDate', sql.Date, approvalData.EffectiveDate || null)
        .input('variablePayRemark', sql.NVarChar, approvalData.variablePayRemark || null)
        .query(`
            UPDATE [VariablePay]
            SET ApprovalStatusPay = 'Approved',
                isApprovalDoneAdmin = @isApprovalDoneAdmin,
                IsApproved = @IsApproved,
                PayStructure = @PayStructure,
                VariablepayAmount = @VariablepayAmount,
                EffectiveDate = @EffectiveDate,
                variablePayRemark = @variablePayRemark
            WHERE VariablePayId = @VariablePayId
        `);

        // Update VariablePayAdminApprovals
        await pool.request()
            .input('ApprovalID', sql.Int, ApprovalID)
            .query(`
                UPDATE [VariablePayAdminApprovals]
                SET ApprovalStatusPay = 'Approved',
                    ApprovedAdminDate = GETDATE()
                WHERE ApprovalID = @ApprovalID
            `);

        console.log('Variable Pay approved successfully.');
        return { success: true, message: 'Variable Pay approved successfully.' };
    } catch (error) {
        console.error('Error approving Variable Pay:', error);
        throw new Error('Error approving Variable Pay.');
    }
}


async function rejectAdminVariablePay(ApprovalID, Remarks) {
    try {
        const pool = await poolPromise;
        console.log('Rejecting wages with ApprovalID:', ApprovalID, 'and Remarks:', Remarks);

        // Fetch the approval record
        const approvalResult = await pool.request()
            .input('ApprovalID', sql.Int, ApprovalID)
            .query(`
                SELECT * FROM [VariablePayAdminApprovals]
                WHERE ApprovalID = @ApprovalID
            `);

        if (approvalResult.recordset.length === 0) {
            throw new Error('Approval record not found.');
        }

        const approvalData = approvalResult.recordset[0];

        // Reject in VariablePay
        await pool.request()
            .input('VariablePayId', sql.Int, approvalData.VariablePayId)
            .input('Remarks', sql.NVarChar, Remarks || null) // Allow null if no Remarks provided
            .input('isApprovalReject', sql.Bit, 1)
            .input('IsRejected', sql.Bit, 1)
            .query(`
                UPDATE [VariablePay]
                SET ApprovalStatusPay = 'Rejected',
                    Remarks = @Remarks,
                    isApprovalReject = @isApprovalReject,
                    IsRejected = @IsRejected
                WHERE VariablePayId = @VariablePayId
            `);

        // Update VariablePayAdminApprovals
        await pool.request()
            .input('ApprovalID', sql.Int, ApprovalID)
            .input('Remarks', sql.NVarChar, Remarks || null)
            .query(`
                UPDATE [VariablePayAdminApprovals]
                SET ApprovalStatusPay = 'Rejected',
                    RejectAdminDate = GETDATE(),
                    Remarks = @Remarks
                WHERE ApprovalID = @ApprovalID
            `);

        console.log('Variable Pay rejected successfully.');
        return { success: true, message: 'Variable Pay rejected successfully.' };
    } catch (error) {
        console.error('Error rejecting Variable Pay:', error);
        throw new Error('Error rejecting Variable Pay.');
    }
}



const getVariablePayAdminApproval = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT * FROM VariablePayAdminApprovals
    `);
    return result.recordset;
};











// async function approvalAdminVariablePay(ApprovalID) {
//     try {
//         const pool = await poolPromise;
//         const request = pool.request();
        
//         request.input('ApprovalID', sql.Int, ApprovalID);
        
//         await request.query(`
//             CREATE OR ALTER PROCEDURE spApproveVariablePay
//     @ApprovalID INT
// AS
// BEGIN
//     SET NOCOUNT ON;

//     -- Mark the variable pay as approved
//     UPDATE VariablePayAdminApprovals
//     SET ApprovalStatusPay = 'Approved',
//         ApprovedAdminDate = GETDATE()
//     WHERE ApprovalID = @ApprovalID;

//     -- Additional logic to update the main VariablePay table if necessary
//     DECLARE @VariablePayId INT;
//     SELECT @VariablePayId = VariablePayId FROM VariablePayAdminApprovals WHERE ApprovalID = @ApprovalID;

//     UPDATE VariablePay
//     SET IsApproved = 1, IsRejected = 0
//     WHERE VariablePayId = @VariablePayId;
// END;
// GO
//             `);
        
//         return { success: true, message: 'Variable Pay approved successfully.' };
//     } catch (error) {
//         console.error('Error in approving Variable Pay:', error);
//         throw new Error('Error approving Variable Pay.');
//     }
// }

// async function rejectAdminVariablePay(ApprovalID, Remarks) {
//     try {
//         const pool = await poolPromise;
//         const request = pool.request();
        
//         request.input('ApprovalID', sql.Int, ApprovalID);
//         request.input('Remarks', sql.NVarChar, Remarks);
        
//         await request.query(`
//             CREATE OR ALTER PROCEDURE spRejectVariablePay
//     @ApprovalID INT,
//     @Remarks NVARCHAR(255)
// AS
// BEGIN
//     SET NOCOUNT ON;

//     -- Mark the variable pay as rejected
//     UPDATE VariablePayAdminApprovals
//     SET ApprovalStatusPay = 'Rejected',
//         RejectAdminDate = GETDATE(),
//         Remarks = @Remarks
//     WHERE ApprovalID = @ApprovalID;

//     -- Additional logic to update the main VariablePay table if necessary
//     DECLARE @VariablePayId INT;
//     SELECT @VariablePayId = VariablePayId FROM VariablePayAdminApprovals WHERE ApprovalID = @ApprovalID;

//     UPDATE VariablePay
//     SET IsApproved = 0, IsRejected = 1, Remarks = @Remarks
//     WHERE VariablePayId = @VariablePayId;
// END;
// GO
//         `);
        
//         return { success: true, message: 'Variable Pay rejected successfully.' };
//     } catch (error) {
//         console.error('Error in rejecting Variable Pay:', error);
//         throw new Error('Error rejecting Variable Pay.');
//     }
// }


module.exports = {
    registerData,
    searchFromWages,
    checkExistingVariablePay,
    upsertLabourVariablePay,
    getVariablePayAndLabourOnboardingJoin,
    markVariablePayForApproval,
    approvalAdminVariablePay,
    rejectAdminVariablePay,
    getVariablePayAdminApproval
}