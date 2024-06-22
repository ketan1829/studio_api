const { getDB } = require("../util/database");

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

const getMonthName = (monthNumber) => {
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return monthNames[monthNumber - 1];
};


const initializeCombinedResults = () => {
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

const performYearOperations = async (db) => {
  const bookingsCollection = db.collection('bookings');

  const studioResult = await bookingsCollection.aggregate(studioPipeline).toArray();

 
  const productionResult = await bookingsCollection.aggregate(productionPipeline).toArray();


  const mixmasterResult = await bookingsCollection.aggregate(mixmasterPipeline).toArray();


  const combinedResults = initializeCombinedResults();

  studioResult.forEach(item => {
    const key = `${item._id.year}-${item._id.month}`;
    combinedResults[key].studio = item.totalSum;
  });


  productionResult.forEach(item => {
    const key = `${item._id.year}-${item._id.month}`;
    combinedResults[key].production = item.totalSum;
  });


  mixmasterResult.forEach(item => {
    const key = `${item._id.year}-${item._id.month}`;
    combinedResults[key].mixmaster = item.totalSum;
  });

  return Object.values(combinedResults);
};

const performWeekOperations = async (db) => {
  //Code for week
  return { message: 'Week operations not yet implemented.' };
};

const performMonthOperations = async (db) => {
  //Code for month
  return { message: 'Month operations not yet implemented.' };
};

//Here We are only performing operations for Year. Months and Week is yet to be implemented
exports.dashboardAnalytics = async (req, res) => {
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
