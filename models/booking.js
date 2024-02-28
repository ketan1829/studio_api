const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class Booking
{
    constructor(userId,studioId,roomId,bookingDate,bookingTime,totalPrice,bookingStatus)
    {
        this.userId = userId;
        this.studioId = studioId;
        this.roomId = roomId;
        this.bookingDate = bookingDate;
        this.bookingTime = bookingTime;
        this.totalPrice = totalPrice;
        this.bookingStatus = bookingStatus;   // 0-> Active, 1-> Completed, 2-> Cancelled
        this.creationTimeStamp = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection('bookings').insertOne(this);
    }

    static findBookingById(bId)
    {
        var o_id = new ObjectId(bId);
        const db = getDb();

        return db.collection('bookings').findOne({_id:o_id})
            .then(bookingData=>{
                return bookingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchBookingsByStudioIdAndBookingDate(sId,bDate)
    {
        const db = getDb();
                            
        return db.collection('bookings').find({ studioId:sId, bookingDate:{$gte:bDate+"T00:00:00", $lt:bDate+"T23:59:59"} ,bookingStatus: {$in: [0,1] } }).sort({creationTimeStamp:1}).toArray()
            .then(bookingData=>{
                return bookingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchBookingsByBookingDateRange(sDate,eDate)
    {
        const db = getDb();
        
        return db.collection('bookings').find({"creationTimeStamp":{$gte:new Date(sDate+"T00:00:00"), $lt:new Date(eDate+"T23:59:59")} }).sort({creationTimeStamp:1}).toArray()
            .then(bookingData=>{
                return bookingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllBookingsByUserId(uId)
    {
        const db = getDb();
        return db.collection('bookings').find({userId:uId}).sort({creationTimeStamp:-1}).toArray()
            .then(bookingData=>{
                return bookingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllBookingsByStudioId(sId,skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('bookings').find({studioId:sId}).sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(bookingData=>{
                return bookingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllBookingsByType(skipCount,limitCount,bType)
    {
        const db = getDb();
        return db.collection('bookings').find({bookingStatus:bType}).sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(bookingData=>{
                return bookingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllBookings(skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('bookings').find().sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(bookingData=>{
                return bookingData;
            })
            .catch(err=>console.log(err));
    }

}


module.exports = Booking;
