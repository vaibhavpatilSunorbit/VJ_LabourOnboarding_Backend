const { sql, poolPromise2 } = require('../config/dbConfig2');
const { poolPromise3 } = require('../config/dbConfig3');
const { poolPromise } = require('../config/dbConfig');
const { poolPromise4 } = require('../config/dbConfigSCPL');
const path = require('path');
const fs = require('fs').promises;
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
const moment = require('moment');
const pdf = require('html-pdf');
// const uploadToS3Webp = require('../sheduler/s3upload')
const AWS = require("aws-sdk");
const sharp = require("sharp");
require("dotenv").config();


// AWS S3 Config
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// const { sql, poolPromise2 } = require('../config/dbConfig');

// const baseUrl = 'http://localhost:4000/uploads/';
// const baseUrl = 'https://laboursandbox.vjerp.com/uploads/';
const baseUrl = 'https://vjlabour.vjerp.com/uploads/';


const bucketName = "labour-be";
const baseS3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/imagesLive/`;

const LM_READ_TIMEOUT_MS = 90_000;
const LM_WRITE_TIMEOUT_MS = 45_000;
const LM_LOOKUP_TIMEOUT_MS = 30_000;
const LABOUR_CONCURRENCY = 12;     // 8–16 is a good range
const RETRIES_READ = 1;      // "small" retry: 1 extra try
const RETRIES_WRITE = 1;
const RETRIES_LOOKUP = 1;




// 🔹 Helper: upload buffer to S3 as webp
async function uploadToS3Webp(file, folder = "imagesLive") {
  if (!file) return null;

  const timestamp = Date.now();
  const randomString = Math.floor(Math.random() * 1e9);
  const fileName = `${timestamp}-${randomString}.webp`;
   const fileBuffer = await fs.readFile(file.path);

  // Convert to webp
  const webpBuffer = await sharp(fileBuffer).webp({ quality: 80 }).toBuffer();

  const s3Key = `${folder}/${fileName}`;

  await s3
    .upload({
      Bucket: bucketName,
      Key: s3Key,
      Body: webpBuffer,
      ContentType: "image/webp",
    })
    .promise();

  return `${baseS3Url}${fileName}`;
}


async function handleCheckAadhaar(req, res) {
    const { aadhaarNumber } = req.body;

    try {
        const labourRecords = await labourModel.checkAadhaarExists(aadhaarNumber);

        if (labourRecords && labourRecords.length > 0) {
            const resubmittedRecord = labourRecords.find(record =>
                (record.status === 'Pending' && record.isApproved === 0) ||
                (record.status === 'Approved' && record.isApproved === 1) ||
                (record.status === 'Rejected' && record.isApproved === 2)
            );

            if (resubmittedRecord) {
                const labourIDs = labourRecords.map(record => record.LabourID);

                return res.status(200).json({
                    exists: true,
                    LabourIDs: labourIDs
                });
            } else {
                const labourIDs = labourRecords.map(record => record.LabourID);
                return res.status(200).json({ exists: false, skipCheck: true, LabourIDs: labourIDs });
            }

        } else {
            return res.status(200).json({ exists: false });
        }
    } catch (error) {
        console.error('Error in handleCheckAadhaar:', error);
        return res.status(500).json({ error: 'Error checking Aadhaar number' });
    }
}

async function getNextUniqueID(req, res) {
    try {
        const departmentId = parseInt(req.query.departmentId, 10);
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
            contractorName, contractorNumber, designation, title, Marital_Status, Induction_Date, Inducted_By, OnboardName, expiryDate, departmentId, designationId, labourCategoryId } = req.body;

        const finalOnboardName = Array.isArray(OnboardName) ? OnboardName[0] : OnboardName;

        const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof, uploadInductionDoc } = req.files;
        // console.log('Received IDs:', { projectName, departmentId, designationId, labourCategoryId });
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

        // // const frontImageUrl = baseUrl + frontImageFilename;
        // const frontImageUrl = frontImageFilename ? baseUrl + frontImageFilename : null;
        // // const backImageUrl = baseUrl + backImageFilename;
        // const backImageUrl = backImageFilename ? baseUrl + backImageFilename : null;
        // const IdProofImageUrl = baseUrl + IdProofImageFilename;
        // const uploadInductionDocImageUrl = baseUrl + uploadInductionDocFilename;
        // const photoSrcUrl = baseUrl + photoSrcFilename;

        const frontImageUrl = uploadAadhaarFront ? await uploadToS3Webp(uploadAadhaarFront[0]) : null;
const backImageUrl = uploadAadhaarBack ? await uploadToS3Webp(uploadAadhaarBack[0]) : null;
const IdProofImageUrl = await uploadToS3Webp(uploadIdProof[0]);
const uploadInductionDocImageUrl = await uploadToS3Webp(uploadInductionDoc[0]);
const photoSrcUrl = await uploadToS3Webp(photoSrc[0]);

        const dateOfJoiningDate = new Date(dateOfJoining);
        const fromDate = dateOfJoiningDate;
        const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '-');

        const validTillDate = new Date(dateOfJoiningDate);
        validTillDate.setFullYear(validTillDate.getFullYear() + 1);

        const retirementDate = new Date(dateOfBirth);
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);

        // **********************************  NEW  ********************
        // Primary check on Framework.BusinessUnit (Server 1)
        const pool = await poolPromise4;
        const isNumeric = !isNaN(projectName);
        const projectRequest = pool.request();
        projectRequest.input('projectName', isNumeric ? sql.Int : sql.VarChar, projectName);

        let projectResult;
        let location = "";
        let businessUnit = "";
        let projectId;
        let parentId;

        // 1. Try primary query from Framework.BusinessUnit
        const primaryQuery = isNumeric
            ? `
                SELECT Id, Description, Type, Email1, ParentId 
                FROM Framework.BusinessUnit 
                WHERE Type = 'B' 
                AND (IsDiscontinueBU IS NULL OR IsDiscontinueBU = '' OR IsDiscontinueBU = 0) 
                AND (IsDeleted IS NULL OR IsDeleted = '' OR IsDeleted = 0)
                AND Id = @projectName
              `
            : `
                SELECT a.Id, a.Description, a.Type, a.Email1, a.ParentId
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.Description = @projectName
                AND (a.IsDiscontinueBU IS NULL OR a.IsDiscontinueBU = 0)
                AND (a.IsDeleted IS NULL OR a.IsDeleted = 0)
                AND b.Id = 3
              `;

        const primaryResult = await projectRequest.query(primaryQuery);

        if (primaryResult.recordset.length > 0) {
            const record = primaryResult.recordset[0];
            projectResult = record;
            location = record.Description;
            businessUnit = record.Description;
            projectId = record.Id;
            parentId = record.ParentId;
        } else {
            // console.log(`Primary lookup failed for projectName: ${projectName}, trying CompanyNameByBuId...`);

            const pool2 = await poolPromise;
            const fallbackQuery = `
                SELECT Id, ProjectName AS Description, Type, ParentId
                FROM CompanyNameByBuId
            `;
            const fallbackResult = await pool2.request().query(fallbackQuery);

            const match = fallbackResult.recordset.find(comp =>
                isNumeric ? comp.Id === parseInt(projectName) : comp.Description.trim().toLowerCase() === projectName.trim().toLowerCase()
            );

            if (!match) {
                return res.status(400).json({ msg: 'Invalid project name' });
            }

            projectResult = match;
            location = match.Description;
            businessUnit = match.Description;
            projectId = match.Id;
            parentId = match.ParentId;
        }

        // 2. Determine Company Name using ParentId from resolved record
        const pool5 = await poolPromise;
        const companyNameResult = await pool5.request().query(`
            SELECT Description AS Company_Name 
            FROM CompanyNameByBuId 
            WHERE ParentId = ${parentId}
        `);

        let salaryBu = location;
        if (companyNameResult.recordset.length > 0) {
            const companyNameFromDb = companyNameResult.recordset[0].Company_Name;
            if (companyNameFromDb === 'SANKALP CONTRACTS PRIVATE LIMITED') {
                salaryBu = `${companyNameFromDb} - HO`;
            }
        }

        let companyName = companyNameResult.recordset[0].Company_Name
        // 3. Department Info
        const departmentRequest = pool5.request();
        departmentRequest.input('departmentId', sql.Int, departmentId);
        const departmentQuery = `
            SELECT [id], [farvision_code] AS Code, [farvision_id] AS Id, [farvision_description] AS Description 
            FROM [Departments] 
            WHERE [farvision_id] = @departmentId
        `;
        const departmentResult = await departmentRequest.query(departmentQuery);
        if (departmentResult.recordset.length === 0) {
            return res.status(404).send('Department not found');
        }
        const departmentName = departmentResult.recordset[0].Description;
        // console.log('departmentResult++',departmentName)

        const creationDate = new Date();
        //console.log('Received OnboardName:', finalOnboardName);
        const data = await labourModel.registerData({
            labourOwnership, uploadAadhaarFront: frontImageUrl, uploadAadhaarBack: backImageUrl, uploadIdProof: IdProofImageUrl, uploadInductionDoc: uploadInductionDocImageUrl, name, aadhaarNumber,
            dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date: dateOfJoining, ConfirmDate: dateOfJoining, From_Date: fromDate.toISOString().split('T')[0], Period: period, address, pincode, taluka,
            district, village, state, emergencyContact, photoSrc: photoSrcUrl, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours, location, SalaryBu: salaryBu, businessUnit,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName: companyName, Induction_Date, Inducted_By, OnboardName: finalOnboardName, expiryDate, ValidTill: validTillDate.toISOString().split('T')[0],
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


async function getAllRecordsLaboursOnboarding(req, res) {
    try {
        const records = await labourModel.getAllLaboursOnboarding();
        return res.status(200).json(records);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getRecordById(req, res) {
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



        const labourCategoryMap = {
            'SKILLED': 1,
            'UN-SKILLED': 2,
            'SEMI-SKILLED': 3
        };

        const safeLabourCategoryId = String(labourCategoryMap[labourCategory]) || null;

        if (safeLabourCategoryId === null) {
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

        // const processFileField = (bodyField, fileField) => {
        //     if (fileField) {
        //         // Binary data uploaded, get URL path
        //         return baseUrl + path.basename(fileField[0].path);
        //     } else if (typeof bodyField === 'string' && bodyField.startsWith('http')) {
        //         // If no new file, use the existing URL
        //         return bodyField;
        //     }
        //     return null; // No data available
        // };


        async function processFileField(bodyField, fileField) {
            if (fileField && fileField[0]) {
                return await uploadToS3Webp(fileField[0]);
            } else if (typeof bodyField === "string" && bodyField.startsWith("http")) {
                return bodyField;
            }
            return null;
        }

        const frontImageUrl = await processFileField(req.body.uploadAadhaarFront, uploadAadhaarFront);
        const backImageUrl = await processFileField(req.body.uploadAadhaarBack, uploadAadhaarBack);
        const photoSrcUrl = await processFileField(req.body.photoSrc, photoSrc);
        const IdProofImageUrl = await processFileField(req.body.uploadIdProof, uploadIdProof);
        const uploadInductionDocImageUrl = await processFileField(req.body.uploadInductionDoc, uploadInductionDoc);


        const dateOfJoiningDate = new Date(dateOfJoining);
        const fromDate = dateOfJoiningDate;
        const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '-');
        const validTillDate = new Date(dateOfJoiningDate);
        validTillDate.setFullYear(validTillDate.getFullYear() + 1);
        const retirementDate = new Date(dateOfBirth);
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);

        const pool = await poolPromise4;
        const isNumeric = !isNaN(projectName);
        const projectRequest = pool.request();
        projectRequest.input('projectName', isNumeric ? sql.Int : sql.VarChar, projectName);

        let projectResult;
        let location = "";
        let businessUnit = "";
        let projectId;
        let parentId;

        // 1. Try primary query from Framework.BusinessUnit
        const primaryQuery = isNumeric
            ? `
                SELECT Id, Description, Type, Email1, ParentId 
                FROM Framework.BusinessUnit 
                WHERE Type = 'B' 
                AND (IsDiscontinueBU IS NULL OR IsDiscontinueBU = '' OR IsDiscontinueBU = 0) 
                AND (IsDeleted IS NULL OR IsDeleted = '' OR IsDeleted = 0)
                AND Id = @projectName
              `
            : `
                SELECT a.Id, a.Description, a.Type, a.Email1, a.ParentId
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.Description = @projectName
                AND (a.IsDiscontinueBU IS NULL OR a.IsDiscontinueBU = 0)
                AND (a.IsDeleted IS NULL OR a.IsDeleted = 0)
                AND b.Id = 3
              `;

        const primaryResult = await projectRequest.query(primaryQuery);

        if (primaryResult.recordset.length > 0) {
            const record = primaryResult.recordset[0];
            projectResult = record;
            location = record.Description;
            businessUnit = record.Description;
            projectId = record.Id;
            parentId = record.ParentId;
        } else {

            const pool2 = await poolPromise;
            const fallbackQuery = `
                SELECT Id, ProjectName AS Description, Type, ParentId
                FROM CompanyNameByBuId
            `;
            const fallbackResult = await pool2.request().query(fallbackQuery);

            const match = fallbackResult.recordset.find(comp =>
                isNumeric ? comp.Id === parseInt(projectName) : comp.Description.trim().toLowerCase() === projectName.trim().toLowerCase()
            );

            if (!match) {
                return res.status(400).json({ msg: 'Invalid project name' });
            }

            projectResult = match;
            location = match.Description;
            businessUnit = match.Description;
            projectId = match.Id;
            parentId = match.ParentId;
        }

        // const parentId = parentIdResult.recordset[0].ParentId;
        const pool5 = await poolPromise;
        const companyNameResult = await pool5.request().query(`
              SELECT Description AS Company_Name 
        FROM CompanyNameByBuId 
        WHERE ParentId = ${parentId}
        `);

        const companyNameFromDb = companyNameResult.recordset[0].Company_Name;

        if (companyNameFromDb === 'SANKALP CONTRACTS PRIVATE LIMITED') {
            salaryBu = `${companyNameFromDb} - HO`;
        } else {
            salaryBu = location;
        }

        // Fetch department description
        const departmentRequest = pool.request();

        if (safeDepartmentId !== null) {
            departmentRequest.input('departmentId', safeDepartmentId);
        } else {
            return res.status(400).send('Invalid departmentId');
        }

        const departmentQuery = `
             SELECT [id], [farvision_code] AS Code, [farvision_id] AS Id, [farvision_description] AS Description 
      FROM [Departments] WHERE [farvision_id] = @departmentId
        `;
        const departmentResult = await departmentRequest.query(departmentQuery);

        if (departmentResult.recordset.length === 0) {
            return res.status(404).send('Department not found');
        }

        const departmentName = departmentResult.recordset[0].Description;

        const creationDate = new Date();

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
        const {
            id, LabourID, labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
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

        if (!LabourID) {
            console.error('LabourID is missing from request body.');
            return res.status(400).json({ msg: 'LabourID is required.' });
        }

        const labourCategoryMap = {
            'SKILLED': 1,
            'UN-SKILLED': 2,
            'SEMI-SKILLED': 3
        };

        const safeLabourCategoryId = labourCategoryMap[labourCategory] !== undefined ? labourCategoryMap[labourCategory] : null;

        if (safeLabourCategoryId === null) {
            return res.status(400).json({ msg: 'Invalid labourCategory provided' });
        }

        const safeDepartmentId = departmentId ? String(departmentId) : null;
        const safeDesignationId = designationId ? String(designationId) : null;
        const safeProjectName = projectName && !isNaN(projectName) ? String(projectName) : projectName;

        if (!safeProjectName || !safeDepartmentId || !safeDesignationId) {
            return res.status(400).json({ msg: 'Missing required fields: projectName, departmentId, or designationId' });
        }

        const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof, uploadInductionDoc } = req.files || {};

        // const processFileField = (bodyField, fileField) => {
        //     if (fileField) {
        //         return baseUrl + path.basename(fileField[0].path);
        //     } else if (typeof bodyField === 'string' && bodyField.startsWith('http')) {

        //         return bodyField;
        //     }
        //     return null; 
        // };

        async function processFileField(bodyField, fileField) {
            if (fileField && fileField[0]) {
                return await uploadToS3Webp(fileField[0]);
            } else if (typeof bodyField === "string" && bodyField.startsWith("http")) {
                return bodyField;
            }
            return null;
        }



        const frontImageUrl = await processFileField(req.body.uploadAadhaarFront, uploadAadhaarFront);
        const backImageUrl = await processFileField(req.body.uploadAadhaarBack, uploadAadhaarBack);
        const photoSrcUrl = await processFileField(req.body.photoSrc, photoSrc);
        const IdProofImageUrl = await processFileField(req.body.uploadIdProof, uploadIdProof);
        const uploadInductionDocImageUrl = await processFileField(req.body.uploadInductionDoc, uploadInductionDoc);

        const dateOfJoiningDate = new Date(dateOfJoining);
        const fromDate = dateOfJoiningDate;
        const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '-');
        const validTillDate = new Date(dateOfJoiningDate);
        validTillDate.setFullYear(validTillDate.getFullYear() + 1);
        const retirementDate = new Date(dateOfBirth);
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);

        const pool = await poolPromise4;
        const isNumeric = !isNaN(projectName);
        const projectRequest = pool.request();
        projectRequest.input('projectName', isNumeric ? sql.Int : sql.VarChar, projectName);

        let projectResult;
        let location = "";
        let businessUnit = "";
        let projectId;
        let parentId;

        const primaryQuery = isNumeric
            ? `
                SELECT Id, Description, Type, Email1, ParentId 
                FROM Framework.BusinessUnit 
                WHERE Type = 'B' 
                AND (IsDiscontinueBU IS NULL OR IsDiscontinueBU = '' OR IsDiscontinueBU = 0) 
                AND (IsDeleted IS NULL OR IsDeleted = '' OR IsDeleted = 0)
                AND Id = @projectName
              `
            : `
                SELECT a.Id, a.Description, a.Type, a.Email1, a.ParentId
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.Description = @projectName
                AND (a.IsDiscontinueBU IS NULL OR a.IsDiscontinueBU = 0)
                AND (a.IsDeleted IS NULL OR a.IsDeleted = 0)
                AND b.Id = 3
              `;

        const primaryResult = await projectRequest.query(primaryQuery);

        if (primaryResult.recordset.length > 0) {
            const record = primaryResult.recordset[0];
            projectResult = record;
            location = record.Description;
            businessUnit = record.Description;
            projectId = record.Id;
            parentId = record.ParentId;
        } else {

            const pool2 = await poolPromise;
            const fallbackQuery = `
                SELECT Id, ProjectName AS Description, Type, ParentId
                FROM CompanyNameByBuId
            `;
            const fallbackResult = await pool2.request().query(fallbackQuery);

            const match = fallbackResult.recordset.find(comp =>
                isNumeric ? comp.Id === parseInt(projectName) : comp.Description.trim().toLowerCase() === projectName.trim().toLowerCase()
            );

            if (!match) {
                return res.status(400).json({ msg: 'Invalid project name' });
            }

            projectResult = match;
            location = match.Description;
            businessUnit = match.Description;
            projectId = match.Id;
            parentId = match.ParentId;
        }

        // const parentId = parentIdResult.recordset[0].ParentId;
        const pool5 = await poolPromise;
        const companyNameResult = await pool5.request().query(`
              SELECT Description AS Company_Name 
        FROM CompanyNameByBuId 
        WHERE ParentId = ${parentId}
        `);

        const companyNameFromDb = companyNameResult.recordset[0].Company_Name;

        if (companyNameFromDb === 'SANKALP CONTRACTS PRIVATE LIMITED') {
            salaryBu = `${companyNameFromDb} - HO`;
        } else {
            salaryBu = location;
        }

        const departmentRequest = pool.request();

        if (safeDepartmentId !== null) {
            departmentRequest.input('departmentId', safeDepartmentId);

        } else {
            return res.status(400).send('Invalid departmentId');
        }

        const departmentQuery = `
             SELECT [id], [farvision_code] AS Code, [farvision_id] AS Id, [farvision_description] AS Description 
      FROM [Departments] WHERE [farvision_id] = @departmentId
        `;
        const departmentResult = await departmentRequest.query(departmentQuery);

        if (departmentResult.recordset.length === 0) {
            return res.status(404).send('Department not found');
        }

        const departmentName = departmentResult.recordset[0].Description;

        const creationDate = new Date();
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


        if (!data) {
            return res.status(404).json({ msg: 'No data updated' });
        }
        return res.status(200).json({ msg: "User updated successfully", data: data });
    } catch (err) {
        console.error('Error updating record:', err.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
}


async function updateRecordWithDisable(req, res) {
    try {
        let {
            LabourID, labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber,
            gender, dateOfJoining, address, pincode, taluka, district, village, state,
            emergencyContact, bankName, branch, accountNumber, ifscCode, projectName,
            labourCategory, department, workingHours, contractorName, contractorNumber,
            designation, title, Marital_Status, companyName, Induction_Date, Inducted_By,
            OnboardName, expiryDate, departmentId, designationId, isResubmit, hideResubmit, isCompanyTransfer, isSiteTransfer, Reject_Reason
        } = req.body;

        const parseBitField = (val) => {
            if (val === null || val === undefined || val === '' || val === 'null') return null;
            if (typeof val === 'boolean') return val;
            if (typeof val === 'string') {
                const lowered = val.trim().toLowerCase();
                if (lowered === 'true' || lowered === '1') return true;
                if (lowered === 'false' || lowered === '0') return false;
            }
            return null;
        };

        const parsedIsResubmit = parseBitField(isResubmit);
        const parsedHideResubmit = parseBitField(hideResubmit);
        const parsedIsCompanyTransfer = parseBitField(isCompanyTransfer);
        const parsedIsSiteTransfer = parseBitField(isSiteTransfer);

        let finalOnboardName = Array.isArray(OnboardName)
            ? OnboardName.filter(n => n && n.trim() !== '').pop()
            : OnboardName;

        if (!finalOnboardName || finalOnboardName.trim() === '') {
            return res.status(400).json({ msg: 'OnboardName is required.' });
        }
        finalOnboardName = finalOnboardName.toUpperCase();

        if (!LabourID) {
            return res.status(400).json({ msg: 'LabourID is required.' });
        }

        const labourCategoryMap = {
            'SKILLED': 1,
            'UN-SKILLED': 2,
            'SEMI-SKILLED': 3
        };
        const safeLabourCategoryId = String(labourCategoryMap[labourCategory]) || null;
        if (safeLabourCategoryId === null) {
            return res.status(400).json({ msg: 'Invalid labourCategory provided' });
        }

        const safeDepartmentId = String(departmentId);
        const safeDesignationId = String(designationId);
        const safeProjectName = String(projectName);

        if (!safeProjectName || !safeDepartmentId || !safeDesignationId) {
            return res.status(400).json({ msg: 'Missing required fields: projectName, departmentId, or designationId' });
        }

        const {
            uploadAadhaarFront = null,
            uploadAadhaarBack = null,
            photoSrc = null,
            uploadIdProof = null,
            uploadInductionDoc = null
        } = req.files || {};

        // const processFileField = (bodyField, fileField) => {
        //     if (fileField) {
        //         return baseUrl + path.basename(fileField[0].path);
        //     } else if (typeof bodyField === 'string' && bodyField.startsWith('http')) {

        //         return bodyField;
        //     }
        //     return null; // No data available
        // };


        async function processFileField(bodyField, fileField) {
            if (fileField && fileField[0]) {
                return await uploadToS3Webp(fileField[0]);
            } else if (typeof bodyField === "string" && bodyField.startsWith("http")) {
                return bodyField;
            }
            return null;
        }


        const frontImageUrl = await processFileField(req.body.uploadAadhaarFront, uploadAadhaarFront);
        const backImageUrl = await processFileField(req.body.uploadAadhaarBack, uploadAadhaarBack);
        const photoSrcUrl = await processFileField(req.body.photoSrc, photoSrc);
        const IdProofImageUrl = await processFileField(req.body.uploadIdProof, uploadIdProof);
        const uploadInductionDocImageUrl = await processFileField(req.body.uploadInductionDoc, uploadInductionDoc);

        const dateOfJoiningDate = new Date(dateOfJoining);
        const fromDate = dateOfJoiningDate;
        const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '-');

        const validTillDate = new Date(dateOfJoiningDate);
        validTillDate.setFullYear(validTillDate.getFullYear() + 1);

        const retirementDate = new Date(dateOfBirth);
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);

        const pool = await poolPromise4;
        const isNumeric = !isNaN(projectName);
        const projectRequest = pool.request();
        projectRequest.input('projectName', isNumeric ? sql.Int : sql.VarChar, projectName);

        let projectResult;
        let location = "";
        let businessUnit = "";
        let projectId;
        let parentId;

        const primaryQuery = isNumeric
            ? `
                SELECT Id, Description, Type, Email1, ParentId 
                FROM Framework.BusinessUnit 
                WHERE Type = 'B' 
                AND (IsDiscontinueBU IS NULL OR IsDiscontinueBU = '' OR IsDiscontinueBU = 0) 
                AND (IsDeleted IS NULL OR IsDeleted = '' OR IsDeleted = 0)
                AND Id = @projectName
              `
            : `
                SELECT a.Id, a.Description, a.Type, a.Email1, a.ParentId
                FROM Framework.BusinessUnit a
                LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
                WHERE a.Description = @projectName
                AND (a.IsDiscontinueBU IS NULL OR a.IsDiscontinueBU = 0)
                AND (a.IsDeleted IS NULL OR a.IsDeleted = 0)
                AND b.Id = 3
              `;

        const primaryResult = await projectRequest.query(primaryQuery);

        if (primaryResult.recordset.length > 0) {
            const record = primaryResult.recordset[0];
            projectResult = record;
            location = record.Description;
            businessUnit = record.Description;
            projectId = record.Id;
            parentId = record.ParentId;
        } else {

            const pool2 = await poolPromise;
            const fallbackQuery = `
                SELECT Id, ProjectName AS Description, Type, ParentId
                FROM CompanyNameByBuId
            `;
            const fallbackResult = await pool2.request().query(fallbackQuery);

            const match = fallbackResult.recordset.find(comp =>
                isNumeric ? comp.Id === parseInt(projectName) : comp.Description.trim().toLowerCase() === projectName.trim().toLowerCase()
            );

            if (!match) {
                return res.status(400).json({ msg: 'Invalid project name' });
            }

            projectResult = match;
            location = match.Description;
            businessUnit = match.Description;
            projectId = match.Id;
            parentId = match.ParentId;
        }

        const pool5 = await poolPromise;
        const companyNameResult = await pool5.request().query(`
              SELECT Description AS Company_Name 
        FROM CompanyNameByBuId 
        WHERE ParentId = ${parentId}
        `);

        const companyNameFromDb = companyNameResult.recordset[0].Company_Name || '';

        if (companyNameFromDb === 'SANKALP CONTRACTS PRIVATE LIMITED') {
            salaryBu = `${companyNameFromDb} - HO`;
        } else {
            salaryBu = location;
        }

        const departmentRequest = pool5.request();

        if (safeDepartmentId !== null) {
            departmentRequest.input('departmentId', safeDepartmentId);
        } else {
            return res.status(400).send('Invalid departmentId');
        }

        const departmentQuery = `
             SELECT [id], [farvision_code] AS Code, [farvision_id] AS Id, [farvision_description] AS Description 
      FROM [Departments] WHERE [farvision_id] = @departmentId
        `;
        const departmentResult = await departmentRequest.query(departmentQuery);

        if (departmentResult.recordset.length === 0) {
            return res.status(404).send('Department not found');
        }





        const departmentName = departmentResult.recordset[0].Description;
        const creationDate = new Date();



        const data = await labourModel.registerDataUpdateDisable({
            LabourID, labourOwnership,
            uploadAadhaarFront: frontImageUrl,
            uploadAadhaarBack: backImageUrl,
            uploadIdProof: IdProofImageUrl,
            uploadInductionDoc: uploadInductionDocImageUrl,
            name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            Group_Join_Date: dateOfJoining,
            ConfirmDate: dateOfJoining,
            From_Date: fromDate.toISOString().split('T')[0],
            Period: period,
            address, pincode, taluka, district, village, state, emergencyContact,
            photoSrc: photoSrcUrl, bankName, branch, accountNumber, ifscCode,
            projectName, labourCategory, department, workingHours,
            location, SalaryBu: salaryBu, businessUnit,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName,
            Induction_Date, Inducted_By, OnboardName: finalOnboardName, expiryDate,
            ValidTill: validTillDate.toISOString().split('T')[0],
            retirementDate: retirementDate.toISOString().split('T')[0],
            WorkingBu: location,
            CreationDate: creationDate.toISOString(),
            departmentId: safeDepartmentId, departmentName,
            designationId: safeDesignationId,
            labourCategoryId: safeLabourCategoryId,
            isResubmit: parsedIsResubmit,
            hideResubmit: parsedHideResubmit,
            isCompanyTransfer: parsedIsCompanyTransfer,
            isSiteTransfer: parsedIsSiteTransfer,
            Reject_Reason
        });

        return res.status(201).json({ msg: "User created successfully", data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Internal server error' });
    }
}



const sanitizeInt = v =>
    (v !== undefined && v !== null && v !== '' && v !== 'null') ? parseInt(v, 10) : null;

const parseBit = v => {
    if (v === null || v === undefined || v === '' || v === 'null') return null;
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
    return null;
};



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

async function searchLaboursForAttendance(req, res) {
    const { q } = req.query;

    try {
        const results = await labourModel.searchForAttendance(q);
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
    const { labourID } = req.body;

    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid labour ID' });
    }

    try {
        const success = await labourModel.approveLabour(id, labourID);
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

// --------------------------------  changes disabel approve 14-11-2024 --------------


async function approveDisableLabour(req, res) {
    const id = parseInt(req.params.id, 10);
    const { labourID } = req.body;

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
    const id = parseInt(req.params.id, 10);
    const { Reject_Reason } = req.body;
    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid labour ID' });
    }
    try {
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

async function esslapi(req, res) {
    try {
        const approvedLaboursXml = req.body;

        const parser = new xml2js.Parser({ explicitArray: false });
        const approvedLabours = await parser.parseStringPromise(approvedLaboursXml);

        const LabourID = approvedLabours['soap:Envelope']['soap:Body']['AddEmployee']['EmployeeCode']; // EmployeeCode as LabourID
        const name = approvedLabours['soap:Envelope']['soap:Body']['AddEmployee']['EmployeeName']; // EmployeeName as name
        const userId = approvedLabours['soap:Envelope']['soap:Body']['AddEmployee']['CardNumber']; // CardNumber as userId


        const esslapiurl = 'https://essl.vjerp.com:8530/iclock/webapiservice.asmx?op=AddEmployee';
        const response = await axios.post(esslapiurl, approvedLaboursXml, {
            headers: {
                'Content-Type': 'text/xml'
            }
        });

        const esslResponseData = response.data;

        // Parse the XML response correctly
        const parsedResponse = await parseEsslResponse(esslResponseData);
        const { Status: esslStatus = 'false', CommandId: esslCommandId = null } = parsedResponse;


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

        const status = parsedData['soap:Envelope']['soap:Body']['AddEmployeeResponse']['AddEmployeeResult'];
        const commandId = parsedData['soap:Envelope']['soap:Body']['AddEmployeeResponse']['CommandId'];

        const result = {
            Status: status && status.toLowerCase() === 'success' ? status : 'false',
            CommandId: commandId || null
        };

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
        const { hideResubmit } = req.body;
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

let cachedAttendance = null;

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

function roundOvertime(overtimeHours) {
    if (overtimeHours <= 0) return 0;

    const hours = Math.floor(overtimeHours);
    let minutes = Math.round((overtimeHours - hours) * 60);

    if (minutes < 15) {
        minutes = 0;
    } else if (minutes < 45) {
        minutes = 30; // Convert to 0.5 hr
    } else {
        minutes = 0;
        return hours + 1;
    }

    return hours + (minutes / 60);
}

async function runLastMonthAttendanceCron() {
    console.log("Starting last month attendance cron job...");
    const today = new Date();

    // Get last month and year
    const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

    // Get number of days in last month
    const daysInLastMonth = new Date(year, lastMonth + 1, 0).getDate();
    console.log(`Days in last month (${year}-${lastMonth + 1}): ${daysInLastMonth}`);
    // Generate all dates of last month in YYYY-MM-DD format
    const dates = Array.from({ length: daysInLastMonth }, (_, i) => {
        const d = new Date(year, lastMonth, i + 1);
        return d.toISOString().split("T")[0];
    });

    cronLogger.info(`Running cron job for all dates in ${year}-${lastMonth + 1} (${daysInLastMonth} days)`);
    console.log(`Running cron job for all dates in ${year}-${lastMonth + 1} (${daysInLastMonth} days)`);
    try {
        await Promise.all(
            dates.map(async (date) => {
                try {
                    cronLogger.info(`Processing Attendance Date: ${date}`);
                    await getAllLaboursAttendanceDaily(date);
                    cronLogger.info(`Completed Attendance for Date: ${date}`);
                } catch (error) {
                    console.error(`❌ Error for Date ${date}:`, error);
                    cronLogger.error(`❌ Error for Date ${date}: ${error.message}`);
                }
            })
        );

        cronLogger.info(`✅ Cron job completed successfully for all dates in ${year}-${lastMonth + 1}`);
        console.log(`🎉 Cron job completed successfully for all dates in ${year}-${lastMonth + 1}`);
    } catch (error) {
        console.error(`❌ Error running cron job for last month:`, error);
        cronLogger.error(`❌ Error running cron job for last month: ${error.message}`);
    }
}


async function runDailyAttendanceCron() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 24); // Get the previous day
    const formattedYesterday = yesterday.toISOString().split('T')[0];

    // console.log(`Cron Execution Date: ${new Date().toISOString().split('T')[0]}`);
    cronLogger.info(`Running cron job for Attendance Date: ${formattedYesterday}`);

    try {
        // await processLaboursAttendance(formattedYesterday);
        await getAllLaboursAttendanceDaily(formattedYesterday);

        cronLogger.info(`Cron job completed successfully for Date: ${formattedYesterday}`);
    } catch (error) {
        console.error(`Error running cron job for Date: ${formattedYesterday}:`, error);
        cronLogger.error(`Error running cron job for Date: ${formattedYesterday}:`, error);
    }
}

// async function runDailyAttendanceCron() {
//     const today = new Date();
//     const yesterday = new Date(today);
//     yesterday.setDate(yesterday.getDate() - 2);

//     const currentDay = today.getDate();
//     let startDate;

//     if (currentDay === 1) {
//         // Today is 1st → backfill previous month
//         startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
//     } else {
//         // Otherwise → backfill from 1st of this month
//         startDate = new Date(today.getFullYear(), today.getMonth(), 1);
//     }

//     const endDate = yesterday;

//     // Build all dates between startDate and endDate
//     const dates = [];
//     let d = new Date(startDate);
//     while (d <= endDate) {
//         dates.push(new Date(d).toISOString().split("T")[0]); // yyyy-mm-dd
//         d.setDate(d.getDate() + 1);
//     }

//     cronLogger.info(
//         `Running cron job for Attendance Dates: ${dates[0]} → ${dates[dates.length - 1]}`
//     );

//     const BATCH_SIZE = 5; // tune this based on DB/server capacity

//     try {
//         for (let i = 0; i < dates.length; i += BATCH_SIZE) {
//             const batch = dates.slice(i, i + BATCH_SIZE);

//             cronLogger.info(`Processing batch: ${batch[0]} → ${batch[batch.length - 1]}`);

//              await Promise.all(
//                 batch.map(async (date) => {
//                     cronLogger.info(`🔄 Processing date: ${date}`);
//                     console.log(`🔄 Processing date: ${date}`);

//                     await getAllLaboursAttendanceDaily(date);

//                     cronLogger.info(`✅ Finished processing date: ${date}`);
//                     console.log(`✅ Finished processing date: ${date}`);
//                 })
//             );
//         }

//         cronLogger.info(
//             `Cron job completed successfully for ${dates.length} days (${dates[0]} → ${dates[dates.length - 1]})`
//         );
//          console.log(
//             `🎉 Cron job completed successfully for ${dates.length} days (${dates[0]} → ${dates[dates.length - 1]})`
//         );
//     } catch (error) {
//         console.error(`Error running cron job for dates:`, error);
//         cronLogger.error(`Error running cron job for dates:`, error);
//     }
// }



/**
 * @param {string} attendanceDate – ISO date string in YYYY-MM-DD format (e.g. '2025-05-03').
 * @returns {Promise<void>}
 */
// ---- helpers ----
function parseYMD(d) {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function withTimeout(promise, ms, label = 'operation') {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
        ),
    ]);
}

function isTransient(err) {
    const code = err?.code || '';
    const num = err?.number; // mssql error number
    const msg = String(err?.message || '').toLowerCase();

    return (
        code === 'ETIMEOUT' || code === 'ESOCKET' || code === 'ECONNRESET' || code === 'ECONNABORTED' ||
        msg.includes('timeout') ||
        msg.includes('temporarily unavailable') ||
        msg.includes('connection') && msg.includes('closed') ||
        msg.includes('deadlock') || num === 1205 ||             // deadlock
        num === 40501 || num === 40613                          // Azure throttling / failover
    );
}

async function withRetry(op, { retries = 1, baseMs = 400, maxMs = 2000, factor = 2, label = 'op' } = {}) {
    let attempt = 0;
    while (true) {
        try {
            return await op();
        } catch (err) {
            attempt++;
            const last = attempt > retries;
            if (last || !isTransient(err)) throw err;
            const backoff = Math.min(maxMs, baseMs * Math.pow(factor, attempt - 1));
            const jitter = Math.floor(Math.random() * 150);
            console.warn(`[retry] "${label}" failed (attempt ${attempt}/${retries + 1}): ${err.message}. Retrying in ${backoff + jitter}ms`);
            await new Promise(r => setTimeout(r, backoff + jitter));
        }
    }
}

async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let i = 0, active = 0;
    return new Promise((resolve) => {
        const launch = () => {
            if (i >= items.length && active === 0) return resolve(results);
            while (active < limit && i < items.length) {
                const idx = i++;
                active++;
                Promise.resolve()
                    .then(() => worker(items[idx], idx))
                    .then((r) => { results[idx] = r; })
                    .catch((e) => { results[idx] = { error: e }; })
                    .finally(() => { active--; launch(); });
            }
        };
        launch();
    });
}

function makeDeviceProjectResolver(labourModel) {
    const cache = new Map();
    return async function getProjectIdCached(deviceId) {
        if (deviceId == null) return null;
        if (cache.has(deviceId)) return cache.get(deviceId);
        const val = await withRetry(
            () => withTimeout(
                labourModel.getProjectIdByDeviceId(deviceId),
                LM_LOOKUP_TIMEOUT_MS,
                `getProjectIdByDeviceId(${deviceId})`
            ),
            { retries: RETRIES_LOOKUP, label: `getProjectIdByDeviceId(${deviceId})` }
        ).catch(e => {
            console.error(`[ATTENDANCE] Device lookup failed for ${deviceId}: ${e.message}`);
            return null;
        });
        cache.set(deviceId, val ?? null);
        return val ?? null;
    };
}

// ---- main function with retries wired in ----
async function getAllLaboursAttendanceDaily(attendanceDate) {
    console.info(`[ATTENDANCE] Processing attendance for ${attendanceDate}...`);
    if (!attendanceDate) throw new Error('attendanceDate is required (YYYY-MM-DD).');

    const dateKey = parseYMD(attendanceDate);
    if (!dateKey) throw new Error(`Invalid attendanceDate supplied → ${attendanceDate}`);

    const target = new Date(attendanceDate);
    const parsedYear = target.getFullYear();
    const parsedMonth = target.getMonth() + 1;
    const processedDay = target.getDate();
    const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

    // cohort (retry + timeout)
    const approvedLabours = await withRetry(
        () => withTimeout(labourModel.getAllApprovedLabours(), LM_READ_TIMEOUT_MS, 'getAllApprovedLabours'),
        { retries: RETRIES_READ, label: 'getAllApprovedLabours' }
    );

    if (!approvedLabours?.length) {
        console.info(`[ATTENDANCE] No approved labours for ${parsedYear}-${parsedMonth}.`);
        return { processed: 0, succeeded: 0, failed: 0 };
    }

    const getProjectIdCached = makeDeviceProjectResolver(labourModel);

    let processed = 0, succeeded = 0, failed = 0;
    const lastProjectNameMap = new Map();
    const worker = async (labour) => {
        processed += 1;
        try {
            const { labourId, workingHours } = labour;
            const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
            const halfDayHours = shiftHours === 9 ? 4.5 : 4;

            const punches = await withRetry(
                () => withTimeout(
                    labourModel.getESSLAttendance(labourId, attendanceDate),
                    LM_READ_TIMEOUT_MS,
                    `getESSLAttendance(${labourId}, ${attendanceDate})`
                ),
                { retries: RETRIES_READ, label: `getESSLAttendance(${labourId})` }
            );

            const punchesForDay = (Array.isArray(punches) ? punches : []).filter(p => parseYMD(p?.punch_date) === dateKey);

            const { status, firstPunch, lastPunch, totalHours } =
                determineStatus(punchesForDay, shiftHours, halfDayHours, workingHours);

            const OT = (status === 'P' && totalHours > shiftHours) ? (totalHours - shiftHours) : 0;
            const OTrounded = roundOvertime(OT);

// -----------------------------   HOLIDAY OVERTIME ZERO LOGIC       ------------------------------------------------
             // 🔹 Holiday check here
             const pool = await poolPromise;
        const holidayCheckResult = await pool.request()
            .input('date', sql.Date, attendanceDate)
            .query(`
                SELECT HolidayDate
                FROM [dbo].[HolidayDate]
                WHERE HolidayDate = @date
            `);

        const isHoliday = holidayCheckResult.recordset.length > 0;
// -----------------------------    HOLIDAY OVERTIME ZERO LOGIC END   ---------------------

            const OTmanual = isHoliday ? 0 : Math.min(OTrounded, 4);
            const to2 = (n) => Math.round((Number(n || 0)) * 100) / 100;

            const fDev = firstPunch?.Device_id ?? null;
            const lDev = lastPunch?.Device_id ?? null;

            const [projFP, projLP] = await Promise.all([
                getProjectIdCached(fDev),
                lDev ? getProjectIdCached(lDev) : Promise.resolve(null),
            ]);

            let currentProjectName = Number.isFinite(Number(labour.projectName))
                ? Number(labour.projectName)
                : null;

            if (!currentProjectName) {
                currentProjectName = lastProjectNameMap.get(labourId) ?? null;
            }

            if (currentProjectName) {
                lastProjectNameMap.set(labourId, currentProjectName);
            }

            const detailRow = {
                labourId,
                // projectName: Number.isFinite(Number(labour.projectName)) ? Number(labour.projectName) : null,
                projectName: currentProjectName,
                date: dateKey,
                firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
                firstPunchAttendanceId: firstPunch?.attendance_id ?? null,
                firstPunchDeviceId: fDev,
                lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
                lastPunchAttendanceId: lastPunch?.attendance_id ?? null,
                lastPunchDeviceId: lDev,
                totalHours: to2(totalHours),
                overtime: to2(OT),
                PayrollCalRoundOffOvertime: to2(OTrounded),
                OvertimeManually: to2(OTmanual),
                status,
                creationDate: new Date(),
                projectIdFromDevicefirstPunch: projFP ?? null,
                projectIdFromDeviceLastPunch: projLP ?? null,
            };

            await withRetry(
                () => withTimeout(
                    labourModel.insertIntoLabourAttendanceDetails(detailRow),
                    LM_WRITE_TIMEOUT_MS,
                    `insertIntoLabourAttendanceDetails(${labourId}, ${dateKey})`
                ),
                { retries: RETRIES_WRITE, label: `insertIntoLabourAttendanceDetails(${labourId})` }
            );

            const summary = {
                labourId,
                projectName: detailRow.projectName,
                totalDays: processedDay,
                presentDays: status === 'P' ? 1 : 0,
                halfDays: status === 'HD' ? 1 : 0,
                missPunchDays: status === 'MP' ? 1 : 0,
                absentDays: (status !== 'P' && status !== 'HD' && status !== 'MP') ? 1 : 0,
                totalOvertimeHours: detailRow.overtime,
                PayrollCalRoundoffTotalOvertime: detailRow.PayrollCalRoundOffOvertime,
                RoundOffTotalOvertime: detailRow.PayrollCalRoundOffOvertime,
                TotalOvertimeHoursManually: detailRow.OvertimeManually,
                shift: workingHours,
                creationDate: new Date(),
                selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`,
            };
            await withRetry(
                () => withTimeout(
                    labourModel.insertIntoLabourAttendanceSummary(summary),
                    LM_WRITE_TIMEOUT_MS,
                    `insertIntoLabourAttendanceSummary(${labourId}, ${dateKey})`
                ),
                { retries: RETRIES_WRITE, label: `insertIntoLabourAttendanceSummary(${labourId})` }
            );
            // await withRetry(
            //     () => withTimeout(
            //         labourModel.insertOrUpdateLabourAttendanceSummary(labourId, dateKey),
            //         LM_WRITE_TIMEOUT_MS,
            //         `insertOrUpdateLabourAttendanceSummary(${labourId}, ${dateKey})`
            //     ),
            //     { retries: RETRIES_WRITE, label: `insertOrUpdateLabourAttendanceSummary(${labourId})` }
            // );

            succeeded += 1;
            return { ok: true, labourId };
        } catch (err) {
            failed += 1;
            console.error(`[ATTENDANCE] Failed for labour ${labour?.labourId ?? 'UNKNOWN'} on ${dateKey}:`, err.message);
            return { ok: false, labourId: labour?.labourId, error: err };
        }
    };

    await mapWithConcurrency(approvedLabours, LABOUR_CONCURRENCY, worker);

    console.info(`[ATTENDANCE] Completed processing for ${parsedYear}-${String(parsedMonth).padStart(2, '0')} (day ${processedDay}).`);
    console.info(`[ATTENDANCE] Stats: processed=${processed}, succeeded=${succeeded}, failed=${failed}`);
    return { processed, succeeded, failed };
}


/**
 * @param {Object} req - Express request object containing params labourId and query parameters month and year.
 * @param {Object} res - Express response object.
 */
async function getAttendance(req, res) {
    try {
        const { labourId } = req.params;
        const { month, year } = req.query;

        if (!labourId || !month || !year) {
            return res.status(400).json({ message: 'LabourId, Month, and Year are required' });
        }

        const parsedMonth = parseInt(month, 10);
        const parsedYear = parseInt(year, 10);

        if (isNaN(parsedMonth) || isNaN(parsedYear)) {
            return res.status(400).json({ message: 'Invalid month or year' });
        }

        const labour = await labourModel.getLabourDetailsById(labourId);

        if (!labour) {
            return res.status(404).json({ message: 'Labour not found' });
        }

        const { workingHours } = labour;
        const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
        const halfDayHours = shiftHours === 9 ? 4.5 : 4;

        const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate(); // Total days in the month

        let presentDays = 0, halfDays = 0, missPunchDays = 0, absentDays = 0;
        let totalOvertimeHours = 0, roundOffTotalOvertime = 0, PayrollCalRoundoffTotalOvertime = 0;
        let totalManualOvertimeManually = 0;
        let monthlyAttendance = [];

        const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

            let { status, firstPunch, lastPunch, totalHours } = determineStatus(punchesForDay, shiftHours, halfDayHours, workingHours);

            let overtime = 0, dailyRoundOffOvertime = 0;
            let firstPunchAttendanceId = null, firstPunchDeviceId = null;
            let lastPunchAttendanceId = null, lastPunchDeviceId = null;
            let projectIdFromDevicefirstPunch = null;
            let projectIdFromDeviceLastPunch = null;

            if (firstPunch) {
                firstPunchAttendanceId = firstPunch.attendance_id;
                firstPunchDeviceId = firstPunch.Device_id;
                if (firstPunchDeviceId) {
                    projectIdFromDevicefirstPunch = await labourModel.getProjectIdByDeviceId(firstPunchDeviceId);
                }
            }

            if (lastPunch) {
                lastPunchAttendanceId = lastPunch.attendance_id;
                lastPunchDeviceId = lastPunch.Device_id;
                if (lastPunchDeviceId) {
                    projectIdFromDeviceLastPunch = await labourModel.getProjectIdByDeviceId(lastPunchDeviceId);
                }
            }

            if (status === 'P') {
                overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;
            }

            dailyRoundOffOvertime = roundOvertime(overtime);

            let OvertimeManually = dailyRoundOffOvertime > 4 ? 4 : dailyRoundOffOvertime;

            switch (status) {
                case 'P': presentDays++; break;
                case 'HD': halfDays++; break;
                case 'MP': missPunchDays++; break;
                case 'A': absentDays++; break;
                default: absentDays++;
            }

            totalOvertimeHours += overtime;
            PayrollCalRoundoffTotalOvertime += roundOvertime(overtime);
            roundOffTotalOvertime += dailyRoundOffOvertime;
            totalManualOvertimeManually += OvertimeManually;

            const safeTotalHours = typeof totalHours === 'number' && !isNaN(totalHours) ? totalHours : 0;

            monthlyAttendance.push({
                labourId,
                projectName: parseInt(labour.projectName, 10),
                date,
                firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
                firstPunchAttendanceId,
                firstPunchDeviceId,
                lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
                lastPunchAttendanceId,
                lastPunchDeviceId,
                totalHours: safeTotalHours.toFixed(2),
                overtime: overtime.toFixed(2),
                PayrollCalRoundOffOvertime: dailyRoundOffOvertime.toFixed(2),
                OvertimeManually: OvertimeManually.toFixed(2),
                status,
                creationDate: new Date(),
                projectIdFromDevicefirstPunch,
                projectIdFromDeviceLastPunch,
            });
        }

        const summary = {
            labourId,
            projectName: parseInt(labour.projectName, 10),
            totalDays: daysInMonth,
            presentDays,
            halfDays,
            missPunchDays,
            absentDays,
            totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
            PayrollCalRoundoffTotalOvertime: parseFloat(PayrollCalRoundoffTotalOvertime.toFixed(2)),
            RoundOffTotalOvertime: parseFloat(roundOffTotalOvertime.toFixed(2)),
            TotalOvertimeHoursManually: parseFloat(totalManualOvertimeManually.toFixed(2)),
            shift: workingHours,
            creationDate: new Date(),
            selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`,
        };

        res.status(200).json({
            message: 'Attendance processed successfully',
            summary,
            monthlyAttendance,
        });

    } catch (err) {
        console.error('Error processing attendance:', err);
        res.status(500).json({ message: 'Error processing attendance' });
    }
}

/**
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


/**
 * @param {string} workingHours - The working hours string.
 * @returns {number} - Shift hours.
 */
const getShiftHours = (workingHours) => (workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8);

/**
 * @param {number} shiftHours - Total shift hours.
 * @returns {number} - Half-day hours.
 */
const getHalfDayHours = (shiftHours) => (shiftHours === 9 ? 4.5 : 4);

/**
 * @param {Date} firstPunchTime - First punch time.
 * @param {Date} lastPunchTime - Last punch time.
 * @returns {number} - Difference in minutes.
 */
const calculateTimeDifferenceInMinutes = (firstPunchTime, lastPunchTime) => {
    const diffMs = lastPunchTime - firstPunchTime;
    return diffMs / (1000 * 60); // Convert milliseconds to minutes
};

/**
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
        return { status, firstPunch: null, lastPunch: null, misPunch, totalHours };
    }

    punches.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

    const firstPunch = punches[0];
    const lastPunch = punches[punches.length - 1];

    const firstPunchTime = new Date(firstPunch.punch_time);
    const lastPunchTime = new Date(lastPunch.punch_time);

    const gapMinutes = calculateTimeDifferenceInMinutes(firstPunchTime, lastPunchTime);

    if (gapMinutes < 15) {
        // Gap less than 15 minutes, consider only firstPunch and mark as MisPunch
        misPunch = true;
    } else {
        // Consider both punches
        consideredLastPunch = lastPunch;
    }

    if (misPunch) {
        status = 'MP';
    } else {
        if (consideredLastPunch) {
            totalHours = calculateHoursWorked(new Date(firstPunch.punch_date), firstPunchTime, lastPunchTime);
        } else {
            // Only firstPunch is considered, no valid LastPunch
            totalHours = 0;
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

    }

    return {
        status,
        firstPunch,
        lastPunch: consideredLastPunch,
        misPunch,
        totalHours,
    };
};

/**
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

        // const approvedLabours = await labourModel.getAllApprovedLabours();
        const approvedLabours = await labourModel.getAllApprovedOrMonthlyDisabledLabours(parsedMonth, parsedYear);


        if (!approvedLabours || approvedLabours.length === 0) {
            return res.status(404).json({ message: 'No approved labours found' });
        }

        const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate(); // Total days in the month

        for (let labour of approvedLabours) {
            const { labourId, workingHours } = labour;
            const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
            const halfDayHours = shiftHours === 9 ? 4.5 : 4;

            let presentDays = 0, halfDays = 0, missPunchDays = 0, absentDays = 0;
            let totalOvertimeHours = 0, roundOffTotalOvertime = 0, PayrollCalRoundoffTotalOvertime = 0;
            let totalManualOvertimeManually = 0;
            let monthlyAttendance = [];

            // Fetch attendance records for the labour for the month
            const labourAttendance = await labourModel.getAttendanceByLabourId(labourId, parsedMonth, parsedYear);

            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const punchesForDay = labourAttendance.filter(att => new Date(att.punch_date).toISOString().split('T')[0] === date);

                let { status, firstPunch, lastPunch, totalHours } = determineStatus(punchesForDay, shiftHours, halfDayHours, workingHours);

                let overtime = 0, dailyRoundOffOvertime = 0;
                let firstPunchAttendanceId = null, firstPunchDeviceId = null;
                let lastPunchAttendanceId = null, lastPunchDeviceId = null;
                let projectIdFromDevicefirstPunch = null;
                let projectIdFromDeviceLastPunch = null;

                if (firstPunch) {
                    firstPunchAttendanceId = firstPunch.attendance_id;
                    firstPunchDeviceId = firstPunch.Device_id;
                    if (firstPunchDeviceId) {
                        projectIdFromDevicefirstPunch = await labourModel.getProjectIdByDeviceId(firstPunchDeviceId);
                    }
                }

                if (lastPunch) {
                    lastPunchAttendanceId = lastPunch.attendance_id;
                    lastPunchDeviceId = lastPunch.Device_id;
                    if (lastPunchDeviceId) {
                        projectIdFromDeviceLastPunch = await labourModel.getProjectIdByDeviceId(lastPunchDeviceId);
                    }
                }

                //    let projectIdFromDevicefirstPunch = projectIdFromDevicefirstPunchIn || null;
                //    let projectIdFromDeviceLastPunch = projectIdFromDeviceLastPunchIn || null;

                if (status === 'P') {
                    overtime = totalHours > shiftHours ? totalHours - shiftHours : 0;
                }

                dailyRoundOffOvertime = roundOvertime(overtime);

                let OvertimeManually = dailyRoundOffOvertime > 4 ? 4 : dailyRoundOffOvertime;

                // ✅ **Update Counters**
                switch (status) {
                    case 'P': presentDays++; break;
                    case 'HD': halfDays++; break;
                    case 'MP': missPunchDays++; break;
                    case 'A': absentDays++; break;
                    default: absentDays++;
                }

                totalOvertimeHours += overtime;
                PayrollCalRoundoffTotalOvertime += roundOvertime(overtime)
                roundOffTotalOvertime += dailyRoundOffOvertime;
                totalManualOvertimeManually += OvertimeManually;

                const safeTotalHours = typeof totalHours === 'number' && !isNaN(totalHours) ? totalHours : 0;

                // ✅ **Prepare Attendance Data**
                monthlyAttendance.push({
                    labourId,
                    projectName: parseInt(labour.projectName, 10),
                    date,
                    firstPunch: firstPunch ? formatTimeToHoursMinutes(firstPunch.punch_time) : null,
                    firstPunchAttendanceId,
                    firstPunchDeviceId,
                    lastPunch: lastPunch ? formatTimeToHoursMinutes(lastPunch.punch_time) : null,
                    lastPunchAttendanceId,
                    lastPunchDeviceId,
                    totalHours: safeTotalHours.toFixed(2),
                    overtime: overtime.toFixed(2),
                    PayrollCalRoundOffOvertime: dailyRoundOffOvertime.toFixed(2),
                    OvertimeManually: OvertimeManually.toFixed(2),
                    status,
                    creationDate: new Date(),
                    projectIdFromDevicefirstPunch,
                    projectIdFromDeviceLastPunch,
                });
            }

            // ✅ **Prepare Summary**
            const summary = {
                labourId,
                projectName: parseInt(labour.projectName, 10),
                totalDays: daysInMonth,
                presentDays,
                halfDays,
                missPunchDays,
                absentDays,
                totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
                PayrollCalRoundoffTotalOvertime: parseFloat(PayrollCalRoundoffTotalOvertime.toFixed(2)),
                RoundOffTotalOvertime: parseFloat(roundOffTotalOvertime.toFixed(2)),
                TotalOvertimeHoursManually: parseFloat(totalManualOvertimeManually.toFixed(2)),
                shift: workingHours,
                creationDate: new Date(),
                selectedMonth: `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`,
            };
            //  console.log(`Inserting Attendance for ${labourId} on:`, summary);
            // ✅ **Insert Summary & Attendance**
            await labourModel.insertIntoLabourAttendanceSummary(summary);
            for (let dayAttendance of monthlyAttendance) {
                // console.log(`Inserting Attendance for ${labourId} on ${dayAttendance.date}:`, dayAttendance);
                await labourModel.insertIntoLabourAttendanceDetails(dayAttendance);
            }
        }
        res.status(200).json({ message: 'Attendance processed successfully' });
    } catch (err) {
        console.error('Error processing attendance:', err);
        res.status(500).json({ message: 'Error processing attendance' });
    }
};

/**
 * @param {string} date - The date for which to process attendance (ISO format string).
 */
async function processLaboursAttendance(date) {
    try {
        const attendanceDate = new Date(date);
        console.log("attendanceDate--->", attendanceDate)
        if (isNaN(attendanceDate.getTime())) throw new Error('Invalid date format');

        const approvedLabours = await labourModel.getAllApprovedLabours();
        if (!approvedLabours || approvedLabours.length === 0) return;

        for (let labour of approvedLabours) {
            const { labourId, workingHours, projectName } = labour;
            const shiftHours = workingHours === 'FLEXI SHIFT - 9 HRS' ? 9 : 8;
            const halfDayHours = shiftHours === 9 ? 4.5 : 4;

            let dailyAttendance = [];
            let totalOvertimeHours = 0;

            const labourAttendance = await labourModel.getAttendanceByLabourIdForDate(labourId, attendanceDate);
            let status = 'A', totalHours = 0, rawOvertime = 0;

            if (labourAttendance.length > 0) {
                labourAttendance.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));
                const firstPunch = labourAttendance[0];
                const lastPunch = labourAttendance[labourAttendance.length - 1];

                totalHours = (new Date(lastPunch.punch_time) - new Date(firstPunch.punch_time)) / (1000 * 60 * 60);

                if (totalHours >= shiftHours) {
                    status = 'P';
                    rawOvertime = Math.max(totalHours - shiftHours, 0);
                } else if (totalHours >= halfDayHours) {
                    status = 'HD';
                } else if (totalHours > 0) {
                    status = 'MP';
                }
            }

            const roundedOvertime = roundOvertime(rawOvertime);
            const OvertimeManually = Math.min(roundedOvertime, 4);
            totalOvertimeHours += roundedOvertime;

            dailyAttendance.push({
                labourId,
                projectName: parseInt(projectName, 10),
                date: attendanceDate.toISOString().split('T')[0],
                totalHours: totalHours.toFixed(2),
                overtime: roundedOvertime.toFixed(2),
                PayrollCalRoundOffOvertime: roundedOvertime.toFixed(2),
                OvertimeManually: OvertimeManually.toFixed(2),
                status,
                creationDate: new Date(),
            });

            for (let record of dailyAttendance) {
                await labourModel.insertIntoLabourAttendanceDetails(record);
            }

            await labourModel.insertIntoLabourAttendanceSummary({
                labourId,
                totalDays: 1,
                presentDays: status === 'P' ? 1 : 0,
                halfDays: status === 'HD' ? 1 : 0,
                absentDays: status === 'A' ? 1 : 0,
                totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
                shift: workingHours,
                selectedMonth: attendanceDate.toISOString().substring(0, 7),
                creationDate: new Date(),
            });
        }
    } catch (err) {
        console.error('Error processing attendance:', err);
        throw err;
    }
}

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


async function runAttendanceCronEssl() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // Get the previous day
    const formattedYesterday = yesterday.toISOString().split('T')[0];

    console.log(`Cron Execution Date: ${formattedYesterday}`);

    await labourModel.saveEsslAttendance(formattedYesterday);

    cronLogger.info(`Running cron job for Attendance Date: ${formattedYesterday}`);

}

// async function runAttendanceCronEssl() {
//     const today = new Date();
//     const yesterday = new Date(today);
//     yesterday.setDate(yesterday.getDate() - 1);

//     const currentDay = today.getDate();
//     let startDate;

//     if (currentDay === 1) {
//         // Today is 1st → backfill previous month
//         startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
//     } else {
//         // Otherwise → backfill from 1st of this month
//         startDate = new Date(today.getFullYear(), today.getMonth(), 1);
//     }

//     const endDate = yesterday;

//     // Build all dates between startDate and endDate
//     const dates = [];
//     let d = new Date(startDate);
//     while (d <= endDate) {
//         dates.push(new Date(d).toISOString().split("T")[0]); // yyyy-mm-dd
//         d.setDate(d.getDate() + 1);
//     }

//     cronLogger.info(
//         `ESSL Cron → Running for Attendance Dates: ${dates[0]} → ${dates[dates.length - 1]}`
//     );

//     const BATCH_SIZE = 5; // keep small to avoid DB overload

//     try {
//         for (let i = 0; i < dates.length; i += BATCH_SIZE) {
//             const batch = dates.slice(i, i + BATCH_SIZE);

//             cronLogger.info(`ESSL Batch → ${batch[0]} → ${batch[batch.length - 1]}`);

//             await Promise.all(
//                 batch.map(async (date, idx) => {
//                     const counter = i + idx + 1;
//                     cronLogger.info(`🔄 [${counter}/${dates.length}] Processing ESSL date: ${date}`);
//                     console.log(`🔄 [${counter}/${dates.length}] Processing ESSL date: ${date}`);

//                     await labourModel.saveEsslAttendance(date);

//                     cronLogger.info(`✅ Finished ESSL date: ${date}`);
//                     console.log(`✅ Finished ESSL date: ${date}`);
//                 })
//             );
//         }

//         cronLogger.info(
//             `🎉 ESSL Cron job completed successfully for ${dates.length} days (${dates[0]} → ${dates[dates.length - 1]})`
//         );
//         console.log(
//             `🎉 ESSL Cron job completed successfully for ${dates.length} days (${dates[0]} → ${dates[dates.length - 1]})`
//         );
//     } catch (error) {
//         console.error(`❌ Error running ESSL cron:`, error);
//         cronLogger.error(`❌ Error running ESSL cron:`, error);
//     }
// }


cron.schedule('34 13 * * *', async () => {
    cronLogger.info('Scheduled cron triggered...');
    // await runAttendanceCronEssl();
    await runDailyAttendanceCron();
    // await runLastMonthAttendanceCron();
});


async function submitAttendanceController(req, res) {
    try {
        const { labourId, punchType, punchDate, punchTime } = req.body;

        if (!labourId || !punchType || !punchDate || !punchTime) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const labourPunchCount = await labourModel.getMissPunchCount(labourId, punchDate);

        if (!labourPunchCount) {
            return res.status(404).json({ message: "Labour data not found." });
        }

        if (labourPunchCount.missPunchCount >= 3) {
            // Route to admin for approval
            const adminApproval = await labourModel.addApprovalRequest(labourId, punchType, punchDate, punchTime);
            if (adminApproval) {
                return res.status(200).json({ message: "Punch entry sent for admin approval." });
            } else {
                return res.status(500).json({ message: "Failed to send for admin approval." });
            }
        }

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

async function addWeeklyOff(req, res) {
    try {
        const { LabourID, offDate, addedBy } = req.body;

        if (!LabourID || !offDate) {
            return res.status(400).json({ message: 'Labour ID and Off Date are required.' });
        }

        const existingOff = await labourModel.getWeeklyOff(LabourID, offDate);
        if (existingOff) {
            return res.status(409).json({ message: 'Weekly off already exists for this date.' });
        }

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

async function isWeeklyOff(LabourID, date) {
    try {
        const result = await labourModel.getWeeklyOff(LabourID, date);
        return !!result; // Returns true if the date is a weekly off
    } catch (err) {
        console.error('Error checking if date is a weekly off', err);
        throw new Error('Error checking if date is a weekly off');
    }
}

async function saveWeeklyOffs(req, res) {
    try {
        const { LabourID, month, year, weeklyOffCount } = req.body;

        if (!LabourID || !month || !year || weeklyOffCount === undefined) {
            return res.status(400).json({ message: 'Labour ID, month, year, and weekly off count are required.' });
        }

        const sundays = [];
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            if (date.getDay() === 0) {
                sundays.push(date.toISOString().split('T')[0]);
            }
        }

        const weeklyOffDates = sundays.slice(0, weeklyOffCount);

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

        const result = await pool.request().query(`
            SELECT DISTINCT 
                CAST(LEFT(SelectedMonth, 4) AS INT) AS Year, -- Extract year (first 4 characters)
                CAST(RIGHT(SelectedMonth, 2) AS INT) AS Month -- Extract month (last 2 characters)
            FROM [dbo].[LabourAttendanceSummary];
        `);

        const disabledPeriods = result.recordset.map(record => ({
            month: record.Month,
            year: record.Year,
        }));

        res.status(200).json(disabledPeriods);
    } catch (err) {
        console.error("Error fetching disabled months and years:", err);

        res.status(500).json({ message: "Error fetching disabled months and years", error: err.message });
    }
}

async function deleteAttendance(req, res) {
    const { month, year } = req.body;

    if (!month || !year) {
        return res.status(400).json({ message: 'Month and Year are required' });
    }

    try {
        await labourModel.deleteAttendanceDetails(month, year);
        await labourModel.deleteAttendanceSummary(month, year);

        res.status(200).json({ message: 'Attendance deleted successfully' });
    } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({ message: 'Error deleting attendance', error });
    }
}


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
    const { month, year, search } = req.query;

    if (!month || !year) {
        return res.status(400).json({ message: 'Month and Year are required' });
    }

    try {
        const details = await labourModel.fetchAttendanceDetailsByMonthYear(month, year, search);
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
        markWeeklyOff,
        updatedFields,
        userType,
    } = req.body;


    if (!labourId || !date) {
        return res.status(400).json({ message: 'Labour ID and Date are required.' });
    }

    const pool = await poolPromise;

    const checkAdminApproval = await pool.request()
        .input('labourId', sql.NVarChar, labourId)
        .input('AttendanceId', sql.Int, AttendanceId)
        .query(`
            SELECT *
            FROM [LabourAttendanceApproval]
            WHERE LabourID = @labourId AND AttendanceId = @AttendanceId AND ApprovalStatus = 'Pending'
        `);

    if (checkAdminApproval.recordset.length > 0) {
        return res.status(400).json({ message: 'Attendance is Already Pending with Admin Approval.' });
    }

    const checkUserApproval = await pool.request()
        .input('labourId', sql.NVarChar, labourId)
        .input('AttendanceId', sql.Int, AttendanceId)
        .input('userType', sql.NVarChar, userType)
        .query(`
            SELECT *
            FROM [LabourAttendanceApproval]
            WHERE LabourID = @labourId AND AttendanceId = @AttendanceId AND ApprovalStatus = 'Pending' AND userType = @userType
        `);

    if (checkUserApproval.recordset.length > 0) {
        return res.status(400).json({ message: 'Attendance is Already Pending with User Approval.' });
    }

    if (
        !firstPunchManually &&
        !lastPunchManually &&
        (!overtimeManually || String(overtimeManually).trim() === '')
    ) {
        return res.status(400).json({ message: 'At least one of Overtime, First Punch, or Last Punch must be provided.' });
    }

    if (AttendanceId === undefined || AttendanceId === null || isNaN(AttendanceId)) {
        console.error('Invalid AttendanceId:', AttendanceId);
        return res.status(400).json({ message: 'AttendanceId must be a valid number and cannot be empty.' });
    }

    try {
        let finalOnboardName = Array.isArray(onboardName)
            ? onboardName.filter((name) => name !== 'null' && name.trim() !== '')[0]
            : onboardName;

        const timesUpdated = await labourModel.getTimesUpdateForMonth(labourId, date);

        if (markWeeklyOff === true) {
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
                markWeeklyOff,
                updatedFields,
            });

            return res.status(200).json({ message: 'Attendance updated successfully.' });
        }

        const isEncUser = userType === 'ENC';
        const needsUserApproval =
            (isEncUser && AttendanceStatus !== "MP") ||
            (isEncUser && overtimeManually) ||
            (isEncUser && AttendanceStatus === "MP" && timesUpdated >= 3);

        if (needsUserApproval) {
            await labourModel.markAttendanceForApproval(
                AttendanceId,
                labourId,
                date,
                overtimeManually,
                firstPunchManually,
                lastPunchManually,
                remarkManually,
                finalOnboardName,
                markWeeklyOff,
                updatedFields,
                userType
            );

            return res.status(200).json({ message: 'Attendance sent To USER APPROVAL.' });
        }

        const needsAdminApproval =
            AttendanceStatus !== "MP" ||
            (AttendanceStatus === "MP" && timesUpdated >= 3);

        if (needsAdminApproval) {
            await labourModel.markAttendanceForApproval(
                AttendanceId,
                labourId,
                date,
                overtimeManually,
                firstPunchManually,
                lastPunchManually,
                remarkManually,
                finalOnboardName,
                markWeeklyOff,
                updatedFields,
                userType
            );

            return res.status(200).json({ message: 'Attendance sent To ADMIN APPROVAL.' });
        }

        // ✅ Final: Direct Save if no approvals needed
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
            markWeeklyOff,
            AttendanceStatus
        });

        return res.status(200).json({ message: 'Attendance updated successfully.' });

    } catch (error) {
        console.error('Error updating attendance:', error);
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
}

async function approveAttendanceController(req, res) {
    const { AttendanceId } = req.query;
    if (!AttendanceId) {
        return res.status(400).json({ message: 'id is required.' });
    }

    try {
        const result = await labourModel.approveAttendance(AttendanceId);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in approving attendance:', error);
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

async function rejectAttendanceControllerAdmin(req, res) {
    const { AttendanceId, rejectReason } = req.query;
    if (!AttendanceId) {
        return res.status(400).json({ message: 'id is required.' });
    }

    try {
        const result = await labourModel.rejectAttendanceAdmin(AttendanceId, rejectReason);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in approving attendance:', error);
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}


async function rejectAttendanceController(req, res) {
    const { AttendanceId, rejectReason } = req.query;
    // const id = parseInt(req.params.id, 10);  


    if (isNaN(AttendanceId)) {
        return res.status(400).json({ message: 'Invalid attendance ID.' });
    }

    if (!rejectReason || rejectReason.trim() === '') {
        return res.status(400).json({ message: 'Reject reason is required.' });
    }

    try {
        const success = await labourModel.rejectAttendance(AttendanceId, rejectReason); // Call model function
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
        const { startDate, endDate, projectName, department } = req.query;


        if (!startDate || !endDate || !projectName) {
            return res.status(400).json({ message: 'Missing required parameters: startDate, endDate, or projectId.' });
        }

        const attendanceData = await labourModel.getAttendanceByDateRange(projectName, startDate, endDate, department);

        if (attendanceData.length === 0) {
            return res.status(404).json({ message: 'No attendance data found for the selected criteria.' });
        }

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(attendanceData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Labour Attendance');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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
        // Convert Excel numeric date → YYYY-MM-DD
        const convertExcelDate = (serial) => {
            const utcDays = Math.floor(serial - 25569);
            const utcValue = utcDays * 86400;
            const dateInfo = new Date(utcValue * 1000);
            return dateInfo.toISOString().split('T')[0];
        };

        const validData = data.map((row) => ({
            ...row,
            Date: typeof row.Date === 'number' ? convertExcelDate(row.Date) : row.Date,
        }));

        // Split into matched / unmatched
        const { matchedRows, unmatchedRows } = await labourModel.getMatchedRows(validData);

        // ✅ Update existing
        if (matchedRows.length > 0) {
            await labourModel.updateMatchedRows(matchedRows);
        }

        // ✅ Insert news
        if (unmatchedRows.length > 0) {
            await labourModel.insertUnmatchedRows(unmatchedRows);
        }

        // ✅ Update overtime totals at summary level
        const groups = {};
        validData.forEach((row) => {
            const labourId = row.LabourId;
            const selectedMonth = row.Date.substring(0, 7);
            const key = `${labourId}_${selectedMonth}`;
            groups[key] = { labourId, selectedMonth };
        });

        for (const key in groups) {
            await labourModel.updateTotalOvertimeHours(groups[key].labourId, groups[key].selectedMonth);
        }

        res.send({
            message: 'Attendance imported successfully',
            matchedRows: matchedRows.length,
            unmatchedRows: unmatchedRows.length,
        });
    } catch (error) {
        console.error('Error importing data:', error);
        res.status(500).send({ message: error.message });
    }
};

// const importAttendance = async (req, res) => {
//     try {
//         const workbook = xlsx.readFile(req.file.path);
//         const sheet = workbook.Sheets[workbook.SheetNames[0]];
//         const data = xlsx.utils.sheet_to_json(sheet);

//         const convertExcelDate = (serial) => {
//             const utcDays = Math.floor(serial - 25569);
//             const utcValue = utcDays * 86400;
//             const dateInfo = new Date(utcValue * 1000);
//             return dateInfo.toISOString().split('T')[0]; // Format YYYY-MM-DD
//         };

//         const validData = data.map((row) => ({
//             ...row,
//             Date: typeof row.Date === 'number' ? convertExcelDate(row.Date) : row.Date,
//         }));

//         const { matchedRows, unmatchedRows } = await labourModel.getMatchedRows(validData);


//         // Update matched rows in bulk
//         if (matchedRows.length > 0) {
//             await labourModel.updateMatchedRows(matchedRows);
//         }

//         // Insert unmatched rows in bulk
//         if (unmatchedRows.length > 0) {
//             await labourModel.insertUnmatchedRows(unmatchedRows);
//         }

//         const groups = {};
//         validData.forEach((row) => {
//             const labourId = row.LabourId;
//             const selectedMonth = row.Date.substring(0, 7);
//             const key = `${labourId}_${selectedMonth}`;
//             groups[key] = { labourId, selectedMonth };
//         });

//         for (const key in groups) {
//             await labourModel.updateTotalOvertimeHours(groups[key].labourId, groups[key].selectedMonth);
//         }

//         res.send({
//             message: 'Data imported successfully',
//             matchedRows: matchedRows.length,
//             unmatchedRows: unmatchedRows.length,
//         });
//     } catch (error) {
//         console.error('Error importing data:', error);
//         res.status(500).send({ message: error.message });
//     }
// };

async function LabourAttendanceApproval(req, res) {
    try {
        const summary = await labourModel.LabourAttendanceApprovalModel();
        res.status(200).json(summary);
    } catch (error) {
        console.error('Error fetching attendance Attendance Approval:', error);
        res.status(500).json({ message: 'Error fetching Attendance Approval' });
    }
};



const getLabourMonthlyWages = async (req, res) => {
    try {
        const wages = await labourModel.getLabourMonthlyWages();
        res.status(200).json(wages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wages', error });
    }
};


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
        } else if (result && !result.success) {
            return res.status(200).json({ message: result.message });
        } else {
            return res.status(500).json({ message: 'Failed to upsert wages' });
        }

    } catch (error) {
        console.error('Error in upsertLabourMonthlyWages:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};


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

const getWagesAdminApprovals = async (req, res) => {
    try {
        const approvals = await labourModel.getWagesAdminApprovals();
        res.status(200).json(approvals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching approvals', error });
    }
};

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
    const { ApprovalID, Remarks } = req.query;

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
        let { projectName, month, payStructure } = req.query;

        if (!month) {
            return res.status(400).json({ message: 'Missing required parameter: month' });
        }

        if (!projectName || projectName.trim() === "") {
            projectName = "all";
        }

        const startDate = `${month}-01`;
        const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1) - 1)
            .toISOString()
            .split('T')[0];


        const wagesData = await labourModel.getWagesByDateRange(projectName, payStructure, startDate, endDate);

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(wagesData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Labour Wages');

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

const exportMonthlyWagesExcel = async (req, res) => {
    req.query.payStructure = 'Monthly Wages';
    exportWagesexcelSheet(req, res);
};

const exportFixedWagesExcel = async (req, res) => {
    req.query.payStructure = 'Fix Monthly Wages';
    exportWagesexcelSheet(req, res);
};

/**
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

        fs.unlinkSync(filePath);
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

const getWagesAndLabourOnboardingJoincontroller = async (req, res) => {
    try {
        const filters = req.query;
        const joinWagesLabour = await labourModel.getWagesAndLabourOnboardingJoin(filters);
        res.status(200).json(joinWagesLabour);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Error fetching data', error });
    }
};

const getAttendanceReportAndLabourOnboardingJoincontroller = async (req, res) => {
    try {
        const filters = {
            ProjectID: req.query.ProjectID || '',
            DepartmentID: req.query.DepartmentID || ''
        };
        const joinAttendanceLabour = await labourModel.getAttendanceReportAAndLabourOnboardingJoin(filters);
        res.status(200).json(joinAttendanceLabour);
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

async function searchLaboursFromVariableInput(req, res) {
    const { q } = req.query;

    try {
        const results = await labourModel.searchFromVariableInput(q);
        return res.json(results);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


async function searchLaboursFromSiteTransfer(req, res) {
    const { q } = req.query;

    try {
        const results = await labourModel.searchLaboursFromSiteTransfer(q);
        return res.json(results);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function searchAttendance(req, res) {
    const { q } = req.query;

    try {
        const results = await labourModel.searchAttendance(q);
        return res.json(results);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


async function updateOTHoursAttendance(req, res) {
    try {
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
            markWeeklyOff,
            updatedFields,
            userType,
        } = req.body;


        // 🔒 Required field validations
        if (!labourId || !date || typeof overtimeManually === 'undefined') {
            return res.status(400).json({ message: 'Missing required fields: labourId, date, or overtimeManually.' });
        }

        if (!Array.isArray(updatedFields) || updatedFields.length === 0) {
            return res.status(400).json({ message: 'updatedFields must be a non-empty array.' });
        }

        const isOnlyOTUpdate = updatedFields.length === 1 && updatedFields[0] === 'overtimemanually';
        if (!isOnlyOTUpdate) {
            return res.status(400).json({ message: 'Only overtimeManually update is allowed through this endpoint.' });
        }

        const finalOnboardName = onboardName || 'System';
        const finalUserType = userType || 'System';

        // ✅ Build only relevant fields based on updatedFields
        const updatePayload = {
            labourId,
            date,
            AttendanceId,
            onboardName: finalOnboardName,
            editUserName: finalOnboardName,
            userType: finalUserType,
        };

        if (updatedFields.includes('overtimemanually') && overtimeManually !== undefined) {
            updatePayload.overtimeManually = overtimeManually;
        }

        // ❌ If no actual fields to update, reject
        const keysToUpdate = Object.keys(updatePayload).filter(k => !['labourId', 'date', 'AttendanceId', 'onboardName', 'editUserName'].includes(k));
        if (keysToUpdate.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update.' });
        }
        if (finalUserType === 'ENC' && overtimeManually) {
            await labourModel.markAttendanceForApproval(
                AttendanceId,
                labourId,
                date,
                overtimeManually,
                firstPunchManually,
                lastPunchManually,
                remarkManually,
                finalOnboardName,
                markWeeklyOff,
                updatedFields,
                finalUserType
            );

            return res.status(200).json({ message: 'Attendance sent To USER APPROVAL.' });
        }

        // 📥 Call model
        await labourModel.upsertAttendance(updatePayload);

        return res.status(200).json({ message: 'Overtime manually updated successfully.' });

    } catch (error) {
        console.error('Error updating overtime manually:', error);
        return res.status(error.statusCode || 500).json({ message: error.message || 'Internal server error.' });
    }
}


const generateAttendancePDF = async (req, res) => {
    try {
        const { startDate, endDate, projectName, department } = {
            ...req.body,
            ...req.query,
            ...req.params
        };

        if (!startDate || !endDate || !projectName) {
            return res.status(400).json({
                message: 'Missing required parameters: startDate, endDate, or projectName.'
            });
        }

        const projectNameStr = Array.isArray(projectName) ? projectName.join(',') : projectName;
        const departmentStr = department
            ? (Array.isArray(department) ? department.join(',') : department)
            : '';

        const attendanceData = await labourModel.getAttendanceByDateRange(
            projectNameStr,
            startDate,
            endDate,
            departmentStr
        );

        if (!attendanceData || attendanceData.length === 0) {
            return res.status(404).json({
                message: 'No attendance data found for the selected criteria.'
            });
        }

        const labourGrouped = {};
        attendanceData.forEach(entry => {
            const labourId = entry.LabourId;
            const date = new Date(entry.Date).toISOString().split('T')[0];

            if (!labourGrouped[labourId]) {
                labourGrouped[labourId] = {
                    name: entry.name,
                    department: entry.departmentName,
                    project: entry.ProjectName,
                    businessUnit: entry.BusinessUnit,
                    dates: {}
                };
            }

            labourGrouped[labourId].dates[date] = {
                status: entry.Status || '-',
                inTime: entry.FirstPunchManually || '',
                outTime: entry.LastPunchManually || '',
                ot: entry.OvertimeManually || '',
                remark: entry.RemarkManually || ''
            };
        });

        const start = new Date(startDate);
        const end = new Date(endDate);
        const dateList = [];
        while (start <= end) {
            dateList.push(new Date(start).toISOString().split('T')[0]);
            start.setDate(start.getDate() + 1);
        }

        let labourSections = '';
        const labourEntries = Object.entries(labourGrouped);
        for (let i = 0; i < labourEntries.length; i++) {
            const [labourId, data] = labourEntries[i];

            const statusRow = dateList.map(date => `<td>${data.dates[date]?.status || '-'}</td>`).join('');
            const inTimeRow = dateList.map(date => `<td>${data.dates[date]?.inTime || ''}</td>`).join('');
            const outTimeRow = dateList.map(date => `<td>${data.dates[date]?.outTime || ''}</td>`).join('');
            const otRow = dateList.map(date => `<td>${data.dates[date]?.ot || ''}</td>`).join('');
            const remarkRow = dateList.map(date => `<td>${data.dates[date]?.remark || ''}</td>`).join('');

            const formattedDates = dateList.map(d => {
                const [year, month, day] = d.split('-');
                return `${day}-${month}-${year}`;
            });

            labourSections += `
        <div class="labour-card ${i % 3 === 2 ? 'page-break' : ''}">
          <h4>${labourId} - ${data.name}</h4>
          <p><strong>Dept:</strong> ${data.department}<br><strong>Proj:</strong> ${data.project}<br><strong>Unit:</strong> ${data.businessUnit}</p>
          <table>
            <thead>
              <tr>
                <th>Details</th>
                ${formattedDates.map(d => `<th>${d}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr><td>Status</td>${statusRow}</tr>
              <tr><td>In Time</td>${inTimeRow}</tr>
              <tr><td>Out Time</td>${outTimeRow}</tr>
              <tr><td>OT</td>${otRow}</tr>
              <tr><td>Remark</td>${remarkRow}</tr>
            </tbody>
          </table>
        </div>
      `;
        }

        const fullHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; color: #d32f2f; }
            h4 { margin: 5px 0; color: #1976d2; }

            .labour-card {
              border: 1px solid #ccc;
              padding: 10px;
              margin-bottom: 20px;
              font-size: 10px;
              page-break-inside: avoid;
            }

            .page-break {
              page-break-after: always;
            }

            table {
              border-collapse: collapse;
              width: 100%;
              font-size: 9px;
              table-layout: fixed;
            }

            th, td {
              border: 1px solid #999;
              padding: 2px;
              text-align: center;
              word-wrap: break-word;
              vertical-align: top;
            }

            th {
              background-color: #f2f2f2;
            }

            tr:nth-child(even) td {
              background: #f9f9f9;
            }
          </style>
        </head>
        <body>
          <h2>Labour Attendance Report</h2>
          <p style="text-align:center;"><strong>From:</strong> ${startDate} <strong>To:</strong> ${endDate}</p>
          ${labourSections}
        </body>
      </html>
    `;

        const options = {
            format: 'A4',
            orientation: 'landscape',
            border: {
                top: '10mm',
                bottom: '10mm',
                left: '10mm',
                right: '10mm'
            }
        };

        pdf.create(fullHtml, options).toBuffer((err, buffer) => {
            if (err) {
                console.error('PDF generation error:', err);
                return res.status(500).json({ message: 'Failed to generate PDF.' });
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=attendance_report_${moment().format('YYYYMMDD')}.pdf`
            );
            res.end(buffer);
        });

    } catch (error) {
        console.error('Error generating attendance PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error generating attendance PDF.' });
        }
    }
};

module.exports = {
    handleCheckAadhaar,
    getNextUniqueID,
    createRecord,
    getAllRecords,
    getRecordById,
    updateRecord,
    deleteRecord,
    getAllRecordsLaboursOnboarding,
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
    markWagesForApprovalController,
    exportMonthlyWagesExcel,
    exportFixedWagesExcel,
    searchLaboursFromSiteTransfer,
    searchAttendance,
    searchLaboursFromVariableInput,
    getAttendanceReportAndLabourOnboardingJoincontroller,
    getAllLaboursAttendanceDaily,
    updateOTHoursAttendance,
    searchLaboursForAttendance,
    generateAttendancePDF
};
