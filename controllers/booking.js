const Booking = require("../models/booking");
const Studio = require("../models/studio");
const Service = require("../models/service");
const User = require("../models/user");
const Rating = require("../models/rating");
const Notifications = require("../models/notifications");
const AdminNotifications = require("../models/adminNotifications");
const Admin = require("../models/admin");
const SubAdmin = require("../models/subAdmin");
const Owner = require("../models/owner");
const excelJS = require("exceljs");

const cron = require("node-cron");
const axios = require("axios");

const mongodb = require("mongodb");
const getDb = require("../util/database").getDB;
const ObjectId = mongodb.ObjectId;

const jwt = require("jsonwebtoken");

const { send_mail } = require("../util/mail.js");
const pick = require("../util/pick");
const { getLogger } = require("nodemailer/lib/shared");
const { logger } = require("../util/logger");
const { json } = require("body-parser");
const moment = require("moment-timezone");
const { registerOfflineUser } = require("./user.js");

function convertTo24HourFormat(time12h) {
  const [time, modifier] = time12h.split(" ");

  let [hours, minutes] = time.split(":");

  if (hours === "12") {
    hours = "00";
  }

  if (modifier === "PM") {
    hours = parseInt(hours, 10) + 12;
  }

  return `${hours}:${minutes}`;
}

// get bookings function --------------------
async function mapBooking(booking) {
  const mappedBooking = { ...booking._doc };
  mappedBooking.studioName = "";
  const studioInfo = await Studio.findStudioById(booking.studioId);
  if (studioInfo) {
    mappedBooking.studioName = studioInfo.fullName;
  }
  mappedBooking.userType = "";

  let userData = await User.findUserByUserId(booking.userId);
  if (userData) {
    mappedBooking.userName = userData.fullName;
    mappedBooking.userEmail = userData.email;
    mappedBooking.userPhone = userData.phone;
    mappedBooking.userType = "USER";
  } else {
    let adminData = await Admin.findAdminById(booking.userId);
    if (adminData) {
      mappedBooking.userName = adminData.firstName + " " + adminData.lastName;
      mappedBooking.userEmail = adminData.email;
      mappedBooking.userType = "ADMIN";
    } else {
      let subAdminData = await SubAdmin.findSubAdminById(booking.userId);
      if (subAdminData) {
        mappedBooking.userName =
          subAdminData.firstName + " " + subAdminData.lastName;
        mappedBooking.userEmail = subAdminData.email;
        mappedBooking.userType = "SUBADMIN";
      } else {
        let testerData = await Tester.findTesterById(booking.userId);
        if (testerData) {
          mappedBooking.userName = testerData.fullName;
          mappedBooking.userEmail = testerData.email;
          mappedBooking.userType = "TESTER";
        } else {
          // Handle other user types here
        }
      }
    }
  }
  return mappedBooking;
}

function buildFilters(queryParams) {
  const filters = {};
  if (queryParams.userId) {
    filters.userId = queryParams.userId;
  }
  if (queryParams.date) {
    filters.date = queryParams.date;
  }
  if (queryParams.studioId) {
    filters.studioId = queryParams.studioId;
  }
  if (queryParams.bookingType && !isNaN(queryParams.bookingType)) {
    filters.bookingStatus = +queryParams.bookingType;
  }
  if (queryParams.category) {
    filters.type = queryParams.category;
  }

  return filters;
}

function buildSort(queryParams) {
  const sort = {};
  if (queryParams.sortBy && queryParams.sortOrder) {
    sort[queryParams.sortBy] = queryParams.sortOrder === "desc" ? -1 : 1;
  }
  return sort;
}

// ----------------------------------------

// ---------------- UTILS ------------------------

function parseTime(s) {
  var c = s.split(":");
  return parseInt(c[0]) * 60 + parseInt(c[1]);
}

function convertHours(mins) {
  var hour = Math.floor(mins / 60);
  var mins = mins % 60;
  var converted = pad(hour, 2) + ":" + pad(mins, 2);
  return converted;
}

function pad(str, max) {
  str = str.toString();
  return str.length < max ? pad("0" + str, max) : str;
}

function calculate_time_slot(start_time, end_time, interval = "30") {
  var i, formatted_time;
  var time_slots = new Array();
  for (var i = start_time; i <= end_time; i = i + interval) {
    formatted_time = convertHours(i);
    time_slots.push(formatted_time);
  }
  return time_slots;
}

function addMinToTime(timeVal, minToAdd) {
  let timeCount = +timeVal.split(":")[0] * 60 + +timeVal.split(":")[1];
  let newTime = timeCount + +minToAdd;
  // logger.info({newTime});
  let timeHr = ~~(newTime / 60); // removing decimal part with help of "~~"
  let timeMin = newTime % 60;
  if (timeMin.toString().length == 1) {
    timeMin = "0" + timeMin;
  }
  // logger.info(timeHr.toString()+":"+timeMin.toString());
  return timeHr.toString() + ":" + timeMin.toString();
}
// addMinToTime("11:00",30)

function removeMinFromTime(timeVal, minToRemove) {
  let timeCount = +timeVal.split(":")[0] * 60 + +timeVal.split(":")[1];
  let newTime = timeCount - +minToRemove;

  // Ensure the time doesn't go negative
  newTime = Math.max(newTime, 0);

  let timeHr = ~~(newTime / 60); // removing decimal part with help of "~~"
  let timeMin = newTime % 60;

  if (timeMin.toString().length === 1) {
    timeMin = "0" + timeMin;
  }

  return timeHr.toString() + ":" + timeMin.toString();
}

function removeBookedSlots(availabilitySets, bookedSlots) {
  // Convert booked slots to a format comparable to availability sets
  const bookedSlotsFormatted = bookedSlots.map((slot) => {
    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
  });

  // Filter out the booked slots from the availability sets
  const updatedAvailabilitySets = availabilitySets.filter((availabilitySet) => {
    const setStartTime = availabilitySet.startTime;
    const setEndTime = availabilitySet.endTime;

    // Check if there is any overlap with booked slots
    const overlap = bookedSlotsFormatted.some(
      (bookedSlot) =>
        (setStartTime <= bookedSlot.startTime &&
          setEndTime > bookedSlot.startTime) ||
        (setStartTime >= bookedSlot.startTime &&
          setStartTime < bookedSlot.endTime)
    );

    // Include the availability set in the result only if there is no overlap with booked slots
    return !overlap;
  });

  return updatedAvailabilitySets;
}

function convertTo12HourFormat(time) {
  // Check correct time format and split into components
  time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [
    time,
  ];

  if (time.length > 1) {
    // If time format correct
    time = time.slice(1); // Remove full string match value
    time[5] = +time[0] < 12 ? " AM" : " PM"; // Set AM/PM
    time[0] = +time[0] % 12 || 12; // Adjust hours
  }
  return time.join(""); // return adjusted time or original string
}

function removeNextSlot(availableSlots, bookedSlots) {
  // Convert booked slots to a format comparable to available slots
  const bookedSlotsFormatted = bookedSlots.map((slot) => {
    return {
      startTime: convertTo12HourFormat(slot.startTime),
      endTime: convertTo12HourFormat(slot.endTime),
    };
  });

  // Find the index of the next available slot to be booked
  const nextAvailableIndex = availableSlots.findIndex((slot) => {
    const formattedSlot = {
      startTime: convertTo12HourFormat(slot.startTime),
      endTime: convertTo12HourFormat(slot.endTime),
    };
    return !bookedSlotsFormatted.some(
      (bookedSlot) =>
        (formattedSlot.startTime <= bookedSlot.startTime &&
          formattedSlot.endTime > bookedSlot.startTime) ||
        (formattedSlot.startTime >= bookedSlot.startTime &&
          formattedSlot.startTime < bookedSlot.endTime)
    );
  });

  // Remove the next available slot if found
  if (nextAvailableIndex !== -1) {
    availableSlots.splice(nextAvailableIndex, 1);
    logger.info("Next available slot removed successfully.");
  } else {
    logger.info("No available slot found to remove.");
  }

  return availableSlots;
}

function adjustAvailabilityAfterBooking(allAvailSlots, bookedSlots) {
  // Add a buffer of 30 minutes after a booked slot
  for (let i = 0; i < bookedSlots.length; i++) {
    let endBuffer = addMinToTime(bookedSlots[i].endTime, 30);
    let nextStartTime = addMinToTime(endBuffer, 30);

    // Find the index of the slot with the adjusted end time
    let index = allAvailSlots.findIndex((slot) => slot.startTime === endBuffer);

    if (index !== -1) {
      // Adjust the start time of the next slot
      allAvailSlots[index].startTime = nextStartTime;
      allAvailSlots[index].endTime = addMinToTime(nextStartTime, 60); // Add 1 hour interval
    }
  }
  return allAvailSlots;
}

function convertTo12HourFormatWithoutAMPM(time) {
  // Check correct time format and split into components
  time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [
    time,
  ];

  if (time.length > 1) {
    // If time format correct
    time = time.slice(1); // Remove full string match value
    // time[5] = +time[0] < 12 ? ' AM' : ' PM'; // Set AM/PM
    time[0] = +time[0] % 12 || 12; // Adjust hours
  }
  return time.join(""); // return adjusted time or original string
}

// ----------------------------------------

// ------------------ misc. --------------------------------------------

async function findUserById(userId) {
  let userData = await Admin.findAdminById(userId);
  if (!userData) {
    userData = await SubAdmin.findSubAdminById(userId);
    if (!userData) {
      userData = await Owner.findOwnerByOwnerId(userId);
      if (!userData) {
        userData = await User.findUserByUserId(userId);
      }
    }
  }
  return userData;
}

// ----------------------------------------------------------------------

async function getSingleBooking(bookingId) {
  // const { bookingType, bookingStatus } = req.body;

  const bookingData = await Booking.findBookingById(bookingId);
  if (!bookingData) {
    return null;
  }
  return bookingData;
}

exports.createNewBooking2 = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    const studioId = req.body.studioId;
    const roomId = req.body.roomId;
    const bookingDate = req.body.bookingDate;
    const bookingTime = req.body.bookingTime;
    const totalPrice = parseFloat(req.body.totalPrice);
    const bookingStatus = 0; //Initially active
  
    // if(bookingTime.endTime.split(' ')[1]=='PM')
    // {
    //     bookingTime.startTime = bookingTime.startTime + ' PM'
    // }
    // else{
    //     bookingTime.startTime = bookingTime.startTime + ' AM'
    // }
    // logger.info({bookingTime});
    bookingTime.startTime = convertTo24HourFormat(bookingTime.startTime);
    bookingTime.endTime = convertTo24HourFormat(bookingTime.endTime);
    logger.info({ bookingTime });
  
    let userDeviceId = "";
  
    User.findUserByUserId(userId).then(async (userData) => {
      if (!userData) {
        // return res.status(404).json({ status: false, message: "No User with this ID exists" });
        let adminData = await Admin.findAdminById(userId);
        if (!adminData) {
          let subAdminData = await SubAdmin.findSubAdminById(userId);
          if (!subAdminData) {
            let ownerData = await Owner.findOwnerByOwnerId(userId);
            if (!ownerData) {
              return res
                .status(404)
                .json({ status: false, message: "Enter valid ID" });
            } else {
              userData = ownerData;
            }
          } else {
            userData = subAdminData;
          }
        } else {
          userData = adminData;
        }
        userDeviceId = "";
      }
      if (userData.deviceId == null || userData.deviceId == undefined) {
        userDeviceId = "";
      }
      Studio.findStudioById(studioId).then((studioData) => {
        if (!studioData) {
          return res
            .status(404)
            .json({ status: false, message: "No studio with this ID exists" });
        }
  
        const bookingObj = new Booking(
          userId,
          studioId,
          roomId,
          bookingDate,
          bookingTime,
          totalPrice,
          bookingStatus,
          "c1"
        );
        logger.info({"req data of createNewBooking2":bookingObj})
  
        //saving new booking in database
        return bookingObj.save().then((resultData) => {
          let bookingData = resultData["ops"][0];
          logger.info({ bookingData });
          bookingData.totalPrice = bookingData.totalPrice.toString();
          if (bookingData.totalPrice.split(".")[1] == undefined) {
            bookingData.totalPrice = bookingData.totalPrice + ".0";
          }
          const title = "Congratulations!!";
          const message =
            "Your booking with '" + studioData.fullName + "' is confirmed";
          var myJSONObject = {
            app_id: process.env.ONE_SIGNAL_APP_ID,
            include_player_ids: [userData.deviceId],
            data: {},
            contents: { en: title + "\n" + message },
          };
  
          axios({
            method: "post",
            url: "https://onesignal.com/api/v1/notifications",
            data: myJSONObject,
            headers: {
              "Content-Type": "application/json",
              Authorization: process.env.ONE_SIGNAL_AUTH,
            },
          })
            .then(async (result) => {
              if (result.data.recipients == 1) {
                const notification = new Notifications(userId, title, message);
  
                //saving in database
                return notification.save().then((resultData) => {
                  // return res.json({ status: true, message: "Booking created successfully", booking: bookingData });
                  const adminNotificationObj = new AdminNotifications(
                    userId,
                    studioId,
                    bookingData._id.toString(),
                    "Booking created",
                    userData.fullName +
                    " created new booking with Studio : " +
                    studioData.fullName
                  );
                  //saving in database
                  return adminNotificationObj.save().then((resultData1) => {
                    return res.json({
                      status: true,
                      message: "Booking created successfully",
                      booking: bookingData,
                    });
                  });
                });
              } else {
                return res.json({
                  status: true,
                  message: "Booking created successfully(Notification not sent)",
                  booking: bookingData,
                });
              }
            })
            .catch((err) => {
              logger.error(err);
              return res.json({
                status: true,
                message: "Booking created successfully(Notification not sent)",
                booking: bookingData,
              });
            });
        });
      });
    });
  } catch (error) {
    logger.error(error,"Error Occured :")
  }
};

exports.createNewBooking = async (req, res, next) => {
  try {
    logger.info({"req.body of createNewBooking": req.body });



    const { userId, studioId, roomId, bookingDate, bookingTime, totalPrice } = req.body;

    const discountId = req.body?.discountId || "0"
    const discountCode = req.body?.discountCode || "#000"

    console.log({discountId,discountCode});

    let response = await createBooking({ userId, studioId, roomId, discountId, discountCode, bookingDate, bookingTime, totalPrice })
    if(response.status){
      const bookingData = response.resultData.ops[0];
      await sendMailAndAppNotification({userId,
        studioId,
        roomId,
        bookingDate,
        bookingTime,
        totalPrice},{studioName:response.studioData.fullName,userDeviceId:response.userDeviceId,booking_id:bookingData._id.toString(),userFullName:response.userData.fullName})
      bookingData.totalPrice = bookingData.totalPrice.toFixed(2);
      return res.json({
        status: true,
        message: "Booking created successfully",
        booking: bookingData,
      });

    }else{

      return res.json({
        status: false,
        message: response?.message || "Booking create failed",
        booking: [],
      });

    } 
  } catch (error) {
    logger.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

async function sendMailAndAppNotification({userId,
  studioId,
  roomId,
  bookingDate,
  bookingTime,
  totalPrice},{studioName,userDeviceId,booking_id,userFullName}){

  await sendMailToUserAndAdmin({
    userId,
    studioId,
    roomId,
    bookingDate,
    bookingTime,
    totalPrice,
  });


  // sending app notification :
  const title = "Congratulations!!";
  const message = `Your booking with '${studioName}' is confirmed`;
  const myJSONObject = {
    app_id: process.env.ONE_SIGNAL_APP_ID,
    include_player_ids: [userDeviceId],
    data: {},
    contents: { en: `${title}\n${message}` },
  };

  // calling one signal api
  const result = await axios.post(
    "https://onesignal.com/api/v1/notifications",
    myJSONObject,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.ONE_SIGNAL_AUTH,
      },
    }
  );

  // api response :
  if (result.data.recipients === 1) {
    const notification = new Notifications(userId, title, message);
    await notification.save();
    const adminNotificationObj = new AdminNotifications(
      userId,
      studioId,
      booking_id,
      "Booking created",
      `${userFullName} created new booking with Studio: ${studioName}`
    );
    await adminNotificationObj.save();
  }
}

async function createBooking({ userId, studioId, discountId, discountCode, roomId, bookingDate, bookingTime, totalPrice }) {
  try {
    const bookingStatus = 0; // Initially active

    // Convert time to 24-hour format
    bookingTime.startTime = convertTo24HourFormat(bookingTime.startTime);
    bookingTime.endTime = convertTo24HourFormat(bookingTime.endTime);
    let userData = await findUserById(userId); //  will check for admin,end-user,subadmin and owner exists
    if (!userData) {
      return { status: false, message: "No user exists with this user id" };
    }
    let userDeviceId = userData.deviceId || "";
    const studioData = await Studio.findStudioById(studioId);
    if (!studioData) {
      return { status: false, message: "No studio exists with this studio id" };
    }

    const bookingObj = new Booking(
      userId,
      studioId,
      roomId,
      discountId,
      discountCode,
      bookingDate,
      bookingTime,
      totalPrice,
      bookingStatus,
      "c1"
    );
    const resultData = await bookingObj.save();
    return { resultData, studioData, userData, userDeviceId, status: true, message: "Booking created successfully " }
  } catch (error) {
    logger.error(error, "Error while create booking in DB")
    return {status:false,message:"error while creating studio booking"}
  }

}

exports.createServiceBooking = async (req, res, next) => {
  try {


    const {
      userId,
      serviceId,
      planId,
      bookingDate,
      bookingTime,
      totalPrice,
      serviceType,
      countryCode,
    } = req.body;
    const bookingStatus = 0;
    logger.info({"req data of createServiceBooking":req.body})
    bookingTime.startTime = convertTo24HourFormat(bookingTime.startTime);
    bookingTime.endTime = convertTo24HourFormat(bookingTime.endTime);

    let userData = await findUserById(userId);
    if (!userData) {
      return res
        .status(404)
        .json({ status: false, message: "Enter valid user ID" });
    }

    let userDeviceId = userData.deviceId || "";

    const serviceData = await Service.findServiceById(serviceId);

    const serData = {
      userId,
      studioId: serviceId,
      roomId: +planId,
      bookingStatus: 0,
      type: serviceType,
    };

    const ExistingServiceData = await Booking.findBooking(serData);

    console.log("ExistingServiceData");
    console.log(ExistingServiceData);

    if (!serviceData) {
      return res.status(200).json({
        status: false,
        message: "Something went wrong, Try again later",
      });
    }
    let bookingData;
    if (ExistingServiceData.length === 1) {
      // console.log({ userId: userId, studioId: serviceId, roomId: planId, type: serviceType });
      // const res_1 = await Service.updateOneRecord({ userId: userId, studioId: serviceId, roomId: +planId, type: serviceType }, { bookingStatus: 0 })
      // if (res_1 === 1) {
      //   logger.info("Service booking status updated as active booking. Service details :")
      //   logger.info({ serviceData })
      //   return res.status(200).json({ status: false, message: "Requested Package booking has been pre-booked already!" });
      // } else {
      //   logger.error({ res_1 })
      //   return res.status(200).json({ status: false, message: "Booking update failed !" });
      // }
      return res.status(200).json({
        status: false,
        message: "Requested Package booking has been pre-booked already!",
      });
    } else if (ExistingServiceData.length > 1) {
      logger.info("More than one booking found for this service !");
      logger.info({ serviceData });
      return res.status(200).json({
        status: false,
        message: "More than one booking found for this service !",
      });
    } else {
      const bookingObj = new Booking(
        userId,
        serviceId,
        parseInt(planId),
        "0",
        "#000",
        bookingDate,
        bookingTime,
        parseFloat(totalPrice),
        bookingStatus,
        serviceType,
        countryCode
      );
      logger.info({bookingObj})
      const resultData = await bookingObj.save();
      bookingData = resultData.ops[0];
      logger.info({bookingData})
      bookingData.totalPrice = bookingData.totalPrice.toFixed(2);
    }

    const title = "Congratulations!!";
    const message = `Your booking with '${serviceData.fullName}' is confirmed`;
    const myJSONObject = {
      app_id: process.env.ONE_SIGNAL_APP_ID,
      include_player_ids: [userDeviceId],
      data: {},
      contents: { en: `${title}\n${message}` },
    };

    const result = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      myJSONObject,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.ONE_SIGNAL_AUTH,
        },
      }
    );
    if (result.status === 1) {
      const notification = new Notifications(userId, title, message);
      await notification.save();

      const adminNotificationObj = new AdminNotifications(
        userId,
        serviceId,
        bookingData._id.toString(),
        "Booking created",
        `${userData.fullName} created new booking with Studio: ${serviceData.fullName}`
      );
      await adminNotificationObj.save();

      return res.json({
        status: true,
        message: "Booking created successfully",
        booking: bookingData,
      });
    } else {
      return res.json({
        status: true,
        message: "Booking created successfully (Notification not sent)",
        booking: bookingData,
      });
    }
  } catch (error) {
    logger.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

exports.getStudioAvailabilities = async (req, res, next) => {
 try {
   const studioId = req.body.studioId;
   const roomId = req.body.roomId;
   let bookingDate = req.body.bookingDate;
   const bookingHours = +req.body.bookingHours; //Slots will be created based on this
   const bufferTime = 15;
   const interval = bookingHours * 60;

   logger.info({"req data of getStudioAvailabilities":req.body})
   console.log("slot req data:", req.body);
 
   //get bookingDate from timestamp
   bookingDate = new Date(bookingDate);
   var yr = bookingDate.getUTCFullYear();
   var mth = bookingDate.getUTCMonth() + 1;
   if (mth.toString().length == 1) {
     mth = "0" + mth.toString();
   }
   var dt = bookingDate.getUTCDate();
   if (dt.toString().length == 1) {
     dt = "0" + dt.toString();
   }
   bookingDate = yr + "-" + mth + "-" + dt;
   var bTimeStamp = new Date(bookingDate).getTime();
   logger.info("Booking Date :--> ", { bookingDate });
 
   //get Current Date from timestamp
   // let currDate = new Date();
   let currDate = moment.tz("Asia/Kolkata");
   let studioData = await Studio.findStudioById(studioId);
   if (!studioData) {
     return res
       .status(404)
       .json({ status: false, message: "No studio with this ID exists" });
   }
   if (studioData?.timeZone) {
     currDate = moment.tz(studioData.timeZone);
   } else {
     currDate = moment.tz("Asia/Kolkata");
     console.log("object");
   }
   console.log("currDate=>", currDate);
 
   console.log(
     "Current IST Date and Time:",
     currDate.format("YYYY-MM-DD HH:mm:ss")
   );
   // var yr = currDate.getUTCFullYear();
   // var mth = currDate.getUTCMonth() + 1;
   var yr = currDate.year();
   var mth = currDate.month() + 1;
 
   if (mth.toString().length == 1) {
     mth = "0" + mth.toString();
   }
   var dt = currDate.date();
   // var dt = currDate.getUTCDate();
   if (dt.toString().length == 1) {
     dt = "0" + dt.toString();
   }
   // currDate = yr + "-" + mth + "-" + dt;
   var cTimeStamp = currDate.valueOf();
   console.log("Current Date : ", currDate);
   console.log("cTimeStamp", cTimeStamp);
   var currHr = currDate.hours();
   var currMin = currDate.minutes();
   var currTime = currHr * 60 + currMin;
   logger.info("Current Time : " + currTime);
 
   Studio.findStudioById(studioId).then((studioData) => {
     if (!studioData) {
       return res
         .status(404)
         .json({ status: false, message: "No studio with this ID exists" });
     }
 
     if (studioData.roomsDetails == undefined) {
       studioData.roomsDetails = [];
     }
     const roomIndex = studioData.roomsDetails.findIndex(
       (i) => i.roomId == roomId
     );
     if (roomIndex == -1) {
       return res
         .status(404)
         .json({ status: false, message: "No room with this ID exists" });
     }
     let roomTotalAvailability =
       studioData.roomsDetails[roomIndex].availabilities;
     // roomTotalAvailability = [{startTime:"09:00",endTime:"13:00"},{startTime:"15:00",endTime:"19:00"}];
     logger.info("Rooms Hours : ", { roomTotalAvailability });
 
     //Getting all slots first
     let allSlots = [];
     roomTotalAvailability.forEach((singleAvail) => {
       // logger.info({singleAvail});
       var startTime = singleAvail.startTime;
       var endTime = singleAvail.endTime;
 
       var start_time = parseTime(startTime),
         end_time = parseTime(endTime);
       // interval = bookingHours * 60;
 
       var timeslots = calculate_time_slot(start_time, end_time, interval);
 
       //Creating range for slots
       for (let s = 0; s < timeslots.length - 1; s++) {
         timeslots[s] = { startTime: timeslots[s], endTime: timeslots[s + 1] };
       }
       //removing last extra element of "allSlots"
       timeslots.splice(timeslots.length - 1, 1);
       // logger.info({timeslots});
       allSlots = allSlots.concat(timeslots);
     });
     // logger.info("All Slots : ",{allSlots});
 
     Booking.fetchBookingsByStudioIdAndBookingDate(studioId,roomId, bookingDate).then(
       (bookingsData) => {
         // logger.info({bookingsData});
 
         let availSlotsNew = allSlots;
         //Filtering to remove past slots for current date
         if (cTimeStamp >= bTimeStamp) {
           console.log("cTimeStamp == bTimeStamp 1");
           availSlotsNew = availSlotsNew.filter((i) => {
             var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
             var sMin =
               +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
             logger.info(sMin, eMin, currTime);
             if (eMin < currTime || sMin < currTime) {
               return false;
             } else {
               return true;
             }
           });
         }
         console.log("availSlotsNew:", availSlotsNew);
 
         if (bookingsData.length == 0) {
           //convert to 12 hour format
           availSlotsNew.forEach((singleSlot) => {
             singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
             singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
           });
           return res.json({
             status: true,
             message: "Availability returned",
             allSlots: allSlots,
             availableSlots: availSlotsNew,
             bookedSlots: [],
           });
         }
         let bookedSlots = [];
         bookingsData.forEach((singleBooking) => {
           bookedSlots.push(singleBooking.bookingTime);
         });
 
         let availableSlots = [];
         let allSplitSlots = [];
         // allSlots.forEach(singleSlot=>{
         //     let startMin = (+singleSlot.startTime.split(':')[0] * 60) + (+singleSlot.startTime.split(':')[1]);
         //     let endMin = (+singleSlot.endTime.split(':')[0] * 60) + (+singleSlot.endTime.split(':')[1]);
         //     // logger.info(startMin,endMin);
         bookedSlots.forEach((singleBookedSlot) => {
           let startMinBooked =
             +singleBookedSlot.startTime.split(":")[0] * 60 +
             +singleBookedSlot.startTime.split(":")[1];
           let endMinBooked =
             +singleBookedSlot.endTime.split(":")[0] * 60 +
             +singleBookedSlot.endTime.split(":")[1];
 
           roomTotalAvailability.forEach((singleRoomAvail) => {
             let startMinRoom =
               +singleRoomAvail.startTime.split(":")[0] * 60 +
               +singleRoomAvail.startTime.split(":")[1];
             let endMinRoom =
               +singleRoomAvail.endTime.split(":")[0] * 60 +
               +singleRoomAvail.endTime.split(":")[1];
             if (startMinBooked >= startMinRoom && endMinBooked <= endMinRoom) {
               // logger.info("Single Room Avail : ",singleRoomAvail);
               //remove this booked slot from total room slot
               let splitSlot1 = {
                 startTime: singleRoomAvail.startTime,
                 endTime: singleBookedSlot.startTime,
               };
               let splitSlot2 = {
                 startTime: singleBookedSlot.endTime,
                 endTime: singleRoomAvail.endTime,
               };
               logger.info("Split Slot : ", { splitSlot1, splitSlot2 });
               roomTotalAvailability.push(splitSlot1);
               roomTotalAvailability.push(splitSlot2);
 
               //Also, before next iteration, remove this availablitiy slot from room (since updated is added)
               const availIndex1 = roomTotalAvailability.findIndex(
                 (a) =>
                   a.startTime == singleRoomAvail.startTime &&
                   a.endTime == singleRoomAvail.endTime
               );
               if (availIndex1 != -1) {
                 roomTotalAvailability.splice(availIndex1, 1);
               }
             }
           });
         });
         // });
         logger.info("Availability Sets : ", { roomTotalAvailability });
         //add 30 min interval before starting next slot
         for (let i = 1; i < roomTotalAvailability.length; i++) {
           const index = bookedSlots.findIndex((s) =>
             s.endTime
               .split(":")[0]
               .startsWith(roomTotalAvailability[i].startTime.split(":")[0])
           );
           if (index != -1) {
             roomTotalAvailability[i].startTime = addMinToTime(
               roomTotalAvailability[i].startTime,
               bufferTime
             );
           }
         }
         logger.info("Availability Sets : ", { roomTotalAvailability });
         let allAvailSlots = [];
         //Now split these based on SLOT timing
         roomTotalAvailability.forEach((singleAvail) => {
           // logger.info({singleAvail});
           var startTime = singleAvail.startTime;
           var endTime = singleAvail.endTime;
 
           var start_time = parseTime(startTime),
             end_time = parseTime(endTime),
             interval = bookingHours * 60;
 
           var timeslots = calculate_time_slot(start_time, end_time, interval);
 
           //Creating range for slots
           for (let s = 0; s < timeslots.length - 1; s++) {
             timeslots[s] = {
               startTime: timeslots[s],
               endTime: timeslots[s + 1],
             };
           }
           //removing last extra element of "allSlots"
           timeslots.splice(timeslots.length - 1, 1);
           // logger.info({timeslots});
           allAvailSlots = allAvailSlots.concat(timeslots);
         });
         //Filtering to remove past slots for current date
         if (cTimeStamp == bTimeStamp) {
           allAvailSlots = allAvailSlots.filter((i) => {
             var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
             var sMin =
               +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
             if (eMin < currTime || sMin < currTime) {
               return false;
             } else {
               return true;
             }
           });
         }
         //sorting
         allAvailSlots.sort((a, b) => (a.startTime >= b.startTime ? 1 : -1));
         //convert to 12 hour format
         allAvailSlots.forEach((singleSlot) => {
           singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
           singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
         });
 
         allSlots.forEach((singleSlot) => {
           singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
           singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
         });
         bookedSlots.forEach((singleSlot) => {
           singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
           singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
         });
         return res.json({
           status: true,
           message: "Availability returned",
           allSlots: allSlots,
           availableSlots: allAvailSlots,
           bookedSlots: bookedSlots,
         });
       }
     );
   });
 } catch (error) {
  logger.error(error,"Error Occured :")
 }
};

// exports.getStudioAvailabilitiesWorkingBackup = (req, res, next) => {
//   //manually added 5.30 time in UTC for IST
//   const studioId = req.body.studioId;
//   const roomId = req.body.roomId;
//   let bookingDate = req.body.bookingDate;
//   const bookingHours = +req.body.bookingHours; //Slots will be created based on this
//   const bufferTime = 15;
//   const interval = bookingHours * 60;
//   console.log("slot req data:", req.body);
//   //get bookingDate from timestamp
//   bookingDate = new Date(bookingDate);
//   var yr = bookingDate.getUTCFullYear();
//   var mth = bookingDate.getUTCMonth() + 1;
//   if (mth.toString().length == 1) {
//     mth = "0" + mth.toString();
//   }
//   var dt = bookingDate.getUTCDate();
//   if (dt.toString().length == 1) {
//     dt = "0" + dt.toString();
//   }
//   bookingDate = yr + "-" + mth + "-" + dt;
//   var bTimeStamp = new Date(bookingDate).getTime();
//   logger.info("Booking Date :--> ",{bookingDate});
//   console.log("bTimeStamp");
//   console.log(bTimeStamp);
//   //get Current Date from timestamp
//   let currDate = new Date();
//   console.log("c date:::::");
//   console.log(currDate);
//   console.log(currDate.getHours());
//   var yr = currDate.getUTCFullYear();
//   var mth = currDate.getUTCMonth() + 1;
//   if (mth.toString().length == 1) {
//     mth = "0" + mth.toString();
//   }
//   var dt = currDate.getUTCDate();
//   if (dt.toString().length == 1) {
//     dt = "0" + dt.toString();
//   }
//   currDate = yr + "-" + mth + "-" + dt;

//   var cTimeStamp = new Date(currDate).getTime();
//   var indianTime = 5.5 * 60 * 60 * 1000
//   var cTimeStamp = cTimeStamp + indianTime;

//   // var cTimeStamp = 1716286445908
//   console.log("cTimeStamp");
//   console.log(cTimeStamp);

//   logger.info("Current Date : ",{currDate});
//   var currHr = new Date().getHours();
//   var currMin = new Date().getMinutes();
//   var currTime = currHr * 60 + currMin;
//   logger.info("Current Time : " + currTime);
//   Studio.findStudioById(studioId).then((studioData) => {
//     if (!studioData) {
//       return res
//         .status(404)
//         .json({ status: false, message: "No studio with this ID exists" });
//     }
//     if (studioData.roomsDetails == undefined) {
//       studioData.roomsDetails = [];
//     }
//     const roomIndex = studioData.roomsDetails.findIndex(
//       (i) => i.roomId == roomId
//     );
//     if (roomIndex == -1) {
//       return res
//         .status(404)
//         .json({ status: false, message: "No room with this ID exists" });
//     }
//     let roomTotalAvailability =
//       studioData.roomsDetails[roomIndex].availabilities;
//     // roomTotalAvailability = [{startTime:"09:00",endTime:"13:00"},{startTime:"15:00",endTime:"19:00"}];
//     logger.info("Rooms Hours : ",{roomTotalAvailability});
//     //Getting all slots first
//     let allSlots = [];
//     roomTotalAvailability.forEach((singleAvail) => {
//       // logger.info({singleAvail});
//       var startTime = singleAvail.startTime;
//       var endTime = singleAvail.endTime;
//       var start_time = parseTime(startTime),
//         end_time = parseTime(endTime);
//       // interval = bookingHours * 60;
//       var timeslots = calculate_time_slot(start_time, end_time, interval);
//       //Creating range for slots
//       for (let s = 0; s < timeslots.length - 1; s++) {
//         timeslots[s] = { startTime: timeslots[s], endTime: timeslots[s + 1] };
//       }
//       //removing last extra element of "allSlots"
//       timeslots.splice(timeslots.length - 1, 1);
//       // logger.info({timeslots});
//       allSlots = allSlots.concat(timeslots);
//     });
//     // logger.info("All Slots : ",{allSlots});
//     Booking.fetchBookingsByStudioIdAndBookingDate(studioId, bookingDate).then(
//       (bookingsData) => {
//         logger.info({ bookingsData });
//         let availSlotsNew = allSlots;
//         //Filtering to remove past slots for current date
//         if (cTimeStamp >= bTimeStamp) {
//           console.log("cTimeStamp == bTimeStamp 1");
//           availSlotsNew = availSlotsNew.filter((i) => {
//             var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
//             var sMin = +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
//             console.log(sMin, eMin, currTime);
//             if (eMin < currTime || sMin < currTime) {
//               return false;
//             } else {
//               return true;
//             }
//           });
//         }
//         console.log("availSlotsNew:", availSlotsNew);
//         if (bookingsData.length == 0) {
//           //convert to 12 hour format
//           availSlotsNew.forEach((singleSlot) => {
//             singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
//             singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
//           });
//           return res.json({
//             status: true,
//             message: "Availability returned",
//             allSlots: allSlots,
//             availableSlots: availSlotsNew,
//             bookedSlots: [],
//             test: "test",
//           });
//         }
//         let bookedSlots = [];
//         bookingsData.forEach((singleBooking) => {
//           bookedSlots.push(singleBooking.bookingTime);
//         });
//         let availableSlots = [];
//         let allSplitSlots = [];
//         // allSlots.forEach(singleSlot=>{
//         //     let startMin = (+singleSlot.startTime.split(':')[0] * 60) + (+singleSlot.startTime.split(':')[1]);
//         //     let endMin = (+singleSlot.endTime.split(':')[0] * 60) + (+singleSlot.endTime.split(':')[1]);
//         //     // logger.info(startMin,endMin);
//         bookedSlots.forEach((singleBookedSlot) => {
//           let startMinBooked =
//             +singleBookedSlot.startTime.split(":")[0] * 60 +
//             +singleBookedSlot.startTime.split(":")[1];
//           let endMinBooked =
//             +singleBookedSlot.endTime.split(":")[0] * 60 +
//             +singleBookedSlot.endTime.split(":")[1];
//           roomTotalAvailability.forEach((singleRoomAvail) => {
//             let startMinRoom =
//               +singleRoomAvail.startTime.split(":")[0] * 60 +
//               +singleRoomAvail.startTime.split(":")[1];
//             let endMinRoom =
//               +singleRoomAvail.endTime.split(":")[0] * 60 +
//               +singleRoomAvail.endTime.split(":")[1];
//             if (startMinBooked >= startMinRoom && endMinBooked <= endMinRoom) {
//               // logger.info("Single Room Avail : ",singleRoomAvail);
//               //remove this booked slot from total room slot
//               let splitSlot1 = {
//                 startTime: singleRoomAvail.startTime,
//                 endTime: singleBookedSlot.startTime,
//               };
//               let splitSlot2 = {
//                 startTime: singleBookedSlot.endTime,
//                 endTime: singleRoomAvail.endTime,
//               };
//               logger.info("Split Slot : ",{splitSlot1, splitSlot2});
//               roomTotalAvailability.push(splitSlot1);
//               roomTotalAvailability.push(splitSlot2);
//               //Also, before next iteration, remove this availablitiy slot from room (since updated is added)
//               const availIndex1 = roomTotalAvailability.findIndex(
//                 (a) =>
//                   a.startTime == singleRoomAvail.startTime &&
//                   a.endTime == singleRoomAvail.endTime
//               );
//               if (availIndex1 != -1) {
//                 roomTotalAvailability.splice(availIndex1, 1);
//               }
//             }
//           });
//         });
//         // });
//         logger.info("Availability Sets : ",{roomTotalAvailability});
//         //add 30 min interval before starting next slot
//         for (let i = 1; i < roomTotalAvailability.length; i++) {
//           const index = bookedSlots.findIndex((s) =>
//             s.endTime
//               .split(":")[0]
//               .startsWith(roomTotalAvailability[i].startTime.split(":")[0])
//           );
//           if (index != -1) {
//             roomTotalAvailability[i].startTime = addMinToTime(
//               roomTotalAvailability[i].startTime,
//               bufferTime
//             );
//           }
//         }
//         logger.info("Availability Sets : ",{roomTotalAvailability});
//         let allAvailSlots = [];
//         //Now split these based on SLOT timing
//         roomTotalAvailability.forEach((singleAvail) => {
//           // logger.info({singleAvail});
//           var startTime = singleAvail.startTime;
//           var endTime = singleAvail.endTime;
//           var start_time = parseTime(startTime),
//             end_time = parseTime(endTime),
//             interval = bookingHours * 60;
//           var timeslots = calculate_time_slot(start_time, end_time, interval);
//           //Creating range for slots
//           for (let s = 0; s < timeslots.length - 1; s++) {
//             timeslots[s] = {
//               startTime: timeslots[s],
//               endTime: timeslots[s + 1],
//             };
//           }
//           //removing last extra element of "allSlots"
//           timeslots.splice(timeslots.length - 1, 1);
//           // logger.info({timeslots});
//           allAvailSlots = allAvailSlots.concat(timeslots);
//         });
//         //Filtering to remove past slots for current date
//         if (cTimeStamp == bTimeStamp) {
//           allAvailSlots = allAvailSlots.filter((i) => {
//             var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
//             var sMin =
//               +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
//             if (eMin < currTime || sMin < currTime) {
//               return false;
//             } else {
//               return true;
//             }
//           });
//         }
//         //sorting
//         allAvailSlots.sort((a, b) => (a.startTime >= b.startTime ? 1 : -1));
//         //convert to 12 hour format
//         allAvailSlots.forEach((singleSlot) => {
//           singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
//           singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
//         });
//         return res.json({
//           status: true,
//           message: "Availability returned",
//           allSlots: allSlots,
//           availableSlots: allAvailSlots,
//           bookedSlots: bookedSlots,
//         });
//       }
//     );
//   });
// };

exports.getStudioAvailabilitiesLate = (req, res, next) => {
  try {
    const req_body = req.body;
    logger.info({"req data of getStudioAvailabilitiesLate":req.body})
  
    const studioId = req.body.studioId;
    const roomId = req.body.roomId;
    let bookingDate = req.body.bookingDate;
    const bookingHours = +req.body.bookingHours; //Slots will be created based on this
  
    const interval = 1.5 * 60;
    const bufferTime = 30; // adjust the buffer time as needed
    const afterBufferTime = 30;
  
    //get bookingDate from timestamp
    bookingDate = new Date(bookingDate);
    var yr = bookingDate.getUTCFullYear();
    var mth = bookingDate.getUTCMonth() + 1;
    if (mth.toString().length == 1) {
      mth = "0" + mth.toString();
    }
    var dt = bookingDate.getUTCDate();
    if (dt.toString().length == 1) {
      dt = "0" + dt.toString();
    }
    bookingDate = yr + "-" + mth + "-" + dt;
    var bTimeStamp = new Date(bookingDate).getTime();
    logger.info("Booking Date : ", { bookingDate });
  
    //get Current Date from timestamp
    let currDate = new Date();
    var yr = currDate.getUTCFullYear();
    var mth = currDate.getUTCMonth() + 1;
    if (mth.toString().length == 1) {
      mth = "0" + mth.toString();
    }
    var dt = currDate.getUTCDate();
    if (dt.toString().length == 1) {
      dt = "0" + dt.toString();
    }
    currDate = yr + "-" + mth + "-" + dt;
    var cTimeStamp = new Date(currDate).getTime();
    logger.info("Current Date : ", { currDate });
    var currHr = new Date().getHours();
    var currMin = new Date().getMinutes();
    var currTime = currHr * 60 + currMin;
    logger.info("Current Time : " + currTime);
  
    Studio.findStudioById(studioId).then((studioData) => {
      if (!studioData) {
        return res
          .status(404)
          .json({ status: false, message: "No studio with this ID exists" });
      }
  
      if (studioData.roomsDetails == undefined) {
        studioData.roomsDetails = [];
      }
      const roomIndex = studioData.roomsDetails.findIndex(
        (i) => i.roomId == roomId
      );
      if (roomIndex == -1) {
        return res
          .status(404)
          .json({ status: false, message: "No room with this ID exists" });
      }
      let roomTotalAvailability =
        studioData.roomsDetails[roomIndex].availabilities;
      // roomTotalAvailability = [{startTime:"09:00",endTime:"13:00"},{startTime:"15:00",endTime:"19:00"}];
      logger.info("Rooms Hours : ", { roomTotalAvailability });
  
      //Getting all slots first
      let allSlots = [];
      roomTotalAvailability.forEach((singleAvail) => {
        logger.info("singleAvail:::", { singleAvail });
        var startTime = singleAvail.startTime;
        var endTime = singleAvail.endTime;
  
        var start_time = parseTime(startTime),
          end_time = parseTime(endTime),
          interval = bookingHours * 60;
  
        var timeslots = calculate_time_slot(start_time, end_time, interval);
  
        logger.info("|||timeslots --", { timeslots });
  
        //Creating range for slots
        for (let s = 0; s < timeslots.length - 1; s++) {
          timeslots[s] = { startTime: timeslots[s], endTime: timeslots[s + 1] };
        }
        //removing last extra element of "allSlots"
        timeslots.splice(timeslots.length - 1, 1);
        // logger.info({timeslots});
        allSlots = allSlots.concat(timeslots);
      });
      logger.info("\n\n----All Slots : ", { allSlots });
  
      Booking.fetchBookingsByStudioIdAndBookingDate(studioId,roomId, bookingDate).then(
        (bookingsData) => {
          // logger.info({bookingsData});
  
          let availSlotsNew = allSlots;
          //Filtering to remove past slots for current date
          logger.info(
            "\nRemove Filtered Past slots---",
            cTimeStamp == bTimeStamp
          );
          if (cTimeStamp == bTimeStamp) {
            availSlotsNew = availSlotsNew.filter((i) => {
              var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
              var sMin =
                +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
              logger.info("-------", { sMin, eMin, currTime });
              if (eMin < currTime || sMin < currTime) {
                return false;
              } else {
                return true;
              }
            });
          }
  
          if (bookingsData.length == 0) {
            //convert to 12 hour format
            availSlotsNew.forEach((singleSlot) => {
              singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
              singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
            });
            logger.info("allSlots", { allSlots }, "availableSlots", {
              availSlotsNew,
            });
            return res.json({
              status: true,
              message: "Availability returned",
              allSlots: allSlots,
              availableSlots: availSlotsNew,
              bookedSlots: [],
            });
          }
  
          let bookedSlots = [];
          bookingsData.forEach((singleBooking) => {
            logger.info("singleBooking.bookingTime:::", { singleBooking });
            bookedSlots.push(singleBooking.bookingTime);
          });
  
          let availableSlots = [];
          let allSplitSlots = [];
          // allSlots.forEach(singleSlot=>{
          //     let startMin = (+singleSlot.startTime.split(':')[0] * 60) + (+singleSlot.startTime.split(':')[1]);
          //     let endMin = (+singleSlot.endTime.split(':')[0] * 60) + (+singleSlot.endTime.split(':')[1]);
          //     // logger.info(startMin,endMin);
          bookedSlots.forEach((singleBookedSlot) => {
            let startMinBooked =
              +singleBookedSlot.startTime.split(":")[0] * 60 +
              +singleBookedSlot.startTime.split(":")[1];
            let endMinBooked =
              +singleBookedSlot.endTime.split(":")[0] * 60 +
              +singleBookedSlot.endTime.split(":")[1];
            logger.info(
              "\n\nstartMinBooked:",
              startMinBooked,
              "endMinBooked:",
              endMinBooked,
              "singleBookedSlot:",
              singleBookedSlot,
              "\n\n"
            );
  
            roomTotalAvailability.forEach((singleRoomAvail) => {
              logger.info("roomTotalAvailability:", { roomTotalAvailability });
              let startMinRoom =
                +singleRoomAvail.startTime.split(":")[0] * 60 +
                +singleRoomAvail.startTime.split(":")[1];
              let endMinRoom =
                +singleRoomAvail.endTime.split(":")[0] * 60 +
                +singleRoomAvail.endTime.split(":")[1];
              logger.info(
                "\n-----------------------------------\nstartMinRoom",
                startMinRoom,
                "endMinRoom",
                endMinRoom,
                "singleRoomAvail:",
                singleRoomAvail,
                "\n-----------------------------------"
              );
              logger.info(
                "CHECK:::",
                startMinBooked >= startMinRoom && endMinBooked <= endMinRoom
              );
              // check if the Slots Booked from available slots
              if (startMinBooked >= startMinRoom && endMinBooked <= endMinRoom) {
                // logger.info("Single Room Avail : ",singleRoomAvail);
                //remove this booked slot from total room slot
  
                const newSingleBookedSlotEnd = addMinToTime(
                  singleBookedSlot.endTime,
                  bufferTime + afterBufferTime
                );
                // const newSingleRoomAvailEnd = addMinToTime(singleRoomAvail.endTime,interval) // new - halted
  
                let splitSlot1 = {
                  startTime: singleRoomAvail.startTime,
                  endTime: singleBookedSlot.startTime,
                };
                // let splitSlot2 = {startTime:singleBookedSlot.endTime,endTime:singleRoomAvail.endTime}; // base
                let splitSlot2 = {
                  startTime: newSingleBookedSlotEnd,
                  endTime: singleRoomAvail.endTime,
                };
                logger.info(
                  "\nnewSingleBookedSlotEnd",
                  newSingleBookedSlotEnd,
                  "\nSplit Slot : ",
                  splitSlot1,
                  splitSlot2
                );
                roomTotalAvailability.push(splitSlot1);
                roomTotalAvailability.push(splitSlot2);
  
                //Also, before next iteration, remove this availablitiy slot from room (since updated is added)
                const availIndex1 = roomTotalAvailability.findIndex(
                  (a) =>
                    a.startTime == singleRoomAvail.startTime &&
                    a.endTime == singleRoomAvail.endTime
                );
  
                if (availIndex1 != -1) {
                  roomTotalAvailability.splice(availIndex1, 1);
                }
              }
            });
          });
          // });
          // const updatedAvailabilitySets = removeBookedSlots(roomTotalAvailability, bookedSlots);
          // roomTotalAvailability = updatedAvailabilitySets
          logger.info("Availability Sets : ", { roomTotalAvailability });
          //add 30 min interval before starting next slot
          // for(let i=1;i<roomTotalAvailability.length;i++)
          // {
          //     const index = bookedSlots.findIndex(s=>s.endTime.split(':')[0].startsWith(roomTotalAvailability[i].startTime.split(':')[0]));
          //     if(index!=-1)
          //     {
          //         roomTotalAvailability[i].startTime = addMinToTime(roomTotalAvailability[i].startTime,30);
          //     }
          // }
  
          // NEW
  
          // dynamically adjust the start time of the next slot based on the end time of the booked slot
          for (let i = 1; i < roomTotalAvailability.length; i++) {
            // const newSingleBookedSlotEnd = addMinToTime(singleBookedSlot.endTime,bufferTime+afterBufferTime)
            // const newSingleRoomAvailEnd = addMinToTime(singleRoomAvail.endTime,interval)
            // const index = bookedSlots.findIndex(s => s.endTime.split(':')[0].startsWith(roomTotalAvailability[i].startTime.split(':')[0])); // base
            const index = bookedSlots.findIndex((s) =>
              s.endTime
                .split(":")[0]
                .startsWith(
                  removeMinFromTime(
                    roomTotalAvailability[i].startTime,
                    interval
                  ).split(":")[0]
                )
            ); // new
  
            bookedSlots.forEach((s, index) => {
              // Calculate the adjusted end time
              const adjustedEndTime = addMinToTime(
                s.endTime,
                bufferTime + afterBufferTime
              );
  
              // Print the adjusted end time
              logger.info(
                `Adjusted End Time for Slot ${index + 1}: ${adjustedEndTime}`
              );
  
              // Find the index based on conditions
              const matchIndex = roomTotalAvailability.findIndex(
                (availableSlot) =>
                  addMinToTime(availableSlot.startTime, interval)
                    .split(":")[0]
                    .startsWith(adjustedEndTime.split(":")[0])
              );
  
              // Print the match index
              logger.info(`Match Index for Slot ${index + 1}: ${matchIndex}`);
              // return index
            });
  
            logger.info("bookedSlots Index:", { index });
            if (index !== -1) {
              const bufferStart = addMinToTime(
                bookedSlots[index].endTime,
                bufferTime
              );
              // const bufferEnd = roomTotalAvailability[i].endTime; // base
              const bufferEnd = addMinToTime(bufferStart, interval);
              // const bufferEnd = bookedSlots[index].startTime;
              // roomTotalAvailability.push({ startTime: bufferStart, endTime: bufferEnd });
  
              if (bufferStart < bufferEnd) {
                // Only adjust if the bufferStart is before bufferEnd
                logger.info(
                  "bufferStart",
                  bufferStart,
                  "bufferEnd",
                  bufferEnd,
                  "push:",
                  addMinToTime(bookedSlots[index].endTime, interval)
                );
                // logger.info("pushed",{({ startTime: bufferStart, endTime: bufferEnd }}));
                // roomTotalAvailability.push({ startTime: bufferStart, endTime: bufferEnd }); // pushed { startTime: '14:30', endTime: '15:30' }
                // logger.info("pop",bookedSlots[index]); // pop { startTime: '13:00', endTime: '14:00' }
                // roomTotalAvailability.pop(bookedSlots[index]);
                // logger.info("splice",{ startTime: bufferStart, endTime: bufferEnd }, "IND:0,",i);
                // roomTotalAvailability.splice(i, 0, { startTime: bufferStart, endTime: bufferEnd }); // splice { startTime: '14:30', endTime: '15:30' } IND:0, 1
                roomTotalAvailability.push({
                  startTime: bufferStart,
                  endTime: bufferEnd,
                });
  
                i++; // skip the next iteration to avoid re-adjusting the same slot
              }
            }
          }
  
          logger.info("Availability Sets : ", { roomTotalAvailability });
          let allAvailSlots = [];
          //Now split these based on SLOT timing
          roomTotalAvailability.forEach((singleAvail) => {
            // logger.info({singleAvail});
            var startTime = singleAvail.startTime;
            var endTime = singleAvail.endTime;
  
            var start_time = parseTime(startTime),
              end_time = parseTime(endTime),
              interval = bookingHours * 60;
  
            var timeslots = calculate_time_slot(start_time, end_time, interval);
  
            logger.info("Timeslots:", { timeslots });
            //Creating range for slots
            for (let s = 0; s < timeslots.length - 1; s++) {
              timeslots[s] = {
                startTime: timeslots[s],
                endTime: timeslots[s + 1],
              };
            }
            //removing last extra element of "allSlots"
            timeslots.splice(timeslots.length - 1, 1);
            // logger.info({timeslots});
            allAvailSlots = allAvailSlots.concat(timeslots);
          });
          //Filtering to remove past slots for current date
          if (cTimeStamp == bTimeStamp) {
            allAvailSlots = allAvailSlots.filter((i) => {
              var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
              var sMin =
                +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
              if (eMin < currTime || sMin < currTime) {
                return false;
              } else {
                return true;
              }
            });
          }
          //sorting
          allAvailSlots.sort((a, b) => (a.startTime >= b.startTime ? 1 : -1));
          //convert to 12 hour format
          allAvailSlots.forEach((singleSlot) => {
            singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
            singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
          });
          logger.info(
            "availableSlots",
            allAvailSlots,
            "bookedSlots",
            bookedSlots
          );
          return res.json({
            status: true,
            message: "Availability returned",
            allSlots: allSlots,
            availableSlots: allAvailSlots,
            bookedSlots: bookedSlots,
          });
        }
      );
    });
  } catch (error) {
    logger.error(error,"Error Occured :")
  }
};

exports.getStudioAvailabilitiesbackup = (req, res, next) => {
 try {
   const studioId = req.body.studioId;
   const roomId = req.body.roomId;
   let bookingDate = req.body.bookingDate;
   const bookingHours = +req.body.bookingHours; //Slots will be created based on this
   logger.info({"req data of getStudioAvailabilitiesbackup":req.body})
   //get bookingDate from timestamp
   bookingDate = new Date(bookingDate);
   var yr = bookingDate.getUTCFullYear();
   var mth = bookingDate.getUTCMonth() + 1;
   if (mth.toString().length == 1) {
     mth = "0" + mth.toString();
   }
   var dt = bookingDate.getUTCDate();
   if (dt.toString().length == 1) {
     dt = "0" + dt.toString();
   }
   bookingDate = yr + "-" + mth + "-" + dt;
   var bTimeStamp = new Date(bookingDate).getTime();
   logger.info("Booking Date : ", { bookingDate });
 
   //get Current Date from timestamp
   let currDate = new Date();
   var yr = currDate.getUTCFullYear();
   var mth = currDate.getUTCMonth() + 1;
   if (mth.toString().length == 1) {
     mth = "0" + mth.toString();
   }
   var dt = currDate.getUTCDate();
   if (dt.toString().length == 1) {
     dt = "0" + dt.toString();
   }
   currDate = yr + "-" + mth + "-" + dt;
   var cTimeStamp = new Date(currDate).getTime();
   logger.info("Current Date : ", { currDate });
   var currHr = new Date().getHours();
   var currMin = new Date().getMinutes();
   var currTime = currHr * 60 + currMin;
   logger.info("Current Time : " + currTime);
 
   Studio.findStudioById(studioId).then((studioData) => {
     if (!studioData) {
       return res
         .status(404)
         .json({ status: false, message: "No studio with this ID exists" });
     }
 
     if (studioData.roomsDetails == undefined) {
       studioData.roomsDetails = [];
     }
     const roomIndex = studioData.roomsDetails.findIndex(
       (i) => i.roomId == roomId
     );
     if (roomIndex == -1) {
       return res
         .status(404)
         .json({ status: false, message: "No room with this ID exists" });
     }
     let roomTotalAvailability =
       studioData.roomsDetails[roomIndex].availabilities;
     // roomTotalAvailability = [{startTime:"09:00",endTime:"13:00"},{startTime:"15:00",endTime:"19:00"}];
     logger.info("Rooms Hours : ", { roomTotalAvailability });
 
     //Getting all slots first
     let allSlots = [];
     roomTotalAvailability.forEach((singleAvail) => {
       // logger.info({singleAvail});
       var startTime = singleAvail.startTime;
       var endTime = singleAvail.endTime;
 
       var start_time = parseTime(startTime),
         end_time = parseTime(endTime),
         interval = bookingHours * 60;
 
       var timeslots = calculate_time_slot(start_time, end_time, interval);
 
       //Creating range for slots
       for (let s = 0; s < timeslots.length - 1; s++) {
         timeslots[s] = { startTime: timeslots[s], endTime: timeslots[s + 1] };
       }
       //removing last extra element of "allSlots"
       timeslots.splice(timeslots.length - 1, 1);
       // logger.info({timeslots});
       allSlots = allSlots.concat(timeslots);
     });
     // logger.info("All Slots : ",{allSlots});
 
     Booking.fetchBookingsByStudioIdAndBookingDate(studioId,roomId, bookingDate).then(
       (bookingsData) => {
         // logger.info({bookingsData});
 
         let availSlotsNew = allSlots;
         //Filtering to remove past slots for current date
         if (cTimeStamp == bTimeStamp) {
           availSlotsNew = availSlotsNew.filter((i) => {
             var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
             var sMin =
               +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
             logger.info(sMin, eMin, currTime);
             if (eMin < currTime || sMin < currTime) {
               return false;
             } else {
               return true;
             }
           });
         }
 
         if (bookingsData.length == 0) {
           //convert to 12 hour format
           availSlotsNew.forEach((singleSlot) => {
             singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
             singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
           });
           return res.json({
             status: true,
             message: "Availability returned",
             allSlots: allSlots,
             availableSlots: availSlotsNew,
             bookedSlots: [],
           });
         }
         let bookedSlots = [];
         bookingsData.forEach((singleBooking) => {
           bookedSlots.push(singleBooking.bookingTime);
         });
 
         let availableSlots = [];
         let allSplitSlots = [];
         // allSlots.forEach(singleSlot=>{
         //     let startMin = (+singleSlot.startTime.split(':')[0] * 60) + (+singleSlot.startTime.split(':')[1]);
         //     let endMin = (+singleSlot.endTime.split(':')[0] * 60) + (+singleSlot.endTime.split(':')[1]);
         //     // logger.info(startMin,endMin);
         bookedSlots.forEach((singleBookedSlot) => {
           let startMinBooked =
             +singleBookedSlot.startTime.split(":")[0] * 60 +
             +singleBookedSlot.startTime.split(":")[1];
           let endMinBooked =
             +singleBookedSlot.endTime.split(":")[0] * 60 +
             +singleBookedSlot.endTime.split(":")[1];
 
           roomTotalAvailability.forEach((singleRoomAvail) => {
             let startMinRoom =
               +singleRoomAvail.startTime.split(":")[0] * 60 +
               +singleRoomAvail.startTime.split(":")[1];
             let endMinRoom =
               +singleRoomAvail.endTime.split(":")[0] * 60 +
               +singleRoomAvail.endTime.split(":")[1];
             if (startMinBooked >= startMinRoom && endMinBooked <= endMinRoom) {
               // logger.info("Single Room Avail : ",singleRoomAvail);
               //remove this booked slot from total room slot
               let splitSlot1 = {
                 startTime: singleRoomAvail.startTime,
                 endTime: singleBookedSlot.startTime,
               };
               let splitSlot2 = {
                 startTime: singleBookedSlot.endTime,
                 endTime: singleRoomAvail.endTime,
               };
               logger.info("Split Slot : ", { splitSlot1, splitSlot2 });
               roomTotalAvailability.push(splitSlot1);
               roomTotalAvailability.push(splitSlot2);
 
               //Also, before next iteration, remove this availablitiy slot from room (since updated is added)
               const availIndex1 = roomTotalAvailability.findIndex(
                 (a) =>
                   a.startTime == singleRoomAvail.startTime &&
                   a.endTime == singleRoomAvail.endTime
               );
               if (availIndex1 != -1) {
                 roomTotalAvailability.splice(availIndex1, 1);
               }
               // logger.info({roomTotalAvailability});
 
               // //For Split SLOT 1
               // var startTime1 = splitSlot1.startTime;
               // var endTime1 = splitSlot1.endTime;
 
               // var start_time1 = parseTime(startTime1),
               //     end_time1 = parseTime(endTime1),
               //     interval = bookingHours*60;
 
               // var timeslots1 = calculate_time_slot( start_time1, end_time1, interval );
 
               // //Creating range for slots
               // for(let s=0;s<timeslots1.length-1;s++)
               // {
               //     timeslots1[s] = {startTime:timeslots1[s],endTime:timeslots1[s+1]};
               // }
               // //removing last extra element of "allSlots"
               // timeslots1.splice((timeslots1.length-1),1);
               // // timeslots1.forEach(singleTimeSlot=>{
               // //     const index2 = availableSlots.findIndex(q=>q.startTime.split(':')[0].startsWith(singleTimeSlot.startTime.split(':')[0]));
               // //     // logger.info("Index : ",index2);
               // //     if(index2==-1)
               // //     {
               // //         availableSlots.push(singleTimeSlot);
               // //     }
               // // })
               // availableSlots = availableSlots.concat(timeslots1);
 
               // //For Split SLOT 2
               // var startTime2 = addMinToTime(splitSlot2.startTime,30);
               // var endTime2 = splitSlot2.endTime;
 
               // var start_time2 = parseTime(startTime2),
               //     end_time2 = parseTime(endTime2),
               //     interval = bookingHours*60;
 
               // var timeslots2 = calculate_time_slot( start_time2, end_time2, interval );
 
               // //Creating range for slots
               // for(let s=0;s<timeslots2.length-1;s++)
               // {
               //     timeslots2[s] = {startTime:timeslots2[s],endTime:timeslots2[s+1]};
               // }
               // //removing last extra element of "allSlots"
               // timeslots2.splice((timeslots2.length-1),1);
               // // timeslots2.forEach(singleTimeSlot=>{
               // //     const index2 = availableSlots.findIndex(q=>q.startTime.split(':')[0].startsWith(singleTimeSlot.startTime.split(':')[0]));
               // //     // logger.info("Index : ",index2);
               // //     if(index2==-1)
               // //     {
               // //         availableSlots.push(singleTimeSlot);
               // //     }
               // // })
               // availableSlots = availableSlots.concat(timeslots2);
             }
             // else{
             //     // logger.info("Other Slot: ",singleRoomAvail);
             //     var startTimeOther = singleRoomAvail.startTime;
             //     var endTimeOther = singleRoomAvail.endTime;
 
             //     var start_timeOther = parseTime(startTimeOther),
             //         end_timeOther = parseTime(endTimeOther),
             //         interval = bookingHours*60;
 
             //     var timeslotsOther = calculate_time_slot( start_timeOther, end_timeOther, interval );
 
             //     //Creating range for slots
             //     for(let s=0;s<timeslotsOther.length-1;s++)
             //     {
             //         timeslotsOther[s] = {startTime:timeslotsOther[s],endTime:timeslotsOther[s+1]};
             //     }
             //     //removing last extra element of "allSlots"
             //     timeslotsOther.splice((timeslotsOther.length-1),1);
             //     availableSlots = availableSlots.concat(timeslotsOther);
             // }
           });
         });
         // });
         logger.info("Availability Sets : ", { roomTotalAvailability });
         //add 30 min interval before starting next slot
         for (let i = 1; i < roomTotalAvailability.length; i++) {
           const index = bookedSlots.findIndex((s) =>
             s.endTime
               .split(":")[0]
               .startsWith(roomTotalAvailability[i].startTime.split(":")[0])
           );
           if (index != -1) {
             roomTotalAvailability[i].startTime = addMinToTime(
               roomTotalAvailability[i].startTime,
               30
             );
           }
         }
         logger.info("Availability Sets : ", { roomTotalAvailability });
         let allAvailSlots = [];
         //Now split these based on SLOT timing
         roomTotalAvailability.forEach((singleAvail) => {
           // logger.info({singleAvail});
           var startTime = singleAvail.startTime;
           var endTime = singleAvail.endTime;
 
           var start_time = parseTime(startTime),
             end_time = parseTime(endTime),
             interval = bookingHours * 60;
 
           var timeslots = calculate_time_slot(start_time, end_time, interval);
 
           //Creating range for slots
           for (let s = 0; s < timeslots.length - 1; s++) {
             timeslots[s] = {
               startTime: timeslots[s],
               endTime: timeslots[s + 1],
             };
           }
           //removing last extra element of "allSlots"
           timeslots.splice(timeslots.length - 1, 1);
           // logger.info({timeslots});
           allAvailSlots = allAvailSlots.concat(timeslots);
         });
         //Filtering to remove past slots for current date
         if (cTimeStamp == bTimeStamp) {
           allAvailSlots = allAvailSlots.filter((i) => {
             var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
             var sMin =
               +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
             if (eMin < currTime || sMin < currTime) {
               return false;
             } else {
               return true;
             }
           });
         }
         //sorting
         allAvailSlots.sort((a, b) => (a.startTime >= b.startTime ? 1 : -1));
         //convert to 12 hour format
         allAvailSlots.forEach((singleSlot) => {
           singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
           singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
         });
         return res.json({
           status: true,
           message: "Availability returned",
           allSlots: allSlots,
           availableSlots: allAvailSlots,
           bookedSlots: bookedSlots,
         });
       }
     );
   });
 } catch (error) {
  logger.error(error,"Error Occured :")
 }
};

exports.getStudioAvailabilitiesWork2 = (req, res, next) => {
  const req_body = req.body;
  logger.info("req.body | ", { req_body });

  const studioId = req.body.studioId;
  const roomId = req.body.roomId;
  let bookingDate = req.body.bookingDate;
  const bookingHours = +req.body.bookingHours; //Slots will be created based on this

  //get bookingDate from timestamp
  bookingDate = new Date(bookingDate);
  var yr = bookingDate.getUTCFullYear();
  var mth = bookingDate.getUTCMonth() + 1;
  if (mth.toString().length == 1) {
    mth = "0" + mth.toString();
  }
  var dt = bookingDate.getUTCDate();
  if (dt.toString().length == 1) {
    dt = "0" + dt.toString();
  }
  bookingDate = yr + "-" + mth + "-" + dt;
  var bTimeStamp = new Date(bookingDate).getTime();
  logger.info("Booking Date : ", { bookingDate });

  //get Current Date from timestamp
  let currDate = new Date();
  var yr = currDate.getUTCFullYear();
  var mth = currDate.getUTCMonth() + 1;
  if (mth.toString().length == 1) {
    mth = "0" + mth.toString();
  }
  var dt = currDate.getUTCDate();
  if (dt.toString().length == 1) {
    dt = "0" + dt.toString();
  }
  currDate = yr + "-" + mth + "-" + dt;
  var cTimeStamp = new Date(currDate).getTime();
  logger.info("Current Date : ", { currDate });
  var currHr = new Date().getHours();
  var currMin = new Date().getMinutes();
  var currTime = currHr * 60 + currMin;
  logger.info("Current Time : " + currTime);

  Studio.findStudioById(studioId).then((studioData) => {
    if (!studioData) {
      return res
        .status(404)
        .json({ status: false, message: "No studio with this ID exists" });
    }

    if (studioData.roomsDetails == undefined) {
      studioData.roomsDetails = [];
    }
    const roomIndex = studioData.roomsDetails.findIndex(
      (i) => i.roomId == roomId
    );
    if (roomIndex == -1) {
      return res
        .status(404)
        .json({ status: false, message: "No room with this ID exists" });
    }
    let roomTotalAvailability =
      studioData.roomsDetails[roomIndex].availabilities;
    // roomTotalAvailability = [{startTime:"09:00",endTime:"13:00"},{startTime:"15:00",endTime:"19:00"}];
    logger.info("Rooms Hours : ", { roomTotalAvailability });

    //Getting all slots first
    let allSlots = [];
    roomTotalAvailability.forEach((singleAvail) => {
      logger.info("singleAvail:::", { singleAvail });
      var startTime = singleAvail.startTime;
      var endTime = singleAvail.endTime;

      var start_time = parseTime(startTime),
        end_time = parseTime(endTime),
        interval = bookingHours * 60;

      var timeslots = calculate_time_slot(start_time, end_time, interval);

      logger.info("|||timeslots --", { timeslots });

      //Creating range for slots
      for (let s = 0; s < timeslots.length - 1; s++) {
        timeslots[s] = { startTime: timeslots[s], endTime: timeslots[s + 1] };
      }
      //removing last extra element of "allSlots"
      timeslots.splice(timeslots.length - 1, 1);
      // console.log("timeslots")
      // console.log(timeslots)
      // logger.info({timeslots});
      allSlots = allSlots.concat(timeslots);
    });
    // logger.info("All Slots : ",{allSlots});

    Booking.fetchBookingsByStudioIdAndBookingDate(studioId,roomId, bookingDate).then(
      (bookingsData) => {
        // logger.info({bookingsData});

        let availSlotsNew = allSlots;
        //Filtering to remove past slots for current date
        if (cTimeStamp == bTimeStamp) {
          availSlotsNew = availSlotsNew.filter((i) => {
            var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
            var sMin =
              +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
            logger.info("-------", { sMin, eMin, currTime });
            if (eMin < currTime || sMin < currTime) {
              return false;
            } else {
              return true;
            }
          });
        }

        if (bookingsData.length == 0) {
          //convert to 12 hour format
          availSlotsNew.forEach((singleSlot) => {
            singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
            singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
          });
          logger.info("allSlots", { allSlots }, "availableSlots", {
            availSlotsNew,
          });
          return res.json({
            status: true,
            message: "Availability returned",
            allSlots: allSlots,
            availableSlots: availSlotsNew,
            bookedSlots: [],
          });
        }
        let bookedSlots = [];
        bookingsData.forEach((singleBooking) => {
          logger.info("singleBooking.bookingTime:::", { singleBooking });
          bookedSlots.push(singleBooking.bookingTime);
        });

        let availableSlots = [];
        let allSplitSlots = [];
        // allSlots.forEach(singleSlot=>{
        //     let startMin = (+singleSlot.startTime.split(':')[0] * 60) + (+singleSlot.startTime.split(':')[1]);
        //     let endMin = (+singleSlot.endTime.split(':')[0] * 60) + (+singleSlot.endTime.split(':')[1]);
        //     // logger.info(startMin,endMin);
        // Loop through bookedSlots to add buffer and split slots
        bookedSlots.forEach((singleBookedSlot) => {
          // Add an extra slot
          let extraSlot = {
            startTime: singleBookedSlot.endTime, // Start time of the booked slot becomes end time of the extra slot
            endTime: addMinToTime(singleBookedSlot.endTime, 30), // Assuming the extra slot is 30 minutes long
          };
          availSlotsNew.push(extraSlot);

          // Continue with the regular slots
          let startMinBooked =
            +singleBookedSlot.startTime.split(":")[0] * 60 +
            +singleBookedSlot.startTime.split(":")[1];
          let endMinBooked =
            +singleBookedSlot.endTime.split(":")[0] * 60 +
            +singleBookedSlot.endTime.split(":")[1];
          logger.info(
            "startMinBooked:",
            startMinBooked,
            "endMinBooked",
            endMinBooked,
            "singleBookedSlot:",
            singleBookedSlot
          );
          roomTotalAvailability.forEach((singleRoomAvail) => {
            let startMinRoom =
              +singleRoomAvail.startTime.split(":")[0] * 60 +
              +singleRoomAvail.startTime.split(":")[1];
            let endMinRoom =
              +singleRoomAvail.endTime.split(":")[0] * 60 +
              +singleRoomAvail.endTime.split(":")[1];
            if (startMinBooked >= startMinRoom && endMinBooked <= endMinRoom) {
              // Remove this booked slot from total room slot
              let splitSlot1 = {
                startTime: singleRoomAvail.startTime,
                endTime: singleBookedSlot.startTime,
              };
              let splitSlot2 = {
                startTime: singleBookedSlot.endTime,
                endTime: singleRoomAvail.endTime,
              };
              logger.info("Split Slot : ", { splitSlot1, splitSlot2 });
              roomTotalAvailability.push(splitSlot1);
              roomTotalAvailability.push(splitSlot2);

              // Also, before next iteration, remove this availablitiy slot from room (since updated is added)
              const availIndex1 = roomTotalAvailability.findIndex(
                (a) =>
                  a.startTime == singleRoomAvail.startTime &&
                  a.endTime == singleRoomAvail.endTime
              );
              if (availIndex1 != -1) {
                roomTotalAvailability.splice(availIndex1, 1);
              }
            }
          });
        });

        // });
        logger.info("Availability Sets : ", { roomTotalAvailability });
        // Loop through roomTotalAvailability to add 30 min buffer before starting next slot
        for (let i = 1; i < roomTotalAvailability.length; i++) {
          const index = bookedSlots.findIndex((s) =>
            s.endTime
              .split(":")[0]
              .startsWith(roomTotalAvailability[i].startTime.split(":")[0])
          );
          if (index != -1) {
            roomTotalAvailability[i].startTime = addMinToTime(
              roomTotalAvailability[i].startTime,
              30
            );
          }
        }
        logger.info("Availability Sets : ", { roomTotalAvailability });
        let allAvailSlots = [];
        roomTotalAvailability.forEach((singleAvail) => {
          // logger.info({singleAvail});
          var startTime = singleAvail.startTime;
          var endTime = singleAvail.endTime;

          var start_time = parseTime(startTime),
            end_time = parseTime(endTime),
            interval = bookingHours * 60;

          var timeslots = calculate_time_slot(start_time, end_time, interval);

          logger.info("Timeslots:", { timeslots });
          // Creating range for slots
          for (let s = 0; s < timeslots.length - 1; s++) {
            timeslots[s] = {
              startTime: timeslots[s],
              endTime: timeslots[s + 1],
            };
          }
          // Removing the last extra element of "allSlots"
          timeslots.splice(timeslots.length - 1, 1);
          // logger.info({timeslots});
          allAvailSlots = allAvailSlots.concat(timeslots);
        });

        // Filter to remove past slots for the current date
        if (cTimeStamp == bTimeStamp) {
          allAvailSlots = allAvailSlots.filter((i) => {
            var eMin = +i.endTime.split(":")[0] * 60 + +i.endTime.split(":")[1];
            var sMin =
              +i.startTime.split(":")[0] * 60 + +i.startTime.split(":")[1];
            if (eMin < currTime || sMin < currTime) {
              return false;
            } else {
              return true;
            }
          });
        }
        // Sorting
        allAvailSlots.sort((a, b) => (a.startTime >= b.startTime ? 1 : -1));

        // Convert to 12-hour format
        allAvailSlots.forEach((singleSlot) => {
          singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
          singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
        });

        logger.info(
          "allSlots",
          allSlots,
          "availableSlots",
          allAvailSlots,
          "bookedSlots",
          bookedSlots
        );

        return res.json({
          status: true,
          message: "Availability returned",
          allSlots: allSlots,
          availableSlots: allAvailSlots,
          bookedSlots: bookedSlots,
        });
      }
    );
  });
};

// TEST_SLOTS

exports.getStudioAvailabilitiesTEST = async (req, res, next) => {
 try {
   const studioId = req.body.studioId;
   const roomId = req.body.roomId;
   let bookingDate = req.body.bookingDate;
   const bookingHours = +req.body.bookingHours; //Slots will be created based on this
   const bufferTime = 15;
   const interval = bookingHours * 60;
   logger.info({"req data of getStudioAvailabilitiesTEST":req.body})
   const start_and_end_times = [];
 
   Studio.findStudioById(studioId).then((studioData) => {
     // console.log(studioData);
     studioData.roomsDetails.forEach((room) => {
       room.availabilities.map((avail) => {
         start_and_end_times.push(avail);
       });
     });
     return res.send({ avails: start_and_end_times });
   });
 } catch (error) {
  logger.error(error,"Error Occured :")
 }
};
//

function getCompletedBookings(allBookings, _callback) {
try {
    var currDate = new Date();
    var mth = currDate.getMonth() + 1;
    if (mth.toString().length == 1) {
      mth = "0" + mth.toString();
    }
    var dt = currDate.getDate();
    if (dt.toString().length == 1) {
      dt = "0" + dt.toString();
    }
    var fullDate = currDate.getFullYear() + "-" + mth + "-" + dt;
    fullDate = new Date(fullDate).getTime();
    // logger.info({fullDate});
  
    var currTotalMin = currDate.getHours() * 60 + currDate.getMinutes();
    logger.info({ currTotalMin });
  
    if (allBookings.length == 0) {
      return _callback([], []);
    } else {
      let count = 0;
      let completedBookings = [];
      let activeBookings = [];
      allBookings = allBookings.filter((i) => i.bookingStatus != 2);
      if (allBookings.length == 0) {
        return _callback([], []);
      }
      allBookings.forEach((singleBooking) => {
        count++;
        var onlyDate = singleBooking.bookingDate.split("T")[0];
        var bDate = new Date(onlyDate).getTime();
        if (bDate < fullDate) {
          completedBookings.push(singleBooking);
        } else if (bDate == fullDate) {
          logger.info("Same");
          var bTotalMin =
            +singleBooking.bookingTime.endTime.split(":")[0] * 60 +
            +singleBooking.bookingTime.endTime.split(":")[1];
          logger.info({ bTotalMin });
          if (bTotalMin < currTotalMin) {
            completedBookings.push(singleBooking);
          } else {
            activeBookings.push(singleBooking);
          }
        } else {
          activeBookings.push(singleBooking);
        }
  
        if (count == allBookings.length) {
          logger.info(activeBookings.length, completedBookings.length);
          return _callback(activeBookings, completedBookings);
        }
      });
    }
} catch (error) {
  logger.error(error,"Error Occured :")
}
}

function checkBookingRating(completedBookings, _callback) {
  if (completedBookings.length == 0) {
    return _callback(completedBookings);
  } else {
    let mappedCompletedBookings = [];
    completedBookings.forEach(async (singleBooking) => {
      singleBooking.isRated = 0;
      let ratingData = await Rating.findRatingByBookingIdAndUserId(
        singleBooking._id.toString(),
        singleBooking.userId
      );
      // logger.info("Rating Data : "+ratingData);
      if (ratingData != null) {
        singleBooking.isRated = 1;
      }
      mappedCompletedBookings.push(singleBooking);

      if (mappedCompletedBookings.length == completedBookings.length) {
        return _callback(mappedCompletedBookings);
      }
    });
  }
}

exports.getBookingsOfParticularUser = (req, res, next) => {
 try {
   console.log("req.params", req.params);
   console.log("req.query", req.query);
   logger.info({"req data of getBookingsOfParticularUser params":req.params})
   logger.info({"req data of getBookingsOfParticularUser query":req.query})
   const userId = req.params.userId;
   const source = req.query.source;
   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 10;
 
   User.findUserByUserId(userId).then(async (userData) => {
     if (!userData) {
       return res
         .status(404)
         .json({ status: false, message: "No User with this ID exists" });
     }
 
     else if (source === "website") {
       console.log("this runnnn");
       const skip = (page - 1) * limit;
       const pipelineForStudio = [
         {
           $match: { type: "c1", userId: userId },
         },
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
           },
         },
         {
           $match: {
             $or: [{ studioName: { $exists: true, $ne: null } }],
           },
         },
         {
           $skip: skip,
         },
         {
           $limit: limit,
         },
         {
           $project: {
             studioInfo: 0,
           },
         },
       ];
 
       const pipelineForStudioCount = [
         {
           $match: { type: "c1", userId: userId },
         },
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
           },
         },
         {
           $match: {
             $or: [{ studioName: { $exists: true, $ne: null } }],
           },
         },
         {
           $count: "totalcount",
         },
       ];
 
       let allStudioBooking = await Booking.aggregate(pipelineForStudio)
       const countResult = await Booking.aggregate(pipelineForStudioCount)
       const totalRecords = countResult[0] ? countResult[0].totalcount : 0;
       const totalPages = Math.ceil(totalRecords / limit);
 
       let diff = allStudioBooking.map((booking, i) => {
         let { startTime, endTime } = booking.bookingTime
         let result = parseInt(endTime) - parseInt(startTime)
         booking.no_of_hours = result
         allStudioBooking[i] = booking
       })
 
       return res.json({
         status: true,
         message: "All booking(s) returned",
         allStudioBooking,
         NoOfHours: diff,
         paginate: {
           page,
           limit,
           totalPages,
           totalRecords,
         },
       });
     } else {
       Booking.fetchAllBookingsByUserId(userId).then((bookingsData) => {
 
         if (bookingsData.length == 0) {
           return res.json({
             status: true,
             message: "All booking(s) returned",
             activeBookings: [],
             completedBookings: [],
             cancelledBookings: [],
           });
         } else {
           let mappedBookings = [];
           let allBookings = bookingsData.map(async (i) => {
             i.studioData = null;
             let studioInfo = await Studio.findStudioById(i.studioId);
             if (studioInfo != null) {
               i.studioData = studioInfo;
             }
             mappedBookings.push(i);
             if (mappedBookings.length == bookingsData.length) {
               //Filter non-null studios
               mappedBookings = mappedBookings.filter(
                 (i) => i.studioData != null
               );
 
               let cancelledBookings = mappedBookings.filter(
                 (i) => i.bookingStatus == 2
               );
               // let activeBookings = mappedBookings.filter(i=>i.bookingStatus==undefined || i.bookingStatus==0);
               // let completedBookings = mappedBookings.filter(i=>i.bookingStatus==1);
               getCompletedBookings(mappedBookings, (resActive, resComplete) => {
                 checkBookingRating(resComplete, (resCheckData) => {
                   resActive.sort((a, b) => {
                     if (
                       new Date(a.bookingDate).toString() ==
                       new Date(b.bookingDate).toString()
                     ) {
                       logger.info("Same startTime");
                       let startTime =
                         +a.bookingTime.startTime.split(":")[0] * 60 +
                         +a.bookingTime.startTime.split(":")[1];
                       let endTime =
                         +b.bookingTime.startTime.split(":")[0] * 60 +
                         +b.bookingTime.startTime.split(":")[1];
                       return startTime - endTime;
                     } else {
                       return new Date(a.bookingDate) - new Date(b.bookingDate);
                     }
                   });
 
                   resActive.forEach((singleBooking) => {
                     singleBooking.bookingTime.startTime = convertTo12HourFormat(
                       singleBooking.bookingTime.startTime
                     );
                     singleBooking.bookingTime.endTime = convertTo12HourFormat(
                       singleBooking.bookingTime.endTime
                     );
                   });
                   resCheckData.forEach((singleBooking) => {
                     singleBooking.bookingTime.startTime = convertTo12HourFormat(
                       singleBooking.bookingTime.startTime
                     );
                     singleBooking.bookingTime.endTime = convertTo12HourFormat(
                       singleBooking.bookingTime.endTime
                     );
                   });
                   cancelledBookings.forEach((singleBooking) => {
                     singleBooking.bookingTime.startTime = convertTo12HourFormat(
                       singleBooking.bookingTime.startTime
                     );
                     singleBooking.bookingTime.endTime = convertTo12HourFormat(
                       singleBooking.bookingTime.endTime
                     );
                   });
                   //  else {
                   return res.json({
                     status: true,
                     message: "All booking(s) returned",
                     activeBookings: resActive,
                     completedBookings: resCheckData,
                     cancelledBookings: cancelledBookings,
                   });
                   // }
                 });
               });
             }
           });
         }
       })
     }
 
   });
 } catch (error) {
  logger.error(error,"Error Occured :")
 }
};

exports.cancelParticularBooking = (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    logger.info({"req data of bookingId":bookingId})
    Booking.findBookingById(bookingId).then((bookingData) => {
      if (!bookingData) {
        return res
          .status(404)
          .json({ status: false, message: "No Booking with this ID exists" });
      }
      bookingData.bookingStatus = 2;
  
      const db = getDb();
      var o_id = new ObjectId(bookingId);
  
      db.collection("bookings")
        .updateOne({ _id: o_id }, { $set: bookingData })
        .then((resultData) => {
          User.findUserByUserId(bookingData.userId).then((userData) => {
            const title = "Cancelled!!";
            const message = "Your booking has been cancelled";
            var myJSONObject = {
              app_id: process.env.ONE_SIGNAL_APP_ID,
              include_player_ids: [userData.deviceId],
              data: {},
              contents: { en: title + "\n" + message },
            };
  
            axios({
              method: "post",
              url: "https://onesignal.com/api/v1/notifications",
              data: myJSONObject,
              headers: {
                "Content-Type": "application/json",
                Authorization: process.env.ONE_SIGNAL_AUTH,
              },
            })
              .then(async (result) => {
                let result_data = result.data;
                logger.info("Success : ", { result_data });
                if (result.data.recipients == 1) {
                  const notification = new Notifications(
                    userData._id.toString(),
                    title,
                    message
                  );
  
                  //saving in database
                  return notification.save().then((resultData) => {
                    // return res.json({ status: true, message: "Booking created successfully", booking: bookingData });
                    const adminNotificationObj = new AdminNotifications(
                      userData._id.toString(),
                      bookingData.studioId.toString(),
                      bookingData._id.toString(),
                      "Booking Cancelled",
                      userData.fullName + " cancelled booking"
                    );
                    //saving in database
                    return adminNotificationObj.save().then((resultData1) => {
                      return res.json({
                        status: true,
                        message: "Booking cancelled successfully",
                        booking: bookingData,
                      });
                    });
                  });
                } else {
                  logger.info(result.data);
                  return res.json({
                    status: true,
                    message:
                      "Booking cancelled successfully(Notification not sent)",
                    booking: bookingData,
                  });
                }
              })
              .catch((err) => {
                logger.error(err);
                return res.json({
                  status: true,
                  message:
                    "Booking cancelled successfully(Notification not sent)",
                  booking: bookingData,
                });
              });
          });
        });
    });
  } catch (error) {
    logger.error(error,"Error Occured :")
  }
};

// get Studio Bookings v2.0.0
exports.getAllBookings2 = (req, res, next) => {
  try {
    let skip = +req.query.skip;
    let limit = +req.query.limit;
    let bookingType = +req.query.bookingType;
    logger.info({"req data of getAllBookings2":req.query})
    if (isNaN(skip)) {
      skip = 0;
      limit = 0;
    }
  
    if (isNaN(bookingType)) {
      bookingType = -1;
    }
  
    const db = getDb();
  
    if (bookingType == -1) {
      Booking.fetchAllBookings(skip, limit).then((bookingsData) => {
        let mappedBookings = [];
        let allBookings = bookingsData.map(async (i) => {
          i.studioName = "";
          let studioInfo = await Studio.findStudioById(i.studioId);
          if (studioInfo != null) {
            i.studioName = studioInfo.fullName;
          }
          i.userName = "";
          i.userEmail = "NA";
          i.userPhone = "NA";
          i.userType = "";
          let userData = await User.findUserByUserId(i.userId);
          if (userData != null) {
            i.userName = userData.fullName;
            i.userEmail = userData.email;
            i.userPhone = userData.phone;
            i.userType = "USER";
          } else {
            let adminData = await Admin.findAdminById(i.userId);
            if (adminData != null) {
              i.userName = adminData.firstName + " " + adminData.lastName;
              i.userEmail = adminData.email;
              i.userType = "ADMIN";
            } else {
              let subAdminData = await SubAdmin.findSubAdminById(i.userId);
              if (subAdminData != null) {
                i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                i.userEmail = subAdminData.email;
                i.userType = "ADMIN";
              } else {
                let ownerData = await Owner.findOwnerByOwnerId(i.userId);
                if (ownerData != null) {
                  i.userName = ownerData.firstName + " " + ownerData.lastName;
                  i.userEmail = ownerData.email;
                  i.userType = "OWNER";
                }
              }
            }
          }
          mappedBookings.push(i);
          if (mappedBookings.length == bookingsData.length) {
            let cancelledBookings = mappedBookings.filter(
              (i) => i.bookingStatus == 2
            );
            getCompletedBookings(mappedBookings, (resActive, resComplete) => {
              return res.json({
                status: true,
                message: "All booking(s) returned",
                activeBookings: resActive,
                completedBookings: resComplete,
                cancelledBookings: cancelledBookings,
              });
            });
          }
        });
      });
    } else if (bookingType == 2) {
      //Get all cancelled bookings
      Booking.fetchAllBookingsByType(skip, limit, 2).then((bookingsData) => {
        let mappedBookings = [];
        let allBookings = bookingsData.map(async (i) => {
          i.studioName = "";
          let studioInfo = await Studio.findStudioById(i.studioId);
          if (studioInfo != null) {
            i.studioName = studioInfo.fullName;
          }
          i.userName = "";
          i.userEmail = "NA";
          i.userPhone = "NA";
          i.userType = "";
          let userData = await User.findUserByUserId(i.userId);
          if (userData != null) {
            i.userName = userData.fullName;
            i.userEmail = userData.email;
            i.userPhone = userData.phone;
            i.userType = "USER";
          } else {
            let adminData = await Admin.findAdminById(i.userId);
            if (adminData != null) {
              i.userName = adminData.firstName + " " + adminData.lastName;
              i.userEmail = adminData.email;
              i.userType = "ADMIN";
            } else {
              let subAdminData = await SubAdmin.findSubAdminById(i.userId);
              if (subAdminData != null) {
                i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                i.userEmail = subAdminData.email;
                i.userType = "ADMIN";
              } else {
                let ownerData = await Owner.findOwnerByOwnerId(i.userId);
                if (ownerData != null) {
                  i.userName = ownerData.firstName + " " + ownerData.lastName;
                  i.userEmail = ownerData.email;
                  i.userType = "OWNER";
                }
              }
            }
          }
          mappedBookings.push(i);
          if (mappedBookings.length == bookingsData.length) {
            let cancelledBookings = mappedBookings.filter(
              (i) => i.bookingStatus == 2
            );
            db.collection("bookings")
              .find({ bookingStatus: 2 })
              .count()
              .then((resData2) => {
                return res.json({
                  status: true,
                  message: "All booking(s) returned",
                  data: cancelledBookings,
                  totalBookings: resData2,
                });
              });
          }
        });
      });
    } else if (bookingType == 0) {
      //Get all active bookings
      Booking.fetchAllBookingsByType(skip, limit, 0).then((bookingsData) => {
        let mappedBookings = [];
        let allBookings = bookingsData.map(async (i) => {
          i.studioName = "";
          let studioInfo = await Studio.findStudioById(i.studioId);
          if (studioInfo != null) {
            i.studioName = studioInfo.fullName;
          }
          i.userName = "";
          i.userEmail = "NA";
          i.userPhone = "NA";
          i.userType = "";
          let userData = await User.findUserByUserId(i.userId);
          if (userData != null) {
            i.userName = userData.fullName;
            i.userEmail = userData.email;
            i.userPhone = userData.phone;
            i.userType = "USER";
          } else {
            let adminData = await Admin.findAdminById(i.userId);
            if (adminData != null) {
              i.userName = adminData.firstName + " " + adminData.lastName;
              i.userEmail = adminData.email;
              i.userType = "ADMIN";
            } else {
              let subAdminData = await SubAdmin.findSubAdminById(i.userId);
              if (subAdminData != null) {
                i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                i.userEmail = subAdminData.email;
                i.userType = "ADMIN";
              } else {
                let ownerData = await Owner.findOwnerByOwnerId(i.userId);
                if (ownerData != null) {
                  i.userName = ownerData.firstName + " " + ownerData.lastName;
                  i.userEmail = ownerData.email;
                  i.userType = "OWNER";
                }
              }
            }
          }
          mappedBookings.push(i);
          if (mappedBookings.length == bookingsData.length) {
            db.collection("bookings")
              .find({ bookingStatus: 0 })
              .count()
              .then((resData2) => {
                return res.json({
                  status: true,
                  message: "All booking(s) returned",
                  data: mappedBookings,
                  totalBookings: resData2,
                });
              });
          }
        });
      });
    } else if (bookingType == 1) {
      //Get all completed bookings
      Booking.fetchAllBookingsByType(skip, limit, 1).then((bookingsData) => {
        let mappedBookings = [];
        let allBookings = bookingsData.map(async (i) => {
          i.studioName = "";
          let studioInfo = await Studio.findStudioById(i.studioId);
          if (studioInfo != null) {
            i.studioName = studioInfo.fullName;
          }
          i.userName = "";
          i.userEmail = "NA";
          i.userPhone = "NA";
          i.userType = "";
          let userData = await User.findUserByUserId(i.userId);
          if (userData != null) {
            i.userName = userData.fullName;
            i.userEmail = userData.email;
            i.userPhone = userData.phone;
            i.userType = "USER";
          } else {
            let adminData = await Admin.findAdminById(i.userId);
            if (adminData != null) {
              i.userName = adminData.firstName + " " + adminData.lastName;
              i.userEmail = adminData.email;
              i.userType = "ADMIN";
            } else {
              let subAdminData = await SubAdmin.findSubAdminById(i.userId);
              if (subAdminData != null) {
                i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                i.userEmail = subAdminData.email;
                i.userType = "ADMIN";
              } else {
                let ownerData = await Owner.findOwnerByOwnerId(i.userId);
                if (ownerData != null) {
                  i.userName = ownerData.firstName + " " + ownerData.lastName;
                  i.userEmail = ownerData.email;
                  i.userType = "OWNER";
                }
              }
            }
          }
          mappedBookings.push(i);
          if (mappedBookings.length == bookingsData.length) {
            db.collection("bookings")
              .find({ bookingStatus: 1 })
              .count()
              .then((resData2) => {
                return res.json({
                  status: true,
                  message: "All booking(s) returned",
                  data: mappedBookings,
                  totalBookings: resData2,
                });
              });
          }
        });
      });
    }
  } catch (error) {
    logger.error(error,"Error Occured :")
  }
};

exports.getAllBookings3 = async (req, res, next) => {
  try {
    let skipValue = parseInt(req.query.skip) || 0;
    let limitValue = parseInt(req.query.limit) || 10;
    let bookingTypeValue = parseInt(req.query.bookingType); // || -1;
    let bookingCategory = req.query.category;
    // logger.info("Parsed bookingType value:",{bookingTypeValue});

    const filters = buildFilters(req.query);
    const sort = buildSort(req.query);
    logger.info({"req data of getAllBookings3":req.query})
    logger.info("oprions----", { filters, sort });

    let bookingsData;

    switch (bookingTypeValue) {
      case -1:
        bookingsData = await Booking.fetchAllBookings(skipValue, limitValue);
        break;
      case 0:
      case 1:
      case 2:
        bookingsData = await Booking.fetchFilteredAndSortedBookings(
          filters,
          sort,
          skipValue,
          limitValue
        );
        break;
      default:
        bookingsData = await Booking.fetchAllBookings(skipValue, limitValue);
        break;
      // return res.status(400).json({ status: false, message: "Invalid booking type" });
    }

    if (!bookingsData || bookingsData.length === 0) {
      return res.json({ status: true, message: "No bookings found", data: [] });
    }

    logger.info("bookingsData---", { bookingsData });

    const totalBookings = await Booking.fetchAllBookingsCount(bookingTypeValue);
    // logger.info("totalBookings------",{totalBookings});
    const totalPages = Math.ceil((totalBookings + limitValue - 1) / limitValue);

    const mappedBookings = await Promise.all(
      bookingsData.map(async (booking) => {
        try {
          const [studioInfo, userData] = await Promise.all([
            Service.findServiceById(booking.studioId),
            User.findUserByUserId(booking.userId) ||
            Admin.findAdminById(booking.userId) ||
            SubAdmin.findSubAdminById(booking.userId) ||
            Owner.findOwnerByOwnerId(booking.userId),
          ]);
          logger.info("studioInfo-------", { studioInfo });
          booking.studioName = studioInfo?.fullName || "";
          booking.userName = userData
            ? userData.fullName || `${userData.firstName} ${userData.lastName}`
            : "";
          booking.userEmail = userData?.email || "NA";
          booking.userPhone = userData?.phone || "NA";
          booking.userType = userData
            ? userData.role === "user"
              ? "USER"
              : "ADMIN"
            : "";
          booking.type = studioInfo?.type || "NA";

          return booking;
        } catch (error) { 
          logger.error(error, "Error while processing booking:");
          throw error; // Rethrow the error to be caught by the outer try-catch
        }
      })
    );

    // logger.info("mappedBookings---",{mappedBookings[0]});

    const groupedBookings = {
      activeBookings: [],
      completedBookings: [],
      cancelledBookings: [],
    };

    mappedBookings.forEach((booking) => {
      if (booking.bookingStatus === 0) {
        groupedBookings.activeBookings.push(booking);
      } else if (booking.bookingStatus === 1) {
        groupedBookings.completedBookings.push(booking);
      } else if (booking.bookingStatus === 2) {
        groupedBookings.cancelledBookings.push(booking);
      }
    });

    // logger.info("Mapped bookings:",{mappedBookings[0]});
    // logger.info("Grouped bookings:",{groupedBookings});

    return res.json({
      status: true,
      message: "All booking(s) returned",
      data: groupedBookings,
      paginate: {
        page: Math.floor(skipValue / limitValue) + 1,
        limit: limitValue,
        totalResults: totalBookings,
        totalPages: totalPages,
      },
    });
  } catch (error) {
    logger.error(error, "Error Occured:");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};


// only Studio Bookings
exports.getAllBookings = async (req, res, next) => {
  let req_query = req.query;
  logger.info("HITTTT");
  logger.info("data:", { req_query });
  try {
    let limit = +req.query.limit || 10;
    let page = +req.query.page || 1;
    let searchField = req.query.searchField;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    let skip = (page - 1) * limit;
    let bookingType = [0, 1, 2].includes(+req.query.bookingType)
      ? +req.query.bookingType
      : -1;
    let booking_category = req.query.category || "c1";
    logger.info("bookingType", { bookingType });
    logger.info({ booking_category, bookingType });
    logger.info("hello");
    const pipeline_lane = [];
    const commonPipeline = [
      //Ensure discountId is a valid string before lookup
      {
        $addFields: {
          validDiscountId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$discountId", null] },
                  { $regexMatch: { input: "$discountId", regex: /^[a-fA-F0-9]{24}$/ } }
                ]
              },
              then: { $toObjectId: "$discountId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "studios",
          let: { studioIdStr: "$studioId", roomId: "$roomId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$studioIdStr" }] },
              },
            },
            {
              $unwind: "$roomsDetails",  // Unwind roomsDetails array
            },
            {
              $match: {
                $expr: { $eq: ["$roomsDetails.roomId", "$$roomId"] },
              },
            },
            {
              $project: {
                studioFullName: "$fullName",
                roomName: "$roomsDetails.roomName"  // Project the roomName
              }
            }
          ],
          as: "studioInfo",
        },
      },
      {
        $lookup: {
          from: "users",
          let: { userIdStr: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$userIdStr" }] },
              },
            },
          ],
          as: "userInfo",
        },
      },
      {
        $lookup: {
          from: "choiraDiscounts",
          let: { disId: "$validDiscountId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$disId"] }
              }
            },
            {
              $project: {
                discountName: 1,  // Only include discountName in the lookup results
                _id: 0  // Exclude _id to simplify the result
              }
            }
          ],
          as: "discount",
        },
      },
      {
        $addFields: {
          discountName: { $arrayElemAt: ["$discount.discountName", 0] }
        }
      },
      {
        $project: {
          studioName: { $arrayElemAt: ["$studioInfo.studioFullName", 0] },
          roomName: { $arrayElemAt: ["$studioInfo.roomName", 0] },
          userName: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.fullName", 0] }, "Admin"],
          },
          userEmail: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.email", 0] }, "Admin"],
          },
          userPhone: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.phone", 0] }, "Admin"],
          },
          userType: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.userType", 0] }, "Admin"],
          },
          otherFields: "$$ROOT",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$otherFields",
              {
                studioName: "$studioName",
                roomName: "$roomName",
                userName: "$userName",
                userEmail: "$userEmail",
                userPhone: "$userPhone",
                userType: "$userType",
                discountName: "$discountName",  // Include discountName as a top-level field
              },
            ],
          },
        },
      },
    ];
    if (searchField) {
      commonPipeline.push({
        $match: {
          $or: [
            { userName: { $regex: searchField, $options: "i" } },
            { studioName: { $regex: searchField, $options: "i" } },
            { userPhone: { $regex: searchField, $options: "i" } },
          ],
        },
      });
    }
    if (startDate && endDate) {
      commonPipeline.push({
        $match: {
          creationTimeStamp: {
            $gte: new Date(startDate + "T00:00:00"),
            $lt: new Date(endDate + "T23:59:59"),
          },
        },
      });
    }
    commonPipeline.push({ $skip: skip })
    commonPipeline.push({ $limit: limit })
    commonPipeline.push({
      $project: {
        studioInfo: 0,
        userInfo: 0,
      },
    })
    if (bookingType === -1) {
      pipeline_lane.push(
        {
          $match: {
            $or: [{ type: "c1" }, { type: { $nin: ["c2", "c3"] } }],
          },
        },
        { $sort: { _id: -1 } },
        ...commonPipeline
      );
    } else {
      pipeline_lane.push(
        {
          $match: {
            bookingStatus: bookingType,
            $or: [{ type: "c1" }, { type: { $nin: ["c2", "c3"] } }],
          },
        },
        { $sort: { _id: -1 } },
        ...commonPipeline
      );
    }
    const db = getDb();
    console.log("pipeline_lane",pipeline_lane);
    const bookingsData = await Booking.aggregate(pipeline_lane)
    // Create a pipeline to count the total number of bookings
    const totalCountPipeline = [
      ...pipeline_lane.slice(0, -3), // Exclude $skip, $limit, and last $project
      { $count: 'total' }
    ];
    const totalCountResult = await db.collection('bookings').aggregate(totalCountPipeline).toArray();
    const totalBookings = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
    const totalPages = Math.ceil(totalBookings / limit);
    //to append noOfHours in booking data no
    bookingsData.forEach((booking)=>{
       booking.noOfHours = moment
       .duration(
         moment(booking.bookingTime?.endTime, "HH:mm").diff(
           moment(booking.bookingTime?.startTime, "HH:mm")
         )
       )
       .asHours();
    })
    return res.json({
      status: true,
      message: "All booking(s) returned",
      data: bookingsData,
      paginate: {
        page,
        limit,
        totalResults: totalBookings,
        totalPages: totalPages,
      },
    });
  } catch (error) {
    logger.error(error,"Error Occured :")
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

// get All Packages/Service Bookings
exports.getServiceBookings = async (req, res) => {
  try {
    let { bookingType, userId, active, page, limit, startDate, endDate, searchField } = req.query;
    page = +page || 1;
    limit = +limit || 10;
    // console.log("req.query |", req.query);
    logger.info({"req data of getServiceBookings":req.query})
    const matchStage = {};
    let lastMatchStage = {}
    if (bookingType) {
      matchStage.type = bookingType;
    } else {
      matchStage.type = { $in: ["c2", "c3"] };
    }
    if (userId) matchStage.userId = userId;
    if (active) matchStage.bookingStatus = parseInt(active);
    // if (phoneNumber) {
    //   matchStage["user.phone"] = phoneNumber;
    // }
    if (startDate && endDate) {
          matchStage.creationTimeStamp= {
            $gte: new Date(startDate + "T00:00:00"),
            $lt: new Date(endDate + "T23:59:59"),
          }
    }
    if (searchField) {
      lastMatchStage.$or = [
            { serviceFullName: { $regex: searchField, $options: "i" } },
            { userFullName: { $regex: searchField, $options: "i" } },
            { userPhone: { $regex: searchField, $options: "i" } },
          ]
    }
    // matchStage.bookingStatus = 0;
    const db = getDb();
    const pipeline = [
      {
        $match: matchStage, // filters
      },
      {
        $sort: { _id: -1 },
      },
      {
        $lookup: {
          from: "services",
          let: { serviceIdStr: "$studioId", roomIdint: "$roomId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$serviceIdStr" }] },
              },
            },
            {
              $unwind: "$packages", // Unwind the packages array
            },
            {
              $match: {
                $expr: {
                  $eq: ["$$roomIdint", "$packages.planId"], // Match bookings.roomId with services.packages.planId
                },
              },
            },
          ],
          as: "service",
        },
      },
      {
        $lookup: {
          from: "users",
          let: { userIdStr: "$userId" }, // define a variable to hold the string serviceId
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$userIdStr" }] },
              },
            },
          ],
          as: "user",
        },
      },
      {
        $project: {
          serviceId: { $arrayElemAt: ["$service._id", 0] },
          service_id: { $arrayElemAt: ["$service.service_id", 0] },
          planId: "$roomId",
          serviceFullName: { $arrayElemAt: ["$service.fullName", 0] },
          userFullName: { $arrayElemAt: ["$user.fullName", 0] },
          userPhone: { $arrayElemAt: ["$user.phone", 0] },
          userEmail: { $arrayElemAt: ["$user.email", 0] },
          totalPrice: "$totalPrice",
          type: "$type",
          bookingDate: "$bookingDate",
          package: { $arrayElemAt: ["$service.packages", 0] },
          bookingStatus: "$bookingStatus",
          countryCode: "$countryCode",
          bookingDate: "$bookingDate",
          creationTimeStamp: "$creationTimeStamp",
        },
      },
      {
        $match: lastMatchStage, // filters
      },
      {
        $skip: (page - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ];
    const data = await db.collection("bookings").aggregate(pipeline).toArray();
    const totalCountPipeline = [
      ...pipeline.slice(0, -2), // Exclude $skip, $limit, and last $project
      { $count: 'total' }
    ];
    console.log("pipeline",JSON.stringify(pipeline));
    const totalCountResult = await db.collection('bookings').aggregate(totalCountPipeline).toArray();
    const totalBookings = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
    const totalPages = Math.ceil(totalBookings / limit);
    // return res.json({ status: true, data, page: parseInt(page), totalPages, totalRecords });
    return res.json({
      status: true,
      data,
      paginate: {
        page,
        limit,
        totalPages,
        totalResults: totalBookings,
      },
    });
  } catch (error) {
    logger.error(error,"Error Occured :")
  }
};

// update booking status of any category
exports.updateServiceBooking = async (req, res) => {
  try {
    const { bookingId, bookingStatus } = req.body;
    logger.info({"req data of updateServiceBooking":req.body})
    const bookingData = await getSingleBooking(bookingId);
    if (!bookingData || !bookingId) {
      return res
        .status(404)
        .json({ status: false, message: "No Booking with this ID exists" });
    }
  
    logger.info(">>>>>>>>>bbbbb:", { bookingStatus });
    if ([0, 1, 2].includes(+bookingStatus))
      bookingData.bookingStatus = +bookingStatus;
    const db = getDb();
    var o_id = new ObjectId(bookingId);
    logger.info(">>>>>>>>>>>>>.bookingData:", { bookingData });
    db.collection("bookings")
      .updateOne({ _id: o_id }, { $set: bookingData })
      .then((resultData) => {
        res.status(200).json({
          status: true,
          message: "Bookings Status updated successfully",
        });
      })
      .catch((err) => logger.error(err));
  } catch (error) {
    logger.error(error,"Error Occured:")
  }
};

exports.deleteBooking = async (req, res) => {
  // // console.log("DEDDDDDDDD");
  const { bookingId } = req.body;
  logger.info({"req data of deleteBooking":bookingId})

  if (!bookingId) {
    return res.status(200).json({
      status: false,
      message: "Booking ID, package ID, and user ID are required",
    });
  }


  const bookingData = await getSingleBooking(bookingId);
  if (!bookingData) {
    return res
      .status(200)
      .json({ status: false, message: "No Booking with this ID exists" });
  }

  const db = getDb();
  try {
    // const result = await db.collection('bookings').deleteOne({ _id: ObjectId(bookingId) });
    const result = await db
      .collection("bookings")
      .updateOne({ _id: ObjectId(bookingId) }, { $set: { bookingStatus: 2 } });
    // console.log(result?.matchedCount);
    if (result?.matchedCount === 1) {
      return res
        .status(200)
        .json({ status: true, message: "Booking deleted successfully" });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Failed to delete booking" });
    }
  } catch (error) {
    logger.error(error, "Error deleting booking");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

// exports.getAllBookingsOptimized = async (req, res, next) => {
// try {
//   const filter = pick(req.query, ['type','startPrice','endPrice'])
//   const options = pick(req.query, ['sortBy', 'limit', 'page']);
//   let aggregationPipeline = []
//   if(filter){
//     aggregationPipeline.push({$match:{}})
//   }
//   if(filter.type){
//     aggregationPipeline.push({$match:{type:filter.type}})
//   }

//   if (filter.startPrice && filter.endPrice) {
//     let startPrice = +filter.startPrice;
//     let endPrice = +filter.endPrice;
//     aggregationPipeline.push({
//       $match: {
//         totalPrice: { $gte: startPrice, $lte: endPrice },
//       },
//     });
//   }

//   if (filter.creationTimeStamp) {
//     const startDate = new Date(filter.startDate);
//     const endDate = new Date(filter.endDate);
//     aggregationPipeline.push({
//       $match: {
//         creationTimeStamp: {
//           $gte: startDate,
//           $lt: endDate
//         }
//       }
//     });
//   }

//   logger.info({filter});
//   const bookingData = await Booking.aggregate(aggregationPipeline);
//   res.status(200).json({
//     success:true,
//     data: bookingData,
//   })
// } catch (error) {
//   logger.error(error.message);
// }
// }

exports.getAllBookingsOptimized = async (req, res, next) => {
  try {
    let skipValue = parseInt(req.query.skip) || 0;
    let limitValue = parseInt(req.query.limit) || 10;
    let bookingTypeValue = parseInt(req.query.bookingType); // || -1;
    let bookingCategory = req.query.category;
    // logger.info("Parsed bookingType value:",{bookingTypeValue});
    logger.info({"req data of getAllBookingsOptimized":req.query})
    const filters = buildFilters(req.query);
    const sort = buildSort(req.query);

    logger.info("oprions----", { filters, sort });

    const aggregationPipeline = [];

    if (bookingTypeValue !== -1) {
      aggregationPipeline.push({ $match: { bookingType: bookingTypeValue } });
    }
    if (filters.length > 0) {
      aggregationPipeline.push({ $match: { $and: filters } });
    }

    if (sort.length > 0) {
      aggregationPipeline.push({ $match: { $sort: sort } });
    }

    aggregationPipeline.push({ $skip: skipValue });
    aggregationPipeline.push({ $limit: limitValue });

    aggregationPipeline.push({
      $lookup: {
        from: "studios",
        localField: "studioId",
        foreignField: "_id",
        as: "studioInfo",
      },
    });

    aggregationPipeline.push({
      $lookup: {
        from: "services",
        localField: "studioId",
        foreignField: "_id",
        as: "studioInfo",
      },
    });

    aggregationPipeline.push({
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userInfo",
      },
    });

    aggregationPipeline.push({
      $project: {
        _id: 1,
        bookingStatus: { $arrayElemAt: ["$studioInfo.isActive", 0] },
        studioName: { $arrayElemAt: ["$studioInfo.fullName", 0] },
        userName: {
          $cond: [
            { $eq: [{ $size: "$userInfo" }, 0] },
            "",
            { $arrayElemAt: ["$userInfo.fullName", 0] },
          ],
        },
        userEmail: {
          $cond: [
            { $eq: [{ $size: "$userInfo" }, 0] },
            "NA",
            { $arrayElemAt: ["$userInfo.email", 0] },
          ],
        },
        userPhone: {
          $cond: [
            { $eq: [{ $size: "$userInfo" }, 0] },
            "NA",
            { $arrayElemAt: ["$userInfo.phone", 0] },
          ],
        },
        userType: {
          $cond: [
            { $eq: [{ $size: "$userInfo" }, 0] },
            "",
            {
              $cond: [
                { $eq: [{ $arrayElemAt: ["$userInfo.role", 0] }, "user"] },
                "USER",
                "ADMIN",
              ],
            },
          ],
        },
        type: {
          $cond: [
            { $eq: [{ $size: "$studioInfo" }, 0] },
            "NA",
            { $arrayElemAt: ["$studioInfo.type", 0] },
          ],
        },
        // Add more fields as needed
      },
    });

    // logger.info("aggregationPipeline---",{aggregationPipeline});

    const bookingData = await Booking.aggregate(aggregationPipeline);
    logger.info("bookingData bookings:", { bookingData });

    // logger.info("Mapped bookings:",{mappedBookings[0]});
    // logger.info("Grouped bookings:",{groupedBookings});

    return res.json({
      status: true,
      message: "All booking(s) returned",
      data: [],
      // paginate: {
      //     page: Math.floor(skipValue / limitValue) + 1,
      //     limit: limitValue,
      //     totalResults: totalBookings,
      //     totalPages: totalPages
      // }
    });
  } catch (error) {
    logger.error(error, "Internal server error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

exports.getAllBookingsForParticularStudio = (req, res, next) => {
  try {
    const studioId = req.params.studioId;
    let skip = +req.query.skip;
    let limit = +req.query.limit;
    logger.info({"req data of getAllBookingsForParticularStudio studioId":studioId})
    if (isNaN(skip)) {
      skip = 0;
      limit = 0;
    }
  
    Booking.fetchAllBookingsByStudioId(studioId, skip, limit).then(
      (bookingsData) => {
        let mappedBookings = [];
        let allBookings = bookingsData.map(async (i) => {
          i.studioName = "";
          let studioInfo = await Studio.findStudioById(i.studioId);
          if (studioInfo != null) {
            i.studioName = studioInfo.fullName;
          }
          i.userName = "";
          i.userEmail = "NA";
          i.userPhone = "NA";
          i.userType = "";
          let userData = await User.findUserByUserId(i.userId);
          if (userData != null) {
            i.userName = userData.fullName;
            i.userEmail = userData.email;
            i.userPhone = userData.phone;
            i.userType = "USER";
          } else {
            let adminData = await Admin.findAdminById(i.userId);
            if (adminData != null) {
              i.userName = adminData.firstName + " " + adminData.lastName;
              i.userEmail = adminData.email;
              i.userType = "ADMIN";
            } else {
              let subAdminData = await SubAdmin.findSubAdminById(i.userId);
              if (subAdminData != null) {
                i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                i.userEmail = subAdminData.email;
                i.userType = "ADMIN";
              } else {
                let ownerData = await Owner.findOwnerByOwnerId(i.userId);
                if (ownerData != null) {
                  i.userName = ownerData.firstName + " " + ownerData.lastName;
                  i.userEmail = ownerData.email;
                  i.userType = "OWNER";
                }
              }
            }
          }
          mappedBookings.push(i);
          if (mappedBookings.length == bookingsData.length) {
            let cancelledBookings = mappedBookings.filter(
              (i) => i.bookingStatus == 2
            );
            getCompletedBookings(mappedBookings, (resActive, resComplete) => {
              return res.json({
                status: true,
                message: "All booking(s) for studio returned",
                activeBookings: resActive,
                completedBookings: resComplete,
                cancelledBookings: cancelledBookings,
              });
            });
          }
        });
      }
    );
  } catch (error) {
    logger.error(error,"Error Occured :")
  }
};

exports.getBookingsByDate = (req, res, next) => {
try {
    let startDate = req.body.startDate;
    let endDate = req.body.endDate;
    logger.info({"req data of getBookingsByDate":req.body})
    //get startDate from timestamp
    startDate = new Date(startDate);
    var yr = startDate.getUTCFullYear();
    var mth = startDate.getUTCMonth() + 1;
    if (mth.toString().length == 1) {
      mth = "0" + mth.toString();
    }
    var dt = startDate.getUTCDate();
    if (dt.toString().length == 1) {
      dt = "0" + dt.toString();
    }
    startDate = yr + "-" + mth + "-" + dt;
    var sTimeStamp = new Date(startDate).getTime();
    logger.info("Start Date : ", { startDate });
  
    //get endDate from timestamp
    endDate = new Date(endDate);
    var yr = endDate.getUTCFullYear();
    var mth = endDate.getUTCMonth() + 1;
    if (mth.toString().length == 1) {
      mth = "0" + mth.toString();
    }
    var dt = endDate.getUTCDate();
    if (dt.toString().length == 1) {
      dt = "0" + dt.toString();
    }
    endDate = yr + "-" + mth + "-" + dt;
    var eTimeStamp = new Date(endDate).getTime();
    logger.info("End Date : ", { endDate });
  
    Booking.fetchBookingsByBookingDateRange(startDate, endDate).then(
      (bookingsData) => {
        if (bookingsData.length == 0) {
          return res.json({
            status: true,
            message: "No bookings exists for this range",
            activeBookings: [],
            completedBookings: [],
            cancelledBookings: [],
          });
        }
        let mappedBookings = [];
        let allBookings = bookingsData.map(async (i) => {
          i.studioName = "";
          let studioInfo = await Studio.findStudioById(i.studioId);
          if (studioInfo != null) {
            i.studioName = studioInfo.fullName;
          }
          i.userName = "";
          i.userEmail = "NA";
          i.userPhone = "NA";
          let userData = await User.findUserByUserId(i.userId);
          if (userData != null) {
            i.userName = userData.fullName;
            i.userEmail = userData.email;
            i.userPhone = userData.phone;
          }
          mappedBookings.push(i);
          if (mappedBookings.length == bookingsData.length) {
            let cancelledBookings = mappedBookings.filter(
              (i) => i.bookingStatus == 2
            );
            getCompletedBookings(mappedBookings, (resActive, resComplete) => {
              return res.json({
                status: true,
                message: "All booking(s) returned",
                activeBookings: resActive,
                completedBookings: resComplete,
                cancelledBookings: cancelledBookings,
              });
            });
          }
        });
      }
    );
} catch (error) {
  logger.error(error,"Error Occured :")
}
};

exports.getAllBookingsGraphDetails = (req, res, next) => {
 try {
   var today = new Date();
   // var today = new Date();
   var d;
   var months = [];
   var d = new Date();
   var month;
   var year = d.getFullYear();
   // logger.info({year})
 
   //for last 6 months(including current month)
   // for(var i = 5; i > -1; i -= 1) {
   var keyData = 1;
   //for last 6 months(excluding current month)
   for (var i = 6; i > 0; i -= 1) {
     d = new Date(today.getFullYear(), today.getMonth() - i, 1);
     //   logger.info(d.getFullYear())
 
     months.push({
       month: d.getMonth(),
       year: d.getFullYear(),
       key: keyData,
       bookingCount: 0,
     });
     keyData = keyData + 1;
   }
   logger.info({ months });
 
   Booking.fetchAllBookings(0, 0).then((bookingsData) => {
     // bookingsData = bookingsData.filter(i=>i.bookingStatus==1);
     bookingsData.forEach((singleBooking) => {
       var dt1 = new Date(singleBooking.creationTimeStamp);
       var monthOnly = dt1.getMonth();
       months.forEach((mth) => {
         if (+mth.month == +monthOnly) {
           mth.bookingCount = mth.bookingCount + 1;
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
 
       //retrieving only bookingCounts
       var allBookingCounts = [];
       months.forEach((m) => {
         allBookingCounts.push(m.bookingCount);
       });
 
       res.json({
         status: true,
         message: "All data returned",
         allMonths: allMonths,
         allBookingCounts: allBookingCounts,
         allData: months,
       });
     }, 1000);
   });
 } catch (error) {
  logger.error(error,"Error Occured :")
 }
};

exports.getAllBookingsGraphDetailsForParticularStudio = (req, res, next) => {
  try {
    const studioId = req.params.studioId;
    logger.info({"req data of getAllBookingsGraphDetailsForParticularStudio studioId":studioId})
    var today = new Date();
    // var today = new Date();
    var d;
    var months = [];
    var d = new Date();
    var month;
    var year = d.getFullYear();
    // logger.info({year})
  
    //for last 6 months(including current month)
    // for(var i = 5; i > -1; i -= 1) {
    var keyData = 1;
    //for last 6 months(excluding current month)
    for (var i = 6; i > 0; i -= 1) {
      d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      //   logger.info(d.getFullYear())
  
      months.push({
        month: d.getMonth(),
        year: d.getFullYear(),
        key: keyData,
        bookingCount: 0,
      });
      keyData = keyData + 1;
    }
    logger.info({ months });
  
    Booking.fetchAllBookingsByStudioId(studioId, 0, 0).then((bookingsData) => {
      // bookingsData = bookingsData.filter(i=>i.bookingStatus==1);
      bookingsData.forEach((singleBooking) => {
        var dt1 = new Date(singleBooking.creationTimeStamp);
        var monthOnly = dt1.getMonth();
        months.forEach((mth) => {
          if (+mth.month == +monthOnly) {
            mth.bookingCount = mth.bookingCount + 1;
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
  
        //retrieving only bookingCounts
        var allBookingCounts = [];
        months.forEach((m) => {
          allBookingCounts.push(m.bookingCount);
        });
  
        res.json({
          status: true,
          message: "All data returned",
          allMonths: allMonths,
          allBookingCounts: allBookingCounts,
          allData: months,
        });
      }, 1000);
    });
  } catch (error) {
    logger.error(error,"Error Occured :")
  }
};

exports.exportBookingData = async (req, res) => {
  try {
    // const filter = pick(req.query, ['dateOfBirth', 'userType', 'role']); // {startDate: 2022-19-01}
    // const options = pick(req.query, ['sort', 'limit', 'gender', 'startDate','endDate','page','sortfield','sortvalue']); // {}
    const { type } = req.query;
    logger.info({"req data of exportBookingData":req.query})
    let response;
    const pipelineForStudio = [
      {
        $match: { type: type },
      },
      {
        $lookup: {
          from: "studios",
          let: { studioIdStr: "$studioId" }, // define a variable to hold the string serviceId
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
        $lookup: {
          from: "users",
          let: { userIdStr: "$userId" }, // define a variable to hold the string userId
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$userIdStr" }] },
              },
            },
          ],
          as: "userInfo",
        },
      },
      {
        $addFields: {
          userName: { $arrayElemAt: ["$userInfo.fullName", 0] },
          userEmail: { $arrayElemAt: ["$userInfo.email", 0] },
          userPhone: { $arrayElemAt: ["$userInfo.phone", 0] },
          studioName: { $arrayElemAt: ["$studioInfo.fullName", 0] },
          studioPricePerHour: { $arrayElemAt: ["$studioInfo.pricePerHour", 0] },
          studioAddress: { $arrayElemAt: ["$studioInfo.address", 0] },
          studioCity: { $arrayElemAt: ["$studioInfo.city", 0] },
          studioState: { $arrayElemAt: ["$studioInfo.state", 0] },
        },
      },
      {
        $match: {
          $or: [
            { userName: { $exists: true, $ne: null } },
            { userEmail: { $exists: true, $ne: null } },
            { userPhone: { $exists: true, $ne: null } },
            { studioName: { $exists: true, $ne: null } },
            { studioPricePerHour: { $exists: true, $ne: null } },
            { studioAddress: { $exists: true, $ne: null } },
            { studioCity: { $exists: true, $ne: null } },
            { studioState: { $exists: true, $ne: null } },
          ],
        },
      },
      {
        $addFields: {
          userName: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$userInfo.fullName", 0] } },
                  "missing",
                ],
              },
              then: "User Name Not Found",
              else: { $arrayElemAt: ["$userInfo.fullName", 0] },
            },
          },
          userEmail: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$userInfo.email", 0] } },
                  "missing",
                ],
              },
              then: "User Email Not Found",
              else: { $arrayElemAt: ["$userInfo.email", 0] },
            },
          },
          userPhone: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$userInfo.phone", 0] } },
                  "missing",
                ],
              },
              then: "User Phone Not Found",
              else: { $arrayElemAt: ["$userInfo.phone", 0] },
            },
          },
          studioName: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$studioInfo.fullName", 0] } },
                  "missing",
                ],
              },
              then: "Studio Name Not Found",
              else: { $arrayElemAt: ["$studioInfo.fullName", 0] },
            },
          },
          studioPricePerHour: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$studioInfo.pricePerHour", 0] } },
                  "missing",
                ],
              },
              then: "Studio Price Per Hour Not Found",
              else: { $arrayElemAt: ["$studioInfo.pricePerHour", 0] },
            },
          },
          studioAddress: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$studioInfo.address", 0] } },
                  "missing",
                ],
              },
              then: "Studio Address Not Found",
              else: { $arrayElemAt: ["$studioInfo.address", 0] },
            },
          },
          studioCity: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$studioInfo.city", 0] } },
                  "missing",
                ],
              },
              then: "Studio City Not Found",
              else: { $arrayElemAt: ["$studioInfo.city", 0] },
            },
          },
          studioState: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$studioInfo.state", 0] } },
                  "missing",
                ],
              },
              then: "Studio State Not Found",
              else: { $arrayElemAt: ["$studioInfo.state", 0] },
            },
          },
        },
      },
      {
        $project: {
          studioInfo: 0,
          userInfo: 0,
        },
      },
    ];

    const pipeline_service = [
      {
        $match: { type: type },
      },
      {
        $lookup: {
          from: "services",
          let: { serviceIdStr: "$studioId" }, // define a variable to hold the string serviceId
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$serviceIdStr" }] },
              },
            },
          ],
          as: "serviceInfo",
        },
      },
      {
        $lookup: {
          from: "users",
          let: { userIdStr: "$userId" }, // define a variable to hold the string userId
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$userIdStr" }] },
              },
            },
          ],
          as: "userInfo",
        },
      },
      {
        $addFields: {
          userName: { $arrayElemAt: ["$userInfo.fullName", 0] },
          userEmail: { $arrayElemAt: ["$userInfo.email", 0] },
          userPhone: { $arrayElemAt: ["$userInfo.phone", 0] },
          serviceName: { $arrayElemAt: ["$serviceInfo.fullName", 0] },
          servicePrice: { $arrayElemAt: ["$serviceInfo.price", 0] },
          servicePackage: { $arrayElemAt: ["$serviceInfo.packages", 0] },
        },
      },
      {
        $match: {
          $or: [
            { userName: { $exists: true, $ne: null } },
            { userEmail: { $exists: true, $ne: null } },
            { userPhone: { $exists: true, $ne: null } },
            { serviceName: { $exists: true, $ne: null } },
            { servicePrice: { $exists: true, $ne: null } },
            { servicePackage: { $exists: true, $ne: null } },
          ],
        },
      },
      {
        $addFields: {
          userName: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$userInfo.fullName", 0] } },
                  "missing",
                ],
              },
              then: "User Name Not Found",
              else: { $arrayElemAt: ["$userInfo.fullName", 0] },
            },
          },
          userEmail: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$userInfo.email", 0] } },
                  "missing",
                ],
              },
              then: "User Email Not Found",
              else: { $arrayElemAt: ["$userInfo.email", 0] },
            },
          },
          userPhone: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$userInfo.phone", 0] } },
                  "missing",
                ],
              },
              then: "User Phone Not Found",
              else: { $arrayElemAt: ["$userInfo.phone", 0] },
            },
          },
          serviceName: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$serviceInfo.fullName", 0] } },
                  "missing",
                ],
              },
              then: "Service Name Not Found",
              else: { $arrayElemAt: ["$serviceInfo.fullName", 0] },
            },
          },
          servicePrice: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$serviceInfo.price", 0] } },
                  "missing",
                ],
              },
              then: "Service Price Not Found",
              else: { $arrayElemAt: ["$serviceInfo.price", 0] },
            },
          },
          servicePackage: {
            $cond: {
              if: {
                $eq: [
                  { $type: { $arrayElemAt: ["$serviceInfo.packages", 0] } },
                  "missing",
                ],
              },
              then: "Service Package Not Found",
              else: { $arrayElemAt: ["$serviceInfo.packages", 0] },
            },
          },
        },
      },
      {
        $project: {
          serviceInfo: 0,
          userInfo: 0,
        },
      },
    ];

    let allBookingsforServices;
    let allBookings;
    let workbook;
    let path;
    let counter;
    // logger.info({type});
    if (type == "c2" || type == "c3") {
      logger.info("Service is running");
      allBookingsforServices = await Booking.AggregateForServiceData(
        pipeline_service
      );
      logger.info({ allBookingsforServices });
      workbook = new excelJS.Workbook();
      worksheet = workbook.addWorksheet("bookingDataForServices");
      path = "./files";
      worksheet.columns = [
        { header: "S no.", key: "s_no", width: 10 },
        // { header: "_id.", key: "_id", width: 10 },
        // { header: "userId", key: "userId", width: 10 },
        { header: "User_Name", key: "userName", width: 10 },
        { header: "User_Email", key: "userEmail", width: 10 },
        { header: "User_No", key: "userPhone", width: 10 },
        // { header: "Service_Id", key: "studioId", width: 10 },
        { header: "Service_Name", key: "serviceName", width: 10 },
        { header: "Service_Price ", key: "servicePrice", width: 10 },
        { header: "Service_Package", key: "servicePackage", width: 10 },
        { header: "roomId", key: "roomId", width: 10 },
        //   { header: "bookingDate", key: "bookingDate", width: 10 },
        //   { header: "bookingTime", key: "bookingTime", width: 10 },
        //   { header: "totalPrice", key: "totalPrice", width: 10 },
        //   { header: "bookingStatus", key: "bookingStatus", width: 10 },
        { header: "creationTimeStamp", key: "creationTimeStamp", width: 10 },
        { header: "type", key: "type", width: 10 },
      ];

      counter = 1;
      await allBookingsforServices.forEach((booking) => {
        booking.s_no = counter;
        worksheet.addRow(booking);
        counter++;
      });
    } else {
      // logger.info("Studio is running");
      allBookings = await Booking.aggregate(pipelineForStudio);
      workbook = new excelJS.Workbook();
      worksheet = workbook.addWorksheet("bookingData");
      path = "./files";
      worksheet.columns = [
        { header: "S no.", key: "s_no", width: 10 },
        // { header: "_id.", key: "_id", width: 10 },
        // { header: "userId", key: "userId", width: 10 },
        { header: "User_Name", key: "userName", width: 10 },
        { header: "User_Email", key: "userEmail", width: 10 },
        { header: "User_No", key: "userPhone", width: 10 },
        // { header: "studioId", key: "studioId", width: 10 },
        { header: "Studio_Name", key: "studioName", width: 10 },
        {
          header: "Studio_Price_PerHour",
          key: "studioPricePerHour",
          width: 10,
        },
        { header: "Studio_Address", key: "studioAddress", width: 10 },
        { header: "Studio_City", key: "studioCity", width: 10 },
        { header: "Studio_State", key: "studioState", width: 10 },
        { header: "roomId", key: "roomId", width: 10 },
        { header: "bookingDate", key: "bookingDate", width: 10 },
        { header: "bookingTime", key: "bookingTime", width: 10 },
        { header: "totalPrice", key: "totalPrice", width: 10 },
        { header: "bookingStatus", key: "bookingStatus", width: 10 },
        { header: "creationTimeStamp", key: "creationTimeStamp", width: 10 },
        { header: "type", key: "type", width: 10 },
      ];

      let counter = 1;
      await allBookings.forEach((booking) => {
        booking.s_no = counter;
        worksheet.addRow(booking);
        counter++;
      });

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
      });
    }

    let name = new Date().getTime();
    let file_name = `Booking${name}.xlsx`;

    const data = await workbook.xlsx
      .writeFile(`files/${file_name}`)
      .then(() => {
        res
          .header({
            "Content-disposition": `attachment; filename=${file_name}`,
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          })
          .sendFile(`${file_name}`, { root: `files/` }, function (err) {
            if (err) {
              logger.error(err, "Error sending file");
            } else {
              logger.info({
                status: "success",
                message: "file successfully downloaded",
                path: `${path}/${file_name}`,
              });
            }
          });
      });
  } catch (error) {
    logger.error(error,"Error Occured :")
    res.send({
      status: "error",
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// send mails

async function sendMailToUserAndAdmin(datas) {
  const { userId, studioId, roomId, bookingDate, bookingTime, totalPrice } =
    datas;

  const bookingDetails = {
    userName: "",
    userNumber: "",
    studioName: "",
    studioLocation: "",
    bookingDateTime: "",
    totalPrice: "",
  };

  bookingDetails.bookingDateTime = `${bookingDate} at ${bookingTime.startTime}-${bookingTime.endTime}`;
  bookingDetails.totalPrice = totalPrice;
  const user_data = await User.findUserByUserId(userId);
  if (user_data) {
    bookingDetails.userName = user_data.fullName;
    bookingDetails.userNumber = user_data.phone;
  } else {
    const subAdmin_data = await SubAdmin.findSubAdminById(userId);
    if (subAdmin_data) {
      bookingDetails.userName = `"${subAdmin_data.firstName} ${subAdmin_data.lastName}`;
      bookingDetails.adminEmail = subAdmin_data.email;
    } else {
      const admin_data = await Admin.findAdminById(userId);
      if (admin_data) {
        bookingDetails.userName = `"${admin_data.firstName} ${admin_data.lastName}`;
        bookingDetails.adminEmail = admin_data.email;
      } else {
        const owner_data = await Owner.findOwnerByOwnerId(userId);
        if (owner_data) {
          bookingDetails.ownerName = `"${owner_data.firstName} ${owner_data.lastName}`;
          bookingDetails.ownerEmail = owner_data.email;
        } else {
          bookingDetails.userName = "Admin";
        }
      }
    }
  }
  const studioData = await Studio.findStudioById(studioId);
  if (studioData) {
    bookingDetails.studioName = studioData.fullName;
    bookingDetails.studioLocation = studioData.address;

    studioData.roomsDetails.map((room) => {
      if (room.roomId === roomId) {
        bookingDetails.roomName = room.roomName;
        bookingDetails.area = room.area;
        bookingDetails.priceperhour = room.pricePerHour;
      }
    });
  }
  send_mail(bookingDetails);
}

exports.adminBooking = async (req, res) => {
  try {
    let { bookingType, userId, fullName, userType, dateOfBirth, email, phoneNumber, deviceId, role, studioId, roomId, bookingDate, bookingTime, totalPrice } = req.body
    logger.info({"req data of adminBooking":req.body})
    if (bookingType === "offline") {
      let createdUser = await registerOfflineUser({ fullName, userType, dateOfBirth, email, phoneNumber, deviceId, role })
      if (!createdUser.status) {
        res.status(200).json({ status: false, message: createdUser.message })
      }
      userId = String(createdUser.result.insertedId)
      let createdBookingg = await createBooking({ userId, studioId, roomId, bookingDate, bookingTime, totalPrice })
      if (!createdBookingg.status) {
        return res.status(200).json({ status: false, message: "Error occured While Booking" })
      }
      res.status(200).json({
        status: true,
        message: "User Registered and Booking Confirmed"
      })
    } else if (bookingType === "registered") {
      let createdBooking = await createBooking({ userId, studioId, roomId, bookingDate, bookingTime, totalPrice })
      if (!createdBooking.status) {
        res.status(200).json({ status: false, message: "Error occured While Booking" })
      } else {
        res.status(200).json({ status: true, message: "Booking successfully created for Registered User" })
      }
    }
    sendMailToUserAndAdmin({
      userId,
      studioId,
      roomId,
      bookingDate,
      bookingTime,
      totalPrice,
    });
  } catch (error) {
    console.log(error);
    logger.error(error, "Error while creating Admin Booking")
  }
}

//Automatch API for cronjob
cron.schedule("*/10 * * * * *", function () {
  // logger.info("running a task every 10 second");
  Booking.fetchAllBookingsByType(0, 0, 0).then((bookingsData) => {
    // logger.info(bookingsData.length);

    var currDate = new Date();
    var mth = currDate.getMonth() + 1;
    if (mth.toString().length == 1) {
      mth = "0" + mth.toString();
    }
    var dt = currDate.getDate();
    if (dt.toString().length == 1) {
      dt = "0" + dt.toString();
    }
    var fullDate = currDate.getFullYear() + "-" + mth + "-" + dt;
    fullDate = new Date(fullDate).getTime();
    // logger.info({fullDate});

    var currTotalMin = currDate.getHours() * 60 + currDate.getMinutes();
    // logger.info({currTotalMin});

    if (bookingsData.length != 0) {
      let count = 0;
      let completedBookings = [];
      let activeBookings = [];
      bookingsData = bookingsData.filter((i) => i.bookingStatus != 2);
      if (bookingsData.length != 0) {
        bookingsData.forEach((singleBooking) => {
          count++;
          var onlyDate = singleBooking.bookingDate.split("T")[0];
          var bDate = new Date(onlyDate).getTime();
          if (bDate < fullDate) {
            completedBookings.push(singleBooking);
          } else if (bDate == fullDate) {
            // logger.info("Same");
            var bTotalMin =
              +singleBooking.bookingTime.endTime.split(":")[0] * 60 +
              +singleBooking.bookingTime.endTime.split(":")[1];
            // logger.info({bTotalMin});
            if (bTotalMin < currTotalMin) {
              completedBookings.push(singleBooking);
            } else {
              activeBookings.push(singleBooking);
            }
          } else {
            activeBookings.push(singleBooking);
          }

          if (count == bookingsData.length) {
            // logger.info(activeBookings.length,completedBookings.length);
            completedBookings.forEach((singleBooking) => {
              // logger.info(singleBooking._id.toString());
              singleBooking.bookingStatus = 1;
              const db = getDb();
              var o_id = new ObjectId(singleBooking._id.toString());

              db.collection("bookings")
                .updateOne({ _id: o_id }, { $set: singleBooking })
                .then((resultData) => {
                  logger.info("Updated");
                });
            });
          }
        });
      }
    }
  });
});

// Update the discount date everyday at midnight
// cron.schedule("0 0 0 * * *", function () {

//   let currentTimeIST = moment.tz("Asia/Kolkata");
//   // Format it to the required format
//   let formattedTime = currentTimeIST.toISOString();

//   console.log("formattedTime====>",formattedTime)

//   const mongodb = require('mongodb');
//   const getDb = require('../util/database').getDB;
//   const ObjectId = mongodb.ObjectId;


//   const db = getDb();
//   var o_id = new ObjectId("6306d6e6842604c7ac3540d9");
//   const discountData = { discountDate:formattedTime}
//   db.collection('choiraDiscounts').updateOne({ _id: o_id }, { $set: discountData })
//     .then(resultData => {
//       console.log("============= Discount Date Updated : RESULT DATA =================>",resultData.modifiedCount)
//   });


// }, {
//   scheduled: true,
//   timezone: "Asia/Kolkata" // Timezone for India
// })