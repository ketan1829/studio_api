const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class Notifications
{
    constructor(userId,title,message)
    {
        this.userId = userId;
        this.title = title;
        this.message = message; 
        this.notificationDate = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection('notifications').insertOne(this);                              
    }

    static findNotificationByNotificationId(id)
    {
        var o_id = new ObjectId(id);
        const db = getDb();
                            
        return db.collection('notifications').findOne({_id:o_id})
            .then(notiData=>{
                return notiData;
            })
            .catch(err=>console.log(err));
    }
    
    static findNotificationsByUserId(uid)
    {
        const db = getDb();
                            
        return db.collection('notifications').find({ userId:uid}).sort({notificationDate:-1}).toArray()
                .then(notiData => {
                    return notiData;
                })
                .catch(err => console.log(err));

    }

    static fetchAllNotifications()
    {
        const db = getDb();
        return db.collection('notifications').find().sort({notificationDate:-1}).toArray()
                .then(notiData => {
                    return notiData;
                })
                .catch(err => console.log(err));
    }

}


module.exports = Notifications;

