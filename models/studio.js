const mongodb = require('mongodb');
const getDb = require('../util/database').getDB;

const ObjectId = mongodb.ObjectId;

class Studio {
    constructor(fullName, address, latitude, longitude, mapLink, city, state, area, pincode, pricePerHour, availabilities, amenities, totalRooms,
        roomsDetails, maxGuests, studioPhotos, aboutUs, teamDetails, clientPhotos, reviews, featuredReviews, isActive) {
        this.fullName = fullName;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.mapLink = mapLink;
        this.city = city;
        this.state = state;
        this.area = area;
        this.pincode = pincode;
        this.pricePerHour = pricePerHour;
        this.availabilities = availabilities;    // Array of objects
        this.amenities = amenities;              // Array of object like [{id:"",name:""},{..},....]
        this.totalRooms = totalRooms;
        this.roomsDetails = roomsDetails;
        this.maxGuests = maxGuests;
        this.studioPhotos = studioPhotos;        // Array of strings(image URLs)
        this.aboutUs = aboutUs;                  // Array of Object
        this.teamDetails = teamDetails;          // Array of objects like [{name:"", designation:"", imgUrl:""},{....},....]
        this.clientPhotos = clientPhotos;
        this.reviews = reviews;                  // Array of Objects
        this.featuredReviews = featuredReviews;  // Array of Objects
        this.isActive = isActive;                // 0-> No, 1-> Yes
        this.creationTimeStamp = new Date();
    }

    save() {
        const db = getDb();
        return db.collection('studios').insertOne(this);
    }

    static findStudioById(sId) {
        var o_id = new ObjectId(sId);
        const db = getDb();

        return db.collection('studios').findOne({ _id: o_id })
            .then(studioData => {
                return studioData;
            })
            .catch(err => console.log(err));
    }

    static fetchStudiosByDate(cDate) {
        const db = getDb();

        return db.collection('studios').find({ "creationTimeStamp": { $gte: new Date(cDate + "T00:00:00"), $lt: new Date(cDate + "T23:59:59") } }).sort({ creationTimeStamp: -1 }).toArray()
            .then(studioData => {
                return studioData;
            })
            .catch(err => console.log(err));
    }

    static fetchAllActiveStudios(skipCount, limitCount) {
        const db = getDb();
        return db.collection('studios').find({ isActive: 1 }).sort({ creationTimeStamp: 1 }).skip(skipCount).limit(limitCount).toArray()
            .then(studioData => {
                return studioData;
            })
            .catch(err => console.log(err));
    }

    static fetchAllStudios(skipCount, limitCount) {
        const db = getDb();
        return db.collection('studios').find().sort({ creationTimeStamp: 1 }).skip(skipCount).limit(limitCount).toArray()
            .then(studioData => {
                return studioData;
            })
            .catch(err => console.log(err));
    }

    // NR changes
    static fetchStudioLocationDetails(state, offset, per_page) {

        const db = getDb();
        return db.collection('studios').find({ state }).sort({ creationTimeStamp: 1 }).skip(offset)
            .limit(per_page).toArray()
    }

    // static async updateStudioPhotoUrl() {
    //     const searchString = "http://ec2-3-109-47-228.ap-south-1.compute.amazonaws.com";
    //     const replacementString = "https://sadmin.choira.io";

    //     const db = getDb();
    //     const documents = await db.collection('studios').find({ "studioPhotos": { $regex: searchString } }).toArray();

    //     // Update the array in each document
    //     const updates = documents.map(async (doc) => {
    //     doc.studioPhotos = doc.studioPhotos.map(photo => photo.replace(searchString, replacementString));
    //     await await db.collection('studios').updateOne({ _id: doc._id }, { $set: { studioPhotos: doc.studioPhotos } });
    //     });

    //     await Promise.all(updates);
    //     return "OK"
    // }


    // static async updateStudioRoomPhotoUrl() {
    //     const searchString = "http://ec2-3-109-47-228.ap-south-1.compute.amazonaws.com";
    //     const replacementString = "https://sadmin.choira.io";

    //     const db = getDb();
    //     const documents = await db.collection('studios').find({}).toArray();
    //     console.log("LLLLLEN:",documents?.length);
    //     // Update the array in each document
    //     const updates = documents.map(async (doc) => {
    //     //doc.roomsDetails = doc.roomsDetails.map(roomdata => roomdata.roomPhotos.map(photo=>photo.replace(searchString, replacementString)));
    //     doc.roomsDetails = doc.roomsDetails.map(roomdata => {
    //         roomdata.roomPhotos = roomdata.roomPhotos.map(photo => photo.replace(searchString, replacementString));
    //         return roomdata;
    //     });
    //     await db.collection('studios').updateOne({ _id: doc._id }, { $set: { roomsDetails: doc.roomsDetails } });
    //     });

    //     await Promise.all(updates);
    //     return "OK"
    // }

    // static async updateStudioTeamPhotoUrl() {
    //     const searchString = "http://ec2-3-109-47-228.ap-south-1.compute.amazonaws.com";
    //     const replacementString = "https://sadmin.choira.io";

    //     const db = getDb();
    //     const documents = await db.collection('studios').find({}).toArray();
    //     console.log("LLLLLEN:",documents?.length);
    //     // Update the array in each document
    //     const updates = documents.map(async (doc) => {
    //     //doc.roomsDetails = doc.roomsDetails.map(roomdata => roomdata.roomPhotos.map(photo=>photo.replace(searchString, replacementString)));
    //     doc.teamDetails = doc.teamDetails.map(roomdata => {
    //         roomdata.imgUrl = roomdata.imgUrl.replace(searchString, replacementString);
    //         return roomdata
    //     });
    //     await db.collection('studios').updateOne({ _id: doc._id }, { $set: { teamDetails: doc.teamDetails } });
    //     });

    //     await Promise.all(updates);
    //     return "OK"
    // }



}


module.exports = Studio;
