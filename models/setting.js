const mongodb = require("mongodb");
const getDb = require("../util/database").getDB;

const ObjectId = mongodb.ObjectId;

collectionName = "settings";

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

  static getSingleCategory(state) {
    const db = getDb();
    return db
      .collection(collectionName)
      .distinct("category", { "category.active": state })
      .then((Data) => {
        return Data;
      })
      .catch((err) => console.log(err));
  }

  static getCategory(state) {
    const db = getDb();
    return db
      .collection(collectionName)
      .distinct("category", { "category.active": state })
      .then((Data) => {
        return Data;
      })
      .catch((err) => console.log(err));
  }

  static getBanner(state) {
    const db = getDb();
    if (state === undefined) {
      return db.collection(collectionName).distinct("banner");
    }
    return db
      .collection(collectionName)
      .aggregate([
        { $unwind: "$banner" },
        { $match: { "banner.active": state } },
        { $replaceRoot: { newRoot: "$banner" } },
      ])
      .toArray();
  }

  static async minStartPrice(o_id) {
    const db = getDb();
    const objectId = new ObjectId(o_id);
    const services = await db
      .collection("services")
      .find({ _id: objectId })
      .toArray();
    let minUsa = [];
    let minIn = [];
    let minJp = [];

    services.forEach((service) => {
      service.packages.forEach((packageObj) => {
        Object.entries(packageObj.pricing).forEach(([country, prices]) => {
          if (country === "USA") minUsa.push(prices.basePrice);
          if (country === "IN") minIn.push(prices.basePrice);
          if (country === "JP") minJp.push(prices.basePrice);
        });
      });
    });

    const minobj = {
      USA: {
        price: 0,
        basePrice: Math.min(...minUsa),
        discountPercentage: 10,
      },
      IN: {
        price: 0,
        basePrice: Math.min(...minIn),
        discountPercentage: 10,
      },
      JP: {
        price: 0,
        basePrice: Math.min(...minJp),
        discountPercentage: 10,
      },
    };

    let result = await db
      .collection("services")
      .updateOne({ _id: new ObjectId(o_id) }, { $set: { pricing: minobj } });
    minIn = [];
    minJp = [];
    minUsa = [];
  }
}

module.exports = Setting;
