const express = require('express');
const router = express.Router();
const { dashboardAnalytics, dashboardAnalyticsForWeek } = require("../controllers/dashboard");




router.get("/dashboard/analytics",dashboardAnalytics)



module.exports = router;