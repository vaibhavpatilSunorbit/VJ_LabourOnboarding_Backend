const { saveUser, getAllUsers, findUserByEmail, updateUser, deleteUser } = require("../models/UserModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const uuid = require("uuid");

const secretKey = process.env.JWT_SECRET || "jlkjfkljgjroijlkjalkfjdklfjfkj";

async function getAllUsersController(req, res) {
  try {
    const users = await getAllUsers();
   return res.status(200).json({ msg: "success", data: users });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
}

async function saveUserController(req, res) {
  try {
    const { name, CreatedAt, emailID, pasword, userType, userToken, contactNo, accessPages, isApproved } = req.body;

    // Check if all required fields are present
    if (!name || !CreatedAt || !emailID || !pasword || !userType || !userToken || !contactNo || !Array.isArray(accessPages) || isApproved === undefined) {
      return res.status(400).json({ msg: "All fields are required" });
    }

   
    const hashedPassword = await bcrypt.hash(pasword, 10); 

  
    const user = await saveUser(name, CreatedAt, emailID, hashedPassword, pasword, userType, userToken, contactNo, accessPages, isApproved);


    const token = jwt.sign({ emailID: user.emailID, userType: user.userType }, secretKey, { expiresIn: '1h' });

    res.status(201).json({ msg: "Success", data: user, token });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
}


async function loginUserController(req, res) {
  try {
    const { emailID, pasword } = req.body;
    if (!emailID || !pasword) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    const user = await findUserByEmail(emailID);
    if (!user) {
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(pasword, user.pasword);
    if (!validPassword) {
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    const token = jwt.sign({ emailID: user.emailID, userType: user.userType, projectIds:user.assigned_projects , departmentIds:user.assigned_departments }, secretKey, { expiresIn: '1h' });
    res.status(200).json({ success: true,
      data: {
        id: user.id,
        name: user.name, // Ensure name is included
        emailID: user.emailID,
        accessPages: user.accessPages,
        userType: user.userType,
        projectIds:user.assigned_projects , 
        departmentIds:user.assigned_departments ,
      }, 
      token });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
}

async function updateUserController(req, res) {
  try {
      const { id, name, emailID, contactNo, userType, accessPages, plainPassword, selectedDeparmentsIds, selectedProjectIds } = req.body;
      
      console.log('Request body:', req.body); // Log request body

      if (!id || !name || !emailID || !contactNo || !userType || !Array.isArray(accessPages)) {
          return res.status(400).json({ msg: "All fields are required" });
      }

      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
          console.error("Invalid user ID:", id);
          return res.status(400).json({ msg: "Invalid user ID" });
      }

      console.log('numericId:', numericId);

      let hashedPassword;
      if (plainPassword) {
          hashedPassword = await bcrypt.hash(plainPassword, 10);
      }

      // Ensure project and department IDs are valid arrays before passing
      const projectIds = Array.isArray(selectedProjectIds) ? selectedProjectIds : [];
      const departmentIds = Array.isArray(selectedDeparmentsIds) ? selectedDeparmentsIds : [];

      console.log("Projects to be updated:", projectIds);
      console.log("Departments to be updated:", departmentIds);

      const updateResult = await updateUser(
          numericId,
          name,
          emailID,
          contactNo,
          userType,
          accessPages,
          hashedPassword,
          plainPassword,
          projectIds,  // Pass project IDs
          departmentIds // Pass department IDs
      );

      console.log('updateResult.result:', updateResult);

      if (updateResult.success) {
          res.status(200).json({ msg: "User updated successfully", data: updateResult.result });
      } else {
          res.status(500).json({ msg: "Failed to update user" });
      }
  } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ msg: "Internal Server Error" });
  }
}



async function deleteUserController(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ msg: "User ID is required" });
    }

    await deleteUser(id);
    res.status(200).json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
}

module.exports = {
  saveUserController,
  getAllUsersController,
  loginUserController,
  updateUserController,
  deleteUserController,
};

