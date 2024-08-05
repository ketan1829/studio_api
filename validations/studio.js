const Joi = require('joi');

const studioCreateSchema = Joi.object({
    fullName:Joi.string().required(),
    address:Joi.string().required(),
    mapLink:Joi.string().required(),
    city:Joi.string().required(),
    state:Joi.string().required(),
    area:Joi.number().strict().required(),
    pincode:Joi.string().required(),
    pricePerHour:Joi.number().integer().strict().required(),
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
        basePrice:Joi.number().integer().strict().required(),
        discountPercentage:Joi.number().integer().strict().required(),
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
        pricePerHour:Joi.number().integer().strict().required()
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
const studioCreate = (req,res,next)=>{
    try {
    const { error } = studioCreateSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ status: false, message: error.details[0].message });
  }
  next()
    } catch (error) {
        logger.error(error,"Error while validationg studio creation schema")
        console.log(error,"Error while validationg studio creation schema")
    }

}

const studioUpdateSchema = Joi.object({
  fullName:Joi.string(),
  address:Joi.string(),
  mapLink:Joi.string(),
  city:Joi.string(),
  state:Joi.string(),
  area:Joi.number().strict(),
  pincode:Joi.string(),
  pricePerHour:Joi.number().integer().strict(),
  availabilities:Joi.array().items(Joi.object({
    endTime:Joi.string(),
    startTime:Joi.string()
  })),

  amenities:Joi.array().items(
    Joi.object({id:Joi.string(),name:Joi.string()}),
),
  totalRooms:Joi.number().strict(),
  roomsDetails:Joi.array().items(
    Joi.object({
      roomId:Joi.number().strict(),
      roomName:Joi.string(),
      area:Joi.string(),
      details:Joi.array(),
      amenities:Joi.array(),
      basePrice:Joi.number().integer().strict(),
      discountPercentage:Joi.number().integer().strict(),
      generalStartTime:Joi.string(),
      generalEndTime:Joi.string(),
      // availabilities:Joi.array().items(Joi.object({endTime:Joi.string(),startTime:Joi.string()})),
      availabilities:Joi.array().items(Joi.object({
        endTime:Joi.string(),
        startTime:Joi.string()
      })),
      generalTime:Joi.object({
        endTime:Joi.string(),
        startTime:Joi.string(),
      }),
      roomPhotos:Joi.array(),
      bookingDays:Joi.array().items(
        Joi.object({id:Joi.number().strict(),name:Joi.string()}),
      ),
      pricePerHour:Joi.number().integer().strict()
    })
  ),
  maxGuests:Joi.string(),
  studioPhotos:Joi.array(),
  aboutUs:Joi.object({
    aboutUs:Joi.string(),
    services:Joi.string(),
    infrastructure:Joi.string(),
  }),
  teamDetails:Joi.array().items(Joi.object({
    imgUrl:Joi.string(),
    name:Joi.string(),
    designation:Joi.string(),
    id:Joi.number().strict()
  })),

  clientPhotos:Joi.array(),
  reviews:Joi.object({
    avgService:Joi.number(),
    avgStudio:Joi.number(),
    avgAmenity:Joi.number(),
    avgLocation:Joi.number(),
  }),
  overallAvgRating:Joi.number(),
  featuredReviews:Joi.array(),
  country:Joi.string()
}).unknown(true)
const studioUpdate = (req,res,next)=>{
  try {
  const { error } = studioUpdateSchema.validate(req.body);
if (error) {
  return res
    .status(400)
    .json({ status: false, message: error.details[0].message });
}
next()
  } catch (error) {
      logger.error(error,"Error while validationg studio creation schema")
      console.log(error,"Error while validationg studio creation schema")
  }

}


  
  module.exports = {studioCreate,studioUpdate};