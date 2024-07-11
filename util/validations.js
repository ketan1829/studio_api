const Joi = require('joi');

const offeringSchema = Joi.object({
  id: Joi.number().required(),
  name: Joi.string().required(),
});

const planDetailsSchema = Joi.object({
  planId: Joi.number().integer().required(),
  planName: Joi.string().required(),
  details: Joi.array().items(Joi.string()).required(),
  amenities: Joi.array().items(Joi.string()),
  basePrice: Joi.string().required(),
  discountPercentage: Joi.number().integer(),
  planPhotos: Joi.array().items(Joi.string()),
  price: Joi.string().required(),
});

const descriptionSchema = Joi.object({
  aboutUs: Joi.string().required(),
  services: Joi.string(),
  infrastructure: Joi.string(),
});

const portfolioSchema = Joi.object({
  imgUrl: Joi.string().allow(''),
  name: Joi.string().required(),
  designation: Joi.string(),
  id: Joi.number().integer().required(),
});

const userReviewsSchema = Joi.object({
  avgService: Joi.number().integer(),
  avgQuality: Joi.number().precision(1),
  avgAmenity: Joi.number().precision(1),
  avgSupport: Joi.number().precision(1),
});

const serviceSchema = Joi.object({
  serviceName: Joi.string().trim().required(),
  startingPrice: Joi.string().required(),
  offerings: Joi.array().items(offeringSchema).required(),
  packages: Joi.array(),
  TotalServices: Joi.number().integer().min(0).required(),
  servicePlans: Joi.array().items(planDetailsSchema),
  servicePhotos: Joi.array().items(Joi.string()),
  description: descriptionSchema,
  portfolio: Joi.array().items(portfolioSchema),
  userReviews: userReviewsSchema,
});

const filterSchema = Joi.object({
  serviceId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  serviceType: Joi.string(),
  active: Joi.number(),
  planId: Joi.string(),
  serviceName: Joi.string().trim(),
  startingPrice: Joi.number().positive(),
  TotalServices: Joi.number().integer().min(0),
  avgReview: Joi.number().min(0).max(5), // Assuming avgReview is a rating between 0 and 5
});

const ServicefilterSchema = Joi.object({
  _id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  type: Joi.string(),
  active: Joi.number(),
  userId: Joi.string(),
  serviceId: Joi.string(),
  planId: Joi.string(),
  bookingTime: Joi.string(),
  totalPrice: Joi.number().positive(),
  bookingStatus: Joi.number().integer(),
  creationTimeStamp: Joi.string(),
});

//dummy code for studio validation
// const studioCreateSchema = Joi.object({
//   fullName:Joi.string(),
//   address:Joi.string(),
//   mapLink:Joi.string(),
//   city:Joi.string(),
//   state:Joi.string(),
//   area:Joi.number(),
//   pincode:Joi.string(),
//   pricePerHour:Joi.number(),
//   availabilities:Joi.array().items(Joi.object({
//     endTime:Joi.string(),
//     startTime:Joi.string()
//   })),
//   amenities:Joi.array().items(
//     Joi.object({id:Joi.string(),name:Joi.string()}),
//     Joi.object({id:Joi.string(),name:Joi.string()}),
//     Joi.object({id:Joi.string(),name:Joi.string()}),
//     Joi.object({id:Joi.string(),name:Joi.string()}),
// ),
//   totalRooms:Joi.number(),
//   roomsDetails:Joi.array(),
//   maxGuests:Joi.string(),
//   studioPhotos:Joi.array(),
//   aboutUs:Joi.object({
//     aboutUs:Joi.string(),
//     services:Joi.string(),
//     infrastructure:Joi.string()
//   }),
//   teamDetails:Joi.array().items(Joi.object({
//     imgUrl:Joi.string(),
//     name:Joi.string(),
//     designation:Joi.string(),
//     id:Joi.number()
//   })),
//   clientPhotos:Joi.array(),
//   reviews:Joi.object({
//     avgService:Joi.any(),
//     avgStudio:Joi.any(),
//     avgAmenity:Joi.any(),
//     avgLocation:Joi.any(),

//   }),
//   featuredReviews:Joi.array(),
//   country:Joi.string()
// })

module.exports = {
  validateService: (data) => serviceSchema.validate(data),
  validateFilterSchema: (data) => filterSchema.validate(data),
  validateServiceFilterSchema: (data) => ServicefilterSchema.validate(data),
};
