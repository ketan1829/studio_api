const express = require('express');
const router = express.Router();
const controller = require('../controllers/choiraDiscount');

const auth = require("../util/authCheck");


router.post('/discounts/create',auth.isAdmin,controller.createNewDiscount);

/**
 * @swagger
 * /discounts/user/{userId}:
 *   get:
 *     summary: Get all available discounts for particular User
 *     tags: [Discounts]
 *     parameters:
 *       - in : path
 *         name: userId
 *         description: id of user
 *         required: true
 *     requestBody:
 *       description: | 
 *          #
 *          discountType => 0-> User discount First, 1-> User discount recurring , 2-> Event-based, 3-> Specific User
 *          #
 *          discountDate => TimeStamp, Useful only when discountType=2
 *          #
 *          usersList => Array of UserIDs,  Useful only when discountType=3
 *     responses:
 *       200:
 *         description: All discounts returned for this user
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All discounts returned for this user"
 *                 discounts : []
 *       400:
 *         description: Bad Request, enter valid ID
 *       401:
 *         description: Unauthorized, token required
 *       404:
 *         description: No User exists, enter valid ID
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */
router.get('/discounts/user/:userId', controller.getAllUserDiscounts);
/**
 * @swagger
 * /discounts:
 *   get:
 *     summary: Get all discounts
 *     tags: [Discounts]
 *     requestBody:
 *       description: | 
 *          #
 *          discountType => 0-> User discount First, 1-> User discount recurring , 2-> Event-based, 3-> Specific User
 *          #
 *          discountDate => TimeStamp, Useful only when discountType=2
 *          #
 *          usersList => Array of UserIDs,  Useful only when discountType=3
 *     responses:
 *       200:
 *         description: All discounts returned
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All discounts returned"
 *                 discounts : []
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */
router.get('/discounts',auth.isAdmin,controller.getAllDiscounts);

/**
 * @swagger
 * /discounts/{discountId}:
 *   get:
 *     summary: Get particular discount details
 *     tags: [Discounts]
 *     parameters:
 *       - in : path
 *         name: discountId
 *         description: id of discount
 *         required: true
 *     requestBody:
 *       description: | 
 *          #
 *     responses:
 *       200:
 *         description: Discount exists
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Discount exists"
 *                 discount : {}
 *       400:
 *         description: Bad Request, enter valid ID
 *       401:
 *         description: Unauthorized, token required
 *       404:
 *         description: No Discount exists, enter valid ID
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */
router.get('/discounts/:discountId',auth.isBoth,controller.getParticularDiscountDetails);

/**
 * @swagger
 * /discounts/{discountId}:
 *   patch:
 *     summary: Update discount details
 *     tags: [Discounts]
 *     parameters:
 *       - in : path
 *         name: discountId
 *         description: id of discount
 *         required: true
 *     requestBody:
 *       description: | 
 *          #
 *          discountType => 0-> User discount First, 1-> User discount recurring , 2-> Event-based, 3-> Specific User
 *          #
 *          discountDate => TimeStamp, Useful only when discountType=2
 *          #
 *          usersList => Array of UserIDs,  Useful only when discountType=3
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             discountName: "Discount First Order"
 *             description: "Get 10% Off upto 100"
 *             discountPercentage: "10"
 *             maxCapAmount: "100"
 *             discountDate: ""
 *             usersList: []
 *             couponCode: "SDJ124"
 *     responses:
 *       200:
 *         description: Discount details updated successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Discount details updated successfully"
 *                 discount : {}
 *       400:
 *         description: Bad Request, enter valid ID
 *       401:
 *         description: Unauthorized, token required
 *       404:
 *         description: No Discount exists, enter valid ID
 *       500:
 *         description: Some server error, enter valid mongo object ID
*/
router.patch('/discounts/:discountId',auth.isAdmin,controller.editDiscountDetails);


module.exports = router;
