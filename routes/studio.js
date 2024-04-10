const express = require('express');
const router = express.Router();
const controller = require('../controllers/studio');

const auth = require("../util/authCheck");

/**
 * @swagger
 * components:
 *   schemas:
 *     Dashboard-Filter Body:
 *       type: object
 *       required:
 *         - latitude
 *         - longitude
 *       properties:
 *         latitude:
 *           type: string
 *         longitude:
 *           type: string
 *         localities:
 *           type: array
 *         budget:
 *           type: double
 *         amenities:
 *           type: array
 */

/**
 * @swagger
 * /studios/create:
 *   post:
 *     summary: Create new studio
 *     tags: [Studios]
 *     requestBody:
 *       description: | 
 *          #
 *          ADMIN Token is required (as only admin can create studio, not User)
 *       content:
 *         application/json:
 *           schema:
 *             id: string
 *           example : 
 *             fullName: "My Studio"
 *             address: "79, padmavati colony, kings road, nirman nagar, jaipur, rajasthan, india"
 *             city: "mumbai"
 *             mapLink: "https://goo.gl/maps/oX1U92g7mJ8iXatE7"
 *             state: "india"
 *             area: "2000"
 *             pincode : "302019"
 *             pricePerHour: "0"
 *             availabilities: []
 *             amenities: [{"id":"1","name":"Wifi"},{"id":"2","name":"Ableton Daw"}]
 *             totalRooms: "2"
 *             roomsDetails: []
 *             maxGuests: "3"
 *             studioPhotos: ["http://myimage1.com"]
 *             aboutUs: {"aboutUs":"About studio details","services":"All text for services","infrastructure":"All text for Infrastructure"}
 *             teamDetails: [{"name":"Test", "designation":"Sound Manager", "imgUrl":"http:newimage.com"}]
 *             clientPhotos: ["http://myimage2.com"]
 *     responses:
 *       200:
 *         description: Studio created successfully
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

router.post('/studios/create',controller.createNewStudio);

/**
* @swagger
* /studios/graph:
*   get:
*     summary: Get all studio graph details
*     tags: [Studios]
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
*                 allStudioCounts : []
*                 allData : []
*       401:
*         description: Unauthorized, token required
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/studios/graph',auth.isAdmin,controller.getAllStudiosGraphDetails);

/**
 * @swagger
 * /studios/{studioId}:
 *   get:
 *     summary: Get particular studio details
 *     tags: [Studios]
 *     parameters:
 *       - in : path
 *         name: studioId
 *         description: _id of Studio
 *         required: true
 *     requestBody:
 *       description: | 
 *          #
 *          TOKEN is Required
 *          #
 *          (First login/Signup to generate token, then use "AUTHORIZE" button above to validate)
 *     responses:
 *       200:
 *         description: Studio Exists
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Studio Exists"
 *                 studio : {}
 *       400:
 *         description: Bad Request, enter valid ID
 *       401:
 *         description: Unauthorized, token required
 *       404:
 *         description: No Studio exists, enter valid ID
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */

router.get('/studios/:studioId',auth.isBoth,controller.getParticularStudioDetails);

/**
* @swagger
* /studios/{studioId}/active:
*   get:
*     summary: Toggle studio active status
*     tags: [Studios]
*     parameters:
*       - in : path
*         name: studioId
*         description: _id of Studio
*         required: true
*     requestBody:
*       description: | 
*          #
*          TOKEN is Required
*     responses:
*       200:
*         description: Studio updated successfully
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "Studio updated successfully"
*                 studio : {}
*       400:
*         description: Bad Request, enter valid ID
*       401:
*         description: Unauthorized, token required
*       404:
*         description: No Studio exists, enter valid ID
*       500:
*         description: Some server error, enter valid mongo object ID
*/
router.get('/studios/:studioId/active',auth.isAdminOrOwner,controller.toggleStudioActiveStatus);

/**
 * @swagger
 * /studios/dashboard-filter:
 *   post:
 *     summary: filter studios
 *     tags: [Studios]
 *     requestBody:
 *       description: | 
 *          #
 *          Token is required
 *          #
 *          Out of Area, rate, and person   only one VALUE is required, send "" for remaining
 *          #
 *          Possible values for relevance : 1-> rating(high to low), 2-> cost(low to high), 3-> cost(high to low), else ""
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Dashboard-Filter Body'
 *           fullName: string
 *           example : 
 *             latitude: "26.895590"
 *             longitude: "75.750990"
 *             localities: ["mumbai"]
 *             budget: "100"
 *             amenities: [{"id":"2","name":"Ableton Daw"}]
 *             rooms: "2"
 *             area: ""
 *             person: ""
 *             relevance: "2"
 *     responses:
 *       200:
 *         description: Studio Exists
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "Studio Exists"
 *                 studio : {}
 *       400:
 *         description: Bad Request, enter valid ID
 *       401:
 *         description: Unauthorized, token required
 *       404:
 *         description: No Studio exists, enter valid ID
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */
router.post('/studios/dashboard-filter',controller.getDashboardStudios);

/**
 * @swagger
 * /studios:
 *   get:
 *     summary: Get All/ NearBy studios based on various parameters
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
 *          skip and Limit are optional Query Params
 *          #
 *          (First admin login is needed to generate token, then use "AUTHORIZE" button above to validate)
 *     responses:
 *       200:
 *         description: The post was successfully created
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All studios returned"
 *                 studios : []
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */

// api/studios                       --  Get all studios
// api/studios?skip=0&limit=50       --  Get particular range of studios based on skip and limit

// get studios (location, filters, sorting)
router.get('/studios-all',auth.isBoth,controller.getStudios);

/**
 * @swagger
 * /studios:
 *   post:
 *     summary: Get All/ NearBy studios based on various parameters
 *     tags: [Studios]
 *     parameters:
 *       - in : query
 *         name: sortBy
 *         description: sort By
 *         required: false
 *       - in : query
 *         name: page
 *         description: paginated page
 *         required: false
 *       - in : query
 *         name: limit
 *         description: limitCount
 *         required: false
 *     requestBody:
 *       description: | 
 *          #
 *          Token is required or Admin token is required
 *       content:
 *         application/json:
 *           schema:
 *             city: string
 *           example : 
 *             creationDate: "Andheri"
 *             city: state
 *           example1 : 
 *             creationDate: "Maharashtra"
 *     responses:
 *       200:
 *         description: The post was successfully created
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All studios returned"
 *                 studios : []
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */

router.get('/studios',auth.isBoth,controller.getAllStudios);

// router.get('/all-states',controller.getAllStates);

router.patch('/studios/:studioId',auth.isAdminOrOwner,controller.editStudioDetails);

/**
 * @swagger
 * /near-studios:
 *   post:
 *     summary: Get all near studios
 *     tags: [Studios]
 *     requestBody:
 *       description: | 
 *          #
 *          Latitude and longitude are mandatory
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Dashboard-Filter Body'
 *           fullName: string
 *           example : 
 *             latitude: "26.895590"
 *             longitude: "75.750990"
 *     responses:
 *       200:
 *         description: All studios returned
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All studios returned"
 *                 studios : []
 *       404:
 *         description: Bad request, enter valid latitude and longitude
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Some server error, enter valid mongo object ID
*/
router.post('/near-studios',auth.isUser,controller.getAllNearStudios);

/**
* @swagger
* /studios/date-filter:
*   post:
*     summary: Fetch studios by date
*     tags: [Studios]
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
*             creationDate: "2022-09-01"
*     responses:
*       200:
*         description: All studio(s) returned
*         content:
*           application/json:
*               example : 
*                 status : true
*                 message : "All studio(s) returned"
*                 studios : []
*       400:
*         description: Bad Request, check request body
*       401:
*         description: Unauthorized, enter valid token
*       500:
*         description: Internal server error
*/
router.post('/studios/date-filter',auth.isAdminOrOwner,controller.getStudiosByDate);


//added by me:

/**
 * @swagger
 * /studios/filter/data:
 *   get:
 *     summary: Get filtered studios--
 *     tags: [Studios]
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
 *         description: Filtered Studio
 *         content:
 *           application/json:
 *               example : 
 *                 status : true
 *                 message : "All filtered studios returned"
 *                 studios : []
 *       401:
 *         description: Provide filter options
 *       500:
 *         description: Some server error, enter valid mongo object ID
 */

// /studios/filter/data
router.get('/studios/filter/data',controller.getStudiosFiltersData);

router.get('/exportStudiosData',auth.isAdminV2,controller.exportStudioData)


module.exports = router;
