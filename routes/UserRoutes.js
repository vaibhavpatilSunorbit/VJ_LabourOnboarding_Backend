

const express = require("express");
const router = express.Router();
const {
  saveUserController,
  getAllUsersController,
  loginUserController,
  updateUserController,
  deleteUserController
} = require("../controllers/UserController");
const authenticateToken = require("../middleware/authMiddleware");

router.post('/registerUser', saveUserController);
router.post('/loginUser', loginUserController);
router.get('/getAllUsers',  getAllUsersController);
router.put('/updateUser',  updateUserController);
router.delete('/deleteUser/:id', deleteUserController);

module.exports = router;











// imp code changes 16-07-2024


// const express = require("express");
// const router = express.Router();
// const {
//   saveUserController,
//   getAllUsersController,
//   loginUserController,
//   updateUserController,
//   deleteUserController
// } = require("../controllers/UserController");
// const authenticateToken = require("../middleware/authMiddleware");

// router.post('/registerUser', saveUserController);
// router.post('/loginUser', loginUserController);
// router.get('/getAllUsers',  getAllUsersController);
// router.put('/updateUser',  updateUserController);
// router.delete('/deleteUser/:id', deleteUserController);

// module.exports = router;
