const express = require('express');
const router = express.Router();
const configController = require('../controllers/config');
const auth = require("../util/authCheck");


router.post('/configs/add', auth.isBoth,configController.updateAllDoc);

router.get('/configs/indexForStudioName', configController.createIndexForStudioName);



module.exports = router;
