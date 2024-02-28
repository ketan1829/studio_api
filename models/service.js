const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;
const { getDB } = require('../util/database');

const collectionName = 'services';

class Service {
    constructor(fullName, price, amenities, totalPlans, serviceDetails, servicePhotos, aboutUs, workDetails, clientPhotos, reviews, featuredReviews, isActive) {
        this.fullName = fullName;
        this.price = price; // Starting price of plan
        this.amenities = amenities; // Array of objects like [{id:"",name:""},{..},....]
        this.totalPlans = totalPlans;
        this.serviceDetails = serviceDetails; // Array of objects of each plans of a service(id, name, desc, etc)
        this.servicePhotos = servicePhotos; // Array of strings(image URLs)
        this.aboutUs = aboutUs; // Array of Object
        this.workDetails = workDetails; // Array of objects like [{name:"", designation:"", imgUrl:""},{....},....]
        this.clientPhotos = clientPhotos;
        this.reviews = reviews; // Array of Objects
        this.featuredReviews = featuredReviews; // Array of Objects
        this.isActive = isActive; // 0-> No, 1-> Yes
        this.creationTimeStamp = new Date();
    }

    async save() {
        const db = getDB();
        try {
            const result = await db.collection(collectionName).insertOne(this);
            return result.ops[0];
        } catch (error) {
            console.error('Error saving service:', error);
            throw error;
        }
    }

    static async findServiceById(sId) {
        const db = getDB();
        try {
            const serviceData = await db.collection(collectionName).findOne({ _id: new ObjectId(sId) });
            return serviceData;
        } catch (error) {
            console.error('Error finding service by ID:', error);
            throw error;
        }
    }
}

module.exports = Service;
