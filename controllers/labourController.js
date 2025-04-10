const { sql, poolPromise2 } = require('../config/dbConfig2');
const { poolPromise3 } = require('../config/dbConfig3');
const { poolPromise } = require('../config/dbConfig');
const path = require('path');
const fs = require('fs');
const axios = require('axios')
const multer = require('multer');
const { upload } = require('../server');
const xml2js = require('xml2js');
const labourModel = require('../models/labourModel');        
const cron = require('node-cron');
const logger = require('../logger'); // Assuming logger is defined in logger.js   
const { createLogger, format, transports } = require('winston');
const { isHoliday } = require('../models/labourModel');    
const xlsx = require('xlsx');        
// const { sql, poolPromise2 } = require('../config/dbConfig');

// const baseUrl = 'http://localhost:4000/uploads/';
// const baseUrl = 'https://laboursandbox.vjerp.com/uploads/';
const baseUrl = 'https://vjlabour.vjerp.com/uploads/';



// async function handleCheckAadhaar(req, res) {
//     const { aadhaarNumber } = req.body;
//     //console.log('Request Body: AadhaarNumber:', aadhaarNumber);

//     try {
//         const labourRecords = await labourModel.checkAadhaarExists(aadhaarNumber);

//         if (labourRecords && labourRecords.length > 0) {
//             // Check if any record matches specific conditions
//             const resubmittedRecord = labourRecords.find(record => 
//                 (record.status === 'Resubmitted' && record.isApproved === 3) ||
//                 (record.status === 'Disable' && record.isApproved === 4)
//             );

//             if (resubmittedRecord) {
//                 //console.log("Returning skipCheck for Resubmitted or Disable with specific isApproved values");
//                 return res.status(200).json({ exists: false, skipCheck: true, LabourID: resubmittedRecord.LabourID });
//             }

//             // Extract all LabourIDs
//             const labourIDs = labourRecords.map(record => record.LabourID);

//             //console.log(`LabourIDs found: ${labourIDs}`);
//             return res.status(200).json({
//                 exists: true,
//                 LabourIDs: labourIDs // Return all LabourIDs as an array
//             });
//         } else {
//             //console.log("Returning exists false");
//             return res.status(200).json({ exists: false });
//         }
//     } catch (error) {
//         console.error('Error in handleCheckAadhaar:', error);
//         return res.status(500).json({ error: 'Error checking Aadhaar number' });
//     }
// }


async function handleCheckAadhaar(req, res) {
    const { aadhaarNumber } = req.body;

    try {
        const labourRecords = await labourModel.checkAadhaarExists(aadhaarNumber);

        if (labourRecords && labourRecords.length > 0) {
            const labourIDs = labourRecords.map(record => record.LabourID);

            // Check for skipCheck eligibility
            const resubmittedRecord = labourRecords.find(record =>
                (record.status === 'Resubmitted' && record.isApproved === 3) ||
                (record.status === 'Disable' && record.isApproved === 4)
            );

            return res.status(200).json({
                exists: true,
                LabourIDs: labourIDs,
                skipCheck: !!resubmittedRecord,
                LabourID: resubmittedRecord?.LabourID || null
            });
        } else {
            return res.status(200).json({ exists: false });
        }
    } catch (error) {
        console.error('Error in handleCheckAadhaar:', error);
        return res.status(500).json({ error: 'Error checking Aadhaar number' });
    }
}


// async function handleCheckAadhaar(req, res) {
//     const { aadhaarNumber } = req.body;
//     //console.log('Request Body: AaadharNumber Ch----------', req.body);

//     try {
//         const labourRecord = await labourModel.checkAadhaarExists(aadhaarNumber);

//         if (labourRecord) {
//             if (labourRecord.status === 'Resubmitted' && labourRecord.isApproved === 3) {
//                 //console.log("Returning skipCheck for Resubmitted and isApproved 3");
//                 return res.status(200).json({ exists: false, skipCheck: true });
//             } else {
//                 //console.log("Returning exists true");
//                 return res.status(200).json({ exists: true });
//             }
//         } else {
//             //console.log("Returning exists false");
//             return res.status(200).json({ exists: false });
//         }
//     } catch (error) {
//         console.error('Error in handleCheckAadhaar:', error);
//         return res.status(500).json({ error: 'Error checking Aadhaar number' });
//     };
// };



// async function handleCheckAadhaar(req, res) {
//     const { aadhaarNumber } = req.body;

//     try {
//         const labourRecord = await labourModel.checkAadhaarExists(aadhaarNumber);

//         if (labourRecord) {
//             if (labourRecord.status === 'Resubmitted' && labourRecord.isApproved === 3) {
//                 // const formData = await labourModel.getFormDataByAadhaar(aadhaarNumber);
//                 return res.status(200).json({ exists: true, formData: labourRecord });
//             } else {
//                 return res.status(200).json({ exists: true });
//             }
//         } else {
//             return res.status(200).json({ exists: false });
//         }
//     } catch (error) {
//         console.error('Error in handleCheckAadhaar:', error);
//         return res.status(500).json({ error: 'Error checking Aadhaar number' });
//     }
// }

async function getNextUniqueID(req, res) {
    try {
        const departmentId = parseInt(req.query.departmentId, 10);
console.log("departmentId --->",departmentId)
        if (isNaN(departmentId)) {
            return res.status(400).json({ message: 'Invalid or missing departmentId' });
        }

        const nextID = await labourModel.getNextUniqueID(departmentId);
        res.json({ nextID });
    } catch (error) {
        console.error('Error in getNextUniqueID:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// async function getNextUniqueID(req, res) {
//     try {
//         const nextID = await labourModel.getNextUniqueID();
//         res.json({ nextID });
//     } catch (error) {
//         console.error('Error in getNextUniqueID:', error.message);
//         res.status(500).json({ message: 'Internal server error' });
//     };
// };


async function getCommandStatus(req, res) {
    const commandId = req.params.commandId;

    try {
        const pool = await poolPromise3;
        const result = await pool.request()
            .input('CommandId', sql.Int, commandId)
            .query('SELECT status FROM DeviceCommands WHERE DeviceCommandId = @CommandId');

        if (result.recordset.length > 0) {
            const status = result.recordset[0].status;
            return res.json({ status });
        } else {
            return res.status(404).json({ message: 'Command ID not found.' });
        }
    } catch (error) {
        console.error('Error fetching command status:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// This is running code comment in 29-07-2024

async function createRecord(req, res) {
    try {
        const {
            labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate, departmentId, designationId, labourCategoryId } = req.body;

            const finalOnboardName = Array.isArray(OnboardName) ? OnboardName[0] : OnboardName;

        const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof, uploadInductionDoc } = req.files;
        //console.log('Received IDs:', { departmentId, designationId, labourCategoryId });
        // Validate file fields
        if (!photoSrc || !uploadIdProof) {
            return res.status(400).json({ msg: 'All file fields are required' });
        }

        // const frontImageFilename = path.basename(uploadAadhaarFront[0].path);
        const frontImageFilename = uploadAadhaarFront ? path.basename(uploadAadhaarFront[0].path) : null;
        // const backImageFilename = path.basename(uploadAadhaarBack[0].path);
        const backImageFilename = uploadAadhaarBack ? path.basename(uploadAadhaarBack[0].path) : null;
        const IdProofImageFilename = path.basename(uploadIdProof[0].path);
        const uploadInductionDocFilename = path.basename(uploadInductionDoc[0].path);
        const photoSrcFilename = path.basename(photoSrc[0].path);

        // const frontImageUrl = baseUrl + frontImageFilename;
        const frontImageUrl = frontImageFilename ? baseUrl + frontImageFilename : null;
        // const backImageUrl = baseUrl + backImageFilename;
        const backImageUrl = backImageFilename ? baseUrl + backImageFilename : null;
        const IdProofImageUrl = baseUrl + IdProofImageFilename;
        const uploadInductionDocImageUrl = baseUrl + uploadInductionDocFilename;
        const photoSrcUrl = baseUrl + photoSrcFilename;

        const dateOfJoiningDate = new Date(dateOfJoining);
        const fromDate = dateOfJoiningDate;
        const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '-');

        const validTillDate = new Date(dateOfJoiningDate);
        validTillDate.setFullYear(validTillDate.getFullYear() + 1);

        const retirementDate = new Date(dateOfBirth);
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);

        // **********************************  NEW  ********************
        const pool = await poolPromise2;
        const projectRequest = pool.request();

        const isNumeric = !isNaN(projectName);
        projectRequest.input('projectName', isNumeric ? sql.Int : sql.VarChar, projectName);

        let query;
        if (isNumeric) {
            query = `
        SELECT a.id, a.Description 
        FROM Framework.BusinessUnit a
        LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
        WHERE a.id = @projectName
        AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
        AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
        AND b.Id = 3
    `;
        } else {
            query = `
        SELECT a.id, a.Description 
        FROM Framework.BusinessUnit a
        LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
        WHERE a.Description = @projectName
        AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
        AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
        AND b.Id = 3
    `;
        }

        //console.log(`Querying for projectName: ${projectName}`); // Debug log

        const projectResult = await projectRequest.query(query);

        if (projectResult.recordset.length === 0) {
            // //console.log('Invalid project name:', projectName); 
            return res.status(400).json({ msg: 'Invalid project name' });
        }

        const location = projectResult.recordset[0].Description; // Store the Business_Unit name in location
        const businessUnit = projectResult.recordset[0].Description;
        //console.log(`Found project Description: ${location}, BusinessUnit: ${businessUnit}`);

        // **********************************  NEW  ********************

        let salaryBu;
        const projectId = projectResult.recordset[0].id;
        const parentIdResult = await pool.request().query(`
    SELECT ParentId 
    FROM Framework.BusinessUnit 
    WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
    AND (IsDeleted = 0 OR IsDeleted IS NULL) 
    AND Id = ${projectId}
`);

        if (parentIdResult.recordset.length === 0) {
            return res.status(404).send('ParentId not found for the selected project');
        }

        const parentId = parentIdResult.recordset[0].ParentId;

        const companyNameResult = await pool.request().query(`
    SELECT Id, Description AS Company_Name 
    FROM Framework.BusinessUnit 
    WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
    AND (IsDeleted = 0 OR IsDeleted IS NULL) 
    AND Id = ${parentId}
`);

        const companyNameFromDb = companyNameResult.recordset[0].Company_Name;

        if (companyNameFromDb === 'SANKALP CONTRACTS PRIVATE LIMITED') {
            salaryBu = `${companyNameFromDb} - HO`;
        } else {
            salaryBu = location;
        }


        // Fetch department description
        const departmentRequest = pool.request();
        departmentRequest.input('departmentId', sql.Int, departmentId);
        const departmentQuery = `
     SELECT a.Description AS Department_Name
     FROM Payroll.Department a
     WHERE a.Id = @departmentId
 `;
        const departmentResult = await departmentRequest.query(departmentQuery);

        if (departmentResult.recordset.length === 0) {
            return res.status(404).send('Department not found');
        }

        const departmentName = departmentResult.recordset[0].Department_Name;

        const creationDate = new Date();
        //console.log('Received OnboardName:', finalOnboardName);
        const data = await labourModel.registerData({
            labourOwnership, uploadAadhaarFront: frontImageUrl, uploadAadhaarBack: backImageUrl, uploadIdProof: IdProofImageUrl, uploadInductionDoc: uploadInductionDocImageUrl, name, aadhaarNumber,
            dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date: dateOfJoining, ConfirmDate: dateOfJoining, From_Date: fromDate.toISOString().split('T')[0], Period: period, address, pincode, taluka,
            district, village, state, emergencyContact, photoSrc: photoSrcUrl, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours, location, SalaryBu: salaryBu, businessUnit,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName: finalOnboardName, expiryDate, ValidTill: validTillDate.toISOString().split('T')[0],
            retirementDate: retirementDate.toISOString().split('T')[0], WorkingBu: location, CreationDate: creationDate.toISOString(), departmentId, departmentName, designationId, labourCategoryId
        });
        //console.log('Inserted OnboardName:', finalOnboardName);
        return res.status(201).json({ msg: "User created successfully", data: data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Internal server error' });
    }
}


async function getAllRecords(req, res) {
    try {
        const records = await labourModel.getAll();
        return res.status(200).json(records);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getRecordById(req, res) {
    //console.log("getRecordById")
    try {
        const { id } = req.params;
        const record = await labourModel.getById(id);
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        return res.json(record);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}




async function createRecordUpdate(req, res) {
    try {
        //console.log('Request Body: check----------', req.body);
        //console.log('Request Files:', req.files); 

        const {
            labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate, departmentId, designationId
        } = req.body;

        let finalOnboardName = Array.isArray(OnboardName) 
        ? OnboardName.filter(name => name && name.trim() !== '').pop() 
        : OnboardName;

        if (!finalOnboardName || finalOnboardName.trim() === '') {
            console.error('OnboardName is missing or empty.');
            return res.status(400).json({ msg: 'OnboardName is required.' });
        }
finalOnboardName = finalOnboardName.toUpperCase();
        
        if (!finalOnboardName || finalOnboardName.trim() === '') {
            console.error('OnboardName is missing or empty.');
            return res.status(400).json({ msg: 'OnboardName is required.' });
        }

        //console.log('Cleaned OnboardName Resubmitted button:', finalOnboardName);


        const labourCategoryMap = {
            'SKILLED': 1,
            'UN-SKILLED': 2,
            'SEMI-SKILLED': 3
        };

        const safeLabourCategoryId = String(labourCategoryMap[labourCategory]) || null;

        if (safeLabourCategoryId === null) {
            //console.log('Invalid labourCategory:', labourCategory);
            return res.status(400).json({ msg: 'Invalid labourCategory provided' });
        }

        const safeConvertToInt = (value) => {
            if (value === 'null' || value === '' || value === undefined) return null;
            const parsedValue = parseInt(value, 10);
            return isNaN(parsedValue) ? null : parsedValue;
        };

        const safeDepartmentId = String(departmentId);
        const safeDesignationId = String(designationId);
        const safeProjectName = isNaN(projectName) ? projectName : String(projectName); 

        //console.log('Converted Values:', {
        //     safeProjectName,
        //     safeDepartmentId,
        //     safeDesignationId,
        //     safeLabourCategoryId
        // });

        if (safeProjectName === null || safeDepartmentId === null || safeDesignationId === null) {
            return res.status(400).json({ msg: 'Missing required fields: projectName, departmentId, or designationId' });
        }

        const {
            uploadAadhaarFront = null,
            uploadAadhaarBack = null,
            photoSrc = null,
            uploadIdProof = null,
            uploadInductionDoc = null
        } = req.files || {};  // Use {} as fallback if req.files is undefined

        const processFileField = (bodyField, fileField) => {
            if (fileField) {
                // Binary data uploaded, get URL path
                return baseUrl + path.basename(fileField[0].path);
            } else if (typeof bodyField === 'string' && bodyField.startsWith('http')) {
                // If no new file, use the existing URL
                return bodyField;
            }
            return null; // No data available
        };

        const frontImageUrl = processFileField(req.body.uploadAadhaarFront, uploadAadhaarFront);
        const backImageUrl = processFileField(req.body.uploadAadhaarBack, uploadAadhaarBack);
        const photoSrcUrl = processFileField(req.body.photoSrc, photoSrc);
        const IdProofImageUrl = processFileField(req.body.uploadIdProof, uploadIdProof);
        const uploadInductionDocImageUrl = processFileField(req.body.uploadInductionDoc, uploadInductionDoc);


        const dateOfJoiningDate = new Date(dateOfJoining);
        const fromDate = dateOfJoiningDate;
        const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '-');
        const validTillDate = new Date(dateOfJoiningDate);
        validTillDate.setFullYear(validTillDate.getFullYear() + 1);
        const retirementDate = new Date(dateOfBirth);
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);

        const pool = await poolPromise2;
        const projectRequest = pool.request();

        projectRequest.input('projectName', isNaN(safeProjectName) ? sql.VarChar : sql.Int, safeProjectName);

        let query;
        if (!isNaN(safeProjectName)) {
            query = `
                SELECT a.id, a.Description 
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.id = @projectName
                AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
                AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
                AND b.Id = 3
            `;
        } else {
            query = `
                SELECT a.id, a.Description 
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.Description = @projectName
                AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
                AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
                AND b.Id = 3
            `;
        }

        //console.log(`Querying for projectName: ${safeProjectName}`); // Debug log

        const projectResult = await projectRequest.query(query);

        if (projectResult.recordset.length === 0) {
            //console.log('Invalid project name:', safeProjectName); // Debug log
            return res.status(400).json({ msg: 'Invalid project name-------' });
        }

        const location = projectResult.recordset[0].Description; // Store the Business_Unit name in location
        const businessUnit = projectResult.recordset[0].Description;
        //console.log(`Found project Description: ${location}, BusinessUnit: ${businessUnit}`);

        let salaryBu;
        const projectId = projectResult.recordset[0].id;
        const parentIdResult = await pool.request().query(`
            SELECT ParentId 
            FROM Framework.BusinessUnit 
            WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
            AND (IsDeleted = 0 OR IsDeleted IS NULL) 
            AND Id = ${projectId}
        `);

        if (parentIdResult.recordset.length === 0) {
            return res.status(404).send('ParentId not found for the selected project');
        }

        const parentId = parentIdResult.recordset[0].ParentId;

        const companyNameResult = await pool.request().query(`
            SELECT Id, Description AS Company_Name 
            FROM Framework.BusinessUnit 
            WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
            AND (IsDeleted = 0 OR IsDeleted IS NULL) 
            AND Id = ${parentId}
        `);

        const companyNameFromDb = companyNameResult.recordset[0].Company_Name;

        if (companyNameFromDb === 'SANKALP CONTRACTS PRIVATE LIMITED') {
            salaryBu = `${companyNameFromDb} - HO`;
        } else {
            salaryBu = location;
        }

        // Fetch department description
        const departmentRequest = pool.request();

        // Validate and log departmentId before setting SQL input
        //console.log('Setting SQL input for departmentId:', safeDepartmentId);
        if (safeDepartmentId !== null) {
            departmentRequest.input('departmentId', safeDepartmentId);
            //console.log("departmentId", departmentId)
        } else {
            //console.log('Invalid departmentId provided:', departmentId);
            return res.status(400).send('Invalid departmentId');
        }

        const departmentQuery = `
            SELECT a.Description AS Department_Name
            FROM Payroll.Department a
            WHERE a.Id = @departmentId
        `;
        const departmentResult = await departmentRequest.query(departmentQuery);

        if (departmentResult.recordset.length === 0) {
            //console.log('Department not found for departmentId:', safeDepartmentId);
            return res.status(404).send('Department not found');
        }

        const departmentName = departmentResult.recordset[0].Department_Name;

        const creationDate = new Date();


        //console.log('Received OnboardName Resubmmit button functionlity:', finalOnboardName);

        const data = await labourModel.registerDataUpdate({
            labourOwnership,
            uploadAadhaarFront: frontImageUrl,
            uploadAadhaarBack: backImageUrl,
            uploadIdProof: IdProofImageUrl,
            uploadInductionDoc: uploadInductionDocImageUrl,
            name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            Group_Join_Date: dateOfJoining, ConfirmDate: dateOfJoining,
            From_Date: fromDate.toISOString().split('T')[0], Period: period, address,
            pincode, taluka, district, village, state, emergencyContact,
            photoSrc: photoSrcUrl, bankName, branch, accountNumber, ifscCode, projectName,
            labourCategory, department, workingHours, location, SalaryBu: salaryBu, businessUnit,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName,
            Induction_Date, Inducted_By, OnboardName: finalOnboardName, expiryDate,
            ValidTill: validTillDate.toISOString().split('T')[0],
            retirementDate: retirementDate.toISOString().split('T')[0], WorkingBu: location,
            CreationDate: creationDate.toISOString(), departmentId: safeDepartmentId, departmentName, designationId: safeDesignationId,
            labourCategoryId: safeLabourCategoryId
        });


        //console.log('dataupdate', data)

        return res.status(201).json({ msg: "User created successfully", data: data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Internal server error' });
    }
}







async function updateRecord(req, res) {
    try {
        // Log the full request body and files for debugging
        //console.log('Request Body:', req.body);
        //console.log('Request Files:', req.files); // Logs undefined when no files are uploaded

        // Extract fields from request body
        const {
           id, LabourID, labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate, departmentId, designationId
        } = req.body;

        //console.log('LabourID from request body:', LabourID);
        let finalOnboardName = Array.isArray(OnboardName) 
        ? OnboardName.filter(name => name && name.trim() !== '').pop() 
        : OnboardName;

        if (!finalOnboardName || finalOnboardName.trim() === '') {
            console.error('OnboardName is missing or empty.');
            return res.status(400).json({ msg: 'OnboardName is required.' });
        }
finalOnboardName = finalOnboardName.toUpperCase();

        //console.log('Cleaned OnboardName:', finalOnboardName);
        // Check if LabourID exists
        if (!LabourID) {
            console.error('LabourID is missing from request body.');
            return res.status(400).json({ msg: 'LabourID is required.' });
        }

        // Mapping for labourCategory to labourCategoryId
        const labourCategoryMap = {
            'SKILLED': 1,
            'UN-SKILLED': 2,
            'SEMI-SKILLED': 3
        };

        // Set safeLabourCategoryId using the mapping
        const safeLabourCategoryId = labourCategoryMap[labourCategory] !== undefined ? labourCategoryMap[labourCategory] : null;

        // If labourCategoryId is null, handle the error or assign a default value
        if (safeLabourCategoryId === null) {
            //console.log('Invalid labourCategory:', labourCategory);
            return res.status(400).json({ msg: 'Invalid labourCategory provided' });
        }

        // Convert fields to appropriate formats
        const safeDepartmentId = departmentId ? String(departmentId) : null;
        const safeDesignationId = designationId ? String(designationId) : null;
        const safeProjectName = projectName && !isNaN(projectName) ? String(projectName) : projectName;

        if (!safeProjectName || !safeDepartmentId || !safeDesignationId) {
            return res.status(400).json({ msg: 'Missing required fields: projectName, departmentId, or designationId' });
        }

        const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof, uploadInductionDoc } = req.files || {};

        const processFileField = (bodyField, fileField) => {
            if (fileField) {
                // Binary data uploaded, get URL path
                return baseUrl + path.basename(fileField[0].path);
            } else if (typeof bodyField === 'string' && bodyField.startsWith('http')) {
                // If no new file, use the existing URL
                return bodyField;
            }
            return null; // No data available
        };

        const frontImageUrl = processFileField(req.body.uploadAadhaarFront, uploadAadhaarFront);
        const backImageUrl = processFileField(req.body.uploadAadhaarBack, uploadAadhaarBack);
        const photoSrcUrl = processFileField(req.body.photoSrc, photoSrc);
        const IdProofImageUrl = processFileField(req.body.uploadIdProof, uploadIdProof);
        const uploadInductionDocImageUrl = processFileField(req.body.uploadInductionDoc, uploadInductionDoc);

        const dateOfJoiningDate = new Date(dateOfJoining);
        const fromDate = dateOfJoiningDate;
        const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '-');
        const validTillDate = new Date(dateOfJoiningDate);
        validTillDate.setFullYear(validTillDate.getFullYear() + 1);
        const retirementDate = new Date(dateOfBirth);
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);

        const pool = await poolPromise2;
        const projectRequest = pool.request();
        projectRequest.input('projectName', isNaN(safeProjectName) ? sql.VarChar : sql.Int, safeProjectName);

        let query;
        if (!isNaN(safeProjectName)) {
            query = `
                SELECT a.id, a.Description 
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.id = @projectName
                AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
                AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
                AND b.Id = 3
            `;
        } else {
            query = `
                SELECT a.id, a.Description 
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.Description = @projectName
                AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
                AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
                AND b.Id = 3
            `;
        }

        //console.log(`Querying for projectName: ${safeProjectName}`);

        const projectResult = await projectRequest.query(query);

        if (projectResult.recordset.length === 0) {
            //console.log('Invalid project name:', safeProjectName);
            return res.status(400).json({ msg: 'Invalid project name' });
        }

        const location = projectResult.recordset[0].Description;
        const businessUnit = projectResult.recordset[0].Description;
        //console.log(`Found project Description: ${location}, BusinessUnit: ${businessUnit}`);

        let salaryBu;
        const projectId = projectResult.recordset[0].id;
        const parentIdResult = await pool.request().query(`
            SELECT ParentId 
            FROM Framework.BusinessUnit 
            WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
            AND (IsDeleted = 0 OR IsDeleted IS NULL) 
            AND Id = ${projectId}
        `);

        if (parentIdResult.recordset.length === 0) {
            return res.status(404).send('ParentId not found for the selected project');
        }

        const parentId = parentIdResult.recordset[0].ParentId;

        const companyNameResult = await pool.request().query(`
            SELECT Id, Description AS Company_Name 
            FROM Framework.BusinessUnit 
            WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
            AND (IsDeleted = 0 OR IsDeleted IS NULL) 
            AND Id = ${parentId}
        `);

        const companyNameFromDb = companyNameResult.recordset[0].Company_Name;

        salaryBu = companyNameFromDb === 'SANKALP CONTRACTS PRIVATE LIMITED' ? `${companyNameFromDb} - HO` : location;

        const departmentRequest = pool.request();
        departmentRequest.input('departmentId', safeDepartmentId);

        const departmentQuery = `
            SELECT a.Description AS Department_Name
            FROM Payroll.Department a
            WHERE a.Id = @departmentId
        `;
        const departmentResult = await departmentRequest.query(departmentQuery);

        if (departmentResult.recordset.length === 0) {
            //console.log('Department not found for departmentId:', safeDepartmentId);
            return res.status(404).send('Department not found');
        }

        const departmentName = departmentResult.recordset[0].Department_Name;

        const creationDate = new Date();
        //console.log('Received OnboardName Edit button functionlity:', finalOnboardName);
        // Prepare data for update
        const data = await labourModel.updateData({
            id,
            LabourID,
            labourOwnership,
            uploadAadhaarFront: frontImageUrl,
            uploadAadhaarBack: backImageUrl,
            uploadIdProof: IdProofImageUrl,
            uploadInductionDoc: uploadInductionDocImageUrl,
            name,
            aadhaarNumber,
            dateOfBirth,
            contactNumber,
            gender,
            dateOfJoining,
            Group_Join_Date: dateOfJoining,
            ConfirmDate: dateOfJoining,
            From_Date: fromDate.toISOString().split('T')[0],
            Period: period,
            address,
            pincode,
            taluka,
            district,
            village,
            state,
            emergencyContact,
            photoSrc: photoSrcUrl,
            bankName,
            branch,
            accountNumber,
            ifscCode,
            projectName,
            labourCategory,
            department,
            workingHours,
            location,
            SalaryBu: salaryBu,
            businessUnit,
            contractorName,
            contractorNumber,
            designation,
            title,
            Marital_Status,
            companyName,
            Induction_Date,
            Inducted_By,
            OnboardName: finalOnboardName,
            expiryDate,
            ValidTill: validTillDate.toISOString().split('T')[0],
            retirementDate: retirementDate.toISOString().split('T')[0],
            WorkingBu: location,
            CreationDate: creationDate.toISOString(),
            departmentId: safeDepartmentId,
            departmentName,
            designationId: safeDesignationId,
            labourCategoryId: safeLabourCategoryId
        });

        //console.log("Data after update:", data);

        if (!data) {
            return res.status(404).json({ msg: 'No data updated' });
        }
        //console.log('Inserted OnboardName Edit button functionlity:', finalOnboardName);
        return res.status(200).json({ msg: "User updated successfully", data: data });
    } catch (err) {
        console.error('Error updating record:', err.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
}




async function updateRecordWithDisable(req, res) {
    try {
        //console.log('Request Body: check----------', req.body);
        //console.log('Request Files:', req.files); 

        const {
            LabourID, labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate, departmentId, designationId
        } = req.body;

        let finalOnboardName = Array.isArray(OnboardName) 
        ? OnboardName.filter(name => name && name.trim() !== '').pop() 
        : OnboardName;

        if (!finalOnboardName || finalOnboardName.trim() === '') {
            console.error('OnboardName is missing or empty.');
            return res.status(400).json({ msg: 'OnboardName is required.' });
        }
finalOnboardName = finalOnboardName.toUpperCase();
        //console.log('Cleaned OnboardName Resubmitted button:', finalOnboardName);
        if (!LabourID ) {
            console.error('LabourID is missing from request body.');
            return res.status(400).json({ msg: 'LabourID is required.' });
        }

        const labourCategoryMap = {
            'SKILLED': 1,
            'UN-SKILLED': 2,
            'SEMI-SKILLED': 3
        };

        const safeLabourCategoryId = String(labourCategoryMap[labourCategory]) || null;

        if (safeLabourCategoryId === null) {
            //console.log('Invalid labourCategory:', labourCategory);
            return res.status(400).json({ msg: 'Invalid labourCategory provided' });
        }

        const safeConvertToInt = (value) => {
            if (value === 'null' || value === '' || value === undefined) return null;
            const parsedValue = parseInt(value, 10);
            return isNaN(parsedValue) ? null : parsedValue;
        };

        const safeDepartmentId = String(departmentId);
        const safeDesignationId = String(designationId);
        const safeProjectName = isNaN(projectName) ? projectName : String(projectName); 

        // console.log('Converted Values:', {
        //     safeProjectName,
        //     safeDepartmentId,
        //     safeDesignationId,
        //     safeLabourCategoryId
        // });

        if (safeProjectName === null || safeDepartmentId === null || safeDesignationId === null) {
            return res.status(400).json({ msg: 'Missing required fields: projectName, departmentId, or designationId' });
        }

        const {
            uploadAadhaarFront = null,
            uploadAadhaarBack = null,
            photoSrc = null,
            uploadIdProof = null,
            uploadInductionDoc = null
        } = req.files || {};  // Use {} as fallback if req.files is undefined

        const processFileField = (bodyField, fileField) => {
            if (fileField) {
                // Binary data uploaded, get URL path
                return baseUrl + path.basename(fileField[0].path);
            } else if (typeof bodyField === 'string' && bodyField.startsWith('http')) {
                // If no new file, use the existing URL
                return bodyField;
            }
            return null; // No data available
        };
        

        const frontImageUrl = processFileField(req.body.uploadAadhaarFront, uploadAadhaarFront);
        const backImageUrl = processFileField(req.body.uploadAadhaarBack, uploadAadhaarBack);
        const photoSrcUrl = processFileField(req.body.photoSrc, photoSrc);
        const IdProofImageUrl = processFileField(req.body.uploadIdProof, uploadIdProof);
        const uploadInductionDocImageUrl = processFileField(req.body.uploadInductionDoc, uploadInductionDoc);


        const dateOfJoiningDate = new Date(dateOfJoining);
        const fromDate = dateOfJoiningDate;
        const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '-');
        const validTillDate = new Date(dateOfJoiningDate);
        validTillDate.setFullYear(validTillDate.getFullYear() + 1);
        const retirementDate = new Date(dateOfBirth);
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);

        const pool = await poolPromise2;
        const projectRequest = pool.request();

        projectRequest.input('projectName', isNaN(safeProjectName) ? sql.VarChar : sql.Int, safeProjectName);

        let query;
        if (!isNaN(safeProjectName)) {
            query = `
                SELECT a.id, a.Description 
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.id = @projectName
                AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
                AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
                AND b.Id = 3
            `;
        } else {
            query = `
                SELECT a.id, a.Description 
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.Description = @projectName
                AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
                AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
                AND b.Id = 3
            `;
        }

        //console.log(`Querying for projectName: ${safeProjectName}`); // Debug log

        const projectResult = await projectRequest.query(query);

        if (projectResult.recordset.length === 0) {
            //console.log('Invalid project name:', safeProjectName); // Debug log
            return res.status(400).json({ msg: 'Invalid project name-------' });
        }

        const location = projectResult.recordset[0].Description; // Store the Business_Unit name in location
        const businessUnit = projectResult.recordset[0].Description;
        //console.log(`Found project Description: ${location}, BusinessUnit: ${businessUnit}`);

        let salaryBu;
        const projectId = projectResult.recordset[0].id;
        const parentIdResult = await pool.request().query(`
            SELECT ParentId 
            FROM Framework.BusinessUnit 
            WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
            AND (IsDeleted = 0 OR IsDeleted IS NULL) 
            AND Id = ${projectId}
        `);

        if (parentIdResult.recordset.length === 0) {
            return res.status(404).send('ParentId not found for the selected project');
        }

        const parentId = parentIdResult.recordset[0].ParentId;

        const companyNameResult = await pool.request().query(`
            SELECT Id, Description AS Company_Name 
            FROM Framework.BusinessUnit 
            WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
            AND (IsDeleted = 0 OR IsDeleted IS NULL) 
            AND Id = ${parentId}
        `);

        const companyNameFromDb = companyNameResult.recordset[0].Company_Name;

        if (companyNameFromDb === 'SANKALP CONTRACTS PRIVATE LIMITED') {
            salaryBu = `${companyNameFromDb} - HO`;
        } else {
            salaryBu = location;
        }

        // Fetch department description
        const departmentRequest = pool.request();

        // Validate and log departmentId before setting SQL input
        //console.log('Setting SQL input for departmentId:', safeDepartmentId);
        if (safeDepartmentId !== null) {
            departmentRequest.input('departmentId', safeDepartmentId);
            //console.log("departmentId", departmentId)
        } else {
            //console.log('Invalid departmentId provided:', departmentId);
            return res.status(400).send('Invalid departmentId');
        }

        const departmentQuery = `
            SELECT a.Description AS Department_Name
            FROM Payroll.Department a
            WHERE a.Id = @departmentId
        `;
        const departmentResult = await departmentRequest.query(departmentQuery);

        if (departmentResult.recordset.length === 0) {
            //console.log('Department not found for departmentId:', safeDepartmentId);
            return res.status(404).send('Department not found');
        }

        const departmentName = departmentResult.recordset[0].Department_Name;

        const creationDate = new Date();


        //console.log('Received OnboardName Resubmmit button functionlity:', finalOnboardName);

        const data = await labourModel.registerDataUpdateDisable({
            LabourID, labourOwnership,
            uploadAadhaarFront: frontImageUrl,
            uploadAadhaarBack: backImageUrl,
            uploadIdProof: IdProofImageUrl,
            uploadInductionDoc: uploadInductionDocImageUrl,
            name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            Group_Join_Date: dateOfJoining, ConfirmDate: dateOfJoining,
            From_Date: fromDate.toISOString().split('T')[0], Period: period, address,
            pincode, taluka, district, village, state, emergencyContact,
            photoSrc: photoSrcUrl, bankName, branch, accountNumber, ifscCode, projectName,
            labourCategory, department, workingHours, location, SalaryBu: salaryBu, businessUnit,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName,
            Induction_Date, Inducted_By, OnboardName: finalOnboardName, expiryDate,
            ValidTill: validTillDate.toISOString().split('T')[0],
            retirementDate: retirementDate.toISOString().split('T')[0], WorkingBu: location,
            CreationDate: creationDate.toISOString(), departmentId: safeDepartmentId, departmentName, designationId: safeDesignationId,
            labourCategoryId: safeLabourCategoryId
        });


        //console.log('dataupdate', data)

        return res.status(201).json({ msg: "User created successfully", data: data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Internal server error' });
    };

};


// Define multer storage configuration
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const uploadDir = path.join(__dirname, 'uploads');
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir);
//         }
//         cb(null, uploadDir);
//     },
//     filename: (req, file, cb) => {
//         cb(null, `${Date.now()}-${file.originalname}`);
//     }
// });

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 100 * 1024 * 1024 } // 100MB file size limit
// }).fields([
//     { name: 'uploadAadhaarFront', maxCount: 1 },
//     { name: 'uploadAadhaarBack', maxCount: 1 },
//     { name: 'uploadIdProof', maxCount: 1 },
//     { name: 'uploadInductionDoc', maxCount: 1 },
//     { name: 'photoSrc', maxCount: 1 }
// ]);

// const baseUrl = 'http://localhost:4000/uploads/';

// Update Record Function
// async function updateRecord(req, res) {
//     try {
//         const { id } = req.params;  // Get ID from request parameters
//         //console.log('Incoming request body:', req.body);  
//         const updatedData = { ...req.body };  // Get data from request body

//         if (!id) {
//             return res.status(400).json({ error: 'ID is required' });  // Check if ID is provided
//         }

//         // Add file paths to updatedData if they are provided
//         if (req.files) {
//             if (req.files.uploadAadhaarFront) {
//                 const frontImageFilename = path.basename(req.files.uploadAadhaarFront[0].path);
//                 updatedData.uploadAadhaarFront = baseUrl + frontImageFilename;
//             }
//             if (req.files.uploadAadhaarBack) {
//                 const backImageFilename = path.basename(req.files.uploadAadhaarBack[0].path);
//                 updatedData.uploadAadhaarBack = baseUrl + backImageFilename;
//             }
//             if (req.files.uploadIdProof) {
//                 const IdProofImageFilename = path.basename(req.files.uploadIdProof[0].path);
//                 updatedData.uploadIdProof = baseUrl + IdProofImageFilename;
//             }
//             if (req.files.uploadInductionDoc) {
//                 const uploadInductionDocFilename = path.basename(req.files.uploadInductionDoc[0].path);
//                 updatedData.uploadInductionDoc = baseUrl + uploadInductionDocFilename;
//             }
//             if (req.files.photoSrc) {
//                 const photoSrcFilename = path.basename(req.files.photoSrc[0].path);
//                 updatedData.photoSrc = baseUrl + photoSrcFilename;
//             }
//         }
//         if (Object.keys(updatedData).length === 0) {
//             return res.status(400).json({ error: 'No data provided to update.' });
//         }
//         //console.log('Updating record with ID:', id);
//         //console.log('Updated data:', updatedData);

//         const updated = await labourModel.update(id, updatedData);  // Call the model function to update the record
//         if (updated === 0) {
//             return res.status(404).json({ error: 'Record not found' });  // Return if no record was found to update
//         }

//         return res.json({ message: 'Record updated successfully' });  // Success response
//     } catch (error) {
//         console.error('Error updating record:', error);
//         return res.status(500).json({ error: 'Internal server error' });  // Catch and handle errors
//     }
// }


async function updateRecordLabour(req, res) {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        if (!id) {
            return res.status(400).json({ error: 'ID is required' });
        }

        // if (!updatedData || typeof updatedData !== 'object' || Object.keys(updatedData).length === 0) {
        //     return res.status(400).json({ error: 'Updated data is required and should not be empty' });
        // }
        // //console.log('Updating record with ID:', id);
        // //console.log('Updated data:', updatedData);

        const updated = await labourModel.updateLabour(id, updatedData);
        if (updated === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        return res.json({ message: 'Record updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}



async function deleteRecord(req, res) {
    try {
        const { id } = req.params;
        const rowsAffected = await labourModel.deleteById(id);
        if (rowsAffected === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        return res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


async function searchLabours(req, res) {
    const { q } = req.query;

    try {
        const results = await labourModel.search(q);
        return res.json(results);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}



async function getAllLabours(req, res) {
    try {
        const labours = await labourModel.getAllLabours();
        res.json(labours);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function approveLabour(req, res) {
    const id = parseInt(req.params.id, 10);
    console.log(`Received id: ${req.params.id}, Parsed id: ${id}`);

    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid labour ID' });
    }

    try {
        const pool = await poolPromise;

        // Step 1: Get departmentId for the labour entry
        const depResult = await pool.request().query(`
            SELECT departmentId FROM labourOnboarding WHERE id = ${id}
        `);

        if (!depResult.recordset.length) {
            return res.status(404).json({ message: 'Labour not found' });
        }

        const departmentId = depResult.recordset[0].departmentId;

        // Step 2: Generate ID based on department
        const nextID = await labourModel.getNextUniqueID(departmentId);

         console.log('Approving labour ID:', id);
       console.log('Generated nextID:', nextID);

        // Step 3: Approve the labour
        const success = await labourModel.approveLabour(id, nextID);
        if (success) {
            res.json({ success: true, message: 'Labour approved successfully.', data: success });
        } else {
            res.status(404).json({ message: 'Labour not found or already approved.' });
        }
    } catch (error) {
        console.error('Error in approveLabour:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}


// async function approveLabour(req, res) {
//     const id = parseInt(req.params.id, 10);
//     // //console.log(`Received id: ${req.params.id}, Parsed id: ${id}`);

//     if (isNaN(id)) {
//         return res.status(400).json({ message: 'Invalid labour ID' });
//     }

//     try {
//         const nextID = await labourModel.getNextUniqueID(); // Generate next unique LabourID
//         // const onboardName = req.body.OnboardName;

//         //console.log('Approving labour ID:', id);
//         //console.log('Generated nextID:', nextID);
//         // //console.log('OnboardName:', onboardName);

//         const success = await labourModel.approveLabour(id, nextID);
//         if (success) {
//             res.json({ success: true, message: 'Labour approved successfully.', data: success });
//         } else {
//             res.status(404).json({ message: 'Labour not found or already approved.' });
//         }
//     } catch (error) {
//         console.error('Error in approveLabour:', error.message);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// }

// --------------------------------  changes disabel approve 14-11-2024 --------------


async function approveDisableLabour(req, res) {
    const id = parseInt(req.params.id, 10);
    const { labourID } = req.body;
    //console.log('labourID++++++',req.body)

    if (isNaN(id) || !labourID) {
        return res.status(400).json({ message: 'Invalid input parameters' });
    }

    try {
        const result = await labourModel.approveDisableLabours(id, labourID);
        if (result) {
            res.json({ success: true, message: 'Labour approved successfully.', data: result });
        } else {
            res.status(404).json({ message: 'Labour not found or already approved.' });
        }
    } catch (error) {
        console.error('Error in approveDisableLabour:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}


// ---------------------------------------------------  End -----------------------------------------

async function rejectLabour(req, res) {
    // //console.log('Fetching rejected labours...');
    const id = parseInt(req.params.id, 10);
    const { Reject_Reason } = req.body;
    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid labour ID' });
    }
    try {
        // const success = await labourModel.rejectLabour(id);
        const success = await labourModel.rejectLabour(id, Reject_Reason);
        if (success) {
            res.json({ success: true, message: 'Labour rejected successfully.' });
        } else {
            res.status(404).json({ message: 'Labour not found or already rejected.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function getApprovedLabours(req, res) {
    try {
        // //console.log('Fetching approved labours...');
        const approvedLabours = await labourModel.getApprovedLabours();
        res.json(approvedLabours);
    } catch (error) {
        console.error('Error fetching approved labours:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}


async function resubmitLabour(req, res) {
    try {
        const { id } = req.params;
        const updated = await labourModel.resubmit(id);
        if (updated === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        return res.json({ success: true, message: 'Labour resubmitted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


//Edit labuor button functionality
async function editbuttonLabour(req, res) {
    try {
        const { id } = req.params;
        const updated = await labourModel.editLabour(id);
        if (updated === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        return res.json({ success: true, message: 'Labour resubmitted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


// async function esslapi(req, res) {
//     try {
//         const approvedLabours = req.body;
//         // //console.log("approvedLabours : " + approvedLabours);

//         const esslapiurl = 'https://essl.vjerp.com:8530/iclock/webapiservice.asmx?op=AddEmployee';
//         const response = await axios.post(esslapiurl, approvedLabours, {
//             headers: {
//                 'Content-Type': 'text/xml'
//             }
//         });

//         res.json(response.data);
//     } catch (error) {
//         console.error('Error fetching approved labours:', error.message);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };




async function esslapi(req, res) {
    try {
        const approvedLaboursXml = req.body; // This is the XML body from your request
        
        // Parse the incoming XML to extract relevant values
        const parser = new xml2js.Parser({ explicitArray: false });
        const approvedLabours = await parser.parseStringPromise(approvedLaboursXml);

        // Extract values from parsed XML
        const LabourID = approvedLabours['soap:Envelope']['soap:Body']['AddEmployee']['EmployeeCode']; // EmployeeCode as LabourID
        const name = approvedLabours['soap:Envelope']['soap:Body']['AddEmployee']['EmployeeName']; // EmployeeName as name
        const userId = approvedLabours['soap:Envelope']['soap:Body']['AddEmployee']['CardNumber']; // CardNumber as userId

        //console.log("Parsed Approved Labours:", { userId, LabourID, name });

        const esslapiurl = 'https://essl.vjerp.com:8530/iclock/webapiservice.asmx?op=AddEmployee';
        const response = await axios.post(esslapiurl, approvedLaboursXml, {
            headers: {
                'Content-Type': 'text/xml'
            }
        });

        const esslResponseData = response.data;
        //console.log("Raw XML Response:", esslResponseData); // Debugging: Check raw XML response

        // Parse the XML response correctly
        const parsedResponse = await parseEsslResponse(esslResponseData);
        const { Status: esslStatus = 'false', CommandId: esslCommandId = null } = parsedResponse;

        //console.log("Parsed Response - Status:", esslStatus); // Debugging: Check the parsed status
        //console.log("Parsed Response - CommandId:", esslCommandId); // Debugging: Check the parsed command ID

        // Save to database with userId
        await saveEsslResponse({
            userId,  // Use userId extracted from CardNumber
            LabourID,
            name,
            esslStatus,
            esslCommandId,
            esslPayload: approvedLaboursXml, // Store raw XML if needed, otherwise use a parsed structure
            esslApiResponse: parsedResponse
        });

        res.json(parsedResponse);
    } catch (error) {
        console.error('Error fetching approved labours:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function parseEsslResponse(xmlData) {
    try {
        const parser = new xml2js.Parser({ explicitArray: false });  // Initialize xml2js parser
        const parsedData = await parser.parseStringPromise(xmlData);

        //console.log("Parsed XML Data Structure:", parsedData); // Debugging: Check parsed XML structure

        // Extract Status and CommandId using the correct path
        const status = parsedData['soap:Envelope']['soap:Body']['AddEmployeeResponse']['AddEmployeeResult'];
        const commandId = parsedData['soap:Envelope']['soap:Body']['AddEmployeeResponse']['CommandId'];

        // If status is not found or is not 'success', set it to 'false'
        const result = {
            Status: status && status.toLowerCase() === 'success' ? status : 'false',
            CommandId: commandId || null
        };

        //console.log("XML Parsed Result:", result); // Debugging: Check parsed result
        return result;
    } catch (error) {
        console.error('Error parsing XML response:', error.message);
        return {
            Status: 'false',  // Default to 'false' if there's an error
            CommandId: null
        };
    }
}

async function saveEsslResponse(data) {
    try {
        const pool = await poolPromise;
        const query = `
            INSERT INTO API_EsslPayloads (
                userId, LabourID, name,
                esslStatus, esslCommandId, esslPayload, esslApiResponse, createdAt, updatedAt
            ) VALUES (
                @userId, @LabourID, @name,
                @esslStatus, @esslCommandId, @esslPayload, @esslApiResponse, GETDATE(), GETDATE()
            )
        `;

        const esslPayloadString = JSON.stringify(data.esslPayload);
        const esslApiResponseString = JSON.stringify(data.esslApiResponse);

        //console.log("Data to be saved to DB:", {
        //     userId: data.userId,  // Corrected to match the parsed XML id
        //     LabourID: data.LabourID,
        //     name: data.name,
        //     esslStatus: data.esslStatus,
        //     esslCommandId: data.esslCommandId,
        //     esslPayload: esslPayloadString,
        //     esslApiResponse: esslApiResponseString
        // });

        await pool.request()
            .input('userId', sql.Int, data.userId) // Adjusted to match userId input type
            .input('LabourID', sql.NVarChar(50), data.LabourID)
            .input('name', sql.NVarChar(255), data.name)
            .input('esslStatus', sql.VarChar(50), data.esslStatus)
            .input('esslCommandId', sql.Int, data.esslCommandId)
            .input('esslPayload', sql.VarChar(sql.MAX), esslPayloadString)
            .input('esslApiResponse', sql.NVarChar(sql.MAX), esslApiResponseString)
            .query(query);

    } catch (err) {
        console.error('Error saving response to database:', err.message);
        throw err;
    }
};



async function getUserStatusController(req, res) {
    try {
        const labourIds = req.body.labourIds; // Get array of labour IDs from request body
        if (!labourIds || !Array.isArray(labourIds)) {
            return res.status(400).json({ error: 'Invalid labourIds array' });
        }

        const combinedStatuses = await labourModel.getLabourStatuses(labourIds); // Pass array of IDs to model
        res.status(200).json(combinedStatuses);
    } catch (error) {
        console.error("Error in controller:", error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch combined statuses' });
    }
};



async function updateHideResubmitLabour(req, res) {
    try {
        const { id } = req.params; // Labour ID comes from the URL parameters
        const { hideResubmit } = req.body; // hideResubmit value comes from the request body

        // Call the model function to update hideResubmit
        const updated = await labourModel.updateHideResubmit(id, hideResubmit);
        
        if (updated === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        return res.json({ success: true, message: 'hideResubmit updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}







//   -----------------------------------   LABOUR APP PHASE 2    DATE -  20-10-2024   -------   ////////////////  
//   ------  ATTENDACE REPORT CODE HERE ----- Implement Date 22/10/2024 ---- //////////////////////////////



// async function getAttendance(req, res) {
//     try {
//         const { labourId } = req.params; // Labour ID from the URL parameter
//         const { month, year } = req.query; // Month and year from query params
//         //console.log('Received request for attendance:', { labourId, month, year });

//         // Fetch attendance for the specific labour, month, and year
//         const attendance = await labourModel.getAttendanceByLabourId(labourId, month, year);
//         //console.log('Attendance data fetched from the database:', attendance);

//         if (!attendance || attendance.length === 0) {
//             //console.log('No attendance found for this labour in the selected month');
//             return res.status(404).json({ message: 'No attendance found for this labour in the selected month' });
//         }

//         // Fetch the working hours for the labour
//         const labourDetails = await labourModel.getLabourDetailsById(labourId);
//         const shiftHours = labourDetails.workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//         const halfDayHours = shiftHours === 9 ? 4.5 : 4;
//         const maxOvertimeHours = 120; // Maximum OT cap for the month

//         const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the month

//         // Initialize the variables
//         let totalDays = daysInMonth;
//         let presentDays = 0;
//         let totalOvertimeHours = 0;
//         let monthlyAttendance = [];

//         for (let day = 1; day <= daysInMonth; day++) {
//             const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//             const punchesForDay = attendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

//             if (punchesForDay.length > 0) {
//                 // Sort punches to get the first and last punch of the day
//                 punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

//                 const firstPunch = punchesForDay[0].punch_time;
//                 const lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;

//                 const totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
//                 let overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;

//                 // Apply half-day logic
//                 if (totalHours > halfDayHours && totalHours < shiftHours) {
//                     overtime = 0; // No overtime if hours are between half-day and full shift
//                 }

//                 presentDays++;
//                 totalOvertimeHours += overtime;

//                 monthlyAttendance.push({
//                     date,
//                     firstPunch: `${date}T${firstPunch.toISOString().split('T')[1]}`,
//                     lastPunch: `${date}T${lastPunch.toISOString().split('T')[1]}`,
//                     status: 'P', // Present
//                     totalHours,
//                     overtime
//                 });
//             } else {
//                 monthlyAttendance.push({
//                     date,
//                     status: 'A', // Absent if no punch data
//                     totalHours: 0,
//                     overtime: 0
//                 });
//             }
//         }

//         // Cap the total overtime hours to the maximum allowed
//         totalOvertimeHours = Math.min(totalOvertimeHours, maxOvertimeHours);

//         //console.log('Calculated attendance:', {
//             totalDays,
//             presentDays,
//             totalOvertimeHours,
//             shift: labourDetails.workingHours,
//             monthlyAttendance
//         });

//         // Return the calculated attendance data
//         res.json({
//             labourId,
//             totalDays,
//             presentDays,
//             totalOvertimeHours,
//             shift: labourDetails.workingHours,
//             monthlyAttendance
//         });
//     } catch (err) {
//         console.error('Error getting attendance for month', err);
//         res.status(500).json({ message: 'Error getting attendance for the month' });
//     }
// };

// async function getAllLaboursAttendance(req, res) {
//     try {
//         const { month, year } = req.query;
//         //console.log('Received request for attendance for approved labors:', { month, year });

//         const parsedMonth = parseInt(month, 10);
//         const parsedYear = parseInt(year, 10);

//         if (isNaN(parsedMonth) || isNaN(parsedYear)) {
//             return res.status(400).json({ message: 'Invalid month or year' });
//         }

//         // Fetch all approved labour IDs and their working hours
//         const approvedLabours = await labourModel.getAllApprovedLabours();

//         if (!approvedLabours || approvedLabours.length === 0) {
//             //console.log('No approved labours found');
//             return res.status(404).json({ message: 'No approved labours found' });
//         }

//         const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();
//         const results = [];
//         const limit = 100; // Limit to 100 labours

//         // Fetch attendance for approved labour IDs (limit to 100)
//         for (let i = 0; i < Math.min(approvedLabours.length, limit); i++) {
//             const { labourId, workingHours } = approvedLabours[i];
//             //console.log(`Fetching attendance for labour ID: ${labourId}`);
//             const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);
//             //console.log(`Fetched attendance for labour ID ${labourId}:`, labourAttendance);

//             const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//             const halfDayHours = shiftHours === 9 ? 4.5 : 4;
//             const maxOvertimeHours = 120; // Maximum OT cap for the month 120 Hrs
//             let presentDays = 0;
//             let totalOvertimeHours = 0;
//             let monthlyAttendance = [];

//             for (let day = 1; day <= daysInMonth; day++) {
//                 const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//                 const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

//                 if (punchesForDay.length > 0) {
//                     punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

//                     const firstPunch = punchesForDay[0].punch_time;
//                     const lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;

//                     const totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
//                     let overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;

//                     // Apply half-day logic
//                     if (totalHours > halfDayHours && totalHours < shiftHours) {
//                         overtime = 0; // No overtime if hours are between half-day and full shift
//                     }

//                     presentDays++;
//                     totalOvertimeHours += overtime;

//                     monthlyAttendance.push({
//                         date,
//                         firstPunch: `${date}T${firstPunch.toISOString().split('T')[1]}`,
//                         lastPunch: `${date}T${lastPunch.toISOString().split('T')[1]}`,
//                         status: 'P',
//                         totalHours,
//                         overtime
//                     });
//                 } else {
//                     monthlyAttendance.push({
//                         date,
//                         status: 'A',
//                         totalHours: 0,
//                         overtime: 0
//                     });
//                 }
//             }

//             // Cap the total overtime hours to the maximum allowed
//             totalOvertimeHours = Math.min(totalOvertimeHours, maxOvertimeHours);

//             const calculatedAttendance = {
//                 labourId,
//                 totalDays: daysInMonth,
//                 presentDays,
//                 totalOvertimeHours,
//                 shift: workingHours,
//                 monthlyAttendance
//             };

//             //console.log('Calculated attendance for labour ID:', labourId, calculatedAttendance);

//             results.push(calculatedAttendance);
//         }

//         // //console.log('Completed fetching attendance for all approved labours:', results);

//         // Write results to a JSON file
//         const filePath = path.join(__dirname, `attendance_${parsedMonth}_${parsedYear}.json`);
//         fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
//         //console.log('Attendance data written to JSON file:', filePath);

//         // Set response headers to trigger file download
//         res.setHeader('Content-Disposition', `attachment; filename=attendance_${parsedMonth}_${parsedYear}.json`);
//         res.setHeader('Content-Type', 'application/json');
//         res.sendFile(filePath);
//     } catch (err) {
//         console.error('Error getting attendance for approved labours for the month', err);
//         res.status(500).json({ message: 'Error getting attendance for approved labours for the month' });
//     }
// };

// // Helper function to calculate hours worked between two times (dynamic date)
// function calculateHoursWorked(punchDate, firstPunch, lastPunch) {
//     // Ensure firstPunch and lastPunch times have the correct date
//     const punchDateStr = punchDate.toISOString().split('T')[0]; // Extract date from punchDate
//     const punchInTime = new Date(`${punchDateStr}T${firstPunch.toISOString().split('T')[1]}`); // Combine date and time
//     const punchOutTime = new Date(`${punchDateStr}T${lastPunch.toISOString().split('T')[1]}`); // Combine date and time

//     const totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60); // Convert milliseconds to hours
//     return totalHours.toFixed(2);  // Return hours with 2 decimal places
// }



// Cache for attendance data


let cachedAttendance = null;

// Create a separate logger for this cron job
const cronLogger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.File({ filename: 'cron_attendance.log' })
    ]
});


async function runDailyAttendanceCron() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // Get the previous day
    const formattedYesterday = yesterday.toISOString().split('T')[0];

    console.log(`Cron Execution Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`Processing Attendance for Date: ${formattedYesterday}`);

    cronLogger.info(`Running cron job for Attendance Date: ${formattedYesterday}`);

    try {
        // Call the function to process attendance
        console.log('Calling processLaboursAttendance function...');
        await processLaboursAttendance(formattedYesterday);
        console.log(`Cron job completed successfully for Date: ${formattedYesterday}`);
     // Update attendance summary for all approved laborers
     const approvedLabours = await labourModel.getAllApprovedLabours();
     for (let labour of approvedLabours) {
         const { labourId } = labour;
         await labourModel.insertOrUpdateLabourAttendanceSummary(labourId, formattedYesterday);
     }

     console.log(`Cron job completed successfully for Date: ${formattedYesterday}`);
     cronLogger.info(`Cron job completed successfully for Date: ${formattedYesterday}`);
 } catch (error) {
     console.error(`Error running cron job for Date: ${formattedYesterday}:`, error);
     cronLogger.error(`Error running cron job for Date: ${formattedYesterday}:`, error);
 }
}


// function formatTimeToHoursMinutes(timeString) {
//     try {
//         const date = new Date(timeString);
//         if (isNaN(date.getTime())) return "-";
//         const hours = date.getUTCHours().toString().padStart(2, "0");
//         const minutes = date.getUTCMinutes().toString().padStart(2, "0");
//         const seconds = date.getUTCSeconds().toString().padStart(2, "0");
//         return `${hours}:${minutes}:${seconds}`;
//     } catch (error) {
//         return "-";
//     }
// }

// // Helper function to calculate hours worked between two times (dynamic date)
// function calculateHoursWorked(punchDate, firstPunch, lastPunch) {
//     const punchDateStr = punchDate.toISOString().split('T')[0]; // Extract date from punchDate
//     const punchInTime = new Date(`${punchDateStr}T${firstPunch.toISOString().split('T')[1]}`); // Combine date and time
//     const punchOutTime = new Date(`${punchDateStr}T${lastPunch.toISOString().split('T')[1]}`); // Combine date and time

//     const totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60); // Convert milliseconds to hours
//     return totalHours.toFixed(2);  // Return hours with 2 decimal places
// };

async function getAttendance(req, res) {
    try {
        const { labourId } = req.params;
        const { month, year } = req.query;
        logger.info('Received request for attendance:', { labourId, month, year });

        const attendance = await labourModel.getAttendanceByLabourId(labourId, month, year);
        logger.info('Attendance data fetched from the database:', attendance);

        if (!attendance || attendance.length === 0) {
            logger.info('No attendance found for this labour in the selected month');
            return res.status(404).json({ message: 'No attendance found for this labour in the selected month' });
        }

        const labourDetails = await labourModel.getLabourDetailsById(labourId);
        const shiftHours = labourDetails.workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
        const halfDayHours = shiftHours === 9 ? 4.5 : 4;

        const daysInMonth = new Date(year, month, 0).getDate();
        let presentDays = 0;
        let halfDays = 0;
        let missPunchDays = 0;
        let totalOvertimeHours = 0;
        let monthlyAttendance = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const punchesForDay = attendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

            let status = 'A';
            let totalHours = 0;
            let overtime = 0;

            if (punchesForDay.length > 0) {
                punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

                const firstPunch = punchesForDay[0];
                const lastPunch = punchesForDay[punchesForDay.length - 1];

                totalHours = calculateHoursWorked(firstPunch.punch_date, firstPunch.punch_time, lastPunch.punch_time);

                if (firstPunch && lastPunch && totalHours >= shiftHours) {
                    status = 'P';
                    presentDays++;
                    overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;
                } else if (firstPunch && totalHours < halfDayHours) {
                    status = 'MP';
                    missPunchDays++;
                } else if (totalHours >= halfDayHours) {
                    status = 'HD';
                    halfDays++;
                }

                monthlyAttendance.push({
                    date,
                    firstPunch: {
                        time: formatTimeToHoursMinutes(firstPunch.punch_time),
                        attendanceId: firstPunch.attendance_id,
                        deviceId: firstPunch.Device_id,
                    },
                    lastPunch: {
                        time: formatTimeToHoursMinutes(lastPunch.punch_time),
                        attendanceId: lastPunch.attendance_id,
                        deviceId: lastPunch.Device_id,
                    },
                    totalHours,
                    overtime,
                    status,
                });

                totalOvertimeHours += overtime;
            } else {
                monthlyAttendance.push({
                    date,
                    status: 'A',
                    totalHours: 0,
                    overtime: 0,
                });
            }
        }

        logger.info('Calculated attendance:', {
            labourId,
            totalDays: daysInMonth,
            presentDays,
            halfDays,
            missPunchDays,
            totalOvertimeHours,
            shift: labourDetails.workingHours,
            monthlyAttendance,
        });

        res.json({
            labourId,
            totalDays: daysInMonth,
            presentDays,
            halfDays,
            missPunchDays,
            totalOvertimeHours,
            shift: labourDetails.workingHours,
            monthlyAttendance,
        });
    } catch (err) {
        logger.error('Error getting attendance for month', err);
        res.status(500).json({ message: 'Error getting attendance for the month' });
    }
}




// async function getAllLaboursAttendance(req, res) {
//     try {
//         const { month, year } = req.query;

//         if (!month || !year) {
//             return res.status(400).json({ message: 'Month and Year are required' });
//         }

//         const parsedMonth = parseInt(month, 10);
//         const parsedYear = parseInt(year, 10);

//         if (isNaN(parsedMonth) || isNaN(parsedYear)) {
//             return res.status(400).json({ message: 'Invalid month or year' });
//         }

//         const approvedLabours = await labourModel.getAllApprovedLabours();

//         if (!approvedLabours || approvedLabours.length === 0) {
//             return res.status(404).json({ message: 'No approved labours found' });
//         }

//         const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

//         for (let labour of approvedLabours) {
//             const { labourId, workingHours } = labour;
//             const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//             const halfDayHours = shiftHours === 9 ? 4.5 : 4;

//             let presentDays = 0;
//             let halfDays = 0;
//             let missPunchDays = 0;
//             let absentDays = 0;
//             let totalOvertimeHours = 0;
//             let monthlyAttendance = [];

//             const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);

//             for (let day = 1; day <= daysInMonth; day++) {
//                 const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//                 const punchesForDay = labourAttendance.filter(
//                     (att) => new Date(att.punch_date).toISOString().split('T')[0] === date
//                 );

//                 let status = 'A'; // Default to Absent
//                 let totalHours = 0;
//                 let overtime = 0;
//                 let firstPunch = null;
//                 let lastPunch = null;
//                 let firstPunchAttendanceId = null;
//                 let firstPunchDeviceId = null;
//                 let lastPunchAttendanceId = null;
//                 let lastPunchDeviceId = null;

//                 if (punchesForDay.length > 0) {
//                     punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));
//                     firstPunch = punchesForDay[0];
//                     lastPunch = punchesForDay[punchesForDay.length - 1];

//                     totalHours = calculateHoursWorked(firstPunch.punch_date, firstPunch.punch_time, lastPunch.punch_time);

//                     // Extract details for first and last punches
//                     firstPunchAttendanceId = firstPunch.attendance_id;
//                     firstPunchDeviceId = firstPunch.Device_id;
//                     lastPunchAttendanceId = lastPunch.attendance_id;
//                     lastPunchDeviceId = lastPunch.Device_id;

//                     if (firstPunch && lastPunch && totalHours >= shiftHours) {
//                         status = 'P'; // Present
//                         presentDays++;
//                         overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;
//                     } else if (firstPunch && totalHours < halfDayHours) {
//                         status = 'MP'; // Miss Punch
//                         missPunchDays++;
//                     } else if (totalHours >= halfDayHours) {
//                         status = 'HD'; // Half Day
//                         halfDays++;
//                     } else {
//                         absentDays++;
//                     }

//                     totalOvertimeHours += overtime;
//                 } else {
//                     absentDays++;
//                 }

//                 monthlyAttendance.push({
//                     labourId,
//                     projectName: parseInt(labour.projectName, 10),
//                     date,
//                     firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
//                     firstPunchAttendanceId: firstPunchAttendanceId,
//                     firstPunchDeviceId: firstPunchDeviceId,
//                     lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
//                     lastPunchAttendanceId: lastPunchAttendanceId,
//                     lastPunchDeviceId: lastPunchDeviceId,
//                     totalHours,
//                     overtime: parseFloat(overtime.toFixed(1)),
//                     status,
//                     creationDate: new Date(),
//                 });
//             }

//             // Log the calculated summary before inserting
//             const summary = {
//                 labourId,
//                 projectName: parseInt(labour.projectName, 10),
//                 totalDays: daysInMonth,
//                 presentDays,
//                 halfDays,
//                 missPunchDays,
//                 absentDays,
//                 totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(1)),
//                 shift: workingHours,
//                 creationDate: new Date(),
//                 selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`, // e.g., "2024-09"
//             };
//             //console.log(`Summary for LabourId ${labourId}:`, summary);

//             // Insert summary into LabourAttendanceSummary
//             await labourModel.insertIntoLabourAttendanceSummary(summary);

//             // Log the daily attendance data before insertion
//             //console.log(`Monthly Attendance for LabourId ${labourId}:`, monthlyAttendance);

//             // Insert daily attendance into LabourAttendanceDetails
//             for (let dayAttendance of monthlyAttendance) {
//                 //console.log(`Inserting Attendance for ${labourId} on ${dayAttendance.date}:`, dayAttendance);
//                 await labourModel.insertIntoLabourAttendanceDetails(dayAttendance);
//             }
//         }

//         res.status(200).json({ message: 'Attendance processed successfully' });
//     } catch (err) {
//         console.error('Error processing attendance:', err);
//         res.status(500).json({ message: 'Error processing attendance' });
//     }
// };


// Existing Helper Functions

// Existing Helper Functions



/**
 * Formats a given time string to "HH:MM:SS" format.
 * Returns "-" if the time is invalid.
 * @param {string} timeString - The time string to format.
 * @returns {string} - Formatted time or "-".
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
 * @param {Date} punchDate - The date of the punch.
 * @param {Date} firstPunch - The first punch time.
 * @param {Date} lastPunch - The last punch time.
 * @returns {number} - Total hours worked with 2 decimal places.
 */
function calculateHoursWorked(punchDate, firstPunch, lastPunch) {
    try {
        const punchDateStr = punchDate.toISOString().split('T')[0]; // Extract date from punchDate
        const punchInTime = new Date(`${punchDateStr}T${firstPunch.toISOString().split('T')[1]}`); // Combine date and time
        const punchOutTime = new Date(`${punchDateStr}T${lastPunch.toISOString().split('T')[1]}`); // Combine date and time

        const totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60); // Convert milliseconds to hours

        if (isNaN(totalHours) || totalHours < 0) {
            console.warn(`Invalid totalHours calculated. Setting to 0. Details: punchDate=${punchDate}, firstPunch=${firstPunch}, lastPunch=${lastPunch}`);
            return 0;
        }

        return parseFloat(totalHours.toFixed(2));  // Return hours with 2 decimal places as number
    } catch (error) {
        console.error(`Error in calculateHoursWorked: ${error.message}`);
        return 0;
    }
}

// Additional Helper Functions

/**
 * Determines the total shift hours based on workingHours string.
 * @param {string} workingHours - The working hours string.
 * @returns {number} - Shift hours.
 */
const getShiftHours = (workingHours) => (workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8);

/**
 * Determines half-day hours based on shift hours.
 * @param {number} shiftHours - Total shift hours.
 * @returns {number} - Half-day hours.
 */
const getHalfDayHours = (shiftHours) => (shiftHours === 9 ? 4.5 : 4);

/**
 * Calculates the difference in minutes between two punch times.
 * @param {Date} firstPunchTime - First punch time.
 * @param {Date} lastPunchTime - Last punch time.
 * @returns {number} - Difference in minutes.
 */
const calculateTimeDifferenceInMinutes = (firstPunchTime, lastPunchTime) => {
    const diffMs = lastPunchTime - firstPunchTime;
    return diffMs / (1000 * 60); // Convert milliseconds to minutes
};

/**
 * Determines the attendance status based on punches and shift parameters.
 * @param {Array} punches - Array of punch objects for the day.
 * @param {number} shiftHours - Total shift hours.
 * @param {number} halfDayHours - Half-day hours.
 * @param {string} workingHours - Working hours string.
 * @returns {Object} - Contains status, firstPunch, lastPunch, misPunch flag, and totalHours.
 */
const determineStatus = (punches, shiftHours, halfDayHours, workingHours) => {
    // Initialize default values
    let status = 'A';
    let misPunch = false;
    let consideredLastPunch = null;
    let totalHours = 0;

    if (!punches || punches.length === 0) {
        // No punches found
        // console.log(`No punches found for punches array: ${JSON.stringify(punches)}`);
        return { status, firstPunch: null, lastPunch: null, misPunch, totalHours };
    }

    // Sort punches by time
    punches.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

    const firstPunch = punches[0];
    const lastPunch = punches[punches.length - 1];

    const firstPunchTime = new Date(firstPunch.punch_time);
    const lastPunchTime = new Date(lastPunch.punch_time);

    const gapMinutes = calculateTimeDifferenceInMinutes(firstPunchTime, lastPunchTime);

    if (gapMinutes < 15) {
        // Gap less than 15 minutes, consider only firstPunch and mark as MisPunch
        misPunch = true;
        // console.log(`MisPunch detected. GapMinutes: ${gapMinutes}`);
    } else {
        // Consider both punches
        consideredLastPunch = lastPunch;
    }

    if (misPunch) {
        status = 'MP';
    } else {
        // Calculate total hours
        if (consideredLastPunch) {
            totalHours = calculateHoursWorked(new Date(firstPunch.punch_date), firstPunchTime, lastPunchTime);
        } else {
            // Only firstPunch is considered, no valid LastPunch
            totalHours = 0;
            // console.log(`Only firstPunch present without valid LastPunch. TotalHours set to 0.`);
        }

        // Define thresholds
        const pThreshold = workingHours === 'FLEXI SHIFT - 9 HRS' ? 4.5 : 4;
        const hdThreshold = 2; // Always 2 hours for HD
        const aThreshold = 0.25; // 15 minutes

        if (totalHours > pThreshold) {
            status = 'P';
        } else if (totalHours > hdThreshold && totalHours <= pThreshold) {
            status = 'HD';
        } else if (totalHours > aThreshold && totalHours <= hdThreshold) {
            status = 'A';
        } else {
            status = 'MP';
        }

        // console.log(`Status Determined: ${status} | TotalHours: ${totalHours}`);
    }

    return {
        status,
        firstPunch,
        lastPunch: consideredLastPunch,
        misPunch,
        totalHours,
    };
};

// Main Function

/**
 * Processes and records the attendance of all approved labours for a specified month and year.
 * Implements rules for Present, Half Day, Absent, and Miss Punch statuses based on punch data.
 * @param {Object} req - Express request object containing query parameters month and year.
 * @param {Object} res - Express response object.
 */
async function getAllLaboursAttendance(req, res) {
    try {
        const { month, year } = req.query;

        // Validate input
        if (!month || !year) {
            return res.status(400).json({ message: 'Month and Year are required' });
        }

        const parsedMonth = parseInt(month, 10);
        const parsedYear = parseInt(year, 10);

        if (isNaN(parsedMonth) || isNaN(parsedYear)) {
            return res.status(400).json({ message: 'Invalid month or year' });
        }

        // Fetch all approved labours
        const approvedLabours = await labourModel.getAllApprovedLabours();

        if (!approvedLabours || approvedLabours.length === 0) {
            return res.status(404).json({ message: 'No approved labours found' });
        }

        // Determine number of days in the specified month
        const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

        // Iterate through each approved labour
        for (let labour of approvedLabours) {
            const { labourId, workingHours } = labour;
            const shiftHours = getShiftHours(workingHours);
            const halfDayHours = getHalfDayHours(shiftHours);

            // Initialize counters
            let presentDays = 0;
            let halfDays = 0;
            let missPunchDays = 0;
            let absentDays = 0;
            let totalOvertimeHours = 0;
            let monthlyAttendance = [];

            // Fetch attendance records for the labour for the specified month and year
            const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);

            // Process each day of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const punchesForDay = labourAttendance.filter(
                    (att) => new Date(att.punch_date).toISOString().split('T')[0] === date
                );

                // Determine attendance status based on punches
                const { status, firstPunch, lastPunch, misPunch, totalHours } = determineStatus(punchesForDay, shiftHours, halfDayHours, workingHours);

                let overtime = 0;
                let firstPunchAttendanceId = null;
                let firstPunchDeviceId = null;
                let lastPunchAttendanceId = null;
                let lastPunchDeviceId = null;

                if (firstPunch) {
                    firstPunchAttendanceId = firstPunch.attendance_id;
                    firstPunchDeviceId = firstPunch.Device_id;
                }

                if (lastPunch) {
                    lastPunchAttendanceId = lastPunch.attendance_id;
                    lastPunchDeviceId = lastPunch.Device_id;
                }

                // Update counters based on status
                switch (status) {
                    case 'P':
                        presentDays++;
                        overtime = totalHours > shiftHours ? parseFloat((totalHours - shiftHours).toFixed(2)) : 0;
                        break;
                    case 'HD':
                        halfDays++;
                        break;
                    case 'MP':
                        missPunchDays++;
                        break;
                    case 'A':
                        absentDays++;
                        break;
                    default:
                        absentDays++;
                }

                totalOvertimeHours += overtime;

                // Ensure totalHours is a valid number
                const safeTotalHours = typeof totalHours === 'number' && !isNaN(totalHours) ? totalHours : 0;

                // Prepare attendance record for the day
                monthlyAttendance.push({
                    labourId,
                    projectName: parseInt(labour.projectName, 10),
                    date,
                    firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
                    firstPunchAttendanceId: firstPunchAttendanceId,
                    firstPunchDeviceId: firstPunchDeviceId,
                    lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
                    lastPunchAttendanceId: lastPunchAttendanceId,
                    lastPunchDeviceId: lastPunchDeviceId,
                    totalHours: safeTotalHours.toFixed(2),
                    overtime: overtime.toFixed(1),
                    status,
                    misPunch,
                    creationDate: new Date(),
                });
            }

            // Prepare summary for the labour
            const summary = {
                labourId,
                projectName: parseInt(labour.projectName, 10),
                totalDays: daysInMonth,
                presentDays,
                halfDays,
                missPunchDays,
                absentDays,
                totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(1)),
                shift: workingHours,
                creationDate: new Date(),
                selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`, // e.g., "2024-11"
            };

            // Insert summary into LabourAttendanceSummary
            await labourModel.insertIntoLabourAttendanceSummary(summary);

            // Insert daily attendance into LabourAttendanceDetails
            for (let dayAttendance of monthlyAttendance) {
                await labourModel.insertIntoLabourAttendanceDetails(dayAttendance);
            }
        }

        res.status(200).json({ message: 'Attendance processed successfully' });
    } catch (err) {
        console.error('Error processing attendance:', err);
        res.status(500).json({ message: 'Error processing attendance' });
    }
}


// async function processLaboursAttendance(date) {
//     try {
//         const attendanceDate = new Date(date);
//         if (isNaN(attendanceDate.getTime())) {
//             throw new Error('Invalid date format');
//         }

//         const approvedLabours = await labourModel.getAllApprovedLabours();

//         if (!approvedLabours || approvedLabours.length === 0) {
//             //console.log('No approved labours found');
//             return;
//         }

//         for (let labour of approvedLabours) {
//             const { labourId, workingHours } = labour;
//             const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//             const halfDayHours = shiftHours === 9 ? 4.5 : 4;

//             let presentDays = 0;
//             let halfDays = 0;
//             let missPunchDays = 0;
//             let absentDays = 0;
//             let totalOvertimeMinutes = 0;
//             let dailyAttendance = [];

//             const labourAttendance = await labourModel.getAttendanceByLabourIdForDate(labourId, attendanceDate);

//             let status = 'A'; // Default to Absent
//             let totalMinutesWorked = 0;
//             let overtimeMinutes = 0; // Initialize to ensure it's not NULL
//             let firstPunch = null;
//             let lastPunch = null;
//             let firstPunchAttendanceId = null;
//             let firstPunchDeviceId = null;
//             let lastPunchAttendanceId = null;
//             let lastPunchDeviceId = null;

//             if (labourAttendance.length > 0) {
//                 labourAttendance.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));
//                 firstPunch = labourAttendance[0];
//                 lastPunch = labourAttendance[labourAttendance.length - 1];

//                 const timeDifferenceMinutes = (new Date(lastPunch.punch_time) - new Date(firstPunch.punch_time)) / (1000 * 60);
//                 totalMinutesWorked = Math.max(timeDifferenceMinutes, 0); // Ensure non-negative minutes

//                 //console.log(`Labour ID: ${labourId}`);
//                 //console.log(`First Punch Time: ${firstPunch.punch_time}`);
//                 //console.log(`Last Punch Time: ${lastPunch.punch_time}`);
//                 //console.log(`Time Difference in Minutes: ${timeDifferenceMinutes}`);

//                 // Extract details for first and last punches
//                 firstPunchAttendanceId = firstPunch.attendance_id;
//                 firstPunchDeviceId = firstPunch.Device_id;
//                 lastPunchAttendanceId = lastPunch.attendance_id;
//                 lastPunchDeviceId = lastPunch.Device_id;

//                 // Miss Punch Logic
//                 if (timeDifferenceMinutes > 0 && timeDifferenceMinutes <= 3) {
//                     status = 'MP'; // Miss Punch
//                     missPunchDays++;
//                     //console.log(`Status: Miss Punch (Time Difference <= 3 minutes)`);
//                 } 
//                 // Absent Logic
//                 else if (timeDifferenceMinutes > 0 && timeDifferenceMinutes < 120) {
//                     status = 'A'; // Absent
//                     absentDays++;
//                     //console.log(`Status: Absent (Time Difference < 120 minutes)`);
//                 } 
//                 // Present and Overtime Logic
//                 else if (firstPunch && lastPunch && totalMinutesWorked >= shiftHours * 60) {
//                     status = 'P'; // Present
//                     presentDays++;
//                     overtimeMinutes = totalMinutesWorked > shiftHours * 60 ? totalMinutesWorked - shiftHours * 60 : 0;
//                     //console.log(`Status: Present`);
//                 } 
//                 // Half Day Logic
//                 else if (totalMinutesWorked >= halfDayHours * 60) {
//                     status = 'HD'; // Half Day
//                     halfDays++;
//                     //console.log(`Status: Half Day`);
//                 } 
//                 // Default Absent
//                 else {
//                     absentDays++;
//                     //console.log(`Status: Absent`);
//                 }

//                 // Calculate half-hour and full-hour overtime in minutes
//                 if (overtimeMinutes > 0) {
//                     overtimeMinutes = Math.floor(overtimeMinutes / 30) * 30; // Round down to nearest 30 minutes
//                     //console.log(`Overtime (rounded to nearest 30 minutes): ${overtimeMinutes} minutes`);
//                 }

//                 totalOvertimeMinutes += overtimeMinutes;
//             } else {
//                 absentDays++;
//                 //console.log(`No punches found. Status: Absent`);
//             }

//             dailyAttendance.push({
//                 labourId,
//                 projectName: parseInt(labour.projectName, 10),
//                 date,
//                 firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
//                 firstPunchAttendanceId: firstPunchAttendanceId,
//                 firstPunchDeviceId: firstPunchDeviceId,
//                 lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
//                 lastPunchAttendanceId: lastPunchAttendanceId,
//                 lastPunchDeviceId: lastPunchDeviceId,
//                 totalHours: (totalMinutesWorked / 60).toFixed(2), // Convert minutes to hours for display
//                 overtime: parseFloat((overtimeMinutes / 60).toFixed(2)), // Overtime in hours, ensure it's not NULL
//                 status,
//                 creationDate: new Date(),
//             });

//             // Insert into LabourAttendanceDetails
//             for (let dayAttendance of dailyAttendance) {
//                 //console.log(`Inserting Attendance for ${labourId} on ${dayAttendance.date}:`, dayAttendance);
//                 await labourModel.insertIntoLabourAttendanceDetails(dayAttendance);
//             }

//             // Create and insert summary data
//             const summary = {
//                 labourId,
//                 projectName: parseInt(labour.projectName, 10),
//                 totalDays: 1, // Daily attendance
//                 presentDays,
//                 halfDays,
//                 missPunchDays,
//                 absentDays,
//                 totalOvertimeMinutes,
//                 shift: workingHours,
//                 creationDate: new Date(),
//                 selectedMonth: date.substring(0, 7), // e.g., "2024-09"
//             };

//             //console.log(`Summary for LabourId ${labourId}:`, summary);
//             await labourModel.insertIntoLabourAttendanceSummary(summary);
//         }

//         //console.log('Daily attendance processed successfully');
//     } catch (err) {
//         console.error('Error processing attendance:', err);
//         throw err;
//     }
// }

/**
 * Processes and records the attendance of all approved labours for a specific date.
 * Implements rules for Present, Half Day, Absent, and Miss Punch statuses based on punch data.
 * @param {string} date - The date for which to process attendance (ISO format string).
 */
async function processLaboursAttendance(date) {
    try {
        const attendanceDate = new Date(date);
        if (isNaN(attendanceDate.getTime())) {
            throw new Error('Invalid date format');
        }

        const approvedLabours = await labourModel.getAllApprovedLabours();

        if (!approvedLabours || approvedLabours.length === 0) {
            console.log('No approved labours found');
            return;
        }

        for (let labour of approvedLabours) {
            const { labourId, workingHours } = labour;
            const shiftHours = getShiftHours(workingHours);
            const halfDayHours = getHalfDayHours(shiftHours);

            let presentDays = 0;
            let halfDays = 0;
            let missPunchDays = 0;
            let absentDays = 0;
            let totalOvertimeHours = 0;
            let dailyAttendance = [];

            const labourAttendance = await labourModel.getAttendanceByLabourIdForDate(labourId, attendanceDate);

            // Determine attendance status based on punches
            const { status, firstPunch, lastPunch, misPunch, totalHours } = determineStatus(
                labourAttendance,
                shiftHours,
                halfDayHours,
                workingHours
            );

            let overtimeHours = 0;
            let firstPunchAttendanceId = null;
            let firstPunchDeviceId = null;
            let lastPunchAttendanceId = null;
            let lastPunchDeviceId = null;

            if (firstPunch) {
                firstPunchAttendanceId = firstPunch.attendance_id;
                firstPunchDeviceId = firstPunch.Device_id;
            }

            if (lastPunch) {
                lastPunchAttendanceId = lastPunch.attendance_id;
                lastPunchDeviceId = lastPunch.Device_id;
            }

            // Update counters based on status
            switch (status) {
                case 'P':
                    presentDays++;
                    overtimeHours = totalHours > shiftHours ? parseFloat((totalHours - shiftHours).toFixed(2)) : 0;
                    break;
                case 'HD':
                    halfDays++;
                    break;
                case 'MP':
                    missPunchDays++;
                    break;
                case 'A':
                    absentDays++;
                    break;
                default:
                    absentDays++;
            }

            totalOvertimeHours += overtimeHours;

            // Ensure totalHours is a valid number
            const safeTotalHours = typeof totalHours === 'number' && !isNaN(totalHours) ? totalHours : 0;

            // Prepare attendance record for the day
            dailyAttendance.push({
                labourId,
                projectName: parseInt(labour.projectName, 10),
                date: attendanceDate.toISOString().split('T')[0],
                firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
                firstPunchAttendanceId: firstPunchAttendanceId,
                firstPunchDeviceId: firstPunchDeviceId,
                lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
                lastPunchAttendanceId: lastPunchAttendanceId,
                lastPunchDeviceId: lastPunchDeviceId,
                totalHours: safeTotalHours.toFixed(2),
                overtime: overtimeHours.toFixed(2),
                status,
                misPunch,
                creationDate: new Date(),
            });

            // Insert into LabourAttendanceDetails
            for (let dayAttendance of dailyAttendance) {
                // console.log(`Inserting Attendance for ${labourId} on ${dayAttendance.date}:`, dayAttendance);
                await labourModel.insertIntoLabourAttendanceDetails(dayAttendance);
            }

            // Create and insert summary data
            const summary = {
                labourId,
                projectName: parseInt(labour.projectName, 10),
                totalDays: 1, // Since processing a single date
                presentDays,
                halfDays,
                missPunchDays,
                absentDays,
                totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
                shift: workingHours,
                creationDate: new Date(),
                selectedMonth: attendanceDate.toISOString().substring(0, 7), // e.g., "2024-11"
            };
//  console.log(`Summary for LabourId ${labourId}:`, summary);
            await labourModel.insertIntoLabourAttendanceSummary(summary);
        }

        console.log('Daily attendance processed successfully');
    } catch (err) {
        console.error('Error processing attendance:', err);
        throw err; // Re-throw the error if needed elsewhere
    }
}

// New API endpoint to get cached attendance
async function getCachedAttendance(req, res) {
    try {
        if (!cachedAttendance) {
            return res.status(404).json({ message: 'No cached attendance data available' });
        }
        logger.info('Returning cached attendance data to frontend');
        res.json(cachedAttendance);
    } catch (err) {
        logger.error('Error getting cached attendance data', err);
        res.status(500).json({ message: 'Error getting cached attendance data' });
    }
}

// Helper function to calculate hours worked between two times (dynamic date)
// function calculateHoursWorked(punchDate, firstPunch, lastPunch) {
//     // Ensure firstPunch and lastPunch times have the correct date
//     const punchDateStr = punchDate.toISOString().split('T')[0]; // Extract date from punchDate
//     const punchInTime = new Date(`${punchDateStr}T${firstPunch.toISOString().split('T')[1]}`); // Combine date and time
//     const punchOutTime = new Date(`${punchDateStr}T${lastPunch.toISOString().split('T')[1]}`); // Combine date and time

//     const totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60); // Convert milliseconds to hours
//     return totalHours.toFixed(2);  // Return hours with 2 decimal places
// }

// cron.schedule('0 1 * * *', async () => {
//     cronLogger.info('Starting cron job to fetch and save daily attendance data');
//     try {
//         const currentDate = new Date();
//         const dateString = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
//         const approvedLabours = await labourModel.getAllApprovedLabours();

//         for (let labour of approvedLabours) {
//             const { labourId, workingHours } = labour;

//             const attendanceData = await labourModel.getAttendanceByLabourId(labourId, currentDate.getMonth() + 1, currentDate.getFullYear());
//             const punchesForDay = attendanceData.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === dateString);

//             let status = 'A'; // Default to Absent
//             let firstPunch = null;
//             let lastPunch = null;
//             let totalHours = 0;
//             let overtimeHours = 0;

//             const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//             const halfDayHours = shiftHours === 9 ? 4.5 : 4;

//             if (punchesForDay.length > 0) {
//                 punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

//                 firstPunch = punchesForDay[0].punch_time;
//                 lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;

//                 totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
//                 overtimeHours = totalHours > shiftHours ? totalHours - shiftHours : 0;

//                 if (totalHours > halfDayHours) {
//                     status = 'P'; // Present
//                 }
//             }

//             // Insert the attendance record into the database
//             const pool = await poolPromise;
//             await pool.request()
//                 .input('LabourID', sql.NVarChar, labourId)
//                 .input('Date', sql.Date, dateString)
//                 .input('FirstPunch', sql.DateTime, firstPunch)
//                 .input('LastPunch', sql.DateTime, lastPunch)
//                 .input('Status', sql.NVarChar, status)
//                 .input('TotalHours', sql.Float, totalHours)
//                 .input('OvertimeHours', sql.Float, overtimeHours)
//                 .input('ShiftHours', sql.Int, shiftHours)
//                 .query(`
//                     INSERT INTO [dbo].[DailyAttendance] (
//                         LabourID, Date, FirstPunch, LastPunch, Status, TotalHours, OvertimeHours, ShiftHours
//                     )
//                     VALUES (@LabourID, @Date, @FirstPunch, @LastPunch, @Status, @TotalHours, @OvertimeHours, @ShiftHours)
//                 `);

//             cronLogger.info(`Attendance saved for Labour ID: ${labourId} on ${dateString}`);
//         }

//         cronLogger.info('Daily attendance data fetched and saved successfully.');
//     } catch (err) {
//         cronLogger.error('Error during daily attendance cron job', err);
//     }
// });

// Schedule cron job to run every 20 days at 1:00 AM
cron.schedule('47 11 * * *', async () => {
    cronLogger.info('Scheduled cron triggered...');
    await runDailyAttendanceCron();
});
// cron.schedule('28 14 * * *', async () => {
//     cronLogger.info('Scheduled cron triggered...');
//     if (currentProcessingMonth) {
//         await getAllLaboursAttendanceCron();
//     } else {
//         //console.log('No further months to process. Cron execution skipped.');
//         cronLogger.info('No further months to process. Cron execution skipped.');
//     }
// });


// --------------------------------------------------------------------------------

// cron.schedule('32 11 * * *', async () => {
//     cronLogger.info('Starting cron job to fetch and cache attendance data');
//     try {
//         const currentDate = new Date();
//         const currentMonth = currentDate.getMonth() + 1;
//         const currentYear = currentDate.getFullYear();

//         const approvedLabours = await labourModel.getAllApprovedLabours();
//         const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
//         const results = [];

//         for (let i = 0; i < approvedLabours.length; i++) {
//             const { labourId, workingHours } = approvedLabours[i];
//             cronLogger.info(`Fetching attendance for labour ID: ${labourId}`);
//             const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, currentMonth, currentYear);
//             // cronLogger.info(`Fetched attendance for labour ID ${labourId}:`, { labourAttendance });

//             const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//             const halfDayHours = shiftHours === 9 ? 4.5 : 4;
//             const maxOvertimeHours = 120;
//             let presentDays = 0;
//             let totalOvertimeHours = 0;
//             let monthlyAttendance = [];

//             for (let day = 1; day <= daysInMonth; day++) {
//                 const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//                 const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

//                 if (punchesForDay.length > 0) {
//                     punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

//                     const firstPunch = punchesForDay[0].punch_time;
//                     const lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;

//                     const totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
//                     let overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;

//                     // Apply half-day logic
//                     if (totalHours > halfDayHours && totalHours < shiftHours) {
//                         overtime = 0; // No overtime if hours are between half-day and full shift
//                     }

//                     presentDays++;
//                     totalOvertimeHours += overtime;

//                     monthlyAttendance.push({
//                         date,
//                         firstPunch: `${date}T${firstPunch.toISOString().split('T')[1]}`,
//                         lastPunch: `${date}T${lastPunch.toISOString().split('T')[1]}`,
//                         status: 'P',
//                         totalHours,
//                         overtime
//                     });
//                 } else {
//                     monthlyAttendance.push({
//                         date,
//                         status: 'A',
//                         totalHours: 0,
//                         overtime: 0
//                     });
//                 }
//             }

//             // Cap the total overtime hours to the maximum allowed
//             totalOvertimeHours = Math.min(totalOvertimeHours, maxOvertimeHours);

//             const calculatedAttendance = {
//                 labourId,
//                 totalDays: daysInMonth,
//                 presentDays,
//                 totalOvertimeHours,
//                 shift: workingHours,
//                 monthlyAttendance
//             };

//             cronLogger.info('Calculated attendance for labour ID:', { labourId, calculatedAttendance });
//             //console.log('Calculated attendance for labour ID newly attendance:', labourId, calculatedAttendance);

//             results.push(calculatedAttendance);
//         }

//         // Log the calculated attendance for all labours
//         cronLogger.info('Calculated attendance for all approved labours:', { results });

//         cronLogger.info('Completed fetching attendance for all approved labours:', { results });

//         // Cache the results
//         cachedAttendance = results;
//     } catch (err) {
//         cronLogger.error('Error during cron job to fetch attendance data', err);
//     }
// });




// -------------------------------------------------  IMP START--------------------------

// // Cache for attendance data
// let cachedAttendance = null;
// // Create a separate logger for this cron job
// const cronLogger = createLogger({
//     level: 'info',
//     format: format.combine(
//         format.timestamp(),
//         format.json()
//     ),
//     transports: [
//         new transports.File({ filename: 'cron_attendance.log' })
//     ]
// });

// async function getAttendance(req, res) {
//     try {
//         const { labourId } = req.params; // Labour ID from the URL parameter
//         const { month, year } = req.query; // Month and year from query params
//         logger.info('Received request for attendance:', { labourId, month, year });

//         // Fetch attendance for the specific labour, month, and year
//         const attendance = await labourModel.getAttendanceByLabourId(labourId, month, year);
//         logger.info('Attendance data fetched from the database:', attendance);

//         if (!attendance || attendance.length === 0) {
//             logger.info('No attendance found for this labour in the selected month');
//             return res.status(404).json({ message: 'No attendance found for this labour in the selected month' });
//         }

//         // Fetch the working hours for the labour
//         const labourDetails = await labourModel.getLabourDetailsById(labourId);
//         const shiftHours = labourDetails.workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//         const halfDayHours = shiftHours === 9 ? 4.5 : 4;
//         const maxOvertimeHours = 120; // Maximum OT cap for the month

//         const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the month

//         // Initialize the variables
//         let totalDays = daysInMonth;
//         let presentDays = 0;
//         let totalOvertimeHours = 0;
//         let monthlyAttendance = [];

//         for (let day = 1; day <= daysInMonth; day++) {
//             const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//             const punchesForDay = attendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

//             if (punchesForDay.length > 0) {
//                 // Sort punches to get the first and last punch of the day
//                 punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

//                 const firstPunch = punchesForDay[0].punch_time;
//                 const lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;

//                 const totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
//                 let overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;

//                 // Apply half-day logic
//                 if (totalHours > halfDayHours && totalHours < shiftHours) {
//                     overtime = 0; // No overtime if hours are between half-day and full shift
//                 }

//                 presentDays++;
//                 totalOvertimeHours += overtime;

//                 monthlyAttendance.push({
//                     date,
//                     firstPunch: `${date}T${firstPunch.toISOString().split('T')[1]}`,
//                     lastPunch: `${date}T${lastPunch.toISOString().split('T')[1]}`,
//                     status: 'P', // Present
//                     totalHours,
//                     overtime
//                 });
//             } else {
//                 monthlyAttendance.push({
//                     date,
//                     status: 'A', // Absent if no punch data
//                     totalHours: 0,
//                     overtime: 0
//                 });
//             }
//         }

//         // Cap the total overtime hours to the maximum allowed
//         totalOvertimeHours = Math.min(totalOvertimeHours, maxOvertimeHours);

//         logger.info('Calculated attendance:', {
//             totalDays,
//             presentDays,
//             totalOvertimeHours,
//             shift: labourDetails.workingHours,
//             monthlyAttendance
//         });

//         // Return the calculated attendance data
//         res.json({
//             labourId,
//             totalDays,
//             presentDays,
//             totalOvertimeHours,
//             shift: labourDetails.workingHours,
//             monthlyAttendance
//         });
//     } catch (err) {
//         logger.error('Error getting attendance for month', err);
//         res.status(500).json({ message: 'Error getting attendance for the month' });
//     }
// };

// async function getAllLaboursAttendance(req, res) {
//     try {
//         const { month, year } = req.query;
//         logger.info('Received request for attendance for approved labors:', { month, year });

//         const parsedMonth = parseInt(month, 10);
//         const parsedYear = parseInt(year, 10);

//         if (isNaN(parsedMonth) || isNaN(parsedYear)) {
//             return res.status(400).json({ message: 'Invalid month or year' });
//         }

//         // Serve cached results to the frontend
//         if (cachedAttendance) {
//             logger.info('Returning cached attendance data');
//             return res.json(cachedAttendance);
//         }

//         // Fetch all approved labour IDs and their working hours
//         const approvedLabours = await labourModel.getAllApprovedLabours();

//         if (!approvedLabours || approvedLabours.length === 0) {
//             logger.info('No approved labours found');
//             return res.status(404).json({ message: 'No approved labours found' });
//         }

//         const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();
//         const results = [];

//         // Fetch attendance for approved labour IDs
//         for (let i = 0; i < approvedLabours.length; i++) {
//             const { labourId, workingHours } = approvedLabours[i];
//             logger.info(`Fetching attendance for labour ID: ${labourId}`);
//             const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);
//             logger.info(`Fetched attendance for labour ID ${labourId}:`, labourAttendance);

//             const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//             const halfDayHours = shiftHours === 9 ? 4.5 : 4;
//             const maxOvertimeHours = 120; // Maximum OT cap for the month
//             let presentDays = 0;
//             let totalOvertimeHours = 0;
//             let monthlyAttendance = [];

//             for (let day = 1; day <= daysInMonth; day++) {
//                 const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//                 const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

//                 if (punchesForDay.length > 0) {
//                     punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

//                     const firstPunch = punchesForDay[0].punch_time;
//                     const lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;

//                     const totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
//                     let overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;

//                     // Apply half-day logic
//                     if (totalHours > halfDayHours && totalHours < shiftHours) {
//                         overtime = 0; // No overtime if hours are between half-day and full shift
//                     }

//                     presentDays++;
//                     totalOvertimeHours += overtime;

//                     monthlyAttendance.push({
//                         date,
//                         firstPunch: `${date}T${firstPunch.toISOString().split('T')[1]}`,
//                         lastPunch: `${date}T${lastPunch.toISOString().split('T')[1]}`,
//                         status: 'P',
//                         totalHours,
//                         overtime
//                     });
//                 } else {
//                     monthlyAttendance.push({
//                         date,
//                         status: 'A',
//                         totalHours: 0,
//                         overtime: 0
//                     });
//                 }
//             }

//             // Cap the total overtime hours to the maximum allowed
//             totalOvertimeHours = Math.min(totalOvertimeHours, maxOvertimeHours);

//             const calculatedAttendance = {
//                 labourId,
//                 totalDays: daysInMonth,
//                 presentDays,
//                 totalOvertimeHours,
//                 shift: workingHours,
//                 monthlyAttendance
//             };

//             logger.info('Calculated attendance for labour ID:', labourId, calculatedAttendance);

//             results.push(calculatedAttendance);
//         }

//         logger.info('Completed fetching attendance for all approved labours:', results);

//         // Cache the results
//         cachedAttendance = results;

//         // Return the calculated attendance data
//         res.json(results);
//     } catch (err) {
//         logger.error('Error getting attendance for approved labours for the month', err);
//         res.status(500).json({ message: 'Error getting attendance for approved labours for the month' });
//     }
// };

// // Helper function to calculate hours worked between two times (dynamic date)
// function calculateHoursWorked(punchDate, firstPunch, lastPunch) {
//     // Ensure firstPunch and lastPunch times have the correct date
//     const punchDateStr = punchDate.toISOString().split('T')[0]; // Extract date from punchDate
//     const punchInTime = new Date(`${punchDateStr}T${firstPunch.toISOString().split('T')[1]}`); // Combine date and time
//     const punchOutTime = new Date(`${punchDateStr}T${lastPunch.toISOString().split('T')[1]}`); // Combine date and time

//     const totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60); // Convert milliseconds to hours
//     return totalHours.toFixed(2);  // Return hours with 2 decimal places
// }


// // cron.schedule('0 */12 * * *', async () => {
//     cron.schedule('58 17 * * *', async () => {
//         cronLogger.info('Starting cron job to fetch and cache attendance data');
//         try {
//             const currentDate = new Date();
//             const currentMonth = currentDate.getMonth() + 1;
//             const currentYear = currentDate.getFullYear();
    
//             const approvedLabours = await labourModel.getAllApprovedLabours();
//             const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
//             const results = [];
    
//             for (let i = 0; i < approvedLabours.length; i++) {
//                 const { labourId, workingHours } = approvedLabours[i];
//                 cronLogger.info(`Fetching attendance for labour ID: ${labourId}`);
//                 const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, currentMonth, currentYear);
//                 // cronLogger.info(`Fetched attendance for labour ID ${labourId}:`, { labourAttendance });
    
//                 const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
//                 const halfDayHours = shiftHours === 9 ? 4.5 : 4;
//                 const maxOvertimeHours = 120;
//                 let presentDays = 0;
//                 let totalOvertimeHours = 0;
//                 let monthlyAttendance = [];
    
//                 for (let day = 1; day <= daysInMonth; day++) {
//                     const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//                     const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);
    
//                     if (punchesForDay.length > 0) {
//                         punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));
    
//                         const firstPunch = punchesForDay[0].punch_time;
//                         const lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;
    
//                         const totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
//                         let overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;
    
//                         // Apply half-day logic
//                         if (totalHours > halfDayHours && totalHours < shiftHours) {
//                             overtime = 0; // No overtime if hours are between half-day and full shift
//                         }
    
//                         presentDays++;
//                         totalOvertimeHours += overtime;
    
//                         monthlyAttendance.push({
//                             date,
//                             firstPunch: `${date}T${firstPunch.toISOString().split('T')[1]}`,
//                             lastPunch: `${date}T${lastPunch.toISOString().split('T')[1]}`,
//                             status: 'P',
//                             totalHours,
//                             overtime
//                         });
//                     } else {
//                         monthlyAttendance.push({
//                             date,
//                             status: 'A',
//                             totalHours: 0,
//                             overtime: 0
//                         });
//                     }
//                 }
    
//                 // Cap the total overtime hours to the maximum allowed
//                 totalOvertimeHours = Math.min(totalOvertimeHours, maxOvertimeHours);
    
//                 const calculatedAttendance = {
//                     labourId,
//                     totalDays: daysInMonth,
//                     presentDays,
//                     totalOvertimeHours,
//                     shift: workingHours,
//                     monthlyAttendance
//                 };
    
//                 cronLogger.info('Calculated attendance for labour ID:', { labourId, calculatedAttendance });
//                 //console.log('Calculated attendance for labour ID newly attendance:', labourId, calculatedAttendance);
    
//                 results.push(calculatedAttendance);
//             }
    
//             // Log the calculated attendance for all labours
//             cronLogger.info('Calculated attendance for all approved labours:', { results });
    
//             cronLogger.info('Completed fetching attendance for all approved labours:', { results });
    
//             // Cache the results
//             cachedAttendance = results;
//         } catch (err) {
//             cronLogger.error('Error during cron job to fetch attendance data', err);
//         }
//     });
    
// -------------------------------------------------  IMP  END --------------------------




async function submitAttendanceController(req, res) {
    try {
        const { labourId, punchType, punchDate, punchTime } = req.body;

        if (!labourId || !punchType || !punchDate || !punchTime) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Fetch existing miss punch count for the labour
        const labourPunchCount = await labourModel.getMissPunchCount(labourId, punchDate);

        if (!labourPunchCount) {
            return res.status(404).json({ message: "Labour data not found." });
        }

        // Check if miss punch entries exceed the limit of 3
        if (labourPunchCount.missPunchCount >= 3) {
            // Route to admin for approval
            const adminApproval = await labourModel.addApprovalRequest(labourId, punchType, punchDate, punchTime);
            if (adminApproval) {
                return res.status(200).json({ message: "Punch entry sent for admin approval." });
            } else {
                return res.status(500).json({ message: "Failed to send for admin approval." });
            }
        }

        // If within limit, add the punch directly
        const success = await labourModel.addMissPunch(labourId, punchType, punchDate, punchTime);
        if (success) {
            return res.status(200).json({ message: "Punch entry added successfully." });
        } else {
            return res.status(500).json({ message: "Failed to add punch entry." });
        }
    } catch (error) {
        logger.error("Error handling punch entry:", error);
        res.status(500).json({ message: "Error handling punch entry." });
    }
}



// Add a weekly off for a labour
async function addWeeklyOff(req, res) {
    try {
        const { LabourID, offDate, addedBy } = req.body;

        if (!LabourID || !offDate) {
            return res.status(400).json({ message: 'Labour ID and Off Date are required.' });
        }

        // Check if the weekly off already exists
        const existingOff = await labourModel.getWeeklyOff(LabourID, offDate);
        if (existingOff) {
            return res.status(409).json({ message: 'Weekly off already exists for this date.' });
        }

        // Add the weekly off to the database
        const success = await labourModel.addWeeklyOff(LabourID, offDate, addedBy);
        if (success) {
            return res.status(200).json({ message: 'Weekly off added successfully.' });
        } else {
            return res.status(500).json({ message: 'Failed to add weekly off.' });
        }
    } catch (err) {
        console.error('Error adding weekly off:', err);
        res.status(500).json({ message: 'Error adding weekly off.' });
    }
}

// Check if a date is a weekly off for a labour
async function isWeeklyOff(LabourID, date) {
    try {
        const result = await labourModel.getWeeklyOff(LabourID, date);
        return !!result; // Returns true if the date is a weekly off
    } catch (err) {
        console.error('Error checking if date is a weekly off', err);
        throw new Error('Error checking if date is a weekly off');
    }
}

// Save multiple weekly offs for a month
async function saveWeeklyOffs(req, res) {
    try {
        const { LabourID, month, year, weeklyOffCount } = req.body;

        if (!LabourID || !month || !year || weeklyOffCount === undefined) {
            return res.status(400).json({ message: 'Labour ID, month, year, and weekly off count are required.' });
        }

        // Calculate Sundays for the month
        const sundays = [];
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            if (date.getDay() === 0) {
                sundays.push(date.toISOString().split('T')[0]);
            }
        }

        // Adjust the Sundays based on the weeklyOffCount
        const weeklyOffDates = sundays.slice(0, weeklyOffCount);

        // Save the weekly offs to the database
        const success = await labourModel.saveWeeklyOffs(LabourID, weeklyOffDates);
        if (success) {
            return res.status(200).json({ message: 'Weekly offs saved successfully.' });
        } else {
            return res.status(500).json({ message: 'Failed to save weekly offs.' });
        }
    } catch (err) {
        console.error('Error saving weekly offs:', err);
        res.status(500).json({ message: 'Error saving weekly offs.' });
    }
}

async function getDisabledMonthsAndYears(req, res) {
    try {
        const pool = await poolPromise;

        // SQL Query to extract distinct years and months from SelectedMonth
        const result = await pool.request().query(`
            SELECT DISTINCT 
                CAST(LEFT(SelectedMonth, 4) AS INT) AS Year, -- Extract year (first 4 characters)
                CAST(RIGHT(SelectedMonth, 2) AS INT) AS Month -- Extract month (last 2 characters)
            FROM [dbo].[LabourAttendanceSummary];
        `);

        // Map the results to return only month and year
        const disabledPeriods = result.recordset.map(record => ({
            month: record.Month,
            year: record.Year,
        }));

        // Send the response
        res.status(200).json(disabledPeriods);
    } catch (err) {
        console.error("Error fetching disabled months and years:", err);

        // Send a proper error response
        res.status(500).json({ message: "Error fetching disabled months and years", error: err.message });
    }
}

async function deleteAttendance(req, res) {
    const { month, year } = req.body;

    if (!month || !year) {
        return res.status(400).json({ message: 'Month and Year are required' });
    }

    try {
        // Delete records from LabourAttendanceDetails
        await labourModel.deleteAttendanceDetails(month, year);
        // Delete records from LabourAttendanceSummary
        await labourModel.deleteAttendanceSummary(month, year);

        res.status(200).json({ message: 'Attendance deleted successfully' });
    } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({ message: 'Error deleting attendance', error });
    }
}


// ------------------------------------------------- Fetch Attendance code ------------------------------

async function getAttendanceSummary(req, res) {
    try {
        const summary = await labourModel.fetchAttendanceSummary();
        res.status(200).json(summary);
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ message: 'Error fetching attendance summary' });
    }
};


async function getAttendanceDetails(req, res) {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ message: 'Month and Year are required' });
    }

    try {
        const details = await labourModel.fetchAttendanceDetailsByMonthYear(month, year);
        res.status(200).json(details);
    } catch (error) {
        console.error('Error fetching attendance details:', error);
        res.status(500).json({ message: 'Error fetching attendance details' });
    }
}


async function getAttendanceDetailsForSingleLabour(req, res) {
    const { id: labourId } = req.params; // LabourId from route parameter
    const { month, year } = req.query;

    if (!labourId || !month || !year) {
        return res.status(400).json({ message: 'Labour ID, Month, and Year are required' });
    }

    try {
        const details = await labourModel.fetchAttendanceDetailsByMonthYearForSingleLabour(labourId, month, year);
        res.status(200).json(details);
    } catch (error) {
        console.error('Error fetching attendance details for a single labour:', error);
        res.status(500).json({ message: 'Error fetching attendance details' });
    }
}


async function getAttendanceCalenderSingleLabour(req, res) {
    const { id: labourId } = req.params;
    const { month, year } = req.query;
  
    if (!labourId || !month || !year) {
      return res.status(400).json({ message: 'Labour ID, Month, and Year are required' });
    }
  
    try {
      const details = await labourModel.showAttendanceCalenderSingleLabour(labourId, month, year);
      res.status(200).json(details);
    } catch (error) {
      console.error('Error fetching attendance details for a single labour:', error);
      res.status(500).json({ message: 'Error fetching attendance details' });
    }
  };
  

async function saveAttendance(req, res) {
    const { labourId, month, year, attendance } = req.body;

    if (!labourId || !month || !year || !attendance) {
        return res.status(400).json({ message: 'Invalid input: Labour ID, Month, Year, and Attendance data are required' });
    }

    try {
        await labourModel.saveFullMonthAttendance(labourId, month, year, attendance);
        res.status(200).json({ message: 'Attendance saved successfully' });
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({ message: 'Error saving attendance' });
    }
};


async function getAttendanceByMonthYear(req, res) {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ message: 'Month and Year are required' });
    }

    try {
        const attendance = await labourModel.fetchAttendanceByMonthYear(month, year);
        res.status(200).json(attendance);
    } catch (error) {
        console.error('Error fetching attendance by month and year:', error);
        res.status(500).json({ message: 'Error fetching attendance data' });
    }
};


// async function upsertAttendance(req, res) {
//     const {
//         labourId,
//         date,
//         firstPunchManually,
//         lastPunchManually,
//         overtimeManually,
//         remarkManually,
//     } = req.body;

//     // Validate input
//     if (!labourId || !date) {
//         return res.status(400).json({
//             message: 'Labour ID and date are required.',
//         });
//     }

//     try {
//         // Call the model to perform upsert
//         await labourModel.upsertAttendance({
//             labourId,
//             date,
//             firstPunchManually,
//             lastPunchManually,
//             overtimeManually,
//             remarkManually,
//         });

//         res.status(200).json({ message: 'Attendance updated successfully.' });
//     } catch (error) {
//         console.error('Error updating attendance+++++==:', error);
//         res.status(500).json({ message: 'Error updating attendance.' });
//     }
// }

// -------------------------------------------------------  EXCEL BUTTON FOR DOWNLOAD ----------------------

async function upsertAttendance(req, res) {
    const {
        labourId,
        date,
        AttendanceId,
        firstPunchManually,
        lastPunchManually,
        overtimeManually,
        remarkManually,
        workingHours,
        onboardName,
        AttendanceStatus,
    } = req.body;
    //console.log('req.body the upsertAttendance', req.body)

    // Validate input
    if (!labourId || !date) {
        return res.status(400).json({
            message: 'Labour ID and Date are required.',
        });
    }

    if (
        !firstPunchManually &&
        !lastPunchManually &&
        (!overtimeManually || String(overtimeManually).trim() === '')
    ) {
        return res.status(400).json({
            message: 'At least one of Overtime, First Punch, or Last Punch must be provided.',
        });
    }
    if (AttendanceId === undefined || AttendanceId === null || isNaN(AttendanceId)) {
        console.error('Invalid AttendanceId:', AttendanceId);
        return res.status(400).json({
            message: 'AttendanceId must be a valid number and cannot be empty.',
        });
    }
    try {
        // Extract the first valid OnboardName
        let finalOnboardName = Array.isArray(onboardName)
            ? onboardName.filter((name) => name !== 'null' && name.trim() !== '')[0]
            : onboardName;

            const timesUpdated = await labourModel.getTimesUpdateForMonth(labourId, date);

            if (AttendanceStatus !== "MP") {
                await labourModel.markAttendanceForApproval(AttendanceId, labourId, date, overtimeManually, firstPunchManually, lastPunchManually, remarkManually, finalOnboardName);
                return res.status(200).json({ message: 'Attendance sent To ADMIN APPROVAL.' });
            };

            if (AttendanceStatus === "MP" && timesUpdated >= 3) {
                await labourModel.markAttendanceForApproval(AttendanceId, labourId, date, overtimeManually, firstPunchManually, lastPunchManually, remarkManually, finalOnboardName);
                return res.status(200).json({ message: 'Attendance sent To ADMIN APPROVAL.' });
            };

        // Call the model to perform upsert
        await labourModel.upsertAttendance({
            labourId,
            date,
            firstPunchManually,
            lastPunchManually,
            overtimeManually,
            remarkManually,
            workingHours,
            onboardName: finalOnboardName,
            editUserName: finalOnboardName, 
        });

        res.status(200).json({ message: 'Attendance updated successfully.' });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}

async function approveAttendanceController(req, res) {
    const { id } = req.query;
console.log('id',id)
    if (!id) {
        return res.status(400).json({ message: 'id is required.' });
    }

    try {
        const result = await labourModel.approveAttendance(id);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in approving attendance:', error);
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}

async function rejectAttendanceControllerAdmin(req, res) {
    const { id, rejectReason } = req.query;
//console.log('id___rejectAttendanceControllerAdmin',req.query)
    if (!id) {
        return res.status(400).json({ message: 'id is required.' });
    }

    try {
        const result = await labourModel.rejectAttendanceAdmin(id, rejectReason);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in approving attendance:', error);
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}


async function rejectAttendanceController(req, res) {
    const id = parseInt(req.params.id, 10); // Extract ID from route parameter
    const { rejectReason } = req.body; // Extract rejection reason from request body

    //console.log('req.params.id', req.params.id)
    //console.log('req.body:', req.body); // Debug log
    //console.log('rejectReason:', rejectReason); // Debug log

    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid attendance ID.' });
    }

    if (!rejectReason || rejectReason.trim() === '') {
        return res.status(400).json({ message: 'Reject reason is required.' });
    }

    try {
        const success = await labourModel.rejectAttendance(id, rejectReason); // Call model function
        if (success) {
            res.json({ success: true, message: 'Attendance rejected successfully.' });
        } else {
            res.status(404).json({ message: 'Attendance not found or already rejected.' });
        }
    } catch (error) {
        console.error('Error rejecting attendance:', error);
        res.status(500).json({ message: error.message });
    }
}


// -------------------------------------------------------------  Excel import and Export controller function ----------------
const exportAttendance = async (req, res) => {
    try {
        const { startDate, endDate, projectName } = req.query;

        if (!startDate || !endDate || !projectName) {
            return res.status(400).json({ message: 'Missing required parameters: startDate, endDate, or projectId.' });
        }

        // Fetch attendance data filtered by date range and projectId
        const attendanceData = await labourModel.getAttendanceByDateRange(projectName, startDate, endDate);

        if (attendanceData.length === 0) {
            return res.status(404).json({ message: 'No attendance data found for the selected criteria.' });
        }

        // Create Excel workbook and worksheet
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(attendanceData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Labour Attendance');

        // Generate Excel file as buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set headers and send response
        res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting attendance:', error);
        res.status(500).json({ message: 'Error exporting attendance data.' });
    }
};

  const importAttendance = async (req, res) => {
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);

        //console.log('Excel data loaded:', data);

        // Convert Excel date serial to valid date string
        const convertExcelDate = (serial) => {
            const utcDays = Math.floor(serial - 25569);
            const utcValue = utcDays * 86400;
            const dateInfo = new Date(utcValue * 1000);
            return dateInfo.toISOString().split('T')[0]; // Format YYYY-MM-DD
        };

        // Normalize data
        const validData = data.map((row) => ({
            ...row,
            Date: typeof row.Date === 'number' ? convertExcelDate(row.Date) : row.Date,
        }));

        //console.log('Normalized data:', validData);

        // Match rows and separate matched and unmatched
        const { matchedRows, unmatchedRows } = await labourModel.getMatchedRows(validData);

        //console.log('Matched rows:', matchedRows);
        //console.log('Unmatched rows:', unmatchedRows);

        // Update matched rows in bulk
        if (matchedRows.length > 0) {
            await labourModel.updateMatchedRows(matchedRows);
            //console.log(`${matchedRows.length} rows updated successfully.`);
        }

        // Insert unmatched rows in bulk
        if (unmatchedRows.length > 0) {
            await labourModel.insertUnmatchedRows(unmatchedRows);
            //console.log(`${unmatchedRows.length} rows inserted successfully.`);
        }

        res.send({
            message: 'Data imported successfully',
            matchedRows: matchedRows.length,
            unmatchedRows: unmatchedRows.length,
        });
    } catch (error) {
        console.error('Error importing data:', error);
        res.status(500).send({ message: error.message });
    }
};

async function LabourAttendanceApproval(req, res) {
    try {
        const summary = await labourModel.LabourAttendanceApprovalModel();
        res.status(200).json(summary);
    } catch (error) {
        console.error('Error fetching attendance Attendance Approval:', error);
        res.status(500).json({ message: 'Error fetching Attendance Approval' });
    }
};

//   -----------------------------------------------  imp change 06-12-2024  ----------------------
//   const importAttendance = async (req, res) => {
//     try {
//       const workbook = xlsx.readFile(req.file.path);
//       const sheet = workbook.Sheets[workbook.SheetNames[0]];
//       const data = xlsx.utils.sheet_to_json(sheet);
  
//       //console.log('Excel data loaded:', data);
  
//       // Convert Excel date serial to valid date string
//       const convertExcelDate = (serial) => {
//         const utcDays = Math.floor(serial - 25569);
//         const utcValue = utcDays * 86400;
//         const dateInfo = new Date(utcValue * 1000);
//         return dateInfo.toISOString().split('T')[0]; // Format YYYY-MM-DD
//       };
  
//       // Normalize data
//       const validData = data.map((row) => ({
//         ...row,
//         Date: typeof row.Date === 'number' ? convertExcelDate(row.Date) : row.Date,
//       }));
  
//       //console.log('Normalized data:', validData);
  
//       // Match rows
//       const { matchedRows, unmatchedRows } = await labourModel.getMatchedRows(validData);
  
//       //console.log('Matched rows:', matchedRows);
//       //console.log('Unmatched rows:', unmatchedRows);
  
//       // Update matched rows
//       if (matchedRows.length > 0) {
//         await labourModel.updateMatchedRows(matchedRows);
//         //console.log(`${matchedRows.length} rows updated successfully.`);
//       }
  
//       // Insert unmatched rows
//       if (unmatchedRows.length > 0) {
//         await labourModel.insertUnmatchedRows(unmatchedRows);
//         //console.log(`${unmatchedRows.length} rows inserted successfully.`);
//       }
  
//       res.send({
//         message: 'Data imported successfully',
//         matchedRows: matchedRows.length,
//         unmatchedRows: unmatchedRows.length,
//       });
//     } catch (error) {
//       console.error('Error importing data:', error);
//       res.status(500).send({ message: error.message });
//     }
//   };
  
// ---------------------------------       end imp changes 06-12-2024-----------------------

// --------------------------------------------------    LABOUR WAGES MODULE 20-12-2024  ----------------------------------------------------



const getLabourMonthlyWages = async (req, res) => {
    try {
        const wages = await labourModel.getLabourMonthlyWages();
        res.status(200).json(wages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wages', error });
    }
};

// Add or update labour monthly wages
// const upsertLabourMonthlyWages = async (req, res) => {
//     try {
//         const payload = req.body;
//         //console.log('payload for wages', payload)

//         // Validate required fields
//         if (!payload.labourId || !payload.payStructure) {
//             return res.status(400).json({ message: 'Labour ID and Pay Structure are required' });
//         }

//         await labourModel.upsertLabourMonthlyWages(payload);
//         res.status(200).json({ message: 'Wages updated successfully' });
//     } catch (error) {
//         console.error('Error updating wages:', error);
//         res.status(500).json({ message: 'Error updating wages', error });
//     }
// };

const upsertLabourMonthlyWages = async (req, res) => {
    try {
        const payload = req.body;

        if (!payload.labourId || !payload.payStructure) {
            return res.status(400).json({ message: 'Labour ID and Pay Structure are required' });
        }

        // Call labourModel function to insert/update wages
        const result = await labourModel.upsertLabourMonthlyWages(payload);

        if (result && result.WageID) {
            return res.status(200).json({ WageID: result.WageID, message: 'Wages upserted successfully' });
        } else {
            return res.status(500).json({ message: 'Failed to upsert wages' });
        }

    } catch (error) {
        console.error('Error in upsertLabourMonthlyWages:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};



// const upsertLabourMonthlyWages = async (req, res) => {
//     try {
//         const payload = req.body;
//         if (!payload.labourId || !payload.payStructure) {
//             return res.status(400).json({ message: 'Labour ID and Pay Structure are required' });
//         }

//         // Check if wages for the labour in the current month already exist
//         const existingWages = await labourModel.checkExistingWages(payload.labourId);
//         //console.log('payload of wages 55',existingWages)

//         if (existingWages) {
//             if (existingWages.ApprovalStatus === 'Pending') {
//                 return res.status(400).json({ message: 'Wages for this month are pending admin approval.' });
//             } else if (existingWages.ApprovalStatus === 'Approved') {
//                 // Send wages to admin for re-approval
//                 await labourModel.markWagesForApproval(payload);
//                 return res.status(200).json({ message: 'Wages changes sent for admin approval.' });
//             }
//         } else {
//             // Add wages directly for the first time
//             await labourModel.upsertLabourMonthlyWages(payload);
//             return res.status(200).json({ message: 'Wages added successfully.' });
//         }
//     } catch (error) {
//         console.error('Error updating wages:', error);
//         res.status(500).json({ message: 'Error updating wages', error });
//     }
// };

const checkExistingWagesController = async (req, res) => {
    try {
        const { labourId } = req.query;
        if (!labourId) {
            return res.status(400).json({ message: 'Labour ID is required' });
        }

        const existingWages = await labourModel.checkExistingWages(labourId);

        if (existingWages) {
            res.status(200).json({
                exists: true,
                approved: existingWages.ApprovalStatus === 'Approved',
                data: existingWages,
            });
        } else {
            res.status(200).json({ exists: false });
        }
    } catch (error) {
        console.error('Error checking existing wages:', error);
        res.status(500).json({ message: 'Error checking existing wages', error });
    }
};

const markWagesForApprovalController = async (req, res) => {
    try {
        const payload = req.body;
        const { wageId, labourId, dailyWages, perHourWages, monthlyWages, yearlyWages, effectiveDate, fixedMonthlyWages, weeklyOff, payStructure, wagesEditedBy, remarks } = payload;
console.log('payload for wages new 55',payload)
        if (!wageId || !labourId || !payStructure) {
            return res.status(400).json({ message: 'Wage ID, Labour ID, and Pay Structure are required' });
        }

        const result = await labourModel.markWagesForApproval(
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
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error marking wages for approval:', error.message || error);
        return res.status(500).json({ message: 'Error marking wages for approval', error: error.message || error });
    }
};



// Get wage approvals
const getWagesAdminApprovals = async (req, res) => {
    try {
        const approvals = await labourModel.getWagesAdminApprovals();
        res.status(200).json(approvals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching approvals', error });
    }
};

// Approve or reject wages
const handleApproval = async (req, res) => {
    try {
        const { WageID, approvalStatus, remarks } = req.body;

        if (!WageID || !['Approved', 'Rejected'].includes(approvalStatus)) {
            return res.status(400).json({ message: 'Invalid approval data provided.' });
        }

        if (approvalStatus === 'Approved') {
            await labourModel.approveWages(WageID);
        } else if (approvalStatus === 'Rejected') {
            await labourModel.rejectWages(WageID, remarks);
        }

        res.status(200).json({ message: `Wages ${approvalStatus.toLowerCase()} successfully.` });
    } catch (error) {
        console.error('Error handling approval:', error);
        res.status(500).json({ message: 'Error handling approval.', error });
    }
};

async function approveWagesControllerAdmin(req, res) {
    const { ApprovalID } = req.query;
    //console.log('id___approveWagesControllerAdmin',ApprovalID)
    if (!ApprovalID) {
        return res.status(400).json({ message: 'WageID is required.' });
    }

    try {
        const result = await labourModel.approveWages(ApprovalID);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in approving Wages:', error);
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}

async function rejectWagesControllerAdmin(req, res) {
    const { ApprovalID, Remarks } = req.query; // Ensure Remarks is fetched from query
    //console.log('id___rejectWagesControllerAdmin', req.query);

    if (!ApprovalID) {
        return res.status(400).json({ message: 'ApprovalID is required.' });
    }

    try {
        const result = await labourModel.rejectWages(ApprovalID, Remarks);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in rejecting Wages:', error);
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}



// Add a wage approval
const addWageApproval = async (req, res) => {
    try {
        await labourModel.addWageApproval(req.body);
        res.status(201).json({ message: 'Approval added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding approval', error });
    }
};

const exportWagesexcelSheet = async (req, res) => {
    try {
        let { projectName, month } = req.query;

        if (!month) {
            return res.status(400).json({ message: 'Missing required parameter: month' });
        }

        if (!projectName || projectName.trim() === "") {
            projectName = "all";  // ✅ Ensure "all" is used instead of an empty string
        }

        const startDate = `${month}-01`;
        const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1) - 1)
            .toISOString()
            .split('T')[0];

        console.log(`Fetching wages for projectName: ${projectName}, startDate: ${startDate}, endDate: ${endDate}`);

        // Fetch wages data
        const wagesData = await labourModel.getWagesByDateRange(projectName, startDate, endDate);

        if (!wagesData || wagesData.length === 0) {
            return res.status(404).json({ message: 'No data found for the selected criteria.' });
        }

        // Create Excel workbook and worksheet
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(wagesData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Labour Wages');

        // Generate Excel file as buffer
        const fileName = projectName === "all"
            ? `Approved_Labours_${month}.xlsx`
            : `Wages_${projectName}_${month}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    } catch (error) {
        console.error('Error exporting Wages:', error);
        res.status(500).json({ message: 'Error exporting Wages data.' });
    }
};

/**
 * Converts an Excel serial date to a JavaScript Date object.
 * @param {number} serial - Excel serial date number
 * @returns {Date | null} - JavaScript Date object or null if invalid
 */
const xlsxDateToJSDate = (serial) => {
    if (isNaN(serial)) return null; // Handle invalid serials
    const excelEpoch = new Date(Date.UTC(1900, 0, 1)); // Excel starts from 1900-01-01
    const daysSinceEpoch = serial - 1; // Excel includes a non-existent 1900-02-29
    const millisecondsPerDay = 24 * 60 * 60 * 1000; // Milliseconds in a day
    return new Date(excelEpoch.getTime() + daysSinceEpoch * millisecondsPerDay);
};

const importWages = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const wagesEditedBy = req.body.wagesEditedBy || 'System';
        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const errors = [];
        for (const [index, row] of rows.entries()) {
            try {
                // Convert Excel date to JavaScript date if From_Date is defined
                if (row.From_Date) {
                    row.From_Date = xlsxDateToJSDate(row.From_Date);
                }

                // Insert row into the database
                row.WagesEditedBy = wagesEditedBy;
                await labourModel.insertWagesData(row);
            } catch (error) {
                // Log error details
                row.Error = error.message;
                row.RowNumber = index + 1;
                errors.push(row);
            }
        }

        fs.unlinkSync(filePath); // Clean up uploaded file
         //console.log(' errors===errors',errors)
        if (errors.length > 0) {
            // Generate error Excel file
            const errorWorkbook = xlsx.utils.book_new();
            const errorSheet = xlsx.utils.json_to_sheet(errors);
            xlsx.utils.book_append_sheet(errorWorkbook, errorSheet, 'Errors');
            const buffer = xlsx.write(errorWorkbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="Error_Rows.xlsx"');
            return res.status(200).send(buffer); // Return Excel file for errors
        }

        res.status(200).json({ message: 'Data imported successfully!' });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ message: 'Internal server error. Please try again.' });
    }
};


// const getWagesAndLabourOnboardingJoincontroller = async (req, res) => {
//     try {
//         const joinWagesLabour = await labourModel.getWagesAndLabourOnboardingJoin();
//         res.status(200).json(joinWagesLabour);
//     } catch (error) {
//         console.error('Error fetching data:', error);
//         res.status(500).json({ message: 'Error fetching data', error });
//     }
// };

const getWagesAndLabourOnboardingJoincontroller = async (req, res) => {
    try {
      // Get filters from query parameters (e.g., ?ProjectID=...&DepartmentID=...)
      const filters = req.query;
      const joinWagesLabour = await labourModel.getWagesAndLabourOnboardingJoin(filters);
      res.status(200).json(joinWagesLabour);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ message: 'Error fetching data', error });
    }
  };

async function searchLaboursFromWages(req, res) {
    const { q } = req.query;

    try {
        const results = await labourModel.searchFromWages(q);
        return res.json(results);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}



module.exports = {
    handleCheckAadhaar,
    getNextUniqueID,
    createRecord,
    getAllRecords,
    getRecordById,
    updateRecord,
    deleteRecord,
    searchLabours,
    getAllLabours,
    approveLabour,
    rejectLabour,
    getApprovedLabours,
    resubmitLabour,
    esslapi,
    updateRecordLabour,
    createRecordUpdate,
    getCommandStatus,
    editbuttonLabour,
    updateRecordWithDisable,
    getUserStatusController,
    updateHideResubmitLabour,
    getAttendance,
    submitAttendanceController,
    getAllLaboursAttendance,
    getCachedAttendance,
    approveDisableLabour,
    addWeeklyOff,
    isWeeklyOff,
    saveWeeklyOffs,
    getDisabledMonthsAndYears,
    deleteAttendance,
    getAttendanceSummary,
    getAttendanceDetails,
    saveAttendance,
    getAttendanceByMonthYear,
    getAttendanceDetailsForSingleLabour,
    upsertAttendance,
    exportAttendance,
    importAttendance,
    approveAttendanceController,
    LabourAttendanceApproval,
    rejectAttendanceController,
    rejectAttendanceControllerAdmin,
    getAttendanceCalenderSingleLabour,
    // getLabourStatus
    // getEsslStatuses,
    // getEmployeeMasterStatuses
    // updateLabour
    getLabourMonthlyWages,
    upsertLabourMonthlyWages,
    getWagesAdminApprovals,
    addWageApproval,
    exportWagesexcelSheet,
    importWages,
    getWagesAndLabourOnboardingJoincontroller,
    searchLaboursFromWages,
    handleApproval,
    approveWagesControllerAdmin,
    rejectWagesControllerAdmin,
    checkExistingWagesController,
    markWagesForApprovalController
};
