const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class Booking
{
    constructor(userId,studioId,roomId,bookingDate,bookingTime,totalPrice,bookingStatus, serviceType, countryCode)
    {
        this.userId = userId;
        this.studioId = studioId;
        this.roomId = roomId;
        this.bookingDate = bookingDate;
        this.bookingTime = bookingTime;
        this.totalPrice = totalPrice;
        this.bookingStatus = bookingStatus;   // 0-> Active, 1-> Completed, 2-> Cancelled
        this.creationTimeStamp = new Date();
        this.type = serviceType || "c1";
        this.countryCode = countryCode || "IN";

    }

    save()
    {
        const db = getDb();
        return db.collection('bookings').insertOne(this);
    }

    static aggregate(aggregatePipeline)
    {
        const db = getDb();
        return db.collection('bookings').aggregate(aggregatePipeline).toArray();
    }
    static AggregateForServiceData(aggregate_Pipeline)
    {
        const db = getDb();
        return db.collection('bookings').aggregate(aggregate_Pipeline).toArray();
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

    static findBooking(serviceDatafilter) {

        const db = getDb();
        try {
            return db.collection('bookings').find(serviceDatafilter).limit(1).toArray()
            .then(bookingData=>{
                // console.log("bookingData:", bookingData);
                return bookingData;
            })
            .catch(err=>console.log(err));
        } catch (error) {
            console.error('Error finding service by ID:', error);
            throw error;
        }
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
        return db.collection('bookings').find({bookingStatus:bType,type:"c1"}).sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(bookingData=>{
                // console.log("------bookingsData:::", bookingData[0]);
                return bookingData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllBookings(skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('bookings').find().sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(bookingData=>{
                console.log(bookingData);
                return bookingData;
            })
            .catch(err=>console.log(err));
    }

    static async fetchAllBookingsCount(bType) {
        try {
            const db = getDb();
            const bookingCount = await db.collection('bookings').countDocuments({ bookingStatus: parseInt(bType) });
            return bookingCount;
        } catch (err) {
            throw new Error(`Error fetching bookings count: ${err}`);
        }
    }

    static fetchFilteredAndSortedBookings(filters, sort, skipCount, limitCount) {
        const db = getDb();
        return db.collection('bookings')
            .find(filters)
            .sort(sort)
            .skip(skipCount)
            .limit(limitCount)
            .toArray()
            .then(bookingData => {
                console.log("fetchFilteredAndSortedBookings---", bookingData[0])
                return bookingData;
            })
            .catch(err => console.error(err));
    }

    static fetchUserEventBookings(userId,offerId,offerCode)
    {
        const db = getDb();
        return db.collection('bookings').find({offerId,userId,offerCode,discountType:2}).toArray()
            .then(bookingData=>{
                return bookingData;
            }).catch(err=>{
                return [];
        });
    }

    // static async fetchAllBookingByAggregate() {
    //     try {
    //         const db = getDb();
    //         const bookingData = await db.collection('bookings').aggregate([{$match:{}}]).toArray();
    //         return bookingData;
    //     } catch (err) {
    //         console.error("Error in fetchAllBookingByAggregate:", err);
    //         throw err; 
    //     }
    // }

}


module.exports = Booking;
