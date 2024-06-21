const express = require('express');
const router = express.Router();
const configController = require('../controllers/config');
const auth = require("../util/authCheck");


router.post('/configs/add', auth.isBoth,configController.updateAllDoc);

router.get('/configs/indexForStudioNameAndAddress',auth.isAdminV2,configController.createIndexForStudioNameAndAddress);


router.post('/configs/updateAllUser',auth.isAdminV2,configController.updateAllUser)


module.exports = router;
