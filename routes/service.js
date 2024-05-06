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
router.post('/services/create', auth.isBoth,controller.createNewService);



/**
 * @swagger
 * /studios:
 *   get:
 *     summary: Get All Services based on various parameters
 *     tags: [Studios]
 *     parameters:
 *       - in: query
 *         name: skip
 *         description: paginated page
 *         required: false
 *       - in: query
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
router.get('/services',auth.isBoth,controller.getServices);


router.get('/services/bookings',auth.isBoth,controller.getServiceBookings);

router.get('/services/bookings/create',auth.isBoth,controller.getServiceBookings);

// GS
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

router.get('/exportServicesData',auth.isAdminV2,controller.exportServicesData)







 module.exports = router;

 