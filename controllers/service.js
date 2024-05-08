const axios = require("axios");
const mongodb = require("mongodb");
const jwt = require("jsonwebtoken");
const excelJS = require("exceljs");

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
const { logger } = require("../util/logger");

const ObjectId = mongodb.ObjectId;

exports.createNewService = async (req, res, next) => {
  // logger.info("req.body:", req.body);

  const { source, service_objs } = req.body;

  if (source === "google-sheet") {
    const addedData = [];
    logger.info("google sheet is running");
    Object.keys(service_objs).map((key) => {
      const serviceData = service_objs[key];

      const service_id = serviceData.service_id;
      const fullName = serviceData.service_name;
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
      
      packages.map((pack, index)=>{
          const amenities = []
          pack.amenites.split(",").map((amm, index)=>{
              amenities.push({name:amm, id: index+1})
          })
          pack.amenites = amenities
          pack.photo_url = [pack.photo_url]
          logger.info("package amenities ---", pack.amenites);
      })


      const amenities = []
      amenitiesData.split(",").map((amm, index)=>{
          amenities.push({name:amm, id: index+1})
      })
      // logger.info("amenities ---", amenities);
      const serviceObj = new Service(service_id, fullName, price, amenities, totalPlans, packages,
          servicePhotos, aboutUs, workDetails, discographyDetails, clientPhotos, reviews, featuredReviews,isActive,type);

      
      logger.info("serviceObj---", serviceObj);
      serviceObj.checkBeforeSave()
      .then((resultData) => {
        if (resultData.status == false) {
          return res.json({
            status: 400,
            message: resultData.message,
          });
        }
        return res.json({
          status: true,
          message: "Service added successfully",
          data: resultData["ops"],
        });
      })
      .catch(err => logger.error(err));
      
        
    });
    return res.status(200).json({
      status: true,
      message: "New services created successfully",
      data: addedData,
    });
  } else {
    const service_id = req.body.service_id || -1 ;
    const fullName = req.body.serviceName;
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
    const isActive = [0,1,2].includes(req.body.isActive) ? req.body.isActive:1;
    let pricing = {};
    console.log(packages.length);
    if(packages.length < 1){
      return res.status(400).json({
            status: false,
            message: "Add at least one package for the service."
        });
    }

    logger.info("else is running",req.body);
    logger.info("else is running",type,isActive);
    // const { error } = validateService(req.body);
    // if (error) {
    //   return res.status(400).json({ error: error.details[0].message });
    // }
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
      isActive,
      type,
      pricing
    );
    // saving in database
    return serviceObj
      .save()
      .then(async(resultData) => {
        if (resultData.status == false) {
          return res.json({
            status: 400,
            message: resultData.message,
          });
        }
         await Service.minStartPrice(resultData._id) // this caluculate minimum price and update the pricing field
        return res.json({
          status: true,
          message: "Service added successfully",
          data: resultData["ops"],
        });
      })
      .catch((err) =>{ logger.error(err,"Error saving service");
      return res.status(500).json({
          status: false,
          message: err.message
        })
    });
  }
};

exports.getServices = (req, res, next) => {

  

  // const { serviceName, startingPrice, offerings, TotalServices, avgReview, serviceId } = req.query;
  const filter = pick(req.query, ['serviceType', 'active', 'serviceName', 'startPrice','endPrice','planId','TotalServices'])
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  console.log("body---", req.query)
  let mappedFilter = {}

  const collectionName = homeScreen.category?.[filter.serviceType]?.coll


  if (filter.serviceType) mappedFilter.type = filter.serviceType //: filter.catId = 1;
  filter.active ? mappedFilter.isActive = parseInt(filter.active) : mappedFilter.isActive = 1;

  if (filter.planId) {
      // var o_id = new ObjectId(filter.planId);
      // filter._id = o_id
      mappedFilter['packages.planId'] = +filter.planId
  }

  if (filter.serviceName) mappedFilter.fullName = filter.serviceName;
  if(filter.startPrice && filter.endPrice){
    mappedFilter.price = { $gte : +filter.startPrice, $lte: +filter.endPrice}
  } else if(filter.startPrice){
    mappedFilter.price = {$gte:+filter.startPrice}
  } else if(filter.endPrice){
    mappedFilter.price = {$lte:+filter.endPrice}
  }
 
  if (filter.TotalServices) mappedFilter.totalPlans = +filter.TotalServices;
  if (filter.avgReview) mappedFilter.featuredReviews.avgService = parseFloat(filter.avgReview);

  logger.info("collectionName----", collectionName, mappedFilter, options);


  // const { error } = validateFilterSchema(filter);
  // if (error) {
  //     return res.status(400).json({ status: false, message: error.details[0].message });
  // }

  paginate(collectionName, mappedFilter, options).then((ServiceData) => {
    const paginateData = 
    {
      page: ServiceData.page,
      limit: ServiceData.limit,
      totalPages: ServiceData.totalPages,
      totalResults: ServiceData.totalResults,
      
    }
      return res.json({ status: true, message: `Page ${ServiceData.page} of ${ServiceData.totalPages} - ${ServiceData.totalResults} services returned`, services: ServiceData, paginate: paginateData });
  })

}

exports.getServiceBookings = (req, res, next) => {
  logger.info("body---", req.query);

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

  logger.info("collectionName----", _collectionName, filter, options);

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

  logger.info("last_id:", last_id);
  last_id = last_id === "0" ? 0 : last_id;
  logger.info("last_id:", typeof last_id);

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
  if (!sId) {
    return res.status(400).json({
      status: false,
      message: "Service does not exist or provide the correct service Id",
    });
  }
  const deleted_result = await Service.deleteServiceById(sId);
  res.send(deleted_result);
};

exports.updateService = async (req, res) => {
  const sId = req.params.serviceId;
  const pId = req.params.packageId;
  const service_id = req.body.service_id || -1;
  const fullName = req.body.serviceName;
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
  const isActive = +req.body.isActive;
  const serviceData = await Service.findServiceById(sId);
  logger.info(sId);
  if (!serviceData) {
    return res.status(400).json({
      status: false,
      message: "Service does not exist or provide the correct service Id",
    });
  }
  // const updatedPackages = packages?.map((p_key, j) => {
  //   return serviceData.packages.map((pkg, i) => {
  //     if (pkg.planId === p_key.planId) {
  //       let updata_pack = serviceData.packages[i];
  //       updata_pack = { ...updata_pack, ...packages[j] };
  //       return updata_pack;
  //     }
  //     return pkg;
  //   });
  // });
  // console.log(updatedPackages);

  let service_obj = {
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
    type,
    isActive,
  };

  let newData = Service.filterEmptyFields(service_obj);
  // logger.info("newData===================", newData);
  const updated_result = await Service.updateServiceById(sId, newData);
  // logger.info("updated_result===",updated_result)
  res.send(updated_result);
};

exports.editPackageDetails = async (req, res) => {
  try {
    const { service_id, plan_id, package_data } = req.body;
    const db = getDB();
    const serviceObjectId = new ObjectId(service_id);
    const service = await db.collection('services').findOne({ _id: serviceObjectId });
    if (!service) {
      return res.send({ status: false, message: "Service not found" });
    }
    const updatedPackages = service.packages.map(pkg => {
      if (pkg.planId === plan_id) {
        return package_data;
      } else {
        return pkg;
      }
    });

    await db.collection('services').updateOne(
      { _id: serviceObjectId },
      { $set: { packages: updatedPackages } }
    );

    console.log("Details updated for package in service with id:", service_id);
    return res.send({ status: true, message: "Package updated" });
  } catch (error) {
    console.log("Error updating package details:", error);
    return res.send({ status: false, message: "Package update failed" });
  }
}




exports.exportServicesData = async (req, res) => {
  try {
    const filter = pick(req.query, ['type','fullName']); // {startDate: 2022-19-01}
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

    logger.info("this is pipe======>", pipeline);
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
    let allService;
      if(filter || options) {
        allService = await Service.fetchAllServicesByAggregate(pipeline);
      }else {
        allService = await Service.fetchAllService()
      }
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("serviceData");
    const path = "./files";
    worksheet.columns = [
      { header: "S no.", key: "s_no", width: 10 },
      { header: "_id", key: "_id", width: 10 },
      { header: "service_id", key: "service_id", width: 10 },
      { header: "fullname", key: "fullName", width: 10 },
      { header: "type", key: "type", width: 10 },
      { header: "price", key: "price", width: 10 },
      { header: "amenities", key: "amenities", width: 10 },
      { header: "totalPlans", key: "totalPlans", width: 10 },
      { header: "packages", key: "packages", width: 10 },
      { header: "servicePhotos", key: "servicePhotos", width: 10 },
      { header: "aboutUs", key: "aboutUs", width: 10 },
      { header: "workDetails", key: "workDetails", width: 10 },
      { header: "clientPhotos", key: "clientPhotos", width: 10 },
      { header: "discographyDetails", key: "discographyDetails", width: 10 },
      { header: "reviews", key: "reviews", width: 10 },
      { header: "featuredReviews", key: "featuredReviews", width: 10 },
      { header: "isActive", key: "isActive", width: 10 },
      { header: "creationTimeStamp", key: "creationTimeStamp", width: 10 },
    ];
    let counter = 1;
    await allService.forEach((service) => {
      service.s_no = counter;
      worksheet.addRow(service);
      counter++;
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    const data = await workbook.xlsx
    .writeFile(`C:/Users/Choira Dev 2/Desktop/studio_api/files/services.xlsx`)
    .then(() => {
      res.header({"Content-disposition" : "attachment; filename=services.xlsx" ,"Content-Type" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}).sendFile("services.xlsx", {root: `C:/Users/Choira Dev 2/Desktop/studio_api/files`}, function (err) {
        if (err) {
            logger.error(err,'Error sending file:');
        } else {
            logger.info({
              status: "success",
              message: "file successfully downloaded",
              path: `${path}/services.xlsx`
            });
        }
    })
    });
  } catch (error) {
    res.send({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
  // return res.status(200).json({status:true,"no_of_services":allService.length,message:"All Services", All_User:allService})
};
