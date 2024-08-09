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


const performWeekOperations = async (db) => {
  const getDayName = (day) => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return days[day];
  };

  // Get the current time in the 'Asia/Kolkata' timezone
  const today = moment().tz("Asia/Kolkata");

  // Calculate the start and end of the current week (Sunday to Saturday)
  const lastSunday = today.clone().startOf('week'); // Start of the week (Sunday)
  const nextSaturday = lastSunday.clone().endOf('week'); // End of the week (Saturday)

  // Initialize the combinedResults object for each day of the week
  let combinedResults = {};
  for (let i = 0; i <= 6; i++) {
    const date = lastSunday.clone().add(i, 'days');
    const day = date.day();
    const key = getDayName(day);

    combinedResults[key] = {
      name: key,
      studio: 0,
      production: 0,
      mixmaster: 0
    };
  }

  // Define the MongoDB aggregation pipeline
  const pipeline = (type) => [
    {
      $match: {
        bookingStatus: 1,
        type,
        creationTimeStamp: {
          $gte: lastSunday.toDate(),
          $lte: nextSaturday.toDate()
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
        day: { $subtract: [{ $mod: [{ $add: ["$_id", 5] }, 7] }, 1] }, // Adjust $dayOfWeek to align with Sunday start
        total: "$totalPriceSum"
      }
    }
  ];

  const bookingsCollection = db.collection('bookings');
  const types = ["c1", "c2", "c3"];
  
  // Aggregate data for each type and map the results to the correct day
  for (let type of types) {
    const results = await bookingsCollection.aggregate(pipeline(type)).toArray();
    results.forEach(item => {
      const dayName = getDayName(item.day);
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

    // Week 1: from the start of the month to the first Saturday
    let end = 7 - (new Date(currentYear, currentMonth, start).getDay());
    weeks.push({ start, end });

    // Subsequent weeks: Sunday to Saturday
    start = end + 1;
    while (start <= daysInMonth) {
      end = start + 6;
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
    console.log("startDate",startDate);
  } else if (timeframe === "year") {
    startDate = moment().startOf('year').toDate(); // Start of the current year in IST
  } else {
    throw new Error("Invalid timeframe");
  }
  
  return startDate;
};

const performOperations = async (db, timeframe) => {
  const startDate = getStartDateForTimeframe(timeframe);
  console.log("startDate==>",startDate);
  const endDate = moment().endOf('day').toDate(); // End of the current day in IST
  console.log("endDate==>",endDate);
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
  const startDate = getStartDateForTimeframeForBookings(timeframe);
  const endDate = moment().endOf('day').toDate(); // End of the current day in IST

  let groupId;
  let dateLabels;
  let ranges = [];

  if (timeframe === "week") {
    groupId = { day: { $dayOfWeek: "$creationTimeStamp" } };
    dateLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  } else if (timeframe === "month") {
    groupId = { week: { $week: "$creationTimeStamp" } };
    let currentWeek = moment(startDate);
    let monthEnd = moment(startDate).endOf('month');
    let firstSaturday = currentWeek.clone().endOf('week'); // Find the first Saturday

    // First week: from the start of the month to the first Saturday
    ranges.push(`${currentWeek.format('YYYY-MM-DD')} to ${firstSaturday.format('YYYY-MM-DD')}`);

    // Move to the next week (start from Sunday)
    currentWeek = firstSaturday.clone().add(1, 'day').startOf('day');

    while (currentWeek.isBefore(monthEnd)) {
      let weekStart = currentWeek.clone();
      let weekEnd = currentWeek.clone().endOf('week').isAfter(monthEnd) ? monthEnd : currentWeek.clone().endOf('week');

      ranges.push(`${weekStart.format('YYYY-MM-DD')} to ${weekEnd.format('YYYY-MM-DD')}`);

      currentWeek.add(1, 'week').startOf('day');
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
  bookings.forEach(booking => {
    let index;
    if (timeframe === "week") {
      index = booking._id.day - 1; // Adjust for 0-based index (Sun: 0, Mon: 1, ..., Sat: 6)
    } else if (timeframe === "month") {
      const bookingDate = moment(booking._id.creationTimeStamp);
      index = ranges.findIndex(range => {
        const [rangeStart, rangeEnd] = range.split(' to ').map(d => moment(d));
        return bookingDate.isBetween(rangeStart, rangeEnd, null, '[]');
      });
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

const getStartDateForTimeframeForBookings = (timeframe) => {
  moment.tz.setDefault('Asia/Kolkata');
  let startDate;

  if (timeframe === "week") {
    startDate = moment().startOf('week').toDate(); // Start of the current week (Sunday) in IST
  } else if (timeframe === "month") {
    startDate = moment().startOf('month').toDate(); // Start of the current month in IST
  } else if (timeframe === "year") {
    startDate = moment().startOf('year').toDate(); // Start of the current year in IST
  } else {
    throw new Error("Invalid timeframe");
  }

  return startDate;
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
    let data = await db.collection("bookings").aggregate(NoOfBookings_pipeline).toArray();
    return {status:true, message :"No Of Bookings", data} 
  } catch (error) {
    console.log(error);
  }
}
//--------------------------------No of Bookings of a Studio-------------------------

//--------------------------------Studio Onboard-------------------------


const studioOnboard = async (timeframe) => {
  const currentStartDate = getStartDateForTimeframeOnboarding(timeframe, false);
  const previousStartDate = getStartDateForTimeframeOnboarding(timeframe, true);
  const currentEndDate = moment().endOf('day').toDate(); // End of the current day in IST
  const previousEndDate = moment().subtract(1, 'year').endOf('day').toDate(); // End of the same day last year in IST

  const currentPipeline = [
    {
      $match: {
        creationTimeStamp: {
          $gt: currentStartDate,
          $lt: currentEndDate
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$creationTimeStamp" },
          month: { $month: "$creationTimeStamp" },
          dayOfYear: { $dayOfYear: "$creationTimeStamp" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        year: "$_id.year",
        month: "$_id.month",
        dayOfYear: "$_id.dayOfYear",
        count: 1,
        _id: 0
      }
    }
  ];

  const previousPipeline = [
    {
      $match: {
        creationTimeStamp: {
          $gt: previousStartDate,
          $lt: previousEndDate
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$creationTimeStamp" },
          month: { $month: "$creationTimeStamp" },
          dayOfYear: { $dayOfYear: "$creationTimeStamp" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        year: "$_id.year",
        month: "$_id.month",
        dayOfYear: "$_id.dayOfYear",
        count: 1,
        _id: 0
      }
    }
  ];

  try {
    let db = getDB();
    let [currentData, previousData] = await Promise.all([
      db.collection("studios").aggregate(currentPipeline).toArray(),
      db.collection("studios").aggregate(previousPipeline).toArray()
    ]);
    console.log("[currentData, previousData]", [currentData, previousData]);
    let data = [];

    if (timeframe === "week") {
      const startOfWeek = moment().startOf('week'); // Start of the current week (Sunday)
      for (let day = 0; day < 7; day++) {
        const currentDay = startOfWeek.clone().add(day, 'days');
        const previousDay = currentDay.clone().subtract(1, 'year');

        const currentDayData = currentData.find(d => d.dayOfYear === currentDay.dayOfYear());
        const previousDayData = previousData.find(d => d.dayOfYear === previousDay.dayOfYear());
        data.push({
          name: currentDay.format('ddd').toUpperCase(),
          Current: currentDayData ? currentDayData.count : 0,
          Previous: previousDayData ? previousDayData.count : 0
        });
      }
    } else if (timeframe === "month") {
      const startOfMonth = moment().startOf('month');
      const endOfMonth = moment().endOf('month');

      let currentWeekStart = startOfMonth.clone();
      let weekNumber = 1;

      while (currentWeekStart.isBefore(endOfMonth)) {
        let currentWeekEnd;

        if (weekNumber === 1) {
          // First week from the start of the month to the first Saturday
          currentWeekEnd = currentWeekStart.clone().endOf('week');
        } else {
          // Subsequent weeks from Sunday to Saturday
          currentWeekEnd = currentWeekStart.clone().endOf('week');
        }

        if (currentWeekEnd.isAfter(endOfMonth)) {
          currentWeekEnd = endOfMonth.clone();
        }

        const currentWeekData = currentData.filter(d => d.dayOfYear >= currentWeekStart.dayOfYear() && d.dayOfYear <= currentWeekEnd.dayOfYear());
        const previousWeekData = previousData.filter(d => d.dayOfYear >= currentWeekStart.clone().subtract(1, 'year').dayOfYear() && d.dayOfYear <= currentWeekEnd.clone().subtract(1, 'year').dayOfYear());

        data.push({
          name: `Week ${weekNumber}`,
          Current: currentWeekData.reduce((acc, d) => acc + d.count, 0),
          Previous: previousWeekData.reduce((acc, d) => acc + d.count, 0),
          range: `${currentWeekStart.format('YYYY-MM-DD')} to ${currentWeekEnd.format('YYYY-MM-DD')}`
        });

        currentWeekStart = currentWeekEnd.clone().add(1, 'days');
        weekNumber++;
      }
    } else if (timeframe === "year") {
      for (let month = 1; month <= 12; month++) {
        const currentMonthData = currentData.filter(d => d.month === month);
        const previousMonthData = previousData.filter(d => d.month === month);

        const monthName = moment(month, 'M').format('MMM');

        data.push({
          name: monthName,
          Current: currentMonthData.reduce((acc, d) => acc + d.count, 0),
          Previous: previousMonthData.reduce((acc, d) => acc + d.count, 0)
        });
      }
    }

    return { status: true, message: "Studio Onboard Data", data };
  } catch (error) {
    console.log(error);
  }
}

const getStartDateForTimeframeOnboarding = (timeframe, isPreviousYear) => {
  moment.tz.setDefault('Asia/Kolkata');
  let startDate;

  if (isPreviousYear) {
    if (timeframe === "week") {
      startDate = moment().subtract(1, 'year').startOf('week').toDate(); // Start of the same week (Sunday) last year in IST
    } else if (timeframe === "month") {
      startDate = moment().subtract(1, 'year').startOf('month').toDate(); // Start of the same month last year in IST
    } else if (timeframe === "year") {
      startDate = moment().subtract(1, 'year').startOf('year').toDate(); // Start of the same year last year in IST
    }
  } else {
    if (timeframe === "week") {
      startDate = moment().startOf('week').toDate(); // Start of the current week (Sunday) in IST
    } else if (timeframe === "month") {
      startDate = moment().startOf('month').toDate(); // Start of the current month in IST
    } else if (timeframe === "year") {
      startDate = moment().startOf('year').toDate(); // Start of the current year in IST
    }
  }

  if (!startDate) {
    throw new Error("Invalid timeframe");
  }

  return startDate;
};


//--------------------------------Studio Onboard-------------------------

//--------------------------------------------Dashboard Cards---------------------------------------

const UserCard = async()=>{
  try {
    let user_pipline = [
      {
        $facet: {
          activeCount: [
            { $match: { status: 1 } },
            { $count: "count" }
          ],
          totalCount: [
            { $match: {  } },
            { $count: "count" }
          ]
        }
      },
      {
        $project: {
          activeCount: { $arrayElemAt: ["$activeCount.count", 0] },
          totalCount: { $arrayElemAt: ["$totalCount.count", 0] }
        }
      }
    ]
    let db = getDB()
    let UserData = await db.collection("users").aggregate(user_pipline).toArray()
    return {status:true,message:"No of Users",data:UserData,}
  } catch (error) {
    console.log(error);
  }
}

const StudioCard = async()=>{
  try {
    let user_pipline = [
      {
        $facet: {
          activeCount: [
            { $match: { isActive: 1 } },
            { $count: "count" }
          ],
          totalCount: [
            { $match: {  } },
            { $count: "count" }
          ]
        }
      },
      {
        $project: {
          activeCount: { $arrayElemAt: ["$activeCount.count", 0] },
          totalCount: { $arrayElemAt: ["$totalCount.count", 0] }
        }
      }
    ]
    let db = getDB()
    let StudioData = await db.collection("studios").aggregate(user_pipline).toArray()
    return {status:true,message:"No of Studios",data:StudioData}
  } catch (error) {
    console.log(error);
  }
}
const BookingCard = async()=>{
  try {
    let user_pipline = [
      {
        $facet: {
          activeCount: [
            { $match: { type:"c1", bookingStatus: 0 } },
            { $count: "count" }
          ],  
          totalCount: [
            { $match: { type:"c1", bookingStatus:{ $nin: [2] } } },
            { $count: "count" }
          ]
        }
      },
      {
        $project: {
          activeCount: { $arrayElemAt: ["$activeCount.count", 0] },
          totalCount: { $arrayElemAt: ["$totalCount.count", 0] }
        }
      }
    ]
    let db = getDB()
    let BookingData = await db.collection("bookings").aggregate(user_pipline).toArray()
    return {status:true,message:"No of Bookings",data:BookingData}
  } catch (error) {
    console.log(error);
  }
}









//--------------------------------------------Dashboard Cards---------------------------------------

//--------------------------------Main Controller--------------------------------
exports.dashboardAnalytics= async(req,res)=>{
  try {
    const timeframe = req.query.timeframe || "year";
    const analytics = req.query.analytics;
    if(analytics==="transaction"){ //1-7
     var transactionData = await transactionAnalytics(timeframe)
    } else if(analytics==="revenue"){ //range not required, but from start of month to current time
      var revenueData = await revenueAnalytics(timeframe)
    }else if(analytics==="BookingHoursAndCount"){ //1-4
      var BookingCountAndHours = await BookingHoursAndCount(timeframe)
    }else if(analytics==="NoOfBooking"){ //no data
      var NoOfBookings = await NoOfBookingsOfSudioCount(timeframe)
    }else if(analytics==="studioOnboard"){ //1-7
      var studioOnboardData = await studioOnboard(timeframe)
    }else{

    var [transactionData,revenueData,BookingCountAndHours,NoOfBookings,studioOnboardData,UserData,StudioData,BookingData] = await Promise.all([
        transactionAnalytics(timeframe),
        revenueAnalytics(timeframe),
        BookingHoursAndCount(timeframe),
        NoOfBookingsOfSudioCount(timeframe),
        studioOnboard(timeframe),
        UserCard(),
        StudioCard(),
        BookingCard(),
      ])

    }
    res.status(200).json({
      status:true, transactionData,revenueData,BookingCountAndHours,NoOfBookings,studioOnboardData,UserData,StudioData,BookingData
    })
  } catch (error) {
    console.log(error);
  }
}
//--------------------------------Main Controller--------------------------------
