const { getDB } = require("../util/database");
const moment = require('moment-timezone');


//--------------------------------Transaction--------------------------------
// Utility function to get month names
const getMonthName = (monthNumber) => {
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return monthNames[monthNumber - 1];
};

// Initialize combined results for the past year
const initializeCombinedResultsForYear = () => {
  const currentDate = moment().tz("Asia/Kolkata");
  const combinedResults = {};

  for (let i = 0; i < 12; i++) {
    const date = currentDate.clone().subtract(i, 'months');
    const year = date.year();
    const month = date.month() + 1; // moment months are 0-based
    const key = `${year}-${month}`;

    combinedResults[key] = {
      name: getMonthName(month),
      studio: 0,
      production: 0,
      mixmaster: 0
    };
  }

  return combinedResults;
};

// Perform operations for the past year
const performYearOperations = async (db) => {
  const combinedResults = initializeCombinedResultsForYear();

  const studioPipeline = [
    {
      $match: {
        bookingStatus: 1,
        type: "c1",
        creationTimeStamp: {
          $gt: moment().tz("Asia/Kolkata").subtract(1, 'year').toDate(),
          $lt: moment().tz("Asia/Kolkata").toDate()
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$creationTimeStamp" },
          month: { $month: "$creationTimeStamp" }
        },
        totalSum: { $sum: "$totalPrice" }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1
      }
    }
  ];

  const productionPipeline = [
    {
      $match: {
        bookingStatus: 1,
        type: "c2",
        creationTimeStamp: {
          $gt: moment().tz("Asia/Kolkata").subtract(1, 'year').toDate(),
          $lt: moment().tz("Asia/Kolkata").toDate()
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$creationTimeStamp" },
          month: { $month: "$creationTimeStamp" }
        },
        totalSum: { $sum: "$totalPrice" }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1
      }
    }
  ];

  const mixmasterPipeline = [
    {
      $match: {
        bookingStatus: 1,
        type: "c3",
        creationTimeStamp: {
          $gt: moment().tz("Asia/Kolkata").subtract(1, 'year').toDate(),
          $lt: moment().tz("Asia/Kolkata").toDate()
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$creationTimeStamp" },
          month: { $month: "$creationTimeStamp" }
        },
        totalSum: { $sum: "$totalPrice" }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1
      }
    }
  ];

  const bookingsCollection = db.collection('bookings');

  const studioResult = await bookingsCollection.aggregate(studioPipeline).toArray();
  const productionResult = await bookingsCollection.aggregate(productionPipeline).toArray();
  const mixmasterResult = await bookingsCollection.aggregate(mixmasterPipeline).toArray();

  studioResult.forEach(item => {
    const key = `${item._id.year}-${item._id.month}`;
    if (combinedResults[key]) combinedResults[key].studio = item.totalSum;
  });

  productionResult.forEach(item => {
    const key = `${item._id.year}-${item._id.month}`;
    if (combinedResults[key]) combinedResults[key].production = item.totalSum;
  });

  mixmasterResult.forEach(item => {
    const key = `${item._id.year}-${item._id.month}`;
    if (combinedResults[key]) combinedResults[key].mixmaster = item.totalSum;
  });

  return Object.values(combinedResults);
};

// Perform operations for the past week
const performWeekOperations = async (db) => {
  const getDayName = (day) => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return days[day];
  };

  const today = moment().tz("Asia/Kolkata");
  const dayOfWeek = today.day();
  const lastMonday = moment().tz("Asia/Kolkata").startOf('week').add(1, 'day');

  let combinedResults = {};
  for (let i = 0; i <= dayOfWeek; i++) {
    const date = moment(lastMonday).add(i, 'days');
    const day = date.day();
    const key = getDayName(day);

    combinedResults[key] = {
      name: key,
      studio: 0,
      production: 0,
      mixmaster: 0
    };
  }

  const pipeline = (type) => [
    {
      $match: {
        bookingStatus: 1,
        type,
        creationTimeStamp: {
          $gte: lastMonday.toDate(),
          $lt: today.toDate()
        }
      }
    },
    {
      $group: {
        _id: { $dayOfWeek: "$creationTimeStamp" },
        totalPriceSum: { $sum: "$totalPrice" }
      }
    },
    {
      $project: {
        _id: 0,
        day: "$_id",
        total: "$totalPriceSum"
      }
    }
  ];

  const bookingsCollection = db.collection('bookings');
  const types = ["c1", "c2", "c3"];
  
  for (let type of types) {
    const results = await bookingsCollection.aggregate(pipeline(type)).toArray();
    results.forEach(item => {
      const dayName = getDayName(item.day - 1);
      if (combinedResults[dayName]) {
        combinedResults[dayName][type === "c1" ? 'studio' : type === "c2" ? 'production' : 'mixmaster'] = item.total;
      }
    });
  }

  return Object.values(combinedResults);
};

const performMonthOperations = async (db) => {
  const currentDate = moment.tz('Asia/Kolkata');
  const currentYear = currentDate.year();
  const currentMonth = currentDate.month();

  const getWeekRanges = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let weeks = [];
    let start = 1;

    while (start <= daysInMonth) {
      let end = start + 6;
      if (end > daysInMonth) end = daysInMonth;
      weeks.push({ start, end });
      start = end + 1;
    }

    return weeks;
  };

  const weekRanges = getWeekRanges();
  let combinedResults = {};

  weekRanges.forEach((range, index) => {
    const key = `Week ${index + 1}`;
    combinedResults[key] = {
      name: key,
      studio: 0,
      production: 0,
      mixmaster: 0,
      range: `${currentYear}-${currentMonth + 1}-${range.start} to ${currentYear}-${currentMonth + 1}-${range.end}`
    };
  });

  const pipeline = (type, range) => [
    {
      $match: {
        bookingStatus: 1,
        type,
        creationTimeStamp: {
          $gte: moment.tz('Asia/Kolkata').set({ year: currentYear, month: currentMonth, date: range.start }).toDate(),
          $lt: moment.tz('Asia/Kolkata').set({ year: currentYear, month: currentMonth, date: range.end + 1 }).toDate()
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSum: { $sum: "$totalPrice" }
      }
    }
  ];

  const bookingsCollection = db.collection('bookings');
  const types = ["c1", "c2", "c3"];
  const keys = Object.keys(combinedResults);

  for (let i = 0; i < weekRanges.length; i++) {
    for (let type of types) {
      const result = await bookingsCollection.aggregate(pipeline(type, weekRanges[i])).toArray();
      if (result.length > 0) {
        if (type === "c1") combinedResults[keys[i]].studio = result[0].totalSum;
        if (type === "c2") combinedResults[keys[i]].production = result[0].totalSum;
        if (type === "c3") combinedResults[keys[i]].mixmaster = result[0].totalSum;
      }
    }
  }

  return Object.values(combinedResults);
};

const transactionAnalytics = async (timeframe) => {

  console.log("HITTTTTTTTTTTTT");
  try {
    // const { timeframe } = req.query;
    const db = getDB();

    let data;

    if (timeframe === "year") {
      data = await performYearOperations(db);
    } else if (timeframe === "week") {
      data = await performWeekOperations(db);
    } else if (timeframe === "month") {
      data = await performMonthOperations(db);
    } else {
      return {status:false, message :"Error while getting timeframe for Transaction"}
    }
    console.log("result", data);
    return {status:true, message :"Transaction data", data} 
  } catch (err) {
    console.error('Error while fetching booking data:', err);
    return {status:false, message :"Error while fething Transaction data"}
  }
};
//--------------------------------Transaction--------------------------------


//--------------------------------Revenue--------------------------------

const getStartDateForTimeframe = (timeframe) => {
moment.tz.setDefault('Asia/Kolkata');
  let startDate;
  
  if (timeframe === "week") {
    startDate = moment().startOf('isoWeek').toDate(); // Start of the current ISO week (Monday) in IST
  } else if (timeframe === "month") {
    startDate = moment().startOf('month').toDate(); // Start of the current month in IST
  } else if (timeframe === "year") {
    startDate = moment().startOf('year').toDate(); // Start of the current year in IST
  } else {
    throw new Error("Invalid timeframe");
  }
  
  return startDate;
};

const performOperations = async (db, timeframe) => {
  const startDate = getStartDateForTimeframe(timeframe);
  console.log("startDate",startDate);
  const endDate = moment().endOf('day').toDate(); // End of the current day in IST
  console.log("endDate",endDate);
  const pipeline = (type) => [
    {
      $match: {
        bookingStatus: 1,
        type,
        creationTimeStamp: {
          $gte: startDate,
          $lt: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalPrice" }
      }
    }
  ];
  
  const bookingsCollection = db.collection('bookings');
  const [studioResult, productionResult, mixmasterResult] = await Promise.all([
    bookingsCollection.aggregate(pipeline("c1")).toArray(),
    bookingsCollection.aggregate(pipeline("c2")).toArray(),
    bookingsCollection.aggregate(pipeline("c3")).toArray()
  ]);
  
  return [
    { name: "Studio", value: studioResult.length > 0 ? studioResult[0].totalRevenue : 0, color: "#FF7300" },
    { name: "Production", value: productionResult.length > 0 ? productionResult[0].totalRevenue : 0, color: "#FFC658" },
    { name: "Mixing", value: mixmasterResult.length > 0 ? mixmasterResult[0].totalRevenue : 0, color: "#FF0000" }
  ];
};

const revenueAnalytics = async (timeframe) => {
  try {
    // const { timeframe } = req.query;
    const db = getDB();
    
    if (!["year", "month", "week"].includes(timeframe)) {
      return res.status(400).send('Invalid timeframe parameter');
    }
    
    const data = await performOperations(db, timeframe);
    console.log("result", data);
    return {status:true, message :"Revenue data", data} 
  } catch (error) {
    console.error('Error while fetching booking data:', error);
    return {status:false, message :"Error while fetching Revenue data"} 
  }
};

//--------------------------------Revenue--------------------------------

//--------------------------------Session--------------------------------



const performOperationsForBooking = async (db, timeframe) => {
  const startDate = getStartDateForTimeframe(timeframe);
  const endDate = moment().endOf('day').toDate(); // End of the current day in IST

  let groupId;
  let dateLabels;
  let ranges = [];

  if (timeframe === "week") {
    groupId = { day: { $dayOfWeek: "$creationTimeStamp" } };
    dateLabels = moment.weekdaysShort(); // ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  } else if (timeframe === "month") {
    groupId = { week: { $week: "$creationTimeStamp" } };
    let currentWeek = moment(startDate);
    let monthEnd = moment(startDate).endOf('month');

    while (currentWeek.isBefore(monthEnd)) {
      let weekStart = currentWeek.clone();
      let weekEnd = currentWeek.clone().endOf('isoWeek').isAfter(monthEnd) ? monthEnd : currentWeek.clone().endOf('isoWeek');

      ranges.push(`${weekStart.format('YYYY-MM-DD')} to ${weekEnd.format('YYYY-MM-DD')}`);

      currentWeek.add(1, 'week').startOf('isoWeek');
    }
    dateLabels = ranges.map((_, i) => `Week ${i + 1}`);
  } else if (timeframe === "year") {
    groupId = { month: { $month: "$creationTimeStamp" } };
    const currentMonth = moment().month(); // 0-based index
    dateLabels = moment.monthsShort().slice(0, currentMonth + 1); // Months till the current month
  } else {
    throw new Error("Invalid timeframe");
  }

  const pipeline = [
    {
      $match: {
        bookingStatus: 1,
        type: "c1",
        creationTimeStamp: {
          $gte: startDate,
          $lt: endDate
        }
      }
    },
    {
      $addFields: {
        startTime: {
          $dateFromString: {
            dateString: { $concat: [{ $dateToString: { format: '%Y-%m-%d', date: '$creationTimeStamp' } }, 'T', '$bookingTime.startTime', ':00'] }
          }
        },
        endTime: {
          $dateFromString: {
            dateString: { $concat: [{ $dateToString: { format: '%Y-%m-%d', date: '$creationTimeStamp' } }, 'T', '$bookingTime.endTime', ':00'] }
          }
        }
      }
    },
    {
      $group: {
        _id: groupId,
        BookingCount: { $sum: 1 },
        BookingHours: {
          $sum: {
            $divide: [
              { $subtract: ['$endTime', '$startTime'] },
              3600000 // milliseconds in an hour
            ]
          }
        }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ];

  const bookings = await db.collection('bookings').aggregate(pipeline).toArray();
  console.log("bookings", bookings);

  // Initialize the result array with zero values
  let result = dateLabels.map((label, i) => {
    return {
      name: label,
      BookingHours: 0,
      BookingCount: 0,
      range: timeframe === "month" ? ranges[i] : undefined
    };
  });

  // Merge the booking data with the complete date labels list
  console.log(ranges);
  bookings.forEach(booking => {
    let index;
    if (timeframe === "week") {
      index = booking._id.day - 1; // Adjust for 0-based index (Sun: 0, Mon: 1, ..., Sat: 6)
    } else if (timeframe === "month") {
      console.log("booking._id.week",booking._id.week);
      const bookingWeekStart = moment().week(booking._id.week+1).startOf('isoWeek').format('YYYY-MM-DD');
      const bookingWeekEnd = moment().week(booking._id.week+1).endOf('isoWeek').format('YYYY-MM-DD');
      const bstartweekdate = new Date(bookingWeekStart).getTime();
      const bendweekdate = new Date(bookingWeekEnd).getTime();
      index = ranges.findIndex(range => bstartweekdate <= new Date(range).getTime() <= bendweekdate);
    } else if (timeframe === "year") {
      index = booking._id.month - 1; // Adjust for 0-based index (Jan: 0, Feb: 1, ..., Dec: 11)
    }
    if (index >= 0 && index < result.length) {
      result[index].BookingHours = booking.BookingHours;
      result[index].BookingCount = booking.BookingCount;
    }
  });

  return result;
};

const BookingHoursAndCount = async (timeframe) => {
  try {
    const db = getDB();

    if (!["year", "month", "week"].includes(timeframe)) {
      throw new Error("Invalid timeframe parameter");
    }

    const data = await performOperationsForBooking(db, timeframe);
    console.log("Result", data);
    return { status: true, message: "Booking data", data };
  } catch (error) {
    console.error('Error while fetching booking data:', error);
    return { status: false, message: "Error while fetching booking data" };
  }
};



//--------------------------------Session--------------------------------

//--------------------------------No of Bookings of a Studio-------------------------
const NoOfBookingsOfSudioCount = async(timeframe)=>{
  const startDate = getStartDateForTimeframe(timeframe);
  const endDate = moment().endOf('day').toDate(); // End of the current day in IST
  console.log("startDate",startDate);
  console.log("endDate",endDate);
  let NoOfBookings_pipeline = [
    {
      '$match': {
        bookingStatus: 1,
        type: "c1",
        creationTimeStamp: {
          $gte: startDate,
          $lt: endDate
        }
      }
    },
    {
      '$group': {
        _id: "$studioId",
        bookings: { $sum: 1 }
      }
    },
    {
      '$lookup': {
        from: "studios",
        let: { studioIdStr: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", { $toObjectId: "$$studioIdStr" }] },
            },
          },
          {
            $project: { fullName: 1 }
          }
        ],
        as: "studioInfo"
      }
    },
    {
      '$project': {
        _id: 0,
        name: {
          $cond: {
            if: { $eq: [{ $size: "$studioInfo" }, 0] },
            then: "Deleted studio",
            else: { $arrayElemAt: ["$studioInfo.fullName", 0] }
          }
        },
        bookings: 1
      }
    },
    {
      '$sort': { bookings: -1 }
    }
  ];
  try {
    let db = getDB()
    let No_Of_Bookings = await db.collection("bookings").aggregate(NoOfBookings_pipeline).toArray();
    return No_Of_Bookings
  } catch (error) {
    console.log(error);
  }
}
//--------------------------------No of Bookings of a Studio-------------------------

//--------------------------------Main Controller--------------------------------
exports.dashboardAnalytics= async(req,res)=>{
  try {
    const timeframe = req.query.timeframe || "year";
    const analytics = req.query.analytics;
    let transactionData;
    let revenueData;
    let BookingCountAndHours;
    let NoOfBookings;
    if(analytics==="transaction"){
      transactionData = await transactionAnalytics(timeframe)
    } else if(analytics==="revenue"){
      revenueData = await revenueAnalytics(timeframe)
    }else if(analytics==="BookingHoursAndCount"){
      BookingCountAndHours = await BookingHoursAndCount(timeframe)
    }else if(analytics==="NoOfBooking"){
      NoOfBookings = await NoOfBookingsOfSudioCount(timeframe)
    }else{
      transactionData = await transactionAnalytics(timeframe)
      revenueData = await revenueAnalytics(timeframe)
      BookingCountAndHours = await BookingHoursAndCount(timeframe)
      NoOfBookings = await NoOfBookingsOfSudioCount(timeframe)
    }

    res.status(200).json({
      status:true, transactionData,revenueData,BookingCountAndHours,NoOfBookings
    })
  } catch (error) {
    console.log(error);

  }
}
//--------------------------------Main Controller--------------------------------


// backup:-

// const performYearOperations = async (db) => {
// const getMonthName = (monthNumber) => {
//   const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
//   return monthNames[monthNumber - 1];
// };




// const initializeCombinedResultsForYear = () => {
//   const currentDate = new Date();
//   const currentYear = currentDate.getFullYear();
//   const currentMonth = currentDate.getMonth() + 1;
//   const combinedResults = {};

//   for (let i = 0; i < 12; i++) {
//     const date = new Date();
//     date.setMonth(currentMonth - 1 - i);

//     const year = date.getFullYear();
//     const month = date.getMonth() + 1;
//     const key = `${year}-${month}`;

//     combinedResults[key] = {
//       name: getMonthName(month),
//       studio: 0,
//       production: 0,
//       mixmaster: 0
//     };
//   }

//   return combinedResults;
// };
//   let studioPipeline = [
//     {
//       $match: {
//         bookingStatus: 1,
//         type: "c1",
//         creationTimeStamp: {
//           $gt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), 
//           $lt: new Date()
//         }
//       }
//     },
//     {
//       $group: {
//         _id: {
//           year: { $year: "$creationTimeStamp" },
//           month: { $month: "$creationTimeStamp" }
//         },
//         totalSum: { $sum: "$totalPrice" }
//       }
//     },
//     {
//       $sort: {
//         "_id.year": 1,
//         "_id.month": 1
//       }
//     }
//   ];
  
//   let productionPipeline = [
//     {
//       $match: {
//         bookingStatus: 1,
//         type: "c2",
//         creationTimeStamp: {
//           $gt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
//           $lt: new Date()
//         }
//       }
//     },
//     {
//       $group: {
//         _id: {
//           year: { $year: "$creationTimeStamp" },
//           month: { $month: "$creationTimeStamp" }
//         },
//         totalSum: { $sum: "$totalPrice" }
//       }
//     },
//     {
//       $sort: {
//         "_id.year": 1,
//         "_id.month": 1
//       }
//     }
//   ];
  
//   let mixmasterPipeline = [
//     {
//       $match: {
//         bookingStatus: 1,
//         type: "c3",
//         creationTimeStamp: {
//           $gt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
//           $lt: new Date()
//         }
//       }
//     },
//     {
//       $group: {
//         _id: {
//           year: { $year: "$creationTimeStamp" },
//           month: { $month: "$creationTimeStamp" }
//         },
//         totalSum: { $sum: "$totalPrice" }
//       }
//     },
//     {
//       $sort: {
//         "_id.year": 1,
//         "_id.month": 1
//       }
//     }
//   ];

//   const bookingsCollection = db.collection('bookings');

//   const studioResult = await bookingsCollection.aggregate(studioPipeline).toArray();
//   const productionResult = await bookingsCollection.aggregate(productionPipeline).toArray();
//   const mixmasterResult = await bookingsCollection.aggregate(mixmasterPipeline).toArray();

//   const combinedResults = initializeCombinedResultsForYear();

//   studioResult.forEach(item => {
//     const key = `${item._id.year}-${item._id.month}`;
//     if (combinedResults[key]) combinedResults[key].studio = item.totalSum;
//   });

//   productionResult.forEach(item => {
//     const key = `${item._id.year}-${item._id.month}`;
//     if (combinedResults[key]) combinedResults[key].production = item.totalSum;
//   });

//   mixmasterResult.forEach(item => {
//     const key = `${item._id.year}-${item._id.month}`;
//     if (combinedResults[key]) combinedResults[key].mixmaster = item.totalSum;
//   });

//   return Object.values(combinedResults);
// };

// const performWeekOperations = async (db) => {
//   const getDayName = (day) => {
//     const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
//     return days[day];
//   };
//   const today = new Date();
//   const oneWeekAgo = new Date(today);
//   oneWeekAgo.setDate(today.getDate() - 7);

//   let combinedResults = {};
//   for (let i = 0; i < 7; i++) {
//     const date = new Date(today);
//     date.setDate(today.getDate() - i);
//     const day = date.getDay();
//     const key = getDayName(day);

//     combinedResults[key] = {
//       name: key,
//       studio: 0,
//       production: 0,
//       mixmaster: 0
//     };
//   }

//   let pipelineStudio = [
//     {
//       $match: {
//         bookingStatus: 1,
//         type: "c1",
//         creationTimeStamp: {
//           $gt: oneWeekAgo,
//           $lt: today
//         }
//       }
//     },
//     {
//       $group: {
//         _id: { $dayOfWeek: "$creationTimeStamp" },
//         totalPriceSum: { $sum: "$totalPrice" }
//       }
//     },
//     {
//       $project: {
//         _id: 0,
//         day: "$_id",
//         studio: "$totalPriceSum"
//       }
//     }
//   ];

//   let pipelineProduction = [
//     {
//       $match: {
//         bookingStatus: 1,
//         type: "c2",
//         creationTimeStamp: {
//           $gt: oneWeekAgo,
//           $lt: today
//         }
//       }
//     },
//     {
//       $group: {
//         _id: { $dayOfWeek: "$creationTimeStamp" },
//         totalPriceSum: { $sum: "$totalPrice" }
//       }
//     },
//     {
//       $project: {
//         _id: 0,
//         day: "$_id",
//         production: "$totalPriceSum"
//       }
//     }
//   ];

//   let pipelineMixmaster = [
//     {
//       $match: {
//         bookingStatus: 1,
//         type: "c3",
//         creationTimeStamp: {
//           $gt: oneWeekAgo,
//           $lt: today
//         }
//       }
//     },
//     {
//       $group: {
//         _id: { $dayOfWeek: "$creationTimeStamp" },
//         totalPriceSum: { $sum: "$totalPrice" }
//       }
//     },
//     {
//       $project: {
//         _id: 0,
//         day: "$_id",
//         mixmaster: "$totalPriceSum"
//       }
//     }
//   ];

//   let studioData = await db.collection("bookings").aggregate(pipelineStudio).toArray();
//   let productionData = await db.collection("bookings").aggregate(pipelineProduction).toArray();
//   let mixmasterData = await db.collection("bookings").aggregate(pipelineMixmaster).toArray();

//   studioData.forEach(item => {
//     let day = getDayName(item.day - 1);
//     if (combinedResults[day]) combinedResults[day].studio = item.studio;
//   });

//   productionData.forEach(item => {
//     let day = getDayName(item.day - 1);
//     if (combinedResults[day]) combinedResults[day].production = item.production;
//   });

//   mixmasterData.forEach(item => {
//     let day = getDayName(item.day - 1);
//     if (combinedResults[day]) combinedResults[day].mixmaster = item.mixmaster;
//   });

//   return Object.values(combinedResults);
// };

// // const performMonthOperations = async (db) => {

// const performMonthOperations = async (db) => {
//   const currentDate = new Date();
//   const currentYear = currentDate.getFullYear();
//   const currentMonth = currentDate.getMonth();

//   const getWeekRanges = () => {
//     const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
//     let weeks = [];
//     let start = 1;

//     while (start <= daysInMonth) {
//       let end = start + 6;
//       if (end > daysInMonth) end = daysInMonth;
//       weeks.push({ start, end });
//       start = end + 1;
//     }

//     return weeks;
//   };

//   const weekRanges = getWeekRanges();
//   let combinedResults = {};

//   weekRanges.forEach((range, index) => {
//     const key = `Week ${index + 1}`;
//     combinedResults[key] = {
//       name: key,
//       studio: 0,
//       production: 0,
//       mixmaster: 0,
//       range: `${currentYear}-${currentMonth + 1}-${range.start} to ${currentYear}-${currentMonth + 1}-${range.end}`
//     };
//   });

//   const pipeline = (type, range) => [
//     {
//       $match: {
//         bookingStatus: 1,
//         type,
//         creationTimeStamp: {
//           $gte: new Date(currentYear, currentMonth, range.start),
//           $lt: new Date(currentYear, currentMonth, range.end + 1)
//         }
//       }
//     },
//     {
//       $group: {
//         _id: null,
//         totalSum: { $sum: "$totalPrice" }
//       }
//     }
//   ];

//   const bookingsCollection = db.collection('bookings');
//   const types = ["c1", "c2", "c3"];
//   const keys = Object.keys(combinedResults);

//   for (let i = 0; i < weekRanges.length; i++) {
//     for (let type of types) {
//       const result = await bookingsCollection.aggregate(pipeline(type, weekRanges[i])).toArray();
//       if (result.length > 0) {
//         if (type === "c1") combinedResults[keys[i]].studio = result[0].totalSum;
//         if (type === "c2") combinedResults[keys[i]].production = result[0].totalSum;
//         if (type === "c3") combinedResults[keys[i]].mixmaster = result[0].totalSum;
//       }
//     }
//   }

//   return Object.values(combinedResults);
// };


// exports.dashboardAnalytics = async (req, res) => {
//   console.log("HITTTTTTTTTTTTT");
//   try {
//     const { timeframe } = req.query;
//     const db = getDB();

//     let data;

//     if (timeframe === "year") {
//       data = await performYearOperations(db);
//     } else if (timeframe === "week") {
//       data = await performWeekOperations(db);
//     } else if (timeframe === "month") {
//       data = await performMonthOperations(db);
//     } else {
//       return res.status(400).send('Invalid timeframe parameter');
//     }

//     console.log("result", data);
//     res.json(data);
//   } catch (err) {
//     console.error('Error while fetching booking data:', err);
//     res.status(500).send('Internal Server Error');
//   }
// };



//month backup:-

// Perform operations for the current month
// const performMonthOperations = async (db) => {
//   const currentDate = moment().tz("Asia/Kolkata");
//   const currentYear = currentDate.year();
//   const currentMonth = currentDate.month();

//   const getWeekRanges = () => {
//     const daysInMonth = currentDate.daysInMonth();
//     let weeks = [];
//     let start = 1;

//     while (start <= daysInMonth) {
//       let end = start + 6;
//       if (end > daysInMonth) end = daysInMonth;
//       weeks.push({ start, end });
//       start = end + 1;
//     }

//     return weeks;
//   };

//   const weekRanges = getWeekRanges();
//   const combinedResults = {};

//   weekRanges.forEach((range, index) => {
//     const key = `Week ${index + 1}`;
//     combinedResults[key] = {
//       name: key,
//       studio: 0,
//       production: 0,
//       mixmaster: 0,
//       range: `${currentYear}-${currentMonth + 1}-${range.start} to ${currentYear}-${currentMonth + 1}-${range.end}`
//     };
//   });

//   const pipeline = (type, range) => [
//     {
//       $match: {
//         bookingStatus: 1,
//         type,
//         creationTimeStamp: {
//           $gte: moment.tz(`${currentYear}-${currentMonth + 1}-${range.start}`, "Asia/Kolkata").toDate(),
//           $lt: moment.tz(`${currentYear}-${currentMonth + 1}-${range.end + 1}`, "Asia/Kolkata").toDate()
//         }
//       }
//     },
//     {
//       $group: {
//         _id: null,
//         totalSum: { $sum: "$totalPrice" }
//       }
//     }
//   ];

//   const bookingsCollection = db.collection('bookings');
//   const types = ["c1", "c2", "c3"];
//   const keys = Object.keys(combinedResults);

//   for (let i = 0; i < weekRanges.length; i++) {
//     for (let type of types) {
//       const result = await bookingsCollection.aggregate(pipeline(type, weekRanges[i])).toArray();
//       if (result.length > 0) {
//         if (type === "c1") combinedResults[keys[i]].studio = result[0].totalSum;
//         if (type === "c2") combinedResults[keys[i]].production = result[0].totalSum;
//         if (type === "c3") combinedResults[keys[i]].mixmaster = result[0].totalSum;
//       }
//     }
//   }

//   return Object.values(combinedResults);
// };