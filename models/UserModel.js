
const {poolPromise} = require("../config/dbConfig");
const sql = require('mssql');
const bcrypt = require("bcrypt");

async function getAllUsers() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT id, name, emailID, contactNo, userType, accessPages
       FROM Users_New
    `);
    return result.recordset; // Returns the recordset from the query
  } catch (err) {
    console.error("Error occurred:", err);
    throw err; // Throws the error for handling in calling function
  }
}


async function saveUser(name, CreatedAt, emailID, pasword, plainPassword, userType, userToken, contactNo, accessPages, isApproved) {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("name", name)
      .input("CreatedAt", CreatedAt)
      .input("emailID", emailID)
      .input("pasword", pasword) 
      .input("plainPassword", plainPassword)
      .input("userType", userType)
      .input("userToken", userToken)
      .input("contactNo", contactNo)
      .input("accessPages", JSON.stringify(accessPages))
      .input("isApproved", isApproved)
      .query(`
        INSERT INTO Users_New (name, CreatedAt, emailID, pasword, userType, userToken, contactNo, accessPages, isApproved, plainPassword)
        VALUES (@name, @CreatedAt, @emailID, @pasword, @userType, @userToken, @contactNo, @accessPages, @isApproved, @plainPassword)
      `);
    return { success: true, message: "User added successfully", result };
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}

async function findUserByEmail(emailID) {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("emailID", sql.NVarChar, emailID)
      .query("SELECT * FROM Users_New WHERE emailID = @emailID");
    return result.recordset[0];
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}

// async function updateUser(id, name, emailID, contactNo, userType, accessPages, hashedPassword, plainPassword) {
//   try {
//       const pool = await poolPromise;
//       const result = await pool.request()
//           .input('id', id)
//           .input('name', name)
//           .input('emailID', emailID)
//           .input('contactNo', contactNo)
//           .input('userType', userType)
//           .input('accessPages', JSON.stringify(accessPages))
//           .query(`
//               UPDATE Users_New
//               SET name = @name, emailID = @emailID, contactNo = @contactNo, userType = @userType, 
//                   accessPages = @accessPages
//               WHERE Id = @id
//           `);

//       if (result.rowsAffected[0] > 0) {
//           return { success: true, result: result.recordset };
//       } else {
//           return { success: false, message: "No rows affected" };
//       }
//   } catch (error) {
//       console.error("Error occurred:", error);
//       throw error;
//   }
// }

async function updateUser(id, name, emailID, contactNo, userType, accessPages, hashedPassword, plainPassword) {
  try {
      const pool = await poolPromise;
      let query = `
          UPDATE Users_New
          SET name = @name, emailID = @emailID, contactNo = @contactNo, userType = @userType, 
              accessPages = @accessPages
      `;
      if (hashedPassword) {
          query += `, pasword = @pasword, plainPassword = @plainPassword`;
      }
      query += ` WHERE id = @id`;

      const request = pool.request()
          .input('id', id)
          .input('name', name)
          .input('emailID', emailID)
          .input('contactNo', contactNo)
          .input('userType', userType)
          .input('accessPages', JSON.stringify(accessPages));

      if (hashedPassword) {
          request.input('pasword', hashedPassword)
              .input('plainPassword', plainPassword);
      }

      const result = await request.query(query);

      if (result.rowsAffected[0] > 0) {
          return { success: true, result: result.recordset };
      } else {
          return { success: false, message: "No rows affected" };
      }
  } catch (error) {
      console.error("Error occurred:", error);
      throw error;
  }
}

async function deleteUser(id) {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM Users_New WHERE id = @id`);
    return { success: true, message: "User deleted successfully", result };
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}

module.exports = {
  saveUser,
  getAllUsers,
  findUserByEmail,
  updateUser,
  deleteUser,
};











// const sql = require("mssql");
// const poolPromise = require("../config/dbConfig");
// const bcrypt = require("bcrypt");

// async function getAllUsers() {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request().query(`
//             SELECT id, name, emailID, contactNo, userType, accessPages
//             FROM Users_New
//         `);
//         return result.recordset;
//     } catch (err) {
//         console.error("Error occurred:", err);
//         throw err;
//     }
// }

// async function saveUser(name, CreatedAt, emailID, hashedPassword, plainPassword, userType, userToken, contactNo, accessPages, isApproved) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input("name", sql.NVarChar, name)
//             .input("CreatedAt", sql.DateTime, CreatedAt)
//             .input("emailID", sql.NVarChar, emailID)
//             .input("password", sql.NVarChar, hashedPassword) 
//             .input("plainPassword", sql.NVarChar, plainPassword)
//             .input("userType", sql.NVarChar, userType)
//             .input("userToken", sql.NVarChar, userToken)
//             .input("contactNo", sql.NVarChar, contactNo)
//             .input("accessPages", sql.NVarChar, JSON.stringify(accessPages))
//             .input("isApproved", sql.Bit, isApproved)
//             .query(`
//                 INSERT INTO Users_New (name, CreatedAt, emailID, password, userType, userToken, contactNo, accessPages, isApproved, plainPassword)
//                 VALUES (@name, @CreatedAt, @emailID, @password, @userType, @userToken, @contactNo, @accessPages, @isApproved, @plainPassword)
//             `);
//         return { success: true, message: "User added successfully", result };
//     } catch (error) {
//         console.error("Error occurred:", error);
//         throw error;
//     }
// }

// async function findUserByEmail(emailID) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input("emailID", sql.NVarChar, emailID)
//             .query("SELECT * FROM Users_New WHERE emailID = @emailID");
//         return result.recordset[0];
//     } catch (error) {
//         console.error("Error occurred:", error);
//         throw error;
//     }
// }

// async function updateUser(id, userData) {
//     try {
//         const pool = await poolPromise;
//         const request = pool.request();
//         request.input('id', sql.Int, id);
//         Object.keys(userData).forEach(key => {
//             request.input(key, sql.NVarChar, userData[key]);
//         });

//         const result = await request.query(`
//             UPDATE Users_New
//             SET ${Object.keys(userData).map(key => `${key} = @${key}`).join(', ')}
//             WHERE id = @id
//         `);

//         if (result.rowsAffected[0] > 0) {
//             return { success: true, result: result.recordset };
//         } else {
//             return { success: false, message: "No rows affected" };
//         }
//     } catch (error) {
//         console.error("Error occurred:", error);
//         throw error;
//     }
// }

// async function deleteUser(id) {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request()
//             .input("id", sql.Int, id)
//             .query(`DELETE FROM Users_New WHERE id = @id`);
//         return { success: true, message: "User deleted successfully", result };
//     } catch (error) {
//         console.error("Error occurred:", error);
//         throw error;
//     }
// }

// module.exports = {
//     saveUser,
//     getAllUsers,
//     findUserByEmail,
//     updateUser,
//     deleteUser,
// };
