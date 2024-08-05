const Joi = require('joi');

const serviceCreateSchema = Joi.object({
    service_id:Joi.number().integer().required(),
    serviceName:Joi.string().required(),
    startingPrice:Joi.number().integer().strict().required(),
    offerings:Joi.array().min(1).required(),
    TotalServices:Joi.number().strict().required(),
    packages:Joi.array().items(Joi.object({
        planId:Joi.number().strict().required(),
        name:Joi.string().required(),
        about:Joi.string().required(),
        photo_url:Joi.array().items().min(1).required(),
        price:Joi.number().integer().strict().required(),
        amenites:Joi.array().items(Joi.object({
            name:Joi.string().required(),
            id:Joi.number().strict().required()
        })).min(1).required(),
        pricing:Joi.object({
            USA:Joi.object({
                price:Joi.number().integer().strict().required(),
                basePrice:Joi.number().integer().strict().required(),
                discountPercentage:Joi.number().integer().strict().required(),
            }),
            IN:Joi.object({
                price:Joi.number().integer().strict().required(),
                basePrice:Joi.number().integer().strict().required(),
                discountPercentage:Joi.number().integer().strict().required(),
            }),
            JP:Joi.object({
                price:Joi.number().integer().strict().required(),
                basePrice:Joi.number().integer().strict().required(),
                discountPercentage:Joi.number().integer().strict().required(),
            }),
        }),
        // planId:Joi.string().required(),
    })).min(1).required(),
    ServicePhotos:Joi.array().items().min(1).required(),
    description:Joi.string().required(),
    workDetails:Joi.array().items(Joi.object({
        imgUrl:Joi.string().required(),
        name:Joi.string().required(),
        designation:Joi.string().required(),
        id:Joi.number().strict(),
    })),
    portfolio:Joi.array().required(),
    userReviews:Joi.object(),
    starredReviews:Joi.array(),
    userPhotos:Joi.array(),
    type:Joi.string().required(),
    isActive:Joi.number().strict().required(),
    // discography:Joi.string().required(),
    // userPhotos:Joi.string().required(),
    // starredReviews:Joi.string().required(),
    // discographyDetails:Joi.string().required(),
    // clientPhotos:Joi.string().required(),
    // featuredReviews:Joi.string().required(),
}).unknown(true)

const serviceCreate = (req,res,next) =>{
    const {error} = serviceCreateSchema.validate(req.body)
    if(error){
        return res.status(200).json({
            status:false,
            Message:error.details[0].message
        })
    }
    next()
}

const serviceUpdateSchema = Joi.object({
    service_id:Joi.number().integer(),
    serviceName:Joi.string(),
    startingPrice:Joi.number().integer().strict(),
    offerings:Joi.array(),
    TotalServices:Joi.number().strict(),
    packages:Joi.array().items(Joi.object({
        planId:Joi.number().strict(),
        name:Joi.string(),
        about:Joi.string(),
        photo_url:Joi.array().items(),
        price:Joi.number().integer().strict(),
        amenites:Joi.array().items(Joi.object({
            name:Joi.string(),
            id:Joi.number().strict()
        })),
        pricing:Joi.object({
            USA:Joi.object({
                price:Joi.number().integer().strict(),
                basePrice:Joi.number().integer().strict(),
                discountPercentage:Joi.number().integer().strict(),
            }),
            IN:Joi.object({
                price:Joi.number().integer().strict(),
                basePrice:Joi.number().integer().strict(),
                discountPercentage:Joi.number().integer().strict(),
            }),
            JP:Joi.object({
                price:Joi.number().integer().strict(),
                basePrice:Joi.number().integer().strict(),
                discountPercentage:Joi.number().integer().strict(),
            }),
        }),
    })),
    ServicePhotos:Joi.array().items(),
    description:Joi.string(),
    workDetails:Joi.array().items(Joi.object({
        imgUrl:Joi.string(),
        name:Joi.string(),
        designation:Joi.string(),
        id:Joi.number().strict(),
    })),
    portfolio:Joi.array(),
    userReviews:Joi.object(),
    starredReviews:Joi.array(),
    userPhotos:Joi.array(),
    type:Joi.string(),
    isActive:Joi.number().strict(),
}).unknown(true)

const serviceUpdate = (req,res,next) =>{
    const {error} = serviceUpdateSchema.validate(req.body)
    if(error){
        return res.status(200).json({
            status:false,
            Message:error.details[0].message
        })
    }
    next()
}


module.exports = {serviceCreate,serviceUpdate}