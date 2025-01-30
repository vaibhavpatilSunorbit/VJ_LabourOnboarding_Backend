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
  

async function searchFromVariablePay(query) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('query', sql.NVarChar, `%${query}%`)
            .query('SELECT * FROM VariablePay WHERE name LIKE @query OR companyName LIKE @query OR LabourID LIKE @query OR departmentName LIKE @query OR payAddedBy LIKE @query OR PayStructure LIKE @query');
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
            ORDER BY LabourID
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
    //console.log('Payload received for variablePay:', variablePay);
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
    //console.log("effectiveDate", effectiveDate)
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

        //console.log('Variable Pay marked for admin approval.');
        return { success: true, message: 'Variable Pay marked for admin approval.' };
    } catch (error) {
        console.error('Error marking Variable Pay for approval:', error.message || error);
        throw new Error(error.message || 'Error marking Variable Pay for approval.');
    }
}



async function approvalAdminVariablePay(VariablePayId) {
    try {
        const pool = await poolPromise;
        //console.log('Variable Pay ID in model.js:', VariablePayId);

        // Fetch the approval record
        const approvalResult = await pool.request()
            .input('VariablePayId', sql.Int, VariablePayId)
            .query(`
                SELECT * FROM [VariablePay]
                WHERE VariablePayId = @VariablePayId
            `);

        if (approvalResult.recordset.length === 0) {
            throw new Error('Approval record not found.');
        }

        const approvalData = approvalResult.recordset[0];
        //console.log('approvalData:', approvalData);

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
                ApprovedAdminDate = GETDATE()
            WHERE VariablePayId = @VariablePayId
        `);

        // Update VariablePayAdminApprovals
        // await pool.request()
        //     .input('ApprovalID', sql.Int, ApprovalID)
        //     .query(`
        //         UPDATE [VariablePayAdminApprovals]
        //         SET ApprovalStatusPay = 'Approved',
        //             ApprovedAdminDate = GETDATE()
        //         WHERE ApprovalID = @ApprovalID
        //     `);

        //console.log('Variable Pay approved successfully.');
        return { success: true, message: 'Variable Pay approved successfully.' };
    } catch (error) {
        console.error('Error approving Variable Pay:', error);
        throw new Error('Error approving Variable Pay.');
    }
}


async function rejectAdminVariablePay(VariablePayId, Remarks) {
    try {
        const pool = await poolPromise;
        //console.log('Rejecting wages with VariablePayId:', VariablePayId, 'and Remarks:', Remarks);

        // Fetch the approval record
        const approvalResult = await pool.request()
            .input('VariablePayId', sql.Int, VariablePayId)
            .query(`
                SELECT * FROM [VariablePay]
                WHERE VariablePayId = @VariablePayId
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
                    IsRejected = @IsRejected,
                    RejectAdminDate = GETDATE()
                WHERE VariablePayId = @VariablePayId
            `);

        // Update VariablePayAdminApprovals
        // await pool.request()
        //     .input('VariablePayId', sql.Int, VariablePayId)
        //     .input('Remarks', sql.NVarChar, Remarks || null)
        //     .query(`
        //         UPDATE [VariablePayAdminApprovals]
        //         SET ApprovalStatusPay = 'Rejected',
        //             RejectAdminDate = GETDATE(),
        //             Remarks = @Remarks
        //         WHERE VariablePayId = @VariablePayId
        //     `);

        //console.log('Variable Pay rejected successfully.');
        return { success: true, message: 'Variable Pay rejected successfully.' };
    } catch (error) {
        console.error('Error rejecting Variable Pay:', error);
        throw new Error('Error rejecting Variable Pay.');
    }
}



const getVariablePayAdminApproval = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT * FROM VariablePay
    `);
    return result.recordset;
};




async function getVariablePayByDateRange(projectName, startDate, endDate) {
    const pool = await poolPromise;

    const query = `
    WITH LatestVariablepay AS (
        SELECT 
            onboarding.LabourID,
            onboarding.name,
            onboarding.projectName,
            onboarding.companyName,
            onboarding.businessUnit,
            onboarding.departmentName,
            VariablePay.PayStructure,
            VariablePay.AdvancePay,
            VariablePay.DebitPay,
            VariablePay.IncentivePay,
            VariablePay.VariablepayAmount,
            VariablePay.variablePayRemark,
            VariablePay.EffectiveDate,
            VariablePay.CreatedAt,
            ROW_NUMBER() OVER (PARTITION BY onboarding.LabourID ORDER BY VariablePay.CreatedAt DESC) AS RowNum
        FROM 
            [dbo].[labourOnboarding] AS onboarding
        LEFT JOIN 
            [dbo].[VariablePay] AS VariablePay
        ON 
            onboarding.LabourID = VariablePay.LabourID
            ${projectName !== "all" ? "AND VariablePay.ProjectName = @projectName" : ""}
        WHERE 
            onboarding.status = 'Approved'
            ${projectName !== "all" ? "AND onboarding.projectName = @projectName" : ""}
            ${startDate && endDate ? "AND VariablePay.CreatedAt BETWEEN @startDate AND @endDate" : ""}
    )
    SELECT 
        LabourID,
        name,
        projectName,
        companyName,
        businessUnit,
        departmentName,
        PayStructure,
        AdvancePay,
        DebitPay,
        IncentivePay,
        VariablepayAmount,
        variablePayRemark,
        EffectiveDate,
        CreatedAt
    FROM LatestVariablepay
    WHERE RowNum = 1
    `;

    const request = pool.request();

    // Add input parameters based on the presence of 'projectName'
    if (projectName !== "all") {
        request.input('projectName', sql.VarChar, projectName);
    }

    // Add date range parameters if provided
    if (startDate && endDate) {
        request.input('startDate', sql.Date, startDate);
        request.input('endDate', sql.Date, endDate);
    }

    // Execute the query
    const result = await request.query(query);
    return result.recordset;
}


async function getVariablePayByExcel() {
    const pool = await poolPromise;
    const query = `
        SELECT 
            LabourID,
            PayStructure,
            AdvancePay,
            DebitPay,
            IncentivePay,
            VariablePayAmount,
            VariablePayRemark,
            EffectiveDate
        FROM 
            [dbo].[VariablePay]
    `;

    try {
        const result = await pool.request().query(query);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching Labour records:', error);
        throw new Error('Database query failed.');
    }
};


// Function to get remark options based on PayStructure
const getRemarksOptions = (payStructure) => {
    switch (payStructure.toLowerCase()) {
        case "advance":
            return ["New Joinee", "Payment Delay"];
        case "debit":
            return ["Gadget Mishandling", "Performance Issue"];
        case "incentive":
            return ["Payment Arrears", "Outstanding Performance"];
        default:
            return [];
    }
};

async function insertVariablePayData(row) {
    const pool = await poolPromise;

    // Normalize PayStructure
    if (typeof row.PayStructure === 'string') {
        row.PayStructure = row.PayStructure.trim().toLowerCase();
        // Capitalize first letter, lower the rest
        row.PayStructure = row.PayStructure.charAt(0).toUpperCase() + row.PayStructure.slice(1);
    }

    // Log the normalized PayStructure
    //console.log(`Processing LabourID: ${row.LabourID}, PayStructure: "${row.PayStructure}"`);

    // Validate PayStructure (case-insensitive)
    const validPayStructures = ['Advance', 'Debit', 'Incentive'];
    if (!row.PayStructure || !validPayStructures.includes(row.PayStructure)) {
        throw new Error(`Invalid PayStructure value: ${row.PayStructure}`);
    }

    // Initialize flags
    let AdvancePay = 0, DebitPay = 0, IncentivePay = 0;
    let variablePayRemark = null;

    // Additional validation and flag setting based on PayStructure
    if (row.PayStructure === 'Advance') {
        // Set Advance flag
        AdvancePay = 1;

        // Validate VariablePayRemark
        const remarks = getRemarksOptions('advance');
        if (!row.VariablePayRemark || !remarks.includes(row.VariablePayRemark)) {
            throw new Error(`Invalid VariablePayRemark for Advance. Allowed values: ${remarks.join(', ')}`);
        }
        variablePayRemark = row.VariablePayRemark;
    } else if (row.PayStructure === 'Debit') {
        // Set Debit flag
        DebitPay = 1;

        // Validate VariablePayRemark
        const remarks = getRemarksOptions('debit');
        if (!row.VariablePayRemark || !remarks.includes(row.VariablePayRemark)) {
            throw new Error(`Invalid VariablePayRemark for Debit. Allowed values: ${remarks.join(', ')}`);
        }
        variablePayRemark = row.VariablePayRemark;
    } else if (row.PayStructure === 'Incentive') {
        // Set Incentive flag
        IncentivePay = 1;

        // Validate WeeklyOff
        if (row.WeeklyOff == null || isNaN(parseInt(row.WeeklyOff, 10))) {
            throw new Error(`Invalid WeeklyOff value: ${row.WeeklyOff}`);
        }

        // Validate VariablePayRemark
        const remarks = getRemarksOptions('incentive');
        if (!row.VariablePayRemark || !remarks.includes(row.VariablePayRemark)) {
            throw new Error(`Invalid VariablePayRemark for Incentive. Allowed values: ${remarks.join(', ')}`);
        }
        variablePayRemark = row.VariablePayRemark;
    }

    // Fetch labour details from labourOnboarding table
    const onboardingData = await pool.request()
        .input('LabourID', sql.NVarChar, row.LabourID || '')
        .query(`
            SELECT 
                LabourID,
                name,
                projectName,
                companyName,
                businessUnit,
                departmentName,
                id
            FROM [dbo].[labourOnboarding]
            WHERE LabourID = @LabourID
        `);

    if (onboardingData.recordset.length === 0) {
        throw new Error(`LabourID ${row.LabourID} not found in labourOnboarding table`);
    }

    const labourDetails = onboardingData.recordset[0]; 

    const ApprovalStatusPay = 'AdminPending';

    // Insert data into the database
    await pool
        .request()
        .input('userId', sql.Int, labourDetails.id || 0)
        .input('LabourID', sql.VarChar, row.LabourID)
        .input('payAddedBy', sql.VarChar, row.wagesEditedBy || 'System') // Optional
        .input('name', sql.VarChar, labourDetails.name || '') // Ensure default value if undefined
        .input('projectName', sql.Int, labourDetails.projectName || 0) // Ensure default value if undefined
        .input('companyName', sql.VarChar, labourDetails.companyName || '') 
        .input('businessUnit', sql.VarChar, labourDetails.businessUnit || '') // Ensure default value if undefined
        .input('departmentName', sql.VarChar, labourDetails.departmentName || '') // Ensure default value if undefined
        .input('PayStructure', sql.VarChar, row.PayStructure)
        .input('AdvancePay', sql.Bit, AdvancePay)
        .input('DebitPay', sql.Bit, DebitPay)
        .input('IncentivePay', sql.Bit, IncentivePay)
        .input('VariablepayAmount', sql.Decimal(18, 2), row.VariablePayAmount || 0.00)
        .input('variablePayRemark', sql.NVarChar(255), variablePayRemark)
        .input('EffectiveDate', sql.Date, new Date())
        .input('CreatedAt', sql.DateTime, new Date())
        .input('ApprovalStatusPay', sql.NVarChar(50), ApprovalStatusPay)
        .input('isApprovalSendAdmin', sql.Bit, 1)
        .input('ImportedViaExcel', sql.Bit, 1)
        .query(`
            INSERT INTO [dbo].[VariablePay]
            (userId, LabourID, payAddedBy, name, projectName, companyName, businessUnit, departmentName, PayStructure, AdvancePay, DebitPay, IncentivePay, VariablepayAmount, variablePayRemark, EffectiveDate, CreatedAt, ApprovalStatusPay, isApprovalSendAdmin, ImportedViaExcel)
            VALUES (@userId, @LabourID, @payAddedBy, @name, @projectName, @companyName, @businessUnit, @departmentName, @PayStructure, @AdvancePay, @DebitPay, @IncentivePay, @VariablepayAmount, @variablePayRemark, @EffectiveDate, @CreatedAt, @ApprovalStatusPay, @isApprovalSendAdmin, @ImportedViaExcel)
        `);
}




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


// ----------------------------------------------------------    SALARY GENERATION PROCESS START 27-01-25   -----------------------------------------------------
// ----------------------------------------------------------    SALARY GENERATION PROCESS START 27-01-25   -----------------------------------------------------


async function getAttendanceSummaryForLabour(labourId, month, year) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                SELECT 
                    SUM(CASE WHEN att.Status = 'P'  THEN 1 ELSE 0 END) AS presentDays,
                    SUM(CASE WHEN att.Status = 'A'  THEN 1 ELSE 0 END) AS absentDays,
                    SUM(CASE WHEN att.Status = 'HD' THEN 1 ELSE 0 END) AS halfDays,
                    SUM(CASE WHEN att.Status = 'MP' THEN 1 ELSE 0 END) AS missPunchDays,
                    
                    -- Normal overtime count if status = 'O'
                    SUM(CASE WHEN att.Status = 'O' THEN 1 ELSE 0 END) AS normalOvertimeCount,
                    
                    -- If it's a holiday (hol.HolidayDate IS NOT NULL) and labour status='P', treat as holiday OT
                    SUM(CASE WHEN hol.HolidayDate IS NOT NULL AND att.Status = 'P' THEN 1 ELSE 0 END) AS holidayOvertimeCount
                FROM [dbo].[LabourAttendanceDetails] att
                LEFT JOIN [dbo].[HolidayDate] hol
                     ON att.[Date] = hol.HolidayDate
                WHERE 
                    att.LabourID = @labourId
                    AND MONTH(att.[Date]) = @month
                    AND YEAR(att.[Date]) = @year
            `);

        const row = result.recordset[0] || {};

        return {
            presentDays:        row.presentDays        || 0,
            absentDays:         row.absentDays         || 0,
            halfDays:           row.halfDays           || 0,
            missPunchDays:      row.missPunchDays      || 0,
            normalOvertimeCount: row.normalOvertimeCount || 0,
            holidayOvertimeCount: row.holidayOvertimeCount || 0
        };
    } catch (error) {
        console.error('Error in getAttendanceSummaryForLabour:', error);
        throw error;
    }
};

/**
 * Get variable pay (advances, deductions, bonus/incentive, etc.) for a labour for a given month/year.
 */
async function getVariablePayForLabour(labourId, month, year) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                SELECT 
                    -- Sum of Advance amounts (only if IsApproved=1)
                    ISNULL(SUM(
                        CASE 
                            WHEN PayStructure = 'Advance' 
                                 AND AdvancePay = 1 
                                 AND IsApproved = 1 
                            THEN CAST(VariablePayAmount AS DECIMAL(18,2)) 
                            ELSE 0 
                        END
                    ), 0) AS totalAdvance,

                    -- Concatenate all Advance remarks (only if IsApproved=1)
                    STRING_AGG(
                        CASE 
                            WHEN PayStructure = 'Advance' 
                                 AND AdvancePay = 1 
                                 AND IsApproved = 1
                            THEN variablePayRemark 
                            ELSE NULL 
                        END, 
                        ', '
                    ) AS remarksAdvance,

                    -- Sum of Debit amounts (only if IsApproved=1)
                    ISNULL(SUM(
                        CASE 
                            WHEN PayStructure = 'Debit'
                                 AND DebitPay = 1
                                 AND IsApproved = 1
                            THEN CAST(VariablePayAmount AS DECIMAL(18,2)) 
                            ELSE 0 
                        END
                    ), 0) AS totalDebit,

                    -- Concatenate all Debit remarks (only if IsApproved=1)
                    STRING_AGG(
                        CASE 
                            WHEN PayStructure = 'Debit' 
                                 AND DebitPay = 1 
                                 AND IsApproved = 1
                            THEN variablePayRemark 
                            ELSE NULL 
                        END, 
                        ', '
                    ) AS remarksDebit,

                    -- Sum of Incentive amounts (only if IsApproved=1)
                    ISNULL(SUM(
                        CASE 
                            WHEN PayStructure = 'Incentive'
                                 AND IncentivePay = 1
                                 AND IsApproved = 1
                            THEN CAST(VariablePayAmount AS DECIMAL(18,2))
                            ELSE 0
                        END
                    ), 0) AS totalIncentive,

                    -- Concatenate all Incentive remarks (only if IsApproved=1)
                    STRING_AGG(
                        CASE 
                            WHEN PayStructure = 'Incentive' 
                                 AND IncentivePay = 1 
                                 AND IsApproved = 1
                            THEN variablePayRemark
                            ELSE NULL
                        END,
                        ', '
                    ) AS remarksIncentive

                FROM [VariablePay]
                WHERE
                    LabourID = @labourId
                    AND Month(EffectiveDate) = @month
                    AND Year(EffectiveDate) = @year
            `);

        // If no rows returned or the sums are all null, default to 0
        if (!result.recordset.length) {
            return {
                advance: 0,
                advanceRemarks: '',
                debit: 0,
                debitRemarks: '',
                incentive: 0,
                incentiveRemarks: ''
            };
        }

        // Destructure the returned columns
        const {
            totalAdvance,
            remarksAdvance,
            totalDebit,
            remarksDebit,
            totalIncentive,
            remarksIncentive
        } = result.recordset[0];

        // Build the final object
        return {
            advance: totalAdvance || 0,
            advanceRemarks: remarksAdvance || '',
            debit: totalDebit || 0,
            debitRemarks: remarksDebit || '',
            incentive: totalIncentive || 0,
            incentiveRemarks: remarksIncentive || ''
        };
    } catch (error) {
        console.error('Error in getVariablePayForLabour:', error);
        throw error;
    }
};

/**
 * Get the wage info for a labour (daily wage or monthly wage).
 * If no wage info, we skip that labour for salary generation.
 */
// async function getWageInfoForLabour(labourId, month, year) {
//     try {
//         const pool = await poolPromise;

//         // Fetch all wage entries for the labour within the desired month and year
//         const result = await pool.request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('month', sql.Int, month)
//             .input('year', sql.Int, year)
//             .query(`
//               SELECT
//                 WageID,
//                 FromDate,
//                 ApprovalDate,
//                 EffectiveDate,
//                 PayStructure,
//                 DailyWages,
//                 PerHourWages,
//                 MonthlyWages,
//                 YearlyWages,
//                 WeeklyOff,
//                 FixedMonthlyWages
//               FROM [dbo].[LabourMonthlyWages]
//               WHERE
//                   LabourID = @labourId
//                   AND isApprovalDoneAdmin = 1
//                   AND (MONTH(FromDate) <= @month AND YEAR(FromDate) <= @year)
//                   AND (MONTH(ApprovalDate) <= @month AND YEAR(ApprovalDate) <= @year)
//               ORDER BY FromDate DESC, ApprovalDate DESC;  
//             `);

//         if (!result.recordset.length) {
//             return null; // No wages found for this labour
//         }

//         // Iterate through the wage records to calculate the applicable wage for the specified month
//         let applicableWage = null;

//         for (const wage of result.recordset) {
//             const fromDate = new Date(wage.FromDate);
//             const approvalDate = new Date(wage.ApprovalDate);

//             // Check if this wage entry is valid for the given month/year
//             if (
//                 (fromDate.getFullYear() < year || (fromDate.getFullYear() === year && fromDate.getMonth() + 1 <= month)) &&
//                 (approvalDate.getFullYear() < year || (approvalDate.getFullYear() === year && approvalDate.getMonth() + 1 <= month))
//             ) {
//                 // If a previous wage entry exists and overlaps with the current month, consider it
//                 if (!applicableWage || fromDate > new Date(applicableWage.FromDate)) {
//                     applicableWage = wage;
//                 }

//                 // If the `EffectiveDate` exists and is within the month, use it for calculations
//                 const effectiveDate = wage.EffectiveDate ? new Date(wage.EffectiveDate) : null;
//                 if (effectiveDate && effectiveDate.getFullYear() === year && effectiveDate.getMonth() + 1 === month) {
//                     applicableWage = wage;
//                 }
//             }
//         }

//         if (!applicableWage) {
//             return null; // No applicable wage entry found
//         }

//         // Calculate the daily or monthly wage for the specific dates
//         const daysInMonth = new Date(year, month, 0).getDate();
//         const fromDate = new Date(applicableWage.FromDate);
//         const effectiveDate = applicableWage.EffectiveDate ? new Date(applicableWage.EffectiveDate) : null;

//         let daysApplicable = daysInMonth;

//         if (fromDate.getFullYear() === year && fromDate.getMonth() + 1 === month) {
//             daysApplicable -= fromDate.getDate() - 1;
//         }

//         if (effectiveDate && effectiveDate.getFullYear() === year && effectiveDate.getMonth() + 1 === month) {
//             daysApplicable = daysInMonth - (effectiveDate.getDate() - 1);
//         }

//         // Calculate wages based on applicable days
//         let calculatedWages = {
//             dailyWages: 0,
//             monthlyWages: 0
//         };

//         if (applicableWage.PayStructure.toLowerCase().includes('daily')) {
//             calculatedWages.dailyWages = applicableWage.DailyWages * daysApplicable;
//         } else if (applicableWage.FixedMonthlyWages) {
//             calculatedWages.monthlyWages = (applicableWage.FixedMonthlyWages / daysInMonth) * daysApplicable;
//         } else {
//             calculatedWages.monthlyWages = (applicableWage.MonthlyWages / daysInMonth) * daysApplicable;
//         }

//         // Return the applicable wage information along with calculated wages
//         return {
//             ...applicableWage,
//             daysApplicable,
//             calculatedWages
//         };
//     } catch (error) {
//         console.error('Error in getWageInfoForLabour:', error);
//         throw error;
//     }
// }

async function getWageInfoForLabour(labourId, month, year) {
    try {
        const pool = await poolPromise;

        // Fetch all wage entries for the labour within the desired month and year
        const result = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
              SELECT
                WageID,
                FromDate,
                ApprovalDate,
                EffectiveDate,
                PayStructure,
                DailyWages,
                PerHourWages,
                MonthlyWages,
                YearlyWages,
                WeeklyOff,
                FixedMonthlyWages
              FROM [dbo].[LabourMonthlyWages]
              WHERE
                  LabourID = @labourId
                  AND isApprovalDoneAdmin = 1
                  AND (YEAR(FromDate) < @year OR (YEAR(FromDate) = @year AND MONTH(FromDate) <= @month))
                  AND (YEAR(ApprovalDate) < @year OR (YEAR(ApprovalDate) = @year AND MONTH(ApprovalDate) <= @month))
              ORDER BY FromDate DESC, ApprovalDate DESC;
            `);

        if (!result.recordset.length) {
            return null; // No wages found for this labour
        }

        let applicableWage = null;
        let previousWage = null;

        for (const wage of result.recordset) {
            const fromDate = new Date(wage.FromDate);
            const approvalDate = new Date(wage.ApprovalDate);

            if (
                (fromDate.getFullYear() < year || (fromDate.getFullYear() === year && fromDate.getMonth() + 1 <= month)) &&
                (approvalDate.getFullYear() < year || (approvalDate.getFullYear() === year && approvalDate.getMonth() + 1 <= month))
            ) {
                if (!applicableWage) {
                    applicableWage = wage;
                } else if (!previousWage) {
                    previousWage = wage; // Store the previous wage
                }
            }
        }

        if (!applicableWage) {
            return null; // No applicable wage entry found
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        const fromDate = new Date(applicableWage.FromDate);
        const effectiveDate = applicableWage.EffectiveDate ? new Date(applicableWage.EffectiveDate) : null;

        let previousDaysApplicable = 0;
        let currentDaysApplicable = daysInMonth;

        if (fromDate.getFullYear() === year && fromDate.getMonth() + 1 === month) {
            previousDaysApplicable = fromDate.getDate() - 1;
            currentDaysApplicable = daysInMonth - previousDaysApplicable;
        }

        if (effectiveDate && effectiveDate.getFullYear() === year && effectiveDate.getMonth() + 1 === month) {
            previousDaysApplicable = effectiveDate.getDate() - 1;
            currentDaysApplicable = daysInMonth - previousDaysApplicable;
        }

        let calculatedWages = {
            previousWageAmount: 0,
            currentWageAmount: 0,
            totalWageAmount: 0
        };

        if (previousWage) {
            if (previousWage.PayStructure.toLowerCase().includes('daily')) {
                calculatedWages.previousWageAmount = previousWage.DailyWages * previousDaysApplicable;
            } else if (previousWage.FixedMonthlyWages) {
                calculatedWages.previousWageAmount = (previousWage.FixedMonthlyWages / daysInMonth) * previousDaysApplicable;
            } else {
                calculatedWages.previousWageAmount = (previousWage.MonthlyWages / daysInMonth) * previousDaysApplicable;
            }
        }

        if (applicableWage.PayStructure.toLowerCase().includes('daily')) {
            calculatedWages.currentWageAmount = applicableWage.DailyWages * currentDaysApplicable;
        } else if (applicableWage.FixedMonthlyWages) {
            calculatedWages.currentWageAmount = (applicableWage.FixedMonthlyWages / daysInMonth) * currentDaysApplicable;
        } else {
            calculatedWages.currentWageAmount = (applicableWage.MonthlyWages / daysInMonth) * currentDaysApplicable;
        }

        calculatedWages.totalWageAmount = calculatedWages.previousWageAmount + calculatedWages.currentWageAmount;

        return {
            ...applicableWage,
            previousWage,
            previousDaysApplicable,
            currentDaysApplicable,
            calculatedWages
        };
    } catch (error) {
        console.error('Error in getWageInfoForLabour:', error);
        throw error;
    }
};


/**
 * Return list of labour IDs who are eligible for salary generation in a given month/year.
 * - They must have at least 1 present/half day (i.e. not absent full month).
 * - They must have wages added in [LabourMonthlyWages].
 */
async function getEligibleLabours(month, year) {
    try {
        const pool = await poolPromise;
        // Just an example. Adjust to your table and columns:
        const result = await pool.request()
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)

            // .query(`
        //         WITH AttendanceCTE AS (
        //             SELECT 
        //                 LabourId,
        //                 SUM(
        //                     CASE 
        //                         WHEN [Status] IN ('P','HD','H','MP','O') 
        //                         THEN 1 
        //                         ELSE 0
        //                     END
        //                 ) AS AttendanceCount
        //             FROM [dbo].[LabourAttendanceDetails]
        //             WHERE 
        //                 MONTH([Date]) = @month
        //                 AND YEAR([Date])  = @year
        //             GROUP BY LabourId
        //         )
        //         SELECT A.LabourId
        //         FROM AttendanceCTE A
        //              INNER JOIN [dbo].[LabourMonthlyWages] W
        //                      ON A.LabourId = W.LabourID
        //         WHERE A.AttendanceCount > 0
        //           AND W.isApprovalDoneAdmin = 1
        //         GROUP BY A.LabourId
        //     ORDER BY 
        // A.LabourId;
            // `);

// ----------------------------------  THIS FOR ANOTHER QUERY FOR LabourAttendanceSummary TABLE ---------------------------------------

//             .query(`
//                 WITH AttendanceCTE AS (
//     SELECT 
//         LabourID
//     FROM [LabourOnboardingForm_TEST].[dbo].[LabourAttendanceSummary]
//     WHERE 
//         SelectedMonth = '2024-11'  -- e.g., "YYYY-MM" format
//         AND PresentDays >= 1
// )
// SELECT 
//     A.LabourId
// FROM 
//     AttendanceCTE A
//     INNER JOIN [LabourOnboardingForm_TEST].[dbo].[LabourMonthlyWages] W 
//         ON A.LabourId = W.LabourID
// WHERE 
//     W.isApprovalDoneAdmin = 1
// GROUP BY 
//     A.LabourId;
// ORDER BY 
// A.LabourId;
//             `);

// ------------------------------------------------------------------------------   END AND START   ---------------------------------------------------------------------------------------------

.query(`
    WITH AttendanceCTE AS (
        SELECT 
            LabourId,
            SUM(
                CASE 
                    WHEN [Status] IN ('P', 'HD', 'H', 'MP', 'O') 
                    THEN 1 
                    ELSE 0
                END
            ) AS AttendanceCount
        FROM [dbo].[LabourAttendanceDetails]
        WHERE 
            MONTH([Date]) = @month
            AND YEAR([Date]) = @year
        GROUP BY LabourId
    )
    SELECT 
        onboarding.id,
        onboarding.LabourID AS LabourId,
        onboarding.name,
        onboarding.businessUnit,
        onboarding.projectName,
        onboarding.departmentName,
        onboarding.department,
        AttendanceCTE.AttendanceCount
    FROM 
        AttendanceCTE
    INNER JOIN 
        [labourOnboarding] AS onboarding
    ON 
        AttendanceCTE.LabourId = onboarding.LabourID
    WHERE 
        onboarding.status = 'Approved'
        AND AttendanceCTE.AttendanceCount > 0
    ORDER BY 
        onboarding.LabourID;
`);

// Map results to an array of labour details
const labourDetails = result.recordset.map(row => ({
id: row.id,
labourId: row.LabourId,
name: row.name,
businessUnit: row.businessUnit,
projectName: row.projectName,
departmentName: row.departmentName,
department: row.department,
attendanceCount: row.AttendanceCount
}));
return labourDetails;
// -----------------------------------------------------------    END     ----------------------------------------------------

        // const labourIds = result.recordset.map(row => row.LabourId);
        // return labourIds;
    } catch (error) {
        console.error('Error in getEligibleLabours:', error);
        throw error;
    }
};

// ------------------------------------------     calculate OT ----------------------

async function calculateTotalOvertime(labourId, month, year) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                SELECT 
                    SUM(CASE WHEN Overtime < 4 THEN Overtime ELSE 4 END) AS TotalOvertime,
                    SUM(CASE WHEN OvertimeManually < 4 THEN OvertimeManually ELSE 4 END) AS TotalOvertimeManually
                FROM LabourAttendanceDetails
                WHERE LabourId = @labourId
                  AND MONTH(Date) = @month
                  AND YEAR(Date) = @year
            `);


//             .query(`
//                SELECT 
//     SUM(
//         CASE 
//             WHEN Overtime < 4 AND OvertimeManually < 4 THEN 
//                 CASE WHEN Overtime < OvertimeManually THEN Overtime ELSE OvertimeManually END
//             WHEN Overtime < 4 THEN Overtime
//             WHEN OvertimeManually < 4 THEN OvertimeManually
//             ELSE 4
//         END
//     ) AS TotalEffectiveOvertime
// FROM LabourAttendanceDetails
//                 WHERE LabourId = @labourId
//                   AND MONTH(Date) = @month
//                   AND YEAR(Date) = @year
//             `);

if (!result.recordset || result.recordset.length === 0) {
    throw new Error('No data found for the given inputs.');
}
        const { TotalOvertime = 0, TotalOvertimeManually = 0 } = result.recordset[0] || {};
        const cappedOvertime = Math.min(TotalOvertime || 0, TotalOvertimeManually || 0, 120);

        return cappedOvertime;
    } catch (error) {
        console.error('Error in calculateTotalOvertime:', error);
        throw error;
    }
};


/**
 * Calculate net salary for a single labour for the given month/year.
 * Returns an object with the final breakdown.
 */

// async function calculateSalaryForLabour(labourId, month, year) {
//     try {
//         // A) Attendance
//         const attendance = await getAttendanceSummaryForLabour(labourId, month, year);

//         // B) Wages
//         const wages = await getWageInfoForLabour(labourId, month, year);

//         // C) Variable Pay
//         const variablePay = await getVariablePayForLabour(labourId, month, year);

//         if (!wages) {
//             // Means no approved wages for this labour
//             return null;
//         }

//         // --- Destructure attendance ---
//         const { 
//             presentDays = 0, 
//             absentDays = 0, 
//             halfDays = 0, 
//             normalOvertimeCount = 0, 
//             holidayOvertimeCount = 0 
//         } = attendance;

//         // --- Destructure wages ---
//         const wageType = wages.PayStructure || '';
//         const dailyWageRate = wages.DailyWages || 0;
//         const monthlySalary = wages.MonthlyWages || 0;
//         const weeklyOffDays = wages.WeeklyOff || 0;
//         const fixedMonthlyWage = wages.FixedMonthlyWages || 0;

//         // --- Destructure variable pay ---
//         const {
//             advance,
//             advanceRemarks,
//             debit,
//             debitRemarks,
//             incentive,
//             incentiveRemarks
//         } = variablePay;

//         // 1) Basic Salary & Overtime
//         let basicSalary = 0;
//         let totalOvertimeDays = normalOvertimeCount + holidayOvertimeCount;
//         let overtimePay = 0;

//         if (wageType.toLowerCase().includes('daily')) {
//             // Daily wages
//             basicSalary = dailyWageRate * presentDays;
//             // OT rate: dailyWageRate * 1.5 (or your custom logic)
//             overtimePay = totalOvertimeDays * dailyWageRate * 1.5;
//         } else {
//             // Monthly wages
//             const baseMonthly = fixedMonthlyWage || monthlySalary;
//             basicSalary = baseMonthly;

//             // e.g. 30 days in the month
//             const dailyRate = baseMonthly / 30;

//             // Absent & Half-day deduction
//             const absentDaysDeduction = absentDays * dailyRate;
//             const halfDaysDeduction   = halfDays * (dailyRate / 2);

//             overtimePay = totalOvertimeDays * dailyRate * 1.5;

//             // We'll place these attendance deductions in totalDeductions
//             var totalAttendanceDeductions = absentDaysDeduction + halfDaysDeduction;
//         }

//         // 2) WeeklyOff Logic
//         let weeklyOffPay = 0;
//         if (weeklyOffDays > 0) {
//             if (presentDays > 15) {
//                 // Full pay
//                 if (wageType.toLowerCase().includes('Daily Wages')) {
//                     weeklyOffPay = weeklyOffDays * dailyWageRate;
//                 } else {
//                     const baseMonthly = fixedMonthlyWage || monthlySalary;
//                     const dailyRate = baseMonthly / 30;
//                     weeklyOffPay = weeklyOffDays * dailyRate;
//                 }
//             } else {
//                 // Half pay
//                 if (wageType.toLowerCase().includes('Fixed Monthly Wages')) {
//                     weeklyOffPay = weeklyOffDays * dailyWageRate * 0.5;
//                 } else {
//                     const baseMonthly = fixedMonthlyWage || monthlySalary;
//                     const dailyRate = baseMonthly / 30;
//                     weeklyOffPay = weeklyOffDays * dailyRate * 0.5;
//                 }
//             }
//         }

//         // 3) Deductions
//         let totalDeductions = 0;
//         if (typeof totalAttendanceDeductions !== 'undefined') {
//             totalDeductions += totalAttendanceDeductions;
//         }
//         totalDeductions += (advance || 0);
//         totalDeductions += (debit   || 0);

//         // 4) Bonuses / Incentives
//         let bonuses = 0;
//         bonuses += (incentive || 0);

//         // 5) Gross Pay
//         const grossPay = basicSalary + overtimePay + weeklyOffPay + bonuses;

//         // 6) Net Pay (no PF/ESI/TDS)
//         let netPay = grossPay - totalDeductions;
//         // If negative, clamp to 0 if that is your policy
//         if (netPay < 0) {
//             netPay = 0;
//         }

//         // 7) Return final breakdown
//         return {
//             labourId,
//             month,
//             year,
//             wageType,
//             presentDays,
//             absentDays,
//             halfDays,
//             normalOvertimeCount,
//             holidayOvertimeCount,
//             basicSalary,
//             overtimePay,
//             weeklyOffPay,
//             bonuses,
//             totalDeductions,
//             grossPay,
//             netPay,

//             // Variable Pay Info
//             variablePay: {
//                 advance, advanceRemarks,
//                 debit,   debitRemarks,
//                 incentive, incentiveRemarks
//             }
//         };
//     } catch (error) {
//         console.error('Error in calculateSalaryForLabour:', error);
//         throw error;
//     }
// };

async function calculateSalaryForLabour(labourId, month, year) {
    try {
        // 1️⃣ **Fetch Attendance Summary**
        const attendance = await getAttendanceSummaryForLabour(labourId, month, year);

        // 2️⃣ **Fetch Wage Info**
        const wages = await getWageInfoForLabour(labourId, month, year);

        // 3️⃣ **Fetch Variable Pay**
        const variablePay = await getVariablePayForLabour(labourId, month, year);

        // 4️⃣ **Calculate Total Overtime**
        const cappedOvertime = await calculateTotalOvertime(labourId, month, year);

        if (!wages) {
            return { message: `No approved wages for labour ID: ${labourId}` };
        }

        // 🟢 **Extract Attendance Data**
        const {
            presentDays = 0,
            absentDays = 0,
            halfDays = 0,
            missPunchDays = 0,
            normalOvertimeCount = 0,
            holidayOvertimeCount = 0
        } = attendance;

        // 🟢 **Extract Wage Data**
        const wageType = wages.PayStructure || "-";
        const dailyWageRate = wages.DailyWages || 0;
        const monthlySalary = wages.MonthlyWages || 0;
        const weeklyOffDays = wages.WeeklyOff || 0;
        const fixedMonthlyWage = wages.FixedMonthlyWages || 0;

        const previousWage = wages.previousWage;
        const previousDaysApplicable = wages.previousDaysApplicable || 0;
        const currentDaysApplicable = wages.currentDaysApplicable || 0;

        // 🟢 **Extract Variable Pay**
        const {
            advance = 0,
            advanceRemarks = "-",
            debit = 0,
            debitRemarks = "-",
            incentive = 0,
            incentiveRemarks = "-"
        } = variablePay;

        // ✅ **Calculate Basic Salary**
        let basicSalary = 0;
        let totalOvertimeDays = normalOvertimeCount + holidayOvertimeCount;
        let overtimePay = 0;

        if (wageType.toLowerCase().includes('daily')) {
            // Daily wages
            basicSalary = dailyWageRate * presentDays;
            overtimePay = totalOvertimeDays * dailyWageRate * 1.5; // OT rate = 1.5x
        } else {
            // Monthly wages
            const baseMonthly = fixedMonthlyWage || monthlySalary;
            basicSalary = baseMonthly;

            const dailyRate = baseMonthly / 30;
            const absentDaysDeduction = absentDays * dailyRate;
            const halfDaysDeduction = halfDays * (dailyRate / 2);
            overtimePay = totalOvertimeDays * dailyRate * 1.5;

            var totalAttendanceDeductions = absentDaysDeduction + halfDaysDeduction;
        }

        // ✅ **Previous Wage Calculation**
        let previousWageAmount = 0;
        if (previousWage) {
            if (previousWage.PayStructure.toLowerCase().includes('daily')) {
                previousWageAmount = previousWage.DailyWages * previousDaysApplicable;
            } else {
                const previousBase = previousWage.FixedMonthlyWages || previousWage.MonthlyWages;
                previousWageAmount = (previousBase / 30) * previousDaysApplicable;
            }
        }

        // ✅ **Weekly Off Calculation**
        let weeklyOffPay = 0;
        if (weeklyOffDays > 0) {
            if (presentDays > 15) {
                if (wageType.toLowerCase().includes('daily')) {
                    weeklyOffPay = weeklyOffDays * dailyWageRate;
                } else {
                    const dailyRate = (fixedMonthlyWage || monthlySalary) / 30;
                    weeklyOffPay = weeklyOffDays * dailyRate;
                }
            } else {
                if (wageType.toLowerCase().includes('fixed monthly')) {
                    weeklyOffPay = weeklyOffDays * dailyWageRate * 0.5;
                } else {
                    const dailyRate = (fixedMonthlyWage || monthlySalary) / 30;
                    weeklyOffPay = weeklyOffDays * dailyRate * 0.5;
                }
            }
        }

        // ✅ **Calculate Deductions**
        let totalDeductions = totalAttendanceDeductions || 0;
        totalDeductions += advance;
        totalDeductions += debit;

        // ✅ **Calculate Bonuses/Incentives**
        let bonuses = incentive || 0;

        // ✅ **Calculate Gross Pay**
        const grossPay = basicSalary + overtimePay + weeklyOffPay + bonuses + previousWageAmount;

        // ✅ **Calculate Net Pay**
        let netPay = grossPay - totalDeductions;
        if (netPay < 0) {
            netPay = 0; // Prevent negative salary
        }

        // ✅ **Return Final Salary Data**
        return {
            labourId,
            month,
            year,
            wageType,
            dailyWageRate: dailyWageRate.toFixed(2),
            fixedMonthlyWage: fixedMonthlyWage.toFixed(2),
            presentDays,
            absentDays,
            halfDays,
            missPunchDays,
            normalOvertimeCount,
            holidayOvertimeCount,
            cappedOvertime: cappedOvertime.toFixed(2),
            basicSalary: basicSalary.toFixed(2),
            previousWageAmount: previousWageAmount.toFixed(2),
            overtimePay: overtimePay.toFixed(2),
            weeklyOffPay: weeklyOffPay.toFixed(2),
            bonuses: bonuses.toFixed(2),
            totalDeductions: totalDeductions.toFixed(2),
            grossPay: grossPay.toFixed(2),
            netPay: netPay.toFixed(2),
            advance: advance.toFixed(2),
            advanceRemarks,
            debit: debit.toFixed(2),
            debitRemarks,
            incentive: incentive.toFixed(2),
            incentiveRemarks
        };
    } catch (error) {
        console.error("Error in calculateSalaryForLabour:", error);
        throw error;
    }
};



/**
 * Generate salary for **all** eligible labours in a given month/year.
 * Returns an array of salary objects.
 */

async function generateMonthlyPayroll(month, year) {
    try {
        const eligibleLabours = await getEligibleLabours(month, year);
        let finalSalaries = [];

        const pool = await poolPromise;

        for (const labour of eligibleLabours) {
            const salaryDetail = await calculateSalaryForLabour(labour.labourId, month, year);

            if (salaryDetail) {
                const variablePay = salaryDetail.variablePay || {};
                finalSalaries.push(salaryDetail);

                // 2) Insert into [MonthlySalaryGeneration] table
                await pool.request()
                    .input('labourId', sql.NVarChar, salaryDetail.labourId)
                    .input('salaryMonth', sql.Int, month)
                    .input('salaryYear', sql.Int, year)
                    .input('wageType', sql.NVarChar, salaryDetail.wageType)
                    .input('presentDays', sql.Int, salaryDetail.presentDays)
                    .input('absentDays', sql.Int, salaryDetail.absentDays)
                    .input('halfDays', sql.Int, salaryDetail.halfDays)
                    .input('basicSalary', sql.Decimal(18,2), salaryDetail.basicSalary)
                    .input('overtimePay', sql.Decimal(18,2), salaryDetail.overtimePay)
                    .input('weeklyOffPay', sql.Decimal(18,2), salaryDetail.weeklyOffPay)
                    .input('bonuses', sql.Decimal(18,2), salaryDetail.bonuses)
                    .input('totalDeductions', sql.Decimal(18,2), salaryDetail.totalDeductions)
                    .input('grossPay', sql.Decimal(18,2), salaryDetail.grossPay)
                    .input('netPay', sql.Decimal(18,2), salaryDetail.netPay)

                    // Variable Pay remarks
                    .input('advanceRemarks', sql.NVarChar, variablePay.advanceRemarks || '')
                    .input('debitRemarks',   sql.NVarChar, variablePay.debitRemarks   || '')
                    .input('incentiveRemarks', sql.NVarChar, variablePay.incentiveRemarks || '')

                    .query(`
                        INSERT INTO [dbo].[MonthlySalaryGeneration] 
                        (
                            LabourID, SalaryMonth, SalaryYear, WageType,
                            PresentDays, AbsentDays, HalfDays,
                            BasicSalary, OvertimePay, WeeklyOffPay, Bonuses,
                            TotalDeductions, GrossPay, NetPay,
                            AdvanceRemarks, DebitRemarks, IncentiveRemarks
                        )
                        VALUES
                        (
                            @labourId, @salaryMonth, @salaryYear, @wageType,
                            @presentDays, @absentDays, @halfDays,
                            @basicSalary, @overtimePay, @weeklyOffPay, @bonuses,
                            @totalDeductions, @grossPay, @netPay,
                            @advanceRemarks, @debitRemarks, @incentiveRemarks
                        );
                    `);
            }
        }

        return finalSalaries; // In case you want to return the computed data
    } catch (error) {
        console.error('Error generating monthly payroll:', error);
        throw error;
    }
}






module.exports = {
    registerData,
    searchFromVariablePay,
    checkExistingVariablePay,
    upsertLabourVariablePay,
    getVariablePayAndLabourOnboardingJoin,
    markVariablePayForApproval,
    approvalAdminVariablePay,
    rejectAdminVariablePay,
    getVariablePayAdminApproval,
    getVariablePayByDateRange,
    getVariablePayByExcel,
    insertVariablePayData,
// -----------------------------------------------------------------------  salary generation process --------------------------------------
    getAttendanceSummaryForLabour,
    getVariablePayForLabour,
    getWageInfoForLabour,
    getEligibleLabours,
    calculateSalaryForLabour,
    generateMonthlyPayroll,
    calculateTotalOvertime
}