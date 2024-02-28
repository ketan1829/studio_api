const axios = require('axios');
const mongodb = require('mongodb');
const jwt = require('jsonwebtoken');

// models
const Service = require('../models/service');

// utils
const { homeScreen, collectionName } = require('../config/settings')
const { validateService, validateFilterSchema, validateServiceFilterSchema } = require('../util/validations');
const pick = require('../util/pick')
const {paginate} = require('../util/plugins/paginate.plugin');
const { getDB } = require('../util/database');

const ObjectId = mongodb.ObjectId;





exports.createNewService = async(req,res,next)=>{
    
    
    const fullName = req.body.serviceName.trim();
    const price = parseFloat(req.body.startingPrice);
    const amenities = req.body.offerings;
    const totalPlans = +req.body.TotalServices;
    const serviceDetails = req.body.servicePlans;
    const servicePhotos = req.body.ServicePhotos;
    const aboutUs = req.body.description;
    const workDetails = req.body.portfolio;
    const discographyDetails = req.body.discography;
    const clientPhotos = req.body.userPhotos;
    const reviews = req.body.userReviews;
    const featuredReviews = req.body.starredReviews;

    const { error } = validateService(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    // If validation passes, proceed to the next middleware or controller function
    // next();

    const serviceObj = new Service(fullName,price,amenities,totalPlans,serviceDetails,
        servicePhotos,aboutUs,workDetails, discographyDetails,clientPhotos,reviews,featuredReviews);
   
   // saving in database
    return serviceObj.save()
    .then(resultData=>{
        return res.json({status:true,message:"Service added successfully",data:resultData["ops"][0]});
    })
    .catch(err=>console.log(err));

}

exports.getServices = (req,res,next)=>{

    console.log("body---", req.query);
    // const { serviceName, startingPrice, offerings, TotalServices, avgReview, serviceId } = req.query;
    const filter = pick(req.query, ['serviceType' ,'active', 'serviceName', 'startingPrice','planId'])
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    let mappedFilter = {}

    const collectionName = homeScreen.category?.[filter.serviceType]?.coll

    if (filter.serviceType) mappedFilter.type = filter.serviceType //: filter.catId = 1;
    filter.active ? mappedFilter.isActive = parseInt(filter.active): mappedFilter.isActive = 1;

    if (filter.planId) {
        var o_id = new ObjectId(filter.planId);
        filter._id =o_id
    }
    if (filter.serviceName) mappedFilter.fullName = serviceName;
    if (filter.startingPrice) mappedFilter.price = startingPrice;
    if (filter.TotalServices) mappedFilter.totalPlans = TotalServices;
    if (filter.avgReview) mappedFilter.featuredReviews.avgService = parseFloat(avgReview);

    console.log("collectionName----", collectionName, mappedFilter, options);

    const { error } = validateFilterSchema(filter);
    if (error) {
        return res.status(400).json({ status: false, message: error.details[0].message });
    }

    paginate(collectionName, mappedFilter, options).then((ServiceData)=>{
        return res.json({status:true, message:`Page ${ServiceData.page} of ${ServiceData.totalPages} - ${ServiceData.totalResults} services returned`,services:ServiceData});
    })
    
}

exports.getServiceBookings = (req,res,next)=>{

    console.log("body---", req.query);

    const { bookingId, userID, serviceID, planID, price, serviceType, dateTime, status, bookingStartTime, bookingEndTime } = req.query;

    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    let filter = {}

    const _collectionName = collectionName.service_bookings


    if (serviceType) filter.type = serviceType;

    if (bookingId) {
        var o_id = new ObjectId(bookingId);
        filter._id = o_id
    }
    if (userID) filter.userId = userID;
    if (serviceID) filter.serviceId = serviceID;
    if (planID) filter.planId = planID;
    if (price) filter.totalPrice = price;
    if (dateTime) filter.creationTimeStamp = dateTime;
    if (status) filter.bookingStatus = status;
    if (bookingStartTime) filter.bookingTime.startTime = bookingStartTime;
    if (bookingEndTime) filter.bookingTime.endTime = bookingEndTime;

    console.log("collectionName----", _collectionName, filter, options);

    const { error } = validateServiceFilterSchema(filter);
    if (error) {
        return res.status(400).json({ status: false, message: error.details[0].message });
    }

    paginate(_collectionName, filter, options).then((ServiceData)=>{
        return res.json({status:true, message:`Page ${ServiceData.page} of ${ServiceData.totalPages} - ${ServiceData.totalResults} service booking returned`,services:ServiceData});
    })
    
}


exports.getServiceBookingsDetails = (req,res)=>{

    const db = getDB();

    db.createView( "detailed", "services", [
        {
           $lookup:
              {
                 from: "serviceBookings",
                 localField: "serviceId",
                 foreignField: "_id",
                 as: "detailed"
              }
        },
        {
           $project:
              {
                _id: 0,
                fullName: 1,
              }
        },
           { $unwind: "$price" }
     ] )

}