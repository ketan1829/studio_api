const Booking = require('../models/booking');
const Studio = require('../models/studio');
const User = require('../models/user');
const Rating = require('../models/rating');
const Notifications = require('../models/notifications');
const AdminNotifications = require('../models/adminNotifications');
const Admin = require('../models/admin');
const SubAdmin = require('../models/subAdmin');
const Owner = require('../models/owner');

const cron = require('node-cron');
const axios = require('axios');

const mongodb = require('mongodb');
const getDb = require('../util/database').getDB;
const ObjectId = mongodb.ObjectId;

const jwt = require('jsonwebtoken');

const { send_mail } = require("../util/mail.js");


function convertTo24HourFormat(time12h) {
    const [time, modifier] = time12h.split(' ');

    let [hours, minutes] = time.split(':');

    if (hours === '12') {
        hours = '00';
    }

    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }

    return `${hours}:${minutes}`;
}

exports.createNewBooking = async (req, res, next) => {

    const userId = req.body.userId;
    const studioId = req.body.studioId;
    const roomId = req.body.roomId;
    const bookingDate = req.body.bookingDate;
    const bookingTime = req.body.bookingTime;
    const totalPrice = parseFloat(req.body.totalPrice);
    const bookingStatus = 0;    //Initially active



    // if(bookingTime.endTime.split(' ')[1]=='PM')
    // {
    //     bookingTime.startTime = bookingTime.startTime + ' PM'
    // }
    // else{
    //     bookingTime.startTime = bookingTime.startTime + ' AM'
    // }
    // console.log(bookingTime);
    bookingTime.startTime = convertTo24HourFormat(bookingTime.startTime);
    bookingTime.endTime = convertTo24HourFormat(bookingTime.endTime);
    // console.log("bookingTime:", bookingTime);

    let userDeviceId = "";

    User.findUserByUserId(userId)
        .then(async userData => {
            // console.log("user data :",userData);

            let bookingDetails = {}
            bookingDetails.userName = userData?.fullName;
            bookingDetails.userNumber = userData?.phone;

            if (!userData) {
                // return res.status(404).json({ status: false, message: "No User with this ID exists" });
                let adminData = await Admin.findAdminById(userId);
                // console.log("adminData:", adminData);

                // console.log("admin data :",adminData);
                if (!adminData) {

                    let subAdminData = await SubAdmin.findSubAdminById(userId);
                    // console.log("subAdminData:", subAdminData);

                    if (!subAdminData) {
                        let ownerData = await Owner.findOwnerByOwnerId(userId);
                        bookingDetails.ownerName = ownerData?.firstName+" "+ownerData?.lastName;
                        bookingDetails.ownerEmail = ownerData?.email;

                        if (!ownerData) {
                            return res.status(404).json({ status: false, message: "Enter valid ID" });
                        }
                        else {
                            userData = ownerData;
                        }
                    }
                    else {
                        userData = subAdminData;
                    }
                }
                else {
                    bookingDetails.userName = "Admin"

                    userData = adminData;
                }
                userDeviceId = "";
            }
            if (userData.deviceId == null || userData.deviceId == undefined) {
                userDeviceId = "";
            }
            Studio.findStudioById(studioId)
                .then(studioData => {
                    // console.log("studio data:",studioData);

                    bookingDetails.studioName = studioData?.fullName;
                    bookingDetails.studioLocation = studioData?.address;

                    if (!studioData) {
                        return res.status(404).json({ status: false, message: "No studio with this ID exists" });
                    }

                    const bookingObj = new Booking(userId, studioId, roomId, bookingDate, bookingTime, totalPrice, bookingStatus);
                    bookingDetails.bookingDateTime = `${bookingDate} at ${bookingTime.startTime}-${bookingTime.endTime}`;
                    bookingDetails.totalPrice = totalPrice
                    //saving in database
                    return bookingObj.save()
                        .then(resultData => {
                            console.log("bookingDetails:", bookingDetails);
                            console.log("bookingTime:", bookingTime);
                            send_mail(bookingDetails)

                            let bookingData = resultData["ops"][0];
                            bookingData.totalPrice = bookingData.totalPrice.toString();
                            if (bookingData.totalPrice.split('.')[1] == undefined) {
                                bookingData.totalPrice = bookingData.totalPrice + ".0"
                            }
                            const title = "Congratulations!!";
                            const message = "Your booking with '" + studioData.fullName + "' is confirmed";
                            var myJSONObject = {
                                "app_id": process.env.ONE_SIGNAL_APP_ID,
                                "include_player_ids": [userData.deviceId],
                                "data": {},
                                "contents": { "en": title + "\n" + message }
                            };

                            axios({
                                method: 'post',
                                url: "https://onesignal.com/api/v1/notifications",
                                data: myJSONObject,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': process.env.ONE_SIGNAL_AUTH
                                }
                            })
                                .then(async result => {
                                    console.log("Success : ", result.data);
                                    if (result.data.recipients == 1) {
                                        const notification = new Notifications(userId, title, message);

                                        //saving in database
                                        return notification.save()
                                            .then(resultData => {
                                                // return res.json({ status: true, message: "Booking created successfully", booking: bookingData });
                                                const adminNotificationObj = new AdminNotifications(userId, studioId, bookingData._id.toString(), "Booking created", userData.fullName + " created new booking with Studio : " + studioData.fullName);
                                                //saving in database
                                                return adminNotificationObj.save()
                                                    .then(resultData1 => {
                                                        return res.json({ status: true, message: "Booking created successfully", booking: bookingData });
                                                    })
                                            })
                                    }
                                    else {
                                        console.log(result.data);
                                        return res.json({ status: true, message: "Booking created successfully(Notification not sent)", booking: bookingData });
                                    }
                                })
                                .catch(err => {
                                    console.log(err);
                                    return res.json({ status: true, message: "Booking created successfully(Notification not sent)", booking: bookingData });
                                })
                        })
                        .catch(err => console.log(err));
                })
        })

}


function parseTime(s) {
    var c = s.split(':');
    return parseInt(c[0]) * 60 + parseInt(c[1]);
}

function convertHours(mins) {
    var hour = Math.floor(mins / 60);
    var mins = mins % 60;
    var converted = pad(hour, 2) + ':' + pad(mins, 2);
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
    let timeCount = (+timeVal.split(':')[0] * 60) + (+timeVal.split(':')[1]);
    let newTime = timeCount + (+minToAdd);
    // console.log(newTime);
    let timeHr = ~~(newTime / 60);    // removing decimal part with help of "~~"
    let timeMin = newTime % 60;
    if (timeMin.toString().length == 1) {
        timeMin = "0" + timeMin;
    }
    // console.log(timeHr.toString()+":"+timeMin.toString());
    return timeHr.toString() + ":" + timeMin.toString();
}
// addMinToTime("11:00",30)

function convertTo12HourFormat(time) {
    // Check correct time format and split into components
    time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
        time = time.slice(1);  // Remove full string match value
        time[5] = +time[0] < 12 ? ' AM' : ' PM'; // Set AM/PM
        time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    return time.join(''); // return adjusted time or original string
}

function convertTo12HourFormatWithoutAMPM(time) {
    // Check correct time format and split into components
    time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
        time = time.slice(1);  // Remove full string match value
        // time[5] = +time[0] < 12 ? ' AM' : ' PM'; // Set AM/PM
        time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    return time.join(''); // return adjusted time or original string
}

exports.getStudioAvailabilities = (req, res, next) => {

    const studioId = req.body.studioId;
    const roomId = req.body.roomId;
    let bookingDate = req.body.bookingDate;
    const bookingHours = +req.body.bookingHours;   //Slots will be created based on this

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
    console.log("Booking Date : ", bookingDate);

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
    console.log("Current Date : ", currDate);
    var currHr = new Date().getHours();
    var currMin = new Date().getMinutes();
    var currTime = (currHr * 60) + (currMin);
    console.log("Current Time : " + currTime);

    Studio.findStudioById(studioId)
        .then(studioData => {
            if (!studioData) {
                return res.status(404).json({ status: false, message: "No studio with this ID exists" });
            }

            if (studioData.roomsDetails == undefined) {
                studioData.roomsDetails = [];
            }
            const roomIndex = studioData.roomsDetails.findIndex(i => i.roomId == roomId);
            if (roomIndex == -1) {
                return res.status(404).json({ status: false, message: "No room with this ID exists" });
            }
            let roomTotalAvailability = studioData.roomsDetails[roomIndex].availabilities;
            // roomTotalAvailability = [{startTime:"09:00",endTime:"13:00"},{startTime:"15:00",endTime:"19:00"}];
            console.log("Rooms Hours : ", roomTotalAvailability);

            //Getting all slots first
            let allSlots = [];
            roomTotalAvailability.forEach(singleAvail => {
                // console.log(singleAvail);
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
                timeslots.splice((timeslots.length - 1), 1);
                // console.log(timeslots);
                allSlots = allSlots.concat(timeslots);
            });
            // console.log("All Slots : ", allSlots);

            Booking.fetchBookingsByStudioIdAndBookingDate(studioId, bookingDate)
                .then(bookingsData => {
                    // console.log(bookingsData);

                    let availSlotsNew = allSlots;
                    //Filtering to remove past slots for current date
                    if (cTimeStamp == bTimeStamp) {
                        availSlotsNew = availSlotsNew.filter(i => {
                            var eMin = ((+i.endTime.split(':')[0]) * 60) + (+i.endTime.split(':')[1]);
                            var sMin = ((+i.startTime.split(':')[0]) * 60) + (+i.startTime.split(':')[1]);
                            console.log(sMin, eMin, currTime);
                            if (eMin < currTime || sMin < currTime) {
                                return false;
                            }
                            else {
                                return true;
                            }
                        });
                    }

                    if (bookingsData.length == 0) {
                        //convert to 12 hour format
                        availSlotsNew.forEach(singleSlot => {
                            singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
                            singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
                        });
                        return res.json({ status: true, message: "Availability returned", allSlots: allSlots, availableSlots: availSlotsNew, bookedSlots: [] });
                    }
                    let bookedSlots = [];
                    bookingsData.forEach(singleBooking => {
                        bookedSlots.push(singleBooking.bookingTime);
                    });

                    let availableSlots = [];
                    let allSplitSlots = [];
                    // allSlots.forEach(singleSlot=>{
                    //     let startMin = (+singleSlot.startTime.split(':')[0] * 60) + (+singleSlot.startTime.split(':')[1]);
                    //     let endMin = (+singleSlot.endTime.split(':')[0] * 60) + (+singleSlot.endTime.split(':')[1]);
                    //     // console.log(startMin,endMin);
                    bookedSlots.forEach(singleBookedSlot => {
                        let startMinBooked = (+singleBookedSlot.startTime.split(':')[0] * 60) + (+singleBookedSlot.startTime.split(':')[1]);
                        let endMinBooked = (+singleBookedSlot.endTime.split(':')[0] * 60) + (+singleBookedSlot.endTime.split(':')[1]);

                        roomTotalAvailability.forEach(singleRoomAvail => {
                            let startMinRoom = (+singleRoomAvail.startTime.split(':')[0] * 60) + (+singleRoomAvail.startTime.split(':')[1]);
                            let endMinRoom = (+singleRoomAvail.endTime.split(':')[0] * 60) + (+singleRoomAvail.endTime.split(':')[1]);
                            if (startMinBooked >= startMinRoom && endMinBooked <= endMinRoom) {
                                // console.log("Single Room Avail : ",singleRoomAvail);
                                //remove this booked slot from total room slot
                                let splitSlot1 = { startTime: singleRoomAvail.startTime, endTime: singleBookedSlot.startTime };
                                let splitSlot2 = { startTime: singleBookedSlot.endTime, endTime: singleRoomAvail.endTime };
                                console.log("Split Slot : ", splitSlot1, splitSlot2);
                                roomTotalAvailability.push(splitSlot1);
                                roomTotalAvailability.push(splitSlot2);

                                //Also, before next iteration, remove this availablitiy slot from room (since updated is added)
                                const availIndex1 = roomTotalAvailability.findIndex(a => a.startTime == singleRoomAvail.startTime
                                    && a.endTime == singleRoomAvail.endTime);
                                if (availIndex1 != -1) {
                                    roomTotalAvailability.splice(availIndex1, 1);
                                }
                                // console.log(roomTotalAvailability);

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
                                // //     // console.log("Index : ",index2);
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
                                // //     // console.log("Index : ",index2);
                                // //     if(index2==-1)
                                // //     {
                                // //         availableSlots.push(singleTimeSlot);
                                // //     }
                                // // })
                                // availableSlots = availableSlots.concat(timeslots2);
                            }
                            // else{
                            //     // console.log("Other Slot: ",singleRoomAvail);
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
                        })
                    });
                    // });
                    console.log("Availability Sets : ", roomTotalAvailability);
                    //add 30 min interval before starting next slot
                    for (let i = 1; i < roomTotalAvailability.length; i++) {
                        const index = bookedSlots.findIndex(s => s.endTime.split(':')[0].startsWith(roomTotalAvailability[i].startTime.split(':')[0]));
                        if (index != -1) {
                            roomTotalAvailability[i].startTime = addMinToTime(roomTotalAvailability[i].startTime, 30);
                        }
                    }
                    console.log("Availability Sets : ", roomTotalAvailability);
                    let allAvailSlots = [];
                    //Now split these based on SLOT timing
                    roomTotalAvailability.forEach(singleAvail => {
                        // console.log(singleAvail);
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
                        timeslots.splice((timeslots.length - 1), 1);
                        // console.log(timeslots);
                        allAvailSlots = allAvailSlots.concat(timeslots);
                    });
                    //Filtering to remove past slots for current date
                    if (cTimeStamp == bTimeStamp) {
                        allAvailSlots = allAvailSlots.filter(i => {
                            var eMin = ((+i.endTime.split(':')[0]) * 60) + (+i.endTime.split(':')[1]);
                            var sMin = ((+i.startTime.split(':')[0]) * 60) + (+i.startTime.split(':')[1]);
                            if (eMin < currTime || sMin < currTime) {
                                return false;
                            }
                            else {
                                return true;
                            }
                        });
                    }
                    //sorting
                    allAvailSlots.sort((a, b) => a.startTime >= b.startTime ? 1 : -1);
                    //convert to 12 hour format
                    allAvailSlots.forEach(singleSlot => {
                        singleSlot.startTime = convertTo12HourFormat(singleSlot.startTime);
                        singleSlot.endTime = convertTo12HourFormat(singleSlot.endTime);
                    });
                    return res.json({ status: true, message: "Availability returned", allSlots: allSlots, availableSlots: allAvailSlots, bookedSlots: bookedSlots });
                })
        })

}


function getCompletedBookings(allBookings, _callback) {
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
    // console.log(fullDate);

    var currTotalMin = ((currDate.getHours() * 60) + (currDate.getMinutes()));
    console.log(currTotalMin);

    if (allBookings.length == 0) {
        return _callback([], []);
    }
    else {
        let count = 0;
        let completedBookings = [];
        let activeBookings = [];
        allBookings = allBookings.filter(i => i.bookingStatus != 2);
        if (allBookings.length == 0) {
            return _callback([], []);
        }
        allBookings.forEach(singleBooking => {
            count++;
            var onlyDate = singleBooking.bookingDate.split('T')[0];
            var bDate = new Date(onlyDate).getTime();
            if (bDate < fullDate) {
                completedBookings.push(singleBooking);
            }
            else if (bDate == fullDate) {
                console.log("Same");
                var bTotalMin = ((+singleBooking.bookingTime.endTime.split(':')[0]) * 60) + (+singleBooking.bookingTime.endTime.split(':')[1])
                console.log(bTotalMin);
                if (bTotalMin < currTotalMin) {
                    completedBookings.push(singleBooking);
                }
                else {
                    activeBookings.push(singleBooking);
                }
            }
            else {
                activeBookings.push(singleBooking);
            }

            if (count == allBookings.length) {
                console.log(activeBookings.length, completedBookings.length);
                return _callback(activeBookings, completedBookings);
            }
        })
    }

}

function checkBookingRating(completedBookings, _callback) {
    if (completedBookings.length == 0) {
        return _callback(completedBookings);
    }
    else {
        let mappedCompletedBookings = [];
        completedBookings.forEach(async singleBooking => {
            singleBooking.isRated = 0;
            let ratingData = await Rating.findRatingByBookingIdAndUserId(singleBooking._id.toString(), singleBooking.userId);
            // console.log("Rating Data : "+ratingData);
            if (ratingData != null) {
                singleBooking.isRated = 1;
            }
            mappedCompletedBookings.push(singleBooking);

            if (mappedCompletedBookings.length == completedBookings.length) {
                return _callback(mappedCompletedBookings);
            }
        })
    }
}

exports.getBookingsOfParticularUser = (req, res, next) => {

    const userId = req.params.userId;

    User.findUserByUserId(userId)
        .then(userData => {
            if (!userData) {
                return res.status(404).json({ status: false, message: "No User with this ID exists" });
            }
            Booking.fetchAllBookingsByUserId(userId)
                .then(bookingsData => {
                    if (bookingsData.length == 0) {
                        return res.json({ status: true, message: "All booking(s) returned", activeBookings: [], completedBookings: [], cancelledBookings: [] });
                    }
                    else {
                        let mappedBookings = [];
                        let allBookings = bookingsData.map(async i => {
                            i.studioData = null;
                            let studioInfo = await Studio.findStudioById(i.studioId);
                            if (studioInfo != null) {
                                i.studioData = studioInfo;
                            }
                            mappedBookings.push(i);
                            if (mappedBookings.length == bookingsData.length) {
                                //Filter non-null studios
                                mappedBookings = mappedBookings.filter(i => i.studioData != null);

                                let cancelledBookings = mappedBookings.filter(i => i.bookingStatus == 2);
                                // let activeBookings = mappedBookings.filter(i=>i.bookingStatus==undefined || i.bookingStatus==0);
                                // let completedBookings = mappedBookings.filter(i=>i.bookingStatus==1);
                                getCompletedBookings(mappedBookings, (resActive, resComplete) => {
                                    checkBookingRating(resComplete, (resCheckData) => {
                                        resActive.sort((a, b) => {
                                            if (new Date(a.bookingDate).toString() == new Date(b.bookingDate).toString()) {
                                                console.log("Same startTime");
                                                let startTime = (+a.bookingTime.startTime.split(':')[0] * 60) + (+a.bookingTime.startTime.split(':')[1]);
                                                let endTime = (+b.bookingTime.startTime.split(':')[0] * 60) + (+b.bookingTime.startTime.split(':')[1]);
                                                return startTime - endTime;
                                            }
                                            else {
                                                return new Date(a.bookingDate) - new Date(b.bookingDate)
                                            }
                                        });

                                        resActive.forEach(singleBooking => {
                                            singleBooking.bookingTime.startTime = convertTo12HourFormat(singleBooking.bookingTime.startTime);
                                            singleBooking.bookingTime.endTime = convertTo12HourFormat(singleBooking.bookingTime.endTime);
                                        });
                                        resCheckData.forEach(singleBooking => {
                                            singleBooking.bookingTime.startTime = convertTo12HourFormat(singleBooking.bookingTime.startTime);
                                            singleBooking.bookingTime.endTime = convertTo12HourFormat(singleBooking.bookingTime.endTime);
                                        });
                                        cancelledBookings.forEach(singleBooking => {
                                            singleBooking.bookingTime.startTime = convertTo12HourFormat(singleBooking.bookingTime.startTime);
                                            singleBooking.bookingTime.endTime = convertTo12HourFormat(singleBooking.bookingTime.endTime);
                                        });
                                        return res.json({
                                            status: true, message: "All booking(s) returned", activeBookings: resActive,
                                            completedBookings: resCheckData, cancelledBookings: cancelledBookings
                                        });
                                    })
                                });
                            }
                        });
                    }
                })

        })
}


exports.cancelParticularBooking = (req, res, next) => {

    const bookingId = req.params.bookingId;

    Booking.findBookingById(bookingId)
        .then(bookingData => {
            if (!bookingData) {
                return res.status(404).json({ status: false, message: "No Booking with this ID exists" });
            }
            bookingData.bookingStatus = 2;

            const db = getDb();
            var o_id = new ObjectId(bookingId);

            db.collection('bookings').updateOne({ _id: o_id }, { $set: bookingData })
                .then(resultData => {
                    User.findUserByUserId(bookingData.userId)
                        .then(userData => {
                            const title = "Cancelled!!";
                            const message = "Your booking has been cancelled";
                            var myJSONObject = {
                                "app_id": process.env.ONE_SIGNAL_APP_ID,
                                "include_player_ids": [userData.deviceId],
                                "data": {},
                                "contents": { "en": title + "\n" + message }
                            };

                            axios({
                                method: 'post',
                                url: "https://onesignal.com/api/v1/notifications",
                                data: myJSONObject,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': process.env.ONE_SIGNAL_AUTH
                                }
                            })
                                .then(async result => {
                                    console.log("Success : ", result.data);
                                    if (result.data.recipients == 1) {
                                        const notification = new Notifications(userData._id.toString(), title, message);

                                        //saving in database
                                        return notification.save()
                                            .then(resultData => {
                                                // return res.json({ status: true, message: "Booking created successfully", booking: bookingData });
                                                const adminNotificationObj = new AdminNotifications(userData._id.toString(), bookingData.studioId.toString(), bookingData._id.toString(), "Booking Cancelled", userData.fullName + " cancelled booking");
                                                //saving in database
                                                return adminNotificationObj.save()
                                                    .then(resultData1 => {
                                                        return res.json({ status: true, message: 'Booking cancelled successfully', booking: bookingData });
                                                    })
                                            })
                                    }
                                    else {
                                        console.log(result.data);
                                        return res.json({ status: true, message: 'Booking cancelled successfully(Notification not sent)', booking: bookingData });
                                    }
                                })
                                .catch(err => {
                                    console.log(err);
                                    return res.json({ status: true, message: 'Booking cancelled successfully(Notification not sent)', booking: bookingData });
                                })
                        })
                });
        })

}


exports.getAllBookings = (req, res, next) => {

    let skip = +req.query.skip;
    let limit = +req.query.limit;
    let bookingType = +req.query.bookingType;

    if (isNaN(skip)) {
        skip = 0;
        limit = 0;
    }

    if (isNaN(bookingType)) {
        bookingType = -1;
    }

    const db = getDb();

    if (bookingType == -1) {
        Booking.fetchAllBookings(skip, limit)
            .then(bookingsData => {
                let mappedBookings = [];
                let allBookings = bookingsData.map(async i => {
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
                    }
                    else {
                        let adminData = await Admin.findAdminById(i.userId);
                        if (adminData != null) {
                            i.userName = adminData.firstName + " " + adminData.lastName;
                            i.userEmail = adminData.email;
                            i.userType = "ADMIN";
                        }
                        else {
                            let subAdminData = await SubAdmin.findSubAdminById(i.userId);
                            if (subAdminData != null) {
                                i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                                i.userEmail = subAdminData.email;
                                i.userType = "ADMIN";
                            }
                            else {
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
                        let cancelledBookings = mappedBookings.filter(i => i.bookingStatus == 2);
                        getCompletedBookings(mappedBookings, (resActive, resComplete) => {
                            return res.json({
                                status: true, message: "All booking(s) returned", activeBookings: resActive, completedBookings: resComplete,
                                cancelledBookings: cancelledBookings
                            });
                        });
                    }
                });
            })
    }
    else if (bookingType == 2) {
        //Get all cancelled bookings
        Booking.fetchAllBookingsByType(skip, limit, 2)
            .then(bookingsData => {
                let mappedBookings = [];
                let allBookings = bookingsData.map(async i => {
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
                    }
                    else {
                        let adminData = await Admin.findAdminById(i.userId);
                        if (adminData != null) {
                            i.userName = adminData.firstName + " " + adminData.lastName;
                            i.userEmail = adminData.email;
                            i.userType = "ADMIN";
                        }
                        else {
                            let subAdminData = await SubAdmin.findSubAdminById(i.userId);
                            if (subAdminData != null) {
                                i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                                i.userEmail = subAdminData.email;
                                i.userType = "ADMIN";
                            }
                            else {
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
                        let cancelledBookings = mappedBookings.filter(i => i.bookingStatus == 2);
                        db.collection('bookings').find({ bookingStatus: 2 }).count().then(resData2 => {
                            return res.json({ status: true, message: "All booking(s) returned", data: cancelledBookings, totalBookings: resData2 });
                        })
                    }
                });
            })
    }
    else if (bookingType == 0) {
        //Get all active bookings
        Booking.fetchAllBookingsByType(skip, limit, 0)
            .then(bookingsData => {
                let mappedBookings = [];
                let allBookings = bookingsData.map(async i => {
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
                    }
                    else {
                        let adminData = await Admin.findAdminById(i.userId);
                        if (adminData != null) {
                            i.userName = adminData.firstName + " " + adminData.lastName;
                            i.userEmail = adminData.email;
                            i.userType = "ADMIN";
                        }
                        else {
                            let subAdminData = await SubAdmin.findSubAdminById(i.userId);
                            if (subAdminData != null) {
                                i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                                i.userEmail = subAdminData.email;
                                i.userType = "ADMIN";
                            }
                            else {
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
                        db.collection('bookings').find({ bookingStatus: 0 }).count().then(resData2 => {
                            return res.json({ status: true, message: "All booking(s) returned", data: mappedBookings, totalBookings: resData2 });
                        })
                    }
                });
            })
    }
    else if (bookingType == 1) {
        //Get all completed bookings
        Booking.fetchAllBookingsByType(skip, limit, 1)
            .then(bookingsData => {
                let mappedBookings = [];
                let allBookings = bookingsData.map(async i => {
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
                    }
                    else {
                        let adminData = await Admin.findAdminById(i.userId);
                        if (adminData != null) {
                            i.userName = adminData.firstName + " " + adminData.lastName;
                            i.userEmail = adminData.email;
                            i.userType = "ADMIN";
                        }
                        else {
                            let subAdminData = await SubAdmin.findSubAdminById(i.userId);
                            if (subAdminData != null) {
                                i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                                i.userEmail = subAdminData.email;
                                i.userType = "ADMIN";
                            }
                            else {
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
                        db.collection('bookings').find({ bookingStatus: 1 }).count().then(resData2 => {
                            return res.json({ status: true, message: "All booking(s) returned", data: mappedBookings, totalBookings: resData2 });
                        })
                    }
                });
            })
    }

}


exports.getAllBookingsForParticularStudio = (req, res, next) => {

    const studioId = req.params.studioId;
    let skip = +req.query.skip;
    let limit = +req.query.limit;

    if (isNaN(skip)) {
        skip = 0;
        limit = 0;
    }

    Booking.fetchAllBookingsByStudioId(studioId, skip, limit)
        .then(bookingsData => {
            let mappedBookings = [];
            let allBookings = bookingsData.map(async i => {
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
                }
                else {
                    let adminData = await Admin.findAdminById(i.userId);
                    if (adminData != null) {
                        i.userName = adminData.firstName + " " + adminData.lastName;
                        i.userEmail = adminData.email;
                        i.userType = "ADMIN";
                    }
                    else {
                        let subAdminData = await SubAdmin.findSubAdminById(i.userId);
                        if (subAdminData != null) {
                            i.userName = subAdminData.firstName + " " + subAdminData.lastName;
                            i.userEmail = subAdminData.email;
                            i.userType = "ADMIN";
                        }
                        else {
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
                    let cancelledBookings = mappedBookings.filter(i => i.bookingStatus == 2);
                    getCompletedBookings(mappedBookings, (resActive, resComplete) => {
                        return res.json({
                            status: true, message: "All booking(s) for studio returned", activeBookings: resActive, completedBookings: resComplete,
                            cancelledBookings: cancelledBookings
                        });
                    });
                }
            });
        })

}


exports.getBookingsByDate = (req, res, next) => {

    let startDate = req.body.startDate;
    let endDate = req.body.endDate;

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
    console.log("Start Date : ", startDate);

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
    console.log("End Date : ", endDate);

    Booking.fetchBookingsByBookingDateRange(startDate, endDate)
        .then(bookingsData => {
            if (bookingsData.length == 0) {
                return res.json({
                    status: true, message: "No bookings exists for this range", activeBookings: [], completedBookings: [],
                    cancelledBookings: []
                });
            }
            let mappedBookings = [];
            let allBookings = bookingsData.map(async i => {
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
                    let cancelledBookings = mappedBookings.filter(i => i.bookingStatus == 2);
                    getCompletedBookings(mappedBookings, (resActive, resComplete) => {
                        return res.json({
                            status: true, message: "All booking(s) returned", activeBookings: resActive, completedBookings: resComplete,
                            cancelledBookings: cancelledBookings
                        });
                    });
                }
            });
        })

}


exports.getAllBookingsGraphDetails = (req, res, next) => {

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

        months.push({ month: d.getMonth(), year: d.getFullYear(), key: keyData, bookingCount: 0 });
        keyData = keyData + 1;
    }
    console.log(months);

    Booking.fetchAllBookings(0, 0)
        .then(bookingsData => {
            // bookingsData = bookingsData.filter(i=>i.bookingStatus==1);
            bookingsData.forEach(singleBooking => {
                var dt1 = new Date(singleBooking.creationTimeStamp);
                var monthOnly = dt1.getMonth();
                months.forEach(mth => {
                    if ((+mth.month) == (+monthOnly)) {
                        mth.bookingCount = mth.bookingCount + 1;
                    }
                });
            });

            setTimeout(() => {
                months.forEach(mthData => {
                    if (mthData.month == 0) {
                        mthData.month = "January"
                    }
                    if (mthData.month == 1) {
                        mthData.month = "Febuary"
                    }
                    if (mthData.month == 2) {
                        mthData.month = "March"
                    }
                    if (mthData.month == 3) {
                        mthData.month = "April"
                    }
                    if (mthData.month == 4) {
                        mthData.month = "May"
                    }
                    if (mthData.month == 5) {
                        mthData.month = "June"
                    }
                    if (mthData.month == 6) {
                        mthData.month = "July"
                    }
                    if (mthData.month == 7) {
                        mthData.month = "August"
                    }
                    if (mthData.month == 8) {
                        mthData.month = "September"
                    }
                    if (mthData.month == 9) {
                        mthData.month = "Ocober"
                    }
                    if (mthData.month == 10) {
                        mthData.month = "November"
                    }
                    if (mthData.month == 11) {
                        mthData.month = "December"
                    }

                });

                months.sort((a, b) => {
                    return a.key - b.key;
                });

                //retrieving only months
                var allMonths = [];
                months.forEach(m => {
                    allMonths.push(m.month);
                });

                //retrieving only bookingCounts
                var allBookingCounts = [];
                months.forEach(m => {
                    allBookingCounts.push(m.bookingCount);
                });

                res.json({ status: true, message: "All data returned", allMonths: allMonths, allBookingCounts: allBookingCounts, allData: months });
            }, 1000);
        })

}


exports.getAllBookingsGraphDetailsForParticularStudio = (req, res, next) => {

    const studioId = req.params.studioId;

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

        months.push({ month: d.getMonth(), year: d.getFullYear(), key: keyData, bookingCount: 0 });
        keyData = keyData + 1;
    }
    console.log(months);

    Booking.fetchAllBookingsByStudioId(studioId, 0, 0)
        .then(bookingsData => {
            // bookingsData = bookingsData.filter(i=>i.bookingStatus==1);
            bookingsData.forEach(singleBooking => {
                var dt1 = new Date(singleBooking.creationTimeStamp);
                var monthOnly = dt1.getMonth();
                months.forEach(mth => {
                    if ((+mth.month) == (+monthOnly)) {
                        mth.bookingCount = mth.bookingCount + 1;
                    }
                });
            });

            setTimeout(() => {
                months.forEach(mthData => {
                    if (mthData.month == 0) {
                        mthData.month = "January"
                    }
                    if (mthData.month == 1) {
                        mthData.month = "Febuary"
                    }
                    if (mthData.month == 2) {
                        mthData.month = "March"
                    }
                    if (mthData.month == 3) {
                        mthData.month = "April"
                    }
                    if (mthData.month == 4) {
                        mthData.month = "May"
                    }
                    if (mthData.month == 5) {
                        mthData.month = "June"
                    }
                    if (mthData.month == 6) {
                        mthData.month = "July"
                    }
                    if (mthData.month == 7) {
                        mthData.month = "August"
                    }
                    if (mthData.month == 8) {
                        mthData.month = "September"
                    }
                    if (mthData.month == 9) {
                        mthData.month = "Ocober"
                    }
                    if (mthData.month == 10) {
                        mthData.month = "November"
                    }
                    if (mthData.month == 11) {
                        mthData.month = "December"
                    }

                });

                months.sort((a, b) => {
                    return a.key - b.key;
                });

                //retrieving only months
                var allMonths = [];
                months.forEach(m => {
                    allMonths.push(m.month);
                });

                //retrieving only bookingCounts
                var allBookingCounts = [];
                months.forEach(m => {
                    allBookingCounts.push(m.bookingCount);
                });

                res.json({ status: true, message: "All data returned", allMonths: allMonths, allBookingCounts: allBookingCounts, allData: months });
            }, 1000);
        })

}


//Automatch API for cronjob
cron.schedule("*/10 * * * * *", function () {
    // console.log("running a task every 10 second");
    Booking.fetchAllBookingsByType(0, 0, 0)
        .then(bookingsData => {
            console.log(bookingsData.length);

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
            // console.log(fullDate);

            var currTotalMin = ((currDate.getHours() * 60) + (currDate.getMinutes()));
            // console.log(currTotalMin);

            if (bookingsData.length != 0) {
                let count = 0;
                let completedBookings = [];
                let activeBookings = [];
                bookingsData = bookingsData.filter(i => i.bookingStatus != 2);
                if (bookingsData.length != 0) {
                    bookingsData.forEach(singleBooking => {
                        count++;
                        console.log(singleBooking.bookingDate)
                        var onlyDate = singleBooking.bookingDate.split('T')[0];
                        // var onlyDate = singleBooking.bookingDate
                        var bDate = new Date(onlyDate).getTime();
                        if (bDate < fullDate) {
                            completedBookings.push(singleBooking);
                        }
                        else if (bDate == fullDate) {
                            // console.log("Same");
                            var bTotalMin = ((+singleBooking.bookingTime.endTime.split(':')[0]) * 60) + (+singleBooking.bookingTime.endTime.split(':')[1])
                            // console.log(bTotalMin);
                            if (bTotalMin < currTotalMin) {
                                completedBookings.push(singleBooking);
                            }
                            else {
                                activeBookings.push(singleBooking);
                            }
                        }
                        else {
                            activeBookings.push(singleBooking);
                        }

                        if (count == bookingsData.length) {
                            console.log("cron job:",activeBookings.length, completedBookings.length);
                            completedBookings.forEach(singleBooking => {
                                // console.log(singleBooking._id.toString());
                                singleBooking.bookingStatus = 1;
                                const db = getDb();
                                var o_id = new ObjectId(singleBooking._id.toString());

                                db.collection('bookings').updateOne({ _id: o_id }, { $set: singleBooking })
                                    .then(resultData => {
                                        console.log("Updated");
                                    })
                            });
                        }
                    })
                }
            }
        })
});
