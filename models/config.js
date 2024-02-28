const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;



class Config
{
    constructor()
    {

        this.creationTimeStamp = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection(collectionName).insertOne(this);
    }

    static updateAllDoc(collectionName, dataToUpdate) {
        const db = getDb();
        // const userToUpdate = { phone: phoneNumber };
        // const updateData = {
        //     $set: {
        //         deviceId: tempData.deviceId,
        //     }
        // };
        return db.collection(collectionName).updateMany({}, {$set: dataToUpdate})
    }

}

module.exports = Config;
