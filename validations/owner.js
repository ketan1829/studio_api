const Joi = require('joi')

const ownerCreateSchema = Joi.object({
    firstName:Joi.string().required(),
    lastName:Joi.string().required(),
    email:Joi.string().required(),
    password:Joi.string().required(),
    studioId:Joi.string().required(),
    phone:Joi.string().required(),
}).unknown(true)


const ownerCreate = (req,res,next)=>{
    let {error} = ownerCreateSchema.validate(req.body)
    if(error){
        return res.status(200).json({status:false,message:error.details[0].message})
    }
    next()
}

const ownerUpdateSchema = Joi.object({
    firstName:Joi.string(),
    lastName:Joi.string(),
    email:Joi.string(),
    password:Joi.string(),
    studioId:Joi.string(),
    phone:Joi.string(),
}).unknown(true)


const ownerUpdate = (req,res,next)=>{
    let {error} = ownerUpdateSchema.validate(req.body)
    if(error){
        return res.status(200).json({status:false,message:error.details[0].message})
    }
    next()
}


module.exports = {ownerCreate,ownerUpdate}