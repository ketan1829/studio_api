const express = require('express');
const router = express.Router();
const controller = require('../controllers/booking');

const auth = require("../util/authCheck");

/**
 * @swagger
 * /bookings/create:
 *   post:
 *     summary: Create new Booking
 *     tags: [Booking]
 *     requestBody:
 *       description: | 
 *          #
 *          Token is required
 *          #
 *          bookingDate should be a timestamp value as mentioned below
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               studioId:
 *                 type: string
 *               roomId:
 *                 type: string
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *               bookingTime:
 *                 type: object
 *                 properties:
 *                   startTime:
 *                     type: string
 *                   endTime:
 *                     type: string
 *               totalPrice:
 *                 type: number
 *           example:
 *             userId: "62c7bf9832688b6c4442ee7b"
 *             studioId: "62c4e8805f9d4e0023327640"
 *             roomId: "1"
 *             bookingDate: "2022-07-06T00:00:00.000+00:00"
 *             bookingTime:
 *               startTime: "16:00"
 *               endTime: "17:00"
 *             totalPrice: 100
 *     responses:
 *       200:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: true
 *               message: "Booking created successfully"
 *               booking: {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       404:
 *         description: Studio or user does not exist
 *       500:
 *         description: Internal server error
 */
// Create Studio Booking
router.post('/bookings/create',auth.isAdminOrOwnerOrUser,controller.createNewBooking); 


/**
 * @swagger
 * /bookings/update:
 *   post:
 *     summary: Update Booking Status
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: |
 *         Token is required.
 *         Only Admins, Owners, or Users can update the booking status.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: string
 *                 description: The ID of the booking to update
 *               bookingStatus:
 *                 type: integer
 *                 description: The new status of the booking (0, 1, 2)
 *             required:
 *               - bookingId
 *               - bookingStatus
 *           example:
 *             bookingId: "62c7bf9832688b6c4442ee7b"
 *             bookingStatus: 1
 *     responses:
 *       200:
 *         description: Booking Status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: true
 *               message: "Bookings Status updated successfully"
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       404:
 *         description: No Booking with this ID exists
 *       500:
 *         description: Internal server error
 */
router.post('/bookings/update',auth.isAdminOrOwnerOrUser, controller.updateServiceBooking); 

/**
 * @swagger
 * /bookings/delete:
 *   post:
 *     summary: Delete Booking
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: |
 *         Token is required.
 *         Only Admins, Owners, or Users can delete a booking.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: string
 *                 description: The ID of the booking to delete
 *             required:
 *               - bookingId
 *           example:
 *             bookingId: "62c7bf9832688b6c4442ee7b"
 *     responses:
 *       200:
 *         description: Booking deleted or error message
 *         content:
 *           application/json:
 *             examples:
 *               success:
 *                 summary: Success
 *                 value:
 *                   status: true
 *                   message: "Booking deleted successfully"
 *               error:
 *                 summary: Error
 *                 value:
 *                   status: false
 *                   message: "Booking ID is required"
 *               notFound:
 *                 summary: Not Found
 *                 value:
 *                   status: false
 *                   message: "No Booking with this ID exists"
 *               deleteFailed:
 *                 summary: Delete Failed
 *                 value:
 *                   status: false
 *                   message: "Failed to delete booking"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/bookings/delete',auth.isAdminOrOwnerOrUser, controller.deleteBooking);

/**
 * @swagger
 * /bookings/service/create:
 *   post:
 *     summary: Create new Service Booking
 *     tags: [Booking]
 *     requestBody:
 *       description: | 
 *          #
 *          Token is required
 *          #
 *          bookingDate should be a timestamp value as mentioned below
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             userId: "62c7bf9832688b6c4442ee7b"
 *             serviceId: "62c4e8805f9d4e0023327640"
 *             planId: "1"
 *             bookingDate: "2022-07-06T00:00:00.000+00:00"
 *             bookingTime: {"startTime":"16:00","endTime":"17:00"}
 *             totalPrice: "100"
 *             serviceType: "c2"
 *     responses:
 *       200:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Booking created successfully"
 *                 booking : {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       404:
 *         description: Studio or user does not exists
 *       500:
 *         description: Internal server error
 */
// Create Service Booking
router.post('/bookings/service/create',auth.isAdminOrOwnerOrUser,controller.createServiceBooking);

/**
 * @swagger
 * /bookings/availability-check:
 *   post:
 *     summary: Get all availabilities of particular studio room
 *     tags: [Booking]
 *     requestBody:
 *       description: | 
 *          #
 *          Token is required
 *          #
 *          bookingDate should be a timestamp value as mentioned below
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             studioId: "62c4e8805f9d4e0023327640"
 *             roomId: "1"
 *             bookingDate: "2022-07-06T00:00:00.000+00:00"
 *             bookingHours: "1"
 *     responses:
 *       200:
 *         description: Availability returned
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Availability returned"
 *                 allSlots : []
 *                 availableSlots : []
 *                 bookedSlots : []
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       404:
 *         description: Studio does not exists
 *       500:
 *         description: Internal server error
 */
router.post('/bookings/availability-check',auth.isAdminOrOwnerOrUser,controller.getStudioAvailabilities);

router.post('/bookings/availability-check2',auth.isAdminOrOwnerOrUser,controller.getStudioAvailabilitiesTEST);

/**
* @swagger
* /bookings/graph:
*   get:
*     summary: Get all bookings graph details
*     tags: [Booking]
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
*                 allBookingCounts : []
*                 allData : []
*       401:
*         description: Unauthorized, token required
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/bookings/graph',auth.isAdmin,controller.getAllBookingsGraphDetails);

/**
* @swagger
* /bookings/graph/studio/{studioId}:
*   get:
*     summary: Get all bookings(of particular studio) graph details
*     tags: [Booking]
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
*                 allBookingCounts : []
*                 allData : []
*       401:
*         description: Unauthorized, token required
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/bookings/graph/studio/:studioId',auth.isAdminOrOwner,controller.getAllBookingsGraphDetailsForParticularStudio);

/**
* @swagger
* /bookings/user/{userId}:
*   get:
*     summary: Get all bookings of particular User
*     tags: [Booking]
*     parameters:
*       - in : path
*         name: userId
*         description: _id of USER
*         required: true
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required
*          #
*          (First login/Signup to generate token, then use "AUTHORIZE" button above to validate)
*     responses:
*       200:
*         description: All booking(s) returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All booking(s) returned"
*                 activeBookings : []
*                 completedBookings : []
*                 cancelledBookings : []
*       400:
*         description: Bad Request, enter valid ID
*       401:
*         description: Unauthorized, token required
*       404:
*         description: No User exists, enter valid ID
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/bookings/user/:userId',auth.isUser,controller.getBookingsOfParticularUser);

/**
* @swagger
* /bookings/{bookingId}/cancel:
*   get:
*     summary: Cancel particular booking
*     tags: [Booking]
*     parameters:
*       - in : path
*         name: bookingId
*         description: _id of BOOKING
*         required: true
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required
*          #
*          (First login/Signup to generate token, then use "AUTHORIZE" button above to validate)
*     responses:
*       200:
*         description: Booking cancelled successfully
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Booking cancelled successfully"
*                 booking : {}
*       400:
*         description: Bad Request, enter valid ID
*       401:
*         description: Unauthorized, token required
*       404:
*         description: No Booking exists, enter valid ID
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/bookings/:bookingId/cancel',auth.isUser,controller.cancelParticularBooking);

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all Bookings
 *     tags: [Booking]
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
 *         description: All bookings returned
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All bookings returned"
 *                 studios : []
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */

// api/bookings                       --  Get all bookings
// api/bookings?skip=0&limit=50       --  Get particular range of bookings based on skip and limit
// Get only Studios Booking
router.get('/bookings',auth.isAdminOrOwnerOrUser, controller.getAllBookings);


// Get only Services Booking
/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all Service Bookings based on filter 
 *     tags: [Booking]
 *     parameters:
 *       - in : query
 *         name: bookingType
 *         description: type of booking c2 or c3 
 *         required: false
 *       - in : query
 *         name: phoneNumber
 *         description: phoneNumber of user
 *         required: false
 *       - in : query
 *         name: userId
 *         description: userId
 *         required: false
 *       - in : query
 *         name: active
 *         description: This is bookingStatus basically
 *         required: false
 *     requestBody:
 *       description: | 
 *          #
 *          (First admin login is needed to generate token, then use "AUTHORIZE" button above to validate)
 *     responses:
 *       200:
 *         description: All bookings returned
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 data : {}
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Some server error
 */
router.get('/bookings/services',auth.isAdminOrOwnerOrUser, controller.getServiceBookings);


// Get Studio/Service Bookings dynamically
router.get('/bookings-all',auth.isAdminOrOwnerOrUser, controller.getAllBookingsOptimized);

/**
* @swagger
* /bookings/studio/{studioId}:
*   get:
*     summary: Get all Bookings of particular studio
*     tags: [Booking]
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
*          (First owner login is needed to generate token, then use "AUTHORIZE" button above to validate)
*     responses:
*       200:
*         description: All booking(s) for studio returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All booking(s) for studio returned"
*                 activeBookings : []
*                 completedBookings: []
*                 cancelledBookings: []
*       401:
*         description: Unauthorized, token required
*       500:
*         description: Some server error, enter valid mongo object ID
*/
// api/bookings/studio/:studioId                       --  Get all bookings of particular studio
// api/bookings/studio/:studioId?skip=0&limit=50       --  Get particular range of bookings of particular studio based on skip and limit
router.get('/bookings/studio/:studioId',auth.isAdminOrOwner,controller.getAllBookingsForParticularStudio);

/**
* @swagger
* /bookings/date-filter:
*   post:
*     summary: Fetch bookings by date range
*     tags: [Booking]
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
*         description: All booking(s) returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All booking(s) returned"
*                 activeBookings : []
*                 completedBookings : []
*                 cancelledBookings : []
*       400:
*         description: Bad Request, check request body
*       401:
*         description: Unauthorized, enter valid token
*       500:
*         description: Internal server error
*/
router.post('/bookings/date-filter',auth.isAdminOrOwner,controller.getBookingsByDate);


/**
 * @swagger
 * /exportBookingData:
 *   get:
 *     summary: Export booking data to a file
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         description: Type of booking (service or studio)
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         description: Sorting option
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         description: Limit of bookings per page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         description: Start date filter
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         description: End date filter
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         description: Page number
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortfield
 *         description: Field to sort by
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortvalue
 *         description: Sort value
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Booking data exported successfully
 *       400:
 *         description: Bad request, check request parameters
 *       401:
 *         description: Unauthorized, authentication token missing or invalid
 *       500:
 *         description: Internal server error, something went wrong
 *     requestBody:
 *       required: false
 */
router.get('/exportBookingData',auth.isAdminV2,controller.exportBookingData)



module.exports = router;
