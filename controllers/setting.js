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
const {paginate} = require('../util/plugins/paginate.plugin');
const { logger } = require('../util/logger');
// const calculateMinPrice = require("./studio.js")



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


exports.calAndSaveMinPriceOfStduio = async(req,res)=>{
try {
    let db = getDb()
    let studios = await db.collection("studios").find().toArray()

    studios.forEach(async(studio)=>{
        // console.log("roomsDetails",studio.roomsDetails)
        minStudioPrice = calculateMinPrice(studio.roomsDetails);
        await db.collection("studios").updateOne({ _id: studio._id }, { $set: {minPrice:minStudioPrice} });
        // console.log(minPrice);
    })
    res.json({status:true,message:"All Studio Udated Successfully"})
} catch (error) {
    logger.error("Error while calculating and storing price of each studio")
    console.log(error);
}
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
    let { settingId, startingPrice, offerings, TotalServices, avgReview, serviceId, active } = req.body;
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

    Setting.getBanner(active).then((banners)=>{
        return res.json({status:true, message:`banner returned`,banners});
    })
    
}

exports.createBanner = async (req, res) => {
    try {
        let db = getDb();
        // mandatory => id, stage, banner_redirect, active, photoURL
        const { stage, name, photoURL, active, type, banner_redirect, entity_id, forr, redirectURL } = req.body;
        const id = new ObjectId().toString();
        let obj = {
            id,
            stage,
            name,
            photoURL,
            active,
            type,
            banner_redirect,
            entity_id,
            for: forr,
            redirectURL
        };
        obj = checks(obj, banner_redirect, redirectURL, forr, entity_id);

        let {_id, banner} = await db.collection("settings").findOne({ type: "home_screen" });
        console.log("banner.length", banner.length);

        if(banner.length <5){
            return res.status(200).json({
                status:false,
                message:"You can not add more than 4 Banners"
            })
        }

        let existingBanner = banner.find(b => b.stage === stage);
        if (existingBanner) {
            let newStage = banner.length + 1;
            await db.collection("settings").updateOne(
                { _id, "banner.id": existingBanner.id },
                {
                    $set: { "banner.$.stage": newStage }
                }
            );
        }

        let result = await db.collection("settings").updateOne(
            { _id },
            {
                $push: {
                    banner: obj
                }
            }
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({ status:true, message: "Banner created successfully" });
        } else {
            res.status(400).json({ status:false, message: "Failed to create banner" });
        }
    } catch (error) {
        logger.error(error, "Error while creating banner");
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.editBanner = async (req, res) => {

    try {
        let db = getDb();
        const { id, stage, name, photoURL, active, type, banner_redirect, entity_id, forr, redirectURL } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Missing banner id" });
        }

        let objectOfBanner = {
            id,
            stage,
            name,
            photoURL,
            active,
            type,
            banner_redirect,
            entity_id,
            for: forr,
            redirectURL
        };

        objectOfBanner = checks(objectOfBanner, banner_redirect, redirectURL, forr, entity_id);

        let { _id, banner } = await db.collection("settings").findOne({ type: "home_screen" });
        if(!_id){
            return res.status(200).json({ status:false, message: "Missing banner id" });
        }


        let existingBanner = banner.find(b => b.stage === stage);
        if (existingBanner) {

            let currentBanner = banner.find(b => b.id === id);

            if (currentBanner) {
                await db.collection("settings").updateOne(
                    { _id, "banner.id": existingBanner.id },
                    { $set: { "banner.$.stage": currentBanner.stage } }
                );

                await db.collection("settings").updateOne(
                    { _id, "banner.id": currentBanner.id },
                    { $set: { "banner.$.stage": existingBanner.stage } }
                );

                await db.collection("settings").updateOne(
                    { _id, "banner.id": id },
                    {
                        $set: {
                            "banner.$.name": objectOfBanner.name,
                            "banner.$.photoURL": objectOfBanner.photoURL,
                            "banner.$.active": objectOfBanner.active,
                            "banner.$.type": objectOfBanner.type,
                            "banner.$.banner_redirect": objectOfBanner.banner_redirect,
                            "banner.$.entity_id": objectOfBanner.entity_id,
                            "banner.$.for": objectOfBanner.for,
                            "banner.$.redirectURL": objectOfBanner.redirectURL
                        }
                    }
                );
            } else {
                return res.status(400).json({ message: "Banner with the given id does not exist" });
            }
        } else {
            await db.collection("settings").updateOne(
                { _id, "banner.id": id },
                {
                    $set: {
                        "banner.$.stage": objectOfBanner.stage,
                        "banner.$.name": objectOfBanner.name,
                        "banner.$.photoURL": objectOfBanner.photoURL,
                        "banner.$.active": objectOfBanner.active,
                        "banner.$.type": objectOfBanner.type,
                        "banner.$.banner_redirect": objectOfBanner.banner_redirect,
                        "banner.$.entity_id": objectOfBanner.entity_id,
                        "banner.$.for": objectOfBanner.for,
                        "banner.$.redirectURL": objectOfBanner.redirectURL
                    }
                }
            );
        }

        return res.status(200).json({ message: "Banner updated successfully" });
    } catch (error) {
        logger.error(error, "Error while updating banner");
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};




let checks = (obj, banner_redirect, redirectURL, forr, entity_id) => {
    if (banner_redirect === "external") {
        if (redirectURL) {
            obj.entity_id = "";
            obj.for = "";
        }
    } else {
        if (forr === "page") {
            if (entity_id) {
                obj.redirectURL = "";
            }
        }
    }
    return obj;
};

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
exports.addCountryFieldInStudios = (async(req,res)=>{
    try {
       let db = getDb();
        await db.collection('studios').updateMany({},{$set:{country:"IN"}})
       res.send({
         status: "success",
         message: "Country field added successfully in Studios",
       });
    } catch (error) {
      console.log(error);
    }
})


exports.countryCodeBeforPhoneNo = async (req, res) => {
    try {
        let db = getDb();
        let result = await db.collection('users').find({}).toArray();
        
        for (let item of result) {
            let appendedPhone = "91" + item.phone;
            let phone = { phone: appendedPhone };
            await db.collection('users').updateOne({ _id: item._id }, { $set: phone });
        }

        result = await db.collection('users').find({}).toArray();

        res.json({ users: result });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }    
};


exports.onBoarding = async(req,res) =>{
    try {
        let db = getDb()
        let data = await db.collection("settings").findOne({ type: "onboarding" }, { projection: { _id: 0, type: 0 } })
        res.status(200).json(data)
    } catch (error) {
        logger.error(error,"Error occured while Onboarding")
        console.log(error);
    }
}


const calculateMinPrice = (roomsDetails) => {
    if (!roomsDetails.length) {
      throw new Error('No rooms details provided');
    }

    let minRoom = roomsDetails[0];

    roomsDetails.forEach((room) => {
      if (room.pricePerHour < minRoom.pricePerHour) {
        minRoom = room;
      }
    });

    return {
        price: minRoom.pricePerHour,
        basePrice: minRoom.basePrice,
        discountPercentage:minRoom.discountPercentage
    };
  };