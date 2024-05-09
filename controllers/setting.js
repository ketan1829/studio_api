const axios = require('axios');
const mongodb = require('mongodb');
const jwt = require('jsonwebtoken');

// configs
const { homeScreen } = require('../config/settings');

// models
const Setting = require('../models/setting');
const User = require('../models/user');

// utils
const { validateService, validateFilterSchema } = require('../util/validations');
const getDb = require('../util/database').getDB; 
const pick = require('../util/pick')
const {paginate} = require('../util/plugins/paginate.plugin')


const ObjectId = mongodb.ObjectId;



exports.addPricingInServicePackage = async(req, res)=>{

    try {
        const db = getDb();
        const services = await db.collection('services').find().toArray();

        console.log(">>>>>>>>>>",services.length);
        for (const service of services) {
            const arr = []
            for (const package of service.packages) {
                package.pricing = {
                    "USA": {
                        "price":package.price,
                        "basePrice": package.price,
                        "discountPercentage": 10
                    },"IN": {
                        "price":package.price,
                        "basePrice": package.price,
                        "discountPercentage": 10
                    },"JP": {
                        "price": package.price,
                        "basePrice": package.price,
                        "discountPercentage": 10
                    },
            }
            arr.push(package)
            }
            // Update service document with modified packages
            await  db.collection('services').updateOne(
                { _id: service._id },
                { $set: { packages: arr } }
            );
        }
        console.log("Pricing details updated for all packages");
}catch (err) {
    console.error("Error updating pricing details:", err);
}
res.send({status:true, message:"Pricing details updated successfully"})
}

// exports.addPricingInService = async(req, res)=>{
//     try {
//         const db = getDb();
//         const services = await db.collection('services').find().toArray();

//         services.map(item => (
//             item.pricing = {
//                 "USA": {
//                     "basePrice": item.price,
//                 },
//                 "IN": {
//                     "basePrice": item.price,
//                 },
//                 "JP": {
//                     "basePrice": item.price,
//                 }
//             }))
//         console.log("Pricing details updated for all packages");
// }catch (err) {
//     console.error("Error updating pricing details:", err);
// }
// res.send({status:true, message:"Pricing details updated successfully"})
// }

exports.getBanner = (req,res,next)=>{

    // console.log("body---", req.body);
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

exports.deleteDuplicateUserWhileCheckingPreviousUser = async (req, res, next) => {

    const chunk_users = await User.fetchAllUsersFromDate2("2024-04-01", "2024-04-02")
    // res.send({data:chunk_users})

    let user_phones = []

    chunk_users.forEach(async user => {
        const is_object = typeof (user.fullName)
        if (is_object === "object") {

            console.log("new op started =====");

            if (user.fullName.fullName) {
                // check user exist with number
                if (user.fullName.phone) {

                    console.log("phone exitttttt");

                    let userbyphone = await User.findUsersByPhone(user.fullName.phone)


                    if(Array.isArray(userbyphone) && userbyphone.length){

                        console.log("Deleting Unstruct duplicated USER");
                        // delete object record
                        User.deleteUserPermanent(user._id)
                      
                    }else{
                        console.log("NOT AN ARRAY or MT array");
                        console.log("TestUser unstruct updated coz user found");
                        // make data to the root level of user document

                        if(!user_phones.includes(user.fullName.phone)){

                            const fullname  = user.fullName.fullName
                            user = { ...user, ...user.fullName }
                            user.fullName = fullname
                            user_phones.push(user.phone)
                            await User.update_object(user._id, user)

                        }else{
                            console.log("Deleting redundant record from table",user.fullName.phone);
                            // delete duplicate object record
                            User.deleteUserPermanent(user._id)
                        }
                        
                    }

                }else{
                    console.log("phone not exittttttt");
                }
            } else {
                console.log("TestUser unstruct blank data updated");
                // delete the record
                User.deleteUserPermanent(user._id);
            }

        } else {
            console.log("NOt AN Object");
        }
        console.log("==== op ended =====");
    })
    res.send({ ack: "OKKKK" })
}


exports.addCountryCodeInBookings = (async(req,res)=>{
    try {
       let db = getDb();
        await db.collection('bookings').updateMany({},{$set:{countryCode:"IN"}})
       res.send({
         status: "success",
         message: "Country code added successfully"
       });
    } catch (error) {
      console.log(error);
    }
})




