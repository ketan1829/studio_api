const Rating = require('../models/rating');
const Studio = require('../models/studio');
const User = require('../models/user');
const Booking = require('../models/booking');

const mongodb = require('mongodb');
const getDb = require('../util/database').getDB;
const ObjectId = mongodb.ObjectId;

const jwt = require('jsonwebtoken');


exports.postNewRating = async (req, res, next) => {

    let bookingId = req.body.bookingId;
    const userId = req.body.userId;
    const studioId = req.body.studioId;
    const rateInfo = req.body.rateInfo;
    const reviewMsg = req.body.reviewMsg;
    const reviewImage = req.body.reviewImage;

    if(bookingId==undefined || bookingId==null || bookingId=="")
    {
        return res.status(400).json({status:false, message:"Enter valid bookingID"});
    }

    User.findUserByUserId(userId)
    .then(userData=>{
        if (!userData) {
            return res.status(404).json({ status: false, message: "No User with this ID exists" });
        }
        Studio.findStudioById(studioId)
        .then(studioData => {
            if (!studioData) {
                return res.status(404).json({ status: false, message: "No studio with this ID exists" });
            }
            Rating.findRatingByBookingIdAndUserId(bookingId,userId)
            .then(bookingData=>{
                if (bookingData) {
                    return res.status(409).json({ status: false, message: "Booking already rated" });
                }
                const ratingObj = new Rating(bookingId,userId,studioId,rateInfo,reviewMsg,reviewImage);

                //saving in database
                return ratingObj.save()
                .then(resultData => {
                    //Update overallAvgRating in Studio Schema also
                    Rating.fetchAllRatingsByStudioId(studioId)
                    .then(ratingsData=>{
                        let overallAvgRating = 0;
                        if(ratingsData.length!=0)
                        {
                            let rCount = ratingsData.length;
                            let serviceCount = 0;
                            let studioRatingCount = 0;
                            let amenityRatingCount = 0;
                            let locationRatingCount = 0;
                                
                            ratingsData.forEach(singleRating=>{
                                
                                let featuredSingleAvgRating = parseFloat(singleRating.rateInfo.service) + parseFloat(singleRating.rateInfo.studio) + 
                                                                parseFloat(singleRating.rateInfo.amenities) + parseFloat(singleRating.rateInfo.location);
                                singleRating.avgRatingFeatured = (featuredSingleAvgRating/4).toFixed(1);

                                serviceCount += parseFloat(singleRating.rateInfo.service);
                                studioRatingCount += parseFloat(singleRating.rateInfo.studio);
                                amenityRatingCount += parseFloat(singleRating.rateInfo.amenities);
                                locationRatingCount += parseFloat(singleRating.rateInfo.location);
                            });
                            studioData.reviews.avgService = parseFloat((serviceCount/rCount).toFixed(1));
                            studioData.reviews.avgStudio = parseFloat((studioRatingCount/rCount).toFixed(1));
                            studioData.reviews.avgAmenity = parseFloat((amenityRatingCount/rCount).toFixed(1));
                            studioData.reviews.avgLocation = parseFloat((locationRatingCount/rCount).toFixed(1));
            
                            overallAvgRating = parseFloat(studioData.reviews.avgService) + parseFloat(studioData.reviews.avgStudio) + parseFloat(studioData.reviews.avgAmenity) + parseFloat(studioData.reviews.avgLocation);
                            overallAvgRating = parseFloat((overallAvgRating/4).toFixed(1));
                            console.log(overallAvgRating);
                            // studioData.reviews.overallAvgRating = parseFloat((overallAvgRating/4).toFixed(1));
                        }
                        studioData.overallAvgRating = overallAvgRating;

                        const db = getDb();
                        var o_id = new ObjectId(studioId);                
                        db.collection('studios').updateOne({_id:o_id},{$set:studioData})
                        .then(resultData1=>{
                            return res.json({ status: true, message: "Rating saved successfully", rating: resultData["ops"][0] });
                        })
                        .catch(err=>console.log(err));
                    })
                })
                .catch(err => console.log(err));
            })
        })
    })

}
