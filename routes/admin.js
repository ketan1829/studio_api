const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');


/**
* @swagger
* /admins/login:
*   post:
*     summary: Admin login
*     tags: [Admins]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               email:
*                 type: string
*                 description: The email address of the admin.
*               password:
*                 type: string
*                 format: password
*                 description: The password of the admin.
*     responses:
*       200:
*         description: Login successful

*       400:
*         description: Bad request
*       401:
*         description: Unauthorized
*/
router.post('/admins/login',adminController.adminLogin);

/**
* @swagger
* /admins/register:
*   post:
*     summary: Register a new admin
*     tags: [Admins]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               firstName:
*                 type: string
*               lastName:
*                 type: string
*               email:
*                 type: string
*                 format: email
*               password:
*                 type: string
*                 format: password
*     responses:
*       200:
*         description: Admin registered successfully
*       400:
*         description: Bad request, admin already exists
*         content:
*           application/json:
*             example:
*               status: false
*               message: Admin Already Exists
*/
router.post('/admins/register',adminController.adminRegister);

/**
* @swagger
* /admin-send-token:
*   post:
*     summary: Send password reset token to admin
*     tags: [Admins]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               email:
*                 type: string
*                 format: email
*     responses:
*       200:
*         description: Token sent successfully
*         content:
*           application/json:
*             example: {status: true, message: "Token sent", email: "example@email.com", token: "123456"}
*       400:
*         description: Admin not found
*         content:
*           application/json:
*             example: {status: false, message: "Admin does not exist"}
*/
router.post('/admin-send-token',adminController.adminSendToken);

/**
* @swagger
* /admin-forgot-password:
*   post:
*     summary: Reset admin password
*     tags: [Admins]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               email:
*                 type: string
*                 format: email
*               newPassword:
*                 type: string
*                 format: password
*               token:
*                 type: string
*     responses:
*       200:
*         description: Password reset successful
*         content:
*           application/json:
*             example: {status: true, message: "Password Reset Successfully"}
*       400:
*         description: Bad request
*         content:
*           application/json:
*             example: {status: false, message: "Admin does not exist"}
*/
router.post('/admin-forgot-password',adminController.adminForgotPassword);

//Get single admin details
/**
* @swagger
* /admins/{adminId}:
*   get:
*     summary: Get admin by ID
*     tags: [Admins]
*     parameters:
*       - in: path
*         name: adminId
*         required: true
*         description: Numeric ID of the admin to retrieve.
*         schema:
*           type: integer
*     responses:
*       200:
*         description: Admin found
*         content:
*           application/json:
*             example: {status: true, message: "Admin Exists", admin: {...}}
*       404:
*         description: Admin not found
*         content:
*           application/json:
*             example: {status: false, message: "Admin does not exist"}
*/
router.get('/admins/:adminId',adminController.getSingleAdmin);

//Edit admin details
/**
* @swagger
* /admins/{adminId}:
*   patch:
*     summary: Edit admin details by ID
*     tags: [Admins]
*     parameters:
*       - in: path
*         name: adminId
*         required: true
*         description: Numeric ID of the admin to edit.
*         schema:
*           type: integer
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               firstName:
*                 type: string
*               lastName:
*                 type: string
*               email:
*                 type: string
*                 format: email
*               password:
*                 type: string
*                 format: password
*     responses:
*       200:
*         description: Admin details updated successfully
*         content:
*           application/json:
*             example: {status: true, message: "Details updated successfully", admin: {...}}
*       404:
*         description: Admin not found
*         content:
*           application/json:
*             example: {status: false, message: "Admin does not exist"}
*       409:
*         description: Email already exists
*         content:
*           application/json:
*             example: {status: false, message: "Email Already Exists"}
*/
router.patch('/admins/:adminId',adminController.editAdminDetails);

//Edit admin image
/**
* @swagger
* /admins/{adminId}/image:
*   patch:
*     summary: Edit admin image by ID
*     tags: [Admins]
*     parameters:
*       - in: path
*         name: adminId
*         required: true
*         description: Numeric ID of the admin to edit image.
*         schema:
*           type: integer
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               adminImage:
*                 type: string
*                 format: url
*                 description: URL of the admin image.
*     responses:
*       200:
*         description: Admin image updated successfully
*         content:
*           application/json:
*             example: {status: true, message: "Image updated successfully", admin: {...}}
*       404:
*         description: Admin not found
*         content:
*           application/json:
*             example: {status: false, message: "Admin does not exist"}
*/

router.patch('/admins/:adminId/image',adminController.editAdminImage);


//Upload Banner1 Image
/**
* @swagger
* /admins/{adminId}/Banner1image:
*   patch:
*     summary: Update admin's Banner1 image by ID
*     tags: [Admins]
*     parameters:
*       - in: path
*         name: adminId
*         required: true
*         description: Numeric ID of the admin to update Banner1 image.
*         schema:
*           type: integer
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               Banner1Image:
*                 type: string
*                 format: url
*                 description: URL of the Banner1 image.
*     responses:
*       200:
*         description: Banner1 image updated successfully
*         content:
*           application/json:
*             example: {status: true, message: "Banner Img updated successfully", admin: {...}}
*       404:
*         description: Admin not found
*         content:
*           application/json:
*             example: {status: false, message: "Admin does not exist"}
*/
router.patch('/admins/:adminId/Banner1image',adminController.addBanner1Image);

//Upload Banner2 (Exclusive) Image
/**
* @swagger
* /admins/{adminId}/Banner2image:
*   patch:
*     summary: Update admin's Banner2 image by ID
*     tags: [Admins]
*     parameters:
*       - in: path
*         name: adminId
*         required: true
*         description: Numeric ID of the admin to update Banner2 image.
*         schema:
*           type: integer
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               Banner2Image:
*                 type: string
*                 format: url
*                 description: URL of the Banner2 image.
*     responses:
*       200:
*         description: Banner2 image updated successfully
*         content:
*           application/json:
*             example: {status: true, message: "Exclusive Banner Img updated successfully"}
*       404:
*         description: Admin not found
*         content:
*           application/json:
*             example: {status: false, message: "Admin does not exist"}
*/
router.patch('/admins/:adminId/Banner2image',adminController.addBanner2Image);


module.exports = router;
