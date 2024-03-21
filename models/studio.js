const mongodb = require("mongodb");
const getDb = require("../util/database").getDB;

const ObjectId = mongodb.ObjectId;

class Studio {
  constructor(
    fullName,
    address,
    latitude,
    longitude,
    mapLink,
    city,
    state,
    area,
    pincode,
    pricePerHour,
    availabilities,
    amenities,
    totalRooms,
    roomsDetails,
    maxGuests,
    studioPhotos,
    aboutUs,
    teamDetails,
    clientPhotos,
    reviews,
    featuredReviews,
    isActive
  ) {
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
    this.availabilities = availabilities; // Array of objects
    this.amenities = amenities; // Array of object like [{id:"",name:""},{..},....]
    this.totalRooms = totalRooms;
    this.roomsDetails = roomsDetails;
    this.maxGuests = maxGuests;
    this.studioPhotos = studioPhotos; // Array of strings(image URLs)
    this.aboutUs = aboutUs; // Array of Object
    this.teamDetails = teamDetails; // Array of objects like [{name:"", designation:"", imgUrl:""},{....},....]
    this.clientPhotos = clientPhotos;
    this.reviews = reviews; // Array of Objects
    this.featuredReviews = featuredReviews; // Array of Objects
    this.isActive = isActive; // 0-> No, 1-> Yes
    this.creationTimeStamp = new Date();
  }

  save() {
    const db = getDb();
    return db.collection("studios").insertOne(this);
  }

  aggregate(Data) {
    const db = getDb();
    return db.collection("studios").aggregate(Data);
  }

  static async getNearByStudios(longitude, latitude,range) {
    try {
      const db = getDb();
      const nearByStudiosCursor = await db.collection("studios").find({
        location: {
          $nearSphere: {
            $geometry: { type: "Point", coordinates: [longitude, latitude] },
            $maxDistance: range * 1000
          },
        },
      });
      const nearByStudios = await nearByStudiosCursor.toArray();
      return nearByStudios;
    } catch (error) {
      console.log(error);
      throw error; 
    }
  }
  

  static findStudioById(sId) {
    var o_id = new ObjectId(sId);
    const db = getDb();

    return db
      .collection("studios")
      .findOne({ _id: o_id })
      .then((studioData) => {
        console.log("ID---studioData---", studioData);
        return studioData;
      })
      .catch((err) => console.log(err));
  }

  static async paginate(filter, options) {
    try {
      const db = getDb();
      let sort = {};
      console.log("options", options);
      if (options.sortBy) {
        const sortingCriteria = options.sortBy.split(",").map((sortOption) => {
          const [key, order] = sortOption.split(":");
          return { [key]: order === "desc" ? -1 : 1 };
        });
        sortingCriteria.forEach((criteria) => {
          sort = { ...sort, ...criteria };
        });
      }

      const limit = parseInt(options.limit, 10) || 10;
      const page = parseInt(options.page, 10) || 1;
      const skip = (page - 1) * limit;

      // console.log("sort--", sort)
      const countPromise = db.collection("studios").countDocuments(filter);
      let docsPromise = db
        .collection("studios")
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      if (options.populate) {
        console.log("populate ---", options.populate);
        options.populate.split(",").forEach((populateOption) => {
          const path = populateOption
            .split(".")
            .reduceRight((acc, cur) => ({ path: cur, populate: acc }), {});
          console.log("populate path ---", path);
          docsPromise = docsPromise.populate(path);
        });
      }

      const [totalResults, results] = await Promise.all([
        countPromise,
        docsPromise.toArray(),
      ]);
      const totalPages = Math.ceil(totalResults / limit);

      return {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
    } catch (error) {
      // Handle errors appropriately
      throw new Error("Pagination failed: " + error.message);
    }
  }


 static async searchStudioWithFilters_Aggregation(filter){
  const db = getDb();
  console.log(JSON.stringify(filter));
  return db.collection("studios").aggregate(filter).toArray()
 }

  static async updateDocumentsWithGeoLocation() {
    const db = getDb();
    return db
      .collection("studios")
      .find()
      .toArray()
      .then(async (studioData) => {
        await studioData.forEach(async (doc) => {
          const latitude = parseFloat(doc.latitude);
          const longitude = parseFloat(doc.longitude);

          // Create GeoJSON object
          const geoJSON = {
            type: "Point",
            coordinates: [longitude, latitude],
          };

          // Update document with GeoJSON object
          await db
            .collection("studios")
            .updateOne({ _id: doc._id }, { $set: { location: geoJSON } });
          await db
            .collection("studios")
            .createIndex({ "location.coordinates": "2dsphere" });
        });
        return true;
      })
      .catch((err) => console.log(err));
  }

  static async paginateNearbyLoc(
    filter,
    options,
    userCoordinates,
    rangeInKilometers
  ) {
    try {
      const db = getDb();
      let sort = {};
      console.log("options", options);
      if (options.sortBy) {
        const sortingCriteria = options.sortBy.split(",").map((sortOption) => {
          const [key, order] = sortOption.split(":");
          return { [key]: order === "desc" ? -1 : 1 };
        });
        sortingCriteria.forEach((criteria) => {
          sort = { ...sort, ...criteria };
        });
      } else {
        // If sortBy is not provided, provide a default sorting criterion
        sort = { distance: 1 }; // Sort by distance in ascending order
      }

      const limit = parseInt(options.limit, 10) || 10;
      const page = parseInt(options.page, 10) || 1;
      const skip = (page - 1) * limit;

      // await db.collection('studios').createIndex({ "latitude": "2dsphere", "longitude": "2dsphere" })

      const countPromise = db.collection("studios").countDocuments(filter);

      // Calculate the distance from user coordinates and filter by range
      const docsPromise = db.collection("studios").aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [
                parseFloat(userCoordinates.longitude),
                parseFloat(userCoordinates.latitude),
              ],
            },
            distanceField: "distance",
            spherical: true,
            maxDistance: rangeInKilometers * 1000, // Convert to meters
          },
        },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
      ]);

      console.log("docsPromise----", docsPromise.toArray().results);

      const [totalResults, results] = await Promise.all([
        countPromise,
        docsPromise.toArray(),
      ]);
      const totalPages = Math.ceil(totalResults / limit);

      return {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
    } catch (error) {
      // Handle errors appropriately
      throw new Error("Pagination failed: " + error.message);
    }
  }

  static async fetchAllStudio(filter, options) {
    try {
      const db = getDb();
      let sort = {};
      console.log("options", options);
      if (options.sortBy) {
        const sortingCriteria = options.sortBy.split(",").map((sortOption) => {
          const [key, order] = sortOption.split(":");
          return { [key]: order === "desc" ? -1 : 1 };
        });
        sortingCriteria.forEach((criteria) => {
          sort = { ...sort, ...criteria };
        });
      }

      const limit = parseInt(options.limit, 10) || 10;
      const page = parseInt(options.page, 10) || 1;
      const skip = (page - 1) * limit;

      // console.log("sort--", sort)
      const countPromise = db.collection("studios").countDocuments(filter);
      let docsPromise = db
        .collection("studios")
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      if (options.populate) {
        console.log("populate ---", options.populate);
        options.populate.split(",").forEach((populateOption) => {
          const path = populateOption
            .split(".")
            .reduceRight((acc, cur) => ({ path: cur, populate: acc }), {});
          console.log("populate path ---", path);
          docsPromise = docsPromise.populate(path);
        });
      }

      const [totalResults, results] = await Promise.all([
        countPromise,
        docsPromise.toArray(),
      ]);
      const totalPages = Math.ceil(totalResults / limit);

      return {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
    } catch (error) {
      // Handle errors appropriately
      throw new Error("Pagination failed: " + error.message);
    }
  }

  static fetchStudiosByDate(cDate) {
    const db = getDb();

    return db
      .collection("studios")
      .find({
        creationTimeStamp: {
          $gte: new Date(cDate + "T00:00:00"),
          $lt: new Date(cDate + "T23:59:59"),
        },
      })
      .sort({ creationTimeStamp: -1 })
      .toArray()
      .then((studioData) => {
        return studioData;
      })
      .catch((err) => console.log(err));
  }

  static fetchAllActiveStudios(skipCount, limitCount) {
    const db = getDb();
    return db
      .collection("studios")
      .find({ isActive: 1 })
      .sort({ creationTimeStamp: 1 })
      .skip(skipCount)
      .limit(limitCount)
      .toArray()
      .then((studioData) => {
        return studioData;
      })
      .catch((err) => console.log(err));
  }

  static fetchAllStudios(skipCount, limitCount) {
    const db = getDb();
    return db
      .collection("studios")
      .find()
      .sort({ creationTimeStamp: 1 })
      .skip(skipCount)
      .limit(limitCount)
      .toArray()
      .then((studioData) => {
        return studioData;
      })
      .catch((err) => console.log(err));
  }

  // NR changes
  static fetchStudioLocationDetails(state, offset, per_page) {
    const db = getDb();
    return db
      .collection("studios")
      .find({ state })
      .sort({ creationTimeStamp: 1 })
      .skip(offset)
      .limit(per_page)
      .toArray();
  }

static async fetchAllStudiosByAggregate(pipeline) {
  try {
      const db = getDb();
      const studioData = await db.collection("studios").aggregate(pipeline).toArray();
      console.log(studioData);
      return studioData;
  } catch (err) {
      console.error("Error in fetchAllStudioByAggregate:", err);
      throw err; 
  }
}

}

module.exports = Studio;
