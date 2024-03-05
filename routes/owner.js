const express = require('express');
const router = express.Router();
const controller = require('../controllers/owner');

const auth = require("../util/authCheck");


/**
 * @swagger
 * /owners/create:
 *   post:
 *     summary: Create new Owner
 *     tags: [Owners]
 *     requestBody:
 *       description: | 
 *          #
 *          ADMIN Token is required (as only admin can create new owner, not User)
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             firstName: "Samarth"
 *             lastName: "Chadda"
 *             email: "samarthnew@gmail.com"
 *             password: "sam123"
 *             studioId: 631df03cba0286f8ebbb8789
 *     responses:
 *       200:
 *         description: Owner created successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Owner created successfully"
 *                 owner : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       500:
 *         description: Internal server error
*/
router.post('/owners/create',auth.isAdmin,controller.createNewOwner);

/**
* @swagger
* /owners/login:
*   post:
*     summary: Login Owner
*     tags: [Owners]
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
*                 owner : {}
*       400:
*         description: Bad Request, check request body
*       401:
*         description: Unauthorized, enter valid password
*       404:
*         description: Email does not exist
*       500:
*         description: Internal server error
*/
router.post('/owners/login',controller.ownerLogin);

/**
 * @swagger
 * /owners/{ownerId}:
 *   get:
 *     summary: Get particular owner details
 *     tags: [Owners]
 *     parameters:
 *       - in : path
 *         name: ownerId
 *         description: _id of Owner
 *         required: true
 *     requestBody:
 *       description: | 
 *          #
 *          TOKEN is Required
 *          #
 *          (First login/Signup to generate token, then use "AUTHORIZE" button above to validate)
 *     responses:
 *       200:
 *         description: Owner Exists
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Owner Exists"
 *                 owner : {}
 *       400:
 *         description: Bad Request, enter valid ID
 *       401:
 *         description: Unauthorized, token required
 *       404:
 *         description: No Owner exists, enter valid ID
 *       500:
 *         description: Some server error, enter valid mongo object ID
*/
router.get('/owners/:ownerId',auth.isAdminOrOwner,controller.getParticularOwnerDetails);

/**
 * @swagger
 * /owners:
 *   get:
 *     summary: Get all Owners
 *     tags: [Owners]
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
 *         description: All Owners returned
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All Owners returned"
 *                 owners : []
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Some server error, enter valid mongo object ID
*/
// api/owners                       --  Get all owners
// api/owners?skip=0&limit=50       --  Get particular range of owners based on skip and limit
router.get('/owners',auth.isAdmin,controller.getAllOwners);

/**
* @swagger
* /owners/{ownerId}:
*   patch:
*     summary: Edit owner details
*     tags: [Owners]
*     parameters:
*       - in : path
*         name: ownerId
*         description: id of owner
*         required: true
*     requestBody:
*       description: | 
*          #
*          OWNER Token is required 
*       content:
*         application/json:
*           schema:
*             id: string
*           example : 
*             firstName: "Samarth"
*             lastName: "Chadda"
*             email: "samarthnew@gmail.com"
*             password: "sam123"
*     responses:
*       200:
*         description: Details updated successfully
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Details updated successfully"
*                 owner : {}
*       400:
*         description: Bad Request, check request body
*       401:
*         description: Unauthorized, enter valid token
*       500:
*         description: Internal server error
*/
//Edit owner details
router.patch('/owners/:ownerId',auth.isAdminOrOwner,controller.editOwnerDetails);

/**
* @swagger
* /owners/{ownerId}/image:
*   patch:
*     summary: Edit owner image
*     tags: [Owners]
*     parameters:
*       - in : path
*         name: ownerId
*         description: id of owner
*         required: true
*     requestBody:
*       description: | 
*          #
*          OWNER Token is required 
*       content:
*         application/json:
*           schema:
*             id: string
*           example : 
*             ownerImage: "http://newimage.com"
*     responses:
*       200:
*         description: Details updated successfully
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Details updated successfully"
*                 owner : {}
*       400:
*         description: Bad Request, check request body
*       401:
*         description: Unauthorized, enter valid token
*       500:
*         description: Internal server error
*/
//Edit owner image
router.patch('/owners/:ownerId/image',auth.isAdminOrOwner,controller.editOwnerImage);

/**
* @swagger
* /owners/{ownerId}/dashboard-counts:
*   get:
*     summary: Get all dashboard counts of particular Owner
*     tags: [Owners]
*     parameters:
*       - in : path
*         name: ownerId
*         description: id of owner
*         required: true
*     requestBody:
*       description: |
*          #
*     responses:
*       200:
*         description: All counts returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All counts returned"
*                 users : 10
*                 studios : 10
*                 bookings : 10
*       401:
*         description: Unauthorized, token required
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/owners/:ownerId/dashboard-counts',controller.getAllDashboardCountsForOwner);

/**
* @swagger
* /owners/{ownerId}:
*   delete:
*     summary: Delete particular owner (ADMIN token needed)
*     tags: [Owners]
*     parameters:
*       - in : path
*         name: ownerId
*         description: _id of OWNER
*         required: true
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required
*          #
*          (First admin login is needed to generate token, then use "AUTHORIZE" button above to validate)
*     responses:
*       200:
*         description: Owner deleted successfully
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Owner deleted successfully"
*       400:
*         description: Bad Request, enter valid ID
*       401:
*         description: Unauthorized, token required
*       404:
*         description: No owner exists, enter valid ID
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.delete('/owners/:ownerId',auth.isAdmin,controller.deleteParticularOwner);


module.exports = router;
