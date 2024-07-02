







// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const labourRoutes = require('./routes/labourRoutes');
// const labourController = require('./controllers/labourController');
// const userRoutes = require('./routes/userRoutes');
// const authenticateToken = require('./middleware/authMiddleware');

// const app = express();

// app.use(cors());
// app.use(bodyParser.json({ limit: '100mb' }));
// app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         const uploadDir = path.join(__dirname, 'uploads');
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir);
//         }
//         cb(null, uploadDir);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname);
//     }
// });

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 100 * 1024 * 1024 } // 100MB file size limit
// });

// app.post('/labours', upload.fields([
//     { name: 'uploadAadhaarFront' },
//     { name: 'uploadAadhaarBack' },
//     { name: 'photoSrc' }
// ]), labourController.createRecord);


// // app.post('/labours', upload.fields([
// //     { name: 'uploadAadhaarFront' },
// //     { name: 'uploadAadhaarBack' },
// //     { name: 'photoSrc' }
// // ]), authenticateToken, labourController.createRecord);

// app.use('/labours', labourRoutes);
// // app.use('/users', userRoutes);

// // app.use('/labours', authenticateToken, labourRoutes);
// app.use('/users', userRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`App is running on PORT ${PORT}`);
// });














// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const labourRoutes = require('./routes/labourRoutes');
// const labourController = require('./controllers/labourController');
// const userRoutes = require('./routes/userRoutes');
// const authenticateToken = require('./middleware/authMiddleware');
// const dataRoutes = require('./routes/dataRoutes');
// const { poolPromise } = require('./config/dbConfig2');

// const app = express();

// app.use(cors());
// app.use(bodyParser.json({ limit: '100mb' }));
// app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));


// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         const uploadDir = path.join(__dirname, 'uploads');
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir);
//         }
//         cb(null, uploadDir);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname);
//     }
// });

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 100 * 1024 * 1024 } // 100MB file size limit
// });

// // Serve static files from the 'uploads' directory
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Route to handle file downloads
// app.get('/labours/:id/download/full-form', (req, res) => {
//   const { id } = req.params;
//   // Replace with your logic to fetch and send the full form file based on `id`
//   const filePath = path.join(__dirname, 'uploads', `full_form_${id}.pdf`);
//   if (fs.existsSync(filePath)) {
//     res.download(filePath, `full_form_${id}.pdf`);
//   } else {
//     res.status(404).send('File not found.');
//   }
// });

// app.get('/labours/:id/download/aadhaar-card', (req, res) => {
//   const { id } = req.params;
//   const frontFilePath = path.join(__dirname, 'uploads', `aadhaar_front_${id}.jpg`);
//   const backFilePath = path.join(__dirname, 'uploads', `aadhaar_back_${id}.jpg`);

//   if (fs.existsSync(frontFilePath) && fs.existsSync(backFilePath)) {
//     const frontFile = fs.readFileSync(frontFilePath);
//     const backFile = fs.readFileSync(backFilePath);
    
//     res.set('Content-Type', 'application/zip');
//     res.set('Content-Disposition', `attachment; filename="aadhaar_${id}.zip"`);
    
//     const JSZip = require('jszip');
//     const zip = new JSZip();
    
//     zip.file(`aadhaar_front_${id}.jpg`, frontFile);
//     zip.file(`aadhaar_back_${id}.jpg`, backFile);
    
//     zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
//       .pipe(res)
//       .on('finish', () => {
//         console.log(`Aadhaar card zip for Labour ID ${id} has been generated and sent.`);
//       });
//   } else {
//     res.status(404).send('File not found.');
//   }
// });

// // This route handles the creation of labour records
// app.post('/labours', upload.fields([
//   { name: 'uploadAadhaarFront' },
//   { name: 'uploadAadhaarBack' },
//   { name: 'photoSrc' }
// ]), labourController.createRecord);

// // Middleware to authenticate routes
// // app.use('/labours', authenticateToken, labourRoutes);
// app.use('/labours', labourRoutes);
// app.use('/users', userRoutes);

// app.use('/api', dataRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`App is running on PORT ${PORT}`);
// });

// poolPromise
//   .then(() => {
//     console.log('Connected to the database');
//   })
//   .catch(err => {
//     console.error('Database connection failed:', err);
//   });




















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
// const userRoutes = require('./routes/userRoutes');
// const authenticateToken = require('./middleware/authMiddleware');
// const dataRoutes = require('./routes/dataRoutes');
// const { poolPromise } = require('./config/dbConfig2');

// const app = express();

// app.use(cors());
// app.use(bodyParser.json({ limit: '100mb' }));
// app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         const uploadDir = path.join(__dirname, 'uploads');
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir);
//         }
//         cb(null, uploadDir);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname);
//     }
// });

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 100 * 1024 * 1024 } // 100MB file size limit
// });

// // Serve static files from the 'uploads' directory
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Route to handle file downloads
// app.get('/labours/:id/download/full-form', (req, res) => {
//   const { id } = req.params;
//   const filePath = path.join(__dirname, 'uploads', `full_form_${id}.pdf`);
//   if (fs.existsSync(filePath)) {
//     res.download(filePath, `full_form_${id}.pdf`);
//   } else {
//     res.status(404).send('File not found.');
//   }
// });

// app.get('/labours/:id/download/aadhaar-card', (req, res) => {
//   const { id } = req.params;
//   const frontFilePath = path.join(__dirname, 'uploads', `aadhaar_front_${id}.jpg`);
//   const backFilePath = path.join(__dirname, 'uploads', `aadhaar_back_${id}.jpg`);

//   if (fs.existsSync(frontFilePath) && fs.existsSync(backFilePath)) {
//     const frontFile = fs.readFileSync(frontFilePath);
//     const backFile = fs.readFileSync(backFilePath);

//     res.set('Content-Type', 'application/zip');
//     res.set('Content-Disposition', `attachment; filename="aadhaar_${id}.zip"`);

//     const zip = new JSZip();

//     zip.file(`aadhaar_front_${id}.jpg`, frontFile);
//     zip.file(`aadhaar_back_${id}.jpg`, backFile);

//     zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
//       .pipe(res)
//       .on('finish', () => {
//         console.log(`Aadhaar card zip for Labour ID ${id} has been generated and sent.`);
//       });
//   } else {
//     res.status(404).send('File not found.');
//   }
// });

// // This route handles the creation of labour records
// app.post('/labours', upload.fields([
//   { name: 'uploadAadhaarFront' },
//   { name: 'uploadAadhaarBack' },
//   { name: 'photoSrc' }
// ]), labourController.createRecord);

// // Middleware to authenticate routes
// // app.use('/labours', authenticateToken, labourRoutes);
// app.use('/labours', labourRoutes);
// app.use('/users', userRoutes);
// app.use('/api', dataRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`App is running on PORT ${PORT}`);
// });

// poolPromise
//   .then(() => {
//     console.log('Connected to the database');
//   })
//   .catch(err => {
//     console.error('Database connection failed:', err);
//   });




require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const labourRoutes = require('./routes/labourRoutes');
const labourController = require('./controllers/labourController');
const userRoutes = require('./routes/UserRoutes');
const dataRoutes = require('./routes/dataRoutes');
const { poolPromise } = require('./config/dbConfig2');

const app = express();

app.use(cors());
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

    if (fs.existsSync(frontFilePath) && fs.existsSync(backFilePath)) {
        const frontFile = fs.readFileSync(frontFilePath);
        const backFile = fs.readFileSync(backFilePath);

        const zip = new JSZip();
        zip.file(`aadhaar_front_${id}.jpg`, frontFile);
        zip.file(`aadhaar_back_${id}.jpg`, backFile);

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
    { name: 'photoSrc' }
]), labourController.createRecord);

app.use('/labours', labourRoutes);
app.use('/users', userRoutes);
app.use('/api', dataRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`App is running on PORT ${PORT}`);
});

poolPromise
    .then(() => {
        console.log('Connected to the database');
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });























































































































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
