const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class SubAdmin
{
    constructor(firstName,lastName,email,password,permissions)
    {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.permissions = permissions;    //Array of strings(permissions)
        this.creationTimeStamp = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection('subAdmins').insertOne(this);
    }

    static findSubAdminById(sId)
    {
        const db = getDb();
        var o_id = new ObjectId(sId);
        return db.collection('subAdmins').findOne({_id:o_id})
            .then(subAdminData=>{
                return subAdminData;
            })
            .catch(err=>console.log(err));
    }

    static findSubAdminByEmail(email)
    {
        const db = getDb();
        return db.collection('subAdmins').findOne({email:email})
            .then(subAdminData=>{
                return subAdminData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllSubAdmins(skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('subAdmins').find().sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(subAdminData=>{
                return subAdminData;
            })
            .catch(err=>console.log(err));
    }

}


module.exports = SubAdmin;
