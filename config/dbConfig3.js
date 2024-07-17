

// const sql = require('mssql');

// const config = {
// //   user: 'essl',
// //   password: 'essl',
// //   server: '103.186.18.61',
// //   database: 'etimetracklite11.8',


//   user:process.env.DB_USER_3,
//   password:process.env.DB_PASSWORD_3,
//   server:process.env.DB_SERVER_3,
//   database:process.env.DB_NAME_3,

//   options: {
//     encrypt: true,
//     trustServerCertificate: true,
//     enableAirAbort: true,
//     trustedConnection: true
//   },
// };

// const poolPromise3 = new sql.ConnectionPool(config)
//   .connect()
//   .then(pool => {
//     console.log('Connected to MSSQL ' + process.env.DB_SERVER_3);
//     return pool;
//   })
//   .catch(err => {
//     console.error('Database connection failed:', err);
//   });

// module.exports = {
//   sql,
//   poolPromise3,
// };




const sql = require('mssql');

const config = {
  user: process.env.DB_USER_3 || 'essl' ,
  password: process.env.DB_PASSWORD_3 || 'essl',
  server: process.env.DB_SERVER_3 || '103.186.18.61',
  database: process.env.DB_NAME_3 || 'etimetracklite11.8', 
  options: {
    encrypt: false, // Use true if you need to use encryption
    trustServerCertificate: true, // Change to false if you do not trust the server certificate
    // cryptoCredentialsDetails: {
    //   minVersion: 'TLSv1.2' // Specify the minimum TLS version
    // }
  },
};

const poolPromise3 = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL essl');
    return pool;
  })    
  .catch(err => {
    console.error('Database connection failed:', err);
  });

module.exports = {
  sql,
  poolPromise3,
};
