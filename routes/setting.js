const express = require('express');
const router = express.Router();
const controller = require('../controllers/setting');

const auth = require("../util/authCheck");

//add price to all the packages
// router.post('/settings/addPrice',controller.addPricingInServicePackage);

// //add price to all the service
// router.post('/settings/addPriceInPackage',controller.addPricingInService);

//add price to all the packages
// router.post('/settings/addPrice',controller.addPricing);


// router.post('/settings/create',controller.createNewSetting);

router.get('/settings/banner',auth.isBoth,controller.getBanner);

router.get('/settings/category',auth.isBoth,controller.getCategory);

// router.post('/settings/update_or_delete_user',auth.isBoth,controller.deleteDuplicateUserWhileCheckingPreviousUser);

/**
 * @swagger
 * /services/create:
 *   post:
 *     summary: Create new service
 *     tags: [Services]
 *     requestBody:
 *       description: | 
 *          #
 *          ADMIN Token is required (as only admin can create studio, not User)
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             fullName: "Music Production | Demo"
 *             price: "0"
 *             availabilities: []
 *             amenities: [{"id":"1","name":"Wifi"},{"id":"2","name":"Ableton Daw"}]
 *             totalPlans: "2"
 *             planDetails: []
 *             planPhotos: ["http://myimage1.com"]
 *             aboutUs: {"aboutUs":"About studio details","services":"All text for services","infrastructure":"All text for Infrastructure"}
 *             workDetails: [{"name":"Test", "designation":"Sound Manager", "imgUrl":"http:newimage.com"}]
 *             clientPhotos: ["http://myimage2.com"]
 *     responses:
 *       200:
 *         description: Service created successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Studio created successfully"
 *                 studio : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
 * /studios:
 *   get:
 *     summary: Get All Services based on various parameters
 *     tags: [Studios]
 *     parameters:
 *       - in : query
 *         name: skip
 *         description: paginated page
 *         required: false
 *       - in : query
 *         name: limit
 *         description: limitCount
 *         required: false
 *     requestBody:
 *       description: | 
 *          #
 *          ADMIN Token is required (as only admin can create studio, not User)
 *     responses:
 *       200:
 *         description: Services Listed successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Page 1 of 10 - 97 services returned"
 *                 studio : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       500:
 *         description: Internal server error
 */

 module.exports = router;

 