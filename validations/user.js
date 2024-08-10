const Joi = require("joi");

const userRegisterSchema = Joi.object({
    phoneNumber:Joi.string().required(),
    fullName:Joi.string().required(),
    dateOfBirth:Joi.string().required(),
    deviceId:Joi.string().required(),
    email:Joi.string().required(),
    userType:Joi.string().required(),
    role:Joi.string().required(),
}).unknown(true)

const userRegister = (req,res,next) =>{
    if((req.body.version || req.query.version) > "2.2.7"){
        const {error} = userRegisterSchema.validate(req.body)
        if(error){
            return res.status(200).json({
                status:false,
                Message:error.details[0].message
            })
        }
        next()
    }else{
        next()
    }

}


const userUpdateSchema = Joi.object({
    fullName:Joi.string(),
    dateOfBirth:Joi.string(),
    profileUrl:Joi.string(),
    gender:Joi.string()
}).unknown(true)


const userUpdate = (req,res,next) =>{
    if(req.body.version || req.params.version ==="2.3.8") next()
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