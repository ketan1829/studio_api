const AdminNotifications = require('../models/adminNotifications');
const User = require('../models/user');
const Studio = require('../models/studio');

const getDb = require('../util/database').getDB; 
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;


exports.getAllNotifications = (req,res,next)=>{

    AdminNotifications.fetchAllAdminNotifications()
    .then(notiData=>{
        let mappedNotifications = [];
        if(notiData.length==0)
        {
            return res.json({status:true, message:"All notifications returned",notifications:notiData});
        }
        let allNotifications = notiData.map(async singleNotification=>{
            singleNotification.userData = await User.findUserByUserId(singleNotification.userId);
            singleNotification.studioData = await Studio.findStudioById(singleNotification.studioId);
            mappedNotifications.push(singleNotification);
            if(mappedNotifications.length==notiData.length)
            {
                return res.json({status:true, message:"All notifications returned",notifications:notiData});
            }
        });
    })
}


exports.getAllNotificationsForParticularStudio = (req,res,next)=>{

    const studioId = req.params.studioId;

    AdminNotifications.findAdminNotificationsByStudioId(studioId)
    .then(notiData=>{
        let mappedNotifications = [];
        if(notiData.length==0)
        {
            return res.json({status:true, message:"All notifications returned",notifications:notiData});
        }
        let allNotifications = notiData.map(async singleNotification=>{
            singleNotification.userData = await User.findUserByUserId(singleNotification.userId);
            singleNotification.studioData = await Studio.findStudioById(singleNotification.studioId);
            mappedNotifications.push(singleNotification);
            if(mappedNotifications.length==notiData.length)
            {
                return res.json({status:true, message:"All notifications returned",notifications:notiData});
            }
        });
    })
}


exports.deleteParticularNotification = (req,res,next)=>{

    const notificationId = req.params.notificationId;

    AdminNotifications.findAdminNotificationByNotificationId(notificationId)
    .then(notificationData=>{
        if(!notificationData)
        {
            return res.status(404).json({status:false, message:"No notification with this ID exists"});
        }
        const db = getDb();
        var o_id = new ObjectId(notificationId);

        db.collection('adminNotifications').deleteOne({_id:o_id})
        .then(resultData=>{
            return res.json({ status:true, message:'Notification deleted successfully'});
        })
        .catch(err=>console.log(err));
    })

}
