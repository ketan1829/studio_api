const express = require('express');
const router = express.Router();
const notiController = require('../controllers/notifications');

const auth = require("../util/authCheck");


/**
* @swagger
* /notifications/users/{userId}:
*   get:
*     summary: Get notifications of particular user
*     tags: [Notifications]
*     parameters:
*       - in : path
*         name: userId
*         description: _id of User
*         required: true
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required
*          #
*          (First login/Signup to generate token, then use "AUTHORIZE" button above to validate)
*     responses:
*       200:
*         description: All User notifications
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All User notifications"
*                 notifications : []
*       400:
*         description: Bad Request, enter valid ID
*       401:
*         description: Unauthorized, token required
*       404:
*         description: No User exists, enter valid ID
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/notifications/users/:userId',auth.isUser,notiController.getSingleUserNotifications);

/**
* @swagger
* /notifications/users:
*   post:
*     summary: Send notifications to all users
*     tags: [Notifications]
*     requestBody:
*       description: | 
*          #
*          ADMIN Token is required
*       content:
*         application/json:
*           schema:
*             id: string
*           example : 
*             title: "Test title"
*             message: "Test message"
*     responses:
*       200:
*         description: Notification Sent to all Users
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Notification Sent to all Users"
*       400:
*         description: Bad Request, check request body
*       401:
*         description: Unauthorized, enter valid token
*       500:
*         description: Internal server error
*/
router.post('/notifications/users',notiController.sendNotificationsToAllUsers);

/**
* @swagger
* /notifications/multiple-users:
*   post:
*     summary: Send notification to multiple users
*     tags: [Notifications]
*     requestBody:
*       description: | 
*          #
*          ADMIN Token is required
*       content:
*         application/json:
*           schema:
*             id: string
*           example : 
*             title: "Test title"
*             message: "Test message"
*             usersList: ["631f70ca99e1ca806de2e659"]
*     responses:
*       200:
*         description: Notification Sent
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Notification Sent"
*       400:
*         description: Bad Request, check request body
*       401:
*         description: Unauthorized, enter valid token
*       500:
*         description: Internal server error
*/
router.post('/notifications/multiple-users',auth.isAdmin,notiController.sendNotificationsToMultipleUsers);

//Send notification to particular user
router.post('/notifications/users/:userId',auth.isAdmin,notiController.sendNotificationsToSingleUser);


module.exports = router;
