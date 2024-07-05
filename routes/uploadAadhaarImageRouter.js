const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Route to handle Aadhaar image uploads
router.post('/upload', upload.fields([
  { name: 'uploadAadhaarFront' }, 
  { name: 'uploadAadhaarBack' },
  { name: 'uploadIdProof' },
  { name: 'photoSrc' }
]), (req, res) => {
  try {
    const { uploadAadhaarFront, uploadAadhaarBack, photoSrc, uploadIdProof } = req.files;

    if (!uploadAadhaarFront || !uploadAadhaarBack || !photoSrc || !uploadIdProof) {
      return res.status(400).json({ error: 'Front image, back image, and photo source are all required' });
    }

    const frontImageFilename = uploadAadhaarFront[0].filename;
    const backImageFilename = uploadAadhaarBack[0].filename;
    const IdProofImageFilename = uploadIdProof[0].filename;
    const photoSrcFilename = photoSrc[0].filename;

    res.json({ 
      frontImage: frontImageFilename, 
      backImage: backImageFilename, 
      idImage: IdProofImageFilename, 
      photoSrc: photoSrcFilename, 
      message: 'Files uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading Aadhaar images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
