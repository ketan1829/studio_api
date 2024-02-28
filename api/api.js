const express = require('express');
const router = express.Router();
const controller = require('../controllers/user');

const serverName = process.env.serverName || "https://test.api.choira.io/api/download/";


router.get('/users', function(req,res,next){
     
});