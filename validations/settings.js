const Joi = require("joi")
const { logger } = require("../util/logger")


const bannerSchema = Joi.object({

    id:Joi.string(),
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

const banner = (req,res,next)=>{
    const url = req.url;
    const initSchema = bannerSchema;
    if(url.includes("editBanner")){
        initSchema.id = Joi.string().required()
    }
   
    const {error} = bannerSchema.validate(req.body)
    if(error){
        logger.error(error,"Error occured during validating creation of banner.")
        return res.status(200).json({status:false, message:error.details[0].message})
    }
    next()
}

module.exports = {banner}


