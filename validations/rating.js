const Joi = require("joi");

const ratingSchema = Joi.object({
    bookingId:Joi.string(),
    userId:Joi.string(),
    studioId:Joi.string(),
    rateInfo:Joi.object({
        service:Joi.number().strict().required(),
        studio:Joi.number().strict().required(),
        amenities:Joi.number().strict().required(),
        location:Joi.number().strict().required(),
    }),
    reviewMsg:Joi.string().required(),
    reviewImage:Joi.array(),
}).unknown(true)



const rating = (req,res,next) =>{
    const {error} = ratingSchema.validate(req.body)
    if(error){
        return res.status(200).json({
            status:false,
            Message:error.details[0].message
        })
    }
    next()
}

module.exports = {rating}