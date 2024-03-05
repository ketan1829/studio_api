const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class ServieBooking
{
    constructor(userId,serviceId,planId,bookingDate,bookingTime,totalPrice,bookingStatus,serviceType)
    {
        this.userId = userId;
        this.serviceId = serviceId;
        this.planId = parseInt(planId);
        this.bookingDate = bookingDate;
        this.bookingTime = bookingTime;
        this.totalPrice = totalPrice;
        this.bookingStatus = parseInt(bookingStatus);   // 0-> Active, 1-> Completed, 2-> Cancelled
        this.creationTimeStamp = new Date();
        this.type = serviceType || "c2";
    }

    save()
    {
        const db = getDb();
        return db.collection('bookings').insertOne(this);
    }
}

module.exports = ServieBooking