
const labourModel = require('../models/labourModel');
const path = require('path');

const baseUrl = 'http://localhost:5000/uploads/';

async function getNextUniqueID(req, res) {
    try {
      const nextID = await labourModel.getNextUniqueID();
      res.json({ nextID });
    } catch (error) {
      console.error('Error in getNextUniqueID:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
  

async function createRecord(req, res) {
    try {
        const {
            labourOwnership, name, aadhaarNumber, dateOfBirth, contactNumber, gender, dateOfJoining,
            address, pincode, taluka, district, village, state, emergencyContact, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, nationality, maritalStatus, paymentMode, companyName, employeeType, currentStatus, seatingOffice
        } = req.body;

        const { uploadAadhaarFront, uploadAadhaarBack, photoSrc } = req.files;

        // if (!labourOwnership || !uploadAadhaarFront || !uploadAadhaarBack || !name || !aadhaarNumber ||
        //     !dateOfBirth || !contactNumber || !gender || !dateOfJoining || !address || !pincode ||
        //     !taluka || !district || !village || !state || !emergencyContact || !photoSrc || !bankName ||
        //     !branch || !accountNumber || !ifscCode || !projectName || !labourCategory || !department || !designation ||
        //     !workingHours || !title || !nationality || !maritalStatus || !paymentMode || !companyName || !employeeType || !currentStatus || !seatingOffice)  {
        //     return res.status(400).json({ msg: "All fields are required" });
        // }

        const frontImageFilename = path.basename(uploadAadhaarFront[0].path);
        const backImageFilename = path.basename(uploadAadhaarBack[0].path);
        const photoSrcFilename = path.basename(photoSrc[0].path);

  
        const frontImageUrl = baseUrl + frontImageFilename;
        const backImageUrl = baseUrl + backImageFilename;
        const photoSrcUrl = baseUrl + photoSrcFilename;

        const nextID = await labourModel.getNextUniqueID();

         const data = await labourModel.registerData({
            LabourID: nextID,
            labourOwnership, uploadAadhaarFront: frontImageUrl, uploadAadhaarBack: backImageUrl, name, aadhaarNumber,
            dateOfBirth, contactNumber, gender, dateOfJoining, address, pincode, taluka,
            district, village, state, emergencyContact, photoSrc: photoSrcUrl, bankName, branch,
            accountNumber, ifscCode, projectName, labourCategory, department, workingHours,
            contractorName, contractorNumber, designation, title, nationality, maritalStatus, paymentMode, companyName, employeeType, currentStatus, seatingOffice
        });

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

async function updateRecord(req, res) {
    try {
        const { id } = req.params;
        const updatedData = req.body;
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
    console.log(`Received id: ${req.params.id}, Parsed id: ${id}`);

    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid labour ID' });
    }

    try {
        const success = await labourModel.approveLabour(id);
        if (success) {
            res.json({ success: true, message: 'Labour approved successfully.' });
        } else {
            res.status(404).json({ message: 'Labour not found or already approved.' });
        }
    } catch (error) {
        console.error('Error in approveLabour:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function rejectLabour(req, res) {
    console.log('Fetching rejected labours...');
    const id = parseInt(req.params.id, 10); 
    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid labour ID' });
    }
    try {
        const success = await labourModel.rejectLabour(id);
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
        console.log('Fetching approved labours...');
        const approvedLabours = await labourModel.getApprovedLabours();
        res.json(approvedLabours);
    } catch (error) {
        console.error('Error fetching approved labours:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}



module.exports = {
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
};


