const { getDB } = require("../util/database");


//Dummy code
const bookingTypes = ['c1', 'c2', 'c3'];
const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const aggregationPipeline = [
  {
    $match: {
      bookingStatus: 1,
      type: { $in: bookingTypes },
      bookingDate: {
        $gte: new Date(new Date().getFullYear() - 1, new Date().getMonth() + 1, 1),
        $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      }
    }
  },
//   {
//     $group: {
//       _id: {
//         year: { $year: "$bookingDate" },
//         month: { $month: "$bookingDate" },
//         type: "$type"
//       },
//       totalPriceSum: { $sum: "$totalPrice" }
//     }
//   },
//   {
//     $sort: {
//       "_id.year": 1,
//       "_id.month": 1,
//       "_id.type": 1
//     }
//   }
];

exports.dashboardAnalytics = async (req, res) => {
  try {
    const db = getDB();
    const bookingsCollection = db.collection('bookings');
    const aggregationResult = await bookingsCollection.aggregate(aggregationPipeline).toArray();
    const data = transformData(aggregationResult);
    res.json(data);
  } catch (err) {
    console.error('Error while fetching booking data:', err);
    res.status(500).send('Internal Server Error');
  }
}

function transformData(aggregationResult) {
  const data = [];
  const initialData = {};

  aggregationResult.forEach(item => {
    const monthIndex = item._id.month - 1;
    const monthName = months[monthIndex];
    
    if (!initialData[monthName]) {
      initialData[monthName] = { name: monthName, studio: 0, production: 0, mixmaster: 0 };
    }

    if (item._id.type === 'c1') {
      initialData[monthName].studio += item.totalPriceSum;
    } else if (item._id.type === 'c2') {
      initialData[monthName].production += item.totalPriceSum;
    } else if (item._id.type === 'c3') {
      initialData[monthName].mixmaster += item.totalPriceSum;
    }
  });

  months.forEach(month => {
    if (initialData[month]) {
      data.push(initialData[month]);
    } else {
      data.push({ name: month, studio: 0, production: 0, mixmaster: 0 });
    }
  });

  return data;
}
