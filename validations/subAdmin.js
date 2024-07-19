const Joi = require("joi");

const subAdminCreateSchema = Joi.object({
    firstName:Joi.string().required(),
    lastName:Joi.string().required(),
    email:Joi.string().required(),
    password:Joi.string().required(),
    permissions:Joi.array().items().min(1).required(),
    phone:Joi.string().required(),
})

const subAdminCreate = (req,res,next) =>{
    const {error} = subAdminCreateSchema.validate(req.body)
    if(error){
        return res.status(200).json({
            status:false,
            Message:error.details[0].message
        })
    }
    next()
}

const subAdminUpdateSchema = Joi.object({
    firstName:Joi.string(),
    lastName:Joi.string(),
    email:Joi.string(),
    password:Joi.string(),
    permissions:Joi.array().items(),
    phone:Joi.string(),
})

const subAdminUpdate = (req,res,next) =>{
    const {error} = subAdminUpdateSchema.validate(req.body)
    if(error){
        return res.status(200).json({
            status:false,
            Message:error.details[0].message
        })
    }
    next()
}

module.exports = {subAdminCreate,subAdminUpdate}