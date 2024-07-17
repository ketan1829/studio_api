const Owner = require("../models/owner");
const Studio = require("../models/studio");

const axios = require("axios");

const mongodb = require("mongodb");
const getDb = require("../util/database").getDB;
const pick = require("../util/pick");
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
  const email = req.body.email;
  const password = req.body.password;
  const { number, role, userType, deviceId } = req.body;

  if (userType === "NUMBER") {
    // Validate and format the phone number
    try {
      if (number.length < 10) {
        throw new Error("Phone number must be at least 10 digits long.");
      }
      if (!number.startsWith("+")) {
        number = `"+91" ${number}`;
      }
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    const ownerData = await Owner.findOwnerByNumber(number);

    if (!ownerData && role === "owner") {
      return res
        .status(500)
        .json({ message: `${role} not found, Try again later` });
    }

    if (ownerData && ownerData.role === "owner" && ownerData.phone == number) {
      const status_otp = await sendMsg91OTP(`${ownerData.phone}`);
      if (!status_otp.status) {
        return res.status(400).json({
          status: false,
          message: "Error while sending OTP to owner",
        });
      }

      const OwnerData = {
        id: ownerData.ownerId,
        fullName: ownerData.fullName || "",
        emailId: ownerData.email || "",
        Image: ownerData.adminImage || "",
        phoneNumber: ownerData.phone || "",
        role: ownerData.role || "",
      };

      const token = await jwt.sign({ user: OwnerData }, "myAppSecretKey");
      return res.json({
        status: true,
        message: "Hello Owner, OTP has been sent Successfully",
        user: OwnerData,
        token,
      });
    }
  } else {
    Owner.findOwnerByEmail(email).then((ownerData) => {
      if (!ownerData) {
        return res.json({
          status: false,
          message: "No Owner with this email exists",
        });
      }

      if (ownerData.password != password) {
        return res.json({ status: false, message: "Incorrect password" });
      }

      const db = getDb();
      db.collection("owners")
        .updateOne({ email: email }, { $set: ownerData })
        .then((resultData) => {
          jwt.sign({ owner: ownerData }, "myAppSecretKey", (err, token) => {
            res.json({
              status: true,
              message: "Successfully Logged In",
              owner: ownerData,
              token: token,
            });
          });
        })
        .catch((err) => console.log(err));
    });
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
