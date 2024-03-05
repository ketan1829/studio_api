const express = require('express');
const router = express.Router();
const controller = require('../controllers/user');

const serverName = `${process.env.SERVER_NAME}/download/`;


router.get('/users', function(req,res,next){
     
});