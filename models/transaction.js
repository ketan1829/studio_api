const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class Transaction
{
    constructor(transactionId,studioId,userId,bookingId,discountId,amount,transactionStatus)
    {
        this.transactionId = transactionId;
        this.studioId = studioId;
        this.userId = userId;
        this.bookingId = bookingId;
        this.discountId = discountId;
        this.amount = amount;
        this.transactionStatus = transactionStatus;    //0-> Pending , 1-> Success , 2-> Rejected
        this.creationTimeStamp = new Date();
    }

    save()
    {
        const db = getDb();
        return db.collection('transactions').insertOne(this);
    }

    static findTransactionByTransactionId(tId)
    {
        const db = getDb();

        return db.collection('transactions').findOne({transactionId:tId})
            .then(transactionData=>{
                return transactionData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllTransactionsByUserId(uId)
    {
        const db = getDb();
        return db.collection('transactions').find({userId:uId}).sort({creationTimeStamp:-1}).toArray()
            .then(transactionData=>{
                return transactionData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllTransactionsByUserIdAndDiscountId(uId,dId)
    {
        const db = getDb();
        return db.collection('transactions').find({userId:uId,discountId:dId,transactionStatus:1}).sort({creationTimeStamp:-1}).toArray()
            .then(transactionData=>{
                return transactionData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllTransactionsByStudioId(sId,skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('transactions').find({studioId:sId}).sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(transactionData=>{
                return transactionData;
            })
            .catch(err=>console.log(err));
    }

    static fetchTransactionsByDateRange(sDate,eDate)
    {
        const db = getDb();
        
        return db.collection('transactions').find({"creationTimeStamp":{$gte:new Date(sDate+"T00:00:00"), $lt:new Date(eDate+"T23:59:59")} }).sort({creationTimeStamp:-1}).toArray()
            .then(transactionData=>{
                return transactionData;
            })
            .catch(err=>console.log(err));
    }

    static fetchTransactionsByStudioAndDateRange(sId,sDate,eDate)
    {
        const db = getDb();
        return db.collection('transactions').find({studioId:sId,"creationTimeStamp":{$gte:new Date(sDate+"T00:00:00"), $lt:new Date(eDate+"T23:59:59")} }).sort({creationTimeStamp:-1}).toArray()
            .then(transactionData=>{
                return transactionData;
            })
            .catch(err=>console.log(err));
    }

    static fetchAllTransactions(skipCount,limitCount)
    {
        const db = getDb();
        return db.collection('transactions').find().sort({creationTimeStamp:-1}).skip(skipCount).limit(limitCount).toArray()
            .then(transactionData=>{
                return transactionData;
            })
            .catch(err=>console.log(err));
    }

}


module.exports = Transaction;
