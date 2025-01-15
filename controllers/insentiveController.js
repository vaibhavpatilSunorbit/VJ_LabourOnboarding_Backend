const { sql, poolPromise2 } = require('../config/dbConfig2');
const { poolPromise3 } = require('../config/dbConfig3');
const { poolPromise } = require('../config/dbConfig');
const path = require('path');
const fs = require('fs');
const axios = require('axios')
const multer = require('multer');
const { upload } = require('../server');
const xml2js = require('xml2js');
const labourModel = require('../models/insentiveModel');        
const cron = require('node-cron');
const logger = require('../logger'); // Assuming logger is defined in logger.js   
const { createLogger, format, transports } = require('winston');
const { isHoliday } = require('../models/labourModel');    
const xlsx = require('xlsx'); 


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



const upsertLabourVariablePay = async (req, res) => {
    try {
        const payload = req.body;
        console.log('req.body++__++__', req.body);

        if (!payload.LabourID || !payload.payStructure) {
            return res.status(400).json({ message: 'Labour ID and Pay Structure are required' });
        }

        const existingWages = await labourModel.checkExistingWages(payload.LabourID);
        console.log('payload of wages 55', existingWages);

        // Check if existing wages were found or not
        if (existingWages) {
            console.log("Updating existing wages because a record was found.");
            await labourModel.upsertLabourVariablePay(payload);
            return res.status(200).json({ message: 'VariablePay updated successfully.' });
        } else {
            console.log("No existing wages found, inserting new wages.");
            await labourModel.upsertLabourVariablePay(payload);
            return res.status(200).json({ message: 'VariablePay added successfully.' });
        }
    } catch (error) {
        console.error('Error updating VariablePay:', error);
        res.status(500).json({ message: 'Error updating VariablePay', error });
    }
};





module.exports = {
    createRecord,
    searchLaboursFromWages,
    upsertLabourVariablePay

}