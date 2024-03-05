const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class AdminNotifications
{
    constructor(userId,studioId,bookingId,title,message)
    {
        this.userId = userId;
        this.studioId = studioId;
        this.bookingId = bookingId;
        this.title = title;
        this.message = message;
        this.notificationDate = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection('adminNotifications').insertOne(this);                              
    }

    static findAdminNotificationByNotificationId(id)
    {
        var o_id = new ObjectId(id);
        const db = getDb();
        
        return db.collection('adminNotifications').findOne({_id:o_id})
            .then(notiData=>{
                return notiData;
            })
            .catch(err=>console.log(err));
    }

    static findAdminNotificationsByUserId(uid)
    {
        const db = getDb();
        return db.collection('adminNotifications').find({userId:uid}).sort({notificationDate:-1}).toArray()
                .then(notiData => {
                    return notiData;
                })
                .catch(err => console.log(err));
    }

    static findAdminNotificationsByStudioId(sid)
    {
        const db = getDb();
        return db.collection('adminNotifications').find({studioId:sid}).sort({notificationDate:-1}).toArray()
                .then(notiData => {
                    return notiData;
                })
                .catch(err => console.log(err));
    }

    static fetchAllAdminNotifications()
    {
        const db = getDb();
        return db.collection('adminNotifications').find().sort({notificationDate:-1}).toArray()
                .then(notiData => {
                    return notiData;
                })
                .catch(err => console.log(err));
    }

}


module.exports = AdminNotifications;
