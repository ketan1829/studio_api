const express = require('express');
const router = express.Router();
const { dashboardAnalytics} = require("../controllers/dashboard");
const { isAdminV2 } = require('../util/authCheck');




router.get("/dashboard/analytics",isAdminV2,dashboardAnalytics)



module.exports = router;