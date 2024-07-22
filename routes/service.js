const express = require('express');
const router = express.Router();
const controller = require('../controllers/service');


const auth = require("../util/authCheck");

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
router.post('/services/create',auth.isBoth,controller.createNewService);



/**
 * @swagger
 * /studios:
 *   get:
 *     summary: Get All Services based on various parameters
 *     tags: [Studios]
 *     parameters:
 *       - in: query
 *         name: serviceType
 *         description: type of service can be c2 and c3
 *         required: false
 *       - in: query
 *         name: active
 *         description: active can be 0
 *         required: false
 *       - in: query
 *         name: serviceName
 *         description: serviceName 
 *         required: false
 *       - in: query
 *         name: startPrice
 *         description: startPrice
 *         required: false
 *       - in: query
 *         name: endPrice
 *         description: endPrice
 *         required: false
 *       - in: query
 *         name: planId
 *         description: planId
 *         required: false
 *       - in: query
 *         name: TotalServices
 *         description: TotalServices
 *         required: false
 *       - in: query
 *         name: sortBy
 *         description: sortBy
 *         required: false
 *       - in: query
 *         name: limit
 *         description: limitCount
 *         required: false
 *       - in: query
 *         name: page
 *         description: page no
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
 *             example:
 *               status: true
 *               message: "Page 1 of 10 - 97 services returned"
 *               studio: {}
 *       400:
 *         description: Bad Request, check request body
 *       401:
 *         description: Unauthorized, enter valid token
 *       500:
 *         description: Internal server error
 */
router.get('/services',[auth.isGuest,auth.isBoth],controller.getServices);


// router.get('/services/bookings',auth.isBoth,controller.getServiceBookings);

/**
 * @swagger
 * /services/bookings/create:
 *   get:
 *     summary: Retrieve service bookings based on specified filters
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: string
 *         description: The ID of the booking to retrieve
 *       - in: query
 *         name: userID
 *         schema:
 *           type: string
 *         description: The ID of the user associated with the booking
 *       - in: query
 *         name: serviceID
 *         schema:
 *           type: string
 *         description: The ID of the service associated with the booking
 *       - in: query
 *         name: planID
 *         schema:
 *           type: string
 *         description: The ID of the plan associated with the booking
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *         description: The total price of the booking
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *         description: The type of service associated with the booking
 *       - in: query
 *         name: dateTime
 *         schema:
 *           type: string
 *         description: The creation timestamp of the booking
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: The status of the booking
 *       - in: query
 *         name: bookingStartTime
 *         schema:
 *           type: string
 *         description: The start time of the booking
 *       - in: query
 *         name: bookingEndTime
 *         schema:
 *           type: string
 *         description: The end time of the booking
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: The field to sort the results by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: The maximum number of results to return per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The page number to retrieve
 *     responses:
 *       200:
 *         description: A paginated list of service bookings that match the specified filters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   description: Indicates if the operation was successful
 *                 message:
 *                   type: string
 *                   description: A message indicating the result of the operation
 *                 services:
 *                   type: object
 *                   description: The paginated list of service bookings
 *             example:
 *               status: true
 *               message: Page 1 of 3 - 25 service bookings returned
 *               services:
 *                 page: 1
 *                 totalPages: 3
 *                 totalResults: 25
*/

router.get('/services/bookings/create',auth.isBoth,controller.getServiceBookings);



// GS
/**
 * @swagger
 * /services/bookings/detail:
 *   get:
 *     summary: Get service bookings details
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: last_id
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response with service bookings details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serviceFullName:
 *                         type: string
 *                         description: Full name of the service
 *                       userFullName:
 *                         type: string
 *                         description: Full name of the user
 *                       userPhone:
 *                         type: string
 *                         description: Phone number of the user
 *                       userEmail:
 *                         type: string
 *                         description: Email address of the user
 *                       totalPrice:
 *                         type: number
 *                         description: Total price of the booking
 *       401:
 *         description: Unauthorized, authentication token missing or invalid
 *       500:
 *         description: Internal server error, something went wrong
 */
router.get('/services/bookings/detail',auth.isBoth,controller.getServiceBookingsDetails);


/**
 * @swagger
 * /services/update/{serviceId}:
 *   put:
 *     summary: Update service
 *     tags: [Service]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         description: id of service
 *         required: true
 *       - in: path
 *         name: packageId
 *         description: id of package
 *         required: false
 *     requestBody:
 *       description: | 
 *          #
 *          service_id,serviceName,startingPrice,offerings,TotalServices,packages,ServicePhotos,description,portfolio,discography,userPhotos,userReviews,starredReviews,type=> fiels can be updated, only provide the field you want to update.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_id:
 *                 type: integer
 *                 description: The ID of the service
 *               serviceName:
 *                 type: string
 *                 description: The full name of the service
 *               startingPrice:
 *                 type: number
 *                 description: The starting price of the service
 *               offerings:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of amenities offered
 *               TotalServices:
 *                 type: integer
 *                 description: The total number of plans
 *               packages:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: List of packages
 *               ServicePhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of service photos
 *               description:
 *                 type: string
 *                 description: Description about the service
 *               portfolio:
 *                 type: string
 *                 description: Work details of the service
 *               discography:
 *                 type: string
 *                 description: Discography details of the service
 *               userPhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of client photos
 *               userReviews:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of user reviews
 *               starredReviews:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of featured reviews
 *               type:
 *                 type: string
 *                 default: c2
 *                 description: Type of service
 *               service_status:
 *                 type: integer
 *                 description: Status of the service
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       400:
 *         description: Bad request, service does not exist or incorrect service ID provided
 *       500:
 *         description: Internal server error, failed to update service
 */
router.put('/services/update/:serviceId',auth.isAdminV2,controller.updateService);


/**
 * @swagger
 * /services/editPackage:
 *   patch:
 *     summary: Edit package details of a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_id:
 *                 type: string
 *                 description: The ID of the service to edit the package for
 *               plan_id:
 *                 type: string
 *                 description: The ID of the plan to edit within the service
 *               package_data:
 *                 type: object
 *                 description: The updated package data
 *             example:
 *               service_id: "6097d1e07b4b689ff8e49b6e"
 *               plan_id: "plan123"
 *               package_data:
 *                 planId: "plan123"
 *                 name: "Updated Package Name"
 *                 price: 50
 *                 duration: "1 month"
 *                 description: "Updated package description"
 *     responses:
 *       200:
 *         description: Package updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   description: Indicates if the update was successful
 *                 message:
 *                   type: string
 *                   description: A message indicating the result of the operation
 *             example:
 *               status: true
 *               message: Package updated
 *       400:
 *         description: Bad request, missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   description: Indicates if the update failed
 *                 message:
 *                   type: string
 *                   description: Error message indicating the reason for failure
 *             example:
 *               status: false
 *               message: Package update failed
 */
router.patch('/services/editPackage',auth.isAdminV2,controller.editPackageDetails);

/**
 * @swagger
 * /services/delete/{serviceId}:
 *   delete:
 *     summary: Delete a service
 *     tags: [Service]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         description: ID of the service to delete
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       400:
 *         description: Bad request, service does not exist or incorrect service ID provided
 *       500:
 *         description: Internal server error, failed to delete service
 */
router.delete('/services/delete/:serviceId',auth.isAdminV2,controller.deleteService);

/**
 * @swagger
 * /exportServicesData:
 *   get:
 *     summary: Export service data to a file
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         description: Type of service
 *         schema:
 *           type: string
 *       - in: query
 *         name: fullName
 *         description: Full name of the service
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         description: Sorting option
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         description: Limit of services per page
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
 *         description: Service data exported successfully
 *       400:
 *         description: Bad request, check request parameters
 *       401:
 *         description: Unauthorized, authentication token missing or invalid
 *       500:
 *         description: Internal server error, something went wrong
 *     requestBody:
 *       required: false
 */
router.get('/exportServicesData',auth.isAdminV2,controller.exportServicesData)







 module.exports = router;

 