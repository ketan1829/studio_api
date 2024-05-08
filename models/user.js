const mongodb = require('mongodb');
const getDb = require('../util/database').getDB;

const ObjectId = mongodb.ObjectId;

class User {
    constructor(
        { fullName,
            dateOfBirth,
            email,
            phone,
            password = "",
            latitude = "",
            longitude = "",
            city = "",
            state = "",
            profileUrl = "",
            role = "user",
            gender = "",
            userType = "NUMBER",
            favourites = [],
            deviceId,
            status = 1 }
    ) {
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
        this.role = role;
        this.gender = gender;
        this.userType = userType;
        this.favourites = favourites;
        this.deviceId = deviceId;
        this.status = 1;
        this.creationTimeStamp = new Date();
    }

    save() {
        const db = getDb();
        return db.collection('users').insertOne(this);
    }

    static async update(phoneNumber, newData) {
        const db = getDb();
        const filter = { phone: phoneNumber };
        const updateData = {
            $set: newData
        };
        return await db.collection("users").updateOne(filter, updateData, { returnOriginal: false }).then(udata => { return udata }).catch(error => console.log("error", error));
    }

    static findUserByUserId(uId) {

        // console.log("uID-------->",uId);

        var o_id = new ObjectId(uId);
        const db = getDb();

        return db.collection('users').findOne({ _id: o_id })
            .then(userData => {
                return userData;
            })
            .catch(err => console.log(err));
    }

    static findUserByEmail(email) {
        const db = getDb();

        return db.collection('users').findOne({ email: email })
            .then(userData => {
                return userData;
            })
            .catch(err => console.log(err));
    }

    static findUserByPhone(phone, status = 1,include_status_check=true) {
        const db = getDb();
        let filter = { phone: phone }

        if(include_status_check){
            filter.status = status
        }

        return db.collection('users').findOne(filter)
            .then(userData => {
                return userData;
            })
            .catch(err => console.log(err));
    }

    // static async find(filter,options)
    // {
    //     const db = getDb();
    //     console.log(options.limit)
    //     return await db.collection('users').find(filter).limit(+options.limit).sort(options.sort).toArray();
    //         // .then(userData=>{
    //         //     return userData;  
    //         // })
    //         // .catch(err=>console.log(err));


    // }

    // static test2(msg)
    // {
    //     console.log("=>>>>>>>>>>>>>>>>>>>");
    //     console.log("=>>>>>>>>>>>>>>>>>>>",this.filteredData);
    // }

    static fetchAllUsers(skipCount, limitCount) {
        const db = getDb();
        return db.collection('users').find().sort({ creationTimeStamp: -1 }).skip(skipCount).limit(limitCount).toArray()
            .then(userData => {
                return userData;
            })
            .catch(err => console.log(err));
    }

    static async fetchAllUsersByAggregate(pipeline) {
        try {
            const db = getDb();
            const userData = await db.collection('users').aggregate(pipeline).toArray();
            console.log(userData);
            return userData;
        } catch (err) {
            console.error("Error in fetchAllUsersByAggregate:", err);
            throw err;
        }
    }

    // remove duplicate >>>>>>>>>>>>>

    static fetchAllUsersFromDate2(fromdate, todate) {
        const db = getDb();

        return db.collection('users').find({ "creationTimeStamp": { $gte: new Date(fromdate + "T00:00:00"), $lt: new Date(todate + "T23:59:59") } }).toArray()
            .then(userData => {
                return userData;
            }).catch(err => console.log(err));
    }

    static async findUsersByPhone(phone) {
        const db = getDb();

        return await db.collection('users').find({ phone: phone }).sort({ _id: -1 }).toArray()
    }

    static deleteUserPermanent(user_id) {
        const db = getDb();
        db.collection('users').deleteOne({ _id: ObjectId(user_id) })
            .then(userData => {
                console.log("user delete op:", user_id);
                return userData;
            })
            .catch(err => console.log(err));
        // db.commit()
    }

    static async update_object(phoneNumber, newData) {
        const db = getDb();
        const userToUpdate = { _id: ObjectId(phoneNumber) };
        const updateData = {
            $set: newData
        };
        return await db.collection("users").updateOne(userToUpdate, updateData);
    }

    // <<<<<<<< remove duplicate



    // static async paginate(filter, options) {
    //     try {
    //       const db = getDb();
    //       let sort = {};
    //       console.log("options", options);
    //       if (options.sortBy) {
    //         const sortingCriteria = options.sortBy.split(",").map((sortOption) => {
    //           const [key, order] = sortOption.split(":");
    //           return { [key]: order === "desc" ? -1 : 1 };
    //         });
    //         sortingCriteria.forEach((criteria) => {
    //           sort = { ...sort, ...criteria };
    //         });
    //       }

    //       const limit = parseInt(options.limit, 10) || 10;
    //       const page = parseInt(options.page, 10) || 1;
    //       const skip = (page - 1) * limit;

    //       // console.log("sort--", sort)
    //       const countPromise = db.collection("users").countDocuments(filter);
    //       let docsPromise = db
    //         .collection("studios")
    //         .find(filter)
    //         .sort(sort)
    //         .skip(skip)
    //         .limit(limit);

    //       if (options.populate) {
    //         console.log("populate ---", options.populate);
    //         options.populate.split(",").forEach((populateOption) => {
    //           const path = populateOption
    //             .split(".")
    //             .reduceRight((acc, cur) => ({ path: cur, populate: acc }), {});
    //           console.log("populate path ---", path);
    //           docsPromise = docsPromise.populate(path);
    //         });
    //       }

    //       const [totalResults, results] = await Promise.all([
    //         countPromise,
    //         docsPromise.toArray(),
    //       ]);
    //       const totalPages = Math.ceil(totalResults / limit);

    //       return {
    //         results,
    //         page,
    //         limit,
    //         totalPages,
    //         totalResults,
    //       };
    //     } catch (error) {
    //       // Handle errors appropriately
    //       throw new Error("Pagination failed: " + error.message);
    //     }
    //   }


}


module.exports = User;
