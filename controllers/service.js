const axios = require("axios");
const mongodb = require("mongodb");
const jwt = require("jsonwebtoken");

// models
const Service = require("../models/service");

// utils
const { homeScreen, collectionName } = require("../config/settings");
const {
  validateService,
  validateFilterSchema,
  validateServiceFilterSchema,
} = require("../util/validations");
const pick = require("../util/pick");
const { paginate } = require("../util/plugins/paginate.plugin");
const { getDB } = require("../util/database");
const { json } = require("body-parser");

const ObjectId = mongodb.ObjectId;

exports.createNewService = async (req, res, next) => {
  // console.log("req.body:", req.body);

  const { source, service_objs } = req.body;

  if (source === "google-sheet") {
    const addedData = [];
    Object.keys(service_objs).map((key) => {
      const serviceData = service_objs[key];

      const service_id = serviceData.service_id;
      const fullName = serviceData.service_name.trim();
      const price = parseInt(serviceData.service_lowest_price);
      const amenitiesData = serviceData.service_amenities;
      const totalPlans = parseInt(+serviceData.service_package_count);

      const servicePhotos = [serviceData.service_photo_url] || [];
      const aboutUs = serviceData.service_about;
      const workDetails = serviceData.workDetails || [];
      const discographyDetails = serviceData.discography || [];
      const clientPhotos = req.body.userPhotos || [];
      const reviews = req.body.userReviews || [];
      const featuredReviews = req.body.starredReviews || [];
      const isActive = req.body.service_status || 1;

      const type = req.body.service_type || "c2";

      const packages = serviceData.packages;

      packages.map((pack, index) => {
        const amenities = [];
        pack.amenites.split(",").map((amm, index) => {
          amenities.push({ name: amm, id: index + 1 });
        });
        pack.amenites = amenities;
        pack.photo_url = [pack.photo_url];
        console.log("package amenities ---", pack.amenites);
      });

      const amenities = [];
      amenitiesData.split(",").map((amm, index) => {
        amenities.push({ name: amm, id: index + 1 });
      });
      // console.log("amenities ---", amenities);
      const serviceObj = new Service(
        service_id,
        fullName,
        type,
        price,
        amenities,
        totalPlans,
        packages,
        servicePhotos,
        aboutUs,
        workDetails,
        clientPhotos,
        discographyDetails,
        reviews,
        featuredReviews,
        isActive
      );

      console.log("serviceObj---", serviceObj);
      serviceObj
        .save()
        .then((resultData) => {
          addedData.push(service_id);
        })
        .catch((err) => console.log(err));
    });
    return res.status(200).json({
      status: true,
      message: "New services created successfully",
      data: addedData,
    });
  } else {
    const service_id = req.body.service_id || -1;
    const fullName = req.body.serviceName.trim();
    const price = parseFloat(req.body.startingPrice);
    const amenities = req.body.offerings;
    const totalPlans = +req.body.TotalServices;
    const packages = req.body.packages;
    const servicePhotos = req.body.ServicePhotos;
    const aboutUs = req.body.description;
    const workDetails = req.body.portfolio;
    const discographyDetails = req.body.discography;
    const clientPhotos = req.body.userPhotos;
    const reviews = req.body.userReviews;
    const featuredReviews = req.body.starredReviews;
    const type = req.body.type || "c2";

    console.log("else is running");
    const { error } = validateService(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    // If validation passes, proceed to the next middleware or controller function
    // next();

    const serviceObj = new Service(
      service_id,
      fullName,
      price,
      amenities,
      totalPlans,
      packages,
      servicePhotos,
      aboutUs,
      workDetails,
      discographyDetails,
      clientPhotos,
      reviews,
      featuredReviews,
      type
    );

    // saving in database
    return serviceObj
      .checkBeforeSave()
      .then((resultData) => {
        return res.json({
          status: true,
          message: "Service added successfully",
          data: resultData["ops"],
        });
      })
      .catch((err) => console.log(err));
  }
};

exports.getServices = (req, res, next) => {
  console.log("body---", req.query);
  // const { serviceName, startingPrice, offerings, TotalServices, avgReview, serviceId } = req.query;
  const filter = pick(req.query, [
    "serviceType",
    "active",
    "serviceName",
    "startingPrice",
    "planId",
  ]);
  const options = pick(req.query, ["sortBy", "limit", "page"]);

  let mappedFilter = {};

  const collectionName = homeScreen.category?.[filter.serviceType]?.coll;

  if (filter.serviceType) mappedFilter.type = filter.serviceType; //: filter.catId = 1;
  filter.active
    ? (mappedFilter.isActive = parseInt(filter.active))
    : (mappedFilter.isActive = 1);

  if (filter.planId) {
    var o_id = new ObjectId(filter.planId);
    filter._id = o_id;
  }
  if (filter.serviceName) mappedFilter.fullName = serviceName;
  if (filter.startingPrice) mappedFilter.price = startingPrice;
  if (filter.TotalServices) mappedFilter.totalPlans = TotalServices;
  if (filter.avgReview)
    mappedFilter.featuredReviews.avgService = parseFloat(avgReview);

  console.log("collectionName----", collectionName, mappedFilter, options);

  const { error } = validateFilterSchema(filter);
  if (error) {
    return res
      .status(400)
      .json({ status: false, message: error.details[0].message });
  }

  paginate(collectionName, mappedFilter, options).then((ServiceData) => {
    return res.json({
      status: true,
      message: `Page ${ServiceData.page} of ${ServiceData.totalPages} - ${ServiceData.totalResults} services returned`,
      services: ServiceData,
    });
  });
};

exports.getServiceBookings = (req, res, next) => {
  console.log("body---", req.query);

  const {
    bookingId,
    userID,
    serviceID,
    planID,
    price,
    serviceType,
    dateTime,
    status,
    bookingStartTime,
    bookingEndTime,
  } = req.query;

  const options = pick(req.query, ["sortBy", "limit", "page"]);

  let filter = {};

  const _collectionName = collectionName.service_bookings;

  if (serviceType) filter.type = serviceType;

  if (bookingId) {
    var o_id = new ObjectId(bookingId);
    filter._id = o_id;
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
    return res
      .status(400)
      .json({ status: false, message: error.details[0].message });
  }

  paginate(_collectionName, filter, options).then((ServiceData) => {
    return res.json({
      status: true,
      message: `Page ${ServiceData.page} of ${ServiceData.totalPages} - ${ServiceData.totalResults} service booking returned`,
      services: ServiceData,
    });
  });
};

// exports.updateService = (req, res, next) => {

//     const { bookingId, service_id,  } = req.query;
//     if (bookingId) {
//         var o_id = new ObjectId(bookingId);
//         filter._id = o_id
//     }

//     if (service_id) {
//         filter.service_id = service_id
//     }
// }

exports.getServiceBookingsDetails = async (req, res) => {
  let { last_id } = req.query || 0;

  console.log("last_id:", last_id);
  last_id = last_id === "0" ? 0 : last_id;
  console.log("last_id:", typeof last_id);

  const db = getDB();
  const pipeline = [
    {
      $match: {
        _id: { $gt: ObjectId(last_id) },
        $or: [{ type: { $eq: "c2" } }, { type: { $eq: "c3" } }],
      },
    },
    {
      $lookup: {
        from: "services",
        let: { serviceIdStr: "$studioId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", { $toObjectId: "$$serviceIdStr" }] }, // convert string serviceId to ObjectId and match with _id
            },
          },
        ],
        as: "service",
      },
    },
    {
      $lookup: {
        from: "users",
        let: { userIdStr: "$userId" }, // dfine a variable to hold the string serviceId
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", { $toObjectId: "$$userIdStr" }] },
            },
          },
        ],
        as: "user",
      },
    },
    {
      $project: {
        serviceFullName: { $arrayElemAt: ["$service.fullName", 0] },
        userFullName: { $arrayElemAt: ["$user.fullName", 0] },
        userPhone: { $arrayElemAt: ["$user.phone", 0] },
        userEmail: { $arrayElemAt: ["$user.email", 0] },
        totalPrice: "$totalPrice",
      },
    },
  ];

  const data = await db.collection("bookings").aggregate(pipeline).toArray();

  return res.json({ status: true, data });
};

exports.deleteService = async (req, res) => {
  const sId = req.params.serviceId;
  const deleted_result = await Service.deleteServiceById(sId);
  res.send(deleted_result);
};

exports.updateService = async (req, res) => {
  const sId = req.params.serviceId;
  const pId = req.params.packageId;
  const service_id = req.body.service_id || -1;
  const fullName = req.body.serviceName
  const price = parseFloat(req.body.startingPrice);
  const amenities = req.body.offerings;
  const totalPlans = +req.body.TotalServices;
  const packages = req.body.packages;
  const servicePhotos = req.body.ServicePhotos;
  const aboutUs = req.body.description;
  const workDetails = req.body.portfolio;
  const discographyDetails = req.body.discography;
  const clientPhotos = req.body.userPhotos;
  const reviews = req.body.userReviews;
  const featuredReviews = req.body.starredReviews;
  const type = req.body.type || "c2";
  const serviceData = await Service.findServiceById(sId);
  if (!serviceData) {
    res.status(400).json({
      status: false,
      message: "Service does not exist or provide the correct service Id",
    });
  }
  const updatedPackages = packages.map((p_key, j) => {
    return serviceData.packages.map((pkg, i) => {
      if (pkg.planId === p_key.planId) {
        let updata_pack = serviceData.packages[i];
        updata_pack = { ...updata_pack, ...packages[j] };
        return updata_pack;
      }
      return pkg;
    });
  });


  let service_obj = {
    service_id,
    fullName,
    price,
    amenities,
    totalPlans,
    packages: updatedPackages[0],
    servicePhotos,
    aboutUs,
    workDetails,
    discographyDetails,
    clientPhotos,
    reviews,
    featuredReviews,
    type,
  };
  let newData = Service.filterEmptyFields(service_obj);
  console.log("newData", newData);
  const updated_result = await Service.updateServiceById(sId, newData);
  res.send(updated_result);
};
