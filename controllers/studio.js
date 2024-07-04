const Studio = require("../models/studio");
const Rating = require("../models/rating");
const User = require("../models/user");
const excelJS = require("exceljs");
const axios = require("axios");
const path = require("path");

const mongodb = require("mongodb");
const getDb = require("../util/database").getDB;
const pick = require("../util/pick");
const ObjectId = mongodb.ObjectId;

let Country = require("country-state-city").Country;
let State = require("country-state-city").State;

const jwt = require("jsonwebtoken");

var GeoPoint = require("geopoint");
const { logger } = require("../util/logger");
const mapQuestKey = process.env.MAP_QUEST_KEY;
const GOOGLE_MAP_KEY = process.env.GOOGLE_MAP_KEY;

function getReviewersName(ratingList, _callback) {
  let mappedRatings = [];
  ratingList.forEach(async (singleRating) => {
    singleRating.reviewerName = "";
    let userData = await User.findUserByUserId(singleRating.userId);
    if (userData != null) {
      singleRating.reviewerName = userData.fullName;
    }
    mappedRatings.push(singleRating);
    if (mappedRatings.length == ratingList.length) {
      return _callback(mappedRatings);
    }
  });
}

function offersMapping(allStudios, _callback) {
  let mappedStudios = [];
  if (allStudios.length == 0) {
    return _callback([]);
  } else {
    let studiosData = allStudios.map((i) => {
      //**For now, map to dummy values**
      // console.log(i.roomsDetails);
      i.discountValue =
        i.roomsDetails.length != 0
          ? parseFloat(i.roomsDetails[0].discountPercentage)
          : 0;
      i.offerPercentage = 0;
      mappedStudios.push(i);
      if (mappedStudios.length == allStudios.length) {
        return _callback(mappedStudios);
      }
    });
  }
}

function filterNearbySudios(
  studioData,
  latitude,
  longitude,
  page,
  limit,
  range
) {
  try {
    // console.log("studioData::::", studioData);
    const point1 = new GeoPoint(+latitude, +longitude);
    const availableStudios = [];
    for (let i = 0; i < studioData.length; i++) {
      const point2 = new GeoPoint(
        +studioData[i].latitude,
        +studioData[i].longitude
      );
      const distance = point1.distanceTo(point2, true);
      if (distance <= range) {
        availableStudios.push({
          ...studioData[i],
          distance: distance.toFixed(2),
        });
      }
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedStudios = availableStudios.slice(startIndex, endIndex);

    paginatedStudios.sort((a, b) => a.distance - b.distance);

    const totalPages = Math.ceil(availableStudios.length / limit);

    logger.info(
      `Page ${page} of ${totalPages} - ${paginatedStudios.length} studios returned`
    );
    return {
      message: `Page ${page} of ${totalPages} - ${paginatedStudios.length} studios returned`,
      paginate: {
        page: page,
        limit: parseInt(limit),
        totalResults: availableStudios.length,
        totalPages: totalPages,
      },
      studios: paginatedStudios,
      // {
      //     nearYou: paginatedStudios,
      //     page: page,
      //     limit: limit,
      //     totalResults: availableStudios.length,
      //     totalPages: totalPages,
      //     topRated: [],
      //     forYou: []
      // }
    };
  } catch (exception) {
    logger.error(exception,"Exception Occurred");
    return { status: false, message: "Invalid Latitude" };
  }
}

// ----------------- v2.2.3 ---------------------------

exports.getStudios = async (req, res, next) => {

  console.log("body---studios-all");


  logger.info({"body---": req.query});

  var {
    city,
    state,
    minArea,
    minPricePerHour,
    maxPricePerHour,
    amenity,
    availabilityDay,
    latitude,
    longitude,
    range,
    active,
    studioId,
    searchText,
    totalRooms,
    creationTimeStamp,
    page,
    limit
  } = req.query;

  const filter = pick(req.query, ["name", "role", "city","state"]);
  const options = pick(req.query, ["sortBy", "limit", "page"]);

  // const filter = { isActive: 1 };

  // Filters

  if (searchText) filter.fullName = searchText;
  if (city) filter.city = city;
  if (state) filter.state = state;
  if (totalRooms) filter.totalRooms = +totalRooms;
  if (studioId) filter._id = new ObjectId(studioId);
  if (minArea) filter.area = { $gte: parseInt(minArea) };

  if (amenity) filter["amenities.name"] = amenity;
  if (availabilityDay) {
    let availability = JSON.parse(availabilityDay);
    filter["roomsDetails.generalStartTime"] = availability.startTime;
    filter["roomsDetails.generalEndTime"] = availability.endTime;
  }
  if (active) filter.isActive = +active;
  if (totalRooms) filter.totalRooms = +totalRooms;
  // active ? filter.isActive = active : filter.isActive = 1
  
  if (minPricePerHour && maxPricePerHour) {
    filter["roomsDetails.basePrice"] = {
      $gte: +minPricePerHour,
      $lte: +maxPricePerHour,
    };
  } else if (minPricePerHour) {
    filter["roomsDetails.basePrice"] = { $gte: parseInt(minPricePerHour) };
  } else if (maxPricePerHour) {
    filter["roomsDetails.basePrice"] = { $lte: parseInt(maxPricePerHour) };
  }
  

  if(creationTimeStamp){
    filter.creationTimeStamp = {$gte:new Date(creationTimeStamp+"T00:00:00"), $lt:new Date(creationTimeStamp+"T23:59:59")}
  }

  if (options.page) options.page = +page;
  if (options.limit) options.limit = +limit;

  logger.info("filter",{filter});

  console.log("filter =>", filter);

  const check = req.query.check;
  // console.log("latitude?.length:-------------", filter);

  if (check && check === "2dsphere") {
    const db = getDb();
    Studio.fetchAllStudios(0, 0).then((studioData) => {
      studioData.forEach((element) => {
        const { latitude, longitude } = element;
        const point = {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        };
        db.collection("studios").updateOne(
          { _id: element._id },
          { $set: { location: point } }
        );
      });
    });

    // db.collection('studios').updateMany({}, { $unset: { location: "" } })

    db.collection("studios")
      .createIndex({ location: "2dsphere" })
      .then((data) => {
        logger.info("2dSphrere created",{data});
        return res.json({ status: true, message: "2dSphrere created" });
      });
  }

  if (
    check &&
    check === "aggregateStudios" &&
    (longitude?.length || latitude?.length)
  ) {
    const db = getDb();

    const aggregationPipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "dist.calculated",
          maxDistance: 10000, // Maximum distance in meters, default is 10000 meters
          spherical: false,
          includeLocs: "dist.location",
        },
      },
      // {
      //     $match: filter
      // }
    ];

    if (searchText) {
      aggregationPipeline.push({
        $match: { fullName: { $regex: searchText, $options: "i" } },
      });
    }

    // Sorting
    let sortStage = {};
    if (req.query.sortBy) {
      sortStage[req.query.sortBy] = 1;
    } else {
      // sortStage.fullName = 1;
          sortStage._id = -1;
    }

    aggregationPipeline.push({ $sort: sortStage });

    // Limiting results
    const limitValue = parseInt(req.query.limit) || 10;
    aggregationPipeline.push({ $limit: limitValue });

    const nearbyStudios = await db
      .collection("studios")
      .aggregate(aggregationPipeline)
      .toArray();
    const totalPages = Math.ceil(nearbyStudios.length / options?.limit || 10);
    const paginateData = {
      page: parseInt(options?.page),
      limit: parseInt(options?.limit) || 10,
      totalResults: parseInt(nearbyStudios.length),
      totalPages: parseInt(totalPages),
    };
    return res.json({
      status: true,
      message: "All NearBy Studios fetched",
      nearYou: nearbyStudios,
      paginate: paginateData,
    });
  }

  if (latitude?.length && longitude?.length) {
    
    const availableStudios = await Studio.getNearByStudios(
      +parseFloat(longitude),
      +parseFloat(latitude),
      range ? parseInt(range) : 10,
      options?.page || 1,
      options?.limit || 10
    );

    return res.json({
      status: true,
      message: availableStudios.message,
      studios: availableStudios.studios,
      paginate: availableStudios.paginate,
    });

    // Studio.fetchAllStudios(0, 0)
    //     .then(studioData => {
    //         const paginatedStudios = filterNearbySudios(studioData, latitude, longitude, options.page || 1, options.limit || 0, range ? range : 10);

    //         return res.json({ status: true, message: paginatedStudios.message, studios: paginatedStudios.studios, paginate: paginatedStudios.paginate });
    //     })
  } else {

    Studio.paginate(filter, options).then((studioData) => {
      logger.info(
        "---- STUDIOS COUNT:",
        studioData.totalPages,
        studioData.totalResults
      );
      const paginateData = {
        page: parseInt(studioData.page),
        limit: parseInt(studioData.limit),
        totalPages: parseInt(studioData.totalPages),
        totalResults: parseInt(studioData.totalResults),
      };
      return res.json({
        status: true,
        message: "All studios returned",
        studios: studioData.results,
        paginate: paginateData,
      });
    });
  }
};

// Added Aggregation performing operations on it but shows incorrect results
exports.getStudios_aggreation = async (req, res, next) => {
  try {
    let req_body = req.body;
    let req_body_longitude = parseFloat(req.body.longitude)
    logger.info("body---",{req_body, req_body_longitude});
    const db = getDb();
    const {
      city,
      state,
      minArea,
      minPricePerHour,
      amenity,
      availabilityDay,
      latitude,
      longitude,
      range,
      active,
      studioId,
    } = req.body;
    let filter = { isActive: 1 };

    if (active) filter.isActive = active;
    if (studioId) filter._id = new ObjectId(studioId);
    if (city) filter.city = city;
    if (state) filter.state = state;
    if (minArea) filter["area"] = { $gte: parseInt(minArea) };
    if (minPricePerHour)
      filter["roomsDetails.basePrice"] = { $gte: parseInt(minPricePerHour) };
    if (amenity) filter["amenities.name"] = amenity;
    if (availabilityDay) {
      filter["roomsDetails.generalStartTime"] = availabilityDay.startTime;
      filter["roomsDetails.generalEndTime"] = availabilityDay.endTime;
    }
    if (req.query.name) {
      filter.fullName = req.query.name;
    }

    const options = {
      // sort: { distance: range ? parseInt(range) : 1 }, // Sorting by distance
      limit: parseInt(req.query.limit) || 10,
      page: parseInt(req.query.page) || 1,
    };

    if (latitude?.length && longitude?.length) {
      const nearbyStudios = await Studio.aggregate([
        {
          $addFields: {
            distance: {
              $sqrt: {
                $add: [
                  {
                    $pow: [
                      {
                        $subtract: [
                          parseFloat(longitude),
                          { $toDouble: "$longitude" },
                        ],
                      },
                      2,
                    ],
                  },
                  {
                    $pow: [
                      {
                        $subtract: [
                          parseFloat(latitude),
                          { $toDouble: "$latitude" },
                        ],
                      },
                      2,
                    ],
                  },
                ],
              },
            },
          },
        },
        { $match: { distance: { $lte: range ? parseInt(range) : 1 } } },
        { $match: filter },
        { $skip: (options.page - 1) * options.limit },
        { $limit: options.limit },
      ]);

      const totalNearbyStudios = await db
        .collection("studios")
        .countDocuments(filter);
      const totalPages = Math.ceil(totalNearbyStudios / options.limit);
      logger.info("nearbyStudios---",{nearbyStudios});
      return res.json({
        status: true,
        message: `Page ${options.page} of ${totalPages} - ${nearbyStudios.length} studios returned`,
        paginate: {
          page: options.page,
          limit: options.limit,
          totalResults: totalNearbyStudios,
          totalPages: totalPages,
        },
        studios: nearbyStudios,
      });
    } else {
      const studioData = await Studio.paginate(filter, options);
      return res.send(200).json({
        status: true,
        message: "All studios returned",
        studios: studioData,
      });
    }
  } catch (error) {
    logger.error(error,"Error occurred:");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

exports.getStudiosOptimized = (req, res, next) => {
  let req_body = req.body
  logger.info("body---",{req_body});
  const {
    city,
    state,
    minArea,
    minPricePerHour,
    amenity,
    availabilityDay,
    latitude,
    longitude,
    range,
    active,
    studioId,
  } = req.body;
  const filter = pick(req.query, ["name", "role"]) || { isActive: 1 };
  const options = pick(req.query, ["sort", "limit", "page"]);

  // const filter = { isActive: 1 };

  if (active) filter.isActive = active;
  if (studioId) {
    var o_id = new ObjectId(studioId);
    filter._id = o_id;
  }
  if (city) filter.city = city;
  if (state) filter.state = state;
  if (minArea) filter["area"] = { $gte: parseInt(minArea) };
  if (minPricePerHour)
    filter["roomsDetails.basePrice"] = { $gte: parseInt(minPricePerHour) };
  if (amenity) filter["amenities.name"] = amenity;
  if (availabilityDay) {
    filter["roomsDetails.generalStartTime"] = availabilityDay.startTime;
    filter["roomsDetails.generalEndTime"] = availabilityDay.endTime;
  }
  if (latitude && longitude) {
    filter.latitude = latitude;
    filter.longitude = longitude;
  }

  if (active) filter.isActive = active;
  if (studioId) {
    var o_id = new ObjectId(studioId);
    filter._id = o_id;
  }
  if (city) filter.city = city;
  if (state) filter.state = state;
  if (minArea) filter["area"] = { $gte: parseInt(minArea) };
  if (minPricePerHour)
    filter["roomsDetails.basePrice"] = { $gte: parseInt(minPricePerHour) };
  if (amenity) filter["amenities.name"] = amenity;
  if (availabilityDay) {
    filter["roomsDetails.generalStartTime"] = availabilityDay.startTime;
    filter["roomsDetails.generalEndTime"] = availabilityDay.endTime;
  }
  if (latitude && longitude) {
    filter.latitude = latitude;
    filter.longitude = longitude;
  }

  StudPipeline.push({ $skip: options.page });
  StudPipeline.push({ $limit: options.limit });
  StudPipeline.push({
    $match: { filter },
  });
  StudPipeline.push({
    $sort: options.sort,
  });
  StudPipeline.push({
    $sort: options.sort,
  });

  StudPipeline.push({ $skip: options.page });
  StudPipeline.push({ $limit: options.limit });
  StudPipeline.push({
    $match: { filter },
  });
  StudPipeline.push({
    $sort: options.sort,
  });
  StudPipeline.push({
    $sort: options.sort,
  });
};

// ----------------- END v2.2.3 ---------------------------

exports.getAllNearStudios = async (req, res, next) => {
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const range = 10;
  try {
    if (
      latitude == undefined ||
      latitude.length == 0 ||
      longitude == undefined ||
      longitude.length == 0
    ) {
      return res
        .status(400)
        .json({ status: false, message: "Enter valid latitude and longitude" });
    }
    const availableStudios = await Studio.getNearByStudios(
      +longitude,
      +latitude,
      range
    );
    return res.json({
      status: true,
      message: "All " + availableStudios.length + " studios returned",
      nearYou: availableStudios,
      topRated: [],
      forYou: [],
    });
  } catch (exception) {
    logger.error(exception,"Exception Occured");
    return res.json({
      status: false,
      message: "Geopoint Exception Occured....Invalid Latitude",
      error: exception,
    });
  }

  // Studio.fetchAllActiveStudios(0,0).then(studiosData=>{
  //     //get offers mapping
  //     offersMapping(studiosData,(resData)=>{
  //         // console.log(resData);
  //         studiosData = resData;
  //         if(studiosData.length==0)
  //         {
  //             return res.status(404).json({status:false, message:"No studio exist",nearYou:[]});
  //         }
  //         else{
  //             if(latitude==undefined || latitude.length==0)
  //             {
  //                 return res.status(400).json({status:false, message:"Enter valid latitude and longitude",nearYou:[],topRated:[],forYou:[]});
  //             }
  //             else{
  //                 console.log("Non-default filter");
  //                 try{
  //                     var point1 = new GeoPoint(+latitude,+longitude);
  //                     var availableStudios = [];
  //                     for(var i = 0;i<studiosData.length;i++)
  //                     {
  //                         // console.log(studiosData[i].latitude,studiosData[i].longitude);
  //                         var point2 = new GeoPoint(+studiosData[i].latitude,+studiosData[i].longitude);
  //                         var distance = point1.distanceTo(point2, true)  //output in kilometers
  //                         // console.log("Distance:",distance.toFixed(2));

  //                         if(distance<=range)
  //                         {
  //                             availableStudios.push({...studiosData[i],distance:distance.toFixed(2)});
  //                         }
  //                         //Remove duplicates
  //                         availableStudios = availableStudios.filter((value, index) => {
  //                             const _value = JSON.stringify(value);
  //                             return index === availableStudios.findIndex(obj => {
  //                               return JSON.stringify(obj) === _value;
  //                             });
  //                         });

  //                         if(i == studiosData.length-1)
  //                         {
  //                             // Sort Based on distance
  //                             availableStudios.sort((a,b)=> a.distance - b.distance);
  //                             // let allNearStudios = availableStudios.slice(0, 4);//Note that the slice function on arrays returns a shallow copy of the array, and does not modify the original array
  //                             return res.json({
  //                                 status:true,
  //                                 message:"All "+availableStudios.length+" studios returned",nearYou:availableStudios,
  //                                 topRated:[],forYou:[]
  //                             });
  //                         }
  //                     };
  //                 }
  //                 catch(exception)
  //                 {
  //                     // return;  //Return statement is used for BREAKING the for loop
  //                     console.log("Exception Occured : ",exception);
  //                     return res.json({status:false, message:"Geopoint Exception Occured....Invalid Latitude", error:exception});
  //                 }
  //             }
  //         }
  //     })
  // })
};

exports.createNewStudio = async (req, res, next) => {
  const fullName = req.body.fullName; //.trim();
  let address = req.body.address;
  const mapLink = req.body.mapLink;
  const city = req.body.city;
  const state = req.body.state;
  const area = parseFloat(req.body.area);
  const pincode = req.body.pincode;
  const pricePerHour = parseFloat(req.body.pricePerHour) || 0;
  const availabilities = req.body.availabilities;
  const amenities = req.body.amenities;
  const totalRooms = +req.body.totalRooms;
  const roomsDetails = req.body.roomsDetails;
  const maxGuests = req.body.maxGuests;
  const studioPhotos = req.body.studioPhotos;
  const aboutUs = req.body.aboutUs;
  const teamDetails = req.body.teamDetails;
  const clientPhotos = req.body.clientPhotos;
  const country = req.body.country || "IN";
  const reviews = {};
  const featuredReviews = [];
  let minPrice = {}

  try {
    minPrice = calculateMinPrice(roomsDetails);
    logger.info({address});
    address = address.replace("&", "and");
    axios
      .get(
        "https://maps.googleapis.com/maps/api/geocode/json?address=" +
          address +
          "&key=" +
          GOOGLE_MAP_KEY
      )
      .then(function (response) {
        const res_data = response.data?.results[0].geometry.location;
        if (!res_data) {
          return res.json({
            status: false,
            message: "Enter valid address for studio",
          });
        } else {
          let latitude = res_data.lat.toString();
          let longitude = res_data.lng.toString();

          logger.info(latitude, longitude);
          const location = {
            type: "Point",
            coordinates: [+longitude, +latitude],
          };
          const studioObj = new Studio(
            fullName,
            address,
            latitude,
            longitude,
            mapLink,
            city,
            state,
            area,
            pincode,
            pricePerHour,
            availabilities,
            amenities,
            totalRooms,
            roomsDetails,
            maxGuests,
            studioPhotos,
            aboutUs,
            teamDetails,
            clientPhotos,
            reviews,
            featuredReviews,
            1,
            location,
            country,
            minPrice
          );

          // saving in database
          return studioObj
            .save()
            .then(async(resultData) => {
              return res.json({
                status: true,
                message: "Studio created successfully",
                studio: resultData["ops"][0],
              });
            })
            .catch((err) => logger.error(err));
        }
      });
  } catch (error) {
    logger.error(error);
    return res.json({
      status: false,
      message: "Address Lat Long failed! :( contact Dev. NR",
    });
  }
};

exports.getParticularStudioDetails = (req, res, next) => {
  const studioId = req.params.studioId;

  Studio.findStudioById(studioId).then((studioData) => {
    if (!studioData) {
      return res
        .status(404)
        .json({ status: false, message: "No Studio with this ID exists" });
    }
    studioData.reviews = {};
    Rating.fetchAllRatingsByStudioId(studioId).then((ratingsData) => {
      if (ratingsData.length == 0) {
        studioData.reviews.avgService = 0;
        studioData.reviews.avgStudio = 0;
        studioData.reviews.avgAmenity = 0;
        studioData.reviews.avgLocation = 0;
        studioData.reviews.overallAvgRating = 0;
        studioData.reviews.reviewCategory = "Poor";
        return res.json({
          status: true,
          message: "Studio Exists",
          studio: studioData,
        });
      } else {
        let rCount = ratingsData.length;
        logger.info("Ratings exists : " + rCount);
        let serviceCount = 0;
        let studioRatingCount = 0;
        let amenityRatingCount = 0;
        let locationRatingCount = 0;
        getReviewersName(ratingsData, (resRatingData) => {
          resRatingData.forEach((singleRating) => {
            studioData.clientPhotos.push(...singleRating.reviewImage);

            let featuredSingleAvgRating =
              parseFloat(singleRating.rateInfo.service) +
              parseFloat(singleRating.rateInfo.studio) +
              parseFloat(singleRating.rateInfo.amenities) +
              parseFloat(singleRating.rateInfo.location);
            singleRating.avgRatingFeatured = (
              featuredSingleAvgRating / 4
            ).toFixed(1);
            studioData.featuredReviews.push(singleRating);

            serviceCount += parseFloat(singleRating.rateInfo.service);
            studioRatingCount += parseFloat(singleRating.rateInfo.studio);
            amenityRatingCount += parseFloat(singleRating.rateInfo.amenities);
            locationRatingCount += parseFloat(singleRating.rateInfo.location);
          });
          studioData.reviews.avgService = parseFloat(
            (serviceCount / rCount).toFixed(1)
          );
          studioData.reviews.avgStudio = parseFloat(
            (studioRatingCount / rCount).toFixed(1)
          );
          studioData.reviews.avgAmenity = parseFloat(
            (amenityRatingCount / rCount).toFixed(1)
          );
          studioData.reviews.avgLocation = parseFloat(
            (locationRatingCount / rCount).toFixed(1)
          );

          let overallAvgRating =
            parseFloat(studioData.reviews.avgService) +
            parseFloat(studioData.reviews.avgStudio) +
            parseFloat(studioData.reviews.avgAmenity) +
            parseFloat(studioData.reviews.avgLocation);
            logger.info({overallAvgRating});
          studioData.reviews.overallAvgRating = parseFloat(
            (overallAvgRating / 4).toFixed(1)
          );
          studioData.reviews.reviewCategory = "Excellent";

          //Send only first 4 reviews in "featuredReviews"
          // studioData.featuredReviews = studioData.featuredReviews.slice(0,4);
          //Send only first 4 photos in "clientPhotos"
          // studioData.clientPhotos = studioData.clientPhotos.slice(0,4);
          return res.json({
            status: true,
            message: "Studio Exists",
            studio: studioData,
          });
        });
      }
    });
  });
};

exports.toggleStudioActiveStatus = (req, res, next) => {
  const studioId = req.body.studioId;

  Studio.findStudioById(studioId).then((studioData) => {
    if (!studioData) {
      return res
        .status(404)
        .json({ status: false, message: "No Studio with this ID exists" });
    }
    studioData.isActive = studioData.isActive == 0 ? 1 : 0;

    const db = getDb();
    var o_id = new ObjectId(studioId);

    db.collection("studios")
      .updateOne({ _id: o_id }, { $set: studioData })
      .then((resultData) => {
        return res.json({
          status: true,
          message: "Studio updated successfully",
          studio: studioData,
        });
      })
      .catch((err) => logger.error(err));
  });
};

exports.getDashboardStudios = (req, res, next) => {
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const localities = req.body.localities; // Array of Strings
  let budget = parseFloat(req.body.budget);
  const amenities = req.body.amenities; // Array of Objects
  let rooms = +req.body.rooms;
  let area = parseFloat(req.body.area);
  let person = +req.body.person;
  const range = 100;
  const relevance = +req.body.relevance; // 1-> rating(high to low), 2-> cost(low to high), 3-> cost(high to low)

  Studio.fetchAllActiveStudios(0, 0).then((studiosData) => {
    logger.info("Studios COunt : " + studiosData.length);
    //get offers mapping
    offersMapping(studiosData, (resData) => {
      // logger.info({resData});
      studiosData = resData;
      if (studiosData.length == 0) {
        logger.info("availableStudios1:");
        return res.status(404).json({
          status: false,
          message: "No studio exist",
          nearYou: [],
          topRated: [],
          forYou: [],
        });
      } else {
        if (latitude == undefined || latitude.length == 0) {
          logger.info("Default filter");
          var availableStudios = [];
          for (var i = 0; i < studiosData.length; i++) {
            //Checking for localities
            let index = 1;
            if (localities != undefined) {
              index = localities.findIndex(
                (f) =>
                  f.trim().toLowerCase() ==
                  studiosData[i].city.trim().toLowerCase()
              );
            }
            if (localities == undefined || localities.length == 0) {
              //this means localities not selected for filter and we need to skip it
              index = 1;
            }
            logger.info("Index : ",{index});

            //Checking for amenities
            let matchedAmenities = [];
            if (amenities != undefined) {
              matchedAmenities = amenities.filter((f) => {
                const indexAmenity = studiosData[i].amenities.findIndex(
                  (s) =>
                    s.id.toString() == f.id.toString() ||
                    s.name.trim().toLowerCase() == f.name.trim().toLowerCase()
                );
                // logger.info("Index : ",indexAmenity);
                if (indexAmenity != -1) {
                  return true;
                } else {
                  return false;
                }
              });
            }
            let matchCount = matchedAmenities.length;
            if (amenities == undefined || amenities.length == 0) {
              //this means amenties not selected for filter and we need to skip it
              matchCount = 1;
            }
            logger.info("Match amenities : ",{matchCount});

            let budget1 = budget;
            logger.info("Budget : ",{budget});
            if (isNaN(budget)) {
              //this means budget not selected for filter and we need to skip it
              // budget = parseFloat(studiosData[i].pricePerHour);
              budget = parseFloat(studiosData[i].roomsDetails[0].pricePerHour);
            }

            let area1 = area;
            if (isNaN(area)) {
              //this means budget not selected for filter and we need to skip it
              area = parseFloat(studiosData[i].area);
            }

            let person1 = person;
            logger.info("Person : ",{person});
            if (isNaN(person)) {
              //this means person not selected for filter and we need to skip it
              person = parseFloat(studiosData[i].maxGuests);
            }

            let rooms1 = rooms;
            logger.info("Rooms : ",{rooms});
            if (isNaN(rooms)) {
              //this means person not selected for filter and we need to skip it
              rooms = parseFloat(studiosData[i].totalRooms);
            }

            //for Price comparison
            studiosData[i].roomsDetails.forEach((singleRoom) => {
              if (singleRoom.pricePerHour <= budget) {
                availableStudios.push({ ...studiosData[i] });
              }
            });

            if (
              index != -1 &&
              matchCount != 0 &&
              +studiosData[i].totalRooms >= rooms &&
              parseFloat(studiosData[i].area) >= area &&
              +studiosData[i].maxGuests >= person
            ) {
              availableStudios.push({ ...studiosData[i] });
            }

            //Remove duplicates
            availableStudios = availableStudios.filter((value, index) => {
              const _value = JSON.stringify(value);
              return (
                index ===
                availableStudios.findIndex((obj) => {
                  return JSON.stringify(obj) === _value;
                })
              );
            });

            if (i == studiosData.length - 1) {
              availableStudios = availableStudios.map((i) => {
                if (i.overallAvgRating == undefined) {
                  i.overallAvgRating = 0;
                }
                return i;
              });
              //Sorting based on relevance
              if (relevance == 1) {
                //Sort on basis of rating
                availableStudios.sort(
                  (a, b) => b.overallAvgRating - a.overallAvgRating
                );
              } else if (relevance == 2) {
                // Sort Based on cost (low to high)
                availableStudios.sort(
                  (a, b) =>
                    a.roomsDetails[0].pricePerHour -
                    b.roomsDetails[0].pricePerHour
                );
              } else if (relevance == 3) {
                // Sort Based on cost (high to low)
                availableStudios.sort(
                  (a, b) =>
                    b.roomsDetails[0].pricePerHour -
                    a.roomsDetails[0].pricePerHour
                );
              } else {
                // Sort Based on distance
                availableStudios.sort((a, b) => a.distance - b.distance);
              }
              logger.info("availableStudios2:");

              return res.json({
                status: true,
                message: "All " + availableStudios.length + " studios returned",
                nearYou: [],
                topRated: [],
                forYou: availableStudios,
              });
            }
            budget = budget1;
            area = area1;
            rooms = rooms1;
            person = person1;
          }
        } else {
          logger.info("Non-default filter");
          try {
            var point1 = new GeoPoint(+latitude, +longitude);
            var availableStudios = [];
            for (var i = 0; i < studiosData.length; i++) {
              // logger.info(studiosData[i].latitude,studiosData[i].longitude);
              var point2 = new GeoPoint(
                +studiosData[i].latitude,
                +studiosData[i].longitude
              );
              var distance = point1.distanceTo(point2, true); //output in kilometers
              studiosData[i].distance = distance.toFixed(2);
              let distance_toFixed =distance.toFixed(2)
              logger.info("Distance:",{distance_toFixed});

              //Checking for localities
              let index = 1;
              if (localities != undefined) {
                index = localities.findIndex(
                  (f) =>
                    f.trim().toLowerCase() ==
                    studiosData[i].city.trim().toLowerCase()
                );
              }
              if (localities == undefined || localities.length == 0) {
                //this means localities not selected for filter and we need to skip it
                index = 1;
              }
              logger.info("Index : ",{index});

              //Checking for amenities
              let matchedAmenities = [];
              if (amenities != undefined) {
                studiosData[i].matchedAmenities = amenities.filter((f) => {
                  const indexAmenity = studiosData[i].amenities.findIndex(
                    (s) =>
                      s.name.trim().toLowerCase() == f.name.trim().toLowerCase()
                  );
                  // logger.info("Index Amenity: ",indexAmenity);
                  if (indexAmenity != -1) {
                    studiosData[i].amenityMatch = true;
                    return true;
                  } else {
                    studiosData[i].amenityMatch = false;
                    return false;
                  }
                });
              }
              let matchCount = matchedAmenities.length;
              if (amenities == undefined || amenities.length == 0) {
                //this means amenties not selected for filter and we need to skip it
                matchCount = 1;
              }
              logger.info("Match amenities : ",{matchCount});

              let budget1 = budget;
              logger.info("Budget : ",{budget});
              // if(isNaN(budget))  //this means budget not selected for filter and we need to skip it
              // {
              // budget = parseFloat(studiosData[i].pricePerHour);
              // budget = parseFloat(studiosData[i].roomsDetails[0].pricePerHour);
              // }

              let area1 = area;
              if (isNaN(area)) {
                //this means budget not selected for filter and we need to skip it
                area = parseFloat(studiosData[i].area);
              }

              let person1 = person;
              // console.log("Person : ",person);
              if (isNaN(person)) {
                //this means person not selected for filter and we need to skip it
                person = parseFloat(studiosData[i].maxGuests);
              }

              let rooms1 = rooms;
              // console.log("Rooms : ",rooms);
              if (isNaN(rooms)) {
                //this means person not selected for filter and we need to skip it
                rooms = parseFloat(studiosData[i].roomsDetails.length);
              }

              //for Price comparison
              if (!isNaN(budget)) {
                studiosData[i].roomsDetails.forEach((singleRoom) => {
                  if (singleRoom.pricePerHour <= budget) {
                    logger.info(studiosData[i]._id);
                    if (index != -1) {
                      if (
                        parseFloat(studiosData[i].area) >= area &&
                        +studiosData[i].roomsDetails.length >= rooms &&
                        +studiosData[i].maxGuests >= person
                      ) {
                        availableStudios.push({
                          ...studiosData[i],
                          validPriceRange: true,
                        });
                      }
                    }
                  }
                });
              } else {
                if (index != -1) {
                  if (
                    parseFloat(studiosData[i].area) >= area &&
                    +studiosData[i].roomsDetails.length >= rooms &&
                    +studiosData[i].maxGuests >= person
                  ) {
                    availableStudios.push({
                      ...studiosData[i],
                      validPriceRange: true,
                    });
                  }
                }
              }

              logger.info(parseFloat(studiosData[i].pricePerHour), budget);
              if (distance <= range) {
                if (
                  parseFloat(studiosData[i].area) >= area &&
                  +studiosData[i].roomsDetails.length >= rooms &&
                  +studiosData[i].maxGuests >= person
                ) {
                  availableStudios.push({
                    ...studiosData[i],
                    distance: distance.toFixed(2),
                  });
                }
              }

              if (!isNaN(area) && !isNaN(rooms) && !isNaN(person)) {
                if (
                  index != -1 &&
                  matchCount != 0 &&
                  +studiosData[i].roomsDetails.length >= rooms &&
                  parseFloat(studiosData[i].area) >= area &&
                  +studiosData[i].maxGuests >= person
                ) {
                  availableStudios.push({
                    ...studiosData[i],
                    distance: distance.toFixed(2),
                  });
                }
              } else {
                availableStudios.push({
                  ...studiosData[i],
                  distance: distance.toFixed(2),
                });
              }

              if (i == studiosData.length - 1) {
                availableStudios = availableStudios.map((i) => {
                  if (i.overallAvgRating == undefined) {
                    i.overallAvgRating = 0;
                  }
                  return i;
                });
                //Sorting based on relevance
                if (relevance == 1) {
                  //Sort on basis of rating
                  availableStudios.sort(
                    (a, b) => b.overallAvgRating - a.overallAvgRating
                  );
                } else if (relevance == 2) {
                  // Sort Based on cost (low to high)
                  availableStudios.sort(
                    (a, b) =>
                      a.roomsDetails[0].pricePerHour -
                      b.roomsDetails[0].pricePerHour
                  );
                } else if (relevance == 3) {
                  // Sort Based on cost (high to low)
                  availableStudios.sort(
                    (a, b) =>
                      b.roomsDetails[0].pricePerHour -
                      a.roomsDetails[0].pricePerHour
                  );
                } else {
                  // Sort Based on distance
                  availableStudios.sort((a, b) => a.distance - b.distance);
                }

                // Remove duplicates
                availableStudios = availableStudios.filter((value, index) => {
                  const _value = JSON.stringify(value);
                  return (
                    index ===
                    availableStudios.findIndex((obj) => {
                      // console.log(obj.fullName, JSON.parse(_value).fullName);
                      // return JSON.stringify(obj) === _value;
                      return (
                        obj._id.toString() === JSON.parse(_value)._id.toString()
                      );
                    })
                  );
                });
                availableStudios = availableStudios.filter((i) => {
                  return i.validPriceRange == true;
                });
                if (amenities != undefined && amenities.length != 0) {
                  availableStudios = availableStudios.filter((i) => {
                    return i.matchedAmenities.length != 0;
                  });
                }

                let allStudiosForNear = availableStudios.filter(
                  (i) => parseFloat(i.distance) <= range
                );

                let allNearStudios = allStudiosForNear.slice(0, 4); //Note that the slice function on arrays returns a shallow copy of the array, and does not modify the original array
                // allNearStudios = allNearStudios.filter(i=>i.distance!=undefined);
                logger.info("availableStudios3:");
                return res.json({
                  status: true,
                  message:
                    "All " + availableStudios.length + " studios returned",
                  nearYou: allNearStudios,
                  topRated: [],
                  forYou: availableStudios,
                });
              }
              budget = budget1;
              area = area1;
              rooms = rooms1;
              person = person1;
            }
          } catch (exception) {
            // return;  //Return statement is used for BREAKING the for loop
            logger.error(exception,"Exception Occured : ");
            return res.json({
              status: false,
              message: "Geopoint Exception Occured....Invalid Latitude",
              error: exception,
            });
          }
        }
      }
    });
  });
};

exports.getAllStudios = (req, res, next) => {
  let skip = +req.query.skip;
  let limit = +req.query.limit;

  if (isNaN(skip)) {
    skip = 0;
    limit = 0;
  }

  Studio.fetchAllStudios(skip, limit).then((studioData) => {
    return res.json({
      status: true,
      message: "All studios returned",
      studios: studioData,
    });
  });
};

exports.editStudioDetails = async (req, res, next) => {
  const studioId = req.params.studioId;
  const fullName = req.body.fullName;
  const address = req.body.address;
  const latitude = req.body.latitude?.toString();
  const longitude = req.body.longitude?.toString();
  const mapLink = req.body.mapLink;
  const city = req.body.city;
  const state = req.body.state;
  const area = +req.body.area;
  const pincode = req.body.pincode;
  const pricePerHour = +req.body.pricePerHour;
  const amenities = req.body.amenities;
  const totalRooms = +req.body.totalRooms;
  const roomsDetails = req.body.roomsDetails;
  const maxGuests = req.body.maxGuests;
  const studioPhotos = req.body.studioPhotos;
  const aboutUs = req.body.aboutUs;
  const teamDetails = req.body.teamDetails;
  const country = req.body.country;


  let studio = await Studio.findStudioById(studioId);
  if (!studio) {
    return res
      .status(404)
      .json({ status: false, message: "No Studio with this ID exists" });
  }

  // const updatedAminities = amenities.map((a_key, j) => {
  //   return studio.amenities.map((ame, i) => {
  //     console.log(ame.id);
  //     console.log(a_key.id);
  //     if (ame.id === a_key.id) {
  //       console.log(ame.id === a_key.id);
  //       let upadated_ame = studio.amenities[i];
  //       upadated_ame = { ...upadated_ame, ...amenities[j] };
  //       console.log(upadated_ame);
  //       return upadated_ame;
  //     }
  //     return ame;
  //   });
  // });

  const updatedAminities = studio.amenities.map((ame, i) => {
    const matchingAmenity = amenities?.find((a_key) => a_key.id === ame.id);
    if (matchingAmenity) {
      return { ...ame, ...matchingAmenity };
    } else if (!matchingAmenity) {
      return { ...ame, ...amenities };
    }
    return ame;
  });

  const updatedTeamDetails = studio.teamDetails.map((team, i) => {
    const matchingTeam = teamDetails?.find((t_key) => t_key.id === team.id);
    if (matchingTeam) {
      return { ...team, ...matchingTeam };
    } else if (!matchingTeam) {
      return { ...team, ...teamDetails };
    }
    return team;
  });

  const minPrice = calculateMinPrice(roomsDetails);

  let studioObj = {
    fullName,
    address,
    latitude,
    longitude,
    mapLink,
    city,
    state,
    area,
    pincode,
    pricePerHour,
    amenities: updatedAminities,
    totalRooms,
    roomsDetails,
    maxGuests,
    studioPhotos,
    aboutUs,
    teamDetails: updatedTeamDetails,
    country,
    minPrice,
  };

  let newStudioData = await Studio.filterEmptyFields(studioObj);

  const updated_result = await Studio.updateStudioById(studioId, newStudioData);

  res.send({
    status: true,
    message: "Studio details updated successfully",
    studio: updated_result,
  });
};

exports.getStudiosByDate = (req, res, next) => {
  let creationDate = req.body.creationDate;

  //get creationDate from timestamp
  creationDate = new Date(creationDate);
  var yr = creationDate.getUTCFullYear();
  var mth = creationDate.getUTCMonth() + 1;
  if (mth.toString().length == 1) {
    mth = "0" + mth.toString();
  }
  var dt = creationDate.getUTCDate();
  if (dt.toString().length == 1) {
    dt = "0" + dt.toString();
  }
  creationDate = yr + "-" + mth + "-" + dt;
  var sTimeStamp = new Date(creationDate).getTime();
  logger.info("Creation Date : ",{creationDate});

  Studio.fetchStudiosByDate(creationDate).then((studioData) => {
    return res.json({
      status: true,
      message: "All studio(s) returned",
      studios: studioData,
    });
  });
};

exports.getStudiosFiltersData = async (req, res) => {
  const my_lat = 19.132753831903493;
  const my_lang = 72.91828181534228;
  const { state, offset, per_page } = req.body;
  const dbdata = await Studio.fetchStudioLocationDetails(
    state,
    offset,
    per_page
  );
  return res.json({
    status: true,
    data: {
      data: dbdata,
    },
  });
};

exports.getStudiosFiltersData = async (req, res) => {
  const my_lat = 19.132753831903493;
  const my_lang = 72.91828181534228;
  const { state, offset, per_page } = req.body;
  const dbdata = await Studio.fetchStudioLocationDetails(
    state,
    offset,
    per_page
  );
  return res.json({
    status: true,
    data: {
      data: dbdata,
    },
  });
};

exports.getAllStudiosGraphDetails = (req, res, next) => {
  var today = new Date();
  // var today = new Date();
  var d;
  var months = [];
  var d = new Date();
  var month;
  var year = d.getFullYear();
  // console.log(year)

  //for last 6 months(including current month)
  // for(var i = 5; i > -1; i -= 1) {
  var keyData = 1;
  //for last 6 months(excluding current month)
  for (var i = 6; i > 0; i -= 1) {
    d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    //   console.log(d.getFullYear())

    months.push({
      month: d.getMonth(),
      year: d.getFullYear(),
      key: keyData,
      studioCount: 0,
    });
    keyData = keyData + 1;
  }
  logger.info({months});

  Studio.fetchAllStudios(0, 0).then((studiosData) => {
    studiosData.forEach((singleStudio) => {
      var dt1 = new Date(singleStudio.creationTimeStamp);
      var monthOnly = dt1.getMonth();

      months.forEach((mth) => {
        if (+mth.month == +monthOnly) {
          mth.studioCount = mth.studioCount + 1;
        }
      });
    });

    setTimeout(() => {
      months.forEach((mthData) => {
        if (mthData.month == 0) {
          mthData.month = "January";
        }
        if (mthData.month == 1) {
          mthData.month = "Febuary";
        }
        if (mthData.month == 2) {
          mthData.month = "March";
        }
        if (mthData.month == 3) {
          mthData.month = "April";
        }
        if (mthData.month == 4) {
          mthData.month = "May";
        }
        if (mthData.month == 5) {
          mthData.month = "June";
        }
        if (mthData.month == 6) {
          mthData.month = "July";
        }
        if (mthData.month == 7) {
          mthData.month = "August";
        }
        if (mthData.month == 8) {
          mthData.month = "September";
        }
        if (mthData.month == 9) {
          mthData.month = "Ocober";
        }
        if (mthData.month == 10) {
          mthData.month = "November";
        }
        if (mthData.month == 11) {
          mthData.month = "December";
        }
      });

      months.sort((a, b) => {
        return a.key - b.key;
      });

      //retrieving only months
      var allMonths = [];
      months.forEach((m) => {
        allMonths.push(m.month);
      });

      //retrieving only studioCounts
      var allStudioCounts = [];
      months.forEach((m) => {
        allStudioCounts.push(m.studioCount);
      });
      res.json({
        status: true,
        message: "All data returned",
        allMonths: allMonths,
        allStudioCounts: allStudioCounts,
        allData: months,
      });
    }, 1000);
  });
};

exports.exportStudioData = async (req, res) => {
  try {
    const filter = pick(req.query, ["city", "state" /*'overallAvgRating'*/]); // {overallAvgRating: 4}
    const options = pick(req.query, [
      "sort",
      "limit",
      "startDate",
      "endDate",
      "page",
      "sortfield",
      "sortvalue",
    ]); // {}
    const pipeline = [];

    if (Object.keys(filter).length) {
      pipeline.push({
        $match: filter,
      });
    }

    logger.info("this is pipe======>",{pipeline});
    if (options.startDate && options.endDate) {
      let startDate = options.startDate;
      let endDate = options.endDate;
      pipeline.push({
        $match: {
          creationTimeStamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      });
    }

    const sortobj = { [options.sortfield]: +options.sortvalue };

    if (options.sortfield) {
      const sortStage = {
        $sort: sortobj,
      };
      pipeline.push(sortStage);
    }

    if (options.limit) {
      const limitStage = {
        $limit: parseInt(options.limit),
      };
      pipeline.push(limitStage);
    }

    if (options.page) {
      const skipStage = {
        $skip: (parseInt(options.page) - 1) * parseInt(options.limit),
      };
      pipeline.push(skipStage);
    }
    logger.info(JSON.stringify(pipeline));
    let allStudios;
    if (filter || options) {
      allStudios = await Studio.fetchAllStudiosByAggregate(pipeline);
    } else {
      allStudios = await Studio.fetchAllStudios(0, 0);
    }

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("studioData");
    const path = "./files";
    worksheet.columns = [
      { header: "S no.", key: "s_no", width: 10 },
      { header: "fullname", key: "fullName", width: 10 },
      { header: "address", key: "address", width: 10 },
      { header: "latitude", key: "latitude", width: 10 },
      { header: "longitude", key: "longitude", width: 10 },
      { header: "MapLink", key: "mapLink", width: 10 },
      { header: "City", key: "city", width: 10 },
      { header: "State", key: "state", width: 10 },
      { header: "Area", key: "area", width: 10 },
      { header: "Pincode", key: "pincode", width: 10 },
      { header: "PricePerHour", key: "pricePerHour", width: 10 },
      { header: "Availabilities", key: "availabilities", width: 10 },
      { header: "Amenities", key: "amenities", width: 10 },
      { header: "TotalRooms", key: "totalRooms", width: 10 },
      { header: "RoomsDetails", key: "roomsDetails", width: 10 },
      { header: "MaxGuests", key: "maxGuests", width: 10 },
      { header: "StudioPhotos", key: "studioPhotos", width: 10 },
      { header: "AboutUs", key: "aboutUs", width: 10 },
      { header: "TeamDetails", key: "teamDetails", width: 10 },
      { header: "ClientPhotos", key: "clientPhotos", width: 10 },
      { header: "Reviews", key: "reviews", width: 10 },
      { header: "FeaturedReviews", key: "featuredReviews", width: 10 },
      { header: "CreationTimeStamp", key: "creationTimeStamp", width: 10 },
      { header: "OverallAvgRating", key: "overallAvgRating", width: 10 },
      { header: "IsActive", key: "isActive", width: 10 },
    ];
    let counter = 1;
    await allStudios.forEach((studio) => {
      studio.s_no = counter;
      worksheet.addRow(studio);
      counter++;
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });
    let name = new Date().getTime()
    let file_name = `Studio${name}.xlsx`

    const data = await workbook.xlsx
      .writeFile(`files/${file_name}`)
      .then(() => {
        logger.info({__dirname});
        res
          .header({
            "Content-disposition": `attachment; filename=${file_name}`,
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          })
          .sendFile(`${file_name}`, { root: `files/` },
            function (err) {
              if (err) {
                logger.error(err,"Error sending file:");
              } else {
                logger.info({
                  status: "success",
                  message: "file successfully downloaded",
                  path: `${path}/${file_name}`,
                });
              }
            }
          );
      });
    logger.info({data});
  } catch (error) {
    res.send({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
  // return res.status(200).json({status:true,"no_of_studios":allStudios.length,message:"All Studios", All_Studios:allStudios})
};



exports.getUnassignedStudios = async (req, res, next) => {
  try {
      const db = getDb();
      const owners = await db.collection('owners').find({}).toArray();
      const assignedStudioIds = owners.map(owner => owner.studioId);
      const studios = await db.collection('studios').find({}).toArray();
      const unassignedStudios = studios.filter(studio => !assignedStudioIds.includes(studio._id.toString()));
      console.log("unassignedStudios",unassignedStudios);
    res.status(200).json({ status: true, message: "Unassigned studios fetched successfully", studios: unassignedStudios });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "An error occurred while fetching unassigned studios" });
  }
};


const calculateMinPrice = (roomsDetails) => {
  let minPriceOfRoom = [];

  roomsDetails.forEach((room) => {
    if (typeof room.pricePerHour === 'number') {
      minPriceOfRoom.push(room.pricePerHour);
    } else {
      const parsedPrice = parseFloat(room.pricePerHour);
      if (!isNaN(parsedPrice)) {
        minPriceOfRoom.push(parsedPrice);
      }
    }
  });

  if (minPriceOfRoom.length === 0) {
    throw new Error('No valid room prices found');
  }

  let min = Math.min(...minPriceOfRoom);
  return {
    price: min,
    basePrice: min,
  };
};

// exports = {calculateMinPrice}
// // module.exports = calculateMinPrice;