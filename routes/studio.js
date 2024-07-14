const express = require('express');
const router = express.Router();
const controller = require('../controllers/studio');

const auth = require("../util/authCheck");
const validSchema = require("../validations/studio")

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

router.post('/studios/create',validSchema.studio,controller.createNewStudio);

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

router.get('/studios/unassignedstudios',auth.isAdminV2,controller.getUnassignedStudios)

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
router.patch('/studios/studioId/active',controller.toggleStudioActiveStatus);



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
 *     summary: Get all/nearby studios based on various parameters
 *     tags: [Studios]
 *     parameters:
 *       - in: query
 *         name: skip
 *         description: Paginated page
 *         required: false
 *       - in: query
 *         name: limit
 *         description: Limit count
 *         required: false
 *       - in: query
 *         name: city
 *         description: City filter on studios
 *         required: false
 *       - in: query
 *         name: state
 *         description: State filter on studios
 *         required: false
 *       - in: query
 *         name: minArea
 *         description: Minimum area filter on studios
 *         required: false
 *       - in: query
 *         name: minPricePerHour
 *         description: Minimum price per hour filter on studios
 *         required: false
 *       - in: query
 *         name: maxPricePerHour
 *         description: Maximum price per hour filter on studios
 *         required: false
 *       - in: query
 *         name: amenity
 *         description: Amenity filter on studios
 *         required: false
 *       - in: query
 *         name: availabilityDay
 *         description: Availability day filter on studios
 *         required: false
 *       - in: query
 *         name: latitude
 *         description: Latitude filter on studios
 *         required: false
 *       - in: query
 *         name: longitude
 *         description: Longitude filter on studios
 *         required: false
 *       - in: query
 *         name: range
 *         description: Range filter on studios
 *         required: false
 *       - in: query
 *         name: studioId
 *         description: Studio ID filter on studios
 *         required: false
 *       - in: query
 *         name: searchText
 *         description: Search text filter on studios
 *         required: false
 *       - in: query
 *         name: active
 *         description: Active filter on studios
 *         required: false
 *       - in: query
 *         name: creationTimeStamp
 *         description: Creation timestamp filter on studios
 *         required: false
 *       - in: query
 *         name: totalRooms
 *         description: Total rooms filter on studios
 *         required: false
 *     requestBody:
 *       description: |
 *          (First admin login is needed to generate token, then use "AUTHORIZE" button above to validate)
 *     responses:
 *       200:
 *         description: Studios successfully retrieved
 *         content:
 *           application/json:
 *             example:
 *               status: true
 *               message: All studios returned
 *               studios: []
 *       401:
 *         description: Unauthorized, token required
 *       500:
 *         description: Server error, enter a valid MongoDB Object ID
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
 *             limit: number,
 *             skip: number,
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


/**
 * @swagger
 * /studios/{studioId}:
 *   patch:
 *     summary: Update studio details
 *     tags: [Studios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studioId
 *         required: true
 *         description: ID of the studio to update
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token for authentication
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: string
 *               longitude:
 *                 type: string
 *               mapLink:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               area:
 *                 type: number
 *               pincode:
 *                 type: string
 *               pricePerHour:
 *                 type: number
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *               totalRooms:
 *                 type: number
 *               roomsDetails:
 *                 type: array
 *               maxGuests:
 *                 type: number
 *               studioPhotos:
 *                 type: array
 *               aboutUs:
 *                 type: string
 *               teamDetails:
 *                 type: array
 *     responses:
 *       200:
 *         description: Studio details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string                     
 *                 studio:
 *                   {}
 *       400:
 *         description: Bad request, check request body parameters
 *       401:
 *         description: Unauthorized, authentication token missing or invalid
 *       404:
 *         description: Studio with the provided ID not found
 *       500:
 *         description: Internal server error, something went wrong
 */
router.patch('/studios/:studioId',auth.isAdminOrOwner,validSchema.studio,controller.editStudioDetails);

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


/**
 * @swagger
 * /studios/filter/data:
 *   get:
 *     summary: Get filtered studios--
 *     tags: [Studios]
 *     requestBody:
 *       description: | 
 *          #
 *          state, offset, per_page are given in body
 *          #
 *          (First admin login is needed to generate token, then use "AUTHORIZE" button above to validate)
 *       content:
 *         application/json:
 *           schema:
 *             state: string,
 *             offset: number,
 *             per_page: number,
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


/**
 * @swagger
 * /exportStudiosData:
 *   get:
 *     summary: Export studio data to a file
 *     tags: [Studios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: city
 *         description: City filter
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         description: State filter
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         description: Sorting option
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         description: Limit of studios per page
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
 *         description: Studio data exported successfully
 *       400:
 *         description: Bad request, check request parameters
 *       401:
 *         description: Unauthorized, authentication token missing or invalid
 *       500:
 *         description: Internal server error, something went wrong
 *     requestBody:
 *       required: false
 */
router.get('/exportStudiosData',auth.isAdminV2,controller.exportStudioData)


module.exports = router;
