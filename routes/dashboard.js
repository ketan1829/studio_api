const express = require('express');
const router = express.Router();
const { dashboardAnalytics } = require("../controllers/dashboard");




router.get("/dashboard/analytics",dashboardAnalytics)

module.exports = router;