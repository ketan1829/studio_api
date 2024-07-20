const Joi = require("joi")
const { logger } = require("../util/logger")

const serviceBookingSchems = Joi.object({
    userId : Joi.string().required(),
    serviceId : Joi.string().required(),
    planId : Joi.number().strict().required(),
    bookingDate : Joi.string().required(),
    bookingTime : Joi.object({
        startTime:Joi.string(),
        endTime:Joi.string(),
    }),
    totalPrice : Joi.number().strict().required(),
    serviceType : Joi.string().required(),
    countryCode : Joi.string().required(),
})


const serviceBooking = (req,res,next)=>{
    const {error}=serviceBookingSchems.validate(req.body)
    if(error){
        logger.error(error,"Error Accured during validating service booking schema")
        return res.status(200).json({status:false, message:error.details[0].message})
    }
    next()
}


const studioBookingSchems = Joi.object({
    userId : Joi.string().required(),
    studioId : Joi.string().required(),
    roomId : Joi.number().strict().required(),
    bookingDate : Joi.string().required(),
    bookingTime : Joi.object({
        startTime:Joi.string().required(),
        endTime:Joi.string().required(),
    }),
    totalPrice : Joi.number().strict().required(),
    serviceType : Joi.string().required(),
    countryCode : Joi.string().required()
})


const studioBooking = (req,res,next)=>{
    const {error}=studioBookingSchems.validate(req.body)
    if(error){
        logger.error(error,"Error Accured during validating service booking schema")
        return res.status(200).json({status:false, message:error.details[0].message})
    }
    next()
}







module.exports = {serviceBooking, studioBooking}