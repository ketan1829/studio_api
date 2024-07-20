const Joi = require("joi");

const userRegisterSchema = Joi.object({
    phoneNumber:Joi.string().required(),
    fullName:Joi.string().required(),
    dateOfBirth:Joi.string().required(),
    deviceId:Joi.string().required(),
    email:Joi.string().required(),
    userType:Joi.string().required(),
    role:Joi.string().required(),
})

const userRegister = (req,res,next) =>{
    const {error} = userRegisterSchema.validate(req.body)
    if(error){
        return res.status(200).json({
            status:false,
            Message:error.details[0].message
        })
    }
    next()
}


const userUpdateSchema = Joi.object({
    fullName:Joi.string(),
    dateOfBirth:Joi.string(),
    profileUrl:Joi.string(),
    gender:Joi.string()
})


const userUpdate = (req,res,next) =>{
    const {error} = userUpdateSchema.validate(req.body)
    if(error){
        return res.status(200).json({
            status:false,
            Message:error.details[0].message
        })
    }
    next()
}



module.exports = {userRegister, userUpdate}