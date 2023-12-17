const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class Owner
{
    constructor(firstName,lastName,email,password,studioId,ownerImage)
    {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.studioId = studioId;
        this.ownerImage = ownerImage;
        this.creationTimeStamp = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection('owners').insertOne(this);
    }

    static findOwnerByOwnerId(oId)
    {
        const db = getDb();
        var o_id = new ObjectId(oId);
        return db.collection('owners').findOne({_id:o_id})
            .then(ownerData=>{
                return ownerData;
            })
            .catch(err=>console.log(err));
    }

    static findOwnerByEmail(email)
    {
        const db = getDb();
        return db.collection('owners').findOne({email:email})
            .then(ownerData=>{
                return ownerData;
            })
            .catch(err=>console.log(err));
    }

    static findOwnerByStudioId(sId)
    {
        const db = getDb();
        return db.collection('owners').findOne({studioId:sId})
            .then(ownerData=>{
                return ownerData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllOwners(skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('owners').find().sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(ownerData=>{
                return ownerData;
            })
            .catch(err=>console.log(err));
    }

}


module.exports = Owner;
