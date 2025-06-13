const fs = require('fs');
const path = require('path');
const sharp = require('sharp');


const baseUrl = 'http://localhost:4000/uploads/';
// const baseUrl = 'https://laboursandbox.vjerp.com/uploads/';
// const baseUrl = 'https://vjlabour.vjerp.com/uploads/';

const { getLabourById  } = require('../models/labourModel');
const updateDocument = async (req, res) => {
  try {
    const { labourId, documentType, cropData } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!labourId || !documentType) {
      return res.status(400).json({ success: false, message: 'Labour ID and document type are required' });
    }

    // Parse crop data
    let cropInfo = null;
    try {
      if (cropData) cropInfo = JSON.parse(cropData);
    } catch (e) {
      console.log('Invalid cropData format');
    }

    const uploadedFilePath = req.file.path;
    const processedFileName = `processed-${Date.now()}-${req.file.filename}`;
    const processedFilePath = path.join('uploads', processedFileName);

    // Sharp processing
    let sharpInstance = sharp(uploadedFilePath);
    if (cropInfo?.width && cropInfo?.height) {
      sharpInstance = sharpInstance.extract({
        left: Math.round(cropInfo.x) || 0,
        top: Math.round(cropInfo.y) || 0,
        width: Math.round(cropInfo.width),
        height: Math.round(cropInfo.height)
      });
    }
    if (cropInfo?.rotation) {
      sharpInstance = sharpInstance.rotate(cropInfo.rotation);
    }

    await sharpInstance
      .jpeg({ quality: 90 })
      .toFile(processedFilePath);

    fs.unlinkSync(uploadedFilePath); 

    const fieldMap = {
      'induction': 'uploadInductionDoc',
      'aadhaar_front': 'uploadAadhaarFront',
      'aadhaar_back': 'uploadAadhaarBack',
      'id_proof': 'uploadIdProof'
    };

    const fieldName = fieldMap[documentType];
    if (!fieldName) {
      fs.unlinkSync(processedFilePath);
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }

    const currentLabour = await getLabourById(labourId);
    if (currentLabour?.[fieldName]) {
      const baseUrl = baseUrl || 'https://vjlabour.vjerp.com';
      const oldFile = currentLabour[fieldName].replace(`${baseUrl}/uploads/`, '');
      const oldPath = path.join('uploads', oldFile);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const baseUrl = baseUrl || 'https://vjlabour.vjerp.com';
    const newFileUrl = `process.env.BASE_URL${baseUrl}/uploads/${processedFileName}`;

    const updateData = { [fieldName]: newFileUrl };
    const updatedLabour = await updateDocument(labourId, updateData);

    res.json({
      success: true,
      message: 'Document processed and updated successfully',
      updatedImageUrl: newFileUrl,
      filename: processedFileName,
      updatedLabour
    });

  } catch (error) {
    console.error('Error processing document:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};


module.exports = {
  updateDocument
};