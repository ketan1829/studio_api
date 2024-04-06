const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class TestUser
{
    static async update(phoneNumber, newData) {
        const db = getDb();
        const userToUpdate = { _id:ObjectId(phoneNumber)};
        const updateData = {
            $set: newData
        };
        return await db.collection("test_users").updateOne(userToUpdate, updateData);
    }

    static findUserByUserId(uId)
    {

        // console.log("uID-------->",uId);

        var o_id = new ObjectId(uId);
        const db = getDb();

        return db.collection('test_users').findOne({_id:o_id})
            .then(userData=>{
                return userData;  
            })
            .catch(err=>console.log(err));
    }

    static async findUserByPhone(phone)
    {
        const db = getDb();
                            
        return await db.collection('test_users').find({ phone: phone }).sort({ _id: -1 }).toArray()
    }


    static deleteUserPermanent(user_id){
        const db = getDb();
        db.collection('test_users').deleteOne({_id:ObjectId(user_id)})
            .then(userData=>{

                console.log("user delete op:",user_id);
                return userData;
            })
            .catch(err=>console.log(err));
        // db.commit()
    }

    static fetchAllUsersFromDate(fromdate,todate)
    {
        const db = getDb();
        
        return db.collection('test_users').find({ "creationTimeStamp": { $gte: new Date(fromdate + "T00:00:00"), $lt: new Date(todate + "T23:59:59") } }).toArray()
            .then(userData=>{
                return userData;
            })
            .catch(err=>console.log(err));
    }

}


module.exports = TestUser;
