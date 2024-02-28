const express = require('express');
const router = express.Router();
const notiController = require('../controllers/adminNotifications');

const auth = require("../util/authCheck");


/**
* @swagger
* /notifications/admin:
*   get:
*     summary: Get all notifications for admin
*     tags: [Notifications]
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required (of ADMIN or OWNER)
*     responses:
*       200:
*         description: All notifications returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All notifications returned"
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
router.get('/notifications/admin',auth.isAdminOrOwner,notiController.getAllNotifications);

/**
* @swagger
* /notifications/studio/{studioId}:
*   get:
*     summary: Get all notifications for studio
*     tags: [Notifications]
*     parameters:
*       - in : path
*         name: studioId
*         description: _id of Studio
*         required: true
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required (of ADMIN or OWNER)
*     responses:
*       200:
*         description: All notifications returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All notifications returned"
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
router.get('/notifications/studio/:studioId',auth.isAdminOrOwner,notiController.getAllNotificationsForParticularStudio);

/**
* @swagger
* /notifications/admin/{notificationId}:
*   delete:
*     summary: Delete particular admin notification
*     tags: [Notifications]
*     parameters:
*       - in : path
*         name: notificationId
*         description: _id of Notification
*         required: true
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required
*     responses:
*       200:
*         description: Notification deleted successfully
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Notification deleted successfully"
*       400:
*         description: Bad Request, enter valid notification ID
*       401:
*         description: Unauthorized, token required
*       404:
*         description: No notification exists, enter valid notification ID
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.delete('/notifications/admin/:notificationId',auth.isAdminOrOwner,notiController.deleteParticularNotification);


module.exports = router;
