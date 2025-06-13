const express = require('express');
const router = express.Router();
const { updateDocument } = require('../controllers/documentController');
const upload = require('../middleware/uplods');

router.post('/update-document', upload.single('croppedImage'), updateDocument);

module.exports = router;