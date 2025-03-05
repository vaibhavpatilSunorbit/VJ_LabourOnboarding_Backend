const { poolPromise2 } = require('../config/dbConfig2');
const { sql, poolPromise } = require('../config/dbConfig');
const { poolPromise3 } = require('../config/dbConfig3');
const ExcelJS = require('exceljs');
const fs = require('fs');

async function getAllLabours(filters = {}) {
    const pool = await poolPromise;
    // Start with the status filter to ensure only "Approved" entries are returned
    let query = "SELECT * FROM labourOnboarding WHERE status = 'Approved'";
    let conditions = [];

    if (filters.ProjectID) {
        conditions.push("projectName = @projectID");
    }
    if (filters.DepartmentID) {
        conditions.push("department = @departmentID");
    }

    // Append additional conditions if they exist
    if (conditions.length > 0) {
        query += " AND " + conditions.join(" AND ");
    }

    query += " ORDER BY LabourID;";

    const request = pool.request();
    if (filters.ProjectID) {
        request.input("projectID", filters.ProjectID);
    }
    if (filters.DepartmentID) {
        request.input("departmentID", filters.DepartmentID);
    }

    const result = await request.query(query);
    return result.recordset;
}




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
            .query('SELECT * FROM VariablePay WHERE name LIKE @query OR companyName LIKE @query OR LabourID LIKE @query OR departmentName LIKE @query OR payAddedBy LIKE @query OR PayStructure LIKE @query OR businessUnit LIKE @query OR variablePayRemark LIKE @query');
        return result.recordset;
    } catch (error) {
        throw error;
    }
};

async function searchFromAttendanceApproval(query) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('query', sql.NVarChar, `%${query}%`)
            .query('SELECT * FROM LabourAttendanceApproval WHERE LabourId LIKE @query OR Date LIKE @query OR OnboardName LIKE @query');
        return result.recordset;
    } catch (error) {
        throw error;
    }
};

async function searchFromWagesApproval(query) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('query', sql.NVarChar, `%${query}%`)
            .query('SELECT * FROM WagesAdminApprovals WHERE LabourID LIKE @query OR DailyWages LIKE @query OR WagesEditedBy LIKE @query OR MonthlyWages LIKE @query OR FixedMonthlyWages LIKE @query OR WeeklyOff LIKE @query OR PayStructure LIKE @query OR EffectiveDate LIKE @query');
        return result.recordset;
    } catch (error) {
        throw error;
    }
};

async function searchFromSiteTransferApproval(query) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('query', sql.NVarChar, `%${query}%`)
            .query('SELECT * FROM AdminSiteTransferApproval WHERE LabourID LIKE @query OR name LIKE @query OR currentSiteName LIKE @query OR transferSiteName LIKE @query OR siteTransferBy LIKE @query OR rejectionReason LIKE @query OR transferDate LIKE @query');
        return result.recordset;
    } catch (error) {
        throw error;
    }
};

async function searchFromViewMonthlyPayrolls(query) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('query', sql.NVarChar, `%${query}%`)
            .query('SELECT * FROM FinalizedSalaryPay WHERE LabourID LIKE @query OR name LIKE @query OR wageType LIKE @query ');
        return result.recordset;
    } catch (error) {
        throw error;
    }
};

// const getVariablePayAndLabourOnboardingJoin = async () => {
//     const pool = await poolPromise;

//     const result = await pool.request().query(`
//         SELECT 
//             onboarding.id,
//             onboarding.LabourID,
//             onboarding.name,
//             onboarding.businessUnit,
//             onboarding.projectName,
//             onboarding.departmentName,
//             onboarding.department,
//             variablepay.payAddedBy,
//             variablepay.PayStructure,
//             variablepay.AdvancePay,
//             variablepay.DebitPay,
//             variablepay.IncentivePay,
//             variablepay.VariablepayAmount,
//             variablepay.ApprovalStatusPay,
//             variablepay.CreatedAt,
//             variablepay.variablePayRemark,
//             variablepay.EffectiveDate,
//             variablepay.userId
//         FROM 
//             [labourOnboarding] AS onboarding
//         LEFT JOIN 
//             [VariablePay] AS variablepay
//         ON 
//             onboarding.LabourID = variablepay.LabourID
//         WHERE 
//             onboarding.status = 'Approved'
//             ORDER BY LabourID
//     `);

//     return result.recordset;
// };

const getVariablePayAndLabourOnboardingJoin = async (filters = {}) => {
    const pool = await poolPromise;

    let query = `
        SELECT 
            onboarding.id,
            onboarding.LabourID,
            onboarding.name,
            onboarding.businessUnit,
            onboarding.departmentName,
            onboarding.projectName AS ProjectID,
        onboarding.department AS DepartmentID,
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
           `;

    // Append additional filters if provided from the frontend
    if (filters.ProjectID) {
        // Note: Ensure that the value of filters.ProjectID is safe or use a parameterized query.
        query += ` AND onboarding.projectName = ${filters.ProjectID}`;
    }
    if (filters.DepartmentID) {
        query += ` AND onboarding.department = ${filters.DepartmentID}`;
    }

    // query += ` ORDER BY onboarding.LabourID ASC;`;

    const result = await pool.request().query(query);
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
        await pool.request()
            .input('VariablePayId', sql.Int, approvalData.VariablePayId)
            .query(`
    UPDATE [VariablePayAdminApprovals]
    SET ApprovalStatusPay = 'Approved',
        ApprovedAdminDate = GETDATE()
    WHERE VariablePayId = @VariablePayId
`);
        return { success: true, message: 'Variable Pay approved successfully.' };
    } catch (error) {
        console.error('Error approving Variable Pay:', error);
        throw new Error('Error approving Variable Pay.');
    }
}


async function rejectAdminVariablePay(VariablePayId, Remarks) {
    try {
        const pool = await poolPromise;
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
        await request.input('VariablePayId', sql.Int, approvalData.VariablePayId)
        request.input('Remarks', sql.NVarChar, Remarks || null)
            .query(`
    UPDATE [VariablePayAdminApprovals]
    SET ApprovalStatusPay = 'Rejected',
        RejectAdminDate = GETDATE(),
        Remarks = @Remarks
    WHERE VariablePayId = @VariablePayId
`);

        return { success: true, message: 'Variable Pay rejected successfully.' };
    } catch (error) {
        console.error('Error rejecting Variable Pay:', error);
        throw new Error('Error rejecting Variable Pay.');
    }
}


// async function approvalAdminVariablePay(VariablePayId) {
//     try {
//         const pool = await poolPromise;

//         // Fetch the approval record
//         const approvalResult = await pool.request()
//             .input('VariablePayId', sql.Int, VariablePayId)
//             .query(`
//                 SELECT * FROM [VariablePay]
//                 WHERE VariablePayId = @VariablePayId
//             `);

//         if (approvalResult.recordset.length === 0) {
//             throw new Error('Approval record not found.');
//         }

//         const approvalData = approvalResult.recordset[0];

//         // Start transaction
//         const transaction = pool.transaction();
//         await transaction.begin();

//         const request = transaction.request();

//         // Approve in VariablePay
//         await request.input('VariablePayId', sql.Int, approvalData.VariablePayId)
//             .input('isApprovalDoneAdmin', sql.Bit, 1)
//             .input('IsApproved', sql.Bit, 1)
//             .query(`
//                 UPDATE [VariablePay]
//                 SET ApprovalStatusPay = 'Approved',
//                     isApprovalDoneAdmin = @isApprovalDoneAdmin,
//                     IsApproved = @IsApproved,
//                     ApprovedAdminDate = GETDATE()
//                 WHERE VariablePayId = @VariablePayId
//             `);

//         // Approve in VariablePayAdminApprovals
//         await request.input('VariablePayId', sql.Int, approvalData.VariablePayId)
//             .query(`
//                 UPDATE [VariablePayAdminApprovals]
//                 SET ApprovalStatusPay = 'Approved',
//                     ApprovedAdminDate = GETDATE()
//                 WHERE VariablePayId = @VariablePayId
//             `);

//         // Commit transaction
//         await transaction.commit();

//         return { success: true, message: 'Variable Pay approved successfully.' };
//     } catch (error) {
//         console.error('Error approving Variable Pay:', error);
//         throw new Error('Error approving Variable Pay.');
//     }
// }


// async function rejectAdminVariablePay(VariablePayId, Remarks) {
//     try {
//         const pool = await poolPromise;

//         // Fetch the approval record
//         const approvalResult = await pool.request()
//             .input('VariablePayId', sql.Int, VariablePayId)
//             .query(`
//                 SELECT * FROM [VariablePay]
//                 WHERE VariablePayId = @VariablePayId
//             `);

//         if (approvalResult.recordset.length === 0) {
//             throw new Error('Approval record not found.');
//         }

//         const approvalData = approvalResult.recordset[0];

//         // Start transaction
//         const transaction = pool.transaction();
//         await transaction.begin();

//         const request = transaction.request();

//         // Reject in VariablePay
//         await request.input('VariablePayId', sql.Int, approvalData.VariablePayId)
//             .input('Remarks', sql.NVarChar, Remarks || null)
//             .input('isApprovalReject', sql.Bit, 1)
//             .input('IsRejected', sql.Bit, 1)
//             .query(`
//                 UPDATE [VariablePay]
//                 SET ApprovalStatusPay = 'Rejected',
//                     Remarks = @Remarks,
//                     isApprovalReject = @isApprovalReject,
//                     IsRejected = @IsRejected,
//                     RejectAdminDate = GETDATE()
//                 WHERE VariablePayId = @VariablePayId
//             `);

//         // Reject in VariablePayAdminApprovals
//         await request.input('VariablePayId', sql.Int, approvalData.VariablePayId)
//             .input('Remarks', sql.NVarChar, Remarks || null)
//             .query(`
//                 UPDATE [VariablePayAdminApprovals]
//                 SET ApprovalStatusPay = 'Rejected',
//                     RejectAdminDate = GETDATE(),
//                     Remarks = @Remarks
//                 WHERE VariablePayId = @VariablePayId
//             `);

//         // Commit transaction
//         await transaction.commit();

//         return { success: true, message: 'Variable Pay rejected successfully.' };
//     } catch (error) {
//         console.error('Error rejecting Variable Pay:', error);
//         throw new Error('Error rejecting Variable Pay.');
//     }
// }



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

// async function insertVariablePayData(row) {
//     const pool = await poolPromise;

//     // Normalize PayStructure
//     if (typeof row.PayStructure === 'string') {
//         row.PayStructure = row.PayStructure.trim().toLowerCase();
//         // Capitalize first letter, lower the rest
//         row.PayStructure = row.PayStructure.charAt(0).toUpperCase() + row.PayStructure.slice(1);
//     }

//     // Log the normalized PayStructure
//     //console.log(`Processing LabourID: ${row.LabourID}, PayStructure: "${row.PayStructure}"`);

//     // Validate PayStructure (case-insensitive)
//     const validPayStructures = ['Advance', 'Debit', 'Incentive'];
//     if (!row.PayStructure || !validPayStructures.includes(row.PayStructure)) {
//         throw new Error(`Invalid PayStructure value: ${row.PayStructure}`);
//     }

//     // Initialize flags
//     let AdvancePay = 0, DebitPay = 0, IncentivePay = 0;
//     let variablePayRemark = null;

//     // Additional validation and flag setting based on PayStructure
//     if (row.PayStructure === 'Advance') {
//         // Set Advance flag
//         AdvancePay = 1;

//         // Validate VariablePayRemark
//         const remarks = getRemarksOptions('advance');
//         if (!row.VariablePayRemark || !remarks.includes(row.VariablePayRemark)) {
//             throw new Error(`Invalid VariablePayRemark for Advance. Allowed values: ${remarks.join(', ')}`);
//         }
//         variablePayRemark = row.VariablePayRemark;
//     } else if (row.PayStructure === 'Debit') {
//         // Set Debit flag
//         DebitPay = 1;

//         // Validate VariablePayRemark
//         const remarks = getRemarksOptions('debit');
//         if (!row.VariablePayRemark || !remarks.includes(row.VariablePayRemark)) {
//             throw new Error(`Invalid VariablePayRemark for Debit. Allowed values: ${remarks.join(', ')}`);
//         }
//         variablePayRemark = row.VariablePayRemark;
//     } else if (row.PayStructure === 'Incentive') {
//         // Set Incentive flag
//         IncentivePay = 1;

//         // Validate WeeklyOff
//         if (row.WeeklyOff == null || isNaN(parseInt(row.WeeklyOff, 10))) {
//             throw new Error(`Invalid WeeklyOff value: ${row.WeeklyOff}`);
//         }

//         // Validate VariablePayRemark
//         const remarks = getRemarksOptions('incentive');
//         if (!row.VariablePayRemark || !remarks.includes(row.VariablePayRemark)) {
//             throw new Error(`Invalid VariablePayRemark for Incentive. Allowed values: ${remarks.join(', ')}`);
//         }
//         variablePayRemark = row.VariablePayRemark;
//     }

//     // Fetch labour details from labourOnboarding table
//     const onboardingData = await pool.request()
//         .input('LabourID', sql.NVarChar, row.LabourID || '')
//         .query(`
//             SELECT 
//                 LabourID,
//                 name,
//                 projectName,
//                 companyName,
//                 businessUnit,
//                 departmentName,
//                 id
//             FROM [dbo].[labourOnboarding]
//             WHERE LabourID = @LabourID
//         `);

//     if (onboardingData.recordset.length === 0) {
//         throw new Error(`LabourID ${row.LabourID} not found in labourOnboarding table`);
//     }

//     const labourDetails = onboardingData.recordset[0]; 

//     const ApprovalStatusPay = 'AdminPending';

//     // Insert data into the database
//     await pool
//         .request()
//         .input('userId', sql.Int, labourDetails.id || 0)
//         .input('LabourID', sql.VarChar, row.LabourID)
//         .input('payAddedBy', sql.VarChar, row.wagesEditedBy || 'System') // Optional
//         .input('name', sql.VarChar, labourDetails.name || '') // Ensure default value if undefined
//         .input('projectName', sql.Int, labourDetails.projectName || 0) // Ensure default value if undefined
//         .input('companyName', sql.VarChar, labourDetails.companyName || '') 
//         .input('businessUnit', sql.VarChar, labourDetails.businessUnit || '') // Ensure default value if undefined
//         .input('departmentName', sql.VarChar, labourDetails.departmentName || '') // Ensure default value if undefined
//         .input('PayStructure', sql.VarChar, row.PayStructure)
//         .input('AdvancePay', sql.Bit, AdvancePay)
//         .input('DebitPay', sql.Bit, DebitPay)
//         .input('IncentivePay', sql.Bit, IncentivePay)
//         .input('VariablepayAmount', sql.Decimal(18, 2), row.VariablePayAmount || 0.00)
//         .input('variablePayRemark', sql.NVarChar(255), variablePayRemark)
//         .input('EffectiveDate', sql.Date, new Date())
//         .input('CreatedAt', sql.DateTime, new Date())
//         .input('ApprovalStatusPay', sql.NVarChar(50), ApprovalStatusPay)
//         .input('isApprovalSendAdmin', sql.Bit, 1)
//         .input('ImportedViaExcel', sql.Bit, 1)
//         .query(`
//             INSERT INTO [dbo].[VariablePay]
//             (userId, LabourID, payAddedBy, name, projectName, companyName, businessUnit, departmentName, PayStructure, AdvancePay, DebitPay, IncentivePay, VariablepayAmount, variablePayRemark, EffectiveDate, CreatedAt, ApprovalStatusPay, isApprovalSendAdmin, ImportedViaExcel)
//             VALUES (@userId, @LabourID, @payAddedBy, @name, @projectName, @companyName, @businessUnit, @departmentName, @PayStructure, @AdvancePay, @DebitPay, @IncentivePay, @VariablepayAmount, @variablePayRemark, @EffectiveDate, @CreatedAt, @ApprovalStatusPay, @isApprovalSendAdmin, @ImportedViaExcel)
//         `);
// }


async function insertVariablePayData(row) {
    const pool = await poolPromise;

    // Normalize PayStructure
    if (typeof row.PayStructure === 'string') {
        row.PayStructure = row.PayStructure.trim().toLowerCase();
        row.PayStructure = row.PayStructure.charAt(0).toUpperCase() + row.PayStructure.slice(1); // Capitalize first letter
    }

    // Validate PayStructure
    const validPayStructures = ['Advance', 'Debit', 'Incentive'];
    if (!row.PayStructure || !validPayStructures.includes(row.PayStructure)) {
        throw new Error(`Invalid PayStructure value: ${row.PayStructure}`);
    }

    // Initialize flags
    let AdvancePay = 0, DebitPay = 0, IncentivePay = 0;
    let variablePayRemark = null;

    // Set flag and validate remarks based on PayStructure
    if (row.PayStructure === 'Advance') {
        AdvancePay = 1;
        const remarks = getRemarksOptions('advance');
        if (!row.VariablePayRemark || !remarks.includes(row.VariablePayRemark)) {
            throw new Error(`Invalid VariablePayRemark for Advance. Allowed values: ${remarks.join(', ')}`);
        }
        variablePayRemark = row.VariablePayRemark;
    } else if (row.PayStructure === 'Debit') {
        DebitPay = 1;
        const remarks = getRemarksOptions('debit');
        if (!row.VariablePayRemark || !remarks.includes(row.VariablePayRemark)) {
            throw new Error(`Invalid VariablePayRemark for Debit. Allowed values: ${remarks.join(', ')}`);
        }
        variablePayRemark = row.VariablePayRemark;
    } else if (row.PayStructure === 'Incentive') {
        IncentivePay = 1;
        if (row.WeeklyOff == null || isNaN(parseInt(row.WeeklyOff, 10))) {
            throw new Error(`Invalid WeeklyOff value: ${row.WeeklyOff}`);
        }
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
                LabourID, name, projectName, companyName, businessUnit, departmentName, id
            FROM [dbo].[labourOnboarding]
            WHERE LabourID = @LabourID
        `);

    if (onboardingData.recordset.length === 0) {
        throw new Error(`LabourID ${row.LabourID} not found in labourOnboarding table`);
    }

    const labourDetails = onboardingData.recordset[0];
    const ApprovalStatusPay = 'AdminPending';

    // Insert into VariablePay table
    const request = pool.request();
    request.input('userId', sql.Int, labourDetails.id || 0);
    request.input('LabourID', sql.VarChar, row.LabourID);
    request.input('payAddedBy', sql.VarChar, row.wagesEditedBy || 'System');
    request.input('name', sql.VarChar, labourDetails.name || '');
    request.input('projectName', sql.Int, labourDetails.projectName || 0);
    request.input('companyName', sql.VarChar, labourDetails.companyName || '');
    request.input('businessUnit', sql.VarChar, labourDetails.businessUnit || '');
    request.input('departmentName', sql.VarChar, labourDetails.departmentName || '');
    request.input('PayStructure', sql.VarChar, row.PayStructure);
    request.input('AdvancePay', sql.Bit, AdvancePay);
    request.input('DebitPay', sql.Bit, DebitPay);
    request.input('IncentivePay', sql.Bit, IncentivePay);
    request.input('VariablepayAmount', sql.Decimal(18, 2), row.VariablePayAmount || 0.00);
    request.input('variablePayRemark', sql.NVarChar(255), variablePayRemark);
    request.input('EffectiveDate', sql.Date, new Date());
    request.input('CreatedAt', sql.DateTime, new Date());
    request.input('ApprovalStatusPay', sql.NVarChar(50), ApprovalStatusPay);
    request.input('isApprovalSendAdmin', sql.Bit, 1);
    request.input('ImportedViaExcel', sql.Bit, 1);

    const insertResult = await request.query(`
        INSERT INTO [dbo].[VariablePay]
        (userId, LabourID, payAddedBy, name, projectName, companyName, businessUnit, departmentName, PayStructure, AdvancePay, DebitPay, IncentivePay, VariablepayAmount, variablePayRemark, EffectiveDate, CreatedAt, ApprovalStatusPay, isApprovalSendAdmin, ImportedViaExcel)
        OUTPUT INSERTED.VariablePayId
        VALUES (@userId, @LabourID, @payAddedBy, @name, @projectName, @companyName, @businessUnit, @departmentName, @PayStructure, @AdvancePay, @DebitPay, @IncentivePay, @VariablepayAmount, @variablePayRemark, @EffectiveDate, @CreatedAt, @ApprovalStatusPay, @isApprovalSendAdmin, @ImportedViaExcel)
    `);

    if (!insertResult.recordset || insertResult.recordset.length === 0) {
        throw new Error('Failed to insert VariablePay.');
    }

    // 🟢 Use the inserted VariablePayId
    const variablePayId = insertResult.recordset[0].VariablePayId;

    // Update the VariablePay table to mark it as pending
    await request.input('VariablePayId', sql.Int, variablePayId).query(`
        UPDATE [VariablePay]
        SET ApprovalStatusPay = 'AdminPending',
            EditDate = GETDATE()
        WHERE VariablePayId = @VariablePayId
    `);

    // Insert into VariablePayAdminApprovals table
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

    return { success: true, message: 'Variable Pay inserted and sent for approval.', VariablePayId: variablePayId };
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


// async function getAttendanceSummaryForLabour(labourId, month, year) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input('labourId', sql.NVarChar, labourId)
//             .input('month', sql.Int, month)
//             .input('year', sql.Int, year)
//             .query(`
//                 SELECT 
//                     SUM(CASE WHEN att.Status = 'P'  THEN 1 ELSE 0 END) AS presentDays,
//                     SUM(CASE WHEN att.Status = 'A'  THEN 1 ELSE 0 END) AS absentDays,
//                     SUM(CASE WHEN att.Status = 'HD' THEN 1 ELSE 0 END) AS halfDays,
//                     SUM(CASE WHEN att.Status = 'MP' THEN 1 ELSE 0 END) AS missPunchDays,

//                     -- Normal overtime count if status = 'O'
//                     SUM(CASE WHEN att.Status = 'O' THEN 1 ELSE 0 END) AS normalOvertimeCount,

//                     -- If it's a holiday (hol.HolidayDate IS NOT NULL) and labour status='P', treat as holiday OT
//                     SUM(CASE WHEN hol.HolidayDate IS NOT NULL AND att.Status = 'P' THEN 1 ELSE 0 END) AS holidayOvertimeCount
//                 FROM [dbo].[LabourAttendanceDetails] att
//                 LEFT JOIN [dbo].[HolidayDate] hol
//                      ON att.[Date] = hol.HolidayDate
//                 WHERE 
//                     att.LabourID = @labourId
//                     AND MONTH(att.[Date]) = @month
//                     AND YEAR(att.[Date]) = @year
//             `);

//         const row = result.recordset[0] || {};

//         return {
//             presentDays:        row.presentDays        || 0,
//             absentDays:         row.absentDays         || 0,
//             halfDays:           row.halfDays           || 0,
//             missPunchDays:      row.missPunchDays      || 0,
//             normalOvertimeCount: row.normalOvertimeCount || 0,
//             holidayOvertimeCount: row.holidayOvertimeCount || 0
//         };
//     } catch (error) {
//         console.error('Error in getAttendanceSummaryForLabour:', error);
//         throw error;
//     }
// };


async function getAttendanceSummaryForLabour(labourId, month, year) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('month', sql.Int, month)
            .input('year', sql.Int, year)
            .query(`
                WITH HolidayOvertime AS (
                    SELECT 
                        att.LabourID,
                        att.Date,
                        att.TotalHours,
                        wages.PerHourWages
                    FROM [dbo].[LabourAttendanceDetails] att
                    LEFT JOIN [dbo].[HolidayDate] hol
                        ON att.[Date] = hol.HolidayDate  
                        AND MONTH(hol.HolidayDate) = @month
                        AND YEAR(hol.HolidayDate) = @year  -- Ensure only holidays in the selected month

                    LEFT JOIN (
                        SELECT LabourID, MAX(PerHourWages) AS PerHourWages
                        FROM [dbo].[LabourMonthlyWages]
                        WHERE PayStructure = 'DAILY WAGES'
                        GROUP BY LabourID
                    ) wages
                        ON att.LabourID = wages.LabourID  -- Only include workers with DAILY WAGES

                    WHERE att.Status = 'P' -- Only count present days
                )
                SELECT 
                    -- Count total unique attendance days in the selected month
                    COUNT(DISTINCT att.[Date]) AS totalDays,  
                    
                    -- Count distinct days the labour was present
                    COUNT(DISTINCT CASE WHEN att.Status = 'P' THEN att.[Date] END) AS presentDays,

                    -- Count distinct days the labour was absent
                    COUNT(DISTINCT CASE WHEN att.Status = 'A' THEN att.[Date] END) AS absentDays,

                    -- Count distinct days the labour had a half-day
                    COUNT(DISTINCT CASE WHEN att.Status = 'HD' THEN att.[Date] END) AS halfDays,

                    -- Count distinct days the labour had a missed punch
                    COUNT(DISTINCT CASE WHEN att.Status = 'MP' THEN att.[Date] END) AS missPunchDays,

                    -- Count normal overtime days
                    COUNT(DISTINCT CASE WHEN att.Status = 'O' THEN att.[Date] END) AS normalOvertimeCount,

                    -- Count how many holidays exist in the selected month
                    COUNT(DISTINCT hol.HolidayDate) AS totalHolidaysInMonth,

                    -- Sum only the actual TotalHours for holidays where the worker was present
                    SUM(CASE 
                        WHEN att.Status = 'P' 
                             AND hol.HolidayDate IS NOT NULL 
                             AND att.TotalHours IS NOT NULL
                        THEN att.TotalHours 
                        ELSE 0 
                    END) AS holidayOvertimeHours,

                    -- Correctly calculate holiday overtime wages (only for DAILY WAGES workers)
                    SUM(CASE 
                        WHEN att.Status = 'P' 
                             AND hol.HolidayDate IS NOT NULL 
                             AND att.TotalHours IS NOT NULL
                             AND wages.PerHourWages IS NOT NULL
                        THEN att.TotalHours * wages.PerHourWages 
                        ELSE 0 
                    END) AS holidayOvertimeWages

                FROM [dbo].[LabourAttendanceDetails] att

                -- Join with HolidayDate table to ensure correct holiday mapping
                LEFT JOIN [dbo].[HolidayDate] hol
                    ON att.[Date] = hol.HolidayDate  
                    AND MONTH(hol.HolidayDate) = @month
                    AND YEAR(hol.HolidayDate) = @year  -- Ensure only holidays in the selected month

                -- Join with LabourMonthlyWages but avoid duplicates
                LEFT JOIN (
                    SELECT LabourID, MAX(PerHourWages) AS PerHourWages
                    FROM [dbo].[LabourMonthlyWages]
                    WHERE PayStructure = 'DAILY WAGES'
                    GROUP BY LabourID
                ) wages
                    ON att.LabourID = wages.LabourID  -- Only include workers with DAILY WAGES

                WHERE 
                    att.LabourID = @labourId
                    AND MONTH(att.[Date]) = @month
                    AND YEAR(att.[Date]) = @year;
            `);

        const row = result.recordset[0] || {};

        return {
            totalDays: row.totalDays || 0,
            presentDays: row.presentDays || 0,
            absentDays: row.absentDays || 0,
            halfDays: row.halfDays || 0,
            missPunchDays: row.missPunchDays || 0,
            normalOvertimeCount: row.normalOvertimeCount || 0,
            totalHolidaysInMonth: row.totalHolidaysInMonth || 0,
            holidayOvertimeHours: row.holidayOvertimeHours || 0,
            holidayOvertimeWages: row.holidayOvertimeWages || 0
        };
    } catch (error) {
        console.error('Error in getAttendanceSummaryForLabour:', error);
        throw error;
    }
}

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

// async function getWageInfoForLabour(labourId, month, year) {
//     try {
//       const pool = await poolPromise;

//       // 1) Last day of the target month (e.g. 2025-01-31 if month=1, year=2025)
//       const lastDayOfMonth = new Date(year, month, 0);
//       // 2) Fetch all wages that:
//       //    - Are approved (isApprovalDoneAdmin = 1)
//       //    - Have an EffectiveDate on or before lastDayOfMonth
//       //    - Have an ApprovalDate on or before lastDayOfMonth
//       const result = await pool.request()
//         .input('labourId', sql.NVarChar, labourId)
//         .input('monthEnd', sql.DateTime, lastDayOfMonth)
//         .query(`
//           SELECT
//             WageID,
//             FromDate,
//             ApprovalDate,
//             EffectiveDate,
//             PayStructure,
//             DailyWages,
//             PerHourWages,
//             MonthlyWages,
//             YearlyWages,
//             WeeklyOff,
//             FixedMonthlyWages
//           FROM [dbo].[LabourMonthlyWages]
//           WHERE
//             LabourID = @labourId
//             AND isApprovalDoneAdmin = 1
//             AND EffectiveDate <= @monthEnd
//           ORDER BY
//             EffectiveDate DESC,
//             ApprovalDate DESC
//         `);

//       // No records => null
//       if (result.recordset.length === 0) {
//         return null;
//       }

//       // The first wage in the list is the newest for that month
//       const [currentWage, ...others] = result.recordset;

//       // The second wage is our "previous" wage, if available
//       let previousWage = null;
//       if (others.length > 0) {
//         previousWage = others[0];
//       }

//       // 3) Calculate partial-month logic
//       const daysInMonth = new Date(year, month, 0).getDate();
//       const effectiveDate = new Date(currentWage.EffectiveDate);

//       // By default, assume the entire month uses current wage
//       let previousDaysApplicable = 0;
//       let currentDaysApplicable = daysInMonth;

//       // If EffectiveDate is in the same month/year, split the month
//       if (
//         effectiveDate.getFullYear() === year &&
//         (effectiveDate.getMonth() + 1) === month
//       ) {
//         // E.g. if EffectiveDate = 2025-01-09 => days 1–8 are previous wage
//         previousDaysApplicable = effectiveDate.getDate() - 1; 
//         currentDaysApplicable  = daysInMonth - previousDaysApplicable;
//       }

//       // 4) Calculate actual wages
//       const calculatedWages = {
//         previousWageAmount: 0,
//         currentWageAmount: 0,
//         totalWageAmount: 0
//       };

//       // If we have a valid previous wage + partial days, calculate old portion
//       if (previousWage && previousDaysApplicable > 0) {
//         calculatedWages.previousWageAmount = calculatePartialWage(
//           previousWage,
//           previousDaysApplicable,
//           daysInMonth
//         );
//       }
//       // If no previous wage but partial days exist, you can decide if those days are "0" or reuse the current wage
//       else if (!previousWage && previousDaysApplicable > 0) {
//         calculatedWages.previousWageAmount = 0; 
//       }

//       // Calculate the portion for the current wage
//       calculatedWages.currentWageAmount = calculatePartialWage(
//         currentWage,
//         currentDaysApplicable,
//         daysInMonth
//       );

//       // Sum up
//       calculatedWages.totalWageAmount =
//         calculatedWages.previousWageAmount + calculatedWages.currentWageAmount;

//       // 5) Return the wage info + calculations
//       return {
//         ...currentWage,
//         previousWage,
//         previousDaysApplicable,
//         currentDaysApplicable,
//         calculatedWages
//       };
//     } catch (error) {
//       console.error('Error in getWageInfoForLabour:', error);
//       throw error;
//     }
//   }


// async function getWageInfoForLabour(labourId, month, year) {
//     try {
//       const pool = await poolPromise;

//       // 1) Define the month boundaries
//       // Note: month is 1-based here, so "month - 1" is the JS zero-based month.
//       const monthStart = new Date(year, month - 1, 1);
//       const monthEnd   = new Date(year, month, 0); // e.g., if month=1 => January 31

//       // 2) Fetch all relevant rows: 
//       //    - isApprovalDoneAdmin = 1
//       //    - EffectiveDate <= monthEnd
//       //      (You can adapt the WHERE clause if you want retroactive logic, etc.)
//       const result = await pool.request()
//         .input('labourId', sql.NVarChar, labourId)
//         .input('monthEnd', sql.DateTime, monthEnd)
//         .query(`
//           SELECT
//             WageID,
//             FromDate,
//             ApprovalDate,
//             EffectiveDate,
//             PayStructure,
//             DailyWages,
//             PerHourWages,
//             MonthlyWages,
//             YearlyWages,
//             WeeklyOff,
//             FixedMonthlyWages
//           FROM [dbo].[LabourMonthlyWages]
//           WHERE
//             LabourID = @labourId
//             AND isApprovalDoneAdmin = 1
//             AND EffectiveDate <= @monthEnd
//           ORDER BY
//             EffectiveDate ASC
//         `);

//       if (result.recordset.length === 0) {
//         // No wage records found at all
//         return {
//           month,
//           year,
//           totalWageAmount: 0,
//           segments: []
//         };
//       }

//       const wages = result.recordset;

//       // 3) (OPTIONAL) Check if you need an older wage carrying over from a previous month
//       //    For simplicity, we skip the "carry-over" logic here. But if needed, you would:
//       //      - Look up if there's a wage with EffectiveDate < monthStart 
//       //      - Insert it at the beginning of `wages` array, adjusting its EffectiveDate to monthStart
//       //    so that your segments cover the entire month fully.

//       // 4) Build the segments for the month
//       const segments = [];
//       let currentStart = new Date(monthStart); // first day of the month

//       for (let i = 0; i < wages.length; i++) {
//         const wage    = wages[i];
//         const nextWage = wages[i + 1];

//         // The wage is active from "max(currentStart, wage.EffectiveDate)"
//         const wageStart = new Date(Math.max(currentStart.getTime(), new Date(wage.EffectiveDate).getTime()));

//         // If wageStart is beyond our monthEnd, no further segment needed
//         if (wageStart > monthEnd) break;

//         // The end of this segment is either:
//         // - the day before the next wage’s EffectiveDate
//         // - or the actual monthEnd if there is no next wage (or the next wage is beyond monthEnd)
//         let wageEnd;
//         if (nextWage) {
//           // next wage starts on nextWage.EffectiveDate => current wage ends the day before
//           const nextStartMinusOne = new Date(nextWage.EffectiveDate);
//           nextStartMinusOne.setDate(nextStartMinusOne.getDate() - 1);

//           wageEnd = new Date(Math.min(nextStartMinusOne.getTime(), monthEnd.getTime()));
//         } else {
//           // no next wage => goes to end of the month
//           wageEnd = new Date(monthEnd);
//         }

//         // ensure wageEnd >= wageStart (otherwise no overlap)
//         if (wageEnd >= wageStart) {
//           segments.push({
//             wage,
//             start: wageStart,
//             end: wageEnd
//           });
//         }

//         // Move currentStart forward for the next iteration
//         const dayAfterEnd = new Date(wageEnd);
//         dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
//         currentStart = dayAfterEnd;

//         if (currentStart > monthEnd) break;
//       }

//       // 5) Calculate wages for each segment
//       let totalWageAmount = 0;

//       const daysInMonth = getDaysInMonth(year, month);

//       const segmentCalculations = segments.map((seg) => {
//         const { wage, start, end } = seg;
//         const daysCount = daysBetweenInclusive(start, end);

//         let segmentWage = 0;

//         // Decide how to calculate based on pay structure
//         if (wage.PayStructure === 'DAILY WAGES') {
//           // Daily wage * number of days
//           segmentWage = (wage.DailyWages || 0) * daysCount;
//         }
//         else if (wage.PayStructure === 'FIXED MONTHLY WAGES') {
//           // Full monthly wage, no proration
//           segmentWage = wage.FixedMonthlyWages || 0;
//         }
//         else if (wage.PayStructure === 'MONTHLY WAGES') {
//           // Prorate based on days
//           segmentWage = ((wage.MonthlyWages || 0) / daysInMonth) * daysCount;
//         }
//         else if (wage.PayStructure === 'PER HOUR WAGES') {
//           // If you need to handle hours, you'd typically multiply PerHourWages by hours.
//           // For a day-based approach, you'd decide how many hours per day or some other logic.
//           // Example (just a placeholder):
//           // segmentWage = (wage.PerHourWages || 0) * (hoursPerDay * daysCount);
//         }
//         // else if (...) handle other pay structures similarly

//         totalWageAmount += segmentWage;

//         return {
//           wageId: wage.WageID,
//           effectiveDate: wage.EffectiveDate,
//           payStructure: wage.PayStructure,
//           start,
//           end,
//           daysCount,
//           segmentWage
//         };
//       });

//       // 6) Return an object with details
//       return {
//         month,
//         year,
//         totalWageAmount,
//         segments: segmentCalculations
//       };

//     } catch (error) {
//       console.error('Error in getWageInfoForLabour:', error);
//       throw error;
//     }
//   }

async function getWageInfoForLabour(labourId, month, year) {
    try {
        const pool = await poolPromise;

        // Last day of the target month
        const lastDayOfMonth = new Date(year, month, 0); // e.g. for (2025,1) => Jan-31-2025

        // Start of the target month
        const firstDayOfMonth = new Date(year, month - 1, 1); // e.g. for (2025,1) => Jan-01-2025

        // 1) Fetch all wages that:
        //    - Are approved (isApprovalDoneAdmin = 1)
        //    - Have an EffectiveDate on or before lastDayOfMonth
        //    (OPTIONAL) If you also need to ensure ApprovalDate <= lastDayOfMonth, include that filter below.
        const result = await pool.request()
            .input('labourId', sql.NVarChar, labourId)
            .input('monthEnd', sql.DateTime, lastDayOfMonth)
            .query(`
         SELECT
          w.WageID,
          w.FromDate,
          w.ApprovalDate,
          w.EffectiveDate,
          w.PayStructure,
          w.DailyWages,
          w.PerHourWages,
          w.MonthlyWages,
          w.YearlyWages,
          w.WeeklyOff,
          w.FixedMonthlyWages,
          onb.workingHours AS OnboardWorkingHours
        FROM [dbo].[LabourMonthlyWages] w
        LEFT JOIN [labourOnboarding] onb
          ON onb.LabourID = w.LabourID
        WHERE
          w.LabourID = @labourId
          AND w.isApprovalDoneAdmin = 1
          AND w.EffectiveDate <= @monthEnd
        ORDER BY
          w.EffectiveDate ASC,
          w.ApprovalDate ASC
        `);

        if (result.recordset.length === 0) {
            // No wage record applies in this month
            return null;
        }

        // 2) Sort the result in ascending order by EffectiveDate (and ApprovalDate),
        //    so the earliest effective wage is first, the newest is last.
        // (If your query’s ORDER BY is already ascending, you can skip a manual sort.)
        const wages = result.recordset.map(r => ({
            ...r,
            EffectiveDate: new Date(r.EffectiveDate),
            ApprovalDate: r.ApprovalDate ? new Date(r.ApprovalDate) : null
        }));
        // wages.sort((a, b) => a.EffectiveDate - b.EffectiveDate); 
        // (If needed, you can explicitly sort here.)
        const workingHours = wages[0].OnboardWorkingHours || 0;
        // 3) Iterate through all wage entries and compute partial-month wages.
        let totalWagesForMonth = 0;
        let wageBreakdown = [];

        for (let i = 0; i < wages.length; i++) {
            const currentWage = wages[i];

            // The start date for this wage slice is the later of:
            //   - the wage's EffectiveDate
            //   - the first day of the target month
            let sliceStart = new Date(Math.max(currentWage.EffectiveDate, firstDayOfMonth));

            // The end date for this wage slice is the earlier of:
            //   - one day before the next wage’s EffectiveDate
            //   - the last day of the target month
            let nextEffectiveDate = (i < wages.length - 1)
                ? wages[i + 1].EffectiveDate
                : null;
            let sliceEnd = nextEffectiveDate
                ? new Date(nextEffectiveDate.getTime() - 24 * 60 * 60 * 1000) // day before next wage
                : lastDayOfMonth;

            // Make sure we clamp the sliceEnd to at most the lastDayOfMonth
            if (sliceEnd > lastDayOfMonth) {
                sliceEnd = lastDayOfMonth;
            }

            // If the slice range is invalid or outside the month, skip
            if (sliceStart > sliceEnd) {
                continue;
            }

            // Calculate how many days are in [sliceStart, sliceEnd] (inclusive)
            const daysInSlice = daysBetweenInclusive(sliceStart, sliceEnd);

            // Use your partial wage formula
            let partialWage = calculatePartialWage(
                currentWage,
                daysInSlice,
                getDaysInMonth(year, month) // e.g. 31 for January
            );
            partialWage = Math.round(partialWage * 100) / 100;
            totalWagesForMonth += partialWage;

            wageBreakdown.push({
                wageId: currentWage.WageID,
                effectiveDate: currentWage.EffectiveDate,
                sliceStart: sliceStart.toISOString().split('T')[0],
                sliceEnd: sliceEnd.toISOString().split('T')[0],
                daysInSlice,
                partialWage,
                payStructure: currentWage.PayStructure,
                weeklyOff: currentWage.WeeklyOff,
                dailyWages: currentWage.DailyWages,
                monthlyWages: currentWage.MonthlyWages,
                fixedMonthlyWages: currentWage.FixedMonthlyWages
            });
        }
        totalWagesForMonth = Math.round(totalWagesForMonth * 100) / 100;
        return {
            month,
            year,
            workingHours,
            totalWagesForMonth,
            wageBreakdown
        };

    } catch (error) {
        console.error('Error in getWageInfoForLabour:', error);
        throw error;
    }
}

/**
 * Calculate partial wage for a given wage record.
 * You can expand this as needed.
 */
function calculatePartialWage(wageRecord, daysApplicable, daysInMonth) {
    if (!wageRecord) return 0;

    // 1) DAILY WAGES
    if (
        wageRecord.PayStructure &&
        wageRecord.PayStructure.toLowerCase().includes('DAILY WAGES')
    ) {
        return (wageRecord.DailyWages || 0) * daysApplicable;
    }

    // 2) FIXED MONTHLY
    if (wageRecord.FixedMonthlyWages) {
        return (wageRecord.FixedMonthlyWages / daysInMonth) * daysApplicable;
    }

    // 3) REGULAR MONTHLY
    if (wageRecord.MonthlyWages) {
        return (wageRecord.MonthlyWages / daysInMonth) * daysApplicable;
    }

    // 4) ELSE 0
    return 0;
}

/**
 * Returns the integer number of days between two dates, inclusive.
 * E.g. daysBetweenInclusive(2025-01-01, 2025-01-01) = 1
 *      daysBetweenInclusive(2025-01-01, 2025-01-02) = 2
 */
function daysBetweenInclusive(date1, date2) {
    const msInDay = 24 * 60 * 60 * 1000;
    // Ensure date1 <= date2
    const start = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const end = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((end - start) / msInDay) + 1;
}

/**
 * Simple helper to get # of days in a given month/year.
 */
function getDaysInMonth(year, month) {
    // month is 1-based in this example, so we do new Date(year, month, 0)
    return new Date(year, month, 0).getDate();
}


/**
 * Utility: number of days inclusive between two JS Date objects.
 * E.g. Jan 1 to Jan 14 => 14 days
 * Make sure times are set to midnight or the calculation might be off by 1.
 */
function daysBetweenInclusive(d1, d2) {
    // copy to avoid mutating originals
    const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
    // difference in ms
    const diffTime = date2.getTime() - date1.getTime();
    // convert ms to days
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// ====================================
// Helper for partial wages
// ====================================
function calculatePartialWage(wageRecord, daysApplicable, daysInMonth) {
    if (!wageRecord) return 0;

    // 1) DAILY WAGES
    if (
        wageRecord.PayStructure &&
        wageRecord.PayStructure.toLowerCase().includes('DAILY WAGES')
    ) {
        return (wageRecord.DailyWages || 0) * daysApplicable;
    }

    // 2) FIXED MONTHLY
    if (wageRecord.FixedMonthlyWages) {
        return (wageRecord.FixedMonthlyWages / daysInMonth) * daysApplicable;
    }

    // 3) REGULAR MONTHLY
    if (wageRecord.MonthlyWages) {
        return (wageRecord.MonthlyWages / daysInMonth) * daysApplicable;
    }

    // 4) ELSE 0
    return 0;
}


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
//                   AND (YEAR(FromDate) < @year OR (YEAR(FromDate) = @year AND MONTH(FromDate) <= @month))
//                   AND (YEAR(ApprovalDate) < @year OR (YEAR(ApprovalDate) = @year AND MONTH(ApprovalDate) <= @month))
//               ORDER BY FromDate DESC, ApprovalDate DESC;
//             `);

//         if (!result.recordset.length) {
//             return null; // No wages found for this labour
//         }

//         let applicableWage = null;
//         let previousWage = null;

//         for (const wage of result.recordset) {
//             const fromDate = new Date(wage.FromDate);
//             const approvalDate = new Date(wage.ApprovalDate);

//             if (
//                 (fromDate.getFullYear() < year || (fromDate.getFullYear() === year && fromDate.getMonth() + 1 <= month)) &&
//                 (approvalDate.getFullYear() < year || (approvalDate.getFullYear() === year && approvalDate.getMonth() + 1 <= month))
//             ) {
//                 if (!applicableWage) {
//                     applicableWage = wage;
//                 } else if (!previousWage) {
//                     previousWage = wage; // Store the previous wage
//                 }
//             }
//         }

//         if (!applicableWage) {
//             return null; // No applicable wage entry found
//         }

//         const daysInMonth = new Date(year, month, 0).getDate();
//         const fromDate = new Date(applicableWage.FromDate);
//         const effectiveDate = applicableWage.EffectiveDate ? new Date(applicableWage.EffectiveDate) : null;

//         let previousDaysApplicable = 0;
//         let currentDaysApplicable = daysInMonth;

//         if (fromDate.getFullYear() === year && fromDate.getMonth() + 1 === month) {
//             previousDaysApplicable = fromDate.getDate() - 1;
//             currentDaysApplicable = daysInMonth - previousDaysApplicable;
//         }

//         if (effectiveDate && effectiveDate.getFullYear() === year && effectiveDate.getMonth() + 1 === month) {
//             previousDaysApplicable = effectiveDate.getDate() - 1;
//             currentDaysApplicable = daysInMonth - previousDaysApplicable;
//         }

//         let calculatedWages = {
//             previousWageAmount: 0,
//             currentWageAmount: 0,
//             totalWageAmount: 0
//         };

//         if (previousWage) {
//             if (previousWage.PayStructure.toLowerCase().includes('daily')) {
//                 calculatedWages.previousWageAmount = previousWage.DailyWages * previousDaysApplicable;
//             } else if (previousWage.FixedMonthlyWages) {
//                 calculatedWages.previousWageAmount = (previousWage.FixedMonthlyWages / daysInMonth) * previousDaysApplicable;
//             } else {
//                 calculatedWages.previousWageAmount = (previousWage.MonthlyWages / daysInMonth) * previousDaysApplicable;
//             }
//         }

//         if (applicableWage.PayStructure.toLowerCase().includes('daily')) {
//             calculatedWages.currentWageAmount = applicableWage.DailyWages * currentDaysApplicable;
//         } else if (applicableWage.FixedMonthlyWages) {
//             calculatedWages.currentWageAmount = (applicableWage.FixedMonthlyWages / daysInMonth) * currentDaysApplicable;
//         } else {
//             calculatedWages.currentWageAmount = (applicableWage.MonthlyWages / daysInMonth) * currentDaysApplicable;
//         }

//         calculatedWages.totalWageAmount = calculatedWages.previousWageAmount + calculatedWages.currentWageAmount;

//         return {
//             ...applicableWage,
//             previousWage,
//             previousDaysApplicable,
//             currentDaysApplicable,
//             calculatedWages
//         };
//     } catch (error) {
//         console.error('Error in getWageInfoForLabour:', error);
//         throw error;
//     }
// };


/**
 * Return list of labour IDs who are eligible for salary generation in a given month/year.
 * - They must have at least 1 present/half day (i.e. not absent full month).
 * - They must have wages added in [LabourMonthlyWages].
 */

async function getEligibleLabours(month, year, idsArray) {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('month', sql.Int, month);
        request.input('year', sql.Int, year);

        if (idsArray && idsArray.length > 0) {
            request.input('labourIds', sql.VarChar, idsArray.join(','));
        }

        const query = `
            -- Step 1: Get Attendance Count for all LabourIds
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
            -- Step 2: Get all eligible labours who are not finalized
            SELECT 
                onboarding.id,
                onboarding.LabourID AS LabourId,
                onboarding.name,
                onboarding.businessUnit,
                onboarding.projectName,
                onboarding.departmentName,
                onboarding.department,
                onboarding.workingHours,
                AttendanceCTE.AttendanceCount
            FROM 
                AttendanceCTE
            INNER JOIN 
                [labourOnboarding] AS onboarding
                ON AttendanceCTE.LabourId = onboarding.LabourID
            WHERE 
                onboarding.status = 'Approved'
                AND AttendanceCTE.AttendanceCount > 0
                AND NOT EXISTS (
                    SELECT 1 
                    FROM [dbo].[FinalizedSalaryPay] AS finalized
                    WHERE 
                        finalized.LabourID = AttendanceCTE.LabourId
                        AND finalized.[Month] = @month
                        AND finalized.[Year] = @year
                )
                ${(idsArray && idsArray.length > 0) ? "AND onboarding.LabourID IN (SELECT value FROM STRING_SPLIT(@labourIds, ','))" : ""}
            ORDER BY 
                onboarding.LabourID;
        `;

        const result = await request.query(query);

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

    } catch (error) {
        console.error('Error in getEligibleLabours:', error);
        throw error;
    }
};


// async function getEligibleLabours(month, year, idsArray) {
//     try {
//         const pool = await poolPromise;
//         const request = pool.request();
//         request.input('month', sql.Int, month);
//         request.input('year', sql.Int, year);

//         // Add the idsArray to the query if provided
//         if (idsArray && idsArray.length > 0) {
//             request.input('labourIds', sql.VarChar, idsArray.join(','));
//         }

//         const query = `
//             WITH AttendanceCTE AS (
//                 SELECT 
//                     LabourId,
//                     SUM(
//                         CASE 
//                             WHEN [Status] IN ('P', 'HD', 'H', 'MP', 'O') 
//                             THEN 1 
//                             ELSE 0
//                         END
//                     ) AS AttendanceCount
//                 FROM [dbo].[LabourAttendanceDetails]
//                 WHERE 
//                     MONTH([Date]) = @month
//                     AND YEAR([Date]) = @year
//                 GROUP BY LabourId
//             )
//             SELECT 
//                 onboarding.id,
//                 onboarding.LabourID AS LabourId,
//                 onboarding.name,
//                 onboarding.businessUnit,
//                 onboarding.projectName,
//                 onboarding.departmentName,
//                 onboarding.department,
//                 AttendanceCTE.AttendanceCount
//             FROM 
//                 AttendanceCTE
//             INNER JOIN 
//                 [labourOnboarding] AS onboarding
//             ON 
//                 AttendanceCTE.LabourId = onboarding.LabourID
//             WHERE 
//                 onboarding.status = 'Approved'
//                 AND AttendanceCTE.AttendanceCount > 0
//                 ${(idsArray && idsArray.length > 0) ? "AND onboarding.LabourID IN (SELECT value FROM STRING_SPLIT(@labourIds, ','))" : ""}
//             ORDER BY 
//                 onboarding.LabourID;
//         `;

//         const result = await request.query(query);

// // ------------------------------------------------------------------------------   START   ---------------------------------------------------------------------------------------------        
//         // Just an example. Adjust to your table and columns:
//         // const result = await pool.request()
//         //     .input('month', sql.Int, month)
//         //     .input('year', sql.Int, year)  

// // .query(`
// //     WITH AttendanceCTE AS (
// //         SELECT 
// //             LabourId,
// //             SUM(
// //                 CASE 
// //                     WHEN [Status] IN ('P', 'HD', 'H', 'MP', 'O') 
// //                     THEN 1 
// //                     ELSE 0
// //                 END
// //             ) AS AttendanceCount
// //         FROM [dbo].[LabourAttendanceDetails]
// //         WHERE 
// //             MONTH([Date]) = @month
// //             AND YEAR([Date]) = @year
// //         GROUP BY LabourId
// //     )
// //     SELECT 
// //         onboarding.id,
// //         onboarding.LabourID AS LabourId,
// //         onboarding.name,
// //         onboarding.businessUnit,
// //         onboarding.projectName,
// //         onboarding.departmentName,
// //         onboarding.department,
// //         AttendanceCTE.AttendanceCount
// //     FROM 
// //         AttendanceCTE
// //     INNER JOIN 
// //         [labourOnboarding] AS onboarding
// //     ON 
// //         AttendanceCTE.LabourId = onboarding.LabourID
// //     WHERE 
// //         onboarding.status = 'Approved'
// //         AND AttendanceCTE.AttendanceCount > 0
// //     ORDER BY 
// //         onboarding.LabourID;
// // `);

// // ------------------------------------------------------------------------------   END    ---------------------------------------------------------------------------------------------
// // Map results to an array of labour details
// const labourDetails = result.recordset.map(row => ({
// id: row.id,
// labourId: row.LabourId,
// name: row.name,
// businessUnit: row.businessUnit,
// projectName: row.projectName,
// departmentName: row.departmentName,
// department: row.department,
// attendanceCount: row.AttendanceCount
// }));
// return labourDetails;
// // -----------------------------------------------------------    END     ----------------------------------------------------

//         // const labourIds = result.recordset.map(row => row.LabourId);
//         // return labourIds;
//     } catch (error) {
//         console.error('Error in getEligibleLabours:', error);
//         throw error;
//     }
// };

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
 * Calculate final salary for a given labour in a specific month/year.
 * Incorporates:
 *  1) Attendance summary
 *  2) Wages info (partial-month wages)
 *  3) Variable pay (advances, debits, incentives)
 *  4) Overtime calculation
 *  5) Holiday overtime & Weekly off logic
 *  6) Previous wage logic
 *  7) All relevant final computations (Gross/Net)
 *
 * @param {string} labourId - The ID of the labour/worker
 * @param {number} month - The target month (1-12)
 * @param {number} year - The target year (e.g. 2025)
 * @returns {Object} Detailed salary calculation result
 */
async function calculateSalaryForLabour(labourId, month, year) {
    try {
        // 1️⃣ **Fetch Attendance Summary**
        const attendance = await getAttendanceSummaryForLabour(labourId, month, year);

       
        const wagesInfo = await getWageInfoForLabour(labourId, month, year);

        // 3️⃣ **Fetch Variable Pay** (Advances, Debits, Incentives)
        let variablePay = await getVariablePayForLabour(labourId, month, year);
        if (!variablePay) {
            variablePay = {
                advance: 0,
                advanceRemarks: "-",
                debit: 0,
                debitRemarks: "-",
                incentive: 0,
                incentiveRemarks: "-"
            };
        }

        // 4️⃣ **Calculate Total Overtime** (capped in DB logic)
        const cappedOvertime = await calculateTotalOvertime(labourId, month, year);

        // If no wages are approved, return early
        if (!wagesInfo) {
            return {
                labourId,
                month,
                year,
                message: `No approved wages found for labour ID: ${labourId}`
            };
        }

        // ------------------- EXTRACT KEY DATA ---------------------------
        // A) Attendance fields
        const {
            presentDays = 0,
            absentDays = 0,
            halfDays = 0,
            missPunchDays = 0,
            normalOvertimeCount = 0,

            // If you track holidayOvertimeCount in attendance (sometimes you do),
            // you can rename or omit. Example: "holidayOvertimeCount" or none.
            holidayOvertimeCount = 0,

            totalHolidaysInMonth = 0,
            holidayOvertimeHours = 0,
            holidayOvertimeWages = 0
        } = attendance || {};

        // B) Wages info (extracted from the new partial wage approach)
        //    The total partial-month wages are pre-calculated for the entire month:
        const {
            totalWagesForMonth = 0,
            wageBreakdown = [],
            workingHours = 8 
        } = wagesInfo;
        
        let parsedWorkingHours = 8; // fallback
        if (typeof workingHours === 'number') {
            parsedWorkingHours = workingHours > 0 ? workingHours : 8;
        } else if (typeof workingHours === 'string') {
            // Try to parse a number out of the string
            const match = workingHours.match(/\d+/); // e.g. "9" from "FLEXI SHIFT - 9 HRS"
            if (match) {
                const hoursNum = parseInt(match[0], 10);
                if (!isNaN(hoursNum) && hoursNum > 0) {
                    parsedWorkingHours = hoursNum;
                }
            }
        }
        // OPTIONALLY, to replicate your older approach of picking up
        // "wageType", "dailyWageRate", etc., we look at the **latest** slice
        // in wageBreakdown. If there's no breakdown, we'll default to zeros:
        let latestSlice = wageBreakdown.length
            ? wageBreakdown[wageBreakdown.length - 1]
            : {};

        // Extract some common fields from the last slice
        const wageType      = latestSlice.payStructure || "-";
        const dailyWageRate = latestSlice.dailyWages || 0;
        const monthlySalary = latestSlice.monthlyWages || 0;
        const weeklyOffDays = latestSlice.weeklyOff || 0;
        const fixedMonthlyWage = latestSlice.fixedMonthlyWages || 0;

        // C) Variable Pay
        const {
            advance,
            advanceRemarks,
            debit,
            debitRemarks,
            incentive,
            incentiveRemarks
        } = variablePay;

        // D) OverTime hours
        //    (We have it as cappedOvertime from DB. If you also store
        //     normalOvertime in attendance, you can cross-check.)
        // ------------------------------------------------------------

        // ---------------- SALARY COMPUTATION LOGIC ------------------

        // let basicSalary = totalWagesForMonth;
        // let derivedPerHour = 0;
        // if (dailyWageRate > 0 && workingHours > 0) {
        //     derivedPerHour = dailyWageRate / workingHours;
        // }
        let basicSalary = 0;
        if (wageType.includes("DAILY WAGES")) {
            // Pay only for present + half-days
            // (no pay for absent or missPunch days)
            const fullDayPay = presentDays * dailyWageRate;
      const halfDayPay = halfDays * (dailyWageRate / 2);
      basicSalary = fullDayPay + halfDayPay;
        } else {
            // monthly/fixed => use partial wages
            basicSalary = totalWagesForMonth;
        }
        // B) derivedPerHour using workingHours
        let derivedPerHour = 0;
        if (wageType.includes("DAILY WAGES")) {
            // daily => dailyWageRate / workingHours
            if (dailyWageRate > 0 && parsedWorkingHours > 0) {
                derivedPerHour = dailyWageRate / parsedWorkingHours;
            }
        } else {
            // monthly/fixed => (monthly / 30) / workingHours
            const baseMonthly = fixedMonthlyWage || monthlySalary;
            if (baseMonthly > 0 && parsedWorkingHours > 0) {
                derivedPerHour = (baseMonthly / 30) / parsedWorkingHours;
            }
        }
        let overtimePay = cappedOvertime * derivedPerHour;

        let totalHolidayOvertimePay = holidayOvertimeWages;

        let weeklyOffPay = 0;
        // if (weeklyOffDays > 0) {
        //     // If presentDays cross a threshold:
        //     if (presentDays > 15) {
        //         if (wageType.toLowerCase().includes('DAILY WAGES')) {
        //             weeklyOffPay = weeklyOffDays * dailyWageRate;
        //         } else {
        //             const dailyRate = (fixedMonthlyWage || monthlySalary) / 30;
        //             weeklyOffPay = weeklyOffDays * dailyRate;
        //         }
        //     } else {
        //         // If presentDays <= 15
        //         if (wageType.toLowerCase().includes('FIXED MONTHLY WAGES')) {
        //             weeklyOffPay = weeklyOffDays * dailyWageRate * 0.5;
        //         } else {
        //             const dailyRate = (fixedMonthlyWage || monthlySalary) / 30;
        //             weeklyOffPay = weeklyOffDays * dailyRate * 0.5;
        //         }
        //     }
        // }

        if (weeklyOffDays > 0) {
            const isDaily = wageType.includes("DAILY WAGES");
            const baseMonthly = fixedMonthlyWage || monthlySalary;
            if (presentDays > 15) {
              // 100% pay
              weeklyOffPay = isDaily
                ? weeklyOffDays * dailyWageRate
                : weeklyOffDays * (baseMonthly / 30);
            } else {
              // 50% pay
              weeklyOffPay = isDaily
                ? weeklyOffDays * (dailyWageRate * 0.5)
                : weeklyOffDays * ((baseMonthly / 30) * 0.5);
            }
          }

        // 5) “Previous Wage” Calculation:
        //    In your older snippet, you mention:
        //    const previousWage = wages.previousWage
        //    const previousDaysApplicable = wages.previousDaysApplicable
        //    ...
        //    However, in partial wages, the “previous” portion is already
        //    part of the wageBreakdown slices. If you REALLY need to
        //    replicate it manually, you can do so. Otherwise, partial wages
        //    typically handle it. We'll show how it might look if you want
        //    to do a manual approach:
        let previousWageAmount = 0;
        // If your wageBreakdown actually had two slices:
        //   - [0] older slice (the "previous wage")
        //   - [1] newer slice
        // you could compute how many days apply to the older slice to
        // do manual logic. (Often not needed if partial wages are done.)
        //
        // For demonstration, we skip it. Or do something like:
        // const olderSlice = wageBreakdown.length > 1 ? wageBreakdown[0] : null;
        // if (olderSlice && olderSlice.payStructure.toLowerCase().includes('daily')) {
        //     previousWageAmount = olderSlice.dailyWages * (some dayCount);
        // } else { ... }

        // 6) Deductions (Absent/HalfDays + Advances + Debits):
        //    In your older snippet, you subtract absent/half-day from monthly salary.
        //    But if partial wages are already handled, you might NOT do it again.
        //    If you still want to replicate it, see your logic:
        let totalAttendanceDeductions = 0;
        if (!wageType.includes('DAILY WAGES')) {
            const baseMonthly = fixedMonthlyWage || monthlySalary;
            if (baseMonthly > 0) {
              const dailyRate = baseMonthly / 30;
              const absentDaysDeduction = absentDays * dailyRate;
              const halfDaysDeduction   = halfDays * (dailyRate / 2);
              // If you treat missPunchDays as absent => add them
              // e.g. const missPunchDeduction = missPunchDays * dailyRate;
              totalAttendanceDeductions = absentDaysDeduction + halfDaysDeduction;
            }
        }
        // Summation of everything else:
        let totalDeductions = totalAttendanceDeductions + advance + debit;

        // 7) Bonuses/Incentives
        let bonuses = incentive || 0;

        // 8) Calculate GROSS Pay
        const grossPay = 
            basicSalary +
            overtimePay +
            totalHolidayOvertimePay +
            weeklyOffPay +
            previousWageAmount +
            bonuses;

        // 9) Calculate NET Pay
        let netPay = grossPay - totalDeductions;
        // if (netPay < 0) {
        //     netPay = 0;
        // }
        let isNegativeSalary = false;
        if (netPay < 0) {
            isNegativeSalary = true;
            // Option A: Set netPay to 0 and keep the flag
            netPay = 0;
            
            // Option B (Alternate):
            // Return early or provide a special message
            // return {
            //   labourId, month, year,
            //   message: "Net salary is negative due to high deductions!"
            // };
        }

        // --------------------- FINAL RETURN ---------------------------
        // We return a verbose object so you have all pieces:
        return {
            labourId,
            month,
            year,

            // Full attendance breakdown
            attendance: {
                presentDays,
                absentDays,
                halfDays,
                missPunchDays,
                normalOvertimeCount,
                holidayOvertimeCount,
                totalHolidaysInMonth,
                holidayOvertimeHours,
                holidayOvertimeWages
            },

            // The partial-month wage info (including breakdown details)
            wagesInfo,

            // The variables from the last (most recent) wage slice
            wageType,
            dailyWageRate: dailyWageRate.toFixed(2),
            monthlySalary: monthlySalary.toFixed(2),
            fixedMonthlyWage: fixedMonthlyWage.toFixed(2),
            weeklyOffDays,
            rawWorkingHours: workingHours,
            parsedWorkingHours,

            // Variable Pay
            variablePay: {
                advance: advance.toFixed(2),
                advanceRemarks,
                debit: debit.toFixed(2),
                debitRemarks,
                incentive: incentive.toFixed(2),
                incentiveRemarks
            },

            // Overtime
            cappedOvertime: cappedOvertime.toFixed(2),
            derivedPerHour: derivedPerHour.toFixed(2),

            // Computed Values
            baseWage: basicSalary.toFixed(2),
            overtimePay: overtimePay.toFixed(2),
            holidayOvertimePay: totalHolidayOvertimePay.toFixed(2),
            weeklyOffPay: weeklyOffPay.toFixed(2),
            previousWageAmount: previousWageAmount.toFixed(2),
            bonuses: bonuses.toFixed(2),

            // Deductions & Final
            totalAttendanceDeductions: totalAttendanceDeductions.toFixed(2),
            totalDeductions: totalDeductions.toFixed(2),
            grossPay: grossPay.toFixed(2),
            netPay: netPay.toFixed(2),
            isNegativeSalary
        };

    } catch (error) {
        console.error(`Failed to process payroll for labourId: ${labourId}`, error);
        throw error;
    }
}

// --------------------------------------- IMP CODE START BELOW --------------------------

 // // Calculate net salary for a single labour for the given month/year.
 // // Returns an object with the final breakdown.
 
// async function calculateSalaryForLabour(labourId, month, year) {
//     try {
//         // 1️⃣ **Fetch Attendance Summary**
//         const attendance = await getAttendanceSummaryForLabour(labourId, month, year);

//         // 2️⃣ **Fetch Wage Info**
//         const wages = await getWageInfoForLabour(labourId, month, year);

//         // 3️⃣ **Fetch Variable Pay (Ensure default values)**
//         let variablePay = await getVariablePayForLabour(labourId, month, year);

//         // ✅ If variablePay is undefined, assign default values to prevent errors
//         if (!variablePay) {
//             variablePay = {
//                 advance: 0,
//                 advanceRemarks: "-",
//                 debit: 0,
//                 debitRemarks: "-",
//                 incentive: 0,
//                 incentiveRemarks: "-"
//             };
//         }

//         // 4️⃣ **Calculate Total Overtime**
//         const cappedOvertime = await calculateTotalOvertime(labourId, month, year);

//         if (!wages) {
//             return { message: `No approved wages for labour ID: ${labourId}` };
//         }

//         // 🟢 **Extract Attendance Data**
//         const {
//             presentDays = 0,
//             absentDays = 0,
//             halfDays = 0,
//             missPunchDays = 0,
//             normalOvertimeCount = 0,
//             holidayOvertimeCount = 0,
//             totalHolidaysInMonth = 0,
//             holidayOvertimeHours = 0,
//             holidayOvertimeWages = 0
//         } = attendance;

//         // 🟢 **Extract Wage Data**
//         const wageType = wages.PayStructure || "-";
//         const dailyWageRate = wages.DailyWages || 0;
//         const monthlySalary = wages.MonthlyWages || 0;
//         const weeklyOffDays = wages.WeeklyOff || 0;
//         const fixedMonthlyWage = wages.FixedMonthlyWages || 0;
//         const perHourWages = wages.PerHourWages || 0;

//         const previousWage = wages.previousWage;
//         const previousDaysApplicable = wages.previousDaysApplicable || 0;
//         const currentDaysApplicable = wages.currentDaysApplicable || 0;

//         // 🟢 **Extract Variable Pay (Now Safe from Errors)**
//         const {
//             advance,
//             advanceRemarks,
//             debit,
//             debitRemarks,
//             incentive,
//             incentiveRemarks
//         } = variablePay;

//         // ✅ **Calculate Basic Salary**
//         let basicSalary = 0;
//         let overtimePay = 0;
//         let weeklyOffPay = 0;
//         let totalOvertimePay = 0;

//         if (wageType.toLowerCase().includes('daily')) {
//             basicSalary = dailyWageRate * presentDays;
//             totalOvertimePay = cappedOvertime * perHourWages;
//         } else {
//             const baseMonthly = fixedMonthlyWage || monthlySalary;
//             basicSalary = baseMonthly;

//             const dailyRate = baseMonthly / 30;
//             const absentDaysDeduction = absentDays * dailyRate;
//             const halfDaysDeduction = halfDays * (dailyRate / 2);
//             totalOvertimePay = cappedOvertime * dailyRate * 1.5;

//             var totalAttendanceDeductions = absentDaysDeduction + halfDaysDeduction;
//         }

//         // ✅ **Holiday Overtime Pay Calculation**
//         let totalHolidayOvertimePay = holidayOvertimeHours * perHourWages;

//         // ✅ **Weekly Off Calculation**
//         if (weeklyOffDays > 0) {
//             if (presentDays > 15) {
//                 if (wageType.toLowerCase().includes('daily')) {
//                     weeklyOffPay = weeklyOffDays * dailyWageRate;
//                 } else {
//                     const dailyRate = (fixedMonthlyWage || monthlySalary) / 30;
//                     weeklyOffPay = weeklyOffDays * dailyRate;
//                 }
//             } else {
//                 if (wageType.toLowerCase().includes('fixed monthly')) {
//                     weeklyOffPay = weeklyOffDays * dailyWageRate * 0.5;
//                 } else {
//                     const dailyRate = (fixedMonthlyWage || monthlySalary) / 30;
//                     weeklyOffPay = weeklyOffDays * dailyRate * 0.5;
//                 }
//             }
//         }

//         // ✅ **Previous Wage Calculation**
//         let previousWageAmount = 0;
//         if (previousWage) {
//             if (previousWage.PayStructure.toLowerCase().includes('daily')) {
//                 previousWageAmount = previousWage.DailyWages * previousDaysApplicable;
//             } else {
//                 const previousBase = previousWage.FixedMonthlyWages || previousWage.MonthlyWages;
//                 previousWageAmount = (previousBase / 30) * previousDaysApplicable;
//             }
//         }

//         // ✅ **Calculate Deductions**
//         let totalDeductions = totalAttendanceDeductions || 0;
//         totalDeductions += advance;
//         totalDeductions += debit;

//         // ✅ **Calculate Bonuses/Incentives**
//         let bonuses = incentive || 0;

//         // ✅ **Calculate Gross Pay**
//         const grossPay = basicSalary + totalOvertimePay + weeklyOffPay + bonuses + previousWageAmount + totalHolidayOvertimePay;

//         // ✅ **Calculate Net Pay**
//         let netPay = grossPay - totalDeductions;
//         if (netPay < 0) {
//             netPay = 0;
//         }

//         // ✅ **Return Final Salary Data**
//         return {
//             labourId,
//             month,
//             year,
//             wageType,
//             dailyWageRate: dailyWageRate.toFixed(2),
//             fixedMonthlyWage: fixedMonthlyWage.toFixed(2),
//             presentDays,
//             absentDays,
//             halfDays,
//             missPunchDays,
//             normalOvertimeCount,
//             holidayOvertimeCount,
//             totalHolidaysInMonth,
//             cappedOvertime: cappedOvertime.toFixed(2),
//             holidayOvertimeHours,
//             holidayOvertimeWages,
//             basicSalary: basicSalary.toFixed(2),
//             previousWageAmount: previousWageAmount.toFixed(2),
//             overtimePay: totalOvertimePay.toFixed(2),
//             weeklyOffPay: weeklyOffPay.toFixed(2),
//             bonuses: bonuses.toFixed(2),
//             totalDeductions: totalDeductions.toFixed(2),
//             grossPay: grossPay.toFixed(2),
//             netPay: netPay.toFixed(2),
//             advance: advance.toFixed(2),
//             advanceRemarks,
//             debit: debit.toFixed(2),
//             debitRemarks,
//             incentive: incentive.toFixed(2),
//             incentiveRemarks
//         };
//     } catch (error) {
//         console.error(`Failed to process payroll for labourId: ${labourId}`, error);
//         throw error;
//     }
// }
// --------------------------------------- IMP CODE END ABOVE --------------------------

// async function calculateSalaryForLabour(labourId, month, year) {
//     try {
//         // 1️⃣ **Fetch Attendance Summary**
//         const attendance = await getAttendanceSummaryForLabour(labourId, month, year);

//         // 2️⃣ **Fetch Wage Info**
//         const wages = await getWageInfoForLabour(labourId, month, year);

//         // 3️⃣ **Fetch Variable Pay**
//         const variablePay = await getVariablePayForLabour(labourId, month, year);

//         // 4️⃣ **Calculate Total Overtime**
//         const cappedOvertime = await calculateTotalOvertime(labourId, month, year);

//         if (!wages) {
//             return { message: `No approved wages for labour ID: ${labourId}` };
//         }

//         // 🟢 **Extract Attendance Data**
//         const {
//             presentDays = 0,
//             absentDays = 0,
//             halfDays = 0,
//             missPunchDays = 0,
//             normalOvertimeCount = 0,
//             holidayOvertimeCount = 0
//         } = attendance;

//         // 🟢 **Extract Wage Data**
//         const wageType = wages.PayStructure || "-";
//         const dailyWageRate = wages.DailyWages || 0;
//         const monthlySalary = wages.MonthlyWages || 0;
//         const weeklyOffDays = wages.WeeklyOff || 0;
//         const fixedMonthlyWage = wages.FixedMonthlyWages || 0;

//         const previousWage = wages.previousWage;
//         const previousDaysApplicable = wages.previousDaysApplicable || 0;
//         const currentDaysApplicable = wages.currentDaysApplicable || 0;

//         // 🟢 **Extract Variable Pay**
//         const {
//             advance = 0,
//             advanceRemarks = "-",
//             debit = 0,
//             debitRemarks = "-",
//             incentive = 0,
//             incentiveRemarks = "-"
//         } = variablePay;

//         // ✅ **Calculate Basic Salary**
//         let basicSalary = 0;
//         let totalOvertimeDays = normalOvertimeCount + holidayOvertimeCount;
//         let overtimePay = 0;

//         if (wageType.toLowerCase().includes('daily')) {
//             // Daily wages
//             basicSalary = dailyWageRate * presentDays;
//             overtimePay = totalOvertimeDays * dailyWageRate * 1.5; // OT rate = 1.5x
//         } else {
//             // Monthly wages
//             const baseMonthly = fixedMonthlyWage || monthlySalary;
//             basicSalary = baseMonthly;

//             const dailyRate = baseMonthly / 30;
//             const absentDaysDeduction = absentDays * dailyRate;
//             const halfDaysDeduction = halfDays * (dailyRate / 2);
//             overtimePay = totalOvertimeDays * dailyRate * 1.5;

//             var totalAttendanceDeductions = absentDaysDeduction + halfDaysDeduction;
//         }

//         // ✅ **Previous Wage Calculation**
//         let previousWageAmount = 0;
//         if (previousWage) {
//             if (previousWage.PayStructure.toLowerCase().includes('daily')) {
//                 previousWageAmount = previousWage.DailyWages * previousDaysApplicable;
//             } else {
//                 const previousBase = previousWage.FixedMonthlyWages || previousWage.MonthlyWages;
//                 previousWageAmount = (previousBase / 30) * previousDaysApplicable;
//             }
//         }

//         // ✅ **Weekly Off Calculation**
//         let weeklyOffPay = 0;
//         if (weeklyOffDays > 0) {
//             if (presentDays > 15) {
//                 if (wageType.toLowerCase().includes('daily')) {
//                     weeklyOffPay = weeklyOffDays * dailyWageRate;
//                 } else {
//                     const dailyRate = (fixedMonthlyWage || monthlySalary) / 30;
//                     weeklyOffPay = weeklyOffDays * dailyRate;
//                 }
//             } else {
//                 if (wageType.toLowerCase().includes('fixed monthly')) {
//                     weeklyOffPay = weeklyOffDays * dailyWageRate * 0.5;
//                 } else {
//                     const dailyRate = (fixedMonthlyWage || monthlySalary) / 30;
//                     weeklyOffPay = weeklyOffDays * dailyRate * 0.5;
//                 }
//             }
//         }

//         // ✅ **Calculate Deductions**
//         let totalDeductions = totalAttendanceDeductions || 0;
//         totalDeductions += advance;
//         totalDeductions += debit;

//         // ✅ **Calculate Bonuses/Incentives**
//         let bonuses = incentive || 0;

//         // ✅ **Calculate Gross Pay**
//         const grossPay = basicSalary + overtimePay + weeklyOffPay + bonuses + previousWageAmount;

//         // ✅ **Calculate Net Pay**
//         let netPay = grossPay - totalDeductions;
//         if (netPay < 0) {
//             netPay = 0; // Prevent negative salary
//         }

//         // ✅ **Return Final Salary Data**
//         return {
//             labourId,
//             month,
//             year,
//             wageType,
//             dailyWageRate: dailyWageRate.toFixed(2),
//             fixedMonthlyWage: fixedMonthlyWage.toFixed(2),
//             presentDays,
//             absentDays,
//             halfDays,
//             missPunchDays,
//             normalOvertimeCount,
//             holidayOvertimeCount,
//             cappedOvertime: cappedOvertime.toFixed(2),
//             basicSalary: basicSalary.toFixed(2),
//             previousWageAmount: previousWageAmount.toFixed(2),
//             overtimePay: overtimePay.toFixed(2),
//             weeklyOffPay: weeklyOffPay.toFixed(2),
//             bonuses: bonuses.toFixed(2),
//             totalDeductions: totalDeductions.toFixed(2),
//             grossPay: grossPay.toFixed(2),
//             netPay: netPay.toFixed(2),
//             advance: advance.toFixed(2),
//             advanceRemarks,
//             debit: debit.toFixed(2),
//             debitRemarks,
//             incentive: incentive.toFixed(2),
//             incentiveRemarks
//         };
//     } catch (error) {
//         console.error("Error in calculateSalaryForLabour:", error);
//         throw error;
//     }
// };



/**
 * Generate salary for **all** eligible labours in a given month/year.
 * Returns an array of salary objects.
 */

// async function generateMonthlyPayroll(month, year) {
//     const failedLabourIds = []; // Store failed payroll processing IDs
//     let finalSalaries = [];

//     console.log(`🚀 Starting monthly payroll generation for ${month}/${year}`);
//     try {
//         let eligibleLabours = await getEligibleLabours(month, year);

//         // ✅ **Sort eligible labours before processing**
//         eligibleLabours = eligibleLabours.sort((a, b) => a.labourId.localeCompare(b.labourId));

//         const pool = await poolPromise;

//         for (const labour of eligibleLabours) {
//             try {
//                 console.log(`🔹 Processing payroll for labourId: ${labour.labourId}`);

//                 const salaryDetail = await calculateSalaryForLabour(labour.labourId, month, year);

//                 // ✅ **Validate salaryDetail before proceeding**
//                 if (!salaryDetail || !salaryDetail.labourId) {
//                     console.warn(`⚠️ Skipping labourId: ${labour.labourId} - Invalid salary details.`);
//                     failedLabourIds.push(labour.labourId);
//                     continue; // Skip to the next labourId
//                 }

//                 finalSalaries.push(salaryDetail);

//                 // Helper function to truncate long strings
//                 const truncateString = (str, num) => (str && str.length > num ? str.slice(0, num) : str || "");

//                 // ✅ **Ensure variablePay exists with default values**
//                 const variablePay = salaryDetail.variablePay || {
//                     advance: 0,
//                     advanceRemarks: "-",
//                     debit: 0,
//                     debitRemarks: "-",
//                     incentive: 0,
//                     incentiveRemarks: "-"
//                 };

//                 console.log(`🔹 Preparing to insert payroll details for labourId: ${labour.labourId}`);

//                 // ✅ **Insert into [FinalizedSalaryPay] table**
//                 await pool.request()
//                     .input('labourId', sql.NVarChar, salaryDetail.labourId)
//                     .input('month', sql.Int, month)
//                     .input('year', sql.Int, year)
//                     .input('wageType', sql.NVarChar, salaryDetail.wageType)
//                     .input('dailyWageRate', sql.Decimal(18, 2), salaryDetail.dailyWageRate)
//                     .input('fixedMonthlyWage', sql.Decimal(18, 2), salaryDetail.fixedMonthlyWage)
//                     .input('presentDays', sql.Int, salaryDetail.presentDays)
//                     .input('absentDays', sql.Int, salaryDetail.absentDays)
//                     .input('halfDays', sql.Int, salaryDetail.halfDays)
//                     .input('missPunchDays', sql.Int, salaryDetail.missPunchDays)
//                     .input('normalOvertimeCount', sql.Int, salaryDetail.normalOvertimeCount)
//                     .input('holidayOvertimeCount', sql.Int, salaryDetail.holidayOvertimeCount)
//                     .input('cappedOvertime', sql.Decimal(18, 2), salaryDetail.cappedOvertime)
//                     .input('basicSalary', sql.Decimal(18, 2), salaryDetail.basicSalary)
//                     .input('previousWageAmount', sql.Decimal(18, 2), salaryDetail.previousWageAmount)
//                     .input('overtimePay', sql.Decimal(18, 2), salaryDetail.overtimePay)
//                     .input('weeklyOffPay', sql.Decimal(18, 2), salaryDetail.weeklyOffPay)
//                     .input('bonuses', sql.Decimal(18, 2), salaryDetail.bonuses)
//                     .input('totalDeductions', sql.Decimal(18, 2), salaryDetail.totalDeductions)
//                     .input('grossPay', sql.Decimal(18, 2), salaryDetail.grossPay)
//                     .input('netPay', sql.Decimal(18, 2), salaryDetail.netPay)
//                     .input('advance', sql.Decimal(18, 2), variablePay.advance || 0)
//                     .input('advanceRemarks', sql.NVarChar, truncateString(variablePay.advanceRemarks, 255))
//                     .input('debit', sql.Decimal(18, 2), variablePay.debit || 0)
//                     .input('debitRemarks', sql.NVarChar, truncateString(variablePay.debitRemarks, 255))
//                     .input('incentive', sql.Decimal(18, 2), variablePay.incentive || 0)
//                     .input('incentiveRemarks', sql.NVarChar, truncateString(variablePay.incentiveRemarks, 255))

//                     .query(`
//                         INSERT INTO [dbo].[FinalizedSalaryPay] 
//                         (
//                             labourId, month, year, WageType, dailyWageRate, fixedMonthlyWage,
//                             PresentDays, AbsentDays, HalfDays, missPunchDays, normalOvertimeCount, holidayOvertimeCount, cappedOvertime,
//                             BasicSalary, previousWageAmount, OvertimePay, WeeklyOffPay, Bonuses,
//                             TotalDeductions, GrossPay, NetPay, advance,
//                             AdvanceRemarks, debit, DebitRemarks, incentive, IncentiveRemarks
//                         )
//                         VALUES
//                         (
//                             @labourId, @month, @year, @wageType, @dailyWageRate, @fixedMonthlyWage,
//                             @presentDays, @absentDays, @halfDays, @missPunchDays, @normalOvertimeCount, @holidayOvertimeCount, @cappedOvertime,
//                             @basicSalary, @previousWageAmount, @overtimePay, @weeklyOffPay, @bonuses,
//                             @totalDeductions, @grossPay, @netPay, @advance,
//                             @advanceRemarks, @debit, @debitRemarks, @incentive, @incentiveRemarks
//                         );
//                    `);

//                 console.log(`✅ Successfully inserted payroll details for labourId: ${labour.labourId}`);
//             } catch (error) {
//                 console.error(`❌ Failed to process payroll for labourId: ${labour.labourId}`, error);
//                 failedLabourIds.push(labour.labourId);
//             }
//         }

//         // ✅ **If any payrolls failed, generate an Excel report**
//         if (failedLabourIds.length > 0) {
//             console.log('⚠️ Generating Excel file for failed payrolls...');
//             await createExcelFile(failedLabourIds);
//         }

//         console.log('🎯 Finished generating monthly payroll');
//         return finalSalaries; // Return successfully computed salaries
//     } catch (error) {
//         console.error('❌ Error generating monthly payroll:', error);
//         throw error;
//     }
// }

// // ✅ **Helper function to create an Excel file for failed payrolls**
// async function createExcelFile(failedLabourIds) {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Failed Labour IDs');

//     worksheet.columns = [{ header: 'Labour ID', key: 'labourId', width: 20 }];

//     failedLabourIds.forEach(id => worksheet.addRow({ labourId: id }));

//     try {
//         await workbook.xlsx.writeFile('FailedLabourIds.xlsx');
//         console.log('📂 Excel file created successfully: FailedLabourIds.xlsx');
//     } catch (err) {
//         console.error('❌ Failed to write Excel file:', err);
//     }
// }


async function generateMonthlyPayroll(month, year) {
    const failedLabourIds = [];         // Will store labourIds we cannot process due to invalid data
    const alreadyExistLabourIds = [];   // Will store labourIds already existing for this month/year
    let finalSalaries = [];            // Will store successful salary results

    // console.log(`\n🚀 Starting monthly payroll generation for ${month}/${year}\n`);
    try {
        // 1️⃣ Get a list of all eligible labour IDs for this month/year
        let eligibleLabours = await getEligibleLabours(month, year);

        // 2️⃣ Sort labour by ID for consistent order
        eligibleLabours = eligibleLabours.sort((a, b) => a.labourId.localeCompare(b.labourId));

        // 3️⃣ Acquire DB pool
        const pool = await poolPromise;

        for (const labour of eligibleLabours) {
            try {
                  console.log(`🔹 Processing payroll for labourId: ${labour.labourId}`);

                // 4️⃣ Fetch labour details from [labourOnboarding]
                const labourDetailsResult = await pool.request()
                    .input('labourId', sql.NVarChar, labour.labourId)
                    .query(`
                SELECT 
                    id, LabourID, name, businessUnit, projectName, departmentName, department, aadhaarNumber, accountNumber, ifscCode
                FROM [dbo].[labourOnboarding]
                WHERE LabourID = @labourId AND status = 'Approved'
            `);

                if (labourDetailsResult.recordset.length === 0) {
                    // console.warn(`⚠️ Skipping labourId: ${labour.labourId} - Not found in labourOnboarding.`);
                    failedLabourIds.push(labour.labourId);
                    continue;
                }

                const labourDetails = labourDetailsResult.recordset[0];

                // 4️⃣ Check if this labourId, month, year already exist in [FinalizedSalaryPay]
                const checkResult = await pool.request()
                    .input('labourId', sql.NVarChar, labour.labourId)
                    .input('month', sql.Int, month)
                    .input('year', sql.Int, year)
                    .query(`
              SELECT labourId 
              FROM [dbo].[FinalizedSalaryPay] 
              WHERE labourId = @labourId 
                AND month = @month 
                AND year = @year
            `);

                if (checkResult.recordset.length > 0) {
                    // Already exists => skip
                    console.warn(`⚠️ Skipping labourId: ${labour.labourId} - Already exists for ${month}/${year}\n`);
                    alreadyExistLabourIds.push(labour.labourId);
                    continue; // Move on to next labour
                }

                // 5️⃣ Calculate salary details
                const salaryDetail = await calculateSalaryForLabour(labour.labourId, month, year);

                // 6️⃣ Validate salaryDetail
                if (!salaryDetail || !salaryDetail.labourId) {
                    console.warn(`⚠️ Skipping labourId: ${labour.labourId} - Invalid salary details.\n`);
                    failedLabourIds.push(labour.labourId);
                    continue;
                }

                // 7️⃣ Add result to finalSalaries
                finalSalaries.push(salaryDetail);

                // Helper to truncate long strings
                const truncateString = (str, num) =>
                    (str && str.length > num ? str.slice(0, num) : str || "");
                

                // Ensure variablePay has defaults
                const variablePay = salaryDetail.variablePay || {
                    advance: 0,
                    advanceRemarks: "",
                    debit: 0,
                    debitRemarks: "",
                    incentive: 0,
                    incentiveRemarks: ""
                };

                  console.log(`🔹 Preparing to insert payroll details for labourId: ${labour.labourId}`);

                // 8️⃣ Insert final salary into [FinalizedSalaryPay]
                await pool.request()
                    .input('labourId', sql.NVarChar, salaryDetail.labourId)
                    .input('month', sql.Int, month)
                    .input('year', sql.Int, year)
                    .input('wageType', sql.NVarChar, salaryDetail.wageType)
                    .input('dailyWageRate', sql.Decimal(18, 2), salaryDetail.dailyWageRate)
                    .input('fixedMonthlyWage', sql.Decimal(18, 2), salaryDetail.fixedMonthlyWage)
                    .input('presentDays', sql.Int, salaryDetail.attendance.presentDays)
                    .input('absentDays', sql.Int, salaryDetail.attendance.absentDays)
                    .input('halfDays', sql.Int, salaryDetail.attendance.halfDays)
                    .input('missPunchDays', sql.Int, salaryDetail.attendance.missPunchDays)
                    .input('normalOvertimeCount', sql.Int, salaryDetail.attendance.normalOvertimeCount)
                    .input('holidayOvertimeCount', sql.Int, salaryDetail.attendance.holidayOvertimeCount)
                    .input('totalHolidaysInMonth', sql.Int, salaryDetail.attendance.totalHolidaysInMonth)
                    .input('holidayOvertimePay', sql.Decimal(18, 2), salaryDetail.holidayOvertimePay)
                    .input('holidayOvertimeHours', sql.Decimal(18, 2), salaryDetail.attendance.holidayOvertimeHours)
                    .input('holidayOvertimeWages', sql.Decimal(18, 2), salaryDetail.attendance.holidayOvertimeWages)
                    .input('cappedOvertime', sql.Decimal(18, 2), salaryDetail.cappedOvertime)
                    .input('basicSalary', sql.Decimal(18, 2), salaryDetail.baseWage)
                    .input('previousWageAmount', sql.Decimal(18, 2), salaryDetail.previousWageAmount)
                    .input('totalAttendanceDeductions', sql.Decimal(18, 2), salaryDetail.totalAttendanceDeductions)
                    .input('overtimePay', sql.Decimal(18, 2), salaryDetail.overtimePay)
                    .input('weeklyOffPay', sql.Decimal(18, 2), salaryDetail.weeklyOffPay)
                    .input('bonuses', sql.Decimal(18, 2), salaryDetail.bonuses)
                    .input('totalDeductions', sql.Decimal(18, 2), salaryDetail.totalDeductions)
                    .input('grossPay', sql.Decimal(18, 2), salaryDetail.grossPay)
                    .input('netPay', sql.Decimal(18, 2), salaryDetail.netPay)

                    // Variable Pay
                    .input('advance', sql.Decimal(18, 2), variablePay.advance)
                    .input('advanceRemarks', sql.NVarChar, truncateString(variablePay.advanceRemarks, 255))
                    .input('debit', sql.Decimal(18, 2), variablePay.debit)
                    .input('debitRemarks', sql.NVarChar, truncateString(variablePay.debitRemarks, 255))
                    .input('incentive', sql.Decimal(18, 2), variablePay.incentive)
                    .input('incentiveRemarks', sql.NVarChar, truncateString(variablePay.incentiveRemarks, 255))
                    .input('id', sql.Int, labourDetails.id)
                    .input('name', sql.NVarChar, labourDetails.name)
                    .input('businessUnit', sql.NVarChar, labourDetails.businessUnit)
                    .input('projectName', sql.Int, labourDetails.projectName)
                    .input('departmentName', sql.NVarChar, labourDetails.departmentName)
                    .input('department', sql.Int, labourDetails.department)
                    .input('aadhaarNumber', sql.Int, labourDetails.aadhaarNumber)
                    .input('accountNumber', sql.Int, labourDetails.accountNumber)
                    .input('ifscCode', sql.Int, labourDetails.ifscCode)

                    .query(`
              INSERT INTO [dbo].[FinalizedSalaryPay] (
                  LabourID, month, year, WageType, dailyWageRate, fixedMonthlyWage,
                  PresentDays, AbsentDays, HalfDays, missPunchDays, normalOvertimeCount, holidayOvertimeCount,
                  totalHolidaysInMonth, holidayOvertimePay, holidayOvertimeHours, holidayOvertimeWages, cappedOvertime,
                  BasicSalary, previousWageAmount, totalAttendanceDeductions, OvertimePay, WeeklyOffPay, Bonuses,
                  TotalDeductions, GrossPay, NetPay,
                  advance, AdvanceRemarks, debit, DebitRemarks, incentive, IncentiveRemarks,
                  id, name, businessUnit, projectName, departmentName, department, aadhaarNumber, accountNumber, ifscCode
              )
              VALUES (
                  @labourId, @month, @year, @wageType, @dailyWageRate, @fixedMonthlyWage,
                  @presentDays, @absentDays, @halfDays, @missPunchDays, @normalOvertimeCount, @holidayOvertimeCount,
                  @totalHolidaysInMonth, @holidayOvertimePay, @holidayOvertimeHours, @holidayOvertimeWages, @cappedOvertime,
                  @basicSalary, @previousWageAmount, @totalAttendanceDeductions, @overtimePay, @weeklyOffPay, @bonuses,
                  @totalDeductions, @grossPay, @netPay,
                  @advance, @advanceRemarks, @debit, @debitRemarks, @incentive, @incentiveRemarks,
                  @id, @name, @businessUnit, @projectName, @departmentName, @department, @aadhaarNumber, @accountNumber, @ifscCode
              );
            `);

                  console.log(`✅ Inserted payroll for labourId: ${labour.labourId}\n`);

            } catch (error) {
                  console.error(`❌ Failed payroll for labourId: ${labour.labourId}`, error);
                failedLabourIds.push(labour.labourId);
            }
        }

        // 9️⃣ If any were skipped or failed, log them to a JSON file
        if (failedLabourIds.length > 0 || alreadyExistLabourIds.length > 0) {
            await createJsonFileForSkippedLabours({
                month,
                year,
                dateGenerated: new Date().toISOString(),
                alreadyExistLabourIds,
                failedLabourIds
            });
        }

        console.log('🎯 Finished generating monthly payroll');
        return finalSalaries;
    } catch (error) {
        console.error('❌ Error generating monthly payroll:', error);
        throw error;
    }
}

/**
 * Writes skipped labour IDs to a JSON file for easy review:
 *  - alreadyExistLabourIds (those that already had payroll for this month/year)
 *  - failedLabourIds (those that had invalid data or an error)
 */
async function createJsonFileForSkippedLabours(data) {
    try {
        fs.writeFileSync('SkippedLabours.json', JSON.stringify(data, null, 2), 'utf8');
        console.log('📂 JSON file created: SkippedLabours.json\n');
    } catch (err) {
        console.error('❌ Failed to write JSON file:', err);
    }
}


async function deleteMonthlyPayrollData(month, year, labourIds = []) {
    try {
        const pool = await poolPromise;

        // If labourIds array is present & not empty, delete only those labourIds
        if (labourIds.length > 0) {
            // console.log(`\n🔸 Deleting payroll for labourIds [${labourIds.join(', ')}] for month=${month}, year=${year}`);

            // Build a parameter list for the IN clause, e.g. @lab0, @lab1, ...
            const labourIdParams = labourIds.map((_, i) => `@lab${i}`).join(', ');
            const request = pool.request();

            // Attach each labourId as an input parameter
            labourIds.forEach((id, i) => {
                request.input(`lab${i}`, sql.NVarChar, id);
            });

            // Also attach month & year
            request.input('month', sql.Int, month);
            request.input('year', sql.Int, year);

            const deleteQuery = `
          DELETE FROM [dbo].[FinalizedSalaryPay]
          WHERE month = @month
            AND year = @year
            AND labourId IN (${labourIdParams});
        `;

            const result = await request.query(deleteQuery);
            return {
                success: true,
                rowsAffected: result.rowsAffected[0],
                message: `Deleted ${result.rowsAffected[0]} record(s) for labourIds [${labourIds.join(', ')}].`
            };
        }
        // Otherwise, delete all labourIds for the given month/year
        else {
            // console.log(`\n🔸 Deleting payroll for ALL labourIds for month=${month}, year=${year}`);

            const result = await pool.request()
                .input('month', sql.Int, month)
                .input('year', sql.Int, year)
                .query(`
            DELETE FROM [dbo].[FinalizedSalaryPay]
            WHERE month = @month
              AND year = @year
          `);

            return {
                success: true,
                rowsAffected: result.rowsAffected[0],
                message: `Deleted ${result.rowsAffected[0]} record(s) for month=${month}, year=${year}.`
            };
        }
    } catch (error) {
        console.error('❌ Error deleting monthly payroll data:', error);
        throw error;
    }
}


//   async function getFinalizedSalaryData(month, year) {
//     try {
//         const pool = await poolPromise;

//         let query = `
//             SELECT 
//                 fsp.*, 
//                 onboarding.id, 
//                 onboarding.LabourID AS LabourId, 
//                 onboarding.name, 
//                 onboarding.businessUnit, 
//                 onboarding.projectName, 
//                 onboarding.departmentName, 
//                 onboarding.department
//             FROM 
//                 [dbo].[FinalizedSalaryPay] AS fsp
//             INNER JOIN 
//                 [dbo].[labourOnboarding] AS onboarding
//             ON 
//                 fsp.LabourID = onboarding.LabourID
//             WHERE 
//                 fsp.month = @month 
//                 AND fsp.year = @year 
//                 AND onboarding.status = 'Approved'
//             ORDER BY 
//                 onboarding.LabourID;
//         `;

//         let request = pool.request()
//             .input('month', sql.Int, parseInt(month))
//             .input('year', sql.Int, parseInt(year));

//         const result = await request.query(query);

//         return result.recordset; // Return fetched data
//     } catch (error) {
//         console.error("Error fetching finalized salary data:", error);
//         throw error;
//     }
// }


// async function getFinalizedSalaryDataByLabourID({ labourId, month, year }) {
//     try {
//         const pool = await poolPromise;

//         let query = `
//             SELECT 
//                 fsp.*, 
//                 onboarding.id, 
//                 onboarding.LabourID AS LabourId, 
//                 onboarding.name, 
//                 onboarding.businessUnit, 
//                 onboarding.projectName, 
//                 onboarding.departmentName, 
//                 onboarding.department
//             FROM 
//                 [dbo].[FinalizedSalaryPay] AS fsp
//             INNER JOIN 
//                 [dbo].[labourOnboarding] AS onboarding
//             ON 
//                 fsp.LabourID = onboarding.LabourID
//             WHERE 
//                 onboarding.status = 'Approved'`;

//         let request = pool.request();

//         // Add optional filters
//         if (labourId) {
//             query += ` AND fsp.LabourID = @labourId`;
//             request.input('labourId', sql.NVarChar, labourId);
//         }
//         if (month) {
//             query += ` AND fsp.month = @month`;
//             request.input('month', sql.Int, parseInt(month));
//         }
//         if (year) {
//             query += ` AND fsp.year = @year`;
//             request.input('year', sql.Int, parseInt(year));
//         }

//         query += ` ORDER BY onboarding.LabourID;`;

//         const result = await request.query(query);

//         return result.recordset; // Return fetched data
//     } catch (error) {
//         console.error("Error fetching finalized salary data by LabourID:", error);
//         throw error;
//     }
// }

async function getFinalizedSalaryData(month, year) {
    try {
        const pool = await poolPromise;

        // Base query
        let query = `
            SELECT * FROM [dbo].[FinalizedSalaryPay] 
            WHERE 1=1`;  // Ensures conditions are properly appended

        let request = pool.request();

        // Apply filters for month and year
        if (month) {
            query += ` AND month = @month`;
            request.input('month', sql.Int, parseInt(month));
        }
        if (year) {
            query += ` AND year = @year`;
            request.input('year', sql.Int, parseInt(year));
        }

        // Sort by year (descending) and month (descending) to get latest records first
        query += ` ORDER BY LabourID;`;
        // query += ` ORDER BY year DESC, month DESC;`;

        const result = await request.query(query);

        return result.recordset; // Return fetched data
    } catch (error) {
        console.error("Error fetching finalized salary data:", error);
        throw error;
    }
}

async function getFinalizedSalaryDataByLabourID({ labourId, month, year }) {
    try {
        const pool = await poolPromise;

        let query = `
            SELECT * FROM [dbo].[FinalizedSalaryPay]
            WHERE 1=1`;

        let request = pool.request();

        if (labourId) {
            query += ` AND LabourID = @labourId`;
            request.input('labourId', sql.NVarChar, labourId);
        }
        if (month) {
            query += ` AND month = @month`;
            request.input('month', sql.Int, parseInt(month));
        }
        if (year) {
            query += ` AND year = @year`;
            request.input('year', sql.Int, parseInt(year));
        }

        query += ` ORDER BY year DESC, month DESC;`;

        const result = await request.query(query);

        return result.recordset;
    } catch (error) {
        console.error("Error fetching finalized salary data by LabourID:", error);
        throw error;
    }
}


async function saveFinalizeSalaryData(salaryData) {
    const pool = await poolPromise; // Ensure poolPromise is correctly initialized and points to your SQL pool.
    let transaction;

    try {
        transaction = new sql.Transaction(pool); // Assign the transaction to a variable declared outside try block
        await transaction.begin();

        const request = new sql.Request(transaction);
        const table = new sql.Table('FinalizedSalaryPay');

        // Define columns exactly as per your database schema
        table.columns.add('labourId', sql.Int);
        table.columns.add('month', sql.Int);
        table.columns.add('year', sql.Int);
        table.columns.add('wageType', sql.NVarChar(50));
        table.columns.add('dailyWageRate', sql.Decimal(18, 2));
        table.columns.add('fixedMonthlyWage', sql.Decimal(18, 2));
        table.columns.add('presentDays', sql.Int);
        table.columns.add('absentDays', sql.Int);
        table.columns.add('halfDays', sql.Int);
        table.columns.add('missPunchDays', sql.Int);
        table.columns.add('normalOvertimeCount', sql.Int);
        table.columns.add('holidayOvertimeCount', sql.Int);
        table.columns.add('cappedOvertime', sql.Decimal(18, 2));
        table.columns.add('basicSalary', sql.Decimal(18, 2));
        table.columns.add('previousWageAmount', sql.Decimal(18, 2));
        table.columns.add('overtimePay', sql.Decimal(18, 2));
        table.columns.add('weeklyOffPay', sql.Decimal(18, 2));
        table.columns.add('bonuses', sql.Decimal(18, 2));
        table.columns.add('totalDeductions', sql.Decimal(18, 2));
        table.columns.add('grossPay', sql.Decimal(18, 2));
        table.columns.add('netPay', sql.Decimal(18, 2));
        table.columns.add('advance', sql.Decimal(18, 2));
        table.columns.add('advanceRemarks', sql.NVarChar(255));
        table.columns.add('debit', sql.Decimal(18, 2));
        table.columns.add('debitRemarks', sql.NVarChar(255));
        table.columns.add('incentive', sql.Decimal(18, 2));
        table.columns.add('incentiveRemarks', sql.NVarChar(255));

        // Populate the table with rows
        salaryData.forEach(item => {
            table.rows.add(
                item.labourId, item.month, item.year, item.wageType, item.dailyWageRate, item.fixedMonthlyWage,
                item.presentDays, item.absentDays, item.halfDays, item.missPunchDays, item.normalOvertimeCount,
                item.holidayOvertimeCount, item.cappedOvertime, item.basicSalary, item.previousWageAmount,
                item.overtimePay, item.weeklyOffPay, item.bonuses, item.totalDeductions, item.grossPay,
                item.netPay, item.advance, item.advanceRemarks, item.debit, item.debitRemarks, item.incentive,
                item.incentiveRemarks
            );
        });

        await request.bulk(table); // Perform the bulk insert
        await transaction.commit(); // Commit transaction
        return { message: "Data saved successfully!" };
    } catch (error) {
        if (transaction) {
            await transaction.rollback(); // Rollback transaction if error
        }
        console.error("Error in saveFinalizeSalaryData:", error);
        throw error;
    }
}


async function getMonthlyPayrollData(month, year, projectName) {
    try {
        const pool = await poolPromise;
        let query = `
            SELECT 
                LabourID, name, businessUnit, projectName, departmentName, department,
                wageType, dailyWageRate, fixedMonthlyWage, presentDays, absentDays, halfDays, 
                basicSalary, overtimePay, weeklyOffPay, bonuses, totalDeductions, grossPay, netPay,
                advance, advanceRemarks, debit, debitRemarks, incentive, incentiveRemarks, month, year
            FROM [dbo].[FinalizedSalaryPay]
            WHERE month = @month AND year = @year`;

        let request = pool.request()
            .input('month', sql.Int, parseInt(month))
            .input('year', sql.Int, parseInt(year));

        if (projectName && projectName !== "all") {
            query += ` AND projectName = @projectName`;
            request.input('projectName', sql.NVarChar, projectName);
        }

        console.log(`Executing Query: ${query}`);
        const result = await request.query(query);

        return result.recordset; // Return fetched data
    } catch (error) {
        console.error("Error fetching finalized salary data for export:", error);
        throw error;
    }
}
async function getWagesByDateRange(projectName, payStructure, startDate, endDate) {
    const pool = await poolPromise;
    console.log('projectName',projectName+"payStructure",payStructure+"startDate",startDate+'endDate',endDate)
    const query = `
      DECLARE 
        @startDateParam DATE = @startDate,
        @endDateParam DATE = @endDate,
        @payStructureParam VARCHAR(50) = @payStructure,
        @projectNameParam VARCHAR(50) = @projectName;
  
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
        FROM [dbo].[labourOnboarding] AS onboarding
        LEFT JOIN [dbo].[LabourMonthlyWages] AS wages
          ON onboarding.LabourID = wages.LabourID
             AND wages.CreatedAt BETWEEN @startDateParam AND @endDateParam
             AND (@payStructureParam IS NULL OR wages.PayStructure = @payStructureParam)
        WHERE onboarding.status = 'Approved'
          AND (
               @projectNameParam = 'all'
               OR EXISTS (
                    SELECT 1
                    FROM STRING_SPLIT(@projectNameParam, ',') s
                    WHERE s.value = CAST(onboarding.projectName AS VARCHAR(50))
               )
          )
      )
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
      WHERE RowNum = 1
    `;
  
    const request = pool.request();
    request.input('projectName', sql.VarChar, projectName);
    request.input('payStructure', sql.VarChar, payStructure || null);
    request.input('startDate', sql.Date, startDate);
    request.input('endDate', sql.Date, endDate);
  
    // console.log("Executing SQL Query:", query);
    const result = await request.query(query);
    return result.recordset;
  }
  
  
  
  




module.exports = {
    getAllLabours,
    registerData,
    searchFromVariablePay,
    searchFromAttendanceApproval,
    searchFromWagesApproval,
    searchFromViewMonthlyPayrolls,
    searchFromSiteTransferApproval,
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
    calculateTotalOvertime,
    saveFinalizeSalaryData,
    deleteMonthlyPayrollData,
    getFinalizedSalaryData,
    getFinalizedSalaryDataByLabourID,
    getMonthlyPayrollData,
    getWagesByDateRange
}