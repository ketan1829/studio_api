const Owner = require("../models/owner");
const Studio = require("../models/studio");

const axios = require("axios");

const mongodb = require("mongodb");
const getDb = require("../util/database").getDB;
const pick = require("../util/pick");
const { sendMsg91OTP} = require("../util/mail");
const ObjectId = mongodb.ObjectId;

const jwt = require("jsonwebtoken");

exports.createNewOwner = async (req, res, next) => {
  const firstName = req.body.firstName.trim();
  const lastName = req.body.lastName.trim();
  const email = req.body.email;
  const password = req.body.password;
  const studioId = req.body.studioId;
  const ownerImage = "";

  Owner.findOwnerByEmail(email).then((ownerData) => {
    if (ownerData) {
      return res.json({
        status: false,
        message: "Owner with this Email already exists",
      });
    }
    Studio.findStudioById(studioId).then((studioData) => {
      if (!studioData) {
        return res.json({
          status: false,
          message: "No studio with this ID exists",
        });
      }
      Owner.findOwnerByStudioId(studioId).then((existingOwnerData) => {
        if (existingOwnerData) {
          return res.json({
            status: false,
            message: "Studio already linked to another owner",
          });
        }
        const ownerObj = new Owner(
          firstName,
          lastName,
          email,
          password,
          studioId,
          ownerImage
        );

        // saving in database
        return ownerObj
          .save()
          .then((resultData) => {
            return res.json({
              status: true,
              message: "Owner created successfully",
              owner: resultData["ops"][0],
            });
          })
          .catch((err) => console.log(err));
      });
    });
  });
};

exports.ownerLogin = async (req, res, next) => {
  const { number, role, userType, deviceId, email, password } = req.body;

  try {
    if (userType === "NUMBER") {
      // Validate and format the phone number
      if (!number || number.length < 11) {
        return res.status(400).json({ status: false, message: "Enter a valid phone number with country code." });
      }

      const ownerData = await Owner.findOwnerByNumber(number);
      if (!ownerData) {
        const status_otp = await sendMsg91OTP(number);
        if (!status_otp.status) {
          return res.status(200).json({ status: false, message: "Error while sending OTP, Try again later" });
        }
        return res.status(200).json({ status: true, message: "OTP has been sent successfully", newUser: true });
      }

      const status_otp = await sendMsg91OTP(ownerData.phone);
      if (!status_otp.status) {
        return res.status(200).json({ status: false, message: "Error while sending OTP to owner, Try again later" });
      }

      const ownerResponseData = {
        id: ownerData.ownerId,
        fullName: ownerData.fullName || "",
        emailId: ownerData.email || "",
        image: ownerData.adminImage || "",
        phoneNumber: ownerData.phone || "",
        role: ownerData.role || "",
      };

      const token = jwt.sign({ owner: ownerResponseData }, "myAppSecretKey");
      return res.json({
        status: true,
        message: "OTP has been sent successfully",
        user: ownerResponseData,
        token,
        newUser: false
      });
    } else {
      const ownerData = await Owner.findOwnerByEmail(email);
      if (!ownerData) {
        return res.status(400).json({ status: false, message: "No owner with this email exists" });
      }

      if (ownerData.password !== password) {
        return res.status(400).json({ status: false, message: "Incorrect password" });
      }

      const token = jwt.sign({ owner: ownerData }, "myAppSecretKey");
      return res.json({
        status: true,
        message: "Successfully logged in",
        owner: ownerData,
        token,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "An error occurred during the login process" });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    let phoneNumber = req.query.phoneNumber;
    let otp = req.query.otp;
    let role = req.query.role;

    const response = await axios.get(
      `https://control.msg91.com/api/v5/otp/verify`,
      {
        params: { otp: otp, mobile: phoneNumber },
        headers: { authkey: process.env.MSG91_AUT_KEY },
      }
    );
    console.log("response.data-->", response.data.message, response.data.type);

    if (response.status == 200 && response.data.type == "success") {
      if(role==="owner"){
        let ownerData = await Owner.findOwnerByNumber(phoneNumber)
        const token = jwt.sign({ owner: ownerData }, 'myAppSecretKey');
        return res.status(200).json({ status: true, message: response.data.message,token });
      }
      res.status(200).json({ status: true, message: response.data.message });
    } else {
      res.status(200).json({ status: false, message: response.data.message });
    }
  } catch (error) {
    logger.info(error, "Error verifiying OTP");
    res.status(404).json({ status: false, message: "otp verification failed" });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    let phoneNumber = req.query.phoneNumber;
    let otp = req.query.otp;
    let role = req.query.role;

    const response = await axios.get(
      `https://control.msg91.com/api/v5/otp/verify`,
      {
        params: { otp: otp, mobile: phoneNumber },
        headers: { authkey: process.env.MSG91_AUT_KEY },
      }
    );
    console.log("response.data-->", response.data.message, response.data.type);

    if (response.status == 200 && response.data.type == "success") {
      if(role==="owner"){
        let ownerData = await Owner.findOwnerByNumber(phoneNumber)
        const token = jwt.sign({ owner: ownerData }, 'myAppSecretKey');
        return res.status(200).json({ status: true, message: response.data.message,token });
      }
      res.status(200).json({ status: true, message: response.data.message });
    } else {
      res.status(200).json({ status: false, message: response.data.message });
    }
  } catch (error) {
    logger.info(error, "Error verifiying OTP");
    res.status(404).json({ status: false, message: "otp verification failed" });
  }
};

exports.getParticularOwnerDetails = (req, res, next) => {
  const ownerId = req.params.ownerId;

  Owner.findOwnerByOwnerId(ownerId).then((ownerData) => {
    if (!ownerData) {
      return res
        .status(404)
        .json({ status: false, message: "No Owner with this ID exists" });
    }
    Studio.findStudioById(ownerData.studioId).then((studioData) => {
      ownerData.studioData = studioData;
      return res.json({
        status: true,
        message: "Owner Exists",
        owner: ownerData,
      });
    });
  });
};

exports.getAllOwners = (req, res, next) => {
  let skip = +req.query.skip;
  let limit = +req.query.limit;

  if (isNaN(skip)) {
    skip = 0;
    limit = 0;
  }

  Owner.fetchAllOwners(skip, limit).then((ownersData) => {
    let mappedOwners = [];
    let allOwners = ownersData.map(async (i) => {
      i.studioName = "";
      let studioData = await Studio.findStudioById(i.studioId);
      if (studioData != null) {
        i.studioName = studioData.fullName;
      }
      mappedOwners.push(i);
      if (mappedOwners.length == ownersData.length) {
        return res.json({
          status: true,
          message: "All Owners returned",
          owners: ownersData,
        });
      }
    });
  });
};

exports.getAllOwnersV2 = async (req, res) => {
  try {
    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;
    const skip = (page - 1) * limit;
    let { SearchText } = req.query;
    const filter = pick(req.query, ["firstName", "lastName", "email"]);
    if (filter.firstName) {
      filter.firstName = new RegExp(filter.firstName, "i");
    }
    if (filter.lastName) {
      filter.lastName = new RegExp(filter.lastName, "i");
    }
    if (filter.email) {
      filter.email = new RegExp(filter.email, "i");
    }
    const sortField = req.query.sortField;
    const sortDirection = req.query.sortDirection === "desc" ? -1 : 1;

    const sortStage = { [sortField]: sortDirection };
    let searching;
    if (SearchText) {
      searching = {
        $or: [
          { studioName: { $regex: SearchText, $options: "i" } },
          { studioCity: { $regex: SearchText, $options: "i" } },
        ],
      };
    }
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "studios",
          let: { studioIdStr: "$studioId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$studioIdStr" }] },
              },
            },
          ],
          as: "studioInfo",
        },
      },
      {
        $addFields: {
          studioName: { $arrayElemAt: ["$studioInfo.fullName", 0] },
          studioCity: { $arrayElemAt: ["$studioInfo.city", 0] },
        },
      },
      {
        $match: searching || {},
      },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          studioInfo: 0,
        },
      },
    ];

    if (sortField && sortDirection) {
      pipeline.push({ $sort: sortStage });
    }

    const ownerData = await Owner.fetchAllOwnersByAggregate(pipeline);

    // Get the total count for pagination calculation
    const db = getDb();
    const totalCountPipeline = [{ $match: filter }, { $count: "total" }];
    const totalCountResult = await db
      .collection("owners")
      .aggregate(totalCountPipeline)
      .toArray();
    const totalDocuments = totalCountResult[0]?.total || 0;
    const totalPages = Math.ceil(totalDocuments / limit);

    res.json({
      status: true,
      message: "All Owners returned",
      owners: ownerData,
      paginate: {
        page,
        limit,
        totalPages,
        totalResults: totalDocuments,
      },
    });
  } catch (error) {
    console.error("Error in /owners endpoint:", error.message);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

function checkStudioAvailability(ownerId, studioId, _callBack) {
  Owner.findOwnerByOwnerId(ownerId).then((ownerDoc) => {
    if (!ownerDoc) {
      _callBack(false, "No Owner with this ID exists");
      return;
    }
    Owner.findOwnerByStudioId(studioId).then((ownerNew) => {
      if (!ownerNew) {
        _callBack(true, "New Studio");
        return;
      } else if (ownerNew.studioId == ownerDoc.studioId) {
        _callBack(true, "Same Studio");
        return;
      } else if (ownerNew.studioId != ownerDoc.studioId) {
        _callBack(false, "Studio already used by another owner");
        return;
      }
    });
  });
}

exports.editOwnerDetails = (req, res, next) => {
  const ownerId = req.params.ownerId;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  const password = req.body.password;
  let studioId = req.body.studioId;

  Owner.findOwnerByOwnerId(ownerId).then((ownerDoc) => {
    if (!ownerDoc) {
      return res.json({ status: false, message: "Owner does not exist" });
    }
    if (studioId == undefined) {
      studioId = ownerDoc.studioId;
    }
    Owner.findOwnerByEmail(email).then((ownerNew) => {
      if (!ownerNew) {
        ownerDoc.firstName = firstName;
        ownerDoc.lastName = lastName;
        ownerDoc.password = password;
        ownerDoc.email = email;

        checkStudioAvailability(ownerId, studioId, (valStatus, valMsg) => {
          if (!valStatus) {
            return res.json({ status: false, message: valMsg });
          }
          ownerDoc.studioId = studioId;

          const db = getDb();
          var o_id = new ObjectId(ownerId);
          db.collection("owners")
            .updateOne({ _id: o_id }, { $set: ownerDoc })
            .then((resultData) => {
              return res.json({
                status: true,
                message: "Details updated successfully",
                owner: ownerDoc,
              });
            })
            .catch((err) => console.log(err));
        });
      } else if (ownerNew.email == ownerDoc.email) {
        ownerDoc.firstName = firstName;
        ownerDoc.lastName = lastName;
        ownerDoc.password = password;

        checkStudioAvailability(ownerId, studioId, (valStatus, valMsg) => {
          if (!valStatus) {
            return res.json({ status: false, message: valMsg });
          }
          ownerDoc.studioId = studioId;

          const db = getDb();
          var o_id = new ObjectId(ownerId);
          db.collection("owners")
            .updateOne({ _id: o_id }, { $set: ownerDoc })
            .then((resultData) => {
              return res.json({
                status: true,
                message: "Details updated successfully",
                owner: ownerDoc,
              });
            })
            .catch((err) => console.log(err));
        });
      } else if (ownerNew.email != ownerDoc.email) {
        return res.json({ status: false, message: "Email Already Exists" });
      }
    });
  });
};

exports.editOwnerImage = (req, res, next) => {
  const ownerId = req.params.ownerId;
  const ownerImage = req.body.ownerImage; //URL

  Owner.findOwnerByOwnerId(ownerId).then((ownerDoc) => {
    if (!ownerDoc) {
      return res.json({ status: false, message: "Owner does not exist" });
    }
    ownerDoc.ownerImage = ownerImage;

    const db = getDb();
    var o_id = new ObjectId(ownerId);
    db.collection("owners")
      .updateOne({ _id: o_id }, { $set: ownerDoc })
      .then((resultData) => {
        return res.json({
          status: true,
          message: "Image updated successfully",
          owner: ownerDoc,
        });
      })
      .catch((err) => console.log(err));
  });
};

exports.getAllDashboardCountsForOwner = (req, res, next) => {
  const ownerId = req.params.ownerId;

  Owner.findOwnerByOwnerId(ownerId).then((ownerData) => {
    if (!ownerData) {
      return res
        .status(404)
        .json({ status: false, message: "No owner with this ID exists" });
    }
    Studio.findStudioById(ownerData.studioId).then((studioData) => {
      if (!studioData) {
        return res.status(404).json({
          status: false,
          message: "No studio for this owner exists",
          users: 0,
          studios: 0,
          bookings: 0,
        });
      } else {
        const db = getDb();
        db.collection("transactions")
          .find({ studioId: ownerData.studioId })
          .count()
          .then((resData) => {
            db.collection("bookings")
              .find({ studioId: ownerData.studioId })
              .count()
              .then((resData1) => {
                return res.json({
                  status: true,
                  message: "All counts returned",
                  transactions: resData,
                  bookings: resData1,
                });
              });
          });
      }
    });
  });
};

exports.deleteParticularOwner = (req, res, next) => {
  const ownerId = req.params.ownerId;

  Owner.findOwnerByOwnerId(ownerId).then((ownerData) => {
    if (!ownerData) {
      return res
        .status(404)
        .json({ status: false, message: "No Owner with this ID exists" });
    }

    const db = getDb();
    var o_id = new ObjectId(ownerId);

    db.collection("owners")
      .deleteOne({ _id: o_id })
      .then((resultData) => {
        return res.json({
          status: true,
          message: "Owner deleted successfully",
        });
      })
      .catch((err) => console.log(err));
  });
};
