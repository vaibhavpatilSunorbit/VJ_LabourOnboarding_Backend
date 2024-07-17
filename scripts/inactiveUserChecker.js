const { getAllUsers, updateUser } = require('../models/UserModel');

async function checkInactiveUsers() {
  try {
    const users = await getAllUsers(); // Fetch all users from the database
    const currentDate = new Date();

    for (const user of users) {
      // Calculate time difference in milliseconds
      const lastLoginDate = new Date(user.lastLogin);
      const timeDiff = currentDate.getTime() - lastLoginDate.getTime();
      const daysInactive = timeDiff / (1000 * 3600 * 24); // Convert milliseconds to days

      // Update last login timestamp for each user
      await updateUser(user.id, { lastLogin: currentDate }); // Assuming updateUser updates lastLogin

      if (daysInactive >= 4) { // Define your inactive threshold here (e.g., 4 days)
        // Update user status to Discontinued or Inactive
        const updateResult = await updateUser(user.id, { isActive: false }); // Assuming updateUser updates isActive
        if (updateResult.success) {
          console.log(`User ${user.name} marked as discontinued.`);
        } else {
          console.error(`Failed to update user ${user.name}.`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking inactive users:', error);
  }
}

module.exports = {
  checkInactiveUsers,
};









// const { getAllUsers, updateUser } = require('../models/UserModel');

// async function checkInactiveUsers() {
//   try {
//     const users = await getAllUsers(); // Fetch all users from the database
//     const currentDate = new Date();

//     for (const user of users) {
//       // Calculate time difference in milliseconds
//       const lastLoginDate = new Date(user.lastLogin);
//       const timeDiff = currentDate.getTime() - lastLoginDate.getTime();
//       const daysInactive = timeDiff / (1000 * 3600 * 24); // Convert milliseconds to days

//       // Update last login timestamp for each user
//       await updateUser(user.id, { lastLogin: currentDate }); // Assuming updateUser updates lastLogin

//       if (daysInactive >= 4) { // Define your inactive threshold here (e.g., 4 days)
//         // Update user status to Discontinued or Inactive
//         const updateResult = await updateUser(user.id, { isActive: false }); // Assuming updateUser updates isActive
//         if (updateResult.success) {
//           console.log(`User ${user.name} marked as discontinued.`);
//         } else {
//           console.error(`Failed to update user ${user.name}.`);
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Error checking inactive users:', error);
//   }
// }

// module.exports = {
//   checkInactiveUsers,
// };
