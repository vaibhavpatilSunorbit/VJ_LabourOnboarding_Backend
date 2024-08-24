
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

