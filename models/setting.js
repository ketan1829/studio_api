const mongodb = require('mongodb');
const getDb = require('../util/database').getDB;

const ObjectId = mongodb.ObjectId;

collectionName = 'settings'

class Setting {
    constructor(category, banner, type) {
        this.category = category;
        this.banner = banner;          
        this.type = type;              
        this.creationTimeStamp = new Date();
    }

    save() {
        const db = getDb();
        return db.collection(collectionName).insertOne(this);
    }

    static getSingleCategory(state)
    {
        const db = getDb();
        return db.collection(collectionName).distinct('category', { 'category.active': state })
            .then(Data=>{
                return Data;
            })
            .catch(err=>console.log(err));
    }

    static getCategory(state)
    {
        const db = getDb();
        return db.collection(collectionName).distinct('category', { 'category.active': state })
            .then(Data=>{
                return Data;
            })
            .catch(err=>console.log(err));
    }

    static getBanner(state)
    {
        const db = getDb();
        return db.collection(collectionName).distinct('banner', { 'banner.active': state })
        .then(Data=>{
            return Data;
        })
        .catch(err=>console.log(err));
    }


}

module.exports = Setting;
