
const labourModel = require('../models/labourModel');
const {sql, poolPromise2 } = require('../config/dbConfig2');
const path = require('path');
// const { sql, poolPromise2 } = require('../config/dbConfig');

// const baseUrl = 'http://localhost:4000/uploads/';
const baseUrl = 'https://laboursandbox.vjerp.com/uploads/';


// async function handleCheckAadhaar(req, res) {
//     const { aadhaarNumber, status, isApproved } = req.body;
  
//     try {
//       const exists = await labourModel.checkAadhaarExists(aadhaarNumber);
  
//       res.status(200).json({ exists });
//     } catch (error) {
//       console.error('Error in handleCheckAadhaar:', error);
//       res.status(500).json({ error: 'Error checking Aadhaar number' });
//     }
//   }


async function handleCheckAadhaar(req, res) {
    const { aadhaarNumber } = req.body;
  
    try {
      const labourRecord = await labourModel.checkAadhaarExists(aadhaarNumber);
  
      if (labourRecord) {
        if (labourRecord.status === 'Resubmitted' && labourRecord.isApproved === 3) {
          console.log("Returning skipCheck for Resubmitted and isApproved 3"); 
          return res.status(200).json({ exists: false, skipCheck: true });
        } else {
          console.log("Returning exists true");
          return res.status(200).json({ exists: true });
        }
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
    }
}
  

// async function createRecord(req, res) {
//     try {
//         const {
//             labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
//             address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
//             accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
//             contractorName, contractorNumber, designation, title, Marital_Status, companyName,
//         } = req.body;

//         const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof } = req.files;

//         // if (!labourOwnership || !name  || !contactNumber || !gender || !dateOfJoining || !address || !pincode ||
//         //     !taluka || !district || !village || !state || !emergencyContact || !photoSrc || !bankName ||
//         //     !branch || !accountNumber || !ifscCode || !projectName || !labourCategory || !department || !designation )  {
//         //     return res.status(400).json({ msg: "All fields are required" });
//         // }

//         const nextID = await labourModel.getNextUniqueID();
        
//         const frontImageFilename = path.basename(uploadAadhaarFront[0].path);
//         const backImageFilename = path.basename(uploadAadhaarBack[0].path);
//         const IdProofImageFilename = path.basename(uploadIdProof[0].path);
//         const photoSrcFilename = path.basename(photoSrc[0].path);

  
//         const frontImageUrl = baseUrl + frontImageFilename;
//         const backImageUrl = baseUrl + backImageFilename;
//         const IdProofImageUrl = baseUrl + IdProofImageFilename;
//         const photoSrcUrl = baseUrl + photoSrcFilename;

        

//         const dateOfJoiningDate = new Date(dateOfJoining);
//         const fromDate = new Date(dateOfJoiningDate.getFullYear(), dateOfJoiningDate.getMonth(), 1);
//         const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' });

//          const data = await labourModel.registerData({
//             LabourID: nextID,
//           labourOwnership, uploadAadhaarFront: frontImageUrl, uploadAadhaarBack: backImageUrl, uploadIdProof: IdProofImageUrl, name, aadhaarNumber,
//             dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date: dateOfJoining, From_Date: fromDate.toISOString().split('T')[0], Period: period, address, pincode, taluka,
//             district, village, state, emergencyContact, photoSrc: photoSrcUrl, bankName, branch,
//             accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
//             contractorName, contractorNumber, designation, title, Marital_Status, companyName,
//         });

//         return res.status(201).json({ msg: "User created successfully", data: data });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ msg: 'Internal server error' });
//     }
// }




// async function createRecord(req, res) {
//     try {
//         const {
//             labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
//             address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
//             accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
//             contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate,
//         } = req.body;

//         const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof, uploadInductionDoc } = req.files;

//         // Validate file fields
//         if (!uploadAadhaarFront || !photoSrc || !uploadIdProof) {
//             return res.status(400).json({ msg: 'All file fields are required' });
//         }

//         const frontImageFilename = path.basename(uploadAadhaarFront[0].path);
//         const backImageFilename = uploadAadhaarBack ? path.basename(uploadAadhaarBack[0].path) : null;
//         const IdProofImageFilename = path.basename(uploadIdProof[0].path);
//         const uploadInductionDocFilename = path.basename(uploadInductionDoc[0].path);
//         const photoSrcFilename = path.basename(photoSrc[0].path);

//         const frontImageUrl = baseUrl + frontImageFilename;
//         const backImageUrl = backImageFilename ? baseUrl + backImageFilename : null;
//         const IdProofImageUrl = baseUrl + IdProofImageFilename;
//         const uploadInductionDocImageUrl = baseUrl + uploadInductionDocFilename;
//         const photoSrcUrl = baseUrl + photoSrcFilename;

//         const dateOfJoiningDate = new Date(dateOfJoining);
//         const fromDate = new Date(dateOfJoiningDate.getFullYear(), dateOfJoiningDate.getMonth(), 1);
//         const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' });

//         const validTillDate = new Date(dateOfJoiningDate);
//         validTillDate.setFullYear(validTillDate.getFullYear() + 1);

//         const retirementDate = new Date(dateOfBirth);
//         retirementDate.setFullYear(retirementDate.getFullYear() + 60);

//         const pool = await poolPromise2;
//         const projectRequest = pool.request();

//         const isNumeric = !isNaN(projectName);
//         projectRequest.input('projectName', isNumeric ? sql.Int : sql.VarChar, projectName);

//         let query;
//         if (isNumeric) {
//             query = `
//                 SELECT a.id, a.Description 
//                 FROM Framework.BusinessUnit a
//                 LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
//                 WHERE a.id = @projectName
//                 AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
//                 AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
//                 AND b.Id = 3
//             `;
//         } else {
//             query = `
//                 SELECT a.id, a.Description 
//                 FROM Framework.BusinessUnit a
//                 LEFT JOIN Framework.BusinessUnitSegment b ON b.Id = a.SegmentId
//                 WHERE a.Description = @projectName
//                 AND (a.IsDiscontinueBU = 0 OR a.IsDiscontinueBU IS NULL)
//                 AND (a.IsDeleted = 0 OR a.IsDeleted IS NULL)
//                 AND b.Id = 3
//             `;
//         }

//         const projectResult = await projectRequest.query(query);

//         if (projectResult.recordset.length === 0) {
//             return res.status(400).json({ msg: 'Invalid project name' });
//         }

//         const projectId = projectResult.recordset[0].id;
//         const location = projectResult.recordset[0].Description; // Store the Business_Unit name in location
//         const businessUnit = projectResult.recordset[0].Description;

//         const parentIdResult = await pool.request().query(`
//             SELECT ParentId 
//             FROM Framework.BusinessUnit 
//             WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
//             AND (IsDeleted = 0 OR IsDeleted IS NULL) 
//             AND Id = ${projectId}
//         `);

//         if (parentIdResult.recordset.length === 0) {
//             return res.status(404).send('ParentId not found for the selected project');
//         }

//         const parentId = parentIdResult.recordset[0].ParentId;

//         const companyNameResult = await pool.request().query(`
//             SELECT Id, Description AS Company_Name 
//             FROM Framework.BusinessUnit 
//             WHERE (IsDiscontinueBU = 0 OR IsDiscontinueBU IS NULL)
//             AND (IsDeleted = 0 OR IsDeleted IS NULL) 
//             AND Id = ${parentId}
//         `);

//         const companyNameFromDb = companyNameResult.recordset[0].Company_Name;

//         let salaryBu;
//         if (companyNameFromDb === 'SANKALP CONTRACTS PRIVATE LIMITED') {
//             salaryBu = `${companyNameFromDb} - HO`;
//         } else {
//             salaryBu = location;
//         }

//         const creationDate = new Date();

//         // Fetch additional IDs
//         const employeeResult = await pool.request().query(`
//             SELECT * FROM Payroll.Employee WHERE LedgerId = (
//                 SELECT LedgerId FROM Payroll.Employee WHERE id = ${employeeId}
//             )
//         `);

//         const gradeResult = await pool.request().query(`
//             SELECT * FROM Payroll.Grade WHERE id = ${gradeId}
//         `);

//         const departmentResult = await pool.request().query(`
//             SELECT * FROM Payroll.Department WHERE id = ${departmentId}
//         `);

//         const designationResult = await pool.request().query(`
//             SELECT * FROM Payroll.Designation WHERE id = ${designationId}
//         `);

//         // Extract IDs from results
//         const ledgerId = employeeResult.recordset[0].LedgerId;
//         const gradeId = gradeResult.recordset[0].id;
//         const departmentId = departmentResult.recordset[0].id;
//         const designationId = designationResult.recordset[0].id;

//         const data = await labourModel.registerData({
//             labourOwnership, uploadAadhaarFront: frontImageUrl, uploadAadhaarBack: backImageUrl, uploadIdProof: IdProofImageUrl, uploadInductionDoc: uploadInductionDocImageUrl, name, aadhaarNumber,
//             dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date: dateOfJoining, ConfirmDate: dateOfJoining, From_Date: fromDate.toISOString().split('T')[0], Period: period, address, pincode, taluka,
//             district, village, state, emergencyContact, photoSrc: photoSrcUrl, bankName, branch,
//             accountNumber, ifscCode, projectName, labourCategory, department, workingHours, location, SalaryBu: salaryBu, businessUnit,
//             contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate, ValidTill: validTillDate.toISOString().split('T')[0],
//             retirementDate: retirementDate.toISOString().split('T')[0], WorkingBu: location, CreationDate: creationDate.toISOString(), 
//             DepartmentId: departmentId, DesignationId: designationId, LedgerId: ledgerId, GradeId: gradeId
//         });

//         return res.status(201).json({ msg: "User created successfully", data: data });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ msg: 'Internal server error' });
//     }
// }




// This is running code comment in 29-07-2024

async function createRecord(req, res) {
    try {
        const {
            labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate, departmentId, designationId, labourCategoryId} = req.body;

        const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof, uploadInductionDoc } = req.files;
        console.log('Received IDs:', { departmentId, designationId, labourCategoryId});
        // Validate file fields
        if (!uploadAadhaarFront || !photoSrc || !uploadIdProof) {
            return res.status(400).json({ msg: 'All file fields are required' });
        }

        const frontImageFilename = path.basename(uploadAadhaarFront[0].path);
        // const backImageFilename = path.basename(uploadAadhaarBack[0].path);
        const backImageFilename = uploadAadhaarBack ? path.basename(uploadAadhaarBack[0].path) : null;
        const IdProofImageFilename = path.basename(uploadIdProof[0].path);
        const uploadInductionDocFilename = path.basename(uploadInductionDoc[0].path);
        const photoSrcFilename = path.basename(photoSrc[0].path);

        const frontImageUrl = baseUrl + frontImageFilename;
        // const backImageUrl = baseUrl + backImageFilename;
        const backImageUrl = backImageFilename ? baseUrl + backImageFilename : null;
        const IdProofImageUrl = baseUrl + IdProofImageFilename;
        const uploadInductionDocImageUrl = baseUrl + uploadInductionDocFilename;
        const photoSrcUrl = baseUrl + photoSrcFilename;

        const dateOfJoiningDate = new Date(dateOfJoining);
        const fromDate = new Date(dateOfJoiningDate.getFullYear(), dateOfJoiningDate.getMonth(), 1);
        // const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' });
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
    console.log('Invalid project name:', projectName); // Debug log
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

const creationDate = new Date();
        
        const data = await labourModel.registerData({
            labourOwnership, uploadAadhaarFront: frontImageUrl, uploadAadhaarBack: backImageUrl, uploadIdProof: IdProofImageUrl,uploadInductionDoc: uploadInductionDocImageUrl ,name, aadhaarNumber,
            dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date: dateOfJoining, ConfirmDate: dateOfJoining, From_Date: fromDate.toISOString().split('T')[0], Period: period, address, pincode, taluka,
            district, village, state, emergencyContact, photoSrc: photoSrcUrl, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,location, SalaryBu: salaryBu, businessUnit,
            contractorName, contractorNumber, designation, title, Marital_Status, companyName,Induction_Date, Inducted_By, OnboardName,expiryDate , ValidTill: validTillDate.toISOString().split('T')[0],
            retirementDate: retirementDate.toISOString().split('T')[0], WorkingBu: location, CreationDate: creationDate.toISOString(), departmentId, designationId, labourCategoryId});

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

// async function updateRecord(req, res) {
//     try {
//         const { id } = req.params;
//         const updatedData = req.body;
//         const updated = await labourModel.update(id, updatedData);
//         if (updated === 0) {
//             return res.status(404).json({ error: 'Record not found' });
//         }
//         return res.json({ message: 'Record updated successfully' });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }
async function updateRecord(req, res) {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        if (!id) {
            return res.status(400).json({ error: 'ID is required' });
        }
        console.log('Updating record with ID:', id);
        // console.log('Updated data:', updatedData);

        const updated = await labourModel.update(id, updatedData);
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
            res.json({ success: true, message: 'Labour approved successfully.', data : success });
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
        return res.json({success:true, message: 'Labour resubmitted successfully' });
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
};
















// imp code changes 16-07-2024



// const labourModel = require('../models/labourModel');
// const path = require('path');

// const baseUrl = 'http://localhost:4000/uploads/';
// // const baseUrl = 'https://laboursandbox.vjerp.com/uploads/';


// // async function handleCheckAadhaar(req, res) {
// //     const { aadhaarNumber, status, isApproved } = req.body;
  
// //     try {
// //       const exists = await labourModel.checkAadhaarExists(aadhaarNumber);
  
// //       res.status(200).json({ exists });
// //     } catch (error) {
// //       console.error('Error in handleCheckAadhaar:', error);
// //       res.status(500).json({ error: 'Error checking Aadhaar number' });
// //     }
// //   }


// async function handleCheckAadhaar(req, res) {
//     const { aadhaarNumber } = req.body;
  
//     try {
//       const labourRecord = await labourModel.checkAadhaarExists(aadhaarNumber);
  
//       if (labourRecord) {
//         if (labourRecord.status === 'Resubmitted' && labourRecord.isApproved === 3) {
//           console.log("Returning skipCheck for Resubmitted and isApproved 3"); 
//           return res.status(200).json({ exists: false, skipCheck: true });
//         } else {
//           console.log("Returning exists true");
//           return res.status(200).json({ exists: true });
//         }
//       } else {
//         console.log("Returning exists false"); 
//         return res.status(200).json({ exists: false });
//       }
//     } catch (error) {
//       console.error('Error in handleCheckAadhaar:', error);
//       return res.status(500).json({ error: 'Error checking Aadhaar number' });
//     }
//   }
  
  

// // async function handleCheckAadhaar(req, res) {
// //     const { aadhaarNumber } = req.body;

// //     try {
// //         const labourRecord = await labourModel.checkAadhaarExists(aadhaarNumber);

// //         if (labourRecord) {
// //             if (labourRecord.status === 'Resubmitted' && labourRecord.isApproved === 3) {
// //                 // const formData = await labourModel.getFormDataByAadhaar(aadhaarNumber);
// //                 return res.status(200).json({ exists: true, formData: labourRecord });
// //             } else {
// //                 return res.status(200).json({ exists: true });
// //             }
// //         } else {
// //             return res.status(200).json({ exists: false });
// //         }
// //     } catch (error) {
// //         console.error('Error in handleCheckAadhaar:', error);
// //         return res.status(500).json({ error: 'Error checking Aadhaar number' });
// //     }
// // }

// async function getNextUniqueID(req, res) {
//     try {
//       const nextID = await labourModel.getNextUniqueID();
//       res.json({ nextID });
//     } catch (error) {
//       console.error('Error in getNextUniqueID:', error.message);
//       res.status(500).json({ message: 'Internal server error' });
//     }
//   }
  

// // async function createRecord(req, res) {
// //     try {
// //         const {
// //             labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
// //             address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
// //             accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
// //             contractorName, contractorNumber, designation, title, Marital_Status, companyName,
// //         } = req.body;

// //         const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof } = req.files;

// //         // if (!labourOwnership || !name  || !contactNumber || !gender || !dateOfJoining || !address || !pincode ||
// //         //     !taluka || !district || !village || !state || !emergencyContact || !photoSrc || !bankName ||
// //         //     !branch || !accountNumber || !ifscCode || !projectName || !labourCategory || !department || !designation )  {
// //         //     return res.status(400).json({ msg: "All fields are required" });
// //         // }

// //         const nextID = await labourModel.getNextUniqueID();
        
// //         const frontImageFilename = path.basename(uploadAadhaarFront[0].path);
// //         const backImageFilename = path.basename(uploadAadhaarBack[0].path);
// //         const IdProofImageFilename = path.basename(uploadIdProof[0].path);
// //         const photoSrcFilename = path.basename(photoSrc[0].path);

  
// //         const frontImageUrl = baseUrl + frontImageFilename;
// //         const backImageUrl = baseUrl + backImageFilename;
// //         const IdProofImageUrl = baseUrl + IdProofImageFilename;
// //         const photoSrcUrl = baseUrl + photoSrcFilename;

        

// //         const dateOfJoiningDate = new Date(dateOfJoining);
// //         const fromDate = new Date(dateOfJoiningDate.getFullYear(), dateOfJoiningDate.getMonth(), 1);
// //         const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' });

// //          const data = await labourModel.registerData({
// //             LabourID: nextID,
// //           labourOwnership, uploadAadhaarFront: frontImageUrl, uploadAadhaarBack: backImageUrl, uploadIdProof: IdProofImageUrl, name, aadhaarNumber,
// //             dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date: dateOfJoining, From_Date: fromDate.toISOString().split('T')[0], Period: period, address, pincode, taluka,
// //             district, village, state, emergencyContact, photoSrc: photoSrcUrl, bankName, branch,
// //             accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
// //             contractorName, contractorNumber, designation, title, Marital_Status, companyName,
// //         });

// //         return res.status(201).json({ msg: "User created successfully", data: data });
// //     } catch (err) {
// //         console.error(err);
// //         return res.status(500).json({ msg: 'Internal server error' });
// //     }
// // }

// async function createRecord(req, res) {
//     try {
//         const {
//             labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
//             address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
//             accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
//             contractorName, contractorNumber, designation, title, Marital_Status, companyName, Induction_Date, Inducted_By, OnboardName, expiryDate,
//         } = req.body;

//         const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof, uploadInductionDoc } = req.files;

//         // Validate file fields
//         if (!uploadAadhaarFront || !photoSrc || !uploadIdProof) {
//             return res.status(400).json({ msg: 'All file fields are required' });
//         }

//         const frontImageFilename = path.basename(uploadAadhaarFront[0].path);
//         // const backImageFilename = path.basename(uploadAadhaarBack[0].path);
//         const backImageFilename = uploadAadhaarBack ? path.basename(uploadAadhaarBack[0].path) : null;
//         const IdProofImageFilename = path.basename(uploadIdProof[0].path);
//         const uploadInductionDocFilename = path.basename(uploadInductionDoc[0].path);
//         const photoSrcFilename = path.basename(photoSrc[0].path);

//         const frontImageUrl = baseUrl + frontImageFilename;
//         // const backImageUrl = baseUrl + backImageFilename;
//         const backImageUrl = backImageFilename ? baseUrl + backImageFilename : null;
//         const IdProofImageUrl = baseUrl + IdProofImageFilename;
//         const uploadInductionDocImageUrl = baseUrl + uploadInductionDocFilename;
//         const photoSrcUrl = baseUrl + photoSrcFilename;

//         const dateOfJoiningDate = new Date(dateOfJoining);
//         const fromDate = new Date(dateOfJoiningDate.getFullYear(), dateOfJoiningDate.getMonth(), 1);
//         const period = dateOfJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' });

//         const validTillDate = new Date(dateOfJoiningDate);
//         validTillDate.setFullYear(validTillDate.getFullYear() + 1);


        
//         const data = await labourModel.registerData({
//             labourOwnership, uploadAadhaarFront: frontImageUrl, uploadAadhaarBack: backImageUrl, uploadIdProof: IdProofImageUrl,uploadInductionDoc: uploadInductionDocImageUrl ,name, aadhaarNumber,
//             dateOfBirth, contactNumber, gender, dateOfJoining, Group_Join_Date: dateOfJoining, From_Date: fromDate.toISOString().split('T')[0], Period: period, address, pincode, taluka,
//             district, village, state, emergencyContact, photoSrc: photoSrcUrl, bankName, branch,
//             accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
//             contractorName, contractorNumber, designation, title, Marital_Status, companyName,Induction_Date, Inducted_By, OnboardName,expiryDate, ValidTill: validTillDate.toISOString().split('T')[0]
//         });

//         return res.status(201).json({ msg: "User created successfully", data: data });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ msg: 'Internal server error' });
//     }
// }


// async function getAllRecords(req, res) {
//     try {
//         const records = await labourModel.getAll();
//         return res.status(200).json(records);
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }

// async function getRecordById(req, res) {
//     console.log("getRecordById")
//     try {
//         const { id } = req.params;
//         const record = await labourModel.getById(id);
//         if (!record) {
//             return res.status(404).json({ error: 'Record not found' });
//         }
//         return res.json(record);
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }

// // async function updateRecord(req, res) {
// //     try {
// //         const { id } = req.params;
// //         const updatedData = req.body;
// //         const updated = await labourModel.update(id, updatedData);
// //         if (updated === 0) {
// //             return res.status(404).json({ error: 'Record not found' });
// //         }
// //         return res.json({ message: 'Record updated successfully' });
// //     } catch (error) {
// //         console.error(error);
// //         return res.status(500).json({ error: 'Internal server error' });
// //     }
// // }
// async function updateRecord(req, res) {
//     try {
//         const { id } = req.params;
//         const updatedData = req.body;

//         if (!id) {
//             return res.status(400).json({ error: 'ID is required' });
//         }

//         const updated = await labourModel.update(id, updatedData);
//         if (updated === 0) {
//             return res.status(404).json({ error: 'Record not found' });
//         }
//         return res.json({ message: 'Record updated successfully' });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }
// async function deleteRecord(req, res) {
//     try {
//         const { id } = req.params;
//         const rowsAffected = await labourModel.deleteById(id);
//         if (rowsAffected === 0) {
//             return res.status(404).json({ error: 'Record not found' });
//         }
//         return res.json({ message: 'Record deleted successfully' });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }


// async function searchLabours(req, res) {
//     const { q } = req.query;

//     try {
//         const results = await labourModel.search(q);
//         return res.json(results);
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }



// async function getAllLabours(req, res) {
//     try {
//         const labours = await labourModel.getAllLabours();
//         res.json(labours);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// }

// async function approveLabour(req, res) {
//     const id = parseInt(req.params.id, 10); 
//     // console.log(`Received id: ${req.params.id}, Parsed id: ${id}`);

//     if (isNaN(id)) {
//         return res.status(400).json({ message: 'Invalid labour ID' });
//     }

//     try {
//         const nextID = await labourModel.getNextUniqueID(); // Generate next unique LabourID
//         // const onboardName = req.body.OnboardName;

//         console.log('Approving labour ID:', id);
//         console.log('Generated nextID:', nextID);
//         // console.log('OnboardName:', onboardName);

//         const success = await labourModel.approveLabour(id, nextID);
//         if (success) {
//             res.json({ success: true, message: 'Labour approved successfully.' });
//         } else {
//             res.status(404).json({ message: 'Labour not found or already approved.' });
//         }
//     } catch (error) {
//         console.error('Error in approveLabour:', error.message);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// }

// async function rejectLabour(req, res) {
//     // console.log('Fetching rejected labours...');
//     const id = parseInt(req.params.id, 10); 
//     const { Reject_Reason } = req.body;
//     if (isNaN(id)) {
//         return res.status(400).json({ message: 'Invalid labour ID' });
//     }
//     try {
//         // const success = await labourModel.rejectLabour(id);
//         const success = await labourModel.rejectLabour(id, Reject_Reason);
//         if (success) {
//             res.json({ success: true, message: 'Labour rejected successfully.' });
//         } else {
//             res.status(404).json({ message: 'Labour not found or already rejected.' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// }

// async function getApprovedLabours(req, res) {
//     try {
//         // console.log('Fetching approved labours...');
//         const approvedLabours = await labourModel.getApprovedLabours();
//         res.json(approvedLabours);
//     } catch (error) {
//         console.error('Error fetching approved labours:', error.message);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// }


// async function resubmitLabour(req, res) {
//     try {
//         const { id } = req.params;
//         const updated = await labourModel.resubmit(id);
//         if (updated === 0) {
//             return res.status(404).json({ error: 'Record not found' });
//         }
//         return res.json({success:true, message: 'Labour resubmitted successfully' });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }





// module.exports = {
//     handleCheckAadhaar,
//     getNextUniqueID,
//     createRecord,
//     getAllRecords,
//     getRecordById,
//     updateRecord,
//     deleteRecord,
//     searchLabours,
//     getAllLabours,
//     approveLabour,
//     rejectLabour,
//     getApprovedLabours,
//     resubmitLabour,
// };


