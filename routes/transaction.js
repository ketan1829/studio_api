const express = require('express');
const router = express.Router();
const controller = require('../controllers/transaction');

const auth = require("../util/authCheck");


/**
 * @swagger
 * /transactions/razorpay:
 *   post:
 *     summary: Create new Razorpay Order
 *     tags: [Transaction]
 *     requestBody:
 *       description: | 
 *          #
 *          Token is required
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             amount: "120.5"
 *     responses:
 *       200:
 *         description: RazorPay-Order Created Successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "RazorPay-Order Created Successfully"
 *                 order : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/razorpay',controller.createRazorPayOrder);

/**
 * @swagger
 * /transactions/razorpay/verify-payment-status:
 *   post:
 *     summary: Verify payment status
 *     tags: [Transaction]
 *     requestBody:
 *       description: | 
 *          #
 *          Token is required
 *          #
 *          Inside PAYMENT object, check the status. Also, "failed" is for rejected transaction, "authorized" for success, and else pending. For more info, check razorpay docs for statuses.
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             paymentId: "pay_K4lHHxt3Lx2OTH"
 *     responses:
 *       200:
 *         description: Payment exists
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Payment exists"
 *                 payment : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/razorpay/verify-payment-status',auth.isBoth,controller.razorPayVerifyPaymentStatus);

/**
 * @swagger
 * /transactions/create:
 *   post:
 *     summary: Create new Transaction
 *     tags: [Transaction]
 *     requestBody:
 *       description: | 
 *          #
 *          Token is required
 *          #
 *          discountId : If no discount , send -1, else send valid value
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             transactionId: "1234"
 *             studioId: "62eb8c62088b9a00235ffac4"
 *             userId: "62c7bf9832688b6c4442ee7b"
 *             discountId: "-1"
 *             amount: "120.5"
 *     responses:
 *       200:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Transaction created successfully"
 *                 transaction : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       404:
 *         description: No user with this ID exists
 *       409:
 *         description: Duplicate entry, transaction with this ID already exists
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/create',controller.createNewTransaction);

/**
* @swagger
* /transactions/graph:
*   get:
*     summary: Get all transactions graph details
*     tags: [Transaction]
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required
*          #
*          (ADMIN Token needed)
*     responses:
*       200:
*         description: All data returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All data returned"
*                 allMonths : []
*                 allTransactionCounts : []
*                 allData : []
*       401:
*         description: Unauthorized, token required
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/transactions/graph',auth.isAdmin,controller.getAllTransactionsGraphDetails);

/**
* @swagger
* /transactions/graph/studio/{studioId}:
*   get:
*     summary: Get all bookings(of particular studio) graph details
*     tags: [Transaction]
*     parameters:
*       - in : path
*         name: studioId
*         description: _id of STUDIO
*         required: true
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required
*          #
*          (ADMIN Token needed)
*     responses:
*       200:
*         description: All data returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All data returned"
*                 allMonths : []
*                 allTransactionCounts : []
*                 allData : []
*       401:
*         description: Unauthorized, token required
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/transactions/graph/studio/:studioId',auth.isAdminOrOwner,controller.getAllTransactionsGraphDetailsForParticularStudio);

/**
 * @swagger
 * /transactions/{transactionId}:
 *   get:
 *     summary: Get transaction details
 *     tags: [Transaction]
 *     parameters:
 *       - in : path
 *         name: transactionId
 *         description: id of transaction
 *         required: true
 *     requestBody:
 *       description: | 
 *          #
 *          TransactionStatus => 0-> Pending , 1-> Success , 2-> Rejected
 *     responses:
 *       200:
 *         description: Transaction Exists
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Transaction Exists"
 *                 transaction : {}
 *       400:
 *         description: Bad Request, enter valid ID
 *       401:
 *         description: Unauthorized, token required
 *       404:
 *         description: No Transaction exists, enter valid ID
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */
router.get('/transactions/:transactionId',auth.isBoth,controller.getSingleTransactionDetails);

/**
 * @swagger
 * /transactions/{transactionId}/status:
 *   patch:
 *     summary: Update transaction status
 *     tags: [Transaction]
 *     parameters:
 *       - in : path
 *         name: transactionId
 *         description: id of transaction
 *         required: true
 *     requestBody:
 *       description: | 
 *          #
 *          TransactionStatus => 0-> Pending , 1-> Success , 2-> Rejected
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             transactionStatus: "1"
 *     responses:
 *       200:
 *         description: Transaction status updated successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Transaction status updated successfully"
 *                 transaction : {}
 *       400:
 *         description: Bad Request, enter valid ID
 *       401:
 *         description: Unauthorized, token required
 *       404:
 *         description: No Transaction exists, enter valid ID
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */
router.patch('/transactions/:transactionId/status',controller.editTransactionStatus);

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get all transactions
 *     tags: [Transaction]
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
 *         description: All transactions returned
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All transactions returned"
 *                 studios : []
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */

// api/transactions                       --  Get all transactions
// api/transactions?skip=0&limit=50       --  Get particular range of transactions based on skip and limit
router.get('/transactions',auth.isAdmin,controller.getAllTransactions);

/**
* @swagger
* /transactions/studio/{studioId}:
*   get:
*     summary: Get all transactions of particular studio
*     tags: [Transaction]
*     parameters:
*       - in : query
*         name: skip
*         description: skipCount
*         required: false
*       - in : query
*         name: limit
*         description: limitCount
*         required: false
*       - in : path
*         name: studioId
*         description: _id of Studio
*         required: true
*     requestBody:
*       description: | 
*          #
*          Skip and Limit are optional Query Params
*          #
*          (First admin login is needed to generate token, then use "AUTHORIZE" button above to validate)
*     responses:
*       200:
*         description: All studio transactions returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All studio transactions returned"
*                 transactions : []
*       401:
*         description: Unauthorized, token required
*       500:
*         description: Some server error, enter valid mongo object ID
*/
// api/transactions/studio/:studioId                     --  Get all transactions of particular Studio
// api/transactions/studio/:studioId?skip=0&limit=50     --  Get particular range of transactions of particular studio based on skip and limit
router.get('/transactions/studio/:studioId',auth.isAdminOrOwner,controller.getAllTransactionsOfParticularStudio);

/**
* @swagger
* /transactions/date-filter:
*   post:
*     summary: Fetch transactions by date range
*     tags: [Transaction]
*     requestBody:
*       description: | 
*          #
*          Token is required
*          #
*          Admin token is required
*       content:
*         application/json:
*           schema:
*             id: string
*           example : 
*             startDate: "2022-09-01"
*             endDate: "2022-09-20"
*     responses:
*       200:
*         description: All transaction(s) returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All transaction(s) returned"
*                 transactions : []
*       400:
*         description: Bad Request, check request body
*       401:
*         description: Unauthorized, enter valid token
*       500:
*         description: Internal server error
*/
router.post('/transactions/date-filter',auth.isAdminOrOwner,controller.getTransactionsByDate);


module.exports = router;
