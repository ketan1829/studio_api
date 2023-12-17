const express = require('express');
const router = express.Router();
const controller = require('../controllers/rating');

const auth = require("../util/authCheck");

/**
 * @swagger
 * /ratings/create:
 *   post:
 *     summary: Post new Rating
 *     tags: [Rating]
 *     requestBody:
 *       description: | 
 *          #
 *          Token is required
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             bookingId: "62f908d1588e570023163dbc"
 *             userId: "62c7bf9832688b6c4442ee7b"
 *             studioId: "62c4e8805f9d4e0023327640"
 *             rateInfo: {"service":4, "studio" :3.5, "amenities":4, "location":3}
 *             reviewMsg: "Nice studio"
 *             reviewImage: ["https://mynewimage.com"]
 *     responses:
 *       200:
 *         description: Rating saved successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Rating saved successfully"
 *                 rating : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       404:
 *         description: Studio or user does not exists
 *       409:
 *         description: Booking already rated
 *       500:
 *         description: Internal server error
 */
router.post('/ratings/create',auth.isUser,controller.postNewRating);


module.exports = router;
