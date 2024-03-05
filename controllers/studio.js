const Studio = require('../models/studio');
const Rating = require('../models/rating');
const User = require('../models/user');

const axios = require('axios');

const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 
const pick = require('../util/pick')
const ObjectId = mongodb.ObjectId;

let Country = require('country-state-city').Country;
let State = require('country-state-city').State;

const jwt = require('jsonwebtoken');

var GeoPoint = require('geopoint');
const GOOGLE_MAP_KEY = process.env.GOOGLE_MAP_KEY;



function getReviewersName(ratingList,_callback)
{
    let mappedRatings = [];
    ratingList.forEach(async singleRating=>{
        singleRating.reviewerName = "";
        let userData = await User.findUserByUserId(singleRating.userId);
        if(userData!=null)
        {
            singleRating.reviewerName = userData.fullName;
        }
        mappedRatings.push(singleRating);
        if(mappedRatings.length==ratingList.length)
        {
            return _callback(mappedRatings);
        }
    })
}

function offersMapping(allStudios,_callback)
{
    let mappedStudios = [];
    if(allStudios.length==0)
    {
        return _callback([]);
    }
    else{
        let studiosData = allStudios.map(i=>{
            //**For now, map to dummy values**
            // console.log(i.roomsDetails);
            i.discountValue = (i.roomsDetails.length!=0)? parseFloat(i.roomsDetails[0].discountPercentage):0;
            i.offerPercentage = 0;
            mappedStudios.push(i);
            if(mappedStudios.length==allStudios.length)
            {
                return _callback(mappedStudios);
            }
        })
    }
}

function filterNearbySudios(studioData, latitude, longitude, page, limit, range) {
    try {
        // console.log("studioData::::", studioData);
        const point1 = new GeoPoint(+latitude, +longitude);
        const availableStudios = [];
        for (let i = 0; i < studioData.length; i++) {
            const point2 = new GeoPoint(+studioData[i].latitude, +studioData[i].longitude);
            const distance = point1.distanceTo(point2, true);
            if (distance <= range) {
                availableStudios.push({ ...studioData[i], distance: distance.toFixed(2) });
            }
        }
        
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedStudios = availableStudios.slice(startIndex, endIndex);

        paginatedStudios.sort((a, b) => a.distance - b.distance);

        const totalPages = Math.ceil(availableStudios.length / limit);

        console.log(`Page ${page} of ${totalPages} - ${paginatedStudios.length} studios returned`);
        return {
            message: `Page ${page} of ${totalPages} - ${paginatedStudios.length} studios returned`,
            paginate: {
                page: page,
                limit: parseInt(limit),
                totalResults: availableStudios.length,
                totalPages: totalPages,
            },
            studios: paginatedStudios
            // {
            //     nearYou: paginatedStudios,
            //     page: page,
            //     limit: limit,
            //     totalResults: availableStudios.length,
            //     totalPages: totalPages,
            //     topRated: [],
            //     forYou: []
            // }
        };
    } catch (exception) {
        console.log("Exception Occurred:", exception);
        return { status: false, message: "Invalid Latitude" };
    }
}

// ----------------- v2.2.3 ---------------------------

exports.getStudios = (req,res,next)=>{

    console.log("body---", req.body);
    const { city, state, minArea, minPricePerHour, amenity, availabilityDay, latitude, longitude, range, active, studioId } = req.body;
    const filter = pick(req.query, ['name', 'role']) || { isActive: 1 }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    
    // const filter = { isActive: 1 };

    if (active) filter.isActive = active;
    if (studioId) {
        var o_id = new ObjectId(studioId);
        filter._id =o_id
    }
    if (city) filter.city = city;
    if (state) filter.state = state;
    if (minArea) filter['area'] = { $gte: parseInt(minArea) };
    if (minPricePerHour) filter['roomsDetails.basePrice'] = { $gte: parseInt(minPricePerHour) };
    if (amenity) filter['amenities.name'] = amenity;
    if (availabilityDay) {
        filter['roomsDetails.generalStartTime'] = availabilityDay.startTime; 
        filter['roomsDetails.generalEndTime'] = availabilityDay.endTime;
    }
    // const options = {
    //     sortBy, // Sort criteria
    //     limit, // Limit per page
    //     page, // Page number
    //     populate, // Fields to populate
    // };

    if (latitude && longitude) {

        Studio.fetchAllStudios(0,0)
        .then(studioData=>{
            const paginatedStudios = filterNearbySudios(studioData, latitude, longitude, options.page || 1, options.limit  || 10, range ? range : 10);
            return res.json({status:true, message:paginatedStudios.message,nearYou:paginatedStudios.studios, paginate:paginatedStudios.paginate});
        })
        
    }else {

    Studio.paginate(filter, options).then(studioData=>{

        return res.json({status:true, message:"All studios returned",studios:studioData});
    })
}
    
}

exports.getStudiosOptimized = (req, res, next) => {
    console.log("body---", req.body);
    const { city, state, minArea, minPricePerHour, amenity, availabilityDay, latitude, longitude, range, active, studioId } = req.body;
    const filter = pick(req.query, ['name', 'role']) || { isActive: 1 }
    const options = pick(req.query, ['sort', 'limit', 'page']);
    
    // const filter = { isActive: 1 };

    if (active) filter.isActive = active;
    if (studioId) {
        var o_id = new ObjectId(studioId);
        filter._id =o_id
    }
    if (city) filter.city = city;
    if (state) filter.state = state;
    if (minArea) filter['area'] = { $gte: parseInt(minArea) };
    if (minPricePerHour) filter['roomsDetails.basePrice'] = { $gte: parseInt(minPricePerHour) };
    if (amenity) filter['amenities.name'] = amenity;
    if (availabilityDay) {
        filter['roomsDetails.generalStartTime'] = availabilityDay.startTime; 
        filter['roomsDetails.generalEndTime'] = availabilityDay.endTime;
    }
    if (latitude && longitude){
        filter.latitude = latitude;
        filter.longitude = longitude;
    }

    const StudPipeline = []

    StudPipeline.push({ $skip: options.page });
    StudPipeline.push({ $limit: options.limit });
    StudPipeline.push({
        $match: { filter }
    });
    StudPipeline.push({
        $sort:  options.sort
    });
    StudPipeline.push({
        $sort:  options.sort
    });

}

// ----------------- END v2.2.3 ---------------------------

exports.getAllNearStudios = (req,res,next)=>{

    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const range = 100;

    Studio.fetchAllActiveStudios(0,0).then(studiosData=>{
        //get offers mapping
        offersMapping(studiosData,(resData)=>{
            // console.log(resData);
            studiosData = resData;
            if(studiosData.length==0)
            {
                return res.status(404).json({status:false, message:"No studio exist",nearYou:[]});
            }
            else{
                if(latitude==undefined || latitude.length==0)
                {
                    return res.status(400).json({status:false, message:"Enter valid latitude and longitude",nearYou:[],topRated:[],forYou:[]});  
                }
                else{
                    // console.log("Non-default filter");
                    try{
                        var point1 = new GeoPoint(+latitude,+longitude);
                        var availableStudios = [];
                        for(var i = 0;i<studiosData.length;i++)
                        {
                            // console.log(studiosData[i].latitude,studiosData[i].longitude);
                            var point2 = new GeoPoint(+studiosData[i].latitude,+studiosData[i].longitude);
                            var distance = point1.distanceTo(point2, true)  //output in kilometers
                            // console.log("Distance:",distance.toFixed(2));
                            
                            if(distance<=range)
                            {
                                availableStudios.push({...studiosData[i],distance:distance.toFixed(2)});
                            }
                            //Remove duplicates
                            availableStudios = availableStudios.filter((value, index) => {
                                const _value = JSON.stringify(value);
                                return index === availableStudios.findIndex(obj => {
                                  return JSON.stringify(obj) === _value;
                                });
                            });
    
                            if(i == studiosData.length-1)
                            {
                                // Sort Based on distance
                                availableStudios.sort((a,b)=> a.distance - b.distance);
                                // let allNearStudios = availableStudios.slice(0, 4);//Note that the slice function on arrays returns a shallow copy of the array, and does not modify the original array
                                return res.json({
                                    status:true,
                                    message:"All "+availableStudios.length+" studios returned",nearYou:availableStudios,
                                    topRated:[],forYou:[]
                                });
                            }
                        };
                    }
                    catch(exception)
                    {
                        // return;  //Return statement is used for BREAKING the for loop
                        console.log("Exception Occured : ",exception);
                        return res.json({status:false, message:"Geopoint Exception Occured....Invalid Latitude", error:exception});                
                    }
                }
            }
        })
    })
}


// exports.createNewStudio = async(req,res,next)=>{
    
//     const fullName = req.body.fullName.trim();
//     const address = req.body.address;
//     const mapLink = req.body.mapLink;
//     const city = req.body.city;
//     const state = req.body.state;
//     const area = parseFloat(req.body.area);
//     const pincode = req.body.pincode;
//     const pricePerHour = parseFloat(req.body.pricePerHour);
//     const availabilities = req.body.availabilities;
//     const amenities = req.body.amenities;
//     const totalRooms = +req.body.totalRooms;
//     const roomsDetails = req.body.roomsDetails;
//     const maxGuests = req.body.maxGuests;
//     const studioPhotos = req.body.studioPhotos;
//     const aboutUs = req.body.aboutUs;
//     const teamDetails = req.body.teamDetails;
//     const clientPhotos = req.body.clientPhotos;
//     const reviews = {};
//     const featuredReviews = [];

//      axios.get("https://www.mapquestapi.com/geocoding/v1/address?key="+mapQuestKey+"&location="+address)
//     .then(function (response) {
//         // console.log(response.data.results[0].locations[0]);
//         // res.json({location:response.data.results[0].locations[0]})
//         if(response.data.results[0].locations[0].postalCode.length==0)
//         {
//             return res.json({status:false, message:"Enter valid address for studio"});
//         }
//         else{
//             let latitude = response.data.results[0].locations[0].latLng.lat.toString();
//             let longitude = response.data.results[0].locations[0].latLng.lng.toString();
//             const studioObj = new Studio(fullName,address,latitude,longitude,mapLink,city,state,area,pincode,pricePerHour,availabilities,amenities,totalRooms,roomsDetails,
//                                 maxGuests,studioPhotos,aboutUs,teamDetails,clientPhotos,reviews,featuredReviews,1);
           
//            // saving in database
//             return studioObj.save()
//             .then(resultData=>{
//                 return res.json({status:true,message:"Studio created successfully",studio:resultData["ops"][0]});
//             })
//             .catch(err=>console.log(err));
//         }
//     })

// }

exports.createNewStudio = async (req, res, next) => {

    const fullName = req.body.fullName.trim();
    let address = req.body.address;
    const mapLink = req.body.mapLink;
    const city = req.body.city;
    const state = req.body.state;
    const area = parseFloat(req.body.area);
    const pincode = req.body.pincode;
    const pricePerHour = parseFloat(req.body.pricePerHour);
    const availabilities = req.body.availabilities;
    const amenities = req.body.amenities;
    const totalRooms = +req.body.totalRooms;
    const roomsDetails = req.body.roomsDetails;
    const maxGuests = req.body.maxGuests;
    const studioPhotos = req.body.studioPhotos;
    const aboutUs = req.body.aboutUs;
    const teamDetails = req.body.teamDetails;
    const clientPhotos = req.body.clientPhotos;
    const reviews = {};
    const featuredReviews = [];


    try {

        address = address.replace("&","and")

        console.log("https://maps.googleapis.com/maps/api/geocode/json?address="+address+"&key="+GOOGLE_MAP_KEY);
        axios.get("https://maps.googleapis.com/maps/api/geocode/json?address="+address+"&key="+GOOGLE_MAP_KEY)
            .then(function (response) {
                // console.log(response.data.results[0].locations[0]);
                // res.json({location:response.data.results[0].locations[0]})
                // const res_data = response.data?.features[0]?.properties;
                const res_data = response.data?.results[0].geometry.location
                if (!res_data) {
                    return res.json({ status: false, message: "Enter valid address for studio" });
                }
                else {
                    let latitude = res_data.lat.toString();
                    let longitude = res_data.lng.toString();

                    console.log(latitude,longitude)

                    const studioObj = new Studio(fullName, address, latitude, longitude, mapLink, city, state, area, pincode, pricePerHour, availabilities, amenities, totalRooms, roomsDetails,
                        maxGuests, studioPhotos, aboutUs, teamDetails, clientPhotos, reviews, featuredReviews, 1);

                    // saving in database
                    return studioObj.save()
                        .then(resultData => {
                            return res.json({ status: true, message: "Studio created successfully", studio: resultData["ops"][0] });
                        })
                        .catch(err => console.log(err));
                }
            })

    } catch (error) {

        return res.json({ status: false, message: "Address Lat Long failed! :( contact Dev. NR" });


    }



}


exports.getParticularStudioDetails = (req,res,next)=>{

    const studioId = req.params.studioId;

    Studio.findStudioById(studioId)
    .then(studioData=>{
        if(!studioData)
        {
            return res.status(404).json({status:false, message:"No Studio with this ID exists"});
        }
        studioData.reviews = {};
        Rating.fetchAllRatingsByStudioId(studioId)
        .then(ratingsData=>{
            if(ratingsData.length==0)
            {
                studioData.reviews.avgService = 0;
                studioData.reviews.avgStudio = 0;
                studioData.reviews.avgAmenity = 0;
                studioData.reviews.avgLocation = 0;
                studioData.reviews.overallAvgRating = 0;
                studioData.reviews.reviewCategory = "Poor";
                return res.json({status:true, message:"Studio Exists",studio:studioData});
            }
            else{
                let rCount = ratingsData.length;
                console.log("Ratings exists : "+rCount);
                let serviceCount = 0;
                let studioRatingCount = 0;
                let amenityRatingCount = 0;
                let locationRatingCount = 0;
                getReviewersName(ratingsData,(resRatingData)=>{
                    
                    resRatingData.forEach(singleRating=>{
                        studioData.clientPhotos.push(...singleRating.reviewImage);
                        
                        let featuredSingleAvgRating = parseFloat(singleRating.rateInfo.service) + parseFloat(singleRating.rateInfo.studio) + 
                                                        parseFloat(singleRating.rateInfo.amenities) + parseFloat(singleRating.rateInfo.location);
                        singleRating.avgRatingFeatured = (featuredSingleAvgRating/4).toFixed(1);
                        studioData.featuredReviews.push(singleRating);

                        serviceCount += parseFloat(singleRating.rateInfo.service);
                        studioRatingCount += parseFloat(singleRating.rateInfo.studio);
                        amenityRatingCount += parseFloat(singleRating.rateInfo.amenities);
                        locationRatingCount += parseFloat(singleRating.rateInfo.location);

                    });
                    studioData.reviews.avgService = parseFloat((serviceCount/rCount).toFixed(1));
                    studioData.reviews.avgStudio = parseFloat((studioRatingCount/rCount).toFixed(1));
                    studioData.reviews.avgAmenity = parseFloat((amenityRatingCount/rCount).toFixed(1));
                    studioData.reviews.avgLocation = parseFloat((locationRatingCount/rCount).toFixed(1));
    
                    let overallAvgRating = parseFloat(studioData.reviews.avgService) + parseFloat(studioData.reviews.avgStudio) + parseFloat(studioData.reviews.avgAmenity) + parseFloat(studioData.reviews.avgLocation);
                    console.log(overallAvgRating);
                    studioData.reviews.overallAvgRating = parseFloat((overallAvgRating/4).toFixed(1));
                    studioData.reviews.reviewCategory = "Excellent";
    
                    //Send only first 4 reviews in "featuredReviews"
                    // studioData.featuredReviews = studioData.featuredReviews.slice(0,4);          
                    //Send only first 4 photos in "clientPhotos"
                    // studioData.clientPhotos = studioData.clientPhotos.slice(0,4);      
                    return res.json({status:true, message:"Studio Exists",studio:studioData});
                });
            }
        })
    })
    
}


exports.toggleStudioActiveStatus = (req,res,next)=>{

    const studioId = req.params.studioId;

    Studio.findStudioById(studioId)
    .then(studioData=>{
        if(!studioData)
        {
            return res.status(404).json({status:false, message:"No Studio with this ID exists"});
        }
        studioData.isActive = (studioData.isActive==0)?1:0;

        const db = getDb();
        var o_id = new ObjectId(studioId);

        db.collection('studios').updateOne({_id:o_id},{$set:studioData})
        .then(resultData=>{
            return res.json({ status:true, message:'Studio updated successfully', studio:studioData});
        })
        .catch(err=>console.log(err));
    })
}


exports.getDashboardStudios = (req,res,next)=>{

    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const localities = req.body.localities;          // Array of Strings
    let budget = parseFloat(req.body.budget);
    const amenities = req.body.amenities;        // Array of Objects
    let rooms = +req.body.rooms;
    let area = parseFloat(req.body.area);
    let person = +req.body.person;
    const range = 100;
    const relevance = +req.body.relevance;  // 1-> rating(high to low), 2-> cost(low to high), 3-> cost(high to low)

    Studio.fetchAllActiveStudios(0,0)
    .then(studiosData=>{
        console.log("Studios COunt : "+studiosData.length);
        //get offers mapping
        offersMapping(studiosData,(resData)=>{
            // console.log(resData);
            studiosData = resData;
            if(studiosData.length==0)
            {
                console.log("availableStudios1:");
                return res.status(404).json({status:false, message:"No studio exist",nearYou:[],topRated:[],forYou:[]});
            }
            else{
                if(latitude==undefined || latitude.length==0){
                    console.log("Default filter");
                    var availableStudios = [];
                    for(var i = 0;i<studiosData.length;i++){                    
                        //Checking for localities
                        let index = 1;
                        if(localities!=undefined)
                        {
                            index = localities.findIndex(f=>f.trim().toLowerCase()==studiosData[i].city.trim().toLowerCase());
                        }
                        if(localities==undefined || localities.length==0)  //this means localities not selected for filter and we need to skip it
                        {
                            index = 1;
                        }
                        console.log("Index : ",index);

                        //Checking for amenities
                        let matchedAmenities = [];
                        if(amenities!=undefined)
                        {
                            matchedAmenities = amenities.filter(f=>{
                                const indexAmenity = studiosData[i].amenities.findIndex(s=>s.id.toString()==f.id.toString() ||
                                                                                 s.name.trim().toLowerCase() == f.name.trim().toLowerCase());
                                // console.log("Index : ",indexAmenity);
                                if(indexAmenity!=-1)
                                {
                                    return true;
                                }
                                else{
                                    return false;
                                }
                            });
                        }
                        let matchCount = matchedAmenities.length;
                        if(amenities==undefined ||  amenities.length==0)    //this means amenties not selected for filter and we need to skip it
                        {
                            matchCount = 1;
                        }
                        console.log("Match amenities : ",matchCount);

                        let budget1 = budget;
                        console.log("Budget : ",budget);
                        if(isNaN(budget))  //this means budget not selected for filter and we need to skip it
                        {
                            // budget = parseFloat(studiosData[i].pricePerHour);
                            budget = parseFloat(studiosData[i].roomsDetails[0].pricePerHour);
                        }

                        let area1 = area;
                        if(isNaN(area))  //this means budget not selected for filter and we need to skip it
                        {
                            area = parseFloat(studiosData[i].area);
                        }
                         
                        let person1 = person;
                        console.log("Person : ",person);
                        if(isNaN(person))  //this means person not selected for filter and we need to skip it
                        {
                            person = parseFloat(studiosData[i].maxGuests);
                        }

                        let rooms1 = rooms;
                        console.log("Rooms : ",rooms);
                        if(isNaN(rooms))  //this means person not selected for filter and we need to skip it
                        {
                            rooms = parseFloat(studiosData[i].totalRooms);
                        }
                        
                        //for Price comparison
                        studiosData[i].roomsDetails.forEach(singleRoom=>{
                            if((singleRoom.pricePerHour)<=budget)
                            {
                                availableStudios.push({...studiosData[i]});
                            }
                        });

                        if(index!=-1 && matchCount!=0 && +studiosData[i].totalRooms>=rooms
                            && parseFloat(studiosData[i].area)>=area && +studiosData[i].maxGuests>=person)
                        {
                            availableStudios.push({...studiosData[i]});
                        }
                        
                        //Remove duplicates
                        availableStudios = availableStudios.filter((value, index) => {
                            const _value = JSON.stringify(value);
                            return index === availableStudios.findIndex(obj => {
                                return JSON.stringify(obj) === _value;
                            });
                        });

                        if(i == studiosData.length-1){
                            availableStudios = availableStudios.map(i=>{
                                if(i.overallAvgRating==undefined)
                                {
                                    i.overallAvgRating = 0;
                                }
                                return i;
                            });
                            //Sorting based on relevance
                            if(relevance==1)
                            {
                                //Sort on basis of rating
                                availableStudios.sort((a,b)=> b.overallAvgRating - a.overallAvgRating);
                            }
                            else if(relevance==2){
                                // Sort Based on cost (low to high)
                                availableStudios.sort((a,b)=> a.roomsDetails[0].pricePerHour - b.roomsDetails[0].pricePerHour);
                            }
                            else if(relevance==3){
                                // Sort Based on cost (high to low)
                                availableStudios.sort((a,b)=> b.roomsDetails[0].pricePerHour - a.roomsDetails[0].pricePerHour);
                            }
                            else{
                                // Sort Based on distance
                                availableStudios.sort((a,b)=> a.distance - b.distance);
                            }
                            console.log("availableStudios2:");
                    
                            return res.json({status:true, message:"All "+availableStudios.length+" studios returned",nearYou:[],topRated:[],forYou:availableStudios});
                        }
                        budget = budget1;
                        area = area1;
                        rooms = rooms1;
                        person = person1;
                    };
                }
                else{
                    console.log("Non-default filter");
                    try{
                        var point1 = new GeoPoint(+latitude,+longitude);
                        var availableStudios = [];
                        for(var i = 0;i<studiosData.length;i++)
                        {
                            // console.log(studiosData[i].latitude,studiosData[i].longitude);
                            var point2 = new GeoPoint(+studiosData[i].latitude,+studiosData[i].longitude);
                            var distance = point1.distanceTo(point2, true)  //output in kilometers
                            studiosData[i].distance = distance.toFixed(2);
                            console.log("Distance:",distance.toFixed(2));
                            
                            //Checking for localities
                            let index = 1;
                            if(localities!=undefined)
                            {
                                index = localities.findIndex(f=>f.trim().toLowerCase()==studiosData[i].city.trim().toLowerCase());
                            }
                            if(localities==undefined || localities.length==0)  //this means localities not selected for filter and we need to skip it
                            {
                                index = 1;
                            }
                            console.log("Index : ",index);
    
                            //Checking for amenities
                            let matchedAmenities = [];
                            if(amenities!=undefined)
                            {
                                studiosData[i].matchedAmenities = amenities.filter(f=>{
                                    const indexAmenity = studiosData[i].amenities.findIndex(s=>s.name.trim().toLowerCase() == f.name.trim().toLowerCase());
                                    // console.log("Index Amenity: ",indexAmenity);
                                    if(indexAmenity!=-1)
                                    {
                                        studiosData[i].amenityMatch = true;
                                        return true;
                                    }
                                    else{
                                        studiosData[i].amenityMatch = false;
                                        return false;
                                    }
                                });
                            }
                            let matchCount = matchedAmenities.length;
                            if(amenities==undefined ||  amenities.length==0)    //this means amenties not selected for filter and we need to skip it
                            {
                                matchCount = 1;
                            }
                            console.log("Match amenities : ",matchCount);
    
                            let budget1 = budget;
                            console.log("Budget : ",budget);
                            // if(isNaN(budget))  //this means budget not selected for filter and we need to skip it
                            // {
                                // budget = parseFloat(studiosData[i].pricePerHour);
                                // budget = parseFloat(studiosData[i].roomsDetails[0].pricePerHour);
                            // }
    
                            let area1 = area;
                            if(isNaN(area))  //this means budget not selected for filter and we need to skip it
                            {
                                area = parseFloat(studiosData[i].area);
                            }
                             
                            let person1 = person;
                            // console.log("Person : ",person);
                            if(isNaN(person))  //this means person not selected for filter and we need to skip it
                            {
                                person = parseFloat(studiosData[i].maxGuests);
                            }

                            let rooms1 = rooms;
                            // console.log("Rooms : ",rooms);
                            if(isNaN(rooms))  //this means person not selected for filter and we need to skip it
                            {
                                rooms = parseFloat(studiosData[i].roomsDetails.length);
                            }
                    
                            //for Price comparison
                            if(!isNaN(budget))
                            {
                                studiosData[i].roomsDetails.forEach(singleRoom=>{
                                    if((singleRoom.pricePerHour)<=budget)
                                    {
                                        console.log(studiosData[i]._id);
                                        if(index!=-1)
                                        {
                                            if(parseFloat(studiosData[i].area)>=area && +studiosData[i].roomsDetails.length>=rooms && +studiosData[i].maxGuests>=person)
                                            {
                                                availableStudios.push({...studiosData[i], validPriceRange:true});
                                            }
                                        }
                                    }
                                });
                            }
                            else{
                                if(index!=-1)
                                {
                                    if(parseFloat(studiosData[i].area)>=area && +studiosData[i].roomsDetails.length>=rooms && +studiosData[i].maxGuests>=person)
                                    {
                                        availableStudios.push({...studiosData[i], validPriceRange:true});
                                    }
                                }
                            }

                            console.log(parseFloat(studiosData[i].pricePerHour),budget )
                            if(distance<=range)
                            {
                                if(parseFloat(studiosData[i].area)>=area  && +studiosData[i].roomsDetails.length>=rooms && +studiosData[i].maxGuests>=person)
                                {
                                    availableStudios.push({...studiosData[i],distance:distance.toFixed(2)});
                                }
                            }
                            
                            if(!isNaN(area) && !isNaN(rooms) && !isNaN(person))
                            {
                                if(index!=-1 && matchCount!=0 && +studiosData[i].roomsDetails.length>=rooms && 
                                    parseFloat(studiosData[i].area)>=area && +studiosData[i].maxGuests>=person)
                                {
                                    availableStudios.push({...studiosData[i],distance:distance.toFixed(2)});
                                }
                            }
                            else{
                                availableStudios.push({...studiosData[i],distance:distance.toFixed(2)});
                            }
    
                            if(i == studiosData.length-1)
                            {
                                availableStudios = availableStudios.map(i=>{
                                    if(i.overallAvgRating==undefined)
                                    {
                                        i.overallAvgRating = 0;
                                    }
                                    return i;
                                });
                                //Sorting based on relevance
                                if(relevance==1)
                                {
                                    //Sort on basis of rating
                                    availableStudios.sort((a,b)=> b.overallAvgRating - a.overallAvgRating);
                                }
                                else if(relevance==2){
                                    // Sort Based on cost (low to high)
                                    availableStudios.sort((a,b)=> a.roomsDetails[0].pricePerHour - b.roomsDetails[0].pricePerHour);
                                }
                                else if(relevance==3){
                                    // Sort Based on cost (high to low)
                                    availableStudios.sort((a,b)=> b.roomsDetails[0].pricePerHour - a.roomsDetails[0].pricePerHour);
                                }
                                else{
                                    // Sort Based on distance
                                    availableStudios.sort((a,b)=> a.distance - b.distance);
                                }
    
                                // Remove duplicates
                                availableStudios = availableStudios.filter((value, index) => {
                                    const _value = JSON.stringify(value);
                                    return index === availableStudios.findIndex(obj => {
                                        // console.log(obj.fullName, JSON.parse(_value).fullName);
                                        // return JSON.stringify(obj) === _value;
                                        return obj._id.toString() === JSON.parse(_value)._id.toString();
                                    });
                                });
                                availableStudios = availableStudios.filter(i=>{
                                    return (i.validPriceRange==true);
                                });
                                if(amenities!=undefined && amenities.length!=0)
                                { 
                                    availableStudios = availableStudios.filter(i=>{
                                        return (i.matchedAmenities.length!=0);
                                    });
                                }

                                let allStudiosForNear = availableStudios.filter(i=>parseFloat(i.distance)<=range);

                                let allNearStudios = allStudiosForNear.slice(0, 4);//Note that the slice function on arrays returns a shallow copy of the array, and does not modify the original array
                                // allNearStudios = allNearStudios.filter(i=>i.distance!=undefined);
                                console.log("availableStudios3:");
                                return res.json({
                                    status:true,
                                    message:"All "+availableStudios.length+" studios returned",
                                    nearYou:allNearStudios,topRated:[],forYou:availableStudios
                                });
                            }
                            budget = budget1;
                            area = area1;
                            rooms = rooms1;
                            person = person1;
                        };
                    }
                    catch(exception)
                    {
                        // return;  //Return statement is used for BREAKING the for loop
                        console.log("Exception Occured : ",exception);
                        console.log("availableStudios4:");
                        return res.json({status:false, message:"Geopoint Exception Occured....Invalid Latitude", error:exception});                
                    }
                }
            }
        })
    })

}


exports.getAllStudios = (req,res,next)=>{

    let skip = +req.query.skip;
    let limit = +req.query.limit;

    if(isNaN(skip))
    {
        skip = 0;
        limit = 0;
    }

    Studio.fetchAllStudios(skip,limit)
    .then(studioData=>{
        return res.json({status:true, message:"All studios returned",studios:studioData});
    })

}


exports.editStudioDetails = (req,res,next)=>{

    const studioId = req.params.studioId;

    const fullName = req.body.fullName.trim();
    const address = req.body.address;
    const mapLink = req.body.mapLink;
    const city = req.body.city;
    const state = req.body.state;
    const area = parseFloat(req.body.area);
    const pincode = req.body.pincode;
    const amenities = req.body.amenities;
    const totalRooms = +req.body.totalRooms;
    const roomsDetails = req.body.roomsDetails;
    const maxGuests = req.body.maxGuests;
    const studioPhotos = req.body.studioPhotos;
    const aboutUs = req.body.aboutUs;
    const teamDetails = req.body.teamDetails;

    Studio.findStudioById(studioId)
    .then(studioData=>{
        if(!studioData)
        {
            return res.status(404).json({status:false, message:"No Studio with this ID exists"});
        }
        studioData.fullName = fullName;
        studioData.address = address;
        studioData.mapLink = mapLink;
        studioData.city = city;
        studioData.state = state;
        studioData.area = area;
        studioData.pincode = pincode;
        studioData.amenities = amenities;
        studioData.totalRooms = totalRooms;
        studioData.roomsDetails = roomsDetails;
        studioData.maxGuests = maxGuests;
        studioData.studioPhotos = studioPhotos;
        studioData.aboutUs = aboutUs;
        studioData.teamDetails = teamDetails;

        const db = getDb();
        var o_id = new ObjectId(studioId);

        db.collection('studios').updateOne({_id:o_id},{$set:studioData})
        .then(resultData=>{
            return res.json({ status:true, message:'Studio details updated successfully', studio:studioData});
        })
        .catch(err=>console.log(err));
    })

}


exports.getStudiosByDate = (req,res,next)=>{

    let creationDate = req.body.creationDate;

    //get creationDate from timestamp
    creationDate = new Date(creationDate);
    var yr = creationDate.getUTCFullYear();
    var mth = creationDate.getUTCMonth() + 1;
    if(mth.toString().length==1)
    {
        mth = "0"+mth.toString();
    }
    var dt = creationDate.getUTCDate();
    if(dt.toString().length==1)
    {
        dt = "0"+dt.toString();
    }
    creationDate = yr+"-"+mth+"-"+dt;
    var sTimeStamp = new Date(creationDate).getTime();
    console.log("Creation Date : ",creationDate);
    
    Studio.fetchStudiosByDate(creationDate)
    .then(studioData=>{
        return res.json({status:true, message:"All studio(s) returned",studios:studioData});
    })

}

exports.getStudiosFiltersData = async (req,res) => {

    const my_lat = 19.132753831903493
    const my_lang = 72.91828181534228
    const {state,offset,per_page} = req.body
    const dbdata = await Studio.fetchStudioLocationDetails(state,offset,per_page)
    return res.json({ status:true,data:{
        "data":dbdata
    }});


}

exports.getAllStudiosGraphDetails = (req,res,next)=>{

    var today = new Date();
    // var today = new Date();
    var d;
    var months = [];
    var d = new Date();
    var month;
    var year = d.getFullYear();
    // console.log(year)

    //for last 6 months(including current month)
    // for(var i = 5; i > -1; i -= 1) {
    var keyData = 1;
    //for last 6 months(excluding current month)
    for(var i = 6; i > 0; i -= 1) {
      d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    //   console.log(d.getFullYear())
   
      months.push({month:d.getMonth(),year:d.getFullYear(),key:keyData,studioCount:0});
      keyData = keyData+1;
    }
    console.log(months);
    
    Studio.fetchAllStudios(0,0)
    .then(studiosData=>{
        studiosData.forEach(singleStudio=>{
            var dt1 = new Date(singleStudio.creationTimeStamp);
            var monthOnly = dt1.getMonth();
            
            months.forEach(mth=>{
               
                if((+mth.month)==(+monthOnly)){
                    mth.studioCount = mth.studioCount + 1;
                }
            })
        })

        setTimeout(()=>{
            months.forEach(mthData=>{
                if(mthData.month==0)
                {
                    mthData.month = "January"
                }
                if(mthData.month==1)
                {
                    mthData.month = "Febuary"
                }
                if(mthData.month==2)
                {
                    mthData.month = "March"
                }
                if(mthData.month==3)
                {
                    mthData.month = "April"
                }
                if(mthData.month==4)
                {
                    mthData.month = "May"
                }
                if(mthData.month==5)
                {
                    mthData.month = "June"
                }
                if(mthData.month==6)
                {
                    mthData.month = "July"
                }
                if(mthData.month==7)
                {
                    mthData.month = "August"
                }
                if(mthData.month==8)
                {
                    mthData.month = "September"
                }
                if(mthData.month==9)
                {
                    mthData.month = "Ocober"
                }
                if(mthData.month==10)
                {
                    mthData.month = "November"
                }
                if(mthData.month==11)
                {
                    mthData.month = "December"
                }
            });

            months.sort((a, b) => {
                return a.key - b.key;
            });

            //retrieving only months
            var allMonths = [];
            months.forEach(m=>{
                allMonths.push(m.month);
            });

            //retrieving only studioCounts
            var allStudioCounts = [];
            months.forEach(m=>{
                allStudioCounts.push(m.studioCount);
            });
            res.json({status:true,message:"All data returned",allMonths:allMonths,allStudioCounts:allStudioCounts,allData:months});
        },1000);
    })

}
