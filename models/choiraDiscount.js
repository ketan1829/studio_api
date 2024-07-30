const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class ChoiraDiscount
{
    constructor(discountName,description,discountType,discountPercentage,maxCapAmount,discountDate,usersList,couponCode,startDate,endDate)
    {
        this.discountName = discountName;
        this.description = description;
        this.discountType = discountType;    // 0-> User discount First, 1-> User discount recurring , 2-> Event-based, 3-> Specific User
        this.discountPercentage = discountPercentage;
        this.maxCapAmount = maxCapAmount;
        this.discountDate = discountDate  || "";    // Useful only when discountType=2
        this.usersList = usersList;          // Useful only when discountType=3, Array of UserIDs
        this.couponCode = couponCode;
        this.startDate = startDate || "";
        this.endDate = endDate || "";
        this.creationTimeStamp = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection('choiraDiscounts').insertOne(this);
    }

    static findChoiraDiscountById(cId)
    {
        var o_id = new ObjectId(cId);
        const db = getDb();

        return db.collection('choiraDiscounts').findOne({_id:o_id})
            .then(discountData=>{
                return discountData;
            })
            .catch(err=>console.log(err));
    }

    static findChoiraDiscountByType(dType)
    {
        const db = getDb();

        return db.collection('choiraDiscounts').findOne({discountType:dType})
            .then(discountData=>{
                return discountData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllChoiraDiscounts(skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('choiraDiscounts').find().sort({creationTimeStamp:1}).skip(skipCount).limit(limitCount).toArray()
            .then(discountData=>{
                return discountData;
            })
            .catch(err=>console.log(err));
    }

}


module.exports = ChoiraDiscount;
