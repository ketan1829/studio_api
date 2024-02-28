const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class User
{
    constructor(fullName,dateOfBirth,email,phone,password,latitude,longitude,city,state,profileUrl,gender,userType,favourites,deviceId)
    {
        this.fullName = fullName;
        this.dateOfBirth = dateOfBirth;
        this.email = email;
        this.phone = phone;
        this.password = password;
        this.latitude = latitude;
        this.longitude = longitude;
        this.city = city;
        this.state = state;
        this.profileUrl = profileUrl;
        this.gender = gender;        // male, or female
        this.userType = userType;    // EMAIL, FACEBOOK, or GOOGLE
        this.favourites = favourites;
        this.deviceId = deviceId;
        this.creationTimeStamp = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection('users').insertOne(this);
    }

    static findUserByUserId(uId)
    {

        // console.log("uID-------->",uId);

        var o_id = new ObjectId(uId);
        const db = getDb();

        return db.collection('users').findOne({_id:o_id})
            .then(userData=>{
                return userData;  
            })
            .catch(err=>console.log(err));
    }
  
    static findUserByEmail(email)
    {
        const db = getDb();
                            
        return db.collection('users').findOne({ email:email })
            .then(userData=>{
                return userData;  
            })
            .catch(err=>console.log(err));
    }

    static findUserByPhone(phone)
    {
        const db = getDb();
                            
        return db.collection('users').findOne({ phone:phone })
            .then(userData=>{
                return userData;  
            })
            .catch(err=>console.log(err));
    }

    static fetchAllUsers(skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('users').find().sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(userData=>{
                return userData;
            })
            .catch(err=>console.log(err));
    }
    // NR
    // static async updateProfileUrl()
    // {
    //     const searchString = "http://ec2-3-109-47-228.ap-south-1.compute.amazonaws.com";
    //     const replacementString = "https://sadmin.choira.io";
    //     const db = getDb();
    //     const documents = await db.collection('users').find({ "profileUrl": { $regex: searchString } }).toArray();

    //     // Update the array in each document
    //     const updates = documents.map(async (doc) => {
    //     doc.profileUrl = doc.profileUrl.replace(searchString, replacementString);
    //     await db.collection('users').updateOne({ _id: doc._id }, { $set: { profileUrl: doc.profileUrl } });
    //     });

    //     await Promise.all(updates);
    // }

}


module.exports = User;
