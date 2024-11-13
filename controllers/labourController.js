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
// const { sql, poolPromise2 } = require('../config/dbConfig');

const baseUrl = 'http://localhost:4000/uploads/';
// const baseUrl = 'https://laboursandbox.vjerp.com/uploads/';
// const baseUrl = 'https://vjlabour.vjerp.com/uploads/';



async function handleCheckAadhaar(req, res) {
    const { aadhaarNumber } = req.body;
    console.log('Request Body: AadhaarNumber:', aadhaarNumber);

    try {
        const labourRecord = await labourModel.checkAadhaarExists(aadhaarNumber);

        if (labourRecord) {
            // Condition 1: Check for 'Resubmitted' and 'isApproved' === 3
            if (labourRecord.status === 'Resubmitted' && labourRecord.isApproved === 3) {
                console.log("Returning skipCheck for Resubmitted and isApproved 3");
                return res.status(200).json({ exists: false, skipCheck: true, LabourID: labourRecord.LabourID });
            }

            // Condition 2: If LabourID exists, return LabourID
            if (labourRecord.LabourID) {
                console.log(`LabourID found: ${labourRecord.LabourID}`);
                return res.status(200).json({
                    exists: true,
                    LabourID: labourRecord.LabourID
                });
            }

            console.log("Returning exists true for regular record");
            return res.status(200).json({ exists: true });
        } else {
            console.log("Returning exists false");
            return res.status(200).json({ exists: false });
        }
    } catch (error) {
        console.error('Error in handleCheckAadhaar:', error);
        return res.status(500).json({ error: 'Error checking Aadhaar number' });
    }
}


// async function handleCheckAadhaar(req, res) {
//     const { aadhaarNumber } = req.body;
//     console.log('Request Body: AaadharNumber Ch----------', req.body);

//     try {
//         const labourRecord = await labourModel.checkAadhaarExists(aadhaarNumber);

//         if (labourRecord) {
//             if (labourRecord.status === 'Resubmitted' && labourRecord.isApproved === 3) {
//                 console.log("Returning skipCheck for Resubmitted and isApproved 3");
//                 return res.status(200).json({ exists: false, skipCheck: true });
//             } else {
//                 console.log("Returning exists true");
//                 return res.status(200).json({ exists: true });
//             }
//         } else {
//             console.log("Returning exists false");
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
        const nextID = await labourModel.getNextUniqueID();
        res.json({ nextID });
    } catch (error) {
        console.error('Error in getNextUniqueID:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    };
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
        console.log('Received IDs:', { departmentId, designationId, labourCategoryId });
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

        console.log(`Querying for projectName: ${projectName}`); // Debug log

        const projectResult = await projectRequest.query(query);

        if (projectResult.recordset.length === 0) {
            // console.log('Invalid project name:', projectName); 
            return res.status(400).json({ msg: 'Invalid project name' });
        }

        const location = projectResult.recordset[0].Description; // Store the Business_Unit name in location
        const businessUnit = projectResult.recordset[0].Description;
        console.log(`Found project Description: ${location}, BusinessUnit: ${businessUnit}`);

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
        console.log('Received OnboardName:', finalOnboardName);
        const data = await labourModel.registerData({
            labourOwnership, uploadAadhaarFront: frontImageUrl, uploadAadhaarBack: backImageUrl, uploadIdProof: IdProofImageUrl, uploadInductionDoc: uploadInductionDocImageUrl, name, aadhaarNumber,
            dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date: dateOfJoining, ConfirmDate: dateOfJoining, From_Date: fromDate.toISOString().split('T')[0], Period: period, address, pincode, taluka,
            district, village, state, emergencyContact, photoSrc: photoSrcUrl, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours, location, SalaryBu: salaryBu, businessUnit,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName: finalOnboardName, expiryDate, ValidTill: validTillDate.toISOString().split('T')[0],
            retirementDate: retirementDate.toISOString().split('T')[0], WorkingBu: location, CreationDate: creationDate.toISOString(), departmentId, departmentName, designationId, labourCategoryId
        });
        console.log('Inserted OnboardName:', finalOnboardName);
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
    console.log("getRecordById")
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
        console.log('Request Body: check----------', req.body);
        console.log('Request Files:', req.files); 

        const {
            labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate, departmentId, designationId
        } = req.body;

        let finalOnboardName = Array.isArray(OnboardName) ? OnboardName.filter(name => name !== 'null' && name.trim() !== '')[0] : OnboardName;
        
        if (!finalOnboardName || finalOnboardName.trim() === '') {
            console.error('OnboardName is missing or empty.');
            return res.status(400).json({ msg: 'OnboardName is required.' });
        }

        console.log('Cleaned OnboardName Resubmitted button:', finalOnboardName);


        const labourCategoryMap = {
            'SKILLED': 1,
            'UN-SKILLED': 2,
            'SEMI-SKILLED': 3
        };

        const safeLabourCategoryId = String(labourCategoryMap[labourCategory]) || null;

        if (safeLabourCategoryId === null) {
            console.log('Invalid labourCategory:', labourCategory);
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

        console.log('Converted Values:', {
            safeProjectName,
            safeDepartmentId,
            safeDesignationId,
            safeLabourCategoryId
        });

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

        const processFileField = (fileField, reqFile) => {
            if (typeof fileField === 'string' && fileField.startsWith('http')) {
                return fileField; // URL
            } else if (reqFile) {
                return baseUrl + path.basename(reqFile[0].path); // Binary data uploaded, get URL path
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

        console.log(`Querying for projectName: ${safeProjectName}`); // Debug log

        const projectResult = await projectRequest.query(query);

        if (projectResult.recordset.length === 0) {
            console.log('Invalid project name:', safeProjectName); // Debug log
            return res.status(400).json({ msg: 'Invalid project name-------' });
        }

        const location = projectResult.recordset[0].Description; // Store the Business_Unit name in location
        const businessUnit = projectResult.recordset[0].Description;
        console.log(`Found project Description: ${location}, BusinessUnit: ${businessUnit}`);

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
        console.log('Setting SQL input for departmentId:', safeDepartmentId);
        if (safeDepartmentId !== null) {
            departmentRequest.input('departmentId', safeDepartmentId);
            console.log("departmentId", departmentId)
        } else {
            console.log('Invalid departmentId provided:', departmentId);
            return res.status(400).send('Invalid departmentId');
        }

        const departmentQuery = `
            SELECT a.Description AS Department_Name
            FROM Payroll.Department a
            WHERE a.Id = @departmentId
        `;
        const departmentResult = await departmentRequest.query(departmentQuery);

        if (departmentResult.recordset.length === 0) {
            console.log('Department not found for departmentId:', safeDepartmentId);
            return res.status(404).send('Department not found');
        }

        const departmentName = departmentResult.recordset[0].Department_Name;

        const creationDate = new Date();


        console.log('Received OnboardName Resubmmit button functionlity:', finalOnboardName);

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


        console.log('dataupdate', data)

        return res.status(201).json({ msg: "User created successfully", data: data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Internal server error' });
    }
}







async function updateRecord(req, res) {
    try {
        // Log the full request body and files for debugging
        console.log('Request Body:', req.body);
        console.log('Request Files:', req.files); // Logs undefined when no files are uploaded

        // Extract fields from request body
        const {
            LabourID, labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate, departmentId, designationId
        } = req.body;

        console.log('LabourID from request body:', LabourID);
        let finalOnboardName = Array.isArray(OnboardName) ? OnboardName.filter(name => name !== 'null' && name.trim() !== '')[0] : OnboardName;
        
        if (!finalOnboardName || finalOnboardName.trim() === '') {
            console.error('OnboardName is missing or empty.');
            return res.status(400).json({ msg: 'OnboardName is required.' });
        }

        console.log('Cleaned OnboardName:', finalOnboardName);
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
            console.log('Invalid labourCategory:', labourCategory);
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

        const processFileField = (fileField, reqFile) => {
            if (typeof fileField === 'string' && fileField.startsWith('http')) {
                return fileField;
            } else if (reqFile) {
                return baseUrl + path.basename(reqFile[0].path);
            }
            return null;
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

        console.log(`Querying for projectName: ${safeProjectName}`);

        const projectResult = await projectRequest.query(query);

        if (projectResult.recordset.length === 0) {
            console.log('Invalid project name:', safeProjectName);
            return res.status(400).json({ msg: 'Invalid project name' });
        }

        const location = projectResult.recordset[0].Description;
        const businessUnit = projectResult.recordset[0].Description;
        console.log(`Found project Description: ${location}, BusinessUnit: ${businessUnit}`);

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
            console.log('Department not found for departmentId:', safeDepartmentId);
            return res.status(404).send('Department not found');
        }

        const departmentName = departmentResult.recordset[0].Department_Name;

        const creationDate = new Date();
        console.log('Received OnboardName Edit button functionlity:', finalOnboardName);
        // Prepare data for update
        const data = await labourModel.updateData({
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

        console.log("Data after update:", data);

        if (!data) {
            return res.status(404).json({ msg: 'No data updated' });
        }
        console.log('Inserted OnboardName Edit button functionlity:', finalOnboardName);
        return res.status(200).json({ msg: "User updated successfully", data: data });
    } catch (err) {
        console.error('Error updating record:', err.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
}
















async function updateRecordWithDisable(req, res) {
    try {
        console.log('Request Body: check----------', req.body);
        console.log('Request Files:', req.files); 

        const {
            labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate, departmentId, designationId
        } = req.body;

        let finalOnboardName = Array.isArray(OnboardName) ? OnboardName.filter(name => name !== 'null' && name.trim() !== '')[0] : OnboardName;
        
        if (!finalOnboardName || finalOnboardName.trim() === '') {
            console.error('OnboardName is missing or empty.');
            return res.status(400).json({ msg: 'OnboardName is required.' });
        }

        console.log('Cleaned OnboardName Resubmitted button:', finalOnboardName);


        const labourCategoryMap = {
            'SKILLED': 1,
            'UN-SKILLED': 2,
            'SEMI-SKILLED': 3
        };

        const safeLabourCategoryId = String(labourCategoryMap[labourCategory]) || null;

        if (safeLabourCategoryId === null) {
            console.log('Invalid labourCategory:', labourCategory);
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

        console.log('Converted Values:', {
            safeProjectName,
            safeDepartmentId,
            safeDesignationId,
            safeLabourCategoryId
        });

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

        const processFileField = (fileField, reqFile) => {
            if (typeof fileField === 'string' && fileField.startsWith('http')) {
                return fileField; // URL
            } else if (reqFile) {
                return baseUrl + path.basename(reqFile[0].path); // Binary data uploaded, get URL path
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

        console.log(`Querying for projectName: ${safeProjectName}`); // Debug log

        const projectResult = await projectRequest.query(query);

        if (projectResult.recordset.length === 0) {
            console.log('Invalid project name:', safeProjectName); // Debug log
            return res.status(400).json({ msg: 'Invalid project name-------' });
        }

        const location = projectResult.recordset[0].Description; // Store the Business_Unit name in location
        const businessUnit = projectResult.recordset[0].Description;
        console.log(`Found project Description: ${location}, BusinessUnit: ${businessUnit}`);

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
        console.log('Setting SQL input for departmentId:', safeDepartmentId);
        if (safeDepartmentId !== null) {
            departmentRequest.input('departmentId', safeDepartmentId);
            console.log("departmentId", departmentId)
        } else {
            console.log('Invalid departmentId provided:', departmentId);
            return res.status(400).send('Invalid departmentId');
        }

        const departmentQuery = `
            SELECT a.Description AS Department_Name
            FROM Payroll.Department a
            WHERE a.Id = @departmentId
        `;
        const departmentResult = await departmentRequest.query(departmentQuery);

        if (departmentResult.recordset.length === 0) {
            console.log('Department not found for departmentId:', safeDepartmentId);
            return res.status(404).send('Department not found');
        }

        const departmentName = departmentResult.recordset[0].Department_Name;

        const creationDate = new Date();


        console.log('Received OnboardName Resubmmit button functionlity:', finalOnboardName);

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


        console.log('dataupdate', data)

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
//         console.log('Incoming request body:', req.body);  
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
//         console.log('Updating record with ID:', id);
//         console.log('Updated data:', updatedData);

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
        // console.log('Updating record with ID:', id);
        // console.log('Updated data:', updatedData);

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
    // console.log(`Received id: ${req.params.id}, Parsed id: ${id}`);

    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid labour ID' });
    }

    try {
        const nextID = await labourModel.getNextUniqueID(); // Generate next unique LabourID
        // const onboardName = req.body.OnboardName;

        console.log('Approving labour ID:', id);
        console.log('Generated nextID:', nextID);
        // console.log('OnboardName:', onboardName);

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

async function rejectLabour(req, res) {
    // console.log('Fetching rejected labours...');
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
        // console.log('Fetching approved labours...');
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
//         // console.log("approvedLabours : " + approvedLabours);

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

        console.log("Parsed Approved Labours:", { userId, LabourID, name });

        const esslapiurl = 'https://essl.vjerp.com:8530/iclock/webapiservice.asmx?op=AddEmployee';
        const response = await axios.post(esslapiurl, approvedLaboursXml, {
            headers: {
                'Content-Type': 'text/xml'
            }
        });

        const esslResponseData = response.data;
        console.log("Raw XML Response:", esslResponseData); // Debugging: Check raw XML response

        // Parse the XML response correctly
        const parsedResponse = await parseEsslResponse(esslResponseData);
        const { Status: esslStatus = 'false', CommandId: esslCommandId = null } = parsedResponse;

        console.log("Parsed Response - Status:", esslStatus); // Debugging: Check the parsed status
        console.log("Parsed Response - CommandId:", esslCommandId); // Debugging: Check the parsed command ID

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

        console.log("Parsed XML Data Structure:", parsedData); // Debugging: Check parsed XML structure

        // Extract Status and CommandId using the correct path
        const status = parsedData['soap:Envelope']['soap:Body']['AddEmployeeResponse']['AddEmployeeResult'];
        const commandId = parsedData['soap:Envelope']['soap:Body']['AddEmployeeResponse']['CommandId'];

        // If status is not found or is not 'success', set it to 'false'
        const result = {
            Status: status && status.toLowerCase() === 'success' ? status : 'false',
            CommandId: commandId || null
        };

        console.log("XML Parsed Result:", result); // Debugging: Check parsed result
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

        console.log("Data to be saved to DB:", {
            userId: data.userId,  // Corrected to match the parsed XML id
            LabourID: data.LabourID,
            name: data.name,
            esslStatus: data.esslStatus,
            esslCommandId: data.esslCommandId,
            esslPayload: esslPayloadString,
            esslApiResponse: esslApiResponseString
        });

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
//         console.log('Received request for attendance:', { labourId, month, year });

//         // Fetch attendance for the specific labour, month, and year
//         const attendance = await labourModel.getAttendanceByLabourId(labourId, month, year);
//         console.log('Attendance data fetched from the database:', attendance);

//         if (!attendance || attendance.length === 0) {
//             console.log('No attendance found for this labour in the selected month');
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

//         console.log('Calculated attendance:', {
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
//         console.log('Received request for attendance for approved labors:', { month, year });

//         const parsedMonth = parseInt(month, 10);
//         const parsedYear = parseInt(year, 10);

//         if (isNaN(parsedMonth) || isNaN(parsedYear)) {
//             return res.status(400).json({ message: 'Invalid month or year' });
//         }

//         // Fetch all approved labour IDs and their working hours
//         const approvedLabours = await labourModel.getAllApprovedLabours();

//         if (!approvedLabours || approvedLabours.length === 0) {
//             console.log('No approved labours found');
//             return res.status(404).json({ message: 'No approved labours found' });
//         }

//         const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();
//         const results = [];
//         const limit = 100; // Limit to 100 labours

//         // Fetch attendance for approved labour IDs (limit to 100)
//         for (let i = 0; i < Math.min(approvedLabours.length, limit); i++) {
//             const { labourId, workingHours } = approvedLabours[i];
//             console.log(`Fetching attendance for labour ID: ${labourId}`);
//             const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);
//             console.log(`Fetched attendance for labour ID ${labourId}:`, labourAttendance);

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

//             console.log('Calculated attendance for labour ID:', labourId, calculatedAttendance);

//             results.push(calculatedAttendance);
//         }

//         // console.log('Completed fetching attendance for all approved labours:', results);

//         // Write results to a JSON file
//         const filePath = path.join(__dirname, `attendance_${parsedMonth}_${parsedYear}.json`);
//         fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
//         console.log('Attendance data written to JSON file:', filePath);

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

async function getAttendance(req, res) {
    try {
        const { labourId } = req.params; // Labour ID from the URL parameter
        const { month, year } = req.query; // Month and year from query params
        logger.info('Received request for attendance:', { labourId, month, year });

        // Fetch attendance for the specific labour, month, and year
        const attendance = await labourModel.getAttendanceByLabourId(labourId, month, year);
        logger.info('Attendance data fetched from the database:', attendance);

        if (!attendance || attendance.length === 0) {
            logger.info('No attendance found for this labour in the selected month');
            return res.status(404).json({ message: 'No attendance found for this labour in the selected month' });
        }

        // Fetch the working hours for the labour
        const labourDetails = await labourModel.getLabourDetailsById(labourId);
        const shiftHours = labourDetails.workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
        const halfDayHours = shiftHours === 9 ? 4.5 : 4;
        const maxOvertimeHours = 120; // Maximum OT cap for the month

        const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the month

        // Initialize the variables
        let totalDays = daysInMonth;
        let presentDays = 0;
        let totalOvertimeHours = 0;
        let monthlyAttendance = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const punchesForDay = attendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

            if (punchesForDay.length > 0) {
                // Sort punches to get the first and last punch of the day
                punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

                const firstPunch = punchesForDay[0].punch_time;
                const lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;

                const totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
                let overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;

                // Apply half-day logic
                if (totalHours > halfDayHours && totalHours < shiftHours) {
                    overtime = 0; // No overtime if hours are between half-day and full shift
                }

                presentDays++;
                totalOvertimeHours += overtime;

                monthlyAttendance.push({
                    date,
                    firstPunch: `${date}T${firstPunch.toISOString().split('T')[1]}`,
                    lastPunch: `${date}T${lastPunch.toISOString().split('T')[1]}`,
                    status: 'P', // Present
                    totalHours,
                    overtime
                });
            } else {
                monthlyAttendance.push({
                    date,
                    status: 'A', // Absent if no punch data
                    totalHours: 0,
                    overtime: 0
                });
            }
        }

        // Cap the total overtime hours to the maximum allowed
        totalOvertimeHours = Math.min(totalOvertimeHours, maxOvertimeHours);

        logger.info('Calculated attendance:', {
            totalDays,
            presentDays,
            totalOvertimeHours,
            shift: labourDetails.workingHours,
            monthlyAttendance
        });

        // Return the calculated attendance data
        res.json({
            labourId,
            totalDays,
            presentDays,
            totalOvertimeHours,
            shift: labourDetails.workingHours,
            monthlyAttendance
        });
    } catch (err) {
        logger.error('Error getting attendance for month', err);
        res.status(500).json({ message: 'Error getting attendance for the month' });
    }
};

async function getAllLaboursAttendance(req, res) {
    try {
        const { month, year } = req.query;
        logger.info('Received request for attendance for approved labors:', { month, year });

        const parsedMonth = parseInt(month, 10);
        const parsedYear = parseInt(year, 10);

        if (isNaN(parsedMonth) || isNaN(parsedYear)) {
            return res.status(400).json({ message: 'Invalid month or year' });
        }

        // Serve cached results to the frontend
        if (cachedAttendance) {
            logger.info('Returning cached attendance data');
            return res.json(cachedAttendance);
        }

        // Fetch all approved labour IDs and their working hours
        const approvedLabours = await labourModel.getAllApprovedLabours();

        if (!approvedLabours || approvedLabours.length === 0) {
            logger.info('No approved labours found');
            return res.status(404).json({ message: 'No approved labours found' });
        }

        const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();
        const results = [];

        // Fetch attendance for approved labour IDs
        for (let i = 0; i < approvedLabours.length; i++) {
            const { labourId, workingHours } = approvedLabours[i];
            logger.info(`Fetching attendance for labour ID: ${labourId}`);
            const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);
            logger.info(`Fetched attendance for labour ID ${labourId}:`, labourAttendance);

            const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
            const halfDayHours = shiftHours === 9 ? 4.5 : 4;
            const maxOvertimeHours = 120; // Maximum OT cap for the month
            let presentDays = 0;
            let totalOvertimeHours = 0;
            let monthlyAttendance = [];

            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

                if (punchesForDay.length > 0) {
                    punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

                    const firstPunch = punchesForDay[0].punch_time;
                    const lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;

                    const totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
                    let overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;

                    // Apply half-day logic
                    if (totalHours > halfDayHours && totalHours < shiftHours) {
                        overtime = 0; // No overtime if hours are between half-day and full shift
                    }

                    presentDays++;
                    totalOvertimeHours += overtime;

                    monthlyAttendance.push({
                        date,
                        firstPunch: `${date}T${firstPunch.toISOString().split('T')[1]}`,
                        lastPunch: `${date}T${lastPunch.toISOString().split('T')[1]}`,
                        status: 'P',
                        totalHours,
                        overtime
                    });
                } else {
                    monthlyAttendance.push({
                        date,
                        status: 'A',
                        totalHours: 0,
                        overtime: 0
                    });
                }
            }

            // Cap the total overtime hours to the maximum allowed
            totalOvertimeHours = Math.min(totalOvertimeHours, maxOvertimeHours);

            const calculatedAttendance = {
                labourId,
                totalDays: daysInMonth,
                presentDays,
                totalOvertimeHours,
                shift: workingHours,
                monthlyAttendance
            };

            logger.info('Calculated attendance for labour ID:', labourId, calculatedAttendance);

            results.push(calculatedAttendance);
        }

        logger.info('Completed fetching attendance for all approved labours:', results);

        // Cache the results
        cachedAttendance = results;

        // Return the calculated attendance data
        res.json(results);
    } catch (err) {
        logger.error('Error getting attendance for approved labours for the month', err);
        res.status(500).json({ message: 'Error getting attendance for approved labours for the month' });
    }
};

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
function calculateHoursWorked(punchDate, firstPunch, lastPunch) {
    // Ensure firstPunch and lastPunch times have the correct date
    const punchDateStr = punchDate.toISOString().split('T')[0]; // Extract date from punchDate
    const punchInTime = new Date(`${punchDateStr}T${firstPunch.toISOString().split('T')[1]}`); // Combine date and time
    const punchOutTime = new Date(`${punchDateStr}T${lastPunch.toISOString().split('T')[1]}`); // Combine date and time

    const totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60); // Convert milliseconds to hours
    return totalHours.toFixed(2);  // Return hours with 2 decimal places
}

cron.schedule('32 10 * * *', async () => {
    cronLogger.info('Starting cron job to fetch and cache attendance data');
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const approvedLabours = await labourModel.getAllApprovedLabours();
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const results = [];

        for (let i = 0; i < approvedLabours.length; i++) {
            const { labourId, workingHours } = approvedLabours[i];
            cronLogger.info(`Fetching attendance for labour ID: ${labourId}`);
            const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, currentMonth, currentYear);
            // cronLogger.info(`Fetched attendance for labour ID ${labourId}:`, { labourAttendance });

            const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
            const halfDayHours = shiftHours === 9 ? 4.5 : 4;
            const maxOvertimeHours = 120;
            let presentDays = 0;
            let totalOvertimeHours = 0;
            let monthlyAttendance = [];

            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

                if (punchesForDay.length > 0) {
                    punchesForDay.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

                    const firstPunch = punchesForDay[0].punch_time;
                    const lastPunch = punchesForDay[punchesForDay.length - 1].punch_time;

                    const totalHours = calculateHoursWorked(punchesForDay[0].punch_date, firstPunch, lastPunch);
                    let overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;

                    // Apply half-day logic
                    if (totalHours > halfDayHours && totalHours < shiftHours) {
                        overtime = 0; // No overtime if hours are between half-day and full shift
                    }

                    presentDays++;
                    totalOvertimeHours += overtime;

                    monthlyAttendance.push({
                        date,
                        firstPunch: `${date}T${firstPunch.toISOString().split('T')[1]}`,
                        lastPunch: `${date}T${lastPunch.toISOString().split('T')[1]}`,
                        status: 'P',
                        totalHours,
                        overtime
                    });
                } else {
                    monthlyAttendance.push({
                        date,
                        status: 'A',
                        totalHours: 0,
                        overtime: 0
                    });
                }
            }

            // Cap the total overtime hours to the maximum allowed
            totalOvertimeHours = Math.min(totalOvertimeHours, maxOvertimeHours);

            const calculatedAttendance = {
                labourId,
                totalDays: daysInMonth,
                presentDays,
                totalOvertimeHours,
                shift: workingHours,
                monthlyAttendance
            };

            cronLogger.info('Calculated attendance for labour ID:', { labourId, calculatedAttendance });
            console.log('Calculated attendance for labour ID newly attendance:', labourId, calculatedAttendance);

            results.push(calculatedAttendance);
        }

        // Log the calculated attendance for all labours
        cronLogger.info('Calculated attendance for all approved labours:', { results });

        cronLogger.info('Completed fetching attendance for all approved labours:', { results });

        // Cache the results
        cachedAttendance = results;
    } catch (err) {
        cronLogger.error('Error during cron job to fetch attendance data', err);
    }
});




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
//                 console.log('Calculated attendance for labour ID newly attendance:', labourId, calculatedAttendance);
    
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



async function submitWagesController(req, res) {
    try {
        const { labourId, totalDays, presentDays, overtimeHours, totalWages } = req.body;
        await submitWages(labourId, totalDays, presentDays, overtimeHours, totalWages);
        res.json({ message: 'Wages submitted successfully' });
    } catch (err) {
        console.error('Error submitting wages', err);
        res.status(500).json({ message: 'Error submitting wages' });
    }
}



// async function submitWages(req, res) {
//     try {
//         const wagesData = req.body; // Array of wages data
//         await WagesModel.submitWages(wagesData);
//         res.status(200).json({ message: "Wages data submitted successfully!" });
//     } catch (err) {
//         console.error("Error submitting wages:", err);
//         res.status(500).json({ message: "Server error, unable to submit wages" });
//     }
// }


// async function getLabourStatus(req, res) {
//     try {
//         const labourId = parseInt(req.query.id || req.params.id); // parse the id from query or route params
        
//         // Validate if labourId is a valid number
//         if (isNaN(labourId)) {
//             return res.status(400).json({ message: 'Invalid labour ID' });
//         }

//         const pool = await poolPromise;

//         // Use the parsed id in the SQL query
//         const result = await pool.request()
//             .input('labourId', sql.Int, labourId) // Ensure labourId is passed as an integer
//             .query(`
//                 SELECT lo.id AS labourId, lo.name, aep.esslStatus, arp.employeeMasterStatus 
//                 FROM [LabourOnboardingForm_TEST].[dbo].[labourOnboarding] lo
//                 LEFT JOIN [LabourOnboardingForm_TEST].[dbo].[API_EsslPayloads] aep ON lo.id = aep.userId
//                 LEFT JOIN [LabourOnboardingForm_TEST].[dbo].[API_ResponsePayloads] arp ON lo.id = arp.userId
//                 WHERE lo.id = @labourId
//             `);

//         return res.status(200).json(result.recordset);
//     } catch (err) {
//         console.error('Error fetching labour statuses:', err);
//         return res.status(500).json({ message: 'Error fetching data' });
//     }
// }


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
    submitWagesController,
    getAllLaboursAttendance,
    getCachedAttendance
    // getLabourStatus
    // getEsslStatuses,
    // getEmployeeMasterStatuses
    // updateLabour
};
