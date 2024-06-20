const { getDB } = require("../util/database")


//This is just a dummy code, It is not giving the results as Expected
exports.dashboardAnalytics = async (req, res) => {
    try {
        let db = getDB(); 

        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

        let data = months.map(month => ({
            name: month,
            studio: 0,
            production: 0,
            mixmaster: 0
        }));

        // Define queries for each type
        const queries = [
            { type: "c1", key: "studio" },
            { type: "c2", key: "production" },
            { type: "c3", key: "mixmaster" }
        ];

       
        for (const query of queries) {
            let bookings = await db.collection("bookings").find({ type: query.type, bookingStatus: 1 }).toArray();
            bookings.forEach(booking => {
                let bookingMonth = new Date(booking.bookingDate).getUTCMonth(); // Get zero-based month index
                data[bookingMonth][query.key] += booking.totalPrice; // Accumulate totalPrice for the specific month and type
            });
        }

        res.json(data);
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};


