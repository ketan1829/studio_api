const Joi = require("joi")
const { logger } = require("../util/logger")


const bannerCreateSchema = Joi.object({
    stage:Joi.number().strict().required(),
    name:Joi.string().required(),
    photoURL:Joi.string().required(),
    active:Joi.number().strict().required(),
    type:Joi.string().required(),
    redirect_url:Joi.string().required(),
    redirectURL:Joi.string().required(),
    banner_redirect:Joi.string(),
    entity_id:Joi.string(),
    forr:Joi.string()
})

const bannerCreate = (req,res,next)=>{
    // const url = req.url;
    // const initSchema = bannerCreateSchema;
    // if(url.includes("editBanner")){
    //     initSchema.id = Joi.string().required()
    // }
   
    const {error} = bannerCreateSchema.validate(req.body)
    if(error){
        logger.error(error,"Error occured during validating creation of banner.")
        return res.status(200).json({status:false, message:error.details[0].message})
    }
    next()
}

const bannerSchema = Joi.object({

    id:Joi.string().required(),
    stage:Joi.number().strict(),
    name:Joi.string(),
    photoURL:Joi.string(),
    active:Joi.number().strict(),
    type:Joi.string(),
    redirect_url:Joi.string(),
    redirectURL:Joi.string(),
    banner_redirect:Joi.string(),
    entity_id:Joi.string(),
    forr:Joi.string()
})

const bannerUpdate = (req,res,next)=>{

   
    const {error} = bannerSchema.validate(req.body)
    if(error){
        logger.error(error,"Error occured during validating creation of banner.")
        return res.status(200).json({status:false, message:error.details[0].message})
    }
    next()
}

module.exports = {bannerCreate,bannerUpdate}


