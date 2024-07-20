const Joi = require("joi");

const adminCreateSchema = Joi.object({
    firstName:Joi.string().required(),
    lastName:Joi.string().required(),
    email:Joi.string().required(),
    password:Joi.string().required(),
    phone:Joi.string().required(),
})



const adminCreate = (req,res,next) =>{
    const {error} = adminCreateSchema.validate(req.body)
    if(error){
        return res.status(200).json({
            status:false,
            Message:error.details[0].message
        })
    }
    next()
}

const adminUpdateSchema = Joi.object({
    firstName:Joi.string().required(),
    lastName:Joi.string().required(),
    email:Joi.string().required(),
    password:Joi.string().required(),
    phone:Joi.string(),
})



const adminUpdate = (req,res,next) =>{
    const {error} = adminUpdateSchema.validate(req.body)
    if(error){
        return res.status(200).json({
            status:false,
            Message:error.details[0].message
        })
    }
    next()
}

module.exports = {adminCreate,adminUpdate}