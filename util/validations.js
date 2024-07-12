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


const studioSchema = Joi.object({
  fullName:Joi.string().required(),
  address:Joi.string().required(),
  mapLink:Joi.string().required(),
  city:Joi.string().required(),
  state:Joi.string().required(),
  area:Joi.number().strict().required(),
  pincode:Joi.string().required(),
  pricePerHour:Joi.number().strict().required(),
  availabilities:Joi.array().items(Joi.object({
    endTime:Joi.string().required(),
    startTime:Joi.string().required()
  })).min(1).required(),
  
  amenities:Joi.array().items(
    Joi.object({id:Joi.string(),name:Joi.string()}).required(),
).min(1).required(),
  totalRooms:Joi.number().strict().required(),
  roomsDetails:Joi.array().items(
    Joi.object({
      roomId:Joi.number().strict(),
      roomName:Joi.string(),
      area:Joi.string(),
      details:Joi.array(),
      amenities:Joi.array(),
      basePrice:Joi.number().strict(),
      discountPercentage:Joi.number().strict(),
      generalStartTime:Joi.string(),
      generalEndTime:Joi.string(),
      // availabilities:Joi.array().items(Joi.object({endTime:Joi.string(),startTime:Joi.string()})),
      availabilities:Joi.array().items(Joi.object({
        endTime:Joi.string().required(),
        startTime:Joi.string().required()
      })),
      generalTime:Joi.object({
        endTime:Joi.string(),
        startTime:Joi.string(),
      }),
      roomPhotos:Joi.array(),
      bookingDays:Joi.array().items(
        Joi.object({id:Joi.number().strict(),name:Joi.string()}),
      ),
      pricePerHour:Joi.number().strict()
    }).required()
  ).min(1).required(),
  maxGuests:Joi.string().required(),
  studioPhotos:Joi.array().required(),
  aboutUs:Joi.object({
    aboutUs:Joi.string().required(),
    services:Joi.string(),
    infrastructure:Joi.string(),
  }).min(1).required(),
  teamDetails:Joi.array().items(Joi.object({
    imgUrl:Joi.string(),
    name:Joi.string().required(),
    designation:Joi.string(),
    id:Joi.number().strict()
  })).min(1).required(),

  clientPhotos:Joi.array(),
  reviews:Joi.object({
    avgService:Joi.number(),
    avgStudio:Joi.number(),
    avgAmenity:Joi.number(),
    avgLocation:Joi.number(),
  }),
  overallAvgRating:Joi.number(),
  featuredReviews:Joi.array(),
  country:Joi.string().required()
})

module.exports = {
  validateService: (data) => serviceSchema.validate(data),
  validateFilterSchema: (data) => filterSchema.validate(data),
  validateServiceFilterSchema: (data) => ServicefilterSchema.validate(data),
  studioCreateSchema:(data)=> studioSchema.validate(data)
};
