const { getDB } = require("../util/database");
const moment = require('moment-timezone');




const performYearOperations = async (db) => {
const getMonthName = (monthNumber) => {
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return monthNames[monthNumber - 1];
};




const initializeCombinedResultsForYear = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const combinedResults = {};

  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(currentMonth - 1 - i);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
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
  let studioPipeline = [
    {
      $match: {
        bookingStatus: 1,
        type: "c1",
        creationTimeStamp: {
          $gt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), 
          $lt: new Date()
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
  
  let productionPipeline = [
    {
      $match: {
        bookingStatus: 1,
        type: "c2",
        creationTimeStamp: {
          $gt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          $lt: new Date()
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
  
  let mixmasterPipeline = [
    {
      $match: {
        bookingStatus: 1,
        type: "c3",
        creationTimeStamp: {
          $gt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          $lt: new Date()
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

  const combinedResults = initializeCombinedResultsForYear();

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
  const today = new Date();
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);

  let combinedResults = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const day = date.getDay();
    const key = getDayName(day);

    combinedResults[key] = {
      name: key,
      studio: 0,
      production: 0,
      mixmaster: 0
    };
  }

  let pipelineStudio = [
    {
      $match: {
        bookingStatus: 1,
        type: "c1",
        creationTimeStamp: {
          $gt: oneWeekAgo,
          $lt: today
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
        studio: "$totalPriceSum"
      }
    }
  ];

  let pipelineProduction = [
    {
      $match: {
        bookingStatus: 1,
        type: "c2",
        creationTimeStamp: {
          $gt: oneWeekAgo,
          $lt: today
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
        production: "$totalPriceSum"
      }
    }
  ];

  let pipelineMixmaster = [
    {
      $match: {
        bookingStatus: 1,
        type: "c3",
        creationTimeStamp: {
          $gt: oneWeekAgo,
          $lt: today
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
        mixmaster: "$totalPriceSum"
      }
    }
  ];

  let studioData = await db.collection("bookings").aggregate(pipelineStudio).toArray();
  let productionData = await db.collection("bookings").aggregate(pipelineProduction).toArray();
  let mixmasterData = await db.collection("bookings").aggregate(pipelineMixmaster).toArray();

  studioData.forEach(item => {
    let day = getDayName(item.day - 1);
    if (combinedResults[day]) combinedResults[day].studio = item.studio;
  });

  productionData.forEach(item => {
    let day = getDayName(item.day - 1);
    if (combinedResults[day]) combinedResults[day].production = item.production;
  });

  mixmasterData.forEach(item => {
    let day = getDayName(item.day - 1);
    if (combinedResults[day]) combinedResults[day].mixmaster = item.mixmaster;
  });

  return Object.values(combinedResults);
};

// const performMonthOperations = async (db) => {

const performMonthOperations = async (db) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

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
          $gte: new Date(currentYear, currentMonth, range.start),
          $lt: new Date(currentYear, currentMonth, range.end + 1)
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


exports.dashboardAnalytics = async (req, res) => {
  console.log("HITTTTTTTTTTTTT");
  try {
    const { timeframe } = req.query;
    const db = getDB();

    let data;

    if (timeframe === "year") {
      data = await performYearOperations(db);
    } else if (timeframe === "week") {
      data = await performWeekOperations(db);
    } else if (timeframe === "month") {
      data = await performMonthOperations(db);
    } else {
      return res.status(400).send('Invalid timeframe parameter');
    }

    console.log("result", data);
    res.json(data);
  } catch (err) {
    console.error('Error while fetching booking data:', err);
    res.status(500).send('Internal Server Error');
  }
};


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

exports.revenueAnalytics = async (req, res) => {
  try {
    const { timeframe } = req.query;
    const db = getDB();
    
    if (!["year", "month", "week"].includes(timeframe)) {
      return res.status(400).send('Invalid timeframe parameter');
    }
    
    const data = await performOperations(db, timeframe);
    console.log("result", data);
    res.json(data);
  } catch (error) {
    console.error('Error while fetching booking data:', error);
    res.status(500).send('Internal Server Error');
  }
};