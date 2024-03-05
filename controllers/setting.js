const axios = require('axios');
const mongodb = require('mongodb');
const jwt = require('jsonwebtoken');

// configs
const { homeScreen } = require('../config/settings');

// models
const Setting = require('../models/setting');

// utils
const { validateService, validateFilterSchema } = require('../util/validations');
const getDb = require('../util/database').getDB; 
const pick = require('../util/pick')
const {paginate} = require('../util/plugins/paginate.plugin')


const ObjectId = mongodb.ObjectId;


exports.getBanner = (req,res,next)=>{

    console.log("body---", req.body);
    const { settingId, startingPrice, offerings, TotalServices, avgReview, serviceId, active } = req.body;
    const filter = pick(req.query, ['name', 'role']) || { active: 1 }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    
    // const filter = { isActive: 1 };

    if (active) filter.isActive = active;
    if (settingId) {
        var o_id = new ObjectId(settingId);
        filter._id =o_id
    }
    if (startingPrice) filter.price = startingPrice;
    if (TotalServices) filter.totalPlans = TotalServices;
    if (avgReview) filter.featuredReviews.avgService = parseFloat(avgReview);

    // const { error } = validateFilterSchema(filter);
    // if (error) {
    //     return res.status(400).json({ status: false, message: error.details[0].message });
    // }

    Setting.getBanner(active).then((BannerData)=>{
        return res.json({status:true, message:`banner returned`,banners:BannerData});
    })
    
}

exports.getCategory = (req,res,next)=>{

    console.log("query---", req.query);
    const { active } = req.query;
    const filter = pick(req.query, ['name', 'role']) || { active: 1 }
    
    if (active) filter.active = active;

    Setting.getCategory(1).then((CategoryData)=>{
        console.log(CategoryData);
        return res.json({status:true, message:`category returned`,categories:CategoryData});
    })
    
}
