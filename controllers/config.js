const Config = require('../models/config');

const axios = require('axios');

const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 
const ObjectId = mongodb.ObjectId;

const jwt = require('jsonwebtoken');


exports.updateAllDoc = async(req,res,next)=>{
//    console.log("Herer -------ß", req.body)
    const collectionName = req.body.docName;
    const dataToUpdate = req.body.data;
    if(userId === "KET"){
        Config.updateAllDoc(collectionName, dataToUpdate)
        .then(notiData=>{
            return res.json({status:true, message:"All Doc updated",notifications:notiData});
        })  
    }
}

exports.AddKeyDoc = async(req,res,next)=>{
    console.log("Herer -------ß", req.body)
     const userId = req.body.check;
     if(userId === "KET"){
         Config.updateAllDoc()
         .then(notiData=>{
             return res.json({status:true, message:"All Doc updated",notifications:notiData});
         })  
     }
 }

 exports.createIndexForStudioName= async(req,res)=>{
    const db = getDb(); 
    return await db.collection("studios").createIndex({ fullName: "text" });
 }



 exports.updateAllUser=async(req,res)=>{
try {
  const db = getDb();
    db.collection("users")
      .updateMany({},{ $set: { status: 1 }})
      .then((resultData) => {
        return res.json({ status: true, message: "all User updated successfully" });
      })
      .catch((err) => console.log(err));
} catch (error) {
  console.log(error);
}
}