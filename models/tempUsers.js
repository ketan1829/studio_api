const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

const collectionName = 'tempUsers'

class TempUser
{
    constructor(phone,userType,deviceId,role)
    {
        this.phone = phone;
        this.userType = userType;
        this.deviceId = deviceId;
        this.role = role;
        this.creationTimeStamp = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection(collectionName).insertOne(this);
    }

    static update(phoneNumber, newData) {
        const db = getDb();
        const userToUpdate = { phone: phoneNumber };
        const updateData = {
            $set: newData
        };
        return db.collection(collectionName).updateOne(userToUpdate, updateData);
    }

    static findUserByUserId(uId)
    {
        console.log("uID-------->",uId);

        var o_id = new ObjectId(uId);
        const db = getDb();

        return db.collection(collectionName).findOne({_id:o_id})
            .then(userData=>{
                return userData;  
            })
            .catch(err=>console.log(err));
    }
  
    static findUserByDeviceId(deviceId)
    {
        const db = getDb();
                            
        return db.collection(collectionName).findOne({ deviceId:deviceId })
            .then(userData=>{
                return userData;  
            })
            .catch(err=>console.log(err));
    }

    static findUserByPhone(phone)
    {
        const db = getDb();
                            
        return db.collection(collectionName).findOne({ phone:phone })
            .then(userData=>{
                return userData;  
            })
            .catch(err=>console.log(err));
    }

    static fetchAllUsers(skipCount,limitCount)
    {
        const db = getDb();
        return db.collection(collectionName).find().sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(userData=>{
                return userData;
            })
            .catch(err=>console.log(err));
    }

    static update(phoneNumber, tempData) {
        const db = getDb();
        const userToUpdate = { phone: phoneNumber };
        const updateData = {
            $set: {
                deviceId: tempData.deviceId,
            }
        };
        return db.collection(collectionName).updateOne(userToUpdate, updateData);
    }

}


module.exports = TempUser;
