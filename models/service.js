const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;
const { getDB } = require('../util/database');
const { logger } = require('../util/logger');



const collectionName = 'services';

class Service {
  constructor(
    service_id,
    fullName,
    price,
    amenities,
    totalPlans,
    packages,
    servicePhotos,
    aboutUs,
    workDetails,
    discographyDetails,
    clientPhotos,
    reviews,
    featuredReviews,
    isActive,
    type,
    pricing
  ) {
    this.service_id = service_id;
    this.fullName = fullName;
    this.price = price; // Starting price of plan
    this.amenities = amenities; // Array of objects like [{id:"",name:""},{..},....]
    this.totalPlans = totalPlans;
    this.packages = packages; // Array of objects of each plans of a service(id, name, desc, etc)
    this.servicePhotos = servicePhotos; // Array of strings(image URLs)
    this.aboutUs = aboutUs; // Array of Object
    this.workDetails = workDetails; // Array of objects like [{name:"", designation:"", imgUrl:""},{....},....]
    this.discographyDetails = discographyDetails;
    this.clientPhotos = clientPhotos;
    this.reviews = reviews; // Array of Objects
    this.featuredReviews = featuredReviews; // Array of Objects
    this.isActive = isActive; // 0-> No, 1-> Yes
    this.type = type;
    this.pricing = pricing;
    this.creationTimeStamp = new Date();
  }

  async checkBeforeSave() {
    const db = getDB();
    try {
      const existingService = await db
        .collection(collectionName)
        .findOne({ service_id: this.service_id });

      if (existingService) {
        return {
          status: false,
          message: "Service with the given ID already exists",
        };
      }

      const result = await db.collection(collectionName).insertOne(this);
      return result.ops[0];
    } catch (error) {
      console.error("Error saving service:", error);
      throw error;
    }
  }

  async save() {
    const db = getDB();
    try {
      const result = await db.collection(collectionName).insertOne(this);
      return result.ops[0];
    } catch (error) {
      console.error("Error saving service:", error);
      throw error;
    }
  }

  static async deleteServiceById(sId) {
    const db = getDB();

    try {
      const existingService = await db
        .collection(collectionName)
        .findOneAndDelete({ _id: new ObjectId(sId) });
      console.log(existingService);
      if (!existingService) {
        return { status: false, message: "No Service with this ID exists" };
      }

      return { status: true, message: "Service deleted successfully" };
    } catch (error) {
      console.error("Error deleting service:", error);
      return { status: false, message: "Internal Server Error" };
    }
  }
  static async updateServiceById(sId, newData) {
    const db = getDB();

    try {
      const updatedResult = await db
        .collection(collectionName)
        .findOneAndUpdate(
          { _id: new ObjectId(sId) },
          { $set: newData },
          { returnOriginal:false }
        );

      console.log("updatedResult");
      console.log(updatedResult);

      return {
        status: true,
        message: "Service updated successfully",
        updatedService: updatedResult.value,
      };
    } catch (error) {
      console.error("Error deleting service:", error);
      return { status: false, message: "Internal Server Error" };
    }
  }
  static async updateServicePackageById(pId, newData) {
    const db = getDB();

    try {
      const updatedResult = await db
        .collection(collectionName)
        .findOneAndUpdate(
          { _id: new ObjectId(pId) },
          { $set: newData },
          { new: true }
        );
      return {
        status: true,
        message: "Service updated successfully",
        updatedService: updatedResult,
      };
    } catch (error) {
      console.error("Error deleting service:", error);
      return { status: false, message: "Internal Server Error" };
    }
  }

  static filterEmptyFields(service_obj) {
    const filteredObject = {};

    for (const key in service_obj) {
      if (service_obj[key] || service_obj[key] === 0) {
        filteredObject[key] = service_obj[key];
      }
    }

    // console.log("filteredObject",filteredObject);

    return filteredObject;
  }

  static async updateServiceByPackageId(pId, newData) { }

  static async findServiceById(sId) {
    const db = getDB();
    try {
      const serviceData = await db
        .collection(collectionName)
        .findOne({ _id: new ObjectId(sId) });
      // console.log("serviceData----", serviceData);
      return serviceData;
    } catch (error) {
      console.error("Error finding service by ID:", error);
      throw error;
    }
  }

  static fetchAllService() {
    const db = getDB();
    return db
      .collection(collectionName)
      .find()
      .toArray()
      .then((serviceData) => {
        return serviceData;
      })
      .catch((err) => console.log(err));
  }

  static async fetchAllServicesByAggregate(pipeline) {
    try {
      const db = getDB();
      const serviceData = await db
        .collection(collectionName)
        .aggregate(pipeline)
        .toArray();
      console.log(serviceData);
      return serviceData;
    } catch (err) {
      console.error("Error in fetchAllServicesByAggregate:", err);
      throw err;
    }
  }



  static async updateOneRecord(filter, update_data) {

    const db = getDB();
    try {
      const result = await db.collection("bookings").updateOne(filter, { $set: update_data });
      return result?.matchedCount ? 1 : 0;
    } catch (error) {
      console.error("Error saving service:", error);
      throw error;
    }

  }



}
module.exports = Service;


