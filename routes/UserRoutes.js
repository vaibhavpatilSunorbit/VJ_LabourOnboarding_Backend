

const express = require("express");
const router = express.Router();
const {
  saveUserController,
  getAllUsersController,
  loginUserController,
  updateUserController,
  deleteUserController, getLaboursMonthlyWagesTable
} = require("../controllers/UserController");
const authenticateToken = require("../middleware/authMiddleware");

router.post('/registerUser', saveUserController);
router.post('/loginUser', loginUserController);
router.get('/getAllUsers', getAllUsersController);
router.put('/updateUser', updateUserController);
router.delete('/deleteUser/:id', deleteUserController);
router.get('/monthlyWages', getLaboursMonthlyWagesTable);

module.exports = router;

