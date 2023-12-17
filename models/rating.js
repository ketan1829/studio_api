const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class Rating
{
    constructor(bookingId,userId,studioId,rateInfo,reviewMsg,reviewImage)
    {
        this.bookingId = bookingId;
        this.userId = userId;
        this.studioId = studioId;
        this.rateInfo = rateInfo;          // Object like  {service:4, studio :3.5, amenities:4, location : 3}
        this.reviewMsg = reviewMsg;
        this.reviewImage = reviewImage;
        this.creationTimeStamp = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection('ratings').insertOne(this);
    }

    static findRatingById(rId)
    {
        var o_id = new ObjectId(rId);
        const db = getDb();

        return db.collection('ratings').findOne({_id:o_id})
            .then(ratingData=>{
                return ratingData;
            })
            .catch(err=>console.log(err));
    }

    static findRatingByBookingIdAndUserId(bId,uId)
    {
        const db = getDb();

        return db.collection('ratings').findOne({ bookingId:bId, userId:uId })
            .then(ratingData=>{
                return ratingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllRatingsByStudioId(sId)
    {
        const db = getDb();

        return db.collection('ratings').find({ studioId:sId }).sort({creationTimeStamp:-1}).toArray()
            .then(ratingData=>{
                return ratingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllRatingsByUserId(uId)
    {
        const db = getDb();
        return db.collection('ratings').find({userId:uId}).sort({creationTimeStamp:-1}).toArray()
            .then(ratingData=>{
                return ratingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllRatings(skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('ratings').find().sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(ratingData=>{
                return ratingData;
            })
            .catch(err=>console.log(err));
    }

}


module.exports = Rating;
