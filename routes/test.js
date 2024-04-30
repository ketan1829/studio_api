const express = require('express');
const router = express.Router();
const controller = require('../controllers/choiraDiscount');

const serverName = `${process.env.SERVER_NAME}/download/`;

const auth = require("../util/authCheck");
const path = require('path');

router.get('/test/discount/:user_id',auth.isUserTest,controller.getAllUserDiscounts);

module.exports = router;
