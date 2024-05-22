const User = require("../models/user");
const Admin = require("../models/admin");
const TempUser = require("../models/tempUsers");
const Studio = require("../models/studio");
const excelJS = require("exceljs");
const mongodb = require("mongodb");
const pick = require('../util/pick')
const getDb = require("../util/database").getDB;
const ObjectId = mongodb.ObjectId;
const path = require('path');
var crypto = require("crypto");
const jwt = require("jsonwebtoken");

const axios = require("axios");
var GeoPoint = require("geopoint");
const httpStatus = require("http-status");

//For Email
var nodemailer = require("nodemailer");
const { sendOTP, addContactBrevo, sendMsg91OTP } = require("../util/mail");
const { json } = require("express");
const { logger } = require("../util/logger");

const { send_mail } = require("../util/mail.js");


// Sendinblue library\
// const SibApiV3Sdk = require('sib-api-v3-sdk');
// let defaultClient = SibApiV3Sdk.ApiClient.instance;
// Instantiate the client\
// let apiKey = defaultClient.authentications['api-key'];

const secretKey = "myAppSecretKey";

//FOR ZOHO integration
let transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  secure: true,
  port: 465,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

function generateRandomCode(length) {
  // var length = 4,
  (charset = "123456789"), (token = "");
  for (var i = 0, n = charset.length; i < length; ++i) {
    token += charset.charAt(Math.floor(Math.random() * n));
  }
  return token;
}

exports.signupUser = async (req, res, next) => {
  const fullName = req.body.fullName.trim();
  const dateOfBirth = req.body.dateOfBirth;
  const email = req.body.email;
  const phone = req.body.phone;
  let password = req.body.password;
  const userType = req.body.userType;
  const deviceId = req.body.deviceId;
  const latitude = "";
  const longitude = "";
  const city = "";
  const state = "";
  const profileUrl = "";
  const gender = "";
  const favourites = [];

  if (userType == "EMAIL") {
    //Encrypting Password
    var hash = crypto.createHash("sha256");
    hash.update(password);
    password = hash.digest("hex");
  }

  User.findUserByEmail(email).then((userData) => {
    if (userData) {
      return res
        .status(409)
        .json({
          status: false,
          message: "User with this Email already exists",
        });
    }
    User.findUserByPhone(phone).then((userPhoneData) => {
      if (userPhoneData) {
        return res
          .status(409)
          .json({
            status: false,
            message: "User with this Phone already exists",
          });
      }

      const userObj = new User(
        fullName,
        dateOfBirth,
        email,
        phone,
        password,
        latitude,
        longitude,
        city,
        state,
        profileUrl,
        gender,
        userType,
        favourites,
        deviceId
      );

      //saving in database
      return userObj
        .save()
        .then((resultData) => {
          jwt.sign({ user: resultData["ops"][0] }, secretKey, (err, token) => {
            return res.json({
              status: true,
              message: "Signup successful",
              user: resultData["ops"][0],
              token: token,
            });
          });
        })
        .catch((err) => logger.info(err,"Error while signiing up user"));
    });
  });
};

exports.loginUserOTP2 = (req, res, next) => {
  logger.log("LOGIN-OTP", req.body);
  return res.json({ status: true, message: "Login-OTP" });
};

// ----------- Auth V 2.2.4 ------------------------

exports.signupUserV2 = async (req, res, next) => {
  try {
    const { fullName, userType, dateOfBirth, email, phoneNumber, deviceId, role } = req.body;

    // let phone = (phoneNumber.length > 10)? phoneNumber.slice(2) : `91${phoneNumber}`
    let phone = (phoneNumber.length == 10)? `91${phoneNumber}` : phoneNumber
    
    logger.info({ fullName, dateOfBirth, email, phone, deviceId });

    let _userData = await User.findUserByPhone(phone, 0, false);

    logger.info("REGISTER USER DATA", _userData);


    const user_data = {
      fullName: fullName.trim(),
      dateOfBirth,
      email,
      phone: phone,
      password: "",
      userType: userType || "NUMBER",
      deviceId,
      latitude: "",
      longitude: "",
      city: "",
      state: "",
      profileUrl: "",
      role: role || "user",
      gender: "",
      favourites: [],
      status: 1
    };

    const userObj = new User(user_data);

    if (_userData && _userData?.status==0) {
      const updated_user_data = {
        fullName: fullName.trim(),
        dateOfBirth,
        email,
        phone: phone,
        userType: userType || "NUMBER",
        deviceId,
        role: role || "user",
        status: 1
      }
      userObj._id = _userData._id;
      const udata = await User.update(phone, updated_user_data)
      console.log(udata ? `udata count:${udata?.matchedCount}` : "nottttt");
    } else {

      let _userData_active = await User.findUserByPhone(phone, 1);
      if (_userData_active) {

        const updated_user_data = {
          fullName: fullName.trim(),
          dateOfBirth,
          email,
          phone: phone,
          userType: userType || "NUMBER",
          deviceId,
          role: role || "user",
          status: 1
        }
        
        const udata = await User.update(phone, updated_user_data)
        userObj._id = _userData_active._id
        console.log(udata ? `update count:${udata?.matchedCount}` : "update failed");

      }else{

        // If user does not exist, create a new user
        await userObj.save();
        const {_id,creationTimeStamp} = await User.findUserByPhone(phone);
        userObj._id = _id
        userObj.creationTimeStamp = creationTimeStamp
        
        
        if (role === "user") {
          // Only add to Brevo if the role is 'user' and it's a new signup
          await addContactBrevo(userObj);
          console.log("Added to Brevo");
        }
      }

    }

    const token = jwt.sign({ user: userObj }, "myAppSecretKey");
    
    console.log("userObj:", userObj);
    return res.json({ status: true, message: "Signup successful", user: userObj, token });

  } catch (error) {
    console.error("Error in signupUserV2:", error);
    return res.status(500).json({ status: false, message: "Something went wrong, try again later" });
  }
};

exports.loginUserOTP = async (req, res, next) => {
  try {
    const { phoneNumber, deviceId, userType, role } = req.body;    
    logger.info({ phoneNumber, deviceId, userType, role });

    const userData = await User.findUserByPhone(phoneNumber,1,false);

    logger.info("DATA::::", userData);
    // console.log("DATA::::", userData);

    let statusInfo = { status: false, message: "something went wrong" };

    if (userType === "NUMBER") {

      // Admin/ Tester -- not found
      if (!userData && (role === "admin" || role === "tester")) {
        return res.status(500).json({ message: `${role} not found, Try again later` });
      }

      // ADMIN login
      if (userData && userData.role === "admin") {
        const AdminData = {
          id: userData.adminId,
          fullName: userData.fullName,
          emailId: userData.email,
          Image: userData.adminImage,
          phoneNumber: userData.phone,
          role: userData.role,
        };
        // console.log(">------",AdminData.phoneNumber);
        const token = await jwt.sign({ user: AdminData }, secretKey);
        return res.json({
          status: true,
          message: "Hello Admin, OTP has been send Succesfully",
          user: AdminData,
          token,
        });
      }

      // Test User login
      if (userData && userData.role === "tester") {

        if (deviceId) {
          userData.deviceId = deviceId;
          await User.update(phoneNumber, { deviceId: deviceId });
        }
        const token = jwt.sign({ user: userData }, secretKey);
        statusInfo.role = "tester";
        statusInfo.token = token;
        statusInfo.newUser = false;
        statusInfo.status = true;
        statusInfo.user = userData;
        statusInfo.role = "tester"
        statusInfo.message = "Welcome Tester, OTP has been send Succesfully.";
        return res.status(200).json(statusInfo);
      }
      // New User
      if (!userData || userData?.status == 0) {
        console.log("new user=======");
        const status_otp = await sendMsg91OTP(`${phoneNumber}`)
        statusInfo.newUser = true;
        statusInfo.status = status_otp.status;
        statusInfo.user = {
          "_id": "",
          "fullName": "",
          "dateOfBirth": "",
          "email": "",
          "phone": "",
          "password": "",
          "latitude": "",
          "longitude": "",
          "city": "",
          "state": "",
          "profileUrl": "",
          "gender": "",
          "userType": "NUMBER",
          "favourites": [],
          "deviceId": "",
          "role": "user"
        };
        statusInfo.role = "user";
        statusInfo.message = status_otp.status?"OTP has been send Succesfully":"OTP sent failed !";
        return res.status(200).json(statusInfo);
      }
      // Existing User Login
      else {
        console.log("ELESEEEE");
        const status_otp = await sendMsg91OTP(`${phoneNumber}`)
        if (deviceId) {
          userData.deviceId = deviceId;
          await User.update(phoneNumber, { deviceId: deviceId });
        }
        const token = jwt.sign({ user: userData }, secretKey);
        statusInfo.token = token;
        statusInfo.role = userData.role || "user";
        statusInfo.message = status_otp.status?"Welcome back, OTP has been send Succesfully":"OTP sent failed !";
        statusInfo.newUser = false;
        statusInfo.status = status_otp.status;
        statusInfo.user = userData;
        return res.status(200).json(statusInfo);
      }
    }
    return res.status(200).json(statusInfo);

  } catch (error) {
    logger.error(error,"Error in loginUserOTP:");
    return res.status(500).json({ message: "Please try after some time" });
  }
};

// -----------------------------------------------

exports.TestloginUserOTP = async (req, res, next) => {
  try {
    const { phoneNumber, deviceId, userType } = req.body;
    const fullName = "";
    const dateOfBirth = "";
    const email = "";
    const password = "";
    const latitude = "";
    const longitude = "";
    const city = "";
    const state = "";
    const profileUrl = "";
    const gender = "";
    const favourites = [];

    const statusInfo = {
      status: false,
      message: "something went wrong, try again",
    };

    const userData = await User.findUserByPhone(phoneNumber);

    logger.info("userdata ==========>", userData);

    if (userType === "NUMBER") {
      const token = generateRandomCode(4);
      logger.info("test mobile otp:", token);
      statusInfo.message = "Test OTP sent successfully";
      statusInfo.otp = token;
      statusInfo.status = true;
    }

    if (userData) {
      const db = getDb();
      userData.deviceId = deviceId;
      await db
        .collection("users")
        .updateOne({ phone: phoneNumber }, { $set: userData });
      const token = await jwt.sign({ user: userData }, secretKey);
      statusInfo.status = true;
      statusInfo.newUser = false;
      statusInfo.user = userData;
      statusInfo.token = token;
    }

    if (!userData && userType === "NUMBER") {
      statusInfo.newUser = true;
      const userObj = new User(
        fullName,
        dateOfBirth,
        email,
        phoneNumber,
        password,
        latitude,
        longitude,
        city,
        state,
        profileUrl,
        gender,
        userType,
        favourites,
        deviceId
      );
      const resultData = await userObj.save();
      statusInfo.status = true;
      statusInfo.user = resultData["ops"][0];
    }

    return res.json(statusInfo);
  } catch (err) {
    logger.error(err,"Error in TestloginUserOTP");
    return res.status(200).json({ message: "Please try after some Time" });
  }
};

exports.loginUser = (req, res, next) => {
  const email = req.body.email;
  let password = req.body.password;
  const deviceId = req.body.deviceId;
  const userType = req.body.userType;

  User.findUserByEmail(email).then(async (userData) => {
    if (!userData) {
      return res
        .status(404)
        .json({ status: false, message: "No User with this email exists" });
    }

    if (userData.userType != userType) {
      return res.json({
        status: false,
        message: userData.userType + " login required for this user",
      });
    }

    if (userType == "EMAIL") {
      //Encrypting Password
      var hash = crypto.createHash("sha256");
      hash.update(password);
      password = hash.digest("hex");

      if (userData.password != password) {
        return res
          .status(401)
          .json({ status: false, message: "Incorrect password" });
      }
    }

    userData.deviceId = deviceId;

    const db = getDb();
    db.collection("users")
      .updateOne({ email: email }, { $set: userData })
      .then((resultData) => {
        jwt.sign({ user: userData }, 'myAppSecretKey', (err, token) => {
          res.json({
            status: true,
            message: "Successfully Logged In",
            user: userData,
            token: token,
          });
        });
      })
      .catch((err) => logger.error(err,"  Error in loginUser"));
  });
};

exports.sendSignUpOtp = (req, res, next) => {

  const email = req.body.email;
  const phone = req.body.phone;

  User.findUserByEmail(email).then((userData) => {
    if (userData) {
      return res
        .status(409)
        .json({ status: false, message: "User already exist with this email" });
    }
    User.findUserByPhone(phone).then((userDataPhone) => {
      if (userDataPhone) {
        return res
          .status(409)
          .json({
            status: false,
            message: "User already exist with this phone",
          });
      }
      let token = generateRandomCode(4);
      logger.info("phone token otp :", token);
      // let token = "123456";
      //send OTP to both email and OTP
      //To Phone
      axios
        .get(
          "https://www.fast2sms.com/dev/bulkV2?authorization=" +
          process.env.FAST2SMS_AUTH_KEY +
          "&variables_values" +
          token +
          "&route=otp&numbers=" +
          phone
        )
        .then(function (response) {
          if (
            response.data != undefined &&
            response.data.return == true &&
            response.data.message[0] == "SMS sent successfully."
          ) {
            // return res.json({status:true, message:"OTP sent successfully", otp:token});
            //Send OTP to EMAIL
            const mailOptions = {
              from: process.env.ZOHO_USER, // sender address
              to: email,
              subject: "Choira Studio | Email verification OTP",
              html: "You requested for account signup. Your Token : " + token, // plain text body
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                logger.error(error);
                return res.json({
                  status: false,
                  message: "Error Occured",
                  error: error,
                });
              } else {
                logger.error("Email sent: " + info.response);
                return res.json({
                  status: true,
                  message: "OTP sent successfully",
                  otp: token,
                });
              }
            });
          } else {
            return res
              .status(400)
              .json({ status: false, message: "OTP not sent" });
          }
        });
    });
  });
};



exports.getAllUsers = async (req, res) => {
  try {
    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;

    let { searchUser, startDate, endDate } = req.query;
    let filter = pick(req.query, ["status"]);

    let sortfield = req.query.sortfield ? req.query.sortfield : "creationTimeStamp"
    let sortDirection = req.query.sortDirection === 'asc' ? 1 : -1;

    if (filter.status) filter.status = parseInt(filter.status);
    let searching;
    if (searchUser) {
      searching = {
        $or: [
          { fullName: { $regex: searchUser, $options: "i" } },
          { email: { $regex: searchUser, $options: "i" } },
          { phone: { $regex: searchUser, $options: "i" } },
        ],
      };
    }

    let pipeline = [
      { "$match": searching || {} },
      { "$match": filter },
    ];

    if (startDate && endDate) {
      pipeline.push({
        $match: {
          creationTimeStamp : {$gte:new Date(startDate+"T00:00:00"), $lt:new Date(endDate+"T23:59:59")}
        },
      });
    }

    const sortobj = { [sortfield]: +sortDirection };
    if (sortfield && sortDirection) {
      const sortStage = { $sort: sortobj };
      pipeline.push(sortStage);
    }

    if (page) {
      const skipStage = { $skip: (parseInt(page) - 1) * parseInt(limit) };
      pipeline.push(skipStage);
    }
    if (limit) {
      const limitStage = { $limit: parseInt(limit) };
      pipeline.push(limitStage);
    }
    let users = await User.fetchAllUsersByAggregate(pipeline);
    const db = getDb();
    const totalCountPipeline = [
      { "$match": searching || {} },
      { "$match": filter },
      { "$count": 'total' }
    ];
    const totalCountResult = await db.collection('users').aggregate(totalCountPipeline).toArray();
    const totalDocuments = totalCountResult[0]?.total || 0;
    const totalPages = Math.ceil(totalDocuments / limit);

    res.json({
      status: true,
      message: "Available Users returned",
      users: users,
      paginate: {
        page,
        limit,
        totalPages,
        totalResults: totalDocuments
      }
    });
  } catch (error) {
    logger.error(error, "Error while getting all users");
    res.status(500).json({
      status: false,
      message: "Error occurred while fetching users"
    });
  }
};






exports.getParticularUserDetails = (req, res, next) => {
  const userId = req.params.userId;

  console.log("userId===>",req.query);

  User.findUserByUserId(userId).then((userData) => {
    if (!userData) {
      return res
        .status(404)
        .json({ status: false, message: "No User with this ID exists" });
    }
    return res.json({ status: true, message: "User Exists", user: userData });
  });
};

exports.addEditUserLocation = (req, res, next) => {
  const userId = req.params.userId;

  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const city = req.body.city;
  const state = req.body.state;

  User.findUserByUserId(userId).then((userData) => {
    if (!userData) {
      return res
        .status(404)
        .json({ status: false, message: "No User with this ID exists" });
    }

    userData.latitude = latitude;
    userData.longitude = longitude;
    userData.city = city;
    userData.state = state;

    const db = getDb();
    var o_id = new ObjectId(userId);

    db.collection("users")
      .updateOne({ _id: o_id }, { $set: userData })
      .then((resultData) => {
        jwt.sign({ user: userData }, secretKey, (err, token) => {
          return res.json({
            status: true,
            message: "User location updated successfully",
            user: userData,
            token: token,
          });
        });
      })
      .catch((err) => logger.error(err));
  });
};

exports.editUserProfile = (req, res, next) => {
  const userId = req.params.userId;

  const fullName = req.body.fullName;
  const dateOfBirth = req.body.dateOfBirth;
  const profileUrl = req.body.profileUrl;
  const gender = req.body.gender;

  User.findUserByUserId(userId).then((userData) => {
    if (!userData) {
      return res
        .status(404)
        .json({ status: false, message: "No User with this ID exists" });
    }

    userData.fullName = fullName;
    userData.dateOfBirth = dateOfBirth;
    userData.profileUrl = profileUrl;
    userData.gender = gender;

    const db = getDb();
    var o_id = new ObjectId(userId);

    db.collection("users")
      .updateOne({ _id: o_id }, { $set: userData })
      .then((resultData) => {
        jwt.sign({ user: userData }, secretKey, (err, token) => {
          return res.json({
            status: true,
            message: "User details updated successfully",
            user: userData,
            token: token,
          });
        });
      })
      .catch((err) => logger.error(err));
  });
};

exports.sendEmailOtpForEdit = (req, res, next) => {
  const email = req.body.email;

  let token = generateRandomCode(6);
  // let token = "123456";

  User.findUserByEmail(email).then((userData) => {
    if (userData) {
      return res
        .status(409)
        .json({
          status: false,
          message: "User with this Email already exists",
        });
    }
    // return res.json({status:true, message:"OTP sent successfully", otp:token});
    const mailOptions = {
      from: process.env.ZOHO_USER, // sender address
      to: email,
      subject: "Choira Studio | Email verification OTP",
      html: "You requested for email verification. Your Token : " + token, // plain text body
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        logger.error(error);
        return res.json({
          status: false,
          message: "Error Occured",
          error: error,
        });
      } else {
        logger.error("Email sent: " + info.response);
        return res.json({
          status: true,
          message: "OTP sent successfully",
          otp: token,
        });
      }
    });
  });
};

function checkEmailAvailability(userId, email, _callBack) {
  User.findUserByUserId(userId).then((userDoc) => {
    if (!userDoc) {
      _callBack(false, "No user with this ID exists");
      return;
    }
    User.findUserByEmail(email).then((userNew) => {
      if (!userNew) {
        _callBack(true, "New Email");
        return;
      } else if (userNew.email == userDoc.email) {
        _callBack(true, "Same Email");
        return;
      } else if (userNew.email != userDoc.email) {
        _callBack(false, "Email already used by another user");
        return;
      }
    });
  });
}

exports.editUserEmail = (req, res, next) => {
  const userId = req.params.userId;
  const email = req.body.email;

  User.findUserByUserId(userId).then((userData) => {
    if (!userData) {
      return res.json({
        status: false,
        message: "No User with this ID exists",
      });
    }
    checkEmailAvailability(userId, email, (valStatus, valMsg) => {
      if (!valStatus) {
        return res.json({ status: false, message: valMsg });
      }
      userData.email = email;

      const db = getDb();
      var o_id = new ObjectId(userId);
      db.collection("users")
        .updateOne({ _id: o_id }, { $set: userData })
        .then((resultData) => {
          jwt.sign({ user: userData }, secretKey, (err, token) => {
            res.json({
              status: true,
              message: "Email updated successfully",
              user: userData,
              token: token,
            });
          });
        })
        .catch((err) => logger.error(err));
    });
  });
};

exports.sendPhoneOtpForEdit = (req, res, next) => {

  const phone = req.body.phone;

  let token = generateRandomCode(6);
  // let token = "123456";

  User.findUserByPhone(phone).then((userData) => {
    if (userData) {
      return res
        .status(409)
        .json({
          status: false,
          message: "User with this Phone already exists",
        });
    }
    // return res.json({status:true, message:"OTP sent successfully", otp:token});
    axios
      .get(
        "https://www.fast2sms.com/dev/bulkV2?authorization=" +
        process.env.FAST2SMS_AUTH_KEY +
        "&variables_values" +
        token +
        "&route=otp&numbers=" +
        phone
      )
      .then(function (response) {
        if (
          response.data != undefined &&
          response.data.return == true &&
          response.data.message[0] == "SMS sent successfully."
        ) {
          return res.json({
            status: true,
            message: "OTP sent successfully",
            otp: token,
          });
        } else {
          return res
            .status(400)
            .json({ status: false, message: "OTP not sent" });
        }
      });
  });
};

function checkPhoneAvailability(userId, phone, _callBack) {
  User.findUserByUserId(userId).then((userDoc) => {
    if (!userDoc) {
      _callBack(false, "No user with this ID exists");
      return;
    }
    User.findUserByPhone(phone).then((userNew) => {
      if (!userNew) {
        _callBack(true, "New phone");
        return;
      } else if (userNew.phone == userDoc.phone) {
        _callBack(true, "Same phone");
        return;
      } else if (userNew.phone != userDoc.phone) {
        _callBack(false, "Phone already used by another user");
        return;
      }
    });
  });
}

exports.editUserPhone = (req, res, next) => {
  const userId = req.params.userId;
  const phone = req.body.phone;

  User.findUserByUserId(userId).then((userData) => {
    if (!userData) {
      return res.json({
        status: false,
        message: "No User with this ID exists",
      });
    }
    checkPhoneAvailability(userId, phone, (valStatus, valMsg) => {
      if (!valStatus) {
        return res.json({ status: false, message: valMsg });
      }
      userData.phone = phone;

      const db = getDb();
      var o_id = new ObjectId(userId);
      db.collection("users")
        .updateOne({ _id: o_id }, { $set: userData })
        .then((resultData) => {
          jwt.sign({ user: userData }, secretKey, (err, token) => {
            res.json({
              status: true,
              message: "Phone updated successfully",
              user: userData,
              token: token,
            });
          });
        })
        .catch((err) => logger.error(err));
    });
  });
};

exports.editUserPasswordDetails = (req, res, next) => {
  const userId = req.params.userId;

  let currentPassword = req.body.currentPassword;
  let newPassword = req.body.newPassword;

  //Encrypting Password
  var hash = crypto.createHash("sha256");
  hash.update(currentPassword);
  currentPassword = hash.digest("hex");

  var hash = crypto.createHash("sha256");
  hash.update(newPassword);
  newPassword = hash.digest("hex");

  User.findUserByUserId(userId).then((userData) => {
    if (!userData) {
      return res
        .status(404)
        .json({ status: false, message: "No User with this ID exists" });
    }

    if (userData.password != currentPassword) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Please enter valid current password",
        });
    }

    if (currentPassword == newPassword) {
      return res
        .status(400)
        .json({
          status: false,
          message: "New password should not be same as old password",
        });
    }

    userData.password = newPassword;

    const db = getDb();
    var o_id = new ObjectId(userId);

    db.collection("users")
      .updateOne({ _id: o_id }, { $set: userData })
      .then((resultData) => {
        jwt.sign({ user: userData }, secretKey, (err, token) => {
          return res.json({
            status: true,
            message: "Password changed successfully",
            user: userData,
            token: token,
          });
        });
      })
      .catch((err) => logger.error(err));
  });
};

exports.sendForgotPasswordOtp = (req, res, next) => {
  const identity = req.body.identity;
  const identityType = +req.body.identityType; //0-> Email, 1-> Phone

  let token = generateRandomCode(6);
  // let token = "123456";

  if (identityType == 0) {
    User.findUserByEmail(identity).then((userData) => {
      if (!userData) {
        return res
          .status(404)
          .json({ status: false, message: "No User exists with this email" });
      }
      // return res.json({status:true, message:"OTP sent successfully", otp:token});
      const mailOptions = {
        from: process.env.ZOHO_USER, // sender address
        to: identity,
        subject: "Choira Studio | Password Reset OTP",
        html: "You requested a password reset. Your Token : " + token, // plain text body
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          logger.error(error);
          return res.json({
            status: false,
            message: "Error Occured",
            error: error,
          });
        } else {
          logger.error("Email sent: " + info.response);
          return res.json({
            status: true,
            message: "OTP sent successfully",
            otp: token,
          });
        }
      });
    });
  } else if (identityType == 1) {
    User.findUserByPhone(identity).then((userData) => {
      if (!userData) {
        return res
          .status(404)
          .json({ status: false, message: "No User exists with this phone" });
      }
      axios
        .get(
          "https://www.fast2sms.com/dev/bulkV2?authorization=" +
          process.env.FAST2SMS_AUTH_KEY +
          "&variables_values" +
          token +
          "&route=otp&numbers=" +
          identity
        )
        .then(function (response) {
          if (
            response.data != undefined &&
            response.data.return == true &&
            response.data.message[0] == "SMS sent successfully."
          ) {
            return res.json({
              status: true,
              message: "OTP sent successfully",
              otp: token,
            });
          } else {
            return res
              .status(400)
              .json({ status: false, message: "OTP not sent" });
          }
        });
    });
  } else {
    return res
      .status(400)
      .json({ status: false, message: "Enter valid identity type" });
  }
};

exports.editUserPassword = (req, res, next) => {
  const identity = req.body.identity;
  const identityType = +req.body.identityType; //0-> Email, 1-> Phone
  let newPassword = req.body.newPassword;

  //Encrypting Password
  var hash = crypto.createHash("sha256");
  hash.update(newPassword);
  newPassword = hash.digest("hex");

  const db = getDb();

  if (identityType == 0) {
    User.findUserByEmail(identity).then((userData) => {
      if (!userData) {
        return res
          .status(404)
          .json({ status: false, message: "No User exists with this email" });
      }

      if (userData.password == newPassword) {
        return res
          .status(409)
          .json({
            status: false,
            message: "New password must not be same as old password",
          });
      }

      //Update password
      userData.password = newPassword;

      db.collection("users")
        .updateOne({ email: identity }, { $set: userData })
        .then((resultData) => {
          return res.json({
            status: true,
            message: "Password updated successfully",
            user: userData,
          });
        })
        .catch((err) => logger.error(err));
    });
  } else if (identityType == 1) {
    User.findUserByPhone(identity).then((userData) => {
      if (!userData) {
        return res
          .status(404)
          .json({ status: false, message: "No User exists with this phone" });
      }
      //Update password
      userData.password = newPassword;

      db.collection("users")
        .updateOne({ phone: identity }, { $set: userData })
        .then((resultData) => {
          return res.json({
            status: true,
            message: "Password updated successfully",
            user: userData,
          });
        })
        .catch((err) => logger.error(err));
    });
  } else {
    return res
      .status(400)
      .json({ status: false, message: "Enter valid identity type" });
  }
};

exports.addRemoveUserFavourites = (req, res, next) => {
  const userId = req.body.userId;
  const studioId = req.body.studioId;

  User.findUserByUserId(userId).then((userData) => {
    if (!userData) {
      return res
        .status(404)
        .json({ status: false, message: "No User with this ID exists" });
    }

    if (studioId != undefined) {
      Studio.findStudioById(studioId).then((studioData) => {
        if (!studioData) {
          return res
            .status(404)
            .json({ status: false, message: "No Studio with this ID exists" });
        }

        let resMsg = "";
        const index = userData.favourites.findIndex((i) => i == studioId);
        if (index != -1) {
          //remove from array
          userData.favourites.splice(index, 1);
          resMsg = "Studio removed from favourites";
        } else {
          //add to array
          userData.favourites.push(studioId);
          resMsg = "Studio added to favourites";
        }

        const db = getDb();
        var o_id = new ObjectId(userId);

        db.collection("users")
          .updateOne({ _id: o_id }, { $set: userData })
          .then((resultData) => {
            if (userData.favourites.length == 0) {
              return res.json({
                status: true,
                message: resMsg,
                user: userData,
                allFavourites: [],
              });
            } else {
              let mappedFavourites = [];
              let count = 0;
              let allFavourites = userData.favourites.map(async (f) => {
                let studioData = await Studio.findStudioById(f);
                if (studioData != null) {
                  mappedFavourites.push(studioData);
                }
                count = count + 1;
                if (count == userData.favourites.length) {
                  return res.json({
                    status: true,
                    message: resMsg,
                    user: userData,
                    allFavourites: mappedFavourites,
                  });
                }
              });
            }
          })
          .catch((err) => logger.error(err));
      });
    } else {
      return res.json({
        status: true,
        message: "User data returned",
        user: userData,
      });
    }
  });
};

exports.getAllFavourites = (req, res, next) => {
  const userId = req.params.userId;

  User.findUserByUserId(userId).then((userData) => {
    if (!userData) {
      return res
        .status(404)
        .json({ status: false, message: "No User with this ID exists" });
    }

    if (userData.favourites.length == 0) {
      return res.json({
        status: true,
        message: "All favourites returned",
        favourites: [],
      });
    } else {
      let mappedFavourites = [];
      let count = 0;
      let allFavourites = userData.favourites.map(async (f) => {
        let studioData = await Studio.findStudioById(f);
        if (studioData != null) {
          mappedFavourites.push(studioData);
        }
        count = count + 1;
        if (count == userData.favourites.length) {
          return res.json({
            status: true,
            message: "All favourites returned",
            favourites: mappedFavourites,
          });
        }
      });
    }
  });
};

exports.deleteParticularUser = (req, res, next) => {
  const userId = req.params.userId;

  User.findUserByUserId(userId).then(async(userData) => {
    if (!userData) {
      return res
        .status(404)
        .json({ status: false, message: "No User with this ID exists" });
    }

    const db = getDb();
    var o_id = new ObjectId(userId);

   await db.collection("userdeleterequests").insertOne({phone:userData.phone,email:userData.email, creationTimeStamp: new Date(), userId:userData._id})
   await db.collection("users")
      .updateOne({ _id: o_id }, { $set: { status: 0 } })
      .then((resultData) => {
        return res.json({ status: true, message: "User deleted successfully" });
      })
      .catch((err) => logger.error(err));
  });
};

exports.getAllDashboardCount = (req, res, next) => {
  const db = getDb();
  db.collection("users")
    .count()
    .then((resData) => {
      db.collection("studios")
        .count()
        .then((resData1) => {
          db.collection("bookings")
            .count()
            .then((resData2) => {
              return res.json({
                status: true,
                message: "All counts returned",
                users: resData,
                studios: resData1,
                bookings: resData2,
              });
            });
        });
    });
};

exports.getAllUsersGraphDetails = (req, res, next) => {
  var today = new Date();
  // var today = new Date();
  var d;
  var months = [];
  var d = new Date();
  var month;
  var year = d.getFullYear();
  // console.log(year)

  //for last 6 months(including current month)
  // for(var i = 5; i > -1; i -= 1) {
  var keyData = 1;
  //for last 6 months(excluding current month)
  for (var i = 6; i > 0; i -= 1) {
    d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    //   console.log(d.getFullYear())

    months.push({
      month: d.getMonth(),
      year: d.getFullYear(),
      key: keyData,
      userCount: 0,
    });
    keyData = keyData + 1;
  }
  logger.info(months);

  User.fetchAllUsers(0, 0).then((usersData) => {
    usersData.forEach((user) => {
      // console.log(user.creationTimeStamp);
      var dt1 = new Date(user.creationTimeStamp);
      var monthOnly = dt1.getMonth();

      months.forEach((mth) => {
        if (+mth.month == +monthOnly) {
          mth.userCount = mth.userCount + 1;
        }
      });
    });

    setTimeout(() => {
      months.forEach((mthData) => {
        if (mthData.month == 0) {
          mthData.month = "January";
        }
        if (mthData.month == 1) {
          mthData.month = "Febuary";
        }
        if (mthData.month == 2) {
          mthData.month = "March";
        }
        if (mthData.month == 3) {
          mthData.month = "April";
        }
        if (mthData.month == 4) {
          mthData.month = "May";
        }
        if (mthData.month == 5) {
          mthData.month = "June";
        }
        if (mthData.month == 6) {
          mthData.month = "July";
        }
        if (mthData.month == 7) {
          mthData.month = "August";
        }
        if (mthData.month == 8) {
          mthData.month = "September";
        }
        if (mthData.month == 9) {
          mthData.month = "Ocober";
        }
        if (mthData.month == 10) {
          mthData.month = "November";
        }
        if (mthData.month == 11) {
          mthData.month = "December";
        }
      });

      months.sort((a, b) => {
        return a.key - b.key;
      });

      //retrieving only months
      var allMonths = [];
      months.forEach((m) => {
        allMonths.push(m.month);
      });

      //retrieving only userCounts
      var allUserCounts = [];
      months.forEach((m) => {
        allUserCounts.push(m.userCount);
      });

      res.json({
        status: true,
        message: "All data returned",
        allMonths: allMonths,
        allUserCounts: allUserCounts,
        allData: months,
      });
    }, 1000);
  });
};

exports.getUserNearyByLocations = async (req, res, next) => {
  const latitude = 19.1196773;
  const longitude = 72.9050809;
  const range = 100;
  var point1 = new GeoPoint(+latitude, +longitude);
  logger.info("point1", point1);
  return res.json({ msg: "near by places" });
};

exports.exportUserData = async (req, res) => {
  try {
    const filter = pick(req.query, ['dateOfBirth', 'userType', 'role']); // {startDate: 2022-19-01}
    const options = pick(req.query, ['sort', 'limit', 'gender', 'startDate', 'endDate', 'page', 'sortfield', 'sortvalue']); // {}
    const pipeline = []

    if (Object.keys(filter).length) {
      pipeline.push(
        {
          $match: filter,
        }
      )
    }


    logger.info("this is pipe======>",pipeline);
      if (options.startDate && options.endDate) {
        let startDate=options.startDate
        let endDate=options.endDate
        pipeline.push({
          $match: {
            creationTimeStamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
          },
        });
      }



    const sortobj = { [options.sortfield]: +options.sortvalue }

    if (options.sortfield) {
      const sortStage = {
        $sort: sortobj
      };
      pipeline.push(sortStage);
    }


    if (options.limit) {
      const limitStage = {
        $limit: parseInt(options.limit),
      };
      pipeline.push(limitStage);
    }

    if (options.page) {
      const skipStage = {
        $skip: (parseInt(options.page) - 1
        ) * parseInt(options.limit),
      };
      pipeline.push(skipStage);
    }
    console.log(JSON.stringify(pipeline))
    let allUser;
    if (filter || options) {
      allUser = await User.fetchAllUsersByAggregate(pipeline)
    } else {
      allUser = await User.fetchAllUsers(0, 0);
    }
    // console.log(JSON.stringify(pipeline))
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("userData");
    const mypath = "./files";
    worksheet.columns = [
      { header: "S no.", key: "s_no", width: 10 },
      //   { headers: "Id", key: "_id", width: 10 },
      { header: "fullName", key: "fullName", width: 10 },
      { header: "dateOfBirth", key: "dateOfBirth", width: 10 },
      { header: "email", key: "email", width: 10 },
      { header: "phone", key: "phone", width: 10 },
      //   { header: "password", key: "password", width: 10 },
      { header: "latitude", key: "latitude", width: 10 },
      { header: "longitude", key: "longitude", width: 10 },
      { header: "city", key: "city", width: 10 },
      { header: "state", key: "state", width: 10 },
      { header: "profileUrl", key: "profileUrl", width: 10 },
      { header: "gender", key: "gender", width: 10 },
      //   { header: "userType", key: "userType", width: 10 },
      { header: "favourites", key: "favourites", width: 10 },
      //   { header: "deviceId", key: "deviceId", width: 10 },
      { header: "creationTimeStamp", key: "creationTimeStamp", width: 10 },
    ];

    let counter = 1;
    await allUser.forEach((user) => {
      user.s_no = counter;
      worksheet.addRow(user);
      counter++;
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    // return res.status(200).json({status:true,"no_of_users":allUser.length,message:"All Users", All_User:allUser})
    const data = await workbook.xlsx
      .writeFile(`C:/Users/Choira Dev 2/Desktop/studio_api/files/users.xlsx`)
      .then(() => {
        res.header({"Content-disposition" : "attachment; filename=users.xlsx" ,"Content-Type" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}).sendFile("users.xlsx", {root: `C:/Users/Choira Dev 2/Desktop/studio_api/files`}, function (err) {
          if (err) {
              logger.error(err,'Error sending file');
          } else {
            logger.info({
                status: "success",
                message: "file successfully downloaded",
                path: `${mypath}/users.xlsx`
              });
          }
        })
      });
  } catch (error) {
    logger.error(error)
    res.send({
      status: "error",
      message: "Something went wrong",
      error: error.message
    });
  }
};



exports.sendOTP2 =  async (req,res)=> {
  try {
      const db = getDb();
      console.log("object");
      let phoneNumber = req.body.phoneNumber
      // let otp = req.query.otp
      let userData = await db.collection("users").findOne({phone:phoneNumber})
      if(!userData){
        return res.status(200).json({status:false, message:"User not found"})
      }
      if(userData.status===0){
        return res.status(200).json({status:false, message:"User is already deleted"})
      }
      console.log('phoneNumber=>',phoneNumber);
      var options = {
        method: 'POST',
        url: 'https://control.msg91.com/api/v5/otp',
        params: {
          template_id: process.env.MSG91_TEMP_ID, // '6603b39dd6fc051f716ee0a3',
          mobile: phoneNumber,
          authkey: process.env.MSG91_AUT_KEY,
          // otp: otp,
           otp_length: '4',
          otp_expiry: '10'
        },
        headers: {'Content-Type': 'application/JSON'}
      };
      axios.request(options).then(function (response) {
        console.log("DATA--->",response.data);
        if (response.data.type === 'success') {
          res.status(200).json({ status: true , message :"otp successfully sent", userId:userData._id })
        } else {
            res.status(404).json({ status: false , message :"otp sending failed" })
        }
        }).catch(function (error) {
          console.error("Error sending OTP:", error);
          res.status(404).json({ status: false , message :"otp sending failed" })
        });
  } catch (error) {
      logger.error( error,"Error sending OTP",);
      res.status(404).json({ status: false , message :"otp sending failed" })
  }
}

exports.verifyOTP = async (req,res)=> {
  try {
      let phoneNumber = req.query.phoneNumber
      let otp = req.query.otp
      const response = await axios.get(`https://control.msg91.com/api/v5/otp/verify`, {
          params: {otp:otp, mobile: phoneNumber},
          headers: {authkey: process.env.MSG91_AUT_KEY}
      });
      console.log("response.data-->", response.data.message,response.data.type);
      if (response.status == 200 && response.data.type == "success") {
          res.status(200).json({ status: true , message :response.data.message })
      } else {
          res.status(200).json({ status: false , message :response.data.message })
      }
  } catch (error) {
      logger.info(error,"Error verifiying OTP" );
      res.status(404).json({ status: false , message :"otp verification failed" })
  }
}

