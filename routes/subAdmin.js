const express = require('express');
const router = express.Router();
const controller = require('../controllers/subAdmin');

const auth = require("../util/authCheck");


/**
 * @swagger
 * /sub-admins/create:
 *   post:
 *     summary: Create new Sub-Admin
 *     tags: [SubAdmins]
 *     requestBody:
 *       description: | 
 *          #
 *          ADMIN Token is required (as only admin can create new sub-admin, not User) *          
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             firstName: "Samarth"
 *             lastName: "Chadda"
 *             email: "samarthnew@gmail.com"
 *             password : "sam123"
 *             permissions: ["discount"]
 *     responses:
 *       200:
 *         description: Sub-Admin created successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Sub-Admin created successfully"
 *                 subAdmin : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       500:
 *         description: Internal server error
*/
router.post('/sub-admins/create',auth.isAdminV2,controller.createNewSubAdmin);

/**
 * @swagger
 * /sub-admins/login:
 *   post:
 *     summary: Login Sub-Admin
 *     tags: [SubAdmins]
 *     requestBody:
 *       description: | 
 *          #
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             email: "samarthnew@gmail.com"
 *             password : "sam123"
 *     responses:
 *       200:
 *         description: Successfully Logged In
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Successfully Logged In"
 *                 subAdmin : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid password
 *       404:
 *         description: Email does not exist
 *       500:
 *         description: Internal server error
*/
router.post('/sub-admins/login',controller.subAdminLogin);

/**
 * @swagger
 * /sub-admins/{subAdminId}:
 *   get:
 *     summary: Get particular sub-admin details
 *     tags: [SubAdmins]
 *     parameters:
 *       - in : path
 *         name: subAdminId
 *         description: _id of Sub-Admin
 *         required: true
 *     requestBody:
 *       description: | 
 *          #
 *          TOKEN is Required
 *          #
 *          (First login/Signup to generate token, then use "AUTHORIZE" button above to validate)
 *     responses:
 *       200:
 *         description: Sub-Admin Exists
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Sub-Admin Exists"
 *                 subAdmin : {}
 *       400:
 *         description: Bad Request, enter valid ID
 *       401:
 *         description: Unauthorized, token required
 *       404:
 *         description: No Sub-Admin exists, enter valid ID
 *       500:
 *         description: Some server error, enter valid mongo object ID
*/
router.get('/sub-admins/:subAdminId',auth.isAdminV2,controller.getParticularSubAdminDetails);

/**
 * @swagger
 * /sub-admins:
 *   get:
 *     summary: Get all Sub-Admins
 *     tags: [SubAdmins]
 *     parameters:
 *       - in : query
 *         name: skip
 *         description: skipCount
 *         required: false
 *       - in : query
 *         name: limit
 *         description: limitCount
 *         required: false
 *     requestBody:
 *       description: | 
 *          #
 *          Skip and Limit are optional Query Params
 *          #
 *          (First admin login is needed to generate token, then use "AUTHORIZE" button above to validate)
 *     responses:
 *       200:
 *         description: All Sub-Admins returned
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All Sub-Admins returned"
 *                 subadmins : []
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Some server error, enter valid mongo object ID
*/
// api/sub-admins                       --  Get all subadmins
// api/sub-admins?skip=0&limit=50       --  Get particular range of subadmins based on skip and limit
router.get('/sub-admins',auth.isAdminV2,controller.getAllsubadmins);

/**
* @swagger
* /sub-admins/{subAdminId}:
*   patch:
*     summary: Edit sub-admin details
*     tags: [SubAdmins]
*     parameters:
*       - in : path
*         name: subAdminId
*         description: id of sub-admin
*         required: true
*     requestBody:
*       description: | 
*          #
*          ADMIN Token is required 
*       content:
*         application/json:
*           schema:
*             id: string
*           example : 
 *            firstName: "Samarth"
 *            lastName: "Chadda"
 *            email: "samarthnew@gmail.com"
 *            password : "sam123"
 *            permissions: ["discount"]
*     responses:
*       200:
*         description: Details updated successfully
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Details updated successfully"
*                 subAdmin : {}
*       400:
*         description: Bad Request, check request body
*       401:
*         description: Unauthorized, enter valid token
*       500:
*         description: Internal server error
*/
router.patch('/sub-admins/:subAdminId',auth.isAdminV2,controller.editSubAdminDetails);

/**
* @swagger
* /sub-admins/{subAdminId}:
*   delete:
*     summary: Delete particular sub-admin (ADMIN token needed)
*     tags: [SubAdmins]
*     parameters:
*       - in : path
*         name: subAdminId
*         description: _id of SubAdmin
*         required: true
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required
*          #
*          (First admin login is needed to generate token, then use "AUTHORIZE" button above to validate)
*     responses:
*       200:
*         description: Sub-Admin deleted successfully
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Sub-Admin deleted successfully"
*       400:
*         description: Bad Request, enter valid ID
*       401:
*         description: Unauthorized, token required
*       404:
*         description: No sub-admin exists, enter valid ID
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.delete('/sub-admins/:subAdminId',auth.isAdminV2,controller.deleteParticularSubAdmin);


module.exports = router;
