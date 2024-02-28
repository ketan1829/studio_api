const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');


router.post('/admins/login',adminController.adminLogin);

router.post('/admins/register',adminController.adminRegister);

router.post('/admin-send-token',adminController.adminSendToken);

router.post('/admin-forgot-password',adminController.adminForgotPassword);

//Get single admin details
router.get('/admins/:adminId',adminController.getSingleAdmin);

//Edit admin details
router.patch('/admins/:adminId',adminController.editAdminDetails);

//Edit admin image
router.patch('/admins/:adminId/image',adminController.editAdminImage);

//Upload Banner1 Image
router.patch('/admins/:adminId/Banner1image',adminController.addBanner1Image);

//Upload Banner2 (Exclusive) Image
router.patch('/admins/:adminId/Banner2image',adminController.addBanner2Image);


module.exports = router;
