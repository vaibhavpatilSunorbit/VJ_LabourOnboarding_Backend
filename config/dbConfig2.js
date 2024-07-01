
const sql = require('mssql');

const config = {
    user: process.env.DB_USER_2,
    password: process.env.DB_PASSWORD_2,
    server: process.env.DB_SERVER_2,
    database: process.env.DB_NAME_2,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

module.exports = {
  sql,
  poolPromise,
};












// const sql = require('mssql');

// const config = {
//     user: 'vj',
//     password: 'Password*2024',
//     server: '103.231.78.55',
//     database: 'JDPROJECT',
//   options: {
//     encrypt: true,
//     trustServerCertificate: true,
//   },
// };

// const poolPromise = new sql.ConnectionPool(config)
//   .connect()
//   .then(pool => {
//     console.log('Connected to MSSQL');
//     return pool;
//   })
//   .catch(err => {
//     console.error('Database connection failed:', err);
//   });

// module.exports = {
//   sql,
//   poolPromise,
// };
