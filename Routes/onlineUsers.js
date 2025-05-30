const express = require('express');
const router = express.Router();
const userController = require('../controller/onlinUsers'); // Import the controller functions
const { uploadImages } = require('../middleware/uploadImages'); // Import the Multer middleware
const {paymentReceipt} = require('../controller/paymentReceipt')

// Route for creating a user
router.post('/api/v1/user', uploadImages, userController.createUser);

// Route for getting users based on role
router.get('/api/v1/users', userController.getUsers);

//get student by studentId
router.get('/api/v1/user/:userId', userController.getStudentById);

// Route for updating a user's details (full update)
router.patch('/api/v1/user/:userId', uploadImages, userController.updateUser);

// Route for patching a user's details (partial update)
router.patch('/api/v1/user', uploadImages, userController.patchUser);

// Route for deleting a user
router.delete('/api/v1/user', userController.deleteUser);

router.put('/api/v1/user/changePassword', userController.changePassword);

// Route for updating a notification by ID
router.patch('/api/v1/notification/:notificationId', userController.updateNotificationById);

router.get('/api/v1/payments/receipt/:userId/:paymentId', paymentReceipt);

router.patch('/api/v1/resetPassword', userController.resetPassword);


router.post('/api/v1/passwordResetLink', userController.sendPasswordlink);



module.exports = router;
