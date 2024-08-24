







// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const JSZip = require('jszip');
// const labourRoutes = require('./routes/labourRoutes');
// const labourController = require('./controllers/labourController');
// const userRoutes = require('./routes/UserRoutes');
// const dataRoutes = require('./routes/dataRoutes');
// const { poolPromise } = require('./config/dbConfig2');

// const app = express();
// const PORT = process.env.PORT || 4000;


// app.use(cors());
// app.use(bodyParser.json({ limit: '100mb' }));
// app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

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
// });

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.get('/labours/:id/download/full-form', (req, res) => {
//     const { id } = req.params;
//     const filePath = path.join(__dirname, 'uploads', `full_form_${id}.pdf`);
//     if (fs.existsSync(filePath)) {
//         res.download(filePath, `full_form_${id}.pdf`);
//     } else {
//         res.status(404).send('File not found.');
//     }
// });

// app.get('/labours/:id/download/aadhaar-card', async (req, res) => {
//     const { id } = req.params;
//     const frontFilePath = path.join(__dirname, 'uploads', `aadhaar_front_${id}.jpg`);
//     const backFilePath = path.join(__dirname, 'uploads', `aadhaar_back_${id}.jpg`);
//     const idProofFilePath = path.join(__dirname, 'uploads', `id_Proof${id}.jpg`);
//     const inductionFilePath = path.join(__dirname, 'uploads', `id_Proof${id}.jpg`);

//     if (fs.existsSync(frontFilePath) && fs.existsSync(backFilePath) && fs.existsSync(idProofFilePath)  && fs.existsSync(inductionFilePath)) {
//         const frontFile = fs.readFileSync(frontFilePath);
//         const backFile = fs.readFileSync(backFilePath);
//         const idFile = fs.readFileSync(idProofFilePath);
//         const inductionFile = fs.readFileSync(inductionFilePath);

//         const zip = new JSZip();
//         zip.file(`aadhaar_front_${id}.jpg`, frontFile);
//         zip.file(`aadhaar_back_${id}.jpg`, backFile);
//         zip.file(`id_Proof${id}.jpg`, idFile);
//         zip.file(`Upload_Induction${id}.jpg`, inductionFile);

//         res.set('Content-Type', 'application/zip');
//         res.set('Content-Disposition', `attachment; filename="aadhaar_${id}.zip"`);

//         zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
//             .pipe(res)
//             .on('finish', () => {
//                 console.log(`Aadhaar card zip for Labour ID ${id} has been generated and sent.`);
//             });
//     } else {
//         res.status(404).send('File not found.');
//     }
// });

// app.post('/labours', upload.fields([
//     { name: 'uploadAadhaarFront' },
//     { name: 'uploadAadhaarBack' },
//     { name: 'uploadIdProof' },
//     { name: 'uploadInductionDoc' },
//     { name: 'photoSrc' }
// ]), labourController.createRecord);

// app.use('/labours', labourRoutes);
// app.use('/users', userRoutes);
// app.use('/api', dataRoutes);

// app.listen(PORT, () => {
//     console.log(`App is running on PORT ${PORT}`);
// });

// poolPromise
//     .then(() => {
//         console.log('Connected to the database');
//     })
//     .catch(err => {
//         console.error('Database connection failed:', err);
//     });










    // This code change on 19-07-2024 with the essl send data
    

    require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const axios = require('axios');
const xml2js = require('xml2js');
const labourRoutes = require('./routes/labourRoutes');
const EmployeeRoute = require('./routes/dataRoutes')
const labourController = require('./controllers/labourController');
const userRoutes = require('./routes/UserRoutes');
const dataRoutes = require('./routes/dataRoutes');
const { poolPromise2 } = require('./config/dbConfig2');

const app = express();
const PORT = process.env.PORT || 4000;


app.use(express.text({ type: 'text/xml' }));


app.use(cors({
    origin: '*'
}));


// app.use(cors())

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB file size limit
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define the route to update a labour record
app.put('/labours/:id', upload.fields([
    { name: 'uploadAadhaarFront' },
    { name: 'uploadAadhaarBack' },
    { name: 'uploadIdProof' },
    { name: 'uploadInductionDoc' },
    { name: 'photoSrc' }
]), labourController.updateRecord);


app.get('/labours/:id/download/full-form', (req, res) => {
    const { id } = req.params;
    const filePath = path.join(__dirname, 'uploads', `full_form_${id}.pdf`);
    if (fs.existsSync(filePath)) {
        res.download(filePath, `full_form_${id}.pdf`);
    } else {
        res.status(404).send('File not found.');
    }
});

app.get('/labours/:id/download/aadhaar-card', async (req, res) => {
    const { id } = req.params;
    const frontFilePath = path.join(__dirname, 'uploads', `aadhaar_front_${id}.jpg`);
    const backFilePath = path.join(__dirname, 'uploads', `aadhaar_back_${id}.jpg`);
    const idProofFilePath = path.join(__dirname, 'uploads', `id_Proof${id}.jpg`);
    const inductionFilePath = path.join(__dirname, 'uploads', `id_Proof${id}.jpg`);

    if (fs.existsSync(frontFilePath) && fs.existsSync(backFilePath) && fs.existsSync(idProofFilePath) && fs.existsSync(inductionFilePath)) {
        const frontFile = fs.readFileSync(frontFilePath);
        const backFile = fs.readFileSync(backFilePath);
        const idFile = fs.readFileSync(idProofFilePath);
        const inductionFile = fs.readFileSync(inductionFilePath);

        const zip = new JSZip();
        zip.file(`aadhaar_front_${id}.jpg`, frontFile);
        zip.file(`aadhaar_back_${id}.jpg`, backFile);
        zip.file(`id_Proof${id}.jpg`, idFile);
        zip.file(`Upload_Induction${id}.jpg`, inductionFile);

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename="aadhaar_${id}.zip"`);

        zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(res)
            .on('finish', () => {
                console.log(`Aadhaar card zip for Labour ID ${id} has been generated and sent.`);
            });
    } else {
        res.status(404).send('File not found.');
    }
});

app.post('/labours', upload.fields([
    { name: 'uploadAadhaarFront' },
    { name: 'uploadAadhaarBack' },
    { name: 'uploadIdProof' },
    { name: 'uploadInductionDoc' },
    { name: 'photoSrc' }
]), labourController.createRecord);

app.use('/labours', labourRoutes);
app.use('/users', userRoutes);
app.use('/api', dataRoutes);
app.use(EmployeeRoute)
// SOAP API integration
// const sendLaborData = async (laborData) => {
//     const builder = new xml2js.Builder({ headless: true });
//     const xml = builder.buildObject({
//         'soap:Envelope': {
//             $: {
//                 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
//                 'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
//                 'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/'
//             },
//             'soap:Body': {
//                 'AddEmployee': {
//                     $: { 'xmlns': 'http://tempuri.org/' },
//                     'APIKey': laborData.APIKey,
//                     'EmployeeCode': laborData.EmployeeCode,
//                     'EmployeeName': laborData.EmployeeName,
//                     'CardNumber': laborData.CardNumber,
//                     'SerialNumber': laborData.SerialNumber,
//                     'UserName': laborData.UserName,
//                     'UserPassword': laborData.UserPassword,
//                     'CommandId': laborData.CommandId
//                 }
//             }
//         }
//     });

//     try {
//         const response = await axios.post('http://192.168.33.26:8526/webapiservice.asmx?op=AddEmployee', xml, {
//             headers: {
//                 'Content-Type': 'text/xml'
//             }
//         });
//         return response.data;
//     } catch (error) {
//         console.error('Error sending SOAP request:', error);
//         throw error;
//     }
// };

// app.post('/AddEmployee', async (req, res) => {
//     const laborData = {
//         APIKey: req.body.APIKey, 
//         EmployeeCode: req.body.EmployeeCode,
//         EmployeeName: req.body.EmployeeName,
//         CardNumber: req.body.CardNumber,
//         SerialNumber: req.body.SerialNumber,
//         UserName: req.body.UserName,
//         UserPassword: req.body.UserPassword,
//         CommandId: 1
//     };

//     try {
//         const result = await sendLaborData(laborData);
//         res.status(200).send(result);
//     } catch (error) {
//         res.status(500).send('Error adding employee');
//     }
// });

app.listen(PORT, () => {
    console.log(`App is running on PORT ${PORT}`);
});

poolPromise2
    .then(() => {
        console.log('Connected to the database');
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

    module.exports = {
        upload, // Export the upload function
        // other exports if any
    };






// imp code changes 16-07-2024



// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const JSZip = require('jszip');
// const labourRoutes = require('./routes/labourRoutes');
// const labourController = require('./controllers/labourController');
// const userRoutes = require('./routes/UserRoutes');
// const dataRoutes = require('./routes/dataRoutes');
// const { poolPromise } = require('./config/dbConfig2');

// const app = express();

// app.use(cors());
// app.use(bodyParser.json({ limit: '100mb' }));
// app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

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
// });

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.get('/labours/:id/download/full-form', (req, res) => {
//     const { id } = req.params;
//     const filePath = path.join(__dirname, 'uploads', `full_form_${id}.pdf`);
//     if (fs.existsSync(filePath)) {
//         res.download(filePath, `full_form_${id}.pdf`);
//     } else {
//         res.status(404).send('File not found.');
//     }
// });

// app.get('/labours/:id/download/aadhaar-card', async (req, res) => {
//     const { id } = req.params;
//     const frontFilePath = path.join(__dirname, 'uploads', `aadhaar_front_${id}.jpg`);
//     const backFilePath = path.join(__dirname, 'uploads', `aadhaar_back_${id}.jpg`);
//     const idProofFilePath = path.join(__dirname, 'uploads', `id_Proof${id}.jpg`);

//     if (fs.existsSync(frontFilePath) && fs.existsSync(backFilePath) && fs.existsSync(idProofFilePath)  && fs.existsSync(inductionFilePath)) {
//         const frontFile = fs.readFileSync(frontFilePath);
//         const backFile = fs.readFileSync(backFilePath);
//         const idFile = fs.readFileSync(idProofFilePath);
//         const inductionFile = fs.readFileSync(inductionFilePath);

//         const zip = new JSZip();
//         zip.file(`aadhaar_front_${id}.jpg`, frontFile);
//         zip.file(`aadhaar_back_${id}.jpg`, backFile);
//         zip.file(`id_Proof${id}.jpg`, idFile);
//         zip.file(`Upload_Induction${id}.jpg`, inductionFile);

//         res.set('Content-Type', 'application/zip');
//         res.set('Content-Disposition', `attachment; filename="aadhaar_${id}.zip"`);

//         zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
//             .pipe(res)
//             .on('finish', () => {
//                 console.log(`Aadhaar card zip for Labour ID ${id} has been generated and sent.`);
//             });
//     } else {
//         res.status(404).send('File not found.');
//     }
// });

// app.post('/labours', upload.fields([
//     { name: 'uploadAadhaarFront' },
//     { name: 'uploadAadhaarBack' },
//     { name: 'uploadIdProof' },
//     { name: 'uploadInductionDoc' },
//     { name: 'photoSrc' }
// ]), labourController.createRecord);

// app.use('/labours', labourRoutes);
// app.use('/users', userRoutes);
// app.use('/api', dataRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`App is running on PORT ${PORT}`);
// });

// poolPromise
//     .then(() => {
//         console.log('Connected to the database');
//     })
//     .catch(err => {
//         console.error('Database connection failed:', err);
//     });
























// Img code 


// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const JSZip = require('jszip');
// const labourRoutes = require('./routes/labourRoutes');
// const labourController = require('./controllers/labourController');
// const userRoutes = require('./routes/UserRoutes');
// const dataRoutes = require('./routes/dataRoutes');
// const { poolPromise } = require('./config/dbConfig2');

// const app = express();

// app.use(cors());
// app.use(bodyParser.json({ limit: '100mb' }));
// app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

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
// });

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.get('/labours/:id/download/full-form', (req, res) => {
//     const { id } = req.params;
//     const filePath = path.join(__dirname, 'uploads', `full_form_${id}.pdf`);
//     if (fs.existsSync(filePath)) {
//         res.download(filePath, `full_form_${id}.pdf`);
//     } else {
//         res.status(404).send('File not found.');
//     }
// });

// app.get('/labours/:id/download/aadhaar-card', async (req, res) => {
//     const { id } = req.params;
//     const frontFilePath = path.join(__dirname, 'uploads', `aadhaar_front_${id}.jpg`);
//     const backFilePath = path.join(__dirname, 'uploads', `aadhaar_back_${id}.jpg`);
//     const idProofFilePath = path.join(__dirname, 'uploads', `id_Proof${id}.jpg`);

//     if (fs.existsSync(frontFilePath) && fs.existsSync(backFilePath) && fs.existsSync(idProofFilePath)) {
//         const frontFile = fs.readFileSync(frontFilePath);
//         const backFile = fs.readFileSync(backFilePath);
//         const idFile = fs.readFileSync(idProofFilePath);

//         const zip = new JSZip();
//         zip.file(`aadhaar_front_${id}.jpg`, frontFile);
//         zip.file(`aadhaar_back_${id}.jpg`, backFile);
//         zip.file(`id_Proof${id}.jpg`, idFile);

//         res.set('Content-Type', 'application/zip');
//         res.set('Content-Disposition', `attachment; filename="aadhaar_${id}.zip"`);

//         zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
//             .pipe(res)
//             .on('finish', () => {
//                 console.log(`Aadhaar card zip for Labour ID ${id} has been generated and sent.`);
//             });
//     } else {
//         res.status(404).send('File not found.');
//     }
// });

// app.post('/labours', upload.fields([
//     { name: 'uploadAadhaarFront' },
//     { name: 'uploadAadhaarBack' },
//     { name: 'uploadIdProof' },
//     { name: 'photoSrc' }
// ]), labourController.createRecord);

// app.use('/labours', labourRoutes);
// app.use('/users', userRoutes);
// app.use('/api', dataRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`App is running on PORT ${PORT}`);
// });

// poolPromise
//     .then(() => {
//         console.log('Connected to the database');
//     })
//     .catch(err => {
//         console.error('Database connection failed:', err);
//     });























































































































// Below code is in dropdown the Project Name , Labour Category and so on

// const express = require('express');
// const cors = require('cors');
// const { poolPromise } = require('./config/dbConfig');
// const dataRoutes = require('./routes/dataRoutes');

// const app = express();
// app.use(cors());

// app.use(express.json());
// app.use('/api', dataRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// // Check database connection on startup
// poolPromise
//   .then(() => {
//     console.log('Connected to the database');
//   })
//   .catch(err => {
//     console.error('Database connection failed:', err);
//   });
